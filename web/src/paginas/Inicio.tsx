import { useRef, type CSSProperties } from 'react'
import { AcoesDoHeroi } from '../componentes/inicio-casa/AcoesDoHeroi.tsx'
import { FaixaNoite } from '../componentes/inicio-casa/FaixaNoite.tsx'
import { FaixaSozinho } from '../componentes/inicio-casa/FaixaSozinho.tsx'
import { FaixaTela } from '../componentes/inicio-casa/FaixaTela.tsx'
import { ID_FAIXA_NOITE, ID_FAIXA_SO, ID_FAIXA_TELA, ID_TITULO } from '../componentes/inicio-casa/ids.ts'
import { LegendaAssinada } from '../componentes/inicio-casa/LegendaAssinada.tsx'
import {
  CAPTURA_NOTAS,
  LUZ_M05,
  LUZ_M05_390,
  LUZ_M11,
  M05,
  M05_390,
  M05_CHAO,
  M05_COSTURA,
  M05_LARGURA,
  M11_JANELA,
  MOLDURA_DIA,
  PORTA_NOITE,
} from '../componentes/inicio-casa/midia.ts'
import { PalcoTroca } from '../componentes/inicio-casa/PalcoTroca.tsx'
import { TituloCasa } from '../componentes/inicio-casa/TituloCasa.tsx'
import { useGanchoDoCabecalho, useSala } from '../componentes/inicio-casa/usoDaCasa.ts'
import { CenaHeroi } from '../componentes/secoes/CenaHeroi.tsx'
import { FaixaInteira } from '../componentes/secoes/FaixaInteira.tsx'
import { FaixaProva } from '../componentes/secoes/FaixaProva.tsx'
import { Fechamento } from '../componentes/secoes/Fechamento.tsx'
import { PaginaCasa } from '../componentes/secoes/PaginaCasa.tsx'
import { Perguntas } from '../componentes/secoes/Perguntas.tsx'
import { ProdutoEmMoldura } from '../componentes/secoes/ProdutoEmMoldura.tsx'
import { INI, INI_FATOS, INI_PERGUNTAS, INI_ROTAS } from '../conteudo/inicio.ts'
import { CATALOGO } from '../movimento/catalogo.ts'
import { useAssinatura } from '../movimento/troca/assinatura.tsx'
import { LuzDaLampada } from '../movimento/troca/LuzDaLampada.tsx'
import { usePalcoFixo } from '../movimento/troca/usarPalco.ts'
// The two scrubbed entries of bands 4 and 6, then (last, so the page rules come after the shared pieces' own and win ties)
// the page sheet.
import '../componentes/inicio-casa/inicio-faixas.css'
import '../componentes/inicio-casa/inicio-casa.css'

/**
 * Band 5 (HOME-SECOND-HALF): the statement on the rug, with the Notas capture standing on the band's bottom edge. The
 * wrapper is signed by the same primitive as the captions (`useAssinatura`: `data-assinada` once 60 % of it is in view,
 * at once with reduced motion), and the five hairlines of the facts draw from that one attribute (inicio-casa.css).
 */
function ProvaDaCasa() {
  const raiz = useRef<HTMLDivElement>(null)
  const assinada = useAssinatura(raiz)
  return (
    <div ref={raiz} className="ic-prova" data-assinada={assinada ? '' : undefined}>
      <FaixaProva titulo={INI.h2Prova} texto={INI.pProva} itens={INI_FATOS} />
      <ProdutoEmMoldura tela={{ ...CAPTURA_NOTAS, alt: INI.altNotas }} moldura={MOLDURA_DIA} />
    </div>
  )
}

/**
 * The Início (REP-HOME), "A casa acesa": seven bands on the shared pieces of secoes/, in this order:
 * 1 the 17:30 hand-off scene (plate M05, the two-ink h1 across the seam; in the stacked composition also the stage with
 * the first screen); 2 the night (M06), which in the room composition (1180 px and more, landscape: `useSala`) is the
 * pinned stage of moment 2 with the first screen in it; 3 the hour as type, with the second framed screen on the band's
 * bottom edge; 4 the lone carer, the mat cut by the band line; 5 the statement on the rug and the Notas screen; 6 the
 * questions, with the night door field on the band's bottom and the right window edge; 7 the night closing, with M11
 * (the street, its panes lit once) on the band's bottom edge. No band has a floor strip.
 * Every string comes from conteudo/inicio.ts; this file and the page folders write no text of their own.
 *
 * The header pill belongs to the shell; the page only says whether its hero pill is in view (`data-inicio-heroi` on
 * <html>, set by `useGanchoDoCabecalho`), and the page stylesheet inicio-casa.css quiets the shell's pill from it.
 */
export function Inicio() {
  const larga = useSala()
  const fixo = usePalcoFixo()
  useGanchoDoCabecalho(larga)

  return (
    <main>
      <PaginaCasa>
        <CenaHeroi
          imagem={M05}
          recorte390={M05_390}
          alt={INI.altCena1}
          larguraMax={M05_LARGURA}
          parede={{ esquerda: 'papel', direita: 'cacau' }}
          chao={{ esquerda: 'areia', direita: 'chao-noite' }}
          costura={M05_COSTURA}
          alturaChao={M05_CHAO}
          lado="esquerda"
          idTitulo={ID_TITULO}
          sobrePlaca={
            <LuzDaLampada luz={LUZ_M05} luz390={LUZ_M05_390} memoria="casa-luz-m05" gatilho="carga" />
          }
          // data-costura-lado: the side of the seam the text lives on, read by the meter's COSTURA rule. The caption of
          // 16:00 is day text from 1024 (on the day floor) and night text below (papel on cacau, under the plate). It and
          // the stage come after the plate in DOM order: the caption is the next element after the plate.
          depoisDaPlaca={
            <>
              <div className="ic-leg1" data-costura-lado={larga ? 'dia' : 'noite'}>
                <LegendaAssinada texto={INI.leg1} tom={larga ? 'dia' : 'noite'} />
              </div>
              {larga ? null : <PalcoTroca />}
            </>
          }
        >
          <TituloCasa id={ID_TITULO} />
          <div className="ic-noite-heroi" data-costura-lado="noite">
            <p className="text-abertura font-texto ic-lede">{INI.lede}</p>
            <AcoesDoHeroi />
          </div>
        </CenaHeroi>

        <FaixaInteira
          fundo="papel"
          fundoDireita="cacau"
          costuraX="var(--heroi-costura-x)"
          costuraX390="0px"
          idTitulo={ID_FAIXA_NOITE}
        >
          <FaixaNoite larga={larga} fixo={fixo} />
        </FaixaInteira>

        <FaixaInteira fundo="cacau" idTitulo={ID_FAIXA_TELA}>
          <FaixaTela />
        </FaixaInteira>

        <FaixaInteira fundo="papel" idTitulo={ID_FAIXA_SO}>
          <FaixaSozinho />
        </FaixaInteira>

        <FaixaInteira fundo="areia">
          <ProvaDaCasa />
        </FaixaInteira>

        <FaixaInteira fundo="papel">
          <div id="perguntas" className="ic-perguntas">
            <Perguntas titulo={INI.h2Perg} itens={INI_PERGUNTAS} />
            {/* The door field: page markup, a sibling of the shared block (which dissolves into this grid). The door is a
                real picture, so it keeps its alt; the plate enters from the right wall in inicio-faixas.css. */}
            <div className="ic-porta">
              <img
                src={PORTA_NOITE.src}
                srcSet={PORTA_NOITE.srcSet}
                sizes={PORTA_NOITE.sizes}
                width={PORTA_NOITE.largura}
                height={PORTA_NOITE.altura}
                alt={INI.altPorta}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="cacau">
          <div className="ic-fecho">
            <Fechamento titulo={INI.h2Fecho} acao={{ rotulo: INI.cta3, para: INI_ROTAS.criarConta }} tom="noite" />
            {/* Decorative: the heading above it already says the night is noted; the street only closes the house. Its
                panes come on once (M11: opacity, `--luz-fecho-ms` from the catalogue) at 60 % in view, and rest lit. */}
            <figure className="ic-fecho-cena" style={{ '--luz-fecho-ms': `${CATALOGO.M11.duracaoMs}ms` } as CSSProperties}>
              <img
                src={M11_JANELA.src}
                srcSet={M11_JANELA.srcSet}
                sizes={M11_JANELA.sizes}
                width={M11_JANELA.largura}
                height={M11_JANELA.altura}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <LuzDaLampada luz={LUZ_M11} memoria="casa-luz-m11" gatilho="vista" limiar={0.6} />
            </figure>
          </div>
        </FaixaInteira>
      </PaginaCasa>
    </main>
  )
}
