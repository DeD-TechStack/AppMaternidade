import { Link, useLocation } from 'react-router'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { Coluna, Colunas } from '../base/layout/Colunas.tsx'
import { Secao } from '../base/layout/Secao.tsx'
import { RevelacaoPorBaixo } from '../../movimento/RevelacaoPorBaixo.tsx'
import { COLUNAS_DO_RODAPE, FRASE_DO_RODAPE, NOME_SITE, ROTULO_NAVEGACAO_RODAPE } from './textos.ts'

/** O rodapé das rotas /app/*: todos os links do rodapé numa linha que quebra, sem o painel de mel. */
function RodapeCompacto() {
  return (
    <footer className="cm-rodape cm-rodape-compacto" data-rodape="" id="rodape">
      <div className="cm-area">
        <nav aria-label={ROTULO_NAVEGACAO_RODAPE} className="cm-rodape-compacto-nav">
          {COLUNAS_DO_RODAPE.flatMap((coluna) => coluna.links).map((link) => (
            <Link key={link.para} to={link.para} className="cm-rodape-link">
              {link.rotulo}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}

/**
 * O rodapé do site (DESIGN.md 4): um painel de mel com a frase, as colunas Produto, Ajuda e Legal (todo
 * link vai a uma rota pública), o nome em Literata no tamanho de exibição (até 160 px em 1440) e o aviso
 * de demonstração numa linha (`comAviso`: só no site público; as telas do app têm a etiqueta delas). O
 * conteúdo sai de baixo, de -30 % a 0, preso à rolagem (M7).
 */
export function Rodape({ comAviso = true }: { comAviso?: boolean }) {
  // Nas rotas /app/* o rodapé é uma linha só de links: sem o nome grande, sem a frase nem o painel de mel.
  // O aviso não entra aqui (as telas do app trazem o delas).
  const { pathname } = useLocation()
  if (pathname === '/app' || pathname.startsWith('/app/')) return <RodapeCompacto />

  // O rodapé do site é um painel: a caixa externa (`footer`, sem fundo, metade de `espaco-bloco` em cima e embaixo)
  // e, dentro, a caixa de mel com a largura do quadro. A frase e as colunas de links são duas colunas de texto.
  return (
    <Secao
      as="footer"
      variante="painel"
      painel="mel"
      className="cm-rodape"
      classeCaixa="cm-rodape-painel"
      data-rodape=""
      id="rodape"
    >
      <RevelacaoPorBaixo variante="M7">
        <Colunas fracoes="5fr 7fr" aPartirDe={1100}>
          <Coluna>
            <p className="cm-h3 cm-rodape-frase">
              {FRASE_DO_RODAPE[0]}
              <span className="cm-segunda-linha">{FRASE_DO_RODAPE[1]}</span>
            </p>
          </Coluna>
          <Coluna>
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
          </Coluna>
        </Colunas>

        <p className="cm-rodape-nome" data-nome-rodape="" aria-hidden="true">
          {NOME_SITE}
        </p>

        {comAviso ? (
          <div className="cm-rodape-base cm-pequeno">
            <AvisoDemonstracao rodape />
          </div>
        ) : null}
      </RevelacaoPorBaixo>
    </Secao>
  )
}
