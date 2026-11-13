import { COMUM } from '../../conteudo/rotina.ts'

// O destino do formulário de registro (R38-10, R38-22): onde Salvar, Cancelar e o link superior levam. Uma só
// regra para os três, para nunca divergirem. A origem viaja no `state` da navegação (`de`): Hoje, Sessão ou o
// detalhe. Sem `state` (a edição aberta pela URL), o padrão é o detalhe do registro; o formulário novo volta ao Hoje.

interface DestinoDoFormulario {
  para: string
  texto: string
}

export function destinoDoFormulario(estado: unknown, registroId: string | null): DestinoDoFormulario {
  const origem = (estado as { de?: unknown } | null | undefined)?.de
  const hoje = { para: '/app/hoje', texto: COMUM.voltarParaHoje }
  const detalhe = registroId === null ? hoje : { para: `/app/registro/${registroId}`, texto: COMUM.voltarParaORegistro }
  if (origem === 'sessao') return { para: '/app/sessao', texto: COMUM.voltarParaSessao }
  if (origem === 'hoje') return hoje
  return detalhe
}
