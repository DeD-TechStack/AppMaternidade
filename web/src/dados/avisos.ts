import { createContext } from 'react'
import { obterCliente } from './cliente.ts'
import type { ErroDados, Resultado } from './comum.ts'
import { modoDados } from './comum.ts'
import { classificarErroConta } from './conta.erros.ts'
import { criarDadosConta, type DadosConta } from './conta.ts'
import { criarDadosAvisosMemoria } from './avisos.memoria.ts'
import { criarDadosAvisosSupabase } from './avisos.supabase.ts'
import { criarDadosRotina } from './rotina.ts'

// Os avisos entre cuidadores (RF14): os tipos que a tela vê e a interface de dados. Cada operação é
// assíncrona e devolve `Resultado`: nenhuma lança. Os instantes são texto ISO 8601 em UTC, como o banco os
// devolve, e voltam ao banco sem mudar (o "marcar como visto" manda de volta o `criadaEm` do aviso mais novo).

// A regra de erro dos avisos (RF14:RN-06): nenhum erro devolvido carrega a mensagem de origem (o texto do
// Postgres, da rede ou de uma dependência), porque ela pode trazer texto de nota ou nome. A classificação
// (`classe`, `chave`, `codigo`) fica. Todo caminho de falha dos três arquivos de avisos passa por aqui.

const semMensagem = (erro: ErroDados): ErroDados => ({ ...erro, mensagemOriginal: '' })

/** Classifica qualquer valor lançado ou devolvido como erro e tira a mensagem de origem. */
export function erroSemMensagem(origem: unknown): ErroDados {
  return semMensagem(classificarErroConta(origem))
}

/** O mesmo resultado; se for falha, sem a mensagem de origem. */
export function resultadoSemMensagem<T>(resultado: Resultado<T>): Resultado<T> {
  return resultado.ok ? resultado : { ok: false, erro: semMensagem(resultado.erro) }
}

/** Quem escreveu a nota, pela regra de autor da rotina: com vínculo ativo, só o nome é dito. */
export type AutorDoAviso = { tipo: 'nome'; nome: string } | { tipo: 'removido' } | { tipo: 'saiu' }

export interface Aviso {
  /** O id da nota. */
  id: string
  /** O texto da nota, inteiro, como foi gravado. */
  texto: string
  /** O instante de criação, como o banco devolveu (microssegundos no modo Supabase). */
  criadaEm: string
  /** Até quando a nota fica em destaque; `null` sem destaque. */
  destaqueAte: string | null
  autor: AutorDoAviso
  familiaNome: string
  /** O fuso de referência da família (IANA). */
  familiaFuso: string
}

/** O que uma leitura traz: a preferência, no máximo 50 avisos (do mais novo) e se havia mais que isso. */
export interface EstadoDosAvisos {
  ligados: boolean
  avisos: Aviso[]
  maisDe50: boolean
}

export interface DadosAvisos {
  /** A preferência e os avisos da conta atual, numa só chamada. Desligado: zero avisos. */
  lerEstado(): Promise<Resultado<EstadoDosAvisos>>
  definirLigados(ligados: boolean): Promise<Resultado<null>>
  /** Marca como visto até esse instante (o `criadaEm` do aviso mais novo da lista, sem mudar). */
  marcarVistos(ate: string): Promise<Resultado<null>>
}

// Uma instância por conta de dados e por modo: a mesma durante toda a vida da página.
const instancias = new WeakMap<DadosConta, { cliente: unknown; dados: DadosAvisos }>()

/**
 * No modo Supabase é o adaptador do banco; no modo memória, a composição da conta e da rotina em memória
 * (as mesmas instâncias que a página usa), com o relógio da memória.
 */
export function criarDadosAvisos(dadosConta: DadosConta): DadosAvisos {
  const cliente = obterCliente()
  const noBanco = modoDados() === 'supabase' && cliente !== null
  const chave = noBanco ? cliente : null
  const guardada = instancias.get(dadosConta)
  if (guardada && guardada.cliente === chave) return guardada.dados
  // A conta da página chega embrulhada pelo provedor de sessão; a exportação em memória lê da instância de
  // dentro, a de `criarDadosConta()`. Por isso a fonte dos avisos se registra nas duas.
  const dados = noBanco
    ? criarDadosAvisosSupabase(cliente)
    : criarDadosAvisosMemoria(dadosConta, criarDadosRotina(dadosConta), { registrarTambemEm: [criarDadosConta()] })
  instancias.set(dadosConta, { cliente: chave, dados })
  return dados
}

/** O contexto de dados: os testes injetam os dados; sem ele, o gancho usa `criarDadosAvisos(conta)`. */
export const ContextoDadosAvisos = createContext<DadosAvisos | null>(null)
