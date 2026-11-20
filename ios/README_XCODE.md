# Aplicativo Nativo iOS — Guia de Compilação no Xcode (5 Estações / Offline JSON)

> **Nota sobre o ambiente:** O ambiente Google AI Studio executa em Linux e não possui Xcode, `swiftc` ou simulador iOS. Todo o código Swift/SwiftUI nativo foi estruturado em `ios/RadioPlayer/` pronto para compilação em um Mac com Xcode.

## 1. Pré-requisitos no Mac
- macOS com **Xcode 15+** instalado
- Conta Apple Developer (gratuita para instalar no próprio iPhone via USB)
- Opcional: [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`) para gerar o `.xcodeproj` em um comando

## 2. Gerar e abrir o projeto no Xcode

### Opção A — Automática com XcodeGen (recomendada)
```bash
cd ios
xcodegen generate
open RadioPlayer.xcodeproj
```

### Opção B — Manual no Xcode
1. Abra o Xcode → **File → New → Project → iOS → App** (`RadioPlayer`, SwiftUI, Swift, iOS 17.0+).
2. Arraste as pastas de `ios/RadioPlayer/` (`App`, `Audio`, `Configuration`, `Models`, `RemoteControls`, `Services`, `Views`) para dentro do projeto.
3. Em **Target → Signing & Capabilities**:
   - Selecione seu **Team**.
   - Clique em **+ Capability** e adicione **Background Modes**.
   - Marque **Audio, AirPlay, and Picture in Picture**.
4. Em **Target → Info** (`Info.plist`), verifique:
   - `UIBackgroundModes` contém `audio`.
   - `NSAppTransportSecurity -> NSAllowsArbitraryLoads = YES` (necessário para rádios que transmitem via `http://`).
   - `CFBundleDocumentTypes` inclui `public.json` (permite abrir `radios.json` diretamente de AirDrop / Arquivos / WhatsApp).

## 3. Como transferir a lista do notebook para o iPhone
1. No painel web do notebook, cadastre até 5 rádios, teste cada streaming e clique em **EXPORTAR LISTA** para baixar `radios.json`.
2. Envie o arquivo `radios.json` para o iPhone (AirDrop, iCloud Drive, E-mail ou WhatsApp).
3. No iPhone, abra o aplicativo **Rádio Ford**, toque em **Importar radios.json** e selecione o arquivo (ou toque no arquivo no app Arquivos e escolha abrir no Rádio Ford).
4. A lista anterior é substituída mantendo exatamente a ordem cadastrada no notebook, sem depender de servidor.
