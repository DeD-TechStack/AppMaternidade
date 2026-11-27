import type { SupabaseClient } from '@supabase/supabase-js'
import { bancoConfigurado, obterCliente } from './cliente.ts'
import { classificarErro, ehRepetivel, type ModoDados, type Resultado } from './comum.puro.ts'

export { ehRepetivel }
export { classificarErro, dataNoFuso, ehErroDados, fusoValido, lerOrigemDoErro } from './comum.puro.ts'
export type { ClasseErro, ErroDados, ModoDados, Papel, Resultado } from './comum.puro.ts'

export function modoDados(): ModoDados {
  return bancoConfigurado() ? 'supabase' : 'memoria'
}

/** Cada operação espera `carregar()` e delega ao alvo; falha ao carregar vira `Resultado` de erro, nunca exceção. */
function operacoesSobDemanda<T extends object>(
  operacoes: readonly (keyof T & string)[],
  carregar: () => Promise<T>,
): Record<string, unknown> {
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
  return objeto
}

/**
 * A implementação do banco montada na primeira chamada. As fábricas de dados seguem síncronas: no modo Supabase
 * devolvem este objeto, cuja operação espera o cliente (e o `import()` do adaptador `*.supabase.ts`) e só então
 * delega. Assim o pacote do Supabase e os adaptadores ficam fora do pacote de entrada. Uma falha ao carregar
 * (rede) volta como `Resultado` de erro, sem lançar, e a próxima chamada tenta de novo.
 *
 * `aMedida` troca operações que não são assíncronas por um equivalente síncrono (`aoMudarSessao`), ou muda uma
 * operação gerada (recebe o objeto gerado, `base`, para poder delegar a ele).
 */
export function dadosSobDemanda<T extends object>(
  operacoes: readonly (keyof T & string)[],
  montar: (cliente: SupabaseClient) => Promise<T>,
  aMedida?: (carregar: () => Promise<T>, base: T) => Partial<T>,
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
  const objeto = operacoesSobDemanda(operacoes, carregar)
  // `base` é uma cópia do objeto gerado: o que `aMedida` devolve entra em `objeto` sem que a delegação se perca.
  const base = { ...objeto } as T
  return Object.assign(objeto, aMedida?.(carregar, base)) as T
}

/**
 * O mesmo desenho de `dadosSobDemanda`, sem Supabase: o motor local (a memória) só é baixado e montado na primeira
 * operação. `montar` roda uma vez (e de novo depois de uma falha); `aoCarregar` recebe os dados prontos. Uma falha
 * ao carregar volta como `Resultado` de erro, sem lançar. `carregar` serve a quem precisa do motor sem chamar uma
 * operação (a exportação da conta); `pedido()` diz se a carga já foi pedida (e não falhou), sem pedi-la.
 */
export function dadosLocaisSobDemanda<T extends object>(
  operacoes: readonly (keyof T & string)[],
  montar: () => Promise<T>,
  aoCarregar?: (dados: T) => void,
): { dados: T; carregar: () => Promise<T>; pedido: () => boolean } {
  let pronto: Promise<T> | null = null
  const carregar = (): Promise<T> => {
    pronto ??= montar()
      .then((dados) => {
        aoCarregar?.(dados)
        return dados
      })
      .catch((erro: unknown) => {
        pronto = null
        throw erro
      })
    return pronto
  }
  return { dados: operacoesSobDemanda(operacoes, carregar) as T, carregar, pedido: () => pronto !== null }
}
