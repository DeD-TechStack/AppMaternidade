import { describe, expect, it, vi } from 'vitest'
import { ativarVersao, instalarCasca, type ArmazemSw } from './ciclo.ts'
import { nomeDoCache, type ConfigSw } from './config.ts'
import { ehMensagemAtivar, MENSAGEM_ATIVAR } from './mensagem.ts'

// Instalação e ativação do service worker, com um CacheStorage de mentira.

const CONFIG: ConfigSw = {
  subcaminho: '/AppMaternidade/',
  versao: 'v2',
  casca: ['/AppMaternidade/index.html', '/AppMaternidade/assets/app.js', '/AppMaternidade/assets/app.css'],
  paginaInicial: '/AppMaternidade/index.html',
}

/** Um CacheStorage em memória: nome do cache → (chave → texto). */
function criarArmazem(inicial: Record<string, string[]> = {}, falharNoPut: string | null = null) {
  const caches = new Map<string, Map<string, string>>(
    Object.entries(inicial).map(([nome, chaves]) => [nome, new Map(chaves.map((c) => [c, 'antigo']))]),
  )
  const armazem: ArmazemSw = {
    open: async (nome) => {
      if (!caches.has(nome)) caches.set(nome, new Map())
      const cache = caches.get(nome)!
      return {
        put: async (chave, resposta) => {
          if (chave === falharNoPut) throw new Error('cota cheia')
          cache.set(chave, await resposta.text())
        },
        match: async (chave) => (cache.has(chave) ? new Response(cache.get(chave)) : undefined),
      }
    },
    delete: async (nome) => caches.delete(nome),
    keys: async () => [...caches.keys()],
  }
  return { armazem, caches }
}

const ok = (corpo: string) => new Response(corpo, { status: 200 })

describe('instalação', () => {
  it('guarda a casca inteira num cache com o nome da versão', async () => {
    const { armazem, caches } = criarArmazem()
    const buscar = vi.fn(async (caminho: string) => ok(`conteúdo de ${caminho}`))
    await instalarCasca(CONFIG, buscar, armazem)

    const nome = nomeDoCache(CONFIG)
    expect([...caches.keys()]).toEqual([nome])
    expect([...caches.get(nome)!.keys()].sort()).toEqual([...CONFIG.casca].sort())
    expect(caches.get(nome)!.get('/AppMaternidade/index.html')).toBe('conteúdo de /AppMaternidade/index.html')
    expect(buscar).toHaveBeenCalledTimes(CONFIG.casca.length)
  })

  it('se um arquivo falha na rede, a instalação falha e nenhum cache novo fica', async () => {
    const { armazem, caches } = criarArmazem({ [nomeDoCache({ ...CONFIG, versao: 'v1' })]: ['/AppMaternidade/index.html'] })
    const buscar = async (caminho: string) => {
      if (caminho.endsWith('app.js')) throw new TypeError('Failed to fetch')
      return ok('x')
    }
    await expect(instalarCasca(CONFIG, buscar, armazem)).rejects.toThrow('Failed to fetch')
    expect([...caches.keys()]).toEqual([nomeDoCache({ ...CONFIG, versao: 'v1' })])
  })

  it.each([404, 500, 301, 206])('se um arquivo vem com status %i, a instalação falha e nenhum cache novo fica', async (status) => {
    const { armazem, caches } = criarArmazem()
    const buscar = async (caminho: string) => (caminho.endsWith('app.css') ? new Response('x', { status }) : ok('x'))
    await expect(instalarCasca(CONFIG, buscar, armazem)).rejects.toThrow(/app\.css/)
    expect(caches.size).toBe(0)
  })

  it('se gravar falha no meio, o cache pela metade é apagado e a instalação falha', async () => {
    const { armazem, caches } = criarArmazem({}, '/AppMaternidade/assets/app.js')
    await expect(instalarCasca(CONFIG, async () => ok('x'), armazem)).rejects.toThrow('cota cheia')
    expect(caches.has(nomeDoCache(CONFIG))).toBe(false)
  })
})

describe('ativação', () => {
  it('apaga só os caches de versões anteriores deste site', async () => {
    const atual = nomeDoCache(CONFIG)
    const anterior = nomeDoCache({ ...CONFIG, versao: 'v1' })
    const maisAntigo = nomeDoCache({ ...CONFIG, versao: 'v0' })
    const { armazem, caches } = criarArmazem({
      [atual]: ['/AppMaternidade/index.html'],
      [anterior]: ['/AppMaternidade/index.html'],
      [maisAntigo]: ['/AppMaternidade/index.html'],
      'outro-site-cache': ['x'],
      'appmaternidade-casca:/:v1': ['/index.html'],
      workbox: ['y'],
    })

    const apagados = await ativarVersao(CONFIG, armazem)

    expect(apagados.sort()).toEqual([anterior, maisAntigo].sort())
    expect([...caches.keys()].sort()).toEqual([atual, 'appmaternidade-casca:/:v1', 'outro-site-cache', 'workbox'].sort())
  })

  it('sem cache antigo, não apaga nada', async () => {
    const { armazem, caches } = criarArmazem({ [nomeDoCache(CONFIG)]: ['/AppMaternidade/index.html'] })
    expect(await ativarVersao(CONFIG, armazem)).toEqual([])
    expect(caches.size).toBe(1)
  })
})

describe('mensagem da página', () => {
  it('só { tipo: "ativar" } pede o skipWaiting', () => {
    expect(MENSAGEM_ATIVAR).toEqual({ tipo: 'ativar' })
    expect(ehMensagemAtivar({ tipo: 'ativar' })).toBe(true)
    for (const dado of [null, undefined, 'ativar', 1, {}, { tipo: 'outra' }, { tipo: 'ATIVAR' }, [MENSAGEM_ATIVAR]]) {
      expect(ehMensagemAtivar(dado)).toBe(false)
    }
  })
})
