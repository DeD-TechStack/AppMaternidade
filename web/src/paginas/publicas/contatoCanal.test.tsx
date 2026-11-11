import { describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { EMAIL_CONTATO } from '../../conteudo/publicas.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// Volta visual 1, D6: no Contato o canal vem primeiro e a urgência logo depois. A 1ª linha depois da
// abertura é "E-mail" (TF-13), com o e-mail em `corpo-g` (fonte do corpo) na coluna do texto; a 2ª é "Em
// uma urgência"; depois "Para que serve este canal". A lista "Páginas do site" é só a do rodapé. Sem
// mídia. O e-mail só no Contato, nas Regras, na Privacidade e nos Termos.

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

const filhosDoMain = (container: HTMLElement) => [...container.querySelector('main')!.children] as HTMLElement[]

describe('D6: o canal primeiro, a urgência logo depois', () => {
  it('a ordem das linhas: E-mail, Em uma urgência, Para que serve este canal (a lista de páginas é a do rodapé)', async () => {
    const container = await abrir('/contato')

    const [abertura, ...demais] = filhosDoMain(container)
    expect(abertura.querySelector('h1')!.textContent).toBe('Contato')
    expect(demais).toHaveLength(3)
    expect(container.querySelector('main nav[aria-label="Páginas do site"]')).toBeNull()
    expect(demais.map((secao) => secao.tagName)).toEqual(['SECTION', 'SECTION', 'SECTION'])
    expect(demais.map((secao) => secao.querySelector('h2')!.textContent)).toEqual([
      'E-mail',
      'Em uma urgência',
      'Para que serve este canal',
    ])
  })

  it('o canal é um link mailto: da constante, dentro da 1ª linha, em `corpo-g` (28/39, 20/28 no celular), e só ali', async () => {
    const container = await abrir('/contato')

    const [, primeira, ...outras] = filhosDoMain(container)
    const links = container.querySelectorAll('main a[href^="mailto:"]')
    expect(links).toHaveLength(1)
    const canal = primeira.querySelector('a[href^="mailto:"]')!
    expect(canal).toBe(links[0])
    expect(canal.getAttribute('href')).toBe(`mailto:${EMAIL_CONTATO}`)
    expect(canal.textContent).toBe(EMAIL_CONTATO)
    expect(canal.hasAttribute('data-contato')).toBe(true)
    const paragrafo = canal.closest('p')!
    expect(paragrafo.classList.contains('t-corpo-g')).toBe(true)
    expect(paragrafo.classList.contains('t-subtitulo')).toBe(false)
    expect(canal.closest('.sb-linha-texto'), 'na coluna do texto da linha (c4–c8)').not.toBeNull()
    for (const secao of outras) expect(secao.querySelector('a[href^="mailto:"]')).toBeNull()
  })

  it('a abertura não leva mais o endereço: a lateral só fica com o aviso de construção', async () => {
    const container = await abrir('/contato')

    const itens = [...container.querySelectorAll('.sb-abertura-lateral > li')]
    expect(itens.map((li) => li.textContent)).toEqual(['Em construção: algumas funções descritas aqui ainda não estão no ar.'])
    expect(container.querySelector('.sb-abertura-lateral a')).toBeNull()
    expect(container.querySelector('.sb-abertura-lateral')!.textContent).not.toContain('@')
  })

  it('a urgência vale já: logo depois do canal, com o link para os canais de ajuda das Regras', async () => {
    const container = await abrir('/contato')

    const [, canal, urgencia] = filhosDoMain(container)
    expect(canal.nextElementSibling).toBe(urgencia)
    expect(urgencia.querySelector('h2')!.textContent).toBe('Em uma urgência')
    expect(urgencia.querySelector('a[href="/regras-da-comunidade#secao-ajuda-agora"]')).not.toBeNull()
    expect(urgencia.textContent).toContain('192')
    expect(urgencia.textContent).toContain('188')
  })

  it('nenhuma mídia nem ilustração no Contato', async () => {
    const container = await abrir('/contato')

    expect(container.querySelectorAll('main [data-midia], main [data-ilustracao], main svg')).toHaveLength(0)
  })

  it('o e-mail continua só no Contato, nas Regras, na Privacidade e nos Termos; os links do rodapé têm o alvo de 44 px', async () => {
    const COM_EMAIL = ['/contato', '/regras-da-comunidade', '/privacidade', '/termos']
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      const presente = container.querySelector('main')!.textContent!.includes(EMAIL_CONTATO)
      expect(presente, caminho).toBe(COM_EMAIL.includes(caminho))
    }
    const container = await abrir('/contato')
    const links = container.querySelectorAll('footer nav[aria-label="Páginas do site, no rodapé"] a')
    expect(links).toHaveLength(9)
    for (const link of links) {
      expect(link.classList.contains('alvo-toque'), link.textContent ?? '').toBe(true)
    }
  }, 30000)
})
