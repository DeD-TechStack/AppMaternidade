import { afterEach, describe, expect, it, vi } from 'vitest'
import { classificar, responder, type ContextoSw, type DependenciasSw, type PedidoSw } from './estrategia.ts'

// A regra de cada caso do service worker, testada pela função pura `responder` (sem FetchEvent).

const ORIGEM = 'https://site.exemplo'
const CONTEXTO: ContextoSw = {
  origem: ORIGEM,
  subcaminho: '/AppMaternidade/',
  paginaInicial: '/AppMaternidade/index.html',
  casca: ['/AppMaternidade/index.html', '/AppMaternidade/assets/app.js', '/AppMaternidade/manifest.webmanifest'],
}

const navegacao = (caminho = '/AppMaternidade/app/hoje'): PedidoSw => ({
  url: ORIGEM + caminho,
  metodo: 'GET',
  modo: 'navigate',
})

function resposta(status: number, corpo = 'rede'): Response {
  return new Response(corpo, { status })
}

interface Montagem {
  deps: DependenciasSw
  rede: ReturnType<typeof vi.fn>
  cache: ReturnType<typeof vi.fn>
}

/** `rede` devolve o que o teste manda; `guardado` é o que há no cache (`null`: nada guardado). */
function montar(rede: () => Promise<Response>, guardado: Response | null = resposta(200, 'guardado')): Montagem {
  const buscarNaRede = vi.fn(rede)
  const buscarNoCache = vi.fn(async () => guardado ?? undefined)
  return { deps: { buscarNaRede, buscarNoCache }, rede: buscarNaRede, cache: buscarNoCache }
}

const texto = async (r: Response | null) => (r ? r.text() : null)

afterEach(() => {
  vi.useRealTimers()
})

describe('classificar', () => {
  it('navegação dentro do escopo, arquivo da casca e o resto', () => {
    expect(classificar(navegacao(), CONTEXTO)).toBe('navegacao')
    expect(classificar(navegacao('/AppMaternidade/'), CONTEXTO)).toBe('navegacao')
    expect(classificar({ url: ORIGEM + '/AppMaternidade/assets/app.js', metodo: 'GET', modo: 'no-cors' }, CONTEXTO)).toBe('casca')
    expect(classificar({ url: ORIGEM + '/AppMaternidade/assets/outro.js', metodo: 'GET', modo: 'no-cors' }, CONTEXTO)).toBe('direto')
  })

  it('outra origem, outro método e navegação fora do escopo passam direto', () => {
    expect(classificar({ url: 'https://abc.supabase.co/rest/v1/x', metodo: 'GET', modo: 'cors' }, CONTEXTO)).toBe('direto')
    expect(classificar({ url: ORIGEM + '/AppMaternidade/app/hoje', metodo: 'POST', modo: 'navigate' }, CONTEXTO)).toBe('direto')
    expect(classificar({ url: ORIGEM + '/AppMaternidade/assets/app.js', metodo: 'HEAD', modo: 'no-cors' }, CONTEXTO)).toBe('direto')
    expect(classificar(navegacao('/outro-site/app'), CONTEXTO)).toBe('direto')
  })
})

describe('responder: as 8 entradas', () => {
  it('1. navegação com 200: usa a resposta da rede', async () => {
    const { deps } = montar(async () => resposta(200))
    expect(await texto(await responder(navegacao(), CONTEXTO, deps))).toBe('rede')
  })

  it('2. navegação com 404: usa a resposta da rede (o 404 do Pages traz o app)', async () => {
    const { deps } = montar(async () => resposta(404, 'app no 404'))
    const r = await responder(navegacao(), CONTEXTO, deps)
    expect(r?.status).toBe(404)
    expect(await texto(r)).toBe('app no 404')
  })

  it('3. navegação com 500: entrega o index.html guardado', async () => {
    const { deps, cache } = montar(async () => resposta(500))
    expect(await texto(await responder(navegacao(), CONTEXTO, deps))).toBe('guardado')
    expect(cache).toHaveBeenCalledWith('/AppMaternidade/index.html')
  })

  it('4. navegação com falha de rede: entrega o index.html guardado', async () => {
    const { deps } = montar(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await texto(await responder(navegacao(), CONTEXTO, deps))).toBe('guardado')
  })

  it('5. navegação que leva 4 s: entrega o index.html guardado sem esperar a rede', async () => {
    vi.useFakeTimers()
    const { deps } = montar(() => new Promise((resolver) => setTimeout(() => resolver(resposta(200)), 4000)))
    const pendente = responder(navegacao(), CONTEXTO, deps)
    await vi.advanceTimersByTimeAsync(3000)
    expect(await texto(await pendente)).toBe('guardado')
  })

  it('6. arquivo da casca: sai do cache, sem ir à rede', async () => {
    const { deps, rede, cache } = montar(async () => resposta(200), resposta(200, 'do cache'))
    const pedido: PedidoSw = { url: ORIGEM + '/AppMaternidade/assets/app.js', metodo: 'GET', modo: 'no-cors' }
    expect(await texto(await responder(pedido, CONTEXTO, deps))).toBe('do cache')
    expect(cache).toHaveBeenCalledWith('/AppMaternidade/assets/app.js')
    expect(rede).not.toHaveBeenCalled()
  })

  it('7. outra origem (Supabase): passa direto, sem rede nem cache', async () => {
    const { deps, rede, cache } = montar(async () => resposta(200))
    const pedido: PedidoSw = { url: 'https://abc.supabase.co/rest/v1/registros', metodo: 'GET', modo: 'cors' }
    expect(await responder(pedido, CONTEXTO, deps)).toBeNull()
    expect(rede).not.toHaveBeenCalled()
    expect(cache).not.toHaveBeenCalled()
  })

  it('8. POST: passa direto, sem rede nem cache', async () => {
    const { deps, rede, cache } = montar(async () => resposta(200))
    const pedido: PedidoSw = { url: ORIGEM + '/AppMaternidade/app/hoje', metodo: 'POST', modo: 'cors' }
    expect(await responder(pedido, CONTEXTO, deps)).toBeNull()
    expect(rede).not.toHaveBeenCalled()
    expect(cache).not.toHaveBeenCalled()
  })
})

describe('responder: navegação', () => {
  it('sem rede e com index.html no cache, dá o guardado', async () => {
    const { deps } = montar(() => Promise.reject(new TypeError('offline')), resposta(200, 'casca offline'))
    expect(await texto(await responder(navegacao('/AppMaternidade/app/sessao'), CONTEXTO, deps))).toBe('casca offline')
  })

  it('a rede em 2.999 ms vale; com 3.000 ms ou mais, vale o guardado', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-10T12:00:00Z'))

    const rapida = montar(() => new Promise((resolver) => setTimeout(() => resolver(resposta(200)), 2999)))
    const a = responder(navegacao(), CONTEXTO, rapida.deps)
    await vi.advanceTimersByTimeAsync(2999)
    expect(await texto(await a)).toBe('rede')

    const limite = montar(() => new Promise((resolver) => setTimeout(() => resolver(resposta(200)), 3000)))
    const b = responder(navegacao(), CONTEXTO, limite.deps)
    await vi.advanceTimersByTimeAsync(3000)
    expect(await texto(await b)).toBe('guardado')

    const lenta = montar(() => new Promise((resolver) => setTimeout(() => resolver(resposta(200)), 3500)))
    const c = responder(navegacao(), CONTEXTO, lenta.deps)
    await vi.advanceTimersByTimeAsync(3500)
    expect(await texto(await c)).toBe('guardado')
  })

  it('a rede que responde de uma vez, mas depois de 3.000 ms de relógio, também perde para o guardado', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-10T12:00:00Z'))
    const { deps } = montar(async () => {
      vi.setSystemTime(Date.now() + 3000)
      return resposta(200)
    })
    expect(await texto(await responder(navegacao(), CONTEXTO, deps))).toBe('guardado')

    vi.setSystemTime(new Date('2026-11-10T12:00:00Z'))
    const quase = montar(async () => {
      vi.setSystemTime(Date.now() + 2999)
      return resposta(200)
    })
    expect(await texto(await responder(navegacao(), CONTEXTO, quase.deps))).toBe('rede')
  })

  it.each([
    ['status 0 (opaco)', () => ({ status: 0, type: 'opaque' })],
    ['redirecionamento opaco', () => ({ status: 0, type: 'opaqueredirect' })],
    ['301', () => ({ status: 301 })],
    ['302', () => ({ status: 302 })],
    ['304', () => ({ status: 304 })],
    ['500', () => ({ status: 500 })],
    ['503', () => ({ status: 503 })],
    ['403', () => ({ status: 403 })],
  ])('com %s da rede, dá o index.html guardado', async (_nome, fabricar) => {
    const falsa = { ...fabricar(), redirected: false, text: async () => 'rede' } as unknown as Response
    const { deps } = montar(async () => falsa)
    expect(await texto(await responder(navegacao(), CONTEXTO, deps))).toBe('guardado')
  })

  it('sem nada guardado, devolve a resposta da rede mesmo ruim, e a falha de rede se propaga', async () => {
    const ruim = montar(async () => resposta(500, 'erro do servidor'), null)
    const r = await responder(navegacao(), CONTEXTO, ruim.deps)
    expect(r?.status).toBe(500)

    const falha = montar(() => Promise.reject(new TypeError('offline')), null)
    await expect(responder(navegacao(), CONTEXTO, falha.deps)).rejects.toThrow('offline')
  })

  it('sem nada guardado e rede lenta, espera a rede', async () => {
    vi.useFakeTimers()
    const { deps } = montar(() => new Promise((resolver) => setTimeout(() => resolver(resposta(200, 'tardia')), 5000)), null)
    const pendente = responder(navegacao(), CONTEXTO, deps)
    await vi.advanceTimersByTimeAsync(5000)
    expect(await texto(await pendente)).toBe('tardia')
  })
})

describe('responder: o que passa direto', () => {
  const casos: Array<[string, PedidoSw]> = [
    ['PUT', { url: ORIGEM + '/AppMaternidade/assets/app.js', metodo: 'PUT', modo: 'cors' }],
    ['DELETE', { url: ORIGEM + '/AppMaternidade/app/hoje', metodo: 'DELETE', modo: 'cors' }],
    ['outra origem, navegação', { url: 'https://outro.site/AppMaternidade/app/hoje', metodo: 'GET', modo: 'navigate' }],
    ['outra origem, arquivo igual ao da casca', { url: 'https://cdn.exemplo/AppMaternidade/assets/app.js', metodo: 'GET', modo: 'no-cors' }],
    ['arquivo fora da lista', { url: ORIGEM + '/AppMaternidade/dados.json', metodo: 'GET', modo: 'cors' }],
    ['navegação fora do escopo', navegacao('/outro-site/')],
  ]
  it.each(casos)('%s: sem cache e sem rede', async (_nome, pedido) => {
    const { deps, rede, cache } = montar(async () => resposta(200))
    expect(await responder(pedido, CONTEXTO, deps)).toBeNull()
    expect(rede).not.toHaveBeenCalled()
    expect(cache).not.toHaveBeenCalled()
  })
})
