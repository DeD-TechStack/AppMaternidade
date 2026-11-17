---
tipo: adr
id: ADR-004
status: Proposed
data: 2026-10-22
autor: Hermes (coordinator of APP-001)
aprovador: none so far
tarefas: MAT-9, MAT-14, MAT-17
---

# ADR-004 — Local persistence, synchronization, conflicts and timers

> Note dated 03/11/2026: the direction changed to the complete site first and Android and iOS ports afterward ([ADR-009](ADR-009_Site_Completo_Primeiro.md)). Where this text mentions a native app, read it as the port; the site covers the same functions.

**Status:** Proposed. Hermes's technical recommendation; not approved by Daniel.

## Context and requirements

- Essential records must work without a connection and survive app termination (fixed task requirements; scenarios Q-01, Q-02 and Q-08).
- Multiple caregivers write about the same baby, sometimes offline; a session started by one can be ended by another (Q-03, Q-04).
- A caregiver's access can be revoked while their device is offline (Q-05).
- Timers cannot depend on continuous background execution (Q-08), and time zones, clocks and midnight need a rule (Q-09).

## Options considered

1. **Online only**, with a read cache.
2. **A BaaS SDK cache** with the default last-write policy.
3. **Local-first with an idempotent operation queue**, authorization and conflicts decided on the server, and a timer as an in-progress record.
4. **Full CRDT** on the device and server.

## Evidências

- Official Android offline architecture guide: local storage as the source for the interface, with queues and conflicts handled explicitly (https://developer.android.com/topic/architecture/data-layer/offline-first, accessed 22/10/2026).
- Firestore: persistent cache, last write on the same document and transactions that fail offline (sources B01 and B02 in the package, reviewed in [Data, synchronization and backend](../08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md)).
- Background tasks have no guaranteed execution time on Android or iOS (source M08 in the package).
- References: Finnberry derives duration from the start time but stores the timer only in the browser; Baby Buddy separates timer and record; Sprout Track installs as a PWA without a proven offline write queue (profiles in `08_Referencias/Repositorios/`).

## Recomendação

Option 3, specified in [Offline, synchronization and timers](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md):

- local SQLite database as the source for the interface;
- each action saves the change and operation in the same transaction;
- operations with a device-generated ID, idempotent retries and a per-operation result;
- authorization against current membership on every received operation;
- field-level merging and explicit conflict when two caregivers change the same time or quantity field;
- timer as an in-progress Record, with elapsed time calculated from the saved start time;
- revocation with local cleanup on reconnection and limits disclosed to the user.

The implementation approach (an existing sync layer or a custom protocol) depends on ADR-003.

## Consequences

- Positive: no loss or duplication from retries; real shift handoff; effective server-side revocation; authorship and history preserved.
- Negative: more code and tests than an SDK cache; a conflict screen must be designed; the queue and history take up space on the device and server.

## Risks and outstanding verification

- Measure on physical Android and iOS devices: app termination immediately after recording, retry after timeout, two offline devices editing the same record, and offline revocation (technical proof MAT-17).
- Confirm how the selected sync layer removes a family's data from the device after revocation.
- Measure the performance cost of the encrypted local database.

## When to review

- If the proof shows that the selected layer does not allow explicit conflicts without rewriting the upload path.
- If the volume of real conflicts is negligible in the pilot (simplify the review screen).
- If collaborative editing of long text is introduced (evaluate CRDT only for that field).

## Referências

[Data model and permissions](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) · [Quality and validation](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) · ADR-003 · tasks MAT-9, MAT-14 and MAT-17.
