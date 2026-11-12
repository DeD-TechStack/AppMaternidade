import { createContext, createElement, type ReactNode } from 'react'
import { obterCliente } from './cliente.ts'
import { modoDados, type Resultado } from './comum.ts'
import {
  type EstadoDenuncia,
  type EstadoModeracao,
  type FaixaBebe,
  type MotivoDenuncia,
  type PapelPlataforma,
} from './comunidade.regras.ts'
import { fixtureComunidadeDemonstracao } from './comunidade.demonstracao.ts'
import { criarDadosComunidadeMemoria, criarEstadoComunidade } from './comunidade.memoria.ts'
import { criarDadosComunidadeSupabase } from './comunidade.supabase.ts'

// A área Comunidade (MAT-40a): os tipos que a tela vê, a interface de dados e a instância da página.
// Datas e horas são texto ISO 8601 em UTC, como o banco devolve. Nenhuma operação lança exceção.

export interface SituacaoConta {
  /** O id do perfil público próprio, ou `null` sem perfil. */
  perfilId: string | null
  /** A versão vigente dos termos, ou `null` quando não há. */
  versaoVigente: string | null
  /** A conta aceitou a versão vigente. */
  aceiteVigente: boolean
  /** Os papéis de plataforma vigentes agora (o relógio do aparelho decide a validade). */
  papeis: PapelPlataforma[]
}

export interface PerfilPublico {
  id: string
  apelido: string
  bio: string | null
  faixa: FaixaBebe | null
  criadoEm: string
}

export interface Espaco {
  id: string
  slug: string
  nome: string
  ordem: number
}

export interface Topico {
  id: string
  espacoId: string
  /** `null` quando a conta do autor foi excluída: a tela mostra "pessoa removida". */
  autorId: string | null
  titulo: string
  corpo: string
  faixa: FaixaBebe | null
  estado: EstadoModeracao
  motivoModeracao: string | null
  criadoEm: string
  editadoEm: string | null
}

export interface TopicoNaLista extends Topico {
  autor: PerfilPublico | null
  /** O número de respostas que a pessoa consegue ler. */
  respostas: number
}

export interface Resposta {
  id: string
  topicoId: string
  autorId: string | null
  /** A resposta de primeiro nível que esta cita; `null` é resposta direta ao tópico. */
  respostaA: string | null
  corpo: string
  estado: EstadoModeracao
  motivoModeracao: string | null
  criadoEm: string
  editadoEm: string | null
}

export interface Pagina<T> {
  itens: T[]
  /** A página veio cheia: pode haver mais. */
  haMais: boolean
}

export interface RespostaComTopico {
  resposta: Resposta
  topicoTitulo: string | null
}

export type TipoAlvo = 'topico' | 'resposta' | 'perfil'

export interface AlvoDenuncia {
  tipo: TipoAlvo
  id: string
}

export interface DenunciaMinha {
  id: string
  topicoId: string | null
  respostaId: string | null
  perfilId: string | null
  motivo: MotivoDenuncia
  texto: string | null
  estado: EstadoDenuncia
  criadaEm: string
  decididaEm: string | null
}

/** O que a pessoa ainda lê dos alvos das denúncias, por id. */
export interface AlvosDasDenuncias {
  /** Título do tópico. */
  topicos: Record<string, string>
  /** Corpo da resposta. */
  respostas: Record<string, string>
  /** Apelido do perfil. */
  perfis: Record<string, string>
}

export interface Bloqueio {
  perfilId: string
  criadoEm: string
}

/**
 * Todas as operações são assíncronas e devolvem `Resultado`. A leitura de um id que o banco não
 * devolve é `ok` com `null` (a tela mostra "não encontrado"). A conferência de envio devolve os ids do
 * perfil próprio com os mesmos campos do envio, do mais novo ao mais antigo.
 */
export interface DadosComunidade {
  situacaoDaConta(): Promise<Resultado<SituacaoConta>>
  aceitarTermos(versao: string): Promise<Resultado<null>>
  criarPerfil(apelido: string, bio: string | null, faixa: FaixaBebe | null): Promise<Resultado<null>>
  editarPerfil(apelido: string, bio: string | null, faixa: FaixaBebe | null): Promise<Resultado<string>>
  lerPerfis(ids: string[]): Promise<Resultado<PerfilPublico[]>>
  listarEspacos(): Promise<Resultado<Espaco[]>>
  listarTopicos(espacoId: string, pagina: number, faixa: FaixaBebe | null): Promise<Resultado<Pagina<TopicoNaLista>>>
  lerTopico(id: string): Promise<Resultado<Topico | null>>
  lerRespostas(topicoId: string, pagina: number): Promise<Resultado<Pagina<Resposta>>>
  lerResposta(id: string): Promise<Resultado<RespostaComTopico | null>>
  conferirTopicos(espacoId: string, titulo: string, corpo: string, faixa: FaixaBebe | null): Promise<Resultado<string[]>>
  conferirRespostas(topicoId: string, respostaA: string | null, corpo: string): Promise<Resultado<string[]>>
  criarTopico(espacoId: string, titulo: string, corpo: string, faixa: FaixaBebe | null): Promise<Resultado<string>>
  editarTopico(id: string, titulo: string, corpo: string, faixa: FaixaBebe | null): Promise<Resultado<string>>
  responder(topicoId: string, respostaA: string | null, corpo: string): Promise<Resultado<string>>
  editarResposta(id: string, corpo: string): Promise<Resultado<string>>
  denunciar(motivo: MotivoDenuncia, alvo: AlvoDenuncia, texto: string | null): Promise<Resultado<string>>
  minhasDenuncias(): Promise<Resultado<DenunciaMinha[]>>
  alvosDasDenuncias(denuncias: DenunciaMinha[]): Promise<Resultado<AlvosDasDenuncias>>
  bloquear(perfilId: string): Promise<Resultado<null>>
  desbloquear(perfilId: string): Promise<Resultado<null>>
  listarBloqueios(): Promise<Resultado<Bloqueio[]>>
}

/** O nome de qualquer operação da interface. */
export type OperacaoComunidade = keyof DadosComunidade

// O compilador confere que a lista cobre todas as operações da interface.
const TODAS: Record<OperacaoComunidade, true> = {
  situacaoDaConta: true,
  aceitarTermos: true,
  criarPerfil: true,
  editarPerfil: true,
  lerPerfis: true,
  listarEspacos: true,
  listarTopicos: true,
  lerTopico: true,
  lerRespostas: true,
  lerResposta: true,
  conferirTopicos: true,
  conferirRespostas: true,
  criarTopico: true,
  editarTopico: true,
  responder: true,
  editarResposta: true,
  denunciar: true,
  minhasDenuncias: true,
  alvosDasDenuncias: true,
  bloquear: true,
  desbloquear: true,
  listarBloqueios: true,
}

export const OPERACOES_COMUNIDADE = Object.keys(TODAS) as OperacaoComunidade[]

// A conta da sessão no modo memória: a casca informa o id que a MAT-37 leu. No modo Supabase, quem
// manda é a sessão do próprio cliente.
let contaDaPagina: string | null = null

/** A casca diz qual conta está entrada (só o modo memória usa). */
export function informarContaDaSessao(id: string | null): void {
  contaDaPagina = id
}

// Uma instância por modo, como na área de conta. No modo memória a conta entrada vira conta habilitada
// (o guarda da MAT-37 só a deixa passar com a linha de `contas`).
let emMemoria: DadosComunidade | null = null
let noBanco: { cliente: unknown; dados: DadosComunidade } | null = null

/** A instância de dados da página: a mesma durante toda a vida dela. */
export function criarDadosComunidade(): DadosComunidade {
  const cliente = obterCliente()
  if (modoDados() === 'supabase' && cliente) {
    if (!noBanco || noBanco.cliente !== cliente) noBanco = { cliente, dados: criarDadosComunidadeSupabase(cliente) }
    return noBanco.dados
  }
  if (!emMemoria) {
    const estado = criarEstadoComunidade(fixtureComunidadeDemonstracao)
    emMemoria = criarDadosComunidadeMemoria(estado, () => {
      if (contaDaPagina && !estado.contas.includes(contaDaPagina)) estado.contas.push(contaDaPagina)
      return contaDaPagina
    })
  }
  return emMemoria
}

/** O contexto de dados: os testes injetam a memória; sem ele, vale a instância da página. */
export const ContextoDadosComunidade = createContext<DadosComunidade | null>(null)

export function ProvedorDadosComunidade({ dados, children }: { dados?: DadosComunidade; children: ReactNode }) {
  return createElement(ContextoDadosComunidade, { value: dados ?? criarDadosComunidade() }, children)
}

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** `DD/MM/AAAA HH:MM` no locale `pt-BR` e no fuso do navegador (por exemplo `05/11/2026 14:30`). */
export function formatarDataHora(instante: string | number | Date): string {
  const data = new Date(instante)
  if (Number.isNaN(data.getTime())) return ''
  const partes = FORMATO_DATA.formatToParts(data)
  const pega = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? ''
  return `${pega('day')}/${pega('month')}/${pega('year')} ${pega('hour')}:${pega('minute')}`
}
