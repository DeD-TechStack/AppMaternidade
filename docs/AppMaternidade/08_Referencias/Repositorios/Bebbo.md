---
tipo: ficha-repositorio
status: rascunho
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
tarefa: MAT-5
repositorio: https://github.com/UNICEFECAR/parenting-app-bebbo-mobile
branch: main
commit: 5ec8c89198368638c8111b80c6159cfb12f5e9ad
licenca_raiz: GPL-3.0
fontes_principais:
  - https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/tree/5ec8c89198368638c8111b80c6159cfb12f5e9ad
  - https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/README.md
  - https://www.bebbo.app/terms-and-conditions
  - https://www.bebbo.app/privacy-policy
  - https://www.fsf.org/news/2010-05-app-store-compliance
---

# Bebbo (UNICEF)

Ficha escrita por leitura do código no commit `5ec8c89` e pelas [evidências de execução](../../09_Evidencias/Execucao_Referencias/Bebbo/00_Indice.md) já gravadas. Também usa os termos e a política de privacidade públicos do Bebbo, consultados em 22/10/2026. Marcas de evidência conforme as [Convenções](../../00_Inicio/Convencoes.md). Os links de código apontam para o commit analisado.

## Resumo

- **O que é.** App de parentalidade da UNICEF, publicado como Bem Público Digital, para gestação e crianças de 0 a 6 anos [DOC README; DOC termos].
  - É React Native, com o conteúdo e os dados da criança guardados no aparelho.
  - Funções: conteúdo por idade (conselhos, jogos, vídeos e perguntas frequentes), marcos de desenvolvimento, curvas de crescimento, vacinas e consultas com lembretes, mensagens diárias e um chatbot de perguntas frequentes.
  - O mesmo código atende várias "instâncias" nacionais.
- **Não é rastreador de rotina.** Não há registro de sono, mamada ou fralda, nem timers. A criança tem medidas, lembretes, marcos marcados e favoritos [CÓDIGO].
- **Serve como referência de conteúdo offline:**
  - conteúdo inicial embutido por idioma;
  - sincronização incremental por data;
  - **remoção local de conteúdo retirado** (endpoint `archive`);
  - modo de economia de dados;
  - faixas de idade com margem e idade corrigida para prematuros [CÓDIGO].
- **Não serve para:**
  - cuidado compartilhado: um aparelho por família; a importação de backup **substitui** todos os dados [CÓDIGO];
  - comunidade: não existe;
  - tom do desenvolvimento: percentual de marcos com rótulo "Pending" [CÓDIGO].
- **Licença:** código GPL-3.0 e conteúdo proprietário da UNICEF e licenciadores, só para uso pessoal e não comercial. **Nada de código ou conteúdo entra no AppMaternidade**; só conceitos, implementados do zero.
- **Saúde do repositório** [EXEC]:
  - 154 erros de TypeScript, nenhum teste, ESLint com falha interna e CI desligada na `main` desde 04/2025;
  - 97 alertas no `npm audit`;
  - bibliotecas centrais descontinuadas ou arquivadas;
  - nos últimos 12 meses, 201 de 203 commits são de uma só pessoa.

## Identificação

| Item | Valor | Evidência |
| --- | --- | --- |
| Repositório | https://github.com/UNICEFECAR/parenting-app-bebbo-mobile | — |
| Branch e commit | `main`, `5ec8c89198368638c8111b80c6159cfb12f5e9ad`; igual à fotografia do pacote | [EXEC] [02_identificacao.log](../../09_Evidencias/Execucao_Referencias/Bebbo/02_identificacao.log) |
| Data do commit | 15/09/2026 18:24:54 +0530, "Merge pull request #1106 from UNICEFECAR/Development"; tag `Prod_v2.5.0` | [EXEC] logs 02 e 04 |
| Histórico | 10.987 commits desde 19/05/2021. Últimos 12 meses: 203 commits (129 sem merges), 201 de neharuparel e 2 de Jignesh Rana | [EXEC] [04_historico_git.log](../../09_Evidencias/Execucao_Referencias/Bebbo/04_historico_git.log) |
| GitHub | Não arquivado; 19 estrelas, 25 forks, 11 issues abertas; último push em 19/10/2026; PRs do Dependabot abertos desde 02/04/2026 | [EXEC] [05_github_api.log](../../09_Evidencias/Execucao_Referencias/Bebbo/05_github_api.log) |
| Tamanho | 274 MB sem `.git`; `app/instances` ocupa 237 MB em 4.303 arquivos (conteúdo e imagens por país) | [EXEC] logs 02 e 12 |
| Licença | GPL-3.0 (arquivo `LICENSE`; SPDX `GPL-3.0` no GitHub) | [CÓDIGO] [EXEC] log 05 |
| CMS | `UNICEFECAR/parenting-app-bebbo-CMS`: PHP (Drupal), GPL-3.0, commit `5060246f` de 13/10/2026; árvore lida, código não analisado | [EXEC] logs 05 e 12 |
| Clone local | `C:/Projetos/AppMaternidade/_referencias/bebbo`, somente leitura, `git status` limpo. **Apagado em 24/10/2026, entre 19:32 e 19:34, na limpeza de disco** (recibo `C:/OrchestrationLab/exports/Limpeza_20261024/recibos/recibo_projetos_20261024.json`). Os links desta ficha apontam para o GitHub; para reler o código local, clonar de novo e fazer checkout no commit `5ec8c89198368638c8111b80c6159cfb12f5e9ad`. | [EXEC] log 02 |

## Stack confirmada

Versões instaladas depois do `npm ci` [EXEC, log 05], com as declarações do `package.json` [CÓDIGO]:

| Componente | Versão | Uso |
| --- | --- | --- |
| React Native / React | 0.78.2 / 19.0.0 | App Android e iOS; o código nativo foi migrado para Kotlin e Swift em 07/2025 [EXEC log 04] |
| TypeScript | 5.0.4 | `tsc --noEmit` falha com 154 erros [EXEC log 07] |
| Realm | 20.2.0 | Banco local em dois arquivos: `user.realm` (dados da criança e eventos) e `data.realm` (conteúdo). O README do `realm-js` avisa da descontinuação do Atlas Device Sync e dos SDKs em 09/2024 [EXEC log 05] |
| Redux Toolkit + redux-persist | 2.8.2 + 6.0.0 | Estado e preferências |
| i18next | 25.4.2 | 23 idiomas na instância principal; nenhum português [EXEC log 12] |
| Firebase | 22.4.0 | Analytics, Crashlytics e Messaging (push remoto) [CÓDIGO; DOC README] |
| react-native-push-notification | 8.1.1 | Lembretes locais; o repositório upstream está arquivado desde 30/01/2024 [EXEC log 05] |
| Google Sign-In + Google Drive API | 15.0.0 + 2.2.4 | Backup no Google Drive do usuário |
| react-native-aes-crypto | 3.2.1 | Cifra do arquivo de backup |

## Fluxos analisados

| Fluxo | Arquivos lidos |
| --- | --- |
| Dados da criança | [ChildDataSchema.ts L3–L102](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/database/schema/ChildDataSchema.ts#L3-L102), [dbConfig.ts](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/database/config/dbConfig.ts) |
| Exportação, backup e importação | [backup.tsx](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/backup.tsx), [googleAuth.ts L32](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/googleAuth.ts#L32), `components/homeScreen/QuickLinksRow.tsx` |
| Conteúdo offline e sincronização | [periodicSync.ts](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/periodicSync.ts), [Utils.ts L94–L100 e L190–L200](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/Utils.ts#L94-L100), `services/commonApiService.ts`, `instances/bebbo/config/appConfig.ts` |
| Analytics com fila offline | [EventSyncService.ts](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/EventSyncService.ts), [EventSchema.ts](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/database/schema/EventSchema.ts), `services/firebaseAnalytics.ts` |
| Aceite de termos | [Terms.tsx L239–L253](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/screens/Terms.tsx#L239-L253) |
| Marcos de desenvolvimento | [ChildDevelopment.tsx L330–L335 e L494–L530](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/screens/home/bottomTabs/ChildDevelopment.tsx#L330-L335) e textos em [en.ts L142–L151 e L345–L347](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/instances/bebbo/assets/locale/en.ts#L142-L151) |
| Crescimento e prematuros | [GrowthChart.tsx L140–L141](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/components/growth/GrowthChart.tsx#L140-L141) |
| Chatbot | [SupportChat.tsx L65–L71](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/screens/home/SupportChat.tsx#L65-L71), `screens/home/ChatBot.tsx` |
| Configurações | `screens/home/SettingScreen.tsx` (chaves de texto usadas) |

## Achados por tema

### Modelo de domínio

- **Criança** (`ChildEntity`) [CÓDIGO]:
  - nome, gênero, foto opcional;
  - datas de nascimento e de termo previsto (`plannedTermDate`), prematuro e esperado;
  - medidas embutidas: peso, altura, data, local, vacinas recebidas e comentário do médico;
  - lembretes embutidos (vacina, consulta);
  - lista de marcos marcados e favoritos.
- **Sem pessoas além do aparelho** [CÓDIGO]. Não há conta, cuidador, papel nem autoria. O app guarda o gênero do responsável e a relação com a criança como preferência local [EXEC log 04, commit `12c6cd68`].
- **Conteúdo** (`data.realm`) [CÓDIGO; EXEC log 12]:
  - artigos, vídeos, atividades ("games"), marcos, perguntas frequentes, vacinas e consultas por país, mensagens diárias, pesquisas e tabelas de desvio-padrão para as curvas;
  - campos editoriais: `child_age`, `child_gender`, `parent_gender`, `premature`, `mandatory`, `licensed`, `related_milestone` e `related_activities`.
- **Faixas de idade** [EXEC log 12]:
  - 13 faixas, de "Pregnancy" (−300 a −1 dia) a "61-72 months";
  - margem de 10 dias (`buffers_days`), com o conteúdo de faixas vizinhas (`age_bracket`).
- **Tummy time** [CÓDIGO]. Aparece em conteúdo, sem registro nem timer:
  - atividades como "My First Turns";
  - o marco "When lying on his tummy, he lifts his head";
  - um artigo ilustrado sobre deitar o bebê de barriga para baixo.

### Validações

Não analisadas linha a linha. Formulários de peso e altura passam valores entre telas; a validação de faixas não foi conferida.

### Autorização e isolamento

- **Não há dado de usuário no servidor** [CÓDIGO; DOC política]. Os dados da criança ficam só no aparelho. A API do CMS entrega conteúdo público por idioma e país, sem login [CÓDIGO `appConfig.ts`; EXEC log 14, três consultas de conteúdo documentadas no README].
- **Banco local sem cifra** [CÓDIGO; DOC política]:
  - a configuração do Realm não tem `encryptionKey`, e nenhuma ocorrência aparece em `app/` [EXEC log 12];
  - a própria política declara "unencrypted databases located on the user's personal smart device".
- **Backup cifrado com chave do build** [CÓDIGO; DOC README]:
  - a exportação usa AES-256-CBC com chave e vetor de inicialização vindos de variáveis de build (`react-native-dotenv`), não de uma senha do usuário;
  - o README descreve a chave como valor de configuração do ambiente (linhas 248 e 269), o que sugere a mesma chave para todas as instalações de um app.
  - Pergunta de auditoria, não vulnerabilidade demonstrada: que proteção esse arquivo oferece a quem tem acesso ao Google Drive ou ao arquivo compartilhado?
- **Escopo do Google Drive** [CÓDIGO]: `drive.file` e `drive.appfolder`, ou seja, só arquivos criados pelo app.

### Timers

Não existem. Os lembretes de vacina e consulta são notificações locais agendadas [CÓDIGO]. Os termos recomendam "keeps a separate track of these dates and reminders, and does not only rely on Bebbo's notifications" [DOC termos].

### Persistência e offline

- **Conteúdo offline de verdade** [CÓDIGO; EXEC log 12]:
  - conteúdo inicial embutido no app por idioma (`assets/offlinecontent`);
  - sincronização incremental com datas guardadas por tipo (por exemplo, `archiveDatetime`);
  - revisões periódicas aos 7 e aos 30 dias (`firstPeriodicSyncDays`, `secondPeriodicSyncDays`).
- **Retirada de conteúdo** [CÓDIGO]. O endpoint `archive` devolve os itens retirados, e o app os apaga do banco local em artigos, vídeos, atividades e perguntas frequentes ([Utils.ts L94–L100 e L190–L200](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/services/Utils.ts#L190-L200)). É o mecanismo que o [ADR-007](../../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md) pede para o conteúdo do AppMaternidade.
- **Economia de dados** [CÓDIGO]: opção "data saver" que evita imagens e vídeos, e botões para baixar todo o conteúdo ou atualizar.
- **Fila offline de eventos de analytics** [CÓDIGO]. Sem rede, o evento vai para a tabela `Event` com `isSynchronized: false` e é enviado depois. O commit `12c6cd68` corrigiu parâmetros que se perdiam nessa fila [EXEC log 04]. É um padrão de outbox simples, sem id de operação.
- **Sem sincronização dos dados da criança** [CÓDIGO]. Trocar de aparelho exige exportar e importar.

### UI de registro e histórico

Telas de crescimento, vacinas, consultas, marcos, conselhos, jogos, favoritos, notificações, guia de uso e configurações [CÓDIGO, lista de telas].

**Marcos:**

- a tela mostra um círculo de percentual dos marcos do período atual;
- o rótulo é "Pending" enquanto não chega a 100%, com ícone de alerta, e "Congratulations, your child has reached all milestones!" quando chega [CÓDIGO].

É o oposto do tom proposto no DF-3 de [Concorrentes e diferenciais](../../01_Produto/Concorrentes_e_Diferenciais.md).

### Relatórios

Curvas de crescimento com tabelas de desvio-padrão. Para prematuros, a curva usa a data de termo prevista como referência, ou seja, idade corrigida ([GrowthChart.tsx L140–L141](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/components/growth/GrowthChart.tsx#L140-L141)) [CÓDIGO].

### API e integrações

- **API do CMS** [CÓDIGO]:
  - somente leitura;
  - endpoints `articles`, `video-articles`, `activities`, `milestones`, `faqs`, `vaccinations`, `health-checkup-data`, `taxonomies`, `check-update`, `archive` e `country-groups`.
- **Configuração por país** [EXEC log 14]: a resposta de `country-groups` traz um campo `content_toggle` com valores como `ai_chatbot`. O código do app neste commit não usa esse valor [CÓDIGO, busca sem ocorrência]. Há um branch `ReraiChatbot` [EXEC log 05].
- **Chatbot atual** [CÓDIGO]: roteiro fixo de categoria, subcategoria e pergunta frequente, com atrasos que simulam digitação, ligado a artigos. Não há IA generativa.

### Testes

- **Nenhum teste** [EXEC log 08]: `jest --ci` responde "No tests found".
- **CI desligada** [EXEC log 04]: commit `3ba19b14` de 24/04/2025, "Disbaling CI pipeline run on Development and Main branch".
- **TypeScript:** 154 erros [EXEC log 07].
- **ESLint:** falha interna com a configuração do repositório [EXEC log 11].

### Configuração e i18n

- **Instâncias nacionais** [EXEC log 12]: bebbo, bebboPacific, foleja, merhabaBebek, reraiUmntwana, wawamor e babuni, cada uma com marca, idiomas, conteúdo e Firebase próprios.
- **Strings de interface:** cerca de 460 por locale [EXEC log 12].
- **Acessibilidade** [EXEC log 12]:
  - zero `accessibilityLabel`, `accessibilityRole` e `accessibilityHint` em `app/`;
  - `allowFontScaling={false}` em 14 pontos, que impede o texto de acompanhar o tamanho de fonte do sistema;
  - 111 componentes tocáveis.
- **Analytics** [CÓDIGO]:
  - propriedades de usuário: país, idioma, plataforma e canal de distribuição;
  - eventos de uso, entre eles faixa etária escolhida, número de crianças e marco marcado;
  - **o texto digitado nas buscas** de conselhos e jogos ([Activities.tsx L954](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/screens/home/bottomTabs/Activities.tsx#L954), [Articles.tsx L867](https://github.com/UNICEFECAR/parenting-app-bebbo-mobile/blob/5ec8c89198368638c8111b80c6159cfb12f5e9ad/app/screens/home/bottomTabs/Articles.tsx#L867)).
  - A política fala em dados anônimos [DOC]. Texto livre pode conter dado pessoal [HIP].
- **Consentimento** [CÓDIGO]: a tela de termos tem uma caixa única de aceite. A leitura não encontrou opção separada para analytics nas configurações [HIP sobre ausência].

## Execução

Resumo dos logs da primeira tentativa, das 02:57 às 03:36 de 22/10/2026, com Windows 11, Node 24.20.0 e npm 11.19.0, sem Docker.

| Passo | Resultado | Evidência |
| --- | --- | --- |
| Clone e identificação | Commit igual à fotografia do pacote | [EXEC] logs [01](../../09_Evidencias/Execucao_Referencias/Bebbo/01_clone.log) e [02](../../09_Evidencias/Execucao_Referencias/Bebbo/02_identificacao.log) |
| `npm ci --ignore-scripts --legacy-peer-deps` | 1.409 pacotes em 6 min, exit 0 | [EXEC] [06_npm_ci.log](../../09_Evidencias/Execucao_Referencias/Bebbo/06_npm_ci.log) |
| `tsc --noEmit` | 154 erros, exit 2 | [EXEC] [07_tsc.log](../../09_Evidencias/Execucao_Referencias/Bebbo/07_tsc.log) |
| `jest` | Nenhum teste encontrado | [EXEC] [08_jest.log](../../09_Evidencias/Execucao_Referencias/Bebbo/08_jest.log) |
| `npm audit` | 97 alertas (1 crítico, 81 altos, 14 moderados, 1 baixo); só produção: 63 (1, 46, 15, 1) | [EXEC] [09_10_resumo_audit_outdated.log](../../09_Evidencias/Execucao_Referencias/Bebbo/09_10_resumo_audit_outdated.log) |
| `npm outdated` | 81 pacotes desatualizados, 43 com versão major atrás | [EXEC] mesmo log |
| ESLint | Falha interna | [EXEC] [11_eslint.log](../../09_Evidencias/Execucao_Referencias/Bebbo/11_eslint.log) |
| Build Android e iOS | **Não executado.** Faltam Android SDK 35, Build-Tools e NDK, macOS e Xcode, os arquivos `env/` e o `google-services.json`, que não estão no repositório | [EXEC] [03_ambiente_build.log](../../09_Evidencias/Execucao_Referencias/Bebbo/03_ambiente_build.log) |
| Estrutura do conteúdo | Faixas, idiomas, contagens e acessibilidade | [EXEC] [12_estrutura_conteudo_e_cms.log](../../09_Evidencias/Execucao_Referencias/Bebbo/12_estrutura_conteudo_e_cms.log) |
| Licenças das dependências | 97 diretas (86 MIT, 7 Apache-2.0, 2 ISC, 1 MIT e Apache-2.0, 1 BSD-2-Clause) e 18 de desenvolvimento (17 MIT, 1 Apache-2.0); nenhuma GPL | [EXEC] [15_licencas_dependencias.tsv](../../09_Evidencias/Execucao_Referencias/Bebbo/15_licencas_dependencias.tsv) |

**Não executado:** app em emulador ou aparelho, backup no Google Drive, push e o CMS.

## Licenças por material

| Material | Licença | O que significa para o AppMaternidade |
| --- | --- | --- |
| Código do app | GPL-3.0 | Incorporar código obrigaria a distribuir o AppMaternidade sob GPL-3.0, com o código-fonte. Na App Store há outro problema: em 2010, a FSF entendeu que os termos da loja conflitam com a GPLv2 (seção 6), e o GNU Go foi removido ([FSF](https://www.fsf.org/news/2010-05-app-store-compliance)). A GPLv3 tem cláusula semelhante (seção 10) [HIP, leitura técnica]. **Não reutilizar** |
| Conteúdo (artigos, vídeos, atividades, ilustrações) | Proprietário da UNICEF e licenciadores. Os termos dizem "not for commercial use", proíbem cópias digitais e modificações e vedam o uso de ilustrações, fotos, vídeo e áudio ([termos](https://www.bebbo.app/terms-and-conditions)) | **Não reutilizar.** Escrever conteúdo próprio a partir das fontes primárias |
| Nome e emblema da UNICEF; marca Bebbo | Protegidos ([termos](https://www.bebbo.app/terms-and-conditions)) | Não usar |
| CMS | GPL-3.0 | Não reutilizar |
| Dependências diretas | MIT, Apache-2.0, ISC e BSD-2-Clause | Podem ser escolhidas por conta própria, como em qualquer projeto, sem relação com o Bebbo |
| Tabelas de crescimento | Origem nas fontes de referência, não conferida aqui | Buscar nas fontes primárias (OMS) |

O README apresenta o Bebbo como Bem Público Digital, com reuso por governos, escritórios da UNICEF e parceiros elegíveis [DOC README]. Isto é leitura técnica, não parecer jurídico.

## O que aproveitar como conceito

Só como ideia, implementada do zero:

1. Conteúdo offline embutido, com sincronização incremental por data e **lista de retirada processada no aparelho**.
2. Faixas de idade com margem e conteúdo das faixas vizinhas, incluindo gestação.
3. Idade corrigida para prematuros a partir da data de termo prevista.
4. Modo de economia de dados e download antecipado do conteúdo.
5. Campos editoriais por item (faixa, gênero, prematuro, relação com marcos e atividades).
6. Fila local de eventos de analytics enviada depois, sem bloquear o uso.
7. Avisos honestos nos termos: o app não substitui consulta, e os lembretes não devem ser a única fonte.
8. Assistente por roteiro fixo ligado a conteúdo revisado, se algum dia houver um, em vez de IA generativa.

## O que pode ser reutilizado conforme a licença

Nada do código (GPL-3.0) nem do conteúdo (proprietário e não comercial).

## Adaptações necessárias

- **Cuidado compartilhado de verdade:** conta por pessoa, papéis, sincronização e merge, em vez de importar um arquivo que substitui tudo ([Modelo de dados](../../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md)).
- **Banco local cifrado,** com chave no Keychain ou Keystore ([Privacidade e segurança](../../05_Privacidade_Operacao/Privacidade_e_Seguranca.md), seção 9).
- **Exportação** com chave derivada de algo do usuário, ou sem cifra mas com aviso claro. Nunca uma chave igual para todas as instalações [HIP].
- **Marcos sem percentual nem "Pending":** "ainda não" como resposta neutra ([Desenvolvimento e conteúdo](../../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md)).
- **Analytics** só com opt-in separado, sem texto livre nos eventos.
- **Acessibilidade:** rótulos em todos os controles e escala de fonte respeitada.

## O que não reproduzir

- Percentual de marcos com rótulo "Pending" e ícone de alerta.
- Banco local sem cifra para dados de saúde de criança.
- Chave de backup igual para todas as instalações.
- Texto de busca enviado ao analytics.
- `allowFontScaling={false}` e controles sem rótulo de acessibilidade.
- Base sem testes, com CI desligada e bibliotecas centrais descontinuadas (Realm Sync, `react-native-push-notification`).

## Riscos e problemas encontrados

| Risco | Evidência | Impacto para o AppMaternidade |
| --- | --- | --- |
| Licença GPL-3.0 do código e conteúdo proprietário | [CÓDIGO] [DOC] | Nenhum reaproveitamento |
| Dependência de uma pessoa (201 de 203 commits em 12 meses) | [EXEC] log 04 | Só referência de conceitos; não depender do projeto |
| Bibliotecas descontinuadas ou arquivadas | [EXEC] log 05 | Reforça a escolha de PowerSync e de notificações mantidas ([ADR-003](../../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md)) |
| Sem testes e com 154 erros de tipo | [EXEC] logs 07 e 08 | Lição: CI com tipos e testes desde a fundação ([Qualidade e validação](../../05_Privacidade_Operacao/Qualidade_e_Validacao.md)) |
| 97 alertas de dependências (63 em produção) | [EXEC] log 09 | Lição: revisão de dependências por versão |
| Banco local sem cifra, declarado na política | [CÓDIGO] [DOC] | Requisito oposto no AppMaternidade |

## Relação com os cenários Q-01 a Q-12

| Cenário | O que o Bebbo mostra | Classe | Lição para o AppMaternidade |
| --- | --- | --- | --- |
| Q-01 offline, fechar e reabrir | Dados só locais; conteúdo embutido; tudo funciona sem rede | [CÓDIGO] | Mesmo comportamento para registro e conteúdo, mas com sincronização |
| Q-02 reenvio | A fila de eventos marca `isSynchronized`, sem id de operação | [CÓDIGO] | Id de operação e idempotência |
| Q-03 A inicia, B encerra | Não se aplica: sem timers e sem vários cuidadores | [CÓDIGO] | Sem referência |
| Q-04 edição concorrente | A importação apaga tudo e substitui (`deleteAllAtOnce`) | [CÓDIGO] | Merge por registro, nunca substituição total |
| Q-05 revogação | Não se aplica: sem compartilhamento | [CÓDIGO] | Sem referência |
| Q-06 ids de outra família | Não se aplica: sem dado de usuário no servidor | [CÓDIGO] | Sem referência |
| Q-07 comunidade | Não existe; o chatbot é um roteiro fixo | [CÓDIGO] | Sem referência |
| Q-08 tela bloqueada | Sem timers | [CÓDIGO] | Sem referência |
| Q-09 fuso e meia-noite | Idade em dias pelo relógio do aparelho (Luxon) | [CÓDIGO] | Idade e dia pelo fuso local do evento |
| Q-10 notificação | Lembretes locais e push remoto; os termos pedem controle paralelo das datas | [CÓDIGO] [DOC] | Registro sem depender de push; texto honesto sobre lembretes |
| Q-11 moderação | Não existe | [CÓDIGO] | Sem referência |
| Q-12 exportar, excluir, backup | Exportação cifrada no Google Drive (pasta do app) ou por arquivo; importação substitui | [CÓDIGO] [DOC] | Exportação completa por família, mais backup no servidor com exclusão propagada |

## Questões abertas

1. O que o branch `ReraiChatbot` e o valor `ai_chatbot` vão trazer: IA generativa respondendo a famílias?
2. Como o app apaga um perfil de criança? Apaga também os lembretes agendados?
3. A chave do backup é diferente por instância nacional?
4. O CMS registra autoria e revisão profissional do conteúdo? O código do CMS não foi lido.

## Limites desta análise

- Ficha escrita pelo coordenador, por leitura de código, pelos logs gravados e pelas páginas públicas. Duas tentativas de subagente não terminaram: a primeira por falta de resposta do provedor no lote inicial, a segunda (`deleg_02d9d149`) às 05:10.
- Sem build e sem execução do app, por falta de SDK Android e de macOS.
- Leitura parcial: telas individuais, CMS, validações e exclusão de perfil não foram lidos linha a linha.

## Voltar

[Home](../../00_Inicio/Home.md) · [Progresso](../../00_Inicio/Progresso.md) · [Finnberry](Finnberry.md) · [Baby Buddy](Baby_Buddy.md) · [Sprout Track](Sprout_Track.md)
