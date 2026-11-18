import { describe, expect, it } from 'vitest'
import type { HtmlTagDescriptor, IndexHtmlTransformHook, Plugin, ResolvedConfig } from 'vite'
import { montarCsp, politicaDeConteudo } from './politicaDeConteudo.ts'

function diretivas(csp: string): Map<string, string> {
  const mapa = new Map<string, string>()
  for (const parte of csp.split(';')) {
    const [nome, ...valores] = parte.trim().split(/\s+/)
    if (nome) mapa.set(nome, valores.join(' '))
  }
  return mapa
}

describe('montarCsp', () => {
  it('com a URL do Supabase, só libera a origem dele (https e wss) além do próprio site', () => {
    const csp = montarCsp('https://abc.supabase.co')
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("connect-src 'self' https://abc.supabase.co wss://abc.supabase.co")
    expect(csp).toContain("img-src 'self' data:")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
  })

  it('sem URL, connect-src fica só no próprio site', () => {
    expect(diretivas(montarCsp()).get('connect-src')).toBe("'self'")
    expect(diretivas(montarCsp('')).get('connect-src')).toBe("'self'")
    expect(diretivas(montarCsp('   ')).get('connect-src')).toBe("'self'")
  })

  it('reduz a URL à origem e usa ws para um Supabase local em http', () => {
    expect(diretivas(montarCsp('https://abc.supabase.co/rest/v1/')).get('connect-src')).toBe(
      "'self' https://abc.supabase.co wss://abc.supabase.co",
    )
    expect(diretivas(montarCsp('http://127.0.0.1:54321')).get('connect-src')).toBe(
      "'self' http://127.0.0.1:54321 ws://127.0.0.1:54321",
    )
  })

  it('scripts só do próprio site, sem inline nem eval', () => {
    const mapa = diretivas(montarCsp('https://abc.supabase.co'))
    expect(mapa.get('script-src')).toBe("'self'")
    expect(montarCsp('https://abc.supabase.co')).not.toMatch(/'unsafe-eval'|'unsafe-inline'/)
  })

  it('não leva diretiva que o navegador ignora numa meta (frame-ancestors)', () => {
    expect(montarCsp('https://abc.supabase.co')).not.toContain('frame-ancestors')
  })

  it('recusa uma URL que não é http(s), em vez de abrir a política', () => {
    expect(() => montarCsp('abc.supabase.co')).toThrow(/VITE_SUPABASE_URL/)
    expect(() => montarCsp('javascript:alert(1)')).toThrow(/VITE_SUPABASE_URL/)
  })
})

function transformar(plugin: Plugin): IndexHtmlTransformHook {
  const gancho = plugin.transformIndexHtml
  if (typeof gancho === 'function') return gancho
  if (gancho && typeof gancho === 'object') return 'handler' in gancho ? gancho.handler : gancho.transform
  throw new Error('o plugin não tem transformIndexHtml')
}

function resolverCom(plugin: Plugin, env: Record<string, string>): void {
  const gancho = plugin.configResolved
  const funcao = typeof gancho === 'function' ? gancho : gancho?.handler
  if (!funcao) throw new Error('o plugin não tem configResolved')
  funcao.call({} as never, { env } as unknown as ResolvedConfig)
}

describe('plugin politicaDeConteudo', () => {
  it('só vale no build: o servidor de desenvolvimento fica intocado', () => {
    expect(politicaDeConteudo().apply).toBe('build')
  })

  it('injeta a meta da CSP e a meta referrer no-referrer no index.html', async () => {
    const plugin = politicaDeConteudo()
    resolverCom(plugin, { VITE_SUPABASE_URL: 'https://abc.supabase.co' })
    const html = '<!doctype html><html><head><title>x</title></head><body></body></html>'
    const saida = await transformar(plugin).call({} as never, html, { path: '/index.html', filename: 'index.html' })
    const tags = (Array.isArray(saida) ? saida : (saida as { tags: HtmlTagDescriptor[] }).tags) as HtmlTagDescriptor[]
    const csp = tags.find((tag) => tag.tag === 'meta' && tag.attrs?.['http-equiv'] === 'Content-Security-Policy')
    expect(csp?.attrs?.content).toBe(montarCsp('https://abc.supabase.co'))
    expect(csp?.injectTo).toBe('head-prepend')
    const referrer = tags.find((tag) => tag.tag === 'meta' && tag.attrs?.name === 'referrer')
    expect(referrer?.attrs?.content).toBe('no-referrer')
  })

  it('sem VITE_SUPABASE_URL, a meta injetada fecha connect-src no próprio site', async () => {
    const plugin = politicaDeConteudo()
    resolverCom(plugin, {})
    const saida = await transformar(plugin).call({} as never, '<html><head></head></html>', {
      path: '/index.html',
      filename: 'index.html',
    })
    const tags = (Array.isArray(saida) ? saida : (saida as { tags: HtmlTagDescriptor[] }).tags) as HtmlTagDescriptor[]
    const csp = tags.find((tag) => tag.attrs?.['http-equiv'] === 'Content-Security-Policy')
    expect(diretivas(String(csp?.attrs?.content)).get('connect-src')).toBe("'self'")
  })
})
