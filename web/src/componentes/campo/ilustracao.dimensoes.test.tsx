import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DESCRICAO_ILUSTRACAO, DIMENSAO_ILUSTRACAO, Ilustracao, NOMES_ILUSTRACAO } from './Ilustracao.tsx'

// IMG-B: a caixa da ilustração fica reservada (width/height) e só a da primeira dobra pede prioridade.

function imagemDe(nome: (typeof NOMES_ILUSTRACAO)[number], props: Partial<Parameters<typeof Ilustracao>[0]> = {}) {
  const { container } = render(<Ilustracao nome={nome} {...props} />)
  return container.querySelector<HTMLImageElement>('img')!
}

describe('Ilustracao: caixa reservada', () => {
  it.each(NOMES_ILUSTRACAO)('%s leva width e height numéricos iguais à tabela de dimensões', (nome) => {
    const imagem = imagemDe(nome)
    const { largura, altura } = DIMENSAO_ILUSTRACAO[nome]
    expect(Number(imagem.getAttribute('width'))).toBe(largura)
    expect(Number(imagem.getAttribute('height'))).toBe(altura)
    expect(Number.isInteger(largura) && largura > 0).toBe(true)
    expect(Number.isInteger(altura) && altura > 0).toBe(true)
  })

  it('a tabela cobre os seis desenhos com as medidas dos WebPs em 1×', () => {
    expect(DIMENSAO_ILUSTRACAO).toEqual({
      'avo-carrinho': { largura: 357, altura: 626 },
      'pai-colo': { largura: 199, altura: 623 },
      'tummy-time': { largura: 603, altura: 399 },
      'maos-celular': { largura: 627, altura: 339 },
      'baba-tapete': { largura: 560, altura: 547 },
      'mae-noite': { largura: 552, altura: 599 },
    })
  })
})

describe('Ilustracao: prioridade e carregamento', () => {
  it.each(NOMES_ILUSTRACAO)('%s com prioritaria carrega na hora e com prioridade alta', (nome) => {
    const imagem = imagemDe(nome, { prioritaria: true })
    expect(imagem.getAttribute('loading')).toBe('eager')
    expect(imagem.getAttribute('fetchpriority')).toBe('high')
  })

  it('prioritaria vence carregamento="lazy"', () => {
    const imagem = imagemDe('pai-colo', { prioritaria: true, carregamento: 'lazy' })
    expect(imagem.getAttribute('loading')).toBe('eager')
    expect(imagem.getAttribute('fetchpriority')).toBe('high')
  })

  it.each(NOMES_ILUSTRACAO)('%s sem prioritaria é lazy e não tem fetchpriority', (nome) => {
    const imagem = imagemDe(nome)
    expect(imagem.getAttribute('loading')).toBe('lazy')
    expect(imagem.hasAttribute('fetchpriority')).toBe(false)
  })

  it('carregamento="eager" sem prioritaria continua eager e sem fetchpriority', () => {
    const imagem = imagemDe('tummy-time', { carregamento: 'eager' })
    expect(imagem.getAttribute('loading')).toBe('eager')
    expect(imagem.hasAttribute('fetchpriority')).toBe(false)
  })
})

describe('Ilustracao: o resto da saída não muda', () => {
  it('sem prioritaria, todos os atributos são os de antes mais width e height', () => {
    const imagem = imagemDe('mae-noite', { className: 'extra' })
    expect(imagem.getAttributeNames().sort()).toEqual(
      ['alt', 'class', 'data-ilustracao', 'decoding', 'height', 'loading', 'src', 'srcset', 'width'].sort(),
    )
    expect(imagem.getAttribute('src')).toBe('/ilustracoes/mae-noite@1x.webp')
    expect(imagem.getAttribute('srcset')).toBe('/ilustracoes/mae-noite@1x.webp 1x, /ilustracoes/mae-noite@2x.webp 2x')
    expect(imagem.getAttribute('alt')).toBe(DESCRICAO_ILUSTRACAO['mae-noite'])
    expect(imagem.getAttribute('loading')).toBe('lazy')
    expect(imagem.getAttribute('decoding')).toBe('async')
    expect(imagem.getAttribute('class')).toBe('cm-ilustracao extra')
    expect(imagem.getAttribute('data-ilustracao')).toBe('mae-noite')
  })

  it('decorativa mantém o alt vazio e alt próprio vale sobre a descrição padrão', () => {
    expect(imagemDe('baba-tapete', { decorativa: true }).getAttribute('alt')).toBe('')
    expect(imagemDe('baba-tapete', { alt: 'Outro texto' }).getAttribute('alt')).toBe('Outro texto')
  })
})
