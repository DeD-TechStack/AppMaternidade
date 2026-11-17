---
tipo: relatorio-final
status: under review
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
tarefa: MAT-16
---

# Final report of APP-001

Follows the `09_MODELO_RELATORIO_FINAL.md` template from the task package.

## Resultado

**Task status: completed.** The documents are ready, itsaplan is organized and checked, and the vault is registered and navigated in regular Obsidian. Reviewing the tasks and decisions D1 to D7 remain with Daniel.

**Date:** 22/10/2026, America/Sao_Paulo.

**What was delivered:**

- **Vault:** 46 Markdown documents, including this report, not counting the 6 in the evidence folder. They are design docs, eight ADRs (all with status Proposed), a roadmap with the next slice, decisions for Daniel, research on eight competitors, four repository profiles, research on technology, privacy, community and content, and the execution logs for the references.
- **itsaplan:** MAT project with 26 tasks, of which 19 are work tasks and 7 are Daniel's decisions, plus dependency links and a status document.
- **Architecture recommendation:** proposed, with alternatives and the conditions that would change the choice.
- **Code:** no product code was written. Implementation is the next stage.

## Verified organization

| Item | Value | How it was checked |
| --- | --- | --- |
| itsaplan | http://localhost:3001/oficina/MAT. Equipe Oficina (teamId 1); MAT project, id 5, ref `oficina.MAT`; status document id 9 | Reread with `list_issues` at 05:42: 26 tasks, from MAT-1 to MAT-26 (`get_project` was checked at 04:28). At 06:57, the 30 and 31 columns were empty and the 9 document moved to version 3 |
| Vault | AppMaternidade, at `C:\Projetos\AppMaternidade\docs\AppMaternidade` | Listing and scripted link check at 05:38: 51 .md files, no broken links and none pointing to an ignored file |
| Regular Obsidian | **Vault registered by Daniel at 07:00:46.** Evidence: entry `75cd70ea629fa64f` in `%APPDATA%/obsidian/obsidian.json`, with `open: true`; window "AppMaternidade - Obsidian 1.14.4" in process 24904, without `--user-data-dir`, with the child processes in `%APPDATA%/obsidian`; folder `.obsidian/` created at 07:00:47, outside Git. The Oficina registry still has the same SHA-256 as before (`5dec260f…`). Navigation checked via the vault's `workspace.json`: Home at 07:11:55; ADR-002 at 07:12:03, then ADR-003, ADR-001, ADR-007 and ADR-004; Roadmap and Decisions at 07:12:39; and the Community and moderation design doc, opened at 07:12:42. There is a backup of the two previous registries in `%TMPDIR%/appmat/` | Reading of the registries, the window title and the `.obsidian` folder, without UI automation |
| Home | `docs/AppMaternidade/00_Inicio/Home.md` | Map with all documents |
| Receipts and progress | `00_Inicio/Registro_Organizacao.md` and `00_Inicio/Progresso.md` | Checkpoints from 02:30 to the end of the stage |

Task status at 07:14. The basis is the reread with `list_issues` at 05:42, plus the receipts for later changes (MAT-15 at 06:24, MAT-16 at 06:57 and MAT-3 at 07:14). At 06:57, a new read confirmed that the "Em andamento" and "A fazer" columns were empty.

- **Done:** MAT-1, MAT-2 and MAT-3.
- **Waiting on Daniel:** decisions MAT-20 to MAT-26 (D1 to D7).
- **In review:** MAT-4 to MAT-16.
- **In progress:** none.
- **Backlog, no agent:** MAT-17 to MAT-19, the future implementation.

## Product and architecture proposal

**Proposed MVP (decision D4):**

- **Audience and reach:** babies from 0 to 12 months, in Brazil, in pt-BR, with adult users aged 18 or older.
- **Routine:** seven log types, in-progress sessions and history.
- **Shared care:** per-person accounts, roles, authorship and care handoff.
- **Development:** tummy time with reviewed activities.
- **Community:** text only, with reporting, blocking and a moderation panel.
- **Data:** export and deletion.
- **Out of the MVP:** ads and generative AI answering families.

See [Vision and scope](../01_Produto/Visao_e_Escopo.md).

**Community** ([Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md), [ADR-006](../06_ADRs/ADR-006_Comunidade_e_Moderacao.md)):

- Asynchronous forum in curated spaces, with no direct messaging.
- Pseudonymous public profile, with no link whatsoever to the family or the baby.
- Published rules; reporting, blocking, muting and the "estou preocupada" alert.
- Prioritized queue, graduated actions, appeals and auditing.
- Crisis protocol (CVV 188 and SAMU 192) and a dedicated flow for content involving children.
- Live group circles and direct messaging are left for later stages, conditional on moderation capacity.

**Tummy time and content** ([Development and content](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md), [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)):

- Session logged by any caregiver, with authorship, working offline.
- No goal, stars or day streaks. Sources diverge (AAP, WHO, Ministry of Health, Pathways, SBP), so no number becomes a target.
- Original content, reviewed by a registered professional, with versioning and an on-device withdrawal list.

**Recommended stack (proposal):**

- **App:** React Native + Expo, decision D1 ([ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md)).
  - EAS handles the entire iOS cycle from Windows, in an integrated flow: build, signing, installation on iPhone and TestFlight.
  - Flutter and KMP reach TestFlight via macOS CI, with the pipeline set up separately and the Live Activity in Swift.
  - It builds the Live Activity without Swift (`expo-widgets`).
- **Data:** Set B, decision D2 ([ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md)).
  - Supabase (PostgreSQL and Auth) in São Paulo and PowerSync in the BR region.
  - In-house domain service in TypeScript, in a container, which decides writes, conflicts, permissions and revocation.
  - On the device, an encrypted local database (op-sqlite with SQLCipher).
- **Why this combination:** the hardest requirement is offline writing with multiple caregivers and revocation. PowerSync provides the local queue and partial download, and the write protocol stays with the in-house service ([Architecture comparison](../03_Arquitetura/Comparacao_de_Arquiteturas.md), [Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md)).

**Main alternative:**

- Flutter for the app, if the team gets a Mac, or accepts macOS CI and Swift for the Live Activity, and the technical proof favors Flutter ([ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md)).
- Set C (in-house API and sync) for data, if PowerSync fails the proof or changes its license or pricing.
- Set A (Firebase) has the lowest infrastructure cost. The documented limits:
  - by default, the last write wins;
  - explicit conflicts and domain operations require additional implementation, split between security rules and server functions;
  - leaving Firebase is difficult;
  - showing the lost version after restarting the app still needs to be proven;
  - details in [Architecture comparison](../03_Arquitetura/Comparacao_de_Arquiteturas.md), section 4, and in [Offline](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md), section 14.

**What would change the recommendation:**

- having a Mac available, or accepting macOS CI and Swift for the Live Activity, with the proof favoring Flutter;
- failure of `expo-widgets` or of accessibility in the technical proof;
- a change in PowerSync's license or pricing;
- a requirement for full control over sync;
- infrastructure cost becoming a priority.

**Web** ([ADR-001](../06_ADRs/ADR-001_Plataformas_e_Web.md)):

- **Public website:** included in the MVP, with a privacy policy, account deletion via link and support (store requirements).
- **Internal panel:** included in the MVP, for moderation, editorial content and operations.
- **Web app for families:** left out of the MVP.

**ADRs:** ADR-001 to ADR-008, all with status **Proposed**. None has been accepted.

**Illustrative costs** ([Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md)): prices as of 22/10/2026, in USD.

| Phase | Without PITR | With PITR |
| --- | --- | --- |
| Technical proof | ~US$ 8/month | — |
| Foundation and MVP | US$ 110 to 150/month | — |
| Pilot with about 100 families | US$ 120 to 180/month | US$ 220 to 280/month |

Free plans pause due to inactivity and are not suitable for production. A personal AI subscription is not API credit.

## Research and validation

| Item | Evidence | Limit |
| --- | --- | --- |
| Competitors | Eight profiles in `08_Referencias/Concorrentes/`, with source tables dated 22/10/2026; synthesis in [Competitors and differentiators](../01_Produto/Concorrentes_e_Diferenciais.md) | Public sources only; no app installed. In Napper, tummy time "não encontrado nas fontes consultadas", which does not prove absence. Differentiators DF-1 to DF-7 are hypotheses |
| Repositories | Finnberry `5e17b1a`, Baby Buddy `09629cf`, Sprout Track `eb26949` and Bebbo `5ec8c89`, with permalinks in the profiles; synthesis in [Repository analysis](../08_Referencias/Analise_dos_Repositorios.md) and [Licenses and sources](../08_Referencias/Licencas_e_Fontes.md) | Tests ran in three projects; two apps ran locally (Baby Buddy and Sprout Track). Finnberry and Bebbo were not started; Bebbo has no tests and was not compiled (no Android SDK and no macOS). Per-family isolation treated only as an audit question |
| Organization | IDs and receipts in [Organization log](Registro_Organizacao.md); 26 tasks reread at 05:42 | Obsidian registered by Daniel and navigation checked at 07:12 |
| Technical proofs | **None executed.** Proofs P1 to P9 are planned in [Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) for MAT-17 | A plan is not a test |
| Independent review | Codex CLI with gpt-6-astra (max), read-only, from 05:39 to 06:07 (MAT-16): 8 findings, 5 medium and 3 low, all fixed | No internet. It checked the documents, not the product. See "Revisão independente" |

## Decisions for Daniel

Full text in [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md). To answer, just write "D1: A", for example, here or in the corresponding task.

| ID | Task | Decision | Recommendation | Reversible | Before |
| --- | --- | --- | --- | --- | --- |
| D1 | MAT-20 | Mobile framework | React Native + Expo | Yes, until the foundation | Technical proof |
| D2 | MAT-21 | Data, backend and region | Set B, with data in Brazil | Yes, until the foundation; afterwards, swapping PowerSync without changing the database | Technical proof |
| D3 | MAT-22 | Who publishes, and store accounts | Legal entity (needs legal validation) | Partially | First build on iPhone |
| D4 | MAT-23 | MVP scope | 0 to 12 months, Brazil, 18+, text-only community, no generative AI and no ads | Yes | Foundation |
| D5 | MAT-24 | People for content, moderation and legal | Registered reviewer, 1 or 2 moderators, and LGPD and ECA Digital consulting | Yes | Opening content and community |
| D6 | MAT-25 | Monetization | Open; never ads using routine data | — | Public pilot |
| D7 | MAT-26 | Logs of access tests on third-party projects | Keep out of Git and, if Daniel wants, notify the maintainers privately | A and B yes; C no | First repository push |

## Proposed next task

**MAT-17, technical proof, followed by MAT-18, foundation and first care slice.** See [Roadmap and next slice](../07_Roadmap/Roadmap_e_Proxima_Fatia.md). None of this is implemented.

**Technical proof:** validates the chosen stack with proofs P1 to P9, in throwaway code. Depends on D1, D2 and D3.

**Scope of the first slice:**

1. account via email code;
2. family, baby and single-use invite, valid for 7 days;
3. offline tummy time session, with ending by another caregiver;
4. local queue, idempotent sending, visible states and history with authorship;
5. revocation with local cleanup;
6. if it fits, one community space to prove data separation.

**Acceptance criteria:** A1 to A11. They require:

- physical devices;
- airplane mode;
- 200 cycles without duplicates;
- ending by another caregiver, with both authors in the history;
- offline revocation;
- ids from another family;
- time zone tests;
- logs without sensitive data;
- independent review.

**Prerequisites:**

- one physical Android device and one physical iPhone;
- Apple Developer account (US$ 99/year) and Google Play Console (US$ 25 one-time);
- iOS build via EAS;
- development backend with fictitious data.

Opening accounts and contracting services is Daniel's decision.

## Revisão independente

**First round:**

- **Route:** Codex CLI 0.163.0, gpt-6-astra with max effort. It ran in a read-only sandbox, without web search and in an ephemeral session.
- **When and on what:** from 05:39:35 to 06:06:58, on a sha256 manifest of 54 files: the vault and the task package, without the D7 logs.
- **Verdict:** CHANGES_REQUIRED, with 8 findings: 5 medium, 3 low and none high.
- **Criteria coverage:**
  - 28 met and 12 partial, all tied to the findings below or to the limits of this stage;
  - 2 blocked: Obsidian registration and navigation (D-04 and D-06), which the reviewer considered honestly recorded. Both were resolved later: Daniel registered the vault at 07:00:46, and navigation was checked at 07:12.
- **What the reviewer did not find:**
  - a claim of legal compliance;
  - a free quota treated as permanent;
  - a clinical target of its own;
  - third-party isolation presented as a demonstrated vulnerability.
- The eight ADRs remain Proposed.

The coordinator accepted the 8 findings and fixed them between 06:07 and 06:23:

| ID | Severity | Issue raised | Fix |
| --- | --- | --- | --- |
| F01 | medium | D2, the comparison and ADR-003 gave US$ 101/month for the recommended set, without the domain service | Values redone using the composition in [Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md), section 2: US$ 108 to 126 with 100 families, without PITR and without staging. The comparison shows "com o serviço" and "só infraestrutura" |
| F02 | medium | Expo appeared as the only way to complete iOS without a Mac | ADR-002, D1, the comparison, this report and the platforms note now compare EAS and macOS CI. The preference rests on the integrated flow and the Live Activity without Swift; the debugging limit without a Mac was made explicit |
| F03 | medium | The analysis and two profiles called for a single active session in the database, contrary to the offline protocol, which accepts parallel sessions | A single policy, the one in [Offline](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md), sections 7.2 and 8. Parallel sessions are accepted and flagged for merging. Only "fim antes do início" is rejected; the rest becomes a warning. The analysis and the Finnberry, Sprout Track and Baby Buddy profiles were aligned |
| F04 | medium | Community and moderation put reporting, moderation and the panel in MAT-18; the roadmap puts them in MAT-19 | Community and moderation and section 13 of Privacy were aligned with the roadmap. Only the separation proof, if it fits, stays in MAT-18; moderation and the panel go in MAT-19 |
| F05 | medium | "Não encontrada nas fontes" became "não têm comunidade" | The summary, DF-1, Community, ADR-006 and the Pathways profile now say "não identificada nas fontes consultadas". The matrix gained a legend, and Kinedu appears as the closest to the four pillars |
| F06 | low | The effect of blocking on the blocked person was ambiguous | Mutual rule, in both directions, in Community, in Q-11 and in Flows. The report reasons in Flows now follow section 7 of Community |
| F07 | low | Sprout Track's dependencies had not been surveyed | Surveyed via `package-lock.json`: 520 production entries and 23 points to check ([Licenses and sources](../08_Referencias/Licencas_e_Fontes.md); list in `09_Evidencias/Execucao_Referencias/Sprout_Track/13_licencas_dependencias.tsv`) |
| F08 | low | Acceptance criterion A4 did not test ending by another caregiver | New acceptance criterion A11 in the [Roadmap](../07_Roadmap/Roadmap_e_Proxima_Fatia.md): the primary guardian starts, the caregiver ends, and the history keeps both authors. A4 no longer cites Q-03 |

**Limits of this review:**

- **Links:** the reviewer checked 577 internal links with no missing target, but did not check 88 destinations outside the manifest. At 06:23, the coordinator's script checked the vault's 691 relative links: none broken and none, from a versioned file, pointing to a file outside Git.
- **External URLs:** they were not reopened. The review ran without internet, and the sources are dated.
- **Final report:** this report was outside the manifest, because it was written after the round began.

**Second round:**

- **Route and when:** the same route, from 06:24:07 to 06:39:42, on a manifest of 33 files: the 23 changed ones, the references and the 06 and 09 files from the package. It reread the 8 findings and this report.
- **Verdict:** CHANGES_REQUIRED, with 8 findings: 3 medium, 5 low and none high.
  - Four are residues of F01, F02, F04 and F06, in research notes and in this report.
  - Four are new, F09 to F12.
- **Coverage:**
  - met: F03, F05, F07, F08 and the report's structure following the 09 template;
  - partial: F01, F02, F04, F06 and the report's fidelity to the vault.
- The 33 hashes matched, and no forbidden file was read.

Coordinator fixes, between 06:40 and 06:43:

| ID | Severity | Issue raised | Fix |
| --- | --- | --- | --- |
| F01-R2 | low | The pricing note did not say that its Set B excludes the domain service | Note below the 10.2 table and a new item in 10.4, with a link to [Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md), section 2 |
| F02-R2 | medium | Leftovers of "só com Mac" in the platforms note summary, in Flutter's requirements, in the minimum total, in the comparison's change condition and in this report | These texts and D1 now separate build and distribution via macOS CI from creating and debugging the extension in Xcode |
| F04-R2 | low | The community research still put reporting, moderation and the panel in the foundation | Row marked as superseded, with a note referring to the roadmap and to section 4 of Community and moderation |
| F06-R2 | low | The community research still described blocking in one direction only | Marked as superseded by the mutual rule in section 7 of Community and moderation |
| F09 | medium | This report inverted the order: "MAT-17 depois da MAT-18" | Corrected to "MAT-17, seguida da MAT-18" |
| F10 | medium | This report said that Firebase "tira o protocolo de escrita do nosso controle" | Replaced with the documented limits: last write wins by default, there is additional implementation split between rules and functions, leaving is difficult and one proof is missing |
| F11 | low | At 10.000 families, Set B with the service did not match the research's sum | The canonical composition gained a row for database, file and PowerSync overages, of ~US$ 12 at 10.000 families. With it, the subtotal comes to US$ 238 to 298 and the growth phase to US$ 250 to 350, with staging. The comparison and ADR-003 were updated |
| F12 | low | The document count (45) left out this report | It is now 46, including the report and excluding the evidence |

**Third round:**

- **Route and when:** the same route, from 06:45:10 to 06:55:41, on 13 files. The hashes matched and no forbidden file was read.
- **Verdict:** APPROVED_WITH_LIMITS.
- **Coverage:**
  - 8 met: F01-R2, F02-R2, F04-R2, F06-R2, F09, F10, F12 and the review section of this report;
  - 2 partial: F11 and the canonical cost figures, both for the same reason as the finding below.
- **Single finding:** F11-R3, low severity. The ~US$ 12 of overages were derived by subtraction and could not be reproduced from the components. Using the formulas, the sum comes to ~US$ 7,44.
  - **Fix, at 06:56:** [Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md), section 2, and [Dated prices](../08_Referencias/Tecnologias/Precos_Datados.md), section 10.2, gained the per-component calculation: database US$ 5,25, files US$ 0,94 and PowerSync US$ 1,25.
  - The remaining ~US$ 4,56 were recorded as a non-reproducible difference in the note, kept as a conservative margin. The totals did not change.
  - This last fix did not go through a new round.

**Final review status:** no high findings in three rounds. The 17 medium and low findings were fixed, and the last one was documented as a limit. The review checked documents, not the product. External sources were not reopened.

## Blockers

| Since | Action attempted | Tool | Actual result | Preserved | Minimal intervention |
| --- | --- | --- | --- | --- | --- |
| 22/10 02:58; picker opened at 03:12:45 | Register the vault in regular Obsidian by clicking "Abrir pasta como cofre" | `computer_use` | "BLOCKED, not run; the user did NOT consent, do not retry or reach the same outcome another way" | Regular Obsidian picker open (PID 24904); backups of the `obsidian.json`; no manual configuration edits | **Resolved:** Daniel registered the vault at 07:00:46. The Home, a design doc and ADRs were opened in the application at 07:11 and 07:12 (criteria D.42 to D.44), checked via the vault's `workspace.json` |
| 22/10 03:14 | Running and analyzing Finnberry, Sprout Track and Baby Buddy via subagents | `delegate_task` | "content_policy_blocked: This request triggered restrictions on violative cyber content and was blocked under Anthropic's Usage Policy." | Logs already saved in the vault | Legitimately worked around: profiles by code reading only; access tests abandoned (D7) |
| 22/10, several times, from 04:30 to 05:25 | Writers and profiles via subagent | `delegate_task` | "Provider has been unresponsive (no response received) for 5 consecutive stale attempts — aborting this call…" | Logs of the attempts in `hermes/cache/delegation/live/` | Worked around: the coordinator wrote the documents. No document was left missing |
| — | Decisions D1 to D7 | — | Awaiting Daniel | MAT-20 to MAT-26 | Comment on the task or reply here |

## Models and roles used

| Role | Route | Model | Result consumed |
| --- | --- | --- | --- |
| Coordinator | Hermes, default profile | claude-opus-5-5[1m] | Organization, synthesis, most of the final documents and coherence review |
| Initial research (10 subagents, 02:54) | `delegate_task` | claude-opus-5-5[1m] | Competitor profiles, notes on technology, privacy, community and content, dated prices and the Baby Buddy profile. Four tasks failed (filter or provider) |
| Writers and profiles (03:48 to 05:25) | `delegate_task` | claude-opus-5-5[1m] | No final document. All attempts failed due to no response from the provider. I used only the Finnberry evidence index, its 06 and 07 logs and, from Bebbo, the list of dependency licenses |
| Independent reviewer | Codex CLI 0.163.0, read-only | gpt-6-astra, max effort | Verdict and 8 findings, all accepted and fixed. See "Revisão independente" |

## What was not done or tested

- No app, prototype or technical proof of AppMaternidade.
- No user testing.
- No legal validation: privacy, stores and ECA Digital are proposals to be validated.
- No prices for the Brazil regions confirmed.
- No commit and no push: the repository still has no commits, and the remote is public. D7 needs an answer before the first push.
