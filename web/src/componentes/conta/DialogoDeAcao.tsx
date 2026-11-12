import { useEffect, useId, useRef, type FormEvent, type ReactNode, type RefObject } from 'react'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from './Partes.tsx'

interface Props {
  titulo: string
  /** A explicação, logo abaixo do título. */
  texto?: ReactNode
  /** Os controles da caixa (a escolha do papel, o nome da família a digitar...). */
  children?: ReactNode
  /** O erro que não é de campo, com "Tentar de novo". */
  resumo?: ReactNode
  confirmar: string
  /** O rótulo do botão enquanto a ação roda. */
  rotuloEnviando: string
  cancelar: string
  enviando: boolean
  /** Desativa só o botão de confirmar (por exemplo, até o nome da família ser digitado). */
  confirmarDesativado?: boolean
  aoConfirmar: (evento: FormEvent<HTMLFormElement>) => void
  aoCancelar: () => void
  /** O botão que abriu a caixa: o foco volta a ele quando ela fecha. */
  retorno: RefObject<HTMLElement | null>
}

// A caixa de diálogo das ações da Família (RN-03): o elemento `<dialog>` aberto como modal, com
// título, foco inicial no primeiro controle, `Esc` fechando e o foco voltando ao botão que abriu.
// Só existe no DOM enquanto está aberta. Enquanto a ação roda, `Esc` e "Cancelar" não fecham.
export function DialogoDeAcao({
  titulo,
  texto,
  children,
  resumo,
  confirmar,
  rotuloEnviando,
  cancelar,
  enviando,
  confirmarDesativado = false,
  aoConfirmar,
  aoCancelar,
  retorno,
}: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const tituloId = useId()

  // Os ouvintes leem sempre o valor mais novo, sem reabrir a caixa a cada renderização.
  const fechar = useRef(aoCancelar)
  const ocupado = useRef(enviando)
  useEffect(() => {
    fechar.current = aoCancelar
    ocupado.current = enviando
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
    elemento.querySelector<HTMLElement>('input, select, textarea, button:not([disabled])')?.focus()

    const pedirParaFechar = (evento: Event) => {
      evento.preventDefault()
      if (!ocupado.current) fechar.current()
    }
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') pedirParaFechar(evento)
    }
    elemento.addEventListener('cancel', pedirParaFechar)
    elemento.addEventListener('keydown', aoTeclar)
    const voltarPara = retorno.current
    return () => {
      elemento.removeEventListener('cancel', pedirParaFechar)
      elemento.removeEventListener('keydown', aoTeclar)
      if (typeof elemento.close === 'function' && elemento.open) elemento.close()
      voltarPara?.focus()
    }
  }, [retorno])

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={tituloId}
      aria-modal="true"
      className="m-auto w-[min(32rem,calc(100%_-_2rem))] rounded-cartao border-[1.5px] border-[var(--cor-texto)] bg-[var(--cor-fundo)] p-6 text-[var(--cor-texto)] backdrop:bg-[var(--color-cacau)]/60 lg:p-8"
    >
      <form onSubmit={aoConfirmar} noValidate className="flex flex-col gap-4">
        <h2 id={tituloId} className="cm-h4 wrap-anywhere">
          {titulo}
        </h2>
        {texto ? <div className="flex flex-col gap-3">{texto}</div> : null}
        {resumo}
        {children}
        <div className="flex flex-col-reverse gap-3 min-[30rem]:flex-row">
          <button
            type="button"
            disabled={enviando}
            className={`${BOTAO_SECUNDARIO} min-[30rem]:w-full`}
            data-tamanho="app"
            onClick={aoCancelar}
          >
            {cancelar}
          </button>
          <button type="submit" disabled={enviando || confirmarDesativado} className={BOTAO_PRINCIPAL}>
            {enviando ? rotuloEnviando : confirmar}
          </button>
        </div>
      </form>
    </dialog>
  )
}
