import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import {
  APRESENTACAO,
  CHAMADA,
  CITACAO_AVISO,
  FATOS,
  MINIATURAS,
  NAVEGACAO,
  PARA_QUE_SERVE,
  PILARES,
  PROMESSA,
  SECAO_ESCURA,
  SUBTITULO_INICIO,
  TELAS,
} from './conteudo/textos.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'
import { pastaSrcDe } from './teste/fontes.ts'

// MAT-44d-4: a estrutura do Início novo (13 blocos). O jsdom não mede nada: aqui fica o que dá
// para conferir na árvore. As medidas (G1 a G12, I-1 a I-12) saem do laço de captura.

async function inicio() {
  const resultado = renderizarRota('/')
  await screen.findByRole('heading', { level: 1 })
  return resultado.container
}

const consulta = <T extends Element>(container: HTMLElement, seletor: string) =>
  container.querySelector<T>(seletor)!

describe('Início (MAT-44d-4): abertura', () => {
  it('tem um único h1, igual à promessa, com no máximo 44 caracteres', async () => {
    const container = await inicio()

    const titulos = container.querySelectorAll('h1')
    expect(titulos).toHaveLength(1)
    expect(titulos[0].textContent).toBe(PROMESSA)
    expect(PROMESSA.length).toBeLessThanOrEqual(44)
  })

  it('o h1 cabe pelo texto, e não por remendo de tipografia: o CSS do Início não declara word-spacing nem letter-spacing', () => {
    const css = readFileSync(pastaSrcDe(import.meta.url) + 'index.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    // O bloco `44d-4` é o CSS próprio do Início (classes vt-*): nele não há word-spacing, e o único
    // letter-spacing é o 0 do sistema-base.
    const bloco = css.slice(css.indexOf('@layer components', css.lastIndexOf('@media (prefers-reduced-motion')))
    expect(bloco).toContain('.vt-')
    expect(bloco).not.toMatch(/word-spacing/)
    for (const [, valor] of bloco.matchAll(/letter-spacing\s*:\s*([^;]+);/g)) expect(valor.trim()).toBe('0')
    // E nenhuma regra do CSS inteiro (inclusive a do h1, `display-xl`) declara word-spacing.
    expect(css).not.toMatch(/word-spacing/)
    expect(PROMESSA).toBe('Quem chega no turno já sabe o que houve.')
  })

  it('o subtítulo vem logo depois do h1', async () => {
    const container = await inicio()

    const h1 = consulta(container, 'h1')
    expect(h1.nextElementSibling!.textContent).toBe(SUBTITULO_INICIO)
  })

  it('a lateral tem as 4 etiquetas, uma por <li>, e o link para o protótipo', async () => {
    const container = await inicio()

    const lateral = consulta(container, '.sb-abertura-lateral')
    const itens = [...lateral.querySelectorAll('li')]
    expect(itens).toHaveLength(PILARES.length + 1)
    for (const [i, pilar] of PILARES.entries()) {
      expect(itens[i].textContent).toBe(pilar)
      expect(itens[i].querySelector('.sb-etiqueta')).not.toBeNull()
    }
    const link = itens[PILARES.length].querySelector('a')!
    expect(link.textContent).toBe('Ver o protótipo')
    expect(link.getAttribute('href')).toBe('/app/hoje')
    expect(link.classList.contains('sb-abertura-link')).toBe(true)
  })
})

describe('Início (MAT-44d-4): ordem e estrutura', () => {
  it('tem um único main, e cada filho direto dele é uma área útil', async () => {
    const container = await inicio()

    expect(container.querySelectorAll('main')).toHaveLength(1)
    const filhos = [...consulta(container, 'main').children]
    expect(filhos.length).toBeGreaterThanOrEqual(10)
    for (const filho of filhos) {
      expect(filho.classList.contains('sb-area'), filho.outerHTML.slice(0, 80)).toBe(true)
    }
  })

  it('cada bloco é marcado com data-bloco (no filho direto do main ou dentro dele)', async () => {
    const container = await inicio()

    for (const filho of consulta(container, 'main').children) {
      const marcado = filho.hasAttribute('data-bloco') || filho.querySelector('[data-bloco]') !== null
      expect(marcado, filho.outerHTML.slice(0, 80)).toBe(true)
    }
  })

  it('o aviso, quando existe, vem logo antes do main', async () => {
    const container = await inicio()

    const main = consulta(container, 'main')
    expect(main.previousElementSibling!.matches('[data-cabecalho]') || main.previousElementSibling!.matches('[data-aviso]')).toBe(true)
  })

  it('a apresentação tem o título e o parágrafo em corpo-g', async () => {
    const container = await inicio()

    const paragrafo = consulta(container, '[data-apresentacao]')
    expect(paragrafo.tagName).toBe('P')
    expect(paragrafo.textContent).toBe(APRESENTACAO)
    expect(paragrafo.classList.contains('t-corpo-g')).toBe(true)
    expect(paragrafo.previousElementSibling!.tagName).toBe('H2')
  })

  it('tem 3 números (7, 2 e 0) com a legenda de cada um', async () => {
    const container = await inicio()

    const numeros = [...container.querySelectorAll('[data-numero]')]
    expect(numeros.map((n) => n.textContent)).toEqual(['7', '2', '0'])
    expect(numeros.map((n) => n.nextElementSibling!.textContent)).toEqual(FATOS.itens.map((f) => f.legenda))
  })

  it('tem 3 linhas rótulo + texto, com os textos de PARA_QUE_SERVE', async () => {
    const container = await inicio()

    const linhas = [...container.querySelectorAll('.sb-linha')]
    expect(linhas).toHaveLength(3)
    for (const [i, linha] of linhas.entries()) {
      expect(linha.querySelector('.sb-linha-rotulo')!.textContent).toBe(PARA_QUE_SERVE.linhas[i].rotulo)
      expect(linha.querySelector('.sb-linha-texto')!.textContent).toBe(PARA_QUE_SERVE.linhas[i].texto)
    }
    expect(screen.getByRole('heading', { name: PARA_QUE_SERVE.titulo, level: 2 })).toBeTruthy()
  })

  it('a ordem dos blocos é a da composição: abertura, mídia, apresentação, números, mídia, linhas, galeria, citação, cartões, pergunta, palavras', async () => {
    const container = await inicio()

    const filhos = [...consulta(container, 'main').children]
    const indice = (seletor: string) => filhos.findIndex((f) => f.matches(seletor) || f.querySelector(seletor) !== null)
    const ordem = [
      indice('h1'),
      indice('[data-midia]'),
      indice('[data-apresentacao]'),
      indice('[data-numero]'),
      indice('.sb-linha'),
      indice('.sb-galeria'),
      indice('figure'),
      indice('.vt-cartoes-grade'),
      indice('[data-cta]'),
      indice('nav'),
    ]
    for (const posicao of ordem) expect(posicao).toBeGreaterThanOrEqual(0)
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem)
    // A segunda mídia larga vem depois dos números e antes das linhas.
    const midias = filhos
      .map((f, i) => [f, i] as const)
      .filter(([f]) => f.matches('[data-bloco]') && f.querySelector(':scope > [data-midia]') !== null)
      .map(([, i]) => i)
    expect(midias).toHaveLength(2)
    expect(midias[0]).toBeLessThan(indice('[data-apresentacao]'))
    expect(midias[1]).toBeGreaterThan(indice('[data-numero]'))
    expect(midias[1]).toBeLessThan(indice('.sb-linha'))
  })
})

describe('Início (MAT-44d-4): mídia e galeria', () => {
  it('a galeria tem pelo menos 4 peças [data-midia] e 1 par de molduras quadradas', async () => {
    const container = await inicio()

    const galeria = consulta(container, '.sb-galeria')
    const pecas = galeria.querySelectorAll('[data-midia]')
    expect(pecas.length).toBeGreaterThanOrEqual(4)
    expect(galeria.querySelectorAll('[data-formato="par"]')).toHaveLength(2)
    expect(galeria.querySelectorAll('[data-formato="larga"]').length).toBeGreaterThanOrEqual(3)
  })

  it('nenhuma moldura [data-midia] tem texto dentro, e todas têm aria-label', async () => {
    const container = await inicio()

    const molduras = [...container.querySelectorAll('[data-midia]')]
    expect(molduras.length).toBeGreaterThanOrEqual(8)
    for (const moldura of molduras) {
      expect(moldura.textContent, moldura.getAttribute('aria-label')!).toBe('')
      expect(moldura.getAttribute('aria-label')!.length).toBeGreaterThan(0)
    }
  })

  it('nenhum aparelho, miniatura, ilustração ou ícone entra no Início', async () => {
    const container = await inicio()

    expect(container.querySelector('[data-aparelho]')).toBeNull()
    expect(container.querySelector('[class*="aparelho"]')).toBeNull()
    expect(container.querySelector('[class*="vitrine"]')).toBeNull()
    expect(container.querySelector('[inert]')).toBeNull()
    expect(container.querySelector('[data-ilustracao]')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()
  })
})

describe('Início (MAT-44d-4): citação, cartões, pergunta, palavras e seção escura', () => {
  it('a citação é uma figure com blockquote e figcaption, e o retrato vem depois do texto', async () => {
    const container = await inicio()

    const figura = consulta(container, 'figure')
    const texto = MINIATURAS.hoje.nota.texto
    expect(figura.querySelector('blockquote')!.textContent).toBe(`“${texto}”`)
    expect(figura.querySelector('blockquote')!.classList.contains('t-citacao')).toBe(true)
    expect(figura.querySelector('figcaption')!.textContent).toBe(`${MINIATURAS.hoje.nota.autor} · ${CITACAO_AVISO}`)
    const bloco = figura.closest('[data-bloco]')!
    const retrato = bloco.querySelector('[data-formato="retrato"]')!
    expect(retrato).not.toBeNull()
    expect(figura.compareDocumentPosition(retrato) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })

  it('os cartões são 2 links inteiros, para Hoje e Sessão, cada um com uma moldura quadrada e a legenda', async () => {
    const container = await inicio()

    expect(screen.getByRole('heading', { name: TELAS.titulo, level: 2 })).toBeTruthy()
    const cartoes = [...container.querySelectorAll<HTMLAnchorElement>('.vt-cartoes-grade > a')]
    expect(cartoes).toHaveLength(2)
    for (const [i, cartao] of cartoes.entries()) {
      expect(cartao.getAttribute('href')).toBe(TELAS.cartoes[i].destino)
      expect(cartao.querySelector('[data-midia][data-formato="par"]')).not.toBeNull()
      expect(cartao.querySelector('.vt-cartao-titulo')!.textContent).toBe(TELAS.cartoes[i].titulo)
      expect(cartao.querySelector('.vt-cartao-linha')!.textContent).toBe(TELAS.cartoes[i].linha)
    }
  })

  it('a pergunta é um h2 e o CTA é um link para o protótipo, com o contorno "Entrar" ao lado', async () => {
    const container = await inicio()

    expect(screen.getByRole('heading', { name: CHAMADA.titulo, level: 2 })).toBeTruthy()
    const cta = consulta<HTMLAnchorElement>(container, '[data-cta]')
    expect(cta.tagName).toBe('A')
    expect(cta.textContent).toBe('Ver o protótipo')
    expect(cta.getAttribute('href')).toBe('/app/hoje')
    const contorno = consulta<HTMLAnchorElement>(container, '.vt-cta-contorno')
    expect(contorno.textContent).toBe('Entrar')
    expect(contorno.getAttribute('href')).toBe('/entrar')
    expect(contorno.hasAttribute('data-cta')).toBe(false)
  })

  it('as 4 palavras grandes são links de uma nav, na ordem', async () => {
    const container = await inicio()

    const nav = consulta<HTMLElement>(container, 'main nav')
    const links = [...within(nav).getAllByRole('link')]
    expect(links.map((l) => l.textContent)).toEqual(NAVEGACAO.map((n) => n.rotulo))
    expect(links.map((l) => l.getAttribute('href'))).toEqual(NAVEGACAO.map((n) => n.destino))
    for (const link of links) expect(link.classList.contains('t-nav-grande')).toBe(true)
  })

  it('a seção escura é irmã do main, vem depois dele e leva o link "Criar conta"', async () => {
    const container = await inicio()

    const main = consulta(container, 'main')
    const secao = consulta<HTMLElement>(container, '[data-secao-escura]')
    expect(secao.closest('main')).toBeNull()
    expect(secao.parentElement).toBe(main.parentElement)
    expect(main.compareDocumentPosition(secao) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(secao.querySelector('h2')!.textContent).toBe(SECAO_ESCURA.titulo)
    const link = within(secao).getByRole('link', { name: 'Criar conta' })
    expect(link.getAttribute('href')).toBe('/criar-conta')
    // A seção é uma região nomeada (o axe exige que todo conteúdo esteja numa região).
    expect(secao.getAttribute('aria-labelledby')).toBe(secao.querySelector('h2')!.id)
    // O rodapé vem logo depois dela.
    expect(secao.nextElementSibling!.matches('[data-rodape]')).toBe(true)
  })
})
