import { join, posix, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listarFontes } from '../../teste/fontes.ts'
import { importsDe, literaisDeTexto, semComentarios } from '../../teste/varreduras.ts'

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
