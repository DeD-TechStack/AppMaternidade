// Junta nomes de classe com espaço e ignora os valores falsos. Substitui o `cn` do Magic UI, que
// usa clsx e tailwind-merge: aqui não há dependência nova.

export function cn(...partes: Array<string | false | null | undefined>): string {
  return partes.filter(Boolean).join(' ')
}
