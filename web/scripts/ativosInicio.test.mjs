// node --test web/scripts/ativosInicio.test.mjs (from the worktree root). Probes AST1-I-03, -04, -06, -07, -09, -10.
// Each probe reads the COMMITTED files under web/public and also runs one negative fixture (a temp dir) through the
// same helper, so the check that passes on the real files is the one proven to reject a bad copy.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'

// ---- The one constant: caps, file lists and folders ---------------------------------------------------------------
const PASTA = (rel) => fileURLToPath(new URL(`../public/${rel}/`, import.meta.url))
const PASTAS = { cenas: PASTA('cenas/inicio'), molduras: PASTA('molduras'), telas: PASTA('telas/casa') }
const ATIVOS = {
  placas: {
    'm05-sol-1672w.webp': 38600,
    'm05-sol-900w.webp': 19500,
    'm05-sol-390c-780w.webp': 23600,
    'm05-sol-390c-390w.webp': 10400,
    'm06-apagada-792w.webp': 30700,
    'm06-apagada-396w.webp': 14100,
    'm06-apagada-600w.webp': 17500,
    'm06-apagada-300w.webp': 8250,
    'm04-recorte-1200w.webp': 27400,
    'm04-recorte-600w.webp': 12500,
    'm04-recorte-700w.webp': 14650,
    'm04-recorte-350w.webp': 7200,
  },
  // Layer names without extension: the file may be .png or .webp, exactly one of them exists.
  camadas: [
    'm05-luz-900w',
    'm05-luz-1672w',
    'm05-luz-390c-390w',
    'm05-luz-390c-780w',
    'm06-luz-300w',
    'm06-luz-396w',
    'm06-luz-600w',
    'm06-luz-792w',
  ],
  tetoCamada: 12000,
  // Lamp layers that `/` loads together, per viewport and DPR.
  somaCamadas: {
    'DPR 2 on 1440': ['m05-luz-1672w', 'm06-luz-792w'],
    'DPR 1 on 1440': ['m05-luz-900w', 'm06-luz-396w'],
    'DPR 2 on 390': ['m05-luz-390c-780w', 'm06-luz-600w'],
    'DPR 1 on 390': ['m05-luz-390c-390w', 'm06-luz-300w'],
  },
  tetoSomaCamadas: 25000,
  molduras: ['moldura-dia.png', 'moldura-noite.png'],
  tetoMoldura: 1000,
  capturas: {
    'historico-y-640w.webp': 34000,
    'historico-y-560w.webp': 34000,
    'hoje-n-640w.webp': 34000,
    'hoje-n-560w.webp': 34000,
    'historico-y-alta-640w.webp': 35000,
    'historico-y-alta-560w.webp': 35000,
  },
  tetoPagina1440Dpr2: 197000,
}
const MANIFESTO = join(PASTAS.telas, 'MANIFESTO.json')

const RAIZ_TMP = mkdtempSync(join(tmpdir(), 'ativos-inicio-'))
after(() => rmSync(RAIZ_TMP, { recursive: true, force: true }))
let contador = 0
const pastaTmp = () => {
  contador += 1
  const dir = join(RAIZ_TMP, `caso-${contador}`)
  mkdirSync(dir, { recursive: true })
  return dir
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

// ---- Manifest helpers (I-03, I-04, I-06) --------------------------------------------------------------------------
function lerManifesto(caminho) {
  return JSON.parse(readFileSync(caminho, 'utf8'))
}

function entradaDe(manifesto, id) {
  const e = manifesto.capturas?.find((c) => c.id === id)
  assert.ok(e, `manifest has no entry with id ${id}`)
  return e
}

function linhaCom(e, ...padroes) {
  return e.linhas_topo.some((l) => typeof l === 'string' && padroes.every((p) => p.test(l)))
}

function checarCelular(e, viewport, largura, altura) {
  assert.equal(e.viewport, viewport)
  assert.equal(e.dpr, 2)
  assert.equal(e.toque, true)
  assert.equal(e.png.largura, largura)
  assert.equal(e.png.altura, altura)
}

function checarY(e) {
  assert.equal(e.estado, 'Y')
  assert.equal(e.rota, '/app/historico')
  assert.equal(e.caminho_final, '/app/historico')
  assert.ok(e.h1.includes('Histórico'), `h1 "${e.h1}" lacks Histórico`)
  assert.ok(!e.h1.includes('Entrar'), `h1 "${e.h1}" is the sign-in heading`)
  assert.ok(e.tema === 'claro' || e.tema === 'madrugada', `tema ${e.tema}`)
  checarCelular(e, '390x844', 780, 1688)
  assert.ok(Array.isArray(e.linhas_topo), 'linhas_topo must be an array')
  assert.ok(linhaCom(e, /16:00/, /mamada/i, /Ju/), 'no 16:00 mamada Ju row in the top 292 px')
  assert.ok(linhaCom(e, /17:30/, /Ícaro/), 'no 17:30 Ícaro row in the top 292 px')
  checarFonte(e)
}

/** The hour row is >= 12 px at 280 wide, or the shortfall is an accepted open item recorded as `a42_aberto` (leader 18/11). */
function checarFonte(e) {
  const em280 = (e.fonte_px_linha * 280) / 390
  if (em280 >= 12) return
  const arredondado = Math.round(em280 * 100) / 100
  assert.equal(e.a42_aberto?.['390'], arredondado, `row font ${e.fonte_px_linha}px is ${arredondado}px at 280 wide (< 12) and a42_aberto does not record it`)
}

function checarN(e) {
  assert.equal(e.estado, 'N')
  assert.equal(e.rota, '/app/hoje')
  assert.equal(e.caminho_final, '/app/hoje')
  assert.ok(e.h1.includes('Hoje'), `h1 "${e.h1}" lacks Hoje`)
  assert.equal(e.tema, 'madrugada')
  checarCelular(e, '390x844', 780, 1688)
  assert.ok(e.instante.includes('21:42'), `instante ${e.instante}`)
  assert.ok(Array.isArray(e.linhas_topo), 'linhas_topo must be an array')
  assert.ok(linhaCom(e, /20:30/, /Ícaro/), 'no 20:30 Ícaro row in the top 292 px')
}

function checarYAlta(manifesto) {
  const y = entradaDe(manifesto, 'Y')
  const alta = entradaDe(manifesto, 'Y_ALTA')
  assert.equal(alta.estado, 'Y')
  for (const campo of ['rota', 'tema', 'fixture', 'rolagem_px']) {
    assert.deepEqual(alta[campo], y[campo], `Y_ALTA.${campo} differs from Y`)
  }
  checarCelular(alta, '390x1234', 780, 2468)
  // The tall state scrolls upward by at most offset_y_px (scaled to the viewport), capped at 320 / 280 px.
  assert.equal(alta.direcao_rolagem, 'para_cima', 'Y_ALTA.direcao_rolagem must be para_cima')
  assert.equal(typeof alta.offset_y_px, 'number', 'Y_ALTA.offset_y_px must be a number')
  assert.deepEqual(alta.rolagem_px, {
    1440: Math.min(Math.round((alta.offset_y_px * 320) / 390), 320),
    390: Math.min(Math.round((alta.offset_y_px * 280) / 390), 280),
  })
  // Y_ALTA lists every visible row: Y's rows must all be among them.
  assert.ok(Array.isArray(alta.linhas_topo) && Array.isArray(y.linhas_topo), 'linhas_topo must be arrays')
  for (const linha of y.linhas_topo) {
    assert.ok(alta.linhas_topo.includes(linha), `Y row "${linha}" is missing from Y_ALTA linhas_topo`)
  }
  // Scroll at the page maximum: the document height minus the 1234 px viewport.
  assert.equal(alta.scroll_y, alta.altura_documento - 1234, 'Y_ALTA.scroll_y is not at the page maximum')
}

/** A known-good synthetic manifest: the negative fixtures mutate it, so a rejection is the mutation's doing. */
function manifestoBom() {
  const linhas = ['16:00 mamada Ju', '17:30 troca Ícaro']
  const comum = { fixture: 'casa', dpr: 2, toque: true, rolagem_px: { 1440: 320, 390: 280 }, fonte_px_linha: 17 }
  return {
    capturas: [
      { id: 'Y', estado: 'Y', rota: '/app/historico', caminho_final: '/app/historico', h1: 'Histórico', tema: 'claro',
        viewport: '390x844', png: { largura: 780, altura: 1688 }, linhas_topo: linhas, ...comum,
        scroll_y: 280, altura_documento: 2993, offset_y_px: 88, direcao_rolagem: 'para_cima' },
      { id: 'Y_ALTA', estado: 'Y', rota: '/app/historico', caminho_final: '/app/historico', h1: 'Histórico', tema: 'claro',
        viewport: '390x1234', png: { largura: 780, altura: 2468 }, ...comum,
        linhas_topo: [...linhas, '19:10 sono Ju'], scroll_y: 1759, altura_documento: 2993, offset_y_px: 473,
        direcao_rolagem: 'para_cima' },
      { id: 'N', estado: 'N', rota: '/app/hoje', caminho_final: '/app/hoje', h1: 'Hoje', tema: 'madrugada',
        viewport: '390x844', png: { largura: 780, altura: 1688 }, instante: '2026-11-18T21:42:00',
        linhas_topo: ['20:30 Ícaro mamada'], ...comum, rolagem_px: null },
    ],
  }
}

/** Writes a mutated copy of the good manifest to a temp dir and reads it back through the same loader. */
function manifestoMutado(mutar) {
  const m = manifestoBom()
  mutar(m)
  const arquivo = join(pastaTmp(), 'MANIFESTO.json')
  writeFileSync(arquivo, JSON.stringify(m))
  return lerManifesto(arquivo)
}

test('AST1-I-03 state Y: the history screen at 390x844 shows the 16:00 and 17:30 rows in the top 292 px', () => {
  checarY(entradaDe(manifestoBom(), 'Y'))
  const sem1730 = manifestoMutado((m) => {
    m.capturas[0].linhas_topo = m.capturas[0].linhas_topo.filter((l) => !l.includes('17:30'))
  })
  assert.throws(() => checarY(entradaDe(sem1730, 'Y')), /17:30/)
  // A 15 px hour row (10.77 px at 280 wide) passes only with the matching a42_aberto record.
  const quinze = (a42) => manifestoMutado((m) => {
    m.capturas[0].fonte_px_linha = 15
    if (a42 !== undefined) m.capturas[0].a42_aberto = { 390: a42 }
  })
  assert.throws(() => checarY(entradaDe(quinze(undefined), 'Y')), /a42_aberto/)
  assert.throws(() => checarY(entradaDe(quinze(10.7), 'Y')), /a42_aberto/)
  checarY(entradaDe(quinze(10.77), 'Y'))
  checarY(entradaDe(lerManifesto(MANIFESTO), 'Y'))
})

test('AST1-I-04 state N: the Hoje screen in madrugada at 21:42 shows the 20:30 Ícaro row', () => {
  checarN(entradaDe(manifestoBom(), 'N'))
  const claro = manifestoMutado((m) => {
    m.capturas[2].tema = 'claro'
  })
  assert.throws(() => checarN(entradaDe(claro, 'N')))
  checarN(entradaDe(lerManifesto(MANIFESTO), 'N'))
})

test('AST1-I-06 Y_ALTA: same route, theme, fixture, scroll and rows as Y, 390x1234 at dpr 2', () => {
  checarYAlta(manifestoBom())
  const baixa = manifestoMutado((m) => {
    m.capturas[1].viewport = '390x1100'
  })
  assert.throws(() => checarYAlta(baixa), /390x1100/)
  const sem1730 = manifestoMutado((m) => {
    m.capturas[1].linhas_topo = m.capturas[1].linhas_topo.filter((l) => !l.includes('17:30'))
  })
  assert.throws(() => checarYAlta(sem1730), /17:30/)
  const rolagemErrada = manifestoMutado((m) => {
    m.capturas[1].scroll_y += 1
  })
  assert.throws(() => checarYAlta(rolagemErrada), /page maximum/)
  const rolagemGrande = manifestoMutado((m) => {
    m.capturas[1].rolagem_px = { 1440: 400, 390: 280 }
    m.capturas[0].rolagem_px = { 1440: 400, 390: 280 }
  })
  assert.throws(() => checarYAlta(rolagemGrande))
  const outraDirecao = manifestoMutado((m) => {
    m.capturas[1].direcao_rolagem = 'para_baixo'
  })
  assert.throws(() => checarYAlta(outraDirecao), /para_cima/)
  const semDirecao = manifestoMutado((m) => {
    delete m.capturas[1].direcao_rolagem
  })
  assert.throws(() => checarYAlta(semDirecao), /para_cima/)
  // A Y budget that differs from Y_ALTA's is rejected too.
  const yDiferente = manifestoMutado((m) => {
    m.capturas[0].rolagem_px = { 1440: 100, 390: 90 }
  })
  assert.throws(() => checarYAlta(yDiferente), /rolagem_px differs from Y/)
  checarYAlta(lerManifesto(MANIFESTO))
})

// ---- PNG decoder (I-07) -------------------------------------------------------------------------------------------
const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Decodes an 8-bit RGBA non-interlaced PNG of exactly w x h; throws on anything else. */
function decodificarPng(buf, w, h) {
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
  assert.equal(ihdr.readUInt32BE(0), w, 'PNG width')
  assert.equal(ihdr.readUInt32BE(4), h, 'PNG height')
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
  return rgba
}

const MOLDURA = { w: 678, h: 1423, buraco: { x0: 38, x1: 639, y0: 38, y1: 1384 } }  // inclusive; 19 px bezel + 19 px inset keeps the radius-56 corner arcs out
const CORPOS = { 'moldura-dia.png': [0x2b, 0x23, 0x20], 'moldura-noite.png': [0x6e, 0x65, 0x60] }

/** Frame pixels: hole fully clear, body strips opaque in the body colour, outer corner clear. */
function checarMoldura(rgba, corpo) {
  const px = (x, y) => (y * MOLDURA.w + x) * 4
  const { x0, x1, y0, y1 } = MOLDURA.buraco
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      assert.equal(rgba[px(x, y) + 3], 0, `hole pixel (${x},${y}) is not clear`)
    }
  }
  const faixa = Array.from({ length: 18 }, (_, i) => (i < 9 ? i : 660 + i))
  for (const x of faixa) {
    const i = px(x, 711)
    assert.equal(rgba[i + 3], 255, `body pixel (${x},711) is not opaque`)
    assert.deepEqual([...rgba.subarray(i, i + 3)], corpo, `body pixel (${x},711) colour`)
  }
  assert.equal(rgba[px(0, 0) + 3], 0, 'outer corner (0,0) must be clear')
  assert.deepEqual([...rgba.subarray(px(9, 711), px(9, 711) + 3)], corpo, 'pixel (9,711) is not body colour')
}

function lerMoldura(caminho, h = MOLDURA.h) {
  return decodificarPng(readFileSync(caminho), MOLDURA.w, h)
}

/** A synthetic frame PNG of any height, for the positive and negative fixtures (it is not the real asset). */
function criarMolduraPng(h, corpo) {
  const { w } = MOLDURA
  const { x0, x1, y0, y1 } = { x0: 19, x1: 658, y0: 19, y1: 1403 }
  const cru = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const clara = (x >= x0 && x <= x1 && y >= y0 && y <= y1) || x + y < 10
      const i = y * (w * 4 + 1) + 1 + x * 4
      cru.set(clara ? [0, 0, 0, 0] : [...corpo, 255], i)
    }
  }
  const crc = (b) => {
    let c = 0xffffffff
    for (const v of b) {
      c ^= v
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    return (c ^ 0xffffffff) >>> 0
  }
  const pedaco = (tipo, dados) => {
    const corpoP = Buffer.concat([Buffer.from(tipo, 'latin1'), dados])
    const ini = Buffer.alloc(4)
    ini.writeUInt32BE(dados.length)
    const fim = Buffer.alloc(4)
    fim.writeUInt32BE(crc(corpoP))
    return Buffer.concat([ini, corpoP, fim])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([ASSINATURA_PNG, pedaco('IHDR', ihdr), pedaco('IDAT', deflateSync(cru)), pedaco('IEND', Buffer.alloc(0))])
}

/** Files the folder's PROVENANCE.md records under `## cap_open` (frames, captures): file name -> measured byte count. */
function capAbertoDaPasta(pasta) {
  const caminho = join(pasta, 'PROVENANCE.md')
  const abertos = new Map()
  if (!existsSync(caminho)) return abertos
  const linhas = readFileSync(caminho, 'utf8').split(/\r?\n/)
  const inicio = linhas.findIndex((l) => l.trim() === '## cap_open')
  if (inicio < 0) return abertos
  for (const linha of linhas.slice(inicio + 1)) {
    if (linha.trim() === '') continue
    const m = /^- (\S+): (\d+) bytes over the /.exec(linha)
    if (!m) break
    abertos.set(m[1], Number(m[2]))
  }
  return abertos
}

/** A frame or capture is at most `teto` bytes, or over it only with a cap_open line carrying exactly its measured bytes. */
function checarBytesCapAberto(pasta, nome, teto) {
  const bytes = statSync(join(pasta, nome)).size
  if (bytes <= teto) return
  const registrado = capAbertoDaPasta(pasta).get(nome)
  assert.equal(registrado, bytes, `${nome}: ${bytes} bytes is over the ${teto} cap and PROVENANCE.md cap_open says ${registrado}`)
}

test('AST1-I-07 frames: 678x1423 RGBA, clear screen hole, opaque body strip in the body colour', () => {
  const corpo = CORPOS['moldura-dia.png']
  const dir = pastaTmp()
  const boa = join(dir, 'boa.png')
  writeFileSync(boa, criarMolduraPng(MOLDURA.h, corpo))
  checarMoldura(lerMoldura(boa), corpo)
  // Negative 1: the same frame at 678x1422 is rejected by the decoder.
  const curta = join(dir, 'curta.png')
  writeFileSync(curta, criarMolduraPng(1422, corpo))
  assert.throws(() => lerMoldura(curta), /PNG height/)
  // Negative 2: one opaque pixel inside the hole is rejected by the pixel check.
  const suja = lerMoldura(boa)
  suja[(700 * MOLDURA.w + 300) * 4 + 3] = 255
  assert.throws(() => checarMoldura(suja, corpo), /hole pixel \(300,700\)/)
  // Negative 3: a 1,001 B frame without a cap_open line fails; with a line carrying exactly its bytes it passes; a wrong count fails.
  const pesada = pastaTmp()
  writeFileSync(join(pesada, 'moldura-dia.png'), Buffer.alloc(1001))
  assert.throws(() => checarBytesCapAberto(pesada, 'moldura-dia.png', ATIVOS.tetoMoldura), /over the 1000 cap/)
  const linhaAberta = (n) => `## cap_open\n\n- moldura-dia.png: ${n} bytes over the 1,000 B cap (measured minimum lossless encoding)\n`
  writeFileSync(join(pesada, 'PROVENANCE.md'), `# x\n\n${linhaAberta(1002)}`)
  assert.throws(() => checarBytesCapAberto(pesada, 'moldura-dia.png', ATIVOS.tetoMoldura), /cap_open says 1002/)
  writeFileSync(join(pesada, 'PROVENANCE.md'), `# x\n\n${linhaAberta(1001)}`)
  checarBytesCapAberto(pesada, 'moldura-dia.png', ATIVOS.tetoMoldura)
  for (const nome of Object.keys(CORPOS)) {
    checarMoldura(lerMoldura(join(PASTAS.molduras, nome)), CORPOS[nome])
    checarBytesCapAberto(PASTAS.molduras, nome, ATIVOS.tetoMoldura)
  }
})

// ---- Byte caps (I-09) ---------------------------------------------------------------------------------------------
/** The layer file name with its extension: exactly one of .png / .webp must exist. */
function arquivoDaCamada(pasta, base) {
  const achados = ['.png', '.webp'].filter((ext) => existsSync(join(pasta, base + ext)))
  assert.equal(achados.length, 1, `${base}: expected exactly one of .png/.webp, found ${achados.length}`)
  return base + achados[0]
}

/**
 * Layers the folder's PROVENANCE.md lists under "Not served (over the 12,000 B lamp-layer cap)" (cap_open, not shipped).
 * Each must be absent from the folder (neither .png nor .webp) and must be a known layer; returns their base names.
 */
function camadasAusentes(pasta) {
  const caminho = join(pasta, 'PROVENANCE.md')
  const ausentes = new Set()
  if (!existsSync(caminho)) return ausentes
  const linhas = readFileSync(caminho, 'utf8').split(/\r?\n/)
  const inicio = linhas.findIndex((l) => l.startsWith('Not served (over the 12,000 B lamp-layer cap)'))
  if (inicio < 0) return ausentes
  for (const linha of linhas.slice(inicio + 1)) {
    if (linha.trim() === '') continue
    const m = /^- `([^`]+)`/.exec(linha)
    if (!m) break
    const base = m[1].replace(/\.(png|webp)$/, '')
    assert.ok(ATIVOS.camadas.includes(base), `${m[1]}: listed as not served but it is not a known lamp layer`)
    for (const ext of ['.png', '.webp']) {
      assert.ok(!existsSync(join(pasta, base + ext)), `${base + ext}: listed as not served but present in the folder`)
    }
    ausentes.add(base)
  }
  return ausentes
}

/** Bytes of a served layer; a layer listed as not served counts 0. */
function bytesDaCamada(pasta, base, ausentes = new Set()) {
  if (ausentes.has(base)) return 0
  return statSync(join(pasta, arquivoDaCamada(pasta, base))).size
}

function checarCamada(pasta, base, teto, ausentes = new Set()) {
  if (ausentes.has(base)) return
  const bytes = bytesDaCamada(pasta, base)
  assert.ok(bytes <= teto, `${base}: ${bytes} bytes is over the ${teto} cap`)
}

/** File names of the served layers: every layer is either served (exactly one extension) or listed as not served. */
function camadasServidas(pasta) {
  const ausentes = camadasAusentes(pasta)
  return ATIVOS.camadas.filter((base) => !ausentes.has(base)).map((base) => arquivoDaCamada(pasta, base))
}

function checarTudo(pastas) {
  const t = (pasta, nome) => statSync(join(pasta, nome)).size
  const ausentes = camadasAusentes(pastas.cenas)
  for (const [nome, teto] of Object.entries(ATIVOS.placas)) {
    assert.ok(t(pastas.cenas, nome) <= teto, `${nome}: ${t(pastas.cenas, nome)} bytes is over the ${teto} cap`)
  }
  for (const base of ATIVOS.camadas) checarCamada(pastas.cenas, base, ATIVOS.tetoCamada, ausentes)
  for (const [rotulo, bases] of Object.entries(ATIVOS.somaCamadas)) {
    const soma = bases.reduce((s, base) => s + bytesDaCamada(pastas.cenas, base, ausentes), 0)
    assert.ok(soma <= ATIVOS.tetoSomaCamadas, `${rotulo}: layers total ${soma} bytes, over ${ATIVOS.tetoSomaCamadas}`)
  }
  for (const nome of ATIVOS.molduras) {
    checarBytesCapAberto(pastas.molduras, nome, ATIVOS.tetoMoldura)
  }
  for (const [nome, teto] of Object.entries(ATIVOS.capturas)) {
    checarBytesCapAberto(pastas.telas, nome, teto)
  }
  const total =
    t(pastas.cenas, 'm05-sol-1672w.webp') + bytesDaCamada(pastas.cenas, 'm05-luz-1672w', ausentes) +
    t(pastas.cenas, 'm06-apagada-792w.webp') + bytesDaCamada(pastas.cenas, 'm06-luz-792w', ausentes) +
    t(pastas.cenas, 'm04-recorte-1200w.webp') +
    Math.max(t(pastas.telas, 'historico-y-640w.webp'), t(pastas.telas, 'historico-y-alta-640w.webp')) +
    t(pastas.telas, 'hoje-n-640w.webp') +
    ATIVOS.molduras.reduce((s, nome) => s + t(pastas.molduras, nome), 0)
  assert.ok(total <= ATIVOS.tetoPagina1440Dpr2, `1440 x DPR 2 page total ${total} bytes is over ${ATIVOS.tetoPagina1440Dpr2}`)
}

test('AST1-I-09 byte caps: plates, lamp layers, layer sums per DPR, frames, captures and the page total', () => {
  const pasta = pastaTmp()
  writeFileSync(join(pasta, 'm05-luz-900w.png'), Buffer.alloc(12000))
  checarCamada(pasta, 'm05-luz-900w', ATIVOS.tetoCamada)
  writeFileSync(join(pasta, 'm05-luz-1672w.png'), Buffer.alloc(12001))
  assert.throws(() => checarCamada(pasta, 'm05-luz-1672w', ATIVOS.tetoCamada), /12001 bytes is over the 12000 cap/)
  writeFileSync(join(pasta, 'm05-luz-1672w.webp'), Buffer.alloc(10))
  assert.throws(() => checarCamada(pasta, 'm05-luz-1672w', ATIVOS.tetoCamada), /exactly one/)
  // Negative: a missing layer that no "Not served" list names still throws; a listed layer that is present throws too.
  const semLista = pastaTmp()
  writeFileSync(join(semLista, 'PROVENANCE.md'), '| m05-luz-900w.png | x | 1 |\n')
  assert.throws(() => bytesDaCamada(semLista, 'm05-luz-1672w', camadasAusentes(semLista)), /exactly one/)
  const comLista = pastaTmp()
  writeFileSync(join(comLista, 'PROVENANCE.md'), 'Not served (over the 12,000 B lamp-layer cap):\n\n- `m05-luz-1672w.png`: 19032 bytes\n')
  assert.equal(bytesDaCamada(comLista, 'm05-luz-1672w', camadasAusentes(comLista)), 0)
  writeFileSync(join(comLista, 'm05-luz-1672w.png'), Buffer.alloc(5))
  assert.throws(() => camadasAusentes(comLista), /listed as not served but present/)
  // Captures: over the cap only with a cap_open line naming the file with exactly its bytes.
  const telas = pastaTmp()
  writeFileSync(join(telas, 'historico-y-alta-640w.webp'), Buffer.alloc(35001))
  const teto = ATIVOS.capturas['historico-y-alta-640w.webp']
  assert.throws(() => checarBytesCapAberto(telas, 'historico-y-alta-640w.webp', teto), /over the 35000 cap/)
  const aberta = (n) => `## cap_open\n\n- historico-y-alta-640w.webp: ${n} bytes over the 35000 B cap at q72 (leader rules at integration)\n`
  writeFileSync(join(telas, 'PROVENANCE.md'), `# x\n\n${aberta(35002)}`)
  assert.throws(() => checarBytesCapAberto(telas, 'historico-y-alta-640w.webp', teto), /cap_open says 35002/)
  writeFileSync(join(telas, 'PROVENANCE.md'), `# x\n\n${aberta(35001)}`)
  checarBytesCapAberto(telas, 'historico-y-alta-640w.webp', teto)
  checarTudo(PASTAS)
})

// ---- Provenance (I-10) --------------------------------------------------------------------------------------------
function escapar(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Every file needs a PROVENANCE.md line holding its name, its sha256 (lowercase hex) and its byte count. */
function checarProveniencia(pasta, nomes) {
  const caminho = join(pasta, 'PROVENANCE.md')
  assert.ok(existsSync(caminho), `${caminho} does not exist`)
  const linhas = readFileSync(caminho, 'utf8').split(/\r?\n/)
  for (const nome of nomes) {
    const buf = readFileSync(join(pasta, nome))
    const hash = sha256(buf)
    const reNome = new RegExp(`(?<![\\w.-])${escapar(nome)}(?![\\w-])`)
    const reBytes = new RegExp(`(?<![\\d.])${buf.length}(?![\\d])`)
    const achou = linhas.some((linha) => {
      if (!reNome.test(linha) || !linha.includes(hash)) return false
      return reBytes.test(linha.replace(reNome, '').replaceAll(hash, ''))
    })
    assert.ok(achou, `${nome}: no PROVENANCE.md line with its name, sha256 ${hash} and ${buf.length} bytes`)
  }
}

test('AST1-I-10 provenance: every served file has a PROVENANCE.md line with name, sha256 and byte count', () => {
  const dir = pastaTmp()
  const a = Buffer.from('conteudo-a')
  const b = Buffer.from('conteudo-b!')
  writeFileSync(join(dir, 'a.webp'), a)
  writeFileSync(join(dir, 'b.webp'), b)
  writeFileSync(join(dir, 'PROVENANCE.md'), `| a.webp | ${sha256(a)} | ${a.length} |\n`)
  checarProveniencia(dir, ['a.webp'])
  assert.throws(() => checarProveniencia(dir, ['a.webp', 'b.webp']), /b\.webp: no PROVENANCE\.md line/)
  writeFileSync(join(dir, 'PROVENANCE.md'), `| a.webp | ${sha256(a)} | ${a.length} |\n| b.webp | ${sha256(b)} | ${b.length} |\n`)
  checarProveniencia(dir, ['a.webp', 'b.webp'])

  checarProveniencia(PASTAS.cenas, [
    ...Object.keys(ATIVOS.placas),
    ...camadasServidas(PASTAS.cenas),
  ])
  checarProveniencia(PASTAS.molduras, ATIVOS.molduras)
  checarProveniencia(PASTAS.telas, Object.keys(ATIVOS.capturas))
})
