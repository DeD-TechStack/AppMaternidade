import type { SupabaseClient } from '@supabase/supabase-js'
import { bancoConfigurado, obterCliente } from './cliente.ts'

// O contrato comum da camada de dados: o modo, os erros, o resultado e o papel. Nenhuma função de
// dados lança exceção para a tela: todo erro volta como `Resultado` com `ok: false`.

export type ModoDados = 'supabase' | 'memoria'

export function modoDados(): ModoDados {
  return bancoConfigurado() ? 'supabase' : 'memoria'
}

export type Papel = 'responsavel' | 'cuidador' | 'observador'

export type ClasseErro =
  | 'rede'
  | 'nao_encontrado'
  | 'sem_permissao'
  | 'tente_de_novo'
  | 'negocio'
  | 'sessao_encerrada'
  | 'desconhecido'

export interface ErroDados {
  classe: ClasseErro
  /** O nome da linha do catálogo, por exemplo `convite_vencido`. */
  chave: string
  /** O código do Postgres ou do Auth; `rede` quando a chamada nem chegou ao servidor. */
  codigo: string
  mensagemOriginal: string
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: ErroDados }

// As classes de erro depois das quais o resultado de uma escrita é incerto: a resposta pode ter se
// perdido depois de o servidor gravar. A tela oferece "Tentar de novo" e o adaptador desconfia.
const CLASSES_REPETIVEIS: ReadonlySet<ClasseErro> = new Set(['rede', 'tente_de_novo', 'desconhecido'])

export const ehRepetivel = (classe: ClasseErro) => CLASSES_REPETIVEIS.has(classe)

export function ehErroDados(valor: unknown): valor is ErroDados {
  if (typeof valor !== 'object' || valor === null) return false
  const candidato = valor as Record<string, unknown>
  return (
    typeof candidato.classe === 'string' &&
    typeof candidato.chave === 'string' &&
    typeof candidato.codigo === 'string' &&
    typeof candidato.mensagemOriginal === 'string'
  )
}

interface OrigemLida {
  codigo: string
  mensagem: string
  status: number | null
  nome: string
}

/** Lê o que importa de um erro do Postgrest, do Auth, do `fetch` ou de um `Error` qualquer. */
export function lerOrigemDoErro(origem: unknown): OrigemLida {
  if (typeof origem === 'string') return { codigo: '', mensagem: origem, status: null, nome: '' }
  if (typeof origem !== 'object' || origem === null) return { codigo: '', mensagem: '', status: null, nome: '' }
  const bruto = origem as Record<string, unknown>
  const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '')
  const status = typeof bruto.status === 'number' ? bruto.status : null
  const nome = texto(bruto.name) || (origem instanceof Error ? origem.name : '')
  return { codigo: texto(bruto.code), mensagem: texto(bruto.message).trim(), status, nome }
}

const FALHA_DE_REDE = /failed to fetch|networkerror|network request failed|load failed|fetch failed|fetcherror|econnrefused/i

function ehFalhaDeRede(origem: unknown, lida: OrigemLida): boolean {
  if (lida.nome === 'AuthRetryableFetchError') return true
  if (lida.status === 0) return true
  if (origem instanceof TypeError) return true
  return FALHA_DE_REDE.test(lida.mensagem)
}

/**
 * A parte comum do catálogo: rede, `P0002`, `42501`, `40P01`, `23502`, `P0001` de parâmetro
 * obrigatório e de "tente de novo", e o desconhecido. As mensagens de negócio de cada área ficam
 * no arquivo da área, que chama esta função para o que não reconhece.
 */
export function classificarErro(origem: unknown): ErroDados {
  if (ehErroDados(origem)) return origem
  const lida = lerOrigemDoErro(origem)
  const montar = (classe: ClasseErro, chave: string): ErroDados => ({
    classe,
    chave,
    codigo: lida.codigo || (classe === 'rede' ? 'rede' : ''),
    mensagemOriginal: lida.mensagem,
  })

  if (ehFalhaDeRede(origem, lida)) return montar('rede', 'rede')
  if (lida.codigo === 'P0002') return montar('nao_encontrado', 'nao_encontrado')
  if (lida.codigo === '42501') return montar('sem_permissao', 'sem_permissao')
  if (lida.codigo === '40P01') return montar('tente_de_novo', 'tente_de_novo')
  if (lida.codigo === '23502') return montar('negocio', 'parametro_obrigatorio')
  if (lida.codigo === 'P0001' && lida.mensagem === 'parametro obrigatorio') {
    return montar('negocio', 'parametro_obrigatorio')
  }
  if (lida.codigo === 'P0001' && lida.mensagem === 'tente de novo') return montar('tente_de_novo', 'tente_de_novo')
  return montar('desconhecido', 'desconhecido')
}

/**
 * A implementação do banco montada na primeira chamada. As fábricas de dados seguem síncronas: no modo Supabase
 * devolvem este objeto, cuja operação espera o cliente (e o `import()` do adaptador `*.supabase.ts`) e só então
 * delega. Assim o pacote do Supabase e os adaptadores ficam fora do pacote de entrada. Uma falha ao carregar
 * (rede) volta como `Resultado` de erro, sem lançar, e a próxima chamada tenta de novo.
 *
 * `aMedida` troca operações que não são assíncronas por um equivalente síncrono (`aoMudarSessao`).
 */
export function dadosSobDemanda<T extends object>(
  operacoes: readonly (keyof T & string)[],
  montar: (cliente: SupabaseClient) => Promise<T>,
  aMedida?: (carregar: () => Promise<T>) => Partial<T>,
): T {
  let pronto: Promise<T> | null = null
  const carregar = (): Promise<T> => {
    pronto ??= obterCliente()
      .then((cliente) => {
        if (!cliente) throw new Error('sem banco configurado')
        return montar(cliente)
      })
      .catch((erro: unknown) => {
        pronto = null
        throw erro
      })
    return pronto
  }
  const objeto: Record<string, unknown> = {}
  for (const nome of operacoes) {
    objeto[nome] = async (...argumentos: unknown[]): Promise<Resultado<unknown>> => {
      let alvo: T
      try {
        alvo = await carregar()
      } catch (erro) {
        // Sem a mensagem de origem (o endereço do pacote que falhou): a classe basta, e os avisos (RF14:RN-06) a exigem.
        return { ok: false, erro: { ...classificarErro(erro), mensagemOriginal: '' } }
      }
      const operacao = (alvo as Record<string, unknown>)[nome] as (...a: unknown[]) => Promise<Resultado<unknown>>
      return operacao.apply(alvo, argumentos)
    }
  }
  return Object.assign(objeto, aMedida?.(carregar)) as T
}

/** Um fuso que o motor aceita (o conjunto da memória; o do banco é o `pg_timezone_names`). */
export function fusoValido(fuso: string): boolean {
  if (!fuso) return false
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: fuso })
    return true
  } catch {
    return false
  }
}

/** A data `AAAA-MM-DD` de um instante no fuso pedido. */
export function dataNoFuso(instante: number, fuso: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoValido(fuso) ? fuso : 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instante))
  const pega = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? ''
  return `${pega('year')}-${pega('month')}-${pega('day')}`
}
