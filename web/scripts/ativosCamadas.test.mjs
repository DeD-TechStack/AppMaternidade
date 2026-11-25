// node --test web/scripts/ativosCamadas.test.mjs (from the worktree root). F7a-1: the A05 street and the A43 door as layered files.
// Each check reads the COMMITTED files and also runs one negative fixture (a temp dir) through the same helper, so the check
// that passes on the real files is the one proven to reject a bad copy. stdlib only: PNG layers are decoded with node:zlib,
// WebP files are checked by their RIFF headers (format, size, alpha) and by the measurements and sha256 the script records in
// the MANIFESTO.json (node cannot decode a WebP without a dependency).
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'

// ---- The one constant: folders, files, sources ------------------------------------------------------------------------
const REL = (p) => fileURLToPath(new URL(p, import.meta.url))
const PASTA_A05_SRC = REL('../src/assets/cenas/inicio-faixas/')
const PASTA_A05_PUB = REL('../public/cenas/inicio-faixas/')
const PASTA_A43 = REL('../public/cenas/acesso/')
const SCRIPT = REL('./ativos/exportar_camadas.py')
const SCRIPT_REL = 'web/scripts/ativos/exportar_camadas.py'
const SHA_M11 = 'f1d73820c10eb3ee264321c8e6538887e57af61ba8a330eaac5241eb4653f492'
const SHA_10A = '4120836e2626bc66cba05faaa8f99aaabda1b4adbf1eb338838cfeed56d111be'
const TETO_CAMADA = 12000
const LINHA_CAP = /^- (\S+): (\d+) bytes over the 12,000 B lamp-layer cap/

const A05 = {
  nome: 'a05',
  fonteLargura: 1672,
  fonteSha: SHA_M11,
  tiers: [1672, 1170, 780, 390],
  base: 'a05-rua-fundo-1672w.webp',
  luz: (w) => `a05-rua-luz-${w}w.png`,
  manifesto: join(PASTA_A05_PUB, 'a05-rua.MANIFESTO.json'),
  proveniencia: join(PASTA_A05_SRC, 'PROVENANCE.md'),
}
const A43 = {
  nome: 'a43',
  fonteLargura: 1254,
  fonteSha: SHA_10A,
  tiers: [1254, 780, 720, 390],
  base: (w) => `a43-porta-fundo-${w}w.webp`,
  luz: (w) => `a43-porta-luz-${w}w.png`,
  manifesto: join(PASTA_A43, 'a43-porta.MANIFESTO.json'),
  proveniencia: join(PASTA_A43, 'PROVENANCE.md'),
}

const RAIZ_TMP = mkdtempSync(join(tmpdir(), 'ativos-camadas-'))
after(() => rmSync(RAIZ_TMP, { recursive: true, force: true }))
let contador = 0
const pastaTmp = () => {
  contador += 1
  const dir = join(RAIZ_TMP, `caso-${contador}`)
  mkdirSync(dir, { recursive: true })
  return dir
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const lerJson = (caminho) => JSON.parse(readFileSync(caminho, 'utf8'))
const manifestoA05 = () => lerJson(A05.manifesto)
const manifestoA43 = () => lerJson(A43.manifesto)
const clonar = (obj) => JSON.parse(JSON.stringify(obj))
const escapar = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ---- PNG: decoder and a tiny encoder for the fixtures ---------------------------------------------------------------
const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Decodes an 8-bit RGBA non-interlaced PNG; returns { w, h, rgba }. */
function decodificarPng(buf) {
  assert.ok(buf.subarray(0, 8).equals(ASSINATURA_PNG), 'not a PNG')
  let ihdr = null
  const idat = []
  for (let pos = 8; pos < buf.length; ) {
    const tamanho = buf.readUInt32BE(pos)
    const tipo = buf.toString('latin1', pos + 4, pos + 8)
    const dados = buf.subarray(pos + 8, pos + 8 + tamanho)
    if (tipo === 'IHDR') ihdr = dados
    if (tipo === 'IDAT') idat.push(dados)
    pos += 12 + tamanho
  }
  assert.ok(ihdr, 'PNG without IHDR')
  const w = ihdr.readUInt32BE(0)
  const h = ihdr.readUInt32BE(4)
  assert.equal(ihdr[8], 8, 'bit depth must be 8')
  assert.equal(ihdr[9], 6, 'colour type must be 6 (RGBA)')
  assert.equal(ihdr[12], 0, 'must not be interlaced')
  const cru = inflateSync(Buffer.concat(idat))
  const linha = w * 4
  assert.equal(cru.length, (linha + 1) * h, 'decoded size')
  const rgba = Buffer.alloc(linha * h)
  for (let y = 0; y < h; y += 1) {
    const filtro = cru[y * (linha + 1)]
    const de = y * (linha + 1) + 1
    const para = y * linha
    for (let i = 0; i < linha; i += 1) {
      const a = i >= 4 ? rgba[para + i - 4] : 0
      const b = y > 0 ? rgba[para - linha + i] : 0
      const c = i >= 4 && y > 0 ? rgba[para - linha + i - 4] : 0
      let pred
      switch (filtro) {
        case 0: pred = 0; break
        case 1: pred = a; break
        case 2: pred = b; break
        case 3: pred = (a + b) >> 1; break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - c)
          pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
          break
        }
        default: throw new Error(`PNG filter ${filtro}`)
      }
      rgba[para + i] = (cru[de + i] + pred) & 0xff
    }
  }
  return { w, h, rgba }
}

function crc32(b) {
  let c = 0xffffffff
  for (const v of b) {
    c ^= v
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return (c ^ 0xffffffff) >>> 0
}

/** Encodes straight RGBA as a PNG (filter 0). Used only for the fixtures, never for the real assets. */
function codificarPng(w, h, rgba) {
  const pedaco = (tipo, dados) => {
    const corpo = Buffer.concat([Buffer.from(tipo, 'latin1'), dados])
    const ini = Buffer.alloc(4)
    ini.writeUInt32BE(dados.length)
    const fim = Buffer.alloc(4)
    fim.writeUInt32BE(crc32(corpo))
    return Buffer.concat([ini, corpo, fim])
  }
  const cru = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y += 1) rgba.copy(cru, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([ASSINATURA_PNG, pedaco('IHDR', ihdr), pedaco('IDAT', deflateSync(cru)), pedaco('IEND', Buffer.alloc(0))])
}

// ---- WebP: RIFF header reader ----------------------------------------------------------------------------------------
/** Reads the container: chunk list, canvas size, alpha flag. Lossless = a VP8L chunk, lossy = a `VP8 ` chunk. */
function lerWebp(buf) {
  assert.equal(buf.toString('latin1', 0, 4), 'RIFF', 'not a WebP file (RIFF)')
  assert.equal(buf.toString('latin1', 8, 12), 'WEBP', 'not a WebP file (WEBP)')
  const chunks = []
  let largura = null
  let altura = null
  let alfa = false
  for (let pos = 12; pos + 8 <= buf.length; ) {
    const tag = buf.toString('latin1', pos, pos + 4)
    const tamanho = buf.readUInt32LE(pos + 4)
    const dados = pos + 8
    chunks.push(tag)
    if (tag === 'VP8X') {
      alfa = (buf[dados] & 0x10) !== 0
      largura = 1 + buf.readUIntLE(dados + 4, 3)
      altura = 1 + buf.readUIntLE(dados + 7, 3)
    }
    if (tag === 'VP8L') {
      assert.equal(buf[dados], 0x2f, 'VP8L signature')
      const bits = buf.readUInt32LE(dados + 1)
      largura ??= (bits & 0x3fff) + 1
      altura ??= ((bits >>> 14) & 0x3fff) + 1
      alfa ||= ((bits >>> 28) & 1) === 1
    }
    if (tag === 'VP8 ') {
      assert.deepEqual([...buf.subarray(dados + 3, dados + 6)], [0x9d, 0x01, 0x2a], 'VP8 start code')
      largura ??= buf.readUInt16LE(dados + 6) & 0x3fff
      altura ??= buf.readUInt16LE(dados + 8) & 0x3fff
    }
    pos = dados + tamanho + (tamanho & 1)
  }
  return { chunks, lossless: chunks.includes('VP8L'), lossy: chunks.includes('VP8 '), largura, altura, alfa }
}

// ---- Geometry: the boxes the script allows, in each tier -------------------------------------------------------------
/** A box (x0, y0, x1, y1 inclusive, source px) in a tier, padded by `pad` px: the formula the script uses (floor / ceil, clamped). */
function caixaNoTier(b, sx, sy, w, h, pad = 1) {
  return [
    Math.max(0, Math.floor(b[0] * sx) - pad),
    Math.max(0, Math.floor(b[1] * sy) - pad),
    Math.min(w - 1, Math.ceil((b[2] + 1) * sx) - 1 + pad),
    Math.min(h - 1, Math.ceil((b[3] + 1) * sy) - 1 + pad),
  ]
}

/** Pixels with alpha > 0 outside every box (inclusive px); returns the first one found for the message. */
function alfaFora(rgba, w, h, caixas) {
  let fora = 0
  let primeiro = null
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (rgba[(y * w + x) * 4 + 3] === 0) continue
      if (caixas.some((c) => x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3])) continue
      fora += 1
      primeiro ??= [x, y]
    }
  }
  return { fora, primeiro }
}

const camadaDe = (manifesto) => manifesto.light
const caixasPxDe = (manifesto) => manifesto.light.window_boxes_px_1672 ?? manifesto.light.shape_boxes_px_1254

/** Acceptance 2 and 4: every light tier decodes, has the size its record says, and alpha > 0 only inside the boxes +1 px. */
function checarAlfaDentroDasCaixas(manifesto, pastaDosArquivos, ativo) {
  const { width_px: W, height_px: Hc } = manifesto.scene
  const caixas = caixasPxDe(manifesto)
  for (const w of ativo.tiers) {
    const nome = ativo.luz(w)
    const buf = readFileSync(join(pastaDosArquivos, nome))
    const { w: lw, h: lh, rgba } = decodificarPng(buf)
    assert.equal(lw, w, `${nome}: width ${lw}, expected ${w}`)
    assert.equal(lh, Math.round((Hc * w) / W), `${nome}: height ${lh}`)
    const limites = caixas.map((b) => caixaNoTier(b, lw / W, lh / Hc, lw, lh))
    const { fora, primeiro } = alfaFora(rgba, lw, lh, limites)
    assert.equal(fora, 0, `${nome}: ${fora} pixel(s) with alpha > 0 outside the pane boxes +1 px, first at ${primeiro}`)
    const dentro = rgba.reduce((n, v, i) => (i % 4 === 3 && v > 0 ? n + 1 : n), 0)
    assert.ok(dentro > 0, `${nome}: the light layer is empty`)
  }
}

// ---- Provenance (acceptance 5) -----------------------------------------------------------------------------------------
function tamanhoDe(nome, buf) {
  if (nome.endsWith('.png')) {
    const { w, h } = decodificarPng(buf)
    return [w, h]
  }
  const info = lerWebp(buf)
  return [info.largura, info.altura]
}

/** Each file needs a row with its name, sha256, byte count, WxH, the master sha256, the script + its real sha256, scale and encoder. */
function checarProveniencia(arquivoProveniencia, arquivos, fonteSha, shaDoScript) {
  assert.ok(existsSync(arquivoProveniencia), `${arquivoProveniencia} does not exist`)
  const linhas = readFileSync(arquivoProveniencia, 'utf8').split(/\r?\n/)
  for (const { nome, buf } of arquivos) {
    const hash = sha256(buf)
    const [w, h] = tamanhoDe(nome, buf)
    const reNome = new RegExp(`(?<![\\w.-])${escapar(nome)}(?![\\w-])`)
    const linha = linhas.find((l) => reNome.test(l) && l.includes(hash))
    assert.ok(linha, `${nome}: no PROVENANCE.md row with its name and sha256 ${hash}`)
    const resto = linha.replace(reNome, '').replaceAll(hash, '').replaceAll(fonteSha, '').replaceAll(shaDoScript, '')
    assert.match(resto, new RegExp(`(?<![\\d.])${buf.length}(?!\\d)`), `${nome}: row lacks ${buf.length} bytes`)
    assert.match(resto, new RegExp(`(?<!\\d)${w}x${h}(?!\\d)`), `${nome}: row lacks ${w}x${h}`)
    assert.ok(linha.includes(`sha256:${fonteSha}`), `${nome}: row lacks the master sha256`)
    assert.ok(linha.includes(`${SCRIPT_REL} sha256:${shaDoScript}`), `${nome}: row lacks the script and its current sha256`)
    assert.match(linha, /1:1|LANCZOS/, `${nome}: row lacks the scale`)
    assert.match(linha, /WebP|PNG/, `${nome}: row lacks the encoder`)
  }
}

function arquivosA05() {
  return [
    { nome: A05.base, buf: readFileSync(join(PASTA_A05_SRC, A05.base)) },
    ...A05.tiers.map((w) => ({ nome: A05.luz(w), buf: readFileSync(join(PASTA_A05_PUB, A05.luz(w))) })),
  ]
}
function arquivosA43() {
  return A43.tiers.flatMap((w) => [
    { nome: A43.base(w), buf: readFileSync(join(PASTA_A43, A43.base(w))) },
    { nome: A43.luz(w), buf: readFileSync(join(PASTA_A43, A43.luz(w))) },
  ])
}

/** Copies the given files and a PROVENANCE.md (optionally edited) to a fresh temp dir; returns the path of that PROVENANCE.md. */
function proveniencia_tmp(arquivos, origem, editar = (t) => t) {
  const dir = pastaTmp()
  for (const { nome, buf } of arquivos) writeFileSync(join(dir, nome), buf)
  const destino = join(dir, 'PROVENANCE.md')
  writeFileSync(destino, editar(readFileSync(origem, 'utf8')))
  return destino
}

test('F7a-1 provenance: every layer and base has a PROVENANCE.md row (name, sha256, bytes, WxH, source, script sha, scale, encoder)', () => {
  const shaDoScript = sha256(readFileSync(SCRIPT))
  for (const [ativo, arquivos] of [[A05, arquivosA05()], [A43, arquivosA43()]]) {
    checarProveniencia(ativo.proveniencia, arquivos, ativo.fonteSha, shaDoScript)
    // Negative 1: a row removed.
    const alvo = arquivos.at(-1).nome
    const semLinha = proveniencia_tmp(arquivos, ativo.proveniencia, (t) => t.split(/\r?\n/).filter((l) => !l.includes(alvo) || l.startsWith('- ')).join('\n'))
    assert.throws(() => checarProveniencia(semLinha, arquivos, ativo.fonteSha, shaDoScript), new RegExp(`${escapar(alvo)}: no PROVENANCE.md row`))
    // Negative 2: a wrong sha256 in the row of the first file.
    const primeiro = arquivos[0]
    const hash = sha256(primeiro.buf)
    const errado = proveniencia_tmp(arquivos, ativo.proveniencia, (t) => t.replace(hash, `${hash[0] === '0' ? '1' : '0'}${hash.slice(1)}`))
    assert.throws(() => checarProveniencia(errado, arquivos, ativo.fonteSha, shaDoScript), new RegExp(`${escapar(primeiro.nome)}: no PROVENANCE.md row`))
    // Negative 3: the script changed after the rows were written (its sha256 no longer matches).
    assert.throws(() => checarProveniencia(ativo.proveniencia, arquivos, ativo.fonteSha, sha256(Buffer.from('another script'))), /row lacks the script|no PROVENANCE.md row/)
    // Negative 4: the bytes of a file changed (the row still carries the old sha256 and size).
    const mexido = arquivos.map((a, i) => (i === 0 ? { ...a, buf: Buffer.concat([a.buf, Buffer.from([0])]) } : a))
    assert.throws(() => checarProveniencia(ativo.proveniencia, mexido, ativo.fonteSha, shaDoScript), /no PROVENANCE.md row|row lacks/)
  }
  // The rows that were there before stay: the older plates are still recorded.
  const faixas = readFileSync(A05.proveniencia, 'utf8')
  for (const nome of ['m04-faixa-1200w.webp', 'm11-apagada-542w.webp', 'm11-luz-542w.png', 'porta-noite-1254w.webp']) assert.ok(faixas.includes(nome), `${nome} row is gone`)
  const acesso = readFileSync(A43.proveniencia, 'utf8')
  for (const nome of ['porta-390w.webp', 'porta-720w.webp', 'porta-780w.webp', 'porta-1254w.webp']) assert.ok(acesso.includes(nome), `${nome} row is gone`)
})

test('F7a-1 script: the manifests name the sha256 of the committed script', () => {
  const shaDoScript = sha256(readFileSync(SCRIPT))
  assert.equal(manifestoA05().script.sha256, shaDoScript, 'A05 manifest script sha256')
  assert.equal(manifestoA43().script.sha256, shaDoScript, 'A43 manifest script sha256')
  assert.equal(manifestoA05().source.sha256, SHA_M11)
  assert.equal(manifestoA43().source.sha256, SHA_10A)
  const mudado = clonar(manifestoA05())
  mudado.script.sha256 = sha256(Buffer.from('x'))
  assert.notEqual(mudado.script.sha256, shaDoScript)
})

// ---- Light layers: alpha only inside the boxes (acceptance 2 and 4) ---------------------------------------------------
test('F7a-1 light layers: alpha > 0 only inside the pane boxes +1 px, in every tier of A05 and A43', () => {
  checarAlfaDentroDasCaixas(manifestoA05(), PASTA_A05_PUB, A05)
  checarAlfaDentroDasCaixas(manifestoA43(), PASTA_A43, A43)

  // Negative: a copy of the 390 A05 layer with one extra pixel of alpha in the top-left corner.
  const m = manifestoA05()
  const { w, h, rgba } = decodificarPng(readFileSync(join(PASTA_A05_PUB, A05.luz(390))))
  const dir = pastaTmp()
  for (const t of A05.tiers) copyFileSync(join(PASTA_A05_PUB, A05.luz(t)), join(dir, A05.luz(t)))
  const suja = Buffer.from(rgba)
  suja[3] = 255
  writeFileSync(join(dir, A05.luz(390)), codificarPng(w, h, suja))
  assert.throws(() => checarAlfaDentroDasCaixas(m, dir, A05), /a05-rua-luz-390w\.png: 1 pixel\(s\) with alpha > 0 outside the pane boxes/)
  // Negative: the same for A43 (one pixel in the wall, 3 px left of the wedge box at 1254).
  const m43 = manifestoA43()
  const l43 = decodificarPng(readFileSync(join(PASTA_A43, A43.luz(1254))))
  const dir43 = pastaTmp()
  for (const t of A43.tiers) copyFileSync(join(PASTA_A43, A43.luz(t)), join(dir43, A43.luz(t)))
  const suja43 = Buffer.from(l43.rgba)
  suja43[(1100 * l43.w + 300) * 4 + 3] = 7
  writeFileSync(join(dir43, A43.luz(1254)), codificarPng(l43.w, l43.h, suja43))
  assert.throws(() => checarAlfaDentroDasCaixas(m43, dir43, A43), /a43-porta-luz-1254w\.png: 1 pixel\(s\) with alpha > 0 outside/)
  // The boxes the check uses are the manifest's: shrinking the wedge box makes the real layer fail.
  const curto = clonar(m43)
  curto.light.shape_boxes_px_1254[1] = [700, 1100, 800, 1200]
  assert.throws(() => checarAlfaDentroDasCaixas(curto, PASTA_A43, A43), /outside the pane boxes/)
})

// ---- No upscaling (acceptance 5) ---------------------------------------------------------------------------------------
/** No file is wider than its source; the file name, the header and the manifest record agree. */
function checarEscala(ativo, pasta, manifesto, nomesDeBase) {
  const registros = [...manifesto.light.tiers, ...(manifesto.base.tiers ?? [manifesto.base])]
  for (const r of registros) {
    assert.ok(r.scale <= 1, `${r.file}: scale ${r.scale} is over 1`)
    assert.ok(r.width <= ativo.fonteLargura, `${r.file}: ${r.width} px is wider than its source (${ativo.fonteLargura})`)
  }
  const nomes = [...ativo.tiers.map((w) => ativo.luz(w)), ...nomesDeBase]
  for (const nome of nomes) {
    const buf = readFileSync(join(pasta(nome), nome))
    const [w] = tamanhoDe(nome, buf)
    assert.ok(w <= ativo.fonteLargura, `${nome}: header width ${w} is wider than its source (${ativo.fonteLargura})`)
    assert.equal(Number(/-(\d+)w\./.exec(nome)[1]), w, `${nome}: the name says another width than the header (${w})`)
  }
}

test('F7a-1 scale: no tier is wider than its source, in the files and in the manifests', () => {
  checarEscala(A05, (n) => (n.endsWith('.webp') ? PASTA_A05_SRC : PASTA_A05_PUB), manifestoA05(), [A05.base])
  checarEscala(A43, () => PASTA_A43, manifestoA43(), A43.tiers.map((w) => A43.base(w)))
  // Negative 1: a 1700 px wide layer under a 1672 w name (a real file, 1 row tall), then a 1700 name.
  const dir = pastaTmp()
  writeFileSync(join(dir, 'a05-rua-luz-1700w.png'), codificarPng(1700, 1, Buffer.alloc(1700 * 4)))
  const fake = { fonteLargura: 1672, tiers: [1700], luz: (w) => `a05-rua-luz-${w}w.png` }
  const m = clonar(manifestoA05())
  m.light.tiers = []
  m.base = { ...m.base, file: 'x', scale: 1, width: 1672 }
  assert.throws(() => checarEscala(fake, () => dir, m, []), /a05-rua-luz-1700w\.png: header width 1700 is wider than its source \(1672\)/)
  // Negative 2: the manifest records a tier at 1.2 x, or wider than the source.
  const largo = clonar(manifestoA43())
  largo.light.tiers[0].scale = 1.2
  assert.throws(() => checarEscala(A43, () => PASTA_A43, largo, A43.tiers.map((w) => A43.base(w))), /scale 1\.2 is over 1/)
  const largo2 = clonar(manifestoA43())
  largo2.base.tiers[1].width = 1300
  assert.throws(() => checarEscala(A43, () => PASTA_A43, largo2, A43.tiers.map((w) => A43.base(w))), /1300 px is wider than its source/)
  // Negative 3: the name says 780 but the file is 720 wide.
  const nome = join(dir, 'a43-porta-luz-780w.png')
  writeFileSync(nome, codificarPng(720, 1, Buffer.alloc(720 * 4)))
  const f43 = { fonteLargura: 1254, tiers: [780], luz: (w) => `a43-porta-luz-${w}w.png` }
  assert.throws(() => checarEscala(f43, () => dir, { light: { tiers: [] }, base: { scale: 1, width: 1254, file: 'x' } }, []), /name says another width/)
})

// ---- Bases: format, size, sha256 against the manifest, no lit pixel left (acceptance 1 and 3) -------------------------------
/** A05 base: lossless RGBA WebP of the scene frame; the manifest record carries the file sha256 and the measurements. */
function checarBaseA05(manifesto, pastaDaBase) {
  const reg = manifesto.base
  const buf = readFileSync(join(pastaDaBase, A05.base))
  assert.equal(sha256(buf), reg.sha256, `${A05.base}: sha256 differs from the manifest record (the file changed after the measurements)`)
  assert.equal(buf.length, reg.bytes, `${A05.base}: byte count differs from the manifest record`)
  const info = lerWebp(buf)
  assert.ok(info.lossless && !info.lossy, `${A05.base}: not lossless (chunks ${info.chunks})`)
  assert.ok(info.alfa, `${A05.base}: the sky must be transparent (no alpha in the header)`)
  assert.deepEqual([info.largura, info.altura], [manifesto.scene.width_px, manifesto.scene.height_px], `${A05.base}: size`)
  assert.equal(manifesto.scene.height_px, 941 - manifesto.highest_roof_row.master_row, 'base rows run from the highest roof row to the bottom of the master')
  const med = reg.measurements
  assert.equal(med.lit_colour_pixels, 0, `${A05.base}: ${med.lit_colour_pixels} lit-pane-colour pixel(s) recorded in the base`)
  assert.equal(med.warm_pixels, 0, `${A05.base}: ${med.warm_pixels} warm (amber) pixel(s) recorded in the base`)
  assert.ok(med.sky_transparent_pixels > 0, `${A05.base}: no transparent sky recorded`)
  assert.equal(reg.width, manifesto.scene.width_px)
}

/** A43 bases: lossy WebP (q82 m6) of each tier; sha256 and sizes against the record; no lit pixel recorded. */
function checarBasesA43(manifesto, pasta) {
  assert.equal(manifesto.base.measurements.lit_colour_pixels, 0, 'A43 base: lit-pane-colour pixel(s) recorded')
  for (const r of manifesto.base.tiers) {
    const nome = r.file.split('/').at(-1)
    const buf = readFileSync(join(pasta, nome))
    assert.equal(sha256(buf), r.sha256, `${nome}: sha256 differs from the manifest record`)
    assert.equal(buf.length, r.bytes, `${nome}: bytes differ from the manifest record`)
    const info = lerWebp(buf)
    assert.ok(info.lossy && !info.lossless, `${nome}: not a lossy VP8 WebP (chunks ${info.chunks})`)
    assert.deepEqual([info.largura, info.altura], [r.width, r.height], `${nome}: size`)
  }
}

test('F7a-1 bases: format, size, sha256 and the zero lit-pixel record (negative: a lit pixel, a changed file, a wrong format)', () => {
  checarBaseA05(manifestoA05(), PASTA_A05_SRC)
  checarBasesA43(manifestoA43(), PASTA_A43)
  // Negative 1: the record says 3 lit-pane-colour pixels are left in the base.
  const aceso = clonar(manifestoA05())
  aceso.base.measurements.lit_colour_pixels = 3
  assert.throws(() => checarBaseA05(aceso, PASTA_A05_SRC), /3 lit-pane-colour pixel\(s\) recorded/)
  const amber = clonar(manifestoA05())
  amber.base.measurements.warm_pixels = 12
  assert.throws(() => checarBaseA05(amber, PASTA_A05_SRC), /12 warm/)
  // Negative 2: the file differs from the record (one byte appended = a pixel changed after the measurement).
  const dir = pastaTmp()
  writeFileSync(join(dir, A05.base), Buffer.concat([readFileSync(join(PASTA_A05_SRC, A05.base)), Buffer.from([0])]))
  assert.throws(() => checarBaseA05(manifestoA05(), dir), /sha256 differs from the manifest record/)
  // Negative 3: the lossy A43 plate copied in as the A05 base is not lossless.
  const dir2 = pastaTmp()
  copyFileSync(join(PASTA_A43, A43.base(390)), join(dir2, A05.base))
  const medido = clonar(manifestoA05())
  medido.base.sha256 = sha256(readFileSync(join(dir2, A05.base)))
  medido.base.bytes = readFileSync(join(dir2, A05.base)).length
  assert.throws(() => checarBaseA05(medido, dir2), /not lossless/)
  // Negative 4: an A43 base whose sha256 no longer matches.
  const dir3 = pastaTmp()
  for (const w of A43.tiers) copyFileSync(join(PASTA_A43, A43.base(w)), join(dir3, A43.base(w)))
  const b = readFileSync(join(dir3, A43.base(720)))
  b[b.length - 1] ^= 0xff
  writeFileSync(join(dir3, A43.base(720)), b)
  assert.throws(() => checarBasesA43(manifestoA43(), dir3), /a43-porta-fundo-720w\.webp: sha256 differs/)
  // Negative 5: a file that is not a WebP.
  assert.throws(() => lerWebp(Buffer.from('not a webp at all, just text')), /not a WebP/)
})

// ---- Composite measurements (acceptance 2 and 4) -----------------------------------------------------------------------
function checarComposicao(m05, m43) {
  const a = m05.light.composite_vs_snapped_master
  assert.ok(a.inside_boxes_mean_abs_diff.every((v) => v <= 1.0), `A05 composite mean abs diff ${a.inside_boxes_mean_abs_diff} is over 1.0 inside the pane boxes`)
  assert.equal(a.outside_boxes_differing_samples, 0, 'A05 base differs from the snapped master outside the pane boxes')
  const comparacoes = m43.light.composite_vs_served
  assert.deepEqual(comparacoes.map((c) => c.tier), A43.tiers, 'A43: one composite comparison per tier')
  for (const c of comparacoes) {
    assert.ok(c.mean_abs_diff_per_channel.every((v) => v <= 2.0), `A43 ${c.tier}w composite mean abs diff ${c.mean_abs_diff_per_channel} is over 2.0`)
    assert.equal(typeof c.max_pixel_diff, 'number', `A43 ${c.tier}w: max pixel diff not recorded`)
    assert.ok(Array.isArray(c.max_at) && c.max_at.length === 2, `A43 ${c.tier}w: where the max is not recorded`)
  }
}

test('F7a-1 composites: A05 inside the pane boxes <= 1.0 and A43 against today\'s porta files <= 2.0 per channel', () => {
  checarComposicao(manifestoA05(), manifestoA43())
  const m05 = clonar(manifestoA05())
  m05.light.composite_vs_snapped_master.inside_boxes_mean_abs_diff = [0.2, 1.4, 0.1]
  assert.throws(() => checarComposicao(m05, manifestoA43()), /over 1\.0/)
  const m05b = clonar(manifestoA05())
  m05b.light.composite_vs_snapped_master.outside_boxes_differing_samples = 5
  assert.throws(() => checarComposicao(m05b, manifestoA43()), /outside the pane boxes/)
  const m43 = clonar(manifestoA43())
  m43.light.composite_vs_served[2].mean_abs_diff_per_channel = [0.1, 2.3, 0.1]
  assert.throws(() => checarComposicao(manifestoA05(), m43), /720w composite mean abs diff .* over 2\.0/)
  const m43b = clonar(manifestoA43())
  delete m43b.light.composite_vs_served[0].max_at
  assert.throws(() => checarComposicao(manifestoA05(), m43b), /where the max is not recorded/)
})

// ---- Manifests: fractions, aspect, floor line, focal window, highest roof row (acceptance 5) ---------------------------------
function ehCaixaFracao(c, nome) {
  assert.ok(Array.isArray(c) && c.length === 4 && c.every((v) => typeof v === 'number' && v >= 0 && v <= 1), `${nome}: not four fractions in 0..1`)
  assert.ok(c[0] < c[2] && c[1] < c[3], `${nome}: empty box`)
}

function checarManifesto(m, tipo) {
  assert.ok(Math.abs(m.scene.aspect - m.scene.width_px / m.scene.height_px) < 1e-5, 'scene aspect')
  assert.ok(m.floor_line > 0 && m.floor_line < 1, 'floor_line must be a fraction in 0..1')
  ehCaixaFracao(m.base.box, 'base.box')
  ehCaixaFracao(m.light.box, 'light.box')
  if (tipo === 'a05') {
    ehCaixaFracao(m.focal_window_box, 'focal_window_box')
    assert.ok(m.light.window_boxes.length >= 5, 'every lit window needs a box')
    for (const [i, c] of m.light.window_boxes.entries()) ehCaixaFracao(c, `window_boxes[${i}]`)
    for (const [i, c] of m.light.pane_boxes.entries()) ehCaixaFracao(c, `pane_boxes[${i}]`)
    const r = m.highest_roof_row
    assert.ok(r.fraction_of_master_height > 0.2 && r.fraction_of_master_height < 0.4, `highest roof row fraction ${r.fraction_of_master_height}`)
    assert.ok(Math.abs(r.fraction_of_master_height - r.master_row / 941) < 1e-5, 'roof row fraction vs row')
    const f = m.focal_window_box
    assert.ok(m.light.window_boxes.some((c) => c.every((v, i) => Math.abs(v - f[i]) < 1e-6)), 'the focal window is one of the lit window boxes')
  } else {
    ehCaixaFracao(m.light.line_box, 'line_box')
    ehCaixaFracao(m.light.wedge_box, 'wedge_box')
    assert.equal(m.scene.aspect, 1)
  }
}

test('F7a-1 manifests: aspect, boxes as fractions, floor line, focal window and highest roof row', () => {
  checarManifesto(manifestoA05(), 'a05')
  checarManifesto(manifestoA43(), 'a43')
  const a = clonar(manifestoA05())
  a.focal_window_box = [0.5, 0.2, 1.2, 0.8]
  assert.throws(() => checarManifesto(a, 'a05'), /focal_window_box: not four fractions in 0\.\.1/)
  const b = clonar(manifestoA05())
  delete b.floor_line
  assert.throws(() => checarManifesto(b, 'a05'), /floor_line/)
  const c = clonar(manifestoA05())
  c.highest_roof_row.fraction_of_master_height = 0.9
  assert.throws(() => checarManifesto(c, 'a05'), /highest roof row fraction/)
  const d = clonar(manifestoA43())
  d.light.wedge_box = [0.4, 0.9, 0.3, 0.97]
  assert.throws(() => checarManifesto(d, 'a43'), /wedge_box: empty box/)
})

// ---- Lamp-layer cap: over-cap layers are listed as cap_open, never hidden (acceptance 5) ------------------------------------
function capAberto(arquivoProveniencia) {
  const abertos = new Map()
  const linhas = readFileSync(arquivoProveniencia, 'utf8').split(/\r?\n/)
  const inicio = linhas.findIndex((l) => l.trim() === '## cap_open')
  if (inicio < 0) return abertos
  for (const linha of linhas.slice(inicio + 1)) {
    if (linha.trim() === '') continue
    const m = LINHA_CAP.exec(linha) ?? /^- (\S+): (\d+) bytes over the /.exec(linha)
    if (!m) break
    abertos.set(m[1], Number(m[2]))
  }
  return abertos
}

/** A light layer over the cap needs a cap_open line with exactly its bytes; a layer under it must not be listed. */
function checarCapDasCamadas(pasta, nomes, arquivoProveniencia) {
  const abertos = capAberto(arquivoProveniencia)
  for (const nome of nomes) {
    const bytes = readFileSync(join(pasta, nome)).length
    if (bytes > TETO_CAMADA) {
      assert.equal(abertos.get(nome), bytes, `${nome}: ${bytes} bytes is over the ${TETO_CAMADA} cap and PROVENANCE.md cap_open says ${abertos.get(nome)}`)
    } else {
      assert.ok(!abertos.has(nome), `${nome}: ${bytes} bytes is under the cap but is listed as cap_open`)
    }
  }
}

test('F7a-1 lamp-layer cap: every layer over 12,000 B is a cap_open line with its exact bytes, and the manifests list the same files', () => {
  checarCapDasCamadas(PASTA_A05_PUB, A05.tiers.map((w) => A05.luz(w)), A05.proveniencia)
  checarCapDasCamadas(PASTA_A43, A43.tiers.map((w) => A43.luz(w)), A43.proveniencia)
  const sobre = (pasta, ativo) => ativo.tiers.map((w) => ativo.luz(w)).filter((n) => readFileSync(join(pasta, n)).length > TETO_CAMADA)
  assert.deepEqual(manifestoA05().light.cap_open, sobre(PASTA_A05_PUB, A05), 'A05 manifest cap_open')
  assert.deepEqual(manifestoA43().light.cap_open, sobre(PASTA_A43, A43), 'A43 manifest cap_open')
  // The existing parser of ativosInicio.test.mjs (`## cap_open`, lines `- name: N bytes over the ...`) reads the new section whole.
  for (const arq of [A05.proveniencia, A43.proveniencia]) {
    const linhas = readFileSync(arq, 'utf8').split(/\r?\n/)
    const inicio = linhas.findIndex((l) => l.trim() === '## cap_open')
    if (inicio >= 0) for (const l of linhas.slice(inicio + 1).filter((x) => x.trim() !== '')) assert.match(l, /^- (\S+): (\d+) bytes over the /, `cap_open line ${l}`)
  }
  // Negative: a 12,001 B layer with no line, with a wrong count, and with the right one; a 12,000 B layer listed anyway.
  const dir = pastaTmp()
  writeFileSync(join(dir, 'x-luz-1w.png'), Buffer.alloc(12001))
  writeFileSync(join(dir, 'y-luz-2w.png'), Buffer.alloc(12000))
  const prov = join(dir, 'PROVENANCE.md')
  writeFileSync(prov, '# x\n')
  assert.throws(() => checarCapDasCamadas(dir, ['x-luz-1w.png'], prov), /x-luz-1w\.png: 12001 bytes is over the 12000 cap and PROVENANCE.md cap_open says undefined/)
  writeFileSync(prov, '# x\n\n## cap_open\n\n- x-luz-1w.png: 12002 bytes over the 12,000 B lamp-layer cap (x)\n')
  assert.throws(() => checarCapDasCamadas(dir, ['x-luz-1w.png'], prov), /cap_open says 12002/)
  writeFileSync(prov, '# x\n\n## cap_open\n\n- x-luz-1w.png: 12001 bytes over the 12,000 B lamp-layer cap (x)\n')
  checarCapDasCamadas(dir, ['x-luz-1w.png'], prov)
  writeFileSync(prov, '# x\n\n## cap_open\n\n- x-luz-1w.png: 12001 bytes over the 12,000 B lamp-layer cap (x)\n- y-luz-2w.png: 12000 bytes over the 12,000 B lamp-layer cap (x)\n')
  assert.throws(() => checarCapDasCamadas(dir, ['x-luz-1w.png', 'y-luz-2w.png'], prov), /y-luz-2w\.png: 12000 bytes is under the cap but is listed/)
})

// The decoder reads what the encoder writes: the fixtures above rest on it.
test('F7a-1 test helpers: the PNG encoder and decoder round-trip, and the WebP reader reads a real header', () => {
  const rgba = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
  const volta = decodificarPng(codificarPng(2, 2, rgba))
  assert.deepEqual([volta.w, volta.h, [...volta.rgba]], [2, 2, [...rgba]])
  const real = lerWebp(readFileSync(join(PASTA_A43, A43.base(390))))
  assert.deepEqual([real.largura, real.altura, real.lossy], [390, 390, true])
  assert.deepEqual(clonar(manifestoA05()).scene.width_px, 1672)
})
