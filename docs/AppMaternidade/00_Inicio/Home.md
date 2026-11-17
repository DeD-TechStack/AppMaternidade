---
tipo: home
status: draft
responsavel: Hermes (coordinator of APP-001)
revisado_em: 2026-10-22
---

# AppMaternidade

> Note from 03/11/2026: the direction changed to the full website first and the Android and iOS port afterwards ([ADR-009](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)). Where this text mentions a native app, read it as the port; the website covers the same functions.

Working name. It is an Android and iOS app for mothers, fathers and other authorized caregivers. It is used to:

- track the baby's routine and development;
- talk in a community organized by topic;
- share caregiving without depending on scattered messages.

## Current stage

Task APP-001, from 22/10/2026, covers research, design docs and organization. The website stack is decided in ADR-009 (D8); the other recommendations in this vault remain Hermes proposals until Daniel makes a decision. Functional implementation is the next stage of the roadmap.

## Where to start

1. [Final report of APP-001](Relatorio_Final_APP-001.md): what was delivered, the recommendation and what is still missing.
2. [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md): from D1 to D11.
3. [Vision and scope](../01_Produto/Visao_e_Escopo.md) and [Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md).

Support:

- [Progress and checkpoints](Progresso.md)
- [Organization log (itsaplan and vault)](Registro_Organizacao.md)
- [Vault conventions](Convencoes.md)

## Document map

Status in parentheses: proposal, draft or Proposed (for ADRs).

**00 Start**

- [Commit policy](Politica_de_Commits.md) (under review)

**01 Product**

- [Vision and scope](../01_Produto/Visao_e_Escopo.md) (proposal)
- [Competitors and differentiators](../01_Produto/Concorrentes_e_Diferenciais.md) (proposal)

**02 Experience**

- [Flows and screens](../02_Experiencia/Fluxos_e_Telas.md) (proposal)
- [Website map and pages](../02_Experiencia/Site_Mapa_e_Paginas.md) (under review)
- [Website visual direction](../02_Experiencia/Direcao_Visual.md) (under review)

**03 Architecture**

- [Architecture comparison](../03_Arquitetura/Comparacao_de_Arquiteturas.md) (proposal)
- [Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md) (proposal)
- [Data model and permissions](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) (proposal)
- [Offline, synchronization and timers](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md) (proposal)

**04 Community and content**

- [Community and moderation](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md) (proposal)
- [Development and content](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md) (proposal)

**05 Privacy and operations**

- [Privacy and security](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) (proposal; not a legal opinion)
- [Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md) (proposal)
- [Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) (proposal)

**06 ADRs (ADR-009 Accepted; ADR-001 partially superseded; the others Proposed)**

- [ADR-001 Platforms and web](../06_ADRs/ADR-001_Plataformas_e_Web.md)
- [ADR-002 Mobile framework](../06_ADRs/ADR-002_Framework_Mobile.md)
- [ADR-003 Backend, persistence and authentication](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md)
- [ADR-004 Offline, synchronization and timers](../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md)
- [ADR-005 Isolation and boundary with the community](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md)
- [ADR-006 Community and moderation](../06_ADRs/ADR-006_Comunidade_e_Moderacao.md)
- [ADR-007 Educational content and AI](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)
- [ADR-008 Documentation, operations, costs and evolution](../06_ADRs/ADR-008_Documentacao_Operacao_Custos_e_Evolucao.md)
- [ADR-009 Full website first](../06_ADRs/ADR-009_Site_Completo_Primeiro.md)

**07 Roadmap**

- [Roadmap and next slice](../07_Roadmap/Roadmap_e_Proxima_Fatia.md) (proposal, not implemented)
- [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md) (proposal)

**08 References**

- [Repository analysis](../08_Referencias/Analise_dos_Repositorios.md) and [Licenses and sources](../08_Referencias/Licencas_e_Fontes.md)
- Repository profiles:
  - [Finnberry](../08_Referencias/Repositorios/Finnberry.md)
  - [Baby Buddy](../08_Referencias/Repositorios/Baby_Buddy.md)
  - [Sprout Track](../08_Referencias/Repositorios/Sprout_Track.md)
  - [Bebbo](../08_Referencias/Repositorios/Bebbo.md)
- Competitor profiles:
  - [Napper](../08_Referencias/Concorrentes/Napper.md)
  - [Huckleberry](../08_Referencias/Concorrentes/Huckleberry.md)
  - [Baby Daybook](../08_Referencias/Concorrentes/Baby_Daybook.md)
  - [Nara Baby](../08_Referencias/Concorrentes/Nara_Baby.md)
  - [Kinedu](../08_Referencias/Concorrentes/Kinedu.md)
  - [Pathways](../08_Referencias/Concorrentes/Pathways.md)
  - [BabyCenter](../08_Referencias/Concorrentes/BabyCenter.md)
  - [Peanut](../08_Referencias/Concorrentes/Peanut.md)
- Research:
  - [Community and content](../08_Referencias/Pesquisa_Comunidade_e_Conteudo.md)
  - [Privacy, legal and app stores](../08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md)
- Technologies:
  - [Mobile and platforms](../08_Referencias/Tecnologias/Mobile_e_Plataformas.md)
  - [Data, synchronization and backend](../08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md)
  - [Dated pricing](../08_Referencias/Tecnologias/Precos_Datados.md)

**09 Evidence**

Execution logs for the references, separated by project:

- [Finnberry](../09_Evidencias/Execucao_Referencias/Finnberry/00_Indice.md)
- [Baby Buddy](../09_Evidencias/Execucao_Referencias/Baby_Buddy/README.md)
- [Sprout Track](../09_Evidencias/Execucao_Referencias/Sprout_Track/Registro_Execucao.md)
- [Bebbo](../09_Evidencias/Execucao_Referencias/Bebbo/00_Indice.md)

The access test logs from the first round are kept outside Git (decision D7).

## Vault configuration

- **Canonical location of the Markdown files:** `C:/Projetos/AppMaternidade/docs/AppMaternidade`. There is no editable copy anywhere else.
- **Obsidian:** the vault lives in regular Obsidian (default profile at `%APPDATA%/obsidian`), not in Obsidian Oficina. Daniel registered it on 22/10/2026, at 07:00:46. Navigation through the Home page, a design doc and an ADR was checked at 07:12 ([Organization log](Registro_Organizacao.md)).
- **Links:** relative Markdown links, also readable outside Obsidian and on GitHub.
