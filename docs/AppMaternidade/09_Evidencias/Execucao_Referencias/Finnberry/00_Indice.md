---
tipo: indice-evidencias
status: under review
responsavel: Hermes (research subagent)
revisado_em: 2026-10-22
repositorio: https://github.com/bckenstler/finnberry
branch: main
commit: 5e17b1a71e10735f0b6aaa22996ce37349d9402c
---

# Execution evidence: Finnberry

Raw logs from the analysis of the [bckenstler/finnberry](https://github.com/bckenstler/finnberry) repository at commit `5e17b1a71e10735f0b6aaa22996ce37349d9402c`. Corresponding profile: [Finnberry](../../../08_Referencias/Repositorios/Finnberry.md). Evidence markers follow the [Vault conventions](../../../00_Inicio/Convencoes.md).

## Ambiente

- Windows 11 Pro 10.0.26300, Git Bash, Git 2.53.0.windows.3.
- Node 24.20.0. pnpm 9.15.0, the version pinned in `packageManager` in the repository.
- Docker 29.9.2 (build a82e528).
- Python 3.14.7, with `-I`, used only for the license inventory (log 07).
- Times in America/Sao_Paulo (UTC−03:00), 22/10/2026.
- Clone at `C:/Projetos/AppMaternidade/_referencias/finnberry`, outside the product's Git repository and treated as read-only. `git status` shows no changes to tracked files (log 06). The `node_modules` folder was created by the installation in log 01.

## Origem dos arquivos

- **Logs 01 through 05.** They come from a previous Hermes run, interrupted at 03:14 by a provider failure, not a project error. They were copied from `AppData/Local/hermes/cache/scratch/finnberry-audit/logs/` without changes: the source and destination SHA-256 are identical (list at the end).
- **Secret review before copying.** No log contains a password or token. The PostgreSQL password appears as `<omitido>` in log 04 and as `***` in log 05. The `pg.env` file was not copied.
- **Container.** The `appmat-ref-finnberry-pg` container was later removed by the coordinator. That removal is not recorded in these logs.
- **Logs 06 and 07 and the script.** They were produced in this session, from 03:59 to 04:00, using read-only operations. No container, server, or account was created in this session.

## What each file proves

| File | When | Command | What it proves | What it does not prove |
| --- | --- | --- | --- | --- |
| [01-install.log](01-install.log) | 03:07:20–03:09:28 | `pnpm install`, with pnpm 9.15.0. The log records the version, but not the full command line or options. | The lockfile dependencies were resolved and installed on Windows: 812 packages, exit=0, in 1 min 13 s. Warning: the `finnberry-mcp` bin was not created because `apps/mcp-server/dist` does not exist, meaning the MCP server was not built. | It does not prove that the app builds or runs. The build was not run. |
| [02-prisma-generate.log](02-prisma-generate.log) | 03:09:42–03:10:28 | `pnpm exec prisma generate`, in `packages/db` | The Prisma schema is valid and generates Prisma Client 6.19.2. | Nothing about a real database. |
| [03-vitest-all.log](03-vitest-all.log) | 03:10:39–03:11:40 | `pnpm exec vitest run`, in the workspace with utils, schemas, api, web, and mcp-server | 36 files and 613 tests passed in 38,92 s, exit=0. `use-chat.test.ts` emits `act(...)` warnings on stderr, without failure. | The API tests use a mocked Prisma. They do not prove behavior with a real database, E2E, real-time operation, offline operation, or family scoping with real data. |
| [03-vitest-all.clean.log](03-vitest-all.clean.log) | same run | The same log, without ANSI color codes | Same content, in a readable version. | — |
| [04-postgres-docker.log](04-postgres-docker.log) | 03:13:00 | `docker run -d --name appmat-ref-finnberry-pg --label appmat.ref=finnberry -p 127.0.0.1:38110:5432 --tmpfs /var/lib/postgresql/data … postgres:16.6-alpine`, with the password omitted | A disposable PostgreSQL 16.6 instance started at 127.0.0.1:38110, with data in tmpfs, and accepted connections. | This database is not Supabase: there was no Realtime or access policies. |
| [05-prisma-db-push.log](05-prisma-db-push.log) | 03:13:34–03:13:51 | `pnpm exec prisma db push --skip-generate`, with `DATABASE_URL` pointing to 127.0.0.1:38110 (password `***`) | The schema was applied in 726 ms and created 17 tables (listing `\dt`). At the end there is a second listing, `tabela\|f`, of the 17 tables, whose source command was not recorded. Based on its format, it appears to be the `relrowsecurity` column of `pg_class`, which would indicate that RLS was disabled [HIP]. | Seed, running app, or data. |
| [06-identificacao-git.log](06-identificacao-git.log) | 03:59:58–04:00:00 | `git rev-parse`, `git log`, `git ls-remote origin refs/heads/main`, `git status`; counts of commits, authors, and files; searches for tracked images, fonts, SQL, and RLS policies; LICENSE hash | Branch `main` and SHA `5e17b1a…`. Commit from 2026-01-29 23:36:19 −0800, or 2026-01-30 07:36:19 UTC. The remote `main` was at the same SHA at 04:00 on 22/10/2026. 104 commits between 25 and 30/01/2026 and 218 tracked files. No tracked images, fonts, SQL, migrations, or RLS policies. Clone with no changes. | — |
| [07-licencas-dependencias.log](07-licencas-dependencias.log) and [07-licencas-dependencias.json](07-licencas-dependencias.json) | 04:00:23–04:00:26 | `python -I roteiros/dep_licenses.py <clone> 07-licencas-dependencias.json`, plus direct reading of three license files | Count of the `license` field in installed packages: 977 versions in the lockfile, of which 812 were installed. In the production dependency closure, 434 versions, 388 of them installed and their licenses read. Flagged packages: `@anthropic-ai/claude-agent-sdk` (proprietary), sharp/libvips binaries (Apache-2.0 and LGPL-3.0-or-later), MPL-2.0 in development tools and CC-BY-4.0 in `caniuse-lite`. | The `license` field is self-declared and does not replace reading each LICENSE or NOTICE. Packages for other platforms were not installed and their licenses were not read. |
| [roteiros/dep_licenses.py](roteiros/dep_licenses.py) | — | Script that uses only the standard library. It was run from Hermes's draft directory, outside the clone. | Shows how log 07 was generated. | — |

## What was not run

- `next dev`, `next build`, `pnpm build`, lint, and type-check.
- E2E tests (Playwright), seed route, and MCP server.
- No HTTP requests to the app, no logins, and no data beyond the suite's in-memory test records.
- No authorization tests or scripts, access without login, or access to another family's data. This is prohibited by this workstream's rules and was addressed only by reading the code.
- Supabase and Realtime, offline scenarios, timer on two devices, and time zones.

## SHA-256 of the copied logs (identical to the originals)

```
6d8b29810e53668b63a99f121e9ccc2a1496edc8b1f547f7625db73544f9c8e4  01-install.log
c76ed77ea7aee46825a4f279907d4993e825db646869d88c8c921a5fd6e9f199  02-prisma-generate.log
75fdcb68bfa83fb4e1517e478a6a0162d720444688e24971fed7949acdfd9c06  03-vitest-all.clean.log
a52845afb7ac22d94e81ffd584b1075b515200182649570f827715b5989209d7  03-vitest-all.log
794b0d72788b9ef7f865309d61fc5b837fb9a7d14cef2bf8c902e260cf930855  04-postgres-docker.log
af84aa350474819ee5ad2cccb8cd7af52a761b5d44d24d9066c18444413f97a2  05-prisma-db-push.log
```

## Open questions

- What exact options were used in the `pnpm install` in log 01, for example `--frozen-lockfile` or a dedicated store? The log does not record them.
- What command generated the second listing in log 05 (`tabela|f`)? The `relrowsecurity` interpretation is a hypothesis.

## Limits of this analysis

- Logs 01 through 05 cover only installation, client generation, unit and integration tests with mocks, and schema creation in a local PostgreSQL instance. The app was never started.
- The container removal time is not recorded here. The information comes from the coordinator.
