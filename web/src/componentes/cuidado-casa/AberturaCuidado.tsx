import { BotaoLargo } from '../secoes/BotaoLargo.tsx'
import { Telefone } from '../inicio-composicao/pecas.tsx'
import { ARTE_CUIDADO, CENA_M12, CUIDADO, DESTINO_CRIAR_CONTA } from '../../conteudo/casa/cuidado.ts'
import './cuidado-casa.css'

/**
 * Faixas 1 e 2 de /cuidado-compartilhado ("a porta"):
 * - Faixa 1 (dia): recorte M12 (família + porta entreaberta) à esquerda, h1 + lede + CTA no centro, sobre a linha de
 *   chão de areia. Em 390: título, lede e ação vêm primeiro; M12 inteira logo abaixo.
 * - Faixa 2 (chão de areia): "Por enquanto, somos três." e o celular Família em CSS. Em 1440 o celular sobe para a
 *   mesma linha de chão da faixa 1 à extrema direita, cruzando a emenda para dentro desta faixa; em 390 fica aqui.
 */
export function AberturaCuidado() {
  return (
    <>
      <section className="cc-faixa cc-abertura" aria-labelledby="cc-h1">
        <div className="cc-abertura-grade">
          <div className="co-texto cc-abertura-texto">
            <h1 id="cc-h1" className="co-h1">
              {CUIDADO.h1}
            </h1>
            <p className="co-lede">{CUIDADO.lede}</p>
            <div className="co-acoes">
              <BotaoLargo variante="primario" rotulo={CUIDADO.cta1} para={DESTINO_CRIAR_CONTA} />
            </div>
          </div>
          <div className="co-placa cc-m12">
            <picture>
              <source
                type="image/webp"
                sizes="(min-width: 69em) and (min-aspect-ratio: 1/1) min(34vw, 31.5rem), min(90vw, 21.875rem)"
                srcSet={[
                  `${ARTE_CUIDADO}/m12-agy04-360w.webp 360w`,
                  `${ARTE_CUIDADO}/m12-agy04-520w.webp 520w`,
                  `${ARTE_CUIDADO}/m12-agy04-720w.webp 720w`,
                  `${ARTE_CUIDADO}/m12-agy04-840w.webp 840w`,
                  `${CENA_M12.src} 981w`,
                ].join(', ')}
              />
              <img
                src={CENA_M12.src}
                width={CENA_M12.largura}
                height={CENA_M12.altura}
                alt={CUIDADO.alt.cena1}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </div>
        </div>
        <span className="cc-abertura-chao" aria-hidden="true" />
      </section>

      <section className="cc-faixa cc-tres" aria-labelledby="cc-tres">
        <div className="cc-tres-grade">
          <Telefone
            arte={ARTE_CUIDADO}
            nome="familia"
            alt={CUIDADO.alt.tela1}
            sizes="(min-width: 69em) 288px, 300px"
            className="cc-tres-fone"
          />
          <div className="co-texto cc-tres-texto">
            <h2 id="cc-tres" className="co-h2">
              {CUIDADO.tres.h2}
            </h2>
            <p className="co-p">{CUIDADO.tres.p}</p>
          </div>
        </div>
      </section>
    </>
  )
}
