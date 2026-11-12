import { dataNoFuso, type ErroDados, type Resultado } from './comum.ts'
import { ehDiaValido, inicioDoDia } from './rotina.dia.ts'
import { erroRotinaDaChave } from './rotina.erros.ts'
import type { ContextoRotina, DadosRotina, Registro } from './rotina.tipos.ts'

// A camada fina da área Desenvolvimento (MAT-39b, DES-10, P20): as duas leituras do bloco de tummy time, as
// escritas sobre a `DadosRotina`, a conversão de dia e hora do formulário e a tradução do `ErroDados` na linha
// do DES-09. Esta área não tem implementação própria: quem fala com o banco ou com a memória é a rotina.

const MINUTO = 60_000
const PRAZO_DA_RESPOSTA = 15_000

/** As duas leituras do DES-04 juntas: as sessões em andamento e as encerradas que tocam a janela de 7 dias. */
export interface LeituraDoBloco {
  /** Só as de tipo `tummy` (as em andamento, de qualquer idade), a mais recente primeiro. */
  emAndamento: Registro[]
  /** As encerradas que tocam a janela, em ordem de início. */
  sessoes: Registro[]
  /** Qualquer das duas leituras passou do limite (R38-02): nada pode ser somado como se estivesse completo. */
  incompleta: boolean
}

export interface DadosDesenvolvimento {
  /** O contexto da rotina: papel, bebês e membros da família (nomes dos autores). */
  contexto(): Promise<Resultado<ContextoRotina>>
  lerBloco(bebe: string, fusoDaFamilia: string, agora: number): Promise<Resultado<LeituraDoBloco>>
  /** `gravarRegistro` de uma sessão nova: início = `inicio`, sem fim, origem `ao_vivo`. */
  iniciar(entrada: { id: string; bebe: string; inicio: number }): Promise<Resultado<Registro>>
  /** `encerrarSessao(id, momento)`: devolve o fim gravado, em milissegundos. */
  encerrar(id: string, momento: number): Promise<Resultado<number>>
  /** `excluirRegistro`: o Descartar e o Desfazer de um "Fizemos agora". */
  descartar(id: string): Promise<Resultado<null>>
  restaurar(id: string): Promise<Resultado<null>>
  /** `gravarRegistro` de uma sessão já encerrada: o "Fizemos agora" e o outro horário, origem `retroativo`. */
  registrarDepois(entrada: { id: string; bebe: string; inicio: number; fim: number }): Promise<Resultado<Registro>>
}

const iso = (instante: number) => new Date(instante).toISOString()

/** Uma resposta que não tem o formato esperado: `desconhecido` sem código do banco, nunca sucesso (item 8). */
const foraDoFormato = (): ErroDados => ({
  classe: 'desconhecido',
  chave: 'desconhecido',
  codigo: '',
  mensagemOriginal: 'Resposta fora do formato.',
})

export function criarDadosDesenvolvimento(rotina: DadosRotina): DadosDesenvolvimento {
  return {
    contexto: () => rotina.contexto(),

    async lerBloco(bebe, fusoDaFamilia, agora) {
      const [emAndamento, janela] = await Promise.all([
        rotina.emAndamento(bebe),
        rotina.sessoesDaJanela(bebe, iso(comecoDaJanela(agora, fusoDaFamilia)), iso(agora), ['tummy']),
      ])
      if (!emAndamento.ok) return emAndamento
      if (!janela.ok) return janela
      return {
        ok: true,
        valor: {
          emAndamento: emAndamento.valor.itens.filter((registro) => registro.tipo === 'tummy' && registro.fim === null),
          sessoes: janela.valor.itens.filter((registro) => registro.tipo === 'tummy' && registro.fim !== null),
          incompleta: emAndamento.valor.incompleta || janela.valor.incompleta,
        },
      }
    },

    iniciar: ({ id, bebe, inicio }) =>
      rotina.gravarRegistro({ id, bebeId: bebe, tipo: 'tummy', inicio: iso(inicio), fim: null, origem: 'ao_vivo' }),

    async encerrar(id, momento) {
      const resposta = await rotina.encerrarSessao(id, iso(momento))
      if (!resposta.ok) return resposta
      const fim = Date.parse(resposta.valor)
      return Number.isNaN(fim) ? { ok: false, erro: foraDoFormato() } : { ok: true, valor: fim }
    },

    descartar: (id) => rotina.excluirRegistro(id),
    restaurar: (id) => rotina.restaurarRegistro(id),

    registrarDepois: ({ id, bebe, inicio, fim }) =>
      rotina.gravarRegistro({ id, bebeId: bebe, tipo: 'tummy', inicio: iso(inicio), fim: iso(fim), origem: 'retroativo' }),
  }
}

/** Uma chamada sem resposta em 15 segundos vale como sem resposta (P23): o erro da classe `rede`. */
export function comPrazoDeResposta<T>(chamada: Promise<Resultado<T>>, prazo: number = PRAZO_DA_RESPOSTA): Promise<Resultado<T>> {
  return new Promise((resolver) => {
    const relogio = setTimeout(() => resolver({ ok: false, erro: erroRotinaDaChave('rede') }), prazo)
    chamada.then(
      (resultado) => {
        clearTimeout(relogio)
        resolver(resultado)
      },
      () => {
        clearTimeout(relogio)
        resolver({ ok: false, erro: foraDoFormato() })
      },
    )
  })
}

// ---- dias e horas ---------------------------------------------------------------------------------------

function somarDias(dia: string, dias: number): string {
  const [ano, mes, numero] = dia.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, numero + dias)).toISOString().slice(0, 10)
}

/** Os 7 dias da fila, do mais recente (o de `agora` no fuso) ao mais antigo, como `AAAA-MM-DD`. */
export function diasDaFila(agora: number, fuso: string): string[] {
  const hoje = dataNoFuso(agora, fuso)
  return Array.from({ length: 7 }, (_, passo) => somarDias(hoje, -passo))
}

/** 00:00 de D-6 no fuso da família, em milissegundos: o começo da janela de leitura (DES-04). */
export function comecoDaJanela(agora: number, fusoDaFamilia: string): number {
  return inicioDoDia(diasDaFila(agora, fusoDaFamilia)[6], fusoDaFamilia)
}

interface PartesDoInstante {
  ano: number
  mes: number
  dia: number
  hora: number
  minuto: number
  segundo: number
}

function partesNoFuso(instante: number, fuso: string): PartesDoInstante {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(instante))
  const pega = (tipo: string) => Number(partes.find((parte) => parte.type === tipo)?.value ?? 0)
  return { ano: pega('year'), mes: pega('month'), dia: pega('day'), hora: pega('hour') % 24, minuto: pega('minute'), segundo: pega('second') }
}

/** O deslocamento do fuso naquele instante, em milissegundos a leste de UTC. */
function deslocamentoDoFuso(instante: number, fuso: string): number {
  const p = partesNoFuso(instante, fuso)
  return Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo) - Math.floor(instante / 1000) * 1000
}

type ConversaoDeHorario = { ok: true; instante: number } | { ok: false; motivo: 'inexistente' | 'invalido' }

/**
 * Dia (`AAAA-MM-DD`) e hora (`HH:MM`) lidos no fuso IANA dado, em milissegundos UTC. Um horário que não existe
 * naquele dia (pulo do horário de verão) é `inexistente`; um que existe duas vezes (volta do horário de verão)
 * vale a primeira ocorrência, a de instante menor.
 */
export function converterHorario(dia: string, hora: string, fuso: string): ConversaoDeHorario {
  const lida = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora)
  if (!lida || !ehDiaValido(dia)) return { ok: false, motivo: 'invalido' }
  const [ano, mes, numero] = dia.split('-').map(Number)
  const [h, m] = [Number(lida[1]), Number(lida[2])]
  const alvo = Date.UTC(ano, mes - 1, numero, h, m)
  try {
    // O deslocamento de um dia antes e o de um dia depois cobrem os dois lados de qualquer mudança de horário.
    const candidatos = new Set([deslocamentoDoFuso(alvo - 24 * 60 * MINUTO, fuso), deslocamentoDoFuso(alvo + 24 * 60 * MINUTO, fuso)])
    const existentes = [...candidatos]
      .map((deslocamento) => alvo - deslocamento)
      .filter((instante) => {
        const p = partesNoFuso(instante, fuso)
        return p.ano === ano && p.mes === mes && p.dia === numero && p.hora === h && p.minuto === m
      })
    return existentes.length === 0 ? { ok: false, motivo: 'inexistente' } : { ok: true, instante: Math.min(...existentes) }
  } catch {
    return { ok: false, motivo: 'invalido' }
  }
}

// ---- a tradução do erro (DES-09) --------------------------------------------------------------------------

export type ChaveDeErro =
  | 'semResposta'
  | 'servidorOcupado'
  | 'naoEncontrado'
  | 'semPermissao'
  | 'arquivado'
  | 'descartadaPorOutra'
  | 'prazoEncerrado'
  | 'noFuturo'
  | 'fimAntesDoInicio'
  | 'inesperado'

interface LinhaDeErro {
  chave: ChaveDeErro
  /** O que a mensagem pode afirmar: `nao` garante que nada mudou; `desconhecido`, que não dá para saber. */
  salvou: 'nao' | 'desconhecido'
  /** Mostra "Tentar de novo" (T-41 e T-42). */
  repetivel: boolean
}

const linha = (chave: ChaveDeErro, salvou: LinhaDeErro['salvou'] = 'nao', repetivel = false): LinhaDeErro => ({ chave, salvou, repetivel })

const SEM_RESPOSTA = linha('semResposta', 'desconhecido', true)
const SQLSTATE = /^[0-9A-Z]{5}$/

/**
 * Escolhe a linha do DES-09 pelo `codigo` e pela `mensagemOriginal`, na ordem da tabela. Código do banco com
 * linha própria dá a frase dela; qualquer outro código do banco é "erro inesperado" (nada mudou, porque uma função
 * que levanta erro desfaz a transação). Sem código do banco (falha de rede, resposta fora do formato) o resultado
 * é desconhecido: T-41.
 */
export function traduzirErro(erro: ErroDados): LinhaDeErro {
  if (erro.classe === 'rede') return SEM_RESPOSTA
  const { codigo, mensagemOriginal: mensagem } = erro
  if (SQLSTATE.test(codigo)) {
    if (codigo === '40P01') return linha('servidorOcupado', 'nao', true)
    if (codigo === 'P0002') return linha('naoEncontrado')
    if (codigo === '42501') return linha('semPermissao')
    if (codigo === 'P0001') {
      if (mensagem === 'bebe arquivado') return linha('arquivado')
      if (mensagem === 'registro excluido') return linha('descartadaPorOutra')
      if (mensagem === 'prazo de restauracao encerrado') return linha('prazoEncerrado')
      return linha('inesperado')
    }
    if (codigo === '23514') {
      if (mensagem === 'horario no futuro') return linha('noFuturo')
      return /registros_fim_check/.test(mensagem) || !/constraint\s+"/.test(mensagem) ? linha('fimAntesDoInicio') : linha('inesperado')
    }
    return linha('inesperado')
  }
  // Sem código do banco: vale a chave que a camada de dados já deu (uma resposta fora do formato é `desconhecido`).
  switch (erro.chave) {
    case 'tente_de_novo':
      return linha('servidorOcupado', 'nao', true)
    case 'nao_encontrado':
      return linha('naoEncontrado')
    case 'sem_permissao':
      return linha('semPermissao')
    case 'bebe_arquivado':
      return linha('arquivado')
    case 'registro_excluido':
      return linha('descartadaPorOutra')
    case 'prazo_encerrado':
      return linha('prazoEncerrado')
    case 'horario_no_futuro':
      return linha('noFuturo')
    case 'desconhecido':
      return SEM_RESPOSTA
    default:
      return linha('inesperado')
  }
}
