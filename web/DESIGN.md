---
version: alpha
name: AppMaternidade — A casa acesa
description: "Papel quente, cacau, areia e o mel só como luz, em faixas de ponta a ponta nas páginas públicas (a área logada segue o Campo de mel até o DS-2). Literata nos títulos e Outfit no texto. Um quadro de 1200 px até 1440 (1600 px em 2560) com uma borda esquerda por página, e espaço e tipo de duas escalas curtas, medidas no Pato Jack e na Good Inside (MEDIDAS.md) e fluidas de 320 a 1920 px."
colors:
  papel: "#F8F6EB"
  mel: "#F2C14E"
  mel-claro: "#F7D684"
  oliva: "#697255"
  oliva-tinta: "#4F5740"
  cacau: "#2B2320"
  areia: "#EADDC5"
  texto-2: "#6E6560"
  branco: "#FFFFFF"
  noite: "#2B2320"
  noite-cartao: "#3A302B"
  noite-2: "#B9C09F"
typography:
  exibicao-390:
    fontFamily: Literata
    fontSize: 44px
    fontWeight: 600
    lineHeight: 48px
  exibicao-1440:
    fontFamily: Literata
    fontSize: 80px
    fontWeight: 600
    lineHeight: 84px
  titulo-1-390:
    fontFamily: Literata
    fontSize: 34px
    fontWeight: 600
    lineHeight: 40px
  titulo-1-1440:
    fontFamily: Literata
    fontSize: 48px
    fontWeight: 600
    lineHeight: 54px
  titulo-2-390:
    fontFamily: Literata
    fontSize: 28px
    fontWeight: 600
    lineHeight: 34px
  titulo-2-1440:
    fontFamily: Literata
    fontSize: 36px
    fontWeight: 600
    lineHeight: 42px
  titulo-3-390:
    fontFamily: Literata
    fontSize: 22px
    fontWeight: 600
    lineHeight: 28px
  titulo-3-1440:
    fontFamily: Literata
    fontSize: 28px
    fontWeight: 600
    lineHeight: 34px
  titulo-4-390:
    fontFamily: Literata
    fontSize: 19px
    fontWeight: 600
    lineHeight: 25px
  titulo-4-1440:
    fontFamily: Literata
    fontSize: 22px
    fontWeight: 600
    lineHeight: 28px
  abertura-390:
    fontFamily: Outfit
    fontSize: 19px
    fontWeight: 400
    lineHeight: 28px
  abertura-1440:
    fontFamily: Outfit
    fontSize: 22px
    fontWeight: 400
    lineHeight: 32px
  corpo-390:
    fontFamily: Outfit
    fontSize: 17px
    fontWeight: 400
    lineHeight: 26px
  corpo-1440:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: 400
    lineHeight: 28px
  pequeno-390:
    fontFamily: Outfit
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
  pequeno-1440:
    fontFamily: Outfit
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
  sobretitulo-390:
    fontFamily: Outfit
    fontSize: 15px
    fontWeight: 600
    lineHeight: 20px
  sobretitulo-1440:
    fontFamily: Outfit
    fontSize: 15px
    fontWeight: 600
    lineHeight: 20px
rounded:
  painel: 24px
  cartao: 20px
  pilula: 999px
  campo: 14px
spacing:
  junto-390: 8px
  junto-1440: 12px
  pilha-390: 16px
  pilha-1440: 16px
  grupo-390: 24px
  grupo-1440: 32px
  bloco-390: 24px
  bloco-1440: 48px
  midia-390: 32px
  midia-1440: 64px
  secao-390: 48px
  secao-1440: 80px
  secao-ampla-390: 72px
  secao-ampla-1440: 128px
  painel-390: 24px
  painel-1440: 48px
  quadro-largura: 1200px
  quadro-largura-2560: 1600px
  quadro-calha-390: 20px
  quadro-calha-1440: 32px
  medio: 880px
  leitura: 640px
components:
  botao-primario:
    backgroundColor: "{colors.cacau}"
    textColor: "{colors.papel}"
    rounded: "{rounded.pilula}"
    padding: 28px
    height: 56px
  botao-primario-hover:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.cacau}"
    rounded: "{rounded.pilula}"
    height: 56px
  botao-mel:
    backgroundColor: "{colors.mel}"
    textColor: "{colors.cacau}"
    rounded: "{rounded.pilula}"
    padding: 28px
    height: 56px
  botao-mel-hover:
    backgroundColor: "{colors.cacau}"
    textColor: "{colors.mel}"
    rounded: "{rounded.pilula}"
    height: 56px
  campo-entrada:
    backgroundColor: "{colors.branco}"
    textColor: "{colors.cacau}"
    rounded: "{rounded.campo}"
    height: 56px
  painel-mel:
    backgroundColor: "{colors.mel}"
    textColor: "{colors.cacau}"
    rounded: "{rounded.painel}"
  painel-oliva:
    backgroundColor: "{colors.oliva}"
    textColor: "{colors.papel}"
    rounded: "{rounded.painel}"
  painel-areia:
    backgroundColor: "{colors.areia}"
    textColor: "{colors.cacau}"
    rounded: "{rounded.painel}"
  painel-cacau:
    backgroundColor: "{colors.cacau}"
    textColor: "{colors.papel}"
    rounded: "{rounded.painel}"
---

## Overview

**A casa acesa (páginas públicas).** As páginas públicas são uma casa de paredes e chãos: faixas de ponta a ponta em papel, cacau, areia e `chao-noite`, uma única cena de estúdio por página e o produto de verdade numa moldura de aparelho. Sem painel, sem cartão, sem sombra e sem gradiente; o mel aparece só como luz (e como botão primário sobre o cacau). A tese vem do FREEZE §2 (`.oc/ref/`), e as peças que a montam moram em `web/src/componentes/secoes/` (veja Components).

**Campo de mel (área logada, até o DS-2).** O AppMaternidade logado mantém a cara de um campo de mel: papel quente de fundo, painéis de cor com raio grande (mel, oliva, areia e cacau), títulos em Literata e texto em Outfit. A direção "Campo de mel" foi aprovada por Daniel em 11/11/2026 e é a que o código roda (`web/src/styles/tokens.css`). A área logada é feita para o colo e para a madrugada, com um tema escuro de pouco brilho (a noite) e alvos grandes.

Este arquivo é a **fonte única** de espaço, tipo e contêiner. O script `npm --prefix web run tema` lê o front matter e gera `web/src/styles/harmonia.gerado.css`, e um teste do `npm run check` falha se o arquivo gerado divergir de uma geração nova. As cores e os raios continuam escritos à mão em `tokens.css`; um teste confere que as 12 cores daqui são iguais às de lá.

Os números de espaço e de tipo saem de `MEDIDAS.md` (medida em navegador real, `getComputedStyle`, em 1440 e 390, no Pato Jack, na Good Inside e no nosso site). Cores, famílias, raios, sombras, textos, imagens e cenas não mudam com a harmonia.

## Colors

Doze papéis, todos em `tokens.css`. Nada de cor solta fora dele.

- **Papel (`papel`, #F8F6EB):** fundo de toda página clara.
- **Cacau (`cacau`, #2B2320):** texto, botão primário e painel escuro. Anel de foco no papel claro, 14:1.
- **Mel (`mel`, #F2C14E) e mel claro (`mel-claro`, #F7D684):** painel de destaque, botão mel e a luz de estúdio. Na madrugada o mel é o destaque.
- **Oliva (`oliva`, #697255) e oliva tinta (`oliva-tinta`, #4F5740):** painel oliva, com texto de papel (4,7:1).
- **Areia (`areia`, #EADDC5):** painel claro e fundo de etiqueta.
- **Texto 2 (`texto-2`, #6E6560):** legendas e ajuda.
- **Branco (`branco`, #FFFFFF):** cartão e campo de entrada.
- **Noite (`noite`, #2B2320), cartão da noite (`noite-cartao`, #3A302B) e texto 2 da noite (`noite-2`, #B9C09F):** o tema madrugada, só nas telas da Rotina (`/app/hoje`, `/app/sessao` e os formulários `/app/registro/*`).

**Papéis de chão nas páginas públicas (A casa acesa).** Paredes e chãos são `papel`, `cacau`, `areia` e `chao-noite` (o `texto-2`, #6E6560, como chão). Texto de cacau sobre papel e areia; texto de papel sobre cacau e `chao-noite` (papel sobre `chao-noite` dá 5,25:1; cacau sobre ele dá 2,7:1 e é proibido). O mel não é chão: é luz e o botão primário da noite (texto de cacau). O oliva só existe dentro das capturas e das placas de estúdio.

A cor nunca é a única pista: erro, estado e seleção levam também ícone, texto ou contorno.

## Typography

Duas famílias, SIL OFL 1.1, auto-hospedadas pelo `@fontsource-variable` (registro em `web/PROVENANCE.md`): **Literata** nos títulos e **Outfit** no texto e na interface. Nenhum texto em caixa alta. Nada menor que 15 px.

Nove níveis. Cada nível tem dois pares de tamanho e entrelinha, um para 390 px de viewport e outro para 1440 px. A escala tem quatro âncoras: 320, 390, 1440 e 1920. Entre 390 e 1440 a medida cresce em linha reta, e a mesma reta continua para baixo até 320 e para cima até 1920; abaixo de 320 e acima de 1920 ela fica parada (o piso e o teto do `clamp` do tema gerado). Os valores de 320 e de 1920 não são escritos aqui: o gerador os tira da reta. Piso de leitura: nenhum nível fica menor que o `corpo` de 390 (17 px); o nível cuja reta cairia abaixo disso em 320 (hoje só o próprio `corpo`) para no par de 390. Assim, em 320 a exibição tem 41,6 px e o corpo 17/26, e em 1920 a exibição tem perto de 96 px e o corpo perto de 18,5 px. O tamanho e a entrelinha são em rem no tema (16 px = 1 rem com a fonte a 100%).

| Nível | 390 (tamanho/entrelinha) | 1440 | Família e peso | Uso (P4 da SPEC H) |
|---|---|---|---|---|
| `exibicao` | 44/48 | 80/84 | `--fonte-exibicao`, peso `--peso-exibicao` (600) | `h1` de toda página de conteúdo (Início, Como funciona, Cuidado compartilhado, Desenvolvimento, textos de leitura e 404) e da `/sistema` |
| `titulo-1` | 34/40 | 48/54 | Literata 600 | `h1` das telas de acesso e das telas logadas; títulos de seção (`h2`) das páginas de conteúdo |
| `titulo-2` | 28/34 | 36/42 | Literata 600 | títulos de bloco menores |
| `titulo-3` | 22/28 | 28/34 | Literata 600 | `h3` |
| `titulo-4` | 19/25 | 22/28 | Literata 600 | títulos de cartão e de passo |
| `abertura` | 19/28 | 22/32 | Outfit 400 | texto de abertura e a legenda de uma faixa |
| `corpo` | 17/26 | 18/28 | Outfit 400 | texto corrido |
| `pequeno` | 15/22 | 15/22 | Outfit 400 | legendas, etiquetas, rótulos |
| `sobretitulo` | 15/20 | 15/20 | Outfit 600 | só os títulos dos grupos do rodapé; nunca dentro do `main` de uma página pública; sem caixa alta |

Razão entre os títulos de ≈ 1,25 no desktop e ≈ 1,2 no celular (as referências sobem por 1,2 a 1,25). A razão exibição/corpo é 4,4 no desktop (80/18) e 2,6 no celular (44/17), entre o herói do Pato Jack e da Good Inside (3,0) e o estudo de caso da Good Inside (4,8): o `h1` das páginas de conteúdo é o maior tipo da tela e fica sozinho (no mínimo 72 px em 1440 e 40 px em 390). O corpo fica em 18/28 e 17/26, acima das referências (15 a 16 px), por ser lido de madrugada com o bebê no colo (P1). `sobretitulo` e `pequeno` ficam em 15 px porque a regra "nada menor que 15 px" vale para o site inteiro. Linha de leitura de 60 a 80 caracteres no desktop.

O espaçamento entre letras (tracking) dos títulos continua o do código até a aplicação (H-3): `h1` −0,02 em, `h2` −0,015 em e `h3` −0,01 em (`web/src/styles/site.css:52,59,66`); o resto, 0.

Itálico: nenhum nas páginas públicas, em nenhum elemento; a área logada não entra nesta regra até o DS-2.

Variantes de exibição (temporárias, até o FG-2b): `tokens.css` guarda três blocos de tokens para o `h1`. A é o padrão (Literata 600). B, escolhida por `?exibicao=b` e lida uma vez em `main.tsx` que põe `data-exibicao` na raiz, usa M PLUS Rounded 1c (`@fontsource/m-plus-rounded-1c`, latin 700 e 800) com peso 800 na exibição e 700 nos títulos. C, por `?exibicao=c`, é Literata 600 em 64/68 em 1440 e 40/44 em 390. Os tamanhos de A e de B são os da tabela; nada mais seleciona por `data-exibicao`, e o FG-2b fica com um bloco só e apaga os outros dois.

A face dos títulos é a variável `--fonte-exibicao` (declarada uma só vez, em `tokens.css`), e os pesos são `--peso-exibicao` e `--peso-titulo` (600 os dois). Uma troca de face muda esses três tokens e mais nada. A ênfase é por peso, nunca por inclinação.

### Fora da escala (`fora-da-escala: true`)

Estes estilos **não entram** na escala de nove níveis, nem no tema gerado. Os valores abaixo foram lidos do código em a003fe4.

- **`numero`** (`fora-da-escala: true`): Literata 700, `tabular-nums lining-nums`. Padrão 7 rem / 5,625 rem (112/90 px), em `web/src/index.css:308-315`. Os números do Hoje caem para 3,5 rem / 2,8125 rem até 767 px e vão a 7 rem a partir de 1400 px (`web/src/index.css:1027-1030` e `1166-1170`).
- **`cronometro`** (`fora-da-escala: true`): Literata 700, tabular. Padrão 14 rem / 11,25 rem (224/180 px) e 6 rem / 4,8125 rem até 767 px (`web/src/index.css:317-324` e `373-376`). O cronômetro da Sessão tem tamanho próprio: 5 rem / 4 rem até 767 px (`web/src/index.css:1062-1065`), e o modo longo, 10 rem / 8 rem (`web/src/index.css:905-908`) e 3,5 rem / 2,8125 rem até 767 px (`web/src/index.css:1067-1070`).
- **`botao`** (`fora-da-escala: true`): `.cm-botao`, Outfit 500, 1,125 rem (18 px), entrelinha 1,2, altura mínima 56 px, padding lateral 28 px, vão de 10 px entre ícone e texto, contorno de 1,5 px, raio pílula (`web/src/styles/site.css:125-150`). A variante do app (`data-tamanho='app'`): altura mínima 48 px, padding lateral 22 px, 1,0625 rem (17 px) (`web/src/styles/site.css:156-160`). No bloco "Em andamento" do Hoje, o botão desce para 1,25 rem até 767 px (`web/src/index.css:1015-1017`).
- **Marca do cabeçalho** (`fora-da-escala: true`): `.cm-marca`, Literata 600, 1,25 rem / 1,5 rem (20/24) abaixo de 640 px (com a pílula "Criar conta" na linha de 390, a marca, a pílula e o menu só cabem a 20 px) e 1,5 rem / 1,5 rem (24/24) de 640 em diante, tracking −0,01 em (`web/src/styles/site.css`).
- **`exibicao-404`** (`fora-da-escala: true`): `.cm-exibicao-404`, `--fonte-exibicao` com `--peso-exibicao`, 112/112 em 1440 e 56/58 em 390, em linha reta entre os dois (`--texto-exibicao-404-tamanho` e `-entrelinha` em `site.css`). Só o `h1` da página não encontrada (REP-T4); nenhuma página o usa no DS-1a.

## Layout

O espaço vem de uma escala de oito papéis (`junto`, `pilha`, `grupo`, `bloco`, `midia`, `secao`, `secao-ampla`, `painel`), cada um com um valor para 390 e outro para 1440, mais os valores do quadro. Cada vão da página usa o token do seu papel, nunca um número solto. As âncoras são as mesmas do tipo (320, 390, 1440 e 1920): entre 390 e 1440 o valor cresce em linha reta, a mesma reta segue até 320 e até 1920, e fora delas o valor é constante (o `clamp` do tema gerado). O espaço é em px.

### Glossário

- **Quadro:** a faixa onde fica o conteúdo da página. Largura do conteúdo `min(quadro-largura, viewport − 2 × calha)`, centrada. A borda esquerda do quadro é **a borda** da página: todo texto fora de painel começa nela.
- **Calha:** 20 px em 390 e 32 px em 1440, na reta das quatro âncoras (cerca de 19 px em 320 e 37 px em 1920; `quadro-calha`). A largura do quadro (`quadro-largura`) é 1200 px até 1440 e cresce em reta até `quadro-largura-2560` (1600 px) em 2560.
- **Seção:** uma faixa vertical da página, filha direta do `<main>`, ou o cabeçalho, ou o rodapé. Tem padding de topo e de base e nenhuma margem.
- **Painel (área logada apenas):** seção com fundo de cor (mel, cacau, oliva, areia), desenhada como caixa de raio 24 cujas bordas laterais coincidem com as do quadro. O conteúdo do painel começa na borda + `painel`. As páginas públicas não têm painel: usam as faixas de ponta a ponta (`FaixaInteira`, veja Components).
- **Seções compartilhadas (páginas públicas):** as peças de `web/src/componentes/secoes/` (`PaginaCasa`, `FaixaInteira`, `CenaHeroi`, `ProdutoEmMoldura`, `Legenda`, `FaixaProva`, `Perguntas`, `BotaoLargo` e `Fechamento`) são as primitivas públicas de composição, e todo espaço delas vem de `secao`, `bloco`, `grupo`, `pilha` e `junto`.
- **Contêiner de texto:** `medio` (880 px) e `leitura` (640 px) são larguras máximas de blocos de texto **alinhados à borda** do quadro, não centrados. Exceção única: a seção `centrada` (um título e uma ação, como o fechamento do Início), cujo texto é centrado no quadro.
- **Pilha:** um grupo vertical de blocos com um vão fixo, dado por um token de papel.
- **Bloco:** filho direto de uma pilha, de uma seção ou de uma grade.
- **Corpo corrido:** elemento `p` com mais de 120 caracteres dentro de um contêiner `leitura`.
- **Rotina:** as telas `/app/hoje`, `/app/sessao` e os formulários `/app/registro/*`, as únicas com o tema madrugada.

### Qual token vai em qual vão

| Token | 390 | 1440 | Onde vai | Origem em MEDIDAS.md |
|---|---|---|---|---|
| `junto` | 8 | 12 | sobretítulo → título; rótulo → campo | §3: PJ 14, GIh 12, GIc 8 |
| `pilha` | 16 | 16 | título → texto; parágrafo → parágrafo; vão padrão da pilha | §3: PJ 16, nós 16 |
| `grupo` | 24 | 32 | texto → ação ou conteúdo do bloco | §3: PJ 28 a 31, GIc 32/16 |
| `bloco` | 24 | 48 | vão entre blocos da seção; entre colunas de texto; entre dois painéis seguidos | §3: PJ 48 a 64 / 24 a 36, GIh 48/24 |
| `midia` | 32 | 64 | mídia ↔ texto, lado a lado ou empilhado | §6: PJ 56 a 110 / 24 a 26 |
| `secao` | 48 | 80 | padding de topo e de base de toda seção; vão entre duas seções = 2 × `secao`; nenhuma margem entre seções | §1: padding PJ ≈ 80 a 88 / 48, GIh ≈ 80/60 |
| `secao-ampla` | 72 | 128 | padding de topo da primeira seção da página e de base da última antes do rodapé | §1: PJ 112 a 134 / 92 a 100 |
| `painel` | 24 | 48 | padding lateral de painel e padding de cartão | §3: PJ 48/56 e 28/22, GIh 40 a 50 / 20 a 32 |

Todos os valores são os de `MEDIDAS.md` §7. Nenhum foi mudado pelo H-2. Duas leituras de §1 e §4 já estavam corrigidas lá (revisão de 13/11): `secao` é 80/48 (e não 96/56) porque §1 compara padding com padding; `sobretitulo` perdeu a caixa alta e `pequeno` em 390 subiu de 14 para 15 px pela regra de 15 px.

### Classes do Tailwind

O tema gerado (`web/src/styles/harmonia.gerado.css`) liga cada papel de espaço a utilitários reais do Tailwind. Todo papel leva o mesmo prefixo `esp-`, sem exceção, para nenhum utilitário colidir com uma classe escrita à mão: as páginas de texto já têm `.pt-junto`, `.pt-secao` e `.pt-painel` (`web/src/componentes/publicas-texto/publicasTexto.css:39,75,149`; `PaginaDeLeitura.tsx:24,97`; `SecaoDeTexto.tsx:12`), e um apelido sem prefixo faria o Tailwind gerar um `padding-top` para elas. O H-3 usa exatamente estes nomes. Um teste do `gerar-tema` compila o tema com o Tailwind instalado e confere cada papel e cada família.

| Papel | Sufixo da classe | Variável | Exemplos |
|---|---|---|---|
| `junto` | `esp-junto` | `--espaco-junto` | `gap-esp-junto`, `mb-esp-junto` |
| `pilha` | `esp-pilha` | `--espaco-pilha` | `gap-esp-pilha`, `space-y-esp-pilha` |
| `grupo` | `esp-grupo` | `--espaco-grupo` | `gap-esp-grupo`, `mt-esp-grupo` |
| `bloco` | `esp-bloco` | `--espaco-bloco` | `gap-esp-bloco`, `gap-x-esp-bloco` |
| `midia` | `esp-midia` | `--espaco-midia` | `gap-esp-midia`, `gap-y-esp-midia` |
| `secao` | `esp-secao` | `--espaco-secao` | `py-esp-secao`, `pt-esp-secao`, `pb-esp-secao` |
| `secao-ampla` | `esp-secao-ampla` | `--espaco-secao-ampla` | `pt-esp-secao-ampla`, `pb-esp-secao-ampla` |
| `painel` | `esp-painel` | `--espaco-painel` | `p-esp-painel`, `px-esp-painel` |
| `quadro-calha` (calha do quadro) | `esp-quadro-calha` | `--quadro-calha` | `px-esp-quadro-calha` |

A classe é `<família>-<sufixo>`, e a família é qualquer utilitário de espaço do Tailwind: `p`, `px`, `py`, `pt`, `pr`, `pb`, `pl`, `m`, `mx`, `my`, `mt`, `mr`, `mb`, `ml`, `gap`, `gap-x`, `gap-y`, `space-x` e `space-y`. Os nomes sem prefixo (`p-secao`, `gap-bloco`...) não existem. O tipo segue como `text-<nível>` (`text-exibicao`, `text-titulo-1` a `text-titulo-4`, `text-abertura`, `text-corpo`, `text-pequeno`, `text-sobretitulo`), e os contêineres, como `max-w-medio`, `max-w-leitura` e `max-w-quadro`.

### Quadro e contêineres

- `quadro-largura`: 1200 px até 1440 px de viewport; daí em diante cresce em reta até 1600 px em 2560 (`quadro-largura-2560`) e para. A reta começa em 1440, e não em 1920, para que a página use a tela grande sem que o quadro mude abaixo de 1440; a medida das linhas não cresce com ele, porque o texto corrido continua preso a `leitura` e a `medio`.
- `quadro-calha`: 20 px em 390 e 32 px em 1440, em `clamp`, na reta de 320 a 1920.
- `medio`: 880 px, para blocos de texto de duas ou três colunas e subtítulos longos, alinhado à borda.
- `leitura`: 640 px, para texto corrido (perto de 76 caracteres a 18 px, dentro de 60 a 80), alinhado à borda.
- Todo conteúdo da seção começa na borda do contêiner: há **uma** borda esquerda por página. O painel recua o conteúdo só por `painel`.
- Lado a lado, as proporções viram frações do quadro: herói texto/cena 7/5, acesso 7/5, Conta índice/conteúdo 3/9, linha rótulo + texto (`.sb-linha`) 2fr/3fr, cronômetro 7/3. O vão entre texto e mídia é `midia`; entre colunas de texto, `bloco`. Os pontos de quebra de hoje (767, 991, 1024 e 1200 px) ficam.

### Primitivas

As primitivas de layout ficam em `web/src/componentes/base/layout/` e têm um marcador `data-h` cada (aceita mais de um valor separado por espaço, e a medida usa o seletor `~=`): `Secao` (`data-h="secao"`, variante em `data-h-variante`: `painel` ou `centrada`; o painel leva a caixa de cor dentro, `data-h="caixa-cor"`), `QuadroLayout` (`data-h="quadro"`, `data-h-largura`: `quadro`, `medio` ou `leitura`), `Pilha` (`data-h="pilha"`, `data-h-vao`: o papel do vão), `Colunas` (`data-h="colunas"`, `data-h-vao`: `midia` ou `bloco`, `data-h-quebra`: a largura em que ficam lado a lado; cada filha leva `coluna`) e `Cartao` (`data-h` contém `cartao`). Todo espaço delas vem das variáveis `--espaco-*` e `--quadro-*` deste arquivo, sem px solto.

### Área de conta (MAT-37)

As telas de acesso (Entrar, Criar conta, Recuperar acesso, Nova senha e Conta excluída) e a de Começar usam o Campo de mel: o cabeçalho e o rodapé são os da casca, e o aviso de demonstração mora no rodapé. A moldura de cada tela não desenha marca, cabeçalho nem aviso próprios.

- **Telas de acesso, em 1440 (a partir de 64 rem):** duas colunas, 7/5 do quadro e `midia` entre elas. À esquerda, o formulário no papel: `h1` em Literata 600 no nível `titulo-1`, em prumo (sem itálico) e com linhas de até 17 caracteres para caberem na coluna; depois a frase, os campos de 56 px com raio 14 (48 px em Começar e Conta), a pílula primária de 56 px de largura cheia e, sobre um fio de 1 px, os links secundários, sempre sublinhados e com alvo de 44 px. O tamanho de botões e campos vem de `cm-botao` e `cm-campo-entrada`, sem `alvo-toque`. À direita, um painel de mel com a luz de estúdio e a cena `web/public/cenas/acesso/entrar` (512 × 768 em 1×, cortada por cima e por baixo para encher a altura da coluna). A coluna do formulário se centra na altura do painel, sem sobra vazia ao lado. O painel começa no alto da primeira dobra.
- **Em 390:** uma coluna só, o formulário primeiro e o painel com a cena depois, com 352 px de altura.
- **Começar:** a mesma moldura de duas colunas; o passo "Seu nome" fica num cartão branco de raio 20, sem sombra, ao lado da cena.
- **Conta:** sem cena. Índice das seções à esquerda a partir de 64 rem (sai no celular) e, à direita, cada seção numa linha de duas colunas (texto e controles) separada por um fio de 1 px. A zona de perigo (excluir a conta) é um cartão de raio 20 com contorno de 1,5 px. Uma barra fina logo abaixo do cabeçalho traz o link da Conta, o do protótipo do Hoje e o "Sair"; acima dela, sem banco, a linha única do aviso de demonstração (o rodapé do app não a traz).
- **Erros e estados:** o erro de campo e o resumo de erro levam ícone e palavras, nunca só a cor; a confirmação de uma ação aparece numa região de status com ícone. Os campos, os botões, a madrugada e o foco são os da base (`cm-campo-*`, `cm-botao-*`, variáveis `--cor-*`); nenhuma tela desta área traz token, sombra, gradiente ou ilustração à mão fora deles.

Alcance de duas regras gerais desta base na área de conta:

- **"Toda confirmação tem Desfazer"** vale para os registros da rotina. Na área de conta, a ação irreversível (excluir conta, excluir família, remover acesso, sair da família, cancelar convite) pede confirmação antes, numa caixa de diálogo. A ação reversível (mudar o papel de outra pessoa, arquivar, editar) mostra a confirmação na região de status, com o controle inverso na mesma tela. A exceção é rebaixar o próprio papel: quem rebaixa perde os controles de responsável e não tem como desfazer sozinho, então a caixa "mudar papel" aberta na própria linha avisa disso antes do botão de confirmar.
- **Os 56 px de altura na madrugada** valem para as ações de registro, como na base (`--alvo-rapido`). Na área de conta valem os mínimos gerais: 44 × 44 px em links e controles, 48 px nos botões e 56 px na ação principal de cada formulário, nos dois temas.

#### Família, convite e navegação (MAT-37b)

- **Navegação logada:** é a do cabeçalho da casca, com Hoje, Sessão, Comunidade e Família (`/app/familia`), lida do registro de áreas (`rotas/navegacao.ts`). Não há barra inferior, faixa lateral nem item "Em breve": cada tela nova acrescenta o seu item quando existir. Entrar e Criar conta do cabeçalho levam a `/entrar` e `/criar-conta`.
- **Convite (`/convite`):** a moldura pública de duas colunas da área de conta, com a prévia (família, quem convidou e papel) no cartão branco de raio 20, sem sombra, e a ação principal em `cm-botao`, largura cheia. Fragmento inválido é recusado por inteiro, sem consulta ao banco.
- **Começar (escolha):** "Criar uma família" e "Tenho um convite" como duas opções de mesmo peso, na moldura de duas colunas; criar família pede nome, fuso e o primeiro bebê.
- **Família (responsável):** seções em linhas de duas colunas separadas por fio de 1 px (membros, bebês, convites, ações). Controles de responsável ficam ausentes do DOM para o cuidador e seguem o papel relido. Ação irreversível pede caixa de diálogo; o aviso de autorrebaixamento vale como na área de conta.
- **Sem token novo:** campos, botões, madrugada e foco são os da base; nenhuma tela traz sombra, gradiente ou ilustração à mão.
- **Direção:** vem do DESIGN.md aprovado em 11/11; esta tela não tem nota própria do worker. O aceite visual é dos juízes cegos do líder.

### Comunidade (MAT-40a)

As sete telas da Comunidade (Comunidade, Espaço, Tópico, Novo tópico e edição, Entrar na comunidade, Meu perfil público e Minhas denúncias) moram na moldura das telas logadas e usam só o que a base já tem: o cabeçalho e o rodapé da casca, os campos e botões `cm-campo-*` e `cm-botao-*`, e as variáveis `--cor-*`. Nenhuma tela desta área traz token, sombra, gradiente, ícone ou ilustração à mão fora deles.

- **Selo e aviso de saúde:** toda tela abre com o selo de texto da comunidade; Comunidade, Espaço e Tópico levam também o aviso de saúde com o link "Onde pedir ajuda agora".
- **Texto publicado:** todo tópico e toda resposta, novo ou editado, passa por prévia e confirmação; nada vai ao banco antes do segundo toque. A resposta cita uma resposta de um nível só.
- **Estados:** carregando, vazio, erro com frase fixa e "Tente de novo", e envio com resultado incerto, que confere antes de reenviar. O apelido é sempre texto, nunca link; o autor removido aparece como "pessoa removida".
- **Exceção ao "Desfazer":** publicar é irreversível para quem lê, então a confirmação vem antes (prévia), e o Desfazer não existe depois. Editar e excluir o que é seu seguem a regra geral.
- **Tema e movimento:** as telas seguem o `data-tema` e o `prefers-reduced-motion` da base, com alvos de 44 px e foco visível.

### Desenvolvimento (MAT-39)

A página logada `/app/desenvolvimento` e as rotas de item (`/app/desenvolvimento/conteudo/<id>`) moram na moldura das telas logadas, com o cabeçalho da casca (item "Desenvolvimento" entre Sessão e Comunidade), o `PainelCampo` (`data-painel="mel"`) e as variáveis `--cor-*` da base. Nenhum token, sombra, gradiente ou ícone novo.

- **Primeira dobra:** título "Desenvolvimento" com a linha do bebê e da fase, o seletor de bebê quando há mais de um, e logo abaixo o lugar do bloco de tummy time (MAT-39b) com a ação principal como botão.
- **Blocos:** "Ideias para brincar nesta fase", "Todas as fases" e "Para ler". Todo conteúdo vem de `conteudo/desenvolvimento`, publicado, com fonte com link e o aviso de que não substitui orientação médica.
- **Estados:** carregando, erro com "Tente de novo", sem família, sem bebê, fuso inválido, bebê arquivado e item que não existe, cada um com frase fixa.
- **Tema e alvos:** segue o `data-tema` (madrugada incluída) e o `prefers-reduced-motion`; alvos de 56 px nas ações e 44 px nos links.
- **Exceção ao "Desfazer" (tummy time):** encerrar uma sessão não tem Desfazer, porque no banco o `fim` preenchido não volta a nulo. A confirmação tem só \"Fechar\". A exceção vale só para o bloco de tummy time; descartar e registrar \"Fizemos agora\" continuam com Desfazer dentro do prazo.
- **Regra do envio (tummy time):** enquanto uma gravação está em andamento, as ações do bloco ficam desativadas com o motivo ao lado e o seletor de bebê fica travado. Resultado desconhecido nunca vira \"nada foi salvo\": o bloco confere o banco antes de oferecer reenviar.

### Painel de moderação (MAT-40b)

As cinco telas do painel (Fila, Denúncia, Conteúdo, Auditoria e Papéis) moram na mesma moldura das telas logadas e usam só o que a base e a Comunidade já têm: casca, campos `cm-campo-*`, botões `cm-botao-*`, cartões e as variáveis `--cor-*`. Nenhum token, sombra, gradiente ou ícone novo.

- **Selo e abas:** toda tela abre com o selo de uso interno e as abas Fila, Auditoria e Papéis (a aba Papéis só para admin), com a aba atual em destaque.
- **Ação e decisão separadas:** na Denúncia e no Conteúdo, as ações sobre o conteúdo (ocultar, remover, restaurar) e a decisão sobre a denúncia (em análise, procedente, improcedente) ficam em seções distintas, cada uma com sua caixa de diálogo e o motivo de 1 a 300 caracteres.
- **Exceção ao "Desfazer":** as ações do painel são reversíveis pela própria tela (restaurar, conceder de novo), mas nenhuma tem Desfazer. A confirmação vem antes, na caixa de diálogo, e o resultado fica na auditoria, que é a trilha oficial.
- **Estados:** carregando, vazio, erro com frase fixa e "Tentar de novo", e envio com resultado incerto, que confere o banco antes de reenviar. Sem permissão, a tela mostra só a frase fixa e o link para a Comunidade.
- **Papéis:** conceder, renovar e revogar partem do "Id da sua conta" que a pessoa copia da tela Conta; o aviso do último admin aparece na lista e na caixa de revogar.
- **Tema e movimento:** seguem o `data-tema` e o `prefers-reduced-motion` da base, com alvos de 44 px e foco visível.

## Elevation & Depth

As páginas públicas não têm sombra nem gradiente: a profundidade vem do chão (a cor da faixa) e do espaço. Os tokens abaixo ficam para a área logada.

Plano, com duas sombras e dois gradientes permitidos, todos em `web/src/styles/tokens.css` e usados só pelas variáveis, nunca escritos de novo:

- `--sombra-flutuante`: `0 2px 4px rgb(43 35 32 / .08), 0 18px 40px rgb(43 35 32 / .16)`.
- `--sombra-cartao`: `0 1px 2px rgb(43 35 32 / .06), 0 8px 24px rgb(43 35 32 / .06)`.
- `--luz-estudio`: `radial-gradient(120% 90% at 15% 10%, #F7D684 0%, #F2C14E 60%)`, só no painel de mel.
- `--brilho-mel`: `radial-gradient(closest-side, rgb(242 193 78 / .22), transparent)`.

Sem desfoque: nenhum `filter: blur`, nenhum `backdrop-filter` e nenhum 3D. A profundidade vem de cor, painel e espaço.

## Shapes

Quatro raios, em `tokens.css`: **painel 24** (painéis de cor), **cartão 20** (cartões brancos e zona de perigo), **pílula 999** (botões e etiquetas) e **campo 14** (campos de entrada). Sem cartão com borda nos quatro lados fora do contorno de 1,5 px da zona de perigo.

## Components

Cada item abaixo descreve o que o código faz hoje, com o arquivo e a linha. A direção aprovada (FINAL, 11/11) entrou aqui por inteiro; onde ela e uma regra mais antiga deste arquivo diziam coisas diferentes, valeu o que o código faz, e a regra que perdeu está em "Divergências com a FINAL", no fim. Todo controle tem os estados hover, `:focus-visible` (anel de 2 px, 3:1 ou mais) e desativado.

- **Botão (`Botao`, `web/src/componentes/base/Botao.tsx`; estilos em `web/src/styles/site.css:125-245`):** pílula (raio `pilula`), contorno de 1,5 px, altura mínima de 56 px no site e de 48 px no app (`data-tamanho='app'`, `site.css:156-160`), Outfit 500. Quatro variantes. `primario`: cacau com texto de papel; na madrugada, mel com texto de cacau (`site.css:19-22`). `mel`: mel com texto de cacau, para uso sobre o cacau. `contorno`: contorno de 1,5 px na cor do texto, que enche no hover. `texto`: sem caixa, sublinhado no hover, alvo de 44 px. No hover o primário inverte na hora, para papel com contorno de cacau. Só a escala do toque anima (`scale: 0.96` no `:active`, 120 ms). Não há moldura dupla no site.
- **Moldura (variante `moldura`, só nas telas Hoje e Sessão):** o contorno antigo do app, pílula de 1 px na cor do texto, com um miolo que enche no hover; altura mínima de 48 px (64 px com `data-alto`, ao lado de um primário do app). Fica até essas telas serem redesenhadas (`Botao.tsx:9-12` e `72-99`, `web/src/index.css:421-467`). Tela nova usa as quatro variantes acima.
- **Cabeçalho e menu (`web/src/componentes/casca/Cabecalho.tsx`, `MenuCelular.tsx`; `site.css:337-541`):** fixo no topo (`position: sticky`), fundo papel opaco, sem fio embaixo, 72 px de altura abaixo de 1100 px e 88 px a partir dele (`site.css:14` e `24-28`). O nome do site em Literata 600 (marca do cabeçalho, fora da escala). A partir de 1100 px: os links em `corpo`, o link "Entrar" e a pílula "Criar conta" de 48 px. Abaixo de 1100 px os links e "Entrar" vão para o menu: botão de 48 × 48 no fim da linha, e o menu é um painel de papel de altura cheia logo abaixo do cabeçalho, com os itens em Literata separados por fios, foco preso, Esc fecha e devolve o foco ao botão. **CabecalhoCTA:** a pílula "Criar conta" fica na linha em toda largura (44 px de altura abaixo de 640 px e 48 px daí em diante), ao lado do botão do menu, para o visitante. Há dois tons: de dia, a pílula é primária (cacau com texto de papel) sobre o papel; de noite (`useCabecalhoNoite()`, ligado por uma página de faixa de cacau), o cabeçalho é cacau, a marca e os links são de papel e a pílula é de contorno de papel, sem mel no cabeçalho. Na área logada o cabeçalho traz Hoje, Sessão e os demais itens do registro de áreas, e o botão "Modo madrugada" (a lua) liga o tema escuro. Não há submenu "Em breve" nem navegação inferior.
- **Rodapé (`RodapeMapa`, `Rodape.tsx`; `site.css`):** uma faixa de cacau de borda a borda no fim de toda página pública, sem sombra e sem gradiente. O nome do site é texto comum em Literata 600 no nível `titulo-3` (nunca maior que o h1 da página; tokens `--texto-titulo-3-*`). São quatro grupos na ordem Produto, Conta, Ajuda e Legal, com 11 links ao todo (o grupo Conta traz só "Recuperar acesso" e "Tenho um convite"; "Entrar" e "Criar conta" ficam no cabeçalho), em `pequeno` de papel, cada um com caixa de 44 px de altura (56 na madrugada); os títulos dos grupos são de `noite-2`. Abaixo do mapa vêm o aviso de avaliação (um só nó `[data-aviso]`, sempre renderizado, com ou sem banco) e a linha do ©, em `noite-2`; só esses dois tons de texto (papel e `noite-2`) existem no rodapé. O respiro de cima e de baixo é de 64 px. De 768 em diante os quatro grupos ficam numa grade de quatro colunas iguais com o vão `bloco`; de 1100 em diante o nome fica à esquerda e a grade ao lado dele; de 768 a 1099 o nome fica sobre a grade. Abaixo de 768 os 11 links são uma lista só, em duas colunas iguais (seis fileiras, lidas coluna a coluna na ordem dos grupos) com o vão `bloco` entre elas, em toda largura de 320 a 767, e os títulos dos grupos ficam só para o leitor de tela. O texto de um link fica a 8 px ou mais do vizinho da mesma fileira, e nenhuma palavra de link se parte em 320, 390 e 768 a 100 % de texto. Teto de altura (guarda de regressão, não meta): 640 px abaixo de 768 (cerca de 600 em 320 na madrugada) e 440 px de 768 em diante. Numa página curta o rodapé começa na base da janela, e quando a última faixa do `main` é de cacau ele começa na base dela, sem vão. É estático: sem movimento, sem ícone e sem rede social. Nas rotas `/app/*` o rodapé é só uma linha de nove links que quebra, sem nome, sem grupos e sem aviso (`Rodape.tsx`).
- **Faixa inteira (`FaixaInteira`; `web/src/componentes/secoes/`):** uma faixa que toca as duas bordas da janela, raio 0, padding vertical `secao`, em um de quatro chãos (papel, cacau, areia ou `chao-noite`); o mel não é chão e a peça lança erro se o pedirem. Dividida (`fundoDireita` e `costuraX`), a parte direita é uma camada sólida `[data-faixa-lado]`, nunca um gradiente. No Início há duas exceções ao padding vertical `secao` (`inicio-casa.css`): a faixa do palco (a faixa 2, a noite) tem padding vertical zero, porque na sala ela é o próprio palco, com as paredes, os chãos, a moldura e a folha de noite como camadas dela; e as duas faixas de cacau que pisam no chão de noite (a 3, a tela, e a 7, o fechamento) têm padding de baixo zero, porque o objeto fica em pé sobre uma faixa `chao-noite` (`.ic-chao`) de borda a borda.
- **Cena herói (`CenaHeroi`):** a placa de estúdio de 836 a 1115 px de largura em 1440, rente a uma borda da janela, com as paredes e os chãos continuados em CSS até as duas bordas; o recorte de 390 serve abaixo de 768. É a imagem do topo: `fetchpriority="high"`, nunca `loading="lazy"`.
- **Produto em moldura (`ProdutoEmMoldura`):** a captura de uma tela real sob a moldura de um aparelho (duas imagens, nada em CSS ou SVG); a tela tem 280 px em 390 e 320 em 1440, sem sombra e sem rotação. Na sala do Início (1180 px ou mais, em janela mais larga que alta) a tela cresce com a escala da sala (`--heroi-k`) e nunca passa do que a altura da janela deixa: a moldura inteira, mais o chão de 108 px, tem de caber abaixo do cabeçalho de 88 px enquanto o palco está preso, então numa janela de 900 de altura a tela tem 312,7 px, e em 768 de altura, 253,4 px.
- **Seções de texto (`PaginaCasa`, `Legenda`, `FaixaProva`, `Perguntas`, `BotaoLargo`, `Fechamento`):** `PaginaCasa` é só o marcador de escopo (`[data-casa]`). `Legenda` é uma linha de abertura em prumo. `FaixaProva` é um título e uma lista de fatos em linhas com fio de 1 px, nunca uma grade de blocos. `Perguntas` mostra todas as respostas à vista, sem botão que abra e feche. `BotaoLargo` é a pílula de ação, do tamanho do quadro abaixo de 768. `Fechamento` é o último bloco da página, o único centrado, com uma ação só.
- **Painel de campo (`PainelCampo`; `web/src/styles/campo.css:4-53`), aposentado nas páginas públicas (só a área logada o usa):** a largura da janela menos o recuo do painel (32 px em 1440, 12 px em 390), no máximo 1376 px, centrado; raio `painel`; respiro interno que vai de 24 a 64 px. Quatro variantes: `mel` (campo de mídia e destaque), `oliva` (pedestal, selos e tabela), `areia` (descanso entre painéis e depoimentos) e `cacau` (faixa escura). A luz de estúdio só entra no mel. O anel de foco é de papel no cacau e na oliva e de cacau no mel e na areia.
- **Cena de estúdio (`CenaEstudio`; `CenaEstudio.tsx:26-45`, `campo.css:56-71`), aposentada nas páginas públicas (a `CenaHeroi` a substitui):** um `<picture>` com largura e altura explícitas dentro de um painel de mel com a luz de estúdio, sem respiro. Moldura = a do painel (raio `painel`), `overflow: hidden`, sem sombra e sem borda. A descrição vai no `alt`; nenhum texto dentro da imagem. Abaixo de 768 px, quando há cartão flutuante, a cena é recortada em 5:4 para os aparelhos ficarem inteiros (`campo.css:112-121`).
- **Cartão flutuante (`CartaoFlutuante`; `campo.css:74-102`, `CartaoFlutuante.tsx:5-35`), aposentado nas páginas públicas:** cartão de HTML de verdade, branco, raio `cartao`, `--sombra-flutuante`, girado por um valor fixo entre −4, −2, 2 e 4 graus (`rotate`, nunca 3D), com 340 px de largura no máximo, sobrando da borda do painel (32 px em 390 e 48 px em 1440, em linha reta; 40 px no celular quando a cena é recortada, `campo.css:128-130`). Chega 120 ms depois da mídia do painel (M3).
- **Números (`Numeros`; `campo.css:152-215`), aposentados nas páginas públicas (nenhuma fileira de números):** três itens em Literata (64 px em 1440, 40 px em 390) com a legenda em Outfit, separados por fios verticais de cacau a 20% (fios horizontais, empilhados, até 767 px). Conteúdo: "7 tipos de registro", "2 toques", "0 metas ou comparações", cada um lido inteiro. Os números sobem e aparecem ao entrar na janela (M4).
- **Citação (`Citacao`; `campo.css:224-248`), aposentada nas páginas públicas (sem citação em página pública):** o código legado ainda a desenha em Literata 48/56 em 1440 e 30/36 em 390, cacau, com a linha do autor em Outfit.
- **Faixa de cacau (`FaixaCacau`; `campo.css:251-271`), aposentada nas páginas públicas (a `FaixaInteira` de cacau a substitui):** painel de cacau com texto de papel, usado para os números ou para a cena de tablets, com o brilho de mel (`--brilho-mel`) atrás, à direita. O conteúdo sai de baixo, preso à rolagem (M6).
- **Faixa de selos (`FaixaSelos`; `campo.css:274-355`), aposentada nas páginas públicas (sem letreiro):** letreiro de pílulas de oliva com texto de papel e ícone lucide de 22 px: "Sem metas", "Sem comparações", "Dados só da família", "Funciona de madrugada" e "Avó, pai e babá juntos". Uma volta a cada 60 s; para no hover, quando o foco entra e pelo botão "Pausar selos". Com movimento reduzido vira uma fileira parada que quebra linha, sem a cópia do letreiro.
- **Tabela de comparação (`TabelaComparacao`; `TabelaComparacao.tsx:38-67`, `campo.css:357-433`), aposentada nas páginas públicas:** uma `<table>` de verdade num painel de oliva com texto de papel, legenda e cabeçalhos de coluna e de linha: "O que você precisa", "AppMaternidade" e "Caderno e mensagens". O visto e o traço levam "Sim" e "Não" para o leitor de tela. Rola na horizontal dentro do próprio painel, nunca na página.
- **Depoimentos (`Depoimento`; `Depoimento.tsx:23-46`, `campo.css:435-486`), aposentados nas páginas públicas (sem depoimento em página pública):** o código legado ainda desenha um painel de areia com cartões brancos de raio `cartao`, a frase em Literata (`abertura`), o nome e o papel em Outfit, e uma linha "Relatos ilustrativos" acima do grupo.
- **Acordeão (`Acordeao`; `Acordeao.tsx:16-40`, `campo.css:488-520`):** linhas de perguntas separadas por fio de 1 px; cada pergunta é um botão com `aria-expanded` e `aria-controls`, num título de nível 3 ou 4, e a resposta numa região ligada ao botão.
- **Ilustração (`Ilustracao`; `Ilustracao.tsx:36-53`):** desenho de traço preto, em WebP 1× e 2×; os seis desenhos de `web/public/ilustracoes`. Vai sobre papel, mel ou areia e também sobre o painel de cacau do fechamento do Início (`Fechamento.tsx:21-23`). Sem `alt` próprio, vale a descrição padrão do desenho; ao lado de texto que já diz o mesmo, `alt` vazio.
- **Cartão do app e telas reais:** as peças do app que aparecem no site são HTML de verdade, nunca imagem de tela desenhada à mão. O cartão da sessão é de mel com o cronômetro em Literata e a pílula "Encerrar" de cacau; a lista "Desde que você saiu" tem avatares redondos; a barra Registrar tem quatro botões grandes. Nenhuma captura ou cena mostra "Protótipo" ou "dados de exemplo" dentro da imagem.
- **Composição das telas reais (Início: `web/src/paginas/Inicio.tsx`, `web/src/componentes/inicio-casa/`, `inicio-casa.css`):** o Início é "A casa acesa": sete faixas de ponta a ponta, nesta ordem. 1, o herói: a placa M05 da passagem das 17:30 e o `h1` "Ela mamou que horas?" em duas tintas que cruzam a costura da placa (cacau sobre a parede de dia, "Ela mamou"; papel sobre a parede de noite, "que horas?"), a frase de valor e a pílula "Criar conta" na parede de noite, e a legenda das 16:00 no chão de dia. 2, a noite (M06): "Agora é comigo." 3, "Dormiu às 20:30.": o texto e a segunda tela em moldura, em pé sobre o chão de noite. 4, "E quando sou só eu?": a resposta e a cena. 5, "Ninguém dá nota para o seu dia.": o título e as linhas de fato, separadas por fio. 6, as perguntas, todas à vista. 7, o fechamento centrado, com a janela acesa (M11) em pé sobre o chão de noite. Há duas composições, uma chave só (`CONSULTA_SALA`). A sala, de 1180 px de largura, em janela mais larga que alta: o `h1` fica numa linha só e a placa se posiciona pela costura do título (a largura do primeiro trecho do `h1` mais 12 px, por face de exibição, em `--heroi-span1-em`); a faixa 2 é o palco do momento 2, onde a primeira tela em moldura fica em pé sobre o chão de dia à esquerda da costura, a folha de noite varre o palco e a legenda troca. O palco fica preso a 24 px do topo da janela quando há 640 px de altura ou mais e movimento permitido, e a tela encolhe com a altura da janela até a moldura inteira ficar abaixo do cabeçalho. Empilhada, abaixo de 1180 px ou em janela mais alta que larga (1024 × 1366): uma coluna, o herói é cacau da segunda linha do `h1` para baixo, a primeira tela vem logo depois da placa e a faixa 2 é toda de cacau, sem fixação. De 1024 px as faixas 3 a 6 têm duas colunas (título à esquerda, linhas ou cena à direita). Nenhuma sombra, gradiente, painel, grade de blocos, fileira de números nem letreiro, e todo texto vem de `web/src/conteudo/inicio.ts`. As páginas Como funciona, Cuidado compartilhado, Desenvolvimento e a 404 também são da casa (`PaginaCasa`); as demais páginas públicas de texto ainda usam o painel de mel com um desenho de traço ao lado. As telas de acesso usam a cena `web/public/cenas/acesso/entrar` (veja Área de conta).
- **Hover de mídia (`CamadaHover`; `web/src/movimento/CamadaHover.tsx:7-15`):** ao passar o cursor ou focar um cartão de mídia, uma camada de cacau com o resumo aparece só em opacidade, em 100 ms (110 ms para sair; M13). Com movimento reduzido a troca é instantânea; em aparelho sem hover o resumo fica sempre visível abaixo do conteúdo. Hoje só a página `/sistema` o usa.
- **Madrugada:** o botão da lua no cabeçalho do app liga `data-tema="madrugada"` (`Cabecalho.tsx:57-72`). Fundo `noite`, cartões `noite-cartao`, destaque mel. Os alvos sobem para 56 px (`tema.css:84-85`). Na tela Hoje, na madrugada, há um botão grande e redondo, de mel, com "Iniciar mamada" e a linha da última mamada, na metade de baixo da tela, logo acima da barra Registrar (`BotaoIniciarMamada.tsx:15-19`); com outra sessão em andamento ele encolhe e a sessão vira o destaque.
- **Etiqueta (`web/src/index.css:385-395`):** pílula em Outfit `pequeno`, fundo `areia` (`noite-cartao` na madrugada), altura mínima de 28 px, sem caixa alta.
- **Campo (`site.css:253-330`):** rótulo visível acima (peso 500) e, abaixo, o controle de 56 px de altura mínima, raio `campo`, contorno de 1,5 px em `texto-2` e fundo de cartão (branco de dia), na coluna de até 28 rem. O select tem a mesma altura, contorno e fonte, com a seta de 20 px. O botão de mostrar senha é de ícone, 44 × 44 no fim do campo, com `aria-label` e `aria-pressed`.
- **Foco:** anel de 2 px na cor de foco com `outline-offset: 2px`, só em `:focus-visible` (`web/src/index.css:56-60`); o botão usa 3 px (`site.css:162-166`). O `h1` com foco programático (`tabIndex=-1`) não mostra contorno.
- **Erro:** `corpo`, em cor de erro, abaixo do campo, sem mudar a altura da linha.
- **Desativado:** fundo sólido em texto secundário apagado, nunca tracejado, com `aria-disabled="true"` e o motivo ao lado.
- **Mídia e imagens:** toda imagem tem largura e altura explícitas, `alt` que descreve a nossa tela ou o desenho, e nenhum texto dentro. A legenda fica só nos cartões "As telas". A imagem da primeira dobra carrega na hora; as outras, só ao chegar perto da janela.
- **Barra Registrar (área logada):** 64 px, `position: fixed; bottom: 0`, 4 botões iguais (Sono, Mamada, Fralda e Mais). Não é navegação.
- **Confirmação:** linha de tinta no topo, texto da confirmação e as ações dela: "Desfazer" e "Fechar" depois de um registro novo; "Editar horário" (para quem pode alterar) e "Fechar" depois de encerrar uma sessão. Não some sozinha.
- **Seletor de bebê (Rotina, 38a):** aparece no título do Hoje só quando a família tem mais de um bebê ativo; com um só, o nome do bebê é texto. É um select nativo com o nome como rótulo visível, alvo de pelo menos 48 px, sem ícone desenhado. Bebê arquivado não entra na lista.
- **Barra de registro rápido (Rotina, 38a):** os botões de registro do Hoje com Sono, Mamada, Fralda e Mais (Tummy time, Mamadeira, Alimentação sólida, Observação e "Outro horário…"). A fralda abre Xixi, Cocô, Ambos e Cancelar, porque o conteúdo é obrigatório. O toque repetido no mesmo botão em menos de 1 s não registra de novo.
- **Item de registro (Rotina, 38a):** uma linha com a hora, o tipo e os detalhes em texto, a marca de quem registrou e o link para editar. Sem cartão com borda; fio fino entre as linhas.
- **Sessões em paralelo (Rotina, 38a):** quando há mais de uma sessão em andamento, cada uma é um cartão do Hoje com o cronômetro e "Encerrar" próprios. A sessão encerrada por outra pessoa mostra quem encerrou e a hora.
- **Formulário de registro (Rotina, 38a):** campos do tipo escolhido com rótulo visível acima, horários com data, hora e os botões "−5 min" e "+5 min" ao lado. A mensagem de erro fica ao lado do campo, ligada por `aria-describedby`, e o foco vai ao primeiro erro. Os avisos que não bloqueiam (duração acima do limite, sobreposição) pedem "Salvar assim" ou "Corrigir". O envio mostra "Salvando…" com `aria-disabled`.
- **Estados da Rotina (38a):** carregando (texto, sem rodar sozinho), vazio, sem acesso, sem bebê e erro. O erro usa a frase do catálogo, nunca o código nem a mensagem do banco, acima dos botões em `role="alert"`; "Tentar de novo" só aparece quando repetir é seguro e repete a chamada com o mesmo id.

## Do's and Don'ts

- Faça: registro em até 2 toques a partir de Hoje; alvos de pelo menos 44 × 44 px, 56 px de altura na madrugada (Fluxos §1).
- Faça: tema escuro de pouco brilho na madrugada, sem fundo branco.
- Faça: erro reversível. Todo registro novo tem "Desfazer"; uma sessão encerrada não volta a ficar em andamento, e a correção é "Editar horário". A confirmação só sai quando a pessoa fecha ou faz outro registro (Fluxos §1).
- Faça: rótulos completos para leitor de tela e texto ampliável até 200% sem corte.
- Faça: todo vão e todo tamanho de letra pelo token do papel ou do nível (Layout e Typography).
- Faça: nas páginas públicas, faixas de ponta a ponta em papel, cacau, areia ou `chao-noite`, com uma cena de estúdio e o produto de verdade numa moldura de aparelho. Na área logada, um painel de mel por dobra, com algo real dentro, até o DS-2.
- Faça: a chamada principal sempre como botão; a ênfase vem do peso e do tamanho, e todos os títulos ficam em prumo.
- Não faça: painel, cartão, grade de blocos iguais, fileira de números, letreiro ou rótulo acima do título nas páginas públicas.
- Não faça: itálico nas páginas públicas, em nenhum elemento; a ênfase é por peso.
- Não faça: barra fixa colada na base da janela nas páginas públicas.
- Não faça: mel como chão de uma faixa; o mel é luz e o botão primário da noite.
- Faça: nenhuma cor fora das doze do `tokens.css`; sombra, gradiente e filtro só pelas variáveis de Elevation & Depth.
- Faça: rolagem horizontal nenhuma em 390, 768, 1024 e 1440 px nem com zoom de 200%; contraste AA; foco visível; alvos de 44 px ou mais (56 px na barra Registrar); `prefers-reduced-motion` respeitado.
- Não faça: linguagem de cobrança. Nada de "atrasado", metas, pontos ou rankings.
- Não faça: caixa alta e texto menor que 15 px (o código ainda tem o rótulo de 14 px, que o H-3 leva para `pequeno`).
- Não faça: sombra, gradiente ou raio que não venha dos tokens de Elevation & Depth e de Shapes; vidro fosco; fio sob o cabeçalho ou moldura de página; `filter`, `perspective`, `rotateX`, `rotateY` ou `preserve-3d`.
- Não faça: aparelho desenhado em CSS ou em SVG pelo agente; a cena entra pronta, como imagem, com a nossa tela real dentro.
- Não faça: mais de duas famílias de fonte; "A · B · C" em lista de itens; seta colada ao texto de botão; numeração de marcador que não seja uma sequência real; painel pastel sem função.
- Não faça: copiar layout, texto, imagem, marca ou cor de outro site. Só a estrutura é estudada. Nenhum rosto de pessoa real.
- Não faça: número de "prova social" sem fonte real nem depoimento inventado; os relatos ilustrativos levam a linha que os diz.
- Não faça: fonte sem licença nem texto essencial dentro de imagem; "Protótipo" ou "dados de exemplo" dentro de uma cena ou captura de vitrine.

## MAT-38b

Histórico, detalhe do registro, lixeira e notas. Nenhuma direção nova: as telas usam os tokens, o `h1` com foco programático, o item de registro e a confirmação do 38a. Cores só por token (`--cor-*`, `--color-oliva`, `--color-mel`), sem sombra, gradiente, filtro nem caixa alta.

- **Linha do dia (Histórico):** hora em `tabular-nums`, ícone do tipo (`lucide-react`, `aria-hidden`) com o texto do tipo e dos detalhes, e "por <nome>". O link do texto cobre a linha inteira (`.rotina-link-esticado`), então o alvo passa de 44 px. Fio fino entre as linhas, sem cartão.
- **Seletor de dia:** "Dia anterior", "Dia seguinte" (com `aria-disabled` em hoje, sem navegar), o campo de data com máximo em hoje e a fila dos 7 dias que terminam no dia escolhido (`.rotina-fila-de-dias`, sete colunas iguais, sem rolagem horizontal em 390 px). O dia escolhido leva `aria-current="date"` e contorno de tinta.
- **Filtros:** botões de alternância com `aria-pressed`, um por tipo, mais "Todos". Nunca há zero tipos: desligar o último volta a "Todos". Só na vista do dia. Estado na URL (`dia`, `tipos`, `vista`), nessa ordem.
- **Totais do dia:** lista de definição com Sono, Mamadas, Mamadeiras (com os ml) e Fraldas (com a divisão). Só totais, sem meta nem comparação.
- **Semana:** uma linha por dia (`.rotina-semana-linha`): em 390 px o dia em cima e os totais em duas colunas; a partir de 768, uma linha só. A barra do sono (`.rotina-barra`, oliva; mel na madrugada) é decorativa, `aria-hidden`, e o valor sempre aparece em texto.
- **Detalhe do registro:** lista de definição (início, fim, duração, detalhes, origem), autoria de quem criou e de quem encerrou, histórico de alterações e as ações Editar e Excluir. Excluir não pede confirmação: mostra "Registro excluído." com "Desfazer" e "Fechar" e leva ao Histórico.
- **Lixeira:** lista do mais recente para o mais antigo, com quem excluiu, quando e até quando pode ser restaurado. "Restaurar" só para quem pode alterar o registro e mostra "Registro restaurado." com o link "Ver no Histórico".
- **Notas:** a lista da família (texto, sobre quem, autor e data, "em destaque até"), com "Editar" e "Excluir" só para quem pode. Excluir pede a confirmação em grupo ("Excluir" e "Manter"), porque a nota não vai para a lixeira. O formulário tem Texto, Sobre (só na criação), Destaque e os botões Salvar e Cancelar; voltar, cancelar e salvar levam à origem (`/app/notas` ou `/app/hoje`).
- **Foco e anúncios:** depois de Excluir, Desfazer, Fechar, Restaurar e Salvar o foco vai ao `h1` da tela; as confirmações aparecem na região `role="status"`.

## Motion

Curto e sem surpresa, com a biblioteca `motion` (`motion/react`, versão fixa no `package.json`). Todos os parâmetros moram num catálogo só, `web/src/movimento/catalogo.ts`, e nenhuma peça tem número de movimento solto. Só animam `transform` e `opacity`. Com `prefers-reduced-motion: reduce`, tudo para: o CSS desliga toda animação e toda transição (`web/src/index.css:649-656`) e as peças leem `usePrefereMovimentoReduzido` e nascem no estado final.

| Onde | Movimento (catálogo) | Movimento reduzido |
|---|---|---|
| Primeira carga | Cortina em colunas (M2, `catalogo.ts:35-48`, `Cortina.tsx:6-12`): 6 colunas em 1440 e 4 em 390, uma camada de cacau e depois a de mel (120 ms depois), cada uma de 0 a −100% em `y`, 0,5 s, curva `[0.16, 1, 0.3, 1]`, uma coluna a cada 90 ms. Sem tela de abertura: a página já está montada por baixo. Roda uma vez por sessão do navegador (marca em `sessionStorage`). | A página aparece direto |
| Herói | A cena sobe de 0,94 a 1 e aparece, 0,8 s, depois da cortina (M8, `catalogo.ts:103-115`, `HeroiInicio.tsx:36-38`) | Parada |
| Números e títulos de seção | Sem movimento: o texto já está no lugar desde a primeira pintura. M4 (as linhas que subiam e apareciam) e M5 (o título dividido por linha) saíram na MOTION-1 | Igual |
| Painel com mídia | A mídia vai de 0,9 a 1 nos primeiros 360 px de rolagem, com mola (rigidez 120, amortecimento 30); a opacidade fica sempre em 1, e o cartão flutuante já está no lugar (M3, `catalogo.ts`) | Parada |
| Faixa de cacau e rodapé | Sem movimento: a faixa de cacau e o rodapé já estão no lugar desde a primeira pintura. O M7 (o conteúdo que saía de baixo, preso à rolagem, `catalogo.ts`) saiu do rodapé: está estacionado e nenhuma página o usa; M6 saiu na MOTION-1 | Igual |
| Hover | O primário inverte na hora; a camada de cacau com o resumo do cartão de mídia aparece em 100 ms, também com foco (M13, `catalogo.ts:116-129`). A escala do toque nos botões é 0,96 no `:active`, 120 ms, `ease-out`, e só ela anima (`web/src/styles/site.css:146-154`). | Igual, sem deslocamento |
| Selos | Letreiro de 60 s por volta, em CSS (M14, `campo.css:284-295`); para no hover, no foco e pelo botão | Fileira parada |
| Início, momento 1: a lâmpada | A luz da lâmpada da placa acende (M15, `catalogo.ts`; `movimento/troca/LuzDaLampada.tsx`): o cone sobe em 240 ms e a poça de luz no chão, 80 ms depois, em 320 ms; tudo 300 ms depois do `load` da placa (a de M06, quando 10 % dela está à vista), curva `[0.16, 1, 0.3, 1]`, só opacidade, só na primeira visita da sessão (`sessionStorage`). A placa nunca se move | A luz já nasce acesa; nada anima |
| Início, momento 2: a noite toma a casa | A folha de noite varre o palco preso à rolagem (M16, `catalogo.ts`): 600 px de rolagem a partir de 1280 px de largura e 480 de 1180 a 1279 (600 px são 66,7 svh numa janela de 1440 × 900); só `transform`, uma linha do tempo. O catálogo ainda guarda 360 para abaixo de 1024, mas a fixação só existe na sala (1180 px ou mais, em janela mais larga que alta, 640 px de altura ou mais), e não há fixação de 360 px em nenhuma janela. O palco gruda a 24 px do topo, com a moldura inteira abaixo do cabeçalho de 88 px | Sem fixação, sem folha: o estado de repouso, a luz acesa |
| Início, momento 3: a legenda troca | A legenda do palco troca de texto num nó só (M17, `catalogo.ts`): sai em 160 ms (opacidade de 1 a 0 e de 0 a −6 px), o texto muda no fim da saída e entra em 220 ms (de +6 px), curva `[0.4, 0, 0.2, 1]`. Montado no cartão seguinte | Duas legendas estáticas, cada uma no seu lugar |
| Início, momento 4: a legenda assinada | Nas legendas das 16:00 e das 17:30 a hora vem maior, mais pesada e com algarismos tabulares, e o autor vem menor. Um traço de 2 px se desenha uma vez sob "por <nome>" (`scaleX(0)` a `scaleX(1)` a partir da esquerda, 400 ms, curva padrão) quando a legenda aparece inteira na janela pela primeira vez (`data-assinada`, `movimento/troca/assinatura.tsx`, `inicio-casa.css`) | O traço já aparece desenhado |
| Início, momento 5: a tela rola | No celular do Histórico (`ProdutoEmMoldura` com `rolavel`, `PalcoTroca.tsx` e `FaixaNoite.tsx`), a captura abre no pé do dia (16:00 Ju, 17:30 Ícaro), em `object-position: 50% calc(-1 * var(--produto-rolagem))`. Com hover, foco visível ou o botão `data-produto-rolar` (`aria-pressed`) ela sobe até o topo (`50% 0%`) em 400 ms. O percurso é o `rolagem_px` do MANIFESTO (280 px em 390 e 320 em 1440, `ROLAGEM_PX` em `midia.ts`); o gêmeo de noite acompanha | Sem transição: abre no pé, e o botão troca a posição na hora |
| Início, momento 6: o chão segue | Entre as páginas da casa (`PAGINAS_DA_CASA`, `Cabecalho.tsx`), a marca, os links do cabeçalho e os do rodapé navegam com `viewTransition`; o chão do herói tem `view-transition-name: chao` e o grupo dura 400 ms (`inicio-casa.css`) | `::view-transition-*` sem animação |

Os componentes de `web/src/movimento/` (`Cortina`, `EntradaCena`, `RevelaNaRolagem` e `CamadaHover`) implementam essas receitas e são os que se reutilizam. A `RevelacaoPorBaixo` (M7) fica estacionada em `web/src/movimento/`, sem uso em nenhuma página, e o teste de contrato proíbe importá-la em código de produção. Nenhum conteúdo do `<main>` começa escondido à espera da rolagem.

## Images

As placas de cena das cinco páginas da casa (Início, Como funciona, Cuidado compartilhado, Desenvolvimento e a 404) saem como `<picture>` com AVIF e WebP, gerados no build pelo vite-imagetools a partir de um mestre por vaga em `web/src/assets/cenas`, com o hash no nome do arquivo (o auxiliar é `placa()` em `componentes/campo/imagens.ts`; a fonte AVIF vem antes do WebP, e a `<img>` de WebP fica como sempre). O resto do raster (`CenaEstudio`, `Ilustracao`, `public/telas`, `public/molduras`, `public/cenas/acesso`, `public/cenas/sistema` e `public/cenas/publicas`) segue só em WebP, em 1× e 2×, em `web/public`. O registro de origem de cada grupo fica no `PROVENANCE.md` da própria pasta (`src/assets/cenas/<página>`, `public/cenas/publicas`, `public/cenas/acesso`, `public/cenas/sistema` e `public/ilustracoes`), e o de fontes, ícones e bibliotecas em `web/PROVENANCE.md`. Imagem sem texto dentro: a descrição vai no `alt` ou no `aria-label`. A moldura de uma cena é a do painel (raio 24), sem sombra e com `object-fit: cover`. Cenas de painel de mel usam a luz de estúdio; as dos outros painéis, não.

- **Cenas de aparelho:** a direção aprovada define quatro cenas: três celulares sobre pedestais de oliva em mel (herói do Início), um celular sobre pedestal em mel (acesso, páginas públicas), dois tablets sobre cacau com um círculo de mel (faixa de cacau e Desenvolvimento) e um celular sobre linho de areia (seção da tabela). Os arquivos em uso estão em `web/public/cenas`. Os aparelhos são imagens prontas; a tela de dentro é uma captura real nossa (2×), composta fora do código, e a chave verde da composição nunca fica à mostra. Nunca há aparelho em CSS (sem `perspective`, `rotateX` ou `preserve-3d`).
- **Desenhos de traço:** seis desenhos pretos de linha (avó com carrinho, pai com o bebê no colo, tummy time, duas mãos passando um celular, babá no tapete e mãe ninando de noite). São gerados e curados, nunca desenhados à mão em SVG pelo agente.
- **Origem e uso:** imagem gerada pode ir ao site publicado, curada e com registro de origem; nenhum rosto de pessoa real; nada vem dos sites de referência (arquivo, texto ou código).
- **Proibido:** texto essencial dentro da imagem; "Protótipo" ou "dados de exemplo" dentro de qualquer cena ou captura de vitrine; imagem sem `alt` (a decorativa leva `alt` vazio).

## Divergências com a FINAL (para a galeria do item H)

Cada linha é uma regra que perdeu para o código na base (a003fe4, sem mudança de visual no H-2). As que vêm de "regra antiga" estavam neste arquivo antes do H-2; as demais são da FINAL. Nenhuma está em vigor acima.

- **Botão primário.** Regra antiga: altura 80 (64 abaixo de 768), padding 0 32, raio 8, texto 24/24. O código faz: pílula, altura mínima 56 (48 no app), padding 28 (22), 18 px (17 no app), `site.css:125-160`. A FINAL concorda com o código (56 e 48); o CSS legado `.sb-botao` de 64 px abaixo de 768 não tem uso em `.tsx` (`index.css:398-418` e `476-479`).
- **Moldura dupla.** Regra antiga: altura 48 (64 ao lado de um primário), raio 8 por fora e 4 por dentro. A FINAL diz "nenhum contorno duplo em lugar nenhum". O código faz: a variante `moldura` do app, pílula de 1 px com miolo, nas telas Hoje e Sessão até o redesenho, `Botao.tsx:9-12` e `index.css:421-467`.
- **Cabeçalho.** Regra antiga: 64 px (60 abaixo de 768), submenu "+ Em breve", botão de moldura dupla, quebra em 768. O código faz: 72 px abaixo de 1100 e 88 px a partir dele, menu de altura cheia abaixo de 1100, sem submenu, `site.css:14`, `24-28` e `463-487`; o teste `casca.test.tsx:65` exige que o "Em breve" não exista.
- **Rodapé.** Regra antiga: de x=0 com a largura da janela, nome com ≥ 96% da área útil, aviso de protótipo, sem recuo. A FINAL diz painel de mel com o nome até 160 px em 1440. O código faz: painel de mel com recuo de 32 px (12 em 390) e o nome pela largura do painel, `calc(100cqi / 7,966)`, sem teto, `site.css:543-618`; nas rotas `/app/*`, uma linha de links sem painel, `Rodape.tsx:7-22`.
- **Seção escura só no Início, com "Criar conta".** Regra antiga. O código faz: a faixa de cacau com a cena dos tablets (`FaixaMadrugada.tsx:18-29`) e o painel de cacau do fechamento com um desenho de traço (`Fechamento.tsx:21-27`).
- **Etiqueta.** Regra antiga: raio 4, padding 2/6, altura 26. O código faz: pílula, padding 2/12, altura mínima 28, `index.css:385-395`.
- **Campo.** Regra antiga: a partir de 768, linha de rótulo e campo de 112 px sem caixa; abaixo, campo de 64 px com fundo `areia` e raio 4. A FINAL diz campo de raio 14. O código faz: campo de 56 px com raio 14, contorno de 1,5 px e rótulo acima nas duas larguras, `site.css:253-281`.
- **CTA circular.** Regra antiga: círculo de 480 px (322 abaixo de 768) e outro, só de contorno, de 240, no site. O código faz: nenhum CTA circular no site; o único círculo é o botão "Iniciar mamada" da madrugada, de 13 rem (15 rem em telas grandes) ou 7 rem (9 rem) quando há outra sessão em andamento, `BotaoIniciarMamada.tsx:20-27`.
- **Mídia e galeria.** Regra antiga: peças de 1376 × 888 a 1056, par de 672 × 672, retrato de 413 × 734, moldura de raio 8 (4 abaixo de 768). A FINAL diz painel de raio 24. O código faz: painel de até 1376 px de largura com raio `painel` e a cena com `border-radius: inherit`, `campo.css:4-11` e `60-63`.
- **Movimento: "nenhuma animação de entrada na primeira carga".** Regra antiga. A FINAL §5 diz cortina de colunas, entrada do herói e linhas que sobem. O código faz: a cortina (`Cortina.tsx:35-82`, `catalogo.ts:35-48`), a entrada da cena (`catalogo.ts:103-115`) e as linhas (`catalogo.ts:64-76`).
- **Movimento reduzido nos números e títulos.** A FINAL diz "só opacidade, 150 ms". Resolvida na MOTION-1: os números e os títulos não têm mais entrada animada (a `EntradaSuave`, o `TextoAnimado` e a `LinhasEscalonadas` foram removidos), e o texto está no lugar desde a primeira pintura, com ou sem movimento reduzido.
- **Escala de tipo e corpo.** A FINAL §2 diz h1 84/88, h2 56/62, h3 36/42, h4 24/30, corpo do site 18/27 e rótulo 14/20. A SPEC H e o front matter deste arquivo trocam isso pela escala de nove níveis (corpo 18/28, nada abaixo de 15 px). O código faz: a escala antiga, `site.css:48-110` (`.cm-corpo` 18/27, `.cm-rotulo` 14/20), até o H-3 aplicar.
- **Grade e padding de painel.** A FINAL §3 diz grade de 12 colunas, margem 64, conteúdo máximo 1312 e padding de painel 64. A SPEC H e o Layout acima trocam isso pelo quadro de 1200 px com calha de 20 a 32 px e o papel `painel`. O código faz: `.cm-area` de 1312 px com margem de 20 a 64 px e respiro de painel de 24 a 64 px, `site.css:6-34`, até o H-3 aplicar.
- **Ilustração nunca sobre o cacau.** A FINAL §4 proíbe. O código faz: o fechamento do Início põe o desenho `tummy-time` no painel de cacau, `Fechamento.tsx:21-23`.
- **Cena em AVIF e WebP.** A FINAL §4 diz `<picture>` com AVIF e WebP em 1× e 2×. As placas de cena das cinco páginas da casa já cumprem (AVIF e WebP gerados no build, URLs com hash). O código ainda faz só WebP em `CenaEstudio.tsx:30-34` e `Ilustracao.tsx:41-46`.
- **Acordeão em Radix ou shadcn.** A FINAL §4. O código faz: botões nativos com `aria-expanded`, sem biblioteca, `Acordeao.tsx:16-40`.
- **Registro de origem em `web/PROVENANCE.md`.** A FINAL §6 diz um arquivo só para as cenas. O código faz: um `PROVENANCE.md` por pasta de cena e de desenho (`web/public/cenas/*/PROVENANCE.md`, `web/public/ilustracoes/PROVENANCE.md`); o `web/PROVENANCE.md` cobre fontes, ícones, bibliotecas e movimento.
