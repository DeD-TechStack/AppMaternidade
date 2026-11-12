// As regras puras da Comunidade que a camada de dados, a memória e as telas dividem: os valores dos
// tipos do banco, os limites do formulário (MAT-40:RN-02) e a contagem de caracteres. Sem rede e
// sem React: nada aqui lança exceção.

export const FAIXAS = ['0_3_meses', '3_6_meses', '6_12_meses'] as const
export type FaixaBebe = (typeof FAIXAS)[number]

export const ESTADOS_MODERACAO = ['visivel', 'oculto', 'removido'] as const
export type EstadoModeracao = (typeof ESTADOS_MODERACAO)[number]

/** Os 8 motivos de denúncia, na ordem da tela (Fluxos 4.9). */
export const MOTIVOS = [
  'ataque_assedio',
  'saude_perigosa',
  'conteudo_sexual',
  'exposicao_crianca',
  'dados_pessoais',
  'spam_venda',
  'risco_autolesao',
  'outro',
] as const
export type MotivoDenuncia = (typeof MOTIVOS)[number]

export const ESTADOS_DENUNCIA = ['aberta', 'em_analise', 'procedente', 'improcedente'] as const
export type EstadoDenuncia = (typeof ESTADOS_DENUNCIA)[number]

export const PAPEIS_PLATAFORMA = ['moderador', 'admin'] as const
export type PapelPlataforma = (typeof PAPEIS_PLATAFORMA)[number]

export const POR_PAGINA_TOPICOS = 20
export const POR_PAGINA_RESPOSTAS = 100

interface Faixa {
  min: number
  max: number
}

/** Os limites do banco, em caracteres (`char_length`): o mínimo conta sem espaços nas pontas. */
export const LIMITES = {
  apelido: { min: 3, max: 30 },
  bio: { min: 1, max: 160 },
  titulo: { min: 3, max: 120 },
  corpoTopico: { min: 1, max: 5000 },
  resposta: { min: 1, max: 2000 },
  textoDenuncia: { min: 1, max: 500 },
} as const satisfies Record<string, Faixa>

/** O `char_length` do Postgres: caracteres (pontos de código), não unidades UTF-16 nem bytes. */
export const contarCaracteres = (texto: string): number => [...texto].length

type SituacaoDoLimite = 'ok' | 'curto' | 'longo'

/** O mínimo conta o texto sem espaços nas pontas; o máximo conta o texto inteiro. */
export function conferirLimite(texto: string, limite: Faixa): SituacaoDoLimite {
  if (contarCaracteres(texto.trim()) < limite.min) return 'curto'
  if (contarCaracteres(texto) > limite.max) return 'longo'
  return 'ok'
}

/** O apelido não tem espaço nas pontas: o formulário recusa, não corta. */
export function apelidoValido(apelido: string): boolean {
  return apelido === apelido.trim() && conferirLimite(apelido, LIMITES.apelido) === 'ok'
}

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** O id da rota é um UUID, ou a tela nem chama o banco (PR-35). */
export const ehUuid = (valor: string | undefined): valor is string => valor !== undefined && FORMATO_UUID.test(valor)
