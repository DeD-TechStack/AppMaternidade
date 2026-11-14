import { Pilha } from '../base/layout/Pilha.tsx'
import { QuadroLayout } from '../base/layout/QuadroLayout.tsx'
import { Secao } from '../base/layout/Secao.tsx'
import { Ilustracao, type NomeIlustracao } from '../campo/Ilustracao.tsx'
import { PainelCampo } from '../campo/PainelCampo.tsx'
import { Titulo } from '../campo/Titulo.tsx'
import { INICIO } from '../../conteudo/textos.ts'
import './inicio.css'

// O desenho de traço ao lado de cada pessoa, na ordem dos relatos (mãe, avô, babá): a babá é a que
// brinca no tapete. É só enfeite: o nome e o papel já dizem quem fala. Carregam na hora: sem eles, a
// coluna do desenho fica vazia.
const DESENHOS: readonly NomeIlustracao[] = ['mae-noite', 'pai-colo', 'baba-tapete']

interface Props {
  id: string
}

/**
 * Os relatos do Início: um grande, em Literata itálico num painel de areia com o desenho da mãe, e os
 * outros dois menores ao lado (a partir de 1100) ou embaixo, cada um com o seu desenho e um fio de
 * cacau em cima. A linha "Relatos ilustrativos" fica logo abaixo do título. A grade (7 + 5 colunas) é
 * a mesma das perguntas: a coluna dos relatos menores e a lista de perguntas começam na mesma borda.
 */
export function DepoimentosInicio({ id }: Props) {
  const { titulo, relatos } = INICIO.depoimentos
  const [principal, ...outros] = relatos

  return (
    <Secao className="in-relatos" aria-labelledby={id}>
      <QuadroLayout>
        <Pilha vao="grupo">
          <Pilha vao="pilha">
            <Titulo nivel="h2" id={id} linhas={titulo} />
            <p className="cm-rotulo cm-texto-2" data-relatos-ilustrativos="">
              Relatos ilustrativos
            </p>
          </Pilha>
          <ul className="in-relatos-grade">
            <li className="in-relatos-principal">
              <PainelCampo variante="areia" largura="celula" como="figure" className="in-relato-grande">
                <blockquote>
                  <p className="in-relato-grande-texto">{`“${principal.texto}”`}</p>
                </blockquote>
                <div className="in-relato-grande-pe">
                  <figcaption className="in-relato-autor">
                    <span className="in-relato-nome">{principal.nome}</span>
                    <span>{principal.papel}</span>
                  </figcaption>
                  <Ilustracao nome={DESENHOS[0]} decorativa carregamento="eager" className="in-relato-grande-arte" />
                </div>
              </PainelCampo>
            </li>
            {outros.map((relato, i) => (
              <li key={relato.nome} className="in-relatos-menor">
                <figure className="in-relato">
                  <Ilustracao nome={DESENHOS[i + 1]} decorativa carregamento="eager" className="in-relato-arte" />
                  <div className="in-relato-corpo">
                    <blockquote>
                      <p className="in-relato-texto">{`“${relato.texto}”`}</p>
                    </blockquote>
                    <figcaption className="in-relato-autor">
                      <span className="in-relato-nome">{relato.nome}</span>
                      <span>{relato.papel}</span>
                    </figcaption>
                  </div>
                </figure>
              </li>
            ))}
          </ul>
        </Pilha>
      </QuadroLayout>
    </Secao>
  )
}
