import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EMAIL_CONTATO, PAGINAS_DE_TEXTO, ROTULO_INDICE } from '../../conteudo/publicas-texto.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// As seis páginas públicas de leitura longa do Campo de mel: Regras da comunidade, Privacidade, Termos de
// uso, Exclusão de conta, Contato e Sobre. O que a pessoa vê e faz: o título, as seções, o índice, o
// desenho, a tabela e o e-mail.

const PAGINAS = [
  ['/regras-da-comunidade', 'Regras da comunidade', PAGINAS_DE_TEXTO.regras],
  ['/privacidade', 'Privacidade', PAGINAS_DE_TEXTO.privacidade],
  ['/termos', 'Termos de uso', PAGINAS_DE_TEXTO.termos],
  ['/exclusao-de-conta', 'Exclusão de conta', PAGINAS_DE_TEXTO.exclusao],
  ['/contato', 'Contato', PAGINAS_DE_TEXTO.contato],
  ['/sobre', 'Sobre', PAGINAS_DE_TEXTO.sobre],
] as const

// O jsdom não implementa a rolagem: o código a chama só se ela existir, e aqui ela é observada.
const rolar = vi.fn()

beforeEach(() => {
  rolar.mockClear()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: rolar, configurable: true, writable: true })
})

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})

describe('páginas públicas de leitura', () => {
  for (const [caminho, nome, dados] of PAGINAS) {
    describe(caminho, () => {
      it(`tem um só título, "${nome}", seguido da segunda linha do título`, () => {
        const { container } = renderizarRota(caminho)
        const principal = container.querySelector('main')!
        const titulos = within(principal).getAllByRole('heading', { level: 1 })
        expect(titulos).toHaveLength(1)
        expect(titulos[0].textContent).toBe(nome)
        expect(titulos[0].nextElementSibling!.textContent).toBe(dados.subtitulo)
      })

      it('mostra cada seção do conteúdo como um título de segundo nível, na ordem', () => {
        const { container } = renderizarRota(caminho)
        const titulos = within(container.querySelector('main')!).getAllByRole('heading', { level: 2 })
        expect(titulos.map((titulo) => titulo.textContent)).toEqual(dados.secoes.map(({ secao }) => secao.titulo))
        for (const titulo of titulos) expect(titulo.getAttribute('tabindex')).toBe('-1')
      })

      it('tem o índice "Nesta página" com um link sublinhado para cada seção; ativar o link leva o foco ao título', () => {
        const { container } = renderizarRota(caminho)
        const indice = within(container.querySelector('main')!).getByRole('navigation', { name: ROTULO_INDICE })
        const links = within(indice).getAllByRole('link')
        expect(links.map((link) => link.textContent)).toEqual(dados.secoes.map(({ secao }) => secao.titulo))

        for (const [posicao, link] of links.entries()) {
          const { id, titulo } = dados.secoes[posicao].secao
          expect(link.getAttribute('href')).toBe(`#${id}`)
          expect(link.classList.contains('alvo-toque')).toBe(true)
          fireEvent.click(link)
          const alvo = screen.getByRole('heading', { level: 2, name: titulo })
          expect(document.activeElement).toBe(alvo)
        }
        expect(rolar).toHaveBeenCalledTimes(links.length)
      })

      it('tem um só desenho de traço, com texto alternativo, e ele não se repete nas outras páginas', () => {
        const { container } = renderizarRota(caminho)
        const desenhos = container.querySelectorAll<HTMLImageElement>('main img[data-ilustracao]')
        expect(desenhos).toHaveLength(1)
        expect(desenhos[0].getAttribute('alt')).toMatch(/^Desenho de traço: .+/)
        expect(within(container.querySelector('main')!).getByRole('img', { name: desenhos[0].alt })).toBe(desenhos[0])

        const outros = PAGINAS.filter(([outro]) => outro !== caminho).map(([, , pagina]) => pagina.ilustracao)
        expect(outros).not.toContain(dados.ilustracao)
      })

      it(
        caminho === '/contato'
          ? 'mostra o e-mail de contato como link de e-mail'
          : 'não mostra o e-mail de contato (só a página Contato o mostra)',
        () => {
          const { container } = renderizarRota(caminho)
          const principal = container.querySelector('main')!
          const links = within(principal).queryAllByRole('link', { name: EMAIL_CONTATO })
          if (caminho === '/contato') {
            expect(links).toHaveLength(1)
            expect(links[0].getAttribute('href')).toBe(`mailto:${EMAIL_CONTATO}`)
          } else {
            expect(principal.textContent).not.toContain(EMAIL_CONTATO)
            expect(principal.querySelector('a[href^="mailto:"]')).toBeNull()
          }
        },
      )
    })
  }
})

describe('Regras da comunidade: canais de ajuda', () => {
  it('é uma tabela com legenda, cabeçalhos de coluna e de linha, numa região rolável com nome', () => {
    renderizarRota('/regras-da-comunidade')
    const tabela = screen.getByRole('table', { name: 'Canais oficiais de ajuda' })
    expect(tabela.querySelector('caption')!.textContent).toBe('Canais oficiais de ajuda')

    const colunas = within(tabela).getAllByRole('columnheader')
    expect(colunas.map((coluna) => coluna.textContent)).toEqual(['Canal', 'Número', 'Quando usar'])
    for (const coluna of colunas) expect(coluna.getAttribute('scope')).toBe('col')

    const linhas = within(tabela).getAllByRole('rowheader')
    expect(linhas.map((linha) => linha.textContent)).toEqual(['CVV', 'Samu', 'Ligue 180', 'Disque 100'])
    for (const linha of linhas) expect(linha.getAttribute('scope')).toBe('row')

    const regiao = screen.getByRole('region', { name: 'Canais oficiais de ajuda' })
    expect(regiao.getAttribute('tabindex')).toBe('0')
    expect(regiao.contains(tabela)).toBe(true)
  })

  it('as sete regras são uma lista numerada', () => {
    renderizarRota('/regras-da-comunidade')
    const secao = screen.getByRole('heading', { level: 2, name: 'As sete regras' }).parentElement!
    expect(within(secao).getAllByRole('listitem')).toHaveLength(7)
    expect(secao.querySelector('ol')).not.toBeNull()
  })
})

describe('Contato: urgência', () => {
  it('o link para os canais oficiais leva ao título "Se você precisa de ajuda agora" nas Regras, com o foco nele', async () => {
    const { container } = renderizarRota('/contato')
    fireEvent.click(within(container.querySelector('main')!).getByRole('link', { name: 'Regras da comunidade' }))

    const alvo = await screen.findByRole('heading', { level: 2, name: 'Se você precisa de ajuda agora' })
    await waitFor(() => expect(document.activeElement).toBe(alvo))
    expect(rolar).toHaveBeenCalled()
  })
})

describe('páginas com aviso de demonstração', () => {
  it('Privacidade e Termos têm o aviso de dados fictícios uma vez; as outras páginas, nenhum', () => {
    for (const [caminho, , dados] of PAGINAS) {
      const { container, unmount } = renderizarRota(caminho)
      const principal = container.querySelector('main')!
      const ocorrencias = [...principal.querySelectorAll('p')].filter((p) => p.textContent === 'Nesta versão de avaliação, use só dados fictícios.')
      expect(ocorrencias, caminho).toHaveLength(dados.aviso ? 1 : 0)
      unmount()
    }
    expect(PAGINAS_DE_TEXTO.privacidade.aviso).toBeDefined()
    expect(PAGINAS_DE_TEXTO.termos.aviso).toBeDefined()
  })
})
