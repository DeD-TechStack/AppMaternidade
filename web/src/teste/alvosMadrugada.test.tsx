import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// G11 na madrugada: todo link e botão do conteúdo da Rotina tem pelo menos 44 de largura e 56 de altura. O jsdom
// não mede layout: o teste lê o texto das regras. Hoje e Sessão montam um `<main>` sem `.rotina-principal`
// (só `data-tela`), então a regra precisa nomear as três entradas.

const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** Cada regra de topo `seletor { corpo }` (sem aninhamento) do `index.css`, sem comentários. */
const regras = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, corpo]) => ({
  seletor: seletor.trim().replace(/\s+/g, ' '),
  corpo: corpo.replace(/\s+/g, ' ').trim(),
}))

const daMadrugada = regras.filter((r) => r.seletor.startsWith(":root[data-tema='madrugada'] main"))

describe('alvos de toque da madrugada na Rotina (G11)', () => {
  const alvos = daMadrugada.find((r) => /:is\(a, button/.test(r.seletor))

  it('existe uma regra da madrugada para a, button e controles do conteúdo da Rotina', () => {
    expect(alvos).toBeDefined()
  })

  it('a regra alcança o main do Hoje, o da Sessão e o das telas com .rotina-principal', () => {
    const seletor = alvos?.seletor ?? ''
    expect(seletor).toContain('.rotina-principal')
    expect(seletor).toContain("[data-tela='hoje']")
    expect(seletor).toContain("[data-tela='sessao']")
  })

  it('a regra dá 56 px de altura (var(--alvo-toque)) e 44 px de largura mínima', () => {
    const corpo = alvos?.corpo ?? ''
    expect(corpo).toMatch(/min-height:\s*(var\(--alvo-toque\)|3\.5rem|56px)/)
    expect(corpo).toMatch(/min-width:\s*(2\.75rem|44px)/)
  })

  it('o link esticado reparte os 56 px em padding e margem negativa, e a linha mantém a altura de 25 px', () => {
    const esticado = daMadrugada.find((r) => r.seletor.endsWith('.rotina-link-esticado'))
    expect(esticado).toBeDefined()
    expect(esticado?.seletor).toContain("[data-tela='hoje']")
    expect(esticado?.corpo).toContain('margin-block: calc((1.5625rem - var(--alvo-toque)) / 2)')
    expect(esticado?.corpo).toContain('padding-block: calc((var(--alvo-toque) - 1.5625rem) / 2)')
  })

  it('nenhuma regra desta família vale fora da madrugada nem mexe em cor, texto ou fonte', () => {
    for (const regra of daMadrugada) {
      expect(regra.seletor.startsWith(":root[data-tema='madrugada']")).toBe(true)
      expect(regra.corpo).not.toMatch(/(^|;|\s)(color|background|font|content)/)
    }
  })
})
