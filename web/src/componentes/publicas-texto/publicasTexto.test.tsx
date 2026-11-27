import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EMAIL_CONTATO, PAGINAS_DE_TEXTO, ROTULO_INDICE, TEXTO_APOIO_CONTATO } from '../../conteudo/publicas-texto.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'
import { ROTULO_CRIAR_CONTA } from '../casca/textos.ts'
import { BlocoDeLeitura } from './BlocoDeLeitura.tsx'

it('destaca o ponto literal sem marcar outro caractere ou atravessar limites Unicode', () => {
  const texto = '1.2, 1x2, é1.2, 1.2ó, 11.2 e 1.22.'
  const { container } = render(<BlocoDeLeitura bloco={texto} destaques={['1.2']} />)
  expect(container.textContent).toBe(texto)
  expect([...container.querySelectorAll('strong')].map((no) => no.textContent)).toEqual(['1.2'])
})

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
  '/contato': null,
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

      if (dados.secoes.length >= 3 && dados.disposicao !== 'faixas') {
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
        it('com duas seções ou com faixas não tem o índice "Nesta página" (nem o <details> dele)', () => {
          const { container } = renderizarRota(caminho)
          const principal = container.querySelector('main')!
          expect(principal.querySelector('nav.pt-indice')).toBeNull()
          expect(within(principal).queryByRole('navigation', { name: ROTULO_INDICE })).toBeNull()
          expect(principal.querySelector('.pt-indice-link, .pt-indice-detalhes')).toBeNull()
          if (dados.disposicao !== 'faixas') expect(principal.querySelector('.pt-sem-indice')).not.toBeNull()
        })
      }

      it('não mostra mais o desenho de traço, o painel de mel nem a frase de apoio (os campos ficam no conteúdo, sem aparecer)', () => {
        const { container } = renderizarRota(caminho)
        const principal = container.querySelector('main')!
        expect(principal.querySelector('img[data-ilustracao]')).toBeNull()
        expect(principal.querySelector('aside')).toBeNull()
        expect(principal.querySelector('.cm-painel, [data-painel], .pt-painel, .pt-figura, .pt-apoio, .pt-segunda-linha')).toBeNull()
        expect(principal.textContent!.includes(dados.apoio)).toBe(caminho === '/contato')
        expect(dados.ilustracao).toBeTruthy()
        expect(dados.apoio).toBeTruthy()
      })

      it('abre com uma faixa de cacau (pt-abertura) que tem o h1, a frase e a luminária, decorativa e na hora', () => {
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
        expect(imagem.closest('.pt-luminaria')).not.toBeNull()
        expect(imagem.getAttribute('src')).toBe(`${import.meta.env.BASE_URL}composicao/a/luminaria.webp`)
        expect(imagem.getAttribute('alt')).toBe('')
        expect(imagem.getAttribute('loading')).toBe('eager')
        // A placa vem depois do texto, para o título abrir a leitura.
        const titulo = principal.querySelector('h1')!
        expect(titulo.compareDocumentPosition(imagem) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      })

      if (dados.secoes.length >= 3 && dados.disposicao !== 'faixas') {
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
          : 'não tem link de ação na abertura (nem a pílula de "Criar conta"): nenhum link de ação',
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
          ? 'mostra o e-mail de contato na abertura, no lugar do botão e sem caixa, com o endereço e a indicação de que é fictício'
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
            expect(bloco.querySelector('address')?.textContent).toBe(EMAIL_CONTATO)
            expect(principal.textContent!.split(EMAIL_CONTATO)).toHaveLength(2)

            const botao = within(principal).getByRole('button', { name: 'Escrever para nós' })
            expect(botao.getAttribute('aria-disabled')).toBe('true')
            expect(document.getElementById(botao.getAttribute('aria-describedby')!)?.textContent).toBe(TEXTO_APOIO_CONTATO)
            expect(bloco.contains(botao)).toBe(true)
            expect(principal.querySelectorAll('a[href^="mailto:"]')).toHaveLength(0)
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
  it('o campo "ilustracao" segue no conteúdo ("maos-celular"), mas a página mostra só a luminária', () => {
    const { container } = renderizarRota('/contato')
    expect(PAGINAS_DE_TEXTO.contato.ilustracao).toBe('maos-celular')
    expect(container.querySelector('main img[data-ilustracao]')).toBeNull()
    expect(container.querySelectorAll('main img')).toHaveLength(1)
  })
})

describe('Contato: urgência', () => {
  it('uma entrada SPA sem fragmento dá foco ao título da página', async () => {
    renderizarRota('/sobre')
    const link = within(screen.getByRole('contentinfo')).getAllByRole('link', { name: 'Regras da comunidade' })[0]
    fireEvent.click(link)
    const titulo = await screen.findByRole('heading', { level: 1, name: 'Regras da comunidade' })
    await waitFor(() => expect(document.activeElement).toBe(titulo))
    expect(rolar).not.toHaveBeenCalled()
  })

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

  it('realça apenas os números de urgência e preserva o parágrafo', () => {
    const { container } = renderizarRota('/contato')
    const paragrafo = container.querySelector('.pt-texto p')!
    expect([...paragrafo.querySelectorAll('strong.co-leg-hora')].map((numero) => numero.textContent)).toEqual(['192', '188'])
    const texto = PAGINAS_DE_TEXTO.contato.secoes[0].blocos[0]
    if (!Array.isArray(texto)) throw new Error('Parágrafo de urgência ausente')
    expect(paragrafo.textContent).toBe(texto.map((trecho) => typeof trecho === 'string' ? trecho : trecho.link).join(''))
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

  it('a luminária fica na abertura, depois do botão, como nas outras páginas: nada de painel nem de figura na leitura', () => {
    const { container } = renderizarRota('/exclusao-de-conta')
    const principal = container.querySelector('main')!
    const placa = principal.querySelector('.pt-abertura .pt-luminaria')!
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

describe('índice igual nas quatro páginas legais', () => {
  const COM_INDICE = PAGINAS.filter(([, , dados]) => dados.secoes.length >= 3 && dados.disposicao !== 'faixas')

  it('somente as quatro páginas legais têm índice', () => {
    expect(COM_INDICE.map(([caminho]) => caminho)).toEqual([
      '/regras-da-comunidade',
      '/privacidade',
      '/termos',
      '/exclusao-de-conta',
    ])
    expect(PAGINAS_DE_TEXTO.contato.secoes).toHaveLength(2)
  })

  it('em tela estreita é um <details> fechado nas quatro páginas; em tela larga, uma lista só', () => {
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

// F8-1: o link da seção atual. O jsdom não tem IntersectionObserver, layout nem rolagem. O observador falso daqui se
// comporta como o de verdade: calcula a interseção de cada título com a raiz que o `rootMargin` define (a janela, com
// as margens somadas) e só avisa na observação inicial e quando `isIntersecting` ou a faixa de razão (os `threshold`)
// de um título muda. A rolagem é simulada: `rolarPara(y)` guarda o `scrollY`, e o `getBoundingClientRect` dos `h2`
// devolve o topo a partir dele. Assim um salto qualquer, para a frente ou para trás, só avisa se o navegador avisaria.
describe('índice: a seção atual (aria-current="location")', () => {
  const ALTURA_DA_JANELA = 900
  const LINHA_DE_ANCORA = 104
  const ALTURA_DO_TITULO = 40
  /** O topo do título i no documento: um título a cada 450 px, o primeiro a 300 px. */
  const topoNoDocumento = (i: number) => 300 + 450 * i

  interface Entrada {
    target: Element
    isIntersecting: boolean
    intersectionRatio: number
    boundingClientRect: { top: number; bottom: number; height: number }
    rootBounds: { top: number; bottom: number }
  }
  let observadores: FalsoObservador[] = []
  let rolagem = 0
  /** O índice (na página) de cada `h2` com seção, pelo id. */
  let posicoes = new Map<string, number>()

  const caixaDoTitulo = (alvo: Element) => {
    const i = posicoes.get(alvo.id)
    if (i === undefined) return null
    const top = topoNoDocumento(i) - rolagem
    return { top, bottom: top + ALTURA_DO_TITULO, height: ALTURA_DO_TITULO }
  }

  /** Lê um comprimento do `rootMargin` (px ou %, % da altura da janela, como o navegador faz para topo e base). */
  const emPixels = (valor: string) => (valor.endsWith('%') ? (parseFloat(valor) / 100) * ALTURA_DA_JANELA : parseFloat(valor))

  class FalsoObservador {
    observados: Element[] = []
    desconectado = false
    readonly aviso: (entradas: Entrada[]) => void
    readonly opcoes: IntersectionObserverInit
    /** O estado de cada alvo na última entrega: interseção e faixa da razão. */
    private estado = new Map<Element, string>()
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
    /** A raiz: a janela com as margens (positiva alarga, negativa encolhe), do topo à base. */
    private raiz() {
      const [topo = '0px', , base = topo] = (this.opcoes.rootMargin ?? '0px').split(/\s+/)
      return { top: -emPixels(topo), bottom: ALTURA_DA_JANELA + emPixels(base) }
    }
    /** Entrega o que mudou desde a última vez (tudo, na primeira): o que o navegador faria depois de um quadro. */
    entregarMudancas() {
      if (this.desconectado) return
      const raiz = this.raiz()
      const limiares = [this.opcoes.threshold ?? 0].flat().sort((a, b) => a - b)
      const mudaram: Entrada[] = []
      for (const alvo of this.observados) {
        const caixa = caixaDoTitulo(alvo)
        if (!caixa) continue
        const sobreposicao = Math.min(caixa.bottom, raiz.bottom) - Math.max(caixa.top, raiz.top)
        // Como no navegador, encostar na borda conta como interseção.
        const intersecta = sobreposicao >= 0
        const razao = intersecta ? sobreposicao / caixa.height : 0
        const faixa = limiares.filter((limiar) => razao >= limiar && (limiar > 0 || intersecta)).length
        const novo = `${intersecta}:${faixa}`
        if (this.estado.get(alvo) !== novo) {
          mudaram.push({
            target: alvo,
            isIntersecting: intersecta,
            intersectionRatio: razao,
            boundingClientRect: caixa,
            rootBounds: { top: raiz.top, bottom: raiz.bottom },
          })
        }
        this.estado.set(alvo, novo)
      }
      if (mudaram.length > 0) this.aviso(mudaram)
    }
  }

  const realGetComputedStyle = window.getComputedStyle.bind(window)
  let espiaoDaCaixa: { mockRestore: () => void } | undefined
  let espiaoDoEstilo: { mockRestore: () => void } | undefined
  let alturaOriginal: PropertyDescriptor | undefined

  beforeEach(() => {
    observadores = []
    rolagem = 0
    posicoes = new Map()
    vi.stubGlobal('IntersectionObserver', FalsoObservador)
    alturaOriginal = Object.getOwnPropertyDescriptor(window, 'innerHeight')
    Object.defineProperty(window, 'innerHeight', { value: ALTURA_DA_JANELA, configurable: true, writable: true })
    // A linha de âncora vem do `scroll-padding-top` do html (104 px em 1440); o jsdom não lê o CSS do build.
    espiaoDoEstilo = vi.spyOn(window, 'getComputedStyle').mockImplementation(((elemento: Element, pseudo?: string | null) => {
      const estilo = realGetComputedStyle(elemento, pseudo)
      if (elemento !== document.documentElement) return estilo
      return new Proxy(estilo, {
        get: (alvo, chave) => {
          if (chave === 'scrollPaddingTop') return `${LINHA_DE_ANCORA}px`
          const valor = Reflect.get(alvo, chave, alvo)
          return typeof valor === 'function' ? valor.bind(alvo) : valor
        },
      })
    }) as typeof window.getComputedStyle)
    espiaoDaCaixa = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const caixa = caixaDoTitulo(this)
      const topo = caixa?.top ?? 0
      const base = caixa?.bottom ?? 0
      return { x: 0, y: topo, top: topo, bottom: base, left: 0, right: 0, width: 0, height: base - topo, toJSON: () => ({}) } as DOMRect
    })
  })
  afterEach(() => {
    espiaoDaCaixa?.mockRestore()
    espiaoDoEstilo?.mockRestore()
    if (alturaOriginal) Object.defineProperty(window, 'innerHeight', alturaOriginal)
    else Reflect.deleteProperty(window, 'innerHeight')
    vi.unstubAllGlobals()
  })

  /** Os observadores do índice: os que observam os `h2` (a página pode ter outros, de outras peças). */
  const doIndice = () =>
    observadores.filter((observador) => !observador.desconectado && observador.observados.some((alvo) => alvo.tagName === 'H2'))

  /** Renderiza a rota e liga a posição de cada título da seção (a ordem da página) no documento simulado. */
  const abrir = (caminho: keyof typeof PAGINAS_DE_TEXTO, y = 0) => {
    const renderizado = renderizarRota(`/${caminho}`)
    const ids = PAGINAS_DE_TEXTO[caminho].secoes.map(({ secao }) => secao.id)
    posicoes = new Map(ids.map((id, i) => [id, i]))
    rolarPara(y)
    return renderizado
  }

  /** A rolagem: muda o `scrollY` simulado e deixa os observadores avisarem o que o navegador avisaria. */
  const rolarPara = (y: number) => {
    rolagem = y
    act(() => {
      for (const observador of doIndice()) observador.entregarMudancas()
    })
  }

  /** O título esperado: o último cujo topo já chegou à linha de âncora, ou o primeiro se nenhum chegou. */
  const esperado = (caminho: keyof typeof PAGINAS_DE_TEXTO, y: number) => {
    const secoes = PAGINAS_DE_TEXTO[caminho].secoes
    let indice = 0
    secoes.forEach((_, i) => {
      if (topoNoDocumento(i) - y <= LINHA_DE_ANCORA) indice = i
    })
    return secoes[indice].secao.titulo
  }

  const atuais = (container: HTMLElement) =>
    [...container.querySelectorAll('main .pt-indice-link[aria-current="location"]')].map((link) => link.textContent)

  it('observa só os h2 da página, com a raiz do topo até a linha de âncora (sem ouvinte de rolagem)', () => {
    const { container, unmount } = abrir('privacidade')
    expect(doIndice()).toHaveLength(1)
    const [observador] = doIndice()
    expect(observador.observados.map((alvo) => alvo.id)).toEqual(PAGINAS_DE_TEXTO.privacidade.secoes.map(({ secao }) => secao.id))
    expect(observador.observados.every((alvo) => alvo.tagName === 'H2' && container.contains(alvo))).toBe(true)
    // Tudo o que está acima da linha de âncora entra na raiz: o topo vai bem para cima, a base sobe até a linha.
    expect(observador.opcoes.rootMargin).toBe(`1000000px 0px -${ALTURA_DA_JANELA - LINHA_DE_ANCORA}px 0px`)
    unmount()
    expect(observador.desconectado).toBe(true)
  })

  it('em scroll 0 o primeiro link é o atual, e só ele', () => {
    const { container } = abrir('privacidade')
    expect(atuais(container)).toEqual([PAGINAS_DE_TEXTO.privacidade.secoes[0].secao.titulo])
  })

  it('rolando de pouco em pouco, o atual é o último título que já chegou à linha de âncora, e sempre um só', () => {
    const { container } = abrir('privacidade')
    for (let y = 0; y <= 4400; y += 150) {
      rolarPara(y)
      expect(atuais(container), `scrollY ${y}`).toEqual([esperado('privacidade', y)])
    }
  })

  it('saltos de qualquer tamanho, para a frente e para trás, deixam o atual certo (o título pula de abaixo da janela para acima da linha)', () => {
    const { container } = abrir('privacidade')
    const titulos = PAGINAS_DE_TEXTO.privacidade.secoes.map(({ secao }) => secao.titulo)
    // Os casos do relato: de 0 direto a 1500 e a 2300.
    rolarPara(1500)
    expect(atuais(container)).toEqual([titulos[2]])
    rolarPara(0)
    expect(atuais(container)).toEqual([titulos[0]])
    rolarPara(2300)
    expect(atuais(container)).toEqual([titulos[4]])
    rolarPara(1500)
    expect(atuais(container)).toEqual([titulos[2]])
    for (const y of [4100, 700, 3600, 0, 2950, 100, 3850, 1200, 40, 4400, 2300, 0]) {
      rolarPara(y)
      expect(atuais(container), `salto para scrollY ${y}`).toEqual([esperado('privacidade', y)])
    }
  })

  it('o salto que o navegador não avisaria sem a raiz até a linha (0 para 2300 pela raiz antiga) agora avisa', () => {
    abrir('privacidade')
    const [observador] = doIndice()
    const avisos: string[][] = []
    const original = observador.aviso
    ;(observador as { aviso: (entradas: Entrada[]) => void }).aviso = (entradas) => {
      avisos.push(entradas.map((entrada) => entrada.target.id))
      original(entradas)
    }
    rolarPara(2300)
    // Os títulos 0 e 1 saíram da janela e o 2, 3 e 4 passaram da linha sem nunca estarem à vista: todos mudaram.
    const ids = PAGINAS_DE_TEXTO.privacidade.secoes.map(({ secao }) => secao.id)
    expect(avisos.flat()).toEqual(expect.arrayContaining(ids.slice(0, 5)))
  })

  it('um endereço com âncora (rolagem inicial longe do topo) abre com o título certo como atual', () => {
    const { container } = abrir('privacidade', 2300)
    expect(atuais(container)).toEqual([esperado('privacidade', 2300)])
  })

  it('depois de apertar o link n, n é o atual, mesmo quando o título n não alcança a linha (fim da página) e ainda está à vista', () => {
    const { container } = abrir('privacidade')
    const links = [...container.querySelectorAll<HTMLAnchorElement>('main .pt-indice-link')]
    const ultimo = links.length - 1
    fireEvent.click(links[ultimo])
    expect(atuais(container)).toEqual([links[ultimo].textContent])
    // O fim da página: o último título está à vista (a 500 px do topo), mas só o penúltimo chegou à linha.
    const fim = topoNoDocumento(ultimo) - 500
    rolarPara(fim)
    expect(atuais(container)).toEqual([links[ultimo].textContent])
    // Quando o título n sai da tela, volta a valer o cálculo.
    rolarPara(1500)
    expect(atuais(container)).toEqual([esperado('privacidade', 1500)])
  })

  it('apertar o link n e rolar até lá: n é o atual quando o título chega à linha, e a lista segue o cálculo', () => {
    const { container } = abrir('privacidade')
    const links = [...container.querySelectorAll<HTMLAnchorElement>('main .pt-indice-link')]
    fireEvent.click(links[5])
    expect(atuais(container)).toEqual([links[5].textContent])
    rolarPara(topoNoDocumento(5) - LINHA_DE_ANCORA)
    expect(atuais(container)).toEqual([links[5].textContent])
    rolarPara(topoNoDocumento(7) - LINHA_DE_ANCORA)
    expect(atuais(container)).toEqual([links[7].textContent])
  })

  it('mudar a altura da janela refaz o observador com a base da raiz na linha de âncora nova', () => {
    abrir('privacidade')
    const [primeiro] = doIndice()
    Object.defineProperty(window, 'innerHeight', { value: 700, configurable: true, writable: true })
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(primeiro.desconectado).toBe(true)
    const [novo] = doIndice()
    expect(novo.opcoes.rootMargin).toBe(`1000000px 0px -${700 - LINHA_DE_ANCORA}px 0px`)
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

  it('a leitura usa cores do tema e a abertura compacta não fixa dimensões em px', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i)
    for (const { seletor, corpo } of regras) {
      if (!/^\.pt-(abertura|luminaria)\b/.test(seletor)) continue
      const dimensoes = corpo.matchAll(/(?:^|\s)((?:(?:min|max)-)?(?:width|height|inline-size|block-size)):\s*([^;]+)/g)
      for (const [, propriedade, valor] of dimensoes) {
        expect(valor, `${seletor} ${propriedade}`).not.toMatch(/-?\d+(?:\.\d+)?px\b/i)
      }
    }
  })

  it('a luminária é assentada no piso da Casa, dentro da mesma abertura', () => {
    const { container } = renderizarRota('/sobre')
    expect(container.querySelector('.pt-cena .co-h1')?.textContent).toBe('Sobre')
    expect(container.querySelector('.pt-cena .pt-luminaria')).not.toBeNull()
    expect(container.querySelector('.pt-cena')?.textContent).toContain(PAGINAS_DE_TEXTO.sobre.apresentacao)
    expect(corpos('.pt-abertura')[0]).toMatch(/border-block-end:.*var\(--chao-noite\)/)
    expect(corpos('.pt-luminaria')[0]).toMatch(/align-self:\s*end/)
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
