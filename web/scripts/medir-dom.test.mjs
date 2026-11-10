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
  lerEstadoDeEnvioNaPagina,
  lerFocoNaPagina,
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

const ANEL_OK = { focou: true, tag: 'input', outlineStyle: 'solid', outlineWidth: '2px', outlineOffset: '2px', outlineColor: 'rgb(26, 21, 17)' }
const FOCO_OK = { controle: ANEL_OK, botao: { ...ANEL_OK, tag: 'button' } }

/** O estado estável: 1440, o envio vazio não mexe em nada e aparecem os dois erros de uma linha. */
const vazioEstavel = () => ({
  antes: estadoDeEnvio(),
  depois: estadoDeEnvio({ mensagens: [mensagemDeEnvio(), mensagemDeEnvio({ texto: 'Escreva a sua senha.' })] }),
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
    assert.deepEqual(criteriosDoCaso('entrar'), ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7'])
    assert.deepEqual(criteriosDoCaso('criar_conta'), ['E-1', 'E-2', 'E-3', 'E-5', 'E-6', 'E-7', 'C-1', 'C-2', 'C-3'])
    assert.deepEqual(criteriosDoCaso('recuperar_acesso'), ['E-1', 'E-2', 'E-3', 'E-5', 'E-6', 'E-7', 'R-1', 'R-2', 'R-3'])
    assert.deepEqual(criteriosDoCaso('comecar_seu_nome'), ['E-1', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'B-1', 'B-2', 'B-3'])
    assert.deepEqual(criteriosDoCaso('conta', 'claro'), ['A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6'])
    assert.deepEqual(criteriosDoCaso('conta', 'madrugada'), ['A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6', 'M-1', 'M-2', 'M-3', 'M-4', 'M-5', 'M-6'])
    assert.deepEqual(criteriosDoCaso('hoje'), [])
    assert.deepEqual(criteriosDoCaso('sistema', 'madrugada'), [])
  })

  it('avaliarCriterios: sem leitura, todo critério reprova fechado e bloqueia; os manuais vêm junto', () => {
    const { criterios, criterios_manuais: manuais } = avaliarCriterios({ doc: doc1440, nos: [], tema: 'claro' }, 'entrar')
    assert.equal(criterios.length, 7)
    for (const r of criterios) {
      assert.deepEqual(Object.keys(r).sort(), ['bloqueia', 'motivo', 'nos_com_falha', 'ok', 'regra'])
      assert.equal(r.ok, false, `${r.regra}: ${r.motivo}`)
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
  const anel = (extra = {}) => ({ focou: true, tag: 'input', outlineStyle: 'solid', outlineWidth: '2px', outlineOffset: '2px', outlineColor: 'rgb(26, 21, 17)', ...extra })
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
    assert.equal(a2(seis((i) => ({ rect: { x: 16 + (i % 3) * 110, y: 200 + Math.floor(i / 3) * 44, w: 100, h: 44 } })), doc390).ok, true)
    assert.equal(a2(seis((i) => (i === 0 ? { alvoExiste: false, rect: { x: 16, y: 200, w: 100, h: 44 } } : { rect: { x: 16 + i * 10, y: 200, w: 100, h: 44 } })), doc390).ok, false)
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

describe('A-6: a altura total em 1440 é ≤ 3.200 px', () => {
  const rodape = (y, h) => criar({ tag: 'footer', texto: '', rect: { x: 0, y, w: 1425, h }, m: { rodape: true } })

  it('passa com 3.000 px (pelo rodapé ou pela altura do documento)', () => {
    assert.equal(a6([rodape(2100, 900)], doc1440).ok, true)
    assert.equal(a6([], { ...doc1440, alturaTotal: 3000 }).ok, true)
  })

  it('falha com 3.465 px (a Conta antiga, com o rodapé)', () => {
    assert.equal(a6([rodape(2565, 900)], doc1440).ok, false)
    assert.equal(a6([rodape(100, 100)], { ...doc1440, alturaTotal: 3400 }).ok, false)
  })

  it('borda: 3.200 passa, 3.201 falha; em 390 não se aplica', () => {
    assert.equal(a6([rodape(2300, 900)], doc1440).ok, true)
    assert.equal(a6([rodape(2301, 900)], doc1440).ok, false)
    assert.match(a6([rodape(5000, 900)], doc390).motivo, /não aplicável/)
  })

  it('falha fechado: sem rodapé nem altura e sem largura', () => {
    assert.equal(a6([], doc1440).ok, false)
    assert.equal(a6([rodape(2100, 900)], undefined).ok, false)
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
  })

  it('não tem fechamento: serializada por toString, roda sozinha', () => {
    assert.match(lerEstadoDeEnvioNaPagina.toString(), /^(async )?function lerEstadoDeEnvioNaPagina/)
  })
})
