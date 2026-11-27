// A origem das telas de notas (R38-24, decisão M1): a lista de notas, ou o Hoje (pelo link `Ver notas`), viaja no
// `state` da navegação. Aberta pela URL, sem `state`, a origem é `/app/notas`. Só estes dois destinos valem: um
// `state` com outro valor cai no padrão.

export const ORIGEM_NOTAS = '/app/notas'
export const ORIGEM_HOJE = '/app/hoje'

export type OrigemDasNotas = typeof ORIGEM_NOTAS | typeof ORIGEM_HOJE

export function origemDoEstado(estado: unknown): OrigemDasNotas {
  const origem = (estado as { origem?: unknown } | null | undefined)?.origem
  return origem === ORIGEM_HOJE ? ORIGEM_HOJE : ORIGEM_NOTAS
}
