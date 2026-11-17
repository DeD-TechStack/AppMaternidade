---
tipo: adr
id: ADR-008
status: Proposed
data: 2026-10-22
autor: Hermes (coordinator of APP-001)
aprovador: none so far
tarefas: MAT-12, MAT-13, MAT-14, MAT-15, MAT-17, MAT-18
---

# ADR-008 — Documentation, operations, costs, and evolution path

> Note from 03/11/2026: the direction changed to a complete website first and Android and iOS ports later ([ADR-009](ADR-009_Site_Completo_Primeiro.md)). Where this text refers to a native app, read it as the port; the website covers the same functions.

**Status:** Proposed. Technical recommendation from Hermes; not approved by Daniel.

## Context and requirements

- The product will be built and operated by a small team, perhaps just one person at first, with AI agents helping with development. Decisions must remain understandable to anyone who joins later, human or agent.
- The remote repository is public, and the documentation vault is inside it (`docs/AppMaternidade`). Nothing sensitive may go into Git.
- The data handled is assumed to concern children's health. Careless operations become incidents ([Privacy and security](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md)).
- At the illustrative scales, infrastructure costs remain below US$ 350/month, without PITR or EAS Update. People and engineering costs dominate and have not been assessed ([Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md)).
- The research found providers at risk of change: Realm Device Sync was discontinued, Replicache entered maintenance mode, and free plans pause due to inactivity ([Data, synchronization, and backend](../08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md)). Every dependency needs a known exit path.

## Options considered

**Documentation:**

1. **Markdown in the repository**, in an Obsidian vault, with ADRs and evidence; tasks and status in itsaplan.
2. Documents within itsaplan.
3. External wiki.

**Operations:**

1. **Managed services with paid plans starting in staging**, plus a small custom service in a container.
2. Self-host everything (PostgreSQL, PowerSync Open Edition, service) from the start.
3. Free plans until launch.

**Evolution:**

1. **Phases with exit criteria and an ADR or decision for each expansion** ([Roadmap](../07_Roadmap/Roadmap_e_Proxima_Fatia.md)).
2. Fixed feature plan.

## Evidências

- The Supabase and PowerSync Free plans pause or deactivate after 1 week without use. Supabase Pro starts at US$ 25/month and PowerSync Pro starts at US$ 49/month (https://supabase.com/pricing and https://www.powersync.com/pricing, accessed on 22/10/2026; [Dated pricing](../08_Referencias/Tecnologias/Precos_Datados.md)).
- Supabase Pro has daily backups with 7 days of access; 7-day PITR costs US$ 100/month; backups do not include Storage objects (same source).
- PowerSync Open Edition can be self-hosted under FSL-1.1-ALv2, and each version becomes Apache-2.0 after two years (https://docs.powersync.com/intro/self-hosting; [Data, synchronization, and backend](../08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md)).
- The project's itsaplan (http://localhost:3001/oficina/MAT) stores tasks, links, and a status document. Canonical texts remain in the vault ([Organization record](../00_Inicio/Registro_Organizacao.md)).
- At this stage, the Finnberry profile and four documents (including this ADR) had to be written by the coordinator after subagent failures ([Progress](../00_Inicio/Progresso.md)). This was only possible because the evidence was on disk, rather than only in the conversation history.

## Recomendação

**Documentation:**

- The `docs/AppMaternidade` vault is the canonical source for design docs, ADRs, and evidence, with relative Markdown links (readable on GitHub and in Obsidian).
- itsaplan stores tasks, dependencies, pending decisions, and a status document. It does not duplicate editable text.
- ADR statuses: Proposed, Accepted, Rejected, and Superseded. "Aceita" only with Daniel's recorded approval, dated. A superseded ADR points to its successor.
- Each relevant claim includes its evidence class ([EXEC], [CÓDIGO], [DOC], [HIP]) and the source date ([Conventions](../00_Inicio/Convencoes.md)).
- `.gitignore` excludes reference clones, local Obsidian configuration, captures, context packages, and any `.env`. No real family data enters the repository, even in tests.

**Operations:**

- Managed services (Supabase and PowerSync) with paid plans starting in continuous staging and during the pilot; free plans are reserved for disposable proofs of concept.
- Domain service in a container, with a reproducible image.
- 7-day PITR and a restoration drill before the pilot. After restoration, deletions are reapplied.
- Minimum monitoring of availability, rejections, synchronization lag, errors without content, the moderation queue, and spending ([Costs and operations, section 6](../05_Privacidade_Operacao/Custos_e_Operacao.md)).
- Administrative access with MFA, named accounts, and an audit trail.
- A written exit plan for each provider ([Costs and operations, section 7](../05_Privacidade_Operacao/Custos_e_Operacao.md)).

**Costs:**

- Prices always include a date and source and are revalidated before each plan decision.
- Scenarios are always marked as illustrative.
- A personal AI subscription never counts as product API credit.

**Evolution:**

- Roadmap phases F0 through F6, each with exit criteria.
- Every expansion (attachments, 0 to 24 months, groups by stage, web app, live audio, AI) requires its own ADR or decision.

Rationale:

- **Documentation in the repository:** versioned alongside the code, survives tool and agent failures, and can be read by both Obsidian and agents.
- **Managed services:** reduce the operational work one person would need to do alone, and paid plans prevent pauses that would bring down the pilot.
- **Exit plan:** keeps the provider choice reversible without rewriting the app.

## Consequences

- **Positive:**
  - traceable decisions across tasks, documents, ADRs, and evidence;
  - predictable costs on the order of US$ 110 to 300 per month through the pilot;
  - restoration and provider exit can be rehearsed.
- **Negative:**
  - fixed costs starting in staging, even without users;
  - two critical providers;
  - documentation discipline that takes time;
  - a public vault, which requires review before each commit to avoid exposing anything sensitive.

## Risks and pending verification

- Pricing for Brazilian regions has not been confirmed [NC].
- RPO and RTO have not been decided: they determine PITR and the backup window.
- A drill to restore and rebuild PowerSync from PostgreSQL has not yet been performed; it is scheduled for MAT-17 or MAT-18.
- Operations handled by one person, without continuous on-call coverage.
- Vault links were checked by script at this stage; navigation in Obsidian depends on registering the vault (MAT-3, awaiting Daniel).

## When to review

- A price or plan change from Supabase, PowerSync, or Expo that changes the order of magnitude.
- The pilot shows that operations cannot fit within the available time.
- A requirement for a lower RPO than PITR offers, or for longer backup retention.
- More people joining the team, which may change the documentation or task tool.
- A stack change in ADR-002 or ADR-003.

## Referências

- Tasks: MAT-12, MAT-13, MAT-14, MAT-15, MAT-17, and MAT-18 in http://localhost:3001/oficina/MAT
- [Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md) · [Privacy and security](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) · [Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) · [Roadmap and next slice](../07_Roadmap/Roadmap_e_Proxima_Fatia.md) · [Decisions for Daniel](../07_Roadmap/Decisoes_para_Daniel.md) · [ADR-002](ADR-002_Framework_Mobile.md) · [ADR-003](ADR-003_Backend_Persistencia_Autenticacao.md)
