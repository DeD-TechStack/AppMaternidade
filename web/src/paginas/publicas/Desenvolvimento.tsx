import { useEffect } from 'react'
import { Abertura } from '../../componentes/desenvolvimento-casa/Abertura.tsx'
import { Etiqueta } from '../../componentes/desenvolvimento-casa/Etiqueta.tsx'
import { Fases } from '../../componentes/desenvolvimento-casa/Fases.tsx'
import { Fontes } from '../../componentes/desenvolvimento-casa/Fontes.tsx'
import { Partes } from '../../componentes/desenvolvimento-casa/Partes.tsx'
import { TabelaQuantoTempo } from '../../componentes/desenvolvimento-casa/TabelaQuantoTempo.tsx'
import { FaixaInteira } from '../../componentes/secoes/FaixaInteira.tsx'
import { PaginaCasa } from '../../componentes/secoes/PaginaCasa.tsx'
import { CENA_FAMILIA, DESENVOLVIMENTO_CASA as D } from '../../conteudo/casa/desenvolvimento.ts'
import { IDEIAS, MARCOS, QUANTO_TEMPO, TUMMY_TIME } from '../../conteudo/desenvolvimento/itens.ts'
import { DESENVOLVIMENTO_DESTAQUE, ROTULOS_FONTES } from '../../conteudo/desenvolvimento/pagina.ts'
import { NOMES_DE_PAGINA } from '../../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './useTitulo.ts'

// As partes do tummy time em dois blocos antes da tabela (o que é e segurança; quando começar) e a última ("se o
// bebê reclamar") depois dela, como no deck (2.3). Os marcos, em dois pares.
const TUMMY_A = TUMMY_TIME.itens.slice(0, 2)
const TUMMY_B = TUMMY_TIME.itens.slice(2, 3)
const TUMMY_DEPOIS = TUMMY_TIME.itens.slice(3)
const MARCOS_A = MARCOS.itens.slice(0, 2)
const MARCOS_B = MARCOS.itens.slice(2)

/**
 * /desenvolvimento nas seções compartilhadas da casa: uma abertura com a cena e o Histórico na moldura (a pergunta
 * "Ela já devia rolar?" e, na resposta, ideias e fontes, sem meta), o registro, as ideias por fase (as seis, em uma
 * lista só, sob a família), o tummy time pelas fontes, os marcos e a faixa de cacau do 192, onde a página acaba.
 * Cada faixa é uma malha de duas colunas (título e abertura em cima, o resto em pares) que vira uma coluna só quando
 * a faixa fica estreita (consulta de contêiner, CSS da página). O texto de saúde vem de `conteudo/desenvolvimento/*.ts`,
 * só de leitura; as frases do deck, de `conteudo/casa`.
 */
export function Desenvolvimento() {
  useTituloDaPagina(NOMES_DE_PAGINA.desenvolvimento)

  // O gancho da página: o CSS dela aquieta a pílula "Criar conta" do cabeçalho enquanto a abertura tem o botão.
  useEffect(() => {
    document.documentElement.dataset.paginaDesenvolvimento = ''
    return () => {
      delete document.documentElement.dataset.paginaDesenvolvimento
    }
  }, [])

  return (
    <main>
      <PaginaCasa>
        <Abertura />

        <FaixaInteira fundo="areia" idTitulo="dc-registro-titulo">
          <div className="dc-grade">
            <div className="dc-malha">
              <h2 id="dc-registro-titulo" className="dc-titulo text-titulo-1 font-titulo cm-sec-titulo">
                {D.h2Registro}
              </h2>
              <p className="dc-intro text-abertura font-texto cm-sec-texto">{D.pRegistro}</p>
            </div>
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="papel" idTitulo="dc-ideias-titulo">
          <div id="ideias" className="dc-grade">
            <div className="dc-malha dc-ideias">
              <div className="dc-ideias-texto">
                <h2 id="dc-ideias-titulo" className="text-titulo-1 font-titulo cm-sec-titulo">
                  {D.h2Ideias}
                </h2>
                <p className="text-corpo font-texto cm-sec-texto">{IDEIAS.texto}</p>
                <h3 className="text-titulo-4 font-titulo cm-sec-titulo">{IDEIAS.todasTitulo}</h3>
                <ul className="dc-itens text-corpo font-texto">
                  {IDEIAS.todas.map((linha) => (
                    <li key={linha}>{linha}</li>
                  ))}
                </ul>
              </div>
              <Fases />
              <div className="dc-familia">
                <picture>
                  {CENA_FAMILIA.avif ? (
                    <source type="image/avif" srcSet={CENA_FAMILIA.avif} sizes={CENA_FAMILIA.sizes} />
                  ) : null}
                  <img
                    src={CENA_FAMILIA.src}
                    srcSet={CENA_FAMILIA.srcSet}
                    sizes={CENA_FAMILIA.sizes}
                    width={CENA_FAMILIA.largura}
                    height={CENA_FAMILIA.altura}
                    alt={D.altCena2}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              </div>
            </div>
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="areia" idTitulo="dc-tummy-titulo">
          <div id="tummy-time" data-item={TUMMY_TIME.id} className="dc-grade">
            <div className="dc-malha">
              <h2 id="dc-tummy-titulo" className="dc-titulo text-titulo-1 font-titulo cm-sec-titulo">
                {D.h2Tummy}
              </h2>
              <div className="dc-intro">
                <p className="text-abertura font-texto cm-sec-texto">{TUMMY_TIME.resumo}</p>
                <Etiqueta texto={`${ROTULOS_FONTES.faixa} ${TUMMY_TIME.faixa}`} />
              </div>
              <div className="dc-bloco">
                <Partes partes={TUMMY_A} />
              </div>
              <div className="dc-bloco">
                <Partes partes={TUMMY_B} />
              </div>
              <div className="dc-largo">
                <TabelaQuantoTempo />
              </div>
              <p className="dc-bloco text-corpo font-texto cm-sec-texto">{QUANTO_TEMPO.semMeta}</p>
              <div className="dc-bloco">
                <Partes partes={TUMMY_DEPOIS} />
              </div>
              <div className="dc-largo">
                <Fontes fontes={TUMMY_TIME.fontes} consultadoEm={TUMMY_TIME.consultadoEm} />
              </div>
            </div>
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="papel" idTitulo="dc-marcos-titulo">
          <div id="marcos" data-item={MARCOS.id} className="dc-grade">
            <div className="dc-malha">
              <h2 id="dc-marcos-titulo" className="dc-titulo text-titulo-1 font-titulo cm-sec-titulo">
                {D.h2Marcos}
              </h2>
              <div className="dc-intro">
                <p className="text-abertura font-texto cm-sec-texto">{MARCOS.resumo}</p>
                <Etiqueta texto={`${ROTULOS_FONTES.faixa} ${MARCOS.faixa}`} />
              </div>
              <div className="dc-bloco">
                <Partes partes={MARCOS_A} />
              </div>
              <div className="dc-bloco">
                <Partes partes={MARCOS_B} />
              </div>
              <div className="dc-largo">
                <Fontes fontes={MARCOS.fontes} consultadoEm={MARCOS.consultadoEm} />
              </div>
            </div>
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="cacau" idTitulo="dc-urgencia-titulo">
          <div className="dc-grade">
            <div className="dc-malha">
              <h2 id="dc-urgencia-titulo" className="dc-titulo text-titulo-1 font-titulo cm-sec-titulo">
                {D.h2Urgencia}
              </h2>
              <p className="dc-intro text-abertura font-texto cm-sec-texto">{DESENVOLVIMENTO_DESTAQUE.urgencia.texto}</p>
            </div>
          </div>
        </FaixaInteira>
      </PaginaCasa>
    </main>
  )
}
