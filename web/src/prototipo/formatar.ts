const doisDigitos = (n: number) => String(n).padStart(2, '0')

// "1 h 12 min", ou "12 min" abaixo de 1 hora. Com minutos zerados acima de 1 hora: "2 h 0 min".
export function formatarDuracao(ms: number): string {
  const minutos = Math.floor(Math.max(0, ms) / 60_000)
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return horas > 0 ? `${horas} h ${resto} min` : `${resto} min`
}

// "mm:ss" abaixo de 1 hora, "h:mm:ss" a partir de 1 hora.
export function formatarCronometro(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const segundos = total % 60
  return horas > 0
    ? `${horas}:${doisDigitos(minutos)}:${doisDigitos(segundos)}`
    : `${doisDigitos(minutos)}:${doisDigitos(segundos)}`
}

// Hora local, 24 h, dois dígitos: "17:02".
export function formatarHora(instante: number): string {
  const data = new Date(instante)
  return `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`
}
