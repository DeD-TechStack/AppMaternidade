import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EMAIL_CONTATO, PAGINAS_DE_TEXTO, ROTULO_INDICE } from '../../conteudo/publicas-texto.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'
import { ROTULO_CRIAR_CONTA } from '../casca/textos.ts'

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

// O botão de ação principal da abertura de cada página (rótulo que já existe no site e destino). Contato usa o botão
// do cartão de e-mail; Exclusão, "Ir para a Conta"; as outras quatro, "Criar conta".
const BOTAO_DA_ABERTURA: Record<string, readonly [string, string]> = {
  '/regras-da-comunidade': [ROTULO_CRIAR_CONTA, '/criar-conta'],
  '/privacidade': [ROTULO_CRIAR_CONTA, '/criar-conta'],
  '/termos': [ROTULO_CRIAR_CONTA, '/criar-conta'],
  '/exclusao-de-conta': ['Ir para a Conta', '/app/conta'],
  '/contato': ['Escrever para nós', `mailto:${EMAIL_CONTATO}`],
  '/sobre': [ROTULO_CRIAR_CONTA, '/criar-conta'],
}

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

      it('tem um só desenho de traço, dentro do painel de mel, com texto alternativo, e ele não se repete nas outras páginas', () => {
        const { container } = renderizarRota(caminho)
        const principal = container.querySelector('main')!
        const desenhos = container.querySelectorAll<HTMLImageElement>('main img[data-ilustracao]')
        expect(desenhos).toHaveLength(1)
        expect(desenhos[0].getAttribute('data-ilustracao')).toBe(dados.ilustracao)
        expect(desenhos[0].getAttribute('alt')).toMatch(/^Desenho de traço: .+/)
        expect(desenhos[0].classList.contains('pt-ilustracao')).toBe(true)
        expect(desenhos[0].closest('aside.pt-painel')).not.toBeNull()
        expect(principal.querySelectorAll('aside.pt-painel')).toHaveLength(1)
        expect(within(principal).getAllByRole('img', { name: desenhos[0].alt })).toHaveLength(1)

        const outros = PAGINAS.filter(([outro]) => outro !== caminho).map(([, , pagina]) => pagina.ilustracao)
        expect(outros).not.toContain(dados.ilustracao)
      })

      it(
        dados.painelDepoisDe === undefined
          ? 'põe o painel de mel na abertura, depois do título, e carrega o desenho na hora'
          : `põe o painel de mel na leitura, logo depois da seção ${dados.painelDepoisDe} (o passo a passo vem antes do desenho), e carrega o desenho só quando chegar perto`,
        () => {
          const { container } = renderizarRota(caminho)
          const principal = container.querySelector('main')!
          const painel = principal.querySelector('aside.pt-painel')!
          const desenho = painel.querySelector('img[data-ilustracao]')!
          const titulo = principal.querySelector('h1')!
          expect(titulo.compareDocumentPosition(painel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
          if (dados.painelDepoisDe === undefined) {
            expect(painel.parentElement!.classList.contains('pt-abertura')).toBe(true)
            expect(painel.previousElementSibling!.classList.contains('pt-cabeca')).toBe(true)
            expect(desenho.getAttribute('loading')).toBe('eager')
          } else {
            const depoisDe = dados.secoes[dados.painelDepoisDe - 1].secao
            expect(painel.parentElement!.classList.contains('pt-leitura')).toBe(true)
            expect(painel.previousElementSibling!.querySelector('h2')!.id).toBe(depoisDe.id)
            expect(painel.nextElementSibling!.tagName).toBe('SECTION')
            expect(desenho.getAttribute('loading')).toBe('lazy')
          }
        },
      )

      it('mostra a frase de apoio no painel, em itálico (pt-apoio), antes do desenho, e só ali', () => {
        const { container } = renderizarRota(caminho)
        const principal = container.querySelector('main')!
        const painel = principal.querySelector('aside.pt-painel')!
        const apoio = within(painel as HTMLElement).getByText(dados.apoio)
        expect(apoio.classList.contains('pt-apoio')).toBe(true)
        const desenho = painel.querySelector('img[data-ilustracao]')!
        expect(apoio.compareDocumentPosition(desenho) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(painel.querySelector('nav')).toBeNull()
        expect(principal.textContent!.split(dados.apoio)).toHaveLength(2)
      })

      it('tem o índice entre a abertura e a leitura, fora do painel de mel', () => {
        const { container } = renderizarRota(caminho)
        const principal = container.querySelector('main')!
        const indice = principal.querySelector(':scope > nav.pt-indice')!
        expect(indice.previousElementSibling!.classList.contains('pt-abertura')).toBe(true)
        expect(indice.nextElementSibling!.classList.contains('pt-leitura')).toBe(true)
        expect(indice.closest('aside')).toBeNull()
      })

      it(`tem na abertura, depois do título e da segunda linha, o botão de ação principal "${BOTAO_DA_ABERTURA[caminho][0]}" (${BOTAO_DA_ABERTURA[caminho][1]})`, () => {
        const { container } = renderizarRota(caminho)
        const abertura = container.querySelector('main > .pt-abertura')!
        const titulo = abertura.querySelector('h1')!
        const botoes = [...abertura.querySelectorAll<HTMLAnchorElement>('.pt-cabeca a.cm-botao')]
        expect(botoes).toHaveLength(1)
        const [botao] = botoes
        const [rotulo, destino] = BOTAO_DA_ABERTURA[caminho]
        expect(titulo.nextElementSibling!.textContent).toBe(dados.subtitulo)
        expect(titulo.compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(botao.className).toBe('cm-botao cm-botao-primario alvo-toque')
        expect(botao.textContent).toBe(rotulo)
        expect(botao.getAttribute('href')).toBe(destino)
      })

      it('não tem caixa de aviso (pt-aviso): o único aviso do site é o do casco', () => {
        const { container } = renderizarRota(caminho)
        expect(container.querySelector('.pt-aviso')).toBeNull()
        expect('aviso' in dados).toBe(false)
      })

      it(
        caminho === '/contato'
          ? 'mostra o e-mail de contato num cartão na abertura, só com o rótulo, o endereço e o botão "Escrever para nós" (mailto)'
          : 'não mostra o e-mail de contato (só a página Contato o mostra)',
        () => {
          const { container } = renderizarRota(caminho)
          const principal = container.querySelector('main')!
          if (caminho === '/contato') {
            const bloco = principal.querySelector('.pt-abertura > .pt-cabeca > .pt-email')!
            expect(bloco).not.toBeNull()
            expect(principal.querySelectorAll('.pt-email')).toHaveLength(1)
            expect(bloco.previousElementSibling!.tagName).toBe('P')
            expect(bloco.textContent).toContain('E-mail')
            // O cartão tem só o rótulo, o endereço e o botão.
            expect([...bloco.querySelectorAll('.pt-email-dados > *')].map((no) => no.textContent)).toEqual(['E-mail', EMAIL_CONTATO])
            expect(bloco.textContent).toBe(`E-mail${EMAIL_CONTATO}Escrever para nós`)
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

// Nada fica fixo ao rolar: o painel lateral com o índice foi embora (um painel que só gruda deixava meia tela em
// branco nos recortes da página inteira). O jsdom não mede layout, então a regra é lida do CSS.
describe('nada fixo ao rolar (CSS)', () => {
  const css = readFileSync(join(process.cwd(), 'src/componentes/publicas-texto/publicasTexto.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )

  it('o CSS das páginas de leitura não tem position: sticky nem rolagem interna de painel', () => {
    expect(css).not.toMatch(/position:\s*(sticky|fixed)/)
    expect(css).not.toMatch(/overflow-y:\s*auto/)
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
    expect(primeiros).toHaveLength(2)
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

  it('o botão "Ir para a Conta" fica na abertura, logo depois da segunda linha do título, e leva a /app/conta', () => {
    const { container } = renderizarRota('/exclusao-de-conta')
    const cabeca = container.querySelector('main > .pt-abertura > .pt-cabeca')!
    const botao = within(cabeca as HTMLElement).getByRole('link', { name: 'Ir para a Conta' })
    expect(botao.getAttribute('href')).toBe('/app/conta')
    expect(botao.className).toBe('cm-botao cm-botao-primario alvo-toque')
    expect(cabeca.lastElementChild).toBe(botao.parentElement)
    expect(cabeca.lastElementChild!.previousElementSibling!.tagName).toBe('P')
    expect(container.querySelectorAll('main a[href="/app/conta"]')).toHaveLength(1)
    // O botão saiu do texto de "Como pedir": ali sobram só os dois parágrafos.
    const pedir = screen.getByRole('heading', { level: 2, name: 'Como pedir' }).closest('section')!
    expect(pedir.querySelector('a.cm-botao')).toBeNull()
  })

  it('o botão leva exatamente a /app/conta e a página não tem mais o link "Ir para Contato"', () => {
    const { container } = renderizarRota('/exclusao-de-conta')
    const principal = container.querySelector('main')!
    expect(within(principal).getByRole('link', { name: 'Ir para a Conta' }).getAttribute('href')).toBe('/app/conta')
    expect(within(principal).queryByRole('link', { name: 'Ir para Contato' })).toBeNull()
    expect(principal.textContent).not.toContain('Ir para Contato')
    expect(principal.querySelector('a[href="/contato"]')).toBeNull()
  })

  it('o passo a passo e o botão vêm antes do desenho: o painel de mel entra depois da segunda seção ("Como pedir")', () => {
    const { container } = renderizarRota('/exclusao-de-conta')
    const leitura = container.querySelector('main .pt-leitura')!
    const painel = leitura.querySelector(':scope > aside.pt-painel')!
    const secoes = [...leitura.querySelectorAll(':scope > section')]
    expect(leitura.children[0].tagName).toBe('SECTION')
    expect(painel.previousElementSibling).toBe(secoes[1])
    expect(painel.nextElementSibling).toBe(secoes[2])
    const botao = screen.getByRole('link', { name: 'Ir para a Conta' })
    const desenho = painel.querySelector('img[data-ilustracao]')!
    expect(botao.compareDocumentPosition(desenho) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(secoes[1].compareDocumentPosition(desenho) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('Privacidade: abertura', () => {
  it('mostra na abertura só os 3 primeiros itens da lista de dados; a lista inteira fica na sua seção', () => {
    const { container } = renderizarRota('/privacidade')
    const abertura = container.querySelector('main > .pt-abertura')!
    const itensDaAbertura = [...abertura.querySelectorAll('.pt-abertura-lista li')].map((item) => item.textContent)
    const primeiraSecao = screen.getByRole('heading', { level: 2, name: 'Que dados o site vai guardar' }).closest('section')!
    const itensDaSecao = [...primeiraSecao.querySelectorAll('li')].map((item) => item.textContent)
    expect(itensDaSecao).toHaveLength(9)
    expect(itensDaAbertura).toHaveLength(3)
    expect(itensDaAbertura).toEqual(itensDaSecao.slice(0, 3))
    // A lista da abertura vem entre a segunda linha do título e o botão.
    const cabeca = abertura.querySelector('.pt-cabeca')!
    const lista = cabeca.querySelector('.pt-abertura-lista')!
    expect(lista.previousElementSibling!.classList.contains('pt-segunda-linha')).toBe(true)
    expect(lista.nextElementSibling!.classList.contains('pt-acao')).toBe(true)
  })

  it('as outras páginas não têm lista na abertura', () => {
    for (const [caminho] of PAGINAS) {
      if (caminho === '/privacidade') continue
      const { container, unmount } = renderizarRota(caminho)
      expect(container.querySelector('main > .pt-abertura li'), caminho).toBeNull()
      unmount()
    }
  })
})

describe('listas longas', () => {
  it('uma lista de 4 itens ou mais corre em duas colunas (pt-lista-colunas); as menores, não', () => {
    for (const [caminho] of PAGINAS) {
      const { container, unmount } = renderizarRota(caminho)
      for (const lista of container.querySelectorAll<HTMLElement>('main .pt-leitura .pt-lista')) {
        const itens = lista.querySelectorAll(':scope > li').length
        expect(lista.classList.contains('pt-lista-colunas'), `${caminho}: ${itens} itens`).toBe(itens >= 4)
      }
      unmount()
    }
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

  it('o painel de mel não tem fundo próprio no CSS (a cor vem do PainelCampo) e tem respiro de 24 no celular e 40 em tela larga', () => {
    const [celular, largo] = corpos('.cm-painel.pt-painel')
    expect(celular).toMatch(/padding:\s*24px/)
    expect(largo).toMatch(/padding:\s*40px/)
    expect(css).toMatch(/@media \(min-width: 1100px\)/)
    expect(css).not.toMatch(/background-color:\s*var\(--color-areia\)/)
  })

  it('a frase de apoio fica sempre à vista, em Literata itálica, e cresce de 24/30 (celular) para 30/36 (tela larga)', () => {
    const [celular, largo] = corpos('.pt-apoio')
    expect(celular).not.toMatch(/display:\s*none/)
    expect(celular).toMatch(/font-style:\s*italic/)
    expect(celular).toMatch(/font-family:\s*var\(--fonte-titulo\)/)
    expect(celular).toMatch(/font-size:\s*1\.5rem/)
    expect(largo).toMatch(/font-size:\s*1\.875rem/)
    expect(largo).toMatch(/line-height:\s*2\.25rem/)
  })

  it('o desenho do painel fica inteiro (contain), com 144 px de altura no celular e 240 px em tela larga', () => {
    const [celular, largo] = corpos('.pt-ilustracao')
    expect(celular).toMatch(/display:\s*block/)
    expect(celular).toMatch(/height:\s*144px/)
    expect(celular).toMatch(/object-fit:\s*contain/)
    expect(largo).toMatch(/height:\s*240px/)
  })

  it('o título usa a escala de h1 (cm-h1, 84/88 em 1440); a segunda linha usa só o corpo de h3 (24/30 a 36/42)', () => {
    const [segunda] = corpos('.pt-segunda-linha')
    expect(segunda).toMatch(/font-size:\s*clamp\(24px,[^;]*36px\)/)
    expect(segunda).toMatch(/line-height:\s*clamp\(30px,[^;]*42px\)/)
    expect(segunda).toMatch(/font-style:\s*italic/)
  })

  it('o índice em tela larga é uma faixa de links em colunas, em corpo pequeno (15/22), com um filete só (o do rótulo)', () => {
    const [rotulo] = corpos('.pt-indice-rotulo')
    expect(rotulo).toMatch(/border-top:\s*1px solid/)
    expect(rotulo).toMatch(/font-size:\s*0\.9375rem/)
    expect(rotulo).toMatch(/line-height:\s*1\.375rem/)
    const [link] = corpos('.pt-indice-link')
    expect(link).toMatch(/font-size:\s*0\.9375rem/)
    expect(link).toMatch(/line-height:\s*1\.375rem/)
    expect(corpos('.pt-indice-rotulo + .pt-indice-lista')[0]).toMatch(/display:\s*grid/)
    expect(css).not.toMatch(/\.pt-indice-lista\s*>\s*li\s*\+\s*li/)
  })

  it('o índice recolhido tem filete em cima e embaixo e linha de 48 px, sem fundo', () => {
    const [detalhes] = corpos('.pt-indice-detalhes')
    expect(detalhes).toMatch(/border-top:\s*1px solid/)
    expect(detalhes).toMatch(/border-bottom:\s*1px solid/)
    expect(detalhes).not.toMatch(/background/)
    expect(corpos('.pt-indice-resumo')[0]).toMatch(/min-height:\s*48px/)
  })
})
