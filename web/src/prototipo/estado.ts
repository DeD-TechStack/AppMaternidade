import { formatarDuracao } from './formatar.ts'

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

export const NOME_BEBE = 'Heloísa'
export const IDADE_BEBE = '3 meses'
const PESSOA_PADRAO = 'Juliana'

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

/** O que o "Desfazer" devolve: exatamente o que um registro pode mudar. */
interface Instantaneo {
  sessao: Sessao | null
  ultimos: ItemUltimo[]
}

interface Confirmacao {
  texto: string
  anterior: Instantaneo
}

export interface EstadoPrototipo {
  sessao: Sessao | null
  nota: { texto: string; autor: string; hora: string }
  ultimos: ItemUltimo[]
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

export function criarEstadoInicial(agora: number): EstadoPrototipo {
  return {
    sessao: { tipo: 'sono', inicio: agora - 72 * MINUTO, pessoa: 'Bruno' },
    nota: { texto: 'Pomada só à noite.', autor: 'Carla', hora: '22:40' },
    ultimos: [
      { chave: 'mamada', rotulo: 'Mamada', quando: 'há 2 h 10 min' },
      { chave: 'fralda', rotulo: 'Fralda', quando: 'há 50 min' },
      { chave: 'tummy', rotulo: 'Tummy time', quando: 'ontem 17:30' },
    ],
    madrugada: false,
    confirmacao: null,
  }
}

function instantaneo(estado: EstadoPrototipo): Instantaneo {
  return { sessao: estado.sessao, ultimos: estado.ultimos }
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
      if (!estado.sessao) return estado
      const duracao = formatarDuracao(acao.agora - estado.sessao.inicio)
      return {
        ...estado,
        sessao: null,
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
      const { sessao, ultimos } = estado.confirmacao.anterior
      return { ...estado, sessao, ultimos, confirmacao: null }
    }
    case 'fecharConfirmacao':
      return estado.confirmacao ? { ...estado, confirmacao: null } : estado
    case 'definirMadrugada':
      return estado.madrugada === acao.valor ? estado : { ...estado, madrugada: acao.valor }
  }
}
