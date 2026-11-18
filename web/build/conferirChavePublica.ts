import type { Plugin } from 'vite'

// O build embute VITE_SUPABASE_ANON_KEY no JavaScript público do site. Só a chave pública
// (publishable ou JWT com role anon) pode ir para lá; uma chave secreta ou service_role dá
// acesso total ao banco. Vazia é o modo demonstração. O resto, inclusive o que não se
// reconhece, para o build. O erro nomeia a variável e nunca mostra o valor.

const NOME = 'VITE_SUPABASE_ANON_KEY'

function recusar(motivo: string): never {
  throw new Error(`${NOME} ${motivo}. Use a chave publishable (sb_publishable_...) ou a anon do projeto.`)
}

function roleDoJwt(chave: string): unknown {
  const partes = chave.split('.')
  if (partes.length !== 3) return undefined
  try {
    const payload: unknown = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'))
    return payload && typeof payload === 'object' ? (payload as { role?: unknown }).role : undefined
  } catch {
    return undefined
  }
}

export function conferirChavePublica(valor: string | undefined): void {
  const chave = (valor ?? '').trim()
  if (chave === '') return
  if (chave.startsWith('sb_secret_')) recusar('traz uma chave secreta (sb_secret_)')
  if (chave.startsWith('sb_publishable_')) return
  const role = roleDoJwt(chave)
  if (role === 'anon') return
  if (role === undefined) recusar('não é uma chave do Supabase reconhecida')
  recusar('traz um JWT cuja role não é anon')
}

/** Para o `vite build` quando a chave do ambiente não é a pública. O servidor de desenvolvimento fica intocado. */
export function chavePublica(): Plugin {
  return {
    name: 'chave-publica',
    apply: 'build',
    configResolved(config) {
      conferirChavePublica(config.env[NOME])
    },
  }
}
