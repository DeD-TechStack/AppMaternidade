/// <reference types="vitest/config" />
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// O subcaminho do site no build: vazio ou ausente é "/"; "/x" vira "/x/"; o resto não vale.
function subcaminhoDoBuild(valor: string | undefined): string {
  if (valor === undefined || valor === '') return '/'
  if (!valor.startsWith('/')) throw new Error('BASE_SITE precisa começar com /')
  return valor.endsWith('/') ? valor : `${valor}/`
}

// O GitHub Pages serve o 404.html em toda rota que não é um arquivo. Com o mesmo conteúdo do
// index.html, o roteador do navegador assume a rota profunda, inclusive ao recarregar.
function paginaNaoEncontrada(): Plugin {
  let pasta = ''
  return {
    name: 'pagina-nao-encontrada',
    apply: 'build',
    configResolved(config) {
      pasta = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      copyFileSync(resolve(pasta, 'index.html'), resolve(pasta, '404.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? subcaminhoDoBuild(process.env.BASE_SITE) : '/',
  plugins: [react(), tailwindcss(), paginaNaoEncontrada()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/teste/setup.ts'],
    // Os testes de web/scripts usam o node:test (node --test); o Vitest não os roda.
    exclude: ['**/node_modules/**', '**/dist/**', 'scripts/**'],
  },
}))
