import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { temBanco } from './prototipo/banco.ts'
import { criarEstadoInicial, type EstadoPrototipo, type TipoSessao } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'
import { listarFontes, pastaSrcDe } from './teste/fontes.ts'

// A Sessão redesenhada sobre o Campo de mel: o link de volta, o título "<Sessão> de Heloísa" com a segunda
// linha em itálico, o cartão do cronômetro (mel de dia, cartão da noite na madrugada) com Encerrar,
// Encerrar e anotar e Descartar, e as sessões anteriores ao lado. Sem sessão: o estado vazio com o desenho
// da noite. O jsdom não mede layout: aqui vale a estrutura, o texto e o comportamento.

const pastaSrc = pastaSrcDe(import.meta.url)

const MIN = 60_000
const sessaoDe = (tipo: TipoSessao, ha = 72 * MIN, madrugada = false): EstadoPrototipo => ({
  ...criarEstadoInicial(Date.now()),
  sessao: { tipo, inicio: Date.now() - ha, pessoa: tipo === 'sono' ? 'Bruno' : 'Juliana' },
  madrugada,
})
const semSessao = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), sessao: null })

const principal = (container: HTMLElement) => container.querySelector<HTMLElement>('main')!
const cartao = (container: HTMLElement) => container.querySelector<HTMLElement>('main [data-andamento]')!

describe('Sessão: a estrutura', () => {
  for (const [tema, madrugada] of [
    ['claro', false],
    ['madrugada', true],
  ] as const) {
    it(`(${tema}) o link de volta, o título, o cartão do cronômetro e as anteriores, nessa ordem`, () => {
      const { container } = renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono', 72 * MIN, madrugada) })

      const ordem = [
        screen.getByRole('link', { name: 'Voltar para Hoje' }),
        screen.getByRole('heading', { level: 1 }),
        cartao(container),
        screen.getByRole('region', { name: 'Sonecas anteriores' }),
      ]
      for (let i = 1; i < ordem.length; i++) {
        expect(ordem[i - 1].compareDocumentPosition(ordem[i]) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
      }
      for (const peca of ordem) expect(principal(container).contains(peca)).toBe(true)
      expect(principal(container).previousElementSibling!.matches('[data-cabecalho]')).toBe(true)
      expect(principal(container).nextElementSibling!.matches(temBanco() ? '[data-rodape]' : '[data-aviso-tela]')).toBe(true)
    })
  }

  it('não há barra Registrar, navegação inferior nem texto de protótipo na tela', () => {
    const { container } = renderizarRota('/app/sessao')

    expect(container.querySelector('.nav-inferior, .barra-inferior, [data-barra-registrar]')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
    expect(principal(container).textContent).not.toMatch(/protótipo|dados de exemplo/i)
    expect([...container.querySelector('.sb-casca')!.children].map((e) => e.tagName.toLowerCase())).toEqual([
      'header',
      'main',
      ...(temBanco() ? [] : ['section']),
      'footer',
    ])
  })
})

describe('Sessão: o título', () => {
  it('o h1 é "Sono de Heloísa", focável por programa, e "Iniciado às 08:48 por Bruno" é a segunda linha em itálico', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T10:00:00'))
    renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono') })

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('Sono de Heloísa')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(h1.getAttribute('tabindex')).toBe('-1')
    const linha = screen.getByText('Iniciado às 08:48 por Bruno')
    expect(linha.classList.contains('italic')).toBe(true)
    expect(h1.nextElementSibling).toBe(linha)
  })

  it('o "Voltar para Hoje" é um link para /app/hoje com alvo de toque', () => {
    renderizarRota('/app/sessao')

    const voltar = screen.getByRole('link', { name: 'Voltar para Hoje' })
    expect(voltar.getAttribute('href')).toBe('/app/hoje')
    expect(voltar.classList.contains('alvo-toque')).toBe(true)
    expect(voltar.textContent).toBe('Voltar para Hoje')
  })

  it('"Já há uma sessão de X em andamento." aparece quando se chega pelo atalho do Hoje, e some pelo "Ver sessão"', async () => {
    const { container, unmount } = renderizarRota('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar mamada de Heloísa' }))

    await screen.findByRole('heading', { level: 1, name: 'Sono de Heloísa' })
    const aviso = screen.getByText('Já há uma sessão de Sono em andamento.')
    expect(principal(container).contains(aviso)).toBe(true)
    expect(aviso.hasAttribute('role')).toBe(false)
    unmount()

    renderizarRota('/app/hoje')
    fireEvent.click(screen.getByRole('link', { name: 'Ver sessão' }))
    await screen.findByRole('heading', { level: 1, name: 'Sono de Heloísa' })
    expect(screen.queryByText(/Já há uma sessão/)).toBeNull()
  })

  it('"Voltar para Hoje" leva ao Hoje com o foco no h1', async () => {
    renderizarRota('/app/sessao')

    fireEvent.click(screen.getByRole('link', { name: 'Voltar para Hoje' }))

    const h1 = await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    await waitFor(() => expect(document.activeElement).toBe(h1))
  })
})

describe('Sessão: o cartão do cronômetro', () => {
  it('é a seção data-andamento, rotulada por "Duração da sessão", com o cronômetro em Literata e as 3 ações', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T10:00:00'))
    const { container } = renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono') })

    const secao = cartao(container)
    expect(secao.tagName).toBe('SECTION')
    expect(secao.querySelectorAll('[data-cronometro]')).toHaveLength(1)
    expect(secao.querySelector('[data-cronometro]')).toBe(within(secao).getByRole('timer'))
    const rotulo = within(secao).getByText('Duração da sessão')
    expect(secao.getAttribute('aria-labelledby')).toBe(rotulo.id)
    const timer = within(secao).getByRole('timer', { name: 'Duração da sessão' })
    expect(timer.textContent).toBe('1:12:00')
    expect(timer.getAttribute('aria-live')).toBe('off')
    expect(timer.classList.contains('font-titulo')).toBe(true)
    expect(timer.classList.contains('tabular-nums')).toBe(true)
    expect([...secao.querySelectorAll('button')].map((b) => b.textContent)).toEqual([
      'Encerrar',
      'Encerrar e anotar',
      'Descartar',
    ])
  })

  it('Encerrar é o primário; Encerrar e anotar é o contorno; Descartar é o botão de texto', () => {
    const { container } = renderizarRota('/app/sessao')

    expect([...container.querySelectorAll('main [data-botao="primario"]')].map((b) => b.textContent)).toEqual(['Encerrar'])
    expect(screen.getByRole('button', { name: 'Encerrar e anotar' }).getAttribute('data-botao')).toBe('contorno')
    expect(screen.getByRole('button', { name: 'Descartar' }).getAttribute('data-botao')).toBe('texto')
    for (const b of cartao(container).querySelectorAll('button')) expect(b.classList.contains('alvo-toque')).toBe(true)
  })

  it('"Encerrar e anotar" abre o painel da nota no cartão: o Salvar passa a ser o único primário', () => {
    const { container } = renderizarRota('/app/sessao')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e anotar' }))

    const nota = screen.getByRole('group', { name: 'Encerrar e anotar' })
    expect(cartao(container).contains(nota)).toBe(true)
    const campo = within(nota).getByRole('textbox', { name: 'Nota' })
    expect(document.activeElement).toBe(campo)
    expect(campo.classList.contains('min-h-[6rem]')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Encerrar e anotar' })).toBeNull()
    expect([...container.querySelectorAll('main [data-botao="primario"]')].map((b) => b.textContent)).toEqual(['Salvar'])
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeTruthy()
  })

  it('com a nota aberta, Descartar é botão de texto na mesma fileira do Salvar; o campo não tem alça de redimensionar', () => {
    const { container } = renderizarRota('/app/sessao')
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e anotar' }))

    const nota = screen.getByRole('group', { name: 'Encerrar e anotar' })
    const salvar = within(nota).getByRole('button', { name: 'Salvar' })
    const descartar = within(nota).getByRole('button', { name: 'Descartar' })
    expect(descartar.getAttribute('data-botao')).toBe('texto')
    expect(descartar.parentElement).toBe(salvar.parentElement)
    expect([...salvar.parentElement!.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Salvar', 'Cancelar', 'Descartar'])
    // Nada sobra solto no pé do cartão.
    expect(cartao(container).querySelector('[data-acoes]')).toBeNull()

    const campo = within(nota).getByRole('textbox', { name: 'Nota' })
    expect(campo.classList.contains('resize-none')).toBe(true)
    expect(campo.classList.contains('field-sizing-content')).toBe(true)

    // Descartar dali abre a pergunta, e "Manter" devolve o foco ao Descartar das ações.
    fireEvent.click(descartar)
    fireEvent.click(screen.getByRole('button', { name: 'Manter' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Descartar' }))
  })

  it('o cronômetro tem o recuo óptico: o "1" volta à borda do rótulo e dos botões', () => {
    renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono') })

    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).classList.contains('-ml-[0.1em]')).toBe(true)
  })

  it('Esc fecha o painel da nota e devolve o foco a "Encerrar e anotar"', () => {
    renderizarRota('/app/sessao')
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e anotar' }))

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

    expect(screen.queryByRole('group', { name: 'Encerrar e anotar' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Encerrar e anotar' }))
  })

  it('"Descartar" pergunta no cartão; Esc fecha a pergunta e devolve o foco ao Descartar', () => {
    const { container } = renderizarRota('/app/sessao')
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    const pergunta = screen.getByRole('group', { name: 'Descartar esta sessão?' })
    expect(cartao(container).contains(pergunta)).toBe(true)
    expect(document.activeElement).toBe(within(pergunta).getByRole('button', { name: 'Manter' }))

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Descartar esta sessão?' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Descartar' }))
  })

  it('a atividade sugerida só aparece no tummy time, dentro do cartão', () => {
    const tummy = renderizarRota('/app/sessao', { estadoInicial: sessaoDe('tummy', MIN) })
    const atividade = screen.getByText('Atividade sugerida: Espelho no chão')
    expect(cartao(tummy.container).contains(atividade)).toBe(true)
    tummy.unmount()

    renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono') })
    expect(screen.queryByText(/Atividade sugerida/)).toBeNull()
  })

  it('o cronômetro conta a partir do início', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T10:00:00'))
    renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono', 5_000) })

    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('00:05')
  })
})

describe('Sessão: as sessões anteriores', () => {
  it('sono: três sonecas, com quem, onde e quanto durou', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T10:00:00'))
    renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono') })

    const linhas = within(screen.getByRole('region', { name: 'Sonecas anteriores' })).getAllByRole('listitem')
    expect(linhas.map((li) => [...li.querySelectorAll('p')].map((p) => p.textContent).join(' | '))).toEqual([
      '05:55 às 06:40 | Bruno, no carrinho',
      '03:30 às 04:20 | Juliana, no berço',
      '23:00 às 02:45 | Juliana, sono da noite',
    ])
    expect(within(linhas[2]).getByText('3 h 45 min')).toBeTruthy()
  })

  it('mamada e tummy time têm a própria lista', () => {
    const mamada = renderizarRota('/app/sessao', { estadoInicial: sessaoDe('mamada', MIN) })
    expect(screen.getByRole('region', { name: 'Mamadas anteriores' })).toBeTruthy()
    mamada.unmount()

    renderizarRota('/app/sessao', { estadoInicial: sessaoDe('tummy', MIN) })
    expect(screen.getByRole('region', { name: 'Tummy time anteriores' })).toBeTruthy()
  })

  it('encerrar põe a sessão no topo da lista e Desfazer a tira', async () => {
    renderizarRota('/app/sessao')
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))
    await screen.findByRole('heading', { level: 1, name: 'Hoje' })

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sono de Heloísa' }))
    await screen.findByRole('heading', { level: 1, name: 'Sono de Heloísa' })

    const primeira = within(screen.getByRole('region', { name: 'Sonecas anteriores' })).getAllByRole('listitem')[0]
    expect(primeira.textContent).toContain('agora há pouco')
  })
})

describe('Sessão: sem sessão', () => {
  it('h1 "Nenhuma sessão em andamento", a linha de como começar, o link de volta e o desenho da noite', () => {
    const { container } = renderizarRota('/app/sessao', { estadoInicial: semSessao() })

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('Nenhuma sessão em andamento')
    expect(h1.getAttribute('tabindex')).toBe('-1')
    expect(screen.getByText('Comece uma sessão pela barra Registrar no Hoje.').classList.contains('italic')).toBe(true)
    expect(screen.getByRole('link', { name: 'Voltar para Hoje' }).getAttribute('href')).toBe('/app/hoje')
    expect(container.querySelector('[data-andamento], [role="timer"]')).toBeNull()
    expect(screen.queryAllByRole('button').filter((b) => !b.closest('[data-cabecalho], [data-rodape]'))).toEqual([])
    const imagem = container.querySelector<HTMLImageElement>('main [data-midia] img')!
    expect(imagem.getAttribute('data-ilustracao')).toBe('mae-noite')
    expect(imagem.getAttribute('alt')!.length).toBeGreaterThan(10)
  })

  it('?tipo= inválido ou ausente mostra o estado vazio; ?tipo= válido começa uma vez e sai da URL', async () => {
    const vazio = renderizarRota('/app/sessao?tipo=banho', { estadoInicial: semSessao() })
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Nenhuma sessão em andamento')
    vazio.unmount()

    const { roteador } = renderizarRota('/app/sessao?tipo=tummy', { estadoInicial: semSessao() })
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Tummy time de Heloísa' })
    expect(screen.getAllByRole('timer')).toHaveLength(1)
    expect(screen.getByText('Atividade sugerida: Espelho no chão')).toBeTruthy()
    await waitFor(() => expect(roteador.state.location.search).toBe(''))
    // O h1 que aparece depois do primeiro render também é alvo de foco por programa.
    expect(h1.getAttribute('tabindex')).toBe('-1')
  })

  it('"Ver sessão" no Hoje leva o foco ao h1 da Sessão', async () => {
    renderizarRota('/app/hoje')

    fireEvent.click(screen.getByRole('link', { name: 'Ver sessão' }))

    const h1 = await screen.findByRole('heading', { level: 1, name: 'Sono de Heloísa' })
    await waitFor(() => expect(document.activeElement).toBe(h1))
  })
})

describe('as peças que saíram (EMENDAS E7): ninguém mais as usa', () => {
  // As quatro do cartão mais o `campo.ts` (o `nomeDoCampo` do `data-campo`, que a E6 tirou das telas novas),
  // e os blocos que o redesenho do Campo de mel trocou pelos componentes de componentes/app.
  const PECAS = [
    'componentes/ColunaApp.tsx',
    'prototipo/NavegacaoInferior.tsx',
    'prototipo/BarraInferior.tsx',
    'prototipo/FaixaPrototipo.tsx',
    'prototipo/campo.ts',
    'prototipo/BlocoEmAndamento.tsx',
    'prototipo/BlocoCronometro.tsx',
    'prototipo/ItemAvisoDaAbertura.tsx',
  ]
  const nomes = PECAS.map((p) => p.slice(p.lastIndexOf('/') + 1).replace(/\.tsx?$/, ''))

  it('nenhum arquivo de web/src importa as peças que saíram', () => {
    const importadores = listarFontes(pastaSrc, true)
      .filter((f) => f.nome !== 'sessao.test.tsx')
      .filter((f) => nomes.some((nome) => new RegExp(`from\\s+['"][^'"]*/${nome}(\\.tsx?)?['"]`).test(f.texto)))
      .map((f) => f.nome)
    expect(importadores).toEqual([])
  })

  it('se os arquivos ainda estão no disco, são módulos vazios (sem export nomeado, sem import); apagá-los não quebra nada', () => {
    for (const peca of PECAS) {
      if (!existsSync(pastaSrc + peca)) continue
      const texto = readFileSync(pastaSrc + peca, 'utf8').replace(/\/\/[^\n]*/g, '')
      expect(texto.trim(), peca).toBe('export {}')
    }
  })

  it('o que continua sendo usado não foi apagado: BotoesRapidos, useBarraFixa, barraFixa e AvisoDemonstracao', () => {
    for (const arquivo of [
      'prototipo/BotoesRapidos.tsx',
      'prototipo/useBarraFixa.ts',
      'prototipo/barraFixa.ts',
      'componentes/AvisoDemonstracao.tsx',
    ]) {
      expect(existsSync(pastaSrc + arquivo), arquivo).toBe(true)
    }
  })
})

// VOLTA1 E2: o tamanho do cronômetro depende do número de caracteres da duração (atributo `data-tamanho` no
// `role="timer"`), e não de uma largura medida em JavaScript.
describe('Sessão: o tamanho do cronômetro pelo número de caracteres (E2)', () => {
  const HORA = 3_600_000
  const caso = (horas: number, minutos: number, segundos: number) => horas * HORA + minutos * MIN + segundos * 1000 + 400

  const exemplos: Array<[string, number, 'normal' | 'longo']> = [
    ['09:59', caso(0, 9, 59), 'normal'],
    ['1:11:11', caso(1, 11, 11), 'normal'],
    ['9:59:59', caso(9, 59, 59), 'normal'],
    ['10:00:00', caso(10, 0, 0), 'longo'],
    ['100:00:00', caso(100, 0, 0), 'longo'],
  ]

  for (const [texto, ms, tamanho] of exemplos) {
    it(`"${texto}" (${texto.length} caracteres) leva data-tamanho="${tamanho}" no role="timer"`, () => {
      renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono', ms) })

      const timer = screen.getByRole('timer', { name: 'Duração da sessão' })
      expect(timer.textContent).toBe(texto)
      expect(timer.getAttribute('data-tamanho')).toBe(tamanho)
    })
  }

  it('o atributo acompanha o texto quando a duração passa de 7 para 8 caracteres (9:59:59 → 10:00:00)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T10:00:00'))
    const inicio = Date.now()
    renderizarRota('/app/sessao', {
      estadoInicial: { ...criarEstadoInicial(inicio), sessao: { tipo: 'sono', inicio: inicio - (10 * HORA - 2000), pessoa: 'Bruno' } },
    })
    const timer = screen.getByRole('timer', { name: 'Duração da sessão' })
    expect(timer.getAttribute('data-tamanho')).toBe('normal')
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('10:00:01')
    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).getAttribute('data-tamanho')).toBe('longo')
  })
})
