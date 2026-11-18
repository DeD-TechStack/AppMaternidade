import type { CSSProperties, ReactNode } from 'react'

/** Os giros permitidos, em graus. */
type GiroCartao = -4 | -2 | 2 | 4

interface Props {
  /** Giro fixo do cartão (`rotate`, nunca 3D). */
  giro: GiroCartao
  /** Onde o cartão sobra do painel: 24 a 48 px para fora da borda. */
  posicao?: 'baixo-esquerda' | 'baixo-direita' | 'topo-direita'
  /** O conteúdo do cartão: interface de verdade, em HTML. */
  children: ReactNode
  className?: string
}

/**
 * Cartão flutuante (DESIGN.md 4): branco, raio 20, `--sombra-flutuante`, girado de leve e sobrando da
 * borda do painel. Já nasce no lugar, visível desde a primeira pintura. Vai dentro de um `PainelCampo`
 * (ou `CenaEstudio`), que é o seu referencial.
 */
export function CartaoFlutuante({ giro, posicao = 'baixo-esquerda', children, className }: Props) {
  const estilo = { rotate: `${giro}deg` } as CSSProperties
  return (
    <div className={['cm-flutuante', className].filter(Boolean).join(' ')} data-posicao={posicao} data-giro={giro}>
      <div>
        <div className="cm-flutuante-cartao" style={estilo}>
          {children}
        </div>
      </div>
    </div>
  )
}
