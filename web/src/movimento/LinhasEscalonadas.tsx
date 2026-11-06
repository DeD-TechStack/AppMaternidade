import type { ReactNode } from 'react'
import { EntradaSuave } from '../componentes/terceiros/EntradaSuave.tsx'
import { CATALOGO } from './catalogo.ts'

// M4: cada linha sobe 48 px e aparece, 250 ms depois da anterior. Dispara ao entrar na janela e
// volta ao estado inicial quando a rolagem sobe acima do gatilho. Com movimento reduzido, a
// EntradaSuave entrega cada linha comum, já no estado final.

interface Props {
  linhas: ReactNode[]
  className?: string
  classeLinha?: string
}

export function LinhasEscalonadas({ linhas, className, classeLinha }: Props) {
  const { deslocamentoPx, duracaoMs, curva, escalonamentoMs } = CATALOGO.M4

  return (
    <div className={className}>
      {linhas.map((linha, i) => (
        <EntradaSuave
          key={i}
          className={classeLinha}
          deslocamentoPx={deslocamentoPx}
          duracaoMs={duracaoMs}
          curva={curva}
          atrasoMs={i * escalonamentoMs}
        >
          {linha}
        </EntradaSuave>
      ))}
    </div>
  )
}
