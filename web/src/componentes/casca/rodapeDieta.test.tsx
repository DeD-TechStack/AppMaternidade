import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderizarRota } from '../../teste/renderizarRota.tsx'
import * as textos from './textos.ts'

const { COLUNAS_DO_RODAPE, NOME_SITE } = textos

// FOOTER-1: o rodapé público (`Rodape`) é um bloco compacto de links no fundo da página, sem a frase de duas
// linhas, sem painel de mel e sem o movimento M7. A geometria (altura, tamanho da marca, cor) é medida num
// Chrome de verdade em `rodapeDieta.geometria.test.tsx`; aqui vai o que o jsdom enxerga: a árvore.

const PAGINAS_PUBLICAS = ['/', '/como-funciona', '/privacidade', '/contato', '/rota-que-nao-existe']
const LINKS = COLUNAS_DO_RODAPE.flatMap((coluna) => coluna.links)
// DS1:RF-14: o rodapé do app (`/app/*`) continua com os 9 links de Produto, Ajuda e Legal, sem o grupo Conta.
const GRUPOS_DO_RODAPE_COMPACTO = ['Produto', 'Ajuda', 'Legal']
const LINKS_COMPACTOS = COLUNAS_DO_RODAPE.filter((coluna) => GRUPOS_DO_RODAPE_COMPACTO.includes(coluna.titulo)).flatMap((coluna) => coluna.links)

function rodapeDe(caminho: string) {
  const resultado = renderizarRota(caminho, { sessao: null })
  const rodape = resultado.container.querySelector<HTMLElement>('footer[data-rodape]')!
  return { ...resultado, rodape }
}

describe('rodapé público compacto (FOOTER-1)', () => {
  it.each(PAGINAS_PUBLICAS)('em %s não traz a frase, a segunda linha em itálico nem painel de cor', (caminho) => {
    const { rodape } = rodapeDe(caminho)
    expect(rodape).not.toBeNull()
    expect(rodape.textContent).not.toContain('A rotina do bebê')
    expect(rodape.textContent).not.toContain('dividida por quem cuida')
    expect(rodape.querySelector('.cm-segunda-linha')).toBeNull()
    expect(rodape.querySelector('.cm-rodape-frase')).toBeNull()
    expect(rodape.querySelector('[data-painel]')).toBeNull()
    expect(rodape.querySelector('.cm-rodape-painel')).toBeNull()
    expect(rodape.querySelector('[data-h="caixa-cor"]')).toBeNull()
  })

  it('o texto da frase saiu de textos.ts (nada mais o importa)', () => {
    expect('FRASE_DO_RODAPE' in textos).toBe(false)
  })

  it('o rodapé é estático: nenhum elemento com transform ou translate em linha, e nenhum recipiente de revelação', () => {
    const { rodape } = rodapeDe('/')
    for (const elemento of [rodape, ...rodape.querySelectorAll<HTMLElement>('*')]) {
      const estilo = elemento.getAttribute('style') ?? ''
      expect(estilo, elemento.outerHTML.slice(0, 80)).not.toMatch(/transform|translate/i)
    }
    expect(rodape.querySelector('.overflow-hidden')).toBeNull()
  })

  it('é um <footer data-rodape id="rodape"> numa área do site, e não é o rodapé compacto do app', () => {
    const { rodape } = rodapeDe('/como-funciona')
    expect(rodape.tagName).toBe('FOOTER')
    expect(rodape.id).toBe('rodape')
    expect(rodape.classList.contains('cm-rodape')).toBe(true)
    expect(rodape.classList.contains('cm-rodape-compacto')).toBe(false)
    expect(rodape.querySelector('.cm-area')).not.toBeNull()
  })

  it('traz os 13 links de COLUNAS_DO_RODAPE, na ordem e com o destino de cada um', () => {
    const { rodape } = rodapeDe('/privacidade')
    expect(LINKS).toHaveLength(13)
    const links = within(rodape).getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual(LINKS.map((l) => l.rotulo))
    expect(links.map((a) => a.getAttribute('href'))).toEqual(LINKS.map((l) => l.para))
    for (const a of links) expect(a.classList.contains('cm-rodape-link')).toBe(true)
  })

  it('os quatro títulos de grupo estão no DOM, em ordem, cada um sobre a lista do seu grupo', () => {
    const { rodape } = rodapeDe('/contato')
    const titulos = within(rodape).getAllByRole('heading', { level: 2 })
    expect(titulos.map((h) => h.textContent)).toEqual(['Produto', 'Conta', 'Ajuda', 'Legal'])
    for (const [i, titulo] of titulos.entries()) {
      const grupo = titulo.parentElement!
      expect([...grupo.querySelectorAll('a')].map((a) => a.textContent)).toEqual(COLUNAS_DO_RODAPE[i].links.map((l) => l.rotulo))
    }
  })

  it('os títulos de grupo só têm a classe cm-rodape-titulo: o ponto de 768 mora no CSS, sem classe de janela (sm:, md:) no rodapé', () => {
    const { rodape } = rodapeDe('/')
    for (const titulo of within(rodape).getAllByRole('heading', { level: 2 })) {
      expect(titulo.className).toBe('cm-rodape-titulo')
    }
    for (const elemento of rodape.querySelectorAll<HTMLElement>('[class]')) {
      expect(elemento.className, elemento.outerHTML.slice(0, 80)).not.toMatch(/(?:^|\s)(?:sm|md|lg|xl|2xl|min-\[[^\]]*\]|max-\[[^\]]*\]):/)
      expect(elemento.classList.contains('sr-only')).toBe(false)
    }
  })

  it('o nome do site é texto simples e escondido do leitor de tela, com os ganchos de sempre', () => {
    const { rodape } = rodapeDe('/')
    const nome = rodape.querySelector<HTMLElement>('.cm-rodape-nome')!
    expect(nome.textContent).toBe(NOME_SITE)
    expect(nome.hasAttribute('data-nome-rodape')).toBe(true)
    expect(nome.getAttribute('aria-hidden')).toBe('true')
    expect(nome.children).toHaveLength(0)
  })

  it('a navegação do rodapé tem nome e só ela guarda os links', () => {
    const { rodape } = rodapeDe('/')
    const navs = within(rodape).getAllByRole('navigation')
    expect(navs).toHaveLength(1)
    expect(navs[0].getAttribute('aria-label')).toBe('Rodapé')
    expect(within(navs[0]).getAllByRole('link')).toHaveLength(13)
  })

  it('a linha do aviso de demonstração continua no rodapé, depois dos links (sem as variáveis do banco)', () => {
    const { rodape } = rodapeDe('/sobre')
    const aviso = rodape.querySelector('[data-aviso="demonstracao"]')!
    expect(aviso).not.toBeNull()
    const nav = rodape.querySelector('nav')!
    expect(nav.compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(nav.contains(aviso)).toBe(false)
  })

  it('em /app/hoje o rodapé compacto do app segue igual: uma navegação só, 9 links, sem nome, sem títulos nem aviso', () => {
    const { container } = renderizarRota('/app/hoje')
    const rodapes = container.querySelectorAll<HTMLElement>('footer[data-rodape]')
    expect(rodapes).toHaveLength(1)
    const rodape = rodapes[0]
    expect(rodape.className).toBe('cm-rodape cm-rodape-compacto')
    expect(rodape.querySelector('[data-nome-rodape]')).toBeNull()
    expect(within(rodape).queryAllByRole('heading')).toHaveLength(0)
    expect(rodape.querySelector('[data-aviso="demonstracao"]')).toBeNull()
    const nav = within(rodape).getByRole('navigation')
    expect(nav.className).toBe('cm-rodape-compacto-nav')
    expect(LINKS_COMPACTOS).toHaveLength(9)
    expect(within(nav).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(LINKS_COMPACTOS.map((l) => l.para))
  })
})
