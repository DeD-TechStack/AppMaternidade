import type { RouteObject } from 'react-router'
import { Layout } from './componentes/Layout.tsx'
import { LayoutPublico } from './componentes/publicas/LayoutPublico.tsx'
import { RolagemEFoco } from './componentes/publicas/RolagemEFoco.tsx'
import { TituloDaAba } from './componentes/publicas/TituloDaAba.tsx'
import { TITULOS } from './conteudo/publicas.ts'
import { ComoFunciona } from './paginas/publicas/ComoFunciona.tsx'
import { Contato } from './paginas/publicas/Contato.tsx'
import { CuidadoCompartilhado } from './paginas/publicas/CuidadoCompartilhado.tsx'
import { Desenvolvimento } from './paginas/publicas/Desenvolvimento.tsx'
import { ExclusaoDeConta } from './paginas/publicas/ExclusaoDeConta.tsx'
import { Privacidade } from './paginas/publicas/Privacidade.tsx'
import { RegrasDaComunidade } from './paginas/publicas/RegrasDaComunidade.tsx'
import { Sobre } from './paginas/publicas/Sobre.tsx'
import { Termos } from './paginas/publicas/Termos.tsx'
import { Hoje } from './paginas/Hoje.tsx'
import { Inicio } from './paginas/Inicio.tsx'
import { NaoEncontrada } from './paginas/NaoEncontrada.tsx'
import { Sessao } from './paginas/Sessao.tsx'
import type { EstadoPrototipo } from './prototipo/estado.ts'

// Os testes injetam um estado inicial; no site ele nasce quando a página carrega.
export function criarRotas(estadoInicial?: EstadoPrototipo): RouteObject[] {
  return [
    {
      // O título da aba e a rolagem com o foco ficam montados uma vez, ao lado do layout raiz.
      element: (
        <>
          <Layout estadoInicial={estadoInicial} />
          <TituloDaAba />
          <RolagemEFoco />
        </>
      ),
      children: [
        { index: true, element: <Inicio />, handle: { titulo: TITULOS.inicio } },
        { path: 'app/hoje', element: <Hoje />, handle: { titulo: TITULOS.hoje } },
        { path: 'app/sessao', element: <Sessao />, handle: { titulo: TITULOS.sessao } },
        {
          // Páginas públicas: cabeçalho e rodapé comuns, e a madrugada desligada.
          element: <LayoutPublico />,
          children: [
            { path: 'como-funciona', element: <ComoFunciona />, handle: { titulo: TITULOS.comoFunciona } },
            { path: 'cuidado-compartilhado', element: <CuidadoCompartilhado />, handle: { titulo: TITULOS.cuidado } },
            { path: 'desenvolvimento', element: <Desenvolvimento />, handle: { titulo: TITULOS.desenvolvimento } },
            { path: 'regras-da-comunidade', element: <RegrasDaComunidade />, handle: { titulo: TITULOS.regras } },
            { path: 'privacidade', element: <Privacidade />, handle: { titulo: TITULOS.privacidade } },
            { path: 'termos', element: <Termos />, handle: { titulo: TITULOS.termos } },
            { path: 'exclusao-de-conta', element: <ExclusaoDeConta />, handle: { titulo: TITULOS.exclusao } },
            { path: 'contato', element: <Contato />, handle: { titulo: TITULOS.contato } },
            { path: 'sobre', element: <Sobre />, handle: { titulo: TITULOS.sobre } },
            { path: '*', element: <NaoEncontrada />, handle: { titulo: TITULOS.naoEncontrada } },
          ],
        },
      ],
    },
  ]
}

export const rotas: RouteObject[] = criarRotas()
