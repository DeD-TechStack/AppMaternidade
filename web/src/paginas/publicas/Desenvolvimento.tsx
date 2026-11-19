import { useEffect } from 'react'
import { Abertura } from '../../componentes/desenvolvimento-casa/Abertura.tsx'
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

// As partes do tummy time antes da tabela "quanto tempo" (o que é, segurança, quando começar); a última
// ("se o bebê reclamar") vem depois dela, como no deck (2.3).
const ANTES_DA_TABELA = 3

/**
 * /desenvolvimento nas seções compartilhadas da casa: uma abertura com a cena e o Histórico na moldura (a pergunta
 * "Ela já devia rolar?" e, na resposta, ideias e fontes, sem meta), o registro, as ideias por fase (as seis, em uma
 * lista só, ao lado da família), o tummy time pelas fontes, os marcos e a faixa de cacau do 192, onde a página acaba.
 * O texto de saúde vem de `conteudo/desenvolvimento/*.ts`, só de leitura; as frases do deck, de `conteudo/casa`.
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
          <div className="dc-registro">
            <h2 id="dc-registro-titulo" className="text-titulo-1 font-titulo cm-sec-titulo">
              {D.h2Registro}
            </h2>
            <p className="text-corpo font-texto cm-sec-texto">{D.pRegistro}</p>
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="papel" idTitulo="dc-ideias-titulo">
          <div id="ideias" className="dc-grade dc-ideias">
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
            </div>
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="areia" idTitulo="dc-tummy-titulo">
          <div id="tummy-time" data-item={TUMMY_TIME.id} className="dc-grade">
            <h2 id="dc-tummy-titulo" className="dc-titulo text-titulo-1 font-titulo cm-sec-titulo">
              {D.h2Tummy}
            </h2>
            <div className="dc-conteudo">
              <p className="text-abertura font-texto cm-sec-texto">{TUMMY_TIME.resumo}</p>
              <p className="text-pequeno font-texto">{`${ROTULOS_FONTES.faixa} ${TUMMY_TIME.faixa}`}</p>
              <Partes partes={TUMMY_TIME.itens.slice(0, ANTES_DA_TABELA)} />
              <TabelaQuantoTempo />
              <p className="text-corpo font-texto cm-sec-texto">{QUANTO_TEMPO.semMeta}</p>
              <Partes partes={TUMMY_TIME.itens.slice(ANTES_DA_TABELA)} />
              <Fontes fontes={TUMMY_TIME.fontes} consultadoEm={TUMMY_TIME.consultadoEm} />
            </div>
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="papel" idTitulo="dc-marcos-titulo">
          <div id="marcos" data-item={MARCOS.id} className="dc-grade">
            <h2 id="dc-marcos-titulo" className="dc-titulo text-titulo-1 font-titulo cm-sec-titulo">
              {D.h2Marcos}
            </h2>
            <div className="dc-conteudo">
              <p className="text-abertura font-texto cm-sec-texto">{MARCOS.resumo}</p>
              <p className="text-pequeno font-texto">{`${ROTULOS_FONTES.faixa} ${MARCOS.faixa}`}</p>
              <Partes partes={MARCOS.itens} />
              <Fontes fontes={MARCOS.fontes} consultadoEm={MARCOS.consultadoEm} />
            </div>
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="cacau" idTitulo="dc-urgencia-titulo">
          <div className="dc-grade">
            <h2 id="dc-urgencia-titulo" className="dc-titulo text-titulo-1 font-titulo cm-sec-titulo">
              {D.h2Urgencia}
            </h2>
            <div className="dc-conteudo">
              <p className="text-abertura font-texto cm-sec-texto">{DESENVOLVIMENTO_DESTAQUE.urgencia.texto}</p>
            </div>
          </div>
        </FaixaInteira>
      </PaginaCasa>
    </main>
  )
}
