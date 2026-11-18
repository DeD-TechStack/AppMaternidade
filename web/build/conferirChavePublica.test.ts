import { describe, expect, it } from 'vitest'
import { conferirChavePublica } from './conferirChavePublica.ts'

// Chaves sintéticas: montadas aqui, nenhuma vem de um projeto real.
function base64url(texto: string): string {
  return Buffer.from(texto, 'utf8').toString('base64url')
}

function jwtSintetico(payload: Record<string, unknown>): string {
  return `${base64url('{"alg":"HS256","typ":"JWT"}')}.${base64url(JSON.stringify(payload))}.assinatura-sintetica`
}

function mensagemDoErro(valor: string): string {
  try {
    conferirChavePublica(valor)
  } catch (erro) {
    return (erro as Error).message
  }
  throw new Error('conferirChavePublica deveria ter lançado')
}

describe('conferirChavePublica', () => {
  it('recusa um JWT com role service_role', () => {
    expect(() => conferirChavePublica(jwtSintetico({ role: 'service_role' }))).toThrow(/VITE_SUPABASE_ANON_KEY/)
  })

  it('recusa uma chave com o prefixo sb_secret_', () => {
    expect(() => conferirChavePublica('sb_secret_sintetica0123456789')).toThrow(/VITE_SUPABASE_ANON_KEY/)
  })

  it('aceita um JWT com role anon', () => {
    expect(() => conferirChavePublica(jwtSintetico({ role: 'anon' }))).not.toThrow()
  })

  it('aceita uma chave com o prefixo sb_publishable_', () => {
    expect(() => conferirChavePublica('sb_publishable_sintetica0123456789')).not.toThrow()
  })

  it('aceita a chave vazia ou ausente (modo demonstração)', () => {
    expect(() => conferirChavePublica('')).not.toThrow()
    expect(() => conferirChavePublica('   ')).not.toThrow()
    expect(() => conferirChavePublica(undefined)).not.toThrow()
  })

  it('recusa por padrão o que não reconhece: JWT sem role, JWT ilegível e formato estranho', () => {
    expect(() => conferirChavePublica(jwtSintetico({ iss: 'supabase' }))).toThrow(/VITE_SUPABASE_ANON_KEY/)
    expect(() => conferirChavePublica('aaa.###.bbb')).toThrow(/VITE_SUPABASE_ANON_KEY/)
    expect(() => conferirChavePublica('chave-qualquer-sintetica')).toThrow(/VITE_SUPABASE_ANON_KEY/)
  })

  it('nomeia a variável e nunca mostra o valor no erro', () => {
    const segredo = 'sb_secret_valorSinteticoQueNaoPodeVazar'
    const jwt = jwtSintetico({ role: 'service_role' })
    for (const valor of [segredo, jwt]) {
      const mensagem = mensagemDoErro(valor)
      expect(mensagem).toContain('VITE_SUPABASE_ANON_KEY')
      expect(mensagem).not.toContain(valor)
      expect(mensagem).not.toContain('valorSinteticoQueNaoPodeVazar')
      for (const parte of jwt.split('.')) expect(mensagem).not.toContain(parte)
    }
  })
})
