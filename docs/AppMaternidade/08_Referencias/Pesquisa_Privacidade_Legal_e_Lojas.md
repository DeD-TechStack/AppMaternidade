---
tipo: research
status: draft
responsavel: Hermes (privacy and stores subagent)
revisado_em: 2026-10-22
fontes_principais:
  - https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
  - https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm
  - https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/Decreto/D12880.htm
  - https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-15-de-24-de-abril-de-2024-556243024
  - https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-19-de-23-de-agosto-de-2024-580095396
  - https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
  - https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D12975.htm
  - https://noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com/wp-content/uploads/wpallimport/uploads/2026/06/17180658/MCI_tese.pdf
  - https://developer.apple.com/app-store/review/guidelines/
  - https://support.google.com/googleplay/android-developer/answer/10144311?hl=en
  - https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
  - https://support.google.com/googleplay/android-developer/answer/14738291?hl=en
---

# Research — privacy, data protection, security and store requirements

Reference research for APP-001 on what to check, using official sources, before launching AppMaternidade in Brazil. All sources were accessed on **22/10/2026** (America/Sao_Paulo). The labels follow the [Vault conventions](../00_Inicio/Convencoes.md): **[DOC]** is official text (law, decree, resolution, decision, store policy); **[HIP]** is an interpretation or inference by Hermes. Codes F01…F50 refer to the [Sources](#fontes) table and are stable.

> **This is not a legal opinion.** The document lists obligations and risks to guide design and discussions with a lawyer. Nothing here declares that the product is compliant. Items marked [HIP] require professional validation before becoming decisions.

Related documents: [Data model and permissions](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) and [Offline, synchronization and timers](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md). Community moderation and content sources are handled by another subagent (planned doc `04_Comunidade_Conteudo/Comunidade_e_Moderacao.md`); only the legal minimum is included here. The operational synthesis of this material should feed into planned docs `05_Privacidade_Operacao/Privacidade_e_Seguranca.md` and `07_Roadmap/Decisoes_para_Daniel.md`, which did not yet exist on 22/10/2026.

## Resumo

- **The baby's data is probably health data.** The LGPD includes "data concerning health" among sensitive data, but does not define it; the ANPD is still developing regulations on the concept [DOC F01 art. 5º II; F10 item 12]. Conservative assumption: treat all care records (sleep, feeds, diapers, weight, temperature, medication, notes) as sensitive data and children's data, with specific and prominently presented consent from one parent or the legal guardian [DOC F01 arts. 11 I and 14 §1º; HIP].
- **The baby is the data subject for their own data**; rights are exercised by a legal representative. Invited caregivers are data subjects for their own data (account, authorship), not the baby's representatives [DOC F01 arts. 5º V and 18 §3º; HIP].
- **ECA Digital (Law 15.211/2025) has been in force since 17/03/2026**, regulated by Decree 12.880/2026, with the ANPD as the authority [DOC F13 art. 41-A; F02; F14; F15]. The app is not directed at children, but the community and the possibility of teenage mothers and fathers make "likely access" debatable [DOC F13 art. 1º sole paragraph; HIP]. Some obligations apply to any service available in Brazil, such as removing and reporting child sexual exploitation or abuse content [DOC F13 art. 27; F15 arts. 36-39].
- **An incident involving children's data** is likely to be "significant": notify the ANPD and data subjects within 3 business days (6 for small processing agents) and keep a record of every incident for 5 years [DOC F04 arts. 5º, 6º, 9º, 10].
- **International transfers**: the European Union has been recognized as adequate since 27/01/2026; for the US and other countries, use the ANPD's standard contractual clauses without changes and a transparency page in Portuguese [DOC F08; F07 arts. 16-17].
- **Community**: following the STF ruling (Themes 987/533, final holding of 17/06/2026) and Decrees 12.975 and 12.976/2026, the provider is liable after notification for crimes and unlawful acts (except offenses against honor), has a duty of care regarding serious crimes against women and children, and must provide notifications, due process, an annual transparency report and short deadlines, such as **2 hours** for unauthorized intimate content [DOC F20; F18; F19 art. 7º].
- **Stores**: account deletion must be initiable within the app (Apple) and also through a web link (Google); reporting and blocking in the community; Data safety, privacy labels and a privacy manifest; a health apps declaration is mandatory on Play [DOC F23 5.1.1(v) and 1.2; F35; F33; F25; F27; F36].
- **Individual vs. legal entity**: Apple says apps providing healthcare or requiring sensitive information "must" be submitted by a legal entity, and Google recommends an organization account for health apps such as medical apps [DOC F23 5.1.1(ix); F42]. Together with the Marco Civil and the STF holding, this points toward publishing through a legal entity [HIP].

## 1. Assumptions used in this analysis

| Item | Assumption | Class |
| --- | --- | --- |
| Users | Adults: mothers, fathers and other authorized caregivers. | HIP (minimum age decision pending) |
| Data subjects | Baby (child, art. 2º of the ECA); caregivers; community participants. | HIP |
| Controller | Whoever operates the app: Daniel as an individual or a legal entity (decision pending). Cloud providers act as processors. | HIP |
| Country | Brazil at launch; expansion undecided. | HIP |
| Data | Adult account; baby profile (nickname, date of birth); care records; free-text notes; optional photos; authorship and timestamps; memberships and roles; community (public profile, topics, replies, reports); technical records (IP, port, timestamps); push tokens; consents. | HIP |
| Monetization and AI | Open. This note identifies only the known restrictions. | HIP |

## 2. LGPD (Law 13.709/2018)

### 2.1 Scope, roles and authority

- The LGPD applies regardless of the country of headquarters or where the data is located, in the circumstances set out in art. 3º [DOC F01 art. 3º]. It does not apply to processing by a natural person for exclusively private and non-economic purposes [DOC F01 art. 4º I]; this may cover personal use by caregivers, but not the app operator [HIP].
- The controller makes decisions about processing; the processor processes data on the controller's behalf [DOC F01 art. 5º VI and VII].
- The ANPD became the **National Data Protection Agency**, an independent public agency with special status (Law 15.352/2026, conversion of Provisional Measure 1.317/2025) [DOC F02 art. 1º].

### 2.2 Sensitive data: are the baby's records "data concerning health"?

- Sensitive data includes "data concerning health" [DOC F01 art. 5º II]. Sensitive data may only be processed with specific and prominently presented consent from the data subject or legal guardian, or in the circumstances set out in item II [DOC F01 art. 11 I and II]. The rule also applies to processing that reveals sensitive data and may cause harm [DOC F01 art. 11 §1º].
- The LGPD does not define "data concerning health". The ANPD's regulatory action on health data, **ongoing and without a public consultation as of 20/10/2026**, specifically aims to address "the concept of sensitive personal data concerning health" [DOC F10 item 12].
- Comparative reference: the GDPR defines data concerning health as data that reveals information about health status [DOC F48 art. 4(15)].
- **[HIP]** Temperature, medication, weight, symptoms and clinical notes are clearly health data. Sleep, feed volumes and diapers, taken individually, are debatable, but as a series and in combination they reveal health status (dehydration, reflux, infection). Recommendation: design the baby's entire private space as sensitive. This is also the most likely classification in the stores ("Health info" on Play; Apple's health rules) [DOC F33; F23 5.1.3].
- Communicating or sharing health data between controllers for economic advantage is prohibited, except for exceptions related to health services [DOC F01 art. 11 §4º]. **Monetization impact [HIP]:** do not sell or pass the baby's data to brands, advertisers, insurers or health plans.

### 2.3 Children's data (art. 14) and CD/ANPD Statement No. 1/2023

| Provision | Official text (summary) [DOC F01] | Product consequence [HIP] |
| --- | --- | --- |
| art. 14 main provision | Processing in the best interests of children and adolescents. | Justify each purpose in terms of the baby's interests; record the assessment in the RIPD. |
| art. 14 §1º | Children's data: specific and prominently presented consent from at least one parent or the legal guardian. | Dedicated consent screen when creating the baby profile, separate from the terms of use. Only a father, mother or legal guardian creates the profile and consents; grandparents and nannies do not. |
| art. 14 §2º | Keep information about data types, use and rights procedures public. | Public policy accessible without logging in. |
| art. 14 §3º | Collection without consent only to contact parents (once, without storage) or for protection. | Does not apply to normal app use. |
| art. 14 §4º | Do not make participation conditional on data beyond what is strictly necessary. | Nickname instead of name; optional photo; no identity documents. |
| art. 14 §5º | Reasonable efforts to verify that consent came from the guardian. | Explicit declaration of being the father, mother or legal guardian, with evidence retained (who, when, text version). Assess with a lawyer whether this is sufficient. |
| art. 14 §6º | Simple, clear and accessible information. | Short, accessible texts in pt-BR. |

- **CD/ANPD Statement No. 1/2023** says that children's and adolescents' data may be processed on the grounds set out in art. 7º or art. 11, "provided that their best interests are observed and prevail" [DOC F03]. In other words, parental consent is not the only possible basis.
- General consent requirements: prominently presented clause when written; controller bears the burden of proof; specific purposes (generic authorizations are void); free and easy withdrawal; prominent notice if the purpose changes [DOC F01 art. 8º §§1º, 2º, 4º, 5º and 6º; art. 9º §2º].

### 2.4 Legal bases by purpose (proposal for validation)

| Purpose | Data | Proposed basis [HIP] | Grounds [DOC F01] |
| --- | --- | --- | --- |
| Adult account and authentication | name, email, credentials | Performance of a contract | art. 7º V |
| Baby profile and care records | nickname, birth date, records, notes, private photos | Specific and prominently presented consent from the guardian (arts. 14 §1º and 11 I), as a conservative approach. Alternatives to validate: art. 7º V for non-sensitive data and art. 11 II "d" | arts. 7º, 11 and 14; Statement [F03] |
| Sharing with invited caregivers | baby's records; invitee's name and authorship | Part of the guardian's consent (they choose who can see); invitee's data covered by the contract accepted in the invitation | arts. 7º V, 9º and 14 |
| Community | public profile, topics, replies, reports | Contract (community terms); moderation based on legal obligation (ECA Digital, Marco Civil) and legitimate interest | arts. 7º II, V and IX; 10 |
| Security and access records | IP, port, timestamps | Legal obligation (Marco Civil art. 15, for legal entities) and legitimate interest | arts. 7º II and IX; 10 |
| Product analytics | usage events | Consent (opt-in); Apple requires consent to collect usage data [DOC F23 5.1.1(ii)] | art. 7º I |
| Crash reports | stack trace, device, version | Legitimate interest with content scrubbing, or consent; validate | arts. 7º I or IX |
| Notifications | device token | Performance of a contract, plus system permission | art. 7º V |
| Email marketing | email | Consent | art. 7º I |
| Future AI | to be defined | Specific consent, revised RIPD, transfer assessment | arts. 7º, 11, 20 and 33 |

### 2.5 Data subject rights and who the data subject is

- Rights: confirmation, access, correction, anonymization, blocking or deletion of excessive data, portability, deletion of data processed with consent, information about sharing, information about withholding consent, and withdrawal [DOC F01 art. 18 I to IX]. They are exercised by the data subject or a "legally appointed representative", free of charge [DOC F01 art. 18 §§3º and 5º]. The controller must notify those with whom it shared data that has been corrected or deleted [DOC F01 art. 18 §6º].
- Deadlines: immediate simplified access; full statement within 15 days; complete electronic copy in a reusable format when the basis is consent or contract [DOC F01 art. 19 I, II and §3º]. Small processing agents have twice the time [DOC F05 art. 14 I and III].
- Portability depends on ANPD regulations [DOC F01 art. 18 V], still pending: the "Data subject rights" action (arts. 9º, 18, 19 and 20) was under internal development as of 20/10/2026 [DOC F10 item 1].
- **Who the data subject is when several caregivers make records [HIP]:**
  - Record content (the baby slept from 14h to 15h): the data subject is the baby [DOC F01 art. 5º V]. Requests about this data come from a father, mother or legal guardian. An invited caregiver cannot request deletion of the baby's history.
  - Record authorship and timestamp: personal data of the caregiver who created it. They may request access to their own data and leave the group.
  - Two guardians in disagreement (one requests deletion, the other wants to retain it; joint custody; separation): the LGPD refers to "at least one parent" for consent, but does not resolve withdrawal by only one. Legal question.
  - A caregiver leaves or deletes their account: proposal to remove their personal data and replace authorship with a neutral label ("ex-cuidador"), keeping the baby's history in the family space. Requires legal validation and clear notice in the invitation and deletion flow.
  - Deletion of the last guardian's account: delete the baby's entire space after offering export.
  - When the child grows up, they begin exercising their own rights over their childhood data. Open question.

### 2.6 International transfers

- Only permitted in the circumstances set out in art. 33, including an adequate country, standard contractual clauses, and specific and prominently presented consent [DOC F01 art. 33 I, II "b" and VIII].
- **CD/ANPD Resolution No. 19/2024:** those using contractual clauses had up to 12 months from publication to incorporate the ANPD's standard contractual clauses (deadline already passed) [DOC F07 art. 2º sole paragraph]. They are valid only if adopted in full and without changes [DOC F07 art. 16]. The controller provides the text to the data subject within 15 days and publishes a page in Portuguese about the transfer: method, duration, purpose, destination country, responsibilities and rights [DOC F07 art. 17 §§1º to 3º]. The resolution remains in force, with a correction dated 18/08/2025 [DOC F09].
- **CD/ANPD Resolution No. 32/2026:** recognizes the European Union (plus Iceland, Liechtenstein and Norway) as adequate for transfers from Brazil, with reassessment in four years [DOC F08 arts. 1º and 4º §1º].
- **[HIP] Consequences:**
  - A region in Brazil (São Paulo) reduces, but does not eliminate, transfers: support, subprocessors and global services (authentication, push, crash reporting) may process data abroad.
  - An EU region removes the need for clauses as the transfer mechanism, but not for a processor agreement.
  - A US region requires checking whether the provider accepts the ANPD's standard contractual clauses without changes.
  - APNs (Apple) and FCM (Google) pass through other countries; therefore, push notifications carry no sensitive data (section 7).

### 2.7 Security incidents (CD/ANPD Resolution No. 15/2024)

- Notify the ANPD and data subjects of an incident that may cause significant risk or harm [DOC F01 art. 48; F04 art. 4º].
- It is significant when it may significantly affect interests and fundamental rights **and** involves at least one criterion: sensitive data; **data of children, adolescents or older adults**; financial data; authentication; confidentiality; large scale [DOC F04 art. 5º]. **[HIP]** Almost any breach of the baby's private space meets both requirements.
- Deadline: **3 business days** from becoming aware that the incident affected personal data, for both the ANPD and data subjects; supplementary information within 20 business days; **twice the time for small processing agents** [DOC F04 art. 6º main provision, §§1º, 3º and 8º; art. 9º and §6º].
- Notification to the ANPD includes, among other information, the number of affected data subjects, "specifying, where applicable, the number of children, adolescents or older adults" [DOC F04 art. 6º §2º II]. **[HIP]** The data model must allow affected babies and adults to be counted quickly.
- Data subjects: simple language, direct and individual communication. If impractical, public notice for at least three months [DOC F04 art. 9º §§1º to 3º].
- **Record every incident, whether reported or not, for at least 5 years** [DOC F04 art. 10].

### 2.8 Data protection officer (DPO) and small processing agents

- The controller appoints a DPO and publishes their identity and contact details [DOC F01 art. 41 §1º]. The appointment is made through a formal act [DOC F06 art. 3º]. The DPO may be a natural person (internal or external) or a legal entity, must communicate in Portuguese and does not need certification [DOC F06 arts. 12 to 14]. Clear disclosure on the website [DOC F06 art. 9º].
- **Small processing agents (Res. 2/2022):** includes microenterprises, small businesses, startups and also **natural persons** who process data as controllers [DOC F05 art. 2º I]. Benefits: simplified processing records, exemption from appointing a DPO (with a mandatory communication channel) and doubled deadlines [DOC F05 arts. 9º, 11 and 14].
- Those carrying out **high-risk** processing **lose the benefit** [DOC F05 art. 3º I]. High risk requires one general criterion (large scale or significantly affecting rights) **and** one specific criterion, including "sensitive personal data or children's data" [DOC F05 art. 4º].
- **[HIP]** The specific criterion is present from the start. The general criterion depends on scale and impact, which must be assessed and documented. Plan as though the simplified regime might not apply: appoint a DPO, keep full records and prepare an RIPD.

### 2.9 Processing records and RIPD

- Controllers and processors keep records of processing operations [DOC F01 art. 37]; small processing agents may do so in simplified form [DOC F05 art. 9º].
- The ANPD may require an RIPD, including for sensitive data [DOC F01 arts. 5º XVII and 38]. It recommends preparing one in high-risk contexts, **before processing begins**, using art. 4º of Res. 2/2022 until specific regulations exist [DOC F11]. RIPD regulations are still under development [DOC F10 item 2].
- If ECA Digital applies, there is also risk mapping and an impact report, shared upon ANPD request [DOC F13 art. 16 sole paragraph I and II], and an assessment of the impact on children's safety and health, with a public summary version [DOC F15 art. 47 and §1º].

### 2.10 Retention, deletion and security

- Processing ends when its purpose is achieved, upon withdrawal by the data subject or by ANPD order; afterward, delete the data, except for legal obligations, research, lawful transfer or the controller's exclusive use of anonymized data [DOC F01 arts. 15 and 16].
- The Marco Civil guarantees permanent deletion of supplied data, upon request, at the end of the relationship, except for mandatory retention [DOC F16 art. 7º X]. The implementing decree requires retaining the minimum and deleting data when the purpose is achieved or the legal period expires [DOC F17 art. 13 §2º].
- Technical and administrative security from the design stage; a duty that continues after processing ends; systems structured for security and good practices [DOC F01 arts. 46 §2º, 47 and 49]. ANPD minimum security standards are still under development [DOC F10 item 5].
- Maximum penalty per violation: a fine of up to 2% of revenue, capped at R$ 50 million [DOC F01 art. 52 II].

## 3. ECA Digital (Law 15.211/2025)

### 3.1 Identification, effective date and regulation [DOC]

- **Law No. 15.211, of 17/09/2025**, Digital Statute of the Child and Adolescent [F13].
- **In force since 17/03/2026**: art. 41-A added by Law 15.352/2026, which repealed Provisional Measure 1.319/2025 (the provisional measure set six months) [F13 art. 41-A; F02].
- **Decree 12.622/2025**: designates the ANPD as the autonomous administrative authority for ECA Digital [F14 art. 2º].
- **Decree 12.880, of 18/03/2026**: implements the law; the ANPD regulates and enforces it [F15 art. 1º sole paragraph].
- **Still pending** (checked in the ANPD Agenda of 20/10/2026) [DOC F10 items 13, 14 and 15]:
  - guide on scope and "likely access": call for input from abril a junho de 2026, preliminary version;
  - age assurance guide: call for input from maio a julho de 2026; there was "Preliminary Guidance" from março de 2026;
  - review of enforcement and penalty rules.
- The following also depend on future regulations or acts: parental supervision standards [F13 art. 17 §1º], requirements and deadlines for reporting abuse content to the authority [F13 art. 27 §1º; F15 art. 37 §4º] and safety by default [F15 art. 10].

### 3.2 Who it applies to

- Any information technology product or service **directed** at children and adolescents in Brazil **or likely to be accessed** by them [DOC F13 art. 1º].
- "Likely access" means: (I) sufficient likelihood of use and appeal; (II) considerable ease of access; (III) a significant degree of risk to privacy, safety or development, "especially" in services involving social interaction and large-scale sharing [DOC F13 art. 1º sole paragraph].
- Useful definitions: "child monitoring" is parents' monitoring of **children's actions in digital environments**; "social network" is an application whose **main** purpose is sharing opinions and information among connected users [DOC F13 art. 2º II and III]. The ANPD may reclassify a service as a social network [DOC F15 art. 19 §2º].

### 3.3 Does ECA Digital affect AppMaternidade? [HIP]

1. **Babies are not users.** The app is not directed at children and is not "monitoramento infantil" in the legal sense, because it records physical care, not the child's digital actions. Integrating a camera or baby monitor in the future would require a new analysis (art. 19 of the law).
2. **The sensitive point is teenage users.** Teenage mothers and fathers exist and may look for an app like this. The community is precisely factor III ("interação social"). It is defensible to say that the app is "acesso provável" by adolescents, especially in the community. This is not conclusive: it depends on the ANPD's scope guide and a legal opinion.
3. **Two paths (Daniel's decision):**
   - **(A) Only users over 18**, with a minimum age in the terms, store age signals and restrictions on minors in Play. This reduces the likelihood of access, but the burden of demonstrating effectiveness rests with the supplier.
   - **(B) Accept adolescents.** This brings obligations such as the most protective settings by default, risk management and parental supervision [DOC F13 arts. 7º, 8º, 17 and 18] and **linking the account of anyone up to 16 years old to a legal guardian's account** [DOC F13 art. 24].
4. **Apply under either path** (apply to suppliers available in Brazil or providers in general):
   - remove and report to the authorities content involving apparent exploitation, sexual abuse, kidnapping and grooming, retaining report data for the period set out in art. 15 of the Marco Civil [DOC F13 art. 27 and §2º];
   - the Federal Police receives the reports; immediate removal with preservation; deletion after receipt is confirmed [DOC F15 arts. 36, 37 and 39 §§1º and 2º];
   - prohibition on monetizing or boosting content that portrays children in an eroticized way [DOC F13 art. 23];
   - prohibition on distributing content that exposes children to humiliating or degrading situations [DOC F15 art. 35];
   - judicial authorization for monetized or boosted content that habitually exploits a child's image or routine [DOC F15 art. 34];
   - measures against misuse of reporting [DOC F13 art. 32].
   - **[HIP]** In the MVP community: no baby photos, no creator monetization and a ready child abuse response flow.
5. **Penalties** [DOC F13 art. 35]: warning; fine of up to 10% of revenue in Brazil or, without revenue, R$ 10 to R$ 1.000 per registered user, capped at R$ 50 million per violation; suspension and prohibition by the courts. Obligations are adjusted according to features, user numbers and size [DOC F13 art. 39].

### 3.4 Store age signals

- Stores and operating systems must assess age and provide an age signal through an API, using only the minimum necessary, without date of birth or identity [DOC F13 art. 12; F15 art. 25 §1º]. If the provider's own assessment differs from the signal, the more protective alternative applies [DOC F15 art. 25 §4º]. Receiving the signal does not exempt the supplier [DOC F15 art. 26 §3º].
- **Apple:** Declared Age Range API provides the age category of users in Brazil when the user or guardian agrees to share it. Since 24/02/2026, the App Store blocks downloads of 18+ apps in Brazil by anyone not confirmed to be an adult [DOC F31].
- **Google:** Play Age Signals API has returned signals for users in Brazil since 17/03/2026, for use only in age-appropriate experiences (no advertising, profiling or analytics). Play blocks or filters 18+ apps for minors in Brazil [DOC F46; F47].

## 4. Marco Civil da Internet, STF and decrees of 2026 (relevant to the community)

### 4.1 Access records

- An application provider **established as a legal entity**, operating in an organized, professional manner for economic purposes, keeps access records **for 6 months**, confidentially, in a controlled and secure environment [DOC F16 art. 15]. For other providers, a court order may require retention for a fixed period [DOC F16 art. 15 §1º].
- Retention includes the **source port** when needed to identify the terminal (Decree 12.975/2026) [DOC F17 art. 15-A; F18].
- Security standards: strict access control, strong authentication to access records, a detailed access inventory (time, duration, person responsible, file) and encryption or an equivalent measure [DOC F17 art. 13 I to IV].
- **[HIP]** For an individual, art. 15 may not impose an obligation, but ECA Digital requires retaining abuse report data for the same period [F13 art. 27 §2º]. Retaining it for 6 months is advisable in any case.

### 4.2 Liability for third-party content: art. 19 and STF

- Art. 19 provided for civil liability only after failure to comply with a specific court order [DOC F16 art. 19].
- STF, **Themes 987 and 533**: merits decided on 26/06/2025, minutes published on 05/08/2025; **motions for clarification concluded on 17/06/2026, with the judgment final** [DOC F21]. The final wording of the holding [DOC F20]:
  - art. 19 **partially unconstitutional**; until a new law is enacted, the provider is liable under art. 21 for third-party crimes or unlawful acts, **except where reasonable doubt remains after qualified diligence** (item 3); the same rule applies to inauthentic accounts (3.1);
  - **crimes or unlawful acts against honor**: the court order requirement remains (art. 19), without preventing removal following an extrajudicial notification (3.2);
  - **duty of care** against the circulation of serious crimes, in an exhaustive list that includes crimes against women (e) and sexual crimes against vulnerable persons, child pornography and serious crimes against children (f). Liability arises from **systemic failure**; adequate measures are those providing "the highest levels of safety" for the type of activity (5, 5.1 to 5.3);
  - additional duties: self-regulation with a **notification system, due process and annual transparency reports**; channels for users and non-users; published and reviewed rules; **headquarters and a representative in Brazil, who must be a legal entity** (7 to 10);
  - effects from 05/08/2025, covering ongoing acts; **60 days**, counted from the minutes of the motions for clarification, to implement the duty of care in item 5 (13 and 14);
  - art. 19 continues to apply to providers "that do not interfere with the flow of communication and information" (3.4 "d"). **[HIP]** A community with moderation and content ordering would be unlikely to fit this description.

### 4.3 Decrees 12.975 and 12.976/2026

Both dated 20/05/2026, published in the DOU on 21/05/2026, taking effect 60 days after publication: **in force on 22/10/2026** [DOC F18 art. 2º; F19 art. 15]. The ANPD regulates and enforces them [DOC F17 art. 19-A; F19 art. 14].

- **Decree 12.975** adds providers' duties to Decree 8.771 [DOC F18]:
  - headquarters and a legal representative in the country, established as a legal entity, and a permanent reporting channel (art. 16-A);
  - systemic failure (art. 16-B) and systemic risk management (art. 16-C);
  - notification requirements, under penalty of invalidity (art. 16-D);
  - acknowledgment and communication of the decision to the notifier and author, with a means of appeal (art. 16-E);
  - measures against notification abuse (art. 16-F);
  - disable criminal content after notification, except offenses against honor (art. 16-G), and forward anything identified as a crime to public authorities (art. 16-H);
  - honor-related matters require a court order (art. 16-J);
  - terms and self-regulation with a notification system, due process and an annual report (art. 20-A);
  - the authority **may** set different criteria for small providers, which still depends on regulations (art. 16-P).
- **Decree 12.976** (protection of women; the community will have many mothers) [DOC F19]:
  - notice about **Ligue 180** in the notification area (art. 5º §1º);
  - removal of unauthorized intimate content **within 2 hours** after notification, with tagging to block reuploads and a dedicated reporting area (art. 7º);
  - reduction in the reach of coordinated attacks, on the provider's own initiative (art. 8º);
  - until regulations are issued: **6 hours** for manifestly illegal content against women, **24 hours** for other cases and 24 hours to decide an appeal (art. 12).
- **[HIP]** Deadlines measured in hours require on-call coverage or automatic precautionary removal upon receipt of a qualified report. This affects moderation staffing, covered in planned doc `04_Comunidade_Conteudo/Comunidade_e_Moderacao.md`.

### 4.4 Consumer Protection Code (if there is a subscription)

- For contracts made outside business premises, consumers may withdraw within **7 days** and receive a refund of what they paid [DOC F22 art. 49].
- **[HIP]** With billing through the stores, refunds follow Apple's or Google's flow, but the app remains a supplier under the CDC. Validate the wording of the terms.
- On Play, those selling in Brazil provide company details, beneficiaries and CPF or CNPJ to receive payouts [DOC F47].

## 5. Apple App Store

Guidelines consulted with "Last Updated: October 16, 2026" [F23].

| Requirement | Official text (summary) [DOC] | Application to AppMaternidade [HIP] |
| --- | --- | --- |
| 1.2 UGC | Filter objectionable content; reporting with a timely response; blocking abusive users; published contact details. The developer removes content that violates the rules [F23]. | Mandatory for the community in the MVP. |
| 1.3 Kids Category | For apps made for children, with a parental gate and no third-party analytics or advertising, except for exceptions; requirements continue even after deselecting the category [F23]. | **Does not apply and must not be selected**: users are adults. 2.3.8 reserves "For Kids" and "For Children" for the category, so the listing must address parents and caregivers [F23 2.3.8]. |
| 1.4.1 Health | Medical apps with a risk of inaccurate data face stricter review; disclose data and methodology supporting accuracy claims; remind users to consult a doctor [F23]. | Sleep estimates or alerts must state assumptions and limitations and suggest seeking a professional. |
| 1.5 and 1.6 | Easy contact in the app and at the Support URL; adequate security against unauthorized use or access [F23]. | Support and privacy channel. |
| 2.3.6 Age rating | Answer the questionnaire honestly [F23]. The questionnaire includes user-generated content, medical or wellness information, parental controls and age assurance; there is a regional rating for Brazil (MJSP) [F32]. | Declare community and health content. The resulting rating affects who can download. |
| 4.8 Login | If using social login for the primary account, offer an equivalent option that limits data to name and email, allows email to be hidden and does not track without consent. Exemption if the app only uses its own account system [F23]. | Google login requires Sign in with Apple or an equivalent; the app's own email or passkey login is exempt. |
| 5.1.1(i) Policy | Link in App Store Connect and in the app; data collected, uses, third parties with equivalent protection, retention and deletion, how to withdraw consent [F23]. | Single pt-BR policy covering the LGPD and stores. |
| 5.1.1(ii) Permission | Consent to collect user or usage data, even "anonymous" data; easy withdrawal; paid functionality does not depend on it [F23]. | Opt-in analytics. |
| 5.1.1(iii) and (iv) Minimization | Only data relevant to the core function; prefer the system Photos picker; do not force consent [F23]. | Photo picker; no full gallery access. |
| 5.1.1(v) Account | Apps that support account creation must offer deletion in the app [F23]. Deletion removes the account record and associated data, including shared UGC; deactivation is not enough; a lengthy process is accepted if disclosed; reauthentication is allowed; revoke Sign in with Apple tokens; warn about subscriptions [F24]. | Deletion initiable in Configurações; community posts deleted; deadlines disclosed. |
| 5.1.1(ix) Regulated industries | Apps in regulated industries (including *healthcare*) "or that require sensitive information" **must be submitted by a legal entity**, not an individual developer [F23]. | Strong reason to publish as an organization. |
| 5.1.2 Use and sharing | Permission before use or sharing, **including with third-party AI**; ATT for tracking; do not require push, location or tracking to use the app; no new use without consent [F23]. | Optional push; future AI only with explicit permission. |
| 5.1.3 Health | Data in a health context cannot be used for advertising or data mining; **do not store personal health information in iCloud** [F23]. | Do not use CloudKit or iCloud for the baby's records. Assess excluding the local database from iCloud backup. |
| 5.1.4 Children | Take care with minors' data; anyone collecting a minor's personal data needs a policy and must comply with children's privacy laws [F23]. | Comply with LGPD art. 14; no advertising SDKs. |
| Privacy labels | Declare data collected in App Store Connect, including through SDKs; "collect" means transmitting off the device beyond servicing a request in real time; free text falls under "Other User Content"; uploaded photos must be declared [F25]. | Complete based on the data and SDK inventory. |
| Privacy manifest | `PrivacyInfo.xcprivacy` with data types, tracking and *required reason APIs* [F27]; reasons by API category; *fingerprinting* prohibited [F28]. Listed SDKs (Firebase, Flutter, React Native's `hermes`, OneSignal and others) require a manifest and signature [F29]. | The choice of stack and SDKs affects this requirement. Check versions with manifests. |
| ATT | Permission to track (combine data with other companies' data for advertising or pass it to *data brokers*); without permission, the advertising identifier is zeroed [F26]. | Without advertising or tracking, there is no ATT prompt and `NSPrivacyTracking` is false. |
| Developer account | **Individual**: personal legal name appears as the seller. **Organization**: legal entity (no trade name), **D-U-N-S**, public website with its own domain, domain email. 99 USD per year [F30]. | See decision 1. |

## 6. Google Play

| Requirement | Official text (summary) [DOC] | Application to AppMaternidade [HIP] |
| --- | --- | --- |
| Data safety | Mandatory for every published app, including closed or open testing. Declares collection, sharing, encryption in transit and deletion, including SDKs. Types include "Health info". Distinguishes service providers from third parties and ephemeral processing [F33]. | Declare health data, photos, identifiers, crashes. Cloud providers as *service providers*. |
| User Data policy | Use limited to what is expected; **modern encryption in transit**; **do not sell** personal and sensitive data; policy in the Console and app with contact details, data types, third parties, security, retention and deletion; applies to third-party AI integrations [F34]. | Public policy not in PDF format; no sales; future AI covered. |
| Account deletion | Path in the app **and** a web link that works without reinstalling the app; delete associated data; freezing is not enough; disclose retention; request deletion from service providers; deletion questions in Data safety [F35; F34]. | Account deletion web page with the app and developer names. |
| Health apps declaration | Mandatory for **all** apps, even without a health feature. Categories include Sleep Management, Nutrition and Weight Management and other medical categories [F36]. | Declare sleep and nutrition categories. Not a medical device. |
| Health: content and services | Privacy policy and prominent disclosure; no unnecessary health permissions; health apps that are not medical devices include a disclaimer that they are **"not a medical device and does not diagnose, treat, cure, or prevent any medical condition"** and a reminder to seek a professional [F37]. Health and fitness are distinct from medical and research apps [F38]. | Disclaimer in the description and app. |
| Account type | Personal and organization accounts have the same features. **Organization is recommended** for financial services and "Health apps, such as Medical apps and Human Subjects Research apps"; requires **D-U-N-S** [F42]. | The app is likely "health and fitness", not "medical". Organization is still the safer choice. |
| Testing for new personal accounts | Personal accounts created after 13/11/2023: **closed test with at least 12 testers, continuously opted in for 14 days**, before applying for production [F43]. | With a personal account, plan for 12 real testers. |
| Target audience | An audience that includes children follows the Families Policy. An audience of only 18+ allows **Restrict Minor Access** to be enabled. A listing with elements that appeal to children may be rejected [F40]. | If 18+, enable the restriction. Listing artwork without a child-oriented aesthetic. |
| UGC | Acceptance of terms before posting; definition of objectionable content; ongoing moderation; in-app reporting and blocking; monetization safeguards [F39]. | Same as Apple's 1.2. |
| Child safety standards | Mandatory for apps in the **Social** or **Dating** categories and anonymous or random chats: published standards against child abuse, in-app mechanism, handling of abuse material, child safety contact [F41]. | If the category is Social, it falls within scope. Even outside it, adopt these because ECA Digital art. 27 requires something similar. |
| Target API | Since **31/08/2026**, new apps and updates must target **Android 16 (API 36)**; extension until 01/11/2026 [F44]. | Account for the 2027 requirement in the schedule. |
| Android developer verification | Since **30/09/2026**, in **Brazil**, Indonesia, Singapore and Thailand, apps installed on certified devices must be registered by a verified developer [F45]. | Affects test APKs distributed outside Play. |
| ECA Digital on Play | The developer determines how ECA Digital applies. Play Age Signals is available; IARC/ClassInd reclassification may be necessary [F47]. | See section 3.4. |

## 7. Security and operations: what changes in the architecture

| Topic | Basis [DOC] | Proposal [HIP] |
| --- | --- | --- |
| Minimization | Necessity [F01 art. 6º III]; do not request more than necessary [F01 art. 14 §4º]; Apple 5.1.1(iii) [F23] | Baby's nickname; date of birth only in the private space; community shows a stage range, never the date; no CPF; no location; limited free text with a notice. |
| Encryption in transit | Play requires modern encryption [F34]; Apple 1.6 [F23] | TLS everywhere, including attachment downloads with signed, short-lived URLs. |
| Encryption at rest (server) | Security [F01 art. 46]; encryption of records [F17 art. 13 IV] | Provider encryption enabled; managed keys; private bucket separated by family. |
| Encryption on the device | Security [F01 art. 46]; Apple 5.1.3(ii) [F23] | iOS data protection and Android encrypted storage; assess an encrypted local database; do not use iCloud for the baby's data. |
| Family isolation | Security and structured systems [F01 arts. 46 and 49] | Server-side authorization for every operation, including sync channels, files and push; cross-family access tests (scenario Q-06). |
| Backups and restoration | ANPD security guide: regular, complete backups in a separate location [F12] | Automatic backups with a defined window (for example, 35 days); documented restoration test; **reapply deletions** after restoring to avoid bringing deleted data back. |
| Logs | Access records for 6 months, confidentially [F16 art. 15]; access inventory [F17 art. 13 III]; retain the minimum [F17 art. 13 §2º] | Separate access records (IP, port, timestamp; 6 months; restricted access) from application logs **without content** (no names, notes or payloads); scrub crash reports. |
| Administrative access | Strict control, two-factor authentication and inventory [F17 art. 13 I to III]; least privilege and non-shared accounts [F12] | Mandatory MFA; minimal roles; audit trail; **moderators cannot see the family space**; emergency access recorded and reviewed. |
| Incidents | 3 business days, minimum content and 5-year records [F04] | Response playbook; quick count of affected babies and adults; notice templates; named person responsible. |
| Push notifications | APNs and FCM pass through store servers; LGPD arts. 6º III and 46 [F01] | Generic text ("Novo registro em Família"), without the baby's name or health content; details only after opening the authenticated app; configurable preference. |
| Export | Access and complete copy in a reusable format [F01 arts. 18 and 19 §3º] | JSON and CSV export plus attachments, requested by the legal guardian; caregivers export only their own data and what they can see (validate). |
| Propagated deletion | Deletion [F01 art. 16]; notify recipients of shared data [F01 art. 18 §6º]; Apple [F24]; Play [F35] | Deletion job covering the database, files, indexes, caches and CDN, analytics, subprocessors and backups (which expire); deletion markers for offline devices; published deadlines (for example, 30 days in the main database and 35 in backups); confirmation to the user. |
| Community after account deletion | Apple requires deleting shared UGC [F24]; legal retention [F16 art. 15; F13 art. 27 §2º] | Delete the author's posts and replies; keep third-party topics with "[removido]"; retain only what is necessary under a legal obligation (access records, abuse reports, court order), isolated and with a deadline. |
| Adult child | The data subject is the baby [F01 art. 5º V] | Open question: allow the child in the future to access, receive or delete their own childhood data? |

## 8. Consent and transparency to assess

| Moment | What to show or request | Basis [DOC] and note [HIP] |
| --- | --- | --- |
| Account creation | Terms and policy (layered summary); minimum age; who the controller is and how to contact the DPO. | F01 arts. 9º and 41; F23 5.1.1(i); F34. |
| Baby registration | Dedicated screen: what will be recorded, why, who will see it, for how long, how to withdraw; declaration of being the father, mother or legal guardian; evidence recorded. | F01 arts. 8º, 11 I and 14 §§1º, 5º and 6º. Do not combine with acceptance of the terms. |
| Caregiver invitation | For the inviter: what the invitee will see and do according to their role, and that data already downloaded may remain on their device even after revocation. For the invitee: that their name and authorship are visible to the family and what happens if they leave. | F01 art. 9º. Technical limit of offline revocation: see [Offline, synchronization and timers](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) (scenario Q-05). |
| Posting in the community | Exact preview of what will be posted; nothing from the routine is included automatically; removal of image metadata; notice that content is visible to others. | Fixed task requirement; F13 art. 23 and F15 art. 35 for images of children. |
| Analytics and crashes | Separate and reversible opt-in; no baby data in events. | F23 5.1.1(ii); F34. |
| Notifications | Explain before the system request; the app works without push. | F23 5.1.2(i). |
| Photos | System picker, per item. | F23 5.1.1(iii). |
| Future AI | Explicit consent before sending data to third-party AI; review of the RIPD and transfer; possible review of automated decisions. | F23 5.1.2(i); F34; F01 art. 20; ANPD regulatory action on AI underway [F10 item 6]. |
| Change of purpose | Prominent notice and option to withdraw. | F01 arts. 8º §6º and 9º §2º. |

## 9. Pre-launch checklist

Each item is verifiable and has a source. "Verify" means producing evidence (document, screen, test or record), not declaring compliance.

**Governance and LGPD**
- [ ] Controller defined (individual or legal entity) and identified with contact details in the policy [F01 art. 9º III and IV].
- [ ] Small processing agent classification assessed against high risk and documented [F05 arts. 3º and 4º].
- [ ] DPO appointed through a formal act and disclosed, or equivalent channel if the exemption is valid [F06 arts. 3º and 9º; F05 art. 11].
- [ ] Processing operations record ready [F01 art. 37; F05 art. 9º].
- [ ] RIPD completed **before** actual processing, covering baby data, community and transfers [F01 art. 38; F11].
- [ ] Map of legal bases by purpose validated by a lawyer [F01 arts. 7º and 11; F03].
- [ ] Specific parental consent screen, with evidence retained and free withdrawal [F01 arts. 8º and 14 §1º].
- [ ] Public privacy policy in pt-BR, covering children's data and rights procedures [F01 art. 14 §2º; F23 5.1.1(i); F34].
- [ ] Rights flows tested: immediate access, statement within 15 days, correction, deletion, withdrawal [F01 arts. 18 and 19].
- [ ] Inventory of providers, regions and subprocessors, with transfer mechanism and Portuguese page [F01 art. 33; F07 arts. 16 and 17; F08].
- [ ] Processor agreements covering instructions, security and deletion [F01 art. 39; F12].
- [ ] Retention and deletion policy published, consistent with the Marco Civil [F01 arts. 15 and 16; F16 arts. 7º X and 15].
- [ ] No sharing of health data for economic advantage and no advertising SDKs [F01 art. 11 §4º; F34].

**ECA Digital**
- [ ] Legal opinion on "likely access" and documented minimum age decision [F13 art. 1º sole paragraph; F10 item 13].
- [ ] If 18+: age signals integrated and minors restricted on Play [F31; F46; F40].
- [ ] If accepting adolescents: protective settings, parental supervision, account linking for those up to 16 years old and impact assessment [F13 arts. 7º, 17, 18 and 24; F15 art. 47].
- [ ] Flow for removing, preserving and reporting child abuse content to the Federal Police [F13 art. 27; F15 arts. 36 to 39].
- [ ] Rule on images of children in the community, with no monetization of content featuring children [F13 art. 23; F15 arts. 34 and 35].
- [ ] Measures against misuse of reporting [F13 art. 32].

**Community and Marco Civil**
- [ ] Terms, rules, notification system, due process and annual report published [F20 items 7 to 9; F17 art. 20-A].
- [ ] Permanent reporting channel for users and non-users [F20 item 8; F17 art. 16-A II].
- [ ] Flows and deadlines by type: crimes in general, serious crimes, honor, intimate content within 2 h, Ligue 180 notice and deadlines of 6 h and 24 h [F20 items 3 and 5; F17 arts. 16-G and 16-J; F19 arts. 5º, 7º and 12].
- [ ] Access records retained for 6 months, with source port, confidentially [F16 art. 15; F17 art. 15-A].
- [ ] Headquarters and representative in Brazil, according to the form of operation [F20 item 10; F17 art. 16-A I].

**Security and operations**
- [ ] TLS everywhere and encryption at rest confirmed with the provider [F34; F17 art. 13 IV].
- [ ] Automated family isolation tests, including attachments, sync and push [F01 arts. 46 and 49].
- [ ] Automatic backups and tested, documented restoration [F12].
- [ ] MFA and audit trail for all administrative access [F17 art. 13 I to III].
- [ ] Logs and push without sensitive content, verified by sampling [F01 arts. 6º III and 46].
- [ ] Propagated deletion and export tested end to end, with published deadlines (scenario Q-12) [F01 arts. 16 and 18; F24; F35].
- [ ] Incident playbook rehearsed, with an active incident register [F04 arts. 6º, 9º and 10].

**Apple**
- [ ] Organization account with D-U-N-S, or risk accepted and documented [F23 5.1.1(ix); F30].
- [ ] Account deletion initiable in the app, UGC deleted, deadlines disclosed, Sign in with Apple tokens revoked [F24].
- [ ] Privacy labels consistent with the inventory [F25].
- [ ] `PrivacyInfo.xcprivacy` with *required reason APIs*; SDKs with manifests and signatures [F27; F28; F29].
- [ ] No tracking, or ATT implemented [F26].
- [ ] Community with filtering, reporting, blocking and contact details [F23 1.2].
- [ ] Equivalent login if social login is offered [F23 4.8].
- [ ] Health texts with methodology and a notice to seek a professional; no health data in iCloud [F23 1.4.1 and 5.1.3].
- [ ] Age questionnaire answered honestly; no Kids Category; metadata without "for children" [F23 1.3, 2.3.6 and 2.3.8; F32].

**Google Play**
- [ ] Organization account with D-U-N-S, or personal account with a closed test of 12 testers for 14 days [F42; F43].
- [ ] Data safety complete, including deletion and encryption [F33].
- [ ] Deletion in the app and through a web link, with associated data deleted [F35].
- [ ] Health apps declaration and disclaimer that it is not a medical device [F36; F37].
- [ ] Target audience declared and listing without child appeal [F40].
- [ ] UGC requirements met [F39].
- [ ] Category chosen deliberately: if Social, child safety standards [F41].
- [ ] `targetSdk` 36 or the requirement in force on the date [F44].
- [ ] Android developer verification for builds outside Play [F45].
- [ ] Merchant requirements in Brazil, if there are sales [F47].

**Consumer protection**
- [ ] If there is a subscription: right of withdrawal and cancellation described, aligned with the stores [F22 art. 49; F24].

## 10. Decisions that depend on Daniel

| # | Decision | Options | Hermes's recommendation [HIP] and impact |
| --- | --- | --- | --- |
| 1 | Who publishes and controls the data | Individual vs. legal entity | **Legal entity before opening to the public.** Reasons: Apple 5.1.1(ix) [F23]; Play recommends an organization for health [F42]; the Marco Civil refers to a legal entity [F16 art. 15]; the STF requires a legal entity representative [F20 item 10]. Costs: incorporation, accounting, D-U-N-S, website with a domain. As an individual, Daniel's legal name appears as the seller on Apple [F30]. |
| 2 | Initial country | Brazil only vs. several | **Brazil only at launch**, to avoid GDPR, COPPA and US state laws before having the necessary structure. |
| 3 | Where the data is stored | Brazil vs. EU vs. US | **Brazil region**, with transparency about global services. The EU is an adequate alternative [F08]. The US requires standard contractual clauses without changes [F07]. |
| 4 | Minimum user age | 18+ vs. accepting adolescents | **18+ in the MVP**, with age signals and store restrictions. Record that teenage mothers and fathers are excluded until there is a dedicated design [F13 art. 24]. |
| 5 | Community in the MVP | Text vs. images included | **Text only, no baby photos**, until moderation can meet deadlines measured in hours [F19 art. 7º; F13 art. 27]. |
| 6 | Monetization | Advertising vs. subscription vs. free | **No behavioral advertising** (art. 11 §4º, ATT, ECA Digital). Store subscriptions require CDC art. 49 and merchant details in Brazil [F22; F47]. |
| 7 | Analytics and crashes | None vs. opt-in vs. default | **Opt-in** for analytics; crash reports with content scrubbing, basis to validate. |
| 8 | DPO | Daniel vs. external person vs. company | A person with time and independence, or an external service [F06 arts. 10 and 12]. |
| 9 | Retention periods | Define | Initial proposal: data while the account is active; notice and deletion after prolonged inactivity; 35-day backups; access records for 6 months. Validate. |

## Fontes

All accessed on: 22/10/2026 (America/Sao_Paulo). All are official sources; material drawn from them is marked [DOC].

| ID | Source | Type | URL |
| --- | --- | --- | --- |
| F01 | Law No. 13.709/2018 (LGPD), consolidated text — Planalto | Law or decree (official text) | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm |
| F02 | Law No. 15.352/2026 (ANPD as an Agency; ECA Digital effective date) — Planalto | Law or decree (official text) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/Lei/L15352.htm |
| F03 | CD/ANPD Statement No. 1/2023 (children's and adolescents' data) — DOU | ANPD act in the DOU | https://www.in.gov.br/en/web/dou/-/enunciado-cd/anpd-n-1-de-22-de-maio-de-2023-485306934 |
| F04 | CD/ANPD Resolution No. 15/2024 (incident notification) — DOU | ANPD act in the DOU | https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-15-de-24-de-abril-de-2024-556243024 |
| F05 | CD/ANPD Resolution No. 2/2022 (small processing agents) — DOU | ANPD act in the DOU | https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019 |
| F06 | CD/ANPD Resolution No. 18/2024 (DPO) — DOU | ANPD act in the DOU | https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-18-de-16-de-julho-de-2024-572632074 |
| F07 | CD/ANPD Resolution No. 19/2024 (international transfers and standard contractual clauses) — DOU | ANPD act in the DOU | https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-19-de-23-de-agosto-de-2024-580095396 |
| F08 | CD/ANPD Resolution No. 32/2026 (European Union adequacy) — DOU | ANPD act in the DOU | https://www.in.gov.br/web/dou/-/resolucao-n-32-de-26-de-janeiro-de-2026-683334547 |
| F09 | ANPD regulations (list and status) — gov.br/anpd | Official ANPD page | https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd |
| F10 | Regulatory Agenda 2025-2026, progress updated on 20/10/2026 — gov.br/anpd | Official ANPD page | https://www.gov.br/anpd/pt-br/assuntos/regulacao/agenda-regulatoria-1 |
| F11 | Questions and answers about RIPD — gov.br/anpd | Official ANPD page | https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd |
| F12 | Information security guidance for small processing agents (2021) — gov.br/anpd | Official ANPD page | https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-vf.pdf/@@display-file/file |
| F13 | Law No. 15.211/2025 (ECA Digital) — Planalto | Law or decree (official text) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm |
| F14 | Decree No. 12.622/2025 (ANPD as the ECA Digital authority) — Planalto | Law or decree (official text) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/Decreto/D12622.htm |
| F15 | Decree No. 12.880/2026 (implements ECA Digital) — Planalto | Law or decree (official text) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/Decreto/D12880.htm |
| F16 | Law No. 12.965/2014 (Marco Civil da Internet) — Planalto | Law or decree (official text) | https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm |
| F17 | Decree No. 8.771/2016 (Marco Civil regulations, with amendments from 2026) — Planalto | Law or decree (official text) | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/decreto/d8771.htm |
| F18 | Decree No. 12.975/2026 (application providers' duties) — Planalto | Law or decree (official text) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D12975.htm |
| F19 | Decree No. 12.976/2026 (protection of women on the internet) — Planalto | Law or decree (official text) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D12976.htm |
| F20 | STF — final wording of the holding in Themes 987/533 (17/06/2026) | STF (holding or official news) | https://noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com/wp-content/uploads/wpallimport/uploads/2026/06/17180658/MCI_tese.pdf |
| F21 | STF — news of 17/06/2026 on motions for clarification and the 60-day deadline | STF (holding or official news) | https://noticias.stf.jus.br/postsnoticias/plataformas-terao-60-dias-para-implementar-medidas-estruturais-decide-stf |
| F22 | Law No. 8.078/1990 (CDC), consolidated text — Planalto | Law or decree (official text) | https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm |
| F23 | Apple — App Review Guidelines (last updated 16/10/2026) | Apple (guideline or documentation) | https://developer.apple.com/app-store/review/guidelines |
| F24 | Apple — 5.1.1(v) Offering account deletion in your app | Apple (guideline or documentation) | https://developer.apple.com/support/offering-account-deletion-in-your-app |
| F25 | Apple — App privacy details on the App Store (Privacy Nutrition Labels) | Apple (guideline or documentation) | https://developer.apple.com/app-store/app-privacy-details |
| F26 | Apple — User privacy and data use (App Tracking Transparency) | Apple (guideline or documentation) | https://developer.apple.com/app-store/user-privacy-and-data-use |
| F27 | Apple — Privacy manifest files | Apple (guideline or documentation) | https://developer.apple.com/documentation/bundleresources/privacy-manifest-files |
| F28 | Apple — Describing use of required reason API | Apple (guideline or documentation) | https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api |
| F29 | Apple — Third-party SDK requirements | Apple (guideline or documentation) | https://developer.apple.com/support/third-party-SDK-requirements |
| F30 | Apple — Apple Developer Program: Become a member (individual vs. organization) | Apple (guideline or documentation) | https://developer.apple.com/programs/enroll |
| F31 | Apple — Age requirements for apps distributed in Brazil, Australia, Singapore, Utah, and Louisiana (24/02/2026) | Apple (guideline or documentation) | https://developer.apple.com/news/?id=f5zj08ey |
| F32 | Apple — Age ratings values and definitions | Apple (guideline or documentation) | https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions |
| F33 | Google Play — Data safety section | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/10787469?hl=en |
| F34 | Google Play — User Data policy | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/10144311?hl=en |
| F35 | Google Play — App account deletion requirements | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/13327111?hl=en |
| F36 | Google Play — Health apps declaration form | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/14738291?hl=en |
| F37 | Google Play — Health Content and Services policy | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/12261419?hl=en |
| F38 | Google Play — Health app categories and additional information | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/13996367?hl=en |
| F39 | Google Play — User Generated Content policy | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/9876937?hl=en |
| F40 | Google Play — Target audience and app content settings | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/9867159?hl=en |
| F41 | Google Play — Child Safety Standards policy (FAQ) | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/14747720?hl=en |
| F42 | Google Play — Choose a developer account type | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/13634885?hl=en |
| F43 | Google Play — App testing requirements for new personal developer accounts | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/14151465?hl=en |
| F44 | Google Play — Target API level requirements | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/11926878?hl=en |
| F45 | Android — Android developer verification (guide) | Google Play or Android (policy or help) | https://developer.android.com/developer-verification/guides |
| F46 | Android — Play Age Signals overview | Google Play or Android (policy or help) | https://developer.android.com/google/play/age-signals/overview |
| F47 | Google Play — Requirements for distributing apps in specific countries/regions (Brazil, ECA Digital) | Google Play or Android (policy or help) | https://support.google.com/googleplay/android-developer/answer/6223646?hl=en |
| F48 | Regulation (EU) 2016/679 (GDPR) — EUR-Lex | EU regulation | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679 |
| F49 | FTC — Children's Online Privacy Protection Rule (COPPA) | FTC (rule or FAQ) | https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa |
| F50 | FTC — Complying with COPPA: Frequently Asked Questions | FTC (rule or FAQ) | https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions |

## Questions for legal validation

1. Are sleep, feeding and diaper records "data concerning health" (art. 5º II)? Which basis should be used for them and for health notes: consent (arts. 11 I and 14 §1º) or performance of a contract and exercise of rights (arts. 7º V and 11 II "d"), in light of CD/ANPD Statement No. 1/2023?
2. Consent from "at least one parent": how should withdrawal or deletion requested by one guardian against the other's wishes be handled (joint custody, separation), and what is the role of someone with de facto custody but no parental authority?
3. Are invited caregivers only users or also controllers (art. 4º I)? Does a family inviting third parties create "shared use"?
4. When deleting a caregiver's account, is retaining the baby's records with anonymized authorship compatible with the LGPD, Apple 5.1.1(v) and Play policy?
5. Is the app, with its community, "likely to be accessed" by adolescents (ECA Digital, art. 1º sole paragraph)? Is a minimum age of 18 with store signals enough to exclude applicability? What level of age assurance would be required?
6. Can the operator use the small processing agent regime, given the high-risk criterion (Res. 2/2022, arts. 3º and 4º)?
7. Is operating as an individual viable in light of Marco Civil art. 15, the STF holding (item 10) and Decree 12.975 (art. 16-A I)?
8. Which duties under the STF ruling and Decrees 12.975 and 12.976 apply to a small provider while the differentiated criteria (art. 16-P) remain unregulated? Do the deadlines of 2 h, 6 h and 24 h apply in full?
9. Do the chosen providers' data protection addenda incorporate the ANPD's standard contractual clauses without changes (Res. 19/2024, art. 16)?
10. How should the right of withdrawal (CDC art. 49) be worded when billing is handled by Apple or Google?
11. What rights will the child have, as they grow up, over their own childhood data, and how does this affect retention and export?
12. Baby photos in the private space and, if ever allowed, in the community: the child's image rights and ECA Digital limits (art. 23 of the law; arts. 34 and 35 of the decree).

## Open questions

- Which health data is included in the MVP: temperature, medication, weight, or routine only?
- Concrete deletion and backup deadlines that the chosen provider can meet and prove.
- Encrypting the local database and handling keys when a membership is revoked offline.
- Which crash reporting and analytics provider (or none), and with what content scrubbing.
- Export format and who may export the baby's history.
- How to reasonably verify that the person creating the baby profile is the father, mother or legal guardian (art. 14 §5º).
- Moderation capacity for deadlines measured in hours and a weekend plan.
- Store category (Parenting, Health & Fitness or another) and its effect on age ratings and applicable policies.
- Expansion: if it happens, review GDPR (arts. 3º(2), 8, 9 and 27) [F48] and COPPA. COPPA covers services directed at children under 13 or with actual knowledge of collecting data from them [F49]. The FTC FAQ says it does **not** apply to information about children collected from parents or adults [F50]. Therefore, COPPA would probably not apply to an adults-only app [HIP], but a service may be considered directed at children even if its terms prohibit them [F50]. US state laws were not researched. Under the GDPR, the age in art. 8º (16 years, or as low as 13 under national law) only matters if the service is offered directly to children [F48 art. 8º].

## Limits of this analysis

- This is not a legal opinion. Interpretations marked [HIP] require a lawyer experienced in the LGPD, ECA Digital and platforms.
- The summaries of LGPD arts. 33, 37 to 41 and 46 to 49 must be checked directly against the Planalto text [F01] before use. During this run, automated extraction of these articles was blocked by the approval control and the text was ultimately read through another method; this was reported to the coordinator.
- Official sources accessed on 22/10/2026. Store policies and the ANPD Agenda change frequently; check them on the submission date.
- Some ANPD news pages were restricted during the election period (for example, the one about the call for input on age assurance returned "Restricted Content"). The status of these actions came from the Regulatory Agenda page [F10].
- I did not read in full the standard contractual clauses annex to Res. 19/2024, the Statute of the Child and Adolescent (Law 8.069/1990), the Civil Code (capacity and parental authority), Decree 7.962/2013 or Law 14.852/2024. The Play Families Policy page did not load; I used the target audience page [F40].
- I did not check cloud providers' contracts, addenda, regions or subprocessors, or prices.
- I did not assess other countries' laws beyond GDPR and COPPA, and only on specific points.
- ANPD guides on the scope of ECA Digital and age assurance are not yet final; conclusions about "likely access" may change when they are published.
