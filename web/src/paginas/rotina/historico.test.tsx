import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { simularFalhaRotina, type FixtureRotina } from '../../dados/rotina.memoria.ts'
import type { Registro } from '../../dados/rotina.tipos.ts'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'

// O Histórico (MAT-38b, R38-20 e R38-21), com o relógio falso às 10:00 de 5/11/2026 (hora do aparelho): o dia, a
// semana, os filtros, os parâmetros da URL e os estados de lista. A fixture "dia completo" tem 9 registros de hoje.

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
})

const botao = (nome: string) => screen.getByRole('button', { name: nome })
const busca = (mundo: { roteador: { state: { location: { search: string } } } }) => mundo.roteador.state.location.search
const linhas = () =>
  [...document.querySelectorAll('[data-registros-do-dia] li')].map((li) => ({
    hora: li.querySelector('.tabular-nums')!.textContent,
    texto: li.querySelector('a')!.textContent,
    autor: li.querySelectorAll('p')[1].textContent,
  }))
const linhaDoBebe = () => document.querySelector('[data-titulo-tela] h1')!.nextElementSibling!.textContent
const resumo = () => [...document.querySelectorAll('[data-resumo-do-dia] dt')].map((dt) => `${dt.textContent}: ${dt.nextElementSibling!.textContent}`)

function registroExtra(modelo: Registro, numero: number): Registro {
  return { ...modelo, id: `a0000000-0000-7000-8000-${String(10_000 + numero).padStart(12, '0')}` }
}

describe('R38-20: a vista do dia', () => {
  it('um main, um h1, o bebê e o dia por extenso, e os 9 registros de hoje em ordem de início, cada um com o autor', async () => {
    await renderizarRotaPronta('/app/historico', { diaCompleto: true })

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Histórico'])
    expect(linhaDoBebe()).toBe('Heloísa, Hoje, quinta-feira, 5 de novembro')
    expect(linhas()).toEqual([
      { hora: '02:00', texto: 'Mamadeira, 90 ml · leite materno', autor: 'por Bruno' },
      { hora: '03:30', texto: 'Sono, 50 min', autor: 'por Juliana' },
      { hora: '04:00', texto: 'Fralda, Ambos', autor: 'por Bruno' },
      { hora: '04:50', texto: 'Mamada, 18 min · lado direito', autor: 'por Juliana' },
      { hora: '05:55', texto: 'Sono, 45 min', autor: 'por Bruno' },
      { hora: '07:32', texto: 'Mamada, 18 min · lado esquerdo', autor: 'por Bruno' },
      { hora: '07:50', texto: 'Fralda, Cocô', autor: 'por Juliana' },
      { hora: '08:48', texto: 'Sono, em andamento', autor: 'por Bruno' },
      { hora: '09:10', texto: 'Fralda, Xixi', autor: 'por Bruno' },
    ])
  })

  it('cada linha é um link para o detalhe do registro', async () => {
    await renderizarRotaPronta('/app/historico', { diaCompleto: true })

    const primeira = document.querySelector('[data-registros-do-dia] li')!
    expect(within(primeira as HTMLElement).getByRole('link').getAttribute('href')).toBe(`/app/registro/${primeira.getAttribute('data-registro')}`)
  })

  it('o resumo do dia tem só totais, com a parte do sono que começou ontem', async () => {
    await renderizarRotaPronta('/app/historico', { diaCompleto: true })

    expect(resumo()).toEqual(['Sono: 4 h 20', 'Mamadas: 2', 'Mamadeiras: 1, somando 90 ml', 'Fraldas: 3: 1 xixi, 1 cocô, 1 ambos'])
  })

  it('dia sem registro: a frase e nenhum resumo', async () => {
    await renderizarRotaPronta('/app/historico', { semRegistros: true })

    expect(screen.getByText('Nenhum registro neste dia.')).toBeTruthy()
    expect(document.querySelector('[data-resumo-do-dia]')).toBeNull()
  })

  it('o link Lixeira fica no cabeçalho, e abrir por ele leva o foco ao h1 da lixeira', async () => {
    const mundo = await renderizarRotaPronta('/app/historico')
    expect(document.activeElement).not.toBe(screen.getByRole('heading', { level: 1 }))

    fireEvent.click(screen.getByRole('link', { name: 'Lixeira' }))
    await aguardarCarga()

    expect(mundo.roteador.state.location.pathname).toBe('/app/lixeira')
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Lixeira' }))
  })

  it('o observador vê o histórico e o detalhe de cada linha, sem nenhum botão de escrita', async () => {
    await renderizarRotaPronta('/app/historico', { diaCompleto: true, papelDeBruno: 'observador', sessao: 'bruno' })

    expect(linhas()).toHaveLength(9)
    expect(screen.queryByRole('button', { name: /Excluir|Restaurar|Editar/ })).toBeNull()
  })
})

describe('R38-20: o seletor de dia', () => {
  it('Dia seguinte fica com aria-disabled em hoje e não navega', async () => {
    const mundo = await renderizarRotaPronta('/app/historico', { diaCompleto: true })

    expect(botao('Dia seguinte').getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(botao('Dia seguinte'))
    await aguardarCarga()
    expect(busca(mundo)).toBe('')
  })

  it('Dia anterior abre ontem (a URL leva o dia), o título diz Ontem e a lista é a de ontem', async () => {
    const mundo = await renderizarRotaPronta('/app/historico', { diaCompleto: true })

    fireEvent.click(botao('Dia anterior'))
    await aguardarCarga()

    expect(busca(mundo)).toBe('?dia=2026-11-04')
    expect(linhaDoBebe()).toBe('Heloísa, Ontem, quarta-feira, 4 de novembro')
    expect(linhas().map((l) => l.texto)).toEqual(['Tummy time, 8 min', 'Tummy time, 10 min', 'Sono, 3 h 45 min · termina no dia seguinte'])
    expect(botao('Dia seguinte').getAttribute('aria-disabled')).toBeNull()
  })

  it('o campo de data tem o máximo em hoje; um dia válido navega e um futuro não', async () => {
    const mundo = await renderizarRotaPronta('/app/historico', { diaCompleto: true })
    const campo = screen.getByLabelText('Escolher o dia') as HTMLInputElement
    expect(campo.max).toBe('2026-11-05')

    fireEvent.change(campo, { target: { value: '2026-11-09' } })
    await aguardarCarga()
    expect(busca(mundo)).toBe('')

    fireEvent.change(campo, { target: { value: '2026-11-01' } })
    await aguardarCarga()
    expect(busca(mundo)).toBe('?dia=2026-11-01')
  })

  it('a fila tem os 7 dias que terminam no dia escolhido; o escolhido leva aria-current e tocar em outro o abre', async () => {
    const mundo = await renderizarRotaPronta('/app/historico?dia=2026-11-03')
    const fila = within(screen.getByRole('list', { name: 'Últimos 7 dias' }))

    expect(fila.getAllByRole('button').map((b) => b.textContent)).toEqual(['qua. 28', 'qui. 29', 'sex. 30', 'sáb. 31', 'dom. 01', 'seg. 02', 'ter. 03'])
    expect(fila.getByRole('button', { name: 'ter. 03' }).getAttribute('aria-current')).toBe('date')
    expect(fila.getByRole('button', { name: 'dom. 01' }).getAttribute('aria-current')).toBeNull()

    fireEvent.click(fila.getByRole('button', { name: 'dom. 01' }))
    await aguardarCarga()
    expect(busca(mundo)).toBe('?dia=2026-11-01')
  })
})

describe('R38-20: os filtros', () => {
  // QA-05 (TESTES_TROCADOS): com todos ligados, o primeiro toque num tipo deixa só ele (antes, o desligava).
  it('Todos liga os sete; o primeiro toque num tipo deixa só ele na lista e no resumo, e a URL guarda só ele', async () => {
    const mundo = await renderizarRotaPronta('/app/historico', { diaCompleto: true })
    expect(botao('Todos').getAttribute('aria-pressed')).toBe('true')
    expect(botao('Sono').getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(botao('Sono'))
    await aguardarCarga()

    expect(busca(mundo)).toBe('?dia=2026-11-05&tipos=sono')
    expect(botao('Todos').getAttribute('aria-pressed')).toBe('false')
    expect(botao('Sono').getAttribute('aria-pressed')).toBe('true')
    expect(botao('Fralda').getAttribute('aria-pressed')).toBe('false')
    expect(linhas()).toHaveLength(3)
    expect(linhas().every((l) => l.texto.startsWith('Sono'))).toBe(true)
    expect(resumo().every((linha) => linha.startsWith('Sono'))).toBe(true)

    fireEvent.click(botao('Todos'))
    await aguardarCarga()
    expect(busca(mundo)).toBe('?dia=2026-11-05')
    expect(linhas()).toHaveLength(9)
  })

  it('desligar o último tipo ligado volta a Todos: nunca há zero tipos', async () => {
    const mundo = await renderizarRotaPronta('/app/historico?tipos=sono', { diaCompleto: true })
    expect(linhas().map((l) => l.texto)).toEqual(['Sono, 50 min', 'Sono, 45 min', 'Sono, em andamento'])
    expect(botao('Sono').getAttribute('aria-pressed')).toBe('true')
    expect(botao('Fralda').getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(botao('Sono'))
    await aguardarCarga()

    expect(busca(mundo)).toBe('?dia=2026-11-05')
    expect(botao('Todos').getAttribute('aria-pressed')).toBe('true')
    expect(linhas()).toHaveLength(9)
  })

  // QA-05: os toques em sequência. Com todos ligados o toque escolhe só aquele; com a seleção parcial, alterna.
  it('toque em A e depois em B: os dois ligados, na ordem canônica da URL', async () => {
    const mundo = await renderizarRotaPronta('/app/historico', { diaCompleto: true })

    fireEvent.click(botao('Fralda'))
    await aguardarCarga()
    expect(busca(mundo)).toBe('?dia=2026-11-05&tipos=fralda')

    fireEvent.click(botao('Sono'))
    await aguardarCarga()

    expect(busca(mundo)).toBe('?dia=2026-11-05&tipos=sono,fralda')
    expect(botao('Sono').getAttribute('aria-pressed')).toBe('true')
    expect(botao('Fralda').getAttribute('aria-pressed')).toBe('true')
    expect(botao('Mamada').getAttribute('aria-pressed')).toBe('false')
    expect(botao('Todos').getAttribute('aria-pressed')).toBe('false')
    expect(linhas()).toHaveLength(6)
  })

  it('toque em A, B e de novo em B: sobra só A; tocar em A de novo volta a Todos', async () => {
    const mundo = await renderizarRotaPronta('/app/historico', { diaCompleto: true })
    fireEvent.click(botao('Fralda'))
    await aguardarCarga()
    fireEvent.click(botao('Sono'))
    await aguardarCarga()

    fireEvent.click(botao('Sono'))
    await aguardarCarga()
    expect(busca(mundo)).toBe('?dia=2026-11-05&tipos=fralda')
    expect(botao('Sono').getAttribute('aria-pressed')).toBe('false')
    expect(botao('Fralda').getAttribute('aria-pressed')).toBe('true')
    expect(linhas().every((l) => l.texto.startsWith('Fralda'))).toBe(true)

    fireEvent.click(botao('Fralda'))
    await aguardarCarga()
    expect(busca(mundo)).toBe('?dia=2026-11-05')
    expect(botao('Todos').getAttribute('aria-pressed')).toBe('true')
    expect(botao('Sono').getAttribute('aria-pressed')).toBe('true')
    expect(linhas()).toHaveLength(9)
  })

  it('Todos depois de uma seleção parcial liga os sete', async () => {
    const mundo = await renderizarRotaPronta('/app/historico', { diaCompleto: true })
    fireEvent.click(botao('Fralda'))
    await aguardarCarga()
    fireEvent.click(botao('Mamada'))
    await aguardarCarga()
    expect(busca(mundo)).toBe('?dia=2026-11-05&tipos=mamada,fralda')

    fireEvent.click(botao('Todos'))
    await aguardarCarga()

    expect(busca(mundo)).toBe('?dia=2026-11-05')
    expect(botao('Todos').getAttribute('aria-pressed')).toBe('true')
    expect(botao('Mamada').getAttribute('aria-pressed')).toBe('true')
    expect(botao('Sono').getAttribute('aria-pressed')).toBe('true')
    expect(linhas()).toHaveLength(9)
  })

  it('a partir de uma seleção parcial da URL, tocar num tipo desligado o liga', async () => {
    const mundo = await renderizarRotaPronta('/app/historico?tipos=sono,fralda', { diaCompleto: true })

    fireEvent.click(botao('Mamada'))
    await aguardarCarga()

    expect(busca(mundo)).toBe('?dia=2026-11-05&tipos=sono,mamada,fralda')
    expect(botao('Mamada').getAttribute('aria-pressed')).toBe('true')
  })

  it('alternar filtro substitui a entrada do histórico; trocar o dia empilha uma nova', async () => {
    const mundo = await renderizarRotaPronta('/app/historico', { diaCompleto: true })
    fireEvent.click(botao('Fralda'))
    await aguardarCarga()
    expect(mundo.roteador.state.historyAction).toBe('REPLACE')

    fireEvent.click(botao('Dia anterior'))
    await aguardarCarga()
    expect(mundo.roteador.state.historyAction).toBe('PUSH')
  })
})

describe('R38-20: os parâmetros extremos da URL', () => {
  it('dia impossível, tipos repetido e desconhecido e vista inválida: a tela abre em hoje e a URL é trocada pela canônica', async () => {
    const mundo = await renderizarRotaPronta('/app/historico?dia=2026-02-30&tipos=fralda,xyz,fralda&vista=mes', { diaCompleto: true })

    expect(busca(mundo)).toBe('?tipos=fralda')
    expect(mundo.roteador.state.historyAction).toBe('REPLACE')
    expect(linhaDoBebe()).toBe('Heloísa, Hoje, quinta-feira, 5 de novembro')
    expect(linhas().map((l) => l.texto)).toEqual(['Fralda, Ambos', 'Fralda, Cocô', 'Fralda, Xixi'])
  })

  it('dia futuro vale hoje; tipos vazio vale todos', async () => {
    const mundo = await renderizarRotaPronta('/app/historico?dia=2026-11-06&tipos=', { diaCompleto: true })

    expect(busca(mundo)).toBe('')
    expect(linhas()).toHaveLength(9)
  })
})

describe('R38-21: a vista da semana', () => {
  it('Semana troca a vista, com os 7 dias que terminam em hoje, o sono em texto e a barra proporcional ao maior', async () => {
    const mundo = await renderizarRotaPronta('/app/historico', { diaCompleto: true })

    fireEvent.click(botao('Semana'))
    await aguardarCarga()

    expect(busca(mundo)).toBe('?dia=2026-11-05&vista=semana')
    expect(botao('Semana').getAttribute('aria-pressed')).toBe('true')
    const dias = [...document.querySelectorAll('[data-dia-da-semana]')]
    expect(dias.map((d) => d.getAttribute('data-dia-da-semana'))).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
    ])
    const hoje = dias[6]
    expect(hoje.textContent).toContain('qui., 05/11')
    expect(hoje.textContent).toContain('Sono 4 h 20')
    expect(hoje.textContent).toContain('Mamadas e mamadeiras 3')
    expect(hoje.textContent).toContain('Fraldas 3')
    // A barra é só decorativa e o valor está sempre em texto.
    const barras = [...document.querySelectorAll<HTMLElement>('.rotina-barra')]
    expect(barras.every((barra) => barra.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(barras.map((barra) => barra.style.width)).toEqual(['23%', '100%'])
    // Ontem: só a parte do sono que cai nele (23:00 a 24:00) e os dois tummy times (18 min).
    expect(dias[5].textContent).toContain('Sono 1 h 00')
    expect(dias[5].textContent).toContain('Tummy time 0 h 18')
  })

  it('semana sem registro: a frase acima, sete linhas com zeros e nenhuma barra', async () => {
    await renderizarRotaPronta('/app/historico?vista=semana', { semRegistros: true })

    expect(screen.getByText('Nenhum registro nesta semana.')).toBeTruthy()
    const dias = [...document.querySelectorAll('[data-dia-da-semana]')]
    expect(dias).toHaveLength(7)
    expect(dias.every((d) => d.textContent!.includes('Sono 0 h 00') && d.textContent!.includes('Fraldas 0'))).toBe(true)
    expect(document.querySelector('.rotina-barra')).toBeNull()
  })

  it('semana só com mamada concluída: conta; a mamada em andamento não conta', async () => {
    await renderizarRotaPronta('/app/historico?vista=semana', {
      ajustarRotina: (f) => ({
        ...f,
        registros: [...f.registros, { ...f.registros.find((r) => r.tipo === 'mamada')!, id: 'a0000000-0000-7000-8000-000000000777', inicio: new Date('2026-11-05T09:40:00').toISOString(), fim: null }],
      }),
    })

    const hoje = [...document.querySelectorAll('[data-dia-da-semana]')][6]
    expect(hoje.textContent).toContain('Mamadas e mamadeiras 1')
  })

  it('tocar na linha abre aquele dia na vista do dia', async () => {
    const mundo = await renderizarRotaPronta('/app/historico?vista=semana', { diaCompleto: true })

    fireEvent.click(within(document.querySelector('[data-dia-da-semana="2026-11-04"]') as HTMLElement).getByRole('link'))
    await aguardarCarga()

    expect(busca(mundo)).toBe('?dia=2026-11-04')
    expect(linhaDoBebe()).toBe('Heloísa, Ontem, quarta-feira, 4 de novembro')
  })
})

describe('R38-11: lista incompleta e falha de leitura', () => {
  function com501(f: FixtureRotina): FixtureRotina {
    const modelo = f.registros.find((r) => r.tipo === 'fralda')!
    return { ...f, registros: [...f.registros, ...Array.from({ length: 501 }, (_, i) => registroExtra(modelo, i))] }
  }

  it('no dia: o aviso com o limite, só 500 linhas e "Há registros demais para somar aqui."', async () => {
    await renderizarRotaPronta('/app/historico', { ajustarRotina: (f) => com501(f) })

    expect(document.querySelector('[data-lista-incompleta="doDia"]')!.textContent).toBe('Esta lista mostra só os primeiros 500 itens.')
    expect(linhas()).toHaveLength(500)
    expect(screen.getByText('Há registros demais para somar aqui.')).toBeTruthy()
  })

  it('na semana: o aviso e nenhuma soma', async () => {
    await renderizarRotaPronta('/app/historico?vista=semana', { ajustarRotina: (f) => com501(f) })

    expect(document.querySelector('[data-lista-incompleta="semana"]')).not.toBeNull()
    expect(screen.getByText('Há registros demais para somar aqui.')).toBeTruthy()
    expect(document.querySelector('[data-semana]')).toBeNull()
  })

  it('falha de rede na leitura do dia: a frase do catálogo e Tentar de novo, que relê', async () => {
    const mundo = criarMundoDeTeste({ diaCompleto: true })
    simularFalhaRotina(mundo.rotina, 'doDia', 'rede')
    await renderizarRotaPronta('/app/historico', { mundo })

    const alerta = screen.getByRole('alert')
    expect(alerta.textContent).toContain('Não foi possível falar com o servidor. Verifique a conexão.')
    expect(alerta.textContent).not.toMatch(/Failed to fetch|TypeError/)

    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()
    expect(linhas()).toHaveLength(9)
  })

  it('resposta fora do formato (erro desconhecido): a frase de desconhecido, nunca o código', async () => {
    const mundo = criarMundoDeTeste()
    simularFalhaRotina(mundo.rotina, 'sessoesDaJanela', 'desconhecido')
    await renderizarRotaPronta('/app/historico', { mundo })

    const alerta = screen.getByRole('alert')
    expect(alerta.textContent).toContain('Algo deu errado e não sabemos se a mudança foi salva.')
    expect(alerta.textContent).not.toMatch(/XX000|erro qualquer/)
  })
})
