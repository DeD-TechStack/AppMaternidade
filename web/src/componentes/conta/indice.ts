import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

const CONSULTA_DO_COMPUTADOR = '(min-width: 768px)'

function assinarALargura(avisar: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => undefined
  const lista = window.matchMedia(CONSULTA_DO_COMPUTADOR)
  if (typeof lista.addEventListener === 'function') {
    lista.addEventListener('change', avisar)
    return () => lista.removeEventListener('change', avisar)
  }
  // Navegador antigo: só `addListener` e `removeListener`.
  lista.addListener?.(avisar)
  return () => lista.removeListener?.(avisar)
}

const larguraDoComputador = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(CONSULTA_DO_COMPUTADOR).matches

/**
 * O índice mora em dois lugares: de 768 para cima fica ao lado, num `nav` filho do `main` que
 * acompanha a rolagem (`position: sticky` só funciona dentro de uma caixa tão alta quanto a página);
 * abaixo disso fica na abertura, em linha, antes do fio. Sem `matchMedia` (jsdom puro) vale a
 * abertura. Um índice só está no DOM em cada momento.
 */
export function useIndiceAoLado(): boolean {
  return useSyncExternalStore(assinarALargura, larguraDoComputador, () => false)
}

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

const FOLGA_DO_FIM_PX = 2

function noFimDaPagina(): boolean {
  return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - FOLGA_DO_FIM_PX
}

// As teclas que rolam a página. Dentro de um campo de texto ou de um seletor elas editam ou trocam
// o valor em vez de rolar; o espaço num botão o aciona.
const TECLAS_DE_ROLAGEM = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'])

function teclaRolaAPagina(evento: KeyboardEvent): boolean {
  if (!TECLAS_DE_ROLAGEM.has(evento.key)) return false
  const alvo = evento.target instanceof HTMLElement ? evento.target : null
  if (!alvo) return true
  if (alvo.isContentEditable || alvo.closest('input, textarea, select')) return false
  const espaco = evento.key === ' ' || evento.key === 'Spacebar'
  return !(espaco && alvo.closest('button'))
}

// O botão do mouse apertado na barra de rolagem: o ponteiro está fora da área do documento. Sem
// medida (o jsdom devolve 0) não há barra a reconhecer. O botão do meio inicia a rolagem automática.
function apertouNaBarraDeRolagem(evento: MouseEvent): boolean {
  if (evento.button === 1) return true
  const { clientWidth, clientHeight } = document.documentElement
  return (clientWidth > 0 && evento.clientX >= clientWidth) || (clientHeight > 0 && evento.clientY >= clientHeight)
}

/**
 * A seção atual do índice da Conta (R6). Começa na primeira, vira a seção escolhida por clique ou
 * por `#id` e, onde `IntersectionObserver` existe, acompanha a primeira da ordem que cruza o terço
 * de cima da janela. Um resize que muda a altura recalcula a faixa (o observador é recriado); o
 * observador e todos os ouvintes saem no desmonte. Sem `IntersectionObserver` (o jsdom) não há nada
 * a ouvir.
 *
 * No fim da página as últimas seções ficam todas visíveis e nenhuma chega ao terço de cima: aí a
 * seção ativa é a última da ordem. Ao sair do fim, vale de novo a última leitura do observador.
 *
 * O destino de um clique (e o da entrada por `#id`) fica TRAVADO até a pessoa rolar por conta
 * própria: nem o `scroll` que a navegação causa nem o aviso tardio do observador o desfazem, porque
 * o destaque precisa representar o link usado. A trava solta com `wheel`, `touchmove`, as teclas de
 * rolagem e o botão apertado na barra de rolagem; aí vale de novo a regra acima. Entre o clique e a
 * rolagem o observador segue lendo: a última leitura fica guardada e é a que o próximo `scroll`
 * aplica. Um resize não solta a trava: não é a pessoa rolando.
 *
 * Devolve `[ativo, escolher]`: `escolher(id)` marca e trava.
 */
export function useSecaoAtiva(ids: readonly string[], ligado: boolean) {
  const [ativo, definirAtivo] = useState<string>(ids[0])
  const travado = useRef(false)

  const escolher = useCallback((id: string) => {
    travado.current = true
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
    // A última leitura do observador (que persiste entre observadores) e se o último scroll deixou a
    // janela no fim da página.
    let doObservador: string | undefined
    let noFim = false
    const visiveis = new Set<string>()

    function observar() {
      observador?.disconnect()
      margem = margemDoIndice(window.innerHeight)
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
          if (!noFim && !travado.current) definirAtivo(primeira)
        },
        { rootMargin: margem },
      )
      for (const secao of secoes.keys()) observador.observe(secao)
    }

    function aoRedimensionar() {
      if (margemDoIndice(window.innerHeight) === margem) return
      // A faixa nova começa sem leitura: o observador novo entrega o estado de cada seção.
      visiveis.clear()
      observar()
    }

    function aoRolar() {
      // O fim da página vale mesmo com a trava: o estado dele não pode ficar velho.
      noFim = noFimDaPagina()
      if (travado.current) return
      const decidida = noFim ? ids[ids.length - 1] : doObservador
      if (decidida) definirAtivo(decidida)
    }

    function soltar() {
      travado.current = false
    }
    const aoApertarTecla = (evento: KeyboardEvent) => {
      if (teclaRolaAPagina(evento)) soltar()
    }
    const aoApertarPonteiro = (evento: MouseEvent) => {
      if (apertouNaBarraDeRolagem(evento)) soltar()
    }

    observar()
    window.addEventListener('resize', aoRedimensionar)
    window.addEventListener('scroll', aoRolar, { passive: true })
    window.addEventListener('wheel', soltar, { passive: true })
    window.addEventListener('touchmove', soltar, { passive: true })
    window.addEventListener('keydown', aoApertarTecla)
    window.addEventListener('pointerdown', aoApertarPonteiro)
    return () => {
      window.removeEventListener('resize', aoRedimensionar)
      window.removeEventListener('scroll', aoRolar)
      window.removeEventListener('wheel', soltar)
      window.removeEventListener('touchmove', soltar)
      window.removeEventListener('keydown', aoApertarTecla)
      window.removeEventListener('pointerdown', aoApertarPonteiro)
      observador?.disconnect()
    }
  }, [ids, ligado])

  return [ativo, escolher] as const
}
