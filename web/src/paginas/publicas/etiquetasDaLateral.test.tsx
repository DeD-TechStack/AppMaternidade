import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { pastaSrcDe } from '../../teste/fontes.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// Volta visual 1, N3 (prova de ampliação, PUB-10): com a fonte raiz em 200% a etiqueta "Cuidado compartilhado" da
// lateral do Sobre (c9–c10) ficava fora da janela, porque a `Etiqueta` da base não quebra linha (`nowrap`, altura
// fixa de 26 px). A classe é "toda etiqueta da lateral de uma página pública quebra linha dentro da coluna":
// Sobre, Cuidado compartilhado, Desenvolvimento e qualquer página que passe `etiquetas` à `AberturaPublica`.
// O jsdom não calcula layout nem lê o `index.css`: a regra é lida do bloco MAT-36 do arquivo; a medida com a fonte
// em 200%, em 1440 e em 390, é do navegador.

const NOVAS = [
  '/como-funciona',
  '/cuidado-compartilhado',
  '/desenvolvimento',
  '/regras-da-comunidade',
  '/privacidade',
  '/termos',
  '/exclusao-de-conta',
  '/contato',
  '/sobre',
]
const COM_ETIQUETAS = ['/cuidado-compartilhado', '/desenvolvimento', '/sobre']

interface Regra {
  seletor: string
  corpo: string
  /** Os `@media`/`@layer` que envolvem a regra, de fora para dentro. */
  condicao: string[]
}

function lerRegras(texto: string): Regra[] {
  const sem = texto.replace(/\/\*[\s\S]*?\*\//g, '')
  const regras: Regra[] = []
  const pilha: Array<{ pre: string; filhos: number }> = []
  let atual = ''
  for (const caractere of sem) {
    if (caractere === '{') {
      pilha.push({ pre: atual.trim(), filhos: 0 })
      atual = ''
    } else if (caractere === '}') {
      const topo = pilha.pop()!
      if (topo.filhos === 0) {
        regras.push({ seletor: topo.pre, corpo: atual, condicao: pilha.map((p) => p.pre).filter((p) => p.startsWith('@')) })
      }
      if (pilha.length > 0) pilha[pilha.length - 1].filhos += 1
      atual = ''
    } else {
      atual += caractere
    }
  }
  return regras
}

const css = readFileSync(pastaSrcDe(import.meta.url) + '../../index.css', 'utf8')
const regrasDoBloco = lerRegras(css.slice(css.indexOf('/* MAT-36: páginas públicas */')))

/** A regra do bloco que dá a quebra de linha à etiqueta da lateral (a que tem `white-space: normal`). */
const regrasDaQuebra = regrasDoBloco.filter((r) => /white-space:\s*normal/.test(r.corpo) && r.seletor.includes('sb-abertura-lateral'))

async function abrir(caminho: string): Promise<HTMLElement> {
  cleanup()
  const { container } = renderizarRota(caminho)
  await screen.findAllByRole('heading', { level: 1 })
  return container
}

describe('N3: a etiqueta da lateral quebra linha em vez de passar da coluna', () => {
  it('há uma só regra do bloco MAT-36 que faz a etiqueta da lateral quebrar linha, sem condição de janela', () => {
    expect(regrasDaQuebra).toHaveLength(1)
    const [regra] = regrasDaQuebra
    // Vale em qualquer largura e em qualquer tamanho de fonte: só `@layer`, nunca `@media`.
    expect(regra.condicao.filter((c) => !c.startsWith('@layer'))).toEqual([])
    expect(regra.seletor).toMatch(/\.vp-pagina\s+\.sb-abertura-lateral/)
    // A regra é da classe, não de uma página: nada de atributo, posição ou nome de página no seletor.
    expect(regra.seletor).not.toMatch(/\[|:nth|:first|:last|sobre|cuidado|desenvolvimento/i)
  })

  it('a regra quebra a etiqueta dentro da coluna: largura máxima 100%, linha normal, palavra comprida quebra, altura cresce', () => {
    const { corpo } = regrasDaQuebra[0]
    expect(corpo).toMatch(/max-width:\s*100%/)
    expect(corpo).toMatch(/white-space:\s*normal/)
    expect(corpo).toMatch(/overflow-wrap:\s*(anywhere|break-word)/)
    // Em fonte normal a etiqueta de uma linha continua com 26 px: a altura fixa vira `auto` com mínimo de 26.
    expect(corpo).toMatch(/height:\s*auto/)
    expect(corpo).toMatch(/min-height:\s*26px/)
  })

  it('a regra não esconde texto nem muda o tipo: sem overflow, line-clamp, ellipsis, font-size nem caixa alta', () => {
    for (const { corpo } of regrasDoBloco.filter((r) => r.seletor.includes('vp-etiqueta-item') || regrasDaQuebra.includes(r))) {
      expect(corpo).not.toMatch(/overflow\s*:|overflow-x|overflow-y/)
      expect(corpo).not.toMatch(/line-clamp|text-overflow/)
      expect(corpo).not.toMatch(/font-size|text-transform|letter-spacing/)
    }
  })

  it('o item da lateral mantém os 32 px da base quando a etiqueta cabe em uma linha e cresce, com respiro, quando ela quebra', () => {
    const item = regrasDoBloco.filter((r) => r.seletor === '.vp-pagina .sb-abertura-lateral > .vp-etiqueta-item')
    expect(item).toHaveLength(1)
    // 3 + 26 + 3 = 32 (a base tem `min-height: 32px` e `box-sizing` herdado de `*`): um respiro que cresce com a etiqueta.
    expect(item[0].corpo).toMatch(/padding-block:\s*3px/)
    expect(item[0].corpo).toMatch(/box-sizing:\s*border-box/)
    expect(item[0].corpo).toMatch(/min-width:\s*0/)
    expect(item[0].condicao.filter((c) => !c.startsWith('@layer'))).toEqual([])
  })

  it('o seletor da regra acerta toda etiqueta da lateral das 9 páginas (Sobre, Cuidado e Desenvolvimento) e nenhum outro nó', async () => {
    const seletor = regrasDaQuebra[0].seletor
    let total = 0
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      const lateral = [...container.querySelectorAll('main .sb-abertura-lateral .sb-etiqueta')]
      const acertadas = [...container.querySelectorAll(seletor)]
      expect(acertadas, caminho).toEqual(lateral)
      for (const etiqueta of acertadas) {
        expect(etiqueta.classList.contains('sb-etiqueta'), caminho).toBe(true)
        expect(etiqueta.closest('main')!.classList.contains('vp-pagina'), caminho).toBe(true)
      }
      if (COM_ETIQUETAS.includes(caminho)) expect(acertadas.length, caminho).toBeGreaterThan(0)
      else expect(acertadas.length, caminho).toBe(0)
      total += acertadas.length
    }
    expect(total).toBeGreaterThanOrEqual(9)
  }, 30000)

  it('as páginas com etiquetas usam o mesmo componente da base, num item `vp-etiqueta-item` da lateral c9–c10', async () => {
    for (const caminho of COM_ETIQUETAS) {
      const container = await abrir(caminho)
      const etiquetas = [...container.querySelectorAll('main .sb-etiqueta')]
      expect(etiquetas.length, caminho).toBeGreaterThan(0)
      for (const etiqueta of etiquetas) {
        // A `Etiqueta` da base: `span.sb-etiqueta.t-ui`, sem classe própria da página nem estilo em linha.
        expect(etiqueta.tagName, caminho).toBe('SPAN')
        expect(etiqueta.className, caminho).toBe('sb-etiqueta t-ui')
        expect(etiqueta.hasAttribute('style'), caminho).toBe(false)
        const item = etiqueta.parentElement!
        expect(item.tagName, caminho).toBe('LI')
        expect(item.classList.contains('vp-etiqueta-item'), caminho).toBe(true)
        expect(item.parentElement!.matches('ul.sb-abertura-lateral.col-c9-c10'), caminho).toBe(true)
      }
    }
  }, 30000)

  it('o Início (outro cartão) não é tocado: o seletor da regra não acerta nenhuma etiqueta dele', async () => {
    const container = await abrir('/')
    expect(container.querySelectorAll('.sb-etiqueta').length).toBeGreaterThan(0)
    expect(container.querySelectorAll(regrasDaQuebra[0].seletor)).toHaveLength(0)
  }, 30000)
})
