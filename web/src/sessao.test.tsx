import { existsSync, readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { temBanco } from './prototipo/banco.ts'
import { PESSOAS } from './teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRotaPronta } from './teste/renderizarRota.tsx'
import { listarFontes, pastaSrcDe } from './teste/fontes.ts'
import { comSessaoEmAndamento, semSessaoEmAndamento } from './teste/rotina.fixture.ts'

// A Sessão com os dados da rotina (MAT-38a): o link de volta, o título "<Sessão> de Heloísa" com a segunda
// linha em itálico, o cartão do cronômetro (mel de dia, cartão da noite na madrugada) com Encerrar,
// Encerrar e anotar e Descartar, e as sessões anteriores ao lado. Sem sessão: o estado vazio com o desenho
// da noite. O jsdom não mede layout: aqui vale a estrutura, o texto e o comportamento.

const pastaSrc = pastaSrcDe(import.meta.url)

const MIN = 60_000
const INSTANTE = new Date('2026-11-05T10:00:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const sessaoDe = comSessaoEmAndamento

const principal = (container: HTMLElement) => container.querySelector<HTMLElement>('main')!
const cartao = (container: HTMLElement) => container.querySelector<HTMLElement>('main [data-andamento]')!

describe('Sessão: a estrutura', () => {
  for (const [tema, madrugada] of [
    ['claro', false],
    ['madrugada', true],
  ] as const) {
    it(`(${tema}) o link de volta, o título, o cartão do cronômetro e as anteriores, nessa ordem`, async () => {
      // As sonecas anteriores vêm da variação "dia completo": a fixture de teste não tem sono concluído.
      const { container } = await renderizarRotaPronta('/app/sessao', { madrugada, diaCompleto: true })

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

  it('não há barra Registrar, navegação inferior nem texto de protótipo na tela', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao')

    expect(container.querySelector('.nav-inferior, .barra-inferior, [data-barra-registrar]')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
    expect(principal(container).textContent).not.toMatch(/protótipo|dados de exemplo/i)
    expect(document.body.textContent).not.toContain('Protótipo: dados fictícios, nada é salvo.')
    expect([...container.querySelector('.sb-casca')!.children].map((e) => e.tagName.toLowerCase())).toEqual([
      'header',
      'main',
      ...(temBanco() ? [] : ['section']),
      'footer',
    ])
  })
})

describe('Sessão: o título', () => {
  it('o h1 é "Sono de Heloísa", focável por programa, e "Iniciado às 08:48 por Bruno" é a segunda linha em itálico', async () => {
    await renderizarRotaPronta('/app/sessao')

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('Sono de Heloísa')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(h1.getAttribute('tabindex')).toBe('-1')
    const linha = screen.getByText('Iniciado às 08:48 por Bruno')
    expect(linha.classList.contains('italic')).toBe(true)
    expect(h1.nextElementSibling).toBe(linha)
  })

  it('o "Voltar para Hoje" é um link para /app/hoje com alvo de toque', async () => {
    await renderizarRotaPronta('/app/sessao')

    const voltar = screen.getByRole('link', { name: 'Voltar para Hoje' })
    expect(voltar.getAttribute('href')).toBe('/app/hoje')
    expect(voltar.classList.contains('alvo-toque')).toBe(true)
    expect(voltar.textContent).toBe('Voltar para Hoje')
  })

  it('"Já há uma sessão de X em andamento." aparece pelo atalho do Hoje, e some pelo "Ver sessão"', async () => {
    const primeira = await renderizarRotaPronta('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar mamada de Heloísa' }))
    await aguardarCarga()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
    const aviso = screen.getByText('Já há uma sessão de Sono em andamento.')
    expect(principal(primeira.container).contains(aviso)).toBe(true)
    expect(aviso.hasAttribute('role')).toBe(false)
    primeira.unmount()

    await renderizarRotaPronta('/app/hoje')
    fireEvent.click(screen.getByRole('link', { name: 'Ver sessão' }))
    await aguardarCarga()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
    expect(screen.queryByText(/Já há uma sessão/)).toBeNull()
  })

  it('"Voltar para Hoje" leva ao Hoje com o foco no h1', async () => {
    await renderizarRotaPronta('/app/sessao')

    fireEvent.click(screen.getByRole('link', { name: 'Voltar para Hoje' }))
    await aguardarCarga()

    const h1 = screen.getByRole('heading', { level: 1, name: 'Hoje' })
    expect(document.activeElement).toBe(h1)
  })
})

describe('Sessão: o cartão do cronômetro', () => {
  it('é a seção data-andamento, rotulada por "Duração da sessão", com o cronômetro em Literata e as 3 ações', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao')

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
    expect([...secao.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Encerrar', 'Encerrar e anotar', 'Descartar'])
  })

  it('Encerrar é o primário; Encerrar e anotar é o contorno; Descartar é o botão de texto', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao')

    expect([...container.querySelectorAll('main [data-botao="primario"]')].map((b) => b.textContent)).toEqual(['Encerrar'])
    expect(screen.getByRole('button', { name: 'Encerrar e anotar' }).getAttribute('data-botao')).toBe('contorno')
    expect(screen.getByRole('button', { name: 'Descartar' }).getAttribute('data-botao')).toBe('texto')
    for (const b of cartao(container).querySelectorAll('button')) expect(b.classList.contains('alvo-toque')).toBe(true)
  })

  it('"Encerrar e anotar" abre o painel da nota no cartão: o Salvar passa a ser o único primário', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao')

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

  it('com a nota aberta, Descartar é botão de texto na mesma fileira do Salvar; o campo não tem alça de redimensionar', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao')
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

  it('com a nota aberta, o Descartar só aparece para quem pode descartar (cuidador: só as sessões que iniciou)', async () => {
    // Bruno é cuidador e a sessão aberta é dele: pode descartar. Juliana é responsável. Carla (cuidadora)
    // abre a sessão de Bruno: encerra e anota, mas não descarta.
    await renderizarRotaPronta('/app/sessao', { sessao: 'carla' })
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e anotar' }))

    const nota = screen.getByRole('group', { name: 'Encerrar e anotar' })
    expect([...within(nota).getAllByRole('button').map((b) => b.textContent)]).toEqual(['Salvar', 'Cancelar'])
  })

  it('o cronômetro tem o recuo óptico: o "1" volta à borda do rótulo e dos botões', async () => {
    await renderizarRotaPronta('/app/sessao')

    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).classList.contains('-ml-[0.1em]')).toBe(true)
  })

  it('Esc fecha o painel da nota e devolve o foco a "Encerrar e anotar"', async () => {
    await renderizarRotaPronta('/app/sessao')
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e anotar' }))

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

    expect(screen.queryByRole('group', { name: 'Encerrar e anotar' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Encerrar e anotar' }))
  })

  it('"Descartar" pergunta no cartão; Esc fecha a pergunta e devolve o foco ao Descartar', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao')
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    const pergunta = screen.getByRole('group', { name: 'Descartar esta sessão?' })
    expect(cartao(container).contains(pergunta)).toBe(true)
    expect(document.activeElement).toBe(within(pergunta).getByRole('button', { name: 'Manter' }))

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Descartar esta sessão?' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Descartar' }))
  })

  it('a atividade sugerida só aparece no tummy time, dentro do cartão', async () => {
    const tummy = await renderizarRotaPronta('/app/sessao', { ajustarRotina: sessaoDe('tummy', MIN, PESSOAS.juliana.id) })
    const atividade = screen.getByText('Atividade sugerida: Espelho no chão')
    expect(cartao(tummy.container).contains(atividade)).toBe(true)
    tummy.unmount()

    await renderizarRotaPronta('/app/sessao')
    expect(screen.queryByText(/Atividade sugerida/)).toBeNull()
  })

  it('o cronômetro conta a partir do início gravado', async () => {
    await renderizarRotaPronta('/app/sessao', { ajustarRotina: sessaoDe('sono', 5_000) })

    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('00:05')
  })

  it('observador e bebê arquivado veem a sessão sem as três ações, com o texto do papel', async () => {
    const observador = await renderizarRotaPronta('/app/sessao', { sessao: 'davi', papelDeDavi: 'observador' })
    expect(screen.queryByRole('button', { name: 'Encerrar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull()
    expect(screen.getByText('Seu papel nesta família permite só ver os registros.')).toBeTruthy()
    observador.unmount()

    await renderizarRotaPronta('/app/sessao', { bebeArquivado: true })
    expect(screen.queryByRole('button', { name: 'Encerrar' })).toBeNull()
    expect(screen.getByText('Este bebê está arquivado. Os registros ficam só para leitura.')).toBeTruthy()
  })
})

describe('Sessão: as sessões anteriores', () => {
  it('sono: três sonecas, com quem, onde e quanto durou', async () => {
    await renderizarRotaPronta('/app/sessao', { diaCompleto: true })

    const linhas = within(screen.getByRole('region', { name: 'Sonecas anteriores' })).getAllByRole('listitem')
    expect(linhas.map((li) => [...li.querySelectorAll('p')].map((p) => p.textContent).join(' | '))).toEqual([
      '05:55 às 06:40 | Bruno, no carrinho',
      '03:30 às 04:20 | Juliana, no berço',
      '23:00 às 02:45 | Juliana, sono da noite',
    ])
    expect(within(linhas[2]).getByText('3 h 45 min')).toBeTruthy()
  })

  it('mamada e tummy time têm a própria lista', async () => {
    const mamada = await renderizarRotaPronta('/app/sessao', { ajustarRotina: sessaoDe('mamada', MIN, PESSOAS.juliana.id) })
    expect(screen.getByRole('region', { name: 'Mamadas anteriores' })).toBeTruthy()
    mamada.unmount()

    await renderizarRotaPronta('/app/sessao', { ajustarRotina: sessaoDe('tummy', MIN, PESSOAS.juliana.id) })
    expect(screen.getByRole('region', { name: 'Tummy time anteriores' })).toBeTruthy()
  })

  it('encerrar põe a sessão no topo da lista da próxima sessão do mesmo tipo', async () => {
    await renderizarRotaPronta('/app/sessao')
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))
    await aguardarCarga()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sono de Heloísa' }))
    await aguardarCarga()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
    const primeira = within(screen.getByRole('region', { name: 'Sonecas anteriores' })).getAllByRole('listitem')[0]
    expect(primeira.textContent).toContain('08:48 às 10:00')
  })
})

describe('Sessão: sem sessão', () => {
  it('h1 "Nenhuma sessão em andamento", a linha de como começar, o link de volta e o desenho da noite', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao', { ajustarRotina: semSessaoEmAndamento })

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

  it('id que não é UUID, de sessão encerrada, de pontual ou sem acesso mostra o estado vazio', async () => {
    const { fixture, unmount: sairDaPrimeira } = await renderizarRotaPronta('/app/sessao?id=banana', { diaCompleto: true })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Nenhuma sessão em andamento')
    sairDaPrimeira()
    const encerrada = fixture.registros.find((r) => r.tipo === 'sono' && r.fim !== null)!
    const pontual = fixture.registros.find((r) => r.tipo === 'fralda')!
    for (const id of [encerrada.id, pontual.id, 'c3333333-3333-4333-8333-333333333333']) {
      const outra = await renderizarRotaPronta(`/app/sessao?id=${id}`, { diaCompleto: true })
      expect(screen.getByRole('heading', { level: 1 }).textContent, id).toBe('Nenhuma sessão em andamento')
      outra.unmount()
    }
  })

  it('?id= abre a sessão em andamento daquele registro, e fechar a aba e abrir a mesma URL mostra a mesma sessão', async () => {
    const primeira = await renderizarRotaPronta('/app/sessao')
    const alvo = primeira.fixture.registros.find((r) => r.tipo === 'sono' && r.fim === null)!
    primeira.unmount()

    await renderizarRotaPronta(`/app/sessao?id=${alvo.id}`, { mundo: primeira })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('1:12:00')
  })

  it('?tipo= inválido ou ausente mostra o estado vazio; ?tipo= válido começa uma vez e a URL passa a ter o id', async () => {
    const vazio = await renderizarRotaPronta('/app/sessao?tipo=banho', { ajustarRotina: semSessaoEmAndamento })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Nenhuma sessão em andamento')
    vazio.unmount()

    const { roteador } = await renderizarRotaPronta('/app/sessao?tipo=tummy', { ajustarRotina: semSessaoEmAndamento })
    const h1 = screen.getByRole('heading', { level: 1, name: 'Tummy time de Heloísa' })
    expect(screen.getAllByRole('timer')).toHaveLength(1)
    expect(screen.getByText('Atividade sugerida: Espelho no chão')).toBeTruthy()
    expect(roteador.state.location.search).toMatch(/^\?id=[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    // O h1 que aparece depois do primeiro render também é alvo de foco por programa.
    expect(h1.getAttribute('tabindex')).toBe('-1')
  })

  it('?tipo= com id ou com sessão em andamento é ignorado', async () => {
    const { roteador } = await renderizarRotaPronta('/app/sessao?tipo=mamada')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
    expect(roteador.state.location.search).toBe('?tipo=mamada')
  })

  it('"Ver sessão" no Hoje leva o foco ao h1 da Sessão', async () => {
    await renderizarRotaPronta('/app/hoje')

    fireEvent.click(screen.getByRole('link', { name: 'Ver sessão' }))
    await aguardarCarga()

    const h1 = screen.getByRole('heading', { level: 1, name: 'Sono de Heloísa' })
    expect(document.activeElement).toBe(h1)
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
    it(`"${texto}" (${texto.length} caracteres) leva data-tamanho="${tamanho}" no role="timer"`, async () => {
      await renderizarRotaPronta('/app/sessao', { ajustarRotina: sessaoDe('sono', ms) })

      const timer = screen.getByRole('timer', { name: 'Duração da sessão' })
      expect(timer.textContent).toBe(texto)
      expect(timer.getAttribute('data-tamanho')).toBe(tamanho)
    })
  }

  it('o atributo acompanha o texto quando a duração passa de 7 para 8 caracteres (9:59:59 → 10:00:00)', async () => {
    await renderizarRotaPronta('/app/sessao', { ajustarRotina: sessaoDe('sono', 10 * HORA - 2000) })
    const timer = screen.getByRole('timer', { name: 'Duração da sessão' })
    expect(timer.getAttribute('data-tamanho')).toBe('normal')

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('10:00:01')
    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).getAttribute('data-tamanho')).toBe('longo')
  })
})
