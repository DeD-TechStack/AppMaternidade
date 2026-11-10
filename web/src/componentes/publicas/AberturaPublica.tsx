import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Abertura } from '../base/Abertura.tsx'
import { TF } from '../../conteudo/publicas.ts'

/** Um aviso da coluna lateral: `ui` 15, na cor secundária. */
export function AvisoLateral({ children, aviso }: { children: ReactNode; aviso?: string }) {
  return (
    <li>
      <p className="t-ui t-secundario" data-aviso={aviso}>
        {children}
      </p>
    </li>
  )
}

/** Um link da coluna lateral, com o alvo de toque inteiro. */
export function LinkLateral({ para, children }: { para: string; children: ReactNode }) {
  return (
    <li>
      <Link className="sb-abertura-link t-corpo alvo-toque" to={para}>
        {children}
      </Link>
    </li>
  )
}

interface Props {
  titulo: string
  subtitulo: string
  /** Itens da lateral antes do aviso de construção (TF-10). */
  antes?: ReactNode
  /** Itens da lateral depois do aviso de construção. */
  depois?: ReactNode
}

/**
 * A abertura das páginas públicas: a da base, com a lateral em c9–c10. A lateral leva o que a página
 * pede antes do aviso de construção (TF-10), o aviso e o que vem depois dele. Sem etiquetas inventadas.
 */
export function AberturaPublica({ titulo, subtitulo, antes, depois }: Props) {
  return (
    <Abertura
      titulo={titulo}
      subtitulo={subtitulo}
      lateral={
        <>
          {antes}
          <AvisoLateral aviso="construcao">{TF.construcao}</AvisoLateral>
          {depois}
        </>
      }
    />
  )
}
