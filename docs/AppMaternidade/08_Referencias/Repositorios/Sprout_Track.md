---
tipo: ficha-repositorio
status: rascunho
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
tarefa: MAT-5
repositorio: https://github.com/Oak-and-Sprout/sprout-track
branch: main
commit: eb26949461bd0455cb8d6137dc5bc417a02adcf9
licenca_raiz: Licença própria (Non-Commercial + Share-Alike)
fontes_principais:
  - https://github.com/Oak-and-Sprout/sprout-track/tree/eb26949461bd0455cb8d6137dc5bc417a02adcf9
  - https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/LICENSE.md
  - https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma
  - https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/app/api/utils/family-scope.ts
  - https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/public/sw.js
---

# Sprout Track

Ficha escrita por leitura do código no commit `eb26949` e pelo [registro de execução](../../09_Evidencias/Execucao_Referencias/Sprout_Track/Registro_Execucao.md) da primeira tentativa. Marcas de evidência conforme as [Convenções](../../00_Inicio/Convencoes.md). Os links de código apontam para o commit analisado.

## Resumo

- **O que é.** App web (Next.js) de registro de cuidados do bebê, maduro e ativo, com versão 1.6.8, 1.982 commits e último commit em 12/10/2026 [CÓDIGO; EXEC git]. Tem modo "Nursery" de tela cheia para madrugada e creche, várias famílias, cuidadores com PIN, relatórios, exportação, notificações push e integrações por API [DOC README].
- **Apps Android e iOS:** existem como uma casca Capacitor, em outro repositório, que carrega este app web num WebView [DOC CLAUDE.md].
- **Serve como referência de experiência:**
  - modo Nursery, botões grandes e blocos de "acordado há", "desde a última mamada" e "desde a última fralda";
  - sessões ativas guardadas no servidor, com **uma sessão ativa por bebê garantida no banco**;
  - autoria por cuidador;
  - tummy time como atividade com timer e média diária no relatório, sem meta [CÓDIGO].
- **Não serve para:**
  - offline: o service worker não faz cache, e não há fila local [CÓDIGO];
  - base de código: a licença proíbe uso comercial [CÓDIGO LICENSE.md].
- **Licença:** própria, "Non-Commercial + Share-Alike". **Nada do código entra no AppMaternidade**; só conceitos, implementados do zero.
- **Execução:**
  - Instalação, geração do Prisma, migrações, seed e servidor de desenvolvimento funcionaram [EXEC].
  - Testes: 1.753 de 1.755 passaram; as 2 falhas vêm de caminhos do Windows [EXEC].
  - Os registros de sondagem de acesso da primeira tentativa ficam fora desta ficha e fora do Git (seção "Execução").

## Identificação

| Item | Valor | Evidência |
| --- | --- | --- |
| Repositório | https://github.com/Oak-and-Sprout/sprout-track | — |
| Branch e commit | `main`, `eb26949461bd0455cb8d6137dc5bc417a02adcf9` | [EXEC] `git log` no clone |
| Data do commit | 12/10/2026 13:53:59 −0500, "fix(deploy): store backup.sh and service.sh as executable" | [EXEC] |
| Histórico | 1.982 commits desde 15/02/2025. Autores principais: John Overton (1.734 + 146 com outro nome), Simon Bach (26), Giovanni Cerretani (20), Rafal Lesniak (11) | [EXEC] `git shortlog` |
| Tamanho | 1.600 arquivos versionados; 133 itens em `tests/` | [EXEC] |
| Versão | 1.6.8 (`package.json`) | [CÓDIGO] |
| Licença | "Sprout Track License", Copyright © 2026 John Overton and Oak and Sprout; SHA-256 `d512a5ac…09af6de2` | [CÓDIGO] [LICENSE.md](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/LICENSE.md) |
| Clone local | `C:/Projetos/AppMaternidade/_referencias/sprout-track`, somente leitura, `git status` limpo | [EXEC] |

## Stack confirmada

| Componente | Declarado no commit | Observação |
| --- | --- | --- |
| Next.js / React | `^16.3.3` / `^19.2.8` | App Router; o servidor de desenvolvimento subiu com Next.js 16.3.3 [EXEC] |
| TypeScript | `^7.0.2` | — |
| Prisma | `^7.10.0`, com adaptadores `@prisma/adapter-pg` e `@prisma/adapter-better-sqlite3` | SQLite por padrão; PostgreSQL por `db push` [DOC CLAUDE.md] |
| Autenticação | `jsonwebtoken ^9.0.3`; conta por e-mail e senha (bcrypt) e cuidador por ID de 2 dígitos + PIN | JWT guardado no `localStorage` [DOC CLAUDE.md] |
| Push | `web-push ^3.6.7` (VAPID); FCM no Android e APNs direto no iOS, pela casca nativa | [CÓDIGO; DOC CLAUDE.md] |
| Testes | Vitest `^4.1.11` | [EXEC, log 10] |
| Mobile | Casca Capacitor em repositório separado (`mobile-app-v1`), não analisada | [DOC CLAUDE.md] |

## Fluxos analisados

| Fluxo | Arquivos lidos |
| --- | --- |
| Escopo por família | [app/api/utils/family-scope.ts](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/app/api/utils/family-scope.ts) e a regra descrita no [CLAUDE.md](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/CLAUDE.md) |
| Sessão ativa de atividade e de amamentação | [schema.prisma L1751–L1797](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma#L1751-L1797), [app/api/active-activity/route.ts](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/app/api/active-activity/route.ts) |
| Modo Nursery | [src/utils/nursery/timerBlocks.ts](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/src/utils/nursery/timerBlocks.ts) |
| Offline e PWA | [public/sw.js](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/public/sw.js) e busca por fila local em `src` e `app` |
| Registros e autoria | [schema.prisma](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma) (`SleepLog`, `PlayLog`, `Caretaker`, `Family`, `FamilyMember`, `Account`) |
| Idiomas | [src/localization/supported-languages.json](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/src/localization/supported-languages.json) |
| Licença | [LICENSE.md](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/LICENSE.md), lida inteira (55 linhas) |

## Achados por tema

### Modelo de domínio

- **Família e pessoas** [CÓDIGO]:
  - `Family` tem slug e nome e se liga a no máximo uma `Account`, a conta titular com e-mail.
  - `Caretaker` é o cuidador: ID de login de 2 dígitos, PIN, tipo livre (por exemplo, "parent", "daycare", "nanny", "grandparent") e papel ([L293](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma#L293)).
  - `FamilyMember` liga cuidador e família, com papel em texto ("admin", "member").
- **Registros com autoria** [CÓDIGO]. `SleepLog`, `FeedLog`, `DiaperLog`, `PlayLog`, `BathLog` e outros têm `caretakerId` (quem registrou), `deletedAt` (exclusão lógica) e `familyId`. Em `SleepLog`, a duração é calculada a partir de início e fim ([L349](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma#L349)). A autoria guarda um cuidador só: não separa "iniciado por" de "encerrado por".
- **`familyId` opcional em quase todo o esquema** [CÓDIGO]. O campo é `String?` na maioria dos modelos, com o comentário "Nullable initially for migration". Ele é obrigatório só em poucos, como `FamilyMember`.
- **Tummy time** [CÓDIGO]: valor `TUMMY_TIME` do enum `PlayType`, ao lado de brincadeira dentro e fora de casa, passeio e personalizada ([L82](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma#L82)). O relatório mensal mostra "Tummy time/day" como métrica (`src/components/Reports/MonthlyReportCard/ActivitySection.tsx`, linha 28), e a busca por meta ou alvo de tummy time não encontrou nada.
- **Amplitude.** O esquema também cobre mamada, extração e balanço de leite, alimentos e alergênicos, medicamentos, vacinas, medidas com curvas CDC e OMS, calendário, contatos, fotos e notas. Tem ainda tabelas de operação SaaS: assinatura (campos Stripe), códigos de presente, links curtos, campanhas beta e chaves de API [CÓDIGO].

### Validações

- **Uma sessão ativa por bebê, garantida no banco** [CÓDIGO]. `ActiveBreastFeed.babyId` e `ActiveActivity.babyId` são `@unique`, com o comentário "Only one active session per baby" ([L1751–L1797](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/prisma/schema.prisma#L1751-L1797)). A rota de início também confere antes e responde 409, "An active activity session already exists for this baby." ([active-activity/route.ts L78–L81](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/app/api/active-activity/route.ts#L78-L81)).
- **Pausa e acumulação** [CÓDIGO]. As sessões ativas guardam segundos acumulados, instante do segmento atual e início da sessão; na amamentação, por lado e com pausa.
- Validações de sobreposição, de fim depois do início e de datas futuras não foram analisadas nesta ficha.

### Autorização e isolamento

Descrição por leitura do código, em termos de design.

- **Regra declarada** [DOC CLAUDE.md]:
  - "Never trust client-sent family context." A família vem só do `authContext` do middleware.
  - Leitura, edição e exclusão por id buscam o recurso e conferem a família, devolvendo 404 se não bater.
  - Criação confere o recurso-pai; listagens filtram por família.
- **Helper central** [CÓDIGO]. `resolveFamilyScope` usa a família autenticada como autoridade. A família enviada pelo cliente só pode confirmar, nunca trocar. Só o administrador do sistema age em outra família, e precisa indicá-la ([family-scope.ts L18–L36](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/app/api/utils/family-scope.ts#L18-L36)).
- **Lição documentada pelo próprio projeto** [DOC CLAUDE.md]: um `OR` vazio aninhado no Prisma pode virar um filtro só por família e alcançar linhas de outros donos. A recomendação deles é conferir o escopo pelo SQL gerado, não pelo objeto da consulta. A lição vale para qualquer ORM no AppMaternidade.
- **Perguntas de auditoria, não vulnerabilidades demonstradas:**
  - Como cada rota trata registros legados com `familyId` nulo?
  - Toda rota usa o helper ou a regra de busca seguida de conferência?

  A primeira tentativa desta análise fez sondagens de acesso numa instância local com dados fictícios. Segundo o [registro de execução](../../09_Evidencias/Execucao_Referencias/Sprout_Track/Registro_Execucao.md), elas registram comportamentos que exigem atenção. Os arquivos ficam fora do Git e não são detalhados aqui, até Daniel decidir sobre divulgação responsável aos mantenedores ([Decisões para Daniel](../../07_Roadmap/Decisoes_para_Daniel.md), D7).
- **Autenticação pensada para casa e creche** [DOC CLAUDE.md]:
  - ID de 2 dígitos e PIN por cuidador, num teclado numérico;
  - JWT no `localStorage`, lista de tokens revogados no logout e tempo de inatividade configurável;
  - bloqueio por IP por 5 minutos depois de 3 falhas.

  É prático no aparelho compartilhado da creche. Como única proteção de um serviço na internet com dados de saúde de crianças, não basta [HIP].

### Timers

- **Sessão no servidor, com tela derivada** [CÓDIGO]:
  - a sessão ativa é uma linha no banco, então qualquer cuidador vê e encerra a sessão iniciada por outro;
  - a tela deriva "acordado há", "dormindo há", "desde a última mamada" e "desde a última fralda" a partir dos registros e do relógio, com corte de 24 h e limiar de aviso configurável por bebê ([timerBlocks.ts](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/src/utils/nursery/timerBlocks.ts));
  - não há contador em segundo plano.
- **Avisos por bebê** [CÓDIGO]: tempos de aviso de mamada (padrão 3 h), fralda (2 h) e extração (3 h), e a opção de contar o timer de mamada a partir do início ou do fim (modelo `Baby`).
- **Sem rede** [CÓDIGO]: iniciar e encerrar sessão depende do servidor, porque não há fila local (seção seguinte).

### Persistência e offline

- **Service worker sem cache** [CÓDIGO]. O `public/sw.js` registra `fetch` com uma função vazia ([L5](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/public/sw.js#L5)), não usa `caches` e trata só instalação, ativação e push.
- **Sem fila local** [CÓDIGO]. A busca por `indexedDB`, fila offline e `navigator.onLine` em `src` e `app` não encontrou nada.
- **Contradição com a documentação.** O CLAUDE.md fala em "PWA architecture with offline support" [DOC], mas o código do commit não sustenta isso. É o exemplo que o pacote da task pedia para conferir: instalar como PWA não é escrita offline.
- A observação pelo navegador feita na primeira tentativa está nos registros fora do Git (D7).

### UI de registro e histórico

Declarado no README [DOC]:

- painel diário;
- calendário;
- relatórios e curvas de crescimento;
- registro completo com busca e exportação;
- modo Nursery de tela cheia, com botões grandes e cores e brilho configuráveis;
- modo escuro.

O que o código confirma [CÓDIGO]:

- os blocos do modo Nursery;
- a cor do cuidador na linha do tempo (`badgeColor`).

### Relatórios

O relatório mensal tem seção de atividades com média diária de tummy time [CÓDIGO]. As curvas usam tabelas CDC e OMS carregadas no seed [EXEC, registro passo 5].

### API e integrações

- **Rotas** [CÓDIGO]: rotas REST em `app/api`, inclusive `api-keys`, `hooks`, `import`, `database`, `notifications` e `timeline`.
- **Integrações declaradas** [DOC README, seção "API & Integrations"]: chaves de API e integrações externas, com as rotas `api-keys` e `hooks` [CÓDIGO, só árvore].
- **Importação do Baby Buddy** [CÓDIGO]: `src/lib/importers/baby-buddy/`.

### Testes

- **Executados** [EXEC, log 10]:
  - 132 arquivos: 131 passaram e 1 falhou;
  - 1.755 testes: 1.753 passaram e 2 falharam;
  - as falhas estão em `tests/prisma-adapter.test.ts`, que espera caminhos POSIX e recebeu `C:\...` no Windows.
- **Regra do projeto** [DOC CLAUDE.md]: toda mudança vem com teste, e a lógica vai para funções puras testáveis.

### Configuração e i18n

- **Idiomas:** 12, incluindo **pt-BR** e pt-PT ([supported-languages.json](https://github.com/Oak-and-Sprout/sprout-track/blob/eb26949461bd0455cb8d6137dc5bc417a02adcf9/src/localization/supported-languages.json)) [CÓDIGO]. O CLAUDE.md ainda lista só cinco arquivos [DOC desatualizado].
- **Fuso:** há utilitários no servidor (`app/api/utils/timezone.ts`), uma rota `system-timezone` e uma opção de depuração de fuso nas configurações [CÓDIGO, só árvore]. O comportamento não foi analisado nesta ficha.
- **Implantação:** Docker com SQLite ou PostgreSQL, ou execução local com SQLite [DOC README].

## Execução

Resumo do [registro de execução](../../09_Evidencias/Execucao_Referencias/Sprout_Track/Registro_Execucao.md) da primeira tentativa, das 02:55 às 03:33 de 22/10/2026, com Node 24.20.0 no Windows 11 e SQLite descartável fora do clone.

| Passo | Resultado | Evidência |
| --- | --- | --- |
| `npm ci --ignore-scripts` | 874 pacotes em cerca de 5 min, exit 0 | [EXEC] [01_npm_ci.log](../../09_Evidencias/Execucao_Referencias/Sprout_Track/01_npm_ci.log) |
| `prisma generate` | Clientes Prisma 7.10.0, exit 0 | [EXEC] [02_prisma_generate.log](../../09_Evidencias/Execucao_Referencias/Sprout_Track/02_prisma_generate.log) |
| `prisma migrate deploy` | Migrações aplicadas | [EXEC] [03_prisma_migrate.log](../../09_Evidencias/Execucao_Referencias/Sprout_Track/03_prisma_migrate.log) |
| `db push` do banco de logs | **Recusado pelo Prisma 7.10**, que detectou execução por agente de IA e exigiu consentimento explícito do usuário para ação destrutiva. Não foi contornado; o banco de logs é dispensável com `ENABLE_LOG=false` | [EXEC] mesmo log |
| Binário do `better-sqlite3` | Pré-compilado baixado e extraído, exit 0; tarball removido depois | [EXEC] [04_better_sqlite3_prebuild.log](../../09_Evidencias/Execucao_Referencias/Sprout_Track/04_better_sqlite3_prebuild.log) |
| Seed | Família padrão, cuidador de sistema com PIN padrão documentado, 28 unidades e curvas CDC e OMS, exit 0 | [EXEC] [05_seed.log](../../09_Evidencias/Execucao_Referencias/Sprout_Track/05_seed.log) |
| `next dev` em 127.0.0.1:38317 | Pronto em 2,2 s. O `next dev` 16.3 acrescentou um bloco ao `CLAUDE.md` do clone, revertido com `git checkout` | [EXEC] registro, passo 6 |
| `vitest run` | 1.753 de 1.755 testes passaram | [EXEC] [10_vitest.log](../../09_Evidencias/Execucao_Referencias/Sprout_Track/10_vitest.log) |
| Limpeza | Árvore do `next dev` encerrada, porta livre, abas fechadas, nenhum Docker | [EXEC] registro |

**Fora desta ficha e fora do Git:** as sondagens de API e a observação pela interface com teste offline (`06`, `07`, `08`, `09`, `11`, `12` e `roteiros/api_probe*.py`, `check_offline.py`). Eles ficam no disco, ignorados pelo `.gitignore`, até a decisão D7.

**Não executado:** build de produção, Docker, PostgreSQL, push, modo SaaS, contas por e-mail, casca nativa e aparelho móvel real.

## Licenças por material

| Material | Licença | O que significa para o AppMaternidade |
| --- | --- | --- |
| Código, documentação e arquivos do repositório | **Sprout Track License**. Concede uso, cópia, modificação, distribuição e obras derivadas (seção 2), sob três condições (seção 3): atribuição; **uso não comercial**, que exclui prestar serviços por remuneração, incorporar num produto vendido e "generate revenue, directly or indirectly"; e **compartilhamento pela mesma licença** | Um app que possa ter assinatura, parceria ou qualquer receita, direta ou indireta, não pode incorporar o código. Os titulares se reservam o uso comercial e podem licenciar em outros termos (seção 4), o que só seria possível por acordo |
| Imagens do README (`public/readme/*.png`) | Mesma licença, como "associated files" (seção 1) | Não reutilizar |
| Dependências | Levantadas pelo `package-lock.json` depois da revisão independente: 520 entradas de produção, a maioria MIT, ISC e Apache-2.0. A conferir: `heic-to` (LGPL-3.0), `web-push` (MPL-2.0), `@img/sharp-*` (LGPL-3.0-or-later, opcionais), `elkjs` (EPL-2.0), `caniuse-lite` (CC-BY-4.0) e 2 sem licença declarada ([lista](../../09_Evidencias/Execucao_Referencias/Sprout_Track/13_licencas_dependencias.tsv)) | Se o AppMaternidade escolher alguma dessas bibliotecas, ela é avaliada pela própria licença, independente do Sprout Track |
| Curvas CDC e OMS no seed | Dados públicos de origem própria; licença das fontes a conferir separadamente | Buscar nas fontes primárias, não neste repositório |
| Nome e marca | "Sprout Track", "Oak and Sprout" | Não usar |

Isto é leitura técnica da licença, não parecer jurídico.

## O que aproveitar como conceito

Só como ideia, implementada do zero:

1. Modo de tela cheia para madrugada e creche, com botões grandes e blocos de "há quanto tempo".
2. Sessão ativa no servidor, com pausa e acumulação por lado. A regra de unicidade do Sprout Track (restrição no banco e 409) não é copiada: offline não dá para recusar a segunda sessão. No AppMaternidade, as duas são aceitas e marcadas para unir ([Offline, seção 7.2](../../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)).
3. Autoria por cuidador em todo registro e cor do cuidador na linha do tempo.
4. Limiares de aviso por bebê ("mamada há mais de 3 h"), configuráveis pela família.
5. Tummy time como atividade com timer e métrica de média no relatório, sem meta.
6. Regra explícita "não confiar na família enviada pelo cliente", com um helper único e a conferência pelo SQL gerado.

## O que pode ser reutilizado conforme a licença

Nada do código, das imagens ou dos textos, enquanto o AppMaternidade puder ter qualquer receita. A alternativa seria um acordo com os titulares (seção 4). Não há recomendação de buscar esse acordo.

## Adaptações necessárias

- **Offline de verdade:** fila local persistente e banco local ([ADR-004](../../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md)). Aqui a sessão ativa depende do servidor.
- **"Iniciado por" e "encerrado por"** separados, além do autor do registro.
- **`familyId` obrigatório** em todo dado de cuidado, sem estado legado nulo ([Modelo de dados, invariantes](../../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md)).
- **Autenticação de serviço na internet:** conta por pessoa e código por e-mail ([ADR-003](../../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md)). O PIN pode servir como trava local de aparelho compartilhado, nunca como única credencial [HIP].
- **App nativo,** não WebView, para timer na tela bloqueada e armazenamento cifrado ([ADR-002](../../06_ADRs/ADR-002_Framework_Mobile.md)).

## O que não reproduzir

- Afirmar suporte offline sem cache nem fila.
- `familyId` opcional "temporariamente" em dados de família.
- JWT no `localStorage` de um app web com dados sensíveis [HIP].
- PIN curto como credencial principal de um serviço exposto.

## Riscos e problemas encontrados

| Risco | Evidência | Impacto para o AppMaternidade |
| --- | --- | --- |
| Licença não comercial com compartilhamento pela mesma licença | [CÓDIGO] LICENSE.md | Nenhum reaproveitamento de código |
| Documentação diz offline; o código não tem | [CÓDIGO] sw.js; [DOC] CLAUDE.md | Confirma que PWA não resolve o requisito offline |
| `familyId` opcional na maior parte do esquema | [CÓDIGO] schema.prisma | Pergunta de auditoria; reforça o invariante de escopo obrigatório |
| Observações de acesso da primeira tentativa, não divulgadas | [EXEC] registros fora do Git | Decisão D7 antes de publicar o cofre |
| Testes dependentes de caminho POSIX | [EXEC] log 10 | Lição para o nosso CI: rodar testes também no Windows, ou isolar caminhos |

## Relação com os cenários Q-01 a Q-12

| Cenário | O que o Sprout Track mostra | Classe | Lição para o AppMaternidade |
| --- | --- | --- | --- |
| Q-01 offline, fechar e reabrir | Sem cache nem fila; o registro depende do servidor | [CÓDIGO] | Fila local persistente com estado visível |
| Q-02 reenvio | Sem id de operação visto na leitura | [HIP] | Id de operação e idempotência |
| Q-03 A inicia, B encerra | Sessão ativa no servidor, única por bebê; qualquer cuidador encerra; a autoria guarda um cuidador | [CÓDIGO] | Sessão compartilhada com "iniciado por" e "encerrado por". Sessões paralelas são aceitas e marcadas para unir, porque offline não dá para recusar (Offline, 7.2) |
| Q-04 edição concorrente | Não analisado | — | Versão por registro |
| Q-05 revogação | Lista de tokens revogados no logout; sem cache offline a limpar | [DOC] | Revalidação na reconexão e limpeza local |
| Q-06 ids de outra família | Regra e helper centrais; perguntas de auditoria sobre registros sem família | [CÓDIGO] [DOC] | Escopo pelo vínculo vigente e teste em todas as rotas |
| Q-07 comunidade | Não existe | [CÓDIGO] | Sem referência |
| Q-08 tela bloqueada | Blocos derivados do relógio e dos registros; sessão no servidor | [CÓDIGO] | Mesmo princípio, com estado local |
| Q-09 fuso e meia-noite | Utilitários de fuso no servidor; comportamento não analisado | [CÓDIGO, árvore] | Fuso gravado com o evento |
| Q-10 notificação | Push web (VAPID) e nativo (FCM, APNs) | [CÓDIGO] [DOC] | Registro sem depender de push |
| Q-11 moderação | Não existe | [CÓDIGO] | Sem referência |
| Q-12 exportar, excluir, backup | Exportação declarada; rotas de banco e backup; encerramento de conta (`closed`, `closedAt`) | [DOC] [CÓDIGO] | Exportação por família e exclusão propagada |

## Questões abertas

1. Como as rotas tratam os registros com `familyId` nulo? (Pergunta de auditoria.)
2. Quando a conta é encerrada (`closed`), os dados da família são excluídos ou só desativados?
3. Como a casca Capacitor guarda o token e se comporta sem rede?
4. Como os utilitários de fuso definem o dia: pelo fuso do servidor ou pelo do cuidador?
5. Daniel vai avisar os mantenedores sobre as observações da primeira tentativa (D7)?

## Limites desta análise

- Ficha escrita pelo coordenador, por leitura de código e pelo registro de execução, depois de duas tentativas de subagente que não terminaram: a primeira interrompida pelo filtro do provedor por volta de 03:37, a segunda por falta de resposta do provedor às 04:54.
- Pela regra adotada depois dos bloqueios, não houve nova execução nem requisição ao app. As observações de acesso são perguntas de auditoria.
- Leitura parcial: rotas individuais, componentes, utilitários de fuso e a casca nativa não foram lidos linha a linha.

## Voltar

[Home](../../00_Inicio/Home.md) · [Progresso](../../00_Inicio/Progresso.md) · [Finnberry](Finnberry.md) · [Baby Buddy](Baby_Buddy.md)
