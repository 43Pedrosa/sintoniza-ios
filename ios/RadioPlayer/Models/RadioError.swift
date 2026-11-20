import Foundation

enum RadioError: LocalizedError, Equatable {
    case missingStreamURL
    case invalidStreamURL
    case playlistInaccessible
    case incompatibleFormat
    case networkUnavailable
    case streamUnavailable(String)
    case emptyImportFile
    case importFailed(String)

    var errorDescription: String? {
        switch self {
        case .missingStreamURL:
            return "Streaming ainda não configurado para esta rádio."
        case .invalidStreamURL:
            return "URL inválida."
        case .playlistInaccessible:
            return "Playlist inacessível ou não resolvida para stream direto."
        case .incompatibleFormat:
            return "Formato incompatível com o player nativo (use MP3, AAC ou HLS)."
        case .networkUnavailable:
            return "Sem conexão com a internet."
        case .streamUnavailable(let detail):
            return detail.isEmpty ? "Streaming indisponível no momento." : "Streaming indisponível: \(detail)"
        case .emptyImportFile:
            return "O arquivo radios.json não contém estações válidas."
        case .importFailed(let detail):
            return "Não foi possível importar o arquivo radios.json: \(detail)"
        }
    }
}
