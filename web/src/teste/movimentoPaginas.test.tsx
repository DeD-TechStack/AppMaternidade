import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

// MOTION-PAGES (.oc/CENAS.md, assinado): os seis tempos presos à rolagem das três páginas, só em CSS. O CSS de cada
// página importa o seu arquivo de movimento; tudo dele mora sob o @supports da linha do tempo e o
// prefers-reduced-motion: no-preference, para que sem suporte, ou com movimento reduzido, a página seja a base.
// O Vitest roda em web/.

const SRC = join(process.cwd(), 'src')
const semComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\r\n/g, '\n')
const ler = (caminho: string) => semComentarios(readFileSync(caminho, 'utf8'))

const SUPORTE = '@supports ((animation-timeline: view()) and (animation-range: 0% 100%))'
const SEM_REDUCAO = '@media (prefers-reduced-motion: no-preference)'

const PAGINAS = [
  { pagina: 'componentes/como-casa/como-casa.css', linhas: ['--cf-depois', '--cf-comecar'], molduras: ['.cf-colo', '.cf-passos'] },
  { pagina: 'componentes/cuidado-casa/cuidado-casa.css', linhas: ['--cc-sono', '--cc-senha'], molduras: ['.cc-meio-cena'] },
  { pagina: 'componentes/desenvolvimento-casa/desenvolvimento-casa.css', linhas: ['--dc-ideias', '--dc-fase'], molduras: ['.dc-familia', '.dc-fases'] },
]

/** O corpo entre a `{` que segue `inicio` e a `}` que a fecha, e o fim do bloco. */
function corpo(texto: string, inicio: number): { dentro: string; fim: number } {
  const abre = texto.indexOf('{', inicio)
  let fundo = 0
  for (let i = abre; i < texto.length; i += 1) {
    if (texto[i] === '{') fundo += 1
    else if (texto[i] === '}' && --fundo === 0) return { dentro: texto.slice(abre + 1, i), fim: i + 1 }
  }
  throw new Error('bloco sem fechamento')
}

/** Cada regra `seletor { declarações }` sem blocos dentro. */
const regras = (texto: string) => [...texto.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, decl]) => ({ seletor: seletor.trim(), decl }))

describe('MOTION-PAGES os seis tempos de CENAS.md', () => {
  for (const { pagina, linhas, molduras } of PAGINAS) {
    const css = ler(join(SRC, pagina))
    const importado = /@import\s+'([^']+)';/.exec(css)?.[1]
    const movimento = importado ? ler(join(SRC, dirname(pagina), importado)) : ''

    describe(pagina, () => {
      it('importa o seu arquivo de movimento, e a página em si não anima nem usa linha do tempo', () => {
        expect(importado).toMatch(/^\.\.\/\.\.\/movimento\/paginas\/[a-z]+\.css$/)
        expect(css).not.toMatch(/animation|@keyframes|view-timeline|transform\s*:/)
      })

      it('cada linha do tempo assinada existe, dentro do @supports e do prefers-reduced-motion: no-preference', () => {
        const inicio = movimento.indexOf(SUPORTE)
        expect(inicio, SUPORTE).toBeGreaterThanOrEqual(0)
        const suporte = corpo(movimento, inicio)
        // Nada fora do @supports.
        expect((movimento.slice(0, inicio) + movimento.slice(suporte.fim)).trim()).toBe('')
        // O @supports tem um bloco só: o no-preference, e nada fora dele.
        const dentro = suporte.dentro.trim()
        expect(dentro.startsWith(SEM_REDUCAO)).toBe(true)
        expect(corpo(dentro, 0).fim).toBe(dentro.length)
        for (const linha of linhas) {
          expect(dentro, linha).toMatch(new RegExp(`view-timeline-name:\\s*${linha};`))
          expect(dentro, linha).toMatch(new RegExp(`animation-timeline:\\s*${linha};`))
        }
        // As receitas do cartão: linear, fill both, duração auto, a faixa de entrada.
        expect(dentro).toMatch(/animation-timing-function:\s*linear;/)
        expect(dentro).toMatch(/animation-fill-mode:\s*both;/)
        expect(dentro).toMatch(/animation-duration:\s*auto;/)
        expect(dentro).toMatch(/animation-range:\s*entry \d+% entry \d+%;/)
        expect(dentro).not.toMatch(/animation\s*:/)
      })

      it('só transform: nenhum quadro-chave com opacity ou clip-path, e nada disso no arquivo', () => {
        const quadros = [...movimento.matchAll(/@keyframes\s+[\w-]+/g)]
        expect(quadros.length).toBeGreaterThan(0)
        for (const quadro of quadros) {
          const { dentro } = corpo(movimento, quadro.index ?? 0)
          expect(dentro).toMatch(/transform:/)
          expect(dentro).not.toMatch(/opacity|clip-path/)
        }
        expect(movimento).not.toMatch(/opacity|clip-path|transition|will-change/)
      })

      it('nenhuma moldura nomeada tem overflow: hidden', () => {
        for (const { seletor, decl } of [...regras(css), ...regras(movimento)]) {
          if (molduras.some((m) => seletor.includes(m))) expect(decl, seletor).not.toMatch(/overflow(?:-[xy])?\s*:\s*hidden/)
        }
      })
    })
  }
})
