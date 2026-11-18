// RED proof for CODE-Q finding CFG-1: two different "is the database configured" criteria.
// cliente.ts bancoConfigurado() trims (blank value = absent => memory/demo mode);
// prototipo/banco.ts temBanco() does not trim => with a whitespace-only value the data layer runs in
// DEMO (memory) mode while the demo warning banner is hidden.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bancoConfigurado } from '../dados/cliente.ts'
import { modoDados } from '../dados/comum.ts'
import { temBanco } from './banco.ts'

afterEach(() => vi.unstubAllEnvs())

describe('as duas leituras de "há banco" concordam', () => {
  for (const [url, chave] of [['   ', 'k'], ['https://x.supabase.co', '  '], ['\n', '\n']] as const) {
    it(`URL=${JSON.stringify(url)} CHAVE=${JSON.stringify(chave)}`, () => {
      vi.stubEnv('VITE_SUPABASE_URL', url)
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', chave)
      expect(modoDados()).toBe('memoria') // the data layer is in demo mode...
      expect(bancoConfigurado()).toBe(false)
      expect(temBanco()).toBe(false) // ...so the demo warning must be shown (temBanco false => aviso aparece)
    })
  }
})
