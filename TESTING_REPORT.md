# Relatório de alteração e validação — v6

## Alterações
- `ios/RadioPlayer/Audio/RadioPlayerManager.swift`: corrigida a captura da URL da estação atual antes da substituição da lista. A versão anterior comparava a URL nova com ela mesma e podia deixar de reiniciar o streaming quando o endereço da estação selecionada mudava.
- `ios/RadioPlayer/RemoteControls/RemoteCommandManager.swift`: removida a remoção global de handlers de comandos compartilhados; o app apenas desabilita os comandos de seek/skip que não utiliza. Os callbacks remotos agora encaminham a execução para `MainActor`.
- `src/hooks/useAudioPreview.ts`: a referência da lista usada pelos callbacks Media Session é atualizada sincronicamente; falhas de streaming atualizam o estado de reprodução para pausado; metadados identificam o app como Sintoniza.
- `.github/workflows/ios-unsigned-build.yml`: adicionado workflow para gerar um IPA não assinado em runner macOS do GitHub Actions.
- `README.md` e `REVISAO_TECNICA_V6.md`: documentadas a arquitetura, as limitações do PWA e as etapas de compilação/teste.

## Verificações realizadas neste ambiente
- Integridade do ZIP: aprovada (`unzip -t`).
- Sintaxe dos arquivos Swift: análise sintática (`swiftc -frontend -parse`) aprovada.

## Verificações não realizadas
- Não foi possível compilar o target iOS: este ambiente não possui Xcode nem SDK iOS/AVFoundation.
- A instalação de dependências web excedeu o tempo disponível; portanto, `vite build` e `tsc` não foram concluídos.
- Não houve teste em iPhone físico nem no Ford Fiesta 2016.
- A primeira execução do workflow GitHub Actions ainda precisa ser feita no repositório do usuário.

## Limite importante do PWA
O PWA usa HTMLAudioElement e Media Session. Ele não pode habilitar `UIBackgroundModes` nem registrar `MPRemoteCommandCenter`; portanto, não há como garantir que iOS mostre Próxima/Anterior no bloqueio ou no Bluetooth apenas por alterações web. Para controle remoto nativo confiável, é necessário instalar e testar a versão Swift.
