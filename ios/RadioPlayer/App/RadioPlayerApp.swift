import SwiftUI

@main
struct RadioPlayerApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var playerManager = RadioPlayerManager()

    var body: some Scene {
        WindowGroup {
            PlayerView(playerManager: playerManager)
                .onAppear {
                    if playerManager.stations.isEmpty {
                        playerManager.updateStations(DefaultStations.initial)
                    }
                }
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .background || newPhase == .active {
                        playerManager.refreshRemoteControlsForBackgroundOrForeground()
                    }
                }
        }
    }
}
