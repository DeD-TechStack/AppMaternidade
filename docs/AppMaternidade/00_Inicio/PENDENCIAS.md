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
- [~ t_836284e3] P-02 MAT-49a base | g1 t_fdba5bed (arquivada 11/11 com aval do coordenador) escreveu o código; a g2 t_836284e3 (head d65dfeb) está em revisão | depois: revisão, 2 juízes e ff em `int/refazer`
- [x] P-03 Base mostrada a Daniel cedo: `DIRECOES_20261111/GALERIA_BASE.html` aberta e prévia ao vivo em http://127.0.0.1:5281/sistema | 11/11 10h50, sem SHA
- [~ t_26066f02] P-04 MAT-49b Hoje, Sessão e Madrugada | depende de P-02
- [~ t_e1d0eaa8] P-05 MAT-36r-B: as 6 páginas de texto | depende de P-02
- [~ t_d63c932a] P-06 MAT-37r: traz o fad75c0 (dados, sessão, Auth) e refaz Entrar, Criar conta, Recuperar, Começar e Conta | depende de P-02
- [~ t_3c6e3a0c] P-07 MAT-49c Início com cenas | depende só de P-02 desde 11/11 10h15 (cenas compostas com capturas das próprias páginas; P-21 troca pelas telas novas)
- [~ t_ee526db4] P-08 MAT-36r-A: Como funciona, Cuidado compartilhado e Desenvolvimento | depende só de P-02 desde 11/11 10h15

- [~ t_0aecd8d2] P-21 MAT-49d: recompor as cenas de marketing com as telas novas de Hoje, Sessão e Madrugada (só imagens, mesmos nomes de arquivo) | depende de P-04, P-06, P-07 e P-08
- [D coordenador] P-22 Calibração dos juízes: Fable válido. Astra v2 (prompt d008875) dá nota a tudo, mas reprova no F7 os quadros da referência (amarelo e azul) e a F1_home aprovada (mel e oliva), porque a regra pede 'base + 1 destaque'. Proposta: F7 com até 2 destaques de papel fixo, e n/a nos quadros da referência (`juizes/CALIBRACAO0.md`) | sem os 2 juízes válidos, nenhuma página passa

- [ ] P-23 Limpeza depois das páginas: apagar `web/src/paginas/publicas/PaginaSimples.tsx` (usada pelas 9 páginas públicas até a 36r-A e a 36r-B integrarem) e `web/src/componentes/casca/SubmenuEmBreve.tsx` (sem uso desde a base), com `apagar:` no cartão | depende de P-08 e da 36r-B

- [D coordenador] P-24 Aceite visual da /sistema: rodada base49a_r1 válida nos 2 juízes, 0 portões, notas 6,5–6,8 (Fable) e 7,0 (Astra), abaixo de 7,5. Perguntado ao coordenador (campainha t_6bb69b92) se o item 7 vale para a página interna /sistema; a integração da base não espera por isso

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

- [ ] P-17 MAT-50 movimento: conferir se o movimento da 49a e da 49c (DESIGN.md seção 5) cobre a MAT-50; o que faltar vira cartão | depende de P-02 e P-07
- [ ] P-18 MAT-42 portão final de qualidade e aceite: GALERIA final do site inteiro, os 2 juízes por página e a revisão de outra família por lote | depende de P-02 a P-17
- [D] P-19 MAT-48 publicação: merge de `int/refazer` na main e publicação no Pages (os secrets e o projeto Supabase já existem desde 05/11) | espera a decisão de Daniel no fim, depois de P-18
- [x] P-20 MAT-41 PWA | cancelado: Daniel decidiu "sem PWA" (cartão t_ab1bd202 arquivado em 11/11); sem SHA
