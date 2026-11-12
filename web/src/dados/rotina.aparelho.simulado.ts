import { vi } from 'vitest'

/**
 * Só para testes. Faz o aparelho parecer o de outro lugar: o fuso que o `Intl` informa (`Intl.DateTimeFormat()
 * .resolvedOptions().timeZone`, lido sem argumentos) e o deslocamento em minutos a leste de UTC (o oposto de
 * `getTimezoneOffset`). Quem constrói um formatador com argumentos segue com o `Intl` de verdade. Quem chama
 * desfaz com `vi.restoreAllMocks()`.
 */
export function simularAparelho(fuso: string, deslocamentoMin: number): void {
  const original = Intl.DateTimeFormat
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (...argumentos: unknown[]) {
    if (argumentos.length === 0) return { resolvedOptions: () => ({ timeZone: fuso }) }
    return Reflect.construct(original, argumentos)
  } as never)
  vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0 - deslocamentoMin)
}
