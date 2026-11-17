---
tipo: convencoes
status: in use
responsavel: Hermes (coordinator of the APP-001)
revisado_em: 2026-10-22
---

# Vault conventions

Writing rules used by all documents in the AppMaternidade vault.

## Document status

| Status | Meaning |
| --- | --- |
| draft | Text in progress; may change without notice. |
| under review | Complete, awaiting independent review or review by Daniel. |
| proposed | Hermes recommendation ready for decision; not approved. |
| approved | Only when Daniel has actually approved it (with date and record). |

## ADR status

Proposed, Accepted, Rejected or Superseded. Only an actual approval by Daniel makes an ADR "Aceita". Hermes's technical recommendation appears as a recommendation, never as a decision made.

## Evidence classes

| Mark | Meaning |
| --- | --- |
| [EXEC] | Observed at runtime, with command, environment and date. |
| [CÓDIGO] | Confirmed in the code, at the indicated commit, with permalink and lines. |
| [DOC] | Stated in documentation, README, website, app store or help center. |
| [HIP] | Hypothesis or inference not yet verified. |

Marketing is not a clinical outcome. Absence of a mention on a page does not prove absence in the product.

## Dates, sources and links

- Access date of the external sources for this stage: 22/10/2026 (America/Sao_Paulo), unless otherwise indicated.
- Prices are dated snapshots, in USD when the source uses USD, excluding taxes and currency conversion.
- Links between notes are relative Markdown links (for example, `[Home](Home.md)`), readable outside Obsidian.
- File names without spaces and without accents, with `_` between words.

## Header of each document

Frontmatter with `tipo`, `status`, `responsavel`, `revisado_em` and `fontes_principais` when applicable. Each document ends with "Questões abertas" and, when applicable, "Limites desta análise".
