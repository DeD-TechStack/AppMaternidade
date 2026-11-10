// Passo de build: grava dist/sw.js, o service worker empacotado com a lista da casca e a versão
// daquele build. Só o `vite build` o roda (o plugin é `apply: 'build'`); o dev e o Vitest, não.

import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { build, type Plugin } from 'vite'
import { calcularCasca } from './casca.ts'
import type { ConfigSw } from './config.ts'

interface Opcoes {
  /** A pasta do build (web/dist). */
  pasta: string
  /** O subcaminho do site, com / dos dois lados. */
  subcaminho: string
  /** O arquivo-fonte do service worker (web/sw/sw.ts). */
  fonte: string
}

/** Empacota o service worker com a casca de `pasta` e grava `pasta/sw.js`. */
export async function escreverServiceWorker({ pasta, subcaminho, fonte }: Opcoes): Promise<ConfigSw> {
  const config: ConfigSw = { subcaminho, ...calcularCasca(pasta, subcaminho) }

  // Um build do Vite só do service worker, na memória (sem arquivo de configuração, sem .env): sai
  // um script comum, sem import nem export, e igual byte a byte para a mesma entrada.
  const resultado = await build({
    configFile: false,
    root: dirname(fonte),
    mode: 'production',
    logLevel: 'silent',
    envDir: false,
    publicDir: false,
    define: { __CONFIG_SW__: JSON.stringify(config) },
    build: {
      write: false,
      minify: false,
      copyPublicDir: false,
      emptyOutDir: false,
      rolldownOptions: { input: fonte, output: { format: 'iife', entryFileNames: 'sw.js' } },
    },
  })

  const saidas = Array.isArray(resultado) ? resultado.flatMap((r) => r.output) : 'output' in resultado ? resultado.output : []
  const chunks = saidas.filter((saida) => saida.type === 'chunk')
  if (chunks.length !== 1) throw new Error(`o service worker devia sair em um script só, saiu em ${chunks.length}`)

  writeFileSync(join(pasta, 'sw.js'), chunks[0].code)
  return config
}

/** O plugin do build: depois de tudo gravado (inclusive a cópia do 404.html), grava dist/sw.js. */
export default function gerarServiceWorker(): Plugin {
  let raiz = ''
  let pasta = ''
  let subcaminho = '/'
  let falhou = false
  return {
    name: 'service-worker-da-casca',
    apply: 'build',
    configResolved(config) {
      raiz = config.root
      pasta = resolve(raiz, config.build.outDir)
      subcaminho = config.base
    },
    buildEnd(erro) {
      falhou = erro !== undefined
    },
    async closeBundle() {
      if (falhou) return
      await escreverServiceWorker({ pasta, subcaminho, fonte: resolve(raiz, 'sw/sw.ts') })
    },
  }
}
