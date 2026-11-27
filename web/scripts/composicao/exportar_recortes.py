"""Recortes da composição de referência do Início (fable/home-composicao).

De cada placa já existente sai um RECORTE: o fundo chapado (parede e chão) vira transparente e o CSS da página desenha
a parede e o chão com os tokens, de modo que o recorte encaixa na parede sem emenda. O que é desenhado (pessoas, móveis,
luz) ganha grão de papel; o fundo e a luz ficam lisos. Só a paleta A (a de hoje) existe: a paleta B ("hora azul") saiu
do código e da pasta public/composicao.

Uso (da pasta web/):
  python scripts/composicao/exportar_recortes.py             # todos os recortes e telas do repositório
  python scripts/composicao/exportar_recortes.py m05 porta   # somente as saídas selecionadas
  python scripts/composicao/exportar_recortes.py --mestres /caminho/para/DIRECAO_FABLE m01 m12

M01 e M12 exigem seleção explícita. A pasta --mestres contém 4_cenas/01_mamada_0300.png e
6_scenes1/M12_arms_v3.png, conforme a seleção. Caminhos relativos partem do diretório da chamada.
Só Pillow. Saída: public/composicao/a/*.webp, mais medidas.json.
"""
from __future__ import annotations

import argparse
import json
import os
from io import BytesIO
from PIL import Image, ImageChops, ImageDraw, ImageFilter

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SAIDA = os.path.join(RAIZ, 'public', 'composicao')
PALETA = 'a'


def hx(s: str) -> tuple[int, int, int]:
    s = s.lstrip('#')
    return int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)


# Tokens de hoje (web/src/styles/tokens.css).
PAPEL, AREIA, CACAU, CHAO = hx('F8F6EB'), hx('EADDC5'), hx('2B2320'), hx('6E6560')


def perto(c, t, lim):
    return abs(c[0] - t[0]) <= lim and abs(c[1] - t[1]) <= lim and abs(c[2] - t[2]) <= lim


def mascara_exata(im: Image.Image, cor, lim: int) -> Image.Image:
    """Máscara L (255 onde o pixel está a até `lim` por canal de `cor`)."""
    r, g, b = im.convert('RGB').split()
    canais = [ch.point([255 if abs(v - t) <= lim else 0 for v in range(256)]) for ch, t in zip((r, g, b), cor)]
    return ImageChops.darker(ImageChops.darker(canais[0], canais[1]), canais[2])


def cor_observada(im: Image.Image, token, lim: int = 4):
    """A cor mais comum da imagem a até `lim` do token (o codificador com perda desloca o chapado em 1 nível)."""
    pequena = im.convert('RGB').resize((max(1, im.width // 3), max(1, im.height // 3)), Image.NEAREST)
    melhor, quantos = None, 0
    for n, c in pequena.getcolors(maxcolors=1 << 24) or []:
        if n > quantos and perto(c, token, lim):
            melhor, quantos = c, n
    return melhor, quantos / (pequena.width * pequena.height)


def ligado_a_borda(masc: Image.Image, bordas: str) -> Image.Image:
    """Dos pixels 255 de `masc`, os ligados às bordas pedidas ('b' baixo, 'e' esquerda, 'd' direita, 't' topo)."""
    m = masc.copy()
    px = m.load()
    w, h = m.size
    sementes = []
    if 'b' in bordas:
        sementes += [(x, h - 1) for x in range(0, w, 3)]
    if 't' in bordas:
        sementes += [(x, 0) for x in range(0, w, 3)]
    if 'e' in bordas:
        sementes += [(0, y) for y in range(0, h, 3)]
    if 'd' in bordas:
        sementes += [(w - 1, y) for y in range(0, h, 3)]
    for s in sementes:
        if px[s] == 255:
            ImageDraw.floodfill(m, s, 128, thresh=0)
    return m.point([255 if v == 128 else 0 for v in range(256)])


def ruido_papel(tamanho: tuple[int, int]) -> Image.Image:
    w, h = tamanho
    ruido = Image.effect_noise((w, h), 26).filter(ImageFilter.GaussianBlur(0.55))
    fibra = Image.effect_noise((w // 3 + 1, h // 3 + 1), 14).resize((w, h), Image.BICUBIC)
    return ImageChops.add(ruido, fibra, scale=1, offset=-128)


def grao(im: Image.Image, desenho: Image.Image, semente: int, ruido: Image.Image | None = None) -> Image.Image:
    """Grão de papel só dentro do desenho (máscara `desenho`), em luz suave; o fundo e a luz ficam lisos."""
    import random
    random.seed(semente)
    if ruido is None:
        ruido = ruido_papel(im.size)
    rgb = im.convert('RGB')
    textura = ImageChops.soft_light(rgb, Image.merge('RGB', (ruido, ruido, ruido)))
    fora = Image.composite(textura, rgb, desenho).convert('RGBA')
    fora.putalpha(im.getchannel('A'))
    return fora


def mistura_entre(im: Image.Image, a, b, tol: float) -> Image.Image:
    """Máscara L (255) dos pixels a até `tol` do segmento de cor a–b: o antisserrilhado entre dois fundos chapados."""
    ab = tuple(y - x for x, y in zip(a, b))
    den = sum(v * v for v in ab) or 1
    tol2 = tol * tol
    dados = []
    bruto = im.convert('RGB').tobytes()
    for inicio in range(0, len(bruto), 3):
        c = bruto[inicio:inicio + 3]
        t = sum((c[i] - a[i]) * ab[i] for i in range(3)) / den
        t = 0 if t < 0 else 1 if t > 1 else t
        dados.append(255 if sum((c[i] - (a[i] + t * ab[i])) ** 2 for i in range(3)) <= tol2 else 0)
    saida = Image.new('L', im.size, 0)
    saida.putdata(dados)
    return saida


def tirar_ilhas(masc: Image.Image, minimo: int) -> Image.Image:
    """Apaga de `masc` (L, 0/255) os componentes ligados (8 vizinhos) com menos de `minimo` pixels."""
    from collections import deque
    w, h = masc.size
    px = masc.load()
    visto = bytearray(w * h)
    for y0 in range(h):
        for x0 in range(w):
            if px[x0, y0] == 0 or visto[y0 * w + x0]:
                continue
            visto[y0 * w + x0] = 1
            fila, comp = deque([(x0, y0)]), [(x0, y0)]
            while fila:
                x, y = fila.popleft()
                for ny in range(max(0, y - 1), min(h, y + 2)):
                    for nx in range(max(0, x - 1), min(w, x + 2)):
                        if px[nx, ny] and not visto[ny * w + nx]:
                            visto[ny * w + nx] = 1
                            fila.append((nx, ny))
                            comp.append((nx, ny))
            if len(comp) < minimo:
                for x, y in comp:
                    px[x, y] = 0
    return masc


def sangrar_cor(rgb: Image.Image, valido: Image.Image, camadas: int = 3) -> Image.Image:
    """Defringe: os pixels fora de `valido` (a borda do desenho e 1 px além) levam a cor dos vizinhos válidos, camada a camada,
    em vez da cor do fundo antigo misturada pelo antisserrilhado."""
    px = rgb.load()
    w, h = rgb.size
    for _ in range(camadas):
        cresce = ImageChops.subtract(valido.filter(ImageFilter.MaxFilter(3)), valido)
        v = valido.load()
        novos = []
        for i, marca in enumerate(cresce.tobytes()):
            if not marca:
                continue
            y, x = divmod(i, w)
            r = g = b = n = 0
            for ny in range(max(0, y - 1), min(h, y + 2)):
                for nx in range(max(0, x - 1), min(w, x + 2)):
                    if v[nx, ny]:
                        p = px[nx, ny]
                        r, g, b, n = r + p[0], g + p[1], b + p[2], n + 1
            if n:
                novos.append((x, y, (r // n, g // n, b // n)))
        for x, y, c in novos:
            px[x, y] = c
        valido = ImageChops.lighter(valido, cresce)
    return rgb


def recorte_limpo(im: Image.Image, transparente: Image.Image, alfa0: Image.Image, *, ilhas: int, abrir: bool,
                  ruido: Image.Image | None) -> Image.Image:
    """Recorte sem o anel opaco de 1 px: sem ilhas soltas, borda de alfa suave e cor da borda vinda de dentro do desenho."""
    desenho = ImageChops.darker(ImageChops.invert(transparente), alfa0)
    if abrir:
        desenho = desenho.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    desenho = tirar_ilhas(desenho, ilhas)
    miolo = desenho.filter(ImageFilter.MinFilter(5))
    rgb = sangrar_cor(im.convert('RGB'), miolo)
    alfa = ImageChops.darker(desenho.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7)), alfa0)
    base = rgb.convert('RGBA')
    base.putalpha(alfa)
    return grao(base, desenho, semente=7, ruido=ruido)


def limpar_borda_m01(origem: Image.Image, recorte: Image.Image) -> Image.Image:
    """Recupera o antisserrilhado do encontro do cone e da cúpula com a parede na placa nativa M01."""
    fonte = origem.load()
    pixels = recorte.load()

    def limpar_faixa(faixa: list[tuple[int, int]]) -> None:
        # Na origem, o vermelho separa a parede escura da luz e da cúpula clara.
        parede, luz = 53, 210
        borda = next((i for i, p in enumerate(faixa) if fonte[p][0] >= luz), None)
        if borda is None:
            return
        # No encontro com o berço a faixa de luz termina logo após a borda.
        fim = max(i for i in range(borda, borda + 3) if fonte[faixa[i]][0] >= luz)
        interior = faixa[fim]
        vermelho = fonte[interior][0]
        cor = pixels[interior][:3]
        for p in faixa[:fim]:
            nivel = fonte[p][0]
            if nivel <= parede:
                pixels[p] = (*pixels[p][:3], 0)
            elif nivel < vermelho - 12:
                alfa = round(255 * (nivel - parede) / (vermelho - parede))
                pixels[p] = (*cor, alfa)
            else:
                pixels[p] = (*pixels[p][:3], 255)

    # Faixas da borda esquerda até a luz tocar o quadro e da diagonal até o berço.
    for y in range(530):
        limpar_faixa([(x, y) for x in range(80)])
    for x in range(88, 895):
        limpar_faixa([(x, y) for y in range(430)])
    return recorte


def limpar_borda_m12(origem: Image.Image, recorte: Image.Image) -> Image.Image:
    """Recupera o verde sob o resíduo de papel à direita da porta, com o alfa original."""
    fonte = origem.load()
    pixels = recorte.load()
    # A lateral verde começa abaixo do canto e termina antes da transição para o piso.
    for y in range(578, 1462):
        cor = pixels[962, y][:3]
        papel = fonte[980, y][0]
        # Variações pequenas do grão são naturais. Só substitui cor deslocada na direção do papel.
        limite = cor[0] + (papel - cor[0]) / 4
        for x in range(963, 967):
            r, _, _, alfa = pixels[x, y]
            if alfa and r > limite:
                pixels[x, y] = (*cor, alfa)
    return recorte


def placa(nome, origem, fundos, *, areia_ligada=None, medidas=None, largura=None, manter_areia=False, corte=None,
          sem_anel=False, bolsos=None, mistura=None, ilhas=150, abrir=False, ruido=None):
    """Exporta o recorte de uma placa. `fundos`: tokens de parede/chão que viram transparência.
    `corte`: caixa (x0, y0, x1, y1) em pixels nativos da origem, aplicada logo após abrir, antes de qualquer processo.
    `sem_anel`: recorte limpo (sem o anel opaco de 1 px, alfa suave, borda sem cor do fundo, sem ilhas de menos de `ilhas` px;
    `abrir` tira também as pontas de 1 px); `bolsos`: tolerância por canal para tornar transparente o fundo que ficou fechado
    dentro do desenho; `mistura`: (cor, cor, tol), o antisserrilhado entre dois fundos, ligado à borda, também é fundo."""
    im = Image.open(os.path.join(RAIZ, origem)).convert('RGBA')
    if corte:
        im = im.crop(corte)
    if largura and largura != im.width:
        im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
    w, h = im.size
    alfa0 = im.getchannel('A')
    transparente = Image.new('L', im.size, 0)
    trocado = Image.new('L', im.size, 0)
    info = {'largura': w, 'altura': h}
    for token in fundos:
        obs, fracao = cor_observada(im, token)
        if obs is None:
            continue
        # Só é fundo o chapado LIGADO a uma borda da placa: o cabelo (cacau), a cúpula (papel) e a calça (areia) têm a
        # mesma cor de uma parede ou de um chão, mas ficam fechados dentro do desenho e continuam opacos.
        m = mascara_exata(im, obs, 2)
        m = ligado_a_borda(m, areia_ligada if (token == AREIA and areia_ligada) else 'tbed')
        trocado = ImageChops.lighter(trocado, m)
        if not (token == AREIA and manter_areia):
            transparente = ImageChops.lighter(transparente, m)
        info[f'fundo_{"%02X%02X%02X" % token}'] = round(fracao, 4)
        if bolsos is not None:
            # Só os bolsos grandes: o antisserrilhado de um branco vivo (fralda, toalha) passa por cores perto do papel.
            transparente = ImageChops.lighter(transparente, tirar_ilhas(mascara_exata(im, obs, bolsos), 600))
    if mistura is not None:
        fundo_exato = Image.new('L', im.size, 0)
        for token in fundos:
            obs, _ = cor_observada(im, token)
            if obs is not None:
                fundo_exato = ImageChops.lighter(fundo_exato, mascara_exata(im, obs, 2))
        a, b, tol = mistura
        ligado = ligado_a_borda(ImageChops.lighter(fundo_exato, mistura_entre(im, a, b, tol)), 'tbed')
        transparente = ImageChops.lighter(transparente, ligado)
    if sem_anel:
        fora = recorte_limpo(im, transparente, alfa0, ilhas=ilhas, abrir=abrir, ruido=ruido)
        destino = os.path.join(SAIDA, PALETA, f'{nome}.webp')
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        opcoes_webp = dict(quality=90, method=5, alpha_quality=100, exact=False)
        if nome in ('m01', 'm12'):
            # Repete a codificação original e preserva os pixels decodificados fora da borda.
            with BytesIO() as codificado:
                fora.save(codificado, 'WEBP', **opcoes_webp)
                with Image.open(codificado) as original:
                    decodificado = original.convert('RGBA')
            limpar = limpar_borda_m01 if nome == 'm01' else limpar_borda_m12
            fora = limpar(im, decodificado)
            fora.save(destino, 'WEBP', lossless=True, method=5, exact=True)
        else:
            fora.save(destino, 'WEBP', **opcoes_webp)
        info['bytes_a'] = os.path.getsize(destino)
        if medidas is not None:
            medidas[nome] = info
        print(nome, info, flush=True)
        return im
    # 1 px de fundo fica opaco em volta do desenho, para a borda suave não serrilhar.
    furo = transparente.filter(ImageFilter.MinFilter(3))
    desenho = ImageChops.darker(ImageChops.invert(trocado.filter(ImageFilter.MaxFilter(3))), alfa0)
    base = im.copy()
    # O fundo exato que ficou opaco (a borda de 1 px e o tapete) leva o token, exato.
    for token in fundos:
        obs, _ = cor_observada(im, token)
        if obs is None:
            continue
        m = ImageChops.darker(mascara_exata(im, obs, 2), trocado)
        base.paste(Image.new('RGBA', im.size, token + (255,)), (0, 0), m)
    fora = grao(base, desenho, semente=7)
    fora.putalpha(ImageChops.darker(alfa0, ImageChops.invert(furo)))
    destino = os.path.join(SAIDA, PALETA, f'{nome}.webp')
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    fora.save(destino, 'WEBP', quality=90, method=5, alpha_quality=100, exact=False)
    info['bytes_a'] = os.path.getsize(destino)
    if medidas is not None:
        medidas[nome] = info
    print(nome, info, flush=True)
    return im


def tela(nome, origem, larguras, medidas):
    im = Image.open(os.path.join(RAIZ, origem)).convert('RGBA')
    for larg in larguras:
        fora = im if larg == im.width else im.resize((larg, round(im.height * larg / im.width)), Image.LANCZOS)
        destino = os.path.join(SAIDA, PALETA, f'{nome}-{larg}w.webp')
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        fora.convert('RGB').save(destino, 'WEBP', quality=90, method=5)
    medidas[nome] = {'largura': im.width, 'altura': im.height}
    print(nome, medidas[nome], flush=True)


def linha_do_chao(im: Image.Image, x_frac: float, token) -> float:
    """A primeira linha (fração da altura) em que a coluna `x_frac` passa a ser o chão `token` até a base."""
    rgb = im.convert('RGB')
    x = round(x_frac * (im.width - 1))
    y = im.height - 1
    while y > 0 and perto(rgb.getpixel((x, y)), token, 5):
        y -= 1
    return round((y + 1) / im.height, 4)


def costura(im: Image.Image, y_frac: float) -> float:
    """A coluna (fração da largura) em que a parede passa de papel para cacau na linha `y_frac`."""
    rgb = im.convert('RGB')
    y = round(y_frac * (im.height - 1))
    for x in range(im.width - 1, 0, -1):
        if perto(rgb.getpixel((x, y)), PAPEL, 6):
            return round((x + 1) / im.width, 4)
    return 0.0


def main():
    repositorio = {
        'm05': 'src/assets/cenas/inicio/m05-sol-1672w.webp',
        'm05m': 'src/assets/cenas/inicio/m05-sol-390c-1170w.webp',
        'm06': 'src/assets/cenas/inicio/m06-apagada-900w.webp',
        'm04': 'src/assets/cenas/inicio-faixas/m04-faixa-1200w.webp',
        'rua': 'src/assets/cenas/inicio-faixas/a05-rua-fundo-1672w.webp',
        'porta': 'public/cenas/inicio-faixas/porta-noite-1254w.webp',
        'luminaria': 'src/assets/cenas/inicio/m05-sol-1672w.webp',
        'historico': 'public/telas/casa/historico-y-alta-1170w.webp',
        'hoje-n': 'public/telas/casa/hoje-n-1170w.webp',
        'notas': 'public/telas/t1i/notas-1170w.webp',
        'familia': 'public/telas/t1i/familia-1170w.webp',
    }
    externos = {
        'm01': ('4_cenas/01_mamada_0300.png', (1672, 941)),
        'm12': ('6_scenes1/M12_arms_v3.png', (981, 1602)),
    }
    nomes = ', '.join((*repositorio, *externos))
    parser = argparse.ArgumentParser(description='Exporta recortes da composição de referência do Início.')
    parser.add_argument('--mestres', metavar='PASTA', help='pasta dos PNGs mestres de m01 e m12')
    parser.add_argument('seletores', nargs='*', help=f'sem seleção, exporta só o repositório. Opções: {nomes}')
    args = parser.parse_intermixed_args()
    origens = {}
    for nome in dict.fromkeys(args.seletores or repositorio):
        if nome in repositorio:
            origem = os.path.join(RAIZ, repositorio[nome])
        elif nome in externos:
            if args.mestres is None:
                parser.error(f'{nome} exige --mestres PASTA')
            origem = os.path.abspath(os.path.join(args.mestres, externos[nome][0]))
        else:
            parser.error(f'seletor inválido: {nome}. Opções: {nomes}')
        try:
            with Image.open(origem) as imagem:
                if nome in externos and imagem.size != externos[nome][1]:
                    raise ValueError(f'dimensões {imagem.size}, esperadas {externos[nome][1]}')
                imagem.load()
        except (OSError, ValueError, SyntaxError) as erro:
            parser.error(f'entrada de {nome} indisponível ou inválida: {origem} ({erro})')
        origens[nome] = origem

    medidas: dict = {}
    caminho_medidas = os.path.join(SAIDA, 'medidas.json')
    if os.path.exists(caminho_medidas):
        medidas = json.load(open(caminho_medidas, encoding='utf-8'))

    ruido_m01 = ruido_m12 = None
    if 'm12' in origens:
        # Pillow avança o gerador a cada textura. O M12 publicado usou a segunda,
        # logo depois de M01, e precisa do mesmo grão mesmo quando é pedido sozinho.
        ruido_m01 = ruido_papel(externos['m01'][1])
        ruido_m12 = ruido_papel(externos['m12'][1])

    if 'm05' in origens:
        im = placa('m05', origens['m05'], [PAPEL, CACAU, AREIA, CHAO], medidas=medidas)
        medidas['m05'].update(chao=linha_do_chao(im, 0.99, CHAO), costura=costura(im, 0.02))
    if 'm05m' in origens:
        im = placa('m05m', origens['m05m'], [PAPEL, CACAU, AREIA, CHAO], medidas=medidas)
        medidas['m05m'].update(chao=linha_do_chao(im, 0.99, CHAO), costura=costura(im, 0.02))
    if 'm06' in origens:
        im = placa('m06', origens['m06'], [CACAU, CHAO], medidas=medidas)
        medidas['m06'].update(chao=linha_do_chao(im, 0.02, CHAO))
    if 'm04' in origens:
        placa('m04', origens['m04'], [PAPEL, AREIA], areia_ligada='b', manter_areia=True, medidas=medidas)
    if 'rua' in origens:
        placa('rua', origens['rua'], [CACAU], medidas=medidas)
    if 'porta' in origens:
        placa('porta', origens['porta'], [CACAU], medidas=medidas)
    if 'm01' in origens:
        placa('m01', origens['m01'], [CACAU, CHAO], medidas=medidas, sem_anel=True, abrir=True, ilhas=300, ruido=ruido_m01)
    if 'm12' in origens:
        placa('m12', origens['m12'], [PAPEL], medidas=medidas,
              sem_anel=True, bolsos=6, ruido=ruido_m12)
    if 'luminaria' in origens:
        placa('luminaria', origens['luminaria'], [CACAU, CHAO], medidas=medidas, corte=(1415, 225, 1610, 870),
              sem_anel=True, mistura=(CACAU, CHAO, 8), abrir=True, ilhas=40)
    for nome in ('historico', 'hoje-n', 'notas', 'familia'):
        if nome in origens:
            tela(nome, origens[nome], [780, 1170], medidas)
    json.dump(medidas, open(caminho_medidas, 'w', encoding='utf-8'), indent=1)


if __name__ == '__main__':
    main()
