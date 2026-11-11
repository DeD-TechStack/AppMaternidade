import { readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PALETA } from '../conteudo/sistema.ts'
import { listarFontes } from './fontes.ts'

// As portas determinísticas do DESIGN.md "Campo de mel" (.oc/contrato/DESIGN.md, seção 8), sobre o
// código-fonte do produto (sem os testes). Substitui o antigo web/src/estilo.test.ts (MAT-49a).
// Lidos do disco: no Vitest, importar CSS não devolve o texto do arquivo. O Vitest roda em web/ (e,
// no jsdom, o `import.meta.url` de um arquivo em teste/ não é uma URL file:), então a pasta vem do cwd.
const pastaWeb = process.cwd()
const pastaSrc = join(pastaWeb, 'src') + sep
const lerTexto = (relativo: string) => readFileSync(pastaSrc + relativo, 'utf8')
const tokensCss = lerTexto('styles/tokens.css')
const temaCss = lerTexto('styles/tema.css')
const indexCss = lerTexto('index.css')
const pacote = JSON.parse(readFileSync(join(pastaWeb, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>
}

const semComentariosCss = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '')
const semComentariosTs = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')

// Os arquivos marcados para apagar (MAT-49a) ficam de fora: só têm um comentário e `export {}`.
const produto = listarFontes(pastaSrc).filter((f) => !f.texto.startsWith('// APAGAR') && !f.texto.startsWith('/* APAGAR'))
const css = produto.filter((f) => f.nome.endsWith('.css')).map((f) => ({ ...f, limpo: semComentariosCss(f.texto) }))
const ts = produto.filter((f) => /\.tsx?$/.test(f.nome)).map((f) => ({ ...f, limpo: semComentariosTs(f.texto) }))
const todos = [...css, ...ts]

/** As declarações `propriedade: valor` de um CSS. */
function declaracoes(texto: string): Array<{ propriedade: string; valor: string }> {
  return [...texto.matchAll(/(?:^|[;{\s])(-{0,2}[a-z][a-z0-9-]*)\s*:\s*([^;{}]+);/g)].map(([, propriedade, valor]) => ({
    propriedade,
    valor: valor.trim(),
  }))
}

// Os 12 papéis da seção 1, com o hexadecimal do contrato.
const PAPEIS: Record<string, string> = {
  papel: '#F8F6EB',
  mel: '#F2C14E',
  'mel-claro': '#F7D684',
  oliva: '#697255',
  'oliva-tinta': '#4F5740',
  cacau: '#2B2320',
  areia: '#EADDC5',
  'texto-2': '#6E6560',
  branco: '#FFFFFF',
  noite: '#2B2320',
  'noite-cartao': '#3A302B',
  'noite-2': '#B9C09F',
}

describe('tokens (DESIGN.md 1 a 3)', () => {
  it('tokens.css declara os 12 papéis com o hexadecimal do contrato', () => {
    for (const [papel, hex] of Object.entries(PAPEIS)) {
      const valor = new RegExp(`--color-${papel}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(tokensCss)?.[1]
      expect(valor?.toUpperCase(), papel).toBe(hex)
    }
  })

  it('a paleta mostrada na /sistema é a mesma de tokens.css, papel por papel', () => {
    expect(PALETA.map((p) => p.token).sort()).toEqual(Object.keys(PAPEIS).sort())
    for (const papel of PALETA) expect(`#${papel.hex}`, papel.token).toBe(PAPEIS[papel.token])
  })

  it('as duas sombras e os dois gradientes têm os valores do contrato, letra por letra', () => {
    expect(tokensCss).toContain('--sombra-flutuante: 0 2px 4px rgb(43 35 32 / .08), 0 18px 40px rgb(43 35 32 / .16);')
    expect(tokensCss).toContain('--sombra-cartao: 0 1px 2px rgb(43 35 32 / .06), 0 8px 24px rgb(43 35 32 / .06);')
    expect(tokensCss).toContain('--luz-estudio: radial-gradient(120% 90% at 15% 10%, #F7D684 0%, #F2C14E 60%);')
    expect(tokensCss).toContain('--brilho-mel: radial-gradient(closest-side, rgb(242 193 78 / .22), transparent);')
  })

  it('os raios são os do contrato: painel 24, cartão 20, pílula 999, campo 14', () => {
    expect(tokensCss).toMatch(/--radius-painel:\s*24px/)
    expect(tokensCss).toMatch(/--radius-cartao:\s*20px/)
    expect(tokensCss).toMatch(/--radius-pilula:\s*999px/)
    expect(tokensCss).toMatch(/--radius-campo:\s*14px/)
  })

  it('a madrugada troca o fundo pela noite, os cartões pelo cartão da noite e mantém o destaque mel', () => {
    const bloco = /:root\[data-tema='madrugada'\]\s*\{([\s\S]*?)\n\}/.exec(temaCss)?.[1] ?? ''
    expect(bloco).toMatch(/--cor-fundo:\s*var\(--color-noite\)/)
    expect(bloco).toMatch(/--cor-cartao:\s*var\(--color-noite-cartao\)/)
    expect(bloco).toMatch(/--cor-texto-2:\s*var\(--color-noite-2\)/)
    expect(bloco).toMatch(/--cor-destaque:\s*var\(--color-mel\)/)
  })

  it('o fundo da página é o papel', () => {
    expect(temaCss).toMatch(/--cor-fundo:\s*var\(--color-papel\)/)
    expect(indexCss).toMatch(/body\s*\{[^}]*background-color:\s*var\(--cor-fundo\)/)
  })
})

describe('tipo: duas famílias só (DESIGN.md 2 e 8)', () => {
  const GENERICAS = new Set(['serif', 'sans-serif', 'system-ui'])

  it('toda pilha de fontes do CSS do produto é Literata ou Outfit, com genéricas só de reserva', () => {
    const familias = new Set<string>()
    for (const arquivo of css) {
      for (const { propriedade, valor } of declaracoes(arquivo.limpo)) {
        if (propriedade !== 'font-family' && !/^--(font|fonte|default)-/.test(propriedade)) continue
        if (/^--font-weight|font-feature|font-variation/.test(propriedade)) continue
        for (const parte of valor.split(',').map((p) => p.trim().replace(/^['"]|['"]$/g, ''))) {
          if (parte.startsWith('var(') || parte === 'inherit' || parte === 'initial') continue
          familias.add(parte)
        }
      }
    }
    const nomeadas = [...familias].filter((f) => !GENERICAS.has(f))
    expect(nomeadas.sort()).toEqual(['Literata Variable', 'Outfit Variable'])
  })

  it('nenhum monospace e nenhuma família fora do tema, nem no CSS nem nos componentes', () => {
    for (const arquivo of todos) expect(arquivo.limpo, arquivo.nome).not.toMatch(/monospace/)
    for (const arquivo of ts) expect(arquivo.limpo, arquivo.nome).not.toMatch(/fontFamily|font-\[|font-mono/)
  })

  it('as fontes vêm do @fontsource-variable (Literata reta e itálica, Outfit), e as quatro antigas saíram', () => {
    expect(indexCss).toContain("@import '@fontsource-variable/literata/wght.css';")
    expect(indexCss).toContain("@import '@fontsource-variable/literata/wght-italic.css';")
    expect(indexCss).toContain("@import '@fontsource-variable/outfit/wght.css';")
    const dependencias = Object.keys(pacote.dependencies).join(' ')
    for (const antiga of ['fraunces', 'instrument-sans', 'instrument-serif', 'zilla-slab']) {
      expect(dependencias, antiga).not.toContain(antiga)
      for (const arquivo of todos) expect(arquivo.limpo.toLowerCase(), arquivo.nome).not.toContain(antiga)
    }
  })

  it('as famílias padrão do Tailwind (sans, serif, mono) apontam para as duas do site', () => {
    expect(tokensCss).toMatch(/--font-sans:\s*var\(--font-texto\)/)
    expect(tokensCss).toMatch(/--font-serif:\s*var\(--font-titulo\)/)
    expect(tokensCss).toMatch(/--font-mono:\s*var\(--font-texto\)/)
    expect(tokensCss).toMatch(/--default-mono-font-family:\s*var\(--font-texto\)/)
  })

  it('nenhum rótulo em caixa alta', () => {
    for (const arquivo of css) expect(arquivo.limpo, arquivo.nome).not.toMatch(/text-transform:\s*uppercase/)
    for (const arquivo of ts) expect(arquivo.limpo, arquivo.nome).not.toMatch(/\buppercase\b/)
  })
})

describe('cor só dos tokens (DESIGN.md 8)', () => {
  it('nenhum hexadecimal, rgb() ou hsl() solto fora de styles/tokens.css', () => {
    const soltos: string[] = []
    for (const arquivo of todos) {
      if (arquivo.nome === 'styles/tokens.css') continue
      for (const [achado] of arquivo.limpo.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/g)) {
        soltos.push(`${arquivo.nome}: ${achado}`)
      }
    }
    expect(soltos).toEqual([])
  })
})

describe('sombra, gradiente e filtro só pelos tokens (DESIGN.md 3 e 8)', () => {
  it('box-shadow só com var(--sombra-flutuante) ou var(--sombra-cartao)', () => {
    for (const arquivo of css) {
      for (const { propriedade, valor } of declaracoes(arquivo.limpo)) {
        if (propriedade !== 'box-shadow') continue
        expect(valor, arquivo.nome).toMatch(/^(none|var\(--sombra-(flutuante|cartao)\))$/)
      }
    }
    for (const arquivo of ts) expect(arquivo.limpo, arquivo.nome).not.toMatch(/\bshadow-|boxShadow|drop-shadow/)
  })

  it('gradiente só nas declarações de tokens.css; fora dele, só var(--luz-estudio) ou var(--brilho-mel)', () => {
    for (const arquivo of todos) {
      if (arquivo.nome === 'styles/tokens.css') continue
      expect(arquivo.limpo, arquivo.nome).not.toMatch(/-gradient\(|bg-gradient|bg-linear|bg-radial/)
    }
    for (const arquivo of css) {
      for (const { propriedade, valor } of declaracoes(arquivo.limpo)) {
        if (propriedade !== 'background-image' && propriedade !== 'background') continue
        if (!/var\(--(luz|brilho)/.test(valor)) continue
        expect(valor, arquivo.nome).toMatch(/^var\(--(luz-estudio|brilho-mel)\)$/)
      }
    }
  })

  it('nenhum filtro nem desfoque', () => {
    for (const arquivo of css) {
      for (const { propriedade } of declaracoes(arquivo.limpo)) {
        expect(propriedade, arquivo.nome).not.toMatch(/^(-webkit-)?(backdrop-)?filter$/)
      }
    }
    for (const arquivo of todos) expect(arquivo.limpo, arquivo.nome).not.toMatch(/\bblur\b|backdrop-|filter:/)
  })

  it('nada de 3D: perspective, rotateX, rotateY e preserve-3d não aparecem no código do site', () => {
    for (const arquivo of todos) {
      expect(arquivo.limpo, arquivo.nome).not.toMatch(/perspective|rotateX|rotateY|rotate-x|rotate-y|preserve-3d|transform-3d/)
    }
  })

  it('nenhuma ilustração desenhada em código: nenhum <svg>, <path> ou <circle> escrito à mão', () => {
    for (const arquivo of ts) expect(arquivo.limpo, arquivo.nome).not.toMatch(/<svg|<path|<circle|<ellipse/)
  })
})

describe('movimento reduzido (DESIGN.md 5)', () => {
  it('o CSS desliga animações e transições com prefers-reduced-motion', () => {
    expect(indexCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{\s*animation: none !important;\s*transition: none !important;/,
    )
  })

  it('o letreiro dos selos dura 60 s e, com movimento reduzido, para e esconde a cópia e o botão', () => {
    const campo = css.find((f) => f.nome === 'styles/campo.css')!.limpo
    expect(campo).toMatch(/\.cm-selos-trilho\s*\{[^}]*animation:\s*cm-letreiro 60s linear infinite/)
    const reduzido = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n {2}\}/.exec(campo)?.[1] ?? ''
    expect(reduzido).toMatch(/\.cm-selos-trilho\s*\{[^}]*animation:\s*none/)
    expect(reduzido).toMatch(/\.cm-selos-lista\[aria-hidden='true'\]/)
    expect(reduzido).toMatch(/\.cm-selos-pausa/)
  })
})
