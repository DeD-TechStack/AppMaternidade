import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { FAMILIAS_DEMONSTRACAO } from '../dados/conta.demonstracao.ts'
import { simularFalhaRotina } from '../dados/rotina.memoria.ts'
import { relogioDoTeste } from '../teste/relogio.ts'
import { PESSOAS } from '../teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRotaPronta } from '../teste/renderizarRota.tsx'
import { ID_BEBE, ID_FAMILIA, comSessaoEmAndamento } from '../teste/rotina.fixture.ts'

// O provedor da área da rotina (MAT-38a): a escolha do bebê ativo (R38-03), o seletor, os estados de tela
// (R38-11), a atualização (R38-12) e as respostas atrasadas (R38-02). O relógio é o falso, às 10:00 de
// 5/11/2026 (hora do aparelho).

const INSTANTE = new Date('2026-11-05T10:00:00')
const ZELIA = 'c2222222-2222-4222-8222-222222222222'
const ARTHUR = 'c3333333-3333-4333-8333-333333333333'
const MIN = 60_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const zelia = { id: ZELIA, nome: 'Zélia', nascimento: '2026-10-05', estado: 'ativo' as const }
const linhaDoBebe = () => document.querySelector('[data-titulo-tela] h1')!.nextElementSibling!.textContent
const botao = (nome: string) => screen.getByRole('button', { name: nome })

describe('R38-03: o bebê ativo ao abrir a área', () => {
  it('o primeiro bebê ativo, na ordem do nome (pt-BR, sem diferença de maiúscula)', async () => {
    await renderizarRotaPronta('/app/hoje', { bebesExtras: [{ ...zelia, nome: 'abel', nascimento: '2026-09-05' }, { ...zelia, id: ARTHUR, nome: 'Zélia' }] })

    expect(linhaDoBebe()).toBe('abel, 2 meses')
  })

  it('os arquivados ficam para depois: com Heloísa arquivada, o ativo é a Zélia', async () => {
    await renderizarRotaPronta('/app/hoje', {
      bebesExtras: [zelia],
      ajustarRotina: (f) => f,
    })
    expect(linhaDoBebe()).toBe('Heloísa, 3 meses')
  })

  it('sem bebê ativo em nenhuma família, mas com um arquivado: o arquivado, só para leitura', async () => {
    await renderizarRotaPronta('/app/hoje', { bebeArquivado: true })

    expect(linhaDoBebe()).toBe('Heloísa, 3 meses')
    expect(screen.getByText('Este bebê está arquivado. Os registros ficam só para leitura.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Iniciar sono de Heloísa' })).toBeNull()
  })

  it('com família, mas sem bebê: "Esta família ainda não tem bebê cadastrado."', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { semBebes: true })

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
    expect(screen.getByText('Esta família ainda não tem bebê cadastrado.')).toBeTruthy()
    expect(container.querySelector('[data-barra-registrar]')).toBeNull()
  })

  it('sem família: "Você ainda não faz parte de uma família."', async () => {
    await renderizarRotaPronta('/app/hoje', { sessao: 'davi' })

    expect(screen.getByText('Você ainda não faz parte de uma família.')).toBeTruthy()
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('abrir por link uma sessão de outro bebê visível troca o bebê ativo para o dele, nas duas telas', async () => {
    const { fixture } = await renderizarRotaPronta('/app/hoje', {
      bebesExtras: [zelia],
      ajustarRotina: (f) => {
        const modelo = f.registros.find((r) => r.tipo === 'sono' && r.fim === null)!
        return { ...f, registros: [...f.registros, { ...modelo, id: 'd0000000-0000-7000-8000-000000009001', bebeId: ZELIA }] }
      },
    })
    expect(linhaDoBebe()).toBe('Heloísa, 3 meses')

    fireEvent.click(screen.getByRole('link', { name: 'Ver sessão' }))
    await aguardarCarga()
    expect(fixture.registros.length).toBeGreaterThan(0)
  })
})

describe('R38-03: o seletor de bebê', () => {
  const dois = { bebesExtras: [zelia] }

  it('com mais de um bebê, o texto vira um botão que abre uma lista de escolha de um toque; Esc fecha e o foco volta ao botão', async () => {
    await renderizarRotaPronta('/app/hoje', dois)
    const gatilho = botao('Heloísa, 3 meses')
    expect(gatilho.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(gatilho)
    const lista = screen.getByRole('group', { name: 'Escolher bebê' })
    expect(within(lista).getAllByRole('button').map((b) => b.textContent)).toEqual(['Heloísa, 3 meses', 'Zélia, 1 mês'])
    expect(gatilho.getAttribute('aria-expanded')).toBe('true')

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Escolher bebê' })).toBeNull()
    expect(document.activeElement).toBe(gatilho)
  })

  it('escolher fecha a lista, troca o bebê em todas as telas e leva o foco ao h1', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje', dois)
    fireEvent.click(botao('Heloísa, 3 meses'))

    fireEvent.click(within(screen.getByRole('group', { name: 'Escolher bebê' })).getByRole('button', { name: 'Zélia, 1 mês' }))
    await aguardarCarga()

    expect(screen.queryByRole('group', { name: 'Escolher bebê' })).toBeNull()
    expect(botao('Zélia, 1 mês')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
    // Os botões rápidos e as seções são da Zélia: ela não tem sessão em andamento.
    expect(screen.getByRole('button', { name: 'Iniciar sono de Zélia' })).toBeTruthy()
    expect(screen.getByText('Nenhuma sessão em andamento.')).toBeTruthy()
    await act(async () => {
      await roteador.navigate('/app/sessao')
    })
    await aguardarCarga()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Nenhuma sessão em andamento')
  })

  it('os arquivados ficam num grupo "Arquivados", depois dos ativos', async () => {
    await renderizarRotaPronta('/app/hoje', { bebesExtras: [{ ...zelia, estado: 'arquivado' }] })

    fireEvent.click(botao('Heloísa, 3 meses'))

    const lista = screen.getByRole('group', { name: 'Escolher bebê' })
    expect(lista.textContent).toContain('Arquivados')
    expect(within(lista).getAllByRole('button').map((b) => b.textContent)).toEqual(['Heloísa, 3 meses', 'Zélia, 1 mês'])
    expect(within(lista).getByText('Arquivados').compareDocumentPosition(within(lista).getByRole('button', { name: 'Zélia, 1 mês' })) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })

  it('com a conta em mais de uma família, cada item traz o nome da família', async () => {
    await renderizarRotaPronta('/app/hoje', {
      papelNaFamiliaTeste: 'responsavel',
      bebesExtras: [{ ...zelia, familiaId: FAMILIAS_DEMONSTRACAO.teste }],
    })

    fireEvent.click(botao('Heloísa, 3 meses'))

    const nomes = within(screen.getByRole('group', { name: 'Escolher bebê' })).getAllByRole('button').map((b) => b.textContent)
    expect(nomes).toEqual(['Heloísa, 3 meses · Família Exemplo', 'Zélia, 1 mês · Família Teste'])
  })

  it('a releitura (Atualizar) nunca fecha a lista aberta', async () => {
    await renderizarRotaPronta('/app/hoje', dois)
    fireEvent.click(botao('Heloísa, 3 meses'))

    fireEvent.click(botao('Atualizar'))
    await aguardarCarga()

    expect(screen.getByRole('group', { name: 'Escolher bebê' })).toBeTruthy()
  })
})

describe('R38-12: a atualização', () => {
  it('as telas releem ao abrir, ao voltar à aba e pelo botão Atualizar, e não há leitura periódica', async () => {
    const { rotina } = await renderizarRotaPronta('/app/hoje')
    const leitura = vi.spyOn(rotina, 'emAndamento')

    fireEvent.click(botao('Atualizar'))
    await aguardarCarga()
    expect(leitura).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await aguardarCarga()
    expect(leitura).toHaveBeenCalledTimes(2)

    await act(async () => {
      vi.advanceTimersByTime(30 * MIN)
    })
    await aguardarCarga()
    expect(leitura).toHaveBeenCalledTimes(2)
  })

  it('"Atualizado às HH:MM" mostra a hora da última leitura completa', async () => {
    const mudarRelogio = relogioDoTeste()
    await renderizarRotaPronta('/app/hoje')
    expect(screen.getByText('Atualizado às 10:00')).toBeTruthy()

    mudarRelogio(new Date('2026-11-05T10:07:00'))
    fireEvent.click(botao('Atualizar'))
    await aguardarCarga()

    expect(screen.getByText('Atualizado às 10:07')).toBeTruthy()
  })

  it('uma releitura nunca mexe num painel aberto (Fralda, + Mais)', async () => {
    await renderizarRotaPronta('/app/hoje')
    fireEvent.click(botao('Registrar fralda de Heloísa'))

    fireEvent.click(botao('Atualizar'))
    await aguardarCarga()

    expect(screen.getByRole('group', { name: 'Fralda de Heloísa' })).toBeTruthy()
  })

  it('uma resposta que chega depois de trocar de bebê é descartada', async () => {
    const { rotina } = await renderizarRotaPronta('/app/hoje', { bebesExtras: [zelia] })
    const original = rotina.emAndamento.bind(rotina)
    let chegarTarde: () => void = () => undefined
    vi.spyOn(rotina, 'emAndamento').mockImplementation((bebe) =>
      bebe === ID_BEBE
        ? new Promise((resolver) => (chegarTarde = () => resolver(original(bebe))))
        : original(bebe),
    )

    fireEvent.click(botao('Atualizar'))
    await aguardarCarga()
    fireEvent.click(botao('Heloísa, 3 meses'))
    fireEvent.click(within(screen.getByRole('group', { name: 'Escolher bebê' })).getByRole('button', { name: 'Zélia, 1 mês' }))
    await aguardarCarga()
    expect(screen.getByText('Nenhuma sessão em andamento.')).toBeTruthy()

    chegarTarde()
    await aguardarCarga()

    expect(screen.getByText('Nenhuma sessão em andamento.')).toBeTruthy()
    expect(screen.queryByText('por Bruno')).toBeNull()
  })
})

describe('R38-11: os estados de tela', () => {
  it('erro de rede numa leitura: a frase com "Tentar de novo" só na seção que falhou; as outras aparecem', async () => {
    const { rotina } = await renderizarRotaPronta('/app/hoje', { ajustarRotina: comSessaoEmAndamento('sono') })
    simularFalhaRotina(rotina, 'ultimosConcluidos', 'rede')
    fireEvent.click(botao('Atualizar'))
    await aguardarCarga()

    // Já havia dados: eles continuam, com a frase acima da seção.
    expect(screen.getAllByText('Não foi possível falar com o servidor. Verifique a conexão.')).toHaveLength(1)
    expect(screen.getByRole('timer')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Hoje até agora' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()
    expect(screen.queryByText('Não foi possível falar com o servidor. Verifique a conexão.')).toBeNull()
  })

  it('erro numa primeira leitura sem dados: a seção mostra a frase e "Tentar de novo", e a Sessão do banco falha sem derrubar o Hoje', async () => {
    const primeira = await renderizarRotaPronta('/app/hoje')
    primeira.unmount()
    simularFalhaRotina(primeira.rotina, 'notas', 'rede')

    await renderizarRotaPronta('/app/hoje', { mundo: primeira })

    const notas = screen.getByText('Não foi possível falar com o servidor. Verifique a conexão.').closest('section')!
    expect(within(notas).getByRole('heading', { name: 'Para você saber' })).toBeTruthy()
    expect(within(notas).getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
    expect(screen.getByRole('timer')).toBeTruthy()
  })

  it('erro do contexto: a tela de erro com "Tentar de novo"', async () => {
    const primeira = await renderizarRotaPronta('/app/hoje')
    primeira.unmount()
    simularFalhaRotina(primeira.rotina, 'contexto', 'rede')

    await renderizarRotaPronta('/app/hoje', { mundo: primeira })
    expect(screen.getByText('Não foi possível falar com o servidor. Verifique a conexão.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
  })

  it('acesso perdido: depois de sair da família, ao atualizar, "Você não tem mais acesso a este bebê."', async () => {
    const mundo = await renderizarRotaPronta('/app/hoje', { sessao: 'bruno' })

    await mundo.conta.sairDaFamilia(ID_FAMILIA)
    fireEvent.click(botao('Atualizar'))
    await aguardarCarga()

    expect(screen.getByText('Você não tem mais acesso a este bebê.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Iniciar sono de Heloísa' })).toBeNull()
  })

  it('a sessão de login que termina leva a /entrar?volta=<rota atual>', async () => {
    const { conta, roteador } = await renderizarRotaPronta('/app/hoje')

    act(() => {
      conta.encerrarSessaoPorFora()
    })
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/entrar')
    expect(roteador.state.location.search).toBe(`?volta=${encodeURIComponent('/app/hoje')}`)
  })

  it('uma operação da rotina com sessao_encerrada (token vencido) também leva a /entrar', async () => {
    const { rotina, conta, roteador } = await renderizarRotaPronta('/app/hoje')
    conta.sessaoParaTeste(null)
    simularFalhaRotina(rotina, 'emAndamento', 'sessao_encerrada')

    fireEvent.click(botao('Atualizar'))
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/entrar')
  })

  it('nenhuma tela da rotina usa o armazenamento do navegador nem registra service worker', async () => {
    await renderizarRotaPronta('/app/hoje', { bebesExtras: [zelia] })
    fireEvent.click(botao('Heloísa, 3 meses'))
    fireEvent.click(botao('Zélia, 1 mês'))
    fireEvent.click(botao('Modo madrugada'))
    await aguardarCarga()

    const chaves = [...Array(window.localStorage.length).keys()].map((i) => window.localStorage.key(i))
    expect(chaves.filter((chave) => !/^appmaternidade:/.test(chave ?? ''))).toEqual([])
    expect(window.sessionStorage.length).toBe(0)
    expect('serviceWorker' in navigator ? await navigator.serviceWorker.getRegistrations() : []).toEqual([])
    expect(PESSOAS.juliana.id).toBeTruthy()
  })
})
