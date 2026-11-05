---
tipo: progresso
status: em andamento
responsavel: Hermes (execução da APP-001)
atualizado: 2026-10-22 15:13 (America/Sao_Paulo)
---

# Progresso — APP-001 (execução pelo Hermes)

Checkpoint vivo da execução da task APP-001-DESIGNDOCS. Ao retomar depois de uma interrupção, leia este arquivo e confira os recibos em [Registro da organização](Registro_Organizacao.md) antes de repetir qualquer criação (projeto no itsaplan, cofre no Obsidian, tarefas).

- Pacote de entrada (insumo, não editar): `C:/Projetos/AppMaternidade/tasks/hermes/APP-001-design-docs/`
- ZIP original: `C:/Projetos/AppMaternidade/entregas/AppMaternidade_Task_Hermes_DesignDocs_2026-10-22.zip`
- Registro da preparação do pacote (consultor, preservado sem alteração): `C:/Projetos/AppMaternidade/PROGRESSO_TASK_HERMES.md`
- Cofre (local canônico dos Markdown): `C:/Projetos/AppMaternidade/docs/AppMaternidade`
- itsaplan: projeto MAT em http://localhost:3001/oficina/MAT

Horários em America/Sao_Paulo, tirados do relógio da máquina ou de carimbos dos próprios sistemas. Correção às 03:30: os horários 02:45, 02:50 e 02:58 das versões anteriores deste arquivo foram estimados sem consultar o relógio; os valores abaixo vêm dos carimbos reais.

## Registro do site (rumo atual, desde 03/11/2026)

Uma linha por marco, a mais recente no topo. O estado corrente fica em [Retomada do site](Retomada_Site.md), e o detalhe de cada marco está no cartão Kanban citado.

- 05/11/2026: **decisão de Daniel: salto visual (MAT-44, D11 revista).** O protótipo da MAT-34 ficou genérico, com G6 entre 7,17 e 7,25. A MAT-34 fecha como está, e a MAT-44 refaz as 3 telas com as capturas da referência visíveis para quem monta e componentes da lista aprovada (shadcn/ui, Magic UI), com G6 mínimo de 8,0. Continua proibido copiar código, imagem, texto e marca. As capturas ficam fora do Git, em `_staging/appmaternidade/MAT-44/referencia/`.
- 05/11/2026: **specs aprovadas e cartões criados.** A MAT-34 v2 virou o cartão `t_dd87ca3d` e a MAT-43 v2, o `t_58526cc9`, os dois com base cc91ec8. O G6 tem mínimo de 7,0 por tela.
- 05/11/2026: **retomada** liberada por Daniel. As specs da MAT-34 e da MAT-43 foram escritas, v1 em explique de volta. A main está em c81a094.
- 03/11/2026, 15h35: **pausa por limite**, pedida por Daniel por meio do coordenador. O board está sem cartões abertos. A main está em a9a74eb, com a árvore limpa e sem push. Na volta, o primeiro passo são as specs da MAT-34 e da MAT-43.
- 03/11/2026: **MAT-32 integrada.** Os design docs v0.4 entraram na main pelo cartão `t_46deffa1`. O SHA revisado era 7577216 e foi reposicionado sobre a fundação como 5500c66, com patches idênticos. A revisão aprovou na rodada 2; a rodada 1 tinha devolvido o DOC-08 por implementação.
- 03/11/2026: **parada do dia.** A nota de retomada foi criada (d04c26f). Daniel retoma na quinta.
- 03/11/2026: **MAT-35 integrada.** A fundação do site entrou pelo cartão `t_da8e708b`, com d731d3d por avanço direto (ff). O veredito foi APPROVED_WITH_LIMITS, e o contrato foi reconciliado.
- 03/11/2026: **decisões.** D8 (stack, por delegação de Daniel), D9 (GitHub Pages, decidida por Daniel), D10 (Impeccable, por delegação) e D11 (sala limpa reduzida), nas tarefas MAT-28 a MAT-31. Nesse mesmo dia, Daniel mudou o rumo para "site completo primeiro, port depois" (MAT-27).

## Estado inicial conferido (22/10/2026 02:29)

- Workspace: `.git`, `entregas/`, `tasks/`, `PROGRESSO_TASK_HERMES.md`. Sem `.gitignore` e sem AGENTS.md aplicável (`C:/Projetos/AGENTS.md`, `C:/AGENTS.md` e o do workspace não existem).
- Git: branch `main` sem commits; remoto `origin` = https://github.com/DeD-TechStack/AppMaternidade.git; `git ls-remote origin` sem refs. Nenhum commit ou push será feito nesta task.
- Ferramentas locais: Node 24.20.0, npm 11.19.0, Python 3.14.7 (e 3.12.10 via `py`), Docker 29.9.2 (Docker Desktop ativo), OpenJDK 21.0.11, gh 2.103.0. Ausentes: Android SDK/adb, Flutter/Dart, Kotlin, Gradle. Nenhum Mac/Xcode local.
- itsaplan: web em http://localhost:3001; API/MCP em 127.0.0.1:3000; versão 1.6.0 segundo o guia de acesso da oficina. O conector do perfil default age como `hermes-default` ("Hermes (default)"); não tem ferramenta para criar projeto.
- Obsidian normal: cadastro em `%APPDATA%/obsidian/obsidian.json` com BreakInv e FORJAI e nenhum AppMaternidade; o protocolo `obsidian://` aponta para `C:/OrchestrationLab/apps/orca/home/AppData/Local/Programs/Obsidian/Obsidian.exe`. Nenhum processo Obsidian aberto antes das 02:54.

## Etapas

| Etapa | Situação | Observação |
| --- | --- | --- |
| D0 Contexto e checkpoint | feita | Pacote lido integralmente (00 a 09, contexto e imagem). MAT-1 em Feito. |
| D1 itsaplan e cofre | feita | itsaplan organizado: MAT-1 a MAT-26, vínculos e documento de estado. Daniel registrou o cofre no Obsidian normal às 07:00:46; a navegação pela Home, um design doc e um ADR foi conferida às 07:12 (MAT-3 concluída). |
| D2 Pesquisa de produto e repositórios | feita | Oito concorrentes, quatro repositórios, tecnologias, privacidade, comunidade e conteúdo. |
| D3 Produto, navegação e recorte | feita (proposta) | Visão e escopo, fluxos e telas, concorrentes e diferenciais. |
| D4 Comparação de arquiteturas | feita (proposta) | Três conjuntos completos; recomendação RN + Expo e Conjunto B. |
| D5 Dados, permissões e sincronização | feita (proposta) | Modelo e permissões; offline, sincronização e temporizadores. |
| D6 Docs, ADRs e plano | feita (proposta) | ADR-001 a ADR-008 (Proposta), roadmap, decisões D1 a D7. |
| D7 Revisão e entrega | feita | Três rodadas de revisão independente sem achado alto; 17 achados tratados; relatório final e itsaplan atualizados. Obsidian registrado e navegado (D1). |

## Decisões pequenas e reversíveis tomadas pelo Hermes

| Data | Decisão | Motivo | Como reverter |
| --- | --- | --- | --- |
| 22/10 | Cofre no caminho proposto pelo pacote, `docs/AppMaternidade`. | Não há convenção anterior no workspace. | Mover a pasta e reabrir como cofre. |
| 22/10 | Clones das referências em `C:/Projetos/AppMaternidade/_referencias/`, fora do Git pelo `.gitignore`. | Ler o código no commit analisado sem misturar com o produto. | Apagar a pasta. |
| 22/10 | `.gitignore` novo na raiz: clones, `.obsidian/`, capturas, contexto original, `entregas/` e arquivos de ambiente ficam fora do Git. | O remoto é público; nada privado deve subir por engano. | Editar ou apagar o arquivo. |
| 22/10 | Configuração do cofre em `.obsidian/app.json`: links Markdown relativos e anexos em `09_Evidencias/capturas`. | Links legíveis fora do Obsidian, como pede o pacote. | Trocar nas configurações do Obsidian. |
| 22/10 | Tarefas futuras (MAT-17 a MAT-19) sem agente delegado. | Não disparar execução durante a fase documental. | Delegar quando Daniel pedir. |

## Checkpoints

### 02:54 — pesquisa despachada (D2 e D4 em paralelo)

Dez subagentes em segundo plano (delegação `deleg_0f232e05`, manifesto criado às 02:54:32), cada um dono dos seus arquivos:

| Frente | Arquivos do subagente |
| --- | --- |
| Concorrentes A | `08_Referencias/Concorrentes/Napper.md`, `Huckleberry.md`, `Baby_Daybook.md`, `Nara_Baby.md` |
| Concorrentes B | `08_Referencias/Concorrentes/Kinedu.md`, `Pathways.md`, `BabyCenter.md`, `Peanut.md` |
| Finnberry | `08_Referencias/Repositorios/Finnberry.md` e `09_Evidencias/Execucao_Referencias/Finnberry/` |
| Baby Buddy | `08_Referencias/Repositorios/Baby_Buddy.md` e `09_Evidencias/Execucao_Referencias/Baby_Buddy/` |
| Sprout Track | `08_Referencias/Repositorios/Sprout_Track.md` e `09_Evidencias/Execucao_Referencias/Sprout_Track/` |
| Bebbo | `08_Referencias/Repositorios/Bebbo.md` e `09_Evidencias/Execucao_Referencias/Bebbo/` |
| Mobile | `08_Referencias/Tecnologias/Mobile_e_Plataformas.md` |
| Dados e backend | `08_Referencias/Tecnologias/Dados_Sincronizacao_e_Backend.md`, `Precos_Datados.md` |
| Comunidade e conteúdo | `08_Referencias/Pesquisa_Comunidade_e_Conteudo.md` |
| Privacidade e lojas | `08_Referencias/Pesquisa_Privacidade_Legal_e_Lojas.md` |

Regras passadas aos subagentes: dados fictícios, só 127.0.0.1, portas 38000-38499, containers com prefixo `appmat-ref-`, nada de prune nem de mexer em containers de Daniel, sem commit ou push, sem contas ou contratações. Às 03:28 havia um container de teste ativo, `appmat-ref-finnberry-pg` (PostgreSQL em 127.0.0.1:38110); a remoção será conferida no fechamento.

### Antes das 03:09 — itsaplan: projeto criado por Daniel

O navegador do agente abriu o itsaplan na tela de login e o cofre de senhas do navegador não tinha login salvo. Perguntado, Daniel respondeu: "Eu mesmo crio o projeto e adiciono o Hermes (default) como agente de trabalho; você segue pelo conector." O projeto MAT foi criado às 03:09:16.

### 03:12 — Obsidian normal aberto no seletor de cofres

Processo 24904 iniciado às 03:12:45 por `obsidian://choose-vault`, sem `--user-data-dir`; o seletor mostra FORJAI e BreakInv (perfil normal) e a versão 1.14.4. O clique em "Abrir pasta como um cofre" pela automação de interface não foi executado: a ferramenta devolveu "BLOCKED, not run; the user did NOT consent" (não dá para saber se a aprovação expirou ou foi negada). Pela regra da ferramenta, não repito nem contorno por outro caminho, e não edito o cadastro do Obsidian à mão.

Fotografia antes do registro (para medir o efeito depois): SHA-256 do `%APPDATA%/obsidian/obsidian.json` = `1a949920f191d3e5a539639a5ac6466b6c1c33a04ed716467eca81eb034fa6a3`; do cadastro da Oficina (`C:/OrchestrationLab/apps/orca/home/AppData/Roaming/obsidian/obsidian.json`, só OficinaConhecimento) = `5dec260fe65fff856c75dc198f18ccd38ebbc20b87ad10c15303face687675aa`. O lançador da Oficina é `C:/OrchestrationLab/Abrir-Obsidian-Oficina.cmd`, que usa `--user-data-dir` apontando para o cadastro da Oficina; o Obsidian normal é o mesmo executável sem esse parâmetro.

### 03:20 a 03:30 — itsaplan organizado

19 tarefas (MAT-1 a MAT-19), 37 vínculos "bloqueado por", documento de estado (id 9) ligado a todas e comentário de conclusão na MAT-1. Recibos completos em [Registro da organização](Registro_Organizacao.md).

### 03:31 a 03:53 — documentos independentes da pesquisa e recuperação de duas frentes

Escritos pelo coordenador, todos com status "proposta":

- [Modelo de dados e permissões](../03_Arquitetura/Modelo_de_Dados_e_Permissoes.md)
- [Offline, sincronização e temporizadores](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md)
- [Fluxos e telas](../02_Experiencia/Fluxos_e_Telas.md)
- [Visão e escopo](../01_Produto/Visao_e_Escopo.md)
- [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md)
- [Roadmap e próxima fatia](../07_Roadmap/Roadmap_e_Proxima_Fatia.md)
- [ADR-001](../06_ADRs/ADR-001_Plataformas_e_Web.md), [ADR-004](../06_ADRs/ADR-004_Offline_Sync_e_Temporizadores.md) e [ADR-005](../06_ADRs/ADR-005_Isolamento_e_Fronteira_Comunidade.md)

Situação da pesquisa às 03:45:

| Frente | Situação |
| --- | --- |
| Concorrentes A | Concluída às 03:31 (quatro fichas). |
| Finnberry | Interrompida às 03:14 pelo filtro de segurança do provedor ("violative cyber content"), depois de instalar, rodar os testes unitários e criar o schema num PostgreSQL de teste. Sem ficha. |
| Sprout Track | Interrompida às 03:36 pelo mesmo filtro, depois de executar o projeto e gravar as evidências em `09_Evidencias/Execucao_Referencias/Sprout_Track/`. Sem ficha. |
| Demais sete | Em andamento. |

Ações de recuperação:

- 03:46: removido o container `appmat-ref-finnberry-pg` deixado pela frente interrompida (banco de teste em memória, dados fictícios). Portas 38000-38499 conferidas: nenhum outro processo das referências ficou rodando.
- 03:47: nova delegação `deleg_23bc6717` com duas frentes, só para escrever as fichas do Finnberry e do Sprout Track a partir do código e das evidências existentes. Ficou proibido fazer requisições de teste de autorização; o escopo por família é tratado só por leitura de código.
- 03:47: a frente Baby Buddy recebeu a mesma orientação, para não perder o trabalho.
- 03:48: a frente Baby Buddy também foi interrompida pelo filtro, mas só depois de gravar a ficha completa (`08_Referencias/Repositorios/Baby_Buddy.md`, 383 linhas, às 03:46). Não precisa ser refeita.
- 03:59: a frente Bebbo parou porque o provedor deixou de responder (5 tentativas sem resposta), durante a leitura da licença e antes de escrever a ficha. As evidências em `09_Evidencias/Execucao_Referencias/Bebbo/` estão preservadas. Às 04:00, nova delegação `deleg_02d9d149` só para escrever a ficha a partir delas, sem nova execução.

### 04:05 a 04:27 — pesquisa consolidada e recomendação de arquitetura

- 04:05: a delegação `deleg_0f232e05` terminou. Concluídas: concorrentes A e B (oito fichas), mobile, dados e backend com preços, comunidade e conteúdo, privacidade e lojas. Falhas já tratadas acima: Finnberry, Sprout Track e Bebbo (relançadas), Baby Buddy (ficha salva antes da falha).
- Desvio relatado pela frente de privacidade: o sistema de aprovações bloqueou uma extração de artigos da LGPD (33, 37, 38, 41, 46, 48 e 49) com a instrução de não chegar ao mesmo resultado por outro caminho, e a frente leu depois esses artigos de um arquivo local. A nota resume esses artigos sem transcrevê-los. Os documentos derivados citam esses artigos só pelo número, com link ao Planalto. Daniel decide se os resumos ficam.
- Conferido às 04:10: o PowerSync Cloud oferece região BR e o Supabase oferece sa-east-1 (São Paulo).
- 04:12: delegação `deleg_a7e0449c` com quatro redatores: Concorrentes e diferenciais; Comunidade, Desenvolvimento e ADRs 006 e 007; Privacidade e segurança; Custos e operação e ADR-008.
- Escritos pelo coordenador: [Comparação de arquiteturas](../03_Arquitetura/Comparacao_de_Arquiteturas.md), [Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md), [ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md), [ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md) e [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md). Nomes dos conjuntos padronizados como A (Firebase), B (Supabase + PowerSync + serviço de domínio, recomendado) e C (API própria com sincronização própria).

### 04:28 a 04:42 — itsaplan atualizado e ficha do Finnberry

- 04:28 a 04:31: no itsaplan, a MAT-2 foi para Feito e a MAT-3 para "Esperando Daniel". As MAT-6, 7, 8, 9 e 14 foram para Em revisão, e as MAT-12, 13 e 15 para Em andamento, cada uma com um comentário. Também criei as decisões D1 a D6 (MAT-20 a MAT-25), com vínculos e o documento 9. Recibos em [Registro da organização](Registro_Organizacao.md).
- 04:30: a segunda tentativa do Finnberry (`deleg_23bc6717`, tarefa 1) caiu porque o provedor parou de responder. Antes disso, já tinha salvo o índice de evidências e os logs 06 e 07. Para não arriscar uma terceira queda, escrevi a ficha eu mesmo, só pela leitura do código, sem executar nada contra o app: [Finnberry](../08_Referencias/Repositorios/Finnberry.md) (263 linhas, 04:42). Às 04:35 não havia porta 38xxx nem container `appmat-ref-*` ativo.
- Ainda em andamento: Sprout Track (`deleg_23bc6717`, tarefa 2), Bebbo (`deleg_02d9d149`) e os quatro redatores (`deleg_a7e0449c`).

### 04:43 a 04:52 — concorrentes e diferenciais

- 04:43: o redator de Concorrentes e diferenciais (`deleg_a7e0449c`, tarefa 1) caiu por falta de resposta do provedor, sem ter escrito nada; a última ação foi às 04:20. Escrevi o documento eu mesmo, a partir das oito fichas: [Concorrentes e diferenciais](../01_Produto/Concorrentes_e_Diferenciais.md) (209 linhas, 04:52), com os diferenciais hipotéticos DF-1 a DF-7.
- MAT-4 foi para Em revisão no itsaplan, com comentário.
- Três links desse documento apontam para textos que outros redatores ainda estão escrevendo: Comunidade e moderação, Desenvolvimento e conteúdo, Privacidade e segurança. Confiro na revisão final de links.

### 04:41 a 05:03 — mais falhas de subagentes; documentos assumidos pelo coordenador

- Caíram por falta de resposta do provedor, sem escrever nada:
  - os redatores de Privacidade (04:45) e de Custos e ADR-008 (04:41);
  - o de Comunidade, Desenvolvimento e ADRs 006 e 007 (04:54);
  - a terceira tentativa do Sprout Track (`deleg_23bc6717`, 04:54).
  - O Bebbo (`deleg_02d9d149`) está sem atividade desde 04:38.
- Escritos pelo coordenador, a partir das notas de pesquisa:
  - [Privacidade e segurança](../05_Privacidade_Operacao/Privacidade_e_Seguranca.md) (241 linhas);
  - [Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md) (189 linhas);
  - [ADR-008](../06_ADRs/ADR-008_Documentacao_Operacao_Custos_e_Evolucao.md);
  - [Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md);
  - [ADR-006](../06_ADRs/ADR-006_Comunidade_e_Moderacao.md).
- 04:58: despachei um único subagente (`deleg_c292f0ff`) para escrever Desenvolvimento e conteúdo e o ADR-007. A instrução é gravar a primeira versão cedo, sem pesquisa web.
- Ajuste de coerência: a janela de backup passou de 35 para 7 dias no piloto, igual à do Supabase Pro e à do PITR. Uma janela maior só com cópia externa, a decidir pelo RPO/RTO.
- Evidências do Sprout Track: a pasta guarda requisições de teste de acesso da primeira tentativa (`07_api_probe.json`, `08_api_probe2.json`, `11_Resumo_Passos_API.md` e `roteiros/api_probe*.py`), feitas com dados fictícios em 127.0.0.1. Pela regra adotada depois dos bloqueios, esses arquivos não são usados nas fichas. Daniel decide se ficam no cofre antes de qualquer commit. Não há token nem chave neles (busca por padrões de JWT, Bearer e chave de API, sem ocorrência); só o PIN fictício padrão do seed.
- itsaplan: MAT-10, MAT-12 e MAT-13 foram para Em revisão, com comentários. Os comentários dizem "05:08" por erro meu: o horário real da entrega foi por volta de 05:00 (o `date` das 05:04 confirma).
- 05:04: chegou o aviso de falha do redator de Custos e ADR-008 (`deleg_a7e0449c`, tarefa 4), que já estava registrado acima. O log tem zero escritas, então não sobrou arquivo parcial. O link do ADR-003 apontava para o nome que esse redator usaria (`ADR-008_Documentacao_Operacao_Custos.md`); corrigi para o arquivo real.
- 05:05: chegou o aviso de falha do redator de Privacidade (`deleg_a7e0449c`, tarefa 3), que já estava registrado acima. O log tem zero escritas. O arquivo `Privacidade_e_Seguranca.md` em disco é o do coordenador (241 linhas, salvo às 04:54).
- 05:05: incluí no `.gitignore` os registros de testes de acesso contra projetos de terceiros:
  - Sprout Track: 06, 07, 08, 09, 11 e 12, mais os roteiros de sondagem;
  - Baby Buddy: 03, 06 e `roteiros/api_tests.sh`.

  Eles ficam fora do Git até Daniel decidir sobre divulgação responsável (D7). Os arquivos continuam no disco.
- 05:07: a delegação `deleg_23bc6717` terminou com as duas tarefas falhas, por falta de resposta do provedor:
  - Finnberry: as duas escritas foram o roteiro de licenças no rascunho e o índice de evidências. A ficha é a do coordenador, das 04:42.
  - Sprout Track: zero escritas. A ficha está sendo escrita pelo coordenador, por leitura de código.
  - Às 05:07 não havia container `appmat-*` nem porta 38xxx em escuta.
- 05:08: a delegação `deleg_a7e0449c` terminou com as quatro tarefas falhas. Nenhuma delas escreveu no cofre. Os seis documentos que estavam com esses redatores estão no disco, escritos pelo coordenador: Concorrentes e diferenciais, Privacidade e segurança, Custos e operação, ADR-008, Comunidade e moderação e ADR-006. Desenvolvimento e conteúdo e o ADR-007 seguem com `deleg_c292f0ff`.
- 05:10: a ficha do Bebbo (`deleg_02d9d149`) caiu por falta de resposta do provedor, sem escrever no cofre. No rascunho, `scratch/bebbo-ficha`, ficaram `dep_licenses.out` e `ledger.json`. O coordenador assume a ficha, a partir das 14 evidências já gravadas e da leitura de código. Até aqui, todas as tentativas de subagente desta etapa, exceto as da pesquisa inicial, caíram por falta de resposta do provedor. Para não perder mais tempo, sigo escrevendo pelo coordenador.

### 05:10 a 05:38 — fichas restantes, conteúdo, D7 e revisão de evidências

- Escritos pelo coordenador:
  - [Sprout Track](../08_Referencias/Repositorios/Sprout_Track.md), 05:16, por leitura de código e pelo registro de execução; licença lida inteira;
  - [Bebbo](../08_Referencias/Repositorios/Bebbo.md), 05:20, com a cópia de `15_licencas_dependencias.tsv` do rascunho para as evidências;
  - [Desenvolvimento e conteúdo](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md), 05:27;
  - [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md), 05:28.
- 05:25: interrompi `deleg_c292f0ff` (sa-0-7cb5adab). Estava sem atividade desde 05:06 e sem nenhuma escrita.
- Fontes públicas conferidas pelo coordenador às 05:19: termos e política de privacidade do Bebbo, e a página da FSF de 2010 sobre GPL e App Store.
- **D7 criada:** registros de testes de acesso em projetos de terceiros, em [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md); MAT-26 (id 162) em "Esperando Daniel", ligada ao documento 9.
- **Revisão de coerência com a regra de só ler código:**
  - a ficha do Baby Buddy citava resultados de testes de acesso da primeira rodada (códigos A, E e F) e linkava os logs 03 e 06. Reescrevi esses trechos como leitura de código, com a ressalva de pergunta de auditoria. Os códigos funcionais B, C e D ficaram;
  - o README das evidências do Baby Buddy e o registro do Sprout Track não linkam mais os arquivos ignorados;
  - o registro do Sprout Track afirmava "falhas de autorização ainda não corrigidas"; agora diz que os registros pedem avaliação dos mantenedores (D7). Também tirei a sugestão de repetir os roteiros.
- itsaplan:
  - MAT-11 foi para Em revisão;
  - MAT-5 foi para Em andamento; faltam a análise comparativa e as licenças;
  - comentários na MAT-5, na MAT-11 e na MAT-15.

### 05:38 a 05:46 — consolidação e revisão independente

- Escritos: [Análise dos repositórios](../08_Referencias/Analise_dos_Repositorios.md), [Licenças e fontes](../08_Referencias/Licencas_e_Fontes.md) e o [Relatório final](Relatorio_Final_APP-001.md), este em revisão.
- [Home](Home.md) refeita com o mapa de todos os documentos. Ela também deixou de afirmar que o cofre está aberto no Obsidian.
- Conferência por script às 05:38: 51 arquivos .md, nenhum link quebrado, nenhum link para arquivo ignorado. Finais de linha normalizados para LF em 23 arquivos.
- Obsidian normal conferido às 05:47: o `obsidian.json` continua só com BreakInv e FORJAI. MAT-3 segue esperando Daniel.
- **Revisão independente (MAT-16):** iniciada às 05:39:35 em segundo plano.
  - Rota: Codex CLI 0.163.0, gpt-6-astra, esforço max, sandbox read-only, sem busca web, sessão efêmera.
  - Artefatos em `hermes/cache/scratch/appmat-review-r1/`: prompt, manifesto sha256 de 54 arquivos, schema, events, stderr e verdict.
- itsaplan:
  - MAT-5 foi para Em revisão e MAT-16 para Em andamento, com comentários;
  - documento 9 atualizado para a versão 2 às 05:45;
  - recibos em [Registro da organização](Registro_Organizacao.md).
- **Próxima ação:** ler o veredito da revisão, corrigir os achados, registrar na MAT-16 e no relatório, e fazer a entrega final.
- 05:47: chegou o aviso de término de `deleg_c292f0ff`, a tentativa interrompida às 05:25: status interrupted, 5 chamadas e zero escritas. Desenvolvimento e conteúdo e ADR-007 continuam sendo os do coordenador, gravados às 05:28. Não relancei.

### 06:07 a 06:23 — primeira rodada da revisão independente e correções

- **Fim da primeira rodada:** 06:06:58, com exit 0. Veredito CHANGES_REQUIRED: 8 achados, 5 médios e 3 baixos. Cobertura: 28 atendidos, 12 parciais e 2 bloqueados (Obsidian).
- **Correções:** os 8 achados foram aceitos e corrigidos em 24 arquivos. A tabela está no [Relatório final](Relatorio_Final_APP-001.md), seção "Revisão independente".
  - F01, custos: o conjunto recomendado passou a US$ 108 a 126 com 100 famílias, incluindo o serviço de domínio.
  - F02, iOS: a comparação agora é entre EAS e CI macOS.
  - F03, sessões paralelas: vale a política de Offline, seções 7.2 e 8.
  - F04, escopo: MAT-18 e MAT-19 seguem o roadmap.
  - F05, "não identificada nas fontes".
  - F06, bloqueio mútuo.
  - F07, dependências do Sprout Track: arquivo de evidência 13.
  - F08, aceite A11.
- **Conferência por script às 06:23:** 52 arquivos .md, 691 links relativos, nenhum quebrado. Nenhum arquivo versionado aponta para arquivo fora do Git. O único link para registro da D7 sai de outro registro da D7, também ignorado.
- **Segunda rodada:** confere as correções e o relatório final. Disparada logo depois deste checkpoint (`appmat-review-r2`).

### 06:24 a 06:45 — segunda rodada da revisão e correções

- **Segunda rodada:** de 06:24:07 a 06:39:42, com exit 0. Manifesto de 33 arquivos; os hashes conferiram e nenhum arquivo proibido foi lido.
  - Veredito CHANGES_REQUIRED: 8 achados, 3 médios e 5 baixos.
  - Quatro são resíduos de F01, F02, F04 e F06, em notas de pesquisa e no relatório. Quatro são novos: F09, a ordem MAT-17 → MAT-18 no relatório; F10, o Firebase no relatório; F11, a conciliação do custo de 10.000 famílias; F12, a contagem de documentos.
- **Correções** em 8 arquivos (tabela no [Relatório final](Relatorio_Final_APP-001.md)).
  - **Número canônico alterado:** em [Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md), seção 2, entrou a linha de excedentes de banco, arquivos e PowerSync (~US$ 12 em 10.000 famílias). O subtotal de 10.000 famílias foi a ~US$ 238 a 298 e a fase de crescimento a ~US$ 250 a 350, com homologação. Comparação e ADR-003 foram atualizados.
  - Os valores de 100 e 1.000 famílias não mudaram.
- **Conferência por script às 06:43:** 50 arquivos versionados de origem e 703 links relativos. Nenhum quebrado, nenhum para arquivo fora do Git e nenhum CRLF.
- **Terceira rodada**, curta, só sobre os achados da segunda: disparada às 06:45 (`appmat-review-r3`).
- **itsaplan:** MAT-15 para "Em revisão" às 06:24, com comentário; comentário 925 na MAT-16. Recibos em [Registro da organização](Registro_Organizacao.md).

### 06:45 a 06:58 — terceira rodada e encerramento

- **Terceira rodada:** de 06:45:10 a 06:55:41, com exit 0. Manifesto de 13 arquivos; os hashes conferiram e nenhum arquivo proibido foi lido.
  - Veredito APPROVED_WITH_LIMITS: 8 itens atendidos e 2 parciais.
  - Achado único, F11-R3 (baixo): os ~US$ 12 de excedentes não se reproduziam pelos componentes.
- **Correção às 06:56:** memória por componente em Custos (seção 2) e em Preços datados (10.2): banco US$ 5,25, arquivos US$ 0,94 e PowerSync US$ 1,25, somando ~US$ 7,44. Os ~US$ 4,56 restantes ficaram como diferença não reproduzível da nota, mantida como margem. Os totais não mudaram. Essa correção não passou por nova rodada.
- **Balanço das três rodadas:** 17 achados, 8 médios e 9 baixos, nenhum alto. Todos foram tratados.
- **itsaplan:** comentário 932 na MAT-16, que foi para "Em revisão" às 06:57. As colunas 30 e 31 estavam vazias na releitura, e o documento 9 foi para a versão 3.
- **Conferências finais às 06:58:**
  - Git: nenhum commit, nenhum push; o `origin` aponta para o GitHub público.
  - Os 10 registros da D7 continuam ignorados pelo Git. O TSV 13 (licenças) é versionável.
  - Nenhum container `appmat-*` e nenhuma porta de 38000 a 38499 em escuta.
  - O cadastro do Obsidian normal continua só com BreakInv e FORJAI.

### 07:00 a 07:04 — cofre registrado por Daniel

- Daniel avisou que abriu o cofre. A conferência foi só por leitura, sem automação de interface.
- **Cadastro normal:** `%APPDATA%/obsidian/obsidian.json`, modificado às 07:00:46, com a entrada `75cd70ea629fa64f`, caminho `C:\Projetos\AppMaternidade\docs\AppMaternidade` e `open: true`.
- **Janela:** "Nova aba - AppMaternidade - Obsidian 1.14.4", no processo principal 24904, sem `--user-data-dir`. Os processos filhos usam `%APPDATA%/obsidian`, o perfil normal.
- **Pasta `.obsidian/`** criada às 07:00:47 e 07:00:48, ignorada pelo Git (`.gitignore`, linha 10).
- **Oficina:** o cadastro continua com o SHA-256 de antes (`5dec260f…`). Não foi usado.
- **Navegação:** às 07:02:55 o `workspace.json` não tinha nenhuma nota aberta. Às 07:04 começou uma observação em segundo plano, de até 30 minutos (`appmat-obsidian-watch`). Ela termina quando a Home, um design doc e um ADR aparecerem abertos no aplicativo.

### 07:11 a 07:14 — navegação conferida e MAT-3 concluída

- **Conferência:** a observação `appmat-obsidian-watch` terminou com exit 0, e o `workspace.json` do cofre registrou: Home às 07:11:55; ADR-002 às 07:12:03, depois ADR-003, ADR-001, ADR-007 e ADR-004; Roadmap e Decisões às 07:12:39; e o design doc Comunidade e moderação, aberto às 07:12:42.
- **itsaplan:** MAT-3 foi para "Feito", com comentário.
- **Relatório final:** status passou a concluída. A Home e o documento 9 foram atualizados.
- **Conferência só por leitura:** nenhuma automação de interface e nenhuma edição em `.obsidian/`.

### 14:50 a 15:13 — pacote de retorno para o consultor

- **Pedido de Daniel:** o retorno completo e todos os arquivos documentados, para avaliar com o consultor.
- **Releitura das 26 tarefas do MAT:** as descrições de MAT-20 (D1) e MAT-21 (D2) ainda tinham o texto anterior à revisão independente (achados F02 e F01).
  - Foram alinhadas ao cofre às 14:55, com nota da atualização. As recomendações não mudaram.
  - Recibos em [Registro da organização](Registro_Organizacao.md).
- **Correção de nome:** a coluna 30 do MAT se chama "A fazer", e não "docs dependentes", como estava neste registro e no relatório final.
- **Pacote:** `C:\Projetos\AppMaternidade\entregas\AppMaternidade_APP-001_Retorno_Hermes_2026-10-22\`, com ZIP e recibo de verificação ao lado. A pasta `entregas/` fica fora do Git.
  - Leva uma cópia dos arquivos versionáveis do cofre, dois dossiês em arquivo único, a exportação do MAT, as três rodadas da revisão independente e o pacote de entrada da task, sem alteração.
  - Ficam fora: os registros da D7, a pasta `.obsidian/` e os clones de terceiros.
- **Conferências do pacote:**
  - descrições, títulos, colunas, tipos, prioridades, etiquetas e vínculos das 26 tarefas exportadas conferem, por script, com as respostas do conector;
  - os 13 arquivos do pacote de entrada conferem com o disco;
  - o documento 9 está na versão 5, salva por Daniel às 14:16, com texto idêntico ao da versão 4;
  - links: 709 na cópia do cofre e 8 nos guias do pacote, nenhum quebrado e nenhum apontando para arquivo excluído;
  - nenhum arquivo, hash ou trecho dos registros da D7 no pacote;
  - nenhuma credencial do GUIA_ACESSO e nenhum padrão de segredo no pacote.
- **Observação para antes do primeiro push:** quatro arquivos versionáveis citam o caminho da pasta de usuário do Windows.
  - São eles: `Registro_Organizacao.md`, dois logs do Bebbo (03 e 13) e o log 04 do Sprout Track.
  - Não é credencial, mas o nome da máquina fica público se o repositório for publicado.
- **ZIP pronto às 15:13:** `entregas\AppMaternidade_APP-001_Retorno_Hermes_2026-10-22.zip`, com 124 arquivos e 979.786 bytes.
  - SHA-256 `C4E13E4F4668D1643E404EA7EBCE888B117569E700DE8BC92C75D12FBFF029B2`.
  - Recibo: `entregas\AppMaternidade_APP-001_Retorno_Hermes_2026-10-22_VERIFICACAO.json`.

## Bloqueios

| Desde | Item | Situação | Menor intervenção |
| --- | --- | --- | --- |
| ~03:15 | Registrar o cofre no Obsidian normal (MAT-3) | **Resolvido por Daniel às 07:00:46.** Antes, o clique pela automação de interface tinha voltado "BLOCKED, not run; the user did NOT consent", e o cadastro listava só BreakInv e FORJAI às 03:44, 05:47 e 06:58. | Concluído: navegação conferida às 07:12 pelo `workspace.json`. |
| 03:14 | Análise de Finnberry, Sprout Track e Baby Buddy por subagentes | "content_policy_blocked: This request triggered restrictions on violative cyber content and was blocked under Anthropic's Usage Policy." | Contornado: fichas só por leitura de código; registros de testes de acesso fora do Git (D7). |
| 04:30 a 05:25 | Redatores e fichas por subagente | "Provider has been unresponsive (no response received) for 5 consecutive stale attempts — aborting this call to avoid an indefinite stall." | Contornado: o coordenador escreveu todos os documentos que faltavam. |

## Próxima ação

Etapa APP-001 concluída pelo coordenador. Aguardando Daniel:

- revisar as tarefas em revisão (MAT-4 a MAT-16);
- responder às decisões D1 a D7 (MAT-20 a MAT-26). A D7 precisa de resposta antes do primeiro push.

Nenhuma tarefa de implementação (MAT-17 a MAT-19) começa sem pedido dele.
