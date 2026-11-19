import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listarFontes, type Fonte } from './fontes.ts'
import { semComentarios } from './varreduras.ts'

// RF14:RN-01 (sem push, sem PWA, sem lembrete, um só temporizador) e RF14:RN-06 (nada no console). Estas
// varreduras leem a árvore de produto; o controle negativo planta uma referência num texto em memória e
// confere que a mesma varredura a acha.

const pastaSrc = join(process.cwd(), 'src') + '/'
const pastaWeb = process.cwd()
const pastaRaiz = join(process.cwd(), '..')

const PUSH = /\b(Notification|PushManager|showNotification)\b|serviceWorker/

const MODULOS_NOVOS = [
  'dados/avisos.ts',
  'dados/avisos.memoria.ts',
  'dados/avisos.supabase.ts',
  'componentes/avisos/useAvisos.ts',
  'conteudo/avisos.ts',
]

const achadosDePush = (fontes: Fonte[]) => fontes.filter((f) => PUSH.test(semComentarios(f.texto))).map((f) => f.nome)

const achadosDeConsole = (fontes: Fonte[]) => fontes.filter((f) => /\bconsole\./.test(semComentarios(f.texto))).map((f) => f.nome)

/** Os temporizadores de um módulo: cada chamada de `setInterval` e `setTimeout`, em ordem. */
const temporizadores = (texto: string) => [...semComentarios(texto).matchAll(/\bset(Interval|Timeout)\b/g)].map((m) => m[1])

const produto = listarFontes(pastaSrc)
const novos = produto.filter((f) => MODULOS_NOVOS.includes(f.nome))

describe('os módulos novos existem', () => {
  it('os cinco arquivos de produto do RF-14 estão em web/src', () => {
    expect(novos.map((f) => f.nome).sort()).toEqual([...MODULOS_NOVOS].sort())
  })
})

describe('RF14:RN-01 (1) nenhum arquivo de produto toca em push, notificação ou service worker', () => {
  it('a árvore de produto não casa a expressão', () => {
    expect(achadosDePush(produto)).toEqual([])
  })

  it('controle negativo: uma referência plantada em cópia temporária é achada, também a mais discreta', () => {
    for (const plantado of ['new Notification("oi")', 'PushManager', 'reg.showNotification(x)', "navigator.serviceWorker.register('/sw.js')"]) {
      const copia: Fonte[] = [...novos, { nome: 'plantado.ts', texto: `export const x = ${plantado}\n` }]
      expect(achadosDePush(copia), plantado).toEqual(['plantado.ts'])
    }
  })

  it('a palavra inteira conta: identificadores mais longos não casam', () => {
    expect(achadosDePush([{ nome: 'a.ts', texto: 'type X = NotificationOptions' }])).toEqual([])
  })
})

describe('RF14:RN-01 (2) sem manifesto e sem service worker em web/public e web/index.html', () => {
  const arquivosDe = (pasta: string): string[] =>
    existsSync(pasta) ? readdirSync(pasta, { recursive: true, encoding: 'utf8' }).map((c) => c.replaceAll('\\', '/')) : []

  const problemasDeNome = (nomes: string[]) =>
    nomes.filter((n) => /(^|\/)(sw\.js|service-worker\.js|manifest\.json)$|\.webmanifest$/.test(n))

  it('a pasta public não tem manifesto nem service worker', () => {
    expect(problemasDeNome(arquivosDe(join(pastaWeb, 'public')))).toEqual([])
  })

  it('o index.html não liga manifesto', () => {
    expect(readFileSync(join(pastaWeb, 'index.html'), 'utf8')).not.toMatch(/<link[^>]+rel\s*=\s*["']manifest["']/i)
  })

  it('controle negativo: nomes plantados são achados', () => {
    expect(problemasDeNome(['cenas/a.png', 'app.webmanifest', 'sub/sw.js', 'manifest.json', 'service-worker.js'])).toEqual([
      'app.webmanifest',
      'sub/sw.js',
      'manifest.json',
      'service-worker.js',
    ])
  })
})

describe('RF14:RN-01 (4) a migração não chama HTTP nem e-mail', () => {
  const MIGRACAO = join(pastaRaiz, 'supabase', 'migrations', '20261115090300_avisos_entre_cuidadores.sql')
  const proibidos = (sql: string) =>
    [...sql.replace(/--.*$/gm, '').matchAll(/\bnet\.|\bhttp|\bpg_net\b|\bauth\.admin\b/gi)].map((m) => m[0])

  it('a migração não tem net., http, pg_net nem auth.admin', () => {
    expect(proibidos(readFileSync(MIGRACAO, 'utf8'))).toEqual([])
  })

  it('controle negativo: um SQL com pg_net é achado', () => {
    expect(proibidos("select net.http_post('https://x.invalid');")).not.toEqual([])
  })
})

describe('RF14:RN-01 (5) o único temporizador dos módulos novos é o intervalo de 120 s do useAvisos', () => {
  it('só o useAvisos.ts tem um temporizador, um setInterval, e o intervalo é de 120 000 ms', () => {
    const porArquivo = novos.map((f) => [f.nome, temporizadores(f.texto)] as const).filter(([, lista]) => lista.length > 0)
    expect(porArquivo).toEqual([['componentes/avisos/useAvisos.ts', ['Interval']]])
    const hook = novos.find((f) => f.nome === 'componentes/avisos/useAvisos.ts')!.texto
    expect(semComentarios(hook)).toMatch(/\b120_000\b|\b120000\b/)
  })

  it('controle negativo: um setTimeout plantado ou um segundo setInterval é achado', () => {
    expect(temporizadores('setInterval(a, 1)\nsetTimeout(b, 2)')).toEqual(['Interval', 'Timeout'])
    expect(temporizadores('// setTimeout(c, 3)\nsetInterval(a, 1)')).toEqual(['Interval'])
  })
})

describe('RF14:RN-06 os módulos novos não escrevem no console', () => {
  it('nenhum módulo novo tem chamada de console', () => {
    expect(achadosDeConsole(novos)).toEqual([])
  })

  it('controle negativo: um console.log plantado em cópia temporária é achado', () => {
    const copia: Fonte[] = [...novos, { nome: 'plantado.ts', texto: 'console.log("nota", texto)\n' }]
    expect(achadosDeConsole(copia)).toEqual(['plantado.ts'])
  })
})
