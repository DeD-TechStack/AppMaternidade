---
tipo: technology-research
status: draft
responsavel: Hermes (data and backend subagent)
revisado_em: 2026-10-22
fontes_principais:
  - https://cloud.google.com/firestore/pricing
  - https://firebase.google.com/pricing
  - https://supabase.com/pricing
  - https://www.powersync.com/pricing
  - https://expo.dev/pricing
  - https://developer.apple.com/programs/enroll/
  - https://cloud.google.com/run/pricing
  - https://developers.cloudflare.com/r2/pricing/
---

# Dated prices (snapshot from 22/10/2026)

This note lists prices and limits displayed on official pages on 22/10/2026 (America/Sao_Paulo). Amounts are in USD, excluding taxes, IOF, or currency conversion. A price on a page is not a contract. **A free plan is not a production guarantee.** **A personal AI subscription is not API credit.**

The technical analysis that uses these figures is in [Data, synchronization, and backend](Dados_Sincronizacao_e_Backend.md). Conventions are in [Conventions](../../00_Inicio/Convencoes.md).

Notes legend:
- **[NC]**: price not confirmed in this round (dynamic table not captured or not checked).
- **[HIP]**: estimate or inference.

## 1. Stores and build

| Item | Plan | Displayed price/limit | URL | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| Apple Developer Program | Annual | "99 USD per membership year"; "Prices may vary by region" | https://developer.apple.com/programs/enroll/ | 22/10/2026 | A waiver may be available for nonprofits, educational institutions, and government. Required for distribution through TestFlight/App Store [HIP: not rechecked in this round]. |
| Google Play Console | Registration | "US$25 one-time registration fee" | https://support.google.com/googleplay/android-developer/answer/6112435 | 22/10/2026 | May require an ID document and a card in the legal name. The fee is not refunded if the details are invalid. New personal accounts have a testing requirement (see the other subagent's note). |
| Expo EAS | Free | US$ 0; 15 Android + 15 iOS builds/month; low-priority queue; updates for 1 thousand MAU | https://expo.dev/pricing | 22/10/2026 | The low-priority queue may have a wait of "90+ minutes" at peak times. |
| Expo EAS | Starter | US$ 19/month + usage; US$ 45 in build credit; priority queue; updates for 3 thousand MAU | https://expo.dev/pricing | 22/10/2026 | Individual builds: Android US$ 1 (medium) / US$ 2 (large); iOS US$ 2 / US$ 4. Updates above 3 thousand MAU: US$ 0,005/MAU (tier 3.001–200.000). Bandwidth 100 GiB, then US$ 0,10/GiB. |
| Expo EAS | Production | US$ 199/month + usage; US$ 225 in credit; updates for 50 thousand MAU; priority support | https://expo.dev/pricing | 22/10/2026 | Storage 1 TiB included. |
| Expo EAS | Enterprise | Contact for pricing; starting at US$ 1.000 in credit | https://expo.dev/pricing | 22/10/2026 | — |

## 2. Firebase and Google Cloud

| Item | Plan | Displayed price/limit | URL | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| Firebase | Spark | No cost, no payment method | https://firebase.google.com/pricing | 22/10/2026 | No Cloud Storage (402/403). Email link login limited to 5 emails/day. Not viable for the app in production. |
| Firebase | Blaze | Pay-as-you-go; no-cost quotas still apply | https://firebase.google.com/pricing | 22/10/2026 | Requires a billing account. There is no automatic spending cap (budget alerts do not block spending) [HIP: not rechecked]. |
| Firestore Standard (us-central1 displayed) | Free quota | 1 GiB stored; 50.000 reads/day; 20.000 writes/day; 20.000 deletes/day; 10 GiB/month of egress | https://cloud.google.com/firestore/pricing | 22/10/2026 | "No free quota for named databases": only the `(default)` database has a quota. |
| Firestore Standard | Usage | Read US$ 0,03/100 per thousand; write US$ 0,09/100 per thousand; delete US$ 0,01/100 per thousand; TTL US$ 0,01/100 per thousand | https://cloud.google.com/firestore/pricing | 22/10/2026 | A listener disconnected for > 30 min rereads as a new query. Minimum of 1 read per query. `get()`/`exists()` in rules incur read charges (https://firebase.google.com/docs/firestore/pricing). São Paulo price [NC]. |
| Firestore Standard | Storage/backup | Data US$ 0,000205479/GiB-hour (≈ US$ 0,15/GiB-month); PITR, same price; backup US$ 0,000041096/GiB-hour (≈ US$ 0,03/GiB-month); restore and clone US$ 0,20/GiB | https://cloud.google.com/firestore/pricing | 22/10/2026 | Network egress above 10 GiB follows the Google Cloud network pricing table [NC: exact rate not captured]. |
| Firebase Authentication | Spark and Blaze | 50 thousand MAU at no cost; SAML/OIDC 50 MAU | https://firebase.google.com/pricing | 22/10/2026 | Email limits: login link 5/day on Spark, 25.000/day on Blaze (https://firebase.google.com/docs/auth/limits). |
| Identity Platform (above 50 thousand MAU) | Tier 1 (email, social, anonymous) | 0–50 thousand: free; 50 thousand–100 thousand: US$ 0,0055/MAU; 100 thousand–1 million: US$ 0,0046/MAU | https://cloud.google.com/identity-platform/pricing | 22/10/2026 | Tier 2 (SAML/OIDC): US$ 0,015/MAU above 50. SMS per message: Brazil US$ 0,02 (the first 10/day are not charged). |
| Cloud Storage for Firebase | Blaze (required) | Buckets `*.firebasestorage.app`: no cost up to 5 GB-month, 100 GB/month of downloads, 5 thousand uploads and 50 thousand downloads/month; then, Cloud Storage pricing table | https://firebase.google.com/pricing | 22/10/2026 | Free quotas only in us-central1, us-west1, and us-east1. Legacy buckets `*.appspot.com`: 5 GB, then US$ 0,026/GB; 1 GB/day of downloads, then US$ 0,12/GB. |
| Cloud Functions (via Firebase) | Blaze | 2 million invocations/month free, then US$ 0,40/million; 400 thousand GB-s; 200 thousand CPU-s; 5 GB of egress, then US$ 0,12/GB | https://firebase.google.com/pricing | 22/10/2026 | Cloud Build: 120 min/day free. |
| Firebase Cloud Messaging | All | "No-cost" | https://firebase.google.com/pricing | 22/10/2026 | InstanceId and device groups APIs shut down on 29/09/2027. |
| Cloud Run | Request-based (Tier 1) | Active CPU US$ 0,000024/vCPU-s; memory US$ 0,0000025/GiB-s; US$ 0,40/million requests; minimum instance idle cost US$ 0,0000025 | https://cloud.google.com/run/pricing | 22/10/2026 | Free/month: 180 thousand vCPU-s, 360 thousand GiB-s, 2 million requests. Egress: 1 GiB/month free in North America, then network pricing table. |
| Cloud Run | Instance-based | US$ 0,000018/vCPU-s; US$ 0,000002/GiB-s | https://cloud.google.com/run/pricing | 22/10/2026 | Free: 240 thousand vCPU-s, 450 thousand GiB-s. |
| Cloud SQL for PostgreSQL | Enterprise (us-central1) | vCPU US$ 0,0413/h; memory US$ 0,007/GiB-h; HA costs twice as much. Shared: db-f1-micro US$ 0,0105/h; db-g1-small US$ 0,035/h | https://cloud.google.com/sql/pricing | 22/10/2026 | Shared instances "are not covered by the Cloud SQL SLA". SSD US$ 0,000232877/GiB-h (≈ US$ 0,17/GiB-month), HA US$ 0,000465753; backup US$ 0,000109589/GiB-h (≈ US$ 0,08/GiB-month). New customers: US$ 300 in credits. |
| Cloud Storage (GCS) | Standard (us-central1) | US$ 0,000027397/GiB-h (≈ US$ 0,020/GiB-month); Class A US$ 0,005/thousand; Class B US$ 0,0004/thousand | https://cloud.google.com/storage/pricing | 22/10/2026 | Egress to "Worldwide": US$ 0,12/GiB (0–10 TiB). Always Free: 5 GB-month, 5 thousand Class A and 50 thousand Class B, only in US regions. São Paulo [NC]. |

## 3. Supabase

| Item | Plan | Displayed price/limit | URL | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| Supabase | Free | US$ 0; 50 thousand MAU; 500 MB database; shared CPU with 500 MB of RAM; 5 GB of egress + 5 GB cached; 1 GB of files | https://supabase.com/pricing | 22/10/2026 | **"Free projects are paused after 1 week of inactivity. Limit of 2 active projects."** No automatic backups (Pro/Team/Enterprise only). Default SMTP: 2 messages/hour and only to the team. |
| Supabase | Pro | Starting at US$ 25/month; 100 thousand MAU, then US$ 0,00325/MAU; 8 GB disk/project, then US$ 0,125/GB; 250 GB of egress, then US$ 0,09/GB; 250 GB cached, then US$ 0,03/GB; 100 GB of files, then US$ 0,0213/GB | https://supabase.com/pricing | 22/10/2026 | Daily backups with 7 days of access; 7 days of logs. US$ 10/month in compute credit (covers one Micro). Extra projects starting at US$ 10/month. Spend cap enabled by default. |
| Supabase | Team | Starting at US$ 599/month | https://supabase.com/pricing | 22/10/2026 | SOC 2 and ISO 27001; "HIPAA available as paid add-on"; 14 days of backups; 28 days of logs. |
| Supabase compute | Add-on | Micro US$ 10 (1 GB); Small US$ 15 (2 GB); Medium US$ 60 (4 GB); Large US$ 110 (2 dedicated vCPUs, 8 GB); XL US$ 210 | https://supabase.com/pricing | 22/10/2026 | Amounts per project/month. |
| Supabase PITR | Add-on | US$ 100/month for 7 days of retention | https://supabase.com/pricing | 22/10/2026 | Not available on Free. Backups do not include Storage objects (https://supabase.com/docs/guides/platform/backups). |
| Supabase Realtime | Pro | 500 peak connections, then US$ 10/thousand; 5 million messages, then US$ 2,50/million | https://supabase.com/pricing | 22/10/2026 | Free: 200 connections and 2 million messages. |
| Supabase Edge Functions | Pro | 2 million invocations, then US$ 2/million | https://supabase.com/pricing | 22/10/2026 | Free: 500 thousand. |
| Supabase extras | Pro | Custom domain US$ 10/month; log drain US$ 60/drain + US$ 0,20/million events; phone MFA US$ 75/month; image transformation: 100 free, then US$ 5/thousand | https://supabase.com/pricing | 22/10/2026 | — |

## 4. Synchronization layers

| Item | Plan | Displayed price/limit | URL | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| PowerSync Cloud | Free | US$ 0; 2 GB synced/month; 500 MB hosted; 50 concurrent clients at peak; 2 instances | https://www.powersync.com/pricing | 22/10/2026 | **"Free projects are deactivated after 1 week of inactivity."** 24 h of logs. |
| PowerSync Cloud | Pro | Starting at US$ 49/month; 30 GB synced, then US$ 1/GB; 10 GB hosted, then US$ 1/GB (max. 100 GB by default); 1.000 concurrent clients, then US$ 30 per thousand (max. 3.000 by default); 2 instances, then US$ 25/month each | https://www.powersync.com/pricing | 22/10/2026 | No deactivation. 7 days of logs. |
| PowerSync Cloud | Team | Starting at US$ 599/month; hosting up to 500 GB; 10 thousand clients (configurable to 50 thousand+) | https://www.powersync.com/pricing | 22/10/2026 | 30 days of logs. The page lists a SOC 2 report and "HIPAA compliance available" in the feature grid (exact plan [NC]). |
| PowerSync self-host | Open Edition | No license fee (FSL-1.1-ALv2) | https://docs.powersync.com/intro/self-hosting | 22/10/2026 | The cost is your own infrastructure: service + bucket storage database (Postgres or MongoDB). Contact for Enterprise Self-Hosted pricing. |
| Electric Cloud | PAYG | US$ 1 per million writes; US$ 0,10/GB-month of retention; reads, egress, and fan-out free | https://electric.ax/pricing | 22/10/2026 | Accounts below US$ 5/month are exempt. Pro US$ 249/month (−10%); Scale US$ 1.999/month (−20%). Electric does not perform writes. |
| Cloud Zero | — | No confirmed public price | https://zero.rocicorp.dev/docs/cloud-zero | 22/10/2026 | Access through a form; the 2026 roadmap anticipates "full public availability" [NC]. |

## 5. Hosting and managed PostgreSQL

| Item | Plan | Displayed price/limit | URL | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| Render | Workspace | Hobby US$ 0; Pro US$ 25/month; Scale US$ 499/month; contact for Enterprise pricing | https://render.com/pricing | 22/10/2026 | Included bandwidth: 5 GB (Hobby), 25 GB (Pro), 1 TB (Scale). |
| Render | Web service | Free (with limitations); 0,5 CPU/512 MB US$ 7/month; 1 CPU/2 GB US$ 25/month; 2 CPU/4 GB US$ 85/month | https://render.com/pricing | 22/10/2026 | SSD US$ 0,25/GB-month. |
| Render Postgres | Instance | Free (with limitations); 256 MB US$ 6/month; 1 GB US$ 19/month; 1 CPU/2 GB US$ 40/month; 1 CPU/4 GB US$ 55/month; 2 CPU/4 GB US$ 75/month | https://render.com/pricing | 22/10/2026 | Storage US$ 0,30/GB. PITR listed. "Logical backup for paid instances". |
| Railway | Plans | Free US$ 0 (US$ 1 in credit/month); Hobby US$ 5/month (includes US$ 5 of usage); Pro US$ 20/month (includes US$ 20 of usage) | https://docs.railway.com/reference/pricing/plans | 22/10/2026 | Usage: RAM US$ 10/GB-month; CPU US$ 20/vCPU-month; egress US$ 0,05/GB; volume US$ 0,15/GB-month. 30-day trial with US$ 5. |
| Fly.io | Machines | shared-cpu-1x: 256 MB US$ 2,19/month; 512 MB US$ 3,69; 1 GB US$ 6,70. shared-cpu-2x 2 GB US$ 13,39 | https://docs.fly.io/about/pricing | 22/10/2026 | Volume US$ 0,15/GB-month. Egress US$ 0,02/GB (North America/Europe) and US$ 0,04/GB (South America). Standard support US$ 29/month. |
| Fly.io | Managed Postgres | US$ 38/month (Basic) to US$ 1.922/month | https://docs.fly.io/about/pricing | 22/10/2026 | Storage US$ 0,28/GB-month. |
| Neon | Free | US$ 0; 100 CU-horas/project; scale-to-zero after 5 min; 1 GB/project; restore up to 6 h or 1 GB of changes; 5 GB of egress | https://neon.com/pricing | 22/10/2026 | Free with no card and no time limit. Not a production guarantee. |
| Neon | Launch | US$ 0,106/CU-hora; US$ 0,35/GB-month; history US$ 0,20/GB-month; restore up to 7 days | https://neon.com/pricing | 22/10/2026 | "Typical spend: $15/mo". Up to 16 CU. |
| Neon | Scale | US$ 0,222/CU-hora; US$ 0,35/GB-month; restore up to 30 days | https://neon.com/pricing | 22/10/2026 | "Typical spend: $701/mo". |
| Amazon RDS for PostgreSQL | On-demand | db.t4g.micro US$ 0,016/h; db.t4g.small US$ 0,032/h (Single-AZ); Multi-AZ db.t4g.micro US$ 0,032/h | https://aws.amazon.com/rds/postgresql/pricing/ | 22/10/2026 | Table region not identified in the extracted text [NC]. gp2/gp3 US$ 0,115/GB-month. Backup at no cost up to 100% of database storage, then US$ 0,095/GiB-month. Free Tier: 750 h/month for 12 months for new customers. |
| Cloud SQL / Cloud Run | — | See section 2 | — | — | — |
| Supabase (as Postgres) | — | See section 3 | — | — | — |

## 6. Autenticação

| Item | Plan | Displayed price/limit | URL | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| Supabase Auth | Free/Pro | 50 thousand MAU (Free); 100 thousand MAU (Pro), then US$ 0,00325/MAU | https://supabase.com/pricing | 22/10/2026 | Experimental/beta passkeys. Requires your own SMTP in production. |
| Firebase Auth | Spark/Blaze | 50 thousand MAU at no cost; above that, Identity Platform | https://firebase.google.com/pricing | 22/10/2026 | See section 2. |
| Clerk | Hobby | Free; "50,000 MRU limit per app" | https://clerk.com/pricing | 22/10/2026 | MRU = monthly retained user, according to the page. |
| Clerk | Pro | US$ 20/month with annual billing; 50 thousand MRU included, then US$ 0,02/MRU | https://clerk.com/pricing | 22/10/2026 | Monthly price without annual billing [NC]. |
| Auth0 | Free | US$ 0; up to 25 thousand MAU | https://auth0.com/pricing | 22/10/2026 | Passkeys and passwordless included in all plans. |
| Auth0 | Essentials (B2C) | US$ 35/month for up to 500 MAU | https://auth0.com/pricing | 22/10/2026 | Professional US$ 240/month. Contact for higher tiers ("Custom Tiers"). |
| Amazon Cognito | Lite/Essentials | Free tier of 10 thousand MAU (direct + social) with no expiration; Essentials US$ 0,015/MAU above that | https://aws.amazon.com/cognito/pricing/ | 22/10/2026 | Plus US$ 0,020/MAU. SAML/OIDC: 50 MAU free. Lite has a cheaper tiered pricing table [NC: full tiers]. |

## 7. Push

| Item | Plan | Displayed price/limit | URL | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| FCM (HTTP v1) | — | No cost | https://firebase.google.com/pricing | 22/10/2026 | Data payload up to 4 KB. |
| APNs | — | No per-message pricing table; included in Apple Developer Program membership [HIP] | https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns | 22/10/2026 | .p8 key; token renewed at least hourly. |
| Expo Push Service | — | "There is no cost"; limit of 600 notifications/s per project | https://docs.expo.dev/push-notifications/faq/ | 22/10/2026 | at-least-once delivery. Does not work in Expo Go (SDK 53+). |
| OneSignal | Free | US$ 0; unlimited push "for organizations with up to 1,000 monthly active users"; email 10 thousand sends/month | https://onesignal.com/pricing | 22/10/2026 | Above 1 thousand MAU, no longer eligible for Free. |
| OneSignal | Growth | Starting at US$ 19/month; push US$ 0,012/MAU; email 20 thousand free, then US$ 1,50/thousand | https://onesignal.com/pricing | 22/10/2026 | With 20 thousand MAU ≈ US$ 240/month for push alone [HIP: calculation]. |

## 8. Transactional email

| Item | Plan | Displayed price/limit | URL | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| Resend | Free | US$ 0; 3.000 emails/month; **100/day**; 3 domains; 30 days of retention | https://resend.com/pricing | 22/10/2026 | The daily limit may block invitation spikes. |
| Resend | Pro | US$ 20/month; 50.000 emails/month; extra US$ 0,90/thousand | https://resend.com/pricing | 22/10/2026 | 10 domains. |
| Resend | Scale | US$ 90/month; 100.000 emails/month; extra US$ 0,90/thousand | https://resend.com/pricing | 22/10/2026 | Dedicated IP as an add-on. |
| Postmark | Free | US$ 0; 100 emails/month, no overages | https://postmarkapp.com/pricing | 22/10/2026 | For testing. |
| Postmark | Basic / Pro | Basic US$ 15/month (10 thousand, extra US$ 1,80/thousand); Pro US$ 16,50/month (10 thousand, extra US$ 1,30/thousand) | https://postmarkapp.com/pricing | 22/10/2026 | Platform US$ 18/month. |
| Amazon SES | À la carte | US$ 0,10 per thousand emails; US$ 0,12/GB of attachments | https://aws.amazon.com/ses/pricing/ | 22/10/2026 | New plans: Essentials US$ 0,16/thousand; Pro US$ 0,22/thousand + US$ 105/month; Enterprise US$ 0,23/thousand + US$ 500/month. New customers: up to US$ 200 in Free Tier credits. |

## 9. Object storage

| Item | Plan | Displayed price/limit | URL | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| Cloudflare R2 | Standard | US$ 0,015/GB-month; Class A US$ 4,50/million; Class B US$ 0,36/million; **free egress** | https://developers.cloudflare.com/r2/pricing/ | 22/10/2026 | Free/month: 10 GB-month, 1 million Class A, 10 million Class B. Infrequent Access US$ 0,01/GB-month + US$ 0,01/GB of retrieval. |
| Google Cloud Storage | Standard us-central1 | ≈ US$ 0,020/GiB-month; egress US$ 0,12/GiB | https://cloud.google.com/storage/pricing | 22/10/2026 | See section 2. |
| Supabase Storage | Pro | 100 GB included, then US$ 0,0213/GB | https://supabase.com/pricing | 22/10/2026 | Egress within the plan quota. |
| Cloud Storage for Firebase | Blaze | See section 2 | https://firebase.google.com/pricing | 22/10/2026 | — |
| Amazon S3 | Standard | [NC]: the dynamic table was not captured | https://aws.amazon.com/s3/pricing/ | 22/10/2026 | Internet egress appears in the page examples (e.g., US$ 0,09/GB from Ireland). Use the calculator. |

## 10. Illustrative monthly cost of the three stacks

**Illustrative scenario, not a forecast.** Calculated using the prices above and the assumptions below. The script remained only in the agent's temporary area; the formulas are in this section so the calculation can be repeated. Engineering costs (development and operations hours) are **not** included and probably exceed infrastructure costs at all scales. [HIP]

### 10.1 Assumptions [HIP]

| Assumption | Value |
| --- | --- |
| Active families per month | 100 / 1.000 / 10.000 |
| Caregivers (and devices) per family | 2 → MAU = 2 × families |
| Routine writes | 25 per family/day (20 records + 5 edits/deletes). In Firestore, 30 (with summary/session update) |
| Opens/syncs | 8 per device/day |
| Firestore reads | ~515 per family/day: 18 docs per open (listener reread after > 30 min), 12,5 real-time updates, 25 rule reads on writes, 32 on queries, 140 for 7 days of history and 18 for community |
| Structured volume after 12 months | Postgres 5 MB per family/year; Firestore 10 MB per family/year (documents + indexes) |
| Attachments | 4 photos/month of 300 KB (without EXIF) per family; each photo downloaded 3×; 12 months of retention |
| PowerSync sync | ~0,5 KB per operation; hosted window of 90 days; peak of 10% of devices connected |
| Own API (Cloud Run) | 40 requests per family/day; 0,06 vCPU-s per request; 1 minimum instance |
| Emails | 3 per family/month (link/OTP login + invitations). In stack A, link login goes through Firebase Auth and Resend sends only invitations |
| Push | 5 per family/day via FCM/APNs or Expo Push (no cost). OneSignal only as an option |
| Community | 30% of users read 30 items/day; posting negligible |
| Builds | EAS Starter (US$ 19) + Apple (US$ 99/12 = US$ 8,25/month). Google Play is a one-time fee (outside the monthly cost) |
| Region | Displayed US prices (us-central1 etc.). Brazil [NC] |

### 10.2 Result (USD/month)

| Stack | 100 families | 1.000 families | 10.000 families | Dominant items |
| --- | ---: | ---: | ---: | --- |
| A: Firebase (infra) | ~0 | ~7,50 | ~112 | Firestore reads (US$ 46 at 10 thousand), storage (US$ 14,50), network egress (US$ 16,50, rate [NC]), Resend Pro for invitations (US$ 20) |
| A + fixed costs (EAS Starter + Apple) | ~27 | ~35 | ~139 | — |
| B: Supabase + PowerSync (infra) | ~74 | ~94 | ~186 | Supabase Pro US$ 25 + PowerSync Pro US$ 49 from the start; at 10 thousand: Medium compute (+US$ 50), PowerSync concurrency (+US$ 30), Resend (US$ 20) |
| B + fixed costs | ~101 | ~121 | ~214 | — |
| C: Cloud Run + Cloud SQL + R2 (infra) | ~37 | ~82 | ~175 | Cloud SQL: shared at 100; 1 vCPU at 1 thousand; HA at 10 thousand (US$ 99) + HA disk (US$ 20) |
| C + fixed costs | ~64 | ~109 | ~202 | — |

**Stack B in this table is a subtotal excluding the domain service** that the proposed architecture adds, with hosting at US$ 7 to 85/month. The breakdown of the recommended stack is in [Costs and operations](../../05_Privacidade_Operacao/Custos_e_Operacao.md), section 2.

At 10.000 families, the formulas below yield ~US$ 7,44 in overages for B: database, files, and data hosted in PowerSync. Added to the dominant items (US$ 174), they reach ~US$ 181, rather than the ~186 in the table. The ~US$ 4,56 difference cannot be reproduced using the formulas, and the original script was not saved. The canonical breakdown retains it as a conservative margin.

Coordinator's notes, added after the independent review.

Formulas used (per month, 30 days):
- **Firestore:**
  - reads: `max(0, leituras_dia − 50.000) × 30 × 0,03/100.000`;
  - writes: `max(0, escritas_dia − 20.000) × 30 × 0,09/100.000`;
  - storage: `max(0, GiB − 1) × 0,15`;
  - egress: `max(0, GiB − 10) × 0,12` (proxy rate [NC]).
- **PowerSync:**
  - US$ 49 + `max(0, GB_sync − 30)` + `max(0, GB_hosp − 10)`;
  - plus US$ 30 per thousand peak clients above 1.000.
- **Supabase:**
  - US$ 25 + compute above the credit;
  - `max(0, GB_banco − 8) × 0,125` + `max(0, GB_arquivos − 100) × 0,0213`;
  - `max(0, invocações − 2 M) × 2/M`.
- **Cloud Run:**
  - `max(0, vCPU-s − 180 mil) × 0,000024` + `max(0, req − 2 M) × 0,40/M`;
  - plus the idle cost of 1 minimum instance (~US$ 9,86).
- **Cloud SQL:**
  - instance (db-g1-small, 1 vCPU/3,75 GiB, or twice that in HA) + SSD disk (HA at 10 thousand) + backup ≈ 2 × database.
- **R2:** `max(0, GB − 10) × 0,015`.
- **Resend:** Free below 3.000 emails/month; otherwise, Pro US$ 20.

### 10.3 Options that change the bill substantially

| Option | 100 | 1.000 | 10.000 | Note |
| --- | ---: | ---: | ---: | --- |
| EAS Update on Starter (MAU above 3 thousand × US$ 0,005) | 0 | 0 | +85 | At 10 thousand families (20 thousand MAU), the Production plan (US$ 199, 50 thousand MAU) may be worthwhile. RN/Expo only. |
| OneSignal Growth instead of FCM/Expo Push | 0 | +24 | +240 | US$ 0,012/MAU above the Free allowance of 1.000 MAU. |
| Supabase PITR (7 days) | +100 | +100 | +100 | Recommended for sensitive data in production (RPO decision). |
| Staging environment | [HIP] +10 to +50 | same | same | Extra Supabase project (compute), second Cloud SQL instance, or another Firebase project. |
| PowerSync Free/Supabase Free in the prototype | −74 | n/a | n/a | Prototype only: deactivates or pauses after 1 week without use. |

### 10.4 What is not included

- Engineering and operations (hours).
- Monitoring and errors (e.g., Sentry): [NC], not checked.
- Website domain name and DNS.
- Hosting for the domain service in the recommended stack B ([Costs and operations](../../05_Privacidade_Operacao/Custos_e_Operacao.md), section 2).
- Paid support.
- Assisted content moderation (classification APIs).
- External backup (copy outside the provider).
- Taxes and currency conversion.
- Legal advice.
- Device farm testing (another note).
- Mac hardware for iOS (another note).
- Google Play one-time fee (US$ 25).

### 10.5 Interpreting the figures

- Up to ~1.000 families, fixed costs dominate: EAS and Apple (~US$ 27) and, in stack B, the two paid plans (US$ 74). In this range, stack A is the cheapest, but requires the Blaze plan (card).
- At 10 thousand families, all three are between ~US$ 140 and ~US$ 215/month. The difference is less than the cost of a few engineering hours per month. **Infrastructure cost should not determine the architecture at these scales.** [HIP]
- Stack A is sensitive to read patterns. Doubling opens or history queries doubles the main item. B and C read from local SQLite and are not very sensitive to this.

## Factors that would change the choice

- **Data residency in Brazil:** regional prices (São Paulo) were not captured and may be higher, especially for Cloud SQL, GCS, and Firestore.
- **Heavy use of history and reports on the client** makes Firestore more expensive (reads) and favors B/C.
- **Changes to the PowerSync plan or price** (Pro at US$ 49 today) or to Supabase Pro directly affect B.
- **Use of EAS Update and OneSignal** may add up to more than the entire backend at 10 thousand families.
- **A PITR/HIPAA-like requirement** pushes B toward Team (US$ 599+) and C toward HA with longer retention.

## Open questions

1. Which region will be used? Collect prices again for São Paulo.
2. What is the desired RPO/RTO? This determines PITR and HA.
3. Will EAS Update be used? With how many MAU?
4. The Firestore network egress rate must be confirmed in the Google Cloud network pricing table.
5. S3 pricing and the full Cognito Lite tiers: collect if they are candidates.
6. Monitoring and observability: choose a tool and price it.

## Limits of this analysis

- Snapshot from 22/10/2026. Pricing pages change without notice; revalidate before deciding.
- The scenarios use invented assumptions to illustrate the order of magnitude. Actual usage and document or row size were not measured.
- Where the page table is dynamic (S3, RDS region, Firestore egress), the value was marked [NC] or replaced with a declared proxy.
- Amounts marked "starting at" (Supabase, PowerSync, EAS) may grow with usage. Only the modeled overages were considered.
