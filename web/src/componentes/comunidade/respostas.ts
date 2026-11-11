import type { Resultado } from '../../dados/comum.ts'
import type { DadosComunidade, Pagina, PerfilPublico, Resposta } from '../../dados/comunidade.ts'

// As respostas de um tópico como a C3 as mostra (MAT-40:RF-05, PR-37): lidas em páginas de 100, com o
// apelido do autor, e arrumadas sobre TODAS as já carregadas a cada página nova.

export interface RespostaComAutor extends Resposta {
  autor: PerfilPublico | null
}

interface Arranjo {
  resposta: RespostaComAutor
  /** Resposta de segundo nível cuja mãe não está entre as carregadas: aparece no primeiro nível, com TX-21. */
  semMae: boolean
  /** As respostas de segundo nível que citam esta, na ordem da leitura. */
  filhas: RespostaComAutor[]
}

/**
 * Cada resposta de primeiro nível (`respostaA` nulo) aparece na ordem da leitura, com as que citam ela
 * logo abaixo. A de segundo nível sem mãe carregada fica no primeiro nível, na posição da própria data.
 * Se a mãe chegar numa página seguinte, a filha passa para baixo dela.
 */
export function arrumarRespostas(lista: RespostaComAutor[]): Arranjo[] {
  const primeiras = new Set(lista.filter((r) => r.respostaA === null).map((r) => r.id))
  const filhasDe = new Map<string, RespostaComAutor[]>()
  for (const resposta of lista) {
    if (resposta.respostaA !== null && primeiras.has(resposta.respostaA)) {
      filhasDe.set(resposta.respostaA, [...(filhasDe.get(resposta.respostaA) ?? []), resposta])
    }
  }
  return lista
    .filter((r) => r.respostaA === null || !primeiras.has(r.respostaA))
    .map((resposta) => ({ resposta, semMae: resposta.respostaA !== null, filhas: filhasDe.get(resposta.id) ?? [] }))
}

/** Uma página de respostas com o apelido de cada autor (os que a pessoa ainda lê). */
export async function lerRespostasComAutores(
  dados: DadosComunidade,
  topicoId: string,
  pagina: number,
): Promise<Resultado<Pagina<RespostaComAutor>>> {
  const lida = await dados.lerRespostas(topicoId, pagina)
  if (!lida.ok) return lida
  const ids = [...new Set(lida.valor.itens.flatMap((r) => (r.autorId ? [r.autorId] : [])))]
  const perfis = ids.length > 0 ? await dados.lerPerfis(ids) : ({ ok: true, valor: [] } as const)
  if (!perfis.ok) return perfis
  const porId = new Map(perfis.valor.map((p) => [p.id, p]))
  return {
    ok: true,
    valor: {
      itens: lida.valor.itens.map((r) => ({ ...r, autor: r.autorId ? (porId.get(r.autorId) ?? null) : null })),
      haMais: lida.valor.haMais,
    },
  }
}
