import { useId } from 'react'
import { Cartao } from '../base/layout/Cartao.tsx'
import { Colunas } from '../base/layout/Colunas.tsx'
import { Pilha } from '../base/layout/Pilha.tsx'
import { QuadroLayout } from '../base/layout/QuadroLayout.tsx'
import { Secao } from '../base/layout/Secao.tsx'
import { TabelaComparacao } from '../campo/TabelaComparacao.tsx'
import { Titulo } from '../campo/Titulo.tsx'
import { INICIO } from '../../conteudo/textos.ts'
import { RevelaNaRolagem } from '../../movimento/RevelaNaRolagem.tsx'
import { FotoCena } from './FotoCena.tsx'
import './inicio.css'

/**
 * O caderno contra o app: a tabela de verdade num cartão de oliva e, ao lado, o celular sobre o linho
 * num cartão de areia (a foto já é de linho: o mel não vai aqui). A abertura é um quadro `medio`; a grade
 * fica no quadro de largura cheia, e os dois são filhos de uma pilha `grupo` (o quadro `medio` alinha a
 * borda pela página, por isso não pode estar dentro de outro quadro).
 */
export function SecaoTabela() {
  const id = useId()
  const { titulo, legenda, linhas, cena } = INICIO.tabela

  return (
    <Secao aria-labelledby={id} className="in-tabela">
      <Pilha vao="grupo">
        <QuadroLayout largura="medio">
          <Titulo nivel="h2" id={id} linhas={titulo} />
        </QuadroLayout>
        <QuadroLayout>
          {/* Tabela (8fr) e foto (4fr) lado a lado a partir de 1280 (o ponto de quebra de hoje: a primitiva
              quebra em 1200 e o inicio.css empilha até 1279), `bloco` entre os dois cartões. */}
          <Colunas fracoes="8fr 4fr" vao="bloco" aPartirDe={1200} alinhar="inicio" className="in-tabela-grade">
            {/* O cartão é o de oliva (padding espaco-painel); a tabela da base vem sem o padding próprio dela. */}
            <Cartao dataH="coluna" className="cm-painel-oliva" data-painel="oliva">
              <TabelaComparacao legenda={legenda} linhas={linhas} className="in-celula in-tabela-miolo" />
            </Cartao>
            <Cartao dataH="coluna" className="in-tabela-foto cm-painel-areia" data-painel="areia">
              <RevelaNaRolagem className="in-revela">
                <FotoCena base={cena.base} largura={768} altura={512} alt={cena.alt} />
              </RevelaNaRolagem>
            </Cartao>
          </Colunas>
        </QuadroLayout>
      </Pilha>
    </Secao>
  )
}
