import { act, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aguardarCarga, renderizarRota } from './renderizarRota.tsx'

// ANCHOR-1: numa carga a frio de /como-funciona#<id> a rota é preguiçosa e o id ainda não existe quando o
// navegador tenta rolar. A casca rola quando o elemento aparece (useRolarParaAncora). O jsdom não tem
// `scrollIntoView`: um espião ocupa o lugar dele.

// Um id que existe de verdade nessa página (BandaHistorico) e outro, também real, para o salto na mesma página.
const ID_ALVO = 'cf-historico'
const ID_OUTRO = 'cf-depois'

let rolar: ReturnType<typeof vi.fn>

/** Dá tempo a alguns quadros de animação para qualquer tentativa agendada acontecer. */
async function esperarQuadros(ms = 150) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}

beforeEach(() => {
  rolar = vi.fn()
  Object.defineProperty(Element.prototype, 'scrollIntoView', { value: rolar, configurable: true, writable: true })
})

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  vi.unstubAllGlobals()
})

describe('rolar para a âncora depois que a rota preguiçosa renderiza', () => {
  it('na carga a frio, rola uma vez até o elemento do hash, com behavior "auto", e leva o foco a ele', async () => {
    renderizarRota(`/como-funciona#${ID_ALVO}`, { sessao: null })
    await aguardarCarga()
    const alvo = await waitFor(() => {
      const el = document.getElementById(ID_ALVO)
      expect(el).not.toBeNull()
      expect(rolar).toHaveBeenCalled()
      return el!
    })
    await esperarQuadros()

    expect(rolar).toHaveBeenCalledTimes(1)
    expect(rolar.mock.contexts[0]).toBe(alvo)
    expect(rolar).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' })
    expect(alvo.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(alvo)
  })

  it('se a página se acomoda e empurra o alvo depois da rolagem, rola de novo (seco) até ele voltar ao lugar', async () => {
    renderizarRota(`/como-funciona#${ID_ALVO}`, { sessao: null })
    await aguardarCarga()
    await waitFor(() => expect(rolar).toHaveBeenCalledTimes(1))
    const alvo = document.getElementById(ID_ALVO)!
    // A primeira rolagem deixou o alvo em top 0 (jsdom); agora ele "derrapa" 9 px.
    vi.spyOn(alvo, 'getBoundingClientRect').mockReturnValue({ top: 9 } as DOMRect)

    await waitFor(() => expect(rolar.mock.calls.length).toBeGreaterThanOrEqual(2))
    expect(rolar.mock.contexts[1]).toBe(alvo)
    expect(rolar).toHaveBeenLastCalledWith({ block: 'start', behavior: 'auto' })
  })

  it('um gesto da pessoa (roda) encerra o ajuste: sem segunda rolagem', async () => {
    renderizarRota(`/como-funciona#${ID_ALVO}`, { sessao: null })
    await aguardarCarga()
    await waitFor(() => expect(rolar).toHaveBeenCalledTimes(1))
    const alvo = document.getElementById(ID_ALVO)!

    window.dispatchEvent(new Event('wheel'))
    vi.spyOn(alvo, 'getBoundingClientRect').mockReturnValue({ top: 9 } as DOMRect)
    await esperarQuadros(200)

    expect(rolar).toHaveBeenCalledTimes(1)
  })

  it('numa página de leitura (que já rola e foca o hash sozinha), o total é só a rolagem da própria página', async () => {
    renderizarRota('/privacidade#secao-seus-direitos', { sessao: null })
    await aguardarCarga()
    const alvo = await waitFor(() => {
      const el = document.getElementById('secao-seus-direitos')
      expect(el).not.toBeNull()
      expect(rolar).toHaveBeenCalled()
      return el!
    })
    await esperarQuadros(300)

    expect(rolar).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(alvo)
  })

  it('na carga a frio nunca é suave, mesmo sem a preferência de movimento reduzido', async () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: false,
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    renderizarRota(`/como-funciona#${ID_ALVO}`, { sessao: null })
    await aguardarCarga()
    await waitFor(() => expect(rolar).toHaveBeenCalled())
    expect(rolar).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' })
  })

  it('o id com porcentagem é decodificado e o malformado não dá erro nem rola', async () => {
    renderizarRota('/como-funciona#%', { sessao: null })
    await aguardarCarga()
    await esperarQuadros()
    expect(rolar).not.toHaveBeenCalled()
  })

  it('um hash sem elemento não rola nem dá erro', async () => {
    renderizarRota('/como-funciona#nao-existe-na-pagina', { sessao: null })
    await aguardarCarga()
    // As tentativas são limitadas (~60 quadros): esperamos mais que isso e nada pode ter rolado.
    await esperarQuadros(1400)
    expect(rolar).not.toHaveBeenCalled()
  })

  it('uma rota sem hash não rola', async () => {
    renderizarRota('/como-funciona', { sessao: null })
    await aguardarCarga()
    await esperarQuadros()
    expect(rolar).not.toHaveBeenCalled()
  })

  it('o clique na mesma página (só o hash muda) não é tratado pelo hook', async () => {
    const { roteador } = renderizarRota(`/como-funciona#${ID_ALVO}`, { sessao: null })
    await aguardarCarga()
    await waitFor(() => expect(rolar).toHaveBeenCalledTimes(1))
    await esperarQuadros()
    rolar.mockClear()

    await act(async () => {
      await roteador.navigate(`#${ID_OUTRO}`)
    })
    await esperarQuadros()
    expect(roteador.state.location.hash).toBe(`#${ID_OUTRO}`)
    expect(rolar).not.toHaveBeenCalled()
  })

  it.each([
    { strict: false, direcao: 'Voltar', passo: -1 },
    { strict: true, direcao: 'Voltar', passo: -1 },
    { strict: false, direcao: 'Avançar', passo: 1 },
    { strict: true, direcao: 'Avançar', passo: 1 },
  ])('no histórico, $direcao refoca e rola uma vez por visita, inclusive repetida (StrictMode: $strict)', async ({ strict, passo }) => {
    const caminho = `/como-funciona#${ID_ALVO}`
    const { roteador } = renderizarRota(passo === -1 ? caminho : '/sobre', { sessao: null, strict })
    await aguardarCarga()
    if (passo === 1) {
      await act(async () => { await roteador.navigate(caminho) })
      await aguardarCarga()
    }
    await waitFor(() => expect(rolar).toHaveBeenCalledTimes(1))
    const chaveDoAlvo = roteador.state.location.key
    let alvoAnterior = document.getElementById(ID_ALVO)
    expect(document.activeElement).toBe(alvoAnterior)

    for (let visita = 0; visita < 2; visita += 1) {
      rolar.mockClear()
      await act(async () => {
        if (passo === -1 && visita === 0) await roteador.navigate('/sobre')
        else await roteador.navigate(-passo)
      })
      await aguardarCarga()
      await esperarQuadros()
      expect(roteador.state.location.pathname).toBe('/sobre')
      expect(document.getElementById(ID_ALVO)).toBeNull()
      expect(rolar).not.toHaveBeenCalled()

      await act(async () => { await roteador.navigate(passo) })
      await aguardarCarga()
      await waitFor(() => expect(rolar).toHaveBeenCalledTimes(1))
      await esperarQuadros()
      const alvo = document.getElementById(ID_ALVO)
      expect(roteador.state.location.key).toBe(chaveDoAlvo)
      expect(alvo).not.toBe(alvoAnterior)
      expect(rolar).toHaveBeenCalledTimes(1)
      expect(rolar.mock.contexts[0]).toBe(alvo)
      expect(rolar).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
      expect(document.activeElement).toBe(alvo)
      alvoAnterior = alvo
    }
  })

  it('navegar para outro caminho com hash rola uma vez, suave por padrão', async () => {
    const { roteador } = renderizarRota('/sobre', { sessao: null })
    await aguardarCarga()
    await esperarQuadros()
    expect(rolar).not.toHaveBeenCalled()

    await act(async () => {
      await roteador.navigate(`/como-funciona#${ID_ALVO}`)
    })
    await aguardarCarga()
    await waitFor(() => expect(rolar).toHaveBeenCalled())
    await esperarQuadros()

    expect(rolar).toHaveBeenCalledTimes(1)
    expect(rolar).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
    expect(document.activeElement).toBe(document.getElementById(ID_ALVO))
  })

  it('com movimento reduzido, a navegação para outro caminho com hash rola com behavior "auto"', async () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta === '(prefers-reduced-motion: reduce)',
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const { roteador } = renderizarRota('/sobre', { sessao: null })
    await aguardarCarga()

    await act(async () => {
      await roteador.navigate(`/como-funciona#${ID_ALVO}`)
    })
    await aguardarCarga()
    await waitFor(() => expect(rolar).toHaveBeenCalled())
    expect(rolar).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' })
  })
})
