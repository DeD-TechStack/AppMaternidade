import { useSyncExternalStore, type ReactNode } from 'react'
import { Titulo } from '../campo/Titulo.tsx'
import { Coluna, Colunas, Pilha, QuadroLayout, Secao } from '../base/layout/index.ts'
import './publicas-destaque.css'

/** Abaixo de 1100 px a abertura é uma coluna só (como o `aPartirDe` do `Colunas`) e a mídia entra no meio do texto. */
const CONSULTA_COMPACTA = '(max-width: 1099.98px)'

function temMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function assinar(aviso: () => void): () => void {
  if (!temMatchMedia()) return () => {}
  const lista = window.matchMedia(CONSULTA_COMPACTA)
  if (typeof lista.addEventListener === 'function') {
    lista.addEventListener('change', aviso)
    return () => lista.removeEventListener('change', aviso)
  }
  return () => {}
}

/** Sem matchMedia (jsdom puro, renderização no servidor) vale a abertura larga: texto e mídia lado a lado. */
function ler(): boolean {
  return temMatchMedia() ? window.matchMedia(CONSULTA_COMPACTA).matches : false
}

interface Props {
  /** O h1 da página: a segunda linha, inteira, em itálico. */
  titulo: readonly [string, string]
  /** O texto de abertura e as ações: ficam na mesma coluna do título (a mesma borda esquerda). */
  texto: ReactNode
  /** A mídia (cena ou painel de campo): na coluna ao lado no largo, entre as ações e o aviso no celular. */
  midia: ReactNode
  /** O aviso de saúde, quando a página tem um: o último da coluna do texto; no celular, depois da mídia. */
  aviso?: ReactNode
  /** `meio`: título e mídia em metades iguais (a mídia é um painel com mais de uma peça). */
  proporcao?: 'texto' | 'meio'
}

/**
 * A primeira dobra de uma página pública: uma `Secao` com um `Colunas` de vão `midia`. De um lado o h1, o texto
 * e a ação (uma `Pilha`, todos na mesma borda esquerda); do outro, a mídia de verdade. Empilhada no celular
 * (até 1099 px), a mídia vem depois das ações e o aviso de saúde, depois dela: a coluna do texto continua sendo uma
 * caixa de verdade (uma `Pilha` de vão `grupo`), que agora guarda também a mídia.
 */
export function Abertura({ titulo, texto, midia, aviso, proporcao = 'texto' }: Props) {
  const compacta = useSyncExternalStore(assinar, ler, () => false)
  const painelDeMidia = <Coluna className="pd-abertura-midia">{midia}</Coluna>
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
            {compacta ? painelDeMidia : null}
            {aviso}
          </Pilha>
          {compacta ? null : painelDeMidia}
        </Colunas>
      </QuadroLayout>
    </Secao>
  )
}
