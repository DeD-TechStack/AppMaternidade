---
tipo: design-doc
status: proposal
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
tarefa: MAT-7
adr: ADR-002, ADR-003
fontes_principais:
  - 08_Referencias/Tecnologias/Mobile_e_Plataformas.md (103 sources, consulted 22/10/2026)
  - 08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md (consulted 22/10/2026)
  - 08_Referencias/Tecnologias/Precos_Datados.md (snapshot from 22/10/2026)
  - tasks/hermes/APP-001-design-docs/02_PESQUISA_TECNOLOGIAS.md (tie-breaking criteria)
  - https://supabase.com/docs/guides/platform/regions (consulted 22/10/2026)
  - https://docs.powersync.com/integrations/supabase/guide (consulted 22/10/2026)
  - https://docs.powersync.com/resources/feature-status (consulted 22/10/2026)
  - https://docs.powersync.com/client-sdks/advanced/data-encryption (consulted 22/10/2026)
---

# Architecture comparison

> Note from 03/11/2026: the direction changed to a full website first and an Android and iOS port later ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)). Where this text talks about a native app, read it as the port; the website covers the same functions.

Hermes's proposal. No technology is approved and nothing has been built or measured: the comparisons come from official documentation, from queries to the package registries and from inferences marked as [HIP]. The decision rests with [ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md) and [ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md), which depend on Daniel and on the technical proof (MAT-17).

Package rules followed here:

- Choose based on the product and on maintenance, not on familiarity, on use in a reference repository or on earlier suggestions (React Native + Spring Boot and Flutter + Firebase were mentioned before and are not approved).
- Do not couple Flutter to Firebase or React Native to a TypeScript backend for convenience: mobile and data have their own justifications.
- Name the actual SDK of each combination. Offline persistence documented for a native SDK does not automatically apply to a JavaScript library in React Native.

## 1. What the architecture needs to solve

| Need | Where it is specified |
| --- | --- |
| Record without a connection, survive the app being closed, resend without duplicating | [Offline, synchronization and timers](Offline_Sincronizacao_e_Temporizadores.md), sections 2 to 6 |
| Explicit conflicts between caregivers; nothing disappears without warning | Same document, section 7 |
| Revocation re-evaluated on the server, with local cleanup | Same document, section 11; [ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md) |
| Isolation between families in queries, sync, files and push | [Data model and permissions](Modelo_de_Dados_e_Permissoes.md), section 6 |
| Community with no path to the routine | Same document, sections 2 and 6 |
| Timer with no process running, visible outside the app | [Offline and timers](Offline_Sincronizacao_e_Temporizadores.md), section 9 |
| Android and iOS from a Windows environment, with no Mac today | [Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md), section 9 |
| Small team: few languages, few vendors, possible exit | This document, section 5 |
| Web in three separate roles | [ADR-001](../06_ADRs/ADR-001_Plataformas_e_Web.md) |

## 2. Criteria

Priorities suggested in the package (`02_PESQUISA_TECNOLOGIAS.md`, section 4), used without a summed score:

1. Integrity and recovery of offline records.
2. Authorization and separation between families and community.
3. Recording and history experience on Android and iOS.
4. Feasibility of building, debugging and testing iOS from the available environment.
5. Team effort and dependency maintenance.
6. Operations and total cost, including moderation.
7. Exporting data and replacing vendors.
8. Actually necessary role of the web.

## 3. Pieces evaluated and pieces discarded

### Mobile

Five alternatives compared in [Mobile and platforms](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md). Versions checked in the official registries on 22/10/2026 [EXEC E1 to E8 of that note]: Expo SDK 58 (`expo` 58.0.17) with React Native 0.88.0; Flutter 3.47.7 with Dart 3.13.5; Kotlin 2.4.21 and Compose Multiplatform 1.12.2; Xcode 27.1 with Swift 6.4.

| Alternative | Status | Main reason |
| --- | --- | --- |
| React Native + Expo | Recommended (ADR-002) | Compiles, signs, installs on the iPhone and submits to TestFlight from Windows in an integrated flow, via EAS Build and EAS Submit (https://docs.expo.dev/faq/). The others reach TestFlight through macOS CI, with the pipeline assembled separately ([Mobile and platforms, 2.1](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md)). Live Activity on iOS with the official package `expo-widgets`, without Swift (https://docs.expo.dev/versions/latest/sdk/widgets/). |
| Flutter | Main alternative | Mature persistence (drift) and Android timer ready-made in the notifications plugin; compiles iOS only on macOS (https://docs.flutter.dev/platform-integration/ios/setup): without its own Mac, via macOS CI and TestFlight. Requires Swift in the Live Activity extension (https://pub.dev/packages/live_activities). |
| KMP with native UI | Conditional | Good if there is iOS expertise. Has two UIs; compiles on macOS and, in practice, requires a Mac to write and test the Swift UI [HIP] (https://kotlinlang.org/docs/multiplatform/quickstart.html). |
| KMP + Compose Multiplatform | Out for now | Compiles on macOS (Mac or CI); documented accessibility gaps on iOS (https://kotlinlang.org/docs/multiplatform/compose-ios-accessibility.html). |
| Native Swift + Kotlin | Out for now | Two complete apps and two implementations of the offline protocol for a small team. |

### Data and synchronization

| Piece | Status | Reason |
| --- | --- | --- |
| Firestore with native SDK (React Native Firebase or FlutterFire) | Stack A | Offline by default in the native SDKs; last write wins (https://firebase.google.com/docs/firestore/manage-data/enable-offline). |
| Firebase JS SDK in React Native | Discarded for data | The official environments table marks Firestore in React Native as "except persistence" (https://firebase.google.com/docs/web/environments-js-sdk). |
| PowerSync (PostgreSQL ↔ SQLite) | Stack B | Local upload queue to an endpoint of ours; download via Sync Streams; removal on the device when access is lost (https://docs.powersync.com/handling-writes/writing-client-changes, https://docs.powersync.com/architecture/powersync-protocol). |
| Own synchronization (outbox and cursor-based pull) | Stack C | Full control, more effort. |
| ElectricSQL | Discarded on its own | Read-only: "does not do write-path sync" (https://electric.ax/docs/sync/guides/writes). |
| Zero | Discarded | "Zero does not support offline writes" (https://zero.rocicorp.dev/docs/connection). |
| Replicache | Discarded | In maintenance mode (https://replicache.dev/). |
| Atlas Device Sync (Realm) | Discarded | Shut down in 30/09/2025 (https://www.mongodb.com/docs/atlas/app-services/sync/device-sync-deprecation/). |
| WatermelonDB, RxDB | Discarded for now | More than a year without an npm release; production SQLite only in the paid version, respectively (data note, section 5.4). |

## 4. Three complete stacks

Each stack includes app, local database, synchronization, server, authentication, files, push, email, website and dashboard. Mobile appears as React Native + Expo in order to compare only the data part; Flutter works in all three with the equivalent SDKs indicated.

### Stack B — Managed PostgreSQL + PowerSync + own domain service (recommended)

| Piece | Choice and actual SDK |
| --- | --- |
| App | React Native 0.88 with Expo SDK 58, TypeScript, development build via EAS (Expo Go does not work) |
| Local database | SQLite managed by `@powersync/react-native` 2.3.3 (GA), which uses `@op-engineering/op-sqlite` (support marked as Beta, "production-ready for tested use cases") and allows SQLCipher (https://docs.powersync.com/client-sdks/reference/react-native-and-expo, https://docs.powersync.com/resources/feature-status, https://docs.powersync.com/client-sdks/advanced/data-encryption) |
| Synchronization | PowerSync Cloud, BR region (https://docs.powersync.com/integrations/supabase/guide): download via Sync Streams filtered by the active link; upload queue to the domain service |
| Server | Own domain service (modular monolith in a container): receives all care writes, invitations, community, moderation, export, deletion and push |
| Remote database | Supabase PostgreSQL in the sa-east-1 region, São Paulo (https://supabase.com/docs/guides/platform/regions), with schemas separated by context and RLS denying direct writes from clients |
| Authentication | Supabase Auth with a one-time code by email, sent via our own SMTP (the default SMTP is not suitable for production) |
| Files (after the MVP) | Supabase Storage with a per-family prefix and short-lived URLs issued by the service |
| Push | FCM and APNs, directly or via Expo Push Service (open decision) |
| Web | Static website; internal web dashboard talking to the domain service |

### Stack A — Firebase

| Piece | Choice and actual SDK |
| --- | --- |
| App | React Native + Expo with `@react-native-firebase/*` 27.0.0 (native SDK, development build), or Flutter with FlutterFire (`cloud_firestore` 7.0.0) |
| Local database and synchronization | Persistent cache of the Firestore native SDK; last write wins; transactions fail offline |
| Server | Cloud Functions for invitations, conflicts, moderation, EXIF and push |
| Authorization | Security rules reading the link document; Functions with the Admin SDK bypass the rules and need their own checks |
| Authentication, files, push | Firebase Auth, Cloud Storage for Firebase, FCM |
| Web | Static website; own dashboard |

### Stack C — Own API + managed PostgreSQL + own synchronization

| Piece | Choice and actual SDK |
| --- | --- |
| App | React Native + Expo with `expo-sqlite` 58 (SQLCipher via config plugin) or `op-sqlite`; Flutter with drift |
| Synchronization | Built by the project: outbox, batch upload, cursor-based pull, tombstones, local purge on revocation |
| Server | Modular monolith in a container; managed PostgreSQL (Supabase, Neon, Cloud SQL, RDS or another) |
| Authentication | Framework library or external provider |
| Files, push, email, web | Object storage with signed URLs; FCM and APNs; email provider; static website and dashboard |

### How each stack handles the hardest scenarios

| Scenario | Stack B (recommended) | Stack A (Firebase) | Stack C (own API) |
| --- | --- | --- | --- |
| Q-02 resend without duplicating | The service deduplicates by operation id; PowerSync sends operations with an id and requires an idempotent endpoint (https://docs.powersync.com/handling-writes/handling-update-conflicts) | Id generated on the device avoids duplicating the creation | Built by the project |
| Q-04 explicit conflict | Implemented in the service (base version, per-field merge, pending proposal) | Build on top of "última escrita vence". A write rejected by the rules is rolled back in the local cache [DOC B01 + HIP, data note]; showing the lost version after an app restart needs proof | Implemented in the service |
| Q-05 offline revocation | The service rejects the upload; the deleted link removes the family's data from the buckets and the client removes it on the next synchronization (https://docs.powersync.com/sync/rules/parameter-queries) | Rules deny on reconnection; clearing the cache is app code | Own protocol responds "acesso encerrado" and the app purges |
| Q-06 isolation in the sync channel | Two authorities to keep consistent: the service (writes) and the Sync Streams (reads); tests on both | Per-collection rules; Functions need their own checks | One authority: the service |
| Q-07 separate community | Own schema, outside sync, with no database permission over the care tables | Separate collections with their own rules | Separate module and schema |

## 5. Assessment by criteria

No summed score. "Forte", "adequado" and "fraco" with the reason.

| Criterion | Stack B (recommended) | Stack A (Firebase) | Stack C (own API) |
| --- | --- | --- | --- |
| 1. Offline integrity | **Strong:** local SQLite and queue ready-made; idempotent endpoint | **Adequate:** native SDK cache; persistence of pending writes after restart to be confirmed | **Strong if well built; high risk of error** |
| 2. Authorization and separation | **Adequate:** writes centralized in the service; reads in the Sync Streams need to mirror the rules | **Adequate:** per-document rules; logic spread between rules and Functions | **Strong:** a single authority |
| 3. Recording and history experience | **Strong:** local reads, history with no network cost | **Adequate:** reads from cache; long history generates billed reads | **Strong:** local reads |
| 4. iOS from Windows | Same in all three: decided by mobile (ADR-002) | Same | Same |
| 5. Effort and maintenance | **Adequate:** build the domain service and maintain the Sync Streams; two vendors | **Strong at first, weak later:** little initial code; rules and indexes grow | **Weak:** own protocol and sync client |
| 6. Operations and cost | **Adequate:** higher fixed cost at the start (section 6) | **Strong:** the cheapest at all three scales | **Adequate:** more self-run operations |
| 7. Export and exit | **Adequate:** portable PostgreSQL; PowerSync has a self-hostable open edition (FSL-1.1-ALv2 license, which becomes Apache-2.0 after two years: https://github.com/powersync-ja/powersync-service/blob/main/LICENSE); leaving PowerSync leads to Stack C | **Weak:** document model and rewrite of the data layer | **Strong:** everything standard |
| 8. Role of the web | **Strong:** PowerSync has a GA Web SDK, if there is ever a web app | **Adequate:** another SDK on the web | **Adequate:** one more sync client |
| Data in Brazil | **Strong:** Supabase sa-east-1 and PowerSync BR region | São Paulo region to be confirmed at this stage | Depends on the chosen provider |

## 6. Illustrative costs

Snapshot from 22/10/2026, in USD per month, excluding taxes, including EAS Starter and the prorated Apple annual fee. Illustrative scenarios, not a demand forecast. Assumptions in [Dated prices](../08_Referencias/Tecnologias/Precos_Datados.md), section 10.

| Families | Stack B recommended, with the domain service | Stack B, infrastructure only | Stack A (Firebase) | Stack C (own API on Cloud Run) |
| ---: | ---: | ---: | ---: | ---: |
| 100 | ~108 to 126 | ~101 | ~27 | ~64 |
| 1.000 | ~128 to 146 | ~121 | ~35 | ~109 |
| 10.000 | ~238 to 298 | ~214 | ~139 | ~202 |

The first column is the canonical composition of the recommended stack ([Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md), section 2): it adds the domain service container to the research values. No column includes PITR (+US$ 100/month, recommended in production) or staging (+US$ 10 to 50/month). At these scales, the infrastructure difference between the stacks is small compared with the engineering cost, which has not been estimated [HIP].

## 7. Provisional recommendation

**Stack B with React Native + Expo.** Justification based on the app's needs:

1. **The write protocol is ours from day one.** Idempotency, checking the current link, base version, explicit conflicts and history live in the domain service, which is the same contract PowerSync requires of the upload endpoint (https://docs.powersync.com/handling-writes/writing-client-changes). This meets ADR-004 and ADR-005 without fighting a "última escrita vence" policy.
2. **The most laborious and least differentiating part comes ready-made:** local database, durable queue, partial per-family download and removal on the device when access is lost.
3. **Planned exit:** the PostgreSQL schema and the service are the same as in Stack C. If PowerSync fails the proof, or changes its price or license, only the download and the client queue are replaced.
4. **Data in Brazil:** Supabase in São Paulo and PowerSync in the BR region reduce international transfer of care data (analysis in [Privacy and security](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md)).
5. **Mobile:** React Native + Expo closes the iOS loop from Windows in an integrated flow and builds the Live Activity without Swift; full justification in [ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md), independent of the data choice (PowerSync also has a GA SDK for Flutter).

The domain service's language is a separate decision (ADR-003, section "Linguagem do serviço"); it does not follow from using React Native.

## 8. Main alternative and conditions for switching

| Axis | Main alternative | Switch to it if |
| --- | --- | --- |
| Data | Stack C (same PostgreSQL and same service, own synchronization) | PowerSync fails proofs P1, P2, P4 or P5; revocation does not remove the data from the device as documented; the license or price changes; Sync Streams and the service cannot be kept consistent through tests |
| Mobile | Flutter | The team gets a Mac, or accepts macOS CI and Swift in the Live Activity, and the proof's tie-breaker favors Flutter; `expo-widgets` does not meet needs; accessibility with font at 200% fails in React Native; EAS pricing or terms change |
| Entire stack | Stack A (Firebase) | Very short pilot deadline, accepting simplified conflicts and a difficult exit; only with an explicit decision by Daniel |

Other factors that would change the recommendation:

- A requirement to host everything in Brazil under our own control: Stack C, or Stack B with self-hosted PowerSync and Supabase.
- Someone with Swift joining: KMP with native UI becomes a candidate.
- A web app for caregivers in the MVP: strengthens React Native and Stack B (PowerSync Web SDK).
- Scale beyond the limits of the PowerSync Pro plan (3.000 concurrent clients and 100 GB, according to the data note): re-evaluate the cost of the Team plan or self-hosting.

## 9. What the technical proof needs to show

Proofs P1 to P9 are in [Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md), section 7. For this comparison, the decisive ones are:

- P1 and P2 with PowerSync and the service: the queue survives the app being closed; resending does not duplicate.
- P4: offline revocation removes the family's data from the device on reconnection.
- P5: Sync Streams and the service reject the same things (tests with ids from another family on both paths).
- P6 and P7: `expo-widgets` and the Kotlin timer module work; the iOS build goes from Windows all the way to TestFlight.
- SQLCipher active in the release build (check with `PRAGMA cipher_version`, since the key can be silently ignored when the library is not in the binary).

## Open questions

1. Language of the domain service (ADR-003).
2. Expo Push Service or FCM and APNs directly.
3. Firestore region in São Paulo and prices for the Brazil regions: not captured at this stage.
4. Discrepancy in the PowerSync documentation about the maximum JWT validity (60 minutes or 24 hours): confirm in the proof.

## Limits of this analysis

Nothing has been installed, built or measured. Behaviors come from official documentation or are inferences [HIP]; versions and prices are from 22/10/2026 and change quickly. The engineering cost has not been estimated.
