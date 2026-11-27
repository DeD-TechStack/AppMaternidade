// O id das entidades da rotina (registro e nota) nasce no navegador, antes da 1ª chamada, e é repetido
// em toda nova tentativa: o banco não tem id de operação separado. É um UUID v7 (invariante 8): o 15º
// caractere é `7` e o 20º é `8`, `9`, `a` ou `b`. O banco recusa outro formato com `23514`.

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FORMATO_UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Um UUID de qualquer versão. Id que não é UUID numa rota com `:id` é "Não encontrado". */
export const ehUuid = (texto: string | null | undefined): texto is string =>
  typeof texto === 'string' && FORMATO_UUID.test(texto)

export const ehUuidV7 = (texto: string): boolean => FORMATO_UUID_V7.test(texto)

function bytesAleatorios(tamanho: number): Uint8Array {
  const bytes = new Uint8Array(tamanho)
  const criptografia = globalThis.crypto
  if (criptografia && typeof criptografia.getRandomValues === 'function') {
    criptografia.getRandomValues(bytes)
  } else {
    for (let i = 0; i < tamanho; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}

const hexa = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

/** Um UUID v7: 48 bits de milissegundos, a versão 7, a variante `10` e 74 bits aleatórios. */
export function uuidV7(agora: number = Date.now()): string {
  const tempo = Math.max(0, Math.floor(agora)).toString(16).padStart(12, '0').slice(-12)
  const acaso = bytesAleatorios(10)
  acaso[0] = (acaso[0] & 0x0f) | 0x70
  acaso[2] = (acaso[2] & 0x3f) | 0x80
  const resto = hexa(acaso)
  return `${tempo.slice(0, 8)}-${tempo.slice(8, 12)}-${resto.slice(0, 4)}-${resto.slice(4, 8)}-${resto.slice(8, 20)}`
}
