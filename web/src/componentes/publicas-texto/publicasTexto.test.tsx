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

// A ação da abertura (F8-1; troca a S-20, "quatro pílulas de Criar conta"): só Exclusão de conta ("Ir para a Conta") e
// Contato (o botão do cartão de e-mail) a trazem. Nas outras quatro a abertura não tem botão: o convite é o do cabeçalho.
const BOTAO_DA_ABERTURA: Record<string, readonly [string, string] | null> = {
  '/regras-da-comunidade': null,
  '/privacidade': null,
  '/termos': null,
  '/exclusao-de-conta': ['Ir para a Conta', '/app/conta'],
  '/contato': ['Escrever para nós', `mailto:${EMAIL_CONTATO}`],
  '/sobre': null,
}

// O jsdom não implementa a rolagem: o código a chama só se ela existir, e aqui ela é observada.
const rolar = vi.fn()

// O CSS é lido do disco e comparado com seletores de várias linhas escritos com `\n`: numa cópia com CRLF
// (checkout no Windows) a comparação falharia, então a quebra de linha é normalizada aqui, uma vez.
const lerCss = () =>
  readFileSync(join(process.cwd(), 'src/componentes/publicas-texto/publicasTexto.css'), 'utf8').replace(/\r\n/g, '\n')

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
      it(`tem um só título, "${nome}", seguido da frase de abertura (o subtítulo, em prumo)`, () => {
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

      if (dados.secoes.length >= 3) {
        it('tem o índice "Nesta página" com um link para cada seção; ativar o link leva o foco ao título e o faz o atual', () => {
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
            // Depois de apertar o link n, só ele é o atual (a página marca a seção na hora, sem esperar a rolagem).
            expect(links.filter((outro) => outro.getAttribute('aria-current') === 'location')).toEqual([link])
          }
          expect(rolar).toHaveBeenCalledTimes(links.length)
        })
      } else {
        it('com menos de três seções não tem o índice "Nesta página" (nem o <details> dele)', () => {
          const { container } = renderizarRota(caminho)
          const principal = container.querySelector('main')!
          expect(principal.querySelector('nav.pt-indice')).toBeNull()
          expect(within(principal).queryByRole('navigation', { name: ROTULO_INDICE })).toBeNull()
          expect(principal.querySelector('.pt-indice-link, .pt-indice-detalhes')).toBeNull()
          expect(principal.querySelector('.pt-pagina-grade')!.classList.contains('pt-sem-indice')).toBe(true)
        })
      }

      it('não mostra mais o desenho de traço, o painel de mel nem a frase de apoio (os campos ficam no conteúdo, sem aparecer)', () => {
        const { container } = renderizarRota(caminho)
        const principal = container.querySelector('main')!
        expect(principal.querySelector('img[data-ilustracao]')).toBeNull()
        expect(principal.querySelector('aside')).toBeNull()
        expect(principal.querySelector('.cm-painel, [data-painel], .pt-painel, .pt-figura, .pt-apoio, .pt-segunda-linha')).toBeNull()
        expect(principal.textContent!.includes(dados.apoio)).toBe(false)
        expect(dados.ilustracao).toBeTruthy()
        expect(dados.apoio).toBeTruthy()
      })

      it('abre com uma faixa de cacau (pt-abertura) que tem o h1, a frase e a placa da rua, decorativa e na hora', () => {
        const { container } = renderizarRota(caminho)
        const principal = container.querySelector('main')!
        const faixa = principal.firstElementChild!
        expect(faixa.classList.contains('pt-abertura')).toBe(true)
        expect(faixa.getAttribute('data-faixa-fundo')).toBe('cacau')
        expect(faixa.querySelector('h1')).not.toBeNull()
        // Uma só imagem na página inteira: a placa, com `alt` vazio (decorativa), carregada na hora.
        const imagens = principal.querySelectorAll('img')
        expect(imagens).toHaveLength(1)
        const [imagem] = imagens
        expect(faixa.contains(imagem)).toBe(true)
        expect(imagem.closest('.pt-placa')).not.toBeNull()
        expect(imagem.getAttribute('alt')).toBe('')
        expect(imagem.getAttribute('loading')).toBe('eager')
        // A placa vem depois do texto, para o título abrir a leitura.
        const titulo = principal.querySelector('h1')!
        expect(titulo.compareDocumentPosition(imagem) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      })

      if (dados.secoes.length >= 3) {
        it('tem o índice entre a abertura e o documento, na grade da leitura, antes da coluna de leitura', () => {
          const { container } = renderizarRota(caminho)
          const principal = container.querySelector('main')!
          const indice = principal.querySelector('.pt-pagina-grade > nav.pt-indice')!
          const secaoDaLeitura = indice.closest('main > [data-h~="secao"]')!
          expect(secaoDaLeitura.previousElementSibling!.classList.contains('pt-abertura')).toBe(true)
          expect(indice.previousElementSibling).toBeNull()
          expect(indice.nextElementSibling!.classList.contains('pt-leitura')).toBe(true)
          expect(principal.querySelector('.pt-leitura nav')).toBeNull()
          expect(indice.closest('aside')).toBeNull()
        })
      }

      const botaoDaPagina = BOTAO_DA_ABERTURA[caminho]
      it(
        botaoDaPagina
          ? `tem na abertura, depois do título e da frase, a pílula de mel "${botaoDaPagina[0]}" (${botaoDaPagina[1]})`
          : 'não tem botão na abertura (nem a pílula de "Criar conta"): só o título, a frase e a rua',
        () => {
          const { container } = renderizarRota(caminho)
          const abertura = container.querySelector('main .pt-abertura')!
          const titulo = abertura.querySelector('h1')!
          const botoes = [...abertura.querySelectorAll<HTMLAnchorElement>('.pt-cabeca a.cm-botao')]
          expect(titulo.nextElementSibling!.textContent).toBe(dados.subtitulo)
          if (!botaoDaPagina) {
            expect(botoes).toHaveLength(0)
            expect(abertura.querySelector('.pt-acao, .pt-cabeca a')).toBeNull()
            expect(abertura.textContent).not.toContain(ROTULO_CRIAR_CONTA)
            return
          }
          expect(botoes).toHaveLength(1)
          const [botao] = botoes
          const [rotulo, destino] = botaoDaPagina
          expect(titulo.compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
          expect(botao.className).toBe('cm-botao cm-botao-mel alvo-toque')
          expect(botao.textContent).toBe(rotulo)
          expect(botao.getAttribute('href')).toBe(destino)
        },
      )

      it('não tem caixa de aviso (pt-aviso): o único aviso do site é o do casco', () => {
        const { container } = renderizarRota(caminho)
        expect(container.querySelector('.pt-aviso')).toBeNull()
        expect('aviso' in dados).toBe(false)
      })

      it(
        caminho === '/contato'
          ? 'mostra o e-mail de contato na abertura, no lugar do botão e sem caixa, só com o rótulo, o endereço e o botão "Escrever para nós" (mailto)'
          : 'não mostra o e-mail de contato (só a página Contato o mostra)',
        () => {
          const { container } = renderizarRota(caminho)
          const principal = container.querySelector('main')!
          if (caminho === '/contato') {
            const bloco = principal.querySelector('.pt-abertura .pt-cabeca > .pt-email')!
            expect(bloco).not.toBeNull()
            // Sem caixa: não é um Cartao (a primitiva de caixa com fundo e borda).
            expect((bloco.getAttribute('data-h') ?? '').split(' ')).not.toContain('cartao')
            expect(principal.querySelector('.pt-abertura [data-h~="cartao"]')).toBeNull()
            expect(principal.querySelectorAll('.pt-email')).toHaveLength(1)
            expect(bloco.previousElementSibling!.tagName).toBe('DIV')
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

describe('Contato: sem desenho de traço', () => {
  it('o campo "ilustracao" segue no conteúdo ("maos-celular"), mas a página mostra só a placa da rua', () => {
    const { container } = renderizarRota('/contato')
    expect(PAGINAS_DE_TEXTO.contato.ilustracao).toBe('maos-celular')
    expect(container.querySelector('main img[data-ilustracao]')).toBeNull()
    expect(container.querySelectorAll('main img')).toHaveLength(1)
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

// F8-1 (troca a S-19, "nada grudado nem em movimento"): só o índice acompanha a leitura. A abertura não gruda nem se move, nada
// é `fixed`, e a página não tem ouvinte de rolagem (o link atual vem de um IntersectionObserver). O jsdom não mede layout,
// então a regra é lida do CSS e do código.
describe('só o índice gruda ao rolar (CSS e código)', () => {
  const css = lerCss().replace(/\/\*[\s\S]*?\*\//g, '')
  const lerFonte = (arquivo: string) => readFileSync(join(process.cwd(), 'src/componentes/publicas-texto', arquivo), 'utf8')

  it('o CSS das páginas de leitura tem um único position: sticky, o do índice, e nenhum position: fixed', () => {
    expect(css.match(/position:\s*sticky/g)).toHaveLength(1)
    expect(css).not.toMatch(/position:\s*fixed/)
    const bloco = /@container pt-pagina \(min-width: 66rem\)\s*\{([\s\S]*?\n {2}\})/.exec(css)![1]
    expect(/\.pt-indice\s*\{([^}]*)\}/.exec(bloco)![1]).toMatch(/position:\s*sticky/)
    expect(css.match(/overflow-y:\s*auto/g)).toHaveLength(1)
  })

  it('a abertura não tem animação, transição, sticky nem fixed: nada nela se move nem gruda', () => {
    const regras = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, corpo]) => ({ seletor: seletor.trim(), corpo }))
    for (const { seletor, corpo } of regras.filter(({ seletor }) => /^\.pt-(abertura|placa|email|cabeca)/.test(seletor))) {
      expect(corpo, seletor).not.toMatch(/animation|transition|position:\s*(sticky|fixed)|transform/)
    }
  })

  it('nem o índice nem a página ouvem a rolagem (nada de addEventListener("scroll") nem onScroll)', () => {
    for (const arquivo of ['IndiceDaPagina.tsx', 'PaginaDeLeitura.tsx']) {
      const fonte = lerFonte(arquivo)
      expect(fonte, arquivo).not.toMatch(/addEventListener\(\s*['"]scroll|onScroll|requestAnimationFrame/)
    }
    expect(lerFonte('IndiceDaPagina.tsx')).toMatch(/new IntersectionObserver/)
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
    const css = lerCss()
    expect(css).not.toMatch(/pt-aviso|pt-destaque/)
  })
})

describe('Contato: bloco de e-mail', () => {
  it('não repete o título "Fale conosco" como seção: a página tem só as duas outras seções e, com duas, nenhum índice', () => {
    const { container } = renderizarRota('/contato')
    const principal = container.querySelector('main')!
    expect(within(principal).queryByRole('heading', { level: 2, name: 'Fale conosco' })).toBeNull()
    expect(within(principal).queryByRole('navigation', { name: ROTULO_INDICE })).toBeNull()
    expect(within(principal).getAllByRole('heading', { level: 2 }).map((titulo) => titulo.textContent)).toEqual([
      'Em uma urgência',
      'Para que serve este canal',
    ])
    expect(principal.querySelector('h1')!.textContent).toBe('Contato')
    expect(principal.querySelector('h1')!.nextElementSibling!.textContent).toBe('Fale conosco.')
  })

  it('o botão "Escrever para nós" é um link mailto com o estilo de botão de mel, para ler sobre o cacau (alvo de 44 px)', () => {
    renderizarRota('/contato')
    const botao = screen.getByRole('link', { name: 'Escrever para nós' })
    expect(botao.className).toBe('cm-botao cm-botao-mel alvo-toque')
  })
})

// Nenhuma página de leitura tem mais parágrafo "a definir": o responsável e a idade mínima já estão respondidos.
describe('nenhum parágrafo "a definir" em página de leitura', () => {
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
    it(`${caminho}: nenhum parágrafo com "a definir"`, () => {
      const { container } = renderizarRota(caminho)
      const comADefinir = [...container.querySelectorAll('main .pt-leitura p')].filter((p) =>
        /(?<![\p{L}])a definir(?![\p{L}])/u.test(p.textContent ?? ''),
      )
      expect(comADefinir).toHaveLength(0)
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
  it('"Responsável pelo AppMaternidade: DeD TechStack." é o último bloco de "Prazo" e não está em "Como pedir"', () => {
    renderizarRota('/exclusao-de-conta')
    const pedir = screen.getByRole('heading', { level: 2, name: 'Como pedir' }).closest('section')!
    expect(pedir.textContent).not.toContain('a definir')
    const prazo = screen.getByRole('heading', { level: 2, name: 'Prazo' }).closest('section')!
    expect(prazo.querySelector('.pt-texto')!.lastElementChild!.textContent).toBe('Responsável pelo AppMaternidade: DeD TechStack.')
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

  it('o botão "Ir para a Conta" fica na abertura, logo depois da frase de abertura, e leva a /app/conta', () => {
    const { container } = renderizarRota('/exclusao-de-conta')
    const cabeca = container.querySelector('main .pt-abertura .pt-cabeca')!
    const botao = within(cabeca as HTMLElement).getByRole('link', { name: 'Ir para a Conta' })
    expect(botao.getAttribute('href')).toBe('/app/conta')
    expect(botao.className).toBe('cm-botao cm-botao-mel alvo-toque')
    expect(cabeca.lastElementChild).toBe(botao.parentElement)
    expect(cabeca.lastElementChild!.previousElementSibling!.tagName).toBe('DIV')
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

  it('a placa da rua fica na abertura, depois do botão, como nas outras páginas: nada de painel nem de figura na leitura', () => {
    const { container } = renderizarRota('/exclusao-de-conta')
    const principal = container.querySelector('main')!
    const placa = principal.querySelector('.pt-abertura .pt-placa')!
    expect(placa).not.toBeNull()
    expect(principal.querySelector('.pt-leitura aside, .pt-leitura img, .pt-leitura picture')).toBeNull()
    const botao = screen.getByRole('link', { name: 'Ir para a Conta' })
    expect(botao.compareDocumentPosition(placa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

// A exclusão e o pedido de dados já existem na tela Conta (/app/conta): as páginas públicas não dizem mais que
// "ainda não pode" nem apontam para uma tela "Família e conta" que não existe.
describe('páginas públicas: exclusão e dados na tela Conta', () => {
  const textoDe = (caminho: string) => {
    const { container } = renderizarRota(caminho)
    return container.querySelector('main')!.textContent ?? ''
  }

  it('I-1 Exclusão de conta: sem "ainda não pode ser feito por este site" nem "Família e conta"; cita /app/conta, "Baixar meus dados" e "Excluir minha conta"', () => {
    const texto = textoDe('/exclusao-de-conta')
    expect(texto).not.toContain('ainda não pode ser feito por este site')
    expect(texto).not.toContain('Família e conta')
    expect(texto).toContain('/app/conta')
    expect(texto).toContain('Baixar meus dados')
    expect(texto).toContain('Excluir minha conta')
  })

  it('I-2 Privacidade: sem "Família e conta" e com a tela Conta', () => {
    const texto = textoDe('/privacidade')
    expect(texto).not.toContain('Família e conta')
    expect(texto).toContain('tela Conta')
  })

  it('I-3 Privacidade mantém o bloco "Para falar sobre os seus dados" com o link para /contato e o Encarregado', () => {
    const { container } = renderizarRota('/privacidade')
    const principal = container.querySelector('main')!
    const paragrafo = [...principal.querySelectorAll('p')].find((p) => p.textContent?.startsWith('Para falar sobre os seus dados: '))!
    expect(paragrafo).toBeDefined()
    expect(paragrafo.querySelector('a')!.getAttribute('href')).toBe('/contato')
    expect(principal.textContent).toContain('Encarregado pelo tratamento de dados: Daniel Macedo.')
  })

  it('I-4 os marcadores legais continuam nas páginas que os têm', () => {
    const exclusao = textoDe('/exclusao-de-conta')
    expect(exclusao).toContain('Responsável pelo AppMaternidade: DeD TechStack.')
    expect(exclusao).toContain('O prazo da exclusão ainda será definido')
    expect(textoDe('/privacidade')).toContain('Responsável pelo AppMaternidade: DeD TechStack.')
    const termos = textoDe('/termos')
    expect(termos).toContain('Responsável pelo AppMaternidade: DeD TechStack.')
    expect(termos).toContain(
      'Não há idade mínima para usar o AppMaternidade. Quem tem menos de 18 anos usa o site com o pai, a mãe ou o responsável legal.',
    )
  })

  it('I-4b /privacidade, /termos, /exclusao-de-conta e /sobre trazem o responsável "DeD TechStack" e não "a definir"', () => {
    for (const caminho of ['/privacidade', '/termos', '/exclusao-de-conta', '/sobre']) {
      const texto = textoDe(caminho)
      expect(texto, caminho).toContain('Responsável pelo AppMaternidade: DeD TechStack.')
      expect(texto, caminho).not.toContain('Responsável pelo AppMaternidade: a definir')
    }
  })

  it('I-5 nenhuma das duas páginas fala em CSV', () => {
    expect(textoDe('/exclusao-de-conta')).not.toContain('CSV')
    expect(textoDe('/privacidade')).not.toContain('CSV')
  })
})

describe('Privacidade: lista de dados', () => {
  it('mostra os grupos de dados uma vez só, na sua seção, e nada de lista na abertura', () => {
    const { container } = renderizarRota('/privacidade')
    const abertura = container.querySelector('main .pt-abertura')!
    expect(abertura.querySelector('li')).toBeNull()
    expect(container.querySelector('.pt-abertura-lista')).toBeNull()
    const primeiraSecao = screen.getByRole('heading', { level: 2, name: 'Que dados o site vai guardar' }).closest('section')!
    const itensDaSecao = [...primeiraSecao.querySelectorAll('li')].map((item) => item.textContent)
    expect(itensDaSecao).toHaveLength(9)
    // Cada item da lista aparece uma só vez na página inteira.
    const principal = container.querySelector('main')!
    for (const item of itensDaSecao) expect(principal.textContent!.split(item!), item!).toHaveLength(2)
  })

  it('as outras páginas também não têm lista na abertura', () => {
    for (const [caminho] of PAGINAS) {
      const { container, unmount } = renderizarRota(caminho)
      expect(container.querySelector('main .pt-abertura li'), caminho).toBeNull()
      unmount()
    }
  })
})

describe('índice igual nas cinco páginas com três seções ou mais (o Contato, com duas, não tem)', () => {
  const COM_INDICE = PAGINAS.filter(([, , dados]) => dados.secoes.length >= 3)

  it('as páginas com índice são as cinco de três seções ou mais; o Contato é a única sem', () => {
    expect(COM_INDICE.map(([caminho]) => caminho)).toEqual([
      '/regras-da-comunidade',
      '/privacidade',
      '/termos',
      '/exclusao-de-conta',
      '/sobre',
    ])
    expect(PAGINAS_DE_TEXTO.contato.secoes).toHaveLength(2)
  })

  it('em tela estreita é um <details> fechado nas cinco páginas (a Sobre não é exceção); em tela larga, uma lista só', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta.includes('max-width'),
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    try {
      for (const [caminho, , dados] of COM_INDICE) {
        const { container, unmount } = renderizarRota(caminho)
        const principal = container.querySelector('main')!
        expect(principal.hasAttribute('data-desenho'), caminho).toBe(false)
        const indice = principal.querySelector('.pt-pagina-grade > nav.pt-indice')!
        const detalhes = indice.querySelector('details')
        expect(detalhes, caminho).not.toBeNull()
        expect(detalhes!.open, caminho).toBe(false)
        expect(indice.querySelectorAll('ul'), caminho).toHaveLength(1)
        expect(indice.querySelectorAll('a'), caminho).toHaveLength(dados.secoes.length)
        unmount()
      }
    } finally {
      vi.unstubAllGlobals()
    }
    for (const [caminho, , dados] of COM_INDICE) {
      const { container, unmount } = renderizarRota(caminho)
      const indice = container.querySelector('main .pt-pagina-grade > nav.pt-indice')!
      expect(indice.querySelector('details'), caminho).toBeNull()
      expect(indice.querySelectorAll('ul'), caminho).toHaveLength(1)
      expect(indice.querySelectorAll('li'), caminho).toHaveLength(dados.secoes.length)
      unmount()
    }
  })
})

// F8-1: o link da seção atual. O jsdom não tem IntersectionObserver nem rolagem: um observador falso guarda o que foi
// observado e deixa o teste entregar as entradas, como o navegador entregaria ao cruzar a linha de âncora.
describe('índice: a seção atual (aria-current="location")', () => {
  interface Entrada {
    target: Element
    isIntersecting: boolean
    boundingClientRect: { top: number }
    rootBounds: { top: number } | null
  }
  let observadores: FalsoObservador[] = []

  class FalsoObservador {
    observados: Element[] = []
    desconectado = false
    readonly aviso: (entradas: Entrada[]) => void
    readonly opcoes: IntersectionObserverInit
    constructor(aviso: (entradas: Entrada[]) => void, opcoes: IntersectionObserverInit) {
      this.aviso = aviso
      this.opcoes = opcoes
      observadores.push(this)
    }
    observe(alvo: Element) {
      this.observados.push(alvo)
    }
    unobserve() {}
    disconnect() {
      this.desconectado = true
    }
  }

  beforeEach(() => {
    observadores = []
    vi.stubGlobal('IntersectionObserver', FalsoObservador)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** Os observadores do índice: os que observam os `h2` (a página pode ter outros, de outras peças). */
  const doIndice = () =>
    observadores.filter((observador) => !observador.desconectado && observador.observados.some((alvo) => alvo.tagName === 'H2'))

  /** Entrega ao observador uma entrada por título: `passados` títulos já chegaram à linha de âncora (topo ≤ 0), os outros estão abaixo. */
  const entregar = (observador: FalsoObservador, passados: number, visiveis: readonly number[] = []) => {
    act(() => {
      observador.aviso(
        observador.observados.map((alvo, i) => ({
          target: alvo,
          isIntersecting: visiveis.includes(i) || (i >= passados && i < passados + 2),
          boundingClientRect: { top: i < passados ? -40 * (passados - i) : 300 + 100 * (i - passados) },
          rootBounds: { top: 0 },
        })),
      )
    })
  }
  const atuais = (container: HTMLElement) =>
    [...container.querySelectorAll('main .pt-indice-link[aria-current="location"]')].map((link) => link.textContent)

  it('observa só os h2 da página e usa a raiz a partir da linha de âncora (sem ouvinte de rolagem)', () => {
    const { container, unmount } = renderizarRota('/privacidade')
    expect(doIndice()).toHaveLength(1)
    const [observador] = doIndice()
    expect(observador.observados.map((alvo) => alvo.id)).toEqual(PAGINAS_DE_TEXTO.privacidade.secoes.map(({ secao }) => secao.id))
    expect(observador.observados.every((alvo) => alvo.tagName === 'H2' && container.contains(alvo))).toBe(true)
    expect(observador.opcoes.rootMargin).toMatch(/^-\d+(\.\d+)?px 0px 0px 0px$/)
    unmount()
    expect(observador.desconectado).toBe(true)
  })

  it('em scroll 0 o primeiro link é o atual, e só ele', () => {
    const { container } = renderizarRota('/privacidade')
    expect(atuais(container)).toEqual([PAGINAS_DE_TEXTO.privacidade.secoes[0].secao.titulo])
    entregar(doIndice()[0], 0)
    expect(atuais(container)).toEqual([PAGINAS_DE_TEXTO.privacidade.secoes[0].secao.titulo])
  })

  it('rolando, o atual é o último título que já chegou à linha de âncora, e sempre um só', () => {
    const { container } = renderizarRota('/privacidade')
    const titulos = PAGINAS_DE_TEXTO.privacidade.secoes.map(({ secao }) => secao.titulo)
    for (const passados of [1, 3, 6, 10, 4, 2]) {
      entregar(doIndice()[0], passados)
      expect(atuais(container), `${passados} títulos passados`).toEqual([titulos[passados - 1]])
    }
  })

  it('depois de apertar o link n, n é o atual, mesmo quando o título n não alcança a linha (fim da página) e ainda está à vista', () => {
    const { container } = renderizarRota('/privacidade')
    const links = [...container.querySelectorAll<HTMLAnchorElement>('main .pt-indice-link')]
    const ultimo = links.length - 1
    fireEvent.click(links[ultimo])
    expect(atuais(container)).toEqual([links[ultimo].textContent])
    // O fim da página: o último título está à vista, mas só o penúltimo chegou à linha.
    entregar(doIndice()[0], ultimo, [ultimo])
    expect(atuais(container)).toEqual([links[ultimo].textContent])
    // Quando o título n sai da tela, volta a valer o cálculo.
    entregar(doIndice()[0], 2, [])
    expect(atuais(container)).toEqual([links[1].textContent])
  })

  it('com menos de três seções (Contato) não há observador nem índice', () => {
    renderizarRota('/contato')
    expect(doIndice()).toHaveLength(0)
    expect(document.querySelector('.pt-indice-link')).toBeNull()
  })
})

describe('listas longas', () => {
  it('uma lista de 4 itens ou mais, só de itens curtos (36 letras no máximo), corre em duas colunas (pt-lista-colunas); as outras, não', () => {
    for (const [caminho] of PAGINAS) {
      const { container, unmount } = renderizarRota(caminho)
      for (const lista of container.querySelectorAll<HTMLElement>('main .pt-leitura .pt-lista')) {
        const itens = [...lista.querySelectorAll(':scope > li')].map((item) => item.textContent ?? '')
        const curtos = itens.length >= 4 && itens.every((item) => item.length <= 36)
        expect(lista.classList.contains('pt-lista-colunas'), `${caminho}: ${itens.length} itens`).toBe(curtos)
      }
      unmount()
    }
  })
})

// O jsdom não mede layout: a abertura em noite (a faixa de cacau do tamanho do texto, a rua, a coluna de 640 e o índice
// grudado à direita) é lida do CSS; a medida de verdade, num Chrome, é a de `aberturaTexto.geometria.test.tsx`.
describe('abertura em noite e índice por largura (CSS)', () => {
  const css = lerCss().replace(/\/\*[\s\S]*?\*\//g, '')
  const regras = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, corpo]) => ({ seletor: seletor.trim(), corpo }))
  const corpos = (seletor: string) => regras.filter((regra) => regra.seletor === seletor).map(({ corpo }) => corpo)

  it('a abertura é uma faixa de cacau com letras de papel, e é o contêiner da própria disposição', () => {
    const [faixa] = corpos('.pt-abertura')
    expect(faixa).toMatch(/background-color:\s*var\(--color-cacau\)/)
    expect(faixa).toMatch(/(^|[\s;])color:\s*var\(--color-papel\)/)
    expect(faixa).toMatch(/container:\s*pt-abertura\s*\/\s*inline-size/)
    expect(css).toMatch(/@container pt-abertura \(min-width: 60rem\)/)
  })

  // F8-1 (troca a S-18, o T2 de 400 px): a abertura tem a altura do próprio texto, sem altura mínima nem faixa de piso.
  it('a abertura é intrínseca: padding-block do grupo, sem min-block-size nem altura fixa, sem a faixa de piso (::before)', () => {
    const [grade] = corpos('.pt-abertura-grade')
    expect(grade).toMatch(/padding-block:\s*var\(--espaco-grupo\)\s*;/)
    expect(css).not.toMatch(/\.pt-abertura-grade::before/)
    expect(css).not.toMatch(/color-mix/)
    for (const corpo of corpos('.pt-abertura-grade')) expect(corpo).not.toMatch(/(^|[\s;])(min-|max-)?(block-size|height):/)
    expect(css).not.toMatch(/min-block-size:\s*\d/)
  })

  it('largo: a rua sai do fluxo, rente à borda direita, com a altura da faixa e a largura que sobra à direita da coluna de leitura (340 px no máximo)', () => {
    const bloco = /@container pt-abertura \(min-width: 60rem\)\s*\{([\s\S]*?\n {2}\})/.exec(css)![1]
    const placa = /\.pt-placa\s*\{([^}]*)\}/.exec(bloco)![1]
    expect(placa).toMatch(/position:\s*absolute/)
    expect(placa).toMatch(/inset-inline-end:\s*0/)
    expect(placa).toMatch(/inset-block-end:\s*0/)
    expect(placa).toMatch(/(^|[\s;])block-size:\s*100%/)
    expect(placa).toMatch(
      /inline-size:\s*min\(340px,\s*100cqi\s*-\s*var\(--pt-borda\)\s*-\s*var\(--leitura\)\s*-\s*var\(--espaco-grupo\)\)/,
    )
    // A coluna do texto fica com a medida de leitura inteira: a rua cede a largura, não o texto.
    expect(bloco).not.toMatch(/max-inline-size/)
  })

  it('estreito: a rua é uma linha de secao-ampla no pé da faixa, até 340 px, rente à borda direita; a imagem cobre a caixa a partir do topo', () => {
    const [placa] = corpos('.pt-placa')
    expect(placa).toMatch(/justify-self:\s*end/)
    expect(placa).toMatch(/block-size:\s*var\(--espaco-secao-ampla\)/)
    expect(placa).toMatch(/inline-size:\s*min\(340px,\s*100%\)/)
    const [imagem] = corpos('.pt-placa img')
    expect(imagem).toMatch(/inline-size:\s*100%/)
    expect(imagem).toMatch(/block-size:\s*100%/)
    expect(imagem).toMatch(/object-fit:\s*cover/)
    expect(imagem).toMatch(/object-position:\s*top/)
    expect(css).not.toMatch(/--pt-placa-largura/)
  })

  it('regras do CSS: nenhum px na abertura além do teto de 340 px da rua; nada de clamp() nem de px acima de 32 em margin, padding ou gap; sem hex', () => {
    const regrasDaAbertura = regras.filter(({ seletor }) => /^\.pt-(abertura|placa)/.test(seletor))
    expect(regrasDaAbertura.length).toBeGreaterThan(3)
    for (const { seletor, corpo } of regrasDaAbertura) {
      const comprimentos = [...corpo.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map(([, numero]) => numero)
      for (const numero of comprimentos) expect(numero, `${seletor}: ${corpo.trim()}`).toBe('340')
    }
    for (const { seletor, corpo } of regras) {
      for (const [, propriedade, valor] of corpo.matchAll(/(margin[\w-]*|padding[\w-]*|(?:row-|column-)?gap):\s*([^;]+)/g)) {
        expect(valor, `${seletor} ${propriedade}`).not.toMatch(/clamp\(/)
        for (const [, numero] of valor.matchAll(/(-?\d+(?:\.\d+)?)px/g)) {
          expect(Math.abs(Number(numero)), `${seletor} ${propriedade}: ${valor}`).toBeLessThanOrEqual(32)
        }
      }
    }
    expect(css).not.toMatch(/areia|6E6560|texto-2/i)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('o documento: uma coluna de leitura de 640 px (max-w-leitura) sem fio entre as seções, com 64 px (vão midia) entre elas', () => {
    expect(css).not.toMatch(/border-top:\s*1px solid var\(--cor-fio-suave\)\s*;\s*padding-top/)
    expect(css).not.toMatch(/\.pt-leitura\s*>\s*\.pt-secao/)
    expect(css).not.toMatch(/\.pt-secao:first-child/)
    expect(css).not.toMatch(/\.pt-secao\s*\+\s*\.pt-secao/)
    expect(css).not.toMatch(/--pt-coluna/)
    const { container } = renderizarRota('/privacidade')
    const leitura = container.querySelector('main .pt-leitura')!
    expect(leitura.classList.contains('max-w-leitura')).toBe(true)
    expect(leitura.getAttribute('data-h-vao')).toBe('midia')
    for (const secao of leitura.querySelectorAll('section')) expect(secao.getAttribute('data-h-vao')).toBe('pilha')
  })

  it('o índice vai para a direita da coluna quando o quadro tem lugar para 640 + vão + 320 (consulta de contêiner); abaixo disso fica em fluxo', () => {
    const [quadro] = corpos('.pt-pagina')
    expect(quadro).toMatch(/container:\s*pt-pagina\s*\/\s*inline-size/)
    const [estreito] = corpos('.pt-pagina-grade')
    expect(estreito).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    const bloco = /@container pt-pagina \(min-width: 66rem\)\s*\{([\s\S]*?\n {2}\})/.exec(css)![1]
    expect(bloco).toMatch(/grid-template-columns:\s*minmax\(0,\s*var\(--leitura\)\)\s*minmax\(0,\s*20rem\)/)
    expect(bloco).toMatch(/\.pt-indice\s*\{[^}]*grid-column:\s*2/)
    expect(bloco).toMatch(/\.pt-leitura\s*\{[^}]*grid-column:\s*1/)
  })

  it('o índice (66 rem de quadro ou mais) gruda na linha de âncora, limita a altura à janela e rola por dentro; abaixo disso é estático', () => {
    const bloco = /@container pt-pagina \(min-width: 66rem\)\s*\{([\s\S]*?\n {2}\})/.exec(css)![1]
    const indice = /\.pt-indice\s*\{([^}]*)\}/.exec(bloco)![1]
    expect(indice).toMatch(/position:\s*sticky/)
    expect(indice).toMatch(/inset-block-start:\s*var\(--ancora-leitura\)/)
    expect(indice).toMatch(/max-block-size:\s*calc\(100svh\s*-\s*var\(--ancora-leitura\)\s*-\s*var\(--espaco-grupo\)\)/)
    expect(indice).toMatch(/overflow-y:\s*auto/)
    // Fora da consulta o índice não tem `position` (é estático, em fluxo).
    expect(corpos('.pt-indice').join('')).not.toMatch(/position:/)
    expect(css.replace(bloco, '')).not.toMatch(/position:\s*sticky/)
  })

  it('a linha de âncora é uma só propriedade, declarada no index.css, que o scroll-padding-top e o índice leem', () => {
    const raiz = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8').replace(/\r\n/g, '\n')
    expect(raiz.match(/--ancora-leitura:/g)).toHaveLength(1)
    expect(raiz).toMatch(/--ancora-leitura:\s*104px/)
    expect(raiz).toMatch(/scroll-padding-top:\s*var\(--ancora-leitura\)/)
    expect(raiz).not.toMatch(/scroll-padding-top:\s*\d/)
    expect(css).not.toMatch(/--ancora-leitura:/)
  })

  it('sem índice (Contato) as duas seções ficam lado a lado, 7fr e 5fr, a partir dos 66 rem; a coluna de leitura deixa de ser caixa', () => {
    const bloco = /@container pt-pagina \(min-width: 66rem\)\s*\{([\s\S]*?\n {2}\})/.exec(css)![1]
    const grade = /\.pt-pagina-grade\.pt-sem-indice\s*\{([^}]*)\}/.exec(bloco)![1]
    expect(grade).toMatch(/grid-template-columns:\s*minmax\(0,\s*7fr\)\s*minmax\(0,\s*5fr\)/)
    expect(/\.pt-sem-indice\s*>\s*\.pt-leitura\s*\{([^}]*)\}/.exec(bloco)![1]).toMatch(/display:\s*contents/)
    expect(/\.pt-sem-indice\s*>\s*\.pt-leitura\s*>\s*\.cm-lide\s*\{([^}]*)\}/.exec(bloco)![1]).toMatch(/grid-column:\s*1\s*\/\s*-1/)
  })

  it('T1, o marcador: trilho de 1 px no fio suave no começo da lista, links recuados pelo vão da pilha, traço de cacau de 2 px que só muda de escala', () => {
    expect(corpos('.pt-indice-lista')[0]).toMatch(/border-inline-start:\s*1px solid var\(--cor-fio-suave\)/)
    expect(corpos('.pt-indice-link')[0]).toMatch(/padding-inline-start:\s*var\(--espaco-pilha\)/)
    expect(corpos('.pt-indice-link')[0]).toMatch(/position:\s*relative/)
    const [traco] = corpos('.pt-indice-link::before')
    expect(traco).toMatch(/inset-block:\s*0/)
    expect(traco).toMatch(/inline-size:\s*2px/)
    expect(traco).toMatch(/background-color:\s*var\(--color-cacau\)/)
    expect(traco).toMatch(/transform:\s*scaleY\(0\)/)
    expect(traco).toMatch(/transition:\s*transform var\(--mov-fechar\) var\(--mov-curva\)/)
    expect(corpos(".pt-indice-link[aria-current='location']::before")[0]).toMatch(/transform:\s*scaleY\(1\)/)
    // Um só `transition`, o do marcador, e nenhuma animação.
    expect(css.match(/transition/g)).toHaveLength(1)
    expect(css).not.toMatch(/animation|@keyframes|transition:\s*all/)
  })

  it('com movimento reduzido o marcador fica no lugar: a regra global zera as transições e o tempo de fechar', () => {
    const raiz = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8').replace(/\r\n/g, '\n')
    const reduzido = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?\n\})/.exec(raiz)![1]
    expect(reduzido).toMatch(/transition:\s*none\s*!important/)
    expect(reduzido).toMatch(/--mov-fechar:\s*0ms/)
  })

  it('o índice é uma lista vertical só, com o rótulo e os links no corpo; links de cacau, de 44 px, sublinhados só no hover e no foco', () => {
    const [rotulo] = corpos('.pt-indice-rotulo')
    expect(rotulo).toMatch(/font-size:\s*var\(--texto-corpo-tamanho\)/)
    expect(rotulo).toMatch(/line-height:\s*var\(--texto-corpo-entrelinha\)/)
    expect(rotulo).toMatch(/font-weight:\s*500/)
    const [link] = corpos('.pt-indice-link')
    expect(link).toMatch(/font-size:\s*var\(--texto-corpo-tamanho\)/)
    expect(link).toMatch(/color:\s*var\(--color-cacau\)/)
    expect(link).toMatch(/min-block-size:\s*var\(--alvo-toque\)/)
    expect(link).toMatch(/text-decoration-line:\s*none/)
    const [sublinhado] = corpos('.pt-indice-link:hover,\n  .pt-indice-link:focus-visible')
    expect(sublinhado).toMatch(/text-decoration-line:\s*underline/)
    const [lista] = corpos('.pt-indice-lista')
    expect(lista).not.toMatch(/display:\s*grid|columns:/)
    expect(css).not.toMatch(/grid-template-columns:\s*repeat\(/)
    expect(css).not.toMatch(/\.pt-indice-lista\s*>\s*li\s*\+\s*li/)
  })

  it('o índice recolhido é uma linha de 48 px, sem fundo e sem fio', () => {
    expect(css).not.toMatch(/\.pt-indice-detalhes\s*\{/)
    expect(corpos('.pt-indice-resumo')[0]).toMatch(/min-height:\s*48px/)
    expect(corpos('.pt-indice-resumo')[0]).not.toMatch(/background/)
    expect(css).not.toMatch(/\.pt-indice:has\(/)
  })

  it('o cartão de e-mail não tem caixa: sem fundo, borda, sombra nem gradiente; a página não tem sombra, gradiente nem animação (a única transição é a do marcador do índice)', () => {
    const [email] = corpos('.pt-email')
    expect(email).not.toMatch(/background|border|box-shadow/)
    expect(css).not.toMatch(/box-shadow|gradient|animation|@keyframes|position:\s*fixed/)
  })
})
