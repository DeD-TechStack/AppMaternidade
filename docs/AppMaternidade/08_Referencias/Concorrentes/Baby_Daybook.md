---
tipo: competitor-profile
status: draft
responsavel: Hermes (competitors subagent A)
revisado_em: 2026-10-22
produto: Baby Daybook
fontes_principais:
  - https://babydaybook.app/
  - https://babydaybook.app/premium/
  - https://apps.apple.com/us/app/baby-daybook-newborn-tracker/id1446283219
  - https://play.google.com/store/apps/details?id=com.drillyapps.babydaybook
  - https://babydaybook.app/apple-widgets-watch-app/
---

# Baby Daybook

Competitor profile for APP-001. All sources were accessed on 22/10/2026 (America/Sao_Paulo). The labels follow the [Vault conventions](../../00_Inicio/Convencoes.md): **[DOC]** indicates something stated on a website, store, or help page; **[HIP]** indicates a hypothesis, inference, or isolated report. Nothing was observed during use. Passages quoted in English are verbatim; Portuguese quotations from English sources are loose translations. Codes B01, B02… refer to the Sources table (at the end of the profile). Related profiles: [Napper](Napper.md), [Huckleberry](Huckleberry.md), and [Nara Baby](Nara_Baby.md).

## Resumo

- It is a general-purpose, highly configurable tracker. It allows users to create their own activity types, which is how **tummy time**, walks, and baths are included [DOC B01, B07, B08].
- It is the strongest of the four for logging outside the app. It has home screen and lock screen widgets, Live Activities, a persistent Android notification, Apple Watch, Wear OS, and Siri shortcuts [DOC B03, B04, B07].
- The free plan has ads on Google Play. Premium (monthly, annual, or lifetime) unlocks family sync, sleep predictions, unlimited history, growth charts, reminders, and PDF, and covers all of the baby's caregivers [DOC B02, B08].
- No community or educational content was found in the app [HIP: absent from official sources].

## Tummy time and development

**Tummy time: available as a customizable activity.**

- The store says: "Custom Activity Tracking – Track tummy time, outdoor walks, bath time & more" (App Store) and "Log tummy time, walks, playtime, bath time, and more" (Google Play) [DOC B07, B08].
- The website mentions "create custom types for anything else" [DOC B01].
- A review from 2024 confirms use for tummy time and "any other activity" [HIP B14].
- Development, in practice, means growth:
  - WHO/CDC **growth charts**, with charts for premature babies (corrected age since version 7.2.0) and for some chromosomal syndromes [DOC B06, B07];
  - **teeth**: eruption and loss [DOC B06];
  - **"Moments"**: photos in any event [DOC B06].
- No suggested activities by stage, milestones with content, or tummy time guide were found in the app [HIP: absent].

## Identificação

| Field | Value | Source |
| --- | --- | --- |
| Company | BALTAPIS UAB, Draugystės g. 17-1, Kaunas, Lithuania | [DOC B08, B11] |
| Website | https://babydaybook.app | [DOC B01] |
| Google Play | `com.drillyapps.babydaybook`: "Baby Daybook - Newborn Tracker" (in pt-BR, "Baby Daybook - Amamentação"). 1 million+ downloads. Rating 4,7 with 69,2 thousand reviews. **Contains ads** and in-app purchases. Updated on 14/10/2026 | [DOC B08, B09] |
| App Store | `id1446283219`: "Baby Daybook - Newborn Tracker". Version 7.3.1, displayed as "há 6 dias" on 22/10/2026. Medical category. Age rating 13+ | [DOC B07] |
| Platforms | Android and Wear OS (tiles and complications). iPhone, iPad, and iPod touch (iOS 15+). Mac with Apple Silicon (macOS 12+). Apple Vision. Apple Watch (watchOS 9+) | [DOC B07, B08, B04] |
| Languages | English and 39 more, including **Portuguese** | [DOC B07] |
| Price (US App Store) | Monthly Premium from US$ 1,99 to US$ 9,99 (several price points). Annual at US$ 9,99 or US$ 59,99. Lifetime at US$ 59,99 (–40%) or US$ 99,99 | [DOC B07] |
| Premium | Includes family sync, sleep predictions, statistics and a timeline with unlimited history, growth, reminders, and PDF export. Covers caregivers of the same baby and works on Android and iOS | [DOC B02] |

## Features by pillar

### Rotina

- Breastfeeding with a timer for each side (start, stop, and switch sides with one tap), pumping, bottle feeding, and solids with reactions [DOC B01, B07, B08].
- Diapers and potty training, with reminders [DOC B07, B08].
- Health: symptoms, temperature, medication, appointments, and vaccines, with vaccination statistics and PDF [DOC B07, B08].
- Also: daily timeline, statistics, searchable log (by type, word, date), photos in any activity, multiple babies, and dark mode [DOC B01, B07].
- PDF export of activities, growth, teeth, and vaccines [DOC B02, B07].

### Development, tummy time, activities, and content

See the "Tummy time and development" section above. Outside the app, the blog publishes articles by "Margarita Grigaliūnė", with a list of sources (for example, AAP). No stated professional review was seen [DOC B12].

### Comunidade

Not found [HIP: absent from official sources].

### Cuidado compartilhado

- "Add your partner or nanny to the caregivers list, so that everyone could input data" [DOC B01].
- Real-time "Family sync" appears as a Premium benefit. Premium purchased by one caregiver covers the others [DOC B02].
- Reviews report syncing through the partner's email with editing permission, and use by families with Android and iPhone [HIP B08, B14].
- No roles, different permissions, revocation, or display of authorship were found [HIP: absent].
- The release notes show recent work on syncing:
  - "Redesigned sync architecture for greater reliability, smoother realtime updates, and more efficient background syncing" (7.0.12 and 7.0.13, Jul–ago/2026);
  - "Fixed an issue that could add duplicate activities from the watch" (7.1.0, 19/ago).

  [DOC B07]

## Quick logging

- Home screen widgets in three sizes, some with buttons to start or stop an activity without opening the app (Android). Lock screen widgets on iOS [DOC B03, B04].
- **Persistent Android notification**: cannot be dismissed and allows activities to be started or stopped from the lock screen [DOC B04].
- Apple Watch and Wear OS: log, start, and stop activities, enter amounts, and view reminders, with automatic syncing. There are watch face complications. The watch app was "Google Play's Best of 2024" for watches, according to the website itself [DOC B03, B04].
- Siri Shortcuts: "Log activities using voice commands" [DOC B07]. One review says the exact commands need to be configured [HIP B14].
- Backdated logging and editing: stated in general terms ("record everything") [DOC B03]. The flow was not detailed in the sources.

## Activity in progress and timers

- **Live Activities** on iOS, on the lock screen and in the Dynamic Island: start, pause, resume, stop, and switch breastfeeding sides [DOC B03].
- On Android, timers are accessible through the persistent notification [DOC B04].
- Operation without a network connection: not described in the official sources consulted. Third-party articles claim it works offline [HIP B13]. The privacy policy mentions Firebase for authentication and cloud storage [DOC B11]. The existence of a local cache is an inference [HIP].

## History and predictions

- Timeline with days side by side and statistics by period (Premium for unlimited history) [DOC B01, B02].
- **Sleep predictions** (Premium): daily schedule on a timeline, with dashed boxes for predicted naps and bedtime. The schedule adjusts with each entry and allows users to choose the number of naps (schedule with 1 nap from 10 months, since version 7.2.0) [DOC B05, B07].
- The product's own caveat: "Our Sleep Predictions are designed to support you – not to replace your instincts […] it's just that: guidance" [DOC B05].
- The store mentions "expert-backed recommendations" without identifying the experts or sources [DOC B07]. There is no evidence of accuracy validation [HIP].

## Content by stage: authorship and review

- No educational content by stage was found in the app [HIP: absent].
- On the blog, articles have a named author and sources, but there is no stated reviewer in the article consulted [DOC B12].

## Community and moderation

Not applicable (no community found).

## Privacy

- Policy: https://babydaybook.app/privacy-policy/
  - uses **Firebase (Google)** for authentication, analytics, crash reporting, and storage;
  - data may be transferred outside the EU (including to the US) under standard contractual clauses;
  - lists rights of access, correction, deletion, and portability (GDPR/CCPA);
  - states that it does not sell data.

  [DOC B11]
- App Store label: there is no "used to track you" section. **Linked to you**: health, contact information, content, identifiers, usage, **sensitive information**, and diagnostics. **Not linked**: device ID [DOC B07].
- Google Play Data safety: **shares device ID for advertising and marketing**. Collects performance, app activity, personal data (optional), purchase history, and photos (optional). Data is encrypted in transit, and deletion can be requested [DOC B10].

## Strengths

- Comprehensive logging outside the app on Android and iOS, including watches on both platforms [DOC B03, B04].
- Customizable activities: tummy time and baths do not depend on the developer's predefined options [DOC B01, B07].
- Premium shared with caregivers and across platforms, with a lifetime option [DOC B02, B07].
- 40 languages, including Portuguese [DOC B07].
- Recent VoiceOver improvements on phones and watches (7.2.0) [DOC B07].

## Limitations and recurring complaints

- Ads on the free plan (stated on Google Play). An old report (2019) mentions an ad with sound during nighttime breastfeeding [DOC B08] [HIP B08].
- Features moved to a subscription: a longtime user says they lost access. The developer responds (2/jun) that previous Premium purchases should remain valid [HIP B14].
- Duplication from the watch and the syncing rewrite in 2026 show that syncing is a sensitive area [DOC B07].
- Content and community not found [HIP].

## What AppMaternidade can learn

- Customizable activities cover the long tail (baths, walks, physical therapy). Tummy time can have dedicated handling while still allowing custom types [DOC B01, B07].
- A persistent Android notification, with start and stop, is the practical equivalent of Live Activities and should be included in the timer design [DOC B04].
- Operation identifiers and deduplication should cover **all** entry points (watch, widget, notification), because duplication from the watch was a real defect [DOC B07].
- A subscription that covers the whole family reduces friction between caregivers [DOC B02].
- Write a short notice about the limits of sleep predictions ("guidance, not instinct replacement") [DOC B05].

## What not to copy

- Brand, name, icons, screens, store copy, and blog text.
- Ads in a childcare app and sharing device ID for advertising [DOC B08, B10].
- Removing features from existing purchasers when moving to a subscription (report) [HIP B14].

## Fontes

All accessed on: 22/10/2026.

| ID | Source | Evidence type | Visible platform/version |
| --- | --- | --- | --- |
| B01 | https://babydaybook.app/ | Official website | — |
| B02 | https://babydaybook.app/premium/ | Official website: Premium and FAQ | — |
| B03 | https://babydaybook.app/apple-widgets-watch-app/ | Official website: widgets, Live Activities, Apple Watch | iOS and watchOS |
| B04 | https://babydaybook.app/android-widgets-watch-app/ | Official website: widgets, persistent notification, Wear OS | Android and Wear OS |
| B05 | https://babydaybook.app/sleep-predictions/ | Official website: predictions with notice | — |
| B06 | https://babydaybook.app/development-tracker/ | Official website: growth, teeth, moments | — |
| B07 | https://apps.apple.com/us/app/baby-daybook-newborn-tracker/id1446283219 | Store: description, release notes 7.0.12–7.3.1, purchases, privacy label, languages | iOS 7.3.1; watchOS 9+ |
| B08 | https://play.google.com/store/apps/details?id=com.drillyapps.babydaybook&hl=en_US&gl=US | Store: description, ads, reviews, and responses | Android. Updated on 14/10/2026 |
| B09 | https://play.google.com/store/apps/details?id=com.drillyapps.babydaybook&hl=pt_BR&gl=BR | Store: listing in Brazil | Android |
| B10 | https://play.google.com/store/apps/datasafety?id=com.drillyapps.babydaybook&hl=en | Store: Data safety | Android |
| B11 | https://babydaybook.app/privacy-policy/ | Privacy policy | — |
| B12 | https://babydaybook.app/blog/formula-feeding-101-what-new-parents-actually-need-to-know/ | Official blog (25/09/2026) | — |
| B13 | https://pebbi.co/blog/baby-daybook-alternatives | Third-party article (competitor), search snippet only | — |
| B14 | https://apps.apple.com/us/app/baby-daybook-newborn-tracker/id1446283219?see-all=reviews&platform=iphone | User reviews and responses (2024–2026) | iOS |

## Open questions

- Is family sync Premium-only, or is there basic free syncing? The home page and Premium page do not make this clear.
- How does the app handle two caregivers editing the same entry? Does it show who logged it?
- Does the app work offline and upload later? Official documentation is missing.
- Do ads also appear in the free iOS version?

## Limits of this analysis

- Nothing was observed during use: no app was installed and no account was created.
- Offline support is reported only by third parties [HIP]. Only the relevant sections of the privacy policy were read.
- Reviews are anecdotal. Response dates without a year follow the App Store format and are presumed to be from the current year [HIP].
- Prices in USD, snapshot from 22/10/2026.
