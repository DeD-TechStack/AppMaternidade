---
tipo: indice-evidencias
status: rascunho
responsavel: Hermes (subagente Bebbo)
revisado_em: 2026-10-22
---

# Evidências de execução — Bebbo (UNICEF)

Logs brutos da análise do repositório [UNICEFECAR/parenting-app-bebbo-mobile](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile) no commit `5ec8c89198368638c8111b80c6159cfb12f5e9ad`. Ficha correspondente: [Bebbo](../../../08_Referencias/Repositorios/Bebbo.md).

Ambiente: Windows 11, Git Bash, Node 24.20.0, npm 11.19.0, Python 3.14 (`-I`), gh 2.103.0, OpenJDK 21. Horários em America/Sao_Paulo (UTC−03:00), 22/10/2026. Clone em `C:/Projetos/AppMaternidade/_referencias/bebbo/` (fora do Git do produto). Nenhum dado familiar, conta ou credencial foi usado. Docker não foi usado. Os logs não contêm segredos: o repositório não traz arquivos `env/` nem `google-services.json`, e nenhum `.env` foi lido.

| Arquivo | Conteúdo | Horário |
| --- | --- | --- |
| [01_clone.log](01_clone.log) | `git clone --filter=blob:none --branch main` | 02:57 |
| [02_identificacao.log](02_identificacao.log) | branch, SHA, data do commit, total de commits, comparação com a fotografia do pacote | 02:58 |
| [03_ambiente_build.log](03_ambiente_build.log) | sondagem do ambiente para build nativo (impedimento) | 03:21 |
| [04_historico_git.log](04_historico_git.log) | autores e cadência dos últimos 12 meses, histórico de arquivos-chave, tags | 03:24 |
| [05_github_api.log](05_github_api.log) | metadados do GitHub (branches, PRs, issues, CMS, bibliotecas arquivadas ou descontinuadas) | 03:25 |
| [06_npm_ci.log](06_npm_ci.log) | `npm ci --ignore-scripts --legacy-peer-deps` | 03:03–03:09 |
| [07_tsc.log](07_tsc.log) | `tsc --noEmit`: 154 erros, saída completa | 03:16 |
| [08_jest.log](08_jest.log) | `jest --listTests` e `jest --ci`: nenhum teste encontrado | 03:16 |
| [09_10_resumo_audit_outdated.log](09_10_resumo_audit_outdated.log) | resumo de `npm audit` (completo e só produção) e `npm outdated` | 03:16–03:19 |
| [09_npm_audit_completo.json](09_npm_audit_completo.json), [09_npm_audit_producao.json](09_npm_audit_producao.json), [10_npm_outdated.json](10_npm_outdated.json) | saídas JSON brutas | 03:16–03:19 |
| [11_eslint.log](11_eslint.log) | ESLint com a configuração do repositório: falha interna | 03:19 |
| [12_estrutura_conteudo_e_cms.log](12_estrutura_conteudo_e_cms.log) | faixas etárias, contagem de conteúdo offline por idioma, chaves de UI, árvore do CMS, locales, contagens de acessibilidade, tamanho por pasta | 03:26 |
| [13_scripts_auxiliares.txt](13_scripts_auxiliares.txt) | texto dos scripts auxiliares (executados a partir do scratch do Hermes, fora do clone) | — |
| [14_api_publica_dev.log](14_api_publica_dev.log) | 3 requisições GET à API V1 de desenvolvimento documentada no README | 03:34 |
| [15_licencas_dependencias.tsv](15_licencas_dependencias.tsv) | licenças declaradas das dependências diretas e de desenvolvimento, lidas de `node_modules/*/package.json` depois do `npm ci` (tipo, pacote, versão, licença); copiado do rascunho do subagente pelo coordenador às 05:20 | 04:09 |
