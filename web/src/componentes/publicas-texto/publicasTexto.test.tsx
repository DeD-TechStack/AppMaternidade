import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
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

      it('tem um só desenho de traço (no painel e, para o celular, solto na leitura), com texto alternativo, e ele não se repete nas outras páginas', () => {
        const { container } = renderizarRota(caminho)
        const principal = container.querySelector('main')!
        const desenhos = container.querySelectorAll<HTMLImageElement>('main img[data-ilustracao]')
        // O mesmo desenho aparece duas vezes no DOM: o do painel (1100 px ou mais) e a figura solta da leitura
        // (abaixo de 1100 px); o CSS esconde o que não está em uso (display: none).
        expect(desenhos).toHaveLength(2)
        for (const desenho of desenhos) {
          expect(desenho.getAttribute('data-ilustracao')).toBe(dados.ilustracao)
          expect(desenho.getAttribute('alt')).toMatch(/^Desenho de traço: .+/)
        }
        const noPainel = principal.querySelector<HTMLImageElement>('aside img[data-ilustracao]')!
        const naLeitura = principal.querySelector<HTMLImageElement>('.pt-leitura img[data-ilustracao]')!
        expect(noPainel).not.toBeNull()
        expect(naLeitura).not.toBeNull()
        expect(noPainel.classList.contains('pt-ilustracao-painel')).toBe(true)
        expect(naLeitura.classList.contains('pt-ilustracao-leitura')).toBe(true)
        expect(within(principal).getAllByRole('img', { name: desenhos[0].alt })).toHaveLength(2)

        const outros = PAGINAS.filter(([outro]) => outro !== caminho).map(([, , pagina]) => pagina.ilustracao)
        expect(outros).not.toContain(dados.ilustracao)
      })

      it('põe a figura solta na leitura logo depois da primeira seção (da segunda na Exclusão), sem cartão, e a carrega só quando chegar perto', () => {
        const { container } = renderizarRota(caminho)
        const principal = container.querySelector('main')!
        const naLeitura = principal.querySelector<HTMLImageElement>('.pt-leitura img[data-ilustracao]')!
        const depoisDe = dados.secoes[(dados.figuraDepoisDe ?? 1) - 1].secao
        expect(naLeitura.getAttribute('loading')).toBe('lazy')
        expect(naLeitura.parentElement!.classList.contains('pt-leitura')).toBe(true)
        expect(naLeitura.closest('aside')).toBeNull()
        expect(naLeitura.previousElementSibling!.querySelector('h2')!.id).toBe(depoisDe.id)
        expect(naLeitura.nextElementSibling!.tagName).toBe('SECTION')
      })

      it('mostra a frase de apoio no painel, antes do índice e do desenho', () => {
        const { container } = renderizarRota(caminho)
        const painel = container.querySelector('main aside')!
        const apoio = within(painel as HTMLElement).getByText(dados.apoio)
        expect(apoio.classList.contains('pt-apoio')).toBe(true)
        const indice = painel.querySelector('nav')!
        const desenho = painel.querySelector('img[data-ilustracao]')!
        expect(apoio.compareDocumentPosition(indice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(indice.compareDocumentPosition(desenho) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(container.querySelector('main .pt-leitura')!.textContent).not.toContain(dados.apoio)
      })

      it('não tem caixa de aviso (pt-aviso): o único aviso do site é o do casco', () => {
        const { container } = renderizarRota(caminho)
        expect(container.querySelector('.pt-aviso')).toBeNull()
        expect('aviso' in dados).toBe(false)
      })

      it(
        caminho === '/contato'
          ? 'mostra o e-mail de contato num bloco no topo da leitura, com o botão "Escrever para nós" (mailto)'
          : 'não mostra o e-mail de contato (só a página Contato o mostra)',
        () => {
          const { container } = renderizarRota(caminho)
          const principal = container.querySelector('main')!
          if (caminho === '/contato') {
            const bloco = principal.querySelector('.pt-leitura > .pt-email')!
            expect(bloco).not.toBeNull()
            expect(bloco.parentElement!.firstElementChild).toBe(bloco)
            expect(bloco.textContent).toContain('E-mail')
            expect(within(bloco as HTMLElement).getByText(EMAIL_CONTATO).closest('a')).toBeNull()
            expect(principal.textContent!.split(EMAIL_CONTATO)).toHaveLength(2)

            const botao = within(principal).getByRole('link', { name: 'Escrever para nós' })
            expect(botao.getAttribute('href')).toBe(`mailto:${EMAIL_CONTATO}`)
            expect(botao.classList.contains('cm-botao')).toBe(true)
            expect(bloco.contains(botao)).toBe(true)
            expect(principal.querySelectorAll('a[href^="mailto:"]')).toHaveLength(1)
            expect(principal.querySelector('.pt-destaque')).toBeNull()
          } else {
            expect(principal.textContent).not.toContain(EMAIL_CONTATO)
            expect(principal.querySelector('a[href^="mailto:"]')).toBeNull()
            expect(principal.querySelector('.pt-email')).toBeNull()
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

describe('índice "Nesta página" em tela estreita', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('vira um <details> fechado, com resumo de 44 px, e o link leva o foco ao título da seção', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta.includes('max-width'),
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const { container } = renderizarRota('/regras-da-comunidade')
    const indice = within(container.querySelector('main')!).getByRole('navigation', { name: ROTULO_INDICE })
    const detalhes = indice.querySelector('details')!
    expect(detalhes).not.toBeNull()
    expect(detalhes.open).toBe(false)
    const resumo = detalhes.querySelector('summary')!
    expect(resumo.textContent).toBe(ROTULO_INDICE)
    expect(resumo.classList.contains('alvo-toque')).toBe(true)

    const { id, titulo } = PAGINAS_DE_TEXTO.regras.secoes[1].secao
    const link = within(indice).getAllByRole('link', { hidden: true })[1]
    expect(link.getAttribute('href')).toBe(`#${id}`)
    fireEvent.click(link)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: titulo }))
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

// R1: o fragmento do endereço (#...) vem de fora. Fragmento inválido ou desconhecido não derruba a página nem
// move foco ou rolagem; fragmento válido leva ao título da seção.
describe('fragmento do endereço (#...)', () => {
  const INVALIDOS = ['#%E0%A4%A', '#%', '#%%', '#%zz', '#abc%', '#%E0%A4%A#x', '#%C0%80']
  const DESCONHECIDOS = [
    '#',
    '#nao-existe',
    '#secao-ajuda-agora-nao',
    '#com espaco',
    '#"><img src=x>',
    '#a[b]',
    "#a'b",
    '#..',
    '#%20',
    '#secao-',
  ]
  const CAMINHOS = ['/privacidade', '/termos', '/regras-da-comunidade', '/exclusao-de-conta', '/contato', '/sobre']

  for (const caminho of CAMINHOS) {
    for (const hash of [...INVALIDOS, ...DESCONHECIDOS]) {
      it(`${caminho}${hash}: a página abre inteira, sem foco nem rolagem`, () => {
        const { container } = renderizarRota(caminho + hash)
        expect(within(container.querySelector('main')!).getAllByRole('heading', { level: 1 })).toHaveLength(1)
        expect(document.activeElement).toBe(document.body)
        expect(rolar).not.toHaveBeenCalled()
      })
    }

    it(`${caminho}: sem fragmento, nada recebe foco nem rolagem`, () => {
      renderizarRota(caminho)
      expect(document.activeElement).toBe(document.body)
      expect(rolar).not.toHaveBeenCalled()
    })

    it(`${caminho}: trocar para um fragmento inválido com a página aberta não derruba nada`, async () => {
      const { container, roteador } = renderizarRota(caminho)
      for (const hash of INVALIDOS) {
        await act(async () => {
          await roteador.navigate(caminho + hash)
        })
        expect(within(container.querySelector('main')!).getAllByRole('heading', { level: 1 })).toHaveLength(1)
      }
      expect(document.activeElement).toBe(document.body)
      expect(rolar).not.toHaveBeenCalled()
    })
  }

  for (const [caminho, , dados] of PAGINAS) {
    for (const { secao } of dados.secoes) {
      it(`${caminho}#${secao.id}: foca o título "${secao.titulo}" e rola até ele`, () => {
        renderizarRota(`${caminho}#${secao.id}`)
        expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: secao.titulo }))
        expect(rolar).toHaveBeenCalledTimes(1)
      })
    }
  }

  it('um fragmento válido escrito com porcentagem (%2D no lugar do hífen) também leva ao título', () => {
    renderizarRota('/regras-da-comunidade#secao-ajuda%2Dagora')
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Se você precisa de ajuda agora' }))
  })

  it('um fragmento válido vale mesmo depois de um inválido na mesma página', async () => {
    const { roteador } = renderizarRota('/privacidade#%E0%A4%A')
    expect(document.activeElement).toBe(document.body)
    await act(async () => {
      await roteador.navigate('/privacidade#secao-seus-direitos')
    })
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Seus direitos' }))
  })
})

// R2: o painel de areia fica fixo ao rolar só se cabe na janela. O jsdom não mede layout, então a regra é lida
// do CSS: todo `position: sticky` do arquivo vem com altura máxima que respeita a janela (o topo mais a altura
// não passam de 100% dela), rolagem interna e `overscroll-behavior: contain`; assim cada link do índice, ao
// receber o foco por Tab, é rolado para a vista dentro do painel.
describe('painel do índice fixo ao rolar (CSS)', () => {
  const css = readFileSync(join(process.cwd(), 'src/componentes/publicas-texto/publicasTexto.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )
  const regras = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, corpo]) => ({ seletor: seletor.trim(), corpo }))
  const fixas = regras.filter(({ corpo }) => /position:\s*sticky/.test(corpo))

  it('há um painel fixo, e todo painel fixo tem altura máxima, rolagem interna e overscroll contido', () => {
    expect(fixas.length).toBeGreaterThan(0)
    for (const { seletor, corpo } of fixas) {
      expect(corpo, seletor).toMatch(/max-height:\s*calc\(\s*100d?vh\s*-/)
      expect(corpo, seletor).toMatch(/overflow-y:\s*auto/)
      expect(corpo, seletor).toMatch(/overscroll-behavior:\s*contain/)
    }
  })

  it('o topo do painel fixo mais a altura máxima nunca passam da altura da janela', () => {
    for (const { seletor, corpo } of fixas) {
      const topo = /top:\s*calc\(\s*var\(--cm-cabecalho\)\s*\+\s*(\d+)px\s*\)/.exec(corpo)
      const altura = /max-height:\s*calc\(\s*100d?vh\s*-\s*var\(--cm-cabecalho\)\s*-\s*(\d+)px\s*\)/.exec(corpo)
      expect(topo, `${seletor}: top`).not.toBeNull()
      expect(altura, `${seletor}: max-height`).not.toBeNull()
      // topo = cabeçalho + A; altura = 100% - cabeçalho - B; a base fica em 100% - (B - A): B tem de ser ≥ A.
      expect(Number(altura![1]), seletor).toBeGreaterThanOrEqual(Number(topo![1]))
    }
  })
})

// Um só aviso de "não está pronto" na página: o do casco. A frase de dados fictícios é um parágrafo comum
// dentro da seção a que se refere, sem caixa nem selo.
describe('aviso de dados fictícios', () => {
  const FRASE = 'Nesta versão de avaliação, use só dados fictícios.'

  it('aparece uma vez em Privacidade (em "Onde os dados vão ficar") e uma vez em Termos (em "Sua conta"), como parágrafo comum; nas outras páginas, nenhuma', () => {
    const ONDE: Record<string, string> = { '/privacidade': 'Onde os dados vão ficar', '/termos': 'Sua conta' }
    for (const [caminho] of PAGINAS) {
      const { container, unmount } = renderizarRota(caminho)
      const principal = container.querySelector('main')!
      const ocorrencias = [...principal.querySelectorAll('p')].filter((p) => p.textContent === FRASE)
      expect(ocorrencias, caminho).toHaveLength(ONDE[caminho] ? 1 : 0)
      if (ONDE[caminho]) {
        const [paragrafo] = ocorrencias
        expect(paragrafo.className, caminho).toBe('')
        const secao = paragrafo.closest('section')!
        expect(secao.querySelector('h2')!.textContent, caminho).toBe(ONDE[caminho])
        // O primeiro parágrafo da seção.
        expect(secao.querySelector('.pt-texto')!.firstElementChild, caminho).toBe(paragrafo)
      }
      unmount()
    }
  })

  it('o CSS não tem mais estilo de aviso (pt-aviso) nem o destaque do e-mail (pt-destaque)', () => {
    const css = readFileSync(join(process.cwd(), 'src/componentes/publicas-texto/publicasTexto.css'), 'utf8')
    expect(css).not.toMatch(/pt-aviso|pt-destaque/)
  })
})

describe('Contato: bloco de e-mail', () => {
  it('não repete o título "Fale conosco" como seção: o índice lista só as outras seções', () => {
    const { container } = renderizarRota('/contato')
    const principal = container.querySelector('main')!
    expect(within(principal).queryByRole('heading', { level: 2, name: 'Fale conosco' })).toBeNull()
    const indice = within(principal).getByRole('navigation', { name: ROTULO_INDICE })
    expect(within(indice).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Em uma urgência',
      'Para que serve este canal',
    ])
    expect(principal.querySelector('h1')!.textContent).toBe('Contato')
    expect(principal.querySelector('h1')!.nextElementSibling!.textContent).toBe('Fale conosco.')
  })

  it('o botão "Escrever para nós" é um link mailto com o estilo de botão do site (alvo de 44 px)', () => {
    renderizarRota('/contato')
    const botao = screen.getByRole('link', { name: 'Escrever para nós' })
    expect(botao.className).toBe('cm-botao cm-botao-primario alvo-toque')
  })
})

// Os "a definir" ficam só no item a que se referem, fora da primeira dobra: nenhum bloco com "a definir"
// entra nas duas primeiras seções de Privacidade e de Termos (só o aviso do casco aparece no alto).
describe('"a definir" fora do alto das páginas', () => {
  const titulosDe = (caminho: string) => {
    const { container } = renderizarRota(caminho)
    return within(container.querySelector('main')!)
      .getAllByRole('heading', { level: 2 })
      .map((titulo) => titulo.textContent)
  }

  it('Privacidade: a primeira seção é "Que dados o site vai guardar" e "Quem responde pelos dados" vem logo antes de "Seus direitos"', () => {
    const titulos = titulosDe('/privacidade')
    expect(titulos[0]).toBe('Que dados o site vai guardar')
    expect(titulos.indexOf('Quem responde pelos dados')).toBe(titulos.indexOf('Seus direitos') - 1)
    expect(PAGINAS_DE_TEXTO.privacidade.secoes.map(({ secao }) => secao.id)).toContain('secao-quem-responde-pelos-dados')
  })

  it('Termos: as seções vêm em ordem; "Sua conta" e "Quem pode usar" ficam juntas, logo antes de "Excluir a conta"', () => {
    expect(titulosDe('/termos')).toEqual([
      'O que é o AppMaternidade',
      'Família, papéis e convites',
      'Comunidade',
      'Sua conta',
      'Quem pode usar',
      'Excluir a conta',
      'Mudanças nos termos',
      'Contato',
    ])
  })

  for (const caminho of ['/privacidade', '/termos']) {
    it(`${caminho}: nenhum parágrafo com "a definir" está nas duas primeiras seções`, () => {
      const { container } = renderizarRota(caminho)
      const secoes = [...container.querySelectorAll('main .pt-leitura > section')]
      const comADefinir = secoes.flatMap((secao, posicao) =>
        [...secao.querySelectorAll('p')].filter((p) => /a definir/.test(p.textContent ?? '')).map(() => posicao),
      )
      expect(comADefinir.length).toBeGreaterThan(0)
      for (const posicao of comADefinir) expect(posicao).toBeGreaterThanOrEqual(2)
      for (const secao of secoes.slice(0, 2)) expect(secao.textContent).not.toMatch(/a definir/)
    })

    it(`${caminho}: "Nesta versão de avaliação" não está nas duas primeiras seções, mas aparece mais abaixo`, () => {
      const { container } = renderizarRota(caminho)
      const secoes = [...container.querySelectorAll('main .pt-leitura > section')]
      const posicoes = secoes.flatMap((secao, posicao) =>
        [...secao.querySelectorAll('p')].filter((p) => /Nesta versão de avaliação/.test(p.textContent ?? '')).map(() => posicao),
      )
      expect(posicoes.length).toBeGreaterThan(0)
      for (const posicao of posicoes) expect(posicao).toBeGreaterThanOrEqual(2)
      for (const secao of secoes.slice(0, 2)) expect(secao.textContent).not.toMatch(/Nesta versão de avaliação/)
    })
  }
})

describe('Exclusão de conta: página de tarefa', () => {
  it('"Responsável pelo AppMaternidade: a definir." é o último bloco de "Prazo" e não está em "Como pedir"', () => {
    renderizarRota('/exclusao-de-conta')
    const pedir = screen.getByRole('heading', { level: 2, name: 'Como pedir' }).closest('section')!
    expect(pedir.textContent).not.toContain('a definir')
    const prazo = screen.getByRole('heading', { level: 2, name: 'Prazo' }).closest('section')!
    expect(prazo.querySelector('.pt-texto')!.lastElementChild!.textContent).toBe('Responsável pelo AppMaternidade: a definir.')
    const primeiros = PAGINAS_DE_TEXTO.exclusao.secoes[1].blocos
    expect(primeiros).toHaveLength(3)
  })

  it('as seções vêm na ordem Antes de excluir, Como pedir, O que vai ser apagado, O que pode ficar guardado e Prazo', () => {
    const { container } = renderizarRota('/exclusao-de-conta')
    const titulos = within(container.querySelector('main')!).getAllByRole('heading', { level: 2 })
    expect(titulos.map((titulo) => titulo.textContent)).toEqual([
      'Antes de excluir',
      'Como pedir',
      'O que vai ser apagado',
      'O que pode ficar guardado',
      'Prazo',
    ])
    const indice = within(container.querySelector('main')!).getByRole('navigation', { name: ROTULO_INDICE })
    expect(within(indice).getAllByRole('link').map((link) => link.textContent)).toEqual(
      titulos.map((titulo) => titulo.textContent),
    )
  })

  it('o botão "Ir para Contato" vem logo depois do último parágrafo de "Como pedir" e leva a /contato', () => {
    const { container } = renderizarRota('/exclusao-de-conta')
    const secao = screen.getByRole('heading', { level: 2, name: 'Como pedir' }).closest('section')!
    const botao = within(secao).getByRole('link', { name: 'Ir para Contato' })
    expect(botao.getAttribute('href')).toBe('/contato')
    expect(botao.className).toBe('cm-botao cm-botao-primario alvo-toque')
    const texto = secao.querySelector('.pt-texto')!
    expect(texto.lastElementChild).toBe(botao.parentElement)
    expect(texto.lastElementChild!.previousElementSibling!.tagName).toBe('P')
    expect(container.querySelectorAll('main a[href="/contato"]')).toHaveLength(1)
  })

  it('nenhum desenho solto aparece antes de "Antes de excluir" e "Como pedir": a figura vem depois da segunda seção', () => {
    const { container } = renderizarRota('/exclusao-de-conta')
    const leitura = container.querySelector('main .pt-leitura')!
    const figura = leitura.querySelector('img[data-ilustracao]')!
    const secoes = [...leitura.querySelectorAll(':scope > section')]
    expect(leitura.children[0].tagName).toBe('SECTION')
    expect(figura.previousElementSibling).toBe(secoes[1])
    expect(figura.nextElementSibling).toBe(secoes[2])
  })
})

// O jsdom não mede layout: a margem única, o painel sem cartão no celular e a figura que troca de lugar são
// lidos do CSS (regras do arquivo, na ordem em que aparecem: a primeira é a do celular; a seguinte, a de 1100 px).
describe('painel e figura por largura (CSS)', () => {
  const css = readFileSync(join(process.cwd(), 'src/componentes/publicas-texto/publicasTexto.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )
  const regras = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, corpo]) => ({ seletor: seletor.trim(), corpo }))
  const corpos = (seletor: string) => regras.filter((regra) => regra.seletor === seletor).map(({ corpo }) => corpo)

  it('abaixo de 1100 px o painel não tem cartão de areia nem respiro lateral (a margem é a mesma do título)', () => {
    const [celular, largo] = corpos('.cm-painel.pt-painel')
    expect(celular).toMatch(/padding:\s*0\s*;/)
    expect(celular).toMatch(/background-color:\s*transparent/)
    expect(celular).toMatch(/border-radius:\s*0/)
    expect(css).toMatch(/@media \(min-width: 1100px\)/)
    expect(corpos('.cm-painel.pt-painel').some((corpo) => /background-color:\s*var\(--color-areia\)/.test(corpo))).toBe(true)
    expect(largo).toBeDefined()
  })

  it('a frase de apoio fica oculta abaixo de 1100 px e aparece no painel de 1100 em diante', () => {
    const [celular, largo] = corpos('.pt-apoio')
    expect(celular).toMatch(/display:\s*none/)
    expect(largo).toMatch(/display:\s*block/)
    expect(celular).toMatch(/font-style:\s*italic/)
    expect(celular).toMatch(/font-family:\s*var\(--fonte-titulo\)/)
  })

  it('o desenho do painel só existe de 1100 em diante (190 px) e a figura solta só abaixo disso (180 px, alinhada à esquerda)', () => {
    const [painelCelular, painelLargo] = corpos('.pt-ilustracao.pt-ilustracao-painel')
    expect(painelCelular).toMatch(/display:\s*none/)
    expect(painelLargo).toMatch(/display:\s*block/)
    expect(painelLargo).toMatch(/height:\s*190px/)

    const [leituraCelular, leituraLargo] = corpos('.pt-leitura > .pt-ilustracao.pt-ilustracao-leitura')
    expect(leituraCelular).toMatch(/display:\s*block/)
    expect(leituraCelular).toMatch(/height:\s*180px/)
    expect(leituraCelular).toMatch(/object-position:\s*left/)
    expect(corpos('.pt-ilustracao')[0]).toMatch(/object-fit:\s*contain/)
    expect(leituraLargo).toMatch(/display:\s*none/)
  })

  it('o índice recolhido tem filete em cima e embaixo e linha de 48 px, sem fundo', () => {
    const [detalhes] = corpos('.pt-indice-detalhes')
    expect(detalhes).toMatch(/border-top:\s*1px solid/)
    expect(detalhes).toMatch(/border-bottom:\s*1px solid/)
    expect(detalhes).not.toMatch(/background/)
    expect(corpos('.pt-indice-resumo')[0]).toMatch(/min-height:\s*48px/)
  })
})
