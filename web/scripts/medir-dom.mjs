// Medidor do site: mede no Chrome, por CDP, os gates determinísticos do web/DESIGN.md. Só biblioteca
// padrão do Node 24 (fetch e WebSocket), só loopback.
//
// Uso: node web/scripts/medir-dom.mjs <pasta> <caso>:<tema>:<LxA> ...
//   casos: sistema, inicio, hoje, sessao, e qualquer outro nome [a-z0-9_]+ que esteja em CASOS de
//   .oc/cdp.mjs (a rota vem de lá). Temas: claro e madrugada. Ex.: comofunciona:claro:1440x900
//   Grava <pasta>/<caso>_<tema>_<L>.json e imprime uma linha "RESUMO <arquivo> G1 ok FONTES FALHA ...".
//   Saída 0 se mediu (as falhas ficam no JSON e no RESUMO); 2 em erro de uso ou de conexão.
//   Ambiente: CDP_PORTA (padrão 9344) e BASE_URL (padrão http://127.0.0.1:5244/).
//
// As sete regras originais valem em todo caso: G1 (sem rolagem horizontal, Layout), G11 (alvos e contraste,
// Components e Colors), G12 (movimento reduzido), FONTES (só Literata e Outfit, e nenhuma monospace na frente,
// Typography), CAIXA (nada em caixa alta, Typography), SOMBRA (sombra, gradiente e filtro só pelos tokens,
// Elevation & Depth) e 3D (sem perspective, preserve-3d nem rotação em X ou Y, Do's and Don'ts).
//
// As regras da casa acesa (DS-1a) valem nas páginas públicas e na /sistema: FAIXA (faixas de ponta a ponta nos
// quatro chãos, Colors e Layout), PRODUTO (a moldura do aparelho, Components), RODAPE (RodapeMapa, Components),
// EXIBICAO (a face de exibição nos títulos, Typography), ITALICO (nenhum itálico, Typography), TITULO e
// TITULO_REGISTRO (um título, uma cor), SOBRETITULO (nenhum rótulo sobre o título, Do's and Don'ts), DOCK (nenhuma
// barra colada na base, Do's and Don'ts), CABECALHO (a pílula Criar conta, Components), BOTAO_LARGO (Components),
// CENA (a placa de estúdio, Components), CASA_LIMPA e CASA_LIMPA_REGISTRO (sem sombra, gradiente, painel nem mel de
// chão, Elevation & Depth e Do's and Don'ts) e CASA_PRESENTE (a /sistema tem um [data-casa]). Só TITULO_REGISTRO e
// CASA_LIMPA_REGISTRO apenas registram: medem o main das páginas públicas que ainda não são casa.
//
// A parte pura recebe um JSON de nós e devolve { regra, ok, motivo, nos_com_falha }. Ela falha
// fechado: nó sem texto onde a regra pede texto, sem estilo, medida ausente, NaN ou valor ilegível
// reprovam, em vez de passar por falta de dado.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import zlib from 'node:zlib'

// ---------------------------------------------------------------------------------------------
// Parte pura

/** As siglas que podem aparecer em caixa alta (lista fechada). */
export const SIGLAS_PERMITIDAS = ['RN', 'SBP', 'LGPD', 'OMS', 'SAMU', 'JSON']

/**
 * As famílias do site: Literata e Outfit, e, só na variante B do `h1` (FG-2b, REP-HOME), M PLUS Rounded 1c. O nome da
 * família variável, "Literata Variable", conta como Literata. A regra FONTES aceita as três e reprova qualquer outra;
 * qual delas a página usa é a variante que o token escolhe (A e C: Literata e Outfit; B: M PLUS Rounded 1c e Outfit).
 */
export const FAMILIAS_PERMITIDAS = ['Literata', 'Outfit', 'M PLUS Rounded 1c']

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

/** As sete regras de sempre, na ordem em que saem. */
export const REGRAS_ORIGINAIS = ['G1', 'G11', 'G12', 'FONTES', 'CAIXA', 'SOMBRA', '3D']

/** Todas as regras, na ordem do spec: as sete originais e as quinze da casa acesa. */
export const REGRAS = [
  ...REGRAS_ORIGINAIS,
  'FAIXA',
  'PRODUTO',
  'RODAPE',
  'EXIBICAO',
  'ITALICO',
  'TITULO',
  'TITULO_REGISTRO',
  'SOBRETITULO',
  'DOCK',
  'CABECALHO',
  'BOTAO_LARGO',
  'CENA',
  'CASA_LIMPA',
  'CASA_LIMPA_REGISTRO',
  'CASA_PRESENTE',
]

/** As quinze rotas públicas (os casos de .oc/cdp.mjs). */
export const CASOS_PUBLICOS = [
  'inicio',
  'comofunciona',
  'cuidado',
  'desenvolvimento',
  'privacidade',
  'termos',
  'regras',
  'exclusao',
  'sobre',
  'contato',
  'entrar',
  'criar_conta',
  'recuperar_acesso',
  'convite',
  'naoencontrada',
]

/**
 * As oito regras do Início reconstruído (REP-HOME), na ordem em que saem, depois das 22 de sempre. Só os casos do
 * Início as rodam, e todas bloqueiam.
 */
export const REGRAS_INICIO = ['HEROI', 'LEGENDA_PRESA', 'MOLDURA_DOBRA', 'NOITE', 'COSTURA', 'TEMPO', 'TROCA_RM', 'CAPTURA_REAL']

/** O Início e as suas duas variantes de face de exibição (`?exibicao=b|c`, FG-2b). */
const CASOS_INICIO = ['inicio', 'inicio_b', 'inicio_c']

/** Os casos que têm de trazer um [data-casa] no main (a /sistema, a vitrine das peças, e o Início). */
export const CASOS_CASA = ['sistema', ...CASOS_INICIO]

/** As duas regras que só registram: nunca bloqueiam. */
const REGRAS_DE_REGISTRO = ['TITULO_REGISTRO', 'CASA_LIMPA_REGISTRO']

/**
 * As contas fictícias da demonstração, que só existem na memória da página (modo memória, sem
 * Supabase): as de `PESSOAS_DEMONSTRACAO.responsavel` e `.moderador` e a `SENHA_DEMONSTRACAO` de
 * web/src/dados/conta.demonstracao.ts (o teste confere que são as mesmas). Nenhuma é conta real.
 */
export const CONTAS_DE_MEDICAO = {
  responsavel: { email: 'juliana@exemplo.invalid' },
  moderador: { email: 'diego.moderador@exemplo.invalid' },
}
export const SENHA_DE_MEDICAO = 'senha-local-ficticia'
const ehContaDeMedicao = (conta) => typeof conta === 'string' && Object.hasOwn(CONTAS_DE_MEDICAO, conta)

// Os casos com rota fixa; os outros vêm de CASOS de .oc/cdp.mjs.
export const CASOS_FIXOS = {
  sistema: 'sistema',
  inicio: '',
  inicio_b: '?exibicao=b',
  inicio_c: '?exibicao=c',
  hoje: 'app/hoje',
  sessao: 'app/hoje',
}
const TEMAS = ['claro', 'madrugada']

/** A rota de um caso: a fixa, ou a de `casosCdp[caso].rota`; nulo se não houver (caso desconhecido). */
export function rotaDoCaso(caso, casosCdp) {
  if (typeof caso !== 'string' || caso === '') return null
  if (Object.hasOwn(CASOS_FIXOS, caso)) return CASOS_FIXOS[caso]
  if (!casosCdp || typeof casosCdp !== 'object' || !Object.hasOwn(casosCdp, caso)) return null
  const rota = casosCdp[caso]?.rota
  return typeof rota === 'string' ? rota.replace(/^\/+/, '') : null
}

/**
 * As rotas dos pedidos, com a conta que entra (`conta`: a do caso em CASOS, senão a padrão da rota;
 * nula na rota pública) e o `caminho` final do caso, quando CASOS o define. Lança Error (erro de uso)
 * se algum caso não tem rota, se a `conta` do caso não é `responsavel` nem `moderador` ou se o
 * `caminho` não é texto: nunca passa em silêncio.
 */
export function rotasDosPedidos(pedidos, casosCdp) {
  return pedidos.map((pedido) => {
    const rota = rotaDoCaso(pedido.caso, casosCdp)
    if (rota === null) {
      throw new Error(`caso sem rota: ${pedido.caso} (não é ${Object.keys(CASOS_FIXOS).join(', ')} nem está em CASOS de .oc/cdp.mjs)`)
    }
    // Os casos fixos não leem CASOS (como a rota deles).
    const entrada = Object.hasOwn(CASOS_FIXOS, pedido.caso) ? {} : (casosCdp[pedido.caso] ?? {})
    if (Object.hasOwn(entrada, 'conta') && !ehContaDeMedicao(entrada.conta)) {
      throw new Error(`conta inválida no caso ${pedido.caso}: ${JSON.stringify(entrada.conta)} (use ${Object.keys(CONTAS_DE_MEDICAO).join(' ou ')})`)
    }
    if (Object.hasOwn(entrada, 'caminho') && typeof entrada.caminho !== 'string') {
      throw new Error(`caminho inválido no caso ${pedido.caso}: ${JSON.stringify(entrada.caminho)} (o caminho final é um texto, como a rota)`)
    }
    const conta = Object.hasOwn(entrada, 'conta') ? entrada.conta : contaPadrao(rota)
    return { ...pedido, rota, conta, ...(Object.hasOwn(entrada, 'caminho') ? { caminho: entrada.caminho } : {}) }
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

function resultado(regra, falhasBrutas, motivoOk, motivoFalha) {
  // As falhas com `ref` (as regras da casa acesa) se juntam por nó: um nó que falha em dois pontos é um só nó com falha.
  const porNo = new Map()
  const falhas = []
  for (const f of falhasBrutas) {
    const antes = f.ref === undefined ? undefined : porNo.get(f.ref)
    if (antes) {
      antes.motivo = `${antes.motivo}; ${f.detalhe}`
      continue
    }
    const falha = f.ref === undefined ? f : { no: f.no, motivo: f.motivo }
    if (f.ref !== undefined) porNo.set(f.ref, falha)
    falhas.push(falha)
  }
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
  if (alvos.length === 0) return { ...falhaFechada('G11', 'nenhum alvo de toque'), alvos_por_rotulo: [] }
  if (textos.length === 0) return { ...falhaFechada('G11', 'nenhum nó com texto'), alvos_por_rotulo: [] }
  const falhas = []
  // Os radios e checkboxes medidos pela caixa do rótulo: o resultado os mostra, para a conferência.
  const alvosPorRotulo = []
  for (const no of alvos) {
    const alturaMinima = tema === 'madrugada' || marca(no, 'barraRegistrar') ? 56 : 44
    // Radio e checkbox: o alvo de toque é o rótulo (WCAG 2.5.8), não o controle nu de 13 × 13.
    // Sem rótulo medido, o próprio input é o alvo.
    const pelaCaixa = (no.tipo === 'radio' || no.tipo === 'checkbox') && no.rotulo?.rect
    const { w, h } = (pelaCaixa ? no.rotulo.rect : no.rect) ?? {}
    const nome = pelaCaixa ? `label de ${no.tag ?? 'input'} ${no.tipo}` : descrever(no)
    if (pelaCaixa) alvosPorRotulo.push({ no: descrever(no), w, h })
    if (!(w > 0) || !(h > 0)) falhas.push({ no: descrever(no), motivo: `${nome}: alvo sem tamanho` })
    else if (w < 43.5 || h < alturaMinima - 0.5) {
      falhas.push({ no: descrever(no), motivo: `${nome}: alvo de ${w.toFixed(1)} × ${h.toFixed(1)} (mínimo 44 × ${alturaMinima})` })
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
  // O fragmento (e só ele) é novo: a decisão e o resto do motivo não mudam. Sem radio ou checkbox
  // medido pelo rótulo, o motivo fica exatamente como era.
  let fragmento = ''
  if (alvosPorRotulo.length > 0) {
    const area = (a) => (Number.isFinite(a.w) && Number.isFinite(a.h) ? a.w * a.h : 0)
    const menorCaixa = alvosPorRotulo.reduce((menorAteAqui, a) => (area(a) < area(menorAteAqui) ? a : menorAteAqui))
    const uma = (v) => (Number.isFinite(v) ? v.toFixed(1) : '?')
    fragmento = `; ${alvosPorRotulo.length} radio/checkbox medidos pelo rótulo (${uma(menorCaixa.w)} × ${uma(menorCaixa.h)})`
  }
  const medido = resultado('G11', falhas, `${alvos.length} alvos ≥ 44 px; menor contraste ${menor.toFixed(2)}:1`)
  return { ...medido, motivo: `${medido.motivo}${fragmento}`, alvos_por_rotulo: alvosPorRotulo }
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
    // DS1:RF-07: uma pilha que COMEÇA em monospace ou ui-monospace desenha em monoespaçada; como reserva
    // depois do Outfit ou da Literata ela segue valendo.
    if (/^(?:monospace|ui-monospace)$/i.test(familias[0] ?? '')) {
      foraDoSet.set(familias[0].toLowerCase(), familias[0])
      fora.push(familias[0])
    }
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

// ---------------------------------------------------------------------------------------------
// As regras da casa acesa (DS-1a). Cada uma é pura sobre `(nos, doc)`, devolve { regra, ok, motivo,
// nos_com_falha } e falha fechado: leitura ausente, NaN ou ilegível reprova. Sem elemento no escopo a
// regra passa com o motivo "nenhum elemento" (a menos que o escopo seja obrigatório).

const nenhumElemento = (regra) => ({ regra, ok: true, motivo: 'nenhum elemento', nos_com_falha: [] })

/** Os chãos e a luz do DESIGN.md (Colors): papel, cacau, areia, chao-noite; mel e mel-claro não são chão. */
const COR = {
  papel: [248, 246, 235],
  cacau: [43, 35, 32],
  areia: [234, 221, 197],
  chaoNoite: [110, 101, 96],
  mel: [242, 193, 78],
  melClaro: [247, 214, 132],
}
const CHAOS = [COR.papel, COR.cacau, COR.areia, COR.chaoNoite]

/** A cor calculada `texto` é opaca e igual a `[r, g, b]`, com a folga de arredondamento do navegador. */
function ehCor(texto, [r, g, b], folga = 1) {
  const cor = parseCor(texto)
  return cor !== null && cor.a >= 0.999 && Math.abs(cor.r - r) <= folga && Math.abs(cor.g - g) <= folga && Math.abs(cor.b - b) <= folga
}
const ehChao = (texto) => CHAOS.some((chao) => ehCor(texto, chao))

const retanguloDe = (no) => {
  const r = no.rect
  return r && ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(r[k])) ? r : null
}
const leitura = (valor) => (valor === undefined || valor === null ? '' : String(valor).trim())
const ehTitulo = (no) => /^h[1-6]$/.test(no.tag ?? '')
const falharNo = (falhas, no, motivo) => falhas.push({ no: descrever(no), motivo: `${descrever(no)}: ${motivo}`, ref: no, detalhe: motivo })
const falharDoc = (falhas, motivo) => falhas.push({ no: 'documento', motivo })

/** Todos os raios (um a quatro valores) são 0 px; ausente ou ilegível reprova. */
function raioZero(valor) {
  if (!lido(valor)) return false
  return valor.trim().split(/[\s/]+/).every((parte) => px(parte) <= 0)
}

/** FAIXA: toda `[data-faixa]` toca as duas bordas, tem raio 0, padding vertical do token de seção e um dos quatro chãos. */
export function faixa(nos, doc) {
  const faixas = nos.filter((no) => marca(no, 'faixa'))
  const lados = nos.filter((no) => marca(no, 'faixaLado'))
  if (faixas.length === 0 && lados.length === 0) return nenhumElemento('FAIXA')
  const falhas = []
  const largura = doc?.clientWidth
  const espaco = px(doc?.tokens?.espacoSecao)
  for (const no of faixas) {
    const r = retanguloDe(no)
    if (!r) falharNo(falhas, no, 'sem retângulo')
    else if (!Number.isFinite(largura)) falharNo(falhas, no, 'clientWidth da janela ausente')
    else {
      if (r.x > 1) falharNo(falhas, no, `começa em x=${r.x.toFixed(1)}: não toca a borda esquerda`)
      if (r.x + r.w < largura - 1) falharNo(falhas, no, `termina em x=${(r.x + r.w).toFixed(1)}: não toca a borda direita (${largura})`)
    }
    if (!raioZero(no.estilo?.borderRadius)) falharNo(falhas, no, `raio ${leitura(no.estilo?.borderRadius) || 'ausente'} (a faixa é reta)`)
    for (const [lado, nome] of [['paddingTop', 'padding-top'], ['paddingBottom', 'padding-bottom']]) {
      const p = px(no.estilo?.[lado])
      if (!Number.isFinite(espaco)) falharNo(falhas, no, 'token --espaco-secao não lido na raiz')
      else if (!Number.isFinite(p)) falharNo(falhas, no, `${nome} ausente ou ilegível`)
      else if (Math.abs(p - espaco) > 1) falharNo(falhas, no, `${nome} ${p}px (o token de seção é ${espaco}px)`)
    }
    if (!ehChao(no.estilo?.backgroundColor)) falharNo(falhas, no, `fundo ${leitura(no.estilo?.backgroundColor) || 'ausente'} fora dos quatro chãos`)
  }
  for (const no of lados) {
    if (!ehChao(no.estilo?.backgroundColor)) falharNo(falhas, no, `lado da faixa com fundo ${leitura(no.estilo?.backgroundColor) || 'ausente'} fora dos quatro chãos`)
  }
  return resultado('FAIXA', falhas, `${faixas.length} faixas de ponta a ponta, ${lados.length} lados, só nos quatro chãos`)
}

/** PRODUTO: no máximo 2 molduras, cada uma com tela única e moldura, sem sombra, filtro nem gradiente. */
export function produto(nos, doc) {
  const figuras = nos.filter((no) => marca(no, 'produto'))
  const telas = nos.filter((no) => marca(no, 'produtoTela'))
  const molduras = nos.filter((no) => marca(no, 'produtoMoldura'))
  if (figuras.length === 0 && telas.length === 0 && molduras.length === 0) return nenhumElemento('PRODUTO')
  const falhas = []
  if (figuras.length > 2) falharDoc(falhas, `${figuras.length} molduras de produto (o máximo é 2)`)
  if (telas.length !== figuras.length) falharDoc(falhas, `${figuras.length} molduras e ${telas.length} telas (uma tela por moldura)`)
  if (molduras.length < figuras.length) falharDoc(falhas, `${figuras.length} molduras e ${molduras.length} artes de moldura`)
  const minimo = doc?.largura >= 1440 ? 320 : 280
  for (const no of [...figuras, ...telas, ...molduras]) {
    const e = no.estilo
    if (!retanguloDe(no)) falharNo(falhas, no, 'sem retângulo')
    if (!e || !lido(e.boxShadow)) falharNo(falhas, no, 'box-shadow ausente')
    else if (sombraCanonica(e.boxShadow) !== 'none') falharNo(falhas, no, `box-shadow ${e.boxShadow} (a moldura não tem sombra)`)
    if (!e || !lido(e.filter)) falharNo(falhas, no, 'filter ausente')
    else if (e.filter.trim() !== 'none') falharNo(falhas, no, `filter ${e.filter}`)
    if (!e || !lido(e.backgroundImage)) falharNo(falhas, no, 'background-image ausente')
    else if (/gradient\(/i.test(e.backgroundImage)) falharNo(falhas, no, 'gradiente na moldura')
  }
  const vistas = new Set()
  for (const no of telas) {
    const r = retanguloDe(no)
    if (r && r.w < minimo) falharNo(falhas, no, `tela de ${r.w.toFixed(1)} px (o mínimo é ${minimo})`)
    if (!lido(no.currentSrc)) falharNo(falhas, no, 'currentSrc ausente (a imagem não carregou)')
    else if (vistas.has(no.currentSrc)) falharNo(falhas, no, `a mesma tela (currentSrc ${no.currentSrc}) em duas molduras`)
    else vistas.add(no.currentSrc)
  }
  return resultado('PRODUTO', falhas, `${figuras.length} molduras, ${telas.length} telas únicas, sem sombra, filtro nem gradiente`)
}

/** RODAPE: o RodapeMapa de cacau, largura cheia, 13 links, 4 grupos, ©, altura máxima e um só aviso, dentro dele. */
export function rodape(nos, doc) {
  const raiz = nos.find((no) => marca(no, 'rodape'))
  if (!raiz) return falhaFechada('RODAPE', 'nenhum rodapé (footer[data-rodape])')
  const falhas = []
  const r = retanguloDe(raiz)
  if (!r) falharNo(falhas, raiz, 'sem retângulo')
  else if (!Number.isFinite(doc?.largura)) falharDoc(falhas, 'largura da janela ausente')
  else {
    if (r.w < 0.95 * doc.largura) falharNo(falhas, raiz, `rodapé de ${r.w.toFixed(1)} px numa janela de ${doc.largura} (largura cheia)`)
    const teto = doc.largura >= 1440 ? 400 : 420
    if (r.h > teto) falharNo(falhas, raiz, `rodapé de ${r.h.toFixed(1)} px de altura (o teto é ${teto})`)
  }
  if (!ehCor(raiz.estilo?.backgroundColor, COR.cacau, 2)) falharNo(falhas, raiz, `fundo ${leitura(raiz.estilo?.backgroundColor) || 'ausente'} (o rodapé é de cacau)`)
  if (typeof raiz.textoTodo !== 'string') falharNo(falhas, raiz, 'texto do rodapé não lido')
  else if (!raiz.textoTodo.includes('©')) falharNo(falhas, raiz, 'sem a linha do ©')
  const links = nos.filter((no) => marca(no, 'link') && marca(no, 'noRodape')).length
  if (links < 12) falharDoc(falhas, `${links} links no rodapé (o piso é 12)`)
  const grupos = nos.filter((no) => marca(no, 'rodapeGrupo')).length
  if (grupos < 4) falharDoc(falhas, `${grupos} grupos no rodapé (o piso é 4)`)
  const avisos = nos.filter((no) => marca(no, 'aviso'))
  if (avisos.length !== 1) falharDoc(falhas, `${avisos.length} avisos [data-aviso] no documento (tem de ser um só)`)
  else if (!marca(avisos[0], 'noRodape')) falharNo(falhas, avisos[0], 'o aviso está fora do rodapé')
  return resultado('RODAPE', falhas, `rodapé de cacau, ${links} links, ${grupos} grupos, © e um aviso dentro dele`)
}

/** EXIBICAO: h1 a h4 do cabeçalho e do main, e o nome do rodapé, computam a 1ª família de --fonte-exibicao. */
export function exibicao(nos, doc) {
  const esperada = primeiraFamilia(doc?.tokens?.fonteExibicao)
  if (!esperada) return falhaFechada('EXIBICAO', '--fonte-exibicao não lida na raiz')
  const escopo = nos.filter(
    (no) =>
      visivel(no) &&
      !marca(no, 'rodapeTitulo') &&
      ((/^h[1-4]$/.test(no.tag ?? '') && (marca(no, 'noCabecalho') || marca(no, 'noMain'))) || marca(no, 'rodapeNome')),
  )
  if (escopo.length === 0) return falhaFechada('EXIBICAO', 'nenhum título nem nome do rodapé medido')
  const falhas = []
  for (const no of escopo) {
    const familia = primeiraFamilia(no.estilo?.fontFamily)
    if (!familia) falharNo(falhas, no, 'font-family ausente')
    else if (familia.toLowerCase() !== esperada.toLowerCase()) falharNo(falhas, no, `família ${familia} (a de exibição é ${esperada})`)
  }
  return resultado('EXIBICAO', falhas, `${escopo.length} títulos e nomes na família de exibição (${esperada})`)
}

/** ITALICO: nenhum nó do cabeçalho, do main, do rodapé e da casa em itálico ou oblíquo. */
export function italico(nos) {
  const escopo = nos.filter((no) => marca(no, 'noCabecalho') || marca(no, 'noMain') || marca(no, 'noRodape') || marca(no, 'casa'))
  if (escopo.length === 0) return nenhumElemento('ITALICO')
  const falhas = []
  for (const no of escopo) {
    const estilo = leitura(no.estilo?.fontStyle)
    if (estilo === '') falharNo(falhas, no, 'font-style ausente')
    else if (estilo !== 'normal') falharNo(falhas, no, `font-style ${estilo} (nenhum itálico nas páginas públicas)`)
  }
  return resultado('ITALICO', falhas, `${escopo.length} nós em prumo`)
}

/** Um título, uma cor: os nós de texto de um mesmo h1/h2 dividem cor, estilo e peso. */
function titulosUniformes(regra, nos, noEscopo) {
  const escopo = nos.filter((no) => noEscopo(no) && temTexto(no))
  if (escopo.length === 0) return nenhumElemento(regra)
  const falhas = []
  const grupos = new Map()
  for (const no of escopo) {
    const e = no.estilo ?? {}
    const lidos = { cor: leitura(e.color), estilo: leitura(e.fontStyle), peso: leitura(e.fontWeight) }
    const faltando = Object.entries(lidos).filter(([, valor]) => valor === '').map(([nome]) => nome)
    if (faltando.length > 0) {
      falharNo(falhas, no, `${faltando.join(', ')} ausente`)
      continue
    }
    if (no.tituloId === undefined || no.tituloId === null) {
      falharNo(falhas, no, 'título sem identificador')
      continue
    }
    // O h1 do Início é uma frase em dois spans, uma tinta por chão (a da parede do dia e a da parede da noite, REP-HOME):
    // cada span é um grupo, e dentro de cada um a cor, o estilo e o peso continuam únicos.
    const chaveDoGrupo = marca(no, 'h1Span1') ? `${no.tituloId}#1` : marca(no, 'h1Span2') ? `${no.tituloId}#2` : no.tituloId
    const grupo = grupos.get(chaveDoGrupo)
    if (!grupo) {
      grupos.set(chaveDoGrupo, { primeiro: lidos, nos: [no] })
      continue
    }
    grupo.nos.push(no)
    const diferentes = Object.keys(lidos).filter((chave) => lidos[chave] !== grupo.primeiro[chave])
    if (diferentes.length > 0) falharNo(falhas, no, `${diferentes.join(', ')} diferente do resto do título`)
  }
  return resultado(regra, falhas, `${grupos.size} títulos, cada um com uma cor, um estilo e um peso`)
}

/** TITULO: o título da casa tem uma cor, um estilo e um peso só. */
export function titulo(nos) {
  return titulosUniformes('TITULO', nos, (no) => marca(no, 'titulo') && marca(no, 'casa'))
}

/** TITULO_REGISTRO: o mesmo teste no main das páginas públicas fora da casa (só registra). */
export function tituloRegistro(nos) {
  return titulosUniformes('TITULO_REGISTRO', nos, (no) => marca(no, 'titulo') && marca(no, 'noMain') && !marca(no, 'casa'))
}

/**
 * SOBRETITULO: nenhum rótulo sobre o título (por classe, ou pela forma de um rótulo). O escopo é o main e a casa nas
 * páginas públicas (P, C); na /sistema (`caso` de CASOS_CASA) é só a casa: a amostra de tipo da /sistema mostra o
 * `sobretitulo` fora dela de propósito (spec §5.2, premissa P-4).
 */
export function sobretitulo(nos, _doc, caso) {
  // Só a /sistema olha só a casa: o Início (também uma casa, REP-HOME) mantém o escopo do main inteiro das páginas públicas.
  const soCasa = caso === 'sistema'
  const escopo = nos.filter(
    (no) => (soCasa ? marca(no, 'casa') : marca(no, 'noMain') || marca(no, 'casa')) && !marca(no, 'noRodape'),
  )
  if (escopo.length === 0) return nenhumElemento('SOBRETITULO')
  const falhas = []
  for (const no of escopo) {
    if ((no.classes ?? []).some((classe) => String(classe).includes('sobretitulo'))) {
      falharNo(falhas, no, 'classe sobretitulo (nenhum rótulo acima do título)')
      continue
    }
    if (ehTitulo(no) || !marca(no, 'antesDeTitulo') || !temTexto(no) || no.texto.trim().length > 40) continue
    const tamanho = px(no.estilo?.fontSize)
    const peso = numeroDe(no.estilo?.fontWeight)
    if (Number.isNaN(tamanho)) falharNo(falhas, no, 'font-size ausente ou ilegível')
    else if (!Number.isFinite(peso)) falharNo(falhas, no, `font-weight ilegível (${leitura(no.estilo?.fontWeight)})`)
    else if (peso >= 600 && tamanho <= 16) falharNo(falhas, no, `rótulo de ${tamanho}px e peso ${peso} colado num título`)
  }
  return resultado('SOBRETITULO', falhas, `${escopo.length} nós sem rótulo sobre o título`)
}

/** DOCK: nenhuma barra fixa (ou sticky com bottom) colada na base da janela. */
export function dock(nos, doc) {
  if (!ehNumero(doc?.altura)) return falhaFechada('DOCK', 'altura da janela ausente')
  const falhas = []
  for (const no of nos) {
    const posicao = leitura(no.estilo?.position)
    if (posicao === '') {
      falharNo(falhas, no, 'position ausente')
      continue
    }
    if (!visivel(no)) continue
    let candidato = posicao === 'fixed'
    if (posicao === 'sticky') {
      const base = leitura(no.estilo?.bottom)
      if (base === '') {
        falharNo(falhas, no, 'bottom ausente num nó sticky')
        continue
      }
      candidato = base !== 'auto'
    }
    if (!candidato) continue
    const r = retanguloDe(no)
    if (!r) {
      falharNo(falhas, no, 'sem retângulo')
      continue
    }
    if (Math.abs(r.y + r.h - doc.altura) <= 1 && r.y > doc.altura / 2) {
      falharNo(falhas, no, `barra ${posicao} colada na base da janela (termina em ${(r.y + r.h).toFixed(1)} de ${doc.altura})`)
    }
  }
  return resultado('DOCK', falhas, `${nos.length} nós, nenhuma barra colada na base da janela`)
}

/** BOTAO_LARGO: em 390, a pílula tem de 323 a 357 px de largura e 44 de altura. */
export function botaoLargo(nos, doc) {
  const botoes = nos.filter((no) => marca(no, 'botaoLargo'))
  if (botoes.length === 0) return nenhumElemento('BOTAO_LARGO')
  if (Math.round(doc?.largura) !== 390) return { regra: 'BOTAO_LARGO', ok: true, motivo: 'a largura do botão só é medida em 390', nos_com_falha: [] }
  const falhas = []
  for (const no of botoes) {
    const r = retanguloDe(no)
    if (!r) falharNo(falhas, no, 'sem retângulo')
    else if (!(r.w >= 323 && r.w <= 357)) falharNo(falhas, no, `${r.w.toFixed(1)} px de largura (de 323 a 357 em 390)`)
    else if (!(r.h >= 44)) falharNo(falhas, no, `${r.h.toFixed(1)} px de altura (o mínimo é 44)`)
  }
  return resultado('BOTAO_LARGO', falhas, `${botoes.length} botões de 323 a 357 px e 44 px de altura em 390`)
}

/** CABECALHO: a pílula "Criar conta" na linha do cabeçalho (fora do menu), visível, 44 px (48 de 1100), em cacau. */
export function cabecalho(nos, doc) {
  const pilulas = nos.filter((no) => marca(no, 'cabecalhoPilula') && !marca(no, 'noMenu'))
  if (pilulas.length === 0) return falhaFechada('CABECALHO', 'nenhuma pílula [data-cabecalho-pilula] na linha do cabeçalho')
  const minimo = doc?.largura >= 1100 ? 48 : 44
  const falhas = []
  for (const no of pilulas) {
    if (!visivel(no)) falharNo(falhas, no, 'pílula oculta')
    if (!marca(no, 'noCabecalho')) falharNo(falhas, no, 'pílula fora do cabeçalho')
    const r = retanguloDe(no)
    if (!r) falharNo(falhas, no, 'sem retângulo')
    else if (r.h < minimo) falharNo(falhas, no, `pílula de ${r.h.toFixed(1)} px de altura (o mínimo é ${minimo})`)
    const fundo = no.estilo?.backgroundColor
    // De noite (o cabeçalho de cacau) a pílula é de contorno: fundo transparente e texto de papel.
    const deNoite = no.tom === 'noite' && parseCor(fundo)?.a === 0 && ehCor(no.estilo?.color, COR.papel)
    if (parseCor(fundo) === null) falharNo(falhas, no, `fundo ${leitura(fundo) || 'ausente'} ilegível`)
    else if (!deNoite && !ehCor(fundo, COR.cacau, 2)) falharNo(falhas, no, `fundo ${leitura(fundo)} (a pílula é de cacau)`)
  }
  return resultado('CABECALHO', falhas, `${pilulas.length} pílula de cacau, visível, de ${minimo} px ou mais`)
}

/** CENA: a placa de estúdio tem densidade ≥ 1,50; em 1440 mede de 836 a 1115 px e até `data-largura-max`. */
export function cena(nos, doc) {
  const placas = nos.filter((no) => marca(no, 'cenaPlaca'))
  if (placas.length === 0) return nenhumElemento('CENA')
  const falhas = []
  for (const no of placas) {
    const r = retanguloDe(no)
    if (!r) {
      falharNo(falhas, no, 'sem retângulo')
      continue
    }
    if (!(no.naturalWidth > 0)) {
      falharNo(falhas, no, 'a imagem não carregou (naturalWidth ausente)')
      continue
    }
    const densidade = r.w > 0 ? Math.round((no.naturalWidth / r.w) * 100) / 100 : Number.NaN
    if (!(densidade >= 1.5)) falharNo(falhas, no, `densidade ${Number.isFinite(densidade) ? densidade.toFixed(2) : '?'} (o mínimo é 1,50)`)
    if (doc?.largura >= 1440) {
      if (!Number.isFinite(no.larguraMax)) falharNo(falhas, no, 'data-largura-max ausente')
      else if (r.w > no.larguraMax + 0.5) falharNo(falhas, no, `placa de ${r.w.toFixed(1)} px acima do máximo declarado (${no.larguraMax})`)
      if (r.w < 836 - 0.5 || r.w > 1115 + 0.5) falharNo(falhas, no, `placa de ${r.w.toFixed(1)} px fora de 836 a 1115 em 1440`)
    }
  }
  return resultado('CENA', falhas, `${placas.length} placas com densidade ≥ 1,50 e largura dentro da faixa`)
}

const HORA_SOLTA = /^\d{1,2}:\d{2}$/

/** O que a casa não pode ter: sombra, gradiente, opacidade, painel, peça viva, hora solta e mel de chão. */
function casaLimpaDe(regra, nos, noEscopo) {
  const escopo = nos.filter(noEscopo)
  if (escopo.length === 0) return nenhumElemento(regra)
  const falhas = []
  for (const no of escopo) {
    // O menu do celular fechado (hidden) está fora da tela: não é parede da casa.
    if (marca(no, 'noMenu') && no.visivel === false) continue
    const e = no.estilo ?? {}
    if (!lido(e.boxShadow)) falharNo(falhas, no, 'box-shadow ausente')
    else if (sombraCanonica(e.boxShadow) !== 'none') falharNo(falhas, no, `box-shadow ${e.boxShadow}`)
    if (!lido(e.textShadow)) falharNo(falhas, no, 'text-shadow ausente')
    else if (e.textShadow.trim() !== 'none') falharNo(falhas, no, `text-shadow ${e.textShadow}`)
    if (!lido(e.backgroundImage)) falharNo(falhas, no, 'background-image ausente')
    else if (/gradient\(/i.test(e.backgroundImage)) falharNo(falhas, no, 'gradiente de fundo')
    const opacidade = numeroDe(e.opacity)
    if (!Number.isFinite(opacidade)) falharNo(falhas, no, `opacity ilegível (${leitura(e.opacity)})`)
    else if (opacidade !== 1) falharNo(falhas, no, `opacity ${opacidade}`)
    if (!lido(e.visibility)) falharNo(falhas, no, 'visibility ausente')
    else if (e.visibility.trim() !== 'visible') falharNo(falhas, no, `visibility ${e.visibility.trim()}`)
    if (marca(no, 'painel')) falharNo(falhas, no, 'painel (a casa não tem painel)')
    if (marca(no, 'vivo') && !marca(no, 'noProduto')) falharNo(falhas, no, 'peça viva fora da moldura do produto')
    if (marca(no, 'folha') && !marca(no, 'noProduto') && HORA_SOLTA.test(leitura(no.texto))) falharNo(falhas, no, 'hora solta fora da moldura do produto')
    const fundo = parseCor(e.backgroundColor)
    if (fundo === null) falharNo(falhas, no, `fundo ${leitura(e.backgroundColor) || 'ausente'} ilegível`)
    else if (ehCor(e.backgroundColor, COR.mel) || ehCor(e.backgroundColor, COR.melClaro)) {
      // O mel é luz: só a pílula primária, e só sobre o cacau.
      if (!marca(no, 'botaoMel')) falharNo(falhas, no, 'mel de chão (o mel só existe como pílula)')
      else if (!ehCor(no.fundoSob, COR.cacau, 2)) falharNo(falhas, no, `pílula de mel sobre ${leitura(no.fundoSob) || 'fundo não lido'} (só vale sobre o cacau)`)
    }
  }
  return resultado(regra, falhas, `${escopo.length} nós sem sombra, gradiente, opacidade, painel nem mel de chão`)
}

/** CASA_LIMPA: a casa, o cabeçalho e o rodapé. */
export function casaLimpa(nos) {
  return casaLimpaDe('CASA_LIMPA', nos, (no) => marca(no, 'casa') || marca(no, 'noCabecalho') || marca(no, 'noRodape'))
}

/** CASA_LIMPA_REGISTRO: o main das páginas públicas fora da casa (só registra). */
export function casaLimpaRegistro(nos) {
  return casaLimpaDe('CASA_LIMPA_REGISTRO', nos, (no) => marca(no, 'noMain') && !marca(no, 'casa'))
}

/** CASA_PRESENTE: a rota de casa tem um [data-casa] dentro do main. */
export function casaPresente(nos) {
  const achou = nos.some((no) => marca(no, 'casaRaiz') && marca(no, 'noMain'))
  return achou
    ? { regra: 'CASA_PRESENTE', ok: true, motivo: '[data-casa] dentro do main', nos_com_falha: [] }
    : falhaFechada('CASA_PRESENTE', 'nenhum [data-casa] dentro do main')
}

// ---------------------------------------------------------------------------------------------
// As regras do Início reconstruído (REP-HOME, "A casa acesa"). Mesmo contrato das de cima: puras sobre `(nos, doc)`,
// `{ regra, ok, motivo, nos_com_falha }`, falha fechado. O `motivo` de uma falha junta todas as falhas da regra. Uma
// largura que a regra não mede responde ok com o motivo "largura fora do escopo".

/** Os números da seção 5 do cartão: o que as regras e `avaliarMovimento` comparam. */
export const MEDIDAS_REP_HOME = {
  // Parcela mínima de noite nas duas primeiras telas, sem as linhas do cabeçalho no denominador.
  noite: { 1440: 0.3, 390: 0.3 },
  // A distância do fixo (M16), em px de rolagem, por largura. Abaixo de 1024 não há fixo (RECUT §7): 0.
  pino: { 1440: 600, 1280: 600, 1024: 480, 768: 0, 390: 0 },
  // A lâmpada (M15): cone, poça, atraso depois do `load` e defasagem entre as duas, em ms.
  luz: { cone_ms: 240, poca_ms: 320, atraso_ms: 300, defasagem_ms: 80 },
  // A troca da legenda (M17): saída, entrada, em ms, e o deslocamento em px.
  legenda: { saida_ms: 160, entrada_ms: 220, desloc_px: 6 },
  lcp_ms: 2500,
  bytes: { dobra_kb: 70, luz_kb_max: 12, pagina_kb: 185 },
  inp_ms: 200,
  // As parcelas de RECUT §9: o escuro médio mínimo e o creme máximo.
  escuro_medio: { 1440: 0.45, 390: 0.5 },
  creme_max: { 1440: 0.55, 390: 0.5 },
  // A cobertura da noite no palco em p 0, 0,25, 0,5, 0,75 e 1 (RECUT §7, 1440).
  cobertura1440: [0.614, 0.674, 0.754, 0.918, 1],
  // A borda da folha da noite em x (px) e o `translateX` da caixa de fora (%), nos mesmos cinco passos (RECUT §7, 1440):
  // retém na costura de 0 a 0,10, na linha de centro do quadro (354,9) de 0,45 a 0,55 e em 0 de 0,85 em diante.
  borda1440: [556.5, 470.1, 354.9, 118.3, 0],
  traducao1440: [38.65, 32.65, 24.65, 8.22, 0],
  // A janela da placa M05 em 390 (RECUT §4): L = 472 colunas de origem, escala s = 390 / (1672 - L).
  placa390: { L: 472, s: 0.325, w: 543.4, h: 305.8, x: -153.4, y: 364, seam: 142.3 },
}

/** A costura da placa M05 como fração da largura dela: a coluna 910 de 1672. */
const FRACAO_COSTURA = 910 / 1672
const costuraDaPlaca = (r) => r.x + FRACAO_COSTURA * r.w

const foraDoEscopo = (regra, doc) => ({ regra, ok: true, motivo: `largura fora do escopo (${doc?.largura})`, nos_com_falha: [] })

/** O resultado de uma regra do Início: o motivo da falha lista todas as falhas, não só a primeira. */
const resultadoInicio = (regra, falhas, motivoOk) =>
  resultado(regra, falhas, motivoOk, falhas.map((f) => f.motivo).join('; '))

const comRetangulo = (no) => retanguloDe(no) !== null
const emOrdem = (a, b) => (a.ordemDom ?? 0) - (b.ordemDom ?? 0)

/** O nome do chão ou da tinta, para a mensagem. */
function nomeDaCor(texto) {
  if (ehCor(texto, COR.cacau, 2)) return 'cacau'
  if (ehCor(texto, COR.papel, 2)) return 'papel'
  if (ehCor(texto, COR.areia, 2)) return 'areia'
  if (ehCor(texto, COR.chaoNoite, 2)) return 'texto-2'
  if (ehCor(texto, COR.mel, 2)) return 'mel'
  return String(texto)
}

const corDoFundo = (no) => (lido(no.fundoSob) ? parseCor(no.fundoSob) : fundoReal(no.cadeia))
const fundoDoNo = (no) => (lido(no.fundoSob) ? no.fundoSob : null)

/**
 * HEROI: em 1440 a placa M05 mede 900 e a costura dela cai na costura do h1 (±2), com a pílula de mel no herói; em 390
 * a janela da placa vai de borda a borda na caixa nominal de RECUT §4, as linhas 144 a 364 são uma parede de cacau de
 * ponta a ponta, a primeira ação fica até y 300 e o herói não tem pílula de mel (a ação cheia é a do cabeçalho).
 */
export function heroi(nos, doc) {
  const largura = doc?.largura
  if (largura !== 1440 && largura !== 390) return foraDoEscopo('HEROI', doc)
  const placa = nos.find((no) => marca(no, 'cenaPlaca'))
  if (!placa || !comRetangulo(placa)) return falhaFechada('HEROI', 'nenhuma placa de estúdio com retângulo')
  const r = placa.rect
  const falhas = []
  const botoes = nos.filter((no) => marca(no, 'heroiBotao'))
  if (largura === 1440) {
    if (Math.abs(r.w - 900) > 1) falharNo(falhas, placa, `placa de ${r.w.toFixed(1)} px de largura (em 1440 a placa mede 900)`)
    const span1 = nos.find((no) => marca(no, 'h1Span1'))
    const span2 = nos.find((no) => marca(no, 'h1Span2'))
    if (!span1 || !span2 || !comRetangulo(span1) || !comRetangulo(span2)) {
      falharDoc(falhas, 'o h1 não tem os dois spans medidos (h1Span1 e h1Span2)')
    } else {
      const doH1 = (span1.rect.x + span1.rect.w + span2.rect.x) / 2
      const daPlaca = costuraDaPlaca(r)
      if (Math.abs(daPlaca - doH1) > 2) {
        falharDoc(falhas, `costura da placa em x=${daPlaca.toFixed(1)} e a do h1 em x=${doH1.toFixed(1)} (a diferença tem de ser até 2)`)
      }
    }
    if (botoes.length === 0) falharDoc(falhas, 'pílula de mel do herói ausente (botão heroiBotao)')
  } else {
    const nominal = MEDIDAS_REP_HOME.placa390
    const direita = r.x + r.w
    if (Math.abs(direita - largura) > 1) falharNo(falhas, placa, `borda direita da placa em x=${direita.toFixed(1)}: a janela de ${largura} vai de borda a borda`)
    if (r.x > 0.5) falharNo(falhas, placa, `borda esquerda da placa em x=${r.x.toFixed(1)} (tem de ser 0 ou menos)`)
    if (Math.abs(r.w - nominal.w) > 3 || Math.abs(r.h - nominal.h) > 3) {
      falharNo(falhas, placa, `janela de recorte ${r.w.toFixed(1)} × ${r.h.toFixed(1)} (a de 390 mede ${nominal.w} × ${nominal.h}; altura e largura vêm do recorte)`)
    }
    if (Math.abs(r.y - nominal.y) > 2) falharNo(falhas, placa, `placa em y=${r.y.toFixed(1)} (a de 390 começa em ${nominal.y})`)
    const paredes = nos.filter(
      (no) =>
        marca(no, 'paredeNoite') &&
        comRetangulo(no) &&
        ehCor(no.estilo?.backgroundColor, COR.cacau, 2) &&
        no.rect.x <= 0.5 &&
        no.rect.x + no.rect.w >= largura - 0.5 &&
        no.rect.y <= 144.5 &&
        no.rect.y + no.rect.h >= 363.5,
    )
    if (paredes.length === 0) falharDoc(falhas, 'nenhuma parede de cacau de ponta a ponta cobre as linhas 144 a 364')
    const acoes = nos.filter((no) => (marca(no, 'heroiLink') || marca(no, 'heroiBotao')) && comRetangulo(no))
    if (acoes.length === 0) falharDoc(falhas, 'nenhuma ação (link do herói) medida')
    else {
      const primeira = Math.min(...acoes.map((no) => no.rect.y))
      if (primeira > 300) falharDoc(falhas, `primeira ação do herói em y=${primeira.toFixed(1)} (o teto é 300)`)
    }
    if (botoes.length > 0) falharNo(falhas, botoes[0], 'pílula de mel no herói em 390 (a ação cheia é a pílula do cabeçalho)')
  }
  return resultadoInicio('HEROI', falhas, `placa e herói conforme a RECUT em ${largura}`)
}

/** LEGENDA_PRESA: a legenda do herói está presa à placa (0 a 12 px abaixo dela) com a tinta do chão dela. */
export function legendaPresa(nos, doc) {
  const largura = doc?.largura
  if (largura !== 1440 && largura !== 390) return foraDoEscopo('LEGENDA_PRESA', doc)
  const placa = nos.find((no) => marca(no, 'cenaPlaca'))
  if (!placa || !comRetangulo(placa)) return falhaFechada('LEGENDA_PRESA', 'nenhuma placa de estúdio com retângulo')
  const legendas = nos.filter((no) => marca(no, 'legenda') && comRetangulo(no))
  const legenda = legendas.find((no) => marca(no, 'legendaHeroi')) ?? legendas.sort(emOrdem)[0]
  if (!legenda) return falhaFechada('LEGENDA_PRESA', 'nenhuma legenda do herói medida')
  const falhas = []
  const p = placa.rect
  const l = legenda.rect
  const distancia = l.y - (p.y + p.h)
  if (!(distancia >= -0.5 && distancia <= 12.5)) {
    falharNo(falhas, legenda, `legenda a ${distancia.toFixed(1)} px da base da placa (a distância certa é de 0 a 12)`)
  }
  const tinta = largura === 1440 ? COR.cacau : COR.papel
  if (!ehCor(legenda.estilo?.color, tinta, 2)) {
    falharNo(falhas, legenda, `tinta ${nomeDaCor(legenda.estilo?.color)} (em ${largura} a legenda é de ${largura === 1440 ? 'cacau sobre o chão do dia' : 'papel sobre o cacau'})`)
  }
  if (largura === 1440) {
    const costura = costuraDaPlaca(p)
    if (l.x + l.w > costura - 48 + 0.5) {
      falharNo(falhas, legenda, `legenda termina em x=${(l.x + l.w).toFixed(1)} (o limite é a costura ${costura.toFixed(1)} menos 48)`)
    }
  } else {
    if (!Number.isFinite(placa.ordemDom) || !Number.isFinite(legenda.ordemDom)) {
      falharNo(falhas, legenda, 'ordem no DOM da placa ou da legenda ausente')
    } else if (legenda.ordemDom < placa.ordemDom) {
      falharNo(falhas, legenda, 'a legenda vem antes da placa no DOM (ela é o próximo elemento depois da placa)')
    } else {
      const entre = nos.filter((no) => {
        if (!Number.isFinite(no.ordemDom) || no.ordemDom <= placa.ordemDom || no.ordemDom >= legenda.ordemDom) return false
        if (!visivel(no) || !comRetangulo(no) || marca(no, 'luz')) return false
        const e = no.rect
        if (e.w <= 0 || e.h <= 0) return false
        const dentroDaPlaca = e.x >= p.x - 1 && e.y >= p.y - 1 && e.x + e.w <= p.x + p.w + 1 && e.y + e.h <= p.y + p.h + 1
        const contemALegenda = e.x <= l.x + 1 && e.y <= l.y + 1 && e.x + e.w >= l.x + l.w - 1 && e.y + e.h >= l.y + l.h - 1
        return !dentroDaPlaca && !contemALegenda
      })
      if (entre.length > 0) falharNo(falhas, entre[0], 'elemento entre a placa e a legenda (a legenda é o próximo elemento depois da placa)')
    }
    const palco = nos.find((no) => marca(no, 'palco') && comRetangulo(no))
    if (!palco) falharDoc(falhas, 'nenhum palco medido (o palco começa 16 px abaixo da legenda)')
    else {
      const folga = palco.rect.y - (l.y + l.h)
      if (Math.abs(folga - 16) > 1) falharNo(falhas, palco, `palco a ${folga.toFixed(1)} px da legenda (o palco começa 16 px abaixo dela)`)
    }
    // Moment 3 is not built below 1024: no caption node swaps here, both captions are static (REPH-I-12).
    for (const no of nos.filter((n) => marca(n, 'trocaLegenda'))) falharNo(falhas, no, 'legenda de troca em 390 (o momento 3 só existe de 1024 em diante; abaixo as duas legendas são estáticas)')
  }
  return resultadoInicio('LEGENDA_PRESA', falhas, `legenda a ${distancia.toFixed(1)} px da placa, com a tinta do chão`)
}

/** Onde a rolagem p 0 do palco fica em relação ao topo dele: 771 de 795 em 1440 e 674 de 722 em 390 (RECUT §7, §3). */
const RECUO_DE_P0 = { 1440: 24, 390: 48 }

/** MOLDURA_DOBRA: na rolagem p 0 a moldura de verdade está inteira na janela, abaixo do cabeçalho. */
export function molduraDobra(nos, doc) {
  const largura = doc?.largura
  if (largura !== 1440 && largura !== 390) return foraDoEscopo('MOLDURA_DOBRA', doc)
  const palco = nos.find((no) => marca(no, 'palco') && comRetangulo(no))
  if (!palco) return falhaFechada('MOLDURA_DOBRA', 'nenhum palco medido')
  const moldura = nos.find((no) => marca(no, 'produto') && comRetangulo(no) && (!Number.isFinite(no.ordemDom) || !Number.isFinite(palco.ordemDom) || no.ordemDom > palco.ordemDom))
  if (!moldura) return falhaFechada('MOLDURA_DOBRA', 'nenhuma moldura medida no palco')
  if (!ehNumero(doc.cabecalhoAltura) || !ehNumero(doc.altura)) return falhaFechada('MOLDURA_DOBRA', 'altura do cabeçalho ou innerHeight ausente')
  const falhas = []
  const rolagem = palco.rect.y - RECUO_DE_P0[largura]
  if (rolagem > doc.altura) falharNo(falhas, palco, `rolagem de p 0 em ${rolagem.toFixed(1)} acima de innerHeight ${doc.altura} (a moldura tem de estar inteira antes de uma altura de janela)`)
  const topo = moldura.rect.y - rolagem
  if (topo < doc.cabecalhoAltura - 0.5) falharNo(falhas, moldura, `topo da moldura em ${topo.toFixed(1)} sob o cabeçalho de ${doc.cabecalhoAltura}`)
  const base = moldura.rect.y + moldura.rect.h - rolagem
  if (base > doc.altura + 0.5) falharNo(falhas, moldura, `base da moldura em ${base.toFixed(1)}, fora da janela (innerHeight ${doc.altura})`)
  return resultadoInicio('MOLDURA_DOBRA', falhas, `moldura inteira em p 0 (rolagem ${rolagem.toFixed(0)}, topo ${topo.toFixed(0)}, base ${base.toFixed(0)})`)
}

const ehCacauOuChaoNoite = (cor) => ehCor(cor, COR.cacau, 2) || ehCor(cor, COR.chaoNoite, 2)

/**
 * NOITE: a parcela de noite das duas primeiras telas, sem as linhas do cabeçalho no denominador, chega ao piso do
 * cartão, e há uma faixa de cacau de ponta a ponta antes de duas alturas de janela.
 */
export function noite(nos, doc) {
  const largura = doc?.largura
  if (largura !== 1440 && largura !== 390) return foraDoEscopo('NOITE', doc)
  const falhas = []
  const amostras = doc?.noite?.porRolagem
  if (!Array.isArray(amostras) || amostras.length === 0) {
    falharDoc(falhas, 'amostras de noite ausentes (doc.noite.porRolagem)')
  } else if (!amostras.every((a) => ['total', 'noite', 'cabecalho'].every((k) => ehNumero(a?.[k])))) {
    falharDoc(falhas, 'amostra de noite ilegível (total, noite e cabecalho em px²)')
  } else {
    const noturno = amostras.reduce((soma, a) => soma + a.noite, 0)
    const area = amostras.reduce((soma, a) => soma + a.total - a.cabecalho, 0)
    const piso = MEDIDAS_REP_HOME.noite[largura]
    if (!(area > 0)) falharDoc(falhas, 'área das telas sem o cabeçalho é zero')
    else {
      const parcela = noturno / area
      if (parcela < piso) falharDoc(falhas, `parcela de noite ${parcela.toFixed(2)} das duas primeiras telas (o piso é ${piso.toFixed(2)})`)
    }
  }
  const teto = 2 * (doc?.altura ?? 0)
  const cacau = (no) => ehCor(no.estilo?.backgroundColor, COR.cacau, 2)
  // Where the pin is built the stage's track pushes the next band down by D, so the band above 2 x innerHeight is the
  // wall of the night sheet (`paredeDaFolha`): as wide as the stage at rest and at every p, and cacau.
  const deNoite = nos.filter((no) => {
    const lado = marca(no, 'faixa') || marca(no, 'faixaLado') || marca(no, 'paredeDaFolha')
    return lado && comRetangulo(no) && cacau(no) && no.rect.x <= 1 && no.rect.x + no.rect.w >= largura - 1 && no.rect.y < teto
  })
  if (deNoite.length === 0) falharDoc(falhas, `nenhuma faixa de cacau de ponta a ponta antes de 2 × innerHeight (${teto})`)
  return resultadoInicio('NOITE', falhas, `noite com parcela conforme e ${deNoite.length} faixa de cacau antes de 2 × innerHeight`)
}

/** COSTURA: a costura é estrutura da página: a coluna da noite nela, o texto do dia e o da noite a certa distância. */
export function costura(nos, doc) {
  const largura = doc?.largura
  if (largura !== 1440 && largura !== 1024 && largura !== 390) return foraDoEscopo('COSTURA', doc)
  const dia = nos.filter((no) => marca(no, 'ladoDia') && comRetangulo(no))
  const noiteNos = nos.filter((no) => marca(no, 'ladoNoite') && comRetangulo(no))
  const falhas = []
  if (largura >= 1024) {
    const placa = nos.find((no) => marca(no, 'cenaPlaca') && comRetangulo(no))
    if (!placa) return falhaFechada('COSTURA', 'nenhuma placa de estúdio com retângulo')
    const seam = costuraDaPlaca(placa.rect)
    const colunas = nos.filter((no) => marca(no, 'colunaNoite') && comRetangulo(no))
    if (colunas.length === 0) falharDoc(falhas, 'nenhuma coluna da noite medida')
    for (const coluna of colunas) {
      if (Math.abs(coluna.rect.x - seam) > 2) falharNo(falhas, coluna, `coluna da noite em x=${coluna.rect.x.toFixed(1)} e a costura em x=${seam.toFixed(1)} (±2)`)
    }
    for (const no of dia) {
      if (no.rect.x + no.rect.w > seam - 48 + 0.5) falharNo(falhas, no, `texto do dia termina em x=${(no.rect.x + no.rect.w).toFixed(1)} (o limite é a costura menos 48 = ${(seam - 48).toFixed(1)})`)
    }
    for (const no of noiteNos) {
      if (no.rect.x < seam + 32 - 0.5) falharNo(falhas, no, `texto da noite começa em x=${no.rect.x.toFixed(1)} (o piso é a costura mais 32 = ${(seam + 32).toFixed(1)})`)
    }
  } else {
    // Em 390 o dia e a noite se empilham: o h1 conta com os seus dois spans (primeiro o dia, depois a noite).
    const doDia = [...dia, ...nos.filter((no) => marca(no, 'h1Span1') && comRetangulo(no))]
    const daNoite = [...noiteNos, ...nos.filter((no) => marca(no, 'h1Span2') && comRetangulo(no))]
    if (doDia.length === 0 || daNoite.length === 0) return falhaFechada('COSTURA', `elementos do dia (${doDia.length}) ou da noite (${daNoite.length}) ausentes`)
    const ultimoDoDia = Math.max(...doDia.map((no) => no.ordemDom ?? Number.NaN))
    const primeiroDaNoite = Math.min(...daNoite.map((no) => no.ordemDom ?? Number.NaN))
    if (!Number.isFinite(ultimoDoDia) || !Number.isFinite(primeiroDaNoite)) falharDoc(falhas, 'ordem no DOM ausente')
    else if (primeiroDaNoite < ultimoDoDia) falharDoc(falhas, 'ordem no DOM: um elemento da noite vem antes de um elemento do dia')
    const maisBaixoDoDia = Math.max(...doDia.map((no) => no.rect.y))
    const maisAltoDaNoite = Math.min(...daNoite.map((no) => no.rect.y))
    if (maisAltoDaNoite < maisBaixoDoDia) falharDoc(falhas, `um elemento da noite (y=${maisAltoDaNoite.toFixed(1)}) está acima de um do dia (y=${maisBaixoDoDia.toFixed(1)})`)
  }
  return resultadoInicio('COSTURA', falhas, `costura em ${largura}: ${dia.length} elementos do dia e ${noiteNos.length} da noite no lugar`)
}

const MINIMO_TINTA = 4.5

/**
 * TEMPO: as horas das legendas nunca voltam, a tinta segue o chão (contraste de 4,5:1: cacau sobre cacau e texto-2 sobre
 * areia reprovam), o tom da legenda é o do chão e só há dois botões de mel: a pílula do herói (de 1024 em diante) e a do
 * fechamento, sempre sobre o cacau.
 */
export function tempo(nos, doc) {
  const largura = doc?.largura
  const falhas = []
  const legendas = nos
    .map((no, indice) => ({ no, indice }))
    .filter(({ no }) => marca(no, 'legenda'))
    .sort((a, b) => (a.no.ordemDom ?? a.indice) - (b.no.ordemDom ?? b.indice))
    .map(({ no }) => no)
  if (legendas.length === 0) falharDoc(falhas, 'nenhuma legenda medida')
  let anterior = null
  for (const no of legendas) {
    const m = /^(\d{1,2}):(\d{2})/.exec(leitura(no.texto))
    if (!m) {
      falharNo(falhas, no, 'legenda sem hora no começo')
      continue
    }
    const minutos = Number(m[1]) * 60 + Number(m[2])
    if (anterior !== null && minutos < anterior.minutos) {
      falharNo(falhas, no, `hora ${m[1]}:${m[2]} depois de ${anterior.rotulo} (as horas não voltam)`)
    }
    anterior = { minutos, rotulo: `${m[1]}:${m[2]}` }
    const chao = corDoFundo(no)
    if (!lido(no.tom)) falharNo(falhas, no, 'tom da legenda ausente')
    else if (!chao) falharNo(falhas, no, 'chão da legenda ilegível')
    else if (no.tom === 'dia' && !(ehCor(`rgb(${chao.r}, ${chao.g}, ${chao.b})`, COR.papel, 2) || ehCor(`rgb(${chao.r}, ${chao.g}, ${chao.b})`, COR.areia, 2))) {
      falharNo(falhas, no, `legenda de tom dia sobre o chão ${nomeDaCor(`rgb(${chao.r}, ${chao.g}, ${chao.b})`)} (o dia é papel ou areia)`)
    } else if (no.tom === 'noite' && !ehCacauOuChaoNoite(`rgb(${chao.r}, ${chao.g}, ${chao.b})`)) {
      falharNo(falhas, no, `legenda de tom noite sobre o chão ${nomeDaCor(`rgb(${chao.r}, ${chao.g}, ${chao.b})`)} (a noite é cacau ou texto-2)`)
    } else if (no.tom !== 'dia' && no.tom !== 'noite') falharNo(falhas, no, `tom ${no.tom} da legenda (dia ou noite)`)
  }
  for (const no of nos) {
    // O botão de mel tem o próprio fundo (o chão sob ele é `fundoSob`): o contraste dele é o do G11.
    if (marca(no, 'botaoMel')) continue
    if (!visivel(no) || !temTexto(no) || !lido(no.estilo?.color) || !(lido(no.fundoSob) || Array.isArray(no.cadeia))) continue
    const razao = contraste(no.estilo.color, lido(no.fundoSob) ? [no.fundoSob] : no.cadeia)
    const chao = corDoFundo(no)
    if (razao === null || !chao) {
      falharNo(falhas, no, 'tinta ou chão ilegível')
      continue
    }
    if (razao < MINIMO_TINTA) {
      falharNo(falhas, no, `tinta ${nomeDaCor(no.estilo.color)} sobre o chão ${nomeDaCor(`rgb(${chao.r}, ${chao.g}, ${chao.b})`)}: contraste ${razao.toFixed(2)}:1 (o piso é ${MINIMO_TINTA}:1, a tinta segue o chão)`)
    }
  }
  const meis = nos.filter((no) => marca(no, 'botaoMel'))
  for (const no of meis) {
    const doHeroi = marca(no, 'heroiBotao')
    if (!(doHeroi && largura >= 1024) && !marca(no, 'fechamento')) {
      falharNo(falhas, no, doHeroi ? `pílula de mel do herói em ${largura} (de 1024 em diante; abaixo só a do fechamento)` : 'botão de mel fora do herói e do fechamento')
    } else if (!ehCor(fundoDoNo(no), COR.cacau, 2)) {
      falharNo(falhas, no, `botão de mel sobre ${lido(no.fundoSob) ? nomeDaCor(no.fundoSob) : 'chão não lido'} (o mel só vale sobre o cacau)`)
    }
  }
  if (!meis.some((no) => marca(no, 'fechamento'))) falharDoc(falhas, 'o botão de mel do fechamento não existe')
  return resultadoInicio('TEMPO', falhas, `${legendas.length} legendas em ordem, tinta no chão certo, ${meis.length} botões de mel`)
}

/**
 * TROCA_RM: em movimento reduzido a troca é o estado de repouso: o palco não é fixo, a camada da noite (de 1024 em
 * diante) não tem transform, a luz está acesa, não há capa sobre ela e nenhuma animação roda na casa.
 */
export function trocaRm(nos, doc) {
  const falhas = []
  const palcos = nos.filter((no) => marca(no, 'palco'))
  if (palcos.length === 0) falharDoc(falhas, 'nenhum palco medido')
  for (const no of palcos) {
    const posicao = leitura(no.estilo?.position)
    if (posicao === '') falharNo(falhas, no, 'position do palco ausente')
    else if (posicao === 'sticky' || posicao === 'fixed') falharNo(falhas, no, `palco com position ${posicao} (em movimento reduzido não há pino)`)
    const alto = retanguloDe(no)?.h
    if (ehNumero(no.alturaConteudo) && ehNumero(alto) && no.alturaConteudo > alto + 1) {
      falharNo(falhas, no, `conteúdo de ${no.alturaConteudo}px num palco de ${alto}px (cortado)`)
    }
  }
  const camadas = nos.filter((no) => marca(no, 'camadaNoite'))
  if (doc?.largura >= 1024 && camadas.length === 0) falharDoc(falhas, 'nenhuma camada da noite medida')
  for (const no of camadas) {
    const transform = leitura(no.estilo?.transform)
    if (transform === '') falharNo(falhas, no, 'transform da camada da noite ausente')
    else if (transform !== 'none') falharNo(falhas, no, `camada da noite com transform ${transform} (em movimento reduzido é none)`)
  }
  const luzes = nos.filter((no) => marca(no, 'luz'))
  if (luzes.length === 0) falharDoc(falhas, 'nenhuma luz [data-luz] medida')
  for (const no of luzes) {
    const opacidade = numeroDe(no.estilo?.opacity)
    if (!Number.isFinite(opacidade)) falharNo(falhas, no, `opacity da luz ilegível (${leitura(no.estilo?.opacity)})`)
    else if (opacidade !== 1) falharNo(falhas, no, `luz com opacity ${opacidade} (acesa em repouso)`)
  }
  for (const no of nos.filter((n) => marca(n, 'luzCapa'))) falharNo(falhas, no, 'capa sobre a luz (nenhuma cobertura)')
  if (!ehNumero(doc?.animacoesCasa)) falharDoc(falhas, 'animações da casa não lidas (doc.animacoesCasa)')
  else if (doc.animacoesCasa !== 0) falharDoc(falhas, `${doc.animacoesCasa} animações rodando na casa (em movimento reduzido são 0)`)
  return resultadoInicio('TROCA_RM', falhas, 'palco sem pino, camada da noite parada, luz acesa, nenhuma animação')
}

/** A pasta de web/public: a que o servidor serve e onde mora telas/casa/MANIFESTO.json. */
const PUBLICO_PADRAO = fileURLToPath(new URL('../public', import.meta.url))

/** Um PNG liso (poucos valores distintos nos bytes das linhas): a tela de esqueleto que a regra recusa. */
function pngLiso(bytes) {
  try {
    if (bytes.length < 33 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return false
    let posicao = 8
    let cabecalho = null
    const dados = []
    while (posicao + 8 <= bytes.length) {
      const tamanho = bytes.readUInt32BE(posicao)
      const tipo = bytes.toString('latin1', posicao + 4, posicao + 8)
      const corpo = bytes.subarray(posicao + 8, posicao + 8 + tamanho)
      if (tipo === 'IHDR') cabecalho = { largura: corpo.readUInt32BE(0), altura: corpo.readUInt32BE(4), profundidade: corpo[8], tipoCor: corpo[9], entrelacado: corpo[12] }
      else if (tipo === 'IDAT') dados.push(corpo)
      else if (tipo === 'IEND') break
      posicao += 12 + tamanho
    }
    if (!cabecalho || cabecalho.entrelacado !== 0) return false
    const canais = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[cabecalho.tipoCor]
    if (!canais) return false
    const linha = Math.ceil((cabecalho.largura * canais * cabecalho.profundidade) / 8) + 1
    const cru = zlib.inflateSync(Buffer.concat(dados))
    if (cru.length < linha * cabecalho.altura) return false
    const distintos = new Set()
    for (let y = 0; y < cabecalho.altura; y += 1) {
      for (let i = 1; i < linha; i += 1) {
        distintos.add(cru[y * linha + i])
        if (distintos.size > 3) return false
      }
    }
    return true
  } catch {
    return false
  }
}

/**
 * CAPTURA_REAL: toda tela de produto é uma captura do ASSET-1: o arquivo que a imagem carregou (`currentSrc`) está em
 * `telas/casa/MANIFESTO.json` (`capturas[].servidos[{ arquivo, sha256 }]`), existe em web/public com esse sha256 e não é
 * um PNG liso. `opcoes.publico` troca a pasta de web/public (os testes usam uma temporária).
 */
export function capturaReal(nos, _doc, opcoes = {}) {
  const publico = path.resolve(opcoes.publico ?? PUBLICO_PADRAO)
  const telas = nos.filter((no) => marca(no, 'produtoTela'))
  if (telas.length === 0) return falhaFechada('CAPTURA_REAL', 'nenhuma tela de produto na página (0 molduras)')
  let servidos
  try {
    const manifesto = JSON.parse(fs.readFileSync(path.join(publico, 'telas', 'casa', 'MANIFESTO.json'), 'utf8'))
    servidos = new Map()
    for (const captura of manifesto.capturas) for (const item of captura.servidos) servidos.set(String(item.arquivo), String(item.sha256))
  } catch {
    return falhaFechada('CAPTURA_REAL', 'telas/casa/MANIFESTO.json ausente ou ilegível em web/public')
  }
  const falhas = []
  for (const no of telas) {
    let relativo
    try {
      relativo = decodeURIComponent(new URL(leitura(no.currentSrc)).pathname).replace(/^\/+/, '')
    } catch {
      falharNo(falhas, no, `currentSrc ilegível (${leitura(no.currentSrc) || 'ausente'})`)
      continue
    }
    const arquivo = path.resolve(publico, relativo)
    if (arquivo !== publico && !arquivo.startsWith(publico + path.sep)) {
      falharNo(falhas, no, `${relativo} sai de web/public`)
      continue
    }
    const esperado = servidos.get(relativo)
    if (esperado === undefined) {
      falharNo(falhas, no, `${relativo} não está no MANIFESTO.json (a tela não é uma captura do ASSET-1)`)
      continue
    }
    let bytes
    try {
      bytes = fs.readFileSync(arquivo)
    } catch {
      falharNo(falhas, no, `${relativo} está no MANIFESTO.json mas o arquivo não existe em web/public`)
      continue
    }
    const obtido = crypto.createHash('sha256').update(bytes).digest('hex')
    if (obtido !== esperado) falharNo(falhas, no, `${relativo}: sha256 ${obtido.slice(0, 12)}… difere do MANIFESTO.json (${esperado.slice(0, 12)}…): o arquivo mudou depois de gravado`)
    else if (pngLiso(bytes)) falharNo(falhas, no, `${relativo} é um PNG liso (esqueleto), não uma captura`)
  }
  return resultadoInicio('CAPTURA_REAL', falhas, `${telas.length} telas, todas listadas no MANIFESTO.json com o sha256 conferido`)
}

// ---------------------------------------------------------------------------------------------
// O movimento do Início medido numa varredura (a sonda), contra `MEDIDAS_REP_HOME`. Cada conferência falha fechado: sem a
// leitura, reprova. A sonda é um objeto simples:
//   { largura, luz: { cone_ms, poca_ms, atraso_ms, defasagem_ms }, palco: { pino_px },
//     cobertura: [f em p 0, 0,25, 0,5, 0,75, 1], contraste: { minimo }, moldura: { inteira },
//     legenda: { saida_ms, entrada_ms, desloc_px }, duracoes: [ms], cls, longtasks,
//     propriedades: ['transform', ...], transicoes: ['opacity', ...], lcp_ms,
//     bytes: { dobra_kb, luz_kb, pagina_kb } }

const PROPRIEDADES_QUE_ANIMAM = ['transform', 'opacity', 'scale', 'translate', 'background-color', 'color', 'border-color']

export function avaliarMovimento(sonda, medidas = MEDIDAS_REP_HOME) {
  const s = sonda && typeof sonda === 'object' ? sonda : {}
  const dentro = (valor, alvo, folga) => ehNumero(valor) && Math.abs(valor - alvo) <= folga
  const conferir = (regra, falhas, motivoOk) => ({
    regra,
    ok: falhas.length === 0,
    motivo: falhas.length === 0 ? motivoOk : falhas.join('; '),
    nos_com_falha: [],
  })
  const faltou = (regra, campo) => conferir(regra, [`leitura ausente: ${campo}`], '')
  const numeros = (lista) => Array.isArray(lista) && lista.length > 0 && lista.every(ehNumero)
  const resultados = []

  // LUZ: a lâmpada acende nas durações do M15.
  if (!s.luz || typeof s.luz !== 'object') resultados.push(faltou('LUZ', 'luz'))
  else {
    const falhas = []
    for (const [campo, alvo] of Object.entries(medidas.luz)) {
      if (!dentro(s.luz[campo], alvo, 15)) falhas.push(`${campo} ${s.luz[campo] ?? 'ausente'} (o certo é ${alvo} ±15)`)
    }
    resultados.push(conferir('LUZ', falhas, 'cone, poça, atraso e defasagem da lâmpada nas medidas do M15'))
  }

  // PALCO: a distância do fixo é a da largura.
  const alvoDoPino = medidas.pino?.[s.largura]
  if (!s.palco || !ehNumero(s.largura) || !ehNumero(alvoDoPino)) resultados.push(faltou('PALCO', 'palco.pino_px ou largura com pino medido'))
  else resultados.push(conferir('PALCO', dentro(s.palco.pino_px, alvoDoPino, 1) ? [] : [`pino ${s.palco.pino_px ?? 'ausente'} px em ${s.largura} (o certo é ${alvoDoPino})`], `pino de ${alvoDoPino} px em ${s.largura}`))

  // COBERTURA: a noite cobre o palco como em RECUT §7.
  const esperadaCobertura = medidas.cobertura1440
  if (!numeros(s.cobertura) || !Array.isArray(esperadaCobertura)) resultados.push(faltou('COBERTURA', 'cobertura'))
  else {
    const falhas = esperadaCobertura.flatMap((alvo, i) => (dentro(s.cobertura[i], alvo, 0.02) ? [] : [`f ${s.cobertura[i] ?? 'ausente'} no passo ${i} (o certo é ${alvo} ±0,02)`]))
    // A sonda pode trazer, além da cobertura, a borda (px) e o `translateX` (%) nos mesmos cinco passos, e as paradas.
    const contra = (campo, esperado, folga) => {
      const lida = s[campo]
      if (lida === undefined) return
      if (!numeros(lida) || lida.length !== esperado.length) falhas.push(`${campo} ilegível (${JSON.stringify(lida)})`)
      else esperado.forEach((alvo, i) => (dentro(lida[i], alvo, folga) ? null : falhas.push(`${campo} ${lida[i]} no passo ${i} (o certo é ${alvo} ±${folga})`)))
    }
    contra('borda', medidas.borda1440 ?? [], 1.5)
    contra('traducao_pct', medidas.traducao1440 ?? [], 0.15)
    // As três retenções da folha: a borda lida nos dois extremos de cada uma (p 0 e 0,10; 0,45 e 0,55; 0,85 e 1) não anda.
    if (s.retencoes !== undefined) {
      for (const nome of ['inicio', 'centro', 'fim']) {
        const par = s.retencoes?.[nome]
        if (!numeros(par) || par.length !== 2) falhas.push(`retenção ${nome} ilegível`)
        else if (Math.abs(par[0] - par[1]) > 1) falhas.push(`sem retenção ${nome}: a borda vai de ${par[0]} a ${par[1]} px`)
      }
    }
    resultados.push(conferir('COBERTURA', falhas, 'cobertura da noite nos cinco passos de RECUT §7'))
  }

  // CONTRASTE: o texto passa de 4,5:1 em toda a varredura.
  if (!ehNumero(s.contraste?.minimo)) resultados.push(faltou('CONTRASTE', 'contraste.minimo'))
  else resultados.push(conferir('CONTRASTE', s.contraste.minimo >= MINIMO_TINTA ? [] : [`contraste mínimo ${s.contraste.minimo}:1 (o piso é ${MINIMO_TINTA}:1)`], `contraste mínimo ${s.contraste.minimo}:1`))

  // MOLDURA: a moldura está inteira em p 0.
  if (typeof s.moldura?.inteira !== 'boolean') resultados.push(faltou('MOLDURA', 'moldura.inteira'))
  else resultados.push(conferir('MOLDURA', s.moldura.inteira ? [] : ['moldura cortada em p 0'], 'moldura inteira em p 0'))

  // LEGENDA: a troca sai e entra nos tempos do M17.
  if (!s.legenda || typeof s.legenda !== 'object') resultados.push(faltou('LEGENDA', 'legenda'))
  else {
    const falhas = []
    for (const [campo, alvo] of Object.entries(medidas.legenda)) {
      if (!dentro(s.legenda[campo], alvo, campo === 'desloc_px' ? 0.5 : 15)) falhas.push(`${campo} ${s.legenda[campo] ?? 'ausente'} (o certo é ${alvo})`)
    }
    resultados.push(conferir('LEGENDA', falhas, 'saída, entrada e deslocamento da legenda nas medidas do M17'))
  }

  // DURACOES: toda duração medida é uma das do catálogo (M15 a M17), com folga de 15 ms.
  const permitidas = [...Object.values(medidas.luz), ...Object.entries(medidas.legenda).filter(([k]) => k.endsWith('_ms')).map(([, v]) => v)]
  if (!numeros(s.duracoes)) resultados.push(faltou('DURACOES', 'duracoes'))
  else {
    const falhas = s.duracoes.filter((d) => !permitidas.some((p) => Math.abs(d - p) <= 15)).map((d) => `duração ${d} ms fora do catálogo`)
    resultados.push(conferir('DURACOES', falhas, `${s.duracoes.length} durações, todas do catálogo`))
  }

  // CLS: nenhum deslocamento de layout.
  if (!ehNumero(s.cls)) resultados.push(faltou('CLS', 'cls'))
  else resultados.push(conferir('CLS', s.cls <= 0.001 ? [] : [`CLS ${s.cls} (o certo é 0)`], 'CLS 0'))

  // LONGTASK: nenhuma tarefa longa na varredura.
  if (!ehNumero(s.longtasks)) resultados.push(faltou('LONGTASK', 'longtasks'))
  else resultados.push(conferir('LONGTASK', s.longtasks === 0 ? [] : [`${s.longtasks} tarefas longas`], 'nenhuma tarefa longa'))

  // PROPRIEDADES: só o que o DESIGN.md deixa animar.
  if (!Array.isArray(s.propriedades)) resultados.push(faltou('PROPRIEDADES', 'propriedades'))
  else {
    const fora = s.propriedades.filter((p) => !PROPRIEDADES_QUE_ANIMAM.includes(p))
    resultados.push(conferir('PROPRIEDADES', fora.map((p) => `propriedade ${p} animada`), `${s.propriedades.length} propriedades, só as permitidas`))
  }

  // TRANSICOES: nenhuma transição em `all`.
  if (!Array.isArray(s.transicoes)) resultados.push(faltou('TRANSICOES', 'transicoes'))
  else resultados.push(conferir('TRANSICOES', s.transicoes.includes('all') ? ['transition: all'] : [], `${s.transicoes.length} transições, nenhuma em all`))

  // LCP.
  if (!ehNumero(s.lcp_ms)) resultados.push(faltou('LCP', 'lcp_ms'))
  else resultados.push(conferir('LCP', s.lcp_ms <= medidas.lcp_ms ? [] : [`LCP ${s.lcp_ms} ms (o teto é ${medidas.lcp_ms})`], `LCP ${s.lcp_ms} ms`))

  // BYTES.
  const b = s.bytes
  if (!b || !['dobra_kb', 'luz_kb', 'pagina_kb'].every((k) => ehNumero(b[k]))) resultados.push(faltou('BYTES', 'bytes.dobra_kb, luz_kb e pagina_kb'))
  else {
    const falhas = []
    if (b.dobra_kb > medidas.bytes.dobra_kb) falhas.push(`dobra ${b.dobra_kb} kB (o teto é ${medidas.bytes.dobra_kb})`)
    if (b.luz_kb > medidas.bytes.luz_kb_max) falhas.push(`luz ${b.luz_kb} kB (o teto é ${medidas.bytes.luz_kb_max})`)
    if (b.pagina_kb > medidas.bytes.pagina_kb) falhas.push(`página ${b.pagina_kb} kB (o teto é ${medidas.bytes.pagina_kb})`)
    resultados.push(conferir('BYTES', falhas, 'dobra, luz e página dentro do teto'))
  }
  return resultados
}

// ---------------------------------------------------------------------------------------------

/** As regras de um caso: o Início roda as 22 e as 8 dele; a /sistema, as 22; as páginas públicas, 21 (sem CASA_PRESENTE); o resto, as sete originais. */
export function regrasDoCaso(caso) {
  if (CASOS_INICIO.includes(caso)) return [...REGRAS, ...REGRAS_INICIO]
  if (CASOS_CASA.includes(caso)) return [...REGRAS]
  if (CASOS_PUBLICOS.includes(caso)) return REGRAS.filter((regra) => regra !== 'CASA_PRESENTE')
  return [...REGRAS_ORIGINAIS]
}

/** As regras que bloqueiam em cada caso: todas as do caso, menos as duas que só registram. */
export function bloqueantesDoCaso(caso) {
  return regrasDoCaso(caso).filter((regra) => !REGRAS_DE_REGISTRO.includes(regra))
}

/**
 * Avalia as regras sobre as leituras de uma página: `{ doc, nos, tema, caso, rota }`. Sem `caso` valem as sete
 * originais; com ele, as do caso (`regrasDoCaso`), e só as duas de registro não bloqueiam.
 */
export function avaliarTudo({ doc, nos, tema, caso }) {
  const lista = Array.isArray(nos) ? nos : []
  const bloqueantes = bloqueantesDoCaso(caso)
  const avaliadores = {
    G1: () => g1(doc),
    G11: () => g11(lista, tema),
    G12: () => g12(lista),
    FONTES: () => fontes(lista),
    CAIXA: () => caixa(lista),
    SOMBRA: () => sombra(lista, doc),
    '3D': () => tresD(lista),
    FAIXA: () => faixa(lista, doc),
    PRODUTO: () => produto(lista, doc),
    RODAPE: () => rodape(lista, doc),
    EXIBICAO: () => exibicao(lista, doc),
    ITALICO: () => italico(lista, doc),
    TITULO: () => titulo(lista, doc),
    TITULO_REGISTRO: () => tituloRegistro(lista, doc),
    SOBRETITULO: () => sobretitulo(lista, doc, caso),
    DOCK: () => dock(lista, doc),
    CABECALHO: () => cabecalho(lista, doc),
    BOTAO_LARGO: () => botaoLargo(lista, doc),
    CENA: () => cena(lista, doc),
    CASA_LIMPA: () => casaLimpa(lista, doc),
    CASA_LIMPA_REGISTRO: () => casaLimpaRegistro(lista, doc),
    CASA_PRESENTE: () => casaPresente(lista, doc),
    HEROI: () => heroi(lista, doc),
    LEGENDA_PRESA: () => legendaPresa(lista, doc),
    MOLDURA_DOBRA: () => molduraDobra(lista, doc),
    NOITE: () => noite(lista, doc),
    COSTURA: () => costura(lista, doc),
    TEMPO: () => tempo(lista, doc),
    TROCA_RM: () => trocaRm(lista, doc),
    CAPTURA_REAL: () => capturaReal(lista, doc),
  }
  return regrasDoCaso(caso).map((regra) => ({ ...avaliadores[regra](), bloqueia: bloqueantes.includes(regra) }))
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
    // DS1: a face de exibição como a raiz a declara, e o espaço de seção JÁ RESOLVIDO em px (a propriedade
    // crua é um clamp(), então um div oculto com `padding-top: var(--espaco-secao)` a calcula).
    fonteExibicao: estiloRaiz.getPropertyValue('--fonte-exibicao').trim(),
    espacoSecao: '',
  }
  {
    const sonda = document.createElement('div')
    sonda.setAttribute('aria-hidden', 'true')
    sonda.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:0;overflow:hidden;padding-top:var(--espaco-secao);'
    document.body.appendChild(sonda)
    doc.tokens.espacoSecao = getComputedStyle(sonda).paddingTop
    sonda.remove()
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

  // DS1: as marcas das regras da casa acesa, lidas dos atributos que as peças carregam (`data-*`).
  const idsDeTitulo = new WeakMap()
  let proximoTitulo = 0
  const marcasDaCasa = (el) => {
    const proximo = el.nextElementSibling
    return {
      faixa: el.matches('[data-faixa]'),
      faixaLado: el.matches('[data-faixa-lado]'),
      produto: el.matches('[data-produto-moldura]'),
      produtoTela: el.matches('[data-produto-tela]'),
      produtoMoldura: el.matches('[data-produto-moldura-arte]'),
      rodape: el.matches('footer[data-rodape]'),
      rodapeGrupo: el.matches('[data-rodape-grupo]'),
      rodapeTitulo: el.matches('h2, h3') && el.closest('[data-rodape-grupo]') !== null,
      rodapeNome: el.matches('[data-nome-rodape]'),
      link: el.matches('a[href]'),
      aviso: el.matches('[data-aviso]'),
      noRodape: el.closest('footer[data-rodape]') !== null,
      noCabecalho: el.closest('[data-cabecalho]') !== null,
      noMain: el.closest('main') !== null,
      casa: el.closest('[data-casa]') !== null,
      casaRaiz: el.matches('[data-casa]'),
      cabecalhoPilula: el.matches('[data-cabecalho-pilula]'),
      noMenu: el.closest('[data-menu-celular]') !== null,
      botaoLargo: el.matches('[data-botao-largo]'),
      // O mel de BotaoLargo leva `data-botao-mel`; `data-botao="mel"` é a forma antiga e continua valendo.
      botaoMel: el.matches('[data-botao-mel], [data-botao="mel"]'),
      // A placa é a imagem da cena; as camadas de luz (`[data-luz]`) dentro da caixa dela não são placa.
      cenaPlaca: el.matches('[data-cena-heroi] img:not([data-luz])'),
      // REP-HOME: as marcas das oito regras do Início, lidas dos atributos que a página e as peças carregam.
      h1Span1: el.matches('h1 [data-h1-dia]'),
      h1Span2: el.matches('h1 [data-h1-noite]'),
      heroiBotao: el.matches('[data-cena-heroi] a[data-botao-mel]'),
      heroiLink: el.matches('[data-hero-link]'),
      legenda: el.matches('[data-legenda]'),
      legendaHeroi: el.matches('[data-cena-heroi] [data-legenda]'),
      palco: el.matches('[data-troca-palco]'),
      colunaNoite: el.matches('[data-casa] [data-faixa-lado][data-faixa-fundo="cacau"]'),
      ladoDia: el.matches('[data-costura-lado="dia"]'),
      ladoNoite: el.matches('[data-costura-lado="noite"]'),
      fechamento: el.matches('[data-fechamento] [data-botao-mel]'),
      // A parede de cacau do herói em 390: a própria seção do herói (o chão dela é cacau abaixo de 1024).
      paredeNoite: el.matches('[data-cena-heroi]'),
      // The night sheet's outer box (`data-troca-noite`), the wall inside its inner box (full width of the stage at rest
      // and while it moves: the band of cacau the pinned stage leaves above 2 x innerHeight), and the caption node of
      // moment 3 (one node, only where the pin is built).
      camadaNoite: el.matches('[data-troca-noite]'),
      paredeDaFolha: el.matches('[data-troca-noite-parede]'),
      trocaLegenda: el.matches('[data-troca-legenda]'),
      luz: el.matches('[data-luz]'),
      luzCapa: el.matches('[data-luz-capa]'),
      painel: el.matches('[data-painel], [data-h~="caixa-cor"]'),
      vivo: el.matches('.cm-flutuante, [data-cartao-plano], .pd-cartao, .pd-linha, .pd-avatar, .pd-seletor'),
      folha: textoProprio(el) !== '',
      antesDeTitulo: proximo !== null && /^H[1-3]$/.test(proximo.tagName),
      noProduto: el.closest('[data-produto-moldura]') !== null,
      titulo: el.closest('h1, h2') !== null,
    }
  }
  const idDoTitulo = (el) => {
    const titulo = el.closest('h1, h2')
    if (titulo === null) return undefined
    if (!idsDeTitulo.has(titulo)) {
      proximoTitulo += 1
      idsDeTitulo.set(titulo, `titulo-${proximoTitulo}`)
    }
    return idsDeTitulo.get(titulo)
  }

  // O html e o body entram na coleta (3D, sombra, gradiente, fonte e o resto valem para eles também);
  // as marcas de bloco e de controle não os alcançam, então as regras de bloco e de controle não mudam.
  const elementos = [raiz, document.body, ...document.body.querySelectorAll('*')].filter((el) => el && !ignorar.has(el.tagName))
  const nos = elementos.map((el, ordemDom) => {
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
        // DS1: o que as regras da casa acesa leem a mais.
        fontStyle: cs.fontStyle,
        position: cs.position,
        bottom: cs.bottom,
        borderRadius: cs.borderRadius,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        textShadow: cs.textShadow,
        visibility: cs.visibility,
      },
      m: {
        ...marcasDaCasa(el),
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
    // G11: no radio e no checkbox o alvo de toque é o rótulo (`el.labels` cobre o <label> que envolve e
    // o label[for]); vale o maior visível. Sem rótulo visível, não há `rotulo` e o input é medido.
    if (el.tagName === 'INPUT') {
      const tipo = (el.getAttribute('type') || 'text').toLowerCase()
      if (tipo === 'radio' || tipo === 'checkbox') {
        no.tipo = tipo
        let maior = null
        for (const rotulo of el.labels ?? []) {
          const rr = rotulo.getBoundingClientRect()
          const aparece = typeof rotulo.checkVisibility === 'function' ? rotulo.checkVisibility({ visibilityProperty: true }) : rr.width > 0 && rr.height > 0
          if (!aparece || !(rr.width > 0) || !(rr.height > 0)) continue
          if (maior === null || rr.width * rr.height > maior.w * maior.h) maior = { x: rr.x + sx, y: rr.y + sy, w: rr.width, h: rr.height }
        }
        if (maior !== null) no.rotulo = { rect: maior }
      }
    }
    if (no.m.filhoDeMain || no.m.filhoDeBloco || no.m.blocoG12) no.ancestrais = ancestraisDe(el)
    // DS1: os campos soltos que as regras da casa acesa leem.
    no.classes = [...el.classList]
    const idTitulo = idDoTitulo(el)
    if (idTitulo !== undefined) no.tituloId = idTitulo
    if (no.m.rodape) no.textoTodo = colapsar(el.textContent ?? '')
    if (el.tagName === 'IMG') {
      no.currentSrc = el.currentSrc || el.getAttribute('src') || ''
      no.naturalWidth = el.naturalWidth
    }
    if (no.m.cenaPlaca) {
      const bruto = el.closest('[data-cena-heroi]')?.getAttribute('data-largura-max')
      const largura = bruto === null || bruto === undefined || bruto.trim() === '' ? Number.NaN : Number(bruto)
      if (Number.isFinite(largura)) no.larguraMax = largura
    }
    if (no.m.cabecalhoPilula) no.tom = el.closest('[data-cabecalho]')?.getAttribute('data-tom') ?? undefined
    // REP-HOME: a posição do nó no DOM, o tom da legenda e a altura do conteúdo do palco.
    no.ordemDom = ordemDom
    if (no.m.legenda) no.tom = el.getAttribute('data-tom') ?? undefined
    if (no.m.palco) no.alturaConteudo = el.scrollHeight
    return no
  })

  // DS1: o fundo sob cada pílula de mel (o primeiro elemento opaco abaixo dela, no centro). Numa passada à parte, porque
  // `elementsFromPoint` só enxerga o que está na janela: rola até a pílula e devolve a rolagem de antes.
  // REP-HOME: o texto dentro da casa também tem o fundo lido por baixo dele, porque as paredes do herói são camadas
  // irmãs (não ancestrais), e a cadeia de fundos dos ancestrais não as vê.
  let rolou = false
  const fundoOpaco = (texto) => {
    const m = /^rgba?\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+(?:[\s,/]+([\d.]+))?/.exec(texto || '')
    return m !== null && (m[1] === undefined || Number(m[1]) >= 0.999)
  }
  elementos.forEach((el, indice) => {
    const marcas = nos[indice].m
    if (!marcas.botaoMel && !(marcas.casa && marcas.folha && nos[indice].visivel)) return
    // Um texto com fundo opaco próprio (o dia do h1 em 390) fica sobre ele: a cadeia de fundos já o lê.
    if (!marcas.botaoMel && fundoOpaco(nos[indice].estilo.backgroundColor)) return
    if (typeof document.elementsFromPoint !== 'function') return
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'center', inline: 'nearest' })
      rolou = true
    }
    const r = el.getBoundingClientRect()
    const pilhas = document.elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    for (const abaixo of pilhas) {
      if (abaixo === el || el.contains(abaixo)) continue
      const cor = getComputedStyle(abaixo).backgroundColor
      if (cor && cor !== 'transparent' && !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)/.test(cor)) {
        nos[indice].fundoSob = cor
        break
      }
    }
  })
  if (rolou) window.scrollTo(sx, sy)

  // REP-HOME: o que as regras do Início leem do documento. A altura do cabeçalho; as animações que rodam na casa depois
  // do carregamento (em movimento reduzido são 0); a janela da placa em 390; e a parcela de noite das duas primeiras
  // telas, amostrada por geometria (uma grade de 48 × 30 pontos por tela; o primeiro fundo opaco por baixo de cada
  // ponto, ou a metade da noite da placa) em vez de por pixel.
  const cabecalho = document.querySelector('[data-cabecalho]')
  doc.cabecalhoAltura = cabecalho ? cabecalho.getBoundingClientRect().height : Number.NaN
  doc.animacoesCasa =
    typeof document.getAnimations === 'function'
      ? document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('[data-casa]') != null).length
      : null
  {
    const imagem = document.querySelector('[data-cena-heroi] img:not([data-luz])')
    const r = imagem ? imagem.getBoundingClientRect() : null
    doc.placa390 = r && window.innerWidth <= 767 ? { x: r.x + sx, y: r.y + sy, w: r.width, h: r.height } : null
  }
  doc.noite = null
  if (typeof document.elementsFromPoint === 'function') {
    const colunas = 48
    const linhas = 30
    const larguraJanela = window.innerWidth
    const alturaJanela = window.innerHeight
    const alturaCabecalho = Number.isFinite(doc.cabecalhoAltura) ? doc.cabecalhoAltura : 0
    const placa = document.querySelector('[data-cena-heroi] img:not([data-luz])')
    const lerCor = (texto) => {
      const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?/.exec(texto || '')
      return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null
    }
    const perto = (c, alvo) => Math.abs(c.r - alvo[0]) <= 2 && Math.abs(c.g - alvo[1]) <= 2 && Math.abs(c.b - alvo[2]) <= 2
    const porRolagem = []
    for (const alvo of [0, alturaJanela]) {
      window.scrollTo(0, alvo)
      const celula = (larguraJanela / colunas) * (alturaJanela / linhas)
      let noturno = 0
      for (let i = 0; i < colunas; i += 1) {
        for (let j = 0; j < linhas; j += 1) {
          const x = ((i + 0.5) * larguraJanela) / colunas
          const y = ((j + 0.5) * alturaJanela) / linhas
          if (y < alturaCabecalho) continue
          for (const el of document.elementsFromPoint(x, y)) {
            if (el === placa) {
              const rp = el.getBoundingClientRect()
              if (x >= rp.x + (910 / 1672) * rp.width) noturno += celula
              break
            }
            const c = lerCor(getComputedStyle(el).backgroundColor)
            if (c && c.a >= 0.999) {
              if (perto(c, [43, 35, 32]) || perto(c, [110, 101, 96])) noturno += celula
              break
            }
          }
        }
      }
      porRolagem.push({ rolagem: window.scrollY, total: larguraJanela * alturaJanela, noite: noturno, cabecalho: larguraJanela * alturaCabecalho })
    }
    window.scrollTo(sx, sy)
    doc.noite = { porRolagem }
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

/**
 * As rotas que pedem sessão: as do app (app/...) e as da moderação (moderacao e moderacao/...). As
 * públicas abrem direto.
 */
export function rotaExigeSessao(rota) {
  return typeof rota === 'string' && (rota.startsWith('app/') || /^moderacao(?:[/?]|$)/.test(rota))
}

/** A conta padrão da rota: o moderador na moderação, a responsável no app; nula na rota pública. */
function contaPadrao(rota) {
  if (!rotaExigeSessao(rota)) return null
  return rota.startsWith('moderacao') ? 'moderador' : 'responsavel'
}

/** O h1 da tela de login (`MANCHETES.entrar` de web/src/conteudo/conta.ts, uma frase só). */
export const MANCHETE_LOGIN = 'Pode entrar.'

/** As rotas de acesso, em que o h1 do login é o esperado. */
const CAMINHOS_DE_ACESSO = ['/entrar', '/criar-conta', '/recuperar-acesso', '/convite']

/** O caminho em que o caso tem de terminar: o `caminho` do caso, senão a rota (a sessão termina em /app/sessao). Sem busca. */
export function caminhoEsperado({ caso, rota, caminho }, base) {
  if (typeof caminho === 'string') return new URL(caminho.replace(/^\/+/, ''), base).pathname
  if (caso === 'sessao') return new URL('app/sessao', base).pathname
  return new URL(rota, base).pathname
}

/**
 * Falha fechado antes de medir: `location.pathname` é o esperado e a página tem um h1 que não é o
 * do login (sem sessão, a guarda leva a /entrar). Devolve o que viu: `{ caminho, h1_texto }`.
 */
export async function verificarPagina(cdp, esperado) {
  const visto = await avaliar(cdp, `(() => { const h1 = document.querySelector('h1'); return { caminho: location.pathname, h1_texto: h1 ? h1.textContent : null } })()`)
  if (!visto || typeof visto.caminho !== 'string') throw new Error(`não li o caminho da página (${JSON.stringify(visto)})`)
  if (visto.caminho !== esperado) throw new Error(`caminho ${visto.caminho}, esperado ${esperado} (sem sessão a guarda leva a /entrar)`)
  const h1 = typeof visto.h1_texto === 'string' ? visto.h1_texto.replace(/\s+/g, ' ').trim() : ''
  if (h1 === '') throw new Error(`a página ${visto.caminho} está sem h1`)
  // Sem espaço nenhum na comparação: as duas linhas do h1 do login podem vir sem espaço entre elas.
  const semEspaco = (texto) => texto.replace(/\s+/g, '')
  // As telas de acesso (DS1:RF-15) têm o h1 do login por definição: a manchete só denuncia a guarda nas outras rotas.
  const ehTelaDeAcesso = CAMINHOS_DE_ACESSO.includes(esperado)
  if (!ehTelaDeAcesso && semEspaco(h1).includes(semEspaco(MANCHETE_LOGIN))) throw new Error(`o h1 é o h1 do login ("${MANCHETE_LOGIN}") em ${visto.caminho}`)
  return { caminho: visto.caminho, h1_texto: h1 }
}

/**
 * Entra com uma conta de demonstração em modo memória (`conta`: `responsavel`, a padrão, ou
 * `moderador`): abre /entrar, preenche e envia o formulário e espera a SPA chegar a /app/. Sem
 * recarregar depois, a sessão (só em memória) continua viva. A senha nunca sai em mensagem.
 */
export async function entrarNaDemonstracao(cdp, base, { voltas = 80, conta = 'responsavel' } = {}) {
  if (!ehContaDeMedicao(conta)) throw new Error(`conta inválida: ${JSON.stringify(conta)} (use ${Object.keys(CONTAS_DE_MEDICAO).join(' ou ')})`)
  const { email } = CONTAS_DE_MEDICAO[conta]
  await cdp.enviar('Page.navigate', { url: new URL('entrar', base).href })
  await esperarPronto(cdp)
  const preencheu = await avaliar(
    cdp,
    `(async () => {
      const email = document.querySelector('input[type=email], input[name=email], input[autocomplete=username]')
      const senha = document.querySelector('input[type=password]')
      if (!email || !senha) return false
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(email, ${JSON.stringify(email)})
      email.dispatchEvent(new Event('input', {bubbles:true}))
      setter.call(senha, ${JSON.stringify(SENHA_DE_MEDICAO)})
      senha.dispatchEvent(new Event('input', {bubbles:true}))
      await new Promise((r) => setTimeout(r, 100))
      senha.form.requestSubmit()
      return true
    })()`,
  )
  if (!preencheu) throw new Error('não consegui entrar na demonstração: não achei os campos de e-mail e senha em /entrar')
  for (let i = 0; i < voltas; i += 1) {
    if (await avaliar(cdp, `location.pathname.includes('/app/')`)) {
      await esperarPronto(cdp)
      return
    }
    await espera(100)
  }
  throw new Error('não consegui entrar na demonstração: o login não levou a /app/')
}

/** Vai à rota do app dentro da SPA, sem recarregar (a sessão em memória não sobrevive a um reload). */
async function irPelaSpa(cdp, base, rota) {
  const caminho = new URL(rota, base).pathname
  await avaliar(cdp, `(() => { history.pushState({}, '', ${JSON.stringify(caminho)}); dispatchEvent(new PopStateEvent('popstate')); return true })()`)
  await espera(400)
  await esperarPronto(cdp)
}

/**
 * A expressão que clica o primeiro elemento VISÍVEL (`checkVisibility` e largura e altura > 0) de
 * `seletor` e devolve true; false se não há nenhum. O seletor não pode ter aspas simples.
 */
function clicarVisivel(seletor) {
  return `(() => { const aparece = (e) => { if (!e.checkVisibility({ visibilityProperty: true })) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }; const b = [...document.querySelectorAll('${seletor}')].find(aparece); if (!b) return false; b.click(); return true })()`
}

/**
 * Liga o modo madrugada como a pessoa faz: o botão visível do cabeçalho; senão o Menu do celular
 * (abre, clica o botão dentro dele e fecha o menu de novo). Nunca põe `data-tema` direto. Devolve
 * true se clicou o botão, false se não achou em lugar nenhum (o menu que abriu é fechado).
 */
async function ligarMadrugada(cdp) {
  if (await avaliar(cdp, clicarVisivel('[data-cabecalho] button[aria-pressed]'))) return true
  if (!(await avaliar(cdp, clicarVisivel('[data-cabecalho] button[aria-controls][aria-expanded="false"]')))) return false
  await espera(300)
  const clicou = await avaliar(cdp, clicarVisivel('[data-menu-celular] button[aria-pressed]'))
  await avaliar(cdp, clicarVisivel('[data-cabecalho] button[aria-controls][aria-expanded="true"]'))
  return Boolean(clicou)
}

/** A linha de stdout de um pedido que não se aplica à página: `NAO_SE_APLICA <caso>_<tema>_<largura>: <mensagem>`. */
export function linhaNaoSeAplica({ caso, tema, largura }, mensagem) {
  return `NAO_SE_APLICA ${caso}_${tema}_${largura}: ${mensagem}`
}

/**
 * O pedido que não se aplica sem nem abrir a página: o Início em madrugada (o Início é sempre claro,
 * é público e não tem o botão "Modo madrugada"). Devolve a mensagem, ou nulo se o pedido segue.
 * Nunca liga a madrugada nem mexe em `data-tema`: só o pedido deixa de existir.
 */
export function naoSeAplicaSemAbrir({ caso, tema, rota }) {
  if (tema === 'madrugada' && CASOS_INICIO.includes(caso)) {
    return `o caso ${caso} em madrugada não se aplica: o Início é sempre claro, é público (rota "${rota ?? ''}") e não tem o botão "Modo madrugada"`
  }
  return null
}

export async function abrirCaso(cdp, base, { caso, tema, rota, conta }, { voltas } = {}) {
  // Movimento reduzido sempre (G12): as medidas e as capturas usam o mesmo modo.
  await cdp.enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  if (rotaExigeSessao(rota)) {
    await entrarNaDemonstracao(cdp, base, { voltas, conta: conta ?? contaPadrao(rota) })
    await irPelaSpa(cdp, base, rota)
  } else {
    await cdp.enviar('Page.navigate', { url: new URL(rota, base).href })
    await esperarPronto(cdp)
  }
  if (tema === 'madrugada') {
    if (!(await ligarMadrugada(cdp))) {
      const procurado = 'o botão "Modo madrugada" nem no cabeçalho nem no menu do celular'
      // Fail closed: numa rota logada o botão tem de existir; só a rota pública pode não tê-lo.
      if (rotaExigeSessao(rota)) throw new Error(`não achei ${procurado} numa rota logada (${rota})`)
      return { naoSeAplica: `o caso ${caso} em madrugada não se aplica: a rota pública "${rota}" não tem ${procurado}` }
    }
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

/** O arquivo da medida de um pedido: `<caso>_<tema>_<largura>.json`. */
const arquivoDoPedido = ({ caso, tema, largura }) => `${caso}_${tema}_${largura}.json`

/**
 * Mede um pedido: abre o caso (com a conta, se a rota pede sessão), confere o caminho final e o h1
 * (`verificarPagina`), coleta, avalia e grava `<pasta>/<caso>_<tema>_<largura>.json`. Devolve
 * `{ arquivo, resultados }` ou `{ naoSeAplica }`. Qualquer falha lança `<caso>: <motivo>` antes de
 * gravar: sem JSON.
 */
export async function medirPedido(cdp, base, pedido, pasta, opcoes = {}) {
  try {
    await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: pedido.largura, height: pedido.altura, deviceScaleFactor: 1, mobile: false })
    const aberto = await abrirCaso(cdp, base, pedido, opcoes)
    if (aberto?.naoSeAplica) return { naoSeAplica: aberto.naoSeAplica }
    const pagina = await verificarPagina(cdp, caminhoEsperado(pedido, base))
    const leitura = await avaliar(cdp, `(${coletarNaPagina.toString()})()`)
    const resultados = avaliarTudo({ ...leitura, tema: pedido.tema, caso: pedido.caso, rota: pedido.rota })
    const arquivo = arquivoDoPedido(pedido)
    const medidas = {
      largura: leitura.doc.largura,
      clientWidth: leitura.doc.clientWidth,
      tokens: leitura.doc.tokens,
      h1: leitura.nos.find((n) => n.tag === 'h1')?.rect ?? null,
      nos: leitura.nos.length,
      caminho: pagina.caminho,
      h1_texto: pagina.h1_texto,
    }
    fs.writeFileSync(
      path.join(pasta, arquivo),
      JSON.stringify({ caso: pedido.caso, tema: pedido.tema, largura: pedido.largura, altura: pedido.altura, rota: pedido.rota, medido_em: new Date().toISOString(), medidas, resultados }, null, 2),
    )
    return { arquivo, resultados }
  } catch (erro) {
    throw new Error(`${pedido.caso}: ${erro.message}`)
  }
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

// O ambiente da sessão (BASE_URL e CDP_PORTA) pode vir do `.oc/ambiente.json` do checkout; a variável de ambiente vale mais.
function lerAmbienteDoCartao() {
  try {
    return JSON.parse(fs.readFileSync(path.resolve('.oc/ambiente.json'), 'utf8'))
  } catch {
    return {}
  }
}

async function principal(argumentos) {
  let pasta
  let pedidos
  const ambiente = lerAmbienteDoCartao()
  const baseUrl = process.env.BASE_URL ?? ambiente.BASE_URL ?? 'http://127.0.0.1:5244/'
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
  const porta = Number(process.env.CDP_PORTA ?? ambiente.CDP_PORTA ?? 9344)
  fs.mkdirSync(pasta, { recursive: true })
  // Falha fechado: o JSON velho de cada pedido sai antes de qualquer medida, então um pedido que
  // falha (ou que não chega a ser medido) nunca deixa uma medida antiga no lugar da nova.
  for (const pedido of pedidos) fs.rmSync(path.join(pasta, arquivoDoPedido(pedido)), { force: true })
  let cdp
  try {
    for (const pedido of pedidos) {
      // O que não se aplica sai antes de qualquer página: o Chrome só abre para o primeiro pedido que precisa dele.
      const semAbrir = naoSeAplicaSemAbrir(pedido)
      if (semAbrir !== null) {
        console.log(linhaNaoSeAplica(pedido, semAbrir))
        continue
      }
      cdp ??= await abrirAlvo(porta).catch((erro) => {
        throw new Error(`${pedido.caso}: ${erro.message}`)
      })
      const medido = await medirPedido(cdp, baseUrl, pedido, pasta)
      if (medido.naoSeAplica) {
        // Não é falha nem medida: sem JSON, o pedido segue para o próximo e a saída continua 0.
        console.log(linhaNaoSeAplica(pedido, medido.naoSeAplica))
        continue
      }
      console.log(resumo(medido.arquivo, medido.resultados))
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
