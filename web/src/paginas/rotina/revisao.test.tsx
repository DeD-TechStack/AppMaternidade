import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { simularFalhaRotina } from '../../dados/rotina.memoria.ts'
import type { Nota, Registro } from '../../dados/rotina.tipos.ts'
import { uuidV7 } from '../../dados/rotina.uuid.ts'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { ID_BEBE, criarMundoDeTeste, semSessaoEmAndamento, type OpcoesMundo } from '../../teste/rotina.fixture.ts'

// R4, R7 e R8 da revisão do 38a, com o relógio falso parado às 10:00 de 5/11/2026 (hora do aparelho).

const INSTANTE = new Date('2026-11-05T10:00:00')
const MIN = 60_000
const FRASE_DE_LEITURA = 'Não foi possível falar com o servidor. Verifique a conexão.'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(document, 'visibilityState')
})

const botao = (nome: string) => screen.getByRole('button', { name: nome })
const recarregarPelaAba = async () => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await aguardarCarga()
}

// ---- R4: quem não grava não vê nem envia ação de criação -----------------------------------------------

const SEM_GRAVACAO: Array<[string, OpcoesMundo]> = [
  ['observador', { papelDeBruno: 'observador', sessao: 'bruno' }],
  ['bebê arquivado', { bebeArquivado: true }],
]
const TEMAS: Array<[string, boolean]> = [
  ['claro', false],
  ['madrugada', true],
]

describe('R4: gravacaoLiberada vale para todo atalho de criação', () => {
  for (const [quem, opcoes] of SEM_GRAVACAO) {
    for (const [tema, madrugada] of TEMAS) {
      it(`R4: Hoje (${quem}, ${tema}): sem botão "Iniciar mamada", sem barra de atalhos e nada é gravado`, async () => {
        const mundo = criarMundoDeTeste(opcoes)
        const gravar = vi.spyOn(mundo.rotina, 'gravarRegistro')
        await renderizarRotaPronta('/app/hoje', { mundo, madrugada })

        expect(screen.queryByRole('button', { name: 'Iniciar mamada' })).toBeNull()
        expect(screen.queryAllByRole('button', { name: /^Iniciar (sono|mamada)/ })).toHaveLength(0)
        expect(screen.queryByRole('button', { name: /^Registrar fralda/ })).toBeNull()
        expect(document.querySelector('[data-iniciar-mamada]')).toBeNull()
        expect(document.querySelector('[data-sem-botoes]')).not.toBeNull()
        expect(gravar).not.toHaveBeenCalled()
      })

      it(`R4: Hoje sem sessão (${quem}, ${tema}): o botão grande da mamada também não aparece`, async () => {
        const mundo = criarMundoDeTeste({ ...opcoes, ajustarRotina: semSessaoEmAndamento })
        await renderizarRotaPronta('/app/hoje', { mundo, madrugada })

        expect(screen.queryByRole('button', { name: 'Iniciar mamada' })).toBeNull()
        expect(document.querySelector('[data-iniciar-mamada]')).toBeNull()
      })

      it(`R4: /app/sessao?tipo= (${quem}, ${tema}) não inicia nada: a tela abre vazia e nenhuma gravação é enviada`, async () => {
        const mundo = criarMundoDeTeste({ ...opcoes, ajustarRotina: semSessaoEmAndamento })
        const gravar = vi.spyOn(mundo.rotina, 'gravarRegistro')
        const resultado = await renderizarRotaPronta('/app/sessao?tipo=sono', { mundo, madrugada })

        expect(gravar).not.toHaveBeenCalled()
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Nenhuma sessão em andamento')
        expect(resultado.roteador.state.location.pathname).toBe('/app/sessao')
        expect(resultado.roteador.state.location.search).toBe('?tipo=sono')
        const abertas = await mundo.rotina.emAndamento(ID_BEBE)
        expect(abertas.ok && abertas.valor.itens).toEqual([])
      })

      it(`R4: /app/registro/novo?tipo= (${quem}, ${tema}) não abre o formulário`, async () => {
        const mundo = criarMundoDeTeste(opcoes)
        await renderizarRotaPronta('/app/registro/novo?tipo=fralda', { mundo, madrugada })

        expect(document.querySelector('[data-sem-permissao]')).not.toBeNull()
        expect(document.querySelector('form')).toBeNull()
      })
    }
  }

  it('R4: quem pode gravar continua vendo o botão da madrugada e a barra (controle)', async () => {
    await renderizarRotaPronta('/app/hoje', { madrugada: true })
    expect(screen.getByRole('button', { name: 'Iniciar mamada' })).toBeTruthy()
    expect(document.querySelector('[data-fileira]')).not.toBeNull()
  })

  it('R4: o cuidador também grava: /app/sessao?tipo= continua começando a sessão', async () => {
    const mundo = criarMundoDeTeste({ sessao: 'bruno', ajustarRotina: semSessaoEmAndamento })
    const resultado = await renderizarRotaPronta('/app/sessao?tipo=sono', { mundo })
    expect(resultado.roteador.state.location.search).toMatch(/^\?id=/)
  })
})

// ---- R7: a lista que passou do limite diz o N correto em cada seção -------------------------------------

const quando = (deslocamentoMs: number) => new Date(Date.now() + deslocamentoMs).toISOString()
const LIMITE_EM_ANDAMENTO = 'Esta lista mostra só os primeiros 20 itens.'
const LIMITE_DAS_NOTAS = 'Esta lista mostra só os primeiros 100 itens.'
const LIMITE_DAS_ANTERIORES = 'Esta lista mostra só os primeiros 500 itens.'

function sessoesEmAndamento(quantas: number): NonNullable<OpcoesMundo['ajustarRotina']> {
  return (fixture) => {
    const base = semSessaoEmAndamento(fixture)
    const modelo = fixture.registros.find((r) => r.tipo === 'sono' && r.fim === null)!
    const extras: Registro[] = Array.from({ length: quantas }, (_, i) => {
      const inicio = quando(-(10 + i) * MIN)
      return { ...modelo, id: uuidV7(Date.now() - i), inicio, recebidoEm: inicio, atualizadoEm: inicio }
    })
    return { ...base, registros: [...base.registros, ...extras] }
  }
}

function notasDaFamilia(quantas: number): NonNullable<OpcoesMundo['ajustarRotina']> {
  return (fixture) => {
    const modelo = fixture.notas[0]
    const extras: Nota[] = Array.from({ length: quantas }, (_, i) => {
      const criada = quando(-(4 * 60 + i) * MIN)
      return { ...modelo, id: uuidV7(Date.now() - i), texto: `Nota ${i}`, destaqueAte: null, criadaEm: criada, atualizadoEm: criada }
    })
    return { ...fixture, notas: [...fixture.notas, ...extras] }
  }
}

function sessoesConcluidas(quantas: number): NonNullable<OpcoesMundo['ajustarRotina']> {
  return (fixture) => {
    const modelo = fixture.registros.find((r) => r.tipo === 'sono' && r.fim === null)!
    const extras: Registro[] = Array.from({ length: quantas }, (_, i) => {
      const inicio = quando(-(120 + i * 10) * MIN)
      const fim = quando(-(115 + i * 10) * MIN)
      return { ...modelo, id: uuidV7(Date.now() - i), inicio, fim, encerradoPor: modelo.criadoPor, recebidoEm: fim, atualizadoEm: fim }
    })
    return { ...fixture, registros: [...fixture.registros, ...extras] }
  }
}

const avisosDeLista = () => [...document.querySelectorAll('[data-lista-incompleta]')].map((aviso) => [aviso.getAttribute('data-lista-incompleta'), aviso.textContent])

describe('R7: "Esta lista mostra só os primeiros N itens." em cada seção que passou do limite', () => {
  it('R7: o Hoje com 21 sessões em andamento avisa "20 itens" na seção das sessões, uma vez só', async () => {
    await renderizarRotaPronta('/app/hoje', { ajustarRotina: sessoesEmAndamento(21) })

    expect(avisosDeLista()).toEqual([['emAndamento', LIMITE_EM_ANDAMENTO]])
    expect(screen.getAllByText(LIMITE_EM_ANDAMENTO)).toHaveLength(1)
    expect(document.querySelector('[data-andamento]')!.parentElement!.querySelector('[data-lista-incompleta="emAndamento"]')).not.toBeNull()
  })

  it('R7: com 20 sessões (no limite, sem a 21ª) nenhum aviso aparece', async () => {
    await renderizarRotaPronta('/app/hoje', { ajustarRotina: sessoesEmAndamento(20) })
    expect(avisosDeLista()).toEqual([])
  })

  it('R7: o Hoje com 101 notas avisa "100 itens" em "Para você saber"', async () => {
    await renderizarRotaPronta('/app/hoje', { ajustarRotina: notasDaFamilia(100) })

    expect(avisosDeLista()).toEqual([['notas', LIMITE_DAS_NOTAS]])
    const secao = screen.getByRole('region', { name: 'Para você saber' })
    expect(secao.parentElement!.querySelector('[data-lista-incompleta="notas"]')).not.toBeNull()
  })

  it('R7: cada seção diz o limite dela: sessões e notas incompletas juntas dão 20 e 100, cada um no seu lugar', async () => {
    await renderizarRotaPronta('/app/hoje', {
      ajustarRotina: (fixture) => notasDaFamilia(100)(sessoesEmAndamento(21)(fixture)),
    })
    expect(avisosDeLista()).toEqual([
      ['emAndamento', LIMITE_EM_ANDAMENTO],
      ['notas', LIMITE_DAS_NOTAS],
    ])
  })

  it('R7: a Sessão com mais de 500 sessões anteriores na janela (501: as 3 da fixture mais 498) avisa "500 itens" junto da lista', async () => {
    await renderizarRotaPronta('/app/sessao', { diaCompleto: true, ajustarRotina: sessoesConcluidas(498) })

    expect(avisosDeLista()).toEqual([['anteriores', LIMITE_DAS_ANTERIORES]])
    expect(screen.getAllByText(LIMITE_DAS_ANTERIORES)).toHaveLength(1)
  })

  it('R7: a Sessão com exatamente 500 anteriores (as 3 da fixture mais 497; no limite) não avisa', async () => {
    await renderizarRotaPronta('/app/sessao', { diaCompleto: true, ajustarRotina: sessoesConcluidas(497) })
    expect(avisosDeLista()).toEqual([])
  })

  it('R7: os números do dia continuam suprimidos quando a leitura do dia passou do limite', async () => {
    await renderizarRotaPronta('/app/hoje', {
      ajustarRotina: (fixture) => {
        const modelo = fixture.registros.find((r) => r.tipo === 'fralda')!
        const extras: Registro[] = Array.from({ length: 501 }, (_, i) => {
          const inicio = quando(-(1 + i) * MIN)
          return { ...modelo, id: uuidV7(Date.now() - i), inicio, recebidoEm: inicio, atualizadoEm: inicio }
        })
        return { ...fixture, registros: [...fixture.registros, ...extras] }
      },
    })

    expect(screen.getByText('Há registros demais para somar aqui.')).toBeTruthy()
    expect(document.querySelector('[data-numero-do-dia]')).toBeNull()
  })
})

// ---- R8: a releitura que falha com dados na tela não desmonta nada ---------------------------------------

describe('R8: aviso visível e "Tentar de novo" junto dos dados', () => {
  it('R8: Hoje, escrita certa seguida de releitura errada: o cartão fica, o aviso aparece e "Tentar de novo" some com ele', async () => {
    const mundo = await renderizarRotaPronta('/app/hoje')
    simularFalhaRotina(mundo.rotina, 'emAndamento', 'rede')

    fireEvent.click(botao('Registrar fralda de Heloísa'))
    fireEvent.click(botao('Xixi'))
    await aguardarCarga()

    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_LEITURA)
    expect(botao('Encerrar')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Fralda registrada: Xixi')
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(botao('Encerrar')).toBeTruthy()
  })

  it('R8: Sessão, falha inicial: a frase e "Tentar de novo", que carrega a sessão', async () => {
    const mundo = criarMundoDeTeste()
    simularFalhaRotina(mundo.rotina, 'emAndamento', 'rede')
    await renderizarRotaPronta('/app/sessao', { mundo })

    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_LEITURA)
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(botao('Encerrar')).toBeTruthy()
  })

  it('R8: Sessão, releitura errada: o aviso e "Tentar de novo" ficam junto da sessão, e o painel e o texto da nota não se perdem', async () => {
    const mundo = await renderizarRotaPronta('/app/sessao')
    fireEvent.click(botao('Encerrar e anotar'))
    const nota = screen.getByRole('textbox', { name: 'Nota' }) as HTMLTextAreaElement
    fireEvent.change(nota, { target: { value: 'Mamou bem' } })
    simularFalhaRotina(mundo.rotina, 'emAndamento', 'rede')

    await recarregarPelaAba()

    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_LEITURA)
    expect(screen.getByRole('group', { name: 'Encerrar e anotar' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Nota' })).toBe(nota)
    expect(nota.value).toBe('Mamou bem')
    expect(document.querySelector('[data-cronometro]')).not.toBeNull()

    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Nota' })).toBe(nota)
    expect(nota.value).toBe('Mamou bem')
  })

  it('R8: Sessão, as anteriores que falham na releitura também mostram o aviso e a lista antiga continua', async () => {
    const mundo = await renderizarRotaPronta('/app/sessao', { diaCompleto: true })
    const itens = document.querySelectorAll('[data-anteriores] li').length
    expect(itens).toBeGreaterThan(0)
    simularFalhaRotina(mundo.rotina, 'sessoesDaJanela', 'rede')

    await recarregarPelaAba()

    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_LEITURA)
    expect(document.querySelectorAll('[data-anteriores] li')).toHaveLength(itens)
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('R8: Sessão, escrita certa seguida de releitura errada: encerrar leva ao Hoje, e a leitura de "Últimos" que falha mostra o aviso e "Tentar de novo"', async () => {
    const mundo = await renderizarRotaPronta('/app/sessao')
    simularFalhaRotina(mundo.rotina, 'ultimosConcluidos', 'rede')

    fireEvent.click(botao('Encerrar'))
    await aguardarCarga()

    expect(mundo.roteador.state.location.pathname).toBe('/app/hoje')
    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_LEITURA)
    expect(screen.getByRole('status').textContent).toMatch(/^Sessão encerrada: /)
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  async function abrirEdicao() {
    const mundo = await renderizarRotaPronta('/app/hoje')
    const alvo = mundo.fixture.registros.find((r) => r.tipo === 'fralda')!
    mundo.unmount()
    const tela = await renderizarRotaPronta(`/app/registro/${alvo.id}/editar`, { mundo })
    return { mundo, tela, alvo }
  }

  it('R8: Registro, falha inicial: a frase e "Tentar de novo", que abre o formulário', async () => {
    const base = await renderizarRotaPronta('/app/hoje')
    const alvo = base.fixture.registros.find((r) => r.tipo === 'fralda')!
    base.unmount()
    simularFalhaRotina(base.rotina, 'registro', 'rede')
    await renderizarRotaPronta(`/app/registro/${alvo.id}/editar`, { mundo: base })

    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_LEITURA)
    expect(document.querySelector('form')).toBeNull()
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(document.querySelector('form')).not.toBeNull()
  })

  it('R8: Registro, releitura errada: o aviso e "Tentar de novo" ficam junto do formulário, que não é desmontado nem perde o texto', async () => {
    const { mundo } = await abrirEdicao()
    const formulario = document.querySelector('form')!
    const nota = screen.getByLabelText('Nota') as HTMLTextAreaElement
    fireEvent.change(nota, { target: { value: 'Muito' } })
    simularFalhaRotina(mundo.rotina, 'registro', 'rede')

    await recarregarPelaAba()

    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_LEITURA)
    expect(document.querySelector('form')).toBe(formulario)
    expect(screen.getByLabelText('Nota')).toBe(nota)
    expect(nota.value).toBe('Muito')

    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.querySelector('form')).toBe(formulario)
    expect((screen.getByLabelText('Nota') as HTMLTextAreaElement).value).toBe('Muito')
  })

  it('R8: Registro, escrita certa seguida de releitura errada: salvar (edição aberta pela URL) leva ao detalhe, e a leitura do histórico de alterações que falha mostra o aviso e "Tentar de novo"', async () => {
    const { mundo } = await abrirEdicao()
    fireEvent.change(screen.getByLabelText('Nota'), { target: { value: 'Muito' } })
    simularFalhaRotina(mundo.rotina, 'alteracoes', 'rede')

    fireEvent.click(botao('Salvar'))
    await aguardarCarga()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Registro')
    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_LEITURA)
    expect(screen.getByRole('status').textContent).toContain('Registro salvo')
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.querySelector('[data-cabecalho-do-registro]')).not.toBeNull()
    expect(screen.getByRole('region', { name: 'Histórico de alterações' })).toBeTruthy()
  })

  it('R8: o contexto que falha na releitura mostra o aviso e "Tentar de novo", e a tela com o formulário segue de pé', async () => {
    const { mundo } = await abrirEdicao()
    const formulario = document.querySelector('form')!
    fireEvent.change(screen.getByLabelText('Nota'), { target: { value: 'Muito' } })
    simularFalhaRotina(mundo.rotina, 'contexto', 'rede')

    await recarregarPelaAba()

    expect(document.querySelector('[data-releitura-falhou="contexto"]')).not.toBeNull()
    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_LEITURA)
    expect(document.querySelector('form')).toBe(formulario)
    expect((screen.getByLabelText('Nota') as HTMLTextAreaElement).value).toBe('Muito')

    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(document.querySelector('[data-releitura-falhou]')).toBeNull()
    expect(document.querySelector('form')).toBe(formulario)
  })
})
