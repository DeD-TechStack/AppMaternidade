import { resolve, sep } from 'node:path'
import { createElement } from 'react'
import { createClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { AvisoDemonstracao } from '../componentes/AvisoDemonstracao.tsx'
import { listarFontes } from '../teste/fontes.ts'
import { bancoConfigurado, obterCliente } from './cliente.ts'
import { modoDados, type ModoDados } from './comum.ts'
import { criarDadosConta } from './conta.ts'

// RF-01: um cliente só por página, criado só em `dados/cliente.ts`, e as variáveis lidas só nele
// (e no aviso de demonstração da MAT-48a, exceção nominal). Nenhum teste chama a rede: o `fetch`
// abaixo falha o teste se for chamado, e as variáveis se trocam com `vi.stubEnv`.

// O `createClient` verdadeiro, só que espionado: os casos de "sem banco" conferem que ele nem é chamado.
vi.mock('@supabase/supabase-js', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@supabase/supabase-js')>()
  return { ...original, createClient: vi.fn(original.createClient) }
})

// A pasta web/src: o teste mora em dados/, uma pasta abaixo.
const pastaSrc = `${resolve(import.meta.dirname, '..')}${sep}`
const fontes = listarFontes(pastaSrc)

const URL_FICTICIA = 'https://exemplo.invalid'
const CHAVE_FICTICIA = 'chave-ficticia'

afterEach(() => {
  vi.unstubAllEnvs()
})

function definirBanco(url: string, chave: string) {
  vi.stubEnv('VITE_SUPABASE_URL', url)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', chave)
}

function proibirARede() {
  const fetchProibido = vi.fn(() => {
    throw new Error('o teste chamou a rede')
  })
  vi.stubGlobal('fetch', fetchProibido)
  return fetchProibido
}

describe('RF-01: quem cria o cliente e quem lê as variáveis', () => {
  it('só dados/cliente.ts chama createClient', () => {
    const chamam = fontes.filter((f) => /\bcreateClient\s*\(/.test(f.texto)).map((f) => f.nome)
    expect(chamam).toEqual(['dados/cliente.ts'])
  })

  it('só dados/cliente.ts lê as variáveis do banco; o aviso de demonstração (prototipo/banco.ts, que o componentes/AvisoDemonstracao.tsx usa) delega a ele', () => {
    const leem = fontes.filter((f) => /VITE_SUPABASE_(URL|ANON_KEY)/.test(f.texto)).map((f) => f.nome)
    expect(leem.sort()).toEqual(['dados/cliente.ts'])
    // O componente do aviso não lê as variáveis: só chama `temBanco()`.
    const aviso = fontes.find((f) => f.nome === 'componentes/AvisoDemonstracao.tsx')!
    expect(aviso.texto).toMatch(/from '\.\.\/prototipo\/banco\.ts'/)
  })

  it('nenhum arquivo importa o pacote do Supabase como valor (só tipos); só dados/cliente.ts o carrega, por import() dinâmico', () => {
    const comoValor = fontes
      .filter((f) => /^import\s+(?!type\b)[^;]*from\s+'@supabase\/supabase-js'/m.test(f.texto))
      .map((f) => f.nome)
    // Os testes que trocam o pacote por um falso (`vi.mock`) o importam como valor para espiar `createClient`.
    expect(comoValor.filter((nome) => !nome.endsWith('.test.ts') && !nome.endsWith('.test.tsx'))).toEqual([])
    const dinamico = fontes.filter((f) => /\bimport\(\s*'@supabase\/supabase-js'\s*\)/.test(f.texto)).map((f) => f.nome)
    expect(dinamico.filter((nome) => !nome.endsWith('.test.ts') && !nome.endsWith('.test.tsx'))).toEqual(['dados/cliente.ts'])
  })
})

describe('RF-01: as quatro combinações das variáveis', () => {
  const casos: Array<[string, string, string, ModoDados]> = [
    ['as duas vazias', '', '', 'memoria'],
    ['só a URL', URL_FICTICIA, '', 'memoria'],
    ['só a chave', '', CHAVE_FICTICIA, 'memoria'],
    ['as duas preenchidas', URL_FICTICIA, CHAVE_FICTICIA, 'supabase'],
  ]

  for (const [nome, url, chave, modo] of casos) {
    it(`${nome}: modo ${modo}, cliente ${modo === 'supabase' ? 'criado' : 'ausente'} e aviso ${modo === 'memoria' ? 'visível' : 'oculto'}`, async () => {
      const fetchProibido = proibirARede()
      definirBanco(url, chave)

      expect(modoDados()).toBe(modo)
      expect(bancoConfigurado()).toBe(modo === 'supabase')
      expect((await obterCliente()) !== null).toBe(modo === 'supabase')

      // O aviso de demonstração usa o mesmo critério: aparece quando falta uma das variáveis.
      const { container } = render(createElement(AvisoDemonstracao))
      expect(container.querySelectorAll('[data-aviso="demonstracao"]')).toHaveLength(modo === 'memoria' ? 1 : 0)

      expect(fetchProibido).not.toHaveBeenCalled()
    })
  }

  it('sem variável nenhuma (o estado do Vitest), o modo é memória', async () => {
    expect(modoDados()).toBe('memoria')
    expect(await obterCliente()).toBeNull()
  })
})

describe('RF-01: variáveis ausentes, vazias ou só com espaços: sem banco e sem createClient', () => {
  const ausente = undefined
  const casos: Array<[string, string | undefined, string | undefined]> = [
    ['só a URL', URL_FICTICIA, ausente],
    ['só a chave', ausente, CHAVE_FICTICIA],
    ['as duas ausentes', ausente, ausente],
    ['as duas vazias', '', ''],
    ['URL só com espaços', '   ', CHAVE_FICTICIA],
    ['chave só com espaços', URL_FICTICIA, '\t \n'],
    ['as duas só com espaços', '  ', '  '],
    ['URL ausente e chave só com espaços', ausente, '  '],
  ]

  for (const [nome, url, chave] of casos) {
    it(`${nome}: bancoConfigurado é falso, obterCliente devolve null e createClient não é chamado`, async () => {
      const fetchProibido = proibirARede()
      vi.mocked(createClient).mockClear()
      vi.stubEnv('VITE_SUPABASE_URL', url)
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', chave)

      expect(bancoConfigurado()).toBe(false)
      expect(modoDados()).toBe('memoria')
      expect(await obterCliente()).toBeNull()
      expect(createClient).not.toHaveBeenCalled()
      expect(fetchProibido).not.toHaveBeenCalled()
    })
  }

  it('os espaços em volta de um valor com texto saem antes de criar o cliente', async () => {
    vi.mocked(createClient).mockClear()
    definirBanco('  https://com-espacos.invalid  ', '  chave-com-espacos  ')

    expect(bancoConfigurado()).toBe(true)
    expect(await obterCliente()).not.toBeNull()
    expect(vi.mocked(createClient).mock.calls[0].slice(0, 2)).toEqual(['https://com-espacos.invalid', 'chave-com-espacos'])
  })
})

describe('RF-01: a troca de variável no meio da página', () => {
  it('trocar a chave cria outro cliente, tirar uma variável tira o cliente e voltar ao par anterior devolve o dele', async () => {
    vi.mocked(createClient).mockClear()
    definirBanco('https://troca-a.invalid', 'chave-a')
    const a = await obterCliente()
    expect(a).not.toBeNull()

    definirBanco('https://troca-a.invalid', 'chave-b')
    const b = await obterCliente()
    expect(b).not.toBeNull()
    expect(b).not.toBe(a)

    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    expect(bancoConfigurado()).toBe(false)
    expect(await obterCliente()).toBeNull()

    definirBanco('https://troca-a.invalid', 'chave-b')
    expect(await obterCliente()).toBe(b)
    expect(createClient).toHaveBeenCalledTimes(2)
  })

  it('trocar só a URL também cria outro cliente', async () => {
    definirBanco('https://troca-c.invalid', 'chave-c')
    const c = await obterCliente()
    definirBanco('https://troca-d.invalid', 'chave-c')
    expect(await obterCliente()).not.toBe(c)
  })

  it('chamadas juntas, antes de o pacote chegar, dividem o mesmo cliente (um createClient só)', async () => {
    vi.mocked(createClient).mockClear()
    definirBanco('https://juntas.invalid', 'chave-juntas')
    const [um, dois] = await Promise.all([obterCliente(), obterCliente()])
    expect(um).not.toBeNull()
    expect(dois).toBe(um)
    expect(createClient).toHaveBeenCalledTimes(1)
  })
})

describe('RF-01: um cliente só por página', () => {
  it('o mesmo par de variáveis devolve sempre o mesmo cliente', async () => {
    const fetchProibido = proibirARede()
    definirBanco(URL_FICTICIA, CHAVE_FICTICIA)

    const primeiro = await obterCliente()
    expect(primeiro).not.toBeNull()
    expect(await obterCliente()).toBe(primeiro)
    expect(fetchProibido).not.toHaveBeenCalled()
  })

  it('o cliente guarda e renova a sessão e lê o link de recuperação da URL (opções do pacote)', async () => {
    definirBanco(URL_FICTICIA, CHAVE_FICTICIA)
    const cliente = (await obterCliente())!

    const autenticacao = cliente.auth as unknown as { persistSession: boolean; autoRefreshToken: boolean; detectSessionInUrl: boolean }
    expect(autenticacao.persistSession).toBe(true)
    expect(autenticacao.autoRefreshToken).toBe(true)
    expect(autenticacao.detectSessionInUrl).toBe(true)
  })

  it('I-S3: o cliente usa o fluxo PKCE e mantém as três opções de sessão', async () => {
    const fetchProibido = proibirARede()
    vi.mocked(createClient).mockClear()
    definirBanco('https://pkce.invalid', 'chave-pkce')

    expect(await obterCliente()).not.toBeNull()
    expect(createClient).toHaveBeenCalledTimes(1)
    const opcoes = vi.mocked(createClient).mock.calls[0][2]
    expect(opcoes?.auth).toMatchObject({ flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true })
    expect(fetchProibido).not.toHaveBeenCalled()
  })

  it('criarDadosConta devolve a mesma instância durante a vida da página, em cada modo', () => {
    proibirARede()

    const emMemoria = criarDadosConta()
    expect(criarDadosConta()).toBe(emMemoria)

    definirBanco(URL_FICTICIA, CHAVE_FICTICIA)
    const noBanco = criarDadosConta()
    expect(noBanco).not.toBe(emMemoria)
    expect(criarDadosConta()).toBe(noBanco)

    vi.unstubAllEnvs()
    expect(criarDadosConta()).toBe(emMemoria)
  })
})
