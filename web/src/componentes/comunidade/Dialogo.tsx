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
      if (typeof elemento.close === 'function' && elemento.open) elemento.close()
      if (voltarPara?.isConnected) voltarPara.focus()
    }
  }, [origem])

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={tituloId}
      aria-modal="true"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100%_-_2rem))] overflow-y-auto rounded-cartao border-[1.5px] border-[var(--cor-texto)] bg-[var(--cor-fundo)] p-6 text-[var(--cor-texto)] backdrop:bg-[var(--cor-texto)]/40 lg:p-8"
    >
      <div className="flex flex-col gap-4">
        <h2 id={tituloId} className="cm-h4">
          {titulo}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
