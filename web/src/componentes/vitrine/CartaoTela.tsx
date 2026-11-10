import { Link } from 'react-router'
import { Midia } from '../base/Midia.tsx'

interface Props {
  /** A rota da tela: o cartão inteiro é o link. */
  to: string
  titulo: string
  linha: string
  /** A descrição da moldura quadrada. */
  rotuloMidia: string
  fundo: 'barro' | 'lavanda'
}

/** Cartão de uma tela do protótipo: moldura quadrada, título de 36 px a 12 px dela e uma linha de 24 px. */
export function CartaoTela({ to, titulo, linha, rotuloMidia, fundo }: Props) {
  return (
    <Link to={to} className="vt-cartao alvo-toque">
      <Midia formato="par" fundo={fundo} aria-label={rotuloMidia} />
      <span className="vt-cartao-titulo">{titulo}</span>
      <span className="vt-cartao-linha">{linha}</span>
    </Link>
  )
}
