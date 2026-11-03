# AppMaternidade — task do Hermes para pesquisa e design docs

Versão: 1.0 • Preparado em 22/10/2026 • Identificador do pacote: APP-001-DESIGNDOCS

## Objetivo desta entrega

Este pacote contém a tarefa a ser executada pelo Hermes. O resultado esperado da execução é um conjunto consistente de design docs, um projeto próprio no itsaplan e um cofre novo no Obsidian normal. O aplicativo será destinado a Android e iOS. A existência e o papel de uma versão web continuam em discussão.

**Este ZIP não significa que o projeto no itsaplan, o cofre ou o aplicativo já foram criados.** Esses são itens da execução descrita aqui; o aplicativo funcional pertence à etapa posterior de implementação.

## Mensagem de entrada para o Hermes

> Execute a task APP-001-DESIGNDOCS deste pacote para o AppMaternidade. Comece por 01_TASK_HERMES.md, registre o progresso em disco e confira o estado atual do workspace C:/Projetos/AppMaternidade. Leia o contexto original incluído, respeitando as correções de escopo da task. Pesquise produto, código e tecnologias com evidências, produza os design docs e organize um projeto separado no itsaplan e um cofre novo no Obsidian normal, nunca no Obsidian Oficina. Android e iOS são obrigatórios; web e stack não estão decididos. Conclua a documentação e a organização, mantenha as recomendações identificadas como propostas e entregue links, caminhos, evidências e as decisões pendentes para Daniel.

## Ordem de leitura

| Arquivo | Finalidade |
| --- | --- |
| [01_TASK_HERMES.md](01_TASK_HERMES.md) | Instruções principais, escopo e sequência de execução |
| [contexto/Contexto_AppMaternidade_Consultor_Hermes.md](contexto/Contexto_AppMaternidade_Consultor_Hermes.md) | Resumo original fornecido por Daniel, preservado sem alterações |
| [contexto/referencia_itsaplan.png](contexto/referencia_itsaplan.png) | Imagem da organização de projetos usada como referência |
| [02_PESQUISA_TECNOLOGIAS.md](02_PESQUISA_TECNOLOGIAS.md) | Pesquisa técnica preliminar, alternativas e perguntas de validação |
| [03_REPOSITORIOS_REFERENCIA.md](03_REPOSITORIOS_REFERENCIA.md) | Commits, licenças e trechos de código conferidos |
| [04_ITSAPLAN_E_OBSIDIAN.md](04_ITSAPLAN_E_OBSIDIAN.md) | Instruções para criar e verificar a organização |
| [05_DESIGN_DOCS_E_ADRS.md](05_DESIGN_DOCS_E_ADRS.md) | Documentos esperados e conteúdo mínimo |
| [06_CRITERIOS_DE_ACEITE.md](06_CRITERIOS_DE_ACEITE.md) | Critérios verificáveis de conclusão desta task |
| [07_BACKLOG_INICIAL.json](07_BACKLOG_INICIAL.json) | Semente de tarefas; não é um payload de API nem contém IDs reais |
| [08_FONTES_E_EVIDENCIAS.md](08_FONTES_E_EVIDENCIAS.md) | Fontes consultadas, limites e estado observado |
| [09_MODELO_RELATORIO_FINAL.md](09_MODELO_RELATORIO_FINAL.md) | Estrutura do retorno do Hermes |
| [MANIFEST.sha256](MANIFEST.sha256) | Hash SHA-256 dos arquivos do pacote, exceto o próprio manifesto |

## O que já está definido

- Produto de acompanhamento da rotina do bebê, desenvolvimento/atividades, comunidade temática e cuidado compartilhado.
- Aplicativo para Android e iOS.
- Tummy time e comunidade devem influenciar o planejamento desde o começo.
- Rotina privada e participação na comunidade são contextos diferentes, com permissões próprias.
- Um projeto novo no itsaplan e um cofre novo no Obsidian normal.

## O que exige análise

Stack, linguagens, backend, banco, sincronização, formato de comunidade, escopo etário, monetização e papel da web. Nenhuma combinação sugerida anteriormente foi aprovada. Familiaridade técnica da equipe pode ser um critério explícito de custo, mas não uma justificativa automática para repetir a arquitetura de outro projeto.

## Uso e continuidade

Os arquivos estão em UTF-8. Mantenha este pacote como insumo e escreva os documentos vivos no cofre do projeto. Não marque modelos deste ZIP como design docs já concluídos. Ao retomar depois de interrupção, confira o último checkpoint e os recibos das ações antes de repetir criações.

