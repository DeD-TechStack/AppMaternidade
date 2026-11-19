// G-11 checker: the capture manifest must describe real files, byte for byte.
// node web/scripts/conferir-capturas.mjs --manifesto <file> --public <dir> [--srcs <file>]
// Exit 0 prints one `OK` line; any miss exits 1 with one line per failure on stderr (fail closed).
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const RE_SHA256 = /^[0-9a-f]{64}$/
const RE_SHA1 = /^[0-9a-f]{40}$/
const IDS = { Y: 'Y', Y_ALTA: 'Y', N: 'N' }

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const ehTexto = (v) => typeof v === 'string' && v.length > 0
const ehInteiro = (v) => Number.isInteger(v) && v > 0

/** Width and height from the file header; throws on anything that is not PNG or WebP (VP8, VP8L, VP8X). */
function tamanhoDoCabecalho(buf) {
  if (buf.length >= 24 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    if (buf.toString('latin1', 12, 16) !== 'IHDR') throw new Error('PNG without IHDR')
    return { largura: buf.readUInt32BE(16), altura: buf.readUInt32BE(20) }
  }
  if (buf.length >= 30 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const chunk = buf.toString('latin1', 12, 16)
    if (chunk === 'VP8 ') {
      return { largura: buf.readUInt16LE(26) & 0x3fff, altura: buf.readUInt16LE(28) & 0x3fff }
    }
    if (chunk === 'VP8L') {
      if (buf[20] !== 0x2f) throw new Error('VP8L without the 0x2f signature')
      const bits = buf.readUInt32LE(21)
      return { largura: (bits & 0x3fff) + 1, altura: ((bits >>> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8X') {
      return { largura: buf.readUIntLE(24, 3) + 1, altura: buf.readUIntLE(27, 3) + 1 }
    }
    throw new Error(`unsupported WebP chunk "${chunk}"`)
  }
  throw new Error('neither PNG nor WebP')
}

/** The file under publicDir for a served path like "/telas/casa/x.webp", or null when it escapes the folder. */
function sobPublic(publicDir, caminho) {
  const base = resolve(publicDir)
  const alvo = resolve(base, `.${caminho.startsWith('/') ? '' : '/'}${caminho}`)
  return alvo.startsWith(base + sep) ? alvo : null
}

function conferirEntrada(e, n, publicDir, falhas) {
  const nome = `capturas[${n}]${ehTexto(e?.id) ? ` (${e.id})` : ''}`
  const falha = (msg) => falhas.push(`${nome}: ${msg}`)
  if (!e || typeof e !== 'object') return falha('not an object')
  if (!ehTexto(e.id)) falha('id missing')
  else if (!(e.id in IDS)) falha(`unknown id "${e.id}"`)
  else if (e.estado !== IDS[e.id]) falha(`estado must be "${IDS[e.id]}" for id ${e.id}`)
  for (const campo of ['rota', 'caminho_final', 'h1', 'instante', 'captura_ok']) {
    if (!ehTexto(e[campo])) falha(`${campo} missing or not a non-empty string`)
  }
  if (e.tema !== 'claro' && e.tema !== 'madrugada') falha('tema must be "claro" or "madrugada"')
  if (e.dpr !== 2) falha('dpr must be 2')
  if (e.toque !== true) falha('toque must be true')
  for (const campo of ['fixture', 'rotulo_demo_oculto']) {
    if (e[campo] === undefined || e[campo] === null) falha(`${campo} missing`)
  }
  if (!Array.isArray(e.linhas_topo) || e.linhas_topo.length === 0 || !e.linhas_topo.every(ehTexto)) {
    falha('linhas_topo must be a non-empty array of strings')
  }
  if (typeof e.fonte_px_linha !== 'number' || !Number.isFinite(e.fonte_px_linha) || e.fonte_px_linha <= 0) {
    falha('fonte_px_linha must be a positive number')
  }
  if (e.rolagem_px === undefined) falha('rolagem_px missing (object or null)')
  else if (e.rolagem_px !== null && (typeof e.rolagem_px !== 'object' || Array.isArray(e.rolagem_px))) {
    falha('rolagem_px must be an object or null')
  }

  const vp = /^(\d+)x(\d+)$/.exec(e.viewport ?? '')
  if (!vp) falha('viewport must be "<W>x<H>"')
  const png = e.png
  if (!png || typeof png !== 'object') falha('png record missing')
  else {
    if (!ehInteiro(png.largura) || !ehInteiro(png.altura)) falha('png.largura/altura must be positive integers')
    if (typeof png.sha256 !== 'string' || !RE_SHA256.test(png.sha256)) falha('png.sha256 must be 64 lowercase hex')
    if (vp && e.dpr === 2 && (png.largura !== Number(vp[1]) * 2 || png.altura !== Number(vp[2]) * 2)) {
      falha(`png size ${png.largura}x${png.altura} is not viewport ${e.viewport} x dpr 2`)
    }
  }

  if (!Array.isArray(e.servidos) || e.servidos.length === 0) return falha('servidos missing or empty')
  for (const [i, s] of e.servidos.entries()) {
    const ref = `servidos[${i}]`
    if (!s || !ehTexto(s.arquivo)) {
      falha(`${ref}.arquivo missing`)
      continue
    }
    if (!ehInteiro(s.largura) || !ehInteiro(s.altura) || !ehInteiro(s.bytes)) falha(`${s.arquivo}: largura/altura/bytes must be positive integers`)
    if (typeof s.sha256 !== 'string' || !RE_SHA256.test(s.sha256)) falha(`${s.arquivo}: sha256 must be 64 lowercase hex`)
    if (s.qualidade === undefined || s.qualidade === null) falha(`${s.arquivo}: qualidade missing`)
    const caminho = sobPublic(publicDir, s.arquivo)
    if (!caminho) {
      falha(`${s.arquivo}: escapes the public folder`)
      continue
    }
    if (!existsSync(caminho) || !statSync(caminho).isFile()) {
      falha(`${s.arquivo}: file does not exist under the public folder`)
      continue
    }
    const buf = readFileSync(caminho)
    if (buf.length !== s.bytes) falha(`${s.arquivo}: ${buf.length} bytes on disk, manifest says ${s.bytes}`)
    if (sha256(buf) !== s.sha256) falha(`${s.arquivo}: sha256 on disk differs from the manifest`)
    try {
      const t = tamanhoDoCabecalho(buf)
      if (t.largura !== s.largura || t.altura !== s.altura) {
        falha(`${s.arquivo}: header says ${t.largura}x${t.altura}, manifest says ${s.largura}x${s.altura}`)
      }
    } catch (erro) {
      falha(`${s.arquivo}: ${erro.message}`)
    }
  }
}

/** All failures as strings; an empty array means the manifest and the optional served paths hold. */
function verificar(manifesto, publicDir, srcs) {
  const falhas = []
  if (!manifesto || typeof manifesto !== 'object') return ['manifest is not an object']
  if (manifesto.versao !== 1) falhas.push('versao must be 1')
  if (typeof manifesto.fonte_sha !== 'string' || !RE_SHA1.test(manifesto.fonte_sha)) falhas.push('fonte_sha must be 40 lowercase hex')
  const f = manifesto.ferramenta
  for (const campo of ['capturar_sha256', 'cdp_sha256']) {
    if (!f || typeof f[campo] !== 'string' || !RE_SHA256.test(f[campo])) falhas.push(`ferramenta.${campo} must be 64 lowercase hex`)
  }
  if (!Array.isArray(manifesto.capturas) || manifesto.capturas.length === 0) {
    falhas.push('capturas is empty or missing')
    return falhas
  }
  manifesto.capturas.forEach((e, n) => conferirEntrada(e, n, publicDir, falhas))
  const ids = new Set(manifesto.capturas.map((e) => e?.id))
  for (const id of Object.keys(IDS)) if (!ids.has(id)) falhas.push(`capturas has no entry with id ${id}`)

  if (srcs) {
    if (srcs.length === 0) falhas.push('srcs list is empty')
    const conhecidos = new Set(
      manifesto.capturas.flatMap((e) => (Array.isArray(e?.servidos) ? e.servidos.map((s) => s?.sha256) : [])),
    )
    for (const src of srcs) {
      const caminho = sobPublic(publicDir, src)
      if (!caminho) falhas.push(`${src}: escapes the public folder`)
      else if (!existsSync(caminho) || !statSync(caminho).isFile()) falhas.push(`${src}: file does not exist under the public folder`)
      else if (!conhecidos.has(sha256(readFileSync(caminho)))) falhas.push(`${src}: sha256 matches no served file of the manifest`)
    }
  }
  return falhas
}

function falhar(...linhas) {
  for (const l of linhas) process.stderr.write(`${l}\n`)
  process.exit(1)
}

function main(argv) {
  const arg = (nome) => {
    const i = argv.indexOf(nome)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const manifestoCaminho = arg('--manifesto')
  const publicDir = arg('--public')
  const srcsCaminho = arg('--srcs')
  if (!manifestoCaminho || !publicDir) falhar('usage: conferir-capturas.mjs --manifesto <file> --public <dir> [--srcs <file>]')
  let manifesto
  try {
    manifesto = JSON.parse(readFileSync(manifestoCaminho, 'utf8'))
  } catch (erro) {
    falhar(`${manifestoCaminho}: cannot read manifest: ${erro.message}`)
  }
  let srcs
  if (srcsCaminho !== undefined) {
    try {
      srcs = readFileSync(srcsCaminho, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
    } catch (erro) {
      falhar(`${srcsCaminho}: cannot read srcs list: ${erro.message}`)
    }
  }
  const falhas = verificar(manifesto, publicDir, srcs)
  if (falhas.length > 0) falhar(...falhas)
  const arquivos = new Set(manifesto.capturas.flatMap((e) => e.servidos.map((s) => s.arquivo)))
  process.stdout.write(`OK ${manifesto.capturas.length} capturas, ${arquivos.size} arquivos\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main(process.argv.slice(2))
