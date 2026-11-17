---
tipo: repository-profile
status: draft
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
tarefa: MAT-5
repositorio: https://github.com/Oak-and-Sprout/sprout-track
branch: main
commit: eb26949461bd0455cb8d6137dc5bc417a02adcf9
licenca_raiz: Custom license (Non-Commercial + Share-Alike)
fontes_principais:
  - https://github.com/Oak-and-Sprout/sprout-track/tree/eb26949461bd0455cb8d6137dc5bc417a02adcf9
  - https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/LICENSE.md
  - https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma
  - https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/app/api/utils/family-scope.ts
  - https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/public/sw.js
---

# Sprout Track

Profile written by reading the code at commit `eb26949` and the [execution record](../../09_Evidencias/Execucao_Referencias/Sprout_Track/Registro_Execucao.md) from the first attempt. Evidence tags follow the [Conventions](../../00_Inicio/Convencoes.md). Code links point to the analyzed commit.

## Resumo

- **What it is.** A mature, active baby care logging web app (Next.js), at version 1.6.8, with 1.982 commits and its latest commit on 12/10/2026 [CODE; EXEC git]. It has a full-screen "Nursery" mode for nighttime and daycare, multiple families, caregivers with PINs, reports, export, push notifications, and API integrations [DOC README].
- **Android and iOS apps:** these exist as a Capacitor shell in another repository that loads this web app in a WebView [DOC CLAUDE.md].
- **Useful as a reference for the experience:**
  - Nursery mode, large buttons, and "acordado há", "desde a última mamada", and "desde a última fralda" blocks;
  - active sessions stored on the server, with **one active session per baby enforced by the database**;
  - caregiver attribution;
  - tummy time as a timed activity with a daily average in the report, without a target [CÓDIGO].
- **Not useful for:**
  - offline use: the service worker does not cache, and there is no local queue [CÓDIGO];
  - a codebase: the license prohibits commercial use [CODE LICENSE.md].
- **License:** custom, "Non-Commercial + Share-Alike". **None of the code goes into AppMaternidade**; only concepts, implemented from scratch.
- **Execution:**
  - Installation, Prisma generation, migrations, seed, and the development server worked [EXEC].
  - Tests: 1.753 of 1.755 passed; the 2 failures come from Windows paths [EXEC].
  - The access probe records from the first attempt remain outside this profile and outside Git ("Execution" section).

## Identificação

| Item | Value | Evidence |
| --- | --- | --- |
| Repository | https://github.com/Oak-and-Sprout/sprout-track | — |
| Branch and commit | `main`, `eb26949461bd0455cb8d6137dc5bc417a02adcf9` | [EXEC] `git log` in the clone |
| Commit date | 12/10/2026 13:53:59 −0500, "fix(deploy): store backup.sh and service.sh as executable" | [EXEC] |
| History | 1.982 commits since 15/02/2025. Main authors: John Overton (1.734 + 146 under another name), Simon Bach (26), Giovanni Cerretani (20), Rafal Lesniak (11) | [EXEC] `git shortlog` |
| Size | 1.600 tracked files; 133 items in `tests/` | [EXEC] |
| Version | 1.6.8 (`package.json`) | [CÓDIGO] |
| License | "Sprout Track License", Copyright © 2026 John Overton and Oak and Sprout; SHA-256 `d512a5ac…09af6de2` | [CÓDIGO] [LICENSE.md](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/LICENSE.md) |
| Local clone | `C:/Projetos/AppMaternidade/_referencias/sprout-track`, read-only, clean `git status` | [EXEC] |

## Confirmed stack

| Component | Declared at the commit | Note |
| --- | --- | --- |
| Next.js / React | `^16.3.3` / `^19.2.8` | App Router; the development server started with Next.js 16.3.3 [EXEC] |
| TypeScript | `^7.0.2` | — |
| Prisma | `^7.10.0`, with `@prisma/adapter-pg` and `@prisma/adapter-better-sqlite3` adapters | SQLite by default; PostgreSQL through `db push` [DOC CLAUDE.md] |
| Authentication | `jsonwebtoken ^9.0.3`; account using email and password (bcrypt), and caregiver using a 2-digit ID + PIN | JWT stored in `localStorage` [DOC CLAUDE.md] |
| Push | `web-push ^3.6.7` (VAPID); FCM on Android and direct APNs on iOS, through the native shell | [CODE; DOC CLAUDE.md] |
| Tests | Vitest `^4.1.11` | [EXEC, log 10] |
| Mobile | Capacitor shell in a separate repository (`mobile-app-v1`), not analyzed | [DOC CLAUDE.md] |

## Flows analyzed

| Flow | Files read |
| --- | --- |
| Family scope | [app/api/utils/family-scope.ts](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/app/api/utils/family-scope.ts) and the rule described in [CLAUDE.md](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/CLAUDE.md) |
| Active activity and breastfeeding sessions | [schema.prisma L1751–L1797](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma#L1751-L1797), [app/api/active-activity/route.ts](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/app/api/active-activity/route.ts) |
| Nursery mode | [src/utils/nursery/timerBlocks.ts](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/src/utils/nursery/timerBlocks.ts) |
| Offline and PWA | [public/sw.js](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/public/sw.js) and a search for a local queue in `src` and `app` |
| Records and attribution | [schema.prisma](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma) (`SleepLog`, `PlayLog`, `Caretaker`, `Family`, `FamilyMember`, `Account`) |
| Languages | [src/localization/supported-languages.json](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/src/localization/supported-languages.json) |
| License | [LICENSE.md](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/LICENSE.md), read in full (55 lines) |

## Findings by topic

### Domain model

- **Family and people** [CÓDIGO]:
  - `Family` has a slug and name and is linked to at most one `Account`, the primary account with an email address.
  - `Caretaker` is the caregiver: a 2-digit login ID, PIN, free-form type (for example, "parent", "daycare", "nanny", "grandparent"), and role ([L293](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma#L293)).
  - `FamilyMember` links caregiver and family, with a role stored as text ("admin", "member").
- **Records with attribution** [CÓDIGO]. `SleepLog`, `FeedLog`, `DiaperLog`, `PlayLog`, `BathLog`, and others have `caretakerId` (who recorded it), `deletedAt` (soft deletion), and `familyId`. In `SleepLog`, duration is calculated from the start and end ([L349](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma#L349)). Attribution stores only one caregiver: it does not separate "started by" from "ended by".
- **`familyId` is optional throughout almost the entire schema** [CÓDIGO]. The field is `String?` in most models, with the comment "Nullable initially for migration". It is required in only a few, such as `FamilyMember`.
- **Tummy time** [CÓDIGO]: the `TUMMY_TIME` value of the `PlayType` enum, alongside indoor and outdoor play, outings, and custom activity ([L82](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma#L82)). The monthly report shows "Tummy time/day" as a metric (`src/components/Reports/MonthlyReportCard/ActivitySection.tsx`, line 28), and the search for a tummy time goal or target found nothing.
- **Breadth.** The schema also covers feeding, pumping and milk balance, foods and allergens, medications, vaccines, measurements with CDC and WHO curves, calendar, contacts, photos, and notes. It also has SaaS operation tables: subscription (Stripe fields), gift codes, short links, beta campaigns, and API keys [CÓDIGO].

### Validations

- **One active session per baby, enforced by the database** [CÓDIGO]. `ActiveBreastFeed.babyId` and `ActiveActivity.babyId` are `@unique`, with the comment "Only one active session per baby" ([L1751–L1797](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma#L1751-L1797)). The start route also checks first and responds with 409, "An active activity session already exists for this baby." ([active-activity/route.ts L78–L81](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/app/api/active-activity/route.ts#L78-L81)).
- **Pausing and accumulation** [CÓDIGO]. Active sessions store accumulated seconds, the current segment timestamp, and the session start; breastfeeding tracks these per side and supports pausing.
- Validations for overlaps, end after start, and future dates were not analyzed in this profile.

### Authorization and isolation

Description based on reading the code, in design terms.

- **Declared rule** [DOC CLAUDE.md]:
  - "Never trust client-sent family context." The family comes only from the middleware's `authContext`.
  - Reading, editing, and deleting by ID retrieve the resource and check the family, returning 404 if it does not match.
  - Creation checks the parent resource; listings filter by family.
- **Central helper** [CÓDIGO]. `resolveFamilyScope` uses the authenticated family as the authority. The family sent by the client can only confirm it, never change it. Only the system administrator can act in another family and must specify it ([family-scope.ts L18–L36](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/app/api/utils/family-scope.ts#L18-L36)).
- **Lesson documented by the project itself** [DOC CLAUDE.md]: an empty `OR` nested in Prisma can become a family-only filter and reach rows belonging to other owners. Their recommendation is to check the scope through the generated SQL, rather than the query object. The lesson applies to any ORM in AppMaternidade.
- **Audit questions, not demonstrated vulnerabilities:**
  - How does each route handle legacy records with a null `familyId`?
  - Does every route use the helper or the retrieval-then-check rule?

  The first attempt at this analysis ran access probes on a local instance with fictitious data. According to the [execution record](../../09_Evidencias/Execucao_Referencias/Sprout_Track/Registro_Execucao.md), they record behaviors that require attention. The files remain outside Git and are not detailed here until Daniel decides on responsible disclosure to the maintainers ([Decisions for Daniel](../../07_Roadmap/Decisoes_para_Daniel.md), D7).
- **Authentication designed for home and daycare** [DOC CLAUDE.md]:
  - a 2-digit ID and PIN per caregiver, on a numeric keypad;
  - JWT in `localStorage`, a list of tokens revoked on logout, and a configurable inactivity timeout;
  - an IP block for 5 minutes after 3 failures.

  This is practical on a shared daycare device. As the sole protection for an internet service holding children's health data, it is insufficient [HIP].

### Timers

- **Session on the server, with the display derived from it** [CÓDIGO]:
  - the active session is a database row, so any caregiver can see and end a session started by another;
  - the display derives "acordado há", "dormindo há", "desde a última mamada", and "desde a última fralda" from the records and the clock, with a 24 h cutoff and a warning threshold configurable per baby ([timerBlocks.ts](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/src/utils/nursery/timerBlocks.ts));
  - there is no background counter.
- **Warnings per baby** [CÓDIGO]: warning times for feeding (default 3 h), diapers (2 h), and pumping (3 h), and the option to count the feeding timer from the start or the end (`Baby` model).
- **Without a network connection** [CÓDIGO]: starting and ending a session depends on the server because there is no local queue (next section).

### Persistence and offline use

- **Service worker without caching** [CÓDIGO]. `public/sw.js` registers `fetch` with an empty function ([L5](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/public/sw.js#L5)), does not use `caches`, and handles only installation, activation, and push.
- **No local queue** [CÓDIGO]. The search for `indexedDB`, an offline queue, and `navigator.onLine` in `src` and `app` found nothing.
- **Contradiction with the documentation.** CLAUDE.md mentions "PWA architecture with offline support" [DOC], but the code at this commit does not support that claim. This is the example the task package asked to check: installing as a PWA does not mean offline writing.
- The browser observation from the first attempt is in the records outside Git (D7).

### Logging and history UI

Declared in the README [DOC]:

- daily dashboard;
- calendar;
- reports and growth curves;
- complete log with search and export;
- full-screen Nursery mode, with large buttons and configurable colors and brightness;
- dark mode.

What the code confirms [CÓDIGO]:

- the Nursery mode blocks;
- the caregiver's color in the timeline (`badgeColor`).

### Reports

The monthly report has an activities section with a daily tummy time average [CÓDIGO]. The curves use CDC and WHO tables loaded by the seed [EXEC, record step 5].

### API and integrations

- **Routes** [CÓDIGO]: REST routes in `app/api`, including `api-keys`, `hooks`, `import`, `database`, `notifications`, and `timeline`.
- **Declared integrations** [DOC README, "API & Integrations" section]: API keys and external integrations, with the `api-keys` and `hooks` routes [CODE, tree only].
- **Baby Buddy import** [CÓDIGO]: `src/lib/importers/baby-buddy/`.

### Testes

- **Executed** [EXEC, log 10]:
  - 132 files: 131 passed and 1 failed;
  - 1.755 tests: 1.753 passed and 2 failed;
  - the failures are in `tests/prisma-adapter.test.ts`, which expects POSIX paths and received `C:\...` on Windows.
- **Project rule** [DOC CLAUDE.md]: every change comes with a test, and logic goes into testable pure functions.

### Configuration and i18n

- **Languages:** 12, including **pt-BR** and pt-PT ([supported-languages.json](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/src/localization/supported-languages.json)) [CÓDIGO]. CLAUDE.md still lists only five files [outdated DOC].
- **Time zone:** there are server utilities (`app/api/utils/timezone.ts`), a `system-timezone` route, and a time zone debugging option in settings [CODE, tree only]. The behavior was not analyzed in this profile.
- **Deployment:** Docker with SQLite or PostgreSQL, or local execution with SQLite [DOC README].

## Execução

Summary of the [execution record](../../09_Evidencias/Execucao_Referencias/Sprout_Track/Registro_Execucao.md) from the first attempt, from 02:55 to 03:33 on 22/10/2026, with Node 24.20.0 on Windows 11 and a disposable SQLite database outside the clone.

| Step | Result | Evidence |
| --- | --- | --- |
| `npm ci --ignore-scripts` | 874 packages in about 5 min, exit 0 | [EXEC] [01_npm_ci.log](../../09_Evidencias/Execucao_Referencias/Sprout_Track/01_npm_ci.log) |
| `prisma generate` | Prisma clients 7.10.0, exit 0 | [EXEC] [02_prisma_generate.log](../../09_Evidencias/Execucao_Referencias/Sprout_Track/02_prisma_generate.log) |
| `prisma migrate deploy` | Migrations applied | [EXEC] [03_prisma_migrate.log](../../09_Evidencias/Execucao_Referencias/Sprout_Track/03_prisma_migrate.log) |
| `db push` of the log database | **Refused by Prisma 7.10**, which detected execution by an AI agent and required explicit user consent for a destructive action. It was not bypassed; the log database is unnecessary with `ENABLE_LOG=false` | [EXEC] same log |
| `better-sqlite3` binary | Prebuilt binary downloaded and extracted, exit 0; tarball removed afterward | [EXEC] [04_better_sqlite3_prebuild.log](../../09_Evidencias/Execucao_Referencias/Sprout_Track/04_better_sqlite3_prebuild.log) |
| Seed | Default family, system caregiver with documented default PIN, 28 units, and CDC and WHO curves, exit 0 | [EXEC] [05_seed.log](../../09_Evidencias/Execucao_Referencias/Sprout_Track/05_seed.log) |
| `next dev` on 127.0.0.1:38317 | Ready in 2,2 s. `next dev` 16.3 added a block to the clone's `CLAUDE.md`, reverted with `git checkout` | [EXEC] record, step 6 |
| `vitest run` | 1.753 of 1.755 tests passed | [EXEC] [10_vitest.log](../../09_Evidencias/Execucao_Referencias/Sprout_Track/10_vitest.log) |
| Cleanup | `next dev` process tree terminated, port free, tabs closed, no Docker | [EXEC] record |

**Outside this profile and outside Git:** the API probes and interface observation with an offline test (`06`, `07`, `08`, `09`, `11`, `12` and `roteiros/api_probe*.py`, `check_offline.py`). They remain on disk, ignored by `.gitignore`, until decision D7.

**Not executed:** production build, Docker, PostgreSQL, push, SaaS mode, email accounts, native shell, and a real mobile device.

## Licenses by material

| Material | License | What it means for AppMaternidade |
| --- | --- | --- |
| Code, documentation, and repository files | **Sprout Track License**. Grants use, copying, modification, distribution, and derivative works (section 2), subject to three conditions (section 3): attribution; **non-commercial use**, which excludes providing services for compensation, incorporation into a product sold, and "generate revenue, directly or indirectly"; and **sharing under the same license** | An app that may have subscriptions, partnerships, or any revenue, direct or indirect, cannot incorporate the code. The rights holders reserve commercial use and may license under other terms (section 4), which would require an agreement |
| README images (`public/readme/*.png`) | Same license, as "associated files" (section 1) | Do not reuse |
| Dependencies | Listed by `package-lock.json` after the independent review: 520 production entries, mostly MIT, ISC, and Apache-2.0. To check: `heic-to` (LGPL-3.0), `web-push` (MPL-2.0), `@img/sharp-*` (LGPL-3.0-or-later, optional), `elkjs` (EPL-2.0), `caniuse-lite` (CC-BY-4.0), and 2 with no declared license ([list](../../09_Evidencias/Execucao_Referencias/Sprout_Track/13_licencas_dependencias.tsv)) | If AppMaternidade chooses any of these libraries, it is assessed under its own license, independently of Sprout Track |
| CDC and WHO curves in the seed | Public data from their respective sources; source licenses must be checked separately | Obtain from primary sources, not this repository |
| Name and brand | "Sprout Track", "Oak and Sprout" | Do not use |

This is a technical reading of the license, not a legal opinion.

## What to use as a concept

Only as an idea, implemented from scratch:

1. Full-screen mode for nighttime and daycare, with large buttons and "how long ago" blocks.
2. Active session on the server, with pausing and accumulation per side. Sprout Track's uniqueness rule (database constraint and 409) is not copied: offline, the second session cannot be rejected. In AppMaternidade, both are accepted and flagged for merging ([Offline, section 7.2](../../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)).
3. Caregiver attribution in every record and the caregiver's color in the timeline.
4. Warning thresholds per baby ("mamada há mais de 3 h"), configurable by the family.
5. Tummy time as a timed activity with an average metric in the report, without a target.
6. An explicit "do not trust the family sent by the client" rule, with a single helper and verification through the generated SQL.

## What can be reused under the license

None of the code, images, or text, as long as AppMaternidade may have any revenue. The alternative would be an agreement with the rights holders (section 4). There is no recommendation to seek that agreement.

## Required adaptations

- **Actual offline support:** persistent local queue and local database ([ADR-004](../../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md)). Here, the active session depends on the server.
- **Separate "started by" and "ended by" fields**, in addition to the record's author.
- **Required `familyId`** in all care data, with no legacy null state ([Data model, invariants](../../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md)).
- **Internet service authentication:** an account per person and a code by email ([ADR-003](../../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md)). The PIN can serve as a local lock on a shared device, never as the sole credential [HIP].
- **Native app,** not a WebView, for a timer on the lock screen and encrypted storage ([ADR-002](../../06_ADRs/ADR-002_Framework_Mobile.md)).

## What not to reproduce

- Claiming offline support without caching or a queue.
- "Temporarily" optional `familyId` in family data.
- JWT in `localStorage` in a web app with sensitive data [HIP].
- A short PIN as the main credential for an exposed service.

## Risks and problems found

| Risk | Evidence | Impact on AppMaternidade |
| --- | --- | --- |
| Non-commercial license requiring sharing under the same license | [CÓDIGO] LICENSE.md | No code reuse |
| Documentation claims offline support; the code does not have it | [CÓDIGO] sw.js; [DOC] CLAUDE.md | Confirms that a PWA does not meet the offline requirement |
| Optional `familyId` throughout most of the schema | [CÓDIGO] schema.prisma | Audit question; reinforces the mandatory scope invariant |
| Undisclosed access observations from the first attempt | [EXEC] records outside Git | Decision D7 before publishing the vault |
| Tests dependent on POSIX paths | [EXEC] log 10 | Lesson for our CI: run tests on Windows too, or isolate paths |

## Relationship to scenarios Q-01 through Q-12

| Scenario | What Sprout Track shows | Class | Lesson for AppMaternidade |
| --- | --- | --- | --- |
| Q-01 offline, close and reopen | No caching or queue; logging depends on the server | [CÓDIGO] | Persistent local queue with visible state |
| Q-02 resubmission | No operation ID seen during the reading | [HIP] | Operation ID and idempotency |
| Q-03 A starts, B ends | Active session on the server, unique per baby; any caregiver can end it; attribution stores one caregiver | [CÓDIGO] | Shared session with "started by" and "ended by". Parallel sessions are accepted and flagged for merging because they cannot be rejected offline (Offline, 7.2) |
| Q-04 concurrent editing | Not analyzed | — | Version per record |
| Q-05 revocation | List of tokens revoked on logout; no offline cache to clear | [DOC] | Revalidation on reconnection and local cleanup |
| Q-06 IDs from another family | Central rule and helper; audit questions about records without a family | [CÓDIGO] [DOC] | Scope based on the current relationship and testing in every route |
| Q-07 community | Does not exist | [CÓDIGO] | No reference |
| Q-08 lock screen | Blocks derived from the clock and records; session on the server | [CÓDIGO] | Same principle, with local state |
| Q-09 time zone and midnight | Server time zone utilities; behavior not analyzed | [CODE, tree] | Time zone stored with the event |
| Q-10 notification | Web push (VAPID) and native push (FCM, APNs) | [CÓDIGO] [DOC] | Logging without depending on push |
| Q-11 moderation | Does not exist | [CÓDIGO] | No reference |
| Q-12 export, delete, backup | Export declared; database and backup routes; account closure (`closed`, `closedAt`) | [DOC] [CÓDIGO] | Export per family and propagated deletion |

## Open questions

1. How do the routes handle records with a null `familyId`? (Audit question.)
2. When the account is closed (`closed`), is the family's data deleted or only deactivated?
3. How does the Capacitor shell store the token and behave without a network connection?
4. How do the time zone utilities define the day: by the server's time zone or the caregiver's?
5. Will Daniel notify the maintainers about the observations from the first attempt (D7)?

## Limits of this analysis

- Profile written by the coordinator, based on reading code and the execution record, after two unfinished subagent attempts: the first interrupted by the provider's filter around 03:37, the second by a lack of response from the provider at 04:54.
- Under the rule adopted after the blocks, there was no further execution or request to the app. The access observations are audit questions.
- Partial reading: individual routes, components, time zone utilities, and the native shell were not read line by line.

## Voltar

[Home](../../00_Inicio/Home.md) · [Progress](../../00_Inicio/Progresso.md) · [Finnberry](Finnberry.md) · [Baby Buddy](Baby_Buddy.md)
