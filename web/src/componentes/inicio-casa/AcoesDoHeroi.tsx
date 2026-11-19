import { Botao } from '../base/Botao.tsx'
import { INI, INI_ROTAS } from '../../conteudo/inicio.ts'
import { BotaoLargo } from '../secoes/BotaoLargo.tsx'

/**
 * The lede's actions, right under the value sentence at every width: the fold's one filled action (the mel pill,
 * "Criar conta") and, beside it, the text link. While the pill is in view the header pill is quiet
 * (`useGanchoDoCabecalho`), so the fold never shows two filled "Criar conta".
 */
export function AcoesDoHeroi() {
  return (
    <div className="ic-acoes">
      <BotaoLargo rotulo={INI.cta1} para={INI_ROTAS.criarConta} variante="mel" />
      <Botao to={INI_ROTAS.comoFunciona} variante="texto" tamanho="site" data-hero-link="">
        {INI.cta2}
      </Botao>
    </div>
  )
}
