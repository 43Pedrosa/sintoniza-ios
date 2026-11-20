import SwiftUI

struct PlayerView: View {
    @ObservedObject var playerManager: RadioPlayerManager
    @ObservedObject var storage: LocalRadioStorage
    let onImportFile: (URL) -> Void
    let onRestoreDefaults: () -> Void

    var body: some View {
        ZStack {
            Color(red: 0.035, green: 0.04, blue: 0.055).ignoresSafeArea()

            VStack(spacing: 0) {
                header
                    .padding(.top, 12)
                    .padding(.bottom, 22)

                artwork
                    .padding(.horizontal, 34)
                    .padding(.bottom, 24)

                currentStationInfo
                    .padding(.horizontal, 24)
                    .padding(.bottom, 20)

                transportControls
                    .padding(.bottom, 24)

                stationList

                if let error = storage.lastImportError {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red.opacity(0.9))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)
                        .padding(.top, 10)
                }
            }
            .padding(.horizontal, 20)
        }
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text("SINTONIZA")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .tracking(3.2)
                    .foregroundStyle(.white.opacity(0.55))
                Text("Rádio")
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
            }
            Spacer()
            Image(systemName: "dot.radiowaves.left.and.right")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(.white.opacity(0.85))
                .frame(width: 46, height: 46)
                .background(.white.opacity(0.09), in: Circle())
        }
    }

    private var artwork: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(LinearGradient(
                    colors: [Color(red: 0.22, green: 0.28, blue: 0.42), Color(red: 0.08, green: 0.10, blue: 0.17), Color(red: 0.32, green: 0.17, blue: 0.28)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
            Circle()
                .stroke(.white.opacity(0.10), lineWidth: 1)
                .padding(28)
            Circle()
                .stroke(.white.opacity(0.13), lineWidth: 1)
                .padding(54)
            Image(systemName: "waveform")
                .font(.system(size: 76, weight: .light))
                .foregroundStyle(.white.opacity(0.92))
                .shadow(color: .black.opacity(0.25), radius: 18, y: 8)
            VStack {
                Spacer()
                HStack {
                    Text("LIVE RADIO")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .tracking(2.4)
                        .foregroundStyle(.white.opacity(0.75))
                    Spacer()
                    Circle().fill(playerManager.playbackState.isPlaying ? Color.green : Color.white.opacity(0.35))
                        .frame(width: 7, height: 7)
                }
                .padding(20)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .shadow(color: .black.opacity(0.28), radius: 24, y: 14)
    }

    private var currentStationInfo: some View {
        VStack(spacing: 6) {
            Text(playerManager.currentStation?.name ?? "Escolha uma rádio")
                .font(.system(size: 23, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
            Text(playerManager.currentStation?.city ?? "Suas estações favoritas")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.white.opacity(0.55))
            HStack(spacing: 7) {
                if playerManager.playbackState.isBusy {
                    ProgressView().tint(.white).scaleEffect(0.75)
                } else if playerManager.playbackState.isPlaying {
                    Circle().fill(Color.green).frame(width: 6, height: 6)
                }
                Text(playerManager.playbackState.statusText)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(playerManager.playbackState.isPlaying ? .green : .white.opacity(0.5))
            }
            .padding(.top, 3)
        }
    }

    private var transportControls: some View {
        HStack(spacing: 42) {
            Button { playerManager.previousStation() } label: {
                Image(systemName: "backward.end.fill")
                    .font(.system(size: 25, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 54, height: 54)
                    .contentShape(Circle())
            }
            .accessibilityLabel("Rádio anterior")
            .disabled(playerManager.stations.isEmpty)

            Button { playerManager.togglePlayPause() } label: {
                Image(systemName: playerManager.playbackState.isPlaying ? "pause.fill" : "play.fill")
                    .font(.system(size: 27, weight: .bold))
                    .foregroundStyle(Color(red: 0.06, green: 0.07, blue: 0.09))
                    .offset(x: playerManager.playbackState.isPlaying ? 0 : 2)
                    .frame(width: 68, height: 68)
                    .background(.white, in: Circle())
            }
            .accessibilityLabel(playerManager.playbackState.isPlaying ? "Pausar" : "Reproduzir")
            .disabled(playerManager.stations.isEmpty || playerManager.playbackState.isBusy)

            Button { playerManager.nextStation() } label: {
                Image(systemName: "forward.end.fill")
                    .font(.system(size: 25, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 54, height: 54)
                    .contentShape(Circle())
            }
            .accessibilityLabel("Próxima rádio")
            .disabled(playerManager.stations.isEmpty)
        }
        .padding(.top, 8)
    }

    private var stationList: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("SUAS RÁDIOS")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .tracking(2)
                    .foregroundStyle(.white.opacity(0.45))
                Spacer()
                Text("\(playerManager.stations.count) ESTAÇÕES")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .tracking(1)
                    .foregroundStyle(.white.opacity(0.35))
            }
            .padding(.horizontal, 2)

            ScrollView {
                VStack(spacing: 2) {
                    ForEach(Array(playerManager.stations.enumerated()), id: \.element.id) { index, station in
                        let isCurrent = playerManager.currentIndex == index
                        Button {
                            playerManager.selectStation(at: index, autoPlay: true)
                        } label: {
                            HStack(spacing: 13) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .fill(isCurrent ? .white.opacity(0.16) : .white.opacity(0.07))
                                        .frame(width: 42, height: 42)
                                    Image(systemName: isCurrent && playerManager.playbackState.isPlaying ? "waveform" : "dot.radiowaves.left.and.right")
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundStyle(isCurrent ? .white : .white.opacity(0.55))
                                }
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(station.name)
                                        .font(.system(size: 14, weight: isCurrent ? .semibold : .medium))
                                        .foregroundStyle(.white)
                                        .lineLimit(1)
                                    Text(station.city ?? "Rádio online")
                                        .font(.system(size: 11, weight: .regular))
                                        .foregroundStyle(.white.opacity(0.45))
                                        .lineLimit(1)
                                }
                                Spacer()
                                if isCurrent {
                                    Text("TOCANDO")
                                        .font(.system(size: 9, weight: .bold, design: .rounded))
                                        .tracking(1)
                                        .foregroundStyle(.green)
                                } else {
                                    Image(systemName: "play.fill")
                                        .font(.system(size: 11))
                                        .foregroundStyle(.white.opacity(0.35))
                                }
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 7)
                            .background(isCurrent ? .white.opacity(0.08) : .clear, in: RoundedRectangle(cornerRadius: 14))
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .frame(maxHeight: 190)
        }
        .padding(.top, 2)
        .padding(.bottom, 8)
    }
}
