import type { RefObject } from 'react'
import { CAPTURA_Y, MOLDURA_NOITE } from './midia.ts'

interface Props {
  refFolha: RefObject<HTMLDivElement | null>
  refInterior: RefObject<HTMLDivElement | null>
}

/**
 * The night sheet (`[data-troca-noite]`, moment 2): ONE full-bleed clipping sheet as tall as the stage. The outer box
 * takes `translateX(t)` and clips; the inner box takes `translateX(-t)`, so what it holds (the cacau wall, the night
 * floor and the night twin of the frame) stays still while the edge moves. At rest, and with reduced motion, the sheet
 * sits at the seam with no transform, and the twin is clipped out of sight. It never uses `clip-path` or `width`.
 *
 * The twin is the frame's night body (`MOLDURA_NOITE`) over the same capture file as the day frame (one request): an
 * `aria-hidden` copy, with an empty `alt`, registered to the day frame because both take the same box from the page
 * stylesheet. A frame pixel is never a cacau body on a cacau wall: the night body is `#6E6560`.
 */
export function FolhaDaNoite({ refFolha, refInterior }: Props) {
  return (
    <div ref={refFolha} data-troca-noite="" className="ic-folha" aria-hidden="true">
      <div ref={refInterior} data-troca-noite-interior="" className="ic-folha-interior">
        <div data-troca-noite-parede="" className="ic-folha-parede" />
        <div className="ic-folha-piso" />
        <figure className="cm-produto-moldura ic-gemea">
          <img
            data-troca-gemea-tela=""
            src={CAPTURA_Y.src}
            width={CAPTURA_Y.largura}
            height={CAPTURA_Y.altura}
            alt=""
            loading="lazy"
            decoding="async"
          />
          <img
            data-troca-gemea-arte=""
            src={MOLDURA_NOITE.src}
            width={MOLDURA_NOITE.largura}
            height={MOLDURA_NOITE.altura}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>
    </div>
  )
}
