---
tipo: pesquisa-tecnologia
status: rascunho
responsavel: Hermes (subagente dados e backend)
revisado_em: 2026-10-22
fontes_principais:
  - https://firebase.google.com/docs/firestore/manage-data/enable-offline
  - https://firebase.google.com/docs/web/environments-js-sdk
  - https://rnfirebase.io/firestore/usage
  - https://supabase.com/docs/guides/database/postgres/row-level-security
  - https://docs.powersync.com/handling-writes/writing-client-changes
  - https://docs.powersync.com/integrations/supabase/rls-and-sync-streams
  - https://electric.ax/docs/sync/guides/writes
  - https://zero.rocicorp.dev/docs/connection
  - https://developer.apple.com/app-store/review/guidelines/
---

# Dados, sincronização e backend: opções para o AppMaternidade

Nota de pesquisa da APP-001 (D4 e D5) sobre banco remoto, sincronização offline, autenticação, push, arquivos, e-mail e operação. Os preços completos e os cenários de custo estão em [Preços datados](Precos_Datados.md). As convenções seguem [Convenções](../../00_Inicio/Convencoes.md). Frameworks mobile, caminho iOS/Windows, Live Activities e farms de teste ficam na nota do outro subagente. Aqui só cito o que muda a escolha de dados.

Este documento é pesquisa, não decisão. Nada aqui foi aprovado por Daniel.

## Resumo

- **Firestore offline depende do SDK real.** Os SDKs nativos Android e Apple persistem em disco por padrão. FlutterFire e React Native Firebase usam esses SDKs nativos. O Firebase JS SDK em React Native/Expo Go **não tem persistência do Firestore**. A tabela de ambientes oficial marca "except persistence" para React Native. [DOC] ([D01](#fontes), [D03](#fontes))
- **Firestore resolve concorrência por "última escrita vence"** e transações falham offline. Conflitos explícitos (duas edições offline; exclusão versus edição) precisam ser modelados pelo app. [DOC] ([B01](#fontes), [B02](#fontes))
- **PowerSync** é a camada PostgreSQL↔SQLite mais aderente ao requisito de escrita offline. A fila local é enviada para **uma API que você escreve**, e o backend decide conflitos e autorização. A licença do serviço é FSL-1.1-ALv2: uso livre exceto para competir com o produto, e cada versão vira Apache-2.0 após dois anos. Os SDKs cliente são Apache-2.0. [DOC][EXEC]
- **ElectricSQL** sincroniza só leitura ("does not do write-path sync"). **Zero** chegou à versão 1.x, mas **não aceita escrita offline**. **Replicache** está em modo de manutenção. Nenhum dos três atende sozinho ao requisito de registro offline durável. [DOC]
- **Autorização tem de ser reavaliada no servidor a cada operação.** A própria Supabase alerta que o JWT "is not always up-to-date" até ser renovado. [DOC] ([B05](#fontes))
- **Três conjuntos coerentes** (detalhes na [seção 11](#11-três-conjuntos-completos)):
  - A: Firebase com SDK nativo.
  - B: Supabase com PowerSync.
  - C: API própria (monólito modular) com PostgreSQL e outbox/sync próprio.
- **Custo ilustrativo de infraestrutura** com as premissas de [Preços datados](Precos_Datados.md). Não inclui o serviço de domínio da recomendação, o PITR nem a homologação; a composição do conjunto recomendado está em [Custos e operação](../../05_Privacidade_Operacao/Custos_e_Operacao.md), seção 2:

  | Famílias | Faixa de custo | A | B | C |
  | ---: | --- | ---: | ---: | ---: |
  | 100 | ~US$ 27–101/mês | US$ 27 | US$ 101 | US$ 64 |
  | 1.000 | ~US$ 35–121/mês | US$ 35 | US$ 121 | US$ 109 |
  | 10.000 | ~US$ 139–214/mês | US$ 139 | US$ 214 | US$ 202 |

  Os valores incluem EAS Starter e Apple Developer Program. A diferença entre conjuntos é pequena perto do custo de engenharia. [HIP]

## 1. Escopo, método e evidências

- Data de consulta: 22/10/2026 (America/Sao_Paulo). Preços em USD, sem impostos nem câmbio.
- Versões [EXEC] foram coletadas em 22/10/2026 entre ~06:00 e 06:35 UTC (03:00–03:35 BRT), no Windows 11 com npm 11.19.0. Fontes das versões:
  - `npm view <pacote> version time.modified license`;
  - APIs públicas de pub.dev (`/api/packages/<p>`) e PyPI (`/pypi/<p>/json`);
  - `maven-metadata.xml` do Maven Central e do Google Maven;
  - GitHub REST (`/releases/latest`, `/license`, `/commits/main`).
- Nada foi instalado, nenhuma conta foi criada e nenhum serviço foi contratado.
- Classes [DOC], [EXEC], [CÓDIGO] e [HIP] conforme as convenções. Ausência de menção numa página não prova ausência do recurso.

## 2. Requisitos que guiam a comparação

Os requisitos vêm de `01_TASK_HERMES.md` (D4/D5) e do contexto da task:

1. Registros essenciais criados e editados offline, persistidos no aparelho e enviados depois sem perda nem duplicação (idempotência).
2. Conflitos explícitos: duas edições offline do mesmo registro; exclusão versus edição.
3. Revogação de vínculo com aparelho offline. O servidor reavalia a autorização **atual** em cada operação; uma lista de famílias dentro do JWT não basta.
4. Isolamento entre famílias em consultas, escritas, arquivos, canais de sync e notificações.
5. Comunidade separada da rotina privada.
6. Exportação, exclusão, backups e logs sem conteúdo sensível.
7. Dados de rotina de bebês tratados como potencialmente sensíveis (saúde). A análise jurídica fica em [Pesquisa de privacidade, legal e lojas](../Pesquisa_Privacidade_Legal_e_Lojas.md).

## 3. Firebase / Cloud Firestore

### 3.1 O que cada SDK realmente entrega offline

| Runtime real | Persistência do Firestore em disco | Sobrevive a encerrar o processo? | Requisitos de build | Versão verificada [EXEC] |
| --- | --- | --- | --- | --- |
| SDK nativo Android | Habilitada por padrão; limite de cache padrão de 100 MB, configurável. [DOC] [B01](#fontes) | Provável. O cache fica em disco [DOC]. A página não diz explicitamente que escritas pendentes sobrevivem ao reinício; a inferência é forte, mas validar no protótipo. [HIP] | Gradle/BoM | `com.google.firebase:firebase-bom` 35.1.0 (Google Maven, atualizado em 21/10/2026) |
| SDK nativo Apple | Habilitada por padrão. [DOC] [B01](#fontes) | Provável (como no Android). [HIP] | SPM/CocoaPods | `firebase-ios-sdk` 13.1.0 (release de 21/10/2026) |
| FlutterFire (`cloud_firestore`) | Mesma persistência do SDK nativo, porque o plugin depende dos SDKs nativos (veja abaixo). [CÓDIGO] [D05](#fontes) | Herda o comportamento do nativo. [CÓDIGO]+[HIP] | Projeto Flutter com Android/iOS; iOS 15+ e Android 7.0+ segundo o guia. [DOC] [D06](#fontes) | `cloud_firestore` 7.0.0, `firebase_core` 5.0.0 (pub.dev, 15/10/2026) |
| React Native Firebase (`@react-native-firebase/firestore`) | Habilitada por padrão. "IndexedDB persistence and `memoryLocalCache` / `persistentLocalCache` are web only. Native persistence is controlled by the iOS/Android Firestore SDK." [DOC] [D03](#fontes) | Herda o comportamento do nativo. [DOC] [D02](#fontes) + [HIP] | Código nativo. **Não funciona no Expo Go**; exige `expo-dev-client`/development build, config plugins e `npx expo prebuild --clean`. [DOC] [M11](#fontes) | `@react-native-firebase/*` 27.0.0 (19/10/2026) |
| Firebase JS SDK em React Native/Expo | **Sem persistência.** A tabela oficial de ambientes marca Cloud Firestore em React Native como "(except persistence)". [DOC] [D01](#fontes) | **Não garantido.** Sem persistência em disco, escritas pendentes ficam em memória e se perdem se o processo morrer antes de sincronizar. [HIP derivado de D01] | Funciona no Expo Go, sem plugins. [DOC] [M11](#fontes) | `firebase` 13.1.0 (npm, 21/10/2026) |
| Firebase JS SDK na web | Desabilitada por padrão; habilitável com `persistentLocalCache` (IndexedDB). [DOC] [B01](#fontes) | Depende do navegador. | n/a | `firebase` 13.1.0 |

Evidência de código do FlutterFire [CÓDIGO]. No HEAD de `main`, commit `cb3cc4b6bed7aa0ca916d98abb11275fbfe0728f` de 21/10/2026, "bump Firebase Android SDK to 35.0.2":
- `packages/cloud_firestore/cloud_firestore/android/build.gradle`, linhas 63–66, declara `firebase-bom` e `com.google.firebase:firebase-firestore`;
- `packages/cloud_firestore/cloud_firestore/ios/cloud_firestore.podspec`, linha 35, declara `s.dependency 'Firebase/Firestore'`.

Os permalinks estão em [D05](#fontes).

Consequência prática:
- Em React Native, só o React Native Firebase atende ao requisito de registro offline durável com Firestore. Isso obriga a usar development build (EAS ou build local).
- O custo marginal desse requisito é menor do que parece: push remoto também não funciona no Expo Go desde o SDK 53. [DOC] [D53](#fontes)
- O SDK JS só serve para web ou protótipo.

### 3.2 Semântica de sincronização e limites

- **Última escrita vence:** ao sincronizar alterações locais, "it's last write wins". [DOC] [B01](#fontes) Não há detecção de conflito embutida. Duas edições offline do mesmo documento terminam com a última a chegar.
- **Transações falham offline:** "Transactions will fail when the client is offline." [DOC] [B02](#fontes), [D03](#fontes) Operações que precisam ler o estado atual do servidor (unicidade, contadores, "encerrar sessão só se ainda aberta") não podem depender de transação no cliente.
- **Como tornar conflitos explícitos** [HIP, a validar em protótipo]:
  - IDs gerados no cliente (UUID/ULID) e `set` idempotente na criação.
  - Campo `version` e/ou `updatedBy`/`updatedAtClient`.
  - Exclusão lógica com campo `deletedAt` (tombstone) em vez de `delete` físico.
  - Uma Cloud Function que compara versões e grava um documento de conflito para o app mostrar.
  - Regras de segurança podem exigir `request.resource.data.version == resource.data.version + 1`. Uma escrita offline rejeitada pelas regras só falha na reconexão, e o app precisa tratar o erro.
- **Regras de segurança:**
  - `get()`/`exists()` permitem verificar o vínculo atual (ex.: documento de membro da família) a cada requisição. [DOC] [B03](#fontes)
  - Limite de 10 chamadas de acesso a documentos por avaliação em requisições de documento único e consultas, e 20 em leituras múltiplas, transações e lotes. [DOC] [B03](#fontes)
  - Essas leituras são cobradas. [DOC] [B04](#fontes)
- **Admin SDK e bibliotecas de servidor ignoram as regras:** "The server client libraries bypass all Cloud Firestore Security Rules and instead authenticate through Google Application Default Credentials." [DOC] [D10](#fontes) Toda Cloud Function precisa refazer a checagem de autorização por conta própria.
- **Revogação com aparelho offline:**
  - A próxima requisição do aparelho revogado é negada pelas regras se elas consultarem o documento de vínculo. [DOC B03 + HIP]
  - O cache local continua legível no aparelho até o app limpá-lo. O app deve chamar a limpeza de persistência do SDK ao receber `permission-denied` ou um sinal de revogação. [HIP: API de limpeza não reverificada nesta rodada]
  - Escritas pendentes do aparelho revogado são rejeitadas na reconexão. [HIP]

### 3.3 Custo por leitura, escrita e listener

Valores completos em [Preços datados](Precos_Datados.md). Pontos que mudam o desenho:

- **Listeners:**
  - Cobram uma leitura por documento adicionado, alterado ou removido do resultado.
  - Com persistência ativa, se o listener ficar desconectado **mais de 30 minutos**, a reconexão é cobrada como consulta nova.
  - Sem persistência, toda reconexão é cobrada assim.
  - [DOC] [B04](#fontes)
- **Mínimo de uma leitura por consulta.** Leituras de `get()`/`exists()` nas regras também são cobradas. [DOC] [B04](#fontes)
- **Implicação:** abrir o app várias vezes ao dia relê "os registros de hoje". Histórico longo deve vir de documentos de resumo, não de releitura de cada registro. [HIP]

### 3.4 Firebase Authentication

- Sem custo até 50 mil MAU (Tier 1: e-mail, social, anônimo). Acima disso vale a tabela do Identity Platform (US$ 0,0055/MAU de 50 mil a 100 mil). [DOC] [D14](#fontes)
- **Limites relevantes:**
  - O e-mail de login por link é limitado a **5/dia no plano Spark** e 25.000/dia no Blaze.
  - SMS só existe no Blaze.
  - [DOC] [D13](#fontes)
  - Um app real precisa estar no Blaze.
- **Passkeys:** não encontrei suporte nativo documentado nas páginas oficiais de Firebase Auth consultadas (busca em 22/10/2026). [HIP/limite: confirmar antes de decidir]

### 3.5 Cloud Storage for Firebase, FCM e saída

- **Storage exige plano Blaze** desde as mudanças anunciadas em setembro de 2024. No Spark, as chamadas retornam 402/403 e o console perde o acesso. [DOC] [D15](#fontes)
  - Regras por caminho permitem prefixo por família, com a mesma checagem de vínculo das regras do Firestore. [HIP]
- **FCM:**
  - Sem custo. [DOC] [D09](#fontes)
  - O envio usa a HTTP v1 API com token OAuth 2.0 de curta duração derivado de conta de serviço. [DOC] [D16](#fontes)
  - Mensagens de dados têm até 4 KB. [DOC] [D17](#fontes)
  - As APIs de servidor InstanceId e o recurso de device groups foram descontinuados em setembro de 2026, com desligamento em **29/09/2027**. Não desenhar notificação de família com device groups. [DOC] [D17](#fontes)
- **Exportação e saída:**
  - Export gerenciado para bucket do Cloud Storage em "LevelDB log format", com caminho para BigQuery. [DOC] [D11](#fontes)
  - Backups agendados diários/semanais com retenção de até 14 semanas, mais PITR, ambos cobrados. [DOC] [D12](#fontes), [D08](#fontes)
  - Sair do Firestore significa converter um modelo documental e reescrever a camada de dados e as regras do app. É o maior acoplamento dos três conjuntos. [HIP]

## 4. Supabase

- **PostgreSQL com RLS:**
  - O papel `service_role` "bypasses RLS" e deve ficar só no servidor.
  - Views ignoram RLS por padrão (`security definer`), salvo configuração explícita.
  - A documentação recomenda indexar as colunas usadas nas políticas.
  - [DOC] [B05](#fontes)
- **JWT desatualizado (B05)**: "Keep in mind that a JWT is not always up-to-date... even if you remove a user from a team and update the `app_metadata` field, that will not be reflected using `auth.jwt()` until the user's JWT is refreshed." [DOC] [B05](#fontes)
  - Para revogação, as políticas devem consultar a tabela de vínculos (`auth.uid()` + junção ou função), não claims de família no token.
- **Auth:**
  - Free tem 50 mil MAU. Pro inclui 100 mil MAU e cobra US$ 0,00325/MAU acima disso. [DOC] [B08](#fontes)
  - O SMTP padrão "is not meant for production use": só entrega a endereços da equipe e tem limite atual de **2 mensagens/hora**. Produção exige SMTP próprio (ex.: Resend, Postmark, SES). [DOC] [D21](#fontes)
  - Passkeys existem, mas são "experimental" no guia (opt-in no cliente JS) e "BETA" na referência Flutter (`supabase_flutter` ≥ 2.15.0). [DOC] [D23](#fontes), [D24](#fontes)
- **Storage:**
  - Por padrão não aceita upload sem políticas RLS em `storage.objects`. [DOC] [D19](#fontes)
  - URLs assinadas via `createSignedUrl`. [DOC] [D59](#fontes)
  - **Os backups do banco não incluem os objetos do Storage.** [DOC] [D18](#fontes)
- **Realtime:**
  - Oferece Broadcast, Presence e Postgres Changes. [DOC] [D22](#fontes)
  - A documentação não descreve persistência local nem fila de escrita offline. Realtime não substitui um protocolo de sync offline. [DOC+HIP]
- **Backups:**
  - Pro tem backups diários com acesso a 7 dias; Team, 14; Enterprise, até 30. Projetos Free não aparecem entre os com backup automático.
  - PITR é add-on (preço em [Preços datados](Precos_Datados.md)).
  - A restauração deixa o projeto inacessível durante o processo.
  - [DOC] [D18](#fontes)
- **Plano gratuito:** projetos "are paused after 1 week of inactivity", com limite de 2 projetos ativos. [DOC] [B08](#fontes)
- **Self-host:**
  - Feito via Docker. Roda um único projeto.
  - Não inclui branching, métricas avançadas, backups gerenciados, PITR nem a Management API.
  - [DOC] [D20](#fontes)
  - O repositório `supabase/supabase` é Apache-2.0. [EXEC: GitHub `/license`]
- **Saída:** é PostgreSQL padrão (`supabase db dump`/`pg_dump`). [DOC] [D18](#fontes)

## 5. Camadas de sincronização PostgreSQL ↔ SQLite

### 5.1 PowerSync

**Caminho de escrita**:
- O cliente grava no SQLite local. A operação entra numa fila de upload ordenada.
- A função `uploadData()` do app envia a fila para **um endpoint do seu backend**, em qualquer estilo de API. [DOC] [D25](#fontes)
- O endpoint deve ser síncrono com a escrita no banco.
- Erros de validação ou conflito devem voltar como **2xx com detalhe**, porque 4xx bloqueia a fila. 5xx é só para falha temporária e provoca nova tentativa. [DOC] [D25](#fontes)

**Idempotência e conflitos**:
- "The operations must be idempotent". O backend pode receber a mesma operação mais de uma vez.
- Cada operação traz um ID incremental por cliente para deduplicar.
- O padrão é "per-field Last-Write-Wins", customizável no backend.
- [DOC] [D26](#fontes)

**Download e autorização**:
- Sync Streams (GA) definem o que desce ao cliente e "do not apply to uploaded data". A RLS (ou a API) é a autoridade sobre escritas. [DOC] [B07](#fontes), [D33](#fontes)

**Revogação**:
- Parâmetros lidos de tabela permitem que o acesso "can instantly be revoked by deleting the user row/document from the source database". [DOC] [D27](#fontes)
- Uma linha só é apagada do cliente quando sai de todos os buckets (operação `REMOVE`). [DOC] [D28](#fontes)
- Não há como revogar um JWT já emitido. A recomendação é expiração curta (ex.: 5 min). [DOC] [D29](#fontes)
  - A mesma página afirma que "JWTs older than 60 minutes are not accepted" e, em outro trecho, aceita validade de até 24 h com 60 min recomendados. Há divergência interna a confirmar.
- `disconnectAndClear()` apaga os dados locais no logout. Só deve ser usado com a fila vazia, senão as mutações locais se perdem. [DOC] [D30](#fontes), [D61](#fontes)
- Aparelho offline mantém os dados até reconectar. [HIP inerente]

**Dados sensíveis**:
- Na página HIPAA, o cliente fica responsável por criptografar o SQLite local (SQLCipher), controlar o acesso ao aparelho e descartar dados no desprovisionamento. [DOC] [D31](#fontes)

**SDKs e status**:
- GA: React Native, Dart/Flutter, Kotlin, Swift, JavaScript/Web e Node.js.
- Beta: OP-SQLite Support, Drift, Drizzle, Room, SQLDelight, .NET, Flutter SQLCipher e Kotlin SQLite3MultipleCiphers.
- Bancos de origem: Postgres e MongoDB GA; MySQL e SQL Server Beta.
- [DOC] [D33](#fontes)

**Expo**:
- O adaptador nativo (`@op-engineering/op-sqlite`) "is not compatible with Expo Go". Exige development build.
- Para Expo Go existe o adaptador JS `@powersync/adapter-sql-js`.
- [DOC] [D32](#fontes)
- A documentação diz suportar op-sqlite "1.17.0 or later". O `peerDependencies` publicado exige `>=17.1.0 <19.0.0` [EXEC], o que indica erro de digitação na página.
- O pacote `@powersync/op-sqlite` 0.9.16 exige op-sqlite ^13–15 e `@powersync/common` ^1.57 [EXEC]. Parece legado. Não usar sem confirmar.

**Licença e self-host**:
- O serviço usa a **Functional Source License 1.1 com licença futura Apache-2.0** ("FSL-1.1-ALv2"). O uso é permitido para qualquer fim exceto "Competing Use", e cada versão passa a Apache-2.0 "on the second anniversary". [DOC] [D35](#fontes)
- A API do GitHub reporta `NOASSERTION` por não reconhecer a FSL. [EXEC]
- Os SDKs JS (`powersync-js`) são Apache-2.0. [EXEC]
- Self-host da **Open Edition** (GA) usa a imagem Docker `journeyapps/powersync-service`. Existe ainda a Enterprise Self-Hosted Edition com preço sob consulta. [DOC] [D34](#fontes), [D33](#fontes)

**Preço**: Free/Pro/Team em [Preços datados](Precos_Datados.md).
- O Free é desativado após uma semana de inatividade e permite 50 clientes simultâneos no pico.
- O Pro hospeda até 100 GB por padrão. [DOC] [B09](#fontes)

### 5.2 ElectricSQL (estado em 2026)

- "Electric does read-path sync... Electric does not do write-path sync." Para escrita, o guia propõe quatro padrões: online, estado otimista, estado otimista persistente compartilhado e "through-the-database". [DOC] [D36](#fontes)
- Para registro offline durável com Electric, o app ainda precisa de store local e outbox. Na prática, o caminho de escrita fica igual ao do conjunto C. [HIP]
- O cliente TypeScript funciona em Expo. [DOC] [D38](#fontes)
- Versões [EXEC]:
  - `@electric-sql/client` 1.5.28 e `@electric-sql/react` 1.0.57 (09/09/2026);
  - `@core/sync-service` 1.8.1 (07/09/2026).
- Licença Apache-2.0. [EXEC]
- Electric Cloud cobra por escrita e retenção; leitura e egress são livres. [DOC] [D37](#fontes)

### 5.3 Zero e Replicache (Rocicorp)

- **Zero:**
  - Atingiu 1.0 ("Zero to 1.0"). O roadmap de 2026 prevê levar o Cloud Zero a "full public availability". [DOC] [D40](#fontes)
  - Suporta React Native/Expo com `kvStore` em expo-sqlite ou op-sqlite. [DOC] [D41](#fontes)
  - **"Zero does not support offline writes"**: desconectado, lê dados sincronizados, mas "writes are rejected". O projeto avisa que "is not designed for long periods offline". [DOC] [D39](#fontes)
  - Isso viola o requisito 1. **Descartado para a rotina.**
  - `@rocicorp/zero` 1.11.2 (21/10/2026), Apache-2.0. [EXEC]
- **Replicache:**
  - "is now in maintenance mode": código aberto, sem cobrança e sem novos recursos. Usuários devem migrar para Zero. [DOC] [D42](#fontes)
  - npm 15.3.0 (22/05/2026), com campo de licença apontando para `roci.dev/terms.html`. [EXEC]
  - Não recomendado para projeto novo.

### 5.4 Outras opções verificadas

- **WatermelonDB:**
  - Banco local com primitivas de sync. "bring your own backend" com dois endpoints (pull/push). [DOC] [D43](#fontes)
  - npm 0.28.0, última modificação em 24/07/2025. [EXEC]
  - Mais de um ano sem publicação é risco de manutenção. [HIP]
- **RxDB** 17.6.0 [EXEC]: o storage SQLite completo para produção é do RxDB Premium (pago). O core traz uma versão "trial". [DOC] [D44](#fontes)
- **MongoDB Atlas Device Sync / Realm:** "Device Sync has reached its end-of-life status and be removed on September 30, 2025". [DOC] [D45](#fontes) **Descartado.**
- **TanStack DB** 0.15.2 [EXEC]: pré-1.0; citado pela Electric e pelo status do PowerSync (Alpha). Não avaliado a fundo.

### 5.5 Outbox próprio + endpoint de sync (o que precisa construir)

Se não houver camada pronta, como no conjunto C ou no Electric, é preciso construir [HIP: desenho de referência a validar em protótipo]:

1. **Banco local** (SQLite):
   - RN: `expo-sqlite` 58.0.13 ou `@op-engineering/op-sqlite` 18.2.5, com ORM opcional `drizzle-orm` 0.45.4.
   - Flutter: `drift` 2.35.2 ou `sqflite` 2.4.5.
   - Versões [EXEC].
2. **Outbox** com a operação, numa transação local junto da mudança visível:
   - `op_id` único gerado no cliente (UUIDv7/ULID);
   - `device_id`, `seq` local monotônico, `entity`, `entity_id`, `base_version`, `payload`;
   - `observed_at` (relógio do aparelho) e `tz`.
3. **Endpoint de push** que, em transação no servidor:
   - reavalia o vínculo **atual** de quem envia com a família;
   - deduplica por `op_id` (tabela com chave única);
   - compara `base_version` com a versão atual;
   - aplica a mudança ou grava um conflito explícito;
   - registra `received_at`;
   - responde por operação: aceita, duplicada, conflito ou rejeitada (revogada/validação).
4. **Endpoint de pull** por família com **cursor** (sequência monotônica do servidor, não relógio), paginação e **tombstones** (`deleted_at`) para propagar exclusões.
5. **Reconciliação no cliente:**
   - marcar operações aceitas;
   - mostrar conflitos;
   - reaplicar pendentes sobre o estado novo;
   - purgar dados locais da família quando o servidor responder "revogado".
6. **Migrações de esquema** local e remoto versionadas; compatibilidade com versões antigas do app ainda em uso.
7. **Testes de propriedade e caos**: matar o processo, reenvio duplicado, ordem trocada, relógio adiantado/atrasado e revogação no meio do lote.

O PostgreSQL ajuda nos itens 3 e 4 com isolamento transacional e restrições únicas. [DOC] [B10](#fontes) É o mesmo contrato que o PowerSync exige do endpoint de upload. A diferença é que, no PowerSync, o download, os buckets e a remoção no cliente já vêm prontos.

## 6. API própria: monólito modular com PostgreSQL

Comparação objetiva. Nenhuma das três foi escolhida por familiaridade. A familiaridade de Daniel com Java/React é um critério de custo a declarar, não justificativa automática.

| Critério | NestJS (TypeScript) | Django + DRF (Python) | Spring Boot (Java) |
| --- | --- | --- | --- |
| Versões verificadas [EXEC] | `@nestjs/core` 12.2.0 (19/10/2026); `@nestjs/testing` 12.2.0 | Django 6.1.2 (06/10/2026, Python ≥ 3.12); DRF 3.18.3 (06/10/2026) | Spring Boot 4.1.1 GA (milestone 4.2.0-M2); Spring Security 7.1.1; Spring Modulith 2.1.1 |
| Autorização por objeto | `@nestjs/authorization` 0.1.0 (08/10/2026): policies com `@Can()` e guard global que "denies by default". [DOC] [D46](#fontes) Pacote **muito novo (0.x)**. Alternativa madura: `@casl/ability` 7.0.2. [EXEC] | Permissões de objeto rodam em `get_object()`. "the generic views will not automatically apply object level permissions to each instance in a queryset when returning a list". O filtro por família precisa ficar no queryset. [DOC] [D47](#fontes) Apoio: `django-guardian` 3.5.2; `rules` 3.5 (última versão de 09/2024). [EXEC] | `@PreAuthorize`, `@PostAuthorize`, `@PreFilter`/`@PostFilter` e `AuthorizationManager`. [DOC] [D50](#fontes) Filtro por família em repositório/consulta. |
| Admin/moderação | Sem admin nativo; exige ferramenta ou tela própria. [HIP] | Django admin: o uso "is limited to an organization's internal management tool. It's not intended for building your entire front end". Serve de back-office de moderação com permissões restritas. [DOC] [D49](#fontes) | Sem admin de dados nativo; tela própria. [HIP] |
| Jobs (push, e-mail, EXIF, exclusão) | `@nestjs/bullmq` 12.0.0 + BullMQ 6.4.0 (exige Redis) ou `pg-boss` 12.38.0 (fila no próprio Postgres). [EXEC] | O framework de Tasks do Django 6.x define a API, mas "built-in backends... are for development and testing only". Precisa de backend/worker (`django-tasks` 0.12.0 ou Celery 5.6.3). [DOC] [D48](#fontes) [EXEC] | JobRunr 9.0.2 ou Quartz 2.5.2. [EXEC] |
| ORM/migrações | Prisma: o dist-tag `latest` aponta para **8.0.0-rc.24** (prev 7.10.1), o que exige fixar versão. Drizzle 0.45.4. TypeORM 1.1.2. [EXEC] | ORM e migrações nativos. | JPA/Hibernate e Flyway/Liquibase (não verificados nesta rodada). |
| Linguagem compartilhada com o app | Só se o mobile for RN. Não é motivo suficiente (regra da task). | Nenhuma. | Nenhuma (Kotlin no Android nativo é próximo, mas não se aplica a RN/Flutter). |
| Operação | Container Node; memória baixa. | Container Python + worker. | JVM; memória maior em instância pequena. [HIP] |

Outras stacks (Rails, Laravel, .NET, Go) não foram avaliadas por falta de motivo forte nesta etapa.

Em qualquer das três, a fronteira de segurança deve ficar centralizada:
- um módulo `familia` que resolve o vínculo atual;
- consultas sempre filtradas por `family_id` vindo desse módulo, nunca do cliente;
- opcionalmente, RLS no PostgreSQL como defesa em profundidade, com `set_config` por transação.

[HIP]

## 7. Hospedagem e PostgreSQL gerenciado

Preços detalhados em [Preços datados](Precos_Datados.md).

- **Computação da API:**
  - Cloud Run tem cobrança por requisição com free tier mensal e instância mínima opcional.
  - Render, Railway e Fly.io oferecem instâncias mensais pequenas.
  - Todos rodam containers. A escolha afeta mais o custo fixo e a operação do que a arquitetura. [DOC]
- **PostgreSQL gerenciado:**
  - Supabase (Pro + compute);
  - Neon (por CU-hora e GB-mês; janela de restauração de 7 dias no Launch e 30 no Scale);
  - Cloud SQL (vCPU/memória; instâncias compartilhadas sem SLA);
  - RDS (backup grátis até 100% do armazenamento provisionado);
  - Render Postgres (PITR listado; backup lógico em instâncias pagas);
  - Fly Managed Postgres (a partir de US$ 38/mês).
  - [DOC]
- **Backups e restauração** são o critério que separa protótipo de produção para dado sensível. Antes de lançar:
  - definir RPO/RTO;
  - testar restauração completa (banco + objetos), porque backups de banco não cobrem storage de objetos em nenhum dos serviços olhados;
  - documentar quem consegue apagar backups.
  - [HIP]
- **Região:** preços capturados são de regiões dos EUA (us-central1/us-east). Os preços de São Paulo não foram capturados nesta rodada. [Questão aberta]

## 8. Autenticação

| Método | Observações |
| --- | --- |
| E-mail com link mágico/OTP | Sem senha para lembrar. Exige provedor de e-mail com boa entregabilidade. Firebase limita links a 5/dia no Spark. [DOC] [D13](#fontes) Supabase exige SMTP próprio. [DOC] [D21](#fontes) |
| Senha | Universal. Exige fluxo de recuperação e proteção contra força bruta. |
| Passkeys | Supabase: experimental/beta. [DOC] [D23](#fontes), [D24](#fontes) Auth0: "Passkeys" incluído em todos os planos. [DOC] [D60](#fontes) Firebase: não localizado. [HIP] Clerk e Cognito: não verificados nesta rodada. |
| Login social (Google etc.) | Aciona a diretriz 4.8 da App Store (abaixo). |

**App Store Review Guideline 4.8 (Login Services), texto vigente em 22/10/2026** [DOC] [D51](#fontes):

> Apps that use a third-party or social login service (such as Facebook Login, Google Sign-In, Log in with X, Sign In with LinkedIn, Login with Amazon, or WeChat Login) to set up or authenticate the user's primary account with the app must also offer as an equivalent option another login service with the following features: the login service limits data collection to the user's name and email address; the login service allows users to keep their email address private as part of setting up their account; and the login service does not collect interactions with your app for advertising purposes without consent.

Há exceções, entre elas o app que "exclusively uses your company's own account setup and sign-in systems".

Consequência:
- Se o app oferecer Google como conta principal, precisa oferecer uma alternativa com as três propriedades.
- Sign in with Apple é o caminho usual. A diretriz atual não o nomeia; confirmar na revisão. [HIP]
- Com apenas e-mail próprio (link/OTP/senha), a exigência não se aplica.

**Custo de provedores** (detalhe em [Preços datados](Precos_Datados.md)):
- Supabase Auth: 50 mil MAU no Free; 100 mil no Pro, depois US$ 0,00325/MAU.
- Firebase Auth: 50 mil MAU Tier 1 sem custo.
- Clerk: 50 mil MRU no Hobby.
- Auth0: Free até 25 mil MAU; Essentials US$ 35/mês para 500 MAU (B2C).
- Cognito: free tier de 10 mil MAU; Essentials US$ 0,015/MAU.
- Self-host: custo de infraestrutura e de engenharia.
- [DOC]

**Revogação** em qualquer provedor [HIP fundamentado em B05 e D29]:
- access token curto (5–15 min);
- refresh token revogável no servidor;
- checagem do vínculo na tabela a cada operação;
- claims nunca como fonte única de autorização de família.

## 9. Push

- **FCM HTTP v1**: sem custo; OAuth 2.0 de curta duração via conta de serviço; dados até 4 KB. [DOC] [D16](#fontes), [D17](#fontes), [D09](#fontes)
- **APNs por token**: chave `.p8` (team-scoped ou topic-specific). O token assinado precisa ser renovado "at least once an hour". [DOC] [D52](#fontes)
- **Expo Push Service** [DOC] [D53](#fontes), [D54](#fontes):
  - "no cost associated with sending notifications";
  - limite de **600 notificações/s por projeto**;
  - entrega "at-least-once" ao FCM/APNs, o que exige deduplicar por ID no app;
  - não guarda o conteúdo além da entrega;
  - recibos devem ser consultados ~15 min depois;
  - push não funciona no Expo Go desde o SDK 53.
- **OneSignal** [DOC] [D55](#fontes):
  - Free com push ilimitado só "for organizations with up to 1,000 monthly active users";
  - Growth a partir de US$ 19/mês, com push a US$ 0,012/MAU.
  - Com 20 mil MAU, só o push custaria ~US$ 240/mês. [HIP: cálculo]
- **Conteúdo**: a diretriz 4.5.4 diz que push "should not be used to send sensitive personal or confidential information". [DOC] [D51](#fontes) Desenho recomendado [HIP]:
  - texto genérico ("Há uma atualização na rotina da família") e somente IDs opacos no payload;
  - o app busca os detalhes depois de autenticado;
  - nada de nome do bebê, horário de mamada ou sintomas no corpo;
  - visibilidade privada na tela de bloqueio;
  - envio só a tokens registrados por membros com vínculo **atual**, removendo tokens na revogação;
  - nunca tópicos FCM por família.

## 10. Arquivos e mídia

- **Armazenamento:** R2, GCS, Supabase Storage, Cloud Storage for Firebase ou S3 (preços em [Preços datados](Precos_Datados.md); S3 não capturado).
- **URLs assinadas por escopo de família:**
  - chave de objeto `families/{family_id}/...`;
  - o servidor checa o vínculo atual antes de emitir a URL;
  - expiração curta;
  - bucket nunca público.
  - [HIP]
  - As presigned URLs do R2 valem de 1 s a 7 dias e cobrem uma operação num objeto. Não funcionam em domínio customizado. [DOC] [D56](#fontes)
  - No Supabase e no Firebase, a mesma regra vira política/regra de Storage. [DOC] [D19](#fontes)
- **EXIF:**
  - `sharp` remove todos os metadados por padrão, inclusive a orientação EXIF (`sharp` 0.35.5). [DOC] [D57](#fontes) [EXEC]
  - No Android, a localização em fotos fica oculta para o app sem `ACCESS_MEDIA_LOCATION`. [DOC] [D58](#fontes)
  - Não verifiquei se `expo-image-manipulator` (58.0.15 [EXEC]) remove EXIF ao recodificar; testar. [HIP]
  - Desenho recomendado: upload para prefixo de quarentena → função no servidor recodifica sem metadados → move para o prefixo da família → só então referencia no registro. [HIP]
- **Custo:**
  - armazenamento de fotos com premissa de 4 fotos/família/mês: < US$ 3/mês com 10 mil famílias em qualquer opção;
  - tráfego: R2 não cobra egress; GCS cobra US$ 0,12/GiB fora das cotas grátis.
  - [DOC]+[HIP]

## 11. Três conjuntos completos

O mobile fica em aberto ("RN/Expo ou Flutter") porque a escolha cabe à outra nota. Abaixo, o SDK real em cada caso.

### Conjunto A: BaaS documental (Firebase)

**Componentes:**
- Firestore (Standard), Firebase Auth (e-mail link + Sign in with Apple + Google), Cloud Storage for Firebase, FCM;
- Cloud Functions para convite, moderação, EXIF, push e conflitos;
- plano Blaze obrigatório.
- Mobile:
  - RN: `@react-native-firebase/{app,firestore,auth,storage,messaging}` 27.0.0, com development build/config plugin (não usar o JS SDK para dados);
  - Flutter: `firebase_core` 5.0.0, `cloud_firestore` 7.0.0, `firebase_auth` 7.0.0, `firebase_storage` 14.0.0, `firebase_messaging` 17.0.0 [EXEC].

**Do registro local à confirmação:**
1. O app grava o documento com ID do cliente no cache persistente do SDK nativo.
2. A UI mostra o estado pendente (`hasPendingWrites`).
3. Na reconexão, o SDK envia. As regras validam vínculo e versão.
4. A confirmação chega pelo listener (metadados sem pendência).
5. Rejeições aparecem como erro na escrita e o cache reverte. [DOC B01 + HIP]

**Conflitos e duplicidade:**
- Última escrita vence por padrão. Conflito explícito exige campo de versão, tombstone e checagem nas regras ou numa Function.
- ID do cliente evita duplicar. [DOC+HIP]

**Revogação:** as regras com `get()` do vínculo negam a próxima requisição; o cache local some só quando o app limpar. [HIP]

**Isolamento e comunidade:**
- rotina em `families/{id}/...` com regras por vínculo;
- comunidade em coleção separada, com regras e moderação próprias, sem referência a registros privados;
- Storage com prefixo por família.

**Conhecimento exigido:** modelagem documental, linguagem de regras, TypeScript/Node para Functions, IAM do GCP, SDK nativo via RN ou Flutter.

**Esforço:**
- Desenvolvimento inicial: o mais baixo para sync.
- Manutenção: regras e índices crescem com o produto; testes de regras com emulador.
- Operação: mínima.

**Saída:** a mais difícil (modelo documental, export em LevelDB/BigQuery, reescrita da camada de dados).

**Principal risco:** conflitos e autorização ficam espalhados em regras e Functions. Revogação e "exclusão versus edição" dependem de disciplina de modelagem, não da plataforma.

### Conjunto B: PostgreSQL gerenciado + camada de sync (Supabase + PowerSync)

**Componentes:**
- Supabase (Postgres, Auth, Storage, Edge Functions);
- PowerSync Cloud Pro (ou Open Edition self-host);
- endpoint de upload (Edge Function ou serviço próprio) com dedupe por ID de operação;
- SMTP próprio (Resend/Postmark/SES);
- push por FCM/APNs ou Expo Push.
- Mobile:
  - RN: `@powersync/react-native` 2.3.3 + `@op-engineering/op-sqlite` 18.2.5 (peer `>=17.1.0 <19`) + `@supabase/supabase-js` 2.118.0, com development build;
  - Flutter: `powersync` 2.5.0 + `supabase_flutter` 2.18.3 [EXEC].

**Do registro local à confirmação:**
1. O app grava no SQLite. A operação entra na fila de upload.
2. `uploadData()` chama o endpoint, que valida vínculo e versão em transação Postgres sob RLS ou checagem própria, e responde 2xx (com erro de domínio quando houver).
3. O cliente avança para o write checkpoint.
4. A confirmação chega quando o dado volta pelo stream de download. [DOC D25/D26]

**Conflitos e duplicidade:** LWW por campo por padrão; conflitos explícitos implementados no endpoint; dedupe pelo ID da operação. [DOC D26]

**Revogação:**
- apagar a linha de vínculo remove os buckets;
- o cliente apaga as linhas na próxima sync;
- uploads do revogado são rejeitados pelo endpoint/RLS;
- JWT curto. [DOC D27/D28/D29]

**Isolamento e comunidade:**
- RLS por família e Sync Streams equivalentes (devem espelhar a RLS);
- comunidade em esquema/tabelas separadas, possivelmente fora do sync offline (online-only);
- Storage com políticas por prefixo.

**Conhecimento exigido:** SQL/RLS, configuração de Sync Streams, backend do endpoint (TypeScript/Deno ou qualquer linguagem), SQLite no cliente, operação de dois fornecedores.

**Esforço:**
- Desenvolvimento: médio (endpoint + políticas espelhadas).
- Manutenção: manter RLS e Sync Streams coerentes.
- Operação: dois serviços gerenciados.

**Saída:**
- Postgres portátil.
- PowerSync tem self-host (FSL → Apache-2.0 após 2 anos).
- Trocar a camada de sync exige reescrever o acesso a dados no cliente, mas o esquema SQLite permanece.

**Principal risco:** dois fornecedores com planos gratuitos que pausam ou desativam por inatividade, e duas fontes de verdade de autorização (RLS e Sync Streams) que podem divergir.

### Conjunto C: API própria (monólito modular) + PostgreSQL + outbox/sync próprio

**Componentes:**
- API em NestJS, Django/DRF ou Spring Boot (seção 6);
- PostgreSQL gerenciado (Cloud SQL, Neon, RDS, Render ou Fly);
- object storage S3-compatível (R2 ou GCS) com URLs assinadas;
- fila/worker (pg-boss, Django tasks/Celery, JobRunr);
- auth própria (biblioteca do framework) ou provedor (Supabase Auth, Auth0, Cognito, Clerk);
- FCM/APNs direto ou Expo Push;
- e-mail transacional.
- Mobile:
  - RN: `expo-sqlite` 58.0.13 ou `op-sqlite` 18.2.5 + `drizzle-orm` 0.45.4;
  - Flutter: `drift` 2.35.2 [EXEC].

**Do registro local à confirmação:** outbox na mesma transação local → push em lote → resposta por operação → pull por cursor → reconciliação (seção 5.5).

**Conflitos e duplicidade:** sob controle total, com `op_id` único, `base_version`, tombstones e conflito como entidade visível. Exige construir e testar tudo.

**Revogação:** checagem do vínculo atual por operação. O servidor responde "revogado" e o cliente purga os dados da família. Tokens de push removidos na revogação.

**Isolamento e comunidade:**
- módulo de família como única fonte de escopo;
- comunidade como módulo separado, com contrato de API próprio e sem acesso ao módulo de rotina;
- RLS opcional como defesa em profundidade.

**Conhecimento exigido:** a linguagem do backend escolhido, SQL, desenho de protocolo de sync, SQLite no cliente, DevOps (deploy, backups, observabilidade, segurança).

**Esforço:**
- Desenvolvimento: o mais alto (protocolo + cliente de sync + painel de moderação).
- Manutenção: alta, mas sem limites de fornecedor.
- Operação: a maior responsabilidade.

**Saída:** a mais simples; tudo é padrão (Postgres, S3, OAuth/OIDC).

**Principal risco:** subestimar o sync próprio. Ordem, idempotência, migrações e revogação são as partes difíceis e aparecem tarde. O cronograma escorrega antes do custo de infraestrutura.

### Quadro-resumo (sem pontuação numérica)

| Aspecto | A (Firebase) | B (Supabase + PowerSync) | C (API própria) |
| --- | --- | --- | --- |
| Escrita offline durável | Sim, com SDK nativo (RNFirebase/FlutterFire) | Sim (SQLite + fila) | Sim, se bem construído |
| Conflito explícito | Construir sobre LWW | Construir no endpoint (LWW por padrão) | Construir (controle total) |
| Revogação com aparelho offline | Regras na reconexão + limpeza local pelo app | Buckets removidos + endpoint rejeita | Protocolo próprio |
| Fonte de autorização | Regras + Functions (Admin ignora regras) | RLS + Sync Streams (espelhadas) | Código da API (+ RLS opcional) |
| Dev build obrigatório em RN | Sim | Sim (op-sqlite) | Depende do SQLite escolhido; push já exige |
| Fornecedores críticos | 1 (Google) | 2 (Supabase, PowerSync) | 1–3 (nuvem, banco, storage) |
| Saída | Difícil | Média | Fácil |
| Custo ilustrativo de infra (100/1k/10k famílias), com fixos e sem o serviço de domínio | ~US$ 27 / 35 / 139 | ~US$ 101 / 121 / 214 | ~US$ 64 / 109 / 202 |

Critérios de desempate sugeridos [HIP]:
1. Prova prática dos cinco cenários de D5 num protótipo de cada finalista.
2. Quem vai operar o sistema em produção.
3. Custo de saída aceitável.
4. Prazo do primeiro lançamento.

## 12. Fatores que mudariam a escolha

- **Equipe sem experiência de operação/DevOps** → favorece A ou B.
- **Exigência de conflitos ricos** (merge por campo, histórico visível, auditoria) → favorece B ou C; o LWW do Firestore vira custo de modelagem.
- **Exigência regulatória ou contratual de hospedagem no Brasil ou de self-host** → favorece C ou B com PowerSync Open Edition e Supabase self-host. Conferir as limitações do self-host do Supabase.
- **Mudança de licença ou preço do PowerSync** (FSL hoje) ou fim do plano Pro de US$ 49 → reduz B. Mudanças de cota do Firestore → afetam A.
- **Web obrigatória com offline** → no Firestore a web usa outro SDK (IndexedDB). PowerSync tem Web SDK GA. No C, o cliente de sync precisa existir em mais uma plataforma.
- **Uso intenso de histórico/relatórios no app** → encarece A (leituras); B e C leem do SQLite local.
- **Escala >10 mil famílias com picos simultâneos** → limites padrão do PowerSync Pro (3.000 clientes simultâneos, 100 GB hospedados) podem forçar o Team (US$ 599+).
- **Decisão por Flutter ou por RN** → não muda a família de dados. Muda o SDK: RNFirebase e FlutterFire são equivalentes no offline; os SDKs PowerSync RN e Dart são ambos GA.

## 13. Questões abertas

1. Há requisito de residência de dados no Brasil? Os preços de `southamerica-east1`/`sa-east-1` não foram capturados.
2. A comunidade precisa funcionar offline ou pode ser online-only (fora do motor de sync)?
3. Qual RPO/RTO aceitável? Define PITR (US$ 100/mês no Supabase para 7 dias) versus só backups diários.
4. Login social é necessário no MVP? Sem ele, a diretriz 4.8 não se aplica.
5. Quem opera o backend em produção (Daniel sozinho?) e com qual disponibilidade?
6. Divergência na documentação PowerSync sobre idade máxima do JWT (60 min versus 24 h): confirmar em teste.
7. O Firebase Auth tem passkeys nativas? Não localizado; confirmar com o suporte ou em teste.
8. O `expo-image-manipulator` remove EXIF? Confirmar em teste. Recomenda-se remover no servidor de qualquer forma.

## 14. Limites desta análise

- Nada foi executado contra serviços reais: sem protótipo, benchmark ou teste de sync. As afirmações de comportamento são [DOC] ou [HIP].
- As versões [EXEC] refletem o registro de pacotes em 22/10/2026. Não testei compatibilidade cruzada além de `peerDependencies`. A versão do React Native suportada pelo Expo SDK 58 fica com a outra nota (npm `react-native` latest = 0.88.0; `expo` = 58.0.17).
- Alguns preços dependem de tabelas dinâmicas não capturadas: S3, regiões do Brasil e egress exato do Firestore. Foram marcados em [Preços datados](Precos_Datados.md).
- O custo de engenharia (horas) não está estimado. Ele domina a diferença entre os conjuntos nessas escalas.
- Não houve avaliação jurídica. Ver [Pesquisa de privacidade, legal e lojas](../Pesquisa_Privacidade_Legal_e_Lojas.md).

## Fontes

Todas consultadas em 22/10/2026. Os IDs B01–B10 e M11 seguem `tasks/hermes/APP-001-design-docs/08_FONTES_E_EVIDENCIAS.md`.

| ID | Fonte | Uso |
| --- | --- | --- |
| B01 | https://firebase.google.com/docs/firestore/manage-data/enable-offline | Persistência por plataforma, cache de 100 MB, última escrita vence |
| B02 | https://firebase.google.com/docs/firestore/manage-data/transactions | Transações falham offline |
| B03 | https://firebase.google.com/docs/firestore/security/rules-conditions | `get()`/`exists()`, limites de acesso |
| B04 | https://firebase.google.com/docs/firestore/pricing | Cobrança de listeners, regras, mínimo por consulta |
| B05 | https://supabase.com/docs/guides/database/postgres/row-level-security | RLS, `service_role`, views, JWT desatualizado |
| B07 | https://docs.powersync.com/integrations/supabase/rls-and-sync-streams | Sync Streams não se aplicam a uploads |
| B08 | https://supabase.com/pricing | Planos, pausa do Free |
| B09 | https://www.powersync.com/pricing | Planos, desativação do Free, limites |
| B10 | https://www.postgresql.org/docs/current/transaction-iso.html | Isolamento transacional (referência do pacote) |
| M11 | https://docs.expo.dev/guides/using-firebase/ | JS SDK × React Native Firebase no Expo |
| D01 | https://firebase.google.com/docs/web/environments-js-sdk | Firestore em React Native "(except persistence)" |
| D02 | https://rnfirebase.io/ | RNFirebase envolve SDKs nativos |
| D03 | https://rnfirebase.io/firestore/usage | Offline por padrão; opções de cache web-only; transações offline |
| D05 | https://github.com/firebase/flutterfire/blob/cb3cc4b6bed7aa0ca916d98abb11275fbfe0728f/packages/cloud_firestore/cloud_firestore/android/build.gradle#L63-L66 e https://github.com/firebase/flutterfire/blob/cb3cc4b6bed7aa0ca916d98abb11275fbfe0728f/packages/cloud_firestore/cloud_firestore/ios/cloud_firestore.podspec#L35 | FlutterFire depende dos SDKs nativos [CÓDIGO] |
| D06 | https://firebase.google.com/docs/flutter/setup | Requisitos de plataforma do FlutterFire |
| D08 | https://cloud.google.com/firestore/pricing | Preços Standard edition, PITR, backup |
| D09 | https://firebase.google.com/pricing | Spark/Blaze, FCM sem custo, Storage |
| D10 | https://firebase.google.com/docs/firestore/security/insecure-rules | Bibliotecas de servidor ignoram regras |
| D11 | https://firebase.google.com/docs/firestore/manage-data/export-import | Export gerenciado (LevelDB), BigQuery |
| D12 | https://firebase.google.com/docs/firestore/backups | Backups agendados, retenção até 14 semanas |
| D13 | https://firebase.google.com/docs/auth/limits | Limites de e-mail e SMS por plano |
| D14 | https://cloud.google.com/identity-platform/pricing | Preço por MAU acima de 50 mil |
| D15 | https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024 | Storage exige Blaze |
| D16 | https://firebase.google.com/docs/cloud-messaging/send/v1-api | FCM HTTP v1, OAuth 2.0 |
| D17 | https://firebase.google.com/docs/cloud-messaging/troubleshooting | 4 KB, descontinuação InstanceId/device groups (29/09/2027) |
| D18 | https://supabase.com/docs/guides/platform/backups | Retenção por plano, Storage fora do backup, PITR |
| D19 | https://supabase.com/docs/guides/storage/security/access-control | Políticas em `storage.objects` |
| D20 | https://supabase.com/docs/guides/self-hosting | Limitações do self-host |
| D21 | https://supabase.com/docs/guides/auth/auth-smtp | SMTP padrão não serve para produção |
| D22 | https://supabase.com/docs/guides/realtime | Recursos do Realtime |
| D23 | https://supabase.com/docs/guides/auth/passkeys | Passkeys experimental |
| D24 | https://supabase.com/docs/reference/dart/auth-signinwithpasskey | Passkeys BETA no Flutter |
| D25 | https://docs.powersync.com/handling-writes/writing-client-changes | Endpoint de upload, códigos de resposta |
| D26 | https://docs.powersync.com/handling-writes/handling-update-conflicts | Idempotência, ID por operação, LWW por campo |
| D27 | https://docs.powersync.com/sync/rules/parameter-queries | Revogação por linha de vínculo |
| D28 | https://docs.powersync.com/architecture/powersync-protocol | PUT/REMOVE e remoção no cliente |
| D29 | https://docs.powersync.com/configuration/auth/custom | JWT curto, sem revogação |
| D30 | https://docs.powersync.com/resources/usage-and-billing/reducing-usage | `disconnectAndClear()` |
| D31 | https://docs.powersync.com/resources/hipaa | Responsabilidades no aparelho |
| D32 | https://docs.powersync.com/client-sdks/reference/react-native-and-expo | op-sqlite, Expo Go |
| D33 | https://docs.powersync.com/resources/feature-status | Status GA/Beta |
| D34 | https://docs.powersync.com/intro/self-hosting | Open Edition e Enterprise Self-Hosted |
| D35 | https://github.com/powersync-ja/powersync-service/blob/main/LICENSE | FSL-1.1-ALv2 |
| D36 | https://electric.ax/docs/sync/guides/writes | Electric só leitura; padrões de escrita |
| D37 | https://electric.ax/pricing | Preço Electric Cloud |
| D38 | https://electric.ax/docs/sync/integrations/expo | Electric em Expo |
| D39 | https://zero.rocicorp.dev/docs/connection | Zero sem escrita offline |
| D40 | https://zero.rocicorp.dev/docs/status | Zero 1.0 e roadmap |
| D41 | https://zero.rocicorp.dev/docs/react-native | Zero em RN/Expo |
| D42 | https://replicache.dev/ | Replicache em manutenção |
| D43 | https://watermelondb.dev/docs/Sync/Intro | WatermelonDB: backend próprio |
| D44 | https://rxdb.info/rx-storage-sqlite.html | RxDB SQLite Premium |
| D45 | https://www.mongodb.com/docs/atlas/app-services/sync/device-sync-deprecation/ | Fim do Atlas Device Sync |
| D46 | https://docs.nestjs.com/security/authorization | `@nestjs/authorization` |
| D47 | https://www.django-rest-framework.org/api-guide/permissions/ | Limites de permissão por objeto |
| D48 | https://docs.djangoproject.com/en/6.1/topics/tasks/ | Tasks: backends só para dev/teste |
| D49 | https://docs.djangoproject.com/en/6.1/ref/contrib/admin/ | Admin como ferramenta interna |
| D50 | https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html | Method security |
| D51 | https://developer.apple.com/app-store/review/guidelines/ | 4.8 Login Services; 4.5.4 Push |
| D52 | https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns | APNs por token |
| D53 | https://docs.expo.dev/push-notifications/faq/ | Custo, 600/s, at-least-once, Expo Go |
| D54 | https://docs.expo.dev/push-notifications/sending-notifications/ | Tickets e recibos |
| D55 | https://onesignal.com/pricing | Push Free até 1.000 MAU; US$ 0,012/MAU |
| D56 | https://developers.cloudflare.com/r2/api/s3/presigned-urls/ | Presigned URLs R2 |
| D57 | https://sharp.pixelplumbing.com/api-output/ | Remoção de metadados por padrão |
| D58 | https://developer.android.com/training/data-storage/shared/media | Localização oculta sem `ACCESS_MEDIA_LOCATION` |
| D59 | https://supabase.com/docs/reference/javascript/storage-from-createsignedurl | URLs assinadas Supabase |
| D60 | https://auth0.com/pricing | Planos e passkeys Auth0 |
| D61 | https://docs.powersync.com/migration-guides/electric | Uso seguro de `disconnectAndClear()` |

Registros [EXEC] de versões, coletados em 22/10/2026 entre 06:00 e 06:35 UTC no Windows 11 com npm 11.19.0. A coluna de data significa coisas diferentes por registro:
- npm: `time.modified` do pacote, não necessariamente a data da versão;
- pub.dev e PyPI: publicação da versão;
- Maven: `lastUpdated` do metadata;
- GitHub: `published_at` da release.

Comandos: `npm view <p> version time.modified license --json`, `npm view <p> peerDependencies dist-tags`, `curl https://pub.dev/api/packages/<p>`, `curl https://pypi.org/pypi/<p>/json`, `curl https://repo1.maven.org/maven2/<g>/<a>/maven-metadata.xml`, `curl https://dl.google.com/android/maven2/com/google/firebase/firebase-bom/maven-metadata.xml` e `curl https://api.github.com/repos/<r>/releases/latest|license`.

Os `peerDependencies` relevantes foram consultados com `npm view`:
- `@powersync/react-native` 2.3.3 exige `@op-engineering/op-sqlite >=17.1.0 <19.0.0` e `@powersync/common ^2.4.0`;
- `@powersync/op-sqlite` 0.9.16 exige op-sqlite `^13 || ^14 || ^15`;
- `@react-native-firebase/app` 27.0.0 exige `expo >=47.0.0` (opcional) e `react-native >=0.60.0-0`;
- `prisma` tem dist-tags `latest` 8.0.0-rc.24 e `prev` 7.10.1.

| Pacote/artefato | Versão | Data (publicação ou modificação) | Licença declarada | Registro |
| --- | --- | --- | --- | --- |
| `@nestjs/core` | 12.2.0 | 2026-10-19 | MIT | npm |
| `bullmq` | 6.4.0 | 2026-10-21 | MIT | npm |
| `@electric-sql/client` | 1.5.28 | 2026-09-09 | Apache-2.0 | npm |
| `@electric-sql/react` | 1.0.57 | 2026-09-09 | Apache-2.0 | npm |
| `@nozbe/watermelondb` | 0.28.0 | 2025-07-24 | MIT | npm |
| `@tanstack/db` | 0.15.2 | 2026-10-21 | MIT | npm |
| `@nestjs/bullmq` | 12.0.0 | 2026-08-27 | MIT | npm |
| `rxdb` | 17.6.0 | 2026-10-05 | Apache-2.0 | npm |
| `pg-boss` | 12.38.0 | 2026-10-13 | MIT | npm |
| `@casl/ability` | 7.0.2 | 2026-10-15 | MIT | npm |
| `sharp` | 0.35.5 | 2026-09-27 | Apache-2.0 | npm |
| `expo-image-manipulator` | 58.0.15 | 2026-10-19 | MIT | npm |
| `prisma` | 8.0.0-rc.24 | 2026-10-21 | Apache-2.0 | npm |
| `drizzle-orm` | 0.45.4 | 2026-10-21 | Apache-2.0 | npm |
| `expo-image-picker` | 58.0.10 | 2026-10-15 | MIT | npm |
| `onesignal-expo-plugin` | 2.7.2 | 2026-10-02 | MIT | npm |
| `react-native-onesignal` | 5.5.15 | 2026-10-13 | MIT | npm |
| `resend` | 6.34.1 | 2026-10-16 | MIT | npm |
| `@aws-sdk/client-s3` | 3.1155.0 | 2026-10-21 | Apache-2.0 | npm |
| `@powersync/react-native` | 2.3.3 | 2026-10-20 | Apache-2.0 | npm |
| `@rocicorp/zero` | 1.11.2 | 2026-10-21 | Apache-2.0 | npm |
| `@nestjs/authorization` | 0.1.0 | 2026-10-08 | MIT | npm |
| `@nestjs/authentication` | 0.1.1 | 2026-10-12 | MIT | npm |
| `@nestjs/schedule` | 12.0.2 | 2026-09-14 | MIT | npm |
| `@nestjs/testing` | 12.2.0 | 2026-10-19 | MIT | npm |
| `expo` | 58.0.17 | 2026-10-21 | MIT | npm |
| `@react-native-firebase/app` | 27.0.0 | 2026-10-19 | Apache-2.0 | npm |
| `@react-native-firebase/auth` | 27.0.0 | 2026-10-19 | Apache-2.0 | npm |
| `expo-sqlite` | 58.0.13 | 2026-10-15 | MIT | npm |
| `@react-native-firebase/firestore` | 27.0.0 | 2026-10-19 | Apache-2.0 | npm |
| `@react-native-firebase/messaging` | 27.0.0 | 2026-10-19 | Apache-2.0 | npm |
| `firebase` | 13.1.0 | 2026-10-21 | Apache-2.0 | npm |
| `@react-native-firebase/storage` | 27.0.0 | 2026-10-19 | Apache-2.0 | npm |
| `expo-dev-client` | 58.0.14 | 2026-10-21 | MIT | npm |
| `expo-notifications` | 58.1.6 | 2026-10-21 | MIT | npm |
| `react-native` | 0.88.0 | 2026-10-21 | MIT | npm |
| `@journeyapps/react-native-quick-sqlite` | 2.5.2 | 2026-04-13 | MIT | npm |
| `@powersync/web` | 2.5.0 | 2026-10-20 | Apache-2.0 | npm |
| `@op-engineering/op-sqlite` | 18.2.5 | 2026-09-20 | MIT | npm |
| `@powersync/op-sqlite` | 0.9.16 | 2026-08-04 | Apache-2.0 | npm |
| `@powersync/common` | 2.4.0 | 2026-10-20 | Apache-2.0 | npm |
| `replicache` | 15.3.0 | 2026-05-22 | https://roci.dev/terms.html | npm |
| `@supabase/supabase-js` | 2.118.0 | 2026-10-20 | MIT | npm |
| `typeorm` | 1.1.2 | 2026-10-21 | MIT | npm |
| `@nestjs/platform-express` | 12.2.0 | 2026-10-19 | MIT | npm |
| `@powersync/adapter-sql-js` | 0.0.26 | 2026-10-20 | Apache-2.0 | npm |
| `cloud_firestore` | 7.0.0 | 2026-10-15 |  | pub.dev |
| `firebase_core` | 5.0.0 | 2026-10-15 |  | pub.dev |
| `firebase_auth` | 7.0.0 | 2026-10-15 |  | pub.dev |
| `firebase_messaging` | 17.0.0 | 2026-10-15 |  | pub.dev |
| `firebase_storage` | 14.0.0 | 2026-10-15 |  | pub.dev |
| `powersync` | 2.5.0 | 2026-10-19 |  | pub.dev |
| `supabase_flutter` | 2.18.3 | 2026-10-12 |  | pub.dev |
| `drift` | 2.35.2 | 2026-10-07 |  | pub.dev |
| `sqflite` | 2.4.5 | 2026-10-21 |  | pub.dev |
| `sqlite3` | 3.7.1 | 2026-10-13 |  | pub.dev |
| `firebase_data_connect` | 0.4.0 | 2026-10-15 |  | pub.dev |
| `Django` | 6.1.2 | 2026-10-06 | BSD-3-Clause | PyPI |
| `djangorestframework` | 3.18.3 | 2026-10-06 | BSD-3-Clause | PyPI |
| `django-guardian` | 3.5.2 | 2026-10-20 | BSD-2-Clause | PyPI |
| `rules` | 3.5 | 2024-09-02 | MIT | PyPI |
| `celery` | 5.6.3 | 2026-03-26 | BSD-3-Clause | PyPI |
| `django-tasks` | 0.12.0 | 2026-02-06 | BSD-3-Clause | PyPI |
| `org.springframework.boot:spring-boot` | 4.1.1 (GA; release tag 4.2.0-M2) | meta 2026-09-24 |  | Maven |
| `org.springframework.security:spring-security-core` | 7.1.1 (GA; 7.2.0-M2) | meta 2026-09-24 |  | Maven |
| `org.springframework.modulith:spring-modulith-core` | 2.1.1 (GA; 2.2.0-M2) | meta 2026-09-24 |  | Maven |
| `org.jobrunr:jobrunr` | 9.0.2 | meta 2026-10-20 |  | Maven |
| `org.quartz-scheduler:quartz` | 2.5.2 | meta 2025-12-01 |  | Maven |
| `com.powersync:core (Kotlin)` | 1.15.2 | meta 2026-09-28 |  | Maven |
| `com.google.firebase:firebase-bom` | 35.1.0 | meta 2026-10-21 |  | Maven |
| `firebase/firebase-ios-sdk` | 13.1.0 | 2026-10-21 |  | GitHub |
| `invertase/react-native-firebase` | v27.0.0 | 2026-10-19 | NOASSERTION (GitHub) | GitHub |
| `powersync-ja/powersync-service` | v1.27.1 | 2026-10-21 | FSL-1.1-ALv2 (LICENSE); GitHub: NOASSERTION | GitHub |
| `powersync-ja/powersync-swift` | 1.16.4 | 2026-10-08 |  | GitHub |
| `powersync-ja/powersync-kotlin` | v1.15.2 | 2026-09-28 |  | GitHub |
| `powersync-ja/powersync-js` | — |  | Apache-2.0 | GitHub |
| `electric-sql/electric @core/sync-service` | 1.8.1 | 2026-09-07 | Apache-2.0 | GitHub |
| `rocicorp/mono (zero)` | zero/v1.11.2 (canary v1.12.0-canary.5) |  | Apache-2.0 | GitHub |
| `supabase/supabase` | v1.26.08 | 2026-08-07 | Apache-2.0 | GitHub |
| `firebase/flutterfire main` | cb3cc4b6bed7 | 2026-10-21 |  | GitHub |
