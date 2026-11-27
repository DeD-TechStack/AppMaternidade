import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { describe, expect, it } from 'vitest'

// PA-03: a origem da página é escolhida pelo chamador, nunca pelas tags encontradas.
// INDEX_HTML_DESTINO: source, root, 404 ou preview; INDEX_HTML_ALVO: caminho do HTML correspondente.
// No Pages, "404" é o documento de fallback da raiz, não o 404.html que despacha raiz/prévia.
const destinos = {
  source: { arquivo: 'index.html', entrada: /^\/src\/main\.tsx$/ },
  root: { arquivo: 'index.html', entrada: /^\/AppMaternidade\/assets\/index-[^/]+\.js$/ },
  '404': { arquivo: '404.html', entrada: /^\/AppMaternidade\/assets\/index-[^/]+\.js$/ },
  preview: { arquivo: 'index.html', entrada: /^\/AppMaternidade\/previa\/assets\/index-[^/]+\.js$/ },
} as const
const { INDEX_HTML_DESTINO, INDEX_HTML_ALVO, npm_lifecycle_event } = process.env
// O npm test sem destino verifica o fonte; chamadas de artefato precisam informar o par.
const fontePadrao = npm_lifecycle_event === 'test'
  && INDEX_HTML_DESTINO === undefined && INDEX_HTML_ALVO === undefined
const destino = fontePadrao ? 'source' : INDEX_HTML_DESTINO
if (destino !== 'source' && destino !== 'root' && destino !== '404' && destino !== 'preview') {
  throw new Error('INDEX_HTML_DESTINO deve ser source, root, 404 ou preview')
}
const caminho = fontePadrao ? 'index.html' : INDEX_HTML_ALVO
if (!caminho?.trim()) throw new Error('INDEX_HTML_ALVO deve indicar o arquivo HTML do destino')
const esperado = destinos[destino]
if (basename(caminho) !== esperado.arquivo) {
  throw new Error(`INDEX_HTML_ALVO para ${destino} deve apontar para ${esperado.arquivo}`)
}
const html = readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')
if (!html.trim()) throw new Error('INDEX_HTML_ALVO aponta para HTML vazio')
const doc = new DOMParser().parseFromString(html, 'text/html')

function meta(seletor: string): string | null {
  const elementos = doc.head.querySelectorAll(seletor)
  expect(elementos.length, `${seletor} aparece uma vez só`).toBeLessThanOrEqual(1)
  return elementos[0]?.getAttribute('content') ?? null
}

describe('metadados do index.html (PA-03)', () => {
  it('mantém lang="pt-BR" e o título "AppMaternidade"', () => {
    expect(doc.documentElement.getAttribute('lang')).toBe('pt-BR')
    expect(doc.title).toBe('AppMaternidade')
  })

  it('a descrição não fala em protótipo, tem 50 a 160 caracteres e diz que os dados são fictícios', () => {
    const descricao = meta('meta[name="description"]')
    expect(descricao).not.toBeNull()
    expect(descricao).not.toMatch(/prot[oó]tipo/iu)
    expect(descricao!.length).toBeGreaterThanOrEqual(50)
    expect(descricao!.length).toBeLessThanOrEqual(160)
    expect(descricao).toMatch(/dados fictícios/u)
  })

  it(`carrega a entrada esperada do destino ${destino}`, () => {
    const entradas = doc.querySelectorAll('script[type="module"][src]')
    expect(entradas, 'uma única entrada JavaScript').toHaveLength(1)
    expect(entradas[0]?.getAttribute('src'), `entrada do destino ${destino}`).toMatch(esperado.entrada)
  })

  it(`respeita a política de indexação do destino ${destino}`, () => {
    const robos = doc.querySelectorAll('meta[name="robots" i]')
    expect(robos, `meta robots no destino ${destino}`).toHaveLength(destino === 'preview' ? 1 : 0)
    if (destino === 'preview') {
      expect(doc.head.contains(robos[0]!), 'meta robots no <head>').toBe(true)
      expect(robos[0]?.getAttribute('content')).toBe('noindex, nofollow')
    }
  })

  it('tem og:title, og:description igual à descrição e og:type=website', () => {
    expect(meta('meta[property="og:title"]')).toBe('AppMaternidade')
    expect(meta('meta[property="og:description"]')).toBe(meta('meta[name="description"]'))
    expect(meta('meta[property="og:type"]')).toBe('website')
  })

  it('avisa em um <noscript> antes de #root que o site precisa de JavaScript', () => {
    const avisos = doc.body.querySelectorAll('noscript')
    expect(avisos.length, 'um único <noscript> no body').toBe(1)
    const aviso = avisos[0]!
    const raiz = doc.body.querySelector('#root')
    expect(raiz).not.toBeNull()
    const filhos = Array.from(doc.body.children)
    expect(filhos.indexOf(aviso)).toBeGreaterThanOrEqual(0)
    expect(filhos.indexOf(aviso)).toBeLessThan(filhos.indexOf(raiz!))
    const texto = (aviso.textContent ?? '').trim()
    expect(texto).toMatch(/(?<![\p{L}])JavaScript(?![\p{L}])/u)
    expect(texto.split('.').length - 1, 'um ponto só').toBe(1)
    expect(texto.endsWith('.'), 'o ponto é o final').toBe(true)
    expect(texto.length).toBeLessThanOrEqual(80)
    expect(texto).not.toMatch(/prot[oó]tipo/iu)
  })
})
