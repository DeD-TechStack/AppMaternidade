import {
  TT,
  autorPor,
  terminaEm,
  terminaNoDiaSeguinte,
} from '../../../conteudo/desenvolvimento/textosTummy.ts'
import { dataNoFuso } from '../../../dados/comum.ts'
import type { Membro } from '../../../dados/conta.ts'
import { converterHorario } from '../../../dados/desenvolvimento.ts'
import { janelaDoDia } from '../../../dados/rotina.dia.ts'
import type { Registro } from '../../../dados/rotina.tipos.ts'
import { formatarDuracao, formatarHora } from '../../../prototipo/formatar.ts'

// As regras do bloco de tummy time que não dependem da tela (MAT-39b, DES-03 e DES-04): a validação do que a pessoa
// digita, as duas confirmações antes de gravar, o resumo e as linhas de cada dia. Tudo puro: o instante atual
// e o fuso entram por parâmetro.

const MINUTO = 60_000
/** O banco recusa horário mais de 5 minutos depois do relógio do aparelho (`23514 horario no futuro`). */
const TOLERANCIA_DO_FUTURO = 5 * MINUTO
/** Acima disto (61 min ou mais) a tela pergunta antes de gravar. */
const LIMITE_SEM_PERGUNTAR = 60 * MINUTO

export type ErroDeCampo = 'duracao' | 'preencha' | 'inexistente' | 'fimAntes' | 'futuro'

export const TEXTO_DO_ERRO_DE_CAMPO: Record<ErroDeCampo, string> = {
  duracao: TT.duracaoInvalida,
  preencha: TT.preenchaInicioEFim,
  inexistente: TT.horarioInexistente,
  fimAntes: TT.fimAntesDoInicio,
  futuro: TT.noFuturo,
}

interface Intervalo {
  inicio: number
  fim: number
}

type ResultadoDoIntervalo = { ok: true; intervalo: Intervalo } | { ok: false; erro: ErroDeCampo }

/** O que a pessoa digitou no painel ou no formulário, como texto. */
export interface EntradaDoPainel {
  duracao: string
  dia: string
  inicio: string
  fim: string
}

/** "Fizemos agora": fim = agora, início = agora menos a duração (inteiro de 1 a 999; vazio = sem duração). */
export function intervaloDoAgora(duracao: string, agora: number): ResultadoDoIntervalo {
  const texto = duracao.trim()
  if (texto === '') return { ok: true, intervalo: { inicio: agora, fim: agora } }
  if (!/^\d{1,3}$/.test(texto)) return { ok: false, erro: 'duracao' }
  const minutos = Number(texto)
  if (minutos < 1 || minutos > 999) return { ok: false, erro: 'duracao' }
  return { ok: true, intervalo: { inicio: agora - minutos * MINUTO, fim: agora } }
}

/** O outro horário: dia e horas lidos no fuso do aparelho. A ordem dos testes é a do DES-03. */
export function intervaloDoFormulario(entrada: EntradaDoPainel, fusoDoAparelho: string, agora: number): ResultadoDoIntervalo {
  if (entrada.inicio === '' || entrada.fim === '') return { ok: false, erro: 'preencha' }
  const inicio = converterHorario(entrada.dia, entrada.inicio, fusoDoAparelho)
  const fim = converterHorario(entrada.dia, entrada.fim, fusoDoAparelho)
  for (const conversao of [inicio, fim]) {
    if (!conversao.ok) return { ok: false, erro: conversao.motivo === 'inexistente' ? 'inexistente' : 'preencha' }
  }
  if (!inicio.ok || !fim.ok) return { ok: false, erro: 'preencha' }
  if (fim.instante < inicio.instante) return { ok: false, erro: 'fimAntes' }
  if (inicio.instante > agora + TOLERANCIA_DO_FUTURO || fim.instante > agora + TOLERANCIA_DO_FUTURO) {
    return { ok: false, erro: 'futuro' }
  }
  return { ok: true, intervalo: { inicio: inicio.instante, fim: fim.instante } }
}

/** As duas confirmações que não bloqueiam, na ordem em que aparecem. */
export type Passo = 'longa' | 'sobreposicao'

/**
 * Os intervalos só se sobrepõem quando se cruzam de verdade: dois que apenas se encostam não pedem confirmação.
 * Um registro sem duração (início = fim) é um ponto e só conta se cair estritamente dentro do outro. A sessão em
 * andamento termina em `agora`, o instante da validação: nunca no infinito.
 */
function sobrepoe(intervalo: Intervalo, registros: readonly Registro[], agora: number): boolean {
  const ponto = intervalo.inicio === intervalo.fim
  return registros.some((registro) => {
    const inicio = Date.parse(registro.inicio)
    const fim = registro.fim === null ? agora : Date.parse(registro.fim)
    if (ponto) return inicio < intervalo.inicio && intervalo.inicio < fim
    return intervalo.inicio < fim && inicio < intervalo.fim
  })
}

/** A primeira confirmação que ainda falta (T-26, depois T-27), ou nenhuma. Sessão em andamento vale até `agora`. */
export function proximoPasso(intervalo: Intervalo, lidas: readonly Registro[], confirmados: readonly Passo[], agora: number): Passo | null {
  if (!confirmados.includes('longa') && intervalo.fim - intervalo.inicio > LIMITE_SEM_PERGUNTAR) return 'longa'
  if (!confirmados.includes('sobreposicao') && sobrepoe(intervalo, lidas, agora)) return 'sobreposicao'
  return null
}

// ---- o histórico de 7 dias ---------------------------------------------------------------------------------

/** "Hoje", "Ontem" e os outros dias como `dd/mm`. `indice` conta a partir de hoje. */
export function rotuloDoDia(indice: number, dia: string): string {
  if (indice === 0) return TT.hoje
  if (indice === 1) return TT.ontem
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
}

/** O autor de uma sessão: "por <nome>", T-31 (conta removida) ou T-57 (fora dos membros lidos). */
export function autorDe(criadoPor: string | null, membros: readonly Membro[]): string {
  if (criadoPor === null) return TT.contaRemovida
  const membro = membros.find((candidato) => candidato.contaId === criadoPor)
  return membro ? autorPor(membro.nome) : TT.outraConta
}

interface LinhaDoDia {
  id: string
  texto: string
}

interface ResumoDoDia {
  /** As encerradas que começaram no dia. */
  sessoes: number
  /** A parte de cada encerrada que cai no dia (uma que atravessa a meia-noite reparte a duração). */
  totalMs: number
  linhas: LinhaDoDia[]
}

/**
 * O dia da família (`AAAA-MM-DD`): o resumo e as linhas. A linha é "<início> – <fim> · <duração> · <autor>", com
 * as marcas T-32 e T-33 no fim, cada uma depois de " · ".
 */
export function resumirDia(dia: string, fuso: string, encerradas: readonly Registro[], membros: readonly Membro[]): ResumoDoDia {
  const janela = janelaDoDia(dia, fuso)
  const de = Date.parse(janela.de)
  const ate = Date.parse(janela.ate)
  const diaSeguinte = dataNoFuso(ate, fuso)

  let totalMs = 0
  const doDia: Array<{ registro: Registro; inicio: number; fim: number }> = []
  for (const registro of encerradas) {
    if (registro.fim === null) continue
    const inicio = Date.parse(registro.inicio)
    const fim = Date.parse(registro.fim)
    totalMs += Math.max(0, Math.min(fim, ate) - Math.max(inicio, de))
    if (inicio >= de && inicio < ate) doDia.push({ registro, inicio, fim })
  }
  doDia.sort((a, b) => a.inicio - b.inicio || (a.registro.id < b.registro.id ? -1 : 1))

  const linhas = doDia.map(({ registro, inicio, fim }) => {
    const partes = [
      `${formatarHora(inicio)} – ${formatarHora(fim)}`,
      fim === inicio ? TT.semDuracao : formatarDuracao(fim - inicio),
      autorDe(registro.criadoPor, membros),
    ]
    if (registro.origem === 'retroativo') partes.push(TT.registradoDepois)
    const diaDoFim = dataNoFuso(fim, fuso)
    if (diaDoFim > dia) {
      partes.push(diaDoFim === diaSeguinte ? terminaNoDiaSeguinte : terminaEm(`${diaDoFim.slice(8, 10)}/${diaDoFim.slice(5, 7)}`))
    }
    return { id: registro.id, texto: partes.join(' · ') }
  })

  return { sessoes: doDia.length, totalMs, linhas }
}
