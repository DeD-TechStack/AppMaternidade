import { TextoAnimado } from '../terceiros/TextoAnimado.tsx'
import { CATALOGO } from '../../movimento/catalogo.ts'

interface Props {
  /** O nível do título no documento. */
  nivel: 'h1' | 'h2' | 'h3'
  /** O tamanho visual: `h1` 84/88, `h2` 56/62, `h3` 36/42 (em 1440). */
  tamanho?: 'h1' | 'h2' | 'h3'
  /** A primeira linha e, quando há, a segunda: a ênfase é a segunda linha inteira em itálico. */
  linhas: readonly [string] | readonly [string, string]
  id?: string
  className?: string
}

const CLASSE = { h1: 'cm-h1', h2: 'cm-h2', h3: 'cm-h3' } as const

/**
 * Título em Literata 600 com a segunda linha em itálico (DESIGN.md 2). As linhas sobem 48 px e
 * aparecem ao entrar na janela, uma a cada 250 ms (M4); com movimento reduzido, ficam paradas. O leitor
 * de tela lê o título inteiro uma vez.
 */
export function Titulo({ nivel, tamanho = nivel, linhas, id, className }: Props) {
  const { deslocamentoPx, duracaoMs, curva, escalonamentoMs } = CATALOGO.M4
  return (
    <TextoAnimado
      as={nivel}
      className={[CLASSE[tamanho], className].filter(Boolean).join(' ')}
      classeSegundaLinha="cm-segunda-linha"
      deslocamentoPx={deslocamentoPx}
      duracaoMs={duracaoMs}
      curva={curva}
      escalonamentoMs={escalonamentoMs}
      id={id}
    >
      {linhas.join('\n')}
    </TextoAnimado>
  )
}
