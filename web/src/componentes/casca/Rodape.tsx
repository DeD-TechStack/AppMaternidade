import { Link } from 'react-router'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { PainelCampo } from '../campo/PainelCampo.tsx'
import { RevelacaoPorBaixo } from '../../movimento/RevelacaoPorBaixo.tsx'
import { COLUNAS_DO_RODAPE, FRASE_DO_RODAPE, NOME_SITE, ROTULO_NAVEGACAO_RODAPE } from './textos.ts'

/**
 * O rodapé do site (DESIGN.md 4): um painel de mel com a frase, as colunas Produto, Ajuda e Legal (todo
 * link vai a uma rota pública), o nome em Literata no tamanho de exibição (até 160 px em 1440) e o aviso
 * de demonstração numa linha (`comAviso`: só no site público; as telas do app têm a etiqueta delas). O
 * conteúdo sai de baixo, de -30 % a 0, preso à rolagem (M7).
 */
export function Rodape({ comAviso = true }: { comAviso?: boolean }) {
  return (
    <footer className="cm-rodape" data-rodape="" id="rodape">
      <PainelCampo className="cm-rodape-painel">
        <RevelacaoPorBaixo variante="M7">
          <div className="cm-rodape-topo">
            <p className="cm-h3 cm-rodape-frase">
              {FRASE_DO_RODAPE[0]}
              <span className="cm-segunda-linha">{FRASE_DO_RODAPE[1]}</span>
            </p>
            <nav aria-label={ROTULO_NAVEGACAO_RODAPE} className="cm-rodape-colunas">
              {COLUNAS_DO_RODAPE.map((coluna) => (
                <div key={coluna.titulo}>
                  <h2 className="cm-rodape-titulo">{coluna.titulo}</h2>
                  <ul className="cm-rodape-lista">
                    {coluna.links.map((link) => (
                      <li key={link.para}>
                        <Link to={link.para} className="cm-rodape-link">
                          {link.rotulo}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <p className="cm-rodape-nome" data-nome-rodape="" aria-hidden="true">
            {NOME_SITE}
          </p>

          {comAviso ? (
            <div className="cm-rodape-base cm-pequeno">
              <AvisoDemonstracao rodape />
            </div>
          ) : null}
        </RevelacaoPorBaixo>
      </PainelCampo>
    </footer>
  )
}
