import { Link, useLocation } from 'react-router'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { COLUNAS_DO_RODAPE, NOME_SITE, ROTULO_NAVEGACAO_RODAPE } from './textos.ts'

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
 * O rodapé do site (DESIGN.md 4): um bloco curto de links no fundo da página, sob um fio de 1 px. O nome em
 * Literata no nível `titulo-3` e as colunas Produto, Ajuda e Legal (todo link vai a uma rota pública) ficam
 * numa fileira de 768 em diante; abaixo disso os nove links são uma lista só, em duas colunas, e os títulos dos
 * grupos ficam só para o leitor de tela. O aviso de demonstração vem numa linha embaixo (`comAviso`: só no site
 * público; as telas do app têm a etiqueta delas). Estático: sem painel de cor e sem movimento.
 */
export function Rodape({ comAviso = true }: { comAviso?: boolean }) {
  // Nas rotas /app/* o rodapé é uma linha só de links: sem o nome, sem os grupos.
  // O aviso não entra aqui (as telas do app trazem o delas).
  const { pathname } = useLocation()
  if (pathname === '/app' || pathname.startsWith('/app/')) return <RodapeCompacto />

  return (
    <footer className="cm-rodape" data-rodape="" id="rodape">
      <div className="cm-area cm-rodape-quadro">
        <div className="cm-rodape-topo">
          <p className="cm-rodape-nome" data-nome-rodape="" aria-hidden="true">
            {NOME_SITE}
          </p>

          <nav aria-label={ROTULO_NAVEGACAO_RODAPE} className="cm-rodape-colunas">
            {COLUNAS_DO_RODAPE.map((coluna) => (
              <div key={coluna.titulo} className="cm-rodape-grupo">
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

        {comAviso ? (
          <div className="cm-rodape-base cm-pequeno">
            <AvisoDemonstracao rodape />
          </div>
        ) : null}
      </div>
    </footer>
  )
}
