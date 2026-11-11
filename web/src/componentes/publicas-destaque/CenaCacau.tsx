import type { ReactNode } from 'react'
import { RevelaNaRolagem } from '../../movimento/RevelaNaRolagem.tsx'
import { PainelCampo } from '../campo/PainelCampo.tsx'
import { srcSetWebp, urlPublica } from '../campo/urlPublica.ts'
import './publicas-destaque.css'

interface Props {
  /** O caminho da cena em `web/public`, sem o sufixo (`@1x.webp` e `@2x.webp`). */
  base: string
  /** O tamanho da imagem em 1×, em px. */
  largura: number
  altura: number
  /** O que a cena mostra: as nossas telas, nos aparelhos. */
  alt: string
  prioritaria?: boolean
  /** O que flutua sobre o painel (um `CartaoFlutuante`). */
  children?: ReactNode
}

/**
 * A cena de estúdio sobre o cacau (os tablets da S3): a mesma moldura da `CenaEstudio` (`<picture>`
 * WebP 1× e 2×, largura e altura explícitas, a mídia de 0,9 a 1 presa à rolagem), num painel de
 * cacau em vez do mel. Nada de traço preto aqui: as ilustrações não vão sobre o cacau.
 */
export function CenaCacau({ base, largura, altura, alt, prioritaria = false, children }: Props) {
  return (
    <PainelCampo
      variante="cacau"
      className={['cm-cena', 'pd-cena-cacau', children ? 'cm-com-flutuante' : null].filter(Boolean).join(' ')}
    >
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
