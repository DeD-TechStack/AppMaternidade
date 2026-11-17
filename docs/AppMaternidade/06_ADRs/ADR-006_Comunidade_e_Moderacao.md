---
tipo: adr
id: ADR-006
status: Proposed
data: 2026-10-22
autor: Hermes (coordinator of APP-001)
aprovador: none so far
tarefas: MAT-10, MAT-15, MAT-18, MAT-19
---

# ADR-006 — Community format and moderation capacity

> Note dated 03/11/2026: the direction changed to the complete site first and Android and iOS ports afterward ([ADR-009](ADR-009_Site_Completo_Primeiro.md)). Where this text mentions a native app, read it as the port; the site covers the same functions.

**Status:** Proposed. Hermes's technical recommendation; not approved by Daniel.

## Context and requirements

- Community is one of the four pillars and must be included in planning from the start (task requirement).
- Community access cannot grant access to any child's private routine, and moderators do not read family data ([ADR-005](ADR-005_Isolamento_e_Fronteira_Comunidade.md)).
- Typical use involves little time, often late at night.
- External requirements:
  - **Apple 1.2:** filtering, reporting, blocking and contact information.
  - **Google Play:** acceptance of terms, reporting and blocking within the app.
  - **STF ruling and 2026 decrees:** immediate removal of certain content, due process and an annual report.
  - **Unauthorized intimate content:** removal within 2 hours.
- Initial moderation capacity is small: one or two people working part time (decision D5).

## Options considered

1. **An asynchronous forum with topics and replies in curated spaces, text only, without direct messages.**
2. Groups by birth month.
3. Real-time group chat.
4. Live audio rooms.
5. Comments under editorial content as the only form of community.
6. No community in the app (link to external groups).
7. Ready-made forum software integrated into the app.

## Evidências

Sources accessed on 22/10/2026; details in [Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) and the [community and content research](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md).

- Apple App Review Guidelines 1.2, "Last Updated: October 16, 2026" (https://developer.apple.com/app-store/review/guidelines/): filtering, reporting with a timely response, blocking and published contact information.
- Google Play UGC policy: acceptance of terms, reporting and blocking within the app; blocking mandatory for 1:1 features (research source [2]).
- Integrative review: peer support complements professional support, and effectiveness is inconclusive [52]. Risks include conflicting information and comparison [53].
- **BabyCenter:**
  - birth-month groups with 121 to 146 thousand members each, and layered moderation;
  - the company states that it does not monitor members' posts, and posts are indexable ([profile](../08_Referencias/Concorrentes/BabyCenter.md)).
- **Peanut:**
  - audio rooms required dedicated moderation training [50];
  - there are reports of fake accounts and in-person meetings ([profile](../08_Referencias/Concorrentes/Peanut.md)).
- **Clubhouse:** the founders reported that it became difficult for many people "to fit long conversations into their daily lives" [54].
- **Routine trackers:** the sources consulted did not identify an in-app community in any of the four analyzed. No app was installed ([Competitors and differentiators](../01_Produto/Concorrentes_e_Diferenciais.md)).

## Recomendação

Option 1 in the MVP, with phased evolution:

- **MVP:** asynchronous forum in curated spaces, text only, without direct messages.
- **Stage 2:** images with safeguards, broad-range groups, asynchronous discussion circles and AMAs with a verified professional.
- **Stage 3:** scheduled, moderated live audio discussion circles.
- **Stage 4:** direct messaging.

Each stage opens only after meeting the criteria measured in the pilot. **Live discussion circles have not been discarded:** they remain recorded as stage 3, conditional on measured demand and moderation staff trained for audio.

Minimum moderation capacity required before opening the community (MAT-19):

- rules published and accepted before the first post;
- reporting with reasons, blocking and muting;
- prioritized queue with graduated actions, notice to the author, appeals and auditing;
- crisis protocol with CVV 188 and SAMU 192, plus a dedicated flow for sexual content involving children;
- published coverage hours and automatic hiding outside them;
- new accounts' first posts reviewed before appearing;
- internal web moderation panel, without access to family data.

Rationale: this format fits late-night use and can be moderated within deadlines by a small team. It also avoids the most costly risks (images of children, direct contact, real time) until capacity has been demonstrated.

## Consequences

- **Positive:**
  - useful community from the MVP, with searchable content;
  - moderation possible without 24-hour on-call coverage;
  - less exposure to deadlines measured in hours.
- **Negative:**
  - less "companhia imediata" than a chat;
  - without photos, the experience is more limited;
  - risk of an empty community initially;
  - staffing costs (moderators and crisis script) from the pilot onward.

## Risks and outstanding verification

- Empty community: mitigate with curated spaces, pinned content and invitations to pilot families. Measure time to first reply.
- Legal deadlines (2 hours for intimate content; immediate removal for serious crimes) with a small team: validate with legal counsel what is sufficient in the text-only MVP.
- Crisis script without a mental health professional: it must be written with one before the pilot.
- Minimum age and ECA Digital: decision D4 and a legal opinion.
- Tests Q-07 (no family access) and Q-11 (reporting, blocking and deletion) have not yet been executed.

## When to review

- The pilot shows demand for images, groups or live conversation, with the stage criteria met.
- Moderation misses deadlines for several weeks: review the format or reduce scope.
- Changes in app store rules or platform legislation.
- A change in the minimum-age decision.

## Referências

- Tasks: MAT-10, MAT-15, MAT-18 and MAT-19 at http://localhost:3001/oficina/MAT
- [Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) · [Community and content research](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md) · [Privacy, legal and app store research](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md) · [ADR-005](ADR-005_Isolamento_e_Fronteira_Comunidade.md) · [Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md) · [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md)
