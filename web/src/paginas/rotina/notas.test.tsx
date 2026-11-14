import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { simularFalhaRotina, simularRespostaPerdidaRotina } from '../../dados/rotina.memoria.ts'
import type { FixtureRotina } from '../../dados/rotina.memoria.ts'
import type { Nota } from '../../dados/rotina.tipos.ts'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste, ID_BEBE } from '../../teste/rotina.fixture.ts'

// As notas (MAT-38b, R38-24), com o relógio falso às 10:00 de 5/11/2026 (hora do aparelho). A nota 900 da fixture é
// de Carla, para a família toda, com destaque até as 10:00 de 6/11.

const INSTANTE = new Date('2026-11-05T10:00:00')
const HORA = 3_600_000
const id = (numero: number) => `a0000000-0000-7000-8000-${String(numero).padStart(12, '0')}`
const DA_CARLA = id(900)
const iso = (instante: number) => new Date(instante).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const status = () => screen.getByRole('status')
const notas = () => [...document.querySelectorAll('[data-notas-da-familia] li')] as HTMLElement[]
const textosDasNotas = () => notas().map((li) => li.querySelector('p')!.textContent)
const h1 = () => screen.getByRole('heading', { level: 1 })
// A11Y-008: o campo do texto é obrigatório e o rótulo diz "(obrigatório)".
const campoTexto = () => screen.getByLabelText('Texto da nota (obrigatório)') as HTMLTextAreaElement
const selecao = (nome: string) => screen.getByLabelText(nome) as HTMLSelectElement

function notaDe(numero: number, resto: Partial<Nota> = {}): Nota {
  const criada = iso(INSTANTE.getTime() - numero * 60_000)
  return {
    id: id(numero),
    familiaId: '',
    bebeId: null,
    texto: `Nota ${numero}`,
    destaqueAte: null,
    criadoPor: PESSOAS.juliana.id,
    criadaEm: criada,
    versao: 1,
    atualizadoEm: criada,
    excluidaEm: null,
    excluidaPor: null,
    ...resto,
  }
}

/** Acrescenta notas à fixture, com a família da nota 900. */
const comNotas =
  (...extras: Nota[]) =>
  (fixture: FixtureRotina): FixtureRotina => {
    const base = fixture.notas[0]
    return {
      ...fixture,
      notas: [...fixture.notas, ...extras.map((nota) => ({ ...nota, familiaId: base.familiaId, bebeId: nota.bebeId === undefined ? null : nota.bebeId }))],
    }
  }

describe('R38-24: a lista de notas', () => {
  it('um main, um h1, `Nova nota` uma vez, e a nota com sobre, autor, data e destaque', async () => {
    await renderizarRotaPronta('/app/notas')

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Notas'])
    expect(screen.getAllByRole('link', { name: 'Nova nota' })).toHaveLength(1)
    expect(notas()).toHaveLength(1)
    const nota = notas()[0]
    expect(nota.textContent).toContain('Pomada só à noite.')
    expect(nota.textContent).toContain('Sobre a família toda')
    expect(nota.textContent).toContain('Carla, ')
    expect(nota.textContent).toContain('em destaque até 06/11 às 10:00')
  })

  it('a mais nova primeiro; uma nota sem destaque ou com destaque vencido não mostra `em destaque`', async () => {
    await renderizarRotaPronta('/app/notas', {
      ajustarRotina: comNotas(
        notaDe(1, { texto: 'A mais nova' }),
        notaDe(2, { texto: 'Destaque vencido', destaqueAte: iso(INSTANTE.getTime() - HORA) }),
        notaDe(3, { texto: 'A mais antiga' }),
      ),
    })

    expect(textosDasNotas().slice(0, 3)).toEqual(['A mais nova', 'Destaque vencido', 'A mais antiga'])
    expect(notas()[1].textContent).not.toContain('em destaque')
    expect(notas()[0].textContent).not.toContain('em destaque')
  })

  it('uma nota do bebê diz `Sobre <nome>`', async () => {
    await renderizarRotaPronta('/app/notas', { ajustarRotina: comNotas(notaDe(1, { texto: 'Da Heloísa', bebeId: ID_BEBE })) })

    expect(notas().find((li) => li.textContent?.includes('Da Heloísa'))!.textContent).toContain('Sobre Heloísa')
  })

  it('o link Voltar para Hoje leva ao Hoje, com o foco no h1 dele', async () => {
    const { roteador } = await renderizarRotaPronta('/app/notas')

    fireEvent.click(screen.getByRole('link', { name: 'Voltar para Hoje' }))
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/hoje')
    expect(document.activeElement).toBe(h1())
  })

  it('a autoria de quem já não é da família é `ex-membro da família`', async () => {
    await renderizarRotaPronta('/app/notas', { ajustarRotina: comNotas(notaDe(1, { texto: 'De Davi', criadoPor: PESSOAS.davi.id })) })

    expect(notas().find((li) => li.textContent?.includes('De Davi'))!.textContent).toContain('ex-membro da família, ')
  })

  it('lista com mais de 100 notas: o aviso da lista incompleta com o limite', async () => {
    await renderizarRotaPronta('/app/notas', { ajustarRotina: comNotas(...Array.from({ length: 101 }, (_, indice) => notaDe(1_000 + indice))) })

    expect(document.querySelector('[data-lista-incompleta="notas"]')!.textContent).toBe('Esta lista mostra só os primeiros 100 itens.')
    expect(notas()).toHaveLength(100)
  })

  it('sem nenhuma nota: a frase da lista vazia', async () => {
    await renderizarRotaPronta('/app/notas', { semRegistros: true })

    expect(screen.getByText('Nenhuma nota.')).toBeTruthy()
  })

  it('falha de rede na leitura: a frase do catálogo e Tentar de novo, que relê', async () => {
    const mundo = criarMundoDeTeste()
    simularFalhaRotina(mundo.rotina, 'notas', 'rede')
    await renderizarRotaPronta('/app/notas', { mundo })

    expect(screen.getByRole('alert').textContent).toContain('Não foi possível falar com o servidor. Verifique a conexão.')
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()

    expect(notas()).toHaveLength(1)
  })
})

describe('R38-24: quem pode o quê', () => {
  it('o responsável cria, edita e exclui qualquer nota', async () => {
    await renderizarRotaPronta('/app/notas')

    expect(screen.getByRole('link', { name: 'Nova nota' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Editar nota: Pomada só à noite.' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Excluir nota: Pomada só à noite.' })).toBeTruthy()
  })

  it('o cuidador cria e muda só as notas que fez', async () => {
    await renderizarRotaPronta('/app/notas', { sessao: 'bruno', ajustarRotina: comNotas(notaDe(1, { texto: 'Do Bruno', criadoPor: PESSOAS.bruno.id })) })

    expect(screen.getByRole('link', { name: 'Nova nota' })).toBeTruthy()
    const [doBruno, daCarla] = notas()
    expect(within(doBruno).getByRole('button', { name: 'Excluir nota: Do Bruno' })).toBeTruthy()
    expect(within(daCarla).queryByRole('button')).toBeNull()
    expect(within(daCarla).queryByRole('link')).toBeNull()
  })

  it('o observador vê as notas e a frase do papel, sem criar, editar nem excluir', async () => {
    await renderizarRotaPronta('/app/notas', { sessao: 'bruno', papelDeBruno: 'observador' })

    expect(notas()).toHaveLength(1)
    expect(screen.queryByRole('link', { name: 'Nova nota' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Excluir/ })).toBeNull()
    expect(document.querySelector('[data-sem-permissao]')!.textContent).toBe('Seu papel nesta família permite só ver os registros.')
  })

  it('o observador que abre a tela de nova nota ou de edição vê só a frase do papel', async () => {
    const { unmount } = await renderizarRotaPronta('/app/notas/nova', { sessao: 'bruno', papelDeBruno: 'observador' })
    expect(document.querySelector('[data-sem-permissao]')!.textContent).toBe('Seu papel nesta família permite só ver os registros.')
    expect(document.querySelector('form')).toBeNull()
    unmount()

    await renderizarRotaPronta(`/app/notas/${DA_CARLA}/editar`, { sessao: 'bruno', papelDeBruno: 'observador' })
    expect(document.querySelector('[data-sem-permissao]')).toBeTruthy()
    expect(document.querySelector('form')).toBeNull()
  })

  it('o cuidador que abre a edição da nota de outra pessoa vê a frase do papel, sem formulário', async () => {
    await renderizarRotaPronta(`/app/notas/${DA_CARLA}/editar`, { sessao: 'bruno' })

    expect(document.querySelector('[data-sem-permissao]')!.textContent).toBe('Seu papel nesta família permite mudar só os registros que você fez.')
    expect(document.querySelector('form')).toBeNull()
  })
})

describe('R38-24: nova nota', () => {
  it('abre com o texto vazio, `Sobre` o bebê e `Sem destaque`; um main, um h1', async () => {
    await renderizarRotaPronta('/app/notas')
    fireEvent.click(screen.getByRole('link', { name: 'Nova nota' }))
    await aguardarCarga()

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(h1().textContent).toBe('Nova nota')
    expect(document.activeElement).toBe(h1())
    expect(campoTexto().value).toBe('')
    expect(selecao('Sobre').value).toBe('bebe')
    expect([...selecao('Sobre').options].map((opcao) => opcao.textContent)).toEqual(['A família toda', 'Heloísa'])
    expect(selecao('Destaque').value).toBe('')
    expect([...selecao('Destaque').options].map((opcao) => opcao.textContent)).toEqual(['Sem destaque', 'Por 12 horas', 'Por 24 horas', 'Por 3 dias'])
  })

  it('A11Y-008: o texto leva aria-required e "(obrigatório)" no rótulo, sem `required` nativo; `Sobre` e `Destaque` não', async () => {
    await renderizarRotaPronta('/app/notas/nova')

    expect(campoTexto().getAttribute('aria-required')).toBe('true')
    expect(campoTexto().hasAttribute('required')).toBe(false)
    expect(campoTexto().closest('form')!.noValidate).toBe(true)
    expect(selecao('Sobre').hasAttribute('aria-required')).toBe(false)
    expect(selecao('Destaque').hasAttribute('aria-required')).toBe(false)
  })

  it('criar volta à lista, mostra `Nota salva.`, põe o foco no h1 e a nota aparece com o destaque pedido', async () => {
    const { roteador } = await renderizarRotaPronta('/app/notas')
    fireEvent.click(screen.getByRole('link', { name: 'Nova nota' }))
    await aguardarCarga()

    fireEvent.change(campoTexto(), { target: { value: '  Dar a vitamina de manhã.  ' } })
    fireEvent.change(selecao('Destaque'), { target: { value: '12h' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/notas')
    expect(status().textContent).toContain('Nota salva.')
    expect(document.activeElement).toBe(h1())
    expect(textosDasNotas()).toContain('Dar a vitamina de manhã.')
    const nova = notas().find((li) => li.textContent?.includes('Dar a vitamina'))!
    expect(nova.textContent).toContain('Sobre Heloísa')
    expect(nova.textContent).toContain('Juliana, ')
    expect(nova.textContent).toContain('em destaque até 05/11 às 22:00')
  })

  it('`A família toda` grava a nota sem bebê', async () => {
    await renderizarRotaPronta('/app/notas/nova')

    fireEvent.change(campoTexto(), { target: { value: 'Para todos.' } })
    fireEvent.change(selecao('Sobre'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()

    expect(notas().find((li) => li.textContent?.includes('Para todos.'))!.textContent).toContain('Sobre a família toda')
  })

  it('texto vazio: a mensagem ao lado do campo, o foco nele e nada gravado', async () => {
    const { roteador } = await renderizarRotaPronta('/app/notas/nova')

    fireEvent.change(campoTexto(), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()

    expect(screen.getByText('Escreva o texto da nota.')).toBeTruthy()
    expect(campoTexto().getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(campoTexto())
    expect(roteador.state.location.pathname).toBe('/app/notas/nova')
  })

  it('texto com mais de 500 caracteres: a mensagem, sem gravar', async () => {
    await renderizarRotaPronta('/app/notas/nova')

    fireEvent.change(campoTexto(), { target: { value: 'a'.repeat(501) } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()

    expect(screen.getByText('O texto passa de 500 caracteres.')).toBeTruthy()
  })

  it('Cancelar volta à origem sem gravar, com o foco no h1', async () => {
    const { roteador } = await renderizarRotaPronta('/app/notas/nova')

    fireEvent.change(campoTexto(), { target: { value: 'Rascunho que não vale.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/notas')
    expect(document.activeElement).toBe(h1())
    expect(textosDasNotas()).toEqual(['Pomada só à noite.'])
  })

  it('aberta pela URL, sem origem, o link de voltar e o destino são `/app/notas`', async () => {
    await renderizarRotaPronta('/app/notas/nova')

    expect(screen.getByRole('link', { name: 'Voltar para as notas' }).getAttribute('href')).toBe('/app/notas')
  })

  it('com a origem Hoje no state, o link de voltar, Cancelar e Salvar levam ao Hoje', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje')
    await act(async () => {
      await roteador.navigate('/app/notas/nova', { state: { origem: '/app/hoje' } })
    })
    await aguardarCarga()

    expect(screen.getByRole('link', { name: 'Voltar para Hoje' }).getAttribute('href')).toBe('/app/hoje')
    fireEvent.change(campoTexto(), { target: { value: 'Vinda do Hoje.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/hoje')
    expect(status().textContent).toContain('Nota salva.')
  })

  it('um state com outra origem cai no padrão `/app/notas`', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje')
    await act(async () => {
      await roteador.navigate('/app/notas/nova', { state: { origem: 'https://outro.exemplo/' } })
    })
    await aguardarCarga()

    expect(screen.getByRole('link', { name: 'Voltar para as notas' }).getAttribute('href')).toBe('/app/notas')
  })

  it('bebê arquivado: `Sobre` só tem `A família toda`, e a nota é criada para a família', async () => {
    await renderizarRotaPronta('/app/notas/nova', { bebeArquivado: true })

    expect([...selecao('Sobre').options].map((opcao) => opcao.textContent)).toEqual(['A família toda'])
    fireEvent.change(campoTexto(), { target: { value: 'Nota da família.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()

    expect(notas().find((li) => li.textContent?.includes('Nota da família.'))!.textContent).toContain('Sobre a família toda')
  })

  it('resposta perdida: Tentar de novo repete o mesmo id, e a nota aparece uma vez só', async () => {
    const mundo = criarMundoDeTeste()
    await renderizarRotaPronta('/app/notas/nova', { mundo })
    simularRespostaPerdidaRotina(mundo.rotina, 'gravarNota')

    fireEvent.change(campoTexto(), { target: { value: 'Só uma vez.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()

    expect(screen.getByRole('alert').textContent).toContain('Não deu para confirmar com o servidor.')
    expect(campoTexto().value).toBe('Só uma vez.')
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()

    expect(textosDasNotas().filter((texto) => texto === 'Só uma vez.')).toHaveLength(1)
  })

  it('mudar o texto depois da falha é outro envio, com outro id: as duas notas existem', async () => {
    const mundo = criarMundoDeTeste()
    await renderizarRotaPronta('/app/notas/nova', { mundo })
    simularRespostaPerdidaRotina(mundo.rotina, 'gravarNota')

    fireEvent.change(campoTexto(), { target: { value: 'Primeira versão.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()
    fireEvent.change(campoTexto(), { target: { value: 'Segunda versão.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()

    expect(textosDasNotas()).toEqual(expect.arrayContaining(['Primeira versão.', 'Segunda versão.']))
  })

  it('falha de rede ao salvar: a frase do catálogo e Tentar de novo, que grava', async () => {
    const mundo = criarMundoDeTeste()
    await renderizarRotaPronta('/app/notas/nova', { mundo })
    simularFalhaRotina(mundo.rotina, 'gravarNota', 'rede')

    fireEvent.change(campoTexto(), { target: { value: 'Depois da falha.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()
    expect(screen.getByRole('alert').textContent).toContain('Não deu para confirmar com o servidor.')

    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()
    expect(textosDasNotas()).toContain('Depois da falha.')
  })
})

describe('R38-24: editar nota', () => {
  it('abre com o texto da nota, `Sobre` como texto fixo e o destaque vigente como `Manter até`', async () => {
    await renderizarRotaPronta(`/app/notas/${DA_CARLA}/editar`)

    expect(h1().textContent).toBe('Editar nota')
    expect(campoTexto().value).toBe('Pomada só à noite.')
    expect(document.querySelector('[data-sobre]')!.textContent).toContain('Sobre a família toda')
    expect(screen.queryByLabelText('Sobre')).toBeNull()
    expect(selecao('Destaque').value).toBe('manter')
    expect([...selecao('Destaque').options].map((opcao) => opcao.textContent)).toEqual(['Sem destaque', 'Manter até 06/11 às 10:00', 'Por 12 horas', 'Por 24 horas', 'Por 3 dias'])
  })

  it('salvar grava o texto novo, mantém o destaque, volta à lista e põe o foco no h1', async () => {
    const { roteador } = await renderizarRotaPronta('/app/notas')
    fireEvent.click(screen.getByRole('link', { name: 'Editar nota: Pomada só à noite.' }))
    await aguardarCarga()

    fireEvent.change(campoTexto(), { target: { value: 'Pomada de manhã e à noite.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/notas')
    expect(status().textContent).toContain('Nota salva.')
    expect(document.activeElement).toBe(h1())
    expect(textosDasNotas()).toEqual(['Pomada de manhã e à noite.'])
    expect(notas()[0].textContent).toContain('em destaque até 06/11 às 10:00')
  })

  it('`Sem destaque` tira o destaque', async () => {
    await renderizarRotaPronta(`/app/notas/${DA_CARLA}/editar`)

    fireEvent.change(selecao('Destaque'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()

    expect(notas()[0].textContent).not.toContain('em destaque')
  })

  it('Cancelar volta à lista sem gravar', async () => {
    const { roteador } = await renderizarRotaPronta(`/app/notas/${DA_CARLA}/editar`)

    fireEvent.change(campoTexto(), { target: { value: 'Não vale.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/notas')
    expect(textosDasNotas()).toEqual(['Pomada só à noite.'])
  })

  it('uma nota sem destaque vigente não oferece `Manter até`', async () => {
    await renderizarRotaPronta(`/app/notas/${id(1)}/editar`, { ajustarRotina: comNotas(notaDe(1, { texto: 'Sem destaque' })) })

    expect(selecao('Destaque').value).toBe('')
    expect([...selecao('Destaque').options].map((opcao) => opcao.textContent)).toEqual(['Sem destaque', 'Por 12 horas', 'Por 24 horas', 'Por 3 dias'])
  })

  it('id que não é UUID, ou de uma nota que não existe: `Não encontrada`, sem formulário', async () => {
    for (const caminho of ['/app/notas/xyz/editar', `/app/notas/${id(9999)}/editar`]) {
      const { unmount } = await renderizarRotaPronta(caminho)
      expect(screen.getByText('Não encontramos esta nota. Ela pode ter sido removida, ou você não tem mais acesso.')).toBeTruthy()
      expect(screen.getAllByRole('main')).toHaveLength(1)
      expect(document.querySelector('form')).toBeNull()
      unmount()
    }
  })

  it('falha de rede na leitura: a frase do catálogo e Tentar de novo, que relê', async () => {
    const mundo = criarMundoDeTeste()
    simularFalhaRotina(mundo.rotina, 'notas', 'rede')
    await renderizarRotaPronta(`/app/notas/${DA_CARLA}/editar`, { mundo })

    expect(screen.getByRole('alert').textContent).toContain('Não foi possível falar com o servidor.')
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()
    expect(campoTexto().value).toBe('Pomada só à noite.')
  })
})

describe('R38-24: excluir nota', () => {
  const botaoExcluir = () => screen.getByRole('button', { name: 'Excluir nota: Pomada só à noite.' })

  it('Excluir pede a confirmação com `Excluir` e `Manter`; Manter fecha o pedido e a nota fica', async () => {
    await renderizarRotaPronta('/app/notas')

    fireEvent.click(botaoExcluir())
    const grupo = screen.getByRole('group', { name: 'Excluir a nota' })
    expect(grupo.textContent).toContain('Excluir esta nota? Ela não poderá ser restaurada.')
    fireEvent.click(within(grupo).getByRole('button', { name: 'Manter' }))

    expect(screen.queryByRole('group', { name: 'Excluir a nota' })).toBeNull()
    expect(notas()).toHaveLength(1)
  })

  it('confirmar exclui a nota, mostra `Nota excluída.`, põe o foco no h1 e a lista fica vazia', async () => {
    await renderizarRotaPronta('/app/notas')

    fireEvent.click(botaoExcluir())
    fireEvent.click(within(screen.getByRole('group', { name: 'Excluir a nota' })).getByRole('button', { name: 'Excluir' }))
    await aguardarCarga()

    expect(status().textContent).toContain('Nota excluída.')
    expect(document.activeElement).toBe(h1())
    expect(notas()).toHaveLength(0)
    expect(screen.getByText('Nenhuma nota.')).toBeTruthy()
  })

  it('sem resposta do servidor: a frase de escrita e Tentar de novo, que exclui', async () => {
    const mundo = criarMundoDeTeste()
    await renderizarRotaPronta('/app/notas', { mundo })
    simularFalhaRotina(mundo.rotina, 'excluirNota', 'rede')

    fireEvent.click(botaoExcluir())
    fireEvent.click(within(screen.getByRole('group', { name: 'Excluir a nota' })).getByRole('button', { name: 'Excluir' }))
    await aguardarCarga()
    expect(status().textContent).toContain('Não deu para confirmar com o servidor.')

    fireEvent.click(within(status()).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()
    expect(notas()).toHaveLength(0)
  })
})

describe('R38-24: sem bebê', () => {
  it('sem bebê, a tela de família sem bebê e nenhuma lista de notas', async () => {
    await renderizarRotaPronta('/app/notas', { semBebes: true })

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(document.querySelector('[data-notas-da-familia]')).toBeNull()
  })
})

describe('R38-24: os links do Hoje', () => {
  it('`Ver notas` abre as notas com o foco no h1 e o link de voltar para o Hoje', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje')

    fireEvent.click(screen.getAllByRole('link', { name: 'Ver notas' })[0])
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/notas')
    expect(document.activeElement).toBe(h1())
    expect(screen.getByRole('link', { name: 'Voltar para Hoje' }).getAttribute('href')).toBe('/app/hoje')
  })

  it('`Ver no Histórico` abre o Histórico, e cada registro do `Desde` é um link para o detalhe', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje', { diaCompleto: true })
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'))

    expect(links).toContain(`/app/registro/${id(2)}`)
    fireEvent.click(screen.getAllByRole('link', { name: 'Ver no Histórico' })[0])
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/historico')
    expect(document.activeElement).toBe(h1())
  })
})
