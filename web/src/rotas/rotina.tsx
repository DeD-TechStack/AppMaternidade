import type { RouteObject } from 'react-router'
import { AREA_DA_ROTINA } from '../componentes/rotina/madrugada.ts'
import { ProvedorRotina } from '../componentes/rotina/ProvedorRotina.tsx'
import { TITULOS } from '../conteudo/rotina.ts'
import { tituloDaAba } from '../conteudo/conta.ts'
import { Hoje } from '../paginas/rotina/Hoje.tsx'
import { RegistroEditar, RegistroNovo } from '../paginas/rotina/Registro.tsx'
import { Sessao } from '../paginas/rotina/Sessao.tsx'

// As rotas da área Rotina. Todas as telas ficam sob a guarda da MAT-37 e sob o provedor da área (uma rota
// sem caminho, pai de todas elas, que marca a área em `handle.area` para a madrugada, R38-04). O título da aba
// é fixo por rota (`handle.titulo`).
export const rotasRotinaPublicas: RouteObject[] = []

export const rotasRotinaLogadas: RouteObject[] = [
  {
    element: <ProvedorRotina />,
    handle: { area: AREA_DA_ROTINA },
    children: [
      { path: 'app/hoje', element: <Hoje />, handle: { titulo: tituloDaAba(TITULOS.hoje) } },
      { path: 'app/sessao', element: <Sessao />, handle: { titulo: tituloDaAba(TITULOS.sessao) } },
      { path: 'app/registro/novo', element: <RegistroNovo />, handle: { titulo: tituloDaAba(TITULOS.registroNovo) } },
      { path: 'app/registro/:id/editar', element: <RegistroEditar />, handle: { titulo: tituloDaAba(TITULOS.registroEditar) } },
    ],
  },
]
