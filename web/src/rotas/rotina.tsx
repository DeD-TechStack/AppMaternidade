import type { RouteObject } from 'react-router'
import type { ItemNavegacao } from './navegacao.ts'
import { AREA_DA_ROTINA } from '../componentes/rotina/madrugada.ts'
import { TITULOS } from '../conteudo/rotina.ts'
import { tituloDaAba } from '../conteudo/conta.ts'

// As rotas da área Rotina. Todas as telas ficam sob a guarda da MAT-37 e sob o provedor da área (uma rota
// sem caminho, pai de todas elas, que marca a área em `handle.area` para a madrugada, R38-04). O título da aba
// é fixo por rota (`handle.titulo`). O provedor e cada tela são pacotes à parte (`lazy`).
export const rotasRotinaPublicas: RouteObject[] = []
export const rotasRotinaLogadas: RouteObject[] = [
  {
    lazy: async () => ({ Component: (await import('../componentes/rotina/ProvedorRotina.tsx')).ProvedorRotina }),
    handle: { area: AREA_DA_ROTINA },
    children: [
      {
        path: 'app/hoje',
        lazy: async () => ({ Component: (await import('../paginas/rotina/Hoje.tsx')).Hoje }),
        handle: { titulo: tituloDaAba(TITULOS.hoje) },
      },
      {
        path: 'app/sessao',
        lazy: async () => ({ Component: (await import('../paginas/rotina/Sessao.tsx')).Sessao }),
        handle: { titulo: tituloDaAba(TITULOS.sessao) },
      },
      {
        path: 'app/registro/novo',
        lazy: async () => ({ Component: (await import('../paginas/rotina/Registro.tsx')).RegistroNovo }),
        handle: { titulo: tituloDaAba(TITULOS.registroNovo) },
      },
      {
        path: 'app/registro/:id/editar',
        lazy: async () => ({ Component: (await import('../paginas/rotina/Registro.tsx')).RegistroEditar }),
        handle: { titulo: tituloDaAba(TITULOS.registroEditar) },
      },
      {
        path: 'app/registro/:id',
        lazy: async () => ({ Component: (await import('../paginas/rotina/RegistroDetalhe.tsx')).RegistroDetalhe }),
        handle: { titulo: tituloDaAba(TITULOS.registro) },
      },
      {
        path: 'app/historico',
        lazy: async () => ({ Component: (await import('../paginas/rotina/Historico.tsx')).Historico }),
        handle: { titulo: tituloDaAba(TITULOS.historico) },
      },
      {
        path: 'app/lixeira',
        lazy: async () => ({ Component: (await import('../paginas/rotina/Lixeira.tsx')).Lixeira }),
        handle: { titulo: tituloDaAba(TITULOS.lixeira) },
      },
      {
        path: 'app/notas',
        lazy: async () => ({ Component: (await import('../paginas/rotina/Notas.tsx')).Notas }),
        handle: { titulo: tituloDaAba(TITULOS.notas) },
      },
      {
        path: 'app/notas/nova',
        lazy: async () => ({ Component: (await import('../paginas/rotina/Notas.tsx')).NotaNova }),
        handle: { titulo: tituloDaAba(TITULOS.notaNova) },
      },
      {
        path: 'app/notas/:id/editar',
        lazy: async () => ({ Component: (await import('../paginas/rotina/Notas.tsx')).NotaEditar }),
        handle: { titulo: tituloDaAba(TITULOS.notaEditar) },
      },
    ],
  },
]

export const navegacaoRotina: ItemNavegacao[] = [
  { chave: 'hoje', rotulo: 'Hoje', ordem: 10, destino: '/app/hoje', atualEm: ['/app/hoje'] },
  { chave: 'sessao', rotulo: 'Sessão', ordem: 20, destino: '/app/sessao', atualEm: ['/app/sessao'] },
  { chave: 'historico', rotulo: 'Histórico', ordem: 22, destino: '/app/historico', atualEm: ['/app/historico'] },
]
