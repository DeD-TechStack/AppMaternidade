# SKILLS_CHECK - H-3g (revisão só de leitura)

## Skills carregadas
- Carregadas: `make-interfaces-feel-better`, `ui-ux-pro-max-local-web`, `frontend-design`.
- Não carregada: `omh-visual-qa` (a ferramenta devolveu "Unable to load skill").

## Limites desta revisão
- `git diff --stat` saiu vazio (árvore limpa, tudo já commitado). Outras formas de diff contra `main` foram negadas pela permissão. O escopo do diff vem de `NOTAS_R2/R3/R4.md`: `index.css`, `styles/site.css`, `styles/campo.css`, `publicas-destaque.css`.
- Lidos por inteiro: `index.css`, `site.css`, `campo.css`. Lido em trechos: `publicas-destaque.css` (linhas 396-435, 640-689, 1125-1234).
- PNGs lidos (12): `hoje_madrugada_390`, `sessao_madrugada_390`, `inicio_claro_1440`, `hoje_claro_1440`, `cortes/hoje_madrugada_390_01`, `_02`, `_03`, `cortes/sessao_madrugada_390_02`, `cortes/inicio_claro_390_04`, `cortes/inicio_claro_390_09`, `cortes/hoje_claro_1440_02`, `cortes/comofunciona_claro_1440_03`.
- Contraste da madrugada julgado a olho nas capturas (texto creme e verde-sálvia sobre cacau escuro, sem aviso de baixa leitura). Nenhuma razão medida.
- Anel de foco do campo de data: só lido no CSS. Não há captura dele. O teste `acessibilidade.test.tsx:94` o cobre.

## Checklist por skill

### make-interfaces-feel-better
| Item | Resultado |
|---|---|
| `transition: all` | pass, nenhuma ocorrência. Só `transition-property: scale` (`site.css:184`, `publicas-destaque.css:1148`) e `rotate` (`campo.css:533`) |
| Escala ao toque 0.96 | pass (`site.css:190`, `publicas-destaque.css:1154`). O desativado fica de fora (`:not([aria-disabled])`) |
| Movimento reduzido | pass (`index.css:617-624`) |
| `text-wrap` / `tabular-nums` | pass (`site.css:49,95,127`, `campo.css:189,712`, `rotina-semana-valor` em `index.css:1242`) |
| Raios concêntricos | pass nos painéis e cartões vistos (cartão branco dentro de bege, mel dentro de painel) |
| Área de toque 44/56 | pass em `.cm-botao`, `.cm-campo-olho`, `.cm-marca`, `.cm-rodape-link`, `.pd-aba`, `.pd-fonte`. Madrugada 56 em `campo.css:802-831` e `index.css:1286`. Ver o `fail` em H-4: link de 32 px no celular de dia |
| Anel de foco do campo de data | pass: 3 px, offset 2 px, `--cor-foco` (`site.css:331-334`). Os outros controles usam 2 px (`index.css:57`, `site.css:200`), o que é coerente com o pedido |
| Estados (hover, ativo, desativado) | pass: hover instantâneo, desativado sem hover, `aria-pressed` e `aria-expanded` com sinal estático (`site.css:242`, `index.css:766`) |
| Alinhamento e espaçamento nas capturas | **fail**: tabela do Início a 390 e rótulo "Mamadeiras" no Hoje a 390 (ver MUST). Demais achados em H-4 |

### ui-ux-pro-max-local-web
| Item | Resultado |
|---|---|
| Foco visível em todos os controles | pass. Há anel global (`index.css:57`) e anéis por contexto. O da barra Registrar fica por dentro (`index.css:773-784`) |
| Rolagem lateral em 390 a 200% de fonte | pass pela `NOTAS_R4` (`lateral_novas: []`). Não reexecutado aqui |
| Contraste na madrugada | pass visual (ver limites) |
| Tabela financeira/densa em celular | **fail**: `campo.css:428-443` (ver MUST 1) |
| Hit target de link no celular de dia | **fail** em `index.css:970-972` (ver H-4). Vira MUST se esse trecho for desta diff |
| Nada invisível | pass. Nenhum texto ou controle sumido nas 12 capturas |

### frontend-design
| Item | Resultado |
|---|---|
| Tipo por níveis do mesmo token (tamanho + entrelinha) | pass (`site.css:62-83`, `index.css:242-339`, `campo.css:238-254`) |
| Sem caixa alta decorativa, sem palavra solta em ênfase | pass (`site.css:85-89` ênfase de linha inteira) |
| Ritmo e hierarquia nas telas inteiras | pass nas telas claras de 1440 (Início, Hoje). Pendências de grade em H-4 |
| Um elemento de destaque por tela | pass (mel + numeral, cartão da madrugada) |
| Madrugada: tom e hierarquia | pass. Cacau escuro, mel só no primário, sálvia no secundário |

## MUST (defeitos desta diff, dentro do escopo do cartão)
1. **Tabela "O caderno ajuda" a 390 (Início): texto encosta na coluna amarela.** `cortes/inicio_claro_390_04.png`.
   - "Funcionar de" termina a ~5 px da borda amarela e "AppMaternidade" no cabeçalho cabe com ~3 px de cada lado.
   - A primeira coluna quebra em 3 a 5 linhas ("Registrar / uma / mamada / com / dois toques").
   - A `NOTAS_R3` deixou isso como "não verificado". A causa está em `campo.css:391-397`: o `thead th` segue em `corpo` em todas as larguras e não há ajuste no `@media (max-width: 767px)` (`campo.css:428-443`).
   - Correção: no `@media` do celular, `thead th` em `pequeno` (como a `NOTAS_R3` previa) e `th:first-child` / `td:first-child` com `padding-right` de pelo menos 12 px, ou largura da coluna do meio mais estreita que 24%.
2. **Hoje a 390: o rótulo "Mamadeiras" encosta no fio vertical.** `cortes/hoje_madrugada_390_02.png` e `hoje_madrugada_390.png`.
   - O texto termina no próprio fio (x≈445 e fio em x≈446). "Mamadas" e "Fraldas" têm folga.
   - Tem cara de efeito do tipo em nível `pequeno` com os numerais em `cqi` (`ResumoDoDia.tsx`, exceção da `NOTAS_R3`). Não foi medido em navegador.
   - Correção: `padding-inline` de pelo menos 8 px nas células ou `overflow-wrap: anywhere` / `hyphens` no rótulo.

## H-4 (todo o resto)
- **Célula "Sono 0 h 00" fora da grade (Hoje 390 e 1440).** O quarto item de 3 colunas abre uma 2ª linha com `border-left` e recuo de ~34 px (`hoje_claro_1440.png`, `hoje_madrugada_390.png`). Já estava no `VISTO.md`. Correção natural: a célula ocupa as 3 colunas, ou o resumo vira 2 x 2.
- **Grade do rodapé e da barra Registrar contra o conteúdo (Hoje 1440).**
  - O conteúdo começa em x=128, o rodapé em x=68 e a régua da barra Registrar corre de borda a borda (`hoje_claro_1440.png`).
  - A causa provável são dois contêineres: `.cm-area` (`site.css:35-38`) e a área do app (`index.css:184-187`). Precisa de decisão sobre qual vale.
- **Linhas desiguais nas colunas Produto/Ajuda do rodapé a 390** (`inicio_claro_390_09.png`). Cada coluna é uma lista própria, então "Regras da comunidade" e "Cuidado compartilhado" quebram em duas linhas e desalinham as seguintes. Não é uma regressão desta diff. Pede `subgrid` ou linhas de altura fixa.
- **Link de 32 px de altura no celular de dia** (`index.css:970-972`, `.ha-tela .ha-li-link`). Fica abaixo de 44 px e contradiz o comentário de `index.css:72`. Na madrugada a regra de `index.css:1286` ganha e vale 56 px. Se este trecho for da diff, promover a MUST.
- **Anel do campo de data em painel escuro (latente).** `input[type='date']:focus-visible` (`site.css:331`, especificidade 0,2,1) vence `.cm-painel-cacau :focus-visible` (`campo.css:44-47`, 0,2,0). Num painel cacau/oliva o anel usaria `--cor-foco` em vez do papel. Hoje o campo de data só aparece em superfície clara, então não aparece em nenhuma captura.
- **`overflow-wrap: anywhere` em `.cm-h1..h4` (`site.css:56-58`).** Em contêiner de largura automática (flex ou grid) esse valor reduz o mínimo intrínseco e pode quebrar palavra no meio. Nada visto nas 12 capturas. Vale um olhar em `/privacidade` e `/desenvolvimento` a 200%.
- **Botões inativos da barra Registrar na madrugada.** O fundo (#38302B aprox.) quase não se separa do fundo da página. O rótulo carrega a leitura, então não é falha de texto. A fronteira não texto fica fraca.
- **Cartão tombado do Como funciona 1440 pende ~50 px abaixo do painel verde** (`comofunciona_claro_1440_03.png`). Pede decisão de design, não correção.
- **Imagem do herói do Como funciona a 390 estreita e à esquerda, lista "Nesta página" cortada e vazios à direita no Sobre 1440.** Já registrados no `VISTO.md`; sem mudança desta rodada.

must_count=2
