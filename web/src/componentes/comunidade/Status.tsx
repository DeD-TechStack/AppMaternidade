import type { Ref } from 'react'

interface Props {
  mensagem: string | null
  refStatus?: Ref<HTMLDivElement>
}

/**
 * A confirmação da tela, em `role="status"`: única, sempre no DOM (o leitor de tela anuncia o que entra
 * nela) e focável por programa, porque ela entra na regra de foco (MAT-40:RF-15).
 */
export function Status({ mensagem, refStatus }: Props) {
  return (
    <div
      ref={refStatus}
      role="status"
      tabIndex={-1}
      data-status=""
      className={
        mensagem
          ? 'alvo-foco max-w-[40rem] rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3 font-medium wrap-anywhere'
          : 'sr-only'
      }
    >
      {mensagem}
    </div>
  )
}
