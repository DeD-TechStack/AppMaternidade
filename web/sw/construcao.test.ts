import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pastaSrcDe } from '../src/teste/fontes.ts'

// O `vite build` de verdade, com o vite.config.ts do site, nos dois subcaminhos: o que sai em dist
// (index.html, 404.html, sw.js). Faz o papel de `BASE_SITE=/AppMaternidade/ npm run build`.

const pastaWeb = join(pastaSrcDe(import.meta.url), '..')
const saidas: string[] = []

async function construir(subcaminho: string | undefined): Promise<string> {
  const pasta = mkdtempSync(join(tmpdir(), 'dist-'))
  saidas.push(pasta)
  if (subcaminho !== undefined) vi.stubEnv('BASE_SITE', subcaminho)
  else vi.stubEnv('BASE_SITE', '')
  await build({
    root: pastaWeb,
    configFile: join(pastaWeb, 'vite.config.ts'),
    logLevel: 'silent',
    build: { outDir: pasta, emptyOutDir: true },
  })
  return pasta
}

const ler = (pasta: string, arquivo: string) => readFileSync(join(pasta, arquivo), 'utf8')

function arquivosDe(pasta: string): string[] {
  return readdirSync(pasta, { recursive: true, encoding: 'utf8' })
    .map((caminho) => caminho.replaceAll('\\', '/'))
    .filter((caminho) => statSync(join(pasta, caminho)).isFile())
}

/** A lista da casca gravada no sw.js: os caminhos entre aspas que começam pelo subcaminho. */
function cascaDoSw(codigo: string, subcaminho: string): string[] {
  const bloco = /"casca":\s*\[([^\]]*)\]/.exec(codigo)
  expect(bloco, 'o sw.js traz a lista da casca').not.toBeNull()
  return [...bloco![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((c) => c.startsWith(subcaminho))
}

afterEach(() => {
  vi.unstubAllEnvs()
  for (const pasta of saidas.splice(0)) rmSync(pasta, { recursive: true, force: true })
})

describe('vite build', () => {
  it.each([
    ['sem BASE_SITE', undefined, '/'],
    ['com BASE_SITE=/AppMaternidade/', '/AppMaternidade/', '/AppMaternidade/'],
  ])(
    '%s: o <head> aponta o manifesto e os ícones sob %s, e o sw.js leva a casca do build',
    async (_nome, base, subcaminho) => {
      const dist = await construir(base)

      const html = ler(dist, 'index.html')
      expect(html).toContain(`<link rel="manifest" href="${subcaminho}manifest.webmanifest" />`)
      expect(html).toContain(`<link rel="icon" type="image/svg+xml" href="${subcaminho}icones/icone.svg" />`)
      expect(html).toContain(`<link rel="apple-touch-icon" href="${subcaminho}icones/apple-touch-icon-180.png" />`)

      // A cópia do 404.html continua igual ao index.html.
      expect(readFileSync(join(dist, '404.html')).equals(readFileSync(join(dist, 'index.html')))).toBe(true)

      // O manifesto e os ícones vieram de public/.
      for (const arquivo of ['manifest.webmanifest', 'icones/icone.svg', 'icones/icone-192.png', 'icones/icone-512.png', 'icones/icone-maskable-512.png', 'icones/apple-touch-icon-180.png']) {
        expect(arquivosDe(dist), arquivo).toContain(arquivo)
      }

      // O sw.js: todo arquivo de dist, menos 404.html e sw.js, com o subcaminho na frente.
      const codigo = ler(dist, 'sw.js')
      const esperados = arquivosDe(dist)
        .filter((arquivo) => arquivo !== '404.html' && arquivo !== 'sw.js')
        .map((arquivo) => subcaminho + arquivo)
        .sort()
      expect(cascaDoSw(codigo, subcaminho)).toEqual(esperados)
      expect(codigo).not.toContain('404.html')
      expect(codigo).not.toMatch(/['"]push['"]|showNotification|Notification\.requestPermission/)
      expect(codigo).toContain(`"subcaminho": "${subcaminho}"`)
    },
    180_000,
  )

  it('dois builds com o mesmo código dão sw.js idêntico, byte a byte', async () => {
    const a = await construir('/AppMaternidade/')
    const b = await construir('/AppMaternidade/')
    expect(readFileSync(join(a, 'sw.js')).equals(readFileSync(join(b, 'sw.js')))).toBe(true)
  }, 180_000)
})
