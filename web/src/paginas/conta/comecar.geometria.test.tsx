import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// O passo "Seu nome" (conta incompleta) em Chrome real, com a casca e o CSS do build.
// Mede a sequência inteira em 390/1440 e texto a 100/200%, no tema claro suportado pela rota.
// A captura interativa da rota fica separada: este HTML mede geometria, não autenticação.
// Sem Chrome ou build, o teste falha; rode `npm run build` antes.
const CANDIDATOS_NO_LINUX = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]
const CHROME =
  process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : (process.env.CHROME_PATH ?? CANDIDATOS_NO_LINUX.find((caminho) => existsSync(caminho)) ?? CANDIDATOS_NO_LINUX[0])
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')
const TOLERANCIA = 1
/** O vão entre o rótulo e a caixa, dentro do Campo (gap-2 = 8 px). */
const VAO_DO_CAMPO = 8

interface Janela {
  largura: number
  altura: number
  fonte: 100 | 200
}
interface Caixa {
  top: number
  bottom: number
  height: number
  left: number
  right: number
  width: number
}
interface Medida {
  erro?: string
  innerWidth: number
  clientWidth: number
  scrollWidth: number
  fontes: string
  vaoTitulo: number
  vaoCampos: number
  vaoConclusao: number
  salvarQuebra: string
  salvarScroll: number
  salvarClient: number
  formulario: Caixa
  campoNome: Caixa
  campoFuso: Caixa
  fuso: Caixa
  frase: Caixa
  h1: Caixa
  rotulo: Caixa
  entrada: Caixa
  salvar: Caixa
}

// O Chrome espera as fontes e devolve caixas reais no <pre> serializado por --dump-dom.
const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('geometria')
  const caixa = (el) => {
    if (!el) throw new Error('Elemento obrigatório ausente')
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, height: r.height, left: r.left, right: r.right, width: r.width }
  }
  const escrever = (valor) => {
    const texto = JSON.stringify(valor)
    saida.textContent = texto
    window.parent.postMessage(texto, '*')
  }
  try {
    document.body.offsetWidth
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const formulario = document.querySelector('main form')
    const campo = formulario.querySelector('.cm-campo')
    const h1 = document.querySelector('main h1')
    const fuso = formulario.querySelector('select')
    const salvar = formulario.querySelector('button[type=submit]')
    escrever({
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      fontes: document.fonts.status,
      vaoTitulo: parseFloat(getComputedStyle(h1.parentElement.parentElement).rowGap),
      vaoCampos: parseFloat(getComputedStyle(formulario).rowGap),
      vaoConclusao: parseFloat(getComputedStyle(salvar.parentElement).rowGap),
      salvarQuebra: getComputedStyle(salvar).whiteSpace,
      salvarScroll: salvar.scrollWidth,
      salvarClient: salvar.clientWidth,
      formulario: caixa(formulario),
      campoNome: caixa(campo),
      campoFuso: caixa(fuso.closest('.cm-campo')),
      fuso: caixa(fuso),
      frase: caixa([...formulario.querySelectorAll('p')].find(p => p.textContent.startsWith('Falta pouco.'))),
      h1: caixa(h1),
      rotulo: caixa(campo.querySelector('label')),
      entrada: caixa(campo.querySelector('input')),
      salvar: caixa(salvar),
    })
  } catch (e) {
    escrever({ erro: String(e) })
  }
})()
`

function avisar(texto: string): void {
  console.warn(texto)
  try {
    writeSync(2, `${texto}\n`)
  } catch {
    // o aviso já foi para o console
  }
}

// A limpeza não decide o resultado: no Windows o Chrome pode segurar o perfil (EPERM).
function limparPasta(pasta: string): void {
  try {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 })
  } catch (erro) {
    const e = erro as NodeJS.ErrnoException
    avisar(`Aviso: não deu para remover a pasta temporária ${pasta} (${e.code ?? 'sem código'}): ${e.message}`)
  }
}

function arquivosCss(): string[] {
  return existsSync(PASTA_CSS) ? readdirSync(PASTA_CSS).filter((nome) => nome.endsWith('.css')) : []
}

/** URLs absolutas de fontes do build precisam apontar para o dist numa página file://. */
function cssComFontesDoDist(nome: string): string {
  const base = `${pathToFileURL(PASTA_DIST).href}/`
  return readFileSync(join(PASTA_CSS, nome), 'utf8').replace(/url\((["']?)\/(?!\/)/g, (_t, aspas: string) => `url(${aspas}${base}`)
}

function medirNoChrome(raizHtml: string, janela: Janela): Medida {
  if (!existsSync(CHROME)) throw new Error(`Chrome não encontrado em ${CHROME}`)
  if (arquivosCss().length === 0) throw new Error('Sem web/dist/assets/*.css: rode `npm run build` antes.')
  const pasta = mkdtempSync(join(tmpdir(), 'comecar-geometria-'))
  try {
    const perfil = join(pasta, 'perfil')
    mkdirSync(perfil)
    const folhas = arquivosCss().map((nome, i) => {
      const arquivo = join(pasta, `folha-${i}.css`)
      writeFileSync(arquivo, cssComFontesDoDist(nome), 'utf8')
      return `<link rel="stylesheet" href="${pathToFileURL(arquivo).href}">`
    })
    const pagina = join(pasta, 'pagina.html')
    writeFileSync(
      pagina,
      `<!doctype html><html lang="pt-BR" style="font-size:${janela.fonte}%"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}</head>` +
        `<body><div id="root">${raizHtml}</div><pre id="geometria" hidden></pre><script>${SCRIPT_DE_MEDIDA}</script></body></html>`,
      'utf8',
    )
    // O iframe fixa a largura CSS sem depender da moldura da janela do sistema (inclusive abaixo de 500 px).
    const alvo = join(pasta, 'envoltorio.html')
    writeFileSync(
      alvo,
      `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;display:block;width:${janela.largura}px;height:${janela.altura}px"></iframe><pre id="geometria" hidden></pre>` +
        `<script>addEventListener('message', (e) => { document.getElementById('geometria').textContent = e.data })</script></body></html>`,
      'utf8',
    )
    const resultado = spawnSync(
      CHROME,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        // No Chrome 157 do Linux esta opção mata o processo ("FD ownership violation").
        ...(process.platform === 'win32' ? ['--disable-crashpad-for-testing'] : []),
        '--no-first-run',
        '--allow-file-access-from-files',
        `--user-data-dir=${perfil}`,
        '--force-device-scale-factor=1',
        `--window-size=${Math.max(janela.largura, 600) + (process.platform === 'win32' ? 16 : 0)},${janela.altura}`,
        '--virtual-time-budget=3000',
        '--dump-dom',
        pathToFileURL(alvo).href,
      ],
      { encoding: 'utf8', timeout: 45_000, maxBuffer: 64 * 1024 * 1024 },
    )
    if (resultado.status !== 0 || resultado.signal || resultado.error) {
      throw new Error(`Chrome falhou: status=${resultado.status}, signal=${resultado.signal}, erro=${resultado.error?.message ?? ''}`)
    }
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(resultado.stdout ?? '')
    if (!achado || achado[1].trim() === '') throw new Error(`O Chrome não devolveu a medida em ${janela.largura}x${janela.altura}.`)
    const json = achado[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    return JSON.parse(json) as Medida
  } finally {
    limparPasta(pasta)
  }
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

async function memoriaSemConta() {
  const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
  await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'http://localhost/entrar')
  return dados
}

const perto = (real: number, esperado: number, descricao: string) =>
  expect(Math.abs(real - esperado), `${descricao}: ${real}, esperado ${esperado}`).toBeLessThanOrEqual(TOLERANCIA)

describe('o passo "Seu nome" no Chrome: ritmo e controles contidos no formulário', () => {
  for (const largura of [390, 1440]) {
    for (const fonte of [100, 200] as const) {
      it(`${largura}px, texto ${fonte}%: vãos do tema, ordem de leitura e nenhuma rolagem horizontal`, async () => {
        const dados = await memoriaSemConta()
        const { container } = renderizarComDados('/app/comecar', { dados })
        await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
        const janela: Janela = { largura, altura: largura === 390 ? 844 : 900, fonte }
        const m = medirNoChrome(container.innerHTML, janela)
        expect(m.erro, 'o script de medida falhou no Chrome').toBeUndefined()
        expect(m.innerWidth).toBe(largura)
        expect(m.fontes).toBe('loaded')
        expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth + TOLERANCIA)

        expect(m.vaoTitulo).toBeGreaterThan(0)
        perto(m.rotulo.top - m.h1.bottom, m.vaoTitulo, 'título → rótulo do nome')
        perto(m.entrada.top - m.rotulo.bottom, VAO_DO_CAMPO, 'rótulo → entrada')
        perto(m.campoFuso.top - m.campoNome.bottom, m.vaoCampos, 'nome/ajuda → fuso')
        perto(m.frase.top - m.campoFuso.bottom, m.vaoCampos, 'fuso/ajuda → conclusão')
        perto(m.salvar.top - m.frase.bottom, m.vaoConclusao, 'frase → Salvar')
        expect(m.vaoCampos).toBeGreaterThan(m.vaoConclusao)

        for (const [nome, caixa] of Object.entries({ entrada: m.entrada, fuso: m.fuso, salvar: m.salvar })) {
          perto(caixa.left, m.formulario.left, `${nome}: borda esquerda`)
          perto(caixa.right, m.formulario.right, `${nome}: borda direita`)
          expect(caixa.height, `${nome}: alvo de toque`).toBeGreaterThanOrEqual(44)
          expect(caixa.left).toBeGreaterThanOrEqual(0)
          expect(caixa.right).toBeLessThanOrEqual(m.clientWidth + TOLERANCIA)
        }
        expect(m.salvarQuebra).toBe('normal')
        expect(m.salvarScroll).toBeLessThanOrEqual(m.salvarClient + TOLERANCIA)
        // A 200% o fluxo cresce verticalmente; não encurta nem esconde ajuda para caber na primeira janela.
        if (fonte === 100) expect(m.salvar.bottom).toBeLessThanOrEqual(janela.altura)
      }, 60_000)
    }
  }
})
