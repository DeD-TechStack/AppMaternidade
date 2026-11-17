---
tipo: execution-evidence
status: draft
responsavel: Hermes (Sprout Track subagent)
revisado_em: 2026-10-22
fontes_principais:
  - https://github.com/Oak-and-Sprout/sprout-track/tree/eb26949461bd0455cb8d6137dc5bc417a02adcf9
---

# Sprout Track local execution record

Corresponding assessment: [Sprout_Track.md](../../../08_Referencias/Repositorios/Sprout_Track.md).

## Ambiente

| Item | Value |
| --- | --- |
| Date | 22/10/2026, 02:55–03:33 (America/Sao_Paulo) |
| Machine | Windows 11 Pro 10.0.26300, Git Bash shell |
| Node / npm | v24.20.0 / 11.19.0 (README requires Node 22+; no version error occurred) |
| Clone | `C:/Projetos/AppMaternidade/_referencias/sprout-track/` (folder ignored by the product's Git) |
| Branch / SHA | `main` / `eb26949461bd0455cb8d6137dc5bc417a02adcf9` (same as the package snapshot), commit from 2026-10-12 13:53:59 -0500 |
| Database | SQLite in Hermes's temporary directory (outside the clone), discarded at the end |
| Server | `next dev -H 127.0.0.1 -p 38317` (Next.js 16.3.3, Turbopack) |
| Secrets | Random, disposable `JWT_SECRET` and `ENC_HASH`, passed through environment variables; no `.env` created or read |
| Docker | Not used |

## Steps and results

| # | Command (summary) | Result | Log |
| --- | --- | --- | --- |
| 1 | `npm ci --ignore-scripts --no-audit --no-fund` | 874 packages in ~5 min; exit 0; deprecation warnings | [01_npm_ci.log](01_npm_ci.log) |
| 2 | `npx prisma generate` and `--config prisma/log.config.ts` | Prisma 7.10.0 clients generated; exit 0 | [02_prisma_generate.log](02_prisma_generate.log) |
| 3 | `npx prisma migrate deploy` | All migrations applied; the CLI downloaded `schema-engine-windows.exe` to `node_modules/@prisma/engines` (local to the clone) | [03_prisma_migrate.log](03_prisma_migrate.log) |
| 3b | `npx prisma db push --config prisma/log.config.ts --accept-data-loss` (API log database) | **Rejected** by Prisma 7.10 (03:12:13): the CLI detected execution by an AI agent and required explicit user consent for a destructive action. Not bypassed. Log database unnecessary with `ENABLE_LOG=false` | [03_prisma_migrate.log](03_prisma_migrate.log) |
| 4 | `prebuild-install` of `better-sqlite3@12.11.1` nested in `@prisma/adapter-better-sqlite3` (step `install` skipped by `--ignore-scripts`) | Precompiled binary downloaded from WiseLibs' GitHub Releases and extracted; exit 0. The tarball remained in `npm-cache/_prebuilds` and was removed at the end | [04_better_sqlite3_prebuild.log](04_better_sqlite3_prebuild.log) |
| 5 | `npx tsx prisma/seed.ts` | Default family `my-family`, system caregiver with documented default PIN, 28 units, CDC/WHO curves; exit 0 | [05_seed.log](05_seed.log) |
| 6 | `npx next dev -H 127.0.0.1 -p 38317` | Ready in 2,2 s; 424 requests logged. Side effect: `next dev` 16.3 added an "agent rules" block to the clone's `CLAUDE.md`; reverted with `git checkout -- CLAUDE.md` | `06_next_dev.log` (outside Git, D7) |
| 7 | API script (`python -I roteiros/api_probe.py`) | 74 steps, 03:17:15–03:17:44 | `07_api_probe.json` (outside Git, D7) |
| 8 | Additional verification (`roteiros/api_probe2.py`) | 6 steps, 03:19:54 | `08_api_probe2.json` (outside Git, D7) |
| 9 | Browser interface + offline test | Separate record | `12_UI_Navegador.md` and `09_check_offline.json` (outside Git, D7) |
| 10 | `npx vitest run` | 132 files: 131 passed, 1 failed; 1.753 tests passed, 2 failed (`tests/prisma-adapter.test.ts` expects POSIX paths and received `C:\...` on Windows) | [10_vitest.log](10_vitest.log) |
| 11 | Reading `package-lock.json` (v3) using a script, without network access or installing anything. Done by the coordinator at 06:21, after the independent review | 1.023 entries: 520 production, including optional platform binaries, and 503 development. License taken from the field declared in the lockfile; LICENSE not checked | [13_licencas_dependencias.tsv](13_licencas_dependencias.tsv) |

Readable summary of the 80 API steps: `11_Resumo_Passos_API.md` (outside Git, D7).

## Shutdown and cleanup (03:29–03:33)

- Server: terminating process `npx` did not stop the child; the `next dev` tree (PIDs 16568 → 27764 → 30056, 16672) was terminated with `taskkill /T /F`. Port 38317 confirmed free; no `node.exe` with `sprout-track` on the command line.
- Browser: 3 tabs from the isolated `appmat-sprout` session closed.
- Clone: `git status` clean after reverting `CLAUDE.md`; `node_modules/`, `.next/` and `next-env.d.ts` remain (ignored by the project's `.gitignore`).
- Cache: removed tarball `npm-cache/_prebuilds/4d2ad7-better-sqlite3-v12.11.1-node-v137-win32-x64.tar.gz` and folder `_prebuilds` (created by this step). The normal npm cache (`_cacache`) received the packages from `npm ci`, standard npm behavior; it was not modified.
- No Docker containers, images or volumes created. No global installations.

## About the scripts and disclosure

The scripts in `roteiros/` belong to Hermes and are not Sprout Track code. They use only fictitious data and PINs from a local instance that has already been destroyed. The probing scripts (`api_probe.py`, `api_probe2.py`, `check_offline.py`) and the records of steps 6 through 9 and 11 record behaviors that require evaluation by the maintainers. They therefore remain outside Git until decision D7 ([Decisions for Daniel](../../../07_Roadmap/Decisoes_para_Daniel.md)), and the assessment does not detail them (coordinator review around 05:36).

## Open questions

- If Daniel decides to notify the maintainers (D7), verifying fixes is their responsibility. Hermes does not repeat the probing scripts.
- Testing on a real mobile device (installed PWA) was not performed.

## Limits of this analysis

Execution in development mode (`next dev`), not `next build`/`start` or Docker; SQLite only (PostgreSQL not tested); notifications disabled (`ENABLE_NOTIFICATIONS=false`), without VAPID/FCM/APNs; SaaS mode and email accounts not exercised; a single execution of each step, without performance measurement.
