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
}

/**
 * Uma cena de estúdio sem o painel de mel da `CenaEstudio`: a `<picture>` WebP 1× e 2×, com largura
 * e altura explícitas, que carrega ao chegar perto da janela. Vai sobre o cacau ou num painel de areia.
 */
export function FotoCena({ base, largura, altura, alt }: Props) {
  return (
    <picture className="in-foto-quadro">
      <source type="image/webp" srcSet={srcSetWebp(base)} />
      <img
        src={urlPublica(`${base}@1x.webp`)}
        srcSet={srcSetWebp(base)}
        width={largura}
        height={altura}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="in-foto"
      />
    </picture>
  )
}
