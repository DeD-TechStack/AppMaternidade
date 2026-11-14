import { useId } from 'react'
import { Pilha } from '../base/layout/Pilha.tsx'
import { QuadroLayout } from '../base/layout/QuadroLayout.tsx'
import { Secao } from '../base/layout/Secao.tsx'
import { PainelCampo } from '../campo/PainelCampo.tsx'
import { TabelaComparacao } from '../campo/TabelaComparacao.tsx'
import { Titulo } from '../campo/Titulo.tsx'
import { INICIO } from '../../conteudo/textos.ts'
import { RevelaNaRolagem } from '../../movimento/RevelaNaRolagem.tsx'
import { FotoCena } from './FotoCena.tsx'
import './inicio.css'

/**
 * O caderno contra o app: a tabela de verdade no painel de oliva e, ao lado, o celular sobre o linho
 * num painel de areia (a foto já é de linho: o mel não vai aqui).
 */
export function SecaoTabela() {
  const id = useId()
  const { titulo, legenda, linhas, cena } = INICIO.tabela

  return (
    <Secao aria-labelledby={id} className="in-tabela">
      <QuadroLayout>
        <Pilha vao="grupo">
          <Titulo nivel="h2" id={id} linhas={titulo} />
          {/* Tabela (8fr) e foto (4fr) lado a lado só a partir de 1280 (o ponto de quebra de hoje, em
              inicio.css), `bloco` entre os dois cartões. */}
          <div className="in-tabela-grade">
            <TabelaComparacao legenda={legenda} linhas={linhas} className="in-celula" />
            <PainelCampo variante="areia" className="in-celula in-tabela-foto">
              <RevelaNaRolagem className="in-revela">
                <FotoCena base={cena.base} largura={768} altura={512} alt={cena.alt} />
              </RevelaNaRolagem>
            </PainelCampo>
          </div>
        </Pilha>
      </QuadroLayout>
    </Secao>
  )
}
