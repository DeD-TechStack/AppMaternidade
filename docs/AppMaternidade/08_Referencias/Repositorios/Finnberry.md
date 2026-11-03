---
tipo: ficha-repositorio
status: rascunho
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
tarefa: MAT-5
repositorio: https://github.com/bckenstler/finnberry
branch: main
commit: 5e17b1a71e10735f0b6aaa22996ce37349d9402c
licenca_raiz: MIT
fontes_principais:
  - https://github.com/bckenstler/finnberry/tree/5e17b1a71e10735f0b6aaa22996ce37349d9402c
  - https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/LICENSE
  - https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/db/prisma/schema.prisma
  - https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.ts
  - https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/stores/timer-store.ts
---

# Finnberry

Ficha escrita por leitura do código no commit `5e17b1a` e pelos registros de execução já existentes ([índice de evidências](../../09_Evidencias/Execucao_Referencias/Finnberry/00_Indice.md)). Marcas de evidência conforme as [Convenções](../../00_Inicio/Convencoes.md). Os links de código apontam para o commit analisado; os números de linha valem para ele.

Neste documento, `B` abrevia `https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c`.

## Resumo

- **O que é.** App web (Next.js) de registro de cuidados do bebê, com sono, alimentação, fraldas, bombeamento, crescimento, temperatura, atividades e remédios; família com papéis; tempo real pelo Supabase; chat de IA e servidor MCP. O próprio repositório se descreve como "clone of Huckleberry" ([CLAUDE.md](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/CLAUDE.md)) [DOC].
- **Serve como referência para:** modelo de família com quatro papéis, convite por e-mail com validade, exclusão de conta com transferência de titularidade, temporizador derivado do instante de início e tummy time como atividade com timer, sem meta [CÓDIGO].
- **Não serve como referência para:** offline (não há fila nem cache persistente), app mobile (só web), autoria dos registros (não existe), fuso (o "hoje" é calculado no servidor) e isolamento por família (ficam perguntas de auditoria, abaixo) [CÓDIGO].
- **Execução.** Instalação, geração do cliente Prisma, 613 testes unitários e de integração (com Prisma simulado) e criação do schema num PostgreSQL local descartável [EXEC, logs 01 a 05]. O app não foi iniciado.
- **Licença.** MIT na raiz; dependências majoritariamente permissivas, com três pontos a conferir ([Licenças por material](#licenças-por-material)).
- **Maturidade.** 104 commits entre 25 e 30/01/2026, nenhum depois disso no `main` até 22/10/2026 (log 06) [EXEC]. tRPC em release candidate e NextAuth em beta.

## Identificação

| Item | Valor | Evidência |
| --- | --- | --- |
| Repositório | https://github.com/bckenstler/finnberry | — |
| Branch e commit | `main`, `5e17b1a71e10735f0b6aaa22996ce37349d9402c` | [EXEC] log 06 |
| Data do commit | 29/01/2026 23:36:19 −0800 (30/01/2026 07:36:19 UTC), "Add Vercel deployment section to README (#46)" | [EXEC] log 06 |
| `main` remoto em 22/10/2026 04:00 | Mesmo SHA | [EXEC] log 06 (`git ls-remote`) |
| Histórico | 104 commits; primeiro em 25/01/2026; autores: Brad Kenstler (89), "Claude" (8), "Ubuntu" (7) | [EXEC] log 06 |
| Tamanho | 218 arquivos versionados; nenhuma imagem, fonte, SQL, migração ou política RLS versionada | [EXEC] log 06 |
| Licença raiz | MIT, "Copyright (c) 2026 bckenstler"; SHA-256 `2aa2c07d…8aa5de` | [CÓDIGO] [LICENSE](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/LICENSE); log 06 |
| Clone local | `C:/Projetos/AppMaternidade/_referencias/finnberry`, somente leitura, sem alteração em arquivos versionados | [EXEC] log 06 |

## Stack confirmada

Faixas de versão declaradas nos `package.json` do commit [CÓDIGO]; versões instaladas só onde há log.

| Componente | Declarado | Observação |
| --- | --- | --- |
| Next.js / React | `^15.1.4` / `^19.0.0` | App Router; só web, sem app mobile nem PWA |
| tRPC | `^11.0.0-rc.682` | Release candidate na fundação |
| Prisma | `^6.2.0` | Cliente gerado na versão 6.19.2 [EXEC, log 02] |
| NextAuth (Auth.js) | `^5.0.0-beta.25` | Beta; adaptador Prisma; magic link (Nodemailer) e Google, ambos opcionais por configuração ([auth.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/lib/auth.ts)) |
| Banco | PostgreSQL (Supabase, segundo o README) | Schema aplicado num PostgreSQL 16.6 local [EXEC, log 05] |
| Tempo real | `@supabase/supabase-js ^2.48.1` | Canal aberto no navegador |
| Estado local | `zustand ^5.0.3` com `persist` em `localStorage` | Só para temporizadores |
| IA | `@anthropic-ai/sdk ^0.71.2`, `@anthropic-ai/claude-agent-sdk ^0.2.20`, `@modelcontextprotocol/sdk ^1.4.0` | Chat no app e servidor MCP |
| Validação | `zod ^3.24.1` | Schemas compartilhados em `packages/schemas` |
| Monorepo e testes | Turborepo `^2.3.0`, pnpm 9.15.0, Vitest `^2.1.0`, Playwright `^1.48.0` | — |

## Fluxos analisados

| Fluxo | Arquivos lidos |
| --- | --- |
| Iniciar, consultar e encerrar sono | [sleep.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/sleep.ts), [timer-store.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/stores/timer-store.ts), [use-timer.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/hooks/use-timer.ts), `packages/schemas/src/sleep.ts` |
| Atividades, incluindo tummy time | `packages/api/src/routers/activity.ts`, `packages/schemas/src/activity.ts`, [schema.prisma L338–L364](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/db/prisma/schema.prisma#L338-L364) |
| Convidar, aceitar, mudar papel, remover membro | [household.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/household.ts), `packages/schemas/src/household.ts` |
| Excluir conta | [user.ts L42–L103](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/user.ts#L42-L103) |
| Tempo real entre cuidadores | [use-realtime.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/hooks/use-realtime.ts), [supabase.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/lib/supabase.ts) |
| Resumo do dia | [sleep.ts L172–L217](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/sleep.ts#L172-L217), [date.ts L63–L74](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/utils/src/date.ts#L63-L74) |
| Chat de IA e servidor MCP | [chat/route.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/api/chat/route.ts), [mcp-server/src/index.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/mcp-server/src/index.ts) |
| Middleware de acesso | [trpc.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.ts), [trpc.test.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.test.ts) |

## Achados por tema

### Modelo de domínio

- **Família e papéis** [CÓDIGO]. `Household` tem membros (`HouseholdMember`, único por família e usuário) com papel `OWNER`, `ADMIN`, `CAREGIVER` ou `VIEWER`, padrão `CAREGIVER` ([schema.prisma L87–L107](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/db/prisma/schema.prisma#L87-L107)). `HouseholdInvite` guarda e-mail, papel, token único e validade ([L109–L121](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/db/prisma/schema.prisma#L109-L121)).
- **Registros pendurados na criança** [CÓDIGO]. Cada registro aponta para `Child`, que aponta para `Household`; os registros não têm coluna de família. Toda relação usa exclusão em cascata.
- **Sessões com início e fim** [CÓDIGO]. Sono, mamada, bombeamento e atividade têm `startTime` e `endTime` opcional; sessão em andamento é a que tem `endTime` nulo. Fralda, temperatura e dose de remédio têm um instante só.
- **Sem autoria** [CÓDIGO]. Nenhum registro guarda quem criou, encerrou ou editou; só `createdAt` e `updatedAt`. Não há versão, exclusão lógica nem id de operação.
- **Tummy time** [CÓDIGO]. É um valor de `ActivityType` (junto com banho, brincadeira, tela, pele a pele, leitura e escovação) e usa timer; não há meta, marco nem conteúdo associado ([L338–L364](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/db/prisma/schema.prisma#L338-L364)).
- **Crescimento** [CÓDIGO]. Peso, altura e perímetro cefálico; o CLAUDE.md diz que curvas de percentil não foram implementadas [DOC].

### Validações

- Os ids são validados como CUID e as datas são convertidas por `z.coerce.date()` ([common.ts L3](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/schemas/src/common.ts#L3)) [CÓDIGO].
- Nenhum schema em `packages/schemas/src` usa `refine` ou `superRefine` (busca no código). Não há regra de fim depois do início, de sobreposição nem de data futura [CÓDIGO].
- "Uma sessão de sono ativa por criança" é conferida lendo antes de criar ([sleep.ts L60–L72](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/sleep.ts#L60-L72)), sem restrição no banco. Dois inícios simultâneos podem criar duas sessões ativas [HIP, não testado].
- Encerrar grava `endTime` pelo id sem conferir se a sessão já estava encerrada ([L85–L105](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/sleep.ts#L85-L105)); um segundo encerramento sobrescreve o primeiro [CÓDIGO].

### Autorização e isolamento

Descrição por leitura do código, em termos de design. Nada foi executado contra o app, e nenhum acesso foi testado.

- **Três níveis de procedimento** [CÓDIGO]: público, autenticado (exige sessão) e de família (sessão mais vínculo com a família) ([trpc.ts L59–L74](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.ts#L59-L74)). Os papéis são conferidos dentro de cada rota: `VIEWER` não grava; `OWNER` e `ADMIN` convidam e editam a família; só `OWNER` muda papéis e apaga a família ([household.ts](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/household.ts)).
- **Família resolvida a partir da entrada** [CÓDIGO]. O middleware procura a família por `householdId`, por `childId` ou por `id`, interpretado como criança ou como família ([L77–L119](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.ts#L77-L119)). Quando não encontra, segue sem família e sem papel no contexto ([L155–L171](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.ts#L155-L171)).
- **Operações por id de registro.** Encerrar, editar e apagar recebem só o id do registro, conferem se o papel é `VIEWER` e gravam filtrando pelo id ([sleep.ts L85–L170](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/sleep.ts#L85-L170); o mesmo padrão em `activity.ts`) [CÓDIGO]. Pela leitura, não fica evidente onde essas operações conferem que o registro pertence a uma família do usuário. Os testes do middleware cobrem família, criança, `id` de criança e criança de outra família ([trpc.test.ts L59–L140](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/trpc.test.ts#L59-L140)), mas não um id que não seja de criança nem de família. **Pergunta de auditoria, não vulnerabilidade demonstrada.**
- **Canal de tempo real.** O navegador abre o canal com a chave pública do Supabase ([supabase.ts L1–L6](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/lib/supabase.ts#L1-L6)), e o filtro por criança é escolhido pelo cliente ([use-realtime.ts L21–L30](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/hooks/use-realtime.ts#L21-L30)) [CÓDIGO]. O login é do NextAuth, não do Supabase Auth, então o canal não leva a identidade do usuário [HIP, inferido da configuração]. O que cada assinante recebe depende das políticas do banco, e o repositório não versiona nenhuma (log 06); o log 05 sugere RLS desligado [HIP]. **Pergunta de auditoria, não vulnerabilidade demonstrada.**
- **Ferramentas do chat de IA.** A rota confere a sessão e se a criança da conversa pertence a uma família do usuário ([chat/route.ts L97–L141](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/api/chat/route.ts#L97-L141)) [CÓDIGO]. As ferramentas rodam com acesso direto ao banco, e o `childId` da conversa só é injetado quando o modelo não informa outro ([L266–L272](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/api/chat/route.ts#L266-L272)) [CÓDIGO]. **Pergunta de auditoria:** as ferramentas ficam limitadas à família da conversa quando o modelo informa outro id?
- **Servidor MCP** [CÓDIGO]. Roda por stdio com a `DATABASE_URL` completa e sem conceito de usuário ([index.ts L14, L73](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/mcp-server/src/index.ts)). É pensado para uma instalação de uma família só, não para um serviço com várias famílias.
- **Rota de dados de teste** [CÓDIGO]. `/api/test/seed` cria usuários e sessões para os testes E2E e só responde com `NODE_ENV` igual a `development` ou `test` ([seed/route.ts L10](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/api/test/seed/route.ts#L10)).

### Timers

- **Duração derivada do início** [CÓDIGO]. O temporizador ativo guarda `startTime` em milissegundos; o tempo decorrido é `Date.now() − startTime`, sem contador em segundo plano ([timer-store.ts L147–L151](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/stores/timer-store.ts#L147-L151)). O estado persiste em `localStorage` com a chave `finnberry-timers` ([L157–L160](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/stores/timer-store.ts#L157-L160)).
- **Amamentação por lado** [CÓDIGO]. Acumula milissegundos à esquerda e à direita e reinicia o segmento na troca de lado ([L99–L135](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/stores/timer-store.ts#L99-L135)). O banco guarda as durações por lado em segundos.
- **Dois lugares de verdade** [CÓDIGO]. O timer local é por navegador; o registro no banco, com `endTime` nulo, é o que outro cuidador enxerga por `getActive` ([sleep.ts L36–L48](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/sleep.ts#L36-L48)). Segundo o CLAUDE.md, a interface sincroniza ao abrir o modal quando a sessão foi iniciada pelo chat ou pelo MCP [DOC].
- **Relógios misturados** [CÓDIGO]. O início e o fim gravados no banco vêm do campo enviado pelo cliente ou, sem ele, do relógio do servidor (`input.startTime ?? new Date()`, `input.endTime ?? new Date()`). O timer local usa o relógio do aparelho. A diferença entre os dois relógios entra na duração [HIP].
- **Persistência após recarregar.** Os testes E2E `timer-persistence.spec.ts` cobrem recarregar a página [CÓDIGO]; não foram executados.

### Persistência e offline

- Não há service worker, manifesto, cache de consultas persistido nem detecção de conexão (busca por `serviceWorker`, `navigator.onLine`, `onlineManager`, `persistQueryClient` e manifesto em `apps/web`, sem resultado) [CÓDIGO]. O CLAUDE.md lista "PWA support not added" [DOC].
- Sem conexão, as mutações vão direto ao tRPC e não ficam numa fila [CÓDIGO]; o comportamento na tela não foi observado [HIP].
- Só o temporizador sobrevive a recarregar; os registros, não.

### UI de registro e histórico

- O README declara grade de registro rápido, visões de dia, semana e lista, linha do tempo visual e edição com controles de duração [DOC]. Os componentes existem em `apps/web/src/components/tracking` e `reports` [CÓDIGO, só árvore]. Nada foi visto em execução.
- Interface só em inglês; nenhuma biblioteca de internacionalização encontrada [CÓDIGO].
- O convite é criado na tela de configurações da família ([settings/page.tsx L108](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/(dashboard)/dashboard/household/settings/page.tsx#L108)), mas nenhum arquivo `.tsx` chama `acceptInvite` e não há rota com "invite" no caminho em `apps/web/src/app` [CÓDIGO]. Como o convidado recebe e usa o token ficou sem resposta.

### Relatórios

- Os resumos por período ("today", "week", "month") são calculados no servidor com `startOfDay(new Date())` ([date.ts L63–L74](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/utils/src/date.ts#L63-L74)) [CÓDIGO]. O "hoje" segue o fuso do servidor; num servidor em UTC, o dia de uma família em Brasília viraria às 21h [HIP, não executado]. "Mês" é os últimos 30 dias.
- Uma rota `timeline` agrega os oito tipos de registro para as três visões [CÓDIGO, `timeline.ts`].

### API

- Doze routers tRPC com SuperJSON: activity, child, diaper, feeding, growth, household, medicine, pumping, sleep, temperature, timeline e user [CÓDIGO]. Não há API REST documentada; o acesso externo é pelo servidor MCP.

### Testes

- **Executados:** 36 arquivos e 613 testes passaram em 38,92 s [EXEC, log 03]. Os testes da API usam Prisma simulado ([CLAUDE.md](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/CLAUDE.md), seção Testing) [DOC], portanto não provam comportamento com banco real.
- **Não executados:** cinco specs Playwright (login, família, registro, persistência do timer, tempo real) [CÓDIGO].
- **Sem cobertura aparente:** concorrência entre cuidadores, offline, fuso e o caso de id não resolvido no middleware [CÓDIGO].

### Configuração e i18n

- Variáveis: `DATABASE_URL`, `DIRECT_URL` e `AUTH_SECRET` obrigatórias; Google, SMTP, chaves do Supabase (pública e de serviço) e `ANTHROPIC_API_KEY` opcionais (CLAUDE.md) [DOC].
- Deploy pensado para Vercel, com `maxDuration` de 60 s no chat ([chat/route.ts L8](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/api/chat/route.ts#L8)) [CÓDIGO].
- Sem notificações push (busca por `web-push`, `PushManager` e `Notification.requestPermission`, sem resultado) [CÓDIGO].

## Execução

Resumo; detalhes, comandos e SHA-256 no [índice de evidências](../../09_Evidencias/Execucao_Referencias/Finnberry/00_Indice.md).

| Etapa | Resultado | Evidência |
| --- | --- | --- |
| `pnpm install` (pnpm 9.15.0, Node 24.20.0, Windows) | 812 pacotes, exit 0; bin `finnberry-mcp` não criado porque o MCP não foi compilado | [EXEC] [01-install.log](../../09_Evidencias/Execucao_Referencias/Finnberry/01-install.log) |
| `prisma generate` | Cliente 6.19.2 gerado; schema válido | [EXEC] [02-prisma-generate.log](../../09_Evidencias/Execucao_Referencias/Finnberry/02-prisma-generate.log) |
| `vitest run` | 613 testes em 36 arquivos, exit 0 | [EXEC] [03-vitest-all.clean.log](../../09_Evidencias/Execucao_Referencias/Finnberry/03-vitest-all.clean.log) |
| PostgreSQL 16.6 em container `appmat-ref-finnberry-pg`, 127.0.0.1:38110, dados em tmpfs | Aceitou conexões | [EXEC] [04-postgres-docker.log](../../09_Evidencias/Execucao_Referencias/Finnberry/04-postgres-docker.log) |
| `prisma db push` | 17 tabelas criadas em 726 ms | [EXEC] [05-prisma-db-push.log](../../09_Evidencias/Execucao_Referencias/Finnberry/05-prisma-db-push.log) |
| Identificação Git e levantamento de licenças | Ver as seções acima | [EXEC] logs 06 e 07 |

- Os logs 01 a 05 são da primeira tentativa, interrompida às 03:14 pelo filtro do provedor, sem erro do projeto. O container foi removido pelo coordenador depois (não há porta 38xxx nem container `appmat-ref-*` ativo às 04:35).
- **Não executado:** `next dev`, build, lint, type-check, E2E, rota de seed, servidor MCP, chat, tempo real, offline, dois aparelhos e fusos. Nenhuma requisição ao app e nenhum login.

## Licenças por material

| Material | Licença | Evidência | O que observar |
| --- | --- | --- | --- |
| Código do repositório | MIT | [CÓDIGO] LICENSE lido; log 06 | Manter o aviso de copyright e de permissão em cópias substanciais |
| Dependências de produção (434 versões no fechamento) | MIT 340, ISC 19, Apache-2.0 17, BSD-3-Clause 4, BSD-2-Clause 2, MIT-0 1, 0BSD 1 | [EXEC] log 07, campo `license` autodeclarado | Conferir LICENSE e NOTICE antes de usar qualquer uma |
| `@anthropic-ai/claude-agent-sdk` 0.2.20 | "SEE LICENSE IN README.md" (termos próprios, não open source) | [EXEC] log 07 | Fora de qualquer reaproveitamento sem ler os termos |
| Binários `@img/sharp-*` (libvips) | Apache-2.0 AND LGPL-3.0-or-later | [EXEC] log 07 | Obrigações da LGPL ao redistribuir o binário |
| Ferramentas de desenvolvimento | MPL-2.0 (por exemplo, `axe-core`) e CC-BY-4.0 (`caniuse-lite`) | [EXEC] log 07 | Só desenvolvimento; não entram no app |
| Imagens e fontes | Nenhuma versionada | [EXEC] log 06 | — |
| Textos educativos | Não há | [CÓDIGO] | — |
| Nome e marca | "Finnberry"; o repositório se diz clone do Huckleberry | [DOC] | Não usar nome, marca nem a associação |

## O que aproveitar como conceito

1. Família com quatro papéis e a regra "quem só vê não grava".
2. Convite por e-mail com validade de 7 dias, aceito só pelo e-mail convidado e consumido na mesma transação que cria o vínculo ([household.ts L127–L213](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/household.ts#L127-L213)).
3. Exclusão de conta com confirmação por e-mail: a titularidade passa ao primeiro administrador ou membro, e a família só é apagada quando não sobra ninguém ([user.ts L42–L103](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/user.ts#L42-L103)). Isso conversa com a exigência de exclusão de conta dentro do app.
4. Temporizador derivado do instante de início, persistido no aparelho, com acumulação por lado na amamentação.
5. Tummy time como atividade com timer e sem meta, coerente com a linha editorial sem cobrança.
6. Uma consulta de linha do tempo que junta todos os tipos de registro.

## O que pode ser reutilizado conforme a licença

O MIT permite reutilizar o código desde que o aviso de copyright e de permissão acompanhe as partes copiadas. Como a stack proposta é outra (React Native + Expo, PowerSync e serviço de domínio; [ADR-002](../../06_ADRs/ADR-002_Framework_Mobile.md) e [ADR-003](../../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md)), o reaproveitamento direto se limita a peças pequenas em TypeScript:

- conversões de unidade (`packages/utils/src/format.ts`: ml e oz, peso, altura, temperatura);
- a lógica de acumulação por lado do `timer-store.ts`, fora do Zustand;
- enumerações dos schemas Zod (tipos de fralda, de alimentação e de atividade), traduzidas e revistas.

Cada trecho copiado leva o aviso MIT e a referência ao commit. Nada de imagem, texto ou marca.

## Adaptações necessárias

- **Autoria:** "iniciado por", "encerrado por" e "editado por" em todo registro, com histórico ([Modelo de dados e permissões](../../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md)).
- **Escopo por família:** resolvido a partir do registro gravado no servidor, nunca do que o cliente envia, e repetido na camada de dados e nas regras de sincronização ([ADR-005](../../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md)).
- **Sessões em andamento:** sessões paralelas são detectadas e resolvidas, sem recusar a intenção feita offline. O servidor aceita as duas e a interface oferece "unir" ou "encerrar uma". O segundo encerramento é tratado explicitamente ([Offline, seção 7.2](../../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md); [ADR-004](../../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md)).
- **Validações:** fim antes do início é recusado. Sobreposição e datas no futuro geram aviso, com tolerância e sem bloqueio ([Offline, seção 8](../../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)).
- **Tempo:** instante com fuso da família; "hoje" calculado no fuso da família, não no do servidor.
- **Offline:** fila local persistente com id de operação, no lugar de mutações diretas ([Offline, sincronização e temporizadores](../../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)).
- **Saída do titular:** `removeMember` deixa o titular sair sem transferir a titularidade ([household.ts L245–L287](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/packages/api/src/routers/household.ts#L245-L287)) [CÓDIGO]; a família pode ficar sem titular [HIP]. No AppMaternidade, a saída exige transferência antes.
- **Tempo real completo:** o canal por criança só escuta sono, mamada e fralda ([use-realtime.ts L21–L64](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/hooks/use-realtime.ts#L21-L64)) [CÓDIGO]; atividades (inclusive tummy time) e bombeamento não chegam em tempo real ao outro cuidador [HIP].

## O que não reproduzir

- Família descoberta a partir da entrada, com passagem sem contexto quando não é encontrada.
- Canal de tempo real com chave pública e filtro escolhido pelo cliente sem políticas versionadas.
- Nome e data de nascimento da criança no prompt de sistema enviado a um provedor externo de IA ([chat/route.ts L158](https://github.com/bckenstler/finnberry/blob/5e17b1a71e10735f0b6aaa22996ce37349d9402c/apps/web/src/app/api/chat/route.ts#L158)) [CÓDIGO]. Envolve transferência de dado de criança a terceiro; a proposta do MVP é não ter IA generativa respondendo a usuários ([Decisões para Daniel](../../07_Roadmap/Decisoes_para_Daniel.md), D4).
- Ferramentas de IA ou servidor MCP com acesso direto ao banco num produto com várias famílias.
- "Hoje" calculado no fuso do servidor.
- Dependências em release candidate ou beta na fundação (tRPC RC, NextAuth beta).

## Riscos e problemas encontrados

| Risco | Evidência | Impacto para o AppMaternidade |
| --- | --- | --- |
| Projeto curto e parado: 104 commits em 6 dias, nada depois de 30/01/2026 | [EXEC] log 06 | Referência, não base de código |
| Escopo por família nas operações por id de registro não evidente | [CÓDIGO] trpc.ts, sleep.ts | Reforça o ADR-005; pergunta de auditoria |
| Políticas de acesso do banco fora do repositório | [EXEC] log 06; [HIP] log 05 | O tempo real depende de configuração não versionada |
| Sem autoria nos registros | [CÓDIGO] schema.prisma | O diferencial de passagem de turno não tem base aqui |
| Corrida ao iniciar sessão e sobrescrita ao encerrar | [CÓDIGO]; [HIP] para a corrida | Cenário Q-03 precisa de regra no banco |
| Dados da criança enviados a provedor de IA | [CÓDIGO] chat/route.ts | LGPD e consentimento; fora do MVP |
| Fuso do servidor nos resumos | [CÓDIGO] date.ts | Cenário Q-09 |
| Convite sem tela de aceite encontrada | [CÓDIGO] | Fluxo incompleto; o AppMaternidade define o seu em [Fluxos e telas](../../02_Experiencia/Fluxos_e_Telas.md) |

## Relação com os cenários Q-01 a Q-12

| Cenário | O que o Finnberry mostra | Classe | Lição para o AppMaternidade |
| --- | --- | --- | --- |
| Q-01 registro offline, fechar e reabrir | Não há fila nem cache persistente; só o timer local sobrevive | [CÓDIGO] | Fila local persistente com estado visível |
| Q-02 reenvio | Sem id de operação; um reenvio cria outro registro | [CÓDIGO] | Id de operação gerado no aparelho e resposta idempotente |
| Q-03 A inicia, B encerra | B encerra pelo registro no banco, mas a autoria não é gravada; o segundo encerramento sobrescreve | [CÓDIGO] | "Iniciado por" e "encerrado por", e duplo encerramento tratado |
| Q-04 edição concorrente | Última gravação vence, sem versão nem aviso | [CÓDIGO] | Versão por registro e conflito visível |
| Q-05 revogação | Remover membro apaga o vínculo; não há cache offline a limpar | [CÓDIGO] | Revalidar operações na reconexão e apagar dados locais |
| Q-06 ids de outra família | Ver "Autorização e isolamento": perguntas de auditoria | [CÓDIGO] | Escopo pelo registro gravado e testes de acesso negado em todas as rotas e canais |
| Q-07 comunidade | Não existe | [CÓDIGO] | Sem referência |
| Q-08 tela bloqueada ou app encerrado | Duração derivada do início; persiste ao recarregar | [CÓDIGO]; E2E não executado | Mesmo princípio, com estado local e no servidor |
| Q-09 fuso e meia-noite | "Hoje" no fuso do servidor; relógios do aparelho e do servidor misturados | [CÓDIGO]; [HIP] para o efeito | Fuso gravado com o evento e regra única de dia |
| Q-10 notificação negada | Não há notificações | [CÓDIGO] | Registrar e sincronizar sem depender de push |
| Q-11 denúncia e moderação | Não existe | [CÓDIGO] | Sem referência |
| Q-12 exportar, excluir, backup | Exclusão de conta com transferência de titularidade; exportação ainda sem interface (CLAUDE.md) | [CÓDIGO]; [DOC] | Exportação por família e exclusão propagada |

## Questões abertas

1. Em que ponto as operações por id de registro conferem a família? (Pergunta de auditoria; resposta só com leitura completa dos routers e dos testes.)
2. O projeto Supabase usado em produção tinha políticas de acesso configuradas fora do repositório?
3. Como o convidado recebe e usa o token do convite?
4. Com RLS ligado e sem políticas, o tempo real deixaria de entregar eventos sem aviso? [HIP]
5. A segunda listagem do log 05 (`tabela|f`) é de fato `relrowsecurity`?

## Limites desta análise

- Ficha escrita pelo coordenador, por leitura de código no commit analisado e pelos logs já existentes, depois de duas tentativas de subagente que não terminaram: a primeira interrompida às 03:14 pelo filtro do provedor; a segunda, às 04:30, por falta de resposta do provedor, depois de salvar o índice de evidências.
- Pela regra desta frente, não houve requisição ao app, login, nem teste de autorização ou de acesso a dados de outra família. As observações de acesso são perguntas de auditoria.
- Os achados de comportamento sem execução são [CÓDIGO] ou [HIP]; nenhum foi observado no app rodando.
- Leitura parcial: `timeline.ts`, os componentes de interface e as ferramentas do MCP foram vistos só por busca.

## Voltar

[Home](../../00_Inicio/Home.md) · [Progresso](../../00_Inicio/Progresso.md) · [Baby Buddy](Baby_Buddy.md)
