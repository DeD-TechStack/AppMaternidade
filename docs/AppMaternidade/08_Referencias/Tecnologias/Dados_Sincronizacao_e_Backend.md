---
tipo: technology-research
status: draft
responsavel: Hermes (data and backend subagent)
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

# Data, synchronization and backend: options for AppMaternidade

Research note from APP-001 (D4 and D5) on remote databases, offline synchronization, authentication, push, files, email and operations. Full prices and cost scenarios are in [Dated prices](Precos_Datados.md). Conventions follow [Conventions](../../00_Inicio/Convencoes.md). Mobile frameworks, the iOS/Windows path, Live Activities and test farms are covered in the other subagent's note. Here I only mention what changes the data choice.

This document is research, not a decision. Nothing here has been approved by Daniel.

## Resumo

- **Firestore offline support depends on the actual SDK.** The native Android and Apple SDKs persist to disk by default. FlutterFire and React Native Firebase use these native SDKs. The Firebase JS SDK in React Native/Expo Go **has no Firestore persistence**. The official environments table says "except persistence" for React Native. [DOC] ([D01](#fontes), [D03](#fontes))
- **Firestore resolves concurrency with "last write wins"** and transactions fail offline. Explicit conflicts (two offline edits; deletion versus editing) must be modeled by the app. [DOC] ([B01](#fontes), [B02](#fontes))
- **PowerSync** is the PostgreSQL↔SQLite layer that best fits the offline write requirement. The local queue is sent to **an API you write**, and the backend decides conflicts and authorization. The service license is FSL-1.1-ALv2: unrestricted use except to compete with the product, and each version becomes Apache-2.0 after two years. The client SDKs are Apache-2.0. [DOC][EXEC]
- **ElectricSQL** only synchronizes reads ("does not do write-path sync"). **Zero** reached version 1.x, but **does not support offline writes**. **Replicache** is in maintenance mode. None of the three meets the durable offline record requirement on its own. [DOC]
- **Authorization must be reevaluated on the server for every operation.** Supabase itself warns that the JWT "is not always up-to-date" until refreshed. [DOC] ([B05](#fontes))
- **Three coherent stacks** (details in [section 11](#11-três-conjuntos-completos)):
  - A: Firebase with a native SDK.
  - B: Supabase with PowerSync.
  - C: Custom API (modular monolith) with PostgreSQL and a custom outbox/sync.
- **Illustrative infrastructure cost** using the assumptions in [Dated prices](Precos_Datados.md). Does not include the domain service in the recommendation, PITR or staging; the composition of the recommended stack is in [Costs and operations](../../05_Privacidade_Operacao/Custos_e_Operacao.md), section 2:

  | Families | Cost range | A | B | C |
  | ---: | --- | ---: | ---: | ---: |
  | 100 | ~US$ 27–101/month | US$ 27 | US$ 101 | US$ 64 |
  | 1.000 | ~US$ 35–121/month | US$ 35 | US$ 121 | US$ 109 |
  | 10.000 | ~US$ 139–214/month | US$ 139 | US$ 214 | US$ 202 |

  The amounts include EAS Starter and Apple Developer Program. The difference between stacks is small compared with the engineering cost. [HIP]

## 1. Scope, method and evidence

- Access date: 22/10/2026 (America/Sao_Paulo). Prices in USD, excluding taxes and currency conversion.
- [EXEC] versions were collected on 22/10/2026 between ~06:00 and 06:35 UTC (03:00–03:35 BRT), on Windows 11 with npm 11.19.0. Version sources:
  - `npm view <pacote> version time.modified license`;
  - Public APIs from pub.dev (`/api/packages/<p>`) and PyPI (`/pypi/<p>/json`);
  - `maven-metadata.xml` from Maven Central and Google Maven;
  - GitHub REST (`/releases/latest`, `/license`, `/commits/main`).
- Nothing was installed, no accounts were created and no services were purchased.
- Classes [DOC], [EXEC], [CÓDIGO] and [HIP] follow the conventions. A feature not being mentioned on a page does not prove it is absent.

## 2. Requirements guiding the comparison

The requirements come from `01_TASK_HERMES.md` (D4/D5) and the task context:

1. Essential records created and edited offline, persisted on the device and sent later without loss or duplication (idempotency).
2. Explicit conflicts: two offline edits to the same record; deletion versus editing.
3. Membership revocation with an offline device. The server reevaluates **current** authorization for every operation; a list of families inside the JWT is not enough.
4. Isolation between families in queries, writes, files, sync channels and notifications.
5. Community separate from the private routine.
6. Export, deletion, backups and logs without sensitive content.
7. Baby routine data treated as potentially sensitive (health). The legal analysis is in [Privacy, legal and app stores research](../Pesquisa_Privacidade_Legal_e_Lojas.md).

## 3. Firebase / Cloud Firestore

### 3.1 What each SDK actually provides offline

| Actual runtime | Firestore persistence on disk | Survives process termination? | Build requirements | Verified version [EXEC] |
| --- | --- | --- | --- | --- |
| Native Android SDK | Enabled by default; default cache limit of 100 MB, configurable. [DOC] [B01](#fontes) | Likely. The cache is on disk [DOC]. The page does not explicitly say that pending writes survive a restart; the inference is strong, but validate it in the prototype. [HIP] | Gradle/BoM | `com.google.firebase:firebase-bom` 35.1.0 (Google Maven, updated on 21/10/2026) |
| Native Apple SDK | Enabled by default. [DOC] [B01](#fontes) | Likely (as on Android). [HIP] | SPM/CocoaPods | `firebase-ios-sdk` 13.1.0 (release from 21/10/2026) |
| FlutterFire (`cloud_firestore`) | Same persistence as the native SDK, because the plugin depends on the native SDKs (see below). [CÓDIGO] [D05](#fontes) | Inherits native behavior. [CÓDIGO]+[HIP] | Flutter project with Android/iOS; iOS 15+ and Android 7.0+ according to the guide. [DOC] [D06](#fontes) | `cloud_firestore` 7.0.0, `firebase_core` 5.0.0 (pub.dev, 15/10/2026) |
| React Native Firebase (`@react-native-firebase/firestore`) | Enabled by default. "IndexedDB persistence and `memoryLocalCache` / `persistentLocalCache` are web only. Native persistence is controlled by the iOS/Android Firestore SDK." [DOC] [D03](#fontes) | Inherits native behavior. [DOC] [D02](#fontes) + [HIP] | Native code. **Does not work in Expo Go**; requires `expo-dev-client`/development build, config plugins and `npx expo prebuild --clean`. [DOC] [M11](#fontes) | `@react-native-firebase/*` 27.0.0 (19/10/2026) |
| Firebase JS SDK in React Native/Expo | **No persistence.** The official environments table marks Cloud Firestore in React Native as "(except persistence)". [DOC] [D01](#fontes) | **Not guaranteed.** Without disk persistence, pending writes stay in memory and are lost if the process dies before synchronizing. [HIP derived from D01] | Works in Expo Go, without plugins. [DOC] [M11](#fontes) | `firebase` 13.1.0 (npm, 21/10/2026) |
| Firebase JS SDK on the web | Disabled by default; can be enabled with `persistentLocalCache` (IndexedDB). [DOC] [B01](#fontes) | Depends on the browser. | n/a | `firebase` 13.1.0 |

FlutterFire code evidence [CÓDIGO]. At the HEAD of `main`, commit `cb3cc4b6bed7aa0ca916d98abb11275fbfe0728f` from 21/10/2026, "bump Firebase Android SDK to 35.0.2":
- `packages/cloud_firestore/cloud_firestore/android/build.gradle`, lines 63–66, declares `firebase-bom` and `com.google.firebase:firebase-firestore`;
- `packages/cloud_firestore/cloud_firestore/ios/cloud_firestore.podspec`, line 35, declares `s.dependency 'Firebase/Firestore'`.

The permalinks are in [D05](#fontes).

Practical consequence:
- In React Native, only React Native Firebase meets the durable offline record requirement with Firestore. This requires a development build (EAS or local build).
- The marginal cost of this requirement is smaller than it seems: remote push also does not work in Expo Go since SDK 53. [DOC] [D53](#fontes)
- The JS SDK is only suitable for the web or a prototype.

### 3.2 Synchronization semantics and limits

- **Last write wins:** when synchronizing local changes, "it's last write wins". [DOC] [B01](#fontes) There is no built-in conflict detection. Two offline edits to the same document end with the last one to arrive.
- **Transactions fail offline:** "Transactions will fail when the client is offline." [DOC] [B02](#fontes), [D03](#fontes) Operations that need to read the current server state (uniqueness, counters, "end the session only if it is still open") cannot depend on a client transaction.
- **How to make conflicts explicit** [HIP, to validate in a prototype]:
  - Client-generated IDs (UUID/ULID) and idempotent `set` on creation.
  - `version` field and/or `updatedBy`/`updatedAtClient`.
  - Logical deletion with a `deletedAt` field (tombstone) instead of a physical `delete`.
  - A Cloud Function that compares versions and writes a conflict document for the app to display.
  - Security rules can require `request.resource.data.version == resource.data.version + 1`. An offline write rejected by the rules only fails on reconnection, and the app must handle the error.
- **Security rules:**
  - `get()`/`exists()` allow checking current membership (e.g., a family member document) on every request. [DOC] [B03](#fontes)
  - Limit of 10 document access calls per evaluation for single-document requests and queries, and 20 for multiple reads, transactions and batches. [DOC] [B03](#fontes)
  - These reads are billed. [DOC] [B04](#fontes)
- **Admin SDK and server libraries bypass the rules:** "The server client libraries bypass all Cloud Firestore Security Rules and instead authenticate through Google Application Default Credentials." [DOC] [D10](#fontes) Every Cloud Function must perform its own authorization check again.
- **Revocation with an offline device:**
  - The revoked device's next request is denied by the rules if they query the membership document. [DOC B03 + HIP]
  - The local cache remains readable on the device until the app clears it. The app must call the SDK's persistence cleanup when it receives `permission-denied` or a revocation signal. [HIP: cleanup API not reverified in this round]
  - Pending writes from the revoked device are rejected on reconnection. [HIP]

### 3.3 Cost per read, write and listener

Full amounts in [Dated prices](Precos_Datados.md). Points that change the design:

- **Listeners:**
  - Bill one read per document added, changed or removed from the result.
  - With persistence enabled, if the listener is disconnected for **more than 30 minutes**, reconnection is billed as a new query.
  - Without persistence, every reconnection is billed this way.
  - [DOC] [B04](#fontes)
- **Minimum of one read per query.** Reads of `get()`/`exists()` in the rules are also billed. [DOC] [B04](#fontes)
- **Implication:** opening the app several times a day rereads "today's records". Long histories should come from summary documents, rather than rereading every record. [HIP]

### 3.4 Firebase Authentication

- No cost up to 50 thousand MAU (Tier 1: email, social, anonymous). Above that, Identity Platform pricing applies (US$ 0,0055/MAU from 50 thousand to 100 thousand). [DOC] [D14](#fontes)
- **Relevant limits:**
  - Sign-in link email is limited to **5/day on the Spark plan** and 25.000/day on Blaze.
  - SMS is only available on Blaze.
  - [DOC] [D13](#fontes)
  - A real app needs to be on Blaze.
- **Passkeys:** I found no documented native support on the official Firebase Auth pages consulted (search on 22/10/2026). [HIP/limitation: confirm before deciding]

### 3.5 Cloud Storage for Firebase, FCM and exit

- **Storage requires the Blaze plan** since the changes announced in setembro de 2024. On Spark, calls return 402/403 and the console loses access. [DOC] [D15](#fontes)
  - Path-based rules allow a prefix per family, with the same membership check as the Firestore rules. [HIP]
- **FCM:**
  - No cost. [DOC] [D09](#fontes)
  - Sending uses the HTTP v1 API with a short-lived OAuth 2.0 token derived from a service account. [DOC] [D16](#fontes)
  - Data messages are up to 4 KB. [DOC] [D17](#fontes)
  - The InstanceId server APIs and device groups feature were deprecated in setembro de 2026, with shutdown on **29/09/2027**. Do not design family notifications using device groups. [DOC] [D17](#fontes)
- **Export and exit:**
  - Managed export to a Cloud Storage bucket in "LevelDB log format", with a path to BigQuery. [DOC] [D11](#fontes)
  - Daily/weekly scheduled backups with retention of up to 14 weeks, plus PITR, both billed. [DOC] [D12](#fontes), [D08](#fontes)
  - Leaving Firestore means converting a document model and rewriting the app's data layer and rules. It creates the strongest coupling of the three stacks. [HIP]

## 4. Supabase

- **PostgreSQL with RLS:**
  - The `service_role` role "bypasses RLS" and must stay on the server only.
  - Views bypass RLS by default (`security definer`), unless explicitly configured.
  - The documentation recommends indexing the columns used in policies.
  - [DOC] [B05](#fontes)
- **Outdated JWT (B05)**: "Keep in mind that a JWT is not always up-to-date... even if you remove a user from a team and update the `app_metadata` field, that will not be reflected using `auth.jwt()` until the user's JWT is refreshed." [DOC] [B05](#fontes)
  - For revocation, policies must query the membership table (`auth.uid()` + join or function), rather than family claims in the token.
- **Auth:**
  - Free has 50 thousand MAU. Pro includes 100 thousand MAU and charges US$ 0,00325/MAU above that. [DOC] [B08](#fontes)
  - The default SMTP "is not meant for production use": it only delivers to team addresses and has a current limit of **2 messages/hour**. Production requires your own SMTP (e.g., Resend, Postmark, SES). [DOC] [D21](#fontes)
  - Passkeys exist, but are "experimental" in the guide (opt-in in the JS client) and "BETA" in the Flutter reference (`supabase_flutter` ≥ 2.15.0). [DOC] [D23](#fontes), [D24](#fontes)
- **Storage:**
  - By default, uploads are not accepted without RLS policies on `storage.objects`. [DOC] [D19](#fontes)
  - Signed URLs via `createSignedUrl`. [DOC] [D59](#fontes)
  - **Database backups do not include Storage objects.** [DOC] [D18](#fontes)
- **Realtime:**
  - Provides Broadcast, Presence and Postgres Changes. [DOC] [D22](#fontes)
  - The documentation does not describe local persistence or an offline write queue. Realtime does not replace an offline sync protocol. [DOC+HIP]
- **Backups:**
  - Pro has daily backups with access to 7 days; Team, 14; Enterprise, up to 30. Free projects are not listed among those with automatic backups.
  - PITR is an add-on (price in [Dated prices](Precos_Datados.md)).
  - Restoration makes the project inaccessible during the process.
  - [DOC] [D18](#fontes)
- **Free plan:** projects "are paused after 1 week of inactivity", with a limit of 2 active projects. [DOC] [B08](#fontes)
- **Self-host:**
  - Done via Docker. Runs a single project.
  - Does not include branching, advanced metrics, managed backups, PITR or the Management API.
  - [DOC] [D20](#fontes)
  - The `supabase/supabase` repository is Apache-2.0. [EXEC: GitHub `/license`]
- **Exit:** it is standard PostgreSQL (`supabase db dump`/`pg_dump`). [DOC] [D18](#fontes)

## 5. PostgreSQL ↔ SQLite synchronization layers

### 5.1 PowerSync

**Write path**:
- The client writes to local SQLite. The operation enters an ordered upload queue.
- The app's `uploadData()` function sends the queue to **an endpoint on your backend**, using any API style. [DOC] [D25](#fontes)
- The endpoint must be synchronous with the database write.
- Validation or conflict errors must return as **2xx with details**, because 4xx blocks the queue. 5xx is only for temporary failures and triggers a retry. [DOC] [D25](#fontes)

**Idempotency and conflicts**:
- "The operations must be idempotent". The backend may receive the same operation more than once.
- Each operation carries an incremental ID per client for deduplication.
- The default is "per-field Last-Write-Wins", customizable on the backend.
- [DOC] [D26](#fontes)

**Download and authorization**:
- Sync Streams (GA) define what is downloaded to the client and "do not apply to uploaded data". RLS (or the API) is the authority for writes. [DOC] [B07](#fontes), [D33](#fontes)

**Revocation**:
- Parameters read from a table allow access that "can instantly be revoked by deleting the user row/document from the source database". [DOC] [D27](#fontes)
- A row is only deleted from the client when it leaves all buckets (`REMOVE` operation). [DOC] [D28](#fontes)
- There is no way to revoke a JWT that has already been issued. The recommendation is a short expiration (e.g., 5 min). [DOC] [D29](#fontes)
  - The same page states that "JWTs older than 60 minutes are not accepted" and, elsewhere, accepts validity of up to 24 h with 60 min recommended. There is an internal discrepancy to confirm.
- `disconnectAndClear()` deletes local data on logout. It should only be used with an empty queue, otherwise local mutations are lost. [DOC] [D30](#fontes), [D61](#fontes)
- An offline device retains the data until it reconnects. [inherent HIP]

**Sensitive data**:
- On the HIPAA page, the customer is responsible for encrypting local SQLite (SQLCipher), controlling access to the device and discarding data during deprovisioning. [DOC] [D31](#fontes)

**SDKs and status**:
- GA: React Native, Dart/Flutter, Kotlin, Swift, JavaScript/Web and Node.js.
- Beta: OP-SQLite Support, Drift, Drizzle, Room, SQLDelight, .NET, Flutter SQLCipher and Kotlin SQLite3MultipleCiphers.
- Source databases: Postgres and MongoDB GA; MySQL and SQL Server Beta.
- [DOC] [D33](#fontes)

**Expo**:
- The native adapter (`@op-engineering/op-sqlite`) "is not compatible with Expo Go". Requires a development build.
- For Expo Go, the JS adapter `@powersync/adapter-sql-js` is available.
- [DOC] [D32](#fontes)
- The documentation says it supports op-sqlite "1.17.0 or later". The published `peerDependencies` requires `>=17.1.0 <19.0.0` [EXEC], which suggests a typo on the page.
- The `@powersync/op-sqlite` 0.9.16 package requires op-sqlite ^13–15 and `@powersync/common` ^1.57 [EXEC]. It appears to be legacy. Do not use without confirming.

**License and self-host**:
- The service uses the **Functional Source License 1.1 with a future Apache-2.0 license** ("FSL-1.1-ALv2"). Use is allowed for any purpose except "Competing Use", and each version becomes Apache-2.0 "on the second anniversary". [DOC] [D35](#fontes)
- The GitHub API reports `NOASSERTION` because it does not recognize the FSL. [EXEC]
- The JS SDKs (`powersync-js`) are Apache-2.0. [EXEC]
- Self-hosting the **Open Edition** (GA) uses the `journeyapps/powersync-service` Docker image. There is also an Enterprise Self-Hosted Edition with pricing on request. [DOC] [D34](#fontes), [D33](#fontes)

**Price**: Free/Pro/Team in [Dated prices](Precos_Datados.md).
- Free is deactivated after one week of inactivity and allows 50 concurrent clients at peak.
- Pro hosts up to 100 GB by default. [DOC] [B09](#fontes)

### 5.2 ElectricSQL (status as of 2026)

- "Electric does read-path sync... Electric does not do write-path sync." For writes, the guide proposes four patterns: online, optimistic state, shared persistent optimistic state and "through-the-database". [DOC] [D36](#fontes)
- For durable offline records with Electric, the app still needs a local store and outbox. In practice, the write path is the same as in stack C. [HIP]
- The TypeScript client works in Expo. [DOC] [D38](#fontes)
- Versions [EXEC]:
  - `@electric-sql/client` 1.5.28 and `@electric-sql/react` 1.0.57 (09/09/2026);
  - `@core/sync-service` 1.8.1 (07/09/2026).
- Apache-2.0 license. [EXEC]
- Electric Cloud charges for writes and retention; reads and egress are free. [DOC] [D37](#fontes)

### 5.3 Zero and Replicache (Rocicorp)

- **Zero:**
  - Reached 1.0 ("Zero to 1.0"). The 2026 roadmap plans to bring Cloud Zero to "full public availability". [DOC] [D40](#fontes)
  - Supports React Native/Expo with `kvStore` on expo-sqlite or op-sqlite. [DOC] [D41](#fontes)
  - **"Zero does not support offline writes"**: when disconnected, it reads synchronized data, but "writes are rejected". The project warns that it "is not designed for long periods offline". [DOC] [D39](#fontes)
  - This violates requirement 1. **Ruled out for the routine.**
  - `@rocicorp/zero` 1.11.2 (21/10/2026), Apache-2.0. [EXEC]
- **Replicache:**
  - "is now in maintenance mode": open source, no charge and no new features. Users should migrate to Zero. [DOC] [D42](#fontes)
  - npm 15.3.0 (22/05/2026), with the license field pointing to `roci.dev/terms.html`. [EXEC]
  - Not recommended for a new project.

### 5.4 Other options checked

- **WatermelonDB:**
  - Local database with sync primitives. "bring your own backend" with two endpoints (pull/push). [DOC] [D43](#fontes)
  - npm 0.28.0, last modified on 24/07/2025. [EXEC]
  - More than a year without a release is a maintenance risk. [HIP]
- **RxDB** 17.6.0 [EXEC]: the full SQLite storage for production is part of RxDB Premium (paid). The core includes a "trial" version. [DOC] [D44](#fontes)
- **MongoDB Atlas Device Sync / Realm:** "Device Sync has reached its end-of-life status and be removed on September 30, 2025". [DOC] [D45](#fontes) **Ruled out.**
- **TanStack DB** 0.15.2 [EXEC]: pre-1.0; mentioned by Electric and in the PowerSync status (Alpha). Not evaluated in depth.

### 5.5 Custom outbox + sync endpoint (what needs to be built)

Without a ready-made layer, as in stack C or Electric, the following must be built [HIP: reference design to validate in a prototype]:

1. **Local database** (SQLite):
   - RN: `expo-sqlite` 58.0.13 or `@op-engineering/op-sqlite` 18.2.5, with optional ORM `drizzle-orm` 0.45.4.
   - Flutter: `drift` 2.35.2 or `sqflite` 2.4.5.
   - Versions [EXEC].
2. **Outbox** with the operation, in a local transaction together with the visible change:
   - Unique client-generated `op_id` (UUIDv7/ULID);
   - `device_id`, monotonic local `seq`, `entity`, `entity_id`, `base_version`, `payload`;
   - `observed_at` (device clock) and `tz`.
3. **Push endpoint** that, in a server transaction:
   - reevaluates the sender's **current** family membership;
   - deduplicates by `op_id` (table with a unique key);
   - compares `base_version` with the current version;
   - applies the change or records an explicit conflict;
   - records `received_at`;
   - responds per operation: accepted, duplicate, conflict or rejected (revoked/validation).
4. **Pull endpoint** per family with a **cursor** (monotonic server sequence, not a clock), pagination and **tombstones** (`deleted_at`) to propagate deletions.
5. **Client reconciliation:**
   - mark accepted operations;
   - display conflicts;
   - reapply pending operations over the new state;
   - purge local family data when the server responds "revoked".
6. Versioned local and remote **schema migrations**; compatibility with older app versions still in use.
7. **Property and chaos tests**: kill the process, duplicate resends, reordered operations, clock ahead/behind and revocation in the middle of a batch.

PostgreSQL helps with items 3 and 4 through transaction isolation and unique constraints. [DOC] [B10](#fontes) This is the same contract PowerSync requires from the upload endpoint. The difference is that, with PowerSync, downloads, buckets and client-side removal are ready-made.

## 6. Custom API: modular monolith with PostgreSQL

Objective comparison. None of the three was chosen based on familiarity. Daniel's familiarity with Java/React is a cost criterion to declare, not an automatic justification.

| Criterion | NestJS (TypeScript) | Django + DRF (Python) | Spring Boot (Java) |
| --- | --- | --- | --- |
| Verified versions [EXEC] | `@nestjs/core` 12.2.0 (19/10/2026); `@nestjs/testing` 12.2.0 | Django 6.1.2 (06/10/2026, Python ≥ 3.12); DRF 3.18.3 (06/10/2026) | Spring Boot 4.1.1 GA (milestone 4.2.0-M2); Spring Security 7.1.1; Spring Modulith 2.1.1 |
| Object-level authorization | `@nestjs/authorization` 0.1.0 (08/10/2026): policies with `@Can()` and a global guard that "denies by default". [DOC] [D46](#fontes) **Very new package (0.x)**. Mature alternative: `@casl/ability` 7.0.2. [EXEC] | Object permissions run in `get_object()`. "the generic views will not automatically apply object level permissions to each instance in a queryset when returning a list". Family filtering must be in the queryset. [DOC] [D47](#fontes) Support: `django-guardian` 3.5.2; `rules` 3.5 (last version from 09/2024). [EXEC] | `@PreAuthorize`, `@PostAuthorize`, `@PreFilter`/`@PostFilter` and `AuthorizationManager`. [DOC] [D50](#fontes) Family filter in the repository/query. |
| Admin/moderation | No native admin; requires a tool or custom screen. [HIP] | Django admin: use "is limited to an organization's internal management tool. It's not intended for building your entire front end". Serves as a moderation back office with restricted permissions. [DOC] [D49](#fontes) | No native data admin; custom screen. [HIP] |
| Jobs (push, email, EXIF, deletion) | `@nestjs/bullmq` 12.0.0 + BullMQ 6.4.0 (requires Redis) or `pg-boss` 12.38.0 (queue in Postgres itself). [EXEC] | The Django 6.x Tasks framework defines the API, but "built-in backends... are for development and testing only". Requires a backend/worker (`django-tasks` 0.12.0 or Celery 5.6.3). [DOC] [D48](#fontes) [EXEC] | JobRunr 9.0.2 or Quartz 2.5.2. [EXEC] |
| ORM/migrations | Prisma: the `latest` dist-tag points to **8.0.0-rc.24** (prev 7.10.1), which requires pinning the version. Drizzle 0.45.4. TypeORM 1.1.2. [EXEC] | Native ORM and migrations. | JPA/Hibernate and Flyway/Liquibase (not checked in this round). |
| Language shared with the app | Only if mobile uses RN. Not sufficient reason (task rule). | None. | None (Kotlin on native Android is close, but does not apply to RN/Flutter). |
| Operations | Node container; low memory. | Python container + worker. | JVM; more memory on a small instance. [HIP] |

Other stacks (Rails, Laravel, .NET, Go) were not evaluated for lack of a strong reason at this stage.

In any of the three, the security boundary must be centralized:
- a `familia` module that resolves current membership;
- queries always filtered by `family_id` from that module, never from the client;
- optionally, RLS in PostgreSQL as defense in depth, with `set_config` per transaction.

[HIP]

## 7. Hosting and managed PostgreSQL

Detailed prices in [Dated prices](Precos_Datados.md).

- **API compute:**
  - Cloud Run has request-based billing with a monthly free tier and an optional minimum instance.
  - Render, Railway and Fly.io offer small monthly instances.
  - All run containers. The choice affects fixed cost and operations more than architecture. [DOC]
- **Managed PostgreSQL:**
  - Supabase (Pro + compute);
  - Neon (per CU-hora and GB-month; restoration window of 7 days on Launch and 30 on Scale);
  - Cloud SQL (vCPU/memory; shared instances without SLA);
  - RDS (free backup up to 100% of provisioned storage);
  - Render Postgres (PITR listed; logical backup on paid instances);
  - Fly Managed Postgres (starting at US$ 38/month).
  - [DOC]
- **Backups and restoration** are the criterion separating a prototype from production for sensitive data. Before launch:
  - define RPO/RTO;
  - test a full restoration (database + objects), because database backups do not cover object storage in any of the services examined;
  - document who can delete backups.
  - [HIP]
- **Region:** captured prices are for US regions (us-central1/us-east). São Paulo prices were not captured in this round. [Open question]

## 8. Authentication

| Method | Notes |
| --- | --- |
| Email with magic link/OTP | No password to remember. Requires an email provider with good deliverability. Firebase limits links to 5/day on Spark. [DOC] [D13](#fontes) Supabase requires your own SMTP. [DOC] [D21](#fontes) |
| Password | Universal. Requires a recovery flow and protection against brute force. |
| Passkeys | Supabase: experimental/beta. [DOC] [D23](#fontes), [D24](#fontes) Auth0: "Passkeys" included in all plans. [DOC] [D60](#fontes) Firebase: not found. [HIP] Clerk and Cognito: not checked in this round. |
| Social login (Google etc.) | Triggers App Store guideline 4.8 (below). |

**App Store Review Guideline 4.8 (Login Services), text in effect on 22/10/2026** [DOC] [D51](#fontes):

> Apps that use a third-party or social login service (such as Facebook Login, Google Sign-In, Log in with X, Sign In with LinkedIn, Login with Amazon, or WeChat Login) to set up or authenticate the user's primary account with the app must also offer as an equivalent option another login service with the following features: the login service limits data collection to the user's name and email address; the login service allows users to keep their email address private as part of setting up their account; and the login service does not collect interactions with your app for advertising purposes without consent.

There are exceptions, including an app that "exclusively uses your company's own account setup and sign-in systems".

Consequence:
- If the app offers Google as the primary account, it must offer an alternative with the three properties.
- Sign in with Apple is the usual path. The current guideline does not name it; confirm during review. [HIP]
- With only your own email authentication (link/OTP/password), the requirement does not apply.

**Provider costs** (details in [Dated prices](Precos_Datados.md)):
- Supabase Auth: 50 thousand MAU on Free; 100 thousand on Pro, then US$ 0,00325/MAU.
- Firebase Auth: 50 thousand MAU Tier 1 at no cost.
- Clerk: 50 thousand MRU on Hobby.
- Auth0: Free up to 25 thousand MAU; Essentials US$ 35/month for 500 MAU (B2C).
- Cognito: free tier of 10 thousand MAU; Essentials US$ 0,015/MAU.
- Self-host: infrastructure and engineering costs.
- [DOC]

**Revocation** with any provider [HIP based on B05 and D29]:
- short-lived access token (5–15 min);
- server-revocable refresh token;
- membership check in the table for every operation;
- claims never used as the sole source of family authorization.

## 9. Push

- **FCM HTTP v1**: no cost; short-lived OAuth 2.0 via service account; data up to 4 KB. [DOC] [D16](#fontes), [D17](#fontes), [D09](#fontes)
- **Token-based APNs**: `.p8` key (team-scoped or topic-specific). The signed token must be renewed "at least once an hour". [DOC] [D52](#fontes)
- **Expo Push Service** [DOC] [D53](#fontes), [D54](#fontes):
  - "no cost associated with sending notifications";
  - limit of **600 notifications/s per project**;
  - "at-least-once" delivery to FCM/APNs, which requires deduplication by ID in the app;
  - does not retain content beyond delivery;
  - receipts should be checked ~15 min later;
  - push does not work in Expo Go since SDK 53.
- **OneSignal** [DOC] [D55](#fontes):
  - Free with unlimited push only "for organizations with up to 1,000 monthly active users";
  - Growth starting at US$ 19/month, with push at US$ 0,012/MAU.
  - With 20 thousand MAU, push alone would cost ~US$ 240/month. [HIP: calculation]
- **Content**: guideline 4.5.4 says push "should not be used to send sensitive personal or confidential information". [DOC] [D51](#fontes) Recommended design [HIP]:
  - generic text ("Há uma atualização na rotina da família") and only opaque IDs in the payload;
  - the app fetches details after authentication;
  - no baby names, feeding times or symptoms in the body;
  - private visibility on the lock screen;
  - send only to tokens registered by members with **current** membership, removing tokens on revocation;
  - never FCM topics per family.

## 10. Files and media

- **Storage:** R2, GCS, Supabase Storage, Cloud Storage for Firebase or S3 (prices in [Dated prices](Precos_Datados.md); S3 not captured).
- **Signed URLs scoped to the family:**
  - object key `families/{family_id}/...`;
  - the server checks current membership before issuing the URL;
  - short expiration;
  - never a public bucket.
  - [HIP]
  - R2 presigned URLs are valid from 1 s to 7 days and cover one operation on one object. They do not work on a custom domain. [DOC] [D56](#fontes)
  - In Supabase and Firebase, the same rule becomes a Storage policy/rule. [DOC] [D19](#fontes)
- **EXIF:**
  - `sharp` removes all metadata by default, including EXIF orientation (`sharp` 0.35.5). [DOC] [D57](#fontes) [EXEC]
  - On Android, location in photos is hidden from the app without `ACCESS_MEDIA_LOCATION`. [DOC] [D58](#fontes)
  - I did not verify whether `expo-image-manipulator` (58.0.15 [EXEC]) removes EXIF when reencoding; test it. [HIP]
  - Recommended design: upload to a quarantine prefix → server function reencodes without metadata → moves to the family prefix → only then references it in the record. [HIP]
- **Cost:**
  - photo storage assuming 4 photos/family/month: < US$ 3/month with 10 thousand families in any option;
  - traffic: R2 does not charge for egress; GCS charges US$ 0,12/GiB beyond free quotas.
  - [DOC]+[HIP]

## 11. Three complete stacks

Mobile remains open ("RN/Expo or Flutter") because the choice belongs in the other note. Below is the actual SDK in each case.

### Stack A: Document BaaS (Firebase)

**Components:**
- Firestore (Standard), Firebase Auth (email link + Sign in with Apple + Google), Cloud Storage for Firebase, FCM;
- Cloud Functions for invitations, moderation, EXIF, push and conflicts;
- Blaze plan required.
- Mobile:
  - RN: `@react-native-firebase/{app,firestore,auth,storage,messaging}` 27.0.0, with development build/config plugin (do not use the JS SDK for data);
  - Flutter: `firebase_core` 5.0.0, `cloud_firestore` 7.0.0, `firebase_auth` 7.0.0, `firebase_storage` 14.0.0, `firebase_messaging` 17.0.0 [EXEC].

**From local record to confirmation:**
1. The app writes the document with a client-generated ID to the native SDK's persistent cache.
2. The UI shows the pending state (`hasPendingWrites`).
3. On reconnection, the SDK sends it. The rules validate membership and version.
4. Confirmation arrives through the listener (metadata with no pending writes).
5. Rejections appear as write errors and the cache reverts. [DOC B01 + HIP]

**Conflicts and duplication:**
- Last write wins by default. Explicit conflicts require a version field, tombstone and a check in the rules or a Function.
- Client-generated ID prevents duplication. [DOC+HIP]

**Revocation:** rules with `get()` of the membership deny the next request; the local cache only disappears when the app clears it. [HIP]

**Isolation and community:**
- routine in `families/{id}/...` with membership-based rules;
- community in a separate collection, with its own rules and moderation, without references to private records;
- Storage with a prefix per family.

**Required knowledge:** document modeling, rules language, TypeScript/Node for Functions, GCP IAM, native SDK via RN or Flutter.

**Effort:**
- Initial development: the lowest for sync.
- Maintenance: rules and indexes grow with the product; rule tests with the emulator.
- Operations: minimal.

**Exit:** the hardest (document model, export in LevelDB/BigQuery, data layer rewrite).

**Main risk:** conflicts and authorization are spread across rules and Functions. Revocation and "deletion versus editing" depend on modeling discipline, not the platform.

### Stack B: Managed PostgreSQL + sync layer (Supabase + PowerSync)

**Components:**
- Supabase (Postgres, Auth, Storage, Edge Functions);
- PowerSync Cloud Pro (or self-hosted Open Edition);
- upload endpoint (Edge Function or custom service) with deduplication by operation ID;
- your own SMTP (Resend/Postmark/SES);
- push via FCM/APNs or Expo Push.
- Mobile:
  - RN: `@powersync/react-native` 2.3.3 + `@op-engineering/op-sqlite` 18.2.5 (peer `>=17.1.0 <19`) + `@supabase/supabase-js` 2.118.0, with development build;
  - Flutter: `powersync` 2.5.0 + `supabase_flutter` 2.18.3 [EXEC].

**From local record to confirmation:**
1. The app writes to SQLite. The operation enters the upload queue.
2. `uploadData()` calls the endpoint, which validates membership and version in a Postgres transaction under RLS or its own check, and responds 2xx (with a domain error when applicable).
3. The client advances to the write checkpoint.
4. Confirmation arrives when the data returns through the download stream. [DOC D25/D26]

**Conflicts and duplication:** per-field LWW by default; explicit conflicts implemented in the endpoint; deduplication by operation ID. [DOC D26]

**Revocation:**
- deleting the membership row removes the buckets;
- the client deletes the rows on the next sync;
- uploads from the revoked member are rejected by the endpoint/RLS;
- short-lived JWT. [DOC D27/D28/D29]

**Isolation and community:**
- RLS per family and equivalent Sync Streams (must mirror RLS);
- community in separate schema/tables, possibly outside offline sync (online-only);
- Storage with policies per prefix.

**Required knowledge:** SQL/RLS, Sync Streams configuration, endpoint backend (TypeScript/Deno or any language), SQLite on the client, operating two providers.

**Effort:**
- Development: medium (endpoint + mirrored policies).
- Maintenance: keep RLS and Sync Streams consistent.
- Operations: two managed services.

**Exit:**
- Portable Postgres.
- PowerSync supports self-hosting (FSL → Apache-2.0 after 2 years).
- Replacing the sync layer requires rewriting client data access, but the SQLite schema remains.

**Main risk:** two providers with free plans that pause or deactivate due to inactivity, and two authorization sources of truth (RLS and Sync Streams) that can diverge.

### Stack C: Custom API (modular monolith) + PostgreSQL + custom outbox/sync

**Components:**
- API in NestJS, Django/DRF or Spring Boot (section 6);
- managed PostgreSQL (Cloud SQL, Neon, RDS, Render or Fly);
- S3-compatible object storage (R2 or GCS) with signed URLs;
- queue/worker (pg-boss, Django tasks/Celery, JobRunr);
- your own auth (framework library) or provider (Supabase Auth, Auth0, Cognito, Clerk);
- direct FCM/APNs or Expo Push;
- transactional email.
- Mobile:
  - RN: `expo-sqlite` 58.0.13 or `op-sqlite` 18.2.5 + `drizzle-orm` 0.45.4;
  - Flutter: `drift` 2.35.2 [EXEC].

**From local record to confirmation:** outbox in the same local transaction → batch push → response per operation → cursor-based pull → reconciliation (section 5.5).

**Conflicts and duplication:** under full control, with unique `op_id`, `base_version`, tombstones and conflicts as visible entities. Requires building and testing everything.

**Revocation:** current membership check per operation. The server responds "revoked" and the client purges family data. Push tokens removed on revocation.

**Isolation and community:**
- family module as the sole source of scope;
- community as a separate module, with its own API contract and no access to the routine module;
- optional RLS as defense in depth.

**Required knowledge:** the chosen backend language, SQL, sync protocol design, SQLite on the client, DevOps (deployment, backups, observability, security).

**Effort:**
- Development: the highest (protocol + sync client + moderation panel).
- Maintenance: high, but without provider limits.
- Operations: the greatest responsibility.

**Exit:** the simplest; everything is standard (Postgres, S3, OAuth/OIDC).

**Main risk:** underestimating custom sync. Ordering, idempotency, migrations and revocation are the hard parts and appear late. The schedule slips before infrastructure cost becomes an issue.

### Summary table (without numerical scores)

| Aspect | A (Firebase) | B (Supabase + PowerSync) | C (Custom API) |
| --- | --- | --- | --- |
| Durable offline writes | Yes, with native SDK (RNFirebase/FlutterFire) | Yes (SQLite + queue) | Yes, if well built |
| Explicit conflict | Build on top of LWW | Build in the endpoint (LWW by default) | Build (full control) |
| Revocation with an offline device | Rules on reconnection + local cleanup by the app | Buckets removed + endpoint rejects | Custom protocol |
| Authorization source | Rules + Functions (Admin bypasses rules) | RLS + Sync Streams (mirrored) | API code (+ optional RLS) |
| Dev build required in RN | Yes | Yes (op-sqlite) | Depends on the chosen SQLite; push already requires it |
| Critical providers | 1 (Google) | 2 (Supabase, PowerSync) | 1–3 (cloud, database, storage) |
| Exit | Hard | Medium | Easy |
| Illustrative infrastructure cost (100/1k/10k families), with fixed costs and without the domain service | ~US$ 27 / 35 / 139 | ~US$ 101 / 121 / 214 | ~US$ 64 / 109 / 202 |

Suggested tie-breaking criteria [HIP]:
1. Practical proof of the five D5 scenarios in a prototype of each finalist.
2. Who will operate the system in production.
3. Acceptable exit cost.
4. First release deadline.

## 12. Factors that would change the choice

- **Team without operations/DevOps experience** → favors A or B.
- **Requirement for rich conflicts** (per-field merge, visible history, auditing) → favors B or C; Firestore's LWW becomes a modeling cost.
- **Regulatory or contractual requirement for hosting in Brazil or self-hosting** → favors C or B with PowerSync Open Edition and self-hosted Supabase. Check the limitations of self-hosted Supabase.
- **PowerSync license or price change** (FSL today) or discontinuation of the US$ 49 Pro plan → weakens B. Firestore quota changes → affect A.
- **Web required with offline support** → in Firestore, the web uses another SDK (IndexedDB). PowerSync has a GA Web SDK. In C, the sync client must exist on one more platform.
- **Heavy use of history/reports in the app** → makes A more expensive (reads); B and C read from local SQLite.
- **Scale >10 thousand families with simultaneous peaks** → PowerSync Pro's default limits (3.000 concurrent clients, 100 GB hosted) may force Team (US$ 599+).
- **Decision for Flutter or RN** → does not change the data stack category. It changes the SDK: RNFirebase and FlutterFire are equivalent offline; the PowerSync RN and Dart SDKs are both GA.

## 13. Open questions

1. Is there a data residency requirement in Brazil? Prices for `southamerica-east1`/`sa-east-1` were not captured.
2. Does the community need to work offline or can it be online-only (outside the sync engine)?
3. What RPO/RTO is acceptable? Determines PITR (US$ 100/month on Supabase for 7 days) versus daily backups only.
4. Is social login necessary in the MVP? Without it, guideline 4.8 does not apply.
5. Who operates the backend in production (Daniel alone?) and with what availability?
6. Discrepancy in PowerSync documentation on maximum JWT age (60 min versus 24 h): confirm through testing.
7. Does Firebase Auth have native passkeys? Not found; confirm with support or through testing.
8. Does `expo-image-manipulator` remove EXIF? Confirm through testing. Removing it on the server is recommended in any case.

## 14. Limits of this analysis

- Nothing was run against real services: no prototype, benchmark or sync test. Behavioral claims are [DOC] or [HIP].
- [EXEC] versions reflect the package registry on 22/10/2026. I did not test cross-compatibility beyond `peerDependencies`. The React Native version supported by Expo SDK 58 belongs in the other note (npm `react-native` latest = 0.88.0; `expo` = 58.0.17).
- Some prices depend on dynamic tables that were not captured: S3, Brazil regions and exact Firestore egress. They were marked in [Dated prices](Precos_Datados.md).
- Engineering cost (hours) is not estimated. It dominates the difference between stacks at these scales.
- No legal assessment was performed. See [Privacy, legal and app stores research](../Pesquisa_Privacidade_Legal_e_Lojas.md).

## Fontes

All accessed on 22/10/2026. IDs B01–B10 and M11 follow `tasks/hermes/APP-001-design-docs/08_FONTES_E_EVIDENCIAS.md`.

| ID | Source | Use |
| --- | --- | --- |
| B01 | https://firebase.google.com/docs/firestore/manage-data/enable-offline | Persistence by platform, 100 MB cache, last write wins |
| B02 | https://firebase.google.com/docs/firestore/manage-data/transactions | Transactions fail offline |
| B03 | https://firebase.google.com/docs/firestore/security/rules-conditions | `get()`/`exists()`, access limits |
| B04 | https://firebase.google.com/docs/firestore/pricing | Listener billing, rules, minimum per query |
| B05 | https://supabase.com/docs/guides/database/postgres/row-level-security | RLS, `service_role`, views, outdated JWT |
| B07 | https://docs.powersync.com/integrations/supabase/rls-and-sync-streams | Sync Streams do not apply to uploads |
| B08 | https://supabase.com/pricing | Plans, Free pausing |
| B09 | https://www.powersync.com/pricing | Plans, Free deactivation, limits |
| B10 | https://www.postgresql.org/docs/current/transaction-iso.html | Transaction isolation (package reference) |
| M11 | https://docs.expo.dev/guides/using-firebase/ | JS SDK × React Native Firebase in Expo |
| D01 | https://firebase.google.com/docs/web/environments-js-sdk | Firestore in React Native "(except persistence)" |
| D02 | https://rnfirebase.io/ | RNFirebase wraps native SDKs |
| D03 | https://rnfirebase.io/firestore/usage | Offline by default; web-only cache options; offline transactions |
| D05 | https://github.com/firebase/flutterfire/blob/cb3cc4b6bed7aa0ca916d98abb11275fbfe0728f/packages/cloud_firestore/cloud_firestore/android/build.gradle#L63-L66 and https://github.com/firebase/flutterfire/blob/cb3cc4b6bed7aa0ca916d98abb11275fbfe0728f/packages/cloud_firestore/cloud_firestore/ios/cloud_firestore.podspec#L35 | FlutterFire depends on native SDKs [CÓDIGO] |
| D06 | https://firebase.google.com/docs/flutter/setup | FlutterFire platform requirements |
| D08 | https://cloud.google.com/firestore/pricing | Standard edition prices, PITR, backup |
| D09 | https://firebase.google.com/pricing | Spark/Blaze, no-cost FCM, Storage |
| D10 | https://firebase.google.com/docs/firestore/security/insecure-rules | Server libraries bypass rules |
| D11 | https://firebase.google.com/docs/firestore/manage-data/export-import | Managed export (LevelDB), BigQuery |
| D12 | https://firebase.google.com/docs/firestore/backups | Scheduled backups, retention up to 14 weeks |
| D13 | https://firebase.google.com/docs/auth/limits | Email and SMS limits per plan |
| D14 | https://cloud.google.com/identity-platform/pricing | Price per MAU above 50 thousand |
| D15 | https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024 | Storage requires Blaze |
| D16 | https://firebase.google.com/docs/cloud-messaging/send/v1-api | FCM HTTP v1, OAuth 2.0 |
| D17 | https://firebase.google.com/docs/cloud-messaging/troubleshooting | 4 KB, InstanceId/device groups deprecation (29/09/2027) |
| D18 | https://supabase.com/docs/guides/platform/backups | Retention per plan, Storage excluded from backup, PITR |
| D19 | https://supabase.com/docs/guides/storage/security/access-control | Policies on `storage.objects` |
| D20 | https://supabase.com/docs/guides/self-hosting | Self-hosting limitations |
| D21 | https://supabase.com/docs/guides/auth/auth-smtp | Default SMTP is unsuitable for production |
| D22 | https://supabase.com/docs/guides/realtime | Realtime features |
| D23 | https://supabase.com/docs/guides/auth/passkeys | Experimental passkeys |
| D24 | https://supabase.com/docs/reference/dart/auth-signinwithpasskey | BETA passkeys in Flutter |
| D25 | https://docs.powersync.com/handling-writes/writing-client-changes | Upload endpoint, response codes |
| D26 | https://docs.powersync.com/handling-writes/handling-update-conflicts | Idempotency, ID per operation, per-field LWW |
| D27 | https://docs.powersync.com/sync/rules/parameter-queries | Revocation through membership row |
| D28 | https://docs.powersync.com/architecture/powersync-protocol | PUT/REMOVE and client-side removal |
| D29 | https://docs.powersync.com/configuration/auth/custom | Short-lived JWT, no revocation |
| D30 | https://docs.powersync.com/resources/usage-and-billing/reducing-usage | `disconnectAndClear()` |
| D31 | https://docs.powersync.com/resources/hipaa | Device responsibilities |
| D32 | https://docs.powersync.com/client-sdks/reference/react-native-and-expo | op-sqlite, Expo Go |
| D33 | https://docs.powersync.com/resources/feature-status | GA/Beta status |
| D34 | https://docs.powersync.com/intro/self-hosting | Open Edition and Enterprise Self-Hosted |
| D35 | https://github.com/powersync-ja/powersync-service/blob/main/LICENSE | FSL-1.1-ALv2 |
| D36 | https://electric.ax/docs/sync/guides/writes | Electric read-only; write patterns |
| D37 | https://electric.ax/pricing | Electric Cloud price |
| D38 | https://electric.ax/docs/sync/integrations/expo | Electric in Expo |
| D39 | https://zero.rocicorp.dev/docs/connection | Zero without offline writes |
| D40 | https://zero.rocicorp.dev/docs/status | Zero 1.0 and roadmap |
| D41 | https://zero.rocicorp.dev/docs/react-native | Zero in RN/Expo |
| D42 | https://replicache.dev/ | Replicache in maintenance |
| D43 | https://watermelondb.dev/docs/Sync/Intro | WatermelonDB: custom backend |
| D44 | https://rxdb.info/rx-storage-sqlite.html | RxDB SQLite Premium |
| D45 | https://www.mongodb.com/docs/atlas/app-services/sync/device-sync-deprecation/ | End of Atlas Device Sync |
| D46 | https://docs.nestjs.com/security/authorization | `@nestjs/authorization` |
| D47 | https://www.django-rest-framework.org/api-guide/permissions/ | Object-level permission limits |
| D48 | https://docs.djangoproject.com/en/6.1/topics/tasks/ | Tasks: backends for dev/testing only |
| D49 | https://docs.djangoproject.com/en/6.1/ref/contrib/admin/ | Admin as an internal tool |
| D50 | https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html | Method security |
| D51 | https://developer.apple.com/app-store/review/guidelines/ | 4.8 Login Services; 4.5.4 Push |
| D52 | https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns | Token-based APNs |
| D53 | https://docs.expo.dev/push-notifications/faq/ | Cost, 600/s, at-least-once, Expo Go |
| D54 | https://docs.expo.dev/push-notifications/sending-notifications/ | Tickets and receipts |
| D55 | https://onesignal.com/pricing | Free push up to 1.000 MAU; US$ 0,012/MAU |
| D56 | https://developers.cloudflare.com/r2/api/s3/presigned-urls/ | R2 presigned URLs |
| D57 | https://sharp.pixelplumbing.com/api-output/ | Metadata removal by default |
| D58 | https://developer.android.com/training/data-storage/shared/media | Location hidden without `ACCESS_MEDIA_LOCATION` |
| D59 | https://supabase.com/docs/reference/javascript/storage-from-createsignedurl | Supabase signed URLs |
| D60 | https://auth0.com/pricing | Auth0 plans and passkeys |
| D61 | https://docs.powersync.com/migration-guides/electric | Safe use of `disconnectAndClear()` |

[EXEC] version records, collected on 22/10/2026 between 06:00 and 06:35 UTC on Windows 11 with npm 11.19.0. The date column means different things for each registry:
- npm: the package's `time.modified`, not necessarily the version date;
- pub.dev and PyPI: version publication;
- Maven: `lastUpdated` from the metadata;
- GitHub: the release's `published_at`.

Commands: `npm view <p> version time.modified license --json`, `npm view <p> peerDependencies dist-tags`, `curl https://pub.dev/api/packages/<p>`, `curl https://pypi.org/pypi/<p>/json`, `curl https://repo1.maven.org/maven2/<g>/<a>/maven-metadata.xml`, `curl https://dl.google.com/android/maven2/com/google/firebase/firebase-bom/maven-metadata.xml` and `curl https://api.github.com/repos/<r>/releases/latest|license`.

The relevant `peerDependencies` were queried with `npm view`:
- `@powersync/react-native` 2.3.3 requires `@op-engineering/op-sqlite >=17.1.0 <19.0.0` and `@powersync/common ^2.4.0`;
- `@powersync/op-sqlite` 0.9.16 requires op-sqlite `^13 || ^14 || ^15`;
- `@react-native-firebase/app` 27.0.0 requires `expo >=47.0.0` (optional) and `react-native >=0.60.0-0`;
- `prisma` has dist-tags `latest` 8.0.0-rc.24 and `prev` 7.10.1.

| Package/artifact | Version | Date (publication or modification) | Declared license | Registry |
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
