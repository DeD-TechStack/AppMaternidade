import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import axe from 'axe-core'
import { NAO_ENCONTRADA, PAGINAS_DO_SITE, PAGINAS_NOVAS, ROTULOS, TF } from '../../conteudo/publicas.ts'
import { AVISO_DEMONSTRACAO, PROMESSA } from '../../conteudo/textos.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// A Página não encontrada refeita sobre a abertura da base (MAT-36, volta 1, item D1): a mesma abertura
// das 9 páginas (h1, subtítulo, lateral e fio), o link "Voltar ao início", a linha "Páginas do site" e o
// aviso de demonstração como item da lateral. A regra é da classe "página da MAT-36": vale para as 9
// páginas e para qualquer rota inexistente, não só para `/rota-inexistente`.

const INEXISTENTES = ['/rota-inexistente', '/a/b/c', '/privacidade/extra']
const DA_MAT36 = [...PAGINAS_NOVAS, ...INEXISTENTES]

const SELETOR_DEMONSTRACAO = '[data-aviso="demonstracao"]'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

function semBanco() {
  vi.stubEnv('VITE_SUPABASE_URL', '')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
}

function comBanco() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-ficticia')
}

/** Abre a rota, depois de desmontar a anterior (o RolagemEFoco procura o primeiro `main h1` do documento). */
async function abrir(caminho: string): Promise<HTMLElement> {
  cleanup()
  const { container } = renderizarRota(caminho)
  await screen.findAllByRole('heading', { level: 1 })
  return container
}

const principal = (container: HTMLElement) => container.querySelector('main')!
const filhosDoMain = (container: HTMLElement) => [...principal(container).children] as HTMLElement[]
const depoisDe = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe('a classe "página da MAT-36": a abertura da base, sem restos da tela antiga', () => {
  for (const caminho of DA_MAT36) {
    it(`${caminho}: o main abre com a abertura da base (h1 display-xl, subtítulo, fio) e nada vem antes do h1`, async () => {
      semBanco()
      const container = await abrir(caminho)

      const main = principal(container)
      expect(main.classList.contains('vp-pagina')).toBe(true)
      const [abertura] = filhosDoMain(container)
      expect(abertura.tagName).toBe('SECTION')
      expect(abertura.classList.contains('sb-abertura')).toBe(true)
      expect(container.querySelectorAll('h1')).toHaveLength(1)
      const titulo = abertura.querySelector('h1')!
      expect(titulo.classList.contains('t-display-xl')).toBe(true)
      expect(abertura.querySelector('.sb-abertura-subtitulo.t-subtitulo')).not.toBeNull()
      expect(abertura.querySelector('.sb-abertura-base')).not.toBeNull()
      // Nada do main vem antes do h1 (a tela antiga punha o aviso azul acima do título).
      expect(main.firstElementChild).toBe(abertura)
      expect(abertura.firstElementChild!.contains(titulo)).toBe(true)
    })

    it(`${caminho}: nenhuma classe da tela antiga (titulo-tela, texto-info, aviso-demonstracao, recuo próprio)`, async () => {
      semBanco()
      const container = await abrir(caminho)

      for (const classe of ['titulo-tela', 'texto-info', 'aviso-demonstracao', 'py-12']) {
        expect(container.querySelector(`main .${classe}`), classe).toBeNull()
      }
      expect(principal(container).className).not.toMatch(/\bpx-4\b|\bmd:px-/)
    })

    it(`${caminho}: a lista "Páginas do site" com os 9 links está no ${INEXISTENTES.includes(caminho) ? 'main, depois do conteúdo' : 'rodapé, e não no main'}`, async () => {
      const container = await abrir(caminho)

      const navs = container.querySelectorAll(`main nav[aria-label="${ROTULOS.paginas}"]`)
      if (INEXISTENTES.includes(caminho)) {
        expect(navs).toHaveLength(1)
        const links = [...navs[0].querySelectorAll('li > a')]
        expect(links.map((a) => a.getAttribute('href'))).toEqual(PAGINAS_DO_SITE.map((p) => p.para))
        const ultimo = filhosDoMain(container).at(-1)!
        expect(ultimo.contains(navs[0])).toBe(true)
      } else {
        // As 9 páginas: a lista é só a do rodapé (a 404 é a única que a mantém no main).
        expect(navs).toHaveLength(0)
        expect(container.querySelectorAll('footer nav a')).not.toHaveLength(0)
      }
    })
  }
})

describe('a Página não encontrada', () => {
  it('o main tem a abertura, o bloco do "Voltar ao início" e a linha "Páginas do site", nesta ordem, todos em área útil', async () => {
    for (const caminho of INEXISTENTES) {
      const container = await abrir(caminho)

      const filhos = filhosDoMain(container)
      expect(filhos, caminho).toHaveLength(3)
      for (const filho of filhos) expect(filho.classList.contains('sb-area'), caminho).toBe(true)
      expect(filhos[0].classList.contains('sb-abertura'), caminho).toBe(true)
      expect(filhos[1].querySelector('a')!.getAttribute('href'), caminho).toBe('/')
      expect(filhos[2].querySelector('nav'), caminho).not.toBeNull()
      // Só um h1 e nenhum h2 (as linhas dela são rótulos em `p`, como em "Páginas do site").
      expect(principal(container).querySelectorAll('h2'), caminho).toHaveLength(0)
    }
  })

  it('o h1, o subtítulo de uma linha e a lateral em c9–c10 vêm de conteudo/publicas.ts', async () => {
    const container = await abrir('/rota-inexistente')

    expect(container.querySelector('h1')!.textContent).toBe(NAO_ENCONTRADA.h1)
    const subtitulo = container.querySelector('.sb-abertura-subtitulo')!
    expect(subtitulo.textContent).toBe(NAO_ENCONTRADA.subtitulo)
    expect(subtitulo.textContent!.length).toBeLessThanOrEqual(26)
    expect(subtitulo.textContent).not.toMatch(/—|–/)
    expect(container.querySelector('.sb-abertura-lateral.col-c9-c10')).not.toBeNull()
    expect(document.title).toBe('Página não encontrada | AppMaternidade')
  })

  it('"Voltar ao início" é um link para "/" com o alvo de toque, abaixo da abertura e antes de "Páginas do site"', async () => {
    const container = await abrir('/rota-inexistente')

    const link = screen.getByRole('link', { name: NAO_ENCONTRADA.voltar })
    expect(link.getAttribute('href')).toBe('/')
    expect(link.classList.contains('alvo-toque')).toBe(true)
    expect(container.querySelector('.sb-abertura-lateral')?.contains(link) ?? false).toBe(false)
    expect(depoisDe(container.querySelector('.sb-abertura')!, link)).toBe(true)
    expect(depoisDe(link, container.querySelector(`nav[aria-label="${ROTULOS.paginas}"]`)!)).toBe(true)
    // Um só link com este nome na página (o do rodapé é outro texto).
    expect(screen.getAllByRole('link', { name: NAO_ENCONTRADA.voltar })).toHaveLength(1)
  })

  it('clicar em "Voltar ao início" abre o Início', async () => {
    await abrir('/rota-inexistente')

    fireEvent.click(screen.getByRole('link', { name: NAO_ENCONTRADA.voltar }))

    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(PROMESSA)
  })

  it('não leva o aviso de construção (TF-10): ela não descreve função nenhuma', async () => {
    for (const estado of [semBanco, comBanco]) {
      estado()
      const container = await abrir('/rota-inexistente')

      expect(container.querySelector('[data-aviso="construcao"]')).toBeNull()
      expect(container.textContent).not.toContain(TF.construcao)
    }
  })

  it('sem banco, o aviso de demonstração é um item da lateral (ui 15, cor secundária), depois do h1 e sem faixa azul', async () => {
    semBanco()
    const container = await abrir('/rota-inexistente')

    const avisos = container.querySelectorAll(SELETOR_DEMONSTRACAO)
    expect(avisos).toHaveLength(1)
    const aviso = avisos[0]
    expect(aviso.closest('ul.sb-abertura-lateral.col-c9-c10')).not.toBeNull()
    const texto = aviso.tagName === 'P' ? aviso : aviso.querySelector('p')!
    expect(texto.classList.contains('t-ui')).toBe(true)
    expect(texto.classList.contains('t-secundario')).toBe(true)
    expect(texto.textContent).toBe(AVISO_DEMONSTRACAO)
    expect(depoisDe(container.querySelector('h1')!, aviso)).toBe(true)
    expect(container.querySelector('.texto-info, .aviso-demonstracao')).toBeNull()
  })

  it('com as variáveis do banco, não há aviso nem lista vazia na lateral', async () => {
    comBanco()
    const container = await abrir('/rota-inexistente')

    expect(container.querySelectorAll(SELETOR_DEMONSTRACAO)).toHaveLength(0)
    expect(container.querySelector('.sb-abertura-lateral')).toBeNull()
  })

  it('o h1 fica pronto para o foco (tabindex -1, sem contorno extra) e recebe o foco depois de navegar até ela', async () => {
    const { roteador } = renderizarRota('/sobre')
    await screen.findByRole('heading', { level: 1 })

    await act(async () => {
      await roteador.navigate('/a/b/c')
    })

    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe(NAO_ENCONTRADA.h1)
    expect(titulo.getAttribute('tabindex')).toBe('-1')
    expect(titulo.classList.contains('focus:outline-none')).toBe(true)
    expect(document.activeElement).toBe(titulo)
  })

  for (const caminho of INEXISTENTES) {
    it(`${caminho}: sem violações de acessibilidade (axe), com e sem banco`, async () => {
      for (const estado of [semBanco, comBanco]) {
        estado()
        const container = await abrir(caminho)
        const resultado = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
        expect(resultado.violations.map((v) => `${v.id}: ${v.help}`), caminho).toEqual([])
      }
    })
  }
})
