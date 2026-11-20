import AVFoundation
import Combine
import Foundation
import Network

/// Gerenciador centralizado e único de reprodução de streaming de rádio.
/// Garante uma única instância de AVPlayer, troca limpa de estações,
/// reconexão limitada em falhas transitórias e sincronização com tela bloqueada e Bluetooth.
@MainActor
final class RadioPlayerManager: ObservableObject {
    @Published private(set) var stations: [RadioStation] = []
    @Published private(set) var currentIndex: Int = 0
    @Published private(set) var playbackState: PlaybackState = .idle
    @Published private(set) var isNetworkAvailable: Bool = true

    var currentStation: RadioStation? {
        guard stations.indices.contains(currentIndex) else { return nil }
        return stations[currentIndex]
    }

    // Única instância de AVPlayer em todo o ciclo de vida do app.
    private let player = AVPlayer()
    private let audioSessionManager = AudioSessionManager()
    private let nowPlayingManager = NowPlayingManager()
    private let remoteCommandManager = RemoteCommandManager()

    private let pathMonitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "com.radioplayer.network-monitor")

    private var playerStatusObserver: NSKeyValueObservation?
    private var itemStatusObserver: NSKeyValueObservation?
    private var itemFailedObserver: NSObjectProtocol?
    private var itemStalledObserver: NSObjectProtocol?

    private var reconnectTask: Task<Void, Never>?
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 3

    /// Indica a intenção real do usuário (se deseja estar ouvindo ou pausado).
    private var shouldBePlaying = false
    /// Preserva se o áudio estava tocando antes de uma ligação/interrupção de sistema.
    private var wasPlayingBeforeInterruption = false

    init() {
        player.automaticallyWaitsToMinimizeStalling = true
        audioSessionManager.delegate = self
        try? audioSessionManager.configureIfNeeded()
        remoteCommandManager.configure(handler: self)
        observePlayerTimeControlStatus()
        startNetworkMonitor()
    }

    deinit {
        pathMonitor.cancel()
        reconnectTask?.cancel()
    }

    // MARK: - Atualização da Lista de Rádios (máximo 5 estações)

    func updateStations(_ newStations: [RadioStation]) {
        // Capture both values before replacing `stations`. `currentStation` reads
        // from `stations`, so reading its URL after assignment compares the new
        // URL with itself and misses stream changes for the currently selected ID.
        let previousStationID = currentStation?.id
        let previousStreamURL = currentStation?.streamUrl
        let cappedStations = Array(newStations.prefix(LocalRadioStorage.maxStations))
        stations = cappedStations
        remoteCommandManager.updateAvailableCommands(hasStations: !cappedStations.isEmpty)

        guard !cappedStations.isEmpty else {
            stopAndClearPlayer()
            currentIndex = 0
            playbackState = .idle
            nowPlayingManager.clear()
            return
        }

        if let previousStationID,
           let updatedIndex = cappedStations.firstIndex(where: { $0.id == previousStationID }) {
            currentIndex = updatedIndex

            if shouldBePlaying, previousStreamURL != cappedStations[updatedIndex].streamUrl {
                startStreamingCurrentStation()
            } else {
                nowPlayingManager.update(station: currentStation, state: playbackState)
            }
        } else {
            currentIndex = 0
            if shouldBePlaying {
                startStreamingCurrentStation()
            } else {
                stopAndClearPlayer()
                playbackState = .idle
                nowPlayingManager.update(station: currentStation, state: playbackState)
            }
        }
    }

    // MARK: - Controles Principais

    func play() {
        guard !stations.isEmpty else { return }
        shouldBePlaying = true
        reconnectAttempts = 0

        if player.currentItem != nil,
           case .paused = playbackState {
            // Para rádio ao vivo, reconectar garante áudio em tempo real sem atraso acumulado.
            startStreamingCurrentStation()
            return
        }

        if player.currentItem == nil || !playbackState.isPlaying {
            startStreamingCurrentStation()
        }
    }

    func pause() {
        shouldBePlaying = false
        wasPlayingBeforeInterruption = false
        cancelReconnect()
        player.pause()
        // Descartar o item pausado evita que um stream ao vivo fique com buffer obsoleto.
        clearCurrentItemObservers()
        player.replaceCurrentItem(with: nil)
        setState(.paused)
    }

    func togglePlayPause() {
        if playbackState.isPlaying || playbackState.isBusy || shouldBePlaying {
            pause()
        } else {
            play()
        }
    }

    func selectStation(at index: Int, autoPlay: Bool = true) {
        guard stations.indices.contains(index) else { return }
        currentIndex = index
        reconnectAttempts = 0
        cancelReconnect()

        if autoPlay {
            shouldBePlaying = true
            startStreamingCurrentStation()
        } else {
            shouldBePlaying = false
            stopAndClearPlayer()
            setState(.idle)
        }
    }

    func nextStation() {
        guard !stations.isEmpty else { return }
        let nextIndex = (currentIndex + 1) % stations.count
        selectStation(at: nextIndex, autoPlay: true)
    }

    func previousStation() {
        guard !stations.isEmpty else { return }
        let previousIndex = (currentIndex - 1 + stations.count) % stations.count
        selectStation(at: previousIndex, autoPlay: true)
    }

    // MARK: - Mecanismo Interno de Streaming

    private func startStreamingCurrentStation() {
        cancelReconnect()

        guard let station = currentStation else {
            stopAndClearPlayer()
            setState(.idle)
            return
        }

        let rawUrl = station.streamUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        if rawUrl.isEmpty {
            stopAndClearPlayer()
            shouldBePlaying = false
            setState(.failed(RadioError.missingStreamURL.localizedDescription))
            return
        }

        if station.isWebReferencePage {
            stopAndClearPlayer()
            shouldBePlaying = false
            setState(.failed(RadioError.incompatibleFormat.localizedDescription))
            return
        }

        if station.isExternalPlaylist {
            stopAndClearPlayer()
            shouldBePlaying = false
            setState(.failed(RadioError.playlistInaccessible.localizedDescription))
            return
        }

        guard let url = station.validStreamURL else {
            stopAndClearPlayer()
            shouldBePlaying = false
            setState(.failed(RadioError.invalidStreamURL.localizedDescription))
            return
        }

        guard isNetworkAvailable else {
            stopAndClearPlayer()
            setState(.failed(RadioError.networkUnavailable.localizedDescription))
            return
        }

        do {
            try audioSessionManager.activate()
        } catch {
            shouldBePlaying = false
            setState(.failed("Não foi possível ativar a sessão de áudio do iOS."))
            return
        }

        // Interromper corretamente a estação anterior antes de iniciar a próxima.
        stopAndClearPlayer()
        setState(.loading)

        let asset = AVURLAsset(url: url)
        let item = AVPlayerItem(asset: asset)
        item.preferredForwardBufferDuration = 5.0

        observePlayerItem(item)
        player.replaceCurrentItem(with: item)
        player.play()
        remoteCommandManager.updateAvailableCommands(hasStations: !stations.isEmpty)
    }

    func refreshRemoteControlsForBackgroundOrForeground() {
        remoteCommandManager.updateAvailableCommands(hasStations: !stations.isEmpty)
        if currentStation != nil {
            nowPlayingManager.update(station: currentStation, state: playbackState)
        }
    }

    private func stopAndClearPlayer() {
        player.pause()
        clearCurrentItemObservers()
        player.replaceCurrentItem(with: nil)
    }

    private func setState(_ newState: PlaybackState) {
        playbackState = newState
        nowPlayingManager.update(station: currentStation, state: newState)
    }

    // MARK: - Observadores KVO & Notificações do AVPlayer

    private func observePlayerTimeControlStatus() {
        playerStatusObserver = player.observe(\.timeControlStatus, options: [.new]) { [weak self] player, _ in
            let status = player.timeControlStatus
            let reason = player.reasonForWaitingToPlay

            Task { @MainActor [weak self] in
                guard let self else { return }
                guard self.player.currentItem != nil else { return }

                switch status {
                case .playing:
                    // Só confirmamos `.playing` quando o AVPlayer realmente está tocando.
                    self.reconnectAttempts = 0
                    self.setState(.playing)
                    self.remoteCommandManager.updateAvailableCommands(hasStations: !self.stations.isEmpty)
                case .waitingToPlayAtSpecifiedRate:
                    if self.shouldBePlaying {
                        if reason == .noItemToPlay {
                            self.setState(.loading)
                        } else {
                            self.setState(.buffering)
                        }
                    }
                case .paused:
                    if !self.shouldBePlaying && self.playbackState != .interrupted {
                        if case .failed = self.playbackState {
                            break
                        }
                        self.setState(.paused)
                    }
                @unknown default:
                    break
                }
            }
        }
    }

    private func observePlayerItem(_ item: AVPlayerItem) {
        itemStatusObserver = item.observe(\.status, options: [.new]) { [weak self] observedItem, _ in
            let status = observedItem.status
            let nsError = observedItem.error as NSError?

            Task { @MainActor [weak self] in
                guard let self, self.player.currentItem === observedItem else { return }

                switch status {
                case .readyToPlay:
                    if self.shouldBePlaying, self.player.timeControlStatus != .playing {
                        self.player.play()
                    }
                case .failed:
                    self.handleStreamFailure(error: nsError)
                case .unknown:
                    break
                @unknown default:
                    break
                }
            }
        }

        let center = NotificationCenter.default

        itemFailedObserver = center.addObserver(
            forName: .AVPlayerItemFailedToPlayToEndTime,
            object: item,
            queue: .main
        ) { [weak self] notification in
            let nsError = notification.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? NSError

            Task { @MainActor [weak self] in
                guard let self, self.player.currentItem === item else { return }
                self.handleStreamFailure(error: nsError)
            }
        }

        itemStalledObserver = center.addObserver(
            forName: .AVPlayerItemPlaybackStalled,
            object: item,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.player.currentItem === item, self.shouldBePlaying else { return }
                self.setState(.buffering)
            }
        }
    }

    private func clearCurrentItemObservers() {
        itemStatusObserver?.invalidate()
        itemStatusObserver = nil

        if let token = itemFailedObserver {
            NotificationCenter.default.removeObserver(token)
            itemFailedObserver = nil
        }

        if let token = itemStalledObserver {
            NotificationCenter.default.removeObserver(token)
            itemStalledObserver = nil
        }
    }

    // MARK: - Reconexão Limitada (Sem Loops Infinitos e Sem Timers de Keep-Alive)

    private func isIncompatibleFormatError(_ error: NSError?) -> Bool {
        guard let error else { return false }
        if error.domain == AVFoundationErrorDomain {
            let incompatibleCodes: Set<Int> = [
                AVError.fileFormatNotRecognized.rawValue,
                AVError.failedToParse.rawValue,
                AVError.invalidSourceMedia.rawValue
            ]
            return incompatibleCodes.contains(error.code)
        }
        if error.domain == NSURLErrorDomain {
            return error.code == NSURLErrorCannotDecodeContentData ||
                error.code == NSURLErrorCannotDecodeRawData
        }
        return false
    }

    private func handleStreamFailure(error: NSError?) {
        stopAndClearPlayer()

        guard shouldBePlaying else {
            setState(.paused)
            return
        }

        if isIncompatibleFormatError(error) {
            shouldBePlaying = false
            setState(.failed(RadioError.incompatibleFormat.localizedDescription))
            return
        }

        guard isNetworkAvailable else {
            setState(.failed(RadioError.networkUnavailable.localizedDescription))
            return
        }

        let message = error?.localizedDescription ?? ""

        guard reconnectAttempts < maxReconnectAttempts else {
            shouldBePlaying = false
            let detail = RadioError.streamUnavailable(message).localizedDescription
            setState(.failed(detail))
            return
        }

        reconnectAttempts += 1
        let delaySeconds = pow(2.0, Double(reconnectAttempts - 1)) * 2.0 // 2s, 4s, 8s
        setState(.loading)

        reconnectTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(delaySeconds * 1_000_000_000))
            guard !Task.isCancelled, let self, self.shouldBePlaying else { return }
            self.startStreamingCurrentStation()
        }
    }

    private func cancelReconnect() {
        reconnectTask?.cancel()
        reconnectTask = nil
    }

    private func startNetworkMonitor() {
        pathMonitor.pathUpdateHandler = { [weak self] path in
            let available = path.status == .satisfied
            Task { @MainActor [weak self] in
                guard let self else { return }
                let wasUnavailable = !self.isNetworkAvailable
                self.isNetworkAvailable = available

                if !available, self.shouldBePlaying {
                    self.stopAndClearPlayer()
                    self.setState(.failed(RadioError.networkUnavailable.localizedDescription))
                } else if available && wasUnavailable && self.shouldBePlaying {
                    // Rede retornou enquanto o usuário queria ouvir: tentar uma retomada limpa.
                    self.reconnectAttempts = 0
                    self.startStreamingCurrentStation()
                }
            }
        }
        pathMonitor.start(queue: monitorQueue)
    }
}

// MARK: - AudioSessionManagerDelegate

extension RadioPlayerManager: AudioSessionManagerDelegate {
    func audioSessionDidBeginInterruption() {
        wasPlayingBeforeInterruption = shouldBePlaying || playbackState.isPlaying || playbackState.isBusy
        cancelReconnect()
        player.pause()
        setState(.interrupted)
    }

    func audioSessionDidEndInterruption(shouldResume: Bool) {
        guard wasPlayingBeforeInterruption else {
            setState(.paused)
            return
        }
        wasPlayingBeforeInterruption = false

        if shouldResume {
            shouldBePlaying = true
            reconnectAttempts = 0
            startStreamingCurrentStation()
        } else {
            shouldBePlaying = false
            setState(.paused)
        }
    }

    func audioSessionDidLoseAudioRoute() {
        // Bluetooth desconectado ou fone removido: pausar de forma limpa.
        if shouldBePlaying || playbackState.isPlaying || playbackState.isBusy {
            pause()
        }
    }

    func audioSessionDidDetectNewAudioRoute() {
        // Atualiza o NowPlayingInfoCenter e reforça os comandos remotos caso o painel do carro
        // solicite metadados e capacidades ao conectar.
        remoteCommandManager.updateAvailableCommands(hasStations: !stations.isEmpty)
        nowPlayingManager.update(station: currentStation, state: playbackState)
    }

    func audioSessionMediaServicesWereReset() {
        remoteCommandManager.reRegisterAfterMediaReset()
        remoteCommandManager.updateAvailableCommands(hasStations: !stations.isEmpty)
        if shouldBePlaying {
            startStreamingCurrentStation()
        } else {
            nowPlayingManager.update(station: currentStation, state: playbackState)
        }
    }
}

// MARK: - RemoteCommandHandler

extension RadioPlayerManager: RemoteCommandHandler {
    func handleRemotePlay() -> Bool {
        guard !stations.isEmpty else { return false }
        play()
        return true
    }

    func handleRemotePause() -> Bool {
        guard !stations.isEmpty else { return false }
        pause()
        return true
    }

    func handleRemoteTogglePlayPause() -> Bool {
        guard !stations.isEmpty else { return false }
        togglePlayPause()
        return true
    }

    func handleRemoteNextStation() -> Bool {
        guard !stations.isEmpty else { return false }
        nextStation()
        return true
    }

    func handleRemotePreviousStation() -> Bool {
        guard !stations.isEmpty else { return false }
        previousStation()
        return true
    }
}
