import { Link, useLocation } from 'react-router'
import { PAGINAS_DO_SITE, ROTULOS } from '../../conteudo/publicas.ts'

/**
 * A navegação entre as páginas, no fim da Página não encontrada (antes do rodapé): uma linha rótulo +
 * texto, com o rótulo num `<p>` (não é um `h2`) e os 9 links numa lista, com alvos de 44 px. As 9
 * páginas públicas não a repetem: a lista delas é a do rodapé da casca. O link da própria página leva
 * `aria-current="page"`. O espaço de cima é o que a página pedir (na Página não encontrada, onde só um
 * link vem antes).
 */
export function PaginasDoSite({ margem = 'sb-mt-midia-linhas' }: { margem?: string }) {
  const { pathname } = useLocation()
  const atual = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return (
    <div className={`sb-area ${margem}`} data-bloco="">
      <nav aria-label={ROTULOS.paginas}>
        <div className="grade-10">
          <div className="sb-linha vp-linha col-c2-c8">
            <p className="sb-linha-rotulo t-rotulo">{ROTULOS.paginas}</p>
            <div className="sb-linha-texto vp-texto t-corpo">
              <ul className="vp-links vp-links-duplo">
                {PAGINAS_DO_SITE.map(({ rotulo, para }) => (
                  <li key={para}>
                    <Link to={para} className="alvo-toque" aria-current={para === atual ? 'page' : undefined}>
                      {rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </div>
  )
}
