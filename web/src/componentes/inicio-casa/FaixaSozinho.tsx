import { INI } from '../../conteudo/inicio.ts'
import { ID_FAIXA_SO } from './ids.ts'
import { M04 } from './midia.ts'

/**
 * Band 4, on papel: the question of whoever cares alone, its answer and an M04 crop of the scene. The caption of the
 * 15:00 scene (`ini.leg3`) is not rendered: the bands run in time order (FREEZE 13.2).
 */
export function FaixaSozinho() {
  return (
    <div className="ic-so">
      <div className="ic-so-texto">
        <h2 id={ID_FAIXA_SO} className="text-titulo-1 font-titulo cm-sec-titulo">
          {INI.h2So}
        </h2>
        <p className="text-corpo font-texto cm-sec-texto">{INI.pSo}</p>
      </div>
      <figure className="ic-so-cena">
        <img
          src={M04.src}
          srcSet={M04.srcSet}
          sizes={M04.sizes}
          width={M04.largura}
          height={M04.altura}
          alt={INI.altCena3}
          loading="lazy"
          decoding="async"
        />
      </figure>
    </div>
  )
}
