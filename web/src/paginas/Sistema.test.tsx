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
