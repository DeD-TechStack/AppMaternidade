import { posix } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listarFontes, pastaSrcDe } from '../src/teste/fontes.ts'

// Como web/src/exportacoes.test.ts: uma exportação que nenhum outro arquivo importa é ruído. Aqui, a
// de web/sw é importada por outro arquivo de web/sw ou de web/src.

const pastaSw = pastaSrcDe(import.meta.url)
const pastaSrc = pastaSw + '../src/'

const EXPORTACAO = /^export\s+(?:async\s+)?(?:const|let|function|class|interface|type)\s+([A-Za-z0-9_]+)/gm
const IMPORTACAO = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'(\.[^']+)'/g

// Os nomes ganham a pasta de origem ("sw/" ou "src/"), para um caminho relativo valer entre as duas.
const comPasta = (pasta: string, fontes: ReturnType<typeof listarFontes>) =>
  fontes.map((f) => ({ ...f, nome: `${pasta}/${f.nome}` }))

describe('exportações de web/sw', () => {
  it('toda exportação de web/sw é importada por outro arquivo de web/sw ou de web/src', () => {
    const sw = comPasta('sw', listarFontes(pastaSw, true))
    const src = comPasta('src', listarFontes(pastaSrc, true))

    const importados = new Set<string>()
    for (const { nome, texto } of [...sw, ...src]) {
      for (const [, lista, origem] of texto.matchAll(IMPORTACAO)) {
        const arquivo = posix.normalize(posix.join(posix.dirname(nome), origem))
        for (const item of lista.split(',')) {
          const limpo = item.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]
          if (limpo) importados.add(`${arquivo}::${limpo}`)
        }
      }
    }

    const doProduto = sw.filter((f) => /\.ts$/.test(f.nome) && !/\.test\.ts$/.test(f.nome))
    expect(doProduto.length).toBeGreaterThan(3)

    const sobrando: string[] = []
    for (const { nome, texto } of doProduto) {
      for (const [, exportado] of texto.matchAll(EXPORTACAO)) {
        if (!importados.has(`${nome}::${exportado}`)) sobrando.push(`${nome}: ${exportado}`)
      }
    }
    expect(sobrando).toEqual([])
  })
})
