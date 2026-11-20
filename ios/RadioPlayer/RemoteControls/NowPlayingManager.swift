import Foundation
import MediaPlayer

/// Atualiza o MPNowPlayingInfoCenter exibido na tela bloqueada do iPhone,
/// na Central de Controle e no painel multimídia do automóvel via Bluetooth.
@MainActor
final class NowPlayingManager {
    private let infoCenter = MPNowPlayingInfoCenter.default()

    func update(station: RadioStation?, state: PlaybackState) {
        guard let station else {
            clear()
            return
        }

        let isPlaying = state.isPlaying

        // Informa apenas dados reais da estação de rádio.
        // Nunca inventar nomes de músicas, artistas ou duração de faixa.
        // Não definir PlaybackDuration / ElapsedPlaybackTime para manter
        // a transmissão caracterizada como rádio ao vivo contínua (sem barra de seek).
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: station.name,
            MPNowPlayingInfoPropertyIsLiveStream: NSNumber(value: true),
            MPNowPlayingInfoPropertyMediaType: NSNumber(value: MPNowPlayingInfoMediaType.audio.rawValue),
            MPNowPlayingInfoPropertyDefaultPlaybackRate: NSNumber(value: 1.0),
            MPNowPlayingInfoPropertyPlaybackRate: NSNumber(value: isPlaying ? 1.0 : 0.0)
        ]

        if state.isBusy {
            info[MPMediaItemPropertyArtist] = "Conectando..."
        } else {
            info[MPMediaItemPropertyArtist] = "Rádio ao vivo"
        }

        infoCenter.nowPlayingInfo = info

        switch state {
        case .playing:
            infoCenter.playbackState = .playing
        case .paused, .failed:
            infoCenter.playbackState = .paused
        case .interrupted:
            infoCenter.playbackState = .interrupted
        case .loading, .buffering:
            infoCenter.playbackState = .playing
        case .idle:
            infoCenter.playbackState = .stopped
        }
    }

    func clear() {
        infoCenter.nowPlayingInfo = nil
        infoCenter.playbackState = .stopped
    }
}
