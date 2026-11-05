import { posix } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listarFontes, pastaSrcDe } from './teste/fontes.ts'

const pastaSrc = pastaSrcDe(import.meta.url)

// G4-1: uma exportação que nenhum outro arquivo importa é ruído. Vale para web/src inteiro.

const EXPORTACAO = /^export\s+(?:async\s+)?(?:const|let|function|class|interface|type)\s+([A-Za-z0-9_]+)/gm
const IMPORTACAO = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'(\.[^']+)'/g

describe('exportações de web/src', () => {
  it('toda exportação do produto é importada por outro arquivo', () => {
    const todos = listarFontes(pastaSrc, true)

    // "arquivo::nome" de tudo o que alguém importa.
    const importados = new Set<string>()
    for (const { nome, texto } of todos) {
      for (const [, lista, origem] of texto.matchAll(IMPORTACAO)) {
        const arquivo = posix.normalize(posix.join(posix.dirname(nome), origem))
        for (const item of lista.split(',')) {
          const limpo = item.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]
          if (limpo) importados.add(`${arquivo}::${limpo}`)
        }
      }
    }

    const sobrando: string[] = []
    for (const { nome, texto } of listarFontes(pastaSrc).filter((f) => /\.tsx?$/.test(f.nome))) {
      for (const [, exportado] of texto.matchAll(EXPORTACAO)) {
        if (!importados.has(`${nome}::${exportado}`)) sobrando.push(`${nome}: ${exportado}`)
      }
    }

    expect(sobrando).toEqual([])
  })
})
