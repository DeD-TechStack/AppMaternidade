import type { Resultado } from '../../dados/comum.ts'
import type { DadosComunidade, PerfilPublico } from '../../dados/comunidade.ts'
import type {
  ConteudoLido,
  DadosModeracao,
  Denuncia,
  HistoricoDoPerfil,
  TipoDeConteudo,
} from '../../dados/moderacao.ts'

// As leituras compostas do painel: o que a M2 e a M3 precisam de uma vez só (o conteúdo, o perfil do autor
// e o histórico dele). Uma falha em qualquer parte é falha da leitura inteira: a tela nunca mostra dado
// parcial como se fosse a resposta.

export interface ConteudoComContexto {
  lido: ConteudoLido
  /** O perfil do autor, ou `null` quando a conta dele foi excluída. */
  autor: PerfilPublico | null
  /** O histórico do autor; `null` com o autor removido. */
  historico: HistoricoDoPerfil | null
}

export const autorDoConteudo = (lido: ConteudoLido): string | null =>
  lido.tipo === 'topico' ? lido.topico.autorId : lido.resposta.autorId

export const estadoDoConteudo = (lido: ConteudoLido) => (lido.tipo === 'topico' ? lido.topico.estado : lido.resposta.estado)

export const idDoConteudo = (lido: ConteudoLido) => (lido.tipo === 'topico' ? lido.topico.id : lido.resposta.id)

/** Um perfil e o histórico dele: o que a tela mostra do autor. */
async function lerPerfilComHistorico(
  moderacao: DadosModeracao,
  comunidade: DadosComunidade,
  perfilId: string | null,
): Promise<Resultado<{ autor: PerfilPublico | null; historico: HistoricoDoPerfil | null }>> {
  if (perfilId === null) return { ok: true, valor: { autor: null, historico: null } }
  const perfis = await comunidade.lerPerfis([perfilId])
  if (!perfis.ok) return perfis
  const autor = perfis.valor[0] ?? null
  // Com o autor removido, o histórico não aparece.
  if (autor === null) return { ok: true, valor: { autor: null, historico: null } }
  const historico = await moderacao.historicoDoPerfil(perfilId)
  if (!historico.ok) return historico
  return { ok: true, valor: { autor, historico: historico.valor } }
}

export async function lerConteudoComContexto(
  moderacao: DadosModeracao,
  comunidade: DadosComunidade,
  tipo: TipoDeConteudo,
  id: string,
): Promise<Resultado<ConteudoComContexto | null>> {
  const lido = await moderacao.lerConteudo(tipo, id)
  if (!lido.ok) return lido
  if (lido.valor === null) return { ok: true, valor: null }
  const perfil = await lerPerfilComHistorico(moderacao, comunidade, autorDoConteudo(lido.valor))
  if (!perfil.ok) return perfil
  return { ok: true, valor: { lido: lido.valor, ...perfil.valor } }
}

export interface DenunciaComContexto {
  denuncia: Denuncia
  /** O tópico ou a resposta denunciado; `null` quando a denúncia é de perfil ou o conteúdo não está legível. */
  conteudo: ConteudoComContexto | null
  /** O perfil denunciado, na denúncia de perfil. */
  perfil: { autor: PerfilPublico | null; historico: HistoricoDoPerfil | null } | null
}

export async function lerDenunciaComContexto(
  moderacao: DadosModeracao,
  comunidade: DadosComunidade,
  id: string,
): Promise<Resultado<DenunciaComContexto | null>> {
  const lida = await moderacao.lerDenuncia(id)
  if (!lida.ok) return lida
  const denuncia = lida.valor
  if (denuncia === null) return { ok: true, valor: null }

  if (denuncia.topicoId !== null || denuncia.respostaId !== null) {
    const tipo: TipoDeConteudo = denuncia.topicoId !== null ? 'topico' : 'resposta'
    const conteudo = await lerConteudoComContexto(moderacao, comunidade, tipo, (denuncia.topicoId ?? denuncia.respostaId) as string)
    if (!conteudo.ok) return conteudo
    return { ok: true, valor: { denuncia, conteudo: conteudo.valor, perfil: null } }
  }
  if (denuncia.perfilId !== null) {
    const perfil = await lerPerfilComHistorico(moderacao, comunidade, denuncia.perfilId)
    if (!perfil.ok) return perfil
    return { ok: true, valor: { denuncia, conteudo: null, perfil: perfil.valor } }
  }
  return { ok: true, valor: { denuncia, conteudo: null, perfil: null } }
}
