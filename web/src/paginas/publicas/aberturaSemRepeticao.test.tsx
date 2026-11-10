import { cleanup, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IlustracaoPassagem } from '../../componentes/publicas/IlustracaoPassagem.tsx'
import { MIDIAS } from '../../conteudo/publicas.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// Volta visual 1, D9: nenhuma página abre com a mesma ilustração de outra. A classe é "a primeira mídia do
// `main` de cada página com mídia tem um `data-ilustracao` só dela". A ilustração nova (a passagem de turno,
// dois adultos e um bebê) é a única que entra; o teto de 6 nomes no produto é o de `estilo.test.ts`.

const NOVAS = [
  '/como-funciona',
  '/cuidado-compartilhado',
  '/desenvolvimento',
  '/regras-da-comunidade',
  '/privacidade',
  '/termos',
  '/exclusao-de-conta',
  '/contato',
  '/sobre',
]

async function abrir(caminho: string): Promise<HTMLElement> {
  cleanup()
  const { container } = renderizarRota(caminho)
  await screen.findAllByRole('heading', { level: 1 })
  return container
}

/** O `data-ilustracao` da primeira mídia do `main` (na ordem do documento), ou `null` se a página não tem mídia. */
function primeiraIlustracao(container: HTMLElement): string | null {
  const primeira = container.querySelector('main [data-midia]')
  return primeira?.querySelector('[data-ilustracao]')?.getAttribute('data-ilustracao') ?? null
}

describe('D9: a primeira mídia de cada página é uma ilustração só dela', () => {
  it('entre as páginas com mídia, nenhum data-ilustracao da primeira mídia se repete', async () => {
    const abertura = new Map<string, string>()
    for (const caminho of NOVAS) {
      const ilustracao = primeiraIlustracao(await abrir(caminho))
      if (ilustracao === null) continue
      const repetida = [...abertura].find(([, nome]) => nome === ilustracao)
      expect(repetida, `${caminho} abre com "${ilustracao}", como ${repetida?.[0]}`).toBeUndefined()
      abertura.set(caminho, ilustracao)
    }
    // As cinco páginas com mídia (Como funciona, Cuidado, Desenvolvimento, Regras e Sobre) abrem com uma cada.
    expect([...abertura.keys()].sort()).toEqual(
      ['/como-funciona', '/cuidado-compartilhado', '/desenvolvimento', '/regras-da-comunidade', '/sobre'].sort(),
    )
    expect(new Set(abertura.values()).size).toBe(5)
  }, 30000)

  it('as páginas sem mídia (textos de papel e Contato) continuam sem ilustração', async () => {
    for (const caminho of ['/privacidade', '/termos', '/exclusao-de-conta', '/contato']) {
      expect(primeiraIlustracao(await abrir(caminho)), caminho).toBeNull()
    }
  }, 30000)

  it('a primeira mídia de Desenvolvimento, Como funciona e Sobre não mudou', async () => {
    expect(primeiraIlustracao(await abrir('/desenvolvimento'))).toBe('tapete')
    expect(primeiraIlustracao(await abrir('/como-funciona'))).toBe('mamada')
    expect(primeiraIlustracao(await abrir('/sobre'))).toBe('passeio')
  }, 30000)

  it('Regras abre com uma das ilustrações que sobram (berço ou colo), larga', async () => {
    const container = await abrir('/regras-da-comunidade')
    const moldura = container.querySelector('main [data-midia]')!
    expect(['berco', 'colo']).toContain(moldura.querySelector('[data-ilustracao]')!.getAttribute('data-ilustracao'))
    expect(moldura.getAttribute('data-formato')).toBe('larga')
  })

  it('a abertura de cada página é uma moldura em que a cabeça do bebê (barro) se lê: lavanda, salvo o passeio, em que o bebê está no carrinho lavanda', async () => {
    // A cabeça do bebê é de barro em todas as ilustrações: sobre uma moldura barro ela tem a cor do fundo e só se
    // lê pelo contorno. O passeio (Sobre, em barro, aprovado) leva o bebê dentro de um carrinho lavanda.
    const fundoDaAbertura = new Map<string, string>()
    for (const caminho of NOVAS) {
      const moldura = (await abrir(caminho)).querySelector('main [data-midia]')
      if (!moldura) continue
      const nome = moldura.querySelector('[data-ilustracao]')!.getAttribute('data-ilustracao')!
      fundoDaAbertura.set(caminho, `${nome}/${moldura.getAttribute('data-fundo')}`)
    }
    expect(Object.fromEntries(fundoDaAbertura)).toEqual({
      '/como-funciona': 'mamada/lavanda',
      '/cuidado-compartilhado': 'passagem/lavanda',
      '/desenvolvimento': 'tapete/lavanda',
      '/regras-da-comunidade': 'berco/lavanda',
      '/sobre': 'passeio/barro',
    })
  }, 30000)
})

describe('D9: a ilustração da passagem de turno', () => {
  it('é um svg decorativo com data-ilustracao, aria-hidden, focusable="false", a classe base ilu e a classe da moldura', () => {
    const { container } = render(<IlustracaoPassagem className="vp-ilustracao" />)
    const figura = container.querySelector('svg')!

    expect(figura.getAttribute('data-ilustracao')).toBe('passagem')
    expect(figura.getAttribute('aria-hidden')).toBe('true')
    expect(figura.getAttribute('focusable')).toBe('false')
    expect(figura.getAttribute('class')).toContain('ilu')
    expect(figura.getAttribute('class')).toContain('vp-ilustracao')
    expect(figura.getAttribute('viewBox')).toMatch(/^-?\d+(\.\d+)? -?\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/)
    expect(figura.querySelector('title, desc')).toBeNull()
  })

  it('só usa o que as outras cinco usam: formas de traço, as classes de cor do tema, sem gradiente, filtro, sombra nem raster', () => {
    const { container } = render(<IlustracaoPassagem />)
    const proibidos = ['linearGradient', 'radialGradient', 'filter', 'image', 'foreignObject', 'style', 'use', 'text']
    for (const tag of proibidos) expect(container.querySelector(tag), tag).toBeNull()

    const permitidas = new Set([
      'ilu-papel', 'ilu-tinta', 'ilu-urucum', 'ilu-barro', 'ilu-lavanda', 'ilu-fundo', 'ilu-sem-traco',
      'ilu-membro', 'ilu-membro-dentro', 'ilu-dentro-papel', 'ilu-dentro-tinta', 'ilu-dentro-urucum',
      'ilu-dentro-barro', 'ilu-dentro-lavanda',
    ])
    for (const no of container.querySelectorAll('svg *')) {
      for (const classe of (no.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)) {
        expect(permitidas.has(classe), `classe "${classe}" em <${no.tagName}>`).toBe(true)
      }
      for (const atributo of ['style', 'filter', 'opacity']) expect(no.hasAttribute(atributo), atributo).toBe(false)
      expect(no.getAttribute('fill') ?? '', 'fill literal').not.toMatch(/^(#|rgb|url)/)
    }
    expect(container.querySelector('svg')!.getAttribute('style')).toBeNull()
  })

  it('tem dois adultos e um bebê: duas cabeças de adulto (papel), uma de bebê (barro) e o relógio da passagem', () => {
    const { container } = render(<IlustracaoPassagem />)

    const cabecasDeAdulto = container.querySelectorAll('circle.ilu-papel[r="17"]')
    expect(cabecasDeAdulto).toHaveLength(2)
    expect(container.querySelectorAll('circle.ilu-barro')).toHaveLength(1)
    // Cada adulto tem um tronco (caminho com Q) e os dois têm cabelo de tinta; o bebê é um embrulho em elipse.
    expect(container.querySelectorAll('path.ilu-urucum, path.ilu-barro, path.ilu-lavanda').length).toBeGreaterThanOrEqual(2)
    expect(container.querySelectorAll('ellipse.ilu-papel[rx="32"]')).toHaveLength(1)
  })

  it('o produto continua com no máximo 6 nomes de ilustração nas páginas públicas', async () => {
    const nomes = new Set<string>()
    for (const caminho of NOVAS) {
      for (const figura of (await abrir(caminho)).querySelectorAll('[data-ilustracao]')) {
        nomes.add(figura.getAttribute('data-ilustracao')!)
      }
    }
    nomes.add('berco')
    expect(nomes.size).toBeLessThanOrEqual(6)
    expect(nomes.has('passagem')).toBe(true)
  }, 30000)
})

describe('D9: Cuidado compartilhado abre com a ilustração nova, descrita em MIDIAS', () => {
  it('a primeira mídia é a passagem, larga, em moldura lavanda, e as outras duas continuam par', async () => {
    const container = await abrir('/cuidado-compartilhado')
    const molduras = [...container.querySelectorAll('main [data-midia]')]

    expect(molduras[0].querySelector('[data-ilustracao]')!.getAttribute('data-ilustracao')).toBe('passagem')
    expect(molduras[0].getAttribute('data-formato')).toBe('larga')
    expect(molduras[0].getAttribute('data-fundo')).toBe('lavanda')
    expect(molduras[0].getAttribute('aria-label')).toBe((MIDIAS as Record<string, string>).passagem)
    expect(molduras.slice(1).map((m) => m.getAttribute('data-formato'))).toEqual(['par', 'par'])
  }, 30000)

  it('a descrição da passagem é uma frase "Ilustração: ..." sobre dois adultos e o bebê, sem "foto" nem imagem', () => {
    const descricao = (MIDIAS as Record<string, string>).passagem
    expect(descricao).toMatch(/^Ilustração: /)
    expect(descricao).not.toMatch(/foto|imagem|imagens|picture|rascunho|revisão pendente/i)
    expect(descricao).not.toMatch(/\bLia\b|\bAna\b/)
    expect(descricao).toMatch(/adulto/)
    expect(descricao).toMatch(/bebê/)
    // As seis descrições são distintas.
    expect(new Set(Object.values(MIDIAS)).size).toBe(Object.keys(MIDIAS).length)
    expect(Object.keys(MIDIAS)).toHaveLength(6)
  })
})
