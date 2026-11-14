import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ErroDados } from '../../dados/comum.ts'
import { SecaoDoHoje } from '../../componentes/rotina/SecaoDoHoje.tsx'
import type { Secao } from '../../componentes/rotina/useSecao.ts'
import { listarFontes, pastaSrcDe } from '../../teste/fontes.ts'
import { simularFalhaRotina } from '../../dados/rotina.memoria.ts'
import { criarMundoDeTeste, semSessaoEmAndamento } from '../../teste/rotina.fixture.ts'
import { renderizarRotaPronta } from '../../teste/renderizarRota.tsx'

// H-3e, a harmonia na Rotina (SPEC H3, H3:RF-01, 02, 04 e 05). O jsdom não calcula o CSS: aqui valem o marcador
// `data-h` de cada primitiva e o número do contrato (o papel do vão, a fração das colunas, a presença de cada
// peça), nunca o valor de hoje. A geometria em px é da medida no navegador (`medir_h.js`).

const INSTANTE = new Date('2026-11-05T10:00:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const principal = (container: HTMLElement) => container.querySelector<HTMLElement>('main')!

/** O `<main>` da Rotina: uma Seção filha direta, o quadro dentro dela e uma Pilha de `bloco` dentro do quadro. */
function conferirCasco(main: HTMLElement) {
  expect(main.children, 'o <main> tem uma só filha: a Seção').toHaveLength(1)
  const secao = main.firstElementChild!
  expect(secao.matches("[data-h~='secao']"), 'a filha do <main> é a Seção').toBe(true)
  expect(secao.hasAttribute('data-h-variante'), 'sem fundo: nenhuma variante').toBe(false)
  // A primeira (e, sendo a única, a última) filha do <main> abre e fecha com espaco-secao-ampla (layout.css).
  expect(secao.matches("main > [data-h~='secao']:first-child:last-child")).toBe(true)
  expect(secao.children).toHaveLength(1)
  const quadro = secao.firstElementChild!
  expect(quadro.matches("[data-h~='quadro']")).toBe(true)
  expect(quadro.getAttribute('data-h-largura')).toBe('quadro')
  expect(quadro.children).toHaveLength(1)
  const pilha = quadro.firstElementChild!
  expect(pilha.matches("[data-h~='pilha']")).toBe(true)
  expect(pilha.getAttribute('data-h-vao')).toBe('bloco')
  expect(main.querySelector('.cm-area'), 'a borda é a do quadro: nenhuma .cm-area no <main>').toBeNull()
  return pilha
}

/** Um espaço entre blocos tem um dono só: o vão da primitiva. Filho de pilha ou de colunas não leva margem. */
function semMargemNosBlocos(raiz: HTMLElement) {
  const filhos = [...raiz.querySelectorAll("[data-h~='pilha'] > *, [data-h~='colunas'] > *")]
  for (const filho of filhos) {
    const margens = [...filho.classList].filter((classe) => /^(?:[\w-]+:)*-?m[tbylrxse]?-/.test(classe) && !/^(?:[\w-]+:)*-m[lr]-1$/.test(classe) && !/^-ml-\[0\.\d+em\]$/.test(classe))
    expect(margens, filho.outerHTML.slice(0, 120)).toEqual([])
  }
}

describe('H3:RF-01/02, Hoje: o casco e as colunas', () => {
  it('(claro) <main> > Seção > quadro > Pilha de bloco; o título é o primeiro bloco, a grade é Colunas de bloco', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { diaCompleto: true })

    const pilha = conferirCasco(principal(container))
    expect(pilha.firstElementChild!.hasAttribute('data-titulo-tela')).toBe(true)
    const grade = container.querySelector<HTMLElement>('main [data-grade-do-hoje]')!
    expect(grade.parentElement).toBe(pilha)
    expect(grade.matches("[data-h~='colunas']")).toBe(true)
    expect(grade.getAttribute('data-h-vao')).toBe('bloco')
    // As frações de hoje (12 colunas: cartão 6, lista 6) ficam; o ponto de quebra de hoje (lg, 1024) também.
    expect(grade.style.getPropertyValue('--h-colunas')).toBe('minmax(0, 6fr) minmax(0, 6fr)')
    expect(grade.getAttribute('data-h-quebra')).toBe('1024')
    for (const filho of grade.children) expect(filho.matches("[data-h~='coluna']"), filho.outerHTML.slice(0, 80)).toBe(true)
  })

  it('(claro) a lista do dia é Pilha de bloco e o cartão é Pilha de pilha, os dois colunas', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { diaCompleto: true })

    const lista = container.querySelector<HTMLElement>('main [data-area-lista]')!
    expect(lista.matches("[data-h~='pilha'][data-h~='coluna']")).toBe(true)
    expect(lista.getAttribute('data-h-vao')).toBe('bloco')
    const historico = container.querySelector<HTMLElement>('main [data-historico]')!
    expect(historico.matches("[data-h~='pilha']")).toBe(true)
    expect(historico.getAttribute('data-h-vao')).toBe('bloco')
    const cartao = container.querySelector<HTMLElement>('main [data-andamento]')!.parentElement!
    expect(cartao.matches("[data-h~='pilha'][data-h~='coluna']")).toBe(true)
    expect(cartao.getAttribute('data-h-vao')).toBe('pilha')
  })

  it('(claro) nenhum filho de pilha ou de colunas leva margem: o vão é só o da primitiva', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { diaCompleto: true })

    semMargemNosBlocos(principal(container))
  })

  it('(madrugada com sessão) frações 8/4; (madrugada sem sessão) frações 7/5; as duas com vão bloco, quebra em 1024', async () => {
    const comSessao = await renderizarRotaPronta('/app/hoje', { madrugada: true, diaCompleto: true })
    const grade = comSessao.container.querySelector<HTMLElement>('main [data-grade-do-hoje]')!
    expect(grade.matches("[data-h~='colunas']")).toBe(true)
    expect(grade.getAttribute('data-h-vao')).toBe('bloco')
    expect(grade.getAttribute('data-h-quebra')).toBe('1024')
    expect(grade.style.getPropertyValue('--h-colunas')).toBe('minmax(0, 8fr) minmax(0, 4fr)')
    expect(grade.contains(comSessao.container.querySelector('[data-iniciar-mamada]'))).toBe(true)
    conferirCasco(principal(comSessao.container))
    semMargemNosBlocos(principal(comSessao.container))
    comSessao.unmount()

    const semSessao = await renderizarRotaPronta('/app/hoje', { madrugada: true, ajustarRotina: semSessaoEmAndamento })
    const grade2 = semSessao.container.querySelector<HTMLElement>('main [data-grade-do-hoje]')!
    expect(grade2.style.getPropertyValue('--h-colunas')).toBe('minmax(0, 7fr) minmax(0, 5fr)')
    expect(grade2.getAttribute('data-h-vao')).toBe('bloco')
    conferirCasco(principal(semSessao.container))
    semMargemNosBlocos(principal(semSessao.container))
  })

  it('a abertura do Hoje é a primeira filha do <main>: ganha espaco-secao-ampla no topo pela regra de layout.css', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    expect(container.querySelector("main > [data-h~='secao']:first-child:not([data-h-variante='painel']) [data-titulo-tela]")).not.toBeNull()
  })

  it('o título (e o link de volta, quando há) é uma Pilha de junto; a segunda linha continua o irmão do h1', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    const abertura = container.querySelector<HTMLElement>('[data-titulo-tela]')!
    expect(abertura.matches("[data-h~='pilha']")).toBe(true)
    expect(abertura.getAttribute('data-h-vao')).toBe('junto')
    expect(abertura.classList.contains('cm-area')).toBe(false)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.nextElementSibling!.classList.contains('italic')).toBe(true)
    expect(h1.parentElement!.matches("[data-h~='pilha']")).toBe(true)
    expect(h1.parentElement!.getAttribute('data-h-vao')).toBe('junto')
  })
})

describe('H3:RF-01/02, a Sessão e as telas de lista e de formulário da Rotina', () => {
  it('Sessão (com sessão): o casco, as Colunas 7/5 de bloco e a pilha do cronômetro', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao')

    const pilha = conferirCasco(principal(container))
    const grade = pilha.querySelector<HTMLElement>(":scope > [data-h~='colunas']")!
    expect(grade.getAttribute('data-h-vao')).toBe('bloco')
    expect(grade.getAttribute('data-h-quebra')).toBe('1024')
    expect(grade.style.getPropertyValue('--h-colunas')).toBe('minmax(0, 7fr) minmax(0, 5fr)')
    for (const filho of grade.children) expect(filho.matches("[data-h~='coluna']")).toBe(true)
    semMargemNosBlocos(principal(container))
  })

  it('Sessão (sem sessão): o estado vazio também usa as primitivas e as mesmas Colunas 7/5', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao', { ajustarRotina: semSessaoEmAndamento })

    const pilha = conferirCasco(principal(container))
    const grade = pilha.querySelector<HTMLElement>(":scope > [data-h~='colunas']")!
    expect(grade.style.getPropertyValue('--h-colunas')).toBe('minmax(0, 7fr) minmax(0, 5fr)')
    expect(grade.getAttribute('data-h-vao')).toBe('bloco')
  })

  it('Sessão (falha da primeira leitura): só o erro, mas dentro do mesmo casco e sem margem nos blocos', async () => {
    const mundo = criarMundoDeTeste()
    simularFalhaRotina(mundo.rotina, 'emAndamento', 'rede')
    const { container } = await renderizarRotaPronta('/app/sessao', { mundo })

    const main = principal(container)
    const pilha = conferirCasco(main)
    expect(pilha.firstElementChild!.hasAttribute('data-titulo-tela')).toBe(true)
    semMargemNosBlocos(main)
    expect(main.querySelector("[role='alert']"), 'o erro honesto continua dentro do <main>').not.toBeNull()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })

  it.each([
    ['/app/historico', 'historico'],
    ['/app/lixeira', 'lixeira'],
    ['/app/notas', 'notas'],
    ['/app/registro/novo', 'registro'],
  ])('%s: o mesmo casco (Seção, quadro e Pilha de bloco), sem margem nos blocos', async (caminho, tela) => {
    const { container } = await renderizarRotaPronta(caminho)

    const main = principal(container)
    expect(main.getAttribute('data-tela')).toBe(tela)
    const pilha = conferirCasco(main)
    expect(pilha.firstElementChild!.hasAttribute('data-titulo-tela')).toBe(true)
    semMargemNosBlocos(main)
  })

  it('a região de status da confirmação nunca sai do DOM, e vazia não ocupa o vão da pilha (sr-only)', async () => {
    const { container } = await renderizarRotaPronta('/app/lixeira')

    const caixa = container.querySelector<HTMLElement>('[data-confirmacao-da-tela]')!
    expect(caixa.querySelector('[role="status"]')).not.toBeNull()
    expect(caixa.classList.contains('sr-only')).toBe(true)
  })
})

describe('H3:RF-02, os estados de carregando e de erro da seção (SecaoDoHoje)', () => {
  const erro: ErroDados = { classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: 'x' }
  const secao = (estado: Secao<string>['estado'], extra: Partial<Secao<string>> = {}): Secao<string> => ({
    estado,
    dados: null,
    erro: null,
    lidoEm: null,
    recarregar: () => undefined,
    ...extra,
  })

  it('carregando: Pilha de pilha com o título e o texto, sem margem em nenhum filho', () => {
    const { container } = render(
      <SecaoDoHoje secao={secao('carregando')} titulo="Últimos" papel="responsavel">
        {() => null}
      </SecaoDoHoje>,
    )

    const raiz = container.firstElementChild as HTMLElement
    expect(raiz.getAttribute('data-secao-estado')).toBe('carregando')
    expect(raiz.matches("[data-h~='pilha']")).toBe(true)
    expect(raiz.getAttribute('data-h-vao')).toBe('pilha')
    expect(raiz.getAttribute('aria-busy')).toBe('true')
    expect(raiz.querySelector('h2')!.textContent).toBe('Últimos')
    semMargemNosBlocos(container)
  })

  it('erro sem dados: o aviso e o título na mesma Pilha de pilha', () => {
    const { container } = render(
      <SecaoDoHoje secao={secao('erro', { erro })} titulo="Últimos" papel="responsavel">
        {() => null}
      </SecaoDoHoje>,
    )

    const raiz = container.firstElementChild as HTMLElement
    expect(raiz.matches("[data-h~='pilha']")).toBe(true)
    expect(raiz.getAttribute('data-h-vao')).toBe('pilha')
    expect(raiz.querySelector('[role="alert"]')).not.toBeNull()
    semMargemNosBlocos(container)
  })

  it('erro com dados: o aviso vem acima dos dados, na mesma Pilha de pilha', () => {
    const { container } = render(
      <SecaoDoHoje secao={secao('erro', { erro, dados: 'ok' })} titulo="Últimos" papel="responsavel">
        {(dados) => <p>{dados}</p>}
      </SecaoDoHoje>,
    )

    const raiz = container.firstElementChild as HTMLElement
    expect(raiz.matches("[data-h~='pilha']")).toBe(true)
    expect(raiz.getAttribute('data-h-vao')).toBe('pilha')
    expect([...raiz.children].map((no) => no.tagName)).toEqual(['DIV', 'P'])
    semMargemNosBlocos(container)
  })

  it('pronto como coluna: o dataH soma "coluna" ao marcador da Pilha', () => {
    const { container } = render(
      <SecaoDoHoje secao={secao('pronto', { dados: 'ok' })} titulo="Últimos" papel="responsavel" dataH="coluna">
        {(dados) => <p>{dados}</p>}
      </SecaoDoHoje>,
    )

    expect((container.firstElementChild as HTMLElement).matches("[data-h~='pilha'][data-h~='coluna']")).toBe(true)
  })
})

describe('H3:RF-03, nenhum valor solto nos arquivos da Rotina', () => {
  const PASTAS = ['paginas/rotina/', 'componentes/rotina/', 'componentes/app/', 'componentes/registro/', 'prototipo/']
  // `pastaSrcDe` devolve a pasta do teste (web/src/paginas/rotina/): a raiz web/src fica dois níveis acima.
  const fontes = listarFontes(pastaSrcDe(import.meta.url) + '../../').filter(
    (fonte) => /\.tsx$/.test(fonte.nome) && PASTAS.some((pasta) => fonte.nome.startsWith(pasta)),
  )

  // Fora da escala por contrato (`numero`, `cronometro`, `botao`): ficam na lista de exceções da H-3g
  // (PEDIDOS_COMUNS.md, H-3e). Tudo o mais é solto.
  const EXCECOES = [
    "'text-[72px] lg:text-[160px]'",
    "'text-[56px] lg:text-[120px]'",
    'text-[64px]',
    'lg:text-[120px]',
    'text-[clamp(28px,12.5cqi,52px)]',
    "'text-[17px] leading-[20px] lg:text-[21px] lg:leading-[25px]'",
    "'text-[26px] leading-[30px] lg:text-[30px] lg:leading-[34px]'",
    // O recuo da linha aberta de `DesdeQueVoceSaiu` = avatar + vão da fileira (42 px e 56 px): derivado, não é escala.
    'pl-[2.625rem]',
    'lg:pl-14',
  ]
  const FAMILIA = '(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y)'
  const REGRAS: Array<[string, RegExp]> = [
    ['espaço arbitrário', new RegExp(String.raw`(?<![\w-])-?${FAMILIA}-\[(?![^\]]*var\()[^\]]*\d[^\]]*\]`, 'g')],
    ['passo maior que 8', new RegExp(String.raw`(?<![\w-])-?${FAMILIA}-(?:9|[1-9]\d+)(?:\.\d+)?(?![\w.-])`, 'g')],
    ['tamanho de letra arbitrário', /(?<![\w-])text-\[(?![^\]]*var\()[^\]]*\d(?:px|rem|em)[^\]]*\]/g],
    ['tamanho de letra do Tailwind', /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g],
    ['entrelinha arbitrária', /(?<![\w-])leading-\[(?![^\]]*var\()[^\]]*\d[^\]]*\]/g],
    ['largura máxima arbitrária', /(?<![\w-])max-w-\[(?![^\]]*var\()(?![\d.]+(?:ch|%)\])[^\]]*\d[^\]]*\]/g],
    ['style com espaço ou tipo', /style=\{\{[^}]*\b(?:margin\w*|padding\w*|gap|rowGap|columnGap|fontSize|lineHeight)\b/g],
  ]

  it('há arquivos para varrer', () => {
    expect(fontes.length).toBeGreaterThan(40)
  })

  it.each(REGRAS)('nenhum %s nos .tsx da Rotina', (_nome, regra) => {
    const achados: string[] = []
    for (const { nome, texto } of fontes) {
      let limpo = texto
      for (const excecao of EXCECOES) limpo = limpo.split(excecao).join('')
      for (const linha of limpo.split('\n').entries()) {
        const achado = linha[1].match(regra)
        if (achado) achados.push(`${nome}:${linha[0] + 1}: ${achado.join(' ')}`)
      }
    }
    expect(achados).toEqual([])
  })
})

describe('madrugada: os alvos da Rotina não encolhem', () => {
  it('ALVO_APP continua max(48px, --alvo-toque) e a barra Registrar continua com botões de 56 px (h-14) e largura mínima do alvo', async () => {
    const { ALVO_APP } = await import('../../componentes/app/alvo.ts')
    expect(ALVO_APP).toBe('min-h-[max(48px,var(--alvo-toque))]')
    const { container } = await renderizarRotaPronta('/app/hoje', { madrugada: true })
    const botoes = container.querySelectorAll('[data-barra-registrar] [data-fileira] > button')
    expect(botoes).toHaveLength(4)
    for (const botao of botoes) {
      expect(botao.classList.contains('h-14')).toBe(true)
      expect(botao.classList.contains('alvo-toque')).toBe(true)
    }
  })
})
