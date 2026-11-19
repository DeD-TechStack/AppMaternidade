import { Children, type CSSProperties, type ReactNode } from 'react'
import { QuadroLayout } from '../base/layout/QuadroLayout.tsx'
import { exigirFundo, exigirTexto, violacao, type Fundo } from './contrato.ts'

interface Props {
  /** O chao: papel, cacau, areia ou chao-noite. O mel nao existe como chao. */
  fundo: Fundo
  /** O chao da parte direita, a partir da costura. Pede `costuraX`. */
  fundoDireita?: Fundo
  /** A costura, um comprimento CSS (por exemplo `calc(50% + 310px)`), medida da borda esquerda da faixa. */
  costuraX?: string
  /** A costura abaixo de 768. Sem ela a faixa nao e dividida abaixo de 768. */
  costuraX390?: string
  /** O id do titulo da faixa: com ele a faixa e uma `section` nomeada; sem ele, um `div`. */
  idTitulo?: string
  children?: ReactNode
}

const PECA = 'FaixaInteira'

/**
 * FaixaInteira (DS1:RF-01): uma faixa de ponta a ponta (as duas bordas da janela, raio 0, padding vertical
 * `secao`) em um de quatro chaos, com o conteudo num quadro. Dividida (`fundoDireita` + `costuraX`), a parte direita
 * e uma camada solida `[data-faixa-lado]` por baixo do conteudo, da costura ate a borda direita: duas camadas
 * solidas, nunca um gradiente. Sem filhos, nao renderiza nada.
 */
export function FaixaInteira({ fundo, fundoDireita, costuraX, costuraX390, idTitulo, children }: Props) {
  exigirFundo(PECA, 'fundo', fundo)
  if (idTitulo !== undefined) exigirTexto(PECA, 'idTitulo', idTitulo)
  if (fundoDireita !== undefined) {
    exigirFundo(PECA, 'fundoDireita', fundoDireita)
    if (costuraX === undefined) violacao(PECA, 'fundoDireita needs costuraX')
    exigirTexto(PECA, 'costuraX', costuraX)
  }
  if (costuraX390 !== undefined) exigirTexto(PECA, 'costuraX390', costuraX390)
  if (Children.toArray(children).length === 0) return null

  const Raiz = idTitulo === undefined ? 'div' : 'section'
  const medidas = fundoDireita
    ? ({ '--costura-x': costuraX, ...(costuraX390 === undefined ? {} : { '--costura-x-390': costuraX390 }) } as CSSProperties)
    : undefined

  return (
    <Raiz data-faixa="" data-faixa-fundo={fundo} aria-labelledby={idTitulo} className="cm-faixa-inteira">
      {fundoDireita ? <div data-faixa-lado="" data-faixa-fundo={fundoDireita} aria-hidden="true" style={medidas} /> : null}
      <QuadroLayout className="cm-faixa-quadro">{children}</QuadroLayout>
    </Raiz>
  )
}

/**
 * TomDaFaixa: o conteudo que fica sobre a parte direita de uma faixa dividida declara o chao dela, e herda o texto
 * e o foco desse chao. Nao e uma faixa (sem `data-faixa`) e nao pinta fundo.
 */
export function TomDaFaixa({ fundo, children }: { fundo: Fundo; children?: ReactNode }) {
  exigirFundo('TomDaFaixa', 'fundo', fundo)
  return (
    <div data-faixa-fundo={fundo} className="cm-tom-da-faixa">
      {children}
    </div>
  )
}
