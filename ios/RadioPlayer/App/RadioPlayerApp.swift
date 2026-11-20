import SwiftUI

@main
struct RadioPlayerApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var playerManager = RadioPlayerManager()
    @StateObject private var storage = LocalRadioStorage()

    var body: some Scene {
        WindowGroup {
            PlayerView(
                playerManager: playerManager,
                storage: storage,
                onImportFile: handleImport(url:),
                onRestoreDefaults: handleRestoreDefaults
            )
            .onAppear {
                let saved = storage.loadSavedStations()
                playerManager.updateStations(saved)
            }
            .onOpenURL { url in
                handleImport(url: url)
            }
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .background || newPhase == .active {
                    playerManager.refreshRemoteControlsForBackgroundOrForeground()
                }
            }
        }
    }

    @MainActor
    private func handleImport(url: URL) {
        if let imported = try? storage.importStations(from: url) {
            playerManager.updateStations(imported)
        }
    }

    @MainActor
    private func handleRestoreDefaults() {
        let defaults = storage.restoreDefaultStations()
        playerManager.updateStations(defaults)
    }
}
