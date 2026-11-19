import type { ParteDoArtigo } from '../../conteudo/desenvolvimento/tipos.ts'
import './desenvolvimento-casa.css'

/** As partes de um artigo, na ordem: o subtítulo (h3) e os parágrafos de cada uma, todos a vista. */
export function Partes({ partes }: { partes: readonly ParteDoArtigo[] }) {
  return (
    <>
      {partes.map((parte) => (
        <div className="dc-parte" key={parte.titulo}>
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
