import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { usePrototipo } from '../../prototipo/contexto.ts'
import { CabecalhoPublico } from './CabecalhoPublico.tsx'
import { RodapePublico } from './RodapePublico.tsx'

// Layout das páginas públicas da MAT-36 e da Página não encontrada: cabeçalho, a página e o
// rodapé. A margem lateral é a do Início (px-4, e 2% a partir de md); a <main> de cada página
// cuida da própria margem, então a da 404, que já tem, não dobra.
export function LayoutPublico() {
  const { dispatch } = usePrototipo()
  const { pathname } = useLocation()

  // As páginas públicas são sempre claras, como o Início: ao entrar numa delas, o modo madrugada
  // do protótipo desliga. Antes da pintura, para a tela escura não piscar na troca.
  useLayoutEffect(() => {
    dispatch({ tipo: 'definirMadrugada', valor: false })
  }, [dispatch, pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="px-4 md:px-[2%]">
        <CabecalhoPublico />
      </div>
      <Outlet />
      <div className="mt-auto px-4 md:px-[2%]">
        <RodapePublico />
      </div>
    </div>
  )
}
