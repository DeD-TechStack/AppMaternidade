import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// REP-HOME, round 1 (REPH-I-06, spec RF-06): both product frames on `/` hold ASSET-1 real captures.
// The manifest is `web/public/telas/casa/MANIFESTO.json`; this test reads what the card names and
// nothing else about its shape (round 4: the real manifest names an entry by `id`, `estado` is `Y` for
// both Histórico entries, so the key is `id ?? estado`):
//   capturas[]: { id: 'Y' | 'Y_ALTA' | 'N', linhas_topo: [...], servidos: [{ arquivo, largura, altura, sha256 }] }
// The page's own `midia.ts` is compared with it (path, srcSet, width, height), never with a guess.
//   - `linhas_topo` lists the rows visible in the top 240 screen-layer px (a string or an object per row);
//   - a served entry names its file by one of `caminho`, `arquivo`, `src` or `path` (relative to
//     web/public, with or without a leading slash).
// Rows are matched on text only, so the exact field names inside a row are free.

const PASTA_WEB = process.cwd()
const PUBLICO = join(PASTA_WEB, 'public')
const MANIFESTO = join(PUBLICO, 'telas', 'casa', 'MANIFESTO.json')
const SRC = join(PASTA_WEB, 'src')

interface Servido {
  sha256?: unknown
  [chave: string]: unknown
}
interface Captura {
  id?: unknown
  estado?: unknown
  linhas_topo?: unknown
  servidos?: unknown
  [chave: string]: unknown
}

/** The key of a capture entry: the real manifest names it `id` (`Y`, `Y_ALTA`, `N`; `estado` is `Y` for both Histórico entries). */
const chave = (captura: Captura): unknown => captura.id ?? captura.estado
const entrada = (capturas: Captura[], id: string) => capturas.find((c) => chave(c) === id)

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const texto = (valor: unknown) => JSON.stringify(valor ?? '').normalize('NFC')
const caminhoDe = (servido: Servido): string | null => {
  for (const chave of ['caminho', 'arquivo', 'src', 'path']) {
    const valor = servido[chave]
    if (typeof valor === 'string' && valor !== '') return valor.replace(/^\/+/, '')
  }
  return null
}

/** Every problem found in a manifest, given a reader for the served files (relative to web/public). */
function problemas(manifesto: { capturas?: unknown }, ler: (relativo: string) => Buffer | null): string[] {
  const achados: string[] = []
  const capturas = Array.isArray(manifesto.capturas) ? (manifesto.capturas as Captura[]) : []
  if (capturas.length === 0) return ['no captures in the manifest']
  for (const estado of ['Y', 'Y_ALTA', 'N']) {
    if (!entrada(capturas, estado)) achados.push(`no entry for state ${estado}`)
  }
  for (const captura of capturas) {
    const servidos = Array.isArray(captura.servidos) ? (captura.servidos as Servido[]) : []
    if (servidos.length === 0) achados.push(`state ${String(chave(captura))}: no served file`)
    for (const servido of servidos) {
      const relativo = caminhoDe(servido)
      if (relativo === null) {
        achados.push(`state ${String(chave(captura))}: a served entry names no file`)
        continue
      }
      if (typeof servido.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(servido.sha256)) {
        achados.push(`${relativo}: sha256 is not 64 hex characters`)
        continue
      }
      const bytes = ler(relativo)
      if (bytes === null) achados.push(`${relativo}: the served file does not exist`)
      else if (sha256(bytes) !== servido.sha256) achados.push(`${relativo}: sha256 mismatch`)
    }
  }
  const linhasY = texto(entrada(capturas, 'Y')?.linhas_topo)
  const linhas = Array.isArray(entrada(capturas, 'Y')?.linhas_topo) ? (entrada(capturas, 'Y')!.linhas_topo as unknown[]) : []
  const linhaDe = (...partes: string[]) => linhas.some((linha) => partes.every((parte) => texto(linha).toLowerCase().includes(parte.toLowerCase())))
  if (linhasY === '""' || !linhaDe('16:00', 'mamada', 'Ju')) achados.push('state Y: no 16:00 mamada Ju row in the top 240 px')
  if (!linhaDe('17:30', 'Ícaro')) achados.push('state Y: no 17:30 Ícaro row in the top 240 px')
  const estadoN = entrada(capturas, 'N')
  if (!texto(estadoN).includes('21:42')) achados.push('state N: the instant 21:42 is not stated')
  return achados
}

const lerDoPublico = (relativo: string): Buffer | null => {
  const arquivo = join(PUBLICO, relativo)
  return existsSync(arquivo) ? readFileSync(arquivo) : null
}

const arquivosDe = (pasta: string): string[] =>
  existsSync(pasta)
    ? readdirSync(pasta).flatMap((nome) => (statSync(join(pasta, nome)).isDirectory() ? arquivosDe(join(pasta, nome)) : [join(pasta, nome)]))
    : []

// A conforming manifest in memory, for the controls.
const BYTES_Y = Buffer.from('capture Y bytes')
const BYTES_N = Buffer.from('capture N bytes')
const manifestoBom = () => ({
  capturas: [
    {
      estado: 'Y',
      linhas_topo: ['16:00 mamada Juliana', '17:30 fralda Ícaro'],
      servidos: [{ caminho: 'telas/casa/y@2x.png', sha256: sha256(BYTES_Y) }],
    },
    { estado: 'Y_ALTA', linhas_topo: ['16:00 mamada Juliana'], servidos: [{ caminho: 'telas/casa/y-alta@2x.png', sha256: sha256(BYTES_Y) }] },
    { estado: 'N', instante: '21:42', linhas_topo: [], servidos: [{ caminho: 'telas/casa/n@2x.png', sha256: sha256(BYTES_N) }] },
  ],
})
const leitorBom = (relativo: string) => (relativo.includes('/n@') ? BYTES_N : BYTES_Y)

describe('REPH-I-06 real captures: the manifest, the hashes of the served files, the states and the rows', () => {
  it('REPH-I-06 web/public/telas/casa/MANIFESTO.json exists with the three real captures Y, Y_ALTA and N', () => {
    expect(existsSync(MANIFESTO)).toBe(true)
    const manifesto = JSON.parse(readFileSync(MANIFESTO, 'utf8')) as { capturas?: Captura[] }
    expect(Array.isArray(manifesto.capturas)).toBe(true)
    expect((manifesto.capturas ?? []).map(chave).sort()).toEqual(['N', 'Y', 'Y_ALTA'])
  })

  it('REPH-I-06 every served file exists under web/public and its sha256 equals the manifest entry; no problem is left', () => {
    expect(existsSync(MANIFESTO)).toBe(true)
    const manifesto = JSON.parse(readFileSync(MANIFESTO, 'utf8')) as { capturas?: unknown }
    expect(problemas(manifesto, lerDoPublico)).toEqual([])
  })

  it('REPH-I-06 state Y has the 16:00 + mamada + Ju row and the 17:30 + Ícaro row in the top 240 px; state N states 21:42', () => {
    expect(existsSync(MANIFESTO)).toBe(true)
    const manifesto = JSON.parse(readFileSync(MANIFESTO, 'utf8')) as { capturas: Captura[] }
    const y = entrada(manifesto.capturas, 'Y')
    expect(y).toBeDefined()
    const linhas = (Array.isArray(y!.linhas_topo) ? y!.linhas_topo : []).map((linha) => texto(linha))
    expect(linhas.some((l) => l.includes('16:00') && /mamada/i.test(l) && l.includes('Ju'))).toBe(true)
    expect(linhas.some((l) => l.includes('17:30') && l.includes('Ícaro'))).toBe(true)
    const n = entrada(manifesto.capturas, 'N')
    expect(texto(n)).toContain('21:42')
  })

  it('REPH-I-06 the page uses the entry Y for the Histórico frame and the entry N for the Hoje frame', () => {
    expect(existsSync(MANIFESTO)).toBe(true)
    const manifesto = JSON.parse(readFileSync(MANIFESTO, 'utf8')) as { capturas: Captura[] }
    const fontes = [join(SRC, 'paginas', 'Inicio.tsx'), ...arquivosDe(join(SRC, 'componentes', 'inicio-casa')), join(SRC, 'conteudo', 'inicio.ts')]
      .filter((arquivo) => existsSync(arquivo) && !/\.test\./.test(arquivo))
      .map((arquivo) => readFileSync(arquivo, 'utf8'))
      .join('\n')
    expect(fontes).not.toBe('')
    const caminhos = (estado: string) =>
      (entrada(manifesto.capturas, estado)?.servidos as Servido[] | undefined)?.map(caminhoDe).filter((c): c is string => c !== null) ?? []
    const usa = (estado: string) => caminhos(estado).some((caminho) => fontes.includes(caminho) || fontes.includes(caminho.replace(/@[12]x(?=\.)/, '')))
    expect(usa('Y')).toBe(true)
    expect(usa('N')).toBe(true)
  })

  it('REPH-I-06 midia.ts names each capture by the manifest: same src, srcSet files, widths and heights (no guessed size)', async () => {
    const { CAPTURA_Y, CAPTURA_N } = await import('../componentes/inicio-casa/midia.ts')
    const manifesto = JSON.parse(readFileSync(MANIFESTO, 'utf8')) as { capturas: Captura[] }
    const casos = [
      { id: 'Y', imagem: CAPTURA_Y },
      { id: 'N', imagem: CAPTURA_N },
    ]
    for (const { id, imagem } of casos) {
      const servidos = (entrada(manifesto.capturas, id)?.servidos ?? []) as Array<Servido & { largura: number; altura: number }>
      expect(servidos.length, id).toBeGreaterThan(0)
      const porCaminho = new Map(servidos.map((s) => [caminhoDe(s), s]))
      // Every file of the srcSet is a served file, with the width the descriptor states; the served set is covered.
      const lista = (imagem.srcSet ?? '').split(',').map((parte) => parte.trim().split(/\s+/))
      expect(lista.length, id).toBe(servidos.length)
      for (const [caminho, descritor] of lista) {
        const servido = porCaminho.get(caminho.replace(/^\/+/, ''))
        expect(servido, `${id}: ${caminho} is not a served file`).toBeDefined()
        expect(`${servido!.largura}w`, caminho).toBe(descritor)
        expect(existsSync(join(PUBLICO, caminho)), caminho).toBe(true)
      }
      // `src` is one of them; `largura` / `altura` are those of the largest file, as the Imagem contract says.
      expect(porCaminho.has(imagem.src.replace(/^\/+/, '')), `${id}: src`).toBe(true)
      const maior = servidos.reduce((a, b) => (b.largura > a.largura ? b : a))
      expect([imagem.largura, imagem.altura], id).toEqual([maior.largura, maior.altura])
    }
  })

  it('REPH-I-06 every file midia.ts serves from web/public exists there; the four scene plates are build-made, from a master', async () => {
    const midia = await import('../componentes/inicio-casa/midia.ts')
    const caminhos = new Set<string>()
    for (const valor of Object.values(midia)) {
      if (typeof valor !== 'object' || valor === null || !('src' in valor)) continue
      const imagem = valor as { src: string; srcSet?: string }
      caminhos.add(imagem.src)
      for (const parte of (imagem.srcSet ?? '').split(',')) if (parte.trim() !== '') caminhos.add(parte.trim().split(/\s+/)[0])
    }
    // The plates (M05, M05_390, M06, M04) are vite-imagetools URLs (`/@imagetools/<hash>` in the test run, a hashed
    // file under /assets in the build): everything else is a file of web/public.
    const servidos = [...caminhos].filter((caminho) => !caminho.startsWith('/@imagetools/'))
    expect(servidos.length).toBeGreaterThan(10)
    for (const caminho of servidos) expect(existsSync(join(PUBLICO, caminho.replace(/^\/+/, ''))), caminho).toBe(true)
    for (const caminho of servidos) expect(caminho, 'a plate must not be a /cenas/inicio WebP any more').not.toMatch(/\/cenas\/inicio\/.*\.webp$/)
  })

  it('REPH-I-06 the scene plates: one master each under src/assets, WebP srcSet plus AVIF srcSet of the same widths, the size of the master', async () => {
    const { M05, M05_390, M06, M04 } = await import('../componentes/inicio-casa/midia.ts')
    const placas = [
      { nome: 'M05', imagem: M05, mestre: 'm05-sol-1672w.webp', larguras: [900, 1672], tamanho: [1672, 941], sizes: '(min-width: 1440px) 900px, 62.5vw', src: 900 },
      { nome: 'M05_390', imagem: M05_390, mestre: 'm05-sol-390c-780w.webp', larguras: [390, 780], tamanho: [780, 612], sizes: '100vw', src: 390 },
      { nome: 'M06', imagem: M06, mestre: 'm06-apagada-792w.webp', larguras: [300, 396, 600, 792], tamanho: [792, 1293], sizes: '(min-width: 1024px) 395.5px, 300px', src: 396 },
      { nome: 'M04', imagem: M04, mestre: 'm04-recorte-1200w.webp', larguras: [350, 600, 700, 1200], tamanho: [1200, 870], sizes: '(min-width: 1024px) 600px, 100vw', src: 600 },
    ]
    const lista = (srcSet: string | undefined) =>
      (srcSet ?? '').split(',').map((parte) => {
        const [url, descritor] = parte.trim().split(/\s+/)
        return { url, largura: Number(descritor.replace(/w$/, '')) }
      })
    for (const { nome, imagem, mestre, larguras, tamanho, sizes, src } of placas) {
      expect(existsSync(join(SRC, 'assets', 'cenas', 'inicio', mestre)), `${nome}: master ${mestre}`).toBe(true)
      const webp = lista(imagem.srcSet)
      const avif = lista(imagem.avif)
      expect(webp.map((item) => item.largura), `${nome}: webp widths`).toEqual(larguras)
      expect(avif.map((item) => item.largura), `${nome}: avif widths`).toEqual(larguras)
      expect(new Set([...webp, ...avif].map((item) => item.url)).size, `${nome}: one distinct URL per format and width`).toBe(larguras.length * 2)
      expect(webp.find((item) => item.largura === src)?.url, `${nome}: src is the ${src}w file`).toBe(imagem.src)
      expect([imagem.largura, imagem.altura], `${nome}: size of the master`).toEqual(tamanho)
      expect(imagem.sizes, `${nome}: sizes`).toBe(sizes)
    }
  })

  it('REPH-I-06 the frames are ASSET-1 PNG rasters under web/public/molduras with the size midia.ts states (678 x 1423)', async () => {
    const { MOLDURA_DIA, MOLDURA_NOITE } = await import('../componentes/inicio-casa/midia.ts')
    expect([MOLDURA_DIA.src, MOLDURA_NOITE.src]).toEqual(['/molduras/moldura-dia.png', '/molduras/moldura-noite.png'])
    for (const moldura of [MOLDURA_DIA, MOLDURA_NOITE]) {
      const arquivo = join(PUBLICO, moldura.src.replace(/^\/+/, ''))
      expect(existsSync(arquivo), moldura.src).toBe(true)
      const bytes = readFileSync(arquivo)
      // PNG: the 8-byte signature, then IHDR with the width and the height as big-endian 32-bit integers.
      expect(bytes.subarray(0, 8).toString('hex'), moldura.src).toBe('89504e470d0a1a0a')
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], moldura.src).toEqual([moldura.largura, moldura.altura])
      expect(bytes[25], `${moldura.src}: colour type 6 (RGBA, the hole is alpha)`).toBe(6)
    }
  })

  it('REPH-I-06 no placeholder, skeleton or stand-in file sits under web/public/telas/casa', () => {
    expect(existsSync(MANIFESTO)).toBe(true)
    const nomes = arquivosDe(join(PUBLICO, 'telas', 'casa')).map((arquivo) => arquivo.toLowerCase())
    expect(nomes.filter((nome) => /esqueleto|skeleton|placeholder|stand-?in|provisorio/.test(nome))).toEqual([])
  })

  it('REPH-I-06 the checker catches its controls: a hash mismatch, and state Y without the 17:30 row', () => {
    // These run after the existence checks above only to keep the base red; the checker is pure.
    expect(existsSync(MANIFESTO)).toBe(true)
    expect(problemas(manifestoBom(), leitorBom)).toEqual([])
    const adulterado = (relativo: string) => (relativo.includes('/y@') ? Buffer.from('changed after hashing') : leitorBom(relativo))
    expect(problemas(manifestoBom(), adulterado).some((p) => /sha256 mismatch/.test(p))).toBe(true)
    const semLinha = manifestoBom()
    semLinha.capturas[0].linhas_topo = ['16:00 mamada Juliana']
    expect(problemas(semLinha, leitorBom).some((p) => /17:30/.test(p))).toBe(true)
    const semInstante = manifestoBom()
    delete (semInstante.capturas[2] as { instante?: string }).instante
    expect(problemas(semInstante, leitorBom).some((p) => /21:42/.test(p))).toBe(true)
    const semEstado = manifestoBom()
    semEstado.capturas.pop()
    expect(problemas(semEstado, leitorBom).some((p) => /state N/.test(p))).toBe(true)
  })
})
