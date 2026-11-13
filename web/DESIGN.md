---
version: alpha
name: AppMaternidade — Campo de mel
description: "Papel quente, mel, oliva e cacau em painéis de raio grande. Literata nos títulos e Outfit no texto. Um quadro de 1200 px com uma borda esquerda por página, e espaço e tipo de duas escalas curtas, medidas no Pato Jack e na Good Inside (MEDIDAS.md)."
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
    fontSize: 40px
    fontWeight: 600
    lineHeight: 44px
  exibicao-1440:
    fontFamily: Literata
    fontSize: 64px
    fontWeight: 600
    lineHeight: 68px
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
  quadro-calha-390: 20px
  quadro-calha-1440: 32px
  medio: 880px
  leitura: 680px
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

O AppMaternidade tem a cara de um campo de mel: papel quente de fundo, painéis de cor com raio grande (mel, oliva, areia e cacau), títulos em Literata e texto em Outfit. A direção "Campo de mel" foi aprovada por Daniel em 11/11/2026 e é a que o código roda (`web/src/styles/tokens.css`). A área logada é feita para o colo e para a madrugada, com um tema escuro de pouco brilho (a noite) e alvos grandes.

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

A cor nunca é a única pista: erro, estado e seleção levam também ícone, texto ou contorno.

## Typography

Duas famílias, SIL OFL 1.1, auto-hospedadas pelo `@fontsource-variable` (registro em `web/PROVENANCE.md`): **Literata** nos títulos e **Outfit** no texto e na interface. Nenhum texto em caixa alta. Nada menor que 15 px.

Nove níveis. Cada nível tem dois pares de tamanho e entrelinha, um para 390 px de viewport e outro para 1440 px. Abaixo de 390 vale o par de 390, e acima de 1440 vale o de 1440. No meio, a medida cresce em linha reta (o `clamp` do tema gerado). O tamanho e a entrelinha são em rem no tema (16 px = 1 rem com a fonte a 100%).

| Nível | 390 (tamanho/entrelinha) | 1440 | Família e peso | Uso (P4 da SPEC H) |
|---|---|---|---|---|
| `exibicao` | 40/44 | 64/68 | Literata 600 | `h1` do herói do Início |
| `titulo-1` | 34/40 | 48/54 | Literata 600 | `h1` das outras páginas e telas |
| `titulo-2` | 28/34 | 36/42 | Literata 600 | títulos de seção (`h2`) e citação grande (itálica) |
| `titulo-3` | 22/28 | 28/34 | Literata 600 | `h3` |
| `titulo-4` | 19/25 | 22/28 | Literata 600 | títulos de cartão e de passo |
| `abertura` | 19/28 | 22/32 | Outfit 400 | texto de abertura e depoimento (itálico) |
| `corpo` | 17/26 | 18/28 | Outfit 400 | texto corrido |
| `pequeno` | 15/22 | 15/22 | Outfit 400 | legendas, etiquetas, rótulos |
| `sobretitulo` | 15/20 | 15/20 | Outfit 600 | sobretítulo, sem caixa alta |

Razão entre os títulos de ≈ 1,25 no desktop e ≈ 1,2 no celular (as referências sobem por 1,2 a 1,25). A razão exibição/corpo é 3,6 no desktop e 2,4 no celular, entre o Pato Jack e a Good Inside do herói (3,0) e o estudo de caso da Good Inside (4,8). O corpo fica em 18/28 e 17/26, acima das referências (15 a 16 px), por ser lido de madrugada com o bebê no colo (P1). `sobretitulo` e `pequeno` ficam em 15 px porque a regra "nada menor que 15 px" vale para o site inteiro. Linha de leitura de 60 a 80 caracteres no desktop.

O espaçamento entre letras (tracking) dos títulos continua o do código até a aplicação (H-3): `h1` −0,02 em, `h2` −0,015 em e `h3` −0,01 em (`web/src/styles/site.css:52,59,66`); o resto, 0.

### Fora da escala (`fora-da-escala: true`)

Estes estilos **não entram** na escala de nove níveis, nem no tema gerado. Os valores abaixo foram lidos do código em a003fe4.

- **`numero`** (`fora-da-escala: true`): Literata 700, `tabular-nums lining-nums`. Padrão 7 rem / 5,625 rem (112/90 px), em `web/src/index.css:308-315`. Os números do Hoje caem para 3,5 rem / 2,8125 rem até 767 px e vão a 7 rem a partir de 1400 px (`web/src/index.css:1027-1030` e `1166-1170`).
- **`cronometro`** (`fora-da-escala: true`): Literata 700, tabular. Padrão 14 rem / 11,25 rem (224/180 px) e 6 rem / 4,8125 rem até 767 px (`web/src/index.css:317-324` e `373-376`). O cronômetro da Sessão tem tamanho próprio: 5 rem / 4 rem até 767 px (`web/src/index.css:1062-1065`), e o modo longo, 10 rem / 8 rem (`web/src/index.css:905-908`) e 3,5 rem / 2,8125 rem até 767 px (`web/src/index.css:1067-1070`).
- **`botao`** (`fora-da-escala: true`): `.cm-botao`, Outfit 500, 1,125 rem (18 px), entrelinha 1,2, altura mínima 56 px, padding lateral 28 px, vão de 10 px entre ícone e texto, contorno de 1,5 px, raio pílula (`web/src/styles/site.css:125-150`). A variante do app (`data-tamanho='app'`): altura mínima 48 px, padding lateral 22 px, 1,0625 rem (17 px) (`web/src/styles/site.css:156-160`). No bloco "Em andamento" do Hoje, o botão desce para 1,25 rem até 767 px (`web/src/index.css:1015-1017`).
- **Marca do cabeçalho** (`fora-da-escala: true`): `.cm-marca`, Literata 600, 1,5 rem / 1,5 rem (24/24), tracking −0,01 em (`web/src/styles/site.css:353-364`; família e peso em `37-46`).
- **Marca do rodapé** (`fora-da-escala: true`): `.cm-rodape-nome`, Literata 600, tamanho `calc(100cqi / 7,966)` para o nome ocupar a largura do painel, entrelinha 1,05, tracking −0,03 em e margem de topo entre 48 e 96 px em linha reta (`web/src/styles/site.css:609-618`).

## Layout

O espaço vem de uma escala de oito papéis (`junto`, `pilha`, `grupo`, `bloco`, `midia`, `secao`, `secao-ampla`, `painel`), cada um com um valor para 390 e outro para 1440, mais os valores do quadro. Cada vão da página usa o token do seu papel, nunca um número solto. Entre 390 e 1440 o valor cresce em linha reta (o `clamp` do tema gerado). Abaixo de 390 e acima de 1440, é constante. O espaço é em px.

### Glossário

- **Quadro:** a faixa onde fica o conteúdo da página. Largura do conteúdo `min(1200 px, viewport − 2 × calha)`, centrada. A borda esquerda do quadro é **a borda** da página: todo texto fora de painel começa nela.
- **Calha:** 20 px em 390 e 32 px a partir de 1440, em linha reta no meio (`quadro-calha`). A largura do quadro (`quadro-largura`, 1200 px) é fixa e não entra no `clamp`.
- **Seção:** uma faixa vertical da página, filha direta do `<main>`, ou o cabeçalho, ou o rodapé. Tem padding de topo e de base e nenhuma margem.
- **Painel:** seção com fundo de cor (mel, cacau, oliva, areia), desenhada como caixa de raio 24 cujas bordas laterais coincidem com as do quadro. O conteúdo do painel começa na borda + `painel`.
- **Contêiner de texto:** `medio` (880 px) e `leitura` (680 px) são larguras máximas de blocos de texto **alinhados à borda** do quadro, não centrados. Exceção única: a seção `centrada` (um título e uma ação, como o fechamento do Início), cujo texto é centrado no quadro.
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

### Quadro e contêineres

- `quadro-largura`: 1200 px, fixo.
- `quadro-calha`: 20 px em 390 e 32 px em 1440, em `clamp`.
- `medio`: 880 px, para blocos de texto de duas ou três colunas e subtítulos longos, alinhado à borda.
- `leitura`: 680 px, para texto corrido (66 a 72 caracteres a 18 px), alinhado à borda.
- Todo conteúdo da seção começa na borda do contêiner: há **uma** borda esquerda por página. O painel recua o conteúdo só por `painel`.
- Lado a lado, as proporções viram frações do quadro: herói texto/cena 7/5, acesso 7/5, Conta índice/conteúdo 3/9, linha rótulo + texto (`.sb-linha`) 2fr/3fr, cronômetro 7/3. O vão entre texto e mídia é `midia`; entre colunas de texto, `bloco`. Os pontos de quebra de hoje (767, 991, 1024 e 1200 px) ficam.

### Área de conta (MAT-37)

As telas de acesso (Entrar, Criar conta, Recuperar acesso, Nova senha e Conta excluída) e a de Começar usam o Campo de mel: o cabeçalho e o rodapé são os da casca, e o aviso de demonstração mora no rodapé. A moldura de cada tela não desenha marca, cabeçalho nem aviso próprios.

- **Telas de acesso, em 1440 (a partir de 64 rem):** duas colunas, 7/5 do quadro e `midia` entre elas. À esquerda, o formulário no papel: `h1` em Literata 600 no nível `titulo-1`, com a segunda linha inteira em itálico e linhas de até 17 caracteres para caberem na coluna; depois a frase, os campos de 56 px com raio 14 (48 px em Começar e Conta), a pílula primária de 56 px de largura cheia e, sobre um fio de 1 px, os links secundários, sempre sublinhados e com alvo de 44 px. O tamanho de botões e campos vem de `cm-botao` e `cm-campo-entrada`, sem `alvo-toque`. À direita, um painel de mel com a luz de estúdio e a cena `web/public/cenas/acesso/entrar` (512 × 768 em 1×, cortada por cima e por baixo para encher a altura da coluna). A coluna do formulário se centra na altura do painel, sem sobra vazia ao lado. O painel começa no alto da primeira dobra.
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

Plano, com duas sombras e dois gradientes permitidos, todos em `web/src/styles/tokens.css` e usados só pelas variáveis, nunca escritos de novo:

- `--sombra-flutuante`: `0 2px 4px rgb(43 35 32 / .08), 0 18px 40px rgb(43 35 32 / .16)`.
- `--sombra-cartao`: `0 1px 2px rgb(43 35 32 / .06), 0 8px 24px rgb(43 35 32 / .06)`.
- `--luz-estudio`: `radial-gradient(120% 90% at 15% 10%, #F7D684 0%, #F2C14E 60%)`, só no painel de mel.
- `--brilho-mel`: `radial-gradient(closest-side, rgb(242 193 78 / .22), transparent)`.

Sem desfoque: nenhum `filter: blur`, nenhum `backdrop-filter` e nenhum 3D. A profundidade vem de cor, painel e espaço.

## Shapes

Quatro raios, em `tokens.css`: **painel 24** (painéis de cor), **cartão 20** (cartões brancos e zona de perigo), **pílula 999** (botões e etiquetas) e **campo 14** (campos de entrada). Sem cartão com borda nos quatro lados fora do contorno de 1,5 px da zona de perigo.

## Components

Estes itens estão como na versão anterior deste arquivo (H:RF-01). Onde um raio, uma família ou um tamanho daqui difere de Shapes, de Typography ou das pílulas de `web/src/styles/site.css`, vale Shapes, Typography e o código. A reconciliação item a item com a direção aprovada fica com o líder.

- **Cabeçalho e menu (um componente só):** em 1440, 64 px, `position: sticky; top: 0`, fundo papel opaco, sem `border-bottom`. O nome do site em x=32, em Literata 600 (marca do cabeçalho, fora da escala). De 3 a 4 links em `corpo`, com 48 px entre eles e o último terminando na borda direita do quadro. À direita, um botão de moldura dupla de 48 px, encostado na borda direita. Submenu "+ Em breve": painel de cerca de 224 × 120, moldura dupla, raio 8, abre na hora. Abaixo de 768: 60 px, botão de menu 44 × 44 à esquerda, nome no meio, botão preenchido à direita; o menu é um painel de papel abaixo do cabeçalho, com os itens centrados em `titulo-3`, grupos separados por fios, foco preso, Esc fecha e devolve o foco. Sem navegação inferior.
- **Rodapé (todas as telas):** de x=0 e com a largura da janela, em painel (madrugada `noite-cartao`). Topo com fio interrompido pelo nome do site. Nome gigante fluido (marca do rodapé, fora da escala) com largura de texto ≥ 96% da área útil. Links em colunas, mais um bloco à direita, em `corpo` sublinhado. Linha final em `pequeno` com o aviso de protótipo.
- **Seção escura (só no Início):** fundo `cacau`, texto papel (14:1), conteúdo em `medio` e o botão "Criar conta".
- **Primário:** altura 80 (64 abaixo de 768), padding 0 32, raio 8, texto `papel`, 24/24 600. A troca de fundo é na hora.
- **Moldura dupla:** altura 48 (64 ao lado de um primário), raio 8 por fora e 4 por dentro. A inversão é na hora.
- **Etiqueta:** `pequeno`, fundo `areia`, raio 4, padding 2/6, altura 26. Empilhadas a cada `grupo`.
- **Campo:** a partir de 768, linha rótulo + campo com rótulo em `titulo-3`, altura 112, sem caixa, fio de 1 px embaixo. Abaixo de 768, rótulo em cima e campo de 64 px com fundo `areia`, raio 4, fio de tinta embaixo. O select tem a mesma altura, fio e fonte. O botão de mostrar senha é de ícone, 44 × 44 no fim do campo, com `aria-label` e `aria-pressed`.
- **Foco:** anel de 2 px na cor de foco com `outline-offset: 2px`, só em `:focus-visible`. O `h1` com foco programático (`tabIndex=-1`) não mostra contorno.
- **Erro:** `corpo`, em cor de erro, abaixo do campo, sem mudar a altura da linha.
- **Desativado:** fundo sólido em texto secundário apagado, nunca tracejado, com `aria-disabled="true"` e o motivo ao lado.
- **CTA circular:** 480 (322 abaixo de 768). Um segundo círculo, só de contorno, de 240.
- **Mídia e galeria:** peça larga de 1376 × 888 a 1056; par de 2 × 672 × 672; retrato de 413 × 734. Moldura com raio 8 (4 abaixo de 768), `overflow: hidden`, sem sombra, sem borda, `object-fit: cover`. Sem texto dentro: a descrição vai no `alt` ou no `aria-label`. A legenda fica só nos cartões "As telas".
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
- Não faça: linguagem de cobrança. Nada de "atrasado", metas, pontos ou rankings.
- Não faça: caixa alta e texto menor que 15 px.
- Não faça: sombra, gradiente ou raio que não seja um dos dois e dos dois tokens de Elevation & Depth e de Shapes; vidro fosco; fio sob o cabeçalho ou moldura de página.
- Não faça: copiar layout, texto, imagem, marca ou cor de outro site. Só a estrutura é estudada.
- Não faça: número de "prova social" sem fonte real nem depoimento inventado.
- Não faça: fonte sem licença nem texto essencial dentro de imagem.

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

Curto e sem surpresa. Só a escala do toque anima nos botões (`scale: 0.96` no `:active`, 120 ms, `ease-out`); a troca de cor do hover é instantânea (`web/src/styles/site.css:146-154`). Com `prefers-reduced-motion: reduce`, toda animação e toda transição é desligada (`web/src/index.css:648-655`). O letreiro dos selos dura 60 s e, com movimento reduzido, para (`web/src/styles/campo.css`, `cm-letreiro`). Nenhuma animação de entrada na primeira carga.

## Images

As cenas e os desenhos são WebP em 1× e 2×, em `web/public/cenas`, com o registro de origem em `web/PROVENANCE.md`. Imagem sem texto dentro: a descrição vai no `alt` ou no `aria-label`. A moldura de uma cena é a do painel (raio 24), sem sombra e com `object-fit: cover`. Cenas de painel de mel usam a luz de estúdio; as dos outros painéis, não.
