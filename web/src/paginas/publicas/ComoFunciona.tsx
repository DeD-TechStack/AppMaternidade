import { useEffect } from 'react'
import '../../componentes/inicio-composicao/composicao.css'
import { Legenda } from '../../componentes/inicio-composicao/pecas.tsx'
import { BandaComecar } from '../../componentes/como-casa/BandaComecar.tsx'
import { BandaDepois } from '../../componentes/como-casa/BandaDepois.tsx'
import { BandaHistorico } from '../../componentes/como-casa/BandaHistorico.tsx'
import { BandaNota } from '../../componentes/como-casa/BandaNota.tsx'
import { ID_DO_TITULO, TextoDoHeroi } from '../../componentes/como-casa/TextoDoHeroi.tsx'
import { useCabecalhoNoite } from '../../componentes/casca/Cabecalho.tsx'
import { BotaoLargo, PaginaCasa } from '../../componentes/secoes/index.ts'
import { ARTE_COMO, CENA_M01, COMO_FUNCIONA as T, DESTINO_CRIAR_CONTA } from '../../conteudo/casa/comoFunciona.ts'
import { NOMES_DE_PAGINA } from '../../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './useTitulo.ts'

/**
 * /como-funciona: "um dia, pela hora" (03:00 -> 15:00 -> 18:00 -> amanhã).
 * Uma única linha de chão atravessa a página; cada faixa marca uma hora na voz da composição do Início.
 * Todo texto vem de `conteudo/casa/comoFunciona.ts`, inalterado; M01 entra como recorte, M04 sai, e os celulares são
 * desenhados em CSS (`Telefone`).
 */
export function ComoFunciona() {
  useTituloDaPagina(NOMES_DE_PAGINA.comoFunciona)
  useCabecalhoNoite()

  useEffect(() => {
    document.documentElement.dataset.paginaComoFunciona = ''
    return () => {
      delete document.documentElement.dataset.paginaComoFunciona
    }
  }, [])

  return (
    <main>
      <PaginaCasa>
        <div className="co cf-pagina">
          <section className="cf-faixa cf-heroi" aria-labelledby={ID_DO_TITULO}>
            <span className="co-fantasma cf-fantasma-noite cf-heroi-fantasma" aria-hidden="true">
              03:00
            </span>
            <TextoDoHeroi />
            <div className="co-placa cf-m01">
              <picture>
                <source
                  type="image/webp"
                  sizes="(min-width: 69em) and (min-aspect-ratio: 1/1) min(62vw, 56.25rem), 100vw"
                  srcSet={[
                    `${ARTE_COMO}/m01-agy04-400w.webp 400w`,
                    `${ARTE_COMO}/m01-agy04-640w.webp 640w`,
                    `${ARTE_COMO}/m01-agy04-800w.webp 800w`,
                    `${ARTE_COMO}/m01-agy04-960w.webp 960w`,
                    `${ARTE_COMO}/m01-agy04-1200w.webp 1200w`,
                    `${ARTE_COMO}/m01-agy04-1440w.webp 1440w`,
                    `${CENA_M01.src} 1672w`,
                  ].join(', ')}
                />
                <img
                  src={CENA_M01.src}
                  width={CENA_M01.largura}
                  height={CENA_M01.altura}
                  alt={T.altCena1}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </picture>
            </div>
            <div className="cf-heroi-chao">
              <Legenda texto={T.leg1} className="cf-heroi-leg" />
            </div>
          </section>

          <BandaHistorico />
          <BandaDepois />
          <BandaNota />
          <BandaComecar />

          <section className="cf-faixa cf-fecho" aria-labelledby="cf-fecho">
            <div className="cf-fecho-dia" aria-hidden="true">
              <span className="co-fantasma cf-fecho-fantasma">03:00</span>
              <span className="cf-fecho-chao-dia" />
            </div>
            <div className="co-texto cf-fecho-texto">
              <h2 id="cf-fecho" className="co-h2">
                {T.h2Fecho}
              </h2>
              <p className="co-p">{T.fecho}</p>
              <div className="co-acoes">
                <BotaoLargo rotulo={T.cta2} para={DESTINO_CRIAR_CONTA} variante="mel" />
              </div>
            </div>
            <span className="cf-fecho-chao-noite" aria-hidden="true" />
          </section>
        </div>
      </PaginaCasa>
    </main>
  )
}
