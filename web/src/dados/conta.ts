import { obterCliente } from './cliente.ts'
import type { Papel, Resultado } from './comum.ts'
import { modoDados } from './comum.ts'
import { criarFixtureDemonstracao } from './conta.demonstracao.ts'
import { criarDadosContaMemoria } from './conta.memoria.ts'
import { criarDadosContaSupabase } from './conta.supabase.ts'

// A área de conta: os tipos que a tela vê, a interface de dados e a instância da página. Datas e
// horas são texto ISO 8601 em UTC, como o banco devolve; `nascimento` é `AAAA-MM-DD`.

export interface Usuario {
  id: string
  email: string
  nomeMetadados: string | null
}

export interface Conta {
  id: string
  nome: string
  fuso: string
  email: string
  criadaEm: string
}

export interface FamiliaResumo {
  id: string
  nome: string
  fuso: string
  criadaEm: string
  meuPapel: Papel
  meuVinculoId: string
  meuAcessoAte: string | null
}

export interface Bebe {
  id: string
  familiaId: string
  nome: string
  nascimento: string
  estado: 'ativo' | 'arquivado'
}

export interface Membro {
  vinculoId: string
  contaId: string
  nome: string
  papel: Papel
  validoAte: string | null
  souEu: boolean
}

export interface ConviteResumo {
  id: string
  papel: Papel
  validoAte: string | null
  expiraEm: string
  /** `null` quando o criador foi excluído: a tela mostra "pessoa removida". */
  criadoPorNome: string | null
  vencido: boolean
}

export interface DetalheFamilia {
  familia: FamiliaResumo
  bebes: Bebe[]
  membros: Membro[]
  /** `null` para quem não é responsável: a RLS só deixa o responsável ler os convites. */
  convites: ConviteResumo[] | null
}

export interface ConviteCriado {
  id: string
  codigo: string
  expiraEm: string
}

export interface PreviaConvite {
  familiaNome: string
  papel: Papel
  validoAte: string | null
  expiraEm: string
  bebes: string[]
}

export type EventoSessao = 'entrou' | 'saiu' | 'recuperacao' | 'renovou' | 'usuario_atualizado'

/**
 * Todas as operações são assíncronas e devolvem `Resultado`, salvo `aoMudarSessao`, que é
 * síncrona e devolve a função que cancela a inscrição.
 */
export interface DadosConta {
  sessaoAtual(): Promise<Resultado<Usuario | null>>
  aoMudarSessao(ouvinte: (evento: EventoSessao, usuario: Usuario | null) => void): () => void
  entrar(email: string, senha: string): Promise<Resultado<Usuario>>
  criarUsuario(
    email: string,
    senha: string,
    nome: string,
    voltarPara: string,
  ): Promise<Resultado<{ usuario: Usuario; comSessao: boolean }>>
  pedirRecuperacao(email: string, voltarPara: string): Promise<Resultado<null>>
  trocarSenha(nova: string): Promise<Resultado<null>>
  sair(): Promise<Resultado<null>>
  minhaConta(): Promise<Resultado<Conta | null>>
  criarMinhaConta(nome: string, fuso: string): Promise<Resultado<Conta>>
  atualizarMinhaConta(nome: string, fuso: string): Promise<Resultado<Conta>>
  minhasFamilias(): Promise<Resultado<FamiliaResumo[]>>
  detalheFamilia(familiaId: string): Promise<Resultado<DetalheFamilia>>
  criarFamilia(nome: string, fuso: string): Promise<Resultado<string>>
  atualizarFamilia(familiaId: string, nome: string, fuso: string): Promise<Resultado<FamiliaResumo>>
  cadastrarBebe(familiaId: string, nome: string, nascimento: string): Promise<Resultado<Bebe>>
  atualizarBebe(bebeId: string, nome: string, nascimento: string): Promise<Resultado<Bebe>>
  arquivarBebe(bebeId: string, arquivado: boolean): Promise<Resultado<Bebe>>
  criarConvite(familiaId: string, papel: Papel, validoAte: string | null): Promise<Resultado<ConviteCriado>>
  verConvite(codigo: string): Promise<Resultado<PreviaConvite>>
  aceitarConvite(codigo: string): Promise<Resultado<string>>
  revogarConvite(conviteId: string): Promise<Resultado<null>>
  mudarPapel(vinculoId: string, papel: Papel): Promise<Resultado<null>>
  revogarVinculo(vinculoId: string): Promise<Resultado<null>>
  sairDaFamilia(familiaId: string): Promise<Resultado<null>>
  excluirFamilia(familiaId: string): Promise<Resultado<null>>
  /** O JSON da exportação (`formato: 'appmaternidade-exportacao-v1'`), sem mudança. */
  exportarDados(): Promise<Resultado<unknown>>
  excluirConta(): Promise<Resultado<null>>
}

/** O nome de qualquer operação assíncrona da interface (todas menos `aoMudarSessao`). */
export type OperacaoConta = Exclude<keyof DadosConta, 'aoMudarSessao'>

// O compilador confere que a lista cobre todas as operações da interface.
const TODAS: Record<OperacaoConta, true> = {
  sessaoAtual: true,
  entrar: true,
  criarUsuario: true,
  pedirRecuperacao: true,
  trocarSenha: true,
  sair: true,
  minhaConta: true,
  criarMinhaConta: true,
  atualizarMinhaConta: true,
  minhasFamilias: true,
  detalheFamilia: true,
  criarFamilia: true,
  atualizarFamilia: true,
  cadastrarBebe: true,
  atualizarBebe: true,
  arquivarBebe: true,
  criarConvite: true,
  verConvite: true,
  aceitarConvite: true,
  revogarConvite: true,
  mudarPapel: true,
  revogarVinculo: true,
  sairDaFamilia: true,
  excluirFamilia: true,
  exportarDados: true,
  excluirConta: true,
}

export const OPERACOES_CONTA = Object.keys(TODAS) as OperacaoConta[]

// Uma instância por modo. No site o modo não muda durante a vida da página; só os testes trocam as
// variáveis, e voltar ao modo anterior devolve a instância que ele já tinha.
let emMemoria: DadosConta | null = null
let noBanco: { cliente: unknown; dados: DadosConta } | null = null

/**
 * A instância de dados da página: a mesma durante toda a vida dela. No modo Supabase é a
 * implementação do banco; no modo memória, a cópia em memória com a fixture de demonstração
 * (a sessão, as contas e as famílias vivem nela, e só recarregar a página as perde).
 */
export function criarDadosConta(): DadosConta {
  const cliente = obterCliente()
  if (modoDados() === 'supabase' && cliente) {
    if (!noBanco || noBanco.cliente !== cliente) noBanco = { cliente, dados: criarDadosContaSupabase(cliente) }
    return noBanco.dados
  }
  emMemoria ??= criarDadosContaMemoria(criarFixtureDemonstracao(Date.now()))
  return emMemoria
}
