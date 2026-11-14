import type { ReactNode } from 'react'
import { Titulo } from '../campo/Titulo.tsx'
import { Coluna, Colunas, Pilha, QuadroLayout, Secao } from '../base/layout/index.ts'
import './publicas-destaque.css'

interface Props {
  /** O h1 da página: a segunda linha, inteira, em itálico. */
  titulo: readonly [string, string]
  /** O texto de abertura, as ações e o aviso: ficam na mesma coluna do título (a mesma borda esquerda). */
  texto: ReactNode
  /** A mídia (cena ou painel de campo): na coluna ao lado no largo, abaixo do texto no celular. */
  midia: ReactNode
  /** `meio`: título e mídia em metades iguais (a mídia é um painel com mais de uma peça). */
  proporcao?: 'texto' | 'meio'
}

/**
 * A primeira dobra de uma página pública: uma `Secao` com um `Colunas` de vão `midia`. De um lado o h1, o texto
 * e a ação (uma `Pilha`, todos na mesma borda esquerda); do outro, a mídia de verdade. Empilhada no celular
 * (até 1099 px), a mídia vem depois do texto.
 */
export function Abertura({ titulo, texto, midia, proporcao = 'texto' }: Props) {
  return (
    <Secao>
      <QuadroLayout>
        <Colunas
          fracoes={proporcao === 'meio' ? '1fr 1fr' : '7fr 5fr'}
          aPartirDe={1100}
          vao="midia"
          alinhar="centro"
          className="pd-abertura"
          data-disposicao="lado"
          data-proporcao={proporcao}
        >
          <Pilha vao="grupo" dataH="coluna" className="pd-abertura-texto">
            <Titulo nivel="h1" linhas={titulo} />
            {texto}
          </Pilha>
          <Coluna className="pd-abertura-midia">{midia}</Coluna>
        </Colunas>
      </QuadroLayout>
    </Secao>
  )
}
