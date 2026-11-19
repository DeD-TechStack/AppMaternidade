import { AcoesDoHeroi } from '../componentes/inicio-casa/AcoesDoHeroi.tsx'
import { FaixaNoite } from '../componentes/inicio-casa/FaixaNoite.tsx'
import { FaixaSozinho } from '../componentes/inicio-casa/FaixaSozinho.tsx'
import { FaixaTela } from '../componentes/inicio-casa/FaixaTela.tsx'
import { ID_FAIXA_NOITE, ID_FAIXA_SO, ID_FAIXA_TELA, ID_TITULO } from '../componentes/inicio-casa/ids.ts'
import {
  LUZ_M05,
  LUZ_M05_390,
  M05,
  M05_390,
  M05_CHAO,
  M05_COSTURA,
  M05_LARGURA,
  M11_JANELA,
} from '../componentes/inicio-casa/midia.ts'
import { PalcoTroca } from '../componentes/inicio-casa/PalcoTroca.tsx'
import { TituloCasa } from '../componentes/inicio-casa/TituloCasa.tsx'
import { useGanchoDoCabecalho, useSala } from '../componentes/inicio-casa/usoDaCasa.ts'
import { CenaHeroi } from '../componentes/secoes/CenaHeroi.tsx'
import { FaixaInteira } from '../componentes/secoes/FaixaInteira.tsx'
import { FaixaProva } from '../componentes/secoes/FaixaProva.tsx'
import { Fechamento } from '../componentes/secoes/Fechamento.tsx'
import { Legenda } from '../componentes/secoes/Legenda.tsx'
import { PaginaCasa } from '../componentes/secoes/PaginaCasa.tsx'
import { Perguntas } from '../componentes/secoes/Perguntas.tsx'
import { INI, INI_FATOS, INI_PERGUNTAS, INI_ROTAS } from '../conteudo/inicio.ts'
import { LuzDaLampada } from '../movimento/troca/LuzDaLampada.tsx'
import { usePalcoFixo } from '../movimento/troca/usarPalco.ts'
// Last, so the page rules come after the shared pieces' own and win ties.
import '../componentes/inicio-casa/inicio-casa.css'

/**
 * The Início (REP-HOME), "A casa acesa": seven bands on the shared pieces of secoes/, in this order:
 * 1 the 17:30 hand-off scene (plate M05, the two-ink h1 across the seam; in the stacked composition also the stage with
 * the first screen); 2 the night (M06), which in the room composition (1180 px and more, landscape: `useSala`) is the
 * pinned stage of moment 2 with the first screen in it; 3 the second framed screen, standing on the night floor; 4 the
 * lone carer; 5 the proof and 6 the questions, heading left and rows right; 7 the night closing, with M11 (the lit
 * window) standing on the night floor.
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
                <Legenda texto={INI.leg1} tom={larga ? 'dia' : 'noite'} />
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
          <div className="ic-prova">
            <FaixaProva titulo={INI.h2Prova} texto={INI.pProva} itens={INI_FATOS} />
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="papel">
          <div id="perguntas" className="ic-perguntas">
            <Perguntas titulo={INI.h2Perg} itens={INI_PERGUNTAS} />
          </div>
        </FaixaInteira>

        <FaixaInteira fundo="cacau">
          <div className="ic-fecho">
            <Fechamento titulo={INI.h2Fecho} acao={{ rotulo: INI.cta3, para: INI_ROTAS.criarConta }} tom="noite" />
            {/* Decorative: the heading beside it already says the night is noted; the lit window only closes the house. */}
            <figure className="ic-fecho-cena">
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
            </figure>
            <div className="ic-chao" aria-hidden="true" />
          </div>
        </FaixaInteira>
      </PaginaCasa>
    </main>
  )
}
