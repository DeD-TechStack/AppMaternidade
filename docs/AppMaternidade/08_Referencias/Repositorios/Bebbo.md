---
tipo: repository-profile
status: draft
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
tarefa: MAT-5
repositorio: https://github.com/UNICEFECAR/parenting-app-bebbo-mobile
branch: main
commit: 5ec8c89198368638c8111b80c6159cfb12f5e9ad
licenca_raiz: GPL-3.0
fontes_principais:
  - https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/tree/5ec8c89198368638c8111b80c6159cfb12f5e9ad
  - https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/README.md
  - https://www.bebbo.app/terms-and-conditions
  - https://www.bebbo.app/privacy-policy
  - https://www.fsf.org/news/2010-05-app-store-compliance
---

# Bebbo (UNICEF)

Profile written by reading the code at commit `5ec8c89` and the [execution evidence](../../09_Evidencias/Execucao_Referencias/Bebbo/00_Indice.md) already recorded. It also uses Bebbo's public terms and privacy policy, accessed on 22/10/2026. Evidence labels follow the [Conventions](../../00_Inicio/Convencoes.md). Code links point to the analyzed commit.

## Resumo

- **What it is.** UNICEF parenting app, published as a Digital Public Good, for pregnancy and children aged 0 to 6 years [DOC README; DOC terms].
  - It uses React Native, with content and child data stored on the device.
  - Features: age-based content (advice, games, videos and frequently asked questions), developmental milestones, growth charts, vaccinations and appointments with reminders, daily messages and an FAQ chatbot.
  - The same code serves several national "instances".
- **It is not a routine tracker.** There is no logging of sleep, feeding or diapers, and no timers. The child has measurements, reminders, checked milestones and favorites [CÓDIGO].
- **Useful as a reference for offline content:**
  - initial content bundled by language;
  - incremental synchronization by date;
  - **local removal of withdrawn content** (endpoint `archive`);
  - data saver mode;
  - age ranges with a margin and corrected age for premature babies [CÓDIGO].
- **Not useful for:**
  - shared care: one device per family; importing a backup **replaces** all data [CÓDIGO];
  - community: there is none;
  - tone around development: milestone percentage with a "Pending" label [CÓDIGO].
- **License:** code GPL-3.0 and proprietary content owned by UNICEF and licensors, for personal and noncommercial use only. **No code or content goes into AppMaternidade**; only concepts, implemented from scratch.
- **Repository health** [EXEC]:
  - 154 TypeScript errors, no tests, ESLint with an internal failure and CI disabled on `main` since 04/2025;
  - 97 alerts in `npm audit`;
  - discontinued or archived core libraries;
  - in the last 12 months, 201 of 203 commits are from one person.

## Identificação

| Item | Value | Evidence |
| --- | --- | --- |
| Repository | https://github.com/UNICEFECAR/parenting-app-bebbo-mobile | — |
| Branch and commit | `main`, `5ec8c89198368638c8111b80c6159cfb12f5e9ad`; matches the package snapshot | [EXEC] [02_identificacao.log](../../09_Evidencias/Execucao_Referencias/Bebbo/02_identificacao.log) |
| Commit date | 15/09/2026 18:24:54 +0530, "Merge pull request #1106 from UNICEFECAR/Development"; tag `Prod_v2.5.0` | [EXEC] logs 02 and 04 |
| History | 10.987 commits since 19/05/2021. Last 12 months: 203 commits (129 excluding merges), 201 by neharuparel and 2 by Jignesh Rana | [EXEC] [04_historico_git.log](../../09_Evidencias/Execucao_Referencias/Bebbo/04_historico_git.log) |
| GitHub | Not archived; 19 stars, 25 forks, 11 open issues; last push on 19/10/2026; Dependabot PRs open since 02/04/2026 | [EXEC] [05_github_api.log](../../09_Evidencias/Execucao_Referencias/Bebbo/05_github_api.log) |
| Size | 274 MB without `.git`; `app/instances` occupies 237 MB across 4.303 files (content and images by country) | [EXEC] logs 02 and 12 |
| License | GPL-3.0 (file `LICENSE`; SPDX `GPL-3.0` on GitHub) | [CÓDIGO] [EXEC] log 05 |
| CMS | `UNICEFECAR/parenting-app-bebbo-CMS`: PHP (Drupal), GPL-3.0, commit `5060246f` from 13/10/2026; tree read, code not analyzed | [EXEC] logs 05 and 12 |
| Local clone | `C:/Projetos/AppMaternidade/_referencias/bebbo`, read-only, clean `git status`. **Deleted on 24/10/2026, between 19:32 and 19:34, during disk cleanup** (receipt `C:/OrchestrationLab/exports/Limpeza_20261024/recibos/recibo_projetos_20261024.json`). Links in this profile point to GitHub; to reread the code locally, clone again and check out commit `5ec8c89198368638c8111b80c6159cfb12f5e9ad`. | [EXEC] log 02 |

## Confirmed stack

Versions installed after `npm ci` [EXEC, log 05], with the declarations in `package.json` [CÓDIGO]:

| Component | Version | Use |
| --- | --- | --- |
| React Native / React | 0.78.2 / 19.0.0 | Android and iOS app; native code was migrated to Kotlin and Swift in 07/2025 [EXEC log 04] |
| TypeScript | 5.0.4 | `tsc --noEmit` fails with 154 errors [EXEC log 07] |
| Realm | 20.2.0 | Local database in two files: `user.realm` (child data and events) and `data.realm` (content). The README for `realm-js` warns about the discontinuation of Atlas Device Sync and the SDKs in 09/2024 [EXEC log 05] |
| Redux Toolkit + redux-persist | 2.8.2 + 6.0.0 | State and preferences |
| i18next | 25.4.2 | 23 languages in the main instance; no Portuguese [EXEC log 12] |
| Firebase | 22.4.0 | Analytics, Crashlytics and Messaging (remote push) [CODE; DOC README] |
| react-native-push-notification | 8.1.1 | Local reminders; the upstream repository has been archived since 30/01/2024 [EXEC log 05] |
| Google Sign-In + Google Drive API | 15.0.0 + 2.2.4 | Backup to the user's Google Drive |
| react-native-aes-crypto | 3.2.1 | Backup file encryption |

## Flows analyzed

| Flow | Files read |
| --- | --- |
| Child data | [ChildDataSchema.ts L3–L102](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/database/schema/ChildDataSchema.ts#L3-L102), [dbConfig.ts](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/database/config/dbConfig.ts) |
| Export, backup and import | [backup.tsx](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/backup.tsx), [googleAuth.ts L32](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/googleAuth.ts#L32), `components/homeScreen/QuickLinksRow.tsx` |
| Offline content and synchronization | [periodicSync.ts](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/periodicSync.ts), [Utils.ts L94–L100 and L190–L200](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/Utils.ts#L94-L100), `services/commonApiService.ts`, `instances/bebbo/config/appConfig.ts` |
| Analytics with an offline queue | [EventSyncService.ts](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/EventSyncService.ts), [EventSchema.ts](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/database/schema/EventSchema.ts), `services/firebaseAnalytics.ts` |
| Terms acceptance | [Terms.tsx L239–L253](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/screens/Terms.tsx#L239-L253) |
| Developmental milestones | [ChildDevelopment.tsx L330–L335 and L494–L530](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/screens/home/bottomTabs/ChildDevelopment.tsx#L330-L335) and text in [en.ts L142–L151 and L345–L347](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/instances/bebbo/assets/locale/en.ts#L142-L151) |
| Growth and premature babies | [GrowthChart.tsx L140–L141](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/components/growth/GrowthChart.tsx#L140-L141) |
| Chatbot | [SupportChat.tsx L65–L71](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/screens/home/SupportChat.tsx#L65-L71), `screens/home/ChatBot.tsx` |
| Settings | `screens/home/SettingScreen.tsx` (text keys used) |

## Findings by topic

### Domain model

- **Child** (`ChildEntity`) [CÓDIGO]:
  - name, gender, optional photo;
  - birth date and expected due date (`plannedTermDate`), premature and expected;
  - embedded measurements: weight, height, date, location, vaccinations received and doctor's comment;
  - embedded reminders (vaccination, appointment);
  - list of checked milestones and favorites.
- **No people beyond the device** [CÓDIGO]. There is no account, caregiver, role or authorship. The app stores the guardian's gender and relationship to the child as a local preference [EXEC log 04, commit `12c6cd68`].
- **Content** (`data.realm`) [CODE; EXEC log 12]:
  - articles, videos, activities ("games"), milestones, frequently asked questions, vaccinations and appointments by country, daily messages, surveys and standard deviation tables for the charts;
  - editorial fields: `child_age`, `child_gender`, `parent_gender`, `premature`, `mandatory`, `licensed`, `related_milestone` and `related_activities`.
- **Age ranges** [EXEC log 12]:
  - 13 ranges, from "Pregnancy" (−300 to −1 day) to "61-72 months";
  - a margin of 10 days (`buffers_days`), with content from neighboring ranges (`age_bracket`).
- **Tummy time** [CÓDIGO]. Appears in content, without logging or a timer:
  - activities such as "My First Turns";
  - the milestone "When lying on his tummy, he lifts his head";
  - an illustrated article about placing the baby on their tummy.

### Validation

Not analyzed line by line. Weight and height forms pass values between screens; range validation was not checked.

### Authorization and isolation

- **There is no user data on the server** [CODE; DOC policy]. Child data stays only on the device. The CMS API delivers public content by language and country, without login [CODE `appConfig.ts`; EXEC log 14, three content queries documented in the README].
- **Unencrypted local database** [CODE; DOC policy]:
  - the Realm configuration has no `encryptionKey`, and no occurrence appears in `app/` [EXEC log 12];
  - the policy itself states "unencrypted databases located on the user's personal smart device".
- **Backup encrypted with a build key** [CODE; DOC README]:
  - export uses AES-256-CBC with a key and initialization vector from build variables (`react-native-dotenv`), rather than a user password;
  - the README describes the key as an environment configuration value (lines 248 and 269), which suggests the same key for all installations of an app.
  - Audit question, not a demonstrated vulnerability: what protection does this file offer against someone with access to Google Drive or the shared file?
- **Google Drive scope** [CÓDIGO]: `drive.file` and `drive.appfolder`, meaning only files created by the app.

### Timers

There are none. Vaccination and appointment reminders are scheduled local notifications [CÓDIGO]. The terms recommend "keeps a separate track of these dates and reminders, and does not only rely on Bebbo's notifications" [DOC terms].

### Persistence and offline use

- **Truly offline content** [CODE; EXEC log 12]:
  - initial content bundled in the app by language (`assets/offlinecontent`);
  - incremental synchronization with dates stored by type (for example, `archiveDatetime`);
  - periodic checks at 7 and 30 days (`firstPeriodicSyncDays`, `secondPeriodicSyncDays`).
- **Content withdrawal** [CÓDIGO]. The `archive` endpoint returns withdrawn items, and the app deletes them from the local database for articles, videos, activities and frequently asked questions ([Utils.ts L94–L100 and L190–L200](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/Utils.ts#L190-L200)). This is the mechanism that [ADR-007](../../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md) calls for in AppMaternidade content.
- **Data saving** [CÓDIGO]: a "data saver" option that avoids images and videos, and buttons to download all content or update.
- **Offline analytics event queue** [CÓDIGO]. Without a network connection, the event goes into the `Event` table with `isSynchronized: false` and is sent later. Commit `12c6cd68` fixed parameters that were being lost in this queue [EXEC log 04]. It is a simple outbox pattern, without an operation ID.
- **No child data synchronization** [CÓDIGO]. Switching devices requires exporting and importing.

### Logging and history UI

Screens for growth, vaccinations, appointments, milestones, advice, games, favorites, notifications, user guide and settings [CODE, screen list].

**Milestones:**

- the screen shows a circle with the percentage of milestones for the current period;
- the label is "Pending" until it reaches 100%, with a warning icon, and "Congratulations, your child has reached all milestones!" when it does [CÓDIGO].

This is the opposite of the tone proposed in DF-3 of [Competitors and differentiators](../../01_Produto/Concorrentes_e_Diferenciais.md).

### Reports

Growth charts with standard deviation tables. For premature babies, the chart uses the expected due date as a reference, meaning corrected age ([GrowthChart.tsx L140–L141](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/components/growth/GrowthChart.tsx#L140-L141)) [CÓDIGO].

### API and integrations

- **CMS API** [CÓDIGO]:
  - read-only;
  - endpoints `articles`, `video-articles`, `activities`, `milestones`, `faqs`, `vaccinations`, `health-checkup-data`, `taxonomies`, `check-update`, `archive` and `country-groups`.
- **Configuration by country** [EXEC log 14]: the response from `country-groups` includes a `content_toggle` field with values such as `ai_chatbot`. The app code at this commit does not use this value [CODE, search found no occurrences]. There is a `ReraiChatbot` branch [EXEC log 05].
- **Current chatbot** [CÓDIGO]: a fixed script of category, subcategory and frequently asked question, with delays that simulate typing, linked to articles. There is no generative AI.

### Testes

- **No tests** [EXEC log 08]: `jest --ci` responds "No tests found".
- **CI disabled** [EXEC log 04]: commit `3ba19b14` from 24/04/2025, "Disbaling CI pipeline run on Development and Main branch".
- **TypeScript:** 154 errors [EXEC log 07].
- **ESLint:** internal failure with the repository configuration [EXEC log 11].

### Configuration and i18n

- **National instances** [EXEC log 12]: bebbo, bebboPacific, foleja, merhabaBebek, reraiUmntwana, wawamor and babuni, each with its own branding, languages, content and Firebase.
- **Interface strings:** about 460 per locale [EXEC log 12].
- **Accessibility** [EXEC log 12]:
  - zero `accessibilityLabel`, `accessibilityRole` and `accessibilityHint` in `app/`;
  - `allowFontScaling={false}` in 14 places, which prevents text from following the system font size;
  - 111 touchable components.
- **Analytics** [CÓDIGO]:
  - user properties: country, language, platform and distribution channel;
  - usage events, including selected age range, number of children and checked milestone;
  - **text typed into searches** for advice and games ([Activities.tsx L954](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/screens/home/bottomTabs/Activities.tsx#L954), [Articles.tsx L867](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/screens/home/bottomTabs/Articles.tsx#L867)).
  - The policy refers to anonymous data [DOC]. Free text may contain personal data [HIP].
- **Consent** [CÓDIGO]: the terms screen has a single acceptance checkbox. The review found no separate analytics option in settings [HYP about absence].

## Execução

Summary of logs from the first attempt, from 02:57 to 03:36 on 22/10/2026, with Windows 11, Node 24.20.0 and npm 11.19.0, without Docker.

| Step | Result | Evidence |
| --- | --- | --- |
| Clone and identification | Commit matches the package snapshot | [EXEC] logs [01](../../09_Evidencias/Execucao_Referencias/Bebbo/01_clone.log) and [02](../../09_Evidencias/Execucao_Referencias/Bebbo/02_identificacao.log) |
| `npm ci --ignore-scripts --legacy-peer-deps` | 1.409 packages in 6 min, exit 0 | [EXEC] [06_npm_ci.log](../../09_Evidencias/Execucao_Referencias/Bebbo/06_npm_ci.log) |
| `tsc --noEmit` | 154 errors, exit 2 | [EXEC] [07_tsc.log](../../09_Evidencias/Execucao_Referencias/Bebbo/07_tsc.log) |
| `jest` | No tests found | [EXEC] [08_jest.log](../../09_Evidencias/Execucao_Referencias/Bebbo/08_jest.log) |
| `npm audit` | 97 alerts (1 critical, 81 high, 14 moderate, 1 low); production only: 63 (1, 46, 15, 1) | [EXEC] [09_10_resumo_audit_outdated.log](../../09_Evidencias/Execucao_Referencias/Bebbo/09_10_resumo_audit_outdated.log) |
| `npm outdated` | 81 outdated packages, 43 behind by a major version | [EXEC] same log |
| ESLint | Internal failure | [EXEC] [11_eslint.log](../../09_Evidencias/Execucao_Referencias/Bebbo/11_eslint.log) |
| Android and iOS build | **Not run.** Missing Android SDK 35, Build-Tools and NDK, macOS and Xcode, the `env/` files and `google-services.json`, which are not in the repository | [EXEC] [03_ambiente_build.log](../../09_Evidencias/Execucao_Referencias/Bebbo/03_ambiente_build.log) |
| Content structure | Ranges, languages, counts and accessibility | [EXEC] [12_estrutura_conteudo_e_cms.log](../../09_Evidencias/Execucao_Referencias/Bebbo/12_estrutura_conteudo_e_cms.log) |
| Dependency licenses | 97 direct (86 MIT, 7 Apache-2.0, 2 ISC, 1 MIT and Apache-2.0, 1 BSD-2-Clause) and 18 development (17 MIT, 1 Apache-2.0); no GPL | [EXEC] [15_licencas_dependencias.tsv](../../09_Evidencias/Execucao_Referencias/Bebbo/15_licencas_dependencias.tsv) |

**Not run:** app in an emulator or on a device, Google Drive backup, push and the CMS.

## Licenses by material

| Material | License | What it means for AppMaternidade |
| --- | --- | --- |
| App code | GPL-3.0 | Incorporating code would require distributing AppMaternidade under GPL-3.0, with the source code. There is another problem on the App Store: in 2010, the FSF concluded that the store's terms conflict with GPLv2 (section 6), and GNU Go was removed ([FSF](https://www.fsf.org/news/2010-05-app-store-compliance)). GPLv3 has a similar clause (section 10) [HYP, technical interpretation]. **Do not reuse** |
| Content (articles, videos, activities, illustrations) | Proprietary to UNICEF and licensors. The terms say "not for commercial use", prohibit digital copies and modifications, and forbid the use of illustrations, photos, video and audio ([terms](https://www.bebbo.app/terms-and-conditions)) | **Do not reuse.** Write original content based on primary sources |
| UNICEF name and emblem; Bebbo brand | Protected ([terms](https://www.bebbo.app/terms-and-conditions)) | Do not use |
| CMS | GPL-3.0 | Do not reuse |
| Direct dependencies | MIT, Apache-2.0, ISC and BSD-2-Clause | Can be chosen independently, as in any project, without any connection to Bebbo |
| Growth tables | Origin in reference sources, not checked here | Obtain from primary sources (WHO) |

The README presents Bebbo as a Digital Public Good, with reuse by governments, UNICEF offices and eligible partners [DOC README]. This is a technical interpretation, not a legal opinion.

## What to use as a concept

Only as an idea, implemented from scratch:

1. Bundled offline content, with incremental synchronization by date and a **withdrawal list processed on the device**.
2. Age ranges with a margin and content from neighboring ranges, including pregnancy.
3. Corrected age for premature babies based on the expected due date.
4. Data saver mode and advance content download.
5. Editorial fields per item (range, gender, premature, relationship to milestones and activities).
6. Local analytics event queue sent later, without blocking use.
7. Honest notices in the terms: the app does not replace a consultation, and reminders should not be the only source.
8. A fixed-script assistant linked to reviewed content, if there ever is one, instead of generative AI.

## What can be reused under the license

None of the code (GPL-3.0) or content (proprietary and noncommercial).

## Necessary adaptations

- **True shared care:** an account per person, roles, synchronization and merging, instead of importing a file that replaces everything ([Data model](../../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md)).
- **Encrypted local database,** with the key in Keychain or Keystore ([Privacy and security](../../05_Privacidade_Operacao/Privacidade_e_Seguranca.md), section 9).
- **Export** with a key derived from something belonging to the user, or without encryption but with a clear warning. Never the same key for all installations [HIP].
- **Milestones without a percentage or "Pending":** "ainda não" as a neutral response ([Development and content](../../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md)).
- **Analytics** only with a separate opt-in, without free text in events.
- **Accessibility:** labels on all controls and respect for font scaling.

## What not to reproduce

- Milestone percentage with a "Pending" label and warning icon.
- Unencrypted local database for child health data.
- The same backup key for all installations.
- Search text sent to analytics.
- `allowFontScaling={false}` and controls without accessibility labels.
- Codebase without tests, with CI disabled and discontinued core libraries (Realm Sync, `react-native-push-notification`).

## Risks and problems found

| Risk | Evidence | Impact on AppMaternidade |
| --- | --- | --- |
| Code license GPL-3.0 and proprietary content | [CÓDIGO] [DOC] | No reuse |
| Dependence on one person (201 of 203 commits in 12 months) | [EXEC] log 04 | Concept reference only; do not depend on the project |
| Discontinued or archived libraries | [EXEC] log 05 | Reinforces the choice of PowerSync and maintained notifications ([ADR-003](../../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md)) |
| No tests and 154 type errors | [EXEC] logs 07 and 08 | Lesson: CI with type checks and tests from the start ([Quality and validation](../../05_Privacidade_Operacao/Qualidade_e_Validacao.md)) |
| 97 dependency alerts (63 in production) | [EXEC] log 09 | Lesson: dependency review for each release |
| Unencrypted local database, declared in the policy | [CÓDIGO] [DOC] | Opposite requirement in AppMaternidade |

## Relationship to scenarios Q-01 to Q-12

| Scenario | What Bebbo shows | Class | Lesson for AppMaternidade |
| --- | --- | --- | --- |
| Q-01 offline, close and reopen | Local-only data; bundled content; everything works without a network connection | [CÓDIGO] | Same behavior for logging and content, but with synchronization |
| Q-02 resend | The event queue marks `isSynchronized`, without an operation ID | [CÓDIGO] | Operation ID and idempotency |
| Q-03 A starts, B ends | Does not apply: no timers and no multiple caregivers | [CÓDIGO] | No reference |
| Q-04 concurrent editing | Import deletes everything and replaces it (`deleteAllAtOnce`) | [CÓDIGO] | Merge by record, never full replacement |
| Q-05 revocation | Does not apply: no sharing | [CÓDIGO] | No reference |
| Q-06 IDs from another family | Does not apply: no user data on the server | [CÓDIGO] | No reference |
| Q-07 community | Does not exist; the chatbot is a fixed script | [CÓDIGO] | No reference |
| Q-08 locked screen | No timers | [CÓDIGO] | No reference |
| Q-09 time zone and midnight | Age in days based on the device clock (Luxon) | [CÓDIGO] | Age and day based on the event's local time zone |
| Q-10 notification | Local reminders and remote push; the terms ask for separate tracking of dates | [CÓDIGO] [DOC] | Logging without depending on push; honest text about reminders |
| Q-11 moderation | Does not exist | [CÓDIGO] | No reference |
| Q-12 export, delete, backup | Encrypted export to Google Drive (app folder) or a file; import replaces | [CÓDIGO] [DOC] | Complete export per family, plus server backup with propagated deletion |

## Open questions

1. What will the `ReraiChatbot` branch and the `ai_chatbot` value bring: generative AI answering families?
2. How does the app delete a child's profile? Does it also delete scheduled reminders?
3. Is the backup key different for each national instance?
4. Does the CMS record authorship and professional review of content? The CMS code was not read.

## Limits of this analysis

- Profile written by the coordinator by reading code, recorded logs and public pages. Two subagent attempts did not finish: the first because the provider did not respond in the initial batch, the second (`deleg_02d9d149`) at 05:10.
- No build and no app execution, due to the lack of an Android SDK and macOS.
- Partial reading: individual screens, CMS, validation and profile deletion were not read line by line.

## Voltar

[Home](../../00_Inicio/Home.md) · [Progress](../../00_Inicio/Progresso.md) · [Finnberry](Finnberry.md) · [Baby Buddy](Baby_Buddy.md) · [Sprout Track](Sprout_Track.md)
