import { QuadroLayout } from '../base/layout/QuadroLayout.tsx'
import { BotaoLargo } from '../secoes/BotaoLargo.tsx'
import { ProdutoEmMoldura } from '../secoes/ProdutoEmMoldura.tsx'
import { CUIDADO, DESTINO_CRIAR_CONTA, IMAGENS_CUIDADO } from '../../conteudo/casa/cuidado.ts'
import { CenaDaPagina } from './CenaDaPagina.tsx'
import './cuidado-casa.css'

/**
 * A primeira faixa, em papel: a cena (CC-S1, a placa inteira, sem a cena herói do pacote), o título, o texto, a
 * ação, a tela Família na moldura (CC-S2) e "por enquanto, somos três". A composição muda pela largura do contêiner
 * da página (cuidado-casa.css): uma coluna no celular (cena, título, texto, a ação logo abaixo, a moldura e o
 * "três"), duas colunas de 640 em diante (cena e chamada; moldura e "três") e, de 1024 em diante, a cena à
 * esquerda com o "três" embaixo e a chamada com a moldura à direita.
 */
export function AberturaCuidado() {
  return (
    <section data-faixa="" data-faixa-fundo="papel" aria-labelledby="cc-h1" className="cc-abertura">
      <QuadroLayout className="cc-abertura-quadro">
        <CenaDaPagina cena={IMAGENS_CUIDADO.cena1} alt={CUIDADO.alt.cena1} prioritaria />

        <div className="cc-texto">
          <div className="cc-chamada">
            <div className="cc-titulos">
              <h1 id="cc-h1" className="cm-h1 cm-exibicao">
                {CUIDADO.h1}
              </h1>
              <p className="text-abertura font-texto cm-sec-texto cc-medida">{CUIDADO.lede}</p>
            </div>
            <BotaoLargo variante="primario" rotulo={CUIDADO.cta1} para={DESTINO_CRIAR_CONTA} />
          </div>
          <div className="cc-moldura">
            <ProdutoEmMoldura tela={{ ...IMAGENS_CUIDADO.tela, alt: CUIDADO.alt.tela1 }} moldura={IMAGENS_CUIDADO.moldura} />
          </div>
        </div>

        <div className="cc-tres cc-medida">
          <div className="cc-par">
            <h2 className="text-titulo-1 font-titulo cm-sec-titulo">{CUIDADO.tres.h2}</h2>
            <p className="text-corpo font-texto cm-sec-texto">{CUIDADO.tres.p}</p>
          </div>
        </div>
      </QuadroLayout>
    </section>
  )
}
