import type { ParteDoArtigo } from '../../conteudo/desenvolvimento/tipos.ts'
import './publicas-destaque.css'

/** As partes de um artigo de Desenvolvimento: um h3 e os parágrafos de cada uma. */
export function PartesDoArtigo({ partes }: { partes: readonly ParteDoArtigo[] }) {
  return (
    <div className="pd-partes">
      {partes.map((parte) => (
        <div key={parte.titulo}>
          <h3 className="cm-h4">{parte.titulo}</h3>
          {parte.textos.map((texto) => (
            <p key={texto} className="cm-corpo">
              {texto}
            </p>
          ))}
        </div>
      ))}
    </div>
  )
}
