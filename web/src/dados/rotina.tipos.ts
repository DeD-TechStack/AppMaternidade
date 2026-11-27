import type { Papel, Resultado } from './comum.ts'
import type { Bebe, DadosConta, Membro } from './conta.ts'

// A área da rotina: os tipos que a tela vê e a interface de dados. Datas e horas são texto ISO 8601
// em UTC, como o banco devolve. Toda operação é assíncrona e devolve `Resultado`: nenhuma lança.

export const TIPOS_REGISTRO = ['sono', 'mamada', 'tummy', 'mamadeira', 'fralda', 'solido', 'observacao'] as const
export type TipoRegistro = (typeof TIPOS_REGISTRO)[number]

/** Sessão de cuidado: sono, mamada ou tummy time. Os outros são pontuais. */
export const TIPOS_SESSAO = ['sono', 'mamada', 'tummy'] as const
export type TipoSessao = (typeof TIPOS_SESSAO)[number]

export const ehTipoRegistro = (valor: unknown): valor is TipoRegistro =>
  typeof valor === 'string' && (TIPOS_REGISTRO as readonly string[]).includes(valor)

export const ehTipoDeSessao = (valor: unknown): valor is TipoSessao =>
  typeof valor === 'string' && (TIPOS_SESSAO as readonly string[]).includes(valor)

export type OrigemRegistro = 'ao_vivo' | 'retroativo'

export type LadoMamada = 'esquerdo' | 'direito' | 'ambos'
export type ConteudoMamadeira = 'leite_materno' | 'formula'
export type ConteudoFralda = 'xixi' | 'coco' | 'ambos'

export interface DetalhesRegistro {
  lado?: LadoMamada
  ml?: number
  conteudo?: ConteudoMamadeira | ConteudoFralda
  alimento?: string
}

export interface Registro {
  id: string
  familiaId: string
  bebeId: string
  tipo: TipoRegistro
  inicio: string
  fim: string | null
  detalhes: DetalhesRegistro
  nota: string | null
  origem: OrigemRegistro
  fuso: string
  deslocamentoMin: number
  criadoPor: string | null
  encerradoPor: string | null
  versao: number
  recebidoEm: string
  atualizadoEm: string
  excluidoEm: string | null
  excluidoPor: string | null
}

export interface Nota {
  id: string
  familiaId: string
  bebeId: string | null
  texto: string
  destaqueAte: string | null
  criadoPor: string | null
  criadaEm: string
  versao: number
  atualizadoEm: string
  excluidaEm: string | null
  excluidaPor: string | null
}

export type OperacaoAlteracao = 'criacao' | 'edicao' | 'exclusao' | 'restauracao'

export interface Alteracao {
  id: string
  registroId: string
  familiaId: string
  operacao: OperacaoAlteracao
  autor: string | null
  antes: Record<string, unknown> | null
  depois: Record<string, unknown> | null
  versao: number
  recebidaEm: string
}

/** O resultado de uma leitura de lista: o que veio e se passou do limite (R38-02). */
export interface Lista<T> {
  itens: T[]
  incompleta: boolean
}

/** O limite máximo de linhas de cada leitura de lista; a consulta pede esse número mais 1. */
export const LIMITES = {
  doDia: 500,
  doIntervalo: 500,
  sessoesDaJanela: 500,
  alteracoes: 200,
  lixeira: 200,
  notas: 100,
  emAndamento: 20,
} as const

export interface FamiliaDaRotina {
  id: string
  nome: string
  fuso: string
  meuPapel: Papel
  /** Os membros com vínculo ativo (id da conta e nome). */
  membros: Membro[]
  bebes: Bebe[]
}

export interface ContextoRotina {
  /** O id da conta atual. */
  contaId: string
  familias: FamiliaDaRotina[]
}

export interface NovoRegistro {
  /** O UUID v7 gerado no navegador antes da 1ª tentativa, repetido em toda nova tentativa. */
  id: string
  bebeId: string
  tipo: TipoRegistro
  inicio: string
  fim?: string | null
  detalhes?: DetalhesRegistro
  nota?: string | null
  origem?: OrigemRegistro
}

/** O estado completo das 6 colunas editáveis: vale a última gravação (46-M1). */
export interface EdicaoRegistro {
  inicio: string
  fim: string | null
  detalhes: DetalhesRegistro
  nota: string | null
}

export interface NovaNota {
  id: string
  familiaId: string
  texto: string
  bebeId?: string | null
  destaqueAte?: string | null
}

export interface DesdeMeuUltimo {
  marco: Registro | null
  novos: Registro[]
}

export interface DadosRotina {
  contexto(): Promise<Resultado<ContextoRotina>>
  emAndamento(bebe: string): Promise<Resultado<Lista<Registro>>>
  ultimosConcluidos(bebe: string): Promise<Resultado<Registro[]>>
  desdeMeuUltimo(bebe: string, conta: string): Promise<Resultado<DesdeMeuUltimo>>
  doDia(bebe: string, dia: string): Promise<Resultado<Lista<Registro>>>
  sessoesDaJanela(bebe: string, de: string, ate: string, tipos?: readonly TipoRegistro[]): Promise<Resultado<Lista<Registro>>>
  doIntervalo(bebe: string, de: string, ate: string): Promise<Resultado<Lista<Registro>>>
  registro(id: string): Promise<Resultado<Registro | null>>
  alteracoes(id: string): Promise<Resultado<Lista<Alteracao>>>
  lixeira(bebe: string): Promise<Resultado<Lista<Registro>>>
  notas(familia: string, bebe: string | null): Promise<Resultado<Lista<Nota>>>
  gravarRegistro(entrada: NovoRegistro): Promise<Resultado<Registro>>
  editarRegistro(id: string, edicao: EdicaoRegistro): Promise<Resultado<Registro>>
  /** Envia sempre o `momento`; devolve o fim gravado (o primeiro, se já estava encerrada). */
  encerrarSessao(id: string, momento: string): Promise<Resultado<string>>
  excluirRegistro(id: string): Promise<Resultado<null>>
  restaurarRegistro(id: string): Promise<Resultado<null>>
  gravarNota(entrada: NovaNota): Promise<Resultado<Nota>>
  editarNota(id: string, texto: string, destaqueAte: string | null): Promise<Resultado<Nota>>
  excluirNota(id: string): Promise<Resultado<null>>
}

export type OperacaoRotina = keyof DadosRotina

const TODAS: Record<OperacaoRotina, true> = {
  contexto: true,
  emAndamento: true,
  ultimosConcluidos: true,
  desdeMeuUltimo: true,
  doDia: true,
  sessoesDaJanela: true,
  doIntervalo: true,
  registro: true,
  alteracoes: true,
  lixeira: true,
  notas: true,
  gravarRegistro: true,
  editarRegistro: true,
  encerrarSessao: true,
  excluirRegistro: true,
  restaurarRegistro: true,
  gravarNota: true,
  editarNota: true,
  excluirNota: true,
}

export const OPERACOES_ROTINA = Object.keys(TODAS) as OperacaoRotina[]

/**
 * Quem pode alterar (editar, excluir e restaurar) um item: o responsável, qualquer um; o cuidador, só os
 * que criou (`criado_por` igual à conta atual, não nulo); o observador, nenhum (matriz do glossário).
 */
export function podeAlterarItem(papel: Papel, criadoPor: string | null, conta: string): boolean {
  if (papel === 'responsavel') return true
  return papel === 'cuidador' && criadoPor !== null && criadoPor === conta
}

/** Quem pode gravar registro, iniciar e encerrar sessão e gravar nota: responsável e cuidador. */
export const podeEscrever = (papel: Papel): boolean => papel === 'responsavel' || papel === 'cuidador'

/** O contexto da rotina: as famílias da conta atual com papel, membros e bebês (R38-02, `contexto()`). */
export async function lerContextoDaConta(conta: DadosConta): Promise<Resultado<ContextoRotina>> {
  const sessao = await conta.sessaoAtual()
  if (!sessao.ok) return sessao
  if (!sessao.valor) {
    // Sem sessão de login: a classe `sessao_encerrada`, que a guarda trata levando a `/entrar`.
    return {
      ok: false,
      erro: { classe: 'sessao_encerrada', chave: 'sessao_encerrada', codigo: '401', mensagemOriginal: 'Auth session missing!' },
    }
  }
  const resumos = await conta.minhasFamilias()
  if (!resumos.ok) return resumos
  const detalhes = await Promise.all(resumos.valor.map((familia) => conta.detalheFamilia(familia.id)))
  const familias: FamiliaDaRotina[] = []
  for (const detalhe of detalhes) {
    if (!detalhe.ok) return detalhe
    const { familia, membros, bebes } = detalhe.valor
    familias.push({ id: familia.id, nome: familia.nome, fuso: familia.fuso, meuPapel: familia.meuPapel, membros, bebes })
  }
  return { ok: true, valor: { contaId: sessao.valor.id, familias } }
}
