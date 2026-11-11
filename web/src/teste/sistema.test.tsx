import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PALETA, PERGUNTAS, SECOES } from '../conteudo/sistema.ts'
import { renderizarRota } from './renderizarRota.tsx'

// A página /sistema do Campo de mel (MAT-49a) e as peças de componentes/campo.

function reduzirMovimento() {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: consulta.includes('prefers-reduced-motion'),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('/sistema', () => {
  it('mostra todos os títulos de seção, na ordem do contrato', () => {
    renderizarRota('/sistema')
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')
    const esperados = [
      SECOES.paleta,
      SECOES.tipo,
      SECOES.botoes,
      SECOES.casca,
      SECOES.paineis,
      SECOES.cena,
      SECOES.numeros,
      SECOES.ilustracoes,
      SECOES.citacao,
      SECOES.faixa,
      SECOES.selos,
      SECOES.tabela,
      SECOES.depoimentos,
      SECOES.perguntas,
    ].map((linhas) => linhas.join(' '))
    const posicoes = esperados.map((titulo) => titulos.findIndex((t) => t.startsWith(titulo)))
    expect(posicoes.every((p) => p >= 0), JSON.stringify(titulos)).toBe(true)
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes)
  })

  it('o h1 tem a segunda linha inteira em itálico', () => {
    renderizarRota('/sistema')
    const h1 = screen.getByRole('heading', { level: 1, name: 'Campo de mel, a base do site.' })
    expect(h1.classList.contains('cm-h1')).toBe(true)
    expect(h1.querySelector('.cm-segunda-linha')!.textContent).toBe('a base do site.')
  })

  it('a paleta tem os 12 papéis com o hexadecimal e o uso, num painel de mel', () => {
    const { container } = renderizarRota('/sistema')
    const paleta = container.querySelector<HTMLElement>('[data-paleta]')!
    expect(paleta.closest('[data-painel="mel"]')).not.toBeNull()
    const itens = within(paleta).getAllByRole('listitem')
    expect(itens).toHaveLength(12)
    for (const [i, papel] of PALETA.entries()) {
      expect(itens[i].textContent).toContain(papel.nome)
      expect(itens[i].textContent).toContain(`#${papel.hex}`)
      expect(itens[i].textContent).toContain(papel.uso)
    }
  })

  it('mostra cada botão nos quatro estados, e o desativado não age', () => {
    const { container } = renderizarRota('/sistema')
    for (const variante of ['primario', 'contorno', 'texto', 'mel']) {
      const botoes = container.querySelectorAll(`main [data-botao="${variante}"]`)
      expect(botoes.length, variante).toBeGreaterThanOrEqual(4)
      expect(container.querySelector(`main [data-botao="${variante}"][data-forcar="hover"]`), variante).not.toBeNull()
      expect(container.querySelector(`main [data-botao="${variante}"][data-forcar="foco"]`), variante).not.toBeNull()
      expect(container.querySelector(`main [data-botao="${variante}"][aria-disabled="true"]`), variante).not.toBeNull()
    }
  })

  it('os quatro painéis de campo: mel, oliva, areia e cacau', () => {
    const { container } = renderizarRota('/sistema')
    for (const variante of ['mel', 'oliva', 'areia', 'cacau']) {
      expect(container.querySelector(`main [data-painel="${variante}"]`), variante).not.toBeNull()
    }
  })

  it('a cena de estúdio é uma <picture> WebP 1× e 2× com largura, altura e texto alternativo', () => {
    const { container } = renderizarRota('/sistema')
    const imagem = container.querySelector<HTMLImageElement>('img[data-cena]')!
    expect(imagem.getAttribute('src')).toBe('/cenas/sistema/trio-mel@1x.webp')
    expect(imagem.getAttribute('srcset')).toBe('/cenas/sistema/trio-mel@1x.webp 1x, /cenas/sistema/trio-mel@2x.webp 2x')
    // A cena composta é 3:2 (1536 × 1024 em 1×).
    expect(imagem.getAttribute('width')).toBe('1536')
    expect(imagem.getAttribute('height')).toBe('1024')
    expect(imagem.getAttribute('alt')).toMatch(/telas do site AppMaternidade/)
    // /sistema é a vitrine: a cena carrega na hora, como os desenhos da página.
    expect(imagem.getAttribute('loading')).toBe('eager')
    expect(imagem.closest('picture')!.querySelector('source[type="image/webp"]')).not.toBeNull()
    expect(imagem.closest('[data-painel="mel"]')!.classList.contains('cm-painel-luz')).toBe(true)
  })

  it('o cartão flutuante é HTML de verdade, girado de um dos valores permitidos, com o tempo em algarismos tabulares', () => {
    const { container } = renderizarRota('/sistema')
    const cartao = container.querySelector<HTMLElement>('[data-giro]')!
    expect([-4, -2, 2, 4]).toContain(Number(cartao.getAttribute('data-giro')))
    expect(cartao.textContent).toContain('Mamada em andamento')
    expect(cartao.querySelector('.cm-cartao-sessao-tempo')!.textContent).toBe('00:12:40')
    expect(cartao.querySelector('.cm-flutuante-cartao')!.getAttribute('style') ?? '').not.toMatch(/rotate[XY]|perspective/)
  })

  it('os números são três itens, cada um lido inteiro', () => {
    const { container } = renderizarRota('/sistema')
    const itens = [...container.querySelectorAll('main [data-numeros] li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim())
    expect(itens).toEqual(['7 tipos de registro', '2 toques', '0 metas ou comparações'])
  })

  it('as seis ilustrações são as imagens de traço em WebP 1× e 2×, nunca sobre o cacau', () => {
    const { container } = renderizarRota('/sistema')
    const imagens = [...container.querySelectorAll<HTMLImageElement>('main img[data-ilustracao]')]
    expect(imagens.map((i) => i.getAttribute('data-ilustracao')).sort()).toEqual(
      ['avo-carrinho', 'baba-tapete', 'mae-noite', 'maos-celular', 'pai-colo', 'tummy-time'],
    )
    for (const imagem of imagens) {
      expect(imagem.getAttribute('srcset')).toMatch(/@1x\.webp 1x, .*@2x\.webp 2x$/)
      expect(imagem.closest('[data-painel="cacau"], [data-painel="oliva"]')).toBeNull()
    }
  })

  it('a citação é um <figure> com <blockquote> e a linha do autor', () => {
    const { container } = renderizarRota('/sistema')
    const figura = container.querySelector('main figure.cm-citacao')!
    expect(figura.querySelector('blockquote')).not.toBeNull()
    expect(figura.querySelector('figcaption')!.textContent).toMatch(/Carla/)
  })

  it('a faixa de cacau traz o primário de mel e o brilho só como fundo', () => {
    const { container } = renderizarRota('/sistema')
    const faixa = container.querySelector<HTMLElement>('main [data-painel="cacau"].cm-faixa-cacau')!
    expect(faixa.querySelector('[data-brilho]')!.getAttribute('aria-hidden')).toBe('true')
    expect(within(faixa).getByRole('link', { name: 'Ver como funciona' }).getAttribute('data-botao')).toBe('mel')
  })
})

describe('FaixaSelos', () => {
  it('tem os cinco selos, a cópia da trilha escondida do leitor de tela e o botão de pausa', () => {
    const { container } = renderizarRota('/sistema')
    const selos = container.querySelector<HTMLElement>('[data-selos]')!
    const listas = selos.querySelectorAll('ul')
    expect(listas).toHaveLength(2)
    expect(listas[0].getAttribute('aria-hidden')).toBeNull()
    expect(listas[1].getAttribute('aria-hidden')).toBe('true')
    expect([...listas[0].querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      'Sem metas',
      'Sem comparações',
      'Dados só da família',
      'Funciona de madrugada',
      'Avó, pai e babá juntos',
    ])
  })

  it('o botão pausa e retoma o letreiro (alcançável pelo teclado)', () => {
    const { container } = renderizarRota('/sistema')
    const trilho = container.querySelector<HTMLElement>('.cm-selos-trilho')!
    const botao = screen.getByRole('button', { name: 'Pausar selos' })
    expect(botao.tagName).toBe('BUTTON')
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    expect(trilho.hasAttribute('data-pausado')).toBe(false)
    fireEvent.click(botao)
    expect(botao.getAttribute('aria-pressed')).toBe('true')
    expect(botao.textContent).toBe('Continuar selos')
    expect(trilho.hasAttribute('data-pausado')).toBe(true)
    fireEvent.click(botao)
    expect(trilho.hasAttribute('data-pausado')).toBe(false)
  })
})

describe('TabelaComparacao', () => {
  it('é uma <table> de verdade, com legenda, cabeçalhos de coluna e de linha, num painel de oliva', () => {
    const { container } = renderizarRota('/sistema')
    const tabela = screen.getByRole('table')
    expect(tabela.closest('[data-painel="oliva"]')).not.toBeNull()
    expect(tabela.querySelector('caption')!.textContent).toMatch(/caderno/)
    expect(within(tabela).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'O que você precisa',
      'AppMaternidade',
      'Caderno e mensagens',
    ])
    const linhas = within(tabela).getAllByRole('rowheader')
    expect(linhas.length).toBeGreaterThanOrEqual(4)
    expect(linhas.length).toBeLessThanOrEqual(5)
    expect(container.querySelectorAll('table th[scope="row"]')).toHaveLength(linhas.length)
  })

  it('o visto e o traço são ícones escondidos com "Sim" e "Não" para o leitor de tela', () => {
    renderizarRota('/sistema')
    const tabela = screen.getByRole('table')
    for (const celula of tabela.querySelectorAll('td')) {
      expect(celula.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
      const texto = celula.querySelector('.sr-only')!.textContent
      expect(['Sim', 'Não']).toContain(texto)
    }
    // A linha honesta: o caderno também não tem metas.
    const ultima = within(tabela).getByRole('rowheader', { name: 'Sem metas nem comparações' }).closest('tr')!
    expect([...ultima.querySelectorAll('.sr-only')].map((s) => s.textContent)).toEqual(['Sim', 'Sim'])
  })
})

describe('Depoimento', () => {
  it('uma linha só diz que os relatos são ilustrativos, acima dos três cartões', () => {
    const { container } = renderizarRota('/sistema')
    const aviso = screen.getByText('Relatos ilustrativos')
    expect(container.querySelectorAll('[data-relatos-ilustrativos]')).toHaveLength(1)
    const secao = aviso.closest('[data-painel="areia"]')!
    const cartoes = secao.querySelectorAll('figure.cm-depoimento')
    expect(cartoes).toHaveLength(3)
    expect(aviso.compareDocumentPosition(cartoes[0]) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    for (const cartao of cartoes) {
      expect(cartao.querySelector('blockquote')).not.toBeNull()
      expect(cartao.querySelector('.cm-depoimento-nome')!.textContent).not.toBe('')
    }
  })
})

describe('Acordeao', () => {
  it('cada pergunta é um botão num título, com aria-expanded e aria-controls, que abre e fecha a resposta', () => {
    const { container } = renderizarRota('/sistema')
    const acordeao = container.querySelector<HTMLElement>('[data-acordeao]')!
    const botoes = within(acordeao).getAllByRole('button')
    expect(botoes.map((b) => b.textContent)).toEqual(PERGUNTAS.map((p) => p.pergunta))
    for (const botao of botoes) {
      expect(botao.parentElement!.tagName).toBe('H3')
      const resposta = document.getElementById(botao.getAttribute('aria-controls')!)!
      expect(botao.getAttribute('aria-expanded')).toBe('false')
      expect(resposta.hidden).toBe(true)
      botao.focus()
      expect(document.activeElement).toBe(botao)
      fireEvent.click(botao)
      expect(botao.getAttribute('aria-expanded')).toBe('true')
      expect(resposta.hidden).toBe(false)
      expect(resposta.getAttribute('role')).toBe('region')
      fireEvent.click(botao)
      expect(resposta.hidden).toBe(true)
    }
  })
})

describe('movimento reduzido na /sistema', () => {
  it('sem cortina, com a cena da abertura já no estado final e a mídia em escala 1', () => {
    reduzirMovimento()
    const { container } = renderizarRota('/sistema')
    expect(container.querySelector('[data-cortina]')).toBeNull()
    expect(container.querySelector('[data-entrada-cena]')!.getAttribute('data-entrada-cena')).toBe('final')
    for (const midia of container.querySelectorAll<HTMLElement>('[data-revela]')) {
      expect(['', 'none'], midia.getAttribute('style') ?? '').toContain(midia.style.transform)
    }
  })
})
