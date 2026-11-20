import Foundation
import MediaPlayer

@MainActor
protocol RemoteCommandHandler: AnyObject {
    func handleRemotePlay() -> Bool
    func handleRemotePause() -> Bool
    func handleRemoteTogglePlayPause() -> Bool
    func handleRemoteNextStation() -> Bool
    func handleRemotePreviousStation() -> Bool
}

private final class CommandAvailabilityFlag: @unchecked Sendable {
    private let lock = NSLock()
    private var enabled = false

    var isEnabled: Bool {
        get {
            lock.lock()
            defer { lock.unlock() }
            return enabled
        }
        set {
            lock.lock()
            enabled = newValue
            lock.unlock()
        }
    }
}

/// Registra os comandos físicos e de sistema no MPRemoteCommandCenter.
/// `nextTrackCommand` e `previousTrackCommand` trocam a ESTAÇÃO DE RÁDIO atual.
@MainActor
final class RemoteCommandManager {
    private let commandCenter = MPRemoteCommandCenter.shared()
    private weak var handler: RemoteCommandHandler?
    private var isRegistered = false
    private var registeredTargets: [(command: MPRemoteCommand, token: Any)] = []
    private let availabilityFlag = CommandAvailabilityFlag()

    func configure(handler: RemoteCommandHandler) {
        self.handler = handler
        registerCommandsIfNeeded()
    }

    func reRegisterAfterMediaReset() {
        teardown()
        registerCommandsIfNeeded()
    }

    func updateAvailableCommands(hasStations: Bool) {
        availabilityFlag.isEnabled = hasStations
        disableNonTrackCommands()

        commandCenter.playCommand.isEnabled = hasStations
        commandCenter.pauseCommand.isEnabled = hasStations
        commandCenter.togglePlayPauseCommand.isEnabled = hasStations
        commandCenter.nextTrackCommand.isEnabled = hasStations
        commandCenter.previousTrackCommand.isEnabled = hasStations
    }

    func teardown() {
        guard isRegistered else { return }
        for entry in registeredTargets {
            entry.command.removeTarget(entry.token)
        }
        registeredTargets.removeAll()
        isRegistered = false
    }

    private func disableNonTrackCommands() {
        // Desabilitar explicitamente comandos de avanço/retrocesso temporal (seek/skip)
        // e remover quaisquer alvos/intervalos residuais para impedir que o sistema exiba
        // botões de +-10s na tela bloqueada em vez de próxima/anterior estação.
        let skipCommands: [MPSkipIntervalCommand] = [
            commandCenter.skipForwardCommand,
            commandCenter.skipBackwardCommand
        ]
        for command in skipCommands {
            command.isEnabled = false
            command.preferredIntervals = []
        }

        let seekAndMetadataCommands: [MPRemoteCommand] = [
            commandCenter.seekForwardCommand,
            commandCenter.seekBackwardCommand,
            commandCenter.changePlaybackPositionCommand,
            commandCenter.ratingCommand,
            commandCenter.likeCommand,
            commandCenter.dislikeCommand,
            commandCenter.bookmarkCommand
        ]
        for command in seekAndMetadataCommands {
            command.isEnabled = false
        }
    }

    private func registerCommandsIfNeeded() {
        guard !isRegistered else { return }

        disableNonTrackCommands()

        let flag = availabilityFlag

        commandCenter.playCommand.isEnabled = flag.isEnabled
        let playToken = commandCenter.playCommand.addTarget { [weak self] _ in
            Self.dispatchRemoteCommand(flag: flag) {
                self?.handler?.handleRemotePlay() ?? false
            }
        }
        registeredTargets.append((commandCenter.playCommand, playToken))

        commandCenter.pauseCommand.isEnabled = flag.isEnabled
        let pauseToken = commandCenter.pauseCommand.addTarget { [weak self] _ in
            Self.dispatchRemoteCommand(flag: flag) {
                self?.handler?.handleRemotePause() ?? false
            }
        }
        registeredTargets.append((commandCenter.pauseCommand, pauseToken))

        commandCenter.togglePlayPauseCommand.isEnabled = flag.isEnabled
        let toggleToken = commandCenter.togglePlayPauseCommand.addTarget { [weak self] _ in
            Self.dispatchRemoteCommand(flag: flag) {
                self?.handler?.handleRemoteTogglePlayPause() ?? false
            }
        }
        registeredTargets.append((commandCenter.togglePlayPauseCommand, toggleToken))

        // Comandos da tela bloqueada / volante / painel do carro: trocam a ESTAÇÃO DE RÁDIO.
        commandCenter.nextTrackCommand.isEnabled = flag.isEnabled
        let nextToken = commandCenter.nextTrackCommand.addTarget { [weak self] _ in
            Self.dispatchRemoteCommand(flag: flag) {
                self?.handler?.handleRemoteNextStation() ?? false
            }
        }
        registeredTargets.append((commandCenter.nextTrackCommand, nextToken))

        commandCenter.previousTrackCommand.isEnabled = flag.isEnabled
        let previousToken = commandCenter.previousTrackCommand.addTarget { [weak self] _ in
            Self.dispatchRemoteCommand(flag: flag) {
                self?.handler?.handleRemotePreviousStation() ?? false
            }
        }
        registeredTargets.append((commandCenter.previousTrackCommand, previousToken))

        isRegistered = true
    }

    private nonisolated static func dispatchRemoteCommand(
        flag: CommandAvailabilityFlag,
        action: @escaping @MainActor @Sendable () -> Bool
    ) -> MPRemoteCommandHandlerStatus {
        guard flag.isEnabled else {
            return .noActionableNowPlayingItem
        }

        // Remote commands may be delivered on a non-main queue. Always hop to
        // MainActor instead of assuming that a main-thread callback is already
        // executing inside the Swift concurrency actor.
        Task { @MainActor in
            _ = action()
        }
        return .success
    }
}
