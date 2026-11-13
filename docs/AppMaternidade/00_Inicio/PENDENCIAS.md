---
tipo: pendencias
responsavel: lider-appmaternidade
revisado_em: 2026-11-13
regra: kanban-leader-cycle, seção 0 "Lista durável de pendências"
---

# Pendências do AppMaternidade

MANDATO (Daniel, 05/11/2026; visual refeito em 11/11): o site inteiro funcionando de ponta a ponta (RF-01 a RF-14), com o visual Campo de mel aprovado em 11/11, publicado para o professor entrar e usar tudo com dados fictícios. Fonte: [Retomada do site](Retomada_Site.md), seção "Roteiro do site completo".
ESTADO: ATIVO (13/11 ~19h: foco total, até 8 cartões no board; frente principal = item H dividido por área; P-54/P-55/P-56 em paralelo; polimento por página CONGELADO; publicação e push na main só com o "pode", P-19). Estado vigente no bloco RETOMAR abaixo.

Retomada 13/11 (sessão nova): cron `retorno-oc` (cacefbc1849d) retomado; P-50 t_2af603f6 reduzida a C-1/C-3/C-4 (comentário 711; C-2/C-5/C-6 e todo espaço/ritmo vão para o H); POL-ABR t_d04a8a7d estacionada e congelada (comentário 712). Medidas do H em `C:/OrchestrationLab/projetos/_staging/appmaternidade/HARMONIA/MEDIDAS.md` (caminho dado por Daniel em 13/11; todo cartão de spec ou de tela cita esse arquivo, regra `portao-medidas`).

Retomada 12/11 ~01h15 (sessão nova do líder): cron `retorno-oc` retomado; 37b g3, POL-DES, POL-TXT v2 e POL-INI v2 voltaram a rodar. A 38a saiu da triage pelo sucessor **t_197241f9 (MAT-38a g2)**, sobre a base `base/38a-g2` = 4c4b1d4 (a mesma árvore de 1542137, com o merge local a46e42c refeito no título aceito, "Traz o int/refazer para a 38a"; `verificar-commits c7142bb..4c4b1d4` OK, 322); decisões D3 (o medidor entra logado nas rotas /app) e D4 (commits) no corpo; 38b e 39b religadas a ele; t_f7bdf7e8 arquivada. A 40b espera o retorno do `.oc/2` pelo cron.

## RETOMAR (escrito em 13/11 ~19h, atualizado a cada marco; vale para uma sessão NOVA do líder)

**Diretivas de Daniel em vigor:**
- 12/11 (GALERIA_ATUAL): falta harmonia; o polimento por página está CONGELADO; a frente é o item H.
- 13/11 ~16h40 (t_99ba9793): H-3 dividido em cartões por área.
- 13/11 (chat): "abra quantas frentes forem necessárias".
- 13/11 ~18h50 (t_ed69e09b): foco total no AppMaternidade; teto do host de 10 (o board aceita 8, `max_spawn`); abrir toda frente independente com spec pronta, priorizando fechar o site; laço repetido de teste intermitente com no máximo 2 suítes em paralelo; disco C ≥ 25 GB livres; pausa (desligar o PC) pode vir a qualquer hora.

**Ramo:** `origin/int/refazer` = **d8287bf3edf5504a98ec5e2cce1524ad0cf58d7c** (P-54, ff sobre 3c03656). Integrações de 13/11, com recibo em cada cartão:
- 40c a003fe4;
- 39b fcf47fc;
- P-50 0f35191 (ff);
- H-2 2a55145;
- MAT-48f 3c03656.

`main` intocada (P-19). Worktree de integração: `.worktrees/_int40a`, em 3c03656, limpa; logs em `.oc/lider_verif/`. O checkout principal só tem commits locais de registro (docs), sem push.

**Item H** (specs em `C:/OrchestrationLab/projetos/_staging/appmaternidade/HARMONIA/`: MEDIDAS.md, SPEC_H.md v3, SPEC_H3.md v2, cartoes/H3_COMUM.md):
- H-2: integrada. Utilitários com prefixo `esp-`, como `p-esp-secao`.
- H-3a **t_e9313367**: rodando (primitivas, casco, /sistema, `medir_h.js`, leitura 640).
- Áreas, filhas da H-3a, entram juntas quando ela integrar:
  - H-3b t_b4446ca7 Início;
  - H-3c t_04e1a709 páginas públicas;
  - H-3d t_5866d349 Acesso e Conta;
  - H-3e t_b8d3d400 Rotina;
  - H-3f t_e72eacf8 Comunidade/Desenvolvimento logado/Moderação.
- H-3g **t_b27d2b91**: lint bloqueante, CSS comum, `PEDIDOS_COMUNS.md`, medida das 9 rotas.
- H-4 **t_e53dea70**: números → replica-diff → juízes → `HARMONIA/trabalho/h4/GALERIA.html` para Daniel.

**Estado dos cartões (13/11 ~21h, troca de sessão pedida pela infra, t_19ee8097):**
- **H-3a t_e9313367:** feito em 526a75c; o líder autorizou 2 testes (680→640) e o `--base 3c03656` (comentário 784); vai pedir revisão. Ao integrar: soltar H-3b..f e QA-F1 t_e983505a.
- **Em revisão** (integrar na aprovação; conferir as linhas +/− contra o revisado):
  - P-54 t_0dc61db7 (179e84f);
  - P-55 t_6544886b (só relatório);
  - P-56 t_506d9c94 (só relatório);
  - QA-F3 t_b12ec1f4 (1d774bb; o comentário 781 foi para a A11Y-F2, 785/786).
- **Rodando:**
  - QA-F2 t_1dcaa165 (Rotina);
  - MAT-48g t_0bfed15d (sem código; se aceita, fechar sem integrar).
- **Esperando o pai:**
  - A11Y-F1 t_35476306, depois da QA-F2;
  - A11Y-F2 t_a37f1086, depois da QA-F3;
  - QA-F1 t_e983505a, depois da H-3a;
  - H-3b..f, depois da H-3a;
  - H-3g t_b27d2b91, depois das áreas;
  - H-4 t_e53dea70.
- **Spec RF-12:** `_staging/appmaternidade/RF12/SPEC_RF12.md` v1 em rascunho (faixa grande, RF12:RF-01..17 e RN-01..07, premissas P1-P6 à vista de Daniel). Explique de volta R1 por outra família (codex gpt-6-astra) FEITO: **Blocker 0, Major 8, Nit 4** (`RF12/EXPLIQUE_R1_codex.md`). PRÓXIMO PASSO da sessão nova: corrigir os 8 Majors na spec (v2) e rodar o painel EGM. Depois: corrigir, rodar o painel EGM (7 revisores + síntese, portão completo) → APROVADA → cartões I-RF12-1 → I-RF12-2 → J-RF12-1.
- **P-54 t_0dc61db7:** INTEGRADA (ff d8287bf, check 2944, commits OK 440, recibo 793). `origin/int/refazer` = **d8287bf3edf5504a98ec5e2cce1524ad0cf58d7c**.
- **Decisões de Daniel em aberto:** P-74 RF-12 (padrão: fazer), P-75 RF-14 (nada começa sem ele), P-76 "Revisão pendente" (padrão: manter).
- **Relatórios:** `C:/OrchestrationLab/projetos/_staging/appmaternidade/PRE_LANCAMENTO/QA/RELATORIO.md` e `.../A11Y/RELATORIO.md`.

**Regras de integração (sem exceção):**
- `INTEGRANDO` no cartão.
- No `_int40a`: ff, ou merge `--no-ff` com conferência de que as linhas +/− são iguais às revisadas.
- `npm ci`, check, `verificar-commits c7142bb..HEAD`.
- Push com o SHA completo para `refs/heads/int/refazer`.
- Recibo no cartão em forma de sinal (sinal | esperado | observado | observador).
- Soltar os filhos que esperam (eles bloqueiam como `transient` até a integração).

**Atalhos e contornos deste host:**
- O `preparar_oc.py` já não marca como tela os cartões só de teste ou de dados (infra, t_830d0730, equipe 2ec5bc7); há também `--sem-tela`. Não editar o `opencode.json` à mão.
- Sair da triage: PATCH pelo browser (memória).

**Como pausar:**
- `block --kind needs_input "[decisor: Daniel] pausa"` nos cartões que aceitam.
- `hermes cron pause cacefbc1849d`.
- Atualizar este bloco.

**Na retomada:**
- `hermes cron resume cacefbc1849d`.
- Ler o board.
- Soltar os cartões.

## RETOMAR anterior (12/11 ~07h50; histórico, não usar como estado)

**Pausa de 12/11 (Daniel, ~07h45):** pausar tudo num ponto seguro; Daniel volta em alguns dias (a cota do GPT está no fim, e as revisões falhariam). Nada foi apagado; worktrees e trabalho sem commit ficam como estão.

**Diretiva anterior, que continua valendo (t_64dcb622, depois de ver `_staging/appmaternidade/GALERIA_ATUAL/index.html`):** a base está boa, mas o site não passa a essência de site avançado do Pato Jack e da Becky/Good Inside; o espaçamento entre os elementos não agrada e falta a harmonia deles; as voltas de polimento por página não convergem. Diagnóstico do coordenador: `DIRECOES_20261111/rodada2/ANALISE_FEATURES.md` mediu cores, fontes, raios e sombras, mas nunca o sistema de espaçamento (padding de seção, vão entre blocos, larguras de contêiner, ritmo vertical, comprimento de linha); a escala de espaço do DESIGN.md foi posta sem medir; o passo 1 do `replica-design` foi pulado e o `replica-diff` nunca foi usado. **Polimento por página CONGELADO** (P-48, P-49, P-51 e POL-ABR substituídos pelo item H).

Como a pausa foi feita: `block --kind needs_input "[decisor: Daniel] pausa de 12/11"` nos cartões que aceitavam (a 39b caiu em **triage** por laço de bloqueio, como a 38a em 11/11); os `scheduled` com OC_RUN ficaram `scheduled`; o cron `retorno-oc-appmaternidade` (**cacefbc1849d**) foi **pausado**. Na retomada: primeiro `hermes cron resume cacefbc1849d`, depois soltar os cartões. Saída da triage neste host: PATCH em `/api/plugins/kanban/tasks/<id>?board=appmaternidade` com `{status:'ready', assignee}` pelo browser em 127.0.0.1:9119 (header `X-Hermes-Session-Token`); `unblock` não tira de triage.

Estado do ramo: `origin/int/refazer` = **9091c1318f76b98c69898cd5fe29a17a2f97610d** (10 integrações em 12/11: 38a g2 7509958, POL-DES v1 da39492, POL-TXT v2 93517e4, POL-INI v2 c9e3580, 40b 48ba136, POL-DES v2 cb9e1e1, 39a g2 eebd1c5, MAT-48e 4010bbb, 37b g3 c7f26cc, 38b 9091c13; recibos nos comentários de cada cartão). `main` não foi tocada (P-19 espera o "pode"). Worktree de integração `.worktrees/_int40a`, destacada em 9091c13, limpa. O checkout principal tem só commits locais de registro (docs), sem push.

Por cartão aberto (worktree em `C:/Projetos/AppMaternidade/.worktrees/<id>`):
- **t_ec79b067 MAT-40c** (defeitos da moderação a 390/200% e hover): **done, APPROVED_WITH_LIMITS em 5ff67f6d063d10b6f82a7dfdb9ad70455a159ced, falta integrar** (1º passo da retomada). Ramo `wt/t_ec79b067`, limpo; contém 4010bbb, não 9091c13; `merge-tree` contra o int sem conflito. Passo: em `_int40a`, merge "Integra o int/refazer na 40c aprovada", conferir que o diff é o revisado, `npm ci`, check, `verificar-commits c7142bb..HEAD`, segredos, autores, INTEGRANDO/push/RECIBO; rodar de novo `trabalho/40c/regressao/regressao40c.mjs` (GREEN). A revisão precisa de GPT só se algo voltar.
- **t_c9529365 MAT-39b** (tummy time): **triage** (pausa). Ramo `wt/t_c9529365` em **683a548**, limpo, não contém 9091c13 (merge-tree sem conflito). Revisão R2 (comentário do revisor, `workspaces/t_c9529365-review-478/REVIEW.md`): CHANGES_REQUIRED só por **R1 residual [HIGH]** em `PaginaDesenvolvimento.tsx:45-48`: a segunda revogação seguida não volta a invalidar o contexto (o ref relido é permanente; reprodução em `review-repeat-access.test.tsx` da mesma pasta). Próximo: correção **2/2, a última**: permitir nova invalidação quando a família/contexto mudar, com proteção contra laço; testar as duas revogações, remoção de bloco/grade, estado Sem família e foco no h1; não editar `rotina*`/fixtures; merge do int antes de pedir revisão. O worker que tinha acabado de começar (07h45) foi encerrado sem sujar o worktree.
- **t_ca45d30f P-60** (evidência da 37b g3: teclado do primeiro bebê, B1-B9, D3, tabela de estouros, rótulo da Família, G4/G5/G7): **blocked** (pausa), sem código. O worker parou num ponto seguro às 07h48: `trabalho/37b/evidencia_pendente/HANDOFF_PARCIAL.md` (todos os itens E-37-1 a E-37-6 já rodaram; faltam só LEITURA.txt com os sha256 das capturas novas, SHA256SUMS e a revisão final do texto); worktree limpo, slot do banco parado (`encerramento_dbstop.txt`), nenhum processo e nenhum contêiner supabase. Desvio de ferramenta: `isolar_supabase.py` não tem o slot 60 e o worker usou uma réplica local `scripts/isolar60.py` (deslocamento +10000); na retomada, decidir se o slot 60 entra na tabela da ferramenta. Próximo: soltar o cartão para fechar os arquivos e pedir revisão.
- **t_2af603f6 P-50** (casco: C-1 link de pular, C-2 cabeçalho com 6 itens, C-3 fonte 200% a 390, C-4 alvos noturnos na Rotina, C-5 rodapé, C-6 itens comuns): `scheduled` com OC_RUN `.oc/1` (o OpenCode pode terminar sozinho; o cron pausado não acorda o cartão). Base 9091c13. Decisão para a retomada: C-1, C-3 e C-4 são defeitos de acessibilidade e ficam; C-2, C-5 e C-6 tocam espaço e ritmo e devem esperar o item H. Se o H começar antes, reduzir a P-50 a C-1/C-3/C-4 por comentário.
- **t_d04a8a7d POL-ABR** (aberturas das páginas de texto): **estacionado** (`scheduled` sem OC_RUN, motivo "PARKED by Daniel's directive"; OpenCode encerrado). Worktree com 7 arquivos sem commit da rodada `.oc/1`; preservar. Não retomar; `POLIMENTO/DEVOLUCAO_POL_aberturas.md` vira insumo do H.
- **t_1757260d MAT-37g** (Entrar com Google): `scheduled`, espera Daniel (P-16). Não mexer.
- Juízes `pol_conta_r1` (Acesso e Conta, c7f26cc, 16 recortes): com o Fable refeito, os dois valeram e **1 de 16 passa** (`juizes/rodadas/RESULTADO_POL_conta_r1.md`; a tentativa 1 do Fable, inválida, está em `juiz_fable_tentativa1.json`). É a medida de Acesso e Conta antes do H; não abrir POL-CONTA.

**Próxima frente: H, sistema de harmonia** (pedido de Daniel; substitui o polimento por página). Ordem:
1. Medir com `getComputedStyle` (navegador real, o passo 1 do `replica-design`) o sistema de espaçamento do Pato Jack e da Becky/Good Inside, em páginas equivalentes (início, página de conteúdo, formulário), a 1440 e 390: padding vertical de seção, vão entre blocos e entre título e texto, larguras de contêiner e de coluna de leitura, comprimento de linha, escala de tipos (tamanho e entrelinha por nível), ritmo vertical. Saída: tabela com números e capturas em `DIRECOES_20261111/HARMONIA/MEDIDAS.md`. Cartão [doc], sem código.
2. Derivar a escala de espaço e a de tipo do Campo de mel e escrevê-las em `web/DESIGN.md` com a skill `design-md` (regra de uso: qual token em qual vão).
3. Aplicar de forma global **em um cartão**: tokens, `index.css`, `styles/**`, casco e componentes base, e as páginas trocam valores soltos pelos tokens.
4. Conferir com `replica-diff` contra as referências antes dos juízes; depois os juízes e a galeria antes/depois para Daniel.
`idempotency_key` H-<passo>:<papel>:g1.

Depois do H: integração final em `int/refazer`, passeio RF-01 a RF-14, as 4 checagens P-55 a P-58, a evidência pendente que sobrar, a galeria final (P-52) e o "pode" de Daniel (P-19). Decisões de Daniel já dadas em 12/11: o Gmail do Contato fica por enquanto e troca antes de divulgar (P-63); ele ainda não aceitou as páginas públicas (a diretiva do H veio depois); a limpeza das worktrees espera "pode limpar".

Regras e ferramentas que valem: madrugada só na Rotina (R38-04, `componentes/rotina/madrugada.ts`); a captura compartilhada `ferramentas/captura/capturar.mjs` + `cdp.mjs` usa DSF 2 real desde 12/11 (antes as cenas saíam borradas para os juízes, por erro da ferramenta; com a correção, Como funciona/Cuidado/Desenvolvimento foram de 2/15 a 10/15, o Início de 4/10 a 6/10, as páginas de texto ficaram em 0/13); o medidor `web/scripts/medir-dom.mjs` mede o rótulo de botões de opção e acha a lua no menu a 390 (MAT-48e), e ainda falta dizer "não se aplica" para madrugada em rota /app/ fora da Rotina. Juízes: `juizes/preparar.py <rodada> <capturas>`, `rodadas/<rodada>/rodar_juizes.sh`, `juizes/resumir.py`. Teste intermitente conhecido sob carga: `exportacoes.test.ts` (timeout de 5 s) passa sozinho.

Limpeza pendente (aprovação expirou às ~17h40 de 11/11 e de novo às 02h17 de 12/11, não repetir sem Daniel dizer "pode limpar"): worktrees `t_ee893936` (e o ramo `wt/t_ee893936`), `t_8c0b72d8`, `t_890d1590`, `_intPOLINI`, `t_8c0b72d8_base` e os `claude_pids` desses cartões; somam-se os já integrados em 12/11 (t_197241f9, t_89539427, t_736b76c5, t_9e230273, t_359ab800, t_3fd302a6, t_30ad7504, t_54fc85f7, t_6aeda4a9, t_7c491177) e os de evidência fechados (t_bc1629ca, t_89840cb9, t_61cd86f9, t_2045f1be). `_int40a` fica: é a worktree de integração. Listar com `ferramentas/limpar_wt.py` (sem `--aplicar`).

Paralelo (Daniel, 05/11): até 5 cartões por projeto; só fica em série o que tem dependência real. **Atualizado (Daniel, 11/11 ~16h20, resposta t_627d5a0a): até 8 cartões rodando neste board** quando acelera o mandato (teto do host 10); preferir mais cartões em paralelo a sessões longas; sem frente de pesquisa.

Plano paralelo (11/11 17h15): rodando 37b (revisão), 40a (correção 2/2), 38a (correção 1/2, com merge), POL-INI, POL-TXT e POL-DES = 6. Ao fechar a 37b: P-48 (Acesso e Conta) e P-50 (casco). Ao fechar a 40a: 40b. Ao fechar a 38a: 38b e 39b juntas, e P-49 depois da 38b. Só a integração é serial. **ETA pronto para publicar: ~22h** (18h10, com a regra da evidência pendente, que corta voltas de revisão: **~21h30**) (38a integrada ~19h, 38b/39b/40b ~20h30, integração final e passeio ~21h15, checagens P-55 a P-58 ~22h).

Legenda: `[ ]` aberto · `[~ t_id]` em cartão · `[D]` espera Daniel · `[x SHA]` feito. O id `P-nn` não muda. Em toda wake sem cartão `ready`, `running` ou em revisão, o líder abre no mesmo turno o próximo `[ ]` (spec ou cartão), ou marca `[D]` ou PAUSA.

## Caminho crítico até o MANDATO (11/11 12h30; ETA por item, com 5 cartões rodando)

1. 49b g2 t_606fb2fb aprovada e integrada em `int/refazer` | ~13h15
2. 37r t_d63c932a (volta R1 da revisão) aprovada e integrada | ~14h15
3. 38a t_f7bdf7e8 e 37b t_11ad28e6 em paralelo, sobre 1 e 2 | ~16h45
4. 38b t_7c491177 e 39b t_c9529365 sobre a 38a (39b também sobre a 36r-A) | ~19h
5. 40a t_4c921e60 (rodando) e depois 40b t_359ab800 | ~15h, ~17h
6. Visual, em paralelo e fora do caminho crítico: 49c v2, 36r-A v2, 37r v2, 36r-B v2, 49d e 49e, com no máximo 2 rodadas de juízes por página; a página que reprovar na 2ª vai para a galeria de Daniel | ~17h30
7. Integração final em `int/refazer`, `npm run check`, um passeio de ponta a ponta (RF-01 a RF-14) com dados fictícios e a GALERIA final do site para Daniel | ~19h30
8. P-19, publicação: checklist pronto abaixo; falta só o "pode" de Daniel | ~20h

**ETA do MANDATO pronto para publicar: ~20h de hoje** (o maior risco é a cota semanal do Claude).

Atualização 11/11 15h20 (sessão nova do líder, local-5f45c001): itens 1, 2 e 6 feitos (P-04, P-06, P-38 a P-44). Rodando: 38a t_f7bdf7e8 (desde 13h45), 40a g2 t_de06bd20 (14h27) e 37b g2 t_f2e2d6d8 (15h17). Em todo, presos aos pais: 38b, 39b, 40b. **ETA revisto: ~20h30 pronto para publicar.** 17h: **~22h**, porque a 38a voltou com 10 achados e precisa do merge do int/refazer, e a 38b e a 39b esperam por ela. O polimento (P-45 a P-51) corre ao lado e não segura a publicação.

## Polimento visual (Daniel, 11/11 ~15h: "achei bom mas tem como ficar mais polido o visual")

Rodada nova sobre o Campo de mel aprovado (não muda a direção). Regras da rodada (`retomada_lideres/APPMATERNIDADE_V3.md`). Spec `DIRECOES_20261111/POLIMENTO/SPEC_POLIMENTO.md` v2 APROVADA (explique de volta R1: 3 Blocker, 18 Major e 7 Nit, todos corrigidos no lugar; `EXPLIQUE_R1.md`; v1 guardada em `SPEC_POLIMENTO_v1.md`); cartões t_8c0b72d8 (Início, rodando), t_890d1590 (texto, pronto) e t_89539427 (destaque, em schedule até abrir vaga no teto de 5) e as devoluções `POLIMENTO/DEVOLUCAO_POL_{inicio,destaque,texto}.md`:
- Spec só depois de carregar `portao-especificacao` e `before-you-code` (escopo primeiro: todo arquivo, teste e captura que a mudança alcança). Faixa média (S1 arquivos, S3 pedido de uma frase): portão enxuto, 1 explique de volta, derivada da spec da base.
- Cartão de tela: `skills` = `opencode-executor` + `omh-design-quality-gate`; o prompt do OpenCode nomeia `make-interfaces-feel-better` (passe de polimento) e `frontend-design`. Desde equipe 4f22edb (resposta t_5562f2e0), a Execução de todo cartão de tela leva `preparar_oc.py ... --tela web` (as duas skills entram como instrução nativa do OpenCode, e o `oc_run --screen` recusa rodada sem elas ou sem leitura das próprias capturas); o coordenador confere os recibos dos primeiros cartões.
- Aceite: juízes cegos de duas famílias com calibração, `omh-visual-qa` no veredito e `omh-award-bar-score` contra Becky/Good Inside e Pato Jack; no máximo 2 voltas por página nesta rodada; quem reprovar na 2ª vai para a galeria de Daniel. Em `/app/*` vale a F9 nova (título com o estado e a ação principal como botão na 1ª dobra; `nucleo/rubrica_visual.md`, equipe 9127c78).
- Escopo de escrita disjunto dos cartões do caminho crítico: grupo cuja página um cartão de dados ainda toca espera esse cartão como `parent`.

- [x c9e3580] P-45 Polimento do Início (12/11: POL-INI v2 t_9e230273 APPROVED_WITH_LIMITS na r2, c317c8f, integrada pelo merge c9e3580, check 2066, commits OK 359; volta 2, a última, `pol_inicio_r2` válida nos 2: 4 de 10 passam (1440_02, 1440_05, 1440_07, 390_03), 6,5–8,0 (volta 1: 2 de 10); achado repetido: telas dentro dos aparelhos menos nítidas que a página (F2 do Astra em 4 recortes) e tela repetida no herói; também o vazio do painel final e os números a 390; vai para a galeria de Daniel, `juizes/rodadas/RESULTADO_POL_inicio_r2.md`): POL-INI t_8c0b72d8 APPROVED_WITH_LIMITS (93cc522), integrada pelo merge 386cf35 (recibo no comentário 512). Volta 1 `pol_inicio_r1` (Astra refeito uma vez): 2 de 10 passam (1440_03 e 1440_07), 6,5–7,8. Volta 2, a última: POL-INI v2 t_9e230273 com `POLIMENTO/DEVOLUCAO_POL_inicio_r1.md`. Evidência pendente E1–E3 em P-61
- [x cb9e1e1] P-46 (v1 integrada em da39492; v2 t_3fd302a6 APPROVED_WITH_LIMITS na r2, integrada por fast-forward 48ba136..cb9e1e1, check 2300, commits OK 374, recibo 650; volta 2, a última, `pol_destaque_r2` válida nos 2: 2 de 15 passam (os dois fechamentos a 1440), 6,3–7,9 (volta 1: 0 de 15); repetido: telas dos aparelhos menos nítidas (F2 do Astra em 4) e mídia estreita a 390 (F8 do Fable); vai para a galeria de Daniel, `juizes/rodadas/RESULTADO_POL_destaque_r2.md`) Polimento de Como funciona, Cuidado compartilhado e Desenvolvimento: POL-DES t_89539427 APPROVED_WITH_LIMITS na r2 (4157e18) e integrada pelo merge da39492 (diff idêntico ao revisado, check 2062 testes, commits OK 347; recibo no cartão). Evidência pendente em P-61. Volta 1 dos juízes `pol_destaque_r1`: válida nos 2, 0 de 15 passam (6,0–7,8); volta 2, a última, no cartão POL-DES v2 t_3fd302a6 com `POLIMENTO/DEVOLUCAO_POL_destaque_r1.md` (sha 7a451efb). O `juizes/conferir.py` lia a 2ª tabela do Fable e anulava a rodada à toa: corrigido (12/11) | 12/11
- [x 93517e4] P-47 Polimento das 6 páginas de texto (12/11: POL-TXT v2 t_736b76c5 APPROVED_WITH_LIMITS na r2, 1d7cf9f, integrada pelo merge 93517e4, check 2065, commits OK 353; volta 2, a última, `pol_texto_r2` válida nos 2: 0 de 13 passam, 6,0–7,4 (na volta 1 eram 5,5–7,0); achados repetidos: painel desalinhado da legenda, figura estreita em Termos, abertura longa no celular antes do texto, ilustração repetida em Regras; vai para a galeria de Daniel, `juizes/rodadas/RESULTADO_POL_texto_r2.md`): POL-TXT t_890d1590 APPROVED_WITH_LIMITS (cd11c59) e integrada por fast-forward (e731af5..cd11c59, check 1409 testes, commits OK; recibo no comentário 506). Volta 1 dos juízes `pol_texto_r1` (válida nos 2): 0 de 13 passam, 5,5–7,0, F8 (composição) do Astra em todos (`juizes/rodadas/RESULTADO_POL_texto_r1.md`). Volta 2, a última automática: POL-TXT v2 t_736b76c5 com `POLIMENTO/DEVOLUCAO_POL_texto_r1.md` (ilustração que enche o painel, coluna vazia, índice único, dobra a 390, lista repetida na Privacidade). Evidência pendente do RF-03 em P-61
- [D substituído pelo item H, 12/11] P-48 Polimento de Entrar, Criar conta, Recuperar, Começar e Conta (`componentes/acesso/`, `componentes/conta/`, `paginas/conta/`) | depois da 37b t_f2e2d6d8
- [D substituído pelo item H, 12/11] P-49 Polimento de Hoje, Sessão e Madrugada (`paginas/Hoje.tsx`, `paginas/Sessao.tsx`, `componentes/app/`, `prototipo/`) | depois da 38a g2 t_197241f9 (que move Hoje e Sessão para `paginas/rotina/`) e da 38b t_7c491177
- [x 0f35191] P-50 (13/11: APPROVED_WITH_LIMITS; ff 0f35191 no int/refazer, check 2918, commits OK 433, recibo 749, push; C-1, C-3 e C-4 ampliado a todos os alvos noturnos da Rotina) Polimento do casco (cartão t_2af603f6 aberto 12/11 07h34 sobre 9091c13: C-1 link de pular, C-2 cabeçalho com 6 itens, C-3 fonte 200% a 390, C-4 alvos noturnos na Rotina, C-5 rodapé, C-6 itens comuns da POL-INI) (cabeçalho, rodapé, `index.css`, tokens): cartão pequeno e comum | depois da 37b (mexe no cabeçalho); ajuste comum pedido pelos grupos P-45 a P-49 vem para cá; lista viva em `DIRECOES_20261111/POLIMENTO/PEDIDOS_CASCO.md` (17h50: 3 pedidos da POL-INI, nenhum da POL-TXT, estouros a 200% do cabeçalho da 37b g3; 12/11: link "Pular para o conteúdo" que falta em todas as páginas, achado DEF-62-1 da P-62)
- [x a003fe4] P-65 MAT-40c corrige os defeitos da moderação achados pela P-62b (fonte 200% em diálogos, papéis e etiquetas; hover que falta) (13/11: 5ff67f6 integrada pelo merge a003fe4, diff idêntico, check 2734 na 3ª execução, commits OK 419, recibo 721, push)
- [x t_5404f9ab] P-72 (corrigido pela infra em 13/11: o gancho travava em `git rev-parse HEAD`; agora lê o HEAD dos arquivos do git, sem subprocesso; P-50 solta de novo) Portão guarda-q do executor estoura 30 s no `kanban_request_review` (13/11 14:56-15:09); P-50 t_2af603f6 e 39b t_c9529365 deram gave_up com o trabalho pronto. Avisado (t_69302134). P-50 fica bloqueada até a correção (comentário 726); 39b solta com instrução de bloquear como transient se o portão recusar (727); o líder pede a revisão quando o pre_revisao estiver ok no HEAD
- [x fcf47fc] MAT-39b tummy time ligado à camada de dados (13/11: APPROVED_WITH_LIMITS R3 em 1623572; merge fcf47fc no int/refazer, diff dos 18 arquivos idêntico ao revisado; check 2882, commits OK 429; recibo 732, push)
- [ ] P-73 Pendências de evidência da 39b (matriz G3 completa, reconciliação da leitura das capturas, HANDOFF/VISTO desatualizado, aparência B4/B5/B11/B12 e histórico) | entram na medição do H-4 e na GALERIA_ATUAL; não reabrem a 39b
- [x 3c03656] P-71 MAT-48f (13/11: APPROVED_WITH_LIMITS R2 em 38ffb1d; merge 3c03656, diff idêntico, check 2926, commits OK 438, push): teste intermitente DES-09 "carregando" (caiu em 2 de 3 checks de 13/11; pode casar o "Carregando…" da guarda de sessão) | depois da 39b. R1 13/11 CHANGES_REQUIRED (causa: processo: base sem a 39b e sem OpenCode); correção 1/2 sobre fcf47fc, primeiro a rota sem código (comentário do líder); escopo + `comunidade/topico.test.tsx:618` (foco do apelido, caiu no check completo do revisor, passa sozinho). 13/11: DES-09 20/20 sem código na base com a 39b; topico 19/20 → 20/20 em 38ffb1d; o portão de rodada disparou porque o opencode.json foi preparado com `--tela`: refazer sem `--tela` (comentário 751)
- [~ t_0bfed15d] MAT-48g teste intermitente `conta/familia.test.tsx:443` (foco; 1 falha em 2 checks) | filho da MAT-48f

## Item H, sistema de harmonia (Daniel 12/11 e 13/11; substitui o polimento por página)

Medidas: `C:/OrchestrationLab/projetos/_staging/appmaternidade/HARMONIA/MEDIDAS.md` (todo cartão de spec ou de tela cita). Spec: `HARMONIA/SPEC_H.md`.
- [x MEDIDAS.md] P-67 H-1 medir Pato Jack e Good Inside (getComputedStyle, 1440 e 390; nosso site com o mesmo script) | 13/11
- [x 2a55145] P-68 H-2 (13/11: APPROVED_WITH_LIMITS R2 em 518a773; merge 2a55145 no int/refazer, linhas idênticas às revisadas, check 2926, commits OK 436, tema sem deriva; recibo 753, push; utilitários com prefixo `esp-`) escalas de espaço e tipo em `web/DESIGN.md` (design-md, lint, tema gerado e teste de deriva; eslint-plugin-better-tailwindcss + stylelint em modo relatório, resposta da infra t_7d4a75ef) | SPEC_H v3 parte 1 APROVADA depois de 2 explique de volta (R1: 3 Blocker; R2: 1 Blocker, da parte 2); MEDIDAS corrigido (vão entre seções comparado com vão; `espaco-secao` 80/48)
- [~ t_e9313367] P-69 H-3, dividida por Daniel em 13/11 ~16h40 (t_99ba9793) em cartões paralelos por área, com escopos de escrita separados (regras comuns em `HARMONIA/cartoes/H3_COMUM.md`): H-3a t_e9313367 (primitivas, casco, /sistema, `medir_h.js`, leitura 640; pais H-2 e P-50) → em paralelo H-3b t_b4446ca7 Início, H-3c t_04e1a709 páginas públicas, H-3d t_5866d349 Acesso e Conta, H-3e t_b8d3d400 Rotina, H-3f t_e72eacf8 Comunidade/Desenvolvimento logado/Moderação → H-3g t_b27d2b91 (lint bloqueante, CSS comum, `PEDIDOS_COMUNS.md`, medida das 9 rotas) → H-4. SPEC_H3 v2 APROVADA
- [~ t_e53dea70] P-70 H-4 números (`medir_h.js`) e replica-diff contra as referências; só então juízes e GALERIA_ATUAL recapturada para Daniel | filho da H-3a e da H-3g; inclui a P-73
- [D t_d04a8a7d estacionado] P-66 POL-ABR (12/11 07h42: estacionado pela diretiva de Daniel, substituído pelo item H): aberturas das 6 páginas de texto e mídia estreita a 390 (Daniel 12/11 "Pode abrir", depois do rejulgamento com a captura corrigida; DEVOLUCAO_POL_aberturas.md)
- [D substituído pelo item H, 12/11] P-51 Polimento das telas novas dos cartões de dados (Comunidade, Histórico, Família, moderação, Desenvolvimento logado; 12/11: na madrugada o botão do painel mel da página logada de Desenvolvimento fica sem fundo escuro) | depois de 40a, 38b, 37b e 40b
- [~ galeria] P-53 Volta 2 dos juízes em texto (e731af5), Acesso e Conta (5247510), consolidada pelo líder às 15h40 em `juizes/rodadas/RESULTADO_R2_texto_acesso_conta.md`. Texto: válida nos 2, 0 de 12 recortes passam (5,8–7,0; F9 no celular em 5 páginas). Acesso: só o Fable vale, 1 de 8 passa (6,2–7,5). Conta: nula nos 2, porque o quadro positivo de calibração `d1440_tela_02_y1950.png` tem o cabeçalho sobre os números e os juízes reprovam F3 nele. Quadro trocado pelo coordenador (t_81f75bb7, equipe b77e9bd): agora `d1440_tela_02_y1950_corte.png`. Decisão do líder: não refazer a conta_r2, porque a Conta entra no polimento P-48 e será julgada de novo com o quadro novo; refazer agora gastaria juiz numa tela que vai mudar. As 3 vão para a galeria e entram como achados de entrada no polimento P-47 e P-48
- [~ t_2045f1be feito] P-52 Galeria antes/depois da rodada de polimento (telas inteiras, 2×) para Daniel | 12/11: páginas públicas no cartão P-52a t_2045f1be (`DIRECOES_20261111/GALERIA_POLIMENTO/GALERIA.html`); área logada depois da integração final

## Visual novo (Campo de mel)

- [x] P-01 Passo 0: direção aprovada por Daniel (F1 + F2 + F3), `FINAL/DESIGN.md` e ativos gerados | registro 9157f12 e 6c2fb7e
- [x 98c50de] P-02 MAT-49a base (g1 t_fdba5bed + g2 t_836284e3): revisão R3 aprovada, integrada por fast-forward em `int/refazer` (e73e75a..98c50de) | 11/11 12h30
- [x] P-25 49b, 49c, 36r-A e 37r soltos sobre o head d65dfeb com aval do coordenador (t_7326afbf); 5 cartões rodando juntos às 11h30 (4 páginas + revisão R2 da g2) | 11/11, sem SHA (board)
- [x] P-03 Base mostrada a Daniel cedo: `DIRECOES_20261111/GALERIA_BASE.html` aberta e prévia ao vivo em http://127.0.0.1:5281/sistema | 11/11 10h50, sem SHA
- [x b234554] P-04 MAT-49b g2 (t_606fb2fb) Hoje, Sessão e Madrugada: revisão R3 aprovada (aa89a29) e integrada por merge "Integra o int/refazer na 49b g2 aprovada" (diff conferido, check 546 testes; testes de Hoje/Sessão trocados pelo redesenho, revistos) em `int/refazer` (35f95de..b234554); a volta visual segue na 49b v2 (P-32) | 11/11
- [x 9bb370b] P-05 MAT-36r-B: as 6 páginas de texto, aprovada (4639f84) e, com a 36z (4fc2cd4), integrada por merge "Integra o int/refazer na 36r-B e na 36z aprovadas" (check 1298 testes, commits OK, 283) em `int/refazer` (dae75c3..9bb370b); a volta visual segue na 36r-B v2 (P-33) | 11/11
- [x a8cad7d] P-06 MAT-37r (t_d63c932a): dados, sessão e Auth da 37a sobre a base nova e as telas de acesso e conta; revisão R3 aprovada (741430e) e integrada por merge "Integra o int/refazer na 37r aprovada" (diff conferido, check 1107 testes) em `int/refazer` (c70c2d3..a8cad7d); a volta visual segue na 37r v2 (P-28) | 11/11

- [x 904a071] P-21 MAT-49d: recompor as cenas de marketing com telas do app legíveis (Início, Como funciona, Desenvolvimento, Entrar) e a faixa de cacau sem emenda | depende de 49b g2, 49c, 36r-A e 37r | 49d integrada 11/11 (bcdc89c..904a071, check 1333, commits OK 296)
- [x] P-22 Calibração dos juízes válida nos 2 (rodada 0 e base49a_r1), com a F7 de até 2 destaques (equipe 14e47ed) | 11/11 11h20, sem SHA (staging)

- [x 9bb370b] P-23 MAT-36z apagou `PaginaSimples.tsx` (sem uso); `SubmenuEmBreve.tsx` segue sem import e não reprova o teste, e fica para a limpeza final | 11/11

- [x] P-24 /sistema é informativa (coordenador, 11/11): não segura a integração da base; achados dos juízes (6,5–7,0) levados aos corpos dos 5 cartões de página | 11/11 11h20

- [~ t_0aecd8d2] P-26 Início: a 49c v2 aplicou a volta 1 dos juízes, foi aprovada (9a441ba) e integrada (8e0a1f6..dae75c3, check 1109 testes, commits OK). Falta a 49d corrigir as 2 cenas de dois tablets e, depois, a volta 2 dos juízes

- [~ t_0aecd8d2] P-27 36r-A: a v2 (t_54db34e0) aplicou a volta 1 dos juízes, foi aprovada (b248517) e integrada (9bb370b..7bbe832, check 1308 testes, commits OK, 289). Falta a 49d (cenas de Desenvolvimento) e, depois, a volta 2 dos juízes

- [~ t_347d36de] P-28 Acesso e Conta: volta 1 dos juízes cegos (conta_r1 válida nos 2; acesso_r1 válida no Astra, com a calibração do Fable nula e reprovação independente dele; notas 6,2–7,5). A MAT-37r v2 aplica os itens das telas; a 49d refaz a cena de Entrar | `juizes/rodadas/DEVOLUCAO_37r.md`
- [~ t_5fc82bb8] P-29 MAT-49e (casco, todas as páginas): marca gigante do rodapé alinhada ao fio da direita, botões e campos com 56 px, SAMU na lista de siglas, ícone do menu alinhado e rodapé compacto em /app/* (o `.alvo-toque` do index.css derrubava para 44 px; achado na revisão R1 da 49c) | depois da 49b g2

- [x] P-30 Ferramentas do líder corrigidas em 11/11: `captura/capturar.mjs` e `cdp.mjs` capturam a 2× (antes 1×, e a regra comum pede 2×; testado na 36r-A: innerWidth 390 igual, recortes 810×1688); `rodada/rodada.py` não reprova mais por recibo anterior às capturas que ele mesmo refaz. Avisado aos 5 cartões em curso | sem SHA (staging)

- [x] P-31 O coordenador encerrou os processos velhos do Vite (5276/5281/5282) e do Chrome (resposta t_eabbd722). Para cartões fechados no futuro: `py -3.12 -I -X utf8 C:/OrchestrationLab/equipe/ferramentas/encerrar_processos.py --exige <id>`; nunca `taskkill /F` | 11/11

- [~ t_aee1c551] P-32 Hoje, Sessão e Madrugada: volta 1 dos juízes cegos (hoje_r1 válida nos 2; sessao_r1 válida no Fable; notas 6,5–7,4, REPROVA volta 1). A MAT-49b v2 aplica os itens das telas e a 49e cuida do casco (ícone do menu e rodapé compacto em /app/*) | `juizes/rodadas/DEVOLUCAO_49b.md`

- [~ t_31f10932] P-33 Páginas de texto: volta 1 dos juízes cegos (texto_r1 válida nos 2, notas 5,5–7,1, REPROVA volta 1). A MAT-36r-B v2 trata a margem no celular, os avisos na primeira dobra, a coluna vazia, o painel lateral, o e-mail do Contato, a ordem da Exclusão e o SAMU | `juizes/rodadas/DEVOLUCAO_36rB.md`

- [x c70c2d3] P-34 MAT-48c (t_48aa413e): política de commits aceita só os merges "Traz/Integra o int/refazer" de Daniel; aprovada (64a8054) e integrada (b234554..c70c2d3). `verificar-commits c7142bb..HEAD` = OK, 252 commits | 11/11

- [x 8e0a1f6] P-35 MAT-48d (t_5edde38a): `MERGES_APROVADOS` com só o 81504a7; aprovada e integrada por fast-forward (a8cad7d..8e0a1f6). `verificar-commits c7142bb..HEAD` = OK, 271 commits | 11/11

- [x] P-36 Aprovado (t_eabbd722). O contrato, passo 6, exige (a) a leitura das capturas finais pelo OpenCode, (b) o VISTO do SHA final, (c) o JSON literal e (d) a verificação de commits; faltar um é erro do condutor, não achado do revisor. O `rodada.py` ganhou a etapa 7 (commits, que reprova a rodada) e a etapa 8 (LEITURA.txt com caminhos e sha256); cópia de antes em `C:/OrchestrationLab/backup/autonomia_20261111/rodada.antes_leitura.py` | 11/11

- [x] P-37 Regra do líder (11/11): "capturas lidas pelo worker" (CARTOES_COMUM) vale como leitura pela sessão do OpenCode registrada no recibo (`images_read`), porque o perfil executor não tem ferramenta de imagem. Comentada em todos os cartões ativos; na 49c v2 o líder também olhou os blocos 3–5 (comentário 407)

- [~ galeria] P-38 49b v2 (t_aee1c551): volta 1 dos juízes em Hoje, Sessão e Madrugada, aprovada (b11edc8) e integrada (7bbe832..bcdc89c, check 1333 testes, commits OK, 292). A volta 2 dos juízes espera a 49e (casco)

- [~ galeria] P-39 Volta 2 dos juízes cegos (a última automática) no Início, em Como funciona, em Cuidado e em Desenvolvimento, sobre o integrado 904a071. A calibração foi válida nos dois juízes; só o Fable não respondeu a uma imagem de Desenvolvimento, que vale pelo Astra. Nenhuma das 4 páginas passa: as notas ficaram entre 5,5 e 8,0, quase todas entre 7,0 e 7,5. No Início, 3 de 10 recortes passam; nas outras, nenhum. Na volta 1 elas iam de 5,8 a 7,5. Pela regra, vão para a galeria final do Daniel junto com as outras páginas. Detalhe em `DIRECOES_20261111/juizes/rodadas/RESULTADO_R2_publicas.md`

- [x cdf6219] P-40 MAT-49e (casco: marca do rodapé, `.alvo-toque` 56, SAMU, menu 390, rodapé compacto em /app/*) aprovada (b8d69f0) e integrada (904a071..cdf6219, check 1345 testes, commits OK, 305) | 11/11

- [ ] P-41 (depois da publicação; resposta t_8f03f81c) Cortar o contexto do AGENTS.md: hoje a linha 3 manda ler a pasta 00_Inicio inteira (cerca de 146 KB). O arquivo novo, que aponta só para o PENDENCIAS.md e para o cartão, está em `C:/OrchestrationLab/exports/Lote_Posts_20261111/F_autonomia/units/U-CONTEXTO/aplicar/item5_revisor/novo/AGENTS.md`. Revisar o diff e fazer o commit eu mesmo

- [~ galeria] P-42 Volta 2 dos juízes em Hoje, Sessão e Madrugada sobre o integrado cdf6219: não passa. No Hoje, o Fable deu 6,4 a 7,3 e o Astra 6,4 a 7,6, mas o Astra reprovou F9 (frase de valor no alto) numa tela de uso; mandei ao coordenador (campainha) a proposta de F9 n/a em `/app/*`. Na Sessão, vale só o Astra (6,5 a 7,4), porque o Fable falhou a calibração. Detalhe em `juizes/rodadas/RESULTADO_R2_app.md`. Vai para a galeria do Daniel

- [x 5247510] P-43 37r v2 (t_347d36de), a volta 1 dos juízes em Entrar, Criar conta, Recuperar, Começar e Conta: aprovada (3735be4) e integrada (cdf6219..5247510, check 1356 testes na segunda execução, commits OK, 310). Na primeira execução, 1 teste de `acesso.test.tsx` estourou os 5 s por carga da máquina; isolado, passou 2 vezes, e a execução completa seguinte passou. A volta 2 dos juízes vem a seguir | 11/11

- [x e731af5] P-44 36r-B v2 (t_31f10932), a volta 1 dos juízes nas 6 páginas de texto: aprovada (6f4b0b2) e integrada (5247510..e731af5, check 1391 testes, commits OK, 316). A volta 2 vem a seguir | 11/11

## Dados ligados às telas novas (religados e soltos em 11/11)

- [x] P-09 Corpos dos 6 cartões abaixo reescritos para a base nova antes do claim (prefixo `FINAL/OVERRIDE_DADOS.md`) e soltos em todo, presos aos pais | 11/11 9h50; sem SHA (é board)
- [x c7f26cc] P-10 MAT-37b (g3 t_6aeda4a9 APPROVED_WITH_LIMITS na r2, integrada por ff 4010bbb..c7f26cc, check 2590, commits OK 404, recibo 695; evidência pendente na P-60): convite, Começar completo e Família, com Família no cabeçalho logado e Entrar/Criar conta ligados às telas. g2 t_f2e2d6d8 fechou R1, R2 e R5 (1553 testes), mas a revisão 3 (17h25) escalou por ESCALA-2R com R3 (30 estouros a 200%, diálogos, teclado, prova fail-closed) e R4 (G4/G5/G7, leitura final) abertos. g2 arquivada; sucessora g3 t_6aeda4a9 sobre o head 4e370c9, só para fechar R3/R4, com as decisões D1 a D5 no corpo (estouro no casco vai para a P-50, nada dispensado)
- [x 7509958] P-11 MAT-38a (g2 t_197241f9, sucessora de t_f7bdf7e8 em 12/11; APPROVED_WITH_LIMITS e integrada por fast-forward 22ff7cb..7509958 em 12/11 ~02h35, check 2042 testes, commits OK 341; recibo no comentário 574; evidência pendente em P-60): Hoje, Sessão e os 7 formulários ligados ao banco; entregue fd3e747 sobre a8cad7d, em revisão (16h45). Não entra por fast-forward: conflita com o int/refazer (e731af5) em 8 arquivos, com Hoje.tsx e Sessao.tsx movidos para `paginas/rotina/` contra o visual da 49b v2. A integração exige `merge --no-ff origin/int/refazer` no ramo do cartão, levando o visual da 49b v2 para `paginas/rotina/` (comentário 464): na rodada de correção, se houver; se a revisão aprovar, num cartão pequeno de merge. Revisão R1 (17h) devolveu com `causa: implementacao` (R1–R10: repetição de Descartar/Encerrar e do formulário, madrugada vazando para /app/conta, política de papel nos atalhos, memória sem as regras do banco, fixture errada, limites não anunciados, releitura com falha, Últimos fora da base, fluxos R38-34). Rodada de correção 1 de 2: primeiro o merge do int/refazer, depois R1–R10 com teste da classe; decisões D1 (madrugada só na Rotina, Layout.tsx volta à base) e D2 (medida logada por `.oc/medir_logado.mjs`) no comentário 470
- [x 9091c13] P-12 MAT-38b: Histórico, detalhe, lixeira e notas (APPROVED_WITH_LIMITS na r4, exceção do líder para R3-01 e R7b; 94dedbc integrada pelo merge 9091c13 com o item Histórico no registro de áreas da 37b; check 2720, commits OK 417, recibo 704; evidência pendente: leitura noturna, VISTO/PROVA, HANDOFF_R38-34)
- [x eebd1c5] P-64 MAT-39a g2 (APPROVED_WITH_LIMITS na r3, 9142ef1, integrada pelo merge eebd1c5, check 2423, commits OK 381, recibo 655; evidência pendente: madrugada com o botão do painel mel sem fundo escuro, levado à P-51, e a matriz DES-09/larguras/temas): a página logada /app/desenvolvimento (rotas, item no cabeçalho logado, os 9 itens de conteúdo da base) nunca foi feita, porque a 36r-A só refez a página pública; sucessora de t_55a580e8 sobre 7509958 (12/11)
- [x fcf47fc] P-13 MAT-39b: tummy time ligado à rotina | depende de 38a (integrada) e da 39a g2 t_30ad7504 (comentário 577 com a base)
- [x 22ff7cb] P-14 MAT-40a g2 t_de06bd20: Comunidade ligada ao banco, APPROVED_WITH_LIMITS (526c396) e integrada pelo merge 22ff7cb (diff idêntico ao revisado, check 1679 testes, commits OK; recibo no comentário 518). Evidência pendente em P-62; pedidos de cuidado da página Conta em P-54 | 11/11
- [x d8287bf] P-54 (13/11: aberto em paralelo ao item H, pedido de Daniel "abrir quantas frentes forem necessárias") (dado da 40a: na página /app/conta, a PaginaConta.tsx da MAT-37 faz 20 GET bebes, 20 convites e 68 vinculos num passeio; nada na Comunidade) Minimização de dados no casco logado: a SessaoInterna/minhaConta (MAT-37) pede `bebes`, `vinculos` e `convites` também nas páginas da Comunidade. Não é leitura da Comunidade (decisão D1 do líder na 40a, comentário 460), mas o casco deve pedir só o que a página mostra. Avaliar depois da 40a com a lista `CASCO_RF14` do HANDOFF dela
- [x 48ba136] P-15 MAT-40b t_359ab800: painel de moderação (M1 a M5) ligado ao banco, APPROVED_WITH_LIMITS na r2 e integrada por fast-forward c9e3580..48ba136 (check 2283 testes, commits OK 368; recibo no comentário 618). Evidência pendente em P-62 (medida de M2, temas/larguras/estados no navegador, geometria a 200%, teclado reverso, variantes M3/M4 depois do F5, HANDOFF e PROVA B) | 12/11
- [D] P-16 MAT-37g t_1757260d "Entrar com Google" | espera Daniel decidir o Google OAuth; até lá o site mostra "a definir"

## Fechamento

Evidência pendente (regra nova, Daniel 11/11 ~16h40, `nucleo/revisao_integracao.md` item 3, equipe 536ee95, resposta t_378ed4b4): falta só de evidência, com a checagem independente do revisor verde, não devolve mais o cartão. O revisor aprova `APPROVED_WITH_LIMITS` com `metadata.evidencia_pendente`; o líder integra e completa a evidência em paralelo, antes da galeria e da publicação. Todo cartão novo leva essa regra no texto do pedido de revisão. Itens (dono entre parênteses):
- [x t_ca45d30f APPROVED_WITH_LIMITS 13/11, sem SHA (evidência); sobra B9 real e G5 visual como evidência pendente, para a galeria] P-60 37b (cartão P-60 t_ca45d30f aberto 12/11 07h15 sobre c7f26cc; 12/11: G4/G5/G7 ficaram como evidência pendente do líder na revisão r1 da g3, comentário 630): registros de diálogos (fonte e geometria), estados que faltam, percurso de teclado, 63 contrastes inconclusivos, G4/G5/G7 (g3 t_6aeda4a9 entrega o que couber; o resto vai num cartão [doc] de evidência do líder)
- [~ t_bc1629ca] P-61 POL-INI, POL-TXT e POL-DES (POL-INI v2 e POL-TXT v2 feitas no t_bc1629ca, APPROVED_WITH_LIMITS 12/11, pastas `trabalho/pol-{ini,txt}-v2/evidencia_pendente/`; POL-DES v1 e v2 feitas no P-61b t_89840cb9, APPROVED_WITH_LIMITS 12/11; sobra para a galeria a leitura visual e os candidatos D-1 a D-8 de `pol-des-v2/evidencia_pendente/DEFEITOS.md`; POL-TXT v2: tabela RF-01 antes/depois, JSON RF-03..07 no HANDOFF, PROVA B com .oc/11-13; POL-DES: tabela antes/depois C1–C3/1–15, RF-02, áreas RF-06, JSON final, colunas reais RF-07b, RF-05 por painel, PROVA B; POL-INI: E1 resumo JSON literal no HANDOFF, E2 tabela RF-01 dos 9 itens com antes/depois, E3 bbox inteiras do RF-02; POL-TXT: pares y de/até dos 3 maiores vãos no resumo do HANDOFF e hash do manifesto; já em `trabalho/pol-txt/medidas/rf.json`): o que ficar em `evidencia_pendente` na aprovação (o próprio cartão ou o cartão [doc] de evidência)
- [x t_61cd86f9] P-62 (40b e 38a g2 feitas no P-62b t_61cd86f9, APPROVED_WITH_LIMITS 12/11; defeitos da moderação na MAT-40c t_ec79b067, os da casca na P-50; sobra para a galeria a leitura visual; 40b, 12/11: as pendências de prova da 40b t_359ab800 entram aqui, comentário 618) (40a feita: t_ee893936 APPROVED_WITH_LIMITS 12/11, sem SHA: só evidência em `trabalho/40a/evidencia_pendente/`; sobra: G7 com o líder, leitura visual das capturas novas na galeria; a sobra do encerramento o líder conferiu, nada do cartão vivo; defeito DEF-62-1 levado à P-50) 40a t_de06bd20: prova de geometria por caixa de texto e Shift+Tab; estados C2 Banho vazio, C4 prévia em Banho, C6 com bloqueio, C7 de Carla com denúncia, estados e diálogos a 200% e PNG madrugada; PROVA tabela C pela matriz logada, texto G7/G8 do HANDOFF, JSON em UTF-8 (dono: cartão [doc] de evidência do líder). Qualquer outro `evidencia_pendente` de aprovação com limites: entra aqui com o id e o dono no dia da aprovação

Checagens antes de pedir o "pode" (coordenador, resposta t_552fb3ec): rodam sobre o `int/refazer` final, depois da integração de todos os cartões (item 7 do caminho crítico). Relatórios em `C:/OrchestrationLab/projetos/_staging/appmaternidade/PRE_LANCAMENTO/`; cada achado vira cartão (com `--tela web` se mexer em tela) ou `[x]`; cada item diz a skill que produziu a evidência.
- [~ t_6544886b] P-55 (13/11: antecipado, roda já em paralelo ao item H; depois do H só se refaz o que falhou) QA exploratório do site inteiro, RF-01 a RF-14, com dados fictícios e bugs com evidência | skill `dogfood`
  - 13/11 ~20h: P-55 entregue (0 must, 7 should, 7 nice; `PRE_LANCAMENTO/QA/RELATORIO.md`). Cartões de correção: QA-F2 t_1dcaa165 (Rotina: QA-01/05/08/09/10), QA-F3 t_b12ec1f4 (textos e validação: QA-06/11/12/13), QA-F1 t_e983505a (cabeçalho logado: QA-02/03/04; filho da H-3a); QA-14 (radios) em comentários na H-3d e na H-3f.
- [ ] P-74 [decisor: Daniel] RF-12 (compartilhar resumo da rotina na Comunidade, ação consciente com prévia) não existe no site. Pergunta feita em 13/11 ~20h, sem resposta em 60 min. Padrão do líder pelo MANDATO (RF-01 a RF-14): fazer; spec em `_staging/appmaternidade/RF12/SPEC_RF12.md`
- [ ] P-75 [decisor: Daniel] RF-14 (notificações entre cuidadores e lembretes) dependia de Web Push, e Daniel decidiu "sem PWA" em 11/11. Opções: aviso dentro do site ligável na Conta, sem lembretes (recomendado); tirar o RF-14; ou Web Push. Sem resposta; nada começa sem ele
- [ ] P-76 [decisor: Daniel] QA-07: conteúdos de Desenvolvimento dizem "Revisão profissional: pendente". Padrão do líder: manter (é verdade; dados fictícios)
- [~ t_506d9c94] P-56 (13/11: antecipado; contraste e 200% refeitos depois do H) Auditoria de acessibilidade (teclado, foco, leitor de tela) nas páginas públicas e na área logada | skill `omh-accessibility-audit`
  - 13/11 ~20h30: P-56 entregue (1 must, 5 should, 7 nice; `PRE_LANCAMENTO/A11Y/RELATORIO.md`). A11Y-001 = QA-13 e A11Y-005 = QA-12 (na QA-F3, comentário 781); A11Y-012 menu na QA-F1 (782); A11Y-002 foco do campo de data na H-3g (783); A11Y-003 radios na H-3d/H-3f; novos A11Y-F1 t_35476306 (Desfazer anunciado e cronômetro legível; filho da QA-F2) e A11Y-F2 t_a37f1086 (diálogos, obrigatórios, links externos, nomes dos radios; filho da QA-F3); A11Y-011 coerente com a QA-F1 (madrugada só na Rotina).
- [ ] P-57 Veredito de prontidão para lançar | skill `omh-production-audit`
- [ ] P-58 Prova de que cada item está feito antes do merge na main | skill `omh-verification-gate`
- [ ] P-59 Na publicação: corte da versão e acompanhamento depois do deploy | skills `omh-release-cut` e `omh-deploy-and-monitor` (sem tag nem release sem pedido de Daniel)

- [D] P-19 MAT-48 publicação | espera só o "pode" de Daniel, depois de P-55 a P-58. Checklist pronto:
  1. `int/refazer` com todos os cartões integrados, `npm --prefix web run check` com exit 0 e a CI verde no último SHA (ci.yml, Ubuntu e Windows);
  2. `git merge-base --is-ancestor origin/main origin/int/refazer` com exit 0 e o diff `main..int/refazer` conferido (sem `.env`, sem segredo, sem caminho de usuário);
  3. com o "pode" de Daniel: `git push origin <SHA>:refs/heads/main`, só fast-forward;
  4. o `pages.yml` roda no push da main e publica no GitHub Pages; o `banco-nuvem.yml` aplica as migrações no Supabase com os secrets que existem desde 05/11 (SUPABASE_ACCESS_TOKEN e os demais). O primeiro admin é opcional, pelo `workflow_dispatch`;
  5. conferência pós-publicação: abrir o endereço do Pages, criar uma conta fictícia, registrar uma mamada e ver o Hoje; anotar o SHA e o horário no cofre.
- [x Daniel 12/11: manter o Gmail por enquanto e trocar antes de divulgar o site; a troca é uma linha em `conteudo/publicas-texto.ts`] P-63 O e-mail de contato do site é um Gmail pessoal (os juízes apontam que tira o ar profissional). Decisão de Daniel: manter ou usar um endereço do projeto; vai na galeria
- [D] P-16 continua "a definir" (Entrar com Google), sem bloquear a publicação.
- [x] P-20 MAT-41 PWA | cancelado: Daniel decidiu "sem PWA" (cartão t_ab1bd202 arquivado em 11/11); sem SHA
