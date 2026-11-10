import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import {
  APRESENTACAO,
  CHAMADA,
  CITACAO_AVISO,
  CITACAO_TEXTO,
  ETIQUETA_AVISO,
  FATOS,
  MINIATURAS,
  NAVEGACAO,
  PARA_QUE_SERVE,
  PILARES,
  PROMESSA,
  SECAO_ESCURA,
  SUBTITULO_INICIO,
  TELAS,
  TITULO_APRESENTACAO,
} from './conteudo/textos.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'
import { pastaSrcDe } from './teste/fontes.ts'

// MAT-44d-4: a estrutura do Início novo (13 blocos). O jsdom não mede nada: aqui fica o que dá
// para conferir na árvore. As medidas (G1 a G12, I-1 a I-12 e V1 a V10) saem do laço de captura.

// O setup não desfaz variáveis de ambiente: este arquivo desfaz as suas.
afterEach(() => {
  vi.unstubAllEnvs()
})

function definirBanco(url: string, chave: string) {
  vi.stubEnv('VITE_SUPABASE_URL', url)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', chave)
}

async function inicio() {
  const resultado = renderizarRota('/')
  await screen.findByRole('heading', { level: 1 })
  return resultado.container
}

const consulta = <T extends Element>(container: HTMLElement, seletor: string) =>
  container.querySelector<T>(seletor)!

/** O CSS do bloco `44d-4` (o do Início), sem comentários. */
function blocoDoInicio(): string {
  const css = readFileSync(pastaSrcDe(import.meta.url) + 'index.css', 'utf8')
  return css.slice(css.lastIndexOf('/* 44d-4 */')).replace(/\/\*[\s\S]*?\*\//g, '')
}

const normalizar = (texto: string) => texto.replace(/\s+/g, ' ').trim()

/** A faixa de celular do bloco. */
const ESTREITA = '@media (max-width: 767px)'

interface Regra {
  seletores: string[]
  corpo: string
  /** O `@media` que envolve a regra, ou `null` na base. */
  condicao: string | null
}

/** As regras do CSS, uma por bloco `{}`, com a faixa (`@media`) de cada uma. */
function regras(css: string): Regra[] {
  const saida: Regra[] = []
  const percorrer = (trecho: string, condicao: string | null) => {
    let i = 0
    while (i < trecho.length) {
      const abre = trecho.indexOf('{', i)
      if (abre === -1) break
      let fundo = 1
      let j = abre + 1
      while (j < trecho.length && fundo > 0) {
        if (trecho[j] === '{') fundo++
        else if (trecho[j] === '}') fundo--
        j++
      }
      const cabeca = normalizar(trecho.slice(i, abre))
      const corpo = trecho.slice(abre + 1, j - 1)
      i = j
      if (cabeca.startsWith('@media')) percorrer(corpo, cabeca)
      else if (cabeca.startsWith('@')) percorrer(corpo, condicao)
      else saida.push({ seletores: cabeca.split(',').map((s) => normalizar(s)), corpo: normalizar(corpo), condicao })
    }
  }
  percorrer(css, null)
  return saida
}

/** Os corpos de todas as regras de `seletor` na faixa dada (`null` é a base), juntos. */
function corpoDaRegra(css: string, seletor: string, condicao: string | null = null): string {
  return regras(css)
    .filter((r) => r.condicao === condicao && r.seletores.includes(seletor))
    .map((r) => r.corpo)
    .join(' ')
}

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
    definirBanco('https://exemplo.invalid', 'chave-ficticia')
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

  it('o main vem logo depois do cabeçalho: não há faixa de aviso antes dele (com ou sem banco)', async () => {
    for (const [url, chave] of [['', ''], ['https://exemplo.invalid', 'chave-ficticia']]) {
      definirBanco(url, chave)
      const resultado = renderizarRota('/')
      await screen.findByRole('heading', { level: 1 })

      const main = consulta(resultado.container, 'main')
      expect(main.previousElementSibling!.matches('[data-cabecalho]')).toBe(true)
      for (const aviso of resultado.container.querySelectorAll('[data-aviso]')) {
        expect(main.contains(aviso)).toBe(true)
      }
      expect(resultado.container.querySelector('.aviso-demonstracao')).toBeNull()
      resultado.unmount()
    }
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

  // MAT-44d-5: as molduras ganharam as cenas (aparelhos 3D com a captura real, ilustrações, mosaico).
  // Vale agora: nada inerte fora dos aparelhos, nenhum ícone, as molduras com conteúdo e as
  // ilustrações só dentro de [data-midia].
  it('nada fica [inert] fora dos aparelhos, não há ícone e a miniatura antiga não volta', async () => {
    const container = await inicio()

    const inertes = [...container.querySelectorAll('[inert]')]
    expect(inertes.length).toBeGreaterThan(0)
    for (const inerte of inertes) {
      expect(inerte.hasAttribute('data-aparelho'), inerte.outerHTML.slice(0, 80)).toBe(true)
      expect(inerte.closest('[data-midia]'), inerte.outerHTML.slice(0, 80)).not.toBeNull()
    }
    // Só o aparelho 3D (ap3d) entra; a moldura de miniatura com o protótipo por dentro não.
    expect(container.querySelector('.aparelho')).toBeNull()
    expect(container.querySelector('[class*="vitrine"]')).toBeNull()
    expect(container.querySelector('.lucide')).toBeNull()
  })

  it('toda moldura [data-midia] tem conteúdo: uma imagem de telas/ ou uma ilustração', async () => {
    const container = await inicio()

    const molduras = [...container.querySelectorAll('[data-midia]')]
    expect(molduras).toHaveLength(10)
    for (const moldura of molduras) {
      const rotulo = moldura.getAttribute('aria-label')!
      expect(moldura.children.length, rotulo).toBeGreaterThan(0)
      const imagens = moldura.querySelectorAll('img')
      const ilustracoes = moldura.querySelectorAll('svg[data-ilustracao]')
      expect(imagens.length + ilustracoes.length, rotulo).toBeGreaterThan(0)
    }
  })

  it('as ilustrações e os svg só existem dentro das molduras de mídia', async () => {
    const container = await inicio()

    const svgs = [...container.querySelectorAll('svg')]
    expect(svgs.length).toBe(2)
    for (const svg of svgs) {
      expect(svg.closest('[data-midia]'), svg.outerHTML.slice(0, 60)).not.toBeNull()
      expect(svg.hasAttribute('data-ilustracao')).toBe(true)
      expect(svg.getAttribute('aria-hidden')).toBe('true')
    }
    expect(container.querySelectorAll('[data-midia] [data-ilustracao]')).toHaveLength(2)
  })
})

describe('Início (MAT-44d-4): citação, cartões, pergunta, palavras e seção escura', () => {
  it('a citação é uma figure com blockquote e figcaption, e o retrato vem depois do texto', async () => {
    const container = await inicio()

    const figura = consulta(container, 'figure')
    expect(figura.querySelector('blockquote')!.textContent).toBe(`“${CITACAO_TEXTO}”`)
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

// ---------------------------------------------------------------------------
// Volta visual 1 (MAT-44d-4, VOLTA1.md): os 10 itens de acabamento. O jsdom não mede layout: aqui
// ficam a árvore, os textos e as regras do CSS. Quem mede é o `geo_volta1.mjs` (V1 a V10).

describe('Volta 1, itens 2, 3 e 6: o aviso é uma etiqueta da lateral da abertura', () => {
  it('sem as variáveis do banco há exatamente 1 [data-aviso="demonstracao"], dentro da lateral, com o texto da etiqueta', async () => {
    for (const [url, chave] of [['', ''], ['https://exemplo.invalid', ''], ['', 'chave-ficticia']]) {
      definirBanco(url, chave)
      const resultado = renderizarRota('/')
      await screen.findByRole('heading', { level: 1 })

      const avisos = resultado.container.querySelectorAll('[data-aviso="demonstracao"]')
      expect(avisos, `${url}|${chave}`).toHaveLength(1)
      const aviso = avisos[0]
      expect(aviso.tagName).toBe('LI')
      expect(aviso.closest('.sb-abertura-lateral')).not.toBeNull()
      expect(aviso.parentElement!.classList.contains('sb-abertura-lateral')).toBe(true)
      expect(aviso.textContent).toBe('Protótipo com dados de exemplo')
      expect(aviso.textContent).toBe(ETIQUETA_AVISO)
      expect(aviso.querySelector('.sb-etiqueta')).not.toBeNull()
      // O aviso longo da faixa antiga não aparece mais no Início.
      expect(resultado.container.textContent).not.toContain('Demonstração sem banco')
      resultado.unmount()
    }
  })

  it('com as duas variáveis do banco não há aviso nenhum', async () => {
    definirBanco('https://exemplo.invalid', 'chave-ficticia')
    const container = await inicio()

    expect(container.querySelectorAll('[data-aviso]')).toHaveLength(0)
    expect(container.textContent).not.toContain(ETIQUETA_AVISO)
  })

  it('a ordem da lateral é: as 4 etiquetas, o aviso e, por último, o link "Ver o protótipo"', async () => {
    definirBanco('', '')
    const container = await inicio()

    const itens = [...consulta(container, '.sb-abertura-lateral').children]
    expect(itens).toHaveLength(PILARES.length + 2)
    expect(itens.slice(0, PILARES.length).map((i) => i.textContent)).toEqual([...PILARES])
    expect(itens[PILARES.length].matches('[data-aviso="demonstracao"]')).toBe(true)
    const link = itens[PILARES.length + 1].querySelector('a')!
    expect(link.textContent).toBe('Ver o protótipo')
    expect(link.getAttribute('href')).toBe('/app/hoje')
  })

  it('o aviso lê as variáveis a cada renderização (uma rota, depois a outra)', async () => {
    definirBanco('', '')
    const primeira = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    expect(primeira.container.querySelectorAll('[data-aviso]')).toHaveLength(1)
    primeira.unmount()

    definirBanco('https://exemplo.invalid', 'chave-ficticia')
    const segunda = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    expect(segunda.container.querySelectorAll('[data-aviso]')).toHaveLength(0)
  })

  it('o CSS da lateral (só `.vt-inicio …`): no computador o link desce para os 80 px finais; em celular as etiquetas ficam em linha, com quebra e gap de 8', () => {
    const css = blocoDoInicio()
    const base = corpoDaRegra(css, '.vt-inicio .sb-abertura-lateral')
    expect(base).toContain('align-self: stretch')
    // O fio horizontal fica 32 px abaixo da linha da grade: a lateral passa dela por esses 32 px.
    expect(base).toMatch(/margin-bottom:\s*-32px/)
    const ultimo = corpoDaRegra(css, '.vt-inicio .sb-abertura-lateral > li:last-child')
    expect(ultimo).toContain('margin-top: auto')
    expect(ultimo).toContain('min-height: 80px')

    const lateral = corpoDaRegra(css, '.vt-inicio .sb-abertura-lateral', ESTREITA)
    expect(lateral).toContain('flex-direction: row')
    expect(lateral).toContain('flex-wrap: wrap')
    expect(lateral).toMatch(/gap:\s*8px/)
    // O link fica numa linha só dele, depois das etiquetas.
    expect(corpoDaRegra(css, '.vt-inicio .sb-abertura-lateral > li:last-child', ESTREITA)).toMatch(/flex-basis:\s*100%/)
  })

  it('de 768 a 1439 a coluna lateral é mais estreita que a etiqueta do aviso (239 px): só ela pode quebrar linha', () => {
    const css = blocoDoInicio()
    const faixa = '@media (min-width: 768px) and (max-width: 1439px)'
    const etiqueta = corpoDaRegra(css, '.vt-inicio [data-aviso] .sb-etiqueta', faixa)
    expect(etiqueta).toContain('white-space: normal')
    expect(etiqueta).toContain('height: auto')
    // Em 1440 (e em celular, onde a etiqueta cabe em uma linha) a etiqueta do sistema fica como é.
    expect(corpoDaRegra(css, '.vt-inicio [data-aviso] .sb-etiqueta')).toBe('')
    expect(corpoDaRegra(css, '.vt-inicio [data-aviso] .sb-etiqueta', ESTREITA)).toBe('')
  })

  it('o CSS do bloco não tem mais a regra do aviso como irmão do main (a faixa saiu do Início)', () => {
    expect(blocoDoInicio()).not.toContain(':has(+ .vt-inicio)')
  })
})

describe('Volta 1, itens 1, 9, 5 e 10: os textos novos', () => {
  it('a citação tem de 90 a 130 caracteres e é a nota da Carla do protótipo', () => {
    expect(CITACAO_TEXTO).toBe('Mamou às 22h e dormiu logo. Pomada só à noite, a de dia acabou. Bico na bolsa, se ela acordar.')
    expect(CITACAO_TEXTO.length).toBe(94)
    expect(CITACAO_TEXTO.length).toBeGreaterThanOrEqual(90)
    expect(CITACAO_TEXTO.length).toBeLessThanOrEqual(130)
    // A nota compartilhada com o protótipo não muda, e a autoria da citação continua a mesma.
    expect(MINIATURAS.hoje.nota.texto).toBe('Pomada só à noite.')
    expect(`${MINIATURAS.hoje.nota.autor} · ${CITACAO_AVISO}`).toBe('Carla, 22:40 · nota de passagem de exemplo')
  })

  it('a citação do Início usa a chave nova, e não a nota das miniaturas', async () => {
    const container = await inicio()

    expect(consulta(container, 'figure blockquote').textContent).toBe(`“${CITACAO_TEXTO}”`)
    expect(consulta(container, 'figure blockquote').textContent).not.toContain(MINIATURAS.hoje.nota.texto + '”')
  })

  it('o título da apresentação e o parágrafo não começam com as mesmas 3 palavras', () => {
    const tres = (texto: string) => texto.toLowerCase().split(/\s+/).slice(0, 3).join(' ')
    expect(tres(TITULO_APRESENTACAO)).not.toBe(tres(APRESENTACAO))
    expect(TITULO_APRESENTACAO).toBe('Uma rotina, vários cuidadores')
  })

  it('o título novo é o h2 da apresentação, e o parágrafo não mudou', async () => {
    const container = await inicio()

    const paragrafo = consulta(container, '[data-apresentacao]')
    expect(paragrafo.previousElementSibling!.textContent).toBe('Uma rotina, vários cuidadores')
    expect(paragrafo.textContent).toMatch(/^Um app para a família registrar a rotina do bebê/)
  })

  it('o subtítulo da abertura tem no máximo 32 caracteres, sem ponto de exclamação nem caixa alta', async () => {
    expect(SUBTITULO_INICIO.length).toBeLessThanOrEqual(32)
    expect(SUBTITULO_INICIO).toBe(SUBTITULO_INICIO.trim())
    expect(['A rotina do bebê, em equipe.', 'Rotina do bebê, em equipe.', 'A rotina, em equipe.']).toContain(SUBTITULO_INICIO)
    const container = await inicio()
    expect(consulta(container, 'h1').nextElementSibling!.textContent).toBe(SUBTITULO_INICIO)
  })
})

describe('Volta 1, item 8: as 4 palavras grandes', () => {
  it('são Hoje, Sessão, Conta e Entrar, com destinos próprios e nenhum repetido', async () => {
    const container = await inicio()

    const links = [...within(consulta<HTMLElement>(container, 'main nav')).getAllByRole('link')]
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Hoje', '/app/hoje'],
      ['Sessão', '/app/sessao'],
      ['Conta', '/criar-conta'],
      ['Entrar', '/entrar'],
    ])
    const destinos = links.map((l) => l.getAttribute('href'))
    expect(new Set(destinos).size).toBe(destinos.length)
    expect(NAVEGACAO.map((n) => n.rotulo)).not.toContain('Madrugada')
  })

  it('o CSS dá 32 px de vão entre as palavras abaixo de 768 (linha de 56 + 32 = passo de 88)', () => {
    const lista = corpoDaRegra(blocoDoInicio(), '.vt-nav-lista', ESTREITA)
    expect(lista).toContain('flex-direction: column')
    expect(lista).toMatch(/(?:^|[;\s])gap:\s*32px/)
  })
})

describe('Volta 1, itens 4 e 7: o círculo do CTA', () => {
  it('o rótulo do círculo grande é 56/67 em 1440 (texto de 50% a 75% do diâmetro) e o do contorno é 32/38; o de celular é 36/43', () => {
    const css = blocoDoInicio()
    const cta = corpoDaRegra(css, '.vt-cta')
    expect(cta).toMatch(/font-size:\s*3\.5rem/)
    expect(cta).toMatch(/line-height:\s*4\.1875rem/)
    const contorno = corpoDaRegra(css, '.vt-cta-contorno')
    expect(contorno).toMatch(/font-size:\s*2rem/)
    expect(contorno).toMatch(/line-height:\s*2\.375rem/)
    const celular = corpoDaRegra(css, '.vt-cta', ESTREITA)
    expect(celular).toMatch(/font-size:\s*2\.25rem/)
    expect(celular).toMatch(/line-height:\s*2\.6875rem/)
  })

  it('os rótulos usam a escala do sistema (seção no grande, rótulo no de contorno), não o botão de 24 px', async () => {
    const container = await inicio()

    const cta = consulta(container, '[data-cta]')
    expect(cta.classList.contains('t-secao')).toBe(true)
    expect(cta.classList.contains('t-subtitulo')).toBe(false)
    expect(cta.classList.contains('t-botao')).toBe(false)
    const contorno = consulta(container, '.vt-cta-contorno')
    expect(contorno.classList.contains('t-rotulo')).toBe(true)
    expect(contorno.classList.contains('t-botao')).toBe(false)
  })

  it('abaixo de 768 o círculo de contorno some (display: none) e o palco fica com só o círculo cheio', () => {
    const css = blocoDoInicio()
    expect(corpoDaRegra(css, '.vt-cta-contorno', ESTREITA)).toContain('display: none')
    expect(corpoDaRegra(css, '.vt-cta', ESTREITA)).toMatch(/width:\s*322px/)
    // Em 768 ou mais o contorno aparece: o `display: none` só existe na faixa de celular.
    expect(corpoDaRegra(css, '.vt-cta-contorno')).not.toContain('display: none')
  })

  it('de 768 a 1099 o contorno continua abaixo do círculo cheio', () => {
    expect(corpoDaRegra(blocoDoInicio(), '.vt-cta-contorno', '@media (max-width: 1099px)')).toContain('position: relative')
  })
})

describe('Volta 1, itens 1 e 9: a citação estica à altura do retrato', () => {
  it('o texto da citação ocupa a altura do retrato, com a frase em cima e a legenda embaixo', () => {
    const css = blocoDoInicio()
    const texto = corpoDaRegra(css, '.vt-citacao-texto')
    expect(texto).toContain('align-self: stretch')
    expect(texto).toContain('display: flex')
    expect(texto).toContain('flex-direction: column')
    expect(texto).toContain('justify-content: space-between')
    expect(texto).not.toContain('align-self: center')
    // Em coluna única (celular) a figura volta ao tamanho do conteúdo.
    expect(corpoDaRegra(css, '.vt-citacao-texto', ESTREITA)).toContain('align-self: auto')
  })
})

describe('Volta 1: o CSS do bloco 44d-4 segue as regras do sistema', () => {
  it('não usa word-spacing, letter-spacing diferente de 0, text-transform nem box-shadow', () => {
    const css = blocoDoInicio()
    expect(css).toContain('.vt-')
    expect(css).not.toMatch(/word-spacing/)
    expect(css).not.toMatch(/text-transform/)
    expect(css).not.toMatch(/box-shadow/)
    for (const [, valor] of css.matchAll(/letter-spacing\s*:\s*([^;]+);/g)) expect(valor.trim()).toBe('0')
  })

  it('só usa raios 0, 4, 8 e 50%, e nenhuma cor em hex', () => {
    const css = blocoDoInicio()
    for (const [, valor] of css.matchAll(/border-radius\s*:\s*([^;]+);/g)) expect(['0', '4px', '8px', '50%']).toContain(valor.trim())
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
