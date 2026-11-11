// O código do convite: 64 caracteres hexadecimais minúsculos (MAT-45, D2). A tela aceita o código
// sozinho ou o link inteiro e o normaliza antes de qualquer chamada ao banco: um valor fora do
// formato nunca vai para lá.

const COMPLETO = /^[0-9a-f]{64}$/
const NO_MEIO = /(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])/g

/** O código normalizado (pontas sem espaço, minúsculas), ou `null` se o formato não vale. */
export function normalizarCodigo(texto: string): string | null {
  const limpo = texto.trim().toLowerCase()
  if (COMPLETO.test(limpo)) return limpo
  // O link do convite leva o código depois do `#`: vale o que vem ali.
  const marca = limpo.lastIndexOf('#')
  if (marca >= 0) {
    const fragmento = limpo.slice(marca + 1).trim()
    return COMPLETO.test(fragmento) ? fragmento : null
  }
  const achados = limpo.match(NO_MEIO)
  return achados?.length === 1 ? achados[0] : null
}

/** O link do convite: `<origem><subcaminho>convite#<código>`. */
export function linkDoConvite(codigo: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}convite#${codigo}`
}
