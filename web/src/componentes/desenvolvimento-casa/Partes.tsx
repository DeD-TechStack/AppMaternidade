import type { ParteDoArtigo } from '../../conteudo/desenvolvimento/tipos.ts'
import './desenvolvimento-casa.css'

interface Props {
  partes: readonly ParteDoArtigo[]
  variante?: 'padrao' | 'pilares' | 'trilho'
}

/** As partes de um artigo, na ordem: o subtítulo (h3) e os parágrafos de cada uma, todos à vista. */
export function Partes({ partes, variante = 'padrao' }: Props) {
  const classe =
    variante === 'pilares'
      ? 'dc-parte dc-parte-pilar'
      : variante === 'trilho'
        ? 'dc-parte dc-parte-trilho'
        : 'dc-parte'

  return (
    <>
      {partes.map((parte) => (
        <div className={classe} key={parte.titulo}>
          <h3 className="text-titulo-4 font-titulo cm-sec-titulo">{parte.titulo}</h3>
          {parte.textos.map((texto) => (
            <p className="text-corpo font-texto cm-sec-texto" key={texto}>
              {texto}
            </p>
          ))}
        </div>
      ))}
    </>
  )
}
