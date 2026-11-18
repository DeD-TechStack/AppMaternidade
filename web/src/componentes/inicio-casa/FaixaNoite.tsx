import { useMemo, useRef, useState } from 'react'
import { INI } from '../../conteudo/inicio.ts'
import { LegendaDaTroca } from '../../movimento/troca/LegendaDaTroca.tsx'
import { LuzDaLampada } from '../../movimento/troca/LuzDaLampada.tsx'
import { useNoitePresa } from '../../movimento/troca/usarPalco.ts'
import { Legenda } from '../secoes/Legenda.tsx'
import { TomDaFaixa } from '../secoes/FaixaInteira.tsx'
import { ProdutoEmMoldura } from '../secoes/ProdutoEmMoldura.tsx'
import { FolhaDaNoite } from './FolhaDaNoite.tsx'
import { ID_FAIXA_NOITE } from './ids.ts'
import { CAPTURA_Y, LUZ_M06, M06, MOLDURA_DIA } from './midia.ts'

interface Props {
  /** From 1024 px wide: the band is the stage (the first framed screen stands in it, on the day side of the seam). */
  larga: boolean
  /** Where the pin is built (1024 wide, 812 high, motion allowed): the stage sticks, the night sheet crosses it. */
  fixo: boolean
}

/**
 * Band 2, the night. From 1024 px wide the band is the stage of moment 2 (`[data-troca-palco]`): the day wall and the
 * day floor, the first framed screen (day body) standing on the floor line 32 px left of the seam, the night sheet, and
 * the night column (the paragraph, M06 and the caption) above the sheet. Where the pin is built the band is also the
 * track (stage + D) and the stage sticks; the caption becomes the one node of moment 3 (`ini.leg1` while p is under 0.5,
 * `ini.leg2` from it). Everywhere else the stage rests: no pin, no spacer, no transform, the sheet at the seam, and
 * the two captions static (`ini.leg1` under the hero plate, `ini.leg2` under M06). Below 1024 the band is cacau all the
 * way and the frame lives in the hero. M06's lamp lights when 10 % of the plate is in view, in every case.
 */
export function FaixaNoite({ larga, fixo }: Props) {
  const palco = useRef<HTMLDivElement>(null)
  const folha = useRef<HTMLDivElement>(null)
  const interior = useRef<HTMLDivElement>(null)
  const costura = useRef<HTMLSpanElement>(null)
  const alvos = useMemo(() => ({ palco, folha, interior, costura }), [])
  const [lado, setLado] = useState<1 | 2>(1)
  useNoitePresa(alvos, fixo, setLado)

  return (
    <TomDaFaixa fundo="cacau">
      <div
        ref={palco}
        className="ic-estagio"
        data-troca-palco={larga ? '' : undefined}
        data-troca-fixo={fixo ? '' : undefined}
      >
        {larga ? (
          <>
            <span ref={costura} className="ic-medida" aria-hidden="true" />
            <div className="ic-piso-dia" aria-hidden="true" />
            <ProdutoEmMoldura tela={{ ...CAPTURA_Y, alt: INI.altTela1 }} moldura={MOLDURA_DIA} />
            <FolhaDaNoite refFolha={folha} refInterior={interior} />
          </>
        ) : null}
        <div className="ic-noite-conteudo">
          <div className="ic-noite-texto" data-costura-lado="noite">
            <h2 id={ID_FAIXA_NOITE} className="text-titulo-1 font-titulo cm-sec-titulo">
              {INI.h2Noite}
            </h2>
            <p className="text-corpo font-texto cm-sec-texto">{INI.pNoite}</p>
          </div>
          <figure className="ic-m06">
            <img
              src={M06.src}
              srcSet={M06.srcSet}
              sizes={M06.sizes}
              width={M06.largura}
              height={M06.altura}
              alt={INI.altCena2}
              loading="lazy"
              decoding="async"
            />
            <LuzDaLampada
              cone={LUZ_M06.cone}
              poca={LUZ_M06.poca}
              memoria="casa-luz-m06"
              gatilho="vista"
              tamanho={{ largura: M06.largura, altura: M06.altura }}
            />
          </figure>
          <div className="ic-piso-noite" data-costura-lado="noite">
            {fixo ? <LegendaDaTroca textos={[INI.leg1, INI.leg2]} lado={lado} /> : <Legenda texto={INI.leg2} tom="noite" />}
          </div>
        </div>
      </div>
    </TomDaFaixa>
  )
}
