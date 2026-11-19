/// <reference types="vitest/config" />
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { imagetools } from 'vite-imagetools'
import { chavePublica } from './build/conferirChavePublica.ts'
import { politicaDeConteudo } from './build/politicaDeConteudo.ts'

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

// Com as páginas em pacotes à parte, o CSS dos pacotes compartilhados vai para o arquivo antes do `index.css`. A ordem
// das camadas vale pela primeira aparição; sem esta linha a `components` ficaria abaixo da `base` do Tailwind.
function ordemDasCamadas(): Plugin {
  return {
    name: 'ordem-das-camadas',
    enforce: 'post',
    apply: 'build',
    generateBundle(_opcoes, pacote) {
      for (const item of Object.values(pacote)) {
        if (item.type === 'asset' && item.fileName.endsWith('.css')) {
          item.source = `@layer theme,base,components,utilities;${String(item.source)}`
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? subcaminhoDoBuild(process.env.BASE_SITE) : '/',
  // Um só arquivo de CSS, na ordem de sempre: dividir o CSS por página mudaria a ordem da cascata.
  build: { cssCodeSplit: false },
  plugins: [react(), tailwindcss(), imagetools(), chavePublica(), politicaDeConteudo(), paginaNaoEncontrada(), ordemDasCamadas()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/teste/setup.ts'],
    // Os testes de web/scripts usam o node:test (node --test); o Vitest não os roda.
    exclude: ['**/node_modules/**', '**/dist/**', 'scripts/**'],
    // Metade das CPUs lógicas: deixa folga para o host e para o Chrome do geometria.test.tsx.
    maxWorkers: '50%',
    // O limite padrão de 5 s é apertado num host compartilhado; 20 s ainda falha rápido num teste travado.
    testTimeout: 20000,
  },
}))
