import { createHash } from 'node:crypto'
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

describe('RF14:RN-01 (4) o SQL entregue não chama HTTP nem e-mail', () => {
  const MIGRACAO = 'supabase/migrations/20261115090300_avisos_entre_cuidadores.sql'
  // Inventários de caminhos e conteúdo: migrações + SQL operacional de c3819c42,
  // e seeds locais do recorte aprovado (inclui os dois ajustes sintéticos de f3a76fc7).
  const SQL_BASE = '0db1710ac510c0dae5d376d7d8c0f0d89dfc60c77f7e94c0b75a33b20f8fb43f'
  const SEEDS_LOCAIS = '054b3d9376dbe7eee6fe6eccff93c4d0916f7d8e945c4ba563e7542637ed9d72'
  const SQL_RF14 = '3bbd599534df5345de2eae829d2034a49b34377123ff5ee95b84deec040697b3'
  const ignorados = new Set(['supabase/tests', 'supabase/.temp', 'supabase/.branches'])
  const proibidos = (sql: string) =>
    [...sql.replace(/--.*$/gm, '').matchAll(/\bnet\.|\bhttp|\bpg_net\b|\bauth\.admin\b/gi)].map((m) => m[0])
  const sha256 = (conteudo: string | Buffer) => createHash('sha256').update(conteudo).digest('hex')
  const shaSql = (bytes: Buffer) => sha256(Buffer.from(bytes.toString('latin1').replaceAll('\r\n', '\n'), 'latin1'))
  const seedLocal = (caminho: string) => caminho === 'supabase/seed.sql' || caminho.startsWith('supabase/seeds/')

  function caminhosSql(pasta: string): string[] {
    return readdirSync(join(pastaRaiz, pasta), { withFileTypes: true }).flatMap((entrada) => {
      const caminho = `${pasta}/${entrada.name}`
      if (ignorados.has(caminho)) return []
      if (entrada.isSymbolicLink()) throw new Error(`Link não permitido no inventário SQL: ${caminho}`)
      if (entrada.isDirectory()) return caminhosSql(caminho)
      return entrada.isFile() && /\.sql$/i.test(caminho) ? [caminho] : []
    })
  }

  const lerSql = () => [...caminhosSql('scripts'), ...caminhosSql('supabase')].sort()
    .map((caminho) => ({ caminho, bytes: readFileSync(join(pastaRaiz, caminho)) }))
  const inventario = (sql: ReturnType<typeof lerSql>) => sha256(JSON.stringify(sql.map(({ caminho, bytes }) => [caminho, shaSql(bytes)])))

  it('verifica net., http, pg_net e auth.admin nos bytes de todo SQL entregue, inclusive RF14 quando presente', () => {
    const achados = lerSql().flatMap(({ caminho, bytes }) =>
      proibidos(bytes.toString('utf8')).map((marcador) => ({ caminho, marcador })),
    )
    expect(achados).toEqual([])
  })

  it('exige o SQL base sem alterações; admite só a migração RF14 exata como entrada adicional', () => {
    const sql = lerSql()
    const base = sql.filter(({ caminho }) => caminho !== MIGRACAO && !seedLocal(caminho))
    expect(inventario(base), 'caminhos e conteúdo do SQL de c3819c42').toBe(SQL_BASE)
    expect(inventario(sql.filter(({ caminho }) => seedLocal(caminho))), 'seeds locais aprovados').toBe(SEEDS_LOCAIS)
    // A ausência não dispensa a varredura nem a comparação acima. Se incluído, o arquivo real
    // precisa ser o aprovado; um SQL vazio, adaptado ou de outro caminho não representa o RF14.
    const rf14 = sql.find(({ caminho }) => caminho === MIGRACAO)
    if (rf14) expect(shaSql(rf14.bytes), MIGRACAO).toBe(SQL_RF14)
  })

  it.each([
    ["select net.http_post('https://x.invalid');", 'net.'],
    ['create extension pg_net;', 'pg_net'],
    ['select auth.admin.send_mail();', 'auth.admin'],
    ["select HTTP_POST('https://x.invalid');", 'HTTP'],
  ])('controle negativo: detecta %s', (sql, marcador) => {
    expect(proibidos(sql)).toContain(marcador)
  })

  it('não confunde marcadores em comentário de linha com chamadas', () => {
    expect(proibidos('-- pg_net, net.http_post, auth.admin\nselect 1;')).toEqual([])
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
