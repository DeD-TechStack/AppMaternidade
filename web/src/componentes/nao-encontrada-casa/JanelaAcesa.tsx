import u340 from './m11-janela-340w.webp'
import u361 from './m11-janela-361w.webp'
import u542 from './m11-janela-542w.webp'
import './naoEncontradaCasa.css'

/**
 * T4-S1: o canto da rua de M11 com uma janela acesa ao longe. Sem moldura, sem chão desenhado: o recorte é do mesmo
 * cacau da página. O pai (`.cm-nf-quadro`) é quem o assenta: rente à borda direita e ao pé da primeira dobra.
 */
export function JanelaAcesa({ alt }: { alt: string }) {
  return (
    <div className="cm-nf-janela">
      <img
        src={u542}
        srcSet={`${u340} 340w, ${u361} 361w, ${u542} 542w`}
        sizes="(min-width: 768px) 361px, 340px"
        width={542}
        height={421}
        alt={alt}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </div>
  )
}
