import { Botao } from '../componentes/base/Botao.tsx'
import { TelefoneDemo } from '../componentes/demo-telefone/TelefoneDemo.tsx'
import { ID_FAIXA_NOITE, ID_FAIXA_SO, ID_FAIXA_TELA, ID_TITULO } from '../componentes/inicio-casa/ids.ts'
import { useGanchoDoCabecalho } from '../componentes/inicio-casa/usoDaCasa.ts'
import { BotaoLargo } from '../componentes/secoes/BotaoLargo.tsx'
import { PaginaCasa } from '../componentes/secoes/PaginaCasa.tsx'
import { INI, INI_FATOS, INI_HORAS, INI_PERGUNTAS, INI_REF, INI_ROTAS } from '../conteudo/inicio.ts'
// The display cut of Literata (optical size axis): the large titles and the hours pick it by themselves.
import '../componentes/inicio-composicao/composicao.css'
import { Legenda, Telefone } from '../componentes/inicio-composicao/pecas.tsx'

/** The wide composition (the room strip): the same query is written literally in composicao.css. */
const LARGA = '(min-width: 69em) and (min-aspect-ratio: 1/1)'

const RAIZ = import.meta.env.BASE_URL

/** The folder of the cut-outs (palette A, the only one). */
const ARTE = `${RAIZ}composicao/a`

/** A slot that still waits for art: a dashed outline with its label, so the gap is seen and not papered over. */
function Vaga({ rotulo, className }: { rotulo: string; className?: string }) {
  return (
    <p className={`co-vaga ${className ?? ''}`} data-aguarda-arte="">
      {rotulo}
    </p>
  )
}

/**
 * The Início, reference composition "a luz, pela hora" (branch fable/home-composicao). Seven scenes on one floor line:
 * 1 16:00, the day room and the hand-over (M05); 2 17:30, the night room (M06, the lamp) and the Histórico; 3 20:30, the
 * hour as type and the Hoje screen at night; 4 the lone carer (M04) and the Família screen; 5 the statement on the mat's
 * colour and the Notas screen; 6 the questions and the door; 7 the street at dusk on the footer line.
 * Palette A only (the cut-outs live in public/composicao/a). Scenes 1 to 3 are one strip: on a wide landscape window with scroll timelines and no reduced-motion preference the
 * strip is pinned and the vertical scroll walks it sideways (composicao.css); everywhere else the three scenes stack.
 * Every string comes from conteudo/inicio.ts.
 */
export function Inicio() {
  useGanchoDoCabecalho(false)
  const arte = ARTE

  return (
    <main>
      <PaginaCasa>
        <div className="co">
          <div className="co-trilho">
            <div className="co-palco">
              <div className="co-fita">
                <section className="co-painel co-p1" data-cena-heroi="" aria-labelledby={ID_TITULO}>
                  <span className="co-fantasma" aria-hidden="true">
                    {INI_HORAS[0]}
                  </span>
                  <div className="co-texto co-p1-texto">
                    <h1 id={ID_TITULO} className="co-h1">
                      <span data-h1-dia="">{INI.h1Dia}</span> <span data-h1-noite="">{INI.h1Noite}</span>
                    </h1>
                    <p className="co-lede">{INI.lede}</p>
                    <div className="co-acoes">
                      <BotaoLargo rotulo={INI.cta1} para={INI_ROTAS.criarConta} variante="mel" />
                      <Botao to={INI_ROTAS.comoFunciona} variante="texto" tamanho="site">
                        {INI.cta2}
                      </Botao>
                    </div>
                  </div>
                  <div className="co-p1-cena">
                    <div className="co-placa co-m05">
                      <picture>
                        <source media={LARGA} srcSet={`${arte}/m05.webp`} width={1672} height={941} />
                        <img src={`${arte}/m05m.webp`} width={1170} height={918} alt={INI.altCena1} fetchPriority="high" decoding="async" />
                      </picture>
                      <picture>
                        <source media={LARGA} srcSet={`${RAIZ}cenas/inicio/m05-luz-1672w.png`} width={1672} height={941} />
                        <img className="co-luz" src={`${RAIZ}cenas/inicio/m05-luz-390c-1170w.png`} width={1170} height={918} alt="" decoding="async" />
                      </picture>
                    </div>
                    <Legenda texto={INI.leg1} className="co-p1-leg" />
                  </div>
                </section>

                <section className="co-painel co-p2" aria-labelledby={ID_FAIXA_NOITE}>
                  <span className="co-fantasma" aria-hidden="true">
                    {INI_HORAS[1]}
                  </span>
                  <div className="co-texto co-p2-texto">
                    <h2 id={ID_FAIXA_NOITE} className="co-h2">
                      {INI.h2Noite}
                    </h2>
                    <p className="co-p">{INI.pNoite}</p>
                  </div>
                  <div className="co-p2-cena">
                    <TelefoneDemo fluxo="historico" className="co-p2-fone">
                      <Telefone arte={arte} nome="historico" alt={INI.altTela1} sizes={`${LARGA} 360px, 64vw`} className="co-p2-fone" />
                    </TelefoneDemo>
                    <div className="co-placa co-m06">
                      <img src={`${arte}/m06.webp`} width={900} height={1470} alt={INI.altCena2} loading="lazy" decoding="async" />
                      <img className="co-luz" src={`${RAIZ}cenas/inicio/m06-luz-792w.png`} width={792} height={1293} alt="" loading="lazy" decoding="async" />
                    </div>
                    <Legenda texto={INI.leg2} className="co-p2-leg" />
                  </div>
                </section>

                <section className="co-painel co-p3" aria-labelledby={ID_FAIXA_TELA}>
                  <div className="co-texto co-p3-texto">
                    <h2 id={ID_FAIXA_TELA} className="co-h2 co-h2-hora">
                      {INI.h2Tela}
                    </h2>
                    <p className="co-p">{INI.pTela}</p>
                  </div>
                  <div className="co-p3-cena">
                    <Vaga rotulo={INI_REF.slotBerco} className="co-p3-vaga" />
                    <TelefoneDemo fluxo="hoje" className="co-p3-fone">
                      <Telefone arte={arte} nome="hoje-n" alt={INI.altTela2} sizes={`${LARGA} 360px, 78vw`} className="co-p3-fone" />
                    </TelefoneDemo>
                  </div>
                </section>
              </div>
              <ol className="co-regua" aria-hidden="true">
                {INI_HORAS.map((hora) => (
                  <li key={hora}>{hora}</li>
                ))}
              </ol>
            </div>
          </div>

          <section className="co-faixa co-so" aria-labelledby={ID_FAIXA_SO}>
            <div className="co-dentro">
              <div className="co-texto co-so-texto">
                <h2 id={ID_FAIXA_SO} className="co-h2">
                  {INI.h2So}
                </h2>
                <p className="co-p">{INI.pSo}</p>
              </div>
              <TelefoneDemo fluxo="familia" className="co-so-fone">
                <Telefone arte={arte} nome="familia" alt={INI.altTela3} sizes={`${LARGA} 290px, 64vw`} className="co-so-fone" />
              </TelefoneDemo>
              <figure className="co-placa co-m04">
                <img src={`${arte}/m04.webp`} width={1200} height={870} alt={INI.altCena3} loading="lazy" decoding="async" />
              </figure>
            </div>
          </section>

          <section className="co-faixa co-prova" aria-labelledby="co-prova">
            <div className="co-dentro">
              <div className="co-texto co-prova-texto">
                <h2 id="co-prova" className="co-h2">
                  {INI.h2Prova}
                </h2>
                <p className="co-p">{INI.pProva}</p>
                <ul className="co-fatos">
                  {INI_FATOS.map((fato) => (
                    <li key={fato}>{fato}</li>
                  ))}
                </ul>
              </div>
              <TelefoneDemo fluxo="notas" className="co-prova-fone">
                <Telefone arte={arte} nome="notas" alt={INI.altNotas} sizes={`${LARGA} 375px, 78vw`} className="co-prova-fone" />
              </TelefoneDemo>
            </div>
          </section>

          <section id="perguntas" className="co-faixa co-perg" aria-labelledby="co-perg">
            <div className="co-dentro">
              <div className="co-texto co-perg-texto">
                <h2 id="co-perg" className="co-h2">
                  {INI.h2Perg}
                </h2>
                <dl className="co-perguntas">
                  {INI_PERGUNTAS.map(({ pergunta, resposta }) => (
                    <div key={pergunta}>
                      <dt>{pergunta}</dt>
                      <dd>{resposta}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <figure className="co-placa co-porta">
                <img src={`${arte}/porta.webp`} width={1254} height={1070} alt={INI.altPorta} loading="lazy" decoding="async" />
                <Vaga rotulo={INI_REF.slotPorta} className="co-porta-vaga" />
              </figure>
            </div>
          </section>

          <section className="co-faixa co-fecho" aria-labelledby="co-fecho">
            <div className="co-dentro">
              <div className="co-texto co-fecho-texto">
                <h2 id="co-fecho" className="co-h2">
                  {INI.h2Fecho}
                </h2>
                <div className="co-acoes">
                  <BotaoLargo rotulo={INI.cta3} para={INI_ROTAS.criarConta} variante="mel" />
                </div>
              </div>
              {/* Decorative: the heading says it; the street only closes the house. */}
              <div className="co-placa co-rua">
                <img src={`${arte}/rua.webp`} width={1672} height={642} alt="" loading="lazy" decoding="async" />
                <img className="co-luz" src={`${RAIZ}cenas/inicio-faixas/a05-rua-luz-1672w.png`} width={1672} height={642} alt="" loading="lazy" decoding="async" />
              </div>
            </div>
          </section>
        </div>
      </PaginaCasa>
    </main>
  )
}
