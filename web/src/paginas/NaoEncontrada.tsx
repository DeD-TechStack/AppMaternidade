import { Link } from 'react-router'

export function NaoEncontrada() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <p className="mt-4">
        <Link to="/">Voltar ao início</Link>
      </p>
    </>
  )
}
