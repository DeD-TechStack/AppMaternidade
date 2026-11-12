// O que sobrou do protótipo depois que os dados vieram do banco (MAT-38a): os tipos e rótulos das sessões, as
// escolhas dos botões rápidos que o Início ainda mostra nas miniaturas e o formato de uma sessão anterior.
// O estado, o reducer e a família fictícia saíram: o Hoje e a Sessão leem a camada de dados da rotina.

export type TipoSessao = 'sono' | 'mamada' | 'tummy'

const TIPOS_SESSAO: readonly TipoSessao[] = ['sono', 'mamada', 'tummy']

export const ROTULO_SESSAO: Record<TipoSessao, string> = {
  sono: 'Sono',
  mamada: 'Mamada',
  tummy: 'Tummy time',
}

export function ehTipoSessao(valor: unknown): valor is TipoSessao {
  return typeof valor === 'string' && (TIPOS_SESSAO as readonly string[]).includes(valor)
}

/** Uma sessão já encerrada, para a lista de anteriores da Sessão. */
export interface SessaoAnterior {
  inicio: number
  fim: number
  pessoa: string
  detalhe: string
}

export interface ItemMais {
  chave: string
  rotulo: string
}

export const ITENS_MAIS: readonly ItemMais[] = [
  { chave: 'mamadeira', rotulo: 'Mamadeira' },
  { chave: 'solido', rotulo: 'Alimentação sólida' },
  { chave: 'observacao', rotulo: 'Observação' },
]

export const ESCOLHAS_FRALDA = ['Xixi', 'Cocô', 'Ambos'] as const
export type EscolhaFralda = (typeof ESCOLHAS_FRALDA)[number]

/** O texto da confirmação da fralda, com ou sem o tipo escolhido. */
export const TEXTO_FRALDA = 'Fralda registrada'

export function textoDaFralda(escolha: EscolhaFralda): string {
  return `${TEXTO_FRALDA}: ${escolha}`
}

/** A confirmação da fralda, com ou sem o tipo; é ela que traz as escolhas Xixi, Cocô e Ambos. */
export function ehConfirmacaoDeFralda(texto: string | null): boolean {
  return texto !== null && (texto === TEXTO_FRALDA || texto.startsWith(`${TEXTO_FRALDA}: `))
}
