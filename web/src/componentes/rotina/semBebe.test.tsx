import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { SENHA_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'
import { ID_FAMILIA } from '../../teste/rotina.fixture.ts'

// QA-01: a família sem bebê em toda rota da Rotina: a rota mantém o próprio h1, mostra a frase e leva ao
// cadastro do bebê na tela Família (a conta de Juliana é responsável; a de Davi pode ser só observador).

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
})

describe('ROT-01: troca da conta autenticada na Rotina', () => {
  it('troca de Juliana para Davi na mesma rota limpa a vista antiga antes de oferecer Começar', async () => {
    const { conta, rotina, roteador } = await renderizarRotaPronta('/app/hoje')
    const vistaDeJuliana = screen.getByRole('main')
    expect(screen.getByRole('region', { name: 'Hoje até agora' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Iniciar sono de Heloísa' })).toBeTruthy()

    const lerContexto = rotina.contexto
    let liberarLeitura!: () => void
    const espera = new Promise<void>((resolve) => {
      liberarLeitura = resolve
    })
    const leitura = vi.spyOn(rotina, 'contexto').mockImplementation(async () => {
      await espera
      return lerContexto()
    })

    await act(async () => {
      const entrada = await conta.entrar(PESSOAS.davi.email, SENHA_DEMONSTRACAO)
      expect(entrada.ok && entrada.valor.id).toBe(PESSOAS.davi.id)
    })

    expect(roteador.state.location.pathname).toBe('/app/hoje')
    expect.soft(vistaDeJuliana.isConnected, 'a vista de Juliana sai assim que a conta resolvida muda').toBe(false)
    expect.soft(screen.getByRole('main').getAttribute('data-tela')).toBe('rotina-carregando')
    expect.soft(screen.queryByRole('button', { name: 'Iniciar sono de Heloísa' })).toBeNull()
    expect.soft(leitura).toHaveBeenCalledTimes(1)

    // No código antigo, a releitura ao voltar à aba também expõe o falso aviso de acesso perdido.
    fireEvent(document, new Event('visibilitychange'))
    liberarLeitura()
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/hoje')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
    expect.soft(screen.queryByText('Você não tem mais acesso a este bebê.')).toBeNull()
    expect.soft(screen.queryByText('Você ainda não faz parte de uma família.')).not.toBeNull()
    expect.soft(screen.queryByRole('link', { name: 'Começar' })?.getAttribute('href')).toBe('/app/comecar')
    expect(screen.queryByRole('button', { name: 'Iniciar sono de Heloísa' })).toBeNull()
  })

  it('sair e entrar explicitamente como Davi também oferece Começar ao voltar à Rotina', async () => {
    const { conta, roteador } = await renderizarRotaPronta('/app/hoje')
    expect(screen.getByRole('button', { name: 'Iniciar sono de Heloísa' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    await aguardarCarga()
    expect(roteador.state.location.pathname).toBe('/entrar')
    expect(screen.queryByRole('button', { name: 'Iniciar sono de Heloísa' })).toBeNull()

    await act(async () => {
      const entrada = await conta.entrar(PESSOAS.davi.email, SENHA_DEMONSTRACAO)
      expect(entrada.ok && entrada.valor.id).toBe(PESSOAS.davi.id)
    })
    await aguardarCarga()
    await act(async () => {
      await roteador.navigate('/app/hoje')
    })
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/hoje')
    expect(screen.getByRole('link', { name: 'Começar' }).getAttribute('href')).toBe('/app/comecar')
    expect(screen.queryByText('Você não tem mais acesso a este bebê.')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Iniciar sono de Heloísa' })).toBeNull()
  })
})

const ROTAS: Array<[string, string]> = [
  ['/app/hoje', 'Hoje'],
  ['/app/historico', 'Histórico'],
  ['/app/sessao', 'Sessão'],
  ['/app/lixeira', 'Lixeira'],
  ['/app/notas', 'Notas'],
  ['/app/registro/novo', 'Novo registro'],
]

describe('QA-01: família sem bebê em cada rota da Rotina', () => {
  it.each(ROTAS)('%s: h1 "%s", a frase e o botão "Cadastrar o bebê" para a tela Família', async (caminho, titulo) => {
    await renderizarRotaPronta(caminho, { semBebes: true })

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('main').getAttribute('data-tela')).toBe('rotina-sem-bebe')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(titulo)
    expect(screen.getByText('Esta família ainda não tem bebê cadastrado.')).toBeTruthy()
    const botao = screen.getByRole('link', { name: 'Cadastrar o bebê' })
    expect(botao.getAttribute('href')).toBe(`/app/familia?familia=${ID_FAMILIA}`)
    expect(screen.queryByRole('link', { name: 'Começar' })).toBeNull()
  })

  it.each(ROTAS)('%s: observador vê a frase e o h1, sem o botão', async (caminho, titulo) => {
    await renderizarRotaPronta(caminho, { semBebes: true, sessao: 'davi', papelDeDavi: 'observador' })

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(titulo)
    expect(screen.getByText('Esta família ainda não tem bebê cadastrado.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Cadastrar o bebê' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cadastrar o bebê' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Começar' })).toBeNull()
  })

  it('sem família: mantém o texto e oferece um único Começar para continuar no setup existente', async () => {
    const { roteador } = await renderizarRotaPronta('/app/historico', { sessao: 'davi' })

    expect(roteador.state.location.pathname).toBe('/app/historico')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Histórico')
    expect(screen.getByRole('main').getAttribute('data-tela')).toBe('rotina-sem-bebe')
    expect(screen.getByRole('region', { name: 'Aviso de demonstração' })).toBeTruthy()
    expect(screen.getByText('Você ainda não faz parte de uma família.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Cadastrar o bebê' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cadastrar o bebê' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Começar' })).toBeNull()
    const links = screen.getAllByRole('link', { name: 'Começar' })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('/app/comecar')
    links[0].focus()
    expect(document.activeElement).toBe(links[0])
    fireEvent.click(links[0])
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/comecar')
    expect(screen.getByRole('heading', { level: 2, name: 'Como você quer começar?' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Criar uma família' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Tenho um convite' }).getAttribute('href')).toBe('/convite')
  })

  it.each(ROTAS)('%s: cuidador vê a frase e o h1, sem ações de cadastro ou primeiro uso', async (caminho, titulo) => {
    await renderizarRotaPronta(caminho, { semBebes: true, sessao: 'icaro' })

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(titulo)
    expect(screen.getByText('Esta família ainda não tem bebê cadastrado.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Cadastrar o bebê' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cadastrar o bebê' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Começar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Começar' })).toBeNull()
  })

  it.each(['saída', 'revogação'] as const)('acesso perdido por %s: mantém o aviso sem ações de cadastro ou primeiro uso', async (motivo) => {
    const mundo = await renderizarRotaPronta('/app/hoje', { sessao: 'icaro' })
    if (motivo === 'saída') {
      expect((await mundo.conta.sairDaFamilia(ID_FAMILIA)).ok).toBe(true)
    } else {
      const detalhe = await mundo.conta.detalheFamilia(ID_FAMILIA)
      if (!detalhe.ok) throw new Error('Não foi possível ler a família fictícia.')
      const vinculo = detalhe.valor.membros.find((membro) => membro.contaId === PESSOAS.icaro.id)!
      mundo.conta.sessaoParaTeste(PESSOAS.juliana.email)
      expect((await mundo.conta.revogarVinculo(vinculo.vinculoId)).ok).toBe(true)
      mundo.conta.sessaoParaTeste(PESSOAS.icaro.email)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    await aguardarCarga()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
    expect(screen.getByText('Você não tem mais acesso a este bebê.')).toBeTruthy()
    expect(screen.queryByText('Você ainda não faz parte de uma família.')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Começar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Começar' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Cadastrar o bebê' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cadastrar o bebê' })).toBeNull()
    expect(mundo.roteador.state.location.pathname).toBe('/app/hoje')
  })
})
