---
tipo: evidence-index
status: draft
responsavel: Hermes (Bebbo subagent)
revisado_em: 2026-10-22
---

# Execution evidence — Bebbo (UNICEF)

Raw logs from the analysis of the [UNICEFECAR/parenting-app-bebbo-mobile](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile) repository at commit `5ec8c89198368638c8111b80c6159cfb12f5e9ad`. Corresponding profile: [Bebbo](../../../08_Referencias/Repositorios/Bebbo.md).

Environment: Windows 11, Git Bash, Node 24.20.0, npm 11.19.0, Python 3.14 (`-I`), gh 2.103.0, OpenJDK 21. Times in America/Sao_Paulo (UTC−03:00), 22/10/2026. Clone at `C:/Projetos/AppMaternidade/_referencias/bebbo/` (outside the product's Git repository). No family data, accounts, or credentials were used. Docker was not used. The logs contain no secrets: the repository contains no `env/` or `google-services.json` files, and no `.env` was read.

| File | Contents | Time |
| --- | --- | --- |
| [01_clone.log](01_clone.log) | `git clone --filter=blob:none --branch main` | 02:57 |
| [02_identificacao.log](02_identificacao.log) | branch, SHA, commit date, total commits, comparison with the package snapshot | 02:58 |
| [03_ambiente_build.log](03_ambiente_build.log) | environment check for native build (blocker) | 03:21 |
| [04_historico_git.log](04_historico_git.log) | authors and cadence over the last 12 months, history of key files, tags | 03:24 |
| [05_github_api.log](05_github_api.log) | GitHub metadata (branches, PRs, issues, CMS, archived or discontinued libraries) | 03:25 |
| [06_npm_ci.log](06_npm_ci.log) | `npm ci --ignore-scripts --legacy-peer-deps` | 03:03–03:09 |
| [07_tsc.log](07_tsc.log) | `tsc --noEmit`: 154 errors, full output | 03:16 |
| [08_jest.log](08_jest.log) | `jest --listTests` and `jest --ci`: no tests found | 03:16 |
| [09_10_resumo_audit_outdated.log](09_10_resumo_audit_outdated.log) | summary of `npm audit` (full and production only) and `npm outdated` | 03:16–03:19 |
| [09_npm_audit_completo.json](09_npm_audit_completo.json), [09_npm_audit_producao.json](09_npm_audit_producao.json), [10_npm_outdated.json](10_npm_outdated.json) | raw JSON outputs | 03:16–03:19 |
| [11_eslint.log](11_eslint.log) | ESLint with the repository configuration: internal failure | 03:19 |
| [12_estrutura_conteudo_e_cms.log](12_estrutura_conteudo_e_cms.log) | age groups, offline content counts by language, UI keys, CMS tree, locales, accessibility counts, size by folder | 03:26 |
| [13_scripts_auxiliares.txt](13_scripts_auxiliares.txt) | text of the helper scripts (run from Hermes's scratch directory, outside the clone) | — |
| [14_api_publica_dev.log](14_api_publica_dev.log) | 3 GET requests to the development V1 API documented in the README | 03:34 |
| [15_licencas_dependencias.tsv](15_licencas_dependencias.tsv) | declared licenses of direct and development dependencies, read from `node_modules/*/package.json` after `npm ci` (type, package, version, license); copied from the subagent's draft by the coordinator at 05:20 | 04:09 |
