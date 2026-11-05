import { useEffect } from 'react'
import { Link } from 'react-router'
import {
  APRESENTACAO,
  CHAMADA,
  FATOS,
  LEGENDA_MADRUGADA,
  MADRUGADA,
  MINIATURAS,
  NAVEGACAO,
  PARA_QUE_SERVE,
  PILARES,
  PROMESSA,
  RODAPE,
  TELAS,
} from '../conteudo/textos.ts'
import { Aparelho } from '../componentes/Aparelho.tsx'
import { BotoesRapidos } from '../prototipo/BotoesRapidos.tsx'
import { CartaoEmAndamento } from '../prototipo/CartaoEmAndamento.tsx'
import { IlustracaoColo } from '../prototipo/IlustracaoColo.tsx'
import { IlustracaoMamada } from '../prototipo/IlustracaoMamada.tsx'
import { IlustracaoPasseio } from '../prototipo/IlustracaoPasseio.tsx'
import { IlustracaoTapete } from '../prototipo/IlustracaoTapete.tsx'
import { SessaoInfo } from '../prototipo/SessaoInfo.tsx'
import { usePrototipo } from '../prototipo/contexto.ts'

const semAcao = () => undefined

// As telas em miniatura são os mesmos componentes de Hoje e Sessão, com dados fixos (textos.ts) e
// o relógio parado: sem navegação inferior, sem efeito na página, nada focável. Cada aparelho que
// as mostra é inerte e escondido do leitor de tela.
function RegistroRapido() {
  return (
    <BotoesRapidos
      desativado
      aoIniciarSessao={semAcao}
      aoRegistrarFralda={semAcao}
      aoRegistrarMais={semAcao}
    />
  )
}

/** O Hoje do celular: o cartão em andamento e os botões de registro, de cima para baixo. */
function TelaHoje() {
  const { hoje } = MINIATURAS
  return (
    <div>
      <p className="titulo-linha">{hoje.titulo}</p>
      <p className="mt-1">{hoje.bebe}</p>
      <div className="mt-4">
        <CartaoEmAndamento miniatura sessao={hoje.sessao} />
      </div>
      <div className="mt-4">
        <RegistroRapido />
      </div>
    </div>
  )
}

/**
 * O Hoje do computador, mais largo: o cartão em andamento e os botões numa coluna, a nota
 * "Para você saber" e a lista "Últimos" na outra. A coluna da direita é curta de propósito: o
 * celular da frente se apoia no espaço vazio embaixo dela, sem cobrir texto.
 */
function TelaHojeComputador() {
  const { hoje } = MINIATURAS
  return (
    <div className="grid grid-cols-2 items-start gap-8">
      <TelaHoje />
      <div>
        <p className="rotulo">{hoje.nota.rotulo}</p>
        <p className="nota-italico mt-2">{hoje.nota.texto}</p>
        <p className="tabular mt-1 text-sm">{hoje.nota.autor}</p>
        <p className="rotulo mt-6">{hoje.ultimos.rotulo}</p>
        <ul className="mt-2 divide-y border-y">
          {hoje.ultimos.itens.map((item) => (
            <li key={item.rotulo} className="flex items-baseline justify-between gap-4 py-2">
              <span>{item.rotulo}</span>
              <span className="tabular text-right">{item.quando}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** As ações da Sessão em miniatura, desativadas e fora da ordem de Tab, como as outras miniaturas. */
function AcoesDaSessaoEmMiniatura() {
  const [encerrar, anotar, descartar] = MINIATURAS.sessao.acoes
  return (
    <div className="mt-6 flex flex-col gap-3">
      <button type="button" disabled tabIndex={-1} className="botao botao-principal botao-grande">
        {encerrar}
      </button>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled tabIndex={-1} className="botao botao-secundario">
          {anotar}
        </button>
        <button type="button" disabled tabIndex={-1} className="botao botao-secundario">
          {descartar}
        </button>
      </div>
    </div>
  )
}

/** A Sessão do celular: o cronômetro com as informações e as ações, como a tela de verdade. */
function TelaSessao({ madrugada = false }: { madrugada?: boolean }) {
  const { sessao } = MINIATURAS
  return (
    <div>
      <p className="titulo-linha mb-4">{sessao.titulo}</p>
      <SessaoInfo
        miniatura
        campo={madrugada ? 'night-paper-deep' : 'accent'}
        cronometro={sessao.cronometro}
        hora={sessao.hora}
        pessoa={sessao.pessoa}
        atividade={sessao.atividade}
      />
      <AcoesDaSessaoEmMiniatura />
    </div>
  )
}

export function Inicio() {
  const { dispatch } = usePrototipo()

  // O Início é sempre claro: sair do modo madrugada ao chegar aqui.
  useEffect(() => {
    dispatch({ tipo: 'definirMadrugada', valor: false })
  }, [dispatch])

  // O raiz é o contêiner da página: as colunas seguem a largura dela em rem da fonte raiz. Uma
  // media query (md:) mede a janela em rem do navegador (16 px) e ignora a fonte ampliada; com
  // o texto em 200% as colunas continuariam lado a lado e o texto não caberia. 46 rem é o
  // conteúdo do raiz em 768 px com fonte 100% (768 − 2 × 2%). O padding lateral, abaixo, é a
  // única variante de janela da página: um contêiner não consulta o próprio tamanho.
  //
  // A página alterna campos de cor (data-campo) e faixas de papel, com no máximo dois campos
  // seguidos. O texto longo fica sempre no papel; sobre os campos só há frases curtas.
  return (
    <div className="@container/pagina flex min-h-dvh flex-col px-4 md:px-[2%]">
      <header className="flex flex-col border-b py-3 @min-[46rem]/pagina:h-16 @min-[46rem]/pagina:flex-row @min-[46rem]/pagina:items-center @min-[46rem]/pagina:justify-between @min-[46rem]/pagina:py-0">
        <p className="marca">AppMaternidade</p>
        <nav
          aria-label="Seções da página"
          className="-mx-2 flex flex-wrap justify-between @min-[46rem]/pagina:mx-0 @min-[46rem]/pagina:gap-4"
        >
          {NAVEGACAO.map((link) => (
            <a
              key={link.alvo}
              href={`#${link.alvo}`}
              className="alvo-toque inline-flex items-center justify-center px-2 text-[0.9375rem] font-semibold no-underline hover:underline"
            >
              {link.rotulo}
            </a>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <section
          aria-labelledby="promessa"
          className="entrada grid grid-cols-4 gap-x-6 pb-10 pt-8 @min-[46rem]/pagina:grid-cols-12 @min-[46rem]/pagina:pb-14 @min-[46rem]/pagina:pt-12"
        >
          <ul className="col-span-4 mb-6 flex flex-wrap gap-2 @min-[46rem]/pagina:col-span-12">
            {PILARES.map((pilar) => (
              <li key={pilar} className="etiqueta rotulo">
                {pilar}
              </li>
            ))}
          </ul>
          <h1 id="promessa" className="promessa col-span-4 @min-[46rem]/pagina:col-span-8">
            {PROMESSA}
          </h1>
          <p className="texto-medida col-span-4 mt-6 @min-[46rem]/pagina:col-span-4 @min-[46rem]/pagina:mt-0 @min-[46rem]/pagina:self-end">
            {APRESENTACAO}
          </p>
        </section>

        {/* Campo de urucum: o Hoje de computador no notebook, a Sessão num celular e o Hoje de
            celular no outro. Os celulares se sobrepõem às margens da tela do notebook e ao espaço
            vazio embaixo da coluna da direita, nunca a uma linha de texto. Em página estreita
            ficam só o notebook e o Hoje de celular. */}
        <section
          id="secao-telas"
          aria-labelledby="titulo-telas"
          data-campo="accent"
          className="vitrine entrada atraso-1"
        >
          <div inert aria-hidden="true" className="vitrine-palco">
            <Aparelho tipo="notebook" className="absolute left-[1rem] top-[2rem] @min-[46rem]/pagina:left-[16rem]">
              <TelaHojeComputador />
            </Aparelho>
            <Aparelho
              tipo="celular"
              className="absolute left-[0.4rem] top-[21rem] hidden origin-top-left scale-[0.9] @min-[46rem]/pagina:block"
            >
              <TelaSessao />
            </Aparelho>
            <Aparelho
              tipo="celular"
              className="absolute left-[35rem] top-[25rem] origin-top-left scale-[0.8] @min-[46rem]/pagina:left-[50rem]"
            >
              <TelaHoje />
            </Aparelho>
          </div>
        </section>

        <section className="entrada atraso-1 grid grid-cols-4 gap-4 py-8 @min-[46rem]/pagina:grid-cols-12 @min-[46rem]/pagina:gap-6 @min-[46rem]/pagina:py-12">
          <h2 id="titulo-telas" className="rotulo col-span-4 @min-[46rem]/pagina:col-span-3">
            {TELAS.titulo}
          </h2>
          <p className="texto-medida col-span-4 @min-[46rem]/pagina:col-span-9 @min-[46rem]/pagina:border-l @min-[46rem]/pagina:pl-6">
            {TELAS.texto}
          </p>
        </section>

        <section
          id="secao-serve"
          aria-labelledby="titulo-serve"
          className="entrada atraso-2 pb-12 @min-[46rem]/pagina:pb-20"
        >
          <h2 id="titulo-serve" className="rotulo mb-4">
            {PARA_QUE_SERVE.titulo}
          </h2>
          {PARA_QUE_SERVE.linhas.map((linha) => (
            <div
              key={linha.rotulo}
              className="grid grid-cols-1 border-t last:border-b @min-[46rem]/pagina:grid-cols-12"
            >
              <h3 className="titulo-linha pt-5 @min-[46rem]/pagina:col-span-3 @min-[46rem]/pagina:py-6">
                {linha.rotulo}
              </h3>
              <div className="pb-6 pt-2 @min-[46rem]/pagina:col-span-9 @min-[46rem]/pagina:border-l @min-[46rem]/pagina:py-6 @min-[46rem]/pagina:pl-6">
                <p className="texto-medida">{linha.texto}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Campo de barro: uma cena só. As três ilustrações têm o mesmo tamanho, apoiam-se na
            mesma linha de chão (o chão de cada uma vai de borda a borda do desenho) e se
            sobrepõem um pouco, a de trás sempre sob a da frente. */}
        <section
          data-campo="field-1"
          className="entrada atraso-2 px-6 pb-6 pt-10 @min-[46rem]/pagina:px-12 @min-[46rem]/pagina:pb-8 @min-[46rem]/pagina:pt-14"
        >
          <div className="mx-auto flex max-w-[56rem] items-end">
            <IlustracaoColo className="block h-auto w-[46%] flex-none @min-[46rem]/pagina:w-[42%]" />
            <IlustracaoTapete className="-ml-[19%] block h-auto w-[46%] flex-none @min-[46rem]/pagina:-ml-[13%] @min-[46rem]/pagina:w-[42%]" />
            <IlustracaoPasseio className="-ml-[19%] block h-auto w-[46%] flex-none @min-[46rem]/pagina:-ml-[13%] @min-[46rem]/pagina:w-[42%]" />
          </div>
        </section>

        {/* Campo de lavanda: a madrugada, com a miniatura nas cores da noite. */}
        <section
          id="secao-madrugada"
          aria-labelledby="titulo-madrugada"
          data-campo="field-2"
          className="madrugada-grade entrada atraso-2 mt-4 px-6 py-10 @min-[46rem]/pagina:px-12 @min-[46rem]/pagina:py-14"
        >
          {/* Quatro filhos da grade, nesta ordem em coluna única: título e texto, ilustração,
              celular e legenda. Na grade larga o texto fica no alto, a ilustração apoia-se na base
              do celular e a legenda fica logo abaixo dele, com a largura dele (ver .madrugada-*). */}
          <div className="madrugada-texto">
            <h2 id="titulo-madrugada" className="titulo-secao">
              {MADRUGADA.titulo}
            </h2>
            <p className="texto-medida mt-4">{MADRUGADA.texto}</p>
          </div>
          <IlustracaoMamada className="madrugada-ilustracao block h-auto w-72 max-w-full @min-[46rem]/pagina:w-80" />
          <div className="madrugada-celular relative h-[28rem] w-[18rem] flex-none @min-[46rem]/pagina:h-[31.73rem] @min-[46rem]/pagina:w-[20.4rem]">
            <Aparelho
              tipo="celular"
              tema="madrugada"
              className="absolute left-0 top-0 origin-top-left scale-[0.75] @min-[46rem]/pagina:scale-[0.85]"
            >
              <TelaSessao madrugada />
            </Aparelho>
          </div>
          <p className="madrugada-legenda">{LEGENDA_MADRUGADA}</p>
        </section>

        <section
          aria-labelledby="titulo-fatos"
          className="entrada atraso-2 py-12 @min-[46rem]/pagina:py-20"
        >
          <h2 id="titulo-fatos" className="rotulo mb-6">
            {FATOS.titulo}
          </h2>
          <ul className="faixa-fatos">
            {FATOS.itens.map((fato) => (
              <li key={fato.valor}>
                <p className="numero-fato">{fato.valor}</p>
                <p className="mt-3">{fato.legenda}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="titulo-chamada"
          className="entrada atraso-2 flex flex-col items-center border-t py-14 text-center @min-[46rem]/pagina:py-24"
        >
          <h2 id="titulo-chamada" className="titulo-secao [font-size:clamp(2.25rem,5vw,3.5rem)]">
            {CHAMADA.titulo}
          </h2>
          <p className="texto-medida mt-4">{CHAMADA.texto}</p>
          <Link to="/app/hoje" className="botao botao-principal mt-8">
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
