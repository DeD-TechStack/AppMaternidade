import type { CSSProperties, HTMLAttributes } from 'react'
import { juntarDataH } from './dataH.ts'
import './layout.css'

/**
 * Os pontos de quebra de hoje em que as colunas passam a ficar lado a lado (min-width, em px). 768 e 992 são o
 * "empilha até 767" e "empilha até 991" do código; 900 e 1100 são os de campo.css e site.css; 1024 é o `lg` do
 * Tailwind; 1200 é o de index.css. Nenhum ponto de quebra novo.
 */
export const QUEBRAS_DE_COLUNAS = [768, 900, 992, 1024, 1100, 1200] as const

type Props = HTMLAttributes<HTMLElement> & {
  /**
   * As frações das colunas, uma por filho: `"7fr 5fr"`, `"2fr 3fr"` ou com medida fixa (`"16rem 1fr"`). Cada `Nfr`
   * vira `minmax(0, Nfr)` para o conteúdo nunca alargar a coluna. Um modelo pronto (com parênteses) passa como está.
   * Padrão: duas colunas iguais.
   */
  fracoes?: string
  /** `midia` entre texto e mídia; `bloco` (padrão) entre colunas de texto ou de cartões. */
  vao?: 'bloco' | 'midia'
  /** A partir de qual largura ficam lado a lado (abaixo, uma coluna só, com o mesmo vão na vertical). */
  aPartirDe?: (typeof QUEBRAS_DE_COLUNAS)[number]
  alinhar?: 'inicio' | 'centro' | 'fim'
  /** Valores a somar no `data-h`. */
  dataH?: string
}

const FRACAO = /^\d+(?:\.\d+)?fr$/

/** O `grid-template-columns` das frações. */
export function modeloDasColunas(fracoes: string | undefined): string {
  if (!fracoes?.trim()) return 'minmax(0, 1fr) minmax(0, 1fr)'
  if (fracoes.includes('(')) return fracoes.trim()
  return fracoes
    .trim()
    .split(/\s+/)
    .map((trecho) => (FRACAO.test(trecho) ? `minmax(0, ${trecho})` : trecho))
    .join(' ')
}

/**
 * Colunas: composição de seção lado a lado (texto e mídia, grade de cartões, índice e conteúdo). Cada filho leva
 * `coluna` no `data-h` (a peça `Coluna`, ou `dataH="coluna"` em outra primitiva). Fileiras de botões, ícone com
 * texto e barras de ação não são colunas: são componente.
 */
export function Colunas({
  fracoes,
  vao = 'bloco',
  aPartirDe = 768,
  alinhar,
  dataH,
  style,
  children,
  ...resto
}: Props) {
  const estilo = { ...style, '--h-colunas': modeloDasColunas(fracoes) } as CSSProperties
  return (
    <div
      {...resto}
      style={estilo}
      data-h={juntarDataH(dataH, 'colunas')}
      data-h-vao={vao}
      data-h-quebra={aPartirDe}
      data-h-alinhar={alinhar}
    >
      {children}
    </div>
  )
}

type PropsColuna = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'li' | 'article' | 'section'
  dataH?: string
}

/** Uma coluna de `Colunas`: `data-h="coluna"`, que aceita encolher (`min-width: 0`). */
export function Coluna({ as: Elemento = 'div', dataH, children, ...resto }: PropsColuna) {
  return (
    <Elemento {...resto} data-h={juntarDataH(dataH, 'coluna')}>
      {children}
    </Elemento>
  )
}
