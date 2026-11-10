// As duas variáveis do banco existem? São lidas a cada chamada, e não na carga do módulo, para o
// teste poder trocá-las por caso. Sem elas o site roda como demonstração (aviso na tela).
export function temBanco(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)
}
