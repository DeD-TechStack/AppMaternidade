# F7a-1: export the A05 street and the A43 door as layered files (an unlit base plus one light layer).
#
# py -3.12 -I -X utf8 web/scripts/ativos/exportar_camadas.py --mestres .oc/mestres --saida web --olhar .oc/olhar
#
# Pillow + stdlib only (numpy is not installed for py -3.12). No generator, no upscaling, no new dependency.
# The masters are read-only sources: their sha256 is asserted before anything is read as an image.
# The colour-snap table is copied from prep.py (DIRECAO_FABLE/5_freeze/studies/_work/prep.py); prep.py itself is NOT
# imported (it runs side effects on import), it is only hashed and its table text compared with the copy below.
#
# Recipe shared by both assets: the lit pixels (the "core": prep.py is_mel(), plus the brightest yellows) are replaced in
# the base by their unlit neighbours, measured beside them; the light layer keeps the master pixel there, opaque. Around
# the core, every pixel that is a mix a*Y + (1-a)*o of the lit yellow Y and an unlit colour o (the 1 px AA ring and, in
# the lit windows of A05, the amber mullions) is split into base = o and layer = (L, a) with a*L + (1-a)*o = master
# pixel, so base + layer reproduces the token-snapped master to rounding. Nothing is generated or retouched beyond these fills.
import argparse
import ast
import collections
import hashlib
import json
import math
import os
import re

import PIL
from PIL import Image, ImageChops

SCRIPT = os.path.abspath(__file__)
SCRIPT_REL = 'web/scripts/ativos/exportar_camadas.py'
TASK = 't_bb5e9dfd (F7a-1), 2026-11-25'

SHA_M11 = 'f1d73820c10eb3ee264321c8e6538887e57af61ba8a330eaac5241eb4653f492'
SHA_10A = '4120836e2626bc66cba05faaa8f99aaabda1b4adbf1eb338838cfeed56d111be'
SHA_PREP = '662c7cd9f8a31f951c94362baa608004e37567827d59876a2c74536ccb81d397'
SRC_M11 = 'DIRECAO_FABLE/6_scenes1/M11_street_v3.png'
SRC_10A = 'DIRECAO_FABLE/4_cenas/10a_porta.png'

# ---- prep.py token table (copied; asserted against the prep.py text) ------------------------------------------------
TOK = {'papel': (0xF8, 0xF6, 0xEB), 'cacau': (0x2B, 0x23, 0x20), 'areia': (0xEA, 0xDD, 0xC5),
       'texto2': (0x6E, 0x65, 0x60), 'noitec': (0x3A, 0x30, 0x2B)}
TOL = {'papel': 12, 'cacau': 14, 'areia': 12, 'texto2': 10, 'noitec': 7}
MEL = (0xF2, 0xC1, 0x4E)  # prep.py is_mel(): the lit-pane yellow, same tolerances
# M11 "four-region snap" (PROVENANCE of inicio-faixas, row m11-apagada-542w and its footnote).
WALL_SRC, WALL_TOL, WALL_DST = (0x45, 0x34, 0x2E), 5, (0x3A, 0x30, 0x2B)
UNLIT = (0x18, 0x11, 0x0F)  # median of 32 unlit panes of the M11 master
WALL = WALL_DST
CACAU = TOK['cacau']
NOITEC = TOK['noitec']
LAMP_CAP = 12000
SKY_TOL = 4
A_MIN8 = 8  # a mix under 8/255 (3 %) stays in the base: the layer would only carry noise there
DARK_MAX = 0x28  # focal silhouette: a dark pixel (every channel <= 0x28) inside the focal window
CLUSTER_GAP = 10  # lit panes closer than this (mullion width) belong to the same window

A05_TIERS = (1672, 1170, 780, 390)
A43_TIERS = (1254, 780, 720, 390)
A43_SERVED = {1254: 'porta-1254w.webp', 780: 'porta-780w.webp', 720: 'porta-720w.webp', 390: 'porta-390w.webp'}
PIL_VERSION = PIL.__version__

_SNAP_CACHE = {}


# ---- small helpers ----------------------------------------------------------------------------------------------------
def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha256_file(path):
    with open(path, 'rb') as fh:
        return sha256_bytes(fh.read())


def assert_hash(path, expected, what):
    got = sha256_file(path)
    assert got == expected, f'HASH MISMATCH {what}: {got} != {expected}'
    return got


def flat(im):
    return getattr(im, 'get_flattened_data', im.getdata)()


def hex3(c):
    return '#%02X%02X%02X' % tuple(c[:3])


def check_prep_table(prep_path):
    """prep.py is only read as text: its TOK/TOL literals must equal the table copied above."""
    with open(prep_path, 'r', encoding='utf-8') as fh:
        text = fh.read()
    tok = re.search(r'^TOK = (\{.*?\})\s*\nTOL = (\{.*?\})\s*\n', text, re.S | re.M)
    assert tok, 'prep.py: TOK/TOL table not found'
    assert ast.literal_eval(tok.group(1)) == TOK, 'prep.py TOK table differs from the copy in this script'
    assert ast.literal_eval(tok.group(2)) == TOL, 'prep.py TOL table differs from the copy in this script'
    assert 'def snap_colour(c, cache={}):' in text and 'd <= TOL[k] and d < bd' in text, 'prep.py snap_colour() changed'
    assert 'MEL = (0xF2, 0xC1, 0x4E)' in text and 'abs(c[0]-MEL[0]) < 28' in text, 'prep.py is_mel() changed'


def snap_colour(c, wall=False):
    """prep.py snap_colour(): nearest token within its tolerance, else unchanged. `wall` adds the M11 house-wall rule."""
    key = (c, wall)
    r = _SNAP_CACHE.get(key)
    if r is None:
        best, bd = c, 999
        for k, t in TOK.items():
            d = max(abs(c[0] - t[0]), abs(c[1] - t[1]), abs(c[2] - t[2]))
            if d <= TOL[k] and d < bd:
                best, bd = t, d
        if wall and best == c and max(abs(c[0] - WALL_SRC[0]), abs(c[1] - WALL_SRC[1]), abs(c[2] - WALL_SRC[2])) <= WALL_TOL:
            best = WALL_DST
        _SNAP_CACHE[key] = r = best
    return r


def snap_image(im, wall=False):
    out = Image.new('RGB', im.size)
    out.putdata([snap_colour(c, wall) for c in flat(im)])
    return out


def is_mel(c):
    return abs(c[0] - MEL[0]) < 28 and abs(c[1] - MEL[1]) < 30 and abs(c[2] - MEL[2]) < 45


def is_lit(c):
    """The lit core: prep.py is_mel(), plus the brightest yellows of the master (highlights like #FFE845)."""
    return is_mel(c) or (c[0] >= 0xE8 and c[1] >= 0xA8 and c[2] <= 0x70)


def median_colour(colours):
    if not colours:
        return None
    return tuple(sorted(c[i] for c in colours)[len(colours) // 2] for i in range(3))


# ---- geometry helpers -----------------------------------------------------------------------------------------------
def flood_sky(px, w, h, ref, tol):
    """Region flood-filled (4-connected) from the top edge over the colour `ref` +-tol per channel."""
    def near(c):
        return abs(c[0] - ref[0]) <= tol and abs(c[1] - ref[1]) <= tol and abs(c[2] - ref[2]) <= tol
    mask = bytearray(w * h)
    todo = collections.deque()
    for x in range(w):
        if near(px[x, 0]):
            mask[x] = 1
            todo.append((x, 0))
    while todo:
        x, y = todo.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not mask[ny * w + nx] and near(px[nx, ny]):
                mask[ny * w + nx] = 1
                todo.append((nx, ny))
    return mask


def components(mask, w, h):
    """4-connected components of a bytearray mask: [{'pixels': [index], 'bbox': (x0, y0, x1, y1) inclusive}]."""
    seen = bytearray(w * h)
    found = []
    for start in range(w * h):
        if not mask[start] or seen[start]:
            continue
        seen[start] = 1
        stack = [start]
        pixels = []
        x0 = y0 = 10 ** 9
        x1 = y1 = -1
        while stack:
            i = stack.pop()
            pixels.append(i)
            x, y = i % w, i // w
            x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if mask[j] and not seen[j]:
                        seen[j] = 1
                        stack.append(j)
        found.append({'pixels': pixels, 'bbox': (x0, y0, x1, y1)})
    return found


def cluster(comps, gap):
    """Groups the components whose boxes are within `gap` px of each other (the panes of one window)."""
    parent = list(range(len(comps)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for i in range(len(comps)):
        for j in range(i + 1, len(comps)):
            a, b = comps[i]['bbox'], comps[j]['bbox']
            if not (a[2] + gap < b[0] or b[2] + gap < a[0] or a[3] + gap < b[1] or b[3] + gap < a[1]):
                parent[find(i)] = find(j)
    groups = collections.defaultdict(list)
    for i in range(len(comps)):
        groups[find(i)].append(comps[i])
    return list(groups.values())


def union_box(boxes):
    return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))


def box_scaled(box, sx, sy, w, h, pad=1):
    """A pixel box (x0, y0, x1, y1 inclusive) in master px -> the same box in a tier, padded by `pad` px, clamped."""
    return (max(0, math.floor(box[0] * sx) - pad), max(0, math.floor(box[1] * sy) - pad),
            min(w - 1, math.ceil((box[2] + 1) * sx) - 1 + pad), min(h - 1, math.ceil((box[3] + 1) * sy) - 1 + pad))


def frac(box, w, h):
    return [round(box[0] / w, 6), round(box[1] / h, 6), round((box[2] + 1) / w, 6), round((box[3] + 1) / h, 6)]


def shift_box(box, dx, dy):
    return (box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy)


# ---- the split: base + light layer ------------------------------------------------------------------------------------
def decompose(p, y, cands):
    """Best reading of p as a*y + (1-a)*o over the candidate unlit colours: (residual, alpha8, o)."""
    best = None
    for o in cands:
        den = sum((y[k] - o[k]) ** 2 for k in range(3))
        num = sum((p[k] - o[k]) * (y[k] - o[k]) for k in range(3))
        a8 = round(max(0.0, min(1.0, num / den)) * 255)
        a = a8 / 255
        res = max(abs(p[k] - (a * y[k] + (1 - a) * o[k])) for k in range(3))
        if best is None or res < best[0]:
            best = (res, a8, o)
    return best


def split_regions(snapped, core_comps, regions, cands, fill_core):
    """
    snapped     RGB image, already token-snapped.
    core_comps  the components of the lit core (all of them are replaced in the base).
    regions     [{'box': core box (x0, y0, x1, y1), 'y': lit yellow, 'ring_only': bool, 'silhouette': bool}]; every pixel
                of the box +1 px that is not core is read as a mix (see the header). ring_only: only the 8-neighbours of the core.
    fill_core   function (x, y) -> unlit colour that replaces a core pixel in the base.
    Returns base (RGB), layer (RGBA), stats.
    """
    w, h = snapped.size
    sp = snapped.load()
    base = snapped.copy()
    bp = base.load()
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    lp = layer.load()
    core = bytearray(w * h)
    n_core = 0
    for comp in core_comps:
        for i in comp['pixels']:
            core[i] = 1
            x, y = i % w, i // w
            bp[x, y] = fill_core(x, y)
            lp[x, y] = sp[x, y] + (255,)
            n_core += 1
    done = bytearray(w * h)
    n_mix = n_left = n_sil = 0
    for reg in regions:
        x0, y0, x1, y1 = reg['box']
        for y in range(max(0, y0 - 1), min(h, y1 + 2)):
            for x in range(max(0, x0 - 1), min(w, x1 + 2)):
                i = y * w + x
                if core[i] or done[i]:
                    continue
                if reg['ring_only'] and not any(
                        0 <= x + dx < w and 0 <= y + dy < h and core[(y + dy) * w + x + dx]
                        for dy in (-1, 0, 1) for dx in (-1, 0, 1)):
                    continue
                done[i] = 1
                p = sp[x, y]
                # focal window: a pixel with no exact wall-colour pixel within 1 px is glass (pane, silhouette, halo):
                # its unlit colour is the unlit pane colour, never the wall (else the unlit base keeps a ghost outline)
                glass = reg['silhouette'] and not any(
                    sp[x + dx, y + dy] == WALL for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                    if 0 <= x + dx < w and 0 <= y + dy < h)
                _, a8, o = decompose(p, reg['y'], [UNLIT] if glass else cands)
                if a8 >= A_MIN8:
                    a = a8 / 255
                    bp[x, y] = o
                    lp[x, y] = tuple(max(0, min(255, round((p[k] - (1 - a) * o[k]) / a))) for k in range(3)) + (a8,)
                    n_mix += 1
                elif reg['silhouette'] and (glass or max(p) <= DARK_MAX):
                    bp[x, y] = UNLIT
                    lp[x, y] = p + (255,)
                    n_sil += 1
                else:
                    n_left += 1
    return base, layer, {'core_px': n_core, 'mix_px': n_mix, 'silhouette_px': n_sil, 'left_px': n_left}


def premult_resize(layer, size):
    """LANCZOS on premultiplied alpha (RGBa), back to straight RGBA. Never up."""
    w, h = size
    assert w <= layer.width and h <= layer.height, f'upscale refused {layer.size} -> {size}'
    if (w, h) == layer.size:
        return layer.copy()
    return layer.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')


def clip_to_boxes(layer, boxes):
    """Transparent (0,0,0,0) everywhere outside the boxes (inclusive px): drops the Lanczos tails. Returns layer, px cut."""
    mask = Image.new('L', layer.size, 0)
    for (x0, y0, x1, y1) in boxes:
        mask.paste(255, (x0, y0, x1 + 1, y1 + 1))
    before = sum(layer.getchannel('A').histogram()[1:])
    out = Image.composite(layer, Image.new('RGBA', layer.size, (0, 0, 0, 0)), mask)
    return out, before - sum(out.getchannel('A').histogram()[1:])


def alpha_bbox(layer):
    box = layer.getchannel('A').point(lambda v: 255 if v else 0).getbbox()
    return None if box is None else (box[0], box[1], box[2] - 1, box[3] - 1)


def alpha_outside(layer, boxes):
    """Number of pixels with alpha > 0 outside every box (inclusive px)."""
    mask = Image.new('L', layer.size, 255)
    for (x0, y0, x1, y1) in boxes:
        mask.paste(0, (x0, y0, x1 + 1, y1 + 1))
    outside = ImageChops.multiply(layer.getchannel('A').point(lambda v: 255 if v else 0), mask)
    return sum(outside.histogram()[1:])


def diff_stats(a, b, box=None):
    """Mean abs diff per channel of two RGB images, the max per-pixel diff and the first place it happens."""
    ox = oy = 0
    if box is not None:
        ox, oy = box[0], box[1]
        a, b = a.crop((box[0], box[1], box[2] + 1, box[3] + 1)), b.crop((box[0], box[1], box[2] + 1, box[3] + 1))
    d = ImageChops.difference(a, b)
    n = d.width * d.height
    chans = d.split()
    means = [round(sum(v * c for v, c in enumerate(ch.histogram())) / n, 4) for ch in chans]
    worst = max(ch.getextrema()[1] for ch in chans)
    where = None
    if worst:
        for ch in chans:
            hit = ch.point(lambda v, w=worst: 255 if v == w else 0).getbbox()
            if hit:
                where = [hit[0] + ox, hit[1] + oy]
                break
    return means, worst, where


def composite_rgb(base, layer, bg=None):
    b = base.convert('RGBA')
    if bg is not None:
        under = Image.new('RGBA', b.size, bg + (255,))
        b = Image.alpha_composite(under, b)
    return Image.alpha_composite(b, layer).convert('RGB')


def save_png(layer, path):
    layer.save(path, 'PNG', optimize=True)
    return os.path.getsize(path)


def save_webp_lossless(im, path):
    im.save(path, 'WEBP', lossless=True, quality=100, method=6, exact=True)
    return os.path.getsize(path)


def save_webp_q82(im, path):
    im.save(path, 'WEBP', quality=82, method=6)
    return os.path.getsize(path)


def write_text(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(text)


def write_json(path, obj):
    write_text(path, json.dumps(obj, indent=2, ensure_ascii=False) + '\n')


def file_record(path, rel, w, h, **extra):
    data = open(path, 'rb').read()
    rec = {'file': rel, 'sha256': sha256_bytes(data), 'bytes': len(data), 'width': w, 'height': h}
    rec.update(extra)
    return rec


# ---- A05 --------------------------------------------------------------------------------------------------------------
def build_a05(args, ctx):
    master_path = os.path.join(args.mestres, 'M11_street_v3.png')
    assert_hash(master_path, SHA_M11, 'M11_street_v3.png')
    master = Image.open(master_path).convert('RGB')
    W, H = master.size
    assert (W, H) == (1672, 941), f'unexpected M11 size {master.size}'
    snapped = snap_image(master, wall=True)
    sp = snapped.load()
    assert sp[0, 0] == CACAU, f'sky is not cacau after the snap: {sp[0, 0]}'
    sky = flood_sky(sp, W, H, sp[0, 0], SKY_TOL)
    roof = next(y for y in range(H) if any(not sky[y * W + x] for x in range(W)))
    Hc = H - roof
    print(f'[a05] snapped; highest non-sky row {roof} ({roof / H:.4f} of {H}); scene frame {W}x{Hc}')

    # the lit core and its windows
    lit = bytearray(W * H)
    for y in range(H):
        for x in range(W):
            if not sky[y * W + x] and is_lit(sp[x, y]):
                lit[y * W + x] = 1
    comps = components(lit, W, H)
    groups = cluster(comps, CLUSTER_GAP)
    windows = []
    for g in groups:
        box = union_box([c['bbox'] for c in g])
        yel = median_colour([sp[i % W, i // W] for c in g for i in c['pixels']])
        windows.append({'box': box, 'panes': [c['bbox'] for c in g], 'y': yel, 'n': sum(len(c['pixels']) for c in g)})
    windows.sort(key=lambda r: (r['box'][1], r['box'][0]))
    focal = max(windows, key=lambda r: (r['box'][2] - r['box'][0]) * (r['box'][3] - r['box'][1]))
    print(f'[a05] lit core: {len(comps)} components, {len(windows)} windows; focal window {focal["box"]}')
    for r in windows:
        print('   window', r['box'], 'panes', len(r['panes']), 'yellow', hex3(r['y']))

    regions = [{'box': r['box'], 'y': r['y'], 'ring_only': False, 'silhouette': r is focal} for r in windows]
    base_rgb, layer_full, stats = split_regions(snapped, comps, regions, [WALL, UNLIT, CACAU], lambda x, y: UNLIT)
    print('[a05] split', stats)

    # composite check at 1672 (opaque base): identical to the snapped master outside the boxes, <= 1.0 inside them
    comp_full = composite_rgb(base_rgb, layer_full)
    boxes_pad = [(r['box'][0] - 1, r['box'][1] - 1, r['box'][2] + 1, r['box'][3] + 1) for r in windows]
    inside_mean = []
    inside_max = 0
    inside_where = None
    tot = [0, 0, 0]
    npx = 0
    for bx in boxes_pad:
        means, worst, where = diff_stats(comp_full, snapped, bx)
        n = (bx[2] - bx[0] + 1) * (bx[3] - bx[1] + 1)
        npx += n
        for k in range(3):
            tot[k] += means[k] * n
        if worst > inside_max:
            inside_max, inside_where = worst, where
    inside_mean = [round(t / npx, 4) for t in tot]
    out_mask = Image.new('L', (W, H), 255)
    for (x0, y0, x1, y1) in boxes_pad:
        out_mask.paste(0, (x0, y0, x1 + 1, y1 + 1))
    black = Image.new('RGB', (W, H), (0, 0, 0))
    out_diff = ImageChops.difference(Image.composite(comp_full, black, out_mask), Image.composite(snapped, black, out_mask))
    outside_nonzero = sum(sum(ch.histogram()[1:]) for ch in out_diff.split())
    print(f'[a05] composite vs snapped master: inside boxes mean {inside_mean} max {inside_max} at {inside_where}; outside differing samples {outside_nonzero}')
    assert max(inside_mean) <= 1.0, f'composite mean diff {inside_mean} > 1.0'
    assert outside_nonzero == 0, 'base differs from the snapped master outside the pane boxes'

    # base: rows roof..H, sky transparent (RGB zeroed so the lossless file is deterministic)
    base_crop = base_rgb.crop((0, roof, W, H))
    alpha = Image.frombytes('L', (W, Hc), bytes(0 if v else 255 for v in sky[roof * W:]))
    base_rgba = Image.composite(base_crop, Image.new('RGB', (W, Hc), (0, 0, 0)), alpha).convert('RGBA')
    base_rgba.putalpha(alpha)
    bpx = base_rgba.load()
    lit_left = warm_left = 0
    for y in range(Hc):
        for x in range(W):
            r, g, b, a = bpx[x, y]
            if a:
                if is_lit((r, g, b)):
                    lit_left += 1
                if r >= 0x90 and r - b >= 0x40:
                    warm_left += 1
    assert lit_left == 0, f'{lit_left} lit-pane-colour pixels remain in the A05 base'
    print(f'[a05] base: lit-colour pixels left {lit_left}; warm (R>=0x90, R-B>=0x40) pixels left {warm_left}')
    folder_src = os.path.join(args.saida, 'src', 'assets', 'cenas', 'inicio-faixas')
    folder_pub = os.path.join(args.saida, 'public', 'cenas', 'inicio-faixas')
    os.makedirs(folder_src, exist_ok=True)
    os.makedirs(folder_pub, exist_ok=True)
    base_path = os.path.join(folder_src, 'a05-rua-fundo-1672w.webp')
    save_webp_lossless(base_rgba, base_path)
    base_sky_px = sum(alpha.histogram()[:1])

    # light layer: the 1672 layer in the base frame, then the tiers
    layer1672 = layer_full.crop((0, roof, W, H))
    win_boxes = [shift_box(r['box'], 0, -roof) for r in windows]
    pane_boxes = [shift_box(b, 0, -roof) for r in windows for b in r['panes']]
    assert alpha_outside(layer1672, [(b[0] - 1, b[1] - 1, b[2] + 1, b[3] + 1) for b in win_boxes]) == 0
    tiers = []
    layer_imgs = {}
    for tw in A05_TIERS:
        th = round(Hc * tw / W)
        img = premult_resize(layer1672, (tw, th))
        sx, sy = tw / W, th / Hc
        tier_boxes = [box_scaled(b, sx, sy, tw, th) for b in win_boxes]
        img, cut = clip_to_boxes(img, tier_boxes)
        assert alpha_outside(img, tier_boxes) == 0
        path = os.path.join(folder_pub, f'a05-rua-luz-{tw}w.png')
        nbytes = save_png(img, path)
        layer_imgs[tw] = img
        tiers.append(file_record(path, f'web/public/cenas/inicio-faixas/a05-rua-luz-{tw}w.png', tw, th,
                                 scale=round(tw / W, 6), source_width=W, alpha_bbox=list(alpha_bbox(img)) if alpha_bbox(img) else None,
                                 tail_px_cut=cut, over_cap=nbytes > LAMP_CAP))
        print(f'[a05] light {tw}w {tw}x{th}: {nbytes} B (cap {LAMP_CAP} B){" CAP_OPEN" if nbytes > LAMP_CAP else ""}; Lanczos tail px cut {cut}')
    base_rec = file_record(base_path, 'web/src/assets/cenas/inicio-faixas/a05-rua-fundo-1672w.webp', W, Hc,
                           scale=1.0, source_width=W, format='webp-lossless-rgba',
                           measurements={'lit_colour_pixels': lit_left, 'warm_pixels': warm_left, 'sky_transparent_pixels': base_sky_px,
                                         'opaque_bbox': list(alpha_bbox(base_rgba)), 'lit_colour_rule': 'prep.py is_mel() or R>=0xE8,G>=0xA8,B<=0x70'})
    print(f'[a05] base 1672w {W}x{Hc}: {base_rec["bytes"]} B')

    # floor line: first row where the wall at a plain column gives way to the ground strip
    floor_row = next(y for y in range(800, H) if sp[245, y] != WALL)
    print(f'[a05] floor row {floor_row}')

    # validation against the served M11 crop (1130,520,1672,941)
    served = validate_m11(args, base_rgba, layer1672, roof)

    ctx['a05'] = {
        'W': W, 'H': H, 'Hc': Hc, 'roof': roof, 'floor_row': floor_row, 'windows': windows, 'focal': focal, 'comps': comps,
        'snapped': snapped, 'base_rgba': base_rgba, 'layer1672': layer1672, 'layer_imgs': layer_imgs, 'stats': stats,
        'tiers': tiers, 'base_rec': base_rec, 'win_boxes': win_boxes, 'pane_boxes': pane_boxes,
        'composite': {'inside_boxes_mean_abs_diff': inside_mean, 'inside_boxes_max': inside_max, 'inside_boxes_max_at': inside_where,
                      'outside_boxes_differing_samples': outside_nonzero, 'threshold_mean': 1.0},
        'served_check': served, 'folder_pub': folder_pub, 'folder_src': folder_src, 'comp_full': comp_full,
    }


def validate_m11(args, base_rgba, layer1672, roof):
    """Compares the new split on the crop 1130,520,1672,941 with the served m11-apagada / m11-luz (same recipe)."""
    pub = os.path.join(args.saida, 'public', 'cenas', 'inicio-faixas')
    src = os.path.join(args.saida, 'src', 'assets', 'cenas', 'inicio-faixas')
    apagada = Image.open(os.path.join(src, 'm11-apagada-542w.webp')).convert('RGB')
    luz = Image.open(os.path.join(pub, 'm11-luz-542w.png')).convert('RGBA')
    X0, Y0 = 1130, 520
    mine_base = base_rgba.crop((X0, Y0 - roof, base_rgba.width, base_rgba.height))
    mine_layer = layer1672.crop((X0, Y0 - roof, layer1672.width, layer1672.height))
    assert mine_base.size == apagada.size == (542, 421), (mine_base.size, apagada.size)
    mb = mine_base.load()
    ap = apagada.load()
    diff_px = opaque = 0
    far_diffs = []
    for y in range(421):
        for x in range(542):
            r, g, b, a = mb[x, y]
            if a == 255:
                opaque += 1
                if (r, g, b) != ap[x, y]:
                    diff_px += 1
                    far_diffs.append((x + X0, y + Y0))
    a_mine = sum(mine_layer.getchannel('A').histogram()[1:])
    a_served = sum(luz.getchannel('A').histogram()[1:])
    core_mine = mine_layer.getchannel('A').histogram()[255]
    core_served = luz.getchannel('A').histogram()[255]
    dbox = None
    if far_diffs:
        xs, ys = [p[0] for p in far_diffs], [p[1] for p in far_diffs]
        dbox = [min(xs), min(ys), max(xs), max(ys)]
    print(f'[a05] vs served m11 crop: opaque base px {opaque}, differing from m11-apagada {diff_px} (bbox {dbox}); '
          f'layer alpha>0 px {a_mine} vs {a_served} served, alpha=255 px {core_mine} vs {core_served}')
    return {'opaque_base_px': opaque, 'base_px_differing_from_m11_apagada': diff_px, 'differing_bbox_master_px': dbox,
            'layer_alpha_px_new': a_mine, 'layer_alpha_px_served': a_served,
            'layer_core_px_new': core_mine, 'layer_core_px_served': core_served}


# ---- A43 --------------------------------------------------------------------------------------------------------------
def build_a43(args, ctx):
    master_path = os.path.join(args.mestres, '10a_porta.png')
    assert_hash(master_path, SHA_10A, '10a_porta.png')
    master = Image.open(master_path).convert('RGB')
    W, H = master.size
    assert (W, H) == (1254, 1254), f'unexpected 10a size {master.size}'
    snapped = snap_image(master)  # whole plate, prep.py table: the plate porta.py served
    sp = snapped.load()
    lit = bytearray(W * H)
    for y in range(H):
        for x in range(W):
            if is_lit(sp[x, y]):
                lit[y * W + x] = 1
    comps = components(lit, W, H)
    big = max(comps, key=lambda c: len(c['pixels']))
    print(f'[a43] lit core: {len(comps)} components, biggest {big["bbox"]} n={len(big["pixels"])}')

    # the line of light vs the wedge: the line rows are the bright ones (median G >= 0xC8), the wedge starts after them
    rows = collections.defaultdict(list)
    for c in comps:
        for i in c['pixels']:
            rows[i // W].append(sp[i % W, i // W])
    first_full = min(y for y, v in rows.items() if len(v) >= 500)
    split = next(y for y in range(first_full, H) if median_colour(rows[y])[1] < 0xC8)
    line_comp = {'pixels': [i for c in comps for i in c['pixels'] if i // W < split]}
    wedge_comp = {'pixels': [i for c in comps for i in c['pixels'] if i // W >= split]}
    for comp in (line_comp, wedge_comp):
        xs = [i % W for i in comp['pixels']]
        ys = [i // W for i in comp['pixels']]
        comp['bbox'] = (min(xs), min(ys), max(xs), max(ys))
    print(f'[a43] line rows {line_comp["bbox"][1]}..{line_comp["bbox"][3]} box {line_comp["bbox"]}; wedge rows from {split}, box {wedge_comp["bbox"]}')

    # unlit colours measured beside the shapes (snapped plate): the door above the line, the floor beside the wedge
    door_c = median_colour([sp[x, y] for y in range(1060, 1076) for x in range(580, 1131)])
    floor_c = median_colour([sp[x, y] for y in range(split + 2, wedge_comp['bbox'][3] - 1) for x in range(300, 451)])
    print(f'[a43] unlit neighbours: door {hex3(door_c)}, floor {hex3(floor_c)}')
    floor_row = next(y for y in range(900, H) if sp[300, y] == NOITEC)

    regions = [
        {'box': line_comp['bbox'], 'y': median_colour([sp[i % W, i // W] for i in line_comp['pixels']]), 'ring_only': True, 'silhouette': False},
        {'box': wedge_comp['bbox'], 'y': median_colour([sp[i % W, i // W] for i in wedge_comp['pixels']]), 'ring_only': True, 'silhouette': False},
    ]
    cands = list({door_c, floor_c, NOITEC, CACAU})
    base_rgb, layer1254, stats = split_regions(snapped, [line_comp, wedge_comp], regions, cands,
                                               lambda x, y: door_c if y < split else floor_c)
    print('[a43] split', stats)
    comp_full = composite_rgb(base_rgb, layer1254)
    means, worst, where = diff_stats(comp_full, snapped)
    print(f'[a43] composite at 1254 vs snapped master: mean {means} max {worst} at {where}')
    assert max(means) <= 1.0
    lit_left = sum(1 for c in flat(base_rgb) if is_lit(c))
    assert lit_left == 0, f'{lit_left} lit pixels remain in the A43 base'

    folder = os.path.join(args.saida, 'public', 'cenas', 'acesso')
    os.makedirs(folder, exist_ok=True)
    shape_boxes = [line_comp['bbox'], wedge_comp['bbox']]
    base_tiers, layer_tiers, base_recs, layer_recs, comp_checks = {}, {}, [], [], []
    for tw in A43_TIERS:
        th = round(H * tw / W)
        assert tw <= W
        base_t = base_rgb if tw == W else base_rgb.resize((tw, th), Image.LANCZOS)
        bpath = os.path.join(folder, f'a43-porta-fundo-{tw}w.webp')
        save_webp_q82(base_t, bpath)
        layer_t = premult_resize(layer1254, (tw, th))
        sx, sy = tw / W, th / H
        tier_boxes = [box_scaled(b, sx, sy, tw, th) for b in shape_boxes]
        layer_t, cut = clip_to_boxes(layer_t, tier_boxes)
        assert alpha_outside(layer_t, tier_boxes) == 0
        lpath = os.path.join(folder, f'a43-porta-luz-{tw}w.png')
        nbytes = save_png(layer_t, lpath)
        base_tiers[tw], layer_tiers[tw] = Image.open(bpath).convert('RGB'), layer_t
        base_recs.append(file_record(bpath, f'web/public/cenas/acesso/a43-porta-fundo-{tw}w.webp', tw, th,
                                     scale=round(tw / W, 6), source_width=W, format='webp-lossy-q82-m6'))
        layer_recs.append(file_record(lpath, f'web/public/cenas/acesso/a43-porta-luz-{tw}w.png', tw, th,
                                      scale=round(tw / W, 6), source_width=W, alpha_bbox=list(alpha_bbox(layer_t)) if alpha_bbox(layer_t) else None,
                                      tail_px_cut=cut, over_cap=nbytes > LAMP_CAP))
        served_t = Image.open(os.path.join(folder, A43_SERVED[tw])).convert('RGB')
        assert served_t.size == (tw, th), (served_t.size, tw, th)
        c_t = composite_rgb(base_tiers[tw], layer_t)
        m, mx, wh = diff_stats(c_t, served_t)
        comp_checks.append({'tier': tw, 'served_file': f'web/public/cenas/acesso/{A43_SERVED[tw]}', 'mean_abs_diff_per_channel': m,
                            'max_pixel_diff': mx, 'max_at': wh, 'threshold_mean': 2.0})
        print(f'[a43] {tw}w {tw}x{th}: base {base_recs[-1]["bytes"]} B, light {nbytes} B (cap {LAMP_CAP} B){" CAP_OPEN" if nbytes > LAMP_CAP else ""}; '
              f'composite vs served: mean {m} max {mx} at {wh}; tail px cut {cut}')
        assert max(m) <= 2.0, f'A43 {tw}w composite mean diff {m} > 2.0'

    ctx['a43'] = {
        'W': W, 'H': H, 'floor_row': floor_row, 'line_box': line_comp['bbox'], 'wedge_box': wedge_comp['bbox'], 'split_row': split,
        'door_c': door_c, 'floor_c': floor_c, 'snapped': snapped, 'base_rgb': base_rgb, 'layer1254': layer1254,
        'base_tiers': base_tiers, 'layer_tiers': layer_tiers, 'base_recs': base_recs, 'layer_recs': layer_recs, 'comp_checks': comp_checks,
        'stats': stats, 'composite_1254_vs_snapped': {'mean': means, 'max': worst, 'at': where}, 'lit_left': lit_left,
        'folder': folder, 'comp_full': comp_full,
    }


# ---- PROVENANCE, manifests --------------------------------------------------------------------------------------------
def read_bytes_text(path):
    with open(path, 'rb') as fh:
        return fh.read().decode('utf-8')


def write_bytes_text(path, text):
    with open(path, 'wb') as fh:
        fh.write(text.encode('utf-8'))


def cap_line(name, nbytes):
    return f'- {name}: {nbytes} bytes over the 12,000 B lamp-layer cap (cap_open: kept, not hidden; measured PNG, premultiplied LANCZOS tier)'


def update_provenance(path, row_prefix, rows, cap_lines, style):
    """Appends this script's rows to the folder's PROVENANCE.md (existing rows stay byte for byte; the script's own rows are replaced on a re-run)."""
    text = read_bytes_text(path)
    nl = '\r\n' if '\r\n' in text else '\n'
    lines = text.split(nl)
    lines = [ln for ln in lines if not any(ln.startswith(p) for p in row_prefix)]
    lines = [ln for ln in lines if not re.match(r'^- (a05|a43)-\S+: \d+ bytes over the 12,000 B lamp-layer cap', ln)]
    # drop an empty `## cap_open` section left by a previous run
    for i, ln in enumerate(lines):
        if ln.strip() == '## cap_open' and all(not x.strip() for x in lines[i + 1:]):
            lines = lines[:i]
            break
    while lines and lines[-1] == '':
        lines.pop()
    if style == 'table':
        last = max(i for i, ln in enumerate(lines[:20]) if ln.startswith('|'))
    else:
        last = max(i for i, ln in enumerate(lines[:20]) if ln.startswith('porta-'))
    lines[last + 1:last + 1] = rows
    if cap_lines:
        if not any(ln.strip() == '## cap_open' for ln in lines):
            lines += ['', '## cap_open', '']
        lines += cap_lines
    write_bytes_text(path, nl.join(lines) + nl)


def provenance_a05(ctx, script_sha):
    a = ctx['a05']
    src = f'{SRC_M11} sha256:{SHA_M11}'
    scr = f'{SCRIPT_REL} sha256:{script_sha}'
    rows = []
    br = a['base_rec']
    rows.append(f'| a05-rua-fundo-1672w.webp | {br["sha256"]} | {br["bytes"]} | {br["width"]}x{br["height"]} | {src} | {scr} | '
                f'0,{a["roof"]},1672,941 (rows from the highest roof row {a["roof"]} to the bottom; sky = flood fill from the top edge over the sky colour +-{SKY_TOL}, alpha 0), '
                f'prep.py token snap + M11 four-region snap; every lit pane filled with the unlit #18110F, the lit mullions and AA ring with their unlit wall colour #3A302B | none (1:1) | '
                f'WebP lossless q100 m6 exact RGBA, Pillow {PIL_VERSION} |')
    for t in a['tiers']:
        scale = '1:1, none' if t['width'] == 1672 else f'premultiplied LANCZOS 1672x{a["Hc"]} -> {t["width"]}x{t["height"]}, alpha tails outside the pane boxes +1 px cut'
        rows.append(f'| a05-rua-luz-{t["width"]}w.png | {t["sha256"]} | {t["bytes"]} | {t["width"]}x{t["height"]} | {src} | {scr} | '
                    f'0,{a["roof"]},1672,941; RGBA light layer = every lit window (panes, amber mullions, focal window silhouette) + 1 px AA ring, transparent elsewhere | {scale} | RGBA PNG, optimize, Pillow {PIL_VERSION} |')
    caps = [cap_line(t['file'].split('/')[-1], t['bytes']) for t in a['tiers'] if t['over_cap']]
    # the layer files are in web/public but their rows (and cap_open lines) live in the PROVENANCE.md next to the base
    update_provenance(os.path.join(a['folder_src'], 'PROVENANCE.md'), ['| a05-rua-'], rows, caps, 'table')
    return caps


def provenance_a43(ctx, script_sha):
    a = ctx['a43']
    src = f'{SRC_10A} sha256:{SHA_10A}'
    scr = f'{SCRIPT_REL} sha256:{script_sha}'
    rows = []
    for rec in a['base_recs']:
        tw = rec['width']
        scale = f'none (1:1) to {tw}x{rec["height"]} from 1254x1254' if tw == 1254 else f'LANCZOS to {tw}x{rec["height"]} from 1254x1254'
        rows.append(f'{rec["file"].split("/")[-1]} | {src} | {scr}; whole plate snapped with the prep.py table and snap_colour(), '
                    f'then the line of light under the door and the wedge on the floor replaced by their unlit neighbours (door {hex3(a["door_c"])}, floor {hex3(a["floor_c"])}) | '
                    f'whole 0,0,1254,1254 | {scale} | WebP q82 method 6, Pillow {PIL_VERSION} | sha256:{rec["sha256"]} | {rec["bytes"]} B | {rec["width"]}x{rec["height"]}')
    for rec in a['layer_recs']:
        tw = rec['width']
        scale = f'none (1:1) to {tw}x{rec["height"]} from 1254x1254' if tw == 1254 else f'premultiplied LANCZOS to {tw}x{rec["height"]} from 1254x1254, alpha tails outside the shape boxes +1 px cut'
        rows.append(f'{rec["file"].split("/")[-1]} | {src} | {scr}; RGBA light layer = the line of light under the door and the wedge on the floor + 1 px AA ring, transparent elsewhere | '
                    f'whole 0,0,1254,1254 | {scale} | RGBA PNG, optimize, Pillow {PIL_VERSION} | sha256:{rec["sha256"]} | {rec["bytes"]} B | {rec["width"]}x{rec["height"]}')
    caps = [cap_line(r['file'].split('/')[-1], r['bytes']) for r in a['layer_recs'] if r['over_cap']]
    update_provenance(os.path.join(a['folder'], 'PROVENANCE.md'), ['a43-porta-'], rows, caps, 'rows')
    return caps


def manifests(ctx, script_sha, a05_caps, a43_caps):
    a = ctx['a05']
    W, Hc = a['W'], a['Hc']
    alpha_box = union_box([b for b in a['win_boxes']])
    focal_box = shift_box(a['focal']['box'], 0, -a['roof'])
    win_union = (alpha_box[0] - 1, alpha_box[1] - 1, alpha_box[2] + 1, alpha_box[3] + 1)
    m05 = {
        'asset': 'A05 closing street (Inicio band 7)',
        'task': TASK,
        'script': {'file': SCRIPT_REL, 'sha256': script_sha},
        'source': {'file': SRC_M11, 'sha256': SHA_M11, 'width': a['W'], 'height': a['H']},
        'scene': {'width_px': W, 'height_px': Hc, 'aspect': round(W / Hc, 6), 'master_crop': [0, a['roof'], W, a['H']],
                  'note': 'all boxes are fractions (0..1) of the scene frame (rows from the highest roof row to the bottom)'},
        'highest_roof_row': {'master_row': a['roof'], 'fraction_of_master_height': round(a['roof'] / a['H'], 6), 'fraction_of_scene': 0.0},
        'floor_line': round((a['floor_row'] - a['roof']) / Hc, 6),
        'focal_window_box': frac(focal_box, W, Hc),
        'base': {'box': [0.0, 0.0, 1.0, 1.0], **a['base_rec']},
        'light': {
            'box': frac(win_union, W, Hc),
            'window_boxes': [frac(b, W, Hc) for b in a['win_boxes']],
            'pane_boxes': [frac(b, W, Hc) for b in a['pane_boxes']],
            'window_boxes_px_1672': [list(b) for b in a['win_boxes']],
            'alpha_margin_px': 1,
            'tiers': a['tiers'],
            'split': a['stats'],
            'composite_vs_snapped_master': a['composite'],
            'lamp_layer_cap_bytes': LAMP_CAP,
            'cap_open': [c.split(':')[0][2:] for c in a05_caps],
        },
        'served_m11_comparison': a['served_check'],
    }
    write_json(os.path.join(a['folder_pub'], 'a05-rua.MANIFESTO.json'), m05)

    b = ctx['a43']
    W3 = b['W']
    shape_union = union_box([b['line_box'], b['wedge_box']])
    m43 = {
        'asset': 'A43 auth door (acesso)',
        'task': TASK,
        'script': {'file': SCRIPT_REL, 'sha256': script_sha},
        'source': {'file': SRC_10A, 'sha256': SHA_10A, 'width': W3, 'height': b['H']},
        'scene': {'width_px': W3, 'height_px': b['H'], 'aspect': 1.0, 'master_crop': [0, 0, W3, b['H']],
                  'note': 'all boxes are fractions (0..1) of the whole plate'},
        'floor_line': round(b['floor_row'] / b['H'], 6),
        'unlit_neighbours': {'door': hex3(b['door_c']), 'floor': hex3(b['floor_c'])},
        'base': {'box': [0.0, 0.0, 1.0, 1.0], 'tiers': b['base_recs'],
                 'measurements': {'lit_colour_pixels': b['lit_left'], 'lit_colour_rule': 'prep.py is_mel() or R>=0xE8,G>=0xA8,B<=0x70'}},
        'light': {
            'box': frac(shape_union, W3, b['H']),
            'line_box': frac(b['line_box'], W3, b['H']),
            'wedge_box': frac(b['wedge_box'], W3, b['H']),
            'shape_boxes_px_1254': [list(b['line_box']), list(b['wedge_box'])],
            'split_row': b['split_row'],
            'alpha_margin_px': 1,
            'tiers': b['layer_recs'],
            'split': b['stats'],
            'composite_1254_vs_snapped_master': b['composite_1254_vs_snapped'],
            'composite_vs_served': b['comp_checks'],
            'lamp_layer_cap_bytes': LAMP_CAP,
            'cap_open': [c.split(':')[0][2:] for c in a43_caps],
        },
    }
    write_json(os.path.join(b['folder'], 'a43-porta.MANIFESTO.json'), m43)


# ---- evidence ---------------------------------------------------------------------------------------------------------
def pick_tier(tiers, target):
    ok = [t for t in sorted(tiers) if t >= target]
    return ok[0] if ok else max(tiers)


def a05_tier_composite(a, tw):
    th = round(a['Hc'] * tw / a['W'])
    base_t = a['base_rgba'] if tw == a['W'] else a['base_rgba'].convert('RGBa').resize((tw, th), Image.LANCZOS).convert('RGBA')
    return composite_rgb(base_t, a['layer_imgs'][tw], bg=CACAU)


def a43_tier_composite(b, tw):
    return composite_rgb(b['base_tiers'][tw], b['layer_tiers'][tw])


def sheet(images, gap=6, bg=(255, 0, 255), zoom=1):
    w = sum(i.width for i in images) + gap * (len(images) - 1)
    h = max(i.height for i in images)
    out = Image.new('RGB', (w, h), bg)
    x = 0
    for im in images:
        out.paste(im, (x, 0))
        x += im.width + gap
    if zoom != 1:
        out = out.resize((out.width * zoom, out.height * zoom), Image.NEAREST)
    return out


def evidence(args, ctx):
    os.makedirs(args.olhar, exist_ok=True)
    a, b = ctx['a05'], ctx['a43']
    ratios = []
    written = []

    def slot(name, tiers, css_w, css_h, comp_fn):
        for dpr in (2, 3):
            tw_target = css_w * dpr
            tier = pick_tier(tiers, tw_target)
            img = comp_fn(tier)
            out = img.resize((tw_target, round(css_h * dpr)), Image.BICUBIC) if img.size != (tw_target, round(css_h * dpr)) else img
            path = os.path.join(args.olhar, f'{name}_{css_w}css_dpr{dpr}.png')
            out.save(path)
            written.append(path)

    for css_w in (1440, 390):
        css_h = round(a['Hc'] * css_w / a['W'])
        slot('a05', A05_TIERS, css_w, css_h, lambda t: a05_tier_composite(a, t))
        for dpr in (1, 2, 3):
            tier = pick_tier(A05_TIERS, css_w * dpr)
            ratios.append(('A05', css_w, css_h, dpr, tier, tier / (css_w * dpr)))
    for css_w in (720, 390):
        slot('a43', A43_TIERS, css_w, css_w, lambda t: a43_tier_composite(b, t))
        for dpr in (1, 2, 3):
            tier = pick_tier(A43_TIERS, css_w * dpr)
            ratios.append(('A43', css_w, css_w, dpr, tier, tier / (css_w * dpr)))

    # 100% crops: [before | after | base only (unlit)]
    def crop_sheet(name, before, after, base_only, box):
        parts = [im.crop((box[0], box[1], box[2] + 1, box[3] + 1)) for im in (before, after, base_only)]
        s = sheet(parts)
        p100 = os.path.join(args.olhar, f'recorte_{name}_100.png')
        s.save(p100)
        written.append(p100)
        z = os.path.join(args.olhar, f'recorte_{name}_x3.png')
        sheet(parts, zoom=3).save(z)
        written.append(z)

    after_full = a['comp_full']  # the composite at 1672, in the master frame (opaque base)
    # the served M11 crop pasted back into the master frame
    pub = a['folder_pub']
    served_crop = composite_rgb(Image.open(os.path.join(a['folder_src'], 'm11-apagada-542w.webp')).convert('RGBA'),
                                Image.open(os.path.join(pub, 'm11-luz-542w.png')).convert('RGBA'))
    served_full = a['snapped'].copy()
    served_full.paste(served_crop, (1130, 520))
    focal = a['focal']['box']
    pad = 12
    crop_sheet('a05_janela_focal', a['snapped'], after_full, base_full_rgb(a), (focal[0] - pad, focal[1] - pad, focal[2] + pad, focal[3] + pad))
    small = max((w for w in a['windows'] if w['box'][0] >= 1400), key=lambda w: w['box'][0])['box']
    crop_sheet('a05_painel_aceso_servido', served_full, after_full, base_full_rgb(a), (small[0] - pad, small[1] - pad, small[2] + pad, small[3] + pad))
    mid = next(w for w in a['windows'] if w['box'][0] == 279)['box']
    crop_sheet('a05_janela_ambar', a['snapped'], after_full, base_full_rgb(a), (mid[0] - pad, mid[1] - pad, mid[2] + pad, mid[3] + pad))
    served43 = Image.open(os.path.join(b['folder'], 'porta-1254w.webp')).convert('RGB')
    after43 = composite_rgb(b['base_tiers'][1254], b['layer_tiers'][1254])
    crop_sheet('a43_luz_da_porta_esq', served43, after43, b['base_tiers'][1254], (440, 1060, 700, 1253))
    crop_sheet('a43_luz_da_porta_dir', served43, after43, b['base_tiers'][1254], (1000, 1060, 1253, 1253))
    return ratios, written


def base_full_rgb(a):
    """The unlit A05 base on cacau, in the master frame."""
    img = Image.new('RGB', (a['W'], a['H']), CACAU)
    img.paste(composite_rgb(a['base_rgba'], Image.new('RGBA', a['base_rgba'].size, (0, 0, 0, 0)), bg=CACAU), (0, a['roof']))
    return img


def resumo(args, ctx, ratios, written, a05_caps, a43_caps, script_sha):
    a, b = ctx['a05'], ctx['a43']
    L = []
    L.append('# F7a-1 RESUMO: A05 (street) and A43 (door) as layered files')
    L.append('')
    L.append(f'Script `{SCRIPT_REL}` sha256 `{script_sha}`; Pillow {PIL_VERSION}; masters sha256 asserted (M11 `{SHA_M11[:12]}`, 10a `{SHA_10A[:12]}`, prep.py `{SHA_PREP[:12]}`).')
    L.append('')
    L.append(f'**A05 geometry.** Highest non-sky row of the master = {a["roof"]} ({a["roof"] / a["H"]:.4f} x {a["H"]}; the chimney), so the scene frame is {a["W"]}x{a["Hc"]} '
             f'(the card expected about 0.30 x 941 = 282 and 659 rows; the measured row is {a["roof"]}). Floor line at {(a["floor_row"] - a["roof"]) / a["Hc"]:.4f} of the frame. '
             f'Lit windows: {len(a["windows"])}; focal window box {a["focal"]["box"]} (master px).')
    L.append(f'**A05 composite vs token-snapped master** inside the pane boxes: mean abs diff per channel {a["composite"]["inside_boxes_mean_abs_diff"]} (<= 1.0), max {a["composite"]["inside_boxes_max"]} at {a["composite"]["inside_boxes_max_at"]}; outside the boxes the base equals the snapped master exactly. '
             f'Lit-colour pixels left in the base: {a["base_rec"]["measurements"]["lit_colour_pixels"]}.')
    L.append('')
    L.append('| file | bytes | WxH | vs 12,000 B cap |')
    L.append('|---|---|---|---|')
    L.append(f'| a05-rua-fundo-1672w.webp (lossless) | {a["base_rec"]["bytes"]} | {a["base_rec"]["width"]}x{a["base_rec"]["height"]} | n/a (base) |')
    for t in a['tiers']:
        L.append(f'| {t["file"].split("/")[-1]} | {t["bytes"]} | {t["width"]}x{t["height"]} | {"CAP_OPEN, over by " + str(t["bytes"] - LAMP_CAP) if t["over_cap"] else "under"} |')
    for r in b['base_recs']:
        L.append(f'| {r["file"].split("/")[-1]} (q82 m6) | {r["bytes"]} | {r["width"]}x{r["height"]} | n/a (base) |')
    for t in b['layer_recs']:
        L.append(f'| {t["file"].split("/")[-1]} | {t["bytes"]} | {t["width"]}x{t["height"]} | {"CAP_OPEN, over by " + str(t["bytes"] - LAMP_CAP) if t["over_cap"] else "under"} |')
    L.append('')
    L.append(f'cap_open (listed in PROVENANCE.md): A05 {len(a05_caps)} file(s), A43 {len(a43_caps)} file(s).')
    L.append('')
    L.append('**A43 composite (base + light) vs today\'s served porta-<w>w.webp** (mean abs diff per channel over the plate; threshold 2.0):')
    L.append('')
    L.append('| tier | mean R,G,B | max px diff | where (x,y) |')
    L.append('|---|---|---|---|')
    for c in b['comp_checks']:
        L.append(f'| {c["tier"]} | {c["mean_abs_diff_per_channel"]} | {c["max_pixel_diff"]} | {c["max_at"]} |')
    L.append('')
    L.append('**Ratio table** (tier px / device px; below 1.00 the browser upscales):')
    L.append('')
    L.append('| asset | slot css | DPR | tier used | ratio |')
    L.append('|---|---|---|---|---|')
    for (name, cw, ch, dpr, tier, ratio) in ratios:
        L.append(f'| {name} | {cw}x{ch} | {dpr} | {tier}w | {ratio:.2f} |')
    L.append('')
    L.append('A05 1.16 at DPR 1 and 0.58 at DPR 2 at 1440 is the known limit that A07 removes. A43 720 css at DPR 2: 0.87.')
    L.append('')
    L.append('Evidence files in `.oc/olhar/`: ' + ', '.join(os.path.basename(p) for p in written) + '.')
    L.append('')
    L.append('Notes on the result (read them next to the crops):')
    L.append('- A05 focal window: its glass (panes, silhouette, halo) takes the unlit pane colour #18110F in the base, so the unlit window is flat; the silhouette is opaque in the light layer.')
    L.append('- A05 lit windows: the amber AA rows next to each pane are a mix of the lit yellow and the wall colour; they are split into base = #3A302B and a partial-alpha layer pixel (composite equal to the master).')
    L.append('- A43: the master draws a 1 px dark rim (#2B2320 on #3A302B) 2 to 4 px outside the wedge and under the door. It lies outside the shape box +1 px, so it cannot go into the layer under the alpha rule; it stays in the base as drawn (a faint hairline in the unlit state).')
    L.append('- The light layers are heavy because the yellow of the masters carries noise (it is not flat) and nothing is retouched; every layer over 12,000 B is listed as cap_open in PROVENANCE.md.')
    L.append('- Lanczos tails of the lower tiers are cut outside the scaled boxes +1 px (px cut per tier: see the script output and the MANIFESTO.json `tail_px_cut`).')
    L.append('')
    L.append('Validation against the served M11 crop (1130,520,1672,941): ' + json.dumps(a['served_check']))
    write_text(os.path.join(os.path.dirname(os.path.abspath(args.olhar)), 'RESUMO.md'), '\n'.join(L) + '\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mestres', required=True)
    ap.add_argument('--saida', required=True)
    ap.add_argument('--olhar', required=True)
    args = ap.parse_args()
    assert_hash(os.path.join(args.mestres, 'prep.py'), SHA_PREP, 'prep.py')
    check_prep_table(os.path.join(args.mestres, 'prep.py'))
    script_sha = sha256_file(SCRIPT)
    ctx = {}
    build_a05(args, ctx)
    build_a43(args, ctx)
    a05_caps = provenance_a05(ctx, script_sha)
    a43_caps = provenance_a43(ctx, script_sha)
    manifests(ctx, script_sha, a05_caps, a43_caps)
    ratios, written = evidence(args, ctx)
    resumo(args, ctx, ratios, written, a05_caps, a43_caps, script_sha)
    print('[done] files written; evidence in', args.olhar)


if __name__ == '__main__':
    main()
