---
tipo: analysis
status: draft
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
tarefa: MAT-5
fontes_principais:
  - 08_Referencias/Repositorios/Finnberry.md
  - 08_Referencias/Repositorios/Baby_Buddy.md
  - 08_Referencias/Repositorios/Sprout_Track.md
  - 08_Referencias/Repositorios/Bebbo.md
  - 09_Evidencias/Execucao_Referencias/
---

# Analysis of the reference repositories

Synthesis of the four profiles. Details, line permalinks, and evidence classes are in each profile. This note compares the four projects and states what AppMaternidade takes from each one.

**General rule:** no code, text, images, or branding from the four projects were copied. Only concepts are adopted, implemented from scratch ([Licenses and sources](Licencas_e_Fontes.md)).

## 1. Identification

| Project | Branch and commit | Commit date | Root license | Activity | Stack | Profile |
| --- | --- | --- | --- | --- | --- | --- |
| Finnberry | `main` `5e17b1a71e10735f0b6aaa22996ce37349d9402c` | 30/01/2026 | MIT | 104 commits between 25 and 30/01/2026; none since | Next.js 15, tRPC (RC), Prisma, NextAuth (beta), Supabase Realtime; web only | [Finnberry](Repositorios/Finnberry.md) |
| Baby Buddy | `master` `09629cf633cf3a2059a21ade4cea7ea4d846422f` | 12/10/2026 | BSD-2-Clause | 2.013 commits; active | Django 5.2, DRF, SQLite/PostgreSQL; server-rendered web | [Baby Buddy](Repositorios/Baby_Buddy.md) |
| Sprout Track | `main` `eb26949461bd0455cb8d6137dc5bc417a02adcf9` | 12/10/2026 | Custom: noncommercial and share-alike | 1.982 commits; active | Next.js 16, Prisma 7, SQLite/PostgreSQL; Capacitor shell in another repository | [Sprout Track](Repositorios/Sprout_Track.md) |
| Bebbo (UNICEF) | `main` `5ec8c89198368638c8111b80c6159cfb12f5e9ad` | 15/09/2026 | GPL-3.0 | 10.987 commits; in the last 12 months, 201 of 203 from one person | React Native 0.78, Realm 20, Firebase; Android and iOS app | [Bebbo](Repositorios/Bebbo.md) |

The four commits are the same as those in the task package snapshot (`03_REPOSITORIOS_REFERENCIA.md`).

## 2. What was actually run

| Project | Installation | Tests | App running | Not run and why |
| --- | --- | --- | --- | --- |
| Finnberry | `pnpm install` and `prisma generate` [EXEC] | 613 unit and integration tests, with mocked Prisma [EXEC] | No. Only the schema was applied to a disposable local PostgreSQL instance | Server, E2E, and chat: the second round switched to reading code only |
| Baby Buddy | venv and `pip install` [EXEC] | 528 tests plus 1 in isolation, all passed [EXEC] | Yes, `runserver` at 127.0.0.1 with fictitious data | Gunicorn, PostgreSQL, and DEBUG=False |
| Sprout Track | `npm ci`, Prisma, and seed [EXEC] | 1.753 of 1.755 tests passed; the 2 failures are due to Windows paths [EXEC] | Yes, `next dev` at 127.0.0.1 with fictitious data | Build, Docker, push, and the native shell |
| Bebbo | `npm ci` [EXEC] | No tests exist; `tsc` with 154 errors [EXEC] | No | Android and iOS builds: missing SDK, macOS, and environment files outside the repository |

**How execution changed along the way:**

1. **First round.** While running Baby Buddy and Sprout Track, the subagents also tested access between fictitious accounts.
2. **Provider block.** The Finnberry, Sprout Track, and Baby Buddy analyses were interrupted by the provider's content filter.
3. **Rule adopted afterward:** no requests that test authorization. Family isolation was then described only through code reading, as an audit question.
4. **Existing records.** The records of those tests remain on disk, outside Git, until decision D7 ([Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md)).

Details in [Progress](../00_Inicio/Progresso.md).

## 3. Comparison by topic

| Topic | Finnberry | Baby Buddy | Sprout Track | Bebbo |
| --- | --- | --- | --- | --- |
| Family and roles | Family with 4 roles; email invitation valid for 7 days | No family exists; permission by record type, applying to the entire installation | Family, caregivers with a PIN and an admin or member role | No people; one device per family |
| Record authorship | None | None | One caregiver per record (`caretakerId`) | Not applicable |
| Ongoing session (timer) | Derived from the start time, stored on the device (`localStorage`) | On the server, derived from the start time; stopping deletes it; the owner check does not cover restarting | On the server, **one per baby enforced in the database**; pause and accumulation per side | None |
| Offline | No queue or persistent cache | None | The service worker does not cache; there is no queue. The documentation says otherwise | Local data only; bundled content, with incremental synchronization and withdrawal |
| Domain validation | Zod schemas | Good rules: nothing in the future, start before end, up to 24 h, no overlap; no idempotency | One session per baby; other rules not analyzed | Not analyzed |
| Time zone and "day" | "Hoje" calculated on the server | UTC in the database; time zone only per session; different day rules across screens | Server time zone utilities, not analyzed | Device clock |
| Isolation between families | Audit questions about route scope | Absent by design (one installation per household) | "Do not trust the client's family" rule and central helper; optional `familyId` as an audit question | Not applicable: nothing on the server |
| Tummy time | Activity with a timer, no goal | Record with a timer; daily total on the dashboard | `TUMMY_TIME` with a timer and daily average in the report, no goal | Content only (activities, milestone, article) |
| Development and content | No content | None | No educational content | Content by age, ranges with a margin, corrected age; milestones with a percentage and a "Pending" label |
| Export and deletion | Account deletion with ownership transfer | Export by type, in the admin; no deletion by family | Export claimed; account closure | Backup encrypted with a build key; import replaces everything |
| Tests and quality | 613 tests; RC and beta dependencies | 528 tests; CI for Python 3.10 to 3.14 | 1.755 tests; testing rule for each change | No tests; CI disabled; 97 alerts in `npm audit` |
| pt-BR | Not analyzed in the profile | Yes, partial (37 empty texts and 70 pending review) | Yes | No |
| Native mobile | No | Companion apps in other repositories (not analyzed) | WebView shell (Capacitor) | Yes, React Native |

## 4. Lessons for AppMaternidade

| Lesson | Source | Where it was incorporated |
| --- | --- | --- |
| Ongoing session derived from the start time, never from a counter | The three with timers | [ADR-004](../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md); [Offline](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) |
| Parallel sessions handled without losing the intent recorded offline. Sprout Track prevents the second session in the database (`@unique`) and responds with 409. Offline, this is not possible: AppMaternidade accepts both and shows "duas sessões em andamento", with "unir" or "encerrar uma". The database guarantees the record and operation IDs, preventing duplicates from retries | Sprout Track; Baby Buddy (race during conversion) | [Offline, section 7.2](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md); [Data model](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) |
| Separate "Iniciado por" and "encerrado por"; ending is not deleting | Gap in all four | Data model; Q-03 |
| Domain rules applied on the server, with an operation ID for retries. An end before the start is rejected. Future times, long durations, and overlaps produce warnings without blocking, because the offline record has already been made | Baby Buddy (there, the rules block) | [Offline, section 8](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md); Q-02 |
| Family and membership as the authority for every operation; never trust the family sent by the client; check the scope through the generated SQL | Sprout Track (documented rule and lesson); Baby Buddy (what happens without a family) | [ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md); Q-06 |
| `familyId` required from the start, with no "legacy null" state | Sprout Track | Data model, invariants |
| Short-lived, single-use invitation; never a permanent token in a QR | Finnberry (7-day invitation); Baby Buddy (QR with a fixed token) | Data model |
| Account deletion with ownership transfer and family deletion when no one remains | Finnberry | [Privacy and security, section 7](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) |
| A single rule to decide which day a record belongs to, with the time zone stored in the event | Baby Buddy (different rules); Finnberry ("today" on the server) | ADR-004; Q-09 |
| Claim offline support only when there is a queue and a local database; a PWA is not enough | Sprout Track (documentation without corresponding code) | ADR-004; [Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) |
| Bundled content, incremental synchronization, and a **withdrawal list processed on the device** | Bebbo | [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md); [Development and content](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) |
| Encrypted local database; export without a shared key for all installations; no free text in analytics | Bebbo (the opposite) | Privacy and security, section 9 |
| Milestones without percentages or "Pending" | Bebbo (the opposite) | Development and content, section 6 |
| Screen mode for overnight use, with large buttons and "há quanto tempo" blocks | Sprout Track (Nursery) | [Flows and screens](../02_Experiencia/Fluxos_e_Telas.md) |
| Outbox for events and notifications, with an ID to discard duplicates | Baby Buddy (webhooks); Bebbo (analytics) | [Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md) |
| CI with types and tests from the foundation, also running on Windows | Bebbo (no tests); Sprout Track (path failures) | Quality and validation |
| Do not depend on discontinued libraries: Realm Sync and archived `react-native-push-notification` | Bebbo | [ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md) |

## 5. What none of the four solves

- **Offline writes with multiple caregivers and synchronization.** Bebbo is offline, but limited to one device. The other three depend on the server.
- **Revocation with an offline device,** including clearing what has already been downloaded.
- **Complete authorship:** who created, changed, started, and ended.
- **Community and moderation:** none of the four has them.
- **Content with a visible author, reviewer, sources, and version.** Bebbo has editorial fields, but the app does not show professional review.
- **Export and deletion by family, with propagation to backups.**

These gaps are the core of the original design. They are in [ADR-004](../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md), [ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md), [ADR-006](../06_ADRs/ADR-006_Comunidade_e_Moderacao.md), and [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md).

## 6. Scenarios Q-01 to Q-12

| Scenario | Finnberry | Baby Buddy | Sprout Track | Bebbo |
| --- | --- | --- | --- | --- |
| Q-01 offline | No queue | No offline support | No queue or cache | Works, but only locally |
| Q-02 retry | No operation ID; retry creates another record | Duplicates | No operation ID | Event queue without an ID |
| Q-03 A starts, B ends | B ends through the database; no authorship; the second ending overwrites | Requires `delete_timer`; loses authorship | Any caregiver can end it; only one author | Not applicable |
| Q-04 concurrent editing | Last write wins, no version | Last PATCH wins | Not analyzed | Import replaces everything |
| Q-05 revocation | Removing a member deletes the membership; no offline cache | Checked on every request | List of revoked tokens on logout | Not applicable |
| Q-06 another family | Audit questions | No family by design | Central rule; audit questions | Not applicable |
| Q-07 community | None | None | None | None |
| Q-08 locked screen | Derived from the start time | Derived from the start time | Derived from the records | No timers |
| Q-09 time zone | "Hoje" on the server | Depends on the channel | Not analyzed | Device clock |
| Q-10 notification | No notifications | No notifications; signed webhooks | Web and native push | Local reminders and remote push |
| Q-11 moderation | None | None | None | None |
| Q-12 export and delete | Deletion with transfer; export without an interface | Export by type in the admin | Export claimed | Encrypted backup; import replaces |

## 7. Limits of this analysis

- **Partial reading:** no profile read every route, screen, and component line by line.
- **Local execution:** performed with fictitious data, in development mode. No app ran on a mobile device.
- **Isolation without tests:** the family isolation findings come from code reading, not tests. The wording used is "audit question, not a demonstrated vulnerability".
- **Who wrote it:** the Finnberry, Sprout Track, and Bebbo profiles, and this analysis, are by the coordinator, because the subagents stopped due to a lack of response from the provider. The Baby Buddy profile is by the subagent, with a coordinator review around 05:35 of the authorization sections.

## Relationship with other documents

[Licenses and sources](Licencas_e_Fontes.md) · [Architecture comparison](../03_Arquitetura/Comparacao_de_Arquiteturas.md) · [Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md) · [Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) · [Home](../00_Inicio/Home.md)
