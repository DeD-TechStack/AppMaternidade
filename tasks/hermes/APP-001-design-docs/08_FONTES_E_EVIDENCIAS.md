# Fontes e evidências da preparação

Data de consulta e preparação: 22/10/2026, referência de calendário America/Sao_Paulo.

## Estado observado do AppMaternidade

- Workspace local: C:/Projetos/AppMaternidade.
- Na primeira inspeção desta retomada, havia somente .git; não havia pacote ou progresso no workspace.
- Remoto origin conferido: https://github.com/DeD-TechStack/AppMaternidade.git.
- Git status informou ausência de commits em main; git rev-parse --verify HEAD retornou “fatal: Needed a single revision”, consistente com esse estado inicial. Isso não impediu criar os documentos da task.
- GitHub API: repositório público, tamanho informado 0 e branch padrão declarada main. A coleção de branches retornou vazia.
- Fontes de confirmação: https://api.github.com/repos/DeD-TechStack/AppMaternidade e https://api.github.com/repos/DeD-TechStack/AppMaternidade/branches.
- Não foi efetuado commit, push, criação de issue ou publicação do conteúdo nesta preparação.
- Esta task não criou o projeto itsaplan nem o cofre Obsidian. O ZIP orienta o Hermes a executar essas ações e verificá-las.

## Insumos originais

Resumo fornecido por Daniel:
C:/Users/<usuario>/Downloads/Contexto_AppMaternidade_Consultor_Hermes.md

SHA-256 do original:
C473CF2A7A6E70836611677F2729BE16E0DC3EFFDC7935E232EE6721AC00505D

O original é incluído em contexto/Contexto_AppMaternidade_Consultor_Hermes.md sem reescrita. A primeira leitura no PowerShell exibiu acentos incorretos por codificação; a releitura explícita em UTF-8 confirmou o texto. O pacote preserva os bytes do original.

A imagem de referência foi inspecionada: lista de projetos do workspace Oficina, com BreakInv e Investment. Ela está incluída em contexto/referencia_itsaplan.png. A imagem sustenta o modelo de organização desejado, mas não revela URL/ID da instância nem autoriza modificar esses projetos.

A consulta ao registro padrão do Obsidian encontrou cofres existentes e nenhum AppMaternidade. Não foi aberto nem modificado qualquer cofre. A identificação do aplicativo/perfil normal precisa ser confirmada durante a execução do Hermes.

## Fontes mobile

| ID | Fonte oficial | Uso |
| --- | --- | --- |
| M01 | https://reactnative.dev/docs/environment-setup | Framework para novo app React Native |
| M02 | https://docs.expo.dev/faq/ | Windows, iOS, EAS e development build |
| M03 | https://docs.flutter.dev/platform-integration/ios/setup | Xcode, ambiente iOS e aparelhos |
| M04 | https://kotlinlang.org/docs/multiplatform/supported-platforms.html | Estabilidade KMP e Compose por plataforma |
| M05 | https://kotlinlang.org/docs/multiplatform/quickstart.html | Requisitos do ambiente KMP |
| M06 | https://developer.android.com/topic/architecture/data-layer/offline-first | Arquitetura de dados offline |
| M07 | https://docs.expo.dev/versions/latest/sdk/notifications/ | Notificações e limites do Expo Go |
| M08 | https://docs.expo.dev/versions/latest/sdk/background-task/ | Restrições de background |
| M09 | https://expo.dev/pricing | Preços/limites EAS observados |
| M10 | https://developer.apple.com/programs/enroll/ | Adesão e taxa Apple |
| M11 | https://docs.expo.dev/guides/using-firebase/ | Firebase JS SDK versus integração nativa |

## Fontes de backend e dados

| ID | Fonte oficial | Uso |
| --- | --- | --- |
| B01 | https://firebase.google.com/docs/firestore/manage-data/enable-offline | Cache, sincronização e última escrita |
| B02 | https://firebase.google.com/docs/firestore/manage-data/transactions | Transações e escritas em lote |
| B03 | https://firebase.google.com/docs/firestore/security/rules-conditions | Regras e operações de servidor |
| B04 | https://firebase.google.com/docs/firestore/pricing | Unidades faturáveis e listeners |
| B05 | https://supabase.com/docs/guides/database/postgres/row-level-security | RLS e limites de autorização no JWT |
| B06 | https://supabase.com/partners/catalog/powersync | Integração PostgreSQL–SQLite |
| B07 | https://docs.powersync.com/integrations/supabase/rls-and-sync-streams | Diferença entre download e upload |
| B08 | https://supabase.com/pricing | Preços e política do plano gratuito |
| B09 | https://powersync.com/pricing | Preços e política do plano gratuito |
| B10 | https://www.postgresql.org/docs/current/transaction-iso.html | Isolamento e concorrência |

## Fontes de organização e produto consultadas

| ID | Fonte | Uso e limite |
| --- | --- | --- |
| O01 | https://itsaplan.dev/features | Recursos públicos; não confirma versão/instância instalada |
| O02 | https://itsaplan.dev/features/initiatives | Organização por objetivo |
| O03 | https://itsaplan.dev/features/notes | Notas/canvas por projeto |
| O04 | https://help.obsidian.md/manage-vaults | Criação/abertura de cofres |
| O05 | https://help.obsidian.md/uri | Abertura por URI, sem garantir perfil correto |
| P01 | https://napper.app/en/ | Site do produto; não comprova ausência de recurso não mencionado |
| P02 | https://play.google.com/store/apps/details?hl=en&id=com.napper | Descrição pública do Napper na loja |

O site Napper apresenta planejamento/registro de sono e registros como alimentação e fraldas. Sua comunicação pública consultada não resolve a pergunta sobre ausência de tummy time. A pesquisa comparativa completa dos oito produtos continua sendo entregável do Hermes.

## Repositórios

Os quatro SHAs, licenças e links de código estão em 03_REPOSITORIOS_REFERENCIA.md. Licenças raiz foram lidas diretamente; não inferidas somente do selo do GitHub. As referências foram examinadas por leitura remota, sem clone, execução, instalação ou cópia de seu código para o projeto.

## Limites e validade

Os preços são fotografias de consulta. Páginas “latest/current” podem mudar; Hermes deve fixar versões compatíveis e registrar novamente o contexto de decisão.

Os cenários de teste neste pacote são propostas, não resultados de teste de um aplicativo. Não há benchmark de desempenho, medição de custo em produção, verificação clínica ou aprovação jurídica implícitos.

As instruções originais, a pesquisa preliminar e o backlog têm papéis diferentes: as primeiras definem o pedido; a pesquisa oferece evidências; o backlog organiza a execução. Fontes externas não alteram a autorização do usuário.

