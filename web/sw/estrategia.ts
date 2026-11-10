// A regra de cada pedido que o service worker vê, em funções puras: nada aqui toca o FetchEvent.

export interface ContextoSw {
  /** A origem do site (por exemplo "https://usuario.github.io"). */
  origem: string
  /** O subcaminho do site, com / dos dois lados. */
  subcaminho: string
  /** Os caminhos da casca (com o subcaminho na frente). */
  casca: readonly string[]
  /** O caminho do index.html guardado. */
  paginaInicial: string
}

export interface PedidoSw {
  url: string
  metodo: string
  /** O `mode` do Request: "navigate" para uma navegação. */
  modo: string
}

export interface DependenciasSw {
  buscarNaRede: (pedido: PedidoSw) => Promise<Response>
  /** O arquivo guardado na versão atual; `undefined` se não houver. */
  buscarNoCache: (caminho: string) => Promise<Response | undefined>
  /** O relógio em ms; sem ele vale `Date.now`. */
  agora?: () => number
}

type Decisao = 'navegacao' | 'casca' | 'direto'

/** A rede tem este tempo para responder a uma navegação; com 3.000 ms ou mais vale o guardado. */
const LIMITE_DA_REDE_MS = 3000

function dentroDoEscopo(caminho: string, subcaminho: string): boolean {
  return caminho.startsWith(subcaminho) || caminho + '/' === subcaminho
}

/**
 * Decide, de forma síncrona (o `respondWith` não espera), o que fazer com o pedido: navegação dentro
 * do escopo, arquivo da casca, ou passar direto (outra origem, método que não é GET, arquivo fora da
 * lista, navegação fora do escopo).
 */
export function classificar(pedido: PedidoSw, contexto: ContextoSw): Decisao {
  if (pedido.metodo !== 'GET') return 'direto'
  let url: URL
  try {
    url = new URL(pedido.url)
  } catch {
    return 'direto'
  }
  if (url.origin !== contexto.origem) return 'direto'
  if (pedido.modo === 'navigate') return dentroDoEscopo(url.pathname, contexto.subcaminho) ? 'navegacao' : 'direto'
  return contexto.casca.includes(url.pathname) ? 'casca' : 'direto'
}

/** 200 e 404 servem (o 404 do Pages traz o app); todo o resto, não. */
function respostaDaNavegacaoServe(resposta: Response): boolean {
  if (resposta.type === 'opaque' || resposta.type === 'opaqueredirect' || resposta.redirected) return false
  return resposta.status === 200 || resposta.status === 404
}

type Tentativa = { quem: 'resposta'; resposta: Response } | { quem: 'falha'; erro: unknown }

async function responderNavegacao(pedido: PedidoSw, contexto: ContextoSw, deps: DependenciasSw): Promise<Response> {
  const agora = deps.agora ?? Date.now
  const inicio = agora()

  // O prazo nasce antes do pedido: num empate de 3.000 ms ele vence.
  let temporizador: ReturnType<typeof setTimeout> | undefined
  const prazo = new Promise<{ quem: 'prazo' }>((resolver) => {
    temporizador = setTimeout(() => resolver({ quem: 'prazo' }), LIMITE_DA_REDE_MS)
  })
  const tentativa: Promise<Tentativa> = deps.buscarNaRede(pedido).then(
    (resposta): Tentativa => ({ quem: 'resposta', resposta }),
    (erro: unknown): Tentativa => ({ quem: 'falha', erro }),
  )

  const primeiro = await Promise.race([tentativa, prazo])
  clearTimeout(temporizador)

  if (primeiro.quem === 'resposta' && agora() - inicio < LIMITE_DA_REDE_MS && respostaDaNavegacaoServe(primeiro.resposta)) {
    return primeiro.resposta
  }

  const guardada = await deps.buscarNoCache(contexto.paginaInicial)
  if (guardada) return guardada

  // Nada guardado: a rede, mesmo lenta ou ruim, ainda é melhor que nada.
  const final = primeiro.quem === 'prazo' ? await tentativa : primeiro
  if (final.quem === 'resposta') return final.resposta
  throw final.erro
}

/**
 * A resposta para o pedido, ou `null` quando o service worker deve deixá-lo passar direto, sem cache.
 * - Navegação dentro do escopo: a rede por até 3 s; 200 e 404 valem; com outro status, falha ou
 *   3.000 ms ou mais, o index.html guardado.
 * - GET de arquivo da casca: do cache, sem ir à rede.
 * - O resto: `null`.
 */
export async function responder(pedido: PedidoSw, contexto: ContextoSw, deps: DependenciasSw): Promise<Response | null> {
  const decisao = classificar(pedido, contexto)
  if (decisao === 'direto') return null
  if (decisao === 'navegacao') return responderNavegacao(pedido, contexto, deps)

  const caminho = new URL(pedido.url).pathname
  return (await deps.buscarNoCache(caminho)) ?? deps.buscarNaRede(pedido)
}
