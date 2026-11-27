import { AVISO_SAUDE } from '../../conteudo/desenvolvimento/pagina.ts'
import {
  CENA_ABERTURA,
  CENA_ABERTURA_RECORTE,
  DESENVOLVIMENTO_CASA as D,
  DESTINOS_DESENVOLVIMENTO,
} from '../../conteudo/casa/desenvolvimento.ts'
import { Botao } from '../base/Botao.tsx'
import { QuadroLayout } from '../base/layout/index.ts'
import './desenvolvimento-casa.css'

/**
 * Primeira faixa de /desenvolvimento, sobre o papel: um ponto focal visual único (a cena M04 no tapete) ao lado do
 * bloco editorial coeso (h1 em escala de exibição, texto de apoio imediatamente abaixo, botão primário, link
 * secundário e o aviso de saúde ancorado sob um fio fino). O celular real com o Histórico mora na faixa seguinte,
 * exatamente ao lado do texto que o explica.
 */
export function Abertura() {
  return (
    <section className="dc-abertura" data-faixa-fundo="papel" aria-labelledby="dc-titulo">
      <QuadroLayout className="dc-abertura-quadro">
        <div className="dc-abertura-texto">
          <h1 id="dc-titulo" className="dc-h1 text-exibicao font-titulo cm-sec-titulo">
            {D.h1}
          </h1>
          <p className="dc-lede text-abertura font-texto cm-sec-texto">{D.lede}</p>
          <div className="dc-acoes">
            <Botao href={DESTINOS_DESENVOLVIMENTO.ideias}>{D.cta1}</Botao>
            <a className="dc-link text-corpo font-texto" href={DESTINOS_DESENVOLVIMENTO.tummy}>
              {D.cta2}
            </a>
          </div>
          <p className="dc-aviso text-pequeno font-texto cm-sec-texto" data-aviso-saude="">
            {AVISO_SAUDE}
          </p>
        </div>

        {/* A cena vem depois do texto no DOM (leitura e teclado chegam primeiro ao h1, frase e ações); no celular a
            grade posiciona a ilustração no topo para abrir a cena imediatamente. */}
        <picture className="dc-cena">
          {CENA_ABERTURA_RECORTE.avif ? (
            <source
              media="(max-width: 767px)"
              type="image/avif"
              srcSet={CENA_ABERTURA_RECORTE.avif}
              sizes={CENA_ABERTURA_RECORTE.sizes}
              width={CENA_ABERTURA_RECORTE.largura}
              height={CENA_ABERTURA_RECORTE.altura}
            />
          ) : null}
          <source
            media="(max-width: 767px)"
            srcSet={CENA_ABERTURA_RECORTE.srcSet}
            sizes={CENA_ABERTURA_RECORTE.sizes}
            width={CENA_ABERTURA_RECORTE.largura}
            height={CENA_ABERTURA_RECORTE.altura}
          />
          {CENA_ABERTURA.avif ? (
            <source type="image/avif" srcSet={CENA_ABERTURA.avif} sizes={CENA_ABERTURA.sizes} />
          ) : null}
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
      </QuadroLayout>
    </section>
  )
}
