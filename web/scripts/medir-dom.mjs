// Medidor do site "Campo de mel": mede no Chrome, por CDP, os gates determinísticos da seção 8 do
// DESIGN.md (.oc/contrato/DESIGN.md). Só biblioteca padrão do Node 24 (fetch e WebSocket), só loopback.
//
// Uso: node web/scripts/medir-dom.mjs <pasta> <caso>:<tema>:<LxA> ...
//   casos: sistema, inicio, hoje, sessao, e qualquer outro nome [a-z0-9_]+ que esteja em CASOS de
//   .oc/cdp.mjs (a rota vem de lá). Temas: claro e madrugada. Ex.: comofunciona:claro:1440x900
//   Grava <pasta>/<caso>_<tema>_<L>.json e imprime uma linha "RESUMO <arquivo> G1 ok FONTES FALHA ...".
//   Saída 0 se mediu (as falhas ficam no JSON e no RESUMO); 2 em erro de uso ou de conexão.
//   Ambiente: CDP_PORTA (padrão 9344) e BASE_URL (padrão http://127.0.0.1:5244/).
//
// Regras (todas bloqueiam em todos os casos): G1 (sem rolagem horizontal), G11 (alvos e contraste),
// G12 (movimento reduzido), FONTES (só Literata e Outfit), CAIXA (nada em caixa alta), SOMBRA (sombra,
// gradiente e filtro só pelos tokens) e 3D (sem perspective, preserve-3d nem rotação em X ou Y).
//
// A parte pura recebe um JSON de nós e devolve { regra, ok, motivo, nos_com_falha }. Ela falha
// fechado: nó sem texto onde a regra pede texto, sem estilo, medida ausente, NaN ou valor ilegível
// reprovam, em vez de passar por falta de dado.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// Parte pura

/** As siglas que podem aparecer em caixa alta (lista fechada). */
export const SIGLAS_PERMITIDAS = ['RN', 'SBP', 'LGPD', 'OMS']

/** As duas famílias do site (o nome da família variável, "Literata Variable", conta como Literata). */
export const FAMILIAS_PERMITIDAS = ['Literata', 'Outfit']

/** Os valores dos tokens do DESIGN.md (seção 3): a referência quando a página não os entrega. */
export const TOKENS_DESIGN = {
  sombraFlutuante: '0 2px 4px rgb(43 35 32 / .08), 0 18px 40px rgb(43 35 32 / .16)',
  sombraCartao: '0 1px 2px rgb(43 35 32 / .06), 0 8px 24px rgb(43 35 32 / .06)',
  luzEstudio: 'radial-gradient(120% 90% at 15% 10%, #F7D684 0%, #F2C14E 60%)',
  brilhoMel: 'radial-gradient(closest-side, rgb(242 193 78 / .22), transparent)',
}

// O nome do token na página (custom property) de cada valor acima.
const TOKENS_NA_PAGINA = {
  sombraFlutuante: '--sombra-flutuante',
  sombraCartao: '--sombra-cartao',
  luzEstudio: '--luz-estudio',
  brilhoMel: '--brilho-mel',
}

/** As regras, na ordem em que saem. */
export const REGRAS = ['G1', 'G11', 'G12', 'FONTES', 'CAIXA', 'SOMBRA', '3D']

// Os casos com rota fixa; os outros vêm de CASOS de .oc/cdp.mjs.
export const CASOS_FIXOS = { sistema: 'sistema', inicio: '', hoje: 'app/hoje', sessao: 'app/hoje' }
const TEMAS = ['claro', 'madrugada']

/** A rota de um caso: a fixa, ou a de `casosCdp[caso].rota`; nulo se não houver (caso desconhecido). */
export function rotaDoCaso(caso, casosCdp) {
  if (typeof caso !== 'string' || caso === '') return null
  if (Object.hasOwn(CASOS_FIXOS, caso)) return CASOS_FIXOS[caso]
  if (!casosCdp || typeof casosCdp !== 'object' || !Object.hasOwn(casosCdp, caso)) return null
  const rota = casosCdp[caso]?.rota
  return typeof rota === 'string' ? rota.replace(/^\/+/, '') : null
}

/** As rotas dos pedidos; lança Error se algum caso não tem rota (nunca passa em silêncio). */
export function rotasDosPedidos(pedidos, casosCdp) {
  return pedidos.map((pedido) => {
    const rota = rotaDoCaso(pedido.caso, casosCdp)
    if (rota === null) {
      throw new Error(`caso sem rota: ${pedido.caso} (não é ${Object.keys(CASOS_FIXOS).join(', ')} nem está em CASOS de .oc/cdp.mjs)`)
    }
    return { ...pedido, rota }
  })
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

/**
 * O contraste WCAG 2.x entre o texto e o fundo; nulo se faltar cor ou se o fundo não for opaco.
 * `opacidade` (0 a 1, padrão 1) multiplica o alfa da cor: é a opacidade efetiva do texto.
 */
export function contraste(corTexto, cadeiaDeFundos, opacidade = 1) {
  const fundo = fundoReal(cadeiaDeFundos)
  const cor = parseCor(corTexto)
  if (!fundo || !cor || !Number.isFinite(opacidade)) return null
  const texto = { ...cor, a: cor.a * opacidade }
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
const ehNumero = (valor) => typeof valor === 'number' && Number.isFinite(valor)
const lido = (valor) => typeof valor === 'string' && valor.trim() !== ''
const descrever = (no) => {
  const texto = [no.texto, no.textoControle].find((t) => typeof t === 'string' && t.trim() !== '')
  return `${no.tag ?? '?'}${texto ? ` "${texto.trim().slice(0, 40)}"` : ''}`
}
const px = (valor) => {
  if (typeof valor === 'number') return valor
  const m = /^(-?[\d.]+)px$/.exec(String(valor ?? '').trim())
  return m ? parseFloat(m[1]) : Number.NaN
}
const semAspas = (texto) => String(texto).trim().replace(/^["']|["']$/g, '').trim()

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

/**
 * G11: alvo de toque de 44 × 44 (56 de altura na BarraRegistrar e na madrugada) e contraste do texto
 * de 4,5:1, ou de 3:1 para texto grande (≥ 24 px, ou ≥ 18,66 px com peso ≥ 700).
 */
export function g11(nos, tema) {
  const alvos = nos.filter((no) => marca(no, 'interativo') && visivel(no))
  // O texto dos controles (valor, placeholder, rótulo do select) conta como o dos demais nós.
  const textos = nos.filter((no) => visivel(no) && (temTexto(no) || temTextoControle(no)))
  if (alvos.length === 0) return falhaFechada('G11', 'nenhum alvo de toque')
  if (textos.length === 0) return falhaFechada('G11', 'nenhum nó com texto')
  const falhas = []
  for (const no of alvos) {
    const alturaMinima = tema === 'madrugada' || marca(no, 'barraRegistrar') ? 56 : 44
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
    // O estilo do texto que se vê: o do nó, ou (controle que mostra o placeholder) o do ::placeholder.
    const estiloDoTexto = no.estiloTexto ?? no.estilo
    // Sem tamanho ou peso legíveis não há como saber o limite (4,5 ou 3): reprova, não adivinha.
    const tamanho = px(estiloDoTexto?.fontSize)
    const peso = numeroDe(estiloDoTexto?.fontWeight)
    if (Number.isNaN(tamanho)) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: font-size ausente ou ilegível (${estiloDoTexto?.fontSize})` })
      continue
    }
    if (!Number.isFinite(peso)) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: font-weight ausente ou ilegível (${estiloDoTexto?.fontWeight})` })
      continue
    }
    // O placeholder tem opacidade própria (::placeholder) e herda a do controle e dos ancestrais: o
    // alfa efetivo do texto é a cor × a opacidade do pseudo × a cadeia. Sem as duas leituras, reprova.
    let opacidade = 1
    if (no.estiloTexto) {
      const daDica = numeroDe(no.estiloTexto.opacity)
      if (!(daDica >= 0 && daDica <= 1)) {
        falhas.push({ no: descrever(no), motivo: `${descrever(no)}: opacity do ::placeholder ausente ou ilegível (${no.estiloTexto.opacity})` })
        continue
      }
      const cadeia = no.estiloTexto.opacidadeCadeia
      if (!ehNumero(cadeia) || cadeia < 0 || cadeia > 1.001) {
        falhas.push({ no: descrever(no), motivo: `${descrever(no)}: opacidade da cadeia do controle ilegível (${cadeia})` })
        continue
      }
      opacidade = daDica * cadeia
    }
    const razao = contraste(estiloDoTexto?.color, no.cadeia, opacidade)
    if (razao === null) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: contraste incalculável (fundo transparente sem ancestral opaco, ou cor ilegível)` })
      continue
    }
    menor = Math.min(menor, razao)
    // Texto grande (WCAG 1.4.3): 24 px, ou 18,66 px (14 pt) em negrito, pede só 3:1.
    const grande = tamanho >= 24 || (tamanho >= 18.66 && peso >= 700)
    const minimo = grande ? 3 : 4.5
    if (razao < minimo) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: contraste ${razao.toFixed(2)}:1 (mínimo ${minimo}:1${grande ? ', texto grande' : ''})` })
  }
  return resultado('G11', falhas, `${alvos.length} alvos ≥ 44 px; menor contraste ${menor.toFixed(2)}:1`)
}

/** As escalas dos eixos X e Y de um `transform` calculado (`none` ou `matrix(a, b, c, d, e, f)`); nulo se ilegível. */
function escalasDe(transform) {
  if (!lido(transform)) return null
  if (transform.trim() === 'none') return { x: 1, y: 1 }
  const m = /^matrix\(([^)]+)\)$/.exec(transform.trim())
  if (!m) return null
  const valores = m[1].split(',').map((parte) => (parte.trim() === '' ? Number.NaN : Number(parte)))
  if (valores.length !== 6 || valores.some((valor) => !Number.isFinite(valor))) return null
  const [a, b, c, d] = valores
  return { x: Math.hypot(a, b), y: Math.hypot(c, d) }
}

const numeroDe = (valor) => (typeof valor === 'number' ? valor : typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : Number.NaN)

const NUMERO = String.raw`-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?`

/**
 * As escalas X e Y da propriedade individual `scale` (`none`, `s`, `sx sy` ou `sx sy sz`, com número
 * ou porcentagem); nulo se ausente ou ilegível.
 */
function escalaIndividualDe(valor) {
  if (!lido(valor)) return null
  const t = valor.trim()
  if (t === 'none') return { x: 1, y: 1 }
  const partes = t.split(/\s+/)
  if (partes.length > 3) return null
  const numeros = partes.map((parte) => (new RegExp(`^${NUMERO}%?$`, 'i').test(parte) ? (parte.endsWith('%') ? parseFloat(parte) / 100 : Number(parte)) : Number.NaN))
  if (!numeros.every(Number.isFinite)) return null
  return { x: numeros[0], y: numeros.length > 1 ? numeros[1] : numeros[0] }
}

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
    if (!lido(no.estilo?.transform)) falhar(no, 'transform ausente')
    else if (escalas === null) falhar(no, `transform ilegível (${no.estilo?.transform})`)
    else if (Math.abs(escalas.x - 1) > 0.001 || Math.abs(escalas.y - 1) > 0.001) {
      falhar(no, `escala ${escalas.x.toFixed(3)} × ${escalas.y.toFixed(3)} (x × y)`)
    }
    // A propriedade individual `scale` também escala o bloco (e some com `none`).
    const individual = escalaIndividualDe(no.estilo?.scale)
    if (!lido(no.estilo?.scale)) falhar(no, 'scale ausente')
    else if (individual === null) falhar(no, `scale ilegível (${no.estilo.scale})`)
    else if (Math.abs(individual.x - 1) > 0.001 || Math.abs(individual.y - 1) > 0.001) {
      falhar(no, `escala ${individual.x.toFixed(3)} × ${individual.y.toFixed(3)} (x × y, propriedade scale)`)
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

// ---------------------------------------------------------------------------------------------
// FONTES

// As famílias genéricas do CSS: não são uma família do site, então não entram na conta.
const FAMILIAS_GENERICAS = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'emoji', 'math', 'fangsong',
  'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', '-apple-system', 'blinkmacsystemfont',
])

/** Todas as famílias nomeadas de um `font-family` calculado, sem aspas e na ordem; vazio se não houver. */
export function familiasDe(fontFamily) {
  if (!lido(fontFamily)) return []
  return dividirNoTopo(fontFamily, ',').map(semAspas).filter((nome) => nome !== '')
}

/** A primeira família de um `font-family` calculado, sem aspas; nulo se não houver. */
export function primeiraFamilia(fontFamily) {
  return familiasDe(fontFamily)[0] ?? null
}

const ehGenerica = (nome) => FAMILIAS_GENERICAS.has(nome.toLowerCase()) || /^ui-/i.test(nome)

/** Leva "Literata Variable" a "Literata" e "Outfit Variable" a "Outfit" (a família variável do @fontsource). */
function familiaBase(nome) {
  return nome.replace(/\s+variable$/i, '').trim()
}

/** Os nós com texto visível: o texto dos elementos e o dos controles (valor, placeholder). */
const nosComTexto = (nos) => nos.filter((no) => visivel(no) && (temTexto(no) || temTextoControle(no)))

/**
 * FONTES: no máximo duas famílias calculadas nos nós de texto, Literata e Outfit. Vale TODA família
 * nomeada da pilha de cada nó (não só a primeira: `"Outfit Variable", "Zilla Slab"` reprova); só as
 * genéricas (serif, sans-serif, system-ui, ui-*...) ficam de fora da conta.
 */
export function fontes(nos) {
  const comTexto = nosComTexto(nos)
  if (comTexto.length === 0) return falhaFechada('FONTES', 'nenhum nó com texto')
  const permitidas = new Map(FAMILIAS_PERMITIDAS.map((nome) => [nome.toLowerCase(), nome]))
  const falhas = []
  const achadas = new Map() // minúscula → nome como veio
  const foraDoSet = new Map()
  // As famílias nomeadas de uma pilha: devolve as que ficam fora de Literata e Outfit.
  const foraDaPilha = (familias) => {
    const fora = []
    for (const familia of familias) {
      if (ehGenerica(familia)) continue
      const base = familiaBase(familia)
      achadas.set(base.toLowerCase(), base)
      if (!permitidas.has(base.toLowerCase())) {
        foraDoSet.set(familia.toLowerCase(), familia)
        fora.push(familia)
      }
    }
    return fora
  }
  for (const no of comTexto) {
    const familias = familiasDe(no.estilo?.fontFamily)
    if (familias.length === 0) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: font-family ausente` })
    else {
      const fora = foraDaPilha(familias)
      if (fora.length > 0) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: família ${fora.join(', ')}` })
    }
    // O controle que mostra o placeholder desenha com a pilha do ::placeholder, que também vale.
    if (no.estiloTexto) {
      const daDica = familiasDe(no.estiloTexto.fontFamily)
      if (daDica.length === 0) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: font-family do ::placeholder ausente` })
      else {
        const fora = foraDaPilha(daDica)
        if (fora.length > 0) falhas.push({ no: descrever(no), motivo: `${descrever(no)}: família ${fora.join(', ')} (::placeholder)` })
      }
    }
  }
  if (falhas.length === 0 && achadas.size === 0) {
    return falhaFechada('FONTES', 'nenhuma família não genérica medida nos nós de texto')
  }
  const lista = [...foraDoSet.values()]
  const motivoFalha =
    lista.length > 0
      ? `famílias fora de ${FAMILIAS_PERMITIDAS.join(' e ')}: ${lista.join(', ')} (${falhas.length} nós)`
      : `${falhas.length} nós sem font-family: ${falhas[0]?.motivo ?? ''}`
  return resultado('FONTES', falhas, `${comTexto.length} nós de texto, só ${[...achadas.values()].join(' e ')}`, motivoFalha)
}

// ---------------------------------------------------------------------------------------------
// CAIXA

/**
 * As palavras do texto com 4 ou mais maiúsculas seguidas (acentuadas também), menos as siglas
 * permitidas. A única outra exceção é o código de cor hexadecimal completo (`#` e 3, 4, 6 ou 8
 * dígitos hexa, em qualquer caixa, como item inteiro: `#EADDC5`, `#fff`). Um item com dígito não é
 * isento: `CADASTRAR2` reprova; `H1` e `A11Y` passam por não terem 4 maiúsculas seguidas. Os itens
 * são os separados por espaço, sem a pontuação das pontas.
 */
export function palavrasEmCaixaAlta(texto) {
  if (typeof texto !== 'string') return []
  const achadas = []
  for (const item of texto.split(/\s+/)) {
    const limpo = item.replace(/^[^\p{L}\p{N}#]+/u, '').replace(/[^\p{L}\p{N}]+$/u, '')
    if (limpo === '' || /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(limpo)) continue
    for (const palavra of limpo.match(/[\p{L}\p{M}]+/gu) ?? []) {
      if (/\p{Lu}{4,}/u.test(palavra) && !SIGLAS_PERMITIDAS.includes(palavra)) achadas.push(palavra)
    }
  }
  return achadas
}

/** CAIXA: nada em caixa alta, nem por `text-transform: uppercase` nem pela grafia (siglas da lista à parte). */
export function caixa(nos) {
  const comTexto = nosComTexto(nos)
  if (comTexto.length === 0) return falhaFechada('CAIXA', 'nenhum nó com texto')
  const falhas = []
  for (const no of comTexto) {
    if (!lido(no.estilo?.textTransform)) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: text-transform ausente` })
      continue
    }
    if (no.estilo.textTransform.trim() === 'uppercase') {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: text-transform uppercase` })
    }
    // O controle que mostra o placeholder o desenha com o text-transform do ::placeholder.
    if (no.estiloTexto) {
      if (!lido(no.estiloTexto.textTransform)) {
        falhas.push({ no: descrever(no), motivo: `${descrever(no)}: text-transform do ::placeholder ausente` })
      } else if (no.estiloTexto.textTransform.trim() === 'uppercase') {
        falhas.push({ no: descrever(no), motivo: `${descrever(no)}: text-transform uppercase (::placeholder)` })
      }
    }
    const palavras = [...palavrasEmCaixaAlta(no.texto), ...palavrasEmCaixaAlta(no.textoControle)]
    if (palavras.length > 0) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: caixa alta na grafia (${palavras.join(', ')})` })
    }
  }
  return resultado('CAIXA', falhas, `${comTexto.length} nós de texto, sem caixa alta (siglas: ${SIGLAS_PERMITIDAS.join(', ')})`)
}

// ---------------------------------------------------------------------------------------------
// SOMBRA: normalização das sombras e dos gradientes para uma forma canônica

/** Divide `texto` em `separador` (',' ou ' ') só fora de parênteses e de aspas. */
function dividirNoTopo(texto, separador) {
  const partes = []
  let profundidade = 0
  let aspas = null
  let atual = ''
  for (const c of String(texto)) {
    if (aspas) {
      if (c === aspas) aspas = null
    } else if (c === '"' || c === "'") aspas = c
    else if (c === '(') profundidade += 1
    else if (c === ')') profundidade -= 1
    const separa = !aspas && profundidade === 0 && (separador === ' ' ? /\s/.test(c) : c === separador)
    if (separa) {
      partes.push(atual)
      atual = ''
    } else atual += c
  }
  partes.push(atual)
  return partes.map((p) => p.trim()).filter((p) => p !== '')
}

/** Todas as cores viram `rgb(r g b)` ou `rgb(r g b / a)` (hex, rgb(), rgba(), com vírgula ou barra, `transparent`). */
function normalizarCores(texto) {
  const canal = (c) => {
    const n = c.endsWith('%') ? (parseFloat(c) * 255) / 100 : parseFloat(c)
    return Number.isFinite(n) ? Math.round(n) : null
  }
  let t = texto.toLowerCase()
  t = t.replace(/\btransparent\b/g, 'rgb(0 0 0 / 0)')
  t = t.replace(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![0-9a-z])/g, (todo, hex) => {
    const cheio = hex.length <= 4 ? [...hex].map((h) => h + h).join('') : hex
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(cheio.slice(i, i + 2), 16))
    const a = cheio.length === 8 ? parseInt(cheio.slice(6, 8), 16) / 255 : 1
    return `rgb(${r} ${g} ${b}${a < 1 ? ` / ${Number(a.toFixed(2))}` : ''})`
  })
  t = t.replace(/rgba?\(([^)]*)\)/g, (todo, dentro) => {
    const p = dentro.trim().split(/[\s,/]+/).filter(Boolean)
    if (p.length < 3 || p.length > 4) return todo
    const [r, g, b] = p.slice(0, 3).map(canal)
    const a = p.length === 4 ? alfa(p[3]) : 1
    if ([r, g, b].includes(null) || !Number.isFinite(a)) return todo
    const alfaCanonico = Number(Math.min(Math.max(a, 0), 1).toFixed(2))
    return `rgb(${r} ${g} ${b}${alfaCanonico < 1 ? ` / ${alfaCanonico}` : ''})`
  })
  return t
}

/** A forma canônica de um valor de CSS: minúsculas, cores em rgb(), `0px` → `0`, `.5` → `0.5`, espaços colapsados. */
export function canonico(texto) {
  if (!lido(texto)) return null
  let t = normalizarCores(texto)
  t = t.replace(/(?<![\w.])\.(\d)/g, '0.$1')
  t = t.replace(/(?<![\w.])-?0(?:\.0+)?px(?![\w])/g, '0')
  t = t.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
  return t.trim()
}

/**
 * A forma canônica de um `box-shadow`: camadas em ordem, cada uma como `[inset] x y desfoque espalhamento cor`
 * (a cor pode vir antes ou depois no original; o espalhamento que falta vira 0). Nulo se ilegível.
 */
export function sombraCanonica(texto) {
  const c = canonico(texto)
  if (c === null) return null
  if (c === 'none') return 'none'
  const camadas = []
  for (const camada of dividirNoTopo(c, ',')) {
    const tokens = dividirNoTopo(camada, ' ')
    const cores = tokens.filter((t) => t.startsWith('rgb('))
    const inset = tokens.includes('inset')
    const medidas = tokens.filter((t) => !t.startsWith('rgb(') && t !== 'inset')
    if (cores.length !== 1 || medidas.length < 2 || medidas.length > 4) return null
    if (!medidas.every((m) => /^-?[\d.]+(?:[a-z%]+)?$/.test(m))) return null
    while (medidas.length < 4) medidas.push('0')
    camadas.push([...(inset ? ['inset'] : []), ...medidas, cores[0]].join(' '))
  }
  return camadas.length === 0 ? null : camadas.join(', ')
}

/** Os parênteses (fora de aspas) abrem e fecham na conta certa. */
function parentesesBalanceados(texto) {
  let profundidade = 0
  let aspas = null
  for (const c of texto) {
    if (aspas) {
      if (c === aspas) aspas = null
    } else if (c === '"' || c === "'") aspas = c
    else if (c === '(') profundidade += 1
    else if (c === ')') {
      profundidade -= 1
      if (profundidade < 0) return false
    }
  }
  return profundidade === 0 && aspas === null
}

/**
 * Lê um `background-image` calculado: `{ gradientes }` (cada gradiente em forma canônica, ou nulo se
 * não dá para canonizar) ou `{ erro }` se o valor não é `none`, `url()`, `image-set()` nem gradiente.
 */
function leituraDeImagens(valor) {
  if (!lido(valor)) return { erro: 'background-image ausente' }
  const t = valor.trim()
  if (!parentesesBalanceados(t)) return { erro: `background-image ilegível (${t.slice(0, 120)})` }
  const gradientes = []
  for (const parte of dividirNoTopo(t, ',')) {
    if (parte === 'none') continue
    if (/^(?:-webkit-)?(?:repeating-)?(?:linear|radial|conic)-gradient\(.*\)$/is.test(parte) || /^-webkit-gradient\(.*\)$/is.test(parte)) {
      gradientes.push(canonico(parte))
    } else if (/^(?:-webkit-)?(?:url|image-set|cross-fade|element|image)\(.*\)$/is.test(parte)) {
      // Um gradiente escondido dentro de image-set() ou cross-fade() também vale como gradiente.
      if (/gradient\(/i.test(parte)) gradientes.push(null)
    } else return { erro: `background-image ilegível (${t.slice(0, 120)})` }
  }
  return { gradientes }
}

/**
 * SOMBRA: todo `box-shadow` diferente de `none` é uma das duas sombras dos tokens; todo gradiente em
 * `background-image` é um dos dois gradientes dos tokens; `filter` e `backdrop-filter` só `none`
 * (sem desfoque). Vale para todos os nós, também os ocultos (um painel fechado ainda é CSS do site).
 * Os tokens que a página entrega (`doc.tokens`) têm de bater com o DESIGN.md; o que ela não entrega
 * cai no valor do DESIGN.md.
 */
export function sombra(nos, doc) {
  if (!Array.isArray(nos) || nos.length === 0) return falhaFechada('SOMBRA', 'nenhum nó')
  const falhas = []
  const falhaDoc = (motivo) => falhas.push({ no: 'documento', motivo })
  // Os tokens: o da página tem de ser igual ao do DESIGN.md.
  let lidosDaPagina = 0
  for (const [chave, constante] of Object.entries(TOKENS_DESIGN)) {
    const daPagina = doc?.tokens?.[chave]
    if (!lido(daPagina)) continue
    lidosDaPagina += 1
    const ehSombra = chave.startsWith('sombra')
    const a = ehSombra ? sombraCanonica(daPagina) : canonico(daPagina)
    const b = ehSombra ? sombraCanonica(constante) : canonico(constante)
    if (a === null || a !== b) {
      falhaDoc(`token ${TOKENS_NA_PAGINA[chave]} da página (${daPagina.trim()}) difere do DESIGN.md (${constante})`)
    }
  }
  const sombrasOk = [TOKENS_DESIGN.sombraFlutuante, TOKENS_DESIGN.sombraCartao].map(sombraCanonica)
  const gradientesOk = [TOKENS_DESIGN.luzEstudio, TOKENS_DESIGN.brilhoMel].map(canonico)
  for (const no of nos) {
    const e = no.estilo
    if (!e) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: sem estilo` })
      continue
    }
    const falhar = (motivo) => falhas.push({ no: descrever(no), motivo: `${descrever(no)}: ${motivo}` })
    if (!lido(e.boxShadow)) falhar('box-shadow ausente')
    else {
      const canonica = sombraCanonica(e.boxShadow)
      if (canonica === null) falhar(`box-shadow ilegível (${e.boxShadow})`)
      else if (canonica !== 'none' && !sombrasOk.includes(canonica)) falhar(`box-shadow fora dos tokens (${e.boxShadow})`)
    }
    const imagens = leituraDeImagens(e.backgroundImage)
    if (imagens.erro) falhar(imagens.erro)
    else {
      for (const gradiente of imagens.gradientes) {
        if (gradiente === null || !gradientesOk.includes(gradiente)) falhar(`gradiente fora dos tokens (${e.backgroundImage.slice(0, 120)})`)
      }
    }
    for (const [propriedade, nome] of [['filter', 'filter'], ['backdropFilter', 'backdrop-filter']]) {
      if (!lido(e[propriedade])) falhar(`${nome} ausente`)
      else if (e[propriedade].trim() !== 'none') falhar(`${nome} ${e[propriedade]} (sem desfoque nem filtro)`)
    }
  }
  return resultado('SOMBRA', falhas, `${nos.length} nós: sombras e gradientes só dos tokens, sem filter (${lidosDaPagina} de 4 tokens lidos da página)`)
}

// ---------------------------------------------------------------------------------------------
// 3D

/** Lê um `transform` calculado: `{ tridimensional }` ou `{ erro }`. A matrix3d identidade em z passa. */
function leituraDoTransform(transform) {
  if (!lido(transform)) return { erro: 'transform ausente' }
  const t = transform.trim()
  if (t === 'none') return { tridimensional: false }
  const numeros = (texto) => texto.split(',').map((parte) => (parte.trim() === '' ? Number.NaN : Number(parte)))
  let m = /^matrix\(([^)]+)\)$/.exec(t)
  if (m) {
    const v = numeros(m[1])
    return v.length === 6 && v.every(Number.isFinite) ? { tridimensional: false } : { erro: `transform ilegível (${t})` }
  }
  m = /^matrix3d\(([^)]+)\)$/.exec(t)
  if (m) {
    const v = numeros(m[1])
    if (v.length !== 16 || !v.every(Number.isFinite)) return { erro: `transform ilegível (${t})` }
    // Em coluna: m13 m14 = v[2] v[3]; m23 m24 = v[6] v[7]; m31 m32 m33 m34 = v[8] v[9] v[10] v[11].
    // Uma rotação em X ou em Y mexe nessas entradas; a identidade em z não.
    const mexeEmZ = [2, 3, 6, 7, 8, 9, 11].some((i) => Math.abs(v[i]) > 1e-6) || Math.abs(v[10] - 1) > 1e-6
    return { tridimensional: mexeEmZ }
  }
  return { erro: `transform ilegível (${t})` }
}

/**
 * Lê a propriedade individual `rotate` calculada: `{ tridimensional }` ou `{ erro }`. `none`, o
 * ângulo sozinho e a rotação em torno de z (`z 30deg`, `0 0 1 30deg`) são 2D; um eixo em x ou y
 * (`x 30deg`, `y 30deg`, `1 0 0 30deg`, `1 1 0 30deg`) é 3D.
 */
function leituraDoRotate(valor) {
  if (!lido(valor)) return { erro: 'rotate ausente' }
  const t = valor.trim()
  if (t === 'none') return { tridimensional: false }
  const ilegivel = { erro: `rotate ilegível (${t})` }
  const partes = t.split(/\s+/)
  const angulo = partes[partes.length - 1]
  const ehAngulo = new RegExp(`^${NUMERO}(?:deg|grad|rad|turn)$`, 'i').test(angulo) || /^-?0(?:\.0+)?$/.test(angulo)
  if (!ehAngulo) return ilegivel
  const eixo = partes.slice(0, -1)
  if (eixo.length === 0) return { tridimensional: false }
  if (eixo.length === 1) {
    const nome = eixo[0].toLowerCase()
    if (nome === 'z') return { tridimensional: false }
    return nome === 'x' || nome === 'y' ? { tridimensional: true } : ilegivel
  }
  if (eixo.length === 3 && eixo.every((parte) => new RegExp(`^${NUMERO}$`, 'i').test(parte))) {
    const [x, y] = eixo.map(Number)
    return { tridimensional: x !== 0 || y !== 0 }
  }
  return ilegivel
}

/** 3D: nenhum nó com `perspective`, `transform-style: preserve-3d`, transform 3D ou `rotate` em X ou Y. */
export function tresD(nos) {
  if (!Array.isArray(nos) || nos.length === 0) return falhaFechada('3D', 'nenhum nó')
  const falhas = []
  for (const no of nos) {
    const e = no.estilo
    if (!e) {
      falhas.push({ no: descrever(no), motivo: `${descrever(no)}: sem estilo` })
      continue
    }
    const falhar = (motivo) => falhas.push({ no: descrever(no), motivo: `${descrever(no)}: ${motivo}` })
    if (!lido(e.perspective)) falhar('perspective ausente')
    else if (e.perspective.trim() !== 'none') falhar(`perspective ${e.perspective}`)
    if (!lido(e.transformStyle)) falhar('transform-style ausente')
    else if (e.transformStyle.trim() === 'preserve-3d') falhar('transform-style preserve-3d')
    else if (e.transformStyle.trim() !== 'flat') falhar(`transform-style ilegível (${e.transformStyle})`)
    const transform = leituraDoTransform(e.transform)
    if (transform.erro) falhar(transform.erro)
    else if (transform.tridimensional) falhar(`transform 3D (${e.transform})`)
    const rotate = leituraDoRotate(e.rotate)
    if (rotate.erro) falhar(rotate.erro)
    else if (rotate.tridimensional) falhar(`rotate 3D (${e.rotate})`)
  }
  return resultado('3D', falhas, `${nos.length} nós sem perspective, preserve-3d, transform 3D nem rotate em X ou Y`)
}

// ---------------------------------------------------------------------------------------------

/** As regras que bloqueiam em cada caso: todas, em todos. */
export function bloqueantesDoCaso() {
  return [...REGRAS]
}

/** Avalia as regras sobre as leituras de uma página: `{ doc, nos, tema }`. Todas bloqueiam, em todo caso. */
export function avaliarTudo({ doc, nos, tema }) {
  const lista = Array.isArray(nos) ? nos : []
  const bloqueantes = bloqueantesDoCaso()
  const todas = [g1(doc), g11(lista, tema), g12(lista), fontes(lista), caixa(lista), sombra(lista, doc), tresD(lista)]
  return todas.map((r) => ({ ...r, bloqueia: bloqueantes.includes(r.regra) }))
}

/** A linha de resumo: `RESUMO <arquivo> G1 ok G11 FALHA ...`; falha que não bloqueia sai como "registrada". */
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
    const m = /^([a-z0-9_]+):([a-z]+):(\d+)x(\d+)$/.exec(spec)
    if (!m) throw new Error(`argumento inválido: ${spec} (esperado <caso>:<tema>:<LxA>, caso em [a-z0-9_]+)`)
    const [, caso, tema, largura, altura] = m
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
  }
  // Os tokens como a página os declara (custom properties em :root); vazio se não existirem.
  const estiloRaiz = getComputedStyle(raiz)
  doc.tokens = {
    sombraFlutuante: estiloRaiz.getPropertyValue('--sombra-flutuante').trim(),
    sombraCartao: estiloRaiz.getPropertyValue('--sombra-cartao').trim(),
    luzEstudio: estiloRaiz.getPropertyValue('--luz-estudio').trim(),
    brilhoMel: estiloRaiz.getPropertyValue('--brilho-mel').trim(),
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
  // O produto das opacidades do elemento e de todos os ancestrais (a cadeia que também apaga o
  // placeholder); nulo se alguma leitura é ausente ou ilegível.
  const opacidadeDaCadeia = (el) => {
    let produto = 1
    for (let atual = el; atual; atual = atual.parentElement) {
      const o = getComputedStyle(atual).opacity
      const n = o === '' ? Number.NaN : Number(o)
      if (!Number.isFinite(n)) return null
      produto *= n
    }
    return produto
  }
  // A propriedade individual `scale` (`none`, `s`, `sx sy` ou `sx sy sz`); nulo se ausente ou ilegível.
  const escalaIndividual = (valor) => {
    const t = String(valor ?? '').trim()
    if (t === '') return null
    if (t === 'none') return { x: 1, y: 1 }
    const partes = t.split(/\s+/)
    if (partes.length > 3) return null
    const numeros = partes.map((p) => (/^-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?%?$/i.test(p) ? (p.endsWith('%') ? parseFloat(p) / 100 : Number(p)) : Number.NaN))
    if (!numeros.every(Number.isFinite)) return null
    return { x: numeros[0], y: numeros.length > 1 ? numeros[1] : numeros[0] }
  }
  // Os produtos das opacidades e das escalas (X e Y, do `transform` e da propriedade `scale`) dos
  // ancestrais, até a raiz. Uma leitura que o coletor não entende (matrix3d, opacidade ou scale
  // ilegível ou ausente) vai como null: a regra falha fechado.
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
      if (!estilo.transform) legivel = false
      else if (estilo.transform !== 'none') {
        const m = /^matrix\(([^)]+)\)$/.exec(estilo.transform)
        const v = m ? m[1].split(',').map((parte) => (parte.trim() === '' ? Number.NaN : Number(parte))) : []
        if (v.length === 6 && v.every(Number.isFinite)) {
          escalaX *= Math.hypot(v[0], v[1])
          escalaY *= Math.hypot(v[2], v[3])
        } else legivel = false
      }
      const individual = escalaIndividual(estilo.getPropertyValue('scale'))
      if (individual) {
        escalaX *= individual.x
        escalaY *= individual.y
      } else legivel = false
    }
    return legivel ? { opacidade, escalaX, escalaY } : null
  }

  // O html e o body entram na coleta (3D, sombra, gradiente, fonte e o resto valem para eles também);
  // as marcas de bloco e de controle não os alcançam, então as regras de bloco e de controle não mudam.
  const elementos = [raiz, document.body, ...document.body.querySelectorAll('*')].filter((el) => el && !ignorar.has(el.tagName))
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
        fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily,
        textTransform: cs.textTransform,
        boxShadow: cs.boxShadow,
        backgroundImage: cs.getPropertyValue('background-image'),
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        opacity: cs.opacity,
        transform: cs.transform,
        rotate: cs.getPropertyValue('rotate'),
        scale: cs.getPropertyValue('scale'),
        perspective: cs.getPropertyValue('perspective'),
        transformStyle: cs.getPropertyValue('transform-style'),
        filter: cs.getPropertyValue('filter'),
        backdropFilter: cs.getPropertyValue('backdrop-filter'),
      },
      m: {
        filhoDeMain: el.parentElement !== null && el.parentElement.tagName === 'MAIN',
        filhoDeBloco: el.parentElement !== null && el.parentElement.matches('[data-bloco]'),
        // G12: os blocos e as mídias aninhados em qualquer profundidade dentro de <main>.
        blocoG12: el.closest('main') !== null && el.tagName !== 'MAIN' && el.matches('[data-bloco], [data-midia], figure'),
        interativo: el.matches('a, button, input, select, textarea, [role="button"]'),
        // G11: os controles da BarraRegistrar (o componente rende `.barra-registrar[data-barra-registrar]`).
        barraRegistrar: el.closest('.barra-registrar, [data-barra-registrar]') !== null,
      },
      cadeia: cadeiaDe(el),
    }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      no.textoControle = textoDoControle(el)
      // Com o valor vazio o que se vê é o placeholder, e ele tem estilo próprio (::placeholder).
      if (no.textoControle !== '' && el.tagName !== 'SELECT' && el.value === '') {
        const dica = getComputedStyle(el, '::placeholder')
        no.estiloTexto = {
          color: dica.color,
          fontSize: dica.fontSize,
          fontWeight: dica.fontWeight,
          fontFamily: dica.fontFamily,
          textTransform: dica.textTransform,
          opacity: dica.opacity,
          opacidadeCadeia: opacidadeDaCadeia(el),
          origem: 'placeholder',
        }
      }
    }
    if (no.m.filhoDeMain || no.m.filhoDeBloco || no.m.blocoG12) no.ancestrais = ancestraisDe(el)
    return no
  })

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

async function abrirCaso(cdp, base, { caso, tema, rota }) {
  // Movimento reduzido sempre (G12): as medidas e as capturas usam o mesmo modo.
  await cdp.enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await cdp.enviar('Page.navigate', { url: new URL(rota, base).href })
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

/** Os CASOS de .oc/cdp.mjs (o caso → { rota }); nulo se o arquivo não existe ou não exporta CASOS. */
async function carregarCasosCdp() {
  try {
    const modulo = await import(pathToFileURL(path.resolve('.oc/cdp.mjs')).href)
    return modulo.CASOS ?? null
  } catch {
    return null
  }
}

async function principal(argumentos) {
  let pasta
  let pedidos
  const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5244/'
  try {
    ;({ pasta, pedidos } = lerArgumentos(argumentos))
    verificarLoopback(baseUrl)
    // Só abre o cdp.mjs se algum caso não tem rota fixa; caso sem rota é erro de uso, nunca passa.
    const precisaDoCdp = pedidos.some((pedido) => rotaDoCaso(pedido.caso, null) === null)
    pedidos = rotasDosPedidos(pedidos, precisaDoCdp ? await carregarCasosCdp() : null)
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
      const leitura = await avaliar(cdp, `(${coletarNaPagina.toString()})()`)
      const resultados = avaliarTudo({ ...leitura, tema: pedido.tema })
      const arquivo = `${pedido.caso}_${pedido.tema}_${pedido.largura}.json`
      const medidas = {
        largura: leitura.doc.largura,
        clientWidth: leitura.doc.clientWidth,
        tokens: leitura.doc.tokens,
        h1: leitura.nos.find((n) => n.tag === 'h1')?.rect ?? null,
        nos: leitura.nos.length,
      }
      fs.writeFileSync(
        path.join(pasta, arquivo),
        JSON.stringify({ caso: pedido.caso, tema: pedido.tema, largura: pedido.largura, altura: pedido.altura, rota: pedido.rota, medido_em: new Date().toISOString(), medidas, resultados }, null, 2),
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
