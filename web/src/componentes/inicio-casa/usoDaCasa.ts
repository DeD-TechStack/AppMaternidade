import { useLayoutEffect, useSyncExternalStore } from 'react'

// Two page-owned hooks of the Início: the width switch (1024 px, the width from which the hero holds the mel pill and
// the stage is built as a fixed composition) and the mark on <html> that quiets the shell's header pill.

const CONSULTA_LARGA = '(min-width: 1024px)'

function temMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function assinar(aviso: () => void): () => void {
  if (!temMatchMedia()) return () => {}
  const lista = window.matchMedia(CONSULTA_LARGA)
  if (typeof lista.addEventListener === 'function') {
    lista.addEventListener('change', aviso)
    return () => lista.removeEventListener('change', aviso)
  }
  if (typeof lista.addListener === 'function') {
    lista.addListener(aviso)
    return () => lista.removeListener(aviso)
  }
  return () => {}
}

const ler = () => (temMatchMedia() ? window.matchMedia(CONSULTA_LARGA).matches : false)
const semJanela = () => false

/** True from 1024 px of width. Without matchMedia (plain jsdom) the narrow layout stands. */
export function useLarga1024(): boolean {
  return useSyncExternalStore(assinar, ler, semJanela)
}

/** The hero pill, the one filled action of the first fold from 1024 px (RECUT §5). */
const PILULA_DO_HEROI = '[data-cena-heroi] a[data-botao-mel]'

/** The attribute on <html> the page stylesheet reads to quiet the shell's header pill (`html[data-inicio-heroi]`). */
const ATRIBUTO = 'inicioHeroi'
const VALOR = 'visivel'

/** The header's height: the top root margin of the observer, so a pill under the header is not "in view". */
const ALTURA_DO_CABECALHO_PX = 72

/** Whether any part of the pill is below the header and above the window's foot. A box with no size (jsdom) counts as in view. */
function estaNaVista(pilula: HTMLElement): boolean {
  const caixa = pilula.getBoundingClientRect()
  if (caixa.width === 0 && caixa.height === 0) return true
  return caixa.bottom > ALTURA_DO_CABECALHO_PX && caixa.top < window.innerHeight
}

/**
 * RECUT §5, with no hook in the shell (the shell's `casca/**` is not edited): from 1024 px the hero's mel pill is the
 * fold's one filled action, so the header pill is quiet while any part of the hero pill is in view under the header.
 * The page marks that state on <html>: `data-inicio-heroi="visivel"` while the pill is in view (the stylesheet
 * `inicio-casa.css` reads it, at 1024 and more only), and no attribute when it is not, on unmount and below 1024; with
 * no attribute the header pill is the shell's own filled one. The first state is read in a layout effect, before the
 * first paint, so a page opened at the top shows the quiet pill with no flash of the filled one.
 */
export function useGanchoDoCabecalho(larga: boolean): void {
  useLayoutEffect(() => {
    if (!larga) return undefined
    const pilula = document.querySelector<HTMLElement>(PILULA_DO_HEROI)
    if (!pilula) return undefined
    const raiz = document.documentElement
    const marcar = (naVista: boolean) => {
      if (naVista) raiz.dataset[ATRIBUTO] = VALOR
      else delete raiz.dataset[ATRIBUTO]
    }
    marcar(estaNaVista(pilula))
    let observador: IntersectionObserver | undefined
    if (typeof IntersectionObserver !== 'undefined') {
      observador = new IntersectionObserver(
        (entradas) => {
          const ultima = entradas.filter((entrada) => entrada.target === pilula).at(-1)
          if (ultima) marcar(ultima.isIntersecting)
        },
        { rootMargin: `-${ALTURA_DO_CABECALHO_PX}px 0px 0px 0px` },
      )
      observador.observe(pilula)
    }
    return () => {
      observador?.disconnect()
      delete raiz.dataset[ATRIBUTO]
    }
  }, [larga])
}
