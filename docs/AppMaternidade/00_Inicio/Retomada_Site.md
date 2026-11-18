---
tipo: progress
status: in progress
responsavel: lider-appmaternidade
revisado_em: 2026-11-17
fontes_principais: appmaternidade Kanban board; itsaplan MAT-27 to MAT-43; git main
---

# Resuming the site: state at 03/11/2026

This is the starting note for the next working session on the site. It records the state of the 03/11/2026 session. Before acting, check the `appmaternidade` board, itsaplan (MAT-27 and its child tasks) and the `git log` of main: the true state is there, not in this note.

**Published site (06/11/2026):** https://ded-techstack.github.io/AppMaternidade/ (MAT-48a, main 2beddee). It shows Início, Hoje and Sessão with the "Demonstração sem banco" notice. The database variables go into the build with MAT-37.

## PAUSE of 17/11/2026 ~21h15 (PAUSA-20261117; Daniel turned the PC off, coordinator t_9748a54d): CURRENT STATE

STATE: PAUSED. origin/int/refazer = 222a20d (tonight: SEC-03, Q-1, LOC-04, FIX-RELOGIO-r); main untouched. 12 todo cards parked 'PAUSA-20261117'; running cards told to commit WIP; no live children. Waiting on Daniel: approval of the 5 scenes with Icaro, Juliana and Heloisa (DIRECAO_FABLE/4_cenas/CENAS.html) and the staged skill patches. The step-by-step to resume is the block 'RETOMAR 17/11 PAUSA-20261117' of [PENDENCIAS](PENDENCIAS.md).

## RESUMPTION of 17/11/2026 (Daniel's GO): history

STATE (history): ACTIVE since 17/11 ~11h (Daniel's GO ~10h40: resume and finish the site, push it to GitHub and record it here). The PAUSA-20261114 pause has ended. The step-by-step is in the RETOMAR block of [PENDENCIAS](PENDENCIAS.md).
- `origin/int/refazer` = fe52a8ee (merge train of 14/11: H-3g, CI-GEO g2, AUD-F2, SEC-01, MED-AUTH, RF12-HIER). `main` unchanged (publication only with the PROD_AUDIT gate at GO and both scores >= 7,5 on every page).
- 17/11 ~11h: 21 cards released. With code ready, going back to review: NEW-A (footer), VIS-1 (motion), NEW-C (logged-in shell), BASE-DEF-1, SEC-02 (banco-producao environment), VIS-4, SEC-03, SEC-05, LOC-08. Rework: NEW-B (decision: JS disabled leaves the scope and goes to PA-03), LOC-01 (after NEW-B), LOC-04, QA-HOSTIL (2/2), CODE-Q and PERF (request review), LOC-03, LOC-05, J-RF12-1, H-4. Fixes: FIX-RELOGIO, AUD-F4 g3, CI-UBUNTU, FABLE-D. A11Y-ZOOM archived (its data becomes input for A11Y-Z1).
- Leader's children in progress: SEC-06 (database test in 473ea66 for the reviewer), integration of LOC-02 (74f499b5) with the Fable judge, update of the CARDS_62 + PA-01/PA-03 drafts on the new base, closing of the RF-14 v3 spec.
- Accounts (coordinator, 17/11 ~06h): the 3 secrets are in the banco-producao environment and Google login is enabled in Supabase (localhost redirect).

## RESUMPTION of 13/11/2026 (new leader session): history

STATE: PAUSE (14/11 ~03h15, Daniel; state in PENDENCIAS.md, block RETOMAR 14/11). Before: ACTIVE (14/11 00h40, resumption after the 13/11 pause; releasing the cards awaits the coordinator's "GO cards", order in PENDENCIAS.md). Main front: item H, harmony system (per-page polishing frozen).
- MAT-40c integrated: `origin/int/refazer` = a003fe4 (merge of the reviewed 5ff67f6, identical diff, check 2734 tests on run 3; the first two hit the intermittent test DES-09 "carregando", which becomes card MAT-48f t_dfbff632). Receipt in comment 721.
- MAT-39b t_c9529365 running on fix 2/2 (comment 713); P-60 t_ca45d30f approved with limits (evidence from 37b); P-50 t_2af603f6 reduced to C-1, C-3 and C-4 (comment 711); POL-ABR t_d04a8a7d parked (comment 712).
- H step 1 done: `C:/OrchestrationLab/projetos/_staging/appmaternidade/HARMONIA/MEDIDAS.md` (Pato Jack, Good Inside on Rare Days and goodinside.com, 1440 and 390, getComputedStyle; our site measured with the same script). Findings: we add section margin 96 to panel 64 (160 between content blocks; 108 to 161 on mobile, double or triple the reference), we have 3 left margins per page, and the heading scale has no fixed ratio (84/56/48/36).
- H step 2 in spec: `HARMONIA/SPEC_H.md` v1 (lean gate, explain-back R1). Then: H-2 (DESIGN.md and generated theme), H-3 (global primitives, one card), H-4 (numbers and replica-diff before the judges).

## PAUSE of 12/11/2026 ~07h50 (Daniel, via coordinator, t_8f26b965): history

Pause at a safe point; Daniel comes back in a few days (GPT quota running out). Cron retorno-oc (cacefbc1849d) paused; 39b in triage, P-60 blocked, P-50 and POL-ABR in scheduled, MAT-40c approved but not integrated. The step-by-step for resuming is in the RETOMAR block of [PENDENCIAS](PENDENCIAS.md).

## SESSION SWITCH (12/11/2026, 7h42): history

Daniel, via the coordinator (t_64dcb622), after seeing the gallery of the current state: the base is good, but it lacks the spatial harmony of Pato Jack and Becky/Good Inside, and per-page polishing does not converge. Per-page polishing is frozen (POL-ABR t_d04a8a7d parked) and item H comes in, the harmony system: measure the spacing and type of the two references, derive the scales and apply them globally. The step-by-step for the new session is in the RETOMAR block of [PENDENCIAS](PENDENCIAS.md).

- `origin/int/refazer` = 9091c13 (10 integrations in 12/11: 38a g2, POL-DES v1 and v2, POL-TXT v2, POL-INI v2, 40b, 39a g2, MAT-48e, 37b g3, 38b). `main` untouched; publication only with "pode" (P-19).
- Open: MAT-40c t_ec79b067 approved (5ff67f6), still to be integrated; MAT-39b t_c9529365 in fix 1/2; P-60 t_ca45d30f (evidence from 37b) and P-50 t_2af603f6 (shell) running.
- Daniel's decisions on 12/11: the Gmail address on Contato stays for now and is swapped before the site is promoted (P-63); worktree cleanup still waits for "pode limpar".
- Finding of the day: the capture tool used DSF 1 with an enlarged crop, and the scenes came out blurry for the judges; fixed (real DSF 2). With it, Como funciona, Cuidado and Desenvolvimento went from 2/15 to 10/15 and Início from 4/10 to 6/10; the text pages stayed at 0/13.

## BUILD IN PROGRESS (11/11/2026, 9h25): history

- **Spec:** `C:/OrchestrationLab/projetos/_staging/appmaternidade/DIRECOES_20261111/FINAL/DESIGN.md` (sha256 e504df37). The common rules for the cards are in `FINAL/CARTOES_COMUM.md` (sha256 626371ab).
- **Assets generated by Codex on the ChatGPT plan:**
  - 4 studio scenes with the screen in green, to be composited with real captures by `ferramentas/compor.py`, already tested;
  - 6 line illustrations;
  - the record of each one in `FINAL/ativos/PROVENANCE.md`.
- **Cards:**
  - t_fdba5bed MAT-49a g1, base: tokens, fonts, header, footer, components, motion and `/sistema`. The code was ready (62eab0f), with a preview at http://127.0.0.1:5281/sistema. It fell into triage because the screen meter was measuring the old system; archived on 11/11 with the coordinator's approval, because g2 carries its code.
  - t_836284e3 MAT-49a g2: rewrites the meter for DESIGN.md and completes the licenses, then requests review of g1 + g2. It is the parent of the 5 page cards. Base gallery: `DIRECOES_20261111/GALERIA_BASE.html`.
  - t_26066f02 MAT-49b: Hoje, Sessão and Madrugada. On Opus, waiting for the base.
  - t_3c6e3a0c MAT-49c: Início with the scenes. On Opus, waiting only for the base since 11/11 10h15. The scenes are composited with captures of the pages themselves.
  - t_ee526db4 MAT-36r-A: Como funciona, Cuidado compartilhado and Desenvolvimento. On Opus, waiting only for the base since 11/11 10h15.
  - t_0aecd8d2 MAT-49d: recomposes the scenes with the new Hoje, Sessão and Madrugada screens, in the images only. Waits for 49b, 49c, 36r-A and 37r.
  - 11h30: 49b, 49c, 36r-A and 37r run together on head d65dfeb of g2 (coordinator's approval), while g2 goes through review R2 of the meter. 36r-B waits for g2 to be approved. The leader carries the meter fix over to the page branches before they are reviewed.
  - t_e1d0eaa8 MAT-36r-B: 6 text pages. On Sonnet, waiting for the base.
  - t_d63c932a MAT-37r: brings in fad75c0 (37a) and redoes the access screens. On Sonnet, waiting for the base.
- **Archived as superseded:** t_915e3632 (37a, which has MAT-37r as its successor) and t_55a580e8 (39a, covered by 36r-A).
- **Relinked and still in `scheduled`:**
  - 37b t_11ad28e6 and 37g t_1757260d, now tied to 37r;
  - 38a t_f7bdf7e8, which also waits for 49b;
  - 39b t_c9529365, now tied to 36r-A;
  - 40a t_4c921e60, now tied to 37r.
  - Their bodies will be rewritten for the new base before `unblock`.
- **Visual acceptance:** after the reviewer approves each card, it goes through 2 blind judges from different families, calibrated beforehand, and then on to Daniel's gallery.

## CHOSEN DIRECTION (11/11/2026, 9h03): history

- **Daniel's decisions (11/11, in the morning), relayed by the coordinator** (`C:/OrchestrationLab/exports/Revisao_Geral_20261111/retomada_lideres/APPMATERNIDADE_V2.md` and `V2b.md`):
  - none of directions A/B/C;
  - wants a fusion of Pato Jack (palette and soul) with Becky/Good Inside (visual devices);
  - whoever designs looks at both sources; none of their assets, text or code goes in;
  - images, shadows and gradients allowed, controlled by the tokens;
  - generated images on the published site, with curation and `PROVENANCE.md`;
  - Opus on the screens that define the site's look.
- **Round 2.** The `C:/OrchestrationLab/projetos/_staging/appmaternidade/DIRECOES_20261111/GALERIA2.html` gallery has the 3 fusions, each with a DESIGN.md and 3 compositions. The analysis of the 24 visual devices is in `rodada2/ANALISE_FEATURES.md`, with the captures of the two sources in 1440 and 390.
- **Daniel's choice, at 9h03:** **F1 Campo de mel**, which takes Becky's structure and motion with Pato Jack's colors, plus two pieces from the other fusions: from F2, the comparison table, the badge strip and the testimonials; from F3, the Madrugada mode on the app screens. The record is in `DIRECOES_20261111/GOSTO_DANIEL.md`.
- **Next step:**
  1. Finalize the DESIGN.md and the asset list.
  2. Generate and choose the assets: the studio scenes and the black line art.
  3. Create the base card (tokens, shell, components), on Opus, and show the base to Daniel early.
  4. Open the pages in parallel on top of the base.
  5. Open the successor that integrates `fad75c0` (37a) and relink the cards in `scheduled` to it.

## VISUAL REDONE FROM SCRATCH, step 0 (11/11/2026, 3h20): history

This block replaces the 10/11 block just below, which now serves only as history. In it, cards 44d-3, MAT-36 g2, 6b, 6c and 44d-6 were superseded.

- **Why.** At 2h20, Daniel rejected the site's look ("um completo lixo visualmente", "não segue em nada o site referência"). The cause is in the infra audit (`C:/OrchestrationLab/exports/Revisao_Geral_20261111/T1_visual/RESULTADO.md`). Spec MAT-44d required the devices to be built in 3D CSS and prohibited images, shadows and gradients. The clean room stripped the reference's appearance out of the spec. And the Fable judge scored its own plan.
- **New rule (team c93a301).** A page's code only starts after Daniel approves a gallery of directions. Visual acceptance is done by 2 blind judges from different families, calibrated beforehand, with at most 2 rounds per page. Whoever wrote the spec does not judge. Pausing is done with `schedule`, not with `block`.
- **Done in step 0.** The gallery is in `C:/OrchestrationLab/projetos/_staging/appmaternidade/DIRECOES_20261111/GALERIA.html`. Each of the 3 directions has a DESIGN.md (palette with measured contrast, 2 typeface families, spacing, components, dos and don'ts, and how the images are made) and 3 comps from Codex's image_gen, made on the ChatGPT plan: the opening, Hoje and a public page. The reference and the rejected captures sit alongside them. The record of each image is in `PROVENANCE.md`.
  - A, Estúdio anil: real phones photographed in a studio on indigo `#2E4BD8`, with the typefaces Bricolage Grotesque and Atkinson Hyperlegible Next.
  - B, Madrugada: night-time opening with lamplight and faceless photos, with the typefaces Young Serif and Figtree.
  - C, Bilhete da família: gouache illustration and yellow notes, with the typefaces Shantell Sans and Hanken Grotesk.
- **Board.**
  - Archived as superseded: t_5184c99c (44d-3), t_93f3308e (MAT-36 g2), t_b2a55931 (MAT-36), t_f67d8962 (44c-1), t_ab1bd202 (PWA, which Daniel declined), t_77f83db6 (6b), t_673ee2f7 (6c) and t_1584e47e (44d-6).
  - In `scheduled`, the data and access logic: t_915e3632 (37a, with code approved `fad75c0` on branch `wt/t_915e3632`), t_1757260d (37g), t_11ad28e6 (37b), t_f7bdf7e8 (38a), t_7c491177 (38b), t_55a580e8 (39a), t_c9529365 (39b), t_4c921e60 (40a) and t_359ab800 (40b).
  - No card is in triage. 48b was already done (t_fa51c4df and t_0754f01f).
- **Git.** Nothing was integrated and there was no push to main. `int/refazer` remains at e73e75a, and the published site is still the old one.
- **Waiting on Daniel (decision-maker: Daniel), the gallery questions:**
  1. Which direction to choose. I recommend A, with B's Madrugada mode on the app screens at night.
  2. Whether whoever designs may see the reference. I recommend yes, without anything from it entering the repository or the site.
  3. Whether to allow images, shadows and gradients, only through the tokens. I recommend yes.
  4. Whether to accept generated images on the published site. I recommend yes, with curation and `PROVENANCE.md`.
  5. Whether Opus writes the screens that define the site's look. I recommend yes, with Sonnet on the pages that only follow the pattern.
- **Next step, after the answer.** A refinement round of the chosen direction, also as images. Then:
  - a final DESIGN.md;
  - the generated and selected assets;
  - a shell card, with the tokens, the header, the footer and a template page;
  - a successor card that integrates `fad75c0` (37a) and redoes the access screens;
  - before any `unblock`, relink to that successor the cards in `scheduled` that were children of 44d-3 or MAT-36 g2.

## RESUMPTION of 10/11/2026 (Hermes v0.23.1): history, superseded by the block above

- **Cards and driver.** Board 9119 (PATCH) returned the 4 cards from the pause to ready: t_f67d8962 (44c-1), t_ecf636f5 (44c-2a), t_915e3632 (37a) and t_fa51c4df (48b). They and the children t_b2a55931 (MAT-36) and t_1757260d (37g) are now driven by **executor-appmaternidade**, on Sonnet. Comments 119 to 122 carry the work order: rebase onto 41d20d3, only the 2 skills, and the edge tests that fail closed (item 8).
- **Preview.** I closed the vite that had been open on port 5175 since 09/11. It belonged to the 37a worktree.
- **Visual acceptance.** The evaluator is now the pilot's: Fable 5.2 high, with Opus also on the first 2 screens. Both scores go on the card. If a score is within 0,2 of the minimum, the decision comes back to me. The minimum remains 8,0.
- **OSV (leader's decision, 10/11).** The `zod 3.25.76` alert comes from `@google/design.md`, and the `minimatch 10.2.6` and 3.1.5 ones come from eslint and typescript-eslint. All of them are **development-only**: they don't go into the site build or run in the user's browser. I'm not opening a card now. They get bumped with the next development dependency update.
- **Plugins (leader's decision, 10/11).** The Playwright CLI in OpenCode and Modern Web Guidance are left for later. The focus now is finishing the site. Captures continue through `navegacao-agentes`.
- **Subagents.** There are 2 in progress. One writes the bodies 44c-2b and 37b. The other does the v3 spec of MAT-38 with the bodies 38a and 38b. After them come MAT-39, 40 and 41. With 4 cards running, I keep at most 2 subagents.
- **Milestone (10/11).** MAT-44c-2a, which brings the motion pieces and motion 12.43.0 without wiring anything into the pages, was integrated into main **7472abc**. To do so, the 5 commits of the approved d7f6c6d were rebased, and the range-diff came out identical on all 5. The check passed with 582 tests. OSV found nothing new, only the zod and minimatch alerts, which are development-only.
- **Decision (10/11).** The v3 spec of MAT-38 was approved (sha 87dd78d9), and so were those of MAT-39, 40 and 41 (shas 145824bc, 0d387f95 and 93c02716). The cards were created and linked to their parents: 44c-2b t_6e8036b9, 37b t_11ad28e6, 38a t_f7bdf7e8, 38b t_7c491177, 39a t_55a580e8, 39b t_c9529365, 40a t_4c921e60, 40b t_359ab800 and 41a t_ab1bd202. 41b is only created after the join commit C41b. An amendment went into 39a and MAT-36: "Revisão profissional: pendente" and the draft badge are removed (comments 129 and 130). For 48b, ACC-11 was amended in comment 125.
- **Milestone (10/11): MAT-48b done.** I integrated it into main **146e290**. The 3 commits of c2a7cc2 were rebased, and the range-diff came out identical. Since the revisor-appmaternidade sandbox fails with ShellExecuteExW 1223 on this card, the review came from R-B (codex gpt-6-astra, read-only), with the result APPROVED_WITH_LIMITS (`MAT-48/RB_REVISAO_48b.md`). The deterministic verification was done by the leader, in `.oc/lider_verif/`. **The migrations are already applied to the cloud Supabase** (run 42785674785). The seed data job failed because the CLI asks for `--yes`. Nothing changed in the cloud, and the fix is in card t_0754f01f (MAT-48b-fix). After it, the leader runs the data job again.
- **Milestone (10/11): cloud database ready.** Fix t_0754f01f was integrated in **67d390a**. Run 42787421628 passed all 3 jobs: local tests, cloud migrations and seed data. The current terms are guaranteed to be in place. The admin doesn't exist yet and will only be created when Daniel has an account on the site, which depends on 37a.
- **RESUMPTION of 11/11, at 1h35.** Daniel resumed with only infra and AppMaternidade. Infra released 44d-3 (t_5184c99c), 6a (t_f21ee109) and MAT-36. `int/refazer` is at e73e75a, and main at c86090a, with push.
  - **MAT-36 in ESCALA-2R:** the card had 3 `changes_requested`. t_b2a55931 was closed, with the worktree and 667bf2b kept.
  - **Successor of MAT-36:** g2 is **t_93f3308e**. It starts from 667bf2b and brings the consolidated list of 12 items. This is visual round 3/3; if it fails, the case goes to Daniel with the gallery. 6c, 39a and 40a were relinked to it.
  - **Limit of 2 skills per card:** 6b and 6c, which pinned 4 skills and had not started, were archived. The new cards are **6b t_77f83db6** and **6c t_673ee2f7**, with 2 skills and the `rodada.py` protocol. 6a, which was already running with 4 skills, was left as it was.
  - **Next step:** integrate 44d-3, which releases 37b, 39a, 40a and 6b. Then integrate MAT-36 g2, which releases 6c. After that, 44d-6 and the gallery.
- **PAUSE of 10/11, at 20h15 (Daniel's request).** Daniel resumes later, with infra and AppMaternidade. Nothing was integrated after the request and there was no push to main.
  - **State:** `int/refazer` is at **e73e75a** and already contains 44d-1 (base), 44d-4 (Início), 44d-2 (logged-in area) and 44d-5 (Início images). Main is at 439a42d, plus this note in a local commit. The published site is still the old one.
  - **Paused cards, with `needs_input` and the reason "[decisor: Daniel] pausa de 10/11 (~20h15)":**
    - t_5184c99c (44d-3, access and Conta): in visual round 1/3, with scores 7,4–8,2 and comment 258. On return, do D1–D5 in a single pass, with `rodada.py`, then Fable and review.
    - t_b2a55931 (MAT-36, public pages): in round 2/3. 18 of 20 cases pass, and only Contato remains at 7,6/7,8 (comments 265 and 269). On return, do N1–N7, the footer at 1440 and the zoom within its own scope.
    - t_f21ee109 (44d-6a, logged-in area, image finishing and header zoom): started pass 1. On return, deliver A, B and C.
  - **Queued cards, tied to the paused parents (the panel doesn't allow blocking a card in todo):**
    - 44d-6b t_6afcc9b3 and 44d-6c t_9a4ca6ee;
    - 44d-6 t_1584e47e, the final check;
    - 37b t_11ad28e6, 38a t_f7bdf7e8, 38b t_7c491177, 39a t_55a580e8, 39b t_c9529365, 40a t_4c921e60 and 40b t_359ab800.
  - **Stalled from before:**
    - 41a t_ab1bd202: the PWA was postponed by Daniel;
    - 37a t_915e3632 and 44c-1 t_f67d8962: superseded;
    - 37g t_1757260d: waiting for Google.
  - **On resuming, in order:**
    1. Unblock 44d-3, MAT-36 and 6a.
    2. Integrate 44d-3, which releases 37b, 39a, 40a and 6b.
    3. Integrate MAT-36, which releases 6c.
    4. Do 44d-6.
    5. Put together the gallery for Daniel.
  - **Forecast from the resumption:** about 4 hours for the whole visual in `int/refazer` and another 3 to 4 hours for connecting it to the database.
  - **New tool:** `_staging/appmaternidade/ferramentas/rodada/rodada.py`, which performs the ceremony of each round in a single call.
  - PAUSA_OK appmaternidade 2026-11-10T20:20-03:00
- **Decision and milestone (10/11).** Daniel answered: "tudo sim e segue com opção A" (D1 to D5, with a 1-tap Registrar bar). Spec MAT-44d came out, with sha256 953a9114 and the first 3 sections in `_staging/appmaternidade/MAT-44d/TAREFA.md`, and branch `int/refazer` was created, at f069499, with push. Pages only publishes from main. 6 cards remained:
  - t_0288c2c3: 44d-1, base system, ready to start;
  - t_6c3e5423 (44d-2, logged-in area), t_5184c99c (44d-3, access and Conta, with code fad75c0 from 37a) and t_27b74658 (44d-4, Início): waiting for 1;
  - t_cc66cbf8: 44d-5, media;
  - t_1584e47e: 44d-6, cross-check.
  Cards t_f67d8962 and t_915e3632 were superseded (comments 160 and 161), and 37g now depends on 44d-3. Each card's acceptance is done by Fable, with a minimum score of 8. Main only receives `int/refazer` after 44d-6 passes.
- **Blocker, Daniel's decision (10/11).** Fable's diagnosis is ready in `_staging/appmaternidade/REAVALIACAO_20261110/DIAGNOSTICO_FABLE.md` (500 lines, US$ 4,76). It shows 10 root causes: three different shells, half-width media with text inside, 5 type sizes versus 11, a grid of 12 versus 10 columns with no gutter, cramped rhythm, too much color, hairlines with no rule, short text line length, a missing footer and a regression. It also includes a base system with exact values, a per-screen plan with measured criteria and 6 cards in order. Before card 1 there are 5 decisions for Daniel, in `REAVALIACAO_20261110/DECISOES_DANIEL.md`: new fonts, the end of the sidebar and the bottom navigation, the Registrar bar, short headings and the 3 numbers. I asked via clarify, with no answer in 60 minutes.
- **Decision and stop (10/11, Daniel via infra): reassessment of the entire site.** Daniel found the site very bad because "não segue em nada o site referência". Scores stalled at 6 to 7, even with the visual loop working, which points to a foundational problem. So I stopped visual round 3 of 44c-1 (t_f67d8962, OpenCode interrupted, worktree at 11de622 with 3 dirty files) and round 3 of 37a (t_915e3632, worktree ae7a405). Both are in needs_input, and nothing was integrated. Fable 5.2 high, read-only, is producing the diagnosis and the plan for the entire site against the reference, in `_staging/appmaternidade/REAVALIACAO_20261110/DIAGNOSTICO_FABLE.md`. The cards will be redone from that plan, in a new OpenCode session, with the visual loop and Fable at acceptance (minimum score 8).
- **Visual acceptance (10/11): 37a failed.** The code is approved in fad75c0. Fable gave 5,00 to 6,15, and Opus gave 5,80 on entrar and 6,00 on criar_conta. The scores are in `MAT-37/evidencias/aceite_37a/`. The visual round went back to the executor via comments 142 and 143, with up to 3 rounds. 37g (t_1757260d) stays blocked until 37a is on main.
- **Pending with Daniel.** Google OAuth still needs to be configured, and the extra verification for moderators still needs to be decided.

## PAUSE of 09/11/2026 ~22h (check before resuming, Daniel's decision)

The resumption of 09/11, at ~21h50, started too early and was suspended. Daniel will check the updates, sessions, subscriptions and models before work resumes.

- **Stalled cards:** t_f67d8962 (44c-1), t_ecf636f5 (44c-2a), t_915e3632 (37a) and t_fa51c4df (48b) are blocked as needs_input `[decisor: Daniel] pausa de 09/11 (conferência antes da retomada)`. The board put them in triage. The worktrees were preserved, and nothing was integrated or pushed.
- **Subagents:** the 2 that were redoing the bodies 44c-2b and 37b and the v3 spec of MAT-38 were interrupted without writing anything. MAT-38 remains at v2, identical to `TAREFA_v2.md`.
- **Live:** the site remains at 599b975 and main is at 58ae00f, plus this record, which is only local.
- **On resuming:** unblock the 4 cards. Comments 114 to 117 ask for the rebase onto main. For 44c-1, comments 109 and 110 also apply. Relaunch the 2 subagents, using `CONTEXTO_CARTOES.md`. Everything else stays the same as in the 06/11 section below.

## PAUSE of 06/11/2026 ~19h30 (Claude limit, Daniel's decision)

**Live:** main **599b975**, at https://ded-techstack.github.io/AppMaternidade/. It is the site from MAT-44 and MAT-48a, now with the example family Heloísa (baby) and Juliana (mother), plus Bruno and Carla. The prototype's phrase became "Um dia de exemplo com Heloísa…". The name change came from card t_5c545bc3, approved by the reviewer (469 tests). It only touches text and does not change the layout.

**Gallery:** `C:/OrchestrationLab/projetos/_staging/appmaternidade/PAUSA_20261106/GALERIA.html`.

**Halfway done.** All the cards below are blocked as needs_input `[decisor: Daniel] pausa de 06/11 (limite do Claude)`, with the worktree at `.worktrees/<id>` preserved:
- **t_f67d8962, 44c-1 (layout base).** The candidate is 79b4dfc. The independent evaluator gave scores from 5,58 to 6,22, below 8, so it does not get integrated. The 2 test exceptions are in comment 109, and the 8 defects for the new visual round are in comment 110.
- **t_ecf636f5, 44c-2a (motion components).** Candidate c8aa498 got BLOCK, with R1 (state and focus are lost when toggling reduced motion) and R2 (scaleX below the 0,8 floor). The fix was in progress.
- **t_915e3632, 37a (login, session and Conta).** Stopped where it was.
- **t_fa51c4df, 48b (cloud database).** Spec v2 with sha 956e8853. Stopped where it was.

**Queued, linked to their parents and not running:**
- t_b2a55931, MAT-36 (public pages): fix cd25061 is approved and the card is waiting for 44c-1.
- t_1757260d, 37g (Google): waiting for 37a, and addendum `MAT-37/ADENDO_GOOGLE.md` has sha a0fba14e.

**Daniel's pending items:**
- configure Google OAuth, with the step-by-step at the end of ADENDO_GOOGLE;
- decide on MFA for the moderator;
- after 48b, create their own account on the site and report the "Id da sua conta".

**Exact next action on resuming:**
1. Unblock t_f67d8962. It does the visual round from comments 109 and 110.
2. When it comes back, run the independent evaluator side by side with the reference. It only gets integrated with a score of 8 or higher.
3. At the same time, unblock t_ecf636f5, t_915e3632 and t_fa51c4df. With 4 or more cards running, use at most 2 subagents at a time, because on 06/11 at 18h51 everything went down together.
4. Redo the bodies of 44c-2b and 37b and the v3 specs of MAT-38, 39, 40 and 41, which were interrupted. The shared context is in `_staging/appmaternidade/CONTEXTO_CARTOES.md`.

## PAUSE for the v0.23.0 window (Daniel's decision, 05/11/2026 ~23h30; closed on 06/11/2026 ~00h20)

Today on board `appmaternidade` no card is running, ready or in review, and there is no active OpenCode. Main is at `881275d`, in sync with origin/main.

**Done (on main):**
- Site foundation (MAT-35) and visual direction with the 3-screen prototype (MAT-34).
- Complete local database, with the fixes from the re-read by another family:
  - MAT-43 (base);
  - MAT-45 (account and family): `t_e3572be9` and fix `t_ad018d1e`, f738247;
  - MAT-46 (routine): `t_c9df145a` and fix `t_d4e788ea`, a80924e;
  - MAT-47 (community): `t_569c296e` and fix `t_e0627701`, c16b68c.

  That's 56 test files and 3.485 assertions passing, plus the site check with 294 tests.
- Daniel's infra done:
  - GitHub Pages enabled (Source: GitHub Actions);
  - Supabase project `appmaternidade-demo` (Free, us-east-1, ref caatnppalmwyrldtdooh), with email login, Confirm email disabled, and the Pages Site URL and Redirect URL;
  - the 5 secrets in GitHub, checked by name only.

**Approved, but still outside main:**
- **MAT-44** (visual leap for Início, Hoje and Sessão): `t_10f8dad7`, APPROVED in review 3 of candidate `3a8789d898a40e35107fa2ba983747276c7b284f`, with base 2a35dc7. The reviewer's G6 gave 8,03 to 8,17.
- The integration was not done during the pause because the leader's gate is still missing: the blind reader's score (G6) and the rebase onto 881275d.
- The local preview at http://127.0.0.1:5180/ shows that candidate (worktree `.worktrees/previa`).

**Specs in staging (outside Git, `C:/OrchestrationLab/projetos/_staging/appmaternidade/`), still without a card:**

| Spec | State | Lines | sha256 |
|---|---|---|---|
| MAT-36 (public pages) | v3, after R-B 1 (B=2 M=9 N=7) | 788 | 5db326af |
| MAT-48a (Pages via CI) | v2.2, **approved** | — | 815e1f94 |
| MAT-37 (account and login) | DRAFT v1 | 594 | 5f375c49 |
| MAT-38 (Hoje, records, Sessão, Histórico) | DRAFT v1 | 648 | 1c534bbd |
| MAT-39 (Desenvolvimento) | DRAFT v1 | 701 | b17e6f20 |
| MAT-40 (Comunidade and moderation) | DRAFT v1 | 733 | 1d52798e |
| MAT-41 (PWA and offline) | DRAFT v1 | 502 | 326b1c10 |
| MAT-48b (cloud database), in `MAT-48/TAREFA_48b.md` | DRAFT v1 | 480 | feff3fbe |

Each draft has a table of the leader's pending decisions at the end. **MAT-50** (motion, itsaplan 214) is a planned pending item and is only created after MAT-44 is on main.

**Exact next step on resuming, in order:**
1. Read AGENTS.md and the board, and check that Hermes is on v0.23.0, that the gateway has been restarted, and whether itsaplan is back.
2. **Integrate MAT-44:**
   - rebase 3a8789d onto main;
   - range-diff;
   - `npm --prefix web run check`;
   - blind reader's score (G6, greater than or equal to 8,0, with a difference of at most 1,0 from the reviewer's score);
   - ff, push and vault.
3. **Run D2 of MAT-48b before the MAT-48a card.** The `VITE_*` secrets already exist, so the demo notice disappears and ACC-09 of 48a fails. Decide whether v2.3 of 48a stops passing the `VITE_*` to the build until MAT-37. After that, create the **MAT-48a** card: it is the one that puts the site live.
4. **Prepare the specs:**
   - add slots 37 to 41 in `ferramentas/isolar_supabase.py`;
   - decide the pending items of specs MAT-37 to 41 and 48b;
   - run the R-B explain-back (`ferramentas/rb_explique.py --tela MAT-NN`) on MAT-36 v3 and on the 6 new ones.
5. **Cards in parallel** (up to 5): MAT-36, MAT-37 and MAT-50. After MAT-37 is on main, MAT-38, 39 and 40. Finally, MAT-41.

**Pending with Daniel:** D5 (who reviews the Desenvolvimento content, which goes onto the site with the "Rascunho em revisão" badge), contact email, and data protection officer.

## Rumo

On 03/11/2026, Daniel set the course: AppMaternidade starts as a complete site, with RF-01 to RF-14. Android and iOS come later, via a port (packaging the site as a store app with Capacitor). The parent task is MAT-27, with acceptance gates G1 to G12.

## Decisions of 03/11/2026

| Decision | State | Outcome |
|---|---|---|
| D8, stack (MAT-28) | decided under Daniel's delegation | React 19 + TypeScript + Vite, Tailwind 4, shadcn/ui and Magic UI only from the approved list, Supabase in São Paulo, PWA; port via Capacitor |
| D9, hosting (MAT-29) | decided by Daniel | GitHub Pages via GitHub Actions; Supabase Free only without real data; own domain later |
| D10, Impeccable (MAT-30) | decided under delegation | local non-blocking check, at the final gate, after it has been evaluated |
| D11, visual reference (MAT-31) | decided under delegation | reduced clean-room study: the analyst uses the REA and the site receives only an abstract specification |

## What is done

- **Site foundation (MAT-35):** integrated into main in commit d731d3d.
  - The `web/` folder has React, Vite, TypeScript, Tailwind 4 and React Router.
  - There is linting with accessibility rules, tests with axe and contrast, the commit checker and CI.
  - The site has only two placeholder pages: the home page and the not-found page. There is no product screen yet.
- **Visual reference study (MAT-33):** the abstract specification is outside the repository, in the project's staging folder, and passed the forbidden-terms search.
- **Project registration:** the validation commands and the list of OpenCode commands have been filled in.
- **Local backend (MAT-43):** integrated into main in b76a707 (card `t_58526cc9`). It brings the Supabase CLI 3.0.0, 3 migrations (accounts, families, links and babies, with RLS and per-column grants), 10 pgTAP tests with 123 assertions, a fictitious seed and a `banco` job in CI. To run: `npm run db:start`, `db:reset`, `db:test` and `db:stop`.
- **Visual direction, tokens and prototype (MAT-34):** integrated into main in e57c844 (card `t_dd87ca3d`), after 4 reviews. `web/DESIGN.md` brings the validated tokens, and there are the Início, Hoje (with madrugada mode) and Sessão screens, with fictitious data. There are 294 tests, including the geometry of all text at 100% and 200% font size, at 4 widths. G6 landed between 7,17 and 7,25, and that is the level MAT-44 will raise.

- **Design docs v0.4 (MAT-32):** integrated into main in 5500c66 (card `t_46deffa1`).
  - Added: ADR-009, the page map, the visual direction, the commit policy, the roadmap and the decisions, the costs, the status notes and the new phrase for `AGENTS.md`.
  - One non-blocking detail remained open: the "Analise" source of line "Família e conta" of the map has 8 words, and the rule calls for 4 to 6.

## What is in progress

State at 17h55:
- **MAT-44 (visual leap):** card `t_10f8dad7` runs in a worktree created at 2a35dc7 (main with MAT-34, plus a vault commit), with spec v4 (sha256 `750efcf5`) and contract `0d75b04d3288`. What it has to do:
  - before the code, put together 3 directions; the one with the highest award-bar score wins, with no waiting (D-1 = no, Daniel's decision), and at integration the leader's blind reader checks the choice;
  - make OpenCode load the interface skills, with proof in the receipt;
  - go through a visual loop of up to 3 iterations;
  - close G6 with two independent scores, both above 8,0;
  - use icons from lucide-react.
- **MAT-50 (motion, planned pending item, itsaplan 214):** Daniel's request on 05/11/2026 to bring in the reference's animations, which were left out of MAT-44. The card is created after MAT-44 is on main and covers five points:
  - the reference recorded as video or frames, described in a clean room;
  - `motion` and up to 6 animated components from the approved list;
  - VIS-08 relaxed only in the opening and the highlights, with `prefers-reduced-motion` making everything static;
  - the replica-diff and a gallery at `GALERIA.html`;
  - two independent scores, both greater than or equal to 8,0.
- **MAT-48a (Pages via CI):** spec v2.2 was approved (sha256 `815e1f94`). The card is created when MAT-44 is on main. Pages was already enabled by Daniel on 05/11/2026 (build_type workflow, address https://ded-techstack.github.io/AppMaternidade/). On 05/11/2026 Daniel created Supabase project `appmaternidade-demo` (Free, us-east-1, ref caatnppalmwyrldtdooh), with email login, the Pages Site URL and Redirect URL, and a 90-day token scoped to the project. The 5 secrets are in GitHub, checked by name only: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD and SUPABASE_ACCESS_TOKEN. MAT-48b is no longer waiting on Daniel.
- **Study of maternity apps (MAT-49, done):** the study is in `_staging/appmaternidade/PESQ-APPS/ESTUDO_PADROES.md`. Every new logged-in screen (MAT-37 to MAT-41) uses patterns P1 to P7 and goes through `imgdiff` against the 3 crops, with a ceiling of 75.
- **MAT-45, MAT-46 and MAT-47 (database):** the v2 specs already incorporate re-read round 1 and the common database decisions (`_staging/appmaternidade/DECISOES_BANCO_20261105.md`, C1 to C9). The base, MAT-43, is already on main. Re-read round 2 by another family is stalled due to a failure of the reviewer's Codex runtime, "codex app-server stdout closed". Cards t_6bf153de, t_fcd8ad89 and t_620068a5 were recreated in a worktree and failed the same way. The case was escalated to infra in comment 53.
- **MAT-36 (public pages):** spec v2 is ready. The re-read comes after MAT-44 is on main.

## Complete site roadmap (Daniel's request on 05/11/2026)

Daniel, on 05/11/2026: "não quero só homepage, quero site inteiro funcional". The site must:
- work end to end;
- have an interface close to the reference, adapted for us;
- be published, so the professor can log in and use everything with fictitious data.

Access is via email and password, with recovery by email (Daniel's decision). The site's contact email is still pending.

The work moves along two parallel tracks, one for the database and one for screens. Each card has its own worktree.

| Order | Task | What it delivers | Depends on |
|---|---|---|---|
| 1 | MAT-34 | 3-screen prototype (fix round 2) | — |
| 1 | MAT-43 | local database: accounts, families, links and babies | review with Docker (coordinator) |
| 2 | MAT-44 | visual leap with the reference, the basis for the look of every page | MAT-34 |
| 2 | MAT-45, MAT-46, MAT-47 | account and family, routine, and community databases | MAT-43 |
| 3 | MAT-36 | public pages: Como funciona, Cuidado compartilhado, Desenvolvimento, Regras, Privacidade, Termos, Exclusão, Contato and Sobre | MAT-44 |
| 3 | MAT-37 | sign-in, create account, account recovery, invite, family and account screens, connected to the database | MAT-44, MAT-45 |
| 4 | MAT-38 | Hoje, the 7 records, Sessão and Histórico connected to the database | MAT-37, MAT-46 |
| 4 | MAT-39 | Desenvolvimento: tummy time and activities, with sources | MAT-37, MAT-46 |
| 4 | MAT-40 | Comunidade and moderation panel | MAT-37, MAT-47 |
| 5 | MAT-41 | PWA: offline, sync and reminders | MAT-38 |
| 6 | MAT-48 | publication: Supabase Free in São Paulo and GitHub Pages via CI, with a demo account | push and secrets authorized by Daniel |
| 7 | MAT-42 | final quality and acceptance gate | all |

**How the professor will use it:** the published site talks to a Supabase Free project in São Paulo, with fictitious data only.
- There will be a demo account that already has a family, a baby and a week of records.
- The professor can also create their own account.
- Daniel creates the project and registers the keys as GitHub secrets. No agent sees the keys.

## Rules in effect since 03/11/2026

- OpenCode writes the product code for the `[impl]` cards. The leader handles the card, the checks and the integration. Review is always done by another family.
- Every return from the reviewer states the cause: especificacao, implementacao, teste, ambiente or criterio_novo.
- Every fix addresses the class of the finding, not just the case, with the test for the variation written first.
- Commits are made with Daniel Macedo as author, one real step per commit. The ceiling is 800 per day and is not a target.

## Antes de publicar

Since 05/11/2026, pushing is routine, by Daniel's decision. D7 went with option A, and the local username was changed to `<usuario>`.

After each approved integration, the leader does four things:
- searches the diff for secrets (sk-, ghp_, AKIA, Bearer, password=, api_key=, .env);
- checks `git status`;
- checks that author and committer are Daniel Macedo;
- does the normal push of `main`.

For the site to go live, MAT-48 is still missing: the cloud Supabase project and the GitHub secrets, which are Daniel's responsibility, and Pages via CI.

## View the preview

From the repository root:

1. `npm --prefix web ci`
2. `npm --prefix web run dev`

Then open http://localhost:5173/ in the browser.

## Open questions

- D7 (MAT-26), with Daniel.
- The minimum award-bar score (G6) is set in MAT-34.

- 11/11 12h30: base MAT-49a (g1 + g2) approved in review R3 and integrated by fast-forward in `int/refazer` (e73e75a..98c50de). 36r-B t_e1d0eaa8 released.
