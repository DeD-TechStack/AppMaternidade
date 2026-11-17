---
tipo: adr
id: ADR-005
status: Proposed
data: 2026-10-22
autor: Hermes (coordinator of APP-001)
aprovador: none so far
tarefas: MAT-8, MAT-12, MAT-18, MAT-19
---

# ADR-005 — Isolation between families and the community boundary

**Status:** Proposed. Hermes's technical recommendation; not approved by Daniel.

## Context and requirements

- Separation between families in queries, writes, files, synchronization and notifications (fixed requirement; Q-06).
- Access to the community does not grant access to the private routine; sharing private data requires a deliberate action with a preview (fixed requirements; Q-07).
- A community moderator is not someone authorized to read private child data (05_DESIGN_DOCS_E_ADRS.md).
- Permissions stored in the token can become stale (source B05 in the package).

## Options considered

1. **Model-level permissions** (the Django default used by Baby Buddy), without family-level scoping.
2. **Family-level scoping with a list of families in the token.**
3. **Family-level scoping checked against current membership on every operation**, with the community in a separate context with its own public profile.
4. **A separate instance per family** (such as one Baby Buddy installation per household).

## Evidências

- Baby Buddy: model-level permissions and querysets that start from all objects; designed for one installation per family (profile: [Baby Buddy](../08_Referencias/Repositorios/Baby_Buddy.md)).
- Sprout Track: family-scoping helper with optional family fields in parts of the schema (profile: [Sprout Track](../08_Referencias/Repositorios/Sprout_Track.md)).
- Finnberry: authenticated procedure that resolves the user's family (profile: [Finnberry](../08_Referencias/Repositorios/Finnberry.md)).
- Supabase: JWT claims can remain outdated until renewal (source B05 in the package).

## Recomendação

Option 3, detailed in [Data model and permissions](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md):

- all care data belongs to a family; the server checks current membership (state, role, validity and epoch) on every operation, including synchronization operations and file URLs;
- IDs from another family return as nonexistent;
- community in its own context: a pseudonymous public profile linked to the account only on the server, without any reference to a family, baby or record;
- routine sharing as a reviewed and confirmed text copy, without a link back;
- platform roles (moderation, support) without read access to care data;
- push only to devices with active membership, without sensitive data in the text.

## Consequences

- Positive: isolation verifiable through automated tests; effective revocation; community without a technical path to the routine.
- Negative: two identities per person require a clear explanation; authorization queries on every operation have a cost; support cannot investigate a data problem without the family's explicit authorization.

## Risks and outstanding verification

- Authorization tests with another family's IDs on all routes and channels (Q-06), including the synchronization channel and URL issuance.
- Review of community queries to ensure that none joins care tables.
- Legal validation of support access with the family's authorization.

## When to review

- If a professional role (pediatrician, consultant) with access to a family's data is introduced: this requires a new ADR, specific consent and an audit trail.
- If the community starts having private groups linked to the family.

## Referências

[Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) · [Privacy and security](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) · ADR-006 · tasks MAT-8, MAT-12, MAT-18 and MAT-19.
