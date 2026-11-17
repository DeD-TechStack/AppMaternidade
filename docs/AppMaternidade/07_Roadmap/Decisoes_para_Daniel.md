---
tipo: decisions
status: proposal
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-11-03
tarefa: MAT-15
fontes_principais:
  - 03_Arquitetura/Comparacao_de_Arquiteturas.md
  - 08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md (section 10)
  - 08_Referencias/Tecnologias/Precos_Datados.md
---

# Decisions for Daniel

Only decisions that significantly change the product, cost, or maintenance. Each includes options, Hermes's recommendation, the impact, what remains reversible, and when it needs to be made. D8 through D11 were made on 03/11/2026; D1 was deferred until the port; the others remain open.

To respond, just give the number and option (for example, "D1: A; D2: A; D3: A"), here in the conversation or in a comment on the corresponding task in itsaplan (column "Esperando Daniel", http://localhost:3001/oficina/MAT). Each answer is added to the corresponding ADR with a date, and the task changes status. Decisions D1, D2, and D3 block the technical proof of concept, MAT-17 (during the port); D4 blocks the foundation (MAT-18); D5 blocks the community slice (MAT-19); D6 does not block anything now; D7 was decided on 05/11/2026 (A), and pushing the repository, which is public, is authorized.

## Resumo

| ID | Task in itsaplan | Decision | Recommendation | Before |
| --- | --- | --- | --- | --- |
| D1 | MAT-20 | Mobile framework | React Native + Expo | Technical proof of concept (MAT-17) |
| D2 | MAT-21 | Data stack, backend, and region | Stack B: Supabase + PowerSync + a custom domain service, with care data in Brazil | Technical proof of concept (MAT-17) |
| D3 | MAT-22 | Publisher and store accounts | Legal entity; open Apple Developer and Google Play accounts when the proof of concept starts | First test build on iPhone |
| D4 | MAT-23 | MVP scope | 0 to 12 months, Brazil in pt-BR, adults 18+, text-only community, no generative AI for users, no ads | Foundation (MAT-18) |
| D5 | MAT-24 | People for content, moderation, and legal work | Licensed content reviewer, 1 or 2 part-time moderators during the pilot, consulting on the LGPD and ECA Digital | Launch of the community and content |
| D6 | MAT-25 | Monetization | Open; no targeted ads using routine data | Before the public pilot (does not block the next stage) |
| D7 | MAT-26 | Records of access tests on third-party projects | A: keep only on disk, outside Git, without contacting the maintainers | — (decided on 05/11/2026) |
| D8 | MAT-28 | Website stack | D8-A: React + TypeScript + Vite, Tailwind 4, shadcn/ui and Magic UI, Supabase and PWA; port through Capacitor | — (decided) |
| D9 | MAT-29 | Domain and hosting | GitHub Pages from the repository itself, with Supabase Free in the São Paulo region; custom domain later | — (decided) |
| D10 | MAT-30 | Impeccable detector | Local, non-blocking check with a pinned version | — (decided) |
| D11 | MAT-31 | REA and clean room | Reduced and declared clean room | — (decided) |

## D1 — Mobile framework

- **Status:** Deferred until the port (ADR-009).
- **Options:** (A) React Native + Expo; (B) Flutter; (C) Kotlin Multiplatform with native UI.
- **Recommendation:** A. Details in [ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md).
  - With EAS, the entire iOS cycle runs from Windows in an integrated workflow: build, signing, installation on iPhone, and TestFlight.
  - The Live Activity can be built without Swift.
  - Flutter and KMP can also reach TestFlight without owning a Mac, through macOS CI, but with a separately configured pipeline and the Live Activity in Swift.
  - Without a Mac, native debugging on iPhone is limited in all options.
- **Impact:** with A, there is no need to buy a Mac now (Apple US$ 99/year; EAS from US$ 0 to 19/month, prices as of 22/10/2026). B or C adds a Mac (starting at US$ 899), a remote Mac, or CI.
- **Reversible:** yes, until the foundation (MAT-18). The technical proof of concept is disposable.
- **What would change the recommendation:** the team gains access to a Mac, or accepts macOS CI and Swift for the Live Activity, and the proof of concept favors Flutter; failure of `expo-widgets` or accessibility in the proof of concept.

## D2 — Data stack, backend, and region

- **Status:** Partly answered by D8: Supabase backend in the São Paulo region. Native offline synchronization will be decided again during the port.
- **Options:** (A) Supabase + PowerSync + a custom domain service (Stack B); (B) custom API with custom synchronization (Stack C); (C) Firebase (Stack A).
- **Recommendation:** A. The write protocol (conflicts, permissions, revocation) stays under our control; the offline queue and partial downloads are provided out of the box; moving to option B does not require rebuilding the server. Details in [ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md) and the [Architecture comparison](../03_Arquitetura/Comparacao_de_Arquiteturas.md).
- **Impact:**
  - **Illustrative cost with 100 families:** US$ 108 to 126 per month, including the domain service ([Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md), section 2).
  - **Excluded from this amount:** PITR, recommended in production (+US$ 100/month), and staging (+US$ 10 to 50/month).
  - **Infrastructure-only comparison** ([Dated prices](../08_Referencias/Tecnologias/Precos_Datados.md), section 10; prices as of 22/10/2026): Stack B ~US$ 101, excluding the service; Firebase ~US$ 27; custom API ~US$ 64, which already includes the API on Cloud Run.
  - **Maintenance:** two critical providers and a custom service to maintain.
- **Reversible:** yes, until the foundation. After that, replacing PowerSync with option B remains possible without changing the database.
- **Region:** care data in Brazil (Supabase in São Paulo and PowerSync in the BR region; both offer these regions as checked on 22/10/2026). This reduces international transfers of potentially sensitive children's data. Prices for the Brazil regions have not been confirmed, and some subprocessors (push, email, crash reporting) may remain outside Brazil ([Privacy and security](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md)). Changing regions later requires moving the database.
- **Low-impact subdecision:** service language. Proposal: TypeScript, to maintain a single language; Django or Spring Boot are valid alternatives.

## D3 — Publisher and store accounts

- **Status:** Store accounts: only during the port.
- **Options:** (A) legal entity; (B) individual.
- **Recommendation:** A. Apple's guideline 5.1.1(ix) says that apps in regulated sectors, such as healthcare, or that require sensitive information must be submitted by a legal entity; Google recommends an organization account for health apps; the Brazilian Internet Civil Rights Framework and the STF's legal position also refer to a legal entity. Whether this applies to this app requires legal validation. See [Privacy, legal, and store research](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md).
- **Impact:** an organization account on Play does not have the closed-test requirement of 12 testers for 14 days, which applies to personal accounts created after 13/11/2023. Organization accounts in both stores require a D-U-N-S number, and Apple's also requires a website and email with a custom domain. As an individual, Daniel's legal name appears as the seller in the App Store. Setting up the company has its own costs (registration, accounting), which have not been researched. Store costs as of 22/10/2026: Apple US$ 99/year; Google Play US$ 25 once.
- **Reversible:** partly; transferring apps between accounts is possible but laborious.
- **When:** before the first test build on iPhone (the technical proof of concept needs the Apple account).

## D4 — MVP scope

- **Status:** Partly answered: the website will launch with all features; the audience and minimum age remain open.
- **Proposal:** babies from 0 to 12 months; Brazil, in pt-BR; adult users aged 18 or older; text-only community, without direct messages; no generative AI responding to users; no ads; web with a public website and internal dashboard, without a web app for families.
- **Why:** reduces health, moderation, and ECA Digital risks while the core is validated. Details in [Vision and scope](../01_Produto/Visao_e_Escopo.md), [ADR-001](../06_ADRs/ADR-001_Plataformas_e_Web.md), [ADR-006](../06_ADRs/ADR-006_Comunidade_e_Moderacao.md), and [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md).
- **Impact:** teenage parents are excluded from the MVP; pregnancy comes later.
- **Reversible:** yes; each item can be expanded through a separate decision.

## D5 — People for content, moderation, and legal work

- **Proposal:** one content reviewer with professional registration (for example, a pediatrician or pediatric physical therapist) for tummy time and activities; one or two part-time moderators when the community opens; consulting on the LGPD and ECA Digital before the pilot; appointment of the data protection officer.
- **Why:** without a reviewer, the content cannot be published; without moderation, the community does not meet store requirements or content removal rules; legal texts cannot be published without validation.
- **Impact:** staffing costs, with no prices researched at this stage ([Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md)).
- **Reversible:** yes; the arrangement (hiring, partnership, supervised volunteering) is open.

## D6 — Monetization

- **Options:** subscription with a free plan; one-time payment; free, supported by an institutional partnership.
- **Recommendation:** decide before the public pilot. In any case, no targeted ads using routine data (the LGPD prohibits sharing health data for economic gain, according to the privacy research).
- **Impact:** in-app purchases require compliance with store rules and the Consumer Protection Code; this does not change the technical foundation.

## D7 — Records of access tests on third-party projects

- **Decided by Daniel on 05/11/2026: option A.** The records stay only on disk, outside Git, without contacting the maintainers. Pushing the repository was authorized.
- **Situation.** In the first round of project assessments, before the rule to only read code, two subagents performed access probes on local instances of Sprout Track and Baby Buddy, with fictitious data and only on 127.0.0.1.
  - The records are on disk, in `09_Evidencias/Execucao_Referencias/Sprout_Track/` and `Baby_Buddy/`. Since 05:05 they have been in `.gitignore` and are not included in any commit.
  - The assessments do not detail these records. Access points appear only as audit questions.
  - No access probes were performed on Finnberry or Bebbo.
- **Options:**
  - (A) Keep the files only on disk, outside Git, without contacting the maintainers.
  - (B) Same as A, and Daniel privately notifies the maintainers through each project's security channel before publishing the vault. Baby Buddy directs vulnerability reports through GitHub in `SECURITY.md` (https://github.com/babybuddy/babybuddy/security). Sprout Track has no `SECURITY.md` in the analyzed commit; the channel still needs to be identified.
  - (C) Delete the records now.
- **Recommendation:** B. This is the responsible disclosure path, and the records provide the basis for an accurate notice. Hermes contacts no one: any notice comes from Daniel.
- **Impact:** none on AppMaternidade. The lessons are already in the assessments and the Q-06 scenarios in [Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md).
- **Reversible:** A and B, yes. C, no.
- **When:** before the repository's first push, because the remote is public.

## D8, website stack (MAT-28): decided

Decided on 03/11/2026, under authority delegated by Daniel: option A.

| Option | What it is | Pros | Cons |
|---|---|---|---|
| A (chosen) | React + TypeScript + Vite, Tailwind 4, shadcn/ui and Magic UI, Supabase and PWA; port through Capacitor | Uses the listed components; inexpensive static hosting; the port reuses the code | Advanced native features require a plugin |
| B | Next.js (App Router), with the same UI and backend | Server-side rendering and SEO | More parts to operate; the ideal hosting is Vercel, whose Hobby plan would not allow commercial use ("to be confirmed": no dated source in the vault) |
| C | Expo Router with React Native Web | Better reuse in a native app | Does not use shadcn/ui or Magic UI, which depend on the DOM; conflicts with the component rule |

## D9, domain and hosting (MAT-29): decided

Decided by Daniel on 03/11/2026.
- **Hosting:** GitHub Pages from the repository itself, published through GitHub Actions. Zero cost.
- **Backend:** Supabase Free in the São Paulo region, only for development and demonstration without real data.
- **Custom domain:** later.
- **To publish:** on 05/11/2026 D7 was decided (A), the local username became `<usuario>` in tracked files (it remains in old commits, by Daniel's choice), and pushing was authorized as routine. Only MAT-48 remains: the Supabase project in the cloud, the secrets in GitHub, and Pages through CI.
- **Alternatives evaluated:** Cloudflare Pages, Netlify, or Vercel on free plans; Supabase Pro when there are real users.

## D10, Impeccable detector (MAT-30): decided

Decided under authority delegated by Daniel on 03/11/2026.
- Impeccable is included as a local, non-blocking check with a pinned version at the final gate (MAT-42).
- First, it undergoes evaluation in `skill-scouting`.
- **Alternative evaluated:** do not use it, because G4 through G6 already cover the criterion.

## D11, REA and clean room (MAT-31): decided

Decided on 03/11/2026: option A, reduced and declared clean room.
- REA runs through the CLI (`rea-agents@6.8.0`).
- The analyst is the lead, with network access only for the reference.
- The reconstructor receives only the filtered specification.
- The verifier (revisor-appmaternidade) only reports.
- **Limitation:** same Windows account; isolation relies on instructions and permissions.
- **Alternatives evaluated:** B, isolated account or container; C, no REA.

## Demonstration decisions (Daniel, 06/11/2026)

These decisions apply to the academic preview published on Pages, with Supabase `appmaternidade-demo`.

1. **Accounts.** Each person creates their own account through the website, using real Supabase. There are no demonstration accounts or `DEMO_PASSWORD` secret, which does not exist in the repository (checked on 06/11/2026). In Daniel's words: "o Supabase subiu para isso, o site tem que funcionar de verdade, o uso é leve".
2. **Development content.** Included as normal, **without** the "Rascunho em revisão" badge, because the preview should look complete and functional. The source cited in each item and the standard notice that the content does not replace medical advice still apply.
3. **Extra verification for moderators** (MFA in the dashboard, ADR-003 and Architecture): open, because Daniel requested an explanation before deciding.
4. **Contact and LGPD.** The contact email is the author email from the repository's commits (`git config user.email`), and the data protection officer is Daniel Macedo. Both are provisional for the demonstration. The email value is not copied into notes or logs; it appears only on the website pages that require it.

## What does not need a decision now

Final product name, visual identity, record types beyond the MVP, widgets, and expansions. They remain in the [Roadmap](Roadmap_e_Proxima_Fatia.md).

## Open questions

1. Is an iPhone available for testing? Which model and iOS version?
2. Is a Mac available, or is there a willingness to buy or rent one? (changes D1)
3. Who operates the system in production, and with what availability?

## Limits of this analysis

Technical recommendations, not legal or financial advice. Prices are as of 22/10/2026 and may change.
