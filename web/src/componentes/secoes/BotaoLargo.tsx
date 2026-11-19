import { Botao } from '../base/Botao.tsx'
import { exigirCaminho, exigirTexto, violacao } from './contrato.ts'

interface Props {
  /** O rotulo: uma linha de ate 28 caracteres. */
  rotulo: string
  /** O destino interno: comeca com "/". */
  para: string
  /** `primario` (cacau, de dia) ou `mel` (sobre o cacau, de noite). */
  variante: 'primario' | 'mel'
}

const PECA = 'BotaoLargo'
const LIMITE = 28

/**
 * BotaoLargo (DS1:RF-12): a pilula de acao de uma secao, um link `a[data-botao-largo].cm-botao`. Do tamanho do quadro
 * abaixo de 768 (390 menos duas margens de 20 = 350 px) e de largura propria dali em diante. A variante `mel`
 * leva `data-botao-mel`, para a medicao de mel sobre o cacau.
 */
export function BotaoLargo({ rotulo, para, variante }: Props) {
  exigirTexto(PECA, 'rotulo', rotulo)
  if (rotulo.length > LIMITE) violacao(PECA, `rotulo must have at most ${LIMITE} characters`)
  exigirCaminho(PECA, 'para', para)
  if (variante !== 'primario' && variante !== 'mel') violacao(PECA, 'variante must be "primario" or "mel"')

  return (
    <Botao
      to={para}
      variante={variante}
      className="cm-botao-largo"
      data-botao-largo=""
      data-botao-mel={variante === 'mel' ? '' : undefined}
    >
      {rotulo}
    </Botao>
  )
}
