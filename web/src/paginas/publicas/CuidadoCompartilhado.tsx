import { useEffect } from 'react'
import '../../componentes/inicio-composicao/composicao.css'
import { Legenda, Telefone } from '../../componentes/inicio-composicao/pecas.tsx'
import { AberturaCuidado } from '../../componentes/cuidado-casa/AberturaCuidado.tsx'
import { HorasNoTexto } from '../../componentes/cuidado-casa/HorasNoTexto.tsx'
import { PapeisDaFamilia } from '../../componentes/cuidado-casa/PapeisDaFamilia.tsx'
import { BotaoLargo } from '../../componentes/secoes/BotaoLargo.tsx'
import { PaginaCasa } from '../../componentes/secoes/PaginaCasa.tsx'
import { ARTE_CUIDADO, CUIDADO, DESTINO_CRIAR_CONTA } from '../../conteudo/casa/cuidado.ts'
import { NOMES_DE_PAGINA } from '../../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './useTitulo.ts'

/**
 * /cuidado-compartilhado: "a porta" (quem entra e o que vê).
 * Página de dia com uma linha de chão contínua; M12 (família + porta) abre na primeira tela junto do título e do
 * celular Família; M01 e M05 saem desta página; as faixas 4 e 7 sustentam-se por tipografia (13:00 / 14:40) e pela
 * fresta de luz de mel na noite, sem espaços reservados para A-CC4 nem A-CC7. Todo texto vem de `CUIDADO`, inalterado.
 */
export function CuidadoCompartilhado() {
  useTituloDaPagina(NOMES_DE_PAGINA.cuidadoCompartilhado)

  useEffect(() => {
    document.documentElement.dataset.paginaCuidado = ''
    return () => {
      delete document.documentElement.dataset.paginaCuidado
    }
  }, [])

  return (
    <main>
      <PaginaCasa>
        <div className="co cc-pagina">
          <AberturaCuidado />
          <PapeisDaFamilia />

          <section className="cc-faixa cc-sono" aria-labelledby="cc-sono">
            <div className="cc-sono-horas" aria-hidden="true">
              <span className="cc-sono-hora">13:00</span>
              <span className="cc-sono-hora">14:40</span>
            </div>
            <div className="co-texto cc-sono-texto">
              <h2 id="cc-sono" className="co-h2">
                {CUIDADO.sono.h2}
              </h2>
              <p className="co-p">
                <HorasNoTexto texto={CUIDADO.sono.p} />
              </p>
            </div>
            <span className="cc-sono-chao" aria-hidden="true" />
          </section>

          <section className="cc-faixa cc-senha" aria-labelledby="cc-senha">
            <div className="cc-senha-dentro">
              <div className="cc-senha-grade">
                <Telefone
                  arte={ARTE_CUIDADO}
                  nome="historico"
                  alt={CUIDADO.senha.legenda}
                  sizes="(min-width: 69em) 360px, 300px"
                  className="cc-senha-fone"
                />
                <div className="co-texto cc-senha-texto">
                  <h2 id="cc-senha" className="co-h2">
                    {CUIDADO.senha.h2}
                  </h2>
                  <p className="co-p">{CUIDADO.senha.p}</p>
                </div>
              </div>
              <div className="cc-senha-chao">
                <Legenda texto={CUIDADO.senha.legenda} className="cc-senha-leg" />
              </div>
            </div>
          </section>

          <section className="cc-faixa cc-parar-faixa" aria-labelledby="cc-parar">
            <div className="co-texto cc-parar">
              <h2 id="cc-parar" className="co-h2">
                {CUIDADO.parar.h2}
              </h2>
              <div className="cc-parar-corpo">
                <p className="co-p">{CUIDADO.parar.p1}</p>
                <p className="co-p">{CUIDADO.parar.p2}</p>
              </div>
            </div>
            <span className="cc-parar-chao" aria-hidden="true" />
          </section>

          <section className="cc-faixa cc-fecho" aria-labelledby="cc-fecho">
            <div className="cc-porta-luz" aria-hidden="true">
              <span className="cc-porta-fresta" />
              <span className="cc-porta-cunha" />
            </div>
            <div className="co-texto cc-fecho-texto">
              <h2 id="cc-fecho" className="co-h2">
                {CUIDADO.fecho.h2}
              </h2>
              <div className="co-acoes">
                <BotaoLargo variante="mel" rotulo={CUIDADO.fecho.cta2} para={DESTINO_CRIAR_CONTA} />
              </div>
            </div>
            <span className="cc-fecho-chao" aria-hidden="true" />
          </section>
        </div>
      </PaginaCasa>
    </main>
  )
}
