import { Botao } from '../base/Botao.tsx'
import { INI, INI_ROTAS } from '../../conteudo/inicio.ts'
import { BotaoLargo } from '../secoes/BotaoLargo.tsx'

/**
 * The lede's actions. From 1024 px the hero holds the fold's one filled action, the mel pill, next to the text link;
 * below 1024 the header pill is the filled one and the hero keeps only the text link (RECUT §5).
 */
export function AcoesDoHeroi({ larga }: { larga: boolean }) {
  return (
    <div className="ic-acoes">
      {larga ? <BotaoLargo rotulo={INI.cta1} para={INI_ROTAS.criarConta} variante="mel" /> : null}
      <Botao to={INI_ROTAS.comoFunciona} variante="texto" tamanho="site" data-hero-link="">
        {INI.cta2}
      </Botao>
    </div>
  )
}
