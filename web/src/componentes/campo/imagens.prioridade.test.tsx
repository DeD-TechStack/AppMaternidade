import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IMAGENS_CUIDADO } from '../../conteudo/casa/cuidado.ts'
import { CenaDaPagina } from '../cuidado-casa/CenaDaPagina.tsx'
import { FotoCena } from '../inicio/FotoCena.tsx'
import { JanelaAcesa } from '../nao-encontrada-casa/JanelaAcesa.tsx'
import { CenaEstudio } from './CenaEstudio.tsx'
import { placa } from './imagens.ts'

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

// As placas de cena das cinco páginas (AVIF + WebP do vite-imagetools): a <picture> não mexe nas bandeiras da <img>.
describe('placas de cena: <picture> com AVIF antes do WebP, bandeiras da <img> como sempre', () => {
  const GERADA = {
    sources: { avif: '/a/400.avif 400w, /a/800.avif 800w', webp: '/a/400.webp 400w, /a/800.webp 800w' },
    img: { src: '/a/800.webp', w: 800, h: 600 },
  }

  it('placa() devolve o src de hoje, o srcSet WebP, o srcSet AVIF, os sizes e o tamanho do maior arquivo', () => {
    expect(placa(GERADA, '50vw', 400)).toEqual({
      src: '/a/400.webp',
      srcSet: GERADA.sources.webp,
      avif: GERADA.sources.avif,
      sizes: '50vw',
      largura: 800,
      altura: 600,
    })
    expect(placa(GERADA, '50vw', 400, 599).altura).toBe(599)
  })

  it('placa() recusa um import sem AVIF e uma largura de src que não está no srcset', () => {
    expect(() => placa({ ...GERADA, sources: { webp: GERADA.sources.webp } }, '50vw', 400)).toThrow(/avif/)
    expect(() => placa(GERADA, '50vw', 500)).toThrow(/500w/)
  })

  it('JanelaAcesa (primeira dobra da 404): eager, fetchpriority high, decoding async, com a fonte AVIF logo antes', () => {
    const imagem = imagemDe(<JanelaAcesa alt={ALT} />, 'img')
    expect(imagem.getAttribute('loading')).toBe('eager')
    expect(imagem.getAttribute('fetchpriority')).toBe('high')
    expect(imagem.getAttribute('decoding')).toBe('async')
    expect([imagem.getAttribute('width'), imagem.getAttribute('height')]).toEqual(['542', '421'])
    const fonte = imagem.previousElementSibling!
    expect(fonte.tagName).toBe('SOURCE')
    expect(fonte.getAttribute('type')).toBe('image/avif')
  })

  it('CenaDaPagina: a prioritária é eager com fetchpriority high; a outra é lazy sem fetchpriority; as duas têm AVIF', () => {
    const cena = IMAGENS_CUIDADO.cena2
    const alta = imagemDe(<CenaDaPagina cena={cena} alt={ALT} prioritaria />, 'img')
    expect(alta.getAttribute('loading')).toBe('eager')
    expect(alta.getAttribute('fetchpriority')).toBe('high')
    const baixa = imagemDe(<CenaDaPagina cena={cena} alt={ALT} />, 'img')
    expect(baixa.getAttribute('loading')).toBe('lazy')
    expect(baixa.hasAttribute('fetchpriority')).toBe(false)
    for (const imagem of [alta, baixa]) {
      expect(imagem.parentElement!.querySelectorAll('source[type="image/avif"]')).toHaveLength(2)
    }
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
