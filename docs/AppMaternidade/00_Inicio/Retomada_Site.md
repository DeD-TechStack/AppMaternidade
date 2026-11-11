---
tipo: progresso
status: em andamento
responsavel: lider-appmaternidade
revisado_em: 2026-11-03
fontes_principais: board Kanban appmaternidade; itsaplan MAT-27 a MAT-43; git main
---

# Retomada do site: estado em 03/11/2026

Esta é a nota de partida da próxima sessão de trabalho no site. Ela registra o estado da sessão de 03/11/2026. Antes de agir, confira o board `appmaternidade`, o itsaplan (MAT-27 e as tarefas filhas) e o `git log` da main: o estado verdadeiro está lá, não nesta nota.

**Site publicado (06/11/2026):** https://ded-techstack.github.io/AppMaternidade/ (MAT-48a, main 2beddee). Ele mostra Início, Hoje e Sessão com o aviso "Demonstração sem banco". As variáveis do banco entram no build com a MAT-37.

## CONSTRUÇÃO EM CURSO (11/11/2026, 9h25): ESTADO VIGENTE

- **Spec:** `C:/OrchestrationLab/projetos/_staging/appmaternidade/DIRECOES_20261111/FINAL/DESIGN.md` (sha256 e504df37). As regras comuns dos cartões ficam em `FINAL/CARTOES_COMUM.md` (sha256 626371ab).
- **Ativos gerados pelo Codex no plano do ChatGPT:**
  - 4 cenas de estúdio com a tela em verde, que serão compostas com capturas reais pelo `ferramentas/compor.py`, já testado;
  - 6 ilustrações de traço;
  - o registro de cada um em `FINAL/ativos/PROVENANCE.md`.
- **Cartões:**
  - t_fdba5bed MAT-49a, base: tokens, fontes, cabeçalho, rodapé, componentes, movimento e `/sistema`. Em Opus, **rodando**, com prévia em http://127.0.0.1:5281/sistema.
  - t_26066f02 MAT-49b: Hoje, Sessão e Madrugada. Em Opus, espera a base.
  - t_3c6e3a0c MAT-49c: Início com as cenas. Em Opus, espera só a base desde 11/11 10h15. As cenas são compostas com capturas das próprias páginas.
  - t_ee526db4 MAT-36r-A: Como funciona, Cuidado compartilhado e Desenvolvimento. Em Opus, espera só a base desde 11/11 10h15.
  - t_0aecd8d2 MAT-49d: recompõe as cenas com as telas novas de Hoje, Sessão e Madrugada, só nas imagens. Espera a 49b, a 49c, a 36r-A e o 37r.
  - Depois da base, 5 cartões rodam em paralelo: 49b, 49c, 36r-A, 36r-B e 37r.
  - t_e1d0eaa8 MAT-36r-B: 6 páginas de texto. Em Sonnet, espera a base.
  - t_d63c932a MAT-37r: traz o fad75c0 (37a) e refaz as telas de acesso. Em Sonnet, espera a base.
- **Arquivados como substituídos:** t_915e3632 (37a, que tem o MAT-37r como sucessor) e t_55a580e8 (39a, coberto pela 36r-A).
- **Religados e ainda em `scheduled`:**
  - 37b t_11ad28e6 e 37g t_1757260d, agora presos ao 37r;
  - 38a t_f7bdf7e8, que também espera a 49b;
  - 39b t_c9529365, agora preso à 36r-A;
  - 40a t_4c921e60, agora preso ao 37r.
  - O corpo deles será reescrito para a base nova antes do `unblock`.
- **Aceite visual:** depois que o revisor aprovar cada cartão, passa por 2 juízes cegos de famílias diferentes, calibrados antes, e então vai para a galeria do Daniel.

## DIREÇÃO ESCOLHIDA (11/11/2026, 9h03): histórico

- **Decisões de Daniel (11/11, de manhã), repassadas pelo coordenador** (`C:/OrchestrationLab/exports/Revisao_Geral_20261111/retomada_lideres/APPMATERNIDADE_V2.md` e `V2b.md`):
  - nenhuma das direções A/B/C;
  - quer uma fusão da Pato Jack (paleta e alma) com a Becky/Good Inside (recursos visuais);
  - quem desenha olha as duas fontes; não entram ativos, textos nem código delas;
  - imagem, sombra e gradiente liberados, controlados pelos tokens;
  - imagens geradas no site publicado, com curadoria e `PROVENANCE.md`;
  - Opus nas telas que definem a cara do site.
- **Rodada 2.** A galeria `C:/OrchestrationLab/projetos/_staging/appmaternidade/DIRECOES_20261111/GALERIA2.html` traz as 3 fusões, cada uma com DESIGN.md e 3 composições. A análise dos 24 recursos está em `rodada2/ANALISE_FEATURES.md`, com as capturas das duas fontes em 1440 e 390.
- **Escolha de Daniel, às 9h03:** a **F1 Campo de mel**, que leva a estrutura e o movimento da Becky com as cores da Pato Jack, mais duas peças das outras fusões: da F2, a tabela de comparação, a faixa de selos e os depoimentos; da F3, o modo Madrugada nas telas do app. O registro está em `DIRECOES_20261111/GOSTO_DANIEL.md`.
- **Próximo passo:**
  1. Fechar o DESIGN.md final e a lista de ativos.
  2. Gerar e escolher os ativos: as cenas de estúdio e o traço preto.
  3. Criar o cartão da base (tokens, casca, componentes), em Opus, e mostrar a base a Daniel cedo.
  4. Abrir as páginas em paralelo em cima da base.
  5. Abrir o sucessor que integra o `fad75c0` (37a) e religar os cartões em `scheduled` a ele.

## VISUAL REFEITO DO ZERO, passo 0 (11/11/2026, 3h20): histórico

Este bloco substitui o de 10/11 logo abaixo, que vale só como histórico. Nele, os cartões 44d-3, MAT-36 g2, 6b, 6c e 44d-6 ficaram superados.

- **Por quê.** Às 2h20, Daniel rejeitou o visual do site ("um completo lixo visualmente", "não segue em nada o site referência"). A causa está na auditoria da infra (`C:/OrchestrationLab/exports/Revisao_Geral_20261111/T1_visual/RESULTADO.md`). A spec MAT-44d mandava fazer os aparelhos em 3D de CSS e proibia imagem, sombra e gradiente. A sala limpa tirou da spec a aparência da referência. E o juiz Fable deu nota ao próprio plano.
- **Regra nova (equipe c93a301).** O código de uma página só começa depois que Daniel aprova uma galeria de direções. O aceite visual é feito por 2 juízes cegos de famílias diferentes, calibrados antes, com no máximo 2 rodadas por página. Quem escreveu a spec não julga. Pausa se faz com `schedule`, não com `block`.
- **Feito no passo 0.** A galeria está em `C:/OrchestrationLab/projetos/_staging/appmaternidade/DIRECOES_20261111/GALERIA.html`. Cada uma das 3 direções tem um DESIGN.md (paleta com contraste medido, 2 famílias de letra, espaçamento, componentes, o que fazer e o que não fazer, e como se fazem as imagens) e 3 comps do image_gen do Codex, feitas no plano do ChatGPT: a abertura, o Hoje e uma página pública. A referência e as capturas rejeitadas ficam ao lado. O registro de cada imagem está em `PROVENANCE.md`.
  - A, Estúdio anil: celulares reais fotografados em estúdio sobre anil `#2E4BD8`, com as letras Bricolage Grotesque e Atkinson Hyperlegible Next.
  - B, Madrugada: abertura noturna com luz de abajur e fotos sem rosto, com as letras Young Serif e Figtree.
  - C, Bilhete da família: ilustração em guache e bilhetes amarelos, com as letras Shantell Sans e Hanken Grotesk.
- **Board.**
  - Arquivados como substituídos: t_5184c99c (44d-3), t_93f3308e (MAT-36 g2), t_b2a55931 (MAT-36), t_f67d8962 (44c-1), t_ab1bd202 (PWA, que Daniel recusou), t_77f83db6 (6b), t_673ee2f7 (6c) e t_1584e47e (44d-6).
  - Em `scheduled`, a lógica de dados e de acesso: t_915e3632 (37a, com o código aprovado `fad75c0` no ramo `wt/t_915e3632`), t_1757260d (37g), t_11ad28e6 (37b), t_f7bdf7e8 (38a), t_7c491177 (38b), t_55a580e8 (39a), t_c9529365 (39b), t_4c921e60 (40a) e t_359ab800 (40b).
  - Nenhum cartão está em triage. A 48b já estava concluída (t_fa51c4df e t_0754f01f).
- **Git.** Nada foi integrado e não houve push para a main. `int/refazer` continua em e73e75a, e o site publicado continua o antigo.
- **Esperando Daniel (decisor: Daniel), as perguntas da galeria:**
  1. Qual direção ele escolhe. Recomendo a A, com o modo Madrugada da B nas telas do app à noite.
  2. Se quem desenha pode ver a referência. Recomendo sim, sem que nada dela entre no repositório ou no site.
  3. Se libera imagem, sombra e gradiente, só pelos tokens. Recomendo sim.
  4. Se aceita imagens geradas no site publicado. Recomendo sim, com curadoria e `PROVENANCE.md`.
  5. Se o Opus escreve as telas que definem a cara do site. Recomendo sim, com o Sonnet nas páginas que só seguem o padrão.
- **Próximo passo, depois da resposta.** Uma rodada de refinamento da direção escolhida, também em imagem. Depois:
  - um DESIGN.md final;
  - os ativos gerados e escolhidos;
  - um cartão de casca, com os tokens, o cabeçalho, o rodapé e uma página modelo;
  - um cartão sucessor que integra o `fad75c0` (37a) e refaz as telas de acesso;
  - antes de qualquer `unblock`, religar a esse sucessor os cartões em `scheduled` que eram filhos da 44d-3 ou da MAT-36 g2.

## RETOMADA de 10/11/2026 (Hermes v0.23.1): histórico, substituído pelo bloco acima

- **Cartões e condutor.** O quadro 9119 (PATCH) devolveu a ready os 4 cartões da pausa: t_f67d8962 (44c-1), t_ecf636f5 (44c-2a), t_915e3632 (37a) e t_fa51c4df (48b). Eles e os filhos t_b2a55931 (MAT-36) e t_1757260d (37g) agora são conduzidos pelo **executor-appmaternidade**, em Sonnet. Os comentários 119 a 122 levam a ordem de trabalho: rebase sobre 41d20d3, só as 2 skills, e os testes de borda que falham fechado (item 8).
- **Prévia.** Fechei o vite que estava aberto na porta 5175 desde 09/11. Ele era do worktree da 37a.
- **Aceite visual.** O avaliador agora é o do piloto: Fable 5.2 high, com o Opus também nas 2 primeiras telas. As duas notas vão no cartão. Se uma nota ficar a menos de 0,2 do mínimo, a decisão volta para mim. O mínimo continua 8,0.
- **OSV (decisão do líder, 10/11).** O alerta de `zod 3.25.76` vem de `@google/design.md`, e os de `minimatch 10.2.6` e 3.1.5 vêm do eslint e do typescript-eslint. Todos são **só de desenvolvimento**: não vão para o build do site nem rodam no navegador do usuário. Não abro cartão agora. Eles sobem com a próxima atualização de dependências de desenvolvimento.
- **Plugins (decisão do líder, 10/11).** O Playwright CLI no OpenCode e o Modern Web Guidance ficam para depois. O foco agora é fechar o site. As capturas continuam pelo `navegacao-agentes`.
- **Subagentes.** Há 2 em curso. Um escreve os corpos 44c-2b e 37b. O outro faz a spec v3 da MAT-38 com os corpos 38a e 38b. Depois deles vêm as MAT-39, 40 e 41. Com 4 cartões rodando, mantenho no máximo 2 subagentes.
- **Marco (10/11).** A MAT-44c-2a, que traz as peças de movimento e o motion 12.43.0 sem ligar nada nas páginas, foi integrada na main **7472abc**. Para isso, os 5 commits do d7f6c6d aprovado foram rebaseados e o range-diff deu igual nos 5. O check passou com 582 testes. O OSV não achou nada novo, só os alertas zod e minimatch, que são de desenvolvimento.
- **Decisão (10/11).** A spec v3 da MAT-38 foi aprovada (sha 87dd78d9) e as das MAT-39, 40 e 41 também (shas 145824bc, 0d387f95 e 93c02716). Os cartões foram criados e ligados aos pais: 44c-2b t_6e8036b9, 37b t_11ad28e6, 38a t_f7bdf7e8, 38b t_7c491177, 39a t_55a580e8, 39b t_c9529365, 40a t_4c921e60, 40b t_359ab800 e 41a t_ab1bd202. A 41b só nasce depois do commit de junção C41b. Na 39a e na MAT-36 entrou uma emenda: sai "Revisão profissional: pendente" e o selo de rascunho (comentários 129 e 130). Para a 48b, a ACC-11 foi emendada no comentário 125.
- **Marco (10/11): MAT-48b concluída.** Integrei na main **146e290**. Os 3 commits do c2a7cc2 foram rebaseados, e o range-diff deu igual. Como o sandbox do revisor-appmaternidade falha com ShellExecuteExW 1223 neste cartão, a revisão veio da R-B (codex gpt-6-astra, só leitura), com o resultado APPROVED_WITH_LIMITS (`MAT-48/RB_REVISAO_48b.md`). A verificação determinística ficou com o líder, em `.oc/lider_verif/`. **As migrações já estão aplicadas no Supabase da nuvem** (run 42785674785). O job de dados iniciais falhou porque a CLI pede `--yes`. Nada mudou na nuvem, e a correção está no cartão t_0754f01f (MAT-48b-fix). Depois dela, o líder roda o job de dados de novo.
- **Marco (10/11): banco da nuvem pronto.** A correção t_0754f01f foi integrada em **67d390a**. O run 42787421628 passou nos 3 jobs: testes locais, migrações na nuvem e dados iniciais. Os termos vigentes estão garantidos. O admin ainda não existe e só será criado quando Daniel tiver conta no site, o que depende da 37a.
- **RETOMADA de 11/11, às 1h35.** Daniel retomou só com a infra e o AppMaternidade. A infra soltou a 44d-3 (t_5184c99c), a 6a (t_f21ee109) e a MAT-36. `int/refazer` está em e73e75a, e a main em c86090a, com push.
  - **MAT-36 em ESCALA-2R:** o cartão teve 3 `changes_requested`. O t_b2a55931 foi encerrado, com o worktree e o 667bf2b guardados.
  - **Sucessor da MAT-36:** o g2 é o **t_93f3308e**. Ele parte do 667bf2b e traz a lista consolidada de 12 itens. Esta é a volta visual 3/3; se falhar, o caso vai a Daniel com a galeria. A 6c, a 39a e a 40a foram religadas a ele.
  - **Limite de 2 skills por cartão:** a 6b e a 6c, que fixavam 4 skills e não tinham começado, foram arquivadas. Os cartões novos são a **6b t_77f83db6** e a **6c t_673ee2f7**, com 2 skills e o protocolo do `rodada.py`. A 6a, que já estava rodando com 4 skills, ficou como estava.
  - **Próximo passo:** integrar a 44d-3, o que libera a 37b, a 39a, a 40a e a 6b. Depois, integrar a MAT-36 g2, o que libera a 6c. Em seguida a 44d-6 e a galeria.
- **PAUSA de 10/11, às 20h15 (pedido de Daniel).** Daniel retoma mais tarde, com a infra e o AppMaternidade. Nada foi integrado depois do pedido e não houve push para a main.
  - **Estado:** `int/refazer` está em **e73e75a** e já tem a 44d-1 (base), a 44d-4 (Início), a 44d-2 (área logada) e a 44d-5 (imagens do Início). A main está em 439a42d, mais esta nota em commit local. O site publicado continua o antigo.
  - **Cartões pausados, com `needs_input` e o motivo "[decisor: Daniel] pausa de 10/11 (~20h15)":**
    - t_5184c99c (44d-3, acesso e Conta): na volta visual 1/3, com as notas 7,4–8,2 e o comentário 258. Ao voltar, fazer D1–D5 numa passada só, com o `rodada.py`, e depois Fable e revisão.
    - t_b2a55931 (MAT-36, páginas públicas): na volta 2/3. 18 de 20 casos passam, e só o Contato fica em 7,6/7,8 (comentários 265 e 269). Ao voltar, fazer N1–N7, o rodapé em 1440 e o zoom dentro do próprio escopo.
    - t_f21ee109 (44d-6a, área logada, acabamento das imagens e zoom do cabeçalho): começou a 1ª passada. Ao voltar, entregar A, B e C.
  - **Cartões em fila, presos aos pais pausados (o painel não deixa bloquear um cartão em todo):**
    - 44d-6b t_6afcc9b3 e 44d-6c t_9a4ca6ee;
    - 44d-6 t_1584e47e, a conferência final;
    - 37b t_11ad28e6, 38a t_f7bdf7e8, 38b t_7c491177, 39a t_55a580e8, 39b t_c9529365, 40a t_4c921e60 e 40b t_359ab800.
  - **Parados de antes:**
    - 41a t_ab1bd202: a PWA foi adiada por Daniel;
    - 37a t_915e3632 e 44c-1 t_f67d8962: substituídos;
    - 37g t_1757260d: espera o Google.
  - **Ao retomar, em ordem:**
    1. Desbloquear a 44d-3, a MAT-36 e a 6a.
    2. Integrar a 44d-3, o que libera a 37b, a 39a, a 40a e a 6b.
    3. Integrar a MAT-36, o que libera a 6c.
    4. Fazer a 44d-6.
    5. Montar a galeria para Daniel.
  - **Previsão a partir da retomada:** cerca de 4 horas para o visual inteiro em `int/refazer` e mais 3 a 4 horas para a ligação com o banco.
  - **Ferramenta nova:** `_staging/appmaternidade/ferramentas/rodada/rodada.py`, que faz a cerimônia de cada volta numa chamada só.
  - PAUSA_OK appmaternidade 2026-11-10T20:20-03:00
- **Decisão e marco (10/11).** Daniel respondeu: "tudo sim e segue com opção A" (D1 a D5, com a barra Registrar de 1 toque). Saiu a spec MAT-44d, com sha256 953a9114 e as 3 primeiras seções em `_staging/appmaternidade/MAT-44d/TAREFA.md`, e foi criado o ramo `int/refazer`, em f069499, com push. O Pages só publica a partir da main. Ficaram 6 cartões:
  - t_0288c2c3: 44d-1, sistema-base, pronto para começar;
  - t_6c3e5423 (44d-2, área logada), t_5184c99c (44d-3, acesso e Conta, com o código fad75c0 da 37a) e t_27b74658 (44d-4, Início): esperam o 1;
  - t_cc66cbf8: 44d-5, mídia;
  - t_1584e47e: 44d-6, conferência cruzada.
  Os cartões t_f67d8962 e t_915e3632 foram substituídos (comentários 160 e 161), e o 37g agora depende do 44d-3. O aceite de cada cartão é feito pelo Fable, com nota mínima 8. A main só recebe `int/refazer` depois que o 44d-6 passar.
- **Bloqueio, decisão de Daniel (10/11).** O diagnóstico do Fable está pronto em `_staging/appmaternidade/REAVALIACAO_20261110/DIAGNOSTICO_FABLE.md` (500 linhas, US$ 4,76). Ele mostra 10 causas de base: três cascas diferentes, mídia de meia largura com texto dentro, 5 tamanhos de tipo contra 11, grade de 12 contra 10 colunas sem calha, ritmo curto, cor demais, fios sem regra, linha de texto curta, falta de rodapé e uma regressão. Traz também um sistema-base com valores exatos, um plano por tela com critérios medidos e 6 cartões em ordem. Antes do cartão 1 ficam 5 decisões para Daniel, em `REAVALIACAO_20261110/DECISOES_DANIEL.md`: fontes novas, fim da lateral e da navegação inferior, a barra Registrar, títulos curtos e os 3 números. Perguntei pelo clarify, sem resposta em 60 minutos.
- **Decisão e parada (10/11, Daniel pela infra): reavaliação do site inteiro.** Daniel achou o site muito ruim porque "não segue em nada o site referência". As notas pararam em 6 a 7, mesmo com o laço visual funcionando, o que indica problema de base. Por isso parei a rodada visual 3 da 44c-1 (t_f67d8962, OpenCode interrompido, worktree em 11de622 com 3 arquivos sujos) e a rodada 3 da 37a (t_915e3632, worktree ae7a405). As duas estão em needs_input, e nada foi integrado. O Fable 5.2 high, só leitura, está fazendo o diagnóstico e o plano do site inteiro contra a referência, em `_staging/appmaternidade/REAVALIACAO_20261110/DIAGNOSTICO_FABLE.md`. Os cartões serão refeitos a partir desse plano, em sessão nova do OpenCode, com o laço visual e o Fable no aceite (nota mínima 8).
- **Aceite visual (10/11): 37a reprovada.** O código está aprovado no fad75c0. O Fable deu de 5,00 a 6,15, e o Opus deu 5,80 em entrar e 6,00 em criar_conta. As notas estão em `MAT-37/evidencias/aceite_37a/`. A rodada visual voltou ao executor pelos comentários 142 e 143, com até 3 voltas. A 37g (t_1757260d) fica bloqueada até a 37a entrar na main.
- **Pendente com Daniel.** Falta configurar o Google OAuth e decidir a verificação extra de quem modera.

## PAUSA de 09/11/2026 ~22h (conferência antes da retomada, decisão de Daniel)

A retomada de 09/11, às ~21h50, saiu cedo demais e foi suspensa. Daniel vai conferir as atualizações, as sessões, as assinaturas e os modelos antes de o trabalho voltar.

- **Cartões parados:** t_f67d8962 (44c-1), t_ecf636f5 (44c-2a), t_915e3632 (37a) e t_fa51c4df (48b) estão bloqueados como needs_input `[decisor: Daniel] pausa de 09/11 (conferência antes da retomada)`. O board os pôs em triage. Os worktrees ficaram preservados, e nada foi integrado nem enviado.
- **Subagentes:** os 2 que refaziam os corpos 44c-2b e 37b e a spec v3 da MAT-38 foram interrompidos sem escrever nada. A MAT-38 continua na v2, idêntica a `TAREFA_v2.md`.
- **No ar:** o site continua em 599b975 e a main está em 58ae00f, mais este registro, que está só no local.
- **Na retomada:** desbloqueie os 4 cartões. Os comentários 114 a 117 pedem o rebase sobre a main. Na 44c-1, valem também os comentários 109 e 110. Relance os 2 subagentes, usando `CONTEXTO_CARTOES.md`. O resto continua igual à seção de 06/11 abaixo.

## PAUSA de 06/11/2026 ~19h30 (limite do Claude, decisão de Daniel)

**No ar:** main **599b975**, em https://ded-techstack.github.io/AppMaternidade/. É o site da MAT-44 e da MAT-48a, agora com a família de exemplo Heloísa (bebê) e Juliana (mãe), mais Bruno e Carla. A frase do protótipo passou a ser "Um dia de exemplo com Heloísa…". A troca de nomes veio do cartão t_5c545bc3, aprovado pelo revisor (469 testes). Ela só mexe em texto, não muda o layout.

**Galeria:** `C:/OrchestrationLab/projetos/_staging/appmaternidade/PAUSA_20261106/GALERIA.html`.

**Pela metade.** Todos os cartões abaixo estão bloqueados como needs_input `[decisor: Daniel] pausa de 06/11 (limite do Claude)`, com o worktree em `.worktrees/<id>` preservado:
- **t_f67d8962, 44c-1 (base de layout).** O candidato é o 79b4dfc. O avaliador independente deu notas de 5,58 a 6,22, abaixo de 8, então não integra. As 2 exceções de teste estão no comentário 109, e os 8 defeitos para a nova rodada visual estão no comentário 110.
- **t_ecf636f5, 44c-2a (componentes de movimento).** O candidato c8aa498 levou BLOCK, com R1 (o estado e o foco se perdem ao alternar movimento reduzido) e R2 (scaleX abaixo do piso de 0,8). A correção estava em curso.
- **t_915e3632, 37a (login, sessão e Conta).** Parou no ponto em que estava.
- **t_fa51c4df, 48b (banco na nuvem).** Spec v2 com sha 956e8853. Parou no ponto em que estava.

**Na fila, ligados aos pais e sem rodar:**
- t_b2a55931, MAT-36 (páginas públicas): a correção cd25061 está aprovada e o cartão espera a 44c-1.
- t_1757260d, 37g (Google): espera a 37a, e o adendo `MAT-37/ADENDO_GOOGLE.md` tem sha a0fba14e.

**Pendências de Daniel:**
- configurar o Google OAuth, com o passo a passo no fim do ADENDO_GOOGLE;
- decidir o MFA do moderador;
- depois da 48b, criar a própria conta no site e informar o "Id da sua conta".

**Próxima ação exata na retomada:**
1. Desbloqueie a t_f67d8962. Ela faz a rodada visual dos comentários 109 e 110.
2. Quando ela voltar, rode o avaliador independente lado a lado com a referência. Ela só integra com nota de 8 ou mais.
3. Ao mesmo tempo, desbloqueie a t_ecf636f5, a t_915e3632 e a t_fa51c4df. Com 4 ou mais cartões rodando, use no máximo 2 subagentes ao mesmo tempo, porque em 06/11 às 18h51 tudo caiu junto.
4. Refaça os corpos da 44c-2b e da 37b e as specs v3 das MAT-38, 39, 40 e 41, que ficaram interrompidas. O contexto comum está em `_staging/appmaternidade/CONTEXTO_CARTOES.md`.

## PAUSA para a janela v0.23.0 (decisão de Daniel, 05/11/2026 ~23h30; fechada em 06/11/2026 ~00h20)

Hoje no board `appmaternidade` nenhum cartão está rodando, pronto ou em revisão, e não há OpenCode ativo. A main está em `881275d`, sincronizada com origin/main.

**Pronto (na main):**
- Fundação do site (MAT-35) e direção visual com o protótipo de 3 telas (MAT-34).
- Banco local completo, com as correções da releitura por outra família:
  - MAT-43 (base);
  - MAT-45 (conta e família): `t_e3572be9` e a correção `t_ad018d1e`, f738247;
  - MAT-46 (rotina): `t_c9df145a` e a correção `t_d4e788ea`, a80924e;
  - MAT-47 (comunidade): `t_569c296e` e a correção `t_e0627701`, c16b68c.

  São 56 arquivos de teste e 3.485 asserções passando, mais o check do site com 294 testes.
- Infra de Daniel feita:
  - GitHub Pages ativado (Source: GitHub Actions);
  - projeto Supabase `appmaternidade-demo` (Free, us-east-1, ref caatnppalmwyrldtdooh), com login por e-mail, Confirm email desligado, Site URL e Redirect URL do Pages;
  - os 5 secrets no GitHub, conferidos só pelo nome.

**Aprovado, mas ainda fora da main:**
- **MAT-44** (salto visual de Início, Hoje e Sessão): `t_10f8dad7`, APROVADA na revisão 3 do candidato `3a8789d898a40e35107fa2ba983747276c7b284f`, com base 2a35dc7. O G6 do revisor deu 8,03 a 8,17.
- A integração não foi feita na pausa porque ainda falta o portão do líder: a nota do leitor cego (G6) e o rebase sobre 881275d.
- A prévia local em http://127.0.0.1:5180/ mostra esse candidato (worktree `.worktrees/previa`).

**Specs no staging (fora do Git, `C:/OrchestrationLab/projetos/_staging/appmaternidade/`), ainda sem cartão:**

| Spec | Estado | Linhas | sha256 |
|---|---|---|---|
| MAT-36 (páginas públicas) | v3, depois da R-B 1 (B=2 M=9 N=7) | 788 | 5db326af |
| MAT-48a (Pages pelo CI) | v2.2, **aprovada** | — | 815e1f94 |
| MAT-37 (conta e login) | RASCUNHO v1 | 594 | 5f375c49 |
| MAT-38 (Hoje, registros, Sessão, Histórico) | RASCUNHO v1 | 648 | 1c534bbd |
| MAT-39 (Desenvolvimento) | RASCUNHO v1 | 701 | b17e6f20 |
| MAT-40 (Comunidade e moderação) | RASCUNHO v1 | 733 | 1d52798e |
| MAT-41 (PWA e offline) | RASCUNHO v1 | 502 | 326b1c10 |
| MAT-48b (banco na nuvem), em `MAT-48/TAREFA_48b.md` | RASCUNHO v1 | 480 | feff3fbe |

Cada rascunho tem uma tabela de decisões pendentes do líder no fim. A **MAT-50** (movimento, itsaplan 214) é uma pendência planejada e só nasce depois da MAT-44 na main.

**Próximo passo exato da retomada, em ordem:**
1. Ler o AGENTS.md e o board, e conferir que o Hermes está na v0.23.0, que o gateway foi reiniciado e se o itsaplan voltou.
2. **Integrar a MAT-44:**
   - rebase de 3a8789d sobre a main;
   - range-diff;
   - `npm --prefix web run check`;
   - nota do leitor cego (G6, maior ou igual a 8,0, com diferença de até 1,0 para a nota do revisor);
   - ff, push e cofre.
3. **Rodar a D2 da MAT-48b antes do cartão da MAT-48a.** Os secrets `VITE_*` já existem, então o aviso de demonstração some e a ACC-09 da 48a reprova. Decidir se a v2.3 da 48a deixa de passar os `VITE_*` ao build até a MAT-37. Depois disso, criar o cartão da **MAT-48a**: é ele que põe o site no ar.
4. **Preparar as specs:**
   - acrescentar os slots 37 a 41 no `ferramentas/isolar_supabase.py`;
   - decidir as pendências das specs MAT-37 a 41 e 48b;
   - rodar o explique de volta R-B (`ferramentas/rb_explique.py --tela MAT-NN`) na MAT-36 v3 e nas 6 novas.
5. **Cartões em paralelo** (até 5): MAT-36, MAT-37 e MAT-50. Depois da MAT-37 na main, MAT-38, 39 e 40. Por último, a MAT-41.

**Pendências com Daniel:** D5 (quem revisa o conteúdo de Desenvolvimento, que vai ao site com o selo "Rascunho em revisão"), e-mail de contato e encarregado de dados.

## Rumo

Em 03/11/2026, Daniel definiu o rumo: o AppMaternidade começa como site completo, com RF-01 a RF-14. Android e iOS vêm depois, por port (empacotar o site como app de loja pelo Capacitor). A tarefa-mãe é a MAT-27, com os portões de aceite G1 a G12.

## Decisões de 03/11/2026

| Decisão | Estado | O que ficou |
|---|---|---|
| D8, stack (MAT-28) | decidida por delegação de Daniel | React 19 + TypeScript + Vite, Tailwind 4, shadcn/ui e Magic UI só da lista aprovada, Supabase em São Paulo, PWA; port pelo Capacitor |
| D9, hospedagem (MAT-29) | decidida por Daniel | GitHub Pages pelo GitHub Actions; Supabase Free só sem dados reais; domínio próprio depois |
| D10, Impeccable (MAT-30) | decidida por delegação | verificação local que não bloqueia, no portão final, depois de avaliada |
| D11, referência visual (MAT-31) | decidida por delegação | estudo em sala limpa reduzida: o analista usa a REA e o site recebe só uma especificação abstrata |

## O que está pronto

- **Fundação do site (MAT-35):** integrada na main no commit d731d3d.
  - A pasta `web/` tem React, Vite, TypeScript, Tailwind 4 e React Router.
  - Há lint com acessibilidade, testes com axe e contraste, o verificador de commits e o CI.
  - O site tem só duas páginas provisórias: a inicial e a de endereço inexistente. Ainda não há tela de produto.
- **Estudo da referência visual (MAT-33):** a especificação abstrata está fora do repositório, na pasta de staging do projeto, e passou na busca de termos proibidos.
- **Cadastro do projeto:** os comandos de validação e a lista de comandos do OpenCode foram preenchidos.
- **Backend local (MAT-43):** integrado na main em b76a707 (cartão `t_58526cc9`). Traz a CLI do Supabase 3.0.0, 3 migrações (contas, famílias, vínculos e bebês, com RLS e grants por coluna), 10 testes pgTAP com 123 asserções, seed fictício e job `banco` no CI. Para rodar: `npm run db:start`, `db:reset`, `db:test` e `db:stop`.
- **Direção visual, tokens e protótipo (MAT-34):** integrados na main em e57c844 (cartão `t_dd87ca3d`), depois de 4 revisões. O `web/DESIGN.md` traz os tokens validados, e há as telas Início, Hoje (com modo madrugada) e Sessão, com dados fictícios. Ficam 294 testes, incluindo a geometria de todo texto em 100% e 200% de fonte, em 4 larguras. O G6 ficou entre 7,17 e 7,25, e é esse patamar que a MAT-44 vai elevar.

- **Design docs v0.4 (MAT-32):** integrados na main em 5500c66 (cartão `t_46deffa1`).
  - Entraram o ADR-009, o mapa de páginas, a direção visual, a política de commits, o roadmap e as decisões, os custos, as notas de status e a frase nova do `AGENTS.md`.
  - Ficou aberto um detalhe não bloqueante: a origem "Analise" da linha "Família e conta" do mapa tem 8 palavras, e a regra pede de 4 a 6.

## O que está em andamento

Estado às 17h55:
- **MAT-44 (salto visual):** o cartão `t_10f8dad7` roda num worktree criado em 2a35dc7 (a main com a MAT-34, mais um commit de cofre), com a spec v4 (sha256 `750efcf5`) e o contrato `0d75b04d3288`. O que ele tem de fazer:
  - antes do código, montar 3 direções; vence a de maior nota do award-bar, sem espera (D-1 = não, decisão de Daniel), e na integração o leitor cego do líder confere a escolha;
  - fazer o OpenCode carregar as skills de interface, com prova no recibo;
  - passar por um laço visual de até 3 iterações;
  - fechar o G6 com duas notas independentes, ambas acima de 8,0;
  - usar ícones do lucide-react.
- **MAT-50 (movimento, pendência planejada, itsaplan 214):** pedido de Daniel em 05/11/2026 para trazer as animações da referência, que ficaram de fora da MAT-44. O cartão nasce depois da MAT-44 na main e cobre cinco pontos:
  - a referência gravada em vídeo ou quadros, descrita em sala limpa;
  - `motion` e até 6 componentes animados da lista aprovada;
  - a VIS-08 relaxada só na abertura e nos destaques, com `prefers-reduced-motion` deixando tudo estático;
  - a replica-diff e uma galeria em `GALERIA.html`;
  - duas notas independentes, as duas maiores ou iguais a 8,0.
- **MAT-48a (Pages pelo CI):** a spec v2.2 foi aprovada (sha256 `815e1f94`). O cartão nasce quando a MAT-44 estiver na main. O Pages já foi ativado por Daniel em 05/11/2026 (build_type workflow, endereço https://ded-techstack.github.io/AppMaternidade/). Em 05/11/2026 Daniel criou o projeto Supabase `appmaternidade-demo` (Free, us-east-1, ref caatnppalmwyrldtdooh), com login por e-mail, Site URL e Redirect URL do Pages e um token de 90 dias limitado ao projeto. Os 5 secrets estão no GitHub, conferidos só pelos nomes: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD e SUPABASE_ACCESS_TOKEN. A MAT-48b não espera mais Daniel.
- **Estudo de apps de maternidade (MAT-49, pronto):** o estudo está em `_staging/appmaternidade/PESQ-APPS/ESTUDO_PADROES.md`. Toda tela logada nova (MAT-37 a MAT-41) usa os padrões P1 a P7 e passa pelo `imgdiff` contra os 3 recortes, com teto de 75.
- **MAT-45, MAT-46 e MAT-47 (banco):** as specs v2 já incorporam a 1ª releitura e as decisões comuns de banco (`_staging/appmaternidade/DECISOES_BANCO_20261105.md`, C1 a C9). A base, a MAT-43, já está na main. A 2ª releitura por outra família está parada por falha do runtime Codex do revisor, "codex app-server stdout closed". Os cartões t_6bf153de, t_fcd8ad89 e t_620068a5 foram recriados em worktree e caíram igual. O caso foi escalado à infra no comentário 53.
- **MAT-36 (páginas públicas):** a spec v2 está pronta. A releitura vem depois da MAT-44 na main.

## Roteiro do site completo (pedido de Daniel em 05/11/2026)

Daniel, em 05/11/2026: "não quero só homepage, quero site inteiro funcional". O site deve:
- funcionar de ponta a ponta;
- ter a interface próxima da referência, adaptada para nós;
- ficar publicado, para o professor entrar e usar tudo com dados fictícios.

O acesso é por e-mail e senha, com recuperação por e-mail (decisão de Daniel). O e-mail de contato do site fica pendente.

O trabalho anda em duas trilhas paralelas, uma de banco e uma de tela. Cada cartão tem o próprio worktree.

| Ordem | Tarefa | O que entrega | Depende de |
|---|---|---|---|
| 1 | MAT-34 | protótipo de 3 telas (rodada 2 de correção) | — |
| 1 | MAT-43 | banco local: contas, famílias, vínculos e bebês | revisão com Docker (coordenador) |
| 2 | MAT-44 | salto visual com a referência, base do visual de todas as páginas | MAT-34 |
| 2 | MAT-45, MAT-46, MAT-47 | banco de conta e família, de rotina e de comunidade | MAT-43 |
| 3 | MAT-36 | páginas públicas: Como funciona, Cuidado compartilhado, Desenvolvimento, Regras, Privacidade, Termos, Exclusão, Contato e Sobre | MAT-44 |
| 3 | MAT-37 | telas de entrar, criar conta, recuperar acesso, convite, família e conta, ligadas ao banco | MAT-44, MAT-45 |
| 4 | MAT-38 | Hoje, os 7 registros, Sessão e Histórico ligados ao banco | MAT-37, MAT-46 |
| 4 | MAT-39 | Desenvolvimento: tummy time e atividades, com fontes | MAT-37, MAT-46 |
| 4 | MAT-40 | Comunidade e painel de moderação | MAT-37, MAT-47 |
| 5 | MAT-41 | PWA: offline, sincronização e lembretes | MAT-38 |
| 6 | MAT-48 | publicação: Supabase Free em São Paulo e GitHub Pages pelo CI, com conta de demonstração | push e secrets autorizados por Daniel |
| 7 | MAT-42 | portão final de qualidade e aceite | todas |

**Como o professor vai usar:** o site publicado fala com um projeto Supabase Free em São Paulo, só com dados fictícios.
- Haverá uma conta de demonstração já com família, bebê e uma semana de registros.
- O professor também pode criar a própria conta.
- Daniel cria o projeto e cadastra as chaves como secrets do GitHub. Nenhum agente vê as chaves.

## Regras em vigor desde 03/11/2026

- O OpenCode escreve o código de produto dos cartões `[impl]`. O líder cuida do cartão, das verificações e da integração. A revisão é sempre de outra família.
- Toda devolução do revisor traz a causa: especificacao, implementacao, teste, ambiente ou criterio_novo.
- Toda correção trata a classe do achado, não só o caso, com o teste da variação escrito antes.
- Commits saem com o autor Daniel Macedo, um passo real por commit. O teto é de 800 por dia e não é meta.

## Antes de publicar

Desde 05/11/2026 o push é rotina, por decisão de Daniel. A D7 ficou com a opção A, e o nome de usuário local foi trocado por `<usuario>`.

Depois de cada integração aprovada, o líder faz quatro coisas:
- procura segredos no diff (sk-, ghp_, AKIA, Bearer, password=, api_key=, .env);
- confere o `git status`;
- confere que autor e committer são Daniel Macedo;
- faz o push normal da `main`.

Para o site ficar no ar ainda falta a MAT-48: o projeto Supabase na nuvem e os secrets no GitHub, que ficam com Daniel, e o Pages pelo CI.

## Ver a prévia

Na raiz do repositório:

1. `npm --prefix web ci`
2. `npm --prefix web run dev`

Depois abra http://localhost:5173/ no navegador.

## Questões abertas

- D7 (MAT-26), com Daniel.
- A nota mínima do award-bar (G6) sai na MAT-34.
