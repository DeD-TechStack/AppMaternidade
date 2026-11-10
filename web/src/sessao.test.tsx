import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { criarEstadoInicial, type EstadoPrototipo, type TipoSessao } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'
import { listarFontes, pastaSrcDe } from './teste/fontes.ts'

// A Sessão refeita (cartão 44d-2, parte 2; EMENDAS E3, E5 e E6): abertura, bloco do cronômetro com os
// 3 botões e a mídia com a ilustração, ou, sem sessão, a abertura e a mídia do berço. O jsdom não mede
// layout: aqui vale a estrutura, o texto e o comportamento; as posições são do medidor e da sonda.

const pastaSrc = pastaSrcDe(import.meta.url)
const css = readFileSync(pastaSrc + 'index.css', 'utf8')

const MIN = 60_000
const sessaoDe = (tipo: TipoSessao, ha = 72 * MIN, madrugada = false): EstadoPrototipo => ({
  ...criarEstadoInicial(Date.now()),
  sessao: { tipo, inicio: Date.now() - ha, pessoa: tipo === 'sono' ? 'Bruno' : 'Juliana' },
  madrugada,
})
const semSessao = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), sessao: null })

const principal = (container: HTMLElement) => container.querySelector<HTMLElement>('main')!
const bloco = (container: HTMLElement) => container.querySelector<HTMLElement>('main [data-andamento]')!
const midia = (container: HTMLElement) => container.querySelector<HTMLElement>('main [data-midia]')!

describe('Sessão: a ordem dos blocos e o que saiu', () => {
  for (const [tema, madrugada] of [
    ['claro', false],
    ['madrugada', true],
  ] as const) {
    it(`(${tema}) com sessão: o main tem a abertura, o bloco do cronômetro e a mídia, todos em sb-area`, () => {
      const { container } = renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono', 72 * MIN, madrugada) })

      const filhos = [...principal(container).children] as HTMLElement[]
      expect(filhos).toHaveLength(3)
      expect(filhos[0].classList.contains('sb-abertura')).toBe(true)
      expect(filhos[1]).toBe(bloco(container))
      expect(filhos[2].contains(midia(container))).toBe(true)
      for (const filho of filhos) expect(filho.classList.contains('sb-area'), filho.className).toBe(true)
      expect(principal(container).classList.contains('ha-tela')).toBe(true)
      expect(principal(container).previousElementSibling!.matches('[data-cabecalho]')).toBe(true)
      expect(principal(container).nextElementSibling!.matches('[data-rodape]')).toBe(true)
    })
  }

  it('não há coluna única, faixa do protótipo, navegação inferior, barra inferior nem barra Registrar', () => {
    const { container } = renderizarRota('/app/sessao')

    expect(container.querySelector('.coluna-app')).toBeNull()
    expect(container.querySelector('[aria-label="Aviso do protótipo"]')).toBeNull()
    expect(screen.queryByText('Protótipo: dados fictícios, nada é salvo.')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
    expect(container.querySelector('.nav-inferior, .barra-inferior, [data-barra-registrar]')).toBeNull()
    expect(container.querySelector('.campo-sessao, [data-campo]')).toBeNull()
    expect([...container.querySelector('.sb-casca')!.children].map((e) => e.tagName.toLowerCase())).toEqual([
      'header',
      'main',
      'footer',
    ])
  })
})

describe('Sessão: a abertura (E3)', () => {
  it('o h1 é "<Sessão> de Heloísa", com tabindex -1, e o subtítulo é "Iniciado às <hora> por <pessoa>"', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T10:00:00'))
    const { container } = renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono') })

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('Sono de Heloísa')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(h1.getAttribute('tabindex')).toBe('-1')
    expect(h1.closest('.sb-abertura')).not.toBeNull()
    expect(container.querySelector('.sb-abertura-subtitulo')!.textContent).toBe('Iniciado às 08:48 por Bruno')
  })

  it('a lateral traz a etiqueta do protótipo e o link "Voltar para Hoje" (para /app/hoje, no estilo do sistema)', () => {
    const { container } = renderizarRota('/app/sessao')

    const lateral = container.querySelector<HTMLElement>('.sb-abertura-lateral')!
    expect(within(lateral).getByText('Protótipo com dados de exemplo').classList.contains('sb-etiqueta')).toBe(true)
    expect(container.querySelector('main [data-aviso="demonstracao"]')).toBeNull()
    const voltar = within(lateral).getByRole('link', { name: 'Voltar para Hoje' })
    expect(voltar.tagName).toBe('A')
    expect(voltar.getAttribute('href')).toBe('/app/hoje')
    for (const classe of ['sb-abertura-link', 't-corpo', 'alvo-toque']) expect(voltar.classList.contains(classe), classe).toBe(true)
    expect(voltar.parentElement!.classList.contains('ha-li-link')).toBe(true)
    expect([...lateral.children].every((filho) => filho.tagName === 'LI')).toBe(true)
  })

  it('com as variáveis do banco a lateral mostra a mesma etiqueta "Protótipo com dados de exemplo" e nenhum aviso', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-ficticia')
    try {
      const { container } = renderizarRota('/app/sessao')

      expect(container.querySelector('[data-aviso="demonstracao"]')).toBeNull()
      expect(screen.getByText('Protótipo com dados de exemplo').closest('.sb-abertura-lateral')).not.toBeNull()
      expect(screen.queryByText('Protótipo, dados fictícios')).toBeNull()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('"Já há uma sessão de X em andamento." aparece na lateral quando se chega pelo atalho do Hoje, e some pelo "Ver sessão"', async () => {
    const { container, unmount } = renderizarRota('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar mamada de Heloísa' }))

    await screen.findByRole('heading', { level: 1, name: 'Sono de Heloísa' })
    const aviso = screen.getByText('Já há uma sessão de Sono em andamento.')
    expect(aviso.closest('.sb-abertura-lateral')).not.toBeNull()
    expect(aviso.classList.contains('t-ui')).toBe(true)
    expect(aviso.hasAttribute('role')).toBe(false)
    expect(within(aviso.closest<HTMLElement>('.sb-abertura-lateral')!).getByText('Protótipo com dados de exemplo')).toBeTruthy()
    expect(container.querySelector('[data-aviso="demonstracao"]')).toBeNull()
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

describe('Sessão: o bloco do cronômetro (E5)', () => {
  it('é a seção data-andamento, rotulada por "Duração da sessão", com o cronômetro (data-cronometro no role="timer") e as 3 ações', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T10:00:00'))
    const { container } = renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono') })

    const secao = bloco(container)
    expect(secao.tagName).toBe('SECTION')
    // O medidor (NUM) acha o cronômetro por `[data-cronometro]`, `[data-numero]` ou `.t-cronometro` e confere a
    // fonte do elemento marcado: o atributo fica nos dígitos, e não na seção (a seção tem a fonte do corpo).
    expect(secao.hasAttribute('data-cronometro')).toBe(false)
    expect(secao.querySelectorAll('[data-cronometro]')).toHaveLength(1)
    expect(secao.querySelector('[data-cronometro]')).toBe(within(secao).getByRole('timer'))
    expect(secao.classList.contains('sb-mt-fio-bloco')).toBe(true)
    const rotulo = within(secao).getByText('Duração da sessão')
    expect(rotulo.classList.contains('t-rotulo')).toBe(true)
    expect(secao.getAttribute('aria-labelledby')).toBe(rotulo.id)
    const timer = within(secao).getByRole('timer', { name: 'Duração da sessão' })
    expect(timer.textContent).toBe('1:12:00')
    expect(timer.getAttribute('aria-live')).toBe('off')
    expect(timer.classList.contains('t-cronometro')).toBe(true)
    expect(timer.classList.contains('cronometro')).toBe(false)
    expect([...secao.querySelectorAll('button')].map((b) => b.textContent)).toEqual([
      'Encerrar',
      'Encerrar e anotar',
      'Descartar',
    ])
  })

  it('as ações ficam numa coluna própria, depois do cronômetro, e Encerrar é filho direto dela', () => {
    const { container } = renderizarRota('/app/sessao')

    const timer = screen.getByRole('timer')
    const coluna = container.querySelector<HTMLElement>('.ha-cron-acoes')!
    expect(coluna.contains(timer)).toBe(false)
    expect(timer.compareDocumentPosition(coluna) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(screen.getByRole('button', { name: 'Encerrar' }).parentElement).toBe(coluna)
  })

  it('Encerrar é o único primário da tela; Encerrar e anotar e Descartar são de moldura dupla alta (S-3)', () => {
    const { container } = renderizarRota('/app/sessao')

    const primarios = [...container.querySelectorAll('main [data-botao="primario"]')]
    expect(primarios.map((b) => b.textContent)).toEqual(['Encerrar'])
    expect(primarios[0].classList.contains('ha-encerrar')).toBe(true)
    for (const nome of ['Encerrar e anotar', 'Descartar']) {
      const b = screen.getByRole('button', { name: nome })
      expect(b.hasAttribute('data-moldura-dupla'), nome).toBe(true)
      expect(b.hasAttribute('data-alto'), nome).toBe(true)
      expect(b.classList.contains('alvo-toque'), nome).toBe(true)
    }
  })

  it('o painel da nota e a pergunta de descartar abrem na coluna das ações, sem criar um segundo primário', () => {
    const { container } = renderizarRota('/app/sessao')
    const coluna = container.querySelector<HTMLElement>('.ha-cron-acoes')!

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e anotar' }))
    const nota = screen.getByRole('group', { name: 'Encerrar e anotar' })
    expect(coluna.contains(nota)).toBe(true)
    expect(within(nota).getByRole('textbox', { name: 'Nota' }).classList.contains('min-h-[6rem]')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Encerrar e anotar' })).toBeNull()
    expect([...container.querySelectorAll('main [data-botao="primario"]')]).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    const pergunta = screen.getByRole('group', { name: 'Descartar esta sessão?' })
    expect(coluna.contains(pergunta)).toBe(true)
    expect([...container.querySelectorAll('main [data-botao="primario"]')]).toHaveLength(1)
    for (const b of [...within(nota).getAllByRole('button'), ...within(pergunta).getAllByRole('button')]) {
      expect(b.classList.contains('alvo-toque'), b.textContent!).toBe(true)
    }
  })

  it('a atividade sugerida só aparece no tummy time, na coluna do cronômetro', () => {
    const tummy = renderizarRota('/app/sessao', { estadoInicial: sessaoDe('tummy', MIN) })
    const atividade = screen.getByText('Atividade sugerida: Espelho no chão')
    expect(atividade.classList.contains('t-corpo')).toBe(true)
    expect(bloco(tummy.container).contains(atividade)).toBe(true)
    expect(tummy.container.querySelector('.ha-cron-acoes')!.contains(atividade)).toBe(false)
    tummy.unmount()

    renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono') })
    expect(screen.queryByText(/Atividade sugerida/)).toBeNull()
  })

  it('o cronômetro lê o tempo inteiro para o leitor de tela e conta a partir do início', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T10:00:00'))
    renderizarRota('/app/sessao', { estadoInicial: sessaoDe('sono', 5_000) })

    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('00:05')
  })
})

describe('Sessão: a mídia (E5, bloco 3)', () => {
  const casos: Array<[TipoSessao, string]> = [
    ['sono', 'berco'],
    ['tummy', 'tapete'],
    ['mamada', 'mamada'],
  ]
  for (const [tipo, ilustracao] of casos) {
    for (const [tema, madrugada] of [
      ['claro', false],
      ['madrugada', true],
    ] as const) {
      it(`${tipo} (${tema}): [data-midia] larga em barro com a ilustração "${ilustracao}", que cobre a moldura, sem nó de texto`, () => {
        const { container } = renderizarRota('/app/sessao', { estadoInicial: sessaoDe(tipo, MIN, madrugada) })

        const moldura = midia(container)
        expect(container.querySelectorAll('[data-midia]')).toHaveLength(1)
        expect(moldura.getAttribute('data-formato')).toBe('larga')
        expect(moldura.getAttribute('data-fundo')).toBe('barro')
        expect(moldura.getAttribute('role')).toBe('img')
        expect(moldura.getAttribute('aria-label')!.length).toBeGreaterThan(10)
        const figuras = moldura.querySelectorAll('svg')
        expect(figuras).toHaveLength(1)
        expect(figuras[0].getAttribute('data-ilustracao')).toBe(ilustracao)
        expect(figuras[0].getAttribute('aria-hidden')).toBe('true')
        expect(figuras[0].getAttribute('preserveAspectRatio')).toMatch(/slice$/)
        expect(figuras[0].getAttribute('class')).toMatch(/\bh-full\b/)
        expect(figuras[0].getAttribute('class')).toMatch(/\bw-full\b/)
        expect(moldura.querySelector('title, desc, text, tspan, foreignObject')).toBeNull()
        expect(moldura.textContent).toBe('')
      })
    }
  }

  it('a mídia vem 96 px abaixo do bloco (48 em 390) e a descrição de cada tipo é diferente', () => {
    const descricoes = new Set<string>()
    for (const tipo of ['sono', 'tummy', 'mamada'] as const) {
      const { container, unmount } = renderizarRota('/app/sessao', { estadoInicial: sessaoDe(tipo) })
      expect(midia(container).parentElement!.classList.contains('sb-mt-par-numeros')).toBe(true)
      expect(bloco(container).nextElementSibling).toBe(midia(container).parentElement)
      descricoes.add(midia(container).getAttribute('aria-label')!)
      unmount()
    }
    expect(descricoes.size).toBe(3)
  })

  it('P3: o berço da Sessão mostra a figura inteira e o chão: o viewBox tem a proporção da moldura (1,5) e vai de antes do topo da cabeça (y≈80) até depois da linha do chão (y=220)', () => {
    // Com o viewBox quadrado e `xMidYMax slice`, a moldura de 1,5 só mostrava y de 80 a 240 e cortava o topo
    // do cabelo da figura em pé (e a porta). O viewBox da Sessão é um recorte de 240 × 160, sem corte nenhum.
    for (const estado of [sessaoDe('sono', MIN), semSessao()]) {
      const { container, unmount } = renderizarRota('/app/sessao', { estadoInicial: estado })
      const figura = midia(container).querySelector('svg')!
      expect(figura.getAttribute('data-ilustracao')).toBe('berco')
      const [x, y, largura, altura] = figura.getAttribute('viewBox')!.split(/\s+/).map(Number)
      expect(x).toBe(0)
      expect(largura).toBe(240)
      expect(largura / altura).toBeGreaterThanOrEqual(1.45)
      expect(largura / altura).toBeLessThanOrEqual(1.55)
      expect(y, 'o topo do cabelo da figura está em y≈80').toBeLessThanOrEqual(74)
      expect(y + altura, 'a linha do chão está em y=220 e os pés vão até 219').toBeGreaterThanOrEqual(224)
      expect(y + altura).toBeLessThanOrEqual(240)
      unmount()
    }
  })

  it('o CSS dá à mídia da Sessão a proporção de 3 para 2 (1,5), dentro de 1,45 a 1,55 (S-4)', () => {
    expect(css).toMatch(/\.ha-sessao \.sb-midia\[data-formato='larga'\]\s*\{[^}]*aspect-ratio:\s*3\s*\/\s*2/)
  })
})

describe('Sessão: sem sessão (E3)', () => {
  it('h1 "Nenhuma sessão em andamento", subtítulo curto, etiqueta e link na lateral, e só a mídia do berço no corpo', () => {
    const { container } = renderizarRota('/app/sessao', { estadoInicial: semSessao() })

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('Nenhuma sessão em andamento')
    expect(h1.getAttribute('tabindex')).toBe('-1')
    expect(container.querySelector('.sb-abertura-subtitulo')!.textContent).toBe('Comece uma sessão pela barra Registrar no Hoje.')
    const lateral = container.querySelector<HTMLElement>('.sb-abertura-lateral')!
    expect(within(lateral).getByText('Protótipo com dados de exemplo').classList.contains('sb-etiqueta')).toBe(true)
    expect(container.querySelector('[data-aviso="demonstracao"]')).toBeNull()
    expect(within(lateral).getByRole('link', { name: 'Voltar para Hoje' }).getAttribute('href')).toBe('/app/hoje')
    const filhos = [...principal(container).children] as HTMLElement[]
    expect(filhos).toHaveLength(2)
    expect(container.querySelector('[data-andamento], [role="timer"]')).toBeNull()
    expect(screen.queryAllByRole('button').filter((b) => !b.closest('[data-cabecalho], [data-rodape]'))).toEqual([])
    expect(midia(container).querySelector('svg')!.getAttribute('data-ilustracao')).toBe('berco')
    expect(filhos[1].classList.contains('sb-mt-fio-bloco')).toBe(true)
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
  // As quatro do cartão mais o `campo.ts` (o `nomeDoCampo` do `data-campo`, que a E6 tirou das telas novas).
  const PECAS = [
    'componentes/ColunaApp.tsx',
    'prototipo/NavegacaoInferior.tsx',
    'prototipo/BarraInferior.tsx',
    'prototipo/FaixaPrototipo.tsx',
    'prototipo/campo.ts',
  ]
  const nomes = PECAS.map((p) => p.slice(p.lastIndexOf('/') + 1).replace(/\.tsx?$/, ''))

  it('nenhum arquivo de web/src importa ColunaApp, NavegacaoInferior, BarraInferior, FaixaPrototipo nem campo', () => {
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

  it('o que continua sendo usado não foi apagado: BotoesRapidos, CartaoEmAndamento, SessaoInfo, useBarraFixa, barraFixa e AvisoDemonstracao', () => {
    for (const arquivo of [
      'prototipo/BotoesRapidos.tsx',
      'prototipo/CartaoEmAndamento.tsx',
      'prototipo/SessaoInfo.tsx',
      'prototipo/useBarraFixa.ts',
      'prototipo/barraFixa.ts',
      'componentes/AvisoDemonstracao.tsx',
    ]) {
      expect(existsSync(pastaSrc + arquivo), arquivo).toBe(true)
    }
  })
})

describe('Sessão: o CSS do bloco /* 44d-2 */ (lido como texto)', () => {
  const bloco44 = css.slice(css.indexOf('/* 44d-2 */')).replace(/\/\*[\s\S]*?\*\//g, '')
  const regra = (seletor: string) =>
    [...bloco44.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((m) => m[1].trim().replace(/\s+/g, ' ') === seletor)
      .map((m) => m[2])
      .join('')

  it('o bloco é uma grade de 10 colunas sem padding próprio de 768 para cima; o recuo de 64 é de cada coluna', () => {
    expect(regra('.ha-cron-grade')).toMatch(/grid-template-columns:\s*repeat\(10,\s*minmax\(0,\s*1fr\)\)/)
    expect(regra('.ha-cronometro')).toMatch(/padding:\s*0/)
    expect(regra('.ha-cron-tempo')).toMatch(/grid-column:\s*1\s*\/\s*8/)
    expect(regra('.ha-cron-tempo')).toMatch(/padding:\s*64px/)
    expect(regra('.ha-cron-acoes')).toMatch(/grid-column:\s*8\s*\/\s*11/)
    expect(regra('.ha-cron-acoes')).toMatch(/padding:\s*64px/)
  })

  it('o fio vertical claro (papel a 20%, 1 px) separa as colunas: borda só do lado esquerdo da coluna das ações', () => {
    const acoes = regra('.ha-cron-acoes')
    expect(acoes).toMatch(/border-left:\s*1px solid color-mix\(in srgb,\s*currentColor 20%,\s*transparent\)/)
    expect(acoes).not.toMatch(/border:\s/)
  })

  it('o cronômetro fica numa linha só e a caixa dele tem a largura do próprio texto (a sonda compara as larguras de "1:11:11" e "8:08:08")', () => {
    const valor = regra('.ha-cron-valor')
    expect(valor).toMatch(/white-space:\s*nowrap/)
    expect(valor).toMatch(/width:\s*fit-content/)
    // Os algarismos são os tabulares e de capitular da escala t-cronometro (index.css), sem `font-variant` próprio.
    expect(valor).not.toMatch(/font-variant|font-family|font-size/)
  })

  it('abaixo de 768 o bloco volta a ter 24 de padding, uma coluna, e as ações secundárias dividem a linha (2 colunas, gap 8)', () => {
    expect(bloco44).toMatch(/@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*\.ha-cronometro\s*\{[^}]*padding:\s*24px/)
    expect(bloco44).toMatch(/@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*\.ha-cron-grade\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(bloco44).toMatch(/@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*\.ha-cron-secundarios\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
    expect(bloco44).toMatch(/@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*\.ha-cron-acoes\s*\{[^}]*border-left:\s*0/)
  })

  // G1 em 390: "1:12:00" a 96 px mede 335,6 px e a coluna útil, com 24 de recuo, tem 295 (310 sem barra de
  // rolagem): o cronômetro vazava da página. O recuo do bloco cai para 8 nas laterais e só o cronômetro usa
  // essa borda; rótulo, atividade e botões ficam com 8 + 16 = 24 de recuo, como o contrato manda.
  it('abaixo de 768 o cronômetro cabe na caixa: recuo lateral de 8 no bloco, e 16 a mais no rótulo, na atividade e nas ações (24 no total)', () => {
    const celular = bloco44.slice(bloco44.indexOf('@media (max-width: 767px)'))
    const em = (seletor: string) =>
      [...celular.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter((m) => m[1].trim().replace(/\s+/g, ' ') === seletor)
        .map((m) => m[2])
        .join('')
    expect(em('.ha-cronometro')).toMatch(/padding:\s*24px 8px/)
    expect(em('.ha-cron-tempo, .ha-cron-acoes')).toMatch(/padding:\s*0\s*;/)
    expect(em('.ha-cron-rotulo, .ha-cron-atividade')).toMatch(/padding-inline:\s*16px/)
    expect(em('.ha-cron-acoes')).toMatch(/padding:\s*0 16px/)
  })

  it('o campo da nota segue o 2.9: sem caixa, fio sólido embaixo na cor do texto do bloco, Instrument Serif 32', () => {
    const campo = regra('.ha-nota-campo')
    expect(campo).toMatch(/background-color:\s*transparent/)
    expect(campo).toMatch(/border-bottom:\s*1px solid currentColor/)
    expect(campo).toMatch(/font-family:\s*var\(--fonte-sb-serifa\)/)
    expect(campo).toMatch(/font-size:\s*2rem/)
  })
})
