---
tipo: reference
status: draft
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
tarefa: MAT-5
fontes_principais:
  - 08_Referencias/Repositorios/
  - 08_Referencias/Pesquisa_Comunidade_e_Conteudo.md
  - 08_Referencias/Concorrentes/
  - 08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md
---

# Licenses and sources

Consolidates, by material type, what can and cannot be included in AppMaternidade. This is **a technical review, not a legal opinion**: before reusing any third-party material, the license text must be checked by a professional.

## 1. Rule adopted at this stage

- **No copied material:** no code, text, images, icons, or trademarks from the reference repositories or competitors have been copied into AppMaternidade. Lessons learned are incorporated as concepts, implemented from scratch.
- **Educational content:** original text in pt-BR, written from primary sources, with links and citations, and reviewed by a registered professional ([ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)).
- **Dependencies:** each is chosen based on its license, checked in the package registry and LICENSE file before the foundation is built. Notices go on a third-party licenses screen in the app.

## 2. Reference repositories

| Material | Finnberry | Baby Buddy | Sprout Track | Bebbo |
| --- | --- | --- | --- | --- |
| **Code** | MIT, "Copyright (c) 2026 bckenstler" | BSD-2-Clause, "Copyright (c) 2017 - 2022, Baby Buddy's Contributors" | Custom license: **noncommercial** use only, with attribution and **sharing under the same license**. The rights holders reserve commercial use | **GPL-3.0** |
| Can it be reused? | Yes, with the MIT notice in the copied portions. Not planned | Yes, with the BSD-2 notice in the app's code and documentation. Not planned | **No**, as long as the app may generate any revenue | **No**: it would require AppMaternidade to be GPL-3.0; on the App Store, there is a known conflict between the store's terms and the GPL |
| **Dependencies** | Production: MIT 340, ISC 19, Apache-2.0 17, BSD-3 4, BSD-2 2, MIT-0 1, 0BSD 1. Items to check: `@anthropic-ai/claude-agent-sdk` (custom terms) and `@img/sharp-*` (LGPL-3.0) | Python: BSD, MIT, Apache-2.0; `psycopg2-binary` LGPL with exceptions; front-end bundles checked into version control without license notices | Production, according to `package-lock.json` (520 entries, with optional platform-specific binaries): MIT 381, ISC 51, Apache-2.0 44, BSD-3 7 and other permissive licenses 14. Items to check (23): `heic-to` (LGPL-3.0, direct), `web-push` (MPL-2.0, direct), `@img/sharp-*` (LGPL-3.0-or-later, optional), `elkjs` (EPL-2.0), `caniuse-lite` (CC-BY-4.0, data), `jszip` (MIT or GPL-3.0), `dompurify` (MPL-2.0 or Apache-2.0), `rgbcolor` and 2 with no declared license (`buffers`, `seq-queue`). [List](../09_Evidencias/Execucao_Referencias/Sprout_Track/13_licencas_dependencias.tsv) | Direct: MIT 86, Apache-2.0 7, ISC 2, MIT and Apache-2.0 1, BSD-2 1; none GPL |
| **Content and text** | None | Documentation in the BSD-2 repository, with no separate license | Same license as the code | **Proprietary to UNICEF and licensors**; the terms prohibit commercial use, digital copying, and modification |
| **Images and icons** | None checked into version control | Icon font assembled from Font Awesome, MFG Labs, and Entypo (SIL OFL), with one entry lacking a URL | README images under the project's license | Illustrations, photos, video, and audio prohibited by the terms |
| **Data** | — | Percentiles in CSV with no declared source | CDC and WHO curves in the seed data | Standard deviation tables; origin not checked |
| **Name and trademark** | "Finnberry"; the repository describes itself as a Huckleberry clone | "Baby Buddy" and logo, with no license | "Sprout Track", "Oak and Sprout" | UNICEF and Bebbo; UNICEF's name and emblem are protected |
| Profile | [Finnberry](Repositorios/Finnberry.md) | [Baby Buddy](Repositorios/Baby_Buddy.md) | [Sprout Track](Repositorios/Sprout_Track.md) | [Bebbo](Repositorios/Bebbo.md) |

**Bebbo and the App Store:** in 2010, the FSF found that the App Store's terms conflict with section 6 of GPLv2, and GNU Go was removed from the store (https://www.fsf.org/news/2010-05-app-store-compliance, accessed on 22/10/2026). GPLv3 has a similar clause [HIP].

**Growth curves:** always obtain them from the primary source (WHO), under its terms, rather than from the repositories.

## 3. Educational content sources

Summary of the [community and content research, section 2.5](Pesquisa_Comunidade_e_Conteudo.md). The numbers in brackets refer to the sources in that note.

| Source | Cite and link | Reproduce text | Images, videos, and logo | Required attribution |
| --- | --- | --- | --- | --- |
| AAP / HealthyChildren.org [29] | Yes | Not without written permission; also prohibits using the content with AI | Not without permission | — |
| CDC [24][25] | Yes; prefers links | Mostly public domain, without changing the content; milestones cannot be edited during customization | Some images are restricted; logo requires permission | Attribute; do not imply endorsement; state that the material is available free of charge |
| NHS [26] | Yes | OGL v3.0, including commercial use; translation is an adaptation | Images outside the OGL | OGL statement; adaptations cannot be attributed to the NHS |
| WHO, 2019 guideline [21][22] | Yes | CC BY-NC-SA 3.0 IGO: noncommercial | Logo not permitted | Citation; sharing under the same license |
| Pathways.org [27][28] | Yes | Personal and noncommercial use only, without written approval | Same | — |
| SBP [31] | Yes | "All rights reserved" | Same | — |
| Ministry of Health [7][19] | Yes | Check each work individually; the RBAFS article about the Guide is CC BY 4.0 | Same | As specified by the work |
| Bebbo (UNICEF) | Yes | Prohibited | Prohibited | — |

**How original content uses these sources:**

- facts and recommendations (for example, "at least 30 minutes per day, spread throughout the day") can be rewritten with a citation;
- the expression (text, illustration, video) is included only with a license;
- each item stores its sources, with version and access date ([Development and content, section 8](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md)).

## 4. Competitors

The eight profiles found no reuse license for Napper, Huckleberry, Baby Daybook, Nara Baby, Kinedu, BabyCenter, and Peanut. The content of these products is treated as proprietary. Pathways permits personal and noncommercial use only ([Competitors and differentiators](../01_Produto/Concorrentes_e_Diferenciais.md), "Content reuse" section).

Screenshots and store text serve only as internal evidence for the analysis. They are not included in the product or in AppMaternidade's public materials.

## 5. Technologies in the proposed architecture

Licenses checked in the technology notes on 22/10/2026 [EXEC: npm registry and GitHub API]:

| Component | License | Note |
| --- | --- | --- |
| `expo` 58.0.17 and `expo-*` modules checked | MIT | [Data, synchronization, and backend](Tecnologias/Dados_Sincronizacao_e_Backend.md), version table |
| `@powersync/react-native` 2.3.3 and JS SDKs | Apache-2.0 | Same |
| PowerSync service (self-hosted, Open Edition) | FSL-1.1-ALv2: any use except "Competing Use"; each version becomes Apache-2.0 after two years | The GitHub API shows `NOASSERTION` because it does not recognize the FSL |
| Supabase (`supabase/supabase` repository) | Apache-2.0 | The contract terms apply to the managed service |
| `drizzle-orm` 0.45.4 | Apache-2.0 | If used in the domain service |
| SQLCipher and `op-sqlite` | To be checked | Before the technical proof of concept (MAT-17) |

Platforms: Apple Developer Program License Agreement and Google Play Policies, cited in [Mobile and platforms](Tecnologias/Mobile_e_Plataformas.md).

## 6. Attribution obligations in the app

- A "Licenças de terceiros" screen in the app, generated from the build dependencies, with the text of each license.
- If any MIT or BSD-2 portion of the reference repositories is ever copied (not planned), record the source file, commit, and permalink, and include the copyright notice in the repository and on the licenses screen.
- In the content, cite the source, version, and date for each item, following the attribution requirements in section 3.

## 7. Open questions

1. Licenses for SQLCipher and `op-sqlite` in the version chosen for the proof of concept.
2. Is it worth requesting permission from the AAP or Pathways, or producing everything internally (ADR-007)?
3. Where will the growth tables come from if the product includes curves (outside the MVP)?

## Limits of this analysis

- This is not a legal opinion.
- Dependency licenses come from the self-declared field in the packages; LICENSE and NOTICE have not been checked individually.
- Baby Buddy's front-end licenses were inferred.
- Sprout Track's dependencies were identified after the independent review, using `package-lock.json`. Since Sprout Track's own license already prevents reusing its code, the list is only useful if AppMaternidade chooses the same libraries; in that case, each is assessed under its own license.

## Relationship to other documents

[Repository analysis](Analise_dos_Repositorios.md) · [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md) · [Development and content](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) · [Community and content research](Pesquisa_Comunidade_e_Conteudo.md) · [Home](../00_Inicio/Home.md)
