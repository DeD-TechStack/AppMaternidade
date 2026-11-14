import type { RouteObject } from 'react-router'
import { Layout } from './componentes/Layout.tsx'
import { ProvedorSessao } from './componentes/conta/sessao.tsx'
import { Inicio } from './paginas/Inicio.tsx'
import { NaoEncontrada } from './paginas/NaoEncontrada.tsx'
import { Sistema } from './paginas/Sistema.tsx'
import { ComoFunciona } from './paginas/publicas/ComoFunciona.tsx'
import { Contato } from './paginas/publicas/Contato.tsx'
import { CuidadoCompartilhado } from './paginas/publicas/CuidadoCompartilhado.tsx'
import { Desenvolvimento } from './paginas/publicas/Desenvolvimento.tsx'
import { ExclusaoDeConta } from './paginas/publicas/ExclusaoDeConta.tsx'
import { Privacidade } from './paginas/publicas/Privacidade.tsx'
import { RegrasDaComunidade } from './paginas/publicas/RegrasDaComunidade.tsx'
import { Sobre } from './paginas/publicas/Sobre.tsx'
import { Termos } from './paginas/publicas/Termos.tsx'
import { rotasDasAreas } from './rotas/areas.tsx'

export function criarRotas(): RouteObject[] {
  return [
    // O provedor de sessão fica acima da casca: o cabeçalho de toda rota (pública ou não) segue a sessão.
    // O conteúdo das páginas públicas não espera por ela.
    {
      element: <ProvedorSessao />,
      children: [
        {
          element: <Layout />,
          children: [
            { index: true, element: <Inicio /> },
            { path: 'como-funciona', element: <ComoFunciona /> },
            { path: 'cuidado-compartilhado', element: <CuidadoCompartilhado /> },
            { path: 'desenvolvimento', element: <Desenvolvimento /> },
            { path: 'regras-da-comunidade', element: <RegrasDaComunidade /> },
            { path: 'privacidade', element: <Privacidade /> },
            { path: 'termos', element: <Termos /> },
            { path: 'exclusao-de-conta', element: <ExclusaoDeConta /> },
            { path: 'contato', element: <Contato /> },
            { path: 'sobre', element: <Sobre /> },
            { path: 'sistema', element: <Sistema /> },
            ...rotasDasAreas,
            { path: '*', element: <NaoEncontrada /> },
          ],
        },
      ],
    },
  ]
}

export const rotas: RouteObject[] = criarRotas()
