---
tipo: indice-evidencias
status: em revisão
responsavel: Hermes (subagente de pesquisa)
revisado_em: 2026-10-22
repositorio: https://github.com/bckenstler/finnberry
branch: main
commit: 5e17b1a71e10735f0b6aaa22996ce37349d9402c
---

# Evidências de execução: Finnberry

Logs brutos da análise do repositório [bckenstler/finnberry](https://github.com/bckenstler/finnberry) no commit `5e17b1a71e10735f0b6aaa22996ce37349d9402c`. Ficha correspondente: [Finnberry](../../../08_Referencias/Repositorios/Finnberry.md). As marcas de evidência seguem as [Convenções do cofre](../../../00_Inicio/Convencoes.md).

## Ambiente

- Windows 11 Pro 10.0.26300, Git Bash, Git 2.53.0.windows.3.
- Node 24.20.0. pnpm 9.15.0, a versão fixada em `packageManager` no repositório.
- Docker 29.9.2 (build a82e528).
- Python 3.14.7, com `-I`, usado só no levantamento de licenças (log 07).
- Horários em America/Sao_Paulo (UTC−03:00), 22/10/2026.
- Clone em `C:/Projetos/AppMaternidade/_referencias/finnberry`, fora do Git do produto e tratado como somente leitura. O `git status` não mostra alteração em arquivos versionados (log 06). A pasta `node_modules` foi criada pela instalação do log 01.

## Origem dos arquivos

- **Logs 01 a 05.** Vêm de uma execução anterior do Hermes, interrompida às 03:14 por falha do provedor, e não por erro do projeto. Foram copiados de `AppData/Local/hermes/cache/scratch/finnberry-audit/logs/` sem alteração: os SHA-256 de origem e de destino são iguais (lista no fim).
- **Revisão de segredos antes da cópia.** Nenhum log contém senha ou token. A senha do PostgreSQL aparece como `<omitido>` no log 04 e como `***` no log 05. O arquivo `pg.env` não foi copiado.
- **Container.** O container `appmat-ref-finnberry-pg` foi removido depois pelo coordenador. Essa remoção não está registrada nestes logs.
- **Logs 06 e 07 e o roteiro.** Foram produzidos nesta sessão, das 03:59 às 04:00, só com leitura. Nesta sessão não foi criado container, servidor nem conta.

## O que cada arquivo prova

| Arquivo | Quando | Comando | O que prova | O que não prova |
| --- | --- | --- | --- | --- |
| [01-install.log](01-install.log) | 03:07:20–03:09:28 | `pnpm install`, com pnpm 9.15.0. O log registra a versão, mas não a linha de comando completa nem as opções. | As dependências do lockfile foram resolvidas e instaladas no Windows: 812 pacotes, exit=0, em 1 min 13 s. Aviso: o bin `finnberry-mcp` não foi criado porque `apps/mcp-server/dist` não existe, ou seja, o servidor MCP não foi compilado. | Não prova que o app compila ou roda. O build não foi feito. |
| [02-prisma-generate.log](02-prisma-generate.log) | 03:09:42–03:10:28 | `pnpm exec prisma generate`, em `packages/db` | O schema Prisma é válido e gera o Prisma Client 6.19.2. | Nada sobre banco real. |
| [03-vitest-all.log](03-vitest-all.log) | 03:10:39–03:11:40 | `pnpm exec vitest run`, no workspace com utils, schemas, api, web e mcp-server | 36 arquivos e 613 testes passaram em 38,92 s, exit=0. O `use-chat.test.ts` emite avisos `act(...)` no stderr, sem falha. | Os testes da API usam um Prisma simulado (mock). Eles não provam o comportamento com banco real, E2E, tempo real, offline nem escopo por família com dados reais. |
| [03-vitest-all.clean.log](03-vitest-all.clean.log) | mesma execução | O mesmo log, sem os códigos de cor ANSI | Mesmo conteúdo, em versão legível. | — |
| [04-postgres-docker.log](04-postgres-docker.log) | 03:13:00 | `docker run -d --name appmat-ref-finnberry-pg --label appmat.ref=finnberry -p 127.0.0.1:38110:5432 --tmpfs /var/lib/postgresql/data … postgres:16.6-alpine`, com a senha omitida | Um PostgreSQL 16.6 descartável subiu em 127.0.0.1:38110, com dados em tmpfs, e aceitou conexões. | Esse banco não é Supabase: não havia Realtime nem políticas de acesso. |
| [05-prisma-db-push.log](05-prisma-db-push.log) | 03:13:34–03:13:51 | `pnpm exec prisma db push --skip-generate`, com `DATABASE_URL` apontando para 127.0.0.1:38110 (senha `***`) | O schema foi aplicado em 726 ms e criou 17 tabelas (listagem `\dt`). No fim há uma segunda listagem, `tabela\|f`, das 17 tabelas, cujo comando de origem não ficou registrado. Pela forma, parece ser a coluna `relrowsecurity` de `pg_class`, o que indicaria RLS desligado [HIP]. | Seed, app em execução ou dados. |
| [06-identificacao-git.log](06-identificacao-git.log) | 03:59:58–04:00:00 | `git rev-parse`, `git log`, `git ls-remote origin refs/heads/main`, `git status`; contagens de commits, autores e arquivos; buscas por imagens, fontes, SQL e políticas RLS versionados; hash do LICENSE | Branch `main` e SHA `5e17b1a…`. Commit de 2026-01-29 23:36:19 −0800, ou 2026-01-30 07:36:19 UTC. O `main` remoto estava no mesmo SHA às 04:00 de 22/10/2026. 104 commits entre 25 e 30/01/2026 e 218 arquivos versionados. Nenhuma imagem, fonte, SQL, migração ou política RLS versionada. Clone sem alterações. | — |
| [07-licencas-dependencias.log](07-licencas-dependencias.log) e [07-licencas-dependencias.json](07-licencas-dependencias.json) | 04:00:23–04:00:26 | `python -I roteiros/dep_licenses.py <clone> 07-licencas-dependencias.json`, mais a leitura direta de três arquivos de licença | Contagem do campo `license` dos pacotes instalados: 977 versões no lockfile, das quais 812 instaladas. No fechamento de produção, 434 versões, 388 delas instaladas e com licença lida. Pacotes sinalizados: `@anthropic-ai/claude-agent-sdk` (proprietário), binários do sharp/libvips (Apache-2.0 e LGPL-3.0-or-later), MPL-2.0 em ferramentas de desenvolvimento e CC-BY-4.0 no `caniuse-lite`. | O campo `license` é autodeclarado e não substitui a leitura de cada LICENSE ou NOTICE. Pacotes de outras plataformas não foram instalados e não tiveram a licença lida. |
| [roteiros/dep_licenses.py](roteiros/dep_licenses.py) | — | Script que usa só a biblioteca padrão. Foi executado a partir do diretório de rascunho do Hermes, fora do clone. | Mostra como o log 07 foi gerado. | — |

## O que não foi executado

- `next dev`, `next build`, `pnpm build`, lint e type-check.
- Testes E2E (Playwright), rota de seed e servidor MCP.
- Nenhuma requisição HTTP ao app, nenhum login e nenhum dado além dos registros de teste em memória da suíte.
- Nenhum teste ou script de autorização, acesso sem login ou acesso a dados de outra família. Isso é proibido pelas regras desta frente e foi tratado só por leitura do código.
- Supabase e Realtime, cenários offline, temporizador em dois aparelhos e fusos horários.

## SHA-256 dos logs copiados (iguais aos originais)

```
6d8b29810e53668b63a99f121e9ccc2a1496edc8b1f547f7625db73544f9c8e4  01-install.log
c76ed77ea7aee46825a4f279907d4993e825db646869d88c8c921a5fd6e9f199  02-prisma-generate.log
75fdcb68bfa83fb4e1517e478a6a0162d720444688e24971fed7949acdfd9c06  03-vitest-all.clean.log
a52845afb7ac22d94e81ffd584b1075b515200182649570f827715b5989209d7  03-vitest-all.log
794b0d72788b9ef7f865309d61fc5b837fb9a7d14cef2bf8c902e260cf930855  04-postgres-docker.log
af84aa350474819ee5ad2cccb8cd7af52a761b5d44d24d9066c18444413f97a2  05-prisma-db-push.log
```

## Questões abertas

- Que opções exatas foram usadas no `pnpm install` do log 01, por exemplo `--frozen-lockfile` ou um store dedicado? O log não as registra.
- Que comando gerou a segunda listagem do log 05 (`tabela|f`)? A leitura `relrowsecurity` é hipótese.

## Limites desta análise

- Os logs 01 a 05 cobrem só instalação, geração do cliente, testes unitários e de integração com mock e criação do schema num PostgreSQL local. O app não chegou a ser iniciado.
- O horário de remoção do container não está registrado aqui. A informação vem do coordenador.
