---
tipo: execution-evidence
status: draft
responsavel: Hermes (Baby Buddy subagent)
revisado_em: 2026-10-22
referencia: babybuddy/babybuddy @ 09629cf633cf3a2059a21ade4cea7ea4d846422f
---

# Execution evidence: Baby Buddy

Raw logs from the local Baby Buddy run performed on 22/10/2026 (America/Sao_Paulo) for the [Baby_Buddy.md](../../../08_Referencias/Repositorios/Baby_Buddy.md) report. All data is fictitious. The database was a disposable SQLite database, and the server listened only on 127.0.0.1:38231.

## Ambiente

- Windows 11, Hermes's git-bash shell, Python 3.12.10 in a venv created inside the clone (`C:/Projetos/AppMaternidade/_referencias/babybuddy/.venv`).
- Clone on branch `master`, commit `09629cf633cf3a2059a21ade4cea7ea4d846422f` (12/10/2026), the same as in the task package snapshot.
- A protective `.env` was created in the clone, containing only fictitious values. It prevents the project's `find_dotenv()` from traversing parent directories in search of another `.env`.
- Django commands were run with `env -u DATABASE_URL -u DB_* -u SECRET_KEY ...` because Hermes's shell is shared with another subagent that exported `DATABASE_URL` (see 02).

## Arquivos

| File | Contents |
| --- | --- |
| [01_setup.log](01_setup.log) | Clone, SHA, venv creation, `pip install -r requirements.txt` and installed versions |
| [02_migrate_fake.log](02_migrate_fake.log) | `migrate`, `fake --children 2 --days 5`, fictitious users, groups and effective permissions, record count |
| `03_api_curl.log` (outside Git, decision D7) | REST API exercise with curl: validations, timers, race condition during timer conversion, time zone, duplication and authorship (codes B, C and D cited in the report), plus access tests |
| [03b_corrida_rodada_exploratoria.log](03b_corrida_rodada_exploratoria.log) | Server log excerpt from the exploratory run (discarded): the same race condition as B-13 ended with 1×201, 4×400 and 1×500 `database is locked` (SQLite) |
| [04_fuso_sessao_vs_token.log](04_fuso_sessao_vs_token.log) | Same API accessed through a session (`django.test.Client` + `force_login`) compared with token access, plus the nap rule in each time zone |
| [05_testes.log](05_testes.log) | Project test suite: 528 tests passed and 1 additional isolated test passed |
| `06_extras_sem_auth.log` (outside Git, decision D7) | Access test without credentials |
| [07_licencas.log](07_licencas.log) | Licenses in Python dependency metadata, license banners in versioned bundles, icon fonts and pt-BR translation coverage |
| [08_nome_repetido.log](08_nome_repetido.log) | Second child with the same name in the instance: HTTP 500 due to `UNIQUE constraint failed: core_child.slug` |
| [roteiros/](roteiros/) | Scripts used. The originals are in Hermes's scratch directory, outside the clone; they were copied here with the local path replaced by `<SCRATCH>`. `api_tests.sh` remains outside Git (D7) |

## Higiene

- Coordinator's review around 05:35: the files containing access tests from the first run (03, 06 and `roteiros/api_tests.sh`) remain on disk, but stay in `.gitignore` pending decision D7 ([Decisions for Daniel](../../../07_Roadmap/Decisoes_para_Daniel.md)).

- The fictitious users' tokens were kept only in `<SCRATCH>/tokens.json`. In the logs, they appear as `<resp_a>`, `<cuidadora_b>` etc., and the `api_key` in the responses was masked.
- HTML error pages in DEBUG mode contain `request.META`, which includes the process environment. The final log therefore summarizes them in one line (title and exception). At 03:13–03:14, the exploratory run saved these pages to `03_api_curl.log`. The file was sanitized immediately afterward and later overwritten by the final run; the raw content does not remain in the vault.
- Processes created: two `runserver` (python PID 14520, from 03:09 to 03:16, and PID 20108, from 03:19 to 03:27) and one test suite run (from 03:22 to 03:25). All were terminated, and port 38231 was free when checked with `netstat` at 03:27. No Docker containers were created.

## Open questions

- Repeat the timer conversion race condition (03, B-13) with PostgreSQL, where `select_for_update` takes effect. On SQLite, the first run produced an HTTP 500 `database is locked`.

## Limits of this analysis

- The web interface was not used in a browser. The session was exercised through `django.test.Client`.
- DEBUG=False, gunicorn, PostgreSQL, S3, webhook delivery and import/export through the admin were not tested.
