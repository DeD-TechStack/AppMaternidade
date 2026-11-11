---
tipo: pendencias
responsavel: lider-appmaternidade
revisado_em: 2026-11-11
regra: kanban-leader-cycle, seção 0 "Lista durável de pendências"
---

# Pendências do AppMaternidade

MANDATO (Daniel, 05/11/2026; visual refeito em 11/11): o site inteiro funcionando de ponta a ponta (RF-01 a RF-14), com o visual Campo de mel aprovado em 11/11, publicado para o professor entrar e usar tudo com dados fictícios. Fonte: [Retomada do site](Retomada_Site.md), seção "Roteiro do site completo".
ESTADO: ATIVO

Paralelo (Daniel, 05/11): até 5 cartões por projeto; só fica em série o que tem dependência real.

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

## Dados ligados às telas novas (religados e soltos em 11/11)

- [x] P-09 Corpos dos 6 cartões abaixo reescritos para a base nova antes do claim (prefixo `FINAL/OVERRIDE_DADOS.md`) e soltos em todo, presos aos pais | 11/11 9h50; sem SHA (é board)
- [~ t_f2e2d6d8] P-10 MAT-37b g2: convite, Começar completo e Família, com Família no cabeçalho logado e Entrar/Criar conta do cabeçalho ligados a /entrar e /criar-conta (hoje vão a /contato). A g1 t_11ad28e6 caiu em triage, pedindo uma navegação lateral que o DESIGN novo não tem, e foi arquivada
- [~ t_f2e2d6d8] P-10 MAT-37b g2: convite, Começar completo e Família, com Família no cabeçalho logado e Entrar/Criar conta do cabeçalho ligados a /entrar e /criar-conta (hoje vão a /contato). A g1 t_11ad28e6 caiu em triage, pedindo uma navegação lateral que o DESIGN novo não tem, e foi arquivada
- [~ t_7c491177] P-12 MAT-38b: Histórico, detalhe, lixeira e notas | depende de P-11
- [~ t_c9529365] P-13 MAT-39b: tummy time ligado à rotina | depende de 38a e 36r-A
- [~ t_de06bd20] P-14 MAT-40a: Comunidade ligada ao banco | g1 t_4c921e60 bloqueou pela regra de BASE do corpo (o comentário não a sobrepõe) e foi arquivada; a g2 t_de06bd20 tem a base 4c86d1b no corpo
- [~ t_359ab800] P-15 MAT-40b: painel de moderação | depende de P-14
- [D] P-16 MAT-37g t_1757260d "Entrar com Google" | espera Daniel decidir o Google OAuth; até lá o site mostra "a definir"

## Fechamento

- [D] P-19 MAT-48 publicação | espera só o "pode" de Daniel. Checklist pronto:
  1. `int/refazer` com todos os cartões integrados, `npm --prefix web run check` com exit 0 e a CI verde no último SHA (ci.yml, Ubuntu e Windows);
  2. `git merge-base --is-ancestor origin/main origin/int/refazer` com exit 0 e o diff `main..int/refazer` conferido (sem `.env`, sem segredo, sem caminho de usuário);
  3. com o "pode" de Daniel: `git push origin <SHA>:refs/heads/main`, só fast-forward;
  4. o `pages.yml` roda no push da main e publica no GitHub Pages; o `banco-nuvem.yml` aplica as migrações no Supabase com os secrets que existem desde 05/11 (SUPABASE_ACCESS_TOKEN e os demais). O primeiro admin é opcional, pelo `workflow_dispatch`;
  5. conferência pós-publicação: abrir o endereço do Pages, criar uma conta fictícia, registrar uma mamada e ver o Hoje; anotar o SHA e o horário no cofre.
- [D] P-16 continua "a definir" (Entrar com Google), sem bloquear a publicação.
- [x] P-20 MAT-41 PWA | cancelado: Daniel decidiu "sem PWA" (cartão t_ab1bd202 arquivado em 11/11); sem SHA
