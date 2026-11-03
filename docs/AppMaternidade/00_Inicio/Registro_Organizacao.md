---
tipo: registro
status: em andamento
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
---

# Registro da organização

Recibos das criações feitas na APP-001. Depois de uma interrupção, confira esta página e o itsaplan antes de recriar qualquer coisa. Os IDs abaixo foram devolvidos pelo próprio itsaplan; nenhum foi deduzido da semente do pacote.

## itsaplan

| Item | Valor | Como foi conferido |
| --- | --- | --- |
| Instância | Web em http://localhost:3001; API e MCP em http://127.0.0.1:3000/mcp; versão 1.6.0 segundo o guia de acesso da oficina | Conector `itsaplan` do perfil default do Hermes |
| Equipe | "Oficina" (teamId 1, teamRef `oficina`) | `list_projects` |
| Projeto | AppMaternidade, chave **MAT**, id 5, ref `oficina.MAT` | `get_project MAT` |
| Criação | Por Daniel, na interface, em 22/10/2026 às 03:09:16 (06:09:16 UTC). O conector do Hermes não tem ferramenta para criar projeto; Daniel escolheu criar e adicionar o agente. | `createdAt` do projeto e resposta de Daniel |
| Quadro | http://localhost:3001/oficina/MAT | Rota `/<teamRef>/<key>` do itsaplan 1.6.0 (`apps/web/src/utils/paths.ts`), o mesmo formato dos links exportados do LAB e do BRK |
| Tarefa (exemplo) | http://localhost:3001/oficina/issue/MAT-1 | Rota `/<teamRef>/issue/<KEY>-<n>` do mesmo arquivo |
| Documento de estado | "Estado atual e próximos passos (AppMaternidade)", id 9: http://localhost:3001/oficina/MAT/docs/9 | `create_document`; ligado às 19 tarefas |
| Agente | Hermes (default), usuário `hermes-default`, agente externo (não responde a menções e não executa sozinho). Pode criar e editar tarefas e documentos; não pode apagar. | `get_project MAT` (viewer e assignees) |
| Membros | Daniel (danielmacedosilva11), Admin (instalação) e Hermes (default) | `get_project MAT` |

### Colunas e etiquetas efetivas

As colunas e etiquetas foram criadas por Daniel junto com o projeto. Mapeamento dos estados conceituais do pacote:

| Estado conceitual (pacote) | Coluna no MAT |
| --- | --- |
| Backlog | Backlog |
| Pronto | A fazer |
| Em andamento | Em andamento |
| Em revisão | Em revisão |
| Concluído | Feito |
| Bloqueado | etiqueta `bloqueado`, ou a coluna "Esperando Daniel" quando a tarefa depende dele |
| (sem equivalente) | Congelado e Cancelado |

As frentes de trabalho viraram etiquetas, porque o conector não tem ferramentas de iniciativas: Descoberta e escopo (22), Experiência mobile (23), Referências e licenças (24), Arquitetura e dados (25), Comunidade e conteúdo (26), Operação e entrega (27). Etiquetas de controle: decisão de Daniel (19), precisa de autorização (20), bloqueado (21).

### Tarefas criadas

| Semente | Chave | id | Título | Coluna em 22/10 03:28 | Bloqueada por |
| --- | --- | --- | --- | --- | --- |
| DOC-001 | MAT-1 | 137 | Conferir contexto, escopo e checkpoint | Feito | — |
| DOC-002 | MAT-2 | 138 | Criar e verificar projeto AppMaternidade no itsaplan | Em andamento | MAT-1 |
| DOC-003 | MAT-3 | 139 | Criar cofre no Obsidian normal e Home | Em andamento, `bloqueado` | MAT-1 |
| DOC-004 | MAT-4 | 140 | Pesquisar concorrentes e definir hipótese de produto | Em andamento | MAT-1 |
| DOC-005 | MAT-5 | 141 | Analisar quatro repositórios e licenças | Em andamento | MAT-1 |
| DOC-006 | MAT-6 | 142 | Desenhar jornadas e navegação mobile | A fazer | MAT-4 |
| DOC-007 | MAT-7 | 143 | Comparar mobile e arquiteturas completas | Em andamento | MAT-4, MAT-5 |
| DOC-008 | MAT-8 | 144 | Especificar modelo e permissões | A fazer | MAT-7 |
| DOC-009 | MAT-9 | 145 | Especificar offline, conflitos e temporizadores | A fazer | MAT-8 |
| DOC-010 | MAT-10 | 146 | Definir comunidade e moderação | Em andamento | MAT-4 |
| DOC-011 | MAT-11 | 147 | Definir tummy time e ciclo editorial | Em andamento | MAT-4, MAT-5 |
| DOC-012 | MAT-12 | 148 | Documentar privacidade e segurança | A fazer | MAT-8, MAT-9, MAT-10, MAT-11 |
| DOC-013 | MAT-13 | 149 | Estimar custos e operação | A fazer | MAT-7, MAT-10 |
| DOC-014 | MAT-14 | 150 | Definir qualidade e provas técnicas | A fazer | MAT-6, MAT-9, MAT-12 |
| DOC-015 | MAT-15 | 151 | Consolidar ADRs, decisões e roadmap | A fazer | MAT-5 a MAT-14 |
| DOC-016 | MAT-16 | 152 | Revisar documentação e entregar recibos | A fazer | MAT-2, MAT-3, MAT-15 |
| FUT-001 | MAT-17 | 153 | Validar a stack escolhida com uma prova pequena | Backlog, sem agente | MAT-15 |
| FUT-002 | MAT-18 | 154 | Construir fundação e primeira fatia de cuidados | Backlog, sem agente | MAT-17 |
| FUT-003 | MAT-19 | 155 | Entregar fatia inicial da comunidade | Backlog, sem agente | MAT-18 |

Diferenças em relação à semente `07_BACKLOG_INICIAL.json`:

- A semente marcava tudo como Backlog. As colunas refletem o andamento real; as tarefas futuras ficam no Backlog, sem agente delegado e com a etiqueta "precisa de autorização", para não disparar execução.
- Prioridade "normal" virou `medium`; arquitetura, sincronização, comunidade, conteúdo e privacidade ficaram `high`; as futuras, `low`.
- As 37 dependências da semente viraram vínculos "bloqueado por" (ids de vínculo 86 a 122).
- As descrições ganharam verificação, executor, autorização e fonte. O entregável "Relatorio_Final.md" passou a ser `00_Inicio/Relatorio_Final_APP-001.md`.
- As decisões que esperam Daniel entram como tarefas novas na coluna "Esperando Daniel" ao fim da MAT-15; não estavam na semente.

Verificação: `list_issues` às 03:28 devolveu 19 tarefas (MAT-1 a MAT-19); o documento 9 foi ligado às 19.

### Decisões de Daniel (criadas às 04:30)

Coluna "Esperando Daniel" (35), etiqueta "decisão de Daniel" (19), responsável Daniel, sem agente. Texto completo em [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md).

| Decisão | Chave | id | Bloqueia |
| --- | --- | --- | --- |
| D1 Framework mobile | MAT-20 | 156 | MAT-17 |
| D2 Dados, backend e região | MAT-21 | 157 | MAT-17 |
| D3 Quem publica e contas nas lojas | MAT-22 | 158 | MAT-17 |
| D4 Recorte do MVP | MAT-23 | 159 | MAT-18 |
| D5 Pessoas para conteúdo, moderação e jurídico | MAT-24 | 160 | MAT-19 |
| D6 Monetização | MAT-25 | 161 | — |

Vínculos "bloqueado por" novos: ids 123 a 127. O documento 9 foi ligado às seis decisões.

### Movimentos de coluna às 04:28

| Tarefa | De | Para | Motivo |
| --- | --- | --- | --- |
| MAT-2 | Em andamento | Feito | Projeto conferido por releitura (`get_project`) e comentário com os recibos |
| MAT-3 | Em andamento | Esperando Daniel (responsável: Daniel) | Registro do cofre depende de ação de Daniel no Obsidian |
| MAT-6, MAT-7, MAT-8, MAT-9, MAT-14 | A fazer ou Em andamento | Em revisão | Documento entregue; aguarda a revisão independente (MAT-16) |
| MAT-12, MAT-13, MAT-15 | A fazer | Em andamento | Redação em curso |

### Decisão D7 e movimentos de 04:52 a 05:42

- **MAT-26 (id 162), "D7 — Registros de testes de acesso em projetos de terceiros":**
  - criada às 05:29:39 (08:29:39 UTC), na coluna 35, tipo 15, prioridade medium;
  - etiqueta 19, responsável Daniel, sem agente;
  - ligada ao documento 9 às 05:30:02.
  - Não bloqueia tarefa do backlog: precisa de resposta antes do primeiro push.
- **Para "Em revisão" (coluna 36), cada uma com comentário:**
  - MAT-4 às 04:52;
  - MAT-10, MAT-12 e MAT-13 por volta de 05:00;
  - MAT-11 às 05:30;
  - MAT-5 às 05:42.
- **Para "Em andamento" (coluna 31):** MAT-5 às 05:30, antes de ir para revisão; MAT-16 às 05:42, quando começou a revisão independente.
- **Comentário de andamento na MAT-15** às 05:30: ADR-006 a ADR-008 escritos e D7 criada.
- **Releitura com `list_issues` às 05:42:** 26 tarefas, de MAT-1 a MAT-26.
  - Feito: MAT-1 e MAT-2.
  - Esperando Daniel: MAT-3 e MAT-20 a MAT-26.
  - Em revisão: MAT-4 a MAT-14.
  - Em andamento: MAT-15 e MAT-16.
  - Backlog: MAT-17 a MAT-19, sem agente.

### Revisão independente e movimentos de 05:45 a 06:25

- **Documento 9 ("Estado atual e próximos passos")** atualizado para a versão 2 às 05:45.
- **Comentário 925 na MAT-16 (id 152)**, às 06:24:32: resultado da primeira rodada da revisão independente, os 8 achados com as correções e o início da segunda rodada.
- **MAT-15 (id 151) para "Em revisão" (coluna 36)**, às 06:24:42. O comentário 927 lista os entregáveis e as correções nos ADRs e no roadmap.
- **Sem agente:** MAT-17 a MAT-19 continuam no backlog. Nenhuma decisão D1 a D7 foi respondida.

### Encerramento da revisão, de 06:56 a 06:58

- **MAT-16 (id 152):** comentário 932 às 06:57:05, com a segunda e a terceira rodadas e as correções. Em seguida, foi para "Em revisão" (coluna 36).
- **Releitura às 06:57:** as colunas 30 ("A fazer") e 31 ("Em andamento") estavam vazias.
- **Documento 9:** foi para a versão 3 às 06:57:53.
- **Estado final da etapa:**
  - Feito: MAT-1 e MAT-2.
  - Esperando Daniel: MAT-3 e MAT-20 a MAT-26.
  - Em revisão: MAT-4 a MAT-16.
  - Backlog sem agente: MAT-17 a MAT-19.

### Obsidian registrado e MAT-3 concluída, de 07:00 a 07:14

- **MAT-3 (id 139):** comentário 935 às 07:04:54, com as evidências do registro feito por Daniel às 07:00:46.
- **Navegação conferida** pelo `workspace.json` do cofre: Home às 07:11:55; ADR-002 às 07:12:03, depois ADR-003, ADR-001, ADR-007 e ADR-004; Roadmap e Decisões às 07:12:39; e o design doc Comunidade e moderação, aberto às 07:12:42.
- **MAT-3 foi para "Feito"** (coluna 32) às 07:14:36, com o comentário 937.
- **Documento 9:** foi para a versão 4 às 07:14:58. Diz que a etapa está concluída e que Daniel tem a revisão e as decisões D1 a D7.

### Descrições de MAT-20 e MAT-21 alinhadas ao cofre, às 14:55

- Na preparação do pacote de retorno, a releitura das 26 tarefas mostrou que as descrições de MAT-20 (D1) e MAT-21 (D2) ainda tinham o texto anterior à revisão independente.
  - MAT-20 dizia que o Expo era "a única opção" para o iOS a partir do Windows (achado F02).
  - MAT-21 citava US$ 101/mês, sem o serviço de domínio (achado F01).
- **Correção:** as duas descrições foram atualizadas pelo `update_issue` às 14:55:15, com o texto do cofre e uma nota da atualização. As recomendações não mudaram.
- **Releitura das demais 24 tarefas:** nenhuma outra contradição com o cofre. A descrição da MAT-3 mantém a "Situação em 22/10 04:28" como histórico; a conclusão está nos comentários 935 e 937.
- **Documento 9:** a releitura às 15:07 mostrou a versão 5, salva por Daniel às 14:16:13. O texto é idêntico ao da versão 4, escrita pelo Hermes às 07:14:58 (conferido por script).
- **MAT-3:** a etiqueta "bloqueado" (21) foi retirada às 14:58, porque a tarefa está feita. Ficou só "Operação e entrega" (27).
- **Recibo do pacote:** comentário 990 na MAT-16, às 15:13:29, com o caminho e o SHA-256 do ZIP de retorno.
- **Correção de nome:** a coluna 30 do MAT se chama "A fazer". Este registro e o relatório final a chamavam por engano de "docs dependentes"; corrigido às 14:57.

### Design doc base de escopo, às 18:23

- **Origem:** versão-base escrita pelo consultor às 18:04, sem acesso aos arquivos locais, depois da consulta sobre web primeiro. Original em `entregas/Consulta_Plataformas_2026-10-22/DESIGN_DOC_BASE_v0.1_consultor.md`.
- **Conferência com o cofre (v0.2):** sete tipos de registro, papéis e vários bebês do modelo, lembretes na web, cifra local do nativo, sequência original da APP-001 e ligação com D1 a D7 e MAT-17 a MAT-19.
- **Documento 10** "Design doc base de escopo (AppMaternidade)", criado às 18:23:44, versão 1, não privado. O texto publicado é idêntico ao arquivo `entregas/Consulta_Plataformas_2026-10-22/DESIGN_DOC_BASE.md` (conferido por script). Ligado às tarefas MAT-17 e MAT-20 a MAT-25.
- **Documento 9:** versão 6 às 18:25:14, com a proposta revista, o link do documento 10 e os novos próximos passos. A versão 7, às 18:25:21, é o editor de Daniel salvando a página aberta; as mudanças da versão 6 continuam nela, e o horário antigo não voltou (conferido por script).
- **Ainda não alinhados:** as descrições de MAT-20, MAT-22 e MAT-23 e os documentos do cofre descrevem a proposta da APP-001 (nativo primeiro). A reconciliação vem depois da revisão de Daniel e Diego (seção 15 do design doc base).

### Conferência dos documentos 9 e 10, em 23/10 às 07:30

- **Documento 10:** a versão 2, de 23/10 às 01:22, saiu em nome de Daniel quando ele abriu a página. O texto é idêntico ao de `entregas/Consulta_Plataformas_2026-10-22/DESIGN_DOC_BASE.md` (conferido por script).
- **Documento 9:** a versão 7 tem exatamente o texto enviado na versão 6, lido no registro da sessão (conferido por script). A versão 8, às 07:30:22, alinhou três linhas com o design doc base:
  - o custo de US$ 108 a 126/mês foi calculado para o plano nativo primeiro e será refeito para a web;
  - a MAT-17 vem depois da revisão da dupla e precisa de um iPhone real;
  - o horário da atualização.
- **Nada mudou desde 22/10 às 18:26:** as decisões D1 a D7 (MAT-20 a MAT-26) continuam sem comentários; as colunas das tarefas são as mesmas; não houve rodada nova do consultor nem commit.
- **Fatos do design doc conferidos de novo no cofre:**
  - 0 a 12 meses e gestação fora;
  - os sete tipos de registro;
  - RF-05, RF-07, RF-12 e RF-14;
  - os papéis e o observador;
  - o SQLCipher fora da web;
  - o SDK Web do PowerSync em GA;
  - F5 e F6 do roadmap;
  - a etapa 3 do ADR-006;
  - a D4 com 18 anos ou mais.

### Design doc 0.3 e publicação no GitHub, em 23/10 às 07:58

- **Pedido de Daniel:** tirar do documento as menções a ele e ao Diego, deixá-lo focado no projeto e subir só ele para o GitHub, com Daniel como autor.
- **Versão 0.3:** 25 trocas por script, com contagem exata de cada âncora. Saíram as menções a Daniel, Diego, "dupla", Hermes, consultor e "cofre". O parecer jurídico sobre o ECA Digital continua, porque é conteúdo do projeto. A tabela do histórico perdeu a coluna "Quem".
- **Documento 10:** versão 3, às 07:58:12. O texto é idêntico a `docs/DESIGN_DOC_BASE.md` (sha256 `ec1be7c2f46954f9…`, conferido por script).
- **GitHub:** commit `a51fc1f` em `main` de https://github.com/DeD-TechStack/AppMaternidade (público).
  - Contém só `docs/DESIGN_DOC_BASE.md`.
  - Autor e committer: Daniel Macedo, com o e-mail ligado à conta Daniel-Macedo-dev.
  - A API do GitHub mostra Daniel-Macedo-dev como autor e como único contributor.
  - O blob remoto é igual ao local.
  - O push usou a credencial do `gh` só naquele comando, sem mudar a configuração do Git.
- **Fora do Git:** o cofre, `tasks/`, `.gitignore` e `PROGRESSO_TASK_HERMES.md`. A D7 continua necessária antes de publicar o restante.
- **Documento 9:** versão 10, às 08:00:21. Inclui o link do GitHub, o commit e a regra "sem pedido explícito de Daniel".
- **Cópia anterior:** `entregas/Consulta_Plataformas_2026-10-22/DESIGN_DOC_BASE.md` continua como a versão 0.2.

## Obsidian

| Item | Valor |
| --- | --- |
| Cofre | AppMaternidade |
| Caminho | `C:/Projetos/AppMaternidade/docs/AppMaternidade` |
| Aplicativo | Obsidian 1.14.4, executável `C:/OrchestrationLab/apps/orca/home/AppData/Local/Programs/Obsidian/Obsidian.exe`, o mesmo associado ao protocolo `obsidian://` |
| Perfil normal (usado) | Cadastro em `C:/Users/danie.DESKTOP-AUUT84P/AppData/Roaming/obsidian/obsidian.json`; antes do registro listava BreakInv e FORJAI |
| Perfil Oficina (não usado) | Lançador `C:/OrchestrationLab/Abrir-Obsidian-Oficina.cmd`, com `--user-data-dir` em `C:/OrchestrationLab/apps/orca/home/AppData/Roaming/obsidian` (cofre OficinaConhecimento) |
| Situação | **Registrado por Daniel às 07:00:46**, no seletor do perfil normal. Evidências: entrada `75cd70ea629fa64f` no `%APPDATA%/obsidian/obsidian.json`, com `open: true`; janela "AppMaternidade - Obsidian 1.14.4" no processo 24904, sem `--user-data-dir`, com os processos filhos em `%APPDATA%/obsidian`; pasta `.obsidian/` criada às 07:00:47, fora do Git. O cadastro da Oficina continua com o mesmo SHA-256 de antes (`5dec260f…`). Antes, às 03:12:45, a automação de interface tinha voltado "BLOCKED, not run; the user did NOT consent" e não foi repetida. **Navegação no aplicativo:** conferida pelo `workspace.json` do cofre, sem automação de interface: Home às 07:11:55; ADR-002 às 07:12:03, depois ADR-003, ADR-001, ADR-007 e ADR-004; Roadmap e Decisões às 07:12:39; e o design doc Comunidade e moderação, aberto às 07:12:42. |

Fotografia antes do registro, para medir o efeito depois: SHA-256 do cadastro normal `1a949920f191d3e5a539639a5ac6466b6c1c33a04ed716467eca81eb034fa6a3`; do cadastro da Oficina `5dec260fe65fff856c75dc198f18ccd38ebbc20b87ad10c15303face687675aa`.

Depois do registro, conferido às 07:03: o cadastro normal mudou para `19f3c6f981d13bf5129ddd6f6349994508245913b48bd7d9fa2a81c4a18cd621`, com a entrada nova do AppMaternidade. O cadastro da Oficina continua com o mesmo hash de antes.

## Tarefa, documento e ADR

| Tarefa | Documentos | ADR |
| --- | --- | --- |
| MAT-4 | `01_Produto/Visao_e_Escopo.md`, `01_Produto/Concorrentes_e_Diferenciais.md` | ADR-001 |
| MAT-5 | `08_Referencias/Analise_dos_Repositorios.md`, `08_Referencias/Licencas_e_Fontes.md` | ADR-007 |
| MAT-6 | `02_Experiencia/Fluxos_e_Telas.md` | ADR-001 |
| MAT-7 | `03_Arquitetura/Comparacao_de_Arquiteturas.md`, `03_Arquitetura/Arquitetura_Proposta.md` | ADR-002, ADR-003 |
| MAT-8 | `03_Arquitetura/Modelo_de_Dados_e_Permissoes.md` | ADR-005 |
| MAT-9 | `03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md` | ADR-004 |
| MAT-10 | `04_Comunidade_Conteudo/Comunidade_e_Moderacao.md` | ADR-006 |
| MAT-11 | `04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md` | ADR-007 |
| MAT-12 | `05_Privacidade_Operacao/Privacidade_e_Seguranca.md` | ADR-005, ADR-008 |
| MAT-13 | `05_Privacidade_Operacao/Custos_e_Operacao.md` | ADR-008 |
| MAT-14 | `05_Privacidade_Operacao/Qualidade_e_Validacao.md` | ADR-004 |
| MAT-15 | `06_ADRs/`, `07_Roadmap/Roadmap_e_Proxima_Fatia.md`, `07_Roadmap/Decisoes_para_Daniel.md` | todos |
| MAT-16 | `00_Inicio/Progresso.md`, `00_Inicio/Relatorio_Final_APP-001.md` | — |

## Voltar

[Home](Home.md) · [Progresso](Progresso.md)
