import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ErroDados } from '../../dados/comum.ts'
import { Cartao } from '../base/layout/index.ts'
import { AvisoDeErro } from '../rotina/AvisoDeErro.tsx'
import { ERRO_ANINHADO, ErroDaRotina } from './ErroDaRotina.tsx'

// O erro dentro do cartão "Em andamento" do Hoje tem de parecer com os outros cartões de erro da página
// (`AvisoDeErro`): mesmo peso de contorno, mesma cor, mesmo raio. O jsdom não tem layout: o HTML vai para um arquivo
// que liga o CSS do build (web/dist/assets/*.css) e o Chrome sem janela mede. NÃO PULA: sem Chrome ou sem
// `npm run build`, falha.

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')
const TELA = { largura: 390, altura: 844 }

const ERRO: ErroDados = { classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: 'falhou' }

const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('geometria')
  try {
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const medir = (el) => {
      if (!el) return null
      const c = getComputedStyle(el)
      return {
        borderTopWidth: c.borderTopWidth,
        borderTopColor: c.borderTopColor,
        borderTopLeftRadius: c.borderTopLeftRadius,
        outlineStyle: c.outlineStyle,
        classe: el.className,
      }
    }
    const aninhado = document.querySelector('[data-andamento] [role="alert"]')
    const irmao = document.querySelector('[data-pagina-erro] [role="alert"]')
    const texto = JSON.stringify({ aninhado: medir(aninhado), irmao: medir(irmao) })
    saida.textContent = texto
    window.parent.postMessage(texto, '*')
  } catch (e) {
    const texto = JSON.stringify({ erro: String(e) })
    saida.textContent = texto
    window.parent.postMessage(texto, '*')
  }
})()
`

interface Caixa {
  borderTopWidth: string
  borderTopColor: string
  borderTopLeftRadius: string
  outlineStyle: string
  classe: string
}

interface Medida {
  erro?: string
  aninhado: Caixa | null
  irmao: Caixa | null
}

function arquivosCss(): string[] {
  return existsSync(PASTA_CSS) ? readdirSync(PASTA_CSS).filter((nome) => nome.endsWith('.css')) : []
}

function cssComFontesDoDist(nome: string): string {
  const base = `${pathToFileURL(PASTA_DIST).href}/`
  return readFileSync(join(PASTA_CSS, nome), 'utf8').replace(/url\((["']?)\/(?!\/)/g, (_t, aspas: string) => `url(${aspas}${base}`)
}

function textoDoCss(): string {
  return arquivosCss()
    .map((nome) => readFileSync(join(PASTA_CSS, nome), 'utf8'))
    .join('\n')
}

function executarChrome(argumentos: string[], pasta: string): SpawnSyncReturns<string> {
  const arquivoDeSaida = join(pasta, 'medicao.stdout.txt')
  const arquivoDeErros = join(pasta, 'medicao.stderr.txt')
  const saida = openSync(arquivoDeSaida, 'w')
  const erros = openSync(arquivoDeErros, 'w')
  try {
    const resultado = spawnSync(CHROME, argumentos, { stdio: ['ignore', saida, erros], timeout: 45_000, windowsHide: true })
    const stdout = readFileSync(arquivoDeSaida, 'utf8')
    const stderr = readFileSync(arquivoDeErros, 'utf8')
    return { ...resultado, output: [null, stdout, stderr], stdout, stderr }
  } finally {
    closeSync(saida)
    closeSync(erros)
  }
}

function medirNoChrome(html: string, tema: 'claro' | 'madrugada'): Medida {
  const pasta = mkdtempSync(join(tmpdir(), 'erro-aninhado-'))
  try {
    const perfil = join(pasta, 'perfil')
    mkdirSync(perfil)
    const folhas = arquivosCss().map((nome, i) => {
      const arquivo = join(pasta, `folha-${i}.css`)
      writeFileSync(arquivo, cssComFontesDoDist(nome), 'utf8')
      return `<link rel="stylesheet" href="${pathToFileURL(arquivo).href}">`
    })
    const atributoDoTema = tema === 'madrugada' ? ' data-tema="madrugada"' : ''
    const pagina = join(pasta, 'pagina.html')
    writeFileSync(
      pagina,
      `<!doctype html><html lang="pt-BR"${atributoDoTema}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}</head>` +
        `<body><div id="root">${html}</div><pre id="geometria" hidden></pre><script>${SCRIPT_DE_MEDIDA}</script></body></html>`,
      'utf8',
    )
    const alvo = join(pasta, 'envoltorio.html')
    writeFileSync(
      alvo,
      `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;display:block;width:${TELA.largura}px;height:${TELA.altura}px"></iframe><pre id="geometria" hidden></pre>` +
        `<script>addEventListener('message', (e) => { document.getElementById('geometria').textContent = e.data })</script></body></html>`,
      'utf8',
    )
    const resultado = executarChrome(
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-crashpad-for-testing',
        '--no-first-run',
        '--allow-file-access-from-files',
        `--user-data-dir=${perfil}`,
        '--force-device-scale-factor=1',
        `--window-size=${Math.max(TELA.largura, 600) + 16},${TELA.altura + 300}`,
        '--virtual-time-budget=3000',
        '--dump-dom',
        pathToFileURL(alvo).href,
      ],
      pasta,
    )
    if (resultado.status !== 0 || resultado.error || resultado.signal) {
      throw new Error(`O Chrome não terminou limpo (status ${resultado.status}, sinal ${resultado.signal ?? 'nenhum'}): ${resultado.stderr ?? ''}`)
    }
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(resultado.stdout ?? '')
    if (!achado) throw new Error(`O Chrome não devolveu a medida: ${resultado.stderr ?? ''}`)
    return JSON.parse(achado[1]) as Medida
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

function exigirAmbiente(): void {
  if (!existsSync(CHROME)) throw new Error(`Chrome não encontrado em ${CHROME}`)
  if (arquivosCss().length === 0) throw new Error('Sem web/dist/assets/*.css: rode `npm run build` antes.')
}

/** A forma do Hoje.tsx: o cartão "Em andamento" com o erro dentro, e o outro cartão de erro da página ao lado. */
function renderizarPar(): string {
  const { container } = render(
    <main>
      <Cartao
        as="section"
        data-andamento=""
        className="alvo-foco flex flex-col gap-esp-pilha border border-(--cor-fio-suave) bg-(--cor-cartao)"
      >
        <h2 className="text-pequeno font-medium text-(--cor-texto-2)">Em andamento</h2>
        <ErroDaRotina erro={ERRO} papel="responsavel" aoTentarDeNovo={() => undefined} className={ERRO_ANINHADO} />
      </Cartao>
      <div data-pagina-erro="">
        <AvisoDeErro erro={ERRO} papel="responsavel" aoTentarDeNovo={() => undefined} />
      </div>
    </main>,
  )
  return container.innerHTML
}

describe('erro aninhado no cartão "Em andamento" (Chrome, 390x844)', () => {
  for (const tema of ['claro', 'madrugada'] as const) {
    it(`aninhado: contorno, cor e raio iguais aos do AvisoDeErro (${tema})`, () => {
      exigirAmbiente()
      const medida = medirNoChrome(renderizarPar(), tema)
      expect(medida.erro).toBeUndefined()
      expect(medida.aninhado).not.toBeNull()
      expect(medida.irmao).not.toBeNull()
      const a = medida.aninhado!
      const b = medida.irmao!
      expect(a.borderTopWidth).toBe(b.borderTopWidth)
      expect(a.borderTopColor).toBe(b.borderTopColor)
      expect(a.borderTopLeftRadius).toBe(b.borderTopLeftRadius)
    }, 90_000)
  }

  it('foco: sem foco não há anel, e a regra de teclado do build continua (WCAG 2.4.7)', () => {
    exigirAmbiente()
    const medida = medirNoChrome(renderizarPar(), 'claro')
    expect(medida.erro).toBeUndefined()
    expect(medida.aninhado).not.toBeNull()
    const a = medida.aninhado!
    expect(a.outlineStyle).toBe('none')
    expect(a.classe.split(/\s+/)).toContain('alvo-foco')
    const css = textoDoCss()
    const regra = /\.alvo-foco:focus-visible\s*\{([^}]*)\}/.exec(css)
    expect(regra, 'a regra .alvo-foco:focus-visible no CSS do build').not.toBeNull()
    expect(regra![1]).toMatch(/outline:\s*2px solid var\(--cor-foco\)/)
  }, 90_000)
})
