---
tipo: design-doc
status: proposal
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-11-03
tarefa: MAT-13
adr: ADR-008
fontes_principais:
  - 08_Referencias/Tecnologias/Precos_Datados.md
  - 08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md
  - 08_Referencias/Tecnologias/Mobile_e_Plataformas.md
  - https://supabase.com/pricing
  - https://www.powersync.com/pricing
  - https://expo.dev/pricing
  - https://developer.apple.com/programs/enroll/
  - https://support.google.com/googleplay/android-developer/answer/14151465
---

# Costs and operations

## Website (current direction)

Costs of the full website ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)), by phase. Supabase prices come from [Dated prices](../08_Referencias/Tecnologias/Precos_Datados.md), section 3, snapshot from 22/10/2026.

| Phase | Service | Cost | Source |
| --- | --- | --- | --- |
| Local development and occasional demo, no real data | GitHub Pages on a public repository | Free, to be confirmed | The vault has no dated source |
| Local development and occasional demo, no real data | Supabase Free | US$ 0; the project pauses after 1 week without use; price in the São Paulo region to be confirmed | Dated prices, section 3 (22/10/2026) |
| Pilot with real families | Supabase Pro | US$ 25/month; price in the São Paulo region to be confirmed | Dated prices, section 3 (22/10/2026) |

Section 6.1 of this document says: "Planos gratuitos não entram em produção nem em homologação contínua, porque pausam por inatividade." That is why Free is only suitable for the first phase.

The following sections describe the APP-001 architecture (previous direction) and serve as the basis for the port.

Cost scenarios and minimum operations for the proposed architecture: React Native + Expo and Set B (Supabase, PowerSync and domain service) ([Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md)).

All prices come from [Dated prices](../08_Referencias/Tecnologias/Precos_Datados.md), a snapshot of the official pages on 22/10/2026. Amounts are in USD, excluding taxes, IOF and currency exchange. A listed price is not a contract. **A free plan is not a production guarantee, and a personal AI subscription is not API credit.**

The scenarios of 100, 1.000 and 10.000 families are illustrative, not a demand forecast.

## 1. Cost per phase (previous direction)

| Phase ([Roadmap](../07_Roadmap/Roadmap_e_Proxima_Fatia.md)) | Proposed composition | Illustrative monthly cost | Notes |
| --- | --- | --- | --- |
| F1 Technical proof (MAT-17) | Local Docker stack (PostgreSQL, PowerSync Open Edition and service); Supabase Free and PowerSync Free only if the proof needs the cloud; EAS Free; Apple Developer | **~US$ 8**: Apple, US$ 99/year | The Supabase and PowerSync Free plans pause or deactivate after 1 week without use. EAS Free gives 15 iOS builds/month, in a low-priority queue ("90+ minutes" at peak). A physical iPhone costs from US$ 699 if the team does not have one; an old compatible device will do [HIP] |
| F2 to F4 Foundation and MVP | Cloud staging with paid plans; EAS Starter | **~US$ 110 to 150** | Requires Supabase Pro and PowerSync Pro to avoid pausing, plus the service and email. See section 2 |
| F5 Closed pilot (~100 families) | Production and staging | **~US$ 120 to 180 without PITR; ~US$ 220 to 280 with PITR** | I recommend PITR for sensitive data in production. The decision depends on the desired RPO/RTO (section 5) |
| Growth (~10.000 families) | Larger compute, more concurrent clients on PowerSync | **~US$ 250 to 350 without PITR and without EAS Update, with staging** | Add US$ 100 for PITR and up to US$ 85 for EAS Update above 3 thousand MAU on Starter |

Google Play charges US$ 25 one time, outside the monthly cost. A new personal account requires a closed test with 12 testers for 14 days ([answer 14151465](https://support.google.com/googleplay/android-developer/answer/14151465)). An organization account requires D-U-N-S (decision D3).

## 2. Composition of Set B

Set B in the pricing note uses Supabase and PowerSync, with no separate in-house service. The proposed architecture adds the domain service in a container, so this table adds its hosting.

| Item | 100 families | 1.000 | 10.000 | Source and assumption |
| --- | ---: | ---: | ---: | --- |
| Apple Developer (US$ 99/year) | 8,25 | 8,25 | 8,25 | Dated prices, section 1 |
| EAS Starter | 19 | 19 | 19 | Includes US$ 45 of build credit; above 3 thousand MAU, EAS Update is charged separately |
| Supabase Pro | 25 | 25 | 75 | US$ 25 base; at 10 thousand, Medium compute (+US$ 50) |
| PowerSync Pro | 49 | 49 | 79 | US$ 49 base; at 10 thousand, +US$ 30 per thousand concurrent clients above 1.000 |
| Email (Resend) | 0 | 20 | 20 | Free up to 3 thousand per month and **100 per day**; the daily limit can block invitation spikes |
| Domain service (container) | 7 to 25 | 7 to 25 | 25 to 85 | Fly.io 1 GB at US$ 6,70; Render 1 CPU/2 GB at US$ 25 and 2 CPU/4 GB at US$ 85 (US prices; availability and price in Brazil [NC]) |
| Push (FCM, APNs or Expo Push) | 0 | 0 | 0 | No per-message cost; Expo limits to 600/s per project |
| Database, file and PowerSync volume overages | 0 | 0 | ~12 | Breakdown just below the table [HIP] |
| **Subtotal** | **~108 to 126** | **~128 to 146** | **~238 to 298** | — |
| Supabase PITR (recommended) | +100 | +100 | +100 | 7 days of retention |
| Staging | +10 to 50 | +10 to 50 | +10 to 50 | Extra project on Supabase and extra instance on PowerSync [HIP] |
| EAS Update above 3 thousand MAU | 0 | 0 | +85 | 20 thousand MAU × US$ 0,005; the Production plan (US$ 199) may pay off |

**Overage breakdown at 10.000 families.** Calculated with the formulas in section 10.2 of [Dated prices](../08_Referencias/Tecnologias/Precos_Datados.md), in decimal GB:

- **Database:** 50 GB, US$ 5,25 above the 8 GB included.
- **Files:** 144 GB, US$ 0,94 above the 100 GB included. Since the proposed MVP has no photos, this item is overestimated.
- **PowerSync:** 11,25 GB hosted, US$ 1,25 above the 10 GB included. Monthly sync stays below the 30 GB allowance.
- **Reproducible sum:** ~US$ 7,44.
- **Remainder (~US$ 4,56):** this is the difference from the note's total (~US$ 186). It cannot be reproduced with the published formulas, and the original script was not kept. It remains as a conservative margin until the new price collection (section 3).

Assumptions of the pricing note [HIP]:

- 2 caregivers and 2 devices per family;
- 25 writes per family per day and 8 app opens per device per day;
- 0,5 KB per synced operation, a hosted window of 90 days, a peak of 10% of devices connected;
- 3 emails per family per month and 5 pushes per family per day;
- 4 photos per month per family. The proposed MVP has no photos, so this item is overestimated.

For comparison, the three sets in the pricing note (infrastructure plus EAS and Apple), without B's domain service:

| Set | 100 families | 1.000 | 10.000 |
| --- | ---: | ---: | ---: |
| A: Firebase | ~27 | ~35 | ~139 |
| B: Supabase + PowerSync | ~101 | ~121 | ~214 |
| C: Cloud Run + Cloud SQL + R2 | ~64 | ~109 | ~202 |

At these scales, the infrastructure difference between the sets is smaller than a few hours of engineering per month. Infrastructure cost should not decide the architecture [HIP; Dated prices, 10.5].

## 3. What has no confirmed price

| Item | Why it matters | Status |
| --- | --- | --- |
| Brazil regions (Supabase sa-east-1, PowerSync BR region, service hosting) | Care data would stay in Brazil (decision D2) | [NC]: repeat the price collection for São Paulo |
| Monitoring and crash reporting | Operations and incidents | [NC]: tool not chosen |
| Domain, DNS and public website | Privacy policy, account deletion via web link, support | [NC] |
| Backup copy outside the provider | Retention window longer than 7 days (section 5) | [NC] |
| Store commissions on subscriptions | Monetization (decision D6) | Not researched |
| Company incorporation, accounting and D-U-N-S | Decision D3 | Not surveyed |
| Content reviewer, moderators and legal counsel | Decision D5 | Not surveyed |
| Engineering and operations (hours) | Probably the largest cost at every scale [HIP] | Outside the calculation |
| Mac (only if the stack changes to Flutter, KMP or native) | ADR-002 | Mac mini from US$ 899; remote Mac from US$ 25/month; Codemagic with 500 free min/month |

## 4. AI: a subscription is not API credit

- The personal AI assistant subscriptions used in development (for example, Claude or ChatGPT) serve the person developing. They do not provide API credit for product features, nor do they cover usage by users.
- The proposed MVP has no generative AI responding to users ([ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)).
- If any AI feature is added later, it will have its own API cost, a contract with the vendor, an international transfer assessment and specific consent ([Privacy and security](Privacidade_e_Seguranca.md), section 4).

## 5. Backups and restore

- **What Supabase Pro offers:** daily backups with 7 days of access. PITR of 7 days costs US$ 100/month. The Team plan (US$ 599/month) gives 14 days. Backups do not include Storage objects ([Dated prices](../08_Referencias/Tecnologias/Precos_Datados.md), section 3).
- **Proposal for the pilot:** PITR of 7 days and a backup window of 7 days. A short window also helps with deletion: deleted data disappears from backups within 7 days.
- **Longer window:** only with an encrypted external copy, in a Brazil region, at a cost [NC]. The decision depends on the RPO and RTO that Daniel accepts.
- **Restore:** a recorded drill before the pilot and after each relevant schema change. After restoring, deletions are reapplied so that deleted data is not resurrected (Q-12).
- **PowerSync:** stores a replica and buckets; it is not the source of truth. After a database restore, it rebuilds itself from PostgreSQL [HIP, to be confirmed in the proof].

## 6. Minimum operations

### 6.1 Environments

Local (Docker on Windows), staging with fictitious data, and production, as per the [Proposed architecture, section 7](../03_Arquitetura/Arquitetura_Proposta.md). Free plans are not used in production or in continuous staging, because they pause due to inactivity.

### 6.2 Monitoring and alerts

| Signal | Why | Proposed alert |
| --- | --- | --- |
| Availability of the service and the upload endpoint | Without uploads, the queue grows on the devices | Failure for more than 5 minutes |
| Rejections and conflicts per hour | Version or permission defect | Deviation from the week's pattern |
| PowerSync replication lag | Caregiver B does not see A's entry | Above 1 minute [HIP] |
| App errors, without content | Quality | New crash in more than 1% of sessions [HIP] |
| Moderation queue | Community deadlines | Crisis item not triaged during the shift |
| Spending | Avoid surprises | Supabase spend cap enabled (it is the default on Pro); budget alerts on the others |

The thresholds are hypotheses to be calibrated in the pilot.

### 6.3 Support

- Email channel, with an address published on the website and in the app, plus a frequently asked questions page.
- Proposed target in the pilot: first response within 1 business day [HIP].
- Support does not access the family's space. If diagnosis is needed, the user themselves sends technical data without content. Emergency access, if it exists, follows the audit rule in [Privacy and security](Privacidade_e_Seguranca.md).

### 6.4 Moderation

The proposed operation is described in [Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) and in the [community research](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md):

- one or two part-time moderators, without access to family data;
- crisis triage within 1 hour during covered hours, and other reports within 24 hours;
- outside the shift, content with triggers stays hidden from the public until review.

The cost of people is decision D5.

### 6.5 Distribution

| Item | How | Cost and timeline |
| --- | --- | --- |
| iOS | EAS Build and EAS Submit from Windows; TestFlight for the pilot | Apple US$ 99/year; an organization account requires D-U-N-S |
| Android | EAS Build; Play testing tracks | US$ 25 once; new personal account: 12 testers for 14 days before production |
| JavaScript updates | EAS Update | Starter: 3 thousand MAU included, then US$ 0,005/MAU |
| Store technical requirements | Xcode 26+ since 28/04/2026; API 36 since 31/08/2026 ([Mobile and platforms](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md)) | Review at each annual store cycle |

### 6.6 Incidents and on-call

- Playbook and deadlines in [Privacy and security, section 11](Privacidade_e_Seguranca.md).
- With only one person operating, there is no continuous on-call coverage. This is an accepted risk in the pilot, which must be disclosed to participants [HIP].

## 7. Exit plan per vendor

| Vendor | Where to move | What makes it easier | Cost of leaving |
| --- | --- | --- | --- |
| Supabase (database and Auth) | Any managed PostgreSQL (RDS, Cloud SQL, Neon) and another identity provider | Standard PostgreSQL; schemas and policies versioned in the repository; in-house service holding the rules | Migrate accounts and change JWT issuance; email code login is simple to reproduce |
| PowerSync | Self-hosted PowerSync Open Edition, or in-house sync (Set C) | The upload contract (`POST /v1/sync/operacoes`) and the rules are ours ([Proposed architecture, section 9](../03_Arquitetura/Arquitetura_Proposta.md)) | Write the cursor-based pull and the in-house sync client |
| Expo / EAS | Local builds or another CI | The code is standard React Native | iOS without EAS requires a Mac or macOS CI |
| Email provider | Any SMTP or email API | Sending is isolated in the service | Low |
| Expo Push | FCM and APNs directly | They are already the underlying transport | Low |
| Service hosting | Any container platform | Container image | Low |

Users can also leave: full per-family export is part of the MVP ([Privacy and security, section 7](Privacidade_e_Seguranca.md)).

## 8. Cost risks

- **Free plan treated as production:** the Supabase and PowerSync Free plans pause or deactivate after 1 week without use.
- **PowerSync Pro ceiling:** by default, at most 3.000 concurrent clients and 100 GB hosted. Above that comes the Team plan (US$ 599+) or self-hosting.
- **EAS Update and OneSignal:** at 10 thousand families, they may add up to more than the entire backend.
- **Exchange rate:** all prices are in USD.
- **Firebase (only if Set A is chosen):** there is no automatic spending cap.

## 9. Open questions

1. What RPO and RTO should be accepted? This decides the PITR and the backup window.
2. What are the prices for the Brazil regions? Collect them before the foundation.
3. Which monitoring and crash reporting tool should be used, with content scrubbing?
4. Where should the domain service be hosted in Brazil, and at what price?
5. Who handles support and moderation in the pilot, and during what hours?

## Limits of this analysis

- Price snapshot from 22/10/2026 and invented assumptions for order of magnitude; nothing was measured.
- The domain service hosting cost was added by the coordinator, using US prices.
- People, legal and company costs were not surveyed.
- Document written by the coordinator, because the delegated writer stopped due to lack of response from the provider.

## Relationship to other documents

[Architecture comparison](../03_Arquitetura/Comparacao_de_Arquiteturas.md) · [Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md) · [Privacy and security](Privacidade_e_Seguranca.md) · [Quality and validation](Qualidade_e_Validacao.md) · [ADR-008](../06_ADRs/ADR-008_Documentacao_Operacao_Custos_e_Evolucao.md) · [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md)
