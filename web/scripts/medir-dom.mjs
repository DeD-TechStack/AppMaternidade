// Medidor do sistema-base (MAT-44d): mede no Chrome, por CDP, os critérios G1 a G12 da seção 2.11
// do contrato. Só biblioteca padrão do Node 24 (fetch e WebSocket), só loopback.
//
// Uso: node web/scripts/medir-dom.mjs <pasta> <caso>:<tema>:<LxA> ...
//   casos: sistema, inicio, hoje, sessao e as 5 telas de acesso e Conta (entrar, criar_conta,
//   recuperar_acesso, comecar_seu_nome, conta). Temas: claro e madrugada (a madrugada só onde o
//   cabeçalho tem o botão "Modo madrugada": sistema, hoje, sessao, comecar_seu_nome e conta).
//   Ex.: sistema:claro:1440x900
//   Grava <pasta>/<caso>_<tema>_<L>.json e imprime uma linha "RESUMO <arquivo> G1 ok G2 FALHA ...".
//   Saída 0 se mediu (as falhas ficam no JSON e no RESUMO); 2 em erro de uso ou de conexão.
//   Ambiente (variável de ambiente > .oc/ambiente.json do diretório atual > padrão): BASE_URL (padrão
//   http://127.0.0.1:5244/), CDP_PORTA (padrão 9344), API_URL e ANON_KEY (sem padrão; só o caso
//   comecar_seu_nome os exige, para criar o usuário novo pela API de Auth local).
//
// Além de G1 a G12 e SB3 (o nome do rodapé), a regra NUM confere os números em Zilla Slab (família,
// face carregada e lining-nums).
//
// As 5 telas novas rodam também os critérios próprios da tela (TELAS.md): E-1 a E-7, C-1 a C-3, R-1
// a R-3, B-1 a B-3, A-1 a A-6 e, na madrugada da Conta, M-1 a M-6. Os que só um olho decide vão para
// `criterios_manuais` no JSON, com uma frase de o que olhar.
//
// O E-7 e o R-3 enviam o formulário (entrar, criar_conta, recuperar_acesso e comecar_seu_nome): leem a
// geometria antes e depois do envio vazio e, no Recuperar, do envio com o e-mail preenchido (só
// loopback; a leitura vai em `envio` no JSON). Altura de linha, topo, altura da página e topo do botão
// de envio têm de ficar iguais.
//
// Volta 3 (D3): D3-fio, D3-controle e D3-anel medem, em 1440, o ar de 8 px entre a mensagem e o fio da linha, entre o
// controle e a mensagem e o anel de foco dentro do fio; D3-fuso confere que o select de fuso não mostra "_". Leem a
// geometria dos campos em repouso e depois do envio vazio (na Conta o nome é esvaziado antes de enviar).
// Volta 3 (D4): D4-vao mede, só no Recuperar em 390 e em repouso, o vão da base do campo (o fio) ao topo do botão
// (no máximo 64 px); o R-3, em 390, passa a exigir a confirmação de 1 linha, e a página segue parada ao enviar.
//
// A parte pura (as funções g1 a g12, num, o contraste e o resumo) recebe um JSON de nós e devolve
// { regra, ok, motivo, nos_com_falha }. Ela falha fechado: nó sem texto onde a regra pede texto,
// largura 0, font-size fora do conjunto, fundo transparente sem ancestral opaco e medida ausente
// reprovam, em vez de passar por falta de dado.
import fs from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------------------------------------
// Parte pura

export const FONTES_PERMITIDAS = [15, 17, 20, 24, 28, 32, 36, 48, 56, 72, 80, 88, 96, 112, 224]
export const RAIOS_PERMITIDOS = ['0', '4px', '8px', '50%']

// As cores de fundo que o G7 distingue: o urucum (dia e madrugada) e o barro e a lavanda (idem).
const URUCUM = ['#B0401C', '#C47055']
const MIDIA = ['#C9A39A', '#B8ADC4', '#3A2723', '#2C2733']

const CASOS_ANTIGOS = ['sistema', 'inicio', 'hoje', 'sessao']
/** As 5 telas de acesso e Conta (MAT-44d-3): o caminho de cada uma e como se chega a ela. */
export const CASOS_DE_ACESSO = {
  entrar: { caminho: 'entrar', acesso: 'publica', nome: 'Entrar' },
  criar_conta: { caminho: 'criar-conta', acesso: 'publica', nome: 'Criar conta' },
  recuperar_acesso: { caminho: 'recuperar-acesso', acesso: 'publica', nome: 'Recuperar acesso' },
  comecar_seu_nome: { caminho: 'app/comecar', acesso: 'incompleta', nome: 'Começar' },
  conta: { caminho: 'app/conta', acesso: 'ana', nome: 'Conta' },
}
const CASOS = [...CASOS_ANTIGOS, ...Object.keys(CASOS_DE_ACESSO)]
const TEMAS = ['claro', 'madrugada']

// ---------------------------------------------------------------------------------------------
// Ambiente: a variável de ambiente vale mais que o arquivo, e o arquivo mais que o padrão.

export const AMBIENTE_PADRAO = { BASE_URL: 'http://127.0.0.1:5244/', CDP_PORTA: 9344 }
export const ARQUIVO_AMBIENTE = path.join('.oc', 'ambiente.json')

/**
 * Escolhe BASE_URL, CDP_PORTA, API_URL e ANON_KEY: variável (`env`) > `arquivo` (o JSON de
 * `.oc/ambiente.json`, ou nulo) > padrão. Valor vazio conta como ausente. API_URL e ANON_KEY não têm
 * padrão. A BASE_URL sempre termina em barra, para os caminhos relativos valerem.
 */
export function escolherAmbiente(env = {}, arquivo = null) {
  const doArquivo = arquivo && typeof arquivo === 'object' && !Array.isArray(arquivo) ? arquivo : {}
  const pega = (nome) => {
    for (const fonte of [env ?? {}, doArquivo]) {
      const valor = fonte[nome]
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') return String(valor).trim()
    }
    return undefined
  }
  const base = pega('BASE_URL') ?? AMBIENTE_PADRAO.BASE_URL
  return {
    BASE_URL: base.endsWith('/') ? base : `${base}/`,
    CDP_PORTA: Number(pega('CDP_PORTA') ?? AMBIENTE_PADRAO.CDP_PORTA),
    API_URL: pega('API_URL'),
    ANON_KEY: pega('ANON_KEY'),
  }
}

/** Só loopback: a página medida e a API local. Lança Error se a porta não for um inteiro de 1 a 65535. */
export function verificarAmbiente(ambiente) {
  verificarLoopback(ambiente.BASE_URL)
  if (ambiente.API_URL !== undefined) verificarLoopback(ambiente.API_URL)
  if (!Number.isInteger(ambiente.CDP_PORTA) || ambiente.CDP_PORTA < 1 || ambiente.CDP_PORTA > 65535) {
    throw new Error(`CDP_PORTA inválida: ${ambiente.CDP_PORTA}`)
  }
}

/** Lê o `.oc/ambiente.json` do diretório atual; nulo se não existe. Lança Error se não for um JSON. */
export function lerArquivoAmbiente(caminho = ARQUIVO_AMBIENTE) {
  if (!fs.existsSync(caminho)) return null
  try {
    return JSON.parse(fs.readFileSync(caminho, 'utf8'))
  } catch (erro) {
    throw new Error(`${caminho} ilegível: ${erro.message}`)
  }
}

/** A margem fixa da grade pela largura da janela (a da media query, com a barra de rolagem). */
export function margemDe(largura) {
  if (largura >= 992) return 32
  if (largura >= 768) return 24
  return 16
}

/** A largura da área útil: a da janela sem a barra, menos as margens, até o máximo. */
export function areaUtilDe(largura, larguraSemBarra) {
  const maximo = largura < 768 ? 640 : 1600
  return Math.min(larguraSemBarra - 2 * margemDe(largura), maximo)
}

/** O x de uma coluna cN (1 a 10): `margem + (N−1) × área útil ÷ 10`; abaixo de 768 há 1 coluna. */
export function xDaColuna(n, largura, larguraSemBarra) {
  const area = areaUtilDe(largura, larguraSemBarra)
  const inicio = (larguraSemBarra - area) / 2
  return largura < 768 ? inicio : inicio + ((n - 1) * area) / 10
}

/** Lê uma cor calculada do Chrome: rgb(), rgba(), a forma com espaços e color(srgb ...). */
export function parseCor(texto) {
  if (typeof texto !== 'string') return null
  const t = texto.trim()
  if (t === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  let m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(t)
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: alfa(m[4]) }
  m = /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(t)
  if (m) return { r: +m[1] * 255, g: +m[2] * 255, b: +m[3] * 255, a: alfa(m[4]) }
  return null
}

function alfa(texto) {
  if (texto === undefined) return 1
  return texto.endsWith('%') ? parseFloat(texto) / 100 : parseFloat(texto)
}

function hexParaRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
}

function ehCor(cor, hexes) {
  if (!cor || cor.a < 0.99) return false
  return hexes.some((hex) => hexParaRgb(hex).every((canal, i) => Math.abs(canal - [cor.r, cor.g, cor.b][i]) <= 1.5))
}

/** Compõe a cor `de` sobre a cor `sobre` (alfa pré-multiplicado, como o navegador pinta). */
function sobrepor(de, sobre) {
  const a = de.a + sobre.a * (1 - de.a)
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
  const canal = (c) => (de[c] * de.a + sobre[c] * sobre.a * (1 - de.a)) / a
  return { r: canal('r'), g: canal('g'), b: canal('b'), a }
}

/** O fundo real de um nó: a cadeia de fundos (do próprio nó até a raiz) até o primeiro opaco. */
export function fundoReal(cadeia) {
  if (!Array.isArray(cadeia) || cadeia.length === 0) return null
  const cores = cadeia.map(parseCor)
  if (cores.some((cor) => cor === null)) return null
  const opaco = cores.findIndex((cor) => cor.a >= 0.999)
  if (opaco === -1) return null
  let atual = cores[opaco]
  for (let i = opaco - 1; i >= 0; i -= 1) atual = sobrepor(cores[i], atual)
  return atual
}

function luminancia({ r, g, b }) {
  const [rl, gl, bl] = [r, g, b].map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

/** O contraste WCAG 2.x entre o texto e o fundo; nulo se faltar cor ou se o fundo não for opaco. */
export function contraste(corTexto, cadeiaDeFundos) {
  const fundo = fundoReal(cadeiaDeFundos)
  const texto = parseCor(corTexto)
  if (!fundo || !texto) return null
  const sobreFundo = texto.a < 1 ? sobrepor(texto, fundo) : texto
  const [clara, escura] = [luminancia(sobreFundo), luminancia(fundo)].sort((x, y) => y - x)
  return (clara + 0.05) / (escura + 0.05)
}

const visivel = (no) => no.visivel !== false
const marca = (no, nome) => Boolean(no.m && no.m[nome])
const temTexto = (no) => typeof no.texto === 'string' && no.texto.trim() !== ''
// O texto que um controle (input, textarea, select) mostra: o valor, o placeholder visível ou o
// rótulo da opção escolhida. É a leitura do controle, que não tem nó de texto próprio.
const temTextoControle = (no) => typeof no.textoControle === 'string' && no.textoControle.trim() !== ''
// O texto inline de um parágrafo (o dos descendentes, sem o dos parágrafos aninhados).
const temTextoTotal = (no) => typeof no.textoTotal === 'string' && no.textoTotal.trim() !== ''
const perto = (a, b, tolerancia) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerancia
const ehNumero = (valor) => typeof valor === 'number' && Number.isFinite(valor)
const descrever = (no) => {
  const texto = [no.texto, no.textoTotal, no.textoControle].find((t) => typeof t === 'string' && t.trim() !== '')
  return `${no.tag ?? '?'}${texto ? ` "${texto.trim().slice(0, 40)}"` : ''}`
}
const px = (valor) => {
  if (typeof valor === 'number') return valor
  const m = /^(-?[\d.]+)px$/.exec(String(valor ?? '').trim())
  return m ? parseFloat(m[1]) : Number.NaN
}

function resultado(regra, falhas, motivoOk, motivoFalha) {
  const ok = falhas.length === 0
  return {
    regra,
    ok,
    motivo: ok ? motivoOk : (motivoFalha ?? falhas[0].motivo),
    nos_com_falha: falhas.map((f) => f.no),
  }
}

const falhaFechada = (regra, motivo) => ({ regra, ok: false, motivo, nos_com_falha: [] })

/** G1: `scrollWidth == clientWidth` do `documentElement`. */
export function g1(doc) {
  if (!doc || !Number.isFinite(doc.scrollWidth) || !Number.isFinite(doc.clientWidth)) {
    return falhaFechada('G1', 'scrollWidth ou clientWidth ausente')
  }
  const ok = doc.scrollWidth === doc.clientWidth
  return {
    regra: 'G1',
    ok,
    motivo: ok ? `scrollWidth ${doc.scrollWidth} = clientWidth ${doc.clientWidth}` : `rolagem horizontal: scrollWidth ${doc.scrollWidth} > clientWidth ${doc.clientWidth}`,
    nos_com_falha: [],
  }
}

/** G2: o cabeçalho tem 64 px (60 abaixo de 768), é sticky em top 0, opaco e sem border-bottom; o nome em x=margem. */
export function g2(nos, doc) {
  const cab = nos.find((no) => marca(no, 'cabecalho'))
  if (!cab) return falhaFechada('G2', 'nenhum [data-cabecalho]')
  const celular = doc.largura < 768
  const falhas = []
  const falhar = (motivo) => falhas.push({ no: descrever(cab), motivo })
  if (!cab.rect || !(cab.rect.w > 0)) falhar('cabeçalho sem largura')
  const esperada = celular ? 60 : 64
  if (!perto(cab.rect?.h, esperada, 0.5)) falhar(`altura ${cab.rect?.h} em vez de ${esperada}`)
  if (cab.estilo?.position !== 'sticky') falhar(`position ${cab.estilo?.position} em vez de sticky`)
  if (px(cab.estilo?.top) !== 0) falhar(`top ${cab.estilo?.top} em vez de 0`)
  const fundo = parseCor(cab.estilo?.backgroundColor)
  if (!fundo || fundo.a < 0.999) falhar(`fundo não opaco (${cab.estilo?.backgroundColor})`)
  const largura = px(cab.estilo?.borderBottomWidth)
  if (Number.isNaN(largura)) falhar('border-bottom ausente')
  else if (largura > 0 && cab.estilo?.borderBottomStyle !== 'none') falhar(`border-bottom de ${cab.estilo.borderBottomWidth}`)
  const margem = margemDe(doc.largura)
  const nome = nos.find((no) => marca(no, 'nomeSite'))
  if (!nome) falhar('nenhum [data-nome-site]')
  else if (!celular) {
    if (!perto(nome.rect?.x, margem, 1)) falhar(`nome do site em x=${nome.rect?.x} em vez de ${margem}`)
  } else {
    // Abaixo de 768 (2.6): o botão do menu à esquerda, o nome no meio e o botão à direita. O que
    // começa em x=16 é o botão do menu; o nome fica entre ele e o botão da direita.
    const menu = nos.find((no) => marca(no, 'menuBotao') && visivel(no))
    const acao = nos.find((no) => marca(no, 'acaoCabecalho') && no.tag !== 'span' && visivel(no))
    if (!menu) falhar('nenhum botão do menu visível abaixo de 768')
    else {
      if (!perto(menu.rect?.x, margem, 1)) falhar(`botão do menu em x=${menu.rect?.x} em vez de ${margem}`)
      const direita = acao?.rect?.x ?? doc.clientWidth
      if (!(nome.rect?.x >= menu.rect.x + menu.rect.w - 0.5 && nome.rect.x + nome.rect.w <= direita + 0.5)) {
        falhar('o nome do site não está entre o menu e o botão da direita')
      }
    }
  }
  return resultado('G2', falhas, `altura ${cab.rect.h}, sticky, top 0, opaco, sem border-bottom`)
}

/** G3: todo filho direto de `main` começa em x=margem ou no x de c2 (±2). */
export function g3(nos, doc) {
  const filhos = nos.filter((no) => marca(no, 'filhoDeMain') && visivel(no))
  if (filhos.length === 0) return falhaFechada('G3', 'nenhum filho direto de main')
  const x1 = xDaColuna(1, doc.largura, doc.clientWidth)
  const x2 = xDaColuna(2, doc.largura, doc.clientWidth)
  const falhas = []
  for (const no of filhos) {
    const x = no.rect?.x
    if (!Number.isFinite(x)) falhas.push({ no: descrever(no), motivo: 'sem x' })
    else if (!perto(x, x1, 2) && !perto(x, x2, 2)) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)} em x=${x.toFixed(1)} (esperado ${x1.toFixed(1)} ou ${x2.toFixed(1)})` })
    }
  }
  return resultado('G3', falhas, `${filhos.length} filhos de main em x=${x1.toFixed(1)} ou c2=${x2.toFixed(1)}`)
}

/**
 * G4: todo font-size calculado está no conjunto (mais o nome do rodapé) e nada em caixa alta. Vale
 * para o texto dos nós e para o dos controles (valor, placeholder visível, rótulo do select), que
 * têm o font-size do próprio controle.
 */
export function g4(nos) {
  const comTexto = nos.filter((no) => visivel(no) && (temTexto(no) || temTextoControle(no)))
  if (comTexto.length === 0) return falhaFechada('G4', 'nenhum nó com texto')
  const falhas = []
  for (const no of comTexto) {
    const tamanho = px(no.estilo?.fontSize)
    if (Number.isNaN(tamanho)) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: font-size ausente` })
      continue
    }
    if (!marca(no, 'nomeRodape') && !FONTES_PERMITIDAS.some((f) => Math.abs(f - tamanho) < 0.01)) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: font-size ${tamanho}px fora do conjunto` })
    }
    if (no.estilo?.textTransform === 'uppercase') {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: text-transform uppercase` })
    }
  }
  return resultado('G4', falhas, `${comTexto.length} nós de texto, todos no conjunto, sem caixa alta`)
}

/** G5: o h1 tem 96/96 (80 de 768 a 991; 48/48 abaixo), peso 600, em x=margem. */
export function g5(nos, doc) {
  const h1 = nos.find((no) => no.tag === 'h1' && visivel(no))
  if (!h1) return falhaFechada('G5', 'nenhum h1')
  const tamanho = doc.largura >= 992 ? 96 : doc.largura >= 768 ? 80 : 48
  const falhas = []
  const falhar = (motivo) => falhas.push({ no: descrever(h1), motivo })
  const fonte = px(h1.estilo?.fontSize)
  const linha = px(h1.estilo?.lineHeight)
  if (!perto(fonte, tamanho, 0.01)) falhar(`font-size ${h1.estilo?.fontSize} em vez de ${tamanho}px`)
  if (!perto(linha, tamanho, 0.01)) falhar(`line-height ${h1.estilo?.lineHeight} em vez de ${tamanho}px`)
  if (Number(h1.estilo?.fontWeight) !== 600) falhar(`peso ${h1.estilo?.fontWeight} em vez de 600`)
  if (!perto(h1.rect?.x, margemDe(doc.largura), 1)) falhar(`x=${h1.rect?.x} em vez de ${margemDe(doc.largura)}`)
  return resultado('G5', falhas, `h1 ${tamanho}/${tamanho}, peso 600, x=${h1.rect.x}`)
}

function raioEm(valor) {
  return String(valor ?? '')
    .trim()
    .split(/\s+/)
    .map((parte) => (parte === '0px' || parte === '0' ? '0' : parte))
}

/** G6: sem box-shadow; raios em {0, 4, 8, 50%}; borda nos 4 lados só na moldura dupla. */
export function g6(nos) {
  const falhas = []
  const lidos = nos.filter(visivel)
  if (lidos.length === 0) return falhaFechada('G6', 'nenhum nó')
  for (const no of lidos) {
    const e = no.estilo
    if (!e) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: sem estilo` })
      continue
    }
    if (e.boxShadow && e.boxShadow !== 'none') falhas.push({ no: descrever(no), motivo: `${descrever(no)}: box-shadow ${e.boxShadow}` })
    for (const canto of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']) {
      for (const parte of raioEm(e[canto])) {
        if (!RAIOS_PERMITIDOS.includes(parte)) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: ${canto} ${e[canto]}` })
      }
    }
    const lados = ['Top', 'Right', 'Bottom', 'Left'].every((lado) => px(e[`border${lado}Width`]) > 0 && e[`border${lado}Style`] !== 'none')
    if (lados && !marca(no, 'moldura')) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: borda nos 4 lados fora da moldura dupla` })
  }
  return resultado('G6', falhas, 'sem sombra, raios em {0,4,8,50%}, borda de 4 lados só na moldura dupla')
}

/** G7: urucum só em botão primário, CTA, "Em andamento", rodapé; barro e lavanda só em [data-midia], sem texto dentro. */
export function g7(nos) {
  const falhas = []
  const lidos = nos.filter(visivel)
  if (lidos.length === 0) return falhaFechada('G7', 'nenhum nó')
  for (const no of lidos) {
    const fundo = parseCor(no.estilo?.backgroundColor)
    if (no.estilo?.backgroundColor !== undefined && !fundo) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: fundo ilegível (${no.estilo.backgroundColor})` })
      continue
    }
    if (ehCor(fundo, URUCUM) && !(marca(no, 'botaoPrimario') || marca(no, 'cta') || marca(no, 'andamento') || marca(no, 'doRodape') || marca(no, 'acaoCabecalho'))) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: fundo urucum fora de botão primário, CTA, "Em andamento" ou rodapé` })
    }
    if (ehCor(fundo, MIDIA) && !marca(no, 'midia')) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: barro ou lavanda fora de [data-midia]` })
    }
    if (marca(no, 'midia') && typeof no.textoDentro === 'string' && no.textoDentro.trim() !== '') {
      falhas.push({ no: descrever(no), motivo: `[data-midia] com texto dentro: "${no.textoDentro.trim().slice(0, 30)}"` })
    }
    if (marca(no, 'midia') && typeof no.textoDentro !== 'string') {
      falhas.push({ no: descrever(no), motivo: '[data-midia] sem a leitura do texto de dentro' })
    }
  }
  return resultado('G7', falhas, 'urucum, barro e lavanda só onde o contrato manda')
}

/** G8: de um bloco ao seguinte há até 192 px, e colunas lado a lado diferem em até 120 px de altura. */
export function g8(nos, doc) {
  const blocos = nos
    .filter((no) => (marca(no, 'filhoDeMain') || marca(no, 'rodape')) && visivel(no))
    .filter((no) => Number.isFinite(no.rect?.y) && Number.isFinite(no.rect?.h))
    .sort((a, b) => a.rect.y - b.rect.y)
  if (blocos.length < 2) return falhaFechada('G8', 'menos de dois blocos para medir')
  const falhas = []
  let maior = 0
  for (let i = 1; i < blocos.length; i += 1) {
    const vao = blocos[i].rect.y - (blocos[i - 1].rect.y + blocos[i - 1].rect.h)
    maior = Math.max(maior, vao)
    if (vao > 192.5) {
      falhas.push({ no: descrever(blocos[i]), motivo: `vão de ${vao.toFixed(1)} px antes de ${descrever(blocos[i])} (máximo 192)` })
    }
  }
  const grupos = Array.isArray(doc?.grupos) ? doc.grupos : null
  if (grupos === null) falhas.push({ no: 'documento', motivo: 'sem a leitura das colunas lado a lado' })
  else {
    for (const grupo of grupos) {
      const alturas = grupo.alturas.filter(Number.isFinite)
      if (alturas.length < 2) continue
      const diferenca = Math.max(...alturas) - Math.min(...alturas)
      if (diferenca > 120.5) falhas.push({ no: grupo.id, motivo: `colunas de ${grupo.id} diferem ${diferenca.toFixed(1)} px de altura (máximo 120)` })
    }
  }
  return resultado('G8', falhas, `maior vão ${maior.toFixed(1)} px; ${grupos ? grupos.length : 0} grupos de colunas`)
}

/** G9: o rodapé começa em x=0 e tem a largura da janela. */
export function g9(nos, doc) {
  const rodape = nos.find((no) => marca(no, 'rodape'))
  if (!rodape) return falhaFechada('G9', 'nenhum [data-rodape]')
  const falhas = []
  if (!perto(rodape.rect?.x, 0, 0.5)) falhas.push({ no: 'rodapé', motivo: `rodapé em x=${rodape.rect?.x}` })
  if (!perto(rodape.rect?.w, doc.clientWidth, 1)) falhas.push({ no: 'rodapé', motivo: `rodapé com ${rodape.rect?.w} px em vez de ${doc.clientWidth}` })
  return resultado('G9', falhas, `rodapé em x=0 com ${rodape.rect.w} px`)
}

/**
 * G10: nenhum parágrafo passa de 65 caracteres por linha renderizada. O parágrafo conta o texto dos
 * descendentes inline (`<p><span>…</span></p>`), e não só o texto direto.
 */
export function g10(nos) {
  const paragrafos = nos.filter((no) => no.tag === 'p' && visivel(no) && (temTexto(no) || temTextoTotal(no)))
  if (paragrafos.length === 0) return falhaFechada('G10', 'nenhum parágrafo com texto')
  const falhas = []
  let maior = 0
  for (const no of paragrafos) {
    if (!Array.isArray(no.linhas) || no.linhas.length === 0) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: sem a contagem de linhas` })
      continue
    }
    const maximo = Math.max(...no.linhas)
    maior = Math.max(maior, maximo)
    if (maximo > 65) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: ${maximo} caracteres numa linha` })
  }
  return resultado('G10', falhas, `${paragrafos.length} parágrafos, no máximo ${maior} caracteres por linha`)
}

/** G11: alvo de toque de 44 × 44 (56 de altura na madrugada) e contraste de 4,5:1 em todo texto. */
export function g11(nos, tema) {
  const alvos = nos.filter((no) => marca(no, 'interativo') && visivel(no))
  const textos = nos.filter((no) => visivel(no) && temTexto(no))
  if (alvos.length === 0) return falhaFechada('G11', 'nenhum alvo de toque')
  if (textos.length === 0) return falhaFechada('G11', 'nenhum nó com texto')
  const alturaMinima = tema === 'madrugada' ? 56 : 44
  const falhas = []
  for (const no of alvos) {
    const { w, h } = no.rect ?? {}
    if (!(w > 0) || !(h > 0)) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: alvo sem tamanho` })
    else if (w < 43.5 || h < alturaMinima - 0.5) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: alvo de ${w.toFixed(1)} × ${h.toFixed(1)} (mínimo 44 × ${alturaMinima})` })
    }
  }
  let menor = Infinity
  for (const no of textos) {
    if (!(no.rect?.w > 0)) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: texto com largura 0` })
      continue
    }
    const razao = contraste(no.estilo?.color, no.cadeia)
    if (razao === null) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: contraste incalculável (fundo transparente sem ancestral opaco, ou cor ilegível)` })
      continue
    }
    menor = Math.min(menor, razao)
    if (razao < 4.5) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: contraste ${razao.toFixed(2)}:1` })
  }
  return resultado('G11', falhas, `${alvos.length} alvos ≥ 44 × ${alturaMinima}; menor contraste ${menor.toFixed(2)}:1`)
}

/** As escalas dos eixos X e Y de um `transform` calculado (`none` ou `matrix(a, b, c, d, e, f)`); nulo se ilegível. */
function escalasDe(transform) {
  if (!transform || transform === 'none') return { x: 1, y: 1 }
  const m = /^matrix\(([^)]+)\)$/.exec(transform)
  if (!m) return null
  const valores = m[1].split(',').map((parte) => (parte.trim() === '' ? Number.NaN : Number(parte)))
  if (valores.length !== 6 || valores.some((valor) => !Number.isFinite(valor))) return null
  const [a, b, c, d] = valores
  return { x: Math.hypot(a, b), y: Math.hypot(c, d) }
}

const numeroDe = (valor) => (typeof valor === 'number' ? valor : typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : Number.NaN)

/**
 * G12: com movimento reduzido, todo bloco aparece com opacidade 1 e escala 1 nos dois eixos. Os
 * blocos são os filhos diretos de `main` e de `[data-bloco]`, o próprio `[data-bloco]` e as mídias
 * e figuras aninhadas em qualquer profundidade. O que está oculto não é descartado: um bloco com
 * `visibility: hidden`, `display: none` (no nó ou num ancestral) ou dentro de um ancestral com
 * opacidade 0 é justamente o que se procura, e reprova com "oculto (visibility/display)".
 * A leitura `ancestrais` (o produto das opacidades e das escalas dos ancestrais) cobre o wrapper.
 */
export function g12(nos) {
  const blocos = nos.filter((no) => marca(no, 'filhoDeMain') || marca(no, 'filhoDeBloco') || marca(no, 'blocoG12'))
  if (blocos.length === 0) return falhaFechada('G12', 'nenhum bloco (filho de main ou de [data-bloco])')
  const falhas = []
  const falhar = (no, motivo) => falhas.push({ no: descrever(no), motivo: `${descrever(no)}: ${motivo}` })
  for (const no of blocos) {
    // Todo bloco aparece: o coletor entrega `visivel` pelo `checkVisibility` (display, ancestral
    // oculto e visibility). Só `true` vale: a ausência da leitura também reprova (falha fechado).
    if (no.visivel !== true) falhar(no, 'oculto (visibility/display)')
    const opacidade = numeroDe(no.estilo?.opacity)
    const escalas = escalasDe(no.estilo?.transform)
    if (!Number.isFinite(opacidade)) falhar(no, 'opacidade ausente')
    else if (opacidade !== 1) falhar(no, `opacidade ${opacidade}`)
    if (escalas === null) falhar(no, `transform ilegível (${no.estilo?.transform})`)
    else if (Math.abs(escalas.x - 1) > 0.001 || Math.abs(escalas.y - 1) > 0.001) {
      falhar(no, `escala ${escalas.x.toFixed(3)} × ${escalas.y.toFixed(3)} (x × y)`)
    }
    if (no.ancestrais !== undefined) {
      const { opacidade: oa, escalaX, escalaY } = no.ancestrais ?? {}
      if (!ehNumero(oa)) falhar(no, 'opacidade dos ancestrais ilegível')
      else if (Math.abs(oa - 1) > 0.001) falhar(no, `ancestral com opacidade ${Number(oa.toFixed(3))}`)
      if (!ehNumero(escalaX) || !ehNumero(escalaY)) falhar(no, 'transform dos ancestrais ilegível')
      else if (Math.abs(escalaX - 1) > 0.001 || Math.abs(escalaY - 1) > 0.001) {
        falhar(no, `ancestral com escala ${escalaX.toFixed(3)} × ${escalaY.toFixed(3)} (x × y)`)
      }
    }
  }
  return resultado('G12', falhas, `${blocos.length} blocos com opacidade 1 e escala 1 (nos dois eixos)`)
}

/** SB3 (2.7): o nome gigante do rodapé ocupa de 96% a 100% da área útil. */
export function sb3(doc) {
  const nome = doc?.nomeRodape
  if (!nome || !(nome.areaUtil > 0) || !Number.isFinite(nome.larguraTexto)) return falhaFechada('SB3', 'nome do rodapé não medido')
  const razao = nome.larguraTexto / nome.areaUtil
  const ok = razao >= 0.96 && razao <= 1.0005
  return {
    regra: 'SB3',
    ok,
    motivo: `nome do rodapé com ${(razao * 100).toFixed(1)}% da área útil (${nome.larguraTexto.toFixed(1)} de ${nome.areaUtil.toFixed(1)})`,
    nos_com_falha: [],
  }
}

/**
 * NUM (2.2, `numero` e `cronometro`): cada `[data-numero]`, `.t-cronometro` e `[data-cronometro]`
 * visível (a) tem como primeira família calculada "Zilla Slab", (b) tem a face carregada
 * (`document.fonts.check('<peso> <tamanho> "Zilla Slab"')` e a face registrada e `loaded`, porque
 * `check()` dá `true` para uma família sem @font-face) e (c) pede `lining-nums`: sem ele a Zilla
 * Slab desenha algarismos de texto, o 7 desce e o 2 e o 0 ficam na altura do x. Falha fechado:
 * leitura ausente, nula ou de outro tipo reprova. Sem número nem cronômetro, é "não aplicável".
 */
export function num(nos, doc) {
  const alvos = (Array.isArray(nos) ? nos : []).filter((no) => marca(no, 'numero') && visivel(no))
  if (alvos.length === 0) {
    return { regra: 'NUM', ok: true, motivo: 'não aplicável: a página não tem [data-numero] nem cronômetro', nos_com_falha: [] }
  }
  const falhas = []
  if (doc?.fontes?.zillaSlab700 !== true) {
    falhas.push({
      no: 'documento',
      motivo: `document.fonts.check('700 112px "Zilla Slab"') não deu true (leitura: ${JSON.stringify(doc?.fontes?.zillaSlab700 ?? null)})`,
    })
  }
  for (const no of alvos) {
    // Um elemento com mais de um defeito conta uma vez em `nos_com_falha`, com os motivos juntos.
    const motivos = []
    const falhar = (motivo) => motivos.push(motivo)
    const fonte = no.fonte
    if (typeof fonte?.familia !== 'string' || fonte.familia.trim() === '') falhar('família calculada ausente')
    else if (fonte.familia !== 'Zilla Slab') falhar(`a primeira família é "${fonte.familia}" em vez de "Zilla Slab"`)
    if (fonte?.faceCarregada !== true) {
      falhar(`face Zilla Slab ${fonte?.peso ?? '?'} ${fonte?.tamanho ?? '?'} não carregada (leitura: ${JSON.stringify(fonte?.faceCarregada ?? null)})`)
    }
    const variante = no.estilo?.fontVariantNumeric
    if (typeof variante !== 'string' || variante.trim() === '') falhar('font-variant-numeric ausente (sem lining-nums)')
    else if (!/(^|\s)lining-nums(\s|$)/.test(variante)) falhar(`font-variant-numeric "${variante}" sem lining-nums`)
    if (motivos.length > 0) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: ${motivos.join('; ')}` })
  }
  return resultado('NUM', falhas, `${alvos.length} números ou cronômetros em Zilla Slab com a face carregada e lining-nums`)
}

// ---------------------------------------------------------------------------------------------
// Critérios da tela (TELAS.md). Cada um é uma função pura sobre as leituras da página e devolve
// { regra, ok, motivo, nos_com_falha }. Falham fechado: o elemento que a regra procura e não existe,
// a medida ausente, a largura 0 e o número fora da tolerância reprovam. A tolerância é a do texto do
// critério; onde ele não diz, ±2 px (como no glossário do contrato).

const TOL = 2
const G_TODAS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'SB3']

const naoAplicavel = (regra, motivo) => ({ regra, ok: true, motivo: `não aplicável: ${motivo}`, nos_com_falha: [] })
const nosDaLista = (nos) => (Array.isArray(nos) ? nos : [])
const nosVisiveis = (nos, nome) => nosDaLista(nos).filter((no) => marca(no, nome) && visivel(no))
const rectValido = (r) => Boolean(r) && [r.x, r.y, r.w, r.h].every(Number.isFinite)
const contem = (pai, filho, folga = 1) =>
  rectValido(pai?.rect) &&
  rectValido(filho?.rect) &&
  filho.rect.x >= pai.rect.x - folga &&
  filho.rect.y >= pai.rect.y - folga &&
  filho.rect.x + filho.rect.w <= pai.rect.x + pai.rect.w + folga &&
  filho.rect.y + filho.rect.h <= pai.rect.y + pai.rect.h + folga
const quatroLados = (e) => ['Top', 'Right', 'Bottom', 'Left'].every((lado) => px(e?.[`border${lado}Width`]) > 0 && e?.[`border${lado}Style`] !== 'none')
const primeiraFamilia = (texto) => String(texto ?? '').split(',')[0].trim().replace(/^["']|["']$/g, '')
const celularDe = (doc) => doc.largura < 768
const ehMadrugada = (tema) => tema === 'madrugada'

/** A resposta de um critério com várias falhas: o motivo da primeira e quantas mais há. */
function resultadoDeTela(regra, falhas, motivoOk) {
  const ok = falhas.length === 0
  return {
    regra,
    ok,
    motivo: ok ? motivoOk : falhas.length > 1 ? `${falhas[0].motivo} (e mais ${falhas.length - 1})` : falhas[0].motivo,
    nos_com_falha: falhas.map((f) => f.no),
  }
}

/** Todo critério depende da largura da janela e da `clientWidth`: sem elas, reprova. */
function comDoc(regra, doc, corpo) {
  if (!doc || !Number.isFinite(doc.largura) || !Number.isFinite(doc.clientWidth)) {
    return falhaFechada(regra, 'largura da janela ou clientWidth ausente')
  }
  return corpo()
}

/** Os limites de coluna para o conteúdo da página: de c2 ao início de c9 (a área útil inteira abaixo de 768). */
function limitesDeColuna(doc) {
  const x1 = xDaColuna(1, doc.largura, doc.clientWidth)
  if (celularDe(doc)) return { esquerda: x1, direita: x1 + areaUtilDe(doc.largura, doc.clientWidth) }
  return { esquerda: xDaColuna(2, doc.largura, doc.clientWidth), direita: xDaColuna(9, doc.largura, doc.clientWidth) }
}

/** O y do fim da abertura (`.sb-abertura`), ou nulo se a página não tem abertura. */
function aberturaFim(nos) {
  const abertura = nosVisiveis(nos, 'abertura').find((no) => rectValido(no.rect))
  return abertura ? abertura.rect.y + abertura.rect.h : null
}

/**
 * O conteúdo do `main` abaixo da abertura: o texto (pelo retângulo do próprio texto), os controles e os
 * alvos de toque (pela caixa). A mídia (`[data-midia]`) não é conteúdo: é uma moldura sem texto.
 */
function conteudoAbaixoDaAbertura(nos, fim) {
  return nosDaLista(nos)
    .filter(
      (no) =>
        visivel(no) &&
        marca(no, 'noMain') &&
        !marca(no, 'dentroMidia') &&
        rectValido(no.rect) &&
        no.rect.y >= fim - 0.5 &&
        (marca(no, 'interativo') || marca(no, 'controle') || temTexto(no)),
    )
    .map((no) => ({ no, caixa: marca(no, 'interativo') || marca(no, 'controle') || !rectValido(no.rectTexto) ? no.rect : no.rectTexto }))
}

const botaoDoFormulario = (nos) => nosVisiveis(nos, 'botaoForm').find((no) => rectValido(no.rect))

/** O fio vertical de um nó: borda de um lado só (até 2 px), elemento fino ou pseudo-elemento fino. */
function fiosVerticais(nos) {
  const fios = []
  for (const no of nosDaLista(nos).filter((n) => visivel(n) && marca(n, 'noMain'))) {
    const r = no.rect
    const e = no.estilo ?? {}
    if (!rectValido(r)) continue
    if (!quatroLados(e) && r.h > 0) {
      for (const lado of ['Left', 'Right']) {
        const largura = px(e[`border${lado}Width`])
        if (largura > 0 && largura <= 2 && e[`border${lado}Style`] !== 'none') {
          const x = lado === 'Left' ? r.x : r.x + r.w - largura
          fios.push({ x, y: r.y, h: r.h, no: descrever(no), origem: `border-${lado.toLowerCase()}` })
        }
      }
    }
    if (r.w > 0 && r.w <= 2 && r.h >= 16 && !marca(no, 'interativo')) {
      const fundo = parseCor(e.backgroundColor)
      if (fundo && fundo.a > 0.05) fios.push({ x: r.x, y: r.y, h: r.h, no: descrever(no), origem: 'elemento fino' })
    }
    for (const [nome, p] of Object.entries(no.pseudo ?? {})) {
      if (!p || p.display === 'none' || !(p.w > 0 && p.w <= 2) || !(p.h >= 16)) continue
      const fundo = parseCor(p.backgroundColor)
      if (fundo && fundo.a <= 0.05) continue
      fios.push({ x: p.x, y: p.y, h: p.h, no: `${descrever(no)}::${nome}`, origem: `::${nome}`, ilegivel: !Number.isFinite(p.x) || !Number.isFinite(p.y) })
    }
  }
  return fios
}

/**
 * E-1: não há fio vertical no meio da janela (x=720 em 1440). O único fio vertical do formulário está em
 * x de c4 (444,8) e tem a altura da linha de campo (do topo + 32 até o fio de baixo). Abaixo de 768 não
 * há fio vertical. Os fios da própria abertura não contam (o vertical em x de c9 acaba no horizontal).
 */
export function e1(nos, doc) {
  return comDoc('E-1', doc, () => {
    // Mede primeiro o que o DOM tem (os fios que existem) e só depois acusa a estrutura que falta
    // (abertura e linhas de campo): assim a tela antiga reprova pelo defeito, e não só pela ausência.
    const fim = aberturaFim(nos)
    const campos = nosVisiveis(nos, 'campo')
    const celular = celularDe(doc)
    const x4 = xDaColuna(4, doc.largura, doc.clientWidth)
    const meio = doc.largura / 2
    const falhas = []
    const fios = fiosVerticais(nos).filter((fio) => fio.ilegivel || fim === null || fio.y + fio.h > fim + 1)
    for (const fio of fios) {
      if (fio.ilegivel) falhas.push({ no: fio.no, motivo: `${fio.no}: fio vertical sem posição legível` })
      else if (celular) falhas.push({ no: fio.no, motivo: `${fio.no}: fio vertical em x=${fio.x.toFixed(1)} abaixo de 768 (não há)` })
      else if (Math.abs(fio.x - meio) <= 8) falhas.push({ no: fio.no, motivo: `${fio.no}: fio vertical em x=${fio.x.toFixed(1)}, no meio da janela` })
      else if (!perto(fio.x, x4, TOL)) falhas.push({ no: fio.no, motivo: `${fio.no}: fio vertical em x=${fio.x.toFixed(1)} em vez de x de c4 (${x4.toFixed(1)})` })
    }
    if (!celular) {
      for (const campo of campos) {
        const pseudo = Object.values(campo.pseudo ?? {}).find((p) => p && p.display !== 'none' && p.w > 0 && p.w <= 2 && p.h >= 16)
        if (!pseudo || !Number.isFinite(pseudo.x) || !Number.isFinite(pseudo.y)) {
          falhas.push({ no: descrever(campo), motivo: 'linha de campo sem o fio vertical em x de c4 (::before)' })
          continue
        }
        if (!perto(pseudo.x, x4, TOL)) falhas.push({ no: descrever(campo), motivo: `fio do campo em x=${pseudo.x.toFixed(1)} em vez de ${x4.toFixed(1)}` })
        if (!perto(pseudo.y + pseudo.h, campo.rect.y + campo.rect.h, TOL)) {
          falhas.push({ no: descrever(campo), motivo: `fio do campo termina em y=${(pseudo.y + pseudo.h).toFixed(1)}, o campo em y=${(campo.rect.y + campo.rect.h).toFixed(1)}` })
        }
        if (!perto(pseudo.y, campo.rect.y + 32, TOL)) {
          falhas.push({ no: descrever(campo), motivo: `fio do campo começa em y=${pseudo.y.toFixed(1)}, a 32 px do topo seria ${(campo.rect.y + 32).toFixed(1)}` })
        }
      }
    }
    if (fim === null) falhas.push({ no: 'documento', motivo: 'nenhuma abertura (.sb-abertura)' })
    if (campos.length === 0) falhas.push({ no: 'documento', motivo: 'nenhuma linha de campo (.sb-campo)' })
    return resultadoDeTela('E-1', falhas, `${campos.length} campos com o fio em x de c4 e nenhum no meio da janela`)
  })
}

/** A caixa de altura do campo: a linha inteira (≥ 768) ou o `.sb-campo-controle` (abaixo de 768). */
function caixaDoCampo(nos, campo, celular) {
  return celular ? nosVisiveis(nos, 'campoControle').find((c) => contem(campo, c)) : campo
}

/**
 * E-2: cada linha de campo tem 112 px (a caixa do campo tem 64 em 390); o rótulo tem 32 px e o texto
 * digitado 48 (24 e 32 em 390). Todo controle fica dentro de uma linha de campo.
 */
export function e2(nos, doc) {
  return comDoc('E-2', doc, () => {
    const campos = nosVisiveis(nos, 'campo')
    const controles = nosVisiveis(nos, 'controle')
    const rotulos = nosVisiveis(nos, 'rotuloCampo')
    if (campos.length === 0 && controles.length === 0) return falhaFechada('E-2', 'nenhum campo: sem linha (.sb-campo) e sem controle')
    const celular = celularDe(doc)
    const alvo = celular ? { altura: 64, rotulo: 24, texto: 32 } : { altura: 112, rotulo: 32, texto: 48 }
    const falhas = []
    // Os tamanhos de letra se medem em cada controle e em cada rótulo, com ou sem `.sb-campo` em volta.
    for (const controle of controles) {
      if (!perto(px(controle.estilo?.fontSize), alvo.texto, 0.01)) {
        falhas.push({ no: descrever(controle), motivo: `${descrever(controle)}: texto digitado com font-size ${controle.estilo?.fontSize} em vez de ${alvo.texto}px` })
      }
    }
    for (const rotulo of rotulos) {
      if (!perto(px(rotulo.estilo?.fontSize), alvo.rotulo, 0.01)) {
        falhas.push({ no: descrever(rotulo), motivo: `${descrever(rotulo)}: rótulo com font-size ${rotulo.estilo?.fontSize} em vez de ${alvo.rotulo}px` })
      }
    }
    campos.forEach((campo, i) => {
      const nome = `campo ${i + 1}`
      const caixa = caixaDoCampo(nos, campo, celular)
      if (!caixa || !rectValido(caixa.rect)) falhas.push({ no: nome, motivo: `${nome}: sem a caixa do campo` })
      else if (!perto(caixa.rect.h, alvo.altura, TOL)) falhas.push({ no: nome, motivo: `${nome}: altura ${caixa.rect.h.toFixed(1)} em vez de ${alvo.altura}` })
      if (!rotulos.some((l) => contem(campo, l))) falhas.push({ no: nome, motivo: `${nome}: sem rótulo (label)` })
      if (!controles.some((c) => contem(campo, c))) falhas.push({ no: nome, motivo: `${nome}: sem controle` })
    })
    for (const controle of controles) {
      if (!campos.some((campo) => contem(campo, controle))) falhas.push({ no: descrever(controle), motivo: `${descrever(controle)}: controle fora de uma linha de campo (.sb-campo)` })
    }
    if (campos.length === 0) falhas.push({ no: 'documento', motivo: 'nenhuma linha de campo (.sb-campo)' })
    return resultadoDeTela('E-2', falhas, `${campos.length} campos de ${alvo.altura} px, rótulo ${alvo.rotulo} e texto ${alvo.texto}`)
  })
}

/**
 * E-3: o `input` não tem borda nos 4 lados. O fio inferior da linha tem 1 px e vai de x de c2 (169,6)
 * ao início de c9 (1132,8). Abaixo de 768, o fio de 1 px fica na caixa do campo.
 */
export function e3(nos, doc) {
  return comDoc('E-3', doc, () => {
    const campos = nosVisiveis(nos, 'campo')
    const controles = nosVisiveis(nos, 'controle')
    if (campos.length === 0 && controles.length === 0) return falhaFechada('E-3', 'nenhum campo: sem linha (.sb-campo) e sem controle')
    const celular = celularDe(doc)
    const x2 = xDaColuna(2, doc.largura, doc.clientWidth)
    const x9 = xDaColuna(9, doc.largura, doc.clientWidth)
    const falhas = []
    // A borda nos 4 lados se mede em cada controle, com ou sem `.sb-campo` em volta.
    for (const controle of controles) {
      if (quatroLados(controle.estilo)) falhas.push({ no: descrever(controle), motivo: `${descrever(controle)}: borda nos 4 lados` })
    }
    campos.forEach((campo, i) => {
      const nome = `campo ${i + 1}`
      const caixa = caixaDoCampo(nos, campo, celular)
      if (!caixa || !rectValido(caixa.rect)) {
        falhas.push({ no: nome, motivo: `${nome}: sem a caixa do campo` })
        return
      }
      const e = caixa.estilo ?? {}
      const largura = px(e.borderBottomWidth)
      if (Number.isNaN(largura)) falhas.push({ no: nome, motivo: `${nome}: border-bottom ausente` })
      else if (!perto(largura, 1, 0.01) || e.borderBottomStyle !== 'solid') falhas.push({ no: nome, motivo: `${nome}: fio inferior de ${e.borderBottomWidth} ${e.borderBottomStyle} em vez de 1px solid` })
      if (!celular) {
        if (!perto(caixa.rect.x, x2, TOL)) falhas.push({ no: nome, motivo: `${nome}: o fio começa em x=${caixa.rect.x.toFixed(1)} em vez de ${x2.toFixed(1)}` })
        if (!perto(caixa.rect.x + caixa.rect.w, x9, TOL)) falhas.push({ no: nome, motivo: `${nome}: o fio termina em x=${(caixa.rect.x + caixa.rect.w).toFixed(1)} em vez de ${x9.toFixed(1)}` })
      }
    })
    for (const controle of controles) {
      if (!campos.some((campo) => contem(campo, controle))) falhas.push({ no: descrever(controle), motivo: `${descrever(controle)}: controle fora de uma linha de campo (.sb-campo)` })
    }
    if (campos.length === 0) falhas.push({ no: 'documento', motivo: 'nenhuma linha de campo (.sb-campo)' })
    return resultadoDeTela('E-3', falhas, `${campos.length} campos com fio de 1 px, sem borda nos 4 lados`)
  })
}

/** E-4: o botão de envio termina em y ≤ 720 (1440×900) ou y ≤ 660 (390×844). */
export function e4(nos, doc) {
  return comDoc('E-4', doc, () => {
    const botao = botaoDoFormulario(nos)
    if (!botao) return falhaFechada('E-4', 'nenhum botão de envio (main form button[type=submit])')
    const limite = celularDe(doc) ? 660 : 720
    const fim = botao.rect.y + botao.rect.h
    const ok = fim <= limite + 0.5
    return {
      regra: 'E-4',
      ok,
      motivo: `${descrever(botao)} termina em y=${fim.toFixed(1)} (máximo ${limite})`,
      nos_com_falha: ok ? [] : [descrever(botao)],
    }
  })
}

/** E-5: o botão de envio tem altura 80 (64) e começa em x de c4 + 32 (476,8); em 390 tem a largura da área útil. */
export function e5(nos, doc) {
  return comDoc('E-5', doc, () => {
    const botao = botaoDoFormulario(nos)
    if (!botao) return falhaFechada('E-5', 'nenhum botão de envio (main form button[type=submit])')
    const celular = celularDe(doc)
    const altura = celular ? 64 : 80
    const x = celular ? xDaColuna(1, doc.largura, doc.clientWidth) : xDaColuna(4, doc.largura, doc.clientWidth) + 32
    const falhas = []
    const falhar = (motivo) => falhas.push({ no: descrever(botao), motivo: `${descrever(botao)}: ${motivo}` })
    if (!perto(botao.rect.h, altura, TOL)) falhar(`altura ${botao.rect.h.toFixed(1)} em vez de ${altura}`)
    if (!perto(botao.rect.x, x, TOL)) falhar(`x=${botao.rect.x.toFixed(1)} em vez de ${x.toFixed(1)}`)
    if (celular) {
      const largura = areaUtilDe(doc.largura, doc.clientWidth)
      if (!perto(botao.rect.w, largura, TOL)) falhar(`largura ${botao.rect.w.toFixed(1)} em vez de ${largura.toFixed(1)}`)
    }
    return resultadoDeTela('E-5', falhas, `botão de ${altura} px em x=${botao.rect.x.toFixed(1)}`)
  })
}

/**
 * E-6 (o que o número alcança): à direita de x de c9 (1132,8) não há conteúdo abaixo da abertura. A
 * coluna vazia ao lado de um bloco é do olho (G8 só mede a diferença de altura).
 */
export function e6(nos, doc) {
  return comDoc('E-6', doc, () => {
    // Sem abertura, todo o conteúdo do main entra na conta (o que passa de c9 é defeito de qualquer
    // jeito) e a falta da abertura é acusada depois.
    const fim = aberturaFim(nos)
    const { direita } = limitesDeColuna(doc)
    const itens = conteudoAbaixoDaAbertura(nos, fim ?? Number.NEGATIVE_INFINITY)
    if (itens.length === 0) return falhaFechada('E-6', 'nenhum conteúdo abaixo da abertura')
    const falhas = []
    for (const { no, caixa } of itens) {
      const termina = caixa.x + caixa.w
      if (termina > direita + TOL) falhas.push({ no: descrever(no), motivo: `${descrever(no)} termina em x=${termina.toFixed(1)}, à direita de ${direita.toFixed(1)}` })
    }
    if (fim === null) falhas.push({ no: 'documento', motivo: 'nenhuma abertura (.sb-abertura)' })
    return resultadoDeTela('E-6', falhas, `${itens.length} itens abaixo da abertura, nenhum à direita de x=${direita.toFixed(1)}`)
  })
}

const FOCO_TINTA = ['#1A1511']
const FOCO_MADRUGADA = ['#F7EFE2']

/** A tolerância da geometria do envio: meio pixel de arredondamento passa, um pixel inteiro não. */
const TOL_ENVIO = 0.6
/** Quantas falhas a mensagem de E-7 e R-3 lista antes de resumir o resto ("e mais N"). */
const FALHAS_NA_MENSAGEM = 8

/**
 * Como `resultadoDeTela`, mas o motivo lista as falhas (até `FALHAS_NA_MENSAGEM`), para a mensagem trazer
 * todos os números que mudaram (altura da linha, da página, topo do botão), e não só o da primeira.
 */
function resultadoComNumeros(regra, falhas, motivoOk) {
  const ok = falhas.length === 0
  const mostradas = falhas.slice(0, FALHAS_NA_MENSAGEM).map((f) => f.motivo).join('; ')
  const resto = falhas.length > FALHAS_NA_MENSAGEM ? ` (e mais ${falhas.length - FALHAS_NA_MENSAGEM})` : ''
  return { regra, ok, motivo: ok ? motivoOk : `${mostradas}${resto}`, nos_com_falha: falhas.map((f) => f.no) }
}

/** O estado lido por `lerEstadoDeEnvioNaPagina` tem o formato que as regras de geometria usam? */
const estadoDeEnvioLegivel = (estado) =>
  Boolean(estado) &&
  typeof estado === 'object' &&
  Number.isFinite(estado.pagina) &&
  Array.isArray(estado.linhas) &&
  Array.isArray(estado.mensagens) &&
  Array.isArray(estado.colisoes)

/**
 * A geometria de um envio (E-7 e R-3): `par` é `{ antes, depois }` do `lerEstadoDeEnvioNaPagina`. Nada muda de
 * lugar: cada linha de campo mantém altura e topo, a página mantém a altura, o botão de envio mantém o topo; e
 * depois do envio nenhuma mensagem está cortada, fora da janela ou cobrindo outro elemento. `extra(depois)`
 * devolve as falhas próprias do critério (a mensagem esperada, o limite de linhas). Falha fechado: leitura
 * ausente ou incompleta, nenhuma linha de campo antes do envio, botão sem leitura e medida ilegível reprovam.
 */
function geometriaDoEnvio(par, nome, extra) {
  const falhas = []
  const falhar = (no, motivo) => falhas.push({ no, motivo })
  if (!par || typeof par !== 'object') return [{ no: 'envio', motivo: `sem a leitura do ${nome}` }]
  const { antes, depois } = par
  if (!estadoDeEnvioLegivel(antes) || !estadoDeEnvioLegivel(depois)) {
    return [{ no: 'envio', motivo: `leitura do ${nome} incompleta (faltam o antes, o depois ou campos da leitura)` }]
  }
  if (antes.linhas.length === 0) return [{ no: 'envio', motivo: `nenhuma linha de campo (.sb-campo) antes do ${nome}` }]
  if (depois.linhas.length !== antes.linhas.length) {
    falhar('linhas de campo', `linhas de campo: ${antes.linhas.length} antes e ${depois.linhas.length} depois`)
  }
  antes.linhas.forEach((linha, i) => {
    const depoisDela = depois.linhas[i]
    if (!depoisDela) return
    const rotulo = `linha ${i + 1}`
    if (![linha.altura, linha.top, depoisDela.altura, depoisDela.top].every(Number.isFinite)) {
      falhar(rotulo, `${rotulo}: medida ilegível`)
      return
    }
    if (!perto(linha.altura, depoisDela.altura, TOL_ENVIO)) falhar(rotulo, `${rotulo}: altura ${linha.altura} -> ${depoisDela.altura}`)
    if (!perto(linha.top, depoisDela.top, TOL_ENVIO)) falhar(rotulo, `${rotulo}: topo ${linha.top} -> ${depoisDela.top}`)
  })
  if (!perto(antes.pagina, depois.pagina, TOL_ENVIO)) falhar('página', `página: altura ${antes.pagina} -> ${depois.pagina}`)
  if (!ehNumero(antes.botao?.top) || !ehNumero(depois.botao?.top)) {
    falhar('botão de envio', 'botão de envio: sem a leitura do topo (antes ou depois)')
  } else if (!perto(antes.botao.top, depois.botao.top, TOL_ENVIO)) {
    falhar('botão de envio', `botão de envio: topo ${antes.botao.top} -> ${depois.botao.top}`)
  }
  for (const m of depois.mensagens) {
    const dela = `"${m.texto ?? ''}"`
    if (m.cortada) falhar('mensagem', `mensagem cortada: ${dela}`)
    if (m.foraDaJanela) falhar('mensagem', `mensagem fora da janela: ${dela}`)
  }
  for (const k of depois.colisoes) falhar('mensagem', `mensagem "${k.mensagem}" cobre ${k.com} (${k.w} x ${k.h})`)
  for (const f of extra(depois)) falhas.push(f)
  return falhas
}

/** Confere que cada mensagem de `tipos` tem uma das `permitidas` linhas; contagem ilegível reprova. */
function limiteDeLinhas(depois, tipos, permitidas, limite) {
  const falhas = []
  for (const m of depois.mensagens.filter((x) => tipos.includes(x.tipo))) {
    if (!ehNumero(m.linhas)) falhas.push({ no: 'mensagem', motivo: `mensagem de ${m.tipo}: contagem de linhas ilegível ("${m.texto ?? ''}")` })
    else if (!permitidas.includes(m.linhas)) {
      falhas.push({ no: 'mensagem', motivo: `mensagem de ${m.tipo} com ${m.linhas} linhas (o limite é ${limite}): "${m.texto ?? ''}"` })
    }
  }
  return falhas
}

/** A folga mínima entre a borda de baixo do anel de foco e a tinta da mensagem do mesmo campo (px). */
export const FOLGA_ANEL_MENSAGEM = 4
/** Meio quarto de pixel de arredondamento da leitura passa; um pixel inteiro não. */
const TOL_FOLGA = 0.25

/**
 * O anel de foco não toca a mensagem do campo (E-7). O anel é a caixa do controle ampliada por `outline-offset`
 * mais `outline-width` (2 + 2 = 4 px para cada lado). A medida honesta da mensagem é o topo da tinta da primeira
 * linha (`topoLetra`), não o da caixa dela: a caixa tem 24 px e a letra 17, e a tinta começa uns 5 px abaixo do
 * topo da caixa, então medir pela caixa daria uma folga que o olho não vê. A folga é `topoLetra - base do anel`
 * e o mínimo é `FOLGA_ANEL_MENSAGEM`. Falha fechada: sem a caixa do controle, sem as mensagens, medida de anel
 * ilegível e mensagem sem retângulo reprovam. `exigirMensagem` reprova a leitura que não achou mensagem nenhuma
 * (depois do envio vazio o campo tem erro; sem ele a medida estaria cega).
 */
function anelSemTocarAMensagem(leitura, rotulo, { exigirMensagem = false } = {}) {
  const falhar = (motivo) => [{ no: rotulo, motivo: `${rotulo}: ${motivo}` }]
  if (!leitura || typeof leitura !== 'object') return falhar('sem a leitura do foco para medir a folga do anel')
  if (leitura.focou !== true) return falhar('não recebeu foco, sem como medir a folga do anel')
  const caixa = leitura.caixa
  if (!caixa || typeof caixa !== 'object' || ![caixa.top, caixa.bottom, caixa.left, caixa.right].every(ehNumero)) {
    return falhar('sem o retângulo do controle (caixa) para medir a folga do anel')
  }
  const largura = px(leitura.outlineWidth)
  const recuo = px(leitura.outlineOffset)
  if (!ehNumero(largura) || !ehNumero(recuo)) return falhar('largura ou offset do anel ilegível, sem como medir a folga')
  if (!Array.isArray(leitura.mensagens)) return falhar('sem a leitura das mensagens do campo para medir a folga do anel')
  if (exigirMensagem && leitura.mensagens.length === 0) return falhar('o campo não mostra nenhuma mensagem para medir a folga do anel')
  const alcance = largura + recuo
  const anel = { top: caixa.top - alcance, bottom: caixa.bottom + alcance, left: caixa.left - alcance, right: caixa.right + alcance }
  const falhas = []
  for (const m of leitura.mensagens) {
    const dela = `${m?.tipo ?? 'mensagem'} "${m?.texto ?? ''}"`
    if (!m || typeof m !== 'object' || ![m.top, m.bottom, m.left, m.right, m.topoLetra].every(ehNumero)) {
      falhas.push(...falhar(`${dela} sem retângulo (caixa ou topo da letra ilegível), sem como medir a folga do anel`))
      continue
    }
    if (m.right <= anel.left || m.left >= anel.right || m.bottom <= anel.top) continue
    const folga = m.topoLetra - anel.bottom
    if (folga < FOLGA_ANEL_MENSAGEM - TOL_FOLGA) {
      falhas.push(
        ...falhar(
          `o anel de foco (base em y=${anel.bottom.toFixed(1)}) fica a ${folga.toFixed(1)} px da letra de ${dela} (começa em y=${m.topoLetra.toFixed(1)}; o mínimo é ${FOLGA_ANEL_MENSAGEM})`,
        ),
      )
    }
  }
  return falhas
}

/**
 * E-7: (1) o foco tem anel de 2 px (`outline` sólido, offset 2, cor da tinta; na madrugada, `#F7EFE2`) no
 * primeiro controle e no botão de envio; (1b) o anel do primeiro controle não toca a mensagem visível do mesmo
 * campo: a folga entre a base do anel e a tinta da mensagem é de pelo menos 4 px, lida com o campo em repouso
 * (a ajuda, onde houver) e de novo depois do envio vazio (o erro, `doc.envio.vazio.foco`); (2) o erro aparece em
 * 17/24 abaixo do campo, sem mudar a altura da linha: com o formulário enviado vazio (`doc.envio.vazio`, o antes e
 * o depois), a altura e o topo de cada linha, a altura da página e o topo do botão de envio não mudam, aparece ao
 * menos uma mensagem de erro, e cada mensagem de erro ou de ajuda tem 1 linha, sem corte, sem sair da janela, sem
 * cobrir outro elemento.
 */
export function e7(doc, tema) {
  const foco = doc?.foco
  const cores = ehMadrugada(tema) ? FOCO_MADRUGADA : FOCO_TINTA
  const falhas = []
  if (!foco || typeof foco !== 'object') falhas.push({ no: 'foco', motivo: 'sem a leitura do anel de foco' })
  else {
    for (const [nome, leitura] of [['controle', foco.controle], ['botão de envio', foco.botao]]) {
      if (!leitura || typeof leitura !== 'object') {
        falhas.push({ no: nome, motivo: `${nome}: sem a leitura do foco (elemento não achado)` })
        continue
      }
      if (leitura.focou !== true) {
        falhas.push({ no: nome, motivo: `${nome}: não recebeu foco` })
        continue
      }
      const problemas = []
      if (leitura.outlineStyle === undefined || leitura.outlineStyle === '' || leitura.outlineStyle === 'none') problemas.push('sem outline')
      else if (leitura.outlineStyle !== 'solid') problemas.push(`outline ${leitura.outlineStyle}`)
      if (!perto(px(leitura.outlineWidth), 2, 0.01)) problemas.push(`largura ${leitura.outlineWidth} em vez de 2px`)
      if (!perto(px(leitura.outlineOffset), 2, 0.01)) problemas.push(`offset ${leitura.outlineOffset} em vez de 2px`)
      if (!ehCor(parseCor(leitura.outlineColor), cores)) problemas.push(`cor ${leitura.outlineColor} em vez de ${cores[0]}`)
      if (problemas.length > 0) falhas.push({ no: nome, motivo: `${nome}: ${problemas.join('; ')}` })
    }
    // A folga entre o anel do primeiro controle e a mensagem do campo, em repouso (a ajuda, onde houver).
    if (foco.controle && typeof foco.controle === 'object' && foco.controle.focou === true) {
      falhas.push(...anelSemTocarAMensagem(foco.controle, 'controle em repouso'))
    }
  }
  // E depois do envio vazio (o erro): a leitura do foco com a mensagem de erro à vista.
  const focoDoErro = doc?.envio?.vazio?.foco
  if (doc?.envio?.vazio && typeof doc.envio.vazio === 'object') {
    falhas.push(...anelSemTocarAMensagem(focoDoErro?.controle, 'controle depois do envio vazio', { exigirMensagem: true }))
  }
  falhas.push(
    ...geometriaDoEnvio(doc?.envio?.vazio, 'envio do formulário vazio', (depois) => [
      ...(depois.mensagens.some((m) => m.tipo === 'erro') ? [] : [{ no: 'mensagem', motivo: 'depois do envio vazio não há mensagem de erro visível' }]),
      ...limiteDeLinhas(depois, ['erro', 'ajuda'], [1], 1),
    ]),
  )
  return resultadoComNumeros('E-7', falhas, 'anel de foco certo e o envio vazio não muda linha, página nem botão; o erro tem 1 linha')
}

/**
 * R-3 (Recuperar): depois do envio com o e-mail preenchido (`doc.envio.enviado`, o antes e o depois), a
 * mensagem de status está visível, ocupa a mesma linha de campo e a página não muda de altura; valem as
 * mesmas regras de geometria do E-7 (linha, página, botão, sem corte, sem cobrir). De 768 para cima a
 * confirmação pode ter 1 ou 2 linhas (mora na linha de 112 px). Abaixo de 768 (volta 3, D4) a zona de mensagem
 * é de 1 linha (32 px), então a confirmação tem exatamente 1 (24 px de caixa): com 2 ela passaria da zona.
 */
export function r3(doc) {
  const celular = Boolean(doc) && Number.isFinite(doc.largura) && celularDe(doc)
  const permitidas = celular ? [1] : [1, 2]
  const falhas = geometriaDoEnvio(doc?.envio?.enviado, 'envio com o e-mail preenchido', (depois) => [
    ...(depois.mensagens.some((m) => m.tipo === 'status') ? [] : [{ no: 'mensagem', motivo: 'depois do envio não há mensagem de status visível' }]),
    ...limiteDeLinhas(depois, ['status'], permitidas, celular ? '1' : '1 ou 2'),
  ])
  return resultadoComNumeros('R-3', falhas, `a confirmação (${celular ? '1 linha' : '1 ou 2 linhas'}) ocupa a mesma linha e a página não muda de altura`)
}

// ---------------------------------------------------------------------------------------------
// MAT-44d-3, volta 3, defeito D3: a ajuda e o erro colavam no fio da linha de campo (1440), o anel de foco passava do
// fim do fio e o select de fuso mostrava "America/Sao_Paulo". O contrato de acabamento (2.4): a escala de espaço tem
// o menor passo em 8 e nenhum texto fica a menos de 8 px de um fio. Quatro critérios, lidos nos estados em que há
// mensagem (a ajuda em repouso e o erro depois do envio vazio):
//   D3-fio:      fio.top - mensagem.bottom >= 8     (o fio é a borda de baixo da linha: topo = bottom - 1)
//   D3-controle: mensagem.top - controle.bottom >= 8
//   D3-anel:     o anel (a caixa do controle + outline-offset + outline-width) fica entre o começo e o fim do fio
//   D3-fuso:     nenhum texto de <option> do select de fuso, nem o texto visível dele, tem "_"
// Os três primeiros são de 768 para cima ("não aplicável" em 390, que tem outro desenho). Falham fechado: leitura
// ausente, retângulo ausente ou ilegível, e o estado que exige uma mensagem sem nenhuma à vista reprovam.

/** O ar mínimo entre a base da mensagem e o fio da linha (px). */
export const FOLGA_FIO_MENSAGEM = 8
/** O ar mínimo entre a base do controle e o topo da mensagem (px). */
export const FOLGA_CONTROLE_MENSAGEM = 8

/**
 * Em que telas a ajuda (em repouso) e o select de fuso existem; o erro depois do envio vazio vale em qualquer uma. O
 * Perfil da Conta não tem texto de ajuda (só o nome, o e-mail e o fuso, sem `ajuda`): lá só o erro é exigido.
 */
const CASOS_COM_AJUDA = ['criar_conta', 'comecar_seu_nome']
const CASOS_COM_FUSO = ['comecar_seu_nome', 'conta']

/** Os dois estados lidos: o que cada um exige de mensagem, e em quais telas. */
const ESTADOS_DA_GEOMETRIA = [
  { nome: 'em repouso', leitura: (doc) => doc?.geometria, exigida: 'ajuda', exigeEm: (caso) => CASOS_COM_AJUDA.includes(caso) },
  { nome: 'depois do envio vazio', leitura: (doc) => doc?.envio?.vazio?.geometria, exigida: 'erro', exigeEm: () => true },
]

const NOMES_DE_MENSAGEM = { ajuda: 'a ajuda', erro: 'o erro', status: 'o status' }
const dizerMensagem = (m) => `${NOMES_DE_MENSAGEM[m?.tipo] ?? 'a mensagem'} "${m?.texto ?? ''}"`
const caixaLegivel = (c) => Boolean(c) && typeof c === 'object' && [c.top, c.bottom, c.left, c.right].every(ehNumero)

/**
 * Percorre as linhas de campo de cada estado lido e entrega a `medirCampo` as que têm o que a regra precisa
 * (`fio`, `controle`, e sempre as mensagens, cada uma com o retângulo inteiro). `exigirMensagem` reprova o estado
 * que, nesta tela, tem de mostrar uma mensagem e não mostra nenhuma do tipo (a ajuda em repouso, o erro depois do
 * envio vazio): sem ela a medida estaria cega. Devolve as falhas `{ no, motivo }`.
 */
function medirGeometriaDosCampos(doc, caso, { fio = false, controle = false, exigirMensagem = true }, medirCampo) {
  const falhas = []
  for (const estado of ESTADOS_DA_GEOMETRIA) {
    const leitura = estado.leitura(doc)
    if (!leitura || typeof leitura !== 'object') {
      falhas.push({ no: estado.nome, motivo: `${estado.nome}: sem a leitura da geometria dos campos` })
      continue
    }
    if (!Array.isArray(leitura.campos) || leitura.campos.length === 0) {
      falhas.push({ no: estado.nome, motivo: `${estado.nome}: nenhuma linha de campo (.sb-campo) na leitura` })
      continue
    }
    let exigidas = 0
    leitura.campos.forEach((campo, i) => {
      const nome = `${estado.nome}: campo ${i + 1} (${campo?.rotulo ?? '?'})`
      const falhar = (motivo) => falhas.push({ no: `${estado.nome}: campo ${i + 1}`, motivo: `${nome}: ${motivo}` })
      if (!campo || typeof campo !== 'object') return falhar('sem a leitura da linha')
      let legivel = true
      if (fio && !caixaLegivel(campo.fio)) {
        falhar('sem o retângulo do fio da linha')
        legivel = false
      }
      if (controle && !caixaLegivel(campo.controle)) {
        falhar('sem o retângulo do controle')
        legivel = false
      }
      if (!Array.isArray(campo.mensagens)) {
        falhar('sem a leitura das mensagens da linha')
        return
      }
      exigidas += campo.mensagens.filter((m) => m?.tipo === estado.exigida).length
      if (!legivel) return
      medirCampo({ campo, estado, falhar })
    })
    if (exigirMensagem && estado.exigeEm(caso) && exigidas === 0) {
      falhas.push({ no: estado.nome, motivo: `${estado.nome}: nenhuma mensagem de ${estado.exigida} visível (o estado exige uma; sem ela não há o que medir)` })
    }
  }
  return falhas
}

/** D3-fio: do fim da mensagem ao topo do fio da linha, 8 px ou mais. Só de 768 para cima. */
export function d3Fio(doc, caso) {
  return comDoc('D3-fio', doc, () => {
    if (celularDe(doc)) return naoAplicavel('D3-fio', 'o desenho de 390 é de outro passo')
    const falhas = medirGeometriaDosCampos(doc, caso, { fio: true }, ({ campo, falhar }) => {
      for (const m of campo.mensagens) {
        if (!caixaLegivel(m)) {
          falhar(`${dizerMensagem(m)} sem retângulo (caixa ilegível), sem como medir a folga até o fio`)
          continue
        }
        const folga = campo.fio.top - m.bottom
        if (folga < FOLGA_FIO_MENSAGEM - TOL_FOLGA) {
          falhar(`${dizerMensagem(m)} termina em y=${m.bottom.toFixed(1)} e o fio da linha começa em y=${campo.fio.top.toFixed(1)}: folga de ${folga.toFixed(1)} px (o mínimo é ${FOLGA_FIO_MENSAGEM})`)
        }
      }
    })
    return resultadoComNumeros('D3-fio', falhas, `a mensagem termina a ${FOLGA_FIO_MENSAGEM} px ou mais do fio da linha, em repouso e depois do envio vazio`)
  })
}

/** D3-controle: da base do controle ao topo da mensagem, 8 px ou mais. Só de 768 para cima. */
export function d3Controle(doc, caso) {
  return comDoc('D3-controle', doc, () => {
    if (celularDe(doc)) return naoAplicavel('D3-controle', 'o desenho de 390 é de outro passo')
    const falhas = medirGeometriaDosCampos(doc, caso, { controle: true }, ({ campo, falhar }) => {
      for (const m of campo.mensagens) {
        if (!caixaLegivel(m)) {
          falhar(`${dizerMensagem(m)} sem retângulo (caixa ilegível), sem como medir a folga até o controle`)
          continue
        }
        const folga = m.top - campo.controle.bottom
        if (folga < FOLGA_CONTROLE_MENSAGEM - TOL_FOLGA) {
          falhar(`${dizerMensagem(m)} começa em y=${m.top.toFixed(1)} e o controle termina em y=${campo.controle.bottom.toFixed(1)}: folga de ${folga.toFixed(1)} px (o mínimo é ${FOLGA_CONTROLE_MENSAGEM})`)
        }
      }
    })
    return resultadoComNumeros('D3-controle', falhas, `a mensagem começa a ${FOLGA_CONTROLE_MENSAGEM} px ou mais do controle, em repouso e depois do envio vazio`)
  })
}

/**
 * D3-anel: o anel de foco de cada controle (a caixa dele ampliada por `outline-offset` + `outline-width`, lidos do estilo
 * calculado com o controle em foco) fica entre o começo e o fim do fio da linha. Só de 768 para cima. A tolerância é a
 * de `TOL_FOLGA`: 0,25 px de arredondamento passa, um pixel inteiro não.
 */
export function d3Anel(doc, caso) {
  return comDoc('D3-anel', doc, () => {
    if (celularDe(doc)) return naoAplicavel('D3-anel', 'o desenho de 390 é de outro passo')
    const falhas = medirGeometriaDosCampos(doc, caso, { fio: true, controle: true, exigirMensagem: false }, ({ campo, falhar }) => {
      const c = campo.controle
      if (c.focou !== true) return falhar('não recebeu foco, sem como medir o anel')
      if (c.outlineStyle === undefined || c.outlineStyle === '' || c.outlineStyle === 'none') return falhar('sem outline no foco (o anel não aparece)')
      const largura = px(c.outlineWidth)
      const recuo = px(c.outlineOffset)
      if (!(largura > 0) || !ehNumero(recuo)) return falhar(`largura ou offset do anel ilegível (${c.outlineWidth} e ${c.outlineOffset}), sem como medir`)
      const alcance = largura + recuo
      const direita = c.right + alcance
      const esquerda = c.left - alcance
      if (direita > campo.fio.right + TOL_FOLGA) {
        falhar(`o anel de foco termina em x=${direita.toFixed(1)}, depois do fim do fio (x=${campo.fio.right.toFixed(1)})`)
      }
      if (esquerda < campo.fio.left - TOL_FOLGA) {
        falhar(`o anel de foco começa em x=${esquerda.toFixed(1)}, antes do começo do fio (x=${campo.fio.left.toFixed(1)})`)
      }
    })
    return resultadoComNumeros('D3-anel', falhas, 'o anel de foco de cada controle fica entre o começo e o fim do fio da linha')
  })
}

// ---------------------------------------------------------------------------------------------
// MAT-44d-3, volta 3, defeito D4: em 390 o Recuperar tinha ~96 px entre o fio do campo e o topo do botão "Enviar
// link": 64 px de zona reservada para uma confirmação de 2 linhas mais 32 px de margem do botão (nas telas irmãs são
// 33). A confirmação passou a ter 1 linha, a zona é de 1 linha (8 de ar + 24 = 32) e o vão é de 32 + 32.
//   D4-vao: em 390, em repouso, botão.top - fio.bottom <= 64.
// O fio de 390 é a borda de baixo do `.sb-campo-controle`, NÃO a base do `.sb-campo`: abaixo de 768 a linha não tem borda
// de baixo e a zona de mensagem é o `padding-bottom` dela, então a caixa da linha passa do fio (no Chrome: fio em y=568,
// caixa em 600, botão em 632). Pela caixa o vão de 96 px de antes mediria 32 e passaria; por isso a leitura de envio traz
// `controles[i].bottom` e o critério mede dali.
// A estabilidade da página (R-3: altura da página, da linha e topo do botão iguais antes e depois do envio) segue no
// R-3, que em 390 passa a exigir a confirmação de 1 linha (a zona de 32 px não comporta 2).

/** O maior vão aceito entre o fio do campo (a base do controle) e o topo do botão de envio, em 390 (px). */
export const VAO_MAXIMO_CAMPO_BOTAO = 64
/** A largura da janela em que o D4-vao vale (o celular de referência). */
const LARGURA_DO_D4 = 390

/**
 * D4-vao: o vão do fio do campo (a base do `.sb-campo-controle` da última linha, a que está sobre o botão) ao topo do
 * botão de envio, em 390, no Recuperar em repouso (a leitura `doc.envio.enviado.antes`: a tela recém-aberta, antes de
 * preencher e de enviar, sem mensagem). De 768 para cima não se aplica (a mensagem mora dentro da linha de 112 px);
 * abaixo de 768 e diferente de 390 reprova fechado, porque os 64 px só se sustentam com a confirmação de 1 linha, que
 * é a de 358 px. Falha fechada também: leitura ausente, nenhuma linha de campo, a linha sem a base do controle, botão
 * sem topo e vão negativo (o botão acima do fio é leitura quebrada). A caixa do `.sb-campo` não entra na conta.
 */
export function d4Vao(doc) {
  return comDoc('D4-vao', doc, () => {
    if (!celularDe(doc)) return naoAplicavel('D4-vao', 'o desenho de 1440 é de outro passo: a mensagem mora dentro da linha de 112 px')
    if (doc.largura !== LARGURA_DO_D4) {
      return falhaFechada('D4-vao', `a largura da janela é ${doc.largura} px: o critério só vale em ${LARGURA_DO_D4} (a confirmação de 1 linha é a de 358 px)`)
    }
    const antes = doc.envio?.enviado?.antes
    if (!estadoDeEnvioLegivel(antes)) return falhaFechada('D4-vao', 'sem a leitura do Recuperar em repouso (doc.envio.enviado.antes)')
    if (antes.linhas.length === 0) return falhaFechada('D4-vao', 'nenhuma linha de campo (.sb-campo) na leitura do Recuperar em repouso')
    const fio = Array.isArray(antes.controles) ? antes.controles[antes.linhas.length - 1] : undefined
    if (!fio || typeof fio !== 'object' || !ehNumero(fio.bottom)) {
      return falhaFechada('D4-vao', 'sem a base do controle (o fio do campo) na leitura do Recuperar em repouso (controles[i].bottom)')
    }
    if (!antes.botao || typeof antes.botao !== 'object') return falhaFechada('D4-vao', 'sem o botão de envio na leitura do Recuperar em repouso')
    if (!ehNumero(antes.botao.top)) return falhaFechada('D4-vao', 'sem o topo do botão de envio (leitura ilegível)')
    const vao = antes.botao.top - fio.bottom
    const falhas = []
    const dizer = `o botão de envio começa em y=${antes.botao.top.toFixed(1)} e o fio do campo (a base do controle) termina em y=${fio.bottom.toFixed(1)}: vão de ${vao.toFixed(1)} px`
    if (vao > VAO_MAXIMO_CAMPO_BOTAO + TOL_FOLGA) falhas.push({ no: 'vão do campo ao botão', motivo: `${dizer} (o máximo é ${VAO_MAXIMO_CAMPO_BOTAO})` })
    else if (vao < -TOL_FOLGA) falhas.push({ no: 'vão do campo ao botão', motivo: `${dizer} (o botão está acima do fio: leitura quebrada)` })
    return resultadoComNumeros('D4-vao', falhas, `o botão de envio começa a ${VAO_MAXIMO_CAMPO_BOTAO} px ou menos do fio do campo, em repouso (vão de ${vao.toFixed(1)} px)`)
  })
}

/** As falhas de um select de fuso: opções e texto visível sem "_", com texto, e sem dois fusos com o mesmo texto. */
function falhasDoSelect(select, prefixo) {
  if (!select || typeof select !== 'object') return [{ no: `${prefixo}: select`, motivo: `${prefixo}: select sem leitura` }]
  const nome = `${prefixo}: select "${select.rotulo ?? '?'}"`
  const falhas = []
  const falhar = (motivo) => falhas.push({ no: nome, motivo: `${nome}: ${motivo}` })
  const textoVisivel = typeof select.textoVisivel === 'string' ? select.textoVisivel.trim() : ''
  if (textoVisivel === '') falhar('sem texto visível')
  else if (textoVisivel.includes('_')) falhar(`o texto visível "${textoVisivel}" tem "_"`)
  if (!Array.isArray(select.opcoes)) {
    falhar('sem a leitura das opções')
    return falhas
  }
  if (select.opcoes.length === 0) {
    falhar('sem opções')
    return falhas
  }
  const textos = select.opcoes.map((o) => (typeof o?.texto === 'string' ? o.texto.trim() : ''))
  const vazias = textos.filter((t) => t === '')
  if (vazias.length > 0) {
    const primeira = select.opcoes[textos.indexOf('')]
    falhar(`${vazias.length} de ${textos.length} opções sem texto (a primeira: valor "${primeira?.valor ?? '?'}")`)
  }
  const comSublinhado = textos.filter((t) => t.includes('_'))
  if (comSublinhado.length > 0) falhar(`${comSublinhado.length} de ${textos.length} opções com "_" (a primeira: "${comSublinhado[0]}")`)
  const contagem = new Map()
  for (const t of textos.filter((x) => x !== '')) contagem.set(t, (contagem.get(t) ?? 0) + 1)
  const repetido = [...contagem].find(([, vezes]) => vezes > 1)
  if (repetido) falhar(`o texto "${repetido[0]}" aparece em ${repetido[1]} opções (dois fusos diferentes têm de mostrar textos diferentes)`)
  return falhas
}

/**
 * D3-fuso: no select de fuso (Começar e Conta) nenhum texto de `<option>` e nenhum texto visível do select tem "_",
 * nenhum está vazio e nenhum se repete. O `value` pode ter "_": é o identificador IANA (`America/Sao_Paulo`), que
 * continua sendo o valor guardado. Vale em qualquer largura. Depois do envio vazio o select também é lido, se a
 * leitura veio.
 */
export function d3Fuso(doc, caso) {
  return comDoc('D3-fuso', doc, () => {
    if (!CASOS_COM_FUSO.includes(caso)) return naoAplicavel('D3-fuso', 'a tela não tem select de fuso')
    const falhas = []
    for (const estado of ESTADOS_DA_GEOMETRIA) {
      const leitura = estado.leitura(doc)
      const obrigatoria = estado.nome === 'em repouso'
      if (!leitura || typeof leitura !== 'object') {
        if (obrigatoria) falhas.push({ no: estado.nome, motivo: `${estado.nome}: sem a leitura da geometria dos campos` })
        continue
      }
      if (!Array.isArray(leitura.selects)) {
        if (obrigatoria) falhas.push({ no: estado.nome, motivo: `${estado.nome}: sem a leitura dos selects` })
        continue
      }
      if (leitura.selects.length === 0) {
        if (obrigatoria) falhas.push({ no: estado.nome, motivo: `${estado.nome}: nenhum select de fuso na tela` })
        continue
      }
      for (const select of leitura.selects) falhas.push(...falhasDoSelect(select, estado.nome))
    }
    return resultadoComNumeros('D3-fuso', falhas, 'o select de fuso mostra nomes sem "_", sem repetição, e o valor segue sendo o identificador')
  })
}

/** C-1: o aviso de demonstração não tem borda nem fundo e tem font-size 15. */
export function c1(nos) {
  const avisos = nosVisiveis(nos, 'avisoDemo')
  if (avisos.length === 0) return falhaFechada('C-1', 'nenhum aviso de demonstração ([data-aviso])')
  const falhas = []
  for (const aviso of avisos) {
    const e = aviso.estilo ?? {}
    const motivos = []
    const larguras = ['Top', 'Right', 'Bottom', 'Left'].map((lado) => px(e[`border${lado}Width`]))
    if (larguras.some(Number.isNaN)) motivos.push('borda ausente')
    else if (larguras.some((largura, i) => largura > 0 && e[`border${['Top', 'Right', 'Bottom', 'Left'][i]}Style`] !== 'none')) motivos.push('tem borda')
    const fundo = parseCor(e.backgroundColor)
    if (!fundo) motivos.push(`fundo ilegível (${e.backgroundColor})`)
    else if (fundo.a > 0.01) motivos.push(`tem fundo (${e.backgroundColor})`)
    if (!perto(px(e.fontSize), 15, 0.01)) motivos.push(`font-size ${e.fontSize} em vez de 15px`)
    if (motivos.length > 0) falhas.push({ no: descrever(aviso), motivo: `${descrever(aviso)}: ${motivos.join('; ')}` })
  }
  return resultadoDeTela('C-1', falhas, `${avisos.length} aviso(s) sem borda nem fundo, em 15 px`)
}

/** C-2: em 1440×900, o botão "Criar conta" termina em y ≤ 880. */
export function c2(nos, doc) {
  return comDoc('C-2', doc, () => {
    if (doc.largura < 992) return naoAplicavel('C-2', 'o critério é de 1440×900')
    const botao = botaoDoFormulario(nos)
    if (!botao) return falhaFechada('C-2', 'nenhum botão de envio (main form button[type=submit])')
    const fim = botao.rect.y + botao.rect.h
    const ok = fim <= 880.5
    return { regra: 'C-2', ok, motivo: `${descrever(botao)} termina em y=${fim.toFixed(1)} (máximo 880)`, nos_com_falha: ok ? [] : [descrever(botao)] }
  })
}

/** C-3: o texto de aceite fica imediatamente antes do botão, a até 24 px. */
export function c3(nos) {
  const botao = botaoDoFormulario(nos)
  if (!botao) return falhaFechada('C-3', 'nenhum botão de envio (main form button[type=submit])')
  const aceites = nosDaLista(nos).filter(
    (no) => visivel(no) && marca(no, 'noMain') && no.tag === 'p' && rectValido(no.rect) && /termos/i.test(`${no.textoTotal ?? ''} ${no.texto ?? ''}`),
  )
  if (aceites.length === 0) return falhaFechada('C-3', 'nenhum texto de aceite (parágrafo com "Termos")')
  const acima = aceites.filter((no) => no.rect.y + no.rect.h <= botao.rect.y + 0.5).sort((a, b) => b.rect.y + b.rect.h - (a.rect.y + a.rect.h))
  if (acima.length === 0) return falhaFechada('C-3', 'o texto de aceite não fica antes do botão')
  const aceite = acima[0]
  const distancia = botao.rect.y - (aceite.rect.y + aceite.rect.h)
  const ok = distancia <= 24.5
  return {
    regra: 'C-3',
    ok,
    motivo: `texto de aceite a ${distancia.toFixed(1)} px do botão (máximo 24)`,
    nos_com_falha: ok ? [] : [descrever(aceite)],
  }
}

/** R-1: o `h1` cabe em c1–c8 em 1 linha em 1440 e em até 2 linhas em 390. */
export function r1(nos, doc) {
  return comDoc('R-1', doc, () => {
    const h1 = nosDaLista(nos).find((no) => no.tag === 'h1' && visivel(no))
    if (!h1) return falhaFechada('R-1', 'nenhum h1')
    const entrelinha = px(h1.estilo?.lineHeight)
    if (!(entrelinha > 0) || !(h1.rect?.h > 0)) return falhaFechada('R-1', 'h1 sem entrelinha ou sem altura')
    const celular = celularDe(doc)
    const maximo = celular ? 2 : 1
    const linhas = Math.round(h1.rect.h / entrelinha)
    const caixa = rectValido(h1.rectTexto) ? h1.rectTexto : h1.rect
    const { direita } = limitesDeColuna(doc)
    const esquerda = xDaColuna(1, doc.largura, doc.clientWidth)
    const falhas = []
    const falhar = (motivo) => falhas.push({ no: descrever(h1), motivo: `${descrever(h1)}: ${motivo}` })
    if (linhas > maximo) falhar(`${linhas} linhas em vez de até ${maximo}`)
    if (caixa.x + caixa.w > direita + TOL) falhar(`o texto termina em x=${(caixa.x + caixa.w).toFixed(1)}, depois de ${direita.toFixed(1)}`)
    if (caixa.x < esquerda - TOL) falhar(`o texto começa em x=${caixa.x.toFixed(1)}, antes de ${esquerda.toFixed(1)}`)
    return resultadoDeTela('R-1', falhas, `h1 em ${linhas} linha(s), dentro de c1–c8`)
  })
}

/** R-2: o topo das linhas de explicação fica visível sem rolar em 1440×900 (y ≤ 760). */
export function r2(nos, doc) {
  return comDoc('R-2', doc, () => {
    if (doc.largura < 992) return naoAplicavel('R-2', 'o critério é de 1440×900')
    const linhas = nosVisiveis(nos, 'linha').filter((no) => rectValido(no.rect))
    if (linhas.length === 0) return falhaFechada('R-2', 'nenhuma linha de explicação (.sb-linha)')
    const topo = Math.min(...linhas.map((no) => no.rect.y))
    const ok = topo <= 760.5
    return { regra: 'R-2', ok, motivo: `o topo das linhas em y=${topo.toFixed(1)} (máximo 760)`, nos_com_falha: ok ? [] : ['linhas de explicação'] }
  })
}

/** B-1: "Passo 1 de 2" é uma etiqueta de 15 px, sem caixa alta, na coluna lateral (x ≥ c9 + 32) em 1440. */
export function b1(nos, doc) {
  return comDoc('B-1', doc, () => {
    const passo = nosDaLista(nos).find((no) => visivel(no) && /passo\s+\d+\s+de\s+\d+/i.test(no.texto ?? ''))
    if (!passo) return falhaFechada('B-1', 'nenhum texto "Passo N de M"')
    const falhas = []
    const falhar = (motivo) => falhas.push({ no: descrever(passo), motivo: `${descrever(passo)}: ${motivo}` })
    if (!marca(passo, 'etiqueta')) falhar('não é uma etiqueta (.sb-etiqueta)')
    if (!perto(px(passo.estilo?.fontSize), 15, 0.01)) falhar(`font-size ${passo.estilo?.fontSize} em vez de 15px`)
    if (passo.estilo?.textTransform === undefined) falhar('text-transform ausente')
    else if (passo.estilo.textTransform === 'uppercase') falhar('em caixa alta')
    if (!rectValido(passo.rect)) falhar('sem retângulo')
    else if (celularDe(doc)) {
      const fim = aberturaFim(nos)
      if (fim === null) falhar('nenhuma abertura (.sb-abertura) para conferir que a etiqueta vem antes do fio')
      else if (passo.rect.y + passo.rect.h > fim + 0.5) falhar('a etiqueta fica depois do fio da abertura')
    } else {
      const minimo = xDaColuna(9, doc.largura, doc.clientWidth) + 32
      if (passo.rect.x < minimo - TOL) falhar(`x=${passo.rect.x.toFixed(1)}, antes da coluna lateral (${minimo.toFixed(1)})`)
    }
    return resultadoDeTela('B-1', falhas, 'etiqueta de 15 px, sem caixa alta, na coluna lateral')
  })
}

/** B-2: o `select` tem a mesma altura, o mesmo fio e a mesma fonte do `input` (112 px, 48 px). */
export function b2(nos, doc) {
  return comDoc('B-2', doc, () => {
    const controles = nosVisiveis(nos, 'controle')
    const entrada = controles.find((c) => c.tag === 'input')
    const selecao = controles.find((c) => c.tag === 'select')
    if (!entrada) return falhaFechada('B-2', 'nenhum input de texto')
    if (!selecao) return falhaFechada('B-2', 'nenhum select')
    const campos = nosVisiveis(nos, 'campo')
    const celular = celularDe(doc)
    // A altura e o fio são os da linha de campo (`.sb-campo`); sem ela, o do próprio controle. Assim a
    // tela antiga reprova pelo defeito medido (48 px, 16 px de letra) e a falta da linha vem depois.
    const caixaDe = (controle) => {
      const campo = campos.find((k) => contem(k, controle))
      return (campo && caixaDoCampo(nos, campo, celular)) || controle
    }
    const caixaEntrada = caixaDe(entrada)
    const caixaSelecao = caixaDe(selecao)
    const alvo = celular ? { altura: 64, texto: 32 } : { altura: 112, texto: 48 }
    const falhas = []
    const falhar = (motivo) => falhas.push({ no: descrever(selecao), motivo: `${descrever(selecao)}: ${motivo}` })
    if (!perto(caixaSelecao.rect?.h, caixaEntrada.rect?.h, TOL)) falhar(`altura ${caixaSelecao.rect?.h} contra ${caixaEntrada.rect?.h} do input`)
    if (!perto(caixaSelecao.rect?.h, alvo.altura, TOL)) falhar(`altura ${caixaSelecao.rect?.h} em vez de ${alvo.altura}`)
    const a = caixaEntrada.estilo ?? {}
    const b = caixaSelecao.estilo ?? {}
    for (const campo of ['borderBottomWidth', 'borderBottomStyle', 'borderBottomColor']) {
      if (a[campo] === undefined || b[campo] === undefined) falhar(`${campo} ausente`)
      else if (a[campo] !== b[campo]) falhar(`${campo} ${b[campo]} contra ${a[campo]} do input`)
    }
    const fonteA = px(entrada.estilo?.fontSize)
    const fonteB = px(selecao.estilo?.fontSize)
    if (!perto(fonteB, fonteA, 0.01)) falhar(`font-size ${selecao.estilo?.fontSize} contra ${entrada.estilo?.fontSize} do input`)
    if (!perto(fonteB, alvo.texto, 0.01)) falhar(`font-size ${selecao.estilo?.fontSize} em vez de ${alvo.texto}px`)
    const famA = primeiraFamilia(entrada.estilo?.fontFamily)
    const famB = primeiraFamilia(selecao.estilo?.fontFamily)
    if (famA === '' || famB === '') falhar('font-family ausente')
    else if (famA !== famB) falhar(`fonte "${famB}" contra "${famA}" do input`)
    for (const controle of [entrada, selecao]) {
      if (!campos.some((k) => contem(k, controle))) falhas.push({ no: descrever(controle), motivo: `${descrever(controle)}: fora de uma linha de campo (.sb-campo)` })
    }
    return resultadoDeTela('B-2', falhas, `select e input com ${alvo.altura} px, o mesmo fio e a mesma fonte`)
  })
}

/** B-3: nenhum bloco tem `min-height` nem altura esticada: a altura é a do conteúdo mais o padding. */
export function b3(nos) {
  const blocos = nosDaLista(nos).filter((no) => visivel(no) && (marca(no, 'filhoDeMain') || marca(no, 'bloco')) && rectValido(no.rect))
  if (blocos.length === 0) return falhaFechada('B-3', 'nenhum bloco (filho de main ou [data-bloco])')
  const falhas = []
  for (const bloco of blocos) {
    const falhar = (motivo) => falhas.push({ no: descrever(bloco), motivo: `${descrever(bloco)}: ${motivo}` })
    const minimo = bloco.estilo?.minHeight
    if (typeof minimo !== 'string') falhar('min-height ausente')
    else if (minimo !== 'auto' && minimo !== 'normal' && px(minimo) !== 0) falhar(`min-height ${minimo}`)
    const folga = bloco.vazioFim
    // Uma mídia (moldura vazia, por contrato) e um bloco de até 2 px (um aviso só para o leitor de
    // tela) não têm conteúdo de onde medir o vazio: não há altura esticada para achar.
    const semConteudoPorContrato = marca(bloco, 'midia') || bloco.rect.h <= 2
    if (!folga && semConteudoPorContrato && bloco.vazioFim !== undefined) continue
    if (!folga || !Number.isFinite(folga.vazio) || !Number.isFinite(folga.margem)) falhar('sem a leitura do vazio no fim do bloco')
    else if (folga.vazio - folga.margem > TOL) falhar(`altura esticada: ${folga.vazio.toFixed(1)} px vazios no fim (margem do último filho: ${folga.margem.toFixed(1)})`)
  }
  return resultadoDeTela('B-3', falhas, `${blocos.length} blocos sem min-height e sem altura esticada`)
}

/**
 * A-1: nenhum conteúdo do `main` abaixo da abertura começa à esquerda de x de c2 (169,6) nem termina à
 * direita de x de c9 (1132,8); abaixo de 768, dentro da área útil. As coordenadas vêm da margem e da
 * área útil medidas (fórmula do glossário), e não de valores fixos.
 */
export function a1(nos, doc) {
  return comDoc('A-1', doc, () => {
    // Sem abertura, todo o conteúdo do main entra na conta e a falta da abertura é acusada depois.
    const fim = aberturaFim(nos)
    const { esquerda, direita } = limitesDeColuna(doc)
    const itens = conteudoAbaixoDaAbertura(nos, fim ?? Number.NEGATIVE_INFINITY)
    if (itens.length === 0) return falhaFechada('A-1', 'nenhum conteúdo abaixo da abertura')
    const falhas = []
    for (const { no, caixa } of itens) {
      if (caixa.x < esquerda - TOL) falhas.push({ no: descrever(no), motivo: `${descrever(no)} começa em x=${caixa.x.toFixed(1)}, à esquerda de ${esquerda.toFixed(1)}` })
      else if (caixa.x + caixa.w > direita + TOL) falhas.push({ no: descrever(no), motivo: `${descrever(no)} termina em x=${(caixa.x + caixa.w).toFixed(1)}, à direita de ${direita.toFixed(1)}` })
    }
    if (fim === null) falhas.push({ no: 'documento', motivo: 'nenhuma abertura (.sb-abertura)' })
    return resultadoDeTela('A-1', falhas, `${itens.length} itens abaixo da abertura, entre x=${esquerda.toFixed(1)} e x=${direita.toFixed(1)}`)
  })
}

const TOL_ESPACO = 1

/** O valor de referência: a mediana (a inferior, se a lista tem tamanho par), que um só valor fora não puxa. */
const medianaDe = (valores) => [...valores].sort((a, b) => a - b)[(valores.length - 1) >> 1]

/**
 * A-2 em 390 (as âncoras vão em linha, com quebra): o espaço que o olho vê entre duas âncoras vizinhas
 * é o mesmo (±1 px) na linha e de uma linha para a outra, e o passo vertical entre as linhas é o mesmo
 * em todas as passagens (±1 px). O espaço é medido entre os RETÂNGULOS DO TEXTO, não entre as caixas:
 * a caixa de uma âncora curta ("Sair") é mais larga que o texto, por causa do alvo de toque de 44, e
 * medir caixas esconderia o vão irregular. Sem o retângulo do texto de alguma âncora, reprova fechado.
 */
function espacosDeCelular(ancoras) {
  const faltando = ancoras.filter((a) => !rectValido(a.rectTexto))
  if (faltando.length > 0) {
    return faltando.map((a) => ({ no: descrever(a), motivo: `${descrever(a)}: sem a leitura do retângulo do texto (rectTexto)` }))
  }
  // As linhas: as âncoras com o mesmo topo de texto (±2), da esquerda para a direita.
  const linhas = []
  for (const a of [...ancoras].sort((x, y) => x.rectTexto.y - y.rectTexto.y || x.rectTexto.x - y.rectTexto.x)) {
    const linha = linhas.find((l) => perto(l.y, a.rectTexto.y, TOL))
    if (linha) linha.itens.push(a)
    else linhas.push({ y: a.rectTexto.y, itens: [a] })
  }
  const falhas = []
  const espacos = []
  for (const linha of linhas) {
    linha.itens.sort((x, y) => x.rectTexto.x - y.rectTexto.x)
    for (let i = 1; i < linha.itens.length; i += 1) {
      const antes = linha.itens[i - 1]
      const depois = linha.itens[i]
      espacos.push({ no: depois, valor: depois.rectTexto.x - (antes.rectTexto.x + antes.rectTexto.w) })
    }
  }
  if (espacos.length > 0) {
    const referencia = medianaDe(espacos.map((e) => e.valor))
    for (const e of espacos) {
      if (!perto(e.valor, referencia, TOL_ESPACO)) {
        falhas.push({ no: descrever(e.no), motivo: `${descrever(e.no)}: espaço de ${e.valor.toFixed(1)} px até a âncora anterior, contra ${referencia.toFixed(1)} da maioria (±${TOL_ESPACO})` })
      }
    }
  }
  const passos = []
  for (let i = 1; i < linhas.length; i += 1) passos.push({ no: linhas[i].itens[0], valor: linhas[i].y - linhas[i - 1].y })
  if (passos.length > 0) {
    const referencia = medianaDe(passos.map((p) => p.valor))
    for (const p of passos) {
      if (!perto(p.valor, referencia, TOL_ESPACO)) {
        falhas.push({ no: descrever(p.no), motivo: `${descrever(p.no)}: passo vertical de ${p.valor.toFixed(1)} px até a linha anterior, contra ${referencia.toFixed(1)} das outras (±${TOL_ESPACO})` })
      }
    }
  }
  return falhas
}

/**
 * A-2: as 6 âncoras estão na coluna lateral, com o mesmo x e passo de ≈32 px, e cada `href` leva a um id
 * que existe. Em 390 elas ficam em linha, com quebra: valem a contagem, o destino e o espaço igual entre
 * vizinhas (ver `espacosDeCelular`).
 */
export function a2(nos, doc) {
  return comDoc('A-2', doc, () => {
    const ancoras = nosVisiveis(nos, 'ancoraLateral').filter((no) => rectValido(no.rect)).sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)
    if (ancoras.length === 0) return falhaFechada('A-2', 'nenhuma âncora na coluna lateral (.sb-abertura-lateral a[href^="#"])')
    const falhas = []
    if (ancoras.length !== 6) falhas.push({ no: 'coluna lateral', motivo: `${ancoras.length} âncoras em vez de 6` })
    for (const a of ancoras) {
      if (a.alvoExiste !== true) falhas.push({ no: descrever(a), motivo: `${descrever(a)}: o href ${a.href ?? '?'} não leva a um id existente` })
    }
    if (celularDe(doc)) {
      falhas.push(...espacosDeCelular(ancoras))
    } else {
      const x9 = xDaColuna(9, doc.largura, doc.clientWidth)
      const x0 = ancoras[0].rect.x
      for (const a of ancoras) {
        if (!perto(a.rect.x, x0, TOL)) falhas.push({ no: descrever(a), motivo: `${descrever(a)}: x=${a.rect.x.toFixed(1)} contra ${x0.toFixed(1)} da primeira` })
        if (a.rect.x < x9 - TOL) falhas.push({ no: descrever(a), motivo: `${descrever(a)}: x=${a.rect.x.toFixed(1)} fora da coluna lateral (c9 em ${x9.toFixed(1)})` })
      }
      for (let i = 1; i < ancoras.length; i += 1) {
        const passo = ancoras[i].rect.y - ancoras[i - 1].rect.y
        if (!perto(passo, 32, TOL)) falhas.push({ no: descrever(ancoras[i]), motivo: `${descrever(ancoras[i])}: passo de ${passo.toFixed(1)} px em vez de 32` })
      }
    }
    const ok = celularDe(doc)
      ? `${ancoras.length} âncoras em linha, com o mesmo espaço entre vizinhas e o mesmo passo entre as linhas, todas com destino`
      : `${ancoras.length} âncoras na coluna lateral, no mesmo x, de 32 em 32, todas com destino`
    return resultadoDeTela('A-2', falhas, ok)
  })
}

/** O ar mínimo entre a base do texto da última âncora do índice e o fio da abertura, em 1440 (px). */
export const FOLGA_ULTIMA_ANCORA_FIO = 16

/**
 * A-2b (volta 3, só 1440, no topo da página): (1) o texto da última âncora do índice (o retângulo do texto do `<a>`, e não a caixa de
 * toque) termina a `FOLGA_ULTIMA_ANCORA_FIO` px ou mais do fio da abertura; (2) a caixa de toque da última âncora (44 px, 56 na
 * madrugada) não passa do fio (base da caixa <= topo do fio). O fio é a borda de baixo do `.sb-abertura-base`, o que fecha a abertura:
 * o topo dele é a base da caixa menos a espessura da borda. A "última" é a de maior `y`, esteja onde estiver na lista. Abaixo de 992
 * não se aplica (o índice em linha de 390 tem o A-2, de espaço entre os textos). Falha fechada: nenhuma âncora, âncora sem o
 * retângulo de caixa, a última sem o retângulo do texto, sem o fio da abertura e fio sem a espessura da borda lida reprovam.
 */
export function a2b(nos, doc) {
  return comDoc('A-2b', doc, () => {
    if (doc.largura < 992) return naoAplicavel('A-2b', 'o critério é de 1440: o índice abaixo de 992 fica em linha e o A-2 mede o espaço entre os textos')
    const ancoras = nosVisiveis(nos, 'ancoraLateral')
    if (ancoras.length === 0) return falhaFechada('A-2b', 'nenhuma âncora do índice na coluna lateral (.sb-abertura-lateral a[href^="#"])')
    const semCaixa = ancoras.find((a) => !rectValido(a.rect))
    if (semCaixa) return falhaFechada('A-2b', `${descrever(semCaixa)}: âncora sem o retângulo da caixa (rect), sem como achar a última`)
    const ultima = [...ancoras].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x).at(-1)
    const texto = ultima.rectTexto
    if (!rectValido(texto) || !(texto.h > 0)) {
      return falhaFechada('A-2b', `${descrever(ultima)}: sem o retângulo do texto da última âncora (rectTexto), sem como medir a folga até o fio`)
    }
    const base = nosVisiveis(nos, 'aberturaBase').find((no) => rectValido(no.rect))
    if (!base) return falhaFechada('A-2b', 'nenhum fio da abertura (.sb-abertura-base) com retângulo')
    const espessura = px(base.estilo?.borderBottomWidth)
    if (!(espessura > 0)) return falhaFechada('A-2b', `fio da abertura sem a borda de baixo lida (border-bottom-width ${JSON.stringify(base.estilo?.borderBottomWidth ?? null)})`)
    const topoDoFio = base.rect.y + base.rect.h - espessura
    const falhas = []
    const baseDoTexto = texto.y + texto.h
    const folga = topoDoFio - baseDoTexto
    if (folga < FOLGA_ULTIMA_ANCORA_FIO - TOL_FOLGA) {
      falhas.push({
        no: descrever(ultima),
        motivo: `o texto da última âncora (${descrever(ultima)}) termina em y=${baseDoTexto.toFixed(1)} e o fio da abertura começa em y=${topoDoFio.toFixed(1)}: folga de ${folga.toFixed(1)} px (o mínimo é ${FOLGA_ULTIMA_ANCORA_FIO})`,
      })
    }
    const baseDaCaixa = ultima.rect.y + ultima.rect.h
    if (baseDaCaixa > topoDoFio + TOL_FOLGA) {
      falhas.push({
        no: `${descrever(ultima)} (caixa de toque)`,
        motivo: `a caixa de toque da última âncora (${descrever(ultima)}) termina em y=${baseDaCaixa.toFixed(1)} e o fio da abertura começa em y=${topoDoFio.toFixed(1)}: passa ${(baseDaCaixa - topoDoFio).toFixed(1)} px do fio (não pode passar)`,
      })
    }
    return resultadoComNumeros('A-2b', falhas, `o texto da última âncora fica a ${folga.toFixed(1)} px do fio da abertura (mínimo ${FOLGA_ULTIMA_ANCORA_FIO}) e a caixa de toque dela não passa do fio`)
  })
}

/** A-3: todo título de seção tem 48 px (36 em 390), em Instrument Serif, e começa em x de c2 (169,6). */
export function a3(nos, doc) {
  return comDoc('A-3', doc, () => {
    const titulos = nosVisiveis(nos, 'tituloSecao')
    if (titulos.length === 0) return falhaFechada('A-3', 'nenhum título de seção (h2 no main)')
    const celular = celularDe(doc)
    const tamanho = celular ? 36 : 48
    const x = xDaColuna(2, doc.largura, doc.clientWidth)
    const falhas = []
    for (const t of titulos) {
      const motivos = []
      if (!perto(px(t.estilo?.fontSize), tamanho, 0.01)) motivos.push(`font-size ${t.estilo?.fontSize} em vez de ${tamanho}px`)
      const familia = primeiraFamilia(t.estilo?.fontFamily)
      if (familia === '') motivos.push('font-family ausente')
      else if (familia !== 'Instrument Serif') motivos.push(`fonte "${familia}" em vez de "Instrument Serif"`)
      if (!rectValido(t.rect)) motivos.push('sem retângulo')
      else if (!perto(t.rect.x, x, TOL)) motivos.push(`x=${t.rect.x.toFixed(1)} em vez de ${x.toFixed(1)}`)
      if (motivos.length > 0) falhas.push({ no: descrever(t), motivo: `${descrever(t)}: ${motivos.join('; ')}` })
    }
    return resultadoDeTela('A-3', falhas, `${titulos.length} títulos de ${tamanho} px em Instrument Serif, em x=${x.toFixed(1)}`)
  })
}

/** A-4: do fim de uma seção ao título da seguinte há 96 px (±8). */
export function a4(nos) {
  const secoes = nosDaLista(nos)
    .filter((no) => visivel(no) && marca(no, 'secao') && rectValido(no.rect))
    .sort((a, b) => a.rect.y - b.rect.y)
  if (secoes.length < 2) return falhaFechada('A-4', `${secoes.length} seção(ões) com título: preciso de duas para medir a distância`)
  const falhas = []
  for (let i = 1; i < secoes.length; i += 1) {
    const anterior = secoes[i - 1]
    const tituloDaSeguinte = secoes[i].tituloDaSecao
    if (!tituloDaSeguinte || !Number.isFinite(tituloDaSeguinte.y)) {
      falhas.push({ no: descrever(secoes[i]), motivo: `${descrever(secoes[i])}: sem a posição do título` })
      continue
    }
    const distancia = tituloDaSeguinte.y - (anterior.rect.y + anterior.rect.h)
    if (Math.abs(distancia - 96) > 8) falhas.push({ no: descrever(secoes[i]), motivo: `${distancia.toFixed(1)} px do fim da seção anterior ao título (esperado 96 ±8)` })
  }
  return resultadoDeTela('A-4', falhas, `${secoes.length - 1} distâncias entre seções, todas 96 ±8`)
}

/** A-5: nenhum elemento tem `border-style: dashed`; o botão de excluir, se desativado, tem `aria-disabled="true"`. */
export function a5(nos) {
  const lidos = nosDaLista(nos).filter(visivel)
  if (lidos.length === 0) return falhaFechada('A-5', 'nenhum nó')
  const falhas = []
  for (const no of lidos) {
    for (const lado of ['Top', 'Right', 'Bottom', 'Left']) {
      const estilo = no.estilo?.[`border${lado}Style`]
      if (estilo === undefined) {
        falhas.push({ no: descrever(no), motivo: `${descrever(no)}: border-${lado.toLowerCase()}-style ausente` })
        break
      }
      if (estilo === 'dashed') {
        falhas.push({ no: descrever(no), motivo: `${descrever(no)}: border-${lado.toLowerCase()}-style dashed` })
        break
      }
    }
  }
  const excluir = lidos.find((no) => no.tag === 'button' && /excluir/i.test(`${no.texto ?? ''} ${no.textoTotal ?? ''}`))
  if (!excluir) falhas.push({ no: 'documento', motivo: 'nenhum botão "Excluir" na página' })
  else if (excluir.desativado === undefined) falhas.push({ no: descrever(excluir), motivo: `${descrever(excluir)}: sem a leitura de disabled e aria-disabled` })
  else if (excluir.desativado === true && excluir.ariaDisabled !== 'true') {
    falhas.push({ no: descrever(excluir), motivo: `${descrever(excluir)}: desativado sem aria-disabled="true" (aria-disabled=${JSON.stringify(excluir.ariaDisabled ?? null)})` })
  }
  return resultadoDeTela('A-5', falhas, 'nenhum border-style dashed; o botão Excluir, quando desativado, tem aria-disabled="true"')
}

/** O teto do A-6 (px): a altura do `<main>` em 1440. */
export const ALTURA_MAXIMA_DO_MAIN = 3200

/**
 * A-6: a altura do `<main>` em 1440 (a caixa do elemento, sem o rodapé) é ≤ 3.200 px. Decisão do líder (volta 3): o rodapé
 * (≈ 895 px, da casca congelada) não conta; o limite de antes (a altura total, com o rodapé) era inalcançável sem cortar seção.
 * A leitura antiga (o maior entre a altura do documento e o fim do rodapé: 3.967 claro, 3.991 madrugada no HEAD) segue no
 * resultado (`leitura_antiga` e no motivo) só como informação: nunca reprova, e sem ela o veredito é o mesmo. Falha fechada:
 * documento de 1440 sem `<main>` visível, ou com `<main>` sem altura medida, reprova. Em 390 não se aplica.
 */
export function a6(nos, doc) {
  return comDoc('A-6', doc, () => {
    if (doc.largura < 992) return naoAplicavel('A-6', 'o critério é de 1440')
    const mains = nosDaLista(nos).filter((no) => no?.tag === 'main' && visivel(no))
    if (mains.length === 0) return falhaFechada('A-6', 'nenhum <main> no documento (a altura medida é a do main, sem o rodapé)')
    const principal = mains.find((no) => ehNumero(no.rect?.h) && no.rect.h > 0)
    if (!principal) return falhaFechada('A-6', 'sem a altura medida do main (retângulo ausente, ilegível ou de altura nula)')
    const altura = principal.rect.h
    const rodape = nosDaLista(nos).find((no) => marca(no, 'rodape') && rectValido(no.rect))
    const antigas = [doc.alturaTotal, rodape ? rodape.rect.y + rodape.rect.h : undefined].filter(Number.isFinite)
    const ok = altura <= ALTURA_MAXIMA_DO_MAIN + 0.5
    const resultadoDoMain = {
      regra: 'A-6',
      ok,
      motivo: `altura do main de ${altura.toFixed(0)} px (máximo ${ALTURA_MAXIMA_DO_MAIN})`,
      nos_com_falha: ok ? [] : ['main'],
    }
    if (antigas.length === 0) return resultadoDoMain
    const antiga = Math.max(...antigas)
    return {
      ...resultadoDoMain,
      motivo: `${resultadoDoMain.motivo}; leitura antiga, só informação: altura total com o rodapé de ${antiga.toFixed(0)} px (não reprova)`,
      leitura_antiga: antiga,
    }
  })
}

const PARTES_DO_BLOCO = ['x', 'y', 'w', 'h']

/** M-1: os retângulos de todos os blocos na madrugada são iguais aos do tema claro (±1 px). */
export function m1(doc) {
  const escuro = doc?.blocos
  const claro = doc?.blocosClaro
  if (!Array.isArray(escuro) || !Array.isArray(claro) || escuro.length === 0 || claro.length === 0) {
    return falhaFechada('M-1', 'sem os retângulos dos blocos nos dois temas')
  }
  const falhas = []
  if (escuro.length !== claro.length) falhas.push({ no: 'blocos', motivo: `${escuro.length} blocos na madrugada contra ${claro.length} no claro` })
  for (let i = 0; i < Math.min(escuro.length, claro.length); i += 1) {
    const [a, b] = [escuro[i], claro[i]]
    const diferencas = PARTES_DO_BLOCO.filter((parte) => !perto(a?.[parte], b?.[parte], 1))
    if (diferencas.length > 0) {
      falhas.push({ no: a?.id ?? `bloco ${i + 1}`, motivo: `${a?.id ?? `bloco ${i + 1}`}: ${diferencas.map((parte) => `${parte} ${a?.[parte]} contra ${b?.[parte]}`).join(', ')}` })
    }
  }
  return resultadoDeTela('M-1', falhas, `${escuro.length} blocos com o mesmo retângulo nos dois temas (±1 px)`)
}

/** M-2: nenhum elemento tem borda nos 4 lados fora os botões de moldura dupla. */
export function m2(nos) {
  const lidos = nosDaLista(nos).filter(visivel)
  if (lidos.length === 0) return falhaFechada('M-2', 'nenhum nó')
  const falhas = []
  for (const no of lidos) {
    if (!no.estilo) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: sem estilo` })
    else if (quatroLados(no.estilo) && !marca(no, 'moldura')) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: borda nos 4 lados fora da moldura dupla` })
  }
  return resultadoDeTela('M-2', falhas, 'borda nos 4 lados só na moldura dupla')
}

/** M-3: fundo com luminância relativa > 0,15 só em botões, com área ≤ 30.000 px². */
export function m3(nos) {
  const lidos = nosDaLista(nos).filter(visivel)
  if (lidos.length === 0) return falhaFechada('M-3', 'nenhum nó')
  const falhas = []
  for (const no of lidos) {
    const proprio = parseCor(no.cadeia?.[0])
    if (!proprio) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: fundo ilegível (${no.cadeia?.[0]})` })
      continue
    }
    if (proprio.a <= 0.01) continue
    const fundo = fundoReal(no.cadeia)
    if (!fundo) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: fundo incalculável (sem ancestral opaco)` })
      continue
    }
    const luz = luminancia(fundo)
    if (luz <= 0.15) continue
    const area = (no.rect?.w ?? Number.NaN) * (no.rect?.h ?? Number.NaN)
    if (!marca(no, 'botao') && !marca(no, 'dentroDeBotao')) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: fundo claro (luminância ${luz.toFixed(2)}) fora de um botão` })
    else if (!Number.isFinite(area)) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: botão claro sem retângulo` })
    else if (area > 30000) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: botão claro de ${Math.round(area)} px² (máximo 30000)` })
  }
  return resultadoDeTela('M-3', falhas, 'fundo claro só em botões de até 30.000 px²')
}

/** M-4: os botões têm altura ≥ 56 e todo texto tem contraste ≥ 4,5:1, inclusive o secundário a 80%. */
export function m4(nos) {
  const botoes = nosDaLista(nos).filter((no) => visivel(no) && marca(no, 'botao'))
  const textos = nosDaLista(nos).filter((no) => visivel(no) && temTexto(no))
  if (botoes.length === 0) return falhaFechada('M-4', 'nenhum botão')
  if (textos.length === 0) return falhaFechada('M-4', 'nenhum nó com texto')
  const falhas = []
  for (const no of botoes) {
    if (!(no.rect?.h > 0)) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: botão sem altura` })
    else if (no.rect.h < 55.5) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: altura ${no.rect.h.toFixed(1)} (mínimo 56)` })
  }
  let menor = Infinity
  for (const no of textos) {
    if (!(no.rect?.w > 0)) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: texto com largura 0` })
      continue
    }
    const razao = contraste(no.estilo?.color, no.cadeia)
    if (razao === null) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: contraste incalculável` })
    else {
      menor = Math.min(menor, razao)
      if (razao < 4.5) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: contraste ${razao.toFixed(2)}:1` })
    }
  }
  return resultadoDeTela('M-4', falhas, `${botoes.length} botões ≥ 56 px; menor contraste ${menor.toFixed(2)}:1`)
}

/** M-5: o fio de campo de formulário tem contraste ≥ 3:1 contra o fundo. */
export function m5(nos, doc) {
  return comDoc('M-5', doc, () => {
    const campos = nosVisiveis(nos, 'campo')
    const controles = nosVisiveis(nos, 'controle')
    if (campos.length === 0 && controles.length === 0) return falhaFechada('M-5', 'nenhum campo: sem linha (.sb-campo) e sem controle')
    const celular = celularDe(doc)
    const falhas = []
    // O fio é o da linha de campo (`.sb-campo`); sem ela, o do próprio controle (a tela antiga).
    const fios = campos.length > 0 ? campos.map((campo, i) => ({ nome: `campo ${i + 1}`, caixa: caixaDoCampo(nos, campo, celular) })) : controles.map((c) => ({ nome: descrever(c), caixa: c }))
    for (const { nome, caixa } of fios) {
      if (!caixa) {
        falhas.push({ no: nome, motivo: `${nome}: sem a caixa do campo` })
        continue
      }
      const e = caixa.estilo ?? {}
      if (!(px(e.borderBottomWidth) > 0) || e.borderBottomStyle === 'none') {
        falhas.push({ no: nome, motivo: `${nome}: sem fio inferior` })
        continue
      }
      const razao = contraste(e.borderBottomColor, caixa.cadeia)
      if (razao === null) falhas.push({ no: nome, motivo: `${nome}: contraste do fio incalculável (${e.borderBottomColor})` })
      else if (razao < 3) falhas.push({ no: nome, motivo: `${nome}: fio com contraste ${razao.toFixed(2)}:1 (mínimo 3)` })
    }
    if (campos.length === 0) falhas.push({ no: 'documento', motivo: 'nenhuma linha de campo (.sb-campo)' })
    return resultadoDeTela('M-5', falhas, `${campos.length} fios de campo com contraste ≥ 3:1`)
  })
}

function paraSegundos(texto) {
  const m = /^(-?[\d.]+)(ms|s)$/.exec(String(texto).trim())
  return m ? (m[2] === 'ms' ? Number(m[1]) / 1000 : Number(m[1])) : Number.NaN
}

const PROPRIEDADES_DE_TRANSFORM = ['all', 'transform', 'translate', 'scale', 'rotate']

/** M-6: nenhuma `transition` passa de 150 ms e nenhum `transform` é animado. */
export function m6(nos) {
  const lidos = nosDaLista(nos).filter(visivel)
  if (lidos.length === 0) return falhaFechada('M-6', 'nenhum nó')
  const falhas = []
  for (const no of lidos) {
    const e = no.estilo ?? {}
    const falhar = (motivo) => falhas.push({ no: descrever(no), motivo: `${descrever(no)}: ${motivo}` })
    if (typeof e.transitionDuration !== 'string' || typeof e.transitionProperty !== 'string') {
      falhar('transition ausente na leitura')
      continue
    }
    const propriedades = e.transitionProperty.split(',').map((p) => p.trim()).filter(Boolean)
    const duracoes = e.transitionDuration.split(',').map(paraSegundos)
    const atrasos = String(e.transitionDelay ?? '0s').split(',').map(paraSegundos)
    if (propriedades.length === 0 || duracoes.length === 0 || duracoes.some(Number.isNaN) || atrasos.some(Number.isNaN)) {
      falhar(`transition ilegível (${e.transitionProperty} ${e.transitionDuration})`)
      continue
    }
    propriedades.forEach((propriedade, i) => {
      const duracao = duracoes[i % duracoes.length]
      const total = duracao + atrasos[i % atrasos.length]
      if (duracao > 0 && total > 0.1505) falhar(`transition de ${propriedade} com ${Math.round(total * 1000)} ms`)
      if (duracao > 0 && PROPRIEDADES_DE_TRANSFORM.includes(propriedade)) falhar(`transition anima ${propriedade === 'all' ? 'tudo (all), inclusive transform' : propriedade}`)
    })
    const animacao = String(e.animationName ?? 'none').trim()
    if (animacao !== 'none' && animacao !== '') {
      const duracao = Math.max(...String(e.animationDuration ?? '0s').split(',').map(paraSegundos))
      if (Number.isNaN(duracao)) falhar(`animation ${animacao} com duração ilegível`)
      else if (duracao > 0) {
        if (duracao > 0.1505) falhar(`animation ${animacao} com ${Math.round(duracao * 1000)} ms`)
        if (no.animacaoTransform === true) falhar(`animation ${animacao} anima transform`)
        else if (no.animacaoTransform !== false) falhar(`animation ${animacao}: keyframes não lidos (não sei se anima transform)`)
      }
    }
    if (Array.isArray(no.animacoes) && no.animacoes.some((a) => (a?.propriedades ?? []).some((p) => PROPRIEDADES_DE_TRANSFORM.includes(p) && p !== 'all'))) {
      falhar('animação em curso sobre transform')
    }
  }
  return resultadoDeTela('M-6', falhas, 'nenhuma transition acima de 150 ms e nenhum transform animado')
}

/** Os critérios de cada caso novo, na ordem; os reaproveitados (C-4, R-4, B-4, A-7) são os mesmos ids. */
// Volta 3 (D3): as telas de formulário somam a folga da mensagem, do controle e do anel; as de fuso, o texto do fuso.
export const CRITERIOS_DO_CASO = {
  entrar: ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'D3-fio', 'D3-controle', 'D3-anel', 'D5-erro', 'D5-anel', 'D6-selecao'],
  criar_conta: ['E-1', 'E-2', 'E-3', 'E-5', 'E-6', 'E-7', 'C-1', 'C-2', 'C-3', 'D3-fio', 'D3-controle', 'D3-anel', 'D5-erro', 'D5-anel', 'D6-selecao'],
  recuperar_acesso: ['E-1', 'E-2', 'E-3', 'E-5', 'E-6', 'E-7', 'R-1', 'R-2', 'R-3', 'D3-fio', 'D3-controle', 'D3-anel', 'D4-vao', 'D5-erro', 'D5-anel', 'D6-selecao'],
  comecar_seu_nome: ['E-1', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'B-1', 'B-2', 'B-3', 'D3-fio', 'D3-controle', 'D3-anel', 'D3-fuso', 'D5-erro', 'D5-anel', 'D6-selecao'],
  conta: ['A-1', 'A-2', 'A-2b', 'A-3', 'A-4', 'A-5', 'A-6', 'D3-fio', 'D3-controle', 'D3-anel', 'D3-fuso', 'D5-erro', 'D5-anel', 'D6-selecao'],
}
const CRITERIOS_DA_MADRUGADA = ['M-1', 'M-2', 'M-3', 'M-4', 'M-5', 'M-6']

/** Os ids dos critérios de tela de um caso e tema (a Conta, na madrugada, soma M-1 a M-6). */
export function criteriosDoCaso(caso, tema = 'claro') {
  const base = CRITERIOS_DO_CASO[caso] ?? []
  return caso === 'conta' && ehMadrugada(tema) ? [...base, ...CRITERIOS_DA_MADRUGADA] : base
}

const REGRAS_DE_TELA = {
  'E-1': ({ nos, doc }) => e1(nos, doc),
  'E-2': ({ nos, doc }) => e2(nos, doc),
  'E-3': ({ nos, doc }) => e3(nos, doc),
  'E-4': ({ nos, doc }) => e4(nos, doc),
  'E-5': ({ nos, doc }) => e5(nos, doc),
  'E-6': ({ nos, doc }) => e6(nos, doc),
  'E-7': ({ doc, tema }) => e7(doc, tema),
  'D3-fio': ({ doc, caso }) => d3Fio(doc, caso),
  'D3-controle': ({ doc, caso }) => d3Controle(doc, caso),
  'D3-anel': ({ doc, caso }) => d3Anel(doc, caso),
  'D3-fuso': ({ doc, caso }) => d3Fuso(doc, caso),
  'D4-vao': ({ doc }) => d4Vao(doc),
  'D5-erro': ({ doc }) => d5Erro(doc),
  'D5-anel': ({ doc }) => d5Anel(doc),
  'D6-selecao': ({ doc }) => d6Selecao(doc),
  'C-1': ({ nos }) => c1(nos),
  'C-2': ({ nos, doc }) => c2(nos, doc),
  'C-3': ({ nos }) => c3(nos),
  'R-1': ({ nos, doc }) => r1(nos, doc),
  'R-2': ({ nos, doc }) => r2(nos, doc),
  'R-3': ({ doc }) => r3(doc),
  'B-1': ({ nos, doc }) => b1(nos, doc),
  'B-2': ({ nos, doc }) => b2(nos, doc),
  'B-3': ({ nos }) => b3(nos),
  'A-1': ({ nos, doc }) => a1(nos, doc),
  'A-2': ({ nos, doc }) => a2(nos, doc),
  'A-2b': ({ nos, doc }) => a2b(nos, doc),
  'A-3': ({ nos, doc }) => a3(nos, doc),
  'A-4': ({ nos }) => a4(nos),
  'A-5': ({ nos }) => a5(nos),
  'A-6': ({ nos, doc }) => a6(nos, doc),
  'M-1': ({ doc }) => m1(doc),
  'M-2': ({ nos }) => m2(nos),
  'M-3': ({ nos }) => m3(nos),
  'M-4': ({ nos }) => m4(nos),
  'M-5': ({ nos, doc }) => m5(nos, doc),
  'M-6': ({ nos }) => m6(nos),
}

const OLHAR_E6 = 'coluna vazia ao lado de um bloco: o número mede só o que passa de x de c9 (G8 mede a diferença de altura, não o vazio)'
const OLHAR_E7 = 'o erro em 17/24 abaixo do campo se lê como erro e não parece apertado nem colado ao fio (a altura da linha, a página e o botão, o medidor confere ao enviar o formulário vazio)'
const OLHAR_PESO = 'peso visual: o título, o formulário e o botão se leem nessa ordem, sem um bloco que pese mais que o resto'

/** Os critérios que só um olho decide, por caso: o id e uma frase de o que olhar. */
export const MANUAIS_DO_CASO = {
  entrar: [
    { id: 'E-6', olhar: OLHAR_E6 },
    { id: 'E-7', olhar: OLHAR_E7 },
    { id: 'E-peso', olhar: OLHAR_PESO },
  ],
  criar_conta: [
    { id: 'E-6', olhar: OLHAR_E6 },
    { id: 'E-7', olhar: OLHAR_E7 },
    { id: 'C-peso', olhar: OLHAR_PESO },
  ],
  recuperar_acesso: [
    { id: 'E-6', olhar: OLHAR_E6 },
    { id: 'E-7', olhar: OLHAR_E7 },
    { id: 'R-3', olhar: 'a confirmação depois do envio se lê como resposta calma, dentro da linha de 112 px, sem empurrar nada (a altura da linha, a página e o botão, o medidor confere ao enviar com o e-mail preenchido)' },
    { id: 'R-peso', olhar: OLHAR_PESO },
  ],
  comecar_seu_nome: [
    { id: 'E-6', olhar: OLHAR_E6 },
    { id: 'E-7', olhar: OLHAR_E7 },
    { id: 'B-peso', olhar: OLHAR_PESO },
  ],
  conta: [
    { id: 'A-3', olhar: 'a serifa dos títulos de seção é condensada (o número só confere a família Instrument Serif, o tamanho e o x)' },
    { id: 'A-peso', olhar: 'a lateral com as 6 âncoras e as seções se leem como uma coluna só, sem lado vazio' },
  ],
}

/**
 * Avalia os critérios de tela de um caso novo: `criterios` (um resultado por id, todos bloqueantes) e
 * `criterios_manuais` (o que só um olho decide). Para os casos antigos, as duas listas saem vazias.
 */
export function avaliarCriterios({ doc, nos, tema }, caso) {
  const ids = criteriosDoCaso(caso, tema)
  const criterios = ids.map((id) => {
    let r
    try {
      r = REGRAS_DE_TELA[id]({ doc, nos, tema, caso })
    } catch (erro) {
      r = falhaFechada(id, `erro ao medir: ${erro.message}`)
    }
    return { ...r, bloqueia: true }
  })
  return { criterios, criterios_manuais: MANUAIS_DO_CASO[caso] ?? [] }
}

/**
 * As regras G que bloqueiam em cada caso: em `sistema`, todas (G1 a G12, SB3 e NUM); nas 5 telas novas,
 * G1 a G12 e SB3 (NUM só se registra); nos outros, só G2 e G9 (as demais só se registram).
 */
export function bloqueantesDoCaso(caso) {
  if (caso === 'sistema') return [...G_TODAS, 'NUM']
  if (Object.hasOwn(CASOS_DE_ACESSO, caso)) return G_TODAS
  return ['G2', 'G9']
}

/** Avalia as regras sobre as leituras de uma página: `{ doc, nos, tema }`. */
export function avaliarTudo({ doc, nos, tema }, caso = 'sistema') {
  const bloqueantes = bloqueantesDoCaso(caso)
  const todas = [g1(doc), g2(nos, doc), g3(nos, doc), g4(nos), g5(nos, doc), g6(nos), g7(nos), g8(nos, doc), g9(nos, doc), g10(nos), g11(nos, tema), g12(nos), sb3(doc), num(nos, doc)]
  return todas.map((r) => ({ ...r, bloqueia: bloqueantes.includes(r.regra) }))
}

/**
 * A linha de resumo: `RESUMO <arquivo> G1 ok G2 FALHA ... E-1 ok E-2 FALHA`; a falha que não bloqueia
 * sai como "registrada". Os critérios de tela (`criterios`) vêm depois das regras G.
 */
export function resumo(arquivo, resultados, criterios = []) {
  const partes = [...resultados, ...criterios].map((r) => `${r.regra} ${r.ok ? 'ok' : r.bloqueia ? 'FALHA' : 'registrada'}`)
  return `RESUMO ${arquivo} ${partes.join(' ')}`
}

/** Lê os argumentos `<pasta> <caso>:<tema>:<LxA> ...`; lança Error com a mensagem de uso se algo não vale. */
export function lerArgumentos(argumentos) {
  const [pasta, ...specs] = argumentos
  if (!pasta || specs.length === 0) {
    throw new Error('uso: node web/scripts/medir-dom.mjs <pasta> <caso>:<tema>:<LxA> ...')
  }
  const pedidos = specs.map((spec) => {
    const m = /^([a-z_]+):([a-z]+):(\d+)x(\d+)$/.exec(spec)
    if (!m) throw new Error(`argumento inválido: ${spec} (esperado <caso>:<tema>:<LxA>)`)
    const [, caso, tema, largura, altura] = m
    if (!CASOS.includes(caso)) throw new Error(`caso desconhecido: ${caso} (use ${CASOS.join(', ')})`)
    if (!TEMAS.includes(tema)) throw new Error(`tema desconhecido: ${tema} (use ${TEMAS.join(', ')})`)
    if (caso === 'inicio' && tema === 'madrugada') throw new Error('o Início é sempre claro: não há inicio:madrugada')
    if (tema === 'madrugada' && CASOS_DE_ACESSO[caso]?.acesso === 'publica') {
      throw new Error(`a tela ${CASOS_DE_ACESSO[caso].nome} é pública e sempre clara (sem sessão não há o botão "Modo madrugada"): não há ${caso}:madrugada`)
    }
    return { caso, tema, largura: Number(largura), altura: Number(altura) }
  })
  return { pasta, pedidos }
}

/** Só loopback: a página medida e o Chrome. */
export function verificarLoopback(url) {
  const { hostname } = new URL(url)
  if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(hostname)) {
    throw new Error(`só loopback: ${hostname} não vale`)
  }
}

// ---------------------------------------------------------------------------------------------
// O que roda dentro da página (serializado por `toString`; não pode usar nada de fora)

export function coletarNaPagina() {
  const ignorar = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'OPTION', 'OPTGROUP'])
  const sx = window.scrollX
  const sy = window.scrollY
  const raiz = document.documentElement
  const doc = {
    largura: window.innerWidth,
    altura: window.innerHeight,
    clientWidth: raiz.clientWidth,
    scrollWidth: raiz.scrollWidth,
    alturaTotal: raiz.scrollHeight,
    grupos: [],
    nomeRodape: null,
  }
  const colapsar = (t) => t.replace(/\s+/g, ' ').trim()
  const cadeiaDe = (el) => {
    const cadeia = []
    for (let atual = el; atual; atual = atual.parentElement) cadeia.push(getComputedStyle(atual).backgroundColor)
    return cadeia
  }
  const textoProprio = (el) => colapsar([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''))
  // O texto de um controle: o valor, o placeholder (só visível com o valor vazio) ou o rótulo da
  // opção escolhida. A senha não sai em claro: só a quantidade de caracteres.
  const textoDoControle = (el) => {
    const dica = colapsar(el.getAttribute('placeholder') ?? '')
    if (el.tagName === 'INPUT') {
      const tipo = (el.getAttribute('type') || 'text').toLowerCase()
      if (['hidden', 'checkbox', 'radio', 'range', 'color', 'file', 'image'].includes(tipo)) return ''
      if (tipo === 'password') return el.value !== '' ? '•'.repeat(el.value.length) : dica
      return el.value !== '' ? colapsar(el.value) : dica
    }
    if (el.tagName === 'TEXTAREA') return el.value !== '' ? colapsar(el.value) : dica
    if (el.tagName === 'SELECT') return colapsar([...el.selectedOptions].map((opcao) => opcao.textContent).join(' '))
    return ''
  }
  // Os nós de texto que pertencem a este parágrafo: os dos descendentes inline, e não os dos
  // parágrafos aninhados, que são medidos por conta própria (nada conta duas vezes).
  const textosDoParagrafo = (el) => {
    const nosDeTexto = []
    const andador = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let no = andador.nextNode(); no; no = andador.nextNode()) {
      if (no.parentElement && no.parentElement.closest('p') === el) nosDeTexto.push(no)
    }
    return nosDeTexto
  }
  // Os produtos das opacidades e das escalas (X e Y) dos ancestrais, até a raiz. Uma leitura que o
  // coletor não entende (matrix3d, opacidade ilegível) vai como null: a regra falha fechado.
  const ancestraisDe = (el) => {
    let opacidade = 1
    let escalaX = 1
    let escalaY = 1
    let legivel = true
    for (let pai = el.parentElement; pai; pai = pai.parentElement) {
      const estilo = getComputedStyle(pai)
      const o = estilo.opacity === '' ? Number.NaN : Number(estilo.opacity)
      if (Number.isFinite(o)) opacidade *= o
      else legivel = false
      if (estilo.transform && estilo.transform !== 'none') {
        const m = /^matrix\(([^)]+)\)$/.exec(estilo.transform)
        const v = m ? m[1].split(',').map((parte) => (parte.trim() === '' ? Number.NaN : Number(parte))) : []
        if (v.length === 6 && v.every(Number.isFinite)) {
          escalaX *= Math.hypot(v[0], v[1])
          escalaY *= Math.hypot(v[2], v[3])
        } else legivel = false
      }
    }
    return legivel ? { opacidade, escalaX, escalaY } : null
  }
  // Os caracteres do parágrafo na ordem do DOM, que é a ordem das linhas: uma linha nova começa
  // quando o centro vertical do caractere desce mais de 10 px em relação ao da linha atual.
  const linhasDe = (el) => {
    const linhas = []
    let atual = null
    for (const no of textosDoParagrafo(el)) {
      const texto = no.textContent
      for (let i = 0; i < texto.length; i += 1) {
        const faixa = document.createRange()
        faixa.setStart(no, i)
        faixa.setEnd(no, i + 1)
        const retangulos = faixa.getClientRects()
        if (retangulos.length === 0) continue
        const centro = (retangulos[0].top + retangulos[0].bottom) / 2
        if (atual === null || centro - atual.centro > 10) {
          atual = { centro, texto: '' }
          linhas.push(atual)
        }
        atual.texto += texto[i]
      }
    }
    return linhas.map((linha) => linha.texto.trim().length).filter((n) => n > 0)
  }

  // A Zilla Slab dos números (regra NUM). `document.fonts.check()` dá true para uma família sem
  // @font-face (cai numa fonte do sistema), então a face também tem de estar registrada e `loaded`.
  // Sem `document.fonts` (ou se lançar), a leitura é null e a regra falha fechado.
  const semAspas = (texto) => String(texto).trim().replace(/^["']|["']$/g, '')
  const pesoCobre = (pesoDaFace, peso) => {
    const faixa = String(pesoDaFace).split(/\s+/).map(Number).filter(Number.isFinite)
    const alvo = Number(peso)
    if (faixa.length === 0 || !Number.isFinite(alvo)) return false
    return faixa.length === 1 ? faixa[0] === alvo : alvo >= faixa[0] && alvo <= faixa[1]
  }
  const faceCarregada = (peso, tamanho) => {
    if (!document.fonts || typeof document.fonts.check !== 'function') return null
    try {
      const passa = document.fonts.check(`${peso} ${tamanho} "Zilla Slab"`) === true
      const registrada = [...document.fonts].some((face) => semAspas(face.family) === 'Zilla Slab' && face.status === 'loaded' && pesoCobre(face.weight, peso))
      return passa && registrada
    } catch {
      return null
    }
  }
  doc.fontes = { zillaSlab700: faceCarregada('700', '112px') }

  // Os critérios de tela: o retângulo do próprio texto (a caixa de um parágrafo é mais larga que o
  // texto), o pseudo-elemento (o fio vertical do campo), os keyframes de uma animação e o vazio no
  // fim de um bloco. Cada leitura que falha vai como nula: a regra falha fechado.
  const rectTextoDe = (el) => {
    let esquerda = Infinity
    let topo = Infinity
    let direita = -Infinity
    let base = -Infinity
    for (const no of el.childNodes) {
      if (no.nodeType !== 3 || colapsar(no.textContent) === '') continue
      const faixa = document.createRange()
      faixa.selectNodeContents(no)
      const r = faixa.getBoundingClientRect()
      if (!(r.width > 0 || r.height > 0)) continue
      esquerda = Math.min(esquerda, r.left)
      topo = Math.min(topo, r.top)
      direita = Math.max(direita, r.right)
      base = Math.max(base, r.bottom)
    }
    return esquerda === Infinity ? null : { x: esquerda + sx, y: topo + sy, w: direita - esquerda, h: base - topo }
  }
  const pseudoDe = (el, cs, r, qual) => {
    try {
      const ps = getComputedStyle(el, qual)
      const conteudo = ps.content
      if (!conteudo || conteudo === 'none' || conteudo === 'normal') return null
      const absoluto = (ps.position === 'absolute' || ps.position === 'fixed') && cs.position !== 'static'
      const esquerda = parseFloat(ps.left)
      const topo = parseFloat(ps.top)
      return {
        conteudo,
        display: ps.display,
        position: ps.position,
        x: absoluto && Number.isFinite(esquerda) ? r.x + sx + (parseFloat(cs.borderLeftWidth) || 0) + esquerda : null,
        y: absoluto && Number.isFinite(topo) ? r.y + sy + (parseFloat(cs.borderTopWidth) || 0) + topo : null,
        w: parseFloat(ps.width),
        h: parseFloat(ps.height),
        backgroundColor: ps.backgroundColor,
      }
    } catch {
      return null
    }
  }
  const ehTransform = (propriedade) => /^(transform|translate|scale|rotate)$/.test(propriedade)
  const regrasComTransform = (regras, nome) => {
    let achou = false
    let leu = true
    for (const regra of regras) {
      if (regra.type === 7 && regra.name === nome) {
        for (const quadro of regra.cssRules) for (const propriedade of quadro.style) if (ehTransform(propriedade)) achou = true
      } else if (regra.cssRules) {
        const dentro = regrasComTransform(regra.cssRules, nome)
        if (dentro === null) leu = false
        else if (dentro) achou = true
      }
    }
    return achou ? true : leu ? false : null
  }
  const animacaoComTransform = (nomes) => {
    let resultado = false
    for (const nome of nomes.split(',').map((n) => n.trim()).filter((n) => n !== 'none' && n !== '')) {
      for (const folha of document.styleSheets) {
        let regras
        try {
          regras = folha.cssRules
        } catch {
          return null
        }
        const achou = regrasComTransform(regras, nome)
        if (achou === null) return null
        if (achou) resultado = true
      }
    }
    return resultado
  }
  const vazioNoFim = (el, cs) => {
    let fim = -Infinity
    let margem = 0
    // O texto do próprio bloco (um `<h1>` só com texto não tem elemento filho).
    for (const no of el.childNodes) {
      if (no.nodeType !== 3 || colapsar(no.textContent) === '') continue
      const faixa = document.createRange()
      faixa.selectNodeContents(no)
      const tr = faixa.getBoundingClientRect()
      if ((tr.width > 0 || tr.height > 0) && tr.bottom > fim) fim = tr.bottom
    }
    for (const filho of el.querySelectorAll('*')) {
      if (ignorar.has(filho.tagName)) continue
      const fr = filho.getBoundingClientRect()
      if (!(fr.width > 0 && fr.height > 0)) continue
      const fs = getComputedStyle(filho)
      if (fs.position === 'absolute' || fs.position === 'fixed') continue
      if (fr.bottom > fim) {
        fim = fr.bottom
        margem = parseFloat(fs.marginBottom) || 0
      }
    }
    if (fim === -Infinity) return null
    const base = el.getBoundingClientRect().bottom
    return { vazio: base - (parseFloat(cs.paddingBottom) || 0) - (parseFloat(cs.borderBottomWidth) || 0) - fim, margem }
  }
  const tiposSemTexto = ['hidden', 'checkbox', 'radio', 'range', 'color', 'file', 'image', 'submit', 'button', 'reset']

  const elementos = [...document.body.querySelectorAll('*')].filter((el) => !ignorar.has(el.tagName))
  const nos = elementos.map((el) => {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const visivel = typeof el.checkVisibility === 'function' ? el.checkVisibility({ visibilityProperty: true }) : r.width > 0 && r.height > 0
    const no = {
      tag: el.tagName.toLowerCase(),
      texto: textoProprio(el),
      visivel,
      rect: { x: r.x + sx, y: r.y + sy, w: r.width, h: r.height },
      estilo: {
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        fontWeight: cs.fontWeight,
        textTransform: cs.textTransform,
        letterSpacing: cs.letterSpacing,
        boxShadow: cs.boxShadow,
        borderTopLeftRadius: cs.borderTopLeftRadius,
        borderTopRightRadius: cs.borderTopRightRadius,
        borderBottomRightRadius: cs.borderBottomRightRadius,
        borderBottomLeftRadius: cs.borderBottomLeftRadius,
        borderTopWidth: cs.borderTopWidth,
        borderRightWidth: cs.borderRightWidth,
        borderBottomWidth: cs.borderBottomWidth,
        borderLeftWidth: cs.borderLeftWidth,
        borderTopStyle: cs.borderTopStyle,
        borderRightStyle: cs.borderRightStyle,
        borderBottomStyle: cs.borderBottomStyle,
        borderLeftStyle: cs.borderLeftStyle,
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        opacity: cs.opacity,
        transform: cs.transform,
        position: cs.position,
        top: cs.top,
        fontFamily: cs.fontFamily,
        fontVariantNumeric: cs.fontVariantNumeric,
        minHeight: cs.minHeight,
        borderBottomColor: cs.borderBottomColor,
        transitionProperty: cs.transitionProperty,
        transitionDuration: cs.transitionDuration,
        transitionDelay: cs.transitionDelay,
        animationName: cs.animationName,
        animationDuration: cs.animationDuration,
      },
      m: {
        cabecalho: el.matches('[data-cabecalho]'),
        nomeSite: el.matches('[data-nome-site]'),
        menuBotao: el.matches('[data-cabecalho] .sb-cab-menu'),
        acaoCabecalho: Boolean(el.closest('[data-cabecalho-acao]')),
        rodape: el.matches('[data-rodape]'),
        doRodape: Boolean(el.closest('[data-rodape]')),
        nomeRodape: Boolean(el.closest('[data-nome-rodape]')),
        midia: el.matches('[data-midia]'),
        moldura: Boolean(el.closest('[data-moldura-dupla]')),
        botaoPrimario: Boolean(el.closest('[data-botao="primario"]')),
        cta: Boolean(el.closest('[data-cta]')),
        andamento: Boolean(el.closest('[data-andamento], .campo-andamento, .campo-sessao')),
        filhoDeMain: el.parentElement !== null && el.parentElement.tagName === 'MAIN',
        filhoDeBloco: el.parentElement !== null && el.parentElement.matches('[data-bloco]'),
        // G12: os blocos e as mídias aninhados em qualquer profundidade dentro de <main>.
        blocoG12: el.closest('main') !== null && el.tagName !== 'MAIN' && el.matches('[data-bloco], [data-midia], figure'),
        interativo: el.matches('a, button, input, select, textarea, [role="button"]'),
        // NUM: os números da faixa e o cronômetro em Zilla Slab.
        numero: el.matches('[data-numero], .t-cronometro, [data-cronometro]'),
        // Critérios de tela (E, C, R, B, A e M).
        noMain: el.closest('main') !== null && el.tagName !== 'MAIN',
        dentroMidia: el.closest('[data-midia]') !== null,
        abertura: el.matches('.sb-abertura, [data-abertura]'),
        bloco: el.matches('[data-bloco]'),
        campo: el.matches('.sb-campo'),
        campoControle: el.matches('.sb-campo-controle'),
        rotuloCampo: el.tagName === 'LABEL' && el.closest('main') !== null,
        controle:
          el.closest('main') !== null &&
          el.matches('input, select, textarea') &&
          !tiposSemTexto.includes((el.getAttribute('type') || 'text').toLowerCase()),
        botaoForm: el.matches('main form button[type="submit"]'),
        botao: el.tagName === 'BUTTON' || el.matches('[data-botao], [role="button"]'),
        // O miolo de um botão de moldura dupla é parte do botão (M-3).
        dentroDeBotao: el.parentElement !== null && el.parentElement.closest('button, [data-botao], [role="button"]') !== null,
        ancoraLateral: el.matches('.sb-abertura-lateral a[href^="#"]'),
        // Volta 3 (A-2b): o fio que fecha a abertura (a borda de baixo do `.sb-abertura-base`).
        aberturaBase: el.matches('.sb-abertura-base'),
        etiqueta: el.matches('.sb-etiqueta'),
        avisoDemo: el.matches('[data-aviso="demonstracao"], [data-aviso="banco-de-demonstracao"]'),
        linha: el.matches('.sb-linha'),
        tituloSecao: el.tagName === 'H2' && el.closest('main') !== null,
        secao: el.closest('main') !== null && el.matches('section, [data-bloco]') && !el.matches('.sb-abertura, [data-abertura]') && el.querySelector('h2') !== null,
      },
      cadeia: cadeiaDe(el),
    }
    if (no.m.noMain && textoProprio(el) !== '') no.rectTexto = rectTextoDe(el)
    if (no.m.noMain) {
      const pseudo = {}
      const antes = pseudoDe(el, cs, r, '::before')
      const depois = pseudoDe(el, cs, r, '::after')
      if (antes) pseudo.antes = antes
      if (depois) pseudo.depois = depois
      if (antes || depois) no.pseudo = pseudo
    }
    if (no.m.ancoraLateral) {
      const destino = el.getAttribute('href') ?? ''
      let id = destino.slice(1)
      try {
        id = decodeURIComponent(id)
      } catch {
        /* o href cru serve */
      }
      no.href = destino
      no.alvoExiste = id !== '' && document.getElementById(id) !== null
    }
    if (el.tagName === 'BUTTON' || el.tagName === 'A') {
      no.desativado = Boolean(el.disabled) || el.hasAttribute('aria-disabled')
      no.ariaDisabled = el.getAttribute('aria-disabled')
    }
    if (no.m.secao) {
      const titulo = el.querySelector('h2')
      const tr = titulo.getBoundingClientRect()
      no.tituloDaSecao = { x: tr.x + sx, y: tr.y + sy, h: tr.height }
    }
    if (no.m.filhoDeMain || no.m.bloco) no.vazioFim = vazioNoFim(el, cs)
    if (cs.animationName && cs.animationName !== 'none') no.animacaoTransform = animacaoComTransform(cs.animationName)
    if (typeof el.getAnimations === 'function') {
      const lista = el.getAnimations()
      if (lista.length > 0) {
        no.animacoes = lista.map((a) => ({
          tipo: a.constructor ? a.constructor.name : '?',
          propriedades: a.effect && typeof a.effect.getKeyframes === 'function' ? [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))] : [],
        }))
      }
    }
    if (no.m.numero) {
      no.fonte = {
        familia: semAspas((cs.fontFamily || '').split(',')[0] ?? ''),
        peso: cs.fontWeight,
        tamanho: cs.fontSize,
        faceCarregada: faceCarregada(cs.fontWeight, cs.fontSize),
      }
    }
    if (el.matches('[data-midia]')) no.textoDentro = el.textContent
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') no.textoControle = textoDoControle(el)
    if (no.m.filhoDeMain || no.m.filhoDeBloco || no.m.blocoG12) no.ancestrais = ancestraisDe(el)
    if (el.tagName === 'P') {
      // O texto do parágrafo inclui o dos descendentes inline (<p><span>…</span></p>).
      no.textoTotal = colapsar(textosDoParagrafo(el).map((n) => n.textContent).join(''))
      if (no.textoTotal !== '' || no.texto !== '') no.linhas = linhasDe(el)
    }
    return no
  })

  // Colunas lado a lado dentro do <main>: filhos de uma grade ou de um flex em linha, com texto.
  const principal = document.querySelector('main')
  if (principal) {
    for (const pai of [principal, ...principal.querySelectorAll('*')]) {
      const exibicao = getComputedStyle(pai).display
      if (!/grid|flex/.test(exibicao)) continue
      const filhos = [...pai.children].filter((f) => f.getBoundingClientRect().width > 0 && f.getBoundingClientRect().height > 0 && colapsar(f.textContent) !== '')
      if (filhos.length < 2) continue
      const rects = filhos.map((f) => f.getBoundingClientRect())
      const ladoALado = rects.some((a, i) => rects.some((b, j) => j > i && a.right <= b.left + 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0))
      if (!ladoALado) continue
      doc.grupos.push({ id: `${pai.tagName.toLowerCase()}.${(pai.className || '').toString().split(/\s+/)[0] || '-'}`, alturas: rects.map((x) => x.height) })
    }
  }

  // O nome gigante do rodapé: a largura do texto (a mais larga das linhas) contra a área útil.
  const nome = document.querySelector('[data-nome-rodape]')
  const area = nome ? nome.closest('.sb-area') : null
  if (nome && area) {
    let larguraTexto = 0
    const andador = document.createTreeWalker(nome, NodeFilter.SHOW_TEXT)
    for (let no = andador.nextNode(); no; no = andador.nextNode()) {
      if (colapsar(no.textContent) === '') continue
      const faixa = document.createRange()
      faixa.selectNodeContents(no)
      larguraTexto = Math.max(larguraTexto, faixa.getBoundingClientRect().width)
    }
    if (nome.querySelector('span') && getComputedStyle(nome.querySelector('span')).display !== 'block') {
      const faixa = document.createRange()
      faixa.selectNodeContents(nome)
      larguraTexto = faixa.getBoundingClientRect().width
    }
    doc.nomeRodape = { larguraTexto, areaUtil: area.getBoundingClientRect().width }
  }

  // Os retângulos dos blocos (o cabeçalho, os filhos de <main>, os [data-bloco] e o rodapé), em ordem
  // de DOM: a madrugada (M-1) os compara com os do tema claro, lidos antes de ligar o botão.
  doc.blocos = nos
    .filter((n) => n.visivel && (n.m.cabecalho || n.m.filhoDeMain || n.m.bloco || n.m.rodape))
    .map((n, i) => ({ id: `${i + 1}:${n.tag}`, x: n.rect.x, y: n.rect.y, w: n.rect.w, h: n.rect.h }))

  return { doc, nos }
}

/**
 * O anel de foco (E-7): foca o primeiro controle do formulário e o botão de envio, lê o `outline`
 * calculado e devolve o foco. Roda numa segunda passada, depois de uma tecla Tab, para o `:focus-visible`
 * valer; e depois da coleta, para o foco não mexer nas medidas. Não escreve nada nos campos.
 *
 * Com o foco no elemento lê também (nas coordenadas da página) a caixa dele (`caixa`: top, bottom, left,
 * right) e, se ele mora numa linha de campo (`.sb-campo`), cada mensagem visível dela (`mensagens`: erro,
 * ajuda, status), com a caixa e o `topoLetra`: o y onde a tinta da primeira linha começa. O `topoLetra`
 * vem do canvas (`medida: 'tinta'`: topo do retângulo do texto + ascendente da fonte - ascendente real da
 * tinta da frase); sem canvas é o topo do em-quadrado da linha (`medida: 'estimada'`: topo da caixa +
 * (entrelinha - corpo) / 2), que fica acima da tinta, então a estimativa nunca folga a favor da regra.
 * Sem fechamento: é serializada por `toString()`.
 */
export function lerFocoNaPagina() {
  const sx = window.scrollX
  const sy = window.scrollY
  const tiposSemTexto = ['hidden', 'checkbox', 'radio', 'range', 'color', 'file', 'image', 'submit', 'button', 'reset']
  const aparece = (el) => {
    const r = el.getBoundingClientRect()
    return typeof el.checkVisibility === 'function' ? el.checkVisibility({ visibilityProperty: true }) : r.width > 0 && r.height > 0
  }
  const clipZerado = (clip) => /^rect\(\s*0(px)?[\s,]+0(px)?[\s,]+0(px)?[\s,]+0(px)?\s*\)$/.test(clip ?? '')
  const mensagemAparece = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && !clipZerado(cs.clip)
  }
  const caixaDe = (r) => ({ top: r.top + sy, bottom: r.bottom + sy, left: r.left + sx, right: r.right + sx })
  const topoDaLetra = (el, caixa) => {
    const cs = getComputedStyle(el)
    const entrelinha = parseFloat(cs.lineHeight)
    const corpo = parseFloat(cs.fontSize)
    const estimado = { topoLetra: caixa.top + (entrelinha - corpo) / 2, medida: 'estimada' }
    try {
      const andador = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let no = andador.nextNode()
      while (no && (no.textContent ?? '').trim() === '') no = andador.nextNode()
      const contexto = document.createElement('canvas').getContext('2d')
      if (!no || !contexto) return estimado
      const faixa = document.createRange()
      faixa.selectNodeContents(no)
      const retangulo = faixa.getBoundingClientRect()
      contexto.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const m = contexto.measureText((no.textContent ?? '').trim())
      const topo = retangulo.top + sy + m.fontBoundingBoxAscent - m.actualBoundingBoxAscent
      return Number.isFinite(topo) ? { topoLetra: topo, medida: 'tinta' } : estimado
    } catch {
      return estimado
    }
  }
  const mensagensDoCampo = (el) => {
    const campo = el.closest('.sb-campo')
    if (!campo) return []
    const lidas = []
    for (const [tipo, seletor] of [['erro', '.sb-campo-erro'], ['ajuda', '.sb-campo-ajuda'], ['status', '.sb-campo-status']]) {
      for (const m of campo.querySelectorAll(seletor)) {
        const texto = (m.textContent ?? '').replace(/\s+/g, ' ').trim()
        if (texto === '' || !mensagemAparece(m)) continue
        const caixa = caixaDe(m.getBoundingClientRect())
        lidas.push({ tipo, texto: texto.slice(0, 90), ...caixa, ...topoDaLetra(m, caixa) })
      }
    }
    return lidas
  }
  const ler = (el) => {
    if (!el) return null
    el.focus({ preventScroll: true })
    if (document.activeElement !== el) return { focou: false }
    const cs = getComputedStyle(el)
    const leitura = {
      focou: true,
      tag: el.tagName.toLowerCase(),
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      outlineOffset: cs.outlineOffset,
      outlineColor: cs.outlineColor,
      caixa: caixaDe(el.getBoundingClientRect()),
      mensagens: mensagensDoCampo(el),
    }
    el.blur()
    return leitura
  }
  const controle = [...document.querySelectorAll('main form input, main form select, main form textarea')].find(
    (el) => !tiposSemTexto.includes((el.getAttribute('type') || 'text').toLowerCase()) && aparece(el),
  )
  const botao = [...document.querySelectorAll('main form button[type="submit"]')].find(aparece)
  const foco = { controle: ler(controle), botao: ler(botao) }
  window.scrollTo(sx, sy)
  return foco
}

/**
 * O estado de envio (E-7, R-3 e D4-vao): a geometria que o envio do formulário pode mexer, nas coordenadas da página
 * (`getBoundingClientRect()` mais a rolagem). Devolve `{ pagina, linhas: [{ top, altura }], controles: [{ bottom } | null],
 * botao: { top } | null, mensagens: [{ tipo, texto, linhas, cortada, foraDaJanela }], colisoes }`. `controles[i]` é a base
 * do `.sb-campo-controle` da linha `i` (o fio do campo abaixo de 768). Roda antes e depois do envio; não
 * escreve nada na página. Uma mensagem (`.sb-campo-erro`, `.sb-campo-ajuda`, `.sb-campo-status`) só conta se tiver
 * texto e estiver visível; as linhas são `altura / line-height` (nulas se o line-height não for um número). Na
 * busca de colisões os elementos sem texto não entram: um `<p role="status">` vazio ocupa a célula da grade e não é
 * defeito. Sem fechamento: é serializada por `toString()`.
 */
export function lerEstadoDeEnvioNaPagina() {
  const sy = window.scrollY
  const um = (n) => Math.round(n * 10) / 10
  const texto = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  const clipZerado = (clip) => /^rect\(\s*0(px)?[\s,]+0(px)?[\s,]+0(px)?[\s,]+0(px)?\s*\)$/.test(clip ?? '')
  const aparece = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && !clipZerado(cs.clip)
  }
  const linhas = [...document.querySelectorAll('.sb-campo')].map((el) => {
    const r = el.getBoundingClientRect()
    return { top: um(r.top + sy), altura: um(r.height) }
  })
  // A base do controle de cada linha (`.sb-campo-controle`), na ordem das linhas (nula se a linha não tem controle). Abaixo de
  // 768 o `.sb-campo` não tem borda de baixo e a zona de mensagem é o `padding-bottom` dele: o fio visível do campo é a borda
  // de baixo do controle, não a base da linha (D4-vao mede o vão do fio ao botão).
  const controles = [...document.querySelectorAll('.sb-campo')].map((el) => {
    const controle = el.querySelector('.sb-campo-controle')
    return controle ? { bottom: um(controle.getBoundingClientRect().bottom + sy) } : null
  })
  const botaoEl = document.querySelector('main form button[type="submit"]')
  const botao = botaoEl ? { top: um(botaoEl.getBoundingClientRect().top + sy) } : null
  const tipos = [
    ['erro', '.sb-campo-erro'],
    ['ajuda', '.sb-campo-ajuda'],
    ['status', '.sb-campo-status'],
  ]
  const vistas = []
  const mensagens = []
  for (const [tipo, seletor] of tipos) {
    for (const el of document.querySelectorAll(seletor)) {
      const conteudo = texto(el)
      if (conteudo === '' || !aparece(el)) continue
      const r = el.getBoundingClientRect()
      const entrelinha = parseFloat(getComputedStyle(el).lineHeight)
      vistas.push(el)
      mensagens.push({
        tipo,
        texto: conteudo.slice(0, 90),
        linhas: Number.isFinite(entrelinha) && entrelinha > 0 ? Math.round(r.height / entrelinha) : null,
        cortada: el.scrollWidth > el.clientWidth + 1,
        foraDaJanela: r.right > window.innerWidth + 1 || r.left < -1,
      })
    }
  }
  const comConteudo = (el) => /^(INPUT|SELECT|BUTTON)$/.test(el.tagName) || texto(el) !== ''
  const outros = [...document.querySelectorAll('main label, main input, main select, main button, main a, main h1, main h2, main p, main li, main [role="alert"]')].filter(
    (el) => aparece(el) && comConteudo(el),
  )
  const colisoes = []
  for (const m of vistas) {
    const a = m.getBoundingClientRect()
    for (const o of outros) {
      if (o === m || o.contains(m) || m.contains(o)) continue
      const b = o.getBoundingClientRect()
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (w > 1 && h > 1) colisoes.push({ mensagem: texto(m).slice(0, 40), com: `${o.tagName} ${texto(o).slice(0, 30)}`.trim(), w: um(w), h: um(h) })
    }
  }
  return { pagina: document.documentElement.scrollHeight, linhas, controles, botao, mensagens, colisoes }
}

/**
 * A geometria dos campos (D3): para cada linha de campo visível do `main` (`.sb-campo`), nas coordenadas da página,
 * o fio (a borda de baixo da linha: o topo é `bottom` menos a espessura), o controle (`.sb-campo-entrada`: caixa e o
 * anel lido do estilo calculado com o controle em foco) e as mensagens à vista (`erro`, `ajuda`, `status`, com a caixa).
 * Lê também cada `select` do `main`: a opção escolhida (texto visível) e o texto e o valor de todas as opções. Foca e
 * tira o foco de cada controle (sem rolar a página): rode depois de uma tecla Tab, para o `:focus-visible` valer. Uma
 * linha de 0 x 0 (a caixa de diálogo fechada) não entra. Sem fechamento: é serializada por `toString()`.
 */
export function lerGeometriaDosCamposNaPagina() {
  const sx = window.scrollX
  const sy = window.scrollY
  const arredondar = (n) => Math.round(n * 100) / 100
  const colapsar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim()
  const caixaDe = (r) => ({ top: arredondar(r.top + sy), bottom: arredondar(r.bottom + sy), left: arredondar(r.left + sx), right: arredondar(r.right + sx) })
  const clipZerado = (clip) => /^rect\(\s*0(px)?[\s,]+0(px)?[\s,]+0(px)?[\s,]+0(px)?\s*\)$/.test(clip ?? '')
  const mensagemAparece = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && !clipZerado(cs.clip)
  }
  const rotuloDe = (campo) => colapsar(campo?.querySelector('label')?.textContent)

  const campos = []
  for (const campo of document.querySelectorAll('main .sb-campo')) {
    const r = campo.getBoundingClientRect()
    if (!(r.width > 0 && r.height > 0)) continue
    const caixa = caixaDe(r)
    const espessura = parseFloat(getComputedStyle(campo).borderBottomWidth)
    const fio = Number.isFinite(espessura) && espessura > 0 ? { top: arredondar(caixa.bottom - espessura), bottom: caixa.bottom, left: caixa.left, right: caixa.right } : null
    let controle = null
    const entrada = campo.querySelector('.sb-campo-entrada')
    if (entrada) {
      controle = { tag: entrada.tagName.toLowerCase(), ...caixaDe(entrada.getBoundingClientRect()) }
      entrada.focus({ preventScroll: true })
      controle.focou = document.activeElement === entrada
      if (controle.focou) {
        const estilo = getComputedStyle(entrada)
        controle.outlineStyle = estilo.outlineStyle
        controle.outlineWidth = estilo.outlineWidth
        controle.outlineOffset = estilo.outlineOffset
        entrada.blur()
      }
    }
    const mensagens = []
    for (const [tipo, seletor] of [['erro', '.sb-campo-erro'], ['ajuda', '.sb-campo-ajuda'], ['status', '.sb-campo-status']]) {
      for (const m of campo.querySelectorAll(seletor)) {
        const texto = colapsar(m.textContent)
        if (texto === '' || !mensagemAparece(m)) continue
        mensagens.push({ tipo, texto: texto.slice(0, 90), ...caixaDe(m.getBoundingClientRect()) })
      }
    }
    campos.push({ rotulo: rotuloDe(campo), fio, controle, mensagens })
  }

  const selects = [...document.querySelectorAll('main select')].map((el) => ({
    rotulo: rotuloDe(el.closest('.sb-campo')),
    valor: el.value,
    textoVisivel: colapsar([...el.selectedOptions].map((opcao) => opcao.textContent).join(' ')),
    opcoes: [...el.options].map((opcao) => ({ valor: opcao.value, texto: colapsar(opcao.textContent) })),
  }))

  window.scrollTo(sx, sy)
  return { campos, selects }
}

// ---------------------------------------------------------------------------------------------
// MAT-44d-3, volta 3, defeito D5 (só em 390): o erro do campo ficava apertado contra o que vem depois (0 px até o rótulo da
// linha seguinte, 8 px até o botão) e o anel de foco do campo era mais estreito que o campo (a entrada ocupava x 32–358 num
// campo de x 16–374, e o anel passa 4 px: 28–362).
//   D5-erro: com o erro à vista (depois do envio vazio), próximo.top - erro.bottom >= 16, onde `erro` é a caixa do
//            `.sb-campo-erro` e `próximo` é o primeiro elemento visível depois dele na página (o rótulo da linha seguinte, o
//            aceite dos termos ou o botão de envio).
//   D5-anel: com o foco no controle, a caixa do anel (a do controle + outline-offset + outline-width) é a do campo: x de 16 a
//            374 (a área útil de 358 px), com 1 px de tolerância.
// Os dois são "não aplicável" de 768 para cima (o desenho de 1440 é de outro passo) e reprovam fechado abaixo de 768 numa largura
// que não é a de 390. Falham fechado: leitura ausente, nenhum erro visível, erro sem caixa, sem próximo elemento, controle sem
// retângulo, sem foco, sem outline.

/** O ar mínimo entre a base do erro do campo e o topo do que vem depois dele (px). */
export const FOLGA_DEPOIS_DO_ERRO = 16
/** A diferença que o anel pode ter da caixa do campo, em cada lado (px). */
export const TOLERANCIA_DO_ANEL = 1
/** A largura da janela em que o D5 vale (o celular de referência). */
const LARGURA_DO_D5 = 390

/** Fora de 390 o D5 não mede: de 768 para cima não se aplica, e abaixo de 768 numa largura diferente reprova fechado. */
function foraDoD5(regra, doc) {
  if (!celularDe(doc)) return naoAplicavel(regra, 'o desenho de 1440 é de outro passo: a mensagem mora dentro da linha de 112 px')
  if (doc.largura !== LARGURA_DO_D5) {
    return falhaFechada(regra, `a largura da janela é ${doc.largura} px: o critério só vale em ${LARGURA_DO_D5} (o desenho de 358 px de área útil)`)
  }
  return null
}

/**
 * D5-erro: depois do envio vazio (`doc.envio.vazio.erros`, lido por `lerErrosDeCampoNaPagina`), cada erro de campo tem 16 px ou
 * mais até o topo do primeiro elemento visível depois dele. A medida é a da caixa do `.sb-campo-erro` (24 px de linha) até o topo
 * do próximo, não a da tinta.
 */
export function d5Erro(doc) {
  return comDoc('D5-erro', doc, () => {
    const fora = foraDoD5('D5-erro', doc)
    if (fora) return fora
    const erros = doc.envio?.vazio?.erros
    if (!Array.isArray(erros)) return falhaFechada('D5-erro', 'sem a leitura dos erros depois do envio vazio (doc.envio.vazio.erros)')
    if (erros.length === 0) return falhaFechada('D5-erro', 'nenhum erro visível depois do envio vazio (sem ele não há o que medir)')
    const falhas = []
    erros.forEach((erro, i) => {
      const nome = `erro ${i + 1}`
      if (!erro || typeof erro !== 'object' || !ehNumero(erro.top) || !ehNumero(erro.bottom)) {
        falhas.push({ no: nome, motivo: `${nome}: sem a caixa do erro (topo ou base ilegível)` })
        return
      }
      const dele = `o erro "${erro.texto ?? ''}"`
      const proximo = erro.proximo
      if (!proximo || typeof proximo !== 'object' || !ehNumero(proximo.top)) {
        falhas.push({ no: nome, motivo: `${dele} sem o próximo elemento (nenhum elemento visível depois dele, ou o topo dele ilegível)` })
        return
      }
      const folga = proximo.top - erro.bottom
      if (folga < FOLGA_DEPOIS_DO_ERRO - TOL_FOLGA) {
        falhas.push({
          no: nome,
          motivo: `${dele} termina em y=${erro.bottom.toFixed(1)} e ${proximo.descricao ?? 'o próximo elemento'} começa em y=${proximo.top.toFixed(1)}: folga de ${folga.toFixed(1)} px (o mínimo é ${FOLGA_DEPOIS_DO_ERRO})`,
        })
      }
    })
    return resultadoComNumeros('D5-erro', falhas, `cada erro de campo tem ${FOLGA_DEPOIS_DO_ERRO} px ou mais até o elemento seguinte, depois do envio vazio`)
  })
}

/**
 * D5-anel: o anel de foco de cada controle (a caixa dele ampliada por `outline-offset` + `outline-width`, lidos do estilo
 * calculado com o controle em foco) é a caixa do campo: da borda esquerda à borda direita da área útil (x de 16 a 374 em 390),
 * com `TOLERANCIA_DO_ANEL` de diferença em cada lado. Mede em repouso e depois do envio vazio, em cada linha de campo.
 */
export function d5Anel(doc) {
  return comDoc('D5-anel', doc, () => {
    const fora = foraDoD5('D5-anel', doc)
    if (fora) return fora
    const esquerda = xDaColuna(1, doc.largura, doc.clientWidth)
    const direita = esquerda + areaUtilDe(doc.largura, doc.clientWidth)
    const falhas = medirGeometriaDosCampos(doc, '', { controle: true, exigirMensagem: false }, ({ campo, falhar }) => {
      const c = campo.controle
      if (c.focou !== true) return falhar('não recebeu foco, sem como medir o anel')
      if (c.outlineStyle === undefined || c.outlineStyle === '' || c.outlineStyle === 'none') return falhar('sem outline no foco (o anel não aparece)')
      const largura = px(c.outlineWidth)
      const recuo = px(c.outlineOffset)
      if (!(largura > 0) || !ehNumero(recuo)) return falhar(`largura ou offset do anel ilegível (${c.outlineWidth} e ${c.outlineOffset}), sem como medir`)
      const alcance = largura + recuo
      const lado = (nome, anel, campoX, paraFora) => {
        const diferenca = anel - campoX
        if (Math.abs(diferenca) <= TOLERANCIA_DO_ANEL + 0.01) return
        const sentido = paraFora(diferenca) ? 'para fora' : 'para dentro'
        falhar(`o anel de foco ${nome} em x=${anel.toFixed(1)} e o campo em x=${campoX.toFixed(1)} (${Math.abs(diferenca).toFixed(1)} px ${sentido}; a tolerância é de ${TOLERANCIA_DO_ANEL})`)
      }
      lado('começa', c.left - alcance, esquerda, (d) => d < 0)
      lado('termina', c.right + alcance, direita, (d) => d > 0)
    })
    return resultadoComNumeros('D5-anel', falhas, `o anel de foco de cada controle é a caixa do campo (x de ${esquerda.toFixed(1)} a ${direita.toFixed(1)}, ±${TOLERANCIA_DO_ANEL} px)`)
  })
}

/**
 * Os erros de campo à vista (D5-erro): para cada `.sb-campo-erro` com texto e visível, a caixa dele (`top`, `bottom`, nas coordenadas
 * da página) e o primeiro elemento visível depois dele (`proximo`: `{ descricao, top }`, nulo se não houver). O "depois" é o que
 * começa a partir do topo do erro (o que está acima dele, como o controle da mesma linha, não entra) e o próximo é o de menor topo.
 * O topo de um elemento em linha (a ligação do aceite dos termos, com recuo vertical) é o do texto dele, e não o da caixa com o
 * recuo. Candidatos: os de `main` que o E-7 também olha (rótulo, controle, botão, ligação, título, parágrafo, item, alerta), com
 * conteúdo e visíveis. Não escreve nada na página. Sem fechamento: é serializada por `toString()`.
 */
export function lerErrosDeCampoNaPagina() {
  const sy = window.scrollY
  const um = (n) => Math.round(n * 10) / 10
  const texto = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  const clipZerado = (clip) => /^rect\(\s*0(px)?[\s,]+0(px)?[\s,]+0(px)?[\s,]+0(px)?\s*\)$/.test(clip ?? '')
  const aparece = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && !clipZerado(cs.clip)
  }
  const topoDe = (el) => {
    if (getComputedStyle(el).display === 'inline') {
      const faixa = document.createRange()
      faixa.selectNodeContents(el)
      const r = faixa.getBoundingClientRect()
      if (r.width > 0 || r.height > 0) return r.top
    }
    return el.getBoundingClientRect().top
  }
  const comConteudo = (el) => /^(INPUT|SELECT|BUTTON)$/.test(el.tagName) || texto(el) !== ''
  const candidatos = [...document.querySelectorAll('main label, main input, main select, main button, main a, main h1, main h2, main p, main li, main [role="alert"]')].filter(
    (el) => aparece(el) && comConteudo(el),
  )
  const erros = []
  for (const el of document.querySelectorAll('.sb-campo-erro')) {
    const conteudo = texto(el)
    if (conteudo === '' || !aparece(el)) continue
    const r = el.getBoundingClientRect()
    let proximo = null
    for (const o of candidatos) {
      if (o === el || o.contains(el) || el.contains(o)) continue
      const topo = topoDe(o)
      if (topo < r.top - 0.5) continue
      if (proximo === null || topo < proximo.topo) proximo = { o, topo }
    }
    erros.push({
      texto: conteudo.slice(0, 90),
      top: um(r.top + sy),
      bottom: um(r.bottom + sy),
      proximo: proximo ? { descricao: `${proximo.o.tagName} ${texto(proximo.o).slice(0, 30)}`.trim(), top: um(proximo.topo + sy) } : null,
    })
  }
  return { erros }
}

// ---------------------------------------------------------------------------------------------
// MAT-44d-3, volta 3, defeito D6 (seleção de texto): a seleção nas telas de acesso e na Conta usava o azul padrão do navegador, fora da
// paleta. Decisão do líder: `::selection` com a paleta (variáveis de uso do tema), sem azul e sem amarelo.
//   D6-selecao: nas cinco telas (qualquer largura, os dois temas), `getComputedStyle(el, '::selection')` (`backgroundColor` e `color`) de
//               um elemento do corpo (um parágrafo do `main`) e de um `input`: o fundo tem alfa > 0 (o padrão do navegador reporta
//               `rgba(0, 0, 0, 0)`) e o contraste do texto sobre o fundo da seleção é >= 4,5 (AA), pelas funções que o medidor já tem.
// Falha fechada: leitura ausente, elemento sem retângulo, sem estilo lido, cor que não se interpreta e contraste incalculável reprovam.

/** O contraste mínimo do texto da seleção sobre o fundo dela (WCAG AA, texto normal). */
export const CONTRASTE_MINIMO_DA_SELECAO = 4.5
const ELEMENTOS_DA_SELECAO = [
  ['corpo', 'o corpo', 'nenhum parágrafo visível no main'],
  ['controle', 'o input', 'nenhum input visível no main'],
]

/** D6-selecao: ver o bloco acima. Lê `doc.selecao` (`lerSelecaoNaPagina`: `{ corpo, controle }`). */
export function d6Selecao(doc) {
  return comDoc('D6-selecao', doc, () => {
    const lida = doc.selecao
    if (!lida || typeof lida !== 'object') return falhaFechada('D6-selecao', 'sem a leitura da seleção (doc.selecao)')
    const falhas = []
    const ok = []
    for (const [chave, nome, vazio] of ELEMENTOS_DA_SELECAO) {
      const falhar = (motivo) => falhas.push({ no: nome, motivo: `${nome}: ${motivo}` })
      const el = lida[chave]
      if (!el || typeof el !== 'object') {
        falhar(`sem a leitura do elemento (${vazio})`)
        continue
      }
      if (!rectValido(el.rect) || !(el.rect.w > 0) || !(el.rect.h > 0)) {
        falhar('sem o retângulo do elemento (caixa ausente, ilegível ou de largura ou altura nula)')
        continue
      }
      const estilo = el.selecao
      const textoDe = (v) => typeof v === 'string' && v.trim() !== ''
      if (!estilo || typeof estilo !== 'object' || !textoDe(estilo.backgroundColor) || !textoDe(estilo.color)) {
        falhar('sem o estilo da seleção lido (`::selection` sem fundo ou sem cor)')
        continue
      }
      const fundo = parseCor(estilo.backgroundColor)
      if (!fundo) {
        falhar(`o fundo da seleção "${estilo.backgroundColor}" não se interpreta como cor`)
        continue
      }
      const cor = parseCor(estilo.color)
      if (!cor) {
        falhar(`o texto da seleção "${estilo.color}" não se interpreta como cor`)
        continue
      }
      if (!(fundo.a > 0)) {
        falhar(`o fundo da seleção é transparente (${estilo.backgroundColor}): o padrão do navegador, sem \`::selection\` da paleta`)
        continue
      }
      const cadeia = [estilo.backgroundColor, ...(Array.isArray(el.cadeia) ? el.cadeia : [])]
      const razao = contraste(estilo.color, cadeia)
      if (!ehNumero(razao)) {
        falhar(`sem como calcular o contraste (fundo ${estilo.backgroundColor} translúcido sem um fundo opaco por baixo)`)
        continue
      }
      if (razao < CONTRASTE_MINIMO_DA_SELECAO) {
        falhar(`contraste de ${razao.toFixed(2)}:1 entre o texto ${estilo.color} e o fundo ${estilo.backgroundColor} da seleção (o mínimo é ${CONTRASTE_MINIMO_DA_SELECAO})`)
        continue
      }
      ok.push(`${nome.replace(/^o /, '')}: fundo ${estilo.backgroundColor}, texto ${estilo.color}, contraste ${razao.toFixed(2)}:1`)
    }
    return resultadoComNumeros('D6-selecao', falhas, `a seleção é da paleta e tem contraste AA (${ok.join('; ')})`)
  })
}

/**
 * A seleção de texto (D6-selecao): lê o `::selection` calculado de um elemento do corpo (o primeiro `<p>` visível com texto no `main`) e do
 * primeiro `input` visível do `main` (fora os que não têm texto: hidden, checkbox etc.). Devolve `{ corpo, controle }`, cada um `{ tag, texto,
 * rect, selecao: { backgroundColor, color } | null, cadeia }` (nulo se a página não tem o elemento): `rect` nas coordenadas da página,
 * `selecao` nulo se o navegador não entrega o `::selection` (a leitura lança) e `cadeia` os fundos do elemento até a raiz, para compor um
 * fundo translúcido. Não escreve nada na página. Sem fechamento: é serializada por `toString()`.
 */
export function lerSelecaoNaPagina() {
  const sx = window.scrollX
  const sy = window.scrollY
  const colapsar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim()
  const aparece = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'
  }
  const cadeiaDe = (el) => {
    const cadeia = []
    for (let atual = el; atual; atual = atual.parentElement) cadeia.push(getComputedStyle(atual).backgroundColor)
    return cadeia
  }
  const ler = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    let selecao = null
    try {
      const s = getComputedStyle(el, '::selection')
      selecao = { backgroundColor: s.backgroundColor, color: s.color }
    } catch {
      selecao = null
    }
    return {
      tag: el.tagName.toLowerCase(),
      texto: colapsar(el.textContent).slice(0, 60),
      rect: { x: r.x + sx, y: r.y + sy, w: r.width, h: r.height },
      selecao,
      cadeia: cadeiaDe(el),
    }
  }
  const tiposSemTexto = ['hidden', 'checkbox', 'radio', 'range', 'color', 'file', 'image', 'submit', 'button', 'reset']
  const corpo = [...document.querySelectorAll('main p')].find((el) => colapsar(el.textContent) !== '' && aparece(el))
  const controle = [...document.querySelectorAll('main input')].find((el) => !tiposSemTexto.includes((el.getAttribute('type') || 'text').toLowerCase()) && aparece(el))
  return { corpo: ler(corpo), controle: ler(controle) }
}

// ---------------------------------------------------------------------------------------------
// CDP (só Node 24: fetch e WebSocket)

const espera = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

async function abrirAlvo(porta) {
  const resposta = await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: 'PUT' })
  if (!resposta.ok) throw new Error(`o Chrome na porta ${porta} recusou abrir uma aba (${resposta.status})`)
  const alvo = await resposta.json()
  const ws = new WebSocket(alvo.webSocketDebuggerUrl)
  await new Promise((ok, erro) => {
    ws.onopen = ok
    ws.onerror = () => erro(new Error('não conectou ao Chrome por CDP'))
  })
  let id = 0
  const pendentes = new Map()
  ws.onmessage = (mensagem) => {
    const dados = JSON.parse(mensagem.data)
    if (dados.id && pendentes.has(dados.id)) {
      const { ok, erro } = pendentes.get(dados.id)
      pendentes.delete(dados.id)
      if (dados.error) erro(new Error(JSON.stringify(dados.error)))
      else ok(dados.result)
    }
  }
  const enviar = (metodo, parametros = {}) =>
    new Promise((ok, erro) => {
      id += 1
      pendentes.set(id, { ok, erro })
      ws.send(JSON.stringify({ id, method: metodo, params: parametros }))
    })
  const cdp = {
    enviar,
    fechar: async () => {
      ws.close()
      await fetch(`http://127.0.0.1:${porta}/json/close/${alvo.id}`).catch(() => undefined)
    },
  }
  await enviar('Page.enable')
  await enviar('Runtime.enable')
  await enviar('Page.bringToFront')
  return cdp
}

async function avaliar(cdp, expressao) {
  const r = await cdp.enviar('Runtime.evaluate', { expression: expressao, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(`eval: ${JSON.stringify(r.exceptionDetails).slice(0, 600)}`)
  return r.result.value
}

async function esperarPronto(cdp) {
  for (let i = 0; i < 150; i += 1) {
    const pronto = await avaliar(cdp, `document.readyState === 'complete' && !!document.querySelector('h1') && document.fonts.status === 'loaded'`).catch(() => false)
    if (pronto) break
    await espera(100)
  }
  await espera(350)
}

async function clicarPorTexto(cdp, seletor, texto) {
  const feito = await avaliar(
    cdp,
    `(() => { const el = [...document.querySelectorAll(${JSON.stringify(seletor)})].find(e => e.textContent.trim().includes(${JSON.stringify(texto)})); if (!el) return false; el.click(); return true })()`,
  )
  if (!feito) throw new Error(`não achei ${seletor} com "${texto}"`)
  await espera(300)
}

// As 5 telas de acesso e Conta (copiado do .oc/cdp.mjs: o medidor não importa de `.oc/`). Cada caso
// começa limpando a sessão, para os casos públicos não herdarem o login do caso anterior.
async function limparSessao(cdp, base) {
  await cdp.enviar('Page.navigate', { url: new URL('entrar', base).href })
  await esperarPronto(cdp)
  await avaliar(cdp, `localStorage.clear(); sessionStorage.clear(); true`)
}

async function esperarSemOcupado(cdp) {
  for (let i = 0; i < 100; i += 1) {
    const ocupado = await avaliar(cdp, `!!document.querySelector('main[aria-busy="true"]')`).catch(() => true)
    if (!ocupado) break
    await espera(100)
  }
  await espera(200)
}

async function preencherPorRotulo(cdp, rotulo, valor) {
  const feito = await avaliar(
    cdp,
    `(() => { const l = [...document.querySelectorAll('label')].find((x) => x.textContent.trim().toLowerCase().startsWith(${JSON.stringify(rotulo.toLowerCase())})); const i = l && (l.control || document.getElementById(l.htmlFor)); if (!i) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(valor)}); i.dispatchEvent(new Event('input', { bubbles: true })); return true })()`,
  )
  if (!feito) throw new Error(`não achei o campo "${rotulo}"`)
}

const SENHA_LOCAL = 'senha-local-ficticia'

async function entrarComo(cdp, base, email, senha) {
  await cdp.enviar('Page.navigate', { url: new URL('entrar', base).href })
  await esperarPronto(cdp)
  await preencherPorRotulo(cdp, 'E-mail', email)
  await preencherPorRotulo(cdp, 'Senha', senha)
  const enviou = await avaliar(cdp, `(() => { const b = document.querySelector('main form button[type="submit"]'); if (!b) return false; b.click(); return true })()`)
  if (!enviou) throw new Error('não achei o botão de envio do formulário de /entrar')
  for (let i = 0; i < 100; i += 1) {
    if ((await avaliar(cdp, `location.pathname`)) !== '/entrar') break
    await espera(150)
  }
  if ((await avaliar(cdp, `location.pathname`)) === '/entrar') throw new Error('o login não saiu de /entrar')
}

/** Um usuário novo, sem conta, criado pela API de Auth local (só loopback; a chave não é impressa). */
async function criarUsuarioSemConta(ambiente) {
  const email = `incompleta-${Date.now()}@exemplo.invalid`
  const resposta = await fetch(`${ambiente.API_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ambiente.ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: SENHA_LOCAL }),
  })
  if (!resposta.ok) throw new Error(`o cadastro local do usuário novo falhou (${resposta.status})`)
  return email
}

async function abrirCasoDeAcesso(cdp, base, ambiente, { caso, tema }) {
  const { caminho, acesso } = CASOS_DE_ACESSO[caso]
  await limparSessao(cdp, base)
  if (acesso === 'ana') await entrarComo(cdp, base, 'ana@exemplo.invalid', SENHA_LOCAL)
  else if (acesso === 'incompleta') await entrarComo(cdp, base, await criarUsuarioSemConta(ambiente), SENHA_LOCAL)
  // O destino depois do login pode ser outro (a sessão está guardada no navegador): vai à tela do caso.
  const esperado = `/${caminho}`
  if (acesso === 'publica' || (await avaliar(cdp, `location.pathname`)) !== esperado) {
    await cdp.enviar('Page.navigate', { url: new URL(caminho, base).href })
  }
  await esperarPronto(cdp)
  await esperarSemOcupado(cdp)
  const chegou = await avaliar(cdp, `location.pathname`)
  if (chegou !== esperado) throw new Error(`${caso}: a página parou em ${chegou} em vez de ${esperado}`)
  let blocosClaro
  if (tema === 'madrugada') {
    // M-1: os blocos do tema claro, lidos antes de ligar o botão, para comparar com os da madrugada.
    blocosClaro = (await avaliar(cdp, `(${coletarNaPagina.toString()})()`)).doc.blocos
    const ligou = await avaliar(cdp, `(() => { const b = document.querySelector('[data-cabecalho] button[aria-pressed]'); if (!b) return false; b.click(); return true })()`)
    if (!ligou) throw new Error('não achei o botão "Modo madrugada" no cabeçalho')
    await espera(300)
    const atual = await avaliar(cdp, `document.documentElement.getAttribute('data-tema')`)
    if (atual !== 'madrugada') throw new Error('o tema não virou madrugada')
  }
  await avaliar(cdp, `document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); true`)
  for (let i = 0; i < 30; i += 1) {
    const rodando = await avaliar(cdp, `document.getAnimations().filter((a) => a.playState === 'running').length`)
    if (!rodando) break
    await espera(100)
  }
  await espera(200)
  return { blocosClaro }
}

/** Uma tecla Tab: o Chrome passa a tratar o foco seguinte como foco de teclado (`:focus-visible`). */
async function teclarTab(cdp) {
  const tecla = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }
  await cdp.enviar('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...tecla })
  await cdp.enviar('Input.dispatchKeyEvent', { type: 'keyUp', ...tecla })
}

async function abrirCaso(cdp, base, ambiente, pedido) {
  const { caso, tema } = pedido
  // Movimento reduzido sempre (G12): as medidas e as capturas usam o mesmo modo.
  await cdp.enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  if (Object.hasOwn(CASOS_DE_ACESSO, caso)) return abrirCasoDeAcesso(cdp, base, ambiente, pedido)
  const caminho = { sistema: 'sistema', inicio: '', hoje: 'app/hoje', sessao: 'app/hoje' }[caso]
  await cdp.enviar('Page.navigate', { url: new URL(caminho, base).href })
  await esperarPronto(cdp)
  if (tema === 'madrugada') {
    const ligou = await avaliar(cdp, `(() => { const b = document.querySelector('[data-cabecalho] button[aria-pressed]'); if (!b) return false; b.click(); return true })()`)
    if (!ligou) throw new Error('não achei o botão "Modo madrugada" no cabeçalho')
    await espera(300)
    const atual = await avaliar(cdp, `document.documentElement.getAttribute('data-tema')`)
    if (atual !== 'madrugada') throw new Error('o tema não virou madrugada')
  }
  if (caso === 'sessao') {
    await clicarPorTexto(cdp, 'main a', 'Ver sessão')
    await esperarPronto(cdp)
  }
  await avaliar(cdp, `document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); true`)
  // Espera as animações terminarem (a troca de tema não anima, mas a conferência é barata).
  for (let i = 0; i < 30; i += 1) {
    const rodando = await avaliar(cdp, `document.getAnimations().filter((a) => a.playState === 'running').length`)
    if (!rodando) break
    await espera(100)
  }
  await espera(200)
}

/** Os casos cujo formulário se envia na medição (E-7 e, no Recuperar, o R-3). */
export const CASOS_COM_ENVIO = ['entrar', 'criar_conta', 'recuperar_acesso', 'comecar_seu_nome', 'conta']

/** Lê o estado de envio da página aberta; uma leitura que não volta no formato certo é erro de medição. */
async function lerEnvio(cdp) {
  const leitura = await avaliar(cdp, `(${lerEstadoDeEnvioNaPagina.toString()})()`)
  if (!leitura || typeof leitura !== 'object' || !Array.isArray(leitura.linhas) || !Array.isArray(leitura.mensagens)) {
    throw new Error('a leitura do estado de envio voltou vazia ou fora do formato')
  }
  return leitura
}

/** Clica no botão de envio do formulário e espera 1,5 s (a resposta e a animação de saída acabam). */
async function enviarFormulario(cdp) {
  const enviou = await avaliar(cdp, `(() => { const b = document.querySelector('main form button[type="submit"]'); if (!b) return false; b.click(); return true })()`)
  if (!enviou) throw new Error('não achei o botão de envio (main form button[type="submit"]) para medir o envio')
  await espera(1500)
}

/**
 * A coleta do envio, depois de todas as outras leituras (o envio muda a página): o formulário vazio (antes e
 * depois) e, só no Recuperar, o caso aberto de novo com o e-mail preenchido (antes e depois). Erro aqui não é
 * engolido: vai para o `principal`, que sai com 2.
 */
async function coletarEnvio(cdp, base, ambiente, pedido) {
  // A Conta abre com o nome preenchido: o envio "vazio" do Perfil esvazia o nome antes (só o campo, sem enviar).
  if (pedido.caso === 'conta') await preencherPorRotulo(cdp, 'Seu nome', '')
  const antes = await lerEnvio(cdp)
  await enviarFormulario(cdp)
  const envio = { vazio: { antes, depois: await lerEnvio(cdp) } }
  // O anel de foco com o erro à vista (E-7): o mesmo Tab e a mesma leitura da passada em repouso.
  await teclarTab(cdp)
  envio.vazio.foco = await avaliar(cdp, `(${lerFocoNaPagina.toString()})()`)
  // A geometria dos campos com o erro à vista (D3): a mensagem, o controle, o fio e o anel de cada linha.
  envio.vazio.geometria = await avaliar(cdp, `(${lerGeometriaDosCamposNaPagina.toString()})()`)
  // O vão depois de cada erro (D5-erro): a caixa do erro e o topo do elemento seguinte, com o erro à vista.
  envio.vazio.erros = (await avaliar(cdp, `(${lerErrosDeCampoNaPagina.toString()})()`)).erros
  if (pedido.caso === 'recuperar_acesso') {
    await abrirCaso(cdp, base, ambiente, pedido)
    const antesDeEnviar = await lerEnvio(cdp)
    await preencherPorRotulo(cdp, 'E-mail', 'ana@exemplo.invalid')
    await enviarFormulario(cdp)
    envio.enviado = { antes: antesDeEnviar, depois: await lerEnvio(cdp) }
  }
  return envio
}

async function principal(argumentos) {
  let pasta
  let pedidos
  let ambiente
  try {
    ;({ pasta, pedidos } = lerArgumentos(argumentos))
    ambiente = escolherAmbiente(process.env, lerArquivoAmbiente())
    verificarAmbiente(ambiente)
    if (pedidos.some((p) => p.caso === 'comecar_seu_nome') && (!ambiente.API_URL || !ambiente.ANON_KEY)) {
      throw new Error('comecar_seu_nome precisa de API_URL e ANON_KEY (variável de ambiente ou .oc/ambiente.json)')
    }
  } catch (erro) {
    console.error(erro.message)
    return 2
  }
  const baseUrl = ambiente.BASE_URL
  fs.mkdirSync(pasta, { recursive: true })
  let cdp
  try {
    cdp = await abrirAlvo(ambiente.CDP_PORTA)
    for (const pedido of pedidos) {
      await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: pedido.largura, height: pedido.altura, deviceScaleFactor: 1, mobile: false })
      const aberto = await abrirCaso(cdp, baseUrl, ambiente, pedido)
      const lido = await avaliar(cdp, `(${coletarNaPagina.toString()})()`)
      const novo = Object.hasOwn(CASOS_DE_ACESSO, pedido.caso)
      if (novo) {
        // As leituras que dependem de um estado: o foco (depois de um Tab) e os blocos do tema claro.
        await teclarTab(cdp)
        lido.doc.foco = await avaliar(cdp, `(${lerFocoNaPagina.toString()})()`)
        // A geometria dos campos em repouso (D3): a ajuda, o controle, o fio e o anel de cada linha, e os selects.
        lido.doc.geometria = await avaliar(cdp, `(${lerGeometriaDosCamposNaPagina.toString()})()`)
        // A seleção de texto (D6): o `::selection` calculado de um parágrafo do corpo e de um input.
        lido.doc.selecao = await avaliar(cdp, `(${lerSelecaoNaPagina.toString()})()`)
        if (aberto?.blocosClaro) lido.doc.blocosClaro = aberto.blocosClaro
        // O envio vem por último: muda a página (E-7 e R-3). Vale em qualquer tema, para o E-7 da madrugada
        // do Começar não reprovar fechado por falta da leitura.
        if (CASOS_COM_ENVIO.includes(pedido.caso)) lido.doc.envio = await coletarEnvio(cdp, baseUrl, ambiente, pedido)
      }
      const resultados = avaliarTudo({ ...lido, tema: pedido.tema }, pedido.caso)
      const { criterios, criterios_manuais } = avaliarCriterios({ ...lido, tema: pedido.tema }, pedido.caso)
      const arquivo = `${pedido.caso}_${pedido.tema}_${pedido.largura}.json`
      const medidas = {
        largura: lido.doc.largura,
        clientWidth: lido.doc.clientWidth,
        h1: lido.nos.find((n) => n.tag === 'h1')?.rect ?? null,
        cabecalho: lido.nos.find((n) => n.m.cabecalho)?.rect ?? null,
        rodape: lido.nos.find((n) => n.m.rodape)?.rect ?? null,
        nomeRodape: lido.doc.nomeRodape,
        nos: lido.nos.length,
        ...(novo ? { alturaTotal: lido.doc.alturaTotal, foco: lido.doc.foco ?? null, geometria: lido.doc.geometria ?? null, selecao: lido.doc.selecao ?? null, envio: lido.doc.envio ?? null } : {}),
      }
      fs.writeFileSync(
        path.join(pasta, arquivo),
        JSON.stringify(
          { caso: pedido.caso, tema: pedido.tema, largura: pedido.largura, altura: pedido.altura, medido_em: new Date().toISOString(), medidas, resultados, criterios, criterios_manuais },
          null,
          2,
        ),
      )
      console.log(resumo(arquivo, resultados, criterios))
    }
    return 0
  } catch (erro) {
    console.error(`erro de medição: ${erro.message}`)
    return 2
  } finally {
    if (cdp) await cdp.fechar().catch(() => undefined)
  }
}

// Só roda quando há argumentos: o teste importa o módulo sem disparar o Chrome.
if (process.argv.length > 2) {
  process.exitCode = await principal(process.argv.slice(2))
}
