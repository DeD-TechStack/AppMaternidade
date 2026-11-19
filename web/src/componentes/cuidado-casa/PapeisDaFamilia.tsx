import { CUIDADO } from '../../conteudo/casa/cuidado.ts'
import './cuidado-casa.css'

/**
 * Os três papéis, numa lista de três linhas (o nome, para quem é, o que pode) com um fio de 1 px entre as linhas.
 * Nunca três cartões: em 1440 são colunas de 200, 400 e o resto; em 390, um bloco por papel. O nome da lista é
 * `aria-label` (não desenhado).
 */
export function PapeisDaFamilia() {
  return (
    <div className="cc-papeis-bloco">
      <h2 id="cc-papeis" className="text-titulo-1 font-titulo cm-sec-titulo cc-medida">
        {CUIDADO.papeis.h2}
      </h2>
      <ul aria-label={CUIDADO.papeis.legenda} className="cc-papeis">
        {CUIDADO.papeis.linhas.map((linha) => (
          <li key={linha.nome} className="cc-papel">
            <h3 className="text-titulo-4 font-titulo cm-sec-titulo">{linha.nome}</h3>
            <p className="text-corpo font-texto cm-sec-texto">{linha.quem}</p>
            <p className="text-corpo font-texto cm-sec-texto">{linha.pode}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
