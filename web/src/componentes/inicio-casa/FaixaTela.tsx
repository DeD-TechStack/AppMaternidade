import { INI } from '../../conteudo/inicio.ts'
import { ProdutoEmMoldura } from '../secoes/ProdutoEmMoldura.tsx'
import { ID_FAIXA_TELA } from './ids.ts'
import { CAPTURA_N, MOLDURA_NOITE } from './midia.ts'

/**
 * Band 3, on cacau: "Dormiu às 20:30." and the second framed real screen (manifest state `N`, Hoje at 21:42, in the
 * night frame raster on the cacau wall). The frame stands on the night floor (`.ic-chao`, `chao-noite` from edge to
 * edge), like the people of the plates; the text column is centred on the frame, so no dead wall under it. No button.
 */
export function FaixaTela() {
  return (
    <div className="ic-tela">
      <div className="ic-tela-texto">
        <h2 id={ID_FAIXA_TELA} className="text-exibicao font-titulo cm-sec-titulo ic-h2-exibicao">
          {INI.h2Tela}
        </h2>
        <p className="text-corpo font-texto cm-sec-texto">{INI.pTela}</p>
      </div>
      <ProdutoEmMoldura tela={{ ...CAPTURA_N, alt: INI.altTela2 }} moldura={MOLDURA_NOITE} />
      <div className="ic-chao" aria-hidden="true" />
    </div>
  )
}
