import { placa } from '../campo/imagens.ts'
import m11Janela from '../../assets/cenas/nao-encontrada/m11-janela-542w.webp?w=340;361;542&format=avif;webp&as=picture'
import './naoEncontradaCasa.css'

/* A placa sai de um mestre (web/src/assets/cenas/nao-encontrada/), já assentado na cor da parede: o build gera o AVIF
   e o WebP de 340, 361 e 542 de largura, com hash. O `src` é o maior (542), como sempre foi. */
const JANELA = placa(m11Janela, '(min-width: 768px) 361px, 340px', 542)

/**
 * T4-S1: o canto da rua de M11 com uma janela acesa ao longe. Sem moldura, sem chão desenhado: o recorte é do mesmo
 * cacau da página. O pai (`.cm-nf-quadro`) é quem o assenta: rente à borda direita e ao pé da primeira dobra.
 */
export function JanelaAcesa({ alt }: { alt: string }) {
  return (
    <div className="cm-nf-janela">
      <picture>
        <source type="image/avif" srcSet={JANELA.avif} sizes={JANELA.sizes} />
        <img
          src={JANELA.src}
          srcSet={JANELA.srcSet}
          sizes={JANELA.sizes}
          width={JANELA.largura}
          height={JANELA.altura}
          alt={alt}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
    </div>
  )
}
