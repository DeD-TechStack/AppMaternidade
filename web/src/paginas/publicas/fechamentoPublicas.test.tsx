import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { ROTULO_NAVEGACAO_PAGINAS_RODAPE } from '../../componentes/casca/textos.ts'
import {
  CONTATO_PAGINA,
  EMAIL_CONTATO,
  H1,
  PAGINAS_DO_SITE,
  PAGINAS_NOVAS,
  ROTULOS,
  SUBTITULOS,
  TF,
} from '../../conteudo/publicas.ts'
import { pastaSrcDe } from '../../teste/fontes.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// Fechamento das 10 páginas públicas (uma passada só): o e-mail que não quebra e não usa a serifa do
// título, o rótulo "E-mail" do Contato, o rodapé em x=32, 208 e 384, a lista de páginas só no rodapé (e
// na 404), o parágrafo de Desenvolvimento, o TF-12 só com aparelho e o TF-08 (rascunho) como uma linha
// da lateral. O jsdom não mede layout: a regra de CSS é lida do arquivo e a medida de tela vem do medidor.

const NOVAS = [...PAGINAS_NOVAS]
const COM_EMAIL = ['/contato', '/regras-da-comunidade', '/privacidade', '/termos']
const JURIDICAS = ['/privacidade', '/termos', '/exclusao-de-conta']
const INEXISTENTE = '/rota-inexistente'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

async function abrir(caminho: string): Promise<HTMLElement> {
  cleanup()
  const { container } = renderizarRota(caminho)
  await screen.findAllByRole('heading', { level: 1 })
  return container
}

// ---------------------------------------------------------------------------
// Leitura do CSS (as regras com as condições `@media` que as envolvem)

interface Regra {
  seletor: string
  corpo: string
  condicao: string
}

const css = readFileSync(pastaSrcDe(import.meta.url) + '../../index.css', 'utf8')
const tema = readFileSync(pastaSrcDe(import.meta.url) + '../../styles/tema.css', 'utf8')

function lerRegras(texto: string): Regra[] {
  const sem = texto.replace(/\/\*[\s\S]*?\*\//g, '')
  const regras: Regra[] = []
  const pilha: Array<{ pre: string; filhos: number }> = []
  let atual = ''
  for (const caractere of sem) {
    if (caractere === '{') {
      pilha.push({ pre: atual.trim(), filhos: 0 })
      atual = ''
    } else if (caractere === '}') {
      const topo = pilha.pop()!
      if (topo.filhos === 0) {
        regras.push({
          seletor: topo.pre,
          corpo: atual,
          condicao: pilha
            .map((p) => p.pre)
            .filter((p) => p.startsWith('@media'))
            .join(' '),
        })
      }
      if (pilha.length > 0) pilha[pilha.length - 1].filhos += 1
      atual = ''
    } else {
      atual += caractere
    }
  }
  return regras
}

const regras = lerRegras(css)
const com = (parte: string) => regras.filter((r) => r.seletor.split(',').some((s) => s.trim() === parte))
const base = (parte: string) => com(parte).filter((r) => r.condicao === '')
const desktop = (parte: string) => com(parte).filter((r) => r.condicao.includes('min-width: 768px'))
const celular = (parte: string) => com(parte).filter((r) => r.condicao.includes('max-width: 767px'))
const corpos = (lista: Regra[]) => lista.map((r) => r.corpo).join('\n')

describe('o e-mail de contato: não quebra e não usa a serifa do título', () => {
  it('o texto do link é o endereço inteiro, sem <wbr> nem outra quebra, nas 4 páginas que o mostram', async () => {
    let total = 0
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      const links = [...container.querySelectorAll('main a[href^="mailto:"]')]
      total += links.length
      expect(links.length, caminho).toBe(COM_EMAIL.includes(caminho) ? 1 : 0)
      for (const link of links) {
        expect(link.querySelector('wbr'), caminho).toBeNull()
        expect(link.innerHTML, caminho).not.toMatch(/<wbr/i)
        expect(link.textContent, caminho).toBe(EMAIL_CONTATO)
        expect(link.classList.contains('vp-email'), caminho).toBe(true)
      }
    }
    expect(total).toBe(COM_EMAIL.length)
  }, 30000)

  it('.vp-email: uma linha só (nowrap), sem overflow-wrap nem word-break, na fonte do corpo e sem padding vertical', () => {
    // As regras do próprio e-mail (a regra dos outros links do texto cita `:not(.vp-email)` e fica de fora).
    const regrasDoEmail = regras.filter((r) => r.seletor.replace(/:not\(\.vp-email\)/g, '').includes('.vp-email'))
    expect(regrasDoEmail.length).toBeGreaterThan(0)
    const todas = corpos(regrasDoEmail)
    expect(todas).not.toMatch(/overflow-wrap|word-break|word-wrap|hyphens/)
    const principal = corpos(base('.vp-email'))
    expect(principal).toMatch(/white-space:\s*nowrap/)
    expect(principal).toMatch(/font-family:\s*var\(--fonte-sb-corpo\)/)
    // O alvo de 44 px é a própria caixa (inline-block), não o recuo: a altura medida é uma entrelinha.
    expect(principal).toMatch(/display:\s*inline-block/)
    expect(principal).toMatch(/min-height:\s*44px/)
    expect(principal).toMatch(/line-height:\s*44px/)
    expect(todas).not.toMatch(/padding/)
  })

  it('a fonte do corpo é a Instrument Sans e a do título do site é outra (a do e-mail nunca é a Instrument Serif)', () => {
    expect(tema).toMatch(/--fonte-sb-corpo:\s*'Instrument Sans'/)
    expect(tema).toMatch(/--fonte-sb-serifa:\s*'Instrument Serif'/)
    for (const regra of regras.filter((r) => r.seletor.replace(/:not\(\.vp-email\)/g, '').includes('.vp-email'))) {
      expect(regra.corpo).not.toMatch(/--fonte-sb-serifa|--fonte-sb-titulo|Instrument Serif/)
    }
  })

  it('só o e-mail deixa de levar o recuo vertical dos links de parágrafo; os outros links do texto o mantêm', () => {
    const dosLinks = regras.filter((r) => r.seletor.includes('.vp-texto p a'))
    expect(dosLinks.length).toBeGreaterThan(0)
    for (const regra of dosLinks) {
      expect(regra.seletor, 'o e-mail não entra no recuo dos links').toContain(':not(.vp-email)')
      expect(regra.corpo).toMatch(/padding-block/)
    }
    expect(regras.some((r) => /(^|,)\s*\.vp-email\s*(,|$)/.test(r.seletor) && /padding-block/.test(r.corpo))).toBe(false)
  })

  it('o tamanho do e-mail acompanha o do parágrafo e só encolhe quando a coluna não comporta o endereço (fonte raiz em 200%)', () => {
    const corpo = corpos(base('.vp-email'))
    expect(corpo).toMatch(/font-size:\s*min\(1em,\s*[\d.]+cqw\)/)
    // A coluna do texto da linha é o contêiner do `cqw`.
    const coluna = corpos(com('.vp-linha .sb-linha-texto').filter((r) => r.condicao === ''))
    expect(coluna).toMatch(/container-type:\s*inline-size/)
  })

  it('no Contato o e-mail é o texto da 1ª linha em corpo-g (28 px em 1440, 20 px em 390), na fonte do corpo', async () => {
    const container = await abrir('/contato')

    const canal = container.querySelector('main a[href^="mailto:"]')!
    const paragrafo = canal.closest('p')!
    expect(paragrafo.classList.contains('t-corpo-g')).toBe(true)
    expect(paragrafo.classList.contains('t-subtitulo')).toBe(false)
    expect(paragrafo.classList.contains('vp-canal')).toBe(true)
    // De 768 a 1199 a coluna é estreita para 28 px: ali o parágrafo fica em 20 px (corpo).
    const faixa = com('.vp-canal').find((r) => /min-width:\s*768px/.test(r.condicao) && /max-width:\s*1199px/.test(r.condicao))!
    expect(faixa.corpo).toMatch(/font-size:\s*1\.25rem/)
    expect(faixa.corpo).toMatch(/line-height:\s*1\.75rem/)
  })
})

describe('Contato: o rótulo da 1ª linha é "E-mail" e o subtítulo é outro texto', () => {
  it('a constante e o h2 da 1ª linha são exatamente "E-mail"', async () => {
    expect(CONTATO_PAGINA.canal.secao.titulo).toBe('E-mail')
    expect(TF.rotuloEmail).toBe('E-mail')
    const container = await abrir('/contato')

    const rotulo = container.querySelector('main section h2')!
    expect(rotulo.textContent).toBe('E-mail')
    expect(rotulo.id).toBe('secao-e-mail')
  })

  it('o subtítulo da página não repete o rótulo da 1ª linha', async () => {
    const normal = (texto: string) =>
      texto
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
    expect(normal(SUBTITULOS.contato)).not.toBe(normal(CONTATO_PAGINA.canal.secao.titulo))
    const container = await abrir('/contato')
    const subtitulo = container.querySelector('.sb-abertura-subtitulo')!.textContent!
    const rotulos = [...container.querySelectorAll('main section h2')].map((h2) => normal(h2.textContent!))
    expect(rotulos).not.toContain(normal(subtitulo))
  })
})

describe('o rodapé do site: a lista de páginas em x=32, 208 e 384 (de 768 para cima)', () => {
  const rodape = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-rodape]')!
  const TODAS = [...NOVAS, '/', '/sistema', '/app/hoje', '/app/sessao', INEXISTENTE]

  it('em toda rota o rótulo vem antes da lista, no mesmo nav, e a lista tem os 9 links', async () => {
    for (const caminho of TODAS) {
      const container = await abrir(caminho)

      const nav = within(rodape(container)).getByRole('navigation', { name: ROTULO_NAVEGACAO_PAGINAS_RODAPE })
      expect(nav.classList.contains('vp-rodape-paginas'), caminho).toBe(true)
      const [rotulo, lista] = [...nav.children]
      expect(rotulo.tagName, caminho).toBe('P')
      expect(rotulo.textContent, caminho).toBe(ROTULOS.paginas)
      expect(lista.tagName, caminho).toBe('UL')
      expect(lista.classList.contains('vp-rodape-lista'), caminho).toBe(true)
      expect(
        [...lista.querySelectorAll(':scope > li > a')].map((a) => a.getAttribute('href')),
        caminho,
      ).toEqual(PAGINAS_DO_SITE.map(({ para }) => para))
    }
  }, 60000)

  it('as 3 colunas de links e a linha de páginas usam a mesma grade de 3 × 176 px (x = 32, 208 e 384 em 1440)', () => {
    const colunas = corpos(base('.sb-rodape-colunas'))
    expect(colunas).toMatch(/grid-template-columns:\s*repeat\(3,\s*176px\)/)
    const paginas = corpos(desktop('.vp-rodape-paginas'))
    expect(paginas).toMatch(/grid-template-columns:\s*repeat\(3,\s*176px\)/)
    // O rótulo fica na 1ª coluna (x=32) e a lista nas colunas 2 e 3 (x=208 e 384), cada uma de 176 px.
    expect(corpos(desktop('.vp-rodape-rotulo'))).toMatch(/grid-column:\s*1\s*;/)
    const lista = corpos(desktop('.vp-rodape-lista'))
    expect(lista).toMatch(/grid-column:\s*2\s*\/\s*4/)
    expect(lista).toMatch(/grid-template-columns:\s*repeat\(2,\s*176px\)/)
    expect(lista).toMatch(/grid-auto-flow:\s*column/)
    expect(lista).toMatch(/grid-template-rows:\s*repeat\(5,\s*auto\)/)
    // Sem o recuo de 32 px nem o `max-width` de 560 px da linha rótulo + texto, e sem coluna fora da grade.
    expect(lista).not.toMatch(/margin(-left)?:\s*(0 0 0 )?32px/)
    expect(lista).not.toMatch(/max-width:\s*560px/)
    expect(lista).not.toMatch(/column-gap:\s*32px/)
  })

  it('o link da lista quebra dentro da coluna de 176 px (nunca passa para a coluna do lado) e tem o alvo de 44 px', () => {
    expect(corpos(base('.vp-rodape-link'))).toMatch(/display:\s*flex/)
    expect(corpos(com('.vp-rodape-link'))).not.toMatch(/white-space:\s*nowrap/)
    expect(corpos(com('.vp-rodape-lista'))).not.toMatch(/max-content/)
  })

  it('de 768 para cima: no máximo 128 px entre o último link e a linha final, e nenhum vão do rodapé passa de 128 px', () => {
    const final = corpos(base('.sb-rodape-final'))
    const margem = /margin:\s*(\d+)px 0 0/.exec(final)!
    expect(Number(margem[1])).toBeLessThanOrEqual(128)
    const vaos = [
      ...corpos(base('.sb-rodape-links')).matchAll(/margin-top:\s*(\d+)px/g),
      ...corpos(base('.vp-rodape-paginas')).matchAll(/margin-top:\s*(\d+)px/g),
      ...corpos(base('.sb-rodape-nome')).matchAll(/margin:\s*(\d+)px 0 0/g),
    ]
    expect(vaos.length).toBe(3)
    for (const [, px] of vaos) expect(Number(px)).toBeLessThanOrEqual(128)
  })

  it('abaixo de 768 o rodapé fica como estava (rótulo em cima, links em bloco, vãos de 96 e 64 px)', () => {
    expect(corpos(celular('.vp-rodape-paginas'))).toMatch(/margin-top:\s*64px/)
    const rotulo = corpos(celular('.vp-rodape-rotulo'))
    expect(rotulo).toMatch(/grid-column:\s*1\s*\/\s*-1/)
    expect(rotulo).toMatch(/padding:\s*0\s*;/)
    const lista = corpos(celular('.vp-rodape-lista'))
    expect(lista).toMatch(/grid-column:\s*1\s*\/\s*-1/)
    expect(lista).toMatch(/display:\s*block/)
    expect(lista).toMatch(/max-width:\s*none/)
    expect(lista).toMatch(/margin:\s*0\s*;/)
    expect(corpos(celular('.sb-rodape-final'))).toMatch(/margin-top:\s*96px/)
    expect(corpos(celular('.sb-rodape-links'))).toMatch(/margin-top:\s*96px/)
    // As regras de base da linha não vazam para o celular: a grade de 3 colunas só existe de 768 para cima.
    expect(corpos(base('.vp-rodape-paginas'))).not.toMatch(/176px/)
    expect(corpos(base('.vp-rodape-lista'))).not.toMatch(/176px|grid-template-columns/)
  })

  it('o rodapé vai até o fim do documento: nada depois dele reserva espaço (sem faixa de papel embaixo)', () => {
    const casca = corpos(com('.sb-casca'))
    expect(casca).not.toMatch(/padding-bottom|margin-bottom|min-height/)
    const rodapeCss = corpos(com('.sb-rodape'))
    expect(rodapeCss).not.toMatch(/margin-bottom/)
  })
})

describe('"Páginas do site": só no rodapé, menos na Página não encontrada', () => {
  it('as 9 páginas não têm nenhum nav "Páginas do site" dentro do main (o rodapé já leva a lista)', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      expect(container.querySelectorAll(`main nav[aria-label^="${ROTULOS.paginas}"]`), caminho).toHaveLength(0)
      // O que sobra de `vp-links-duplo` no main é o índice "Nesta página" (Privacidade e Termos), nunca os 9 links.
      for (const lista of container.querySelectorAll('main ul.vp-links-duplo')) {
        expect(lista.closest('nav')!.getAttribute('aria-label'), caminho).toBe('Nesta página')
      }
      // E o rodapé, fora do main, continua com a sua.
      expect(
        container.querySelectorAll(`footer nav[aria-label="${ROTULO_NAVEGACAO_PAGINAS_RODAPE}"]`),
        caminho,
      ).toHaveLength(1)
    }
  }, 60000)

  it('a Página não encontrada mantém exatamente um nav "Páginas do site" no main, com os 9 links', async () => {
    for (const caminho of [INEXISTENTE, '/a/b/c']) {
      const container = await abrir(caminho)

      const navs = container.querySelectorAll(`main nav[aria-label="${ROTULOS.paginas}"]`)
      expect(navs, caminho).toHaveLength(1)
      expect(
        [...navs[0].querySelectorAll('li > a')].map((a) => a.getAttribute('href')),
        caminho,
      ).toEqual(PAGINAS_DO_SITE.map(({ para }) => para))
    }
  })

  it('o fim do main de cada página é uma linha de conteúdo e o vão até o rodapé é o do ritmo (192 px)', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      const ultimo = [...container.querySelector('main')!.children].at(-1)!
      expect(ultimo.querySelector('nav'), caminho).toBeNull()
    }
    expect(corpos(base('.sb-rodape'))).toMatch(/margin-top:\s*var\(--e-rodape\)/)
    expect(css).toMatch(/--e-rodape:\s*192px/)
  }, 60000)
})

describe('Desenvolvimento: o parágrafo de abertura tem a largura das outras páginas', () => {
  it('leva data-ampla (de 800 a 963 px, 55 a 65 caracteres por linha) como Como funciona, Cuidado, Regras e Sobre', async () => {
    for (const caminho of ['/desenvolvimento', '/como-funciona', '/cuidado-compartilhado', '/regras-da-comunidade', '/sobre']) {
      const container = await abrir(caminho)

      const apresentacao = container.querySelector('main p[data-apresentacao]')!
      expect(apresentacao.hasAttribute('data-ampla'), caminho).toBe(true)
      expect(apresentacao.closest('.col-c2-c8'), caminho).not.toBeNull()
    }
    const ampla = corpos(com(".vp-apresentacao[data-ampla]"))
    const rem = Number(/max-width:\s*([\d.]+)rem/.exec(ampla)![1])
    expect(rem * 16).toBeGreaterThanOrEqual(800)
    expect(rem * 16).toBeLessThanOrEqual(963)
  }, 30000)
})

describe('TF-12 ("as telas mostradas aqui") só aparece com um aparelho na página', () => {
  it('sem [data-aparelho] no main, nenhuma das 10 páginas mostra a frase; com aparelho ela seria a regra', async () => {
    for (const caminho of [...NOVAS, INEXISTENTE]) {
      const container = await abrir(caminho)

      const aparelhos = container.querySelectorAll('main [data-aparelho]').length
      const frase = [...container.querySelectorAll('main p')].filter((p) => p.textContent === TF.telasFicticias)
      expect(frase.length > 0, `${caminho}: frase ${frase.length}, aparelhos ${aparelhos}`).toBe(aparelhos > 0)
    }
  }, 60000)

  it('o Como funciona não tem aparelho (só ilustrações): a lateral é o aviso de construção e o link do protótipo', async () => {
    const container = await abrir('/como-funciona')

    expect(container.querySelectorAll('main [data-aparelho]')).toHaveLength(0)
    expect([...container.querySelectorAll('.sb-abertura-lateral > li')].map((li) => li.textContent)).toEqual([
      TF.construcao,
      'Ver o protótipo',
    ])
    expect(H1.comoFunciona).toBe('Como funciona')
  })
})

describe('TF-08: "Rascunho, sem revisão jurídica", uma linha na lateral das 3 páginas jurídicas', () => {
  it('o texto da constante é o do contrato, com acentos', () => {
    expect(TF.rascunho).toBe('Rascunho, sem revisão jurídica')
  })

  it('Privacidade, Termos e Exclusão têm exatamente uma, na lateral da abertura, em ui 15 e cor secundária', async () => {
    for (const caminho of JURIDICAS) {
      const container = await abrir(caminho)

      const avisos = container.querySelectorAll('main [data-aviso="rascunho"]')
      expect(avisos, caminho).toHaveLength(1)
      const aviso = avisos[0]
      expect(aviso.tagName, caminho).toBe('P')
      expect(aviso.textContent, caminho).toBe(TF.rascunho)
      expect(aviso.classList.contains('t-ui'), caminho).toBe(true)
      expect(aviso.classList.contains('t-secundario'), caminho).toBe(true)
      expect(aviso.closest('ul.sb-abertura-lateral.col-c9-c10'), caminho).not.toBeNull()
      // Uma linha, não um bloco: sem classe de borda, de caixa nem de cartão, e nenhum estilo em linha.
      expect(aviso.getAttribute('style'), caminho).toBeNull()
      expect(aviso.className, caminho).not.toMatch(/border|borda|cartao|caixa|bloco|selo/)
      expect(aviso.closest('li')!.className, caminho).not.toMatch(/border|borda|cartao|caixa|bloco|selo/)
      // O texto aparece uma vez só no main.
      expect(container.querySelector('main')!.textContent!.split(TF.rascunho), caminho).toHaveLength(2)
    }
  }, 30000)

  it('nas outras 7 páginas e na 404 ele não existe', async () => {
    for (const caminho of [...NOVAS.filter((c) => !JURIDICAS.includes(c)), INEXISTENTE]) {
      const container = await abrir(caminho)

      expect(container.querySelector('[data-aviso="rascunho"]'), caminho).toBeNull()
      expect(container.textContent, caminho).not.toContain(TF.rascunho)
    }
  }, 60000)

  it('a ordem da lateral: o aviso de construção e, depois dele, o de dados fictícios e o do rascunho', async () => {
    const lateral = async (caminho: string) => {
      const container = await abrir(caminho)
      return [...container.querySelectorAll('.sb-abertura-lateral > li')].map((li) => li.textContent)
    }

    for (const caminho of ['/privacidade', '/termos']) {
      expect(await lateral(caminho), caminho).toEqual([TF.construcao, TF.dadosFicticios, TF.rascunho])
    }
    expect(await lateral('/exclusao-de-conta')).toEqual([TF.construcao, TF.rascunho])
  }, 30000)

  it('nenhuma regra de CSS desenha borda, fundo ou caixa no aviso do rascunho (é uma linha de texto) e não há selo TF-14', async () => {
    expect(regras.filter((r) => /data-aviso=['"]?rascunho/.test(r.seletor))).toEqual([])
    for (const caminho of JURIDICAS) {
      const container = await abrir(caminho)
      expect(container.querySelector('[data-selo], .selo, [data-aviso="selo"]'), caminho).toBeNull()
    }
  }, 30000)
})
