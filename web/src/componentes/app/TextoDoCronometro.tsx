import { tempoFalado } from './tempoFalado.ts'

interface Props {
  /** "mm:ss" ou "h:mm:ss", já formatado. */
  tempo: string
}

/**
 * O miolo de um `role="timer"` (A11Y-010): os algarismos visíveis ficam fora da árvore de acessibilidade e o
 * leitor de tela ouve o mesmo tempo com as unidades, num texto só dele. Não muda o que a tela mostra nem mede.
 */
export function TextoDoCronometro({ tempo }: Props) {
  return (
    <>
      <span aria-hidden="true">{tempo}</span>
      <span className="sr-only">{tempoFalado(tempo)}</span>
    </>
  )
}
