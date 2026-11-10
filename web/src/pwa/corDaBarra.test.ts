import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { acompanharCorDaBarra } from './corDaBarra.ts'

// RF-09: o <meta name="theme-color"> segue o tema. As cores vêm do CSS (a variável de uso
// --cor-fundo, que o tema da madrugada troca): o teste põe um CSS com os mesmos valores do site.

const CLARO = '#f6efe3'
const MADRUGADA = '#17120e'

let estilo: HTMLStyleElement
let parar: () => void

const meta = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!
const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

beforeEach(() => {
  estilo = document.createElement('style')
  estilo.textContent = `:root { --cor-fundo: ${CLARO}; } :root[data-tema='madrugada'] { --cor-fundo: ${MADRUGADA}; }`
  document.head.append(estilo)
  const tag = document.createElement('meta')
  tag.name = 'theme-color'
  tag.content = CLARO
  document.head.append(tag)
})

afterEach(() => {
  parar?.()
  estilo.remove()
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove())
})

describe('a cor da barra', () => {
  it('no tema claro vale #f6efe3', () => {
    parar = acompanharCorDaBarra()
    expect(meta().content).toBe(CLARO)
  })

  it('na madrugada vale #17120e, em até 100 ms depois de data-tema mudar', async () => {
    parar = acompanharCorDaBarra()
    document.documentElement.setAttribute('data-tema', 'madrugada')
    await esperar(100)
    expect(meta().content).toBe(MADRUGADA)
  })

  it('volta a #f6efe3 quando o atributo sai', async () => {
    document.documentElement.setAttribute('data-tema', 'madrugada')
    parar = acompanharCorDaBarra()
    expect(meta().content).toBe(MADRUGADA)
    document.documentElement.removeAttribute('data-tema')
    await esperar(100)
    expect(meta().content).toBe(CLARO)
  })

  it('troca de ida e volta, quantas vezes for', async () => {
    parar = acompanharCorDaBarra()
    for (const [tema, cor] of [['madrugada', MADRUGADA], [null, CLARO], ['madrugada', MADRUGADA]] as const) {
      if (tema) document.documentElement.setAttribute('data-tema', tema)
      else document.documentElement.removeAttribute('data-tema')
      await esperar(0)
      expect(meta().content).toBe(cor)
    }
  })

  it('cria o <meta> se a página não tiver um', async () => {
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove())
    parar = acompanharCorDaBarra()
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1)
    expect(meta().content).toBe(CLARO)
  })

  it('depois de parar, o <meta> não muda mais', async () => {
    parar = acompanharCorDaBarra()
    parar()
    document.documentElement.setAttribute('data-tema', 'madrugada')
    await esperar(50)
    expect(meta().content).toBe(CLARO)
  })
})
