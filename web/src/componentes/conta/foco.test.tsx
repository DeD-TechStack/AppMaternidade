import { describe, expect, it } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderizarComDados } from '../../teste/renderizarComDados.tsx'

// RN-03, o foco ao trocar de tela: a exceção é só a primeira carga da página (o foco inicial é do
// navegador). Toda navegação interna, inclusive Voltar e Avançar do histórico, leva a rolagem ao
// topo e o foco ao `h1` da tela. A exceção de `#exportar` continua. Cada teste monta um roteador
// novo: nada pode vazar de um teste para o outro.

const titulo = (nome: string) => screen.findByRole('heading', { level: 1, name: nome })

/** Quem tem o foco, em texto curto ("H1:Entrar"): a falha de um teste diz onde o foco estava. */
const focado = () => `${document.activeElement?.tagName}:${document.activeElement?.textContent?.slice(0, 40)}`

async function irPara(roteador: ReturnType<typeof renderizarComDados>['roteador'], destino: number | string) {
  await act(async () => {
    // Um número anda no histórico (-1 é Voltar, 1 é Avançar); um texto é um caminho novo.
    if (typeof destino === 'number') await roteador.navigate(destino)
    else await roteador.navigate(destino)
  })
}

describe('a primeira carga da página', () => {
  it('não força o foco nem a rolagem', async () => {
    const { rolarAoTopo } = renderizarComDados('/entrar')
    await titulo('Entrar')

    expect(focado()).not.toBe('H1:Entrar')
    expect(rolarAoTopo).not.toHaveBeenCalled()
  })

  it('vale de novo em cada montagem nova: o estado de um roteador não vaza para o seguinte', async () => {
    const primeira = renderizarComDados('/entrar')
    await titulo('Entrar')
    fireEvent.click(screen.getByRole('link', { name: 'Criar conta' }))
    await titulo('Criar conta')
    primeira.unmount()

    const { rolarAoTopo } = renderizarComDados('/entrar')
    await titulo('Entrar')
    expect(focado()).not.toBe('H1:Entrar')
    expect(rolarAoTopo).not.toHaveBeenCalled()
  })
})

describe('Voltar e Avançar do histórico', () => {
  it('Entrar → Criar conta → Voltar: o h1 de Entrar recebe o foco e a rolagem vai ao topo', async () => {
    const { roteador, rolarAoTopo } = renderizarComDados('/entrar')
    await titulo('Entrar')
    fireEvent.click(screen.getByRole('link', { name: 'Criar conta' }))
    await titulo('Criar conta')
    await waitFor(() => expect(focado()).toBe('H1:Criar conta'))
    rolarAoTopo.mockClear()

    await irPara(roteador, -1)

    await titulo('Entrar')
    await waitFor(() => expect(focado()).toBe('H1:Entrar'))
    expect(rolarAoTopo).toHaveBeenCalledWith(0, 0)
  })

  it('Voltar e depois Avançar: o h1 de cada tela recebe o foco, e a rolagem vai ao topo nas duas', async () => {
    const { roteador, rolarAoTopo } = renderizarComDados('/entrar')
    await titulo('Entrar')
    fireEvent.click(screen.getByRole('link', { name: 'Criar conta' }))
    await titulo('Criar conta')

    await irPara(roteador, -1)
    await waitFor(() => expect(focado()).toBe('H1:Entrar'))
    rolarAoTopo.mockClear()

    await irPara(roteador, 1)
    await titulo('Criar conta')
    await waitFor(() => expect(focado()).toBe('H1:Criar conta'))
    expect(rolarAoTopo).toHaveBeenCalledWith(0, 0)
  })

  it('várias telas: Entrar → Criar conta → Recuperar acesso, e Voltar duas vezes até a primeira', async () => {
    const { roteador, rolarAoTopo } = renderizarComDados('/entrar')
    await titulo('Entrar')
    fireEvent.click(screen.getByRole('link', { name: 'Criar conta' }))
    await titulo('Criar conta')
    await irPara(roteador, '/recuperar-acesso')
    await titulo('Recuperar acesso')

    await irPara(roteador, -1)
    await titulo('Criar conta')
    await waitFor(() => expect(focado()).toBe('H1:Criar conta'))

    rolarAoTopo.mockClear()
    await irPara(roteador, -1)
    await titulo('Entrar')
    await waitFor(() => expect(focado()).toBe('H1:Entrar'))
    expect(rolarAoTopo).toHaveBeenCalledWith(0, 0)
  })

  it('vale também numa segunda tela: Conta → protótipo do Hoje → Voltar leva o foco ao h1 da Conta', async () => {
    const { roteador, rolarAoTopo } = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    expect(focado()).not.toBe('H1:Conta')

    fireEvent.click(screen.getByRole('link', { name: 'Ver o protótipo do Hoje' }))
    await titulo('Hoje')
    rolarAoTopo.mockClear()

    await irPara(roteador, -1)

    await titulo('Conta')
    await waitFor(() => expect(focado()).toBe('H1:Conta'))
    expect(rolarAoTopo).toHaveBeenCalledWith(0, 0)
  })
})

describe('a exceção de #exportar', () => {
  it('ir a /app/conta#exportar foca o título da seção, não o h1, e não rola ao topo', async () => {
    const { roteador, rolarAoTopo } = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    rolarAoTopo.mockClear()

    await irPara(roteador, '/app/conta#exportar')

    await screen.findByRole('heading', { level: 2, name: 'Seus dados' })
    await waitFor(() => expect(focado()).toBe('H2:Seus dados'))
    expect(rolarAoTopo).not.toHaveBeenCalled()
  })

  it('Voltar para a Conta sem o #exportar foca o h1; Avançar para o #exportar volta à exceção', async () => {
    const { roteador, rolarAoTopo } = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo('Conta')
    await irPara(roteador, '/app/conta#exportar')
    await waitFor(() => expect(focado()).toBe('H2:Seus dados'))

    rolarAoTopo.mockClear()
    await irPara(roteador, -1)
    await waitFor(() => expect(focado()).toBe('H1:Conta'))
    expect(rolarAoTopo).toHaveBeenCalledWith(0, 0)

    rolarAoTopo.mockClear()
    await irPara(roteador, 1)
    await waitFor(() => expect(focado()).toBe('H2:Seus dados'))
    expect(rolarAoTopo).not.toHaveBeenCalled()
  })
})
