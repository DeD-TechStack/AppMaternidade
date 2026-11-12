import { obterCliente } from './cliente.ts'
import { modoDados } from './comum.ts'
import type { DadosConta } from './conta.ts'
import { criarFixtureRotinaDemonstracao } from './rotina.demonstracao.ts'
import { criarDadosRotinaMemoria } from './rotina.memoria.ts'
import { criarDadosRotinaSupabase } from './rotina.supabase.ts'
import type { DadosRotina } from './rotina.tipos.ts'

export * from './rotina.tipos.ts'

// O ponto M1 da MAT-41: o único lugar que escolhe a implementação da rotina. Uma instância por conta de
// dados e por modo: a mesma durante toda a vida da página.
const instancias = new WeakMap<DadosConta, { cliente: unknown; dados: DadosRotina }>()

/**
 * No modo Supabase é a implementação do banco; no modo memória, a cópia em memória com a fixture de
 * demonstração (os registros vivem só na página aberta).
 */
export function criarDadosRotina(dadosConta: DadosConta): DadosRotina {
  const cliente = obterCliente()
  const noBanco = modoDados() === 'supabase' && cliente !== null
  const chave = noBanco ? cliente : null
  const guardada = instancias.get(dadosConta)
  if (guardada && guardada.cliente === chave) return guardada.dados
  const dados = noBanco
    ? criarDadosRotinaSupabase(cliente, dadosConta)
    : criarDadosRotinaMemoria(dadosConta, criarFixtureRotinaDemonstracao(Date.now()))
  instancias.set(dadosConta, { cliente: chave, dados })
  return dados
}
