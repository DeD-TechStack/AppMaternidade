import { exigirTexto, violacao } from './contrato.ts'

interface Props {
  titulo: string
  texto: string
  /** De 2 a 6 fatos curtos. O primeiro e o de abertura. */
  itens: readonly string[]
}

const PECA = 'FaixaProva'

/**
 * FaixaProva (DS1:RF-12): um titulo (`h2`), um texto e uma lista de fatos em linhas (`ul[data-prova-lista]`), com
 * um fio de 1 px entre elas. O primeiro fato e de abertura e os outros de corpo. Nunca uma grade de blocos iguais:
 * sem cartao, sem pessoa, sem avatar e sem citacao.
 */
export function FaixaProva({ titulo, texto, itens }: Props) {
  exigirTexto(PECA, 'titulo', titulo)
  exigirTexto(PECA, 'texto', texto)
  if (itens.length < 2 || itens.length > 6) violacao(PECA, 'itens must have from 2 to 6 entries')
  for (const item of itens) exigirTexto(PECA, 'item', item)

  return (
    <div data-faixa-prova="" className="cm-faixa-prova">
      <h2 className="text-titulo-1 font-titulo cm-sec-titulo">{titulo}</h2>
      <p className="text-corpo font-texto cm-sec-texto">{texto}</p>
      <ul data-prova-lista="">
        {itens.map((item, i) => (
          <li key={item} className={i === 0 ? 'text-abertura font-texto' : 'text-corpo font-texto'}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
