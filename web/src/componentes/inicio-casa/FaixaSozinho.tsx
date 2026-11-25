import { INI } from '../../conteudo/inicio.ts'
import { ID_FAIXA_SO } from './ids.ts'
import { M04_FAIXA } from './midia.ts'

/**
 * Band 4, on papel: the question of whoever cares alone, its answer and the plate of the 15:00 scene, unboxed. The plate
 * is a lossless WebP whose ground is the papel token, so it has no visible box; its frame (`1200 / 832`, clipped) shows
 * rows 0 to 832 and the band line cuts the mat at its widest row, where band 5's areia goes on. The caption of the 15:00
 * scene (`ini.leg3`) is not rendered: the bands run in time order (FREEZE 13.2).
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
          src={M04_FAIXA.src}
          srcSet={M04_FAIXA.srcSet}
          sizes={M04_FAIXA.sizes}
          width={M04_FAIXA.largura}
          height={M04_FAIXA.altura}
          alt={INI.altCena3}
          loading="lazy"
          decoding="async"
        />
      </figure>
    </div>
  )
}
