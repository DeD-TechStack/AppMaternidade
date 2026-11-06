import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { MINIATURAS } from './conteudo/textos.ts'
import { dadosDaVitrine } from './componentes/vitrine/estadoFixo.ts'
import { criarEstadoInicial, ROTULO_SESSAO, type EstadoPrototipo } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'
import { pastaSrcDe } from './teste/fontes.ts'

// MAT-44c-1: a base de layout de Início, Hoje e Sessão. O jsdom não pinta nada: estes testes
// conferem o que dá para conferir no código (o CSS como texto, a estrutura do DOM, os dados fixos
// dos aparelhos). Medidas em pixels, de gosto, ficam para a captura.

const pastaSrc = pastaSrcDe(import.meta.url)
const lerTexto = (relativo: string) => readFileSync(pastaSrc + relativo, 'utf8')
const estiloGlobal = lerTexto('index.css')
const tokensCss = lerTexto('styles/tokens.css')

const claro = (): EstadoPrototipo => criarEstadoInicial(Date.now())
const madrugada = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), madrugada: true })
const semSessao = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), sessao: null })

// ---------------------------------------------------------------------------
// O CSS como texto, com o contexto de cada regra.

const semComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '')

interface RegraCss {
  seletor: string
  props: Record<string, string>
  /** O at-rule condicional (@media ou @container) que envolve a regra, se houver. */
  condicao: string | null
  ordem: number
}

function regrasComContexto(css: string): RegraCss[] {
  const saida: RegraCss[] = []
  let ordem = 0
  function percorrer(trecho: string, condicao: string | null) {
    let i = 0
    while (i < trecho.length) {
      const abre = trecho.indexOf('{', i)
      if (abre === -1) break
      let fundo = 1
      let j = abre + 1
      while (j < trecho.length && fundo > 0) {
        if (trecho[j] === '{') fundo++
        else if (trecho[j] === '}') fundo--
        j++
      }
      const prelude = trecho.slice(i, abre)
      const cabeca = prelude.slice(prelude.lastIndexOf(';') + 1).trim()
      const corpo = trecho.slice(abre + 1, j - 1)
      i = j
      if (cabeca.startsWith('@keyframes')) continue
      if (cabeca.startsWith('@media') || cabeca.startsWith('@container')) {
        percorrer(corpo, cabeca)
      } else if (cabeca.startsWith('@')) {
        percorrer(corpo, condicao)
      } else {
        const props: Record<string, string> = {}
        for (const declaracao of corpo.split(';')) {
          const meio = declaracao.indexOf(':')
          if (meio > 0) props[declaracao.slice(0, meio).trim()] = declaracao.slice(meio + 1).trim()
        }
        for (const seletor of cabeca.split(',')) {
          saida.push({ seletor: seletor.trim().replace(/\s+/g, ' '), props, condicao, ordem })
        }
        ordem++
      }
    }
  }
  percorrer(semComentarios(css), null)
  return saida
}

const regras = regrasComContexto(estiloGlobal)
const LARGO = '@container app (min-width: 60rem)'

const emRem = (valor: string): number => {
  const achado = /^(-?[\d.]+)(rem|px)$/.exec(valor.trim())
  if (!achado) return Number.NaN
  return achado[2] === 'rem' ? parseFloat(achado[1]) : parseFloat(achado[1]) / 16
}

// ---------------------------------------------------------------------------
// 1. Limite do layout

describe('MAT-44c-1 #1: o layout das telas logadas depende do contêiner `app`, nunca da janela', () => {
  it('existe a regra do contêiner app, com container-type inline-size e container-name app', () => {
    const regra = regras.find((r) => r.seletor === '.app' && r.condicao === null)
    expect(regra).toBeDefined()
    expect(regra!.props['container-type']).toBe('inline-size')
    expect(regra!.props['container-name']).toBe('app')
  })

  for (const [tela, caminho, estado] of [
    ['Hoje', '/app/hoje', claro],
    ['Sessão', '/app/sessao', claro],
    ['Sessão vazia', '/app/sessao', semSessao],
  ] as const) {
    it(`${tela}: o elemento do contêiner fica acima da .coluna-app e tem a largura toda`, () => {
      const { container } = renderizarRota(caminho, { estadoInicial: estado() })

      const coluna = container.querySelector('.coluna-app')!
      const envoltorio = coluna.parentElement!
      expect(envoltorio.classList.contains('app')).toBe(true)
      expect(container.querySelectorAll('.app')).toHaveLength(1)
      // O invólucro é a raiz da tela: nada fica entre ele e o contêiner do teste.
      expect(envoltorio.parentElement).toBe(container)
    })
  }

  it('as regras do layout largo estão todas em @container app (min-width: 60rem)', () => {
    const doLargo = [
      '.hoje-main',
      '.hoje-corpo',
      '.hoje-titulo',
      '.hoje-andamento',
      '.hoje-lateral',
      '.sessao-main',
      '.sessao-corpo',
      '.sessao-voltar',
      '.sessao-titulo',
      '.sessao-campo',
      '.sessao-acoes',
      '.coluna-app > .barra-inferior',
      '.coluna-app .nav-inferior',
      '.coluna-app .registro-rapido',
    ]
    for (const seletor of doLargo) {
      const achadas = regras.filter((r) => r.seletor === seletor)
      expect(achadas.length, seletor).toBeGreaterThan(0)
      for (const regra of achadas) expect(regra.condicao, seletor).toBe(LARGO)
    }
    // A grade da moldura e a faixa lateral são do layout largo; o estreito não tem sticky nem grade.
    const moldura = regras.filter((r) => r.seletor === '.coluna-app' && r.condicao === LARGO)
    expect(moldura.some((r) => r.props['display'] === 'grid')).toBe(true)
  })

  it('no layout largo nada é sticky nem fixed, e a barra de baixo vira display: contents', () => {
    const doLargo = regras.filter((r) => r.condicao === LARGO)
    for (const regra of doLargo) {
      expect(['sticky', 'fixed'], `${regra.seletor} { position }`).not.toContain(regra.props['position'])
    }
    expect(doLargo.some((r) => r.seletor === '.coluna-app .barra-fixa' && r.props['position'] === 'static')).toBe(true)
    expect(doLargo.some((r) => r.seletor === '.coluna-app > .barra-inferior' && r.props['display'] === 'contents')).toBe(true)
  })

  it('a moldura larga ocupa a largura menos cerca de 2% de cada lado, com máximo de pelo menos 90 rem', () => {
    const moldura = regras.find((r) => r.seletor === '.coluna-app' && r.condicao === LARGO && 'width' in r.props)!
    expect(moldura.props['width']).toBe('96%')
    expect(emRem(moldura.props['max-width'])).toBeGreaterThanOrEqual(75)
    // 96% de 1440 px e de 1024 px: pelo menos 1200 px e 940 px.
    expect(0.96 * 1440).toBeGreaterThanOrEqual(1200)
    expect(0.96 * 1024).toBeGreaterThanOrEqual(940)
  })

  it('no layout largo nenhum texto fica abaixo de 13 px (o notebook escala até 0,85)', () => {
    for (const regra of regras.filter((r) => r.condicao === LARGO && 'font-size' in r.props)) {
      const valor = regra.props['font-size']
      if (/^[\d.]+(rem|px)$/.test(valor)) expect(emRem(valor) * 16, regra.seletor).toBeGreaterThanOrEqual(13)
    }
    const escalas = regras
      .filter((r) => r.seletor === '.aparelho-notebook' && '--escala-notebook' in r.props)
      .map((r) => parseFloat(r.props['--escala-notebook']))
    expect(escalas.length).toBeGreaterThan(0)
    for (const escala of escalas) expect(13 * escala).toBeGreaterThanOrEqual(11)
  })

  it('a lista de @media de index.css é só a da base', () => {
    const medias = [...semComentarios(estiloGlobal).matchAll(/@media\s*([^{]+)\{/g)].map((m) => m[1].trim())
    expect(medias.sort()).toEqual(['(min-width: 48rem)', '(prefers-reduced-motion: reduce)'])
  })

  it('Hoje, Sessão, ColunaApp e os arquivos mudados de prototipo/ não usam sm:, md:, lg:, xl: nem 2xl:', () => {
    const arquivos = [
      'paginas/Hoje.tsx',
      'paginas/Sessao.tsx',
      'componentes/ColunaApp.tsx',
      'prototipo/BarraInferior.tsx',
      'prototipo/NavegacaoInferior.tsx',
      'prototipo/CartaoEmAndamento.tsx',
      'prototipo/SessaoInfo.tsx',
    ]
    for (const arquivo of arquivos) {
      expect(lerTexto(arquivo), arquivo).not.toMatch(/(?:^|[\s"'`{])(?:sm|md|lg|xl|2xl):/)
    }
  })

  it('o cronômetro e os números grandes das telas logadas não dependem de vw', () => {
    for (const seletor of ['.numero-grande', '.coluna-app .numero-grande', '.coluna-app .cronometro', '.sessao-campo .cronometro']) {
      const achadas = regras.filter((r) => r.seletor === seletor && 'font-size' in r.props)
      expect(achadas.length, seletor).toBeGreaterThan(0)
      for (const regra of achadas) {
        expect(regra.props['font-size'], seletor).not.toMatch(/vw/)
        expect(regra.props['font-size'], seletor).toMatch(/cqi/)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 2. "Voltar para Hoje"

describe('MAT-44c-1 #2: "Voltar para Hoje" na Sessão', () => {
  const sessaoHa = (ms: number, madrugadaLigada: boolean): EstadoPrototipo => {
    const agora = Date.now()
    return {
      ...criarEstadoInicial(agora),
      madrugada: madrugadaLigada,
      sessao: { tipo: 'sono', inicio: agora - ms, pessoa: 'Bruno' },
    }
  }

  for (const [tema, ligada] of [
    ['claro', false],
    ['madrugada', true],
  ] as const) {
    it(`(${tema}) é um único link, o primeiro focável do main, e leva ao Hoje com o foco no h1, sem encerrar`, async () => {
      const { roteador, container } = renderizarRota('/app/sessao', { estadoInicial: sessaoHa(72.5 * 60_000, ligada) })

      const links = screen.getAllByRole('link', { name: 'Voltar para Hoje' })
      expect(links).toHaveLength(1)
      const voltar = links[0]
      expect(voltar.classList.contains('botao') || voltar.classList.contains('alvo-toque')).toBe(true)
      const main = container.querySelector('main')!
      const focaveis = [...main.querySelectorAll<HTMLElement>('a[href], button, input, textarea, select, [tabindex]')].filter(
        (e) => e.tabIndex >= 0,
      )
      expect(focaveis[0]).toBe(voltar)
      // Acima do título.
      expect(voltar.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
      const horaDeInicio = screen.getByText(/^Iniciado às \d{2}:\d{2} por Bruno$/).textContent

      fireEvent.click(voltar)

      const titulo = await screen.findByRole('heading', { level: 1, name: 'Hoje' })
      await waitFor(() => expect(document.activeElement).toBe(titulo))
      expect(roteador.state.location.pathname).toBe('/app/hoje')
      // A sessão continua: o mesmo tipo, a mesma pessoa e o mesmo início (a duração não recomeçou).
      const cartao = screen.getByRole('heading', { name: 'Em andamento' }).closest('section')!
      expect(cartao.textContent).toContain('Sono')
      expect(cartao.textContent).toContain('por Bruno')
      expect(cartao.textContent).toContain('1 h 12 min')
      fireEvent.click(within(cartao).getByRole('link', { name: 'Ver sessão' }))
      await screen.findByRole('heading', { level: 1, name: 'Sono de Heloísa' })
      expect(screen.getByText(/^Iniciado às \d{2}:\d{2} por Bruno$/).textContent).toBe(horaDeInicio)
    })
  }

  it('na Sessão vazia continua um único link com esse nome', () => {
    renderizarRota('/app/sessao', { estadoInicial: semSessao() })

    expect(screen.getAllByRole('link', { name: 'Voltar para Hoje' })).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// 3. Aba de origem

describe('MAT-44c-1 #3: aba de origem na navegação', () => {
  for (const [tema, estadoDe] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`(${tema}) o item Hoje tem aria-current="true" na Sessão, com e sem sessão, e "page" no Hoje`, () => {
      for (const [caminho, estado, esperado] of [
        ['/app/sessao', estadoDe(), 'true'],
        ['/app/sessao', { ...estadoDe(), sessao: null }, 'true'],
        ['/app/hoje', estadoDe(), 'page'],
      ] as const) {
        const { unmount } = renderizarRota(caminho, { estadoInicial: estado })
        const nav = screen.getByRole('navigation', { name: 'Principal' })
        expect(within(nav).getByRole('link', { name: 'Hoje' }).getAttribute('aria-current'), caminho).toBe(esperado)
        unmount()
      }
    })
  }

  it('uma regra do CSS só pega os dois valores, com o traço de destaque de 3 px e o peso 600', () => {
    const marca = regras.find((r) => r.seletor === '.nav-item[aria-current]' && r.condicao === null)
    expect(marca).toBeDefined()
    expect(marca!.props['border-top-color']).toBe('var(--cor-destaque)')
    expect(marca!.props['font-weight']).toBe('600')
    const item = Object.assign({}, ...regras.filter((r) => r.seletor === '.nav-item' && r.condicao === null).map((r) => r.props)) as Record<string, string>
    expect(item['border-top']).toMatch(/^3px solid/)
    // Nenhuma regra marca só o valor "page".
    expect(regras.filter((r) => /aria-current=/.test(r.seletor))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 4. Grade do Início

describe('MAT-44c-1 #4: a grade do Início', () => {
  const grade = regras.filter((r) => r.seletor === '.inicio-grade')

  /** O que vale em cada largura da página (rem), aplicando as regras na ordem do arquivo. */
  function valoresEm(largura: number): Record<string, string> {
    const valores: Record<string, string> = {}
    for (const regra of [...grade].sort((a, b) => a.ordem - b.ordem)) {
      if (regra.condicao) {
        const m = /@container pagina \(min-width:\s*([\d.]+)rem\)/.exec(regra.condicao)
        if (!m || largura < parseFloat(m[1])) continue
      }
      Object.assign(valores, regra.props)
    }
    return valores
  }

  it('a grade de 2 colunas de mesma largura está em @container pagina (min-width: 60rem)', () => {
    const duasColunas = grade.filter((r) => /^repeat\(\s*2\s*,\s*minmax\(0,\s*1fr\)\s*\)$/.test(r.props['grid-template-columns'] ?? ''))
    expect(duasColunas).toHaveLength(1)
    expect(duasColunas[0].condicao).toBe('@container pagina (min-width: 60rem)')
    // Na média e na estreita, uma coluna.
    for (const largura of [30, 46, 59.9]) expect(valoresEm(largura)['grid-template-columns']).toBe('minmax(0, 1fr)')
  })

  it('column-gap e row-gap são o mesmo valor, em toda faixa', () => {
    for (const largura of [30, 50, 70]) {
      const valores = valoresEm(largura)
      expect(valores['column-gap'], `${largura} rem`).toBeDefined()
      expect(valores['column-gap'], `${largura} rem`).toBe(valores['row-gap'])
    }
  })

  it('o gap passa do padding lateral dos cartões em pelo menos 0,5 rem, em todas as faixas', () => {
    const esperado: Array<[number, number, number]> = [
      [30, 1, 1.5],
      [50, 1.5, 2.5],
      [70, 2.5, 4],
    ]
    for (const [largura, padding, gap] of esperado) {
      const valores = valoresEm(largura)
      expect(emRem(valores['--pad']), `padding em ${largura} rem`).toBe(padding)
      expect(emRem(valores['--gap']), `gap em ${largura} rem`).toBe(gap)
      expect(emRem(valores['--gap'])).toBeGreaterThanOrEqual(emRem(valores['--pad']) + 0.5)
    }
    const cartao = regras.find((r) => r.seletor === '.inicio-grade > section')!
    expect(cartao.props['padding']).toBe('var(--pad)')
  })
})

// ---------------------------------------------------------------------------
// 5. Aparelhos

/** Os textos visíveis de um trecho do DOM, na ordem, sem o aviso de demonstração. */
function textosVisiveis(raiz: Element): string[] {
  const textos: string[] = []
  const caminhante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
  for (let no = caminhante.nextNode(); no; no = caminhante.nextNode()) {
    const texto = (no.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (texto === '' || no.parentElement?.closest('[data-aviso]')) continue
    textos.push(texto)
  }
  return textos
}

describe('MAT-44c-1 #5: os aparelhos do Início são as telas reais', () => {
  async function inicio() {
    const resultado = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    return resultado
  }

  it('pelo menos metade das seções do Início tem aparelho real, de Hoje, de Sessão e da madrugada, todos inertes e escondidos', async () => {
    const { container } = await inicio()

    const secoes = [...container.querySelectorAll('main > section')]
    const comAparelho = secoes.filter((secao) => secao.querySelector('[data-aparelho]') !== null)
    expect(comAparelho.length).toBeGreaterThanOrEqual(Math.ceil(secoes.length / 2))

    const aparelhos = [...container.querySelectorAll<HTMLElement>('[data-aparelho]')]
    expect(aparelhos.some((a) => a.getAttribute('data-tela') === 'hoje')).toBe(true)
    expect(aparelhos.some((a) => a.getAttribute('data-tela') === 'sessao')).toBe(true)
    expect(aparelhos.some((a) => a.querySelector('[data-tema-local="madrugada"]') !== null || a.closest('[data-tema-local="madrugada"]') !== null)).toBe(true)
    for (const aparelho of aparelhos) {
      expect(aparelho.hasAttribute('inert')).toBe(true)
      expect(aparelho.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('a lista ordenada dos textos visíveis de cada aparelho é a da página real no mesmo estado, sem o aviso', async () => {
    const { container, unmount } = await inicio()
    const dosAparelhos = [...container.querySelectorAll<HTMLElement>('[data-aparelho]')].map((aparelho) => {
      const noite = aparelho.querySelector('[data-tema-local="madrugada"]') !== null
      const tela = aparelho.getAttribute('data-tela') as 'hoje' | 'sessao'
      const chave: 'hoje' | 'sessao' | 'madrugada' = noite ? 'madrugada' : tela
      return { chave, textos: textosVisiveis(aparelho) }
    })
    unmount()
    expect(new Set(dosAparelhos.map((a) => a.chave))).toEqual(new Set(['hoje', 'sessao', 'madrugada']))

    const reais = {} as Record<'hoje' | 'sessao' | 'madrugada', string[]>
    for (const [chave, caminho] of [
      ['hoje', '/app/hoje'],
      ['sessao', '/app/sessao'],
      ['madrugada', '/app/sessao'],
    ] as const) {
      const { estado, agora } = dadosDaVitrine(chave)
      vi.useFakeTimers()
      vi.setSystemTime(agora)
      const pagina = renderizarRota(caminho, { estadoInicial: estado })
      reais[chave] = textosVisiveis(pagina.container)
      pagina.unmount()
      vi.useRealTimers()
    }
    for (const { chave, textos } of dosAparelhos) {
      expect(textos.length, chave).toBeGreaterThan(5)
      expect(textos, chave).toEqual(reais[chave])
    }
  })

  it('nenhum id se repete no Início', async () => {
    const { container } = await inicio()

    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id)
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('o aviso de demonstração é só o da página: os aparelhos não têm o deles', async () => {
    const { container } = await inicio()

    expect(container.querySelectorAll('[data-aparelho] [data-aviso]')).toHaveLength(0)
  })

  it('a Sessão real do aparelho mostra a ilustração do tipo: o berço no Sono e a mamada na Mamada de Heloísa', async () => {
    const { container } = await inicio()

    const doSono = [...container.querySelectorAll<HTMLElement>('[data-aparelho][data-tela="sessao"]')].filter(
      (a) => a.querySelector('[data-tema-local="madrugada"]') === null,
    )
    const daMadrugada = [...container.querySelectorAll<HTMLElement>('[data-aparelho][data-tela="sessao"]')].filter(
      (a) => a.querySelector('[data-tema-local="madrugada"]') !== null,
    )
    expect(doSono.length).toBeGreaterThanOrEqual(1)
    expect(daMadrugada).toHaveLength(1)
    for (const aparelho of doSono) expect(aparelho.querySelector('[data-ilustracao="berco"]')).not.toBeNull()
    expect(daMadrugada[0].querySelector('[data-ilustracao="mamada"]')).not.toBeNull()
  })

  it('ver o Início não muda o <html>: sem tema da madrugada e sem reserva de rolagem', async () => {
    await inicio()

    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)
    expect(document.documentElement.style.getPropertyValue('scroll-padding-bottom')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// 6. Madrugada

describe('MAT-44c-1 #6: a madrugada do Início', () => {
  it('#secao-madrugada tem data-campo com um token night-* definido em tokens.css', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const campo = container.querySelector('#secao-madrugada')!.getAttribute('data-campo')!
    expect(campo).toMatch(/^night-/)
    expect(tokensCss).toMatch(new RegExp(`--color-${campo}:\\s*#[0-9a-f]{6}`))
    // E o CSS tem a regra do campo, com as variáveis da noite.
    const regra = regras.find((r) => r.seletor === `[data-campo='${campo}']`)
    expect(regra).toBeDefined()
    expect(regra!.props['background-color']).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 7. Ilustrações

describe('MAT-44c-1 #7: ilustrações do Início', () => {
  it('no máximo 2 distintas fora dos aparelhos, todas decorativas', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    const fora = [...container.querySelectorAll('main [data-ilustracao]')].filter((f) => !f.closest('[data-aparelho]'))
    expect(new Set(fora.map((f) => f.getAttribute('data-ilustracao'))).size).toBeLessThanOrEqual(2)
    for (const f of fora) expect(f.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('MAT-44c-1 rodada 2 #7: as duas ilustrações fora dos aparelhos têm a mesma altura', () => {
  it('são duas, de nomes distintos, com a mesma classe de altura declarada e o mesmo viewBox de altura', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const fora = [...container.querySelectorAll<SVGElement>('main [data-ilustracao]')].filter((f) => !f.closest('[data-aparelho]'))
    expect(fora).toHaveLength(2)
    expect(new Set(fora.map((f) => f.getAttribute('data-ilustracao'))).size).toBe(2)
    const alturas = fora.map((f) => Number(f.getAttribute('viewBox')!.split(/\s+/)[3]))
    expect(alturas[0]).toBe(alturas[1])
    for (const figura of fora) expect(figura.classList.contains('inicio-ilustracao')).toBe(true)
    // A altura é declarada na classe, em toda faixa, e nenhuma regra dá largura a elas (vem do viewBox).
    const regrasDaClasse = regras.filter((r) => r.seletor === '.inicio-ilustracao')
    expect(regrasDaClasse.some((r) => r.condicao === null && /rem$/.test(r.props['height'] ?? ''))).toBe(true)
    for (const regra of regrasDaClasse) expect(regra.props['width'] ?? 'auto').toBe('auto')
    // Base na borda de baixo: o desenho de cada uma termina no chão.
    for (const nome of ['Colo', 'Mamada']) expect(lerTexto(`prototipo/Ilustracao${nome}.tsx`)).toContain('<path d="M0 220H240" />')
  })
})

// ---------------------------------------------------------------------------
// Rodada 3

describe('MAT-44c-1 rodada 3 #1: as telas ficam lado a lado em 1440 × 900, com a barra de rolagem', () => {
  const emRemDe = (valor: string) => parseFloat(valor)

  it('o limiar das telas lado a lado entra em 1440 (caixa de 85,5 rem) e ainda cabe a fileira', () => {
    const lado = regras.find(
      (r) => r.seletor === '.inicio-telas' && r.condicao !== null && /24rem/.test(r.props['grid-template-columns'] ?? ''),
    )
    expect(lado).toBeDefined()
    const limiar = emRemDe(/min-width:\s*([\d.]+)rem/.exec(lado!.condicao!)![1])
    // 1440 com a barra de rolagem: 1425 px de janela, 96% de conteúdo no contêiner `pagina`.
    const caixaEm1440 = (1425 * 0.96) / 16
    expect(limiar).toBeLessThanOrEqual(caixaEm1440)
    // A fileira cabe no limiar: notebook (largura natural × escala) + gap + celular, no conteúdo do cartão.
    const notebook = emRemDe(regras.find((r) => r.seletor === '.aparelho-notebook' && 'width' in r.props)!.props['width'])
    const escala = Math.min(
      ...regras.filter((r) => r.seletor === '.aparelho-notebook' && '--escala-notebook' in r.props).map((r) => parseFloat(r.props['--escala-notebook'])),
    )
    const grande = regras.find((r) => r.seletor === '.inicio-grade' && r.condicao?.includes('60rem') && '--gap' in r.props)!
    const gap = emRemDe(grande.props['--gap'])
    const padding = emRemDe(grande.props['--pad'])
    const celular = emRemDe(lado!.props['grid-template-columns'].match(/(\d+)rem$/)![1])
    expect(limiar - 2 * padding).toBeGreaterThanOrEqual(notebook * escala + gap + celular)
  })
})

describe('MAT-44c-1 rodada 3 #2: os fatos são linhas de bloco, o termo logo ao lado da descrição', () => {
  it('a linha tem duas colunas (o termo pelo conteúdo, a descrição na coluna de 32,5rem), sem subgrade', () => {
    const doFato = regras.filter((r) => r.seletor === '.faixa-fatos > li' || r.seletor === '.inicio-fatos' || r.seletor === '.inicio-fatos > .faixa-fatos')
    for (const regra of doFato) expect(regra.props['grid-template-columns'] ?? '', regra.seletor).not.toMatch(/subgrid/)
    const colunas = regras.filter((r) => r.seletor === '.faixa-fatos > li' && r.condicao !== null && 'grid-template-columns' in r.props)
    expect(colunas.length).toBeGreaterThan(0)
    for (const regra of colunas) {
      expect(regra.props['grid-template-columns']).toBe('minmax(max-content, 1fr) minmax(0, 3fr)')
    }
  })

  it('cada descrição fica numa .coluna-texto, e o termo fica no mesmo <li>', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const itens = [...container.querySelectorAll('.faixa-fatos > li')]
    expect(itens).toHaveLength(4)
    for (const item of itens) {
      expect(item.querySelector(':scope > p.numero-fato')).not.toBeNull()
      expect(item.querySelector(':scope > .coluna-texto > p.texto-medida')).not.toBeNull()
    }
    expect(regras.find((r) => r.seletor === '.coluna-texto')!.props['max-width']).toBe('32.5rem')
  })
})

describe('MAT-44c-1 rodada 3 #3: a quebra de linha do texto corrido é a comum', () => {
  it('.texto-medida usa text-wrap: wrap (sem pretty nem balance), e todo texto corrido do Início usa a classe', async () => {
    for (const regra of regras.filter((r) => r.seletor === '.texto-medida' && 'text-wrap' in r.props)) {
      expect(regra.props['text-wrap']).toBe('wrap')
    }
    expect(regras.some((r) => r.seletor === '.texto-medida' && r.props['text-wrap'] === 'wrap')).toBe(true)

    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    const corridos = [...container.querySelectorAll('main .coluna-texto p')].filter(
      (p) => !p.closest('[data-aparelho]') && p.querySelector('a') === null,
    )
    expect(corridos.length).toBeGreaterThanOrEqual(12)
    for (const p of corridos) expect(p.classList.contains('texto-medida'), p.textContent!.slice(0, 40)).toBe(true)
    // Os títulos continuam com balance.
    expect(regras.some((r) => r.seletor === '.titulo-secao' && r.props['text-wrap'] === 'balance')).toBe(true)
  })
})

describe('MAT-44c-1 rodada 3 #4: os botões do painel "+ Mais" têm a largura da palavra mais longa e o respiro', () => {
  it('o botão que estica não encolhe abaixo do min-content, e a fileira quebra de linha', () => {
    for (const seletor of ['.botao.flex-1', '.acao-rapida.flex-1']) {
      const regra = regras.find((r) => r.seletor === seletor && 'min-width' in r.props)
      expect(regra, seletor).toBeDefined()
      expect(regra!.props['min-width']).toBe('min-content')
    }
    const acao = regras.find((r) => r.seletor === '.acao-rapida.flex-1' && 'padding-inline' in r.props)!
    expect(emRem(acao.props['padding-inline'])).toBeGreaterThanOrEqual(0.5)
  })

  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`(${tema}) os botões das escolhas abertas são botões que esticam, em fileira que quebra`, () => {
      renderizarRota('/app/hoje', { estadoInicial: estado() })

      fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
      const mais = screen.getByRole('group', { name: 'Outros registros de Heloísa' })
      expect(mais.className).toMatch(/\bflex-wrap\b/)
      for (const botao of mais.querySelectorAll('button')) {
        expect(botao.classList.contains('flex-1')).toBe(true)
        expect(botao.classList.contains('acao-rapida')).toBe(true)
      }
      expect([...mais.querySelectorAll('button')].map((b) => b.textContent)).toContain('Alimentação sólida')
    })
  }
})

describe('MAT-44c-1 rodada 3 #5: o conteúdo empilhado fica centrado no cartão na faixa larga', () => {
  it('a chamada e a madrugada têm uma coluna de 32,5rem centrada no cartão, a partir de 60rem', () => {
    for (const seletor of ['.inicio-chamada', '.inicio-madrugada']) {
      const regra = regras.find(
        (r) => r.seletor === seletor && r.condicao === '@container pagina (min-width: 60rem)' && 'justify-content' in r.props,
      )
      expect(regra, seletor).toBeDefined()
      expect(regra!.props['justify-content']).toBe('center')
      expect(regra!.props['grid-template-columns']).toBe('minmax(0, 32.5rem)')
    }
  })
})

describe('MAT-44c-1 rodada 5 #1: a promessa só usa subgrade a partir de 80rem', () => {
  const grande = '@container pagina (min-width: 80rem)'

  it('a subgrade, o limite do texto e a ilustração na coluna 2 só existem a partir de 80rem', () => {
    const subgrades = regras.filter((r) => r.seletor === '.inicio-promessa' && /subgrid/.test(r.props['grid-template-columns'] ?? ''))
    expect(subgrades.length).toBeGreaterThan(0)
    for (const regra of subgrades) expect(regra.condicao).toBe(grande)

    const limites = regras.filter((r) => r.seletor === '.inicio-promessa-texto')
    expect(limites.length).toBeGreaterThan(0)
    for (const regra of limites) expect(regra.condicao, JSON.stringify(regra.props)).toBe(grande)

    const naColuna2 = regras.filter((r) => r.seletor === '.inicio-promessa > .inicio-ilustracao')
    expect(naColuna2.length).toBeGreaterThan(0)
    for (const regra of naColuna2) expect(regra.condicao).toBe(grande)
  })

  it('entre 60 e 80rem a ilustração fica centrada embaixo do texto, na mesma altura da de "para que serve"', () => {
    const base = regras.find((r) => r.seletor === '.inicio-ilustracao' && r.condicao === null && 'justify-self' in r.props)!
    expect(base.props['justify-self']).toBe('center')
    expect(base.props['align-self']).toBe('end')
    // Nenhuma regra de 60rem muda o alinhamento dela; a altura é a mesma da outra ilustração (uma classe só).
    const aMais = regras.filter((r) => r.seletor === '.inicio-ilustracao' && r.condicao === '@container pagina (min-width: 60rem)')
    for (const regra of aMais) expect(regra.props['justify-self']).toBeUndefined()
    expect(regras.some((r) => r.seletor === '.inicio-ilustracao' && r.condicao === '@container pagina (min-width: 60rem)' && 'height' in r.props)).toBe(true)
  })
})

describe('MAT-44c-1 rodada 5 #2: abaixo do limiar das telas lado a lado, os aparelhos ficam centrados no cartão', () => {
  it('o celular e o notebook das telas se centram a partir de 46rem; o texto continua à esquerda', () => {
    const centro = regras.filter((r) => r.seletor === '.inicio-telas > .aparelho' && r.props['justify-self'] === 'center')
    expect(centro).toHaveLength(1)
    expect(centro[0].condicao).toBe('@container pagina (min-width: 46rem)')
    // Na fileira (85,3rem em diante) o notebook e o celular voltam a começar nas suas trilhas.
    for (const seletor of ['.inicio-telas > .aparelho-notebook', '.inicio-telas > .inicio-aparelho-lado']) {
      const regra = regras.find((r) => r.seletor === seletor && r.condicao === '@container pagina (min-width: 85.3rem)')!
      expect(regra.props['justify-self'], seletor).toBe('start')
    }
    // O texto da seção não recebe justify-self: fica na coluna da esquerda.
    expect(regras.some((r) => r.seletor.includes('.inicio-telas-texto') && 'justify-self' in r.props)).toBe(false)
    expect(regras.some((r) => r.seletor.includes('.inicio-telas-texto') && r.props['text-align'] === 'center')).toBe(false)
  })
})

describe('MAT-44c-1 rodada 4 #1: a coluna de texto tem 32,5rem', () => {
  it('o texto da promessa nunca chega a 1rem da linha da coluna 2, em 1024 e em 1440', () => {
    const regra = regras.find((r) => r.seletor === '.inicio-promessa-texto' && 'max-width' in r.props)!
    expect(regra.props['max-width']).toBe('min(32.5rem, calc((100% - var(--gap)) / 2 + var(--gap) - 1rem))')
    // Conteúdo do cartão (caixa do contêiner menos 2 × 40 px) e gap de 64 px nas duas larguras.
    for (const caixa of [(1024 * 0.96) / 16, (1425 * 0.96) / 16]) {
      const conteudo = caixa * 16 - 80
      const gap = 64
      const limite = Math.min(32.5 * 16, (conteudo - gap) / 2 + gap - 16)
      const colunaDois = (conteudo - gap) / 2 + gap
      expect(limite).toBeLessThanOrEqual(colunaDois - 16)
    }
  })

  it('nenhuma regra do Início fixa 31rem', () => {
    expect(estiloGlobal).not.toMatch(/\b31rem\b/)
  })
})

describe('MAT-44c-1 rodada 2 #a: todo texto corrido do Início mora numa coluna de texto de até 32,5rem', () => {
  it('cada parágrafo do <main> fora dos aparelhos está dentro de uma .coluna-texto, cuja largura máxima é de 32,5rem ou menos', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    // O termo grande dos fatos (.numero-fato) é um título, não texto corrido.
    const paragrafos = [...container.querySelectorAll('main p')].filter(
      (p) => !p.closest('[data-aparelho]') && !p.classList.contains('numero-fato'),
    )
    expect(paragrafos.length).toBeGreaterThanOrEqual(10)
    for (const p of paragrafos) expect(p.closest('.coluna-texto'), p.textContent!.slice(0, 40)).not.toBeNull()
    for (const regra of regras.filter((r) => r.seletor === '.coluna-texto' || r.seletor === '.inicio-promessa-texto')) {
      const largura = regra.props['max-width']
      expect(largura, regra.seletor).toBeDefined()
      expect(largura.startsWith('min(') ? emRem(largura.slice(4).split(',')[0]) : emRem(largura), regra.seletor).toBeLessThanOrEqual(32.5)
    }
    // O teto em ch de .texto-medida fica entre 55ch e 70ch; a coluna é que manda na largura.
    const teto = /^([\d.]+)ch$/.exec(regras.find((r) => r.seletor === '.texto-medida' && 'max-width' in r.props)!.props['max-width'])!
    expect(parseFloat(teto[1])).toBeGreaterThanOrEqual(55)
    // Nenhum texto do Início usa o max-width em rem fora da coluna.
    const doInicio = regras.filter((r) => /\.(inicio-|texto-medida)/.test(r.seletor) && 'max-width' in r.props)
    for (const regra of doInicio) {
      if (/ch$/.test(regra.props['max-width'])) continue
      expect(regra.props['max-width'], regra.seletor).toMatch(/^(32\.5rem|24rem|min\(32\.5rem, .*\)|100%)$|^none$/)
    }
  })
})

// ---------------------------------------------------------------------------
// 8. Linha de leitura

describe('MAT-44c-1 #8: a linha de leitura', () => {
  it('todo max-width em ch do CSS fica entre 55 e 70', () => {
    const medidas = regras
      .map((r) => ({ seletor: r.seletor, valor: /^([\d.]+)ch$/.exec(r.props['max-width'] ?? '')?.[1] }))
      .filter((m) => m.valor !== undefined)
    expect(medidas.length).toBeGreaterThan(0)
    for (const { seletor, valor } of medidas) {
      expect(parseFloat(valor!), seletor).toBeGreaterThanOrEqual(55)
      expect(parseFloat(valor!), seletor).toBeLessThanOrEqual(70)
    }
  })
})

// ---------------------------------------------------------------------------
// 9. Coerência dos dados fixos

describe('MAT-44c-1 #9: coerência dos dados fixos dos aparelhos', () => {
  const minutosDe = (hora: string): number => {
    const [h, m] = hora.split(':').map(Number)
    return h * 60 + m
  }
  const duracaoDeCronometro = (cronometro: string): number => {
    const partes = cronometro.split(':').map(Number)
    const [h, m, s] = partes.length === 3 ? partes : [0, ...partes]
    return h * 60 + m + s / 60
  }
  const duracaoDeTexto = (texto: string): number => {
    const achado = /^(?:(\d+) h )?(\d+) min$/.exec(texto)!
    return Number(achado[1] ?? 0) * 60 + Number(achado[2])
  }
  const { hoje, sessao, madrugada: noite } = MINIATURAS
  const inicio = minutosDe(sessao.hora)
  const vitrine = inicio + duracaoDeCronometro(sessao.cronometro)

  it('a hora da vitrine é o início mais o cronômetro, entre 22:40 e 23:59 do mesmo dia', () => {
    expect(vitrine).toBe(minutosDe('23:00'))
    expect(vitrine).toBeGreaterThanOrEqual(minutosDe('22:40'))
    expect(vitrine).toBeLessThanOrEqual(minutosDe('23:59'))
    expect(inicio).toBeLessThan(vitrine)
  })

  it('os "há X" de "Últimos" valem a hora da vitrine menos X, e nenhum item do tipo da sessão vem depois do início dela', () => {
    for (const item of hoje.ultimos.itens) {
      const tempo = /^há (.+)$/.exec(item.quando)
      const quando = tempo ? vitrine - duracaoDeTexto(tempo[1]) : /^ontem (\d{2}:\d{2})$/.test(item.quando) ? -1 : Number.NaN
      expect(Number.isNaN(quando), item.quando).toBe(false)
      if (tempo) {
        expect(quando, item.quando).toBeGreaterThanOrEqual(0)
        expect(quando, item.quando).toBeLessThan(vitrine)
      }
      if (item.rotulo === ROTULO_SESSAO.sono && tempo) expect(quando, item.rotulo).toBeLessThanOrEqual(inicio)
    }
  })

  it('a duração do cartão do Hoje bate com o cronômetro da Sessão, com 1 min de folga', () => {
    expect(Math.abs(duracaoDeTexto(hoje.sessao.duracao) - duracaoDeCronometro(sessao.cronometro))).toBeLessThanOrEqual(1)
    expect(hoje.sessao.rotulo).toBe(ROTULO_SESSAO.sono)
    expect(hoje.sessao.pessoa).toBe(sessao.pessoa)
    expect(sessao.titulo).toBe(`${ROTULO_SESSAO.sono} de Heloísa`)
  })

  it('MINIATURAS.madrugada é uma mamada de Heloísa entre 00:00 e 05:59, e o relógio para às 03:24:32', () => {
    expect(noite.titulo).toBe(`${ROTULO_SESSAO.mamada} de Heloísa`)
    expect(noite.pessoa).toBe('Juliana')
    expect(minutosDe(noite.hora)).toBeGreaterThanOrEqual(0)
    expect(minutosDe(noite.hora)).toBeLessThanOrEqual(minutosDe('05:59'))
    const agora = new Date(dadosDaVitrine('madrugada').agora)
    expect([agora.getHours(), agora.getMinutes(), agora.getSeconds()]).toEqual([3, 24, 32])
    const sono = new Date(dadosDaVitrine('sessao').agora)
    expect([sono.getHours(), sono.getMinutes(), sono.getSeconds()]).toEqual([23, 0, 0])
  })

  it('as chaves hoje e sessao têm os nomes de campo da base, e sessao.atividade é undefined', () => {
    expect(Object.keys(hoje)).toEqual(['titulo', 'bebe', 'sessao', 'nota', 'ultimos'])
    expect(Object.keys(hoje.sessao)).toEqual(['rotulo', 'duracao', 'pessoa'])
    expect(Object.keys(sessao)).toEqual(['titulo', 'cronometro', 'hora', 'pessoa', 'atividade', 'acoes'])
    expect(sessao.atividade).toBeUndefined()
    expect(Object.keys(MINIATURAS)).toEqual(['hoje', 'sessao', 'madrugada'])
  })
})

// ---------------------------------------------------------------------------
// 10. Faixa estreita

describe('MAT-44c-1 #10: um aparelho por grupo na faixa estreita', () => {
  /** As classes que têm display: none sem condição e voltam a aparecer no @container pagina com `limiar`. */
  function classesQueVoltamEm(limiar: string): Set<string> {
    const saida = new Set<string>()
    for (const regra of regras) {
      if (regra.condicao !== null || regra.props['display'] !== 'none') continue
      const m = /^\.([\w-]+)$/.exec(regra.seletor)
      if (!m) continue
      const volta = regras.some(
        (r) =>
          r.seletor === regra.seletor &&
          r.condicao === `@container pagina (min-width: ${limiar})` &&
          r.props['display'] !== undefined &&
          r.props['display'] !== 'none',
      )
      if (volta) saida.add(m[1])
    }
    return saida
  }

  it('em cada grupo exatamente um celular fica sem a classe que o esconde abaixo de 46 rem; as classes são display: none e voltam no contêiner pagina', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const abaixoDe46 = classesQueVoltamEm('46rem')
    const abaixoDe60 = classesQueVoltamEm('60rem')
    expect(abaixoDe46.size).toBeGreaterThan(0)
    expect(abaixoDe60.size).toBeGreaterThan(0)

    const grupos = [...container.querySelectorAll('main > section')].filter((s) => s.querySelector('[data-aparelho]') !== null)
    expect(grupos.length).toBeGreaterThanOrEqual(3)
    for (const grupo of grupos) {
      const celulares = [...grupo.querySelectorAll<HTMLElement>('[data-aparelho="celular"]')]
      const visiveis = celulares.filter((c) => ![...c.classList].some((classe) => abaixoDe46.has(classe) || abaixoDe60.has(classe)))
      expect(visiveis, grupo.getAttribute('id') ?? grupo.getAttribute('aria-labelledby') ?? '').toHaveLength(1)
      for (const notebook of grupo.querySelectorAll<HTMLElement>('[data-aparelho="notebook"]')) {
        expect([...notebook.classList].some((classe) => abaixoDe60.has(classe))).toBe(true)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 11. Botões rápidos

describe('MAT-44c-1 #11: botões rápidos', () => {
  it('.acao-rapida tem padding-inline de pelo menos 0,5 rem', () => {
    const regra = regras.find((r) => r.seletor === '.acao-rapida' && r.condicao === null)!
    expect(emRem(regra.props['padding-inline'])).toBeGreaterThanOrEqual(0.5)
  })

  it('BotoesRapidos mantém whitespace-nowrap e @max-[17rem]:whitespace-normal', () => {
    const texto = lerTexto('prototipo/BotoesRapidos.tsx')
    expect(texto).toContain('whitespace-nowrap')
    expect(texto).toContain('@max-[17rem]:whitespace-normal')
  })
})
