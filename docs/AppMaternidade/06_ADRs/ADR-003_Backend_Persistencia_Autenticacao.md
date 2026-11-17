---
tipo: adr
id: ADR-003
status: Proposed
data: 2026-10-22
autor: Hermes (coordinator of APP-001)
aprovador: none so far
tarefas: MAT-7, MAT-8, MAT-9, MAT-15, MAT-17
---

# ADR-003 — Backend, remote persistence and authentication

> Note dated 03/11/2026: the direction changed to the complete site first and Android and iOS ports afterward ([ADR-009](ADR-009_Site_Completo_Primeiro.md)). Where this text mentions a native app, read it as the port; the site covers the same functions.

**Status:** Proposed. Hermes's technical recommendation; not approved by Daniel.

## Context and requirements

- Write protocol with idempotency, current membership checked on every operation, base version and explicit conflicts ([ADR-004](ADR-004_Offline_Sync_e_Temporizadores.md)).
- Isolation between families in queries, synchronization, files and push; community without a path to the routine ([ADR-005](ADR-005_Isolamento_e_Fronteira_Comunidade.md)).
- Baby routine data treated as potentially sensitive; preference for hosting in Brazil to be evaluated ([Privacy and security](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md)).
- Small team: few vendors, managed operations, a viable exit.

## Options considered

- **Set A — Firebase** (Firestore with native SDK, Auth, Storage, FCM, Cloud Functions).
- **Set B — Managed PostgreSQL + PowerSync + a custom domain service** (Supabase for the database and authentication).
- **Set C — Custom API + managed PostgreSQL + custom synchronization.**
- Rejected variants: Firebase JS SDK in React Native (no Firestore persistence), ElectricSQL alone (read-only), Zero (no offline writes), Replicache (maintenance), Atlas Device Sync (discontinued).

## Evidências

Sources accessed on 22/10/2026; details in [Data, synchronization and backend](../08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md) and [Architecture comparison](../03_Arquitetura/Comparacao_de_Arquiteturas.md).

- Firestore: offline in native SDKs, last write wins, transactions fail offline (https://firebase.google.com/docs/firestore/manage-data/enable-offline, https://firebase.google.com/docs/firestore/manage-data/transactions); no persistence in the JavaScript SDK in React Native (https://firebase.google.com/docs/web/environments-js-sdk).
- PowerSync: queue sent to our endpoint, which must be idempotent and return 2xx with details for domain errors (https://docs.powersync.com/handling-writes/writing-client-changes, https://docs.powersync.com/handling-writes/handling-update-conflicts); revocation by deleting the membership row and removal on the client when the row leaves the buckets (https://docs.powersync.com/sync/rules/parameter-queries, https://docs.powersync.com/architecture/powersync-protocol); React Native and Dart SDKs in GA (https://docs.powersync.com/resources/feature-status); service license FSL-1.1-ALv2 with an open self-hostable edition (https://github.com/powersync-ja/powersync-service/blob/main/LICENSE); BR region available (https://docs.powersync.com/integrations/supabase/guide).
- Supabase: sa-east-1 region, São Paulo (https://supabase.com/docs/guides/platform/regions); JWT can remain stale until renewal, so authorization must query the membership table (https://supabase.com/docs/guides/database/postgres/row-level-security); default SMTP is unsuitable for production; free projects pause after a week without use (https://supabase.com/pricing).
- Illustrative infrastructure costs at 100, 1.000 and 10.000 families, in USD per month and excluding engineering costs ([Dated prices](../08_Referencias/Tecnologias/Precos_Datados.md)):
  - Firebase: ~27, 35 and 139;
  - Supabase + PowerSync: ~101, 121 and 214;
  - Custom API: ~64, 109 and 202.
- With the domain service in this recommendation, Set B costs ~108 to 126, 128 to 146 and 238 to 298 ([Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md), section 2). These figures do not include PITR (+US$ 100/month) or staging.
- App Store guideline 4.8: social login requires an equivalent option; using only your own email login is exempt (https://developer.apple.com/app-store/review/guidelines/).

## Recomendação

**Set B: Supabase (PostgreSQL and Auth, São Paulo region) + PowerSync Cloud (BR region) + a custom domain service**, diagrammed in [Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md):

- all care writes go through the service; apps do not write directly to the database;
- the service implements the [ADR-004](ADR-004_Offline_Sync_e_Temporizadores.md) contract and responds per operation;
- offline reads through Sync Streams, with the family resolved through the membership table;
- separate database schemas and roles per context; the community module has no permissions on care tables;
- authentication by one-time email code, with a dedicated email provider, short-lived JWTs, MFA on the panel and no social login in the MVP.

Rationale: the write protocol, which is the core of shared care, stays under our control; the durable queue and partial download, the largest schedule risks in Set C, come ready-made; the schema and service are the same as in Set C, making an exit from PowerSync a component replacement rather than a rewrite; care data stays in Brazil. Set A is the cheapest and fastest initially, but resolves concurrency through last write wins, spreads authorization across rules and Functions, and is the hardest to leave.

**Main alternative: Set C**, retaining the database, schema and service and replacing synchronization.

### Service language

A separate, reversible decision, because the contract is in OpenAPI and JSON Schema. Options compared in the data note (section 6): TypeScript (NestJS or Fastify), Python (Django + DRF) and Java or Kotlin (Spring Boot). Tentative proposal: **TypeScript**, because one language across app, service and panel reduces the maintenance load for a one-person team, and the task queue can live in PostgreSQL itself (`pg-boss`). It is not selected because React Native is used: the reason is maintenance. Django wins if a ready-made administration panel matters more; Spring Boot wins if the team is Java-first.

## Consequences

- Positive: write rules in one place; durable offline support without building the synchronization engine; portable PostgreSQL; data in Brazil.
- Negative: two critical vendors; higher fixed costs initially; Sync Streams must mirror service rules; a custom service to build and operate.

## Risks and outstanding verification

- Prove in MAT-17 that the queue survives termination, retries do not duplicate data, and revocation removes data from the device (P1, P2, P4).
- Tests proving that the service and Sync Streams reject the same things (P5).
- Confirm the maximum JWT lifetime accepted by PowerSync (the documentation differs between 60 minutes and 24 hours).
- Confirm pricing in Brazilian regions and Supabase's backup and restoration policy for the RPO and RTO defined in [Costs and operations](../05_Privacidade_Operacao/Custos_e_Operacao.md).
- `op-sqlite` appears as Beta in PowerSync ("production-ready for tested use cases"): cover the use case in the proof.

## When to review

- PowerSync fails the proofs, or its license or pricing changes.
- A requirement for self-hosting or full control in Brazil.
- Volume exceeds the limits of PowerSync's Pro plan.
- A need for social login (requires Sign in with Apple or equivalent).

## Referências

[Architecture comparison](../03_Arquitetura/Comparacao_de_Arquiteturas.md) · [Proposed architecture](../03_Arquitetura/Arquitetura_Proposta.md) · [Data model and permissions](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) · [ADR-002](ADR-002_Framework_Mobile.md) · [ADR-004](ADR-004_Offline_Sync_e_Temporizadores.md) · [ADR-005](ADR-005_Isolamento_e_Fronteira_Comunidade.md) · [ADR-008](ADR-008_Documentacao_Operacao_Custos_e_Evolucao.md) · tasks MAT-7, MAT-8, MAT-9, MAT-15 and MAT-17.
