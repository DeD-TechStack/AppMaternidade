---
tipo: relatorio-final
status: em revisão
responsavel: Hermes (coordenador da APP-001)
revisado_em: 2026-10-22
tarefa: MAT-16
---

# Relatório final da APP-001

Segue o modelo `09_MODELO_RELATORIO_FINAL.md` do pacote da task.

## Resultado

**Status da task: concluída.** Os documentos estão prontos, o itsaplan está organizado e conferido, e o cofre está registrado e navegado no Obsidian normal. Ficam com Daniel a revisão das tarefas e as decisões D1 a D7.

**Data:** 22/10/2026, America/Sao_Paulo.

**O que foi entregue:**

- **Cofre:** 46 documentos Markdown, incluindo este relatório, sem contar os 6 da pasta de evidências. São design docs, oito ADRs (todos com status Proposta), roadmap com a próxima fatia, decisões para Daniel, pesquisa de oito concorrentes, quatro fichas de repositório, pesquisas de tecnologia, privacidade, comunidade e conteúdo, e os registros de execução das referências.
- **itsaplan:** projeto MAT com 26 tarefas, sendo 19 de trabalho e 7 decisões de Daniel, além de vínculos de dependência e um documento de estado.
- **Recomendação de arquitetura:** proposta, com alternativas e as condições que mudariam a escolha.
- **Código:** nenhum código de produto foi escrito. A implementação é a próxima etapa.

## Organização verificada

| Item | Valor | Como foi conferido |
| --- | --- | --- |
| itsaplan | http://localhost:3001/oficina/MAT. Equipe Oficina (teamId 1); projeto MAT, id 5, ref `oficina.MAT`; documento de estado id 9 | Relido com `list_issues` às 05:42: 26 tarefas, de MAT-1 a MAT-26 (o `get_project` foi conferido às 04:28). Às 06:57, as colunas 30 e 31 estavam vazias e o documento 9 foi para a versão 3 |
| Cofre | AppMaternidade, em `C:\Projetos\AppMaternidade\docs\AppMaternidade` | Listagem e checagem de links por script às 05:38: 51 arquivos .md, nenhum link quebrado e nenhum apontando para arquivo ignorado |
| Obsidian normal | **Cofre registrado por Daniel às 07:00:46.** Evidências: entrada `75cd70ea629fa64f` no `%APPDATA%/obsidian/obsidian.json`, com `open: true`; janela "AppMaternidade - Obsidian 1.14.4" no processo 24904, sem `--user-data-dir`, com os processos filhos em `%APPDATA%/obsidian`; pasta `.obsidian/` criada às 07:00:47, fora do Git. O cadastro da Oficina continua com o mesmo SHA-256 de antes (`5dec260f…`). Navegação conferida pelo `workspace.json` do cofre: Home às 07:11:55; ADR-002 às 07:12:03, depois ADR-003, ADR-001, ADR-007 e ADR-004; Roadmap e Decisões às 07:12:39; e o design doc Comunidade e moderação, aberto às 07:12:42. Há backup dos dois cadastros anteriores em `%TMPDIR%/appmat/` | Leitura dos cadastros, do título da janela e da pasta `.obsidian`, sem automação de interface |
| Home | `docs/AppMaternidade/00_Inicio/Home.md` | Mapa com todos os documentos |
| Recibos e progresso | `00_Inicio/Registro_Organizacao.md` e `00_Inicio/Progresso.md` | Checkpoints de 02:30 até o final da etapa |

Estado das tarefas às 07:14. A base é a releitura com `list_issues` às 05:42, mais os recibos das mudanças posteriores (MAT-15 às 06:24, MAT-16 às 06:57 e MAT-3 às 07:14). Às 06:57, uma nova leitura confirmou as colunas "Em andamento" e "A fazer" vazias.

- **Feito:** MAT-1, MAT-2 e MAT-3.
- **Esperando Daniel:** as decisões MAT-20 a MAT-26 (D1 a D7).
- **Em revisão:** MAT-4 a MAT-16.
- **Em andamento:** nenhuma.
- **Backlog, sem agente:** MAT-17 a MAT-19, a implementação futura.

## Proposta de produto e arquitetura

**MVP proposto (decisão D4):**

- **Público e alcance:** bebês de 0 a 12 meses, no Brasil, em pt-BR, com usuários adultos de 18 anos ou mais.
- **Rotina:** sete tipos de registro, sessões em andamento e histórico.
- **Cuidado compartilhado:** conta por pessoa, papéis, autoria e passagem de cuidados.
- **Desenvolvimento:** tummy time com atividades revisadas.
- **Comunidade:** só texto, com denúncia, bloqueio e painel de moderação.
- **Dados:** exportação e exclusão.
- **Fora do MVP:** anúncios e IA generativa respondendo a famílias.

Ver [Visão e escopo](../01_Produto/Visao_e_Escopo.md).

**Comunidade** ([Comunidade e moderação](../04_Comunidade_Conteudo/Comunidade_e_Moderacao.md), [ADR-006](../06_ADRs/ADR-006_Comunidade_e_Moderacao.md)):

- Fórum assíncrono em espaços curados, sem mensagem direta.
- Perfil público pseudônimo, sem nenhuma ligação com a família ou o bebê.
- Regras publicadas; denúncia, bloqueio, silenciar e o alerta "estou preocupada".
- Fila priorizada, ações graduais, apelação e auditoria.
- Protocolo de crise (CVV 188 e SAMU 192) e fluxo próprio para conteúdo envolvendo criança.
- Rodas ao vivo e mensagem direta ficam para etapas posteriores, condicionadas à capacidade de moderação.

**Tummy time e conteúdo** ([Desenvolvimento e conteúdo](../04_Comunidade_Conteudo/Desenvolvimento_e_Conteudo.md), [ADR-007](../06_ADRs/ADR-007_Conteudo_Educativo_e_IA.md)):

- Sessão registrada por qualquer cuidador, com autoria, funcionando offline.
- Sem meta, estrelas nem sequência de dias. As fontes divergem (AAP, OMS, Ministério da Saúde, Pathways, SBP), então nenhum número vira objetivo.
- Conteúdo próprio, revisado por profissional registrado, com versão e lista de retirada no aparelho.

**Stack recomendada (proposta):**

- **App:** React Native + Expo, decisão D1 ([ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md)).
  - O EAS leva o ciclo de iOS inteiro a partir do Windows, num fluxo integrado: build, assinatura, instalação no iPhone e TestFlight.
  - Flutter e KMP chegam ao TestFlight por CI macOS, com o pipeline montado à parte e a Live Activity em Swift.
  - Faz a Live Activity sem Swift (`expo-widgets`).
- **Dados:** Conjunto B, decisão D2 ([ADR-003](../06_ADRs/ADR-003_Backend_Persistencia_Autenticacao.md)).
  - Supabase (PostgreSQL e Auth) em São Paulo e PowerSync na região BR.
  - Serviço de domínio próprio em TypeScript, num container, que decide as escritas, os conflitos, as permissões e a revogação.
  - No aparelho, banco local cifrado (op-sqlite com SQLCipher).
- **Por que essa combinação:** o requisito mais difícil é a escrita offline com vários cuidadores e revogação. O PowerSync entrega a fila local e o download parcial, e o protocolo de escrita fica com o serviço próprio ([Comparação de arquiteturas](../03_Arquitetura/Comparacao_de_Arquiteturas.md), [Arquitetura proposta](../03_Arquitetura/Arquitetura_Proposta.md)).

**Alternativa principal:**

- Flutter para o app, se a equipe passar a ter Mac, ou aceitar CI macOS e Swift para a Live Activity, e a prova técnica favorecer Flutter ([ADR-002](../06_ADRs/ADR-002_Framework_Mobile.md)).
- Conjunto C (API e sincronização próprias) para os dados, se o PowerSync falhar na prova ou mudar de licença ou preço.
- O Conjunto A (Firebase) tem o menor custo de infraestrutura. Os limites documentados:
  - por padrão, a última escrita vence;
  - conflito explícito e operações de domínio exigem implementação adicional, dividida entre regras de segurança e funções no servidor;
  - a saída do Firebase é difícil;
  - mostrar a versão perdida depois de reiniciar o app ainda precisa de prova;
  - detalhes em [Comparação de arquiteturas](../03_Arquitetura/Comparacao_de_Arquiteturas.md), seção 4, e em [Offline](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md), seção 14.

**O que mudaria a recomendação:**

- ter um Mac disponível, ou aceitar CI macOS e Swift na Live Activity, com a prova favorecendo Flutter;
- falha do `expo-widgets` ou da acessibilidade na prova técnica;
- mudança de licença ou de preço do PowerSync;
- exigência de controle total da sincronização;
- custo de infraestrutura virar prioridade.

**Web** ([ADR-001](../06_ADRs/ADR-001_Plataformas_e_Web.md)):

- **Site público:** entra no MVP, com política de privacidade, exclusão de conta por link e suporte (exigências das lojas).
- **Painel interno:** entra no MVP, para moderação, conteúdo editorial e operação.
- **App web para famílias:** fica fora do MVP.

**ADRs:** ADR-001 a ADR-008, todos com status **Proposta**. Nenhum foi aceito.

**Custos ilustrativos** ([Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md)): preços de 22/10/2026, em USD.

| Fase | Sem PITR | Com PITR |
| --- | --- | --- |
| Prova técnica | ~US$ 8/mês | — |
| Fundação e MVP | US$ 110 a 150/mês | — |
| Piloto com cerca de 100 famílias | US$ 120 a 180/mês | US$ 220 a 280/mês |

Planos gratuitos pausam por inatividade e não servem para produção. Assinatura pessoal de IA não é crédito de API.

## Pesquisa e validação

| Item | Evidência | Limite |
| --- | --- | --- |
| Concorrentes | Oito fichas em `08_Referencias/Concorrentes/`, com tabelas de fontes datadas de 22/10/2026; síntese em [Concorrentes e diferenciais](../01_Produto/Concorrentes_e_Diferenciais.md) | Só fontes públicas; nenhum app instalado. No Napper, tummy time "não encontrado nas fontes consultadas", o que não prova ausência. Diferenciais DF-1 a DF-7 são hipóteses |
| Repositórios | Finnberry `5e17b1a`, Baby Buddy `09629cf`, Sprout Track `eb26949` e Bebbo `5ec8c89`, com permalinks nas fichas; síntese em [Análise dos repositórios](../08_Referencias/Analise_dos_Repositorios.md) e [Licenças e fontes](../08_Referencias/Licencas_e_Fontes.md) | Testes rodaram em três projetos; dois apps rodaram localmente (Baby Buddy e Sprout Track). Finnberry e Bebbo não foram iniciados; o Bebbo não tem testes e não foi compilado (sem SDK Android e sem macOS). Isolamento por família tratado só como pergunta de auditoria |
| Organização | IDs e recibos em [Registro da organização](Registro_Organizacao.md); 26 tarefas relidas às 05:42 | Obsidian registrado por Daniel e navegação conferida às 07:12 |
| Provas técnicas | **Nenhuma executada.** As provas P1 a P9 estão planejadas em [Qualidade e validação](../05_Privacidade_Operacao/Qualidade_e_Validacao.md) para a MAT-17 | Plano não é teste |
| Revisão independente | Codex CLI com gpt-6-astra (max), somente leitura, de 05:39 a 06:07 (MAT-16): 8 achados, 5 médios e 3 baixos, todos corrigidos | Sem internet. Conferiu os documentos, não o produto. Ver "Revisão independente" |

## Decisões para Daniel

Texto completo em [Decisões para Daniel](../07_Roadmap/Decisoes_para_Daniel.md). Para responder, basta escrever "D1: A", por exemplo, aqui ou na tarefa correspondente.

| ID | Tarefa | Decisão | Recomendação | Reversível | Antes de |
| --- | --- | --- | --- | --- | --- |
| D1 | MAT-20 | Framework mobile | React Native + Expo | Sim, até a fundação | Prova técnica |
| D2 | MAT-21 | Dados, backend e região | Conjunto B, com dados no Brasil | Sim, até a fundação; depois, troca do PowerSync sem mudar o banco | Prova técnica |
| D3 | MAT-22 | Quem publica e contas nas lojas | Pessoa jurídica (precisa de validação jurídica) | Parcialmente | Primeiro build em iPhone |
| D4 | MAT-23 | Recorte do MVP | 0 a 12 meses, Brasil, 18+, comunidade só texto, sem IA generativa e sem anúncios | Sim | Fundação |
| D5 | MAT-24 | Pessoas para conteúdo, moderação e jurídico | Revisor registrado, 1 ou 2 moderadores e consultoria LGPD e ECA Digital | Sim | Abrir conteúdo e comunidade |
| D6 | MAT-25 | Monetização | Em aberto; nunca anúncios com dados de rotina | — | Piloto público |
| D7 | MAT-26 | Registros de testes de acesso em projetos de terceiros | Manter fora do Git e, se Daniel quiser, avisar os mantenedores em particular | A e B sim; C não | Primeiro push do repositório |

## Próxima task proposta

**MAT-17, prova técnica, seguida da MAT-18, fundação e primeira fatia de cuidados.** Ver [Roadmap e próxima fatia](../07_Roadmap/Roadmap_e_Proxima_Fatia.md). Nada disso está implementado.

**Prova técnica:** valida a stack escolhida com as provas P1 a P9, em código descartável. Depende de D1, D2 e D3.

**Escopo da primeira fatia:**

1. conta por código de e-mail;
2. família, bebê e convite de uso único, com validade de 7 dias;
3. sessão de tummy time offline, com encerramento por outro cuidador;
4. fila local, envio idempotente, estados visíveis e histórico com autoria;
5. revogação com limpeza local;
6. se couber, um espaço da comunidade para provar a separação de dados.

**Critérios de aceite:** A1 a A11. Exigem:

- aparelhos físicos;
- modo avião;
- 200 ciclos sem duplicata;
- encerramento por outro cuidador, com os dois autores no histórico;
- revogação offline;
- ids de outra família;
- testes de fuso;
- logs sem dados sensíveis;
- revisão independente.

**Pré-requisitos:**

- um Android e um iPhone físicos;
- conta Apple Developer (US$ 99/ano) e Google Play Console (US$ 25 uma vez);
- build iOS via EAS;
- backend de desenvolvimento com dados fictícios.

Abrir contas e contratar serviços é decisão de Daniel.

## Revisão independente

**Primeira rodada:**

- **Rota:** Codex CLI 0.163.0, gpt-6-astra com esforço max. Rodou em sandbox read-only, sem busca web e em sessão efêmera.
- **Quando e sobre o quê:** de 05:39:35 a 06:06:58, sobre um manifesto sha256 de 54 arquivos: o cofre e o pacote da task, sem os registros da D7.
- **Veredito:** CHANGES_REQUIRED, com 8 achados: 5 médios, 3 baixos e nenhum alto.
- **Cobertura dos critérios:**
  - 28 atendidos e 12 parciais, todos ligados aos achados abaixo ou aos limites desta etapa;
  - 2 bloqueados: o registro e a navegação no Obsidian (D-04 e D-06), que o revisor considerou registrados com honestidade. Os dois foram resolvidos depois: Daniel registrou o cofre às 07:00:46, e a navegação foi conferida às 07:12.
- **O que o revisor não encontrou:**
  - declaração de conformidade legal;
  - cota gratuita tratada como permanente;
  - meta clínica própria;
  - isolamento de terceiros apresentado como vulnerabilidade demonstrada.
- Os oito ADRs continuam como Proposta.

O coordenador aceitou os 8 achados e os corrigiu entre 06:07 e 06:23:

| ID | Severidade | Problema apontado | Correção |
| --- | --- | --- | --- |
| F01 | média | D2, a comparação e o ADR-003 davam US$ 101/mês ao conjunto recomendado, sem o serviço de domínio | Valores refeitos pela composição de [Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md), seção 2: US$ 108 a 126 com 100 famílias, sem PITR e sem homologação. A comparação mostra "com o serviço" e "só infraestrutura" |
| F02 | média | O Expo aparecia como a única forma de fechar o iOS sem Mac | ADR-002, D1, a comparação, este relatório e a nota de plataformas passam a comparar EAS e CI macOS. A preferência se apoia no fluxo integrado e na Live Activity sem Swift; o limite de depuração sem Mac ficou explícito |
| F03 | média | A análise e duas fichas pediam uma sessão ativa única no banco, contra o protocolo offline, que aceita sessões paralelas | Política única, a de [Offline](../03_Arquitetura/Offline_Sincronizacao_e_Temporizadores.md), seções 7.2 e 8. Sessões paralelas são aceitas e marcadas para unir. Só "fim antes do início" é recusado; o resto vira aviso. A análise e as fichas do Finnberry, do Sprout Track e do Baby Buddy foram alinhadas |
| F04 | média | Comunidade e moderação punha denúncia, moderação e painel na MAT-18; o roadmap põe isso na MAT-19 | Comunidade e moderação e a seção 13 de Privacidade foram alinhadas ao roadmap. Na MAT-18 fica só a prova de separação, se couber; moderação e painel ficam na MAT-19 |
| F05 | média | "Não encontrada nas fontes" virou "não têm comunidade" | O resumo, o DF-1, Comunidade, o ADR-006 e a ficha da Pathways passam a dizer "não identificada nas fontes consultadas". A matriz ganhou legenda, e o Kinedu aparece como o mais próximo dos quatro pilares |
| F06 | baixa | O efeito do bloqueio para a pessoa bloqueada estava ambíguo | Regra mútua, nos dois sentidos, em Comunidade, no Q-11 e em Fluxos. Os motivos de denúncia em Fluxos agora seguem a seção 7 de Comunidade |
| F07 | baixa | As dependências do Sprout Track não tinham sido levantadas | Levantadas pelo `package-lock.json`: 520 entradas de produção e 23 pontos a conferir ([Licenças e fontes](../08_Referencias/Licencas_e_Fontes.md); lista em `09_Evidencias/Execucao_Referencias/Sprout_Track/13_licencas_dependencias.tsv`) |
| F08 | baixa | O aceite A4 não testava o encerramento por outro cuidador | Novo aceite A11 no [Roadmap](../07_Roadmap/Roadmap_e_Proxima_Fatia.md): o responsável inicia, o cuidador encerra e o histórico guarda os dois autores. O A4 deixou de citar o Q-03 |

**Limites desta revisão:**

- **Links:** o revisor conferiu 577 links internos sem alvo faltante, mas não conferiu 88 destinos fora do manifesto. Às 06:23, o script do coordenador conferiu os 691 links relativos do cofre: nenhum quebrado e nenhum, a partir de arquivo versionado, apontando para arquivo fora do Git.
- **URLs externas:** não foram reabertas. A revisão rodou sem internet, e as fontes são datadas.
- **Relatório final:** este relatório estava fora do manifesto, porque foi escrito depois do início da rodada.

**Segunda rodada:**

- **Rota e quando:** a mesma rota, de 06:24:07 a 06:39:42, sobre um manifesto de 33 arquivos: os 23 alterados, as referências e os arquivos 06 e 09 do pacote. Releu os 8 achados e este relatório.
- **Veredito:** CHANGES_REQUIRED, com 8 achados: 3 médios, 5 baixos e nenhum alto.
  - Quatro são resíduos de F01, F02, F04 e F06, em notas de pesquisa e neste relatório.
  - Quatro são novos, F09 a F12.
- **Cobertura:**
  - atendidos: F03, F05, F07, F08 e a estrutura do relatório pelo modelo 09;
  - parciais: F01, F02, F04, F06 e a fidelidade do relatório ao cofre.
- Os 33 hashes conferiram, e nenhum arquivo proibido foi lido.

Correções do coordenador, entre 06:40 e 06:43:

| ID | Severidade | Problema apontado | Correção |
| --- | --- | --- | --- |
| F01-R2 | baixa | A nota de preços não dizia que o Conjunto B dela exclui o serviço de domínio | Nota abaixo da tabela 10.2 e item novo em 10.4, com link para [Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md), seção 2 |
| F02-R2 | média | Restos de "só com Mac" no resumo da nota de plataformas, nos requisitos do Flutter, no total mínimo, na condição de mudança da comparação e neste relatório | Esses textos e a D1 passam a separar build e distribuição por CI macOS da criação e depuração da extensão no Xcode |
| F04-R2 | baixa | A pesquisa de comunidade ainda punha denúncia, moderação e painel na fundação | Linha marcada como superada, com nota que remete ao roadmap e à seção 4 de Comunidade e moderação |
| F06-R2 | baixa | A pesquisa de comunidade ainda descrevia o bloqueio num sentido só | Marcado como superado pela regra mútua da seção 7 de Comunidade e moderação |
| F09 | média | Este relatório invertia a ordem: "MAT-17 depois da MAT-18" | Corrigido para "MAT-17, seguida da MAT-18" |
| F10 | média | Este relatório dizia que o Firebase "tira o protocolo de escrita do nosso controle" | Trocado pelos limites documentados: a última escrita vence por padrão, há implementação adicional entre regras e funções, a saída é difícil e falta uma prova |
| F11 | baixa | Em 10.000 famílias, o Conjunto B com o serviço não fechava com a soma da pesquisa | A composição canônica ganhou a linha de excedentes de banco, arquivos e PowerSync, de ~US$ 12 em 10.000 famílias. Com ela, o subtotal fica em US$ 238 a 298 e a fase de crescimento em US$ 250 a 350, com homologação. A comparação e o ADR-003 foram atualizados |
| F12 | baixa | A contagem de documentos (45) deixava de fora este relatório | Agora são 46, incluindo o relatório e sem as evidências |

**Terceira rodada:**

- **Rota e quando:** a mesma rota, de 06:45:10 a 06:55:41, sobre 13 arquivos. Os hashes conferiram e nenhum arquivo proibido foi lido.
- **Veredito:** APPROVED_WITH_LIMITS.
- **Cobertura:**
  - 8 atendidos: F01-R2, F02-R2, F04-R2, F06-R2, F09, F10, F12 e a seção de revisão deste relatório;
  - 2 parciais: F11 e os números canônicos de custo, os dois pelo mesmo motivo do achado abaixo.
- **Achado único:** F11-R3, de severidade baixa. Os ~US$ 12 de excedentes saíam por diferença e não se reproduziam pelos componentes. Pelas fórmulas, a soma dá ~US$ 7,44.
  - **Correção, às 06:56:** [Custos e operação](../05_Privacidade_Operacao/Custos_e_Operacao.md), seção 2, e [Preços datados](../08_Referencias/Tecnologias/Precos_Datados.md), seção 10.2, ganharam a memória por componente: banco US$ 5,25, arquivos US$ 0,94 e PowerSync US$ 1,25.
  - Os ~US$ 4,56 restantes ficaram registrados como diferença não reproduzível da nota, mantida como margem conservadora. Os totais não mudaram.
  - Essa última correção não passou por nova rodada.

**Situação final da revisão:** nenhum achado alto em três rodadas. Os 17 achados médios e baixos foram corrigidos, e o último foi documentado como limite. A revisão conferiu documentos, não o produto. Fontes externas não foram reabertas.

## Bloqueios

| Desde | Ação tentada | Ferramenta | Resultado real | Preservado | Menor intervenção |
| --- | --- | --- | --- | --- | --- |
| 22/10 02:58; seletor aberto às 03:12:45 | Registrar o cofre no Obsidian normal clicando em "Abrir pasta como cofre" | `computer_use` | "BLOCKED, not run; the user did NOT consent, do not retry or reach the same outcome another way" | Seletor do Obsidian normal aberto (PID 24904); backups dos `obsidian.json`; nenhuma edição manual de configuração | **Resolvido:** Daniel registrou o cofre às 07:00:46. A Home, um design doc e ADRs foram abertos no aplicativo às 07:11 e 07:12 (critérios D.42 a D.44), conferidos pelo `workspace.json` do cofre |
| 22/10 03:14 | Execução e análise de Finnberry, Sprout Track e Baby Buddy por subagentes | `delegate_task` | "content_policy_blocked: This request triggered restrictions on violative cyber content and was blocked under Anthropic's Usage Policy." | Registros já gravados no cofre | Contornado de forma legítima: fichas só por leitura de código; testes de acesso abandonados (D7) |
| 22/10, várias vezes, de 04:30 a 05:25 | Redatores e fichas por subagente | `delegate_task` | "Provider has been unresponsive (no response received) for 5 consecutive stale attempts — aborting this call…" | Logs das tentativas em `hermes/cache/delegation/live/` | Contornado: o coordenador escreveu os documentos. Nenhum documento ficou faltando |
| — | Decisões D1 a D7 | — | Aguardando Daniel | MAT-20 a MAT-26 | Comentar na tarefa ou responder aqui |

## Modelos e papéis usados

| Papel | Rota | Modelo | Resultado consumido |
| --- | --- | --- | --- |
| Coordenador | Hermes, perfil default | claude-opus-5-5[1m] | Organização, síntese, maior parte dos documentos finais e revisão de coerência |
| Pesquisa inicial (10 subagentes, 02:54) | `delegate_task` | claude-opus-5-5[1m] | Fichas de concorrentes, notas de tecnologia, privacidade, comunidade e conteúdo, preços datados e a ficha do Baby Buddy. Quatro tarefas caíram (filtro ou provedor) |
| Redatores e fichas (03:48 a 05:25) | `delegate_task` | claude-opus-5-5[1m] | Nenhum documento final. Todas as tentativas caíram por falta de resposta do provedor. Aproveitei só o índice de evidências do Finnberry, os logs 06 e 07 dele e, do Bebbo, a lista de licenças das dependências |
| Revisor independente | Codex CLI 0.163.0, somente leitura | gpt-6-astra, esforço max | Veredito e 8 achados, todos aceitos e corrigidos. Ver "Revisão independente" |

## O que não foi feito ou testado

- Nenhum app, protótipo ou prova técnica do AppMaternidade.
- Nenhum teste com usuários.
- Nenhuma validação jurídica: privacidade, lojas e ECA Digital são propostas a validar.
- Nenhum preço das regiões do Brasil confirmado.
- Sem commit e sem push: o repositório continua sem commits, e o remoto é público. A D7 precisa de resposta antes do primeiro push.
