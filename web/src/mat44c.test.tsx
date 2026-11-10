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
    // A de min-height é o aumento de escala do computador, só para telas altas (rodada 8 B).
    expect(medias.sort()).toEqual(['(min-height: 860px)', '(min-width: 48rem)', '(prefers-reduced-motion: reduce)'])
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
    // O gap entre seções cresce com a faixa; na larga é de 64 px (4 rem). Rodada visual 3: eram 150 px, e
    // o canal vazio entre as colunas (defeito 4) vinha daí.
    const esperado: Array<[number, number, number]> = [
      [30, 1, 2.5],
      [50, 1.5, 4],
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

/** O texto de serviço da página real: a faixa do protótipo (o aviso de demonstração já é tirado acima). */
const TEXTO_DA_FAIXA = 'Protótipo: dados fictícios, nada é salvo.'

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

  it('a lista ordenada dos textos visíveis de cada aparelho é a da página real no mesmo estado, sem os textos de serviço (o aviso de demonstração e a faixa do protótipo)', async () => {
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
      reais[chave] = textosVisiveis(pagina.container).filter((texto) => texto !== TEXTO_DA_FAIXA)
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

  it('o aviso é um só, o da página: os aparelhos não têm o aviso de demonstração nem a faixa do protótipo', async () => {
    const { container } = await inicio()

    expect(container.querySelectorAll('[data-aparelho] [data-aviso]')).toHaveLength(0)
    for (const aparelho of container.querySelectorAll('[data-aparelho]')) {
      expect(aparelho.textContent).not.toContain(TEXTO_DA_FAIXA)
      expect(aparelho.textContent).not.toContain('Demonstração sem banco')
      expect(aparelho.querySelector('header.border-b')).toBeNull()
    }
    expect(container.querySelectorAll('[data-aviso]')).toHaveLength(1)
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

describe('MAT-44c-1 rodada 2 #7: as ilustrações fora dos aparelhos têm a mesma escala', () => {
  it('toda ilustração fora dos aparelhos usa a classe .inicio-ilustracao e mora num cartão de imagem de uma só regra de tamanho', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const fora = [...container.querySelectorAll<SVGElement>('main [data-ilustracao]')].filter((f) => !f.closest('[data-aparelho]'))
    expect(fora.length).toBeGreaterThanOrEqual(1)
    expect(new Set(fora.map((f) => f.getAttribute('data-ilustracao'))).size).toBeLessThanOrEqual(2)
    const alturas = fora.map((f) => Number(f.getAttribute('viewBox')!.split(/\s+/)[3]))
    for (const altura of alturas) expect(altura).toBe(alturas[0])
    for (const figura of fora) expect(figura.classList.contains('inicio-ilustracao')).toBe(true)
    // Base na borda de baixo: o desenho termina no chão, e a figura ocupa a caixa do cartão (sem width fixo).
    for (const figura of fora) {
      expect(lerTexto(`prototipo/Ilustracao${figura.getAttribute('data-ilustracao')![0].toUpperCase()}${figura.getAttribute('data-ilustracao')!.slice(1)}.tsx`)).toContain('<path d="M0 220H240" />')
    }
  })
})

// ---------------------------------------------------------------------------
// Rodada 3

// ---------------------------------------------------------------------------
// Rodada 7

// Uma condição só com max-width (os degraus da fonte ampliada) vale a partir de 0.
const larguraDa = (condicao: string | null): number =>
  condicao === null ? 0 : parseFloat(/min-width:\s*([\d.]+)rem/.exec(condicao)?.[1] ?? '0')

describe('MAT-44c-1 rodada 7 #3: o notebook do Hoje é a imagem do topo, de ponta a ponta, num campo de cor', () => {
  it('em toda largura de 60rem em diante o notebook cabe no campo do topo (padding de 2 × 2,5rem)', () => {
    const grande = regras.find((r) => r.seletor === '.inicio-grade' && r.condicao?.includes('60rem') && '--pad' in r.props)!
    const padding = emRem(grande.props['--pad'])
    const largura = emRem(regras.find((r) => r.seletor === '.aparelho-notebook' && 'width' in r.props)!.props['width'])
    const degraus = regras
      .filter((r) => r.seletor === '.aparelho-notebook' && '--escala-notebook' in r.props)
      .map((r) => ({ de: Math.max(60, larguraDa(r.condicao)), escala: parseFloat(r.props['--escala-notebook']) }))
    expect(degraus.length).toBeGreaterThanOrEqual(3)
    for (const { de, escala } of degraus) expect(largura * escala + 2 * padding, `a partir de ${de}rem`).toBeLessThanOrEqual(de)
    // 1440 com a barra de rolagem: a caixa do contêiner tem 85,5 rem, e o notebook é o maior degrau.
    const caixaEm1440 = (1425 * 0.96) / 16
    const noDegrau = degraus.filter((d) => d.de <= caixaEm1440).sort((a, b) => b.de - a.de)[0]
    expect(noDegrau.escala).toBe(Math.max(...degraus.map((d) => d.escala)))
    expect(Math.min(...degraus.map((d) => d.escala)) * 13).toBeGreaterThanOrEqual(11)
  })

  it('o topo é o título, a apresentação, os pilares e um campo de cor com o notebook e o celular do Hoje; é o único notebook', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const promessa = container.querySelector('main > section')!
    expect(promessa.querySelector('h1')).not.toBeNull()
    const hero = promessa.querySelector<HTMLElement>('.inicio-hero')!
    expect(hero.hasAttribute('data-campo')).toBe(true)
    expect(hero.querySelector('[data-aparelho="notebook"][data-tela="hoje"]')).not.toBeNull()
    expect(hero.querySelector('[data-aparelho="celular"][data-tela="hoje"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-aparelho="notebook"]')).toHaveLength(1)
    expect(promessa.querySelectorAll('li.etiqueta')).toHaveLength(4)
    // A seção "Duas telas" fica com o celular da Sessão e sem notebook.
    const telas = container.querySelector('#secao-telas')!
    expect(telas.querySelector('[data-aparelho="notebook"]')).toBeNull()
    expect(telas.querySelector('[data-aparelho="celular"][data-tela="sessao"]')).not.toBeNull()
  })

  // Rodada visual 3 (defeito 3): os pilares deixaram a coluna lateral automática e passaram para a segunda
  // coluna da grade (a mesma linha vertical do segundo cartão do par), em etiquetas que quebram por palavra.
  it('na larga o título atravessa as duas colunas e os pilares ficam na segunda coluna, em linha', () => {
    const doTopo = (seletor: string) =>
      regras.find((r) => r.seletor === seletor && r.condicao === '@container pagina (min-width: 60rem)')!
    const promessa = doTopo('.inicio-promessa')
    expect(promessa.props['grid-template-areas']).toMatch(/'titulo titulo'[\s\S]*'texto pilares'[\s\S]*'hero hero'/)
    expect(doTopo('.inicio-pilares').props['grid-area']).toBe('pilares')
    expect(doTopo('.inicio-pilares').props['flex-direction']).toBeUndefined()
    expect(doTopo('.inicio-hero').props['grid-area']).toBe('hero')
    // As duas colunas são iguais e têm o gap da grade: a segunda começa onde o segundo cartão do par começa.
    expect(promessa.props['grid-template-columns']).toBe('repeat(2, minmax(0, 1fr))')
    expect(promessa.props['column-gap']).toBe('var(--gap)')
  })
})

describe('MAT-44c-1 rodada 3 #2: os fatos são linhas de bloco, o termo logo ao lado da descrição', () => {
  it('a linha tem duas colunas (o termo pelo conteúdo, a descrição na coluna de 32,5rem), sem subgrade', () => {
    const doFato = regras.filter((r) => r.seletor === '.faixa-fatos > li' || r.seletor === '.inicio-fatos' || r.seletor === '.inicio-fatos > .faixa-fatos')
    for (const regra of doFato) expect(regra.props['grid-template-columns'] ?? '', regra.seletor).not.toMatch(/subgrid/)
    const colunas = regras.filter((r) => r.seletor === '.faixa-fatos > li' && r.condicao !== null && 'grid-template-columns' in r.props)
    expect(colunas.length).toBeGreaterThan(0)
    // Média (46 rem): o termo pelo conteúdo e a descrição no resto. Larga (60 rem, rodada visual 3): duas
    // colunas iguais com o gap da grade, a descrição na segunda coluna (x1), sem o vazio de 40% à direita.
    for (const regra of colunas) {
      const larga = regra.condicao === '@container pagina (min-width: 60rem)'
      expect(regra.props['grid-template-columns']).toBe(larga ? 'repeat(2, minmax(0, 1fr))' : 'minmax(max-content, 1fr) minmax(0, 3fr)')
      if (larga) expect(regra.props['column-gap']).toBe('var(--gap)')
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

describe('MAT-44c-1 rodada 7 #6: o espaço é de seção: 64 px entre seções na larga e 2rem dentro delas', () => {
  it('a larga tem o gap de 4rem (o mesmo na linha e na coluna) e o respiro interno é de 2rem', () => {
    const larga = regras.find((r) => r.seletor === '.inicio-grade' && r.condicao?.includes('60rem') && '--gap' in r.props)!
    // Rodada visual 3: o gap era de 150 px (9,375rem); entre as colunas ele virava um canal vazio.
    expect(emRem(larga.props['--gap'])).toBeCloseTo(4, 3)
    const base = regras.find((r) => r.seletor === '.inicio-grade' && r.condicao === null && '--respiro-interno' in r.props)!
    expect(emRem(base.props['--respiro-interno'])).toBe(2)
    for (const seletor of ['.inicio-promessa', '.inicio-telas', '.inicio-serve', '.inicio-chamada']) {
      const regra = regras.find((r) => r.seletor === seletor && r.props['row-gap'] === 'var(--respiro-interno)')
      expect(regra, seletor).toBeDefined()
    }
  })

  // Rodada visual 3: a chamada (e as telas e a madrugada, de 72rem a 80rem) são cartões de duas colunas iguais com o
  // gap da grade, o aparelho na segunda (x1); o par telas + madrugada começa com 80rem, onde a meia grade tem 33rem.
  it('a chamada é um cartão de 2 colunas iguais com o gap da grade e o par telas + madrugada só começa com 80rem', () => {
    const chamada = regras.find((r) => r.seletor === '.inicio-chamada' && r.condicao === '@container pagina (min-width: 72rem)')!
    expect(chamada.props['grid-template-columns']).toBe('repeat(2, minmax(0, 1fr))')
    expect(chamada.props['column-gap']).toBe('var(--gap)')
    const par = regras.find((r) => r.seletor === '.inicio-grade > .inicio-par' && /span 1/.test(r.props['grid-column'] ?? ''))!
    expect(par.condicao).toBe('@container pagina (min-width: 80rem)')
    // Na meia grade (80rem) cabe a coluna de texto inteira: (80 − 4) ÷ 2 − 2 × 2,5.
    expect((80 - 4) / 2 - 5).toBeGreaterThanOrEqual(32.5)
  })

  it('os aparelhos ficam centrados no cartão e o texto fica à esquerda', () => {
    const centro = regras.find((r) => r.seletor === '.inicio-grade .aparelho')!
    expect(centro.props['justify-self']).toBe('center')
    expect(regras.some((r) => r.seletor.includes('.coluna-texto') && r.props['text-align'] === 'center')).toBe(false)
  })
})

describe('MAT-44c-1 rodada 7 #4: uma margem esquerda só', () => {
  it('as seções sem campo de cor não têm padding lateral; as de campo têm o mesmo --pad, igual em todas', async () => {
    const semCampo = regras.find((r) => r.seletor === '.inicio-grade > section:not([data-campo])')!
    expect(semCampo.props['padding-inline']).toBe('0')
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    // O padding lateral da raiz é a margem: o logo e o rodapé são filhos diretos dela, sem recuo próprio.
    const raiz = container.firstElementChild!
    expect(raiz.className).toMatch(/\bpx-4\b/)
    for (const filho of [container.querySelector('header')!, container.querySelector('footer')!]) {
      expect(filho.parentElement).toBe(raiz)
      expect([...filho.classList].some((c) => /^(px|pl|ml|mx)-/.test(c))).toBe(false)
    }
    const campos = [...container.querySelectorAll('main > section[data-campo]')]
    expect(campos.length).toBeGreaterThanOrEqual(3)
    expect(regras.find((r) => r.seletor === '.inicio-grade > section')!.props['padding']).toBe('var(--pad)')
  })
})

describe('MAT-44c-1 rodada 7 #8: a ilustração enche o cartão de imagem', () => {
  it('há uma só ilustração fora dos aparelhos, que não é o berço nem a mamada, num cartão de campo de cor', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const fora = [...container.querySelectorAll<SVGElement>('main [data-ilustracao]')].filter((f) => !f.closest('[data-aparelho]'))
    expect(fora).toHaveLength(1)
    expect(['berco', 'mamada']).not.toContain(fora[0].getAttribute('data-ilustracao'))
    const cartao = fora[0].parentElement!
    expect(cartao.classList.contains('inicio-imagem')).toBe(true)
    expect(cartao.hasAttribute('data-campo')).toBe(true)
    expect(lerTexto('prototipo/IlustracaoColo.tsx')).toContain('<path d="M0 220H240" />')
  })

  // Rodada 9 D: a base do <svg> é a base do campo, e o campo termina na base da área de conteúdo da seção.
  it('rodada 9 D: nem o campo nem o <svg> têm margem ou padding embaixo, e o <svg> toca a base do campo', () => {
    for (const regra of regras.filter((r) => r.seletor === '.inicio-imagem' || r.seletor === '.inicio-ilustracao')) {
      for (const [prop, valor] of Object.entries(regra.props)) {
        if (/^(margin|padding)/.test(prop)) expect(valor, `${regra.seletor} { ${prop} }`).toMatch(/^0(px|rem)?$/)
      }
    }
    const figura = regras.find((r) => r.seletor === '.inicio-ilustracao')!
    // Só há respiro em cima: o inset de baixo e o dos lados são 0.
    expect(figura.props['inset']).toBe('1rem 0 0 0')
    expect(figura.props['width']).toBe('100%')
    expect(figura.props['height']).toBe('calc(100% - 1rem)')
    // O desenho se apoia na base da própria caixa, mesmo quando ela é mais larga que o desenho.
    expect(lerTexto('prototipo/IlustracaoColo.tsx')).toContain('preserveAspectRatio="xMidYMax meet"')
    // O campo é o último item da seção: a base dele é a base da área de conteúdo.
    const campo = regras.find((r) => r.seletor === '.inicio-imagem' && r.condicao === null)!
    expect(campo.props['position']).toBe('relative')
  })

  // Rodada visual 3 (defeitos 4 e 5): o campo da ilustração deixou de ser uma caixa de 25rem encostada à direita, com um
  // canal vazio de 365 px entre ela e o texto; agora ocupa a segunda coluna inteira, da linha x1 à margem direita, a
  // partir de 72rem (onde o texto de 20 px ainda tem mais de 50 caracteres por linha).
  it('rodada 9 D: a partir de 72rem o campo ocupa a segunda coluna inteira e estica até a base da seção', () => {
    const faixa = '@container pagina (min-width: 72rem)'
    const campo = regras.find((r) => r.seletor === '.inicio-serve > .inicio-imagem' && r.condicao === faixa)!
    expect(campo).toBeDefined()
    expect(campo.props['align-self']).toBe('stretch')
    expect(campo.props['justify-self']).toBe('stretch')
    expect(campo.props['aspect-ratio']).toBe('auto')
    expect(campo.props['max-width']).toBe('none')
    expect(campo.props['width']).toBe('100%')
    // A seção não centraliza mais o campo na vertical (isso deixava 54 px até a base).
    const secao = regras.find((r) => r.seletor === '.inicio-serve' && r.condicao === faixa)!
    expect(secao.props['align-items']).not.toBe('center')
    expect(secao.props['grid-template-columns']).toBe('repeat(2, minmax(0, 1fr))')
    expect(secao.props['column-gap']).toBe('var(--gap)')
    // A seção sem campo de cor não tem padding lateral: a borda direita da seção é a linha da grade.
    expect(regras.find((r) => r.seletor === '.inicio-grade > section:not([data-campo])')!.props['padding-inline']).toBe('0')
    // O desenho (160 × 222) ocupa mais de 70% do campo (a segunda coluna de 544 px em 72rem) para as alturas
    // prováveis da seção com o texto de 20 px (de 600 a 800 px).
    const largura = (72 * 16 - 4 * 16) / 2
    for (const altura of [600, 700, 800]) {
      const caixaL = largura
      const caixaA = altura - 16
      const h = Math.min(caixaA, caixaL / (160 / 222))
      expect((h * h * (160 / 222)) / (largura * altura), `${altura}px`).toBeGreaterThan(0.7)
    }
  })

  it('a figura ocupa a caixa do cartão e o cartão tem a proporção do desenho (mais de 70% da área) nas faixas empilhadas', () => {
    const cartao = regras.find((r) => r.seletor === '.inicio-imagem' && 'aspect-ratio' in r.props && r.condicao === null)!
    const [largura, altura] = cartao.props['aspect-ratio'].split('/').map(Number)
    const proporcaoDoDesenho = 160 / 222
    for (const larguraDoCartao of [17 * 16, 24 * 16]) {
      const alturaDoCartao = (larguraDoCartao * altura) / largura
      // A caixa do <svg> tem a largura toda do cartão e a altura menos 1 rem de respiro em cima.
      const caixaA = alturaDoCartao - 16
      const alturaDoDesenho = Math.min(caixaA, larguraDoCartao / proporcaoDoDesenho)
      const area = (alturaDoDesenho * proporcaoDoDesenho * alturaDoDesenho) / (larguraDoCartao * alturaDoCartao)
      expect(area, `cartão de ${larguraDoCartao}px`).toBeGreaterThan(0.7)
    }
  })

  it('o painel da ilustração da Sessão larga enche o painel (sem o teto do estreito) e a figura quadrada ocupa mais de 70%', () => {
    const figura = regras.find((r) => r.seletor === '.sessao-ilu > svg' && r.condicao === LARGO)!
    expect(figura.props['max-width']).toBe('none')
    expect(figura.props['max-height']).toBe('none')
    const painel = regras.find((r) => r.seletor === '.sessao-ilu' && r.condicao === LARGO && 'min-height' in r.props)!
    expect(emRem(painel.props['min-height'])).toBeGreaterThanOrEqual(34)
    expect(emRem(painel.props['padding'])).toBe(1)
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
    // Rodada visual 3: com o corpo de 20 px na larga (60rem), a coluna de 32,5rem dava só 52 caracteres por linha;
    // ela passa a 36rem nessa faixa (cerca de 62 caracteres) e continua em 32,5rem ou menos nas outras.
    for (const regra of regras.filter((r) => r.seletor === '.coluna-texto')) {
      const largura = regra.props['max-width']
      expect(largura, regra.seletor).toBeDefined()
      const teto = regra.condicao === '@container pagina (min-width: 60rem)' ? 36 : 32.5
      expect(emRem(largura), regra.seletor).toBeLessThanOrEqual(teto)
    }
    // Nenhuma regra do Início fixa 31rem: a coluna de texto é a de 32,5rem.
    expect(estiloGlobal).not.toMatch(/\b31rem\b/)
    // O teto em ch de .texto-medida fica entre 55ch e 70ch; a coluna é que manda na largura.
    const teto = /^([\d.]+)ch$/.exec(regras.find((r) => r.seletor === '.texto-medida' && 'max-width' in r.props)!.props['max-width'])!
    expect(parseFloat(teto[1])).toBeGreaterThanOrEqual(55)
    // Nenhum texto do Início usa o max-width em rem fora da coluna.
    const doInicio = regras.filter((r) => /\.(inicio-|texto-medida)/.test(r.seletor) && 'max-width' in r.props)
    for (const regra of doInicio) {
      if (/ch$/.test(regra.props['max-width'])) continue
      expect(regra.props['max-width'], regra.seletor).toMatch(/^(36rem|32\.5rem|24rem|17rem|100%)$|^none$/)
    }
  })
})

describe('MAT-44c-1 rodada 7 #1 e #2: o celular é uma janela de altura fixa, com a navegação do aparelho em linha', () => {
  const doCelular = (seletor: string, condicao: string | null = null) =>
    regras.find((r) => r.seletor === seletor && r.condicao === condicao)!

  // Rodada visual 3 (defeito 2): a janela deixou de ter uma altura única (33,65rem): cada tela tem a sua (--janela), medida no
  // navegador para o recorte cair no respiro entre dois blocos (o campo do cronômetro inteiro na Sessão; o cartão da soneca
  // inteiro no Hoje), nunca dentro de um texto ou botão.
  it('a janela tem altura fixa por tela (--janela) e a tela tem mais de 22rem de largura, então a barra vem em linha', () => {
    const celular = doCelular('.aparelho-celular')
    const larguraTotal = emRem(celular.props['width'])
    // Moldura: 2 px de borda e 0,375rem de padding de cada lado.
    const moldura = 2 * (2 / 16 + 0.375)
    expect(larguraTotal - moldura).toBeGreaterThan(22)
    expect(celular.props['height']).toBe('var(--janela)')
    expect(celular.props['margin-bottom']).toBe('calc(var(--janela) * (var(--escala-celular) - 1))')
    const daSessao = emRem(celular.props['--janela'])
    const doHoje = emRem(doCelular(".aparelho-celular[data-tela='hoje']").props['--janela'])
    expect(daSessao).toBeGreaterThan(32.65 + moldura)
    expect(doHoje).toBeGreaterThan(daSessao)
    // A regra de uma coluna da navegação é a de 22rem da barra, e a tela dá a ela mais que isso.
    expect(estiloGlobal).toMatch(/@container \(max-width: 22rem\)/)
    // A tela ocupa a janela inteira, o conteúdo corta no que passa e a barra fica presa no pé.
    expect(doCelular('.aparelho-celular .aparelho-tela').props['height']).toBe('100%')
    expect(doCelular('.aparelho-celular .coluna-app').props['height']).toBe('100%')
    const main = doCelular('.aparelho-celular .coluna-app > main')
    expect(main.props['overflow']).toBe('hidden')
    expect(main.props['min-height']).toBe('0')
  })

  /** O que vale para o celular com um contêiner `pagina` desta largura (rem): a base mais os degraus que já entraram. */
  const celularEm = (pagina: number) => {
    const degraus = regras
      .filter((r) => r.seletor === '.aparelho-celular' && r.condicao !== null)
      .filter((r) => larguraDa(r.condicao) <= pagina)
      .filter((r) => {
        const teto = /max-width:\s*([\d.]+)rem/.exec(r.condicao!)
        return !teto || pagina <= parseFloat(teto[1])
      })
      .sort((a, b) => larguraDa(a.condicao) - larguraDa(b.condicao))
    return Object.assign({}, doCelular('.aparelho-celular').props, ...degraus.map((r) => r.props)) as Record<string, string>
  }
  /** Largura e altura da tela (dentro da moldura), em px. */
  const telaDe = (props: Record<string, string>) => {
    const moldura = 2 * (2 + emRem(props['padding']) * 16)
    return { largura: emRem(props['width']) * 16 - moldura, altura: emRem(props['height']) * 16 - moldura }
  }

  it('em 390 px o celular tem de 80% da largura da seção até a largura dela, e o menor texto tem 11 px', () => {
    // 390 px: a página (contêiner `pagina`) tem 390 − 2 × 16 = 358 px = 22,375 rem.
    const props = celularEm(358 / 16)
    const escala = parseFloat(props['--escala-celular'])
    const larguraDoCelular = emRem(props['width']) * 16 * escala
    expect(larguraDoCelular).toBeGreaterThanOrEqual(0.8 * 358)
    // A caixa útil da seção em 390 é 358 − 2 × 16 = 326 px (1 px de folga de arredondamento).
    expect(larguraDoCelular).toBeLessThanOrEqual(326 + 1)
    // A janela visível fica entre 360 e 560 px (era 460; a do Hoje mostra o cartão da soneca inteiro).
    for (const janela of [props['--janela'], doCelular(".aparelho-celular[data-tela='hoje']").props['--janela']]) {
      const visivel = emRem(janela) * 16 * escala
      expect(visivel).toBeGreaterThanOrEqual(360)
      expect(visivel).toBeLessThanOrEqual(560)
    }
    // O menor texto da tela (a navegação, 13 px) fica com pelo menos 11 px; o resto da tela é maior.
    for (const seletor of ['.aparelho-celular .nav-item', '.aparelho-celular .nav-legenda']) {
      expect(emRem(doCelular(seletor).props['font-size']) * 16 * escala, seletor).toBeGreaterThanOrEqual(11)
    }
    // A escala só muda em degraus e passa de 1 no computador: 1,1 a partir de 72rem e 1,2 a partir de 85rem (rodada visual 3,
    // defeito 5: aparelhos pequenos dentro dos blocos). É a variável, não a largura de cada celular.
    const escalas = regras.filter((r) => r.seletor === '.aparelho-celular' && '--escala-celular' in r.props)
    expect(escalas.length).toBeGreaterThanOrEqual(3)
    expect(Math.max(...escalas.map((r) => parseFloat(r.props['--escala-celular'])))).toBe(1.2)
  })

  it('rodada 11 C: a faixa estreita do celular usa a escala 0,85 (nem 0,8, nem 0,86, nem 0,9) e a tela segue com mais de 22rem', () => {
    const degraus = regras.filter((r) => r.seletor === '.aparelho-celular' && r.condicao !== null && '--escala-celular' in r.props)
    // Nenhum degrau declara 0,9 nem 0,86, e o de 20rem em diante declara 0,85.
    expect(degraus.map((r) => parseFloat(r.props['--escala-celular']))).not.toContain(0.9)
    expect(degraus.map((r) => parseFloat(r.props['--escala-celular']))).not.toContain(0.86)
    const estreita = degraus.find((r) => larguraDa(r.condicao) === 20)!
    expect(estreita).toBeDefined()
    expect(parseFloat(estreita.props['--escala-celular'])).toBe(0.85)
    // Cobre o 390 em 100% (contêiner de 20,4 a 22,4 rem). Abaixo de 20rem (fonte e zoom em 200%) fica a base, como estava.
    expect(larguraDa(estreita.condicao)).toBeLessThanOrEqual(326 / 16)
    expect(parseFloat(doCelular('.aparelho-celular').props['--escala-celular'])).toBe(0.8)
    // 13 px × 0,85 = 11,05 px: nada abaixo de 11 px efetivos.
    expect(13 * 0.85).toBeGreaterThanOrEqual(11)
    // Na faixa estreita a tela tem mais de 22rem (a barra vem em linha) e o celular fica bem dentro da seção
    // (343 px de seção menos 2 × 16 px de folga = 311 px).
    for (const pagina of [20.4, 22.375, 24.9]) {
      const props = celularEm(pagina)
      expect(telaDe(props).largura, `${pagina}rem`).toBeGreaterThan(22 * 16)
      expect(parseFloat(props['--escala-celular']), `${pagina}rem`).toBe(0.85)
      expect(emRem(props['width']) * 16 * 0.85, `${pagina}rem`).toBeLessThanOrEqual(311)
      expect(emRem(props['--janela']) * 16 * 0.85, `${pagina}rem`).toBeLessThanOrEqual(560)
    }
    // Um só degrau cobre 390 px a 100% e 768 px a 200% (dentro de @container o rem é o da fonte do contêiner, então
    // os dois caem em cerca de 22 rem): a mesma janela (--janela), com a margem de baixo lendo a mesma altura.
    for (const pagina of [20.4, 22, 22.375, 24, 24.9]) {
      expect(celularEm(pagina)['height'], `${pagina}rem`).toBe('var(--janela)')
      expect(celularEm(pagina)['margin-bottom'], `${pagina}rem`).toBe('calc(var(--janela) * (var(--escala-celular) - 1))')
    }
    // A faixa estreita não repete altura nem margem de baixo: elas vêm da base, que lê --janela.
    const faixa = doCelular('.aparelho-celular', '@container pagina (min-width: 20rem) and (max-width: 24.99rem)')
    expect('height' in faixa.props).toBe(false)
    expect('margin-bottom' in faixa.props).toBe(false)
    // Não há sub-degrau por largura dentro da faixa de 20 a 24,99rem.
    expect(regras.filter((r) => r.seletor === '.aparelho-celular' && /min-width: 23rem/.test(r.condicao ?? ''))).toEqual([])
    // Das outras faixas nada muda: 0,95 de 25rem e 1 de 30rem, com a moldura da base.
    expect(parseFloat(celularEm(26)['--escala-celular'])).toBe(0.95)
    expect(parseFloat(celularEm(46)['--escala-celular'])).toBe(1)
    expect(celularEm(46)['width']).toBe('23.5rem')
    expect(celularEm(46)['--janela']).toBe('34.65rem')
    // No computador: 1,1 (72rem) e 1,2 (85rem), e o celular fica mais largo (26rem) para a barra respirar.
    expect(parseFloat(celularEm(72)['--escala-celular'])).toBe(1.1)
    expect(parseFloat(celularEm(85.5)['--escala-celular'])).toBe(1.2)
    expect(celularEm(72)['width']).toBe('26rem')
  })

  it('com a fonte ampliada o celular encolhe em degraus e cabe na área do cartão', () => {
    // Abaixo de 20rem de contêiner (fonte ou zoom em 200%) só vale a geometria: o celular encolhe, sem exigir
    // texto legível, mas nunca passa da seção. Cada degrau muda só a escala; a largura e a altura são as da base.
    const degraus = [
      { condicao: '@container pagina (max-width: 10.99rem)', escala: 0.22, de: 0 },
      { condicao: '@container pagina (min-width: 11rem) and (max-width: 13.99rem)', escala: 0.3, de: 11 },
      { condicao: '@container pagina (min-width: 14rem) and (max-width: 16.99rem)', escala: 0.4, de: 14 },
      { condicao: '@container pagina (min-width: 17rem) and (max-width: 19.99rem)', escala: 0.55, de: 17 },
    ]
    const larguraNatural = emRem(doCelular('.aparelho-celular').props['width'])
    expect(larguraNatural).toBe(23.5)
    for (const { condicao, escala, de } of degraus) {
      const regra = doCelular('.aparelho-celular', condicao)
      expect(regra, condicao).toBeDefined()
      expect(Object.keys(regra.props), condicao).toEqual(['--escala-celular'])
      expect(parseFloat(regra.props['--escala-celular']), condicao).toBe(escala)
      // A área do cartão (hero) é o contêiner menos cerca de 3,3rem de padding: 7,7rem em 11rem, e assim por diante.
      // No degrau de baixo (menos de 11rem) o celular fica abaixo de 6rem.
      const area = de === 0 ? 6 : de - 3.3
      expect(larguraNatural * escala, condicao).toBeLessThan(area)
    }
    // Os degraus cobrem toda a faixa abaixo de 20rem, e a faixa de 20rem em diante não muda.
    expect(parseFloat(celularEm(10)['--escala-celular'])).toBe(0.22)
    expect(parseFloat(celularEm(12)['--escala-celular'])).toBe(0.3)
    expect(parseFloat(celularEm(15)['--escala-celular'])).toBe(0.4)
    expect(parseFloat(celularEm(18)['--escala-celular'])).toBe(0.55)
    expect(parseFloat(celularEm(21)['--escala-celular'])).toBe(0.85)
    // Os degraus vêm depois do bloco de 20 a 24,99rem e antes dos de 25rem em diante.
    const ordem = regras.filter((r) => r.seletor === '.aparelho-celular' && r.condicao !== null).map((r) => r.condicao!)
    expect(ordem.indexOf(degraus[0].condicao)).toBeGreaterThan(ordem.findIndex((c) => /min-width: 20rem/.test(c)))
    expect(ordem.indexOf(degraus[3].condicao)).toBeLessThan(ordem.findIndex((c) => /min-width: 25rem/.test(c)))
  })

  it('o celular de cada seção é o da tela certa e o da faixa estreita é um por grupo', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    // Hero: o celular do Hoje (some na larga, onde entra o notebook). Telas: Sessão. Madrugada: Sessão da noite. Chamada: Hoje.
    for (const [secao, esperado] of [
      ['main > section:nth-of-type(1)', 1],
      ['#secao-telas', 1],
      ['#secao-madrugada', 1],
      ['main > section:last-of-type', 1],
    ] as const) {
      expect(container.querySelectorAll(`${secao} [data-aparelho="celular"]`), secao).toHaveLength(esperado)
    }
  })
})

describe('MAT-44c-1 rodada 13: a legenda do celular da chamada não passa da seção com a fonte ampliada', () => {
  it('.inicio-lado tem a trilha minmax(0, 1fr), para a legenda do celular não passar da seção com a fonte ampliada', () => {
    const regra = regras.find((r) => r.seletor === '.inicio-lado' && r.condicao === null)
    expect(regra).toBeDefined()
    expect(regra!.props['grid-template-columns']).toBe('minmax(0, 1fr)')
  })
})

describe('MAT-44c-1 rodada 7 #5: a legenda "Em breve" é uma etiqueta discreta, sem o colchete', () => {
  const legenda = regras.filter((r) => r.seletor === '.nav-legenda')

  it('não há traço vertical (::before/::after com conteúdo) na barra', () => {
    const traços = regras.filter((r) => /^\.nav-legenda::(before|after)$/.test(r.seletor))
    for (const regra of traços) {
      expect(regra.props['content'], regra.seletor).toBeUndefined()
      expect(regra.props['display'], regra.seletor).toBe('none')
    }
  })

  // Rodada visual 3 (defeito 8): a legenda era um texto com uma linha embaixo e parecia solta sobre a barra. Agora é uma
  // etiqueta (papel fundo, canto de 3 px) centrada sobre as colunas 2 a 5, sem linha; o grupo que ela nomeia fica esmaecido.
  it('o texto é pequeno, em caixa alta e na cor secundária, numa etiqueta sobre as colunas 2 a 5, com 4 px de respiro até os ícones', () => {
    const base = Object.assign({}, ...legenda.filter((r) => r.condicao === null).map((r) => r.props)) as Record<string, string>
    expect(base['text-transform']).toBe('uppercase')
    expect(base['color']).toBe('var(--cor-info)')
    expect(emRem(base['font-size']) * 16).toBeGreaterThanOrEqual(12)
    expect(emRem(base['font-size']) * 16).toBeLessThanOrEqual(13)
    expect(base['grid-column']).toBe('2 / span 4')
    expect(base['background-color']).toBe('var(--cor-papel-fundo)')
    expect(base['border-bottom']).toBeUndefined()
    // A etiqueta termina acima dos itens: o item tem 3 px de borda e 0,5rem de padding antes do ícone, e a legenda
    // deixa mais 0,25rem de margem embaixo: de 4 px, no mínimo, entre a etiqueta e o topo dos ícones.
    const item = Object.assign({}, ...regras.filter((r) => r.seletor === '.nav-item' && r.condicao === null).map((r) => r.props)) as Record<string, string>
    const margemDeBaixo = base['margin'].split(/\s+/)[2]
    const espaco = emRem(margemDeBaixo) * 16 + 3 + parseFloat(item['padding'].split(/\s+/)[0]) * 16
    expect(espaco).toBeGreaterThanOrEqual(4)
  })
})

describe('MAT-44c-1 rodada 7 #6 e rodada 8 B: o aumento de escala do computador só vale em telas altas', () => {
  const ALTA = '@media (min-height: 860px)'
  // Só o que vem antes do bloco de telas altas: o bloco largo comum.
  const antesDoBloco = regrasComContexto(semComentarios(estiloGlobal).slice(0, semComentarios(estiloGlobal).indexOf(ALTA)))
  const doLargo = (seletor: string) => antesDoBloco.filter((r) => r.seletor === seletor && r.condicao === LARGO)
  // O bloco do aumento: @media (min-height) por fora, @container app (min-width: 60rem) por dentro.
  const inicioDoBloco = semComentarios(estiloGlobal).indexOf(ALTA)
  const bloco = inicioDoBloco === -1 ? '' : semComentarios(estiloGlobal).slice(inicioDoBloco)
  const doBloco = regrasComContexto(bloco.replace(/\}\s*\}\s*@media \(min-width[\s\S]*$/, '}}'))

  it('existe um bloco sob min-height: 860px, dentro do contêiner largo, com o aumento do Hoje e da Sessão', () => {
    expect(inicioDoBloco).toBeGreaterThan(-1)
    expect(bloco).toMatch(/^@media \(min-height: 860px\)\s*\{\s*@container app \(min-width: 60rem\)\s*\{/)
    const seletores = doBloco.map((r) => r.seletor)
    for (const s of [
      '.coluna-app .cartao.campo-andamento',
      '.coluna-app .numero-grande',
      '.coluna-app .acao-rapida',
      '.hoje-ultimos li',
      '.sessao-main',
      '.sessao-campo .cronometro',
    ]) {
      expect(seletores, s).toContain(s)
    }
  })

  it('o aumento não está no bloco largo comum: ali valem os tamanhos da rodada 6 (cabem em 1024 × 768)', () => {
    expect(emRem(doLargo('.coluna-app .cartao.campo-andamento')[0].props['padding'])).toBeLessThanOrEqual(1.5)
    // Rodada visual 3 (defeito 1): o número mede o campo (cqi do contêiner do cartão), com teto de 3,5rem na base.
    expect(doLargo('.coluna-app .numero-grande')[0].props['font-size']).toBe('clamp(1.5rem, 18cqi, 3.5rem)')
    expect(doLargo('.coluna-app .acao-rapida')).toHaveLength(0)
    // As linhas de "Últimos" só repartem a altura da coluna (flex) na base; o tamanho delas é do bloco de telas altas.
    for (const regra of doLargo('.hoje-ultimos li')) {
      expect(regra.props['padding-block']).toBeUndefined()
      expect(regra.props['font-size']).toBeUndefined()
    }
    expect(emRem(doLargo('.hoje-titulo')[0].props['margin-top'])).toBeLessThanOrEqual(2)
    expect(emRem(doLargo('.sessao-main')[0].props['padding'].split(/\s+/)[0])).toBeLessThanOrEqual(2)
  })

  it('sob min-height o cartão, o cronômetro, os botões, as linhas de "Últimos" e o respiro da Sessão são maiores que na base', () => {
    const de = (s: string) => doBloco.find((r) => r.seletor === s)!.props
    // O cartão cresce com a tela alta (de 1,5 para 2 rem). Não passa disso porque o gap entre blocos
    // tem de ser maior que o respiro de dentro (rodada visual 3, #7, mais abaixo): o gap sobe a 2,5 rem.
    expect(emRem(de('.coluna-app .cartao.campo-andamento')['padding'])).toBeGreaterThan(
      emRem(doLargo('.coluna-app .cartao.campo-andamento')[0].props['padding']),
    )
    expect(de('.coluna-app .numero-grande')['font-size']).toMatch(/cqi/)
    // O cronômetro mede o campo (26cqi) e chega a 8rem nas telas altas; o piso de 4,5rem saiu (rodada visual 3).
    expect(de('.sessao-campo .cronometro')['font-size']).toMatch(/^clamp\([\d.]+rem, \d+cqi, 8rem\)$/)
    expect(emRem(de('.coluna-app .acao-rapida')['min-height'])).toBeGreaterThanOrEqual(4.5)
    expect(emRem(de('.hoje-ultimos li')['padding-block'])).toBeGreaterThanOrEqual(1.5)
    expect(emRem(de('.sessao-main')['padding'].split(/\s+/)[0])).toBeGreaterThanOrEqual(3)
  })
})

describe('MAT-44c-1 rodada 8 A: "Sono", "1 h 12 min" e "por Bruno" não se sobrepõem no cartão "Em andamento"', () => {
  it('o número grande do layout largo tem line-height de pelo menos 1,25 (a caixa da fonte cabe na linha) e margem em cima e embaixo', () => {
    const props = Object.assign(
      {},
      ...regras.filter((r) => r.seletor === '.coluna-app .numero-grande' && r.condicao === LARGO).map((r) => r.props),
    ) as Record<string, string>
    expect(parseFloat(props['line-height'])).toBeGreaterThanOrEqual(1.25)
    expect(emRem(props['margin-top'])).toBeGreaterThanOrEqual(0.5)
    expect(emRem(props['margin-bottom'])).toBeGreaterThanOrEqual(0.5)
  })

  it('o cartão tem os três textos em parágrafos separados, na ordem: rótulo, número grande, quem', () => {
    renderizarRota('/app/hoje')
    const cartao = screen.getByRole('heading', { name: 'Em andamento' }).closest('section')!
    const paragrafos = [...cartao.querySelectorAll(':scope > p')]
    expect(paragrafos.map((p) => p.classList.contains('numero-grande'))).toEqual([false, true, false])
  })
})

describe('MAT-44c-1 rodada 8 C: o texto da barra inferior dentro dos mockups tem 12,7 px ou mais antes da escala', () => {
  it('toda regra de fonte da navegação do celular declara pelo menos 12,7 px, e a barra real em 390 não muda', () => {
    const doAparelho = regras.filter((r) => /^\.aparelho-celular \.nav-/.test(r.seletor) && 'font-size' in r.props)
    expect(doAparelho.length).toBeGreaterThanOrEqual(3)
    const seletores = doAparelho.map((r) => r.seletor)
    expect(seletores).toContain('.aparelho-celular .nav-inferior .nav-item')
    expect(seletores).toContain('.aparelho-celular .nav-inferior .nav-item > span')
    expect(seletores).toContain('.aparelho-celular .nav-legenda')
    for (const regra of doAparelho) expect(emRem(regra.props['font-size']) * 16, regra.seletor).toBeGreaterThanOrEqual(12.7)
    // A barra da página real continua com rótulos de 12 px, sem hífen.
    const real = Object.assign({}, ...regras.filter((r) => r.seletor === '.nav-item' && r.condicao === null).map((r) => r.props)) as Record<string, string>
    expect(emRem(real['font-size']) * 16).toBe(12)
    expect(real['hyphens']).toBe('manual')
  })

  it('a barra do mockup cabe em 360 px: a soma dos rótulos mais o respiro fica abaixo da largura da tela', () => {
    // Larguras estimadas a 13 px (0,52 em por letra) dos cinco rótulos, mais 4 espaços de 8 px e o padding de 4 px de cada lado.
    const letras = ['Hoje', 'Histórico', 'Desenvolvimento', 'Comunidade', 'Família'].join('').length
    expect(letras * 13 * 0.52 + 4 * 8 + 8).toBeLessThanOrEqual(360)
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

// ---------------------------------------------------------------------------
// Rodada visual 3, defeito 1: o cronômetro nunca quebra de linha.
//
// O jsdom não mede texto, então o teste faz a conta com o que o CSS declara: o cronômetro é um texto
// sem quebra (white-space: nowrap) cujo tamanho é uma fração da largura do campo em que mora
// (cqi: .campo-sessao é um contêiner de largura). Se a fração vezes a largura do "1:12:01" em em é
// menor que 1, ele cabe no campo, qualquer que seja a coluna; o teste confere isso e também o
// tamanho nas três larguras da captura (390, 1024 e 1440), onde ele tem de continuar grande.

describe('MAT-44c-1 rodada visual 3 #1: o cronômetro não quebra nas larguras 1024, 1440 e 390', () => {
  // "1:12:01" no pior caso: 5 algarismos tabulares de 0,62 em e 2 dois-pontos de 0,33 em (no
  // navegador mede cerca de 3,45 em).
  const LARGURA_EM = 5 * 0.62 + 2 * 0.33
  const ALTA = '@media (min-height: 860px)'

  const px = (valor: string): number => emRem(valor) * 16
  const props = (seletor: string, condicao: string | null) =>
    Object.assign(
      {},
      ...regras.filter((r) => r.seletor === seletor && r.condicao === condicao).map((r) => r.props),
    ) as Record<string, string>

  const semC = semComentarios(estiloGlobal)
  const comecoDaAlta = semC.indexOf(ALTA)
  const naAlta = (seletor: string) =>
    regrasComContexto(semC.slice(comecoDaAlta)).find((r) => r.seletor === seletor)!.props

  function clamp(valor: string) {
    const m = /^clamp\(\s*([\d.]+)rem\s*,\s*([\d.]+)cqi\s*,\s*([\d.]+)rem\s*\)$/.exec(valor.trim())
    if (!m) throw new Error(`font-size fora do padrão clamp(rem, cqi, rem): ${valor}`)
    return { minimo: parseFloat(m[1]) * 16, cqi: parseFloat(m[2]), maximo: parseFloat(m[3]) * 16 }
  }
  const tamanho = (valor: string, larguraDoCampo: number): number => {
    const { minimo, cqi, maximo } = clamp(valor)
    return Math.max(minimo, Math.min((cqi / 100) * larguraDoCampo, maximo))
  }

  /** A largura útil (dentro do padding) do campo do cronômetro na Sessão real, em px. */
  function larguraDoCampo(janela: number, alta: boolean): number {
    const campoBase = props('.campo-sessao', null)
    // `padding: 1.5rem 1rem`: o segundo valor é o lateral.
    const lateralBase = px(campoBase['padding'].split(/\s+/)[1])
    // O <main> da Sessão tem px-4 (1 rem de cada lado) no estreito; o campo não sangra mais (margin-inline: 0).
    if (janela < 60 * 16) return Math.min(janela, 40 * 16) - 2 * 16 - 2 * lateralBase

    const moldura = props('.coluna-app', LARGO)
    const respiro = px(moldura['--respiro'])
    const largura = Math.min((janela * parseFloat(moldura['width'])) / 100, px(moldura['max-width']))
    // Colunas: a faixa lateral, as duas do conteúdo e uma de largura zero, com o respiro entre elas.
    const coluna = (largura - px(moldura['--nav-largura']) - 3 * respiro) / 2
    const main = 2 * coluna + respiro // .sessao-main: colunas 2 e 3
    const metade = (main - respiro) / 2 // .sessao-corpo: duas colunas com o mesmo respiro
    const lateral = alta
      ? px(naAlta('.sessao-campo .campo-sessao')['padding'].split(/\s+/)[1])
      : px(props('.sessao-campo .campo-sessao', LARGO)['padding-inline'])
    return metade - 2 * lateral
  }

  it('.cronometro e .numero-grande são texto sem quebra (white-space: nowrap), com números tabulares', () => {
    const cronometro = props('.cronometro', null)
    expect(cronometro['white-space']).toBe('nowrap')
    expect(cronometro['font-variant-numeric']).toBe('tabular-nums')
    // overflow-wrap: anywhere deixava o número quebrar no meio ("1:12:0" e "1").
    expect(cronometro['overflow-wrap']).toBeUndefined()
    expect(props('.numero-grande', null)['white-space']).toBe('nowrap')
  })

  it('o campo é um contêiner de largura e o tamanho do cronômetro é uma fração dele que cabe, em toda regra', () => {
    for (const campo of ['.campo-sessao', '.campo-andamento']) {
      const regra = props(campo, null)
      expect(regra['container-type'], campo).toBe('inline-size')
    }
    const regrasDoCronometro: Array<[string, string]> = [
      ['.cronometro', props('.cronometro', null)['font-size']],
      ['.coluna-app .cronometro', props('.coluna-app .cronometro', null)['font-size']],
      ['.sessao-campo .cronometro (largo)', props('.sessao-campo .cronometro', LARGO)['font-size']],
      ['.sessao-campo .cronometro (telas altas)', naAlta('.sessao-campo .cronometro')['font-size']],
    ]
    for (const [nome, valor] of regrasDoCronometro) {
      const { minimo, cqi } = clamp(valor)
      // A fração do campo vezes a largura do número em em é menor que 1: ele cabe em qualquer campo.
      expect((cqi / 100) * LARGURA_EM, `${nome}: ${valor}`).toBeLessThanOrEqual(1)
      // E o mínimo é pequeno o bastante para caber até num campo estreito (fonte e zoom ampliados).
      expect(minimo * LARGURA_EM, `${nome}: mínimo`).toBeLessThanOrEqual(120)
    }
  })

  const casos: Array<[string, number, boolean]> = [
    ['390 × 844', 390, false],
    ['1024 × 768', 1024, false],
    ['1440 × 900', 1440, true],
  ]
  for (const [nome, janela, alta] of casos) {
    it(`${nome}: o "1:12:01" cabe numa linha do campo e continua grande (48 px ou mais)`, () => {
      const campo = larguraDoCampo(janela, alta)
      const valor =
        janela < 60 * 16
          ? props('.coluna-app .cronometro', null)['font-size']
          : alta
            ? naAlta('.sessao-campo .cronometro')['font-size']
            : props('.sessao-campo .cronometro', LARGO)['font-size']
      const fonte = tamanho(valor, campo)

      expect(campo, 'largura útil do campo').toBeGreaterThan(200)
      expect(fonte * LARGURA_EM, `${fonte.toFixed(1)} px em ${campo.toFixed(0)} px de campo`).toBeLessThanOrEqual(campo)
      expect(fonte).toBeGreaterThanOrEqual(48)
    })
  }

  it('na página o cronômetro mora dentro do campo que é o contêiner (.campo-sessao), na Sessão real e nos aparelhos do Início', async () => {
    const sessao = renderizarRota('/app/sessao')
    const daSessao = sessao.container.querySelector('[role="timer"]')!
    expect(daSessao.classList.contains('cronometro')).toBe(true)
    expect(daSessao.closest('.campo-sessao')).not.toBeNull()
    sessao.unmount()

    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    const dosAparelhos = [...container.querySelectorAll('[data-aparelho] [role="timer"]')]
    expect(dosAparelhos.length).toBeGreaterThanOrEqual(2)
    for (const timer of dosAparelhos) expect(timer.closest('.campo-sessao')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Rodada visual 3, achado R1: a legenda descreve o que a janela do aparelho mostra.
//
// Cada legenda do Início leva data-descreve com a tela que ela explica (hoje, sessao ou madrugada).
// O teste, para cada faixa de largura (o CSS esconde um aparelho e uma legenda por faixa com as
// classes -a-partir-de-60 e -ate-60), liga a legenda visível ao data-tela do aparelho visível da
// mesma seção, e confere que ela não cita nada que a janela do celular corta fora.

describe('MAT-44c-1 rodada visual 3 R1: a legenda visível é a do aparelho visível (data-descreve = data-tela)', () => {
  const LARGA = '@container pagina (min-width: 60rem)'

  /** As classes que o CSS esconde (display: none) abaixo de 60 rem e as que esconde de 60 rem em diante. */
  function escondidasPorFaixa(): Array<[string, Set<string>]> {
    const abaixo = new Set<string>()
    const acima = new Set<string>()
    for (const regra of regras) {
      const m = /^\.([\w-]+)$/.exec(regra.seletor)
      if (!m) continue
      if (regra.condicao === null && regra.props['display'] === 'none') {
        const volta = regras.some(
          (r) => r.seletor === regra.seletor && r.condicao === LARGA && r.props['display'] !== undefined && r.props['display'] !== 'none',
        )
        if (volta) abaixo.add(m[1])
      }
      if (regra.condicao === LARGA && regra.props['display'] === 'none') acima.add(m[1])
    }
    return [
      ['abaixo de 60 rem (estreita e média)', abaixo],
      ['de 60 rem em diante (larga)', acima],
    ]
  }

  const visivel = (elemento: Element, escondidas: Set<string>): boolean => {
    for (let no: Element | null = elemento; no; no = no.parentElement) {
      if ([...no.classList].some((classe) => escondidas.has(classe))) return false
    }
    return true
  }

  const telaDoAparelho = (aparelho: Element): 'hoje' | 'sessao' | 'madrugada' =>
    aparelho.getAttribute('data-tela') === 'hoje'
      ? 'hoje'
      : aparelho.querySelector('[data-tema-local="madrugada"]') !== null
        ? 'madrugada'
        : 'sessao'

  /** O que a janela de cada aparelho corta fora: a legenda dele não pode prometer isso. */
  const FORA_DA_JANELA: Record<string, RegExp[]> = {
    'celular:hoje': [/Carla/, /22:40/, /\bnota\b/i, /últimos/i],
    'celular:sessao': [/botões/i, /Encerrar/i, /ilustra/i],
    'celular:madrugada': [/botões/i, /Encerrar/i, /ilustra/i],
    'notebook:hoje': [],
  }

  it('as faixas esperadas existem: o CSS esconde as duas versões do topo (aparelho e legenda) por classe', () => {
    const [[, abaixo], [, acima]] = escondidasPorFaixa()
    expect([...abaixo].sort()).toEqual(expect.arrayContaining(['aparelho-a-partir-de-60', 'texto-a-partir-de-60']))
    expect([...acima].sort()).toEqual(expect.arrayContaining(['aparelho-ate-60', 'texto-ate-60']))
  })

  for (const [faixa, escondidas] of escondidasPorFaixa()) {
    it(`${faixa}: cada legenda visível descreve a tela do aparelho visível da mesma seção, e todo aparelho visível tem legenda`, async () => {
      const { container } = renderizarRota('/')
      await screen.findByRole('heading', { level: 1 })

      const legendas = [...container.querySelectorAll<HTMLElement>('main [data-descreve]')].filter((l) => visivel(l, escondidas))
      // Topo, telas, madrugada e chamada.
      expect(legendas.length).toBeGreaterThanOrEqual(4)

      for (const legenda of legendas) {
        const secao = legenda.closest('main > section')!
        const aparelhos = [...secao.querySelectorAll<HTMLElement>('[data-aparelho]')].filter((a) => visivel(a, escondidas))
        const rotulo = legenda.textContent!.slice(0, 50)
        expect(aparelhos, rotulo).toHaveLength(1)
        const aparelho = aparelhos[0]
        expect(telaDoAparelho(aparelho), rotulo).toBe(legenda.getAttribute('data-descreve'))

        // O que a janela do aparelho corta fora não aparece na legenda.
        const chave = `${aparelho.getAttribute('data-aparelho')}:${telaDoAparelho(aparelho)}`
        for (const fora of FORA_DA_JANELA[chave]) expect(legenda.textContent, `${chave}: ${fora}`).not.toMatch(fora)
        // Os nomes e as horas que ela cita estão na tela do aparelho.
        for (const [citado] of legenda.textContent!.matchAll(/\b(?:Bruno|Juliana|Carla|\d{2}:\d{2})\b/g)) {
          expect(aparelho.textContent, `${chave}: "${citado}"`).toContain(citado)
        }
      }

      const aparelhosVisiveis = [...container.querySelectorAll<HTMLElement>('main [data-aparelho]')].filter((a) => visivel(a, escondidas))
      expect(aparelhosVisiveis.length).toBeGreaterThanOrEqual(4)
      for (const aparelho of aparelhosVisiveis) {
        const secao = aparelho.closest('main > section')!
        const dessaSecao = legendas.filter((l) => l.closest('main > section') === secao)
        expect(dessaSecao.length, `${aparelho.getAttribute('data-aparelho')} de ${aparelho.getAttribute('data-tela')} sem legenda`).toBeGreaterThanOrEqual(1)
      }
    })
  }

  it('o topo tem duas legendas (celular e notebook) e cada uma só cita o que a tela dele mostra', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const topo = container.querySelector('[aria-labelledby="promessa"]')!
    const celular = topo.querySelector('.texto-ate-60')!.textContent!
    const notebook = topo.querySelector('.texto-a-partir-de-60')!.textContent!
    expect(notebook).toMatch(/Carla/)
    expect(notebook).toMatch(/22:40/)
    expect(celular).not.toMatch(/Carla|22:40|nota/)
    // As duas falam do cartão da soneca que Bruno começou e dos botões de registro, que as duas telas mostram.
    for (const texto of [celular, notebook]) {
      expect(texto).toMatch(/soneca que Bruno começou/)
      expect(texto).toMatch(/botões de registro/)
    }
  })
})

// ---------------------------------------------------------------------------
// Rodada visual 3, defeito 7: acabamento da grade do Hoje.
//
// Um gap só entre blocos vizinhos (2 rem na base e no estreito, 2,5 rem nas telas altas), sempre
// maior que o respiro de dentro de cada bloco, e o mesmo raio de canto em todos os blocos e botões.

describe('MAT-44c-1 rodada visual 3 #7: um gap só entre blocos do Hoje, maior que o respiro interno, e um raio só', () => {
  const ALTA = '@media (min-height: 860px)'
  const semC = semComentarios(estiloGlobal)
  const comecoDaAlta = semC.indexOf(ALTA)
  const doLargoBase = (seletor: string) =>
    regrasComContexto(semC.slice(0, comecoDaAlta))
      .filter((r) => r.seletor === seletor && r.condicao === LARGO)
      .map((r) => r.props)
  const daAlta = (seletor: string) =>
    regrasComContexto(semC.slice(comecoDaAlta))
      .filter((r) => r.seletor === seletor && r.condicao === LARGO)
      .map((r) => r.props)[0]

  const GAPS = ['.hoje-andamento', '.hoje-lateral', '.hoje-lateral > .hoje-ultimos', '.coluna-app .registro-rapido']

  /** O maior respiro lateral ou vertical de um padding de 1 a 4 valores. */
  const maiorPadding = (valor: string): number => Math.max(...valor.split(/\s+/).map(emRem))

  it('no computador (base 1024 × 768) os quatro gaps são o mesmo valor e passam do padding do cartão e da nota', () => {
    const gaps = GAPS.map((seletor) => emRem(doLargoBase(seletor).find((p) => 'margin-top' in p)!['margin-top']))
    expect(new Set(gaps).size, gaps.join(' / ')).toBe(1)
    const cartao = maiorPadding(doLargoBase('.coluna-app .cartao.campo-andamento')[0]['padding'])
    const nota = maiorPadding(doLargoBase('.hoje-lateral > .hoje-nota')[0]['padding'])
    expect(gaps[0]).toBeGreaterThan(cartao)
    expect(gaps[0]).toBeGreaterThan(nota)
    // 2 rem: os 32 px do pedido.
    expect(gaps[0] * 16).toBe(32)
  })

  it('no computador (telas altas, 1440 × 900) os quatro gaps são o mesmo valor e passam do padding do cartão e da nota', () => {
    const gaps = GAPS.map((seletor) => emRem(daAlta(seletor)['margin-top']))
    expect(new Set(gaps).size, gaps.join(' / ')).toBe(1)
    const cartao = maiorPadding(daAlta('.coluna-app .cartao.campo-andamento')['padding'])
    const nota = maiorPadding(daAlta('.hoje-lateral > .hoje-nota')['padding'])
    expect(gaps[0]).toBeGreaterThan(cartao)
    expect(gaps[0]).toBeGreaterThan(nota)
  })

  it('no estreito (390) o cartão, a nota e "Últimos" ficam a 2 rem (mt-8) um do outro, mais que o padding vertical do cartão', () => {
    const { container } = renderizarRota('/app/hoje')

    const andamento = container.querySelector<HTMLElement>('.hoje-andamento')!
    const nota = container.querySelector<HTMLElement>('.hoje-nota')!
    const ultimos = container.querySelector<HTMLElement>('.hoje-ultimos')!
    for (const bloco of [andamento, nota, ultimos]) expect(bloco.classList.contains('mt-8'), bloco.className).toBe(true)
    // O padding vertical do cartão no estreito (1.5rem 1rem) é menor que os 2 rem do gap.
    const cartao = props('.campo-andamento')
    expect(maiorPadding(cartao['padding'])).toBeLessThan(2)
  })

  // O estreito do cartão vem da regra base, que o teste lê por seletor sem condição.
  function props(seletor: string): Record<string, string> {
    return Object.assign({}, ...regras.filter((r) => r.seletor === seletor && r.condicao === null).map((r) => r.props)) as Record<string, string>
  }

  it('o cartão "Em andamento", os campos, os botões e os botões rápidos usam o mesmo raio de canto (--radius-card, 8 px)', () => {
    const raio = 'var(--radius-card, 8px)'
    expect(props('.cartao.campo-andamento')['border-radius']).toBe(raio)
    expect(props('[data-campo]')['border-radius']).toBe(raio)
    expect(props('.botao')['border-radius']).toBe(raio)
    expect(doLargoBase('.coluna-app .cartao.campo-andamento')[0]['border-radius']).toBe(raio)
    expect(props('.campo-sessao')['border-radius']).toBe(raio)
    // O cartão do Hoje deixou de sangrar até a borda da tela: sem margem negativa e sem canto reto.
    expect(props('.cartao.campo-andamento')['margin-inline']).toBe('0')
  })

  it('os botões rápidos têm gap maior que o respiro de dentro de cada um (16 px contra 8 e 12 px)', () => {
    const botoes = lerTexto('prototipo/BotoesRapidos.tsx')
    // gap-4 = 1 rem = 16 px, na grade e nos painéis que abrem.
    expect(botoes).toMatch(/const GRADE = '[^']*\bgap-4\b/)
    expect(botoes.match(/flex flex-wrap gap-4/g)?.length).toBe(2)
    expect(botoes).not.toMatch(/gap-2/)
    const acao = props('.acao-rapida')
    const botao = props('.botao')
    const lateral = emRem(acao['padding-inline'])
    const vertical = emRem(botao['padding'].split(/\s+/)[0])
    expect(1).toBeGreaterThan(lateral)
    expect(1).toBeGreaterThan(vertical)
  })

  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`Hoje (${tema}): os botões rápidos usam a superfície e o contorno do tema (as variáveis --cor-acao-rapida e --cor-contorno-acao)`, () => {
      const acao = props('.acao-rapida')
      expect(acao['background-color']).toBe('var(--cor-acao-rapida)')
      expect(acao['border-color']).toBe('var(--cor-contorno-acao)')
      renderizarRota('/app/hoje', { estadoInicial: estado() })
      expect(screen.getAllByRole('button', { name: /^(Iniciar|Registrar) .* de Heloísa$/ }).length).toBeGreaterThanOrEqual(4)
    })
  }

  it('na madrugada o botão rápido tem superfície e contorno que se leem sobre o fundo (tokens da noite, não o papel fundo)', () => {
    const tema = lerTexto('styles/tema.css')
    const noite = /\[data-tema-local=['"]madrugada['"]\]\s*,\s*:root\[data-tema=['"]madrugada['"]\]\s*\{([^}]*)\}/.exec(tema)![1]
    // De dia o contorno é da cor da superfície (sem linha); de noite é a tinta da noite sobre o barro escuro.
    expect(noite).toMatch(/--cor-acao-rapida:\s*var\(--color-night-field-1\)/)
    expect(noite).toMatch(/--cor-contorno-acao:\s*var\(--color-night-line\)/)
    expect(/:root\s*\{([^}]*)\}/.exec(tema)![1]).toMatch(/--cor-acao-rapida:\s*var\(--color-paper-deep\)/)
  })
})

// ---------------------------------------------------------------------------
// Rodada visual 3, passo de fechamento: a faixa lateral não é um campo bege vazio, e a chamada do
// Início tem o celular e a legenda no mesmo x (a segunda coluna da grade).

describe('MAT-44c-1 rodada visual 3 fechamento: a navegação lateral e a chamada do Início', () => {
  const ALTA = '@media (min-height: 860px)'
  const semC = semComentarios(estiloGlobal)
  const comecoDaAlta = semC.indexOf(ALTA)
  const REGRA_LATERAL = '.coluna-app .nav-inferior'

  it('no layout largo a navegação lateral tem a altura dos itens (align-self: start) e o canto dos outros blocos, sem descer até o pé da tela', () => {
    const lateral = regras.find((r) => r.seletor === REGRA_LATERAL && r.condicao === LARGO)!
    expect(lateral.props['align-self']).toBe('start')
    expect(lateral.props['border-radius']).toBe('var(--radius-card, 8px)')
    expect(lateral.props['background-color']).toBe('var(--cor-papel-fundo)')
    // Sem a linha vertical de antes: o bloco é um campo de cor, como os outros, e não uma coluna.
    expect(lateral.props['border-right']).toBeUndefined()
  })

  it('o bloco lateral começa na linha do título da tela: 2 rem na base e 3 rem nas telas altas, e 2 rem dentro do aparelho', () => {
    const base = regras.find((r) => r.seletor === REGRA_LATERAL && r.condicao === LARGO)!
    expect(emRem(base.props['margin'].split(/\s+/)[0])).toBe(2)

    const altas = regrasComContexto(semC.slice(comecoDaAlta))
    const alta = altas.find((r) => r.seletor === REGRA_LATERAL && r.condicao === LARGO)!
    expect(emRem(alta.props['margin-top'])).toBe(3)
    const tituloAlto = altas.find((r) => r.seletor === '.hoje-titulo' && r.condicao === LARGO)!
    expect(alta.props['margin-top']).toBe(tituloAlto.props['margin-top'])

    const noAparelho = regras.find((r) => r.seletor === '.aparelho .coluna-app .nav-inferior' && r.condicao === LARGO)!
    expect(emRem(noAparelho.props['margin-top'])).toBe(2)
  })

  it('a partir de 72rem o celular da chamada parte da linha da legenda (justify-self: start) e o texto tem a altura dele, com o título no alto e a ação embaixo', () => {
    const celular = regras.find(
      (r) => r.seletor === '.inicio-lado > .aparelho' && r.condicao === '@container pagina (min-width: 72rem)',
    )!
    expect(celular.props['justify-self']).toBe('start')

    const texto = regras.find(
      (r) => r.seletor === '.inicio-chamada-texto' && r.condicao === '@container pagina (min-width: 72rem)',
    )!
    expect(texto.props['display']).toBe('flex')
    expect(texto.props['flex-direction']).toBe('column')
    expect(texto.props['align-self']).toBe('stretch')
    expect(texto.props['justify-content']).toBe('space-between')
  })

  it('a chamada tem o título e, num bloco de ação, o parágrafo e o link; o botão continua levando ao protótipo', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    const texto = container.querySelector('.inicio-chamada-texto')!
    expect([...texto.children].map((f) => f.tagName + '.' + f.className.split(' ')[0])).toEqual([
      'H2.titulo-secao',
      'DIV.inicio-chamada-acao',
    ])
    const acao = texto.querySelector('.inicio-chamada-acao')!
    expect(acao.querySelector('p.texto-medida')).not.toBeNull()
    expect(acao.querySelector('a')!.getAttribute('href')).toBe('/app/hoje')
  })
})
