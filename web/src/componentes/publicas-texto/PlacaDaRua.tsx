import { placa } from '../campo/imagens.ts'
import m11Janela from '../../assets/cenas/nao-encontrada/m11-janela-542w.webp?w=340;361;542&format=avif;webp&as=picture'

/* A mesma placa que a 404 serve (M11): o build gera o AVIF e o WebP de 340, 361 e 542 de largura, com hash. Aqui ela é
   mostrada em 340 px (densidade nativa 1,59), nunca ampliada. O `src` é o maior (542), como na 404. */
const RUA = placa(m11Janela, '340px', 542)

/**
 * T2-S1: o canto da rua de M11 com uma janela acesa, na parte direita da abertura de cacau. Decorativa (`alt=""`):
 * o título e o texto da página não dependem dela. Sem moldura nem chão desenhado: o céu do recorte é o cacau da
 * abertura. Quem a assenta (rente à borda direita e ao pé da abertura) é `publicasTexto.css`.
 */
export function PlacaDaRua() {
  return (
    <div className="pt-placa" aria-hidden="true">
      <picture>
        <source type="image/avif" srcSet={RUA.avif} sizes={RUA.sizes} />
        <img
          src={RUA.src}
          srcSet={RUA.srcSet}
          sizes={RUA.sizes}
          width={RUA.largura}
          height={RUA.altura}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
    </div>
  )
}
