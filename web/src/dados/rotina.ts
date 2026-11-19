import { chaveDoBanco } from './cliente.ts'
import { dadosLocaisSobDemanda, dadosSobDemanda, modoDados } from './comum.ts'
import { registrarCarregadorDaFonte } from './fontes.ts'
import type { DadosConta } from './conta.ts'
import { OPERACOES_ROTINA, type DadosRotina } from './rotina.tipos.ts'

export * from './rotina.tipos.ts'

// O ponto M1 da MAT-41: o único lugar que escolhe a implementação da rotina. Uma instância por conta de
// dados e por modo: a mesma durante toda a vida da página.
const instancias = new WeakMap<DadosConta, { chave: string | null; dados: DadosRotina }>()
// O carregador do motor em memória de cada conta: quem precisa da rotina sem chamar uma operação (a exportação da conta).
const carregadores = new WeakMap<DadosConta, () => Promise<unknown>>()

/**
 * Baixa e monta o motor da rotina em memória desta conta (a mesma instância que a página usa). No modo Supabase não há
 * nada a carregar. É o que o provedor de sessão chama, por `import()`, quando a exportação ou a exclusão da conta em
 * memória precisam da fonte da rotina: assim `sessao.tsx` não importa este arquivo no pacote de entrada.
 */
export async function carregarRotinaEmMemoria(dadosConta: DadosConta): Promise<void> {
  criarDadosRotina(dadosConta)
  await carregadores.get(dadosConta)?.()
}

/**
 * No modo Supabase é a implementação do banco (baixada na primeira operação, junto com o pacote do
 * Supabase); no modo memória, a cópia em memória com a fixture de demonstração (os registros vivem só na
 * página aberta). Nos dois modos esta função só cria o objeto sob demanda: o motor da memória (e a fixture) só é
 * baixado na primeira operação, ou quando a exportação ou a exclusão da conta pedem a fonte da rotina
 * (`registrarCarregadorDaFonte`), e nunca ao abrir uma página pública.
 */
export function criarDadosRotina(dadosConta: DadosConta): DadosRotina {
  const chaveAtual = chaveDoBanco()
  const noBanco = modoDados() === 'supabase' && chaveAtual !== null
  const chave = noBanco ? chaveAtual : null
  const guardada = instancias.get(dadosConta)
  if (guardada && guardada.chave === chave) return guardada.dados
  let dados: DadosRotina
  if (noBanco) {
    dados = dadosSobDemanda<DadosRotina>(OPERACOES_ROTINA, async (cliente) =>
      (await import('./rotina.supabase.ts')).criarDadosRotinaSupabase(cliente, dadosConta),
    )
  } else {
    const local = dadosLocaisSobDemanda<DadosRotina>(OPERACOES_ROTINA, async () =>
      (await import('./rotina.memoria.pagina.ts')).criarRotinaMemoriaDaPagina(dadosConta),
    )
    // A exportação e a exclusão da conta em memória esperam esta carga para levar a rotina junto.
    registrarCarregadorDaFonte(dadosConta, local.carregar)
    carregadores.set(dadosConta, local.carregar)
    dados = local.dados
  }
  instancias.set(dadosConta, { chave, dados })
  return dados
}
