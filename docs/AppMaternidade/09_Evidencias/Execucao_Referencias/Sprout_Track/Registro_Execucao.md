---
tipo: evidencia-execucao
status: rascunho
responsavel: Hermes (subagente Sprout Track)
revisado_em: 2026-10-22
fontes_principais:
  - https://github.com/Oak-and-Sprout/sprout-track/tree/eb26949461bd0455cb8d6137dc5bc417a02adcf9
---

# Registro da execução local do Sprout Track

Ficha correspondente: [Sprout_Track.md](../../../08_Referencias/Repositorios/Sprout_Track.md).

## Ambiente

| Item | Valor |
| --- | --- |
| Data | 22/10/2026, 02:55–03:33 (America/Sao_Paulo) |
| Máquina | Windows 11 Pro 10.0.26300, shell Git Bash |
| Node / npm | v24.20.0 / 11.19.0 (README pede Node 22+; não houve erro de versão) |
| Clone | `C:/Projetos/AppMaternidade/_referencias/sprout-track/` (pasta ignorada pelo Git do produto) |
| Branch / SHA | `main` / `eb26949461bd0455cb8d6137dc5bc417a02adcf9` (igual à fotografia do pacote), commit de 2026-10-12 13:53:59 -0500 |
| Banco | SQLite em diretório temporário do Hermes (fora do clone), descartado ao final |
| Servidor | `next dev -H 127.0.0.1 -p 38317` (Next.js 16.3.3, Turbopack) |
| Segredos | `JWT_SECRET` e `ENC_HASH` aleatórios e descartáveis, passados por variável de ambiente; nenhum `.env` criado ou lido |
| Docker | Não usado |

## Passos e resultados

| # | Comando (resumo) | Resultado | Log |
| --- | --- | --- | --- |
| 1 | `npm ci --ignore-scripts --no-audit --no-fund` | 874 pacotes em ~5 min; exit 0; avisos de depreciação | [01_npm_ci.log](01_npm_ci.log) |
| 2 | `npx prisma generate` e `--config prisma/log.config.ts` | Clientes Prisma 7.10.0 gerados; exit 0 | [02_prisma_generate.log](02_prisma_generate.log) |
| 3 | `npx prisma migrate deploy` | Todas as migrações aplicadas; o CLI baixou `schema-engine-windows.exe` para `node_modules/@prisma/engines` (local ao clone) | [03_prisma_migrate.log](03_prisma_migrate.log) |
| 3b | `npx prisma db push --config prisma/log.config.ts --accept-data-loss` (banco de logs da API) | **Recusado** pelo Prisma 7.10 (03:12:13): o CLI detectou execução por agente de IA e exigiu consentimento explícito do usuário para ação destrutiva. Não contornado. Banco de logs desnecessário com `ENABLE_LOG=false` | [03_prisma_migrate.log](03_prisma_migrate.log) |
| 4 | `prebuild-install` do `better-sqlite3@12.11.1` aninhado em `@prisma/adapter-better-sqlite3` (passo `install` pulado pelo `--ignore-scripts`) | Binário pré-compilado baixado do GitHub Releases do WiseLibs e extraído; exit 0. O tarball ficou em `npm-cache/_prebuilds` e foi removido ao final | [04_better_sqlite3_prebuild.log](04_better_sqlite3_prebuild.log) |
| 5 | `npx tsx prisma/seed.ts` | Família padrão `my-family`, cuidador de sistema com PIN padrão documentado, 28 unidades, curvas CDC/OMS; exit 0 | [05_seed.log](05_seed.log) |
| 6 | `npx next dev -H 127.0.0.1 -p 38317` | Pronto em 2,2 s; 424 requisições registradas. Efeito colateral: o `next dev` 16.3 acrescentou um bloco "agent rules" ao `CLAUDE.md` do clone; revertido com `git checkout -- CLAUDE.md` | `06_next_dev.log` (fora do Git, D7) |
| 7 | Roteiro da API (`python -I roteiros/api_probe.py`) | 74 passos, 03:17:15–03:17:44 | `07_api_probe.json` (fora do Git, D7) |
| 8 | Verificação complementar (`roteiros/api_probe2.py`) | 6 passos, 03:19:54 | `08_api_probe2.json` (fora do Git, D7) |
| 9 | Interface pelo navegador + teste offline | Registro próprio | `12_UI_Navegador.md` e `09_check_offline.json` (fora do Git, D7) |
| 10 | `npx vitest run` | 132 arquivos: 131 passaram, 1 falhou; 1.753 testes passaram, 2 falharam (`tests/prisma-adapter.test.ts` espera caminhos POSIX e recebeu `C:\...` no Windows) | [10_vitest.log](10_vitest.log) |
| 11 | Leitura do `package-lock.json` (v3) por script, sem rede e sem instalar nada. Feita pelo coordenador às 06:21, depois da revisão independente | 1.023 entradas: 520 de produção, contando binários opcionais por plataforma, e 503 de desenvolvimento. Licença pelo campo declarado no lock; LICENSE não conferido | [13_licencas_dependencias.tsv](13_licencas_dependencias.tsv) |

Resumo legível dos 80 passos da API: `11_Resumo_Passos_API.md` (fora do Git, D7).

## Encerramento e limpeza (03:29–03:33)

- Servidor: o encerramento do processo `npx` não derrubou o filho; a árvore `next dev` (PIDs 16568 → 27764 → 30056, 16672) foi finalizada com `taskkill /T /F`. Porta 38317 confirmada livre; nenhum `node.exe` com `sprout-track` na linha de comando.
- Navegador: 3 abas da sessão isolada `appmat-sprout` fechadas.
- Clone: `git status` limpo após reverter `CLAUDE.md`; `node_modules/`, `.next/` e `next-env.d.ts` permanecem (ignorados pelo `.gitignore` do projeto).
- Cache: removido o tarball `npm-cache/_prebuilds/4d2ad7-better-sqlite3-v12.11.1-node-v137-win32-x64.tar.gz` e a pasta `_prebuilds` (criados por este passo). O cache normal do npm (`_cacache`) recebeu os pacotes do `npm ci`, comportamento padrão do npm; não foi alterado.
- Nenhum container, imagem ou volume Docker criado. Nenhuma instalação global.

## Sobre os roteiros e a divulgação

Os roteiros em `roteiros/` são do Hermes, não código do Sprout Track. Usam somente dados e PINs fictícios de uma instância local já destruída. Os roteiros de sondagem (`api_probe.py`, `api_probe2.py`, `check_offline.py`) e os registros dos passos 6 a 9 e 11 registram comportamentos que pedem avaliação dos mantenedores. Por isso ficam fora do Git até a decisão D7 ([Decisões para Daniel](../../../07_Roadmap/Decisoes_para_Daniel.md)), e a ficha não os detalha (revisão do coordenador por volta das 05:36).

## Questões abertas

- Se Daniel decidir avisar os mantenedores (D7), a verificação de correções fica com eles. O Hermes não repete os roteiros de sondagem.
- Teste em aparelho móvel real (PWA instalado) não foi feito.

## Limites desta análise

Execução em modo de desenvolvimento (`next dev`), não `next build`/`start` nem Docker; SQLite apenas (PostgreSQL não testado); notificações desativadas (`ENABLE_NOTIFICATIONS=false`), sem VAPID/FCM/APNs; modo SaaS e contas por e-mail não exercitados; uma única execução de cada passo, sem medição de desempenho.
