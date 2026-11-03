---
tipo: adr
id: ADR-004
status: Proposta
data: 2026-10-22
autor: Hermes (coordenador da APP-001)
aprovador: nenhum até agora
tarefas: MAT-9, MAT-14, MAT-17
---

# ADR-004 — Persistência local, sincronização, conflitos e temporizadores

> Nota de 03/11/2026: o rumo mudou para site completo primeiro e port Android e iOS depois ([ADR-009](ADR-009_Site_Completo_Primeiro.md)). Onde este texto fala em app nativo, leia como o port; o site cobre as mesmas funções.

**Status:** Proposta. Recomendação técnica do Hermes; não aprovada por Daniel.

## Contexto e requisitos

- Registros essenciais precisam funcionar sem conexão e sobreviver ao encerramento do app (requisitos fixos da task; cenários Q-01, Q-02 e Q-08).
- Vários cuidadores escrevem sobre o mesmo bebê, às vezes offline; uma sessão iniciada por um pode ser encerrada por outro (Q-03, Q-04).
- O acesso de um cuidador pode ser revogado enquanto o aparelho dele está offline (Q-05).
- Temporizadores não podem depender de execução contínua em segundo plano (Q-08), e fuso, relógio e meia-noite precisam de regra (Q-09).

## Opções consideradas

1. **Só online**, com cache de leitura.
2. **Cache do SDK de um BaaS** com a política padrão de última escrita.
3. **Local-first com fila de operações idempotentes**, autorização e conflitos decididos no servidor, temporizador como registro em andamento.
4. **CRDT completo** no aparelho e no servidor.

## Evidências

- Guia oficial de arquitetura offline do Android: armazenamento local como fonte para a interface, filas e conflitos tratados explicitamente (https://developer.android.com/topic/architecture/data-layer/offline-first, consulta 22/10/2026).
- Firestore: cache persistente, última escrita no mesmo documento e transações que falham offline (fontes B01 e B02 do pacote, revistas em [Dados, sincronização e backend](../08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md)).
- Tarefas em segundo plano não têm horário garantido no Android nem no iOS (fonte M08 do pacote).
- Referências: Finnberry deriva a duração do instante de início, mas guarda o timer só no navegador; Baby Buddy separa timer e registro; Sprout Track instala como PWA sem fila de escrita offline comprovada (fichas em `08_Referencias/Repositorios/`).

## Recomendação

Opção 3, especificada em [Offline, sincronização e temporizadores](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md):

- banco SQLite local como fonte da interface;
- cada ação grava a mudança e a operação na mesma transação;
- operações com id gerado no aparelho, reenvio idempotente e resultado por operação;
- autorização pelo vínculo atual em cada operação recebida;
- mescla por campo e conflito explícito quando dois cuidadores alteram o mesmo campo de horário ou quantidade;
- temporizador como Registro em andamento, com tempo calculado do início gravado;
- revogação com limpeza local ao reconectar e limites declarados ao usuário.

A forma de implementar (camada de sync pronta ou protocolo próprio) depende do ADR-003.

## Consequências

- Positivas: nenhuma perda ou duplicação por reenvio; troca de turno real; revogação efetiva no servidor; autoria e histórico preservados.
- Negativas: mais código e testes do que um cache de SDK; é preciso desenhar a tela de conflito; a fila e o histórico ocupam espaço no aparelho e no servidor.

## Riscos e verificação que falta

- Medir em Android e iOS físicos: encerramento do app logo após registrar, reenvio depois de timeout, dois aparelhos offline editando o mesmo registro, revogação offline (prova técnica MAT-17).
- Confirmar como a camada de sync escolhida remove do aparelho dados de uma família após revogação.
- Medir o custo de desempenho do banco local cifrado.

## Quando revisar

- Se a prova mostrar que a camada escolhida não permite conflito explícito sem reescrever o envio.
- Se o volume de conflitos reais for desprezível no piloto (simplificar a tela de revisão).
- Se surgir edição colaborativa de texto longo (avaliar CRDT só para esse campo).

## Referências

[Modelo de dados e permissões](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) · [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) · ADR-003 · tarefas MAT-9, MAT-14 e MAT-17.
