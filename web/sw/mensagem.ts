// A mensagem que a página manda ao service worker que espera: o contrato entre os dois lados.

export const MENSAGEM_ATIVAR = { tipo: 'ativar' } as const

/** Verdadeiro só para `{ tipo: 'ativar' }`. */
export function ehMensagemAtivar(dado: unknown): boolean {
  return typeof dado === 'object' && dado !== null && !Array.isArray(dado) && (dado as { tipo?: unknown }).tipo === MENSAGEM_ATIVAR.tipo
}
