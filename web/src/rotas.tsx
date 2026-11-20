import type { RouteObject } from 'react-router'
import { Layout } from './componentes/Layout.tsx'
import { ProvedorSessao } from './componentes/conta/sessao.tsx'
import { Carregando } from './componentes/estado/Carregando.tsx'
import { Inicio } from './paginas/Inicio.tsx'
import { NaoEncontrada } from './paginas/NaoEncontrada.tsx'
import { rotasDasAreas } from './rotas/areas.tsx'

// Só o Início (a página do LCP), a casca, o provedor de sessão e a 404 ficam no pacote de entrada. Cada outra
// página é um pacote próprio, baixado quando a pessoa navega até ela (o roteador espera o pacote).
export function criarRotas(): RouteObject[] {
  return [
    // O provedor de sessão fica acima da casca: o cabeçalho de toda rota (pública ou não) segue a sessão.
    // O conteúdo das páginas públicas não espera por ela.
    {
      element: <ProvedorSessao />,
      hydrateFallbackElement: <Carregando texto="Carregando a página…" />,
      children: [
        {
          element: <Layout />,
          children: [
            { index: true, element: <Inicio /> },
            {
              path: 'como-funciona',
              lazy: async () => ({ Component: (await import('./paginas/publicas/ComoFunciona.tsx')).ComoFunciona }),
            },
            {
              path: 'cuidado-compartilhado',
              lazy: async () => ({
                Component: (await import('./paginas/publicas/CuidadoCompartilhado.tsx')).CuidadoCompartilhado,
              }),
            },
            {
              path: 'desenvolvimento',
              lazy: async () => ({ Component: (await import('./paginas/publicas/Desenvolvimento.tsx')).Desenvolvimento }),
            },
            {
              path: 'regras-da-comunidade',
              lazy: async () => ({
                Component: (await import('./paginas/publicas/RegrasDaComunidade.tsx')).RegrasDaComunidade,
              }),
            },
            {
              path: 'privacidade',
              lazy: async () => ({ Component: (await import('./paginas/publicas/Privacidade.tsx')).Privacidade }),
            },
            { path: 'termos', lazy: async () => ({ Component: (await import('./paginas/publicas/Termos.tsx')).Termos }) },
            {
              path: 'exclusao-de-conta',
              lazy: async () => ({ Component: (await import('./paginas/publicas/ExclusaoDeConta.tsx')).ExclusaoDeConta }),
            },
            {
              path: 'contato',
              lazy: async () => ({ Component: (await import('./paginas/publicas/Contato.tsx')).Contato }),
            },
            { path: 'sobre', lazy: async () => ({ Component: (await import('./paginas/publicas/Sobre.tsx')).Sobre }) },
            { path: 'sistema', lazy: async () => ({ Component: (await import('./paginas/Sistema.tsx')).Sistema }) },
            ...rotasDasAreas,
            { path: '*', element: <NaoEncontrada /> },
          ],
        },
      ],
    },
  ]
}

export const rotas: RouteObject[] = criarRotas()
