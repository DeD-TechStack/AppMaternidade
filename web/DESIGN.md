---
version: alpha
name: AppMaternidade — Urucum
description: Papel quente, tinta quase preta e um único urucum. Estrutura editorial de grade de 10 colunas, fios de 1 px e tipo em escala fixa. Direto e de uma mão na área logada.
colors:
  primary: "#1A1511"
  neutral: "#F6EFE3"
  accent: "#B0401C"
  on-accent: "#FFF8EE"
  secondary: "#5E554C"
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
  night-secondary: "#BAAF9F"
  night-info: "#8FB0BF"
  night-line: "#E3D6C3"
  night-focus: "#F7EFE2"
  night-paper-deep: "#251E18"
  night-field-1: "#3A2723"
  night-field-2: "#2C2733"
typography:
  display-xl:
    fontFamily: Fraunces
    fontSize: 6rem
    fontWeight: 600
    lineHeight: 6rem
    letterSpacing: 0
  display-m:
    fontFamily: Fraunces
    fontSize: 4.5rem
    fontWeight: 400
    lineHeight: 4.5rem
    letterSpacing: 0
  citacao:
    fontFamily: Fraunces
    fontSize: 3rem
    fontWeight: 400
    lineHeight: 3.625rem
    letterSpacing: 0
  secao:
    fontFamily: Instrument Serif
    fontSize: 3.5rem
    fontWeight: 400
    lineHeight: 4.1875rem
    letterSpacing: 0
  subtitulo:
    fontFamily: Instrument Serif
    fontSize: 3rem
    fontWeight: 400
    lineHeight: 3.625rem
    letterSpacing: 0
  rotulo:
    fontFamily: Instrument Serif
    fontSize: 2rem
    fontWeight: 400
    lineHeight: 2.375rem
    letterSpacing: 0
  nav-grande:
    fontFamily: Instrument Serif
    fontSize: 5.5rem
    fontWeight: 400
    lineHeight: 5.5rem
    letterSpacing: 0
  corpo-g:
    fontFamily: Instrument Sans
    fontSize: 1.75rem
    fontWeight: 400
    lineHeight: 2.4375rem
    letterSpacing: 0
  corpo:
    fontFamily: Instrument Sans
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.75rem
    letterSpacing: 0
  corpo-p:
    fontFamily: Instrument Sans
    fontSize: 1.0625rem
    fontWeight: 400
    lineHeight: 1.5rem
    letterSpacing: 0
  ui:
    fontFamily: Instrument Sans
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.3125rem
    letterSpacing: 0
  numero:
    fontFamily: Zilla Slab
    fontSize: 7rem
    fontWeight: 700
    lineHeight: 5.625rem
    letterSpacing: 0
    fontFeature: "tnum"
  cronometro:
    fontFamily: Zilla Slab
    fontSize: 14rem
    fontWeight: 700
    lineHeight: 11.25rem
    letterSpacing: 0
    fontFeature: "tnum"
  botao:
    fontFamily: Fraunces
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.5rem
    letterSpacing: 0
rounded:
  tag: 4px
  inner: 4px
  control: 8px
  media: 8px
spacing:
  s8: 8px
  s16: 16px
  s24: 24px
  s32: 32px
  s64: 64px
  s96: 96px
  s128: 128px
  s160: 160px
  s192: 192px
  margin-wide: 32px
  margin-mid: 24px
  margin-narrow: 16px
  measure: 65ch
  target: 44px
  target-night: 56px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.botao}"
    rounded: "{rounded.control}"
    padding: 32px
    height: 80px
  button-primary-night:
    backgroundColor: "{colors.night-accent}"
    textColor: "{colors.night-on-accent}"
  button-frame:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.botao}"
    rounded: "{rounded.control}"
    height: 48px
  button-frame-night:
    backgroundColor: "{colors.night-neutral}"
    textColor: "{colors.night-primary}"
  tag:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.primary}"
    typography: "{typography.ui}"
    rounded: "{rounded.tag}"
    padding: 6px
    height: 26px
  tag-night:
    backgroundColor: "{colors.night-paper-deep}"
    textColor: "{colors.night-primary}"
  field-narrow:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.primary}"
    typography: "{typography.rotulo}"
    rounded: "{rounded.tag}"
    height: 64px
  field-narrow-night:
    backgroundColor: "{colors.night-paper-deep}"
    textColor: "{colors.night-primary}"
  secondary-text:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
  secondary-text-night:
    backgroundColor: "{colors.night-neutral}"
    textColor: "{colors.night-secondary}"
  secondary-text-surface:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.secondary}"
  accent-text:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.accent}"
  accent-text-night:
    backgroundColor: "{colors.night-neutral}"
    textColor: "{colors.night-accent}"
  info-text:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.info}"
  info-text-night:
    backgroundColor: "{colors.night-neutral}"
    textColor: "{colors.night-info}"
  footer:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
  footer-night:
    backgroundColor: "{colors.night-paper-deep}"
    textColor: "{colors.night-primary}"
  dark-section:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
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
  media-1:
    backgroundColor: "{colors.field-1}"
    textColor: "{colors.primary}"
    rounded: "{rounded.media}"
  media-1-night:
    backgroundColor: "{colors.night-field-1}"
    textColor: "{colors.night-primary}"
  media-2:
    backgroundColor: "{colors.field-2}"
    textColor: "{colors.primary}"
    rounded: "{rounded.media}"
  media-2-night:
    backgroundColor: "{colors.night-field-2}"
    textColor: "{colors.night-primary}"
---

## Overview

O AppMaternidade tem cara de caderno de casa, não de painel de software: papel quente, tinta quase preta e uma única cor quente, o urucum. A estrutura vem de uma grade de 10 colunas sem calha, de fios de 1 px na cor da tinta e de uma escala de tipo fixa. Não há sombra, gradiente, vidro fosco nem cartão com borda. A página pública fala em tom editorial, com serifa de exibição para o título e uma serifa condensada para as perguntas e os rótulos. A área logada é feita para o colo e para a madrugada: números grandes e tabulares em slab, uma barra de registro de 64 px e um tema escuro de pouco brilho. O movimento é curto e some quando a pessoa pede menos movimento.

O contrato abaixo é o do sistema-base (MAT-44d). Ele vale para todas as telas, e a página `sistema` é a amostra viva dele.

## Colors

Uma família quente, os neutros e a madrugada. Nada de gradiente.

- **Tinta (`primary`, #1A1511):** texto, fios e seção escura. 15,85:1 sobre o papel.
- **Papel (`neutral`, #F6EFE3):** fundo de toda página clara.
- **Secundário (`secondary`, #5E554C):** legendas e ajuda, sólido. 6,38:1 sobre o papel e 5,63:1 sobre a superfície. Nunca se usa tinta a 50% para texto.
- **Superfície (`paper-deep`, #EBE1D0):** etiquetas e campo no celular.
- **Urucum (`accent`, #B0401C):** botão primário, CTA, seção "Em andamento" ou cronômetro, rodapé e texto de erro. 5,54:1 com `on-accent` (#FFF8EE) e 5,11:1 como texto sobre o papel.
- **Barro e lavanda (`field-1` #C9A39A e `field-2` #B8ADC4):** só como fundo de mídia (`[data-midia]`). Nunca cartão com texto.
- **Informação (`info`, #2B5C70):** só texto de estado neutro. Sai de todo fundo.
- **Madrugada (`night-*`):** fundo #17120E, texto #E3D6C3 (12,99:1), secundário #BAAF9F (a 80%), fios a 20%, blocos em #251E18, primário #C47055 com texto #17120E (5,13:1), foco #F7EFE2. O rodapé da madrugada usa o bloco #251E18 com texto #E3D6C3, 11,49:1.
- **Rodapé:** urucum com `on-accent` (#FFF8EE), 5,54:1.

| Par | Claro | Madrugada |
|---|---|---|
| texto sobre papel | 15,85 | 12,99 |
| secundário sobre papel | 6,38 | 8,61 |
| urucum com texto do botão | 5,54 | 5,13 |
| urucum como texto sobre papel | 5,11 | 5,13 |
| rodapé | 5,54 | 11,49 |

## Typography

Quatro famílias, todas SIL OFL 1.1, auto-hospedadas pelos pacotes `@fontsource` (registro em `web/PROVENANCE.md`): **Fraunces** (exibição e botões), **Instrument Serif** (subtítulos, perguntas, rótulos e campos), **Instrument Sans** (corpo e interface) e **Zilla Slab** 700 (números e cronômetro).

O tracking é 0 em tudo. **Nenhum texto em caixa alta.** Nada menor que 15 px. O conjunto permitido de `font-size` é 15, 17, 20, 24, 28, 32, 36, 48, 56, 72, 80, 88, 96, 112 e 224, mais o nome do rodapé, que é fluido.

| Token | 1440 (px/entrelinha, peso) | Abaixo de 768 | Uso |
|---|---|---|---|
| `display-xl` | 96/96, 600 (80/80 de 768 a 991) | 48/48 | `h1` de toda tela |
| `display-m` | 72/72, 400 | 48/48 | título da seção escura |
| `citacao` | 48/58, 400 itálico | 32/38 | citação |
| `secao` | 56/67, 400 | 36/43 | pergunta antes do CTA |
| `subtitulo` | 48/58, 400 | 36/43 | linha sob o `h1`, títulos de bloco |
| `rotulo` | 32/38, 400 | 24/29 | rótulo das linhas e dos campos |
| `nav-grande` | 88/88, 400 | 56/56 | palavras grandes do fim do Início |
| `corpo-g` | 28/39 | 20/28 | parágrafo de abertura |
| `corpo` | 20/28 | 17/24 | texto das linhas, links do cabeçalho |
| `corpo-p` | 17/24 | 17/24 | ajuda de campo, links do rodapé |
| `ui` | 15/21 | 15/21 | etiquetas, texto legal |
| `numero` | 112/90, 700 | 112/90 (cai para 96, 72 ou 56 se não couber) | números |
| `cronometro` | 224/180, 700 | 96/77 | cronômetro da Sessão |
| `botao` | 24/24, 600 | 24/24 | botão primário e de moldura dupla |

Larguras de linha: `corpo-g` até 65ch dentro de c2–c8; texto das linhas em c4–c8 com `padding-left: 32px` e no máximo 560 px; citação em c1–c6. Nenhum parágrafo passa de 65 caracteres por linha.

## Layout

- **Margem fixa:** 32 px a partir de 992; 24 px de 768 a 991; 16 px abaixo de 768. Largura máxima da área útil de 1600 px (640 px abaixo de 768).
- **Grade:** 10 colunas iguais sem calha a partir de 768; abaixo disso, 1 coluna. O x de `cN` é `margem + (N−1) × área útil ÷ 10`. Em 1440 (área útil de 1376): c1=32, c2=169,6, c3=307,2, c4=444,8, c5=582,4, c6=720, c7=857,6, c8=995,2, c9=1132,8, c10=1270,4, fim=1408.
- **Usos:** mídia larga em c1–c10; texto corrido em c2–c8; linha rótulo + texto com rótulo em c2–c3, texto em c4–c8 e fio vertical em x de c4; abertura com título em c1–c8 e coluna lateral em c9–c10; faixa de 3 números com 3 colunas iguais e 2 fios verticais; galeria de 2 colunas com gap de 32 (a partir de 992), 16 (768 a 991) ou 8 (abaixo de 768).
- **Ritmo vertical:** escala única de 8, 16, 24, 32, 64, 96, 128, 160 e 192. Saem 4 e 40. Cabeçalho para `h1`: 64 (32 no celular). `h1` para subtítulo: 8. Fio da abertura para o primeiro bloco: 32 (16). Mídia para título do bloco: 128 (48). Parágrafo para números: 96 (48). Números para mídia: 128 (48). Mídia para linhas e linhas para galeria: 160 (48). Entre linhas: 32 (48). Entre peças da galeria: 32 (8). Fim do conteúdo para o rodapé: 192.
- **Fios:** 1 px na tinta (`#1A1511`). Na madrugada, `#E3D6C3` a 20%, que só serve de divisor; o fio de campo de formulário é sólido `#E3D6C3`. Ficam na abertura (horizontal em c1–c10 e vertical em x de c9, só nos 80 px finais), nos números (horizontal no topo e 2 verticais), nas linhas (vertical entre rótulo e texto e horizontal embaixo, de c2 a c9) e antes do bloco de cartões. Proibido: fio sob o cabeçalho, moldura de página e borda nos 4 lados, exceto em botão de moldura dupla.

### Área de conta (MAT-37)

As telas de acesso (Entrar, Criar conta, Recuperar acesso, Nova senha e Conta excluída) e a de Começar usam o Campo de mel: o cabeçalho e o rodapé são os da casca, e o aviso de demonstração mora no rodapé. A moldura de cada tela não desenha marca, cabeçalho nem aviso próprios.

- **Telas de acesso, em 1440 (a partir de 64 rem):** duas colunas, 7/5 da grade e 48 px entre elas. À esquerda, o formulário no papel: `h1` em Literata 600 na escala do h1 (`cm-h1`, 84/88 em 1440 e 42/46 em 390), com a segunda linha inteira em itálico e linhas de até 17 caracteres para caberem na coluna; depois a frase, os campos de 56 px com raio 14 (48 px em Começar e Conta), a pílula primária de 56 px de largura cheia e, sobre um fio de 1 px, os links secundários, sempre sublinhados e com alvo de 44 px. O tamanho de botões e campos vem de `cm-botao` e `cm-campo-entrada`, sem `alvo-toque`. À direita, um painel de mel com a luz de estúdio e a cena `web/public/cenas/acesso/entrar` (512 × 768 em 1×, cortada por cima e por baixo para encher a altura da coluna). A coluna do formulário se centra na altura do painel, sem sobra vazia ao lado. O painel começa no alto da primeira dobra.
- **Em 390:** uma coluna só, o formulário primeiro e o painel com a cena depois, com 352 px de altura.
- **Começar:** a mesma moldura de duas colunas; o passo "Seu nome" fica num cartão branco de raio 20, sem sombra, ao lado da cena.
- **Conta:** sem cena. Índice das seções à esquerda a partir de 64 rem (sai no celular) e, à direita, cada seção numa linha de duas colunas (texto e controles) separada por um fio de 1 px. A zona de perigo (excluir a conta) é um cartão de raio 20 com contorno de 1,5 px. Uma barra fina logo abaixo do cabeçalho traz o link da Conta, o do protótipo do Hoje e o "Sair"; acima dela, sem banco, a linha única do aviso de demonstração (o rodapé do app não a traz).
- **Erros e estados:** o erro de campo e o resumo de erro levam ícone e palavras, nunca só a cor; a confirmação de uma ação aparece numa região de status com ícone. Os campos, os botões, a madrugada e o foco são os da base (`cm-campo-*`, `cm-botao-*`, variáveis `--cor-*`); nenhuma tela desta área traz token, sombra, gradiente ou ilustração à mão fora deles.

Alcance de duas regras gerais desta base na área de conta:

- **"Toda confirmação tem Desfazer"** vale para os registros da rotina. Na área de conta, a ação irreversível (excluir conta, excluir família, remover acesso, sair da família, cancelar convite) pede confirmação antes, numa caixa de diálogo. A ação reversível (mudar o papel de outra pessoa, arquivar, editar) mostra a confirmação na região de status, com o controle inverso na mesma tela. A exceção é rebaixar o próprio papel: quem rebaixa perde os controles de responsável e não tem como desfazer sozinho, então a caixa "mudar papel" aberta na própria linha avisa disso antes do botão de confirmar.
- **Os 56 px de altura na madrugada** valem para as ações de registro, como na base (`--alvo-rapido`). Na área de conta valem os mínimos gerais: 44 × 44 px em links e controles, 48 px nos botões e 56 px na ação principal de cada formulário, nos dois temas.

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

## Elevation & Depth

Plano. Profundidade vem de linha, cor, espaço, escala e, nos aparelhos de mídia, de inclinação em CSS 3D. Nenhum `box-shadow`, nenhum `backdrop-filter` e nenhum `filter: blur`.

## Shapes

Só 0, 4, 8 e 50%. Etiqueta e campo no celular: 4. Botão, moldura dupla e mídia: 8 (4 abaixo de 768 na mídia). Moldura dupla: 8 por fora e 4 por dentro. Sem cartão com borda.

## Components

- **Cabeçalho e menu (um componente só):** em 1440, 64 px, `position: sticky; top: 0`, fundo papel opaco, sem `border-bottom`. O nome do site em x=32, em Fraunces 600 24/24. De 3 a 4 links em `corpo`, com 48 px entre eles e o último terminando no x de c9. À direita, um botão de moldura dupla de 48 px, encostado em x=1408. Submenu "+ Em breve": painel de cerca de 224 × 120, moldura dupla, raio 8, abre na hora. Abaixo de 768: 60 px, botão de menu 44 × 44 à esquerda, nome no meio, botão preenchido à direita; o menu é um painel de papel abaixo do cabeçalho, com os itens centrados em `subtitulo`, grupos separados por fios, foco preso, Esc fecha e devolve o foco. Sem navegação inferior.
- **Rodapé (todas as telas):** de x=0 e com a largura da janela, em urucum (madrugada `#251E18`). Topo com fio interrompido pelo nome do site. Nome gigante fluido com largura de texto ≥ 96% da área útil. Links em colunas em x=32, 208 e 384, mais um bloco em c7, em `corpo-p` sublinhado. Linha final em `ui` 15 com o aviso de protótipo. Altura de cerca de 900 px em 1440.
- **Seção escura (só no Início):** fundo `primary`, texto papel (15,85:1), conteúdo em c3–c9 e o botão "Criar conta".
- **Primário:** altura 80 (64 abaixo de 768), padding 0 32, raio 8, urucum, texto `on-accent`, Fraunces 600 24/24. A troca de fundo é na hora.
- **Moldura dupla:** altura 48 (64 ao lado de um primário), raio 8 por fora e 4 por dentro. A inversão é na hora.
- **Etiqueta:** `ui` 15, fundo `paper-deep`, raio 4, padding 2/6, altura 26. Empilhadas a cada 32 px.
- **Campo:** a partir de 768, linha rótulo + campo com rótulo `rotulo` em c2–c3 e campo em c4–c8, altura 112, sem caixa, fio de 1 px embaixo e texto em Instrument Serif 48/58. Abaixo de 768, rótulo 24/29 em cima e campo de 64 px com fundo `paper-deep`, raio 4, fio de tinta embaixo e texto 32. O select tem a mesma altura, fio e fonte. O botão de mostrar senha é de ícone, 44 × 44 no fim do campo, com `aria-label` e `aria-pressed`.
- **Foco:** anel de 2 px na cor `focus` com `outline-offset: 2px`, só em `:focus-visible`. O `h1` com foco programático (`tabIndex=-1`) não mostra contorno.
- **Erro:** `corpo-p` 17/24 em urucum (5,11:1), abaixo do campo, sem mudar a altura da linha.
- **Desativado:** fundo sólido em texto secundário apagado, nunca tracejado, com `aria-disabled="true"` e o motivo ao lado.
- **CTA circular:** 480 (322 abaixo de 768), urucum. Um segundo círculo, só de contorno, de 240.
- **Mídia e galeria:** peça larga de 1376 × 888 a 1056; par de 2 × 672 × 672; retrato em c8–c10 de 413 × 734. Moldura com raio 8 (4 abaixo de 768), `overflow: hidden`, sem sombra, sem borda, `object-fit: cover`. Sem texto dentro: a descrição vai no `alt` ou no `aria-label`. Barro e lavanda só como fundo. A legenda fica só nos cartões "As telas".
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
- Não faça: linguagem de cobrança. Nada de "atrasado", metas, pontos ou rankings.
- Não faça: caixa alta, tracking diferente de 0, texto menor que 15 px.
- Não faça: sombra, gradiente, vidro fosco, borda nos 4 lados fora da moldura dupla, fio sob o cabeçalho ou moldura de página.
- Não faça: texto sobre barro ou lavanda. Eles são só fundo de mídia.
- Não faça: copiar layout, texto, imagem, marca ou cor de outro site. Só a estrutura é estudada.
- Não faça: número de "prova social" sem fonte real nem depoimento inventado.
- Não faça: fonte sem licença nem texto essencial dentro de imagem.
