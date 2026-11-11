import { useId } from 'react'
import { Acordeao } from '../componentes/campo/Acordeao.tsx'
import { Citacao } from '../componentes/campo/Citacao.tsx'
import { Depoimento } from '../componentes/campo/Depoimento.tsx'
import { FaixaSelos } from '../componentes/campo/FaixaSelos.tsx'
import { Numeros } from '../componentes/campo/Numeros.tsx'
import { Titulo } from '../componentes/campo/Titulo.tsx'
import { FaixaMadrugada } from '../componentes/inicio/FaixaMadrugada.tsx'
import { Fechamento } from '../componentes/inicio/Fechamento.tsx'
import { HeroiInicio } from '../componentes/inicio/HeroiInicio.tsx'
import { SecaoTabela } from '../componentes/inicio/SecaoTabela.tsx'
import { SecaoTurno } from '../componentes/inicio/SecaoTurno.tsx'
import { FATOS, INICIO } from '../conteudo/textos.ts'

/**
 * O Início (MAT-49c), na composição F1 "Campo de mel": a abertura com a cena dos três celulares, os
 * números, os selos, a troca de turno, a faixa de cacau da madrugada, a tabela contra o caderno, a
 * citação e os depoimentos, as perguntas e o fechamento. Só peças da base (componentes/campo e
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
        <Numeros itens={FATOS} />
      </section>

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
      <Depoimento
        className="in-depoimentos"
        aria-labelledby={idDepoimentos}
        titulo={<Titulo nivel="h2" id={idDepoimentos} linhas={INICIO.depoimentos.titulo} />}
        relatos={INICIO.depoimentos.relatos}
      />

      <section className="cm-area in-secao in-perguntas" aria-labelledby={idPerguntas}>
        <Titulo nivel="h2" id={idPerguntas} linhas={INICIO.perguntas.titulo} />
        <Acordeao itens={INICIO.perguntas.itens} />
      </section>

      <Fechamento />
    </main>
  )
}
