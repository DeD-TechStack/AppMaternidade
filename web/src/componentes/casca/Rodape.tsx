import { Link, useLocation } from 'react-router'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import {
  AVISO_RODAPE,
  COLUNAS_DO_RODAPE,
  COPYRIGHT_RODAPE,
  LINKS_DO_RODAPE_COMPACTO,
  NOME_SITE,
  ROTULO_NAVEGACAO_RODAPE,
} from './textos.ts'

/** O rodapé das rotas /app/*: os nove links de Produto, Ajuda e Legal numa linha que quebra, sem o painel de cacau. */
function RodapeCompacto() {
  return (
    <footer className="cm-rodape cm-rodape-compacto" data-rodape="" id="rodape">
      <div className="cm-area">
        <nav aria-label={ROTULO_NAVEGACAO_RODAPE} className="cm-rodape-compacto-nav">
          {LINKS_DO_RODAPE_COMPACTO.map((link) => (
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
 * O rodapé do site, o RodapeMapa (DESIGN.md 4): uma faixa de cacau de borda a borda no fim de toda página
 * pública. O nome em Literata no nível `titulo-3` (nunca maior que o h1 da página), os quatro grupos Produto,
 * Conta, Ajuda e Legal (11 links, todos para rotas públicas), o aviso de avaliação (um só nó `[data-aviso]`, sempre
 * renderizado, dentro do rodapé) e a linha do ©, nesta ordem. Abaixo de 768 os links são uma lista em duas colunas
 * e os títulos dos grupos ficam só para o leitor de tela; de 768 em diante os quatro grupos ficam à vista numa
 * fileira. Estático: sem movimento, sem sombra, sem ícone e sem rede social.
 */
export function Rodape({ comAviso = true }: { comAviso?: boolean }) {
  // Nas rotas /app/* o rodapé é uma linha só de links: sem o nome, sem os grupos, sem o aviso (as telas do app
  // trazem o delas).
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
              <div key={coluna.titulo} className="cm-rodape-grupo" data-rodape-grupo="">
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

        <div className="cm-rodape-base cm-pequeno">
          {comAviso ? <AvisoDemonstracao rodape textoComBanco={AVISO_RODAPE} /> : null}
          <p>{COPYRIGHT_RODAPE}</p>
        </div>
      </div>
    </footer>
  )
}
