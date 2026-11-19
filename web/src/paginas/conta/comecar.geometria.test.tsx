import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// O passo "Seu nome" de /app/comecar (conta incompleta) num Chrome de verdade. O jsdom não tem layout: aqui o #root
// inteiro da página real (com a casca e o CSS já construído em web/dist/assets) vira um html, e o Chrome sem janela
// mede o h1, o rótulo, a caixa do nome e o botão Salvar com getBoundingClientRect, a 390x844, nos dois temas.
// Esperado: entre a base do h1 e o topo da caixa do nome cabem só o rótulo (altura dele) e UM vão de 8 px (o do
// Campo). Só caixas medidas contam, nunca nomes de classe. Sem Chrome ou sem o build, o teste FALHA (não pula):
// `npm run build` antes.

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

type Tema = 'claro' | 'madrugada'
interface Janela {
  largura: number
  altura: number
  tema: Tema
}
const celular = (tema: Tema): Janela => ({ largura: 390, altura: 844, tema })

interface Caixa {
  top: number
  bottom: number
  height: number
}
interface Medida {
  erro?: string
  innerWidth: number
  scrollWidth: number
  fontes: string
  h1: Caixa | null
  rotulo: Caixa | null
  entrada: Caixa | null
  salvar: Caixa | null
}

// O script de dentro da página: espera as fontes (depois de forçar o primeiro layout) e escreve a medida em JSON
// num <pre> escondido, que o --dump-dom devolve.
const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('geometria')
  const caixa = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, height: r.height }
  }
  const escrever = (texto) => {
    saida.textContent = texto
    if (window.parent !== window) window.parent.postMessage(texto, '*')
  }
  try {
    document.body.offsetWidth
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const campo = document.querySelector('main form .cm-campo')
    escrever(JSON.stringify({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      fontes: document.fonts.status,
      h1: caixa(document.querySelector('main h1')),
      rotulo: caixa(campo && campo.querySelector('label')),
      entrada: caixa(campo && campo.querySelector('input')),
      salvar: caixa(document.querySelector('main form button[type=submit]')),
    }))
  } catch (e) {
    escrever(JSON.stringify({ erro: String(e), innerWidth: 0, scrollWidth: 0, fontes: '', h1: null, rotulo: null, entrada: null, salvar: null }))
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

// A limpeza da pasta temporária nunca decide o resultado: no Windows o Chrome pode segurar o perfil (EPERM).
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

/** O CSS do build aponta as fontes por `/assets/...`: numa página file:// isso vira a raiz do disco, então as URLs absolutas passam a apontar para o dist. */
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
      `<!doctype html><html lang="pt-BR"${janela.tema === 'madrugada' ? ' data-tema="madrugada"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}</head>` +
        `<body><div id="root">${raizHtml}</div><pre id="geometria" hidden></pre><script>${SCRIPT_DE_MEDIDA}</script></body></html>`,
      'utf8',
    )
    // O Chrome sem janela não passa de ~500 px de largura: abaixo disso a página vai num iframe da largura (e da
    // altura) pedida, e devolve a medida por postMessage.
    let alvo = pagina
    if (janela.largura < 500) {
      alvo = join(pasta, 'envoltorio.html')
      writeFileSync(
        alvo,
        `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;display:block;width:${janela.largura}px;height:${janela.altura}px"></iframe><pre id="geometria" hidden></pre>` +
          `<script>addEventListener('message', (e) => { document.getElementById('geometria').textContent = e.data })</script></body></html>`,
        'utf8',
      )
    }
    const resultado = spawnSync(
      CHROME,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        // CI-UBUNTU: no Chrome 157 do Linux esta opção mata o processo ("FD ownership violation"); no Windows ela fica.
        ...(process.platform === 'win32' ? ['--disable-crashpad-for-testing'] : []),
        '--no-first-run',
        '--allow-file-access-from-files',
        `--user-data-dir=${perfil}`,
        '--force-device-scale-factor=1',
        // No Windows o Chrome sem janela soma 16 px de moldura: com +16 o innerWidth fica igual à largura pedida.
        `--window-size=${Math.max(janela.largura, 600) + (process.platform === 'win32' ? 16 : 0)},${janela.altura}`,
        '--virtual-time-budget=3000',
        '--dump-dom',
        pathToFileURL(alvo).href,
      ],
      { encoding: 'utf8', timeout: 45_000, maxBuffer: 64 * 1024 * 1024 },
    )
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(resultado.stdout ?? '')
    if (!achado || achado[1].trim() === '') throw new Error(`O Chrome não devolveu a medida em ${janela.largura}x${janela.altura}.`)
    // O --dump-dom serializa o texto do <pre> com entidades HTML (aspas, &, <).
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

/** A conta incompleta: o usuário existe, mas a conta (nome e fuso) ainda não foi criada. */
async function memoriaSemConta() {
  const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
  await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'http://localhost/entrar')
  return dados
}

const arredondar = (valor: number) => Math.round(valor * 10) / 10

describe('o passo "Seu nome" de /app/comecar no Chrome, 390x844', () => {
  for (const tema of ['claro', 'madrugada'] as const) {
    it(
      `tema ${tema}: o campo do nome fica logo abaixo do h1 (rótulo + um vão), o Salvar cabe na janela e a página não rola na horizontal`,
      async () => {
        const dados = await memoriaSemConta()
        const { container } = renderizarComDados('/app/comecar', { dados })
        await screen.findByRole('heading', { level: 2, name: 'Seu nome' })
        const janela = celular(tema)
        const medida = medirNoChrome(container.innerHTML, janela)

        expect(medida.erro, 'o script de medida falhou no Chrome').toBeUndefined()
        expect(medida.innerWidth, 'a largura da janela do Chrome').toBe(janela.largura)
        expect(medida.fontes, 'as fontes carregaram').toBe('loaded')
        const { h1, rotulo, entrada, salvar } = medida
        expect(h1, 'o h1 não foi medido').not.toBeNull()
        expect(rotulo, 'o rótulo do nome não foi medido').not.toBeNull()
        expect(entrada, 'a caixa do nome não foi medida').not.toBeNull()
        expect(salvar, 'o botão Salvar não foi medido').not.toBeNull()

        // Entre o h1 e a caixa do nome: o rótulo e o único vão do Campo (8 px). Nenhum vão local a mais.
        const vao = entrada!.top - h1!.bottom
        const limite = rotulo!.height + VAO_DO_CAMPO + TOLERANCIA
        expect(
          vao,
          `h1.bottom ${arredondar(h1!.bottom)} -> input.top ${arredondar(entrada!.top)} = ${arredondar(vao)} px; cabem no máximo ${arredondar(limite)} (rótulo ${arredondar(rotulo!.height)} + ${VAO_DO_CAMPO} + ${TOLERANCIA})`,
        ).toBeLessThanOrEqual(limite)
        // O rótulo vem depois do h1 e antes da caixa.
        expect(rotulo!.top, 'o rótulo fica abaixo do h1').toBeGreaterThanOrEqual(h1!.bottom - TOLERANCIA)
        expect(entrada!.top, 'a caixa fica abaixo do rótulo').toBeGreaterThanOrEqual(rotulo!.bottom - TOLERANCIA)

        expect(salvar!.bottom, `Salvar termina em ${arredondar(salvar!.bottom)}, depois da janela (${janela.altura})`).toBeLessThanOrEqual(janela.altura)
        expect(medida.scrollWidth, `scrollWidth ${medida.scrollWidth} passa de innerWidth ${medida.innerWidth}`).toBeLessThanOrEqual(medida.innerWidth + TOLERANCIA)
      },
      60_000,
    )
  }
})
