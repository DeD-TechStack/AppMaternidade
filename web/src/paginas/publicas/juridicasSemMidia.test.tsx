import { describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// Volta visual 1, D3: os textos de papel (Privacidade, Termos, Exclusão de conta) são só linhas
// rótulo + texto, seguidas: nenhuma mídia nem ilustração dentro do `main`. O Contato também não tem
// mídia (D6). A classe do defeito: uma mídia decorativa no meio de um documento, sem ligação com o texto.

/** As páginas de texto de papel: só seções de leitura, sem campo de cor, sem aparelho e sem ilustração. */
const DE_PAPEL = ['/privacidade', '/termos', '/exclusao-de-conta']
/** As páginas sem nenhuma mídia: as de papel e o Contato. */
const SEM_MIDIA = [...DE_PAPEL, '/contato']
/** As que têm o índice "Nesta página". */
const COM_INDICE = ['/privacidade', '/termos']

async function abrir(caminho: string): Promise<HTMLElement> {
  cleanup()
  const { container } = renderizarRota(caminho)
  await screen.findAllByRole('heading', { level: 1 })
  return container
}

const filhosDoMain = (container: HTMLElement) => [...container.querySelector('main')!.children] as HTMLElement[]

describe('D3: sem mídia nem ilustração nos textos de papel', () => {
  it('zero [data-midia], zero [data-ilustracao] e zero svg dentro do main, nas páginas de papel e no Contato', async () => {
    for (const caminho of SEM_MIDIA) {
      const container = await abrir(caminho)

      expect(container.querySelectorAll('main [data-midia]'), caminho).toHaveLength(0)
      expect(container.querySelectorAll('main [data-ilustracao]'), caminho).toHaveLength(0)
      expect(container.querySelectorAll('main .vp-ilustracao'), caminho).toHaveLength(0)
      expect(container.querySelectorAll('main svg'), caminho).toHaveLength(0)
    }
  }, 30000)

  it('depois da abertura (e do índice) vêm só as seções de leitura, uma atrás da outra, sem a lista "Páginas do site" (é a do rodapé)', async () => {
    for (const caminho of DE_PAPEL) {
      const container = await abrir(caminho)

      const [abertura, ...demais] = filhosDoMain(container)
      expect(abertura.tagName, caminho).toBe('SECTION')
      expect(container.querySelector('main nav[aria-label="Páginas do site"]'), caminho).toBeNull()
      const indice = COM_INDICE.includes(caminho) ? demais.shift()! : null
      if (indice) expect(indice.querySelector('nav[aria-label="Nesta página"]'), caminho).not.toBeNull()

      expect(demais.length, caminho).toBeGreaterThan(0)
      for (const filho of demais) {
        expect(filho.tagName, `${caminho}: ${filho.textContent?.slice(0, 30)}`).toBe('SECTION')
        expect(filho.querySelectorAll('h2'), caminho).toHaveLength(1)
        expect(filho.hasAttribute('data-bloco'), caminho).toBe(false)
      }
    }
  }, 30000)

  it('as linhas encostam umas nas outras (os 32 px entre elas vêm da própria linha): nenhuma, depois da 1ª, tem espaço de cima', async () => {
    for (const caminho of DE_PAPEL) {
      const container = await abrir(caminho)

      // A 1ª `section` do main é a abertura; a seguinte é a 1ª linha (o espaço dela é o do bloco que a precede).
      const secoes = filhosDoMain(container).filter((filho) => filho.tagName === 'SECTION').slice(1)
      expect(secoes.length, caminho).toBeGreaterThan(1)
      const [, ...outras] = secoes
      for (const secao of outras) {
        expect(secao.className, `${caminho}: ${secao.querySelector('h2')!.textContent}`).not.toMatch(/\bsb-mt-/)
      }
    }
  }, 30000)

  it('as três continuam com o índice "Nesta página" (Privacidade e Termos) e já não têm o bloco "Páginas do site" no main', async () => {
    for (const caminho of DE_PAPEL) {
      const container = await abrir(caminho)

      expect(container.querySelectorAll('main nav[aria-label="Páginas do site"]'), caminho).toHaveLength(0)
      expect(container.querySelectorAll('main nav[aria-label="Nesta página"]'), caminho).toHaveLength(COM_INDICE.includes(caminho) ? 1 : 0)
    }
  }, 30000)

  it('as páginas que mantêm a mídia (as 5 outras) não mudaram: cada uma ainda tem ao menos uma moldura', async () => {
    for (const caminho of ['/como-funciona', '/cuidado-compartilhado', '/desenvolvimento', '/regras-da-comunidade', '/sobre']) {
      const container = await abrir(caminho)

      expect(container.querySelectorAll('main [data-midia]').length, caminho).toBeGreaterThanOrEqual(1)
    }
  }, 30000)
})
