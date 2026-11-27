import { Telefone } from '../inicio-composicao/pecas.tsx'
import { ARTE_COMO, COMO_FUNCIONA as T } from '../../conteudo/casa/comoFunciona.ts'
import './como-casa.css'

const ID = 'cf-nota'

/**
 * Faixa 4 (areia): "Pomada só à noite." O celular das Notas nasce do chão (base cortada pela linha de chão), ao lado
 * do título e do texto.
 */
export function BandaNota() {
  return (
    <section className="cf-faixa cf-nota" aria-labelledby={ID}>
      <div className="cf-nota-grade">
        <div className="co-texto cf-nota-texto">
          <h2 id={ID} className="co-h2">
            {T.h2Nota}
          </h2>
          <p className="co-p">{T.pNota}</p>
        </div>
        <Telefone
          arte={ARTE_COMO}
          nome="notas"
          alt={T.altTela2}
          sizes="(min-width: 69em) 360px, 300px"
          className="cf-nota-fone"
        />
      </div>
    </section>
  )
}
