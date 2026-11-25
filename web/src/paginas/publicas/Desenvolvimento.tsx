import { useEffect } from 'react'
import { Abertura } from '../../componentes/desenvolvimento-casa/Abertura.tsx'
import { Etiqueta } from '../../componentes/desenvolvimento-casa/Etiqueta.tsx'
import { Fases } from '../../componentes/desenvolvimento-casa/Fases.tsx'
import { Fontes } from '../../componentes/desenvolvimento-casa/Fontes.tsx'
import { Partes } from '../../componentes/desenvolvimento-casa/Partes.tsx'
import { Registro } from '../../componentes/desenvolvimento-casa/Registro.tsx'
import { TabelaQuantoTempo } from '../../componentes/desenvolvimento-casa/TabelaQuantoTempo.tsx'
import { FaixaInteira } from '../../componentes/secoes/FaixaInteira.tsx'
import { PaginaCasa } from '../../componentes/secoes/PaginaCasa.tsx'
import { CENA_FAMILIA, DESENVOLVIMENTO_CASA as D } from '../../conteudo/casa/desenvolvimento.ts'
import { IDEIAS, MARCOS, QUANTO_TEMPO, TUMMY_TIME } from '../../conteudo/desenvolvimento/itens.ts'
import { DESENVOLVIMENTO_DESTAQUE, ROTULOS_FONTES } from '../../conteudo/desenvolvimento/pagina.ts'
import { NOMES_DE_PAGINA } from '../../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './useTitulo.ts'

// As partes do tummy time: três pilares iniciais (o que é, segurança, quando começar) antes da tabela e a última
// ("se o bebê reclamar") depois dela, ao lado da postura sem meta. Nos marcos, três tópicos corridos e o fechamento
// de cuidado ("quando conversar com o profissional") destacado antes da faixa do 192.
const TUMMY_PILARES = TUMMY_TIME.itens.slice(0, 3)
const TUMMY_DEPOIS = TUMMY_TIME.itens.slice(3)
const MARCOS_BASE = MARCOS.itens.slice(0, 3)
const MARCOS_PROFISSIONAL = MARCOS.itens.slice(3)

/**
 * /desenvolvimento nas seções compartilhadas da casa:
 * 1. Abertura editorial (papel): pergunta central, ações e cena M04 no tapete como ponto focal único.
 * 2. Registro (areia): prova real do Histórico das 15:00 na moldura ao lado do argumento.
 * 3. Ideias por fase (papel): regras universais em destaque plano, retrato da família, seletor rotulado com estado
 *    ativo e lista aberta das seis fases.
 * 4. Tummy time segundo as fontes (areia): três pilares em grade horizontal, tabela comparativa, postura sem meta em
 *    destaque editorial ao lado de "Se o bebê reclamar" e fontes.
 * 5. Marcos sem cobrança (papel): trilho esquerdo fixo (título, resumo, faixa, fontes) e leitura corrida com fios à
 *    direita, fechando com o alerta de conversa com o profissional em destaque plano.
 * 6. Urgência 192 (cacau): fecho em contraste separado do rodapé.
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
          <Registro />
        </FaixaInteira>

        <FaixaInteira fundo="papel" idTitulo="dc-ideias-titulo">
          <div id="ideias" className="dc-grade">
            <div className="dc-ideias">
              <div className="dc-ideias-texto">
                <h2 id="dc-ideias-titulo" className="dc-titulo text-titulo-1 font-titulo cm-sec-titulo">
                  {D.h2Ideias}
                </h2>
                <p className="text-abertura font-texto cm-sec-texto">{IDEIAS.texto}</p>
                <div className="dc-regras">
                  <h3 className="text-titulo-4 font-titulo cm-sec-titulo">{IDEIAS.todasTitulo}</h3>
                  <ul className="dc-itens text-corpo font-texto">
                    {IDEIAS.todas.map((linha) => (
                      <li key={linha}>{linha}</li>
                    ))}
                  </ul>
                </div>
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
            <div className="dc-tummy">
              <div className="dc-cabeca-duas">
                <h2 id="dc-tummy-titulo" className="dc-titulo text-titulo-1 font-titulo cm-sec-titulo">
                  {D.h2Tummy}
                </h2>
                <div className="dc-intro">
                  <p className="text-abertura font-texto cm-sec-texto">{TUMMY_TIME.resumo}</p>
                  <Etiqueta texto={`${ROTULOS_FONTES.faixa} ${TUMMY_TIME.faixa}`} />
                </div>
              </div>

              <div className="dc-pilares">
                <Partes partes={TUMMY_PILARES} variante="pilares" />
              </div>

              <div className="dc-tabela-quadro">
                <TabelaQuantoTempo />
              </div>

              <div className="dc-tummy-fecho">
                <p className="dc-postura text-abertura font-texto cm-sec-texto">{QUANTO_TEMPO.semMeta}</p>
                <div className="dc-bloco">
                  <Partes partes={TUMMY_DEPOIS} />
                </div>
              </div>

              <div className="dc-largo dc-fontes-barra">
                <Fontes fontes={TUMMY_TIME.fontes} consultadoEm={TUMMY_TIME.consultadoEm} />
              </div>
            </div>
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="papel" idTitulo="dc-marcos-titulo">
          <div id="marcos" data-item={MARCOS.id} className="dc-grade">
            <div className="dc-marcos">
              <div className="dc-marcos-trilho">
                <h2 id="dc-marcos-titulo" className="dc-titulo text-titulo-1 font-titulo cm-sec-titulo">
                  {D.h2Marcos}
                </h2>
                <div className="dc-intro">
                  <p className="text-abertura font-texto cm-sec-texto">{MARCOS.resumo}</p>
                  <Etiqueta texto={`${ROTULOS_FONTES.faixa} ${MARCOS.faixa}`} />
                </div>
              </div>

              <div className="dc-marcos-conteudo">
                <Partes partes={MARCOS_BASE} variante="trilho" />
                <div className="dc-marcos-destaque">
                  <Partes partes={MARCOS_PROFISSIONAL} />
                </div>
              </div>

              <div className="dc-marcos-fontes">
                <Fontes fontes={MARCOS.fontes} consultadoEm={MARCOS.consultadoEm} />
              </div>
            </div>
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="cacau" idTitulo="dc-urgencia-titulo">
          <div className="dc-grade dc-urgencia-wrap">
            <div className="dc-urgencia">
              <h2 id="dc-urgencia-titulo" className="dc-urgencia-titulo text-titulo-1 font-titulo cm-sec-titulo">
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
