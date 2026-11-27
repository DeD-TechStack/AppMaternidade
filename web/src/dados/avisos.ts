import { createContext } from 'react'
import { chaveDoBanco } from './cliente.ts'
import type { ErroDados, Resultado } from './comum.ts'
import { dadosLocaisSobDemanda, dadosSobDemanda, modoDados } from './comum.ts'
import { rotinaRegistrada } from './fontes.ts'
import { classificarErroConta } from './conta.erros.ts'
import type { DadosConta } from './conta.ts'

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

/** O PostgREST não encontrou o RPC de Avisos no cache de esquema. Não é sessão, rede ou lista vazia. */
export function faltaRpcDeAvisos(erro: ErroDados | null): boolean {
  return erro?.codigo === 'PGRST202'
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
const instancias = new WeakMap<DadosConta, { chave: string | null; dados: DadosAvisos }>()

const OPERACOES_AVISOS: readonly (keyof DadosAvisos)[] = ['lerEstado', 'definirLigados', 'marcarVistos']

/**
 * No modo Supabase é o adaptador do banco (baixado na primeira operação, junto com o pacote do Supabase);
 * no modo memória, a composição da conta e da rotina em memória (as mesmas instâncias que a página usa),
 * com o relógio da memória.
 */
export function criarDadosAvisos(dadosConta: DadosConta): DadosAvisos {
  const chaveAtual = chaveDoBanco()
  const noBanco = modoDados() === 'supabase' && chaveAtual !== null
  const chave = noBanco ? chaveAtual : null
  const guardada = instancias.get(dadosConta)
  if (guardada && guardada.chave === chave) return guardada.dados
  // No modo memória a rotina já registrada na conta é lida, nunca refeita: uma segunda trocaria a fonte de exportação.
  // A conta da página chega embrulhada pelo provedor de sessão; a exportação em memória lê da instância de
  // dentro, a de `criarDadosConta()`. Por isso a fonte dos avisos se registra nas duas.
  // Na memória os avisos também chegam sob demanda: o motor só é baixado na primeira leitura, e a rotina é escolhida
  // nessa hora (a já registrada, ou a da página), nunca ao abrir uma página pública.
  const dados = noBanco
    ? dadosSobDemanda<DadosAvisos>(OPERACOES_AVISOS, async (cliente) =>
        (await import('./avisos.supabase.ts')).criarDadosAvisosSupabase(cliente),
      )
    : dadosLocaisSobDemanda<DadosAvisos>(OPERACOES_AVISOS, async () => {
        // A rotina da página (o motor em memória) também só chega agora: `rotina.ts` não entra no pacote de entrada.
        const rotina = rotinaRegistrada(dadosConta) ?? (await import('./rotina.ts')).criarDadosRotina(dadosConta)
        return (await import('./avisos.memoria.pagina.ts')).criarAvisosMemoriaDaPagina(dadosConta, rotina)
      }).dados
  instancias.set(dadosConta, { chave, dados })
  return dados
}

/** O contexto de dados: os testes injetam os dados; sem ele, o gancho usa `criarDadosAvisos(conta)`. */
export const ContextoDadosAvisos = createContext<DadosAvisos | null>(null)
