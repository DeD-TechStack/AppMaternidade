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

      it(`tem na abertura, depois do título e da frase, a pílula de mel "${BOTAO_DA_ABERTURA[caminho][0]}" (${BOTAO_DA_ABERTURA[caminho][1]})`, () => {
        const { container } = renderizarRota(caminho)
        const abertura = container.querySelector('main .pt-abertura')!
        const titulo = abertura.querySelector('h1')!
        const botoes = [...abertura.querySelectorAll<HTMLAnchorElement>('.pt-cabeca a.cm-botao')]
        expect(botoes).toHaveLength(1)
        const [botao] = botoes
        const [rotulo, destino] = BOTAO_DA_ABERTURA[caminho]
        expect(titulo.nextElementSibling!.textContent).toBe(dados.subtitulo)
        expect(titulo.compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(botao.className).toBe('cm-botao cm-botao-mel alvo-toque')
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

// Nada fica fixo ao rolar: o painel lateral com o índice foi embora (um painel que só gruda deixava meia tela em
// branco nos recortes da página inteira). O jsdom não mede layout, então a regra é lida do CSS.
describe('nada fixo ao rolar (CSS)', () => {
  const css = lerCss().replace(/\/\*[\s\S]*?\*\//g, '')

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
    const css = lerCss()
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

describe('índice igual nas seis páginas', () => {
  it('em tela estreita é um <details> fechado nas seis páginas (a Sobre não é exceção); em tela larga, uma lista só', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta.includes('max-width'),
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    try {
      for (const [caminho, , dados] of PAGINAS) {
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
    for (const [caminho, , dados] of PAGINAS) {
      const { container, unmount } = renderizarRota(caminho)
      const indice = container.querySelector('main .pt-pagina-grade > nav.pt-indice')!
      expect(indice.querySelector('details'), caminho).toBeNull()
      expect(indice.querySelectorAll('ul'), caminho).toHaveLength(1)
      expect(indice.querySelectorAll('li'), caminho).toHaveLength(dados.secoes.length)
      unmount()
    }
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

// O jsdom não mede layout: o modelo T2 (a faixa de cacau, a placa, a coluna de 640 e o índice à direita) é lido do
// CSS; a medida de verdade, num Chrome, é a de `aberturaTexto.geometria.test.tsx`.
describe('modelo T2 por largura (CSS)', () => {
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

  it('largo: a faixa tem 400 px de altura mínima (min-block-size, cresce com o texto) e a placa sai do fluxo, rente à borda direita e ao pé', () => {
    const bloco = /@container pt-abertura \(min-width: 60rem\)\s*\{([\s\S]*?\n {2}\})/.exec(css)![1]
    expect(bloco).toMatch(/min-block-size:\s*400px/)
    expect(bloco).not.toMatch(/(^|[\s;])(block-size|height):\s*\d/)
    const placa = /\.pt-placa\s*\{([^}]*)\}/.exec(bloco)![1]
    expect(placa).toMatch(/position:\s*absolute/)
    expect(placa).toMatch(/inset-inline-end:\s*0/)
    expect(placa).toMatch(/inset-block-end:\s*0/)
    // A coluna do texto nunca passa por baixo da placa.
    expect(bloco).toMatch(/max-inline-size:\s*min\(var\(--leitura\),\s*100%\s*-\s*var\(--pt-borda\)\s*-\s*var\(--pt-placa-largura\)/)
  })

  it('a placa é mostrada na largura nativa de 340 px (densidade 1,59 do arquivo de 542, nunca ampliada) e o pé da faixa continua o chão dela, sem areia nem #6E6560', () => {
    expect(corpos('.pt-abertura')[0]).toMatch(/--pt-placa-largura:\s*340px/)
    const [placa] = corpos('.pt-placa')
    expect(placa).toMatch(/inline-size:\s*min\(var\(--pt-placa-largura\),\s*100%\)/)
    const [chao] = corpos('.pt-abertura-grade::before')
    expect(chao).toMatch(/background-color:\s*color-mix\(in srgb,\s*var\(--color-cacau\)/)
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

  it('o cartão de e-mail não tem caixa: sem fundo, borda, sombra nem gradiente, e nada se move (sem animação nem transição)', () => {
    const [email] = corpos('.pt-email')
    expect(email).not.toMatch(/background|border|box-shadow/)
    expect(css).not.toMatch(/box-shadow|gradient|animation|transition|@keyframes|position:\s*(sticky|fixed)/)
  })
})
