import { chaveDoBanco, clientePedido } from './cliente.ts'
import { haSinalDeSessao } from '../componentes/conta/armazenamento.ts'
import type { Papel, Resultado } from './comum.ts'
import { dadosLocaisSobDemanda, dadosSobDemanda, modoDados } from './comum.ts'
import { registrarOrigemDaConta } from './fontes.ts'

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
  /**
   * Os membros da família. Só vem com `minhasFamilias({ comMembros: true })` e só nas famílias em que
   * a pessoa é responsável; sem a opção, a chave não existe.
   */
  membros?: Membro[]
}

/** As opções de `minhasFamilias`. */
export interface OpcoesDeFamilias {
  /** Traz, na mesma leitura, os membros das famílias em que a pessoa é responsável (sem bebês nem convites). */
  comMembros?: boolean
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

/** O que `detalheFamilia` lê: tudo (bebês, membros, convites) ou só os membros. */
export type EscopoDoDetalhe = 'completo' | 'membros'

export type EventoSessao = 'entrou' | 'saiu' | 'recuperacao' | 'renovou' | 'usuario_atualizado'

/**
 * Todas as operações são assíncronas e devolvem `Resultado`, salvo `aoMudarSessao`, que é
 * síncrona e devolve a função que cancela a inscrição.
 */
export interface DadosConta {
  sessaoAtual(): Promise<Resultado<Usuario | null>>
  aoMudarSessao(ouvinte: (evento: EventoSessao, usuario: Usuario | null) => void): () => void
  entrar(email: string, senha: string): Promise<Resultado<Usuario>>
  /**
   * Abre o login com o Google (OAuth com PKCE): o navegador sai da página e volta em `voltarPara`, onde o
   * cliente troca o código pela sessão. O resultado só diz se o pedido saiu; a sessão chega por `aoMudarSessao`.
   */
  entrarComGoogle(voltarPara: string): Promise<Resultado<null>>
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
  minhasFamilias(opcoes?: OpcoesDeFamilias): Promise<Resultado<FamiliaResumo[]>>
  /**
   * O detalhe de uma família. Com `escopo: 'membros'` lê só os membros (a tela que só precisa saber
   * quem é responsável, como a Conta): `bebes` volta vazio e `convites` volta `null`, sem pedir as
   * duas tabelas. Sem escopo, vale `'completo'`.
   */
  detalheFamilia(familiaId: string, escopo?: EscopoDoDetalhe): Promise<Resultado<DetalheFamilia>>
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
  entrarComGoogle: true,
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
let noBanco: { chave: string; dados: DadosConta } | null = null

const SEM_SESSAO: Resultado<Usuario | null> = { ok: true, valor: null }

interface Inscricao {
  ouvinte: Parameters<DadosConta['aoMudarSessao']>[0]
  cancelada: boolean
  /** O cancelamento da inscrição de verdade; `null` enquanto o adaptador não chegou. */
  cancelar: (() => void) | null
}

/**
 * As inscrições em `aoMudarSessao` de uma instância sob demanda. A inscrição é síncrona: ela fica guardada e vale
 * quando o adaptador chega (por qualquer operação, ou por `aoPedir`), e cancelar antes disso a desfaz. Cada inscrição se
 * liga ao adaptador no máximo uma vez, e só se ainda não foi cancelada.
 */
function criarInscricoes() {
  const entradas = new Set<Inscricao>()
  let adaptador: DadosConta | null = null
  const ligar = (inscricao: Inscricao, dados: DadosConta) => {
    if (inscricao.cancelada || inscricao.cancelar) return
    inscricao.cancelar = dados.aoMudarSessao(inscricao.ouvinte)
  }
  return {
    /** O adaptador chegou: as inscrições que esperavam passam a valer. */
    chegou(dados: DadosConta) {
      adaptador = dados
      for (const inscricao of entradas) ligar(inscricao, dados)
    },
    /** `aoPedir` roda quando o adaptador ainda não chegou: é onde se decide pedir a carga já ou esperar. */
    inscrever(ouvinte: Inscricao['ouvinte'], aoPedir: () => void): () => void {
      const inscricao: Inscricao = { ouvinte, cancelada: false, cancelar: null }
      entradas.add(inscricao)
      if (adaptador) ligar(inscricao, adaptador)
      else aoPedir()
      return () => {
        inscricao.cancelada = true
        entradas.delete(inscricao)
        inscricao.cancelar?.()
      }
    },
  }
}

// O modo Supabase: a implementação do banco só é baixada (junto com o pacote do Supabase) na primeira operação, e uma
// visita anônima (sem sessão guardada nem link de autenticação na URL) não precisa dela: `sessaoAtual` responde
// "sem sessão" e `aoMudarSessao` guarda a inscrição até o adaptador chegar por outro motivo (um `entrar`, por exemplo).
function criarDadosContaSobDemanda(): DadosConta {
  const inscricoes = criarInscricoes()
  const haMotivoParaOAuth = () => clientePedido() || haSinalDeSessao()

  return dadosSobDemanda<DadosConta>(
    OPERACOES_CONTA,
    async (cliente) => {
      const dados = (await import('./conta.supabase.ts')).criarDadosContaSupabase(cliente)
      inscricoes.chegou(dados)
      return dados
    },
    (carregar, base) => ({
      sessaoAtual: () => (haMotivoParaOAuth() ? base.sessaoAtual() : Promise.resolve(SEM_SESSAO)),
      aoMudarSessao: (ouvinte) =>
        inscricoes.inscrever(ouvinte, () => {
          if (haMotivoParaOAuth()) carregar().then(() => {}, () => {})
        }),
    }),
  )
}

// O modo memória: o motor (`conta.memoria.ts`) e a fixture de demonstração só são baixados na primeira operação. Uma
// página recém-aberta não tem sessão em memória (só recarregar a página perde o que há nela), então, enquanto a carga não
// foi pedida, `sessaoAtual` responde "sem sessão" sem baixar nada. Os registros da rotina e dos avisos feitos sobre esta
// fachada valem para o motor (`registrarOrigemDaConta`).
function criarDadosContaEmMemoriaSobDemanda(): DadosConta {
  const inscricoes = criarInscricoes()
  let fachada: DadosConta | null = null
  const local = dadosLocaisSobDemanda<DadosConta>(
    OPERACOES_CONTA,
    async () => {
      // O único lugar que importa o motor e a fixture da conta fora dos testes, e só por `import()`.
      const [{ criarDadosContaMemoria }, { criarFixtureDemonstracao }] = await Promise.all([
        import('./conta.memoria.ts'),
        import('./conta.demonstracao.ts'),
      ])
      return criarDadosContaMemoria(criarFixtureDemonstracao(Date.now()))
    },
    (motor) => {
      if (fachada) registrarOrigemDaConta(motor, fachada)
      inscricoes.chegou(motor)
    },
  )
  const base = { ...local.dados }
  fachada = Object.assign(local.dados, {
    sessaoAtual: () => (local.pedido() ? base.sessaoAtual() : Promise.resolve(SEM_SESSAO)),
    aoMudarSessao: (ouvinte: Inscricao['ouvinte']) => inscricoes.inscrever(ouvinte, () => {}),
  })
  return fachada
}

/**
 * A instância de dados da página: a mesma durante toda a vida dela. No modo Supabase é a
 * implementação do banco; no modo memória, a cópia em memória com a fixture de demonstração
 * (a sessão, as contas e as famílias vivem nela, e só recarregar a página as perde). Nos dois modos ela é só a
 * fachada: o motor chega na primeira operação.
 */
export function criarDadosConta(): DadosConta {
  const chave = chaveDoBanco()
  if (modoDados() === 'supabase' && chave) {
    if (!noBanco || noBanco.chave !== chave) noBanco = { chave, dados: criarDadosContaSobDemanda() }
    return noBanco.dados
  }
  emMemoria ??= criarDadosContaEmMemoriaSobDemanda()
  return emMemoria
}
