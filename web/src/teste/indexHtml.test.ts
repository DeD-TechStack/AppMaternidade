import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// PA-03: o <head> do index.html (que o 404.html copia no build) é o que a aba, a prévia de link e os
// buscadores leem. Descreve o produto, não um protótipo, avisa que os dados são fictícios e pede para não
// indexar a demonstração. Lido do disco como texto; o Vitest roda em web/, então o caminho vem do cwd.
// INDEX_HTML_ALVO troca o arquivo lido (controle negativo numa cópia de rascunho); arquivo ausente quebra o teste.
const caminho = process.env.INDEX_HTML_ALVO ?? join(process.cwd(), 'index.html')
const html = readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')
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

  it('pede aos buscadores para não indexar a demonstração', () => {
    expect(meta('meta[name="robots"]')).toBe('noindex, nofollow')
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
    expect(meta('meta[name="robots"]')).toBe('noindex, nofollow')
  })
})
