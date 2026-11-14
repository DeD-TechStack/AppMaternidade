import { TEMPO_FALADO } from '../../conteudo/rotina.ts'

// A11Y-010: o cronômetro "1:12:07" lido pelo leitor de tela como "1 hora, 12 minutos e 7 segundos". Parte
// zerada não se lê ("1:00:00" é "1 hora"); só o tempo todo zerado diz "0 segundos". As palavras vêm de
// `conteudo/rotina.ts`.

const SO_DIGITOS = /^\d+$/

/** Os segundos inteiros de "h:mm:ss", de "mm:ss" ou de uma duração em ms; o que não tem forma de tempo é 0. */
function segundosDe(valor: string | number): number {
  if (typeof valor === 'number') return Number.isFinite(valor) ? Math.floor(Math.max(0, valor) / 1000) : 0
  const partes = valor.split(':')
  if ((partes.length !== 2 && partes.length !== 3) || !partes.every((parte) => SO_DIGITOS.test(parte))) return 0
  return partes.map(Number).reduce((total, parte) => total * 60 + parte, 0)
}

export function tempoFalado(valor: string | number): string {
  const total = segundosDe(valor)
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const segundos = total % 60

  const falas = [
    horas > 0 ? TEMPO_FALADO.horas(horas) : '',
    minutos > 0 ? TEMPO_FALADO.minutos(minutos) : '',
    segundos > 0 ? TEMPO_FALADO.segundos(segundos) : '',
  ].filter((fala) => fala !== '')

  if (falas.length === 0) return TEMPO_FALADO.segundos(0)
  if (falas.length === 1) return falas[0]
  return `${falas.slice(0, -1).join(TEMPO_FALADO.separador)}${TEMPO_FALADO.ultimoSeparador}${falas[falas.length - 1]}`
}
