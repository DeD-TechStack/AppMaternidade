import type { SupabaseClient } from '@supabase/supabase-js'

// O cliente único do Supabase. Só este arquivo chama `createClient` e só ele (e o aviso de
// demonstração da MAT-48a) lê as duas variáveis do banco. Se qualquer uma faltar ou vier vazia,
// não há cliente e o site fica em modo memória. As variáveis são lidas a cada chamada, e não na
// carga do módulo, para o teste poder trocá-las por caso.
//
// O pacote `@supabase/supabase-js` só é carregado por um `import()` dinâmico, na primeira vez que
// `obterCliente()` precisa criar o cliente: o modo memória e as páginas que não leem o banco não o baixam.

interface Credenciais {
  url: string
  chave: string
}

function lerCredenciais(): Credenciais | null {
  // Valor só com espaços é valor ausente: `createClient` lançaria com uma URL assim.
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
  const chave = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  if (!url || !chave) return null
  return { url, chave }
}

/** Há banco quando as duas variáveis têm valor não vazio. É o mesmo critério do aviso. */
export function bancoConfigurado(): boolean {
  return lerCredenciais() !== null
}

/**
 * A identidade síncrona do par de variáveis (`null` sem banco). Quem guarda uma instância por cliente
 * (as fábricas de dados) usa esta chave, porque o cliente em si só existe depois do `import()`.
 */
export function chaveDoBanco(): string | null {
  const credenciais = lerCredenciais()
  return credenciais ? `${credenciais.url}\n${credenciais.chave}` : null
}

let guardado: { url: string; chave: string; cliente: Promise<SupabaseClient> } | null = null

/** No máximo um cliente por página: o mesmo par de variáveis devolve sempre a mesma instância. */
export function obterCliente(): Promise<SupabaseClient | null> {
  const credenciais = lerCredenciais()
  if (!credenciais) return Promise.resolve(null)
  if (guardado && guardado.url === credenciais.url && guardado.chave === credenciais.chave) {
    return guardado.cliente
  }
  const cliente = import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(credenciais.url, credenciais.chave, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    }),
  )
  const atual = { ...credenciais, cliente }
  guardado = atual
  // Se o pacote não carregar (rede), a próxima chamada tenta de novo em vez de guardar a falha.
  cliente.catch(() => {
    if (guardado === atual) guardado = null
  })
  return cliente
}
