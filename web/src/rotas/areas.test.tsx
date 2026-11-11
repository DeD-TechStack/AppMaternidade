import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import type { RouteObject } from 'react-router'
import { NOMES_DO_H1, TITULOS, tituloDaAba } from '../conteudo/conta.ts'
import { criarDadosContaMemoria } from '../dados/conta.memoria.ts'
import { criarRotas } from '../rotas.tsx'
import { criarFixtureDeTeste, renderizarComDados } from '../teste/renderizarComDados.tsx'
import { rotasComunidadeLogadas, rotasComunidadePublicas } from './comunidade.tsx'
import { rotasContaLogadas, rotasContaPublicas } from './conta.tsx'
import { rotasDasAreas } from './areas.tsx'
import { rotasDesenvolvimentoLogadas, rotasDesenvolvimentoPublicas } from './desenvolvimento.tsx'
import { rotasModeracaoLogadas, rotasModeracaoPublicas } from './moderacao.tsx'
import { rotasRotinaLogadas, rotasRotinaPublicas } from './rotina.tsx'

// RF-06 e RF-07: o registro de rotas por área, as rotas desta tarefa e a ligação em rotas.tsx.

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  document.title = 'Título de antes'
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const caminhoDe = (rota: RouteObject) => rota.path

describe('rotasDasAreas: o registro por área', () => {
  it('é uma única rota sem caminho (o provedor de sessão) com todas as públicas e uma guarda', () => {
    expect(rotasDasAreas).toHaveLength(1)
    const [raiz] = rotasDasAreas
    expect(raiz.path).toBeUndefined()
    expect(raiz.element).toBeTruthy()

    const filhos = raiz.children!
    const publicas = [
      ...rotasContaPublicas,
      ...rotasRotinaPublicas,
      ...rotasDesenvolvimentoPublicas,
      ...rotasComunidadePublicas,
      ...rotasModeracaoPublicas,
    ]
    expect(filhos.slice(0, publicas.length)).toEqual(publicas)

    const guarda = filhos.slice(publicas.length)
    expect(guarda).toHaveLength(1)
    expect(guarda[0].path).toBeUndefined()
    expect(guarda[0].children).toEqual([
      ...rotasContaLogadas,
      ...rotasRotinaLogadas,
      ...rotasDesenvolvimentoLogadas,
      ...rotasComunidadeLogadas,
      ...rotasModeracaoLogadas,
    ])
  })

  it('as cinco áreas exportam as duas listas; só a de conta e as logadas da rotina têm rotas', () => {
    for (const lista of [
      rotasRotinaPublicas,
      rotasDesenvolvimentoPublicas,
      rotasDesenvolvimentoLogadas,
      rotasComunidadePublicas,
      rotasComunidadeLogadas,
      rotasModeracaoPublicas,
      rotasModeracaoLogadas,
    ]) {
      expect(lista).toEqual([])
    }
    expect(rotasContaPublicas.map(caminhoDe)).toEqual(['entrar', 'criar-conta', 'recuperar-acesso', 'redefinir-senha', 'conta-excluida'])
    expect(rotasContaLogadas.map(caminhoDe)).toEqual(['app/comecar', 'app/conta'])

    // A rotina: uma rota sem caminho (o provedor da área), pai das quatro telas do 38a.
    expect(rotasRotinaLogadas).toHaveLength(1)
    expect(rotasRotinaLogadas[0].path).toBeUndefined()
    expect(rotasRotinaLogadas[0].element).toBeTruthy()
    expect(rotasRotinaLogadas[0].children!.map(caminhoDe)).toEqual([
      'app/hoje',
      'app/sessao',
      'app/registro/novo',
      'app/registro/:id/editar',
    ])
  })

  it('cada rota tem o título da aba fixo, "<h1> | AppMaternidade"', () => {
    const titulos = [...rotasContaPublicas, ...rotasContaLogadas].map((rota) => (rota.handle as { titulo: string }).titulo)
    expect(titulos).toEqual([
      'Entrar | AppMaternidade',
      'Criar conta | AppMaternidade',
      'Recuperar acesso | AppMaternidade',
      'Nova senha | AppMaternidade',
      'Conta excluída | AppMaternidade',
      'Começar | AppMaternidade',
      'Conta | AppMaternidade',
    ])
    expect(tituloDaAba(TITULOS.conta)).toBe('Conta | AppMaternidade')
  })

  it('em rotas.tsx, entra como filho direto do Layout, depois das rotas do site e antes da rota *', () => {
    const [layout] = criarRotas()
    const filhos = layout.children!
    const indiceDasAreas = filhos.indexOf(rotasDasAreas[0])

    // A base nova tem as páginas públicas e o /sistema antes das áreas: a ordem fixa que importa é que as
    // áreas venham logo antes da rota `*`. O Hoje e a Sessão saíram daqui: moram em `rotasRotinaLogadas`.
    expect(filhos[0].index).toBe(true)
    expect(filhos.filter((rota) => rota.element === rotasDasAreas[0].element)).toHaveLength(1)
    expect(indiceDasAreas).toBe(filhos.length - 2)
    expect(caminhoDe(filhos[indiceDasAreas])).toBeUndefined()
    expect(filhos[filhos.length - 1].path).toBe('*')
    expect(filhos.map(caminhoDe)).not.toEqual(expect.arrayContaining(['app/hoje']))
    expect(filhos.map(caminhoDe)).not.toEqual(expect.arrayContaining(['app/sessao']))
  })
})

describe('o Hoje e a Sessão ficam sob a guarda e sob o provedor da área (R38-30)', () => {
  it('/app/hoje, /app/sessao e os formulários, sem sessão de login, vão a /entrar?volta=<caminho>', async () => {
    for (const caminho of ['/app/hoje', '/app/sessao', '/app/registro/novo']) {
      const { roteador, unmount } = renderizarComDados(caminho)
      await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
      expect(roteador.state.location.pathname, caminho).toBe('/entrar')
      expect(roteador.state.location.search, caminho).toBe(`?volta=${encodeURIComponent(caminho)}`)
      unmount()
    }
  })

  it('com sessão, abrem com o título da aba fixo de cada rota', async () => {
    for (const [caminho, titulo, h1] of [
      ['/app/hoje', 'Hoje | AppMaternidade', /^Hoje$/],
      ['/app/sessao', 'Sessão | AppMaternidade', /^Sono de /],
      ['/app/registro/novo', 'Novo registro | AppMaternidade', /^Novo registro$/],
    ] as const) {
      const { roteador, unmount } = renderizarComDados(caminho, { sessao: 'juliana' })
      expect((await screen.findByRole('heading', { level: 1 })).textContent).toMatch(h1)
      expect(roteador.state.location.pathname).toBe(caminho)
      expect(document.title).toBe(titulo)
      unmount()
    }
  })

  it('/app/inexistente cai na Página não encontrada, com ou sem sessão', async () => {
    for (const sessao of [null, 'juliana'] as const) {
      const { unmount } = renderizarComDados('/app/inexistente', { sessao })
      expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Página não encontrada')
      unmount()
    }
  })

  it('ir a /app/hoje e voltar não perde a sessão nem a conta', async () => {
    const { roteador, dados } = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    expect(screen.getByText('Juliana · juliana@exemplo.invalid')).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: 'Ir para o Hoje' }))
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Hoje')
    expect(document.title).toBe('Hoje | AppMaternidade')

    await act(async () => {
      await roteador.navigate('/app/conta')
    })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    expect(roteador.state.location.pathname).toBe('/app/conta')
    expect(screen.getByText('Juliana · juliana@exemplo.invalid')).toBeTruthy()
    expect((await dados.sessaoAtual()).ok).toBe(true)
  })
})

describe('as rotas logadas só abrem com sessão; as públicas, sempre', () => {
  it('cada rota logada sem sessão vai a /entrar?volta=<caminho>', async () => {
    for (const caminho of ['/app/conta', '/app/comecar']) {
      const { roteador, unmount } = renderizarComDados(caminho)
      await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
      expect(roteador.state.location.pathname).toBe('/entrar')
      expect(roteador.state.location.search).toBe(`?volta=${encodeURIComponent(caminho)}`)
      unmount()
    }
  })

  it('cada rota tem um único main e um único h1, com o texto fixo e o título da aba', async () => {
    // [caminho, título da aba, texto do h1, sessão]: nas telas de acesso o h1 é a manchete de duas linhas.
    const casos: Array<[string, string, string, 'juliana' | null]> = [
      ['/entrar', TITULOS.entrar, NOMES_DO_H1.entrar, null],
      ['/criar-conta', TITULOS.criarConta, NOMES_DO_H1.criarConta, null],
      ['/recuperar-acesso', TITULOS.recuperarAcesso, NOMES_DO_H1.recuperarAcesso, null],
      ['/redefinir-senha', TITULOS.redefinirSenha, NOMES_DO_H1.redefinirSenha, null],
      ['/conta-excluida', TITULOS.contaExcluida, NOMES_DO_H1.contaExcluida, null],
      ['/app/conta', TITULOS.conta, 'Conta', 'juliana'],
    ]
    for (const [caminho, titulo, h1, sessao] of casos) {
      const { unmount, container } = renderizarComDados(caminho, { sessao })
      // Sem a marca de recuperação, /redefinir-senha mostra o link vencido, mas o h1 é o da rota.
      expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(h1)
      expect(document.title).toBe(tituloDaAba(titulo))
      expect(container.querySelectorAll('main')).toHaveLength(1)
      expect(container.querySelectorAll('h1')).toHaveLength(1)
      unmount()
    }
  })

  it('o passo "Seu nome" de /app/comecar tem o h1 e o título da aba fixos', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'x')
    const { container, roteador } = renderizarComDados('/app/comecar', { dados })

    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(NOMES_DO_H1.comecar)
    expect(roteador.state.location.pathname).toBe('/app/comecar')
    expect(document.title).toBe('Começar | AppMaternidade')
    expect(container.querySelectorAll('main')).toHaveLength(1)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
  })
})
