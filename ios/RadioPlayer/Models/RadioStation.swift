import Foundation

struct RadioStation: Identifiable, Codable, Equatable, Sendable {
    let id: String
    let name: String
    let city: String?
    let streamUrl: String
    let position: Int

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case city
        case streamUrl = "stream_url"
        case position
    }

    init(
        id: String = UUID().uuidString,
        name: String,
        city: String? = nil,
        streamUrl: String,
        position: Int
    ) {
        self.id = id
        self.name = name
        self.city = city
        self.streamUrl = streamUrl
        self.position = position
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = (try? container.decode(String.self, forKey: .id)) ?? UUID().uuidString
        self.name = try container.decode(String.self, forKey: .name).trimmingCharacters(in: .whitespacesAndNewlines)
        self.city = (try? container.decodeIfPresent(String.self, forKey: .city))?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.streamUrl = ((try? container.decode(String.self, forKey: .streamUrl)) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        self.position = (try? container.decode(Int.self, forKey: .position)) ?? 0
    }

    var isExternalPlaylist: Bool {
        let lower = streamUrl.trimmingCharacters(in: .whitespacesAndNewlines).lowercased().split(separator: "?").first ?? ""
        return lower.hasSuffix(".m3u") || lower.hasSuffix(".pls") || lower.hasSuffix(".xspf")
    }

    var isWebReferencePage: Bool {
        let lower = streamUrl.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return lower.contains("radios.com.br/aovivo/") || lower.hasSuffix(".html") || lower.hasSuffix(".htm")
    }

    /// Valida que a URL do streaming é HTTP ou HTTPS bem formada.
    var validStreamURL: URL? {
        let trimmed = streamUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty,
              let url = URL(string: trimmed),
              let scheme = url.scheme?.lowercased(),
              (scheme == "http" || scheme == "https"),
              let host = url.host,
              !host.isEmpty else {
            return nil
        }
        return url
    }
}
