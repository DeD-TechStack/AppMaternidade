import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pastaSrcDe } from '../src/teste/fontes.ts'
import { nomeDoCache } from './config.ts'
import { escreverServiceWorker } from './passoDeBuild.ts'

// O passo de build de verdade: gera o sw.js de uma pasta `dist` de mentira, depois o executa num
// ambiente de service worker de mentira.

const FONTE = join(pastaSrcDe(import.meta.url), 'sw.ts')
const ORIGEM = 'https://site.exemplo'
let pasta = ''

function gravar(relativo: string, conteudo: string) {
  const destino = join(pasta, relativo)
  mkdirSync(join(destino, '..'), { recursive: true })
  writeFileSync(destino, conteudo)
}

function dist(extra = '') {
  gravar('index.html', '<html>app' + extra + '</html>')
  gravar('404.html', '<html>app</html>')
  gravar('manifest.webmanifest', '{}')
  gravar('assets/index-ABC.js', 'console.log(1)')
  gravar('icones/icone-192.png', 'png')
}

const lerSw = () => readFileSync(join(pasta, 'sw.js'), 'utf8')

beforeEach(() => {
  pasta = mkdtempSync(join(tmpdir(), 'passo-'))
})

afterEach(() => {
  rmSync(pasta, { recursive: true, force: true })
})

// Cada teste empacota o service worker com um build do Vite: com a máquina carregada passa dos 5 s padrão.
vi.setConfig({ testTimeout: 60_000 })

describe('o passo de build do sw.js', () => {
  it('grava dist/sw.js com a lista da casca e a versão daquele build', async () => {
    dist()
    const { versao, casca } = await escreverServiceWorker({ pasta, subcaminho: '/AppMaternidade/', fonte: FONTE })

    expect(casca).toEqual([
      '/AppMaternidade/assets/index-ABC.js',
      '/AppMaternidade/icones/icone-192.png',
      '/AppMaternidade/index.html',
      '/AppMaternidade/manifest.webmanifest',
    ])
    const codigo = lerSw()
    for (const caminho of casca) expect(codigo).toContain(caminho)
    expect(codigo).toContain(versao)
    expect(codigo).not.toContain('404.html')
    expect(codigo).not.toMatch(/['"]push['"]/)
  })

  it('dois builds com o mesmo código dão sw.js idêntico, byte a byte', async () => {
    dist()
    await escreverServiceWorker({ pasta, subcaminho: '/AppMaternidade/', fonte: FONTE })
    const primeiro = readFileSync(join(pasta, 'sw.js'))
    await escreverServiceWorker({ pasta, subcaminho: '/AppMaternidade/', fonte: FONTE })
    expect(readFileSync(join(pasta, 'sw.js')).equals(primeiro)).toBe(true)
  })

  it('o sw.js antigo da pasta não entra na versão', async () => {
    dist()
    await escreverServiceWorker({ pasta, subcaminho: '/', fonte: FONTE })
    const primeiro = lerSw()
    await escreverServiceWorker({ pasta, subcaminho: '/', fonte: FONTE })
    expect(lerSw()).toBe(primeiro)
  })

  it('um byte diferente em qualquer arquivo da casca muda o sw.js', async () => {
    dist()
    await escreverServiceWorker({ pasta, subcaminho: '/', fonte: FONTE })
    const antes = lerSw()
    dist('!')
    await escreverServiceWorker({ pasta, subcaminho: '/', fonte: FONTE })
    expect(lerSw()).not.toBe(antes)
  })

  it('o sw.js é um script comum (sem import nem export) e só ouve install, activate, fetch e message', async () => {
    dist()
    await escreverServiceWorker({ pasta, subcaminho: '/AppMaternidade/', fonte: FONTE })
    const codigo = lerSw()
    expect(codigo).not.toMatch(/^\s*(import|export)\s/m)

    const { ouvintes } = executar(codigo)
    expect([...ouvintes.keys()].sort()).toEqual(['activate', 'fetch', 'install', 'message'])
  })
})

// ---------------------------------------------------------------------------------------------
// O sw.js gerado, rodando num service worker de mentira.

interface Evento {
  waitUntil?: (p: Promise<unknown>) => void
  [chave: string]: unknown
}

function executar(codigo: string, rede: (caminho: string) => Promise<Response> = async () => new Response('da rede')) {
  const ouvintes = new Map<string, (evento: Evento) => void>()
  const armazem = new Map<string, Map<string, string>>()
  const falso = {
    addEventListener: (tipo: string, funcao: (evento: Evento) => void) => ouvintes.set(tipo, funcao),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
    location: { origin: ORIGEM },
  }
  const caches = {
    open: async (nome: string) => {
      if (!armazem.has(nome)) armazem.set(nome, new Map())
      const cache = armazem.get(nome)!
      return {
        put: async (chave: string, resposta: Response) => void cache.set(chave, await resposta.text()),
        match: async (chave: string) => (cache.has(chave) ? new Response(cache.get(chave)) : undefined),
      }
    },
    delete: async (nome: string) => armazem.delete(nome),
    keys: async () => [...armazem.keys()],
  }
  const buscar = vi.fn(async (entrada: string | { url: string }) => rede(typeof entrada === 'string' ? entrada : entrada.url))
  runInNewContext(codigo, { self: falso, caches, fetch: buscar, URL, Response, Promise, console, setTimeout, clearTimeout, Date })
  return { ouvintes, armazem, falso, buscar }
}

async function disparar(
  ambiente: ReturnType<typeof executar>,
  tipo: string,
  evento: Evento = {},
): Promise<{ esperas: Promise<unknown>[]; respostas: Promise<unknown>[] }> {
  const esperas: Promise<unknown>[] = []
  const respostas: Promise<unknown>[] = []
  evento.waitUntil = (p) => void esperas.push(p)
  evento.respondWith = (p: Promise<unknown>) => void respostas.push(p)
  ambiente.ouvintes.get(tipo)!(evento)
  await Promise.all(esperas)
  return { esperas, respostas }
}

describe('o sw.js gerado, em execução', () => {
  const NOME = (versao: string) => nomeDoCache({ subcaminho: '/AppMaternidade/', versao })

  async function gerar() {
    dist()
    return escreverServiceWorker({ pasta, subcaminho: '/AppMaternidade/', fonte: FONTE })
  }

  it('na instalação guarda a casca no cache da versão e não chama skipWaiting', async () => {
    const { versao, casca } = await gerar()
    const ambiente = executar(lerSw())
    await disparar(ambiente, 'install')
    expect([...ambiente.armazem.keys()]).toEqual([NOME(versao)])
    expect([...ambiente.armazem.get(NOME(versao))!.keys()].sort()).toEqual(casca)
    expect(ambiente.falso.skipWaiting).not.toHaveBeenCalled()
  })

  it('se um arquivo falha, a instalação falha e não sobra cache', async () => {
    await gerar()
    const ambiente = executar(lerSw(), async (caminho) =>
      caminho.endsWith('.js') ? new Response('x', { status: 500 }) : new Response('ok'),
    )
    // O erro nasce dentro do ambiente do sw.js (outro "realm"): basta a instalação rejeitar.
    await expect(disparar(ambiente, 'install')).rejects.toBeTruthy()
    expect(ambiente.armazem.size).toBe(0)
  })

  it('a mensagem { tipo: "ativar" } chama skipWaiting; outra mensagem, não', async () => {
    await gerar()
    const ambiente = executar(lerSw())
    await disparar(ambiente, 'message', { data: { tipo: 'outra' } })
    expect(ambiente.falso.skipWaiting).not.toHaveBeenCalled()
    await disparar(ambiente, 'message', { data: { tipo: 'ativar' } })
    expect(ambiente.falso.skipWaiting).toHaveBeenCalledTimes(1)
  })

  it('a ativação apaga os caches de versões anteriores, deixa os de outro nome e assume as abas', async () => {
    const { versao } = await gerar()
    const ambiente = executar(lerSw())
    await disparar(ambiente, 'install')
    ambiente.armazem.set(NOME('antiga'), new Map())
    ambiente.armazem.set('outro-cache', new Map())
    await disparar(ambiente, 'activate')
    expect([...ambiente.armazem.keys()].sort()).toEqual([NOME(versao), 'outro-cache'].sort())
    expect(ambiente.falso.clients.claim).toHaveBeenCalledTimes(1)
  })

  it('o fetch responde a navegação e a casca, e deixa passar o resto', async () => {
    const { casca } = await gerar()
    const ambiente = executar(lerSw(), async () => new Response('da rede', { status: 200 }))
    await disparar(ambiente, 'install')

    const navegacao = await disparar(ambiente, 'fetch', {
      request: { url: ORIGEM + '/AppMaternidade/app/hoje', method: 'GET', mode: 'navigate' },
    })
    expect(navegacao.respostas).toHaveLength(1)
    expect(await (await navegacao.respostas[0] as Response).text()).toBe('da rede')

    const arquivo = await disparar(ambiente, 'fetch', {
      request: { url: ORIGEM + casca[0], method: 'GET', mode: 'no-cors' },
    })
    expect(await (await arquivo.respostas[0] as Response).text()).toBe('da rede') // o que a instalação guardou

    for (const request of [
      { url: 'https://abc.supabase.co/rest/v1/x', method: 'GET', mode: 'cors' },
      { url: ORIGEM + '/AppMaternidade/app/hoje', method: 'POST', mode: 'cors' },
      { url: ORIGEM + '/AppMaternidade/qualquer.json', method: 'GET', mode: 'cors' },
    ]) {
      const direto = await disparar(ambiente, 'fetch', { request })
      expect(direto.respostas, request.url).toHaveLength(0)
    }
  })

  it('sem rede, a navegação recebe o index.html guardado', async () => {
    await gerar()
    let offline = false
    const ambiente = executar(lerSw(), async (caminho) => {
      if (offline) throw new TypeError('offline')
      return new Response(caminho.endsWith('index.html') ? 'casca guardada' : 'x')
    })
    await disparar(ambiente, 'install')
    offline = true
    const r = await disparar(ambiente, 'fetch', {
      request: { url: ORIGEM + '/AppMaternidade/app/sessao', method: 'GET', mode: 'navigate' },
    })
    expect(await (await r.respostas[0] as Response).text()).toBe('casca guardada')
  })
})
