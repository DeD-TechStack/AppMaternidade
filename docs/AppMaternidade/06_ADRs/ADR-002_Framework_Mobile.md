---
tipo: adr
id: ADR-002
status: Proposta
data: 2026-10-22
autor: Hermes (coordenador da APP-001)
aprovador: nenhum até agora
tarefas: MAT-7, MAT-15, MAT-17
---

# ADR-002 — Framework mobile e estratégia Android e iOS

**Status:** Proposta. Recomendação técnica do Hermes; não aprovada por Daniel.

## Contexto e requisitos

- Android e iOS são obrigatórios, com o mesmo conjunto de funções no MVP ([ADR-001](ADR-001_Plataformas_e_Web.md)).
- O ambiente atual é Windows, sem Mac e sem iPhone de teste conhecido ([Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md), seção 9).
- O app precisa de banco local com fila durável, cronômetro visível fora do app sem processo rodando, notificações, acessibilidade (fonte a 200%, leitor de tela) e build de release testável em aparelho físico.
- Equipe pequena: o custo de manter duas bases de código ou duas linguagens de interface pesa mais que pequenas diferenças de desempenho.
- Regra do pacote: escolher pelo produto e pela manutenção, sem acoplar o mobile ao backend por conveniência e sem herdar a stack de outros projetos.

## Opções consideradas

1. React Native + Expo (TypeScript).
2. Flutter (Dart).
3. Kotlin Multiplatform com UI nativa (SwiftUI e Jetpack Compose).
4. Kotlin Multiplatform com Compose Multiplatform.
5. Apps nativos separados em Swift e Kotlin.

## Evidências

Consultas de 22/10/2026; detalhes, versões [EXEC] e 103 fontes em [Mobile e plataformas](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md).

- Versões estáveis: Expo SDK 58 (`expo` 58.0.17) com React Native 0.88.0; Flutter 3.47.7; Kotlin 2.4.21; Compose Multiplatform 1.12.2; Xcode 27.1 [EXEC, nota mobile, E1 a E8].
- iOS sem Mac: o EAS Build compila e assina na nuvem e o EAS Submit envia ao TestFlight a partir do Windows (https://docs.expo.dev/faq/, https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/). Flutter, KMP e nativo compilam o iOS com Xcode no macOS (https://docs.flutter.dev/platform-integration/ios/setup, https://kotlinlang.org/docs/multiplatform/quickstart.html). Sem Mac próprio, o build, a assinatura e o envio ao TestFlight passam por CI macOS (Codemagic, GitHub Actions, Bitrise), e o iPhone recebe o app pelo TestFlight ([Mobile e plataformas, seção 2.1](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md)). O Xcode Cloud exige um Mac ao menos para a configuração inicial [HIP].
- Live Activity: o `expo-widgets` oficial cria Live Activities "without writing native code" (https://docs.expo.dev/versions/latest/sdk/widgets/); o plugin Flutter `live_activities` exige a extensão em Swift no Xcode (https://pub.dev/packages/live_activities). Live Activities duram até 8 horas (https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities).
- Android: notificação contínua com cronômetro do sistema e Live Updates, só para atividades iniciadas pelo próprio usuário (https://developer.android.com/develop/ui/views/notifications/live-update). Em React Native não há biblioteca mantida pronta para isso (Notifee está arquivado) e seria preciso um módulo Kotlin pequeno; no Flutter, `flutter_local_notifications` já expõe cronômetro (https://pub.dev/documentation/flutter_local_notifications/latest/flutter_local_notifications/AndroidNotificationDetails-class.html).
- Persistência: `expo-sqlite` oficial com SQLCipher por config plugin; sem SQLCipher no binário, a chave é ignorada sem erro (https://docs.expo.dev/versions/latest/sdk/sqlite/). Com PowerSync, o SDK React Native usa `op-sqlite`, que suporta SQLCipher (https://docs.powersync.com/client-sdks/advanced/data-encryption).
- Acessibilidade: Compose Multiplatform tem lacunas documentadas no iOS (https://kotlinlang.org/docs/multiplatform/compose-ios-accessibility.html).
- Custos de iOS sem Mac com Expo: Apple Developer Program a US$ 99 por ano (https://developer.apple.com/programs/enroll/); EAS Free com 15 builds de iOS por mês ou Starter a US$ 19 por mês (https://expo.dev/pricing.md). Nas outras opções, soma-se um Mac (a partir de US$ 899) ou Mac remoto ou CI (a partir de US$ 25 por mês ou por minuto).
- Ritmo de atualização: React Native lança seis versões por ano e mantém as três últimas (https://reactnative.dev/releases/overview); a Expo publicou quatro SDKs em 2026 [EXEC, nota mobile, E1].

## Recomendação

**React Native + Expo SDK 58, com development builds e EAS Build e Submit.**

- Expo Go só para protótipo de tela; o app real roda em development build (SQLite cifrado, `expo-widgets`, push).
- iOS: development build instalado no iPhone por distribuição interna; TestFlight para testes de release.
- Live Activity com `expo-widgets`; módulo Expo em Kotlin para a notificação com cronômetro no Android.
- Preferir módulos oficiais da Expo; módulo de terceiros só com repositório ativo e motivo registrado.
- Calendário fixo de atualização do SDK (por exemplo, até três meses depois de cada SDK novo).

Justificativa pelas necessidades do app:

- **iOS a partir do Windows:** é a opção em que o ciclo inteiro roda num fluxo integrado e documentado. As credenciais são gerenciadas pelo EAS, o development build é instalado direto no iPhone e o EAS Submit envia ao TestFlight.
- **As alternativas sem Mac:** Flutter e KMP também chegam ao TestFlight, por CI macOS. Mas a assinatura e o pipeline ficam a montar, a iteração no aparelho passa pelo TestFlight e a Live Activity é uma extensão em Swift no projeto Xcode, difícil de criar e depurar sem Mac [HIP].
- **Em todas as opções,** a depuração nativa no iPhone continua limitada sem Mac.

Além disso, a recomendação resolve o cronômetro do iOS sem Swift (`expo-widgets`, a validar na prova técnica); mantém uma base de interface e uma de lógica; não amarra o backend (o cliente fala com qualquer API, e o PowerSync tem SDK GA para React Native e para Flutter).

**Alternativa principal: Flutter**, nestes casos:

- a equipe passar a ter Mac, ou aceitar CI macOS e Swift para a Live Activity, e a prova técnica favorecer Flutter;
- a recomendação falhar nas condições abaixo.

## Consequências

- Positivas: iOS testável a partir do Windows; uma base de código; OTA para correções de JavaScript dentro das regras das lojas; site e painel podem usar React se fizer sentido.
- Negativas: dependência do EAS para iOS (sem ele, volta a precisar de Mac ou CI macOS); ritmo alto de atualizações; Kotlin pontual no Android; depuração nativa no iPhone limitada sem Mac.

## Riscos e verificação que falta

- `expo-widgets` existe desde o SDK 56 e é recente: provar Live Activity com timer, encerramento em 8 horas e push (prova P6).
- Módulo Kotlin de cronômetro: provar com o app encerrado e com a permissão de notificação negada (P6, Q-10).
- SQLCipher ativo no build de release (`PRAGMA cipher_version`).
- Acessibilidade com fonte a 200% e TalkBack e VoiceOver nas telas Hoje e Sessão (P8).
- Tempo e custo reais de build de iOS na nuvem (P7); desempenho em Android de entrada (P9).

## Quando revisar

- A equipe passa a ter Mac (Flutter empata e a prova decide).
- `expo-widgets` ou o módulo de cronômetro não atendem na prova.
- Falha de acessibilidade em React Native.
- Entra alguém com Swift e iOS: KMP com UI nativa vira candidata.
- Mudança de preço ou condição do EAS, ou descontinuação de módulo central da Expo.

## Referências

[Comparação de arquiteturas](../03_Arquitetura/Comparacao_de_Arquiteturas.md) · [Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md) · [Mobile e plataformas](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md) · [ADR-003](ADR-003_Backend_Persistencia_Autenticacao.md) · [ADR-004](ADR-004_Offline_Sync_e_Temporizadores.md) · tarefas MAT-7, MAT-15 e MAT-17.
