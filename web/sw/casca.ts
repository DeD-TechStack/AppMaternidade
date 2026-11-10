// Passo de build: a lista da casca de um `dist` e a versão dela.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { ConfigSw } from './config.ts'

/** Os dois arquivos da pasta que não entram na casca: a cópia do index.html e o próprio sw.js. */
const FORA_DA_CASCA = new Set(['404.html', 'sw.js'])

/**
 * Todo arquivo de `pasta` (menos 404.html e sw.js), em ordem fixa, cada um com o subcaminho na frente,
 * e a versão: o hash dos nomes e do conteúdo de todos. Nada de data nem de acaso: o mesmo `dist` dá
 * sempre o mesmo resultado.
 */
export function calcularCasca(pasta: string, subcaminho: string): Pick<ConfigSw, 'casca' | 'versao' | 'paginaInicial'> {
  const arquivos = readdirSync(pasta, { recursive: true, encoding: 'utf8' })
    .map((caminho) => caminho.replaceAll('\\', '/'))
    .filter((caminho) => !FORA_DA_CASCA.has(caminho))
    .filter((caminho) => statSync(join(pasta, caminho)).isFile())
    .sort()

  const hash = createHash('sha256').update(subcaminho).update('\0')
  for (const caminho of arquivos) {
    const conteudo = createHash('sha256').update(readFileSync(join(pasta, caminho))).digest()
    hash.update(caminho).update('\0').update(conteudo).update('\0')
  }

  return {
    casca: arquivos.map((caminho) => subcaminho + encodeURI(caminho)),
    versao: hash.digest('hex').slice(0, 16),
    paginaInicial: subcaminho + 'index.html',
  }
}
