import { useCabecalhoNoite } from '../componentes/Layout.tsx'
import { Pilha, QuadroLayout } from '../componentes/base/layout/index.ts'
import { JanelaAcesa } from '../componentes/nao-encontrada-casa/JanelaAcesa.tsx'
import { BotaoLargo, PaginaCasa } from '../componentes/secoes/index.ts'
import { TEXTOS_NAO_ENCONTRADA } from '../conteudo/casa/naoEncontrada.ts'
import { NOMES_DE_PAGINA } from '../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './publicas/useTitulo.ts'

/**
 * A rota inexistente (REP-T4): uma noite de cacau, o h1 sozinho na parede, uma frase, o único botão de mel e, ao longe,
 * uma janela acesa no canto de baixo da primeira dobra.
 */
export function NaoEncontrada() {
  useTituloDaPagina(NOMES_DE_PAGINA.naoEncontrada)
  useCabecalhoNoite()
  return (
    <main>
      <PaginaCasa>
        <div className="cm-nf-chao" data-faixa-fundo="cacau">
          <QuadroLayout className="cm-nf-quadro">
            <Pilha vao="grupo" className="cm-nf-pilha">
              <h1 className="cm-h1 cm-exibicao cm-exibicao-404 cm-nf-titulo">{TEXTOS_NAO_ENCONTRADA.titulo}</h1>
              <p className="cm-lide cm-nf-linha">{TEXTOS_NAO_ENCONTRADA.linha}</p>
              <BotaoLargo rotulo={TEXTOS_NAO_ENCONTRADA.acao} para="/" variante="mel" />
            </Pilha>
            <JanelaAcesa alt={TEXTOS_NAO_ENCONTRADA.alt} />
          </QuadroLayout>
        </div>
      </PaginaCasa>
    </main>
  )
}
