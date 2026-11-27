import { act, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FRASE_DE_EXEMPLO, NIVEIS_DE_TIPO, PAPEIS_DE_ESPACO } from '../componentes/base/amostraSistema.ts'
import { renderizarRota } from '../teste/renderizarRota.tsx'

// H3:RF-02, /sistema: a única página com texto e blocos novos. Cada token de espaço é uma barra com o nome e o
// valor calculado na largura de agora; cada nível de tipo traz o nome e a frase fixa. O espaço da página sai das
// primitivas (Secao, QuadroLayout, Pilha, Colunas).

afterEach(() => {
  vi.restoreAllMocks()
})

/** Faz o getComputedStyle das barras devolver a largura de `larguras`, e o resto, o de verdade. */
function medirBarras(larguras: Record<string, string>) {
  const original = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((elemento: Element, pseudo?: string | null) => {
    const papel = elemento.getAttribute('data-espaco-barra')
    return papel === null ? original(elemento, pseudo) : ({ width: larguras[papel] ?? '0px' } as CSSStyleDeclaration)
  })
}

const LARGURAS_EM_1440: Record<string, string> = {
  junto: '12px',
  pilha: '16px',
  grupo: '32px',
  bloco: '48px',
  midia: '64px',
  secao: '80px',
  'secao-ampla': '128px',
  painel: '48px',
}

describe('/sistema: uma barra por token de espaço', () => {
  it('tem as oito barras, na ordem da tabela, com o nome do token', () => {
    const { container } = renderizarRota('/sistema')
    const itens = [...container.querySelectorAll<HTMLElement>('[data-espaco]')]
    expect(itens.map((i) => i.getAttribute('data-espaco'))).toEqual([...PAPEIS_DE_ESPACO])
    for (const [i, papel] of PAPEIS_DE_ESPACO.entries()) {
      expect(itens[i].textContent, papel).toContain(`espaco-${papel}`)
    }
  })

  it('a largura e a altura de cada barra são o token (var(--espaco-<papel>))', () => {
    const { container } = renderizarRota('/sistema')
    for (const papel of PAPEIS_DE_ESPACO) {
      const barra = container.querySelector<HTMLElement>(`[data-espaco-barra="${papel}"]`)!
      expect(barra, papel).not.toBeNull()
      expect(barra.style.width, papel).toBe(`var(--espaco-${papel})`)
      expect(barra.style.height, papel).toBe(`var(--espaco-${papel})`)
      expect(barra.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('mostra o valor calculado da barra na largura de agora, em px', () => {
    medirBarras(LARGURAS_EM_1440)
    const { container } = renderizarRota('/sistema')
    for (const [papel, largura] of Object.entries(LARGURAS_EM_1440)) {
      const valor = container.querySelector(`[data-espaco="${papel}"] [data-espaco-valor]`)!
      expect(valor.textContent, papel).toBe(`${Number.parseFloat(largura)} px`)
    }
  })

  it('o valor acompanha a largura da janela: ao redimensionar, lê de novo (decimais com vírgula)', () => {
    medirBarras(LARGURAS_EM_1440)
    const { container } = renderizarRota('/sistema')
    const valorDe = (papel: string) => container.querySelector(`[data-espaco="${papel}"] [data-espaco-valor]`)!.textContent
    expect(valorDe('bloco')).toBe('48 px')

    medirBarras({ ...LARGURAS_EM_1440, bloco: '24px', secao: '63.5px' })
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(valorDe('bloco')).toBe('24 px')
    expect(valorDe('secao')).toBe('63,5 px')
  })
})

describe('/sistema: cada nível de tipo com o nome e a frase fixa', () => {
  it('tem os nove níveis, na ordem, com a classe text-<nível> do tema e a frase "Quanto tempo ela mamou?"', () => {
    expect(FRASE_DE_EXEMPLO).toBe('Quanto tempo ela mamou?')
    const { container } = renderizarRota('/sistema')
    const itens = [...container.querySelectorAll<HTMLElement>('[data-nivel]')]
    expect(itens.map((i) => i.getAttribute('data-nivel'))).toEqual([
      'exibicao',
      'titulo-1',
      'titulo-2',
      'titulo-3',
      'titulo-4',
      'abertura',
      'corpo',
      'pequeno',
      'sobretitulo',
    ])
    for (const { nivel, classes } of NIVEIS_DE_TIPO) {
      const item = container.querySelector<HTMLElement>(`[data-nivel="${nivel}"]`)!
      expect(item.textContent, nivel).toContain(nivel)
      const amostra = item.querySelector<HTMLElement>('[data-amostra-tipo]')!
      expect(amostra.textContent, nivel).toBe('Quanto tempo ela mamou?')
      for (const classe of classes.split(' ')) expect(amostra.classList.contains(classe), `${nivel} ${classe}`).toBe(true)
    }
  })

  it('os dois blocos novos têm o seu título de seção (h2), depois do Tipo e antes dos botões', () => {
    renderizarRota('/sistema')
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')
    const iTipo = titulos.findIndex((t) => t.startsWith('Duas famílias'))
    const iNiveis = titulos.findIndex((t) => t.startsWith('Nove níveis de tipo'))
    const iEspaco = titulos.findIndex((t) => t.startsWith('Espaço por papel'))
    const iBotoes = titulos.findIndex((t) => t.startsWith('Um primário'))
    expect(iTipo).toBeGreaterThanOrEqual(0)
    expect(iNiveis).toBeGreaterThan(iTipo)
    expect(iEspaco).toBeGreaterThan(iNiveis)
    expect(iBotoes).toBeGreaterThan(iEspaco)
  })
})

describe('/sistema: o espaço da página sai das primitivas', () => {
  it('toda filha do <main> é uma Secao, e nenhuma usa mais a área antiga (cm-area)', () => {
    const { container } = renderizarRota('/sistema')
    const main = container.querySelector('main')!
    const filhas = [...main.children]
    expect(filhas.length).toBeGreaterThan(10)
    for (const filha of filhas) expect(filha.matches("[data-h~='secao']"), filha.outerHTML.slice(0, 80)).toBe(true)
    expect(main.querySelector('.cm-area')).toBeNull()
  })

  it('o conteúdo mora no quadro, e o herói é uma Colunas de texto e mídia (vão de mídia) que empilha até 1100', () => {
    const { container } = renderizarRota('/sistema')
    expect(container.querySelectorAll("main [data-h~='quadro']").length).toBeGreaterThan(5)
    const heroi = container.querySelector<HTMLElement>("main > [data-h~='secao']:first-child [data-h~='colunas']")!
    expect(heroi.getAttribute('data-h-vao')).toBe('midia')
    expect(heroi.getAttribute('data-h-quebra')).toBe('1100')
    expect(heroi.querySelectorAll(":scope > [data-h~='coluna']")).toHaveLength(2)
    expect(within(heroi).getByRole('heading', { level: 1 })).toBeTruthy()
  })

  it('o cabeçalho de cada parte é uma pilha: sobretítulo e título juntos, e o texto depois', () => {
    const { container } = renderizarRota('/sistema')
    const pilhas = [...container.querySelectorAll<HTMLElement>("main [data-h~='pilha']")].map((p) => p.getAttribute('data-h-vao'))
    for (const vao of ['junto', 'pilha', 'grupo', 'bloco']) expect(pilhas, vao).toContain(vao)
  })
})

// DS1-I-16 (RF-16): a /sistema ganha um bloco dentro de PaginaCasa com as seis peças da base, e nenhuma peça
// aposentada (§1) aparece dentro dele. O bloco mora numa filha do <main> que é uma Secao: o teste "toda filha do
// <main> é uma Secao", acima, continua valendo sem mudança. CenaHeroi e ProdutoEmMoldura não entram (sem arte servida).
describe('DS1-I-16 /sistema: o bloco da casa com as seis seções da base', () => {
  const casaDe = (container: HTMLElement) => {
    const casas = container.querySelectorAll<HTMLElement>('main [data-casa]')
    expect(casas, 'um único [data-casa] dentro do <main>').toHaveLength(1)
    return casas[0]
  }

  it('DS1-I-16 há um único [data-casa] no <main>, e a página inteira não tem outro fora dele', () => {
    const { container } = renderizarRota('/sistema')
    casaDe(container)
    expect(container.querySelectorAll('[data-casa]')).toHaveLength(1)
  })

  it('DS1-I-16 FaixaInteira aparece nos quatro chãos (papel, cacau, areia, chao-noite), com o chão marcado', () => {
    const { container } = renderizarRota('/sistema')
    const faixas = [...casaDe(container).querySelectorAll<HTMLElement>('[data-faixa]')]
    const chaos = faixas.map((f) => f.getAttribute('data-faixa-fundo'))
    for (const chao of ['papel', 'cacau', 'areia', 'chao-noite']) expect(chaos, chao).toContain(chao)
    expect(chaos.filter((c) => c !== null && !['papel', 'cacau', 'areia', 'chao-noite'].includes(c))).toEqual([])
  })

  it('DS1-I-16 há uma faixa dividida: o lado de cacau é uma camada [data-faixa-lado] aria-hidden dentro da casa', () => {
    const { container } = renderizarRota('/sistema')
    const lados = casaDe(container).querySelectorAll<HTMLElement>('[data-faixa] > [data-faixa-lado]')
    expect(lados.length).toBeGreaterThanOrEqual(1)
    for (const lado of lados) {
      expect(lado.getAttribute('aria-hidden')).toBe('true')
      expect(lado.getAttribute('data-faixa-fundo')).toBe('cacau')
    }
  })

  it('DS1-I-16 Legenda: pelo menos um <p data-legenda> com um só nó de texto, dentro da casa', () => {
    const { container } = renderizarRota('/sistema')
    const legendas = [...casaDe(container).querySelectorAll<HTMLElement>('p[data-legenda]')]
    expect(legendas.length).toBeGreaterThanOrEqual(1)
    for (const legenda of legendas) {
      expect(legenda.children).toHaveLength(0)
      expect((legenda.textContent ?? '').trim().length).toBeGreaterThan(0)
    }
  })

  it('DS1-I-16 FaixaProva: uma ul[data-prova-lista] com itens, e um h2 acima dela na mesma faixa', () => {
    const { container } = renderizarRota('/sistema')
    const lista = casaDe(container).querySelector<HTMLElement>('ul[data-prova-lista]')!
    expect(lista).not.toBeNull()
    expect(lista.querySelectorAll(':scope > li').length).toBeGreaterThanOrEqual(2)
    const faixa = lista.closest<HTMLElement>('[data-faixa]')!
    expect(faixa, 'a lista de prova está numa faixa').not.toBeNull()
    expect(faixa.querySelector('h2')).not.toBeNull()
  })

  it('DS1-I-16 Perguntas: h3 de titulo-4 e p de corpo, todos à vista (sem botão que abra e feche)', () => {
    const { container } = renderizarRota('/sistema')
    const casa = casaDe(container)
    const perguntas = [...casa.querySelectorAll<HTMLElement>('h3.text-titulo-4')]
    expect(perguntas.length).toBeGreaterThanOrEqual(2)
    expect(perguntas.length).toBeLessThanOrEqual(8)
    for (const h3 of perguntas) {
      const resposta = h3.nextElementSibling ?? h3.parentElement?.querySelector('p.text-corpo')
      expect(resposta?.matches('p.text-corpo'), h3.textContent ?? '').toBe(true)
    }
    expect(casa.querySelector('button[aria-expanded], details, summary, [hidden]')).toBeNull()
  })

  it('DS1-I-16 Fechamento: um h2 e um BotaoLargo ([data-botao-largo], cm-botao) que leva a um destino', () => {
    const { container } = renderizarRota('/sistema')
    const casa = casaDe(container)
    const botoes = [...casa.querySelectorAll<HTMLAnchorElement>('a[data-botao-largo]')]
    expect(botoes.length).toBeGreaterThanOrEqual(1)
    for (const botao of botoes) {
      expect(botao.classList.contains('cm-botao')).toBe(true)
      expect(botao.getAttribute('href')).toMatch(/^\//)
      expect((botao.textContent ?? '').trim().length).toBeGreaterThan(0)
    }
    const fechamento = botoes[0].closest<HTMLElement>('[data-faixa]')!
    expect(fechamento, 'o botão largo está numa faixa de fechamento').not.toBeNull()
    expect(within(fechamento).getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(1)
  })

  it('DS1-I-16 nenhuma peça aposentada dentro da casa (§1): flutuante, painel, cena de estúdio, números, citação, relatos, acordeão, tabela, selos, faixa de cacau', () => {
    const { container } = renderizarRota('/sistema')
    const casa = casaDe(container)
    const aposentadas = [
      '.cm-flutuante',
      '[data-cartao-plano]',
      '[data-painel]',
      "[data-h~='caixa-cor']",
      '.cm-cena',
      '[data-cena]',
      '.cm-faixa-cacau',
      '[data-selos]',
      '[data-numeros]',
      '.cm-citacao',
      '.cm-depoimento',
      '.cm-depoimentos-lista',
      '[data-acordeao]',
      'table.cm-tabela',
      '.cm-tabela-rolagem',
    ]
    for (const seletor of aposentadas) expect(casa.querySelector(seletor), seletor).toBeNull()
  })

  it('DS1-I-16 CenaHeroi e ProdutoEmMoldura não são exibidos na /sistema (sem arte servida)', () => {
    const { container } = renderizarRota('/sistema')
    expect(container.querySelector('[data-cena-heroi]')).toBeNull()
    expect(container.querySelector('[data-produto-moldura]')).toBeNull()
  })

  it('DS1-I-16 o bloco da casa não traz texto novo: os títulos e rótulos vêm de conteudo/, e nenhum fica vazio', () => {
    const { container } = renderizarRota('/sistema')
    const casa = casaDe(container)
    for (const titulo of casa.querySelectorAll('h2, h3')) {
      expect((titulo.textContent ?? '').trim().length, titulo.outerHTML.slice(0, 60)).toBeGreaterThan(0)
    }
    for (const botao of casa.querySelectorAll('a[data-botao-largo]')) {
      expect((botao.textContent ?? '').trim().length).toBeGreaterThan(0)
    }
  })

  it('DS1-I-16 a /sistema mantém o resto: os níveis de tipo e as barras de espaço continuam fora da casa', () => {
    const { container } = renderizarRota('/sistema')
    const casa = casaDe(container)
    expect(container.querySelectorAll('[data-nivel]').length).toBe(9)
    expect(casa.querySelector('[data-nivel], [data-espaco]')).toBeNull()
  })
})
