import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/** Quantos quadros de animação (~1 s) a casca espera a rota preguiçosa criar o elemento do hash. */
const MAXIMO_DE_QUADROS = 60

/** Quantos quadros (~650 ms) a casca vigia o alvo depois da rolagem seca, e quantos pixels de desvio tolera. */
const QUADROS_DE_AJUSTE = 40
const TOLERANCIA_PX = 2
/** Quanto o alvo já focado pela própria página pode estar fora do lugar antes de a casca realinhá-lo. */
const TOLERANCIA_DE_ALINHAMENTO_PX = 8

/** Os elementos que o navegador já foca sem `tabindex`. */
const FOCAVEL_NATIVO = 'a[href], area[href], button, input, select, textarea, summary, iframe, [contenteditable], [tabindex]'

type Origem = 'fria' | 'outra-pagina' | 'mesma-pagina'

function idDoHash(hash: string): string | null {
  if (hash.length < 2) return null
  try {
    return decodeURIComponent(hash.slice(1))
  } catch {
    // Porcentagem malformada (`%`, `%E0%A4%A`): o endereço vem de fora e não aponta para nada.
    return null
  }
}

function movimentoReduzido(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function pixels(valor: string | undefined): number {
  const numero = parseFloat(valor || '0')
  return Number.isNaN(numero) ? 0 : numero
}

/** Onde o topo do alvo deve ficar na janela: o `scroll-margin-top` dele mais o `scroll-padding-top` do html. */
function topoEsperado(alvo: HTMLElement): number {
  return pixels(getComputedStyle(alvo).scrollMarginTop) + pixels(getComputedStyle(document.documentElement).scrollPaddingTop)
}

/** Devolve a função que encerra o ajuste fino (só existe quando a rolagem foi seca). */
function rolarEFocar(alvo: HTMLElement, origem: Origem): () => void {
  // O alvo já está em foco: a própria página (PaginaDeLeitura) tratou o hash, com a rolagem e o foco dela.
  // Não rola nem foca de novo; só confere o alinhamento e deixa o ajuste fino vigiar o resto.
  if (document.activeElement === alvo) {
    if (Math.abs(alvo.getBoundingClientRect().top - topoEsperado(alvo)) > TOLERANCIA_DE_ALINHAMENTO_PX) {
      alvo.scrollIntoView?.({ block: 'start', behavior: 'auto' })
    }
    return assentar(alvo, alvo.getBoundingClientRect().top)
  }
  // Na primeira carga nunca é suave: a página ainda está se montando e o salto tem de ser seco.
  const behavior: ScrollBehavior = origem === 'fria' || movimentoReduzido() ? 'auto' : 'smooth'
  alvo.scrollIntoView?.({ block: 'start', behavior })
  const topoInicial = alvo.getBoundingClientRect().top
  if (!alvo.matches(FOCAVEL_NATIVO)) alvo.setAttribute('tabindex', '-1')
  alvo.focus({ preventScroll: true })
  // A rolagem suave anda por conta do navegador: medir o alvo durante ela não diz nada.
  return behavior === 'auto' ? assentar(alvo, topoInicial) : () => {}
}

/**
 * Logo depois da rolagem a página ainda se acomoda (fontes, imagens, o que a tela monta em seguida) e pode
 * empurrar o scroll alguns pixels. Por até `QUADROS_DE_AJUSTE` quadros, se o alvo saiu mais de `TOLERANCIA_PX` do
 * lugar onde a primeira rolagem o deixou, rola de novo (seco, sem refocar). Qualquer gesto da pessoa
 * (roda, toque, tecla, ponteiro) encerra o ajuste na hora. Devolve a função que o encerra.
 */
function assentar(alvo: HTMLElement, topoInicial: number): () => void {
  let quadro = 0
  let quadros = 0
  const eventos = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const

  const parar = () => {
    if (quadro) cancelAnimationFrame(quadro)
    quadro = 0
    for (const evento of eventos) window.removeEventListener(evento, parar)
  }

  const ajustar = () => {
    quadro = 0
    if (!alvo.isConnected) return parar()
    if (Math.abs(alvo.getBoundingClientRect().top - topoInicial) > TOLERANCIA_PX) {
      alvo.scrollIntoView?.({ block: 'start', behavior: 'auto' })
    }
    quadros += 1
    if (quadros >= QUADROS_DE_AJUSTE) return parar()
    quadro = requestAnimationFrame(ajustar)
  }

  for (const evento of eventos) window.addEventListener(evento, parar, { passive: true })
  quadro = requestAnimationFrame(ajustar)
  return parar
}

/**
 * Rola até o elemento que o `#hash` do endereço nomeia, depois que a rota (preguiçosa) renderizou.
 *
 * Numa carga a frio de `/como-funciona#id` o navegador tenta rolar antes de o React Router montar a rota, e o
 * id ainda não existe: a página fica no topo. Aqui a casca espera o elemento aparecer, em até
 * `MAXIMO_DE_QUADROS` quadros, e rola uma vez por localização.
 *
 * Só trata (a) a primeira carga do app e (b) a navegação para outro caminho que traz hash. O clique num link de
 * âncora da mesma página (só o hash muda) já é do navegador e do IndiceDaPagina: não é tratado de novo.
 * O CSS já cuida do respiro de cima (`scroll-padding-top` no html, `scroll-margin-top` nas seções).
 */
export function useRolarParaAncora() {
  const { pathname, hash, key } = useLocation()
  // O caminho da localização anterior (null antes da primeira) e a decisão por localização: no StrictMode o
  // efeito roda duas vezes com a mesma `key`, e a segunda não pode achar que é um salto na mesma página.
  const anterior = useRef<{ chave: string; caminho: string; origem: Origem } | null>(null)

  const rolada = useRef<string | null>(null)

  useEffect(() => {
    let origem: Origem
    const ultima = anterior.current
    if (ultima && ultima.chave === key) {
      origem = ultima.origem
    } else if (!ultima) {
      origem = 'fria'
    } else {
      origem = ultima.caminho === pathname ? 'mesma-pagina' : 'outra-pagina'
    }
    anterior.current = { chave: key, caminho: pathname, origem }

    const id = idDoHash(hash)
    if (id === null || origem === 'mesma-pagina' || rolada.current === key) return

    // O ajuste fino que segue a rolagem seca: encerrado ao desmontar e a cada troca de localização.
    let encerrarAjuste: (() => void) | null = null
    // Uma rolagem por localização (o StrictMode roda o efeito duas vezes com a mesma `key`).
    const rolar = (alvo: HTMLElement) => {
      rolada.current = key
      encerrarAjuste = rolarEFocar(alvo, origem)
    }

    // Já existe (rota carregada): os efeitos da tela, que rolam ao topo, rodaram antes deste, o do pai.
    const agora = document.getElementById(id)
    if (agora) {
      rolar(agora)
      return () => encerrarAjuste?.()
    }

    let quadro = 0
    let quadros = 0
    const tentar = () => {
      quadro = 0
      const alvo = document.getElementById(id)
      if (alvo) {
        // Mais um quadro: os efeitos da tela recém-montada (rolagem ao topo e foco no h1) rodam antes e o hash vence.
        quadro = requestAnimationFrame(() => {
          quadro = 0
          rolar(alvo)
        })
        return
      }
      quadros += 1
      // Sem elemento depois das tentativas: nada a fazer, sem rolagem e sem erro.
      if (quadros < MAXIMO_DE_QUADROS) quadro = requestAnimationFrame(tentar)
    }
    quadro = requestAnimationFrame(tentar)

    return () => {
      if (quadro) cancelAnimationFrame(quadro)
      encerrarAjuste?.()
    }
  }, [pathname, hash, key])
}
