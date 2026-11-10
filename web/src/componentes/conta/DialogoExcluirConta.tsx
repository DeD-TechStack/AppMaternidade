import { useEffect, useId, useRef, type FormEvent, type ReactNode, type RefObject } from 'react'
import { COMUM, CONTA } from '../../conteudo/conta.ts'
import { CampoSenha } from './Campos.tsx'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from './Partes.tsx'

interface Props {
  senha: string
  aoMudarSenha: (senha: string) => void
  erroSenha: string | null
  /** O erro que não é do campo (rede, último responsável...), com o botão "Tentar de novo". */
  resumo: ReactNode
  enviando: boolean
  aoConfirmar: (evento: FormEvent<HTMLFormElement>) => void
  aoCancelar: () => void
  /** O botão que abriu a caixa: o foco volta a ele quando ela fecha. */
  retorno: RefObject<HTMLElement | null>
  /** O campo de senha: tem o foco ao abrir, e a tela o foca de novo quando a senha é o erro. */
  refSenha: RefObject<HTMLInputElement | null>
}

// A caixa de diálogo de "Excluir minha conta": o elemento `<dialog>` aberto como modal, com
// título, foco inicial no primeiro controle (a senha), `Esc` fechando e o foco voltando ao botão
// que abriu. Só existe no DOM enquanto está aberta.
export function DialogoExcluirConta({
  senha,
  aoMudarSenha,
  erroSenha,
  resumo,
  enviando,
  aoConfirmar,
  aoCancelar,
  retorno,
  refSenha,
}: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const tituloId = useId()

  // Os ouvintes leem sempre o valor mais novo, sem reabrir a caixa a cada renderização.
  const cancelar = useRef(aoCancelar)
  const ocupado = useRef(enviando)
  useEffect(() => {
    cancelar.current = aoCancelar
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
    refSenha.current?.focus()

    const pedirParaFechar = (evento: Event) => {
      evento.preventDefault()
      if (!ocupado.current) cancelar.current()
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
  }, [retorno, refSenha])

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={tituloId}
      aria-modal="true"
      className="m-auto w-[min(32rem,calc(100%_-_2rem))] rounded-[8px] border bg-[var(--cor-fundo)] p-6 text-[var(--cor-texto)] backdrop:bg-[var(--cor-texto)]/40"
    >
      <form onSubmit={aoConfirmar} noValidate className="flex flex-col gap-4">
        <h2 id={tituloId} className="titulo-linha">
          {CONTA.excluir.dialogo.titulo}
        </h2>
        <p>{CONTA.excluir.dialogo.texto}</p>
        {resumo}
        <CampoSenha
          rotulo={CONTA.excluir.dialogo.senha}
          autoComplete="current-password"
          valor={senha}
          aoMudar={aoMudarSenha}
          erro={erroSenha}
          refEntrada={refSenha}
        />
        <div className="flex flex-col gap-3 min-[30rem]:flex-row-reverse">
          <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
            {enviando ? COMUM.excluindo : CONTA.excluir.dialogo.confirmar}
          </button>
          <button type="button" disabled={enviando} className={`${BOTAO_SECUNDARIO} min-[30rem]:w-full`} onClick={aoCancelar}>
            {CONTA.excluir.dialogo.cancelar}
          </button>
        </div>
      </form>
    </dialog>
  )
}
