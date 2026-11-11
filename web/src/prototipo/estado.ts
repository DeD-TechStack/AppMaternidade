import { formatarDuracao, formatarHora } from './formatar.ts'

export type TipoSessao = 'sono' | 'mamada' | 'tummy'

const TIPOS_SESSAO: readonly TipoSessao[] = ['sono', 'mamada', 'tummy']

export const ROTULO_SESSAO: Record<TipoSessao, string> = {
  sono: 'Sono',
  mamada: 'Mamada',
  tummy: 'Tummy time',
}

export function ehTipoSessao(valor: unknown): valor is TipoSessao {
  return typeof valor === 'string' && (TIPOS_SESSAO as readonly string[]).includes(valor)
}

// A família fictícia das telas (nunca dados reais): Heloísa, 3 meses; a mãe, Juliana; o pai, Bruno; a
// avó, Carla, que deixa recados.
export const NOME_BEBE = 'Heloísa'
export const IDADE_BEBE = '3 meses'
const PESSOA_PADRAO = 'Juliana'

/** O papel de cada pessoa da família, mostrado ao lado do nome nas listas. */
export const PAPEL_NA_FAMILIA: Record<string, string> = {
  Juliana: 'mãe',
  Bruno: 'pai',
  Carla: 'avó',
}

interface Sessao {
  tipo: TipoSessao
  /** Instante de início em ms (Date.now). A duração sempre sai de `agora - inicio`. */
  inicio: number
  pessoa: string
}

interface ItemUltimo {
  chave: string
  rotulo: string
  quando: string
}

/** Um registro feito por alguém da família enquanto você estava fora. */
interface Evento {
  chave: string
  pessoa: string
  /** Instante do registro, em ms. */
  quando: number
  texto: string
}

/** Uma sessão já encerrada, para a lista de anteriores da Sessão. */
export interface SessaoAnterior {
  inicio: number
  fim: number
  pessoa: string
  detalhe: string
}

/** Os números do dia: quantas mamadas, quantas fraldas e quantos minutos de sono. */
interface Resumo {
  mamadas: number
  fraldas: number
  sonoMin: number
}

/** O que o "Desfazer" devolve: exatamente o que um registro pode mudar. */
interface Instantaneo {
  sessao: Sessao | null
  ultimos: ItemUltimo[]
  resumo: Resumo
  anteriores: Record<TipoSessao, SessaoAnterior[]>
}

interface Confirmacao {
  texto: string
  anterior: Instantaneo
}

export interface EstadoPrototipo {
  sessao: Sessao | null
  nota: { texto: string; autor: string; hora: string }
  ultimos: ItemUltimo[]
  eventos: Evento[]
  resumo: Resumo
  anteriores: Record<TipoSessao, SessaoAnterior[]>
  madrugada: boolean
  confirmacao: Confirmacao | null
}

export type Acao =
  | { tipo: 'iniciar'; sessao: TipoSessao; agora: number }
  | { tipo: 'encerrar'; agora: number; comNota: boolean }
  | { tipo: 'descartar' }
  | { tipo: 'registrar'; chave: string; rotulo: string; confirmacao: string }
  /** Só troca o texto da confirmação em tela; `ultimos` e o instantâneo do "Desfazer" não mudam. */
  | { tipo: 'ajustarConfirmacao'; texto: string }
  | { tipo: 'desfazer' }
  | { tipo: 'fecharConfirmacao' }
  | { tipo: 'definirMadrugada'; valor: boolean }

export interface ItemMais {
  chave: string
  rotulo: string
}

export const ITENS_MAIS: readonly ItemMais[] = [
  { chave: 'mamadeira', rotulo: 'Mamadeira' },
  { chave: 'solido', rotulo: 'Alimentação sólida' },
  { chave: 'observacao', rotulo: 'Observação' },
]

export const ESCOLHAS_FRALDA = ['Xixi', 'Cocô', 'Ambos'] as const
export type EscolhaFralda = (typeof ESCOLHAS_FRALDA)[number]

/**
 * A fralda se registra com 1 toque (E5): o registro não depende do tipo. O tipo é um ajuste opcional,
 * feito na confirmação, que só muda o texto ("Fralda registrada: Xixi"); nunca cria outro registro.
 */
export const TEXTO_FRALDA = 'Fralda registrada'

export function textoDaFralda(escolha: EscolhaFralda): string {
  return `${TEXTO_FRALDA}: ${escolha}`
}

/** A confirmação da fralda, com ou sem o tipo; é ela que traz as escolhas Xixi, Cocô e Ambos. */
export function ehConfirmacaoDeFralda(texto: string | null): boolean {
  return texto !== null && (texto === TEXTO_FRALDA || texto.startsWith(`${TEXTO_FRALDA}: `))
}

const MINUTO = 60_000
const HORA = 60 * MINUTO

// Tudo nasce relativo a `agora`, para as horas da lista "Desde que você saiu" baterem com os tempos de
// "Últimos" (a mamada de há 2 h 10 min, a fralda de há 50 min) e com a sessão de sono de Bruno.
export function criarEstadoInicial(agora: number): EstadoPrototipo {
  return {
    sessao: { tipo: 'sono', inicio: agora - 72 * MINUTO, pessoa: 'Bruno' },
    nota: { texto: 'Pomada só à noite.', autor: 'Carla', hora: formatarHora(agora - 3 * HORA - 20 * MINUTO) },
    ultimos: [
      { chave: 'mamada', rotulo: 'Mamada', quando: 'há 2 h 10 min' },
      { chave: 'fralda', rotulo: 'Fralda', quando: 'há 50 min' },
      { chave: 'tummy', rotulo: 'Tummy time', quando: 'ontem 17:30' },
    ],
    eventos: [
      { chave: 'fralda-bruno', pessoa: 'Bruno', quando: agora - 50 * MINUTO, texto: 'Fralda, xixi' },
      { chave: 'mamada-juliana', pessoa: 'Juliana', quando: agora - 130 * MINUTO, texto: 'Mamada, lado esquerdo, 18 min' },
    ],
    resumo: { mamadas: 6, fraldas: 5, sonoMin: 9 * 60 + 20 },
    anteriores: {
      sono: [
        { inicio: agora - 4 * HORA - 5 * MINUTO, fim: agora - 3 * HORA - 20 * MINUTO, pessoa: 'Bruno', detalhe: 'no carrinho' },
        { inicio: agora - 6 * HORA - 30 * MINUTO, fim: agora - 5 * HORA - 40 * MINUTO, pessoa: 'Juliana', detalhe: 'no berço' },
        { inicio: agora - 11 * HORA, fim: agora - 7 * HORA - 15 * MINUTO, pessoa: 'Juliana', detalhe: 'sono da noite' },
      ],
      mamada: [
        { inicio: agora - 130 * MINUTO, fim: agora - 112 * MINUTO, pessoa: 'Juliana', detalhe: 'lado esquerdo' },
        { inicio: agora - 5 * HORA - 10 * MINUTO, fim: agora - 4 * HORA - 52 * MINUTO, pessoa: 'Juliana', detalhe: 'lado direito' },
        { inicio: agora - 8 * HORA, fim: agora - 7 * HORA - 45 * MINUTO, pessoa: 'Bruno', detalhe: 'mamadeira, 90 ml' },
      ],
      tummy: [
        { inicio: agora - 16 * HORA - 30 * MINUTO, fim: agora - 16 * HORA - 20 * MINUTO, pessoa: 'Bruno', detalhe: 'no tapete, com o espelho' },
        { inicio: agora - 21 * HORA, fim: agora - 20 * HORA - 52 * MINUTO, pessoa: 'Carla', detalhe: 'no colo da avó' },
      ],
    },
    madrugada: false,
    confirmacao: null,
  }
}

function instantaneo(estado: EstadoPrototipo): Instantaneo {
  return { sessao: estado.sessao, ultimos: estado.ultimos, resumo: estado.resumo, anteriores: estado.anteriores }
}

// Um registro rápido mexe nos números do dia: a fralda soma uma fralda, a mamadeira soma uma mamada.
function resumoDepoisDoRegistro(resumo: Resumo, chave: string): Resumo {
  if (chave === 'fralda') return { ...resumo, fraldas: resumo.fraldas + 1 }
  if (chave === 'mamadeira') return { ...resumo, mamadas: resumo.mamadas + 1 }
  return resumo
}

// Encerrar soma a sessão ao dia: o sono em minutos, a mamada como mais uma.
function resumoDepoisDaSessao(resumo: Resumo, sessao: Sessao, agora: number): Resumo {
  if (sessao.tipo === 'sono') return { ...resumo, sonoMin: resumo.sonoMin + Math.floor((agora - sessao.inicio) / MINUTO) }
  if (sessao.tipo === 'mamada') return { ...resumo, mamadas: resumo.mamadas + 1 }
  return resumo
}

export function reduzir(estado: EstadoPrototipo, acao: Acao): EstadoPrototipo {
  switch (acao.tipo) {
    case 'iniciar': {
      // No protótipo há no máximo uma sessão por vez; repetir o comando não duplica.
      if (estado.sessao) return estado
      return {
        ...estado,
        sessao: { tipo: acao.sessao, inicio: acao.agora, pessoa: PESSOA_PADRAO },
        confirmacao: null,
      }
    }
    case 'encerrar': {
      const sessao = estado.sessao
      if (!sessao) return estado
      const duracao = formatarDuracao(acao.agora - sessao.inicio)
      const encerrada: SessaoAnterior = { inicio: sessao.inicio, fim: acao.agora, pessoa: sessao.pessoa, detalhe: 'agora há pouco' }
      return {
        ...estado,
        sessao: null,
        resumo: resumoDepoisDaSessao(estado.resumo, sessao, acao.agora),
        anteriores: { ...estado.anteriores, [sessao.tipo]: [encerrada, ...estado.anteriores[sessao.tipo]] },
        confirmacao: {
          texto: `Sessão encerrada: ${duracao}${acao.comNota ? ', com nota' : ''}`,
          anterior: instantaneo(estado),
        },
      }
    }
    case 'descartar':
      // A sessão some sem registro e sem confirmação.
      return { ...estado, sessao: null, confirmacao: null }
    case 'registrar': {
      const novo: ItemUltimo = { chave: acao.chave, rotulo: acao.rotulo, quando: 'agora' }
      return {
        ...estado,
        ultimos: [novo, ...estado.ultimos.filter((item) => item.chave !== acao.chave)],
        resumo: resumoDepoisDoRegistro(estado.resumo, acao.chave),
        confirmacao: { texto: acao.confirmacao, anterior: instantaneo(estado) },
      }
    }
    case 'ajustarConfirmacao':
      // Sem confirmação não há o que ajustar. Com ela, só o texto muda: o `anterior` fica, e o
      // "Desfazer" depois do ajuste volta ao estado de antes do registro.
      return estado.confirmacao
        ? { ...estado, confirmacao: { ...estado.confirmacao, texto: acao.texto } }
        : estado
    case 'desfazer': {
      if (!estado.confirmacao) return estado
      const { sessao, ultimos, resumo, anteriores } = estado.confirmacao.anterior
      return { ...estado, sessao, ultimos, resumo, anteriores, confirmacao: null }
    }
    case 'fecharConfirmacao':
      return estado.confirmacao ? { ...estado, confirmacao: null } : estado
    case 'definirMadrugada':
      return estado.madrugada === acao.valor ? estado : { ...estado, madrugada: acao.valor }
  }
}
