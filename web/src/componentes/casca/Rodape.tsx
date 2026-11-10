import { Link } from 'react-router'
import {
  AVISO_PROTOTIPO,
  BLOCO_DO_RODAPE,
  COLUNAS_DO_RODAPE,
  NOME_SITE,
  ROTULO_NAVEGACAO_RODAPE,
} from './textos.ts'

// O nome do site em dois trechos: lado a lado, formam "AppMaternidade"; abaixo de 768 ficam em duas
// linhas. O texto lido continua sendo o nome inteiro.
const [TRECHO_1, TRECHO_2] = [NOME_SITE.slice(0, 3), NOME_SITE.slice(3)]

/**
 * O rodapé do site, o mesmo em todas as telas: de borda a borda, em urucum (na madrugada, o bloco
 * escuro). Um fio interrompido pelo nome no topo, o nome gigante, os links em colunas em x=32, 208
 * e 384 (mais um bloco em c7) e a linha final com o aviso de protótipo.
 */
export function Rodape() {
  return (
    <footer className="sb-rodape" data-rodape="">
      <div className="sb-area sb-rodape-area">
        <p className="sb-rodape-topo t-ui">{NOME_SITE}</p>

        <p className="sb-rodape-nome" data-nome-rodape="" aria-hidden="true">
          <span>{TRECHO_1}</span>
          <span>{TRECHO_2}</span>
        </p>

        <div className="sb-rodape-links grade-10">
          <nav aria-label={ROTULO_NAVEGACAO_RODAPE} className="sb-rodape-colunas">
            {COLUNAS_DO_RODAPE.map((coluna) => (
              <div key={coluna.titulo}>
                <p className="sb-rodape-titulo t-corpo-p">{coluna.titulo}</p>
                <ul className="sb-rodape-lista">
                  {coluna.links.map((link) => (
                    <li key={link.para + link.rotulo}>
                      <Link to={link.para} className="sb-rodape-link t-corpo-p">
                        {link.rotulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="sb-rodape-bloco">
            <p className="sb-rodape-titulo t-corpo-p">{BLOCO_DO_RODAPE.titulo}</p>
            <p className="t-corpo-p">{BLOCO_DO_RODAPE.texto}</p>
          </div>
        </div>

        <p className="sb-rodape-final t-ui">{AVISO_PROTOTIPO}</p>
      </div>
    </footer>
  )
}
