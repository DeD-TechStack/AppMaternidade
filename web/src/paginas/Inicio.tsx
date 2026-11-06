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
      semIcones
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
  // break-words (overflow-wrap: break-word) é herdado por todo texto da página: com a fonte
  // ampliada a página tem menos rem, e uma palavra mais larga que a própria caixa quebra em vez de
  // vazar. Só quebra quando a palavra não cabe, então com a fonte em 100% nenhuma linha muda. É a
  // única regra de quebra do Início, na raiz: o Hoje e a Sessão não a recebem. Sem anywhere (que
  // muda a largura mínima de itens de grade e flex), sem hífen automático nos títulos e sem
  // esconder nada.
  //
  // A página alterna campos de cor (data-campo) e faixas de papel, com no máximo dois campos
  // seguidos. O texto longo fica sempre no papel; sobre os campos só há frases curtas.
  return (
    <div className="@container/pagina flex min-h-dvh flex-col break-words px-4 md:px-[2%]">
      <header className="flex flex-col border-b py-3 @min-[46rem]/pagina:h-16 @min-[46rem]/pagina:flex-row @min-[46rem]/pagina:items-center @min-[46rem]/pagina:justify-between @min-[46rem]/pagina:py-0">
        <p className="marca">AppMaternidade</p>
        <nav
          aria-label="Seções da página"
          className="flex flex-wrap justify-between @min-[46rem]/pagina:gap-4"
        >
          {NAVEGACAO.map((link) => (
            <a
              key={link.alvo}
              href={`#${link.alvo}`}
              className="alvo-toque inline-flex items-center justify-center px-2 text-[0.9375rem] font-semibold no-underline first:pl-0 last:pr-0 hover:underline"
            >
              {link.rotulo}
            </a>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <section
          aria-labelledby="promessa"
          className="entrada grid grid-cols-4 gap-x-6 pb-8 pt-6 @min-[46rem]/pagina:grid-cols-12 @min-[46rem]/pagina:pb-12 @min-[46rem]/pagina:pt-10"
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
            celular no outro, em toda largura (nada some em página estreita, que só muda a
            composição). Os celulares se sobrepõem à parte de baixo do notebook, à margem da tela
            dele e ao espaço vazio sob a coluna da direita, nunca ao que a tela tem de mais
            importante. As posições e escalas abaixo dão ao conjunto pelo menos 2 rem de folga dos
            quatro lados do palco, centrado (o palco e a escala estão em .vitrine, no CSS):
            - abaixo de 46 rem, palco de 54 × 67 rem: notebook a 0,78 no meio e os dois celulares
              lado a lado, em escala 1, por cima da parte de baixo dele;
            - a partir de 46 rem, palco de 81 × 56 rem: o notebook entre os dois celulares. */}
        <section
          id="secao-telas"
          aria-labelledby="titulo-telas"
          data-campo="accent"
          className="vitrine entrada atraso-1"
        >
          <div inert aria-hidden="true" className="vitrine-palco">
            <Aparelho
              tipo="notebook"
              tela="hoje"
              className="absolute left-[5.2rem] top-[2rem] origin-top-left scale-[0.78] @min-[46rem]/pagina:left-[19rem] @min-[46rem]/pagina:top-[3rem] @min-[46rem]/pagina:scale-[1]"
            >
              <TelaHojeComputador />
            </Aparelho>
            <Aparelho
              tipo="celular"
              tela="sessao"
              className="absolute left-[2.5rem] top-[24rem] origin-top-left scale-[1] @min-[46rem]/pagina:left-[3rem] @min-[46rem]/pagina:top-[19rem] @min-[46rem]/pagina:scale-[0.9]"
            >
              <TelaSessao />
            </Aparelho>
            <Aparelho
              tipo="celular"
              tela="hoje"
              className="absolute left-[27.5rem] top-[27rem] origin-top-left scale-[1] @min-[46rem]/pagina:left-[53rem] @min-[46rem]/pagina:top-[23rem] @min-[46rem]/pagina:scale-[0.8]"
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
          className="entrada atraso-2 pb-8 @min-[46rem]/pagina:pb-12"
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

        {/* Campo de barro: uma cena só. Cada desenho tem o viewBox justo (só a figura e o chão,
            que vai de borda a borda do desenho e termina na base dele), então as figuras lado a
            lado formam um chão contínuo e nenhuma toca a outra: não há sobreposição nem margem
            negativa. A largura de cada uma é proporcional à do próprio desenho (14 % = 128, 232 e
            188 unidades), o que dá às pessoas a mesma escala em toda largura.
            - Em página estreita: colo e passeio na primeira linha, e o tapete centrado embaixo,
              a um vão de 16 px, o mesmo de entre as figuras.
            - A partir de 46 rem: as três na mesma linha, centradas no campo. */}
        <section
          data-campo="field-1"
          className="entrada atraso-2 px-6 pb-6 pt-8 @min-[46rem]/pagina:px-12 @min-[46rem]/pagina:pb-8 @min-[46rem]/pagina:pt-10"
        >
          <div className="mx-auto flex max-w-[56rem] flex-wrap items-end gap-y-4 @min-[46rem]/pagina:flex-nowrap">
            <IlustracaoColo className="block h-auto w-[40.4%] flex-none @min-[46rem]/pagina:w-[23.3%]" />
            <IlustracaoTapete className="order-3 mx-auto block h-auto w-[73.2%] flex-none @min-[46rem]/pagina:order-none @min-[46rem]/pagina:w-[42.2%]" />
            <IlustracaoPasseio className="block h-auto w-[59.4%] flex-none @min-[46rem]/pagina:w-[34.2%]" />
          </div>
        </section>

        {/* Campo de lavanda: a madrugada, com a miniatura nas cores da noite. */}
        <section
          id="secao-madrugada"
          aria-labelledby="titulo-madrugada"
          data-campo="field-2"
          className="madrugada-grade entrada atraso-2 mt-4 px-6 py-8 @min-[46rem]/pagina:px-12 @min-[46rem]/pagina:py-12"
        >
          {/* Quatro filhos da grade, nesta ordem em coluna única: título e texto, cena (a
              ilustração), celular e legenda logo abaixo dele, com a largura dele. Nada fica atrás
              do celular. Na grade larga, duas colunas: à esquerda o texto no alto e a ilustração
              embaixo, na largura da coluna e com o chão na base do celular; à direita o celular e a
              legenda (ver .madrugada-* no CSS). */}
          <div className="madrugada-texto">
            <h2 id="titulo-madrugada" className="titulo-secao">
              {MADRUGADA.titulo}
            </h2>
            <p className="texto-medida mt-4">{MADRUGADA.texto}</p>
          </div>
          <div className="madrugada-cena">
            <IlustracaoMamada larga className="block" />
          </div>
          <div className="madrugada-celular">
            <Aparelho
              tipo="celular"
              tela="sessao"
              tema="madrugada"
              className="absolute left-0 top-0 origin-top-left [scale:var(--celular-escala)]"
            >
              <TelaSessao madrugada />
            </Aparelho>
          </div>
          <p className="madrugada-legenda">{LEGENDA_MADRUGADA}</p>
        </section>

        <section
          aria-labelledby="titulo-fatos"
          className="entrada atraso-2 pt-8 @min-[46rem]/pagina:pt-12"
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
          className="entrada atraso-2 mt-8 flex flex-col items-center border-t py-12 text-center @min-[46rem]/pagina:mt-12 @min-[46rem]/pagina:py-16"
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
