import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { CONTROLES_FOCAVEIS, prenderOTab } from '../conta/foco.ts'

interface Props {
  titulo: string
  aoFechar: () => void
  /** O botão que abriu a caixa: o foco volta a ele quando ela fecha, se ele ainda existe. */
  origem: RefObject<HTMLElement | null>
  /** Enquanto envia, `Esc` não fecha. */
  ocupado?: boolean
  children: ReactNode
}

/** A duração de saída de reserva (ms): espelha `--mov-fechar` (styles/tokens.css) quando a variável não pode ser lida. */
const SAIDA_PADRAO_MS = 160

/** O movimento está desligado (ou não dá para saber: sem `matchMedia`, como no jsdom puro)? Então nada sai animado. */
export function semMovimento(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** A duração de saída em ms: lê `--mov-fechar` da raiz; sem a variável, 160. */
export function duracaoDeSaida(): number {
  const bruto = getComputedStyle(document.documentElement).getPropertyValue('--mov-fechar').trim()
  const numero = Number.parseFloat(bruto)
  if (!Number.isFinite(numero) || numero <= 0) return SAIDA_PADRAO_MS
  return bruto.endsWith('ms') ? numero : bruto.endsWith('s') ? numero * 1000 : SAIDA_PADRAO_MS
}

// O fantasma que está na tela agora: só um por vez.
let fantasmaAtual: { elemento: HTMLElement; encerrar: () => void } | null = null

/**
 * A saída das caixas: quem chama as desmonta de uma vez, então, ao desmontar, a caixa deixa um fantasma de si
 * que faz o fade e o deslize de `styles/abrir-fechar.css` e some. O fantasma é uma cópia inerte (`inert`,
 * `aria-hidden`, sem ids nem autofoco, sem cliques), posta na camada superior como `popover` e não como modal:
 * uma caixa modal deixaria o resto da página inerte e o foco não voltaria ao botão de origem.
 * Sem fantasma com movimento reduzido, sem `matchMedia` ou sem a caixa.
 */
export function deixarFantasma(original: HTMLDialogElement | null): void {
  if (!original || typeof document === 'undefined' || semMovimento()) return
  fantasmaAtual?.encerrar()

  const copia = original.cloneNode(true) as HTMLDialogElement
  copia.removeAttribute('open')
  copia.removeAttribute('aria-modal')
  copia.removeAttribute('id')
  copia.querySelectorAll('[id]').forEach((no) => no.removeAttribute('id'))
  copia.querySelectorAll('[autofocus]').forEach((no) => no.removeAttribute('autofocus'))
  // O clone não leva o que foi digitado (só o atributo): copia os valores, menos o da senha.
  const campos = original.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
  copia.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((campo, i) => {
    const de = campos[i]
    if (de && !(de instanceof HTMLInputElement && de.type === 'password')) campo.value = de.value
  })
  copia.setAttribute('inert', '')
  copia.setAttribute('aria-hidden', 'true')
  copia.setAttribute('data-fantasma', '')
  copia.setAttribute('popover', 'manual')
  document.body.append(copia)
  if (typeof copia.showPopover === 'function') {
    try {
      copia.showPopover()
    } catch {
      copia.setAttribute('open', '')
    }
  } else {
    copia.setAttribute('open', '')
  }

  let pronto = false
  const encerrar = () => {
    if (pronto) return
    pronto = true
    window.clearTimeout(relogio)
    copia.removeEventListener('transitionend', aoTerminar)
    copia.remove()
    if (fantasmaAtual?.elemento === copia) fantasmaAtual = null
  }
  const aoTerminar = (evento: Event) => {
    if (evento.target === copia) encerrar()
  }
  const relogio = window.setTimeout(encerrar, duracaoDeSaida())
  copia.addEventListener('transitionend', aoTerminar)
  fantasmaAtual = { elemento: copia, encerrar }

  // Só depois de pintado no estado aberto o atributo de saída liga a transição.
  void copia.getBoundingClientRect()
  copia.setAttribute('data-saindo', '')
}

// A caixa de diálogo da Comunidade: o elemento `<dialog>` aberto como modal, com título, o foco inicial
// no primeiro controle (ou no botão marcado com `data-foco-inicial`), o foco preso dentro dela, `Esc`
// fechando e o foco voltando ao botão de origem.
// Se esse botão já não existe, quem chamou segue a regra de foco da MAT-40:RF-15. Só existe no DOM
// enquanto está aberta.
export function Dialogo({ titulo, aoFechar, origem, ocupado = false, children }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const tituloId = useId()

  // Os ouvintes leem sempre o valor mais novo, sem reabrir a caixa a cada renderização.
  const fechar = useRef(aoFechar)
  const trabalhando = useRef(ocupado)
  useEffect(() => {
    fechar.current = aoFechar
    trabalhando.current = ocupado
  })

  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento) return
    // O jsdom não tem `showModal`; nos navegadores ele abre a caixa como modal.
    if (typeof elemento.showModal === 'function') {
      if (!elemento.open) elemento.showModal()
    } else {
      elemento.setAttribute('open', '')
    }
    // A11Y-006: quem tem uma ação destrutiva marca o botão seguro ("Cancelar") com `data-foco-inicial`.
    const inicial = elemento.querySelector<HTMLElement>('[data-foco-inicial]') ?? elemento.querySelector<HTMLElement>(CONTROLES_FOCAVEIS)
    inicial?.focus()

    const pedirParaFechar = (evento: Event) => {
      evento.preventDefault()
      if (!trabalhando.current) fechar.current()
    }
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') return pedirParaFechar(evento)
      prenderOTab(evento, elemento)
    }
    elemento.addEventListener('cancel', pedirParaFechar)
    elemento.addEventListener('keydown', aoTeclar)
    const voltarPara = origem.current
    return () => {
      elemento.removeEventListener('cancel', pedirParaFechar)
      elemento.removeEventListener('keydown', aoTeclar)
      // Desmontada de verdade (o elemento já saiu do DOM): deixa o fantasma da saída. Num StrictMode ou numa nova
      // execução do efeito o elemento ainda está na página, e aí não há saída.
      if (!elemento.isConnected) deixarFantasma(elemento)
      if (typeof elemento.close === 'function' && elemento.open) elemento.close()
      if (voltarPara?.isConnected) voltarPara.focus()
    }
  }, [origem])

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={tituloId}
      aria-modal="true"
      className="cm-dialogo m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100%_-_2rem))] overflow-y-auto rounded-cartao border-[1.5px] border-[var(--cor-texto)] bg-[var(--cor-fundo)] p-6 text-[var(--cor-texto)] backdrop:bg-[var(--cor-texto)]/40 lg:p-8"
    >
      <div className="flex flex-col gap-4">
        <h2 id={tituloId} className="cm-h4 text-titulo-4">
          {titulo}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
