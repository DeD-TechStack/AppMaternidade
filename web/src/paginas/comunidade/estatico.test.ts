import { join, posix, sep } from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { listarFontes } from '../../teste/fontes.ts'

// MAT-40, testes 4, 11 e 12 (a parte estática): sobre os arquivos de produto do escopo da 40a (sem os
// `*.test.ts` e `*.test.tsx`; PR-40), a fronteira do cuidado, o subcaminho, as regras de armazenamento e
// de ícones, e o texto de interface sempre em `conteudo/comunidade.ts`.

const pastaSrc = join(process.cwd(), 'src') + sep

const NO_ESCOPO = (nome: string) =>
  /^dados\/comunidade[^/]*\.ts$/.test(nome) ||
  nome === 'rotas/comunidade.tsx' ||
  nome === 'conteudo/comunidade.ts' ||
  nome.startsWith('paginas/comunidade/') ||
  nome.startsWith('componentes/comunidade/')

const arquivos = listarFontes(pastaSrc).filter((f) => NO_ESCOPO(f.nome))
const tsx = arquivos.filter((f) => f.nome.endsWith('.tsx'))

const semComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

const importsDe = (texto: string) => [...semComentarios(texto).matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1])

describe('o escopo da 40a existe', () => {
  it('há arquivos de produto nas cinco pastas do escopo', () => {
    for (const parte of ['dados/comunidade.ts', 'dados/comunidade.supabase.ts', 'dados/comunidade.memoria.ts', 'dados/comunidade.demonstracao.ts', 'rotas/comunidade.tsx', 'conteudo/comunidade.ts', 'paginas/comunidade/Comunidade.tsx', 'componentes/comunidade/Dialogo.tsx']) {
      expect(arquivos.map((f) => f.nome), parte).toContain(parte)
    }
  })
})

describe('a tela não cruza a fronteira do cuidado (MAT-40:RF-14)', () => {
  it('nenhum arquivo importa rotina, desenvolvimento nem os arquivos de dados de conta (o useSessao e o comum.ts valem)', () => {
    const proibido = /^dados\/(rotina|desenvolvimento|conta(\.supabase|\.memoria|\.demonstracao)?\.tsx?$)/
    const achados: string[] = []
    for (const { nome, texto } of arquivos) {
      for (const origem of importsDe(texto)) {
        if (!origem.startsWith('.')) continue
        const resolvido = posix.normalize(posix.join(posix.dirname(nome), origem))
        if (proibido.test(resolvido)) achados.push(`${nome}: ${origem}`)
      }
    }
    expect(achados).toEqual([])
  })

  it('a varredura de imports enxerga o que deve', () => {
    expect(importsDe(`import { a } from '../../dados/conta.ts'\nimport type { b } from './rotina.ts'`)).toEqual(['../../dados/conta.ts', './rotina.ts'])
    expect(posix.normalize(posix.join('paginas/comunidade', '../../dados/conta.ts'))).toBe('dados/conta.ts')
  })

  it('nenhum literal de texto é o nome de uma tabela de cuidado nem o `nome_privado`', () => {
    const tabelas = /^(familias|vinculos|bebes|convites|registros|registro_alteracoes|notas_cuidado|contas)$/
    const achados: string[] = []
    for (const { nome, texto } of arquivos) {
      const limpo = semComentarios(texto)
      for (const [, literal] of limpo.matchAll(/['"`]([^'"`\n]*)['"`]/g)) {
        if (tabelas.test(literal)) achados.push(`${nome}: ${literal}`)
      }
      if (/\bnome_privado\b/.test(limpo)) achados.push(`${nome}: nome_privado`)
    }
    expect(achados).toEqual([])
  })
})

describe('regras de armazenamento, ícones e subcaminho (teste 11)', () => {
  it('nenhum arquivo importa lucide-react nem escreve em localStorage, sessionStorage, IndexedDB, cookies ou service worker', () => {
    for (const { nome, texto } of arquivos) {
      const limpo = semComentarios(texto)
      expect(importsDe(limpo), nome).not.toContain('lucide-react')
      expect(limpo, nome).not.toMatch(/\b(localStorage|sessionStorage|indexedDB|serviceWorker)\b|document\.cookie/)
    }
  })

  it('nenhum `href="/` e nenhum `/AppMaternidade` literal: todo link interno passa pelo roteador', () => {
    for (const { nome, texto } of arquivos) {
      const limpo = semComentarios(texto)
      expect(limpo, nome).not.toMatch(/href\s*=\s*\{?\s*['"`]\//)
      expect(limpo, nome).not.toContain('/AppMaternidade')
    }
  })

  it('nenhum dos nomes proibidos do seed antigo em código, teste ou texto do escopo', () => {
    const antigos = [['A', 'na'], ['L', 'ia']].map((partes) => partes.join(''))
    const todos = listarFontes(pastaSrc, true).filter((f) => NO_ESCOPO(f.nome) || /comunidade\.[^/]*test\.tsx?$/.test(f.nome))
    for (const { nome, texto } of todos) {
      for (const proibido of antigos) expect(texto, nome).not.toMatch(new RegExp(`\\b${proibido}\\b`))
    }
  })
})

interface Achado {
  arquivo: string
  linha: number
  texto: string
}

const COM_LETRA = /\p{L}/u
// Os atributos de texto da interface (MAT-40:RN-03).
const ATRIBUTOS_DE_TEXTO = new Set(['aria-label', 'aria-description', 'title', 'placeholder', 'alt', 'label'])

function literaisDeTexto(arquivo: string, texto: string): Achado[] {
  const fonte = ts.createSourceFile(arquivo, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const achados: Achado[] = []
  const registrar = (no: ts.Node, conteudo: string) =>
    achados.push({ arquivo, linha: fonte.getLineAndCharacterOfPosition(no.getStart()).line + 1, texto: conteudo.trim().slice(0, 60) })
  const temLetra = (no: ts.Expression): string | null => {
    if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) return COM_LETRA.test(no.text) ? no.text : null
    if (ts.isTemplateExpression(no)) {
      const partes = [no.head.text, ...no.templateSpans.map((s) => s.literal.text)].join('')
      return COM_LETRA.test(partes) ? partes : null
    }
    return null
  }

  function visitar(no: ts.Node) {
    // Texto JSX com letra entre `>` e `<`, fora de `{}`.
    if (ts.isJsxText(no) && COM_LETRA.test(no.text)) registrar(no, no.text)
    // Literal com letra nos atributos de texto.
    if (ts.isJsxAttribute(no) && ATRIBUTOS_DE_TEXTO.has(no.name.getText()) && no.initializer) {
      const inicial = no.initializer
      const valor = ts.isStringLiteral(inicial) ? inicial.text : ts.isJsxExpression(inicial) && inicial.expression ? temLetra(inicial.expression) : null
      if (valor && COM_LETRA.test(valor)) registrar(no, valor)
    }
    // Literal com letra passado como filho: `{'texto'}`.
    if (ts.isJsxExpression(no) && no.expression && (ts.isJsxElement(no.parent) || ts.isJsxFragment(no.parent))) {
      const valor = temLetra(no.expression)
      if (valor) registrar(no, valor)
    }
    ts.forEachChild(no, visitar)
  }
  visitar(fonte)
  return achados
}

describe('texto sem literal (MAT-40:RN-03, teste 12)', () => {
  it('nenhum .tsx do escopo tem texto de interface escrito nele', () => {
    const achados = tsx.flatMap(({ nome, texto }) => literaisDeTexto(nome, texto))
    expect(achados).toEqual([])
  })

  it('a varredura enxerga o que deve: texto JSX, atributo e filho literal', () => {
    const exemplo = `export const X = () => (<div aria-label="Fechar" title={'Aviso'}>Texto solto{'outro'}{valor}<span className="a b" id="x" /></div>)`
    const achados = literaisDeTexto('exemplo.tsx', exemplo).map((a) => a.texto).sort()
    expect(achados).toEqual(['Aviso', 'Fechar', 'Texto solto', 'outro'].sort())
  })
})
