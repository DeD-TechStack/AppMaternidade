import type { Imagem } from '../secoes/contrato.ts'

// As placas de cena (as cinco páginas da casa) saem do vite-imagetools: UM arquivo-mestre por vaga em
// `src/assets/cenas/`, e o build gera os arquivos AVIF e WebP de cada largura, com o hash no nome. Um import como
//   import m05 from '../../assets/cenas/inicio/m05-sol-1672w.webp?w=900;1672&format=avif;webp&as=picture'
// chega aqui como `{ sources: { avif, webp }, img }` (o WebP é a reserva, por ser o último formato). O auxiliar abaixo
// devolve o `Imagem` de sempre, com o `srcSet` WebP no `srcSet` e o `srcSet` AVIF em `avif`.

/** A forma que o vite-imagetools devolve com `&as=picture` (ver `src/imagetools.d.ts`). */
interface PlacaGerada {
  sources: Record<string, string>
  img: { src: string; w: number; h: number; srcset?: string }
}

/**
 * Monta a `Imagem` de uma vaga. `larguraDoSrc` é a largura do arquivo que fica em `src` (o de hoje, sem `srcset`);
 * `largura` e `altura` são as do maior arquivo (o mestre). `altura`, só quando a página sempre levou na `<img>` um
 * valor 1 px diferente do mestre: a proporção que reserva a caixa não pode mudar.
 */
export function placa(
  gerada: PlacaGerada,
  sizes: string,
  larguraDoSrc: number,
  altura: number = gerada.img.h,
): Imagem & { srcSet: string; avif: string; sizes: string } {
  const webp: string | undefined = gerada.sources.webp
  const avif: string | undefined = gerada.sources.avif
  if (webp === undefined || avif === undefined) {
    throw new Error('placa: o import precisa de format=avif;webp e as=picture')
  }
  const entrada = webp.split(', ').find((item) => item.endsWith(` ${larguraDoSrc}w`))
  if (entrada === undefined) throw new Error(`placa: não há arquivo WebP de ${larguraDoSrc}w no srcset`)
  return {
    src: entrada.slice(0, entrada.lastIndexOf(' ')),
    srcSet: webp,
    avif,
    sizes,
    largura: gerada.img.w,
    altura,
  }
}
