import { AVISO_SAUDE } from '../../conteudo/desenvolvimento/pagina.ts'
import {
  CENA_ABERTURA,
  CENA_ABERTURA_RECORTE,
  DESENVOLVIMENTO_CASA as D,
  DESTINOS_DESENVOLVIMENTO,
  MOLDURA_DIA,
  TELA_HISTORICO,
} from '../../conteudo/casa/desenvolvimento.ts'
import { Botao } from '../base/Botao.tsx'
import { QuadroLayout } from '../base/layout/index.ts'
import { Legenda } from '../secoes/Legenda.tsx'
import { ProdutoEmMoldura } from '../secoes/ProdutoEmMoldura.tsx'
import './desenvolvimento-casa.css'

/**
 * A primeira faixa de /desenvolvimento, sobre o papel (uma `section` da página, não a CenaHeroi): a cena M04 deitada
 * na borda de baixo da primeira tela, o h1 em cima, a frase e as duas ações à direita, o Histórico na moldura pendurado
 * à direita e, logo depois da dobra, a legenda e o aviso de saúde. Abaixo de 1100 tudo empilha (a cena recortada
 * rente ao cabeçalho); de 1100 em diante a cena e a moldura ficam no lugar do estudo, pela CSS da página.
 */
export function Abertura() {
  return (
    <section className="dc-abertura" data-faixa-fundo="papel" aria-labelledby="dc-titulo">
      <QuadroLayout className="dc-abertura-quadro">
        <picture className="dc-cena">
          <source
            media="(max-width: 767px)"
            srcSet={CENA_ABERTURA_RECORTE.srcSet}
            sizes={CENA_ABERTURA_RECORTE.sizes}
            width={CENA_ABERTURA_RECORTE.largura}
            height={CENA_ABERTURA_RECORTE.altura}
          />
          <img
            src={CENA_ABERTURA.src}
            srcSet={CENA_ABERTURA.srcSet}
            sizes={CENA_ABERTURA.sizes}
            width={CENA_ABERTURA.largura}
            height={CENA_ABERTURA.altura}
            alt={D.altCena1}
            fetchPriority="high"
            decoding="async"
          />
        </picture>

        <h1 id="dc-titulo" className="dc-h1 text-exibicao font-titulo cm-sec-titulo">
          {D.h1}
        </h1>

        <div className="dc-direita">
          <div className="dc-texto">
            <p className="dc-lede text-abertura font-texto cm-sec-texto">{D.lede}</p>
            <div className="dc-acoes">
              <Botao href={DESTINOS_DESENVOLVIMENTO.ideias}>{D.cta1}</Botao>
              <a className="dc-link text-corpo font-texto" href={DESTINOS_DESENVOLVIMENTO.tummy}>
                {D.cta2}
              </a>
            </div>
          </div>
          <div className="dc-moldura">
            <ProdutoEmMoldura tela={{ ...TELA_HISTORICO, alt: D.altTela1 }} moldura={MOLDURA_DIA} />
          </div>
        </div>

        <div className="dc-nota">
          <Legenda texto={D.legenda1} tom="dia" />
          <p className="dc-aviso text-corpo font-texto cm-sec-texto" data-aviso-saude="">
            {AVISO_SAUDE}
          </p>
        </div>
      </QuadroLayout>
    </section>
  )
}
