import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FotoCena } from '../inicio/FotoCena.tsx'
import { CenaEstudio } from './CenaEstudio.tsx'

// IMG-B: só a cena da primeira dobra carrega na hora e com prioridade alta; a foto da Início é lazy
// por padrão.

const BASE = '/cenas/teste/cena'
const LARGURA = 768
const ALTURA = 512
const ALT = 'As telas do AppMaternidade, nos aparelhos.'

function imagemDe(no: React.ReactElement, seletor: string) {
  const { container } = render(no)
  return container.querySelector<HTMLImageElement>(seletor)!
}

describe('FotoCena', () => {
  it('sem `carregamento` é lazy, com a caixa reservada', () => {
    const imagem = imagemDe(<FotoCena base={BASE} largura={LARGURA} altura={ALTURA} alt={ALT} />, 'img')
    expect(imagem.getAttribute('loading')).toBe('lazy')
    expect(imagem.getAttribute('width')).toBe(String(LARGURA))
    expect(imagem.getAttribute('height')).toBe(String(ALTURA))
    expect(imagem.getAttribute('alt')).toBe(ALT)
    expect(imagem.hasAttribute('fetchpriority')).toBe(false)
  })

  it('com carregamento="eager" é eager e mantém largura e altura', () => {
    const imagem = imagemDe(<FotoCena base={BASE} largura={LARGURA} altura={ALTURA} alt={ALT} carregamento="eager" />, 'img')
    expect(imagem.getAttribute('loading')).toBe('eager')
    expect(imagem.getAttribute('width')).toBe(String(LARGURA))
    expect(imagem.getAttribute('height')).toBe(String(ALTURA))
  })

  it('com carregamento="lazy" explícito é lazy', () => {
    const imagem = imagemDe(<FotoCena base={BASE} largura={LARGURA} altura={ALTURA} alt={ALT} carregamento="lazy" />, 'img')
    expect(imagem.getAttribute('loading')).toBe('lazy')
  })
})

describe.each([
  ['CenaEstudio', CenaEstudio],
])('%s', (_nome, Cena) => {
  it('com prioritaria carrega na hora e com prioridade alta', () => {
    const imagem = imagemDe(<Cena base={BASE} largura={LARGURA} altura={ALTURA} alt={ALT} prioritaria />, 'img[data-cena]')
    expect(imagem.getAttribute('loading')).toBe('eager')
    expect(imagem.getAttribute('fetchpriority')).toBe('high')
    expect(imagem.getAttribute('width')).toBe(String(LARGURA))
    expect(imagem.getAttribute('height')).toBe(String(ALTURA))
  })

  it('sem prioritaria é lazy e não tem fetchpriority', () => {
    const imagem = imagemDe(<Cena base={BASE} largura={LARGURA} altura={ALTURA} alt={ALT} />, 'img[data-cena]')
    expect(imagem.getAttribute('loading')).toBe('lazy')
    expect(imagem.hasAttribute('fetchpriority')).toBe(false)
    expect(imagem.getAttribute('width')).toBe(String(LARGURA))
    expect(imagem.getAttribute('height')).toBe(String(ALTURA))
  })
})
