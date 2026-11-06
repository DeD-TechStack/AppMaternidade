import { useEffect } from 'react'
import { Link } from 'react-router'
import {
  APRESENTACAO,
  CHAMADA,
  FATOS,
  LEGENDA_CHAMADA,
  LEGENDA_MADRUGADA,
  MADRUGADA,
  NAVEGACAO,
  PARA_QUE_SERVE,
  PILARES,
  PROMESSA,
  RODAPE,
  TELAS,
  TELAS_ESTREITA,
} from '../conteudo/textos.ts'
import { Aparelho } from '../componentes/Aparelho.tsx'
import { AvisoDemonstracao } from '../componentes/AvisoDemonstracao.tsx'
import { TelaReal } from '../componentes/vitrine/TelaReal.tsx'
import { IlustracaoColo } from '../prototipo/IlustracaoColo.tsx'
import { IlustracaoMamada } from '../prototipo/IlustracaoMamada.tsx'
import { usePrototipo } from '../prototipo/contexto.ts'

// A faixa estreita mostra só o começo da legenda das telas (TELAS_ESTREITA); da média para cima o
// texto inteiro (TELAS) aparece. O resto do texto é o que TELAS acrescenta depois da legenda curta.
const RESTO_DE_TELAS = TELAS.texto.startsWith(TELAS_ESTREITA.texto)
  ? TELAS.texto.slice(TELAS_ESTREITA.texto.length).trim()
  : TELAS.texto

export function Inicio() {
  const { dispatch } = usePrototipo()

  // O Início é sempre claro: sair do modo madrugada ao chegar aqui.
  useEffect(() => {
    dispatch({ tipo: 'definirMadrugada', valor: false })
  }, [dispatch])

  // O raiz é o contêiner da página: o layout segue a largura dela em rem da fonte raiz, em três
  // faixas: estreita (menos de 46 rem), média (46 a menos de 60 rem) e larga (60 rem ou mais). Uma
  // media query (md:) mede a janela em rem do navegador (16 px) e ignora a fonte ampliada; com o
  // texto em 200% as colunas continuariam lado a lado e o texto não caberia. O padding lateral,
  // abaixo, é a única variante de janela da página: um contêiner não consulta o próprio tamanho.
  //
  // break-words (overflow-wrap: break-word) é herdado por todo texto da página: com a fonte
  // ampliada a página tem menos rem, e uma palavra mais larga que a própria caixa quebra em vez de
  // vazar. Só quebra quando a palavra não cabe, então com a fonte em 100% nenhuma linha muda. É a
  // única regra de quebra do Início, na raiz: o Hoje e a Sessão não a recebem. Sem anywhere (que
  // muda a largura mínima de itens de grade e flex), sem hífen automático nos títulos e sem
  // esconder nada.
  //
  // O <main> é a grade (ver .inicio-grade em index.css): uma coluna na estreita e na média, duas
  // colunas de mesma largura na larga, com o mesmo padding em todo cartão e o mesmo gap entre eles
  // em cada faixa. Os seis cartões, nesta ordem: a promessa (papel), as telas (campo de urucum), a
  // madrugada (campo da noite) e "para que serve" (papel, em par com a madrugada a partir de 80 rem),
  // os fatos (papel) e a chamada (campo de lavanda). Papel e campo se alternam, com no máximo dois
  // campos seguidos. Todo texto corrido mora numa coluna de texto de até 32,5 rem (.coluna-texto). Os
  // aparelhos são as telas de verdade (ver componentes/vitrine), inertes e escondidos do leitor de
  // tela, com um parágrafo visível ao lado.
  return (
    <div className="@container/pagina flex min-h-dvh flex-col break-words px-4 md:px-[2%]">
      <AvisoDemonstracao />
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

      <main className="inicio-grade flex-1">
        {/* Promessa, no papel: os pilares, o título e a apresentação, na coluna de texto, e a
            ilustração. Até 80 rem: o texto e, embaixo, o desenho centrado no cartão. A partir de
            80 rem: o texto na coluna 1 e o desenho começando na linha da coluna 2. Em todo caso
            a base do desenho fica na borda de baixo da área de conteúdo do cartão. */}
        <section aria-labelledby="promessa" className="inicio-promessa inicio-largo entrada">
          <div className="inicio-promessa-texto coluna-texto">
            <ul className="flex flex-wrap gap-2">
              {PILARES.map((pilar) => (
                <li key={pilar} className="etiqueta rotulo">
                  {pilar}
                </li>
              ))}
            </ul>
            <h1 id="promessa" className="promessa mt-6">
              {PROMESSA}
            </h1>
            <p className="texto-medida mt-6">{APRESENTACAO}</p>
          </div>
          <IlustracaoColo className="inicio-ilustracao" />
        </section>

        {/* Telas, no campo de urucum: o título e a legenda, e os aparelhos. A partir de 86 rem o texto
            fica em cima, à esquerda, com o notebook do Hoje embaixo dele e o celular da Sessão à
            direita, com a base na do notebook; antes disso tudo empilhado, alinhado à esquerda. Média:
            os dois celulares, o Hoje e a Sessão. Estreita: só o celular com o Hoje. Os aparelhos que
            não aparecem numa faixa continuam no DOM, escondidos pelo CSS (.aparelho-*-de-*). O título
            e o primeiro trecho da legenda são os da faixa estreita; da média para cima entra o resto. */}
        <section
          id="secao-telas"
          aria-labelledby="titulo-telas"
          data-campo="accent"
          className="inicio-telas inicio-largo entrada atraso-1"
        >
          <div className="inicio-telas-texto coluna-texto">
            <h2 id="titulo-telas" className="titulo-secao">
              <span className="somente-estreita">{TELAS_ESTREITA.titulo}</span>
              <span className="a-partir-de-46">{TELAS.titulo}</span>
            </h2>
            <p className="texto-medida mt-4">
              {TELAS_ESTREITA.texto}
              <span className="a-partir-de-46">{` ${RESTO_DE_TELAS}`}</span>
            </p>
          </div>
          <Aparelho tipo="notebook" tela="hoje" className="aparelho-a-partir-de-60">
            <TelaReal tela="hoje" />
          </Aparelho>
          <Aparelho tipo="celular" tela="hoje" className="aparelho-ate-60">
            <TelaReal tela="hoje" />
          </Aparelho>
          <Aparelho tipo="celular" tela="sessao" className="aparelho-a-partir-de-46 inicio-aparelho-lado">
            <TelaReal tela="sessao" />
          </Aparelho>
        </section>

        {/* Madrugada, no papel fundo escuro: o tema da noite vale só dentro do cartão (invólucro
            local), nunca no <html>. O título, o texto, o celular com a Sessão da mamada de Heloísa (com o
            relógio parado) e a legenda ficam empilhados, alinhados à esquerda. */}
        <section
          id="secao-madrugada"
          aria-labelledby="titulo-madrugada"
          data-campo="night-paper-deep"
          data-tema-local="madrugada"
          className="inicio-madrugada inicio-par entrada atraso-2"
        >
          <div className="coluna-texto">
            <h2 id="titulo-madrugada" className="titulo-secao">
              {MADRUGADA.titulo}
            </h2>
            <p className="texto-medida mt-4">{MADRUGADA.texto}</p>
          </div>
          <Aparelho tipo="celular" tela="sessao" tema="madrugada">
            <TelaReal tela="madrugada" />
          </Aparelho>
          <div className="coluna-texto">
            <p className="texto-medida">{LEGENDA_MADRUGADA}</p>
          </div>
        </section>

        {/* Para que serve, no papel: as três linhas da base e, no fim, a segunda ilustração. Cada
            linha tem o rótulo e o texto lado a lado (média, e larga abaixo de 80 rem) ou o rótulo em
            cima do texto (estreita, e a partir de 80 rem, em par com a madrugada). */}
        <section
          id="secao-serve"
          aria-labelledby="titulo-serve"
          className="inicio-serve inicio-par entrada atraso-2"
        >
          <h2 id="titulo-serve" className="rotulo">
            {PARA_QUE_SERVE.titulo}
          </h2>
          <div className="inicio-serve-linhas">
            {PARA_QUE_SERVE.linhas.map((linha) => (
              <div key={linha.rotulo} className="inicio-serve-linha border-t last:border-b">
                <h3 className="titulo-linha">{linha.rotulo}</h3>
                <div className="inicio-serve-texto">
                  <div className="coluna-texto">
                    <p className="texto-medida">{linha.texto}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <IlustracaoMamada className="inicio-ilustracao" />
        </section>

        {/* Fatos, no papel: um bloco de linhas, o termo grande à esquerda e a explicação à direita,
            na coluna de texto, com uma linha fina entre elas. */}
        <section aria-labelledby="titulo-fatos" className="inicio-fatos inicio-largo entrada atraso-2">
          <h2 id="titulo-fatos" className="rotulo">
            {FATOS.titulo}
          </h2>
          <ul className="faixa-fatos">
            {FATOS.itens.map((fato) => (
              <li key={fato.valor}>
                <p className="numero-fato">{fato.valor}</p>
                <div className="coluna-texto">
                  <p className="texto-medida">{fato.legenda}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Chamada, no campo de lavanda: o título, o texto e o link, na coluna de texto, e embaixo o
            celular com o Hoje e a legenda dele. Tudo alinhado à esquerda. */}
        <section
          aria-labelledby="titulo-chamada"
          data-campo="field-2"
          className="inicio-chamada inicio-largo entrada atraso-2"
        >
          <div className="coluna-texto">
            <h2 id="titulo-chamada" className="titulo-secao [font-size:clamp(2.25rem,5vw,3.5rem)]">
              {CHAMADA.titulo}
            </h2>
            <p className="texto-medida mt-4">{CHAMADA.texto}</p>
            <p className="mt-4">
              <Link to="/app/hoje" className="botao botao-principal">
                {CHAMADA.link}
              </Link>
            </p>
          </div>
          <div className="inicio-lado">
            <Aparelho tipo="celular" tela="hoje">
              <TelaReal tela="hoje" />
            </Aparelho>
            <div className="coluna-texto">
              <p className="texto-medida">{LEGENDA_CHAMADA}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-x-6 border-t py-4 @min-[46rem]/pagina:py-6">
        <p className="text-sm">{RODAPE}</p>
        <Link to="/" className="alvo-toque inline-flex items-center">
          Início
        </Link>
      </footer>
    </div>
  )
}
