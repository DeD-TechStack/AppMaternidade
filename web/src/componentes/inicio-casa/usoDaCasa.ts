import { useEffect, useState, useSyncExternalStore } from 'react'

// Two page-owned hooks of the Início: the width switch (1024 px, the width from which the hero holds the mel pill and
// the stage is built as a fixed composition) and the state of the header pill ("quieta" or "cheia").

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

/** The state of the shell's header pill on this page: outline only (`quieta`) or filled (`cheia`). */
export type EstadoDaPilula = 'quieta' | 'cheia'

/** The hero pill, the one filled action of the first fold from 1024 px (RECUT §5). */
const PILULA_DO_HEROI = '[data-cena-heroi] a[data-botao-mel]'

/**
 * RECUT §5: from 1024 px the hero's mel pill is the fold's one filled action, so the header pill is `quieta` while any
 * part of the hero pill is in view under the header (top root margin -72 px) and `cheia` at every other scroll
 * position. Below 1024 the hero has no pill and the header pill is always `cheia`. `quieta` is the first state at
 * 1024 and more, so the first paint and reduced motion show it without any scroll.
 */
export function useEstadoDaPilula(larga: boolean): EstadoDaPilula {
  const [naVista, setNaVista] = useState(true)

  useEffect(() => {
    if (!larga || typeof IntersectionObserver === 'undefined') return undefined
    const pilula = document.querySelector<HTMLElement>(PILULA_DO_HEROI)
    if (!pilula) return undefined
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.target === pilula) setNaVista(entrada.isIntersecting)
        }
      },
      { rootMargin: '-72px 0px 0px 0px' },
    )
    observador.observe(pilula)
    return () => observador.disconnect()
  }, [larga])

  return larga && naVista ? 'quieta' : 'cheia'
}
