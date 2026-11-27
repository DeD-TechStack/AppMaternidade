import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  NavigationType,
  parsePath,
  UNSAFE_DataRouterContext,
  UNSAFE_DataRouterStateContext,
  UNSAFE_LocationContext,
  UNSAFE_NavigationContext,
  UNSAFE_RouteContext,
  type Location,
  type Navigator,
  type To,
} from 'react-router'

interface Props {
  entradaInicial: string
  children: ReactNode
}

function normalizarDestino(to: To, atual: Location, state?: unknown): Location {
  if (typeof to === 'string') {
    const p = parsePath(to)
    return {
      pathname: p.pathname || atual.pathname,
      search: p.search || '',
      hash: p.hash || '',
      state: state ?? null,
      key: `dt-${Math.random().toString(36).slice(2, 8)}`,
    }
  }
  return {
    pathname: to.pathname ?? atual.pathname,
    search: to.search ?? '',
    hash: to.hash ?? '',
    state: state ?? null,
    key: `dt-${Math.random().toString(36).slice(2, 8)}`,
  }
}

/**
 * Roteador em memória mínimo e totalmente isolado do RouterProvider da página hospedeira:
 * reutiliza apenas os contextos que o roteador principal já carrega (`LocationContext`, `NavigationContext`,
 * `RouteContext`), sem puxar `MemoryRouter`/`Routes`/`Route` para o pacote compartilhado.
 * Qualquer `<Link>` ou `useNavigate()` dentro do telefone navega só neste estado local, nunca mudando
 * `window.location`, `window.history`, `document.title` ou a rolagem da página.
 */
const HREF_INTERNO_DEMO = '#demo-previa'

export function RoteadorIsolado({ entradaInicial, children }: Props) {
  const cascaRef = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<{ pilha: Location[]; indice: number; tipo: NavigationType }>(() => {
    const p = parsePath(entradaInicial)
    return {
      pilha: [{ pathname: p.pathname || '/', search: p.search || '', hash: p.hash || '', state: null, key: 'dt-0' }],
      indice: 0,
      tipo: NavigationType.Pop,
    }
  })

  // Impede que Ctrl/Cmd/Shift-clique ou clique do meio em links da demo disparem abertura nativa fora do telefone.
  useEffect(() => {
    const elemento = cascaRef.current
    if (!elemento) return
    const bloquearAtivacaoNativa = (evento: MouseEvent) => {
      const alvo = evento.target instanceof Element ? evento.target.closest('a[href]') : null
      if (!alvo) return
      const modificado = evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey
      const botaoAuxiliar = evento.type === 'auxclick' || evento.button !== 0
      if (modificado || botaoAuxiliar) {
        evento.preventDefault()
        evento.stopPropagation()
      }
    }
    elemento.addEventListener('click', bloquearAtivacaoNativa, true)
    elemento.addEventListener('auxclick', bloquearAtivacaoNativa, true)
    return () => {
      elemento.removeEventListener('click', bloquearAtivacaoNativa, true)
      elemento.removeEventListener('auxclick', bloquearAtivacaoNativa, true)
    }
  }, [])

  const location = estado.pilha[estado.indice]

  const navigator = useMemo<Navigator>(
    () => ({
      // Nunca expõe `/app/...` no atributo `href`: abrir em nova aba ou copiar o link nunca leva à área real.
      createHref: () => HREF_INTERNO_DEMO,
      push(to, state) {
        setEstado((ant) => {
          const prox = normalizarDestino(to, ant.pilha[ant.indice], state)
          return { pilha: [...ant.pilha.slice(0, ant.indice + 1), prox], indice: ant.indice + 1, tipo: NavigationType.Push }
        })
      },
      replace(to, state) {
        setEstado((ant) => {
          const prox = normalizarDestino(to, ant.pilha[ant.indice], state)
          const copia = [...ant.pilha]
          copia[ant.indice] = prox
          return { pilha: copia, indice: ant.indice, tipo: NavigationType.Replace }
        })
      },
      go(delta) {
        setEstado((ant) => ({
          ...ant,
          indice: Math.min(Math.max(0, ant.indice + delta), ant.pilha.length - 1),
          tipo: NavigationType.Pop,
        }))
      },
    }),
    [],
  )

  const navCtx = useMemo(() => ({ basename: '', navigator, static: false, useTransitions: false, future: {} }), [navigator])
  const locCtx = useMemo(() => ({ location, navigationType: estado.tipo }), [location, estado.tipo])
  const routeCtx = useMemo(() => ({ outlet: null, matches: [], isDataRoute: false }), [])

  return (
    <UNSAFE_DataRouterContext.Provider value={null}>
      <UNSAFE_DataRouterStateContext.Provider value={null}>
        <UNSAFE_RouteContext.Provider value={routeCtx}>
          <UNSAFE_NavigationContext.Provider value={navCtx}>
            <UNSAFE_LocationContext.Provider value={locCtx}>
              <div ref={cascaRef} className="dt-roteador-casca">
                {children}
              </div>
            </UNSAFE_LocationContext.Provider>
          </UNSAFE_NavigationContext.Provider>
        </UNSAFE_RouteContext.Provider>
      </UNSAFE_DataRouterStateContext.Provider>
    </UNSAFE_DataRouterContext.Provider>
  )
}
