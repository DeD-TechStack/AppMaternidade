import type { ComponentPropsWithoutRef, CSSProperties } from 'react'

/** Estilo com variáveis CSS (`--aw`, `--esp`, `--ry`…): o React só tipa as propriedades normais. */
export type Vars = CSSProperties & Record<`--${string}`, string | number | undefined>

/** Passa um estilo com variáveis CSS a um elemento comum, cujo `style` só aceita propriedades normais. */
export function vars(estilo: Vars): CSSProperties {
  return estilo
}

type Props = Omit<ComponentPropsWithoutRef<'div'>, 'style'> & { style?: Vars }

/**
 * Um bloco em CSS 3D: cinco faces chapadas, sem sombra (a de trás nunca aparece, com a inclinação
 * de até ~25 graus que as cenas usam, e cada face grande é uma camada de composição a mais). A
 * frente fica em `translateZ(+esp/2)` e as outras faces fecham a espessura (`--esp`) em cores de
 * papel e de tinta (ver midia.css). A frente recebe os filhos (por exemplo a tela de um aparelho).
 * Largura, altura e posição são de quem usa.
 */
export function Caixa({ className = '', children, ...resto }: Props) {
  return (
    <div className={`mc-caixa ${className}`} {...resto}>
      <div className="mc-face mc-frente">{children}</div>
      <div className="mc-face mc-esq" />
      <div className="mc-face mc-dir" />
      <div className="mc-face mc-topo" />
      <div className="mc-face mc-base" />
    </div>
  )
}
