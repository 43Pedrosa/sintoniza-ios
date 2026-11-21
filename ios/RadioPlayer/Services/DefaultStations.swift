import Foundation

enum DefaultStations {
    static let initial: [RadioStation] = [
        RadioStation(
            id: "station-1-mix-fm-106-3",
            name: "Mix FM 106.3",
            city: "São Paulo - SP",
            streamUrl: "https://playerservices.streamtheworld.com/api/livestream-redirect/MIXFM_SAOPAULOAAC.aac?dist=RadiosNet",
            position: 0
        ),
        RadioStation(
            id: "station-2-radio-disney-91-3",
            name: "Rádio Disney 91.3",
            city: "São Paulo - SP",
            streamUrl: "https://playerservices.streamtheworld.com/api/livestream-redirect//DISNEY_BRA_SP.mp3?dist=RadiosNet",
            position: 1
        ),
        RadioStation(
            id: "station-3-jovem-pan-vale-do-aco-103-5",
            name: "Jovem Pan Vale do Aço 103.5",
            city: "Ipatinga - MG",
            streamUrl: "https://stream.zeno.fm/vz3lvxuoxbdtv",
            position: 2
        ),
        RadioStation(
            id: "station-4-radio-galaxia-99-5",
            name: "Rádio Galáxia 99.5",
            city: "Coronel Fabriciano - MG",
            streamUrl: "https://api.ultranet.psi.br:8100/galaxiafm",
            position: 3
        ),
        RadioStation(
            id: "station-5-89-radio-rock-sp",
            name: "89 A Rádio Rock 89.1 FM",
            city: "São Paulo - SP",
            streamUrl: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_89FM_ADP.m3u8?dist=site-89fm",
            position: 4
        ),
        RadioStation(
            id: "station-6-radio-maresia-de-torres",
            name: "Rádio Maresia de Torres",
            city: "Torres - RS",
            streamUrl: "https://cast7.midiazdx.com.br:6930/stream",
            position: 5
        )
    ]
}
