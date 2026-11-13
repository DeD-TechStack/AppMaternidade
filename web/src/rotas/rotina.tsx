import type { RouteObject } from 'react-router'
import type { ItemNavegacao } from './navegacao.ts'
import { AREA_DA_ROTINA } from '../componentes/rotina/madrugada.ts'
import { ProvedorRotina } from '../componentes/rotina/ProvedorRotina.tsx'
import { TITULOS } from '../conteudo/rotina.ts'
import { tituloDaAba } from '../conteudo/conta.ts'
import { Historico } from '../paginas/rotina/Historico.tsx'
import { Hoje } from '../paginas/rotina/Hoje.tsx'
import { Lixeira } from '../paginas/rotina/Lixeira.tsx'
import { NotaEditar, NotaNova, Notas } from '../paginas/rotina/Notas.tsx'
import { RegistroEditar, RegistroNovo } from '../paginas/rotina/Registro.tsx'
import { RegistroDetalhe } from '../paginas/rotina/RegistroDetalhe.tsx'
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
      { path: 'app/registro/:id', element: <RegistroDetalhe />, handle: { titulo: tituloDaAba(TITULOS.registro) } },
      { path: 'app/historico', element: <Historico />, handle: { titulo: tituloDaAba(TITULOS.historico) } },
      { path: 'app/lixeira', element: <Lixeira />, handle: { titulo: tituloDaAba(TITULOS.lixeira) } },
      { path: 'app/notas', element: <Notas />, handle: { titulo: tituloDaAba(TITULOS.notas) } },
      { path: 'app/notas/nova', element: <NotaNova />, handle: { titulo: tituloDaAba(TITULOS.notaNova) } },
      { path: 'app/notas/:id/editar', element: <NotaEditar />, handle: { titulo: tituloDaAba(TITULOS.notaEditar) } },
    ],
  },
]

export const navegacaoRotina: ItemNavegacao[] = [
  { chave: 'hoje', rotulo: 'Hoje', ordem: 10, destino: '/app/hoje', atualEm: ['/app/hoje'] },
  { chave: 'sessao', rotulo: 'Sessão', ordem: 20, destino: '/app/sessao', atualEm: ['/app/sessao'] },
  { chave: 'historico', rotulo: 'Histórico', ordem: 22, destino: '/app/historico', atualEm: ['/app/historico'] },
]
