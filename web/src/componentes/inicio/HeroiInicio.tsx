import { useCallback, useId, useState } from 'react'
import { Botao } from '../base/Botao.tsx'
import { Coluna, Colunas } from '../base/layout/Colunas.tsx'
import { Pilha } from '../base/layout/Pilha.tsx'
import { QuadroLayout } from '../base/layout/QuadroLayout.tsx'
import { Secao } from '../base/layout/Secao.tsx'
import { CenaEstudio } from '../campo/CenaEstudio.tsx'
import { INICIO } from '../../conteudo/textos.ts'
import { Cortina } from '../../movimento/Cortina.tsx'
import { EntradaCena } from '../../movimento/EntradaCena.tsx'
import './inicio.css'

/**
 * A abertura do Início: a promessa em duas linhas (a segunda inteira em itálico; o h1 não anima), o
 * lide, o primário e o link para Como funciona, e ao lado a cena de estúdio com os três celulares. A
 * cortina abre a página na primeira visita, e a cena entra (0,94 a 1, com opacidade) quando ela sobe.
 */
export function HeroiInicio() {
  const [cortinaFeita, setCortinaFeita] = useState(false)
  const aoTerminarCortina = useCallback(() => setCortinaFeita(true), [])
  const id = useId()
  const { titulo, lide, primario, secundario, cena } = INICIO.heroi

  return (
    <Secao className="in-heroi" aria-labelledby={id}>
      <Cortina aoTerminar={aoTerminarCortina} />
      <QuadroLayout>
        {/* Texto e cena: 7fr / 5fr, `midia` entre eles (a partir de 1100, como hoje). */}
        <Colunas fracoes="7fr 5fr" vao="midia" aPartirDe={1100} alinhar="centro">
          <Coluna>
            <Pilha vao="grupo">
              <Pilha vao="pilha">
                <h1 id={id} className="cm-h1">
                  {titulo[0]}
                  <span className="cm-segunda-linha">{` ${titulo[1]}`}</span>
                </h1>
                <p className="cm-lide in-heroi-lide">{lide}</p>
              </Pilha>
              <div className="in-heroi-acoes">
                <Botao to={primario.destino}>{primario.rotulo}</Botao>
                <Botao variante="texto" to={secundario.destino} className="in-link-secundario">
                  {secundario.rotulo}
                </Botao>
              </div>
            </Pilha>
          </Coluna>
          <Coluna>
            <EntradaCena pronta={cortinaFeita} className="in-heroi-cena">
              <CenaEstudio base={cena.base} largura={768} altura={512} alt={cena.alt} prioritaria />
            </EntradaCena>
          </Coluna>
        </Colunas>
      </QuadroLayout>
    </Secao>
  )
}
