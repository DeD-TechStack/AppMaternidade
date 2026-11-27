import { BotaoLargo } from './BotaoLargo.tsx'
import { exigirTexto, exigirTom, type Tom } from './contrato.ts'

interface Props {
  titulo: string
  acao: { rotulo: string; para: string }
  tom: Tom
}

const PECA = 'Fechamento'

/**
 * Fechamento (DS1:RF-12): o ultimo bloco de uma pagina, um `h2` de `titulo-1` e uma unica acao do tamanho do
 * BotaoLargo. E o unico bloco centrado. De noite a pilula e de mel com texto de cacau; de dia, de cacau com texto
 * de papel.
 */
export function Fechamento({ titulo, acao, tom }: Props) {
  exigirTexto(PECA, 'titulo', titulo)
  exigirTom(PECA, tom)

  return (
    <div data-fechamento="" data-tom={tom} className="cm-fechamento">
      <h2 className="text-titulo-1 font-titulo cm-sec-titulo">{titulo}</h2>
      <BotaoLargo rotulo={acao.rotulo} para={acao.para} variante={tom === 'noite' ? 'mel' : 'primario'} />
    </div>
  )
}
