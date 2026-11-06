import { Link } from 'react-router'
import { AvisoDemonstracao } from '../componentes/AvisoDemonstracao.tsx'

export function NaoEncontrada() {
  return (
    <main className="px-4 py-12 md:px-[2%]">
      <AvisoDemonstracao />
      <h1 className="titulo-tela">Página não encontrada</h1>
      <p className="mt-4">
        <Link to="/" className="alvo-toque inline-flex items-center">
          Voltar ao início
        </Link>
      </p>
    </main>
  )
}
