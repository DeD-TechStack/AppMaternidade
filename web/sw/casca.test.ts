import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { calcularCasca } from './casca.ts'
import { nomeDoCache, PREFIXO_DO_CACHE } from './config.ts'

// A lista da casca e a versão dela, lidas de uma pasta `dist` de mentira.

let pasta = ''

function gravar(relativo: string, conteudo: string) {
  const destino = join(pasta, relativo)
  mkdirSync(join(destino, '..'), { recursive: true })
  writeFileSync(destino, conteudo)
}

function dist() {
  gravar('index.html', '<html>app</html>')
  gravar('404.html', '<html>app</html>')
  gravar('sw.js', '// antigo')
  gravar('manifest.webmanifest', '{}')
  gravar('assets/index-ABC.js', 'console.log(1)')
  gravar('assets/index-ABC.css', 'body{}')
  gravar('icones/icone-192.png', 'png')
}

beforeEach(() => {
  pasta = mkdtempSync(join(tmpdir(), 'casca-'))
})

afterEach(() => {
  rmSync(pasta, { recursive: true, force: true })
})

describe('a lista da casca', () => {
  it('traz todo arquivo de dist, menos 404.html e sw.js, com o subcaminho na frente', () => {
    dist()
    const { casca } = calcularCasca(pasta, '/AppMaternidade/')
    expect(casca).toEqual([
      '/AppMaternidade/assets/index-ABC.css',
      '/AppMaternidade/assets/index-ABC.js',
      '/AppMaternidade/icones/icone-192.png',
      '/AppMaternidade/index.html',
      '/AppMaternidade/manifest.webmanifest',
    ])
    expect(casca.join('\n')).not.toContain('404.html')
    expect(casca.join('\n')).not.toContain('sw.js')
  })

  it('sem subcaminho (local), os caminhos começam em /', () => {
    dist()
    const { casca, paginaInicial } = calcularCasca(pasta, '/')
    expect(casca).toContain('/index.html')
    expect(casca).toContain('/assets/index-ABC.js')
    expect(paginaInicial).toBe('/index.html')
  })

  it('a ordem não depende do disco: é sempre a mesma', () => {
    dist()
    const lista = calcularCasca(pasta, '/').casca
    expect(lista).toEqual([...lista].sort())
  })
})

describe('a versão da casca', () => {
  it('é a mesma para o mesmo conteúdo, e muda com um byte de qualquer arquivo da lista', () => {
    dist()
    const base = calcularCasca(pasta, '/AppMaternidade/').versao
    expect(calcularCasca(pasta, '/AppMaternidade/').versao).toBe(base)
    expect(base).toMatch(/^[0-9a-f]{16}$/)

    for (const arquivo of ['index.html', 'manifest.webmanifest', 'assets/index-ABC.js', 'assets/index-ABC.css', 'icones/icone-192.png']) {
      dist()
      gravar(arquivo, 'um byte a mais!')
      expect(calcularCasca(pasta, '/AppMaternidade/').versao, arquivo).not.toBe(base)
    }
  })

  it('muda quando um arquivo entra ou sai da lista, mas não com o 404.html nem com o sw.js', () => {
    dist()
    const base = calcularCasca(pasta, '/').versao
    gravar('assets/novo.js', 'x')
    expect(calcularCasca(pasta, '/').versao).not.toBe(base)

    dist()
    rmSync(join(pasta, 'assets/novo.js'))
    gravar('404.html', 'outro conteúdo')
    gravar('sw.js', '// outro')
    expect(calcularCasca(pasta, '/').versao).toBe(base)
  })

  it('muda com o subcaminho', () => {
    dist()
    expect(calcularCasca(pasta, '/').versao).not.toBe(calcularCasca(pasta, '/AppMaternidade/').versao)
  })
})

describe('o nome do cache', () => {
  it('leva o prefixo deste site (com o subcaminho) e a versão', () => {
    const config = { subcaminho: '/AppMaternidade/', versao: 'abc123' }
    expect(PREFIXO_DO_CACHE).toBe('appmaternidade-casca')
    expect(nomeDoCache(config)).toBe('appmaternidade-casca:/AppMaternidade/:abc123')
  })

  it('o prefixo de um subcaminho nunca é prefixo do nome de outro', () => {
    const a = nomeDoCache({ subcaminho: '/', versao: 'v1' })
    const b = nomeDoCache({ subcaminho: '/AppMaternidade/', versao: 'v1' })
    expect(b.startsWith('appmaternidade-casca:/:')).toBe(false)
    expect(a.startsWith('appmaternidade-casca:/AppMaternidade/:')).toBe(false)
  })
})
