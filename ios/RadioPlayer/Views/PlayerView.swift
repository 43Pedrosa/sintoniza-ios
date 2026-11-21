import SwiftUI

struct PlayerView: View {
    @ObservedObject var playerManager: RadioPlayerManager

    var body: some View {
        ZStack {
            background

            VStack(spacing: 0) {
                header
                    .padding(.top, 8)

                Spacer(minLength: 20)
                playerDisplay
                transportControls
                    .padding(.top, 28)
                Spacer(minLength: 26)
                stationList
                    .padding(.bottom, 12)
            }
            .padding(.horizontal, 22)
            .padding(.bottom, 12)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
        }
        .preferredColorScheme(.dark)
    }

    private var background: some View {
        ZStack {
            Color(red: 0.025, green: 0.03, blue: 0.045)
            RadialGradient(
                colors: [Color(red: 0.20, green: 0.29, blue: 0.43).opacity(0.48), .clear],
                center: .init(x: 0.5, y: 0.36),
                startRadius: 10,
                endRadius: 420
            )
            .blur(radius: 24)
        }
        .ignoresSafeArea()
    }

    private var header: some View {
        HStack(spacing: 9) {
            Image(systemName: "dot.radiowaves.left.and.right")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(.white.opacity(0.82))
            Text("SINTONIZA")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .tracking(3.2)
                .foregroundStyle(.white.opacity(0.82))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }

    private var playerDisplay: some View {
        VStack(spacing: 25) {
            ZStack {
                RoundedRectangle(cornerRadius: 34, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 0.18, green: 0.25, blue: 0.37),
                                Color(red: 0.075, green: 0.095, blue: 0.14),
                                Color(red: 0.035, green: 0.045, blue: 0.07)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                RoundedRectangle(cornerRadius: 34, style: .continuous)
                    .stroke(.white.opacity(0.15), lineWidth: 1)
                VStack(spacing: 18) {
                    Image(systemName: "waveform")
                        .font(.system(size: 76, weight: .ultraLight))
                        .symbolEffect(.pulse, isActive: playerManager.playbackState.isPlaying)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.white, Color(red: 0.55, green: 0.72, blue: 0.95)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    Text("RÁDIO AO VIVO")
                        .font(.system(size: 9, weight: .semibold, design: .rounded))
                        .tracking(3.4)
                        .foregroundStyle(.white.opacity(0.48))
                }
            }
            .aspectRatio(1, contentMode: .fit)
            .frame(maxWidth: 310)
            .clipShape(RoundedRectangle(cornerRadius: 34, style: .continuous))
            .shadow(color: .black.opacity(0.35), radius: 28, y: 18)

            VStack(spacing: 9) {
                Text(playerManager.currentStation?.name ?? "Sintoniza")
                    .font(.system(size: 25, weight: .semibold, design: .rounded))
                    .tracking(-0.5)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white)
                    .lineLimit(2)
                    .minimumScaleFactor(0.78)
                Text(statusLabel)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white.opacity(0.48))
            }
        }
        .padding(.horizontal, 18)
        .frame(maxWidth: .infinity)
    }

    private var statusLabel: String {
        switch playerManager.playbackState {
        case .loading, .buffering: return "Conectando…"
        case .playing: return "Reproduzindo agora"
        case .failed: return "Não foi possível conectar"
        case .paused: return "Pausado"
        case .interrupted: return "Interrompido"
        case .idle: return "Pronto para reproduzir"
        }
    }

    private var transportControls: some View {
        GlassEffectContainer(spacing: 22) {
            HStack(spacing: 25) {
                Button {
                    playerManager.previousStation()
                } label: {
                    Image(systemName: "backward.end.fill")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 62, height: 62)
                        .contentShape(Circle())
                }
                .buttonStyle(.glass)
                .disabled(playerManager.stations.isEmpty)
                .accessibilityLabel("Rádio anterior")

                Button {
                    playerManager.togglePlayPause()
                } label: {
                    Group {
                        if playerManager.playbackState.isBusy {
                            ProgressView().tint(.black)
                        } else {
                            Image(systemName: playerManager.playbackState.isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 27, weight: .bold))
                                .offset(x: playerManager.playbackState.isPlaying ? 0 : 2)
                        }
                    }
                    .foregroundStyle(.black)
                    .frame(width: 78, height: 78)
                    .contentShape(Circle())
                }
                .buttonStyle(.glassProminent)
                .tint(.white)
                .disabled(playerManager.stations.isEmpty)
                .accessibilityLabel(playerManager.playbackState.isPlaying ? "Pausar" : "Reproduzir")

                Button {
                    playerManager.nextStation()
                } label: {
                    Image(systemName: "forward.end.fill")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 62, height: 62)
                        .contentShape(Circle())
                }
                .buttonStyle(.glass)
                .disabled(playerManager.stations.isEmpty)
                .accessibilityLabel("Próxima rádio")
            }
        }
    }

    private var stationList: some View {
        VStack(spacing: 2) {
            ForEach(playerManager.stations.indices, id: \.self) { index in
                let station = playerManager.stations[index]
                let selected = index == playerManager.currentIndex

                Button {
                    playerManager.selectStation(at: index, autoPlay: false)
                } label: {
                    HStack {
                        Text(station.name)
                            .font(.system(size: 15, weight: selected ? .semibold : .regular, design: .rounded))
                            .foregroundStyle(.white.opacity(selected ? 1 : 0.62))
                            .lineLimit(1)
                        Spacer(minLength: 8)
                        if selected {
                            Circle()
                                .fill(Color(red: 0.55, green: 0.76, blue: 1))
                                .frame(width: 6, height: 6)
                                .shadow(color: .blue.opacity(0.8), radius: 6)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background {
                        if selected {
                            RoundedRectangle(cornerRadius: 13, style: .continuous)
                                .fill(.white.opacity(0.105))
                        }
                    }
                    .contentShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Selecionar \(station.name)")
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 23, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 23, style: .continuous)
                .stroke(.white.opacity(0.11), lineWidth: 1)
        }
    }
}
