// Medidor do sistema-base (MAT-44d): mede no Chrome, por CDP, os critérios G1 a G12 da seção 2.11
// do contrato. Só biblioteca padrão do Node 24 (fetch e WebSocket), só loopback.
//
// Uso: node web/scripts/medir-dom.mjs <pasta> <caso>:<tema>:<LxA> ...
//   casos: sistema, inicio, hoje, sessao. Temas: claro e madrugada. Ex.: sistema:claro:1440x900
//   Grava <pasta>/<caso>_<tema>_<L>.json e imprime uma linha "RESUMO <arquivo> G1 ok G2 FALHA ...".
//   Saída 0 se mediu (as falhas ficam no JSON e no RESUMO); 2 em erro de uso ou de conexão.
//   Ambiente: CDP_PORTA (padrão 9344) e BASE_URL (padrão http://127.0.0.1:5244/).
//
// Além de G1 a G12 e SB3 (o nome do rodapé), a regra NUM confere os números em Zilla Slab (família,
// face carregada e lining-nums).
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

const CASOS = ['sistema', 'inicio', 'hoje', 'sessao']
const TEMAS = ['claro', 'madrugada']

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
 * `visibility: hidden` ou dentro de um ancestral com opacidade 0 é justamente o que se procura.
 * A leitura `ancestrais` (o produto das opacidades e das escalas dos ancestrais) cobre o wrapper.
 */
export function g12(nos) {
  const blocos = nos.filter((no) => marca(no, 'filhoDeMain') || marca(no, 'filhoDeBloco') || marca(no, 'blocoG12'))
  if (blocos.length === 0) return falhaFechada('G12', 'nenhum bloco (filho de main ou de [data-bloco])')
  const falhas = []
  const falhar = (no, motivo) => falhas.push({ no: descrever(no), motivo: `${descrever(no)}: ${motivo}` })
  for (const no of blocos) {
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

/** As regras que bloqueiam em cada caso: em `sistema`, todas; nos outros, só G2 e G9 (as demais só se registram). */
export function bloqueantesDoCaso(caso) {
  return caso === 'sistema' ? ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'SB3', 'NUM'] : ['G2', 'G9']
}

/** Avalia as regras sobre as leituras de uma página: `{ doc, nos, tema }`. */
export function avaliarTudo({ doc, nos, tema }, caso = 'sistema') {
  const bloqueantes = bloqueantesDoCaso(caso)
  const todas = [g1(doc), g2(nos, doc), g3(nos, doc), g4(nos), g5(nos, doc), g6(nos), g7(nos), g8(nos, doc), g9(nos, doc), g10(nos), g11(nos, tema), g12(nos), sb3(doc), num(nos, doc)]
  return todas.map((r) => ({ ...r, bloqueia: bloqueantes.includes(r.regra) }))
}

/** A linha de resumo: `RESUMO <arquivo> G1 ok G2 FALHA ...`; falha que não bloqueia sai como "registrada". */
export function resumo(arquivo, resultados) {
  const partes = resultados.map((r) => `${r.regra} ${r.ok ? 'ok' : r.bloqueia ? 'FALHA' : 'registrada'}`)
  return `RESUMO ${arquivo} ${partes.join(' ')}`
}

/** Lê os argumentos `<pasta> <caso>:<tema>:<LxA> ...`; lança Error com a mensagem de uso se algo não vale. */
export function lerArgumentos(argumentos) {
  const [pasta, ...specs] = argumentos
  if (!pasta || specs.length === 0) {
    throw new Error('uso: node web/scripts/medir-dom.mjs <pasta> <caso>:<tema>:<LxA> ...')
  }
  const pedidos = specs.map((spec) => {
    const m = /^([a-z]+):([a-z]+):(\d+)x(\d+)$/.exec(spec)
    if (!m) throw new Error(`argumento inválido: ${spec} (esperado <caso>:<tema>:<LxA>)`)
    const [, caso, tema, largura, altura] = m
    if (!CASOS.includes(caso)) throw new Error(`caso desconhecido: ${caso} (use ${CASOS.join(', ')})`)
    if (!TEMAS.includes(tema)) throw new Error(`tema desconhecido: ${tema} (use ${TEMAS.join(', ')})`)
    if (caso === 'inicio' && tema === 'madrugada') throw new Error('o Início é sempre claro: não há inicio:madrugada')
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
      },
      cadeia: cadeiaDe(el),
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

  return { doc, nos }
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

async function abrirCaso(cdp, base, { caso, tema }) {
  // Movimento reduzido sempre (G12): as medidas e as capturas usam o mesmo modo.
  await cdp.enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
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

async function principal(argumentos) {
  let pasta
  let pedidos
  const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5244/'
  try {
    ;({ pasta, pedidos } = lerArgumentos(argumentos))
    verificarLoopback(baseUrl)
  } catch (erro) {
    console.error(erro.message)
    return 2
  }
  const porta = Number(process.env.CDP_PORTA ?? 9344)
  fs.mkdirSync(pasta, { recursive: true })
  let cdp
  try {
    cdp = await abrirAlvo(porta)
    for (const pedido of pedidos) {
      await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: pedido.largura, height: pedido.altura, deviceScaleFactor: 1, mobile: false })
      await abrirCaso(cdp, baseUrl, pedido)
      const lido = await avaliar(cdp, `(${coletarNaPagina.toString()})()`)
      const resultados = avaliarTudo({ ...lido, tema: pedido.tema }, pedido.caso)
      const arquivo = `${pedido.caso}_${pedido.tema}_${pedido.largura}.json`
      const medidas = {
        largura: lido.doc.largura,
        clientWidth: lido.doc.clientWidth,
        h1: lido.nos.find((n) => n.tag === 'h1')?.rect ?? null,
        cabecalho: lido.nos.find((n) => n.m.cabecalho)?.rect ?? null,
        rodape: lido.nos.find((n) => n.m.rodape)?.rect ?? null,
        nomeRodape: lido.doc.nomeRodape,
        nos: lido.nos.length,
      }
      fs.writeFileSync(
        path.join(pasta, arquivo),
        JSON.stringify({ caso: pedido.caso, tema: pedido.tema, largura: pedido.largura, altura: pedido.altura, medido_em: new Date().toISOString(), medidas, resultados }, null, 2),
      )
      console.log(resumo(arquivo, resultados))
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
