import { useId } from 'react'
import { Citacao } from '../componentes/campo/Citacao.tsx'
import { FaixaSelos } from '../componentes/campo/FaixaSelos.tsx'
import { DepoimentosInicio } from '../componentes/inicio/DepoimentosInicio.tsx'
import { FaixaMadrugada } from '../componentes/inicio/FaixaMadrugada.tsx'
import { Fechamento } from '../componentes/inicio/Fechamento.tsx'
import { HeroiInicio } from '../componentes/inicio/HeroiInicio.tsx'
import { NumerosInicio } from '../componentes/inicio/NumerosInicio.tsx'
import { PerguntasInicio } from '../componentes/inicio/PerguntasInicio.tsx'
import { SecaoTabela } from '../componentes/inicio/SecaoTabela.tsx'
import { SecaoTurno } from '../componentes/inicio/SecaoTurno.tsx'
import { FATOS, INICIO } from '../conteudo/textos.ts'

/**
 * O Início (MAT-49c), na composição F1 "Campo de mel": a abertura com a cena dos três celulares, os
 * números, os selos, a troca de turno, a faixa de cacau da madrugada, a tabela contra o caderno, a
 * citação e os relatos, as perguntas e o fechamento de cacau. Peças da base (componentes/campo e
 * movimento); o que é só do Início fica em componentes/inicio.
 */
export function Inicio() {
  const idNumeros = useId()
  const idSelos = useId()
  const idDepoimentos = useId()
  const idPerguntas = useId()

  return (
    <main className="in-pagina">
      <HeroiInicio />

      <section className="cm-area in-numeros" aria-labelledby={idNumeros}>
        <h2 id={idNumeros} className="sr-only">
          {INICIO.numeros.titulo}
        </h2>
        <NumerosInicio itens={FATOS} />
      </section>

      {/* Uma lista só: abaixo de 768 o inicio.css para o letreiro e a vira numa grade de 2 colunas. */}
      <section className="cm-area in-selos" aria-labelledby={idSelos}>
        <h2 id={idSelos} className="sr-only">
          {INICIO.selos.titulo}
        </h2>
        <FaixaSelos rotulo="Selos do app" />
      </section>

      <SecaoTurno />
      <FaixaMadrugada />
      <SecaoTabela />

      <div className="cm-area in-secao in-citacao">
        <Citacao texto={INICIO.citacao.texto} autor={INICIO.citacao.autor} />
      </div>
      <DepoimentosInicio id={idDepoimentos} />

      <PerguntasInicio id={idPerguntas} />

      <Fechamento />
    </main>
  )
}
