import { COMUM, FORMATOS, FORMULARIO } from '../../conteudo/rotina.ts'
import { diaDaFamilia } from '../../dados/rotina.dia.ts'
import type { FamiliaDaRotina, Registro } from '../../dados/rotina.tipos.ts'
import { ehTipoDeSessao } from '../../dados/rotina.tipos.ts'
import { formatarDuracao, formatarHora } from '../../prototipo/formatar.ts'

// Os formatos da tela da rotina, em funções puras: o "quando" dos Últimos, o resumo de cada registro,
// a autoria e as horas. A hora é sempre a do aparelho; só o dia da família segue o fuso da família.

const MINUTO = 60_000
const doisDigitos = (n: number) => String(n).padStart(2, '0')

const mesmoDiaDoCalendario = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** `DD/MM HH:MM`, na hora do aparelho. */
function formatarDataEHora(instante: number): string {
  const data = new Date(instante)
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)} ${formatarHora(instante)}`
}

/**
 * O "quando" (hora do aparelho, minutos completos): menos de 1 minuto, `agora`; menos de 60 minutos,
 * `há N min`; no mesmo dia do calendário, `há H h M min` (ou `há H h` com 0 minuto); no dia anterior,
 * `ontem HH:MM`; antes disso, `DD/MM HH:MM`.
 */
export function formatarQuando(momento: number, agora: number): string {
  const minutos = Math.floor(Math.max(0, agora - momento) / MINUTO)
  if (minutos < 1) return FORMATOS.agora
  if (minutos < 60) return FORMATOS.haMinutos(minutos)
  const hoje = new Date(agora)
  const dia = new Date(momento)
  if (mesmoDiaDoCalendario(dia, hoje)) {
    const horas = Math.floor(minutos / 60)
    const resto = minutos % 60
    return resto === 0 ? FORMATOS.haHoras(horas) : FORMATOS.haHorasEMinutos(horas, resto)
  }
  const ontem = new Date(agora)
  ontem.setDate(ontem.getDate() - 1)
  return mesmoDiaDoCalendario(dia, ontem) ? FORMATOS.ontem(formatarHora(momento)) : formatarDataEHora(momento)
}

/** A hora do `quando` das notas: `HH:MM` nas últimas 24 horas e `DD/MM HH:MM` antes disso. */
export function horaDaNota(criadaEm: number, agora: number): string {
  return agora - criadaEm < 24 * 60 * MINUTO ? formatarHora(criadaEm) : formatarDataEHora(criadaEm)
}

/** O momento de um registro concluído: `inicio` no pontual; `fim` na sessão de cuidado. */
export function momentoDoRegistro(registro: Registro): number {
  return Date.parse(registro.fim ?? registro.inicio)
}

const cortar = (texto: string, limite: number) =>
  texto.length > limite ? `${texto.slice(0, limite).trimEnd()}${FORMATOS.reticencias}` : texto

/** O resumo de um registro: duração, detalhes do tipo (o que houver), pelas regras da linha do dia. */
export function resumoDoRegistro(registro: Registro, fusoDaFamilia: string): string {
  const partes: string[] = []
  const { tipo, detalhes } = registro
  if (ehTipoDeSessao(tipo)) {
    if (registro.fim === null) partes.push(COMUM.emAndamento)
    else {
      partes.push(formatarDuracao(Date.parse(registro.fim) - Date.parse(registro.inicio)))
      if (diaDaFamilia(Date.parse(registro.fim), fusoDaFamilia) !== diaDaFamilia(Date.parse(registro.inicio), fusoDaFamilia)) {
        partes.push(FORMATOS.terminaNoDiaSeguinte)
      }
    }
    if (tipo === 'mamada' && detalhes.lado) partes.push(FORMATOS.lados[detalhes.lado])
  } else if (tipo === 'mamadeira') {
    if (detalhes.ml) partes.push(FORMATOS.ml(detalhes.ml))
    const conteudo = detalhes.conteudo
    if (conteudo === 'leite_materno' || conteudo === 'formula') partes.push(FORMATOS.conteudosDaMamadeira[conteudo])
  } else if (tipo === 'fralda') {
    const conteudo = detalhes.conteudo
    if (conteudo === 'xixi' || conteudo === 'coco' || conteudo === 'ambos') partes.push(FORMATOS.conteudosDaFralda[conteudo])
  } else if (tipo === 'solido') {
    if (detalhes.alimento) partes.push(detalhes.alimento)
  } else if (registro.nota) {
    partes.push(cortar(registro.nota, 80))
  }
  return partes.join(FORMATOS.separador)
}

/**
 * O autor de um registro, de um encerramento ou de uma nota: o nome da conta se ela tem vínculo ativo na
 * família do item; `pessoa removida` se o autor é nulo; `ex-membro da família` nos outros casos.
 */
export function nomeDoAutor(familia: FamiliaDaRotina | undefined, autor: string | null): string {
  if (autor === null) return COMUM.pessoaRemovida
  const membro = familia?.membros.find((candidato) => candidato.contaId === autor)
  return membro ? membro.nome : COMUM.exMembro
}

/** A data `AAAA-MM-DD` e a hora `HH:MM` de um instante, no aparelho. */
export function dividirDataEHora(instante: number): { data: string; hora: string } {
  const data = new Date(instante)
  return {
    data: `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`,
    hora: `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`,
  }
}

/** O instante (ms) de uma data `AAAA-MM-DD` e uma hora `HH:MM` no aparelho; `NaN` se algum não valer. */
export function juntarDataEHora(data: string, hora: string): number {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data)
  const h = /^(\d{2}):(\d{2})$/.exec(hora)
  if (!d || !h) return Number.NaN
  const montado = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(h[1]), Number(h[2]))
  const conferido =
    montado.getFullYear() === Number(d[1]) && montado.getMonth() === Number(d[2]) - 1 && montado.getDate() === Number(d[3])
  return conferido ? montado.getTime() : Number.NaN
}

/** O nome acessível do botão de ±5 min: contém o texto visível e diz de que campo ele é. */
export const rotuloDoAjuste = (campo: string, sentido: 'menos' | 'mais') =>
  sentido === 'menos' ? FORMULARIO.menos5Para(campo) : FORMULARIO.mais5Para(campo)
