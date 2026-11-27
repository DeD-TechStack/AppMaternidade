import { DESENVOLVIMENTO_CASA as D, MOLDURA_DIA, TELA_HISTORICO } from '../../conteudo/casa/desenvolvimento.ts'
import { Legenda } from '../secoes/Legenda.tsx'
import { ProdutoEmMoldura } from '../secoes/ProdutoEmMoldura.tsx'
import './desenvolvimento-casa.css'

/**
 * Faixa 2 ("No site, é só um registro.", sobre areia): junta a prova real do produto (Histórico das 15:00 sob a
 * moldura do dia) e a legenda assinada exatamente ao lado do texto que explica como o tummy time entra na rotina.
 */
export function Registro() {
  return (
    <div className="dc-grade">
      <div className="dc-registro">
        <div className="dc-registro-texto">
          <h2 id="dc-registro-titulo" className="dc-titulo text-titulo-1 font-titulo cm-sec-titulo">
            {D.h2Registro}
          </h2>
          <p className="text-abertura font-texto cm-sec-texto">{D.pRegistro}</p>
          <div className="dc-registro-legenda">
            <Legenda texto={D.legenda1} tom="dia" />
          </div>
        </div>
        <div className="dc-moldura">
          <ProdutoEmMoldura tela={{ ...TELA_HISTORICO, alt: D.altTela1 }} moldura={MOLDURA_DIA} />
        </div>
      </div>
    </div>
  )
}
