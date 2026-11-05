---
tipo: progresso
status: em andamento
responsavel: lider-appmaternidade
revisado_em: 2026-11-03
fontes_principais: board Kanban appmaternidade; itsaplan MAT-27 a MAT-43; git main
---

# Retomada do site: estado em 03/11/2026

Esta é a nota de partida da próxima sessão de trabalho no site. Ela registra o estado da sessão de 03/11/2026. Antes de agir, confira o board `appmaternidade`, o itsaplan (MAT-27 e as tarefas filhas) e o `git log` da main: o estado verdadeiro está lá, não nesta nota.

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

- **Design docs v0.4 (MAT-32):** integrados na main em 5500c66 (cartão `t_46deffa1`).
  - Entraram o ADR-009, o mapa de páginas, a direção visual, a política de commits, o roadmap e as decisões, os custos, as notas de status e a frase nova do `AGENTS.md`.
  - Ficou aberto um detalhe não bloqueante: a origem "Analise" da linha "Família e conta" do mapa tem 8 palavras, e a regra pede de 4 a 6.

## O que está em andamento

A pausa por limite de 03/11/2026 terminou em 05/11/2026, liberada por Daniel. As specs v2 da MAT-34 e da MAT-43 foram aprovadas, cada uma com o Major da releitura corrigido, e os dois cartões rodam em paralelo pelo OpenCode:
- `t_dd87ca3d`: direção visual, tokens e protótipo de Início, Hoje e Sessão;
- `t_58526cc9`: Supabase local, RLS e testes pgTAP.

A integração depende da aprovação do revisor. Na MAT-34, o líder confere também o G9 (sala limpa).

## Próximos passos (quando Daniel voltar)

1. Escrever e aprovar as specs da direção visual e dos tokens (MAT-34) e do backend local com Supabase (MAT-43). Os dois viram cartões `[impl]` executados pelo OpenCode e podem rodar em paralelo.
2. Depois disso, as fatias do site, MAT-36 a MAT-41: site público, conta e família, rotina, desenvolvimento, comunidade e offline.
3. Por último, o portão final (MAT-42).

## Regras em vigor desde 03/11/2026

- O OpenCode escreve o código de produto dos cartões `[impl]`. O líder cuida do cartão, das verificações e da integração. A revisão é sempre de outra família.
- Toda devolução do revisor traz a causa: especificacao, implementacao, teste, ambiente ou criterio_novo.
- Toda correção trata a classe do achado, não só o caso, com o teste da variação escrito antes.
- Commits saem com o autor Daniel Macedo, um passo real por commit. O teto é de 800 por dia e não é meta.

## Antes de publicar

Sem push até Daniel liberar. Antes do primeiro push:
1. decidir a D7 (MAT-26), que trata dos registros dos testes de acesso;
2. retirar dos documentos os caminhos locais da máquina;
3. Daniel autorizar o push.

## Ver a prévia

Na raiz do repositório:

1. `npm --prefix web ci`
2. `npm --prefix web run dev`

Depois abra http://localhost:5173/ no navegador.

## Questões abertas

- D7 (MAT-26), com Daniel.
- A nota mínima do award-bar (G6) sai na MAT-34.
