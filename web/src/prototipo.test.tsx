import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { PESSOAS } from './teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRotaPronta } from './teste/renderizarRota.tsx'
import { comSessaoEmAndamento, semSessaoEmAndamento } from './teste/rotina.fixture.ts'

// Os comportamentos do Hoje e da Sessão com os dados da rotina (MAT-38a): o cronômetro contado do início
// gravado, a fralda (escolha e um toque), as sessões (encerrar sem Desfazer, nota, descartar), a madrugada e
// o foco que acompanha cada ação. O relógio é o falso do Vitest, parado às 10:00 de 5/11/2026.

const INSTANTE = new Date('2026-11-05T10:00:00')
const MIN = 60_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

// A faixa "Últimos" tem uma coluna por tipo: o tempo e a legenda de cada uma, na ordem de leitura.
function itensDeUltimos(): string[] {
  const secao = screen.getByRole('heading', { name: 'Últimos' }).closest('section')!
  return [...secao.querySelectorAll('.sb-numeros-item')].map((item) =>
    [...item.querySelectorAll('p')].map((p) => p.textContent).join(' '),
  )
}

const botao = (nome: string) => screen.getByRole('button', { name: nome })
const status = () => screen.getByRole('status')

function avancar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

async function clicar(controle: HTMLElement) {
  fireEvent.click(controle)
  await aguardarCarga()
}

describe('cronômetro', () => {
  it('mostra 00:59 para uma sessão iniciada há 59 s', async () => {
    await renderizarRotaPronta('/app/sessao', { ajustarRotina: comSessaoEmAndamento('sono', 59_000) })

    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('00:59')
  })

  it('mostra 1:01:00 para uma sessão iniciada há 61 min, e avançar 10 s leva a 1:01:10, contado a partir do início', async () => {
    await renderizarRotaPronta('/app/sessao', { ajustarRotina: comSessaoEmAndamento('sono', 61 * MIN) })
    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('1:01:00')

    avancar(10_000)

    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('1:01:10')
  })

  it('o cronômetro não é anunciado a cada segundo', async () => {
    await renderizarRotaPronta('/app/sessao', { ajustarRotina: comSessaoEmAndamento('sono', 5_000) })

    expect(screen.getByRole('timer').getAttribute('aria-live')).toBe('off')
    expect(screen.getByText('Duração da sessão')).toBeTruthy()
  })

  it('mostra a hora de início e quem começou', async () => {
    await renderizarRotaPronta('/app/sessao')

    expect(screen.getByText('Iniciado às 08:48 por Bruno')).toBeTruthy()
  })

  it('o cartão do Hoje conta os minutos a partir do início', async () => {
    await renderizarRotaPronta('/app/hoje')
    expect(screen.getByRole('timer').textContent).toBe('1:12:00')

    avancar(60_000)

    expect(screen.getByRole('timer').textContent).toBe('1:13:00')
  })

  it('o relógio do aparelho atrás do início gravado: o cronômetro mostra 00:00, nunca um valor negativo', async () => {
    await renderizarRotaPronta('/app/sessao', { ajustarRotina: comSessaoEmAndamento('sono', -30 * MIN) })

    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('00:00')
  })
})

// A fralda precisa do conteúdo (obrigatório no banco): o botão abre a escolha e a escolha grava num toque.
describe('fralda', () => {
  async function registrarFralda(escolha: 'Xixi' | 'Cocô' | 'Ambos') {
    const gatilho = botao('Registrar fralda de Heloísa')
    await clicar(gatilho)
    await clicar(botao(escolha))
    return gatilho
  }

  it('(a) o botão abre Xixi, Cocô, Ambos e Cancelar; escolher grava e mostra "Fralda registrada: Xixi" em Últimos', async () => {
    await renderizarRotaPronta('/app/hoje')
    expect(itensDeUltimos()).toContain('50 min Fralda, tempo desde o registro')

    fireEvent.click(botao('Registrar fralda de Heloísa'))
    expect(within(screen.getByRole('group', { name: 'Fralda de Heloísa' })).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Xixi',
      'Cocô',
      'Ambos',
      'Cancelar',
    ])
    await clicar(botao('Xixi'))

    expect(status().querySelector('p')!.textContent).toBe('Fralda registrada: Xixi')
    expect(itensDeUltimos()).toContain('agora Fralda')
    expect(itensDeUltimos()).not.toContain('50 min Fralda, tempo desde o registro')
  })

  it('(b) a confirmação oferece Desfazer e Fechar, e o painel de escolha fecha depois de gravar', async () => {
    await renderizarRotaPronta('/app/hoje')
    await registrarFralda('Cocô')

    expect(within(status()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Desfazer', 'Fechar'])
    expect(screen.queryByRole('group', { name: 'Fralda de Heloísa' })).toBeNull()
    expect(status().textContent).toContain('Fralda registrada: Cocô')
  })

  it('"Cancelar" fecha o painel sem gravar, e o foco volta ao botão Fralda', async () => {
    await renderizarRotaPronta('/app/hoje')
    const gatilho = botao('Registrar fralda de Heloísa')
    fireEvent.click(gatilho)

    await clicar(botao('Cancelar'))

    expect(screen.queryByRole('group', { name: 'Fralda de Heloísa' })).toBeNull()
    expect(status().textContent).toBe('')
    expect(document.activeElement).toBe(gatilho)
    expect(itensDeUltimos()).toContain('50 min Fralda, tempo desde o registro')
  })

  it('(d) "Desfazer" devolve Últimos ao que era e limpa a confirmação; o registro vai para a lixeira', async () => {
    const { rotina } = await renderizarRotaPronta('/app/hoje')
    await registrarFralda('Cocô')

    await clicar(botao('Desfazer'))

    // O que a base conferia (R38-31, item 5): Fralda há 50 min, Mamada há 2 h 10 min, Tummy time ontem 17:30.
    expect(itensDeUltimos()).toEqual([
      '50 min Fralda, tempo desde o registro',
      '2 h 10 Mamada, tempo desde o registro',
      '17:30 Tummy time, ontem',
    ])
    expect(status().textContent).toBe('')
    const lixeira = await rotina.lixeira('c1111111-1111-4111-8111-111111111111')
    expect(lixeira.ok && lixeira.valor.itens.map((r) => r.tipo)).toEqual(['fralda'])
  })

  it('(e) o role="status" continua único, na tela vazio, com a fralda e depois de fechar', async () => {
    await renderizarRotaPronta('/app/hoje')
    expect(screen.getAllByRole('status')).toHaveLength(1)

    await registrarFralda('Ambos')
    expect(screen.getAllByRole('status')).toHaveLength(1)

    await clicar(botao('Fechar'))
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(status().textContent).toBe('')
  })

  it('a confirmação continua presente depois de 60 s', async () => {
    await renderizarRotaPronta('/app/hoje')
    await registrarFralda('Ambos')

    avancar(60_000)

    expect(status().textContent).toContain('Fralda registrada: Ambos')
    expect(botao('Desfazer')).toBeTruthy()
  })

  it('(f) Esc fecha o painel da fralda e devolve o foco ao botão Fralda', async () => {
    await renderizarRotaPronta('/app/hoje')
    const gatilho = botao('Registrar fralda de Heloísa')
    fireEvent.click(gatilho)
    botao('Xixi').focus()

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

    expect(screen.queryByRole('button', { name: 'Xixi' })).toBeNull()
    expect(document.activeElement).toBe(gatilho)
  })

  it('a confirmação não toma o foco do teclado: escolher o tipo deixa o foco no botão Fralda', async () => {
    await renderizarRotaPronta('/app/hoje')
    const gatilho = botao('Registrar fralda de Heloísa')
    gatilho.focus()

    await registrarFralda('Xixi')

    expect(document.activeElement).toBe(gatilho)
    expect(status().contains(document.activeElement)).toBe(false)
    expect(status().hasAttribute('tabindex')).toBe(false)
  })

  it('dois toques seguidos na mesma escolha, em menos de 1 segundo, gravam um registro só', async () => {
    const { rotina } = await renderizarRotaPronta('/app/hoje')
    fireEvent.click(botao('Registrar fralda de Heloísa'))
    const xixi = botao('Xixi')

    fireEvent.click(xixi)
    fireEvent.click(xixi)
    await aguardarCarga()

    const lista = await rotina.doIntervalo('c1111111-1111-4111-8111-111111111111', new Date(Date.now() - 5000).toISOString(), new Date(Date.now() + 5000).toISOString())
    expect(lista.ok && lista.valor.itens.filter((r) => r.tipo === 'fralda')).toHaveLength(1)
  })

  it('"+ Mais" abre um disclosure: Mamadeira e Alimentação sólida gravam com confirmação; Observação abre o formulário', async () => {
    await renderizarRotaPronta('/app/hoje')
    const mais = botao('Mais registros')
    expect(mais.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(mais)
    expect(mais.getAttribute('aria-expanded')).toBe('true')
    await clicar(within(screen.getByRole('group', { name: 'Outros registros de Heloísa' })).getByRole('button', { name: 'Mamadeira' }))
    expect(status().textContent).toContain('Mamadeira registrada')
    expect(itensDeUltimos()[0]).toBe('agora Mamadeira')

    fireEvent.click(mais)
    await clicar(botao('Alimentação sólida'))
    expect(status().textContent).toContain('Alimentação sólida registrada')
    expect(status().textContent).not.toContain('Mamadeira')
  })

  it('os botões rápidos têm os nomes acessíveis pedidos', async () => {
    await renderizarRotaPronta('/app/hoje')

    const nomes: Array<[string, string]> = [
      ['Iniciar sono de Heloísa', 'Sono'],
      ['Iniciar mamada de Heloísa', 'Mamada'],
      ['Registrar fralda de Heloísa', 'Fralda'],
      ['Mais registros', 'Mais'],
    ]
    for (const [nome, visivel] of nomes) {
      expect(botao(nome).textContent).toBe(visivel)
    }
    fireEvent.click(botao('Mais registros'))
    expect(botao('Iniciar tummy time de Heloísa').textContent).toBe('Tummy time')
  })
})

describe('sessões', () => {
  it('encerrar no Hoje mostra "Sessão encerrada: 1 h 12 min", com "Editar horário" e "Fechar", sem "Desfazer"', async () => {
    await renderizarRotaPronta('/app/hoje')

    await clicar(botao('Encerrar'))

    expect(status().textContent).toContain('Sessão encerrada: 1 h 12 min')
    expect(within(status()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Editar horário', 'Fechar'])
    expect(screen.getByText('Nenhuma sessão em andamento.')).toBeTruthy()
  })

  it('o cuidador que encerra a sessão de outra pessoa vê só "Fechar"', async () => {
    await renderizarRotaPronta('/app/hoje', { sessao: 'bruno', ajustarRotina: comSessaoEmAndamento('sono', 72 * MIN, PESSOAS.juliana.id) })

    await clicar(botao('Encerrar'))

    expect(within(status()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Fechar'])
  })

  it('"Editar horário" abre a edição daquela sessão', async () => {
    const { roteador, fixture } = await renderizarRotaPronta('/app/hoje')
    const alvo = fixture.registros.find((r) => r.tipo === 'sono' && r.fim === null)!
    await clicar(botao('Encerrar'))

    await clicar(botao('Editar horário'))

    expect(roteador.state.location.pathname).toBe(`/app/registro/${alvo.id}/editar`)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Editar registro')
  })

  it('a sessão encerrada não volta a ficar em andamento', async () => {
    const { rotina, fixture } = await renderizarRotaPronta('/app/hoje')
    const alvo = fixture.registros.find((r) => r.tipo === 'sono' && r.fim === null)!
    await clicar(botao('Encerrar'))
    avancar(5 * MIN)

    const aberta = await rotina.emAndamento('c1111111-1111-4111-8111-111111111111')
    expect(aberta.ok && aberta.valor.itens.map((r) => r.id)).not.toContain(alvo.id)
    expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull()
  })

  it('iniciar tummy time com o Sono em andamento abre o Sono com o aviso', async () => {
    await renderizarRotaPronta('/app/hoje')

    fireEvent.click(botao('Mais registros'))
    await clicar(botao('Iniciar tummy time de Heloísa'))

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
    expect(screen.getByText('Já há uma sessão de Sono em andamento.')).toBeTruthy()
  })

  it('sem sessão, o botão rápido começa uma sessão por Juliana e abre a Sessão', async () => {
    await renderizarRotaPronta('/app/hoje', { ajustarRotina: semSessaoEmAndamento })
    expect(screen.getByText('Nenhuma sessão em andamento.')).toBeTruthy()

    await clicar(botao('Iniciar mamada de Heloísa'))

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Mamada de Heloísa')
    expect(screen.getByText(/por Juliana$/)).toBeTruthy()
    expect(screen.queryByText(/Já há uma sessão/)).toBeNull()
  })

  it('"Encerrar" na Sessão volta ao Hoje com a confirmação', async () => {
    await renderizarRotaPronta('/app/sessao')

    await clicar(botao('Encerrar'))

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
    expect(status().textContent).toContain('Sessão encerrada: 1 h 12 min')
  })

  it('"Encerrar e anotar" abre o campo Nota e "Salvar" encerra com nota, que aparece em "Para você saber"', async () => {
    await renderizarRotaPronta('/app/sessao')

    fireEvent.click(botao('Encerrar e anotar'))
    const campo = screen.getByRole('textbox', { name: 'Nota' })
    expect(document.activeElement).toBe(campo)
    fireEvent.change(campo, { target: { value: '  Dormiu bem  ' } })
    await clicar(botao('Salvar'))

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
    expect(status().textContent).toContain('Sessão encerrada: 1 h 12 min, com nota')
    const notas = within(screen.getByRole('region', { name: 'Para você saber' }))
    expect(notas.getByText('Dormiu bem')).toBeTruthy()
    expect(notas.getByText('Juliana, 10:00')).toBeTruthy()
  })

  it('a nota de "Encerrar e anotar" entra em destaque por 24 horas, no bebê da sessão', async () => {
    const { rotina } = await renderizarRotaPronta('/app/sessao')
    fireEvent.click(botao('Encerrar e anotar'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nota' }), { target: { value: 'Dormiu bem' } })
    await clicar(botao('Salvar'))

    const notas = await rotina.notas('f1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111')
    const nota = notas.ok ? notas.valor.itens.find((n) => n.texto === 'Dormiu bem') : undefined
    expect(nota?.bebeId).toBe('c1111111-1111-4111-8111-111111111111')
    expect(Date.parse(nota!.destaqueAte!) - Date.parse(nota!.criadaEm)).toBe(24 * 60 * MIN)
  })

  it('"Salvar" com o campo vazio encerra sem o "com nota"', async () => {
    await renderizarRotaPronta('/app/sessao')

    fireEvent.click(botao('Encerrar e anotar'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nota' }), { target: { value: '   ' } })
    await clicar(botao('Salvar'))

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
    expect(status().textContent).toContain('Sessão encerrada: 1 h 12 min')
    expect(status().textContent).not.toContain('com nota')
  })

  it('"Cancelar" fecha o campo, mantém a sessão e devolve o foco', async () => {
    await renderizarRotaPronta('/app/sessao')
    fireEvent.click(botao('Encerrar e anotar'))

    fireEvent.click(botao('Cancelar'))

    expect(screen.queryByRole('textbox', { name: 'Nota' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
    expect(document.activeElement).toBe(botao('Encerrar e anotar'))
  })

  it('"Descartar" pergunta e "Manter" mantém a sessão', async () => {
    await renderizarRotaPronta('/app/sessao')

    fireEvent.click(botao('Descartar'))
    expect(screen.getByText('Descartar esta sessão?')).toBeTruthy()
    expect(document.activeElement).toBe(botao('Manter'))
    fireEvent.click(botao('Manter'))

    expect(screen.queryByText('Descartar esta sessão?')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
  })

  it('"Descartar" confirmado exclui a sessão (vai para a lixeira) e volta ao Hoje sem confirmação', async () => {
    const { rotina } = await renderizarRotaPronta('/app/sessao')

    fireEvent.click(botao('Descartar'))
    await clicar(within(screen.getByRole('group', { name: 'Descartar esta sessão?' })).getByRole('button', { name: 'Descartar' }))

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
    expect(status().textContent).toBe('')
    expect(screen.getByText('Nenhuma sessão em andamento.')).toBeTruthy()
    const lixeira = await rotina.lixeira('c1111111-1111-4111-8111-111111111111')
    expect(lixeira.ok && lixeira.valor.itens.map((r) => r.tipo)).toEqual(['sono'])
  })

  it('o StrictMode não começa duas sessões com ?tipo=, e a URL passa a ter o id', async () => {
    const { roteador, rotina } = await renderizarRotaPronta('/app/sessao?tipo=sono', { strict: true, ajustarRotina: semSessaoEmAndamento })

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
    expect(screen.getAllByRole('timer')).toHaveLength(1)
    expect(roteador.state.location.search).toMatch(/^\?id=[0-9a-f-]{36}$/)
    const abertas = await rotina.emAndamento('c1111111-1111-4111-8111-111111111111')
    expect(abertas.ok && abertas.valor.itens).toHaveLength(1)
  })

  it('encerrar uma sessão iniciada por ?tipo= não começa outra', async () => {
    const { roteador } = await renderizarRotaPronta('/app/sessao?tipo=mamada', { ajustarRotina: semSessaoEmAndamento })
    expect(screen.getByRole('heading', { name: 'Mamada de Heloísa' })).toBeTruthy()

    await clicar(botao('Encerrar'))
    await clicar(within(screen.getByRole('group', { name: 'A sessão durou menos de 1 minuto. Salvar mesmo assim?' })).getByRole('button', { name: 'Salvar' }))

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
    expect(roteador.state.location.pathname).toBe('/app/hoje')
    expect(screen.getByText('Nenhuma sessão em andamento.')).toBeTruthy()
  })

  it('o estado fica só na memória: nada vai para o navegador, além do que a conta (MAT-37) já guarda', async () => {
    await renderizarRotaPronta('/app/hoje')
    await clicar(botao('Encerrar'))

    const chaves = [...Array(window.localStorage.length).keys()].map((i) => window.localStorage.key(i)).concat(
      [...Array(window.sessionStorage.length).keys()].map((i) => window.sessionStorage.key(i)),
    )
    expect(chaves.filter((chave) => !/^appmaternidade:/.test(chave ?? ''))).toEqual([])
    expect(chaves.filter((chave) => /registro|sessao|nota|rotina/.test(chave ?? ''))).toEqual([])
  })
})

describe('madrugada', () => {
  it('o botão alterna aria-pressed e o data-tema do <html>', async () => {
    await renderizarRotaPronta('/app/hoje')
    const alternar = botao('Modo madrugada')
    expect(alternar.getAttribute('aria-pressed')).toBe('false')
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)

    fireEvent.click(alternar)
    expect(alternar.getAttribute('aria-pressed')).toBe('true')
    expect(document.documentElement.getAttribute('data-tema')).toBe('madrugada')

    fireEvent.click(alternar)
    expect(alternar.getAttribute('aria-pressed')).toBe('false')
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)
  })

  it('o modo continua na Sessão, sai ao ir para o Início e a escolha volta com a Rotina', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje')
    fireEvent.click(botao('Modo madrugada'))

    await clicar(screen.getByRole('link', { name: 'Ver sessão' }))
    expect(screen.getByRole('heading', { name: 'Sono de Heloísa' })).toBeTruthy()
    expect(document.documentElement.getAttribute('data-tema')).toBe('madrugada')

    await act(async () => {
      await roteador.navigate('/')
    })
    await aguardarCarga()
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)

    // QA-04: o tema sai com a Rotina, mas a escolha fica: ao voltar ao Hoje, o botão segue pressionado.
    await act(async () => {
      await roteador.navigate('/app/hoje')
    })
    await aguardarCarga()
    expect(botao('Modo madrugada').getAttribute('aria-pressed')).toBe('true')
  })

  it('começar em madrugada põe o tema logo na primeira tela', async () => {
    await renderizarRotaPronta('/app/sessao', { madrugada: true })

    expect(document.documentElement.getAttribute('data-tema')).toBe('madrugada')
  })
})

// ---------------------------------------------------------------------------
// R3: toda ação que remove ou troca o controle que tem o foco leva o foco a um sucessor
// lógico e visível. A confirmação nunca recebe o foco.

const TABBABLE = 'a[href], button, textarea, input, select, [tabindex]'

/** Os controles que o Tab alcança, na ordem do DOM. */
function tabbables(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (e) => e.tabIndex >= 0 && !(e as HTMLButtonElement).disabled && e.closest('[inert]') === null,
  )
}

/** O primeiro controle que o Tab alcança depois de `atual`, na ordem do DOM. */
function proximoTabbable(atual: Element): HTMLElement | undefined {
  return tabbables().find(
    (e) => !atual.contains(e) && (atual.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
  )
}

/** O foco está num elemento da tela (nem body, nem a região de confirmação) e o Tab segue dali. */
function conferirFocoValido(container: HTMLElement) {
  const ativo = document.activeElement
  expect(ativo, 'activeElement').not.toBeNull()
  expect(ativo, 'o foco caiu no body').not.toBe(document.body)
  expect(container.contains(ativo), 'o foco saiu do documento renderizado').toBe(true)
  expect(ativo!.closest('[role="status"]'), 'o foco foi para a região de confirmação').toBeNull()
  const proximo = proximoTabbable(ativo!)
  expect(proximo, 'não há próximo controle focável').toBeDefined()
  expect(container.contains(proximo!)).toBe(true)
}

/** Foca o controle e o aciona, como Tab + Enter. */
async function acionarComTeclado(controle: HTMLElement) {
  controle.focus()
  await clicar(controle)
}

describe('R3: o foco acompanha ações que removem o controle focado', () => {
  for (const [tema, madrugada] of [
    ['claro', false],
    ['madrugada', true],
  ] as const) {
    describe(tema, () => {
      const cartao = (container: HTMLElement) => container.querySelector<HTMLElement>('main [data-andamento]')!

      it('Hoje: "Encerrar" leva o foco ao cartão "Em andamento"', async () => {
        const { container } = await renderizarRotaPronta('/app/hoje', { madrugada })

        await acionarComTeclado(botao('Encerrar'))

        expect(document.activeElement).toBe(cartao(container))
        expect(cartao(container).textContent).toContain('Nenhuma sessão em andamento.')
        conferirFocoValido(container)
      })

      it('Hoje: "Fechar" depois de Encerrar leva o foco a "Iniciar sono de Heloísa"', async () => {
        const { container } = await renderizarRotaPronta('/app/hoje', { madrugada })
        await acionarComTeclado(botao('Encerrar'))

        await acionarComTeclado(botao('Fechar'))

        expect(document.activeElement).toBe(botao('Iniciar sono de Heloísa'))
        conferirFocoValido(container)
      })

      it('Hoje: "Desfazer" depois de Mamadeira leva o foco a "Iniciar sono de Heloísa"', async () => {
        const { container } = await renderizarRotaPronta('/app/hoje', { madrugada })
        fireEvent.click(botao('Mais registros'))
        await clicar(botao('Mamadeira'))

        await acionarComTeclado(botao('Desfazer'))

        expect(document.activeElement).toBe(botao('Iniciar sono de Heloísa'))
        conferirFocoValido(container)
      })

      it('Hoje: "Desfazer" depois de Fralda leva o foco a "Iniciar sono de Heloísa"', async () => {
        const { container } = await renderizarRotaPronta('/app/hoje', { madrugada })
        await clicar(botao('Registrar fralda de Heloísa'))
        await clicar(botao('Xixi'))

        await acionarComTeclado(botao('Desfazer'))

        expect(document.activeElement).toBe(botao('Iniciar sono de Heloísa'))
        conferirFocoValido(container)
      })

      it('Hoje: "Fechar" depois de Mamadeira leva o foco a "Iniciar sono de Heloísa"', async () => {
        const { container } = await renderizarRotaPronta('/app/hoje', { madrugada })
        fireEvent.click(botao('Mais registros'))
        await clicar(botao('Mamadeira'))

        await acionarComTeclado(botao('Fechar'))

        expect(document.activeElement).toBe(botao('Iniciar sono de Heloísa'))
        expect(status().textContent).toBe('')
        conferirFocoValido(container)
      })

      it('Hoje: Fralda → Xixi mantém o foco no botão Fralda, e a região status não é focável', async () => {
        const { container } = await renderizarRotaPronta('/app/hoje', { madrugada })
        expect(status().hasAttribute('tabindex')).toBe(false)

        botao('Registrar fralda de Heloísa').focus()
        await clicar(botao('Registrar fralda de Heloísa'))
        await clicar(botao('Xixi'))

        expect(document.activeElement).toBe(botao('Registrar fralda de Heloísa'))
        expect(status().hasAttribute('tabindex')).toBe(false)
        conferirFocoValido(container)
      })

      it('Hoje: Esc no painel da fralda devolve o foco ao botão Fralda', async () => {
        const { container } = await renderizarRotaPronta('/app/hoje', { madrugada })
        fireEvent.click(botao('Registrar fralda de Heloísa'))
        botao('Xixi').focus()

        fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

        expect(document.activeElement).toBe(botao('Registrar fralda de Heloísa'))
        conferirFocoValido(container)
      })

      it('Sessão → "Encerrar" leva ao Hoje com o cartão focado', async () => {
        const { container } = await renderizarRotaPronta('/app/sessao', { madrugada })

        await acionarComTeclado(botao('Encerrar'))

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
        expect(document.activeElement).toBe(cartao(container))
        conferirFocoValido(container)
      })

      it('Sessão → "Salvar" com nota leva ao Hoje com o cartão focado', async () => {
        const { container } = await renderizarRotaPronta('/app/sessao', { madrugada })
        fireEvent.click(botao('Encerrar e anotar'))
        fireEvent.change(screen.getByRole('textbox', { name: 'Nota' }), { target: { value: 'Dormiu bem' } })

        await acionarComTeclado(botao('Salvar'))

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
        expect(document.activeElement).toBe(cartao(container))
        conferirFocoValido(container)
      })

      it('Sessão → "Salvar" sem nota leva ao Hoje com o cartão focado', async () => {
        const { container } = await renderizarRotaPronta('/app/sessao', { madrugada })
        fireEvent.click(botao('Encerrar e anotar'))

        await acionarComTeclado(botao('Salvar'))

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
        expect(document.activeElement).toBe(cartao(container))
        conferirFocoValido(container)
      })

      it('Sessão → "Descartar" e "Descartar" levam ao Hoje com o cartão focado', async () => {
        const { container } = await renderizarRotaPronta('/app/sessao', { madrugada })
        fireEvent.click(botao('Descartar'))

        await acionarComTeclado(within(screen.getByRole('group', { name: 'Descartar esta sessão?' })).getByRole('button', { name: 'Descartar' }))

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
        expect(document.activeElement).toBe(cartao(container))
        conferirFocoValido(container)
      })

      it('Hoje → atalho Sono sem sessão leva o foco ao h1 da Sessão', async () => {
        const { container } = await renderizarRotaPronta('/app/hoje', { madrugada, ajustarRotina: semSessaoEmAndamento })

        await acionarComTeclado(botao('Iniciar sono de Heloísa'))

        const titulo = screen.getByRole('heading', { level: 1, name: 'Sono de Heloísa' })
        expect(document.activeElement).toBe(titulo)
        conferirFocoValido(container)
      })

      it('Hoje → atalho com outra sessão em andamento leva o foco ao h1 da Sessão (com o aviso)', async () => {
        const { container } = await renderizarRotaPronta('/app/hoje', { madrugada })
        fireEvent.click(botao('Mais registros'))

        await acionarComTeclado(botao('Iniciar tummy time de Heloísa'))

        const titulo = screen.getByRole('heading', { level: 1, name: 'Sono de Heloísa' })
        expect(screen.getByText('Já há uma sessão de Sono em andamento.')).toBeTruthy()
        expect(document.activeElement).toBe(titulo)
        conferirFocoValido(container)
      })

      it('Hoje → "Ver sessão" leva o foco ao h1 da Sessão', async () => {
        const { container } = await renderizarRotaPronta('/app/hoje', { madrugada })
        const ver = screen.getByRole('link', { name: 'Ver sessão' })
        ver.focus()

        await clicar(ver)

        const titulo = screen.getByRole('heading', { level: 1, name: 'Sono de Heloísa' })
        expect(document.activeElement).toBe(titulo)
        conferirFocoValido(container)
      })

      it('Sessão vazia → "Voltar para Hoje" leva o foco ao h1 "Hoje"', async () => {
        const { container } = await renderizarRotaPronta('/app/sessao', { madrugada, ajustarRotina: semSessaoEmAndamento })

        const voltar = screen.getByRole('link', { name: 'Voltar para Hoje' })
        voltar.focus()
        await clicar(voltar)

        const titulo = screen.getByRole('heading', { level: 1, name: 'Hoje' })
        expect(document.activeElement).toBe(titulo)
        conferirFocoValido(container)
      })

      it('carregar a URL direto não move o foco (Hoje, Sessão e Sessão vazia)', async () => {
        for (const [caminho, ajuste] of [
          ['/app/hoje', undefined],
          ['/app/sessao', undefined],
          ['/app/sessao', semSessaoEmAndamento],
        ] as const) {
          const { unmount } = await renderizarRotaPronta(caminho, { madrugada, ajustarRotina: ajuste })
          expect(document.activeElement, caminho).toBe(document.body)
          unmount()
        }
      })
    })
  }
})
