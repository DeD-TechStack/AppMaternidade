---
tipo: evidencia-execucao
status: rascunho
responsavel: Hermes (subagente Baby Buddy)
revisado_em: 2026-10-22
referencia: babybuddy/babybuddy @ 09629cf633cf3a2059a21ade4cea7ea4d846422f
---

# Evidências de execução: Baby Buddy

Logs brutos da execução local do Baby Buddy feita em 22/10/2026 (America/Sao_Paulo) para a ficha [Baby_Buddy.md](../../../08_Referencias/Repositorios/Baby_Buddy.md). Todos os dados são fictícios. O banco era um SQLite descartável, e o servidor escutou só em 127.0.0.1:38231.

## Ambiente

- Windows 11, shell git-bash do Hermes, Python 3.12.10 num venv criado dentro do clone (`C:/Projetos/AppMaternidade/_referencias/babybuddy/.venv`).
- Clone na branch `master`, commit `09629cf633cf3a2059a21ade4cea7ea4d846422f` (12/10/2026), o mesmo da fotografia do pacote da task.
- `.env` de proteção criado no clone, só com valores fictícios. Ele impede que o `find_dotenv()` do projeto suba diretórios à procura de outro `.env`.
- Comandos Django rodados com `env -u DATABASE_URL -u DB_* -u SECRET_KEY ...`, porque o shell do Hermes é compartilhado com outro subagente que exportou `DATABASE_URL` (ver 02).

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| [01_setup.log](01_setup.log) | Clone, SHA, criação do venv, `pip install -r requirements.txt` e versões instaladas |
| [02_migrate_fake.log](02_migrate_fake.log) | `migrate`, `fake --children 2 --days 5`, usuários fictícios, grupos e permissões efetivas, contagem de registros |
| `03_api_curl.log` (fora do Git, decisão D7) | Exercício da API REST com curl: validações, timers, corrida na conversão de timer, fuso, duplicidade e autoria (códigos B, C e D citados na ficha), além de testes de acesso |
| [03b_corrida_rodada_exploratoria.log](03b_corrida_rodada_exploratoria.log) | Excerto do log do servidor na rodada exploratória (descartada): a mesma corrida do B-13 terminou com 1×201, 4×400 e 1×500 `database is locked` (SQLite) |
| [04_fuso_sessao_vs_token.log](04_fuso_sessao_vs_token.log) | Mesma API por sessão (`django.test.Client` + `force_login`) comparada com o acesso por token, mais a regra de soneca em cada fuso |
| [05_testes.log](05_testes.log) | Suíte do projeto: 528 testes OK e mais 1 teste isolado OK |
| `06_extras_sem_auth.log` (fora do Git, decisão D7) | Teste de acesso sem credencial |
| [07_licencas.log](07_licencas.log) | Licenças nos metadados das dependências Python, banners de licença nos bundles versionados, fontes de ícones e cobertura da tradução pt-BR |
| [08_nome_repetido.log](08_nome_repetido.log) | Segunda criança com o mesmo nome na instância: HTTP 500 por `UNIQUE constraint failed: core_child.slug` |
| [roteiros/](roteiros/) | Scripts usados. No original ficam no scratch do Hermes, fora do clone; aqui foram copiados com o caminho local substituído por `<SCRATCH>`. O `api_tests.sh` fica fora do Git (D7) |

## Higiene

- Revisão do coordenador por volta das 05:35: os arquivos com testes de acesso da primeira rodada (03, 06 e `roteiros/api_tests.sh`) continuam no disco, mas ficam no `.gitignore` até a decisão D7 ([Decisões para Daniel](../../../07_Roadmap/Decisoes_para_Daniel.md)).

- Os tokens dos usuários fictícios ficaram só em `<SCRATCH>/tokens.json`. Nos logs aparecem como `<resp_a>`, `<cuidadora_b>` etc., e o `api_key` das respostas foi mascarado.
- As páginas HTML de erro do modo DEBUG trazem `request.META`, que inclui o ambiente do processo. Por isso o log final as resume em uma linha (título e exceção). Às 03:13–03:14, a rodada exploratória gravou essas páginas em `03_api_curl.log`. O arquivo foi saneado em seguida e depois sobrescrito pela rodada final; o conteúdo bruto não permanece no cofre.
- Processos criados: dois `runserver` (python PID 14520, das 03:09 às 03:16, e PID 20108, das 03:19 às 03:27) e uma execução da suíte (das 03:22 às 03:25). Todos foram encerrados, e a porta 38231 estava livre na conferência com `netstat` às 03:27. Nenhum container Docker foi criado.

## Questões abertas

- Repetir a corrida de conversão de timer (03, B-13) com PostgreSQL, onde `select_for_update` tem efeito. No SQLite, a primeira rodada produziu um HTTP 500 `database is locked`.

## Limites desta análise

- A interface web não foi usada em navegador. A sessão foi exercitada pelo `django.test.Client`.
- Não foram testados DEBUG=False, gunicorn, PostgreSQL, S3, entrega de webhooks nem importação/exportação pelo admin.
