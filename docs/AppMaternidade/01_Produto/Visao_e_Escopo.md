---
tipo: design-doc
status: proposed
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
tarefa: MAT-4
adr: ADR-001
fontes_principais:
  - tasks/hermes/APP-001-design-docs/contexto/Contexto_AppMaternidade_Consultor_Hermes.md
  - tasks/hermes/APP-001-design-docs/01_TASK_HERMES.md
  - 01_Produto/Concorrentes_e_Diferenciais.md
---

# Vision and scope

> Note dated 03/11/2026: the direction changed to the complete site first and Android and iOS ports afterward ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)). Where this text mentions a native app, read it as the port; the site covers the same functions.

Hermes's proposal. The name AppMaternidade is provisional; age scope, initial market, monetization and the role of the web await Daniel's decision (see [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md)).

## 1. Problem

In the first months, the baby's routine is scattered across memory, paper and messages. Whoever takes over the shift asks "quando ele mamou?", "a soneca começou que horas?", "passou a pomada?". Someone caring alone late at night has practical questions and few people to ask. Development content exists in many places, with uneven quality and sometimes a tone that pressures people to meet targets.

Market products address parts of this, generally separately: routine trackers, age-based activity programs and parent communities. The comparison, with sources, is in [Competitors and differentiators](Concorrentes_e_Diferenciais.md).

## 2. Proposta

An Android and iOS app where the family quickly records the routine, shares care with other authorized adults, follows development through reliable activities (tummy time from the start) and talks in a topic-based community, without the community having access to the private routine.

Value hypothesis: connecting routine, development and contextualized conversation reduces caregivers' mental load, provided each pillar stays simple and nothing becomes a source of pressure.

## 3. Audience and age scope

- Users: adults. Mothers, fathers and other authorized caregivers (grandparents, nannies, other guardians). There are no child accounts.
- Proposed age scope for the MVP: birth to 12 months. The data model sets no limit; content and activities cover 0 to 12 months at launch, with an extension to 24 months as the first expansion. Pregnancy is outside the MVP: it changes content, community and health risks, and deserves its own decision.
- Proposed initial market: Brazil, in Portuguese. This affects content, moderation, LGPD and pricing; it is Daniel's decision.

## 4. Personas

| Persona | Situation | Needs | Obstacles |
| --- | --- | --- | --- |
| Ana, a first-time mother on leave | Breastfeeds every 2 hours (2-hour intervals) and records late at night in the dark | Know the last feed and side, record one-handed, get answers | Bright screens, long forms, a pressuring tone |
| Bruno, a father back at work | Covers nights and weekends | Know what happened and what is in progress without asking | Scattered messages; not knowing whether the nap has started |
| Dona Carmem, a grandmother caring two afternoons a week | Uses a phone with large text | Record without learning a complex app; read family notices | Icons without text; too many steps |
| Dora, a nanny | Temporary access | Record and view the day's notes | Seeing more data than necessary; retaining access after leaving |

Personas are design hypotheses, to be validated in interviews.

## 5. Main journeys

1. **First week:** create an account, register the baby, invite the other guardian, record the first feeds and diapers.
2. **Late night:** open the app in the dark, see the last feed, start and end the feed one-handed, go back to sleep.
3. **Shift handoff:** Bruno opens "Desde que você saiu" and sees records, the nap in progress and the note "pomada só à noite".
4. **Daily tummy time:** start a short session, view an activity for the stage, record without a target.
5. **Everyday question:** ask in the "Sono" space how other families divide late-night care; receive replies; report a reply with misinformation.
6. **End of the nanny's contract:** the guardian removes access; the nanny loses access on reconnecting.

## 6. Functional requirements

| ID | Requirement | Pillar | Detailed in |
| --- | --- | --- | --- |
| RF-01 | Record sleep, breastfeeding, bottle feeding, solid food, diapers, tummy time and a short observation | Routine | [Flows and screens](../02_Experiencia/Fluxos_e_Telas.md) |
| RF-02 | Start and end timed sessions that survive app termination | Routine, Development | [Offline and timers](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) |
| RF-03 | Record retrospectively, correct, delete and restore records | Routine | Flows and screens |
| RF-04 | View daily and weekly history, with authorship | Routine, Shared care | Flows and screens |
| RF-05 | Create a family, register babies and invite caregivers with a role and validity period | Shared care | [Data model and permissions](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) |
| RF-06 | Revoke access and change roles | Shared care | Data model and permissions |
| RF-07 | View care handoff ("desde que você saiu") and write highlighted notes | Shared care | Flows and screens |
| RF-08 | Tummy time sessions with history and suggested activities by stage | Development | [Development and content](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) |
| RF-09 | Educational content with authorship, sources, reviewer, review date and version | Development | Development and content |
| RF-10 | Topic-based spaces with topics and replies | Community | [Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) |
| RF-11 | Report, block and moderate | Community | Community and moderation |
| RF-12 | Share a routine summary in the community only through a deliberate action, with a preview | Community, Routine | Offline and timers, section 13 (S5) |
| RF-13 | Export family data and delete accounts and families | All | [Privacy and security](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) |
| RF-14 | Optional notifications between caregivers and local reminders disabled by default | Shared care | Offline and timers, section 10 |

## 7. Nonfunctional requirements

| ID | Requirement | How to verify |
| --- | --- | --- |
| RNF-01 | complete site first; Android and iOS with the same MVP feature set in the port | browser testing (site) and, in the port, device testing |
| RNF-02 | Essential records work without a connection (scope defined in the synchronization document) | Scenarios Q-01, Q-02 and Q-08 in [Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) |
| RNF-03 | Isolation between families in queries, writes, files, synchronization and notifications | Scenario Q-06 and per-route authorization tests |
| RNF-04 | Community without access to the private routine | Scenario Q-07 |
| RNF-05 | Accessibility: enlarged text, screen reader, contrast and touch targets | Device accessibility checklist |
| RNF-06 | Privacy by default: minimization, logs without sensitive content, push notifications without sensitive data | Code and log review; scenario Q-12 |
| RNF-07 | Traceable educational content (source, review, version) | Editorial review before publication |

## 8. Proposed success criteria

Metrics to measure in a pilot; targets are hypotheses for discussion, not results.

| Criterion | Measure | Proposed initial target |
| --- | --- | --- |
| Quick recording | Taps and seconds from button to saved record | Up to 2 taps and 5 seconds for types with a quick button |
| Real shared care | Families with 2 or more adults recording during the week | Track; no target before the pilot |
| Trust in the data | Records lost or duplicated through sync failures | Zero in tests Q-01 to Q-05 |
| Useful community | Topics with at least one reply within 24 hours | Track in the pilot |
| Moderation | Reports decided within the published deadline | Deadline to be defined with operations |
| No pressure | Reports of guilt or pressure in interviews | No recurring pattern |

## 9. Phased scope

For the current direction, see ADR-009.

| Stage | Included | What it proves |
| --- | --- | --- |
| Technical foundation | Mobile project on both platforms, authentication, family, membership, baby, local database with a queue, minimal synchronization, server-side authorization, isolation tests | That the selected architecture supports offline use, shift handoff and revocation |
| Usable MVP | The seven record types, sessions, history, care handoff, tummy time with reviewed activities, community with topics and replies, reporting, blocking, moderation panel, export and deletion | That real families use the four pillars together |
| Candidate expansions | Age range up to 24 months, widgets and Live Activities (if they do not fit in the MVP), attachments and photos, richer charts, stage-based groups, scheduled discussion circles, video content, web app for caregivers | Decided by usage and demand |

The next functional slice to implement is in [Roadmap and next slice](../07_Roadmap/Roadmap_e_Proxima_Fatia.md).

## 10. Outside the MVP

For the current direction, see ADR-009.

Sleep prediction, generative AI, camera recognition, wearables and monitors, real-time chat, audio or video rooms, telemedicine, marketplace, advertising and pregnancy. Any of these returns only with demonstrated utility, a privacy assessment and justified costs.

## 11. Web: three separate questions

For the current direction, see ADR-009.

| Web role | Proposal | When |
| --- | --- | --- |
| Public site | Necessary: product page, privacy policy, terms and the account-deletion page Google Play requires as a web link | Before the first app store release |
| Moderation and operations panel | Necessary when the community opens: report queue, actions, auditing and editorial content management; internal use | Alongside the MVP community |
| Web app for caregivers | Not in the MVP. Reevaluate with usage data (for example, requests from grandparents without smartphones or for computer use) | After the MVP |

The decision and consequences are in [ADR-001](../06_ADRs/ADR-001_Plataformas_e_Web.md).

## 12. Monetization

Open. Options to evaluate (subscription with a free plan, one-time payment, free with institutional partnership funding) have privacy and product consequences; targeted advertising using baby routine data is not proposed. Daniel's decision, with no impact on the technical foundation beyond allowing for in-app purchases.

## Open questions

1. Age scope (proposed 0 to 12 months in the MVP) and pregnancy excluded.
2. Initial market (proposed Brazil, pt-BR).
3. Monetization.
4. Final product name.

## Limits of this analysis

Personas, journeys and targets are hypotheses without user research. The market comparison depends on the sources listed in [Competitors and differentiators](Concorrentes_e_Diferenciais.md).
