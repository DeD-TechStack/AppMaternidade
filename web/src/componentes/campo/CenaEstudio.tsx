import type { ReactNode } from 'react'
import { RevelaNaRolagem } from '../../movimento/RevelaNaRolagem.tsx'
import { PainelCampo } from './PainelCampo.tsx'
import { srcSetWebp, urlPublica } from './urlPublica.ts'

interface Props {
  /** O caminho da cena em `web/public`, sem o sufixo: `/cenas/sistema/trio-mel` lê `trio-mel@1x.webp` e `@2x`. */
  base: string
  /** O tamanho da imagem em 1×, em px (guarda a proporção antes de a imagem chegar). */
  largura: number
  altura: number
  /** O que a cena mostra: as nossas telas, nos aparelhos. */
  alt: string
  /** A primeira dobra carrega a imagem na hora; as outras, ao chegar perto. */
  prioritaria?: boolean
  /** O que flutua sobre o painel (um `CartaoFlutuante`). */
  children?: ReactNode
  className?: string
}

/**
 * Cena de estúdio (DESIGN.md 4): a imagem WebP 1× e 2× (`<picture>`, com largura e altura explícitas)
 * dentro de um painel de mel com a luz de estúdio. A mídia vai de 0,9 a 1 nos primeiros 360 px de
 * rolagem (M3); o cartão flutuante, se houver, fica fora da escala.
 */
export function CenaEstudio({ base, largura, altura, alt, prioritaria = false, children, className }: Props) {
  return (
    <PainelCampo variante="mel" luz className={['cm-cena', children ? 'cm-com-flutuante' : null, className].filter(Boolean).join(' ')}>
      <RevelaNaRolagem className="cm-cena-midia">
        <picture>
          <source type="image/webp" srcSet={srcSetWebp(base)} />
          <img
            src={urlPublica(`${base}@1x.webp`)}
            srcSet={srcSetWebp(base)}
            width={largura}
            height={altura}
            alt={alt}
            loading={prioritaria ? 'eager' : 'lazy'}
            decoding="async"
            data-cena=""
          />
        </picture>
      </RevelaNaRolagem>
      {children}
    </PainelCampo>
  )
}
