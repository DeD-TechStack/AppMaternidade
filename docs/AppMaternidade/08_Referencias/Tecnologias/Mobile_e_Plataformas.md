---
tipo: pesquisa-tecnologia
status: rascunho
responsavel: Hermes (subagente mobile)
revisado_em: 2026-10-22
fontes_principais:
  - https://docs.expo.dev/versions/latest/
  - https://expo.dev/changelog/sdk-58
  - https://reactnative.dev/releases/overview
  - https://docs.flutter.dev/release/release-notes
  - https://kotlinlang.org/docs/multiplatform/supported-platforms.html
  - https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities
  - https://developer.android.com/develop/ui/views/notifications/live-update
  - https://expo.dev/pricing.md
  - https://developer.apple.com/news/upcoming-requirements/
---

# Mobile e plataformas: alternativas para Android e iOS

Pesquisa de referência da task APP-001 (etapa D4, frente mobile). Compara cinco alternativas: (1) React Native + Expo com TypeScript; (2) Flutter com Dart; (3) Kotlin Multiplatform (KMP) com UI nativa (SwiftUI no iOS, Jetpack Compose no Android); (4) KMP + Compose Multiplatform (CMP); (5) apps nativos separados em Swift/SwiftUI e Kotlin/Compose.

Nenhuma stack está aprovada. A recomendação deste documento é do Hermes e é provisória. Backend, protocolo de sincronização, autenticação e preços de BaaS estão em [Dados, sincronização e backend](Dados_Sincronizacao_e_Backend.md) e [Preços datados](Precos_Datados.md). Aqui entra só o que muda a escolha do cliente mobile.

Todas as fontes foram consultadas em 22/10/2026 (America/Sao_Paulo). As marcas seguem as [Convenções do cofre](../../00_Inicio/Convencoes.md): **[DOC]** declarado em documentação, changelog, blog ou página de preços oficial; **[EXEC]** consulta executada nesta sessão (comando e resultado na seção "Execuções registradas", perto do fim); **[HIP]** inferência ainda não verificada. Os códigos MPnn remetem à tabela "Fontes"; En remete às execuções. Nenhum app, protótipo ou SDK foi instalado ou medido. Trechos em inglês são literais; o resto é tradução livre.

## Resumo

- **Versões em 22/10/2026.** Expo SDK 58 (pacote `expo` 58.0.17) com React Native 0.88 [EXEC E1, E3; DOC MP01, MP02]. Flutter 3.47.7 com Dart 3.13 [EXEC E6; DOC MP32]. Kotlin 2.4.21 e Compose Multiplatform 1.12.2 [EXEC E5, E8; DOC MP49, MP53]. Xcode 27.1 com Swift 6.4 [DOC MP63, MP64]. Jetpack Compose BOM 2026.09.00 [EXEC E8].
- **Shortlist.** React Native + Expo é a recomendação provisória; Flutter é a alternativa principal. KMP com UI nativa fica como alternativa condicional. KMP + CMP e nativo puro ficam fora da shortlist agora, com condições explícitas de reentrada (ver seção 12).
- **O que mais separa as opções para esta equipe é iOS a partir de Windows.** Só RN + Expo tem um fluxo integrado e documentado para o ciclo inteiro sem Mac próprio: compilar, assinar, instalar um development build no iPhone e enviar ao TestFlight, via EAS Build e EAS Submit [DOC MP11, MP14, MP15]. Flutter, KMP e nativo compilam para iOS só no macOS, com Xcode [DOC MP33, MP34, MP50]. Sem Mac próprio, chegam ao TestFlight por CI macOS (seção 13, opção B3), mas sem depurador no iPhone e com a extensão da Live Activity criada e editada no Xcode [DOC MP42]. Precisão do coordenador, depois da revisão independente.
- **O segundo fator é a atividade em andamento fora do app.** No iOS, a Live Activity é sempre uma extensão de widget em SwiftUI [DOC MP57]. Com Expo, o pacote oficial `expo-widgets` gera essa extensão a partir de componentes Expo UI, "without writing native code" [DOC MP17]. No Flutter, o plugin `live_activities` exige criar a extensão no Xcode e desenhar a interface em Swift [DOC MP42]. Em KMP e nativo, é Swift direto.
- **No Android, o cronômetro em notificação não precisa de processo rodando.** A notificação contínua usa `setUsesChronometer` e `setWhen`, e o Android 16+ ainda pode promovê-la a Live Update [DOC MP76, MP77]. Em RN, nenhuma biblioteca mantida consultada expõe isso pronto: `expo-notifications` só tem `sticky`, e a notificação customizada do `expo-widgets` usa RemoteViews, que as Live Updates proíbem. Logo, seria preciso um módulo Expo pequeno em Kotlin [DOC MP20, MP17, MP76; HIP]. No Flutter, `flutter_local_notifications` já expõe cronômetro e `ongoing` [DOC MP44].
- **Custo mínimo de iOS a partir de Windows com RN + Expo.** US$ 99 por ano do Apple Developer Program [DOC MP67], mais o EAS Free (até 15 builds iOS/mês) ou o Starter (US$ 19/mês) [DOC MP12], mais um iPhone físico se a equipe não tiver. Nas outras opções, some um Mac (Mac mini a partir de US$ 899 na loja dos EUA [DOC MP74]) ou um Mac remoto ou CI (a partir de US$ 25/mês, ou por minuto) [DOC MP92, MP47, MP89].

### O que muda em relação à pesquisa preliminar

A pesquisa do pacote (`02_PESQUISA_TECNOLOGIAS.md`, fontes M01–M11) continua válida nos pontos centrais:
- Windows → iOS via EAS (M02) [DOC MP11].
- KMP e CMP estáveis para Android/iOS (M04) [DOC MP48].
- Push no Expo Go Android exige development build (M07) [DOC MP20].
- Tarefas de background sem horário garantido (M08) [DOC MP22].

Atualizações:
- **Planos do EAS.** O Free mantém 15 + 15 builds; o Starter de US$ 19/mês agora inclui US$ 45 de crédito, e cada build iOS custa US$ 2 ou US$ 4 [DOC MP12].
- **Novidades que pesam na decisão:**
  - o `expo-widgets` oficial existe [DOC MP17];
  - o RN roda só na Nova Arquitetura [DOC MP05];
  - Notifee e `expo-live-activity` estão arquivados [EXEC E5];
  - `sqlcipher_flutter_libs` chegou ao fim de vida [DOC MP41];
  - Apple exige Xcode 26 desde 28/04/2026 [DOC MP62];
  - Google Play exige API 36 desde 31/08/2026 [DOC MP86].

## 1. Versões estáveis e maturidade

| Alternativa | Versão estável verificada | Maturidade e requisitos | Observações |
| --- | --- | --- | --- |
| RN + Expo | `expo` 58.0.17 (SDK 58). A versão 58.0.0 saiu no npm em 29/09/2026, e o anúncio oficial no changelog foi em 15/10/2026. `react-native` 0.88.0 foi publicado no npm em 15/10/2026, com React 19.3.0 [EXEC E1, E2, E3; DOC MP01, MP103]. O blog anunciou a 0.88 em 19/10/2026 como release "no breaking changes" [DOC MP08] | SDK 58: Android 7+ (compileSdk 37, targetSdk 36), iOS 16.4+, Xcode 26.4+ [DOC MP01]. "SDK 58 is built for iOS 27" [DOC MP02] | Desde o RN 0.82, roda só na Nova Arquitetura [DOC MP05]. O RN 0.84 tornou o Hermes V1 padrão e removeu componentes da arquitetura legada [DOC MP06]. O projeto passou à React Foundation (organização `react` no GitHub) [DOC MP07]. O site de docs ainda mostra 0.87 como "latest" [DOC MP10]: é atraso da documentação, não da versão |
| Flutter | Flutter 3.47.7, canal stable, de 08/10/2026, com Dart 3.13.5. A 3.47.0 é a última versão estável listada nas release notes. O dart.dev já lista Dart 3.13.6 [EXEC E6; DOC MP30, MP32] | Android e iOS são alvos de produção. O build iOS exige Xcode no macOS [DOC MP34] | A versão 3.47 (12/08/2026) separou Material e Cupertino nos pacotes `material_ui`/`cupertino_ui` 1.0 e preparou o Xcode 27/iOS 27 [DOC MP31]. Beta: 3.50.0-0.1.pre [EXEC E6] |
| KMP + UI nativa | Kotlin 2.4.21 (08/10/2026) [EXEC E5, E8; DOC MP49]. Android: Compose BOM 2026.09.00 [EXEC E8]. iOS: Xcode 27.1 com Swift 6.4 [DOC MP63] | Núcleo KMP com Android e iOS em "Stable" [DOC MP48]. O Google suporta oficialmente o KMP para lógica compartilhada [DOC MP56] | O Swift export (chamar Kotlin de Swift sem cabeçalhos Objective-C) está em Alpha [DOC MP51] |
| KMP + CMP | Compose Multiplatform 1.12.2 (15/10/2026); pré-lançamento 1.13.0-alpha02 [EXEC E5, E8; DOC MP53] | CMP com Android e iOS em "Stable"; web (Kotlin/Wasm) em Beta [DOC MP48] | A versão 1.12 melhorou a rolagem de listas no iOS [DOC MP53] |
| Nativo | Swift 6.4, lançado em 15/09/2026 (tag 6.4.1 em 15/10/2026), com Xcode 27.1 [DOC MP64, MP63; EXEC E5]. Android: Kotlin 2.4.21 + Compose BOM 2026.09.00 [EXEC E8] | Referência de cada plataforma | Desde 28/04/2026, a App Store Connect exige Xcode 26+ com SDK do iOS 26 [DOC MP62] |

**Cadência de atualização** (pesa na manutenção):

- **React Native.** Seis releases por ano [DOC MP01]. O projeto mantém as três últimas minors [DOC MP09]. Em 22/10/2026, a página de releases marcava 0.86 e 0.87 como "Active" e 0.85 como "End of Cycle", e ainda não tinha atualizado a linha da 0.88 [DOC MP09].
- **Expo.** Datas de publicação no npm: SDK 55 em 25/02/2026, 56 em 20/05, 57 em 30/06 e 58 em 29/09. São quatro SDKs em 2026 [EXEC E1]. Cada SDK fixa uma versão do RN [DOC MP01]. O Expo Go das lojas roda um SDK por vez: o novo Expo Go "will support only SDK 58" [DOC MP02].
- **Flutter.** Versões x.0 estáveis em 12/11/2025, 11/02/2026, 18/05/2026 e 12/08/2026, ou seja, trimestral [EXEC E6]. O Dart estável sai "about every three months" [DOC MP32].
- **Kotlin.** Release de linguagem (2.x.0) a cada seis meses, com releases de tooling (2.x.20) no meio; a 2.5.0 está prevista para dezembro de 2026 [DOC MP49].
- **Apple.** Xcode 27.0 em 14/09/2026, seguido do 27.1 [DOC MP63].
- **Google Play.** Desde 31/08/2026, apps novos e atualizações precisam mirar o Android 16 (API 36), com extensão possível até 01/11/2026 [DOC MP86]. O Android 17 já tem página de plataforma, e o SDK 58 compila contra a API 37 [DOC MP79, MP01].

## 2. iOS partindo de Windows

### 2.1 O que cada alternativa permite sem Mac

| Atividade | RN + Expo | Flutter | KMP (UI nativa ou CMP) | Nativo |
| --- | --- | --- | --- | --- |
| Desenvolver e testar Android no Windows | Sim [HIP] | Sim [HIP] | Sim; o guia KMP cobre a configuração no Windows [DOC MP50] | Sim, para o app Android |
| Compilar para iOS | EAS Build na nuvem [DOC MP11]. Build local de iOS no Windows não é suportado; o WSL não é testado oficialmente [DOC MP16] | Exige Xcode no macOS [DOC MP33, MP34] | "To create iOS applications, you need a macOS machine with Xcode" [DOC MP50] | Xcode no macOS [DOC MP63] |
| Assinatura e provisioning | O EAS gerencia certificados e perfis com login Apple pelo CLI [DOC MP15] | No Xcode ou em CI macOS [DOC MP34; HIP] | Idem | Idem |
| Instalar no iPhone físico | Development build com perfil ad hoc. O UDID entra na lista via `eas device:create` (limite de 100 iPhones por ano; exige conta paga) [DOC MP14]. Precisa do Developer Mode no iOS 16+ [DOC MP15, MP68] | iPhone conectado por USB ao Mac [DOC MP33], ou TestFlight a partir de CI [HIP] | Idem | Idem |
| Enviar ao TestFlight/App Store | EAS Submit a partir do Windows [DOC MP11] | Por CI macOS (Codemagic, GitHub Actions, Bitrise, Xcode Cloud) [DOC MP47, MP89, MP91, MP65] | Idem | Idem |
| Depurar no iPhone | O JavaScript é servido pelo Metro rodando no Windows para o development build [HIP, validar no PoC]. Crash nativo, Instruments e Console exigem Mac [HIP]. O EAS Observe passou a registrar crashes nativos em 07/10/2026 [DOC MP103] | Depuração com o aparelho ligado ao Mac [DOC MP33] | Idem | Idem |

O Xcode Cloud é configurado a partir do Xcode [DOC MP65]. Mesmo nesse caso, é preciso ter um Mac ao menos para a configuração inicial [HIP].

### 2.2 Expo Go e seus limites

- O Expo Go é um "learning environment and sandbox" [DOC MP03]. A própria Expo recomenda migrar para um development build para construir e publicar o app [DOC MP02].
- Ele só roda os módulos que já traz:
  - `expo-widgets` não está no Expo Go [DOC MP17].
  - SQLCipher também não funciona no Expo Go. E pior: sem SQLCipher no binário, o `PRAGMA key` não dá erro, e o banco é gravado sem criptografia [DOC MP19].
  - Push remoto no Android saiu do Expo Go no SDK 53 [DOC MP20].
- O Expo Go roda um SDK por vez [DOC MP02]. Desde 03/09/2026 também exige login no CLI e no app [DOC MP04]. Até o Expo Go do SDK 58 chegar às lojas, o `create-expo-app` cria projetos SDK 57 [DOC MP02].
- **Conclusão.** O Expo Go serve para protótipo de tela. Timer em segundo plano, Live Activity, SQLCipher e push do AppMaternidade precisam de development build [HIP, a partir dos itens acima].

### 2.3 Mac na nuvem e CI: preços datados

Valores de 22/10/2026, em USD, sem impostos nem câmbio.

| Serviço | Preço ou limite exibido | Serve para | Fonte |
| --- | --- | --- | --- |
| EAS Build (Expo) | **Free:** até 15 builds Android + 15 iOS por mês, fila de baixa prioridade, timeout de 45 min, 1 concorrência macOS. **Starter:** US$ 19/mês com US$ 45 de crédito; build iOS custa US$ 2 (medium) ou US$ 4 (large). **Workflows:** macOS medium a US$ 0,075/min | Projetos React Native/Expo [HIP] | [DOC MP12] |
| GitHub Actions | **Por minuto:** macOS 3 ou 4 núcleos US$ 0,062; 12 núcleos US$ 0,077; M2 Pro de 5 núcleos US$ 0,102. **GitHub Free:** 2.000 min/mês em repositórios privados. **Repositórios públicos:** runners padrão gratuitos | Qualquer stack | [DOC MP89, MP90] |
| Codemagic | **Plano individual:** 500 min macOS M2 por mês grátis, 1 build paralela. **Pay-as-you-go:** Mac mini M2 a US$ 0,095/min e M4 a US$ 0,114/min. **Preço fixo:** a partir de US$ 3.990/ano | Qualquer stack | [DOC MP47] |
| Bitrise | **Hobby:** grátis, para 1 pessoa e poucos builds por mês. **Starter:** a partir de US$ 89/mês (anual) ou US$ 99/mês (mensal), recomendado até cerca de 100 builds/mês | Qualquer stack | [DOC MP91] |
| Xcode Cloud | 25 horas de computação por mês incluídas no Apple Developer Program; 100 h por US$ 49,99/mês | Projetos Xcode | [DOC MP65] |
| MacinCloud | A partir de US$ 25/mês (Mac remoto) | Uso interativo do Xcode | [DOC MP92] |
| Compra de Mac | Mac mini a partir de US$ 899 (loja dos EUA) | Xcode local e iPhone por USB | [DOC MP74] |

Em 22/10/2026, o repositório AppMaternidade era público, conforme a fotografia do pacote da task. Nessa condição, os runners macOS padrão do GitHub não custariam nada [DOC MP90]. Um repositório de produto pode virar privado, porém. Não conte com isso [HIP].

### 2.4 Assinatura, provisioning e TestFlight

- **Apple Developer Program.** Custa "99 USD per membership year"; o preço local pode variar [DOC MP67]. É necessário para o development build no aparelho, a distribuição ad hoc, o TestFlight e a loja [DOC MP14, MP15].
- **Distribuição ad hoc.** O perfil traz uma lista de UDIDs. Só os aparelhos presentes na lista no momento do build conseguem instalar; aparelho novo exige novo build [DOC MP14].
- **TestFlight.**
  - Até 100 testadores internos, que precisam ser membros da equipe na App Store Connect.
  - Até 10.000 testadores externos. O primeiro build para externos passa pela App Review.
  - Até 100 builds compartilhados [DOC MP66].
- **Developer Mode.** Vale para apps instalados pelo Xcode ou por `.ipa` de desenvolvimento. Não afeta TestFlight nem App Store [DOC MP68].

### 2.5 O que significa "testar iOS de verdade"

- **Aparelho físico.**
  - O BGTaskScheduler não existe no simulador [DOC MP22].
  - Patches do Shorebird não rodam em simulador [DOC MP45].
  - O Maestro não executa testes em iPhone físico [DOC MP97].
  - Logo, é E2E automatizado em simulador mais um roteiro manual no aparelho [HIP].
- **Build de release (TestFlight), não só debug** [HIP].
- **Live Activity.** Verificar a tela bloqueada e a Dynamic Island. O sistema encerra a Live Activity após 8 h, e ela continua na tela bloqueada por até 4 h depois de terminar [DOC MP57].
- **Notificações.** Com permissão negada e com autorização provisória [DOC MP72]; ver o cenário Q-10.
- **Acessibilidade.** VoiceOver e Dynamic Type no maior tamanho. A HIG pede permitir ampliar o texto em pelo menos 200% [DOC MP69].
- **Fechar o app e o aparelho.** Encerrar o app pelo seletor de apps, reiniciar o aparelho, entrar em modo avião e trocar o fuso, durante uma sessão (cenários Q-01, Q-08, Q-09) [HIP].
- **Versões do iOS.** A mínima suportada (iOS 16.4 no SDK 58) e a mais recente (iOS 27) [DOC MP01, MP02].

## 3. Persistência local e offline

Em todas as alternativas, o desenho previsto é SQLite local como fonte de verdade do aparelho mais uma fila de envio (outbox). O protocolo fica em [Dados, sincronização e backend](Dados_Sincronizacao_e_Backend.md). Esta seção compara bibliotecas, migrações, criptografia e exigências de build.

| Alternativa | Biblioteca (versão em 22/10/2026) | Migrações | Criptografia em repouso | Exige build nativo? |
| --- | --- | --- | --- | --- |
| RN + Expo | `expo-sqlite` ~58.0.13, oficial da Expo e incluída no Expo Go [EXEC E3; DOC MP19] | Manuais, via `PRAGMA user_version` (exemplo oficial) [DOC MP19]. ORM é opcional; o `drizzle-orm` está em 0.45.4, pré-1.0, e a integração não foi verificada [EXEC E4; HIP] | SQLCipher pelo config plugin `useSQLCipher`, para Android, iOS e macOS; não funciona no Expo Go nem na web. Conferir `PRAGMA cipher_version`, porque sem SQLCipher a chave é ignorada em silêncio [DOC MP19] | Com SQLCipher, sim: development build [DOC MP19] |
| RN (terceiros) | `@op-engineering/op-sqlite` 18.2.5; repositório ativo, último push em 29/09/2026 [EXEC E4, E5] | A cargo do app [HIP] | Não verificado nesta consulta | Sim, é módulo nativo [HIP] |
| RN (terceiros) | `@nozbe/watermelondb` 0.28.0; última versão no npm em 24/07/2025, com commits no repositório em 09/2026 [EXEC E4, E5] | Da própria biblioteca [HIP] | Não verificado nesta consulta | Sim, é módulo nativo [HIP]. A cadência lenta de releases é um risco [HIP] |
| Flutter | `drift` 2.35.2, `sqlite3` 3.7.1, `sqflite` 2.4.5 [EXEC E7] | O drift tem API de migração (não lida nesta consulta) [HIP] | Do drift 2.32 em diante, o pacote `sqlite3` empacota o SQLite3MultipleCiphers por build hooks (`source: sqlite3mc`), com `PRAGMA key`. Conferir `PRAGMA cipher` em runtime. O `sqlcipher_flutter_libs` está em fim de vida (0.7.0+eol) [DOC MP40, MP41; EXEC E7] | Todo app Flutter já é um build nativo; os plugins entram nele sem passo extra [HIP] |
| KMP (UI nativa ou CMP) | SQLDelight 2.4.1, com drivers android, native e jvm [EXEC E8; DOC MP55]. Room 3.0.3 estável (`androidx.room3`) ou 2.8.5, com `androidx.sqlite:sqlite-bundled` 2.7.1 no KMP [EXEC E8; DOC MP54] | Room: classes de migração, inclusive na transição para o SQLite Driver [DOC MP54]. SQLDelight: não lido nesta consulta [HIP] | Android: SQLCipher for Android 4.19.1 (Zetetic) [EXEC E8; DOC MP88]. iOS: a página do Room para KMP não trata de criptografia [DOC MP54], então ligar o SQLCipher ao driver nativo precisa ser validado [HIP] | Código Kotlin/Native, sem restrição extra [HIP] |
| Nativo | iOS: SwiftData (iOS 17+) [DOC MP70], Core Data, ou GRDB 7.11.1 (iOS 13+, Swift 6.1+, com migrações e SQLCipher documentados) [EXEC E5; DOC MP71]. Android: Room 2.8.5 ou 3.0.3 [EXEC E8] | GRDB: Migrations [DOC MP71]; Room [DOC MP54] | GRDB + SQLCipher [DOC MP71]; SQLCipher for Android [DOC MP88] | Não se aplica |

Observações:

- A escolha mobile não fecha a camada de sincronização. O PowerSync, uma das camadas candidatas no doc de dados, publica SDK para RN (`@powersync/react-native` 2.3.3) e para Flutter (`powersync` 2.5.0) [EXEC E4, E7]. Os dois finalistas mantêm essa porta aberta. A decisão fica no doc de dados.
- Persistência offline documentada para SDKs nativos não se transfere automaticamente a bibliotecas JavaScript rodando em RN. É o alerta do pacote (M11), tratado no doc de dados.
- Onde guardar a chave do banco (Keychain ou Keystore) e se o SQLCipher é exigência ou se basta a proteção de arquivos do sistema: decisão de privacidade, ainda aberta [HIP].

## 4. Temporizadores e atividade em andamento

### 4.1 Princípio comum

- **Modelo da sessão.** Uma sessão (tummy time, sono, mamada) é um registro persistido com início (instante observado), estado e fim. A duração sai dos timestamps. Nenhum contador roda em segundo plano. Isso atende o cenário Q-08 em qualquer alternativa [HIP].
- **Tarefas de segundo plano não servem de relógio.** No iOS, o BGTaskScheduler decide quando rodar e não existe no simulador [DOC MP22, MP60]. No Android, o WorkManager periódico tem intervalo mínimo de 15 min [DOC MP22, MP80]. Os dois servem para sincronização oportunista [HIP].
- **Foreground service não é necessário para mostrar um cronômetro** [HIP]. O tipo `specialUse` exige justificativa no Play Console, e apps com target Android 14+ declaram os tipos de serviço no Console [DOC MP81].
- **`BGContinuedProcessingTask` (iOS 26+) não serve para cronômetro.** É uma tarefa iniciada em primeiro plano que pode continuar em segundo plano, com progresso exibido numa Live Activity do sistema, e que pode ser terminada de forma abrupta [DOC MP61]. Foi feita para trabalho com progresso, como um upload, não para um cronômetro passivo [HIP].

### 4.2 Como exibir o cronômetro sem processo rodando

**iOS: Live Activity (ActivityKit)**

- Vive numa extensão de widget com WidgetKit e SwiftUI [DOC MP57].
- `Text(timerInterval:pauseTime:countsDown:showsHours:)` (iOS 16+) desenha um timer que conta sozinho [DOC MP59].
- **Limites.** Fica ativa por até 8 h; depois o sistema a encerra e a tira da Dynamic Island. Depois de terminar, fica na tela bloqueada por até 4 h [DOC MP57].
- **Atualização e início remotos.** Por push do ActivityKit via APNs (`apns-push-type: liveactivity`) [DOC MP58]. O push-to-start exige iOS 17.2+ [DOC MP17].
- **Consequência.** Um sono noturno pode passar de 8 h. A sessão continua no banco; a Live Activity é só um espelho, e o app precisa mostrar o estado real ao abrir [HIP].

**Android: notificação contínua com cronômetro**

- Notificação `ongoing` com `setUsesChronometer`, `setChronometerCountDown` e `setWhen` (AndroidX `NotificationCompat.Builder`) [DOC MP77].
- O Android 16 trouxe as notificações centradas em progresso (`Notification.ProgressStyle`) [DOC MP78].
- **Live Updates.** São promovidas à tela bloqueada, ao topo da gaveta e a um chip na barra de status [DOC MP76]. Os requisitos são:
  - estilo padrão, BigText, Call, Progress ou Metric;
  - permissão `POST_PROMOTED_NOTIFICATIONS`;
  - `setRequestPromotedOngoing`;
  - `ongoing` e título;
  - nenhuma RemoteViews customizada;
  - canal com importância acima de MIN.
- O chip pode mostrar o cronômetro com `setUsesChronometer` [DOC MP76].
- **Critério de uso das Live Updates.** A atividade precisa estar em andamento, ter sido iniciada pelo usuário e ser sensível ao tempo. A regra diz "Don't allow activities triggered by other parties to generate Live Updates" [DOC MP76].
- **Consequência de desenho.** No aparelho do cuidador B, uma sessão iniciada por A deve aparecer como notificação comum, não como Live Update [HIP].
- **Sem permissão de notificação.** No Android 13+, sem `POST_NOTIFICATIONS`, nenhuma dessas notificações aparece, nem as de foreground service [DOC MP82]. A sessão continua visível dentro do app (cenário Q-10) [HIP].

Widgets da tela inicial complementam, mas não substituem, a Live Activity ou a notificação [HIP].

### 4.3 Como cada alternativa chega lá

| Alternativa | Live Activity no iOS | Notificação com cronômetro / Live Update no Android | Código nativo exigido |
| --- | --- | --- | --- |
| RN + Expo | **`expo-widgets` ~58.0.22**, oficial, presente nos módulos do SDK desde o 56 [EXEC E3]. Cria Live Activities e widgets com componentes Expo UI, "without writing native code". Não roda no Expo Go. Tem tokens de push e push-to-start [DOC MP17]. O `Text` do Expo UI tem `timerInterval` e `dateStyle="timer"`, "especially useful in widgets and Live Activities" [DOC MP18]. **Limite:** o widget roda num runtime isolado, sem hooks, sem estado do app e sem trabalho assíncrono [DOC MP17]. **Terceiros:** `expo-live-activity` (Software Mansion Labs) está arquivado [EXEC E5]; `@bacons/apple-targets` 5.0.0 serve para targets nativos escritos em Swift [EXEC E4; HIP sobre a função] | `expo-notifications` tem `sticky` (ongoing), mas não documenta cronômetro [DOC MP20]. O `expo-widgets` faz notificações customizadas com RemoteViews e opção `ongoing` [DOC MP17], que não se qualificam como Live Update [DOC MP76]. O Notifee, que tinha cronômetro, está arquivado; a última versão (9.1.8) é de 12/2024 [EXEC E4, E5]. **Caminho:** módulo próprio em Kotlin pela Expo Modules API [DOC MP23; HIP] | Kotlin pequeno no Android. Swift nenhum, se o `expo-widgets` atender [HIP; validar no PoC] |
| Flutter | **`live_activities` 2.6.0** (11/09/2026), iOS 16.1+. Exige criar a Widget Extension no Xcode e desenhar a Live Activity em Swift ("not currently possible to only use Flutter"). Suporta atualização por push [EXEC E7; DOC MP42] | `flutter_local_notifications` 22.3.2 tem `usesChronometer`, `chronometerCountDown`, `when` e `ongoing` [EXEC E7; DOC MP44]. A promoção a Live Update não aparece na API consultada; seria um canal de plataforma em Kotlin [HIP] | Swift na extensão, mais Kotlin pontual. Mac obrigatório para a extensão [DOC MP42] |
| KMP + UI nativa | ActivityKit e WidgetKit em Swift, na camada iOS [DOC MP57]. O Kotlin/Native expõe código ao Swift por cabeçalhos Objective-C; o Swift export está em Alpha [DOC MP51]. Portanto, uma cola em Swift [HIP] | `NotificationCompat` direto em Kotlin [DOC MP77] | Swift e Kotlin |
| KMP + CMP | Igual: a interface da Live Activity é SwiftUI, não Compose [DOC MP57; HIP] | Igual | Swift (extensão) e Kotlin |
| Nativo | APIs diretas em Swift | APIs diretas em Kotlin | Os dois |

### 4.4 Atividade iniciada por outro cuidador

Mostrar fora do app, no aparelho de A, uma sessão que B iniciou exige o servidor enviando push. No iOS, isso usa push-to-start e tokens de atualização [DOC MP58, MP17]. No Android, deve ser uma notificação comum, pelo critério das Live Updates [DOC MP76]. A questão é igual em todas as alternativas e entra no desenho de push do backend [HIP].

## 5. Notificações

Lembrete local, push remoto e sincronização são mecanismos diferentes, e nenhum substitui o outro.

| Alternativa | Locais | Push remoto | Limites e observações |
| --- | --- | --- | --- |
| RN + Expo | `expo-notifications` ~58.1.6: agendamento, canais Android, badge [EXEC E3; DOC MP20] | Token nativo (FCM/APNs), ou token Expo pelo Expo Push Service, que repassa a FCM/APNs [DOC MP20, MP21]. Também dá para enviar direto a FCM/APNs [DOC MP21] | **Expo Push:** 600 notificações/s por projeto, e é obrigatório consultar os recibos [DOC MP21]. Push no Android exige development build desde o SDK 53 [DOC MP20] |
| Flutter | `flutter_local_notifications` 22.3.2 [EXEC E7] | `firebase_messaging` 17.0.0 (FCM) [EXEC E7], ou APNs direto por outro plugin [HIP] | O iOS só mantém as 64 notificações pendentes agendadas por último; o Android limita a 500 alarmes [DOC MP43]. Usar FCM para push não implica usar Firebase como banco [HIP] |
| KMP | APIs de plataforma de cada lado (UNUserNotificationCenter; NotificationManager) [HIP] | FCM/APNs de cada lado [HIP] | Nenhuma biblioteca oficial multiplataforma de notificação foi identificada nesta consulta |
| Nativo | APIs de plataforma | FCM/APNs | Não se aplica |

**Permissões e regras:**

- **Android 13+.** `POST_NOTIFICATIONS` é permissão em tempo de execução para notificações não isentas, inclusive as de foreground service [DOC MP82].
- **Alarmes exatos.**
  - O `SCHEDULE_EXACT_ALARM` não vem pré-concedido em instalações novas de apps com target 13+ [DOC MP83]. A partir do Android 14, fica negado por padrão para apps recém-instalados [DOC MP20].
  - O `USE_EXACT_ALARM` é concedido sem pedido, mas está sujeito à política do Play [DOC MP83], que o reserva a apps de despertador, timer e calendário [DOC MP20].
  - Lembretes de rotina toleram horário aproximado. Melhor não depender de alarme exato [HIP].
- **iOS.** Pedir a permissão em contexto. A autorização provisória entrega em silêncio, para o usuário avaliar [DOC MP72].
- **Privacidade.** O payload de push não deve levar dado da criança. Ele passa por FCM/APNs e, no Expo Push, também pela Expo [DOC MP21; HIP]. Tratar no [doc de privacidade e lojas](../Pesquisa_Privacidade_Legal_e_Lojas.md).

## 6. Acessibilidade

| Alternativa | O que a documentação oficial garante | O que validar |
| --- | --- | --- |
| RN + Expo | APIs que se integram ao VoiceOver e ao TalkBack [DOC MP27]. `allowFontScaling` faz o texto respeitar o tamanho de fonte do sistema, e `maxFontSizeMultiplier` limita a escala [DOC MP28]. `AccessibilityInfo` detecta leitor de tela ativo [DOC MP27] | Layout com fonte máxima nas telas de registro rápido; ordem de foco [HIP] |
| Flutter | O tamanho da fonte é calculado automaticamente a partir do sistema; o layout precisa caber com a fonte máxima [DOC MP36]. Checklist oficial: TalkBack/VoiceOver, contraste de 4,5:1, alvos de 48×48, escalas grandes [DOC MP35]. A versão 3.47 detecta alto contraste e inversão de cores no Android [DOC MP31] | Semântica de widgets customizados (timer, gráficos de histórico) [HIP] |
| KMP + UI nativa / Nativo | **iOS (HIG):** controle padrão de 44×44 pt (mínimo 28×28 pt), texto ampliável em pelo menos 200% via Dynamic Type, contraste de 4,5:1 [DOC MP69]. **Compose:** semântica, conteúdo escalável e alvo mínimo de 48 dp [DOC MP84, MP85] | É a referência de cada plataforma |
| KMP + CMP | **iOS:** a semântica do Compose é mapeada para o VoiceOver [DOC MP52]. O alto contraste exige paleta manual, porque o Material3 não tem suporte pronto [DOC MP52]. `testTag` vira `accessibilityIdentifier` e permite auditoria via XCTest [DOC MP52]. A página consultada, de 22/07/2025, não menciona Dynamic Type | Dynamic Type e fonte máxima no iOS (lacuna; não comprova ausência) [HIP] |

Modo escuro e "contraste noturno" são viáveis em todas. Na prática, é um tema escuro de baixa luminância que ainda respeita o contraste mínimo. Validar com o Accessibility Inspector (iOS) e o Accessibility Scanner (Android) [HIP].

## 7. Testes

### 7.1 Camadas

| Camada | RN + Expo | Flutter | KMP | Nativo |
| --- | --- | --- | --- | --- |
| Unidade | Jest. O preset saiu para um pacote próprio no RN 0.85 [DOC MP06]. Roda no Windows [HIP] | `flutter_test` [DOC MP37]. Roda no Windows [HIP] | `commonTest` na JVM (Windows); alvo iOS só no Mac [HIP] | JUnit (Windows); XCTest (Mac) [HIP] |
| Integração e E2E em aparelho | **Maestro** (YAML, aberto e gratuito) [DOC MP96]. **Detox** 20.51.4 [EXEC E4]: no iOS, só simulador, e o `applesimutils` só roda no macOS; no Android, emulador ou aparelho conectado [DOC MP99, MP100]. **Appium** 3.8.0: o driver XCUITest exige host macOS, com suporte limitado em Windows e Linux [EXEC E4; DOC MP101] | `integration_test` em aparelho ou emulador, e no Firebase Test Lab [DOC MP37]. Patrol 4.10.0 para interações nativas [EXEC E7; HIP sobre o escopo] | Espresso/Compose UI test, XCUITest, Maestro [HIP] | Os mesmos |

O Maestro independe de framework ("Swift, Objective-C, Flutter, React Native, or SwiftUI") [DOC MP98]. O CLI instala em Windows, macOS e Linux [DOC MP102]. No iOS, roda em simulador gerenciado pelo Xcode. Em aparelho físico, "Executing tests on physical iOS devices is not supported yet" [DOC MP98, MP97].

### 7.2 O que roda em Windows

- **Android: tudo.** Emulador, aparelho USB, Maestro, Detox Android, Espresso e `integration_test` [DOC MP102; HIP].
- **iOS: nada local.** Na nuvem, há estas opções:
  - **EAS Workflows** com Maestro em simulador iOS: macOS medium a US$ 0,075/min; o Free inclui 60 min/mês de Workflows [DOC MP29, MP12].
  - **Maestro Cloud:** US$ 250 por dispositivo/mês, com aparelhos Android, iOS e web hospedados [DOC MP96].
  - **Firebase Test Lab para iOS:** XCTest em aparelho físico, até 45 min por teste [DOC MP94]. O pacote de teste é gerado com Xcode [HIP].
  - **AWS Device Farm** (preço na tabela abaixo).

### 7.3 Farms de aparelhos: preços datados

| Serviço | Preço ou limite | Fonte |
| --- | --- | --- |
| Firebase Test Lab | **Spark:** 10 execuções/dia em aparelhos virtuais e 5 em físicos. **Blaze:** 30 min/dia em físicos e 60 min/dia em virtuais sem custo; depois, US$ 5/h por aparelho físico e US$ 1/h por virtual, cobrado por minuto | [DOC MP93] |
| AWS Device Farm | US$ 0,17 por minuto-aparelho. Teste único de 1.000 min grátis (oferta temporária; o padrão é 250). Plano ilimitado a partir de US$ 250 por slot/mês | [DOC MP95] |
| Maestro Cloud | US$ 250 por dispositivo/mês | [DOC MP96] |
| BrowserStack e Sauce Labs | Não consultados nesta etapa | Não se aplica |

## 8. Atualizações OTA, distribuição e desempenho

- **EAS Update (RN + Expo).**
  - Atualiza JS, estilos e imagens. Mudar código nativo, permissões ou o SDK exige novo binário [DOC MP24].
  - Free: 1.000 MAU. Starter: 3.000 MAU incluídos, depois US$ 0,005 por MAU (faixa de 3.001 a 200.000) [DOC MP12].
- **Shorebird (Flutter).**
  - Faz code push de Dart. No iOS, usa um interpretador próprio para aparelhos arm64 físicos (não roda em simulador) e não altera código nativo [DOC MP45].
  - Free: 5.000 instalações de patch por mês. Pro: 50.000. Business: 1.000.000. Excedente: US$ 1 por 2.500 instalações [DOC MP46]. O preço mensal dos planos pagos não apareceu no texto extraído.
- **KMP e nativo.** Não há OTA de código, só configuração remota e feature flags [HIP].
- **Políticas das lojas.**
  - **Apple (DPLA 3.3.1(B)).** Código interpretado pode ser baixado desde que não mude o propósito principal do app, não contorne assinatura e sandbox, e não crie uma loja [DOC MP73].
  - **Google Play.** Proíbe baixar código executável fora do Play, com exceção para código "in a virtual machine or an interpreter" [DOC MP87].
  - **Consequência:** correções de lógica JS ou Dart podem ir por OTA. Live Activity, widget e o módulo de notificação, que são nativos, não podem [DOC MP24, MP45; HIP].
- **Requisitos de loja (todas as alternativas).** Xcode 26+ [DOC MP62]; target API 36 [DOC MP86].
- **Tamanho e desempenho.** Nada foi medido nesta etapa, e não se achou fonte oficial que compare frameworks.
  - O Flutter alerta que build debug não representa o tamanho final e ensina a medir o release [DOC MP39].
  - O RN 0.84 tornou o Hermes V1 e os binários iOS pré-compilados o padrão [DOC MP06].
  - O CMP 1.12 melhorou a rolagem no iOS [DOC MP53].
  - A decisão precisa de medida própria em aparelho Android modesto, no PoC [HIP].

## 9. Web: três papéis possíveis

| Papel | RN + Expo | Flutter | KMP / CMP | Nativo |
| --- | --- | --- | --- | --- |
| Site público (SEO, texto) | Expo Router com renderização estática para SEO [DOC MP26]. Também pode ser um site separado | O Flutter web "is not suitable for static websites with text-rich flow-based content"; a recomendação oficial é Jaspr ou HTML [DOC MP38]. Logo, site separado | Compose web em Beta (Wasm) [DOC MP48]. Na prática, site separado [HIP] | Site separado |
| Painel de moderação | Componentes React DOM web-only no projeto Expo [DOC MP25], ou um app React à parte. Compartilha tipos TypeScript [HIP] | Viável como SPA ou PWA [DOC MP38] | Kotlin/JS estável; CMP web em Beta [DOC MP48] | Separado |
| App web para cuidadores | React Native for web, a mesma base de componentes [DOC MP25]. O `expo-sqlite` lista suporte web, mas o SQLCipher só cobre Android, iOS e macOS [DOC MP19] | Viável como SPA ou PWA [DOC MP38] | Beta [DOC MP48] | Separado |

**Leitura [HIP].** A web não deveria decidir a stack mobile.
- **Site público:** tende a ser um site estático à parte, seja qual for a stack.
- **Painel de moderação:** depende mais do backend escolhido (por exemplo, o admin do framework) do que do app; ver o doc de dados e backend.
- **App web para cuidadores:** decisão de produto aberta (ADR-001). Se entrar no MVP, conta a favor de RN + Expo.

## 10. Esforço e manutenção para equipe pequena em Windows

| Aspecto | RN + Expo | Flutter | KMP + UI nativa | KMP + CMP | Nativo |
| --- | --- | --- | --- | --- | --- |
| Linguagens | TypeScript; Kotlin pontual (módulo de notificação); Swift opcional | Dart; Swift na extensão da Live Activity; Kotlin pontual | Kotlin + Swift/SwiftUI | Kotlin; Swift na extensão e na integração | Swift + Kotlin |
| Bases de UI | 1 | 1 | 2 | 1 | 2 |
| Bases de lógica (domínio, outbox, sync) | 1 | 1 | 1 | 1 | 2 |
| Ferramentas | Node e EAS; Android Studio para o Android | Flutter SDK e Android Studio; Xcode num Mac | Gradle/Android Studio + Xcode num Mac | Idem | Idem |
| Cadência de quebras | RN com 6 releases/ano e Expo com 4 SDKs em 2026 [DOC MP01; EXEC E1]; o Expo Go segue só o SDK atual [DOC MP02] | Trimestral [EXEC E6], com migrações como a separação do Material na 3.47 [DOC MP31] | Kotlin a cada 6 meses e Xcode todo ano [DOC MP49, MP63] | O mesmo, mais as versões do CMP (1.12.2 em 15/10/2026) [EXEC E5] | Xcode todo ano; Android Gradle Plugin e Compose |
| Riscos de ecossistema já observados | Bibliotecas de terceiros arquivadas (Notifee, `expo-live-activity`) [EXEC E5]. Preferir pacotes oficiais da Expo reduz o risco [HIP] | Plugins da comunidade com um único publicador (ex.: `live_activities`) [DOC MP42]. Fim de vida do `sqlcipher_flutter_libs`, com migração para hooks [DOC MP40, MP41] | Bibliotecas de plataforma maduras; Swift export em Alpha [DOC MP51] | Ecossistema específico de iOS menor [HIP] | Maduro |
| Contratação (sem números) | Base grande de JS/TS/React [HIP] | Perfil Dart, mais específico [HIP] | Exige iOS e Kotlin [HIP] | Kotlin com noções de iOS [HIP] | Dois perfis [HIP] |
| Custo de aprendizagem declarado | A experiência de Daniel com React reduz o custo, como critério declarado e não como justificativa [HIP] | Dart é novo | Java ajuda no Kotlin; Swift é novo [HIP] | Java ajuda no Kotlin [HIP] | Swift é novo |

## 11. Tabela comparativa

Não há pontuação somada. Cada célula diz forte, adequado ou fraco, com o motivo. As linhas seguem as prioridades sugeridas no pacote.

| Critério (prioridade do pacote) | RN + Expo | Flutter | KMP + UI nativa | KMP + CMP | Nativo |
| --- | --- | --- | --- | --- | --- |
| 1. Integridade offline e persistência | **Adequado:** `expo-sqlite` oficial com SQLCipher; ORM pré-1.0 | **Forte:** drift maduro e criptografia por hooks | **Forte:** Room/SQLDelight | **Forte:** igual | **Forte:** GRDB/Room |
| 2. Autorização e separação entre famílias | **Neutro:** decidido no servidor | **Neutro** | **Neutro** | **Neutro** | **Neutro** |
| 3. Registro rápido e atividade em andamento | **Forte no iOS:** Live Activity sem Swift. **Adequado no Android:** módulo Kotlin | **Adequado:** extensão em Swift; cronômetro Android pronto | **Forte:** APIs diretas | **Adequado:** extensão em SwiftUI | **Forte** |
| 4. iOS a partir de Windows | **Forte:** EAS Build/Submit e development build | **Fraco:** compila só no macOS; sem Mac, por CI macOS e TestFlight (seção 2.1) | **Fraco** | **Fraco** | **Fraco** |
| 5. Esforço e manutenção | **Adequado:** 1 base, mas ritmo alto de upgrades | **Adequado:** 1 base, mas exige Dart e Mac ou CI macOS | **Fraco:** 2 UIs | **Adequado:** 1 UI, mas exige Mac ou CI macOS e tem lacunas no iOS | **Fraco:** 2 apps completos |
| 6. Operação e custo do cliente | **Forte:** EAS de US$ 0 a 19/mês [DOC MP12] | **Adequado:** Mac ou CI [DOC MP47, MP74] | **Adequado** | **Adequado** | **Adequado** |
| 7. Saída de fornecedor (cliente) | **Adequado:** EAS é opcional, mas sem ele o iOS volta a precisar de Mac/CI [DOC MP16; HIP] | **Forte:** Shorebird é opcional | **Forte** | **Forte** | **Forte** |
| 8. Papel da web | **Forte:** site estático e painel React possíveis | **Adequado:** só apps (SPA/PWA) | **Neutro:** web separada | **Fraco:** Beta | **Neutro:** web separada |
| Acessibilidade (requisito fixo) | **Forte:** componentes nativos [HIP] | **Adequado:** semântica própria, a validar | **Forte** | **Fraco/adequado:** lacunas documentadas no iOS | **Forte** |

**Como a ordem muda com outras prioridades** [HIP; julgamento do Hermes]:

- **Prioridade do pacote, equipe só com Windows, sem Mac.** RN + Expo > Flutter > KMP + UI nativa > KMP + CMP > Nativo.
- **Com Mac disponível, priorizando consistência visual e UI própria.** Flutter empata com RN + Expo. O desempate vem do PoC (seção 14): Live Activity, acessibilidade com fonte de 200% e desempenho em Android modesto.
- **Se a experiência nativa virar o centro e houver alguém com Swift.** Isso inclui Live Activities, widgets, relógio e acessibilidade máxima. Aí KMP + UI nativa passa à frente. Nativo puro só entra se a lógica de sincronização ficar quase toda no servidor.
- **Se a equipe consolidar Kotlin (por exemplo, backend em Kotlin/Java) e aceitar um Mac.** KMP + CMP entra na disputa com Flutter, condicionado a passar no teste de Dynamic Type e VoiceOver.
- **Se o MVP exigir app web para cuidadores na mesma base.** RN + Expo se reforça, Flutter se mantém e CMP perde.

## 12. Shortlist justificada

**1. React Native + Expo: recomendação provisória do Hermes.**

Por que, pelo produto e pela manutenção:
- É a única opção em que o ciclo iOS inteiro (build, assinatura, instalação de development build no iPhone e TestFlight) roda a partir de Windows num fluxo integrado e documentado [DOC MP11, MP14, MP15]. As outras chegam ao TestFlight por CI macOS (seção 2.1), com o pipeline montado à parte. Precisão do coordenador depois da revisão independente de 22/10/2026.
- Leva a atividade em andamento ao iOS com um pacote oficial, sem Swift [DOC MP17, MP18].
- Tem persistência com criptografia num módulo oficial [DOC MP19].
- Tem uma base de UI e uma de lógica.
- Cobre a web pública, se for preciso [DOC MP26].
- Tem OTA para correções de JS [DOC MP24].

Riscos e mitigação:
- Ritmo de upgrades: 4 SDKs Expo em 2026, e o RN só mantém as 3 últimas minors [EXEC E1; DOC MP09]. Mitigação: calendário fixo de upgrade.
- Bibliotecas de terceiros abandonadas [EXEC E5]. Mitigação: preferir pacotes oficiais Expo e Expo Modules próprios.
- `expo-widgets` é recente (desde o SDK 56) [EXEC E3]. Validar no PoC antes de assumir.
- Depuração nativa sem Mac é limitada [HIP]. Prever Mac alugado para incidentes.

A escolha não implica backend em TypeScript. O cliente fala com qualquer API ou camada de sincronização escolhida no doc de dados.

**2. Flutter: alternativa principal.**

Por que:
- UI consistente numa base.
- Persistência madura (drift) com criptografia sem plugin descontinuado [DOC MP40].
- Cronômetro do Android pronto no plugin de notificações [DOC MP44].
- Cadência trimestral previsível [EXEC E6].
- Code push via Shorebird [DOC MP45].

O que exige:
- macOS para build e assinatura: Mac próprio, Mac remoto ou CI macOS (seção 13). Depuração completa no iPhone e edição da extensão da Live Activity no Xcode pedem Mac próprio ou remoto [DOC MP33, MP34, MP42].
- Swift para a Live Activity [DOC MP42].
- Aprender Dart.

A escolha não implica Firebase. O `firebase_messaging` é só uma opção de transporte de push.

**Condicional: KMP + UI nativa.** Entra se a equipe tiver ou contratar competência em iOS, ou se recursos de plataforma virarem o diferencial do produto. Compartilha domínio e sincronização em Kotlin, com suporte oficial do Google [DOC MP56], mas custa duas UIs e um Mac [DOC MP50].

**Fora da shortlist agora:**

- **KMP + CMP.** Uma UI só, mas compila o iOS só no macOS, em Mac próprio ou CI [DOC MP50]. A Live Activity continua em SwiftUI [DOC MP57]. A acessibilidade no iOS tem lacunas documentadas (alto contraste manual) e Dynamic Type não aparece na documentação consultada [DOC MP52]. A web está em Beta [DOC MP48]. Volta a ser candidata se a equipe for Kotlin-first e um PoC passar em VoiceOver e fonte máxima no iOS.
- **Nativo Swift + Kotlin.** Tem a maior fidelidade, mas são dois apps, duas implementações do outbox e da sincronização e duas linguagens de UI, além do Mac. Para uma equipe pequena, a duplicação da lógica offline é o maior risco [HIP]. Volta a ser candidato se houver duas pessoas especializadas, uma por plataforma.

## 13. Windows + iOS: plano mínimo realista

Preços consultados em 22/10/2026, em USD, sem impostos. Lojas e sites dos EUA; o preço no Brasil não foi consultado.

### Cenário A: RN + Expo, sem Mac

Fluxo:
1. Desenvolver no Windows, com emulador ou aparelho Android.
2. Registrar o iPhone (`eas device:create`, que gera o UDID no perfil ad hoc) e ativar o Developer Mode [DOC MP14, MP15].
3. Gerar o development build no EAS e instalar no iPhone. Mudanças só de JS chegam pelo Metro, sem novo build. Mudanças nativas exigem novo build [DOC MP13; HIP].
4. Para release, rodar `eas build` e `eas submit` até o TestFlight [DOC MP11].
5. Rodar E2E de iOS em simulador no EAS Workflows, se necessário [DOC MP29].

| Item | Custo datado | Observação |
| --- | --- | --- |
| Apple Developer Program | US$ 99/ano [DOC MP67] | Obrigatório |
| iPhone físico, se a equipe não tiver | iPhone 17e a partir de US$ 699 [DOC MP75] | O SDK 58 suporta iOS 16.4+ [DOC MP01]. Um aparelho antigo compatível já serve [HIP] |
| EAS Build | Free: US$ 0 (15 builds iOS/mês, fila baixa, timeout de 45 min). Starter: US$ 19/mês (US$ 45 de crédito; iOS a US$ 2 ou 4 por build) [DOC MP12] | O Starter dá prioridade na fila e builds de até 2 h [DOC MP12] |
| EAS Submit e TestFlight | Incluídos [DOC MP12, MP66] | Até 100 testadores internos e 10.000 externos [DOC MP66] |
| EAS Update | Free até 1.000 MAU [DOC MP12] | Opcional |
| E2E iOS na nuvem (opcional) | macOS medium a US$ 0,075/min; o Free inclui 60 min/mês [DOC MP12] | Simulador, não aparelho [DOC MP29] |
| Mac sob demanda para diagnóstico (opcional) | MacinCloud a partir de US$ 25/mês [DOC MP92], ou GitHub Actions macOS a US$ 0,062/min [DOC MP89] | Para incidentes nativos |

**Total mínimo:** US$ 99/ano + US$ 0/mês, mais o iPhone, se faltar.

**Exemplo realista [HIP]:** 30 builds iOS por mês num worker medium. São 30 × US$ 2 = US$ 60 de uso. O Starter cobre US$ 45; sobram US$ 15. Total: US$ 34/mês, mais o programa da Apple.

### Cenário B: Flutter, KMP ou nativo

| Opção | Custo datado | Limite |
| --- | --- | --- |
| B1. Comprar um Mac mini | A partir de US$ 899 [DOC MP74], mais US$ 99/ano da Apple [DOC MP67] | É a única opção com depuração completa e iPhone por USB [DOC MP33] |
| B2. Mac remoto | MacinCloud a partir de US$ 25/mês [DOC MP92] | Xcode por acesso remoto. Ligar o iPhone local ao Mac remoto para depurar não foi verificado [HIP] |
| B3. Só CI e TestFlight | **Codemagic:** 500 min M2 grátis/mês no plano individual, depois US$ 0,095/min [DOC MP47]. **GitHub Actions:** US$ 0,062/min (grátis em repositório público) [DOC MP89, MP90]. **Xcode Cloud:** 25 h/mês incluídas [DOC MP65]. **Bitrise Starter:** a partir de US$ 89/mês [DOC MP91] | Teste no iPhone só via TestFlight, sem depurador. A extensão da Live Activity ainda exige Xcode para criar e editar [DOC MP42] |

**Total mínimo realista:**

- **Só CI e TestFlight (B3):** US$ 99/ano mais CI (US$ 0 dentro das cotas), sem depurador no iPhone.
- **Com a Live Activity, requisito deste app:** a extensão exige Xcode para criar e editar [DOC MP42]. Na prática, soma-se um Mac (US$ 899 uma vez) ou um Mac remoto (a partir de US$ 25/mês), ao menos para essa parte.

**Exemplo [HIP]:** 30 builds iOS de 20 min cada somam 600 min por mês. No Codemagic individual, isso dá 100 min × US$ 0,095 = US$ 9,50. No GitHub Actions privado, sem contar a cota grátis, 600 × US$ 0,062 = US$ 37,20. A forma como a cota do GitHub Free consome minutos de macOS não foi confirmada.

## 14. Prova de conceito sugerida para o desempate

Não executada. Seria uma fatia pequena, construída nos dois finalistas, com evidência classificada como [EXEC]:

1. **Timer de tummy time (Q-08).** Iniciar, encerrar o app, reiniciar o aparelho e reabrir. A duração precisa sair dos timestamps persistidos.
2. **Live Activity no iPhone.** Com o timer rodando: com `expo-widgets`, construída a partir do Windows pelo EAS; com `live_activities`, a extensão é criada no Xcode e escrita em Swift, o que exige Mac, mesmo que o build vá para CI macOS. Medir o esforço real e o encerramento em 8 h.
3. **Android 16+.** Notificação `ongoing` com cronômetro e promoção a Live Update. Repetir com a permissão de notificação negada (Q-10).
4. **SQLite com criptografia.** Migração da v1 para a v2, mais a checagem de `PRAGMA cipher_version` ou `cipher` no build de release.
5. **Acessibilidade.** VoiceOver e TalkBack com fonte máxima nas telas Hoje e Timer.
6. **Medidas.** Tempo de build iOS na nuvem, tamanho do release, cold start e rolagem do histórico num Android modesto.

## Execuções registradas [EXEC]

Ambiente: Windows 11, Node 24.20.0, npm 11.19.0, `curl` no Git Bash e Python 3.14 só para ler o JSON. Data: 22/10/2026, entre cerca de 03h00 e 03h45 (America/Sao_Paulo). Foram só leituras de registros públicos; nada foi instalado.

| ID | Comando (resumo) | Resultado relevante |
| --- | --- | --- |
| E1 | `npm view expo version dist-tags --json`; `npm view expo time --json` | latest 58.0.17 (21/10/2026). Tags: sdk-57 57.0.31, sdk-56 56.0.24, sdk-55 55.0.32. Primeira publicação: 55.0.0 em 25/02/2026, 56.0.0 em 20/05/2026, 57.0.0 em 30/06/2026, 58.0.0 em 29/09/2026 |
| E2 | `npm view react-native version dist-tags time --json` | latest 0.88.0 (15/10/2026); `next` 0.88.0-rc.6. Datas: 0.87.0 em 11/08/2026, 0.86.0 em 09/06/2026, 0.85.0 em 07/04/2026, 0.84.0 em 11/02/2026, 0.83.0 em 10/12/2025, 0.82.0 em 08/10/2025 |
| E3 | `curl https://unpkg.com/expo@<versão>/bundledNativeModules.json` (55.0.32, 56.0.24, 57.0.31, 58.0.0, 58.0.17) | **SDK 58.0.17:** react-native 0.88.0, react 19.3.0, react-native-web ~0.21.4, expo-sqlite ~58.0.13, expo-notifications ~58.1.6, expo-background-task ~58.0.11, expo-widgets ~58.0.22, @expo/ui ~58.0.22, expo-updates ~58.0.18, expo-dev-client ~58.0.14, expo-router ~58.0.25. **Por SDK:** 55 usa RN 0.83.10, 56 usa 0.85.3, 57 usa 0.86.3. O `expo-widgets` aparece a partir do 56 e não está no 55.0.32 |
| E4 | `npm view <pacote> version time.modified` | **SQLite e dados:** @op-engineering/op-sqlite 18.2.5 (20/09/2026); @nozbe/watermelondb 0.28.0 (24/07/2025); drizzle-orm 0.45.4; @powersync/react-native 2.3.3 (20/10/2026). **Widgets e notificações:** @notifee/react-native 9.1.8 (20/12/2024); expo-live-activity 0.4.2 (01/06/2026); @bacons/apple-targets 5.0.0 (17/07/2026); react-native-widget-extension 0.3.0 (25/05/2026). **Ferramentas:** eas-cli 25.3.0; detox 20.51.4; appium 3.8.0. **Outros:** react-native-mmkv 4.3.2 |
| E5 | `curl https://api.github.com/repos/<repo>[/releases/latest]` | **Arquivados:** invertase/notifee (archived=true) e software-mansion-labs/expo-live-activity (archived=true). **Ativos (último push):** Nozbe/WatermelonDB em 16/09/2026; op-engineering/op-sqlite em 29/09/2026; istornz/flutter_live_activities em 11/09/2026. **Releases:** Kotlin v2.4.21 (08/10/2026), compose-multiplatform v1.12.2 (15/10/2026), GRDB.swift v7.11.1 (18/06/2026), Maestro cli-2.11.0 (29/09/2026), Shorebird v1.6.130 (18/10/2026), swiftlang/swift swift-6.4.1-RELEASE (15/10/2026) |
| E6 | `curl https://storage.googleapis.com/flutter_infra_release/releases/releases_windows.json` | **stable:** 3.47.7, com Dart 3.13.5, em 08/10/2026. **beta:** 3.50.0-0.1.pre. **Versões x.0:** 3.38.0 (12/11/2025), 3.41.0 (11/02/2026), 3.44.0 (18/05/2026), 3.47.0 (12/08/2026) |
| E7 | `curl https://pub.dev/api/packages/<pacote>` | **Dados:** drift 2.35.2, sqflite 2.4.5, sqlite3 3.7.1, sqlcipher_flutter_libs 0.7.0+eol, powersync 2.5.0, drift_flutter 0.3.1. **Notificações e widgets:** flutter_local_notifications 22.3.2, live_activities 2.6.0, home_widget 0.10.0, firebase_messaging 17.0.0. **Testes e background:** patrol 4.10.0, workmanager 0.10.10 |
| E8 | `curl` de `maven-metadata.xml` no Maven Central e no Google Maven | **Kotlin e Compose Multiplatform:** kotlin-stdlib 2.4.21 (pré: 2.5.0-Beta2); compose-gradle-plugin e compose runtime 1.12.2 (pré: 1.13.0-alpha02). **Bancos:** sqldelight runtime 2.4.1; sqlcipher-android 4.19.1; room-runtime 2.8.5; androidx.room3 3.0.3 (pré: 3.1.0-alpha03); sqlite-bundled 2.7.1. **Android:** compose-bom 2026.09.00; work-runtime 2.12.0 |

## Fontes

Gerada a partir do registro de fontes desta pesquisa; só entram as fontes citadas no texto. Todas foram consultadas em 22/10/2026.

| Código | Fonte | URL | Consulta |
| --- | --- | --- | --- |
| MP01 | Expo SDK reference — versões SDK/RN e requisitos Android/iOS/Xcode | https://docs.expo.dev/versions/latest/ | 22/10/2026 |
| MP02 | Expo changelog — Expo SDK 58 | https://expo.dev/changelog/sdk-58 | 22/10/2026 |
| MP03 | Expo Go — página oficial | https://expo.dev/go | 22/10/2026 |
| MP04 | Expo changelog — Login obrigatório no Expo Go | https://expo.dev/changelog/expo-go-57-login | 22/10/2026 |
| MP05 | React Native 0.82 — New Architecture only | https://reactnative.dev/blog/2025/10/08/react-native-0.82 | 22/10/2026 |
| MP06 | React Native blog — índice de releases 0.80–0.88 | https://reactnative.dev/blog | 22/10/2026 |
| MP07 | React Native 0.86 — React Foundation | https://reactnative.dev/blog/2026/06/11/react-native-0.86 | 22/10/2026 |
| MP08 | React Native 0.88 | https://reactnative.dev/blog/2026/10/19/react-native-0.88 | 22/10/2026 |
| MP09 | React Native — Releases overview (calendário e suporte) | https://reactnative.dev/releases/overview | 22/10/2026 |
| MP10 | React Native — Docs versions | https://reactnative.dev/versions | 22/10/2026 |
| MP11 | Expo FAQ — Windows, iOS e políticas de loja | https://docs.expo.dev/faq/ | 22/10/2026 |
| MP12 | Expo Application Services pricing (texto) | https://expo.dev/pricing.md | 22/10/2026 |
| MP13 | Expo — Introduction to development builds | https://docs.expo.dev/develop/development-builds/introduction/ | 22/10/2026 |
| MP14 | Expo — Internal distribution | https://docs.expo.dev/build/internal-distribution/ | 22/10/2026 |
| MP15 | Expo — Cloud build for iOS device | https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/ | 22/10/2026 |
| MP16 | Expo — Run EAS Build locally | https://docs.expo.dev/build-reference/local-builds/ | 22/10/2026 |
| MP17 | Expo Widgets (expo-widgets) | https://docs.expo.dev/versions/latest/sdk/widgets/ | 22/10/2026 |
| MP18 | Expo UI SwiftUI Text (date/timerInterval) | https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/text/ | 22/10/2026 |
| MP19 | Expo SQLite (expo-sqlite) | https://docs.expo.dev/versions/latest/sdk/sqlite/ | 22/10/2026 |
| MP20 | Expo Notifications (expo-notifications) | https://docs.expo.dev/versions/latest/sdk/notifications/ | 22/10/2026 |
| MP21 | Expo Push Service — envio e limites | https://docs.expo.dev/push-notifications/sending-notifications/ | 22/10/2026 |
| MP22 | Expo BackgroundTask | https://docs.expo.dev/versions/latest/sdk/background-task/ | 22/10/2026 |
| MP23 | Expo Modules API — overview | https://docs.expo.dev/modules/overview/ | 22/10/2026 |
| MP24 | EAS Update — introdução | https://docs.expo.dev/eas-update/introduction/ | 22/10/2026 |
| MP25 | Expo — Develop websites | https://docs.expo.dev/workflow/web/ | 22/10/2026 |
| MP26 | Expo Router — Static rendering | https://docs.expo.dev/router/web/static-rendering/ | 22/10/2026 |
| MP27 | React Native — Accessibility | https://reactnative.dev/docs/accessibility | 22/10/2026 |
| MP28 | React Native — Text (allowFontScaling) | https://reactnative.dev/docs/text | 22/10/2026 |
| MP29 | EAS Workflows — E2E com Maestro | https://docs.expo.dev/eas/workflows/examples/e2e-tests/ | 22/10/2026 |
| MP30 | Flutter release notes | https://docs.flutter.dev/release/release-notes | 22/10/2026 |
| MP31 | What's new in Flutter 3.47 | https://flutter.dev/blog/whats-new-in-flutter-3-47 | 22/10/2026 |
| MP32 | Get the Dart SDK | https://dart.dev/get-dart | 22/10/2026 |
| MP33 | Flutter — Set up iOS development | https://docs.flutter.dev/platform-integration/ios/setup | 22/10/2026 |
| MP34 | Flutter — Build and release an iOS app | https://docs.flutter.dev/deployment/ios | 22/10/2026 |
| MP35 | Flutter — Accessibility | https://docs.flutter.dev/ui/accessibility | 22/10/2026 |
| MP36 | Flutter — Accessibility: UI design & styling | https://docs.flutter.dev/ui/accessibility/ui-design-and-styling | 22/10/2026 |
| MP37 | Flutter — Integration tests | https://docs.flutter.dev/testing/integration-tests | 22/10/2026 |
| MP38 | Flutter — Web FAQ | https://docs.flutter.dev/platform-integration/web/faq | 22/10/2026 |
| MP39 | Flutter — Measuring app size | https://docs.flutter.dev/perf/app-size | 22/10/2026 |
| MP40 | drift — Encryption | https://drift.simonbinder.eu/platforms/encryption/ | 22/10/2026 |
| MP41 | pub.dev — sqlcipher_flutter_libs | https://pub.dev/packages/sqlcipher_flutter_libs | 22/10/2026 |
| MP42 | pub.dev — live_activities | https://pub.dev/packages/live_activities | 22/10/2026 |
| MP43 | pub.dev — flutter_local_notifications | https://pub.dev/packages/flutter_local_notifications | 22/10/2026 |
| MP44 | flutter_local_notifications — AndroidNotificationDetails | https://pub.dev/documentation/flutter_local_notifications/latest/flutter_local_notifications/AndroidNotificationDetails-class.html | 22/10/2026 |
| MP45 | Shorebird — FAQ | https://docs.shorebird.dev/faq/ | 22/10/2026 |
| MP46 | Shorebird — Pricing | https://shorebird.dev/pricing | 22/10/2026 |
| MP47 | Codemagic — Pricing | https://codemagic.io/pricing/ | 22/10/2026 |
| MP48 | Kotlin Multiplatform — Stability of supported platforms | https://kotlinlang.org/docs/multiplatform/supported-platforms.html | 22/10/2026 |
| MP49 | Kotlin release process | https://kotlinlang.org/docs/releases.html | 22/10/2026 |
| MP50 | Kotlin Multiplatform quickstart | https://kotlinlang.org/docs/multiplatform/quickstart.html | 22/10/2026 |
| MP51 | Kotlin — Swift export | https://kotlinlang.org/docs/native-swift-export.html | 22/10/2026 |
| MP52 | Compose Multiplatform — iOS accessibility | https://kotlinlang.org/docs/multiplatform/compose-ios-accessibility.html | 22/10/2026 |
| MP53 | What's new in Compose Multiplatform 1.12.2 | https://kotlinlang.org/docs/multiplatform/whats-new-compose-112.html | 22/10/2026 |
| MP54 | Room para KMP | https://developer.android.com/kotlin/multiplatform/room | 22/10/2026 |
| MP55 | SQLDelight — Multiplatform SQLite | https://sqldelight.github.io/sqldelight/latest/multiplatform_sqlite/ | 22/10/2026 |
| MP56 | Android Developers — Kotlin Multiplatform | https://developer.android.com/kotlin/multiplatform | 22/10/2026 |
| MP57 | ActivityKit — Displaying live data with Live Activities | https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities | 22/10/2026 |
| MP58 | ActivityKit — push notifications | https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications | 22/10/2026 |
| MP59 | SwiftUI Text(timerInterval:) | https://developer.apple.com/documentation/swiftui/text/init(timerinterval:pausetime:countsdown:showshours:) | 22/10/2026 |
| MP60 | BGTaskScheduler | https://developer.apple.com/documentation/backgroundtasks/bgtaskscheduler | 22/10/2026 |
| MP61 | BGContinuedProcessingTask | https://developer.apple.com/documentation/backgroundtasks/bgcontinuedprocessingtask | 22/10/2026 |
| MP62 | Apple — Upcoming requirements | https://developer.apple.com/news/upcoming-requirements/ | 22/10/2026 |
| MP63 | Xcode na Mac App Store — histórico de versões | https://apps.apple.com/us/app/xcode/id497799835?mt=12 | 22/10/2026 |
| MP64 | Swift.org blog | https://www.swift.org/blog/ | 22/10/2026 |
| MP65 | Xcode Cloud | https://developer.apple.com/xcode-cloud/ | 22/10/2026 |
| MP66 | TestFlight | https://developer.apple.com/testflight/ | 22/10/2026 |
| MP67 | Apple Developer Program — enroll | https://developer.apple.com/programs/enroll/ | 22/10/2026 |
| MP68 | Enabling Developer Mode on a device | https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device | 22/10/2026 |
| MP69 | HIG — Accessibility | https://developer.apple.com/design/human-interface-guidelines/accessibility | 22/10/2026 |
| MP70 | SwiftData | https://developer.apple.com/documentation/swiftdata | 22/10/2026 |
| MP71 | GRDB.swift | https://github.com/groue/GRDB.swift | 22/10/2026 |
| MP72 | Asking permission to use notifications | https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications | 22/10/2026 |
| MP73 | Apple Developer Program License Agreement | https://developer.apple.com/support/terms/apple-developer-program-license-agreement/ | 22/10/2026 |
| MP74 | Apple Store (EUA) — Mac mini | https://www.apple.com/shop/buy-mac/mac-mini | 22/10/2026 |
| MP75 | Apple Store (EUA) — iPhone | https://www.apple.com/shop/buy-iphone | 22/10/2026 |
| MP76 | Android — Live Update notifications | https://developer.android.com/develop/ui/views/notifications/live-update | 22/10/2026 |
| MP77 | NotificationCompat.Builder | https://developer.android.com/reference/androidx/core/app/NotificationCompat.Builder | 22/10/2026 |
| MP78 | Android 16 — Features and APIs | https://developer.android.com/about/versions/16/features | 22/10/2026 |
| MP79 | Android 17 | https://developer.android.com/about/versions/17 | 22/10/2026 |
| MP80 | WorkManager — Define work requests | https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work | 22/10/2026 |
| MP81 | Foreground service types | https://developer.android.com/develop/background-work/services/fgs/service-types | 22/10/2026 |
| MP82 | Notification runtime permission | https://developer.android.com/develop/ui/views/notifications/notification-permission | 22/10/2026 |
| MP83 | Schedule alarms | https://developer.android.com/develop/background-work/services/alarms/schedule | 22/10/2026 |
| MP84 | Accessibility in Jetpack Compose | https://developer.android.com/develop/ui/compose/accessibility | 22/10/2026 |
| MP85 | Compose accessibility — API defaults | https://developer.android.com/develop/ui/compose/accessibility/api-defaults | 22/10/2026 |
| MP86 | Google Play — Target API level requirements | https://support.google.com/googleplay/android-developer/answer/11926878 | 22/10/2026 |
| MP87 | Google Play — Device and Network Abuse | https://support.google.com/googleplay/android-developer/answer/9888379 | 22/10/2026 |
| MP88 | SQLCipher for Android | https://www.zetetic.net/sqlcipher/sqlcipher-for-android/ | 22/10/2026 |
| MP89 | GitHub Actions runner pricing | https://docs.github.com/en/billing/reference/actions-runner-pricing | 22/10/2026 |
| MP90 | GitHub Actions billing | https://docs.github.com/en/billing/concepts/product-billing/github-actions | 22/10/2026 |
| MP91 | Bitrise pricing | https://bitrise.io/pricing | 22/10/2026 |
| MP92 | MacinCloud pricing | https://www.macincloud.com/pricing | 22/10/2026 |
| MP93 | Firebase Test Lab — quotas e preços | https://firebase.google.com/docs/test-lab/usage-quotas-pricing | 22/10/2026 |
| MP94 | Firebase Test Lab for iOS | https://firebase.google.com/docs/test-lab/ios/get-started | 22/10/2026 |
| MP95 | AWS Device Farm pricing | https://aws.amazon.com/device-farm/pricing/ | 22/10/2026 |
| MP96 | Maestro pricing | https://maestro.dev/pricing | 22/10/2026 |
| MP97 | Maestro — iOS UIKit (limitações) | https://docs.maestro.dev/get-started/supported-platform/ios/uikit | 22/10/2026 |
| MP98 | Maestro — iOS | https://docs.maestro.dev/get-started/supported-platform/ios | 22/10/2026 |
| MP99 | Detox — Environment setup | https://wix.github.io/Detox/docs/introduction/environment-setup | 22/10/2026 |
| MP100 | Detox — Devices | https://wix.github.io/Detox/docs/config/devices/ | 22/10/2026 |
| MP101 | Appium XCUITest driver — requisitos | https://appium.github.io/appium-xcuitest-driver/latest/getting-started/system-requirements/ | 22/10/2026 |
| MP102 | Maestro — How to install Maestro CLI | https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli | 22/10/2026 |
| MP103 | Expo changelog (índice) | https://expo.dev/changelog | 22/10/2026 |

## Fatores que mudariam a escolha

- **A equipe passa a ter Mac** (ou aceita gastar cerca de US$ 899). O Flutter empata com RN + Expo, e o PoC decide.
- **O `expo-widgets` não atende no PoC** (runtime isolado, timer, push). A vantagem de RN no iOS cai para "precisa de Swift", como no Flutter. RN segue à frente só pelo build a partir do Windows.
- **Acessibilidade.** Se RN ou Flutter falharem com fonte de 200% ou com VoiceOver nas telas de registro, a UI nativa (KMP) sobe.
- **Entra alguém com Swift/iOS** na equipe. KMP + UI nativa vira candidata real.
- **Backend em Kotlin/Java** e o desejo de compartilhar validação e modelos com o servidor. O KMP ganha peso, como benefício declarado e não como conveniência.
- **App web para cuidadores no MVP.** Reforça RN + Expo.
- **Mudança de preço ou condição do EAS**, ou descontinuação de um módulo Expo central. Sem EAS, o iOS volta a precisar de Mac ou CI macOS, e o custo de RN se aproxima do de Flutter.
- **Desempenho medido em Android modesto** fora do aceitável numa das opções.
- **Mudança nas regras das lojas** sobre código interpretado e OTA, ou sobre Live Activities e Live Updates.

## Questões abertas

1. Daniel aceita comprar ou alugar um Mac? Isso muda a ordem entre RN + Expo e Flutter.
2. Há iPhone físico disponível para testes? Qual modelo e qual versão de iOS?
3. Qual é o papel da web no MVP: site público, painel de moderação, app para cuidadores (ADR-001)?
4. Live Activity e Live Update entram no MVP ou numa fase posterior? Isso vale também para "sessão iniciada por outro cuidador", que exige push do servidor.
5. A criptografia de aplicação (SQLCipher) é exigência ou basta a proteção de arquivos do sistema? Depende do [doc de privacidade e lojas](../Pesquisa_Privacidade_Legal_e_Lojas.md).
6. É aceitável usar o Expo Push Service como intermediário, ou o push vai direto a FCM/APNs?
7. O repositório continuará público? Isso muda o custo de CI macOS no GitHub.
8. Qual política de upgrade (SDK, Flutter, Xcode) a equipe consegue sustentar, e quem cuida dela?
9. Depurar incidentes nativos sem Mac próprio é aceitável no lançamento?
10. Sessões de sono acima de 8 h: o que mostrar depois que o sistema encerra a Live Activity?

## Limites desta análise

- Nenhum app, PoC ou benchmark foi construído. Tamanho, desempenho, acessibilidade e esforço não foram medidos.
- **Preços:** em USD, de sites dos EUA, sem impostos nem câmbio. O Brasil não foi consultado, e os planos mudam sem aviso.
- **Extração automática:** páginas dinâmicas podem ter omitido conteúdo. Ficaram de fora o preço mensal dos planos pagos do Shorebird e a regra de consumo de minutos macOS no GitHub Free. BrowserStack e Sauce Labs não foram consultados.
- **Ausência de menção não prova ausência.** Vale para Dynamic Type no CMP, SQLCipher no op-sqlite, Live Updates no `flutter_local_notifications` e cronômetro no `expo-notifications`.
- **Manutenção de bibliotecas de terceiros:** avaliada por datas de publicação, push e arquivamento, não pela qualidade do código.
- **Versões mudam rápido.** O Expo Go do SDK 58 ainda não estava nas lojas, e a documentação do RN mostrava 0.87 como "latest" com a 0.88 já no npm.
- **Não houve avaliação jurídica** das políticas das lojas. Os trechos citados são da documentação pública.
- **Fora do escopo pedido:** .NET MAUI, Ionic/Capacitor, NativeScript e similares não foram avaliados.
