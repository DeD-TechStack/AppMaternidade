# VISTO - leitura das capturas pelo OpenCode (H-3g)
Leituras .oc/5 (33 PNG) e .oc/6 (32 PNG), sessoes novas, somente leitura. Defeitos listados sao observacoes; nenhum corrigido neste cartao (fora do escopo / informativos).

## Rodada .oc/5

All 33 files were read. The 390 px captures are 810 px wide, but the content spans only x=40..740 and the page's full-width rules end at 780. That leaves a strip on the right that may be horizontal overflow or a capture artefact. I did not check which.

HARMONIA/trabalho/h3/h3g/olhar/cortes/comofunciona_claro_1440_01.png | Como funciona, desktop hero with phone on a yellow card | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/comofunciona_claro_1440_02.png | Como funciona, "Três momentos" heading, card 1 (first week), top of card 2 | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/comofunciona_claro_1440_03.png | Como funciona, card 2 (madrugada) bottom and card 3 (shift change) | defect: the tilted dark "Modo madrugada" card hangs about 50 px below the green panel and comes within about 16 px of card 3
HARMONIA/trabalho/h3/h3g/olhar/cortes/comofunciona_claro_1440_04.png | Como funciona, "Para começar" text and dark stats band (7, 2, 0) | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/comofunciona_claro_1440_05.png | Como funciona, end of the stats band and the yellow footer | defect: the footer link columns have uneven row spacing, because wrapped items ("Cuidado compartilhado", "Regras da comunidade") push the rows out of line across the three columns
HARMONIA/trabalho/h3/h3g/olhar/cortes/comofunciona_claro_390_01.png | Como funciona, mobile header, hero text and buttons, phone image | defect: the hero image is only about 470 px wide (x=40..512) and left-aligned, leaving the right side empty, while the content column is 700 px wide
HARMONIA/trabalho/h3/h3g/olhar/cortes/comofunciona_claro_390_02.png | Como funciona, mobile "Três momentos" heading and card 1 with the invite card | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/comofunciona_claro_390_03.png | Como funciona, mobile card 1 bottom (illustration plus "Primeiros registros") and card 2 start | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/comofunciona_claro_390_04.png | Como funciona, mobile card 2 bottom (tilted dark card, "Iniciar mamada") and card 3 start | ok (the tilted card stays inside the panel)
HARMONIA/trabalho/h3/h3g/olhar/cortes/comofunciona_claro_390_05.png | Como funciona, mobile card 3 end, "Para começar" text, "Veja as telas" band start | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/comofunciona_claro_390_06.png | Como funciona, mobile stats list and footer start | defect (minor): in the footer link grid the wrapped links ("Cuidado compartilhado", "Regras da comunidade") give uneven row gaps between the Produto and Ajuda columns
HARMONIA/trabalho/h3/h3g/olhar/cortes/comofunciona_claro_390_07.png | Como funciona, mobile footer end | defect (minor): same uneven rows in the Produto and Ajuda columns, and Legal is stacked alone below them
HARMONIA/trabalho/h3/h3g/olhar/cortes/contato_claro_390_01.png | Contato, mobile: heading, e-mail card, hands illustration | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/contato_claro_390_02.png | Contato, mobile: "Nesta página", urgência and "Para que serve" sections, footer start | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/contato_claro_390_03.png | Contato, mobile footer | defect (minor): same uneven link rows in the Produto and Ajuda columns
HARMONIA/trabalho/h3/h3g/olhar/cortes/hoje_claro_1440_01.png | Hoje, desktop: sleep timer card, "Hoje até agora" stats, "Para você saber" | defect: the "Sono 0 h 00" stat cell is indented about 34 px from the stat column's left edge and has only a left border, so it is off-grid with the three cells above it. The illustration is also clipped at the right edge of the yellow card.
HARMONIA/trabalho/h3/h3g/olhar/cortes/hoje_claro_1440_02.png | Hoje, desktop: "Últimos" grid, "Desde o seu último registro" list, action bar, footer links | defect: the footer links start at x=88 and the footer rule runs 88..1891, off the 165 px content grid. The action bar rule runs wider than the content, and "Últimos" leaves a large empty gap under it beside the longer right column.
HARMONIA/trabalho/h3/h3g/olhar/cortes/hoje_claro_1440_03.pn...[+3571 chars]

## Rodada .oc/6

Read all 32 files with `read`. Nothing was edited or run. The full-page captures are downscaled, so I judged those at layout level only. The crops are the detailed evidence.

HARMONIA/trabalho/h3/h3g/olhar/cortes/inicio_claro_390_01.png | Início 390: header, hero, CTAs, phone-trio image | ok (large empty gap under the image before the rule, but not a defect)
HARMONIA/trabalho/h3/h3g/olhar/cortes/inicio_claro_390_02.png | Início 390: stats 7/2/0, four pills, start of the "Quem chega no turno" card | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/inicio_claro_390_03.png | Início 390: "Desde que você saiu" tilted card, dark "De madrugada" card | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/inicio_claro_390_04.png | Início 390: "O caderno ajuda" comparison table (top) | defect: the first column is very narrow and wraps to 3–5 lines ("com / dois toques"). "Funcionar de" touches the yellow column edge. The "AppMaternidade" header is flush against its column edges.
HARMONIA/trabalho/h3/h3g/olhar/cortes/inicio_claro_390_05.png | Início 390: table end, photo, pull quote with Carla pill | defect: in the last row, "comparações" runs into the yellow column edge. The rest is ok.
HARMONIA/trabalho/h3/h3g/olhar/cortes/inicio_claro_390_06.png | Início 390: "Quem cuida conta como é" testimonials | ok. The second and third cards show only a thin curved top border, which looks intentional.
HARMONIA/trabalho/h3/h3g/olhar/cortes/inicio_claro_390_07.png | Início 390: third testimonial, FAQ accordion | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/inicio_claro_390_08.png | Início 390: dark CTA card with baby circle, start of footer | ok. The circle bleeds past the top of the card (appears intentional). Footer rows are uneven (see 09).
HARMONIA/trabalho/h3/h3g/olhar/cortes/inicio_claro_390_09.png | Início 390: footer (links, wordmark, demo notice) | defect (minor): the Produto and Ajuda columns have uneven row spacing and baselines ("Regras da comunidade" and "Cuidado compartilhado" wrap, so rows don't line up). Legal is a separate row, leaving the right half empty.
HARMONIA/trabalho/h3/h3g/olhar/cortes/privacidade_claro_390_01.png | Privacidade 390: header, title, CTA, illustration, "Nesta página" | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/privacidade_claro_390_02.png | Privacidade 390: "Que dados o site vai guardar" list and "O que fica de fora" | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/privacidade_claro_390_03.png | Privacidade 390: "Para que os dados vão servir", "Quem vê", "Os dados do bebê" | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/privacidade_claro_390_04.png | Privacidade 390: "Onde os dados vão ficar", "Por quanto tempo", start of "Quem responde" | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/privacidade_claro_390_05.png | Privacidade 390: "Seus direitos", "Mudanças nesta política", start of the footer card | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/privacidade_claro_390_06.png | Privacidade 390: footer card | defect (minor): same uneven footer column rows as inicio_390_09.
HARMONIA/trabalho/h3/h3g/olhar/cortes/sessao_madrugada_390_01.png | Sessão madrugada 390: header with moon toggle, timer card, buttons, start of "Sonecas anteriores" | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/sessao_madrugada_390_02.png | Sessão madrugada 390: "Sonecas anteriores" list, demo notice, dark footer links | ok
HARMONIA/trabalho/h3/h3g/olhar/cortes/sobre_claro_1440_01.png | Sobre 1440: nav, hero with baby illustration, start of "Nesta página" | ok. The "Nesta página" list is cut at the crop edge only.
HARMONIA/trabalho/h3/h3g/olhar/cortes/sobre_claro_1440_02.png | Sobre 1440: table of contents, intro, "Para quem é", "O que ele faz" | ok. The text column is narrow and the right half of the page is empty.
HARMONIA/trabalho/h3/h3g/olhar/cortes/sobre_claro_1440_03.png | Sobre 1440: "Cuidado compartilhado", "Comunidade", "O que ele não faz", "Quem faz" | ok (same empty right half)
HARMONIA/trabalho/h3/h3g/olhar/cortes/sobre_claro_1440_04.png | Sobre 1440: footer card at 1440 | ok. T...[+2259 chars]
