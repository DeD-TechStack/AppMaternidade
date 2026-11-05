import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Estas funções recebem o `import.meta.url` do ARQUIVO DE TESTE. Num módulo que não é teste,
// o Vitest (modo web do jsdom) reescreve `import.meta.url` para uma URL http, que o Node recusa.
// E no ambiente jsdom o `URL` global é o do jsdom: passar o `href` (texto) ao `fileURLToPath`
// faz o Node montar a própria URL.

/** A pasta web/src, a partir do `import.meta.url` de um teste que mora direto nela. */
export function pastaSrcDe(urlDoTeste: string): string {
  return fileURLToPath(new URL('./', urlDoTeste).href)
}

export interface Fonte {
  /** Caminho relativo a web/src, com "/" (por exemplo "prototipo/estado.ts"). */
  nome: string
  texto: string
}

const ehTeste = (nome: string) => /\.test\.tsx?$/.test(nome) || nome.startsWith('teste/')

/** Os .css, .ts e .tsx de `pastaSrc`. Sem `comTestes`, só o código do produto. */
export function listarFontes(pastaSrc: string, comTestes = false): Fonte[] {
  return readdirSync(pastaSrc, { recursive: true, encoding: 'utf8' })
    .map((caminho) => caminho.replaceAll('\\', '/'))
    .filter((caminho) => /\.(css|tsx?)$/.test(caminho))
    .filter((caminho) => comTestes || !ehTeste(caminho))
    .map((nome) => ({ nome, texto: readFileSync(pastaSrc + nome, 'utf8') }))
}
