---
tipo: design-doc
status: under review
responsavel: lider-appmaternidade
revisado_em: 2026-11-03
tarefa: MAT-32
adr: ADR-009
fontes_principais:
  - 02_Experiencia/Fluxos_e_Telas.md
  - 02_Experiencia/Site_Mapa_e_Paginas.md
  - 07_Roadmap/Decisoes_para_Daniel.md (D11)
---

# Site visual direction

How the complete site's visual design will be defined and which gates every site task must pass. The direction itself (palette, typography, components for each screen) comes from MAT-34; this note establishes the process and rules.

## 1. Process

1. The visual direction is developed with the `claude-design` skill.
2. The `popular-web-designs` skill is used only as a comparison reference. None of its design systems is adopted in full.
3. Tokens (colors, typography, spacing, radii, shadows) are generated and validated with the `design-md` skill, in `DESIGN.md` format.
4. The `DESIGN.md` will be at `web/DESIGN.md`, created in MAT-34.

The principles in [Flows and screens](Fluxos_e_Telas.md), section 1, still apply to the site: recording in up to 2 taps, one-handed use, a low-brightness dark theme for late-night use, reversible errors, pressure-free language, community marked as public and text enlarged up to 200%. The pages are those in the [site map](Site_Mapa_e_Paginas.md).

## 2. Clean room

The external visual reference (MAT-33) does not enter the site. An analyst studies it with REA and delivers an abstract specification. The site receives only this specification, without code, images, branding or text from the reference.

The decision is D11 (MAT-31), made on 03/11/2026, with a reduced and explicitly disclosed clean room ([Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md)):

- REA runs through the CLI (`rea-agents@6.8.0`);
- the analyst is the leader, with network access only to the reference;
- the reconstructor receives only the filtered specification;
- the verifier (revisor-appmaternidade) only reports;
- the limitation is disclosed: it is the same Windows account, and isolation is through instructions and permissions.

**REA** is the reverse-engineering tool the analyst uses in MAT-33. This note does not give the reference's name or address. The reviewer checks its absence against the MAT-33 specification's prohibited list.

## 3. Components

- Only components from the `bibliotecas-ui-react-tailwind.md` list in the `skill-scouting` skill are admitted.
- Each component is admitted with its exact version and its license read at the source library's commit.
- Provenance is recorded in `web/PROVENANCE.md`, created alongside the first component.

## 4. Common site gates

These apply to every task that changes the site (MAT-27). The roadmap and tasks refer to them by number.

- **G1 Tests:** the slice's unit and component tests pass (command pinned in the foundation), exit 0.
- **G2 Types and lint:** typecheck and lint, exit 0.
- **G3 Accessibility** (`ui-ux-pro-max-local-web`):
  - axe reports no serious or critical violations on the slice's screens;
  - keyboard navigation and visible focus;
  - WCAG 2.2 AA contrast;
  - text at 200% without loss;
  - `prefers-reduced-motion` respected.
- **G4 No AI-generated look in code or on screen:** `omh-ai-slop-cleaner` has no open findings in the slice's diff.
- **G5 Visual quality:** `omh-design-quality-gate` approved on the slice's screens.
- **G6 Award bar:** `omh-award-bar-score` recorded per screen, with the minimum score defined in the visual direction (MAT-34).
- **G7 Text:** all interface and page text goes through `humanizer` and `marketing-copy-editing`.
- **G8 Components:** only from the `bibliotecas-ui-react-tailwind.md` list (`skill-scouting` skill), with an exact version, license read at the commit used and a record in `PROVENANCE.md`.
- **G9 Clean room:** nothing copied from the visual reference (no code, image, brand or text), checked by searching the diff against the visual specification's prohibited list.
- **G10 Commits:**
  - author Daniel Macedo;
  - each commit contains a real, verifiable change and a clear message;
  - empty, formatting-only or artificially split commits are prohibited;
  - ceiling of 800 per day, a consequence of work and never a target;
  - checked by the policy script over the base..HEAD range.
- **G11 Review:** APPROVED verdict from `revisor-appmaternidade` (another family) on the exact SHA; integration only with `git merge --ff-only` of that SHA.
- **G12 Data:** only fictional test data; no real family data.

Minimum award-bar score (G6): 8,0 weighted total, per screen, from MAT-44 onward (prototypes, slices and final gate). MAT-34 used 7,0.

The G10 commit policy is in [Commit policy](../00_Inicio/Politica_de_Commits.md).

## Open questions

1. ~~G6 minimum score: comes from MAT-34.~~: resolved in MAT-34, see web/DESIGN.md
2. ~~Palette, typography and late-night dark theme: come from MAT-34, with tokens in `web/DESIGN.md`.~~: resolved in MAT-34, see web/DESIGN.md
