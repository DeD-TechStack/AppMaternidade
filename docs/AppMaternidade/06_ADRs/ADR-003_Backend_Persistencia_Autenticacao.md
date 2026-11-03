---
tipo: adr
id: ADR-003
status: Proposta
data: 2026-10-22
autor: Hermes (coordenador da APP-001)
aprovador: nenhum até agora
tarefas: MAT-7, MAT-8, MAT-9, MAT-15, MAT-17
---

# ADR-003 — Backend, persistência remota e autenticação

**Status:** Proposta. Recomendação técnica do Hermes; não aprovada por Daniel.

## Contexto e requisitos

- Protocolo de escrita com idempotência, conferência do vínculo atual a cada operação, versão-base e conflitos explícitos ([ADR-004](ADR-004_Offline_Sync_e_Temporizadores.md)).
- Isolamento entre famílias em consultas, sincronização, arquivos e push; comunidade sem caminho para a rotina ([ADR-005](ADR-005_Isolamento_e_Fronteira_Comunidade.md)).
- Dados de rotina de bebês tratados como potencialmente sensíveis; preferência por hospedagem no Brasil a avaliar ([Privacidade e segurança](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md)).
- Equipe pequena: poucos fornecedores, operação gerenciada, saída possível.

## Opções consideradas

- **Conjunto A — Firebase** (Firestore com SDK nativo, Auth, Storage, FCM, Cloud Functions).
- **Conjunto B — PostgreSQL gerenciado + PowerSync + serviço de domínio próprio** (Supabase para banco e autenticação).
- **Conjunto C — API própria + PostgreSQL gerenciado + sincronização própria.**
- Variantes descartadas: Firebase JS SDK em React Native (sem persistência do Firestore), ElectricSQL sozinho (só leitura), Zero (sem escrita offline), Replicache (manutenção), Atlas Device Sync (encerrado).

## Evidências

Consultas de 22/10/2026; detalhes em [Dados, sincronização e backend](../08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md) e [Comparação de arquiteturas](../03_Arquitetura/Comparacao_de_Arquiteturas.md).

- Firestore: offline nos SDKs nativos, última escrita vence, transações falham offline (https://firebase.google.com/docs/firestore/manage-data/enable-offline, https://firebase.google.com/docs/firestore/manage-data/transactions); sem persistência no SDK JavaScript em React Native (https://firebase.google.com/docs/web/environments-js-sdk).
- PowerSync: fila enviada a um endpoint nosso, que deve ser idempotente e responder 2xx com detalhe em erros de domínio (https://docs.powersync.com/handling-writes/writing-client-changes, https://docs.powersync.com/handling-writes/handling-update-conflicts); revogação apagando a linha de vínculo e remoção no cliente quando a linha sai dos buckets (https://docs.powersync.com/sync/rules/parameter-queries, https://docs.powersync.com/architecture/powersync-protocol); SDK React Native e Dart em GA (https://docs.powersync.com/resources/feature-status); licença do serviço FSL-1.1-ALv2 com edição aberta auto-hospedável (https://github.com/powersync-ja/powersync-service/blob/main/LICENSE); região BR disponível (https://docs.powersync.com/integrations/supabase/guide).
- Supabase: região sa-east-1, São Paulo (https://supabase.com/docs/guides/platform/regions); JWT pode estar desatualizado até a renovação, por isso a autorização deve consultar a tabela de vínculos (https://supabase.com/docs/guides/database/postgres/row-level-security); SMTP padrão não serve para produção; projetos gratuitos pausam após uma semana sem uso (https://supabase.com/pricing).
- Custo ilustrativo de infraestrutura em 100, 1.000 e 10.000 famílias, em USD por mês e sem o custo de engenharia ([Preços datados](../08_Referencias/Tecnologias/Precos_Datados.md)):
  - Firebase: ~27, 35 e 139;
  - Supabase + PowerSync: ~101, 121 e 214;
  - API própria: ~64, 109 e 202.
- Com o serviço de domínio desta recomendação, o Conjunto B fica em ~108 a 126, 128 a 146 e 238 a 298 ([Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md), seção 2). Esses valores não incluem o PITR (+US$ 100/mês) nem a homologação.
- Diretriz 4.8 da App Store: login social exige opção equivalente; só e-mail próprio dispensa (https://developer.apple.com/app-store/review/guidelines/).

## Recomendação

**Conjunto B: Supabase (PostgreSQL e Auth, região São Paulo) + PowerSync Cloud (região BR) + serviço de domínio próprio**, desenhada em [Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md):

- todas as escritas de cuidado passam pelo serviço; os apps não escrevem direto no banco;
- o serviço implementa o contrato do [ADR-004](ADR-004_Offline_Sync_e_Temporizadores.md) e responde por operação;
- leitura offline pelos Sync Streams, com família resolvida pela tabela de vínculos;
- esquemas e papéis de banco separados por contexto; o módulo de comunidade não tem permissão nas tabelas de cuidado;
- autenticação por código de uso único por e-mail, com provedor de e-mail próprio, JWT curto, MFA no painel, sem login social no MVP.

Justificativa: o protocolo de escrita, que é o coração do cuidado compartilhado, fica sob nosso controle; a fila durável e o download parcial, que são o maior risco de cronograma do Conjunto C, vêm prontos; o esquema e o serviço são os mesmos do Conjunto C, o que torna a saída do PowerSync uma troca de peça, não uma reescrita; os dados de cuidado ficam no Brasil. O Conjunto A é o mais barato e rápido no início, mas resolve concorrência por última escrita, espalha autorização entre regras e Functions e tem a saída mais difícil.

**Alternativa principal: Conjunto C**, mantendo banco, esquema e serviço e trocando a sincronização.

### Linguagem do serviço

Decisão separada e reversível, porque o contrato fica em OpenAPI e JSON Schema. Opções comparadas na nota de dados (seção 6): TypeScript (NestJS ou Fastify), Python (Django + DRF) e Java ou Kotlin (Spring Boot). Proposta fraca: **TypeScript**, porque uma linguagem só no app, no serviço e no painel reduz a carga de manutenção de uma equipe de uma pessoa e a fila de tarefas pode ficar no próprio PostgreSQL (`pg-boss`). Não é escolhida por usar React Native: o motivo é a manutenção. Django ganha se o painel administrativo pronto pesar mais; Spring Boot ganha se a equipe for Java em primeiro lugar.

## Consequências

- Positivas: regras de escrita num lugar só; offline durável sem construir o motor de sincronização; PostgreSQL portátil; dados no Brasil.
- Negativas: dois fornecedores críticos; custo fixo maior no começo; os Sync Streams precisam espelhar as regras do serviço; um serviço próprio para construir e operar.

## Riscos e verificação que falta

- Provar na MAT-17 que a fila sobrevive ao encerramento, que o reenvio não duplica e que a revogação remove os dados do aparelho (P1, P2, P4).
- Testes que provem que serviço e Sync Streams recusam as mesmas coisas (P5).
- Confirmar a validade máxima do JWT aceita pelo PowerSync (a documentação diverge entre 60 minutos e 24 horas).
- Confirmar preços nas regiões do Brasil e a política de backup e restauração do Supabase para o RPO e o RTO definidos em [Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md).
- `op-sqlite` aparece como Beta no PowerSync ("production-ready for tested use cases"): cobrir o caso de uso na prova.

## Quando revisar

- Falha do PowerSync nas provas, mudança de licença ou de preço.
- Exigência de auto-hospedagem ou de controle total no Brasil.
- Volume acima dos limites do plano Pro do PowerSync.
- Necessidade de login social (exige Sign in with Apple ou equivalente).

## Referências

[Comparação de arquiteturas](../03_Arquitetura/Comparacao_de_Arquiteturas.md) · [Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md) · [Modelo de dados e permissões](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md) · [ADR-002](ADR-002_Framework_Mobile.md) · [ADR-004](ADR-004_Offline_Sync_e_Temporizadores.md) · [ADR-005](ADR-005_Isolamento_e_Fronteira_Comunidade.md) · [ADR-008](ADR-008_Documentacao_Operacao_Custos_e_Evolucao.md) · tarefas MAT-7, MAT-8, MAT-9, MAT-15 e MAT-17.
