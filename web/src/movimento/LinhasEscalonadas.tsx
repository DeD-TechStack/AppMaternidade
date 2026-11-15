import type { ReactNode } from 'react'
import { EntradaSuave } from '../componentes/terceiros/EntradaSuave.tsx'
import { CATALOGO, atrasoEscalonado } from './catalogo.ts'

// M4: cada linha sobe 24 px e ganha opacidade, 80 ms depois da anterior (da terceira em diante, juntas).
// Dispara uma vez, ao entrar na janela, e não volta à espera quando a rolagem sobe; a espera já é legível
// (opacidade do M4, nunca 0). Com movimento reduzido, a EntradaSuave entrega cada linha comum, já no estado final.

interface Props {
  linhas: ReactNode[]
  className?: string
  classeLinha?: string
}

export function LinhasEscalonadas({ linhas, className, classeLinha }: Props) {
  const { deslocamentoPx, duracaoMs, curva, umaVez } = CATALOGO.M4

  return (
    <div className={className}>
      {linhas.map((linha, i) => (
        <EntradaSuave
          key={i}
          className={classeLinha}
          deslocamentoPx={deslocamentoPx}
          duracaoMs={duracaoMs}
          curva={curva}
          atrasoMs={atrasoEscalonado(i)}
          umaVez={umaVez}
        >
          {linha}
        </EntradaSuave>
      ))}
    </div>
  )
}
