---
tipo: design-doc
status: proposal
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
tarefa: MAT-12
adr: ADR-005, ADR-008
fontes_principais:
  - 08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md
  - https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
  - https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm
  - https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
  - https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-15-de-24-de-abril-de-2024-556243024
  - https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-19-de-23-de-agosto-de-2024-580095396
  - https://developer.apple.com/app-store/review/guidelines/
  - https://support.google.com/googleplay/android-developer/answer/13327111
---

# Privacy and security

> Note from 03/11/2026: the direction changed to a full website first and an Android and iOS port later ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)). Where this text refers to a native app, read it as the port; the website covers the same functions.

> **This is not legal advice.** This document turns the [privacy, legal and app store research](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md) into product and architecture proposals. It does not state that AppMaternidade complies with any law or store policy. Every obligation listed must be checked against the official text and validated by a professional before launch.

Codes F01 to F50 refer to the research's source table, consulted on 22/10/2026. The [DOC] and [HIP] markers follow the [Conventions](../00_Inicio/Convencoes.md).

## 1. Problem

- **Sensitive child data.** The app stores a baby's routine: sleep, feedings, diapers, tummy time and notes in the MVP; later, also medication, temperature and growth. The LGPD treats "dado referente à saúde" as sensitive, but does not define the term, and the ANPD is still regulating the concept [DOC F01 art. 5º II; F10 item 12]. The conservative hypothesis is to treat the baby's entire private space as sensitive child data [HIP].
- **Several adults with access.** Mother, father, grandmother and nanny see the same data, each on their own device, sometimes offline.
- **Open community in the same app.** Nothing from the private space may leak into it.
- **Impact of a leak.** With children's data, the incident tends to be "relevante", with a short deadline for notification [DOC F04 art. 5º].

## 2. Principles

1. **Minimize:** collect only what care requires.
2. **Isolate on the server:** the current membership decides access in every operation, including in the sync channel, in files and in push ([ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md)).
3. **Separate the community:** pseudonymous public identity, with no reference to family, baby or record.
4. **Nothing sensitive outside the app:** push, logs, analytics and crash reports carry no care content.
5. **Truly delete:** deletion reaches the database, files, caches, subprocessors and backups, with a published deadline.
6. **Layered transparency:** each consent has its own screen and stored proof.
7. **Minimal and audited administrative access:** whoever moderates the community does not read family data.

## 3. Data inventory

The technical classification is in [Data model and permissions, section 7](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md). This section covers the proposed handling, with legal bases to be validated with a lawyer (full map in section 2.4 of the research).

| Category | Examples | Class | Proposed basis [HIP] | Where it is stored |
| --- | --- | --- | --- | --- |
| Adult account | name, email, credentials | Personal | Performance of contract [F01 art. 7º V] | Supabase Auth (Brazil region) |
| Baby profile | nickname, date of birth | Sensitive child data | Specific and prominent consent from the guardian [F01 arts. 11 I and 14 §1º]; other bases allowed by CD/ANPD Statement (Enunciado) No. 1/2023 [F03] | Database (Brazil region) and devices with membership |
| Care records | MVP: sleep, breastfeeding, bottle, solids, diaper, tummy time, short note. Later: medication, temperature, growth | Sensitive child data | Same | Same |
| Authorship and timestamps | who recorded, ended or edited | Caregiver's personal data | Performance of contract accepted in the invitation [F01 art. 7º V] | Same |
| Memberships, roles and invitations | role, state, epoch, invitation code (hash) | Personal | Performance of contract | Database |
| Community | public profile, topics, replies, reports, moderation actions | Public in the app, and personal | Contract; moderation under legal obligation and legitimate interest [F01 arts. 7º II, V and IX] | Database, schema `comunidade`, outside sync |
| Access logs | IP, port, time | Technical personal data | Legal obligation (Marco Civil art. 15, for a legal entity) [F16] | Separate storage, restricted access |
| Application logs | errors, latencies, technical ids | Technical, no content | Legitimate interest | Log provider |
| Push tokens | token per device | Personal | Performance of contract and system permission | Database |
| Proof of consent | who, when, text version | Personal | Obligation to prove consent [F01 art. 8º §2º] | Database |
| Analytics and crashes | usage events; stack trace and version | Technical | Opt-in for analytics [F23 5.1.1(ii)]; crashes with content scrubbing, basis to be validated | Vendor to be defined |
| Private photos | record attachments | Sensitive child data | Same as records | Outside the MVP; later, private bucket per family ([Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md), section 9) |

## 4. Minimization

- Baby's nickname instead of full name; no CPF, ID document or location [HIP; F01 art. 14 §4º].
- Date of birth only in the private space. The community shows, at most, a stage range calculated on the device, never the date ([Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md)).
- No photos in the MVP: private attachments and the baby's photo are left out, and the community accepts text only (decision D4). The baby's sex and weight, medications, temperature and growth measurements are also left out of the MVP ([Data model](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md), section 3.2).
- Limited free text, with a warning not to write third parties' health data.
- No advertising SDK and no cross-app tracking; no ATT because there is no tracking [F23; F26].
- No generative AI responding to users in the MVP ([ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)). If it comes later, it will require explicit consent, a review of the RIPD and an assessment of the transfer [F01 art. 20; F23 5.1.2(i)].

## 5. Isolation and the boundary with the community

Summary of [ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md) and of the [Data model](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md):

- All care data belongs to a family. The domain service checks the current membership (state, role, validity and epoch) on each operation received, rather than a list of permissions stored in the token.
- The sync channel derives the family from the memberships table. Revoking the membership removes the family from what the device receives ([Proposed architecture, 4.2](../03_Arquitetura/Arquitetura_Proposta.md)).
- The community public profile is linked to the account only on the server and carries no family, baby or record.
- Moderators and support do not read the family's space. Emergency access, if it exists, is logged and reviewed.
- The reference repositories show why this needs its own testing ([Finnberry](../08_Referencias/Repositorios/Finnberry.md), [Baby Buddy](../08_Referencias/Repositorios/Baby_Buddy.md)). Therefore, Q-06 tests another family's ids on every route, in the sync channel, in file URLs and in push ([Quality and validation](Qualidade_e_Validacao.md)).

## 6. Consents and transparency to be assessed

| Moment | What to show or request | Basis |
| --- | --- | --- |
| Create account | Layered terms and policy; minimum age; who the controller is and how to contact the data protection officer | F01 arts. 9º and 41; F23 5.1.1(i) |
| Register the baby | Dedicated screen: what will be recorded, for what purpose, who will see it, for how long and how to revoke. Declaration of being the father, mother or legal guardian, with stored proof | F01 arts. 8º, 11 I and 14 §§1º, 5º and 6º. Do not bundle with acceptance of the terms |
| Invite a caregiver | For the inviter: what the invitee will see and do according to their role, and that data already downloaded may remain on the invitee's device even after revocation. For the invitee: which name and authorship are visible to the family | F01 art. 9º; limits in [Offline, section 11](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) |
| Post in the community | Exact preview; nothing from the routine is included automatically; warning that others will see it | Task requirement; F13 art. 23 |
| Analytics and crashes | Separate and reversible opt-in; no baby data in events | F23 5.1.1(ii) |
| Notifications | Explain before the system prompt; the app works without push | F23 5.1.2(i) |
| Change of purpose | Prominent notice and option to revoke | F01 arts. 8º §6º and 9º §2º |

Only the father, mother or legal guardian creates the baby's profile and gives consent. Grandparents and nannies join as invitees and do not consent on the baby's behalf [HIP; F01 art. 14 §1º].

## 7. Rights, export and deletion

**Who the data subject is** [HIP; F01 arts. 5º V and 18 §3º]:

- **Care content:** the data subject is the baby, represented by the legal guardian.
- **Authorship and account:** each caregiver is the data subject of their own data.
- **Invited caregiver:** cannot request deletion of the baby's history.

**Export:**

- The guardian requests a full export of the family, in JSON and CSV (with attachments, when they exist) [F01 arts. 18 and 19 §3º].
- The caregiver exports their own data.
- The request is logged, and the file is delivered via a short-lived link.

**Account deletion:**

- Can be initiated within the app (Apple 5.1.1(v)) and also via a web address (Google Play, [answer 13327111](https://support.google.com/googleplay/android-developer/answer/13327111)).
- Deletes the author's posts and replies in the community [F24]. Topics started by others keep "[removido]".

**Propagation** (details in [Offline, section 12](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)):

- a deletion job covers the database, files, indexes, caches, subprocessors and analytics;
- deletion markers reach offline devices;
- backups expire within the published window;
- after any restore, deletions are reapplied;
- the user receives a confirmation receipt.

**Hard cases** [HIP, all to be validated with legal]:

- **A caregiver leaves:** their personal data is removed, and authorship becomes a neutral label ("ex-cuidador"). The baby's history stays with the family.
- **The last guardian leaves:** the baby's entire space is deleted, after offering the export.
- **Two guardians in disagreement:** one requests deletion and the other wants to keep the data (separation, shared custody). The LGPD requires the consent of "pelo menos um dos pais", but does not resolve revocation by only one of them.
- **The child, as an adult:** can they access or delete the data from their own childhood? Open question.

## 8. Proposed retention

| Data | Proposed period | Basis | Status |
| --- | --- | --- | --- |
| Care data | While the family is active; notice and deletion after long inactivity | F01 arts. 15 and 16 | Inactivity period to be defined |
| On-device cache | Window of 90 days and an access license of 14 days per device, renewed on each sync | [Offline, section 11](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) | Technical proposal |
| Backups | 7 days in the pilot (Supabase Pro daily backups and PITR of 7 days); a longer window only with an external copy | F12 (ANPD security guide); [Costs and operations, section 5](Custos_e_Operacao.md) | Proposal; depends on the RPO/RTO |
| Access logs | 6 months, under confidentiality | F16 art. 15 | Legal obligation, for a legal entity |
| Application logs, without content | The minimum necessary (proposal: 30 days) | F17 art. 13 §2º | Proposal |
| Incident log | 5 years, at minimum | F04 art. 10 | Obligation |
| Proof of consent | For as long as the processing lasts, plus the period indicated by legal | F01 art. 8º §2º | To be validated |
| Reports and moderation actions | Period to be defined, with an annual transparency report | F20; F17 | To be defined |
| Child abuse content | Preservation and reporting to the authorities as required by law | F13 art. 27; F15 arts. 36 to 39 | Obligation; dedicated flow |

## 9. Technical security

| Topic | Proposal | Verification |
| --- | --- | --- |
| In transit | TLS everywhere, including attachment downloads via short-lived signed URLs [F34; F23 1.6] | Configuration test and network inspection |
| At rest, server | Provider encryption enabled; secrets kept out of the code | Configuration checked at the provider |
| On the device | Encrypted local database (PowerSync with op-sqlite and SQLCipher), key in the Keychain or Keystore; no health data in iCloud [F23 5.1.3] | `PRAGMA cipher_version` in the release build, and the database file unreadable without the key ([ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md)). Without SQLCipher in the binary, the key is ignored without any error |
| Authentication | One-time code by email; short-lived JWT; per-device sessions, revocable ([ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md)) | Expiration and revocation test |
| Administrative access | Mandatory MFA, minimal roles, named accounts, audit trail [F17 art. 13 I to III; F12] | Periodic review of the trail |
| Push | Generic text ("Novo registro na família"), without the baby's name or health data; details only inside the authenticated app | Sampling of sent payloads |
| Logs and crashes | No names, notes or payloads; scrubbing before sending | Sampling and testing with tagged fictitious data |
| Dependencies | No advertising SDK; Apple privacy manifests (`PrivacyInfo.xcprivacy`) [F27; F28] | SDK inventory on each release |
| Backups | Automatic; restore rehearsed and logged; deletions reapplied afterward | Restore rehearsal in a test environment (Q-12) |

## 10. Subprocessors and international transfer

| Service | Role | Proposed region | Data | Status |
| --- | --- | --- | --- | --- |
| Supabase (PostgreSQL, Auth) | Database and accounts | sa-east-1 (São Paulo) | All persisted data | Region offered according to the check on 22/10/2026; processor agreement to be reviewed |
| PowerSync Cloud | Synchronization | BR region | Family and care replica | Region offered according to the check on 22/10/2026; agreement to be reviewed |
| Domain service (container) | Write rules, community, moderation | Brazil (proposal) | All | Hosting to be chosen |
| FCM and APNs | Push delivery | Global | Token and generic text | There is a transfer; that is why push carries no sensitive data |
| Expo (EAS Build and Submit; Push, if used) | Build and distribution | USA | Code and binaries; tokens, if Expo Push is used | Assess agreement and transfer mechanism |
| Email provider | Access codes and notices | To be defined | Email and code | To be chosen |
| Crash reports and analytics | Quality | To be defined | Technical, no content; analytics only with opt-in | To be chosen |

- For the European Union, standard clauses are not required: it has been considered adequate since CD/ANPD Resolution No. 32/2026 [F08].
- For the USA and other countries, the ANPD standard clauses apply, without modification [F07 art. 16].
- In any case, publish a page in Portuguese about the transfers [F07 art. 17].
- The Brazil region reduces the transfer but does not eliminate it (push, build, email) [HIP].

## 11. Incidents

- **Relevance:** with children's data, almost any leak from the private space tends to be relevant [HIP; F04 art. 5º].
- **Deadline:** plan for 3 business days to notify the ANPD and the data subjects, counted from when it became known that the incident affected personal data. The supplementary notice comes within 20 business days [F04 art. 6º]. The doubled deadline for small-scale processing agents may not apply, because children's data counts as a high-risk criterion [F05 arts. 3º and 4º]. Validate with legal.
- **Content of the notice:** number of affected data subjects, with children counted separately [F04 art. 6º §2º II]. The data model needs to quickly count babies and adults per family.
- **Record:** every incident, whether notified or not, is recorded for 5 years [F04 art. 10].
- **Playbook:**
  - detect, contain, assess, notify, fix and record;
  - named owner and ready-made notice templates;
  - rehearsal before the pilot.
- **Child abuse content in the community:** remove, preserve and report to the authorities [F13 art. 27; F15 arts. 36 to 39]. This is a dedicated flow, separate from regular moderation.

## 12. Privacy-related store requirements

**Apple** [F23; F24; F25; F27]:

- account deletion that can be initiated in the app, also deleting the content published by the user (5.1.1(v));
- health apps or apps with sensitive data submitted by a legal entity (5.1.1(ix); decision D3);
- no health data in iCloud (5.1.3);
- privacy labels consistent with the inventory, and a privacy manifest;
- community with filtering, reporting, blocking and contact (1.2).

**Google Play** [F33; F35; F36; F37; F39; F40]:

- complete Data safety form;
- deletion in the app and via a web link;
- health apps declaration and notice that the app is not a medical device;
- declared target audience, with no appeal to children;
- user-generated content rules.

## 13. Before the pilot

Excerpt of the full checklist (section 9 of the research) for the foundation and the pilot. Some items are already part of the acceptance criteria of MAT-18 (A7 and A10) and of MAT-19 (Q-07 and Q-11). The rest are conditions for the pilot (phase F5 of the [Roadmap](../07_Roadmap/Roadmap_e_Proxima_Fatia.md)).

1. Controller defined (decision D3) and data protection officer appointed (decision D5).
2. Record of processing operations and RIPD **before** real processing [F01 arts. 37 and 38; F11].
3. Parental consent screen with proof and free revocation.
4. Public privacy policy, in pt-BR, accessible without login.
5. Subprocessor inventory and transfer page.
6. Isolation tests (Q-06), deletion and export tests (Q-12) passing.
7. Logs and push checked by sampling, with no sensitive content.
8. MFA and audit trail on administrative access.
9. Incident playbook rehearsed.
10. Legal opinion on the ECA Digital ("acesso provável") and minimum age recorded (decision D4).

## 14. Questions for legal validation

1. Legal bases per purpose: parental consent, or another basis allowed by Statement No. 1/2023?
2. Is the declaration of being the legal guardian, with stored proof, sufficient as "esforço razoável" [F01 art. 14 §5º]?
3. Disagreement between guardians and a caregiver leaving: what happens to the history and to authorship?
4. Does the ECA Digital apply, considering the community and the existence of teenage mothers and fathers?
5. Does classification as a small-scale processing agent hold, given the high risk?
6. What are the retention and inactivity periods?
7. Are there Brazilian rules on the promotion of infant formula to consider in any partnership?

## 15. Process deviation record

The privacy research summarizes arts. 33, 37, 38, 41, 46, 48 and 49 of the LGPD. These articles were read from a saved local file after the approval system blocked the extraction with the instruction not to reach the same result by another route ([Progress](../00_Inicio/Progresso.md), 04:05). This document cites these articles by number only, with the official text at [Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), where they must be checked. Daniel decides whether the summaries remain in the research note.

## Limits of this analysis

- Design proposal without legal validation; nothing has been implemented or tested.
- Sources consulted on 22/10/2026 by the research. ANPD regulations on health data, RIPD, data subject rights, security and AI were being drafted [F10].
- Vendors' regions and plans may change, and the processor agreements have not been read.
- Document written by the coordinator, because the delegated writer stopped due to lack of response from the provider.

## Relationship to other documents

[Data model and permissions](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) · [Offline, synchronization and timers](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) · [Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md) · [Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) · [Costs and operations](Custos_e_Operacao.md) · [Quality and validation](Qualidade_e_Validacao.md) · [ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md) · [ADR-008](../06_ADRs/ADR-008_Documentacao_Operacao_Custos_e_Evolucao.md) · [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md)
