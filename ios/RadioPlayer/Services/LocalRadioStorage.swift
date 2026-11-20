import Foundation

/// Gerencia a lista inicial pré-cadastrada, a importação do arquivo `radios.json`
/// e a persistência local no iPhone, sem exigir servidor ou banco de dados.
@MainActor
final class LocalRadioStorage: ObservableObject {
    static let maxStations = 5

    @Published private(set) var lastImportError: String?

    private struct WrappedRadiosPayload: Codable {
        let radios: [RadioStation]
    }

    private var storageFileURL: URL {
        let baseDir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        let appDir = baseDir.appendingPathComponent("RadioPlayer", isDirectory: true)
        if !FileManager.default.fileExists(atPath: appDir.path) {
            try? FileManager.default.createDirectory(at: appDir, withIntermediateDirectories: true)
        }
        return appDir.appendingPathComponent("radios.json")
    }

    /// No primeiro acesso, grava e retorna automaticamente as 5 estações iniciais.
    func loadSavedStations() -> [RadioStation] {
        if !FileManager.default.fileExists(atPath: storageFileURL.path) {
            let defaults = normalize(DefaultStations.initial)
            try? saveStations(defaults)
            return defaults
        }

        guard let data = try? Data(contentsOf: storageFileURL),
              let stations = try? decodeStations(from: data) else {
            return normalize(DefaultStations.initial)
        }
        return normalize(stations)
    }

    /// Restaura a lista inicial das 5 estações padrão.
    func restoreDefaultStations() -> [RadioStation] {
        lastImportError = nil
        let defaults = normalize(DefaultStations.initial)
        try? saveStations(defaults)
        return defaults
    }

    /// Importa um arquivo `radios.json` selecionado pelo usuário ou aberto pelo sistema,
    /// substituindo completamente a lista anterior e preservando a ordem cadastrada.
    func importStations(from externalURL: URL) throws -> [RadioStation] {
        lastImportError = nil

        let didAccessSecurityScoped = externalURL.startAccessingSecurityScopedResource()
        defer {
            if didAccessSecurityScoped {
                externalURL.stopAccessingSecurityScopedResource()
            }
        }

        let data: Data
        do {
            data = try Data(contentsOf: externalURL)
        } catch {
            let err = RadioError.importFailed("Falha ao ler o arquivo selecionado.")
            lastImportError = err.localizedDescription
            throw err
        }

        let decoded: [RadioStation]
        do {
            decoded = try decodeStations(from: data)
        } catch {
            let err = RadioError.importFailed("Formato JSON incompatível.")
            lastImportError = err.localizedDescription
            throw err
        }

        let normalized = normalize(decoded)
        guard !normalized.isEmpty else {
            let err = RadioError.emptyImportFile
            lastImportError = err.localizedDescription
            throw err
        }

        do {
            try saveStations(normalized)
        } catch {
            let err = RadioError.importFailed("Falha ao salvar a lista no aparelho.")
            lastImportError = err.localizedDescription
            throw err
        }

        return normalized
    }

    func clearError() {
        lastImportError = nil
    }

    private func decodeStations(from data: Data) throws -> [RadioStation] {
        let decoder = JSONDecoder()
        if let directArray = try? decoder.decode([RadioStation].self, from: data) {
            return directArray
        }
        let wrapped = try decoder.decode(WrappedRadiosPayload.self, from: data)
        return wrapped.radios
    }

    private func normalize(_ stations: [RadioStation]) -> [RadioStation] {
        let validStations = stations.filter { !$0.name.isEmpty }
        let ordered = validStations
            .enumerated()
            .sorted { lhs, rhs in
                if lhs.element.position != rhs.element.position {
                    return lhs.element.position < rhs.element.position
                }
                return lhs.offset < rhs.offset
            }
            .map(\.element)
            .prefix(Self.maxStations)

        return ordered.enumerated().map { index, station in
            RadioStation(
                id: station.id,
                name: station.name,
                city: station.city,
                streamUrl: station.streamUrl,
                position: index
            )
        }
    }

    private func saveStations(_ stations: [RadioStation]) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(stations)
        try data.write(to: storageFileURL, options: .atomic)
    }
}
