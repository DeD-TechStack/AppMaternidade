// node --test web/scripts/conferir-capturas.test.mjs (from the worktree root). Probe AST1-I-02 and its negative controls.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const SCRIPT = fileURLToPath(new URL('./conferir-capturas.mjs', import.meta.url))
const RAIZ_TMP = mkdtempSync(join(tmpdir(), 'ast1-i-02-'))
after(() => rmSync(RAIZ_TMP, { recursive: true, force: true }))

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pedaco(tipo, dados) {
  const corpo = Buffer.concat([Buffer.from(tipo, 'latin1'), dados])
  const ini = Buffer.alloc(4)
  ini.writeUInt32BE(dados.length)
  const fim = Buffer.alloc(4)
  fim.writeUInt32BE(crc32(corpo))
  return Buffer.concat([ini, corpo, fim])
}

/** An 8-bit grey PNG; `pixel(x, y)` gives the grey level, default flat 200. */
function criarPng(largura, altura, pixel = () => 200) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largura, 0)
  ihdr.writeUInt32BE(altura, 4)
  ihdr[8] = 8
  const linhas = Buffer.alloc((largura + 1) * altura)
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) linhas[y * (largura + 1) + 1 + x] = pixel(x, y)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', deflateSync(linhas)),
    pedaco('IEND', Buffer.alloc(0)),
  ])
}

/** A WebP container with a hand-written lossy `VP8 ` header; the payload after the header is filler. */
function criarWebp(largura, altura, enchimento) {
  const cabecalho = Buffer.alloc(10)
  cabecalho.set([0x10, 0x02, 0x00, 0x9d, 0x01, 0x2a], 0)
  cabecalho.writeUInt16LE(largura, 6)
  cabecalho.writeUInt16LE(altura, 8)
  const dados = Buffer.concat([cabecalho, Buffer.from(enchimento.padEnd(22, '.'), 'latin1')])
  const chunk = Buffer.concat([Buffer.from('VP8 ', 'latin1'), Buffer.alloc(4), dados])
  chunk.writeUInt32LE(dados.length, 4)
  const riff = Buffer.concat([Buffer.from('RIFF', 'latin1'), Buffer.alloc(4), Buffer.from('WEBP', 'latin1'), chunk])
  riff.writeUInt32LE(riff.length - 8, 4)
  return riff
}

function registro(arquivo, buf, largura, altura) {
  return { arquivo, largura, altura, bytes: buf.length, sha256: sha256(buf), qualidade: 82 }
}

function entrada(id, estado, viewport, servidos) {
  const [w, h] = viewport.split('x').map(Number)
  return {
    id,
    estado,
    rota: estado === 'Y' ? '/app/historico' : '/app/hoje',
    caminho_final: estado === 'Y' ? '/app/historico' : '/app/hoje',
    h1: estado === 'Y' ? 'Histórico' : 'Hoje',
    tema: estado === 'Y' ? 'claro' : 'madrugada',
    viewport,
    dpr: 2,
    toque: true,
    instante: '2026-11-18T21:42:00',
    fixture: 'casa',
    rotulo_demo_oculto: true,
    png: { largura: w * 2, altura: h * 2, sha256: sha256(Buffer.from(`captura-${id}`)) },
    captura_ok: `CAPTURA_OK ${id}.png`,
    linhas_topo: ['16:00 mamada Ju', '17:30 Ícaro'],
    fonte_px_linha: 16,
    rolagem_px: estado === 'Y' ? { 1440: 320, 390: 280 } : null,
    servidos,
  }
}

let contador = 0
/** A fresh public dir and manifest whose records match the files byte for byte. */
function montar() {
  contador += 1
  const dir = join(RAIZ_TMP, `caso-${contador}`)
  const publicDir = join(dir, 'public')
  mkdirSync(join(publicDir, 'telas', 'casa'), { recursive: true })
  const arquivos = {
    'historico-y-640w.webp': criarWebp(10, 20, 'historico-y'),
    'historico-y-alta-640w.webp': criarWebp(10, 40, 'historico-y-alta'),
    'hoje-n-640w.webp': criarWebp(10, 20, 'hoje-n'),
    'historico-y-280w.png': criarPng(8, 16, (x, y) => (x * 7 + y * 13) % 251),
  }
  for (const [nome, buf] of Object.entries(arquivos)) writeFileSync(join(publicDir, 'telas', 'casa', nome), buf)
  const rec = (nome, w, h) => registro(`/telas/casa/${nome}`, arquivos[nome], w, h)
  const manifesto = {
    versao: 1,
    fonte_sha: 'a'.repeat(40),
    ferramenta: { capturar_sha256: 'b'.repeat(64), cdp_sha256: 'c'.repeat(64) },
    capturas: [
      entrada('Y', 'Y', '390x844', [rec('historico-y-640w.webp', 10, 20), rec('historico-y-280w.png', 8, 16)]),
      entrada('Y_ALTA', 'Y', '390x1234', [rec('historico-y-alta-640w.webp', 10, 40)]),
      entrada('N', 'N', '390x844', [rec('hoje-n-640w.webp', 10, 20)]),
    ],
  }
  const manifestoCaminho = join(dir, 'MANIFESTO.json')
  const servidos = manifesto.capturas.flatMap((e) => e.servidos.map((s) => s.arquivo))
  const m = { dir, publicDir, manifesto, manifestoCaminho, servidos }
  gravar(m)
  return m
}

function gravar(m) {
  writeFileSync(m.manifestoCaminho, `${JSON.stringify(m.manifesto, null, 2)}\n`)
}

function srcs(m, linhas) {
  const caminho = join(m.dir, 'srcs.txt')
  writeFileSync(caminho, linhas.length ? `${linhas.join('\n')}\n` : '')
  return caminho
}

function rodar(m, extras = []) {
  const r = spawnSync(process.execPath, [SCRIPT, '--manifesto', m.manifestoCaminho, '--public', m.publicDir, ...extras], {
    encoding: 'utf8',
  })
  assert.equal(r.error, undefined, 'the checker must start')
  return r
}

test('AST1-I-02 (0) a good manifest exits 0, alone and with --srcs listing its served files', () => {
  const m = montar()
  const so = rodar(m)
  assert.equal(so.status, 0, so.stderr)
  assert.match(so.stdout, /^OK 3 capturas, 4 arquivos\n$/)
  const com = rodar(m, ['--srcs', srcs(m, m.servidos)])
  assert.equal(com.status, 0, com.stderr)
})

test('AST1-I-02 (a) a flat skeleton screen in --srcs exits != 0', () => {
  const m = montar()
  // Grey bars on a flat background, the right size for a 390x844 dpr 2 capture, but not in the manifest.
  const esqueleto = criarPng(780, 1688, (x, y) => (y % 120 > 60 && x > 60 && x < 700 ? 180 : 235))
  writeFileSync(join(m.publicDir, 'telas', 'casa', 'esqueleto.png'), esqueleto)
  const r = rodar(m, ['--srcs', srcs(m, [...m.servidos, '/telas/casa/esqueleto.png'])])
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /esqueleto\.png/)
})

test('AST1-I-02 (b) an unknown image path in --srcs exits != 0', () => {
  const m = montar()
  const r = rodar(m, ['--srcs', srcs(m, [...m.servidos, '/telas/casa/nao-existe.webp'])])
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /nao-existe\.webp/)
})

test('AST1-I-02 (c) a served file whose bytes changed after hashing exits != 0', () => {
  const m = montar()
  const caminho = join(m.publicDir, 'telas', 'casa', 'hoje-n-640w.webp')
  const buf = readFileSync(caminho)
  buf[buf.length - 1] ^= 0xff
  writeFileSync(caminho, buf)
  const r = rodar(m)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /hoje-n-640w\.webp.*sha256/)
})

test('AST1-I-02 (d) an empty --srcs file (or a missing one) exits != 0', () => {
  const m = montar()
  const vazio = rodar(m, ['--srcs', srcs(m, [])])
  assert.notEqual(vazio.status, 0)
  const ausente = rodar(m, ['--srcs', join(m.dir, 'nao-existe.txt')])
  assert.notEqual(ausente.status, 0)
})

test('AST1-I-02 (e) a png size that is not viewport x dpr exits != 0', () => {
  const m = montar()
  m.manifesto.capturas[0].png.altura = 1687
  gravar(m)
  const r = rodar(m)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /viewport 390x844 x dpr 2/)
})

test('AST1-I-02 (f) a manifest with no capture, or unreadable, exits != 0', () => {
  const m = montar()
  m.manifesto.capturas = []
  gravar(m)
  assert.notEqual(rodar(m).status, 0)
  writeFileSync(m.manifestoCaminho, '{ not json')
  assert.notEqual(rodar(m).status, 0)
})

test('AST1-I-02 (g) a header size that differs from the manifest exits != 0', () => {
  const m = montar()
  m.manifesto.capturas[2].servidos[0].largura = 11
  gravar(m)
  const r = rodar(m)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /header says 10x20/)
})
