import { Botao } from '../../componentes/base/Botao.tsx'
import { FaixaCacau } from '../../componentes/campo/FaixaCacau.tsx'
import { Ilustracao } from '../../componentes/campo/Ilustracao.tsx'
import { PainelCampo } from '../../componentes/campo/PainelCampo.tsx'
import { Titulo } from '../../componentes/campo/Titulo.tsx'
import { Abertura } from '../../componentes/publicas-destaque/Abertura.tsx'
import { AvisoSaude } from '../../componentes/publicas-destaque/AvisoSaude.tsx'
import { CabecaDeSecao } from '../../componentes/publicas-destaque/CabecaDeSecao.tsx'
import { CartaoPlano, CartaoTummy } from '../../componentes/publicas-destaque/CartoesApp.tsx'
import { CenaCacau } from '../../componentes/publicas-destaque/CenaCacau.tsx'
import { FontesDoItem } from '../../componentes/publicas-destaque/FontesDoItem.tsx'
import { PartesDoArtigo } from '../../componentes/publicas-destaque/PartesDoArtigo.tsx'
import { SeletorDeFase } from '../../componentes/publicas-destaque/SeletorDeFase.tsx'
import { TabelaTexto } from '../../componentes/publicas-destaque/TabelaTexto.tsx'
import { FASES, IDEIAS, MARCOS, QUANTO_TEMPO, TUMMY_TIME } from '../../conteudo/desenvolvimento/itens.ts'
import { DESENVOLVIMENTO_DESTAQUE as T, ROTULOS_FONTES } from '../../conteudo/desenvolvimento/pagina.ts'

// As partes do tummy time antes da tabela "quanto tempo" (o que é, segurança, quando começar); a
// última ("se o bebê reclamar") vem depois dela.
const ANTES_DA_TABELA = 3

/**
 * /desenvolvimento: a abertura com a cena de cacau (dois tablets, sem nada por cima) e, abaixo dela, o
 * registro do tummy time num cartão no fluxo; o aviso de saúde, uma vez, no texto da abertura; as
 * ideias para brincar por fase (abas), o que as fontes dizem sobre tummy time (com a tabela das
 * fontes, sem meta), os marcos sem cobrança e a faixa de cacau com o SAMU. Cada item mostra as fontes
 * e a data da consulta.
 */
export function Desenvolvimento() {
  return (
    <main className="pd-pagina">
      <Abertura
        disposicao="topo"
        titulo={T.titulo}
        texto={
          <>
            <p className="cm-lide">{T.lide}</p>
            <div className="pd-acoes">
              <Botao href={T.primario.destino}>{T.primario.rotulo}</Botao>
              <Botao variante="texto" href={T.secundario.destino} className="pd-link">
                {T.secundario.rotulo}
              </Botao>
            </div>
            <AvisoSaude />
          </>
        }
        midia={
          <>
            <CenaCacau base={T.cena.base} largura={T.cena.largura} altura={T.cena.altura} alt={T.cena.alt} prioritaria />
            <CartaoPlano className="pd-cartao-legenda">
              <CartaoTummy />
            </CartaoPlano>
          </>
        }
      />

      <section id="ideias" className="pd-secao" aria-labelledby="desenv-ideias">
        <CabecaDeSecao id="desenv-ideias" titulo={IDEIAS.titulo}>
          <p className="cm-lide">{IDEIAS.texto}</p>
        </CabecaDeSecao>
        <PainelCampo variante="areia">
          <SeletorDeFase
            fases={FASES}
            lateral={
              <>
                <h3 className="cm-h4">{IDEIAS.todasTitulo}</h3>
                <ul className="pd-lista cm-corpo">
                  {IDEIAS.todas.map((linha) => (
                    <li key={linha}>{linha}</li>
                  ))}
                </ul>
              </>
            }
          />
        </PainelCampo>
      </section>

      <section id="tummy-time" className="pd-secao" aria-labelledby="desenv-tummy" data-item={TUMMY_TIME.id}>
        <CabecaDeSecao id="desenv-tummy" titulo={T.tummyTitulo}>
          <p className="cm-lide">{TUMMY_TIME.resumo}</p>
          <p className="cm-pequeno pd-faixa-idade">{`${ROTULOS_FONTES.faixa} ${TUMMY_TIME.faixa}`}</p>
        </CabecaDeSecao>
        <div className="cm-area pd-tummy">
          <PartesDoArtigo partes={TUMMY_TIME.itens.slice(0, ANTES_DA_TABELA)} />
          <PainelCampo variante="mel" className="pd-celula pd-tummy-desenho">
            <div className="pd-chao">
              <Ilustracao nome="baba-tapete" carregamento="eager" />
            </div>
          </PainelCampo>
        </div>
        <TabelaTexto
          legenda={QUANTO_TEMPO.titulo}
          colunas={QUANTO_TEMPO.colunas}
          linhas={QUANTO_TEMPO.linhas}
          depois={<p className="cm-lide pd-tabela-depois">{QUANTO_TEMPO.semMeta}</p>}
          className="pd-tummy-tabela"
        />
        <div className="cm-area pd-tummy-fim">
          <PartesDoArtigo partes={TUMMY_TIME.itens.slice(ANTES_DA_TABELA)} />
          <FontesDoItem fontes={TUMMY_TIME.fontes} consultadoEm={TUMMY_TIME.consultadoEm} />
        </div>
      </section>

      <section id="marcos" className="pd-secao" aria-labelledby="desenv-marcos" data-item={MARCOS.id}>
        <CabecaDeSecao id="desenv-marcos" titulo={T.marcosTitulo}>
          <p className="cm-lide">{MARCOS.resumo}</p>
          <p className="cm-pequeno pd-faixa-idade">{`${ROTULOS_FONTES.faixa} ${MARCOS.faixa}`}</p>
        </CabecaDeSecao>
        <div className="cm-area pd-marcos">
          <PartesDoArtigo partes={MARCOS.itens} />
          <FontesDoItem fontes={MARCOS.fontes} consultadoEm={MARCOS.consultadoEm} />
        </div>
      </section>

      <div className="pd-secao">
        <FaixaCacau brilho aria-labelledby="desenv-urgencia">
          <div className="pd-faixa">
            <div className="pd-faixa-lado">
              <Titulo nivel="h2" id="desenv-urgencia" linhas={T.urgencia.titulo} />
            </div>
            <div className="pd-faixa-lado">
              <p className="cm-lide">{T.urgencia.texto}</p>
            </div>
          </div>
        </FaixaCacau>
      </div>
    </main>
  )
}
