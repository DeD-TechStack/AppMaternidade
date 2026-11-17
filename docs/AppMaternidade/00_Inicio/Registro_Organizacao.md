---
tipo: log
status: in progress
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
---

# Organization log

Receipts for the items created in APP-001. After an interruption, check this page and itsaplan before recreating anything. The IDs below were returned by itsaplan itself; none was inferred from the package seed.

## itsaplan

| Item | Value | How it was verified |
| --- | --- | --- |
| Instance | Web at http://localhost:3001; API and MCP at http://127.0.0.1:3000/mcp; version 1.6.0 according to the workshop access guide | `itsaplan` connector of the Hermes default profile |
| Team | "Oficina" (teamId 1, teamRef `oficina`) | `list_projects` |
| Project | AppMaternidade, key **MAT**, id 5, ref `oficina.MAT` | `get_project MAT` |
| Creation | By Daniel, in the interface, on 22/10/2026 at 03:09:16 (06:09:16 UTC). The Hermes connector has no tool to create a project; Daniel chose to create it and add the agent. | `createdAt` of the project and Daniel's reply |
| Board | http://localhost:3001/oficina/MAT | `/<teamRef>/<key>` route of itsaplan 1.6.0 (`apps/web/src/utils/paths.ts`), the same format as the links exported from LAB and BRK |
| Task (example) | http://localhost:3001/oficina/issue/MAT-1 | `/<teamRef>/issue/<KEY>-<n>` route from the same file |
| Status document | "Estado atual e próximos passos (AppMaternidade)", id 9: http://localhost:3001/oficina/MAT/docs/9 | `create_document`; linked to the 19 tasks |
| Agent | Hermes (default), user `hermes-default`, external agent (does not respond to mentions and does not run on its own). Can create and edit tasks and documents; cannot delete. | `get_project MAT` (viewer and assignees) |
| Members | Daniel (danielmacedosilva11), Admin (installation) and Hermes (default) | `get_project MAT` |

### Actual columns and labels

The columns and labels were created by Daniel together with the project. Mapping of the package's conceptual states:

| Conceptual state (package) | Column in MAT |
| --- | --- |
| Backlog | Backlog |
| Ready | A fazer |
| In progress | Em andamento |
| In review | Em revisão |
| Done | Feito |
| Blocked | label `bloqueado`, or the "Esperando Daniel" column when the task depends on Daniel |
| (no equivalent) | Congelado and Cancelado |

The work streams became labels, because the connector has no initiative tools: Discovery and scope (22), Mobile experience (23), References and licenses (24), Architecture and data (25), Community and content (26), Operations and delivery (27). Control labels: Daniel's decision (19), needs authorization (20), blocked (21).

### Tasks created

| Seed | Key | id | Title | Column at 22/10 03:28 | Blocked by |
| --- | --- | --- | --- | --- | --- |
| DOC-001 | MAT-1 | 137 | Check context, scope and checkpoint | Feito | — |
| DOC-002 | MAT-2 | 138 | Create and verify the AppMaternidade project in itsaplan | Em andamento | MAT-1 |
| DOC-003 | MAT-3 | 139 | Create vault in the regular Obsidian and Home | Em andamento, `bloqueado` | MAT-1 |
| DOC-004 | MAT-4 | 140 | Research competitors and define product hypothesis | Em andamento | MAT-1 |
| DOC-005 | MAT-5 | 141 | Analyze four repositories and licenses | Em andamento | MAT-1 |
| DOC-006 | MAT-6 | 142 | Design mobile journeys and navigation | A fazer | MAT-4 |
| DOC-007 | MAT-7 | 143 | Compare mobile and full architectures | Em andamento | MAT-4, MAT-5 |
| DOC-008 | MAT-8 | 144 | Specify model and permissions | A fazer | MAT-7 |
| DOC-009 | MAT-9 | 145 | Specify offline, conflicts and timers | A fazer | MAT-8 |
| DOC-010 | MAT-10 | 146 | Define community and moderation | Em andamento | MAT-4 |
| DOC-011 | MAT-11 | 147 | Define tummy time and editorial cycle | Em andamento | MAT-4, MAT-5 |
| DOC-012 | MAT-12 | 148 | Document privacy and security | A fazer | MAT-8, MAT-9, MAT-10, MAT-11 |
| DOC-013 | MAT-13 | 149 | Estimate costs and operations | A fazer | MAT-7, MAT-10 |
| DOC-014 | MAT-14 | 150 | Define quality and technical proofs | A fazer | MAT-6, MAT-9, MAT-12 |
| DOC-015 | MAT-15 | 151 | Consolidate ADRs, decisions and roadmap | A fazer | MAT-5 to MAT-14 |
| DOC-016 | MAT-16 | 152 | Review documentation and deliver receipts | A fazer | MAT-2, MAT-3, MAT-15 |
| FUT-001 | MAT-17 | 153 | Validate the chosen stack with a small proof | Backlog, no agent | MAT-15 |
| FUT-002 | MAT-18 | 154 | Build foundation and first care slice | Backlog, no agent | MAT-17 |
| FUT-003 | MAT-19 | 155 | Deliver initial community slice | Backlog, no agent | MAT-18 |

Differences from seed `07_BACKLOG_INICIAL.json`:

- The seed marked everything as Backlog. The columns reflect actual progress; the future tasks stay in Backlog, with no delegated agent and with the "precisa de autorização" label, so as not to trigger execution.
- Priority "normal" became `medium`; architecture, sync, community, content and privacy became `high`; the future ones, `low`.
- The 37 dependencies from the seed became "bloqueado por" links (link ids 86 to 122).
- The descriptions gained verification, executor, authorization and source. The deliverable "Relatorio_Final.md" became `00_Inicio/Relatorio_Final_APP-001.md`.
- The decisions awaiting Daniel go in as new tasks in the "Esperando Daniel" column at the end of MAT-15; they were not in the seed.

Verification: `list_issues` at 03:28 returned 19 tasks (MAT-1 to MAT-19); the document 9 was linked to 19.

### Daniel's decisions (created at 04:30)

Column "Esperando Daniel" (35), label "decisão de Daniel" (19), assignee Daniel, no agent. Full text in [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md).

| Decision | Key | id | Blocks |
| --- | --- | --- | --- |
| D1 Mobile framework | MAT-20 | 156 | MAT-17 |
| D2 Data, backend and region | MAT-21 | 157 | MAT-17 |
| D3 Who publishes and store accounts | MAT-22 | 158 | MAT-17 |
| D4 MVP scope | MAT-23 | 159 | MAT-18 |
| D5 People for content, moderation and legal | MAT-24 | 160 | MAT-19 |
| D6 Monetization | MAT-25 | 161 | — |

New "bloqueado por" links: ids 123 to 127. The document 9 was linked to the six decisions.

### Column moves at 04:28

| Task | From | To | Reason |
| --- | --- | --- | --- |
| MAT-2 | Em andamento | Feito | Project verified by re-reading (`get_project`) and a comment with the receipts |
| MAT-3 | Em andamento | Esperando Daniel (assignee: Daniel) | Vault registration depends on an action by Daniel in Obsidian |
| MAT-6, MAT-7, MAT-8, MAT-9, MAT-14 | A fazer or Em andamento | Em revisão | Document delivered; awaiting the independent review (MAT-16) |
| MAT-12, MAT-13, MAT-15 | A fazer | Em andamento | Writing in progress |

### Decision D7 and moves from 04:52 to 05:42

- **MAT-26 (id 162), "D7 — Registros de testes de acesso em projetos de terceiros":**
  - created at 05:29:39 (08:29:39 UTC), in the 35 column, type 15, priority medium;
  - label 19, assignee Daniel, no agent;
  - linked to document 9 at 05:30:02.
  - Does not block any backlog task: it needs an answer before the first push.
- **To "Em revisão" (column 36), each with a comment:**
  - MAT-4 at 04:52;
  - MAT-10, MAT-12 and MAT-13 at around 05:00;
  - MAT-11 at 05:30;
  - MAT-5 at 05:42.
- **To "Em andamento" (column 31):** MAT-5 at 05:30, before going to review; MAT-16 at 05:42, when the independent review started.
- **Progress comment on MAT-15** at 05:30: ADR-006 to ADR-008 written and D7 created.
- **Re-read with `list_issues` at 05:42:** 26 tasks, from MAT-1 to MAT-26.
  - Feito: MAT-1 and MAT-2.
  - Esperando Daniel: MAT-3 and MAT-20 to MAT-26.
  - Em revisão: MAT-4 to MAT-14.
  - Em andamento: MAT-15 and MAT-16.
  - Backlog: MAT-17 to MAT-19, no agent.

### Independent review and moves from 05:45 to 06:25

- **Document 9 ("Estado atual e próximos passos")** updated to version 2 at 05:45.
- **Comment 925 on MAT-16 (id 152)**, at 06:24:32: result of the first round of the independent review, the 8 findings with the fixes, and the start of the second round.
- **MAT-15 (id 151) to "Em revisão" (column 36)**, at 06:24:42. Comment 927 lists the deliverables and the fixes to the ADRs and the roadmap.
- **No agent:** MAT-17 to MAT-19 remain in the backlog. None of decisions D1 to D7 has been answered.

### End of the review, from 06:56 to 06:58

- **MAT-16 (id 152):** comment 932 at 06:57:05, with the second and third rounds and the fixes. It then went to "Em revisão" (column 36).
- **Re-read at 06:57:** the columns 30 ("A fazer") and 31 ("Em andamento") were empty.
- **Document 9:** went to version 3 at 06:57:53.
- **Final state of the stage:**
  - Feito: MAT-1 and MAT-2.
  - Esperando Daniel: MAT-3 and MAT-20 to MAT-26.
  - Em revisão: MAT-4 to MAT-16.
  - Backlog, no agent: MAT-17 to MAT-19.

### Obsidian registered and MAT-3 completed, from 07:00 to 07:14

- **MAT-3 (id 139):** comment 935 at 07:04:54, with the evidence of the registration done by Daniel at 07:00:46.
- **Navigation verified** through the vault's `workspace.json`: Home at 07:11:55; ADR-002 at 07:12:03, then ADR-003, ADR-001, ADR-007 and ADR-004; Roadmap e Decisões at 07:12:39; and the design doc Comunidade e moderação, opened at 07:12:42.
- **MAT-3 went to "Feito"** (column 32) at 07:14:36, with comment 937.
- **Document 9:** went to version 4 at 07:14:58. It states that the stage is complete and that Daniel has the review and decisions D1 to D7.

### Descriptions of MAT-20 and MAT-21 aligned with the vault, at 14:55

- While preparing the return package, re-reading the 26 tasks showed that the descriptions of MAT-20 (D1) and MAT-21 (D2) still had the text from before the independent review.
  - MAT-20 said that Expo was "a única opção" for iOS from Windows (finding F02).
  - MAT-21 cited US$ 101/month, without the domain service (finding F01).
- **Fix:** both descriptions were updated through `update_issue` at 14:55:15, with the vault text and an update note. The recommendations did not change.
- **Re-read of the other 24 tasks:** no other contradiction with the vault. The description of MAT-3 keeps "Situação em 22/10 04:28" as history; the completion is in comments 935 and 937.
- **Document 9:** the re-read at 15:07 showed version 5, saved by Daniel at 14:16:13. The text is identical to that of version 4, written by Hermes at 07:14:58 (verified by script).
- **MAT-3:** the label "bloqueado" (21) was removed at 14:58, because the task is done. Only "Operação e entrega" (27) remained.
- **Package receipt:** comment 990 on MAT-16, at 15:13:29, with the path and the SHA-256 of the return ZIP.
- **Name fix:** the 30 column in MAT is named "A fazer". This log and the final report mistakenly called it "docs dependentes"; fixed at 14:57.

### Base scope design doc, at 18:23

- **Origin:** base version written by the consultant at 18:04, without access to the local files, after the consultation about web first. Original at `entregas/Consulta_Plataformas_2026-10-22/DESIGN_DOC_BASE_v0.1_consultor.md`.
- **Check against the vault (v0.2):** seven record types, roles and multiple babies in the model, reminders on the web, local encryption on native, the original sequence of APP-001, and the connection to D1 through D7 and MAT-17 through MAT-19.
- **Document 10** "Design doc base de escopo (AppMaternidade)", created at 18:23:44, version 1, not private. The published text is identical to the file `entregas/Consulta_Plataformas_2026-10-22/DESIGN_DOC_BASE.md` (verified by script). Linked to tasks MAT-17 and MAT-20 to MAT-25.
- **Document 9:** version 6 at 18:25:14, with the revised proposal, the link to document 10 and the new next steps. Version 7, at 18:25:21, is Daniel's editor saving the open page; the changes from version 6 remain in it, and the old timestamp did not come back (verified by script).
- **Not yet aligned:** the descriptions of MAT-20, MAT-22 and MAT-23 and the vault documents describe the proposal from APP-001 (native first). Reconciliation comes after the review by Daniel and Diego (section 15 of the base design doc).

### Check of documents 9 and 10, on 23/10 at 07:30

- **Document 10:** version 2, from 23/10 at 01:22, was saved under Daniel's name when they opened the page. The text is identical to that of `entregas/Consulta_Plataformas_2026-10-22/DESIGN_DOC_BASE.md` (verified by script).
- **Document 9:** version 7 has exactly the text sent in version 6, read from the session log (verified by script). Version 8, at 07:30:22, aligned three lines with the base design doc:
  - the cost of US$ 108 to 126/month was calculated for the native-first plan and will be redone for the web;
  - MAT-17 comes after the pair's review and needs a real iPhone;
  - the update timestamp.
- **Nothing has changed since 22/10 at 18:26:** decisions D1 to D7 (MAT-20 to MAT-26) still have no comments; the task columns are the same; there was no new consultant round and no commit.
- **Design doc facts verified again in the vault:**
  - 0 to 12 months, with pregnancy excluded;
  - the seven record types;
  - RF-05, RF-07, RF-12 and RF-14;
  - the roles and the observer;
  - SQLCipher not on the web;
  - the PowerSync Web SDK in GA;
  - F5 and F6 of the roadmap;
  - stage 3 of ADR-006;
  - D4 with 18 years or older.

### Design doc 0.3 and publication on GitHub, on 23/10 at 07:58

- **Daniel's request:** remove the mentions of Daniel and Diego from the document, keep it focused on the project, and push only that document to GitHub, with Daniel as author.
- **Version 0.3:** 25 replacements by script, with an exact count for each anchor. The mentions of Daniel, Diego, "dupla", Hermes, consultant and "cofre" were removed. The legal opinion on ECA Digital remains, because it is project content. The history table lost the "Quem" column.
- **Document 10:** version 3, at 07:58:12. The text is identical to `docs/DESIGN_DOC_BASE.md` (sha256 `ec1be7c2f46954f9…`, verified by script).
- **GitHub:** commit `a51fc1f` on `main` of https://github.com/DeD-TechStack/AppMaternidade (public).
  - Contains only `docs/DESIGN_DOC_BASE.md`.
  - Author and committer: Daniel Macedo, with the email linked to the Daniel-Macedo-dev account.
  - The GitHub API shows Daniel-Macedo-dev as author and as the sole contributor.
  - The remote blob is the same as the local one.
  - The push used the `gh` credential only for that command, without changing the Git configuration.
- **Outside Git:** the vault, `tasks/`, `.gitignore` and `PROGRESSO_TASK_HERMES.md`. D7 is still required before publishing the rest.
- **Document 9:** version 10, at 08:00:21. Includes the GitHub link, the commit and the "sem pedido explícito de Daniel" rule.
- **Previous copy:** `entregas/Consulta_Plataformas_2026-10-22/DESIGN_DOC_BASE.md` remains as version 0.2.

## Obsidian

| Item | Value |
| --- | --- |
| Vault | AppMaternidade |
| Path | `C:/Projetos/AppMaternidade/docs/AppMaternidade` |
| Application | Obsidian 1.14.4, executable `C:/OrchestrationLab/apps/orca/home/AppData/Local/Programs/Obsidian/Obsidian.exe`, the same one associated with the `obsidian://` protocol |
| Regular profile (used) | Registry in `C:/Users/<usuario>/AppData/Roaming/obsidian/obsidian.json`; before the registration it listed BreakInv and FORJAI |
| Oficina profile (not used) | Launcher `C:/OrchestrationLab/Abrir-Obsidian-Oficina.cmd`, with `--user-data-dir` in `C:/OrchestrationLab/apps/orca/home/AppData/Roaming/obsidian` (vault OficinaConhecimento) |
| Status | **Registered by Daniel at 07:00:46**, in the regular profile's picker. Evidence: entry `75cd70ea629fa64f` in `%APPDATA%/obsidian/obsidian.json`, with `open: true`; window "AppMaternidade - Obsidian 1.14.4" in process 24904, without `--user-data-dir`, with the child processes in `%APPDATA%/obsidian`; folder `.obsidian/` created at 07:00:47, outside Git. The Oficina registry still has the same SHA-256 as before (`5dec260f…`). Earlier, at 03:12:45, the UI automation had returned "BLOCKED, not run; the user did NOT consent" and was not repeated. **Navigation in the application:** verified through the vault's `workspace.json`, without UI automation: Home at 07:11:55; ADR-002 at 07:12:03, then ADR-003, ADR-001, ADR-007 and ADR-004; Roadmap e Decisões at 07:12:39; and the design doc Comunidade e moderação, opened at 07:12:42. |

Snapshot before the registration, to measure the effect afterwards: SHA-256 of the regular registry `1a949920f191d3e5a539639a5ac6466b6c1c33a04ed716467eca81eb034fa6a3`; of the Oficina registry `5dec260fe65fff856c75dc198f18ccd38ebbc20b87ad10c15303face687675aa`.

After the registration, verified at 07:03: the regular registry changed to `19f3c6f981d13bf5129ddd6f6349994508245913b48bd7d9fa2a81c4a18cd621`, with the new AppMaternidade entry. The Oficina registry still has the same hash as before.

## Task, document and ADR

| Task | Documents | ADR |
| --- | --- | --- |
| MAT-4 | `01_Produto/Visao_e_Escopo.md`, `01_Produto/Concorrentes_e_Diferenciais.md` | ADR-001 |
| MAT-5 | `08_Referencias/Analise_dos_Repositorios.md`, `08_Referencias/Licencas_e_Fontes.md` | ADR-007 |
| MAT-6 | `02_Experiencia/Fluxos_e_Telas.md` | ADR-001 |
| MAT-7 | `03_Arquitetura/Comparacao_de_Arquiteturas.md`, `03_Arquitetura/Arquitetura_Proposta.md` | ADR-002, ADR-003 |
| MAT-8 | `03_Arquitetura/Modelo_de_Dados_e_Permissoes.md` | ADR-005 |
| MAT-9 | `03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md` | ADR-004 |
| MAT-10 | `04_Comunidade_Conteudo/Comunidade_e_Moderacao.md` | ADR-006 |
| MAT-11 | `04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md` | ADR-007 |
| MAT-12 | `05_Privacidade_Operacao/Privacidade_e_Seguranca.md` | ADR-005, ADR-008 |
| MAT-13 | `05_Privacidade_Operacao/Custos_e_Operacao.md` | ADR-008 |
| MAT-14 | `05_Privacidade_Operacao/Qualidade_e_Validacao.md` | ADR-004 |
| MAT-15 | `06_ADRs/`, `07_Roadmap/Roadmap_e_Proxima_Fatia.md`, `07_Roadmap/Decisoes_para_Daniel.md` | all |
| MAT-16 | `00_Inicio/Progresso.md`, `00_Inicio/Relatorio_Final_APP-001.md` | — |

## Voltar

[Home](Home.md) · [Progress](Progresso.md)
