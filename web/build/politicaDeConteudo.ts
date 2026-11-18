import type { Plugin } from 'vite'

// O GitHub Pages não manda cabeçalhos, então a Content-Security-Policy vai numa meta do
// index.html (e do 404.html, que é cópia dele). Scripts e estilos só do próprio site; a
// rede só para o próprio site e a origem do Supabase do build. `frame-ancestors` fica de
// fora porque o navegador a ignora numa meta (e avisa no console).

function origemDoSupabase(url: string | undefined): string | null {
  const valor = (url ?? '').trim()
  if (valor === '') return null
  let analisada: URL
  try {
    analisada = new URL(valor)
  } catch {
    throw new Error('VITE_SUPABASE_URL não é uma URL válida.')
  }
  if (analisada.protocol !== 'https:' && analisada.protocol !== 'http:') {
    throw new Error('VITE_SUPABASE_URL precisa usar https (ou http num Supabase local).')
  }
  return analisada.origin
}

export function montarCsp(urlSupabase?: string): string {
  const origem = origemDoSupabase(urlSupabase)
  const conexao = ["'self'"]
  if (origem) conexao.push(origem, origem.replace(/^http/, 'ws'))
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${conexao.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

/** Injeta a CSP e `referrer: no-referrer` no HTML do build; o servidor de desenvolvimento fica intocado. */
export function politicaDeConteudo(): Plugin {
  let csp = montarCsp()
  return {
    name: 'politica-de-conteudo',
    apply: 'build',
    configResolved(config) {
      csp = montarCsp(config.env.VITE_SUPABASE_URL)
    },
    transformIndexHtml() {
      return [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
        { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
      ]
    },
  }
}
