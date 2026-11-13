import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { simularFalhaRotina } from '../../dados/rotina.memoria.ts'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'

// O detalhe do registro (MAT-38b, R38-22), com o relógio falso às 10:00 de 5/11/2026 (hora do aparelho). Os ids são os
// da fixture de teste: 3 é a mamada de Bruno (07:32 a 07:50, lado esquerdo), 1 é o sono de Bruno em andamento, 2 é a
// fralda de Bruno e 11 é a fralda de Juliana (variação "dia completo").

const INSTANTE = new Date('2026-11-05T10:00:00')
const DIA_EM_MS = 86_400_000
const id = (numero: number) => `a0000000-0000-7000-8000-${String(numero).padStart(12, '0')}`
const MAMADA = id(3)
const SONO_ABERTO = id(1)
const FRALDA_DE_JULIANA = id(11)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const botao = (nome: string) => screen.getByRole('button', { name: nome })
const status = () => screen.getByRole('status')
const linhaDoBebe = () => document.querySelector('[data-titulo-tela] h1')!.nextElementSibling!.textContent
const campos = () =>
  Object.fromEntries([...document.querySelectorAll('[data-detalhes-do-registro] dt')].map((dt) => [dt.textContent, dt.nextElementSibling!.textContent]))
const h1 = () => screen.getByRole('heading', { level: 1 })

describe('R38-22: o que o detalhe mostra', () => {
  it('um main, um h1, o tipo e o bebê, o horário, a duração, os detalhes, a origem e a autoria', async () => {
    await renderizarRotaPronta(`/app/registro/${MAMADA}`)

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(h1().textContent).toBe('Registro')
    expect(linhaDoBebe()).toBe('Mamada, Heloísa')
    expect(campos()).toEqual({
      Início: '05/11 às 07:32',
      Fim: '05/11 às 07:50',
      Duração: '18 min',
      Lado: 'lado esquerdo',
      Origem: 'registrado na hora',
    })
    expect(screen.getByText('iniciado por Bruno')).toBeTruthy()
    expect(screen.getByText('encerrado por Bruno')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Voltar para o Histórico' }).getAttribute('href')).toBe('/app/historico?dia=2026-11-05')
  })

  it('a sessão em andamento mostra `em andamento` no fim e não mostra `encerrado por`', async () => {
    await renderizarRotaPronta(`/app/registro/${SONO_ABERTO}`)

    expect(campos().Fim).toBe('em andamento')
    expect(campos().Duração).toBeUndefined()
    expect(screen.queryByText(/encerrado por/)).toBeNull()
  })

  it('um registro pontual mostra `registrado por` e só o horário', async () => {
    await renderizarRotaPronta(`/app/registro/${FRALDA_DE_JULIANA}`, { diaCompleto: true })

    expect(campos()).toMatchObject({ Horário: '05/11 às 07:50', Conteúdo: 'Cocô' })
    expect(screen.getByText('registrado por Juliana')).toBeTruthy()
  })

  it('a autoria de quem já não é da família é `ex-membro da família`; sem autor, `pessoa removida`', async () => {
    const { unmount } = await renderizarRotaPronta(`/app/registro/${MAMADA}`, {
      ajustarRotina: (f) => ({ ...f, registros: f.registros.map((r) => (r.id === MAMADA ? { ...r, criadoPor: PESSOAS.davi.id, encerradoPor: null } : r)) }),
    })
    expect(screen.getByText('iniciado por ex-membro da família')).toBeTruthy()
    expect(screen.getByText('encerrado por pessoa removida')).toBeTruthy()
    unmount()
  })

  it('abrir o registro de outro bebê visível troca o bebê ativo para o dele', async () => {
    const zelia = { id: 'c2222222-2222-4222-8222-222222222222', nome: 'Zélia', nascimento: '2026-10-05', estado: 'ativo' as const }
    const outro = id(500)
    await renderizarRotaPronta(`/app/registro/${outro}`, {
      bebesExtras: [zelia],
      ajustarRotina: (f) => ({ ...f, registros: [...f.registros, { ...f.registros.find((r) => r.id === MAMADA)!, id: outro, bebeId: zelia.id }] }),
    })

    expect(linhaDoBebe()).toBe('Mamada, Zélia')
  })
})

describe('R38-22: não encontrado e falhas', () => {
  it('id que não é UUID, ou de um registro que não existe: o estado `Não encontrado`, sem ações', async () => {
    for (const caminho of ['/app/registro/xyz', `/app/registro/${id(9999)}`]) {
      const { unmount } = await renderizarRotaPronta(caminho)
      expect(screen.getByText('Não encontramos este registro. Ele pode ter sido removido, ou você não tem mais acesso.')).toBeTruthy()
      expect(screen.getAllByRole('main')).toHaveLength(1)
      expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull()
      unmount()
    }
  })

  it('falha de rede na leitura: a frase do catálogo e Tentar de novo, que relê', async () => {
    const mundo = criarMundoDeTeste()
    simularFalhaRotina(mundo.rotina, 'registro', 'rede')
    await renderizarRotaPronta(`/app/registro/${MAMADA}`, { mundo })

    expect(screen.getByRole('alert').textContent).toContain('Não foi possível falar com o servidor. Verifique a conexão.')
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()
    expect(campos().Lado).toBe('lado esquerdo')
  })

  it('Excluir que falha por falta de resposta: a frase de escrita e Tentar de novo, que exclui e leva ao Histórico', async () => {
    const mundo = criarMundoDeTeste({ diaCompleto: true })
    const { roteador } = await renderizarRotaPronta(`/app/registro/${MAMADA}`, { mundo })
    simularFalhaRotina(mundo.rotina, 'excluirRegistro', 'rede')

    fireEvent.click(botao('Excluir'))
    await aguardarCarga()

    expect(status().textContent).toContain('Não deu para confirmar com o servidor.')
    expect(roteador.state.location.pathname).toBe(`/app/registro/${MAMADA}`)
    fireEvent.click(within(status()).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/historico')
    expect(status().textContent).toContain('Registro excluído.')
  })

  it('o registro que outra pessoa já excluiu: a frase do catálogo com o link `Abrir a lixeira`', async () => {
    const mundo = criarMundoDeTeste()
    await renderizarRotaPronta(`/app/registro/${MAMADA}`, { mundo })
    simularFalhaRotina(mundo.rotina, 'excluirRegistro', 'registro_excluido')

    fireEvent.click(botao('Excluir'))
    await aguardarCarga()

    expect(status().textContent).toContain('Este registro foi excluído e não pode ser mudado.')
    expect(within(status()).getByRole('link', { name: 'Abrir a lixeira' }).getAttribute('href')).toBe('/app/lixeira')
    expect(status().textContent).not.toMatch(/P0001|registro excluido/)
  })
})

describe('R38-22: quem pode alterar', () => {
  it('o responsável vê Editar e Excluir', async () => {
    await renderizarRotaPronta(`/app/registro/${MAMADA}`)

    expect(screen.getByRole('link', { name: 'Editar mamada' })).toBeTruthy()
    expect(botao('Excluir')).toBeTruthy()
  })

  it('o cuidador só os dos próprios registros', async () => {
    const { unmount } = await renderizarRotaPronta(`/app/registro/${MAMADA}`, { sessao: 'bruno', diaCompleto: true })
    expect(botao('Excluir')).toBeTruthy()
    unmount()

    await renderizarRotaPronta(`/app/registro/${FRALDA_DE_JULIANA}`, { sessao: 'bruno', diaCompleto: true })
    expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull()
    expect(screen.queryByRole('link', { name: /Editar/ })).toBeNull()
  })

  it('o observador não tem ações e não vê o Histórico de alterações', async () => {
    await renderizarRotaPronta(`/app/registro/${MAMADA}`, { sessao: 'bruno', papelDeBruno: 'observador' })

    expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull()
    expect(screen.queryByRole('link', { name: /Editar/ })).toBeNull()
    expect(screen.queryByText('Histórico de alterações')).toBeNull()
  })

  it('o bebê arquivado: só leitura, sem ações', async () => {
    await renderizarRotaPronta(`/app/registro/${MAMADA}`, { bebeArquivado: true })

    expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull()
  })
})

describe('R38-22: o Histórico de alterações', () => {
  it('uma linha por alteração, da mais antiga à mais nova, com o que o campo mudou', async () => {
    const mundo = criarMundoDeTeste()
    const lido = await mundo.rotina.registro(MAMADA)
    if (!lido.ok || !lido.valor) throw new Error('fixture sem a mamada')
    await mundo.rotina.editarRegistro(MAMADA, { inicio: lido.valor.inicio, fim: new Date('2026-11-05T07:55:00').toISOString(), detalhes: lido.valor.detalhes, nota: null })
    vi.setSystemTime(new Date('2026-11-05T10:30:00'))
    await mundo.rotina.excluirRegistro(MAMADA)
    await renderizarRotaPronta(`/app/registro/${MAMADA}`, { mundo })

    const secao = document.querySelector('[data-historico-de-alteracoes]') as HTMLElement
    const itens = [...secao.querySelectorAll('li')].map((li) => [...li.querySelectorAll('p')].map((p) => p.textContent))
    expect(itens).toEqual([['Editado por Juliana, 05/11 às 10:00', 'Fim: 07:50 → 07:55'], ['Excluído por Juliana, 05/11 às 10:30']])
  })

  it('sem alteração registrada, a frase da seção', async () => {
    await renderizarRotaPronta(`/app/registro/${MAMADA}`)

    expect(screen.getByText('Nenhuma alteração registrada.')).toBeTruthy()
  })
})

describe('R38-22: Editar volta ao detalhe', () => {
  it('Editar abre o formulário; Salvar e Cancelar voltam ao detalhe, com o foco no h1', async () => {
    const mundo = await renderizarRotaPronta(`/app/registro/${MAMADA}`)

    fireEvent.click(screen.getByRole('link', { name: 'Editar mamada' }))
    await aguardarCarga()
    expect(mundo.roteador.state.location.pathname).toBe(`/app/registro/${MAMADA}/editar`)
    expect(screen.getByRole('link', { name: 'Voltar para o registro' }).getAttribute('href')).toBe(`/app/registro/${MAMADA}`)

    fireEvent.click(botao('Cancelar'))
    await aguardarCarga()
    expect(mundo.roteador.state.location.pathname).toBe(`/app/registro/${MAMADA}`)
    expect(document.activeElement).toBe(h1())

    fireEvent.click(screen.getByRole('link', { name: 'Editar mamada' }))
    await aguardarCarga()
    fireEvent.click(botao('Salvar'))
    await aguardarCarga()
    expect(mundo.roteador.state.location.pathname).toBe(`/app/registro/${MAMADA}`)
  })
})

describe('R38-22: Excluir e Desfazer', () => {
  it('Excluir não pede confirmação: vai ao Histórico do dia, mostra `Registro excluído.` com Desfazer e Fechar, e o foco vai ao h1', async () => {
    const mundo = await renderizarRotaPronta(`/app/registro/${MAMADA}`)

    fireEvent.click(botao('Excluir'))
    await aguardarCarga()

    expect(mundo.roteador.state.location.pathname).toBe('/app/historico')
    expect(mundo.roteador.state.location.search).toBe('?dia=2026-11-05')
    expect(status().querySelector('p')!.textContent).toBe('Registro excluído.')
    expect(within(status()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Desfazer', 'Fechar'])
    expect(document.activeElement).toBe(h1())
    expect(document.querySelector(`[data-registro="${MAMADA}"]`)).toBeNull()
  })

  it('Desfazer restaura, fecha a confirmação e leva o foco ao h1; Fechar só fecha', async () => {
    await renderizarRotaPronta(`/app/registro/${MAMADA}`)
    fireEvent.click(botao('Excluir'))
    await aguardarCarga()

    fireEvent.click(botao('Desfazer'))
    await aguardarCarga()

    expect(document.querySelector(`[data-registro="${MAMADA}"]`)).not.toBeNull()
    expect(status().textContent).toBe('')
    expect(document.activeElement).toBe(h1())
  })

  it('Fechar fecha a confirmação e leva o foco ao h1', async () => {
    await renderizarRotaPronta(`/app/registro/${MAMADA}`)
    fireEvent.click(botao('Excluir'))
    await aguardarCarga()

    fireEvent.click(botao('Fechar'))

    expect(status().textContent).toBe('')
    expect(document.activeElement).toBe(h1())
    expect(document.querySelector(`[data-registro="${MAMADA}"]`)).toBeNull()
  })
})

describe('R38-22: o registro excluído e o prazo de 30 dias', () => {
  async function abrirExcluido(depoisDe: number) {
    const mundo = criarMundoDeTeste()
    expect((await mundo.rotina.excluirRegistro(MAMADA)).ok).toBe(true)
    vi.setSystemTime(new Date(INSTANTE.getTime() + depoisDe))
    return renderizarRotaPronta(`/app/registro/${MAMADA}`, { mundo })
  }

  it('dentro do prazo: `Este registro está na lixeira.` e Restaurar, que mostra `Registro restaurado.` com Ver no Histórico', async () => {
    await abrirExcluido(30 * DIA_EM_MS - 60_000)

    expect(screen.getByText('Este registro está na lixeira.')).toBeTruthy()
    fireEvent.click(botao('Restaurar'))
    await aguardarCarga()

    expect(status().querySelector('p')!.textContent).toBe('Registro restaurado.')
    expect(within(status()).getByRole('link', { name: 'Ver no Histórico' }).getAttribute('href')).toBe('/app/historico?dia=2026-11-05')
    expect(screen.queryByText('Este registro está na lixeira.')).toBeNull()
    expect(document.activeElement).toBe(h1())
  })

  it('30 dias exatos: a frase, e nenhum Restaurar', async () => {
    await abrirExcluido(30 * DIA_EM_MS)

    expect(screen.getByText('Este registro está na lixeira.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Restaurar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull()
  })
})
