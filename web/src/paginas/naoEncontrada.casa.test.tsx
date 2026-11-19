import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TEXTOS_NAO_ENCONTRADA } from '../conteudo/casa/naoEncontrada.ts'
import { renderizarRota } from '../teste/renderizarRota.tsx'

// REP-T4: a página inexistente é uma noite de cacau, com o h1 sozinho, uma frase, um botão de mel e a janela acesa.

// A janela sai do vite-imagetools (um mestre em src/assets/cenas/nao-encontrada): no teste a URL é `/@imagetools/<hash>`,
// no build é um arquivo com hash em /assets.
const URL_GERADA = /^\/@imagetools\/[\w-]+$/
const urlsDoSrcset = (srcset: string | null) => (srcset ?? '').split(',').map((parte) => parte.trim().split(/\s+/)[0])
const larguras = (srcset: string | null) =>
  (srcset ?? '').split(',').map((parte) => Number(parte.trim().split(/\s+/)[1]?.replace(/w$/, '')))

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
        expect(larguras(imagem.getAttribute('srcset'))).toEqual([340, 361, 542])
        expect(imagem.getAttribute('src')).toMatch(URL_GERADA)
        expect(imagem.getAttribute('srcset')).toContain(imagem.getAttribute('src')!)
        expect(imagem.getAttribute('sizes')).toBe('(min-width: 768px) 361px, 340px')
        expect(imagem.getAttribute('fetchpriority')).toBe('high')
        expect(imagem.getAttribute('loading')).toBe('eager')
        expect(imagem.getAttribute('decoding')).toBe('async')
      })

      it('a janela é uma <picture>: a fonte AVIF vem antes da <img> de WebP, com os mesmos sizes e as mesmas três larguras', () => {
        const { container } = renderizarRota(caminho)
        const imagem = container.querySelector('main img')!
        const figura = imagem.parentElement!
        expect(figura.tagName).toBe('PICTURE')
        expect(figura.parentElement!.classList.contains('cm-nf-janela')).toBe(true)
        const fontes = [...figura.querySelectorAll('source')]
        expect(fontes).toHaveLength(1)
        expect(fontes[0].getAttribute('type')).toBe('image/avif')
        expect(fontes[0].hasAttribute('media')).toBe(false)
        expect(larguras(fontes[0].getAttribute('srcset'))).toEqual([340, 361, 542])
        expect(fontes[0].getAttribute('sizes')).toBe(imagem.getAttribute('sizes'))
        expect(fontes[0].nextElementSibling).toBe(imagem)
        expect(fontes[0].getAttribute('srcset')).not.toBe(imagem.getAttribute('srcset'))
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

  it('a janela acesa não monta mais a URL com a base do site: src, todo candidato do srcset e do AVIF vêm do vite-imagetools', () => {
    // A base do site (Pages) agora é posta pelo Vite no build, nos arquivos com hash; `urlPublica` não entra mais.
    // O teste confere a origem das URLs (nenhuma é um caminho de web/public); o prefixo da base é do build.
    vi.stubEnv('BASE_URL', '/AppMaternidade/')
    try {
      const { container } = renderizarRota('/nao-existe')
      const imagem = container.querySelector('main img')!
      const fonte = container.querySelector('main picture source')!
      const urls = [
        imagem.getAttribute('src')!,
        ...urlsDoSrcset(imagem.getAttribute('srcset')),
        ...urlsDoSrcset(fonte.getAttribute('srcset')),
      ]
      expect(urls).toHaveLength(1 + 3 + 3)
      for (const url of urls) {
        expect(url).toMatch(URL_GERADA)
        expect(url).not.toContain('/cenas/')
      }
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('clicar no botão leva ao início', () => {
    const { roteador } = renderizarRota('/nao-existe')
    fireEvent.click(screen.getByRole('link', { name: TEXTOS_NAO_ENCONTRADA.acao }))
    expect(roteador.state.location.pathname).toBe('/')
  })
})
