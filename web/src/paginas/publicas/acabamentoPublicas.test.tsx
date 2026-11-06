import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { pastaSrcDe } from '../../teste/fontes.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// Acabamento visual, rodada 1 (MAT-36). O jsdom não mede layout: o que se confere é a regra no código
// (classes, estrutura do DOM e o texto do CSS). A aparência fica para a captura.

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

// Lido do disco (importar CSS no Vitest não devolve o texto). A pasta é a deste teste: web/src/paginas/publicas.
const estiloGlobal = readFileSync(pastaSrcDe(import.meta.url) + '../../index.css', 'utf8')

async function abrir(caminho: string): Promise<HTMLElement> {
  const { container } = renderizarRota(caminho)
  await screen.findAllByRole('heading', { level: 1 })
  return container
}

const fora = (elemento: Element) => elemento.closest('[data-aparelho]') === null

function secaoDe(container: HTMLElement, titulo: string): HTMLElement {
  const h2 = [...container.querySelectorAll('h2')].filter(fora).find((candidato) => candidato.textContent === titulo)
  if (!h2) throw new Error(`h2 não encontrado: ${titulo}`)
  return h2.closest('section')!
}

const camposDe = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('main > section[data-campo]')]

/** O número em rem de uma classe `<prefixo>[Nrem]`, ou undefined. */
function emRem(classes: string, prefixo: string): number | undefined {
  const achado = new RegExp(`(?:^|\\s)${prefixo.replace(/[[\]/@]/g, '\\$&')}\\[(\\d+(?:\\.\\d+)?)rem\\](?:\\s|$)`).exec(classes)
  return achado ? parseFloat(achado[1]) : undefined
}

describe('1: todo campo de cor tem altura mínima no desktop, com o conteúdo centrado na vertical', () => {
  // O DESIGN.md pede campos entre 1/2 e 1 vez a altura da janela no desktop (900 px = 56,25 rem).
  it('a partir de 64 rem, min-h entre 28 e 56 rem, em coluna flex centrada; em 390 a altura é a do conteúdo', async () => {
    let total = 0
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      for (const campo of camposDe(container)) {
        total++
        const classes = campo.className
        const minimo = emRem(classes, '@min-[64rem]/publica:min-h-')
        expect(minimo, `${caminho}: ${campo.querySelector('h2')?.textContent}`).toBeDefined()
        expect(minimo!).toBeGreaterThanOrEqual(28)
        expect(minimo!).toBeLessThanOrEqual(56.25)
        expect(classes).toContain('@min-[64rem]/publica:flex-col')
        expect(classes).toContain('@min-[64rem]/publica:justify-center')
        // Sem altura mínima fora do desktop.
        expect(classes).not.toMatch(/(^|\s)min-h-/)
      }
    }
    expect(total).toBeGreaterThanOrEqual(10)
  })

  it('a ilustração de cada campo é pequena em relação a ele: largura em rem e no máximo 18 rem de altura', async () => {
    let total = 0
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      for (const campo of camposDe(container)) {
        for (const figura of campo.querySelectorAll('[data-ilustracao]')) {
          total++
          const classes = figura.getAttribute('class')!
          const largura = Math.min(emRem(classes, 'max-w-') ?? Infinity, emRem(classes, 'w-') ?? Infinity)
          expect(largura, `${caminho}: ${figura.getAttribute('data-ilustracao')}`).toBeLessThan(Infinity)
          const [, , larguraDoDesenho, alturaDoDesenho] = figura.getAttribute('viewBox')!.split(/\s+/).map(Number)
          const altura = (largura * alturaDoDesenho) / larguraDoDesenho
          expect(altura, `${caminho}: ${figura.getAttribute('data-ilustracao')} (${altura.toFixed(1)} rem)`).toBeLessThanOrEqual(18)
        }
      }
    }
    expect(total).toBeGreaterThanOrEqual(6)
  })
})

describe('2: o ritmo do Sobre alterna papel e campo', () => {
  it('a sequência é papel, campo, papel, campo, papel', async () => {
    const container = await abrir('/sobre')

    const tipos = [...container.querySelector('main')!.children].map((secao) => (secao.hasAttribute('data-campo') ? 'campo' : 'papel'))
    expect(tipos).toEqual(['papel', 'campo', 'papel', 'campo', 'papel'])
  })

  it('"Para quem é" é um campo field-2 com a ilustração passeio, no mesmo texto de antes', async () => {
    const container = await abrir('/sobre')

    const campo = secaoDe(container, 'Para quem é')
    expect(campo.getAttribute('data-campo')).toBe('field-2')
    expect(campo.querySelector('[data-ilustracao="passeio"]')).not.toBeNull()
    expect([...campo.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
      'O plano é começar no Brasil, em português, para mães, pais e outros cuidadores adultos de bebês nos primeiros meses. O público ainda está em avaliação, e a idade mínima também.',
    ])
  })
})

describe('3: campos com ilustração em duas colunas assimétricas', () => {
  // [página, h2, a figura fica à esquerda?]
  const CAMPOS: Array<[string, string, boolean]> = [
    ['/cuidado-compartilhado', 'Cada pessoa com a própria conta', false],
    ['/desenvolvimento', 'Tummy time na rotina', true],
    ['/desenvolvimento', 'Quando procurar um profissional', false],
    ['/sobre', 'Para quem é', false],
    ['/sobre', 'O que ele não faz', true],
  ]

  for (const [caminho, h2, aEsquerda] of CAMPOS) {
    it(`${caminho} · ${h2}: texto de um lado e figura do outro, alinhado à esquerda, empilhado em página estreita`, async () => {
      const campo = secaoDe(await abrir(caminho), h2)

      expect(campo.className).not.toContain('text-center')
      const grade = campo.firstElementChild as HTMLElement
      expect(grade.classList.contains('grid')).toBe(true)
      expect(grade.classList.contains('grid-cols-1')).toBe(true)
      expect(grade.classList.contains('@min-[46rem]/publica:grid-cols-12')).toBe(true)
      expect(grade.children).toHaveLength(2)
      const [texto, figura] = [...grade.children] as HTMLElement[]
      // O texto vem primeiro no DOM (em 390 fica em cima); o h2 abre a coluna dele.
      expect(texto.firstElementChild!.tagName).toBe('H2')
      expect(texto.querySelector('[data-ilustracao]')).toBeNull()
      expect(figura.querySelector('[data-ilustracao]')).not.toBeNull()
      expect(figura.querySelector('h2')).toBeNull()
      for (const coluna of [texto, figura]) expect(coluna.className).toContain('@min-[46rem]/publica:col-span-6')
      expect(figura.className.includes('@min-[46rem]/publica:col-start-1')).toBe(aEsquerda)
      expect(texto.className.includes('@min-[46rem]/publica:col-start-7')).toBe(aEsquerda)
      expect(texto.className).not.toContain('text-center')
    })
  }

  it('os dois campos do Desenvolvimento usam o mesmo tamanho de h2, o dos outros campos com figura', async () => {
    const container = await abrir('/desenvolvimento')

    const tamanho = (titulo: string) => /\[font-size:[^\]]+\]/.exec(secaoDe(container, titulo).querySelector('h2')!.className)?.[0]
    expect(tamanho('Quando procurar um profissional')).toBeDefined()
    expect(tamanho('Quando procurar um profissional')).toBe(tamanho('Tummy time na rotina'))
    const cuidado = await abrir('/cuidado-compartilhado')
    expect(/\[font-size:[^\]]+\]/.exec(secaoDe(cuidado, 'Cada pessoa com a própria conta').querySelector('h2')!.className)?.[0]).toBe(
      tamanho('Tummy time na rotina'),
    )
  })
})

describe('5: campos com aparelho, o parágrafo colado a ele', () => {
  const CAMPOS: Array<[string, string]> = [
    ['/como-funciona', 'Na troca de turno'],
    ['/como-funciona', 'De madrugada'],
    ['/cuidado-compartilhado', 'Na passagem de turno'],
  ]

  for (const [caminho, h2] of CAMPOS) {
    it(`${caminho} · ${h2}: grupo centrado, parágrafo numa coluna estreita alinhada ao topo do aparelho`, async () => {
      const campo = secaoDe(await abrir(caminho), h2)

      const grupo = campo.firstElementChild as HTMLElement
      expect(grupo.className).toContain('@min-[64rem]/publica:w-fit')
      expect(grupo.className).toContain('mx-auto')
      const [titulo, linha] = [...grupo.children] as HTMLElement[]
      expect(titulo.tagName).toBe('H2')
      expect(linha.className).toContain('@min-[64rem]/publica:flex-row')
      expect(linha.className).toContain('@min-[64rem]/publica:items-start')
      const [aparelho, texto] = [...linha.children] as HTMLElement[]
      expect(aparelho.querySelector('[data-aparelho]')).not.toBeNull()
      expect(texto.querySelector('p')).not.toBeNull()
      const largura = emRem(texto.className, '@min-[64rem]/publica:w-')
      expect(largura, 'coluna do texto com largura fixa em rem').toBeDefined()
      expect(largura!).toBeLessThanOrEqual(26)
      expect(texto.className).toContain('@min-[64rem]/publica:flex-none')
    })
  }

  // O aparelho cresce no desktop e, em toda largura da página, nunca passa dela. O CSS é lido como texto:
  // a escala de cada degrau do contêiner "publica" e o que cabe a cada lado.
  function escalaEm(largura: number): { celular: number; notebook: number } {
    const base = /\.palco\s*\{([^}]*)\}/.exec(estiloGlobal)![1]
    const valores = { celular: 0, notebook: 0 }
    const ler = (corpo: string) => {
      const celular = /--escala-celular:\s*([\d.]+)/.exec(corpo)
      const notebook = /--escala-notebook:\s*([\d.]+)/.exec(corpo)
      if (celular) valores.celular = parseFloat(celular[1])
      if (notebook) valores.notebook = parseFloat(notebook[1])
    }
    ler(base)
    const degraus = [...estiloGlobal.matchAll(/@container publica \(min-width:\s*([\d.]+)rem\)\s*\{\s*\.palco\s*\{([^}]*)\}\s*\}/g)]
    for (const [, minimo, corpo] of degraus) if (largura >= parseFloat(minimo)) ler(corpo)
    return valores
  }

  it('em 1440 (página de 86,4 rem) o celular passa de 1 e o notebook de 0,8', () => {
    const { celular, notebook } = escalaEm(86.4)

    expect(celular).toBeGreaterThanOrEqual(1)
    expect(notebook).toBeGreaterThanOrEqual(0.8)
  })

  it('de 6 a 140 rem, o aparelho escalado cabe na largura do campo (com o texto ao lado, a partir de 64 rem)', () => {
    // Campo: 3 rem de margem lateral até 46 rem e 6 rem depois. Lado a lado (64 rem ou mais): 2,5 rem de
    // vão e a coluna do texto de 22 rem.
    for (let largura = 6; largura <= 140; largura += 0.25) {
      const { celular, notebook } = escalaEm(largura)
      const sobra = largura < 46 ? largura - 3 : largura < 64 ? largura - 6 : largura - 6 - 2.5 - 22
      expect(24 * celular, `celular em ${largura} rem`).toBeLessThanOrEqual(sobra + 1e-9)
      expect(61 * notebook, `notebook em ${largura} rem`).toBeLessThanOrEqual(sobra + 1e-9)
    }
  })
})
