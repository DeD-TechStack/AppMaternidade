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

Desde a MAT-44 o Início é montado em campos de cor de ponta a ponta, alternados com faixas de papel. Os campos são o urucum e dois tons terrosos de pouca saturação, o barro e a lavanda cinza. Sobre eles ficam aparelhos desenhados em CSS, com as telas de Hoje e Sessão em miniatura, e ilustrações de traço de tinta com adultos e bebês em cenas de cuidado. A profundidade vem da sobreposição e da escala dos aparelhos, nunca de sombra.

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
- Na área logada, a barra de botões rápidos fica fixa logo acima da navegação inferior, ao alcance do polegar.
- Ritmo vertical pela escala de `spacing`: 16 px dentro de um bloco, 40 a 64 px entre blocos, 96 px entre seções da página pública no desktop.

## Composição

Análise abstrata da referência visual da MAT-44 (fatias `desktop_03` a `desktop_23` e `celular_04` a `celular_15`). Só entram padrões, faixas e frações aproximadas; nenhum valor medido, nome ou texto da referência.

- **Padrões de bloco.**
  - Campo de aparelhos: um campo de cor largo com vários aparelhos de alturas diferentes, sobrepostos, sem texto dentro do campo (fatias 03, 09 e 17).
  - Bloco de linhas: rótulo serifado à esquerda e texto à direita, separados por uma linha vertical fina e por linhas horizontais entre as linhas, sobre papel (fatias 04 e 05).
  - Campo de ilustrações: figuras de traço espalhadas em volta de um centro vazio, sobre campo de cor (fatias 06 e 07).
  - Campo de janela: um único aparelho grande, notebook ou navegador, ocupando a maior parte do campo (fatias 08, 10, 11 e 14).
  - Dupla de campos: dois campos lado a lado, cada um com um elemento solto e uma figura pequena (fatia 18).
  - Fecho: título serifado centrado e respiro grande antes do rodapé (fatias 22 e 23).
- **Proporções, em faixas.** O campo de cor ocupa quase toda a largura da área de conteúdo, com uma margem lateral igual à do layout. A altura de cada campo fica entre 1/2 e 1 vez a altura da janela no desktop. Entre um campo e o seguinte há uma fresta de papel estreita, bem menor que a margem lateral de leitura. No bloco de linhas, o rótulo fica entre 1/5 e 1/3 da largura e o texto no resto.
- **Escala tipográfica relativa.** O rótulo do bloco de linhas e a citação ficam entre 1,5 e 2,5 vezes o corpo; o título de fecho entre 2,5 e 3,5 vezes. O corpo é a voz de leitura e o resto da página quase não tem texto: o campo fala pela imagem.
- **Aparelhos.** Aparecem em grupos de 2 a 5, em escalas diferentes, uns na frente dos outros, às vezes cortados pela borda do campo. A profundidade vem da sobreposição e da diferença de tamanho. No nosso produto as molduras são desenhadas em CSS, sem sombra, e por dentro mostram as nossas miniaturas de Hoje e Sessão.
- **Ilustrações.** Traço preto contínuo de espessura única, preenchimento chapado de poucas cores, figuras inteiras de pessoas em gestos do dia a dia, em escala pequena em relação ao campo. As nossas são próprias: adultos e bebês em cenas de cuidado, traço de tinta e preenchimento com as cores dos tokens.
- **Ritmo de seções.** Papel e campo se alternam, com no máximo dois campos seguidos. O texto longo nunca fica em cima do campo: fica no papel, entre campos. O topo da página é um campo de aparelhos, sem título grande acima dele.

### Direção escolhida (VIS2-00)

Três direções de composição foram montadas como telas estáticas para Início e Hoje e pontuadas pelo award-bar (UI 40%, UX 30%, inovação 30%), em 390 e 1440:

| Direção | UI | UX | Inovação | Total |
|---|---|---|---|---|
| A, Vitrine: promessa curta no papel e, logo abaixo, um campo de urucum alto com notebook e dois celulares sobrepostos; bloco de linhas no papel; campo de barro com cena de ilustrações; campo de lavanda com a madrugada; fatos numa faixa de papel | 7,6 | 7,8 | 7,0 | 7,48 |
| B, Caderno: promessa enorme no papel; campos baixos alternados um a um; um aparelho por campo saindo pela borda de cima | 7,2 | 6,8 | 7,2 | 7,08 |
| C, Mosaico: pares de campos encostados; notebook grande sobre lavanda; fatos dentro do campo de urucum; Hoje em duas colunas no desktop | 7,4 | 7,4 | 7,0 | 7,28 |

Vence a A, pela maior nota. O grupo de aparelhos sobrepostos mostra o produto logo na abertura; a legenda ao lado do campo e o bloco de linhas no papel mantêm a leitura clara nas duas larguras. A B perdeu em UX (campos vazios e rolagem horizontal em 390) e a C pesou com dois campos encostados. No Hoje e na Sessão a A põe o cartão "Em andamento" e o cronômetro num campo de cor de borda a borda no celular.

### Área de conta (MAT-37)

As telas de acesso (entrar, criar conta, recuperar acesso, nova senha, conta excluída) e as telas logadas da conta (Começar e Conta) são superfícies de configurar: formulário curto, validação clara e pouca decoração. Elas usam só os tokens e as classes desta base, sem token novo. Não herdam do Início o campo de cor de ponta a ponta, os aparelhos nem as ilustrações.

Três direções foram montadas como telas estáticas para Entrar e Conta e pontuadas pelo award-bar (UI 40%, UX 30%, inovação 30%), em 390 e 1440:

| Direção | UI | UX | Inovação | Total |
|---|---|---|---|---|
| A, Folha única: coluna estreita em toda largura; Conta em bloco de linhas, com o rótulo em caixa alta à esquerda | 7,3 | 7,8 | 6,4 | 7,18 |
| B, Campo e papel: Entrar com um campo de lavanda ao lado do formulário; Conta com cabeçalho em campo de barro e seções em cartões | 6,8 | 6,9 | 7,0 | 6,89 |
| C, Índice e régua: Entrar em duas colunas no desktop, com o título grande à esquerda e o formulário à direita; Conta com índice das seções à esquerda no desktop e seções separadas por régua de tinta | 7,6 | 7,7 | 7,0 | 7,45 |

Vence a C, pela maior nota. O título em escala grande e a régua de tinta dão a hierarquia sem caixa nem cor, o índice deixa a Conta navegável no desktop e o formulário fica numa medida de leitura de cerca de 28 rem. No celular a C vira uma coluna só, e o índice sai. A A perdeu em inovação, com a coluna estreita solta em 1440. A B perdeu em UI, pelo campo de cor grande sem conteúdo e pelos cartões empilhados no celular.

Alcance de duas regras gerais desta base na área de conta:

- **"Toda confirmação tem Desfazer"** vale para os registros da rotina. Na área de conta, a ação irreversível (excluir conta, excluir família, remover acesso, sair da família, cancelar convite) pede confirmação antes, numa caixa de diálogo. A ação reversível (mudar o papel de outra pessoa, arquivar, editar) mostra a confirmação na região de status, com o controle inverso na mesma tela. A exceção é rebaixar o próprio papel: quem rebaixa perde os controles de responsável e não tem como desfazer sozinho, então a caixa "mudar papel" aberta na própria linha avisa disso antes do botão de confirmar.
- **Os 56 px de altura na madrugada** valem para as ações de registro, como na base (`--alvo-rapido`). Na área de conta valem os mínimos gerais: 44 × 44 px em links e controles, 48 px nos botões e 56 px na ação principal de cada formulário, nos dois temas.

## Elevation & Depth

Plano. Profundidade vem de linha, cor, espaço, sobreposição e escala, não de sombra. Nos campos do Início os aparelhos se sobrepõem e mudam de tamanho para dar a sensação de primeiro e segundo plano. Nenhum `box-shadow` com desfoque acima de 4 px, nenhum `backdrop-filter` e nenhum `filter: blur`. A barra fixa de baixo se separa do conteúdo por uma linha de tinta no topo e pelo fundo de papel opaco.

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
- **Campo de cor (`field-panel-*`):** seção de ponta a ponta da área de conteúdo, canto de 8 px, fundo urucum, barro ou lavanda, com `data-campo` no elemento. Texto sobre o barro e a lavanda é sempre a tinta; sobre o urucum, o `on-accent`.
- **Aparelho:** moldura de celular ou notebook em CSS, com as miniaturas de Hoje e Sessão dentro, inerte e escondida do leitor de tela, com um parágrafo visível ao lado dizendo o que ela mostra.
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
- Faça: profundidade por sobreposição e escala dos aparelhos, nunca por sombra.
- Não faça: ícone na página pública. Na área logada, ícone só ao lado de um rótulo de texto visível.
- Não faça: decalcar ilustração, aparelho ou composição de bloco da referência visual, nem usar a cor dela.
