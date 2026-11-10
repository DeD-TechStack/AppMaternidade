---
version: alpha
name: AppMaternidade — Urucum
description: Papel quente, tinta quase preta e um campo de urucum. Editorial na página pública, direto e de uma mão na área logada.
colors:
  primary: "#1A1511"
  neutral: "#F6EFE3"
  accent: "#B0401C"
  on-accent: "#FFF8EE"
  info: "#2B5C70"
  line: "#1A1511"
  focus: "#1A1511"
  paper-deep: "#EBE1D0"
  field-1: "#C9A39A"
  field-2: "#B8ADC4"
  night-primary: "#E3D6C3"
  night-neutral: "#17120E"
  night-accent: "#C47055"
  night-on-accent: "#17120E"
  night-info: "#8FB0BF"
  night-line: "#E3D6C3"
  night-focus: "#F7EFE2"
  night-paper-deep: "#251E18"
  night-field-1: "#3A2723"
  night-field-2: "#2C2733"
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
  field-panel-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.card}"
  field-panel-1:
    backgroundColor: "{colors.field-1}"
    textColor: "{colors.primary}"
    rounded: "{rounded.card}"
  field-panel-1-night:
    backgroundColor: "{colors.night-field-1}"
    textColor: "{colors.night-primary}"
  field-panel-2:
    backgroundColor: "{colors.field-2}"
    textColor: "{colors.primary}"
    rounded: "{rounded.card}"
  field-panel-2-night:
    backgroundColor: "{colors.night-field-2}"
    textColor: "{colors.night-primary}"
---

## Overview

O AppMaternidade tem cara de caderno de casa, não de painel de software: papel quente, tinta quase preta e uma única cor quente, o urucum, usada em campos grandes e em poucos pontos de ação (ESPEC §1). A estrutura vem de linhas finas na cor da tinta, com margens pequenas e campos de cor largos, no lugar de sombras e cartões flutuantes (ESPEC §2). A página pública fala em tom editorial, com uma serifa de exibição pesada para a promessa e uma sem serifa limpa para o resto (ESPEC §3). A área logada é feita para o colo e para a madrugada: números grandes e tabulares, ações na metade de baixo da tela e um tema escuro de pouco brilho com o mesmo urucum, menos saturado (ESPEC §6 e §8). O movimento é curto e some quando a pessoa pede menos movimento (ESPEC §7).

Desde a MAT-44c o Início é uma grade de cartões: campos de cor e faixas de papel, em uma coluna no celular e em duas colunas no computador, com o mesmo respiro em todos. Os campos são o urucum, o barro, a lavanda cinza e, na madrugada, o papel fundo escuro. Sobre eles ficam aparelhos desenhados em CSS com as telas reais de Hoje e Sessão (os mesmos componentes da rota, com dados fixos), e no máximo duas ilustrações de traço de tinta fora dos aparelhos. A profundidade vem do campo de cor e do contorno do aparelho, nunca de sombra.

As superfícies são três. O Início é uma página de decidir e aprender, a única com abertura grande. O Hoje é uma superfície de operar: o que importa é registrar rápido e ver o que está em andamento. A Sessão é de inspecionar um único objeto, o cronômetro.

## Colors

A paleta tem uma família quente, uma fria e os neutros. Nada de gradiente, vidro fosco ou brilho.

- **Tinta (`primary`, #1A1511):** texto, linhas e contorno de foco. Marrom quase preto, nunca preto puro. `line` e `focus` usam o mesmo valor, porque as linhas são na tinta (ESPEC §2).
- **Papel (`neutral`, #F6EFE3):** fundo de tudo. Quente e claro, nunca branco.
- **Papel fundo (`paper-deep`, #EBE1D0):** etiquetas e botões rápidos. Separa sem precisar de sombra.
- **Urucum (`accent`, #B0401C):** a única cor quente saturada. Vai nos campos de cor do Início, no botão principal e em poucos textos de destaque. O nome vem do pigmento vermelho-alaranjado da semente de urucum. Na MAT-44 o matiz desceu 1,2° (de 15,8° para 14,6°) para ficar a pelo menos 20° de todo papel de cor medido na referência visual.
- **Barro (`field-1`, #C9A39A):** campo de cor de tom médio, rosado e terroso, saturação HSL de 0,30. Leva sempre a tinta por cima.
- **Lavanda cinza (`field-2`, #B8ADC4):** segundo campo de cor, frio e apagado, saturação HSL de 0,16. Dá ritmo ao lado do urucum e do barro sem competir com eles. Leva sempre a tinta por cima.
- **Regra dos campos:** saturação HSL de no máximo 35% nos dois temas, matiz fora do intervalo fechado [35°, 65°] (amarelo e âmbar) e a pelo menos 20° de toda cor saturada medida na referência visual.
- **Sobre o urucum (`on-accent`, #FFF8EE):** texto e traço claro sobre o campo de urucum. Com um urucum escuro o bastante para servir de texto sobre o papel, o texto escuro por cima não passaria de 4,5:1, por isso o texto sobre o destaque é claro.
- **Informação (`info`, #2B5C70):** azul-petróleo, só para estado informativo (avisos neutros como "Já há uma sessão em andamento"). Nunca decora.
- **Madrugada (`night-*`):** fundo #17120E, quente e escuro (luminância 0,0065); texto #E3D6C3, abaixo do branco para não ofuscar; urucum #C47055, mesmo matiz (14,6°) com saturação 0,49 contra 0,73; foco #F7EFE2, o único tom bem claro, para o contorno aparecer sobre o fundo e sobre o urucum. Os campos da madrugada são o barro escuro (`night-field-1`, #3A2723) e a lavanda escura (`night-field-2`, #2C2733), com o texto da madrugada por cima.

Contraste WCAG 2.x, conferido no lint, no `contrast.py` da replica-design e no teste de contraste:

| Par | Claro | Madrugada |
|---|---|---|
| texto sobre papel | 15,85 | 12,99 |
| texto sobre urucum | 5,54 | 5,13 |
| urucum como texto sobre papel | 5,11 | 5,13 |
| informação sobre papel | 6,41 | 8,09 |
| texto sobre barro (`field-1`) | 7,93 | 9,82 |
| texto sobre lavanda (`field-2`) | 8,46 | 10,15 |
| texto sobre papel fundo | 13,99 | 11,49 |
| foco contra papel | 15,85 | 16,29 |
| foco contra urucum | 3,10 | 3,17 |
| foco contra barro | 7,93 | 12,31 |
| foco contra lavanda | 8,46 | 12,73 |

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
- **Área logada, dois layouts pela largura do contêiner `app` (em rem, nunca pela janela):**
  - **estreito (menos de 60 rem):** a coluna única de 40 rem, centrada, com a barra de botões rápidos fixa logo acima da navegação inferior, ao alcance do polegar (regra R2: a barra fica fixa com a janela de 40 rem de altura ou mais);
  - **largo (60 rem ou mais):** a moldura ocupa a largura menos a margem do layout, com a navegação numa faixa lateral à esquerda (os mesmos 5 itens, um por linha, "Em breve" como título do grupo, sem `sticky` nem `fixed`). O Hoje fica em duas colunas: o cartão "Em andamento" e o registro rápido à esquerda, "Para você saber" e "Últimos" à direita. A Sessão põe o cronômetro e as ações à esquerda e a ilustração do tipo da sessão num campo à direita. A troca entre os dois é só de CSS: a árvore DOM e a ordem do Tab são as mesmas.
- **Início, três faixas pela largura do contêiner `pagina`:**
  - **estreita (menos de 46 rem):** uma coluna de cartões; padding lateral de 16 px (`md`) e gap de 24 px (`lg`);
  - **média (46 a menos de 60 rem):** uma coluna; padding de 24 px (`lg`) e gap de 40 px (`xl`);
  - **larga (60 rem ou mais):** grade de 2 colunas de mesma largura, cada cartão em 1 ou 2 colunas; padding de 40 px (`xl`) e gap de 64 px (`2xl`).
  - Em toda faixa o gap é maior que o padding lateral mais 8 px, e todos os cartões têm o mesmo padding. Os cartões são filhos diretos do `<main>`.
- **Linha de leitura:** todo texto corrido tem `max-width` entre 55ch e 70ch. No computador, as linhas cheias ficam entre 55 e 70 caracteres. Na Instrument Sans a 17 px, 1ch tem cerca de 11,3 px e cabe cerca de 1,4 caractere por ch, então o `max-width` em ch é só o teto: a largura efetiva vem da coluna de texto de 32,5rem (cerca de 60 a 66 caracteres) nas faixas média e larga.
- Ritmo vertical pela escala de `spacing`: 16 px dentro de um bloco e, entre cartões do Início, o gap da faixa.

## Composição

Análise abstrata das referências visuais da MAT-44 e da MAT-44c. Só entram padrões, faixas e frações aproximadas; nenhum valor medido, nome ou texto da referência.

- **Padrões de bloco.**
  - Cartão de aparelhos: um campo de cor com um grupo de aparelhos inteiros, lado a lado, sem um cobrir o outro, e um texto curto que diz o que eles mostram.
  - Bloco de linhas: rótulo serifado à esquerda e texto à direita, separados por uma linha vertical fina e por linhas horizontais entre as linhas, sobre papel. Num cartão de uma coluna, o rótulo fica em cima do texto. Os fatos usam o mesmo bloco, com o termo no lugar do rótulo.
  - Cartão de janela: um único aparelho grande, notebook, ocupando a maior parte do cartão.
  - Dupla de cartões: dois cartões lado a lado na grade larga, cada um com um aparelho ou um texto.
  - Fecho: título serifado e a chamada para o protótipo, com respiro antes do rodapé.
- **Proporções, em faixas.** Cada campo de cor ocupa a área inteira do seu cartão na grade. Entre um cartão e o seguinte fica o gap da faixa, maior que o padding lateral do cartão. No bloco de linhas, o rótulo fica entre 1/5 e 1/3 da largura e o texto no resto.
- **Escala tipográfica relativa.** O rótulo do bloco de linhas e a citação ficam entre 1,5 e 2,5 vezes o corpo; o título de fecho entre 2,5 e 3,5 vezes. O corpo é a voz de leitura e o resto da página quase não tem texto: o campo fala pela imagem.
- **Aparelhos.** Mostram a tela real (os mesmos componentes da rota, com estado fixo e relógio parado), sem o aviso de demonstração, inertes e escondidos do leitor de tela, com um parágrafo visível ao lado dizendo o que mostram. Em cada largura, todos os celulares visíveis têm a mesma escala, e o notebook a dele; nenhum texto dentro de um aparelho fica abaixo de 11 px efetivos. Na faixa larga eles aparecem em grupos de 1 a 3 (o notebook só nela). Na faixa média, só celulares. Na faixa estreita, um celular por grupo: os outros aparelhos do grupo ficam no DOM e somem por CSS. Nenhum aparelho cobre outro, e nenhum é cortado pela borda do cartão.
- **Ilustrações.** Traço preto contínuo de espessura única, preenchimento chapado de poucas cores, figuras inteiras de pessoas em gestos do dia a dia. No Início ficam no máximo duas fora dos aparelhos, todas na mesma escala, com a base na borda de baixo da área de conteúdo do cartão e centradas no cartão ou numa linha da grade.
- **Ritmo de seções.** Papel e campo se alternam pela ordem do DOM, com no máximo dois campos seguidos. O texto longo nunca fica em cima do campo: fica no papel. O Início tem pelo menos 3 cartões de campo de cor, e pelo menos metade dos cartões mostra um aparelho.

### Grade de computador e mockups (VIS4-00)

Leitura abstrata do `COMPOSICAO.md` e do `DESIGN_SISTEMA.md` da pesquisa da MAT-44c (sala limpa). Só faixas e frações; nenhum valor exato, nome ou texto da referência.

- **Grade.** No computador, as peças ficam numa grade de 2 colunas de mesma largura: uma peça larga ocupa as duas, e as peças de proporção parecida vão em par. O espaço entre peças é da ordem da margem lateral no computador e diminui mais rápido que ela no celular. A nossa grade guarda o par e a peça larga, mas mantém o gap maior que o padding em toda faixa, porque o achado A4 era o contrário (cartões colados).
- **Mídia.** Cantos de 8 px, sem sombra e sem borda; o que separa uma peça da outra é a cor do fundo. Os aparelhos aparecem como objetos inteiros sobre campos de cor lisos. Os nossos são molduras em CSS com a tela real dentro.
- **Leitura.** O texto corrido fica deslocado na grade, não centralizado, numa medida de cerca de 2/3 da largura útil no computador. A nossa medida fica entre 55ch e 70ch.
- **Escuro como seção.** O escuro aparece como tratamento de uma seção, não como tema da página. O cartão da madrugada usa o papel fundo escuro (`night-paper-deep`) com o texto e o foco da noite, só dentro dele.

Três direções foram montadas como telas estáticas (`.oc/direcoes/A`, `B` e `C` do cartão `t_f67d8962`) e pontuadas pelo award-bar em 6 capturas cada: Início em 390 e 1440; Hoje e Sessão com o Sono inicial em 1024 e 1440. Total da captura = 0,4 × UI + 0,3 × UX + 0,3 × inovação; nota da direção = média das 6.

| Direção | Início 390 | Início 1440 | Hoje 1024 | Hoje 1440 | Sessão 1024 | Sessão 1440 | Média |
|---|---|---|---|---|---|---|---|
| A, Faixas: notebook do Hoje em largura total; Sessão e madrugada em par; fatos e chamada em par; navegação lateral de 15 rem; ilustração da Sessão num campo de papel fundo | 7,00 | 7,56 | 7,42 | 7,56 | 7,34 | 7,48 | 7,39 |
| B, Abertura em par: promessa ao lado da Sessão; notebook centrado sob o título; madrugada deitada; navegação de 12 rem; cronômetro em largura total | 6,86 | 7,48 | 7,14 | 7,28 | 7,06 | 7,14 | 7,16 |
| C, Mosaico deitado: texto e aparelho lado a lado em cada cartão largo; madrugada alta em par com um cartão de texto; fatos em 4 colunas; navegação lateral de 16 rem num campo de papel fundo; ilustração da Sessão num campo de barro à direita | 7,00 | 7,76 | 7,48 | 7,62 | 7,54 | 7,68 | 7,51 |

Vence a C (7,51 contra 7,39 da A). O texto ao lado do aparelho em cada cartão largo lê melhor que o texto em cima, e a madrugada escura em par mostra o modo noturno sem tomar a largura toda. Na área logada, a faixa lateral em papel fundo separa a navegação sem linha extra, e a Sessão com a ilustração num campo à direita deixa o cronômetro e as ações na coluna da esquerda. A B perdeu em UX: a navegação de 12 rem quebra "Desenvolvimento" e a promessa ao lado da Sessão deixa alturas desiguais. A A perdeu em inovação por repetir o padrão de pares sem um ponto focal.

Distribuição na faixa larga depois do laço visual (6 cartões, 4 com aparelho). Valem a rodada 7 (achados do avaliador independente) e as rodadas 8 a 11 (correções medidas no navegador):

- promessa (2 colunas): o título grande atravessa a grade; a apresentação fica na coluna de texto, à esquerda, e os pilares numa coluna lateral à direita, uma etiqueta por linha, sem quebrar. Embaixo, de ponta a ponta, um campo de cor com o notebook do Hoje, grande. Nas faixas média e estreita o topo empilha (título, apresentação, pilares em linha que quebram por palavra inteira) e o campo leva o celular do Hoje;
- telas (campo de urucum): título, legenda e o celular da Sessão. O notebook é um só no Início, o do topo. A partir de 85 rem a seção divide a fileira com a madrugada;
- madrugada (papel fundo escuro, tema só dentro do cartão): título, texto, celular com a Sessão da mamada e legenda;
- para que serve: as três linhas da base e, ao lado (larga) ou embaixo, a ilustração dentro de um campo de imagem que ela enche, com a base na base do campo e o campo na linha direita da grade;
- fatos: bloco de linhas;
- chamada (campo de lavanda): texto, link, celular do Hoje e legenda.

Regras que a rodada 7 fixou:

- **Mockup de celular = janela.** Tela de altura fixa (31,6 rem naturais na faixa de 20 a 24,99 rem do contêiner e 33,65 rem acima dela), com o conteúdo cortado pela moldura e a barra inferior presa no pé, como no aparelho real. O recorte cai entre duas linhas de texto, nunca dentro de uma: a altura foi medida no navegador, no estado fixo da vitrine, e mudar o conteúdo da vitrine pede medir de novo (dentro de `@container` o `rem` é o da fonte do contêiner, então 390 px a 100% e 768 px a 200% caem no mesmo degrau). A tela tem pelo menos 22 rem de largura interna, para a navegação ficar em linha, com os 5 itens lado a lado. A escala é a mesma em todos os celulares da página e muda em degraus: 0,85 em 390 (celular de 309 px, 17 px de folga de cada lado, texto de 13 px com 11,05 px efetivos), 0,95 e 1 nas faixas maiores. Cada mockup mostra a navegação do aparelho que representa: a barra inferior no celular e a lateral no notebook.
- **Fonte ou zoom ampliados.** Com o contêiner abaixo de 20 rem o celular encolhe em degraus de escala (0,55, 0,4, 0,3 e 0,22), para nunca passar da seção; nessa faixa só vale a geometria, e o texto do celular não precisa ficar legível. A trilha do bloco da chamada final é `minmax(0, 1fr)`, como a dos outros cartões.
- **Um aviso só.** O aviso de demonstração e a faixa de protótipo ficam no topo da página; dentro dos mockups não há texto de serviço.
- **Uma margem esquerda.** O logo, o rodapé, a borda esquerda dos campos de cor e o texto das seções sem campo começam no mesmo x; dentro de um campo o texto fica recuado pelo padding do cartão, igual em todos. Por isso as seções de papel têm padding lateral 0 e as de campo têm o padding do cartão (ver a nota sobre a VIS4-05 no HANDOFF).
- **Respiro.** Cerca de 150 px entre seções na faixa larga (o gap é igual na linha e entre linhas) e 2 rem entre os elementos de uma seção.
- **Imagem enche o cartão.** A ilustração fora dos mockups ocupa mais de 70% da área do campo dela, com os mesmos cantos arredondados dos outros cartões de imagem.
- **Barra inferior "Em breve".** Uma etiqueta discreta (caixa alta, texto secundário) sobre as colunas 2 a 5, sem traços verticais; a linha de 1 px fica 4 px acima dos ícones, sem atravessar rótulos.
- **Hoje e Sessão altos.** Em telas de 860 px de altura ou mais, o conteúdo cresce (cartão, cronômetro, botões e linhas de "Últimos") para ocupar de 75% a 90% da altura de 900 px. Em 1024 × 768 fica o tamanho menor, que mantém os botões à vista.

Na medição da rodada 1, o texto ao lado de um aparelho alto deixava um vazio maior que duas vezes o gap embaixo do texto. Por isso, nos cartões com celular, o texto fica em cima do aparelho.

### Direção escolhida (VIS2-00)

Três direções de composição foram montadas como telas estáticas para Início e Hoje e pontuadas pelo award-bar (UI 40%, UX 30%, inovação 30%), em 390 e 1440:

| Direção | UI | UX | Inovação | Total |
|---|---|---|---|---|
| A, Vitrine: promessa curta no papel e, logo abaixo, um campo de urucum alto com notebook e dois celulares sobrepostos; bloco de linhas no papel; campo de barro com cena de ilustrações; campo de lavanda com a madrugada; fatos numa faixa de papel | 7,6 | 7,8 | 7,0 | 7,48 |
| B, Caderno: promessa enorme no papel; campos baixos alternados um a um; um aparelho por campo saindo pela borda de cima | 7,2 | 6,8 | 7,2 | 7,08 |
| C, Mosaico: pares de campos encostados; notebook grande sobre lavanda; fatos dentro do campo de urucum; Hoje em duas colunas no desktop | 7,4 | 7,4 | 7,0 | 7,28 |

Vence a A, pela maior nota. O grupo de aparelhos sobrepostos mostra o produto logo na abertura; a legenda ao lado do campo e o bloco de linhas no papel mantêm a leitura clara nas duas larguras. A B perdeu em UX (campos vazios e rolagem horizontal em 390) e a C pesou com dois campos encostados. No Hoje e na Sessão a A põe o cartão "Em andamento" e o cronômetro num campo de cor de borda a borda no celular.

Esta tabela fica como histórico da MAT-44. A grade do Início e os aparelhos foram refeitos na MAT-44c (subseção "Grade de computador e mockups (VIS4-00)", acima): os aparelhos deixaram de se sobrepor e de mudar de escala, e as miniaturas deram lugar às telas reais.

## Elevation & Depth

Plano. Profundidade vem de linha, cor e espaço, não de sombra. No Início, o aparelho se destaca do campo de cor pelo contorno de tinta da moldura; nenhum aparelho cobre outro. Nenhum `box-shadow` com desfoque acima de 4 px, nenhum `backdrop-filter` e nenhum `filter: blur`. A barra fixa de baixo se separa do conteúdo por uma linha de tinta no topo e pelo fundo de papel opaco.

## Shapes

- Cartões e mídia: 8 px (`card`, `media`).
- Botões e botões rápidos: 6 px (`control`).
- Etiquetas: 3 px (`tag`), quase retas.
- Campos de cor: 8 px (`card`), da mesma família dos cartões.
- Molduras de aparelho: celular com canto largo e notebook com tela de canto pequeno e base mais larga que a tela, desenhados em CSS com contorno de tinta, sem sombra.
- Ilustrações: traço contínuo de tinta com preenchimento chapado nas cores dos tokens (papel, urucum, barro e lavanda). De 3 a 6 distintas nas três telas, desenhadas para o projeto em SVG, todas decorativas (`aria-hidden="true"`), uma delas no estado vazio da Sessão.

## Components

- **`button-primary`:** fundo urucum, texto claro, 48 px de altura. Uma ação principal por área.
- **`button-secondary`:** fundo de papel e contorno de 1 px na tinta.
- **`tag`:** etiqueta em papel fundo, canto de 3 px, rótulo em caixa alta. Usada nos quatro pilares.
- **`card`:** o único contêiner com borda. Contorno de 1 px na tinta, canto de 8 px, sem sombra. Nunca há cartão dentro de cartão.
- **`nav-item`:** item da navegação inferior, só texto, 48 px de altura. O item atual tem um traço de urucum de 3 px no topo.
- **`quick-action`:** botão rápido em papel fundo, 48 px de altura, 56 px na madrugada.
- **Confirmação:** linha de tinta no topo, texto da confirmação, "Desfazer" e "Fechar". Não some sozinha.
- **Foco:** contorno de 2 px na cor `focus`, com afastamento de 2 px, em todo elemento focável.
- **Campo de cor (`field-panel-*`):** cartão do Início que ocupa a área inteira da sua célula na grade, canto de 8 px, fundo urucum, barro, lavanda ou, na madrugada, papel fundo escuro (`night-paper-deep`, com os tokens da noite só dentro dele), com `data-campo` no elemento. Texto sobre o barro e a lavanda é sempre a tinta; sobre o urucum, o `on-accent`.
- **Aparelho:** moldura de celular ou notebook em CSS, com a tela real de Hoje ou Sessão dentro (os mesmos componentes da rota, estado fixo, relógio parado, sem o aviso de demonstração e sem ids repetidos), inerte e escondida do leitor de tela, com um parágrafo visível ao lado dizendo o que ela mostra.
- **Cartão do Início:** cada seção filha do `<main>` é um cartão da grade, com o padding lateral da faixa; os campos de cor pintam o cartão inteiro, e os cartões de papel não têm fundo nem borda.
- **Fato em destaque:** o termo do fato em Fraunces grande, com a explicação logo abaixo, numa faixa de quatro colunas no desktop.
- Os componentes são próprios, feitos com Tailwind e as variáveis de uso de `tema.css`. Da lista aprovada (shadcn/ui e Magic UI) nenhum item entrou na MAT-44: os que serviriam ao Início trazem sombra, desfoque, contador ou movimento contínuo, que as regras daqui proíbem, e os aparelhos são desenhados à mão. Os ícones da área logada vêm do `lucide-react` 1.69.0, importados um a um, sempre ao lado de um rótulo visível.

## Do's and Don'ts

- Faça: registro em até 2 toques a partir de Hoje; ações principais na metade de baixo da tela; alvos de pelo menos 44 × 44 px, 56 px de altura na madrugada (Fluxos §1).
- Faça: tema escuro de pouco brilho na madrugada, sem fundo branco, com movimento mínimo (Fluxos §1).
- Faça: erro reversível. Toda confirmação tem "Desfazer" e só sai quando a pessoa fecha ou faz outro registro (Fluxos §1).
- Faça: rótulos completos para leitor de tela ("Iniciar sono de Heloísa") e texto ampliável até 200% sem corte (Fluxos §1).
- Não faça: linguagem de cobrança. Nada de "atrasado", metas, pontos ou rankings (Fluxos §1).
- Não faça: copiar layout de tela inteira, proporções exatas, textos, ilustrações, fotos, vídeos, logos ou nomes da referência visual (ESPEC §9).
- Não faça: números de "prova social" sem fonte real nem depoimento inventado (ESPEC §9).
- Não faça: fontes comerciais sem licença (ESPEC §9).
- Não faça: texto essencial dentro de imagem (ESPEC §9).
- Não faça: gradiente, vidro fosco, sombra pesada, ícone em todo título ou cartão dentro de cartão (ESPEC §1 e §6).
- Faça: alternar campo de cor e papel no Início, com no máximo dois campos seguidos e texto longo sempre no papel.
- Faça: aparelhos inteiros, na mesma escala por tipo em cada largura, sobre campos de cor; profundidade nunca por sombra.
- Não faça: ícone na página pública. Na área logada, ícone só ao lado de um rótulo de texto visível.
- Não faça: decalcar ilustração, aparelho ou composição de bloco da referência visual, nem usar a cor dela.
