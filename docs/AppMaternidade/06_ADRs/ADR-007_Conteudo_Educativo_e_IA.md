---
tipo: adr
id: ADR-007
status: Proposed
data: 2026-10-22
autor: Hermes (coordinator of APP-001)
aprovador: none so far
tarefas: MAT-11, MAT-15, MAT-18
---

# ADR-007 — Educational content: sources, review and the role of AI

**Status:** Proposed. Hermes's technical recommendation; not approved by Daniel.

## Context and requirements

- The development pillar needs tummy time and reliable activities from the MVP (RF-08 and RF-09 in [Vision and scope](../01_Produto/Visao_e_Escopo.md)).
- All content must have authorship, sources, a reviewer, a review date and a version (RNF-07).
- Content must work offline, and the withdrawal of an incorrect item must reach devices.
- Health sources differ on the amount of tummy time. The product therefore does not set a target ([Development and content, 3.2](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md)).
- The best sources restrict reproduction (AAP, Pathways, WHO and SBP), and the app may eventually generate revenue (decision D6).
- The MVP recommendation is not to have generative AI answering users (decision D4).

## Options considered

1. **Original content in pt-BR**, written from primary sources and reviewed by a registered professional.
2. License third-party content (AAP, Pathways or another source).
3. Partnership with an institution (university, medical society, health agency).
4. AI-generated content with human review.
5. An AI assistant answering families' questions.

## Evidências

Sources accessed on 22/10/2026; details in the [community and content research](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md) and profiles.

- **Source licenses:**
  - AAP terms: without written permission, content cannot be reproduced or used with AI tools (https://www.aap.org/en/pages/terms-of-use/).
  - Pathways: personal, noncommercial use (https://pathways.org/terms-of-use).
  - WHO 2019 guideline: CC BY-NC-SA 3.0 IGO (https://iris.who.int/items/677e3562-1deb-48ec-bb1e-4bc8aad3ea09).
  - CDC: prefers links and does not allow editing milestones (https://www.cdc.gov/other/agencymaterials.html; https://www.cdc.gov/act-early/resources/customization.html).
  - NHS: OGL v3.0, but translation counts as adaptation and cannot be attributed to the NHS (https://www.nhs.uk/our-policies/terms-and-conditions/).
  - Bebbo (UNICEF): commercial use, copying and modification of content prohibited (https://www.bebbo.app/terms-and-conditions).
- **Disagreement on tummy time:**
  - AAP: 15 to 30 min/day by 7 weeks;
  - WHO and the Ministry of Health: at least 30 min/day;
  - Pathways: at least 60 min/day at 6 months;
  - SBP: "Não há consenso".
- **Public editorial cycle as a reference:** the NHS shows "Page last reviewed" and "Next review due"; HealthyChildren states that it conducts periodic reviews, bars reviewers with conflicts and has translations reviewed by native-speaking pediatricians.
- **AI in the market:**
  - Napper: assistant that uses the baby's data and first names, with possible transmission to language-model providers ([Napper](../08_Referencias/Concorrentes/Napper.md));
  - Peanut: "Ask Peanut" aggregates community accounts into an answer, without published safeguards ([Peanut](../08_Referencias/Concorrentes/Peanut.md));
  - Kinedu: assistant "Ana" in the paid plan ([Kinedu](../08_Referencias/Concorrentes/Kinedu.md));
  - Bebbo: chatbot with a fixed frequently asked questions script, without generative AI in the analyzed commit ([Bebbo](../08_Referencias/Repositorios/Bebbo.md)).
- **Offline content in practice:** Bebbo bundles content by language, synchronizes by date and deletes withdrawn items from the device ([Bebbo](../08_Referencias/Repositorios/Bebbo.md)).

## Recomendação

**Option 1 in the MVP.** Original content in pt-BR, reviewed by a professional registered with the relevant council, using the editorial cycle and fields in [Development and content, section 8](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md):

- visible authorship and reviewer;
- dated sources;
- version and next review;
- correction levels;
- priority withdrawal.

**Distribution:**

- versioned, signed package, with the first version bundled in the app;
- withdrawal list processed before any update;
- the package stays separate from family data.

**Tone:**

- tummy time and activities without targets, stars, percentages or "atrasado";
- separate "quando procurar um profissional" section;
- quantity reference only as a range with sources.

**AI:**

- **no generative AI answering families in the MVP**;
- AI only as an internal drafting tool for the editorial team, without user data and with mandatory human and professional review before publication;
- its use is recorded in the item's history.

**Option 3** (institutional partnership) remains a candidate after the pilot. **Option 2** only with written permission and known costs.

Rationale:

- Baby health content requires identifiable accountability and clear licensing. Reviewed original text meets both needs and allows a pressure-free tone, a hypothetical differentiator (DF-3 in [Competitors and differentiators](../01_Produto/Concorrentes_e_Diferenciais.md)).
- AI answering families introduces risks of plausible errors, sensitive-data transfers and API costs, without safeguards the market has publicly demonstrated.

## Consequences

- **Positive:**
  - traceability for every item;
  - works offline;
  - quick withdrawal;
  - no dependence on third-party licenses;
  - no family data sent to AI providers.
- **Negative:**
  - author and reviewer costs and lead time from the foundation stage (D5);
  - smaller catalog at launch;
  - continuous editorial cycle;
  - no immediate answer to questions outside the catalog. The community and "quando procurar um profissional" cover this gap.

## Risks and outstanding verification

- Without a designated reviewer, no content is publishable. This blocks MAT-19 through D5.
- Time held in a caregiver's arms, corrected age and range boundaries need the reviewer's decision.
- Check the Caderneta da Criança (7ª edition) and the final version of the Guia de Intervenção Precoce.
- The technical test of offline withdrawal has not yet been executed; it belongs in MAT-17 or MAT-18.
- If a commercial partnership arises, for example with baby-product brands, assess conflicts of interest and Brazilian rules on formula promotion [HIP].

## When to review

- A source appears with a license compatible with commercial reproduction in pt-BR, or an institutional partnership arises.
- The pilot shows strong demand for answers outside the catalog that the community does not cover.
- An AI provider offers processing in Brazil or an appropriate contract, verifiable citations, refusal of clinical topics and a documented evaluation. Even then, the change would require a new ADR, a revised RIPD and specific consent.
- Tummy time guidelines from the cited sources change.

## Referências

- Tasks: MAT-11, MAT-15 and MAT-18 at http://localhost:3001/oficina/MAT
- [Development and content](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) · [Community and content research](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md) · [Privacy and security](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) · [Competitors and differentiators](../01_Produto/Concorrentes_e_Diferenciais.md) · [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md) · [ADR-006](ADR-006_Comunidade_e_Moderacao.md)
