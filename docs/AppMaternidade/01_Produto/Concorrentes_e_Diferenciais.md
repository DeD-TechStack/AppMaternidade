---
tipo: design-doc
status: proposal
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
tarefa: MAT-4
adr: ADR-001
fontes_principais:
  - 08_Referencias/Concorrentes/Napper.md
  - 08_Referencias/Concorrentes/Huckleberry.md
  - 08_Referencias/Concorrentes/Baby_Daybook.md
  - 08_Referencias/Concorrentes/Nara_Baby.md
  - 08_Referencias/Concorrentes/Kinedu.md
  - 08_Referencias/Concorrentes/Pathways.md
  - 08_Referencias/Concorrentes/BabyCenter.md
  - 08_Referencias/Concorrentes/Peanut.md
  - 08_Referencias/Pesquisa_Comunidade_e_Conteudo.md
---

# Competitors and differentiators

> Note from 03/11/2026: the direction changed to a full website first and an Android and iOS port later ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)). Where this text mentions a native app, read it as the port; the website covers the same functions.

Synthesis of the eight competitor profiles, consulted on 22/10/2026. The profiles used only public sources: websites, stores, help centers, privacy policies, blogs and reviews. No app was installed, no account was created and there was no reverse engineering. Therefore, statements about the products are [DOC] (stated by the product itself) or [HIP] (inference, absence in the sources or an isolated report). Nothing here is [EXEC]. The bracketed codes (N01, H05, PW13…) refer to the source table in each product's profile.

"Não encontrado" means absence in the sources consulted, not proof that the feature does not exist.

## Resumo

- **In the sources consulted, none of the eight fully covers the four pillars.** "Completa" means "Sim" in all four pillars of the matrix.
  - Kinedu comes closest: it has all four, but routine and community are partial, and tummy time appears only in an article.
  - In the routine trackers (Napper, Huckleberry, Baby Daybook, Nara), no in-app community was identified.
  - The community products (BabyCenter, Peanut) have almost no routine features.
  - Pathways has partial routine.
- **The strongest in each pillar:**
  - Routine: Huckleberry and Baby Daybook.
  - Development and tummy time: Pathways (Tummy Timer, widget, corrected age) and Kinedu (daily activity plan).
  - Community: BabyCenter (birth-month groups, layered moderation) and Peanut (social network with safeguards).
  - Shared care: Pathways (three access levels, free) and Kinedu (two roles and per-member history, paid).
- **Already table stakes in the market:** quick logging with a timer, loggable tummy time (4 of the 8), timer outside the app, sync between caregivers, export and corrected age.
- **Gaps that support differentiators, still as hypotheses:**
  - the pillars integrated into a single product;
  - one account per person, with roles, authorship and shift handoff;
  - development without pressure;
  - contextual, moderated community;
  - stated offline support;
  - privacy as a product stance.

## Products analyzed

| Product | Focus | Owner | Platforms | Portuguese | Pricing model (22/10/2026) | Profile |
| --- | --- | --- | --- | --- | --- | --- |
| Napper | Baby sleep | Napper AB, Sweden | Android, iPhone, Apple Watch | Yes, plus 19 other languages [DOC N05, N06] | Free, and Unlimited at US$ 69,99/year on the website. On the US App Store: Sleep at US$ 14,99/month and Complete at US$ 19,99/month [DOC N05, N09] | [Napper](../08_Referencias/Concorrentes/Napper.md) |
| Huckleberry | Full routine and sleep prediction | Huckleberry Labs, USA | Android, iPhone and iPad, Apple Watch | No; English only on the App Store [DOC H19] | Free; Plus at US$ 11,99/month; Premium at US$ 14,99/month [DOC H01, H02] | [Huckleberry](../08_Referencias/Concorrentes/Huckleberry.md) |
| Baby Daybook | Configurable routine | BALTAPIS UAB, Lithuania | Android, Wear OS, iPhone, Apple Watch, Mac | Yes, among 40 languages [DOC B07] | Free with ads; Premium from US$ 1,99 to 9,99/month or lifetime [DOC B07, B08] | [Baby Daybook](../08_Referencias/Concorrentes/Baby_Daybook.md) |
| Nara Baby | Baby routine and mother's care | Nara Organics, USA, which sells infant formula | Android, iPhone, Apple Watch | Not confirmed; English only on the App Store [DOC R04] [HIP R09] | US$ 9,99/month or US$ 99,99 lifetime; without a subscription, the family is left with read-only access [DOC R02] | [Nara Baby](../08_Referencias/Concorrentes/Nara_Baby.md) |
| Kinedu | Development through activities | Kinedu, USA and Mexico | iPhone, iPad, Android | Yes [DOC KN02] | 7-day trial; about US$ 7/month on the website; limited free tier [DOC KN01, KN02] | [Kinedu](../08_Referencias/Concorrentes/Kinedu.md) |
| Pathways.org | Milestones, activities and tummy time | Pathways Foundation, US nonprofit | iPhone, Android, web | Partial; conflicting counts and brochures in pt-BR [DOC PW05, PW20] | Free, no paywall; separate tummy time course for US$ 20 [DOC PW05, PW17] | [Pathways](../08_Referencias/Concorrentes/Pathways.md) |
| BabyCenter | Content and community, pregnancy focus | BabyCenter (Ziff Davis), USA; its own Brazilian site | iPhone, Android, web | Yes [DOC BC01, BC13] | Free with ads and a points program with brands [DOC BC01] | [BabyCenter](../08_Referencias/Concorrentes/BabyCenter.md) |
| Peanut | Social network for mothers | Peanut App Limited | iPhone, Android | Yes; in Brazil since 01/2025 [DOC PN01, PN19] | Free; Peanut Plus from US$ 8,99 to 29,99 [DOC PN01] | [Peanut](../08_Referencias/Concorrentes/Peanut.md) |

Prices are from the US stores unless otherwise noted, and they change frequently.

## Matrix by pillar

| Product | Routine | Development and tummy time | Community | Shared care |
| --- | --- | --- | --- | --- |
| Napper | **Yes.** Recalculated sleep schedule, 10 logging categories, retroactive logging [DOC N01, N02] | **Partial.** Sleep course and blog; tummy time not found [DOC N02] [HIP] | Not found [DOC/HIP N07] | **Yes, without roles.** Invitation by QR code; baby and subscription shared [DOC N02, N05, N13] |
| Huckleberry | **Yes, the most complete.** SweetSpot prediction on the paid plan [DOC H02, H19] | **Yes.** "Activities" with tummy time timer; CDC milestones with corrected age [DOC H05, H08] | Not found in the app; conversation in an external subreddit [HIP H24] | **Partial.** The family signs in with the same account; one caregiver starts and another stops [DOC H12, H13] |
| Baby Daybook | **Yes.** Widgets, Live Activities, persistent notification on Android, Wear OS [DOC B03, B04, B07] | **Partial.** Tummy time as a custom activity; WHO/CDC curves with corrected age [DOC B06, B07] | Not found [HIP] | **Yes, on Premium.** Caregiver list, without roles [DOC B01, B02] [HIP] |
| Nara Baby | **Yes.** Timers, Live Activities on iOS, alert for a timer running over 24 h [DOC R02, R04] | **Partial.** Tummy time as "rotina"; CDC milestones; AAP/CDC guides without a named author [DOC R02, R04] [HIP] | Not found [DOC R04] | **Yes, with full access.** Invitation by email, one account per person, multiple families per account [DOC R02] |
| Kinedu | **Partial.** Sleep, feeding and diapers, with prediction [DOC KN01, KN02] | **Yes.** Daily video plan, 414 milestones in 4 areas; tummy time only in an article, no timer [DOC KN06, KN09, KN13] [HIP] | **Partial.** Comments under activities and live classes; no published guidelines [DOC KN06, KN15] [HIP] | **Yes, paid.** "Main caretaker" and "Caretaker" roles, per-member history [DOC KN02, KN06] |
| Pathways.org | **Partial.** Diapers and feedings since 04/2026; sleep not found [DOC PW01, PW12] [HIP] | **Yes.** CDC/AAP milestones with video, corrected age, Tummy Timer, widget and daily goal by age [DOC PW05, PW13, PW14] | Not found [HIP] | **Yes, free.** Account holder, caregiver and limited-access caregiver; relationship (health professional, daycare); choice of which children to share [DOC PW05] |
| BabyCenter | **Partial.** Pregnancy-centered; diaper logging not found [DOC BC01, BC02] [HIP] | **Partial.** Articles with named medical review; no tummy time tool [DOC BC16] | **Yes, flagship.** Birth-month groups with 121 to 146 thousand members, topic groups, direct messaging [DOC BC06, BC10] | Not found; users ask how to include their partner [HIP BC19, BC20] |
| Peanut | Not found [HIP] | **No.** Milestones only for sharing with other mothers [DOC PN01] | **Yes, the core.** Matching by stage and proximity, feed, groups, anonymous posts, live audio rooms, AI "Ask Peanut" [DOC PN11, PN22] | **No.** Prohibits shared accounts; only accepts women [DOC PN06] |

Matrix legend:

- **Yes:** dedicated feature, stated in the sources.
- **Partial:** limited or peripheral feature.
- **No:** the source states that the feature does not exist or restricts it.
- **Not found:** not identified in the sources consulted, which does not prove absence.

No app was installed.

## Tummy time in the market

| Product | How it appears | Goal | Tone | Evidence |
| --- | --- | --- | --- | --- |
| Napper | Not found on the website, sitemap, pricing, support or stores; one review asks for an exercise button with tummy time | — | — | [DOC N01, N12] [HIP N07] |
| Huckleberry | Activity with timer or "feito", notes and reports; version 0.9.312 says the timer stays accurate with the screen off | Not described in the sources | "não são um checklist" milestones | [DOC H05, H08, H19] |
| Baby Daybook | Custom activity | Not found | — | [DOC B07, B08] |
| Nara Baby | Loggable "Rotina" | Not found | — | [DOC R04, R05] |
| Kinedu | Article citing the AAP (30 min/day); no timer | Not in the app | Pressure: "it is crucial to keep trying" | [DOC KN13] [HIP] |
| Pathways.org | Tummy Timer, widget with stars, weekly chart, manual entry, month-by-month videos | Daily goal by age; 60 min/day at 6 months, but another page says 1 h at 3 months | Mixed: "Every minute counts", but also goals and stars | [DOC PW13, PW14, PW15, PW16] |
| BabyCenter | Article only, with videos by age | No | Supportive: "If your little one doesn't like tummy time, it's okay" | [DOC BC16] |
| Peanut | No feature; appears in posts by mothers worried about the 1-hour goal | — | Reports of guilt and pressure | [DOC PN24] [HIP] |

Conclusions:

- Logging tummy time already exists in four of the eight products. On its own, it is not a differentiator.
- Health sources disagree on the amount (AAP, WHO and the Ministry of Health, Pathways, SBP), according to the [community and content research](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md). This argues against a fixed numeric goal in the app.
- What is missing in the market is combining three things:
  - tummy time within the day's routine, logged by any caregiver and with authorship;
  - reviewed content, with visible author and reviewer;
  - a tone without goals, without stars and without comparison.

## Shared care in the market

| Product | Identity of each caregiver | Roles | Visible authorship | Removal or revocation | Cost |
| --- | --- | --- | --- | --- | --- |
| Napper | Invitation by QR code | Not stated | Not found | Not found | Not stated; the subscription passes to whoever receives the baby |
| Huckleberry | Same account for the family | No | No | Not individual | Free |
| Baby Daybook | Caregiver list | Not found | Not found | Not found | Premium |
| Nara Baby | One account per person | No: full access | Not found | Only the family creator removes | Family subscription |
| Kinedu | Invitation by email | Main caretaker and Caretaker | Per-member history | Through the family screen | Premium |
| Pathways.org | Invitation link, own account | Three levels, plus the relationship and the choice of children | Not found | Not found | Free |
| BabyCenter | — | — | — | — | Not found |
| Peanut | Prohibits shared accounts | — | — | — | — |

The "uma conta por pessoa, papéis, autoria visível em cada registro e revogação com efeito definido" set does not appear in full in any product. Pathways has the most granular roles, Kinedu has per-member history, and Nara has per-person identity. Huckleberry shows the cost of lacking it: reports of logs going out of sync with a shared login [HIP H23].

## Community and moderation in the market

- **BabyCenter** [DOC BC05, BC06, BC07, BC10, BC11]:
  - **Scale:** birth-month groups at large scale.
  - **Layered moderation:** paid staff, volunteer group owners and temporary helpers.
  - **Rules:** 10 published rules, including "No medical misinformation".
  - **Reporting:** with a choice of destination and an appeal channel.
  - **Stated limits:** does not monitor what members post; posts are indexable by search engines; content stays up after the account is closed.
- **Peanut** [DOC PN06, PN08, PN09, PN14, PN15, PN16, PN22] [HIP PN02, PN23]:
  - **Safeguards:**
    - mandatory selfie, with human review when in doubt;
    - non-punitive reporting ("I'm worried about this person");
    - word muting and a rule against retaliatory reporting;
    - room audio kept for 30 days, only to investigate reports.
  - **Reported risks:** fake accounts and in-person meetups.
  - **Stated risks:** "Peanut Pros" without verified credentials and an AI that assembles health answers from user anecdotes.
- **Kinedu** [DOC KN06, KN08]: comments under activities, answered by specialists; does not publish community guidelines for families.
- **In the routine trackers,** no in-app community was identified in the sources consulted. Conversation between parents takes place on external networks, such as the Huckleberry subreddit [HIP H24].

The format proposed for AppMaternidade (forum by topic and stage, text only, no direct messaging, moderated) is in [Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md).

## Privacy and business model

| Product | Signal found | Evidence |
| --- | --- | --- |
| BabyCenter | The store declares sensitive data used for tracking and for advertising; the policy provides for sharing name, due date and address with partners; the class action *Reimer* (filed in 22/09/2026) contains allegations not yet adjudicated | [DOC BC01, BC04, BC17, BC21] |
| Pathways.org | The policy says "We sell personal information", including inferences about the baby's health; the stores say "never shares" | [DOC PW01, PW02, PW07] |
| Napper | An AI assistant uses the baby's data and first names, with possible transmission to language model providers | [DOC N10] |
| Baby Daybook | Ads on the free plan; Play declares sharing of the device ID for advertising | [DOC B08, B10] |
| Kinedu | The two stores describe data sharing differently | [DOC KN02, KN05] [HIP] |
| Nara Baby | The company sells infant formula; with an expired subscription, the family cannot log anything new | [DOC R01, R02] |
| Huckleberry | Health data linked to the user on the App Store, but not on Play | [DOC H19, H21] |
| Peanut | Publishes a retention table by data type; life stage is treated as sensitive data, with consent | [DOC PN15] |

For an app with children's data and caregiving data, privacy tends to weigh on trust [HIP]. The commitments are in [Privacy and security](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md), and monetization is decision D6 in [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md).

## What is already table stakes

Entry requirements. Having these does not differentiate, but lacking them counts against.

1. Quick logging of feeding (with side), sleep and diapers, with a timer, retroactive logging and editing: all routine trackers.
2. Loggable tummy time: Huckleberry, Baby Daybook, Nara and Pathways.
3. Timer outside the app:
   - Live Activities on iOS: Baby Daybook, Huckleberry and Nara;
   - persistent notification or Live Updates on Android: Baby Daybook and Huckleberry;
   - widgets: Baby Daybook, Huckleberry (iOS only) and Pathways;
   - watch: Baby Daybook, Huckleberry, Napper and Nara.
4. Sync between caregivers: all trackers, at different levels.
5. Export: CSV in Huckleberry and Nara, PDF in Baby Daybook; Napper does not have it yet (08/2026) [DOC N03].
6. Corrected age for premature babies: Huckleberry, Pathways and Baby Daybook.
7. Sleep prediction with written caveats and a manual mode: Napper, Huckleberry and Baby Daybook. Kinedu also predicts sleep and feeding, but the profiles found no caveats. Whether it goes into the MVP is a decision for the [scope](Visao_e_Escopo.md).

## Hypothetical differentiators

None has been validated with users. Each one includes the evidence of the gap, how to validate it and the main risk.

| ID | Hypothesis | Evidence of the gap | How to validate | Risk |
| --- | --- | --- | --- | --- |
| DF-1 | Routine, development and community in a single product, with each pillar staying simple | In the sources consulted, none of the eight has "Sim" in all four pillars. Kinedu has all four, two of them partial (matrix above) | Interviews and pilot: use of two or more pillars per family and compared retention | Bloated product; mitigate with optional community and routine as the entry point |
| DF-2 | One account per person, with roles, authorship on each entry and shift handoff | Shared login (Huckleberry), full access (Nara), no roles (Napper, Baby Daybook), roles only on the paid plan (Kinedu), authorship and revocation not found (Pathways) | Usability test with a couple and a third caregiver (grandmother, nanny); count of duplicates and conflicts in the pilot | Permission complexity; mitigate with few roles in the MVP ([Data model](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md)) |
| DF-3 | Development without pressure: tummy time in the routine, with no numeric goal, no stars, no percentile, with "ainda não" and with guidance on when to seek a professional | Stars and age-based goals with internal inconsistency (Pathways), "Adiantado" and percentiles (Kinedu), reports of guilt (Peanut), conflicting health sources | Tone and comprehension testing with mothers, fathers and caregivers; qualitative reports of pressure | Seeming less complete; mitigate with personal history, without comparison |
| DF-4 | Community by topic and stage, moderated, text only in the MVP and without exposing family data | Community not identified in the four routine trackers, in the sources consulted; BabyCenter does not monitor and indexes posts; Peanut shows the risks of direct contact and proximity | Small pilot with the metrics from the [community research](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md): time to first reply, reports per thousand posts, moderation turnaround | Moderation cost (D5) and an empty community; mitigate with broad age ranges and curated spaces |
| DF-5 | Stated offline logging, with explicit conflicts instead of "mágica" sync | Napper reported as unusable without internet [HIP N08]; Huckleberry warns that logs may go out of sync [DOC H14]; Baby Daybook rewrote its sync and fixed duplication coming from the watch [DOC B07]; report of history loss in Pathways [HIP PW04] | Tests P1 to P9 in [Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) | Technical cost ([ADR-004](../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md)) |
| DF-6 | Privacy as a verifiable stance: no ads using routine data, no data sales, no generative AI in the MVP and data stored in Brazil | Section "Privacidade e modelo de negócio" | Store labels consistent with the policy; comprehension test of the notices | Harder monetization (D6) |
| DF-7 | Product designed for Brazil, with content referenced to Brazilian sources | Huckleberry and Nara English-only on the App Store; but Napper, Baby Daybook, Kinedu, BabyCenter and Peanut have Portuguese | Interviews | Weak differentiator: several competitors already have Portuguese |

## What not to copy

- Shared login between caregivers (Huckleberry) and full access for any caregiver (Nara).
- A paywall that blocks the family's logging (Nara) or interrupts the moment of care (reports on Huckleberry and Kinedu) [DOC R02] [HIP H20, KN04].
- Tummy time goals with stars and pressure (Pathways); "Adiantado" labels and percentiles compared with other children (Kinedu).
- Advertising using health data and data sales (BabyCenter, Pathways).
- Specialists with a badge but no verified credential, and AI that assembles health answers from user anecdotes (Peanut).
- Baby data sent to AI providers (Napper).
- Direct messaging and proximity-based contact in the MVP (Peanut; direct messaging in BabyCenter).
- Community content that is indexable and kept after account deletion (BabyCenter).
- Feeding content produced by a company that sells infant formula (Nara). Brazilian rules on the promotion of formula need legal review before any partnership [HIP].

## Content reuse

- No profile found a published reuse license for Napper, Huckleberry, Baby Daybook, Nara Baby, Kinedu, BabyCenter or Peanut. Content from these products should be treated as proprietary.
- Pathways restricts use to personal, non-commercial purposes. Incorporating, translating or adapting requires written permission. The brochures say "COPY FREELY, DO NOT CHANGE, MUST ACKNOWLEDGE" [DOC PW06, PW18].
- Recommendation: original content, written from primary sources and reviewed by a registered professional. Details in [Development and content](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md).

## Open questions

1. Does Napper have tummy time on any plan? Confirming this requires opening "Track → Edit" in the installed app, which is outside the scope of this stage.
2. Does Pathways show who logged each event? How does it revoke a caregiver's access?
3. Are there relevant Brazilian competitors outside this list? The eight were defined by the task package.
4. Do Kinedu's groups still exist in 2026?
5. How do BabyCenter users solve including their partner? The answers were not captured.

## Limits of this analysis

- Public sources consulted on 22/10/2026. No product was observed in use.
- Store reviews are isolated reports [HIP]. Instagram and Reddit were only read through search snippets.
- The second check of Kinedu's Data safety was blocked (see the profile).
- Document written by the coordinator at 04:50, based on the profiles, after the delegated writer stopped due to a lack of response from the provider.

## Relationship to other documents

[Vision and scope](Visao_e_Escopo.md) · [Flows and screens](../02_Experiencia/Fluxos_e_Telas.md) · [Data model and permissions](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) · [Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) · [Development and content](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) · [ADR-001](../06_ADRs/ADR-001_Plataformas_e_Web.md) · [Home](../00_Inicio/Home.md)
