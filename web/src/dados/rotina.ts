import { chaveDoBanco } from './cliente.ts'
import { dadosSobDemanda, modoDados } from './comum.ts'
import type { DadosConta } from './conta.ts'
import { criarFixtureRotinaDemonstracao } from './rotina.demonstracao.ts'
import { criarDadosRotinaMemoria } from './rotina.memoria.ts'
import { OPERACOES_ROTINA, type DadosRotina } from './rotina.tipos.ts'

export * from './rotina.tipos.ts'

// O ponto M1 da MAT-41: o único lugar que escolhe a implementação da rotina. Uma instância por conta de
// dados e por modo: a mesma durante toda a vida da página.
const instancias = new WeakMap<DadosConta, { chave: string | null; dados: DadosRotina }>()

/**
 * No modo Supabase é a implementação do banco (baixada na primeira operação, junto com o pacote do
 * Supabase); no modo memória, a cópia em memória com a fixture de demonstração (os registros vivem só na
 * página aberta).
 */
export function criarDadosRotina(dadosConta: DadosConta): DadosRotina {
  const chaveAtual = chaveDoBanco()
  const noBanco = modoDados() === 'supabase' && chaveAtual !== null
  const chave = noBanco ? chaveAtual : null
  const guardada = instancias.get(dadosConta)
  if (guardada && guardada.chave === chave) return guardada.dados
  const dados = noBanco
    ? dadosSobDemanda<DadosRotina>(OPERACOES_ROTINA, async (cliente) =>
        (await import('./rotina.supabase.ts')).criarDadosRotinaSupabase(cliente, dadosConta),
      )
    : criarDadosRotinaMemoria(dadosConta, criarFixtureRotinaDemonstracao(Date.now()))
  instancias.set(dadosConta, { chave, dados })
  return dados
}
