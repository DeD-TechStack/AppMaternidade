import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { ITENS_DO_CABECALHO } from './componentes/casca/textos.ts'
import { INI } from './conteudo/inicio.ts'
import type { TipoSessao } from './dados/rotina.tipos.ts'
import { renderizarRota, renderizarRotaPronta, type OpcoesRota } from './teste/renderizarRota.tsx'
import { PESSOAS } from './teste/renderizarComDados.tsx'
import { comSessaoEmAndamento, semSessaoEmAndamento } from './teste/rotina.fixture.ts'
import { listarFontes, pastaSrcDe } from './teste/fontes.ts'
import { frasesSoltas } from './teste/frasesSoltas.ts'

// MAT-44: o salto visual de Início, Hoje e Sessão. O jsdom não pinta nada; estes testes conferem
// o que dá para conferir no código: os tokens, a estrutura dos campos, dos aparelhos e das
// ilustrações, as rotas do cabeçalho e as dependências de movimento.

const pastaSrc = pastaSrcDe(import.meta.url)
const lerTexto = (relativo: string) => readFileSync(pastaSrc + relativo, 'utf8')
const tokensCss = lerTexto('styles/tokens.css')
const temaCss = lerTexto('styles/tema.css')
const estiloGlobal = lerTexto('index.css')

const claro: OpcoesRota = { madrugada: false }
const madrugada: OpcoesRota = { madrugada: true }
const semSessao: OpcoesRota = { ajustarRotina: semSessaoEmAndamento }
const sessaoDe = (tipo: TipoSessao): OpcoesRota => ({
  ajustarRotina: comSessaoEmAndamento(tipo, 60_000, PESSOAS.juliana.id),
})

function lerTokens(css: string): Record<string, string> {
  const bloco = /@theme(?:\s+static)?\s*\{([^}]*)\}/.exec(css)
  if (!bloco) throw new Error('bloco @theme não encontrado em tokens.css')
  const cores: Record<string, string> = {}
  for (const [, nome, hex] of bloco[1].matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    cores[nome] = hex
  }
  return cores
}

/** Matiz (graus) e saturação (0 a 1) em HSL. */
function hsl(hex: string): { matiz: number; saturacao: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const luz = (max + min) / 2
  if (delta === 0) return { matiz: 0, saturacao: 0 }
  let matiz: number
  if (max === r) matiz = ((g - b) / delta) % 6
  else if (max === g) matiz = (b - r) / delta + 2
  else matiz = (r - g) / delta + 4
  matiz *= 60
  if (matiz < 0) matiz += 360
  return { matiz, saturacao: delta / (1 - Math.abs(2 * luz - 1)) }
}

const tokens = lerTokens(tokensCss)
const blocosDoTema = {
  claro: /:root\s*\{([^}]*)\}/.exec(temaCss)?.[1],
  madrugada: /:root\[data-tema=['"]madrugada['"]\]\s*\{([^}]*)\}/.exec(temaCss)?.[1],
}

function tokenDoTema(tema: keyof typeof blocosDoTema, papel: string) {
  const bloco = blocosDoTema[tema]
  expect(bloco, `bloco ${tema} em tema.css`).toBeDefined()
  const token = new RegExp(`--cor-${papel}:\\s*var\\(--color-([a-z0-9-]+)\\)`).exec(bloco ?? '')?.[1]
  if (!token || !tokens[token]) throw new Error(`--cor-${papel} sem token de cor válido (${tema})`)
  return token
}

const corDoTema = (tema: keyof typeof blocosDoTema, papel: string) => tokens[tokenDoTema(tema, papel)]

describe('MAT-44: matiz e saturação dos campos de cor', () => {
  // DESIGN.md, Colors: mel e areia substituem o veto antigo a amarelo/âmbar no tema claro.
  // Os campos 1 e 2 são aliases de compatibilidade; o cartão da sessão ainda usa campo-sessao.
  it.each([
    ['claro', 'destaque', 'mel'],
    ['claro', 'campo-1', 'areia'],
    ['claro', 'campo-2', 'areia'],
    ['claro', 'campo-sessao', 'mel'],
    ['madrugada', 'destaque', 'mel'],
  ] as const)('paleta aprovada: %s liga %s ao token %s', (tema, papel, token) => {
    expect(tokenDoTema(tema, papel)).toBe(token)
  })

  it.each([
    ['areia', '#EADDC5'],
    ['mel', '#F2C14E'],
    ['mel-claro', '#F7D684'],
  ])('paleta aprovada: %s mantém o valor de DESIGN.md', (token, hex) => {
    expect(tokens[token]?.toUpperCase()).toBe(hex)
  })

  for (const tema of ['claro', 'madrugada'] as const) {
    const campos = ['campo-1', 'campo-2', 'campo-sessao']
    it(`existe pelo menos um campo de cor (${tema})`, () => {
      expect(campos.map((papel) => corDoTema(tema, papel)).length).toBeGreaterThanOrEqual(1)
    })

    if (tema === 'claro') continue
    for (const papel of campos) {
      it(`${papel} (${tema}) fica fora do intervalo de matiz [35°, 65°] (amarelo e âmbar)`, () => {
        const { matiz } = hsl(corDoTema(tema, papel))
        expect(matiz < 35 || matiz > 65, `matiz de ${papel}: ${matiz.toFixed(1)}°`).toBe(true)
      })
    }

    for (const papel of campos) {
      it(`${papel} (${tema}) tem saturação HSL de no máximo 35%`, () => {
        const { saturacao } = hsl(corDoTema(tema, papel))
        expect(saturacao, `saturação de ${papel}`).toBeLessThanOrEqual(0.35)
      })
    }
  }
})

describe('MAT-44: variáveis de uso dos campos', () => {
  it('paleta aprovada: os campos da madrugada usam cartão da noite, com papel no cronômetro', () => {
    expect(['campo-1', 'campo-2', 'campo-sessao', 'numero-sessao'].map((papel) => tokenDoTema('madrugada', papel)))
      .toEqual(['noite-cartao', 'noite-cartao', 'noite-cartao', 'papel'])
    expect(corDoTema('madrugada', 'campo-sessao').toUpperCase()).toBe('#3A302B')
    expect(tokenDoTema('claro', 'numero-sessao')).toBe('cacau')
    for (const tema of ['claro', 'madrugada'] as const) {
      expect(tokenDoTema(tema, 'sobre-destaque')).toBe('cacau')
    }
  })

  it('o invólucro local da madrugada usa o mesmo bloco da madrugada da página', () => {
    expect(temaCss).toMatch(/\[data-tema-local=['"]madrugada['"]\]\s*,\s*:root\[data-tema=['"]madrugada['"]\]\s*\{/)
  })

  it('paleta aprovada: as faixas públicas usam os quatro chãos e a tinta prescrita para cada um', () => {
    // DESIGN.md, Colors: mel é luz, não chão. A regra vale também no lado da costura.
    const regras = regrasComContexto(lerTexto('componentes/secoes/secoes.css')).filter((r) => r.condicao === null)
    const fundos = regras.filter((r) => /^(\[data-faixa\]|\[data-faixa-lado\])\[data-faixa-fundo=/.test(r.seletor) && r.props['background-color'])
    const combinacoes = [
      ['papel', 'papel', 'cacau'],
      ['areia', 'areia', 'cacau'],
      ['cacau', 'cacau', 'papel'],
      ['chao-noite', 'texto-2', 'papel'],
    ]
    expect(fundos.map((r) => r.seletor).sort()).toEqual(combinacoes.flatMap(([chao]) =>
      ['data-faixa', 'data-faixa-lado'].map((atributo) => `[${atributo}][data-faixa-fundo='${chao}']`),
    ).sort())
    for (const [chao, fundo, tinta] of combinacoes) {
      expect(fundos.filter((r) => r.seletor.endsWith(`[data-faixa-fundo='${chao}']`)).map((r) => r.props['background-color']))
        .toEqual([`var(--color-${fundo})`, `var(--color-${fundo})`])
      expect(regras.filter((r) => r.seletor === `[data-faixa-fundo='${chao}']` && r.props.color).map((r) => r.props.color))
        .toEqual([`var(--color-${tinta})`])
    }
  })
})

// AGY-02: associações editoriais da Início, não os defaults do componente de demo.
const CSS_INICIO = 'componentes/inicio-composicao/composicao.css'
const FAIXA_LARGA_INICIO = '(min-width: 69em) and (min-aspect-ratio: 1/1)'
const FONES_DO_INICIO = [
  { fluxo: 'historico', titulo: 'Histórico', tituloNoPainel: 'Histórico', grupo: 'Tela interativa do Histórico', arquivo: 'historico', cena: INI.h2Noite, texto: INI.pNoite, alt: INI.altTela1 },
  { fluxo: 'hoje', titulo: 'Hoje à noite', tituloNoPainel: 'Hoje', grupo: 'Tela interativa de Hoje à noite', arquivo: 'hoje-n', cena: INI.h2Tela, texto: INI.pTela, alt: INI.altTela2 },
  { fluxo: 'familia', titulo: 'Cuidado compartilhado', tituloNoPainel: 'Família', grupo: 'Tela interativa de Cuidado compartilhado', arquivo: 'familia', cena: INI.h2So, texto: INI.pSo, alt: INI.altTela3 },
  { fluxo: 'notas', titulo: 'Notas', tituloNoPainel: 'Notas', grupo: 'Tela interativa de Notas', arquivo: 'notas', cena: INI.h2Prova, texto: INI.pProva, alt: INI.altNotas },
] as const

async function abrirFone(fone: (typeof FONES_DO_INICIO)[number]) {
  fireEvent.click(screen.getByRole('button', { name: `Experimentar ${fone.titulo}` }))
  const painel = await screen.findByRole('group', { name: fone.grupo })
  expect(painel.getAttribute('data-demo-painel')).toBe(fone.fluxo)
  return painel
}

describe('MAT-44: composição do Início', () => {
  async function inicio() {
    const resultado = await renderizarRotaPronta('/', { sessao: null })
    await screen.findByRole('heading', { level: 1, name: INI.h1 })
    return resultado.container
  }

  it('as sete cenas alternam as superfícies aprovadas, com no máximo duas consecutivas da mesma cor', async () => {
    const container = await inicio()
    const cenas = [...container.querySelectorAll('.co-fita > section.co-painel, .co > section.co-faixa')]
    expect(cenas).toHaveLength(7)
    const css = regrasComContexto(lerTexto(CSS_INICIO))
    const papeis = ['dia', 'noite', 'noite', 'dia', 'chao-dia', 'noite', 'chao-noite']
    const fundos = cenas.map((cena) => {
      const seletorDe = (seletor: string) => seletor.split(',').some((simples) => cena.matches(simples.trim()))
      const regras = css.filter((r) => r.condicao === null && seletorDe(r.seletor))
      const propriedade = cena.classList.contains('co-faixa') ? '--fundo' : 'background'
      return regras.flatMap((r) => r.props[propriedade] ? [r.props[propriedade]] : [])
    })
    expect(fundos).toEqual(papeis.map((papel) => [`var(--${papel})`]))
    expect(new Set(fundos.flat()).size).toBeGreaterThanOrEqual(3)
    for (let i = 2; i < fundos.length; i++) {
      expect(new Set([fundos[i - 2][0], fundos[i - 1][0], fundos[i][0]]).size).toBeGreaterThan(1)
    }
  })

  it('as superfícies dia, noite e chão usam somente os tokens da composição aprovada', async () => {
    const container = await inicio()
    const raiz = container.querySelector('.co')
    expect(raiz?.matches('[data-casa] > .co')).toBe(true)
    const regras = regrasComContexto(lerTexto(CSS_INICIO))
    const cores = regras.find((r) => r.seletor === '.co' && r.condicao === null)?.props
    for (const [papel, token] of Object.entries({ dia: 'papel', noite: 'noite', 'chao-dia': 'areia', 'chao-noite': 'texto-2' })) {
      expect(cores?.[`--${papel}`]).toBe(`var(--color-${token})`)
      expect(tokens[token]).toMatch(/^#[a-f\d]{6}$/i)
    }
    expect(regras.find((r) => r.seletor === '.co-dentro')?.props.background).toBe('var(--fundo)')
  })

  it('há quatro telefones com um gatilho acessível cada; a prova estática não é interativa', async () => {
    await inicio()
    const principal = within(screen.getByRole('main'))
    expect(principal.getAllByRole('button', { name: /^Experimentar / })).toHaveLength(4)
    for (const fone of FONES_DO_INICIO) {
      const cena = principal.getByRole('region', { name: fone.cena })
      const prova = within(cena).getByRole('img', { name: fone.alt }).closest('figure')
      if (!prova) throw new Error(`Captura sem moldura: ${fone.titulo}`)
      const gatilho = within(cena).getByRole<HTMLButtonElement>('button', { name: `Experimentar ${fone.titulo}` })
      expect(prova.querySelector('a[href], button, input, select, textarea, [tabindex], [contenteditable], [role="timer"]')).toBeNull()
      expect(gatilho.closest('[inert], [aria-hidden="true"]')).toBeNull()
      expect(gatilho.classList.contains('alvo-toque')).toBe(true)
      expect(gatilho.tabIndex).toBe(0)
      expect(gatilho.disabled).toBe(false)
    }
  })

  it('só o telefone acionado troca sua prova estática pelos controles da demo', async () => {
    const container = await inicio()
    const [historico, ...outros] = FONES_DO_INICIO
    expect(container.querySelectorAll('[data-demo-painel]')).toHaveLength(0)
    const painel = await abrirFone(historico)
    await within(painel).findByRole('button', { name: 'Registrar fralda de Heloísa' })
    expect(container.querySelectorAll('[data-demo-painel]')).toHaveLength(1)
    expect(screen.queryByRole('img', { name: historico.alt })).toBeNull()
    expect(screen.queryByRole('button', { name: `Experimentar ${historico.titulo}` })).toBeNull()
    for (const fone of outros) {
      const cena = within(screen.getByRole('region', { name: fone.cena }))
      expect(cena.getByRole('img', { name: fone.alt })).toBeTruthy()
      expect(cena.getByRole('button', { name: `Experimentar ${fone.titulo}` })).toBeTruthy()
    }
  })

  it('duas demos na Início não duplicam a casca nem vazam a navegação para a página', async () => {
    const { roteador } = await renderizarRotaPronta('/', { sessao: null })
    const localAntes = roteador.state.location
    const urlAntes = window.location.href
    const tituloAntes = document.title
    const temaAntes = document.documentElement.getAttribute('data-tema')
    const historico = await abrirFone(FONES_DO_INICIO[0])
    const hoje = await abrirFone(FONES_DO_INICIO[1])
    const detalhe = (await within(historico).findAllByRole('link', { name: /Fralda, Xixi/i }))[0]
    await within(hoje).findByRole('button', { name: 'Encerrar' })
    for (const painel of [historico, hoje]) {
      expect(painel.querySelector('nav, main, h1')).toBeNull()
      const ids = [...document.querySelectorAll('[id]')].map((no) => no.id)
      for (const no of painel.querySelectorAll('[id]')) {
        expect(ids.filter((id) => id === no.id), no.id).toHaveLength(1)
      }
      for (const link of painel.querySelectorAll('a[href]')) expect(link.getAttribute('href')).toBe('#demo-previa')
    }
    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    for (const opcoes of [{ ctrlKey: true }, { metaKey: true }, { button: 1 }]) {
      const evento = new MouseEvent(opcoes.button ? 'auxclick' : 'click', { bubbles: true, cancelable: true, ...opcoes })
      detalhe.dispatchEvent(evento)
      expect(evento.defaultPrevented).toBe(true)
    }
    fireEvent.click(detalhe)
    await within(historico).findByText('Detalhe do registro')
    expect(roteador.state.location).toEqual(localAntes)
    expect(window.location.href).toBe(urlAntes)
    expect(document.title).toBe(tituloAntes)
    expect(document.documentElement.getAttribute('data-tema')).toBe(temaAntes)
  })

  it('a demo Hoje à noite usa madrugada local só enquanto está aberta, sem mudar o html', async () => {
    const container = await inicio()
    const antes = document.documentElement.getAttribute('data-tema')
    expect(container.querySelectorAll('[data-tema-local="madrugada"]')).toHaveLength(0)
    const painel = await abrirFone(FONES_DO_INICIO[1])
    expect([...container.querySelectorAll('[data-tema-local="madrugada"]')]).toEqual([painel])
    expect(painel.getAttribute('data-demo-painel')).toBe('hoje')
    expect(document.documentElement.getAttribute('data-tema')).toBe(antes)
    fireEvent.click(within(painel).getByRole('button', { name: /^Voltar à imagem/ }))
    expect(container.querySelectorAll('[data-tema-local="madrugada"]')).toHaveLength(0)
    expect(document.documentElement.getAttribute('data-tema')).toBe(antes)
  })

  it('cada telefone está na cena nomeada que apresenta a sua prova e seu parágrafo', async () => {
    await inicio()
    for (const fone of FONES_DO_INICIO) {
      const cena = within(screen.getByRole('region', { name: fone.cena }))
      const texto = cena.getByText(fone.texto, { selector: 'p' })
      expect(texto.closest('[hidden], [inert], [aria-hidden="true"], .sr-only')).toBeNull()
      expect(cena.getByRole('img', { name: fone.alt })).toBeTruthy()
    }
  })

  it('no cabeçalho real o teto legado é 64 px no desktop e o alvo dos links de navegação é 44 px', async () => {
    await inicio()
    const cabecalho = screen.getByRole('banner')
    const links = within(within(cabecalho).getByRole('navigation', { name: 'Site' })).getAllByRole('link')
    expect(links).toHaveLength(4)
    for (const link of links) expect(link.classList.contains('cm-cab-link')).toBe(true)
    const regras = regrasComContexto(lerTexto('styles/site.css'))
    const alvo = regras.find((r) => r.seletor === '.cm-cab-link' && r.condicao === null)?.props
    expect(parseFloat(alvo?.['min-width'] ?? '')).toBeGreaterThanOrEqual(44)
    expect(parseFloat(alvo?.['min-height'] ?? '')).toBeGreaterThanOrEqual(44)
    expect(cabecalho.classList.contains('cm-cabecalho')).toBe(true)
    expect(regras.find((r) => r.seletor === '.cm-cabecalho' && r.condicao === null)?.props['min-height']).toBe('var(--cm-cabecalho)')
    const desktop = regras.find((r) => r.seletor === ':root' && /min-width:\s*1100px/.test(r.condicao ?? ''))?.props
    expect(parseFloat(desktop?.['--cm-cabecalho'] ?? ''), 'mínimo CSS do cabeçalho de computador').toBeLessThanOrEqual(64)
  })

  it('os fatos mantêm os quatro itens, com o termo grande em Fraunces', async () => {
    const container = await inicio()

    expect([...container.querySelectorAll('.numero-fato')].map((n) => n.textContent)).toEqual([
      '7',
      'Autoria',
      'Convites',
      'Lembretes',
    ])
    // A regra do tamanho é a que declara font-size (o seletor também aparece em outro grupo).
    const corpo = [...estiloGlobal.matchAll(/\.numero-fato\s*\{([^}]*)\}/g)]
      .map((m) => m[1])
      .find((texto) => texto.includes('font-size'))!
    const [, minimo, , maximo] = /clamp\(\s*([\d.]+)rem\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)rem\s*\)/.exec(corpo)!
    // Em 390 px vale o mínimo; em 1440 px vale o máximo (o termo central da escala é menor).
    expect(parseFloat(minimo) * 16).toBeGreaterThanOrEqual(32)
    expect(parseFloat(maximo) * 16).toBeGreaterThanOrEqual(40)
  })

  it('na página pública não há ícone fora das miniaturas dos aparelhos', async () => {
    const container = await inicio()

    const fora = [...container.querySelectorAll('svg.lucide')].filter((icone) => icone.closest('[inert]') === null)
    expect(fora).toEqual([])
  })
})

describe('Início: rotas públicas do cabeçalho', () => {
  it('os quatro destinos são rotas públicas distintas, e cada link ativa a rota no site', async () => {
    const { roteador } = await renderizarRotaPronta('/', { sessao: null })
    const esperadas = ['/como-funciona', '/cuidado-compartilhado', '/desenvolvimento', '/comunidade']
    const nav = () => within(within(screen.getByRole('banner')).getByRole('navigation', { name: 'Site' }))
    expect(nav().getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(esperadas)
    for (const [i, caminho] of esperadas.entries()) {
      const link = nav().getAllByRole('link')[i]
      const rotulo = link.textContent ?? ''
      fireEvent.click(link)
      await nav().findByRole('link', { name: rotulo, current: 'page' })
      const titulo = await screen.findByRole('heading', { level: 1 })
      expect(titulo.textContent).not.toMatch(/página não encontrada/i)
      expect(roteador.state.location.pathname).toBe(caminho)
      expect(roteador.state.location.hash).toBe('')
    }
  })

  it('o menu fechado não expõe seus links; aberto usa a mesma ordem e navega fechando a divulgação', async () => {
    const { roteador } = await renderizarRotaPronta('/', { sessao: null })
    const menu = within(screen.getByRole('banner')).getByRole('button', { name: 'Menu' })
    const painel = document.getElementById(menu.getAttribute('aria-controls') ?? '')
    if (!painel) throw new Error('Menu sem painel controlado')
    expect(menu.getAttribute('aria-expanded')).toBe('false')
    expect(painel.hidden).toBe(true)
    expect(within(painel).queryAllByRole('link')).toHaveLength(0)
    fireEvent.click(menu)
    expect(menu.getAttribute('aria-expanded')).toBe('true')
    const links = within(within(painel).getByRole('list')).getAllByRole('link')
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Como funciona', '/como-funciona'],
      ['Cuidado compartilhado', '/cuidado-compartilhado'],
      ['Desenvolvimento', '/desenvolvimento'],
      ['Comunidade', '/comunidade'],
    ])
    expect(document.activeElement).toBe(links[0])
    fireEvent.click(links[0])
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/como-funciona'))
    expect(menu.getAttribute('aria-expanded')).toBe('false')
    expect(painel.hidden).toBe(true)
  })
})

describe('MAT-44: ilustrações', () => {
  it('o desenho do Hoje é decorativo e tem dimensões reservadas', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', claro)
    const cartao = container.querySelector('main [data-andamento]')!
    const desenho = cartao.querySelector('[data-desenho]')!
    const figuras = [...desenho.querySelectorAll('img[data-ilustracao]')]
    expect(figuras).toHaveLength(3) // A imagem e as duas cópias que engrossam o traço.
    expect(desenho.getAttribute('aria-hidden')).toBe('true')
    expect(desenho.classList.contains('pointer-events-none')).toBe(true)
    expect(within(desenho as HTMLElement).queryByRole('img')).toBeNull()
    for (const figura of figuras) {
      expect(figura.getAttribute('alt')).toBe('')
      expect(Number(figura.getAttribute('width'))).toBeGreaterThan(0)
      expect(Number(figura.getAttribute('height'))).toBeGreaterThan(0)
    }
    expect(container.querySelectorAll('main [data-ilustracao]')).toHaveLength(figuras.length)
  })

  it('o estado vazio da Sessão tem uma ilustração', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao', semSessao)
    await screen.findByRole('heading', { level: 1 })

    expect(container.querySelectorAll('[data-ilustracao]').length).toBeGreaterThanOrEqual(1)
  })

  it('o Hoje sem sessão não tem desenho e a Sessão vazia tem uma só cena', async () => {
    const hoje = await renderizarRotaPronta('/app/hoje', semSessao)
    expect(hoje.container.querySelectorAll('main [data-ilustracao]')).toHaveLength(0)
    hoje.unmount()

    const { container } = await renderizarRotaPronta('/app/sessao', semSessao)
    const figuras = container.querySelectorAll('main [data-ilustracao]')
    expect(figuras).toHaveLength(1)
    expect(figuras[0].getAttribute('data-ilustracao')).toBe('mae-noite')
  })
})

function conferirCoresDoCampo(campo: Element, tema: keyof typeof blocosDoTema) {
  expect(document.documentElement.getAttribute('data-tema')).toBe(tema === 'madrugada' ? 'madrugada' : null)
  expect(screen.getByRole('button', { name: 'Modo madrugada' }).getAttribute('aria-pressed')).toBe(String(tema === 'madrugada'))
  expect([...campo.classList]).toEqual(expect.arrayContaining(['bg-(--cor-campo-sessao)', 'text-(--cor-numero-sessao)']))
  expect(tokenDoTema(tema, 'campo-sessao')).toBe(tema === 'madrugada' ? 'noite-cartao' : 'mel')
  expect(tokenDoTema(tema, 'numero-sessao')).toBe(tema === 'madrugada' ? 'papel' : 'cacau')
}

describe('MAT-44: Hoje e Sessão', () => {
  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`Hoje (${tema}): o único cartão fica num campo de cor com token válido`, async () => {
      const { container } = await renderizarRotaPronta('/app/hoje', estado)

      const cartoes = container.querySelectorAll<HTMLElement>('main [data-andamento]')
      expect(cartoes).toHaveLength(1)
      expect(within(cartoes[0]).queryAllByRole('timer')).toHaveLength(1)
      conferirCoresDoCampo(cartoes[0], tema)
    })

    it(`Sessão (${tema}): o cronômetro fica num campo de cor com token válido`, async () => {
      const { container } = await renderizarRotaPronta('/app/sessao', estado)

      const campo = within(container).getByRole('region', { name: 'Duração da sessão' })
      expect(within(campo).queryAllByRole('timer', { name: 'Duração da sessão' })).toHaveLength(1)
      conferirCoresDoCampo(campo, tema)
    })
  }

  for (const [variante, tempo] of [['normal', 60_000], ['longo', 10 * 60 * 60_000]] as const) {
    it(`o cronômetro ${variante} tem números tabulares e pelo menos 48 px`, async () => {
      await renderizarRotaPronta('/app/sessao', { ajustarRotina: comSessaoEmAndamento('sono', tempo) })
      const cronometro = screen.getByRole('timer', { name: 'Duração da sessão' })
      expect(cronometro.getAttribute('data-tamanho')).toBe(variante)
      expect(cronometro.classList.contains('tabular-nums')).toBe(true)
      for (const prefixo of ['', 'lg:']) {
        const tamanho = new RegExp(`^${prefixo}text-\\[(\\d+)px\\]$`)
        const tamanhos = [...cronometro.classList].flatMap((classe) => {
          const px = tamanho.exec(classe)?.[1]
          return px === undefined ? [] : [Number(px)]
        })
        expect(tamanhos, prefixo || 'faixa base').toHaveLength(1)
        expect(tamanhos[0], prefixo || 'faixa base').toBeGreaterThanOrEqual(48)
      }
    })
  }

  it.each([['claro', claro], ['madrugada', madrugada]] as const)('Hoje e Sessão (%s): ícones são decorativos e não substituem o texto, salvo o Menu nomeado', async (_tema, estado) => {
    for (const caminho of ['/app/hoje', '/app/sessao']) {
      const { container, unmount } = await renderizarRotaPronta(caminho, estado)
      const cabecalho = screen.getByRole('banner')
      const menu = within(cabecalho).getByRole('button', { name: 'Menu' })
      const cartao = container.querySelector<HTMLElement>('[data-andamento]')
      const icones = [...container.querySelectorAll('svg.lucide')]
      expect(icones.length, caminho).toBeGreaterThan(0)
      const temTextoVisivel = (elemento: Element) => {
        const texto = document.createTreeWalker(elemento, NodeFilter.SHOW_TEXT)
        for (let no = texto.nextNode(); no; no = texto.nextNode()) {
          if (no.textContent?.trim() && !no.parentElement?.closest('svg, [hidden], [aria-hidden="true"], .sr-only, [inert]')) return true
        }
        return false
      }
      for (const icone of icones) {
        expect(icone.getAttribute('aria-hidden')).toBe('true')
        const controle = icone.closest('button, a')
        if (controle === menu) {
          expect([...icone.classList]).toEqual(expect.arrayContaining(['lucide-menu']))
          expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Menu' })).toBe(menu)
        } else if (controle) {
          expect(screen.getAllByRole(controle.matches('button') ? 'button' : 'link', { name: /\S/ })).toContain(controle)
          expect(temTextoVisivel(controle), controle.outerHTML).toBe(true)
        } else {
          // O pictograma do cartão não é um controle: o tipo da sessão tem texto próprio.
          expect(caminho).toBe('/app/hoje')
          expect([...icone.classList]).toEqual(expect.arrayContaining(['lucide-moon']))
          if (!cartao) throw new Error('Cartão de sessão não encontrado')
          expect(icone.closest('[data-andamento]')).toBe(cartao)
          expect(within(cartao).getByText('Sono', { exact: true }).closest('[hidden], [aria-hidden="true"], .sr-only, [inert]')).toBeNull()
        }
      }
      unmount()
    }
  })

  it('nenhum título leva ícone', async () => {
    for (const caminho of ['/app/hoje', '/app/sessao', '/']) {
      const { container, unmount } = await renderizarRotaPronta(caminho)
      expect(container.querySelectorAll('h1 svg, h2 svg, h3 svg'), caminho).toHaveLength(0)
      unmount()
    }
  })
})

describe('MAT-44: SVG e movimento', () => {
  it('todo <svg> das 3 telas tem aria-hidden="true" ou nome acessível', async () => {
    const casos: Array<[string, OpcoesRota]> = [
      ['/', claro],
      ['/app/hoje', claro],
      ['/app/hoje', madrugada],
      ['/app/sessao', claro],
      ['/app/sessao', semSessao],
    ]
    for (const [caminho, estado] of casos) {
      const { container, unmount } = await renderizarRotaPronta(caminho, estado)
      await screen.findAllByRole('heading')
      const svgs = [...container.querySelectorAll('svg')]
      expect(svgs.length, caminho).toBeGreaterThan(0)
      for (const svg of svgs) {
        const decorativo = svg.getAttribute('aria-hidden') === 'true'
        const nomeado = svg.hasAttribute('aria-label') || svg.hasAttribute('aria-labelledby') || svg.querySelector('title') !== null
        expect(decorativo || nomeado, `${caminho}: ${svg.outerHTML.slice(0, 80)}`).toBe(true)
      }
      unmount()
    }
  })

  it('motion entra com versão exata da major 12, framer-motion não é dependência direta, e só os arquivos da VIS4-20 importam motion/react', () => {
    const pacote = JSON.parse(readFileSync(pastaSrc + '../package.json', 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    expect(pacote.dependencies?.motion).toMatch(/^12\.\d+\.\d+$/)
    expect(pacote.dependencies).not.toHaveProperty('framer-motion')
    expect(pacote.devDependencies).not.toHaveProperty('framer-motion')

    const arquivos = listarFontes(pastaSrc, true).filter((f) => f.nome !== 'visual.test.tsx')
    const importaDe = (f: { texto: string }, pacotes: string) =>
      new RegExp(`from\\s+['"](${pacotes})['"]`).test(f.texto)

    const importamOsPacotesAntigos = arquivos.filter((f) => importaDe(f, 'motion|framer-motion')).map((f) => f.nome)
    expect(importamOsPacotesAntigos).toEqual([])

    const importamMotionReact = arquivos.filter((f) => importaDe(f, 'motion/react')).map((f) => f.nome)
    expect(importamMotionReact.length).toBeGreaterThan(0)
    for (const nome of importamMotionReact) {
      expect(
        /^(movimento\/|componentes\/terceiros\/|componentes\/vitrine\/)/.test(nome) || nome === 'paginas/Inicio.tsx',
        nome,
      ).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Rodada 2, parte A: três regras de projeto que a rodada 1 quebrou.

const semComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1')

/** Todas as regras "seletor { corpo }" de um CSS, sem comentários (o aninhamento sai achatado). */
function regrasDe(css: string): Array<{ seletor: string; corpo: string }> {
  return [...semComentarios(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, corpo]) => ({
    seletor: seletor.trim().replace(/\s+/g, ' '),
    corpo,
  }))
}

/** Uma medida de translate em px (rem e em valem 16 px); null se a unidade não é de comprimento fixo. */
function emPx(medida: string): number | null {
  const achado = /^(-?\d*\.?\d+)(px|rem|em)?$/.exec(medida.trim())
  if (!achado) return null
  const numero = parseFloat(achado[1])
  if (achado[2] === 'rem' || achado[2] === 'em') return numero * 16
  return numero
}

const transformaEstadoCss = (corpo: string) =>
  /\b(scale|scale3d|scaleX|scaleY|scaleZ|rotate|rotate3d|rotateX|rotateY|rotateZ|skew|skewX|skewY)\(/.test(corpo) ||
  /(^|[;\s])(scale|rotate)\s*:/.test(corpo)
const transformaEstadoUtilitario = (texto: string) =>
  /(?:hover|active|focus[\w-]*|group-hover):-?(?:scale|rotate|skew)/.test(texto)

describe('MAT-44 r2 A1: resposta a hover, active e foco sem escala, giro ou inclinação', () => {
  const arquivosCss = listarFontes(pastaSrc).filter((f) => f.nome.endsWith('.css'))
  const comEstado = arquivosCss.flatMap(({ nome, texto }) =>
    regrasDe(texto)
      .filter((r) => /:(active|hover|focus(?:-visible|-within)?)\b/.test(r.seletor))
      .map((r) => ({ nome, ...r })),
  )

  it('encontra as regras com :active, :hover e :focus*', () => {
    expect(comEstado.length).toBeGreaterThan(0)
    expect(comEstado.some((r) => r.seletor.includes(':active'))).toBe(true)
  })

  it('no CSS só os botões previstos usam o toque de 0,96; hover e foco não escalam, giram nem inclinam', () => {
    // DESIGN.md, Motion: o toque do botão é a exceção ao A1; não dispense o restante da regra.
    const botoes = [
      "styles/site.css: .cm-botao:active:not([aria-disabled='true'])",
      'componentes/demo-telefone/demoTelefone.css: .dt-gatilho:active',
      'componentes/demo-telefone/demoTelefone.css: .dt-topo-botao:active',
    ]
    const examinar = (regras: typeof comEstado) => regras.flatMap(({ nome, seletor, corpo }) =>
      seletor.split(',').flatMap((parte) => corpo.split(';').filter(transformaEstadoCss).map((declaracao) =>
        `${nome}: ${parte.trim()} { ${declaracao.trim().replace(/\s*:\s*/, ': ')} }`,
      )),
    ).sort()
    const esperado = botoes.map((botao) => `${botao} { scale: 0.96 }`).sort()
    expect(examinar(comEstado)).toEqual(esperado)
    const botao = { nome: 'styles/site.css', seletor: ".cm-botao:active:not([aria-disabled='true'])" }
    expect(examinar([{ ...botao, corpo: 'scale: 0.96; transform: rotate(1deg);' }]))
      .toEqual([`${botoes[0]} { scale: 0.96 }`, `${botoes[0]} { transform: rotate(1deg) }`])
    expect(examinar([{ ...botao, seletor: '.cm-botao:hover', corpo: 'scale: 0.96;' }]))
      .toEqual(['styles/site.css: .cm-botao:hover { scale: 0.96 }'])
  })

  it('o deslocamento (translate) nelas fica em até 16 px', () => {
    const excessos: string[] = []
    for (const { nome, seletor, corpo } of comEstado) {
      const medidas = [...corpo.matchAll(/translate(?:3d|[XYZ])?\(([^)]*)\)/g)].flatMap((m) => m[1].split(','))
      for (const [, valor] of corpo.matchAll(/(?:^|[;\s])translate\s*:\s*([^;]+)/g)) medidas.push(...valor.split(/\s+/))
      for (const medida of medidas) {
        const px = emPx(medida)
        if (px === null || Math.abs(px) > 16) excessos.push(`${nome}: ${seletor}: ${medida.trim()}`)
      }
    }
    expect(excessos).toEqual([])
  })

  it('nas classes .tsx só os dois controles da Rotina usam o toque de 0,96', () => {
    const examinar = (texto: string) => (semComentarios(texto).match(/[^\s"'`{}]+/g) ?? [])
      .filter(transformaEstadoUtilitario)
    const achados = listarFontes(pastaSrc).filter((f) => f.nome.endsWith('.tsx'))
      .flatMap(({ nome, texto }) => examinar(texto).map((classe) => `${nome}: ${classe}`)).sort()
    expect(achados).toEqual([
      'componentes/app/BotaoIniciarMamada.tsx: active:scale-[0.96]',
      'componentes/rotina/BarraRegistroRapido.tsx: active:scale-[0.96]',
    ])
    expect(examinar('className="hover:bg-papel active:scale-[0.96] focus-visible:-rotate-1 active:scale-[0.9]"'))
      .toEqual(['active:scale-[0.96]', 'focus-visible:-rotate-1', 'active:scale-[0.9]'])
  })

  it('os detectores de estado distinguem escala, giro e inclinação de realce sem transformação', () => {
    const regras = regrasDe(`
      .a:active:not(:disabled) { transform: scale(0.96); }
      .b:active { scale: 0.96; }
      .c:hover { transform: rotate(1deg); }
      .d:focus-visible { transform: skewX(1deg); }
      .e:hover { color: var(--cor-texto); }
    `)
    expect(regras.filter(({ corpo }) => transformaEstadoCss(corpo)).map(({ seletor }) => seletor))
      .toEqual(['.a:active:not(:disabled)', '.b:active', '.c:hover', '.d:focus-visible'])
    for (const classe of ['active:scale-[0.96]', 'hover:-rotate-1', 'focus-visible:skew-x-1', 'group-hover:scale-95']) {
      expect(transformaEstadoUtilitario(classe), classe).toBe(true)
    }
    expect(transformaEstadoUtilitario('hover:bg-papel focus-visible:outline active:text-cacau')).toBe(false)
  })
})

describe('MAT-44 r2 A2: dependência de ícones e ações da Sessão', () => {
  const importam = listarFontes(pastaSrc).filter((f) => /from\s+['"]lucide-react[^'"]*['"]/.test(f.texto))

  it('vincula imports nomeados de lucide-react ao componente que possui cada ícone', async () => {
    const ts = await import('typescript')
    // Inventário de símbolos da integração 09b5cdef e das duas peças da demonstração 94596efa.
    // Novos usos exigem decisão para o par componente/ícone, não uma exceção por pasta ou pacote.
    const proprietarios: Readonly<Record<string, readonly string[]>> = {
      'componentes/app/BotaoIniciarMamada.tsx': ['Milk'],
      'componentes/app/CartaoSessao.tsx': ['Baby', 'Milk', 'Moon'],
      'componentes/app/CronometroSessao.tsx': ['NotebookPen'],
      'componentes/base/Campo.tsx': ['ChevronDown', 'Eye', 'EyeOff'],
      'componentes/campo/Acordeao.tsx': ['Plus'],
      'componentes/campo/FaixaSelos.tsx': ['Ban', 'Lock', 'Moon', 'Pause', 'Play', 'Scale', 'Users'],
      'componentes/campo/TabelaComparacao.tsx': ['Check', 'Minus'],
      'componentes/casca/Cabecalho.tsx': ['Menu', 'Moon', 'X'],
      'componentes/conta/Campos.tsx': ['ChevronDown', 'CircleAlert', 'Eye', 'EyeOff'],
      'componentes/conta/MolduraLogada.tsx': ['ArrowUpRight'],
      'componentes/conta/Partes.tsx': ['CircleAlert', 'Info'],
      'componentes/estado/ErroDeLeitura.tsx': ['CircleAlert'],
      'componentes/publicas-texto/IndiceDaPagina.tsx': ['ChevronDown'],
      'componentes/rotina/AvisoDeErro.tsx': ['CircleAlert'],
      'componentes/rotina/BarraRegistroRapido.tsx': ['Droplets', 'Ellipsis', 'Milk', 'Moon'],
      'componentes/rotina/CampoHorario.tsx': ['CircleAlert'],
      'componentes/rotina/ConfirmacaoRotina.tsx': ['Check', 'Undo2'],
      'componentes/rotina/FormularioRegistro.tsx': ['ChevronDown', 'CircleAlert'],
      'componentes/rotina/IconeDoTipo.tsx': ['Apple', 'Baby', 'Droplet', 'Droplets', 'Milk', 'Moon', 'NotebookPen', 'type LucideIcon'],
      'componentes/rotina/SeletorBebe.tsx': ['ChevronDown'],
      'componentes/rotina/SeletorDeDia.tsx': ['ChevronLeft', 'ChevronRight'],
      'componentes/rotina/TelaRotina.tsx': ['Info'],
      'paginas/conta/ExcluirConta.tsx': ['Trash2'],
      'paginas/conta/RedefinirSenha.tsx': ['CircleAlert'],
      'paginas/rotina/Historico.tsx': ['Trash2'],
      'paginas/rotina/Hoje.tsx': ['Info', 'RefreshCw'],
      'paginas/rotina/Lixeira.tsx': ['ChevronLeft', 'Undo2'],
      'paginas/rotina/Notas.tsx': ['ChevronLeft', 'Pencil', 'Plus', 'Trash2'],
      'paginas/rotina/Registro.tsx': ['ChevronLeft'],
      'paginas/rotina/RegistroDetalhe.tsx': ['ChevronLeft', 'Pencil', 'Trash2', 'Undo2'],
      'paginas/rotina/Sessao.tsx': ['ChevronLeft', 'Info'],
      'prototipo/BotoesRapidos.tsx': ['Baby', 'Droplets', 'Milk', 'Moon'],
      // Demonstração interativa da Início (AGY-02).
      'componentes/demo-telefone/DemoTelefoneMotor.tsx': ['RotateCcw', 'X'],
      'componentes/demo-telefone/FluxosDemo.tsx': ['ChevronLeft', 'Plus'],
    }

    function vinculos(nome: string, texto: string): string[] {
      const fonte = ts.createSourceFile(nome, texto, ts.ScriptTarget.Latest, true)
      const achados: string[] = []
      function visitar(no: import('typescript').Node) {
        if (ts.isStringLiteralLike(no) && /^lucide-react(?:\/|$)/.test(no.text)) {
          const declaracao = no.parent
          if (no.text !== 'lucide-react' || !ts.isImportDeclaration(declaracao) || declaracao.moduleSpecifier !== no) {
            achados.push(`!${nome}: uso fora de um import direto do pacote raiz`)
            return
          }
          const clausula = declaracao.importClause
          const itens = clausula?.namedBindings
          if (clausula?.name || !itens || !ts.isNamedImports(itens) || !itens.elements.length) {
            achados.push(`!${nome}: requer imports nomeados`)
            return
          }
          for (const item of itens.elements) {
            const tipo = clausula.isTypeOnly || item.isTypeOnly ? 'type ' : ''
            achados.push(`${nome}: ${tipo}${(item.propertyName ?? item.name).text}`)
          }
        }
        ts.forEachChild(no, visitar)
      }
      visitar(fonte)
      return achados.sort()
    }

    const esperado = Object.entries(proprietarios).flatMap(([nome, icones]) => icones.map((icone) => `${nome}: ${icone}`)).sort()
    const atual = listarFontes(pastaSrc)
      .filter(({ nome }) => /\.tsx?$/.test(nome))
      .flatMap(({ nome, texto }) => vinculos(nome, texto)).sort()
    expect(atual).toEqual(esperado)

    const dono = 'componentes/casca/Cabecalho.tsx'
    const autorizados = new Set(esperado)
    const naoAprovados = [
      ['componentes/Outro.tsx', "import { Menu } from 'lucide-react'"],
      [dono, "import { Milk as Menu } from 'lucide-react'"],
      [dono, "import * as Icons from 'lucide-react'"],
      [dono, "import { Menu } from 'lucide-react/dist/icons/menu'"],
      [dono, "import 'lucide-react'"],
      [dono, "export { Menu } from 'lucide-react'"],
      [dono, "const pacote = import('lucide-react')"],
    ]
    for (const [nome, texto] of naoAprovados) {
      expect(vinculos(nome, texto).filter((vinculo) => !autorizados.has(vinculo)), texto).toHaveLength(1)
    }
    expect(vinculos(dono, "import { Menu } from 'lucide-react'")).toEqual([`${dono}: Menu`])
  })

  it('cada import é de ícones nomeados, do pacote raiz', () => {
    for (const { nome, texto } of importam) {
      const importacoes = [
        ...texto.matchAll(
          /import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*\{[^}]*\})?\s+from\s+['"]lucide-react[^'"]*['"]/g,
        ),
      ].map((m) => m[0])
      expect(importacoes.length, nome).toBeGreaterThan(0)
      for (const importacao of importacoes) {
        expect(importacao, nome).toMatch(/^import\s+(?:type\s+)?\{[^}]+\}\s+from\s+'lucide-react'$/)
      }
    }
  })

  for (const [caso, estado] of [['ativa', sessaoDe('sono')], ['vazia', semSessao]] as const) {
    it(`Sessão ${caso}: somente os ícones decorativos de Voltar e, quando ativa, Encerrar e anotar`, async () => {
      await renderizarRotaPronta('/app/sessao', estado)
      const principal = within(screen.getByRole('main'))
      const voltar = principal.getByRole('link', { name: 'Voltar para Hoje' })
      expect(voltar.getAttribute('href')).toEqual(expect.stringMatching(/\/app\/hoje$/))
      expect(voltar.textContent?.trim()).toBe('Voltar para Hoje')
      const controles = [[voltar, 'chevron-left']] as Array<[HTMLElement, string]>
      if (caso === 'ativa') {
        const anotar = principal.getByRole('button', { name: 'Encerrar e anotar' })
        expect(anotar.textContent?.trim()).toBe('Encerrar e anotar')
        controles.push([anotar, 'notebook-pen'])
      } else {
        expect(principal.queryByRole('timer')).toBeNull()
        expect(principal.queryByRole('button', { name: 'Encerrar e anotar' })).toBeNull()
      }
      const esperados = controles.map(([controle, classe]) => {
        const icones = controle.querySelectorAll('svg')
        expect(icones).toHaveLength(1)
        expect([...icones[0].classList]).toEqual(expect.arrayContaining(['lucide', `lucide-${classe}`]))
        expect(icones[0].getAttribute('aria-hidden')).toEqual('true')
        return icones[0]
      })
      expect([...screen.getByRole('main').querySelectorAll('svg.lucide')]).toEqual(esperados)
    })
  }
})

// ---------------------------------------------------------------------------
// Rodada 2, parte B: composição.

describe('MAT-44 r2 B1: vitrine de aparelhos do Início', () => {
  it('o telefone de Notas abre os dois recados e volta à semente ao reiniciar', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    const painel = await abrirFone(FONES_DO_INICIO[3])
    const notas = within(painel)
    await notas.findByText('Pomada só à noite.')
    expect(notas.getByText('Fraldas P no armário de cima.')).toBeTruthy()
    fireEvent.click(notas.getByRole('button', { name: /Nova nota/i }))
    fireEvent.change(await notas.findByRole('textbox'), { target: { value: 'Pediatra na sexta às 10h.' } })
    fireEvent.click(notas.getByRole('button', { name: 'Salvar' }))
    await notas.findByText('Pediatra na sexta às 10h.')
    fireEvent.click(notas.getByRole('button', { name: 'Reiniciar Notas' }))
    await notas.findByText('Pomada só à noite.')
    expect(notas.queryByText('Pediatra na sexta às 10h.')).toBeNull()
  })

  it('Histórico e Hoje à noite mostram telas distintas: a lista datada e o cartão de sono', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    const historico = await abrirFone(FONES_DO_INICIO[0])
    const hoje = await abrirFone(FONES_DO_INICIO[1])
    await waitFor(() => {
      const itens = historico.querySelectorAll('[data-dt-lista-historico] li')
      expect(itens).toHaveLength(11)
      expect(itens[0].textContent).toContain('17:30')
      expect(itens[0].textContent).toContain('por Ícaro')
    })
    expect((await within(hoje).findByText(/^Início às 20:30,/)).textContent).toBe('Início às 20:30, por Ícaro')
    expect(within(hoje).getByRole('button', { name: 'Encerrar' }).closest('[data-andamento]')).not.toBeNull()
    expect(hoje.querySelector('[data-dt-lista-historico]')).toBeNull()
    expect(historico.querySelector('[data-andamento], [role="timer"]')).toBeNull()
  })

  // R3 (rodada 5): antes o celular da Sessão sumia em página estreita; agora os dois celulares e o
  // notebook ficam em toda largura, cada um com posição e escala próprias na faixa estreita.
  it('a pilha estreita mantém as quatro provas e cada telefone recebe largura na regra base', async () => {
    const { container } = await renderizarRotaPronta('/', { sessao: null })
    const demos = [...container.querySelectorAll<HTMLElement>('[data-demo-fluxo]')]
    expect(demos.map((demo) => demo.getAttribute('data-demo-fluxo'))).toEqual(['historico', 'hoje', 'familia', 'notas'])
    const css = regrasComContexto(lerTexto(CSS_INICIO))
    const larguras = ['.co-p2-cena', '.co-p3-cena', '.co-so-fone', '.co-prova-fone']
    for (const [i, demo] of demos.entries()) {
      expect(demo.closest(larguras[i])).not.toBeNull()
      expect(demo.closest('[hidden], [inert], [aria-hidden="true"]')).toBeNull()
      expect(css.find((r) => r.seletor === larguras[i] && r.condicao === null)?.props['--fone-w']).toMatch(/^min\(\d+cqw, /)
    }
  })

  it('o notebook tem margens laterais largas, que é onde os celulares se sobrepõem', () => {
    const corpo = regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-notebook .aparelho-tela')!.corpo
    const [, vertical, lateral] = /padding:\s*([\d.]+)rem\s+([\d.]+)rem/.exec(corpo)!
    expect(parseFloat(vertical)).toBeLessThan(parseFloat(lateral))
    expect(parseFloat(lateral)).toBeGreaterThanOrEqual(6)
  })

  // R1 (rodada 5): o palco passou a ter o tamanho natural em variáveis do .vitrine, trocadas em
  // 46 rem; o ajuste de cada degrau à largura é conferido no bloco "r5 R1".
  it('o palco encolhe por degraus: o valor sem condição já cabe na menor largura, e cada degrau só muda variáveis', () => {
    const regras = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.vitrine')
    const base = regras.find((r) => r.condicao === null && '--escala' in r.props)!
    expect(parseFloat(base.props['--escala']) * parseFloat(base.props['--palco-largura'])).toBeLessThanOrEqual(6)
    const degraus = regras.filter((r) => r.condicao !== null)
    expect(degraus.length).toBeGreaterThanOrEqual(15)
    for (const degrau of degraus) {
      expect(Object.keys(degrau.props).every((p) => p.startsWith('--')), degrau.condicao!).toBe(true)
    }
    expect(vitrineEm(22.4).escala * vitrineEm(22.4).largura).toBeLessThanOrEqual(22.4)
  })

  it('o campo da vitrine não tem sombra: a profundidade vem da sobreposição e da escala', () => {
    expect(estiloGlobal).not.toMatch(/box-shadow/)
  })
})

describe('MAT-44 r2 B2: cena de ilustrações do campo de barro', () => {
  // Rodada 6: as figuras não se sobrepõem (antes a regra era "mesma largura e sobrepostas"); a
  // escala igual das pessoas e a ausência de margem negativa estão no bloco "r6 #2 e #3".
  it('as três cenas ilustradas usam M05, M06 e M04 na ordem da composição, com largura relativa no CSS', async () => {
    const { container } = await renderizarRotaPronta('/', { sessao: null })
    const principal = within(screen.getByRole('main'))
    const artes = [INI.altCena1, INI.altCena2, INI.altCena3].map((alt) => principal.getByRole('img', { name: alt }))
    const cenas = artes.map((arte) => arte.closest('section'))
    expect(cenas.map((cena) => cena?.className)).toEqual(['co-painel co-p1', 'co-painel co-p2', 'co-faixa co-so'])
    expect(cenas.every((cena) => container.querySelector('.co')?.contains(cena))).toBe(true)
    for (const [i, arte] of artes.entries()) {
      if (i) expect(artes[i - 1].compareDocumentPosition(arte) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    const css = regrasComContexto(lerTexto(CSS_INICIO))
    for (const [seletor, largura] of [['.co-m05', '--w'], ['.co-m06', '--w6'], ['.co-m04', '--w4']]) {
      expect(css.find((r) => r.seletor === seletor && r.condicao === null)?.props.width).toBe(`var(${largura})`)
      expect(css.some((r) => r.condicao === null && /\bcqw\b|[\d.]cqw/.test(r.props[largura] ?? ''))).toBe(true)
    }
  })

  it('a faixa do M04 não impõe altura mínima fixa em nenhuma modalidade', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    const arte = screen.getByRole('img', { name: INI.altCena3 })
    expect(arte.closest('.co-so .co-dentro')).not.toBeNull()
    const regras = regrasComContexto(lerTexto(CSS_INICIO)).filter((r) => ['.co-so', '.co-dentro', '.co-so .co-dentro'].includes(r.seletor))
    expect(regras.length).toBeGreaterThan(0)
    expect(regras.flatMap((r) => /[1-9][\d.]*rem$/.test(r.props['min-height'] ?? '') ? [`${r.seletor}: ${r.props['min-height']}`] : [])).toEqual([])
  })

  it('o chão de cada ilustração vai de borda a borda do desenho, para formar uma linha só', () => {
    for (const nome of ['Colo', 'Tapete', 'Passeio', 'Mamada', 'Berco']) {
      const texto = lerTexto(`prototipo/Ilustracao${nome}.tsx`)
      expect(texto, nome).toContain('<path d="M0 220H240" />')
    }
  })
})

describe('MAT-44 r2 B3 e B4: Sessão', () => {
  it('o início e a autoria acompanham o título; a atividade de tummy time acompanha a duração', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao', sessaoDe('tummy'))
    const pagina = within(container).getByRole('main')
    const titulo = within(pagina).getByRole('heading', { level: 1 })
    const inicio = within(pagina).getByText(/^Início às \d{2}:\d{2}, por Juliana$/)
    const campo = within(pagina).getByRole('region', { name: 'Duração da sessão' })

    expect(titulo.nextElementSibling).toBe(inicio)
    expect(campo.contains(inicio)).toBe(false)
    expect(inicio.compareDocumentPosition(campo) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    const timer = within(campo).getByRole('timer', { name: 'Duração da sessão' })
    expect(timer.nextElementSibling).toBe(within(campo).getByText('Atividade sugerida: Espelho no chão'))
  })

  it('as ações ficam juntas, abaixo do tempo e dentro do cartão, com a hierarquia e os alvos do app', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao')
    const campo = within(container).getByRole('region', { name: 'Duração da sessão' })
    const acoes = campo.querySelector('[data-acoes]')! as HTMLElement
    const botoes = within(acoes).getAllByRole<HTMLButtonElement>('button')
    expect(botoes.map((botao) => botao.textContent)).toEqual(['Encerrar', 'Encerrar e anotar', 'Descartar'])
    expect(within(campo).getByRole('timer').compareDocumentPosition(acoes) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    for (const [i, variante] of ['primario', 'contorno', 'texto'].entries()) {
      const botao = botoes[i]
      expect(botao.classList.contains(`cm-botao-${variante}`)).toBe(true)
      expect(botao.classList.contains('min-h-[max(48px,var(--alvo-toque))]')).toBe(true)
      expect(botao.disabled).toBe(false)
      expect(botao.getAttribute('aria-disabled')).not.toBe('true')
      expect(botao.tabIndex).toBe(0)
    }
    expect([...acoes.classList]).toEqual(expect.arrayContaining(['flex-col', 'sm:flex-row', 'sm:flex-wrap']))
  })

  it('o estado vazio apresenta a cena da noite no campo de mel com descrição fiel ao desenho', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao', semSessao)
    const pagina = within(container).getByRole('main')
    const cena = within(pagina).getByRole('img', { name: 'Desenho de traço: de noite, a mãe nina o bebê no colo.' })
    expect(cena.getAttribute('data-ilustracao')).toBe('mae-noite')
    expect(cena.parentElement!.hasAttribute('data-midia')).toBe(true)
    expect(cena.parentElement!.classList.contains('bg-mel')).toBe(true)
    expect(cena.getAttribute('src')).toMatch(/\/ilustracoes\/mae-noite@1x\.webp$/)
    expect(within(pagina).queryByRole('timer')).toBeNull()
  })

  it('"Voltar para Hoje" é um link com alvo de toque e devolve o foco ao h1 do Hoje', async () => {
    const { roteador } = await renderizarRotaPronta('/app/sessao', semSessao)
    expect(screen.getByRole('heading', { level: 1, name: 'Nenhuma sessão em andamento' })).toBeTruthy()
    expect(screen.queryByRole('timer')).toBeNull()
    const voltar = screen.getByRole('link', { name: 'Voltar para Hoje' })
    expect(voltar.getAttribute('href')).toBe('/app/hoje')
    expect(voltar.textContent).toBe('Voltar para Hoje')
    expect(voltar.tabIndex).toBe(0)
    expect([...voltar.classList]).toEqual(expect.arrayContaining(['alvo-toque', 'min-h-(--alvo-toque)']))
    expect(voltar.closest('p')).toBeNull()
    fireEvent.click(voltar)
    const titulo = await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    expect(roteador.state.location.pathname).toBe('/app/hoje')
    expect(document.activeElement).toBe(titulo)
  })
})

describe('MAT-44 r2 B5: campo da madrugada no Início', () => {
  async function madrugadaDoInicio() {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    return container.querySelector<HTMLElement>('#secao-madrugada')!
  }

  it('a legenda das 17:30 vem depois do telefone Histórico e da arte noturna na mesma cena', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    const cena = screen.getByRole('region', { name: INI.h2Noite })
    const telefone = within(cena).getByRole('img', { name: INI.altTela1 }).closest('[data-demo-fluxo="historico"]')
    const arte = within(cena).getByRole('img', { name: INI.altCena2 }).closest('.co-m06')
    const legenda = cena.querySelector('[data-legenda]')
    expect(legenda?.textContent).toBe('17:30, fralda, anotada por Ícaro')
    expect(telefone?.nextElementSibling).toBe(arte)
    expect(arte?.nextElementSibling).toBe(legenda)
    expect(legenda?.parentElement?.closest('section')).toBe(cena)
  })

  // Rodada 7: a escala do celular deixou de ser uma classe do JSX (0,75 e 0,85 fixos) e passou a ser
  // a variável --celular-escala, trocada em degraus de @container; onde o celular já cabia a
  // escala é a mesma de antes. A conferência de que ele cabe em toda largura está no bloco "r7 #1".
  it('o celular tem escala de pelo menos 0,75 onde cabe (o texto da miniatura fica com 12 px ou mais) e 0,85 na página larga', async () => {
    const secao = await madrugadaDoInicio()

    const celular = secao.querySelector('[data-aparelho="celular"]')!
    expect(celular.getAttribute('class')).toContain('[scale:var(--celular-escala)]')
    const escalas = regrasComContexto(estiloGlobal)
      .filter((r) => r.seletor === '.madrugada-celular' && '--celular-escala' in r.props)
      .map((r) => ({ condicao: r.condicao, escala: parseFloat(r.props['--celular-escala']) }))
    const larga = escalas.filter((e) => e.condicao && /min-width:\s*46rem/.test(e.condicao))
    const cabe = escalas.filter((e) => e.condicao && /min-width:\s*21rem/.test(e.condicao))
    expect(cabe.length).toBe(1)
    expect(cabe[0].escala * 16).toBeGreaterThanOrEqual(12)
    expect(larga.length).toBe(1)
    expect(larga[0].escala).toBeGreaterThanOrEqual(0.85)
  })

  it('no Hoje à noite o cronômetro e Encerrar têm o alvo maior e Ver sessão continua dentro do telefone', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    const painel = await abrirFone(FONES_DO_INICIO[1])
    const timer = await within(painel).findByRole('timer', { name: 'Tempo de sono' })
    const cartao = timer.closest<HTMLElement>('[data-andamento]')
    if (!cartao) throw new Error('Cronômetro fora do cartão Em andamento')
    for (const controle of [within(cartao).getByRole('button', { name: 'Encerrar' }), within(cartao).getByRole('link', { name: 'Ver sessão' })]) {
      expect(controle.classList.contains('alvo-toque')).toBe(true)
      expect(controle.classList.contains('min-h-[max(48px,var(--alvo-toque))]')).toBe(true)
    }
    expect(parseFloat(/--alvo-toque:\s*(\d+)px;/.exec(blocosDoTema.madrugada ?? '')?.[1] ?? '')).toBeGreaterThanOrEqual(56)
    const verSessao = within(cartao).getByRole('link', { name: 'Ver sessão' })
    expect(verSessao.getAttribute('href')).toBe('#demo-previa')
    fireEvent.click(verSessao)
    await within(painel).findByText(/Toque em Encerrar para somar/i)
  })
})

// ---------------------------------------------------------------------------
// Rodada 3: acabamento.

describe('MAT-44 r3 #1: Hoje com mais peso editorial', () => {
  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`(${tema}) "Para você saber" fica no papel da coluna de leitura, com nota, autoria, hora e link`, async () => {
      await renderizarRotaPronta('/app/hoje', estado)

      const secao = screen.getByRole('region', { name: 'Para você saber' })
      expect(document.documentElement.getAttribute('data-tema')).toBe(tema === 'madrugada' ? 'madrugada' : null)
      expect(tokenDoTema(tema, 'fundo')).toBe(tema === 'madrugada' ? 'noite' : 'papel')
      const leitura = secao.closest('[data-area-lista]')!
      expect(leitura).not.toBeNull()
      expect(secao.closest('[data-campo], [data-h~="cartao"]')).toBeNull()
      expect(leitura.querySelector('[data-andamento]')).toBeNull()
      expect(within(secao).getByText('Pomada só à noite.')).toBeTruthy()
      expect(within(secao).getByText(/Carla, (?:ontem às )?22:40/)).toBeTruthy()
      expect(within(secao).getByRole('link', { name: 'Ver notas' }).getAttribute('href')).toBe('/app/notas')
    })
  }

  it('"Últimos" fica em papel, com as horas tabulares à direita e respiro maior entre as linhas', async () => {
    await renderizarRotaPronta('/app/hoje')

    const secao = screen.getByRole('heading', { name: 'Últimos' }).closest('section')!
    expect(secao.hasAttribute('data-campo')).toBe(false)
    for (const item of secao.querySelectorAll('li')) {
      expect(item.className).toMatch(/\bpy-4\b/)
      const hora = item.lastElementChild!
      expect(hora.className).toContain('tabular')
      expect(hora.className).toContain('text-right')
    }
  })

  it('a ordem de leitura é a mesma: cartão, nota, últimos; e há um só cartão', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    const cartoes = container.querySelectorAll('main [data-andamento]')
    expect(cartoes).toHaveLength(1)
    const cartao = cartoes[0]
    const nota = screen.getByRole('heading', { name: 'Para você saber' })
    const ultimos = screen.getByRole('heading', { name: 'Últimos' })
    expect(cartao.compareDocumentPosition(nota) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(nota.compareDocumentPosition(ultimos) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })
})

describe('MAT-44 r3 #2: botões rápidos com o mesmo tratamento em toda largura e tema', () => {
  for (const [tema, estado] of [['claro', claro], ['madrugada', madrugada]] as const) {
    it(`Hoje (${tema}): quatro ações, cada uma com um pictograma decorativo antes do texto e sem encolher`, async () => {
      await renderizarRotaPronta('/app/hoje', estado)
      const barra = within(screen.getByRole('region', { name: 'Registro rápido' }))
      const esperados = [
        ['Iniciar sono de Heloísa', 'Sono', 'moon'],
        ['Iniciar mamada de Heloísa', 'Mamada', 'milk'],
        ['Registrar fralda de Heloísa', 'Fralda', 'droplets'],
        ['Mais registros', 'Mais', 'ellipsis'],
      ]
      const botoes = esperados.map(([nome, rotulo, classe]) => {
        const botao = barra.getByRole('button', { name: nome })
        const icones = botao.querySelectorAll('svg')
        expect(icones, nome).toHaveLength(1)
        expect([...icones[0].classList]).toEqual(expect.arrayContaining([`lucide-${classe}`, 'shrink-0']))
        expect(icones[0].getAttribute('aria-hidden')).toEqual('true')
        expect(botao.firstChild).toBe(icones[0])
        const texto = within(botao).getByText(rotulo, { exact: true })
        expect(icones[0].nextElementSibling).toBe(texto)
        expect(texto.closest('[hidden], [aria-hidden="true"], .sr-only, [inert]')).toBeNull()
        return botao
      })
      expect(barra.getAllByRole('button')).toEqual(botoes)
    })

    it(`Hoje (${tema}): Mais revela Tummy time e as outras ações na ordem, Tab não é bloqueado, Esc devolve o foco`, async () => {
      await renderizarRotaPronta('/app/hoje', estado)
      const barra = within(screen.getByRole('region', { name: 'Registro rápido' }))
      const mais = barra.getByRole('button', { name: 'Mais registros' })
      const nome = 'Iniciar tummy time de Heloísa'
      expect(mais.getAttribute('aria-expanded')).toEqual('false')
      expect(barra.queryByRole('button', { name: nome })).toBeNull()
      fireEvent.click(mais)
      const grupo = barra.getByRole('group', { name: 'Outros registros de Heloísa' })
      expect(mais.getAttribute('aria-expanded')).toEqual('true')
      expect(mais.getAttribute('aria-controls')).toBe(grupo.id)
      expect(grupo.id).not.toBe('')
      const interior = within(grupo)
      const botoes = [nome, 'Mamadeira', 'Alimentação sólida', 'Observação', 'Outro horário…']
        .map((name) => interior.getByRole('button', { name }))
      expect(interior.getAllByRole('button')).toEqual(botoes)
      expect(botoes[0].textContent?.trim()).toBe('Tummy time')
      expect(document.activeElement).toBe(botoes[0])
      for (const botao of botoes) expect(botao.tabIndex).toBe(0)
      expect(fireEvent.keyDown(botoes.at(-1)!, { key: 'Tab' })).toBe(true)
      fireEvent.keyDown(botoes[0], { key: 'Escape' })
      expect(grupo.isConnected).toBe(false)
      expect(mais.getAttribute('aria-expanded')).toEqual('false')
      expect(document.activeElement).toBe(mais)
    })
  }

  // O contrato sucessor de fonte e linha única é medido com CSS compilado em
  // componentes/rotina/rotinaReflow.geometria.test.tsx (MAT-44 r3 #2).
})

describe('MAT-44 r3 #3: aparelhos sem tela vazia', () => {
  it('as quatro capturas mantêm a proporção aprovada de 390 por 844, sem distorção na moldura', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    for (const fone of FONES_DO_INICIO) {
      const captura = screen.getByRole('img', { name: fone.alt })
      expect(captura.getAttribute('width')).toBe('390')
      expect(captura.getAttribute('height')).toBe('844')
      expect(captura.closest('.co-fone')).not.toBeNull()
    }
    const regras = regrasComContexto(lerTexto(CSS_INICIO)).filter((r) => r.seletor === '.co-fone img')
    expect(regras).toHaveLength(1)
    expect(regras[0].props['aspect-ratio']).toMatch(/^390\s*\/\s*844$/)
    expect(regras[0].props.height).toBe('auto')
  })

  it('cada launcher leva o foco a uma saída nomeada; sair e Escape restauram a prova e o foco', async () => {
    const { roteador } = await renderizarRotaPronta('/', { sessao: null })
    for (const fone of FONES_DO_INICIO) {
      for (const porEscape of [false, true]) {
        const painel = await abrirFone(fone)
        const sair = within(painel).getByRole<HTMLButtonElement>('button', { name: `Voltar à imagem (${fone.tituloNoPainel})` })
        const reiniciar = within(painel).getByRole<HTMLButtonElement>('button', { name: `Reiniciar ${fone.tituloNoPainel}` })
        for (const botao of [sair, reiniciar]) {
          expect(botao.disabled).toBe(false)
          expect(botao.tabIndex).toBe(0)
          expect(botao.classList.contains('alvo-toque')).toBe(true)
        }
        expect(document.activeElement).toBe(sair)
        if (porEscape) fireEvent.keyDown(sair, { key: 'Escape' })
        else fireEvent.click(sair)
        const gatilho = await screen.findByRole('button', { name: `Experimentar ${fone.titulo}` })
        expect(document.activeElement).toBe(gatilho)
        expect(screen.queryByRole('group', { name: fone.grupo })).toBeNull()
        expect(screen.getByRole('img', { name: fone.alt })).toBeTruthy()
        expect(roteador.state.location.pathname).toBe('/')
      }
    }
  })

  it('Encerrar funciona no Hoje à noite e Reiniciar restaura a mesma sessão e total', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    const painel = await abrirFone(FONES_DO_INICIO[1])
    const hoje = within(painel)
    expect((await hoje.findByText(/^Início às 20:30,/)).textContent).toBe('Início às 20:30, por Ícaro')
    const total = () => [...painel.querySelectorAll('[data-resumo] li')]
      .find((item) => item.textContent?.includes('Sono concluído'))
      ?.querySelector('[data-numero-do-dia]')?.textContent?.trim()
    expect(total()).toBe('6 h 35')
    fireEvent.click(hoje.getByRole('button', { name: 'Encerrar' }))
    await hoje.findByText('Nenhuma sessão em andamento.')
    await waitFor(() => expect(total()).toBe('7 h 47'))
    fireEvent.click(hoje.getByRole('button', { name: 'Reiniciar Hoje' }))
    expect((await hoje.findByText(/^Início às 20:30,/)).textContent).toBe('Início às 20:30, por Ícaro')
    expect(total()).toBe('6 h 35')
  })

  it('provas fechadas não introduzem ids e o botão não fica dentro da prova', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    for (const fone of FONES_DO_INICIO) {
      const cena = within(screen.getByRole('region', { name: fone.cena }))
      const prova = cena.getByRole('img', { name: fone.alt }).closest('figure')
      if (!prova) throw new Error(`Captura sem moldura: ${fone.titulo}`)
      expect(prova.id).toBe('')
      expect(prova.querySelector('[id]')).toBeNull()
      expect(prova.contains(cena.getByRole('button', { name: `Experimentar ${fone.titulo}` }))).toBe(false)
    }
  })
})

describe('MAT-44 r3 #4: campo do cronômetro apertado', () => {
  async function campoDaSessao() {
    const { container } = await renderizarRotaPronta('/app/sessao')
    return within(container).getByRole('region', { name: 'Duração da sessão' })
  }

  it('o mesmo rótulo nomeia o cartão e o timer, imediatamente abaixo dele', async () => {
    const campo = await campoDaSessao()
    const rotulo = within(campo).getByText('Duração da sessão')
    const numero = within(campo).getByRole('timer', { name: 'Duração da sessão' })
    expect(rotulo.id).not.toBe('')
    expect(campo.getAttribute('aria-labelledby')).toBe(rotulo.id)
    expect(numero.getAttribute('aria-labelledby')).toBe(rotulo.id)
    expect(numero.getAttribute('aria-live')).toBe('off')
    expect(rotulo.nextElementSibling).toBe(numero)
  })

  it('o número não flutua: o rótulo e o tempo usam o vão junto, sem margem automática', async () => {
    const campo = await campoDaSessao()
    const numero = within(campo).getByRole('timer')
    const pilha = numero.parentElement!
    expect(pilha).toBe(campo.firstElementChild)
    expect(pilha.getAttribute('data-h-vao')).toBe('junto')
    expect(lerTexto('componentes/base/layout/layout.css')).toMatch(/\[data-h-vao='junto'\]\s*\{\s*gap: var\(--espaco-junto\);/)
    expect(numero.className).not.toMatch(/\bm[ty]-auto\b/)
  })

  it('o cartão usa o respiro de painel, tem altura natural no estreito e só estica na grade larga', async () => {
    const campo = await campoDaSessao()
    const grade = campo.closest<HTMLElement>('[data-h~="colunas"]')!
    expect(campo.matches('[data-h~="cartao"]')).toBe(true)
    expect(lerTexto('componentes/base/layout/layout.css')).toMatch(/\[data-h~='cartao'\]\s*\{[^}]*padding: var\(--espaco-painel\);/)
    expect(campo.classList.contains('flex-1')).toBe(false)
    expect(campo.classList.contains('lg:flex-1')).toBe(true)
    expect(grade.getAttribute('data-h-quebra')).toBe('1024')
    expect(grade.style.getPropertyValue('--h-colunas')).toBe('minmax(0, 7fr) minmax(0, 5fr)')
    expect(grade.hasAttribute('data-h-alinhar')).toBe(false) // O padrão da grade é stretch.
    expect(grade.firstElementChild).toBe(campo.parentElement)
    expect(grade.children[1].hasAttribute('data-anteriores')).toBe(true)
  })

  it('as ações do cartão levam o foco ao painel de nota ou descarte e Esc o devolve', async () => {
    const campo = await campoDaSessao()
    const anotar = within(campo).getByRole('button', { name: 'Encerrar e anotar' })
    fireEvent.click(anotar)
    const nota = within(campo).getByRole('textbox', { name: 'Nota' })
    expect(document.activeElement).toBe(nota)
    expect(within(campo).queryByRole('button', { name: /^Encerrar$/ })).toBeNull()
    fireEvent.keyDown(nota, { key: 'Escape' })
    expect(within(campo).queryByRole('textbox', { name: 'Nota' })).toBeNull()
    expect(document.activeElement).toBe(within(campo).getByRole('button', { name: 'Encerrar e anotar' }))

    fireEvent.click(within(campo).getByRole('button', { name: 'Descartar' }))
    const manter = within(campo).getByRole('button', { name: 'Manter' })
    expect(document.activeElement).toBe(manter)
    fireEvent.keyDown(manter, { key: 'Escape' })
    expect(within(campo).queryByRole('button', { name: 'Manter' })).toBeNull()
    expect(document.activeElement).toBe(within(campo).getByRole('button', { name: 'Descartar' }))
  })
})

// ---------------------------------------------------------------------------
// Rodada 4.

describe('MAT-44 r4 #1: a Sessão ocupa o vazio com uma ilustração do tipo da sessão', () => {
  // A arte por tipo agora é do cartão do Hoje, em desktop claro. A Sessão ativa tem cronômetro e ações.
  for (const [tipo, ilustracao] of [
    ['sono', 'pai-colo'],
    ['tummy', 'tummy-time'],
    ['mamada', 'mae-noite'],
  ] as const) {
    for (const [tema, madrugadaLigada] of [
      ['claro', false],
      ['madrugada', true],
    ] as const) {
      it(`${tipo} (${tema}): desenho "${ilustracao}" no cartão do Hoje, sem arte na Sessão ativa`, async () => {
        const opcoes = { ...sessaoDe(tipo), madrugada: madrugadaLigada }
        const hoje = await renderizarRotaPronta('/app/hoje', opcoes)
        const desenho = hoje.container.querySelector('main [data-andamento] [data-desenho]')!
        const imagens = [...desenho.querySelectorAll('img[data-ilustracao]')]
        expect(new Set(imagens.map((img) => img.getAttribute('data-ilustracao')))).toEqual(new Set([ilustracao]))
        expect(desenho.getAttribute('aria-hidden')).toBe('true')
        expect([...desenho.classList]).toEqual(expect.arrayContaining(['hidden', 'lg:block', '[[data-tema=madrugada]_&]:hidden']))
        expect(document.documentElement.getAttribute('data-tema')).toBe(madrugadaLigada ? 'madrugada' : null)
        hoje.unmount()

        const { container } = await renderizarRotaPronta('/app/sessao', opcoes)
        const pagina = within(container).getByRole('main')
        const campo = within(pagina).getByRole('region', { name: 'Duração da sessão' })
        expect(within(campo).getByRole('timer', { name: 'Duração da sessão' })).toBeTruthy()
        expect(within(campo).getByRole('button', { name: /^Encerrar$/ })).toBeTruthy()
        expect(pagina.querySelector('[data-midia], [data-ilustracao]')).toBeNull()
      })
    }
  }

  it('na Sessão vazia a cena vem antes das anteriores, preserva o quadro 3:2 e não ocupa o fluxo das ações', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao', semSessao)
    const pagina = within(container).getByRole('main')
    const cena = pagina.querySelector<HTMLElement>('[data-midia]')!
    const anteriores = pagina.querySelector('[data-anteriores]')!
    const grade = cena.parentElement!
    expect(grade.matches('[data-h~="colunas"][data-h-vao="bloco"][data-h-quebra="1024"]')).toBe(true)
    expect(grade.style.getPropertyValue('--h-colunas')).toBe('minmax(0, 7fr) minmax(0, 5fr)')
    expect(grade.getAttribute('data-h-alinhar')).toBe('inicio')
    expect(grade.firstElementChild).toBe(cena)
    expect(cena.nextElementSibling).toBe(anteriores)
    expect([...cena.classList]).toEqual(expect.arrayContaining(['aspect-[3/2]', 'p-esp-painel']))
    const imagem = cena.querySelector('img[data-ilustracao]')!
    expect([...imagem.classList]).toEqual(expect.arrayContaining(['h-full', 'w-auto', 'max-w-full', 'object-contain']))
    expect(pagina.querySelector('[data-acoes]')).toBeNull()
  })

  it('a Sessão vazia mantém a mesma cena de mel em ambos os temas', async () => {
    for (const [tema, estado] of [['claro', claro], ['madrugada', madrugada]] as const) {
      const { container, unmount } = await renderizarRotaPronta('/app/sessao', { ...estado, ...semSessao })
      const cenas = container.querySelectorAll('main [data-midia]')
      expect(cenas).toHaveLength(1)
      expect(cenas[0].classList.contains('bg-mel')).toBe(true)
      expect([...container.querySelectorAll('main [data-ilustracao]')].map((f) => f.getAttribute('data-ilustracao'))).toEqual(['mae-noite'])
      expect(document.documentElement.getAttribute('data-tema')).toBe(tema === 'madrugada' ? 'madrugada' : null)
      unmount()
    }
  })
})

describe('MAT-44 r4 #2: campo da madrugada recomposto', () => {
  it('a ordem de leitura empilhada mantém o Histórico às 17:30 antes do Hoje às 20:30', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    const noite = screen.getByRole('region', { name: INI.h2Noite })
    const hoje = screen.getByRole('region', { name: INI.h2Tela })
    expect(noite.nextElementSibling).toBe(hoje)
    const ordem = [
      within(noite).getByRole('heading', { name: INI.h2Noite }), within(noite).getByText(INI.pNoite),
      within(noite).getByRole('img', { name: INI.altTela1 }), within(noite).getByRole('img', { name: INI.altCena2 }),
      noite.querySelector('[data-legenda]'), within(hoje).getByRole('heading', { name: INI.h2Tela }),
      within(hoje).getByText(INI.pTela), within(hoje).getByRole('img', { name: INI.altTela2 }),
    ]
    expect(ordem[4]?.textContent).toBe(INI.leg2)
    for (let i = 1; i < ordem.length; i++) {
      const anterior = ordem[i - 1]
      const atual = ordem[i]
      if (!anterior || !atual) throw new Error('Sequência editorial incompleta')
      expect(anterior.compareDocumentPosition(atual) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('cada filho tem a sua área da grade, e a grade larga põe o texto no alto e a ilustração na base do celular', () => {
    const css = semComentarios(estiloGlobal)

    expect(css).toMatch(/grid-template-areas:\s*"texto celular"\s*"cena celular"\s*"\. legenda"/)
    expect(css).toMatch(/grid-template-rows:\s*auto 1fr auto/)
    for (const [classe, area] of [
      ['madrugada-texto', 'texto'],
      ['madrugada-cena', 'cena'],
      ['madrugada-celular', 'celular'],
      ['madrugada-legenda', 'legenda'],
    ]) {
      expect(css, classe).toMatch(new RegExp(`\\.${classe}\\s*\\{[^}]*grid-area:\\s*${area}\\s*;`))
    }
    const cena = regrasDe(estiloGlobal).filter((r) => r.seletor === '.madrugada-cena').map((r) => r.corpo).join('')
    expect(cena).toMatch(/align-self:\s*end/)
  })

  it('a legenda tem a largura do celular e não alarga a coluna', () => {
    const regras = regrasDe(estiloGlobal).filter((r) => r.seletor === '.madrugada-legenda').map((r) => r.corpo).join('')

    expect(regras).toMatch(/width:\s*0\s*;/)
    expect(regras).toMatch(/min-width:\s*100%/)
  })

  it('os painéis de noite têm nomes e conteúdos distintos no mesmo trilho, sem uma terceira legenda', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    const noite = screen.getByRole('region', { name: INI.h2Noite })
    const hoje = screen.getByRole('region', { name: INI.h2Tela })
    expect(noite.parentElement?.classList.contains('co-fita')).toBe(true)
    expect(hoje.parentElement).toBe(noite.parentElement)
    expect(noite.querySelectorAll('[data-legenda]')).toHaveLength(1)
    expect(hoje.querySelectorAll('[data-legenda]')).toHaveLength(0)
    expect(within(noite).queryByRole('img', { name: INI.altTela2 })).toBeNull()
    expect(within(hoje).queryByRole('img', { name: INI.altCena2 })).toBeNull()
    const regras = regrasComContexto(lerTexto(CSS_INICIO))
    for (const seletor of ['.co-p2', '.co-p3']) {
      expect(regras.find((r) => r.seletor === seletor && r.condicao === null)?.props.background).toBe('var(--noite)')
    }
  })
})

describe('MAT-44 r2 A3: texto de interface vem dos módulos de conteúdo', () => {
  const paginas = listarFontes(pastaSrc).filter((f) => f.nome.startsWith('paginas/') && f.nome.endsWith('.tsx'))

  it('encontra as páginas', () => {
    expect(paginas.map((p) => p.nome)).toEqual(
      expect.arrayContaining([
        'paginas/rotina/Hoje.tsx',
        'paginas/Inicio.tsx',
        'paginas/NaoEncontrada.tsx',
        'paginas/rotina/Sessao.tsx',
      ]),
    )
  })

  it('nenhum arquivo de paginas/ declara frase de interface em literal', () => {
    const achados = paginas.flatMap((p) => frasesSoltas(p.texto).map((frase) => `${p.nome}: ${frase}`))
    expect(achados).toEqual([])
  })

  it('o detector enxerga uma constante de texto', () => {
    expect(frasesSoltas(`const LEGENDA = 'No celular, a mesma sessão de tummy time'`)).toHaveLength(1)
    expect(frasesSoltas(`<div className="flex flex-wrap gap-2" aria-label="Seções da página" />`)).toEqual([])
  })

  it('o cabeçalho e o Início consomem os rótulos e as legendas dos módulos de conteúdo', async () => {
    const cabecalho = lerTexto('componentes/casca/Cabecalho.tsx')
    const inicio = paginas.find((p) => p.nome === 'paginas/Inicio.tsx')?.texto
    expect(cabecalho).toMatch(/import\s*\{[^}]*\bITENS_DO_CABECALHO\b[^}]*\}\s*from '\.\/textos\.ts'/)
    expect(inicio).toMatch(/import\s*\{[^}]*\bINI\b[^}]*\}\s*from '\.\.\/conteudo\/inicio\.ts'/)

    const { container, roteador } = await renderizarRotaPronta('/', { sessao: null })
    await screen.findByRole('heading', { level: 1, name: INI.h1 })
    const navegacao = screen.getByRole('navigation', { name: 'Site' })
    const links = within(navegacao).getAllByRole('link')
    expect(links.map((a) => ({ rotulo: a.textContent, para: a.getAttribute('href') }))).toEqual(ITENS_DO_CABECALHO.publico)
    for (const [cena, legenda] of [['.co-p1', INI.leg1], ['.co-p2', INI.leg2]]) {
      const legendas = container.querySelectorAll(`${cena} [data-legenda]`)
      expect(legendas).toHaveLength(1)
      expect(legendas[0].textContent).toBe(legenda)
      const [hora, ...resto] = legenda.split(', ')
      expect(legendas[0].querySelector('.co-leg-hora')?.textContent).toBe(hora)
      expect(legendas[0].querySelector('.co-leg-resto')?.textContent).toBe(resto.join(', '))
    }
    fireEvent.click(within(navegacao).getByRole('link', { name: 'Como funciona' }))
    await screen.findByRole('link', { name: 'Como funciona', current: 'page' })
    expect(roteador.state.location.pathname).toBe('/como-funciona')
  })

  it('os rótulos, destinos e legendas são exatamente os aprovados', () => {
    expect(ITENS_DO_CABECALHO.publico).toEqual([
      { rotulo: 'Como funciona', para: '/como-funciona' },
      { rotulo: 'Cuidado compartilhado', para: '/cuidado-compartilhado' },
      { rotulo: 'Desenvolvimento', para: '/desenvolvimento' },
      { rotulo: 'Comunidade', para: '/comunidade' },
    ])
    expect([INI.leg1, INI.leg2]).toEqual([
      '16:00, mamada, anotada por Ju',
      '17:30, fralda, anotada por Ícaro',
    ])
  })
})

// ---------------------------------------------------------------------------
// Rodada 5: correção pedida pela revisão.

interface RegraCss {
  seletor: string
  props: Record<string, string>
  /** O texto do at-rule condicional (@media ou @container) que envolve a regra, se houver. */
  condicao: string | null
  /** Posição da regra no arquivo. */
  ordem: number
}

/** Lê o CSS como texto, com o contexto de cada regra (dentro de @media/@container ou não). */
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

/** Seletores cuja propriedade é redeclarada, sem condição, DEPOIS de um bloco condicional que a muda. */
function cascataDesfeita(css: string): string[] {
  const regras = regrasComContexto(css)
  const achados: string[] = []
  for (const condicional of regras.filter((r) => r.condicao !== null)) {
    for (const propriedade of Object.keys(condicional.props)) {
      const depois = regras.filter(
        (r) => r.condicao === null && r.seletor === condicional.seletor && propriedade in r.props && r.ordem > condicional.ordem,
      )
      if (depois.length > 0) achados.push(`${condicional.seletor} { ${propriedade} } em ${condicional.condicao}`)
    }
  }
  return [...new Set(achados)]
}

describe('MAT-44 r5 R1: a cascata não desfaz a medida dentro de @container ou @media', () => {
  it('nenhum seletor declara sem condição, depois de um bloco condicional, a propriedade que ele muda', () => {
    expect(cascataDesfeita(estiloGlobal)).toEqual([])
  })

  it('o detector enxerga a regra sem condição que vem depois do bloco condicional', () => {
    const ruim = `
      @container pagina (min-width: 46rem) { .palco { width: 72rem; } }
      .palco { width: 58rem; }
    `
    const bom = `
      .palco { width: 58rem; }
      @container pagina (min-width: 46rem) { .palco { width: 72rem; } }
    `
    expect(cascataDesfeita(ruim)).toEqual(['.palco { width } em @container pagina (min-width: 46rem)'])
    expect(cascataDesfeita(bom)).toEqual([])
  })
})

/** O que vale em cada largura de página (em rem) para a vitrine: escala do palco e tamanho natural dele. */
function vitrineEm(largura: number) {
  const regras = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.vitrine')
  const valores: Record<string, number> = {}
  for (const regra of regras.sort((a, b) => a.ordem - b.ordem)) {
    if (regra.condicao) {
      const minimo = /min-width:\s*([\d.]+)rem/.exec(regra.condicao)
      if (!minimo || largura < parseFloat(minimo[1])) continue
    }
    for (const nome of ['--escala', '--palco-largura', '--palco-altura']) {
      if (nome in regra.props) valores[nome] = parseFloat(regra.props[nome])
    }
  }
  return { escala: valores['--escala'], largura: valores['--palco-largura'], altura: valores['--palco-altura'] }
}

describe('MAT-44 r5 R1: o conjunto de aparelhos cabe no campo, centrado, em toda largura', () => {
  it('o palco é centrado pela própria largura (não por um valor fixo que a cascata possa trocar)', () => {
    const palco = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.vitrine-palco')
    expect(palco.every((r) => r.condicao === null)).toBe(true)
    const corpo = palco.map((r) => r.props)
    expect(corpo.some((p) => p['left'] === '50%')).toBe(true)
    expect(corpo.some((p) => /^calc\(var\(--palco-largura\)\s*\/\s*-2\)$/.test(p['margin-left'] ?? ''))).toBe(true)
    expect(corpo.some((p) => p['width'] === 'var(--palco-largura)')).toBe(true)
  })

  it('de 6 rem (fonte raiz em 200% numa janela de celular, ou zoom alto) a 140 rem, o palco escalado cabe na largura', () => {
    for (let largura = 6; largura <= 140; largura += 0.25) {
      const { escala, largura: palco } = vitrineEm(largura)
      expect(escala, `escala em ${largura} rem`).toBeGreaterThan(0)
      expect(palco * escala, `palco de ${palco} rem × ${escala} em ${largura} rem`).toBeLessThanOrEqual(largura + 1e-9)
    }
  })

  it('a escala só cresce com a largura, dentro de cada faixa (sem degrau para trás, salvo na troca de palco em 46 rem)', () => {
    let anterior = 0
    for (let largura = 6; largura <= 140; largura += 0.25) {
      const { escala } = vitrineEm(largura)
      if (Math.abs(largura - 46) < 1e-9) {
        anterior = 0
        continue
      }
      expect(escala, `${largura} rem`).toBeGreaterThanOrEqual(anterior)
      anterior = escala
    }
  })

  it('a declaração de altura do panorama a 1440 × 900 preserva o teto de 95% em ambos os modos', () => {
    const css = regrasComContexto(lerTexto(CSS_INICIO))
    const painel = css.find((r) => r.seletor === '.co-painel' && r.condicao === `@media ${FAIXA_LARGA_INICIO}`)?.props
    expect(painel?.height).toBe('var(--palco)')
    const piso = /^max\(100svh - var\(--cm-cabecalho\), ([\d.]+)rem\)$/.exec(painel?.['--palco'] ?? '')?.[1]
    const palcoPreso = css.find((r) => r.seletor === '.co-palco' && r.props.position === 'sticky')?.props
    expect(palcoPreso?.height).toBe('var(--palco-util)')
    expect(palcoPreso?.['--palco-util']).toBe('calc(100svh - var(--cm-cabecalho))')
    const desktop = regrasComContexto(lerTexto('styles/site.css')).find((r) => r.seletor === ':root' && /min-width:\s*1100px/.test(r.condicao ?? ''))
    const altura = 900 - parseFloat(desktop?.props['--cm-cabecalho'] ?? '')
    expect(altura).toBeGreaterThan(0)
    expect(altura).toBeLessThanOrEqual(0.95 * 900)
    expect(Math.max(altura, Number(piso ?? NaN) * 16)).toBeLessThanOrEqual(0.95 * 900)
  })

  interface Retangulo { x: number; y: number; largura: number; altura: number }

  const numero = (classe: string, prefixo: string, variante = ''): number | undefined => {
    const m = new RegExp(`(?:^|\\s)${variante.replace(/[[\]/]/g, '\\$&')}${prefixo}-\\[(-?[\\d.]+)(?:rem)?\\]`).exec(classe)
    return m ? parseFloat(m[1]) : undefined
  }

  async function retangulos(faixa: 'estreita' | 'larga'): Promise<{ palco: { largura: number; altura: number }; itens: Array<Retangulo & { tela: string }> }> {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    const palco = vitrineEm(faixa === 'larga' ? 70 : 30)
    const largura = parseFloat(/width:\s*([\d.]+)rem/.exec(regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-celular')!.corpo)![1])
    const proporcao = /aspect-ratio:\s*(\d+)\s*\/\s*(\d+)/.exec(regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-celular')!.corpo)!
    const alturaCelular = largura * (parseFloat(proporcao[2]) / parseFloat(proporcao[1]))
    const larguraNotebook = parseFloat(/width:\s*([\d.]+)rem/.exec(regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-notebook')!.corpo)![1])
    const baseCorpo = regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-base')!.corpo
    // A base do notebook sai da moldura pelos dois lados (margin-inline negativa).
    const extensaoDaBase = -parseFloat(/margin-inline:\s*(-[\d.]+)rem/.exec(baseCorpo)![1])
    const alturaBase = parseFloat(/height:\s*([\d.]+)rem/.exec(baseCorpo)![1])
    const variante = faixa === 'larga' ? '@min-[46rem]/pagina:' : ''

    const itens = [...container.querySelectorAll<HTMLElement>('#secao-telas [data-aparelho]')].map((aparelho) => {
      const classe = aparelho.getAttribute('class')!
      const pega = (prefixo: string) => numero(classe, prefixo, variante) ?? numero(classe, prefixo)!
      const escala = pega('scale')
      const x = pega('left')
      const y = pega('top')
      if (aparelho.getAttribute('data-aparelho') === 'notebook') {
        const altura = (larguraNotebook * 10) / 16 + alturaBase + 0.25
        return {
          tela: aparelho.getAttribute('data-tela')!,
          x: x - extensaoDaBase * escala,
          y,
          largura: (larguraNotebook + 2 * extensaoDaBase) * escala,
          altura: altura * escala,
        }
      }
      return { tela: aparelho.getAttribute('data-tela')!, x, y, largura: largura * escala, altura: alturaCelular * escala }
    })
    return { palco: { largura: palco.largura, altura: palco.altura }, itens }
  }

  for (const faixa of ['estreita', 'larga'] as const) {
    it(`faixa ${faixa}: nenhum aparelho passa da borda do palco e há folga de pelo menos 2 rem dos quatro lados`, async () => {
      const { palco, itens } = await retangulos(faixa)

      expect(itens.length).toBeGreaterThanOrEqual(2)
      const esquerda = Math.min(...itens.map((i) => i.x))
      const direita = palco.largura - Math.max(...itens.map((i) => i.x + i.largura))
      const topo = Math.min(...itens.map((i) => i.y))
      const base = palco.altura - Math.max(...itens.map((i) => i.y + i.altura))
      expect(esquerda, 'folga à esquerda').toBeGreaterThanOrEqual(2)
      expect(direita, 'folga à direita').toBeGreaterThanOrEqual(2)
      expect(topo, 'folga em cima').toBeGreaterThanOrEqual(2)
      expect(base, 'folga embaixo').toBeGreaterThanOrEqual(2)
      // Centrado: as folgas laterais diferem em até 1 rem.
      expect(Math.abs(esquerda - direita), `esquerda ${esquerda}, direita ${direita}`).toBeLessThanOrEqual(1)
    })
  }
})

describe('MAT-44 r5 R2: ícones da casca pública e navegação e registro do app', () => {
  const acoes = [
    ['Iniciar sono de Heloísa', 'Sono', 'moon'],
    ['Iniciar mamada de Heloísa', 'Mamada', 'milk'],
    ['Registrar fralda de Heloísa', 'Fralda', 'droplets'],
    ['Mais registros', 'Mais', 'ellipsis'],
  ] as const

  function conferirAcoes(regiao: HTMLElement) {
    const barra = within(regiao)
    const botoes = acoes.map(([name, texto, classe]) => {
      const botao = barra.getByRole('button', { name })
      expect(within(botao).getByText(texto, { exact: true }).closest('[hidden], [aria-hidden="true"], .sr-only, [inert]')).toBeNull()
      const icones = botao.querySelectorAll('svg')
      expect(icones).toHaveLength(1)
      expect([...icones[0].classList]).toEqual(expect.arrayContaining(['lucide', `lucide-${classe}`]))
      expect(icones[0].getAttribute('aria-hidden')).toEqual('true')
      return icones[0]
    })
    expect(barra.getAllByRole('button')).toEqual(botoes.map((icone) => icone.closest('button')))
    return botoes
  }

  // A única exceção da casca é o pictograma do botão nomeado Menu, nunca seus descendentes arbitrários.
  function svgsNaoIlustrativos(raiz: ParentNode) {
    return [...raiz.querySelectorAll('svg')].filter((svg) =>
      !svg.hasAttribute('data-ilustracao') || svg.classList.contains('lucide') ||
      svg.getAttribute('aria-hidden') !== 'true' || svg.closest('button, a, [tabindex], [role="button"]') !== null,
    )
  }

  function iconeDoMenu(menu: HTMLElement, aberto: boolean) {
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Menu' })).toBe(menu)
    expect(menu.getAttribute('aria-expanded')).toEqual(String(aberto))
    const icones = menu.querySelectorAll('svg')
    expect(icones).toHaveLength(1)
    expect([...icones[0].classList]).toEqual(expect.arrayContaining(['lucide', aberto ? 'lucide-x' : 'lucide-menu']))
    expect(icones[0].getAttribute('aria-hidden')).toEqual('true')
    expect(icones[0].hasAttribute('tabindex')).toBe(false)
    expect(menu.firstElementChild).toBe(icones[0])
    return icones[0]
  }

  for (const caminho of ['/', '/qualquer-coisa', '/outra/rota/que/nao/existe']) {
    it(`${caminho}: só o botão Menu tem Lucide, inclusive quando aberto e fora da árvore principal`, async () => {
      await renderizarRotaPronta(caminho, { sessao: null })
      const titulo = caminho === '/' ? `${INI.h1Dia} ${INI.h1Noite}` : 'Aqui não mora ninguém.'
      expect(screen.getByRole('heading', { level: 1, name: titulo }).closest('[hidden], [aria-hidden="true"], .sr-only, [inert]')).toBeNull()
      const menu = within(screen.getByRole('banner')).getByRole('button', { name: 'Menu' })
      expect([...document.querySelectorAll('svg.lucide')]).toEqual([iconeDoMenu(menu, false)])
      fireEvent.click(menu)
      expect([...document.querySelectorAll('svg.lucide')]).toEqual([iconeDoMenu(menu, true)])
    })

    it(`${caminho}: fora do Menu, SVG só como ilustração decorativa`, async () => {
      await renderizarRotaPronta(caminho, { sessao: null })
      const menu = within(screen.getByRole('banner')).getByRole('button', { name: 'Menu' })
      expect(svgsNaoIlustrativos(document)).toEqual([iconeDoMenu(menu, false)])
    })
  }

  it('o detector não aceita ícone novo num trecho inerte nem ícone disfarçado de ilustração', () => {
    const trecho = document.createElement('div')
    trecho.innerHTML = `<div inert>
      <svg data-ilustracao="decoracao" aria-hidden="true"></svg>
      <svg data-ilustracao="disfarce" class="lucide" aria-hidden="true"></svg>
      <svg></svg>
      <button><svg data-ilustracao="acao" aria-hidden="true"></svg></button>
      <svg data-ilustracao="exposta"></svg>
    </div>`
    const [, disfarce, semMarca, acao, exposta] = trecho.querySelectorAll('svg')
    expect(svgsNaoIlustrativos(trecho)).toEqual([disfarce, semMarca, acao, exposta])
  })

  it('Início: o telefone estático não monta ações; a demo aberta usa os mesmos quatro rótulos e não vaza ícones para a página', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    const gatilho = screen.getByRole('button', { name: 'Experimentar Hoje à noite' })
    const grupo = 'Tela interativa de Hoje à noite'
    expect(screen.queryByRole('group', { name: grupo })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Registro rápido' })).toBeNull()
    fireEvent.click(gatilho)
    const demo = await screen.findByRole('group', { name: grupo })
    const dentro = within(demo)
    const voltar = dentro.getByRole('button', { name: 'Voltar à imagem (Hoje)' })
    const acoesDaDemo = conferirAcoes(await dentro.findByRole('region', { name: 'Registro rápido' }))
    const controles = [
      [dentro.getByRole('button', { name: 'Reiniciar Hoje' }), 'rotate-ccw', 'Reiniciar'],
      [voltar, 'x', 'Voltar à imagem'],
      [dentro.getByRole('button', { name: 'Iniciar mamada' }), 'milk', 'Iniciar mamada'],
    ] as const
    const esperados = controles.map(([controle, classe, rotulo]) => {
      const texto = [...controle.children].filter((filho) => !filho.matches('svg, [hidden], [aria-hidden="true"], .sr-only'))
        .map((filho) => filho.textContent?.trim()).join(' ')
      expect(texto).toBe(rotulo)
      const svgs = controle.querySelectorAll('svg')
      expect(svgs).toHaveLength(1)
      expect([...svgs[0].classList]).toEqual(expect.arrayContaining(['lucide', `lucide-${classe}`]))
      expect(svgs[0].getAttribute('aria-hidden')).toEqual('true')
      return svgs[0]
    })
    const menu = within(screen.getByRole('banner')).getByRole('button', { name: 'Menu' })
    expect(svgsNaoIlustrativos(document)).toEqual([iconeDoMenu(menu, false), ...esperados, ...acoesDaDemo])
    fireEvent.click(voltar)
    expect(demo.isConnected).toBe(false)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Experimentar Hoje à noite' }))
    expect(svgsNaoIlustrativos(document)).toEqual([iconeDoMenu(menu, false)])
  })

  const destinos = [
    ['Hoje', '/app/hoje'], ['Sessão', '/app/sessao'], ['Histórico', '/app/historico'],
    ['Desenvolvimento', '/app/desenvolvimento'], ['Comunidade', '/app/comunidade'], ['Família', '/app/familia'],
  ] as const

  function conferirLinks(grupo: HTMLElement, caminho: string) {
    const interior = within(grupo)
    const links = destinos.map(([name, href]) => {
      const link = interior.getByRole('link', { name })
      expect(link.textContent?.trim()).toBe(name)
      expect(link.getAttribute('href')).toBe(href)
      expect(link.querySelectorAll('svg')).toHaveLength(0)
      expect(link.tabIndex).toBe(0)
      if (href === caminho) expect(link.getAttribute('aria-current')).toEqual('page')
      else expect(link.hasAttribute('aria-current')).toBe(false)
      return link
    })
    return links
  }

  for (const caminho of ['/app/hoje', '/app/sessao']) {
    for (const [tema, estado] of [['claro', claro], ['madrugada', madrugada]] as const) {
      it(`${caminho} (${tema}): navegação por texto no cabeçalho e na divulgação, com página atual e sem prender Tab`, async () => {
        await renderizarRotaPronta(caminho, estado)
        const topo = within(screen.getByRole('banner'))
        const nav = topo.getByRole('navigation', { name: 'Site' })
        expect(within(nav).getAllByRole('link')).toEqual(conferirLinks(nav, caminho))
        const menu = topo.getByRole('button', { name: 'Menu' })
        expect(iconeDoMenu(menu, false).isConnected).toBe(true)
        const id = menu.getAttribute('aria-controls')
        expect(id).toBeTruthy()
        const painel = id && document.getElementById(id)
        if (!(painel instanceof HTMLElement)) throw new Error('aria-controls não aponta para o painel do Menu')
        expect(painel.hidden).toBe(true)
        fireEvent.click(menu)
        expect(iconeDoMenu(menu, true).isConnected).toBe(true)
        const links = conferirLinks(painel, caminho)
        const lista = within(painel).getByRole('list')
        expect(within(lista).getAllByRole('link')).toEqual(links)
        expect(document.activeElement).toBe(links[0])
        expect(fireEvent.keyDown(links[0], { key: 'Tab', shiftKey: true })).toBe(true)
        const sair = within(painel).getByRole('button', { name: 'Sair' })
        sair.focus()
        expect(fireEvent.keyDown(sair, { key: 'Tab' })).toBe(true)
        fireEvent.keyDown(sair, { key: 'Escape' })
        expect(menu.getAttribute('aria-expanded')).toEqual('false')
        expect(painel.hidden).toBe(true)
        expect(document.activeElement).toBe(menu)
      })
    }
  }

  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`/app/hoje (${tema}): os quatro botões rápidos com ícone continuam com ícone e rótulo visível`, async () => {
      await renderizarRotaPronta('/app/hoje', estado)

      const barra = screen.getByRole('region', { name: 'Registro rápido' })
      expect(barra.closest('nav, [role="navigation"]')).toBeNull()
      expect([...barra.querySelectorAll('svg')]).toEqual(conferirAcoes(barra))
    })
  }
})

describe('MAT-44 r5 R3: a vitrine mostra as telas que a legenda anuncia, em toda largura', () => {
  it('cada captura tem o nome da tela e fornece as duas resoluções WebP da prova aprovada', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    for (const fone of FONES_DO_INICIO) {
      const cena = within(screen.getByRole('region', { name: fone.cena }))
      const captura = cena.getByRole<HTMLImageElement>('img', { name: fone.alt })
      const base = `${import.meta.env.BASE_URL}composicao/a/${fone.arquivo}`
      expect(captura.getAttribute('src')).toBe(`${base}-780w.webp`)
      expect(captura.getAttribute('srcset')).toBe(`${base}-780w.webp 780w, ${base}-1170w.webp 1170w`)
      expect(captura.getAttribute('sizes')).toBeTruthy()
    }
  })

  it('a tela Família muda a autoria para Ícaro, grava a fralda e Reiniciar devolve o papel inicial', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    const painel = await abrirFone(FONES_DO_INICIO[2])
    const familia = within(painel)
    await familia.findByText(/Desde o seu último registro, às 16:20/i)
    expect(painel.querySelector('[data-dt-papel-ativo]')?.textContent).toMatch(/responsável/i)
    fireEvent.click(familia.getByRole('button', { name: 'Ícaro' }))
    await familia.findByText(/Desde o seu último registro, às 18:05/i)
    expect(painel.querySelector('[data-dt-papel-ativo]')?.textContent).toMatch(/cuidador/i)
    fireEvent.click(familia.getByRole('button', { name: /Anotar fralda como Ícaro/i }))
    await familia.findByText(/Fralda anotada por Ícaro/i)
    fireEvent.click(familia.getByRole('button', { name: 'Reiniciar Família' }))
    await familia.findByText(/Desde o seu último registro, às 16:20/i)
    expect(painel.querySelector('[data-dt-papel-ativo]')?.textContent).toMatch(/responsável/i)
    expect(familia.queryByText(/Fralda anotada por Ícaro/i)).toBeNull()
  })

  it('nenhum dos quatro gatilhos nem a sua captura é escondido por utilitário responsivo', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    const esconde = /(^|:)(hidden|invisible|sr-only|opacity-0|collapse)$/
    const principal = screen.getByRole('main')
    for (const fone of FONES_DO_INICIO) {
      const cena = within(within(principal).getByRole('region', { name: fone.cena }))
      for (const elemento of [cena.getByRole('img', { name: fone.alt }), cena.getByRole('button', { name: `Experimentar ${fone.titulo}` })]) {
        for (let no: HTMLElement | null = elemento; no && no !== principal.parentElement; no = no.parentElement) {
          const classes = [...no.classList].filter((classe) => esconde.test(classe))
          expect(classes, `${no.tagName.toLowerCase()}.${no.className}`).toEqual([])
          expect(no.hasAttribute('hidden')).toBe(false)
        }
      }
    }
  })

  it('os seletores das provas e dos gatilhos não os escondem por CSS em nenhuma faixa', () => {
    const regras = [
      ...regrasComContexto(lerTexto(CSS_INICIO)),
      ...regrasComContexto(lerTexto('componentes/demo-telefone/demoTelefone.css')),
    ].filter((r) => /\.(co-fone|dt-envoltoria|dt-gatilho|dt-barra-gatilho|dt-moldura-ativa)\b/.test(r.seletor))
    expect(regras.some((r) => r.seletor === '.co-fone')).toBe(true)
    expect(regras.some((r) => r.seletor === '.dt-gatilho')).toBe(true)
    const escondem = regras.filter((r) => r.props['display'] === 'none' || r.props['visibility'] === 'hidden' || r.props['opacity'] === '0')
    expect(escondem.map((r) => r.seletor)).toEqual([])
  })

  it('as larguras CSS dos quatro telefones em 390 × 844 reservam pelo menos 9 rem', async () => {
    const { container } = await renderizarRotaPronta('/', { sessao: null })
    expect(container.querySelector('main [data-casa] > .co')).not.toBeNull()
    const css = regrasComContexto(lerTexto(CSS_INICIO))
    expect(css.find((r) => r.seletor === '.co' && r.condicao === null)?.props['container-type']).toBe('inline-size')
    expect(css.find((r) => r.seletor === '.co-fone')?.props.width).toBe('var(--fone-w)')
    const cabecalho = regrasComContexto(lerTexto('styles/site.css')).find((r) => r.seletor === ':root' && r.condicao === null)
    const espaco = 844 - parseFloat(cabecalho?.props['--cm-cabecalho'] ?? '')
    const fones = ['.co-p2-cena', '.co-p3-cena', '.co-so-fone', '.co-prova-fone']
    for (const [i, fone] of FONES_DO_INICIO.entries()) {
      const seletor = fones[i]
      const demo = container.querySelector(`[data-demo-fluxo="${fone.fluxo}"]`)
      expect(demo?.closest(seletor)?.matches(seletor)).toBe(true)
      const valor = css.find((r) => r.seletor === seletor && r.condicao === null)?.props['--fone-w'] ?? ''
      const termos = /^min\(([\d.]+)cqw, ([\d.]+)rem(?:, \(100svh - var\(--cm-cabecalho\)\) \/ ([\d.]+))?\)$/.exec(valor)
      if (!termos) throw new Error(`Largura CSS sem orçamento verificável: ${seletor}: ${valor}`)
      const minimos = [390 * Number(termos[1]) / 100, 16 * Number(termos[2])]
      if (termos[3]) minimos.push(espaco / Number(termos[3]))
      expect(Math.min(...minimos) / 16, fone.titulo).toBeGreaterThanOrEqual(9)
    }
  })
})

// ---------------------------------------------------------------------------
// Rodada 6: regras de composição do Início. Medidas de gosto (tamanhos, paddings, vãos) não são
// fixadas em teste: são conferidas em captura. Aqui só o que é regra: nenhuma figura cobre outra,
// as pessoas têm a mesma escala, a ordem do DOM e a estrutura das áreas.

describe('MAT-44 r6 #1: madrugada em duas colunas, sem nada atrás do celular', () => {
  async function secaoMadrugada() {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    return container.querySelector<HTMLElement>('#secao-madrugada')!
  }

  it('a ordem do DOM é título e texto, cena (ilustração), celular e legenda', async () => {
    const secao = await secaoMadrugada()

    const filhos = [...secao.children] as HTMLElement[]
    expect(filhos).toHaveLength(4)
    expect(filhos[0].querySelector('#titulo-madrugada')).not.toBeNull()
    expect(filhos[1].classList.contains('madrugada-cena')).toBe(true)
    expect(filhos[1].querySelector('[data-ilustracao="mamada"]')).not.toBeNull()
    expect(filhos[2].classList.contains('madrugada-celular')).toBe(true)
    expect(filhos[3].classList.contains('madrugada-legenda')).toBe(true)
  })

  it('nenhuma parte da ilustração fica atrás do celular: sem margem negativa e sem camada (z-*)', async () => {
    const secao = await secaoMadrugada()

    for (const seletor of ['.madrugada-cena', '.madrugada-celular', '.madrugada-legenda', '[data-ilustracao="mamada"]']) {
      const elemento = secao.querySelector(seletor)!
      const classe = elemento.getAttribute('class')!
      expect(classe, seletor).not.toMatch(/(?:^|\s|:)-m[trblxy]?-/)
      expect(classe, seletor).not.toMatch(/(?:^|\s|:)z-/)
    }
    const negativas = regrasComContexto(estiloGlobal)
      .filter((r) => r.seletor.includes('.madrugada-') || r.seletor.includes('data-ilustracao'))
      .flatMap((r) => Object.entries(r.props).map(([p, v]) => `${r.seletor} { ${p}: ${v} }`))
      .filter((d) => /\{\s*margin[a-z-]*:\s*-/.test(d) || /\{\s*z-index:/.test(d))
    expect(negativas).toEqual([])
  })

  it('a regra larga mantém a arte noturna separada e alinha as duas molduras à linha do chão', () => {
    const css = regrasComContexto(lerTexto(CSS_INICIO))
    const largura = css.filter((r) => r.condicao === `@media ${FAIXA_LARGA_INICIO}`)
    const imagens = largura.find((r) => r.seletor === '.co-m06')?.props
    expect(imagens?.left).toMatch(/^[\d.]+cqw$/)
    for (const seletor of ['.co-p2-fone', '.co-p3-fone']) {
      const fone = largura.find((r) => r.seletor === seletor)?.props
      expect(fone?.right).toBe('var(--margem)')
      expect(fone?.bottom).toBe('var(--chao)')
    }
    expect(largura.find((r) => r.seletor === '.co-painel::after')?.props.height).toBe('var(--chao)')
  })

  it('na grade larga a ilustração ocupa a largura da coluna da esquerda', () => {
    const larga = regrasComContexto(estiloGlobal).filter(
      (r) => r.condicao !== null && /min-width:\s*64rem/.test(r.condicao) && r.seletor === '.madrugada-cena > svg',
    )
    expect(larga.some((r) => r.props['width'] === '100%')).toBe(true)
  })

  it('o desenho termina no chão: o viewBox da ilustração larga acaba na linha do chão, na base do celular', async () => {
    const secao = await secaoMadrugada()

    const desenho = secao.querySelector('[data-ilustracao="mamada"]')!
    const [, , largura, altura] = desenho.getAttribute('viewBox')!.split(/\s+/).map(Number)
    expect(largura / altura).toBeGreaterThan(1.5)
    expect(altura).toBeLessThanOrEqual(223)
    expect(desenho.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('MAT-44 r6 #2 e #3: campo de barro com as pessoas na mesma escala e nada sobreposto', () => {
  async function cenaDoBarro() {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    const campo = container.querySelector('main > section[data-campo="field-1"]')!
    const cena = campo.querySelector('[data-ilustracao]')!.parentElement as HTMLElement
    const figuras = [...cena.querySelectorAll<SVGElement>('[data-ilustracao]')]
    return { cena, figuras }
  }

  const larguraDoDesenho = (figura: Element) => Number(figura.getAttribute('viewBox')!.split(/\s+/)[2])
  const porcento = (figura: Element, variante: string) => {
    const classe = figura.getAttribute('class')!
    const re = variante
      ? /@min-\[46rem\]\/pagina:w-\[([\d.]+)%\]/
      : /(?:^|\s)w-\[([\d.]+)%\]/
    return parseFloat(re.exec(classe)![1])
  }

  it('as três figuras: colo, tapete e passeio, no mesmo recipiente, na ordem', async () => {
    const { cena, figuras } = await cenaDoBarro()

    expect(figuras.map((f) => f.getAttribute('data-ilustracao'))).toEqual(['colo', 'tapete', 'passeio'])
    expect(new Set(figuras.map((f) => f.parentElement)).size).toBe(1)
    expect(cena.className).toMatch(/\bmx-auto\b/)
  })

  it('nenhuma figura, nem o recipiente, usa margem negativa em nenhuma faixa (nada cobre nada)', async () => {
    const { cena, figuras } = await cenaDoBarro()

    for (const elemento of [cena, ...figuras]) {
      expect(elemento.getAttribute('class'), elemento.getAttribute('data-ilustracao') ?? 'recipiente').not.toMatch(
        /(?:^|\s|:)-m[trblxy]?-/,
      )
    }
  })

  it('as pessoas têm a mesma escala: a largura de cada figura é proporcional à largura do desenho dela, em cada faixa', async () => {
    const { figuras } = await cenaDoBarro()

    for (const variante of ['', '@min']) {
      const escalas = figuras.map((f) => porcento(f, variante) / larguraDoDesenho(f))
      for (const escala of escalas) {
        expect(Math.abs(escala / escalas[0] - 1), `faixa ${variante || 'estreita'}: ${escalas.join(', ')}`).toBeLessThan(0.02)
      }
    }
  })

  it('o desenho é cortado rente ao chão e à figura (viewBox justo): termina na linha do chão', async () => {
    const { figuras } = await cenaDoBarro()

    for (const figura of figuras) {
      const [x, y, largura, altura] = figura.getAttribute('viewBox')!.split(/\s+/).map(Number)
      expect(y + altura, figura.getAttribute('data-ilustracao')!).toBeLessThanOrEqual(223)
      expect(y + altura).toBeGreaterThanOrEqual(221)
      expect(x + largura).toBeLessThanOrEqual(240)
      expect(largura).toBeLessThan(240)
      expect(altura).toBeLessThan(200)
    }
  })

  it('cada linha cabe na largura (sem rolagem horizontal): colo+passeio e o tapete, e as três na faixa larga', async () => {
    const { figuras } = await cenaDoBarro()

    const [colo, tapete, passeio] = figuras
    expect(porcento(colo, '') + porcento(passeio, '')).toBeLessThanOrEqual(100)
    expect(porcento(tapete, '')).toBeLessThanOrEqual(100)
    expect(figuras.reduce((soma, f) => soma + porcento(f, '@min'), 0)).toBeLessThanOrEqual(100)
  })

  it('o tapete, sozinho na segunda linha, fica centrado, e as duas linhas ficam próximas (vão de até 16 px)', async () => {
    const { cena, figuras } = await cenaDoBarro()

    expect(figuras[1].getAttribute('class')).toMatch(/\bmx-auto\b/)
    const vao = /(?:^|\s)gap-y-(\d+)(?:\s|$)/.exec(cena.className)
    expect(vao).not.toBeNull()
    expect(parseInt(vao![1], 10)).toBeLessThanOrEqual(4)
  })
})

// ---------------------------------------------------------------------------
// Rodada 7: rolagem horizontal no Início com a fonte ampliada. Com a fonte raiz em 200% a página
// tem metade das rem (390 px = 12 rem de largura, menos as margens); tudo o que tem tamanho fixo em
// rem, ou margem negativa, ou uma palavra comprida sem quebra, passa da largura. As regras abaixo
// valem para a classe do defeito, em toda largura, e não fixam medida estética.

describe('MAT-44 r7 #1: o celular da madrugada escala com a largura da página, em rem', () => {
  const celularEm = (largura: number, seletor = '.madrugada-celular'): number => {
    const regras = regrasComContexto(estiloGlobal)
      .filter((r) => r.seletor === seletor)
      .sort((a, b) => a.ordem - b.ordem)
    let escala = Number.NaN
    for (const regra of regras) {
      if (regra.condicao) {
        const minimo = /min-width:\s*([\d.]+)rem/.exec(regra.condicao)
        if (!minimo || largura < parseFloat(minimo[1])) continue
      }
      if ('--celular-escala' in regra.props) escala = parseFloat(regra.props['--celular-escala'])
    }
    return escala
  }
  const larguraNatural = () =>
    parseFloat(/width:\s*([\d.]+)rem/.exec(regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-celular')!.corpo)![1])

  async function paddingLateral(): Promise<{ estreita: number; larga: number }> {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    const classe = container.querySelector('#secao-madrugada')!.getAttribute('class')!
    const base = /(?:^|\s)px-(\d+)(?:\s|$)/.exec(classe)![1]
    const larga = /@min-\[46rem\]\/pagina:px-(\d+)/.exec(classe)![1]
    return { estreita: parseInt(base, 10) / 4, larga: parseInt(larga, 10) / 4 }
  }

  it('de 6 a 140 rem, a caixa do celular mais o padding lateral da seção cabe na largura da página', async () => {
    const padding = await paddingLateral()

    for (let largura = 6; largura <= 140; largura += 0.25) {
      const escala = celularEm(largura)
      expect(escala, `escala em ${largura} rem`).toBeGreaterThan(0)
      const caixa = larguraNatural() * escala
      const lateral = 2 * (largura >= 46 ? padding.larga : padding.estreita)
      expect(caixa, `caixa de ${caixa} rem em ${largura} rem de página (padding ${lateral})`).toBeLessThanOrEqual(
        largura - lateral + 1e-9,
      )
    }
  })

  it('nas larguras em que já cabia, o tamanho é o de antes: 18 rem abaixo de 46 rem e 20,4 rem a partir de 46 rem', () => {
    for (let largura = 21; largura < 46; largura += 0.25) {
      expect(larguraNatural() * celularEm(largura), `${largura} rem`).toBeCloseTo(18, 6)
    }
    for (let largura = 46; largura <= 140; largura += 0.25) {
      expect(larguraNatural() * celularEm(largura), `${largura} rem`).toBeCloseTo(20.4, 6)
    }
  })

  it('a escala só cresce com a largura dentro de cada faixa (a troca em 46 rem reinicia a contagem)', () => {
    let anterior = 0
    for (let largura = 6; largura <= 140; largura += 0.25) {
      const escala = celularEm(largura)
      if (Math.abs(largura - 46) < 1e-9) anterior = 0
      expect(escala, `${largura} rem`).toBeGreaterThanOrEqual(anterior)
      anterior = escala
    }
  })

  it('a caixa e a altura leem a escala por variável, e a altura segue a proporção do aparelho', () => {
    const regras = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.madrugada-celular' && r.condicao === null)
    const natural = larguraNatural()
    const proporcao = /aspect-ratio:\s*(\d+)\s*\/\s*(\d+)/.exec(regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-celular')!.corpo)!
    const alturaNatural = natural * (parseFloat(proporcao[2]) / parseFloat(proporcao[1]))

    const largura = regras.map((r) => /^calc\(([\d.]+)rem \* var\(--celular-escala\)\)$/.exec(r.props['width'] ?? '')).find(Boolean)
    const altura = regras.map((r) => /^calc\(([\d.]+)rem \* var\(--celular-escala\)\)$/.exec(r.props['height'] ?? '')).find(Boolean)
    expect(largura, 'width calc(natural * escala)').toBeTruthy()
    expect(altura, 'height calc(natural * escala)').toBeTruthy()
    expect(parseFloat(largura![1])).toBeCloseTo(natural, 6)
    expect(parseFloat(altura![1])).toBeCloseTo(alturaNatural, 2)
  })

  it('no JSX não sobra medida fixa em rem nem escala numérica para o celular da madrugada', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const caixa = container.querySelector('.madrugada-celular')!
    expect(caixa.getAttribute('class')).not.toMatch(/(?:^|\s|:)[wh]-\[[\d.]+rem\]/)
    const celular = caixa.querySelector('[data-aparelho="celular"]')!
    expect(celular.getAttribute('class')).not.toMatch(/(?:^|\s|:)scale-\[[\d.]+\]/)
    expect(celular.getAttribute('class')).toContain('[scale:var(--celular-escala)]')
  })

  it('a legenda tem a largura do celular em toda largura: mesma escala e largura máxima pela variável', () => {
    for (let largura = 6; largura <= 140; largura += 0.25) {
      expect(celularEm(largura, '.madrugada-legenda'), `${largura} rem`).toBe(celularEm(largura))
    }
    const base = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.madrugada-legenda' && r.condicao === null)
    expect(base.some((r) => /^calc\([\d.]+rem \* var\(--celular-escala\)\)$/.test(r.props['max-width'] ?? ''))).toBe(true)
  })
})

describe('MAT-44 r7 #2: a etiqueta nunca passa da largura da linha', () => {
  it('.etiqueta limita a largura a 100% e quebra a palavra dentro dela, com hífen automático', () => {
    const regras = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.etiqueta')
    const props = Object.assign({}, ...regras.map((r) => r.props)) as Record<string, string>

    expect(props['max-width']).toBe('100%')
    expect(props['hyphens']).toBe('auto')
    expect(props['overflow-wrap']).toMatch(/^(anywhere|break-word)$/)
  })

  it('as etiquetas do Início são itens de uma linha que quebra (flex-wrap), com a classe .etiqueta', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const etiquetas = [...container.querySelectorAll('li.etiqueta')]
    expect(etiquetas.map((e) => e.textContent)).toEqual(['Rotina', 'Desenvolvimento', 'Cuidado compartilhado', 'Comunidade'])
    for (const etiqueta of etiquetas) expect(etiqueta.parentElement!.className).toMatch(/\bflex-wrap\b/)
    expect(document.documentElement.getAttribute('lang') ?? 'pt-BR').toBe('pt-BR')
    expect(lerTexto('../index.html')).toContain('lang="pt-BR"')
  })
})

describe('MAT-44 r7 #3: nenhuma margem negativa leva um item da página pública para além da borda', () => {
  it('no Início, nenhum elemento fora dos aparelhos usa margem negativa em nenhuma faixa', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const achados = [...container.querySelectorAll<HTMLElement>('[class]')]
      .filter((e) => e.closest('[inert]') === null)
      .flatMap((e) => [...e.classList].filter((t) => /(^|:)-m[trblxyse]?-/.test(t)).map((t) => `${e.tagName.toLowerCase()} ${t}`))
    expect(achados).toEqual([])
  })

  it('a navegação do topo mantém quatro rotas com alvos declarados de pelo menos 44 px', async () => {
    await renderizarRotaPronta('/', { sessao: null })
    const links = within(screen.getByRole('navigation', { name: 'Site' })).getAllByRole('link')
    expect(links).toHaveLength(4)
    expect(links.every((link) => link.classList.contains('cm-cab-link'))).toBe(true)
    const alvo = regrasComContexto(lerTexto('styles/site.css')).find((r) => r.seletor === '.cm-cab-link' && r.condicao === null)?.props
    expect(parseFloat(alvo?.['min-width'] ?? '')).toBeGreaterThanOrEqual(44)
    expect(parseFloat(alvo?.['min-height'] ?? '')).toBeGreaterThanOrEqual(44)
  })
})

// ---------------------------------------------------------------------------
// Rodada 8: nenhum texto do Início passa da própria caixa, em toda largura e com a fonte ampliada.
// A regra é uma só, na raiz do Início, e herdada: quebra de palavra só quando a palavra não cabe
// (overflow-wrap: break-word, a classe break-words do Tailwind). Sem hífen automático nos títulos,
// sem overflow-wrap: anywhere (que muda a largura mínima de itens de grade e de flex) e sem
// esconder nada. O Hoje e a Sessão não recebem a regra.

describe('MAT-44 r8: a raiz do Início quebra a palavra que não cabe, e só ela', () => {
  async function raizDoInicio() {
    await renderizarRotaPronta('/', { sessao: null })
    const raiz = screen.getByRole('main').querySelector<HTMLElement>('[data-casa] > .co')
    if (!raiz) throw new Error('Início sem contêiner da composição')
    return raiz
  }

  /** Os tokens de classe sem a variante (@min-[…]/pagina:, hover:, …). */
  const semVariante = (token: string) => token.slice(token.lastIndexOf(':') + 1)

  it('o contêiner real do Início deveria quebrar só palavras que não cabem, mantendo a contenção local', async () => {
    const raiz = await raizDoInicio()
    const regras = regrasComContexto(lerTexto(CSS_INICIO)).filter((r) => r.seletor === '.co' && r.condicao === null)
    expect(regras).toHaveLength(1)
    expect(regras[0].props['container-type']).toBe('inline-size')
    expect(raiz.classList.contains('break-words') || regras[0].props['overflow-wrap'] === 'break-word').toBe(true)
  })

  it('a quebra é a de palavra que não cabe: sem anywhere, sem hífen automático e sem esconder nada na raiz', async () => {
    const raiz = await raizDoInicio()

    const tokens = [...raiz.classList].map(semVariante)
    for (const proibido of ['wrap-anywhere', '[overflow-wrap:anywhere]', 'hyphens-auto', '[hyphens:auto]', 'break-all', 'break-keep']) {
      expect(tokens, proibido).not.toContain(proibido)
    }
    expect(tokens.filter((t) => /^overflow(-[xy])?-(hidden|clip)$/.test(t))).toEqual([])
    expect(tokens.filter((t) => /^(invisible|hidden|sr-only)$/.test(t))).toEqual([])
    const raizCss = regrasComContexto(lerTexto(CSS_INICIO)).filter((r) => r.seletor === '.co')
    expect(raizCss.length).toBeGreaterThan(0)
    for (const { props } of raizCss) {
      expect(props['overflow-wrap']).not.toBe('anywhere')
      expect(props.hyphens).not.toBe('auto')
      expect(props['word-break'] ?? '').not.toMatch(/^(break-all|keep-all)$/)
      for (const nome of ['overflow', 'overflow-x', 'overflow-y']) {
        expect(props[nome] ?? '', nome).not.toMatch(/(?:^|\s)(hidden|clip)(?:\s|$)/)
      }
    }
  })

  it('nenhum elemento do Início fora dos aparelhos desfaz a quebra pelas classes', async () => {
    const raiz = await raizDoInicio()

    const desfazem = /^(break-normal|wrap-normal|whitespace-nowrap|text-nowrap|whitespace-pre|\[overflow-wrap:normal\]|\[white-space:nowrap\]|\[word-break:keep-all\])$/
    const achados = [...raiz.querySelectorAll<HTMLElement>('[class]')]
      .filter((e) => e.closest('[inert]') === null)
      .flatMap((e) => [...e.classList].filter((t) => desfazem.test(semVariante(t))).map((t) => `${e.tagName.toLowerCase()} ${t}`))
    expect(achados).toEqual([])
  })

  it('nenhuma classe do CSS usada no Início, fora dos aparelhos, desfaz a quebra', async () => {
    const raiz = await raizDoInicio()

    const usadas = new Set(
      [...raiz.querySelectorAll<HTMLElement>('[class]')]
        .filter((e) => e.closest('[inert]') === null)
        .flatMap((e) => [...e.classList]),
    )
    const achados = regrasComContexto(estiloGlobal)
      .filter((r) => [...r.seletor.matchAll(/\.([\w-]+)/g)].some((m) => usadas.has(m[1])))
      .filter(
        (r) =>
          r.props['overflow-wrap'] === 'normal' ||
          /^(nowrap|pre)$/.test(r.props['white-space'] ?? '') ||
          r.props['word-break'] === 'keep-all',
      )
      .map((r) => r.seletor)
    expect(achados).toEqual([])
  })

  it('o Hoje e a Sessão não recebem a regra: nenhum elemento tem break-words, nem no layout compartilhado', async () => {
    for (const caminho of ['/app/hoje', '/app/sessao']) {
      const { container, unmount } = await renderizarRotaPronta(caminho)
      await screen.findByRole('heading', { level: 1 })
      expect(container.querySelectorAll('.break-words'), caminho).toHaveLength(0)
      unmount()
    }
    for (const arquivo of ['componentes/Layout.tsx', 'componentes/conta/MolduraLogada.tsx', 'paginas/rotina/Hoje.tsx', 'paginas/rotina/Sessao.tsx']) {
      expect(lerTexto(arquivo), arquivo).not.toContain('break-words')
    }
  })

  it('nem o html, nem o body, nem o seletor universal declaram quebra ou escondem o excesso', () => {
    const globais = regrasComContexto(estiloGlobal).filter((r) => ['html', 'body', '*', ':root'].includes(r.seletor))
    for (const regra of globais) {
      for (const propriedade of ['overflow-wrap', 'word-break', 'overflow', 'overflow-x', 'hyphens']) {
        expect(regra.props, `${regra.seletor} { ${propriedade} }`).not.toHaveProperty(propriedade)
      }
    }
  })
})
