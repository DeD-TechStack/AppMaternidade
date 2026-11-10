import { describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// Volta visual 1, N2: nenhum texto das 9 páginas descreve uma tela ou um aparelho que a página não
// mostra (os aparelhos serão feitos por outro cartão). Regra: futuro para o que não existe; descrever a
// função, não a tela. Só as formas que se medem sem falso positivo: o parágrafo que abre com "No celular",
// "No notebook" ou "Na tela", e a frase que põe "o cartão do Hoje" ou "a sessão" como imagem presente.

const NOVAS = [
  '/como-funciona',
  '/cuidado-compartilhado',
  '/desenvolvimento',
  '/regras-da-comunidade',
  '/privacidade',
  '/termos',
  '/exclusao-de-conta',
  '/contato',
  '/sobre',
]

async function abrir(caminho: string): Promise<HTMLElement> {
  cleanup()
  const { container } = renderizarRota(caminho)
  await screen.findAllByRole('heading', { level: 1 })
  return container
}

/** Os parágrafos do main fora de uma mídia, com o texto. */
const paragrafos = (container: HTMLElement) =>
  [...container.querySelectorAll('main p')]
    .filter((p) => p.closest('[data-midia]') === null)
    .map((p) => (p.textContent ?? '').trim())

/** As frases de um parágrafo (corta depois de ". ", "? " ou "! "). */
const frases = (texto: string) => texto.split(/(?<=[.!?])\s+/)

describe('N2: nenhum texto descreve uma tela que a página não mostra', () => {
  it('nenhum parágrafo do main começa com "No celular", "No notebook" ou "Na tela"', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      for (const texto of paragrafos(container)) {
        expect(texto, caminho).not.toMatch(/^(No celular|No notebook|Na tela)\b/)
      }
    }
  }, 30000)

  it('sem [data-aparelho] na página, nenhuma frase põe "o cartão do Hoje" ou "a sessão" como imagem presente', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      if (container.querySelector('main [data-aparelho]')) continue

      for (const texto of paragrafos(container)) {
        for (const frase of frases(texto)) {
          // "o cartão do Hoje" é a tela do protótipo: sem aparelho na página, não há o que descrever.
          expect(frase, `${caminho}: ${frase}`).not.toMatch(/cart[ãa]o do Hoje/i)
          // "a sessão" com "na tela" (sem ser o nome de uma tela, como "na tela Família e conta"), "mostrada" ou "ao lado".
          if (/\bsess[ãa]o\b/i.test(frase)) {
            expect(frase, `${caminho}: ${frase}`).not.toMatch(/\bna tela\b(?!\s+[A-ZÀ-Ú])|\bmostrad[ao]s?\b|\bao lado\b/i)
          }
        }
      }
    }
  }, 30000)
})
