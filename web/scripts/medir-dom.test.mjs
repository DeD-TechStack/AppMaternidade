// Testes da parte pura do medidor (node --test web/scripts/medir-dom.test.mjs). Para cada regra:
// um caso que passa, um que falha e um de borda; e os casos em que a medida falha fechado.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { JSDOM, VirtualConsole } from 'jsdom'
import {
  a1,
  a2,
  a2b,
  a3,
  a4,
  a5,
  a6,
  areaUtilDe,
  avaliarCriterios,
  avaliarTudo,
  b1,
  b2,
  b3,
  bloqueantesDoCaso,
  c1,
  c2,
  c3,
  CASOS_DE_ACESSO,
  coletarNaPagina,
  contraste,
  criteriosDoCaso,
  d3Anel,
  d3Controle,
  d3Fio,
  d3Fuso,
  d4Vao,
  d5Anel,
  d5Erro,
  d6Selecao,
  e1,
  e2,
  e3,
  e4,
  e5,
  e6,
  e7,
  escolherAmbiente,
  fundoReal,
  lerArquivoAmbiente,
  lerErrosDeCampoNaPagina,
  lerEstadoDeEnvioNaPagina,
  lerFocoNaPagina,
  lerGeometriaDosCamposNaPagina,
  lerSelecaoNaPagina,
  m1,
  m2,
  m3,
  m4,
  m5,
  m6,
  MANUAIS_DO_CASO,
  r1,
  r2,
  r3,
  verificarAmbiente,
  g1,
  g2,
  g3,
  g4,
  g5,
  g6,
  g7,
  g8,
  g9,
  g10,
  g11,
  g12,
  lerArgumentos,
  margemDe,
  num,
  parseCor,
  resumo,
  sb3,
  verificarLoopback,
  xDaColuna,
} from './medir-dom.mjs'

const PAPEL = 'rgb(246, 239, 227)'
const TINTA = 'rgb(26, 21, 17)'
const TRANSPARENTE = 'rgba(0, 0, 0, 0)'

/** Mescla `estilo` e `m` (um nível), para um ajuste fino não apagar o resto do nó. */
function com(base, extra = {}) {
  return { ...base, ...extra, estilo: { ...base.estilo, ...(extra.estilo ?? {}) }, m: { ...base.m, ...(extra.m ?? {}) } }
}

/** Um nó de texto comum, sobre o papel, sem nada de especial. */
function criar(extra = {}) {
  const base = {
    tag: 'p',
    texto: 'Olá',
    visivel: true,
    rect: { x: 32, y: 100, w: 300, h: 28 },
    estilo: {
      fontSize: '20px',
      lineHeight: '28px',
      fontWeight: '400',
      textTransform: 'none',
      boxShadow: 'none',
      borderTopLeftRadius: '0px',
      borderTopRightRadius: '0px',
      borderBottomRightRadius: '0px',
      borderBottomLeftRadius: '0px',
      borderTopWidth: '0px',
      borderRightWidth: '0px',
      borderBottomWidth: '0px',
      borderLeftWidth: '0px',
      borderTopStyle: 'none',
      borderRightStyle: 'none',
      borderBottomStyle: 'none',
      borderLeftStyle: 'none',
      backgroundColor: TRANSPARENTE,
      color: TINTA,
      opacity: '1',
      transform: 'none',
      position: 'static',
      top: 'auto',
    },
    m: {},
    cadeia: [TRANSPARENTE, PAPEL],
  }
  return com(base, extra)
}

const doc1440 = { largura: 1440, altura: 900, clientWidth: 1425, scrollWidth: 1425, grupos: [] }

// --- Fixtures do envio do formulário (E-7 e R-3) ---------------------------------------------

const mensagemDeEnvio = (extra = {}) => ({ tipo: 'erro', texto: 'Escreva o seu e-mail.', linhas: 1, cortada: false, foraDaJanela: false, ...extra })

/**
 * Um estado lido por `lerEstadoDeEnvioNaPagina`: as linhas de campo pelas alturas (o topo de cada uma é o
 * fim da anterior, a partir de 400) e o botão de envio 40 px depois da última (`botao: null` o tira).
 */
function estadoDeEnvio({ pagina = 2000, alturas = [112, 112], botao, mensagens = [], colisoes = [] } = {}) {
  let topo = 400
  const linhas = alturas.map((altura) => {
    const linha = { top: topo, altura }
    topo += altura
    return linha
  })
  const botaoLido = botao === undefined ? { top: topo + 40 } : botao === null ? null : { top: botao }
  return { pagina, linhas, botao: botaoLido, mensagens, colisoes }
}

/**
 * A caixa do primeiro controle em 1440 (o `input` de 56 px, y 383 a 439): o anel de foco (2 px de largura mais 2 de
 * offset) vai de y 379 a 443. A mensagem do campo (24 px de caixa, 17 px de letra) tem a tinta a partir de
 * `topoLetra`: 447 é a folga mínima de 4 px; os 445 de hoje (a captura do HEAD) são 2 px.
 */
const CAIXA_DO_CONTROLE = { top: 383, bottom: 439, left: 480, right: 1100 }
const mensagemDoFoco = (extra = {}) => ({
  tipo: 'ajuda',
  texto: 'É o nome que a família vai ver.',
  top: 442,
  bottom: 466,
  left: 480,
  right: 1100,
  topoLetra: 447,
  medida: 'tinta',
  ...extra,
})
const ANEL_OK = {
  focou: true,
  tag: 'input',
  outlineStyle: 'solid',
  outlineWidth: '2px',
  outlineOffset: '2px',
  outlineColor: 'rgb(26, 21, 17)',
  caixa: { ...CAIXA_DO_CONTROLE },
  mensagens: [mensagemDoFoco()],
}
const FOCO_OK = { controle: ANEL_OK, botao: { ...ANEL_OK, tag: 'button' } }
/** O foco lido depois do envio vazio: o erro no lugar da ajuda, com a mesma folga. */
const focoDoErro = () => ({
  controle: { ...ANEL_OK, caixa: { ...CAIXA_DO_CONTROLE }, mensagens: [mensagemDoFoco({ tipo: 'erro', texto: 'Escreva o seu e-mail.' })] },
  botao: { ...ANEL_OK, tag: 'button' },
})

/** O estado estável: 1440, o envio vazio não mexe em nada e aparecem os dois erros de uma linha. */
const vazioEstavel = () => ({
  antes: estadoDeEnvio(),
  depois: estadoDeEnvio({ mensagens: [mensagemDeEnvio(), mensagemDeEnvio({ texto: 'Escreva a sua senha.' })] }),
  foco: focoDoErro(),
})
/** O Recuperar enviado: um campo, e a confirmação (1 linha) ocupa a mesma linha de campo. */
const enviadoEstavel = () => ({
  antes: estadoDeEnvio({ alturas: [112] }),
  depois: estadoDeEnvio({ alturas: [112], mensagens: [mensagemDeEnvio({ tipo: 'status', texto: 'Se o e-mail existir, o link chega em instantes.' })] }),
})
const doc390 = { largura: 390, altura: 844, clientWidth: 375, scrollWidth: 375, grupos: [] }

const cabecalho = (extra = {}) =>
  com(
    criar({
      tag: 'header',
      texto: '',
      rect: { x: 0, y: 0, w: 1425, h: 64 },
      estilo: { position: 'sticky', top: '0px', backgroundColor: PAPEL },
      m: { cabecalho: true },
    }),
    extra,
  )

describe('parseCor, fundoReal e contraste', () => {
  it('lê rgb, rgba, a forma com espaços, color(srgb) e transparent', () => {
    assert.deepEqual(parseCor('rgb(26, 21, 17)'), { r: 26, g: 21, b: 17, a: 1 })
    assert.deepEqual(parseCor('rgba(0, 0, 0, 0.2)'), { r: 0, g: 0, b: 0, a: 0.2 })
    assert.deepEqual(parseCor('rgb(26 21 17 / 50%)'), { r: 26, g: 21, b: 17, a: 0.5 })
    assert.deepEqual(parseCor('color(srgb 1 0 0 / 0.5)'), { r: 255, g: 0, b: 0, a: 0.5 })
    assert.deepEqual(parseCor('transparent'), { r: 0, g: 0, b: 0, a: 0 })
  })

  it('devolve nulo para o que não entende', () => {
    assert.equal(parseCor('oklch(0.5 0.1 20)'), null)
    assert.equal(parseCor(undefined), null)
    assert.equal(parseCor(''), null)
  })

  it('a tinta sobre o papel tem 15,85:1 e o urucum com o texto do botão, 5,54:1', () => {
    assert.ok(Math.abs(contraste(TINTA, [TRANSPARENTE, PAPEL]) - 15.85) < 0.05)
    assert.ok(Math.abs(contraste('rgb(255, 248, 238)', ['rgb(176, 64, 28)', PAPEL]) - 5.54) < 0.05)
  })

  it('compõe o alfa do fundo e do texto sobre o primeiro fundo opaco', () => {
    const fundo = fundoReal(['rgba(0, 0, 0, 0.5)', 'rgb(255, 255, 255)'])
    assert.ok(Math.abs(fundo.r - 127.5) < 0.01)
    assert.ok(contraste('rgba(0, 0, 0, 0.5)', ['rgb(255, 255, 255)']) < 4.5)
  })

  it('falha fechado: sem ancestral opaco, o contraste é incalculável', () => {
    assert.equal(fundoReal([TRANSPARENTE, TRANSPARENTE]), null)
    assert.equal(contraste(TINTA, [TRANSPARENTE]), null)
    assert.equal(contraste(TINTA, []), null)
    assert.equal(contraste('cor-estranha', [PAPEL]), null)
  })
})

describe('a grade', () => {
  it('a margem é 32, 24 e 16 pelos pontos 992 e 768', () => {
    assert.deepEqual([1440, 992, 991, 768, 767, 390].map(margemDe), [32, 32, 24, 24, 16, 16])
  })

  it('a área útil vai a 1600 (640 abaixo de 768) e as colunas seguem a fórmula do glossário', () => {
    assert.equal(areaUtilDe(1440, 1440), 1376)
    assert.equal(areaUtilDe(2000, 2000), 1600)
    assert.equal(areaUtilDe(700, 700), 640)
    assert.equal(areaUtilDe(390, 375), 343)
    assert.ok(Math.abs(xDaColuna(2, 1440, 1440) - 169.6) < 1e-9)
    assert.ok(Math.abs(xDaColuna(9, 1440, 1440) - 1132.8) < 1e-9)
    assert.equal(xDaColuna(1, 390, 390), 16)
    assert.equal(xDaColuna(2, 390, 390), 16)
  })
})

describe('G1: scrollWidth == clientWidth', () => {
  it('passa quando são iguais', () => assert.equal(g1({ scrollWidth: 1425, clientWidth: 1425 }).ok, true))
  it('falha com rolagem horizontal', () => assert.equal(g1({ scrollWidth: 1500, clientWidth: 1425 }).ok, false))
  it('borda: 1 px a mais já falha', () => assert.equal(g1({ scrollWidth: 1426, clientWidth: 1425 }).ok, false))
  it('falha fechado sem a medida', () => {
    assert.equal(g1({ clientWidth: 1425 }).ok, false)
    assert.equal(g1({ scrollWidth: 1425 }).ok, false)
    assert.equal(g1(undefined).ok, false)
  })
})

describe('G2: o cabeçalho', () => {
  const nome = (x) => criar({ tag: 'a', texto: 'AppMaternidade', rect: { x, y: 20, w: 170, h: 44 }, m: { nomeSite: true } })

  it('passa: 64 px, sticky, top 0, opaco, sem border-bottom e o nome em x=32', () => {
    const r = g2([cabecalho(), nome(32)], doc1440)
    assert.equal(r.ok, true, r.motivo)
  })

  it('falha: sem sticky, com border-bottom, fundo transparente ou altura errada', () => {
    assert.equal(g2([cabecalho({ estilo: { position: 'fixed' } }), nome(32)], doc1440).ok, false)
    assert.equal(g2([cabecalho({ estilo: { borderBottomWidth: '1px', borderBottomStyle: 'solid' } }), nome(32)], doc1440).ok, false)
    assert.equal(g2([cabecalho({ estilo: { backgroundColor: TRANSPARENTE } }), nome(32)], doc1440).ok, false)
    assert.equal(g2([cabecalho({ rect: { x: 0, y: 0, w: 1425, h: 80 } }), nome(32)], doc1440).ok, false)
    assert.equal(g2([cabecalho(), nome(48)], doc1440).ok, false)
  })

  it('borda: 64,4 px passa (tolerância de meio pixel) e top 1px falha', () => {
    assert.equal(g2([cabecalho({ rect: { x: 0, y: 0, w: 1425, h: 64.4 } }), nome(32)], doc1440).ok, true)
    assert.equal(g2([cabecalho({ estilo: { top: '1px' } }), nome(32)], doc1440).ok, false)
  })

  it('falha fechado: sem cabeçalho, sem nome ou sem largura', () => {
    assert.equal(g2([nome(32)], doc1440).ok, false)
    assert.equal(g2([cabecalho()], doc1440).ok, false)
    assert.equal(g2([cabecalho({ rect: { x: 0, y: 0, w: 0, h: 64 } }), nome(32)], doc1440).ok, false)
  })

  it('abaixo de 768: 60 px, o botão do menu em x=16 e o nome entre o menu e o botão da direita', () => {
    const menu = criar({ tag: 'button', texto: '', rect: { x: 16, y: 8, w: 44, h: 44 }, m: { menuBotao: true } })
    const acao = criar({ tag: 'button', texto: '', rect: { x: 280, y: 8, w: 79, h: 44 }, m: { acaoCabecalho: true } })
    const cab = cabecalho({ rect: { x: 0, y: 0, w: 375, h: 60 } })
    assert.equal(g2([cab, nome(100), menu, acao], doc390).ok, true)
    assert.equal(g2([cabecalho(), nome(100), menu, acao], doc390).ok, false)
    assert.equal(g2([cab, nome(300), menu, acao], doc390).ok, false)
    assert.equal(g2([cab, nome(100), acao], doc390).ok, false)
  })
})

describe('G3: os filhos diretos de main', () => {
  const filho = (x) => criar({ tag: 'section', texto: '', rect: { x, y: 0, w: 100, h: 100 }, m: { filhoDeMain: true } })

  it('passa em x=32 e no x de c2 (169,6; com a barra de rolagem, 168,1)', () => {
    assert.equal(g3([filho(32), filho(168.1)], doc1440).ok, true)
  })

  it('falha fora das duas posições', () => {
    const r = g3([filho(32), filho(100)], doc1440)
    assert.equal(r.ok, false)
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('borda: ±2 px passam e 3 px a mais falham', () => {
    assert.equal(g3([filho(170.1)], doc1440).ok, true)
    assert.equal(g3([filho(171.2)], doc1440).ok, false)
  })

  it('em 390, só x=16', () => {
    assert.equal(g3([filho(16)], doc390).ok, true)
    assert.equal(g3([filho(32)], doc390).ok, false)
  })

  it('falha fechado sem filho de main e com filho sem x', () => {
    assert.equal(g3([criar()], doc1440).ok, false)
    assert.equal(g3([criar({ m: { filhoDeMain: true }, rect: {} })], doc1440).ok, false)
  })
})

describe('G4: o conjunto de font-size e a caixa alta', () => {
  it('passa com tamanhos do conjunto, inclusive o 15 e o 224', () => {
    const r = g4([criar(), criar({ estilo: { fontSize: '15px' } }), criar({ estilo: { fontSize: '224px' } })])
    assert.equal(r.ok, true, r.motivo)
  })

  it('falha com um tamanho fora do conjunto e com uppercase', () => {
    assert.equal(g4([criar({ estilo: { fontSize: '18px' } })]).ok, false)
    assert.equal(g4([criar({ estilo: { textTransform: 'uppercase' } })]).ok, false)
  })

  it('o nome gigante do rodapé é fluido e fica de fora do conjunto', () => {
    assert.equal(g4([criar(), criar({ estilo: { fontSize: '171.3px' }, m: { nomeRodape: true } })]).ok, true)
    assert.equal(g4([criar({ estilo: { fontSize: '171.3px' } })]).ok, false)
  })

  it('borda: 14,98 px falha (a tolerância é de 0,01 px) e 15 px passa', () => {
    assert.equal(g4([criar({ estilo: { fontSize: '14.98px' } })]).ok, false)
    assert.equal(g4([criar({ estilo: { fontSize: '15px' } })]).ok, true)
  })

  it('falha fechado: nenhum nó com texto, ou font-size ausente', () => {
    assert.equal(g4([criar({ texto: '' })]).ok, false)
    assert.equal(g4([]).ok, false)
    assert.equal(g4([criar({ estilo: { fontSize: undefined } })]).ok, false)
  })
})

describe('G5: o h1', () => {
  const h1 = (extra = {}) =>
    com(criar({ tag: 'h1', texto: 'Sistema', rect: { x: 32, y: 0, w: 400, h: 96 }, estilo: { fontSize: '96px', lineHeight: '96px', fontWeight: '600' } }), extra)

  it('passa em 1440 (96/96), de 768 a 991 (80/80) e abaixo de 768 (48/48)', () => {
    assert.equal(g5([h1()], doc1440).ok, true)
    assert.equal(g5([h1({ estilo: { fontSize: '80px', lineHeight: '80px' }, rect: { x: 24, y: 0, w: 100, h: 80 } })], { ...doc1440, largura: 800 }).ok, true)
    assert.equal(g5([h1({ estilo: { fontSize: '48px', lineHeight: '48px' }, rect: { x: 16, y: 0, w: 100, h: 48 } })], doc390).ok, true)
  })

  it('falha com o tamanho de outra largura, peso diferente, entrelinha diferente ou x errado', () => {
    assert.equal(g5([h1({ estilo: { fontSize: '80px', lineHeight: '80px' } })], doc1440).ok, false)
    assert.equal(g5([h1({ estilo: { fontWeight: '700' } })], doc1440).ok, false)
    assert.equal(g5([h1({ estilo: { lineHeight: '100px' } })], doc1440).ok, false)
    assert.equal(g5([h1({ rect: { x: 64, y: 0, w: 100, h: 96 } })], doc1440).ok, false)
  })

  it('borda: x=32,8 passa e x=33,5 falha', () => {
    assert.equal(g5([h1({ rect: { x: 32.8, y: 0, w: 100, h: 96 } })], doc1440).ok, true)
    assert.equal(g5([h1({ rect: { x: 33.5, y: 0, w: 100, h: 96 } })], doc1440).ok, false)
  })

  it('falha fechado: sem h1 e com line-height "normal"', () => {
    assert.equal(g5([criar()], doc1440).ok, false)
    assert.equal(g5([h1({ estilo: { lineHeight: 'normal' } })], doc1440).ok, false)
  })
})

describe('G6: sombra, raio e borda', () => {
  const borda4 = { borderTopWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px', borderTopStyle: 'solid', borderRightStyle: 'solid', borderBottomStyle: 'solid', borderLeftStyle: 'solid' }
  const raio = (v) => ({ borderTopLeftRadius: v, borderTopRightRadius: v, borderBottomRightRadius: v, borderBottomLeftRadius: v })

  it('passa com raios em {0, 4, 8, 50%} e a borda de 4 lados só na moldura dupla (e dentro dela)', () => {
    const r = g6([
      criar({ estilo: raio('8px') }),
      criar({ estilo: raio('4px') }),
      criar({ estilo: raio('50%') }),
      criar({ estilo: { ...borda4, ...raio('8px') }, m: { moldura: true } }),
    ])
    assert.equal(r.ok, true, r.motivo)
  })

  it('falha com sombra, com raio de 12 px e com borda de 4 lados fora da moldura', () => {
    assert.equal(g6([criar({ estilo: { boxShadow: 'rgba(0, 0, 0, 0.2) 0px 2px 4px 0px' } })]).ok, false)
    assert.equal(g6([criar({ estilo: raio('12px') })]).ok, false)
    assert.equal(g6([criar({ estilo: borda4 })]).ok, false)
  })

  it('borda: uma borda só embaixo passa; raio 8px 4px (elíptico) passa, 8px 9px falha', () => {
    assert.equal(g6([criar({ estilo: { borderBottomWidth: '1px', borderBottomStyle: 'solid' } })]).ok, true)
    assert.equal(g6([criar({ estilo: { borderTopLeftRadius: '8px 4px' } })]).ok, true)
    assert.equal(g6([criar({ estilo: { borderTopLeftRadius: '8px 9px' } })]).ok, false)
  })

  it('falha fechado: sem nós e sem estilo', () => {
    assert.equal(g6([]).ok, false)
    assert.equal(g6([{ tag: 'div', visivel: true }]).ok, false)
  })
})

describe('G7: onde podem ficar o urucum, o barro e a lavanda', () => {
  const urucum = 'rgb(176, 64, 28)'
  const barro = 'rgb(201, 163, 154)'

  it('passa: urucum em botão primário e no rodapé, barro em [data-midia] vazia', () => {
    const r = g7([
      criar({ tag: 'button', estilo: { backgroundColor: urucum }, m: { botaoPrimario: true } }),
      criar({ tag: 'footer', estilo: { backgroundColor: urucum }, m: { doRodape: true, rodape: true } }),
      criar({ tag: 'div', texto: '', estilo: { backgroundColor: barro }, m: { midia: true }, textoDentro: '' }),
    ])
    assert.equal(r.ok, true, r.motivo)
  })

  it('falha: urucum num cartão, barro fora de mídia e mídia com texto dentro', () => {
    assert.equal(g7([criar({ estilo: { backgroundColor: urucum } })]).ok, false)
    assert.equal(g7([criar({ estilo: { backgroundColor: barro } })]).ok, false)
    assert.equal(g7([criar({ estilo: { backgroundColor: barro }, m: { midia: true }, textoDentro: 'Legenda' })]).ok, false)
  })

  it('borda: o urucum da madrugada (#C47055) vale o mesmo; uma cor parecida (#B0411C) ainda é urucum; um cinza não', () => {
    assert.equal(g7([criar({ estilo: { backgroundColor: 'rgb(196, 112, 85)' } })]).ok, false)
    assert.equal(g7([criar({ estilo: { backgroundColor: 'rgb(176, 65, 28)' } })]).ok, false)
    assert.equal(g7([criar({ estilo: { backgroundColor: 'rgb(128, 128, 128)' } })]).ok, true)
  })

  it('falha fechado: mídia sem a leitura do texto de dentro, fundo ilegível e nenhum nó', () => {
    assert.equal(g7([criar({ m: { midia: true } })]).ok, false)
    assert.equal(g7([criar({ estilo: { backgroundColor: 'oklch(0.5 0.1 20)' } })]).ok, false)
    assert.equal(g7([]).ok, false)
  })
})

describe('G8: o ritmo vertical e as colunas lado a lado', () => {
  const bloco = (y, h, extra = {}) => criar({ tag: 'section', texto: '', rect: { x: 32, y, w: 1000, h }, m: { filhoDeMain: true }, ...extra })
  const rodape = (y) => criar({ tag: 'footer', texto: '', rect: { x: 0, y, w: 1425, h: 900 }, m: { rodape: true } })

  it('passa: vãos de 32, 128, 160 e 192 até o rodapé, e colunas com 100 px de diferença', () => {
    const nos = [bloco(0, 200), bloco(232, 300), bloco(660, 500), bloco(1320, 400), rodape(1912)]
    const r = g8(nos, { ...doc1440, grupos: [{ id: 'div.a', alturas: [300, 200] }] })
    assert.equal(r.ok, true, r.motivo)
  })

  it('falha: um vão de 200 px, e colunas com 130 px de diferença', () => {
    assert.equal(g8([bloco(0, 100), bloco(300, 100)], doc1440).ok, false)
    assert.equal(g8([bloco(0, 100), bloco(132, 100)], { ...doc1440, grupos: [{ id: 'div.b', alturas: [400, 270] }] }).ok, false)
  })

  it('borda: 192 px passam, 193 não; 120 px de diferença passam', () => {
    assert.equal(g8([bloco(0, 100), bloco(292, 100)], doc1440).ok, true)
    assert.equal(g8([bloco(0, 100), bloco(293.6, 100)], doc1440).ok, false)
    assert.equal(g8([bloco(0, 100), bloco(132, 100)], { ...doc1440, grupos: [{ id: 'div.c', alturas: [320, 200] }] }).ok, true)
  })

  it('falha fechado: um bloco só, e sem a leitura das colunas', () => {
    assert.equal(g8([bloco(0, 100)], doc1440).ok, false)
    assert.equal(g8([bloco(0, 100), bloco(132, 100)], { ...doc1440, grupos: undefined }).ok, false)
  })
})

describe('G9: o rodapé de borda a borda', () => {
  const rodape = (x, w) => criar({ tag: 'footer', texto: '', rect: { x, y: 900, w, h: 900 }, m: { rodape: true } })

  it('passa em x=0 com a largura da janela', () => assert.equal(g9([rodape(0, 1425)], doc1440).ok, true))
  it('falha com margem ou largura menor', () => {
    assert.equal(g9([rodape(32, 1361)], doc1440).ok, false)
    assert.equal(g9([rodape(0, 1360)], doc1440).ok, false)
  })
  it('borda: 1 px de diferença na largura passa', () => assert.equal(g9([rodape(0, 1424.2)], doc1440).ok, true))
  it('falha fechado sem rodapé', () => assert.equal(g9([criar()], doc1440).ok, false))
})

describe('G10: 65 caracteres por linha', () => {
  it('passa com linhas de até 65', () => assert.equal(g10([criar({ linhas: [58, 61, 12] })]).ok, true))
  it('falha com uma linha de 66', () => assert.equal(g10([criar({ linhas: [66, 20] })]).ok, false))
  it('borda: 65 passa', () => assert.equal(g10([criar({ linhas: [65] })]).ok, true))
  it('falha fechado: parágrafo sem a contagem e nenhum parágrafo', () => {
    assert.equal(g10([criar()]).ok, false)
    assert.equal(g10([criar({ tag: 'div', linhas: [10] })]).ok, false)
  })
})

describe('G11: alvo de toque e contraste', () => {
  const alvo = (w, h, extra = {}) => criar({ tag: 'button', rect: { x: 32, y: 0, w, h }, m: { interativo: true }, ...extra })

  it('passa com 44 × 44 e o contraste da tinta sobre o papel', () => {
    const r = g11([alvo(44, 44)], 'claro')
    assert.equal(r.ok, true, r.motivo)
  })

  it('falha com um alvo de 40 px e com texto de baixo contraste', () => {
    assert.equal(g11([alvo(40, 44)], 'claro').ok, false)
    assert.equal(g11([alvo(44, 44), criar({ estilo: { color: 'rgb(150, 150, 150)' } })], 'claro').ok, false)
  })

  it('na madrugada a altura mínima é 56', () => {
    assert.equal(g11([alvo(44, 48)], 'madrugada').ok, false)
    assert.equal(g11([alvo(44, 56)], 'madrugada').ok, true)
    assert.equal(g11([alvo(44, 48)], 'claro').ok, true)
  })

  it('borda: 43,6 px de largura passa (arredondamento) e 43 não; o contraste de 4,5 passa', () => {
    assert.equal(g11([alvo(43.6, 44)], 'claro').ok, true)
    assert.equal(g11([alvo(43, 44)], 'claro').ok, false)
    // #767676 sobre branco tem 4,54:1.
    assert.equal(g11([alvo(44, 44), criar({ estilo: { color: 'rgb(118, 118, 118)' }, cadeia: ['rgb(255, 255, 255)'] })], 'claro').ok, true)
  })

  it('falha fechado: fundo transparente sem ancestral opaco, texto sem largura, nada para medir', () => {
    assert.equal(g11([alvo(44, 44), criar({ cadeia: [TRANSPARENTE, TRANSPARENTE] })], 'claro').ok, false)
    assert.equal(g11([alvo(44, 44), criar({ rect: { x: 0, y: 0, w: 0, h: 20 } })], 'claro').ok, false)
    assert.equal(g11([criar()], 'claro').ok, false)
    assert.equal(g11([alvo(44, 44, { texto: '' })], 'claro').ok, false)
  })

  it('o que não está visível não conta', () => {
    assert.equal(g11([alvo(44, 44), alvo(10, 10, { visivel: false })], 'claro').ok, true)
  })
})

describe('G12: opacidade 1 e escala 1', () => {
  const bloco = (estilo = {}, m = { filhoDeMain: true }) => criar({ tag: 'section', texto: '', m, estilo })

  it('passa com opacidade 1 e sem transform, em filho de main e em filho de [data-bloco]', () => {
    assert.equal(g12([bloco(), bloco({}, { filhoDeBloco: true })]).ok, true)
  })

  it('falha com opacidade 0,5 e com escala 0,95', () => {
    assert.equal(g12([bloco({ opacity: '0.5' })]).ok, false)
    assert.equal(g12([bloco({ transform: 'matrix(0.95, 0, 0, 0.95, 0, 0)' })]).ok, false)
  })

  it('borda: matrix de escala 1 (só deslocamento) passa; 1,01 falha', () => {
    assert.equal(g12([bloco({ transform: 'matrix(1, 0, 0, 1, 0, 12)' })]).ok, true)
    assert.equal(g12([bloco({ transform: 'matrix(1.01, 0, 0, 1.01, 0, 0)' })]).ok, false)
  })

  it('falha fechado: nenhum bloco, opacidade ausente e transform ilegível', () => {
    assert.equal(g12([criar()]).ok, false)
    assert.equal(g12([bloco({ opacity: undefined })]).ok, false)
    assert.equal(g12([bloco({ transform: 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)' })]).ok, false)
  })
})

describe('SB3: o nome do rodapé', () => {
  it('passa de 96% a 100% da área útil', () => {
    assert.equal(sb3({ nomeRodape: { larguraTexto: 1340, areaUtil: 1376 } }).ok, true)
    assert.equal(sb3({ nomeRodape: { larguraTexto: 1321, areaUtil: 1376 } }).ok, true)
  })
  it('falha abaixo de 96% e acima de 100%', () => {
    assert.equal(sb3({ nomeRodape: { larguraTexto: 1200, areaUtil: 1376 } }).ok, false)
    assert.equal(sb3({ nomeRodape: { larguraTexto: 1400, areaUtil: 1376 } }).ok, false)
  })
  it('falha fechado sem a medida', () => {
    assert.equal(sb3({ nomeRodape: null }).ok, false)
    assert.equal(sb3({ nomeRodape: { larguraTexto: Number.NaN, areaUtil: 1376 } }).ok, false)
  })
})

describe('avaliarTudo e resumo', () => {
  it('em sistema todas as regras bloqueiam; nos outros casos, só G2 e G9', () => {
    assert.equal(bloqueantesDoCaso('sistema').length, 14) // G1 a G12, SB3 e NUM
    assert.deepEqual(bloqueantesDoCaso('hoje'), ['G2', 'G9'])
    assert.deepEqual(bloqueantesDoCaso('inicio'), ['G2', 'G9'])
    assert.deepEqual(bloqueantesDoCaso('sessao'), ['G2', 'G9'])
  })

  it('devolve uma linha RESUMO com ok, FALHA e registrada', () => {
    const resultados = avaliarTudo({ doc: { ...doc1440, scrollWidth: 1500 }, nos: [], tema: 'claro' }, 'hoje')
    const linha = resumo('hoje_claro_1440.json', resultados)

    assert.match(linha, /^RESUMO hoje_claro_1440\.json G1 registrada G2 FALHA G3 registrada /)
    assert.match(linha, /G9 FALHA/)
    assert.equal(resultados.length, 14)
    for (const r of resultados) assert.deepEqual(Object.keys(r).sort(), ['bloqueia', 'motivo', 'nos_com_falha', 'ok', 'regra'])
  })

  it('em sistema, a falha bloqueante sai como FALHA e a que passa, como ok', () => {
    const resultados = avaliarTudo({ doc: doc1440, nos: [], tema: 'claro' }, 'sistema')
    const linha = resumo('sistema_claro_1440.json', resultados)

    assert.match(linha, /G1 ok/)
    assert.match(linha, /G2 FALHA/)
    assert.doesNotMatch(linha, /registrada/)
  })
})

// ---------------------------------------------------------------------------------------------
// R2 (rodada de correção 1): o coletor real (o que roda no Chrome) rodando em jsdom com geometria
// fixa, e a regra pura sobre o que ele coleta, na mesma fixture. O jsdom não mede layout: todo
// retângulo é 100 × 20 e todo caractere cai na mesma linha, então o que se testa é o que o coletor
// e a regra DECIDEM com a leitura, não a geometria.

const RETANGULO = { x: 0, y: 0, left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20 }

/** Monta `html` num jsdom, roda o coletor serializado (como o CDP faz) e devolve `{ doc, nos }`. */
function coletarDe(html, preparar = () => undefined) {
  // O console virtual sem saída: o jsdom avisa "not implemented" para getComputedStyle com
  // pseudo-elemento (que o coletor lê nos critérios de tela) e não há o que mostrar.
  const dom = new JSDOM(
    `<!doctype html><html><head><style>* { font-size: 20px; opacity: 1; transform: none; text-transform: none; box-shadow: none; }</style></head><body>${html}</body></html>`,
    { runScripts: 'outside-only', virtualConsole: new VirtualConsole() },
  )
  const { window } = dom
  window.Element.prototype.getBoundingClientRect = () => ({ ...RETANGULO })
  window.Range.prototype.getClientRects = () => [{ ...RETANGULO }]
  window.Range.prototype.getBoundingClientRect = () => ({ ...RETANGULO })
  preparar(window.document)
  try {
    // Cópia por JSON, como o CDP devolve (returnByValue): sem isso os arrays são de outro realm.
    return JSON.parse(JSON.stringify(window.eval(`(${coletarNaPagina.toString()})()`)))
  } finally {
    window.close()
  }
}

const PAGINA_CONFORME = `
  <main>
    <section data-bloco><p>Um parágrafo curto e conforme.</p><div data-midia></div></section>
    <section><figure></figure><label>Nome <input value="Maria"></label></section>
  </main>`

describe('R2: o coletor em jsdom, numa página conforme', () => {
  it('passa em G4, G10 e G12 (a fixture não reprova por si só)', () => {
    const { nos } = coletarDe(PAGINA_CONFORME)
    for (const regra of [g4, g10, g12]) {
      const r = regra(nos)
      assert.equal(r.ok, true, `${r.regra}: ${r.motivo}`)
    }
  })
})

describe('R2.1 G4: o texto e o tamanho dos controles entram na coleta e na regra', () => {
  const pagina = (controle) => `<main><section><p>Texto comum.</p>${controle}</section></main>`

  it('o coletor lê o valor do input e o font-size do próprio controle', () => {
    const { nos } = coletarDe(pagina('<input value="Maria" style="font-size: 13px">'))
    const input = nos.find((no) => no.tag === 'input')
    assert.equal(input.textoControle, 'Maria')
    assert.equal(input.estilo.fontSize, '13px')
  })

  it('G4 reprova um input com valor visível a 13px e passa com 20px, na mesma fixture', () => {
    const ruim = g4(coletarDe(pagina('<input value="Maria" style="font-size: 13px">')).nos)
    assert.equal(ruim.ok, false, ruim.motivo)
    assert.match(ruim.motivo, /13px/)
    const bom = g4(coletarDe(pagina('<input value="Maria" style="font-size: 20px">')).nos)
    assert.equal(bom.ok, true, bom.motivo)
  })

  it('o placeholder só conta quando é visível (valor vazio), e o valor vence o placeholder', () => {
    const vazio = coletarDe(pagina('<input placeholder="Seu nome" style="font-size: 13px">')).nos.find((no) => no.tag === 'input')
    assert.equal(vazio.textoControle, 'Seu nome')
    const cheio = coletarDe(pagina('<input value="Ana" placeholder="Seu nome" style="font-size: 13px">')).nos.find((no) => no.tag === 'input')
    assert.equal(cheio.textoControle, 'Ana')
    assert.equal(g4(coletarDe(pagina('<input placeholder="Seu nome" style="font-size: 13px">')).nos).ok, false)
  })

  it('textarea e o rótulo escolhido do select também entram, cada um com o seu font-size', () => {
    const area = coletarDe(pagina('<textarea style="font-size: 13px">Recado</textarea>')).nos.find((no) => no.tag === 'textarea')
    assert.match(`${area.texto}${area.textoControle ?? ''}`, /Recado/)
    assert.equal(g4(coletarDe(pagina('<textarea style="font-size: 13px">Recado</textarea>')).nos).ok, false)

    const html = '<select style="font-size: 13px"><option value="a">Cuidador</option><option value="b" selected>Responsável</option></select>'
    const { nos } = coletarDe(pagina(html))
    assert.equal(nos.find((no) => no.tag === 'select').textoControle, 'Responsável')
    assert.equal(g4(nos).ok, false)
  })

  it('o que não mostra texto não entra: hidden, checkbox e input vazio sem placeholder', () => {
    const html = '<input type="hidden" value="x" style="font-size: 13px"><input type="checkbox" value="y" style="font-size: 13px"><input style="font-size: 13px">'
    const { nos } = coletarDe(pagina(html))
    for (const input of nos.filter((no) => no.tag === 'input')) assert.equal(input.textoControle ?? '', '')
    assert.equal(g4(nos).ok, true)
  })

  it('a senha não vai para a coleta em claro', () => {
    const { nos } = coletarDe(pagina('<input type="password" value="segredo123" style="font-size: 20px">'))
    const senha = nos.find((no) => no.tag === 'input')
    assert.equal(senha.textoControle.includes('segredo'), false)
    assert.equal(senha.textoControle.length, 'segredo123'.length)
  })

  it('a regra pura: um controle com texto de 13px reprova e com 20px passa; caixa alta no controle reprova', () => {
    const controle = (estilo) => criar({ tag: 'input', texto: '', textoControle: 'Maria', estilo })
    assert.equal(g4([criar(), controle({ fontSize: '13px' })]).ok, false)
    assert.equal(g4([criar(), controle({ fontSize: '20px' })]).ok, true)
    assert.equal(g4([criar(), controle({ fontSize: '20px', textTransform: 'uppercase' })]).ok, false)
    assert.equal(g4([criar(), controle({ fontSize: undefined })]).ok, false)
  })

  it('a regra pura: um controle sem texto visível não conta', () => {
    assert.equal(g4([criar(), criar({ tag: 'input', texto: '', textoControle: '', estilo: { fontSize: '13px' } })]).ok, true)
  })
})

describe('R2.2 G10: o parágrafo conta o texto dos descendentes inline', () => {
  const CEM = 'a'.repeat(100)

  it('o coletor mede as linhas de <p><span>…100 caracteres…</span></p> e a regra reprova', () => {
    const { nos } = coletarDe(`<main><section><p>Curto.</p><p><span>${CEM}</span></p></section></main>`)
    const [, dentroDoSpan] = nos.filter((no) => no.tag === 'p')
    assert.deepEqual(dentroDoSpan.linhas, [100])
    const r = g10(nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /100 caracteres/)
  })

  it('o texto direto e o texto do span somam na mesma linha', () => {
    const { nos } = coletarDe(`<main><section><p>Curto.</p><p>${'b'.repeat(40)}<em>${'c'.repeat(40)}</em></p></section></main>`)
    assert.equal(g10(nos).ok, false)
    assert.deepEqual(nos.filter((no) => no.tag === 'p')[1].linhas, [80])
  })

  it('um parágrafo aninhado é medido por si e não conta duas vezes no de fora', () => {
    const { nos } = coletarDe('<main><section><p id="fora">Fora.</p></section></main>', (documento) => {
      const dentro = documento.createElement('p')
      dentro.textContent = 'd'.repeat(80)
      documento.getElementById('fora').append(dentro)
    })
    const [fora, dentro] = nos.filter((no) => no.tag === 'p')
    assert.deepEqual(fora.linhas, [5])
    assert.deepEqual(dentro.linhas, [80])
    const r = g10(nos)
    assert.equal(r.ok, false, r.motivo)
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('um parágrafo conforme só com texto em descendentes inline passa', () => {
    const { nos } = coletarDe('<main><section><p>Curto.</p><p><span>Só o span.</span></p></section></main>')
    const r = g10(nos)
    assert.equal(r.ok, true, r.motivo)
  })

  it('a regra pura: parágrafo sem texto direto mas com 100 caracteres numa linha reprova', () => {
    const semTextoDireto = criar({ texto: '', textoTotal: CEM, linhas: [100] })
    assert.equal(g10([criar({ linhas: [20] }), semTextoDireto]).ok, false)
    assert.equal(g10([criar({ linhas: [20] }), criar({ texto: '', textoTotal: 'Curto.', linhas: [6] })]).ok, true)
  })

  it('a regra pura falha fechado: parágrafo com texto só nos descendentes e sem a contagem de linhas', () => {
    const r = g10([criar({ linhas: [20] }), criar({ texto: '', textoTotal: CEM })])
    assert.equal(r.ok, false)
    assert.match(r.motivo, /sem a contagem de linhas/)
  })

  it('a regra pura: parágrafo realmente vazio continua de fora', () => {
    assert.equal(g10([criar({ linhas: [20] }), criar({ texto: '', textoTotal: '' })]).ok, true)
  })
})

describe('R2.3 G12: mídias e blocos aninhados também são inspecionados', () => {
  const ANINHADO = (estiloDaMidia = '', estiloDoEnvoltorio = '') =>
    `<main><section data-bloco><p>Texto.</p></section><section><div><div style="${estiloDoEnvoltorio}"><div data-midia style="${estiloDaMidia}"></div></div></div></section></main>`

  it('uma mídia com opacity 0 dentro de um envoltório reprova', () => {
    const { nos } = coletarDe(ANINHADO('opacity: 0'))
    const r = g12(nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /opacidade 0/)
  })

  it('uma mídia dentro de um ancestral com opacity 0 reprova (a opacidade não é herdada, mas esconde)', () => {
    const r = g12(coletarDe(ANINHADO('', 'opacity: 0')).nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /ancestral/)
  })

  it('uma <figure> aninhada com opacity 0.5 reprova, e a mesma fixture em 1 passa', () => {
    const html = (opacidade) => `<main><section data-bloco><p>Texto.</p></section><section><div><div><figure style="opacity: ${opacidade}"></figure></div></div></section></main>`
    assert.equal(g12(coletarDe(html('0.5')).nos).ok, false)
    assert.equal(g12(coletarDe(html('1')).nos).ok, true)
  })

  it('uma mídia dentro de um ancestral escalado a 0,5 reprova', () => {
    const r = g12(coletarDe(ANINHADO('', 'transform: matrix(0.5, 0, 0, 0.5, 0, 0)')).nos)
    assert.equal(r.ok, false, r.motivo)
  })

  it('um [data-bloco] aninhado (neto de main) com opacity 0 reprova', () => {
    const html = '<main><section><div><div data-bloco style="opacity: 0"><p>Texto.</p></div></div></section></main>'
    assert.equal(g12(coletarDe(html).nos).ok, false)
  })

  it('o conteúdo oculto não é descartado: visibility hidden e display none na mídia aninhada reprovam', () => {
    const { nos } = coletarDe(ANINHADO('opacity: 0; visibility: hidden'))
    nos.find((no) => no.m.midia).visivel = false
    assert.equal(g12(nos).ok, false)
  })

  it('a mesma fixture, conforme, passa', () => {
    const r = g12(coletarDe(ANINHADO()).nos)
    assert.equal(r.ok, true, r.motivo)
  })

  it('a regra pura: uma mídia aninhada com opacidade efetiva menor que 1 reprova', () => {
    const midia = (extra) => criar({ tag: 'div', texto: '', m: { blocoG12: true }, ...extra })
    assert.equal(g12([criar({ tag: 'section', texto: '', m: { filhoDeMain: true } }), midia({ estilo: { opacity: '0' } })]).ok, false)
    assert.equal(g12([midia({ ancestrais: { opacidade: 0, escalaX: 1, escalaY: 1 } })]).ok, false)
    assert.equal(g12([midia({ ancestrais: { opacidade: 1, escalaX: 1, escalaY: 2 } })]).ok, false)
    assert.equal(g12([midia({ ancestrais: { opacidade: 1, escalaX: 1, escalaY: 1 } })]).ok, true)
    assert.equal(g12([midia({ ancestrais: { opacidade: Number.NaN, escalaX: 1, escalaY: 1 } })]).ok, false)
  })
})

describe('R2.4 G12: a escala vale nos dois eixos', () => {
  const bloco = (transform) => criar({ tag: 'section', texto: '', m: { filhoDeMain: true }, estilo: { transform } })

  it('matrix(1,0,0,2,0,0) (só o eixo Y) reprova', () => {
    const r = g12([bloco('matrix(1, 0, 0, 2, 0, 0)')])
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /escala/)
  })

  it('o eixo X sozinho, o Y sozinho abaixo de 1 e os dois diferentes entre si reprovam', () => {
    assert.equal(g12([bloco('matrix(2, 0, 0, 1, 0, 0)')]).ok, false)
    assert.equal(g12([bloco('matrix(1, 0, 0, 0.5, 0, 0)')]).ok, false)
    assert.equal(g12([bloco('matrix(0.5, 0, 0, 2, 0, 0)')]).ok, false)
  })

  it('só deslocamento e escala 1 nos dois eixos passam; 1,01 em Y falha', () => {
    assert.equal(g12([bloco('matrix(1, 0, 0, 1, 0, 12)')]).ok, true)
    assert.equal(g12([bloco('matrix(1, 0, 0, 1.01, 0, 0)')]).ok, false)
  })

  it('uma matrix incompleta é ilegível e reprova', () => {
    assert.equal(g12([bloco('matrix(1, 0, 0)')]).ok, false)
  })

  it('o coletor lê o transform de um bloco escalado só em Y e a regra reprova', () => {
    const { nos } = coletarDe('<main><section data-bloco><p>Texto.</p></section><section style="transform: matrix(1, 0, 0, 2, 0, 0)"><p>Outro.</p></section></main>')
    const r = g12(nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /escala/)
  })
})

// ---------------------------------------------------------------------------------------------
// Rodada de correção 2, achado B: G12 reprova o bloco oculto. O jsdom não tem `checkVisibility`:
// a fixture o modela como o Chrome (`visibilityProperty: true`): `display: none` no nó ou em um
// ancestral, ou `visibility` calculada `hidden`/`collapse`, deixam o nó invisível.
describe('B G12: o bloco oculto (visibility/display) reprova, mesmo com opacidade 1 e escala 1', () => {
  /** Instala no jsdom um `checkVisibility` que lê o CSS calculado, como o navegador. */
  const comCheckVisibility = (documento) => {
    const janela = documento.defaultView
    janela.Element.prototype.checkVisibility = function checkVisibility(opcoes = {}) {
      for (let no = this; no; no = no.parentElement) {
        if (janela.getComputedStyle(no).display === 'none') return false
      }
      if (opcoes.visibilityProperty) {
        const visibilidade = janela.getComputedStyle(this).visibility
        if (visibilidade === 'hidden' || visibilidade === 'collapse') return false
      }
      return true
    }
  }
  const coletar = (html) => coletarDe(html, comCheckVisibility)
  const PAGINA = (estiloDaMidia = '', estiloDoEnvoltorio = '', estiloDoBloco = '') =>
    `<main><section data-bloco style="${estiloDoBloco}"><p>Texto.</p></section><section><div style="${estiloDoEnvoltorio}"><div data-midia style="${estiloDaMidia}"></div></div></section></main>`
  const midia = (extra = {}) => criar({ tag: 'div', texto: '', m: { blocoG12: true, midia: true }, ...extra })

  it('controle: a página visível passa, e o coletor entrega visivel true nas mídias', () => {
    const { nos } = coletar(PAGINA())
    assert.equal(nos.find((no) => no.m.midia).visivel, true)
    const r = g12(nos)
    assert.equal(r.ok, true, r.motivo)
  })

  it('visibility:hidden na mídia, com opacity 1 e transform none, reprova com o motivo de oculto', () => {
    const { nos } = coletar(PAGINA('visibility: hidden; opacity: 1; transform: none'))
    const alvo = nos.find((no) => no.m.midia)
    assert.equal(alvo.visivel, false)
    assert.equal(alvo.estilo.opacity, '1')
    assert.equal(alvo.estilo.transform, 'none')
    const r = g12(nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /oculto \(visibility\/display\)/)
  })

  it('display:none na mídia reprova', () => {
    const r = g12(coletar(PAGINA('display: none')).nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /oculto \(visibility\/display\)/)
  })

  it('a mídia aninhada num envoltório visível, mas com visibility:hidden própria, reprova', () => {
    const { nos } = coletar(PAGINA('visibility: hidden'))
    assert.equal(nos.find((no) => no.tag === 'div' && no.m.blocoG12 && !no.m.midia)?.visivel ?? true, true)
    const r = g12(nos)
    assert.equal(r.ok, false, r.motivo)
  })

  it('um ancestral com visibility:hidden e a mídia filha herdando reprova', () => {
    const { nos } = coletar(PAGINA('', 'visibility: hidden'))
    assert.equal(nos.find((no) => no.m.midia).visivel, false)
    const r = g12(nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /oculto \(visibility\/display\)/)
  })

  it('um ancestral com display:none e a mídia filha reprova', () => {
    const r = g12(coletar(PAGINA('', 'display: none')).nos)
    assert.equal(r.ok, false, r.motivo)
  })

  it('o próprio [data-bloco] com visibility:hidden reprova', () => {
    const r = g12(coletar(PAGINA('', '', 'visibility: hidden')).nos)
    assert.equal(r.ok, false, r.motivo)
  })

  it('a regra pura: visivel false reprova bloco, mídia aninhada e figura, e o motivo diz "oculto (visibility/display)"', () => {
    const bloco = criar({ tag: 'section', texto: '', m: { filhoDeMain: true } })
    for (const oculto of [
      criar({ tag: 'section', texto: '', m: { filhoDeMain: true }, visivel: false }),
      criar({ tag: 'section', texto: '', m: { filhoDeBloco: true }, visivel: false }),
      midia({ visivel: false }),
      criar({ tag: 'figure', texto: '', m: { blocoG12: true }, visivel: false }),
    ]) {
      const r = g12([bloco, oculto])
      assert.equal(r.ok, false, r.motivo)
      assert.match(r.motivo, /oculto \(visibility\/display\)/)
      assert.equal(r.nos_com_falha.length, 1)
    }
    assert.equal(g12([bloco, midia()]).ok, true)
  })

  it('falha fechado: o nó sem o campo visivel (ou com valor que não é true) reprova', () => {
    const bloco = criar({ tag: 'section', texto: '', m: { filhoDeMain: true } })
    const semCampo = midia()
    delete semCampo.visivel
    for (const leitura of [semCampo, midia({ visivel: undefined }), midia({ visivel: null }), midia({ visivel: 'true' }), midia({ visivel: 1 })]) {
      const r = g12([bloco, leitura])
      assert.equal(r.ok, false, r.motivo)
      assert.match(r.motivo, /oculto \(visibility\/display\)/)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// D1 (rodada de correção 2): os números em Zilla Slab. A regra NUM falha fechado quando a família,
// a face carregada ou o `lining-nums` não estão provados. Sem `lining-nums` a Zilla Slab desenha
// algarismos de texto (o 7 desce, o 2 e o 0 ficam na altura do x).

describe('NUM: os números em Zilla Slab 700, com algarismos de capitular', () => {
  const FONTE_BOA = { familia: 'Zilla Slab', peso: '700', tamanho: '112px', faceCarregada: true }
  const numero = (extra = {}) =>
    criar({
      tag: 'p',
      texto: '7',
      m: { numero: true },
      estilo: { fontFamily: '"Zilla Slab", Georgia, serif', fontWeight: '700', fontSize: '112px', fontVariantNumeric: 'lining-nums tabular-nums' },
      fonte: FONTE_BOA,
      ...extra,
    })
  const docBom = { ...doc1440, fontes: { zillaSlab700: true } }

  it('passa: Zilla Slab, face carregada e lining-nums, em [data-numero] e no cronômetro', () => {
    const r = num([numero(), numero({ m: { numero: true, cronometro: true } })], docBom)
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'NUM')
    assert.match(r.motivo, /2 /)
  })

  it('falha: a primeira família calculada não é Zilla Slab', () => {
    const r = num([numero({ fonte: { ...FONTE_BOA, familia: 'Georgia' } })], docBom)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /Georgia/)
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('falha: a face não está carregada (no elemento ou no documento)', () => {
    assert.equal(num([numero({ fonte: { ...FONTE_BOA, faceCarregada: false } })], docBom).ok, false)
    assert.equal(num([numero()], { ...doc1440, fontes: { zillaSlab700: false } }).ok, false)
  })

  it('falha: sem lining-nums, com tabular-nums sozinho, normal ou outra variante', () => {
    for (const variante of ['tabular-nums', 'normal', 'oldstyle-nums tabular-nums', '']) {
      const r = num([numero({ estilo: { fontVariantNumeric: variante } })], docBom)
      assert.equal(r.ok, false, `variante "${variante}": ${r.motivo}`)
      assert.match(r.motivo, /lining-nums/)
    }
  })

  it('falha fechado: dado ausente ou indefinido no resultado do coletor nunca vira ok:true', () => {
    const semFonte = numero({ fonte: undefined })
    const semFamilia = numero({ fonte: { peso: '700', tamanho: '112px', faceCarregada: true } })
    const semFace = numero({ fonte: { familia: 'Zilla Slab', peso: '700', tamanho: '112px' } })
    const faceNula = numero({ fonte: { ...FONTE_BOA, faceCarregada: null } })
    const faceTexto = numero({ fonte: { ...FONTE_BOA, faceCarregada: 'true' } })
    const semVariante = numero({ estilo: { fontVariantNumeric: undefined } })
    for (const [nome, no] of Object.entries({ semFonte, semFamilia, semFace, faceNula, faceTexto, semVariante })) {
      const r = num([no], docBom)
      assert.equal(r.ok, false, `${nome}: ${r.motivo}`)
    }
  })

  it('falha fechado: `fontes` ausente, sem o campo, nulo ou o próprio doc ausente', () => {
    for (const doc of [doc1440, { ...doc1440, fontes: {} }, { ...doc1440, fontes: { zillaSlab700: null } }, { ...doc1440, fontes: { zillaSlab700: undefined } }, { ...doc1440, fontes: null }, undefined, null]) {
      const r = num([numero()], doc)
      assert.equal(r.ok, false, `${JSON.stringify(doc?.fontes)}: ${r.motivo}`)
    }
  })

  it('não aplicável (ok, no mesmo formato) quando a página não tem número nem cronômetro', () => {
    const r = num([criar(), criar({ tag: 'h1' })], docBom)
    assert.deepEqual(Object.keys(r).sort(), ['motivo', 'nos_com_falha', 'ok', 'regra'])
    assert.equal(r.ok, true)
    assert.match(r.motivo, /não aplicável/)
    assert.equal(num([], docBom).ok, true)
  })

  it('o que não está visível não conta, e um nó que não é número não é medido', () => {
    assert.equal(num([numero({ visivel: false, fonte: undefined }), criar({ fonte: undefined })], docBom).ok, true)
  })

  it('é bloqueante em `sistema` e só registrada nos outros casos; entra no resumo', () => {
    assert.ok(bloqueantesDoCaso('sistema').includes('NUM'))
    assert.ok(!bloqueantesDoCaso('hoje').includes('NUM'))
    const nos = [numero({ fonte: { ...FONTE_BOA, familia: 'Georgia' } })]
    const em = (caso) => avaliarTudo({ doc: docBom, nos, tema: 'claro' }, caso).find((r) => r.regra === 'NUM')
    assert.equal(em('sistema').ok, false)
    assert.equal(em('sistema').bloqueia, true)
    assert.equal(em('hoje').bloqueia, false)
    assert.match(resumo('sistema_claro_1440.json', avaliarTudo({ doc: docBom, nos, tema: 'claro' }, 'sistema')), /NUM FALHA/)
  })
})

describe('NUM: o coletor real em jsdom lê a família, a face e o font-variant-numeric', () => {
  const ESTILO_BOM = "font-family: 'Zilla Slab', Georgia, serif; font-weight: 700; font-size: 112px; font-variant-numeric: lining-nums tabular-nums"
  const pagina = (estilo = ESTILO_BOM, extra = '') =>
    `<main><section data-bloco><p>Texto.</p><p data-numero style="${estilo}">7</p>${extra}</section></main>`
  const facesCarregadas = (carregada = true) => (documento) => {
    Object.defineProperty(documento, 'fonts', {
      configurable: true,
      value: {
        check: () => carregada,
        *[Symbol.iterator]() {
          yield { family: '"Zilla Slab"', weight: '700', status: carregada ? 'loaded' : 'unloaded' }
        },
      },
    })
  }
  const medir = (html, preparar) => {
    const lido = coletarDe(html, preparar)
    return { lido, r: num(lido.nos, lido.doc) }
  }

  it('o caso verde: família, face carregada e lining-nums', () => {
    const { lido, r } = medir(pagina(), facesCarregadas())
    const no = lido.nos.find((n) => n.m.numero)
    assert.equal(no.fonte.familia, 'Zilla Slab')
    assert.equal(no.fonte.faceCarregada, true)
    assert.equal(lido.doc.fontes.zillaSlab700, true)
    assert.match(no.estilo.fontVariantNumeric, /lining-nums/)
    assert.equal(r.ok, true, r.motivo)
  })

  it('família errada → ok:false', () => {
    const { r } = medir(pagina("font-family: Georgia, serif; font-weight: 700; font-size: 112px; font-variant-numeric: lining-nums tabular-nums"), facesCarregadas())
    assert.equal(r.ok, false, r.motivo)
  })

  it('face não carregada → ok:false', () => {
    const { r } = medir(pagina(), facesCarregadas(false))
    assert.equal(r.ok, false, r.motivo)
  })

  it('a face só “passa” no check do navegador mas não está registrada → ok:false (check() dá true para fonte sem @font-face)', () => {
    const { r } = medir(pagina(), (documento) => {
      Object.defineProperty(documento, 'fonts', { configurable: true, value: { check: () => true, *[Symbol.iterator]() {} } })
    })
    assert.equal(r.ok, false, r.motivo)
  })

  it('sem lining-nums → ok:false', () => {
    const { r } = medir(pagina("font-family: 'Zilla Slab', Georgia, serif; font-weight: 700; font-size: 112px; font-variant-numeric: tabular-nums"), facesCarregadas())
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /lining-nums/)
  })

  it('sem `document.fonts` (o navegador não entrega a leitura) → ok:false, nunca ok:true', () => {
    const { lido, r } = medir(pagina())
    assert.equal(lido.nos.find((n) => n.m.numero).fonte.faceCarregada, null)
    assert.equal(r.ok, false, r.motivo)
  })

  it('o cronômetro (.t-cronometro e [data-cronometro]) também é medido', () => {
    const extra =
      '<p class="t-cronometro" style="font-family: Georgia; font-weight: 700; font-size: 224px; font-variant-numeric: lining-nums">00:05</p>' +
      '<p data-cronometro style="font-family: \'Zilla Slab\'; font-weight: 700; font-size: 224px; font-variant-numeric: lining-nums">00:06</p>'
    const { lido, r } = medir(pagina(ESTILO_BOM, extra), facesCarregadas())
    assert.equal(lido.nos.filter((n) => n.m.numero).length, 3)
    assert.equal(r.ok, false, r.motivo)
    assert.equal(r.nos_com_falha.length, 1)
    assert.match(r.nos_com_falha[0], /00:05/)
  })

  it('uma página sem número nem cronômetro é “não aplicável”', () => {
    const { r } = medir('<main><section data-bloco><p>Só texto.</p></section></main>')
    assert.equal(r.ok, true)
    assert.match(r.motivo, /não aplicável/)
  })
})

describe('argumentos e loopback', () => {
  it('lê a pasta e os casos', () => {
    const { pasta, pedidos } = lerArgumentos(['.oc/medidas', 'sistema:claro:390x844', 'hoje:madrugada:1440x900'])
    assert.equal(pasta, '.oc/medidas')
    assert.deepEqual(pedidos, [
      { caso: 'sistema', tema: 'claro', largura: 390, altura: 844 },
      { caso: 'hoje', tema: 'madrugada', largura: 1440, altura: 900 },
    ])
  })

  it('recusa caso, tema e formato inválidos, e o Início em madrugada', () => {
    assert.throws(() => lerArgumentos(['p', 'outro:claro:390x844']), /caso desconhecido/)
    assert.throws(() => lerArgumentos(['p', 'sistema:sepia:390x844']), /tema desconhecido/)
    assert.throws(() => lerArgumentos(['p', 'sistema:claro:390']), /argumento inválido/)
    assert.throws(() => lerArgumentos(['p', 'inicio:madrugada:1440x900']), /sempre claro/)
    assert.throws(() => lerArgumentos(['p']), /uso:/)
    assert.throws(() => lerArgumentos([]), /uso:/)
  })

  it('só aceita loopback', () => {
    assert.doesNotThrow(() => verificarLoopback('http://127.0.0.1:5244/'))
    assert.doesNotThrow(() => verificarLoopback('http://localhost:5244/'))
    assert.throws(() => verificarLoopback('http://exemplo.invalid/'), /só loopback/)
    assert.throws(() => verificarLoopback('http://192.168.0.5:5244/'), /só loopback/)
  })
})

// =============================================================================================
// MAT-44d-3: as 5 telas de acesso e Conta. Ambiente, argumentos, bloqueio e os critérios de tela.

describe('44d-3: o ambiente (variável > .oc/ambiente.json > padrão)', () => {
  const ARQUIVO = { BASE_URL: 'http://127.0.0.1:5263', CDP_PORTA: 9363, API_URL: 'http://127.0.0.1:54321', ANON_KEY: 'chave-do-arquivo' }

  it('sem variável nem arquivo, vale o padrão de sempre (5244 e 9344), sem API_URL nem ANON_KEY', () => {
    assert.deepEqual(escolherAmbiente({}, null), { BASE_URL: 'http://127.0.0.1:5244/', CDP_PORTA: 9344, API_URL: undefined, ANON_KEY: undefined })
  })

  it('sem variável, o arquivo vale mais que o padrão; a BASE_URL ganha a barra final', () => {
    assert.deepEqual(escolherAmbiente({}, ARQUIVO), { BASE_URL: 'http://127.0.0.1:5263/', CDP_PORTA: 9363, API_URL: 'http://127.0.0.1:54321', ANON_KEY: 'chave-do-arquivo' })
  })

  it('a variável vale mais que o arquivo, campo a campo', () => {
    const r = escolherAmbiente({ CDP_PORTA: '9400', ANON_KEY: 'da-variavel' }, ARQUIVO)
    assert.equal(r.CDP_PORTA, 9400)
    assert.equal(r.ANON_KEY, 'da-variavel')
    assert.equal(r.BASE_URL, 'http://127.0.0.1:5263/')
    assert.equal(r.API_URL, 'http://127.0.0.1:54321')
  })

  it('borda: variável vazia ou só com espaços conta como ausente; arquivo que não é objeto é ignorado', () => {
    assert.equal(escolherAmbiente({ BASE_URL: '', CDP_PORTA: '  ' }, ARQUIVO).CDP_PORTA, 9363)
    assert.equal(escolherAmbiente({}, ['x']).CDP_PORTA, 9344)
    assert.equal(escolherAmbiente({}, 'texto').BASE_URL, 'http://127.0.0.1:5244/')
    assert.equal(escolherAmbiente({}, { CDP_PORTA: null }).CDP_PORTA, 9344)
  })

  it('só loopback vale, inclusive para a API_URL, e a porta tem de ser um inteiro válido', () => {
    assert.doesNotThrow(() => verificarAmbiente(escolherAmbiente({}, ARQUIVO)))
    assert.doesNotThrow(() => verificarAmbiente(escolherAmbiente({}, null)))
    assert.throws(() => verificarAmbiente(escolherAmbiente({ BASE_URL: 'http://exemplo.invalid/' }, null)), /só loopback/)
    assert.throws(() => verificarAmbiente(escolherAmbiente({ API_URL: 'http://exemplo.invalid' }, null)), /só loopback/)
    assert.throws(() => verificarAmbiente(escolherAmbiente({ API_URL: 'http://192.168.0.5:54321' }, ARQUIVO)), /só loopback/)
    assert.throws(() => verificarAmbiente(escolherAmbiente({ CDP_PORTA: 'abc' }, null)), /CDP_PORTA inválida/)
    assert.throws(() => verificarAmbiente(escolherAmbiente({ CDP_PORTA: '70000' }, null)), /CDP_PORTA inválida/)
  })

  it('lê o arquivo do disco: nulo se não existe, objeto se é JSON, erro se está ilegível', () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'medir-dom-ambiente-'))
    try {
      assert.equal(lerArquivoAmbiente(path.join(pasta, 'nao-existe.json')), null)
      const bom = path.join(pasta, 'ambiente.json')
      fs.writeFileSync(bom, JSON.stringify(ARQUIVO))
      assert.deepEqual(lerArquivoAmbiente(bom), ARQUIVO)
      const ruim = path.join(pasta, 'ruim.json')
      fs.writeFileSync(ruim, '{ não é json')
      assert.throws(() => lerArquivoAmbiente(ruim), /ilegível/)
    } finally {
      fs.rmSync(pasta, { recursive: true, force: true })
    }
  })
})

describe('44d-3: os casos novos nos argumentos e no bloqueio', () => {
  it('aceita os 5 casos novos (com sublinhado no nome) e mantém os 4 antigos', () => {
    const { pedidos } = lerArgumentos([
      'p',
      'entrar:claro:1440x900',
      'criar_conta:claro:390x844',
      'recuperar_acesso:claro:1440x900',
      'comecar_seu_nome:madrugada:390x844',
      'conta:madrugada:390x844',
      'sessao:claro:1440x900',
    ])
    assert.deepEqual(pedidos.map((p) => p.caso), ['entrar', 'criar_conta', 'recuperar_acesso', 'comecar_seu_nome', 'conta', 'sessao'])
    assert.deepEqual(Object.keys(CASOS_DE_ACESSO), ['entrar', 'criar_conta', 'recuperar_acesso', 'comecar_seu_nome', 'conta'])
  })

  it(':madrugada é erro de uso nos três casos públicos, e vale em comecar_seu_nome e conta', () => {
    for (const caso of ['entrar', 'criar_conta', 'recuperar_acesso']) {
      assert.throws(() => lerArgumentos(['p', `${caso}:madrugada:1440x900`]), /sempre clara/)
      assert.doesNotThrow(() => lerArgumentos(['p', `${caso}:claro:1440x900`]))
    }
    for (const caso of ['comecar_seu_nome', 'conta']) assert.doesNotThrow(() => lerArgumentos(['p', `${caso}:madrugada:1440x900`]))
    assert.throws(() => lerArgumentos(['p', 'comecar-seu-nome:claro:1440x900']), /argumento inválido/)
  })

  it('nos 5 casos novos bloqueiam G1 a G12 e SB3 (sem NUM); sistema, as 14; os outros, G2 e G9', () => {
    for (const caso of Object.keys(CASOS_DE_ACESSO)) {
      const lista = bloqueantesDoCaso(caso)
      assert.equal(lista.length, 13, caso)
      assert.ok(lista.includes('G1') && lista.includes('G12') && lista.includes('SB3'), caso)
      assert.ok(!lista.includes('NUM'), caso)
    }
    assert.equal(bloqueantesDoCaso('sistema').length, 14)
    assert.deepEqual(bloqueantesDoCaso('hoje'), ['G2', 'G9'])
  })

  it('avaliarTudo marca G1 como bloqueante num caso novo e NUM como registrada', () => {
    const resultados = avaliarTudo({ doc: { ...doc1440, scrollWidth: 1500 }, nos: [], tema: 'claro' }, 'entrar')
    assert.equal(resultados.find((r) => r.regra === 'G1').bloqueia, true)
    assert.equal(resultados.find((r) => r.regra === 'NUM').bloqueia, false)
    assert.match(resumo('entrar_claro_1440.json', resultados), /G1 FALHA/)
    assert.match(resumo('entrar_claro_1440.json', resultados), /NUM ok/)
  })

  it('os critérios por caso, como na tabela do cartão', () => {
    // Volta 3 (D3): cada tela de formulário soma D3-fio, D3-controle e D3-anel; o fuso (Começar e Conta), o D3-fuso.
    const D3 = ['D3-fio', 'D3-controle', 'D3-anel']
    // Volta 3 (D5): as cinco telas somam, no fim, o vão depois do erro e o anel igual ao campo, em 390.
    const D5 = ['D5-erro', 'D5-anel']
    // Volta 3 (A-2b): só a Conta soma a folga da última âncora do índice até o fio da abertura, logo depois do A-2.
    // Volta 3 (D6): as cinco telas somam, no fim, a seleção de texto da paleta (D6-selecao).
    const D6 = ['D6-selecao']
    assert.deepEqual(criteriosDoCaso('entrar'), ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', ...D3, ...D5, ...D6])
    assert.deepEqual(criteriosDoCaso('criar_conta'), ['E-1', 'E-2', 'E-3', 'E-5', 'E-6', 'E-7', 'C-1', 'C-2', 'C-3', ...D3, ...D5, ...D6])
    // Volta 3 (D4): só o Recuperar soma o vão do fio do campo ao botão (D4-vao), em 390.
    assert.deepEqual(criteriosDoCaso('recuperar_acesso'), ['E-1', 'E-2', 'E-3', 'E-5', 'E-6', 'E-7', 'R-1', 'R-2', 'R-3', ...D3, 'D4-vao', ...D5, ...D6])
    assert.deepEqual(criteriosDoCaso('comecar_seu_nome'), ['E-1', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'B-1', 'B-2', 'B-3', ...D3, 'D3-fuso', ...D5, ...D6])
    assert.deepEqual(criteriosDoCaso('conta', 'claro'), ['A-1', 'A-2', 'A-2b', 'A-3', 'A-4', 'A-5', 'A-6', ...D3, 'D3-fuso', ...D5, ...D6])
    assert.deepEqual(criteriosDoCaso('conta', 'madrugada'), ['A-1', 'A-2', 'A-2b', 'A-3', 'A-4', 'A-5', 'A-6', ...D3, 'D3-fuso', ...D5, ...D6, 'M-1', 'M-2', 'M-3', 'M-4', 'M-5', 'M-6'])
    assert.deepEqual(criteriosDoCaso('hoje'), [])
    assert.deepEqual(criteriosDoCaso('sistema', 'madrugada'), [])
  })

  it('avaliarCriterios: sem leitura, todo critério reprova fechado e bloqueia; os manuais vêm junto', () => {
    const { criterios, criterios_manuais: manuais } = avaliarCriterios({ doc: doc1440, nos: [], tema: 'claro' }, 'entrar')
    assert.equal(criterios.length, 13)
    for (const r of criterios) {
      assert.deepEqual(Object.keys(r).sort(), ['bloqueia', 'motivo', 'nos_com_falha', 'ok', 'regra'])
      // Volta 3 (D5): os dois critérios de 390 não se aplicam em 1440 (passam como "não aplicável"); o resto reprova fechado.
      if (r.regra.startsWith('D5-')) assert.match(r.motivo, /não aplicável/)
      else assert.equal(r.ok, false, `${r.regra}: ${r.motivo}`)
      assert.equal(r.bloqueia, true)
    }
    assert.ok(manuais.some((m) => m.id === 'E-6' && m.olhar.length > 20))
    assert.ok(manuais.some((m) => m.id === 'E-7'))
    assert.ok(MANUAIS_DO_CASO.recuperar_acesso.some((m) => m.id === 'R-3'))
  })

  it('avaliarCriterios: os casos antigos saem com as duas listas vazias, e a regra que lança vira falha', () => {
    assert.deepEqual(avaliarCriterios({ doc: doc1440, nos: [], tema: 'claro' }, 'hoje'), { criterios: [], criterios_manuais: [] })
    const doc = {
      get largura() {
        throw new Error('explodiu')
      },
      clientWidth: 1425,
    }
    const { criterios } = avaliarCriterios({ doc, nos: [], tema: 'claro' }, 'conta')
    assert.match(criterios.find((r) => r.regra === 'A-1').motivo, /erro ao medir: explodiu/)
    assert.ok(criterios.every((r) => r.ok === false))
  })

  it('o resumo imprime também as regras de tela (E-1 ok E-2 FALHA ...)', () => {
    const g = [{ regra: 'G1', ok: true, bloqueia: true }]
    const t = [
      { regra: 'E-1', ok: true, bloqueia: true },
      { regra: 'E-2', ok: false, bloqueia: true },
      { regra: 'E-7', ok: false, bloqueia: false },
    ]
    assert.equal(resumo('a.json', g, t), 'RESUMO a.json G1 ok E-1 ok E-2 FALHA E-7 registrada')
    assert.equal(resumo('a.json', g), 'RESUMO a.json G1 ok')
  })
})

// --- Os construtores das fixtures de tela ----------------------------------------------------

const col = (n, doc = doc1440) => xDaColuna(n, doc.largura, doc.clientWidth)
const TINTA_FIO = 'rgb(26, 21, 17)'

/** Um nó dentro de `<main>`. */
const emMain = (extra = {}) => criar({ ...extra, m: { noMain: true, ...(extra.m ?? {}) } })

const ABERTURA_FIM = 300
const abertura = (extra = {}) =>
  emMain({ tag: 'section', texto: '', rect: { x: 32, y: 0, w: 1361, h: ABERTURA_FIM }, m: { abertura: true, bloco: true, filhoDeMain: true }, ...extra })

/** Uma linha de campo em 1440: a linha, o rótulo e o controle. */
function campoDesktop(y = 354, o = {}) {
  const x2 = col(2)
  const x9 = col(9)
  const altura = o.altura ?? 112
  const caixa = emMain({
    tag: 'div',
    texto: '',
    rect: { x: x2, y, w: x9 - x2, h: altura },
    m: { campo: true },
    estilo: { borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: TINTA_FIO, ...(o.estiloCampo ?? {}) },
    ...(o.semFio ? {} : { pseudo: { antes: { conteudo: '""', display: 'block', position: 'absolute', x: o.fioX ?? col(4), y: o.fioY ?? y + 32, w: 1, h: o.fioH ?? altura - 33, backgroundColor: TINTA_FIO } } }),
  })
  const rotulo = emMain({ tag: 'label', texto: 'E-mail', rect: { x: x2, y: y + 27, w: 137, h: 58 }, m: { rotuloCampo: true }, estilo: { fontSize: o.fonteRotulo ?? '32px' } })
  const controle = emMain({
    tag: o.tag ?? 'input',
    texto: '',
    textoControle: 'ana',
    rect: { x: col(4) + 32, y: y + 27, w: 500, h: 58 },
    m: { controle: true, interativo: true },
    estilo: { fontSize: o.fonteTexto ?? '48px', fontFamily: '"Instrument Serif", serif', ...(o.estiloControle ?? {}) },
  })
  return [caixa, rotulo, controle]
}

/** Um campo em 390: a linha, o rótulo, a caixa de 64 px e o controle. */
function campoCelular(y = 400, o = {}) {
  const caixa = emMain({ tag: 'div', texto: '', rect: { x: 16, y, w: 343, h: 110 }, m: { campo: true } })
  const rotulo = emMain({ tag: 'label', texto: 'E-mail', rect: { x: 16, y, w: 343, h: 29 }, m: { rotuloCampo: true }, estilo: { fontSize: o.fonteRotulo ?? '24px' } })
  const caixaDoControle = emMain({
    tag: 'div',
    texto: '',
    rect: { x: 16, y: y + 37, w: 343, h: o.alturaCaixa ?? 64 },
    m: { campoControle: true },
    estilo: { borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: TINTA_FIO, ...(o.estiloCaixa ?? {}) },
  })
  const controle = emMain({
    tag: o.tag ?? 'input',
    texto: '',
    textoControle: 'ana',
    rect: { x: 32, y: y + 37, w: 300, h: 64 },
    m: { controle: true, interativo: true },
    estilo: { fontSize: o.fonteTexto ?? '32px', fontFamily: '"Instrument Serif", serif' },
  })
  return [caixa, rotulo, caixaDoControle, controle]
}

const botaoEnvio = (rect, extra = {}) => emMain({ tag: 'button', texto: 'Entrar', rect, m: { botaoForm: true, interativo: true, botao: true }, ...extra })
const paginaComCampos = (campos = [campoDesktop(354), campoDesktop(466)]) => [abertura(), ...campos.flat()]

describe('E-1: o fio vertical só em x de c4, com a altura da linha', () => {
  it('passa: dois campos com o fio em x de c4 e nenhum no meio da janela', () => {
    const r = e1(paginaComCampos(), doc1440)
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'E-1')
  })

  it('o fio vertical da própria abertura (em x de c9, nos 80 px finais) não conta', () => {
    const base = emMain({ tag: 'div', texto: '', rect: { x: 32, y: 220, w: 1361, h: 80 }, pseudo: { antes: { conteudo: '""', display: 'block', position: 'absolute', x: col(9), y: 220, w: 1, h: 80, backgroundColor: TINTA_FIO } } })
    assert.equal(e1([...paginaComCampos(), base], doc1440).ok, true)
  })

  it('falha: um fio vertical em x=720 (borda de um lado só), correndo abaixo da abertura', () => {
    const fio = emMain({ tag: 'div', texto: '', rect: { x: 720, y: 136, w: 0, h: 1700 }, estilo: { borderLeftWidth: '1px', borderLeftStyle: 'solid' } })
    const r = e1([...paginaComCampos(), fio], doc1440)
    assert.equal(r.ok, false)
    assert.match(r.motivo, /no meio da janela/)
  })

  it('falha: um fio fora de x de c4, e um elemento fino de 1 px de largura', () => {
    const fora = emMain({ tag: 'div', texto: '', rect: { x: 900, y: 400, w: 0, h: 200 }, estilo: { borderLeftWidth: '1px', borderLeftStyle: 'solid' } })
    assert.equal(e1([...paginaComCampos(), fora], doc1440).ok, false)
    const fino = emMain({ tag: 'div', texto: '', rect: { x: 900, y: 400, w: 1, h: 200 }, estilo: { backgroundColor: TINTA_FIO } })
    assert.equal(e1([...paginaComCampos(), fino], doc1440).ok, false)
  })

  it('falha: um campo sem o fio vertical, ou com o fio acabando antes do fio de baixo', () => {
    assert.equal(e1(paginaComCampos([campoDesktop(354), campoDesktop(466, { semFio: true })]), doc1440).ok, false)
    const curto = e1(paginaComCampos([campoDesktop(354, { fioH: 60 })]), doc1440)
    assert.equal(curto.ok, false)
    assert.match(curto.motivo, /termina em y=/)
    assert.equal(e1(paginaComCampos([campoDesktop(354, { fioY: 354 })]), doc1440).ok, false)
  })

  it('borda: o fio a 1,9 px de x de c4 passa (±2) e a 3 px falha; uma borda de 4 px não é fio', () => {
    assert.equal(e1(paginaComCampos([campoDesktop(354, { fioX: col(4) + 1.9 })]), doc1440).ok, true)
    assert.equal(e1(paginaComCampos([campoDesktop(354, { fioX: col(4) + 3 })]), doc1440).ok, false)
    const barra = emMain({ tag: 'div', texto: '', rect: { x: 900, y: 400, w: 0, h: 200 }, estilo: { borderLeftWidth: '4px', borderLeftStyle: 'solid' } })
    assert.equal(e1([...paginaComCampos(), barra], doc1440).ok, true)
  })

  it('falha fechado: sem abertura, sem campo e com um fio de pseudo-elemento sem posição legível', () => {
    assert.equal(e1([...campoDesktop(354)], doc1440).ok, false)
    assert.equal(e1([abertura()], doc1440).ok, false)
    const ilegivel = emMain({ tag: 'div', texto: '', rect: { x: 0, y: 400, w: 10, h: 10 }, pseudo: { antes: { conteudo: '""', display: 'block', position: 'static', x: null, y: null, w: 1, h: 100, backgroundColor: TINTA_FIO } } })
    assert.equal(e1([...paginaComCampos(), ilegivel], doc1440).ok, false)
    assert.equal(e1(paginaComCampos(), undefined).ok, false)
    assert.equal(e1(paginaComCampos(), { largura: 1440 }).ok, false)
  })

  it('em 390 não há fio vertical: passa sem ele e falha com qualquer um', () => {
    const celular = [abertura({ rect: { x: 16, y: 0, w: 343, h: 300 } }), ...campoCelular(400)]
    assert.equal(e1(celular, doc390).ok, true)
    const fio = emMain({ tag: 'div', texto: '', rect: { x: 16, y: 400, w: 0, h: 100 }, estilo: { borderLeftWidth: '1px', borderLeftStyle: 'solid' } })
    assert.equal(e1([...celular, fio], doc390).ok, false)
  })
})

describe('E-2: 112 px de linha, rótulo de 32 e texto de 48 (64, 24 e 32 em 390)', () => {
  it('passa em 1440 e em 390', () => {
    assert.equal(e2(paginaComCampos(), doc1440).ok, true)
    assert.equal(e2([abertura(), ...campoCelular(400)], doc390).ok, true)
  })

  it('falha: linha de 98 px, rótulo de 14 px e texto de 20 px', () => {
    assert.equal(e2(paginaComCampos([campoDesktop(354, { altura: 98 })]), doc1440).ok, false)
    const rotulo = e2(paginaComCampos([campoDesktop(354, { fonteRotulo: '14px' })]), doc1440)
    assert.equal(rotulo.ok, false)
    assert.match(rotulo.motivo, /rótulo/)
    assert.equal(e2(paginaComCampos([campoDesktop(354, { fonteTexto: '20px' })]), doc1440).ok, false)
  })

  it('falha: as medidas de 1440 em 390, e a caixa de 48 px em 390', () => {
    assert.equal(e2([abertura(), ...campoCelular(400, { alturaCaixa: 48 })], doc390).ok, false)
    assert.equal(e2([abertura(), ...campoCelular(400, { fonteTexto: '48px' })], doc390).ok, false)
  })

  it('borda: 114 px passam (±2) e 115 falham', () => {
    assert.equal(e2(paginaComCampos([campoDesktop(354, { altura: 114 })]), doc1440).ok, true)
    assert.equal(e2(paginaComCampos([campoDesktop(354, { altura: 115 })]), doc1440).ok, false)
  })

  it('falha fechado: sem campo, controle fora de uma linha, campo sem rótulo e sem largura', () => {
    assert.equal(e2([abertura()], doc1440).ok, false)
    const solto = emMain({ tag: 'input', texto: '', textoControle: 'x', rect: { x: 700, y: 900, w: 100, h: 58 }, m: { controle: true, interativo: true }, estilo: { fontSize: '48px' } })
    assert.equal(e2([...paginaComCampos(), solto], doc1440).ok, false)
    const [caixa, , controle] = campoDesktop(354)
    assert.equal(e2([abertura(), caixa, controle], doc1440).ok, false)
    assert.equal(e2(paginaComCampos(), { largura: 1440 }).ok, false)
  })
})

describe('E-3: sem borda nos 4 lados e o fio de 1 px de c2 a c9', () => {
  it('passa em 1440 e em 390', () => {
    const r = e3(paginaComCampos(), doc1440)
    assert.equal(r.ok, true, r.motivo)
    assert.equal(e3([abertura(), ...campoCelular(400)], doc390).ok, true)
  })

  it('falha: o input com borda nos 4 lados, o fio de 2 px e o fio tracejado', () => {
    const borda4 = { borderTopWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px', borderTopStyle: 'solid', borderRightStyle: 'solid', borderBottomStyle: 'solid', borderLeftStyle: 'solid' }
    assert.equal(e3(paginaComCampos([campoDesktop(354, { estiloControle: borda4 })]), doc1440).ok, false)
    assert.equal(e3(paginaComCampos([campoDesktop(354, { estiloCampo: { borderBottomWidth: '2px' } })]), doc1440).ok, false)
    assert.equal(e3(paginaComCampos([campoDesktop(354, { estiloCampo: { borderBottomStyle: 'dashed' } })]), doc1440).ok, false)
  })

  it('falha: o fio que começa em x=785 (o desenho antigo) e o que não chega a c9', () => {
    const [caixa, rotulo, controle] = campoDesktop(354)
    const comeca = { ...caixa, rect: { ...caixa.rect, x: 785, w: caixa.rect.w - 616 } }
    assert.equal(e3([abertura(), comeca, rotulo, controle], doc1440).ok, false)
    const curto = { ...caixa, rect: { ...caixa.rect, w: caixa.rect.w - 40 } }
    assert.equal(e3([abertura(), curto, rotulo, controle], doc1440).ok, false)
  })

  it('borda: o fio começando 1,9 px antes passa (±2) e 3 px antes falha', () => {
    const [caixa, rotulo, controle] = campoDesktop(354)
    const com = (d) => [abertura(), { ...caixa, rect: { ...caixa.rect, x: caixa.rect.x - d, w: caixa.rect.w + d } }, rotulo, controle]
    assert.equal(e3(com(1.9), doc1440).ok, true)
    assert.equal(e3(com(3), doc1440).ok, false)
  })

  it('falha fechado: sem campo, border-bottom ausente e controle fora da linha', () => {
    assert.equal(e3([abertura()], doc1440).ok, false)
    const [caixa, rotulo, controle] = campoDesktop(354)
    const semBorda = { ...caixa, estilo: { ...caixa.estilo, borderBottomWidth: undefined } }
    assert.equal(e3([abertura(), semBorda, rotulo, controle], doc1440).ok, false)
    const solto = emMain({ tag: 'input', texto: '', textoControle: 'x', rect: { x: 700, y: 900, w: 100, h: 58 }, m: { controle: true, interativo: true } })
    assert.equal(e3([...paginaComCampos(), solto], doc1440).ok, false)
  })
})

describe('E-4: o botão de envio termina em y ≤ 720 (660 em 390)', () => {
  it('passa em 1440 (fim em 690) e em 390 (fim em 640)', () => {
    assert.equal(e4([botaoEnvio({ x: 472, y: 610, w: 300, h: 80 })], doc1440).ok, true)
    assert.equal(e4([botaoEnvio({ x: 16, y: 576, w: 343, h: 64 })], doc390).ok, true)
  })

  it('falha: o botão terminando em y=811 (o desenho antigo) e, em 390, em y=700', () => {
    assert.equal(e4([botaoEnvio({ x: 472, y: 731, w: 300, h: 80 })], doc1440).ok, false)
    assert.equal(e4([botaoEnvio({ x: 16, y: 636, w: 343, h: 64 })], doc390).ok, false)
  })

  it('borda: termina em y=720 passa e em 721 falha; o limite de 390 é outro', () => {
    assert.equal(e4([botaoEnvio({ x: 0, y: 640, w: 300, h: 80 })], doc1440).ok, true)
    assert.equal(e4([botaoEnvio({ x: 0, y: 641, w: 300, h: 80 })], doc1440).ok, false)
    assert.equal(e4([botaoEnvio({ x: 0, y: 596, w: 300, h: 64 })], doc390).ok, true)
    assert.equal(e4([botaoEnvio({ x: 0, y: 600, w: 300, h: 64 })], doc390).ok, false)
  })

  it('falha fechado: sem botão de envio, botão oculto ou sem retângulo', () => {
    assert.equal(e4([], doc1440).ok, false)
    assert.equal(e4([botaoEnvio({ x: 0, y: 610, w: 300, h: 80 }, { visivel: false })], doc1440).ok, false)
    assert.equal(e4([botaoEnvio({}, {})], doc1440).ok, false)
    assert.equal(e4([botaoEnvio({ x: 0, y: 610, w: 300, h: 80 })], undefined).ok, false)
  })
})

describe('E-5: o botão tem altura 80 (64) e começa em x de c4 + 32 (largura da área útil em 390)', () => {
  it('passa em 1440 e em 390', () => {
    const r = e5([botaoEnvio({ x: col(4) + 32, y: 610, w: 300, h: 80 })], doc1440)
    assert.equal(r.ok, true, r.motivo)
    assert.equal(e5([botaoEnvio({ x: 16, y: 576, w: 343, h: 64 })], doc390).ok, true)
  })

  it('falha: altura 56, x errado, e em 390 a largura de 200', () => {
    assert.equal(e5([botaoEnvio({ x: col(4) + 32, y: 610, w: 300, h: 56 })], doc1440).ok, false)
    assert.equal(e5([botaoEnvio({ x: 785, y: 610, w: 300, h: 80 })], doc1440).ok, false)
    assert.equal(e5([botaoEnvio({ x: 16, y: 576, w: 200, h: 64 })], doc390).ok, false)
    assert.equal(e5([botaoEnvio({ x: 16, y: 576, w: 343, h: 80 })], doc390).ok, false)
  })

  it('borda: ±2 px passam (1,9 aqui, por causa do ponto flutuante) e 3 px falham (altura e x)', () => {
    assert.equal(e5([botaoEnvio({ x: col(4) + 33.9, y: 610, w: 300, h: 81.9 })], doc1440).ok, true)
    assert.equal(e5([botaoEnvio({ x: col(4) + 35, y: 610, w: 300, h: 80 })], doc1440).ok, false)
    assert.equal(e5([botaoEnvio({ x: col(4) + 32, y: 610, w: 300, h: 83 })], doc1440).ok, false)
  })

  it('falha fechado: sem botão e sem largura da janela', () => {
    assert.equal(e5([], doc1440).ok, false)
    assert.equal(e5([botaoEnvio({ x: 472, y: 610, w: 300, h: 80 })], { clientWidth: 1425 }).ok, false)
  })
})

describe('E-6: nada à direita de x de c9 abaixo da abertura', () => {
  const texto = (x, w, extra = {}) => emMain({ rect: { x, y: 500, w: 600, h: 28 }, rectTexto: { x, y: 500, w, h: 28 }, ...extra })

  it('passa com texto, controle e botão dentro de c2–c8', () => {
    const r = e6([abertura(), texto(col(2), 560), ...campoDesktop(354), botaoEnvio({ x: col(4) + 32, y: 610, w: 300, h: 80 })], doc1440)
    assert.equal(r.ok, true, r.motivo)
  })

  it('o conteúdo da abertura (a coluna lateral em c9–c10) e a mídia ficam de fora', () => {
    const lateral = emMain({ tag: 'li', texto: 'Protótipo', rect: { x: col(9) + 32, y: 40, w: 100, h: 32 } })
    const midia = emMain({ tag: 'div', texto: '', rect: { x: 32, y: 800, w: 1361, h: 888 }, m: { dentroMidia: true, interativo: true } })
    assert.equal(e6([abertura(), lateral, midia, texto(col(2), 500)], doc1440).ok, true)
  })

  it('falha: o formulário em x=785–1225 (o desenho antigo) e o texto que passa de c9', () => {
    const antigo = emMain({ tag: 'input', texto: '', textoControle: 'a', rect: { x: 785, y: 400, w: 440, h: 48 }, m: { controle: true, interativo: true } })
    const r = e6([abertura(), antigo, texto(col(2), 500)], doc1440)
    assert.equal(r.ok, false)
    assert.match(r.motivo, /à direita de/)
    assert.equal(e6([abertura(), texto(col(2), 1000)], doc1440).ok, false)
  })

  it('usa o retângulo do texto, não o da caixa: um parágrafo de caixa larga com texto curto passa', () => {
    const largo = emMain({ rect: { x: col(2), y: 500, w: 1300, h: 28 }, rectTexto: { x: col(2), y: 500, w: 500, h: 28 } })
    assert.equal(e6([abertura(), largo], doc1440).ok, true)
  })

  it('borda: terminar 1,9 px depois de c9 passa (±2) e 3 px falha', () => {
    assert.equal(e6([abertura(), texto(col(2), col(9) + 1.9 - col(2))], doc1440).ok, true)
    assert.equal(e6([abertura(), texto(col(2), col(9) + 3 - col(2))], doc1440).ok, false)
  })

  it('falha fechado: sem abertura e sem conteúdo abaixo dela', () => {
    assert.equal(e6([texto(col(2), 500)], doc1440).ok, false)
    assert.equal(e6([abertura()], doc1440).ok, false)
    assert.equal(e6([abertura(), texto(col(2), 500)], undefined).ok, false)
  })
})

describe('E-7: o anel de foco de 2 px', () => {
  const anel = (extra = {}) => ({ ...ANEL_OK, tag: 'input', mensagens: [mensagemDoFoco()], ...extra })
  // O anel de foco é a parte do E-7 deste bloco; a geometria do envio (estável aqui) tem o bloco dela mais abaixo.
  const doc = (foco = {}) => ({ ...doc1440, foco: { controle: anel(), botao: anel({ tag: 'button' }), ...foco }, envio: { vazio: vazioEstavel() } })

  it('passa: 2 px sólido, offset 2, tinta, no controle e no botão', () => {
    const r = e7(doc(), 'claro')
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'E-7')
  })

  it('na madrugada a cor do anel é #F7EFE2 e a tinta reprova', () => {
    assert.equal(e7(doc({ controle: anel({ outlineColor: 'rgb(247, 239, 226)' }), botao: anel({ outlineColor: 'rgb(247, 239, 226)' }) }), 'madrugada').ok, true)
    assert.equal(e7(doc(), 'madrugada').ok, false)
  })

  it('falha: sem outline, de 1 px, tracejado, sem offset e de outra cor', () => {
    assert.equal(e7(doc({ controle: anel({ outlineStyle: 'none', outlineWidth: '0px' }) }), 'claro').ok, false)
    assert.equal(e7(doc({ botao: anel({ outlineWidth: '1px' }) }), 'claro').ok, false)
    assert.equal(e7(doc({ controle: anel({ outlineStyle: 'dashed' }) }), 'claro').ok, false)
    assert.equal(e7(doc({ controle: anel({ outlineOffset: '0px' }) }), 'claro').ok, false)
    assert.equal(e7(doc({ botao: anel({ outlineColor: 'rgb(176, 64, 28)' }) }), 'claro').ok, false)
  })

  it('borda: 2,01 px passa (a tolerância é de 0,01) e 2,5 px falha', () => {
    assert.equal(e7(doc({ controle: anel({ outlineWidth: '2.005px' }) }), 'claro').ok, true)
    assert.equal(e7(doc({ controle: anel({ outlineWidth: '2.5px' }) }), 'claro').ok, false)
  })

  it('falha fechado: sem leitura, sem o botão, elemento que não recebeu foco e campos ausentes', () => {
    assert.equal(e7({ ...doc1440 }, 'claro').ok, false)
    assert.equal(e7(undefined, 'claro').ok, false)
    assert.equal(e7(doc({ botao: null }), 'claro').ok, false)
    assert.equal(e7(doc({ controle: { focou: false } }), 'claro').ok, false)
    assert.equal(e7(doc({ controle: anel({ outlineStyle: undefined }) }), 'claro').ok, false)
    assert.equal(e7(doc({ controle: anel({ outlineColor: undefined }) }), 'claro').ok, false)
  })
})

describe('C-1: o aviso de demonstração sem borda, sem fundo e em 15 px', () => {
  const aviso = (estilo = {}) =>
    emMain({
      tag: 'p',
      texto: 'Este site é uma demonstração.',
      m: { avisoDemo: true },
      estilo: { fontSize: '15px', borderTopWidth: '0px', borderRightWidth: '0px', borderBottomWidth: '0px', borderLeftWidth: '0px', backgroundColor: TRANSPARENTE, ...estilo },
    })

  it('passa', () => assert.equal(c1([aviso()]).ok, true))

  it('falha: com borda (o desenho antigo), com fundo e com 14 px', () => {
    const r = c1([aviso({ borderTopWidth: '1px', borderTopStyle: 'solid' })])
    assert.equal(r.ok, false)
    assert.match(r.motivo, /borda/)
    assert.equal(c1([aviso({ backgroundColor: 'rgb(235, 225, 208)' })]).ok, false)
    assert.equal(c1([aviso({ fontSize: '14px' })]).ok, false)
  })

  it('borda: fundo com alfa 0 passa e alfa 0,5 falha; borda de 1 px com style none passa; 15,5 px falha', () => {
    assert.equal(c1([aviso({ backgroundColor: 'rgba(235, 225, 208, 0)' })]).ok, true)
    assert.equal(c1([aviso({ backgroundColor: 'rgba(235, 225, 208, 0.5)' })]).ok, false)
    assert.equal(c1([aviso({ borderTopWidth: '1px', borderTopStyle: 'none' })]).ok, true)
    assert.equal(c1([aviso({ fontSize: '15.5px' })]).ok, false)
  })

  it('falha fechado: sem aviso, borda ausente e fundo ilegível', () => {
    assert.equal(c1([]).ok, false)
    assert.equal(c1([aviso({ borderLeftWidth: undefined })]).ok, false)
    assert.equal(c1([aviso({ backgroundColor: 'oklch(0.9 0.02 80)' })]).ok, false)
  })
})

describe('C-2 e C-3: o botão Criar conta e o texto de aceite', () => {
  const aceite = (y, extra = {}) => emMain({ tag: 'p', texto: '', textoTotal: 'Ao criar a conta, você aceita os Termos de uso e a Política de privacidade.', rect: { x: col(4) + 32, y, w: 560, h: 48 }, ...extra })

  it('C-2 passa com o fim em y=866, falha em 900 e é não aplicável em 390', () => {
    assert.equal(c2([botaoEnvio({ x: 472, y: 786, w: 300, h: 80 })], doc1440).ok, true)
    const r = c2([botaoEnvio({ x: 472, y: 820, w: 300, h: 80 })], doc1440)
    assert.equal(r.ok, false)
    assert.match(c2([botaoEnvio({ x: 16, y: 900, w: 343, h: 64 })], doc390).motivo, /não aplicável/)
  })

  it('C-2 borda: y=880 passa, 881 falha; falha fechado sem botão', () => {
    assert.equal(c2([botaoEnvio({ x: 0, y: 800, w: 300, h: 80 })], doc1440).ok, true)
    assert.equal(c2([botaoEnvio({ x: 0, y: 801, w: 300, h: 80 })], doc1440).ok, false)
    assert.equal(c2([], doc1440).ok, false)
    assert.equal(c2([botaoEnvio({ x: 0, y: 800, w: 300, h: 80 })], undefined).ok, false)
  })

  it('C-3 passa com o aceite a 24 px acima do botão e falha a 80 px', () => {
    assert.equal(c3([aceite(714), botaoEnvio({ x: 472, y: 786, w: 300, h: 80 })]).ok, true)
    const longe = c3([aceite(640), botaoEnvio({ x: 472, y: 786, w: 300, h: 80 })])
    assert.equal(longe.ok, false)
    assert.match(longe.motivo, /98\.0 px|98 px/)
  })

  it('C-3 borda: 24 px passam, 25 falham, e o aceite que encosta no botão (0 px) passa', () => {
    assert.equal(c3([aceite(714), botaoEnvio({ x: 0, y: 786, w: 300, h: 80 })]).ok, true)
    assert.equal(c3([aceite(713), botaoEnvio({ x: 0, y: 786, w: 300, h: 80 })]).ok, false)
    assert.equal(c3([aceite(738), botaoEnvio({ x: 0, y: 786, w: 300, h: 80 })]).ok, true)
  })

  it('C-3 falha fechado: sem botão, sem aceite, aceite depois do botão', () => {
    assert.equal(c3([aceite(714)]).ok, false)
    assert.equal(c3([botaoEnvio({ x: 0, y: 786, w: 300, h: 80 })]).ok, false)
    assert.equal(c3([aceite(900), botaoEnvio({ x: 0, y: 786, w: 300, h: 80 })]).ok, false)
  })
})

describe('R-1 e R-2: o h1 de uma linha e o topo das linhas', () => {
  const h1 = (extra = {}) => emMain({ tag: 'h1', texto: 'Recuperar acesso', rect: { x: 32, y: 64, w: 1100, h: 96 }, rectTexto: { x: 32, y: 64, w: 900, h: 96 }, estilo: { lineHeight: '96px' }, ...extra })
  const linhas = (y) => emMain({ tag: 'div', texto: '', rect: { x: col(2), y, w: 900, h: 120 }, m: { linha: true } })

  it('R-1 passa: 1 linha em 1440 e 2 linhas em 390', () => {
    assert.equal(r1([h1()], doc1440).ok, true)
    assert.equal(r1([h1({ rect: { x: 16, y: 32, w: 343, h: 96 }, rectTexto: { x: 16, y: 32, w: 300, h: 96 }, estilo: { lineHeight: '48px' } })], doc390).ok, true)
  })

  it('R-1 falha: 2 linhas em 1440, 3 em 390 e o texto que passa de c8', () => {
    assert.equal(r1([h1({ rect: { x: 32, y: 64, w: 600, h: 192 } })], doc1440).ok, false)
    assert.equal(r1([h1({ rect: { x: 16, y: 32, w: 343, h: 144 }, rectTexto: { x: 16, y: 32, w: 300, h: 144 }, estilo: { lineHeight: '48px' } })], doc390).ok, false)
    assert.equal(r1([h1({ rectTexto: { x: 32, y: 64, w: 1200, h: 96 } })], doc1440).ok, false)
  })

  it('R-1 borda: o texto terminando 1,9 px depois de c9 passa (±2) e 3 px falha', () => {
    assert.equal(r1([h1({ rectTexto: { x: 32, y: 64, w: col(9) + 1.9 - 32, h: 96 } })], doc1440).ok, true)
    assert.equal(r1([h1({ rectTexto: { x: 32, y: 64, w: col(9) + 3 - 32, h: 96 } })], doc1440).ok, false)
  })

  it('R-1 falha fechado: sem h1, sem entrelinha numérica e sem altura', () => {
    assert.equal(r1([criar()], doc1440).ok, false)
    assert.equal(r1([h1({ estilo: { lineHeight: 'normal' } })], doc1440).ok, false)
    assert.equal(r1([h1({ rect: { x: 32, y: 64, w: 100, h: 0 } })], doc1440).ok, false)
    assert.equal(r1([h1()], undefined).ok, false)
  })

  it('R-2 passa com o topo em y=738, falha em 800 (e em 780) e é não aplicável em 390', () => {
    assert.equal(r2([linhas(738)], doc1440).ok, true)
    assert.equal(r2([linhas(800)], doc1440).ok, false)
    assert.match(r2([linhas(900)], doc390).motivo, /não aplicável/)
  })

  it('R-2 borda: y=760 passa e 761 falha; usa a mais alta das linhas; falha fechado sem linhas', () => {
    assert.equal(r2([linhas(760)], doc1440).ok, true)
    assert.equal(r2([linhas(761)], doc1440).ok, false)
    assert.equal(r2([linhas(900), linhas(700)], doc1440).ok, true)
    assert.equal(r2([], doc1440).ok, false)
    assert.equal(r2([linhas(738)], undefined).ok, false)
  })
})

describe('B-1: "Passo 1 de 2" como etiqueta de 15 px na coluna lateral', () => {
  const passo = (extra = {}) =>
    emMain({ tag: 'span', texto: 'Passo 1 de 2', rect: { x: col(9) + 32, y: 40, w: 100, h: 26 }, m: { etiqueta: true }, estilo: { fontSize: '15px', textTransform: 'none' }, ...extra })

  it('passa em 1440 (x ≥ c9 + 32) e em 390 (antes do fio da abertura)', () => {
    assert.equal(b1([abertura(), passo()], doc1440).ok, true)
    assert.equal(b1([abertura({ rect: { x: 16, y: 0, w: 343, h: 300 } }), passo({ rect: { x: 16, y: 200, w: 100, h: 26 } })], doc390).ok, true)
  })

  it('falha: 14 px em caixa alta que não é etiqueta (o desenho antigo), fora da coluna lateral e depois do fio em 390', () => {
    const antigo = b1([abertura(), passo({ m: { etiqueta: false }, estilo: { fontSize: '14px', textTransform: 'uppercase' } })], doc1440)
    assert.equal(antigo.ok, false)
    assert.match(antigo.motivo, /etiqueta|font-size|caixa alta/)
    assert.equal(b1([abertura(), passo({ rect: { x: 500, y: 40, w: 100, h: 26 } })], doc1440).ok, false)
    assert.equal(b1([abertura({ rect: { x: 16, y: 0, w: 343, h: 300 } }), passo({ rect: { x: 16, y: 400, w: 100, h: 26 } })], doc390).ok, false)
  })

  it('borda: x 1,9 px antes passa (±2) e 3 px antes falha; 15,5 px falha', () => {
    assert.equal(b1([abertura(), passo({ rect: { x: col(9) + 30.1, y: 40, w: 100, h: 26 } })], doc1440).ok, true)
    assert.equal(b1([abertura(), passo({ rect: { x: col(9) + 29, y: 40, w: 100, h: 26 } })], doc1440).ok, false)
    assert.equal(b1([abertura(), passo({ estilo: { fontSize: '15.5px' } })], doc1440).ok, false)
  })

  it('falha fechado: sem o texto, sem text-transform e sem abertura em 390', () => {
    assert.equal(b1([abertura()], doc1440).ok, false)
    assert.equal(b1([abertura(), passo({ estilo: { textTransform: undefined } })], doc1440).ok, false)
    assert.equal(b1([passo({ rect: { x: 16, y: 200, w: 100, h: 26 } })], doc390).ok, false)
    assert.equal(b1([abertura(), passo()], undefined).ok, false)
  })
})

describe('B-2: o select é igual ao input (altura, fio e fonte)', () => {
  it('passa em 1440 e em 390', () => {
    const r = b2(paginaComCampos([campoDesktop(354), campoDesktop(466, { tag: 'select' })]), doc1440)
    assert.equal(r.ok, true, r.motivo)
    assert.equal(b2([abertura(), ...campoCelular(400), ...campoCelular(560, { tag: 'select' })], doc390).ok, true)
  })

  it('falha: select de 48 px de altura (caixa antiga), de 20 px de fonte e de outra fonte', () => {
    assert.equal(b2(paginaComCampos([campoDesktop(354), campoDesktop(466, { tag: 'select', altura: 48 })]), doc1440).ok, false)
    assert.equal(b2(paginaComCampos([campoDesktop(354), campoDesktop(466, { tag: 'select', fonteTexto: '20px' })]), doc1440).ok, false)
    assert.equal(b2(paginaComCampos([campoDesktop(354), campoDesktop(466, { tag: 'select', estiloControle: { fontFamily: 'Arial, sans-serif' } })]), doc1440).ok, false)
  })

  it('falha: o fio do select diferente do fio do input (cor ou espessura)', () => {
    assert.equal(b2(paginaComCampos([campoDesktop(354), campoDesktop(466, { tag: 'select', estiloCampo: { borderBottomColor: 'rgb(94, 85, 76)' } })]), doc1440).ok, false)
    assert.equal(b2(paginaComCampos([campoDesktop(354), campoDesktop(466, { tag: 'select', estiloCampo: { borderBottomWidth: '2px' } })]), doc1440).ok, false)
  })

  it('borda: 2 px de diferença de altura passam e 3 falham', () => {
    assert.equal(b2(paginaComCampos([campoDesktop(354), campoDesktop(466, { tag: 'select', altura: 114 })]), doc1440).ok, true)
    assert.equal(b2(paginaComCampos([campoDesktop(354), campoDesktop(466, { tag: 'select', altura: 115 })]), doc1440).ok, false)
  })

  it('falha fechado: sem select, sem input, select fora de uma linha de campo e fio ausente', () => {
    assert.equal(b2(paginaComCampos([campoDesktop(354)]), doc1440).ok, false)
    assert.equal(b2(paginaComCampos([campoDesktop(354, { tag: 'select' })]), doc1440).ok, false)
    const solto = emMain({ tag: 'select', texto: '', textoControle: 'x', rect: { x: 700, y: 900, w: 100, h: 48 }, m: { controle: true, interativo: true }, estilo: { fontSize: '48px' } })
    assert.equal(b2([...paginaComCampos([campoDesktop(354)]), solto], doc1440).ok, false)
    assert.equal(b2(paginaComCampos([campoDesktop(354), campoDesktop(466, { tag: 'select', estiloCampo: { borderBottomColor: undefined } })]), doc1440).ok, false)
  })
})

describe('B-3: nenhum bloco com min-height nem altura esticada', () => {
  const bloco = (extra = {}) =>
    emMain({ tag: 'section', texto: '', rect: { x: 32, y: 400, w: 1361, h: 300 }, m: { filhoDeMain: true }, estilo: { minHeight: '0px' }, vazioFim: { vazio: 0, margem: 0 }, ...extra })

  it('passa: min-height 0 ou auto e sem vazio no fim', () => {
    assert.equal(b3([bloco(), bloco({ estilo: { minHeight: 'auto' } })]).ok, true)
  })

  it('falha: min-height de 828 px e 140 px vazios (o painel esticado do desenho antigo)', () => {
    const minimo = b3([bloco({ estilo: { minHeight: '828px' } })])
    assert.equal(minimo.ok, false)
    assert.match(minimo.motivo, /min-height/)
    const esticado = b3([bloco({ vazioFim: { vazio: 140, margem: 0 } })])
    assert.equal(esticado.ok, false)
    assert.match(esticado.motivo, /esticada/)
  })

  it('borda: 2 px de vazio passam, 3 falham, e o vazio igual à margem do último filho passa', () => {
    assert.equal(b3([bloco({ vazioFim: { vazio: 2, margem: 0 } })]).ok, true)
    assert.equal(b3([bloco({ vazioFim: { vazio: 3, margem: 0 } })]).ok, false)
    assert.equal(b3([bloco({ vazioFim: { vazio: 32, margem: 32 } })]).ok, true)
    assert.equal(b3([bloco({ vazioFim: { vazio: -10, margem: 0 } })]).ok, true)
  })

  it('o [data-bloco] também é um bloco', () => {
    assert.equal(b3([bloco({ m: { filhoDeMain: false, bloco: true }, vazioFim: { vazio: 90, margem: 0 } })]).ok, false)
  })

  it('falha fechado: nenhum bloco, min-height ausente e sem a leitura do vazio', () => {
    assert.equal(b3([criar()]).ok, false)
    assert.equal(b3([bloco({ estilo: { minHeight: undefined } })]).ok, false)
    assert.equal(b3([bloco({ vazioFim: null })]).ok, false)
    assert.equal(b3([bloco({ vazioFim: { vazio: Number.NaN, margem: 0 } })]).ok, false)
  })
})

describe('A-1: nada do main abaixo da abertura fora de c2–c8', () => {
  const texto = (x, w, extra = {}) => emMain({ rect: { x, y: 500, w: 600, h: 28 }, rectTexto: { x, y: 500, w, h: 28 }, ...extra })

  it('passa em 1440 (de c2 a c9) e em 390 (na área útil)', () => {
    const r = a1([abertura(), texto(col(2), 500), texto(col(2), 900)], doc1440)
    assert.equal(r.ok, true, r.motivo)
    assert.equal(a1([abertura({ rect: { x: 16, y: 0, w: 343, h: 300 } }), texto(16, 300)], doc390).ok, true)
  })

  it('falha: o conteúdo a partir de x=32 e o que passa de c9', () => {
    const esquerda = a1([abertura(), texto(32, 400)], doc1440)
    assert.equal(esquerda.ok, false)
    assert.match(esquerda.motivo, /à esquerda de/)
    assert.equal(a1([abertura(), texto(col(2), 1100)], doc1440).ok, false)
    assert.equal(a1([abertura({ rect: { x: 16, y: 0, w: 343, h: 300 } }), texto(16, 400)], doc390).ok, false)
  })

  it('usa a margem e a área úteis medidas (clientWidth), não x=169,6 fixo', () => {
    const docSemBarra = { ...doc1440, clientWidth: 1440 }
    assert.equal(a1([abertura(), texto(169.6, 500)], docSemBarra).ok, true)
    assert.equal(a1([abertura(), texto(169.6, 500)], doc1440).ok, true)
    assert.equal(a1([abertura(), texto(col(2, docSemBarra) - 3, 500)], docSemBarra).ok, false)
  })

  it('borda: 1,9 px à esquerda de c2 passam (±2) e 3 px falham', () => {
    assert.equal(a1([abertura(), texto(col(2) - 1.9, 500)], doc1440).ok, true)
    assert.equal(a1([abertura(), texto(col(2) - 3, 500)], doc1440).ok, false)
  })

  it('falha fechado: sem abertura, sem conteúdo e sem largura', () => {
    assert.equal(a1([texto(col(2), 500)], doc1440).ok, false)
    assert.equal(a1([abertura()], doc1440).ok, false)
    assert.equal(a1([abertura(), texto(col(2), 500)], undefined).ok, false)
  })
})

describe('A-2: as 6 âncoras da coluna lateral', () => {
  const ancora = (i, extra = {}) =>
    emMain({ tag: 'a', texto: `Seção ${i}`, rect: { x: col(9) + 32, y: 40 + i * 32, w: 120, h: 32 }, m: { ancoraLateral: true, interativo: true }, href: `#s${i}`, alvoExiste: true, ...extra })
  const seis = (mudar = () => ({})) => Array.from({ length: 6 }, (_, i) => ancora(i, mudar(i)))

  // Em 390 as âncoras vão em linha, com quebra. Cada uma leva a caixa (alvo de toque: no mínimo 44 de
  // largura) e o retângulo do próprio texto, que é o que o olho vê: Perfil, Id da conta, Seus dados |
  // Privacidade, Sair, Excluir conta. `Sair` é mais estreita que o alvo de 44.
  const LARGURAS = [38, 80, 78, 85, 30, 95]
  const ancoras390 = ({ larguras = LARGURAS, porLinha = 3, espaco = () => 24, y = (linha) => 200 + linha * 44, ajuste = () => ({}) } = {}) => {
    let x = 16
    return larguras.map((w, i) => {
      if (i % porLinha === 0) x = 16
      const ytexto = y(Math.floor(i / porLinha))
      const no = ancora(i, {
        rect: { x, y: ytexto - 10, w: Math.max(44, w), h: 44 },
        rectTexto: { x, y: ytexto, w, h: 24 },
        ...ajuste(i),
      })
      x += w + espaco(i)
      return no
    })
  }

  it('passa: 6 âncoras no mesmo x, de 32 em 32, todas com destino', () => {
    const r = a2(seis(), doc1440)
    assert.equal(r.ok, true, r.motivo)
  })

  it('falha: 5 âncoras, uma sem destino, x diferente, passo de 44 e coluna errada', () => {
    assert.equal(a2(seis().slice(0, 5), doc1440).ok, false)
    const semAlvo = a2(seis((i) => (i === 3 ? { alvoExiste: false } : {})), doc1440)
    assert.equal(semAlvo.ok, false)
    assert.match(semAlvo.motivo, /não leva a um id existente/)
    assert.equal(a2(seis((i) => (i === 2 ? { rect: { x: col(9) + 60, y: 40 + i * 32, w: 120, h: 32 } } : {})), doc1440).ok, false)
    assert.equal(a2(seis((i) => ({ rect: { x: col(9) + 32, y: 40 + i * 44, w: 120, h: 44 } })), doc1440).ok, false)
    assert.equal(a2(seis((i) => ({ rect: { x: 300, y: 40 + i * 32, w: 120, h: 32 } })), doc1440).ok, false)
  })

  it('borda: passo de 34 passa (±2) e de 35 falha; em 390 vale só a contagem e o destino (âncoras em linha)', () => {
    assert.equal(a2(seis((i) => ({ rect: { x: col(9) + 32, y: 40 + i * 34, w: 120, h: 32 } })), doc1440).ok, true)
    assert.equal(a2(seis((i) => ({ rect: { x: col(9) + 32, y: 40 + i * 35, w: 120, h: 32 } })), doc1440).ok, false)
    assert.equal(a2(ancoras390(), doc390).ok, true)
    assert.equal(a2(ancoras390({ ajuste: (i) => (i === 0 ? { alvoExiste: false } : {}) }), doc390).ok, false)
    assert.equal(a2(ancoras390().slice(0, 5), doc390).ok, false)
  })

  it('390: o espaço visível entre âncoras vizinhas é o mesmo, na linha e de uma linha para a outra', () => {
    const r = a2(ancoras390(), doc390)
    assert.equal(r.ok, true, r.motivo)
    assert.equal(a2(ancoras390({ espaco: () => 30 }), doc390).ok, true)
  })

  it('390: o defeito D-3 (24 px de Privacidade a Sair e 38 de Sair a Excluir conta) reprova', () => {
    const r = a2(ancoras390({ espaco: (i) => (i === 4 ? 38 : 24) }), doc390)
    assert.equal(r.ok, false)
    assert.match(r.motivo, /espaço de 38\.0 px/)
    assert.equal(r.nos_com_falha.length > 0, true)
  })

  it('390: uma mutação num espaço — +1 px passa (±1), −2 px e +3 px reprovam', () => {
    assert.equal(a2(ancoras390({ espaco: (i) => (i === 1 ? 25 : 24) }), doc390).ok, true)
    assert.equal(a2(ancoras390({ espaco: (i) => (i === 1 ? 22 : 24) }), doc390).ok, false)
    assert.equal(a2(ancoras390({ espaco: (i) => (i === 3 ? 27 : 24) }), doc390).ok, false)
    assert.equal(a2(ancoras390({ espaco: (i) => (i === 0 ? 22 : 24) }), doc390).ok, false)
  })

  it('390: o passo vertical é o mesmo em todas as passagens (3 linhas de 2, ±1 px)', () => {
    const tresLinhas = (y) => a2(ancoras390({ porLinha: 2, y }), doc390)
    assert.equal(tresLinhas((l) => 200 + l * 44).ok, true)
    assert.equal(tresLinhas((l) => 200 + l * 44 + (l === 2 ? 1 : 0)).ok, true)
    const torta = tresLinhas((l) => 200 + l * 44 + (l === 2 ? 8 : 0))
    assert.equal(torta.ok, false)
    assert.match(torta.motivo, /passo vertical de 52\.0 px/)
  })

  it('390: a madrugada (alvo de 56 de altura) mede o mesmo espaço e o mesmo passo', () => {
    const r = a2(ancoras390({ ajuste: () => ({}) }).map((no) => ({ ...no, rect: { ...no.rect, y: no.rect.y - 6, h: 56 } })), doc390)
    assert.equal(r.ok, true, r.motivo)
  })

  it('390: falha fechado sem o retângulo do texto de uma âncora', () => {
    const sem = a2(ancoras390({ ajuste: (i) => (i === 4 ? { rectTexto: null } : {}) }), doc390)
    assert.equal(sem.ok, false)
    assert.match(sem.motivo, /sem a leitura do retângulo do texto/)
    assert.equal(a2(ancoras390({ ajuste: (i) => (i === 2 ? { rectTexto: { x: NaN, y: 200, w: 78, h: 24 } } : {}) }), doc390).ok, false)
    assert.equal(a2(ancoras390({ ajuste: () => ({ rectTexto: undefined }) }), doc390).ok, false)
  })

  it('1440: o A-2 segue o que era — o rectTexto não entra e o passo é 32', () => {
    assert.equal(a2(seis((i) => ({ rectTexto: { x: col(9) + 32, y: 40 + i * 32, w: 50 + i * 7, h: 24 } })), doc1440).ok, true)
    assert.equal(a2(seis(), doc1440).ok, true)
  })

  it('falha fechado: nenhuma âncora, âncora sem a leitura do destino e sem retângulo', () => {
    assert.equal(a2([], doc1440).ok, false)
    assert.equal(a2(seis((i) => (i === 1 ? { alvoExiste: undefined } : {})), doc1440).ok, false)
    assert.equal(a2(seis((i) => (i === 1 ? { rect: {} } : {})), doc1440).ok, false)
    assert.equal(a2(seis(), undefined).ok, false)
  })
})

describe('A-3: o título de seção em 48 px, Instrument Serif, em x de c2', () => {
  const titulo = (extra = {}) =>
    emMain({ tag: 'h2', texto: 'Perfil', rect: { x: col(2), y: 420, w: 300, h: 58 }, m: { tituloSecao: true }, estilo: { fontSize: '48px', fontFamily: '"Instrument Serif", serif' }, ...extra })

  it('passa em 1440 (48 px) e em 390 (36 px, em x=16)', () => {
    assert.equal(a3([titulo(), titulo()], doc1440).ok, true)
    assert.equal(a3([titulo({ rect: { x: 16, y: 420, w: 300, h: 43 }, estilo: { fontSize: '36px', fontFamily: '"Instrument Serif", serif' } })], doc390).ok, true)
  })

  it('falha: Fraunces de 28 px (o desenho antigo), x=785 e 48 px em 390', () => {
    const antigo = a3([titulo({ estilo: { fontSize: '28px', fontFamily: 'Fraunces, serif' } })], doc1440)
    assert.equal(antigo.ok, false)
    assert.match(antigo.motivo, /font-size 28px/)
    assert.equal(a3([titulo({ rect: { x: 785, y: 420, w: 300, h: 58 } })], doc1440).ok, false)
    assert.equal(a3([titulo({ rect: { x: 16, y: 420, w: 300, h: 58 } })], doc390).ok, false)
  })

  it('borda: x 1,9 px depois passa (±2) e 3 px falha', () => {
    assert.equal(a3([titulo({ rect: { x: col(2) + 1.9, y: 420, w: 300, h: 58 } })], doc1440).ok, true)
    assert.equal(a3([titulo({ rect: { x: col(2) + 3, y: 420, w: 300, h: 58 } })], doc1440).ok, false)
  })

  it('falha fechado: sem título, sem fonte e sem retângulo', () => {
    assert.equal(a3([], doc1440).ok, false)
    assert.equal(a3([titulo({ estilo: { fontFamily: undefined } })], doc1440).ok, false)
    assert.equal(a3([titulo({ rect: {} })], doc1440).ok, false)
    assert.equal(a3([titulo()], undefined).ok, false)
  })
})

describe('A-4: 96 px (±8) do fim de uma seção ao título da seguinte', () => {
  const secao = (y, h, tituloY) => emMain({ tag: 'section', texto: '', rect: { x: col(2), y, w: 900, h }, m: { secao: true }, tituloDaSecao: { x: col(2), y: tituloY, h: 58 } })

  it('passa: duas e três seções a 96 px', () => {
    assert.equal(a4([secao(400, 300, 400), secao(796, 200, 796)]).ok, true)
    assert.equal(a4([secao(400, 300, 400), secao(796, 200, 796), secao(1092, 200, 1092)]).ok, true)
  })

  it('falha: a 32 px (as seções coladas) e a 160 px', () => {
    const r = a4([secao(400, 300, 400), secao(732, 200, 732)])
    assert.equal(r.ok, false)
    assert.match(r.motivo, /esperado 96/)
    assert.equal(a4([secao(400, 300, 400), secao(860, 200, 860)]).ok, false)
  })

  it('borda: 88 e 104 passam, 87 e 105 falham', () => {
    assert.equal(a4([secao(400, 300, 400), secao(788, 200, 788)]).ok, true)
    assert.equal(a4([secao(400, 300, 400), secao(804, 200, 804)]).ok, true)
    assert.equal(a4([secao(400, 300, 400), secao(787, 200, 787)]).ok, false)
    assert.equal(a4([secao(400, 300, 400), secao(805, 200, 805)]).ok, false)
  })

  it('falha fechado: menos de duas seções e seção sem a posição do título', () => {
    assert.equal(a4([secao(400, 300, 400)]).ok, false)
    assert.equal(a4([]).ok, false)
    const semTitulo = { ...secao(796, 200, 796), tituloDaSecao: undefined }
    assert.equal(a4([secao(400, 300, 400), semTitulo]).ok, false)
  })
})

describe('A-5: nada tracejado e o botão Excluir desativado com aria-disabled', () => {
  const lados = (estilo) => ({ borderTopStyle: estilo, borderRightStyle: estilo, borderBottomStyle: estilo, borderLeftStyle: estilo })
  const excluir = (extra = {}) => emMain({ tag: 'button', texto: 'Excluir minha conta', estilo: lados('none'), desativado: false, ariaDisabled: null, ...extra })

  it('passa: sem tracejado, e o botão habilitado ou desativado com aria-disabled="true"', () => {
    assert.equal(a5([criar({ estilo: lados('none') }), excluir()]).ok, true)
    assert.equal(a5([criar({ estilo: lados('none') }), excluir({ desativado: true, ariaDisabled: 'true' })]).ok, true)
  })

  it('falha: borda tracejada (o desenho antigo) e botão desativado só com o atributo disabled', () => {
    const tracejado = a5([excluir({ estilo: lados('dashed'), desativado: true, ariaDisabled: 'true' })])
    assert.equal(tracejado.ok, false)
    assert.match(tracejado.motivo, /dashed/)
    const semAria = a5([excluir({ desativado: true, ariaDisabled: null })])
    assert.equal(semAria.ok, false)
    assert.match(semAria.motivo, /aria-disabled/)
    assert.equal(a5([excluir({ desativado: true, ariaDisabled: 'false' })]).ok, false)
  })

  it('borda: uma só borda tracejada já falha; dotted e solid não são dashed', () => {
    assert.equal(a5([excluir(), criar({ estilo: { ...lados('none'), borderLeftStyle: 'dashed' } })]).ok, false)
    assert.equal(a5([excluir(), criar({ estilo: lados('dotted') }), criar({ estilo: lados('solid') })]).ok, true)
  })

  it('falha fechado: sem o botão Excluir, sem a leitura de disabled e border-style ausente', () => {
    assert.equal(a5([criar({ estilo: lados('none') })]).ok, false)
    assert.equal(a5([excluir({ desativado: undefined })]).ok, false)
    assert.equal(a5([excluir({ estilo: { borderTopStyle: undefined } })]).ok, false)
    assert.equal(a5([]).ok, false)
  })
})

// MAT-44d-3, volta 3 (item 2): o A-6 passa a medir só o `<main>`. Decisão do líder: o rodapé (≈ 895 px, da casca congelada) não
// conta, porque o limite de 3.200 px com ele era inalcançável sem cortar seção (o `main` da Conta tem 2.816 px e acaba em y≈2.880, o
// rodapé começa em y=3072 e o documento tem 3.967 claro / 3.991 madrugada). A leitura antiga (a altura total, com o rodapé) segue no resultado como informação.
describe('A-6: a altura do <main> em 1440 é ≤ 3.200 px (o rodapé não conta)', () => {
  const rodape = (y, h) => criar({ tag: 'footer', texto: '', rect: { x: 0, y, w: 1425, h }, m: { rodape: true } })
  const principal = (h, extra = {}) => criar({ tag: 'main', texto: '', rect: { x: 0, y: 64, w: 1425, h }, ...extra })
  const reprova = (r, padrao) => {
    assert.equal(r.ok, false, `devia reprovar: ${r.motivo}`)
    if (padrao) assert.match(r.motivo, padrao)
    return r
  }
  /**
   * A Conta de hoje, como o Chrome lê: o `main` em y=64 com 2.816 px de altura (acaba em y≈2.880; o rodapé começa em y=3072, 192 px
   * depois), o rodapé com 895 e o documento com 3.967 (claro).
   */
  const contaDeHoje = () => [principal(2816), rodape(3072, 895)]
  const docHoje = { ...doc1440, alturaTotal: 3967 }

  it('a Conta de hoje passa pelo `main` (2.816 px), mesmo com 3.967 px com o rodapé (a leitura de antes reprovava)', () => {
    const r = a6(contaDeHoje(), docHoje)
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'A-6')
    assert.deepEqual(r.nos_com_falha, [])
    assert.match(r.motivo, /altura do main de 2816 px \(máximo 3200\)/)
  })

  it('a leitura antiga vai no resultado, num campo próprio e no motivo, marcada como informação: 3.967 claro e 3.991 madrugada', () => {
    const claro = a6(contaDeHoje(), docHoje)
    assert.equal(claro.leitura_antiga, 3967)
    assert.match(claro.motivo, /leitura antiga, só informação: altura total com o rodapé de 3967 px \(não reprova\)/)
    const madrugada = a6([principal(3072), rodape(3072, 919)], { ...doc1440, alturaTotal: 3991 })
    assert.equal(madrugada.ok, true, madrugada.motivo)
    assert.equal(madrugada.leitura_antiga, 3991)
    assert.match(madrugada.motivo, /3991 px/)
  })

  it('a leitura antiga é o maior entre a altura do documento e o fim do rodapé, como a regra antiga a lia', () => {
    assert.equal(a6([principal(3072), rodape(3072, 895)], { ...doc1440, alturaTotal: 3000 }).leitura_antiga, 3967)
    assert.equal(a6([principal(3072), rodape(100, 100)], { ...doc1440, alturaTotal: 3900 }).leitura_antiga, 3900)
  })

  it('a leitura antiga não reprova: com o rodapé gigante o critério segue ok, e passa a reprovar só pelo `main`', () => {
    const r = a6([principal(3000), rodape(3000, 5000)], { ...doc1440, alturaTotal: 8000 })
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.leitura_antiga, 8000)
    reprova(a6([principal(3201), rodape(3201, 100)], { ...doc1440, alturaTotal: 3301 }), /altura do main de 3201 px \(máximo 3200\)/)
  })

  it('a leitura antiga ausente não vira aprovação nem reprovação: só some a informação', () => {
    const sem = a6([principal(3072)], doc1440)
    assert.equal(sem.ok, true, sem.motivo)
    assert.equal('leitura_antiga' in sem, false)
    assert.doesNotMatch(sem.motivo, /leitura antiga/)
    const semEReprova = a6([principal(3300)], doc1440)
    assert.equal(semEReprova.ok, false)
    assert.equal('leitura_antiga' in semEReprova, false)
    // Altura do documento ilegível (texto, NaN): também some a informação, sem mudar o veredito.
    const ilegivel = a6([principal(3072), rodape(3072, 895)], { ...doc1440, alturaTotal: 'alto' })
    assert.equal(ilegivel.ok, true)
    assert.equal(ilegivel.leitura_antiga, 3967, 'o fim do rodapé ainda a dá')
  })

  it('a borda: 3.200 passa, 3.200,5 passa (a tolerância é de 0,5) e 3.201 reprova', () => {
    assert.equal(a6([principal(3200)], doc1440).ok, true)
    assert.equal(a6([principal(3200.5)], doc1440).ok, true)
    reprova(a6([principal(3201)], doc1440), /altura do main de 3201 px/)
  })

  describe('mutação: 1 px em cada medida, uma por vez, em torno do limite 3.200', () => {
    it('o `main` com 1 px a mais (3.201) reprova e com 1 px a menos (3.199) passa', () => {
      assert.equal(a6([principal(3199)], doc1440).ok, true)
      reprova(a6([principal(3201)], doc1440), /3201 px/)
    })

    it('o rodapé e a altura do documento não mexem no veredito (só na informação)', () => {
      for (const [y, h, total] of [[3072, 895, 3967], [3072, 1895, 4967], [100, 100, 9999], [0, 0, 0]]) {
        assert.equal(a6([principal(3200), rodape(y, h)], { ...doc1440, alturaTotal: total }).ok, true, `${y} ${h} ${total}`)
        reprova(a6([principal(3201), rodape(y, h)], { ...doc1440, alturaTotal: total }))
      }
    })
  })

  it('a largura: 992 já é 1440 (aplica), 991 e 390 não se aplicam, mesmo com o `main` de 5.000 px', () => {
    reprova(a6([], { ...doc1440, largura: 992 }), /nenhum <main>/)
    for (const largura of [991, 767, 390]) {
      const r = a6([principal(5000)], { ...doc1440, largura })
      assert.equal(r.ok, true)
      assert.match(r.motivo, /não aplicável/)
    }
    assert.match(a6([principal(5000), rodape(100, 100)], doc390).motivo, /não aplicável/)
  })

  describe('falha fechada', () => {
    it('sem doc, sem a largura da janela ou sem a clientWidth', () => {
      assert.equal(a6([principal(3000)], undefined).ok, false)
      assert.equal(a6([principal(3000)], {}).ok, false)
      assert.equal(a6([principal(3000)], { largura: 1440 }).ok, false)
    })

    it('sem `<main>` no documento reprova em 1440, mesmo com o rodapé e a altura total pequenos', () => {
      reprova(a6([], doc1440), /nenhum <main>/)
      reprova(a6([rodape(2100, 900)], doc1440), /nenhum <main>/)
      reprova(a6([], { ...doc1440, alturaTotal: 3000 }), /nenhum <main>/)
      reprova(a6(undefined, doc1440), /nenhum <main>/)
    })

    it('o `main` sem altura medida (sem retângulo, altura nula, ilegível ou não numérica) reprova', () => {
      for (const rect of [undefined, null, {}, { x: 0, y: 64, w: 1425 }, { x: 0, y: 64, w: 1425, h: Number.NaN }, { x: 0, y: 64, w: 1425, h: '3072' }, { x: 0, y: 64, w: 1425, h: 0 }]) {
        reprova(a6([principal(3072, { rect })], doc1440), /sem a altura medida do main|nenhum <main>/)
      }
    })

    it('um `main` que não está visível não conta', () => {
      reprova(a6([principal(3072, { visivel: false })], doc1440), /nenhum <main>/)
    })

    it('um elemento que não é `main` (um `div` com a altura certa) não serve de `main`', () => {
      reprova(a6([criar({ tag: 'div', texto: '', rect: { x: 0, y: 64, w: 1425, h: 3000 } })], doc1440), /nenhum <main>/)
    })

    it('com mais de um `main`, o primeiro com altura medida é o que vale', () => {
      assert.equal(a6([principal(3072), principal(9000)], doc1440).ok, true)
    })
  })

  it('dentro do avaliarCriterios a Conta em 1440 passa o A-6 pelo `main` e traz a leitura antiga no JSON', () => {
    const { criterios } = avaliarCriterios({ doc: docHoje, nos: contaDeHoje(), tema: 'claro' }, 'conta')
    const a = criterios.find((x) => x.regra === 'A-6')
    assert.equal(a.ok, true, a.motivo)
    assert.equal(a.bloqueia, true)
    assert.equal(a.leitura_antiga, 3967)
    assert.equal(JSON.parse(JSON.stringify(a)).leitura_antiga, 3967, 'sobrevive ao JSON do medidor')
  })
})

describe('M-1: os retângulos dos blocos são os mesmos do tema claro', () => {
  const bloco = (id, y = 100, extra = {}) => ({ id, x: 32, y, w: 1361, h: 300, ...extra })
  const dupla = (escuro, claro) => ({ ...doc1440, blocos: escuro, blocosClaro: claro })

  it('passa com retângulos iguais e com 1 px de diferença', () => {
    assert.equal(m1(dupla([bloco('1:header', 0), bloco('2:section')], [bloco('1:header', 0), bloco('2:section')])).ok, true)
    assert.equal(m1(dupla([bloco('1:section', 101)], [bloco('1:section', 100)])).ok, true)
  })

  it('falha: o bloco 20 px mais alto e a quantidade de blocos diferente', () => {
    const r = m1(dupla([bloco('1:section', 100, { h: 320 })], [bloco('1:section')]))
    assert.equal(r.ok, false)
    assert.match(r.motivo, /1:section/)
    assert.equal(m1(dupla([bloco('1:section'), bloco('2:section')], [bloco('1:section')])).ok, false)
  })

  it('borda: 1 px passa e 2 px falham (x, y, w e h)', () => {
    assert.equal(m1(dupla([bloco('a', 100, { w: 1362 })], [bloco('a')])).ok, true)
    assert.equal(m1(dupla([bloco('a', 100, { w: 1363 })], [bloco('a')])).ok, false)
    assert.equal(m1(dupla([bloco('a', 100, { x: 34 })], [bloco('a')])).ok, false)
  })

  it('falha fechado: sem os blocos de um dos temas, listas vazias e campo ausente', () => {
    assert.equal(m1(doc1440).ok, false)
    assert.equal(m1(dupla([bloco('a')], undefined)).ok, false)
    assert.equal(m1(dupla([], [bloco('a')])).ok, false)
    assert.equal(m1(dupla([{ id: 'a', x: 32, y: 100, w: 1361 }], [bloco('a')])).ok, false)
    assert.equal(m1(undefined).ok, false)
  })
})

describe('M-2 a M-6: a madrugada', () => {
  const ESCURO = 'rgb(23, 18, 14)'
  const SEM_MOVIMENTO = { transitionProperty: 'all', transitionDuration: '0s', transitionDelay: '0s', animationName: 'none', animationDuration: '0s' }
  const noEscuro = (extra = {}) => criar({ estilo: { color: 'rgb(227, 214, 195)', ...SEM_MOVIMENTO }, cadeia: [TRANSPARENTE, ESCURO], ...extra })

  it('M-2 passa sem borda de 4 lados, ou só na moldura dupla; falha fora dela', () => {
    const borda4 = { borderTopWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px', borderTopStyle: 'solid', borderRightStyle: 'solid', borderBottomStyle: 'solid', borderLeftStyle: 'solid' }
    assert.equal(m2([criar(), criar({ estilo: borda4, m: { moldura: true } })]).ok, true)
    assert.equal(m2([criar(), criar({ estilo: borda4 })]).ok, false)
    assert.equal(m2([criar({ estilo: { ...borda4, borderLeftWidth: '0px' } })]).ok, true)
    assert.equal(m2([]).ok, false)
    assert.equal(m2([{ tag: 'div', visivel: true }]).ok, false)
  })

  it('M-3: fundo claro só em botões de até 30.000 px²', () => {
    const claro = 'rgb(196, 112, 85)'
    const botao = (rect) => noEscuro({ tag: 'button', rect, cadeia: [claro, ESCURO], m: { botao: true } })
    assert.equal(m3([noEscuro(), botao({ x: 0, y: 0, w: 300, h: 80 })]).ok, true)
    const fora = m3([noEscuro({ cadeia: ['rgb(235, 225, 208)', ESCURO] })])
    assert.equal(fora.ok, false)
    assert.match(fora.motivo, /fora de um botão/)
    assert.equal(m3([botao({ x: 0, y: 0, w: 400, h: 80 })]).ok, false)
  })

  it('M-3 borda: 30.000 px² passam e 30.001 falham; fundo escuro e fundo transparente nunca contam', () => {
    const claro = 'rgb(196, 112, 85)'
    const botao = (rect) => noEscuro({ tag: 'button', rect, cadeia: [claro, ESCURO], m: { botao: true } })
    assert.equal(m3([botao({ x: 0, y: 0, w: 300, h: 100 })]).ok, true)
    assert.equal(m3([botao({ x: 0, y: 0, w: 300.01, h: 100 })]).ok, false)
    assert.equal(m3([noEscuro({ cadeia: ['rgb(37, 30, 24)', ESCURO] })]).ok, true)
  })

  it('M-3: o miolo de um botão de moldura dupla (um span dentro do botão) é parte do botão; o que está fora dele não', () => {
    const miolo = noEscuro({ tag: 'span', rect: { x: 0, y: 0, w: 200, h: 48 }, cadeia: ['rgb(247, 239, 226)', ESCURO], m: { dentroDeBotao: true } })
    assert.equal(m3([miolo]).ok, true)
    assert.equal(m3([{ ...miolo, m: {} }]).ok, false)
  })

  it('o coletor marca o span dentro do botão (dentroDeBotao) e o botão em si não é "dentro"', () => {
    const { nos } = coletarDe('<main><section><button type="button"><span>Sair</span></button><span>Fora</span></section></main>')
    const [dentro, fora] = nos.filter((n) => n.tag === 'span')
    assert.equal(dentro.m.dentroDeBotao, true)
    assert.equal(fora.m.dentroDeBotao, false)
    assert.equal(nos.find((n) => n.tag === 'button').m.dentroDeBotao, false)
    assert.equal(nos.find((n) => n.tag === 'button').m.botao, true)
  })

  it('M-3 falha fechado: sem nós, fundo ilegível e fundo sem ancestral opaco', () => {
    assert.equal(m3([]).ok, false)
    assert.equal(m3([noEscuro({ cadeia: ['oklch(0.9 0.1 80)', ESCURO] })]).ok, false)
    assert.equal(m3([noEscuro({ cadeia: ['rgba(255, 255, 255, 0.5)', TRANSPARENTE] })]).ok, false)
  })

  it('M-4: botões com 56 px e contraste de 4,5:1 (inclusive o texto secundário)', () => {
    const botao = (h) => noEscuro({ tag: 'button', texto: 'Salvar', rect: { x: 0, y: 0, w: 200, h }, m: { botao: true } })
    assert.equal(m4([botao(56)]).ok, true)
    assert.equal(m4([botao(48)]).ok, false)
    assert.equal(m4([botao(55.6)]).ok, true)
    assert.equal(m4([botao(55)]).ok, false)
    const secundario = noEscuro({ texto: 'Ajuda', estilo: { color: 'rgb(186, 175, 159)' } })
    assert.equal(m4([botao(56), secundario]).ok, true)
    const apagado = noEscuro({ texto: 'Apagado', estilo: { color: 'rgb(90, 80, 70)' } })
    assert.equal(m4([botao(56), apagado]).ok, false)
  })

  it('M-4 falha fechado: sem botão, sem texto, texto sem largura e contraste incalculável', () => {
    assert.equal(m4([noEscuro()]).ok, false)
    assert.equal(m4([noEscuro({ tag: 'button', texto: '', rect: { x: 0, y: 0, w: 100, h: 56 }, m: { botao: true } })]).ok, false)
    assert.equal(m4([noEscuro({ tag: 'button', texto: 'a', rect: { x: 0, y: 0, w: 0, h: 56 }, m: { botao: true } })]).ok, false)
    assert.equal(m4([noEscuro({ tag: 'button', texto: 'a', rect: { x: 0, y: 0, w: 100, h: 56 }, m: { botao: true }, cadeia: [TRANSPARENTE] })]).ok, false)
  })

  it('M-5: o fio de campo com contraste ≥ 3:1 (em 1440 e em 390)', () => {
    const fio = (cor) => paginaComCampos([campoDesktop(354, { estiloCampo: { borderBottomColor: cor } })]).map((n) => (n.m.campo ? { ...n, cadeia: [TRANSPARENTE, ESCURO] } : n))
    assert.equal(m5(fio('rgb(227, 214, 195)'), doc1440).ok, true)
    const apagado = m5(fio('rgb(60, 50, 42)'), doc1440)
    assert.equal(apagado.ok, false)
    assert.match(apagado.motivo, /contraste/)
    const celular = campoCelular(400, { estiloCaixa: { borderBottomColor: 'rgb(227, 214, 195)' } }).map((n) => (n.m.campoControle ? { ...n, cadeia: [TRANSPARENTE, ESCURO] } : n))
    assert.equal(m5(celular, doc390).ok, true)
  })

  it('M-5 borda e falha fechado: 3,0:1 passa; sem fio, sem campo e cor ilegível reprovam', () => {
    const com = (cor, largura = '1px') => paginaComCampos([campoDesktop(354, { estiloCampo: { borderBottomColor: cor, borderBottomWidth: largura } })]).map((n) => (n.m.campo ? { ...n, cadeia: [TRANSPARENTE, 'rgb(255, 255, 255)'] } : n))
    // #767676 sobre branco: 4,54:1; #949494 sobre branco: 3,03:1; #959595: 2,99:1.
    assert.equal(m5(com('rgb(148, 148, 148)'), doc1440).ok, true)
    assert.equal(m5(com('rgb(150, 150, 150)'), doc1440).ok, false)
    assert.equal(m5(com('rgb(0, 0, 0)', '0px'), doc1440).ok, false)
    assert.equal(m5([abertura()], doc1440).ok, false)
    assert.equal(m5(com('cor-estranha'), doc1440).ok, false)
    assert.equal(m5(com('rgb(0, 0, 0)'), undefined).ok, false)
  })

  it('M-6: sem transition acima de 150 ms e sem transform animado', () => {
    assert.equal(m6([noEscuro()]).ok, true)
    assert.equal(m6([noEscuro({ estilo: { transitionProperty: 'background-color', transitionDuration: '0.15s' } })]).ok, true)
    const lenta = m6([noEscuro({ estilo: { transitionProperty: 'background-color', transitionDuration: '0.3s' } })])
    assert.equal(lenta.ok, false)
    assert.match(lenta.motivo, /300 ms/)
    assert.equal(m6([noEscuro({ estilo: { transitionProperty: 'transform', transitionDuration: '0.1s' } })]).ok, false)
    assert.equal(m6([noEscuro({ estilo: { transitionProperty: 'all', transitionDuration: '0.1s' } })]).ok, false)
  })

  it('M-6 borda: 150 ms passam, 151 falham, com atraso conta junto, lista de propriedades e duração zero', () => {
    assert.equal(m6([noEscuro({ estilo: { transitionProperty: 'color', transitionDuration: '150ms' } })]).ok, true)
    assert.equal(m6([noEscuro({ estilo: { transitionProperty: 'color', transitionDuration: '151ms' } })]).ok, false)
    assert.equal(m6([noEscuro({ estilo: { transitionProperty: 'color', transitionDuration: '0.1s', transitionDelay: '0.1s' } })]).ok, false)
    assert.equal(m6([noEscuro({ estilo: { transitionProperty: 'color, opacity', transitionDuration: '0.1s, 0.2s' } })]).ok, false)
    assert.equal(m6([noEscuro({ estilo: { transitionProperty: 'transform', transitionDuration: '0s' } })]).ok, true)
  })

  it('M-6 e as animações: acima de 150 ms ou com transform reprovam; sem a leitura dos keyframes, também', () => {
    const animada = (extra, duracao = '0.1s') => noEscuro({ estilo: { ...SEM_MOVIMENTO, animationName: 'surgir', animationDuration: duracao }, ...extra })
    assert.equal(m6([animada({ animacaoTransform: false })]).ok, true)
    assert.equal(m6([animada({ animacaoTransform: true })]).ok, false)
    assert.equal(m6([animada({ animacaoTransform: null })]).ok, false)
    assert.equal(m6([animada({ animacaoTransform: undefined })]).ok, false)
    assert.equal(m6([animada({ animacaoTransform: false }, '0.4s')]).ok, false)
    assert.equal(m6([animada({ animacaoTransform: false }, '0s')]).ok, true)
    assert.equal(m6([noEscuro({ animacoes: [{ tipo: 'CSSTransition', propriedades: ['transform'] }] })]).ok, false)
    assert.equal(m6([noEscuro({ animacoes: [{ tipo: 'CSSTransition', propriedades: ['opacity'] }] })]).ok, true)
  })

  it('M-6 falha fechado: sem nós, transition ausente e duração ilegível', () => {
    assert.equal(m6([]).ok, false)
    assert.equal(m6([criar()]).ok, false)
    assert.equal(m6([noEscuro({ estilo: { transitionDuration: 'rápido' } })]).ok, false)
  })
})

describe('44d-3: o coletor em jsdom lê o que os critérios de tela usam', () => {
  const PAGINA = `
    <main>
      <section data-bloco class="sb-abertura">
        <h1>Conta</h1>
        <ul class="sb-abertura-lateral"><li><a href="#perfil">Perfil</a></li><li><a href="#nao-existe">Outra</a></li></ul>
      </section>
      <section aria-labelledby="perfil">
        <h2 id="perfil">Perfil</h2>
        <form>
          <div class="sb-campo" style="position: relative"><label for="nome">Nome</label><div class="sb-campo-controle"><input id="nome" value="Ana"></div></div>
          <p data-aviso="banco-de-demonstracao">Banco de teste.</p>
          <button type="submit">Salvar</button>
          <button type="button" disabled aria-disabled="true">Excluir minha conta</button>
        </form>
      </section>
    </main>
    <footer data-rodape></footer>`

  /** Troca o getComputedStyle só para o pseudo-elemento: o jsdom não o implementa. */
  const comPseudo = (documento) => {
    const janela = documento.defaultView
    const original = janela.getComputedStyle.bind(janela)
    janela.getComputedStyle = (el, pseudo) =>
      pseudo
        ? { content: '""', display: 'block', position: 'absolute', left: '100px', top: '32px', width: '1px', height: '80px', backgroundColor: 'rgb(26, 21, 17)' }
        : original(el)
  }

  it('marca a abertura, o campo, o rótulo, o controle, o botão de envio, a âncora, o título e a seção', () => {
    const { nos } = coletarDe(PAGINA)
    const por = (nome) => nos.filter((n) => n.m[nome])
    assert.equal(por('abertura').length, 1)
    assert.equal(por('campo').length, 1)
    assert.equal(por('campoControle').length, 1)
    assert.equal(por('rotuloCampo').length, 1)
    assert.deepEqual(por('controle').map((n) => n.tag), ['input'])
    assert.deepEqual(por('botaoForm').map((n) => n.texto), ['Salvar'])
    assert.equal(por('ancoraLateral').length, 2)
    assert.deepEqual(por('tituloSecao').map((n) => n.texto), ['Perfil'])
    assert.equal(por('avisoDemo').length, 1)
    assert.equal(por('secao').length, 1)
    assert.equal(por('noMain').length > 5, true)
  })

  it('a âncora sabe se o destino existe, o botão desativado entrega aria-disabled e a seção, a posição do título', () => {
    const { nos } = coletarDe(PAGINA)
    const [a, b] = nos.filter((n) => n.m.ancoraLateral)
    assert.deepEqual([a.alvoExiste, b.alvoExiste], [true, false])
    assert.equal(a.href, '#perfil')
    const excluir = nos.find((n) => n.texto === 'Excluir minha conta')
    assert.equal(excluir.desativado, true)
    assert.equal(excluir.ariaDisabled, 'true')
    assert.equal(nos.find((n) => n.texto === 'Salvar').desativado, false)
    const secao = nos.find((n) => n.m.secao)
    assert.ok(Number.isFinite(secao.tituloDaSecao.y) && Number.isFinite(secao.tituloDaSecao.x))
  })

  it('traz o retângulo do texto, o vazio no fim do bloco, a altura total e os retângulos dos blocos', () => {
    const { doc, nos } = coletarDe(PAGINA)
    const rotulo = nos.find((n) => n.m.rotuloCampo)
    assert.deepEqual(rotulo.rectTexto, { x: 0, y: 0, w: 100, h: 20 })
    const bloco = nos.find((n) => n.m.filhoDeMain)
    assert.deepEqual(Object.keys(bloco.vazioFim).sort(), ['margem', 'vazio'])
    assert.ok('alturaTotal' in doc)
    // O cabeçalho (nenhum), os 2 filhos de <main> (um deles também é [data-bloco]) e o rodapé.
    assert.equal(doc.blocos.length, 3)
    assert.deepEqual(Object.keys(doc.blocos[0]).sort(), ['h', 'id', 'w', 'x', 'y'])
  })

  it('o formato dos campos que já existiam não muda (só ganham campos novos)', () => {
    const { nos } = coletarDe(PAGINA)
    const no = nos.find((n) => n.tag === 'h1')
    for (const campo of ['fontSize', 'lineHeight', 'fontWeight', 'textTransform', 'boxShadow', 'backgroundColor', 'color', 'opacity', 'transform', 'position', 'top', 'fontFamily', 'fontVariantNumeric']) {
      assert.ok(campo in no.estilo, campo)
    }
    for (const campo of ['minHeight', 'borderBottomColor', 'transitionProperty', 'transitionDuration', 'transitionDelay', 'animationName', 'animationDuration']) {
      assert.ok(campo in no.estilo, `novo: ${campo}`)
    }
    assert.deepEqual(Object.keys(no).filter((k) => ['tag', 'texto', 'visivel', 'rect', 'estilo', 'm', 'cadeia'].includes(k)).sort(), ['cadeia', 'estilo', 'm', 'rect', 'tag', 'texto', 'visivel'])
  })

  it('lê o pseudo-elemento do campo posicionado (o fio vertical) e deixa nulo o x do pseudo de um elemento estático', () => {
    const { nos } = coletarDe(PAGINA, comPseudo)
    const campo = nos.find((n) => n.m.campo)
    assert.equal(campo.pseudo.antes.w, 1)
    assert.equal(campo.pseudo.antes.h, 80)
    assert.equal(campo.pseudo.antes.x, 100)
    assert.equal(campo.pseudo.antes.y, 32)
    // Em elemento sem posicionamento, o x do pseudo absoluto é ilegível (nulo): a regra falha fechado.
    const solto = nos.find((n) => n.m.rotuloCampo)
    assert.equal(solto.pseudo.antes.x, null)
  })

  it('sem pseudo-elemento (content none ou getComputedStyle que não o sabe), o nó não ganha `pseudo`', () => {
    const { nos } = coletarDe(PAGINA, (documento) => {
      documento.defaultView.getComputedStyle = new Proxy(documento.defaultView.getComputedStyle, {
        apply: (alvo, esse, argumentos) => {
          if (argumentos[1]) throw new Error('sem pseudo')
          return Reflect.apply(alvo, esse, argumentos)
        },
      })
    })
    assert.equal(nos.some((n) => 'pseudo' in n), false)
  })

  it('o botão de envio e o título passam a ser lidos sem mexer nos outros testes (G12 segue verde na fixture)', () => {
    const { nos } = coletarDe(PAGINA)
    assert.equal(g12(nos).ok, true)
  })
})

describe('44d-3: na tela antiga (sem `.sb-*`) o critério acusa o defeito medido, e só depois a ausência da estrutura', () => {
  const borda4 = { borderTopWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px', borderTopStyle: 'solid', borderRightStyle: 'solid', borderBottomStyle: 'solid', borderLeftStyle: 'solid' }
  const inputAntigo = (extra = {}) =>
    emMain({ tag: 'input', texto: '', textoControle: 'a@b.c', rect: { x: 785, y: 200, w: 440, h: 48 }, m: { controle: true, interativo: true }, estilo: { fontSize: '16px', fontFamily: 'Inter, sans-serif', borderBottomColor: 'rgb(26, 21, 17)', ...borda4 }, ...extra })
  const rotuloAntigo = emMain({ tag: 'label', texto: 'E-mail', rect: { x: 785, y: 170, w: 100, h: 24 }, m: { rotuloCampo: true }, estilo: { fontSize: '14px' } })

  it('E-3: o input com borda nos 4 lados reprova pelo motivo real, antes da falta de `.sb-campo`', () => {
    const r = e3([inputAntigo()], doc1440)
    assert.equal(r.ok, false)
    assert.match(r.motivo, /borda nos 4 lados/)
    assert.equal(e3([], doc1440).ok, false)
  })

  it('E-2: a letra de 16 px do input e a de 14 px do rótulo reprovam pelo motivo real', () => {
    const r = e2([inputAntigo(), rotuloAntigo], doc1440)
    assert.equal(r.ok, false)
    assert.match(r.motivo, /font-size 16px em vez de 48px/)
    assert.ok(r.nos_com_falha.some((n) => /label/.test(n)))
    assert.equal(e2([inputAntigo(), rotuloAntigo], doc390).ok, false)
  })

  it('E-1: um fio vertical em x=720 reprova mesmo sem abertura e sem campo', () => {
    const fio = emMain({ tag: 'div', texto: '', rect: { x: 720, y: 136, w: 0, h: 1700 }, estilo: { borderLeftWidth: '1px', borderLeftStyle: 'solid' } })
    const r = e1([fio], doc1440)
    assert.equal(r.ok, false)
    assert.match(r.motivo, /no meio da janela/)
  })

  it('E-6 e A-1: o formulário em x=785–1225 reprova sem abertura; o conteúdo à esquerda de c2 também', () => {
    const e6r = e6([inputAntigo()], doc1440)
    assert.equal(e6r.ok, false)
    assert.match(e6r.motivo, /à direita de/)
    const esquerda = emMain({ rect: { x: 216, y: 300, w: 400, h: 28 }, rectTexto: { x: 216, y: 300, w: 300, h: 28 } })
    const dentro = a1([esquerda], doc1440)
    assert.equal(dentro.ok, false, 'sem abertura a regra reprova pela estrutura')
    assert.match(dentro.motivo, /nenhuma abertura/)
    const colado = emMain({ rect: { x: 40, y: 300, w: 400, h: 28 }, rectTexto: { x: 40, y: 300, w: 300, h: 28 } })
    const a1r = a1([colado], doc1440)
    assert.equal(a1r.ok, false)
    assert.match(a1r.motivo, /à esquerda de/)
  })

  it('B-2: um select de 48 px de altura e de 16 px de letra reprova contra o input, sem `.sb-campo`', () => {
    const entrada = inputAntigo({ rect: { x: 785, y: 200, w: 440, h: 48 } })
    const selecao = inputAntigo({ tag: 'select', rect: { x: 785, y: 300, w: 440, h: 48 } })
    const r = b2([entrada, selecao], doc1440)
    assert.equal(r.ok, false)
    assert.match(r.motivo, /altura 48 em vez de 112/)
    const maior = b2([inputAntigo({ rect: { x: 785, y: 200, w: 440, h: 112 } }), inputAntigo({ tag: 'select', rect: { x: 785, y: 300, w: 440, h: 112 } })], doc1440)
    assert.equal(maior.ok, false)
    assert.match(maior.motivo, /font-size 16px em vez de 48px|fora de uma linha/)
  })

  it('M-5: o fio do próprio controle, na madrugada, entra na conta quando não há `.sb-campo`', () => {
    const fraco = inputAntigo({ cadeia: [TRANSPARENTE, 'rgb(23, 18, 14)'], estilo: { ...borda4, borderBottomColor: 'rgb(60, 50, 42)' } })
    const r = m5([fraco], doc1440)
    assert.equal(r.ok, false)
    assert.match(r.motivo, /contraste/)
    const bom = inputAntigo({ cadeia: [TRANSPARENTE, 'rgb(23, 18, 14)'], estilo: { ...borda4, borderBottomColor: 'rgb(227, 214, 195)' } })
    assert.equal(m5([bom], doc1440).ok, false, 'sem `.sb-campo` a regra ainda reprova, pela estrutura')
    assert.match(m5([bom], doc1440).motivo, /nenhuma linha de campo/)
  })

  it('B-3: bloco de mídia ou de até 2 px, lidos sem conteúdo, não são altura esticada; um bloco comum sem leitura reprova', () => {
    const bloco = (extra = {}) => emMain({ tag: 'div', texto: '', rect: { x: 32, y: 400, w: 1361, h: 300 }, m: { filhoDeMain: true }, estilo: { minHeight: '0px' }, ...extra })
    const midia = { filhoDeMain: true, midia: true }
    assert.equal(b3([bloco({ m: midia, vazioFim: null })]).ok, true)
    assert.equal(b3([bloco({ rect: { x: 0, y: 0, w: 1, h: 1 }, vazioFim: null })]).ok, true)
    assert.equal(b3([bloco({ vazioFim: null })]).ok, false)
    assert.equal(b3([bloco({ m: midia, vazioFim: undefined })]).ok, false, 'sem a leitura (undefined) continua reprovando')
    assert.equal(b3([bloco({ m: midia, vazioFim: null, estilo: { minHeight: '888px' } })]).ok, false, 'o min-height da mídia também vale')
  })

  it('o coletor lê o vazio de um bloco só com texto (um h1 sem elemento filho) e o de um bloco vazio fica nulo', () => {
    const { nos } = coletarDe('<main><h1>Começar</h1><div></div><section><p>Texto.</p></section></main>')
    const h1 = nos.find((n) => n.tag === 'h1')
    assert.deepEqual(h1.vazioFim, { vazio: 0, margem: 0 })
    const vazio = nos.find((n) => n.tag === 'div')
    assert.equal(vazio.vazioFim, null)
    const secao = nos.find((n) => n.tag === 'section')
    assert.ok(Number.isFinite(secao.vazioFim.vazio))
  })
})

describe('44d-3: o foco lido pela segunda passada (lerFocoNaPagina)', () => {
  const FORM = `<main><form><input id="a" value="x"><select id="s"><option>a</option></select><button type="submit">Entrar</button></form></main>`

  function lerFoco(html, estilo) {
    const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { runScripts: 'outside-only', virtualConsole: new VirtualConsole() })
    const { window } = dom
    window.Element.prototype.getBoundingClientRect = () => ({ ...RETANGULO })
    if (estilo) window.getComputedStyle = () => estilo
    try {
      return JSON.parse(JSON.stringify(window.eval(`(${lerFocoNaPagina.toString()})()`)))
    } finally {
      window.close()
    }
  }

  it('foca o primeiro controle e o botão de envio, lê o outline de cada um e devolve o foco', () => {
    const estilo = { outlineStyle: 'solid', outlineWidth: '2px', outlineOffset: '2px', outlineColor: 'rgb(26, 21, 17)' }
    const foco = lerFoco(FORM, estilo)
    assert.equal(foco.controle.tag, 'input')
    assert.equal(foco.botao.tag, 'button')
    assert.equal(foco.controle.focou, true)
    assert.equal(foco.botao.outlineWidth, '2px')
    assert.equal(e7({ ...doc1440, foco, envio: { vazio: vazioEstavel() } }, 'claro').ok, true)
  })

  it('sem outline calculado, a regra E-7 reprova o que o coletor leu', () => {
    const foco = lerFoco(FORM, { outlineStyle: 'none', outlineWidth: '0px', outlineOffset: '0px', outlineColor: 'rgb(0, 0, 0)' })
    assert.equal(e7({ ...doc1440, foco }, 'claro').ok, false)
  })

  it('sem formulário, as duas leituras são nulas e a regra falha fechado', () => {
    const foco = lerFoco('<main><p>Só texto.</p></main>', { outlineStyle: 'solid', outlineWidth: '2px', outlineOffset: '2px', outlineColor: 'rgb(26, 21, 17)' })
    assert.deepEqual(foco, { controle: null, botao: null })
    assert.equal(e7({ ...doc1440, foco }, 'claro').ok, false)
  })
})

// ---------------------------------------------------------------------------------------------
// MAT-44d-3, volta da revisão, passo 1: o medidor envia o formulário e mede a geometria.
// E-7 (TELAS.md 3.5): o erro aparece em 17/24 abaixo do campo, sem mudar a altura da linha.
// R-3 (3.7): depois do envio, a mensagem ocupa a mesma linha de 112 px, sem a página mudar de altura.

/** O E-7 de um envio vazio (o anel de foco está certo; só a geometria varia). */
const e7Vazio = (vazio) => e7({ ...doc1440, foco: FOCO_OK, envio: { vazio } }, 'claro')
const r3Enviado = (enviado) => r3({ ...doc1440, envio: { enviado } })

describe('E-7: a geometria do envio vazio', () => {
  it('o estado estável passa (1440: linhas 112 -> 112, página igual, botão no lugar)', () => {
    const r = e7Vazio(vazioEstavel())
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'E-7')
  })

  it('o comportamento de hoje em 390 reprova: linhas 101 -> 133 e página 3019 -> 3083, com os números na mensagem', () => {
    const r = e7Vazio({
      antes: estadoDeEnvio({ pagina: 3019, alturas: [101, 101] }),
      depois: estadoDeEnvio({ pagina: 3083, alturas: [133, 133], mensagens: [mensagemDeEnvio(), mensagemDeEnvio()] }),
    })
    assert.equal(r.ok, false)
    assert.match(r.motivo, /linha 1: altura 101 -> 133/)
    assert.match(r.motivo, /página: altura 3019 -> 3083/)
    assert.match(r.motivo, /botão de envio: topo/)
  })

  it('criar conta em 390 reprova: linhas [133, 101, 133] -> [165, 133, 165]', () => {
    const r = e7Vazio({
      antes: estadoDeEnvio({ pagina: 3300, alturas: [133, 101, 133] }),
      depois: estadoDeEnvio({ pagina: 3428, alturas: [165, 133, 165], mensagens: [mensagemDeEnvio()] }),
    })
    assert.equal(r.ok, false)
    assert.match(r.motivo, /linha 1: altura 133 -> 165/)
    assert.match(r.motivo, /linha 2: altura 101 -> 133/)
    assert.match(r.motivo, /linha 3: altura 133 -> 165/)
  })

  it('meio pixel de diferença passa (a tolerância é de 0,6) e um pixel inteiro falha', () => {
    const base = vazioEstavel()
    base.depois.linhas[0].altura += 0.5
    base.depois.pagina = base.antes.pagina
    assert.equal(e7Vazio(base).ok, true)
    const um = vazioEstavel()
    um.depois.linhas[0].altura += 1
    assert.equal(e7Vazio(um).ok, false)
  })

  it('o anel de foco continua exigido: foco ausente reprova mesmo com a geometria estável', () => {
    assert.equal(e7({ ...doc1440, envio: { vazio: vazioEstavel() } }, 'claro').ok, false)
  })

  describe('falha fechada', () => {
    const falha = (vazio, padrao) => {
      const r = e7Vazio(vazio)
      assert.equal(r.ok, false, `devia reprovar: ${r.motivo}`)
      if (padrao) assert.match(r.motivo, padrao)
    }

    it('sem doc.envio, sem o envio vazio e com leitura incompleta', () => {
      assert.equal(e7({ ...doc1440, foco: FOCO_OK }, 'claro').ok, false)
      assert.equal(e7({ ...doc1440, foco: FOCO_OK, envio: {} }, 'claro').ok, false)
      assert.equal(e7({ ...doc1440, foco: FOCO_OK, envio: { vazio: { antes: estadoDeEnvio() } } }, 'claro').ok, false)
      assert.equal(e7({ ...doc1440, foco: FOCO_OK, envio: { vazio: null } }, 'claro').ok, false)
      assert.equal(e7(undefined, 'claro').ok, false)
    })

    it('sem nenhuma linha de campo antes do envio', () => {
      falha({ antes: estadoDeEnvio({ alturas: [] }), depois: estadoDeEnvio({ alturas: [], mensagens: [mensagemDeEnvio()] }) }, /linha de campo/)
    })

    it('o número de linhas de campo muda', () => {
      falha({ antes: estadoDeEnvio(), depois: estadoDeEnvio({ alturas: [112], mensagens: [mensagemDeEnvio()] }) }, /2 antes e 1 depois/)
    })

    it('o envio vazio não mostra nenhuma mensagem de erro (só ajuda, ou nada)', () => {
      falha({ antes: estadoDeEnvio(), depois: estadoDeEnvio() }, /erro/)
      falha({ antes: estadoDeEnvio(), depois: estadoDeEnvio({ mensagens: [mensagemDeEnvio({ tipo: 'ajuda' })] }) }, /erro/)
      falha({ antes: estadoDeEnvio(), depois: estadoDeEnvio({ mensagens: [mensagemDeEnvio({ tipo: 'status' })] }) }, /erro/)
    })

    it('mensagem de erro ou de ajuda com 2 linhas onde o limite é 1 (17/24)', () => {
      const dois = (extra) => ({ antes: estadoDeEnvio(), depois: estadoDeEnvio({ mensagens: [mensagemDeEnvio(), mensagemDeEnvio(extra)] }) })
      falha(dois({ linhas: 2 }), /2 linhas/)
      falha(dois({ tipo: 'ajuda', linhas: 2 }), /ajuda com 2 linhas/)
    })

    it('contagem de linhas ilegível (null, NaN) falha em vez de passar', () => {
      falha({ antes: estadoDeEnvio(), depois: estadoDeEnvio({ mensagens: [mensagemDeEnvio({ linhas: null })] }) }, /ilegível/)
      falha({ antes: estadoDeEnvio(), depois: estadoDeEnvio({ mensagens: [mensagemDeEnvio({ linhas: Number.NaN })] }) }, /ilegível/)
    })

    it('mensagem cortada e mensagem fora da janela', () => {
      const um = (extra) => ({ antes: estadoDeEnvio(), depois: estadoDeEnvio({ mensagens: [mensagemDeEnvio(extra)] }) })
      falha(um({ cortada: true }), /cortada/)
      falha(um({ foraDaJanela: true }), /fora da janela/)
    })

    it('mensagem que cobre outro elemento (colisão)', () => {
      falha(
        { antes: estadoDeEnvio(), depois: estadoDeEnvio({ mensagens: [mensagemDeEnvio()], colisoes: [{ mensagem: 'Escreva o seu e-mail.', com: 'INPUT ana', w: 120, h: 18 }] }) },
        /cobre INPUT ana/,
      )
    })

    it('o topo do botão de envio desce 1 px; botão sem leitura', () => {
      const desce = vazioEstavel()
      desce.depois.botao.top += 1
      falha(desce, /botão de envio: topo/)
      falha({ antes: estadoDeEnvio(), depois: estadoDeEnvio({ botao: null, mensagens: [mensagemDeEnvio()] }) }, /botão de envio/)
      falha({ antes: estadoDeEnvio({ botao: null }), depois: estadoDeEnvio({ mensagens: [mensagemDeEnvio()] }) }, /botão de envio/)
    })

    it('o topo de uma linha muda sem a altura mudar', () => {
      const topo = vazioEstavel()
      topo.depois.linhas[1].top += 8
      falha(topo, /linha 2: topo 512 -> 520/)
    })
  })

  describe('mutação: cada medida trocada na fixture estável, uma por vez, derruba o critério', () => {
    const mutacoes = [
      ['altura de linha +1', (e) => (e.depois.linhas[0].altura += 1), /linha 1: altura 112 -> 113/],
      ['topo de linha +1', (e) => (e.depois.linhas[1].top += 1), /linha 2: topo 512 -> 513/],
      ['altura da página +1', (e) => (e.depois.pagina += 1), /página: altura 2000 -> 2001/],
      ['topo do botão +1', (e) => (e.depois.botao.top += 1), /botão de envio: topo 664 -> 665/],
    ]
    for (const [nome, mutar, padrao] of mutacoes) {
      it(nome, () => {
        const e = vazioEstavel()
        assert.equal(e7Vazio(e).ok, true, 'a fixture estável tem de passar antes da mutação')
        mutar(e)
        const r = e7Vazio(e)
        assert.equal(r.ok, false)
        assert.match(r.motivo, padrao)
      })
    }
  })
})

// ---------------------------------------------------------------------------------------------
// MAT-44d-3, volta da revisão, defeito D-1: o anel de foco do campo encosta no texto de ajuda.
// A regra: a base do anel (a caixa do controle + outline-offset + outline-width) fica a pelo menos 4 px da tinta
// de cada mensagem visível do mesmo campo (a ajuda em repouso; o erro depois do envio vazio). A medida é a da
// tinta (`topoLetra`), não a da caixa de 24 px: a letra de 17 px começa uns 5 px abaixo do topo da caixa, e a
// caixa daria uma folga que o olho não vê. Hoje: anel y 379-443 e tinta em y 445, folga de 2 px.

describe('D-1: o anel de foco não toca a mensagem do campo (E-7)', () => {
  // Cada chamada traz a própria caixa: as mutações abaixo mexem nela e não podem vazar para as outras.
  const controleCom = (mensagens) => ({ ...ANEL_OK, caixa: { ...CAIXA_DO_CONTROLE }, mensagens })
  const doc = ({ repouso = {}, erro = {} } = {}) => ({
    ...doc1440,
    foco: { controle: controleCom([mensagemDoFoco(repouso)]), botao: { ...ANEL_OK, tag: 'button' } },
    envio: {
      vazio: {
        ...vazioEstavel(),
        foco: { controle: controleCom([mensagemDoFoco({ tipo: 'erro', texto: 'Escreva o seu e-mail.', ...erro })]), botao: { ...ANEL_OK, tag: 'button' } },
      },
    },
  })
  const reprova = (d, padrao) => {
    const r = e7(d, 'claro')
    assert.equal(r.ok, false, `devia reprovar: ${r.motivo}`)
    if (padrao) assert.match(r.motivo, padrao)
    return r
  }

  it('o estado estável passa: anel y 379-443, tinta da ajuda e do erro a partir de y 447 (folga de 4 px)', () => {
    const r = e7(doc(), 'claro')
    assert.equal(r.ok, true, r.motivo)
  })

  it('o comportamento de hoje reprova: anel y 379-443 e a tinta da ajuda em y 445 (2 px), com os números na mensagem', () => {
    const r = reprova(doc({ repouso: { topoLetra: 445 } }), /controle em repouso: o anel de foco \(base em y=443\.0\) fica a 2\.0 px da letra de ajuda "É o nome que a família vai ver\." \(começa em y=445\.0; o mínimo é 4\)/)
    assert.deepEqual(r.nos_com_falha, ['controle em repouso'])
  })

  it('o erro depois do envio vazio também reprova: tinta em y 445 (2 px)', () => {
    const r = reprova(doc({ erro: { topoLetra: 445 } }), /controle depois do envio vazio: o anel de foco \(base em y=443\.0\) fica a 2\.0 px da letra de erro "Escreva o seu e-mail\."/)
    assert.deepEqual(r.nos_com_falha, ['controle depois do envio vazio'])
  })

  it('a borda: 3,75 px passa (a tolerância é de 0,25) e 3,5 px reprova', () => {
    assert.equal(e7(doc({ repouso: { topoLetra: 446.75 }, erro: { topoLetra: 446.75 } }), 'claro').ok, true)
    reprova(doc({ repouso: { topoLetra: 446.5 } }), /fica a 3\.5 px/)
    reprova(doc({ erro: { topoLetra: 446.5 } }), /fica a 3\.5 px/)
  })

  it('mais folga passa (a regra é um mínimo)', () => {
    assert.equal(e7(doc({ repouso: { topoLetra: 460 }, erro: { topoLetra: 460 } }), 'claro').ok, true)
  })

  it('só conta a mensagem que está sob o anel: uma mensagem acima ou ao lado do anel não reprova', () => {
    const acima = { top: 300, bottom: 324, topoLetra: 305 }
    assert.equal(e7(doc({ repouso: acima }), 'claro').ok, true)
    const aoLado = { left: 1200, right: 1400, topoLetra: 445 }
    assert.equal(e7(doc({ repouso: aoLado }), 'claro').ok, true)
  })

  it('o campo sem mensagem em repouso passa (Entrar: nada a tocar), mas o erro tem de ser lido', () => {
    const d = doc()
    d.foco.controle.mensagens = []
    assert.equal(e7(d, 'claro').ok, true)
  })

  it('com duas mensagens, vale a pior (a mais perto do anel)', () => {
    const d = doc()
    d.foco.controle.mensagens = [mensagemDoFoco(), mensagemDoFoco({ tipo: 'status', texto: 'Enviamos.', topoLetra: 444 })]
    reprova(d, /fica a 1\.0 px da letra de status "Enviamos\."/)
  })

  describe('falha fechada', () => {
    const quebra = (alterar, padrao) => {
      const d = doc()
      alterar(d.foco.controle)
      reprova(d, padrao)
    }
    const quebraDoErro = (alterar, padrao) => {
      const d = doc()
      alterar(d.envio.vazio.foco.controle)
      reprova(d, padrao)
    }

    it('sem a caixa do controle (retângulo ausente, parcial ou ilegível)', () => {
      quebra((c) => delete c.caixa, /controle em repouso: sem o retângulo do controle/)
      quebra((c) => (c.caixa = null), /sem o retângulo do controle/)
      quebra((c) => (c.caixa = { top: 383, bottom: 439, left: 480 }), /sem o retângulo do controle/)
      quebra((c) => (c.caixa = { ...CAIXA_DO_CONTROLE, bottom: Number.NaN }), /sem o retângulo do controle/)
      quebraDoErro((c) => delete c.caixa, /controle depois do envio vazio: sem o retângulo do controle/)
    })

    it('sem a leitura das mensagens do campo', () => {
      quebra((c) => delete c.mensagens, /controle em repouso: sem a leitura das mensagens/)
      quebra((c) => (c.mensagens = 'ajuda'), /sem a leitura das mensagens/)
      quebraDoErro((c) => delete c.mensagens, /controle depois do envio vazio: sem a leitura das mensagens/)
    })

    it('mensagem sem retângulo (caixa ou topo da letra ausente ou ilegível)', () => {
      quebra((c) => (c.mensagens = [mensagemDoFoco({ topoLetra: undefined })]), /ajuda "É o nome que a família vai ver\." sem retângulo/)
      quebra((c) => (c.mensagens = [mensagemDoFoco({ topoLetra: Number.NaN })]), /sem retângulo/)
      quebra((c) => (c.mensagens = [mensagemDoFoco({ top: null })]), /sem retângulo/)
      quebra((c) => (c.mensagens = [mensagemDoFoco({ left: undefined })]), /sem retângulo/)
      quebra((c) => (c.mensagens = [null]), /sem retângulo/)
      quebraDoErro((c) => (c.mensagens = [mensagemDoFoco({ tipo: 'erro', topoLetra: undefined })]), /controle depois do envio vazio: erro .* sem retângulo/)
    })

    it('largura ou offset do anel ilegível não deixa medir a folga', () => {
      quebra((c) => (c.outlineWidth = 'auto'), /(largura|offset).*(ilegível|em vez de)/)
      quebra((c) => (c.outlineOffset = undefined), /(largura|offset).*(ilegível|em vez de)/)
    })

    it('sem a leitura do anel (foco ausente ou que não focou)', () => {
      assert.equal(e7({ ...doc1440, envio: doc().envio }, 'claro').ok, false)
      const d = doc()
      d.foco.controle = { focou: false }
      reprova(d)
    })

    it('depois do envio vazio: sem a leitura do foco, sem o controle, que não focou, ou sem nenhuma mensagem', () => {
      const semFoco = doc()
      delete semFoco.envio.vazio.foco
      reprova(semFoco, /controle depois do envio vazio: sem a leitura do foco/)
      const semControle = doc()
      semControle.envio.vazio.foco = { controle: null, botao: null }
      reprova(semControle, /controle depois do envio vazio: sem a leitura do foco/)
      const naoFocou = doc()
      naoFocou.envio.vazio.foco = { controle: { focou: false }, botao: null }
      reprova(naoFocou, /controle depois do envio vazio: não recebeu foco/)
      const semMensagem = doc()
      semMensagem.envio.vazio.foco.controle.mensagens = []
      reprova(semMensagem, /controle depois do envio vazio: o campo não mostra nenhuma mensagem/)
    })
  })

  describe('mutação: +1 px do anel ou da mensagem, uma por vez, derruba o critério', () => {
    const mutacoes = [
      ['a base do controle desce 1 px (anel +1 px embaixo), em repouso', (d) => (d.foco.controle.caixa.bottom += 1), /controle em repouso: .*fica a 3\.0 px/],
      ['a base do controle desce 1 px, depois do envio vazio', (d) => (d.envio.vazio.foco.controle.caixa.bottom += 1), /controle depois do envio vazio: .*fica a 3\.0 px/],
      ['o offset do anel +1 px (3 px de recuo): o anel cresce 1 px de cada lado', (d) => (d.foco.controle.outlineOffset = '3px'), /controle em repouso: .*fica a 3\.0 px/],
      ['a largura do anel +1 px (3 px): o anel cresce 1 px de cada lado', (d) => (d.foco.controle.outlineWidth = '3px'), /controle em repouso: .*fica a 3\.0 px/],
      ['a tinta da ajuda sobe 1 px', (d) => (d.foco.controle.mensagens[0].topoLetra -= 1), /controle em repouso: .*fica a 3\.0 px/],
      ['a tinta do erro sobe 1 px', (d) => (d.envio.vazio.foco.controle.mensagens[0].topoLetra -= 1), /controle depois do envio vazio: .*fica a 3\.0 px/],
    ]
    for (const [nome, mutar, padrao] of mutacoes) {
      it(nome, () => {
        const d = doc()
        assert.equal(e7(d, 'claro').ok, true, 'a fixture estável tem de passar antes da mutação')
        mutar(d)
        const r = e7(d, 'claro')
        assert.equal(r.ok, false)
        assert.match(r.motivo, padrao)
      })
    }
  })

  it('o E-7 do avaliarCriterios leva a folga junto (o critério bloqueia)', () => {
    const { criterios } = avaliarCriterios({ doc: doc({ repouso: { topoLetra: 445 } }), nos: [], tema: 'claro' }, 'entrar')
    const c = criterios.find((x) => x.regra === 'E-7')
    assert.equal(c.ok, false)
    assert.match(c.motivo, /fica a 2\.0 px da letra/)
  })
})

describe('D-1: a leitura do foco traz a caixa do controle e a tinta das mensagens do campo (lerFocoNaPagina)', () => {
  const CAMPO = `
    <main><form>
      <div class="sb-campo">
        <input id="nome" value="x" data-r="480,383,620,56">
        <p class="sb-campo-ajuda" data-r="480,440,620,24" style="line-height: 24px; font-size: 17px">É o nome que a família vai ver.</p>
        <p class="sb-campo-erro" data-r="480,440,620,24" style="line-height: 24px; font-size: 17px">  </p>
        <p class="sb-campo-status" data-r="480,440,620,24" style="display: none; line-height: 24px; font-size: 17px">Escondida.</p>
      </div>
      <button type="submit" data-r="480,700,200,64">Entrar</button>
    </form></main>`

  /** O jsdom não mede layout nem tem canvas: `data-r` dá a caixa; `canvas` troca o `getContext` por uma medida da tinta. */
  function lerCampo(html, { canvas, rolagem } = {}) {
    const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { runScripts: 'outside-only', virtualConsole: new VirtualConsole() })
    const { window } = dom
    const retangulo = function retangulo() {
      const [x, y, w, h] = (this.getAttribute?.('data-r') ?? '0,0,100,20').split(',').map(Number)
      return { x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h }
    }
    window.Element.prototype.getBoundingClientRect = retangulo
    window.Range.prototype.getBoundingClientRect = () => ({ x: 480, y: 437, left: 480, top: 437, width: 300, height: 20, right: 780, bottom: 457 })
    if (canvas) window.HTMLCanvasElement.prototype.getContext = () => ({ font: '', measureText: () => canvas })
    if (rolagem) Object.defineProperty(window, 'scrollY', { configurable: true, value: rolagem })
    window.scrollTo = () => undefined
    try {
      return JSON.parse(JSON.stringify(window.eval(`(${lerFocoNaPagina.toString()})()`)))
    } finally {
      window.close()
    }
  }

  it('lê a caixa do controle e só as mensagens visíveis com texto do mesmo campo (a vazia e a escondida ficam de fora)', () => {
    const foco = lerCampo(CAMPO)
    assert.deepEqual(foco.controle.caixa, { top: 383, bottom: 439, left: 480, right: 1100 })
    assert.equal(foco.controle.mensagens.length, 1)
    const [m] = foco.controle.mensagens
    assert.equal(m.tipo, 'ajuda')
    assert.equal(m.texto, 'É o nome que a família vai ver.')
    assert.deepEqual([m.top, m.bottom, m.left, m.right], [440, 464, 480, 1100])
  })

  it('sem canvas a letra é estimada pelo em-quadrado da linha: topo da caixa + (24 - 17) / 2', () => {
    const [m] = lerCampo(CAMPO).controle.mensagens
    assert.equal(m.medida, 'estimada')
    assert.equal(m.topoLetra, 443.5)
  })

  it('com canvas a letra é a tinta: topo do texto + ascendente da fonte - ascendente da tinta', () => {
    const [m] = lerCampo(CAMPO, { canvas: { fontBoundingBoxAscent: 17, actualBoundingBoxAscent: 13 } }).controle.mensagens
    assert.equal(m.medida, 'tinta')
    assert.equal(m.topoLetra, 437 + 17 - 13)
  })

  it('medida do canvas ilegível volta para a estimativa em vez de passar NaN', () => {
    const [m] = lerCampo(CAMPO, { canvas: { fontBoundingBoxAscent: undefined, actualBoundingBoxAscent: 13 } }).controle.mensagens
    assert.equal(m.medida, 'estimada')
    assert.ok(Number.isFinite(m.topoLetra))
  })

  it('as coordenadas são as da página: a rolagem entra na caixa e na letra', () => {
    const foco = lerCampo(CAMPO, { rolagem: 100 })
    assert.equal(foco.controle.caixa.top, 483)
    assert.equal(foco.controle.mensagens[0].top, 540)
    assert.equal(foco.controle.mensagens[0].topoLetra, 543.5)
  })

  it('o botão de envio, fora de uma linha de campo, volta com a caixa e sem mensagens', () => {
    const foco = lerCampo(CAMPO)
    assert.equal(foco.botao.tag, 'button')
    assert.deepEqual(foco.botao.mensagens, [])
    assert.equal(foco.botao.caixa.top, 700)
  })

  it('o que a leitura traz alimenta a regra: a tinta a 2 px do anel reprova e a 4 px passa', () => {
    const doEstilo = { outlineStyle: 'solid', outlineWidth: '2px', outlineOffset: '2px', outlineColor: 'rgb(26, 21, 17)' }
    const foco = lerCampo(CAMPO)
    // O jsdom não calcula o outline: o estilo vem da fixture, a geometria vem da leitura.
    const comAnel = { controle: { ...foco.controle, ...doEstilo }, botao: { ...foco.botao, ...doEstilo } }
    const quatro = { ...comAnel, controle: { ...comAnel.controle, mensagens: [{ ...comAnel.controle.mensagens[0], topoLetra: 447 }] } }
    const dois = { ...comAnel, controle: { ...comAnel.controle, mensagens: [{ ...comAnel.controle.mensagens[0], topoLetra: 445 }] } }
    const envio = { vazio: vazioEstavel() }
    assert.equal(e7({ ...doc1440, foco: quatro, envio }, 'claro').ok, true)
    assert.equal(e7({ ...doc1440, foco: dois, envio }, 'claro').ok, false)
  })
})

describe('R-3: a confirmação do Recuperar não muda a linha nem a página', () => {
  it('o estado estável passa: a confirmação de 1 linha, ou de 2 (390), com a linha e a página iguais', () => {
    const r = r3Enviado(enviadoEstavel())
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'R-3')
    const duas = enviadoEstavel()
    duas.depois.mensagens[0].linhas = 2
    assert.equal(r3Enviado(duas).ok, true)
  })

  it('o comportamento de hoje em 390 reprova: linha 101 -> 157 e página 2672 -> 2728, com os números na mensagem', () => {
    const r = r3Enviado({
      antes: estadoDeEnvio({ pagina: 2672, alturas: [101] }),
      depois: estadoDeEnvio({ pagina: 2728, alturas: [157], mensagens: [mensagemDeEnvio({ tipo: 'status', linhas: 2 })] }),
    })
    assert.equal(r.ok, false)
    assert.match(r.motivo, /linha 1: altura 101 -> 157/)
    assert.match(r.motivo, /página: altura 2672 -> 2728/)
  })

  describe('falha fechada', () => {
    const falha = (enviado, padrao) => {
      const r = r3Enviado(enviado)
      assert.equal(r.ok, false, `devia reprovar: ${r.motivo}`)
      if (padrao) assert.match(r.motivo, padrao)
    }
    const status = (extra = {}) => mensagemDeEnvio({ tipo: 'status', texto: 'Enviamos o link.', ...extra })
    const comStatus = (extra) => ({ antes: estadoDeEnvio({ alturas: [112] }), depois: estadoDeEnvio({ alturas: [112], mensagens: [status(extra)] }) })

    it('sem doc.envio, sem o enviado e com leitura incompleta', () => {
      assert.equal(r3({ ...doc1440 }).ok, false)
      assert.equal(r3({ ...doc1440, envio: { vazio: vazioEstavel() } }).ok, false)
      assert.equal(r3({ ...doc1440, envio: { enviado: { depois: estadoDeEnvio() } } }).ok, false)
      assert.equal(r3(undefined).ok, false)
    })

    it('sem nenhuma linha de campo antes do envio', () => {
      falha({ antes: estadoDeEnvio({ alturas: [] }), depois: estadoDeEnvio({ alturas: [], mensagens: [status()] }) }, /linha de campo/)
    })

    it('a confirmação não aparece (nenhuma mensagem de status visível)', () => {
      falha({ antes: estadoDeEnvio({ alturas: [112] }), depois: estadoDeEnvio({ alturas: [112] }) }, /status/)
      falha({ antes: estadoDeEnvio({ alturas: [112] }), depois: estadoDeEnvio({ alturas: [112], mensagens: [mensagemDeEnvio()] }) }, /status/)
    })

    it('a confirmação com 3 linhas, com 0 ou ilegível', () => {
      falha(comStatus({ linhas: 3 }), /3 linhas/)
      falha(comStatus({ linhas: 0 }), /0 linhas/)
      falha(comStatus({ linhas: null }), /ilegível/)
    })

    it('a confirmação cortada, fora da janela ou cobrindo outro elemento', () => {
      falha(comStatus({ cortada: true }), /cortada/)
      falha(comStatus({ foraDaJanela: true }), /fora da janela/)
      const colide = comStatus()
      colide.depois.colisoes = [{ mensagem: 'Enviamos o link.', com: 'BUTTON Enviar', w: 80, h: 10 }]
      falha(colide, /cobre BUTTON Enviar/)
    })

    it('o botão de envio desce 1 px; a linha muda de altura; a página muda', () => {
      const botao = enviadoEstavel()
      botao.depois.botao.top += 1
      falha(botao, /botão de envio: topo/)
      const linha = enviadoEstavel()
      linha.depois.linhas[0].altura = 157
      falha(linha, /linha 1: altura 112 -> 157/)
      const pagina = enviadoEstavel()
      pagina.depois.pagina += 56
      falha(pagina, /página: altura 2000 -> 2056/)
    })
  })

  describe('mutação: cada medida trocada na fixture estável, uma por vez, derruba o critério', () => {
    const mutacoes = [
      ['altura de linha +1', (e) => (e.depois.linhas[0].altura += 1), /linha 1: altura 112 -> 113/],
      ['topo de linha +1', (e) => (e.depois.linhas[0].top += 1), /linha 1: topo 400 -> 401/],
      ['altura da página +1', (e) => (e.depois.pagina += 1), /página: altura 2000 -> 2001/],
      ['topo do botão +1', (e) => (e.depois.botao.top += 1), /botão de envio: topo 552 -> 553/],
    ]
    for (const [nome, mutar, padrao] of mutacoes) {
      it(nome, () => {
        const e = enviadoEstavel()
        assert.equal(r3Enviado(e).ok, true, 'a fixture estável tem de passar antes da mutação')
        mutar(e)
        const r = r3Enviado(e)
        assert.equal(r.ok, false)
        assert.match(r.motivo, padrao)
      })
    }
  })
})

// ---------------------------------------------------------------------------------------------
// MAT-44d-3, volta 3, defeito D4: em 390 havia ~96 px entre a base do campo (o fio) e o topo do botão "Enviar link"
// (64 px de zona reservada para uma confirmação de 2 linhas mais 32 px de margem do botão); nas telas irmãs o vão
// tem 33. A confirmação passou a ter 1 linha (zona de 32 px): o vão cai para 32 + 32 = 64 px e a página segue parada
// quando a confirmação aparece (R-3). Critério:
//   D4-vao: em 390, em repouso (o Recuperar recém-aberto, sem mensagem), botão.top - fio.bottom <= 64
//           (o fio é a borda de baixo do `.sb-campo-controle`; a leitura traz `controles[i].bottom`).
// Fora de 390: acima de 768 não se aplica (a mensagem mora na linha de 112 px); abaixo de 768 mas diferente de 390, a
// medida não tem o que a sustente e reprova fechado, como a leitura ausente, o campo sem medida e o botão sem topo.
//
// O fio de 390 NÃO é a base do `.sb-campo`: abaixo de 768 o `.sb-campo` não tem borda de baixo (`fio: null` na geometria) e a
// zona de mensagem é o `padding-bottom` dele, então a caixa passa do fio. Medir pela caixa do `.sb-campo` daria 32 px com a
// zona de 1 linha e 32 px também com a de 2 (a zona entra na caixa): o defeito de 96 px passaria. Por isso a leitura traz a
// base do controle e o D4 mede dali (os números abaixo são os do Chrome: fio em y=568 com o campo em y=467).

/**
 * O Recuperar de 390 em repouso, como o Chrome lê: o fio (a base do controle) fica 101 px abaixo do topo da linha de
 * campo, a zona de mensagem de `zona` px entra na caixa da linha (`padding-bottom`) e o botão começa `vao` px abaixo do
 * fio. Zona de 32: linha de 133 e vão de 32 + 32 = 64 (a medida de hoje). Zona de 64 (a de antes): linha de 165 e vão 96.
 */
const BASE_DO_FIO = 501
const repouso390 = ({ vao = 64, zona = 32, base = BASE_DO_FIO, botao } = {}) => ({
  ...estadoDeEnvio({ alturas: [101 + zona], botao: botao === undefined ? base + vao : botao }),
  controles: [{ bottom: base }],
})
const enviado390 = (extra = {}) => ({
  antes: repouso390(extra),
  depois: {
    ...estadoDeEnvio({
      alturas: [133],
      botao: BASE_DO_FIO + 64,
      mensagens: [mensagemDeEnvio({ tipo: 'status', texto: 'Se a conta existir, enviamos o link.' })],
    }),
    controles: [{ bottom: BASE_DO_FIO }],
  },
})
const docD4 = (enviado = enviado390(), base = doc390) => ({ ...base, envio: { enviado } })

describe('D4-vao: o vão do fio do campo ao botão, em 390, em repouso', () => {
  const reprova = (r, padrao) => {
    assert.equal(r.ok, false, `devia reprovar: ${r.motivo}`)
    if (padrao) assert.match(r.motivo, padrao)
    return r
  }

  it('o estado de antes reprova com os números: 96 px e 97 px (o fio em y=501, o botão começa em 597 e 598)', () => {
    reprova(
      d4Vao(docD4(enviado390({ vao: 96, zona: 64 }))),
      /o botão de envio começa em y=597\.0 e o fio do campo \(a base do controle\) termina em y=501\.0: vão de 96\.0 px \(o máximo é 64\)/,
    )
    reprova(d4Vao(docD4(enviado390({ vao: 97, zona: 64 }))), /vão de 97\.0 px/)
  })

  it('a base do `.sb-campo` não serve de fio: com a zona de 2 linhas a caixa da linha termina a 32 px do botão e o defeito de 96 px passaria; o critério mede pelo fio', () => {
    const e = enviado390({ vao: 96, zona: 64 })
    const caixa = e.antes.linhas[0].top + e.antes.linhas[0].altura
    assert.equal(e.antes.botao.top - caixa, 32, 'pela caixa do .sb-campo o vão de antes pareceria 32 px')
    reprova(d4Vao(docD4(e)), /vão de 96\.0 px/)
  })

  it('o estado corrigido passa: 64 px (32 da zona de 1 linha + 32 da margem do botão), e menos também passa', () => {
    const r = d4Vao(docD4())
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'D4-vao')
    assert.deepEqual(r.nos_com_falha, [])
    for (const vao of [64, 56, 33, 32]) assert.equal(d4Vao(docD4(enviado390({ vao }))).ok, true, `${vao} px`)
  })

  it('a borda: 64 passa, 64,25 passa (a tolerância é de 0,25) e 64,5 reprova', () => {
    assert.equal(d4Vao(docD4(enviado390({ vao: 64.25 }))).ok, true)
    reprova(d4Vao(docD4(enviado390({ vao: 64.5 }))), /vão de 64\.5 px/)
  })

  describe('mutação: 1 px a mais em cada medida, uma por vez, derruba o critério no limite 64', () => {
    const mutacoes = [
      ['o botão desce 1 px', (e) => (e.antes.botao.top += 1), /vão de 65\.0 px/],
      ['o fio (a base do controle) sobe 1 px', (e) => (e.antes.controles[0].bottom -= 1), /vão de 65\.0 px/],
    ]
    for (const [nome, mutar, padrao] of mutacoes) {
      it(nome, () => {
        const e = enviado390()
        assert.equal(d4Vao(docD4(e)).ok, true, 'a fixture estável tem de passar antes da mutação')
        mutar(e)
        reprova(d4Vao(docD4(e)), padrao)
      })
    }

    it('o movimento contrário (1 px a menos de vão) passa', () => {
      const e = enviado390()
      e.antes.botao.top -= 1
      assert.equal(d4Vao(docD4(e)).ok, true)
    })
  })

  it('lê o repouso (antes do envio): a página depois do envio não entra na conta (isso é do R-3)', () => {
    const e = enviado390()
    e.depois.botao.top += 200
    assert.equal(d4Vao(docD4(e)).ok, true)
  })

  it('a caixa da linha (`.sb-campo`) não entra na conta: só o fio e o botão', () => {
    const e = enviado390()
    e.antes.linhas[0].altura += 40
    e.antes.linhas[0].top -= 7
    assert.equal(d4Vao(docD4(e)).ok, true)
  })

  it('vale o último controle, o que está sobre o botão', () => {
    const duas = (vao) => ({ ...estadoDeEnvio({ alturas: [133, 133], botao: 701 + vao }), controles: [{ bottom: 501 }, { bottom: 701 }] })
    reprova(d4Vao(docD4({ antes: duas(96), depois: duas(96) })), /termina em y=701\.0: vão de 96\.0 px/)
    assert.equal(d4Vao(docD4({ antes: duas(64), depois: duas(64) })).ok, true)
  })

  describe('largura', () => {
    it('de 768 para cima não se aplica (a mensagem mora dentro da linha de 112 px), mesmo com o vão grande', () => {
      const r = d4Vao(docD4(enviado390({ vao: 96 }), doc1440))
      assert.equal(r.ok, true)
      assert.match(r.motivo, /não aplicável/)
    })

    it('abaixo de 768 e diferente de 390 reprova fechado: o critério só vale em 390', () => {
      for (const largura of [375, 360, 320, 767]) {
        reprova(d4Vao(docD4(enviado390(), { ...doc390, largura, clientWidth: largura - 15 })), new RegExp(`${largura} px.*só vale em 390`))
      }
    })
  })

  describe('falha fechada', () => {
    it('sem doc, sem a largura da janela ou sem a clientWidth', () => {
      assert.equal(d4Vao(undefined).ok, false)
      assert.equal(d4Vao({ clientWidth: 375 }).ok, false)
      assert.equal(d4Vao({ largura: 390 }).ok, false)
    })

    it('sem doc.envio, sem o enviado, sem o antes', () => {
      reprova(d4Vao({ ...doc390 }), /sem a leitura do Recuperar em repouso/)
      reprova(d4Vao({ ...doc390, envio: {} }), /sem a leitura do Recuperar em repouso/)
      reprova(d4Vao({ ...doc390, envio: { vazio: vazioEstavel() } }), /sem a leitura do Recuperar em repouso/)
      reprova(d4Vao({ ...doc390, envio: { enviado: { depois: estadoDeEnvio() } } }), /sem a leitura do Recuperar em repouso/)
      reprova(d4Vao({ ...doc390, envio: { enviado: { antes: { pagina: 2000 } } } }), /sem a leitura do Recuperar em repouso/)
    })

    it('sem campo (nenhuma linha .sb-campo)', () => {
      reprova(d4Vao(docD4({ antes: estadoDeEnvio({ alturas: [], botao: 600 }), depois: estadoDeEnvio() })), /nenhuma linha de campo/)
    })

    it('sem botão (nulo, sem topo ou com topo ilegível)', () => {
      reprova(d4Vao(docD4({ antes: repouso390({ botao: null }), depois: estadoDeEnvio() })), /sem o botão de envio/)
      for (const topo of [undefined, Number.NaN, '600', null]) {
        const e = enviado390()
        e.antes.botao = { top: topo }
        reprova(d4Vao(docD4(e)), /sem o botão de envio|sem o topo do botão/)
      }
    })

    it('sem o fio: a leitura sem `controles`, vazia, curta, com a entrada nula ou com a base ilegível', () => {
      const sem = (mudar) => {
        const e = enviado390()
        mudar(e.antes)
        return reprova(d4Vao(docD4(e)), /sem a base do controle \(o fio do campo\)/)
      }
      sem((a) => delete a.controles)
      sem((a) => (a.controles = 'controle'))
      sem((a) => (a.controles = []))
      sem((a) => (a.controles = [null]))
      sem((a) => (a.controles = [{}]))
      sem((a) => (a.controles = [{ bottom: Number.NaN }]))
      sem((a) => (a.controles = [{ bottom: '501' }]))
      sem((a) => (a.controles = [{ bottom: undefined }]))
    })

    it('o vão negativo (o botão acima do fio) é leitura quebrada e reprova', () => {
      reprova(d4Vao(docD4(enviado390({ botao: 400 }))), /botão de envio começa em y=400\.0.*vão de -101\.0 px/)
    })
  })

  describe('dentro do avaliarCriterios', () => {
    it('o Recuperar soma D4-vao como critério bloqueante, e ele passa com a leitura certa em 390', () => {
      const { criterios } = avaliarCriterios({ doc: docD4(), nos: [], tema: 'claro' }, 'recuperar_acesso')
      const c = criterios.find((x) => x.regra === 'D4-vao')
      assert.ok(c, 'falta D4-vao no Recuperar')
      assert.equal(c.ok, true, c.motivo)
      assert.equal(c.bloqueia, true)
    })

    it('com o vão de hoje (96) o avaliarCriterios reprova o D4-vao com o número, e sem leitura reprova fechado', () => {
      const hoje = avaliarCriterios({ doc: docD4(enviado390({ vao: 96 })), nos: [], tema: 'claro' }, 'recuperar_acesso')
      assert.match(hoje.criterios.find((x) => x.regra === 'D4-vao').motivo, /vão de 96\.0 px/)
      const sem = avaliarCriterios({ doc: { ...doc390 }, nos: [], tema: 'claro' }, 'recuperar_acesso')
      assert.equal(sem.criterios.find((x) => x.regra === 'D4-vao').ok, false)
    })

    it('em 1440 o D4-vao do Recuperar não se aplica e passa', () => {
      const { criterios } = avaliarCriterios({ doc: { ...doc1440 }, nos: [], tema: 'claro' }, 'recuperar_acesso')
      const c = criterios.find((x) => x.regra === 'D4-vao')
      assert.equal(c.ok, true)
      assert.match(c.motivo, /não aplicável/)
    })

    it('só o Recuperar tem o D4-vao: as outras telas (Entrar, Criar conta, Começar, Conta) ficam como estão', () => {
      for (const caso of ['entrar', 'criar_conta', 'comecar_seu_nome', 'conta']) {
        assert.ok(!criteriosDoCaso(caso).includes('D4-vao'), caso)
        assert.ok(!criteriosDoCaso(caso, 'madrugada').includes('D4-vao'), caso)
      }
    })
  })
})

describe('R-3 em 390 (D4): a confirmação tem 1 linha, e 2 reprovam', () => {
  const r3Em390 = (enviado) => r3({ ...doc390, envio: { enviado } })

  it('a confirmação de 1 linha passa e a página, a linha e o botão ficam parados', () => {
    const r = r3Em390(enviado390())
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'R-3')
  })

  it('a confirmação de 2 linhas (a de antes, em 358 px) reprova: a zona agora é de 1 linha', () => {
    const e = enviado390()
    e.depois.mensagens[0].linhas = 2
    const r = r3Em390(e)
    assert.equal(r.ok, false)
    assert.match(r.motivo, /mensagem de status com 2 linhas \(o limite é 1\)/)
  })

  it('a página continua parada: a altura da página, da linha e o topo do botão iguais antes e depois do envio', () => {
    for (const mutar of [(e) => (e.depois.pagina += 1), (e) => (e.depois.linhas[0].altura += 1), (e) => (e.depois.botao.top += 1)]) {
      const e = enviado390()
      assert.equal(r3Em390(e).ok, true)
      mutar(e)
      assert.equal(r3Em390(e).ok, false)
    }
  })

  it('em 1440 a confirmação segue podendo ter 1 ou 2 linhas (nada mudou em 1440)', () => {
    const e = enviadoEstavel()
    e.depois.mensagens[0].linhas = 2
    assert.equal(r3Enviado(e).ok, true)
  })
})

describe('44d-3 (volta): o R-3 entra no Recuperar e o aviso de "a medição não envia" sai do olho', () => {
  it('CRITERIOS_DO_CASO do Recuperar acaba em R-3 e o avaliarCriterios o roda', () => {
    assert.ok(criteriosDoCaso('recuperar_acesso').includes('R-3'))
    const { criterios } = avaliarCriterios({ doc: { ...doc1440, foco: FOCO_OK, envio: { vazio: vazioEstavel(), enviado: enviadoEstavel() } }, nos: [], tema: 'claro' }, 'recuperar_acesso')
    const e7r = criterios.find((c) => c.regra === 'E-7')
    const r3r = criterios.find((c) => c.regra === 'R-3')
    assert.equal(e7r.ok, true, e7r.motivo)
    assert.equal(r3r.ok, true, r3r.motivo)
    assert.equal(r3r.bloqueia, true)
  })

  it('sem a leitura do envio, o E-7 e o R-3 reprovam fechado dentro do avaliarCriterios', () => {
    const { criterios } = avaliarCriterios({ doc: { ...doc1440, foco: FOCO_OK }, nos: [], tema: 'claro' }, 'recuperar_acesso')
    assert.equal(criterios.find((c) => c.regra === 'E-7').ok, false)
    assert.equal(criterios.find((c) => c.regra === 'R-3').ok, false)
  })

  it('nenhum item manual diz mais que a medição não envia o formulário', () => {
    for (const [caso, itens] of Object.entries(MANUAIS_DO_CASO)) {
      for (const item of itens) assert.doesNotMatch(item.olhar, /não envia/, `${caso} ${item.id}`)
    }
    assert.ok(MANUAIS_DO_CASO.recuperar_acesso.some((m) => m.id === 'R-3' && m.olhar.length > 20))
    assert.ok(MANUAIS_DO_CASO.entrar.some((m) => m.id === 'E-7' && m.olhar.length > 20))
  })
})

describe('44d-3 (volta): a leitura em página do estado de envio (lerEstadoDeEnvioNaPagina)', () => {
  /**
   * Monta `html` num jsdom, dá a cada elemento o retângulo de `data-r="x,y,w,h"` (o jsdom não mede layout)
   * e roda a leitura serializada, como o CDP faz. `preparar(window)` ajusta rolagem, scrollWidth etc.
   */
  function lerEnvio(html, preparar = () => undefined) {
    const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { runScripts: 'outside-only', virtualConsole: new VirtualConsole() })
    const { window } = dom
    window.Element.prototype.getBoundingClientRect = function retangulo() {
      const [x, y, w, h] = (this.getAttribute('data-r') ?? '0,0,100,20').split(',').map(Number)
      return { x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h }
    }
    Object.defineProperty(window.document.documentElement, 'scrollHeight', { configurable: true, value: 2000 })
    preparar(window)
    try {
      return JSON.parse(JSON.stringify(window.eval(`(${lerEstadoDeEnvioNaPagina.toString()})()`)))
    } finally {
      window.close()
    }
  }

  const FORMULARIO = `
    <main>
      <form>
        <div class="sb-campo" data-r="169,400,963,112"><label data-r="169,420,140,32">E-mail</label><input data-r="500,420,500,48" value="ana"></div>
        <div class="sb-campo" data-r="169,512,963,112"><label data-r="169,532,140,32">Senha</label><input type="password" data-r="500,532,500,48"></div>
        <p class="sb-campo-erro" style="line-height: 24px" data-r="500,490,400,24">Escreva o seu e-mail.</p>
        <button type="submit" data-r="476,664,300,80">Entrar</button>
      </form>
    </main>`

  it('devolve o formato certo: página, linhas (topo e altura), botão, mensagens e colisões', () => {
    const e = lerEnvio(FORMULARIO)
    assert.equal(e.pagina, 2000)
    assert.deepEqual(e.linhas, [
      { top: 400, altura: 112 },
      { top: 512, altura: 112 },
    ])
    assert.deepEqual(e.botao, { top: 664 })
    assert.equal(e.mensagens.length, 1)
    assert.deepEqual(e.mensagens[0], { tipo: 'erro', texto: 'Escreva o seu e-mail.', linhas: 1, cortada: false, foraDaJanela: false })
    assert.deepEqual(e.colisoes, [])
  })

  it('as coordenadas são as da página: somam a rolagem', () => {
    const e = lerEnvio(FORMULARIO, (window) => {
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 50 })
    })
    assert.equal(e.linhas[0].top, 450)
    assert.equal(e.botao.top, 714)
  })

  it('conta as linhas da mensagem por altura / line-height', () => {
    const html = FORMULARIO.replace('data-r="500,490,400,24"', 'data-r="500,490,400,48"')
    assert.equal(lerEnvio(html).mensagens[0].linhas, 2)
    const tres = FORMULARIO.replace('data-r="500,490,400,24"', 'data-r="500,490,400,72"')
    assert.equal(lerEnvio(tres).mensagens[0].linhas, 3)
  })

  it('sem line-height calculado a contagem de linhas é nula (a regra falha fechado), e não um chute', () => {
    const html = FORMULARIO.replace('style="line-height: 24px" ', '')
    assert.equal(lerEnvio(html).mensagens[0].linhas, null)
  })

  it('lê erro, ajuda e status, na ordem dos tipos, e marca cada um', () => {
    const html = `<main><form>
      <p class="sb-campo-ajuda" style="line-height: 24px" data-r="0,100,400,24">Use o e-mail do cadastro.</p>
      <p class="sb-campo-status" role="status" style="line-height: 24px" data-r="0,200,400,24">Enviamos o link.</p>
      <p class="sb-campo-erro" style="line-height: 24px" data-r="0,300,400,24">Escreva o e-mail.</p>
    </form></main>`
    const e = lerEnvio(html)
    assert.deepEqual(e.mensagens.map((m) => m.tipo), ['erro', 'ajuda', 'status'])
  })

  it('ignora mensagem vazia (o <p role="status"> sempre presente) e mensagem escondida', () => {
    const html = `<main><form>
      <p class="sb-campo-status" role="status" data-r="0,100,400,24"></p>
      <p class="sb-campo-status" role="status" data-r="0,130,400,24">   </p>
      <p class="sb-campo-erro" style="visibility: hidden" data-r="0,160,400,24">Escondida por visibility.</p>
      <p class="sb-campo-erro" style="display: none" data-r="0,190,400,24">Escondida por display.</p>
      <p class="sb-campo-ajuda" data-r="0,220,1,1">Fina demais (largura 1).</p>
      <p class="sb-campo-ajuda" data-r="0,250,400,24">Esta aparece.</p>
    </form></main>`
    const e = lerEnvio(html)
    assert.deepEqual(e.mensagens.map((m) => m.texto), ['Esta aparece.'])
  })

  it('marca a mensagem cortada (scrollWidth > clientWidth) e a que passa da janela', () => {
    const cortada = lerEnvio(FORMULARIO, (window) => {
      const p = window.document.querySelector('.sb-campo-erro')
      Object.defineProperty(p, 'scrollWidth', { configurable: true, value: 300 })
      Object.defineProperty(p, 'clientWidth', { configurable: true, value: 100 })
    })
    assert.equal(cortada.mensagens[0].cortada, true)
    const fora = lerEnvio(FORMULARIO.replace('data-r="500,490,400,24"', 'data-r="900,490,400,24"'))
    assert.equal(fora.mensagens[0].foraDaJanela, true)
    assert.equal(fora.mensagens[0].cortada, false)
  })

  it('acha a mensagem que cobre outro elemento com texto e ignora o elemento vazio na mesma célula', () => {
    // Na fixture nada se sobrepõe à mensagem (500,490,400,24); um parágrafo com texto posto em cima dela é a colisão.
    const cobre = lerEnvio(FORMULARIO.replace('</form>', '<p data-r="520,495,100,20">Outro texto</p></form>'))
    assert.equal(cobre.colisoes.length, 1)
    assert.equal(cobre.colisoes[0].mensagem, 'Escreva o seu e-mail.')
    assert.match(cobre.colisoes[0].com, /^P Outro texto/)
    assert.ok(cobre.colisoes[0].w > 1 && cobre.colisoes[0].h > 1)
    // O mesmo elemento, sem texto, ocupa a célula e não é defeito.
    const vazio = lerEnvio(FORMULARIO.replace('</form>', '<p role="status" data-r="520,495,100,20"></p></form>'))
    assert.deepEqual(vazio.colisoes, [])
  })

  it('sem botão de envio o botão é nulo; sem linhas de campo a lista é vazia', () => {
    const e = lerEnvio('<main><p>Só texto.</p></main>')
    assert.equal(e.botao, null)
    assert.deepEqual(e.linhas, [])
    assert.deepEqual(e.mensagens, [])
    assert.deepEqual(e.controles, [])
  })

  // D4: em 390 o fio do campo é a borda de baixo do `.sb-campo-controle`, não a base do `.sb-campo` (que inclui a zona de
  // mensagem). A leitura traz a base do controle de cada linha, na mesma ordem das linhas (nula onde a linha não tem controle).
  it('D4: `controles` traz a base do `.sb-campo-controle` de cada linha, nas coordenadas da página e na ordem de `linhas`', () => {
    const html = `
      <main>
        <form>
          <div class="sb-campo" data-r="16,467,358,133"><label data-r="16,467,358,24">E-mail</label><div class="sb-campo-controle" data-r="16,504,358,64"><input data-r="32,507.5,326,56"></div></div>
          <div class="sb-campo" data-r="16,600,358,60"><label data-r="16,600,358,24">Sem controle</label></div>
          <button type="submit" data-r="16,632,358,64">Enviar link</button>
        </form>
      </main>`
    const e = lerEnvio(html, (window) => {
      window.scrollTo = () => undefined
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 100 })
    })
    assert.equal(e.linhas.length, 2)
    assert.deepEqual(e.controles, [{ bottom: 668 }, null])
    assert.equal(e.controles.length, e.linhas.length)
  })

  it('não tem fechamento: serializada por toString, roda sozinha', () => {
    assert.match(lerEstadoDeEnvioNaPagina.toString(), /^(async )?function lerEstadoDeEnvioNaPagina/)
  })
})

// ---------------------------------------------------------------------------------------------
// MAT-44d-3, volta 3, defeito D3: a ajuda e o erro colavam no fio da linha de campo (1440), o anel de foco passava
// do fim do fio e o select de fuso mostrava "America/Sao_Paulo". O contrato de acabamento (2.4): nenhum texto a
// menos de 8 px de um fio. Quatro critérios, lidos nos estados em que há mensagem (a ajuda em repouso e o erro
// depois do envio vazio):
//   D3-fio:      fio.top - mensagem.bottom >= 8   (o fio é a borda de baixo da linha: topo = bottom - 1)
//   D3-controle: mensagem.top - controle.bottom >= 8
//   D3-anel:     o anel (a caixa do controle + outline-offset + outline-width) fica entre o começo e o fim do fio
//   D3-fuso:     nenhum texto de <option> do select de fuso, nem o texto visível dele, tem "_"
// Os números de hoje (a captura do HEAD): controle até y=437, ajuda em y 444-468, fio em 466, anel até x=1136,8.

const FIO_D3 = { top: 466, bottom: 467, left: 170, right: 1133 }
/** O controle corrigido: base em 426 (8 px até a mensagem em 434) e recuo de 4 px da direita (anel até x=1133). */
const controleD3 = (extra = {}) => ({
  tag: 'input',
  top: 374,
  bottom: 426,
  left: 476,
  right: 1129,
  focou: true,
  outlineStyle: 'solid',
  outlineWidth: '2px',
  outlineOffset: '2px',
  ...extra,
})
/** A mensagem corrigida: 434 a 458 (8 px do controle e 8 px do fio em 466). */
const mensagemD3 = (extra = {}) => ({ tipo: 'ajuda', texto: 'É o nome que a família vai ver.', top: 434, bottom: 458, left: 476, right: 1129, ...extra })
const erroD3 = (extra = {}) => mensagemD3({ tipo: 'erro', texto: 'Escreva o seu nome.', ...extra })
const campoD3 = ({ fio, controle, mensagens, rotulo = 'Seu nome' } = {}) => ({
  rotulo,
  fio: fio === null ? null : { ...FIO_D3, ...(fio ?? {}) },
  controle: controle === null ? null : controleD3(controle),
  mensagens: mensagens ?? [mensagemD3()],
})
const selectD3 = (extra = {}) => ({
  rotulo: 'Seu fuso',
  valor: 'America/Sao_Paulo',
  textoVisivel: 'São Paulo (Brasília)',
  opcoes: [
    { valor: 'America/Sao_Paulo', texto: 'São Paulo (Brasília)' },
    { valor: 'America/Manaus', texto: 'Manaus' },
    { valor: 'America/Los_Angeles', texto: 'Los Angeles' },
  ],
  ...extra,
})
const geometriaD3 = ({ campos = [campoD3()], selects = [] } = {}) => ({ campos, selects })
/** A leitura em repouso (a ajuda) e a depois do envio vazio (o erro): o estado estável, em 1440. */
const docD3 = ({ repouso, erro, base = doc1440 } = {}) => ({
  ...base,
  geometria: repouso ?? geometriaD3(),
  envio: { vazio: { geometria: erro ?? geometriaD3({ campos: [campoD3({ mensagens: [erroD3()] })] }) } },
})
/** O que o HEAD mede: controle até y=437 e fim do fio em x=1132,8 (o anel passa a 1136,8), ajuda em 444-468, fio em 466. */
const campoDeHoje = (mensagem = mensagemD3()) =>
  campoD3({
    fio: { top: 466, bottom: 467, left: 169.6, right: 1132.8 },
    controle: { top: 385, bottom: 437, left: 476.8, right: 1132.8 },
    mensagens: [{ ...mensagem, top: 444, bottom: 468, left: 476.8, right: 1132.8 }],
  })

// O Perfil da Conta não tem texto de ajuda: lá só o erro depois do envio vazio é exigido.
const CASOS_COM_AJUDA = ['criar_conta', 'comecar_seu_nome']
const CASOS_DE_FORMULARIO = ['entrar', 'criar_conta', 'recuperar_acesso', 'comecar_seu_nome', 'conta']
const CRITERIOS_DA_FOLGA = [
  ['D3-fio', d3Fio],
  ['D3-controle', d3Controle],
  ['D3-anel', (doc) => d3Anel(doc)],
]

describe('D3: a mensagem, o controle e o anel dentro da linha de campo (1440)', () => {
  const reprova = (r, padrao) => {
    assert.equal(r.ok, false, `devia reprovar: ${r.motivo}`)
    if (padrao) assert.match(r.motivo, padrao)
    return r
  }

  describe('o estado estável passa (ajuda em repouso, erro depois do envio vazio)', () => {
    for (const [regra, criterio] of CRITERIOS_DA_FOLGA) {
      for (const caso of CASOS_DE_FORMULARIO) {
        it(`${regra} em ${caso}`, () => {
          const r = criterio(docD3(), caso)
          assert.equal(r.ok, true, r.motivo)
          assert.equal(r.regra, regra)
          assert.deepEqual(r.nos_com_falha, [])
        })
      }
    }
  })

  describe('o comportamento de hoje reprova, com os números reais na mensagem', () => {
    const hoje = () =>
      docD3({
        repouso: geometriaD3({ campos: [campoDeHoje()] }),
        erro: geometriaD3({ campos: [campoDeHoje(erroD3())] }),
      })

    it('D3-fio: a mensagem termina em y=468 e o fio começa em y=466 (folga de -2)', () => {
      const r = reprova(d3Fio(hoje(), 'criar_conta'), /a ajuda "É o nome que a família vai ver\." termina em y=468\.0 e o fio da linha começa em y=466\.0: folga de -2\.0 px \(o mínimo é 8\)/)
      assert.match(r.motivo, /em repouso/)
      assert.ok(r.nos_com_falha.length >= 2, 'em repouso e depois do envio vazio')
    })

    it('D3-controle: a mensagem começa em y=444 e o controle termina em y=437 (folga de 7)', () => {
      reprova(d3Controle(hoje(), 'criar_conta'), /a ajuda "É o nome que a família vai ver\." começa em y=444\.0 e o controle termina em y=437\.0: folga de 7\.0 px \(o mínimo é 8\)/)
    })

    it('D3-anel: o anel termina em x=1136,8, 3,8 px depois do fim do fio (x=1132,8)', () => {
      reprova(d3Anel(hoje(), 'criar_conta'), /o anel de foco termina em x=1136\.8, depois do fim do fio \(x=1132\.8\)/)
    })

    it('o erro depois do envio vazio também reprova, e a mensagem diz em que estado', () => {
      const d = docD3({ erro: geometriaD3({ campos: [campoDeHoje(erroD3())] }) })
      reprova(d3Fio(d, 'entrar'), /depois do envio vazio: .*o erro "Escreva o seu nome\."/)
    })
  })

  describe('a borda: 8 px passa, 7,75 passa (a tolerância é de 0,25) e 7,5 reprova; mais folga passa', () => {
    it('D3-fio', () => {
      const com = (bottom) => d3Fio(docD3({ repouso: geometriaD3({ campos: [campoD3({ mensagens: [mensagemD3({ bottom })] })] }) }), 'criar_conta')
      assert.equal(com(458).ok, true)
      assert.equal(com(458.25).ok, true)
      reprova(com(458.5), /folga de 7\.5 px/)
      assert.equal(com(440).ok, true)
    })

    it('D3-controle', () => {
      const com = (bottom) => d3Controle(docD3({ repouso: geometriaD3({ campos: [campoD3({ controle: { bottom } })] }) }), 'criar_conta')
      assert.equal(com(426).ok, true)
      assert.equal(com(426.25).ok, true)
      reprova(com(426.5), /folga de 7\.5 px/)
      assert.equal(com(400).ok, true)
    })

    it('D3-anel: o limite do lado direito é o fim do fio (1133) e o do esquerdo, o começo (170)', () => {
      const direita = (right) => d3Anel(docD3({ repouso: geometriaD3({ campos: [campoD3({ controle: { right } })] }) }), 'criar_conta')
      assert.equal(direita(1129).ok, true)
      assert.equal(direita(1129.25).ok, true)
      reprova(direita(1129.5), /termina em x=1133\.5/)
      assert.equal(direita(1100).ok, true)
      const esquerda = (left) => d3Anel(docD3({ repouso: geometriaD3({ campos: [campoD3({ controle: { left } })] }) }), 'criar_conta')
      assert.equal(esquerda(174).ok, true)
      reprova(esquerda(173), /começa em x=169\.0, antes do começo do fio \(x=170\.0\)/)
    })
  })

  describe('mutação: +1 px (ou -1 px) numa borda, uma por vez, derruba o critério nos limites 8 e 1133', () => {
    const mutacoes = [
      ['D3-fio', 'a base da mensagem desce 1 px, em repouso', d3Fio, (g) => (g.campos[0].mensagens[0].bottom += 1), /em repouso: .*folga de 7\.0 px/],
      ['D3-fio', 'o fio sobe 1 px, em repouso', d3Fio, (g) => (g.campos[0].fio.top -= 1), /em repouso: .*folga de 7\.0 px/],
      ['D3-controle', 'a base do controle desce 1 px, em repouso', d3Controle, (g) => (g.campos[0].controle.bottom += 1), /em repouso: .*folga de 7\.0 px/],
      ['D3-controle', 'o topo da mensagem sobe 1 px, em repouso', d3Controle, (g) => (g.campos[0].mensagens[0].top -= 1), /em repouso: .*folga de 7\.0 px/],
      ['D3-anel', 'a direita do controle avança 1 px, em repouso', (d) => d3Anel(d), (g) => (g.campos[0].controle.right += 1), /em repouso: .*termina em x=1134\.0/],
      ['D3-anel', 'o fim do fio recua 1 px, em repouso', (d) => d3Anel(d), (g) => (g.campos[0].fio.right -= 1), /em repouso: .*termina em x=1133\.0, depois do fim do fio \(x=1132\.0\)/],
      ['D3-anel', 'o offset do anel +1 px (3 px de recuo): o anel cresce 1 px de cada lado', (d) => d3Anel(d), (g) => (g.campos[0].controle.outlineOffset = '3px'), /termina em x=1134\.0/],
      ['D3-anel', 'a largura do anel +1 px (3 px): o anel cresce 1 px de cada lado', (d) => d3Anel(d), (g) => (g.campos[0].controle.outlineWidth = '3px'), /termina em x=1134\.0/],
    ]
    for (const [regra, nome, criterio, mutar, padrao] of mutacoes) {
      it(`${regra}: ${nome}`, () => {
        const d = docD3()
        assert.equal(criterio(d, 'criar_conta').ok, true, 'a fixture estável tem de passar antes da mutação')
        mutar(d.geometria)
        reprova(criterio(d, 'criar_conta'), padrao)
      })
      it(`${regra}: ${nome}, depois do envio vazio`, () => {
        const d = docD3()
        mutar(d.envio.vazio.geometria)
        reprova(criterio(d, 'criar_conta'), /depois do envio vazio: /)
      })
    }

    it('o movimento contrário (1 px a mais de ar) passa', () => {
      const d = docD3()
      d.geometria.campos[0].mensagens[0].bottom -= 1
      d.geometria.campos[0].controle.bottom -= 1
      d.geometria.campos[0].controle.right -= 1
      for (const [, criterio] of CRITERIOS_DA_FOLGA) assert.equal(criterio(d, 'criar_conta').ok, true)
    })
  })

  describe('várias linhas: vale a pior, e a mensagem diz qual', () => {
    it('a segunda linha com a mensagem colada reprova e a primeira não é apontada', () => {
      const ruim = campoD3({ rotulo: 'Senha', mensagens: [mensagemD3({ bottom: 468 })] })
      const r = reprova(d3Fio(docD3({ repouso: geometriaD3({ campos: [campoD3(), ruim] }) }), 'criar_conta'), /campo 2 \(Senha\)/)
      assert.doesNotMatch(r.motivo, /campo 1/)
    })

    it('uma linha sem mensagem (o campo sem ajuda) não reprova nada', () => {
      const d = docD3({ repouso: geometriaD3({ campos: [campoD3(), campoD3({ mensagens: [] })] }) })
      for (const [, criterio] of CRITERIOS_DA_FOLGA) assert.equal(criterio(d, 'criar_conta').ok, true)
    })
  })

  describe('em 390 não se aplica (o desenho de 390 é de outro passo)', () => {
    for (const [regra, criterio] of CRITERIOS_DA_FOLGA) {
      it(`${regra} em 390 é "não aplicável" e passa, mesmo sem leitura`, () => {
        const r = criterio({ ...doc390 }, 'criar_conta')
        assert.equal(r.ok, true)
        assert.match(r.motivo, /não aplicável/)
        const comLeitura = criterio(docD3({ base: doc390, repouso: geometriaD3({ campos: [campoDeHoje()] }) }), 'criar_conta')
        assert.equal(comLeitura.ok, true)
      })
    }
  })

  describe('falha fechada', () => {
    for (const [regra, criterio] of CRITERIOS_DA_FOLGA) {
      describe(regra, () => {
        it('sem a leitura da geometria (em repouso ou depois do envio vazio) e sem a largura da janela', () => {
          reprova(criterio({ ...doc1440 }, 'criar_conta'), /sem a leitura da geometria/)
          const semRepouso = docD3()
          delete semRepouso.geometria
          reprova(criterio(semRepouso, 'criar_conta'), /em repouso: sem a leitura da geometria/)
          const semErro = docD3()
          semErro.envio = { vazio: {} }
          reprova(criterio(semErro, 'criar_conta'), /depois do envio vazio: sem a leitura da geometria/)
          const semEnvio = docD3()
          delete semEnvio.envio
          reprova(criterio(semEnvio, 'criar_conta'), /depois do envio vazio: sem a leitura da geometria/)
          assert.equal(criterio(undefined, 'criar_conta').ok, false)
          assert.equal(criterio({ clientWidth: 1425 }, 'criar_conta').ok, false)
        })

        it('a leitura sem campos (lista ausente, de outro tipo ou vazia)', () => {
          for (const campos of [undefined, 'campos', null, []]) {
            const d = docD3({ repouso: { campos, selects: [] } })
            reprova(criterio(d, 'criar_conta'), /em repouso: nenhuma linha de campo/)
          }
        })

        it('uma linha sem o retângulo do fio, do controle ou da mensagem', () => {
          const sem = (campo, padrao) => reprova(criterio(docD3({ repouso: geometriaD3({ campos: [campo] }) }), 'criar_conta'), padrao)
          if (regra !== 'D3-controle') {
            sem(campoD3({ fio: null }), /campo 1 \(Seu nome\): sem o retângulo do fio/)
            sem(campoD3({ fio: { top: Number.NaN } }), /sem o retângulo do fio/)
            sem(campoD3({ fio: { right: undefined } }), /sem o retângulo do fio/)
          }
          if (regra !== 'D3-fio') {
            sem(campoD3({ controle: null }), /campo 1 \(Seu nome\): sem o retângulo do controle/)
            sem(campoD3({ controle: { bottom: undefined } }), /sem o retângulo do controle/)
            sem(campoD3({ controle: { left: Number.NaN } }), /sem o retângulo do controle/)
          }
          if (regra !== 'D3-anel') {
            sem(campoD3({ mensagens: [mensagemD3({ top: undefined })] }), /ajuda "É o nome que a família vai ver\." sem retângulo/)
            sem(campoD3({ mensagens: [mensagemD3({ bottom: Number.NaN })] }), /sem retângulo/)
            sem(campoD3({ mensagens: [null] }), /sem retângulo/)
          }
        })

        it('a lista de mensagens de tipo errado', () => {
          const d = docD3({ repouso: geometriaD3({ campos: [campoD3({ mensagens: 'ajuda' })] }) })
          reprova(criterio(d, 'criar_conta'), /sem a leitura das mensagens/)
        })
      })
    }

    describe('nenhuma mensagem visível quando o estado exige uma', () => {
      const semMensagens = () => geometriaD3({ campos: [campoD3({ mensagens: [] })] })

      for (const [regra, criterio] of CRITERIOS_DA_FOLGA.filter(([nome]) => nome !== 'D3-anel')) {
        for (const caso of CASOS_COM_AJUDA) {
          it(`${regra} em ${caso}: sem a ajuda em repouso`, () => {
            reprova(criterio(docD3({ repouso: semMensagens() }), caso), /em repouso: nenhuma mensagem de ajuda visível/)
          })
        }
        for (const caso of CASOS_DE_FORMULARIO) {
          it(`${regra} em ${caso}: sem o erro depois do envio vazio`, () => {
            reprova(criterio(docD3({ erro: semMensagens() }), caso), /depois do envio vazio: nenhuma mensagem de erro visível/)
          })
        }
        it(`${regra}: só uma ajuda depois do envio vazio não basta (o estado exige o erro)`, () => {
          reprova(criterio(docD3({ erro: geometriaD3() }), 'criar_conta'), /nenhuma mensagem de erro visível/)
          reprova(criterio(docD3({ erro: geometriaD3({ campos: [campoD3({ mensagens: [mensagemD3({ tipo: 'status', texto: 'Enviamos.' })] })] }) }), 'recuperar_acesso'), /nenhuma mensagem de erro visível/)
        })
      }

      it('o Entrar, o Recuperar e a Conta em repouso não têm ajuda: sem mensagem passa; mas o erro depois do envio é exigido', () => {
        for (const [, criterio] of CRITERIOS_DA_FOLGA) {
          for (const caso of ['entrar', 'recuperar_acesso', 'conta']) {
            assert.equal(criterio(docD3({ repouso: semMensagens() }), caso).ok, true, caso)
          }
        }
      })

      it('um caso que o medidor não conhece exige só o erro depois do envio', () => {
        assert.equal(d3Fio(docD3({ repouso: semMensagens() }), 'outro_caso').ok, true)
        assert.equal(d3Fio(docD3({ erro: semMensagens() }), 'outro_caso').ok, false)
      })
    })

    describe('D3-anel: o anel precisa ter sido lido', () => {
      const comControle = (controle) => docD3({ repouso: geometriaD3({ campos: [campoD3({ controle })] }) })

      it('o controle não recebeu foco, ou não tem outline calculado', () => {
        reprova(d3Anel(comControle({ focou: false }), 'criar_conta'), /campo 1 \(Seu nome\): não recebeu foco/)
        reprova(d3Anel(comControle({ outlineStyle: 'none' }), 'criar_conta'), /sem outline/)
        reprova(d3Anel(comControle({ outlineStyle: '' }), 'criar_conta'), /sem outline/)
        reprova(d3Anel(comControle({ outlineStyle: undefined }), 'criar_conta'), /sem outline/)
      })

      it('largura ou offset do anel ilegível não deixa medir', () => {
        reprova(d3Anel(comControle({ outlineWidth: 'auto' }), 'criar_conta'), /largura ou offset do anel ilegível/)
        reprova(d3Anel(comControle({ outlineOffset: undefined }), 'criar_conta'), /largura ou offset do anel ilegível/)
        reprova(d3Anel(comControle({ outlineWidth: '0px' }), 'criar_conta'), /largura ou offset do anel ilegível|sem outline/)
      })
    })
  })

  describe('o avaliarCriterios roda os quatro e eles bloqueiam', () => {
    it('com a leitura certa, os três critérios de folga passam e bloqueiam, em cada tela de formulário', () => {
      for (const caso of CASOS_DE_FORMULARIO) {
        const doc = docD3({ repouso: geometriaD3({ selects: caso === 'comecar_seu_nome' || caso === 'conta' ? [selectD3()] : [] }) })
        const { criterios } = avaliarCriterios({ doc, nos: [], tema: 'claro' }, caso)
        for (const regra of ['D3-fio', 'D3-controle', 'D3-anel']) {
          const c = criterios.find((x) => x.regra === regra)
          assert.ok(c, `${caso}: falta ${regra}`)
          if (caso === 'criar_conta' || caso === 'comecar_seu_nome' || caso === 'conta' || caso === 'entrar' || caso === 'recuperar_acesso') assert.equal(c.ok, true, `${caso} ${regra}: ${c.motivo}`)
          assert.equal(c.bloqueia, true)
        }
      }
    })

    it('com o comportamento de hoje, o avaliarCriterios reprova os três com os números', () => {
      const doc = docD3({ repouso: geometriaD3({ campos: [campoDeHoje()] }), erro: geometriaD3({ campos: [campoDeHoje(erroD3())] }) })
      const { criterios } = avaliarCriterios({ doc, nos: [], tema: 'claro' }, 'criar_conta')
      assert.match(criterios.find((c) => c.regra === 'D3-fio').motivo, /folga de -2\.0 px/)
      assert.match(criterios.find((c) => c.regra === 'D3-controle').motivo, /folga de 7\.0 px/)
      assert.match(criterios.find((c) => c.regra === 'D3-anel').motivo, /x=1136\.8/)
    })

    it('sem leitura nenhuma, os quatro reprovam fechado', () => {
      const { criterios } = avaliarCriterios({ doc: doc1440, nos: [], tema: 'claro' }, 'conta')
      for (const regra of ['D3-fio', 'D3-controle', 'D3-anel', 'D3-fuso']) {
        const c = criterios.find((x) => x.regra === regra)
        assert.equal(c.ok, false, `${regra}: ${c.motivo}`)
      }
    })
  })
})

describe('D3-fuso: o select de fuso mostra nomes legíveis, sem "_"', () => {
  const comSelects = (selects, extra = {}) => docD3({ repouso: geometriaD3({ selects }), ...extra })
  const reprova = (r, padrao) => {
    assert.equal(r.ok, false, `devia reprovar: ${r.motivo}`)
    if (padrao) assert.match(r.motivo, padrao)
    return r
  }

  it('o select com nomes legíveis passa (Começar e Conta), nos dois temas', () => {
    for (const caso of ['comecar_seu_nome', 'conta']) {
      const r = d3Fuso(comSelects([selectD3()]), caso)
      assert.equal(r.ok, true, r.motivo)
      assert.equal(r.regra, 'D3-fuso')
    }
  })

  it('o comportamento de hoje reprova: "America/Sao_Paulo" na opção e no texto visível', () => {
    const hoje = selectD3({
      textoVisivel: 'America/Sao_Paulo',
      opcoes: [
        { valor: 'America/Sao_Paulo', texto: 'America/Sao_Paulo' },
        { valor: 'America/Manaus', texto: 'America/Manaus' },
        { valor: 'America/Campo_Grande', texto: 'America/Campo_Grande' },
      ],
    })
    const r = reprova(d3Fuso(comSelects([hoje]), 'comecar_seu_nome'), /select "Seu fuso": o texto visível "America\/Sao_Paulo" tem "_"/)
    assert.match(r.motivo, /2 de 3 opções com "_" \(a primeira: "America\/Sao_Paulo"\)/)
  })

  it('um "_" só numa opção da lista reprova, mesmo com o texto visível certo', () => {
    const s = selectD3({ opcoes: [...selectD3().opcoes, { valor: 'America/Los_Angeles', texto: 'America/Los_Angeles' }] })
    reprova(d3Fuso(comSelects([s]), 'conta'), /1 de 4 opções com "_" \(a primeira: "America\/Los_Angeles"\)/)
  })

  it('o `value` pode ter "_" (é o identificador IANA): só o texto conta', () => {
    const s = selectD3()
    assert.ok(s.opcoes.some((o) => o.valor.includes('_')))
    assert.equal(d3Fuso(comSelects([s]), 'conta').ok, true)
  })

  it('o "_" no texto visível, com a lista certa, reprova (o atual fora da lista)', () => {
    reprova(d3Fuso(comSelects([selectD3({ textoVisivel: 'Fora_Da_Lista (atual)' })]), 'conta'), /o texto visível "Fora_Da_Lista \(atual\)" tem "_"/)
  })

  it('opção sem texto, texto visível vazio ou select sem opções reprovam', () => {
    reprova(d3Fuso(comSelects([selectD3({ opcoes: [{ valor: 'UTC', texto: '' }, { valor: 'America/Manaus', texto: 'Manaus' }] })]), 'conta'), /1 de 2 opções sem texto/)
    reprova(d3Fuso(comSelects([selectD3({ opcoes: [{ valor: 'UTC', texto: '  ' }] })]), 'conta'), /opções sem texto/)
    reprova(d3Fuso(comSelects([selectD3({ textoVisivel: '' })]), 'conta'), /sem texto visível/)
    reprova(d3Fuso(comSelects([selectD3({ opcoes: [] })]), 'conta'), /sem opções/)
    reprova(d3Fuso(comSelects([selectD3({ opcoes: undefined })]), 'conta'), /sem a leitura das opções/)
    reprova(d3Fuso(comSelects([selectD3({ textoVisivel: undefined })]), 'conta'), /sem texto visível|texto visível ilegível/)
  })

  it('dois fusos diferentes com o mesmo texto reprovam (a lista inteira não se repete)', () => {
    const s = selectD3({ opcoes: [{ valor: 'America/Indiana/Vincennes', texto: 'Vincennes' }, { valor: 'America/Vincennes', texto: 'Vincennes' }] })
    reprova(d3Fuso(comSelects([s]), 'conta'), /"Vincennes" aparece em 2 opções/)
  })

  it('falha fechada: sem a leitura dos selects, sem nenhum select na tela de fuso, ou sem a leitura da geometria', () => {
    reprova(d3Fuso(docD3({ repouso: { campos: [campoD3()] } }), 'conta'), /sem a leitura dos selects/)
    reprova(d3Fuso(comSelects([]), 'comecar_seu_nome'), /nenhum select de fuso/)
    reprova(d3Fuso(comSelects([]), 'conta'), /nenhum select de fuso/)
    reprova(d3Fuso({ ...doc1440 }, 'conta'), /sem a leitura da geometria/)
    reprova(d3Fuso(undefined, 'conta'))
    reprova(d3Fuso(comSelects([null]), 'conta'), /select sem leitura/)
  })

  it('depois do envio vazio o select também é lido, se a leitura veio', () => {
    const ruim = selectD3({ textoVisivel: 'America/Sao_Paulo' })
    const d = docD3({ repouso: geometriaD3({ selects: [selectD3()] }), erro: geometriaD3({ selects: [ruim] }) })
    reprova(d3Fuso(d, 'conta'), /depois do envio vazio: select "Seu fuso"/)
  })

  it('nas outras telas não se aplica', () => {
    for (const caso of ['entrar', 'criar_conta', 'recuperar_acesso']) {
      const r = d3Fuso(docD3(), caso)
      assert.equal(r.ok, true)
      assert.match(r.motivo, /não aplicável/)
    }
  })

  it('vale também em 390: o texto do select não tem "_" em nenhuma largura', () => {
    reprova(d3Fuso(docD3({ base: doc390, repouso: geometriaD3({ selects: [selectD3({ textoVisivel: 'America/Sao_Paulo' })] }) }), 'conta'), /tem "_"/)
    assert.equal(d3Fuso(docD3({ base: doc390, repouso: geometriaD3({ selects: [selectD3()] }) }), 'conta').ok, true)
  })
})

describe('D3: a leitura em página da geometria dos campos (lerGeometriaDosCamposNaPagina)', () => {
  const CAMPOS = `
    <main><form>
      <div class="sb-campo" data-r="170,355,963,112">
        <label data-r="170,371,140,58">Seu nome</label>
        <div class="sb-campo-controle" data-r="476,371,657,58">
          <input class="sb-campo-entrada" value="Ana" data-r="476,374,653,52">
        </div>
        <p class="sb-campo-ajuda" data-r="476,434,653,24">É o nome que a família vai ver.</p>
        <p class="sb-campo-erro" data-r="476,434,653,24">   </p>
        <p class="sb-campo-status" data-oculta data-r="476,434,653,24">Escondida.</p>
      </div>
      <div class="sb-campo" data-r="170,467,963,112">
        <label data-r="170,483,140,58">Seu fuso</label>
        <div class="sb-campo-controle" data-select data-r="476,483,657,58">
          <select class="sb-campo-entrada" data-r="476,486,653,52">
            <option value="America/Sao_Paulo" selected>São Paulo (Brasília)</option>
            <option value="America/Manaus">Manaus</option>
          </select>
        </div>
        <p class="sb-campo-ajuda" data-r="476,546,653,24">Os horários aparecem neste fuso.</p>
      </div>
      <div class="sb-campo" data-r="0,0,0,0">
        <input class="sb-campo-entrada" data-r="0,0,0,0">
      </div>
    </form></main>`

  /** O jsdom não mede layout nem calcula estilo: `data-r` dá a caixa e o `getComputedStyle` é o da fixture. */
  function lerGeometria(html, { rolagem = 0, estilo = {} } = {}) {
    const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { runScripts: 'outside-only', virtualConsole: new VirtualConsole() })
    const { window } = dom
    window.Element.prototype.getBoundingClientRect = function retangulo() {
      const [x, y, w, h] = (this.getAttribute('data-r') ?? '0,0,100,20').split(',').map(Number)
      return { x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h }
    }
    window.getComputedStyle = (el) => ({
      outlineStyle: 'solid',
      outlineWidth: '2px',
      outlineOffset: '2px',
      borderBottomWidth: el.classList.contains('sb-campo') ? '1px' : '0px',
      visibility: 'visible',
      display: el.hasAttribute('data-oculta') ? 'none' : 'block',
      clip: 'auto',
      ...estilo,
    })
    if (rolagem) Object.defineProperty(window, 'scrollY', { configurable: true, value: rolagem })
    window.scrollTo = () => undefined
    try {
      return JSON.parse(JSON.stringify(window.eval(`(${lerGeometriaDosCamposNaPagina.toString()})()`)))
    } finally {
      window.close()
    }
  }

  it('devolve uma leitura por linha de campo visível: o fio (a borda de baixo), o controle e as mensagens à vista', () => {
    const { campos } = lerGeometria(CAMPOS)
    assert.equal(campos.length, 2, 'a linha de 0 x 0 (a caixa de diálogo fechada) não entra')
    const [nome] = campos
    assert.equal(nome.rotulo, 'Seu nome')
    assert.deepEqual(nome.fio, { top: 466, bottom: 467, left: 170, right: 1133 })
    assert.equal(nome.controle.tag, 'input')
    assert.deepEqual([nome.controle.top, nome.controle.bottom, nome.controle.left, nome.controle.right], [374, 426, 476, 1129])
    assert.equal(nome.mensagens.length, 1, 'a vazia e a escondida ficam de fora')
    assert.deepEqual(nome.mensagens[0], { tipo: 'ajuda', texto: 'É o nome que a família vai ver.', top: 434, bottom: 458, left: 476, right: 1129 })
  })

  it('foca cada controle e lê o anel dele (estilo, largura e offset), para o D3-anel medir o anel de cada um', () => {
    const { campos } = lerGeometria(CAMPOS)
    for (const campo of campos) {
      assert.equal(campo.controle.focou, true)
      assert.equal(campo.controle.outlineStyle, 'solid')
      assert.equal(campo.controle.outlineWidth, '2px')
      assert.equal(campo.controle.outlineOffset, '2px')
    }
  })

  it('lê o select (a opção escolhida e o texto de todas as opções com o valor) e o select é o controle da linha', () => {
    const { campos, selects } = lerGeometria(CAMPOS)
    assert.equal(campos[1].controle.tag, 'select')
    assert.equal(selects.length, 1)
    assert.deepEqual(selects[0], {
      rotulo: 'Seu fuso',
      valor: 'America/Sao_Paulo',
      textoVisivel: 'São Paulo (Brasília)',
      opcoes: [
        { valor: 'America/Sao_Paulo', texto: 'São Paulo (Brasília)' },
        { valor: 'America/Manaus', texto: 'Manaus' },
      ],
    })
  })

  it('as coordenadas são as da página: a rolagem entra no fio, no controle e na mensagem', () => {
    const { campos } = lerGeometria(CAMPOS, { rolagem: 100 })
    assert.equal(campos[0].fio.top, 566)
    assert.equal(campos[0].controle.top, 474)
    assert.equal(campos[0].mensagens[0].top, 534)
  })

  it('uma linha sem borda de baixo não tem fio (a regra falha fechado); sem controle, o controle é nulo', () => {
    const semBorda = lerGeometria(CAMPOS, { estilo: { borderBottomWidth: '0px' } })
    assert.equal(semBorda.campos[0].fio, null)
    const semControle = lerGeometria('<main><form><div class="sb-campo" data-r="170,355,963,112"><label>Seu nome</label></div></form></main>')
    assert.equal(semControle.campos[0].controle, null)
  })

  it('a leitura do anel vem do estilo calculado: sem outline, o D3-anel reprova o que o coletor leu', () => {
    const { campos } = lerGeometria(CAMPOS, { estilo: { outlineStyle: 'none', outlineWidth: '0px', outlineOffset: '0px' } })
    const doc = { ...doc1440, geometria: { campos, selects: [] }, envio: { vazio: { geometria: { campos, selects: [] } } } }
    assert.equal(d3Anel(doc, 'criar_conta').ok, false)
  })

  it('sem formulário, a leitura é vazia (e os critérios reprovam fechado: nenhuma linha de campo)', () => {
    assert.deepEqual(lerGeometria('<main><p>Só texto.</p></main>'), { campos: [], selects: [] })
  })

  it('não tem fechamento: serializada por toString, roda sozinha', () => {
    assert.match(lerGeometriaDosCamposNaPagina.toString(), /^(async )?function lerGeometriaDosCamposNaPagina/)
  })
})

// =============================================================================================
// MAT-44d-3, volta 3, defeito D5 (item 1): em 390 o erro do campo ficava apertado contra o que vem depois (0 px até o
// rótulo da linha seguinte, 8 px até o botão) e o anel de foco do campo era mais estreito que o campo (a entrada ocupa
// x 32–358 num campo de x 16–374, e o anel passa 4 px: 28–362). Dois critérios, só em 390:
//   D5-erro: com o erro à vista (depois do envio vazio), próximo.top - erro.bottom >= 16, onde `erro` é a caixa do
//            `.sb-campo-erro` e `próximo` é o primeiro elemento visível depois dele na página.
//   D5-anel: com o foco no controle, a caixa do anel (a do controle + outline-offset + outline-width, 2 + 2 px) é a
//            do campo: x de 16 a 374 (a área útil de 358 px), com 1 px de tolerância.
// =============================================================================================

describe('D5: o vão depois do erro e o anel igual ao campo, em 390', () => {
  const doc390real = { largura: 390, altura: 844, clientWidth: 390, scrollWidth: 390, grupos: [] }
  const reprova = (r, padrao) => {
    assert.equal(r.ok, false, `devia reprovar: ${r.motivo}`)
    if (padrao) assert.match(r.motivo, padrao)
    return r
  }

  // --- D5-erro -------------------------------------------------------------------------------
  /** O erro do e-mail (433 a 457) e o rótulo da senha a `vao1` px dele; o erro da senha (558 a 582) e o botão a `vao2`. */
  const errosD5 = ({ vao1 = 16, vao2 = 16 } = {}) => [
    { texto: 'Escreva o seu e-mail.', top: 433, bottom: 457, proximo: { descricao: 'LABEL Senha', top: 457 + vao1 } },
    { texto: 'Escreva a sua senha.', top: 558, bottom: 582, proximo: { descricao: 'BUTTON Entrar', top: 582 + vao2 } },
  ]
  const docD5Erro = (erros = errosD5(), base = doc390real) => ({ ...base, envio: { vazio: { erros } } })

  describe('D5-erro', () => {
    it('o estado de hoje reprova com os números: 0 px até o rótulo e 8 px até o botão', () => {
      const r = reprova(d5Erro(docD5Erro(errosD5({ vao1: 0, vao2: 8 }))), /o erro "Escreva o seu e-mail\." termina em y=457\.0 e LABEL Senha começa em y=457\.0: folga de 0\.0 px \(o mínimo é 16\)/)
      assert.match(r.motivo, /o erro "Escreva a sua senha\." termina em y=582\.0 e BUTTON Entrar começa em y=590\.0: folga de 8\.0 px/)
      assert.equal(r.regra, 'D5-erro')
      assert.equal(r.nos_com_falha.length, 2)
    })

    it('com 16 px depois de cada erro passa, e com mais também', () => {
      const r = d5Erro(docD5Erro())
      assert.equal(r.ok, true, r.motivo)
      assert.deepEqual(r.nos_com_falha, [])
      assert.equal(d5Erro(docD5Erro(errosD5({ vao1: 24, vao2: 40 }))).ok, true)
    })

    it('a borda: 16 passa, 15,75 passa (a tolerância é de 0,25) e 15,5 reprova', () => {
      assert.equal(d5Erro(docD5Erro(errosD5({ vao1: 15.75 }))).ok, true)
      reprova(d5Erro(docD5Erro(errosD5({ vao1: 15.5 }))), /folga de 15\.5 px/)
    })

    describe('mutação: 1 px em cada medida, uma por vez, derruba o critério no limite 16', () => {
      const mutacoes = [
        ['o próximo elemento sobe 1 px', (e) => (e[0].proximo.top -= 1), /folga de 15\.0 px/],
        ['o erro desce 1 px (a base)', (e) => (e[1].bottom += 1), /folga de 15\.0 px/],
      ]
      for (const [nome, mutar, padrao] of mutacoes) {
        it(nome, () => {
          const e = errosD5()
          assert.equal(d5Erro(docD5Erro(e)).ok, true, 'a fixture estável tem de passar antes da mutação')
          mutar(e)
          reprova(d5Erro(docD5Erro(e)), padrao)
        })
      }

      it('o movimento contrário (1 px a mais de folga) passa', () => {
        const e = errosD5()
        e[0].proximo.top += 1
        assert.equal(d5Erro(docD5Erro(e)).ok, true)
      })
    })

    it('lê o estado depois do envio vazio: a leitura de antes do envio não entra na conta', () => {
      const d = docD5Erro()
      d.envio.vazio.antes = { pagina: 1, erros: errosD5({ vao1: 0 }) }
      assert.equal(d5Erro(d).ok, true)
    })

    describe('largura', () => {
      it('de 768 para cima não se aplica (a mensagem mora dentro da linha de 112 px), mesmo com o vão de 0', () => {
        const r = d5Erro(docD5Erro(errosD5({ vao1: 0 }), doc1440))
        assert.equal(r.ok, true)
        assert.match(r.motivo, /não aplicável/)
      })

      it('abaixo de 768 e diferente de 390 reprova fechado: o critério só vale em 390', () => {
        for (const largura of [375, 360, 320, 767]) {
          reprova(d5Erro(docD5Erro(errosD5(), { ...doc390real, largura, clientWidth: largura })), new RegExp(`${largura} px.*só vale em 390`))
        }
      })
    })

    describe('falha fechada', () => {
      it('sem doc, sem a largura da janela ou sem a clientWidth', () => {
        assert.equal(d5Erro(undefined).ok, false)
        assert.equal(d5Erro({ clientWidth: 390 }).ok, false)
        assert.equal(d5Erro({ largura: 390 }).ok, false)
      })

      it('sem a leitura dos erros (sem envio, sem o vazio, sem `erros` ou `erros` que não é lista)', () => {
        reprova(d5Erro({ ...doc390real }), /sem a leitura dos erros/)
        reprova(d5Erro({ ...doc390real, envio: {} }), /sem a leitura dos erros/)
        reprova(d5Erro({ ...doc390real, envio: { vazio: {} } }), /sem a leitura dos erros/)
        reprova(d5Erro({ ...doc390real, envio: { vazio: { erros: 'x' } } }), /sem a leitura dos erros/)
        reprova(d5Erro({ ...doc390real, envio: { vazio: { erros: null } } }), /sem a leitura dos erros/)
      })

      it('sem erro visível: a lista vazia não é aprovação (o envio vazio tem de mostrar o erro)', () => {
        reprova(d5Erro(docD5Erro([])), /nenhum erro visível/)
      })

      it('sem próximo elemento (nulo, sem topo ou com topo ilegível)', () => {
        for (const proximo of [null, undefined, {}, { top: Number.NaN }, { top: '600' }, 'BUTTON']) {
          const e = errosD5()
          e[1].proximo = proximo
          reprova(d5Erro(docD5Erro(e)), /sem o próximo elemento/)
        }
      })

      it('o erro sem a caixa (topo ou base nulos, ilegíveis ou fora de ordem)', () => {
        for (const mudar of [(x) => delete x.bottom, (x) => (x.bottom = Number.NaN), (x) => (x.top = '433'), (x) => (x.bottom = undefined), (x) => (x.top = null)]) {
          const e = errosD5()
          mudar(e[0])
          reprova(d5Erro(docD5Erro(e)), /sem a caixa|ilegível/)
        }
      })

      it('um erro que falha entre erros que passam reprova o critério', () => {
        const e = errosD5()
        e[1].proximo.top = 590
        reprova(d5Erro(docD5Erro(e)), /BUTTON Entrar começa em y=590\.0/)
      })

      it('um item da lista que não é objeto reprova', () => {
        reprova(d5Erro(docD5Erro([null])), /sem a caixa|ilegível/)
      })
    })

    it('entra como critério bloqueante nas cinco telas, e o avaliarCriterios lê o depois do envio vazio', () => {
      for (const caso of ['entrar', 'criar_conta', 'recuperar_acesso', 'comecar_seu_nome', 'conta']) {
        const { criterios } = avaliarCriterios({ doc: docD5Erro(), nos: [], tema: 'claro' }, caso)
        const c = criterios.find((x) => x.regra === 'D5-erro')
        assert.ok(c, `falta D5-erro em ${caso}`)
        assert.equal(c.ok, true, c.motivo)
        assert.equal(c.bloqueia, true)
      }
      const hoje = avaliarCriterios({ doc: docD5Erro(errosD5({ vao1: 0, vao2: 8 })), nos: [], tema: 'claro' }, 'entrar')
      assert.match(hoje.criterios.find((x) => x.regra === 'D5-erro').motivo, /folga de 0\.0 px/)
      const sem = avaliarCriterios({ doc: { ...doc390real }, nos: [], tema: 'claro' }, 'entrar')
      assert.equal(sem.criterios.find((x) => x.regra === 'D5-erro').ok, false)
    })
  })

  // --- D5-anel -------------------------------------------------------------------------------
  /** O controle de 390: o `input` de 56 px a `recuo` px de cada lado do campo (x 16 a 374). Sem recuo, o anel é o campo. */
  const campoD5 = ({ esquerda = 20, direita = 370, controle, rotulo = 'E-mail' } = {}) =>
    campoD3({ fio: null, rotulo, mensagens: [], controle: controle === null ? null : { top: 372.5, bottom: 428.5, left: esquerda, right: direita, ...(controle ?? {}) } })
  const docD5Anel = ({ campos, erro, base = doc390real } = {}) =>
    docD3({ base, repouso: geometriaD3({ campos: campos ?? [campoD5()] }), erro: geometriaD3({ campos: erro ?? campos ?? [campoD5()] }) })

  describe('D5-anel', () => {
    it('o estado de hoje reprova com os números: a entrada em x 32–358 dá um anel de 28 a 362, 12 px mais estreito de cada lado', () => {
      const r = reprova(
        d5Anel(docD5Anel({ campos: [campoD5({ esquerda: 32, direita: 358 })] })),
        /o anel de foco começa em x=28\.0 e o campo em x=16\.0 \(12\.0 px para dentro; a tolerância é de 1\)/,
      )
      assert.match(r.motivo, /o anel de foco termina em x=362\.0 e o campo em x=374\.0 \(12\.0 px para dentro; a tolerância é de 1\)/)
      assert.equal(r.regra, 'D5-anel')
      assert.ok(r.nos_com_falha.length >= 2, 'em repouso e depois do envio vazio')
    })

    it('o anel igual ao campo (entrada em x 20–370, anel 16–374) passa nas duas leituras', () => {
      const r = d5Anel(docD5Anel())
      assert.equal(r.ok, true, r.motivo)
      assert.deepEqual(r.nos_com_falha, [])
    })

    it('a borda: 1 px de diferença passa, 1,25 reprova, e o anel que passa do campo também reprova', () => {
      const com = (esquerda, direita) => d5Anel(docD5Anel({ campos: [campoD5({ esquerda, direita })] }))
      assert.equal(com(21, 369).ok, true)
      assert.equal(com(19, 371).ok, true)
      reprova(com(21.25, 370), /começa em x=17\.3/)
      reprova(com(20, 368.75), /termina em x=372\.8/)
      reprova(com(18, 370), /começa em x=14\.0 e o campo em x=16\.0 \(2\.0 px para fora/)
      reprova(com(20, 372), /termina em x=376\.0 e o campo em x=374\.0 \(2\.0 px para fora/)
    })

    describe('mutação: 2 px em cada medida, uma por vez, derruba o critério', () => {
      const mutacoes = [
        ['a entrada começa 2 px à direita', { esquerda: 22 }, /começa em x=18\.0/],
        ['a entrada começa 2 px à esquerda', { esquerda: 18 }, /começa em x=14\.0/],
        ['a entrada termina 2 px à esquerda', { direita: 368 }, /termina em x=372\.0/],
        ['a entrada termina 2 px à direita', { direita: 372 }, /termina em x=376\.0/],
      ]
      for (const [nome, mudanca, padrao] of mutacoes) {
        it(nome, () => {
          assert.equal(d5Anel(docD5Anel()).ok, true, 'a fixture estável tem de passar antes da mutação')
          reprova(d5Anel(docD5Anel({ campos: [campoD5(mudanca)] })), padrao)
        })
      }
    })

    it('o anel vem da largura e do offset lidos (não de 4 px fixos): outline de 4 px com offset 2 sai 2 px do campo', () => {
      const largo = { outlineWidth: '4px', outlineOffset: '2px' }
      reprova(d5Anel(docD5Anel({ campos: [campoD5({ controle: largo })] })), /começa em x=14\.0 e o campo em x=16\.0 \(2\.0 px para fora/)
      assert.equal(d5Anel(docD5Anel({ campos: [campoD5({ esquerda: 22, direita: 368, controle: largo })] })).ok, true)
    })

    it('mede cada campo e cada estado: um campo fora entre campos certos reprova, e a mensagem diz qual', () => {
      const campos = [campoD5({ rotulo: 'E-mail' }), campoD5({ rotulo: 'Senha', direita: 314 })]
      const r = reprova(d5Anel(docD5Anel({ campos })), /campo 2 \(Senha\)/)
      assert.match(r.motivo, /termina em x=318\.0/)
      reprova(d5Anel(docD5Anel({ erro: campos, campos: [campoD5()] })), /depois do envio vazio: campo 2 \(Senha\)/)
    })

    describe('largura', () => {
      it('de 768 para cima não se aplica (o anel de 1440 é o do D3-anel, dentro do fio)', () => {
        const r = d5Anel(docD5Anel({ base: doc1440, campos: [campoD5({ esquerda: 480, direita: 1100 })] }))
        assert.equal(r.ok, true)
        assert.match(r.motivo, /não aplicável/)
      })

      it('abaixo de 768 e diferente de 390 reprova fechado: o critério só vale em 390', () => {
        for (const largura of [375, 360, 320, 767]) {
          reprova(d5Anel(docD5Anel({ base: { ...doc390real, largura, clientWidth: largura } })), new RegExp(`${largura} px.*só vale em 390`))
        }
      })
    })

    describe('falha fechada', () => {
      it('sem doc, sem a largura da janela ou sem a clientWidth', () => {
        assert.equal(d5Anel(undefined).ok, false)
        assert.equal(d5Anel({ clientWidth: 390 }).ok, false)
        assert.equal(d5Anel({ largura: 390 }).ok, false)
      })

      it('sem a leitura da geometria (em repouso ou depois do envio vazio)', () => {
        reprova(d5Anel({ ...doc390real }), /sem a leitura da geometria dos campos/)
        reprova(d5Anel({ ...doc390real, geometria: geometriaD3({ campos: [campoD5()] }) }), /depois do envio vazio: sem a leitura da geometria/)
      })

      it('sem linha de campo na leitura', () => {
        reprova(d5Anel(docD5Anel({ campos: [] })), /nenhuma linha de campo/)
      })

      it('o controle sem retângulo (nulo, sem lado ou ilegível) reprova', () => {
        reprova(d5Anel(docD5Anel({ campos: [campoD5({ controle: null })] })), /sem o retângulo do controle/)
        for (const lado of ['left', 'right', 'top', 'bottom']) {
          reprova(d5Anel(docD5Anel({ campos: [campoD5({ controle: { [lado]: Number.NaN } })] })), /sem o retângulo do controle/)
        }
      })

      it('o controle que não recebeu foco, sem outline ou com largura ou offset ilegível reprova', () => {
        reprova(d5Anel(docD5Anel({ campos: [campoD5({ controle: { focou: false } })] })), /não recebeu foco/)
        reprova(d5Anel(docD5Anel({ campos: [campoD5({ controle: { outlineStyle: 'none' } })] })), /sem outline/)
        reprova(d5Anel(docD5Anel({ campos: [campoD5({ controle: { outlineStyle: undefined } })] })), /sem outline/)
        reprova(d5Anel(docD5Anel({ campos: [campoD5({ controle: { outlineWidth: 'medium' } })] })), /largura ou offset do anel ilegível/)
        reprova(d5Anel(docD5Anel({ campos: [campoD5({ controle: { outlineOffset: undefined } })] })), /largura ou offset do anel ilegível/)
      })
    })

    it('entra como critério bloqueante nas cinco telas: passa com o anel igual ao campo e reprova com o de hoje', () => {
      for (const caso of ['entrar', 'criar_conta', 'recuperar_acesso', 'comecar_seu_nome', 'conta']) {
        const { criterios } = avaliarCriterios({ doc: docD5Anel(), nos: [], tema: 'claro' }, caso)
        const c = criterios.find((x) => x.regra === 'D5-anel')
        assert.ok(c, `falta D5-anel em ${caso}`)
        assert.equal(c.ok, true, c.motivo)
        assert.equal(c.bloqueia, true)
      }
      const hoje = avaliarCriterios({ doc: docD5Anel({ campos: [campoD5({ esquerda: 32, direita: 358 })] }), nos: [], tema: 'claro' }, 'entrar')
      assert.match(hoje.criterios.find((x) => x.regra === 'D5-anel').motivo, /começa em x=28\.0/)
    })
  })

  describe('a leitura em página dos erros de campo (lerErrosDeCampoNaPagina)', () => {
    /** O jsdom não mede layout: `data-r="x,y,w,h"` dá a caixa; o display vem do `style` do elemento. */
    function lerErros(html, { rolagem = 0 } = {}) {
      const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { runScripts: 'outside-only', virtualConsole: new VirtualConsole() })
      const { window } = dom
      const caixa = (el) => {
        const [x, y, w, h] = (el.getAttribute('data-r') ?? '0,0,100,20').split(',').map(Number)
        return { x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h }
      }
      window.Element.prototype.getBoundingClientRect = function retangulo() {
        return caixa(this)
      }
      // O Range do texto de um elemento em linha: a caixa de `data-rt` (o texto), e não a do elemento com o recuo.
      window.Range.prototype.getBoundingClientRect = function retanguloDoTexto() {
        const dono = this.commonAncestorContainer.nodeType === 1 ? this.commonAncestorContainer : this.commonAncestorContainer.parentElement
        const [x, y, w, h] = (dono.getAttribute('data-rt') ?? dono.getAttribute('data-r') ?? '0,0,0,0').split(',').map(Number)
        return { x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h }
      }
      if (rolagem) Object.defineProperty(window, 'scrollY', { configurable: true, value: rolagem })
      try {
        return JSON.parse(JSON.stringify(window.eval(`(${lerErrosDeCampoNaPagina.toString()})()`)))
      } finally {
        window.close()
      }
    }

    const FORM = `
      <main><form>
        <div class="sb-campo" data-r="16,332,358,101"><label data-r="16,332,358,29">E-mail</label>
          <div class="sb-campo-controle" data-r="16,369,358,64"><input data-r="32,372,326,56"></div>
          <p class="sb-campo-erro" data-r="16,433,358,24">Escreva o seu e-mail.</p></div>
        <div class="sb-campo" data-r="16,497,358,101"><label data-r="16,497,358,29">Senha</label>
          <div class="sb-campo-controle" data-r="16,534,358,64"><input data-r="32,537,326,56"><button type="button" data-r="314,543,44,44">Ver</button></div>
          <p class="sb-campo-erro" data-r="16,598,358,24">Escreva a sua senha.</p></div>
        <button type="submit" data-r="16,638,358,64">Entrar</button>
      </form></main>`

    it('devolve, por erro visível, a caixa (topo e base) e o primeiro elemento visível depois dele, com o topo', () => {
      const { erros } = lerErros(FORM)
      assert.equal(erros.length, 2)
      assert.deepEqual(erros[0], { texto: 'Escreva o seu e-mail.', top: 433, bottom: 457, proximo: { descricao: 'LABEL Senha', top: 497 } })
      assert.deepEqual(erros[1], { texto: 'Escreva a sua senha.', top: 598, bottom: 622, proximo: { descricao: 'BUTTON Entrar', top: 638 } })
    })

    it('as coordenadas são as da página: somam a rolagem', () => {
      const { erros } = lerErros(FORM, { rolagem: 50 })
      assert.equal(erros[0].top, 483)
      assert.equal(erros[0].proximo.top, 547)
    })

    it('o elemento acima do erro (o controle da mesma linha) não é o próximo', () => {
      const { erros } = lerErros(FORM)
      assert.notEqual(erros[1].proximo.descricao, 'BUTTON Ver')
      assert.notEqual(erros[1].proximo.descricao, 'INPUT')
    })

    it('uma ligação em linha vale pelo texto, e não pela caixa com o recuo vertical (o aceite dos termos)', () => {
      const html = `<main><form>
        <div class="sb-campo" data-r="16,332,358,101"><p class="sb-campo-erro" data-r="16,433,358,24">Escreva o seu e-mail.</p></div>
        <p data-r="16,481,358,48"><a style="display: inline" data-r="16,461,300,60" data-rt="16,483,300,24">Li os termos</a></p>
      </form></main>`
      const { erros } = lerErros(html)
      assert.equal(erros[0].proximo.top, 481, 'o parágrafo (481) é o próximo, e a ligação vale pelo texto (483), nunca pela caixa com recuo (461)')
    })

    it('ignora a mensagem vazia ou escondida e a ajuda; sem erro visível a lista é vazia (o critério reprova fechado)', () => {
      const html = `<main><form>
        <p class="sb-campo-erro" data-r="0,100,400,24">   </p>
        <p class="sb-campo-erro" style="visibility: hidden" data-r="0,200,400,24">Escondida.</p>
        <p class="sb-campo-erro" style="display: none" data-r="0,300,400,24">Escondida.</p>
        <p class="sb-campo-erro" data-r="0,400,1,1">Fina demais.</p>
        <p class="sb-campo-ajuda" data-r="0,500,400,24">Ajuda.</p>
      </form></main>`
      assert.deepEqual(lerErros(html).erros, [])
    })

    it('sem elemento depois do erro, o próximo é nulo (o critério reprova fechado)', () => {
      const { erros } = lerErros('<main><form><p class="sb-campo-erro" data-r="0,900,400,24">Escreva.</p></form></main>')
      assert.equal(erros.length, 1)
      assert.equal(erros[0].proximo, null)
    })

    it('não tem fechamento: serializada por toString, roda sozinha', () => {
      assert.match(lerErrosDeCampoNaPagina.toString(), /^(async )?function lerErrosDeCampoNaPagina/)
    })
  })
})

// =============================================================================================
// MAT-44d-3, volta 3, item 3: o índice da Conta (1440) ficava a ≈ 12 px do fio da abertura, e a caixa de toque da última âncora
// (44 px, 56 na madrugada) chegava ao fio. Critério A-2b, só 1440, no topo da página:
//   fio.top - (base do texto da última âncora) >= 16      (o texto: Range do texto do `<a>`, não a caixa de toque)
//   base da caixa de toque da última âncora <= fio.top    (a caixa de toque não passa do fio)
// O fio é a borda de baixo do `.sb-abertura-base` (o que fecha a abertura, em y=322 em 1440).
// =============================================================================================

describe('A-2b: 16 px entre o texto da última âncora do índice e o fio da abertura (1440)', () => {
  const FIO_Y = 322
  const reprova = (r, padrao) => {
    assert.equal(r.ok, false, `devia reprovar: ${r.motivo}`)
    if (padrao) assert.match(r.motivo, padrao)
    return r
  }
  const fio = (extra = {}) =>
    criar({ tag: 'div', texto: '', rect: { x: 16, y: FIO_Y, w: 1393, h: 1 }, estilo: { borderBottomWidth: '1px' }, m: { aberturaBase: true }, ...extra })
  /**
   * As 6 âncoras do índice na coluna lateral, de 32 em 32, com o texto de 20 px de altura (a base da última a `folga` px do fio) e a
   * caixa de toque (`alvo` de altura) centrada no texto. Com folga 12 e alvo 44, a caixa chega ao fio (base em y=322, 0 px): o de hoje.
   */
  const indice = ({ folga = 20, alvo = 44, fioY = FIO_Y, ajuste = () => ({}) } = {}) => {
    const baseDaUltima = fioY - folga
    return Array.from({ length: 6 }, (_, i) => {
      const base = baseDaUltima - (5 - i) * 32
      const centro = base - 10
      return criar({
        tag: 'a',
        texto: `Seção ${i + 1}`,
        rect: { x: 1165, y: centro - alvo / 2, w: 120, h: alvo },
        rectTexto: { x: 1165, y: base - 20, w: 80, h: 20 },
        m: { ancoraLateral: true },
        ...ajuste(i),
      })
    })
  }
  const pagina = (opcoes = {}) => [...indice(opcoes), fio({ rect: { x: 16, y: opcoes.fioY ?? FIO_Y, w: 1393, h: 1 } })]

  it('o estado de hoje reprova com os números: a base do texto em y=310, o fio em y=322 (folga de 12)', () => {
    const r = reprova(a2b(pagina({ folga: 12 }), doc1440), /o texto da última âncora \(a "Seção 6"\) termina em y=310\.0 e o fio da abertura começa em y=322\.0: folga de 12\.0 px \(o mínimo é 16\)/)
    assert.equal(r.regra, 'A-2b')
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('o estado de hoje tem a caixa de toque encostada no fio (0 px): isso passa, é o que o líder pediu para manter (≤ 0)', () => {
    const nos = pagina({ folga: 12 })
    const ultima = nos[5]
    assert.equal(ultima.rect.y + ultima.rect.h, FIO_Y, 'a fixture de hoje: a caixa de toque termina no fio')
    assert.doesNotMatch(a2b(nos, doc1440).motivo, /caixa de toque/)
  })

  it('corrigido (20 px de folga) passa, no claro (alvo de 44) e na madrugada (56)', () => {
    for (const alvo of [44, 56]) {
      const r = a2b(pagina({ alvo }), doc1440)
      assert.equal(r.ok, true, `${alvo}: ${r.motivo}`)
      assert.deepEqual(r.nos_com_falha, [])
    }
  })

  it('a borda: 16 passa, 15,75 passa (a tolerância é de 0,25) e 15,5 reprova', () => {
    assert.equal(a2b(pagina({ folga: 16 }), doc1440).ok, true)
    assert.equal(a2b(pagina({ folga: 15.75 }), doc1440).ok, true)
    reprova(a2b(pagina({ folga: 15.5 }), doc1440), /folga de 15\.5 px/)
    assert.equal(a2b(pagina({ folga: 40 }), doc1440).ok, true)
  })

  describe('mutação: 1 px em cada medida, uma por vez, derruba o critério nos limites 16 (texto) e 0 (caixa de toque)', () => {
    it('o fio sobe 1 px (folga 17 -> 16 passa; 16 -> 15 reprova)', () => {
      assert.equal(a2b([...indice({ folga: 16 }), fio({ rect: { x: 16, y: FIO_Y, w: 1393, h: 1 } })], doc1440).ok, true, 'a fixture de 16 passa antes da mutação')
      reprova(a2b([...indice({ folga: 16 }), fio({ rect: { x: 16, y: FIO_Y - 1, w: 1393, h: 1 } })], doc1440), /folga de 15\.0 px/)
    })

    it('o texto da última âncora desce 1 px reprova', () => {
      const nos = pagina({ folga: 16 })
      assert.equal(a2b(nos, doc1440).ok, true)
      nos[5].rectTexto = { ...nos[5].rectTexto, y: nos[5].rectTexto.y + 1 }
      reprova(a2b(nos, doc1440), /folga de 15\.0 px/)
    })

    it('a caixa de toque desce 1 px: de 0 px de sobreposição (passa) a 1 px (reprova, e o texto segue com folga)', () => {
      // Madrugada (56): com 18 px de folga a base do alvo termina exatamente no fio.
      const nos = pagina({ folga: 18, alvo: 56 })
      assert.equal(nos[5].rect.y + nos[5].rect.h, FIO_Y)
      assert.equal(a2b(nos, doc1440).ok, true)
      nos[5].rect = { ...nos[5].rect, y: nos[5].rect.y + 1 }
      reprova(a2b(nos, doc1440), /a caixa de toque da última âncora \(a "Seção 6"\) termina em y=323\.0 e o fio da abertura começa em y=322\.0: passa 1\.0 px do fio/)
    })

    it('o movimento contrário (1 px a mais de ar) passa', () => {
      assert.equal(a2b(pagina({ folga: 17 }), doc1440).ok, true)
    })
  })

  it('a caixa de toque que passa do fio reprova mesmo com o texto folgado: madrugada, 16 px de folga e alvo de 56 (passa 2 px)', () => {
    const r = reprova(a2b(pagina({ folga: 16, alvo: 56 }), doc1440), /a caixa de toque da última âncora \(a "Seção 6"\) termina em y=324\.0 e o fio da abertura começa em y=322\.0: passa 2\.0 px do fio/)
    assert.doesNotMatch(r.motivo, /folga de/)
  })

  it('texto e caixa de toque reprovando juntos listam os dois números', () => {
    const r = reprova(a2b(pagina({ folga: 8, alvo: 56 }), doc1440), /folga de 8\.0 px/)
    assert.match(r.motivo, /passa 10\.0 px do fio/)
  })

  it('a última âncora é a de maior y, não a última do vetor', () => {
    const nos = pagina({ folga: 20 })
    const embaralhado = [nos[3], nos[5], nos[0], nos[6], nos[1], nos[4], nos[2]]
    assert.equal(a2b(embaralhado, doc1440).ok, true)
    // A de baixo com o texto colado no fio reprova, esteja onde estiver no vetor.
    const colada = pagina({ folga: 12 })
    reprova(a2b([colada[5], ...colada.slice(0, 5), colada[6]], doc1440), /folga de 12\.0 px/)
  })

  it('só a última âncora conta: uma de cima colada no fio não reprova', () => {
    const nos = pagina({ folga: 20, ajuste: (i) => (i === 2 ? { rectTexto: { x: 1165, y: 300, w: 80, h: 20 } } : {}) })
    assert.equal(a2b(nos, doc1440).ok, true)
  })

  it('o fio é o do `.sb-abertura-base` (a borda de baixo da caixa de 1 px), não a borda de cima nem a base da caixa', () => {
    // Fio de 1 px em y=322: o topo é 322. Uma caixa mais alta com a borda de baixo de 1 px tem o topo da borda em y + h - 1.
    const alto = [...indice({ folga: 16 }), fio({ rect: { x: 16, y: 290, w: 1393, h: 33 } })]
    assert.equal(a2b(alto, doc1440).ok, true, 'a borda de baixo de 1 px de uma caixa de y=290 a 323 começa em 322')
    // Uma borda de baixo de 2 px (de 321 a 323) começa em 321: o topo do fio sobe 1 px e a folga de 16 vira 15.
    const dois = [...indice({ folga: 16 }), fio({ rect: { x: 16, y: 321, w: 1393, h: 2 }, estilo: { borderBottomWidth: '2px' } })]
    reprova(a2b(dois, doc1440), /o fio da abertura começa em y=321\.0: folga de 15\.0 px/)
  })

  describe('largura', () => {
    it('abaixo de 992 não se aplica (o índice em linha de 390 tem o A-2 de espaço entre textos), mesmo sem leitura', () => {
      for (const d of [doc390, { ...doc1440, largura: 991 }, { ...doc1440, largura: 767 }]) {
        const r = a2b(pagina({ folga: 0 }), d)
        assert.equal(r.ok, true)
        assert.match(r.motivo, /não aplicável/)
      }
      assert.match(a2b([], doc390).motivo, /não aplicável/)
    })

    it('992 já é 1440: sem a leitura, reprova', () => {
      reprova(a2b([], { ...doc1440, largura: 992 }), /nenhuma âncora/)
    })
  })

  describe('falha fechada', () => {
    it('sem doc, sem a largura da janela ou sem a clientWidth', () => {
      assert.equal(a2b(pagina(), undefined).ok, false)
      assert.equal(a2b(pagina(), {}).ok, false)
      assert.equal(a2b(pagina(), { largura: 1440 }).ok, false)
    })

    it('sem nenhuma âncora do índice (lista vazia, ausente ou só âncoras invisíveis)', () => {
      reprova(a2b([fio()], doc1440), /nenhuma âncora do índice/)
      reprova(a2b(undefined, doc1440), /nenhuma âncora do índice/)
      reprova(a2b([...indice().map((n) => ({ ...n, visivel: false })), fio()], doc1440), /nenhuma âncora do índice/)
    })

    it('sem o retângulo do texto da última âncora (ausente, vazio, ilegível ou com altura nula)', () => {
      for (const rectTexto of [undefined, null, {}, { x: 1, y: Number.NaN, w: 10, h: 10 }, { x: 1, y: 300, w: 10 }, { x: 1, y: '300', w: 10, h: 20 }]) {
        const nos = pagina()
        nos[5] = { ...nos[5], rectTexto }
        reprova(a2b(nos, doc1440), /sem o retângulo do texto da última âncora/)
      }
    })

    it('o texto de uma âncora de cima sem retângulo não esconde a última: mede a última', () => {
      const nos = pagina({ folga: 12, ajuste: (i) => (i === 1 ? { rectTexto: undefined } : {}) })
      reprova(a2b(nos, doc1440), /folga de 12\.0 px/)
    })

    it('uma âncora sem retângulo de caixa (a de baixo) reprova, e não deixa outra virar a última', () => {
      const nos = pagina({ folga: 20 })
      nos[5] = { ...nos[5], rect: undefined }
      reprova(a2b(nos, doc1440), /âncora sem o retângulo/)
      const ilegivel = pagina({ folga: 20 })
      ilegivel[5] = { ...ilegivel[5], rect: { x: 1, y: Number.NaN, w: 1, h: 1 } }
      reprova(a2b(ilegivel, doc1440), /âncora sem o retângulo/)
    })

    it('sem o fio da abertura (nenhum `.sb-abertura-base`, invisível ou sem retângulo)', () => {
      reprova(a2b(indice(), doc1440), /nenhum fio da abertura/)
      reprova(a2b([...indice(), fio({ visivel: false })], doc1440), /nenhum fio da abertura/)
      reprova(a2b([...indice(), fio({ rect: undefined })], doc1440), /nenhum fio da abertura/)
      reprova(a2b([...indice(), fio({ rect: { x: 0, y: Number.NaN, w: 1, h: 1 } })], doc1440), /nenhum fio da abertura/)
      reprova(a2b([...indice(), criar({ tag: 'div', texto: '', rect: { x: 16, y: FIO_Y, w: 1393, h: 1 }, estilo: { borderBottomWidth: '1px' } })], doc1440), /nenhum fio da abertura/)
    })

    it('o fio sem a espessura da borda de baixo lida (ausente, nula, "auto" ou ilegível)', () => {
      for (const borderBottomWidth of [undefined, '0px', 'auto', 'fino', '']) {
        reprova(a2b([...indice(), fio({ estilo: { borderBottomWidth } })], doc1440), /fio da abertura sem a borda de baixo lida/)
      }
    })
  })

  describe('dentro do avaliarCriterios', () => {
    it('a Conta soma o A-2b como critério bloqueante, logo depois do A-2; passa com a leitura certa e reprova com a de hoje', () => {
      const bom = avaliarCriterios({ doc: doc1440, nos: pagina(), tema: 'claro' }, 'conta')
      const c = bom.criterios.find((x) => x.regra === 'A-2b')
      assert.ok(c, 'falta A-2b na Conta')
      assert.equal(c.ok, true, c.motivo)
      assert.equal(c.bloqueia, true)
      const ids = bom.criterios.map((x) => x.regra)
      assert.equal(ids.indexOf('A-2b'), ids.indexOf('A-2') + 1)
      const hoje = avaliarCriterios({ doc: doc1440, nos: pagina({ folga: 12 }), tema: 'claro' }, 'conta')
      assert.match(hoje.criterios.find((x) => x.regra === 'A-2b').motivo, /folga de 12\.0 px/)
      const madrugada = avaliarCriterios({ doc: doc1440, nos: pagina({ alvo: 56 }), tema: 'madrugada' }, 'conta')
      assert.equal(madrugada.criterios.find((x) => x.regra === 'A-2b').ok, true)
    })

    it('só a Conta tem o A-2b: as telas de acesso não o têm', () => {
      for (const caso of ['entrar', 'criar_conta', 'recuperar_acesso', 'comecar_seu_nome']) {
        assert.equal(criteriosDoCaso(caso).includes('A-2b'), false, caso)
      }
    })
  })

  it('o coletor marca o fio da abertura (`.sb-abertura-base`) para o critério achá-lo, e só ele', () => {
    const { nos } = coletarDe('<main><section class="sb-abertura" data-bloco><h1>Conta</h1><div class="sb-abertura-base" aria-hidden="true"></div></section><p>Outro</p></main>')
    const marcados = nos.filter((n) => n.m.aberturaBase)
    assert.equal(marcados.length, 1)
    assert.equal(marcados[0].tag, 'div')
    assert.equal(marcados[0].estilo.borderBottomWidth !== undefined, true, 'o estilo da borda de baixo vem junto')
  })
})

// =============================================================================================
// MAT-44d-3, volta 3, item 4 (D6-selecao): a seleção de texto nas telas de acesso e na Conta usava o azul padrão do navegador, fora da
// paleta. Decisão do líder: `::selection` com a paleta (variáveis de uso do tema), sem azul e sem amarelo. Critério, nas cinco telas, em
// qualquer largura e nos dois temas (a madrugada onde a tela tem): `getComputedStyle(el, '::selection')` (`backgroundColor` e `color`) de um
// elemento do corpo (um parágrafo do `main`) e de um `input`: o fundo tem alfa > 0 (o padrão do navegador reporta `rgba(0, 0, 0, 0)`) e o
// contraste do texto sobre o fundo da seleção é >= 4,5 (AA), pelas funções que o medidor já tem (`parseCor`, `contraste`).
// =============================================================================================

describe('D6-selecao: a seleção de texto é da paleta e tem contraste AA', () => {
  const reprova = (r, padrao) => {
    assert.equal(r.ok, false, `devia reprovar: ${r.motivo}`)
    if (padrao) assert.match(r.motivo, padrao)
    return r
  }
  // A paleta do dia: o urucum (--cor-destaque, #B0401C) com o texto sobre ele (--cor-sobre-destaque, #FFF8EE); a da madrugada: #C47055 e #17120E.
  const URUCUM_DIA = { backgroundColor: 'rgb(176, 64, 28)', color: 'rgb(255, 248, 238)' }
  const URUCUM_MADRUGADA = { backgroundColor: 'rgb(196, 112, 85)', color: 'rgb(23, 18, 14)' }
  const PADRAO_DO_NAVEGADOR = { backgroundColor: 'rgba(0, 0, 0, 0)', color: 'rgb(26, 21, 17)' }
  const leitura = (tag, selecao = URUCUM_DIA, extra = {}) => ({
    tag,
    texto: tag === 'input' ? '' : 'Use o e-mail e a senha.',
    rect: { x: 16, y: 148, w: 358, h: 43 },
    selecao: selecao === null ? null : { ...selecao },
    cadeia: ['rgba(0, 0, 0, 0)', 'rgb(246, 239, 227)'],
    ...extra,
  })
  const docSel = ({ corpo, controle, base = doc1440 } = {}) => ({ ...base, selecao: { corpo: corpo === undefined ? leitura('p') : corpo, controle: controle === undefined ? leitura('input') : controle } })

  it('o padrão do navegador reprova: o fundo da seleção é transparente (rgba(0, 0, 0, 0)), no corpo e no input', () => {
    const r = reprova(
      d6Selecao(docSel({ corpo: leitura('p', PADRAO_DO_NAVEGADOR), controle: leitura('input', PADRAO_DO_NAVEGADOR) })),
      /o corpo: o fundo da seleção é transparente \(rgba\(0, 0, 0, 0\)\): o padrão do navegador, sem `::selection` da paleta/,
    )
    assert.match(r.motivo, /o input: o fundo da seleção é transparente/)
    assert.equal(r.regra, 'D6-selecao')
    assert.equal(r.nos_com_falha.length, 2)
  })

  it('a paleta passa: o urucum com o texto sobre ele, no dia (5,5:1) e na madrugada, no corpo e no input', () => {
    for (const selecao of [URUCUM_DIA, URUCUM_MADRUGADA]) {
      const r = d6Selecao(docSel({ corpo: leitura('p', selecao), controle: leitura('input', selecao) }))
      assert.equal(r.ok, true, r.motivo)
      assert.deepEqual(r.nos_com_falha, [])
    }
  })

  it('o motivo da aprovação traz os valores lidos e o contraste, para o JSON mostrar o que foi lido', () => {
    const r = d6Selecao(docSel())
    assert.match(r.motivo, /corpo: fundo rgb\(176, 64, 28\), texto rgb\(255, 248, 238\), contraste \d\.\d{2}:1/)
    assert.match(r.motivo, /input: fundo rgb\(176, 64, 28\)/)
  })

  describe('a borda do contraste: 4,5 passa e 4,4 reprova (texto branco sobre cinza: #767676 dá 4,54 e #777777 dá 4,48)', () => {
    const branco = 'rgb(255, 255, 255)'
    const com = (fundo) => d6Selecao(docSel({ corpo: leitura('p', { backgroundColor: fundo, color: branco }), controle: leitura('input') }))

    it('4,54 passa e 4,48 reprova, com o número na mensagem', () => {
      assert.equal(com('rgb(118, 118, 118)').ok, true)
      reprova(com('rgb(119, 119, 119)'), /o corpo: contraste de 4\.48:1 entre o texto rgb\(255, 255, 255\) e o fundo rgb\(119, 119, 119\) da seleção \(o mínimo é 4\.5\)/)
    })

    it('mutação: 1 nível de cinza no fundo flipa o veredito (118 passa, 119 reprova, 117 passa), nos dois elementos', () => {
      for (const nivel of [100, 117, 118]) assert.equal(com(`rgb(${nivel}, ${nivel}, ${nivel})`).ok, true, String(nivel))
      for (const nivel of [119, 120, 140, 200]) reprova(com(`rgb(${nivel}, ${nivel}, ${nivel})`))
      const noInput = d6Selecao(docSel({ corpo: leitura('p'), controle: leitura('input', { backgroundColor: 'rgb(119, 119, 119)', color: branco }) }))
      reprova(noInput, /o input: contraste de 4\.48:1/)
    })
  })

  it('só um dos dois reprova: o corpo certo e o input no padrão (e o contrário) reprovam, apontando o que falhou', () => {
    const r1 = reprova(d6Selecao(docSel({ controle: leitura('input', PADRAO_DO_NAVEGADOR) })), /o input: o fundo da seleção é transparente/)
    assert.doesNotMatch(r1.motivo, /o corpo:/)
    assert.equal(r1.nos_com_falha.length, 1)
    const r2 = reprova(d6Selecao(docSel({ corpo: leitura('p', PADRAO_DO_NAVEGADOR) })), /o corpo: o fundo da seleção é transparente/)
    assert.doesNotMatch(r2.motivo, /o input:/)
  })

  it('o fundo translúcido compõe sobre o fundo do elemento antes do contraste (alfa 0,5 de urucum sobre o papel clareia e reprova com o texto claro)', () => {
    const translucido = { backgroundColor: 'rgba(176, 64, 28, 0.5)', color: 'rgb(255, 248, 238)' }
    const r = reprova(d6Selecao(docSel({ corpo: leitura('p', translucido) })), /o corpo: contraste de \d\.\d{2}:1/)
    assert.match(r.motivo, /\(o mínimo é 4\.5\)/)
    // O mesmo urucum opaco passa: a regra compôs a translucidez, não a ignorou.
    assert.equal(d6Selecao(docSel()).ok, true)
  })

  it('o fundo translúcido sem cadeia de fundos opaca reprova fechado (não há como compor)', () => {
    reprova(d6Selecao(docSel({ corpo: leitura('p', { backgroundColor: 'rgba(176, 64, 28, 0.5)', color: 'rgb(255, 248, 238)' }, { cadeia: ['rgba(0, 0, 0, 0)'] }) })), /sem como calcular o contraste/)
    reprova(d6Selecao(docSel({ corpo: leitura('p', { backgroundColor: 'rgba(176, 64, 28, 0.5)', color: 'rgb(255, 248, 238)' }, { cadeia: undefined }) })), /sem como calcular o contraste/)
  })

  describe('falha fechada', () => {
    it('sem doc, sem a largura da janela ou sem a clientWidth', () => {
      assert.equal(d6Selecao(undefined).ok, false)
      assert.equal(d6Selecao({ clientWidth: 1425 }).ok, false)
      assert.equal(d6Selecao({ largura: 1440 }).ok, false)
    })

    it('sem a leitura da seleção (doc.selecao ausente, nula ou de outro tipo)', () => {
      for (const selecao of [undefined, null, 'x', 42]) reprova(d6Selecao({ ...doc1440, selecao }), /sem a leitura da seleção \(doc\.selecao\)/)
    })

    it('sem o elemento do corpo ou sem o input (nulo ou ausente): a tela tem de ter os dois', () => {
      reprova(d6Selecao(docSel({ corpo: null })), /o corpo: sem a leitura do elemento \(nenhum parágrafo visível no main\)/)
      reprova(d6Selecao(docSel({ controle: null })), /o input: sem a leitura do elemento \(nenhum input visível no main\)/)
      reprova(d6Selecao({ ...doc1440, selecao: { corpo: leitura('p') } }), /o input: sem a leitura do elemento/)
    })

    it('o elemento sem retângulo (ausente, vazio, ilegível ou de largura ou altura nula) reprova', () => {
      for (const rect of [undefined, null, {}, { x: 1, y: Number.NaN, w: 10, h: 10 }, { x: 0, y: 0, w: 0, h: 20 }, { x: 0, y: 0, w: 20, h: 0 }, { x: 0, y: 0, w: '20', h: 20 }]) {
        reprova(d6Selecao(docSel({ corpo: leitura('p', URUCUM_DIA, { rect }) })), /o corpo: sem o retângulo do elemento/)
      }
    })

    it('sem o estilo da seleção lido (nulo, vazio, sem fundo ou sem cor, de tipo errado) reprova', () => {
      for (const selecao of [null, undefined, {}, { color: 'rgb(255, 248, 238)' }, { backgroundColor: 'rgb(176, 64, 28)' }, { backgroundColor: 42, color: 'rgb(0, 0, 0)' }, { backgroundColor: '', color: '' }]) {
        const el = { ...leitura('p'), selecao }
        reprova(d6Selecao(docSel({ corpo: el })), /o corpo: sem o estilo da seleção lido/)
      }
    })

    it('a cor do fundo ou do texto que não se interpreta reprova, apontando qual', () => {
      reprova(d6Selecao(docSel({ corpo: leitura('p', { backgroundColor: 'azul', color: 'rgb(255, 248, 238)' }) })), /o corpo: o fundo da seleção "azul" não se interpreta como cor/)
      reprova(d6Selecao(docSel({ corpo: leitura('p', { backgroundColor: 'rgb(176, 64, 28)', color: 'highlighttext' }) })), /o corpo: o texto da seleção "highlighttext" não se interpreta como cor/)
      reprova(d6Selecao(docSel({ controle: leitura('input', { backgroundColor: 'rgb(1, 2)', color: 'rgb(0, 0, 0)' }) })), /o input: o fundo da seleção "rgb\(1, 2\)" não se interpreta como cor/)
    })
  })

  describe('dentro do avaliarCriterios', () => {
    it('as cinco telas somam o D6-selecao como critério bloqueante, e ele passa com a paleta e reprova com o padrão do navegador', () => {
      for (const caso of ['entrar', 'criar_conta', 'recuperar_acesso', 'comecar_seu_nome', 'conta']) {
        const { criterios } = avaliarCriterios({ doc: docSel(), nos: [], tema: 'claro' }, caso)
        const c = criterios.find((x) => x.regra === 'D6-selecao')
        assert.ok(c, `falta D6-selecao em ${caso}`)
        assert.equal(c.ok, true, `${caso}: ${c.motivo}`)
        assert.equal(c.bloqueia, true)
        const hoje = avaliarCriterios({ doc: docSel({ corpo: leitura('p', PADRAO_DO_NAVEGADOR) }), nos: [], tema: 'claro' }, caso)
        assert.equal(hoje.criterios.find((x) => x.regra === 'D6-selecao').ok, false, caso)
      }
    })

    it('vale em 390 e em 1440, e na madrugada da Conta', () => {
      for (const base of [doc390, doc1440]) assert.equal(d6Selecao(docSel({ base })).ok, true)
      const { criterios } = avaliarCriterios({ doc: docSel({ corpo: leitura('p', URUCUM_MADRUGADA), controle: leitura('input', URUCUM_MADRUGADA) }), nos: [], tema: 'madrugada' }, 'conta')
      assert.equal(criterios.find((x) => x.regra === 'D6-selecao').ok, true)
    })

    it('sem a leitura, reprova fechado', () => {
      const { criterios } = avaliarCriterios({ doc: doc1440, nos: [], tema: 'claro' }, 'entrar')
      assert.equal(criterios.find((x) => x.regra === 'D6-selecao').ok, false)
    })
  })

  describe('a leitura em página da seleção (lerSelecaoNaPagina)', () => {
    /**
     * O jsdom não mede layout nem calcula o `::selection`: `data-r="x,y,w,h"` dá a caixa; o `getComputedStyle(el, '::selection')` é o de
     * `selecao` (por tag), e o sem pseudo-elemento traz o fundo de `data-fundo` e `visibility` e `display` do elemento.
     */
    function lerSelecao(html, { selecao = { p: URUCUM_DIA, input: URUCUM_DIA }, pseudoLanca = false, rolagem = 0 } = {}) {
      const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { runScripts: 'outside-only', virtualConsole: new VirtualConsole() })
      const { window } = dom
      window.Element.prototype.getBoundingClientRect = function retangulo() {
        const [x, y, w, h] = (this.getAttribute('data-r') ?? '0,0,100,20').split(',').map(Number)
        return { x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h }
      }
      window.getComputedStyle = (el, pseudo) => {
        if (pseudo) {
          if (pseudoLanca) throw new Error('pseudo-elemento não suportado')
          return { ...(selecao[el.tagName.toLowerCase()] ?? {}) }
        }
        return {
          backgroundColor: el.getAttribute('data-fundo') ?? 'rgba(0, 0, 0, 0)',
          visibility: el.hasAttribute('data-oculto') ? 'hidden' : 'visible',
          display: el.hasAttribute('data-nenhum') ? 'none' : 'block',
        }
      }
      if (rolagem) Object.defineProperty(window, 'scrollY', { configurable: true, value: rolagem })
      try {
        return JSON.parse(JSON.stringify(window.eval(`(${lerSelecaoNaPagina.toString()})()`)))
      } finally {
        window.close()
      }
    }

    const PAGINA = `
      <p data-r="16,10,300,20">Fora do main: não conta.</p>
      <main data-fundo="rgb(246, 239, 227)">
        <h1 data-r="16,92,358,48">Entrar</h1>
        <p data-oculto data-r="16,140,358,24">Oculto.</p>
        <p data-nenhum data-r="16,140,358,24">Sem caixa.</p>
        <p data-r="16,170,1,1">Fina demais.</p>
        <p data-r="16,148,358,43">Use o e-mail e a senha.</p>
        <form>
          <input type="hidden" data-r="16,200,300,56">
          <input type="email" data-oculto data-r="16,260,300,56">
          <input type="email" data-r="20,372,350,56">
        </form>
      </main>`

    it('lê o primeiro parágrafo visível do main e o primeiro input visível, com a caixa, o ::selection e a cadeia de fundos', () => {
      const { corpo, controle } = lerSelecao(PAGINA)
      assert.equal(corpo.tag, 'p')
      assert.equal(corpo.texto, 'Use o e-mail e a senha.')
      assert.deepEqual(corpo.rect, { x: 16, y: 148, w: 358, h: 43 })
      assert.deepEqual(corpo.selecao, { backgroundColor: URUCUM_DIA.backgroundColor, color: URUCUM_DIA.color })
      assert.ok(Array.isArray(corpo.cadeia) && corpo.cadeia.length >= 2, 'a cadeia vai do elemento até a raiz')
      assert.ok(corpo.cadeia.includes('rgb(246, 239, 227)'), 'o fundo do main entra na cadeia')
      assert.equal(controle.tag, 'input')
      assert.deepEqual(controle.rect, { x: 20, y: 372, w: 350, h: 56 })
      assert.deepEqual(controle.selecao, { backgroundColor: URUCUM_DIA.backgroundColor, color: URUCUM_DIA.color })
    })

    it('as coordenadas são as da página: a rolagem entra na caixa', () => {
      const { corpo, controle } = lerSelecao(PAGINA, { rolagem: 100 })
      assert.equal(corpo.rect.y, 248)
      assert.equal(controle.rect.y, 472)
    })

    it('o ::selection lido é o de cada elemento: o padrão do navegador volta como transparente e o critério reprova', () => {
      const lido = lerSelecao(PAGINA, { selecao: { p: PADRAO_DO_NAVEGADOR, input: PADRAO_DO_NAVEGADOR } })
      assert.equal(lido.corpo.selecao.backgroundColor, 'rgba(0, 0, 0, 0)')
      reprova(d6Selecao({ ...doc1440, selecao: lido }), /o fundo da seleção é transparente/)
      assert.equal(d6Selecao({ ...doc1440, selecao: lerSelecao(PAGINA) }).ok, true, 'a leitura da paleta passa o critério inteiro')
    })

    it('sem parágrafo ou sem input visível no main, o elemento é nulo (o critério reprova fechado)', () => {
      const semInput = lerSelecao('<main><p data-r="0,0,100,20">Só texto.</p></main>')
      assert.equal(semInput.controle, null)
      assert.equal(semInput.corpo.tag, 'p')
      const semParagrafo = lerSelecao('<main><input data-r="0,0,100,20"></main>')
      assert.equal(semParagrafo.corpo, null)
      reprova(d6Selecao({ ...doc1440, selecao: semInput }), /o input: sem a leitura do elemento/)
    })

    it('um navegador que não entrega o ::selection (a leitura lança) volta com a seleção nula, e não como aprovação', () => {
      const lido = lerSelecao(PAGINA, { pseudoLanca: true })
      assert.equal(lido.corpo.selecao, null)
      reprova(d6Selecao({ ...doc1440, selecao: lido }), /sem o estilo da seleção lido/)
    })

    it('não tem fechamento: serializada por toString, roda sozinha', () => {
      assert.match(lerSelecaoNaPagina.toString(), /^(async )?function lerSelecaoNaPagina/)
    })
  })
})
