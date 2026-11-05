---
version: alpha
name: AppMaternidade — Urucum
description: Papel quente, tinta quase preta e um campo de urucum. Editorial na página pública, direto e de uma mão na área logada.
colors:
  primary: "#1A1511"
  neutral: "#F6EFE3"
  accent: "#B0431C"
  on-accent: "#FFF8EE"
  info: "#2B5C70"
  line: "#1A1511"
  focus: "#1A1511"
  paper-deep: "#EBE1D0"
  night-primary: "#E3D6C3"
  night-neutral: "#17120E"
  night-accent: "#C47255"
  night-on-accent: "#17120E"
  night-info: "#8FB0BF"
  night-line: "#E3D6C3"
  night-focus: "#F7EFE2"
  night-paper-deep: "#251E18"
typography:
  display:
    fontFamily: Fraunces
    fontSize: 4.5rem
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
  heading:
    fontFamily: Fraunces
    fontSize: 2.25rem
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: Instrument Sans
    fontSize: 1.0625rem
    fontWeight: 400
    lineHeight: 1.55
  numeric:
    fontFamily: Instrument Sans
    fontSize: 3.5rem
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tnum"
  label:
    fontFamily: Instrument Sans
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.04em"
rounded:
  tag: 3px
  control: 6px
  card: 8px
  media: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  3xl: 96px
  page-margin: 16px
  measure: 65ch
  target: 44px
  target-night: 56px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: 12px
    height: 48px
  button-primary-night:
    backgroundColor: "{colors.night-accent}"
    textColor: "{colors.night-on-accent}"
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: 12px
    height: 48px
  button-secondary-night:
    backgroundColor: "{colors.night-neutral}"
    textColor: "{colors.night-primary}"
  tag:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: 6px
  tag-night:
    backgroundColor: "{colors.night-paper-deep}"
    textColor: "{colors.night-primary}"
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.card}"
    padding: 16px
  card-night:
    backgroundColor: "{colors.night-neutral}"
    textColor: "{colors.night-primary}"
  nav-item:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    height: 48px
  nav-item-night:
    backgroundColor: "{colors.night-neutral}"
    textColor: "{colors.night-primary}"
  quick-action:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: 48px
  quick-action-night:
    backgroundColor: "{colors.night-paper-deep}"
    textColor: "{colors.night-primary}"
    height: 56px
  info-text:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.info}"
  info-text-night:
    backgroundColor: "{colors.night-neutral}"
    textColor: "{colors.night-info}"
  accent-text:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.accent}"
  accent-text-night:
    backgroundColor: "{colors.night-neutral}"
    textColor: "{colors.night-accent}"
  focus-ring:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.focus}"
  focus-ring-night:
    backgroundColor: "{colors.night-neutral}"
    textColor: "{colors.night-focus}"
  rule:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.line}"
  rule-night:
    backgroundColor: "{colors.night-neutral}"
    textColor: "{colors.night-line}"
---

## Overview

O AppMaternidade tem cara de caderno de casa, não de painel de software: papel quente, tinta quase preta e uma única cor quente, o urucum, usada em campos grandes e em poucos pontos de ação (ESPEC §1). A estrutura vem de linhas finas na cor da tinta, com margens pequenas e campos de cor largos, no lugar de sombras e cartões flutuantes (ESPEC §2). A página pública fala em tom editorial, com uma serifa de exibição pesada para a promessa e uma sem serifa limpa para o resto (ESPEC §3). A área logada é feita para o colo e para a madrugada: números grandes e tabulares, ações na metade de baixo da tela e um tema escuro de pouco brilho com o mesmo urucum, menos saturado (ESPEC §6 e §8). O movimento é curto e some quando a pessoa pede menos movimento (ESPEC §7).

As superfícies são três. O Início é uma página de decidir e aprender, a única com abertura grande. O Hoje é uma superfície de operar: o que importa é registrar rápido e ver o que está em andamento. A Sessão é de inspecionar um único objeto, o cronômetro.

## Colors

A paleta tem uma família quente, uma fria e os neutros. Nada de gradiente, vidro fosco ou brilho.

- **Tinta (`primary`, #1A1511):** texto, linhas e contorno de foco. Marrom quase preto, nunca preto puro. `line` e `focus` usam o mesmo valor, porque as linhas são na tinta (ESPEC §2).
- **Papel (`neutral`, #F6EFE3):** fundo de tudo. Quente e claro, nunca branco.
- **Papel fundo (`paper-deep`, #EBE1D0):** etiquetas e botões rápidos. Separa sem precisar de sombra.
- **Urucum (`accent`, #B0431C):** a única cor quente saturada. Vai nos campos de cor do Início, no botão principal e em poucos textos de destaque. O nome vem do pigmento vermelho-alaranjado da semente de urucum.
- **Sobre o urucum (`on-accent`, #FFF8EE):** texto e traço claro sobre o campo de urucum. Com um urucum escuro o bastante para servir de texto sobre o papel, o texto escuro por cima não passaria de 4,5:1, por isso o texto sobre o destaque é claro.
- **Informação (`info`, #2B5C70):** azul-petróleo, só para estado informativo (avisos neutros como "Já há uma sessão em andamento"). Nunca decora.
- **Madrugada (`night-*`):** fundo #17120E, quente e escuro (luminância 0,0065); texto #E3D6C3, abaixo do branco para não ofuscar; urucum #C47255, mesmo matiz (diferença de 0,1°) com saturação 0,49 contra 0,73; foco #F7EFE2, o único tom bem claro, para o contorno aparecer sobre o fundo e sobre o urucum.

Contraste WCAG 2.x, conferido no lint e no teste de contraste:

| Par | Claro | Madrugada |
|---|---|---|
| texto sobre papel | 15,85 | 12,99 |
| texto sobre urucum | 5,43 | 5,21 |
| urucum como texto sobre papel | 5,01 | 5,21 |
| informação sobre papel | 6,41 | 8,09 |
| foco contra papel | 15,85 | 16,29 |
| foco contra urucum | 3,16 | 3,13 |

## Typography

Duas famílias, ambas SIL OFL 1.1, auto-hospedadas pelos pacotes `@fontsource` (registro em `web/PROVENANCE.md`).

- **Fraunces** é a voz de exibição: serifa pesada, de terminais macios, só para a promessa do Início, os títulos de seção e o `h1` das telas. Em 600 ela faz o papel da serifa sóbria dos subtítulos (ESPEC §3), sem uma terceira família.
- **Instrument Sans** é o corpo e a área logada. Tem números tabulares (`tnum`), usados em horários, durações e no cronômetro.

Escala: corpo de 17 px (`body`, 1,0625 rem); títulos de seção em 36 px (`heading`, cerca de 2,1 vezes o corpo); exibição em 72 px no desktop (`display`, cerca de 4,2 vezes), reduzida para 44 a 48 px em 390 px. O cronômetro usa `numeric` (56 px) e cresce até 88 px na Sessão. Rótulos de seção (`label`) em 14 px, peso 600, caixa alta com espaçamento de 0,04 em.

## Layout

- O desenho começa em 390 px e cresce. Grade de 4 colunas no celular e de 12 no desktop, com margem externa de 16 px no celular e cerca de 2% da largura no desktop.
- Campos de cor e blocos de mídia vão quase de ponta a ponta. O texto corrido fica limitado a cerca de 65 caracteres por linha (`measure`).
- Linhas de 1 px na tinta separam seções (horizontais) e colunas (verticais). Elas são a estrutura principal.
- No bloco de duas colunas, o rótulo fica à esquerda em 3 das 12 colunas e o texto à direita; no celular, o rótulo vai acima do texto.
- Na área logada, a barra de botões rápidos fica fixa logo acima da navegação inferior, ao alcance do polegar.
- Ritmo vertical pela escala de `spacing`: 16 px dentro de um bloco, 40 a 64 px entre blocos, 96 px entre seções da página pública no desktop.

## Elevation & Depth

Plano. Profundidade vem de linha, cor e espaço, não de sombra. Nenhum `box-shadow` com desfoque acima de 4 px, nenhum `backdrop-filter` e nenhum `filter: blur`. A barra fixa de baixo se separa do conteúdo por uma linha de tinta no topo e pelo fundo de papel opaco.

## Shapes

- Cartões e mídia: 8 px (`card`, `media`).
- Botões e botões rápidos: 6 px (`control`).
- Etiquetas: 3 px (`tag`), quase retas.
- Ilustrações: traço contínuo de tinta com preenchimento chapado de tinta e papel, sobre o campo de urucum. Até duas, desenhadas para o projeto em SVG, decorativas (`aria-hidden="true"`).

## Components

- **`button-primary`:** fundo urucum, texto claro, 48 px de altura. Uma ação principal por área.
- **`button-secondary`:** fundo de papel e contorno de 1 px na tinta.
- **`tag`:** etiqueta em papel fundo, canto de 3 px, rótulo em caixa alta. Usada nos quatro pilares.
- **`card`:** o único contêiner com borda. Contorno de 1 px na tinta, canto de 8 px, sem sombra. Nunca há cartão dentro de cartão.
- **`nav-item`:** item da navegação inferior, só texto, 48 px de altura. O item atual tem um traço de urucum de 3 px no topo.
- **`quick-action`:** botão rápido em papel fundo, 48 px de altura, 56 px na madrugada.
- **Confirmação:** linha de tinta no topo, texto da confirmação, "Desfazer" e "Fechar". Não some sozinha.
- **Foco:** contorno de 2 px na cor `focus`, com afastamento de 2 px, em todo elemento focável.
- Os componentes são próprios, feitos com Tailwind e as variáveis de uso de `tema.css`. Nenhuma biblioteca de componentes.

## Do's and Don'ts

- Faça: registro em até 2 toques a partir de Hoje; ações principais na metade de baixo da tela; alvos de pelo menos 44 × 44 px, 56 px de altura na madrugada (Fluxos §1).
- Faça: tema escuro de pouco brilho na madrugada, sem fundo branco, com movimento mínimo (Fluxos §1).
- Faça: erro reversível. Toda confirmação tem "Desfazer" e só sai quando a pessoa fecha ou faz outro registro (Fluxos §1).
- Faça: rótulos completos para leitor de tela ("Iniciar sono de Lia") e texto ampliável até 200% sem corte (Fluxos §1).
- Não faça: linguagem de cobrança. Nada de "atrasado", metas, pontos ou rankings (Fluxos §1).
- Não faça: copiar layout de tela inteira, proporções exatas, textos, ilustrações, fotos, vídeos, logos ou nomes da referência visual (ESPEC §9).
- Não faça: números de "prova social" sem fonte real nem depoimento inventado (ESPEC §9).
- Não faça: fontes comerciais sem licença (ESPEC §9).
- Não faça: texto essencial dentro de imagem (ESPEC §9).
- Não faça: gradiente, vidro fosco, sombra pesada, ícone em todo título ou cartão dentro de cartão (ESPEC §1 e §6).
