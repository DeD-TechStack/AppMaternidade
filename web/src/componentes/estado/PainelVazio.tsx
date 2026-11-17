import type { HTMLAttributes, ReactNode } from 'react'

type Props = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  /** O título do painel, quando a tela já tinha um. Sem ele, nenhum título é criado. */
  titulo?: string
  /** O nível do título (padrão `h2`). */
  nivel?: 2 | 3 | 4
  /** A frase que explica o vazio, do catálogo da tela. */
  texto?: string
  /** A ação (link ou botão), se houver. */
  children?: ReactNode
}

/** O estado vazio de uma lista: um painel de papel, com o título, a frase e a ação. O mesmo recuo do cartão de erro. */
export function PainelVazio({ titulo, nivel = 2, texto, children, className, ...resto }: Props) {
  const Titulo = `h${nivel}` as const
  return (
    <section {...resto} data-estado="vazio" className={`flex w-full flex-col items-start gap-3 rounded-campo bg-(--cor-papel-fundo) p-4 ${className ?? ''}`}>
      {titulo ? <Titulo className="font-semibold">{titulo}</Titulo> : null}
      {texto ? <p className="wrap-anywhere">{texto}</p> : null}
      {children}
    </section>
  )
}
