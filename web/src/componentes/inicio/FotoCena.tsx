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
  /** `lazy` (padrão) carrega ao chegar perto da janela; `eager`, na hora (a cena da primeira dobra). */
  carregamento?: 'lazy' | 'eager'
  /** Classe a mais da `<picture>` (onde ela fica no painel). */
  className?: string
  /** O `data-h` da `<picture>` quando ela é filha direta de uma `Colunas` (`"coluna"`). */
  dataH?: string
}

/**
 * Uma cena de estúdio sem o painel de mel da `CenaEstudio`: a `<picture>` WebP 1× e 2×, com largura
 * e altura explícitas, que reservam a caixa antes de a imagem chegar. Carrega ao chegar perto da
 * janela; `carregamento="eager"` a traz na hora. Vai sobre o cacau ou num painel de areia.
 */
export function FotoCena({ base, largura, altura, alt, carregamento = 'lazy', className, dataH }: Props) {
  return (
    <picture className={['in-foto-quadro', className].filter(Boolean).join(' ')} data-h={dataH}>
      <source type="image/webp" srcSet={srcSetWebp(base)} />
      <img
        src={urlPublica(`${base}@1x.webp`)}
        srcSet={srcSetWebp(base)}
        width={largura}
        height={altura}
        alt={alt}
        loading={carregamento}
        decoding="async"
        className="in-foto"
      />
    </picture>
  )
}
