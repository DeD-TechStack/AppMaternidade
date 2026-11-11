import type { ReactNode } from 'react'
import { Titulo } from '../campo/Titulo.tsx'
import './publicas-destaque.css'

interface Props {
  /** O h1 da página: a segunda linha, inteira, em itálico. */
  titulo: readonly [string, string]
  /**
   * `lado`: o título e o texto de um lado, a mídia do outro. `topo`: o título ocupa a linha de cima e,
   * abaixo, o texto e a mídia. `titulo-lide`: o título de um lado e o texto do outro, sem mídia (a
   * mídia vem logo abaixo, num painel de campo).
   */
  disposicao: 'lado' | 'topo' | 'titulo-lide'
  /** A abertura, as ações e o aviso. */
  texto: ReactNode
  midia?: ReactNode
}

/** A primeira dobra de uma página pública: o h1, o texto e, quando há, a mídia de verdade. */
export function Abertura({ titulo, disposicao, texto, midia }: Props) {
  const h1 = <Titulo nivel="h1" linhas={titulo} className={disposicao === 'lado' ? undefined : 'pd-abertura-titulo'} />
  return (
    <div className="cm-area pd-abertura" data-disposicao={disposicao}>
      {disposicao === 'lado' ? (
        <div className="pd-abertura-texto">
          {h1}
          {texto}
        </div>
      ) : (
        <>
          {h1}
          <div className="pd-abertura-texto">{texto}</div>
        </>
      )}
      {midia ? <div className="pd-abertura-midia">{midia}</div> : null}
    </div>
  )
}
