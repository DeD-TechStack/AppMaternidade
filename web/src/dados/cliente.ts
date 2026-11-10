import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// O cliente único do Supabase. Só este arquivo chama `createClient` e só ele (e o aviso de
// demonstração da MAT-48a) lê as duas variáveis do banco. Se qualquer uma faltar ou vier vazia,
// não há cliente e o site fica em modo memória. As variáveis são lidas a cada chamada, e não na
// carga do módulo, para o teste poder trocá-las por caso.

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

let guardado: { url: string; chave: string; cliente: SupabaseClient } | null = null

/** No máximo um cliente por página: o mesmo par de variáveis devolve sempre a mesma instância. */
export function obterCliente(): SupabaseClient | null {
  const credenciais = lerCredenciais()
  if (!credenciais) return null
  if (guardado && guardado.url === credenciais.url && guardado.chave === credenciais.chave) {
    return guardado.cliente
  }
  const cliente = createClient(credenciais.url, credenciais.chave, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  guardado = { ...credenciais, cliente }
  return cliente
}
