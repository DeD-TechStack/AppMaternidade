---
tipo: pendencias
responsavel: lider-appmaternidade
revisado_em: 2026-11-11
regra: kanban-leader-cycle, seção 0 "Lista durável de pendências"
---

# Pendências do AppMaternidade

MANDATO (Daniel, 05/11/2026; visual refeito em 11/11): o site inteiro funcionando de ponta a ponta (RF-01 a RF-14), com o visual Campo de mel aprovado em 11/11, publicado para o professor entrar e usar tudo com dados fictícios. Fonte: [Retomada do site](Retomada_Site.md), seção "Roteiro do site completo".
ESTADO: ATIVO

Legenda: `[ ]` aberto · `[~ t_id]` em cartão · `[D]` espera Daniel · `[x SHA]` feito. O id `P-nn` não muda. Em toda wake sem cartão `ready`, `running` ou em revisão, o líder abre no mesmo turno o próximo `[ ]` (spec ou cartão), ou marca `[D]` ou PAUSA.

## Visual novo (Campo de mel)

- [x] P-01 Passo 0: direção aprovada por Daniel (F1 + F2 + F3), `FINAL/DESIGN.md` e ativos gerados | registro 9157f12 e 6c2fb7e
- [~ t_fdba5bed] P-02 MAT-49a base: tokens, fontes, cabeçalho, rodapé, componentes, movimento e `/sistema` | depois: revisão, 2 juízes cegos, ff em `int/refazer`
- [ ] P-03 Mostrar a base a Daniel cedo: GALERIA da base (composição × resultado, 2×) | depende de P-02 aprovada
- [~ t_26066f02] P-04 MAT-49b Hoje, Sessão e Madrugada | depende de P-02
- [~ t_e1d0eaa8] P-05 MAT-36r-B: as 6 páginas de texto | depende de P-02
- [~ t_d63c932a] P-06 MAT-37r: traz o fad75c0 (dados, sessão, Auth) e refaz Entrar, Criar conta, Recuperar, Começar e Conta | depende de P-02
- [~ t_3c6e3a0c] P-07 MAT-49c Início com cenas das telas reais | depende de P-02 e P-04
- [~ t_ee526db4] P-08 MAT-36r-A: Como funciona, Cuidado compartilhado e Desenvolvimento | depende de P-02 e P-04

## Dados ligados às telas novas (cartões em `scheduled`, religados em 11/11)

- [ ] P-09 Reescrever o corpo de cada cartão abaixo para a base nova, ainda sem claim (`edit --body`), e dar `unblock`
- [ ] P-10 MAT-37b t_11ad28e6: navegação pelo registro, convite, Começar completo e Família | depende de P-06 e P-09
- [ ] P-11 MAT-38a t_f7bdf7e8: dados do Hoje, da Sessão e dos 7 formulários | depende de P-04, P-10 e P-09
- [ ] P-12 MAT-38b t_7c491177: Histórico, detalhe, lixeira e notas | depende de P-11
- [ ] P-13 MAT-39b t_c9529365: tummy time ligado à rotina | depende de P-08 e P-11
- [ ] P-14 MAT-40a t_4c921e60: Comunidade ligada ao banco (as telas da Comunidade ainda não têm direção própria: usar o DESIGN.md e mostrar a Daniel antes do código, pela regra do passo 0) | depende de P-06
- [ ] P-15 MAT-40b t_359ab800: painel de moderação | depende de P-14
- [D] P-16 MAT-37g t_1757260d "Entrar com Google" | espera Daniel decidir o Google OAuth; até lá o site mostra "a definir"

## Fechamento

- [ ] P-17 MAT-50 movimento: conferir se o movimento da 49a e da 49c (DESIGN.md seção 5) cobre a MAT-50; o que faltar vira cartão | depende de P-02 e P-07
- [ ] P-18 MAT-42 portão final de qualidade e aceite: GALERIA final do site inteiro, os 2 juízes por página e a revisão de outra família por lote | depende de P-02 a P-17
- [D] P-19 MAT-48 publicação: merge de `int/refazer` na main e publicação no Pages (os secrets e o projeto Supabase já existem desde 05/11) | espera a decisão de Daniel no fim, depois de P-18
- [x] P-20 MAT-41 PWA | cancelado: Daniel decidiu "sem PWA" (cartão t_ab1bd202 arquivado em 11/11); sem SHA
