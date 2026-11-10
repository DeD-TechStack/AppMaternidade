// Testes da parte pura do medidor (node --test web/scripts/medir-dom.test.mjs). Para cada regra:
// um caso que passa, um que falha e um de borda; e os casos em que a medida falha fechado.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  areaUtilDe,
  avaliarTudo,
  bloqueantesDoCaso,
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
    assert.equal(bloqueantesDoCaso('sistema').length, 13)
    assert.deepEqual(bloqueantesDoCaso('hoje'), ['G2', 'G9'])
    assert.deepEqual(bloqueantesDoCaso('inicio'), ['G2', 'G9'])
    assert.deepEqual(bloqueantesDoCaso('sessao'), ['G2', 'G9'])
  })

  it('devolve uma linha RESUMO com ok, FALHA e registrada', () => {
    const resultados = avaliarTudo({ doc: { ...doc1440, scrollWidth: 1500 }, nos: [], tema: 'claro' }, 'hoje')
    const linha = resumo('hoje_claro_1440.json', resultados)

    assert.match(linha, /^RESUMO hoje_claro_1440\.json G1 registrada G2 FALHA G3 registrada /)
    assert.match(linha, /G9 FALHA/)
    assert.equal(resultados.length, 13)
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
