---
tipo: research
status: draft
responsavel: Hermes (community and content subagent)
revisado_em: 2026-10-22
fontes_principais:
  - Apple App Review Guidelines, section 1.2 (Last Updated 16/10/2026)
  - Google Play — User Generated Content and Child Safety Standards
  - AAP — Sleep-Related Infant Deaths, 2022 recommendations (Pediatrics) and HealthyChildren.org
  - WHO — guidelines on physical activity, sedentary behaviour and sleep for children under 5 years of age (2019)
  - CDC — Learn the Signs. Act Early. (milestones revised in 2022; pages reviewed in 2026)
  - NHS — baby activity and reuse terms (OGL v3.0)
  - Pathways.org — Tummy Time and terms of use
  - SBP — Scientific Department of Sleep Medicine; SPSP
  - Ministry of Health — Early Intervention Guide (draft under public consultation, 2025); Physical Activity Guide (2021); Child Health Handbook
  - STF — art. 19 of the Brazilian Internet Civil Rights Framework (ruling completed on 26/06/2025)
  - CVV 188, SAMU 192, Disque 100, Ligue 180
---

# Research — community, moderation, tummy time and editorial cycle

Reference note for APP-001. Informs the future [Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) and [Development and content](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) (both to be created) and ADR-006 (community format and moderation) and ADR-007 (educational content). Follows the [Conventions](../00_Inicio/Convencoes.md).

How to read:

- All external sources were accessed on 22/10/2026 (America/Sao_Paulo). Numbers in square brackets, such as [1], refer to the "Sources" section, just before the open questions. Each numbered source has a verbatim excerpt checked against the downloaded text.
- [DOC] indicates content stated in documentation, a website or a standard. [HIP] indicates a proposal or inference by Hermes, not yet validated with users, legal counsel or a healthcare professional.
- This note does not provide its own clinical guidance: it only reports what each source says, with a short quotation.
- Outside the scope of this note, handled by other agents: privacy, LGPD and general store requirements, in [Privacy, legal and store research](Pesquisa_Privacidade_Legal_e_Lojas.md); competitors, in [BabyCenter](Concorrentes/BabyCenter.md), [Peanut](Concorrentes/Peanut.md), [Kinedu](Concorrentes/Kinedu.md) and [Pathways](Concorrentes/Pathways.md); consolidated prices, in [Dated prices](Tecnologias/Precos_Datados.md); Bebbo's offline content, in [Bebbo](Repositorios/Bebbo.md). Some of these notes are still being written in parallel.

## Resumo

- **MVP format [HIP]:** asynchronous forum of topics and replies, with subject areas curated by the team and an optional age range tag on each topic. Initially: text only, no direct messages, no chat and no live rooms. Discussion circles remain listed as a later stage, with activation criteria; they have not been ruled out.
- **Minimum safety:** reporting with reasons, blocking and muting, moderation queue prioritizing crises and children, graduated actions with user notification, appeals, auditing, rules accepted before posting, limits for new accounts, pseudonymous public identity and a crisis protocol with CVV 188 and SAMU 192. Apple requires filtering, reporting with timely responses, blocking and published contact information [1]. Google Play requires acceptance of the terms, reporting and blocking within the app [2]. The STF now requires rapid removal of some types of serious content and self-regulation with due process [55].
- **Tummy time:** the sources agree that the baby must be awake and supervised and must always sleep on their back [11][23]. Those that address when to start recommend starting early and increasing gradually [23][12][13]. They differ on the amount. AAP: 15 to 30 min/day by 7 weeks [23]. WHO and Ministry of Health: at least 30 min/day for babies who are not yet mobile [21][18]. Pathways: at least 60 min/day at 6 months [13]. NHS: no number [12]. The SBP states that there is no consensus on duration and frequency [14]. None of these numbers should become a target in the app.
- **Licenses:** citing and linking are possible for all sources. Text may only be reproduced from CDC (public domain, with conditions) [24], NHS (OGL, but translation counts as adaptation) [26] and WHO (noncommercial use only) [21]. AAP, Pathways and SBP require permission [29][27][31]. The pt-BR text must be original content, with professional review.

---

## Part 1 — Community and moderation

### 1.1 What is known about parent communities

- An integrative review of 38 publications concluded that internet-based peer support provides emotional and informational support. Evidence of effectiveness was "inconclusive", but no harmful effects were reported in the reviewed studies [52]. The authors describe this support as a complement to, rather than a replacement for, professional support [52].
- A scoping review from King's College London (preprint revised in outubro de 2025) mapped the risks of online advice for parents of young children: information overload, conflicting recommendations, unreliable information and feelings of inadequacy arising from comparisons [53]. According to a study cited in it, 71% of parents sought information online, but only 26% always checked the sources [53].
- Interpretation [HIP]: the community has value as peer support. That value depends on three things: separating personal accounts from guidance, highlighting reviewed content and avoiding comparison mechanics.

### 1.2 Format comparison

| Format | Limited time and use during the night | Discovery and search | Moderation risks | Cost and operations | Technical requirements | Evidence from real products |
| --- | --- | --- | --- | --- | --- | --- |
| Topic and reply forum (asynchronous) | High: users read and reply when they can, with one hand; the question remains available for later replies [HIP] | High: topics remain searchable, and old replies answer recurring questions [HIP] | Misinformation persists if not corrected, but it can be corrected, pinned or hidden; harassment is less immediate than in real time [HIP] | Asynchronous queue with a response deadline; can start with a small team [HIP] | CRUD, search, optional push notifications; no real time | What to Expect organizes its community into forums (birth month and interest groups) [46][45]; Mumsnet Talk is an open forum with minimal intervention and report-based moderation [47] |
| Groups by stage or birth month | High when there is enough activity; with few people, it becomes an empty room [HIP] | Medium: fragments content across groups [HIP] | Reveals the birth month; encourages cliques and private groups that are hard to monitor [HIP] | Each group needs someone responsible for it [HIP] | Same as the forum, plus group membership | What to Expect: birth month groups [46], some managed by the team and others by members who own the group [45] |
| Group chat (real-time text) | Immediate company during the night, but requires being present; fast, unstructured conversation [HIP] | Low: continuous history that is hard to search [HIP] | High: real-time harassment, spam and grooming; direct messaging requires blocking [2] | Near-real-time moderation and scheduled coverage [HIP] | WebSocket, presence, push notifications; paid service or own infrastructure (Stream, Sendbird) [41][42] | Hypothesis: in Brazil, caregivers already use messaging groups; copying this format is unlikely to differentiate the product [HIP] |
| Audio or video rooms, scheduled facilitated circles | Support through voice, but depends on scheduling; available during the night only if a room is open [HIP] | None without recording or transcription, which in turn create a privacy issue [HIP] | Real-time harm cannot be filtered in advance; recording requires consent; a facilitator must be present [HIP] | Facilitator for each session and specific training. Peanut moderated its audio "Pods" with an internal team; the paid team that moderated the rest of the app (more than two dozen people) only received audio training just before launch [50] | WebRTC/SFU; services such as LiveKit and Agora [43][44] | Peanut launched audio rooms in 2021 [50] (current status not verified). Clubhouse cut more than half its staff in 2023; the founders wrote that it had become harder for many people "to fit long conversations into their daily lives" [54] |
| AMA or event with a professional | Good if asynchronous: questions collected beforehand and answers published afterward [HIP] | High: becomes a searchable topic [HIP] | Risk of treating an individual case as a consultation; requires professional verification and a notice about limits [HIP] | Professional's time, scheduling and facilitation [HIP] | Same as the forum, plus a badge and schedule | Mumsnet webchats follow rules such as "One question per member plus one follow-up", with team facilitation [49] |

Interpretation [HIP]:

1. For people with limited time who use the app during the night, the asynchronous format works better: a question asked at 3h gets an answer in the morning and remains useful to the next person.
2. Real-time formats require users and moderators to be present simultaneously. The Clubhouse case shows the problem of fitting long conversations into daily life [54]; the Peanut case shows that audio requires its own moderation training [50].
3. Discussion circles still have potential value (support, voice, connection). They are therefore included as a later stage, with activation criteria.

### 1.3 Recommended format and staged development [HIP]

| Stage | What is included | Criteria for advancing (thresholds calibrated in the pilot, not invented targets) |
| --- | --- | --- |
| 0. Foundation | **Superseded; see the note below the table.** Data model with public identity separate from the family group, topic, reply, report, moderation action and audit. Minimal web moderation panel | The topic and reply flow proves that the community does not read family data (fixed task package requirement: "Access to the community does not grant access to a child's private routine") |
| 1. Community MVP | Asynchronous forum in curated spaces: sleep, feeding, bathing, tummy time, routine organization, sharing care responsibilities, everyday difficulties. Optional age range tag on the topic. Search. Pinned topic in each space with reviewed content. Text only. No direct messages. First posts from new accounts undergo prior review | Time to first human reply; proportion of topics without replies; moderation deadline met for several consecutive weeks; reports per thousand posts; reversals on appeal; explicit requests for images, stages or live conversation. Measure in the pilot before setting thresholds |
| 2. Asynchronous expansion | Images with safeguards (section 1.4). Broad age range groups, only if there is enough activity. "Asynchronous circle": event topic with a time, theme and trained host. Asynchronous AMA with a verified professional | Image moderation working without delays; professional verification operating; enough activity to keep groups from being empty |
| 3. Live circles (audio) | Small, scheduled rooms, with a trained facilitator present, their own rules, no recording by default and an easy way to leave | Measured demand (interest list signups, attendance at asynchronous circles); team trained for audio; real-time crisis protocol; budgeted cost per minute [43][44] |
| 4. Chat or direct messaging | Only with strong demand and user blocking from the start [2] | Grooming and harassment risks accepted and mitigated; proven moderation capacity |

**Coordinator's note, after the independent review:** the stage breakdown was adjusted to the roadmap.

- **Foundation (MAT-18):** only proof of data separation, and only if it fits the schedule.
- **Community MVP (MAT-19):** reporting, moderation, auditing and panel.

Current rule in [Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md), section 4.

Record for ADR-006: live discussion circles have not been removed. They remain as stage 3, subject to the criteria above.

### 1.4 Minimum safety mechanisms in the MVP

| Mechanism | MVP proposal [HIP, unless otherwise indicated] | Basis |
| --- | --- | --- |
| Community rules | Mandatory acceptance before the first post; short rules in pt-BR, with examples (personal account vs. guidance; no diagnosis; no selling; no exposing third parties) | Google Play policy requires acceptance of the terms before posting UGC and a definition of what is prohibited [2] |
| Reporting with reasons | Suggested reasons: attack or harassment; dangerous health information; sexual content; exposure of a child; personal data; spam or selling; risk of self-harm (triggers the crisis route); other | Apple requires a reporting mechanism and timely response [1]; Google requires in-app reporting [2] |
| Blocking and muting | Blocking: the blocked person's content is hidden from the person who blocked them, and they cannot reply to or mention the person who blocked them. Muting: hides content without preventing interaction. Actions do not notify the other party. **Superseded:** the current rule is mutual blocking. Neither person sees or replies to the other's content ([Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md), section 7) | Blocking abusive users is required by Apple [1] and Google [2]; Discourse gives level 1 users the option to mute others [40] |
| Moderation queue | Priority 1: life-threatening risk and content involving children. Priority 2: harassment and personal data. Priority 3: misinformation and spam. Show the context and the author's community history, never family data | Package requirement: moderators do not read private child data |
| Actions | Hide pending review; remove; warn; temporary read-only mode; suspend; ban. Each action states the rule violated and the affected excerpt | The Santa Clara Principles call for notifying users of the reason and the rule applied [51] |
| Appeal | One review request per action, assessed by another person whenever possible, with a published deadline | Santa Clara: "meaningful opportunity for timely appeal", in the user's language [51]; the STF requires due process in self-regulation [55] |
| Auditing | Immutable record of who, when, which rule, which action and which content version. Restricted access. Retention to be defined with the privacy agent | Basis for a transparency report; the STF calls for annual reports on extrajudicial notices [55] |
| Automatic filters | List of terms in pt-BR (including crisis terms); hourly posting limit; links blocked for new accounts; first posts reviewed before appearing | Discourse restricts new accounts: at most 1 image, 2 links and 3 topics, and no attachments (defaults described in 2018 and configurable) [40] |
| Automatic moderation through an API (optional) | Only after privacy review and a data processing agreement; never as the sole final decision-maker | See section 1.8 |
| Pseudonymous public identity | Nickname and generic avatar; no visible link to name, city or family; the community account carries no baby data | What to Expect warns that usernames, avatars and posts are public and recommends avoiding personal data [45] |
| Photos of children | MVP without images. In stage 2: notice before upload; discourage showing the child's face; prohibit child nudity in any context, including bathing; remove metadata on the device; review the image before publication | Apple states that, when Location Services are enabled for Camera, coordinates are recorded in every photo and video [57]; the AAP points out the risk of exposing location and routine when sharing photos of children [59] |
| Crisis (self-harm, postpartum depression, violence) | See section 1.5 | [4][6][7] |
| Published contact information | Contact and reporting channel outside the community, always visible | Required by Apple [1]; the STF calls for accessible, permanent support channels [55] |
| Verified professional badge | Defer to stage 2. Requires checking professional council registration and identity, periodically renewing verification and defining the badge's scope | [HIP]; manual operating cost |
| Separation between personal accounts and guidance | Everything starts as "relato pessoal". Separate badges for "conteúdo revisado" (editorial team) and "profissional verificado: orientação geral, não substitui consulta". Fixed notice that the community does not provide healthcare | What to Expect requires a source for health information that does not come from personal experience [45]; Apple calls for reminding users to consult a doctor [1] |
| Minimum age | Open decision. What to Expect requires users to be 18 or older [45]. The ECA Digital also covers services that may be accessed by children and adolescents [56], and teenage mothers are part of the likely audience [HIP] | Refer to the privacy agent and legal counsel |

Minimum reporting flow [HIP]:

```
denúncia (motivo) ─► triagem automática (crise? criança? volume?) ─► fila priorizada
      │                         │
      │                  crise ─► mensagem de apoio ao autor com 188/192 + revisão humana prioritária
      ▼
ação (ocultar/remover/advertir/suspender) ─► aviso ao autor (regra + trecho) ─► apelação ─► decisão final
      └──────────────────────── tudo registrado na auditoria ────────────────────────┘
```

### 1.5 Crisis protocol and official channels [DOC + HIP]

Channels confirmed in official sources on 22/10/2026:

| Situation | Channel | What the source says |
| --- | --- | --- |
| Emotional distress, suicidal ideation | CVV, 188 | Free calls, 24 hours, from anywhere in the country; also provides support through chat and email [4]. Free national line implemented in cooperation with the Ministry of Health [5] |
| Urgent health issue or medical emergency | SAMU, 192 | Free service, 24 hours a day, 7 days a week [6] |
| Violence against women | Ligue 180 | Free calls, 24 hours, every day [9] |
| Violation of the rights of children and adolescents | Disque 100 | Operates 24 hours, including weekends and holidays; simply dial 100; children and adolescents are among the groups served [8] |

On postpartum depression, the Ministry of Health page says that it "is not a character flaw or a weakness" and that men can also develop it [7]. The listed signs include "thoughts of death or suicide" and "a sudden urge to harm or hurt the baby" [7]. Cases involving a risk of suicide or infanticide should be referred for hospitalization, and treatment is provided comprehensively and free of charge through SUS [7].

Proposed app behavior [HIP]:

1. Triggers: a report with the reason "risco de autolesão", crisis terms from the pt-BR list or a self-harm category from a moderation API, if adopted. The OpenAI API, for example, separates `self-harm`, `self-harm/intent` and `self-harm/instructions` [32].
2. For the author: a supportive, nonjudgmental message with 188 (phone, chat and email) and 192 for emergencies. No diagnosis. The message never says that the content "violou regras".
3. Visibility: personal accounts of distress remain visible if there is no immediate risk, with resources pinned below. Content that encourages or instructs self-harm is removed immediately. The STF included inducing, inciting and assisting suicide or self-mutilation among the content that providers must make unavailable immediately [55].
4. Outside covered hours: triggered content is hidden from the public, the author continues to see their own post and receives the resources, and human review takes place at the start of the shift.
5. Moderators are not clinicians: the response script must be written with a mental health professional and reviewed periodically.

Sexual content involving children [HIP + DOC]: immediate removal, preservation of evidence according to legal guidance and notification of the authorities. The STF included "sexual crimes against vulnerable persons, child pornography and serious crimes against children and adolescents" in the list requiring immediate removal [55]. OpenAI documentation asks that suspected child sexual abuse material not be sent to the moderation API [32]. If the app is classified in Google Play's "Social" category, the child safety standards policy requires published standards against child sexual abuse and exploitation, an in-app feedback channel, handling of abuse material, compliance with the law and a point of contact [3]. The policy applies whether or not children are among the users [3].

### 1.6 Minimum MVP operations [HIP]

- **Who moderates:** product team plus one or two trained part-time people, with no volunteers at the start. The moderator role grants no access to any family or child data.
- **Proposed deadlines (to validate in the pilot):** crises and children, triage within 1 hour during covered hours; other reports, within 24 hours. Reference: Mumsnet told the UK Parliament that it had a professional moderation team 7 days a week, 365 days a year, with an average response time of 1h26 and more than half of reports answered in under 15 minutes [48]. An MVP cannot reach this level; published hours, automatic hiding outside shifts, prior review of new accounts and the absence of real-time interaction compensate for this.
- **Hours:** publish coverage (for example, every day, from 8h to 22h). Outside those hours, the automatic rules in section 1.5 and temporary hiding after multiple reports from accounts with a history apply.
- **Minimum tools:** web panel with queue, context, actions, author history, message templates, auditing and evidence export; crisis script; metrics (time to first action, volume by reason, reversals on appeal).
- **Transparency:** simple periodic report. The STF provides for self-regulation with a notification system, due process and annual transparency reports [55].

### 1.7 Stores: requirements for user-generated content [DOC]

| Store | Version accessed | Requirements |
| --- | --- | --- |
| Apple, App Review Guidelines 1.2 | "Last Updated: October 16, 2026" [1] | Method for filtering offensive material; reporting mechanism with timely responses; blocking abusive users; published contact information [1]. Removing content that violates the rules is the developer's responsibility, and repeated failure may lead to removal of the app [1]. Section 1.4.1 calls for reminding users to consult a doctor before making medical decisions [1] |
| Google Play, UGC policy | Policy Center page, with no visible version date (accessed on 22/10/2026) [2] | Acceptance of the terms before posting; definition of prohibited content; ongoing moderation with in-app reporting and blocking of content and users; mandatory blocking in 1:1 features [2]. Continually failing to address complaints is a violation [2] |
| Google Play, child safety standards | FAQ accessed on 22/10/2026 [3] | Applies to apps in the "Social" and "Dating" categories and to anonymous or random chats [3]. The declared category (for example, "Parenting" or "Social") determines whether the policy applies; adopting these standards even outside its scope is prudent [HIP] |

Brazilian legal context, only flagged here without analysis: (a) in the ruling completed on 26/06/2025, the STF declared art. 19 of the Brazilian Internet Civil Rights Framework partially unconstitutional and established removal and self-regulation duties [55]; (b) the ECA Digital (Law 15.211/2025) applies to digital services directed at children and adolescents or that may be accessed by them [56]. The impact of both cases is left to the privacy, legal and stores agent and legal counsel.

### 1.8 Reference tools (without choosing a stack)

Prices in USD, snapshot as of 22/10/2026, excluding taxes. Consolidate in [Dated prices](Tecnologias/Precos_Datados.md).

| Tool | What it does | Price or condition | Privacy and fit [HIP, unless cited] |
| --- | --- | --- | --- |
| OpenAI Moderation (`omni-moderation-latest`) | Classifies text and images; does not classify audio | Free [32] | According to the data controls table, `/v1/moderations` does not use data for training and does not retain abuse monitoring logs [37]. It is still a third party abroad: requires a legal basis and contract |
| Azure AI Content Safety | Text and images | Free up to 5 thousand text records and 5 thousand images per month; Standard plan at US$ 0,38 per thousand text records (up to 1.000 characters each) and US$ 0,75 per thousand images [34] | Assess the processing region and terms |
| Google Cloud Natural Language, Text Moderation | Harm categories in text [35] | Unit of 100 characters [35]; the table shows a free tier up to 50 thousand units and US$ 5,00 in the next tier. Confirm the billing unit in the calculator | Same |
| Amazon Rekognition (`DetectModerationLabels`, Group 2) | Image moderation | The official Group 2 example charges US$ 0,0010 per image for the first million [39] | Only if images are included (stage 2) |
| Perspective API (Jigsaw) | Text toxicity | Shutdown announced: the service ends after 2026, with no migration support [33] | Do not adopt |
| Discourse | Forum software | GPL v2.0 or later license [38]. Managed hosting: Pro at US$ 100/month (5 staff seats, DiscourseConnect plugin) and Business at US$ 500/month (OpenID/OAuth2 SSO); a Free plan with 2 staff seats is available [36] | Useful as a reference for features (trust levels, flagging). Integrating it into a native app means a WebView or a custom API client, plus another database to keep separate from the family. In the MVP, a minimal custom module for topics, replies and reports seems more consistent; decision with the architecture agent |
| Stream Chat | Real-time chat | Free Build plan (1.000 MAU); Start at US$ 399/month billed annually or US$ 499 billed monthly, for 10 thousand MAU, with moderation and advanced filters [41] | Only from stage 4 onward |
| Sendbird Chat | Real-time chat | Starter (5 thousand MAU) at US$ 349/month billed annually or US$ 399 billed monthly; the page lists features such as a profanity filter (availability by plan to be checked) [42] | Only from stage 4 onward |
| LiveKit Cloud | Audio and video rooms (WebRTC) | Build at US$ 0 with 5 thousand WebRTC minutes; Ship from US$ 50/month with 150 thousand minutes and then US$ 0,0005 per minute [43] | Stage 3 |
| Agora RTC | Voice, video and live streaming [44] | From US$ 0,59 per thousand minutes; 10 thousand free minutes per month [44] | Stage 3 |

### 1.9 Stage filtering without revealing the birth date [HIP]

1. The birth date stays only in the family space. The client locally calculates a **broad range** ("0–3 meses", "4–6 meses", "7–12 meses", "1–2 anos") and sends only the range to the community. The community service never receives the date.
2. The range is an **optional tag per topic**, frozen at the time of publication and editable or removable by the author. A range that updated itself would allow the date to be inferred from the changes.
3. The "minha fase" filter is calculated on the device and works as a reading preference, without becoming a public profile attribute.
4. Groups by birth month and year, such as those on What to Expect [46], reveal more. If groups by period are introduced, use broad windows (quarter or half-year) and only with enough activity.
5. A premature baby's corrected age is sensitive information: use it only in the local calculation, never display it in the community.
6. Media, from stage 2 onward: remove EXIF and location on the device before upload (coordinates are recorded in every photo [57]), re-encode the image, store it in a dedicated community repository separate from family attachments, serve it through a signed URL and never automatically reuse attachments from family records.

---

## Part 2 — Tummy time, activities and editorial cycle

### 2.1 What the sources say about tummy time [DOC]

| Source (version) | Start | Frequency and duration | Supervision and sleep | When to seek a professional |
| --- | --- | --- | --- | --- |
| AAP, 2022 safe sleep recommendations (Pediatrics) [23] | Shortly after discharge, for short periods [23] | Increase gradually: "at least 15 to 30 minutes total daily by 7 weeks of age" [23] | Awake and supervised; "Back to sleep for every sleep" [23] | Does not address this. In the text extracted from Table 2, the item appears in the level A block; check the formatted version. The AAP notes that there are no randomized trials on sudden death, and that case-control studies are the best available evidence [23] |
| HealthyChildren.org (AAP, updated on 08/09/2026; on the website, "9/8/2026") [10] | On the day the baby comes home [10] | 2 to 3 times a day, 3 to 5 minutes; increase as the baby shows enjoyment, up to 15 to 30 minutes per day at 7 weeks [10] | "Closely supervised"; sleep on the back, including naps [10] | Some babies do not like it at first [10]; does not replace the pediatrician [10] |
| CDC, Learn the Signs. Act Early. (2, 4 and 6 months; updated on 16/5/2026) [11][61][62] | Does not specify | No minutes | Baby on their tummy while awake, with toys at eye level; never alone; if drowsy, place on their back in a safe sleep space [11] | Milestones are what 75% or more of children do by a certain age [11]: 2 months, holds head up when on tummy [11]; 4 months, pushes up onto forearms [61]; 6 months, rolls from tummy to back and pushes up with straight arms [62]. They do not replace validated screening; if the baby does not reach milestones, loses skills or there is a concern, "act early" and talk to the doctor [11] |
| NHS (last reviewed on 9/3/2023; next review due on 9/3/2026) [12] | From birth, on the adult's chest, if the adult is fully awake [12] | "Little and often" at first, increasing day by day; no number [12] | Only with the baby awake and alert, and an adult watching [12] | Does not address this. As of 22/10/2026, the scheduled review date had already passed |
| WHO, 2019 guideline [21][20] | Does not specify | For babies who are not yet mobile: at least 30 minutes on their tummy per day, spread out, while awake [21]; not restrained for more than 1 hour at a time [20] | Awake [21] | "Strong recommendation", with "very low" overall evidence quality (GRADE) for physical activity [21]. Benefits: motor development and lower likelihood of plagiocephaly [21]. About 30% of babies in studies from Canada and Australia already met the recommendation [21] |
| Pathways.org [13] | When the baby comes home from the hospital [13] | Sessions of 2 to 5 minutes a few times a day; at least 15 to 30 min/day at 2 months and at least 60 min/day at 6 months; "More is always better" [13] | Stop if the baby becomes upset; if they fall asleep, turn them onto their back [13] | If the baby does not reach expected skills or persistently does not tolerate tummy time, talk to the healthcare professional [13] |
| SBP, Scientific Department of Sleep Medicine [14][15] | Does not specify | "There is no consensus [...] on duration and frequency" [14]; the note summarizing AAP 2022 mentions "30 minutes at seven weeks of age" [15] | Prone position while awake and supervised [14]; always sleep on the back until one year of age [15] | Does not address this |
| SPSP (affiliated with SBP) [16][17] | Short periods after discharge [16] | Up to 15 to 30 minutes per day from seven weeks onward [16] | Always awake and supervised [16]; "When the baby cries, the activity should be changed" [17] | Does not address this |
| Ministry of Health, Physical Activity Guide (2021, described in RBAFS) [19] | Does not specify | Up to 1 year: at least 30 min/day on the tummy, spread out [19] | Not detailed in the excerpt | Evidence quality "low to moderate", according to the rationale table [19] |
| Ministry of Health, Early Intervention Guide from 0 to 3 years (draft under public consultation, 2025) [18] | "from the first month of life" [18] | 0–3 and 4–11 months: at least 30 min/day spread out, while awake [18] | Awake and supervised [18] | It is a preliminary document; the final version was not verified |
| Child Health Handbook, revised edition 7 (2025) [60] | — | — | — | Edition listed by the Ministry [60]. The PDF on BVS was blocked in this session (HTTP 503), and the content was not checked |

### 2.2 Differences between sources

1. **Amount:** AAP, 15 to 30 min/day by 7 weeks [23]. WHO and Ministry of Health, 30 min/day or more for babies who are not yet mobile [21][18]. Pathways, 60 min/day or more at 6 months, with the motto "more is always better" [13]. NHS, no number [12]. SBP, no consensus [14].
2. **What counts as tummy time:** the AAP suggests laying the baby on the adult's chest as tummy play [10], and the NHS starts with the chest [12]. The WHO definition refers to being on the tummy while awake "with unrestricted movement of limbs" [21]. Counting time being held as tummy time is a product choice that requires professional review [HIP].
3. **Strength of evidence:** WHO makes a strong recommendation with very low evidence [21]; the Brazilian Guide records low to moderate evidence [19]; the SBP does not specify a duration [14].
4. **Consequence for the product [HIP]:** do not choose a number as a target. If the app shows a reference, show the range, source and context, and do not use the reference to calculate delay.

### 2.3 What must not become a target or source of pressure [HIP]

- Minutes per day as a goal, progress ring, streak, duration badge or "você não cumpriu hoje".
- Comparisons between babies or families, rankings or percentiles, in the community or activities.
- Milestones as a pass-or-fail test, or the word "atrasado". For the CDC, milestones are what 75% or more of children do, and the checklists do not replace screening [11].
- Guilt-inducing reminders. Reminders, if any, are optional and neutral ("quer registrar o tummy time de agora?").
- "Recommended" hours of sleep as a daily target.
- Instead: optional recording, a neutral summary ("hoje: 3 sessões, 12 min no total") and a reminder to stop if the baby becomes uncomfortable [13][17]. The "quando conversar com o pediatra ou a UBS" section stays separate, with a neutral tone and based on the sources [11][13].

### 2.4 Safe sleep in the tummy time experience [HIP, derived from DOC]

- The timer shows the fixed text: "Só com o bebê acordado e um adulto olhando. Se ele ficar com sono, coloque de barriga para cima no berço." Basis: [11][13][10].
- No feature, text or image suggests sleeping on the tummy. Original photos and illustrations do not show pillows or loose objects in the crib, following sleep environment recommendations [10][15].
- Ending a session by any caregiver and retrospective recording follow the D5 session model; they do not belong in this note.

### 2.5 Content licensing by source

| Source | Citing and linking | Reproducing text | Images and videos | Notes |
| --- | --- | --- | --- | --- |
| AAP / HealthyChildren.org | Yes [HIP: short quotation with source] | Not without prior written permission [29] | Not without permission [29] | The terms also prohibit using the content with AI tools without express permission [29] |
| CDC | Yes; the CDC prefers linking to republication [24] | Most is public domain, with conditions: attribute, state that there is no endorsement, do not change the substantive content and state that the material is available free of charge [24] | Some third-party images and resources have restrictions; the CDC logo requires permission [24] | When customizing LTSAE, do not edit milestones or use CDC or HHS logos [25] |
| NHS | Yes | OGL v3.0 license, including commercial use, with attribution and updating rules [26] | Images and personal data (identifiable people) are outside the OGL [26] | Translation counts as adaptation: adapted content cannot be attributed to the NHS [26], and adaptation may invalidate clinical approval [26] |
| WHO (2019 guideline) | Yes | CC BY-NC-SA 3.0 IGO license: noncommercial use only, with citation and sharing under the same license [21][22] | Use of the WHO logo is not permitted [21] | If the app is commercial, do not reproduce; rewrite with citation [HIP] |
| Pathways.org | Yes | Personal noncommercial use; no for-profit use without written approval [27]; permission form [28] | Same [27] | Pathways states that its milestones are based on CDC and AAP and undergo expert review [28] |
| SBP | Yes | "All rights reserved" [31]; request permission | Same | — |
| Ministry of Health / gov.br | Yes | The portal page states "©2025 - Ministry of Health \| All rights reserved" [7]. Publications usually have their own license in the cataloging data; check each work individually [HIP] | Same | The RBAFS article describing the Physical Activity Guide is CC BY 4.0 [19] |

Proposed rules [HIP, confirm with legal counsel]:

1. **Always:** link to the source, quote a short excerpt in quotation marks with author and date, and record the source version and date in the content.
2. **Facts and recommendations** (for example, "30 minutes per day, spread out") may be rewritten in original wording with citation. Their expression (text, illustration, layout, video) requires a license.
3. **Original production required** for: pt-BR screen and article text, position illustrations, videos, activity scripts and crisis messages. Everything undergoes review by a professional registered with their professional council.
4. **Do not use** third-party logos, illustrations or videos without a written license, or "translate and publish" AAP, Pathways or WHO material in a commercial app.

### 2.6 Proposed editorial cycle [HIP]

Market examples: the NHS displays "Page last reviewed" and "Next review due" [12], and the CDC displays publication, update and expert review dates [11]. HealthyChildren reviews all content periodically, prevents reviewers with conflicts of interest from reviewing the article and submits translations to pediatricians who are native speakers of the language [30].

Stages: topic planning → draft (author) → source checking → technical review by a credentialed professional with no declared conflict → language review (plain pt-BR, without guilt or jargon) → editorial approval → publication with version number → monitoring ("reportar erro no conteúdo" button) → review on the scheduled date → correction or withdrawal → history.

Correction levels:

| Level | Example | Action |
| --- | --- | --- |
| Critical (safety) | Text that contradicts back sleeping | Withdraw immediately; the device processes the withdrawal list before any other update; user notice |
| Major | Wrong age range or outdated source | New version with a change note |
| Minor | Typo | New minor version, without a notice |

Minimum fields for a content item:

| Field | Note |
| --- | --- |
| `id` | Stable across versions |
| `versao` | Increasing integer or semver; plus `versao_anterior` |
| `status` | draft, under review, approved, published, withdrawn |
| `tipo` | article, activity, safety tip, crisis script |
| `titulo`, `resumo`, `corpo` | Restricted Markdown, without arbitrary HTML |
| `idioma`, `localidade` | pt-BR, BR |
| `faixa_etaria_inicio_dias`, `faixa_etaria_fim_dias` | Overlapping windows; never "deve fazer até" |
| `considera_idade_corrigida` | Boolean, with reviewed text |
| `temas` | Link the item to community spaces |
| `autores` | Name and role |
| `revisores` | Name, profession, council, state and registration number, review date, conflict declaration |
| `fontes` | Organization, title, URL, source version or date, access date and type (guideline, consensus, official document) |
| `licenca_texto`, `licencas_midia` | Original production, CC or permission, with credits for each media asset |
| `aviso_de_limites` | E.g.: "não substitui consulta" |
| `avisos_de_seguranca` | E.g.: "somente acordado e supervisionado" |
| `publicado_em`, `revisado_em`, `proxima_revisao` | Show "review overdue" internally once the date has passed |
| `nota_de_mudanca`, `nivel_de_correcao` | Readable history |
| `retirado_em`, `motivo_retirada` | Tombstone visible offline after synchronization |
| `midias` | id, alt text, transcript, checksum, credits |
| `hash_conteudo` | Package integrity |

Offline versioning [HIP]:

1. Content package with a manifest (package version, minimum app version, list of items with `id`, `versao` and `hash`, plus the withdrawal list), signed by the backend. The first version is bundled with the app for use without a network.
2. During synchronization, the app downloads the manifest (with conditional caching), processes the withdrawal list first, then differential updates, and keeps the last intact version if the update fails.
3. Each item shows "versão N, revisado em DD/MM/AAAA" and the sources.
4. Editorial content is read-only on the device and separate from family data. Activities marked as done store `id` and `versao` of the content used.
5. Compare with Bebbo, which offers offline access to content; see [Bebbo](Repositorios/Bebbo.md).

### 2.7 Activities by stage without competition [HIP]

- Present as "ideias para brincar nesta fase", in overlapping windows, without a task list. No points, completion percentage or "atrasado".
- Caring language, based on the sources: change the activity if the baby cries [17]; stop if they become upset [13]; read the baby's mood and take a break to comfort them when they are upset [62].
- Optional recording ("fizemos"), without streaks. The history is visible only to the family and can be hidden.
- The "quando conversar com o profissional" section stays separate from activities and uses the wording from CDC and Pathways [11][13], with referral to the pediatrician or primary healthcare unit (UBS) and to SAMU 192 for emergencies [6].
- Connection with tummy time and the community without exposing data:
  - from the activity to "ver conversas sobre este tema": opens the community filtered by topic and, if the person wishes, by the range calculated on the device (section 1.9);
  - from the community to "salvar ideia": copies the suggestion to the family's list, without a link to the author;
  - from the routine to the community: only through an explicit editor, with a preview of exactly what will be published. Routine numbers are never attached automatically, and nothing is included by default;
  - the public profile has no link to the baby or family.
- The community's "Tummy time" space has a pinned topic with reviewed content and the safe sleep notice.

### 2.8 Sleep estimates (outside the main scope)

- WHO cites 14 to 17 hours (0–3 months) and 12 to 16 hours (4–11 months) of good-quality sleep, including naps [20]. The Ministry of Health draft repeats these ranges [18].
- The AASM recommends 12 to 16 hours for 4–12 months and makes no recommendation for babies under 4 months, because of wide normal variation and insufficient evidence [58]. This is a difference for the 0–3-month age range.
- Assumptions for any estimate in the app [HIP]: show a population range with a source, never a target; nap prediction only as an estimate based on recorded history, with a notice that missing records and individual variation affect the result; no alarm based on total hours; no clinical promise.

## Fontes

All accessed on 22/10/2026.

- [1] Apple — App Review Guidelines (Last Updated: October 16, 2026). <https://developer.apple.com/app-store/review/guidelines/>
- [2] Google Play Console Help — User Generated Content (policy). <https://support.google.com/googleplay/android-developer/answer/9876937?hl=en>
- [3] Google Play Console Help — Learning more about our Child Safety Standards policy. <https://support.google.com/googleplay/android-developer/answer/14747720?hl=en>
- [4] CVV — Call 188. <https://cvv.org.br/ligue-188-3/>
- [5] CVV — About CVV (who we are). <https://cvv.org.br/o-cvv/>
- [6] Ministry of Health — Mobile Emergency Medical Service (SAMU 192). <https://www.gov.br/saude/pt-br/composicao/saes/samu-192>
- [7] Ministry of Health — Postpartum depression (Health A to Z). <https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/d/depressao-pos-parto>
- [8] gov.br — Report human rights violations (Disque 100). <https://www.gov.br/pt-br/servicos/denunciar-violacao-de-direitos-humanos>
- [9] Ministry of Women — Ligue 180, Women's Support Center. <https://www.gov.br/mulheres/pt-br/ligue180>
- [10] HealthyChildren.org (AAP) — Back to Sleep, Tummy to Play (Last Updated 9/8/2026). <https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/back-to-sleep-tummy-to-play.aspx>
- [11] CDC — Important Milestones: Your Baby By Two Months (Learn the Signs. Act Early.). <https://www.cdc.gov/act-early/milestones/2-months.html>
- [12] NHS — How to keep your baby or toddler active. <https://www.nhs.uk/baby/babys-development/play-and-learning/keep-baby-or-toddler-active/>
- [13] Pathways.org — Tummy Time: Essential Guide for Parents. <https://pathways.org/topics-of-development/tummy-time>
- [14] SBP — Scientific Document 'Sudden Infant Death Syndrome' (Scientific Department of Sleep Medicine). <https://www.sbp.com.br/fileadmin/user_upload/20226d-DocCient_-_Sindrome_Morte_Subita_do_Lactente.pdf>
- [15] SBP — Alert Note 'AAP recommendations on safe sleep for children under one year' (Scientific Department of Sleep Medicine, 2022-2024 term). <https://www.sbp.com.br/fileadmin/user_upload/23990b-NotaAlerta-Recomend_AAP_SonoSeguro_1ano.pdf>
- [16] SPSP (affiliated with SBP) — Stay Up to Date, Child Safety (Scientific Department of Safety). <https://www.spsp.org.br/publicacao/AtualizeA11N1.pdf>
- [17] SPSP — Scientific Document on physical activity and stimulation by age. <https://spsp.org.br/PDF/AtividadeFi%CC%81sicacompletookgrupo1junho.pdf>
- [18] Ministry of Health — Early Intervention Guide: from 0 to 3 years (preliminary document/draft under public consultation, 2025). <https://www.gov.br/saude/pt-br/acesso-a-informacao/participacao-social/consultas-publicas/2025/guia-de-intervencao-precoce-de-0-a-3-anos-de-idade/documento-preliminar-minuta>
- [19] RBAFS 2021 — Physical activity for children up to 5 years: Physical Activity Guide for the Brazilian Population (DOI 10.12820/rbafs.26e0213). <https://rbafs.org.br/RBAFS/article/download/14563/11171/57773>
- [20] WHO — To grow up healthy, children need to sit less and play more (24/04/2019). <https://www.who.int/news/item/24-04-2019-to-grow-up-healthy-children-need-to-sit-less-and-play-more>
- [21] WHO (2019) — Guidelines on physical activity, sedentary behaviour and sleep for children under 5 years of age (PDF, IRIS). <https://iris.who.int/server/api/core/bitstreams/60a1cbaa-2bef-4251-9557-e52ce22112b3/content>
- [22] WHO IRIS — 2019 guideline record (CC BY-NC-SA 3.0 IGO license). <https://iris.who.int/items/677e3562-1deb-48ec-bb1e-4bc8aad3ea09>
- [23] AAP (Moon, Carlin, Hand) — Sleep-Related Infant Deaths: Updated 2022 Recommendations (Pediatrics 2022;150(1):e2022057990). <https://publications.aap.org/pediatrics/article/150/1/e2022057990/188304/Sleep-Related-Infant-Deaths-Updated-2022>
- [24] CDC — Use of Agency Materials. <https://www.cdc.gov/other/agencymaterials.html>
- [25] CDC — Learn the Signs. Act Early.: Customization, Translations, and Ordering Online. <https://www.cdc.gov/act-early/resources/customization.html>
- [26] NHS website — Terms and conditions (OGL v3.0 license and reuse rules). <https://www.nhs.uk/our-policies/terms-and-conditions/>
- [27] Pathways.org — Terms of Use. <https://pathways.org/terms-of-use>
- [28] Pathways.org — Baby Experts Page (content use and review). <https://pathways.org/baby-experts-page>
- [29] AAP — Terms of Use (applicable to HealthyChildren.org). <https://www.aap.org/en/pages/terms-of-use/>
- [30] HealthyChildren.org — Editorial Policy. <https://www.healthychildren.org/English/Pages/Editorial-Policy.aspx>
- [31] SBP — portal (copyright footer). <https://www.sbp.com.br/>
- [32] OpenAI API — Moderation guide (omni-moderation-latest). <https://developers.openai.com/api/docs/guides/moderation>
- [33] Perspective API (Jigsaw/Google) — FAQ / shutdown notice. <https://www.perspectiveapi.com/faq/>
- [34] Microsoft Azure — Content Safety pricing. <https://azure.microsoft.com/en-us/pricing/details/content-safety/>
- [35] Google Cloud — Natural Language API pricing (Text Moderation). <https://cloud.google.com/natural-language/pricing>
- [36] Discourse — hosting plans (prices). <https://www.discourse.org/pricing>
- [37] OpenAI API — Data controls in the OpenAI platform. <https://developers.openai.com/api/docs/guides/your-data>
- [38] Discourse — GitHub repository (license). <https://github.com/discourse/discourse>
- [39] AWS — Amazon Rekognition pricing. <https://aws.amazon.com/rekognition/pricing/>
- [40] Discourse Blog — Understanding Discourse Trust Levels (2018). <https://blog.discourse.org/2018/06/understanding-discourse-trust-levels/>
- [41] Stream — Chat pricing. <https://getstream.io/chat/pricing/>
- [42] Sendbird — Chat pricing. <https://sendbird.com/pricing/chat>
- [43] LiveKit Cloud — pricing. <https://livekit.io/pricing>
- [44] Agora — pricing overview. <https://www.agora.io/en/pricing/>
- [45] What to Expect — Community Guidelines. <https://www.whattoexpect.com/community-guidelines>
- [46] What to Expect — Help/FAQ (community and birth month groups). <https://www.whattoexpect.com/home/help-landing.aspx>
- [47] Mumsnet — Talk Guidelines. <https://www.mumsnet.com/i/netiquette>
- [48] UK Parliament — Written Evidence Submitted by Mumsnet (OSB0031), Draft Online Safety Bill. <https://committees.parliament.uk/writtenevidence/39118/pdf/>
- [49] Mumsnet — Webchats & Live Events (Q&A forum). <https://www.mumsnet.com/talk/mumsnet_live_events>
- [50] TechCrunch (27/04/2021) — Social networking app for women, Peanut, adds live audio rooms. <https://techcrunch.com/2021/04/27/social-networking-app-for-women-peanut-adds-live-audio-rooms/>
- [51] The Santa Clara Principles on Transparency and Accountability in Content Moderation (2.0). <https://santaclaraprinciples.org/>
- [52] Niela-Vilén et al. (2014) — Internet-based peer support for parents: A systematic integrative review (Int J Nurs Stud). <https://www.sciencedirect.com/science/article/abs/pii/S0020748914001667>
- [53] Salazar de Pablo & Scott (KCL, rev. out/2025) — Hazards of Online Advice for Parents of Young Children: A Scoping Review (preprint). <https://www.kcl.ac.uk/ioppn/assets/hazards-of-online-parenting-kcl-revision-9-october-2025-1-002.pdf>
- [54] Fortune (28/04/2023) — Clubhouse cuts more than half its staff. <https://fortune.com/2023/04/28/clubhouse-layoffs-cuts-more-than-half-its-staff/>
- [55] STF — Rulings of special relevance 2025: platform liability (art. 19 of the Brazilian Internet Civil Rights Framework), ruling completed on 26/06/2025. <https://portal.stf.jus.br/textos/verTexto.asp?servico=jurisprudenciaPesquisaGeral&pagina=casos_notorios_2025>
- [56] Ministry of Justice — ECA Digital (Law 15.211/2025). <https://www.gov.br/mj/pt-br/assuntos/sua-protecao/sedigi/eca-digital/eca-digital-1>
- [57] Apple Support — Manage location metadata in Photos (Personal Safety User Guide). <https://support.apple.com/guide/personal-safety/manage-location-metadata-in-photos-ips0d7a5df82/web>
- [58] AASM (Paruthi et al., J Clin Sleep Med 2016) — Recommended Amount of Sleep for Pediatric Populations. <https://aasm.org/resources/pdf/pediatricsleepdurationconsensus.pdf>
- [59] AAP Center of Excellence on Social Media — Sharing Photos and Videos of Children on Social Media ('Sharenting'). <https://www.aap.org/en/patient-care/media-and-children/center-of-excellence-on-social-media-and-youth-mental-health/qa-portal/qa-portal-library/qa-portal-library-questions/sharing-photos-and-videos-of-children-on-social-media/>
- [60] Ministry of Health/SAPS — Handbooks and Cards (list of Child Health Handbook editions). <https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/cadernetas-e-cartoes>
- [61] CDC — Important Milestones: Your Baby By Four Months. <https://www.cdc.gov/act-early/milestones/4-months.html>
- [62] CDC — Important Milestones: Your Baby By Six Months. <https://www.cdc.gov/act-early/milestones/6-months.html>

---

## Open questions

1. **Minimum age in the community:** requiring users to be 18 or older, as What to Expect does [45], excludes teenage mothers and fathers. How can this be reconciled with the ECA Digital [56]? Left to the privacy agent and legal counsel.
2. **Store category:** "Parenting" or "Social" on Google Play? The choice determines whether the child safety standards policy applies [3].
3. **Operations:** who moderates in the pilot, during which hours and with what budget? Are the 1h and 24h deadlines feasible?
4. **Images:** should they be included only in stage 2 (recommendation), or does the MVP need them for tummy time to be useful in the community?
5. **Moderation through a third-party API:** is the benefit worthwhile, considering international transfer and a data processing agreement? Which provider?
6. **Content about distress:** keep visible with resources or hide pending review? The script needs a mental health professional.
7. **Professionals:** manual verification with professional councils, compensation for AMAs and ethical limits. The Code of Medical Ethics (CFM Resolution 2.217/2018) has rules on consultations and prescriptions through communication media; the CFM portal did not respond in this session, and the text needs to be checked.
8. **Child Health Handbook, revised edition 7 (2025):** check the text on babies lying on their tummy and sleep, which was not accessed [60].
9. **Early Intervention Guide:** find out whether the final version has been published and whether it changed the draft's 30 min/day [18].
10. **Licenses:** request permission from AAP or Pathways, or produce everything internally? Who reviews it (pediatrician, physical therapist or pediatric occupational therapist) and with what credential?
11. **Time being held:** does it count as tummy time in the record? Depends on professional review, because of the difference in definitions between sources [10][21].

## Limits of this analysis

- Sources accessed on 22/10/2026; pages, policies and prices change. Prices in USD, excluding taxes and currency conversion.
- Inaccessible in this session: BVS/Ministry of Health PDFs (Child Health Handbook edition 7 and Physical Activity Guide, HTTP 503 block), CFM portal (timed out) and BabyCenter pages (extraction denied; topic assigned to the competitors agent). The Physical Activity Guide was read through the RBAFS article that describes it [19].
- In AAP 2022, the tummy time recommendation level came from text extracted from Table 2 [23]; check the formatted PDF before citing the strength of the recommendation.
- This note contains no legal opinion. The STF rulings [55] and the ECA Digital [56] were only flagged.
- This note contains no clinical judgment. The numbers were reported as each source presents them.
- Product evidence comes from documentation and the press (TechCrunch, Fortune), not from our own measurements. The current status of Peanut's Pods was not verified.
- The King's College review [53] is a preprint.
- The format recommendation and stages are hypotheses: no research with caregivers was conducted at this stage.
