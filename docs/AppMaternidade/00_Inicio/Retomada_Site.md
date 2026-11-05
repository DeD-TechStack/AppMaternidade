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
- **Direção visual, tokens e protótipo (MAT-34):** integrados na main em e57c844 (cartão `t_dd87ca3d`), depois de 4 revisões. O `web/DESIGN.md` traz os tokens validados, e há as telas Início, Hoje (com modo madrugada) e Sessão, com dados fictícios. Ficam 294 testes, incluindo a geometria de todo texto em 100% e 200% de fonte, em 4 larguras. O G6 ficou entre 7,17 e 7,25, e é esse patamar que a MAT-44 vai elevar.

- **Design docs v0.4 (MAT-32):** integrados na main em 5500c66 (cartão `t_46deffa1`).
  - Entraram o ADR-009, o mapa de páginas, a direção visual, a política de commits, o roadmap e as decisões, os custos, as notas de status e a frase nova do `AGENTS.md`.
  - Ficou aberto um detalhe não bloqueante: a origem "Analise" da linha "Família e conta" do mapa tem 8 palavras, e a regra pede de 4 a 6.

## O que está em andamento

Estado às 17h55:
- **MAT-44 (salto visual):** o cartão `t_77b96e90` nasceu da main e57c844, com a spec v4 (sha256 `750efcf5`) e o contrato `0d75b04d3288`. O que ele tem de fazer:
  - antes do código, montar 3 direções; vence a de maior nota do award-bar, sem espera (D-1 = não, decisão de Daniel), e na integração o leitor cego do líder confere a escolha;
  - fazer o OpenCode carregar as skills de interface, com prova no recibo;
  - passar por um laço visual de até 3 iterações;
  - fechar o G6 com duas notas independentes, ambas acima de 8,0;
  - usar ícones do lucide-react.
- **MAT-43 (backend local):** está pronta, mas a revisão saiu inconclusiva porque o revisor não tem Docker. Quem decide é o coordenador.
- **MAT-45, MAT-46 e MAT-47 (banco):** as specs v2 já incorporam a 1ª releitura e as decisões comuns de banco (`_staging/appmaternidade/DECISOES_BANCO_20261105.md`, C1 a C9). Falta a 2ª releitura por outra família, que espera os cartões de leitura do revisor, travados na infra.
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
