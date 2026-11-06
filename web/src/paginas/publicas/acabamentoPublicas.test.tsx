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
    // Rodada 2, defeito 4: o fecho de Como funciona deixa de ser um bloco centrado empilhado.
    ['/como-funciona', 'Veja as telas do protótipo', false],
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

/** A escala dos aparelhos (var(--escala-*)) em cada largura de página, em rem, lida do CSS como texto. */
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

describe('5: campos com aparelho, o parágrafo colado a ele', () => {
  // [página, h2, alinhamento do texto à linha do aparelho em computador]. Rodada 2: o texto do grupo
  // de dois aparelhos (Cuidado compartilhado) fica alinhado à base do grupo.
  const CAMPOS: Array<[string, string, string]> = [
    ['/como-funciona', 'Na troca de turno', 'items-start'],
    ['/como-funciona', 'De madrugada', 'items-start'],
    ['/cuidado-compartilhado', 'Na passagem de turno', 'items-end'],
  ]

  for (const [caminho, h2, alinhamento] of CAMPOS) {
    it(`${caminho} · ${h2}: grupo centrado, parágrafo numa coluna estreita alinhada ao topo do aparelho`, async () => {
      const campo = secaoDe(await abrir(caminho), h2)

      const grupo = campo.firstElementChild as HTMLElement
      expect(grupo.className).toContain('@min-[64rem]/publica:w-fit')
      expect(grupo.className).toContain('mx-auto')
      const [titulo, linha] = [...grupo.children] as HTMLElement[]
      expect(titulo.tagName).toBe('H2')
      expect(linha.className).toContain('@min-[64rem]/publica:flex-row')
      expect(linha.className).toContain(`@min-[64rem]/publica:${alinhamento}`)
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

// ---------------------------------------------------------------------------
// Rodada 2

describe('R2-1: o valor grande da miniatura fica numa linha só, em toda largura de janela', () => {
  // O CartaoEmAndamento e o SessaoInfo não mudam. O valor grande usa clamp(…, vw, …): com a janela larga a
  // fonte chega ao máximo (56 e 72 px) e a tela do aparelho, de tamanho fixo, não a comporta. A solução
  // é do invólucro: o tamanho do valor dentro do .palco não depende da janela, e o zoom do invólucro
  // deixa a largura certa.
  const regra = (seletor: string) => {
    const escapado = seletor.replace(/[.]/g, '\\.')
    return new RegExp(`${escapado}\\s*\\{([^}]*)\\}`).exec(estiloGlobal)?.[1] ?? ''
  }
  const fonteEmPx = (seletor: string) => {
    const achado = /font-size:\s*([\d.]+)rem\s*;/.exec(regra(seletor))
    return achado ? parseFloat(achado[1]) * 16 : undefined
  }

  // Largura útil da tela, em px sem zoom: celular 24 rem menos moldura (2 × (2 px + 0,5 rem)) e
  // respiro lateral da tela (2 × 1 rem) = 20,75 rem; notebook 56 rem menos tampa (2 × 2 px + 2 × 0,625 rem)
  // e margens da tela (2 × 6,5 rem) = 41,5 rem.
  const TELA_EM_PX = { celular: 20.75 * 16, notebook: 41.5 * 16 }
  // Largura do campo (padding lateral de 1 rem de cada lado) e do texto em em: 0,55 em por caractere,
  // medida folgada para o tabular de Instrument Sans (os dígitos têm cerca de 0,6 em, o espaço 0,25 em).
  const RESPIRO_DO_CAMPO = 32
  const EM_POR_CARACTERE = 0.55

  it('dentro do .palco o tamanho do valor é fixo em rem (sem vw, sem clamp) e a linha não quebra', () => {
    for (const seletor of ['.palco .cronometro-mini', '.palco .numero-grande']) {
      const corpo = regra(seletor)
      expect(corpo, seletor).not.toBe('')
      expect(corpo, seletor).not.toMatch(/vw|clamp\(/)
      expect(fonteEmPx(seletor), seletor).toBeDefined()
      expect(corpo, seletor).toMatch(/white-space:\s*nowrap/)
      expect(corpo, seletor).toMatch(/overflow-wrap:\s*normal/)
    }
  })

  it('o valor continua o elemento mais forte da tela e proporcional ao aparelho (pelo menos 40 px, com o zoom do invólucro)', async () => {
    const container = await abrir('/como-funciona')
    for (const aparelho of container.querySelectorAll('[data-aparelho]')) {
      const zoom = parseFloat(/\[zoom:([\d.]+)\]/.exec(aparelho.querySelector('[class*="zoom:"]')!.className)![1])
      const valor = aparelho.querySelector('.cronometro-mini') ? fonteEmPx('.palco .cronometro-mini')! : fonteEmPx('.palco .numero-grande')!
      expect(valor * zoom, aparelho.getAttribute('data-tela')!).toBeGreaterThanOrEqual(48)
      // O texto corrente da miniatura (17 px × zoom) fica bem menor que o valor.
      expect(valor).toBeGreaterThan(2 * 17)
    }
  })

  it('em todos os aparelhos das páginas novas (celulares e notebook), a largura útil comporta o valor', async () => {
    let total = 0
    for (const caminho of ['/como-funciona', '/cuidado-compartilhado']) {
      const container = await abrir(caminho)
      for (const aparelho of container.querySelectorAll('[data-aparelho]')) {
        total++
        const tipo = aparelho.getAttribute('data-aparelho') as 'celular' | 'notebook'
        const invólucro = aparelho.querySelector('[class*="zoom:"]')
        expect(invólucro, `${caminho}: ${tipo}`).not.toBeNull()
        const zoom = parseFloat(/\[zoom:([\d.]+)\]/.exec(invólucro!.className)![1])
        const disponivel = TELA_EM_PX[tipo] / zoom - RESPIRO_DO_CAMPO
        const valor = aparelho.querySelector('[role="timer"]') ?? aparelho.querySelector('.numero-grande')!
        const fonte = valor.classList.contains('cronometro-mini') ? fonteEmPx('.palco .cronometro-mini')! : fonteEmPx('.palco .numero-grande')!
        const necessario = (valor.textContent ?? '').length * EM_POR_CARACTERE * fonte
        expect(necessario, `${caminho}: ${tipo} ${valor.textContent}`).toBeLessThanOrEqual(disponivel)
      }
    }
    expect(total).toBe(4)
  })
})

describe('R2-2: "Na passagem de turno" é um grupo de dois aparelhos', () => {
  const TEXTO =
    'No notebook e no celular, o mesmo cartão do Hoje com a soneca que Bruno começou: cada adulto vai ver a mesma sessão no próprio aparelho. O plano é que quem chega encontre, numa tela só, as notas em destaque deixadas por quem estava antes e tudo o que aconteceu desde que saiu.'

  it('um notebook e, na frente dele, um celular, os dois tela="hoje" com o CartaoEmAndamento, no mesmo grupo', async () => {
    const campo = secaoDe(await abrir('/cuidado-compartilhado'), 'Na passagem de turno')

    const aparelhos = [...campo.querySelectorAll<HTMLElement>('[data-aparelho]')]
    expect(aparelhos.map((a) => a.getAttribute('data-aparelho'))).toEqual(['notebook', 'celular'])
    for (const aparelho of aparelhos) {
      expect(aparelho.getAttribute('data-tela')).toBe('hoje')
      expect(aparelho.hasAttribute('inert')).toBe(true)
      expect(aparelho.getAttribute('aria-hidden')).toBe('true')
      expect(aparelho.querySelectorAll('.campo-andamento')).toHaveLength(1)
      expect(aparelho.querySelector('.campo-sessao')).toBeNull()
    }
    // O celular vem depois no DOM (fica na frente) e os dois moram na mesma caixa do grupo.
    const grupo = aparelhos[0].closest('.palco-grupo')!
    expect(grupo).not.toBeNull()
    expect(grupo.contains(aparelhos[1])).toBe(true)
    expect(grupo.querySelectorAll('[data-aparelho]')).toHaveLength(2)
    // O celular se ancora no canto inferior do grupo e é menor que o notebook.
    for (const classe of ['absolute', 'bottom-0', 'right-0', 'origin-bottom-right']) {
      expect(aparelhos[1].classList.contains(classe), classe).toBe(true)
    }
  })

  it('o parágrafo é o texto novo, sem outros parágrafos no campo, depois do grupo', async () => {
    const campo = secaoDe(await abrir('/cuidado-compartilhado'), 'Na passagem de turno')

    const paragrafos = [...campo.querySelectorAll('p')].filter(fora)
    expect(paragrafos.map((p) => p.textContent)).toEqual([TEXTO])
    const ultimoAparelho = [...campo.querySelectorAll('[data-aparelho]')].at(-1)!
    expect(ultimoAparelho.compareDocumentPosition(paragrafos[0]) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })

  it('o celular do grupo é menor que o notebook em toda largura e continua legível em 390 (pelo menos 5 rem de largura)', () => {
    const k = (largura: number) => {
      let valor = Number(/\.palco-grupo\s*\{[^}]*--proporcao-do-celular:\s*([\d.]+)/.exec(estiloGlobal)?.[1])
      for (const [, minimo, corpo] of estiloGlobal.matchAll(
        /@container publica \(min-width:\s*([\d.]+)rem\)\s*\{\s*\.palco-grupo\s*\{([^}]*)\}\s*\}/g,
      )) {
        const novo = /--proporcao-do-celular:\s*([\d.]+)/.exec(corpo)
        if (largura >= parseFloat(minimo) && novo) valor = parseFloat(novo[1])
      }
      return valor
    }
    for (let largura = 6; largura <= 140; largura += 0.25) {
      const proporcao = k(largura)
      expect(proporcao, `proporção em ${largura} rem`).toBeGreaterThan(0)
      expect(proporcao, `proporção em ${largura} rem`).toBeLessThan(1)
    }
    const { notebook } = escalaEm(22.4)
    expect(24 * notebook * k(22.4)).toBeGreaterThanOrEqual(5)
    // O grupo inteiro (a caixa do notebook) cabe na largura em toda página, como o notebook sozinho.
    for (let largura = 6; largura <= 140; largura += 0.25) {
      const sobra = largura < 46 ? largura - 3 : largura < 64 ? largura - 6 : largura - 6 - 2.5 - 22
      expect(61 * escalaEm(largura).notebook, `grupo em ${largura} rem`).toBeLessThanOrEqual(sobra + 1e-9)
    }
  })
})

// ---------------------------------------------------------------------------
// Rodada 3 (capturas de 390 px)

describe('R3-1: o selo é parte da frase e fica em linha, com o ponto colado', () => {
  const PAGINAS = ['/', '/rota-inexistente', ...NOVAS]
  const regra = (seletor: string) => new RegExp(`${seletor.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(estiloGlobal)?.[1] ?? ''

  it('em toda página, uma .etiqueta dentro de um parágrafo é .etiqueta-em-linha; a lista de pilares do Início não muda', async () => {
    let selos = 0
    for (const caminho of PAGINAS) {
      const container = await abrir(caminho)
      for (const etiqueta of container.querySelectorAll('.etiqueta')) {
        if (etiqueta.closest('p') === null) {
          // Pilares do Início: itens de lista, blocos que quebram como sempre.
          expect(etiqueta.classList.contains('etiqueta-em-linha'), caminho).toBe(false)
          continue
        }
        selos++
        expect(etiqueta.classList.contains('etiqueta-em-linha'), `${caminho}: ${etiqueta.textContent}`).toBe(true)
        // O ponto vem logo depois, no mesmo parágrafo, sem espaço entre o selo e ele.
        const depois = etiqueta.nextSibling
        expect(depois?.nodeType, caminho).toBe(Node.TEXT_NODE)
        expect(depois!.textContent!.startsWith('.'), caminho).toBe(true)
      }
    }
    expect(selos).toBeGreaterThanOrEqual(1)
  })

  it('.etiqueta-em-linha é display: inline, repete o fundo e o respiro em cada linha e não aumenta a entrelinha', () => {
    const corpo = regra('.etiqueta-em-linha')

    expect(corpo).toMatch(/display:\s*inline\s*;/)
    expect(corpo).toMatch(/box-decoration-break:\s*clone/)
    expect(corpo).toMatch(/-webkit-box-decoration-break:\s*clone/)
    // O respiro vertical do selo não passa da entrelinha (1,55 × 17 px = 26 px; o selo tem 18 px de linha).
    const vertical = /padding-block:\s*([\d.]+)rem/.exec(corpo)
    expect(vertical).not.toBeNull()
    expect(parseFloat(vertical![1]) * 16 * 2 + 14 * 1.3).toBeLessThanOrEqual(26)
  })
})

// Revisão, achado 3: a regra base de .etiqueta (hyphens: auto, overflow-wrap: anywhere) parte palavras
// do selo em 390 px ("REVI-SÃO"). No selo em linha a quebra é só entre palavras.
describe('Revisão 3: o selo em linha não parte palavras', () => {
  // Sem os comentários da regra: eles explicam o que a base faz e citam as declarações.
  const corpo = (new RegExp('\\.etiqueta-em-linha\\s*\\{([^}]*)\\}').exec(estiloGlobal)?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '')

  it('hyphens manual (ou none), overflow-wrap que não é anywhere, sem nowrap nem overflow hidden', () => {
    expect(corpo).not.toBe('')
    expect(corpo).toMatch(/(^|[;\s])hyphens:\s*(manual|none)\s*;/)
    const quebra = /overflow-wrap:\s*([a-z-]+)/.exec(corpo)
    expect(quebra, 'declara overflow-wrap').not.toBeNull()
    expect(quebra![1]).not.toBe('anywhere')
    expect(quebra![1]).toBe('break-word')
    expect(corpo).not.toMatch(/white-space:\s*nowrap/)
    expect(corpo).not.toMatch(/overflow\s*:\s*hidden|overflow-x\s*:\s*hidden|text-overflow/)
    // Nem fonte menor, nem hifenização automática por outra propriedade.
    expect(corpo).not.toMatch(/font-size|hyphens:\s*auto|word-break:\s*break-all/)
  })

  it('a regra vem depois da base .etiqueta (mesma camada), para valer sobre ela', () => {
    expect(estiloGlobal.indexOf('.etiqueta-em-linha {')).toBeGreaterThan(estiloGlobal.indexOf('.etiqueta {'))
  })

  it('o texto do selo continua o TF-14, em linha, com o ponto colado', async () => {
    const container = await abrir('/desenvolvimento')

    const selo = secaoDe(container, 'De onde vem o conteúdo').querySelector('p .etiqueta')!
    expect(selo.textContent).toBe('Rascunho em revisão — não substitui orientação profissional')
    expect(selo.classList.contains('etiqueta-em-linha')).toBe(true)
    expect(selo.nextSibling!.textContent!.startsWith('. Quem vai fazer essa revisão')).toBe(true)
  })
})

// Revisão, achado 4: os números de emergência, em destaque ao lado do nome do canal.
describe('Revisão 4: números de emergência em destaque (só em Regras)', () => {
  const NUMEROS = ['188', '192', '180', '100']
  const TEXTO_DA_TABELA_EM_REM = 1.0625

  it('Regras: cada número tem a marca de destaque, negrito, tamanho de pelo menos 1,5 vez o do texto e números tabulares', async () => {
    const tabela = (await abrir('/regras-da-comunidade')).querySelector('main table')!

    const celulas = [...tabela.querySelectorAll('tbody tr')].map((linha) => linha.querySelector('td')!)
    expect(celulas.map((c) => c.textContent)).toEqual(NUMEROS)
    for (const celula of celulas) {
      expect(celula.getAttribute('data-destaque'), celula.textContent!).toBe('numero')
      expect(celula.className).toMatch(/(^|\s)font-bold(\s|$)/)
      expect(celula.className).toMatch(/(^|\s)tabular-nums(\s|$)/)
      expect(emRem(celula.className, 'text-'), celula.textContent!).toBeGreaterThanOrEqual(1.5 * TEXTO_DA_TABELA_EM_REM)
    }
    // Só a coluna do número: nenhuma outra célula é destaque.
    expect(tabela.querySelectorAll('[data-destaque]')).toHaveLength(NUMEROS.length)
    for (const celula of tabela.querySelectorAll('tbody td:not([data-destaque])')) {
      expect(celula.className).not.toMatch(/font-bold/)
    }
  })

  it('Cuidado compartilhado: a tabela de papéis não muda (nenhuma célula em destaque)', async () => {
    const tabela = (await abrir('/cuidado-compartilhado')).querySelector('main table')!

    expect(tabela.querySelectorAll('[data-destaque]')).toHaveLength(0)
    for (const celula of tabela.querySelectorAll('td')) {
      expect(celula.className).not.toMatch(/font-bold|tabular-nums/)
      expect(celula.firstElementChild!.getAttribute('aria-hidden')).toBe('true')
    }
    for (const linha of tabela.querySelectorAll('tbody tr')) {
      expect(linha.className).toContain('@max-[36rem]/publica:block')
      expect(linha.className).not.toMatch(/grid/)
    }
  })

  it('a semântica não muda nas duas tabelas: legenda, cabeçalhos de coluna e de linha, números como texto, sem tel:', async () => {
    for (const [caminho, legenda, colunas] of [
      ['/regras-da-comunidade', 'Canais oficiais de ajuda', ['Canal', 'Número', 'Quando usar']],
      ['/cuidado-compartilhado', 'Papéis na família', ['Papel', 'Para quem é', 'O que vai poder fazer']],
    ] as const) {
      const container = await abrir(caminho)
      const tabela = container.querySelector('main table')!
      expect(tabela.querySelector('caption')!.textContent).toBe(legenda)
      expect([...tabela.querySelectorAll('th[scope="col"]')].map((th) => th.textContent)).toEqual(colunas)
      expect(tabela.querySelectorAll('tbody th[scope="row"]')).toHaveLength(caminho === '/regras-da-comunidade' ? 4 : 3)
      expect(container.querySelectorAll('a[href^="tel:"]')).toHaveLength(0)
    }
  })

  it('em 390 (empilhado) a linha é uma grade de duas colunas: canal e número em cima, "Quando usar" embaixo na largura toda', async () => {
    const tabela = (await abrir('/regras-da-comunidade')).querySelector('main table')!

    for (const linha of tabela.querySelectorAll('tbody tr')) {
      expect(linha.className).toContain('@max-[36rem]/publica:grid')
      expect(linha.className).toContain('@max-[36rem]/publica:grid-cols-[1fr_auto]')
      // Em 1440 a tabela segue com as três colunas: a grade é só abaixo de 36 rem.
      expect(linha.className).not.toMatch(/(^|\s)grid(\s|$)/)
      const [canal, numero, quando] = [...linha.children] as HTMLElement[]
      expect(canal.getAttribute('scope')).toBe('row')
      expect(numero.getAttribute('data-destaque')).toBe('numero')
      expect(quando.className).toContain('@max-[36rem]/publica:col-span-2')
      // O rótulo visível "Número" some nessa célula (o número já está ao lado do canal); o cabeçalho
      // da coluna continua para o leitor de tela.
      expect(numero.querySelector('[aria-hidden="true"]')).toBeNull()
      expect(numero.textContent).toMatch(/^\d+$/)
      // "Quando usar" continua com o rótulo visível quando empilhado.
      expect(quando.firstElementChild!.getAttribute('aria-hidden')).toBe('true')
      expect(quando.firstElementChild!.textContent).toBe('Quando usar')
    }
    expect([...tabela.querySelectorAll('th[scope="col"]')].map((th) => th.textContent)).toContain('Número')
  })

  it('o número tem o canal ao lado: o canal pode encolher (min-w-0) para o número nunca ser cortado', async () => {
    const tabela = (await abrir('/regras-da-comunidade')).querySelector('main table')!

    for (const linha of tabela.querySelectorAll('tbody tr')) {
      expect(linha.querySelector('th')!.className).toContain('min-w-0')
    }
  })
})

describe('R3-2: rodapé, cada link lido como um item só', () => {
  for (const caminho of ['/', '/sobre', '/rota-inexistente']) {
    it(`${caminho}: espaço vertical entre os itens, entrelinha justa no link, sem texto menor nem rolagem horizontal`, async () => {
      const rodape = (await abrir(caminho)).querySelector('footer')!

      const listas = [...rodape.querySelectorAll('nav ul')]
      expect(listas).toHaveLength(2)
      for (const lista of listas) {
        // Além dos 44 px do alvo: 8 px entre um item e o seguinte.
        expect(lista.className).toMatch(/(^|\s)gap-y-2(\s|$)/)
        expect(lista.className).toContain('flex-col')
        for (const link of lista.querySelectorAll('a')) {
          expect(link.className, link.textContent!).toMatch(/(^|\s)leading-(snug|tight)(\s|$)/)
          expect(link.classList.contains('alvo-toque')).toBe(true)
          // O texto não encolhe (o tamanho é o do corpo) e não é forçado a uma linha só.
          expect(link.className).not.toMatch(/text-(xs|sm|\[)|whitespace-nowrap|truncate/)
        }
      }
      // As colunas podem encolher abaixo do conteúdo (sem rolagem horizontal da página).
      for (const nav of rodape.querySelectorAll('nav')) expect(nav.className).toContain('min-w-0')
    })
  }
})

describe('R3-3: as telas dos celulares de Como funciona são alinhadas do mesmo jeito', () => {
  // Alturas naturais (sem zoom), em rem, somando os paddings e as linhas dos componentes que não
  // mudam: CartaoEmAndamento ≈ 3 (padding) + 1,2 (rótulo) + 2,7 (sessão) + 2,2 (valor de 34 px, com
  // margem) + 1,7 (por ...) + 4 (botões) e SessaoInfo ≈ 3 + 1,2 + 0,5 + 3,5 + 1 + 5,8.
  const ALTURA_NATURAL = { cartao: 15.2, sessao: 15 }
  const ALTURA_UTIL_DA_TELA = 32

  it('as duas telas começam no alto, abaixo da margem da barra de status (o respiro de cima da tela)', async () => {
    const container = await abrir('/como-funciona')

    const celulares = [...container.querySelectorAll<HTMLElement>('[data-aparelho="celular"]')]
    expect(celulares).toHaveLength(2)
    const classes = celulares.map((c) => c.querySelector<HTMLElement>('[class*="zoom:"]')!.parentElement!.className)
    for (const classe of classes) {
      expect(classe).toContain('items-start')
      expect(classe).not.toContain('items-center')
    }
    expect(classes[0]).toBe(classes[1])
    // Sem margem extra acima do componente: a margem de cima é a da própria moldura (2,75 rem de
    // respiro no alto da tela, onde ficam a câmera e a barra de status), que o Aparelho já traz.
    for (const classe of classes) expect(classe).not.toMatch(/(^|\s)(pt|mt|my)-/)
  })

  it('o vazio embaixo é de no máximo cerca de um terço da tela, nos dois celulares', async () => {
    for (const caminho of ['/como-funciona', '/cuidado-compartilhado']) {
      const container = await abrir(caminho)
      for (const celular of container.querySelectorAll('[data-aparelho="celular"]')) {
        const zoom = parseFloat(/\[zoom:([\d.]+)\]/.exec(celular.querySelector('[class*="zoom:"]')!.className)![1])
        const natural = celular.querySelector('.campo-sessao') ? ALTURA_NATURAL.sessao : ALTURA_NATURAL.cartao
        const ocupado = (natural * zoom) / ALTURA_UTIL_DA_TELA
        expect(1 - ocupado, `${caminho}: ${celular.getAttribute('data-tela')} (${(ocupado * 100).toFixed(0)}% ocupado)`).toBeLessThanOrEqual(1 / 3)
        // E não passa da tela.
        expect(ocupado).toBeLessThanOrEqual(0.9)
      }
    }
  })
})

describe('R2-3: Sobre, a frase do protótipo é nota da tabela "O que ele faz"', () => {
  it('fica na coluna das frases, logo abaixo da última linha, menor que elas e na cor do texto', async () => {
    const secao = secaoDe(await abrir('/sobre'), 'O que ele faz')

    const nota = [...secao.querySelectorAll('p')].find((p) => p.textContent === 'Hoje já existe o protótipo das telas Hoje e Sessão, com uma família fictícia.')!
    expect(nota).toBeDefined()
    const linhas = nota.closest('section')!.querySelectorAll('h3')
    expect(linhas).toHaveLength(4)
    // Logo abaixo da última linha da tabela, e não antes de nenhuma.
    const ultimaLinha = linhas[3].parentElement!
    expect(ultimaLinha.compareDocumentPosition(nota) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    const coluna = nota.parentElement!
    const grade = coluna.parentElement!
    expect(grade.previousElementSibling, 'a nota vem logo depois do bloco das linhas').toBe(ultimaLinha.parentElement)
    // Na coluna da direita (a das frases): do 4º ao 12º, com o mesmo recuo de 1,5 rem.
    expect(grade.className).toContain('@min-[46rem]/publica:grid-cols-12')
    expect(coluna.className).toContain('@min-[46rem]/publica:col-start-4')
    expect(coluna.className).toContain('@min-[46rem]/publica:col-span-9')
    expect(coluna.className).toContain('@min-[46rem]/publica:pl-6')
    // Menor que as frases da tabela (17 px) e na cor do texto: sem opacidade nem token novo.
    expect(emRem(nota.className, 'text-')).toBeLessThan(1.0625)
    expect(nota.className).toContain('text-[var(--cor-texto)]')
    expect(nota.className).not.toMatch(/opacity|\/\d+/)
    expect(nota.className).toContain('texto-medida')
  })
})
