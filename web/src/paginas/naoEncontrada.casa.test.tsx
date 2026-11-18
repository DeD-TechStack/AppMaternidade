import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TEXTOS_NAO_ENCONTRADA } from '../conteudo/casa/naoEncontrada.ts'
import { renderizarRota } from '../teste/renderizarRota.tsx'

// REP-T4: a página inexistente é uma noite de cacau, com o h1 sozinho, uma frase, um botão de mel e a janela acesa.

describe('REP-T4 a página inexistente (noite)', () => {
  for (const caminho of ['/nao-existe', '/a/b/c']) {
    describe(caminho, () => {
      it('tem um h1 só, com o texto do deck, e o título da aba', () => {
        const { container } = renderizarRota(caminho)
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
        const h1 = screen.getByRole('heading', { level: 1 })
        expect(h1.textContent).toBe(TEXTOS_NAO_ENCONTRADA.titulo)
        expect(h1.classList.contains('cm-exibicao')).toBe(true)
        expect(h1.classList.contains('cm-exibicao-404')).toBe(true)
        expect(container.querySelector('main')!.contains(h1)).toBe(true)
        expect(document.title).toBe('Página não encontrada | AppMaternidade')
      })

      it('mora num PaginaCasa e liga a noite do cabeçalho', () => {
        const { container } = renderizarRota(caminho)
        expect(container.querySelector('main [data-casa]')).not.toBeNull()
        expect(container.querySelector('header[data-cabecalho]')!.getAttribute('data-tom')).toBe('noite')
      })

      it('tem um botão de mel só, que leva ao início, e nenhuma outra ação no main', () => {
        const { container } = renderizarRota(caminho)
        const principal = container.querySelector('main')!
        const mel = principal.querySelectorAll('[data-botao-mel]')
        expect(mel).toHaveLength(1)
        expect(mel[0].getAttribute('href')).toBe('/')
        expect(mel[0].textContent).toBe(TEXTOS_NAO_ENCONTRADA.acao)
        expect(principal.querySelectorAll('a, button, input, select, textarea, [role="button"], [tabindex]')).toHaveLength(1)
      })

      it('mostra a janela acesa: alt do deck, tamanho explícito, as três larguras e prioridade alta', () => {
        const { container } = renderizarRota(caminho)
        const imagens = container.querySelectorAll('main img')
        expect(imagens).toHaveLength(1)
        const imagem = imagens[0]
        expect(imagem.getAttribute('alt')).toBe(TEXTOS_NAO_ENCONTRADA.alt)
        expect(imagem.getAttribute('width')).toBe('542')
        expect(imagem.getAttribute('height')).toBe('421')
        const srcset = imagem.getAttribute('srcset')!
        for (const largura of ['340', '361', '542']) {
          expect(srcset).toMatch(new RegExp(`m11-janela-${largura}w[^ ,]*\\.webp ${largura}w`))
        }
        expect(imagem.getAttribute('fetchpriority')).toBe('high')
        expect(imagem.getAttribute('loading')).toBe('eager')
      })

      it('o texto do main é só as três linhas do deck', () => {
        const { container } = renderizarRota(caminho)
        const principal = container.querySelector('main')!
        const textos = [...principal.querySelectorAll('h1, p, a')].map((el) => el.textContent)
        expect(textos).toEqual([TEXTOS_NAO_ENCONTRADA.titulo, TEXTOS_NAO_ENCONTRADA.linha, TEXTOS_NAO_ENCONTRADA.acao])
        expect(principal.textContent).toBe(
          `${TEXTOS_NAO_ENCONTRADA.titulo}${TEXTOS_NAO_ENCONTRADA.linha}${TEXTOS_NAO_ENCONTRADA.acao}`,
        )
      })
    })
  }

  it('clicar no botão leva ao início', () => {
    const { roteador } = renderizarRota('/nao-existe')
    fireEvent.click(screen.getByRole('link', { name: TEXTOS_NAO_ENCONTRADA.acao }))
    expect(roteador.state.location.pathname).toBe('/')
  })
})
