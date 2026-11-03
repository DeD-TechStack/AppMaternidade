import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Lidos do disco: no Vitest, importar CSS (mesmo com ?raw) não devolve o texto do arquivo.
const lerTexto = (relativo: string) => readFileSync(new URL(relativo, import.meta.url), 'utf8')
const tokensCss = lerTexto('./styles/tokens.css')
const estiloGlobal = lerTexto('./index.css')
const indexHtml = lerTexto('../index.html')

function lerTokens(css: string): Record<string, string> {
  const bloco = /@theme\s*\{([^}]*)\}/.exec(css)
  if (!bloco) throw new Error('bloco @theme não encontrado em tokens.css')
  const cores: Record<string, string> = {}
  for (const [, nome, hex] of bloco[1].matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    cores[nome] = hex
  }
  return cores
}

// Luminância relativa da WCAG 2.x (sRGB).
function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (clara + 0.05) / (escura + 0.05)
}

describe('tokens de cor', () => {
  const cores = lerTokens(tokensCss)

  it('começa pelo comentário de tokens provisórios', () => {
    expect(tokensCss.startsWith('/* Tokens provisórios; a MAT-34 substitui pelos do DESIGN.md */')).toBe(true)
  })

  it('tem os quatro tokens no bloco @theme', () => {
    expect(cores).toEqual({
      papel: '#F6F1E9',
      tinta: '#1F1B16',
      destaque: '#A64B24',
      linha: '#D9CFC2',
    })
  })

  for (const texto of ['tinta', 'destaque']) {
    it(`${texto} sobre papel tem contraste de pelo menos 4,5`, () => {
      const valor = contraste(cores[texto], cores.papel)
      console.log(`contraste ${texto} sobre papel: ${valor.toFixed(2)}`)
      expect(valor).toBeGreaterThanOrEqual(4.5)
    })
  }
})

describe('CSS global', () => {
  it('aplica papel e tinta ao body', () => {
    const body = /(?:^|[\s}])body\s*\{([^}]*)\}/.exec(estiloGlobal)
    expect(body).not.toBeNull()
    expect(body![1]).toMatch(/background-color:\s*var\(--color-papel\)/)
    expect(body![1]).toMatch(/(?:^|[\s;])color:\s*var\(--color-tinta\)/)
  })
})

describe('index.html', () => {
  it('declara o idioma e o título', () => {
    expect(indexHtml).toContain('lang="pt-BR"')
    expect(indexHtml).toContain('<title>AppMaternidade</title>')
  })
})
