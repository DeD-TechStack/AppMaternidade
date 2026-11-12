import { dataNoFuso, fusoValido } from '../../dados/comum.ts'

// Datas e horas da área de conta: sempre em pt-BR e no fuso pedido (o da família, ou o da conta
// quando a tela não sabe o da família). O banco devolve instantes em UTC; `nascimento` é `AAAA-MM-DD`.

const UTC = 'UTC'
const seguro = (fuso: string) => (fusoValido(fuso) ? fuso : UTC)

/** `DD/MM/AAAA` de um instante, no fuso. */
export function formatarData(instante: string, fuso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: seguro(fuso),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(instante))
}

/** `DD/MM/AAAA às HH:MM` de um instante, no fuso. */
export function formatarDataEHora(instante: string, fuso: string): string {
  const hora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: seguro(fuso),
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instante))
  return `${formatarData(instante, fuso)} às ${hora}`
}

/** `AAAA-MM-DD` vira `DD/MM/AAAA`, sem passar por fuso (é uma data de calendário). */
export function formatarNascimento(dia: string): string {
  const [ano, mes, dom] = dia.split('-')
  return `${dom}/${mes}/${ano}`
}

/** O hoje, `AAAA-MM-DD`, no fuso. */
export function hojeNoFuso(fuso: string): string {
  return dataNoFuso(Date.now(), seguro(fuso))
}

/** `AAAA-MM-DD` mais `dias` dias de calendário. */
export function somarDias(dia: string, dias: number): string {
  const [ano, mes, dom] = dia.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dom + dias)).toISOString().slice(0, 10)
}

// A hora local do instante, lida como se fosse UTC, menos o próprio instante: o deslocamento do fuso.
function deslocamento(instante: number, fuso: string): number {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instante))
  const pega = (tipo: string) => Number(partes.find((parte) => parte.type === tipo)?.value ?? 0)
  const local = Date.UTC(pega('year'), pega('month') - 1, pega('day'), pega('hour'), pega('minute'), pega('second'))
  return local - Math.floor(instante / 1000) * 1000
}

/** O fim do dia (23:59:59) de `AAAA-MM-DD` no fuso, como instante ISO em UTC. */
export function fimDoDia(dia: string, fuso: string): string {
  const [ano, mes, dom] = dia.split('-').map(Number)
  const alvo = Date.UTC(ano, mes - 1, dom, 23, 59, 59)
  const zona = seguro(fuso)
  let instante = alvo
  // Duas passadas cobrem a virada de horário de verão perto da meia-noite.
  for (let volta = 0; volta < 2; volta += 1) instante = alvo - deslocamento(instante, zona)
  return new Date(instante).toISOString()
}
