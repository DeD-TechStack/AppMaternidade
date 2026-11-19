import { urlPublica } from '../campo/urlPublica.ts'
import './naoEncontradaCasa.css'

/**
 * T4-S1: o canto da rua de M11 com uma janela acesa ao longe. Sem moldura, sem chão desenhado: o recorte é do mesmo
 * cacau da página. O pai (`.cm-nf-quadro`) é quem o assenta: rente à borda direita e ao pé da primeira dobra.
 */
export function JanelaAcesa({ alt }: { alt: string }) {
  /* Servidos pela ASSET-2 (web/public/cenas/nao-encontrada/), já assentados na cor da parede.
     Calculados aqui, na chamada, porque `urlPublica` lê a base do site (Pages) no momento do uso. */
  const u340 = urlPublica('/cenas/nao-encontrada/m11-janela-340w.webp')
  const u361 = urlPublica('/cenas/nao-encontrada/m11-janela-361w.webp')
  const u542 = urlPublica('/cenas/nao-encontrada/m11-janela-542w.webp')
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
