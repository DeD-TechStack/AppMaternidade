import { useEffect } from 'react'
import { Link } from 'react-router'
import {
  APRESENTACAO,
  CHAMADA,
  FATOS,
  MADRUGADA,
  PARA_QUE_SERVE,
  PILARES,
  PROMESSA,
  RODAPE,
  TELAS,
} from '../conteudo/textos.ts'
import { BotoesRapidos } from '../prototipo/BotoesRapidos.tsx'
import { CartaoEmAndamento } from '../prototipo/CartaoEmAndamento.tsx'
import { IlustracaoMamada } from '../prototipo/IlustracaoMamada.tsx'
import { SessaoInfo } from '../prototipo/SessaoInfo.tsx'
import { usePrototipo } from '../prototipo/contexto.ts'

const semAcao = () => undefined

// Miniaturas feitas com os mesmos componentes de Hoje e Sessão, com dados fixos.
// O contêiner é inert e aria-hidden: nada dentro recebe foco nem é lido.
function MiniaturasDoProduto() {
  return (
    <div inert aria-hidden="true" className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className="painel md:w-1/2">
        <CartaoEmAndamento miniatura sessao={{ rotulo: 'Sono', duracao: '1 h 12 min', pessoa: 'Bruno' }} />
        <div className="mt-4">
          <BotoesRapidos
            desativado
            aoIniciarSessao={semAcao}
            aoRegistrarFralda={semAcao}
            aoRegistrarMais={semAcao}
          />
        </div>
      </div>
      <div className="painel md:mt-16 md:w-1/2">
        <p className="titulo-linha mb-4">Tummy time de Lia</p>
        <SessaoInfo miniatura cronometro="04:35" hora="17:02" pessoa="Ana" atividade="Espelho no chão" />
      </div>
    </div>
  )
}

export function Inicio() {
  const { dispatch } = usePrototipo()

  // O Início é sempre claro: sair do modo madrugada ao chegar aqui.
  useEffect(() => {
    dispatch({ tipo: 'definirMadrugada', valor: false })
  }, [dispatch])

  return (
    <div className="flex min-h-dvh flex-col px-4 md:px-[2%]">
      <header className="border-b py-4">
        <p className="marca">AppMaternidade</p>
      </header>

      <main className="flex-1">
        <section
          aria-labelledby="promessa"
          className="entrada grid grid-cols-4 gap-x-4 pb-12 pt-10 md:grid-cols-12 md:pb-24 md:pt-16"
        >
          <ul className="col-span-4 mb-6 flex flex-wrap gap-2 md:col-span-12">
            {PILARES.map((pilar) => (
              <li key={pilar} className="etiqueta rotulo">
                {pilar}
              </li>
            ))}
          </ul>
          <h1 id="promessa" className="promessa col-span-4 md:col-span-9">
            {PROMESSA}
          </h1>
          <p className="texto-medida col-span-4 mt-8 md:col-span-7">{APRESENTACAO}</p>
        </section>

        <section aria-labelledby="titulo-telas" className="entrada atraso-1 pb-12 md:pb-24">
          <h2 id="titulo-telas" className="titulo-secao mb-6">
            {TELAS.titulo}
          </h2>
          <div className="grid grid-cols-4 gap-4 md:grid-cols-12 md:gap-6">
            <div className="campo-cor col-span-4 md:col-span-8">
              <MiniaturasDoProduto />
            </div>
            <p className="col-span-4 md:col-span-4 md:self-end md:border-l md:pl-6">{TELAS.texto}</p>
          </div>
        </section>

        <section aria-labelledby="titulo-serve" className="entrada atraso-2 pb-12 md:pb-24">
          <h2 id="titulo-serve" className="rotulo mb-4">
            {PARA_QUE_SERVE.titulo}
          </h2>
          {PARA_QUE_SERVE.linhas.map((linha) => (
            <div key={linha.rotulo} className="grid grid-cols-1 border-t last:border-b md:grid-cols-12">
              <h3 className="titulo-linha pt-5 md:col-span-3 md:py-6">{linha.rotulo}</h3>
              <div className="pb-6 pt-2 md:col-span-9 md:border-l md:py-6 md:pl-6">
                <p className="texto-medida">{linha.texto}</p>
              </div>
            </div>
          ))}
        </section>

        <section aria-labelledby="titulo-fatos" className="entrada atraso-2 pb-12 md:pb-24">
          <h2 id="titulo-fatos" className="rotulo mb-4">
            {FATOS.titulo}
          </h2>
          <ul className="grid grid-cols-1 border-y md:grid-cols-4">
            {FATOS.itens.map((fato) => (
              <li
                key={fato.valor}
                className="border-t py-6 first:border-t-0 md:border-t-0 md:border-l md:px-6 md:first:border-l-0 md:first:pl-0"
              >
                <p className="numero-fato">{fato.valor}</p>
                <p className="mt-3">{fato.legenda}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="titulo-madrugada"
          className="entrada atraso-2 grid grid-cols-4 gap-4 pb-12 md:grid-cols-12 md:gap-6 md:pb-24"
        >
          <div className="campo-cor col-span-4 md:col-span-7">
            <IlustracaoMamada className="block h-auto w-full" />
          </div>
          <div className="col-span-4 md:col-span-5 md:self-center md:pl-6">
            <h2 id="titulo-madrugada" className="titulo-secao">
              {MADRUGADA.titulo}
            </h2>
            <p className="texto-medida mt-4">{MADRUGADA.texto}</p>
          </div>
        </section>

        <section aria-labelledby="titulo-chamada" className="entrada atraso-2 border-t py-12 md:py-16">
          <h2 id="titulo-chamada" className="titulo-secao">
            {CHAMADA.titulo}
          </h2>
          <p className="texto-medida mt-4">{CHAMADA.texto}</p>
          <Link to="/app/hoje" className="botao botao-principal mt-6">
            {CHAMADA.link}
          </Link>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-x-6 border-t py-4">
        <p className="text-sm">{RODAPE}</p>
        <Link to="/" className="alvo-toque inline-flex items-center">
          Início
        </Link>
      </footer>
    </div>
  )
}
