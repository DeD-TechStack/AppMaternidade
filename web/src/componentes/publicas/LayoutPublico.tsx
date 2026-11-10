import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { usePrototipo } from '../../prototipo/contexto.ts'

/**
 * Layout das 9 páginas públicas novas e da Página não encontrada: só a saída da rota e a madrugada
 * desligada. As páginas públicas são sempre claras, então ao entrar em qualquer uma o estado do
 * protótipo volta à madrugada desligada (como o Início faz).
 */
export function LayoutPublico() {
  const { dispatch } = usePrototipo()

  useEffect(() => {
    dispatch({ tipo: 'definirMadrugada', valor: false })
  }, [dispatch])

  return <Outlet />
}
