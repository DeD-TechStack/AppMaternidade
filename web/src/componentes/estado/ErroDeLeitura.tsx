import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { CircleAlert } from 'lucide-react'
import { BOTAO_SECUNDARIO } from '../conta/Partes.tsx'

type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role' | 'tabIndex'> & {
  /** A frase do catálogo da área. Código e mensagem do banco nunca chegam aqui. */
  texto: string
  /** Sem a ação não há botão. */
  aoTentarDeNovo?: () => void
  /** O rótulo do botão, do catálogo da área ("Tentar de novo"). */
  rotuloDeNovo?: string
  /** Um link ou aviso extra, entre a frase e o botão. */
  children?: ReactNode
  /** O elemento do alerta, para quem move o foco a ele. */
  refErro?: Ref<HTMLDivElement>
}

/**
 * O erro de uma leitura, o mesmo para as quatro áreas: `role="alert"`, o foco por código (`tabIndex={-1}`),
 * ícone, contorno e palavras (nunca só a cor) e, se houver a ação, "Tentar de novo". O contorno é a cor de erro do tema,
 * com a tinta do texto quando ela não existe.
 */
export function ErroDeLeitura({ texto, aoTentarDeNovo, rotuloDeNovo, children, refErro, className, ...resto }: Props) {
  return (
    <div
      {...resto}
      ref={refErro}
      role="alert"
      tabIndex={-1}
      data-estado="erro-de-leitura"
      className={`alvo-foco flex w-full flex-col items-start gap-3 rounded-campo border-2 border-[var(--cor-erro,var(--cor-texto))] bg-(--cor-cartao) p-4 ${className ?? ''}`}
    >
      <p className="flex items-start gap-3 font-medium wrap-anywhere">
        <CircleAlert size={22} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>{texto}</span>
      </p>
      {children}
      {aoTentarDeNovo && rotuloDeNovo ? (
        <button type="button" className={BOTAO_SECUNDARIO} data-botao="contorno" data-tamanho="app" onClick={aoTentarDeNovo}>
          {rotuloDeNovo}
        </button>
      ) : null}
    </div>
  )
}
