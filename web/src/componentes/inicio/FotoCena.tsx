import { srcSetWebp, urlPublica } from '../campo/urlPublica.ts'
import './inicio.css'

interface Props {
  /** O caminho da cena em `web/public`, sem o sufixo: `/cenas/inicio/tabela` lê `tabela@1x.webp` e `@2x`. */
  base: string
  /** O tamanho da imagem em 1×, em px (guarda a proporção antes de a imagem chegar). */
  largura: number
  altura: number
  /** O que a cena mostra: as nossas telas, nos aparelhos. */
  alt: string
  /** Classe a mais da `<picture>` (onde ela fica no painel). */
  className?: string
}

/**
 * Uma cena de estúdio sem o painel de mel da `CenaEstudio`: a `<picture>` WebP 1× e 2×, com largura
 * e altura explícitas. Carrega na hora: são WebPs pequenos, e o painel ao lado nunca pode ficar vazio.
 * Vai sobre o cacau ou num painel de areia.
 */
export function FotoCena({ base, largura, altura, alt, className }: Props) {
  return (
    <picture className={['in-foto-quadro', className].filter(Boolean).join(' ')}>
      <source type="image/webp" srcSet={srcSetWebp(base)} />
      <img
        src={urlPublica(`${base}@1x.webp`)}
        srcSet={srcSetWebp(base)}
        width={largura}
        height={altura}
        alt={alt}
        loading="eager"
        decoding="async"
        className="in-foto"
      />
    </picture>
  )
}
