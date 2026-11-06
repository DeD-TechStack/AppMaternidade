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
