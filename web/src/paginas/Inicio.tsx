import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import {
  APRESENTACAO,
  CHAMADA,
  CITACAO_AVISO,
  CITACAO_TEXTO,
  FATOS,
  LINK_ABERTURA,
  MIDIAS_INICIO,
  MINIATURAS,
  NAVEGACAO,
  PARA_QUE_SERVE,
  PILARES,
  PROMESSA,
  ROTULO_ATALHOS,
  SECAO_ESCURA,
  SUBTITULO_INICIO,
  TELAS,
  TITULO_APRESENTACAO,
} from '../conteudo/textos.ts'
import { Abertura } from '../componentes/base/Abertura.tsx'
import { Etiqueta } from '../componentes/base/Etiqueta.tsx'
import { FaixaNumeros } from '../componentes/base/FaixaNumeros.tsx'
import { Galeria } from '../componentes/base/Galeria.tsx'
import { LinhaRotuloTexto } from '../componentes/base/LinhaRotuloTexto.tsx'
import { Midia } from '../componentes/base/Midia.tsx'
import {
  CenaCartao,
  CenaCelulares,
  CenaIlustracao,
  CenaMadrugada,
  CenaMosaico,
  CenaNotebook,
  CenaRetrato,
  CenaSessao,
} from '../componentes/midia/cenas.tsx'
import { useEntradaDasMidias } from '../movimento/entradaMidias.ts'
import { AvisoAbertura } from '../componentes/vitrine/AvisoAbertura.tsx'
import { CartaoTela } from '../componentes/vitrine/CartaoTela.tsx'
import { Citacao } from '../componentes/vitrine/Citacao.tsx'
import { NavegacaoGrande } from '../componentes/vitrine/NavegacaoGrande.tsx'
import { PerguntaCta } from '../componentes/vitrine/PerguntaCta.tsx'
import { SecaoEscura } from '../componentes/vitrine/SecaoEscura.tsx'
import { usePrototipo } from '../prototipo/contexto.ts'

const { galeria } = MIDIAS_INICIO

/**
 * O Início, nos 13 blocos do contrato (MAT-44d): abertura, mídia, apresentação, números, mídia,
 * linhas, galeria, citação, cartões, pergunta com CTA, palavras grandes, seção escura (fora do
 * `main`, de borda a borda) e o rodapé da casca. Cada moldura de mídia leva uma cena em CSS 3D
 * (aparelhos com a captura real das nossas telas, ilustrações, mosaico), como filha direta dela.
 * A entrada ao rolar (M3) liga nos próprios nós `[data-midia]`, sem embrulhá-los.
 */
export function Inicio() {
  const { dispatch } = usePrototipo()
  const principal = useRef<HTMLElement>(null)
  useEntradaDasMidias(principal)

  // O Início é sempre claro: sair do modo madrugada ao chegar aqui.
  useEffect(() => {
    dispatch({ tipo: 'definirMadrugada', valor: false })
  }, [dispatch])

  return (
    <>
      <main className="vt-inicio" ref={principal}>
        <Abertura
          titulo={PROMESSA}
          subtitulo={SUBTITULO_INICIO}
          lateral={[
            ...PILARES.map((pilar) => (
              <li key={pilar}>
                <Etiqueta>{pilar}</Etiqueta>
              </li>
            )),
            <AvisoAbertura key="aviso" />,
            <li key="link">
              <Link className="sb-abertura-link t-corpo alvo-toque" to="/app/hoje">
                {LINK_ABERTURA}
              </Link>
            </li>,
          ]}
        />

        <div className="sb-area sb-mt-fio-bloco" data-bloco="">
          <Midia formato="larga" fundo="barro" aria-label={MIDIAS_INICIO.notebook}>
            <CenaNotebook />
          </Midia>
        </div>

        <section className="sb-area sb-mt-midia-titulo" data-bloco="">
          <div className="grade-10">
            <div className="col-c2-c8">
              <h2 className="vt-apresentacao-titulo t-subtitulo">{TITULO_APRESENTACAO}</h2>
              <p className="vt-apresentacao-texto t-corpo-g" data-apresentacao="">
                {APRESENTACAO}
              </p>
            </div>
          </div>
        </section>

        <section className="sb-area sb-mt-par-numeros" aria-label={FATOS.titulo}>
          <FaixaNumeros itens={FATOS.itens} />
        </section>

        <div className="sb-area sb-mt-numeros-midia" data-bloco="">
          <Midia formato="larga" fundo="lavanda" aria-label={MIDIAS_INICIO.celulares}>
            <CenaCelulares />
          </Midia>
        </div>

        <section className="sb-area sb-mt-midia-linhas" data-bloco="">
          <div className="grade-10">
            <h2 className="vt-linhas-titulo col-c2-c8 t-subtitulo">{PARA_QUE_SERVE.titulo}</h2>
          </div>
          {PARA_QUE_SERVE.linhas.map((linha) => (
            <LinhaRotuloTexto key={linha.rotulo} rotulo={linha.rotulo}>
              {linha.texto}
            </LinhaRotuloTexto>
          ))}
        </section>

        <div className="sb-area sb-mt-midia-linhas">
          <Galeria>
            <Midia formato="larga" fundo="barro" aria-label={galeria.sessao}>
              <CenaSessao />
            </Midia>
            <Midia formato="larga" fundo="lavanda" aria-label={galeria.madrugada}>
              <CenaMadrugada />
            </Midia>
            <Midia formato="par" fundo="barro" aria-label={galeria.ilustracoes[0]}>
              <CenaIlustracao qual="berco" />
            </Midia>
            <Midia formato="par" fundo="lavanda" aria-label={galeria.ilustracoes[1]}>
              <CenaIlustracao qual="mamada" />
            </Midia>
            <Midia formato="larga" fundo="barro" aria-label={galeria.mosaico}>
              <CenaMosaico />
            </Midia>
          </Galeria>
        </div>

        <Citacao
          texto={CITACAO_TEXTO}
          autoria={`${MINIATURAS.hoje.nota.autor} · ${CITACAO_AVISO}`}
          rotuloRetrato={MIDIAS_INICIO.retrato}
          midia={<CenaRetrato />}
        />

        <section className="sb-area sb-mt-midia-linhas vt-cartoes" aria-labelledby="titulo-cartoes" data-bloco="">
          <h2 id="titulo-cartoes" className="vt-cartoes-titulo t-rotulo">
            {TELAS.titulo}
          </h2>
          <div className="vt-cartoes-grade">
            {TELAS.cartoes.map((cartao, i) => (
              <CartaoTela
                key={cartao.destino}
                to={cartao.destino}
                titulo={cartao.titulo}
                linha={cartao.linha}
                rotuloMidia={cartao.rotuloMidia}
                fundo={i === 0 ? 'barro' : 'lavanda'}
                midia={<CenaCartao tela={i === 0 ? 'hoje' : 'sessao'} />}
              />
            ))}
          </div>
        </section>

        <PerguntaCta
          pergunta={CHAMADA.titulo}
          cta={CHAMADA.link}
          destinoCta={CHAMADA.destino}
          contorno={CHAMADA.entrar}
          destinoContorno={CHAMADA.destinoEntrar}
        />

        <NavegacaoGrande rotulo={ROTULO_ATALHOS} links={NAVEGACAO} />
      </main>

      <SecaoEscura
        titulo={SECAO_ESCURA.titulo}
        texto={SECAO_ESCURA.texto}
        botao={SECAO_ESCURA.botao}
        destino={SECAO_ESCURA.destino}
      />
    </>
  )
}
