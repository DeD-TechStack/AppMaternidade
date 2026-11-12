import { createContext, createElement, type ReactNode } from 'react'
import { obterCliente } from './cliente.ts'
import { modoDados, type Resultado } from './comum.ts'
import {
  criarDadosComunidade,
  type Pagina,
  type Resposta,
  type Topico,
} from './comunidade.ts'
import { fixtureComunidadeDemonstracao } from './comunidade.demonstracao.ts'
import { criarEstadoComunidade, type EstadoComunidade } from './comunidade.memoria.ts'
import type { EstadoDenuncia, EstadoModeracao, MotivoDenuncia, PapelPlataforma } from './comunidade.regras.ts'
import { criarDadosModeracaoMemoria } from './moderacao.memoria.ts'
import { criarDadosModeracaoSupabase } from './moderacao.supabase.ts'

// O painel de moderação (MAT-40b): os tipos que a tela vê, a interface de dados e a instância da página.
// Datas e horas são texto ISO 8601 em UTC, como o banco devolve. Nenhuma operação lança exceção.

export type TipoDeConteudo = 'topico' | 'resposta'

export interface AlvoModeravel {
  tipo: TipoDeConteudo
  id: string
}

/** Uma denúncia como a moderação a lê: nunca quem denunciou nem quem decidiu (o grant é por coluna). */
export interface Denuncia {
  id: string
  topicoId: string | null
  respostaId: string | null
  perfilId: string | null
  motivo: MotivoDenuncia
  texto: string | null
  estado: EstadoDenuncia
  decididaEm: string | null
  criadaEm: string
}

export interface FiltroDaFila {
  /** Os estados marcados; nenhum marcado equivale aos quatro. */
  estados: readonly EstadoDenuncia[]
  /** `null` é "Todos". */
  motivo: MotivoDenuncia | null
}

/** Um tópico ou uma resposta em qualquer estado. */
export type ConteudoLido =
  | { tipo: 'topico'; topico: Topico }
  | { tipo: 'resposta'; resposta: Resposta; topicoTitulo: string | null }

export type AcaoDeAuditoria = 'ocultar' | 'remover' | 'restaurar' | 'decidir_denuncia' | 'conceder_papel' | 'revogar_papel'
export type AlvoDeAuditoria = 'topico' | 'resposta' | 'denuncia' | 'papel_plataforma'

export interface LinhaDeAuditoria {
  id: string
  atorId: string
  acao: AcaoDeAuditoria
  alvoTipo: AlvoDeAuditoria
  alvoId: string
  estadoAnterior: string | null
  estadoNovo: string | null
  motivo: string
  denunciaId: string | null
  /** O texto no momento da ação (tópico: título e corpo; resposta: corpo). */
  conteudo: string | null
  validoAte: string | null
  criadoEm: string
}

/** Um conteúdo do histórico do perfil: tópico ou resposta, com o estado de agora. */
export interface ItemDoHistorico {
  tipo: TipoDeConteudo
  id: string
  /** O tópico a que o item pertence (o próprio id, quando é tópico). */
  topicoId: string
  /** O título, só no tópico. */
  titulo: string | null
  corpo: string
  estado: EstadoModeracao
  motivoModeracao: string | null
  criadoEm: string
}

export interface HistoricoDoPerfil {
  conteudos: ItemDoHistorico[]
  auditoria: LinhaDeAuditoria[]
}

export interface PapelDaLista {
  contaId: string
  papel: PapelPlataforma
  concedidoPor: string | null
  concedidoEm: string
  validoAte: string | null
}

export type NivelDaSessao = 'aal1' | 'aal2'

export interface FatorTotp {
  id: string
  verificado: boolean
}

export interface FatorNovo {
  id: string
  /** A chave em texto, para quem digita no app em vez de ler o QR. */
  chave: string
  /** O QR como imagem (endereço `data:`), do jeito que o Auth o devolve. */
  qr: string
}

/**
 * Todas as operações são assíncronas e devolvem `Resultado`. A leitura de um id que o banco não devolve é
 * `ok` com `null` (a tela mostra "não encontrado", depois de reler a situação da conta).
 */
export interface DadosModeracao {
  filaDeDenuncias(filtro: FiltroDaFila, pagina: number): Promise<Resultado<Pagina<Denuncia>>>
  lerDenuncia(id: string): Promise<Resultado<Denuncia | null>>
  lerConteudo(tipo: TipoDeConteudo, id: string): Promise<Resultado<ConteudoLido | null>>
  historicoDoPerfil(perfilId: string): Promise<Resultado<HistoricoDoPerfil>>
  moderarConteudo(
    alvo: AlvoModeravel,
    novoEstado: EstadoModeracao,
    motivo: string,
    denunciaId: string | null,
  ): Promise<Resultado<string>>
  decidirDenuncia(denunciaId: string, decisao: EstadoDenuncia, motivo: string): Promise<Resultado<string>>
  auditoria(pagina: number): Promise<Resultado<Pagina<LinhaDeAuditoria>>>
  papeis(): Promise<Resultado<PapelDaLista[]>>
  concederPapel(conta: string, papel: PapelPlataforma, motivo: string, validoAte: string | null): Promise<Resultado<string>>
  revogarPapel(conta: string, papel: PapelPlataforma, motivo: string): Promise<Resultado<string>>
  nivelDaSessao(): Promise<Resultado<NivelDaSessao>>
  fatores(): Promise<Resultado<FatorTotp[]>>
  cadastrarFator(): Promise<Resultado<FatorNovo>>
  confirmarCodigo(fatorId: string, codigo: string): Promise<Resultado<null>>
}

/** O nome de qualquer operação da interface. */
export type OperacaoModeracao = keyof DadosModeracao

// O compilador confere que a lista cobre todas as operações da interface.
const TODAS: Record<OperacaoModeracao, true> = {
  filaDeDenuncias: true,
  lerDenuncia: true,
  lerConteudo: true,
  historicoDoPerfil: true,
  moderarConteudo: true,
  decidirDenuncia: true,
  auditoria: true,
  papeis: true,
  concederPapel: true,
  revogarPapel: true,
  nivelDaSessao: true,
  fatores: true,
  cadastrarFator: true,
  confirmarCodigo: true,
}

export const OPERACOES_MODERACAO = Object.keys(TODAS) as OperacaoModeracao[]

/**
 * O interruptor da verificação em duas etapas (MAT-40:RF-20), desligado por padrão. Este é o único ponto
 * que lê `VITE_MODERACAO_MFA`. Ausente ou vazio: desligado. Qualquer valor não vazio liga (na dúvida,
 * pede a verificação). Os testes passam o valor por parâmetro.
 */
export function mfaModeracaoLigado(valor: unknown = import.meta.env.VITE_MODERACAO_MFA): boolean {
  return String(valor ?? '') !== ''
}

// A conta da sessão no modo memória: a tela informa o id que a MAT-37 leu. No modo Supabase, quem manda é a
// sessão do próprio cliente.
let contaDaPagina: string | null = null

export function informarContaDaSessaoModeracao(id: string | null): void {
  contaDaPagina = id
}

let emMemoria: DadosModeracao | null = null
let noBanco: { cliente: unknown; dados: DadosModeracao } | null = null

/**
 * A instância de dados da página: a mesma durante toda a vida dela. No modo memória age sobre o mesmo
 * estado da Comunidade da página, então ocultar um conteúdo aqui muda o que a Comunidade mostra.
 */
export function criarDadosModeracao(): DadosModeracao {
  const cliente = obterCliente()
  if (modoDados() === 'supabase' && cliente) {
    if (!noBanco || noBanco.cliente !== cliente) noBanco = { cliente, dados: criarDadosModeracaoSupabase(cliente) }
    return noBanco.dados
  }
  if (!emMemoria) {
    // A memória da Comunidade expõe o próprio estado; sem ele, o painel parte de uma cópia da fixture.
    const daComunidade = criarDadosComunidade() as unknown as { estado?: EstadoComunidade }
    const estado = daComunidade.estado ?? criarEstadoComunidade(fixtureComunidadeDemonstracao)
    emMemoria = criarDadosModeracaoMemoria(estado, () => contaDaPagina)
  }
  return emMemoria
}

/** O contexto de dados: os testes injetam a memória; sem ele, vale a instância da página. */
export const ContextoDadosModeracao = createContext<DadosModeracao | null>(null)

export function ProvedorDadosModeracao({ dados, children }: { dados?: DadosModeracao; children: ReactNode }) {
  return createElement(ContextoDadosModeracao, { value: dados ?? criarDadosModeracao() }, children)
}
