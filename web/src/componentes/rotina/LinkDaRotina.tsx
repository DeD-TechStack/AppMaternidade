import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ALVO_APP } from '../app/alvo.ts'
import { LINK_ALVO } from '../conta/Partes.tsx'

interface Props {
  to: string
  /** O que viaja com a navegação além do foco no `h1` (a origem das notas, por exemplo). */
  state?: Record<string, unknown>
  /** `contorno`: pílula de 1,5 px; `sublinhado`: link de texto sempre sublinhado. */
  variante?: 'contorno' | 'sublinhado'
  /** Um ícone de `lucide-react`, ao lado do texto visível; vai com `aria-hidden`. */
  icone?: ReactNode
  className?: string
  'aria-label'?: string
  'data-link'?: string
  children: ReactNode
}

/**
 * Um link interno da rotina: o foco vai ao `h1` da tela de destino (R38-30, regra 3). O nome acessível,
 * quando há `aria-label`, sempre contém o texto visível.
 */
export function LinkDaRotina({ to, state, variante = 'sublinhado', icone, className, children, ...resto }: Props) {
  const classe =
    variante === 'contorno' ? `cm-botao cm-botao-contorno alvo-toque ${ALVO_APP}` : `${LINK_ALVO} wrap-anywhere`
  return (
    <Link
      to={to}
      state={{ foco: 'titulo', ...state }}
      className={[classe, className].filter(Boolean).join(' ')}
      data-botao={variante === 'contorno' ? 'contorno' : undefined}
      data-tamanho={variante === 'contorno' ? 'app' : undefined}
      {...resto}
    >
      {icone ? (
        <span className="cm-botao-icone" aria-hidden="true">
          {icone}
        </span>
      ) : null}
      {children}
    </Link>
  )
}
