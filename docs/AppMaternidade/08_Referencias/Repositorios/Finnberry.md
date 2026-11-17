---
tipo: repository-profile
status: draft
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
tarefa: MAT-5
repositorio: https://github.com/bckenstler/finnberry
branch: main
commit: 5e17b1a71e10735f0b6aaa22996ce37349d9402c
licenca_raiz: MIT
fontes_principais:
  - https://github.com/bckenstler/finnberry/tree/5e17b1a71e10735f0b6aaa22996ce37349d9402c
  - https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/LICENSE
  - https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/db/prisma/schema.prisma
  - https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.ts
  - https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/stores/timer-store.ts
---

# Finnberry

Profile written by reading the code at commit `5e17b1a` and the existing execution records ([evidence index](../../09_Evidencias/Execucao_Referencias/Finnberry/00_Indice.md)). Evidence markers follow the [Conventions](../../00_Inicio/Convencoes.md). Code links point to the analyzed commit; line numbers apply to that commit.

In this document, `B` abbreviates `https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c`.

## Resumo

- **What it is.** A web app (Next.js) for logging baby care, with sleep, feeding, diapers, pumping, growth, temperature, activities and medicine; families with roles; real-time updates through Supabase; AI chat and an MCP server. The repository describes itself as a "clone of Huckleberry" ([CLAUDE.md](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/CLAUDE.md)) [DOC].
- **Useful as a reference for:** a family model with four roles, email invitations with an expiration date, account deletion with ownership transfer, a timer derived from the start time and tummy time as a timed activity, without a target [CÓDIGO].
- **Not useful as a reference for:** offline use (no queue or persistent cache), a mobile app (web only), record authorship (none), time zones ("today" is calculated on the server) and family isolation (audit questions remain, below) [CÓDIGO].
- **Execution.** Installation, Prisma client generation, 613 unit and integration tests (with mocked Prisma) and schema creation in a disposable local PostgreSQL instance [EXEC, logs 01 to 05]. The app was not started.
- **License.** MIT at the root; mostly permissive dependencies, with three points to check ([Licenses by material](#licenças-por-material)).
- **Maturity.** 104 commits between 25 and 30/01/2026, none after that on `main` through 22/10/2026 (log 06) [EXEC]. tRPC is a release candidate and NextAuth is in beta.

## Identificação

| Item | Value | Evidence |
| --- | --- | --- |
| Repository | https://github.com/bckenstler/finnberry | — |
| Branch and commit | `main`, `5e17b1a71e10735f0b6aaa22996ce37349d9402c` | [EXEC] log 06 |
| Commit date | 29/01/2026 23:36:19 −0800 (30/01/2026 07:36:19 UTC), "Add Vercel deployment section to README (#46)" | [EXEC] log 06 |
| Remote `main` at 22/10/2026 04:00 | Same SHA | [EXEC] log 06 (`git ls-remote`) |
| History | 104 commits; first on 25/01/2026; authors: Brad Kenstler (89), "Claude" (8), "Ubuntu" (7) | [EXEC] log 06 |
| Size | 218 tracked files; no tracked images, fonts, SQL, migrations or RLS policies | [EXEC] log 06 |
| Root license | MIT, "Copyright (c) 2026 bckenstler"; SHA-256 `2aa2c07d…8aa5de` | [CÓDIGO] [LICENSE](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/LICENSE); log 06 |
| Local clone | `C:/Projetos/AppMaternidade/_referencias/finnberry`, read-only, no changes to tracked files | [EXEC] log 06 |

## Confirmed stack

Version ranges declared in the commit's `package.json` [CÓDIGO]; installed versions only where a log exists.

| Component | Declared | Note |
| --- | --- | --- |
| Next.js / React | `^15.1.4` / `^19.0.0` | App Router; web only, no mobile app or PWA |
| tRPC | `^11.0.0-rc.682` | Release candidate in the foundation |
| Prisma | `^6.2.0` | Client generated at version 6.19.2 [EXEC, log 02] |
| NextAuth (Auth.js) | `^5.0.0-beta.25` | Beta; Prisma adapter; magic link (Nodemailer) and Google, both optional through configuration ([auth.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/lib/auth.ts)) |
| Database | PostgreSQL (Supabase, according to the README) | Schema applied to a local PostgreSQL 16.6 instance [EXEC, log 05] |
| Real-time updates | `@supabase/supabase-js ^2.48.1` | Channel opened in the browser |
| Local state | `zustand ^5.0.3` with `persist` in `localStorage` | Only for timers |
| AI | `@anthropic-ai/sdk ^0.71.2`, `@anthropic-ai/claude-agent-sdk ^0.2.20`, `@modelcontextprotocol/sdk ^1.4.0` | In-app chat and MCP server |
| Validation | `zod ^3.24.1` | Shared schemas in `packages/schemas` |
| Monorepo and tests | Turborepo `^2.3.0`, pnpm 9.15.0, Vitest `^2.1.0`, Playwright `^1.48.0` | — |

## Flows analyzed

| Flow | Files read |
| --- | --- |
| Start, query and end sleep | [sleep.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/sleep.ts), [timer-store.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/stores/timer-store.ts), [use-timer.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/hooks/use-timer.ts), `packages/schemas/src/sleep.ts` |
| Activities, including tummy time | `packages/api/src/routers/activity.ts`, `packages/schemas/src/activity.ts`, [schema.prisma L338–L364](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/db/prisma/schema.prisma#L338-L364) |
| Invite, accept, change role, remove member | [household.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/household.ts), `packages/schemas/src/household.ts` |
| Delete account | [user.ts L42–L103](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/user.ts#L42-L103) |
| Real-time updates between caregivers | [use-realtime.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/hooks/use-realtime.ts), [supabase.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/lib/supabase.ts) |
| Daily summary | [sleep.ts L172–L217](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/sleep.ts#L172-L217), [date.ts L63–L74](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/utils/src/date.ts#L63-L74) |
| AI chat and MCP server | [chat/route.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/api/chat/route.ts), [mcp-server/src/index.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/mcp-server/src/index.ts) |
| Access middleware | [trpc.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.ts), [trpc.test.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.test.ts) |

## Findings by topic

### Domain model

- **Family and roles** [CÓDIGO]. `Household` has members (`HouseholdMember`, unique per family and user) with the role `OWNER`, `ADMIN`, `CAREGIVER` or `VIEWER`, defaulting to `CAREGIVER` ([schema.prisma L87–L107](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/db/prisma/schema.prisma#L87-L107)). `HouseholdInvite` stores email, role, unique token and expiration date ([L109–L121](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/db/prisma/schema.prisma#L109-L121)).
- **Records attached to the child** [CÓDIGO]. Each record points to `Child`, which points to `Household`; records have no family column. Every relationship uses cascading deletion.
- **Sessions with a start and an end** [CÓDIGO]. Sleep, breastfeeding, pumping and activities have `startTime` and optional `endTime`; an ongoing session has a null `endTime`. Diapers, temperature and medicine doses have a single timestamp.
- **No authorship** [CÓDIGO]. No record stores who created, ended or edited it; only `createdAt` and `updatedAt`. There is no version, soft deletion or operation ID.
- **Tummy time** [CÓDIGO]. It is a value of `ActivityType` (alongside bathing, play, screen time, skin-to-skin, reading and toothbrushing) and uses a timer; there is no associated target, milestone or content ([L338–L364](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/db/prisma/schema.prisma#L338-L364)).
- **Growth** [CÓDIGO]. Weight, height and head circumference; CLAUDE.md says percentile curves have not been implemented [DOC].

### Validations

- IDs are validated as CUIDs and dates are converted by `z.coerce.date()` ([common.ts L3](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/schemas/src/common.ts#L3)) [CÓDIGO].
- No schema in `packages/schemas/src` uses `refine` or `superRefine` (code search). There is no rule for an end after the start, overlaps or future dates [CÓDIGO].
- "One active sleep session per child" is checked by reading before creating ([sleep.ts L60–L72](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/sleep.ts#L60-L72)), without a database constraint. Two simultaneous starts could create two active sessions [HYP, not tested].
- Ending writes `endTime` by ID without checking whether the session has already ended ([L85–L105](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/sleep.ts#L85-L105)); a second ending overwrites the first [CÓDIGO].

### Authorization and isolation

Description based on reading the code, in design terms. Nothing was run against the app, and no access was tested.

- **Three procedure levels** [CÓDIGO]: public, authenticated (requires a session) and family (session plus family membership) ([trpc.ts L59–L74](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.ts#L59-L74)). Roles are checked inside each route: `VIEWER` cannot write; `OWNER` and `ADMIN` invite and edit the family; only `OWNER` changes roles and deletes the family ([household.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/household.ts)).
- **Family resolved from input** [CÓDIGO]. The middleware looks up the family by `householdId`, by `childId` or by `id`, interpreted as a child or a family ([L77–L119](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.ts#L77-L119)). When it finds none, it continues without a family or role in the context ([L155–L171](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.ts#L155-L171)).
- **Operations by record ID.** Ending, editing and deleting receive only the record ID, check whether the role is `VIEWER` and write using an ID filter ([sleep.ts L85–L170](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/sleep.ts#L85-L170); the same pattern in `activity.ts`) [CÓDIGO]. From reading the code, it is unclear where these operations check that the record belongs to one of the user's families. Middleware tests cover family, child, child `id` and a child from another family ([trpc.test.ts L59–L140](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.test.ts#L59-L140)), but not an ID that belongs to neither a child nor a family. **Audit question, not a demonstrated vulnerability.**
- **Real-time channel.** The browser opens the channel with the Supabase public key ([supabase.ts L1–L6](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/lib/supabase.ts#L1-L6)), and the child filter is chosen by the client ([use-realtime.ts L21–L30](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/hooks/use-realtime.ts#L21-L30)) [CÓDIGO]. Login uses NextAuth, not Supabase Auth, so the channel does not carry the user's identity [HYP, inferred from the configuration]. What each subscriber receives depends on database policies, and none are tracked in the repository (log 06); log 05 suggests RLS is disabled [HIP]. **Audit question, not a demonstrated vulnerability.**
- **AI chat tools.** The route checks the session and whether the child in the conversation belongs to one of the user's families ([chat/route.ts L97–L141](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/api/chat/route.ts#L97-L141)) [CÓDIGO]. The tools run with direct database access, and the conversation's `childId` is injected only when the model does not supply another one ([L266–L272](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/api/chat/route.ts#L266-L272)) [CÓDIGO]. **Audit question:** are the tools restricted to the conversation's family when the model supplies another ID?
- **MCP server** [CÓDIGO]. Runs over stdio with the full `DATABASE_URL` and no concept of a user ([index.ts L14, L73](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/mcp-server/src/index.ts)). It is intended for a single-family installation, not a service with multiple families.
- **Test data route** [CÓDIGO]. `/api/test/seed` creates users and sessions for E2E tests and responds only when `NODE_ENV` equals `development` or `test` ([seed/route.ts L10](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/api/test/seed/route.ts#L10)).

### Timers

- **Duration derived from the start** [CÓDIGO]. The active timer stores `startTime` in milliseconds; elapsed time is `Date.now() − startTime`, without a background counter ([timer-store.ts L147–L151](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/stores/timer-store.ts#L147-L151)). State persists in `localStorage` under the key `finnberry-timers` ([L157–L160](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/stores/timer-store.ts#L157-L160)).
- **Breastfeeding by side** [CÓDIGO]. Accumulates milliseconds on the left and right and restarts the segment when switching sides ([L99–L135](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/stores/timer-store.ts#L99-L135)). The database stores durations per side in seconds.
- **Two sources of truth** [CÓDIGO]. The local timer is per browser; the database record, with a null `endTime`, is what another caregiver sees through `getActive` ([sleep.ts L36–L48](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/sleep.ts#L36-L48)). According to CLAUDE.md, the interface synchronizes when opening the modal if the session was started through chat or MCP [DOC].
- **Mixed clocks** [CÓDIGO]. The start and end stored in the database come from the field sent by the client or, without it, from the server clock (`input.startTime ?? new Date()`, `input.endTime ?? new Date()`). The local timer uses the device clock. The difference between the two clocks affects the duration [HIP].
- **Persistence after reloading.** E2E tests `timer-persistence.spec.ts` cover page reloading [CÓDIGO]; they were not run.

### Persistence and offline use

- There is no service worker, manifest, persisted query cache or connection detection (search for `serviceWorker`, `navigator.onLine`, `onlineManager`, `persistQueryClient` and a manifest in `apps/web`, with no results) [CÓDIGO]. CLAUDE.md lists "PWA support not added" [DOC].
- Without a connection, mutations go directly to tRPC and are not queued [CÓDIGO]; on-screen behavior was not observed [HIP].
- Only the timer survives reloading; records do not.

### Logging and history UI

- The README declares a quick logging grid, day, week and list views, a visual timeline and editing with duration controls [DOC]. The components exist in `apps/web/src/components/tracking` and `reports` [CODE, file tree only]. Nothing was seen running.
- English-only interface; no internationalization library found [CÓDIGO].
- The invitation is created on the family settings screen ([settings/page.tsx L108](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/(dashboard)/dashboard/household/settings/page.tsx#L108)), but no `.tsx` file calls `acceptInvite` and there is no route with "invite" in its path in `apps/web/src/app` [CÓDIGO]. How the invitee receives and uses the token remains unanswered.

### Reports

- Period summaries ("today", "week", "month") are calculated on the server with `startOfDay(new Date())` ([date.ts L63–L74](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/utils/src/date.ts#L63-L74)) [CÓDIGO]. "Today" follows the server's time zone; on a UTC server, the day for a family in Brasília would change at 21h [HYP, not executed]. "Month" means the last 30 days.
- A `timeline` route aggregates the eight record types for the three views [CODE, `timeline.ts`].

### API

- Twelve tRPC routers with SuperJSON: activity, child, diaper, feeding, growth, household, medicine, pumping, sleep, temperature, timeline and user [CÓDIGO]. There is no documented REST API; external access is through the MCP server.

### Testes

- **Executed:** 36 files and 613 tests passed in 38,92 s [EXEC, log 03]. API tests use mocked Prisma ([CLAUDE.md](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/CLAUDE.md), Testing section) [DOC], so they do not prove behavior with a real database.
- **Not executed:** five Playwright specs (login, family, logging, timer persistence, real-time updates) [CÓDIGO].
- **No apparent coverage:** concurrency between caregivers, offline use, time zones and the unresolved ID case in the middleware [CÓDIGO].

### Configuration and i18n

- Variables: `DATABASE_URL`, `DIRECT_URL` and `AUTH_SECRET` are required; Google, SMTP, Supabase keys (public and service) and `ANTHROPIC_API_KEY` are optional (CLAUDE.md) [DOC].
- Deployment intended for Vercel, with a `maxDuration` of 60 s in chat ([chat/route.ts L8](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/api/chat/route.ts#L8)) [CÓDIGO].
- No push notifications (search for `web-push`, `PushManager` and `Notification.requestPermission`, with no results) [CÓDIGO].

## Execução

Summary; details, commands and SHA-256 in the [evidence index](../../09_Evidencias/Execucao_Referencias/Finnberry/00_Indice.md).

| Step | Result | Evidence |
| --- | --- | --- |
| `pnpm install` (pnpm 9.15.0, Node 24.20.0, Windows) | 812 packages, exit 0; bin `finnberry-mcp` not created because MCP was not compiled | [EXEC] [01-install.log](../../09_Evidencias/Execucao_Referencias/Finnberry/01-install.log) |
| `prisma generate` | Client 6.19.2 generated; valid schema | [EXEC] [02-prisma-generate.log](../../09_Evidencias/Execucao_Referencias/Finnberry/02-prisma-generate.log) |
| `vitest run` | 613 tests in 36 files, exit 0 | [EXEC] [03-vitest-all.clean.log](../../09_Evidencias/Execucao_Referencias/Finnberry/03-vitest-all.clean.log) |
| PostgreSQL 16.6 in container `appmat-ref-finnberry-pg`, 127.0.0.1:38110, data in tmpfs | Accepted connections | [EXEC] [04-postgres-docker.log](../../09_Evidencias/Execucao_Referencias/Finnberry/04-postgres-docker.log) |
| `prisma db push` | 17 tables created in 726 ms | [EXEC] [05-prisma-db-push.log](../../09_Evidencias/Execucao_Referencias/Finnberry/05-prisma-db-push.log) |
| Git identification and license inventory | See the sections above | [EXEC] logs 06 and 07 |

- Logs 01 to 05 are from the first attempt, interrupted at 03:14 by the provider's filter, with no project error. The container was later removed by the coordinator (no 38xxx port or `appmat-ref-*` container active at 04:35).
- **Not executed:** `next dev`, build, lint, type-check, E2E, seed route, MCP server, chat, real-time updates, offline use, two devices and time zones. No requests to the app and no login.

## Licenses by material

| Material | License | Evidence | What to watch for |
| --- | --- | --- | --- |
| Repository code | MIT | [CÓDIGO] LICENSE read; log 06 | Retain the copyright and permission notice in substantial copies |
| Production dependencies (434 versions at completion) | MIT 340, ISC 19, Apache-2.0 17, BSD-3-Clause 4, BSD-2-Clause 2, MIT-0 1, 0BSD 1 | [EXEC] log 07, self-declared `license` field | Check LICENSE and NOTICE before using any of them |
| `@anthropic-ai/claude-agent-sdk` 0.2.20 | "SEE LICENSE IN README.md" (custom terms, not open source) | [EXEC] log 07 | Exclude from any reuse without reading the terms |
| `@img/sharp-*` binaries (libvips) | Apache-2.0 AND LGPL-3.0-or-later | [EXEC] log 07 | LGPL obligations when redistributing the binary |
| Development tools | MPL-2.0 (for example, `axe-core`) and CC-BY-4.0 (`caniuse-lite`) | [EXEC] log 07 | Development only; not included in the app |
| Images and fonts | None tracked | [EXEC] log 06 | — |
| Educational texts | None | [CÓDIGO] | — |
| Name and brand | "Finnberry"; the repository calls itself a Huckleberry clone | [DOC] | Do not use the name, brand or association |

## Concepts to adopt

1. A family with four roles and the rule "view-only users cannot write".
2. Email invitation valid for 7 days, accepted only by the invited email address and consumed in the same transaction that creates the membership ([household.ts L127–L213](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/household.ts#L127-L213)).
3. Account deletion with email confirmation: ownership passes to the first administrator or member, and the family is deleted only when no one remains ([user.ts L42–L103](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/user.ts#L42-L103)). This aligns with the requirement for in-app account deletion.
4. A timer derived from the start time, persisted on the device, with accumulation per side during breastfeeding.
5. Tummy time as a timed activity without a target, consistent with the editorial approach of avoiding pressure.
6. A timeline query that combines all record types.

## What can be reused under the license

MIT allows code reuse as long as the copyright and permission notice accompanies the copied portions. Since the proposed stack is different (React Native + Expo, PowerSync and a domain service; [ADR-002](../../06_ADRs/ADR-002_Framework_Mobile.md) and [ADR-003](../../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md)), direct reuse is limited to small TypeScript pieces:

- unit conversions (`packages/utils/src/format.ts`: ml and oz, weight, height, temperature);
- the per-side accumulation logic from `timer-store.ts`, outside Zustand;
- Zod schema enumerations (diaper, feeding and activity types), translated and reviewed.

Each copied snippet carries the MIT notice and a reference to the commit. No images, text or branding.

## Required adaptations

- **Authorship:** "iniciado por", "encerrado por" and "editado por" on every record, with history ([Data model and permissions](../../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md)).
- **Family scope:** resolved from the record stored on the server, never from what the client sends, and repeated in the data layer and synchronization rules ([ADR-005](../../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md)).
- **Ongoing sessions:** parallel sessions are detected and resolved without rejecting an action made offline. The server accepts both and the interface offers "unir" or "encerrar uma". A second ending is handled explicitly ([Offline, section 7.2](../../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md); [ADR-004](../../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md)).
- **Validations:** an end before the start is rejected. Overlaps and future dates generate a warning, with tolerance and without blocking ([Offline, section 8](../../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)).
- **Time:** timestamp with the family's time zone; "today" calculated in the family's time zone, not the server's.
- **Offline:** persistent local queue with an operation ID, replacing direct mutations ([Offline, synchronization and timers](../../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)).
- **Owner departure:** `removeMember` lets the owner leave without transferring ownership ([household.ts L245–L287](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/household.ts#L245-L287)) [CÓDIGO]; the family could be left without an owner [HIP]. In AppMaternidade, leaving requires a transfer first.
- **Complete real-time updates:** the channel per child listens only for sleep, breastfeeding and diapers ([use-realtime.ts L21–L64](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/hooks/use-realtime.ts#L21-L64)) [CÓDIGO]; activities (including tummy time) and pumping do not reach the other caregiver in real time [HIP].

## What not to reproduce

- Family discovered from input, with execution continuing without context when none is found.
- Real-time channel with a public key and a client-selected filter without tracked policies.
- The child's name and date of birth in the system prompt sent to an external AI provider ([chat/route.ts L158](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/api/chat/route.ts#L158)) [CÓDIGO]. This involves transferring a child's data to a third party; the MVP proposal excludes generative AI responding to users ([Decisions for Daniel](../../07_Roadmap/Decisoes_para_Daniel.md), D4).
- AI tools or an MCP server with direct database access in a product with multiple families.
- "Hoje" calculated in the server's time zone.
- Release candidate or beta dependencies in the foundation (tRPC RC, NextAuth beta).

## Risks and problems found

| Risk | Evidence | Impact on AppMaternidade |
| --- | --- | --- |
| Short-lived, inactive project: 104 commits in 6 days, nothing after 30/01/2026 | [EXEC] log 06 | A reference, not a codebase |
| Family scope in operations by record ID is unclear | [CÓDIGO] trpc.ts, sleep.ts | Reinforces ADR-005; audit question |
| Database access policies outside the repository | [EXEC] log 06; [HIP] log 05 | Real-time updates depend on untracked configuration |
| No record authorship | [CÓDIGO] schema.prisma | The caregiver handover differentiator has no foundation here |
| Race when starting a session and overwrite when ending | [CÓDIGO]; [HIP] for the race | Scenario Q-03 needs a database rule |
| Child data sent to an AI provider | [CÓDIGO] chat/route.ts | LGPD and consent; outside the MVP |
| Server time zone in summaries | [CÓDIGO] date.ts | Scenario Q-09 |
| No invitation acceptance screen found | [CÓDIGO] | Incomplete flow; AppMaternidade defines its own in [Flows and screens](../../02_Experiencia/Fluxos_e_Telas.md) |

## Relationship to scenarios Q-01 to Q-12

| Scenario | What Finnberry shows | Class | Lesson for AppMaternidade |
| --- | --- | --- | --- |
| Q-01 offline logging, close and reopen | No queue or persistent cache; only the local timer survives | [CÓDIGO] | Persistent local queue with visible state |
| Q-02 resending | No operation ID; resending creates another record | [CÓDIGO] | Device-generated operation ID and idempotent response |
| Q-03 A starts, B ends | B ends through the database record, but authorship is not stored; a second ending overwrites | [CÓDIGO] | "Iniciado por" and "encerrado por", and duplicate ending handled |
| Q-04 concurrent editing | Last write wins, without a version or warning | [CÓDIGO] | Version per record and visible conflict |
| Q-05 revocation | Removing a member deletes the membership; no offline cache to clear | [CÓDIGO] | Revalidate operations on reconnection and delete local data |
| Q-06 IDs from another family | See "Authorization and isolation": audit questions | [CÓDIGO] | Scope based on the stored record and access-denied tests on all routes and channels |
| Q-07 community | Does not exist | [CÓDIGO] | No reference |
| Q-08 locked screen or closed app | Duration derived from the start; persists across reloads | [CÓDIGO]; E2E not executed | Same principle, with local and server state |
| Q-09 time zone and midnight | "Today" in the server's time zone; device and server clocks mixed | [CÓDIGO]; [HIP] for the effect | Time zone stored with the event and a single day rule |
| Q-10 notification denied | No notifications | [CÓDIGO] | Log and synchronize without depending on push |
| Q-11 reporting and moderation | Does not exist | [CÓDIGO] | No reference |
| Q-12 export, delete, backup | Account deletion with ownership transfer; export still has no interface (CLAUDE.md) | [CÓDIGO]; [DOC] | Export per family and propagated deletion |

## Open questions

1. At what point do operations by record ID check the family? (Audit question; answering requires a full reading of the routers and tests.)
2. Did the Supabase project used in production have access policies configured outside the repository?
3. How does the invitee receive and use the invitation token?
4. With RLS enabled and no policies, would real-time updates stop delivering events without warning? [HIP]
5. Is the second listing in log 05 (`tabela|f`) actually `relrowsecurity`?

## Limits of this analysis

- Profile written by the coordinator by reading code at the analyzed commit and existing logs, after two subagent attempts that did not finish: the first interrupted at 03:14 by the provider's filter; the second, at 04:30, because the provider did not respond, after saving the evidence index.
- Under this workstream's rule, there were no requests to the app, login, authorization tests or tests of access to another family's data. Access observations are audit questions.
- Behavioral findings without execution are [CÓDIGO] or [HIP]; none were observed in the running app.
- Partial reading: `timeline.ts`, interface components and MCP tools were examined only through searches.

## Voltar

[Home](../../00_Inicio/Home.md) · [Progress](../../00_Inicio/Progresso.md) · [Baby Buddy](Baby_Buddy.md)
