import { TITULOS } from '../../conteudo/rotina.ts'

// O título de cada rota da área da rotina, pelo caminho. Serve à tela "família sem bebê" (QA-01): sem bebê
// nenhuma tela da rotina abre, mas a rota continua com o próprio h1. Caminho que não é da lista cai em `Hoje`.

const POR_CAMINHO: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/app\/historico$/, TITULOS.historico],
  [/^\/app\/sessao$/, TITULOS.sessao],
  [/^\/app\/lixeira$/, TITULOS.lixeira],
  [/^\/app\/notas$/, TITULOS.notas],
  [/^\/app\/notas\/nova$/, TITULOS.notaNova],
  [/^\/app\/notas\/[^/]+\/editar$/, TITULOS.notaEditar],
  [/^\/app\/registro\/novo$/, TITULOS.registroNovo],
  [/^\/app\/registro\/[^/]+\/editar$/, TITULOS.registroEditar],
  [/^\/app\/registro\/[^/]+$/, TITULOS.registro],
]

export function tituloDaRota(caminho: string): string {
  const limpo = caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho
  return POR_CAMINHO.find(([padrao]) => padrao.test(limpo))?.[1] ?? TITULOS.hoje
}
