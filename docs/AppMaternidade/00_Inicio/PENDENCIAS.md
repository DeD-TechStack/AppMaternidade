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

## Visual novo (Campo de mel)

- [x] P-01 Passo 0: direção aprovada por Daniel (F1 + F2 + F3), `FINAL/DESIGN.md` e ativos gerados | registro 9157f12 e 6c2fb7e
- [x 98c50de] P-02 MAT-49a base (g1 t_fdba5bed + g2 t_836284e3): revisão R3 aprovada, integrada por fast-forward em `int/refazer` (e73e75a..98c50de) | 11/11 12h30
- [x] P-25 49b, 49c, 36r-A e 37r soltos sobre o head d65dfeb com aval do coordenador (t_7326afbf); 5 cartões rodando juntos às 11h30 (4 páginas + revisão R2 da g2) | 11/11, sem SHA (board)
- [x] P-03 Base mostrada a Daniel cedo: `DIRECOES_20261111/GALERIA_BASE.html` aberta e prévia ao vivo em http://127.0.0.1:5281/sistema | 11/11 10h50, sem SHA
- [~ t_606fb2fb] P-04 MAT-49b Hoje, Sessão e Madrugada | g1 t_26066f02 (e6fc1c8) caiu em triage no 2º bloqueio (alvos do casco com 44 px na madrugada) e foi arquivada; g2 t_606fb2fb leva os alvos a 56 px só na madrugada e pede revisão; 49d e 38a religados à g2
- [~ t_e1d0eaa8] P-05 MAT-36r-B: as 6 páginas de texto | depende de P-02
- [~ t_d63c932a] P-06 MAT-37r: traz o fad75c0 (dados, sessão, Auth) e refaz Entrar, Criar conta, Recuperar, Começar e Conta | depende de P-02
- [x 98c50de] P-02 MAT-49a base (g1 t_fdba5bed + g2 t_836284e3): revisão R3 aprovada, integrada por fast-forward em `int/refazer` (e73e75a..98c50de) | 11/11 12h30
- [x 98c50de] P-02 MAT-49a base (g1 t_fdba5bed + g2 t_836284e3): revisão R3 aprovada, integrada por fast-forward em `int/refazer` (e73e75a..98c50de) | 11/11 12h30

- [~ t_0aecd8d2] P-21 MAT-49d: recompor as cenas de marketing com as telas novas de Hoje, Sessão e Madrugada (só imagens, mesmos nomes de arquivo) | depende de P-04, P-06, P-07 e P-08
- [x] P-22 Calibração dos juízes válida nos 2 (rodada 0 e base49a_r1), com a F7 de até 2 destaques (equipe 14e47ed) | 11/11 11h20, sem SHA (staging)

- [ ] P-23 Limpeza depois das páginas: apagar `web/src/paginas/publicas/PaginaSimples.tsx` (usada pelas 9 páginas públicas até a 36r-A e a 36r-B integrarem) e `web/src/componentes/casca/SubmenuEmBreve.tsx` (sem uso desde a base), com `apagar:` no cartão | depende de P-08 e da 36r-B

- [x] P-24 /sistema é informativa (coordenador, 11/11): não segura a integração da base; achados dos juízes (6,5–7,0) levados aos corpos dos 5 cartões de página | 11/11 11h20

- [~ t_889376b8] P-26 Início volta 1 dos juízes cegos (rodada inicio_r1 válida, notas 5,8–7,5, REPROVA volta 1): MAT-49c v2 refaz números e selos no celular, depoimentos e fechamento x rodapé; a 49d (P-21) refaz as cenas com telas do app legíveis e a faixa de cacau sem emenda. Depois, volta 2 dos juízes; se reprovar, vai a Daniel com GALERIA | `juizes/rodadas/inicio_r1/DEVOLUCAO.md`

- [~ t_54db34e0] P-27 Como funciona, Cuidado compartilhado e Desenvolvimento: volta 1 dos juízes cegos (3 rodadas válidas, notas 6,2–7,4, REPROVA volta 1). A MAT-36r-A v2 aplica os itens das páginas e a 49d (P-21) refaz as cenas. Depois, volta 2; se reprovar, vai a Daniel com GALERIA | `juizes/rodadas/DEVOLUCAO_36rA.md`

## Dados ligados às telas novas (religados e soltos em 11/11)

- [x] P-09 Corpos dos 6 cartões abaixo reescritos para a base nova antes do claim (prefixo `FINAL/OVERRIDE_DADOS.md`) e soltos em todo, presos aos pais | 11/11 9h50; sem SHA (é board)
- [~ t_11ad28e6] P-10 MAT-37b: navegação pelo registro, convite, Começar completo e Família | depende de P-06 e P-09
- [~ t_f7bdf7e8] P-11 MAT-38a: dados do Hoje, da Sessão e dos 7 formulários | depende de P-04, P-10 e P-09
- [~ t_7c491177] P-12 MAT-38b: Histórico, detalhe, lixeira e notas | depende de P-11
- [~ t_c9529365] P-13 MAT-39b: tummy time ligado à rotina | depende de P-08 e P-11
- [~ t_4c921e60] P-14 MAT-40a: Comunidade ligada ao banco, no sistema Campo de mel aprovado para o site inteiro | depende de P-06
- [~ t_359ab800] P-15 MAT-40b: painel de moderação | depende de P-14
- [D] P-16 MAT-37g t_1757260d "Entrar com Google" | espera Daniel decidir o Google OAuth; até lá o site mostra "a definir"

## Fechamento

- [x 98c50de] P-02 MAT-49a base (g1 t_fdba5bed + g2 t_836284e3): revisão R3 aprovada, integrada por fast-forward em `int/refazer` (e73e75a..98c50de) | 11/11 12h30
- [x 98c50de] P-02 MAT-49a base (g1 t_fdba5bed + g2 t_836284e3): revisão R3 aprovada, integrada por fast-forward em `int/refazer` (e73e75a..98c50de) | 11/11 12h30
- [D] P-19 MAT-48 publicação: merge de `int/refazer` na main e publicação no Pages (os secrets e o projeto Supabase já existem desde 05/11) | espera a decisão de Daniel no fim, depois de P-18
- [x] P-20 MAT-41 PWA | cancelado: Daniel decidiu "sem PWA" (cartão t_ab1bd202 arquivado em 11/11); sem SHA
