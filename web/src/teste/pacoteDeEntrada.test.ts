import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// LIB-ROUTES: uma visita anônima nova a uma página pública não carrega nada privado. No build, o fecho dos imports
// ESTÁTICOS do script de entrada e dos `modulepreload` do `dist/index.html` não pode ter o pacote do Supabase nem o motor
// ou a fixture da memória (rotina, demonstração). O `import()` dinâmico (e as listas de dependências do
// `__vitePreload`) fica de fora: é o que o site baixa só quando a pessoa precisa. Lê o `dist/` que o `npm run build`
// gerou; sem `dist/index.html` o teste é pulado.

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const pastaDoBuild = join(raiz, 'dist')
const indexHtml = join(pastaDoBuild, 'index.html')
const pastaDosPacotes = join(pastaDoBuild, 'assets')

const PRIVADO = /supabase|rotina|fixture|demonstracao|memoria/i

/** Os `.js` de `assets/` que o HTML carrega de saída: o script de entrada e cada `modulepreload`. */
function raizesDoHtml(html: string): string[] {
  const alvos = new Set<string>()
  for (const etiqueta of html.match(/<(?:script|link)\b[^>]*>/gi) ?? []) {
    const ehScript = /^<script\b/i.test(etiqueta) && /type=["']module["']/i.test(etiqueta)
    const ehPreload = /^<link\b/i.test(etiqueta) && /rel=["']modulepreload["']/i.test(etiqueta)
    if (!ehScript && !ehPreload) continue
    const endereco = /(?:src|href)=["']([^"']+)["']/i.exec(etiqueta)?.[1]
    if (endereco?.endsWith('.js')) alvos.add(basename(endereco))
  }
  return [...alvos]
}

/** Os imports estáticos de um pacote minificado: `from"./x.js"`, `from'./x.js'` e `import"./x.js"` (sem `import(`). */
function importsEstaticos(codigo: string): string[] {
  const achados = new Set<string>()
  for (const m of codigo.matchAll(/\bfrom\s*["']\.\/([^"']+\.js)["']/g)) achados.add(m[1])
  for (const m of codigo.matchAll(/\bimport\s*["']\.\/([^"']+\.js)["']/g)) achados.add(m[1])
  return [...achados]
}

function fecho(raizes: string[]): Map<string, string> {
  const lidos = new Map<string, string>()
  const fila = [...raizes]
  while (fila.length > 0) {
    const nome = fila.shift()!
    if (lidos.has(nome)) continue
    const caminho = join(pastaDosPacotes, nome)
    const codigo = existsSync(caminho) ? readFileSync(caminho, 'utf8') : ''
    lidos.set(nome, codigo)
    fila.push(...importsEstaticos(codigo))
  }
  return lidos
}

describe('pacote de entrada (visita anônima a uma página pública)', () => {
  it.skipIf(!existsSync(indexHtml))('o fecho estático da entrada e os preloads do index.html não têm nada privado', () => {
    const html = readFileSync(indexHtml, 'utf8')
    const raizes = raizesDoHtml(html)
    expect(raizes.length, 'o index.html aponta para o script de entrada').toBeGreaterThan(0)

    const lidos = fecho(raizes)
    const nomes = [...lidos.keys()].sort()
    const lista = `fecho (${nomes.length}):\n  ${nomes.join('\n  ')}`

    const pelosNomes = nomes.filter((nome) => PRIVADO.test(nome))
    expect(pelosNomes, `pacote privado no fecho estático da entrada\n${lista}`).toEqual([])

    const peloConteudo = nomes.filter((nome) => /GoTrueClient|RealtimeClient/.test(lidos.get(nome) ?? ''))
    expect(peloConteudo, `o pacote do Supabase está no fecho estático da entrada\n${lista}`).toEqual([])
  })
})
