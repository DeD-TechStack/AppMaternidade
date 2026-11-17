---
tipo: design-doc
status: proposal
responsavel: Hermes (APP-001 coordinator)
revisado_em: 2026-10-22
tarefa: MAT-11
adr: ADR-007
fontes_principais:
  - 08_Referencias/Pesquisa_Comunidade_e_Conteudo.md
  - 01_Produto/Concorrentes_e_Diferenciais.md
  - 08_Referencias/Repositorios/Bebbo.md
  - https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/back-to-sleep-tummy-to-play.aspx
  - https://www.cdc.gov/act-early/milestones/2-months.html
  - https://iris.who.int/items/677e3562-1deb-48ec-bb1e-4bc8aad3ea09
  - https://www.sbp.com.br/fileadmin/user_upload/20226d-DocCient_-_Sindrome_Morte_Subita_do_Lactente.pdf
---

# Development and content

> Note from 03/11/2026: the direction changed to a full website first and an Android and iOS port later ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)). Where this text talks about a native app, read it as the port; the website covers the same functions.

Proposal for the development pillar. It covers:

- tummy time in the routine;
- activities by stage;
- age and corrected age;
- when to seek a professional;
- origin, review, version and license of the content;
- offline distribution;
- the role of AI.

The numbers in square brackets, such as [10], refer to the sources of the [community and content research](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md), consulted on 22/10/2026. The codes N10, PN22 and PN24 refer to the source tables of the [Napper](../08_Referencias/Concorrentes/Napper.md) and [Peanut](../08_Referencias/Concorrentes/Peanut.md) profiles.

> **This is not clinical guidance.** The numbers appear as each source presents them. No text in this document goes into the app without review by a health professional registered with their professional council (decision D5).

## 1. Problem

- **They want to know what to do, and the sources diverge.** Caregivers want to know what to do with the baby at each stage and whether "está tudo bem". Health sources do not agree on how much tummy time to do (section 3.2).
- **The market turns development into pressure** ([Competitors and differentiators](../01_Produto/Concorrentes_e_Diferenciais.md); [Bebbo](../08_Referencias/Repositorios/Bebbo.md)):
  - Pathways: stars and "More is always better";
  - Kinedu: "Adiantado" labels and percentiles;
  - Bebbo: percentage of milestones with the label "Pending".
  - On Peanut, mothers report guilt for not meeting the one-hour goal [PN24].
- **Baby health content needs traceability:**
  - who wrote it, who reviewed it, with which sources and in which version;
  - quick withdrawal when there is an error;
  - offline operation, with the withdrawal reaching the device.
- **Most good sources cannot be reproduced** in an app that may have revenue (section 9).

## 2. Principles

1. **Record without pressuring:** tummy time is recorded, never turned into a goal.
2. **Reference with a range and a source,** never a single number as a target.
3. **Safety first:** awake and supervised; for sleep, always on the back.
4. **Stage as a wide window,** never a deadline. "Ainda não" is a neutral answer.
5. **"Quando procurar um profissional" is kept separate** from the activities, with a neutral tone.
6. **Own content in pt-BR,** reviewed by a registered professional, with authorship, sources and version visible.
7. **Versioned offline content,** with the withdrawal list processed before any other update.
8. **No generative AI answering families in the MVP** ([ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)).

## 3. Tummy time in the routine

### 3.1 Recording

- **Ways to record:**
  - a session with a timer (start and stop) or "fizemos", with optional duration;
  - a retroactive record with a chosen start and end.
- **Any caregiver** with a recording role can start or end the session, and the app stores who started it and who ended it ([Data model](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md); [Offline, sync and timers](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)).
- **Works without a network.** The session is an in-progress record saved on the device, and the time is calculated from the start time, not by a counter.
- **Neutral summary:** "hoje: 3 sessões, 12 min no total" [research 2.3].
- **Left out** [research 2.3]:
  - minute goal;
  - progress ring;
  - day streak;
  - duration badge;
  - "você não cumpriu hoje";
  - comparison with other babies.
- **Fixed text on the timer:** "Só com o bebê acordado e um adulto olhando. Se ele ficar com sono, coloque de barriga para cima no berço." [10][11][13]
- **If the baby gets uncomfortable,** the text suggests stopping or changing the activity [13][17]. Some babies do not like it at first, and that is expected [10].
- **Optional reminder,** off by default and with a neutral tone ("quer registrar o tummy time de agora?") [research 2.3].
- **Open point:** whether time lying on the tummy on the adult's lap or chest counts as tummy time. The AAP and the NHS include this position [10][12]; the WHO definition speaks of free movement of the limbs [21]. Decision for the professional reviewer.

### 3.2 What the sources say about quantity [DOC]

| Source | Amount | Note |
| --- | --- | --- |
| AAP, safe sleep 2022 [23] | "at least 15 to 30 minutes total daily by 7 weeks of age" | Increase gradually, awake and supervised |
| HealthyChildren.org (AAP), 08/09/2026 [10] | 2 to 3 times a day, 3 to 5 minutes; up to 15 to 30 min/day by 7 weeks | Start on the day the baby comes home |
| CDC, Learn the Signs. Act Early. [11] | No minutes | Focus on supervision and milestones |
| NHS, 09/03/2023 review [12] | "Little and often", no number | The scheduled review date (09/03/2026) has already passed |
| WHO, 2019 guideline [21] | At least 30 min/day, spread out, for those not yet mobile | Strong recommendation, with "very low" evidence (GRADE) |
| Pathways.org [13] | 15 to 30 min/day at 2 months; at least 60 min/day at 6 months | "More is always better" |
| SBP, Sleep Medicine [14][15] | "Não há consenso [...] qual o tempo e a frequência" | Prone only when awake and supervised; sleep on the back until 1 year |
| Ministry of Health, Physical Activity Guide (2021) [19] | Up to 1 year: at least 30 min/day, spread out | "de baixa a moderada" evidence |
| Ministry of Health, Early Intervention Guide (draft, 2025) [18] | At least 30 min/day, spread out | Preliminary document; final version not verified |

**Consequence for the product** [HIP; research 2.2]:

- no number becomes a goal;
- if the app shows a reference, it shows the range, the sources and the context;
- the reference is never used to calculate "atraso".

### 3.3 Optional reference

A "O que as fontes dizem sobre tummy time" content item, reviewed by the professional, with the simplified table and the links. It is accessible from the timer, but does not appear as "meta de hoje".

## 4. Activities by stage

- **Format:** "Ideias para brincar nesta fase", in overlapping age windows, with no task list, points, percentage completed or "atrasado" [research 2.7].
- **Optional "Fizemos",** without streaks. The history is visible only to the family and can be hidden. Each mark stores the `id` and the `versao` of the content used.
- **Caring language** [13][17][62]: change the activity if the baby cries, stop if the baby gets irritable, and pause to comfort.
- **Link with the community without exposing data** [research 2.7]:
  - "ver conversas sobre este tema" opens the community filtered by topic and, if the person wishes, by the age range calculated on the device;
  - "salvar ideia" copies the suggestion to the family, with no link to the author;
  - no routine data goes to the community without editing and a preview ([Community and moderation, section 5](Comunidade_e_Moderacao.md)).
- **MVP scope:** from 0 to 12 months ([Vision and scope](../01_Produto/Visao_e_Escopo.md)). Up to 24 months is the first expansion.

## 5. Age and corrected age

- **Age calculated on the device,** from the date of birth, in the family's time zone.
- **Premature babies:** corrected age from the expected due date, as Bebbo does in its growth curves and Pathways does in its milestones ([Bebbo](../08_Referencias/Repositorios/Bebbo.md); [Pathways](../08_Referencias/Concorrentes/Pathways.md)).
  - The content item indicates whether it takes corrected age into account (`considera_idade_corrigida`), with reviewed text.
  - Up to what age to apply the correction is a question for the reviewer.
- **Kept out of the community:** corrected age is sensitive information. It is used only in the local calculation and never appears in the community [research 1.9].
- **Content windows** in days or weeks, overlapping. They never say "deve fazer até" [research 2.6].

## 6. Milestones

- **Out of the MVP.** A milestone list with check-offs is not among the MVP requirements ([Vision and scope](../01_Produto/Visao_e_Escopo.md), RF-08 and RF-09).
- **In the MVP, a "o que observar nesta fase" text:**
  - written by the team and reviewed;
  - with links to the CDC and the Caderneta da Criança;
  - explaining that milestones are what 75% or more of children do by a certain age, and that the lists do not replace screening [11].
- **License limit:** the CDC does not allow the milestones to be edited when customizing the material [25]. Using the CDC list requires reproducing it unchanged, or else linking to it.
- **If it is added later:**
  - answers "já faz", "ainda não" and "não sei";
  - no percentage, no "Pending" (as in Bebbo), no "Adiantado" and no comparison (as in Kinedu);
  - "quando procurar" text always accessible, never triggered as a delay alert.

## 7. When to seek a professional

A dedicated section, separate from the activities, with a neutral tone, based on the CDC and Pathways [11][13] and reviewed by the professional:

- if the baby does not do what is expected for the stage, loses skills they already had, or there is any concern, talk to the pediatrician or the UBS [11];
- if the baby persistently does not tolerate tummy time, talk to the health professional [13];
- in an emergency, SAMU 192 [6].

The app never calculates diagnosis, risk or delay.

## 8. Content: origin, authorship and review

**Production:**

- own text in pt-BR, written from primary sources;
- review by a registered professional (pediatrician, physiotherapist or pediatric occupational therapist), with no declared conflict of interest (D5).

**What the family sees in each item:**

- author;
- reviewer, with name, profession, council, state and registration number;
- sources, with date;
- "versão N, revisado em DD/MM/AAAA";
- the "não substitui consulta" notice.

**Editorial cycle** [research 2.6]:

1. topic planning;
2. draft;
3. source checking;
4. technical review;
5. language review (plain pt-BR, no guilt, no jargon);
6. editorial approval;
7. publication with a version number;
8. monitoring by "reportar erro no conteúdo";
9. review on the scheduled date;
10. correction or withdrawal;
11. history.

Market references: the NHS shows "Page last reviewed" and "Next review due" [12]; the CDC shows publication and review dates [11]; HealthyChildren reviews periodically and bars reviewers with conflicts [30].

**Correction levels** [research 2.6]:

| Level | Example | Action |
| --- | --- | --- |
| Critical (safety) | Text that contradicts back sleeping | Withdraw immediately; the device processes the withdrawal before any other update; notice to anyone who opened the item |
| Important | Wrong age range or outdated source | New version with a change note |
| Minor | Typo | New minor version, no notice |

**Fields of an item** (full list in the research, section 2.6):

- **Identification:** `id`, `versao`, `status` (draft, in review, approved, published, withdrawn) and `tipo` (article, activity, safety tip, crisis script).
- **Text and scope:** title, summary and body in restricted Markdown; language; age range in days; `considera_idade_corrigida`; topics.
- **Responsibility:** authors; reviewers with credentials and a conflict-of-interest declaration; sources with consultation date; text and media licenses.
- **Notices:** about limits and about safety.
- **Lifecycle:** publication, review and next review dates; change note; withdrawal with reason.
- **Integrity:** media with alt text and credits; content hash.

The Content and Content Version entities are in [Data model, 3.3](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md).

## 9. Source licensing

| Source | Link and cite | Reproduce text | Images and videos |
| --- | --- | --- | --- |
| AAP / HealthyChildren.org | Yes | Not without written permission; the terms also prohibit using the content with AI tools without permission [29] | Not without permission |
| CDC | Yes; the CDC prefers linking [24] | Mostly public domain, with conditions: attribute, do not suggest endorsement, do not change the content [24]; milestones not editable [25] | Some restricted; the logo requires permission [24] |
| NHS | Yes | OGL v3.0, including for commercial use; translation counts as adaptation, which cannot be attributed to the NHS [26] | Images outside the OGL [26] |
| WHO (2019 guideline) | Yes | CC BY-NC-SA 3.0 IGO: non-commercial use only [21][22] | Logo not permitted |
| Pathways.org | Yes | Personal, non-commercial use only, absent written approval [27][28] | Same |
| SBP | Yes | "Todos os direitos reservados" [31] | Same |
| Ministry of Health | Yes | Check work by work [7][19] | Same |
| Bebbo (UNICEF) | Yes | Prohibited: commercial use, digital copies and modifications ([terms](https://www.bebbo.app/terms-and-conditions)) | Prohibited |

**Proposed rules** [research 2.5; confirm with legal]:

1. Always link the source and record the version and date.
2. Facts and recommendations may be rewritten in our own text, with citation. The expression (text, illustration, video) goes in only with a license.
3. Text, illustrations, videos, activity scripts and crisis messages are produced in-house.
4. No third-party logos, illustrations or videos without a written license.

## 10. Offline distribution

Proposal from the research (section 2.6) [HIP]:

1. **Content package with a manifest:** package version, minimum app version, items with `id`, `versao` and `hash`, and a withdrawal list. It is signed by the backend, and the first version comes bundled with the app.
2. **Sync in order:**
   1. downloads the manifest;
   2. **processes the withdrawal list first**;
   3. applies the updates as diffs;
   4. if something fails, keeps the last intact version.
3. **Separation:** the content is read-only on the device and kept apart from the family's data. It does not go into the family's sync buckets ([Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md)).
4. **On screen:** each item shows the version, the review date and the sources.

Bebbo shows the mechanism working: content bundled per language, incremental sync by date, and an endpoint for withdrawn items that deletes them from the local database ([Bebbo](../08_Referencias/Repositorios/Bebbo.md)).

## 11. AI

- **In the MVP, no generative AI answering families** (decision D4; [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)).
- **Why:**
  - the topic is baby health;
  - the market examples involve data and answers without a published safeguard: Napper's assistant uses the baby's data and first names and may send them to language model providers [N10], and "Ask Peanut" aggregates mothers' reports into answers [PN22];
  - the AAP's terms prohibit using its content with AI tools [29];
  - there are requirements for transparency and review of automated decisions (LGPD art. 20) and for international data transfer;
  - it has its own API cost, and a personal subscription does not count ([Costs and operations, section 4](../05_Privacidade_Operacao/Custos_e_Operacao.md)).
- **What remains allowed:** AI as an internal drafting tool for the editorial team, without user data and always with human and professional review before publishing. Its use is recorded in the item's editorial history [HIP].
- **What would change the decision:** criteria in "Quando revisar" of [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md).

## 12. Alternatives considered

| Alternative | For | Against | Status |
| --- | --- | --- | --- |
| Own text reviewed by a registered professional | Control of tone, clean license, pt-BR, traceable | Reviewer cost and timeline (D5) | **Recommended** |
| License ready-made content (AAP, Pathways) | Quality and reputation | Written permission, unknown cost, translation as adaptation; goal-oriented tone at Pathways | Not in the MVP |
| Partnership with an institution (university, medical society, public health) | Credibility and review | Timeline and governance | Candidate after the pilot |
| AI-generated content with review | Speed | Plausible errors, harder review, source restrictions [29] | Internal drafts only |
| Only links to external sources | Low cost | Does not work offline, leaves the app, sources in English | Complement, not foundation |

## 13. Consequences

- **Positive:**
  - reliable content with a tone consistent with DF-3;
  - clean license;
  - works offline;
  - quick withdrawal.
- **Negative:**
  - depends on specialized people from the outset;
  - less content at launch;
  - editorial cycle with an ongoing cost.

## 14. Proposed validation [HIP]

- **Tone test** with mothers, fathers and caregivers: comprehension of the text and sense of pressure.
- **Use in the pilot:**
  - tummy time sessions per family per week, only as an observation, never as a goal;
  - sessions ended by a different caregiver;
  - use of "ver conversas sobre este tema".
- **Editorial quality:**
  - items with overdue review (target: zero);
  - time to withdraw critical content on devices that came back online;
  - errors reported per item.
- **Technical test:** the content package with the withdrawal processed before the update is included in the scenarios in [Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md).

## 15. Open questions

1. Who reviews (pediatrician, physiotherapist or pediatric occupational therapist), with what credentials and at what cost (D5)?
2. Does time on the lap count as tummy time [10][21]?
3. Up to what age should corrected age be applied?
4. Will the milestone list be added later? With which sources, given the CDC rule [25]?
5. Caderneta da Criança, edition 7: check the text on babies lying on their tummy and on sleep, which was not accessed [60].
6. Early Intervention Guide: did the final version change the 30 min/day [18]?
7. Is it worth asking the AAP or Pathways for permission, or should everything be produced in-house?

## Limits of this analysis

- There is no clinical judgment. The numbers were reported as the sources present them, and some Brazilian sources were not accessed (the Caderneta da Criança and the Physical Activity Guide PDF).
- Nothing was tested with users.
- Document written by the coordinator, after two subagent attempts stopped without writing: `deleg_a7e0449c` at 04:54 and `deleg_c292f0ff`, interrupted at 05:25.

## Relationship to other documents

[ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md) · [Vision and scope](../01_Produto/Visao_e_Escopo.md) · [Flows and screens, 3.4](../02_Experiencia/Fluxos_e_Telas.md) · [Data model and permissions](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) · [Offline, sync and timers](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) · [Community and moderation](Comunidade_e_Moderacao.md) · [Competitors and differentiators](../01_Produto/Concorrentes_e_Diferenciais.md) · [Community and content research](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md)
