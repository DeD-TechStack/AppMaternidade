import { INI } from '../../conteudo/inicio.ts'
import { ProdutoEmMoldura } from '../secoes/ProdutoEmMoldura.tsx'
import { CAPTURA_Y_ALTA as CAPTURA_Y, ESTILO_DA_ROLAGEM, MOLDURA_NOITE } from './midia.ts'

/**
 * The stage below 1024 px wide (`[data-troca-palco]`): a page-owned wrapper around the first framed screen, the last
 * child of the hero, 16 px under the caption. The frame rests in its night raster on the cacau wall: no pin, no sheet and
 * no twin at this width (RECUT §7). From 1024 px the stage is band 2 (`FaixaNoite`). The frame holds a real capture
 * (manifest state `Y`), never a drawn screen.
 */
export function PalcoTroca() {
  return (
    // The two ends of the Histórico pan (MANIFESTO rolagem_px), read by inicio-casa.css as `--produto-rolagem`.
    <div data-troca-palco="" className="ic-palco" style={ESTILO_DA_ROLAGEM}>
      <ProdutoEmMoldura tela={{ ...CAPTURA_Y, alt: INI.altTela1 }} moldura={MOLDURA_NOITE} rolavel />
    </div>
  )
}
