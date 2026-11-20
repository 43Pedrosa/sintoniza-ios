import AVFoundation
import Foundation

@MainActor
protocol AudioSessionManagerDelegate: AnyObject {
    func audioSessionDidBeginInterruption()
    func audioSessionDidEndInterruption(shouldResume: Bool)
    func audioSessionDidLoseAudioRoute()
    func audioSessionDidDetectNewAudioRoute()
    func audioSessionMediaServicesWereReset()
}

/// Gerencia exclusivamente a configuração de sessão de áudio do iOS para reprodução
/// contínua em segundo plano, tratamento de chamadas telefônicas e troca de rotas Bluetooth.
@MainActor
final class AudioSessionManager {
    weak var delegate: AudioSessionManagerDelegate?

    private let session = AVAudioSession.sharedInstance()
    private var notificationTokens: [NSObjectProtocol] = []
    private var isConfigured = false

    deinit {
        for token in notificationTokens {
            NotificationCenter.default.removeObserver(token)
        }
    }

    func configureIfNeeded() throws {
        if !isConfigured {
            try applyPlaybackCategory()
            registerNotifications()
            isConfigured = true
        }
    }

    func activate() throws {
        try configureIfNeeded()
        try session.setActive(true)
    }

    func deactivate() {
        try? session.setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func applyPlaybackCategory() throws {
        // IMPORTANTE:
        // Não utilizar `.mixWithOthers`, pois misturar áudio impede que o aplicativo
        // assuma o controle exclusivo de Now Playing / MPRemoteCommandCenter
        // (tela bloqueada, Central de Controle e botões do Bluetooth automotivo).
        // A categoria `.playback` com opções padrão mantém o áudio ativo com tela
        // bloqueada, em segundo plano e via Bluetooth A2DP / CarPlay / AirPlay.
        try session.setCategory(.playback, mode: .default, options: [])
    }

    private func registerNotifications() {
        let center = NotificationCenter.default

        let interruptionToken = center.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: session,
            queue: .main
        ) { [weak self] notification in
            let userInfo = notification.userInfo
            let typeRaw = userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
            let optionsRaw = userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0

            Task { @MainActor [weak self] in
                guard let self, let typeRaw,
                      let type = AVAudioSession.InterruptionType(rawValue: typeRaw) else {
                    return
                }

                switch type {
                case .began:
                    self.delegate?.audioSessionDidBeginInterruption()
                case .ended:
                    let options = AVAudioSession.InterruptionOptions(rawValue: optionsRaw)
                    self.delegate?.audioSessionDidEndInterruption(
                        shouldResume: options.contains(.shouldResume)
                    )
                @unknown default:
                    break
                }
            }
        }

        let routeChangeToken = center.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: session,
            queue: .main
        ) { [weak self] notification in
            let reasonRaw = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt

            Task { @MainActor [weak self] in
                guard let self, let reasonRaw,
                      let reason = AVAudioSession.RouteChangeReason(rawValue: reasonRaw) else {
                    return
                }

                switch reason {
                case .oldDeviceUnavailable:
                    // Ex.: Bluetooth do carro desconectado ou fone removido.
                    // Seguindo o comportamento padrão do iOS, pausar o áudio.
                    self.delegate?.audioSessionDidLoseAudioRoute()
                case .newDeviceAvailable:
                    // Ex.: Bluetooth do carro reconectado.
                    self.delegate?.audioSessionDidDetectNewAudioRoute()
                default:
                    break
                }
            }
        }

        let resetToken = center.addObserver(
            forName: AVAudioSession.mediaServicesWereResetNotification,
            object: session,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.isConfigured = false
                try? self.configureIfNeeded()
                self.delegate?.audioSessionMediaServicesWereReset()
            }
        }

        notificationTokens = [interruptionToken, routeChangeToken, resetToken]
    }
}
