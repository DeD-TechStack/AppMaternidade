import { useSyncExternalStore } from 'react'

// Preferências do navegador que mudam o movimento. Cada consulta é lida pelo matchMedia a cada
// leitura e acompanhada pelo evento `change`, para a troca no meio da sessão chegar às peças.
// Sem matchMedia (jsdom puro, renderização no servidor) vale o padrão: movimento normal, com
// hover, tela estreita. Um MediaQueryList antigo (só addListener) também é acompanhado; sem
// nenhum dos dois métodos, devolve o valor lido e não assina.

interface Fonte {
  assinar: (aviso: () => void) => () => void
  ler: () => boolean
}

function temMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function fonteDe(consulta: string): Fonte {
  return {
    assinar(aviso) {
      if (!temMatchMedia()) return () => {}
      const lista = window.matchMedia(consulta)
      if (typeof lista.addEventListener === 'function') {
        lista.addEventListener('change', aviso)
        return () => lista.removeEventListener('change', aviso)
      }
      // Safari anterior ao 14: o MediaQueryList só tem addListener e removeListener.
      if (typeof lista.addListener === 'function') {
        lista.addListener(aviso)
        return () => lista.removeListener(aviso)
      }
      return () => {}
    },
    ler: () => (temMatchMedia() ? window.matchMedia(consulta).matches : false),
  }
}

const reduzido = fonteDe('(prefers-reduced-motion: reduce)')
const semHover = fonteDe('(hover: none)')
const larga = fonteDe('(min-width: 46rem)')

const naoSeAplica = () => false

/** Verdadeiro quando a pessoa pediu menos movimento. Acompanha a mudança no meio da sessão. */
export function usePrefereMovimentoReduzido(): boolean {
  return useSyncExternalStore(reduzido.assinar, reduzido.ler, naoSeAplica)
}

/** Verdadeiro em aparelho de toque, sem ponteiro que passe por cima (`(hover: none)`). */
export function useSemHover(): boolean {
  return useSyncExternalStore(semHover.assinar, semHover.ler, naoSeAplica)
}

/** Verdadeiro a partir de 46 rem de largura. */
export function useTelaLarga(): boolean {
  return useSyncExternalStore(larga.assinar, larga.ler, naoSeAplica)
}
