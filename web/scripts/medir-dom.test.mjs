// Testes da parte pura do medidor (node --test web/scripts/medir-dom.test.mjs). Para cada regra:
// um caso que passa, um que falha e um de borda; e os casos em que a medida falha fechado.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { JSDOM } from 'jsdom'
import {
  areaUtilDe,
  avaliarTudo,
  bloqueantesDoCaso,
  coletarNaPagina,
  contraste,
  fundoReal,
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
  const dom = new JSDOM(
    `<!doctype html><html><head><style>* { font-size: 20px; opacity: 1; transform: none; text-transform: none; box-shadow: none; }</style></head><body>${html}</body></html>`,
    { runScripts: 'outside-only' },
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
