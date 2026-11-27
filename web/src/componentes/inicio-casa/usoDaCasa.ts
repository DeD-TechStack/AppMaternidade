import { useLayoutEffect } from 'react'

// The page-owned hook of the Início: the mark on <html> that quiets the shell's header pill.

/** The hero pill, the one filled action of the first fold at every width (under the value sentence). */
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
 * RECUT §5, with no hook in the shell: at every width the hero's mel pill is the fold's one filled action, so the
 * header pill is quiet while any part of the hero pill is in view under the header. The page marks that state on
 * <html>: `data-inicio-heroi="visivel"` while the pill is in view (the stylesheet `inicio-casa.css` reads it), and no
 * attribute when it is not and on unmount; with no attribute the header pill is the shell's own filled one. The first
 * state is read in a layout effect, before the first paint, so a page opened at the top shows the quiet pill with no
 * flash of the filled one. `sala` only re-reads the pill when the composition switches.
 */
export function useGanchoDoCabecalho(sala: boolean): void {
  useLayoutEffect(() => {
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
  }, [sala])
}
