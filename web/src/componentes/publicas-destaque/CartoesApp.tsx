import type { ReactNode } from 'react'
import './publicas-destaque.css'

// As telas de exemplo das páginas públicas, em HTML de verdade (DESIGN.md 4), com a família fictícia:
// Juliana (mãe), Ícaro, Carla e a bebê Heloísa. Cada página tem no máximo um CartaoFlutuante (girado,
// com a sombra flutuante); as outras telas vão num CartaoPlano, no fluxo, sem giro e com a sombra de
// cartão. Os botões desenhados aqui são parte da tela de exemplo, não controles desta página.

/** O cartão de app no fluxo do painel: branco, raio 20, `--sombra-cartao`, sem giro nem sobra. */
export function CartaoPlano({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={['pd-cartao-plano', className].filter(Boolean).join(' ')} data-cartao-plano="">
      {children}
    </div>
  )
}

