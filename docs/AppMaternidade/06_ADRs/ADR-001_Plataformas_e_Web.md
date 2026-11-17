---
tipo: adr
id: ADR-001
status: Partly superseded by ADR-009 (platforms); internal panel rules still apply
data: 2026-10-22
autor: Hermes (coordinator of APP-001)
aprovador: none so far
tarefas: MAT-4, MAT-6, MAT-15
---

# ADR-001 — Platforms, web roles and MVP boundaries

> Note dated 03/11/2026: Daniel changed the direction to the complete site first and the port afterward. See [ADR-009](ADR-009_Site_Completo_Primeiro.md). The text below remains as the APP-001 record.

**Status:** Partly superseded by ADR-009 (platforms); internal panel rules still apply

## Context and requirements

- Android and iOS are mandatory; the web and stack are undecided (Daniel's request and the task's fixed requirements).
- The package requires evaluating the web in three separate roles: public site, operations panel and product for families (criterion A of `06_CRITERIOS_DE_ACEITE.md`).
- App stores require web addresses: a published privacy policy and, on Google Play, a web link where people can request deletion of their account and data; Apple requires deletion to be initiable within the app (guideline 5.1.1(v)). Sources: https://developer.apple.com/app-store/review/guidelines/ and https://support.google.com/googleplay/android-developer/answer/13327111 (accessed 22/10/2026), summarized in [Privacy, legal and app stores](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md).
- Apps with user-generated content need filtering, reporting, blocking and published contact information (App Store guideline 1.2). This requires people to operate it and a tool to do so.
- Community moderators cannot gain access to the baby's private data ([ADR-005](ADR-005_Isolamento_e_Fronteira_Comunidade.md)).

## Options considered

### App for families

| Option | Assessment |
| --- | --- |
| Native Android and iOS apps distributed through app stores | Mandatory. |
| Android, iOS and a web app in the MVP | A third interface to maintain; offline use on the web is more fragile (browser storage can be cleared), and shared browsers increase the risk of exposure. No evidence of demand. |
| Android and iOS in the MVP; web app evaluated later using usage data | Recommended. |

### Site público

| Option | Assessment |
| --- | --- |
| No site | Infeasible: the privacy policy and account deletion need a URL. |
| Minimal static site: introduction, policy, terms, community rules, account deletion, contact | Recommended. Low cost and risk. |
| Site with open editorial content (indexable articles) | Possible later; requires the full editorial cycle and more review. |

### Moderation and operations panel

| Option | Assessment |
| --- | --- |
| Operate through the provider's console or directly in the database | Rejected: grants broad access to care data, without an audit trail or role separation. |
| Minimal internal panel, with platform roles and auditing | Recommended. Report queue, moderation actions, editorial content management and limited support. |
| Third-party moderation tool | Evaluate only if volume justifies it; requires a privacy review of the vendor. |

## Evidências

- Package requirements and criteria: `tasks/hermes/APP-001-design-docs/01_TASK_HERMES.md` and `06_CRITERIOS_DE_ACEITE.md`.
- App store guidelines (accessed 22/10/2026): links in the context above; summary in [Privacy, legal and app stores](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md), sections 5 and 6.
- Competitors: most products analyzed are mobile, and some have a complementary web offering (profiles in `08_Referencias/Concorrentes/` and matrix in [Competitors and differentiators](../01_Produto/Concorrentes_e_Diferenciais.md)).

## Recomendação

1. **App:** Android and iOS distributed through app stores, with the same feature set in the MVP.
2. **Public site:** static and minimal, ready before the first app store release.
3. **Internal panel:** minimal, for moderation, editorial content and support, ready when the community opens. Access only with platform roles, strong authentication and auditing; no read access to care data.
4. **Web app for families:** outside the MVP. Reevaluate using pilot data.
5. **MVP boundaries:** those in [Vision and scope](../01_Produto/Visao_e_Escopo.md), sections 9 and 10.

If the selected stack allows components to be reused on the web (for example, the same language for the panel), this reduces panel costs but does not change the web app recommendation: the complexity lies in offline use and security, not in the screens.

## Consequences

- Positive: focus on the two mandatory platforms; app store requirements met from the start; moderation with an audit trail and no access to child data.
- Negative: the panel is a third small product to maintain; caregivers without smartphones are excluded from the MVP; the site needs someone to keep legal texts current.

## Risks and outstanding verification

- Confirm through the pilot whether there is real demand for computer use or use by caregivers without smartphones.
- Obtain legal validation of the site texts (policy, terms, community rules).
- Determine the staffing needed to operate the panel (see [Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md)).

## When to review

- Recurring requests during the pilot for computer access or access by grandparents without smartphones.
- Changes in app store requirements for account deletion or user-generated content.
- A decision to publish open editorial content to attract an audience.

## Referências

[Vision and scope](../01_Produto/Visao_e_Escopo.md) · [Flows and screens](../02_Experiencia/Fluxos_e_Telas.md) · [Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) · [ADR-002](ADR-002_Framework_Mobile.md) · [ADR-006](ADR-006_Comunidade_e_Moderacao.md) · tasks MAT-4, MAT-6 and MAT-15.
