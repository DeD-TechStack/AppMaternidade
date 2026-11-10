import { Link } from 'react-router'

interface Props {
  /** O nome da região de navegação (a nav precisa de um nome único na página). */
  rotulo: string
  links: ReadonlyArray<{ rotulo: string; destino: string }>
}

/** As palavras grandes do fim do Início: `nav-grande`, de ponta a ponta em 1440 e empilhadas em 390. */
export function NavegacaoGrande({ rotulo, links }: Props) {
  return (
    <nav className="sb-area sb-mt-midia-linhas" aria-label={rotulo} data-bloco="">
      <ul className="vt-nav-lista">
        {links.map((link) => (
          <li key={link.rotulo}>
            <Link to={link.destino} className="vt-nav-link t-nav-grande alvo-toque">
              {link.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
