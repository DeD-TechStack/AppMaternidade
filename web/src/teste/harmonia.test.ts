import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// H:RF-01 e H:RF-02 da SPEC H: web/DESIGN.md é a fonte única de espaço, tipo e contêiner, e
// src/styles/harmonia.gerado.css é gerado dele por scripts/gerar-tema.mjs. Este arquivo roda no `npm run test`
// (e por isso no `check`): se alguém editar o DESIGN.md sem rodar `npm --prefix web run tema` (ou editar o
// arquivo gerado à mão), a deriva abaixo falha.
// O Vitest roda em web/; o gerador roda num processo próprio (o mesmo script do `npm run tema`), para o teste
// não ter uma segunda cópia da conta e para o TypeScript não precisar de tipos do .mjs.
const pastaWeb = process.cwd()
const lerTexto = (relativo: string) => readFileSync(join(pastaWeb, relativo), 'utf8').replaceAll('\r\n', '\n')
const gerador = (...argumentos: string[]) =>
  execFileSync(process.execPath, [join(pastaWeb, 'scripts', 'gerar-tema.mjs'), ...argumentos], { cwd: pastaWeb, encoding: 'utf8' })

interface Tipografia {
  fontFamily: string
  fontSize: string
  fontWeight: number
  lineHeight: string
}
interface FrontMatter {
  colors: Record<string, string>
  typography: Record<string, Tipografia>
  spacing: Record<string, string>
  rounded: Record<string, string>
}
const front = JSON.parse(gerador('--json')) as FrontMatter

const PAPEIS = ['junto', 'pilha', 'grupo', 'bloco', 'midia', 'secao', 'secao-ampla', 'painel']
const NIVEIS = ['exibicao', 'titulo-1', 'titulo-2', 'titulo-3', 'titulo-4', 'abertura', 'corpo', 'pequeno', 'sobretitulo']
const CORES = ['papel', 'mel', 'mel-claro', 'oliva', 'oliva-tinta', 'cacau', 'areia', 'texto-2', 'branco', 'noite', 'noite-cartao', 'noite-2']

describe('harmonia: tema gerado do DESIGN.md (H:RF-02)', () => {
  it('deriva: gerar de novo a partir do DESIGN.md dá exatamente o harmonia.gerado.css gravado', () => {
    const novo = gerador('--stdout').replaceAll('\r\n', '\n')
    expect(lerTexto('src/styles/harmonia.gerado.css'), 'rode: npm --prefix web run tema').toBe(novo)
  })

  it('o src/index.css importa o tema gerado, uma vez, logo depois do tokens.css', () => {
    const indice = lerTexto('src/index.css')
    expect(indice.match(/harmonia\.gerado\.css/g)).toHaveLength(1)
    expect(indice).toContain("@import './styles/tokens.css';\n@import './styles/harmonia.gerado.css';")
  })

  it('o gerador não escreve nada que já exista no tokens.css (cor, raio, fonte, sombra)', () => {
    const gerado = lerTexto('src/styles/harmonia.gerado.css')
    expect(gerado).not.toMatch(/--(color|radius|font|default|sombra|luz|brilho|cor)-/)
    expect(gerado).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/)
  })
})

describe('harmonia: o front matter do DESIGN.md (H:RF-01)', () => {
  it('as 12 cores nomeadas são as de tokens.css, papel por papel', () => {
    const tokens = lerTexto('src/styles/tokens.css')
    const doCss = new Map(
      [...tokens.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, nome, hex]) => [nome, hex.toUpperCase()] as const),
    )
    expect([...doCss.keys()].sort()).toEqual([...CORES].sort())
    expect(Object.keys(front.colors).sort()).toEqual([...CORES].sort())
    for (const nome of CORES) expect(front.colors[nome].toUpperCase(), nome).toBe(doCss.get(nome))
  })

  it('os raios são os de tokens.css: painel 24, cartão 20, pílula 999, campo 14', () => {
    const tokens = lerTexto('src/styles/tokens.css')
    for (const [nome, valor] of Object.entries(front.rounded)) {
      expect(tokens, nome).toMatch(new RegExp(`--radius-${nome}:\\s*${valor}\\s*;`))
    }
    expect(Object.keys(front.rounded).sort()).toEqual(['campo', 'cartao', 'painel', 'pilula'])
  })

  it('tem os 16 tokens de espaço dos 8 papéis e os 5 do quadro e dos contêineres', () => {
    for (const papel of PAPEIS) {
      expect(front.spacing[`${papel}-390`], `${papel}-390`).toMatch(/^\d+px$/)
      expect(front.spacing[`${papel}-1440`], `${papel}-1440`).toMatch(/^\d+px$/)
    }
    expect(front.spacing['quadro-largura']).toBe('1200px')
    expect(front.spacing['quadro-calha-390']).toBe('20px')
    expect(front.spacing['quadro-calha-1440']).toBe('32px')
    expect(front.spacing.medio).toBe('880px')
    expect(front.spacing.leitura).toBe('640px')
    expect(Object.keys(front.spacing)).toHaveLength(PAPEIS.length * 2 + 5)
  })

  it('tem os 18 tokens de tipo dos 9 níveis, com a família e o peso da SPEC H e nada menor que 15 px', () => {
    const familia = (nivel: string) => (nivel.startsWith('exibicao') || nivel.startsWith('titulo') ? 'Literata' : 'Outfit')
    const peso = (nivel: string) => (nivel === 'sobretitulo' ? 600 : familia(nivel) === 'Literata' ? 600 : 400)
    for (const nivel of NIVEIS) {
      for (const largura of ['390', '1440']) {
        const token = front.typography[`${nivel}-${largura}`]
        expect(token, `${nivel}-${largura}`).toBeDefined()
        expect(token.fontFamily, `${nivel}-${largura} família`).toBe(familia(nivel))
        expect(token.fontWeight, `${nivel}-${largura} peso`).toBe(peso(nivel))
        expect(Number.parseFloat(token.fontSize), `${nivel}-${largura} tamanho`).toBeGreaterThanOrEqual(15)
        expect(Number.parseFloat(token.lineHeight), `${nivel}-${largura} entrelinha`).toBeGreaterThan(Number.parseFloat(token.fontSize))
      }
    }
    expect(Object.keys(front.typography)).toHaveLength(NIVEIS.length * 2)
  })

  it('a escala não cresce para trás: o valor de 1440 nunca é menor que o de 390', () => {
    for (const papel of PAPEIS) {
      expect(Number.parseFloat(front.spacing[`${papel}-1440`]), papel).toBeGreaterThanOrEqual(Number.parseFloat(front.spacing[`${papel}-390`]))
    }
    for (const nivel of NIVEIS) {
      expect(Number.parseFloat(front.typography[`${nivel}-1440`].fontSize), nivel).toBeGreaterThanOrEqual(Number.parseFloat(front.typography[`${nivel}-390`].fontSize))
    }
  })
})
