import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A faixa da janela em que o índice considera uma seção "atual": o terço de cima.
 *
 * Em pixels, calculada pela altura real da janela. Um percentual vertical de `rootMargin` usa a
 * LARGURA da raiz, não a altura: em 1440 × 900 o `-66%` virava −950 px e eliminava a faixa
 * observada, e o índice parava de acompanhar a rolagem.
 */
export function margemDoIndice(alturaDaJanela: number): string {
  return `0px 0px -${Math.round((alturaDaJanela * 2) / 3)}px 0px`
}

const PAUSA_DO_CLIQUE_MS = 600
const FOLGA_DO_FIM_PX = 2

function noFimDaPagina(): boolean {
  return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - FOLGA_DO_FIM_PX
}

/**
 * A seção atual do índice lateral. Começa na primeira, vira a seção clicada e, onde
 * `IntersectionObserver` existe, acompanha a primeira da ordem que cruza o terço de cima da
 * janela. Um resize que muda a altura recalcula a faixa (o observador é recriado); o observador e
 * os ouvintes de resize e de scroll saem no desmonte. Sem `IntersectionObserver` (o jsdom) não há
 * nada a ouvir.
 *
 * No fim da página as últimas seções ficam todas visíveis e nenhuma chega ao terço de cima: aí a
 * seção ativa é a última da ordem. Ao sair do fim, vale de novo a última leitura do observador. O
 * clique no índice manda por `PAUSA_DO_CLIQUE_MS`: o scroll que o próprio clique causa não o desfaz.
 */
export function useSecaoAtiva(ids: readonly string[], ligado: boolean) {
  const [ativo, definirAtivo] = useState<string>(ids[0])
  const cliqueEm = useRef(Number.NEGATIVE_INFINITY)

  // A interface é a de sempre (`[ativo, setAtivo]`); a escolha por clique também marca o instante.
  const setAtivo = useCallback((id: string) => {
    cliqueEm.current = Date.now()
    definirAtivo(id)
  }, [])

  useEffect(() => {
    if (!ligado || typeof IntersectionObserver === 'undefined') return
    const secoes = new Map<Element, string>()
    for (const id of ids) {
      const secao = document.getElementById(id)?.closest('section')
      if (secao) secoes.set(secao, id)
    }

    let observador: IntersectionObserver | null = null
    let margem = ''
    // A última leitura do observador, e se o último scroll deixou a janela no fim da página.
    let doObservador: string | undefined
    let noFim = false

    function observar() {
      observador?.disconnect()
      margem = margemDoIndice(window.innerHeight)
      const visiveis = new Set<string>()
      observador = new IntersectionObserver(
        (entradas) => {
          for (const entrada of entradas) {
            const id = secoes.get(entrada.target)
            if (!id) continue
            if (entrada.isIntersecting) visiveis.add(id)
            else visiveis.delete(id)
          }
          const primeira = ids.find((id) => visiveis.has(id))
          if (!primeira) return
          doObservador = primeira
          if (!noFim) definirAtivo(primeira)
        },
        { rootMargin: margem },
      )
      for (const secao of secoes.keys()) observador.observe(secao)
    }

    function aoRedimensionar() {
      if (margemDoIndice(window.innerHeight) !== margem) observar()
    }

    function aoRolar() {
      if (Date.now() - cliqueEm.current < PAUSA_DO_CLIQUE_MS) return
      noFim = noFimDaPagina()
      const decidida = noFim ? ids[ids.length - 1] : doObservador
      if (decidida) definirAtivo(decidida)
    }

    observar()
    window.addEventListener('resize', aoRedimensionar)
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => {
      window.removeEventListener('resize', aoRedimensionar)
      window.removeEventListener('scroll', aoRolar)
      observador?.disconnect()
    }
  }, [ids, ligado])

  return [ativo, setAtivo] as const
}
