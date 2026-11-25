import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { renderizarRota } from '../../teste/renderizarRota.tsx'
import { EMAIL_CONTATO } from '../../conteudo/publicas-texto.ts'

// F8-1: a placa de rua em noite. A abertura tem a altura do próprio texto (170 px em 1440, 240 px em 390; 240 e 340 com ação),
// um bloco só com o cabeçalho (de noite), com a rua rente à borda direita e à altura da faixa (em 390, uma linha no pé);
// o índice fica grudado na linha de âncora com o marcador no link atual, e o Contato (duas seções) não tem índice. Isto
// troca as réguas do REP-T2 (S-18: faixa de 400 px no mínimo e placa de 340 px de chão a chão), assinadas antes.
// Fotos e medidas saem em densidade 2 para `.oc/olhar/texto` e `.oc/medidas`, com o prefixo da rodada (antes_ ou depois_).
// VIS-4, as seis páginas de texto: a abertura (título, frase, botão e placa) medida num Chrome de
// verdade. O jsdom não tem layout: o corpo serializado vai para uma página com o CSS e as imagens do build
// (`web/dist`), numa janela de 1440 x 900 (a leitura no computador) e de 390 x 844 (o celular). Sem Chrome ou
// sem build o teste pula e diz por quê; em CI falha. O executor do Chrome repete o de `casca/geometria.test.tsx`:
// um auxiliar compartilhado seria um arquivo novo fora do que esta unidade pode editar.
// VIS-4-r3: a medida de leitura conta as linhas cheias de todo parágrafo que quebra em 2 linhas ou mais (I-03), as
// linhas do h1 têm de caber na coluna do h1 a 1100 e a 1440 (I-02), e controles negativos puros provam as duas réguas (I-04).

const CANDIDATOS_DO_CHROME: Record<string, string[]> = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
}
const BUSCADOS = [
  ...(process.env.CHROME_PATH ? [process.env.CHROME_PATH] : []),
  ...(CANDIDATOS_DO_CHROME[process.platform] ?? []),
]
const CHROME: string = BUSCADOS.find((caminho) => existsSync(caminho)) ?? BUSCADOS[0] ?? 'chrome'
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')
const PASTA_DAS_FOTOS = resolve(import.meta.dirname, '..', '..', '..', '..', '.oc', 'olhar', 'texto')
const ALTURA_DA_FOTO = 2600
// As fotos (só onde a pasta `.oc/olhar/texto` existe) saem em densidade 2, com este prefixo no nome do arquivo.
const PREFIXO_DAS_FOTOS = 'depois_'
const DENSIDADE_DAS_FOTOS = 2
// Cada medida abre o Chrome (e, com a pasta das fotos, uma segunda vez): numa máquina carregada passa de 60 s.
const TEMPO_DO_CHROME = 240_000

/** Escreve um relatório curto em `.oc/medidas` (só onde a pasta de trabalho existe), com o prefixo da rodada. */
function escreverMedidas(nome: string, linhas: string[]): void {
  const pasta = resolve(import.meta.dirname, '..', '..', '..', '..', '.oc', 'medidas')
  if (!existsSync(resolve(pasta, '..'))) return
  mkdirSync(pasta, { recursive: true })
  writeFileSync(join(pasta, `${PREFIXO_DAS_FOTOS}${nome}`), linhas.join('\n') + '\n', 'utf8')
}

function arquivosCss(): string[] {
  return existsSync(PASTA_CSS) ? readdirSync(PASTA_CSS).filter((nome) => nome.endsWith('.css')) : []
}

const motivoDoPulo: string | null = !existsSync(CHROME)
  ? `Chrome não encontrado (buscado em: ${BUSCADOS.join(', ') || 'nenhum caminho para ' + process.platform}; defina CHROME_PATH)`
  : arquivosCss().length === 0
    ? 'sem web/dist/assets/*.css: rode `npm run build` antes'
    : null
const exigirNoCI = Boolean(process.env.CI)

const PAGINAS = [
  '/regras-da-comunidade',
  '/privacidade',
  '/termos',
  '/exclusao-de-conta',
  '/contato',
  '/sobre',
] as const

interface Caixa {
  x: number
  right: number
  y: number
  bottom: number
  width: number
  height: number
}

/** Uma linha do h1: o texto e o menor left e o maior right das letras dela. */
interface LinhaDoH1 {
  texto: string
  esquerda: number
  direita: number
}

/** O h1 da abertura: a caixa de conteúdo (sem padding nem borda) e cada linha com seus limites. */
interface H1Medido {
  colunaEsquerda: number
  colunaDireita: number
  linhas: LinhaDoH1[]
}

interface Medida {
  erro?: string
  innerWidth: number
  innerHeight: number
  fontes: string
  scrollWidth: number
  /** A faixa de cacau da abertura (`.pt-abertura`) e a placa da rua dentro dela (`.pt-placa`). */
  abertura: Caixa
  placa: Caixa
  /** A coluna do texto da abertura (`.pt-cabeca`). */
  cabeca: Caixa
  /** O índice "Nesta página" (`.pt-indice`; null com menos de três seções), a coluna de leitura (`.pt-leitura`) e o primeiro `h2` dela. */
  indice: Caixa | null
  leitura: Caixa
  primeiroH2: Caixa
  /** O tamanho de letra computado do `h1` e o maior entre as demais letras de `main`. */
  h1Tamanho: number
  maiorOutroTamanho: number
  /** O primeiro `p` de mais de 60 letras da segunda seção da página (a de leitura); o `cm-lide` conta quando é longo. */
  primeiroParagrafo: Caixa | null
  /** O `text-wrap` computado do primeiro parágrafo de leitura e do primeiro `h2`. */
  quebraDoParagrafo: string
  quebraDoTitulo: string
  /** Letras por linha (média) dos parágrafos de leitura de mais de 150 letras. */
  letrasPorLinha: number[]
  /**
   * Os parágrafos de `.pt-texto p` da segunda seção que quebram em 2 linhas ou mais: para cada um, as letras de cada
   * linha (`trim().length`, a mesma unidade do total), em ordem. Só letras visíveis (retângulo com largura).
   */
  linhasDosParagrafos: number[][]
  /** O h1 da abertura: a coluna dele e as linhas medidas letra a letra. */
  h1: H1Medido
  /** O bloco de e-mail, o botão, o endereço e as linhas do endereço: só em /contato, null nas outras páginas. */
  email: Caixa | null
  emailBotao: Caixa | null
  emailEndereco: Caixa | null
  enderecoLinhas: number | null
  /** F8-1: o `scrollY` lido de volta depois da rolagem pedida e a densidade real da janela. */
  scrollY?: number
  densidade?: number
  /** F8-1: a altura do documento, a caixa do rodapé e a do índice depois da rolagem (null sem índice ou sem rodapé). */
  alturaDoDocumento?: number
  rodape?: Caixa | null
  indiceRolado?: Caixa | null
  /** F8-1: o `position` e o `max-block-size` computados do `<nav>` do índice, e a linha de âncora (`scroll-padding-top`). */
  indicePosicao?: string
  indiceMaxAltura?: string
  ancora?: number
  /** F8-1: a transição do marcador (`::before` do link atual) e quantos links têm `aria-current`. */
  marcadorTransicao?: string
  marcadorEscala?: string
  /** F8-1: quantas transições de transform o marcador começou ao virar o atual e a duração da primeira (ms). */
  marcadorTransicoes?: number
  marcadorDuracao?: number
  linksAtuais?: number
  /** F8-1: o cabeçalho do site (tom e a pílula "Criar conta": contorno ou mel) e o `h1` (altura da linha). */
  cabecalhoTom?: string
  cabecalhoPilulaFundo?: string
  /** F8-1: a rua (`.pt-placa`): a imagem servida e a razão arquivo/css (largura natural ÷ largura em css × densidade). */
  ruaArquivo?: string
  ruaRazao?: number
  ruaObjeto?: string
  /** F8-1: os pixels de mel dentro da abertura: contagem de pixels de fundo de cor mel nos elementos (devem ser só a ação). */
  elementosComMel?: string[]
  /** F8-1: a caixa do h1 e da frase de abertura, a última linha de texto da abertura e a caixa da placa em relação ao texto. */
  h1Caixa?: Caixa
  lideCaixa?: Caixa | null
  acaoCaixa?: Caixa | null
  /** F8-1: a primeira seção do Contato e a segunda (lado a lado): as duas caixas, ou null. */
  secoesDoContato?: Caixa[]
  /** F8-1: o `padding-block` e o `min-block-size` computados da abertura. */
  aberturaPaddingBloco?: string
  aberturaMinBloco?: string
}

/** O que a medida de F8-1 pode pedir à página: rolar, marcar um link, movimento reduzido e o nome da foto. */
interface Extras {
  rolar?: number | 'fim'
  marcar?: 'auto'
  reduzido?: boolean
  nomeDaFoto?: string
  alturaDaFoto?: number
  raiz?: number
}

// O script de dentro da página: espera as fontes e as imagens e escreve a medida em JSON num <pre>.
const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('geometria')
  const emitir = (objeto) => {
    const texto = JSON.stringify(objeto)
    saida.textContent = texto
    if (window.parent !== window) window.parent.postMessage(texto, '*')
  }
  try {
    document.body.offsetWidth
    for (const img of document.images) img.loading = 'eager'
    // A placa da rua: o arquivo mais largo do build (o harness tirou os endereços de desenvolvimento dela).
    const imgDaRua = document.querySelector('main .pt-placa img')
    const ruas = window.__RUAS || []
    if (imgDaRua && ruas.length > 0) {
      const lidas = await Promise.all(ruas.map((url) => new Promise((r) => {
        const img = new Image()
        img.onload = () => r([url, img.naturalWidth])
        img.onerror = () => r([url, 0])
        img.src = url
      })))
      lidas.sort((a, b) => b[1] - a[1])
      imgDaRua.src = lidas[0][0]
    }
    await document.fonts.ready
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r }))))
    await new Promise((r) => setTimeout(r, 100))
    // F8-1: o que o teste pediu (tamanho do texto da raiz, um link marcado, a rolagem).
    const pedido = window.__PEDIDO || {}
    if (pedido.raiz) document.documentElement.style.fontSize = pedido.raiz + 'px'
    if (pedido.rolar) {
      window.scrollTo(0, pedido.rolar === 'fim' ? 1e7 : pedido.rolar)
      await new Promise((r) => setTimeout(r, 200))
    }
    // O harness é HTML estático (sem React): o link atual da foto é posto aqui, pela regra do índice (o último h2 na
    // linha de âncora ou acima dela; o primeiro no topo). O comportamento real do observador é o do teste de jsdom.
    if (pedido.marcar === 'auto') {
      // O corpo serializado já traz o primeiro link marcado (o estado inicial do React): a foto parte do zero.
      for (const marcado of document.querySelectorAll('.pt-indice-link[aria-current]')) marcado.removeAttribute('aria-current')
      const linha = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + 1
      const titulos = [...document.querySelectorAll('main .pt-leitura h2')]
      let atual = 0
      titulos.forEach((titulo, i) => { if (titulo.getBoundingClientRect().top <= linha) atual = i })
      const alvo = document.querySelectorAll('.pt-indice-link')[atual]
      if (alvo) {
        alvo.setAttribute('aria-current', 'location')
        // O relógio das animações não anda no tempo virtual do Chrome sem janela: a medida conta as transições que o
        // marcador começou (a de transform, 160 ms; nenhuma com movimento reduzido) e as termina, para ler o estado final.
        getComputedStyle(alvo, '::before').transform
        const iniciadas = document.getAnimations().filter((a) => a.transitionProperty === 'transform')
        window.__TRANSICOES = iniciadas.length
        window.__DURACAO = iniciadas.length > 0 ? iniciadas[0].effect.getComputedTiming().duration : 0
        for (const a of document.getAnimations()) a.finish()
      }
    }
    const caixa = (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width, height: r.height }
    }
    const um = (seletor) => {
      const el = document.querySelector(seletor)
      if (!el) throw new Error('sem ' + seletor)
      return el
    }
    const segundaSecao = document.querySelector('main').children[1]
    const paragrafo = [...segundaSecao.querySelectorAll('p')].find((p) => p.textContent.trim().length > 60) ?? null
    const letrasPorLinha = []
    for (const p of segundaSecao.querySelectorAll('.pt-texto p')) {
      const total = p.textContent.trim().length
      if (total <= 150) continue
      const intervalo = document.createRange()
      intervalo.selectNodeContents(p)
      const topos = new Set([...intervalo.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)))
      letrasPorLinha.push(total / Math.max(1, topos.size))
    }
    // VIS-4-r3-I-03: todo parágrafo de leitura da segunda seção, de qualquer tamanho. Cada letra visível vai para a
    // linha do seu topo; o texto de cada linha sai em ordem do DOM e conta por trim().length.
    const linhasDosParagrafos = []
    for (const p of segundaSecao.querySelectorAll('.pt-texto p')) {
      const porTopoDoParagrafo = new Map()
      const caminhante = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
      while (caminhante.nextNode()) {
        const no = caminhante.currentNode
        const faixa = document.createRange()
        for (let i = 0; i < no.length; i++) {
          faixa.setStart(no, i)
          faixa.setEnd(no, i + 1)
          const retangulos = [...faixa.getClientRects()].filter((r) => r.width > 0)
          if (retangulos.length === 0) continue
          const topo = Math.round(retangulos[0].top)
          porTopoDoParagrafo.set(topo, (porTopoDoParagrafo.get(topo) || '') + no.data[i])
        }
      }
      const linhasDoParagrafo = [...porTopoDoParagrafo.entries()].sort((a, b) => a[0] - b[0]).map((par) => par[1].trim().length)
      if (linhasDoParagrafo.length >= 2) linhasDosParagrafos.push(linhasDoParagrafo)
    }
    // VIS-4-r3-I-02: o h1 letra a letra (o método de escalaTipo.geometria.test.tsx): cada linha por Math.round(top),
    // com o menor left e o maior right; a coluna é a caixa do h1 sem padding nem borda.
    const h1 = um('main .pt-abertura h1')
    const linhasDoH1 = new Map()
    const limitesDoH1 = new Map()
    const caminhanteDoH1 = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT)
    while (caminhanteDoH1.nextNode()) {
      const no = caminhanteDoH1.currentNode
      if (no.parentElement.closest('.sr-only')) continue
      const faixa = document.createRange()
      for (let i = 0; i < no.length; i++) {
        faixa.setStart(no, i)
        faixa.setEnd(no, i + 1)
        const retangulos = faixa.getClientRects()
        if (retangulos.length === 0) continue
        const topo = Math.round(retangulos[0].top)
        linhasDoH1.set(topo, (linhasDoH1.get(topo) || '') + no.data[i])
        const limite = limitesDoH1.get(topo) || { esquerda: Infinity, direita: -Infinity }
        for (const retangulo of retangulos) {
          limite.esquerda = Math.min(limite.esquerda, retangulo.left)
          limite.direita = Math.max(limite.direita, retangulo.right)
        }
        limitesDoH1.set(topo, limite)
      }
    }
    const arredondar = (n) => Math.round(n * 10) / 10
    const estiloDoH1 = getComputedStyle(h1)
    const caixaDoH1 = h1.getBoundingClientRect()
    const h1Medido = {
      colunaEsquerda: arredondar(caixaDoH1.left + parseFloat(estiloDoH1.paddingLeft) + parseFloat(estiloDoH1.borderLeftWidth)),
      colunaDireita: arredondar(caixaDoH1.right - parseFloat(estiloDoH1.paddingRight) - parseFloat(estiloDoH1.borderRightWidth)),
      linhas: [...linhasDoH1.entries()].sort((a, b) => a[0] - b[0]).map((par) => ({
        texto: par[1].trim(),
        esquerda: arredondar(limitesDoH1.get(par[0]).esquerda),
        direita: arredondar(limitesDoH1.get(par[0]).direita),
      })),
    }
    // REP-T2: o h1 é a maior letra da página? O maior tamanho computado entre os elementos de main que têm texto próprio
    // (o h1 e o que está dentro dele ficam de fora).
    let maiorOutroTamanho = 0
    for (const el of document.querySelectorAll('main *')) {
      if (el.closest('h1')) continue
      const temTexto = [...el.childNodes].some((no) => no.nodeType === 3 && no.data.trim().length > 0)
      if (temTexto) maiorOutroTamanho = Math.max(maiorOutroTamanho, parseFloat(getComputedStyle(el).fontSize))
    }
    const talvezCaixa = (seletor) => {
      const el = document.querySelector(seletor)
      return el ? caixa(el) : null
    }
    // VIS-4-r4-I-04: o cartão de e-mail (só em /contato; null nas outras): o botão, o endereço e as linhas do endereço.
    let enderecoLinhas = null
    const enderecoEl = document.querySelector('main .pt-email address')
    if (enderecoEl) {
      const topos = new Set()
      const caminhanteDoEndereco = document.createTreeWalker(enderecoEl, NodeFilter.SHOW_TEXT)
      while (caminhanteDoEndereco.nextNode()) {
        const no = caminhanteDoEndereco.currentNode
        const faixa = document.createRange()
        for (let i = 0; i < no.length; i++) {
          faixa.setStart(no, i)
          faixa.setEnd(no, i + 1)
          for (const r of faixa.getClientRects()) if (r.width > 0) topos.add(Math.round(r.top))
        }
      }
      enderecoLinhas = topos.size
    }
    // F8-1: o índice depois da rolagem, o rodapé, o marcador, o cabeçalho, a rua e o mel da abertura.
    const nav = document.querySelector('main .pt-indice')
    const estiloDoNav = nav ? getComputedStyle(nav) : null
    const atual = document.querySelector('main .pt-indice-link[aria-current="location"]')
    const estiloDoMarcador = atual ? getComputedStyle(atual, '::before') : null
    const rodape = document.querySelector('[data-rodape], body > div > footer, footer')
    const cabecalho = document.querySelector('header[data-cabecalho]')
    const pilula = cabecalho ? cabecalho.querySelector('a.cm-botao, .cm-botao') : null
    const rua = document.querySelector('main .pt-placa img')
    const MEL = 'rgb(242, 193, 78)'
    const elementosComMel = [...document.querySelectorAll('main .pt-abertura, main .pt-abertura *')]
      .filter((el) => {
        const e = getComputedStyle(el)
        return e.backgroundColor === MEL || e.borderTopColor === MEL
      })
      .map((el) => el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0])
    const estiloDaAbertura = getComputedStyle(document.querySelector('main .pt-abertura-grade'))
    const lide = document.querySelector('main .pt-abertura .cm-lide')
    const acao = document.querySelector('main .pt-abertura .pt-acao, main .pt-abertura .pt-email')
    const secoesDoContato = [...document.querySelectorAll('main .pt-leitura > section')].map((el) => caixa(el))
    const extrasF81 = {
      scrollY: window.scrollY,
      densidade: window.devicePixelRatio,
      alturaDoDocumento: document.documentElement.scrollHeight,
      rodape: rodape ? caixa(rodape) : null,
      indiceRolado: nav ? caixa(nav) : null,
      indicePosicao: estiloDoNav ? estiloDoNav.position : undefined,
      indiceMaxAltura: estiloDoNav ? estiloDoNav.maxBlockSize : undefined,
      ancora: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
      marcadorTransicao: estiloDoMarcador ? estiloDoMarcador.transitionDuration : undefined,
      marcadorEscala: estiloDoMarcador ? estiloDoMarcador.transform : undefined,
      marcadorTransicoes: window.__TRANSICOES || 0,
      marcadorDuracao: window.__DURACAO || 0,
      linksAtuais: document.querySelectorAll('main .pt-indice-link[aria-current="location"]').length,
      cabecalhoTom: cabecalho ? cabecalho.getAttribute('data-tom') : null,
      cabecalhoPilulaFundo: pilula ? getComputedStyle(pilula).backgroundColor : null,
      ruaArquivo: rua ? rua.currentSrc.split('/').pop() + ' ' + rua.naturalWidth + 'x' + rua.naturalHeight : null,
      // Pixels do arquivo por pixel físico: 1 ÷ (px css por px de arquivo × densidade). Com object-fit cover vale o maior dos dois fatores.
      ruaRazao: rua && rua.naturalWidth
        ? 1 / (Math.max(rua.getBoundingClientRect().width / rua.naturalWidth, rua.getBoundingClientRect().height / rua.naturalHeight) * window.devicePixelRatio)
        : null,
      ruaObjeto: rua ? getComputedStyle(rua).objectFit + ' ' + getComputedStyle(rua).objectPosition : null,
      elementosComMel,
      h1Caixa: caixa(h1),
      lideCaixa: lide ? caixa(lide) : null,
      acaoCaixa: acao ? caixa(acao) : null,
      secoesDoContato,
      aberturaPaddingBloco: estiloDaAbertura.paddingTop + ' ' + estiloDaAbertura.paddingBottom,
      aberturaMinBloco: estiloDaAbertura.minBlockSize,
    }
    emitir({
      ...extrasF81,
      email: talvezCaixa('main .pt-email'),
      emailBotao: talvezCaixa('main .pt-email a'),
      emailEndereco: talvezCaixa('main .pt-email address'),
      enderecoLinhas,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      fontes: document.fonts.status,
      scrollWidth: document.documentElement.scrollWidth,
      abertura: caixa(um('main .pt-abertura')),
      placa: caixa(um('main .pt-placa')),
      cabeca: caixa(um('main .pt-cabeca')),
      indice: nav ? caixa(nav) : null,
      leitura: caixa(um('main .pt-leitura')),
      primeiroH2: caixa(um('main .pt-leitura h2')),
      h1Tamanho: parseFloat(estiloDoH1.fontSize),
      maiorOutroTamanho,
      primeiroParagrafo: paragrafo ? caixa(paragrafo) : null,
      quebraDoParagrafo: paragrafo ? getComputedStyle(paragrafo).textWrap : '',
      quebraDoTitulo: getComputedStyle(um('main h2')).textWrap,
      letrasPorLinha,
      linhasDosParagrafos,
      h1: h1Medido,
    })
  } catch (e) {
    emitir({ erro: String(e) })
  }
})()
`

/** Os `m11-janela-542w-*.webp` do build (os arquivos da placa da rua): a página escolhe o mais largo pelo `naturalWidth`. */
function arquivosDaRuaNoDist(): string[] {
  return readdirSync(PASTA_CSS)
    .filter((nome) => /^m11-janela-542w-.+\.webp$/.test(nome))
    .map((nome) => `${pathToFileURL(PASTA_DIST).href}/assets/${nome}`)
}

/**
 * Na renderização do vitest a placa da rua sai com endereços do servidor de desenvolvimento (`/@imagetools/<hash>`), que
 * não existem no dist. O harness tira o `<source>` e o `srcset`; a página (ver `SCRIPT_DE_MEDIDA`) aponta a `<img>` para o
 * arquivo mais largo do build, para `currentSrc` e `naturalWidth` serem os do arquivo de verdade.
 */
function semEnderecosDeDesenvolvimento(corpo: string): string {
  return corpo
    .replace(/<source[^>]*\/@imagetools\/[^>]*>/g, '')
    .replace(/ srcset="[^"]*\/@imagetools\/[^"]*"/g, '')
    .replace(/ src="\/@imagetools\/[^"]*"/g, ' src="data:,"')
}

/** O CSS do build aponta fontes e imagens por `/...`: numa página file:// isso vira a raiz do disco, então apontam para o dist. */
function comArquivosDoDist(texto: string): string {
  const base = `${pathToFileURL(PASTA_DIST).href}/`
  return texto.replace(/url\((["']?)\/(?!\/)/g, (_t, aspas: string) => `url(${aspas}${base}`)
}

/** Mata o Chrome e todos os filhos: o grupo inteiro no POSIX (spawn detached), a árvore no Windows. */
function matarGrupo(pid: number, filho: ChildProcess): void {
  if (process.platform === 'win32') {
    try {
      filho.kill()
    } catch {
      // já terminou
    }
    try {
      spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, timeout: 5_000 })
    } catch {
      // já terminou
    }
    return
  }
  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    // grupo já terminou
  }
}

interface ResultadoDoChrome {
  status: number | null
  erro: string | null
  expirou: boolean
  saida: string
  erroPadrao: string
}

/**
 * Roda o Chrome com spawn assíncrono, saída em arquivos (nunca em pipes: os filhos do Chrome que sobrevivem não seguram
 * nada que nos bloqueie), grupo de processos próprio morto inteiro no fim e todo await limitado no tempo (45 s + 3 s).
 */
async function executarChrome(argumentos: string[], arquivoDeSaida: string, arquivoDeErro: string): Promise<ResultadoDoChrome> {
  const fdSaida = openSync(arquivoDeSaida, 'w')
  const fdErro = openSync(arquivoDeErro, 'w')
  let filho: ChildProcess | null = null
  let terminou: Promise<{ status: number | null; erro: string | null }> | null = null
  let expirou = false
  // O resultado do filho fica aqui assim que ele termina: depois do limite e da limpeza nunca se espera de novo uma promise pendente.
  let final: { status: number | null; erro: string | null } | null = null
  try {
    const alvoDoFilho = spawn(CHROME, argumentos, {
      stdio: ['ignore', fdSaida, fdErro],
      detached: process.platform !== 'win32',
      windowsHide: true,
    })
    filho = alvoDoFilho
    terminou = new Promise((resolver) => {
      alvoDoFilho.once('error', (erro) => {
        final = { status: null, erro: erro.message }
        resolver(final)
      })
      alvoDoFilho.once('exit', (status) => {
        final = { status, erro: null }
        resolver(final)
      })
    })
    let relogio: NodeJS.Timeout | undefined
    const limite = new Promise<'tempo'>((resolver) => {
      relogio = setTimeout(() => resolver('tempo'), 45_000)
    })
    expirou = (await Promise.race([terminou, limite]).finally(() => clearTimeout(relogio))) === 'tempo'
  } finally {
    if (filho?.pid !== undefined) matarGrupo(filho.pid, filho)
    // Depois do kill, espera o exit por um instante antes de fechar os arquivos.
    if (terminou) {
      let espera: NodeJS.Timeout | undefined
      await Promise.race([
        terminou,
        new Promise((resolver) => {
          espera = setTimeout(resolver, 3_000)
        }),
      ]).finally(() => clearTimeout(espera))
    }
    closeSync(fdSaida)
    closeSync(fdErro)
  }
  // Sem await: se o Chrome não emitiu exit nem error mesmo depois do kill e dos 3 s de espera, falha aqui com mensagem clara.
  const resultado = final as { status: number | null; erro: string | null } | null
  if (!resultado) throw new Error('o Chrome não encerrou nem depois do kill (sem exit/error em 3 s)')
  return {
    status: resultado.status,
    erro: resultado.erro,
    expirou,
    saida: readFileSync(arquivoDeSaida, 'utf8'),
    erroPadrao: readFileSync(arquivoDeErro, 'utf8'),
  }
}

async function medirNoChrome(
  corpoHtml: string,
  largura: number,
  altura: number,
  foto: string | null,
  extras: Extras = {},
): Promise<Medida> {
  const pasta = mkdtempSync(join(tmpdir(), 'cm-abertura-'))
  try {
    const perfil = join(pasta, 'perfil')
    mkdirSync(perfil)
    const folhas = arquivosCss().map((nome, i) => {
      const arquivo = join(pasta, `folha-${i}.css`)
      writeFileSync(arquivo, comArquivosDoDist(readFileSync(join(PASTA_CSS, nome), 'utf8')), 'utf8')
      return `<link rel="stylesheet" href="${pathToFileURL(arquivo).href}">`
    })
    const base = `${pathToFileURL(PASTA_DIST).href}/`
    // `assets`: a placa da rua (vite-imagetools) sai do build em /assets/, com hash no nome.
    const corpo = semEnderecosDeDesenvolvimento(
      corpoHtml.replace(/(["'\s,])\/(ilustracoes|cenas|assets)\//g, (_t, antes: string, pasta2: string) => `${antes}${base}${pasta2}/`),
    )
    const pagina = join(pasta, 'pagina.html')
    writeFileSync(
      pagina,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}</head>` +
        `<body>${corpo}<pre id="geometria" hidden></pre><script>window.__PEDIDO=${JSON.stringify({ rolar: extras.rolar, marcar: extras.marcar, raiz: extras.raiz })};window.__RUAS=${JSON.stringify(arquivosDaRuaNoDist())}</script><script>${SCRIPT_DE_MEDIDA}</script></body></html>`,
      'utf8',
    )
    // O Chrome sem janela não passa de ~500 px de largura: a página vai num iframe da largura e da altura pedidas
    // (as media queries respondem à largura do iframe) e devolve a medida por postMessage.
    const envoltorio = join(pasta, 'envoltorio.html')
    writeFileSync(
      envoltorio,
      `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;width:${largura}px;height:${altura}px"></iframe><pre id="geometria" hidden></pre>` +
        `<script>addEventListener('message', (e) => { document.getElementById('geometria').textContent = e.data })</script></body></html>`,
      'utf8',
    )
    const resultado = await executarChrome(
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        ...(process.platform === 'win32' ? ['--disable-crashpad-for-testing'] : []),
        '--no-first-run',
        '--allow-file-access-from-files',
        `--user-data-dir=${perfil}`,
        `--force-device-scale-factor=${DENSIDADE_DAS_FOTOS}`,
        ...(extras.reduzido ? ['--force-prefers-reduced-motion'] : []),
        `--window-size=${Math.max(largura, 600) + 16},${altura + 100}`,
        '--virtual-time-budget=4000',
        '--dump-dom',
        pathToFileURL(envoltorio).href,
      ],
      join(pasta, 'saida.txt'),
      join(pasta, 'erro.txt'),
    )
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(resultado.saida)
    if (!achado) {
      const mensagem = resultado.erro ?? (resultado.expirou ? 'tempo esgotado (45000 ms)' : 'nenhum')
      throw new Error(`O Chrome não devolveu a medida (status ${resultado.status}, erro ${mensagem}): ${resultado.erroPadrao}`)
    }
    const texto = achado[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    if (foto && existsSync(PASTA_DAS_FOTOS)) {
      // Só na máquina de quem tem a pasta `.oc/olhar` (o conferidor de telas do cartão): a página inteira num PNG,
      // para olhar. Em CI a pasta não existe e nada é escrito.
      const alta = join(pasta, 'alta.html')
      const alturaDaFoto = extras.alturaDaFoto ?? ALTURA_DA_FOTO
      writeFileSync(
        alta,
        `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;width:${largura}px;height:${alturaDaFoto}px"></iframe></body></html>`,
        'utf8',
      )
      await executarChrome(
        [
          '--headless=new',
          '--no-sandbox',
          '--disable-gpu',
          ...(process.platform === 'win32' ? ['--disable-crashpad-for-testing'] : []),
          '--no-first-run',
          '--allow-file-access-from-files',
          `--user-data-dir=${join(pasta, 'perfil-foto')}`,
          `--force-device-scale-factor=${DENSIDADE_DAS_FOTOS}`,
          ...(extras.reduzido ? ['--force-prefers-reduced-motion'] : []),
          `--window-size=${Math.max(largura, 600) + 16},${alturaDaFoto + 16}`,
          '--virtual-time-budget=4000',
          `--screenshot=${join(PASTA_DAS_FOTOS, foto)}`,
          pathToFileURL(alta).href,
        ],
        join(pasta, 'foto-saida.txt'),
        join(pasta, 'foto-erro.txt'),
      )
    }
    return JSON.parse(texto) as Medida
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

/**
 * O jsdom não tem `matchMedia`, e o índice "Nesta página" decide por ele se é uma lista aberta ou um `<details>`
 * fechado. Aqui ele responde `max-width` e `min-width` pela largura da janela medida, como o Chrome responderá.
 */
function consultaPelaLargura(largura: number) {
  return (consulta: string) => {
    // O índice consulta a largura em rem (69,5 rem); 1 rem = 16 px.
    const pixels = (numero: string, unidade: string) => Number(numero) * (unidade === 'rem' ? 16 : 1)
    const maxima = /\(max-width:\s*([\d.]+)(px|rem)\)/.exec(consulta)
    const minima = /\(min-width:\s*([\d.]+)(px|rem)\)/.exec(consulta)
    const casa = maxima ? largura <= pixels(maxima[1], maxima[2]) : minima ? largura >= pixels(minima[1], minima[2]) : false
    return { matches: casa, media: consulta, addEventListener: () => {}, removeEventListener: () => {} }
  }
}

async function medirPagina(
  caminho: string,
  largura: number,
  altura: number,
  foto = false,
  trocar?: [string, string],
  extras: Extras = {},
): Promise<Medida> {
  vi.stubGlobal('matchMedia', consultaPelaLargura(largura))
  let corpo: string
  try {
    // O desmonte logo depois de serializar: sem ele, cada medida do mesmo teste carregaria as páginas das anteriores.
    const { unmount } = renderizarRota(caminho)
    corpo = document.body.innerHTML
    unmount()
    // VIS-4-r4-I-04: o texto trocado no corpo serializado (o endereço de e-mail mais longo que o real).
    if (trocar) {
      expect(corpo, `o texto "${trocar[0]}" existe no corpo de ${caminho}`).toContain(trocar[0])
      corpo = corpo.replaceAll(trocar[0], trocar[1])
    }
    // O celular real tem barra de rolagem de sobreposição: a janela estreita não perde 15 px de largura.
    if (largura < 600) corpo = `<style>html{scrollbar-width:none}</style>${corpo}`
  } finally {
    vi.unstubAllGlobals()
  }
  const nome = extras.nomeDaFoto ?? (foto ? `${caminho.slice(1)}_${largura}` : null)
  const medida = await medirNoChrome(corpo, largura, altura, nome ? `${PREFIXO_DAS_FOTOS}${nome}.png` : null, extras)
  expect(medida.erro, `${caminho} a ${largura}`).toBeUndefined()
  expect(medida.innerWidth).toBe(largura)
  expect(medida.innerHeight).toBe(altura)
  expect(medida.fontes).toBe('loaded')
  return medida
}

/**
 * VIS-4-r3-I-03, a régua da medida de leitura (pura, sem Chrome). Recebe, por parágrafo que quebra em 2 linhas ou
 * mais, as letras de cada linha. Linha cheia = toda linha menos a última de cada parágrafo. Três partes:
 * (b1) nenhuma linha cheia passa de `maximo` letras; (b2) a mediana das linhas cheias da página é menor que
 * `limiteDaMediana` (com número par de linhas, a média dos dois valores do meio); (b3) há ao menos 1 linha cheia,
 * senão a medida não mediu nada (e só essa mensagem sai). Devolve as mensagens (lista vazia = ok).
 */
function violacoesDasLinhasCheias(caminho: string, paragrafos: number[][], maximo = 90, limiteDaMediana = 80): string[] {
  const mensagens: string[] = []
  const cheias: number[] = []
  paragrafos.forEach((linhas, p) => {
    linhas.slice(0, -1).forEach((letras, l) => {
      cheias.push(letras)
      if (letras > maximo) {
        mensagens.push(`${caminho}: o parágrafo ${p} a linha cheia ${l} tem ${letras} letras (limite: no máximo ${maximo})`)
      }
    })
  })
  if (cheias.length === 0) {
    return [`${caminho}: nenhum parágrafo de leitura quebra em 2 linhas ou mais; a medida não mediu nada`]
  }
  const ordenadas = [...cheias].sort((a, b) => a - b)
  const meio = Math.floor(ordenadas.length / 2)
  const mediana = ordenadas.length % 2 === 1 ? ordenadas[meio] : (ordenadas[meio - 1] + ordenadas[meio]) / 2
  if (mediana >= limiteDaMediana) {
    mensagens.push(`${caminho}: a mediana das linhas cheias é ${mediana} letras (limite: abaixo de ${limiteDaMediana})`)
  }
  return mensagens
}

/** VIS-4-r3-I-02, a régua da coluna do h1 (pura): as linhas cujas letras passam da coluna, com `tolerancia` px de folga. */
function linhasForaDaColuna(h1: H1Medido, tolerancia = 1): LinhaDoH1[] {
  return h1.linhas.filter(
    (linha) => linha.esquerda < h1.colunaEsquerda - tolerancia || linha.direita > h1.colunaDireita + tolerancia,
  )
}

/** Dois valores de px iguais, com folga de `folga` px. */
const igual = (a: number, b: number, folga: number) => Math.abs(a - b) <= folga

/** A razão servida da rua na base (arquivo de 542 px mostrado em 340 px, densidade 2): nunca abaixo dela (F8-1). */
const RAZAO_DA_RUA_NA_BASE = 0.797

/** As páginas que mantêm uma ação na abertura (Exclusão: "Ir para a Conta"; Contato: o bloco de e-mail). */
const COM_ACAO: readonly string[] = ['/exclusao-de-conta', '/contato']

/** O mel (o fundo e a borda do botão e das luzes): os elementos da abertura que o usam, por `tag.classe`. */
function violacoesDoMel(rotulo: string, caminho: string, m: Medida): string[] {
  const esperados = COM_ACAO.includes(caminho) ? 1 : 0
  const achados = m.elementosComMel ?? []
  return achados.length === esperados
    ? []
    : [`${rotulo}: ${achados.length} elemento(s) de mel na abertura (${achados.join(', ') || 'nenhum'}); esperado ${esperados} (só a ação)`]
}

/**
 * F8-1 a 1440 (régua pura, sem Chrome): a abertura tem a altura do próprio texto (até 170 px nas quatro páginas sem
 * ação e até 240 em Exclusão e Contato, sem altura mínima e com o `padding-block` do grupo), o `h1` do degrau titulo-1
 * é a maior letra, o cabeçalho é de noite, a rua fica rente à borda direita e aos dois lados da faixa (nunca abaixo da
 * razão da base) sem passar por baixo do texto, o `h1` e a coluna de leitura têm a mesma borda esquerda, o índice (com
 * três seções ou mais) fica à direita da coluna, e não há rolagem horizontal. Devolve as mensagens (vazio = ok).
 */
function violacoesDaAberturaLarga(rotulo: string, caminho: string, m: Medida): string[] {
  const problemas: string[] = []
  const { abertura, placa, cabeca, indice, leitura } = m
  const teto = COM_ACAO.includes(caminho) ? 240 : 170
  if (abertura.height > teto + 0.5) problemas.push(`${rotulo}: a abertura tem ${abertura.height.toFixed(1)} px de altura (máximo ${teto})`)
  if (m.aberturaMinBloco && m.aberturaMinBloco !== 'auto' && m.aberturaMinBloco !== '0px') {
    problemas.push(`${rotulo}: a abertura tem min-block-size ${m.aberturaMinBloco} (esperado nenhum)`)
  }
  const [cima, baixo] = (m.aberturaPaddingBloco ?? '').split(' ')
  if (!cima || cima !== baixo || parseFloat(cima) < 23) {
    problemas.push(`${rotulo}: o padding-block da abertura é "${m.aberturaPaddingBloco}" (esperado o do grupo nos dois lados)`)
  }
  if (!igual(placa.right, abertura.right, 0.5)) {
    problemas.push(`${rotulo}: a rua acaba em ${placa.right.toFixed(1)} e a faixa em ${abertura.right.toFixed(1)} (esperado: rente à borda direita)`)
  }
  if (!igual(placa.y, abertura.y, 0.5) || !igual(placa.bottom, abertura.bottom, 0.5)) {
    problemas.push(`${rotulo}: a rua vai de ${placa.y.toFixed(1)} a ${placa.bottom.toFixed(1)} e a faixa de ${abertura.y.toFixed(1)} a ${abertura.bottom.toFixed(1)} (esperado: a altura da faixa)`)
  }
  if (placa.width > 340.5) problemas.push(`${rotulo}: a rua tem ${placa.width.toFixed(1)} px de largura (teto 340)`)
  if (cabeca.right > placa.x + 0.5) {
    problemas.push(`${rotulo}: a coluna do texto acaba em ${cabeca.right.toFixed(1)}, depois do começo da rua (${placa.x.toFixed(1)})`)
  }
  if ((m.ruaObjeto ?? '') !== 'cover 50% 0%') problemas.push(`${rotulo}: a imagem da rua tem object-fit/position "${m.ruaObjeto}" (esperado cover 50% 0%)`)
  if ((m.ruaRazao ?? 0) < RAZAO_DA_RUA_NA_BASE - 0.005) {
    problemas.push(`${rotulo}: a rua é servida a ${(m.ruaRazao ?? 0).toFixed(3)} (arquivo ÷ pixels físicos), abaixo da base (${RAZAO_DA_RUA_NA_BASE})`)
  }
  if (m.cabecalhoTom !== 'noite') problemas.push(`${rotulo}: o cabeçalho está de "${m.cabecalhoTom}" (esperado noite)`)
  if (!igual(m.h1.colunaEsquerda, leitura.x, 1) && indice !== null) {
    problemas.push(`${rotulo}: o h1 começa em ${m.h1.colunaEsquerda} e a coluna de leitura em ${leitura.x.toFixed(1)} (esperado: a mesma borda esquerda)`)
  }
  if (indice !== null) {
    if (leitura.width > 640.5) problemas.push(`${rotulo}: a coluna de leitura tem ${leitura.width.toFixed(1)} px (máximo 640)`)
    if (indice.x < leitura.right - 0.5) {
      problemas.push(`${rotulo}: o índice começa em ${indice.x.toFixed(1)}, antes do fim da coluna de leitura (${leitura.right.toFixed(1)}): não está à direita dela`)
    }
    if (indice.right > m.innerWidth + 0.5) problemas.push(`${rotulo}: o índice acaba em ${indice.right.toFixed(1)}, fora da janela de ${m.innerWidth} px`)
  }
  if (m.h1Tamanho <= m.maiorOutroTamanho) problemas.push(`${rotulo}: o h1 tem ${m.h1Tamanho} px e há letra de ${m.maiorOutroTamanho} px na página (o h1 deve ser a maior)`)
  problemas.push(...violacoesDoMel(rotulo, caminho, m))
  if (m.scrollWidth > m.innerWidth) problemas.push(`${rotulo}: rolagem horizontal (${m.scrollWidth} > ${m.innerWidth})`)
  return problemas
}

/**
 * F8-1 a 390 (régua pura): a abertura tem até 240 px (340 em Exclusão e Contato); a rua é uma linha no pé da faixa, rente
 * à borda direita, abaixo do texto; o cabeçalho é de noite; o índice, quando há, fica em fluxo entre a faixa e o
 * documento; as quatro páginas sem ação começam o documento até y 422; o `h1` é a maior letra; sem rolagem horizontal.
 */
function violacoesDaAberturaEstreita(rotulo: string, caminho: string, m: Medida): string[] {
  const problemas: string[] = []
  const { abertura, placa, cabeca, indice, leitura } = m
  const teto = COM_ACAO.includes(caminho) ? 340 : 240
  if (abertura.height > teto + 0.5) problemas.push(`${rotulo}: a abertura tem ${abertura.height.toFixed(1)} px de altura (máximo ${teto})`)
  if (placa.y < cabeca.bottom - 0.5) {
    problemas.push(`${rotulo}: a rua começa em y ${placa.y.toFixed(1)}, antes do fim do texto (${cabeca.bottom.toFixed(1)}): devia ficar embaixo dele`)
  }
  if (!igual(placa.right, abertura.right, 0.5)) {
    problemas.push(`${rotulo}: a rua acaba em ${placa.right.toFixed(1)} e a faixa em ${abertura.right.toFixed(1)} (esperado: rente à borda direita)`)
  }
  if (!igual(placa.bottom, abertura.bottom, 0.5)) {
    problemas.push(`${rotulo}: a rua acaba em ${placa.bottom.toFixed(1)} e a faixa em ${abertura.bottom.toFixed(1)} (esperado: rente ao pé)`)
  }
  if (placa.width > 340.5) problemas.push(`${rotulo}: a rua tem ${placa.width.toFixed(1)} px de largura (teto 340)`)
  if ((m.ruaRazao ?? 0) < RAZAO_DA_RUA_NA_BASE - 0.005) {
    problemas.push(`${rotulo}: a rua é servida a ${(m.ruaRazao ?? 0).toFixed(3)} (arquivo ÷ pixels físicos), abaixo da base (${RAZAO_DA_RUA_NA_BASE})`)
  }
  if (m.cabecalhoTom !== 'noite') problemas.push(`${rotulo}: o cabeçalho está de "${m.cabecalhoTom}" (esperado noite)`)
  if (indice !== null) {
    if (indice.y < abertura.bottom - 0.5) problemas.push(`${rotulo}: o índice começa em y ${indice.y.toFixed(1)}, dentro da faixa (que acaba em ${abertura.bottom.toFixed(1)})`)
    if (indice.bottom > leitura.y + 0.5) {
      problemas.push(`${rotulo}: o índice acaba em y ${indice.bottom.toFixed(1)}, depois do começo do documento (${leitura.y.toFixed(1)}): devia vir antes dele, em fluxo`)
    }
  }
  if (!COM_ACAO.includes(caminho) && leitura.y > 422.5) {
    problemas.push(`${rotulo}: a primeira linha do documento está em y ${leitura.y.toFixed(1)} (máximo 422)`)
  }
  if (m.h1Tamanho <= m.maiorOutroTamanho) problemas.push(`${rotulo}: o h1 tem ${m.h1Tamanho} px e há letra de ${m.maiorOutroTamanho} px na página (o h1 deve ser a maior)`)
  problemas.push(...violacoesDoMel(rotulo, caminho, m))
  if (m.scrollWidth > m.innerWidth) problemas.push(`${rotulo}: rolagem horizontal (${m.scrollWidth} > ${m.innerWidth})`)
  return problemas
}

/**
 * F8-1, o índice grudado (régua pura): a 1440 x 900 rolada, o `<nav>` está em `sticky`, o topo na linha de âncora (±1) e
 * o pé dentro da janela; no fim da página o pé do índice não passa do topo do rodapé; com a rolagem pedida o `<nav>`
 * leva `max-block-size` e é o único com `aria-current` (a foto marca um link na mão, ver `SCRIPT_DE_MEDIDA`).
 */
function violacoesDoIndiceGrudado(rotulo: string, m: Medida, noFim: boolean): string[] {
  const problemas: string[] = []
  const nav = m.indiceRolado
  if (!nav) return [`${rotulo}: o índice não foi medido`]
  if (m.indicePosicao !== 'sticky') problemas.push(`${rotulo}: o índice está "${m.indicePosicao}" (esperado sticky)`)
  if (!m.indiceMaxAltura || m.indiceMaxAltura === 'none') problemas.push(`${rotulo}: o índice não tem max-block-size`)
  if (noFim) {
    if (!m.rodape) problemas.push(`${rotulo}: o rodapé não foi medido`)
    else if (nav.bottom > m.rodape.y + 0.5) {
      problemas.push(`${rotulo}: no fim da página o índice acaba em ${nav.bottom.toFixed(1)}, depois do topo do rodapé (${m.rodape.y.toFixed(1)})`)
    }
  } else {
    if (Math.abs(nav.y - (m.ancora ?? 0)) > 1) problemas.push(`${rotulo}: o topo do índice está em ${nav.y.toFixed(1)} e a linha de âncora em ${m.ancora}`)
    if (nav.bottom > m.innerHeight + 0.5) problemas.push(`${rotulo}: o pé do índice (${nav.bottom.toFixed(1)}) passa da janela (${m.innerHeight})`)
  }
  return problemas
}

/** Uma medida de 1440 que passa nas réguas (para os controles negativos): cada controle muda um só campo. */
function medidaLarga(): Medida {
  const caixa = (x: number, y: number, width: number, height: number): Caixa => ({ x, y, width, height, right: x + width, bottom: y + height })
  return {
    innerWidth: 1440,
    innerHeight: 900,
    fontes: 'loaded',
    scrollWidth: 1440,
    abertura: caixa(0, 80, 1440, 160),
    placa: caixa(1100, 80, 340, 160),
    cabeca: caixa(120, 112, 640, 96),
    indice: caixa(840, 320, 320, 400),
    leitura: caixa(120, 320, 640, 1500),
    primeiroH2: caixa(120, 320, 640, 42),
    h1Tamanho: 48,
    maiorOutroTamanho: 36,
    primeiroParagrafo: null,
    quebraDoParagrafo: 'pretty',
    quebraDoTitulo: 'balance',
    letrasPorLinha: [],
    linhasDosParagrafos: [],
    h1: { colunaEsquerda: 120, colunaDireita: 760, linhas: [] },
    email: null,
    emailBotao: null,
    emailEndereco: null,
    enderecoLinhas: null,
    aberturaPaddingBloco: '32px 32px',
    aberturaMinBloco: 'auto',
    ruaObjeto: 'cover 50% 0%',
    ruaRazao: 0.797,
    cabecalhoTom: 'noite',
    elementosComMel: [],
  }
}

const descreve = `a abertura das seis páginas de texto no Chrome${motivoDoPulo ? ` (pulado: ${motivoDoPulo})` : ''}`

describe(descreve, () => {
  if (exigirNoCI && motivoDoPulo !== null) {
    it('a geometria roda em CI', () => {
      throw new Error('geometria exigida em CI e não pôde rodar: ' + motivoDoPulo)
    })
  }
  const roda = it.skipIf(motivoDoPulo !== null && !exigirNoCI)

  // VIS-4-r3-I-04: controles negativos das duas réguas, nas funções puras (sem Chrome, fora do skipIf).
  it('VIS-4-r3-I-04 um parágrafo cuja primeira linha cheia tem 91 letras é apontado', () => {
    // As outras duas linhas cheias (70) mantêm a mediana abaixo de 80: só o teto (b1) fala.
    const mensagens = violacoesDasLinhasCheias('/sobre', [[91, 40], [70, 40], [70, 40]])
    expect(mensagens).toHaveLength(1)
    expect(mensagens[0]).toContain('/sobre')
    expect(mensagens[0]).toContain('91')
  })

  it('VIS-4-r3-I-04 uma linha cheia de 85 letras não é apontada pelo teto de 90 quando a mediana da página fica abaixo de 80', () => {
    expect(violacoesDasLinhasCheias('/privacidade', [[85, 40], [70, 40], [70, 40]])).toEqual([])
  })

  it('VIS-4-r3-I-04 uma página cuja mediana das linhas cheias é 80 falha e nomeia a página e a mediana', () => {
    const mensagens = violacoesDasLinhasCheias('/termos', [[78, 10], [80, 10], [82, 10]])
    expect(mensagens).toHaveLength(1)
    expect(mensagens[0]).toContain('/termos')
    expect(mensagens[0]).toContain('mediana')
    expect(mensagens[0]).toContain('80')
  })

  it('VIS-4-r3-I-04 parágrafos de uma linha só não são medidos: o conjunto sem linha cheia falha só com a mensagem da página', () => {
    const mensagens = violacoesDasLinhasCheias('/contato', [[60], [120]])
    expect(mensagens).toHaveLength(1)
    expect(mensagens[0]).toContain('/contato')
    expect(mensagens[0]).toContain('não mediu nada')
  })

  it('VIS-4-r3-I-04 a última linha de um parágrafo não conta: 3 linhas com 70, 70 e 95 não são apontadas', () => {
    expect(violacoesDasLinhasCheias('/exclusao-de-conta', [[70, 70, 95]])).toEqual([])
  })

  it('VIS-4-r3-I-04 um conjunto medido vazio falha e nomeia a página', () => {
    const mensagens = violacoesDasLinhasCheias('/regras-da-comunidade', [])
    expect(mensagens).toHaveLength(1)
    expect(mensagens[0]).toContain('/regras-da-comunidade')
    expect(mensagens[0]).toContain('não mediu nada')
  })

  it('VIS-4-r3-I-04 uma linha do h1 15 px além da coluna é apontada; uma dentro (com 1 px de folga) não', () => {
    const coluna = { colunaEsquerda: 100, colunaDireita: 668 }
    const fora = linhasForaDaColuna({
      ...coluna,
      linhas: [
        { texto: 'Regras', esquerda: 100, direita: 300 },
        { texto: 'da comunidade', esquerda: 100, direita: 683 },
      ],
    })
    expect(fora.map((l) => l.texto)).toEqual(['da comunidade'])
    const dentro = linhasForaDaColuna({
      ...coluna,
      linhas: [
        { texto: 'Regras', esquerda: 99.5, direita: 668.8 },
        { texto: 'da comunidade', esquerda: 100, direita: 600 },
      ],
    })
    expect(dentro).toEqual([])
  })

  // F8-1: controles negativos das réguas da abertura em noite, nas funções puras (sem Chrome, fora do skipIf). Cada controle
  // muda um só campo de uma medida que passa, e a régua tem de apontar exatamente esse campo. Eles trocam os do T2 antigo
  // (REP-T2: faixa de 400 px no mínimo, placa de 340 px de chão a chão): a regra assinada S-18 foi trocada por esta.
  it('F8-1 controle: a medida de 1440 de referência passa nas réguas da abertura', () => {
    expect(violacoesDaAberturaLarga('/privacidade a 1440', '/privacidade', medidaLarga())).toEqual([])
  })

  it('F8-1 controle: faixa alta, altura mínima, padding torto, rua fora da borda, do topo ou do pé, rua por baixo do texto, recorte errado, razão menor, cabeçalho de dia, mel e rolagem são apontados', () => {
    const base = medidaLarga()
    const mudar = (parcial: Partial<Medida>, caminho = '/privacidade') =>
      violacoesDaAberturaLarga(`${caminho} a 1440`, caminho, { ...base, ...parcial })
    expect(mudar({ abertura: { ...base.abertura, height: 171, bottom: 251 } })).toHaveLength(2)
    const comAcao = { elementosComMel: ['a.cm-botao'] }
    const alta = (altura: number): Partial<Medida> => ({
      ...comAcao,
      abertura: { ...base.abertura, height: altura, bottom: 80 + altura },
      placa: { ...base.placa, height: altura, bottom: 80 + altura },
    })
    expect(mudar(alta(240), '/contato')).toEqual([])
    expect(mudar(alta(241), '/contato')).toHaveLength(1)
    expect(mudar({ aberturaMinBloco: '400px' })).toHaveLength(1)
    expect(mudar({ aberturaPaddingBloco: '32px 0px' })).toHaveLength(1)
    expect(mudar({ placa: { ...base.placa, x: 1090, right: 1430 } })).toHaveLength(1)
    expect(mudar({ placa: { ...base.placa, y: 90, bottom: 250 } })).toHaveLength(1)
    expect(mudar({ placa: { ...base.placa, width: 400, x: 1040 } })).toHaveLength(1)
    expect(mudar({ cabeca: { ...base.cabeca, right: 1200, width: 1080 } })).toHaveLength(1)
    expect(mudar({ ruaObjeto: 'fill 50% 50%' })).toHaveLength(1)
    expect(mudar({ ruaRazao: 0.5 })).toHaveLength(1)
    expect(mudar({ cabecalhoTom: 'dia' })).toHaveLength(1)
    expect(mudar({ elementosComMel: ['a.cm-botao'] })).toHaveLength(1)
    expect(mudar({ elementosComMel: [] }, '/contato')).toHaveLength(1)
    expect(mudar({ indice: { ...base.indice!, x: 100, right: 420 } })).toHaveLength(1)
    expect(mudar({ h1: { ...base.h1, colunaEsquerda: 130 } })).toHaveLength(1)
    expect(mudar({ h1Tamanho: 36 })).toHaveLength(1)
    expect(mudar({ scrollWidth: 1441 })).toHaveLength(1)
  })

  it('F8-1 controle: a 390 a rua acima do fim do texto ou fora do pé, a faixa alta, o documento depois de y 422, o índice fora do fluxo e a rolagem horizontal são apontados', () => {
    const caixa = (x: number, y: number, width: number, height: number): Caixa => ({ x, y, width, height, right: x + width, bottom: y + height })
    const base: Medida = {
      ...medidaLarga(),
      innerWidth: 390,
      innerHeight: 844,
      scrollWidth: 390,
      h1Tamanho: 34,
      maiorOutroTamanho: 20,
      abertura: caixa(0, 72, 390, 200),
      cabeca: caixa(20, 96, 350, 80),
      placa: caixa(50, 200, 340, 72),
      indice: caixa(20, 320, 350, 48),
      leitura: caixa(20, 400, 350, 1500),
    }
    expect(violacoesDaAberturaEstreita('/privacidade a 390', '/privacidade', base)).toEqual([])
    const mudar = (parcial: Partial<Medida>, caminho = '/privacidade') =>
      violacoesDaAberturaEstreita(`${caminho} a 390`, caminho, { ...base, ...parcial })
    expect(mudar({ placa: { ...base.placa, y: 150, bottom: 222 } })).toHaveLength(2)
    expect(mudar({ placa: { ...base.placa, x: 40, right: 380 } })).toHaveLength(1)
    expect(mudar({ abertura: { ...base.abertura, height: 241, bottom: 313 } })).toHaveLength(2)
    // Faixa de 341 px com ação: o limite de 340 é apontado, e a rua e o índice deixam de ficar no pé e depois da faixa.
    expect(mudar({ abertura: { ...base.abertura, height: 341, bottom: 413 }, elementosComMel: ['a.cm-botao'] }, '/contato')).toHaveLength(3)
    expect(mudar({ leitura: { ...base.leitura, y: 423, bottom: 1923 }, indice: { ...base.indice!, y: 330, bottom: 378 } })).toHaveLength(1)
    // Com ação (Contato e Exclusão) o documento pode começar depois de y 422: o limite é só das quatro páginas sem ação.
    expect(mudar({ leitura: { ...base.leitura, y: 500, bottom: 2000 }, elementosComMel: ['a.cm-botao'] }, '/contato')).toEqual([])
    expect(mudar({ indice: { ...base.indice!, y: 250, bottom: 298 } })).toHaveLength(1)
    expect(mudar({ indice: { ...base.indice!, y: 380, bottom: 428 } })).toHaveLength(1)
    expect(mudar({ ruaRazao: 0.4 })).toHaveLength(1)
    expect(mudar({ scrollWidth: 391 })).toHaveLength(1)
  })

  it('F8-1 controle: o índice grudado fora da linha de âncora, solto, sem limite de altura ou por cima do rodapé é apontado', () => {
    const caixa = (x: number, y: number, width: number, height: number): Caixa => ({ x, y, width, height, right: x + width, bottom: y + height })
    const base: Medida = {
      ...medidaLarga(),
      indiceRolado: caixa(840, 104, 320, 400),
      indicePosicao: 'sticky',
      indiceMaxAltura: '772px',
      ancora: 104,
      rodape: caixa(0, 1000, 1440, 300),
    }
    expect(violacoesDoIndiceGrudado('/privacidade y1500', base, false)).toEqual([])
    expect(violacoesDoIndiceGrudado('/privacidade fim', { ...base, indiceRolado: caixa(840, 560, 320, 400) }, true)).toEqual([])
    const rolado = (parcial: Partial<Medida>) => violacoesDoIndiceGrudado('/privacidade y1500', { ...base, ...parcial }, false)
    expect(rolado({ indiceRolado: caixa(840, 106, 320, 400) })).toHaveLength(1)
    expect(rolado({ indicePosicao: 'static' })).toHaveLength(1)
    expect(rolado({ indiceMaxAltura: 'none' })).toHaveLength(1)
    expect(rolado({ indiceRolado: caixa(840, 104, 320, 800) })).toHaveLength(1)
    expect(violacoesDoIndiceGrudado('/privacidade fim', { ...base, indiceRolado: caixa(840, 700, 320, 400) }, true)).toHaveLength(1)
  })

  // VIS-4-r4-I-04: o cartão de e-mail de /contato fica numa linha só de 1280 em diante, mesmo com um endereço mais longo.
  const ENDERECO_LONGO = 'contato@appmaternidade.example'
  const afirmarCartaoEmUmaLinha = (rotulo: string, m: Medida): string[] => {
    const problemas: string[] = []
    if (!m.email || !m.emailBotao || !m.emailEndereco || m.enderecoLinhas === null) {
      return [`${rotulo}: o cartão de e-mail, o botão ou o endereço não foi medido`]
    }
    const { email, emailBotao, emailEndereco } = m
    const sobreposto = emailBotao.y < emailEndereco.bottom && emailEndereco.y < emailBotao.bottom
    if (!sobreposto) {
      problemas.push(
        `${rotulo}: o botão (${emailBotao.y.toFixed(1)}-${emailBotao.bottom.toFixed(1)}) e o endereço (${emailEndereco.y.toFixed(1)}-${emailEndereco.bottom.toFixed(1)}) não se sobrepõem na vertical: o cartão quebrou em duas linhas`,
      )
    }
    if (emailBotao.x < emailEndereco.right) {
      problemas.push(`${rotulo}: o botão começa em ${emailBotao.x.toFixed(1)}, antes do fim do endereço (${emailEndereco.right.toFixed(1)})`)
    }
    if (m.enderecoLinhas !== 1) problemas.push(`${rotulo}: o endereço tem ${m.enderecoLinhas} linhas (esperado 1)`)
    if (email.right > m.cabeca.right + 0.5) {
      problemas.push(`${rotulo}: o cartão termina em ${email.right.toFixed(1)}, além da coluna do texto (${m.cabeca.right.toFixed(1)})`)
    }
    if (m.cabeca.width > 640) problemas.push(`${rotulo}: a coluna do texto tem ${m.cabeca.width.toFixed(1)} px (máximo 640)`)
    const fora = linhasForaDaColuna(m.h1)
    if (fora.length > 0) problemas.push(`${rotulo}: linha(s) do h1 fora da coluna: ${fora.map((l) => `"${l.texto}"`).join('; ')}`)
    if (m.scrollWidth > m.innerWidth) problemas.push(`${rotulo}: rolagem horizontal (${m.scrollWidth} > ${m.innerWidth})`)
    return problemas
  }

  roda(
    'VIS-4-r4-I-04 /contato a 1280 e a 1440: o cartão de e-mail é uma linha só, com o endereço de hoje e com um mais longo',
    async () => {
      const problemas: string[] = []
      for (const largura of [1280, 1440]) {
        problemas.push(...afirmarCartaoEmUmaLinha(`/contato a ${largura}`, await medirPagina('/contato', largura, 900)))
        problemas.push(
          ...afirmarCartaoEmUmaLinha(
            `/contato a ${largura} com ${ENDERECO_LONGO}`,
            await medirPagina('/contato', largura, 900, false, [EMAIL_CONTATO, ENDERECO_LONGO]),
          ),
        )
      }
      expect(problemas).toEqual([])
    },
    TEMPO_DO_CHROME,
  )

  roda(
    'VIS-4-r4-I-04 /contato a 1100: sem rolagem horizontal e o cartão de e-mail dentro da janela (pode quebrar)',
    async () => {
      const problemas: string[] = []
      for (const trocar of [undefined, [EMAIL_CONTATO, ENDERECO_LONGO] as [string, string]]) {
        const rotulo = trocar ? `/contato a 1100 com ${ENDERECO_LONGO}` : '/contato a 1100'
        const m = await medirPagina('/contato', 1100, 900, false, trocar)
        if (m.scrollWidth > m.innerWidth) problemas.push(`${rotulo}: rolagem horizontal (${m.scrollWidth} > ${m.innerWidth})`)
        if (!m.email) problemas.push(`${rotulo}: o cartão de e-mail não foi medido`)
        else if (m.email.x < 0 || m.email.right > m.innerWidth) {
          problemas.push(`${rotulo}: o cartão (${m.email.x.toFixed(1)} a ${m.email.right.toFixed(1)}) sai da janela de ${m.innerWidth} px`)
        }
      }
      expect(problemas).toEqual([])
    },
    TEMPO_DO_CHROME,
  )

  // F8-1, o relatório: a altura da abertura (sem o cabeçalho), o h1, a rua e onde começa o texto do documento, por página
  // e por largura. Só imprime (o que vale está nos testes de aceite abaixo).
  roda(
    'F8-1 relatório das medidas da abertura (só imprime)',
    async () => {
      const linhas: string[] = []
      for (const [largura, altura] of [[390, 844], [1440, 900]] as const) {
        for (const caminho of PAGINAS) {
          const m = await medirPagina(caminho, largura, altura)
          linhas.push(
            [
              `${caminho}@${largura}`,
              `dpr=${m.densidade}`,
              `faixa=${m.abertura.height.toFixed(1)}`,
              `h1=${m.h1Tamanho}px`,
              `lide.y=${m.lideCaixa?.y.toFixed(1)}`,
              `docY=${m.leitura.y.toFixed(1)}`,
              `h2Y=${m.primeiroH2.y.toFixed(1)}`,
              `placa=${m.placa.width.toFixed(0)}x${m.placa.height.toFixed(0)}`,
              `razao=${m.ruaRazao?.toFixed(3)}`,
              `rua=${m.ruaArquivo}`,
              `ruaObj=${m.ruaObjeto}`,
              `tom=${m.cabecalhoTom}`,
              `scrollW=${m.scrollWidth}`,
              `mel=${(m.elementosComMel ?? []).join('|')}`,
            ].join(' '),
          )
        }
      }
      const pastaDasMedidas = resolve(import.meta.dirname, '..', '..', '..', '..', '.oc', 'medidas')
      mkdirSync(pastaDasMedidas, { recursive: true })
      writeFileSync(join(pastaDasMedidas, `${PREFIXO_DAS_FOTOS}relatorio.txt`), linhas.join('\n') + '\n', 'utf8')
    },
    TEMPO_DO_CHROME * 4,
  )

  // F8-1, o índice grudado: a Privacidade a 1440 x 900 rolada até 1500 (o topo do índice na linha de âncora, o pé dentro da
  // janela, o marcador no link atual com a transição de 160 ms, ou sem transição com movimento reduzido) e rolada até o
  // fim (o pé do índice antes do rodapé). As fotos saem em densidade 2. O link atual da foto é posto na mão pela regra do
  // índice, porque o harness é HTML sem React (o comportamento do observador é o do teste de jsdom em `publicasTexto.test.tsx`).
  for (const reduzido of [false, true]) {
    roda(
      `F8-1 a Privacidade a 1440 x 900, scrollY 1500${reduzido ? ', movimento reduzido' : ''}: índice grudado na linha de âncora, um só link atual com o marcador`,
      async () => {
        const m = await medirPagina('/privacidade', 1440, 900, false, undefined, {
          rolar: 1500,
          marcar: 'auto',
          reduzido,
          nomeDaFoto: `privacidade_1440_y1500${reduzido ? '_reduzido' : ''}`,
          alturaDaFoto: 900,
        })
        expect(m.densidade).toBe(DENSIDADE_DAS_FOTOS)
        expect(m.scrollY).toBe(1500)
        expect(violacoesDoIndiceGrudado('/privacidade a 1440 y1500', m, false)).toEqual([])
        expect(m.linksAtuais).toBe(1)
        // O estado final: o traço inteiro (scaleY 1). Com movimento normal ele chegou ali por uma transição de transform
        // de 160 ms; com movimento reduzido não houve transição nenhuma (o traço já estava no lugar).
        expect(m.marcadorEscala).toBe('matrix(1, 0, 0, 1, 0, 0)')
        expect(m.marcadorTransicao).toBe(reduzido ? '0s' : '0.16s')
        // (Duas no movimento normal: a do traço que sai do link antigo e a do que chega ao novo.)
        if (reduzido) expect(m.marcadorTransicoes).toBe(0)
        else expect(m.marcadorTransicoes).toBeGreaterThanOrEqual(1)
        expect(m.marcadorDuracao).toBe(reduzido ? 0 : 160)
      },
      TEMPO_DO_CHROME,
    )
  }

  roda(
    'F8-1 a Privacidade a 1440 x 900 no fim da página: o pé do índice não passa do topo do rodapé',
    async () => {
      const m = await medirPagina('/privacidade', 1440, 900, false, undefined, { rolar: 'fim', nomeDaFoto: 'privacidade_1440_fim', alturaDaFoto: 900 })
      expect(violacoesDoIndiceGrudado('/privacidade a 1440 no fim', m, true)).toEqual([])
    },
    TEMPO_DO_CHROME,
  )

  roda(
    'F8-1 a Privacidade a 390 e a 1024 x 768: o índice fica em fluxo (position static), sem rolagem horizontal',
    async () => {
      for (const [largura, altura] of [[390, 844], [1024, 768]] as const) {
        const m = await medirPagina('/privacidade', largura, altura, false, undefined, { rolar: 1500 })
        expect(m.indicePosicao, `a ${largura}`).toBe('static')
        expect(m.scrollWidth, `a ${largura}`).toBeLessThanOrEqual(m.innerWidth)
      }
    },
    TEMPO_DO_CHROME * 2,
  )

  // F8-1, Contato sem índice: as duas seções lado a lado, 7 para 5, a 1440 e a 1280; empilhadas a 1024 e a 390.
  roda(
    'F8-1 o Contato não tem índice e põe as duas seções lado a lado (7fr e 5fr) a partir de 66 rem de quadro',
    async () => {
      for (const largura of [1280, 1440]) {
        const m = await medirPagina('/contato', largura, 900)
        expect(m.indice, `a ${largura}`).toBeNull()
        const [a, b] = m.secoesDoContato ?? []
        expect(a && b, `a ${largura}: duas seções medidas`).toBeTruthy()
        expect(igual(a.y, b.y, 1), `a ${largura}: as seções começam na mesma altura (${a.y} e ${b.y})`).toBe(true)
        expect(b.x).toBeGreaterThan(a.right)
        expect(igual(a.width / b.width, 7 / 5, 0.02), `a ${largura}: ${a.width.toFixed(1)} para ${b.width.toFixed(1)}`).toBe(true)
      }
      for (const [largura, altura] of [[1024, 768], [390, 844]] as const) {
        const m = await medirPagina('/contato', largura, altura)
        const [a, b] = m.secoesDoContato ?? []
        expect(b.y, `a ${largura}: empilhadas`).toBeGreaterThan(a.bottom - 0.5)
      }
    },
    TEMPO_DO_CHROME * 4,
  )

  for (const caminho of PAGINAS) {
    // F8-1 a 1440: a abertura do tamanho do texto (170 px, ou 240 com ação), a rua rente à direita e aos dois lados da faixa,
    // o cabeçalho de noite, o mel só na ação, o índice (três seções ou mais) à direita da coluna, sem rolagem horizontal.
    roda(
      `F8-1 ${caminho} a 1440: abertura do tamanho do texto, rua rente à direita e à altura da faixa, cabeçalho de noite, mel só na ação`,
      async () => {
        const m = await medirPagina(caminho, 1440, 900, true)
        expect(violacoesDaAberturaLarga(`${caminho} a 1440`, caminho, m)).toEqual([])
        // A primeira tela (1440 x 900, densidade 2), a foto que a galeria mostra.
        await medirPagina(caminho, 1440, 900, false, undefined, { nomeDaFoto: `${caminho.slice(1)}_1440_dobra`, alturaDaFoto: 900 })
      },
      TEMPO_DO_CHROME,
    )

    // F8-1 a 390: a abertura (240 px, ou 340 com ação) com a rua numa linha no pé, o índice em fluxo, o documento até y 422.
    roda(
      `F8-1 ${caminho} a 390: abertura compacta com a rua numa linha no pé, índice em fluxo, documento até y 422`,
      async () => {
        const m = await medirPagina(caminho, 390, 844, true)
        expect(violacoesDaAberturaEstreita(`${caminho} a 390`, caminho, m)).toEqual([])
        // A primeira tela (390 x 844, densidade 2), a foto que a galeria mostra.
        await medirPagina(caminho, 390, 844, false, undefined, { nomeDaFoto: `${caminho.slice(1)}_390_dobra`, alturaDaFoto: 844 })
      },
      TEMPO_DO_CHROME,
    )

    // F8-1, texto ampliado: a 320 e a 390, com a letra da raiz a 16, 20 e 32 px (32 = 200%): o h1 quebra dentro da faixa, o
    // texto não passa por cima da linha da rua e a página não rola na horizontal. A 320 com 32 px o cabeçalho do site já
    // passava da janela antes desta unidade (P-320-200, scrollWidth 378): esse caso é só registrado, não barrado.
    roda(
      `F8-1 ${caminho} a 320 e 390 com a letra da raiz a 16, 20 e 32 px: h1 na faixa, nada sobre a linha da rua, sem rolagem horizontal`,
      async () => {
        const problemas: string[] = []
        const registro: string[] = []
        for (const largura of [320, 390]) {
          for (const raiz of [16, 20, 32]) {
            const rotulo = `${caminho} a ${largura} com raiz ${raiz}`
            const m = await medirPagina(caminho, largura, 844, false, undefined, { raiz })
            const fora = linhasForaDaColuna(m.h1)
            if (fora.length > 0) problemas.push(`${rotulo}: linha(s) do h1 fora da coluna: ${fora.map((l) => `"${l.texto}"`).join('; ')}`)
            if (m.placa.y < m.cabeca.bottom - 0.5) problemas.push(`${rotulo}: a rua começa em y ${m.placa.y.toFixed(1)}, antes do fim do texto (${m.cabeca.bottom.toFixed(1)})`)
            if (m.h1Caixa && m.h1Caixa.right > m.abertura.right + 0.5) problemas.push(`${rotulo}: o h1 passa da faixa (${m.h1Caixa.right.toFixed(1)} > ${m.abertura.right.toFixed(1)})`)
            registro.push(`${rotulo}: scrollWidth ${m.scrollWidth}, janela ${m.innerWidth}`)
            const casoConhecido = largura === 320 && raiz === 32
            if (m.scrollWidth > m.innerWidth && !casoConhecido) problemas.push(`${rotulo}: rolagem horizontal (${m.scrollWidth} > ${m.innerWidth})`)
          }
        }
        escreverMedidas(`texto-ampliado${caminho.replaceAll('/', '_')}.txt`, registro)
        expect(problemas).toEqual([])
      },
      TEMPO_DO_CHROME * 3,
    )

    // F8-1, a rolagem horizontal nas larguras de 768 e 1024 (1024 x 768 é também a janela onde o índice fica em fluxo).
    roda(
      `F8-1 ${caminho} a 768 e 1024: sem rolagem horizontal; o índice não gruda (position static)`,
      async () => {
        const problemas: string[] = []
        for (const [largura, altura] of [[768, 1024], [1024, 768]] as const) {
          const m = await medirPagina(caminho, largura, altura)
          if (m.scrollWidth > m.innerWidth) problemas.push(`${caminho} a ${largura}: rolagem horizontal (${m.scrollWidth} > ${m.innerWidth})`)
          if (m.indicePosicao !== undefined && m.indicePosicao !== 'static') problemas.push(`${caminho} a ${largura}: o índice está "${m.indicePosicao}" (esperado static)`)
        }
        expect(problemas).toEqual([])
      },
      TEMPO_DO_CHROME * 2,
    )

    // O texto de leitura: menos de 80 letras por linha; parágrafo com `pretty` e título com `balance`.
    roda(
      `${caminho} a 1440: menos de 80 letras por linha, parágrafos com text-wrap pretty e títulos com balance`,
      async () => {
        const m = await medirPagina(caminho, 1440, 900)
        expect(violacoesDasLinhasCheias(caminho, m.linhasDosParagrafos)).toEqual([])
        for (const letras of m.letrasPorLinha) expect(letras).toBeLessThan(80)
        expect(m.quebraDoParagrafo).toBe('pretty')
        expect(m.quebraDoTitulo).toBe('balance')
      },
      TEMPO_DO_CHROME,
    )

    // VIS-4-r3-I-02: nenhuma linha do h1 passa da própria coluna (que divide a faixa com a placa), e a coluna do h1
    // não passa da medida de leitura (640 px).
    roda(
      `VIS-4-r3-I-02 ${caminho} a 1100 e 1440: as linhas do h1 ficam dentro da coluna do h1 e a coluna não passa de 640 px`,
      async () => {
        // As duas larguras são medidas antes de afirmar, para a mensagem nomear todas as que falham.
        const problemas: string[] = []
        for (const largura of [1100, 1440]) {
          const m = await medirPagina(caminho, largura, 900)
          const fora = linhasForaDaColuna(m.h1)
          const coluna = m.h1.colunaDireita - m.h1.colunaEsquerda
          if (fora.length > 0) {
            problemas.push(
              `${caminho} em ${largura}: linha(s) do h1 fora da coluna (${m.h1.colunaEsquerda} a ${m.h1.colunaDireita}, ${coluna.toFixed(1)} px): ` +
                fora.map((l) => `"${l.texto}" ${l.esquerda} a ${l.direita} (${(l.direita - l.esquerda).toFixed(1)} px)`).join('; '),
            )
          }
          if (coluna > 641) problemas.push(`${caminho} em ${largura}: a coluna do h1 tem ${coluna.toFixed(1)} px (máximo 640)`)
          if (m.scrollWidth > m.innerWidth) problemas.push(`${caminho} em ${largura}: rolagem horizontal (${m.scrollWidth} > ${m.innerWidth})`)
        }
        expect(problemas).toEqual([])
      },
      TEMPO_DO_CHROME,
    )

  }
})
