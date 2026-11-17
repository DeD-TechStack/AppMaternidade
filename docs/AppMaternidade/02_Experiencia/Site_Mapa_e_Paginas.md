---
tipo: design-doc
status: under review
responsavel: lider-appmaternidade
revisado_em: 2026-11-03
tarefa: MAT-32
adr: ADR-009
fontes_principais:
  - 01_Produto/Visao_e_Escopo.md
  - 01_Produto/Concorrentes_e_Diferenciais.md
  - 02_Experiencia/Fluxos_e_Telas.md
  - 08_Referencias/Analise_dos_Repositorios.md
  - 08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md
---

# Site map and pages

Closed list of pages for the complete site ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)). Each page states where the idea came from and what changes on the web. None creates a new requirement: the RFs are those in [Vision and scope](../01_Produto/Visao_e_Escopo.md), section 6.

How to read the columns:

- **Area:** Public (no login), Access (sign-in and invitation), Signed-in (family) or Staff (internal panel).
- **RFs covered:** "—" when the page has no natural RF.
- **Idea source:** `Visao §n` is the section in [Vision and scope](../01_Produto/Visao_e_Escopo.md); `Diferencial DF-n` comes from [Competitors and differentiators](../01_Produto/Concorrentes_e_Diferenciais.md); `Fluxos x.y` comes from [Flows and screens](Fluxos_e_Telas.md); `Analise` cites the beginning of a row in section 4 of [Repository analysis](../08_Referencias/Analise_dos_Repositorios.md); `Loja/LGPD` cites [Privacy, legal and app stores](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md); `Padrao web` marks pages every site has.

## Páginas

| Page | Area | RFs covered | Idea source | Adaptation to the site |
| --- | --- | --- | --- | --- |
| Início | Public | — | Visao §2; Diferencial DF-1 | Presents the four pillars and leads to "Entrar e criar conta". Opens well on mobile and does not request installation. |
| Como funciona | Public | — | Visao §5; Fluxos 4.1 | Shows the main journeys (first week, late night, shift handoff) with example screens and fictional data. |
| Cuidado compartilhado | Public | — | Diferencial DF-2; Visao §4 | Explains individual accounts, roles, authorship and shift handoff, without a single family password. |
| Desenvolvimento e tummy time | Public | — | Diferencial DF-3; ADR-007 | Explains tummy time without a numeric target and how content is reviewed. Shows no family's data. |
| Regras da comunidade | Public | RF-11 | Diferencial DF-4; ADR-006; Loja/LGPD (Apple 1.2 and Google Play UGC: published rules, reporting and contact, sections 5 and 6) | Shows only rules and reporting contact information, never posts. The community is visible only to signed-in people and is not indexed (DF-4). |
| Privacidade | Public | RF-13 | Loja/LGPD (Apple 5.1.1(i) and Google Play User Data Policy: published policy, sections 5 and 6); Diferencial DF-6 | Policy in pt-BR, linked in the footer of all pages and in the signed-in area. States where data is stored (Supabase in São Paulo). |
| Termos | Public | — | ADR-001; Loja/LGPD (Google Play UGC: acceptance of terms before posting, section 6) | Terms of use in pt-BR; acceptance is requested before the first community post. |
| Exclusão de conta | Public | RF-13 | Loja/LGPD (Google Play: web deletion link that works without the app, section 6); ADR-001 | Opens without login and explains how to request deletion, what is deleted and within what time frame. The request itself requires proof of account ownership. |
| Contato | Public | — | Loja/LGPD (Apple 1.5 and 1.6: easy contact and Support URL, section 5) | Email channel for support, privacy and reporting, also published in the footer. |
| Sobre | Public | — | Visao §1; Diferencial DF-7 | States who makes the product, whom it is for (Brazil, pt-BR) and what it does not do: diagnosis and medical advice. |
| Página não encontrada | Public | — | Padrao web | Short message with links to Início and Entrar. |
| Entrar e criar conta | Access | — | Fluxos 4.1; Fluxos 4.2 | Opens through the link, without installation. After the baby is registered, the site offers PWA installation when there is a clear benefit. |
| Recuperar acesso | Access | — | Padrao web | Recovery through the account email, with the same response whether or not the account exists. |
| Aceitar convite | Access | RF-05 | Fluxos 4.3; Analise "Convite com validade curta e de" | The invitation link opens in the browser or PWA, including without login. Expired, revoked or already-used invitations have clear messages. |
| Hoje | Signed-in | RF-01; RF-07 | Fluxos 3.1; Analise "Modo de tela para madrugada" | Quick buttons at the bottom, within thumb reach. Late-night mode is a variation of this screen: dark theme, large buttons and "há quanto tempo" blocks. |
| Sessão em andamento | Signed-in | RF-02; RF-08 | Fluxos 3.2; Analise "Sessão em andamento derivada do horário" | RF-02 becomes "sobrevive a fechar a aba, com o horário de início guardado". A stopwatch on the lock screen is deferred to the port. |
| Histórico | Signed-in | RF-03; RF-04 | Fluxos 3.3; Fluxos 4.6; Analise "Regra única para decidir a" | Daily and weekly timeline in the family's time zone, with authorship; edit, delete and restore in the record details. |
| Desenvolvimento | Signed-in | RF-08; RF-09 | Fluxos 3.4; Diferencial DF-3 | Tummy time and activities for the stage; articles with visible authorship, sources, reviewer and review date. |
| Comunidade | Signed-in | RF-10; RF-11; RF-12 | Fluxos 3.5; Fluxos 4.8; Fluxos 4.9; Diferencial DF-4 | Only for signed-in people and excluded from search engine indexing. The routine summary is shared only through a deliberate action with a preview. |
| Família e conta | Signed-in | RF-05; RF-06; RF-13; RF-14 | Fluxos 3.6; Fluxos 4.10; Analise "Exclusão de conta com transferência de titularidade" | Invitations, roles, data export and account deletion. RF-14 becomes "lembretes por Web Push, dependentes do servidor"; notification preferences live here. Export downloads a file through the browser. |
| Estados globais | Signed-in | — | Padrao web; Fluxos 5; Analise "Offline declarado só quando há" | Offline, access denied and error states, with the local queue visible: "salvo neste aparelho", "aguardando sincronização", "sincronizado". |
| Painel de moderação | Staff | RF-11 | ADR-001; ADR-006 | A route separate from the family site, only for platform roles, with strong authentication and auditing. Does not read care data ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md), section 5). |

## RF coverage

| RF | Pages |
| --- | --- |
| RF-01 | Hoje |
| RF-02 | Sessão em andamento |
| RF-03 | Histórico |
| RF-04 | Histórico |
| RF-05 | Aceitar convite; Família e conta |
| RF-06 | Família e conta |
| RF-07 | Hoje |
| RF-08 | Sessão em andamento; Desenvolvimento |
| RF-09 | Desenvolvimento |
| RF-10 | Comunidade |
| RF-11 | Regras da comunidade; Comunidade; Painel de moderação |
| RF-12 | Comunidade |
| RF-13 | Privacidade; Exclusão de conta; Família e conta |
| RF-14 | Família e conta |

## Open questions

1. Custom domain: deferred until later. D9 (MAT-29), decided on 03/11/2026, publishes the site on the repository's own GitHub Pages.
2. How the Exclusão de conta page confirms account ownership without login (email code or another method): deferred to the account slice.
3. Whether the public content pages (Desenvolvimento e tummy time) should be indexed: depends on the editorial cycle in [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md).
