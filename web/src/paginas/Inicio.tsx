import { useEffect } from 'react'
import { Link } from 'react-router'
import {
  APRESENTACAO,
  CHAMADA,
  FATOS,
  HOJE_TOPO,
  LEGENDA_CHAMADA,
  LEGENDA_MADRUGADA,
  MADRUGADA,
  NAVEGACAO,
  PARA_QUE_SERVE,
  PILARES,
  PROMESSA,
  RODAPE,
  TELAS,
} from '../conteudo/textos.ts'
import { Aparelho } from '../componentes/Aparelho.tsx'
import { AvisoDemonstracao } from '../componentes/AvisoDemonstracao.tsx'
import { TelaReal } from '../componentes/vitrine/TelaReal.tsx'
import { IlustracaoColo } from '../prototipo/IlustracaoColo.tsx'
import { usePrototipo } from '../prototipo/contexto.ts'

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
  // Esse padding é a margem esquerda única da página: o logo, o rodapé, os campos de cor e o texto
  // dos cartões sem campo começam no mesmo x (ver .inicio-grade em index.css).
  //
  // break-words (overflow-wrap: break-word) é herdado por todo texto da página: com a fonte
  // ampliada a página tem menos rem, e uma palavra mais larga que a própria caixa quebra em vez de
  // vazar. Só quebra quando a palavra não cabe, então com a fonte em 100% nenhuma linha muda. É a
  // única regra de quebra do Início, na raiz: o Hoje e a Sessão não a recebem.
  //
  // A página abre direto no cabeçalho (o aviso de demonstração, que é o primeiro filho, aparece só
  // acima do bloco final). O <main> é a grade (ver .inicio-grade em index.css): uma
  // coluna na estreita e na média, duas colunas de mesma largura na larga. Todo bloco de duas
  // colunas usa o mesmo gap da grade, então a segunda coluna de qualquer seção começa na mesma
  // linha vertical (a segunda coluna da grade). Os seis cartões, nesta ordem: a promessa (papel, com
  // o campo do notebook do Hoje de ponta a ponta), as telas (campo de urucum), a madrugada (campo da
  // noite), "para que serve" (papel, com a ilustração num cartão de imagem), os fatos (papel) e a
  // chamada (campo de lavanda). O fecho é o rodapé, um bloco de tinta de largura total. Os aparelhos são as telas de verdade (ver componentes/vitrine):
  // inertes, escondidos do leitor de tela e sem texto de serviço, com um parágrafo visível por
  // perto. A legenda de cada aparelho diz só o que a janela dele mostra (data-descreve).
  return (
    <div className="@container/pagina inicio-pagina flex min-h-dvh flex-col break-words px-4 md:px-[2%]">
      {/* O aviso de demonstração é o primeiro filho (a ordem de leitura e o contrato do componente),
          mas na tela ele vem depois do conteúdo, logo acima do bloco final (order, em index.css):
          a página abre direto no cabeçalho. */}
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
        {/* Promessa, no papel. Larga: o título grande atravessa a grade; a apresentação fica na
            primeira coluna e os pilares, em etiquetas, na segunda; embaixo, de ponta a ponta, o
            campo com o notebook do Hoje, grande, e a legenda dele. Estreita e média: o título, a
            apresentação, os pilares em linha e o campo com o celular do Hoje. O aparelho que não
            aparece numa faixa continua no DOM, escondido pelo CSS. */}
        <section aria-labelledby="promessa" className="inicio-promessa inicio-largo entrada">
          <h1 id="promessa" className="promessa inicio-promessa-titulo">
            {PROMESSA}
          </h1>
          <div className="inicio-promessa-texto coluna-texto">
            <p className="texto-medida">{APRESENTACAO}</p>
          </div>
          <ul className="inicio-pilares flex flex-wrap gap-2">
            {PILARES.map((pilar) => (
              <li key={pilar} className="etiqueta rotulo">
                {pilar}
              </li>
            ))}
          </ul>
          <div data-campo="field-1" className="inicio-hero">
            <div className="coluna-texto inicio-hero-texto">
              <h2 className="titulo-secao">{HOJE_TOPO.titulo}</h2>
              <p className="texto-medida">
                <span data-descreve="hoje" className="texto-ate-60">
                  {HOJE_TOPO.celular}
                </span>
                <span data-descreve="hoje" className="texto-a-partir-de-60">
                  {HOJE_TOPO.notebook}
                </span>
              </p>
            </div>
            <Aparelho tipo="notebook" tela="hoje" className="aparelho-a-partir-de-60">
              <TelaReal tela="hoje" />
            </Aparelho>
            <Aparelho tipo="celular" tela="hoje" className="aparelho-ate-60">
              <TelaReal tela="hoje" />
            </Aparelho>
          </div>
        </section>

        {/* Telas, no campo de urucum: o título, a legenda e o celular da Sessão (o Hoje já está
            no topo). A partir de 60 rem divide a fileira com a madrugada. */}
        <section
          id="secao-telas"
          aria-labelledby="titulo-telas"
          data-campo="accent"
          className="inicio-telas inicio-cartao inicio-par entrada atraso-1"
        >
          <div className="coluna-texto">
            <h2 id="titulo-telas" className="titulo-secao">
              {TELAS.titulo}
            </h2>
            <p className="texto-medida mt-4" data-descreve="sessao">
              {TELAS.texto}
            </p>
          </div>
          <Aparelho tipo="celular" tela="sessao">
            <TelaReal tela="sessao" />
          </Aparelho>
        </section>

        {/* Madrugada, no papel fundo escuro: o tema da noite vale só dentro do cartão (invólucro
            local), nunca no <html>. O título, o texto, a legenda e o celular com a Sessão da
            mamada de Heloísa (com o relógio parado), alinhados à esquerda. */}
        <section
          id="secao-madrugada"
          aria-labelledby="titulo-madrugada"
          data-campo="night-paper-deep"
          data-tema-local="madrugada"
          className="inicio-madrugada inicio-cartao inicio-par entrada atraso-2"
        >
          <div className="coluna-texto">
            <h2 id="titulo-madrugada" className="titulo-secao">
              {MADRUGADA.titulo}
            </h2>
            <p className="texto-medida mt-4">{MADRUGADA.texto}</p>
            <p className="texto-medida mt-4" data-descreve="madrugada">
              {LEGENDA_MADRUGADA}
            </p>
          </div>
          <Aparelho tipo="celular" tela="sessao" tema="madrugada">
            <TelaReal tela="madrugada" />
          </Aparelho>
        </section>

        {/* Para que serve, no papel: as três linhas da base e, ao lado (larga) ou embaixo, a
            ilustração num cartão de imagem que ela enche. Cada linha tem o rótulo e o texto
            lado a lado (a partir de 46 rem) ou o rótulo em cima do texto (estreita). */}
        <section
          id="secao-serve"
          aria-labelledby="titulo-serve"
          className="inicio-serve inicio-largo entrada atraso-2"
        >
          <div className="inicio-serve-corpo">
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
          </div>
          <div data-campo="field-1" className="inicio-imagem">
            <IlustracaoColo className="inicio-ilustracao" />
          </div>
        </section>

        {/* Fatos, no papel: um bloco de linhas, o termo grande à esquerda e a explicação à direita,
            na segunda coluna da grade, com uma linha fina entre as linhas. */}
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

        {/* Chamada, no campo de lavanda: o título, o texto e o link, na coluna de texto, e o celular
            com o Hoje e a legenda dele. Larga: o texto na primeira coluna e o celular na segunda;
            antes disso, um embaixo do outro. */}
        <section
          aria-labelledby="titulo-chamada"
          data-campo="field-2"
          className="inicio-chamada inicio-cartao inicio-largo entrada atraso-2"
        >
          <div className="coluna-texto inicio-chamada-texto">
            <h2 id="titulo-chamada" className="titulo-secao titulo-fecho">
              {CHAMADA.titulo}
            </h2>
            <div className="inicio-chamada-acao">
              <p className="texto-medida mt-4">{CHAMADA.texto}</p>
              <p className="mt-6">
                <Link to="/app/hoje" className="botao botao-principal botao-fecho">
                  {CHAMADA.link}
                </Link>
              </p>
            </div>
          </div>
          <div className="inicio-lado">
            <Aparelho tipo="celular" tela="hoje">
              <TelaReal tela="hoje" />
            </Aparelho>
            <div className="coluna-texto">
              <p className="texto-medida" data-descreve="hoje">
                {LEGENDA_CHAMADA}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* O fecho: um bloco de tinta de largura total, com o nome em letras grandes e o rodapé. */}
      <footer className="inicio-rodape">
        <p className="inicio-rodape-marca">AppMaternidade</p>
        <div className="inicio-rodape-linhas">
          <div className="inicio-rodape-textos">
            <p>{RODAPE}</p>
          </div>
          <Link to="/" className="alvo-toque inicio-rodape-link inline-flex">
            Início
          </Link>
        </div>
      </footer>
    </div>
  )
}
