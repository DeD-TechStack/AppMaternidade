import { posix } from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { listarFontes, pastaSrcDe, type Fonte } from './teste/fontes.ts'

const pastaSrc = pastaSrcDe(import.meta.url)

// G4-1: uma exportação que nenhum outro arquivo importa é ruído. Vale para web/src inteiro.

const EXPORTACAO = /^export\s+(?:async\s+)?(?:const|let|function|class|interface|type)\s+([A-Za-z0-9_]+)/gm
function exportacoesSemUso(produto: Fonte[], todos: Fonte[]): string[] {
  const usos: Array<{ consumidor: string; chave: string }> = []
  const reexportacoes = new Map<string, string>()
  for (const { nome, texto } of todos.filter((f) => /\.tsx?$/.test(f.nome))) {
    const fonte = ts.createSourceFile(nome, texto, ts.ScriptTarget.Latest)
    const origem = (no: ts.Node | undefined) =>
      no && ts.isStringLiteral(no) && /^\.\.?\//.test(no.text) ? posix.join(posix.dirname(nome), no.text) : null

    function visitar(no: ts.Node) {
      if (ts.isImportDeclaration(no)) {
        const arquivo = origem(no.moduleSpecifier)
        const nomes = no.importClause?.namedBindings
        if (arquivo && nomes && ts.isNamedImports(nomes)) {
          for (const item of nomes.elements) usos.push({ consumidor: nome, chave: `${arquivo}::${(item.propertyName ?? item.name).text}` })
        }
      } else if (ts.isExportDeclaration(no)) {
        const arquivo = origem(no.moduleSpecifier)
        if (arquivo && no.exportClause && ts.isNamedExports(no.exportClause)) {
          for (const item of no.exportClause.elements) reexportacoes.set(`${nome}::${item.name.text}`, `${arquivo}::${(item.propertyName ?? item.name).text}`)
        }
      } else if (ts.isPropertyAccessExpression(no) && ts.isParenthesizedExpression(no.expression)) {
        // `(await import('./x.tsx')).Nome`: conta apenas o membro selecionado pela rota lazy.
        const espera = no.expression.expression
        if (ts.isAwaitExpression(espera) && ts.isCallExpression(espera.expression) && espera.expression.expression.kind === ts.SyntaxKind.ImportKeyword) {
          const arquivo = origem(espera.expression.arguments[0])
          if (arquivo) usos.push({ consumidor: nome, chave: `${arquivo}::${no.name.text}` })
        }
      }
      ts.forEachChild(no, visitar)
    }
    visitar(fonte)
  }

  // Uma reexportação sozinha não é consumo: siga apenas cadeias iniciadas por um import real.
  const importados = new Set<string>()
  for (const { consumidor, chave } of usos) {
    const visitados = new Set<string>()
    for (let atual: string | undefined = chave; atual && !visitados.has(atual); atual = reexportacoes.get(atual)) {
      visitados.add(atual)
      if (!atual.startsWith(`${consumidor}::`)) importados.add(atual)
    }
  }

  const sobrando: string[] = []
  for (const { nome, texto } of produto.filter((f) => /\.tsx?$/.test(f.nome))) {
    for (const [, exportado] of texto.matchAll(EXPORTACAO)) {
      if (!importados.has(`${nome}::${exportado}`)) sobrando.push(`${nome}: ${exportado}`)
    }
  }
  return sobrando
}

describe('exportações de web/src', () => {
  it('toda exportação do produto é importada por outro arquivo', () => {
    expect(exportacoesSemUso(listarFontes(pastaSrc), listarFontes(pastaSrc, true))).toEqual([])
  })

  const folha = { nome: 'folha.ts', texto: 'export const vivo = 1\nexport const morto = 2\n' }
  const barril = { nome: 'indice.ts', texto: "export { vivo as outro, morto } from './folha.ts'" }

  it('conta uma reexportação nomeada e renomeada só até o símbolo realmente importado', () => {
    const meio = { nome: 'pasta/meio.ts', texto: "export { outro as ponta } from '../indice.ts'" }
    const consumidor = { nome: 'uso.test.ts', texto: "import { ponta as usado } from './pasta/meio.ts'" }
    expect(exportacoesSemUso([folha], [folha, barril, meio, consumidor])).toEqual(['folha.ts: morto'])
  })

  it('não conta barril sem consumidor, comentário, string nem autoimportação', () => {
    const falso = { nome: 'falso.ts', texto: "// import { vivo } from './folha.ts'\nconst s = \"(await import('./folha.ts')).morto\"" }
    const auto = { ...folha, texto: `${folha.texto}import { vivo } from './folha.ts'` }
    expect(exportacoesSemUso([auto], [auto, barril, falso])).toEqual(['folha.ts: vivo', 'folha.ts: morto'])
  })

  it('uma consulta lazy consome somente o membro selecionado', () => {
    const consumidor = { nome: 'rota.ts', texto: "const lazy = async () => (await import('./folha.ts')).vivo" }
    expect(exportacoesSemUso([folha], [folha, consumidor])).toEqual(['folha.ts: morto'])
    expect(exportacoesSemUso([folha], [folha])).toEqual(['folha.ts: vivo', 'folha.ts: morto'])
  })
})
