import { ESTADOS_DENUNCIA, type EstadoDenuncia, type MotivoDenuncia } from './comunidade.regras.ts'

// As regras puras do painel de moderação (MAT-40b) que a camada de dados, a memória e as telas dividem:
// os grupos de prioridade da fila, os tamanhos de página, o limite do motivo e a leitura da validade
// de um papel. Sem rede e sem React: nada aqui lança exceção.

type NivelDePrioridade = 1 | 2 | 3

/** Os grupos da fila (MAT-40:RF-11), do mais urgente ao menos urgente. */
export const GRUPOS_DE_PRIORIDADE: ReadonlyArray<{ nivel: NivelDePrioridade; motivos: readonly MotivoDenuncia[] }> = [
  { nivel: 1, motivos: ['risco_autolesao', 'exposicao_crianca', 'conteudo_sexual'] },
  { nivel: 2, motivos: ['ataque_assedio', 'dados_pessoais'] },
  { nivel: 3, motivos: ['saude_perigosa', 'spam_venda', 'outro'] },
]

export function prioridadeDoMotivo(motivo: MotivoDenuncia): NivelDePrioridade {
  return GRUPOS_DE_PRIORIDADE.find((grupo) => grupo.motivos.includes(motivo))?.nivel ?? 3
}

export const POR_PAGINA_FILA = 50
export const POR_PAGINA_AUDITORIA = 50
/** O histórico do perfil: os conteúdos mais novos e as linhas de auditoria deles. */
export const LIMITE_DO_HISTORICO = 20
export const LIMITE_DA_AUDITORIA_DO_HISTORICO = 50

/** O filtro padrão da fila: as denúncias que ainda pedem atenção. */
export const ESTADOS_PADRAO_DA_FILA: readonly EstadoDenuncia[] = ['aberta', 'em_analise']

/** Nenhuma caixa marcada equivale às quatro. */
export function estadosDaFila(estados: readonly EstadoDenuncia[]): EstadoDenuncia[] {
  return estados.length === 0 ? [...ESTADOS_DENUNCIA] : [...estados]
}

/** O motivo de uma ação de moderação ou de papel: 1 a 300 caracteres (MAT-40:RN-02). */
export const LIMITE_DO_MOTIVO = { min: 1, max: 300 } as const

/** Só as decisões que a tela oferece: `aberta` não é decisão. */
export const DECISOES = ['em_analise', 'procedente', 'improcedente'] as const

interface ComPrioridade {
  id: string
  motivo: MotivoDenuncia
  criadaEm: string
}

/** A ordem da fila: grupo de prioridade, depois `criada_em` crescente, depois `id` crescente. */
export function ordenarFila<T extends ComPrioridade>(denuncias: readonly T[]): T[] {
  return [...denuncias].sort(
    (a, b) =>
      prioridadeDoMotivo(a.motivo) - prioridadeDoMotivo(b.motivo) ||
      Date.parse(a.criadaEm) - Date.parse(b.criadaEm) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
}

/** O papel vale quando não tem validade ou a validade está no futuro; validade ilegível não vale (PR-45). */
export function papelVigente(validoAte: string | null, agora: number): boolean {
  if (validoAte === null) return true
  const instante = Date.parse(validoAte)
  return !Number.isNaN(instante) && instante > agora
}

type ValidadeLida = { tipo: 'vazia' } | { tipo: 'ok'; iso: string } | { tipo: 'passada' } | { tipo: 'ilegivel' }

/**
 * A validade do formulário de conceder: vazia vai como nulo; data e hora do campo (no fuso do aparelho)
 * só valem no futuro. Qualquer coisa que não dê uma data é ilegível, e nada vai ao banco.
 */
export function lerValidade(texto: string, agora: number): ValidadeLida {
  const limpo = texto.trim()
  if (limpo === '') return { tipo: 'vazia' }
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(limpo)) return { tipo: 'ilegivel' }
  const instante = new Date(limpo.includes('T') ? limpo : `${limpo}T00:00`).getTime()
  if (Number.isNaN(instante)) return { tipo: 'ilegivel' }
  if (instante <= agora) return { tipo: 'passada' }
  return { tipo: 'ok', iso: new Date(instante).toISOString() }
}

/** O código do app autenticador: seis dígitos. */
export const FORMATO_DO_CODIGO = /^\d{6}$/
