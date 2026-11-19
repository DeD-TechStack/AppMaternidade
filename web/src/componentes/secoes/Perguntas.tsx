import { exigirTexto, violacao } from './contrato.ts'

interface Props {
  titulo: string
  /** Ate 8 perguntas, todas com a resposta a vista. Sem itens, nao renderiza nada. */
  itens: readonly { pergunta: string; resposta: string }[]
}

const PECA = 'Perguntas'

/**
 * Perguntas (DS1:RF-12): um `h2` e uma lista em que cada pergunta e um `h3` de `titulo-4` e cada resposta um `p` de
 * corpo, todas no DOM e a vista: nada que abra e feche (sem botao, `details` nem `aria-expanded`).
 */
export function Perguntas({ titulo, itens }: Props) {
  if (itens.length === 0) return null
  if (itens.length > 8) violacao(PECA, 'itens must have at most 8 entries')
  exigirTexto(PECA, 'titulo', titulo)
  for (const item of itens) {
    exigirTexto(PECA, 'pergunta', item.pergunta)
    exigirTexto(PECA, 'resposta', item.resposta)
  }

  return (
    <div data-perguntas="" className="cm-perguntas">
      <h2 className="text-titulo-1 font-titulo cm-sec-titulo">{titulo}</h2>
      <ul className="cm-perguntas-lista">
        {itens.map((item) => (
          <li key={item.pergunta}>
            <h3 className="text-titulo-4 font-titulo cm-sec-titulo">{item.pergunta}</h3>
            <p className="text-corpo font-texto cm-sec-texto">{item.resposta}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
