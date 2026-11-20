import Foundation

enum PlaybackState: Equatable, Sendable {
    case idle
    case loading
    case buffering
    case playing
    case paused
    case interrupted
    case failed(String)

    var isPlaying: Bool {
        self == .playing
    }

    var isBusy: Bool {
        self == .loading || self == .buffering
    }

    var statusText: String {
        switch self {
        case .idle:
            return "Pronto para reproduzir"
        case .loading:
            return "Conectando ao streaming..."
        case .buffering:
            return "Carregando áudio..."
        case .playing:
            return "Ao vivo"
        case .paused:
            return "Pausado"
        case .interrupted:
            return "Áudio interrompido"
        case .failed(let message):
            return message
        }
    }
}
