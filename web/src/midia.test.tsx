import { existsSync, readFileSync } from 'node:fs'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { Aparelho } from './componentes/Aparelho.tsx'
import { CAPTURAS, urlDaCaptura } from './componentes/midia/capturas.ts'
import { CATALOGO } from './movimento/catalogo.ts'
import { useEntradaDasMidias } from './movimento/entradaMidias.ts'
import { pastaSrcDe } from './teste/fontes.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'

// MAT-44d-5: a mídia do Início (cenas em CSS 3D com as capturas reais, galeria, mosaico) e a entrada
// ao rolar (M3). O jsdom não mede layout nem pinta: aqui ficam a árvore, os atributos, o CSS lido
// como texto e o hook de rolagem com o retângulo simulado. Quem olha a composição é o laço de captura.

const pastaSrc = pastaSrcDe(import.meta.url)
const lerTexto = (relativo: string) => readFileSync(pastaSrc + relativo, 'utf8')

async function inicio() {
  const resultado = renderizarRota('/')
  await screen.findByRole('heading', { level: 1 })
  return resultado.container
}

const molduras = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('[data-midia]')]

function textosDe(no: Node): Text[] {
  const achados: Text[] = []
  const andador = document.createTreeWalker(no, NodeFilter.SHOW_TEXT)
  for (let atual = andador.nextNode(); atual; atual = andador.nextNode()) achados.push(atual as Text)
  return achados
}

// ---------------------------------------------------------------------------
// M-1: toda moldura tem conteúdo e nenhum nó de texto.

describe('MAT-44d-5: as molduras do Início têm uma cena e nenhum texto', () => {
  it('são 10 molduras, cada uma com pelo menos uma imagem de captura ou uma ilustração', async () => {
    const container = await inicio()

    const lista = molduras(container)
    expect(lista).toHaveLength(10)
    for (const moldura of lista) {
      const rotulo = moldura.getAttribute('aria-label')!
      const conteudo = moldura.querySelectorAll('img').length + moldura.querySelectorAll('svg[data-ilustracao]').length
      expect(conteudo, rotulo).toBeGreaterThan(0)
    }
  })

  it('nenhuma moldura tem nó de texto (nem espaço), <title> ou <text>', async () => {
    const container = await inicio()

    for (const moldura of molduras(container)) {
      const rotulo = moldura.getAttribute('aria-label')!
      expect(textosDe(moldura), rotulo).toHaveLength(0)
      expect(moldura.textContent, rotulo).toBe('')
      expect(moldura.querySelector('title, text'), rotulo).toBeNull()
    }
  })

  it('cada cena é uma peça própria: nenhuma moldura repete o desenho de outra', async () => {
    const container = await inicio()

    const desenhos = molduras(container).map((moldura) => moldura.innerHTML)
    expect(new Set(desenhos).size).toBe(desenhos.length)
  })

  it('o mosaico tem 3 recortes de captura (o limite por moldura) e as ilustrações são as 2 do par', async () => {
    const container = await inicio()

    const porRotulo = (parte: string) => molduras(container).find((m) => m.getAttribute('aria-label')!.includes(parte))!
    expect(porRotulo('Mosaico').querySelectorAll('img')).toHaveLength(3)
    const pares = molduras(container).filter((m) => m.getAttribute('data-formato') === 'par' && m.querySelector('svg'))
    expect(pares).toHaveLength(2)
    const nomes = pares.map((par) => par.querySelector('svg')!.getAttribute('data-ilustracao'))
    expect(new Set(nomes).size).toBe(2)
  })

  it('M-4: a estrutura não muda (a moldura continua filha direta do bloco, da galeria e, nos cartões, do link)', async () => {
    const container = await inicio()

    const lista = molduras(container)
    const nomeDoPai = (moldura: HTMLElement) => moldura.parentElement!
    // As duas mídias largas: filhas diretas do bloco.
    expect(nomeDoPai(lista[0]).matches('[data-bloco]')).toBe(true)
    expect(nomeDoPai(lista[1]).matches('[data-bloco]')).toBe(true)
    // As 5 da galeria: filhas diretas de .sb-galeria.
    for (const moldura of lista.slice(2, 7)) expect(nomeDoPai(moldura).classList.contains('sb-galeria')).toBe(true)
    // O retrato: filho direto da coluna da citação.
    expect(nomeDoPai(lista[7]).classList.contains('vt-citacao-midia')).toBe(true)
    // Os dois cartões: filhos diretos do link.
    for (const moldura of lista.slice(8)) expect(nomeDoPai(moldura).classList.contains('vt-cartao')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// M-2 e M-8: as capturas.

describe('MAT-44d-5: as capturas dentro dos aparelhos', () => {
  const imagens = (container: HTMLElement) => [...container.querySelectorAll<HTMLImageElement>('[data-midia] img')]

  it('são as 8 capturas conhecidas de web/public/telas/, e cada arquivo existe', async () => {
    const container = await inicio()

    const conhecidas = Object.values(CAPTURAS).map((c) => c.arquivo)
    expect(conhecidas).toHaveLength(8)
    for (const arquivo of conhecidas) expect(existsSync(pastaSrc + '../public/telas/' + arquivo), arquivo).toBe(true)
    const usadas = imagens(container)
    expect(usadas.length).toBeGreaterThan(8)
    for (const img of usadas) {
      const src = img.getAttribute('src')!
      expect(src, src).toMatch(/telas\/[a-z]+-[a-z]+-(1440|390)\.png$/)
      expect(conhecidas, src).toContain(src.split('/').pop())
    }
  })

  it('o endereço leva a base do Vite e a pasta telas/', () => {
    for (const chave of Object.keys(CAPTURAS) as Array<keyof typeof CAPTURAS>) {
      expect(urlDaCaptura(chave)).toBe(`${import.meta.env.BASE_URL}telas/${CAPTURAS[chave].arquivo}`)
    }
  })

  it('alt vazio, largura e altura reais do arquivo, decoding async', async () => {
    const container = await inicio()

    for (const img of imagens(container)) {
      const arquivo = img.getAttribute('src')!.split('/').pop()!
      const captura = Object.values(CAPTURAS).find((c) => c.arquivo === arquivo)!
      expect(img.getAttribute('alt'), arquivo).toBe('')
      expect(Number(img.getAttribute('width')), arquivo).toBe(captura.largura)
      expect(Number(img.getAttribute('height')), arquivo).toBe(captura.altura)
      expect(img.getAttribute('decoding'), arquivo).toBe('async')
    }
  })

  it('M-8: só as imagens da primeira moldura (a da primeira dobra) são carregadas na hora; as outras são lazy', async () => {
    const container = await inicio()

    const [primeira, ...demais] = molduras(container)
    const daPrimeira = [...primeira.querySelectorAll('img')]
    expect(daPrimeira.length).toBeGreaterThan(0)
    for (const img of daPrimeira) expect(img.getAttribute('loading')).toBe('eager')
    for (const moldura of demais) {
      for (const img of moldura.querySelectorAll('img')) {
        expect(img.getAttribute('loading'), moldura.getAttribute('aria-label')!).toBe('lazy')
      }
    }
  })

  it('M-8: no máximo 3 imagens por moldura', async () => {
    const container = await inicio()

    for (const moldura of molduras(container)) {
      expect(moldura.querySelectorAll('img').length, moldura.getAttribute('aria-label')!).toBeLessThanOrEqual(3)
    }
  })
})

// ---------------------------------------------------------------------------
// O CSS novo: sem sombra, sem filtro e sem nada que ache o 3D.

describe('MAT-44d-5: midia.css', () => {
  const css = lerTexto('componentes/midia/midia.css').replace(/\/\*[\s\S]*?\*\//g, '')
  const regras = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, corpo]) => ({
    seletor: seletor.trim().replace(/\s+/g, ' '),
    corpo,
  }))

  it('encontra as regras', () => {
    expect(regras.length).toBeGreaterThan(30)
    expect(css).toContain('@layer components')
  })

  it('M-3: nenhuma regra usa box-shadow, filter, backdrop-filter, gradiente nem blur', () => {
    expect(css).not.toMatch(/box-shadow/)
    expect(css).not.toMatch(/(^|[^-\w])filter\s*:/)
    expect(css).not.toMatch(/backdrop-filter/)
    expect(css).not.toMatch(/gradient\(/)
    expect(css).not.toMatch(/blur/)
    expect(css).not.toMatch(/drop-shadow/)
  })

  it('nenhum nó achata o 3D: opacity, mask, clip-path, isolation e will-change não aparecem', () => {
    for (const { seletor, corpo } of regras) {
      expect(corpo, seletor).not.toMatch(/(^|[;\s])(opacity|mask|clip-path|isolation|mix-blend-mode|will-change)\s*:/)
    }
  })

  it('overflow só nas folhas planas (a tela do aparelho e o recorte do mosaico), nunca num nó intermediário', () => {
    const comOverflow = regras.filter((r) => /(^|[;\s])overflow[a-z-]*\s*:/.test(r.corpo)).map((r) => r.seletor)
    expect(comOverflow.sort()).toEqual(['.ap3d-tela', '.mc-recorte'])
  })

  it('o 3D tem perspectiva no palco e preserve-3d nos objetos e nas caixas', () => {
    const corpoDe = (seletor: string) => regras.filter((r) => r.seletor === seletor).map((r) => r.corpo).join('')
    expect(corpoDe('.mc-palco')).toMatch(/perspective:\s*\d+cqw/)
    expect(corpoDe('.mc-caixa')).toMatch(/transform-style:\s*preserve-3d/)
    expect(corpoDe('.ap3d, .mc-obj')).toMatch(/transform-style:\s*preserve-3d/)
    expect(corpoDe('.mc-cena')).toMatch(/container-type:\s*size/)
  })

  it('só usa raios 0, 4 e 8 px, e nenhuma cor de destaque (urucum) como fundo', () => {
    for (const { seletor, corpo } of regras) {
      for (const [, valor] of corpo.matchAll(/border-radius\s*:\s*([^;]+)/g)) {
        expect(['var(--raio, 0px)', '4px'], `${seletor}: ${valor}`).toContain(valor.trim())
      }
      for (const [, valor] of corpo.matchAll(/--raio\s*:\s*([^;]+)/g)) expect(['8px', '4px']).toContain(valor.trim())
      expect(corpo, seletor).not.toMatch(/var\(--cor-(destaque|campo-sessao|rodape)\)/)
    }
  })
})

// ---------------------------------------------------------------------------
// O Aparelho: a versão antiga fica igual sem as props novas; a 3D liga com `captura`.

describe('MAT-44d-5: o Aparelho', () => {
  it('sem as props novas o notebook é o mesmo de antes (marcação idêntica)', () => {
    const { container } = render(
      <Aparelho tipo="notebook" tela="hoje">
        <p>miniatura</p>
      </Aparelho>,
    )

    expect(container.innerHTML).toBe(
      '<div data-aparelho="notebook" data-tela="hoje" inert="" aria-hidden="true" class="aparelho aparelho-notebook ">' +
        '<div class="aparelho-tampa"><div class="aparelho-tela"><p>miniatura</p></div></div>' +
        '<div class="aparelho-base"></div></div>',
    )
  })

  it('sem as props novas o celular da madrugada é o mesmo de antes, com o tema local e sem imagem', () => {
    const { container } = render(
      <Aparelho tipo="celular" tela="sessao" tema="madrugada" className="extra">
        <p>miniatura</p>
      </Aparelho>,
    )

    expect(container.innerHTML).toBe(
      '<div data-aparelho="celular" data-tela="sessao" inert="" aria-hidden="true" class="aparelho aparelho-celular extra">' +
        '<div class="aparelho-tela" data-tema-local="madrugada"><p>miniatura</p></div></div>',
    )
    expect(container.querySelector('img, .ap3d, .mc-caixa')).toBeNull()
  })

  it('com `captura` o celular 3D é inerte, escondido do leitor de tela, com 5 faces (sem a de trás) e a imagem na frente', () => {
    const { container } = render(
      <Aparelho tipo="celular" tela="hoje" captura="hoje-claro-390" largura="20cqw" inclinacao={{ x: -4, y: 16, z: 2 }} />,
    )

    const celular = container.querySelector<HTMLElement>('[data-aparelho="celular"]')!
    expect(celular.hasAttribute('inert')).toBe(true)
    expect(celular.getAttribute('aria-hidden')).toBe('true')
    expect(celular.getAttribute('data-tela')).toBe('hoje')
    expect(celular.classList.contains('ap3d')).toBe(true)
    expect(celular.classList.contains('aparelho')).toBe(false)
    expect(celular.querySelectorAll(':scope > .mc-face')).toHaveLength(5)
    expect(celular.querySelector('.mc-tras')).toBeNull()
    expect(celular.querySelector('.mc-frente > .ap3d-tela > img')).not.toBeNull()
    expect(celular.style.getPropertyValue('--aw')).toBe('20cqw')
    expect(celular.style.getPropertyValue('--rx')).toBe('-4deg')
    expect(celular.style.getPropertyValue('--ry')).toBe('16deg')
    expect(celular.style.getPropertyValue('--rz')).toBe('2deg')
  })

  it('a imagem leva alt vazio, o tamanho do arquivo e é lazy por padrão; `eager` só quando pedido', () => {
    const { container, rerender } = render(<Aparelho tipo="celular" tela="hoje" captura="hoje-claro-390" largura="20cqw" />)

    const img = () => container.querySelector('img')!
    expect(img().getAttribute('alt')).toBe('')
    expect(img().getAttribute('width')).toBe('390')
    expect(img().getAttribute('height')).toBe('844')
    expect(img().getAttribute('loading')).toBe('lazy')
    expect(img().getAttribute('src')).toBe(urlDaCaptura('hoje-claro-390'))

    rerender(<Aparelho tipo="celular" tela="hoje" captura="hoje-claro-390" largura="20cqw" carregamento="eager" />)
    expect(img().getAttribute('loading')).toBe('eager')
  })

  it('sem inclinação o aparelho 3D fica a prumo (0 grau nos três eixos)', () => {
    const { container } = render(<Aparelho tipo="celular" tela="sessao" captura="sessao-claro-390" largura="20cqw" />)

    const celular = container.querySelector<HTMLElement>('[data-aparelho]')!
    for (const eixo of ['--rx', '--ry', '--rz']) expect(celular.style.getPropertyValue(eixo)).toBe('0deg')
  })

  it('o notebook 3D tem a tampa (5 faces, com a captura de 1440 por 900) e a base deitada', () => {
    const { container } = render(
      <Aparelho tipo="notebook" tela="sessao" captura="sessao-claro-1440" largura="60cqw" style={{ '--abre': '12deg', left: '4cqw' }} />,
    )

    const notebook = container.querySelector<HTMLElement>('[data-aparelho="notebook"]')!
    expect(notebook.hasAttribute('inert')).toBe(true)
    expect(notebook.getAttribute('aria-hidden')).toBe('true')
    expect(notebook.querySelectorAll('.ap3d-tampa > .mc-face')).toHaveLength(5)
    expect(notebook.querySelectorAll('.ap3d-base > .ap3d-base-caixa > .mc-face')).toHaveLength(5)
    const img = notebook.querySelector('.ap3d-tampa img')!
    expect(img.getAttribute('width')).toBe('1440')
    expect(img.getAttribute('height')).toBe('900')
    expect(notebook.style.getPropertyValue('--abre')).toBe('12deg')
    expect(notebook.style.left).toBe('4cqw')
  })

  it('o aparelho 3D nunca põe texto nem svg', () => {
    const { container } = render(
      <>
        <Aparelho tipo="celular" tela="hoje" captura="hoje-madrugada-390" largura="20cqw" />
        <Aparelho tipo="notebook" tela="hoje" captura="hoje-claro-1440" largura="60cqw" />
      </>,
    )

    expect(textosDe(container)).toHaveLength(0)
    expect(container.querySelector('svg')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// M-7: a entrada ao rolar, nos próprios nós [data-midia].

type Topos = Record<string, number>

function simularReduzido(inicial: boolean) {
  let reduz = inicial
  const ouvintes = new Set<() => void>()
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    get matches() {
      return consulta.includes('prefers-reduced-motion') ? reduz : false
    },
    media: consulta,
    addEventListener: (_tipo: string, ouvinte: () => void) => ouvintes.add(ouvinte),
    removeEventListener: (_tipo: string, ouvinte: () => void) => ouvintes.delete(ouvinte),
  }))
  return {
    definir(valor: boolean) {
      reduz = valor
      act(() => {
        for (const ouvinte of ouvintes) ouvinte()
      })
    },
  }
}

function Pagina({ vazia = false }: { vazia?: boolean }) {
  const raiz = useRef<HTMLElement>(null)
  useEntradaDasMidias(raiz)
  return (
    <main ref={raiz}>
      {vazia ? null : (
        <>
          <div data-midia="" id="acima" />
          <div data-midia="" id="abaixo" />
        </>
      )}
    </main>
  )
}

const { janelaPx, escala } = CATALOGO.M3
const ALTURA_DA_JANELA = 800

describe('MAT-44d-5: entrada ao rolar (M3) nos nós [data-midia]', () => {
  let topos: Topos

  beforeEach(() => {
    topos = { acima: 100, abaixo: 1400 }
    window.innerHeight = ALTURA_DA_JANELA
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const top = topos[this.id] ?? 0
      return { top, bottom: top + 300, left: 0, right: 100, width: 100, height: 300, x: 0, y: top, toJSON: () => ({}) }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const no = (container: HTMLElement, id: string) => container.querySelector<HTMLElement>(`#${id}`)!
  const rolar = () => act(() => void window.dispatchEvent(new Event('scroll')))

  it('o catálogo manda: janela de 360 px, opacidade 0 → 1, escala 0,9 → 1', () => {
    expect(janelaPx).toBe(360)
    expect(escala).toEqual({ de: 0.9, para: 1 })
  })

  it('com movimento reduzido nada é escrito: opacidade 1, escala 1, nada escondido e nada ligado à rolagem', () => {
    simularReduzido(true)
    const { container } = render(<Pagina />)

    for (const id of ['acima', 'abaixo']) {
      expect(no(container, id).style.opacity, id).toBe('')
      expect(no(container, id).style.transform, id).toBe('')
      expect(no(container, id).hasAttribute('data-entrada'), id).toBe(false)
    }
    // Rolar não muda nada.
    topos.abaixo = 100
    rolar()
    expect(no(container, 'abaixo').style.opacity).toBe('')
  })

  it('sem movimento reduzido, a que está abaixo da dobra nasce com a entrada ligada (opacidade 0, escala 0,9)', () => {
    simularReduzido(false)
    const { container } = render(<Pagina />)

    const abaixo = no(container, 'abaixo')
    expect(abaixo.getAttribute('data-entrada')).toBe('rolagem')
    expect(abaixo.style.opacity).toBe('0')
    expect(abaixo.style.transform).toBe(`scale(${escala.de})`)
  })

  it('a que já está visível ao carregar nasce no estado final, sem esconder nada', () => {
    simularReduzido(false)
    const { container } = render(<Pagina />)

    const acima = no(container, 'acima')
    expect(acima.getAttribute('data-entrada')).toBe('pronta')
    expect(acima.style.opacity).toBe('')
    expect(acima.style.transform).toBe('')
  })

  it('borda: com o topo exatamente na base da janela ainda não é visível; um pixel acima, já é', () => {
    simularReduzido(false)
    topos = { acima: ALTURA_DA_JANELA, abaixo: ALTURA_DA_JANELA - 1 }
    const { container } = render(<Pagina />)

    expect(no(container, 'acima').getAttribute('data-entrada')).toBe('rolagem')
    expect(no(container, 'abaixo').getAttribute('data-entrada')).toBe('pronta')
  })

  it('ao rolar, a opacidade e a escala seguem o progresso nos primeiros 360 px (meio caminho: 0,5 e 0,95)', async () => {
    simularReduzido(false)
    const { container } = render(<Pagina />)
    const abaixo = no(container, 'abaixo')

    topos.abaixo = ALTURA_DA_JANELA - janelaPx / 2
    rolar()

    await waitFor(() => expect(Number(abaixo.style.opacity)).toBeCloseTo(0.5, 1), { timeout: 4000 })
    expect(abaixo.style.transform).toBe(`scale(${Number(escala.de + (escala.para - escala.de) * Number(abaixo.style.opacity))})`)
    expect(Number(/scale\(([\d.]+)\)/.exec(abaixo.style.transform)![1])).toBeCloseTo(0.95, 1)
  })

  it('chegando aos 360 px a moldura termina em opacidade 1 e escala 1, sem passar do alvo', async () => {
    simularReduzido(false)
    const { container } = render(<Pagina />)
    const abaixo = no(container, 'abaixo')
    const vistos: number[] = []

    topos.abaixo = ALTURA_DA_JANELA - janelaPx - 200
    rolar()

    await waitFor(
      () => {
        vistos.push(Number(abaixo.style.opacity))
        expect(Number(abaixo.style.opacity)).toBeGreaterThan(0.99)
      },
      { timeout: 4000 },
    )
    expect(Math.max(...vistos)).toBeLessThanOrEqual(1.0001)
    expect(Number(/scale\(([\d.]+)\)/.exec(abaixo.style.transform)![1])).toBeGreaterThan(0.999)
  })

  it('voltando a rolar para cima a moldura volta a esconder (a entrada está presa à rolagem)', async () => {
    simularReduzido(false)
    const { container } = render(<Pagina />)
    const abaixo = no(container, 'abaixo')

    topos.abaixo = 100
    rolar()
    await waitFor(() => expect(Number(abaixo.style.opacity)).toBeGreaterThan(0.99), { timeout: 4000 })

    topos.abaixo = 1400
    rolar()
    await waitFor(() => expect(Number(abaixo.style.opacity)).toBeLessThan(0.05), { timeout: 4000 })
  })

  it('a preferência trocada no meio da sessão é acompanhada nos dois sentidos', () => {
    const midia = simularReduzido(false)
    const { container } = render(<Pagina />)
    const abaixo = no(container, 'abaixo')
    expect(abaixo.style.opacity).toBe('0')

    midia.definir(true)
    expect(abaixo.style.opacity).toBe('')
    expect(abaixo.style.transform).toBe('')
    expect(abaixo.hasAttribute('data-entrada')).toBe(false)

    midia.definir(false)
    expect(abaixo.style.opacity).toBe('0')
    expect(abaixo.getAttribute('data-entrada')).toBe('rolagem')
  })

  it('ao desmontar solta a rolagem e o redimensionamento', () => {
    simularReduzido(false)
    const solta = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<Pagina />)

    unmount()

    const tipos = solta.mock.calls.map(([tipo]) => tipo)
    expect(tipos).toContain('scroll')
    expect(tipos).toContain('resize')
  })

  it('um contêiner sem molduras não quebra nada', () => {
    simularReduzido(false)

    expect(() => render(<Pagina vazia />)).not.toThrow()
    expect(() => rolar()).not.toThrow()
  })

  it('o Início inteiro: no jsdom as molduras estão na dobra (retângulo zerado) e nascem no estado final', async () => {
    simularReduzido(false)
    topos = {}
    const container = await inicio()

    for (const moldura of molduras(container)) {
      expect(moldura.style.opacity, moldura.getAttribute('aria-label')!).toBe('')
      expect(moldura.getAttribute('data-entrada')).toBe('pronta')
    }
  })

  it('o Início inteiro, com as molduras abaixo da dobra: todas nascem com a entrada ligada, sem embrulho', async () => {
    simularReduzido(false)
    vi.restoreAllMocks()
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const top = this.hasAttribute('data-midia') ? 5000 : 0
      return { top, bottom: top + 300, left: 0, right: 100, width: 100, height: 300, x: 0, y: top, toJSON: () => ({}) }
    })
    const container = await inicio()

    const lista = molduras(container)
    expect(lista).toHaveLength(10)
    for (const moldura of lista) {
      expect(moldura.getAttribute('data-entrada'), moldura.getAttribute('aria-label')!).toBe('rolagem')
      expect(moldura.style.opacity).toBe('0')
      expect(moldura.style.transform).toBe(`scale(${escala.de})`)
    }
    // Nenhum embrulho de motion no caminho: as molduras continuam onde estavam.
    expect(container.querySelectorAll('main [style*="opacity"]')).toHaveLength(10)
  })
})
