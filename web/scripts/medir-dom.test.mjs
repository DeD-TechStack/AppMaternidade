// Testes da parte pura do medidor (node --test web/scripts/medir-dom.test.mjs). Para cada regra
// (G1, G11, G12, FONTES, CAIXA, SOMBRA, 3D): um caso que passa, um que falha e a falha fechada.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { after, describe, it } from 'node:test'
import { JSDOM, VirtualConsole } from 'jsdom'
import {
  SIGLAS_PERMITIDAS,
  abrirCaso,
  entrarNaDemonstracao,
  rotaExigeSessao,
  TOKENS_DESIGN,
  avaliarTudo,
  bloqueantesDoCaso,
  caixa,
  canonico,
  coletarNaPagina,
  contraste,
  familiasDe,
  fontes,
  fundoReal,
  g1,
  g11,
  g12,
  lerArgumentos,
  linhaNaoSeAplica,
  naoSeAplicaSemAbrir,
  palavrasEmCaixaAlta,
  parseCor,
  primeiraFamilia,
  resumo,
  rotaDoCaso,
  rotasDosPedidos,
  sombra,
  sombraCanonica,
  tresD,
  verificarLoopback,
} from './medir-dom.mjs'
// MED-AUTH: as peças novas pelo namespace, para que a falta de uma delas reprove só o teste dela.
import * as medir from './medir-dom.mjs'

const PAPEL = 'rgb(248, 246, 235)'
const TINTA = 'rgb(43, 35, 32)'
const BRANCO = 'rgb(255, 255, 255)'
const TRANSPARENTE = 'rgba(0, 0, 0, 0)'

// Os valores como o Chrome os calcula (normalizados), para a SOMBRA.
const FLUTUANTE_CHROME = 'rgba(43, 35, 32, 0.08) 0px 2px 4px 0px, rgba(43, 35, 32, 0.16) 0px 18px 40px 0px'
const CARTAO_CHROME = 'rgba(43, 35, 32, 0.06) 0px 1px 2px 0px, rgba(43, 35, 32, 0.06) 0px 8px 24px 0px'
const LUZ_CHROME = 'radial-gradient(120% 90% at 15% 10%, rgb(247, 214, 132) 0%, rgb(242, 193, 78) 60%)'
const BRILHO_CHROME = 'radial-gradient(closest-side, rgba(242, 193, 78, 0.22), rgba(0, 0, 0, 0))'

/** Mescla `estilo` e `m` (um nível), para um ajuste fino não apagar o resto do nó. */
function com(base, extra = {}) {
  return { ...base, ...extra, estilo: { ...base.estilo, ...(extra.estilo ?? {}) }, m: { ...base.m, ...(extra.m ?? {}) } }
}

/** Um nó de texto comum (Outfit, 20 px, tinta sobre o papel), sem nada de especial. */
function criar(extra = {}) {
  const base = {
    tag: 'p',
    texto: 'Olá',
    visivel: true,
    rect: { x: 32, y: 100, w: 300, h: 28 },
    estilo: {
      fontSize: '20px',
      fontWeight: '400',
      fontFamily: '"Outfit Variable", system-ui, sans-serif',
      textTransform: 'none',
      boxShadow: 'none',
      backgroundImage: 'none',
      backgroundColor: TRANSPARENTE,
      color: TINTA,
      opacity: '1',
      transform: 'none',
      rotate: 'none',
      scale: 'none',
      perspective: 'none',
      transformStyle: 'flat',
      filter: 'none',
      backdropFilter: 'none',
    },
    m: {},
    cadeia: [TRANSPARENTE, PAPEL],
  }
  return com(base, extra)
}

const doc1440 = { largura: 1440, altura: 900, clientWidth: 1425, scrollWidth: 1425 }

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

  it('o cacau sobre o papel tem 14,2:1 (DESIGN.md seção 1)', () => {
    assert.ok(Math.abs(contraste(TINTA, [TRANSPARENTE, PAPEL]) - 14.2) < 0.05)
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

describe('G1: scrollWidth == clientWidth', () => {
  it('passa quando são iguais', () => assert.equal(g1({ scrollWidth: 1425, clientWidth: 1425 }).ok, true))
  it('falha com rolagem horizontal, mesmo de 1 px', () => {
    assert.equal(g1({ scrollWidth: 1500, clientWidth: 1425 }).ok, false)
    assert.equal(g1({ scrollWidth: 1426, clientWidth: 1425 }).ok, false)
  })
  it('falha fechado sem a medida', () => {
    assert.equal(g1({ clientWidth: 1425 }).ok, false)
    assert.equal(g1({ scrollWidth: 1425 }).ok, false)
    assert.equal(g1({ scrollWidth: Number.NaN, clientWidth: 1425 }).ok, false)
    assert.equal(g1(undefined).ok, false)
  })
})

describe('G11: alvo de toque e contraste', () => {
  const alvo = (w, h, extra = {}) => criar({ tag: 'button', rect: { x: 32, y: 0, w, h }, ...extra, m: { interativo: true, ...(extra.m ?? {}) } })
  // #8A8A8A sobre branco: 3,45:1, entre os dois limites (3 e 4,5).
  const CINZA_MEDIO = { color: 'rgb(138, 138, 138)' }
  const sobreBranco = (estilo) => criar({ estilo: { ...CINZA_MEDIO, ...estilo }, cadeia: [BRANCO] })

  it('passa com 44 × 44 e o contraste do cacau sobre o papel', () => {
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

  it('na BarraRegistrar o alvo interativo tem 56 de altura, também no tema claro', () => {
    const naBarra = { m: { barraRegistrar: true } }
    const r = g11([alvo(88, 48, naBarra)], 'claro')
    assert.equal(r.ok, false)
    assert.match(r.motivo, /mínimo 44 × 56/)
    assert.equal(g11([alvo(88, 56, naBarra)], 'claro').ok, true)
    // O mesmo botão fora da barra, com 48 de altura, passa; um nó da barra que não é interativo não conta.
    assert.equal(g11([alvo(88, 48)], 'claro').ok, true)
    assert.equal(g11([alvo(44, 44), criar({ tag: 'div', rect: { x: 0, y: 0, w: 390, h: 20 }, m: { barraRegistrar: true } })], 'claro').ok, true)
  })

  it('borda: 43,6 px de largura passa (arredondamento) e 43 não; o contraste de 4,5 passa', () => {
    assert.equal(g11([alvo(43.6, 44)], 'claro').ok, true)
    assert.equal(g11([alvo(43, 44)], 'claro').ok, false)
    // #767676 sobre branco tem 4,54:1.
    assert.equal(g11([alvo(44, 44), criar({ estilo: { color: 'rgb(118, 118, 118)' }, cadeia: [BRANCO] })], 'claro').ok, true)
  })

  it('texto grande (≥ 24 px, ou ≥ 18,66 px em negrito) passa com 3:1; o texto comum não', () => {
    assert.equal(g11([alvo(44, 44), sobreBranco({ fontSize: '20px' })], 'claro').ok, false)
    assert.equal(g11([alvo(44, 44), sobreBranco({ fontSize: '24px' })], 'claro').ok, true)
    assert.equal(g11([alvo(44, 44), sobreBranco({ fontSize: '18.66px', fontWeight: '700' })], 'claro').ok, true)
    assert.equal(g11([alvo(44, 44), sobreBranco({ fontSize: '18.66px', fontWeight: '400' })], 'claro').ok, false)
    assert.equal(g11([alvo(44, 44), sobreBranco({ fontSize: '18px', fontWeight: '700' })], 'claro').ok, false)
    assert.equal(g11([alvo(44, 44), sobreBranco({ fontSize: '24px', fontWeight: '600' })], 'claro').ok, true)
  })

  it('texto grande abaixo de 3:1 também falha', () => {
    // #AAAAAA sobre branco: 2,32:1.
    const r = g11([alvo(44, 44), criar({ estilo: { color: 'rgb(170, 170, 170)', fontSize: '48px' }, cadeia: [BRANCO] })], 'claro')
    assert.equal(r.ok, false)
    assert.match(r.motivo, /mínimo 3:1/)
  })

  it('falha fechado: fundo transparente sem ancestral opaco, texto sem largura, nada para medir', () => {
    assert.equal(g11([alvo(44, 44), criar({ cadeia: [TRANSPARENTE, TRANSPARENTE] })], 'claro').ok, false)
    assert.equal(g11([alvo(44, 44), criar({ rect: { x: 0, y: 0, w: 0, h: 20 } })], 'claro').ok, false)
    assert.equal(g11([criar()], 'claro').ok, false)
    assert.equal(g11([alvo(44, 44, { texto: '' })], 'claro').ok, false)
    assert.equal(g11([alvo(44, 44), criar({ estilo: { color: undefined } })], 'claro').ok, false)
  })

  it('o que não está visível não conta', () => {
    assert.equal(g11([alvo(44, 44), alvo(10, 10, { visivel: false })], 'claro').ok, true)
  })

  describe('MAT-48e: o alvo do radio e do checkbox é o rótulo (WCAG 2.5.8)', () => {
    // O input de 13 × 13 dentro de um <label> de `w` × `h`; sem `rotulo`, o input não tem rótulo.
    const caixaDeMarcar = (tipo, w, h, rotulo = { rect: { x: 0, y: 0, w, h } }) =>
      criar({
        tag: 'input',
        texto: '',
        tipo,
        rect: { x: 8, y: 8, w: 13, h: 13 },
        m: { interativo: true },
        ...(rotulo ? { rotulo } : {}),
      })

    for (const tipo of ['radio', 'checkbox']) {
      it(`${tipo} de 13 × 13 num rótulo de 44 × 44 passa (o rótulo é o alvo)`, () => {
        const r = g11([alvo(44, 44), caixaDeMarcar(tipo, 44, 44)], 'claro')
        assert.equal(r.ok, true, r.motivo)
      })

      it(`${tipo} com rótulo de 30 × 30 falha, e a falha nomeia o rótulo`, () => {
        const r = g11([alvo(44, 44), caixaDeMarcar(tipo, 30, 30)], 'claro')
        assert.equal(r.ok, false)
        assert.match(r.motivo, new RegExp(`label de input ${tipo}: alvo de 30\\.0 × 30\\.0`))
        assert.match(r.motivo, /mínimo 44 × 44/)
        assert.equal(r.nos_com_falha.length, 1)
      })

      it(`${tipo} sem rótulo é medido como hoje e falha com 13 × 13`, () => {
        const r = g11([alvo(44, 44), caixaDeMarcar(tipo, 0, 0, null)], 'claro')
        assert.equal(r.ok, false)
        assert.match(r.motivo, /alvo de 13\.0 × 13\.0/)
        assert.doesNotMatch(r.motivo, /label de/)
      })
    }

    it('o rótulo sem tamanho reprova como "alvo sem tamanho"', () => {
      const r = g11([alvo(44, 44), caixaDeMarcar('radio', 0, 0)], 'claro')
      assert.equal(r.ok, false)
      assert.match(r.motivo, /label de input radio: alvo sem tamanho/)
    })

    it('rotulo sem rect não vale: o input é medido', () => {
      const r = g11([alvo(44, 44), caixaDeMarcar('radio', 0, 0, {})], 'claro')
      assert.equal(r.ok, false)
      assert.match(r.motivo, /alvo de 13\.0 × 13\.0/)
    })

    it('na madrugada o rótulo precisa de 56 de altura; no claro 44 bastam', () => {
      assert.equal(g11([alvo(44, 56), caixaDeMarcar('radio', 44, 48)], 'madrugada').ok, false)
      assert.equal(g11([alvo(44, 56), caixaDeMarcar('radio', 44, 56)], 'madrugada').ok, true)
      assert.equal(g11([alvo(44, 44), caixaDeMarcar('radio', 44, 48)], 'claro').ok, true)
      const r = g11([alvo(44, 56), caixaDeMarcar('checkbox', 44, 48)], 'madrugada')
      assert.match(r.motivo, /label de input checkbox: alvo de 44\.0 × 48\.0 \(mínimo 44 × 56\)/)
    })

    it('a tolerância de 43,5 vale para o rótulo', () => {
      assert.equal(g11([alvo(44, 44), caixaDeMarcar('radio', 43.6, 44)], 'claro').ok, true)
      assert.equal(g11([alvo(44, 44), caixaDeMarcar('radio', 43, 44)], 'claro').ok, false)
    })

    describe('o resultado mostra o que foi medido pelo rótulo (alvos_por_rotulo e o fragmento do motivo)', () => {
      it('(1) um radio num rótulo de 44 × 44: o motivo cita 1 radio/checkbox e o menor rótulo, e alvos_por_rotulo traz a caixa', () => {
        const r = g11([alvo(44, 44), caixaDeMarcar('radio', 44, 44)], 'claro')
        assert.equal(r.ok, true, r.motivo)
        assert.match(r.motivo, /; 1 radio\/checkbox medidos pelo rótulo \(44\.0 × 44\.0\)$/)
        assert.match(r.motivo, /^2 alvos ≥ 44 px; menor contraste \d+\.\d\d:1; /)
        assert.deepEqual(r.alvos_por_rotulo, [{ no: 'input', w: 44, h: 44 }])
      })

      it('a falha também leva o fragmento e a lista; a decisão e o motivo da falha seguem iguais', () => {
        const r = g11([alvo(44, 44), caixaDeMarcar('checkbox', 30, 30)], 'claro')
        assert.equal(r.ok, false)
        assert.match(r.motivo, /^label de input checkbox: alvo de 30\.0 × 30\.0 \(mínimo 44 × 44\); 1 radio\/checkbox medidos pelo rótulo \(30\.0 × 30\.0\)$/)
        assert.deepEqual(r.alvos_por_rotulo, [{ no: 'input', w: 30, h: 30 }])
        assert.equal(r.nos_com_falha.length, 1)
      })

      it('com vários, a contagem é do total e o menor rótulo (menor área) é o citado; o que não tem rótulo não entra', () => {
        const r = g11([alvo(44, 44), caixaDeMarcar('radio', 200, 48), caixaDeMarcar('checkbox', 44.04, 44.04), caixaDeMarcar('radio', 0, 0, null)], 'claro')
        assert.equal(r.ok, false) // o radio sem rótulo (13 × 13) falha como antes
        assert.match(r.motivo, /; 2 radio\/checkbox medidos pelo rótulo \(44\.0 × 44\.0\)$/)
        assert.deepEqual(r.alvos_por_rotulo, [
          { no: 'input', w: 200, h: 48 },
          { no: 'input', w: 44.04, h: 44.04 },
        ])
      })

      it('o rótulo sem tamanho ainda conta como medido pelo rótulo e o fragmento não quebra', () => {
        const r = g11([alvo(44, 44), caixaDeMarcar('radio', 0, 0)], 'claro')
        assert.equal(r.ok, false)
        assert.match(r.motivo, /^label de input radio: alvo sem tamanho; 1 radio\/checkbox medidos pelo rótulo \(0\.0 × 0\.0\)$/)
        assert.deepEqual(r.alvos_por_rotulo, [{ no: 'input', w: 0, h: 0 }])
      })

      it('(2) sem radio nem checkbox medido pelo rótulo: o motivo fica como hoje e alvos_por_rotulo é []', () => {
        const ok = g11([alvo(44, 44)], 'claro')
        assert.equal(ok.ok, true)
        assert.match(ok.motivo, /^1 alvos ≥ 44 px; menor contraste \d+\.\d\d:1$/)
        assert.doesNotMatch(ok.motivo, /rótulo/)
        assert.deepEqual(ok.alvos_por_rotulo, [])
        const falha = g11([alvo(40, 44)], 'claro')
        assert.equal(falha.motivo, 'button "Olá": alvo de 40.0 × 44.0 (mínimo 44 × 44)')
        assert.deepEqual(falha.alvos_por_rotulo, [])
        // O radio sem rótulo é medido pelo próprio tamanho: não entra na lista nem no fragmento.
        const semRotulo = g11([alvo(44, 44), caixaDeMarcar('radio', 0, 0, null)], 'claro')
        assert.equal(semRotulo.motivo, 'input: alvo de 13.0 × 13.0 (mínimo 44 × 44)')
        assert.deepEqual(semRotulo.alvos_por_rotulo, [])
      })

      it('as falhas fechadas (nenhum alvo, nenhum texto) também trazem alvos_por_rotulo vazio', () => {
        assert.deepEqual(g11([criar()], 'claro').alvos_por_rotulo, [])
        assert.deepEqual(g11([alvo(44, 44, { texto: '' })], 'claro').alvos_por_rotulo, [])
      })
    })

    it('só radio e checkbox usam o rótulo: um input de texto com rotulo continua medido pelo próprio tamanho', () => {
      const texto = criar({ tag: 'input', texto: '', tipo: 'text', rect: { x: 0, y: 0, w: 200, h: 30 }, m: { interativo: true }, rotulo: { rect: { x: 0, y: 0, w: 200, h: 60 } } })
      assert.equal(g11([alvo(44, 44), texto], 'claro').ok, false)
    })
  })

  describe('R1: o texto dos controles entra no contraste', () => {
    const controle = (extra = {}) =>
      criar({ tag: 'input', texto: '', textoControle: 'Maria', rect: { x: 32, y: 0, w: 200, h: 48 }, m: { interativo: true }, ...extra })

    it('um input com texto legível passa, e o mesmo input com a cor do texto igual ao fundo (1:1) falha', () => {
      assert.equal(g11([alvo(44, 44), controle()], 'claro').ok, true)
      const r = g11([alvo(44, 44), controle({ estilo: { color: PAPEL, backgroundColor: PAPEL }, cadeia: [PAPEL] })], 'claro')
      assert.equal(r.ok, false)
      assert.match(r.motivo, /input "Maria": contraste 1\.00:1/)
      assert.equal(r.nos_com_falha.length, 1)
    })

    it('textarea e select também contam', () => {
      const ruim = { estilo: { color: PAPEL }, cadeia: [PAPEL] }
      assert.equal(g11([alvo(44, 44), controle({ tag: 'textarea', ...ruim })], 'claro').ok, false)
      assert.equal(g11([alvo(44, 44), controle({ tag: 'select', ...ruim })], 'claro').ok, false)
      assert.equal(g11([alvo(44, 44), controle({ tag: 'select' })], 'claro').ok, true)
    })

    it('quando o texto é o placeholder, vale o estilo do ::placeholder (estiloTexto), não o do input', () => {
      const dica = (estiloTexto) =>
        controle({ textoControle: 'Seu nome', estiloTexto: { origem: 'placeholder', fontSize: '20px', fontWeight: '400', opacity: '1', opacidadeCadeia: 1, ...estiloTexto } })
      assert.equal(g11([alvo(44, 44), dica({ color: TINTA })], 'claro').ok, true)
      // O input tem a cor boa; o placeholder, não: reprova.
      const r = g11([alvo(44, 44), dica({ color: 'rgb(200, 200, 200)' })], 'claro')
      assert.equal(r.ok, false)
      assert.match(r.motivo, /contraste/)
    })

    it('o controle sem texto visível (vazio) e o que não está visível não contam', () => {
      assert.equal(g11([alvo(44, 44), controle({ textoControle: '', estilo: { color: PAPEL }, cadeia: [PAPEL] })], 'claro').ok, true)
      assert.equal(g11([alvo(44, 44), controle({ visivel: false, estilo: { color: PAPEL }, cadeia: [PAPEL] })], 'claro').ok, true)
    })

    it('o limite de texto grande vale para o controle, e a largura 0 reprova', () => {
      const cinza = { color: 'rgb(138, 138, 138)' }
      assert.equal(g11([alvo(44, 44), controle({ estilo: cinza, cadeia: [BRANCO] })], 'claro').ok, false)
      assert.equal(g11([alvo(44, 44), controle({ estilo: { ...cinza, fontSize: '24px' }, cadeia: [BRANCO] })], 'claro').ok, true)
      assert.equal(g11([alvo(44, 44), controle({ rect: { x: 0, y: 0, w: 0, h: 48 } })], 'claro').ok, false)
    })
  })

  describe('R2a: tamanho e peso ausentes ou ilegíveis falham fechado', () => {
    const alvoBom = alvo(44, 44)

    it('o nó completo passa; sem font-size ou sem font-weight falha com o motivo concreto', () => {
      assert.equal(g11([alvoBom, criar()], 'claro').ok, true)
      const semTamanho = g11([alvoBom, criar({ estilo: { fontSize: undefined } })], 'claro')
      assert.equal(semTamanho.ok, false)
      assert.match(semTamanho.motivo, /font-size ausente/)
      const semPeso = g11([alvoBom, criar({ estilo: { fontWeight: undefined } })], 'claro')
      assert.equal(semPeso.ok, false)
      assert.match(semPeso.motivo, /font-weight ausente/)
    })

    it('valor vazio, NaN e unidade que não é px também reprovam', () => {
      for (const estilo of [{ fontSize: '' }, { fontSize: 'NaNpx' }, { fontSize: 'large' }, { fontWeight: '' }, { fontWeight: 'bold' }]) {
        const r = g11([alvoBom, criar({ estilo })], 'claro')
        assert.equal(r.ok, false, JSON.stringify(estilo))
      }
    })

    it('o controle que mostra o placeholder sem o tamanho do ::placeholder reprova', () => {
      const dica = (estiloTexto) => criar({ tag: 'input', texto: '', textoControle: 'Seu nome', rect: { x: 0, y: 0, w: 200, h: 48 }, m: { interativo: true }, estiloTexto })
      assert.equal(g11([alvoBom, dica({ color: TINTA, fontSize: '20px', fontWeight: '400', opacity: '1', opacidadeCadeia: 1 })], 'claro').ok, true)
      assert.equal(g11([alvoBom, dica({ color: TINTA, fontWeight: '400', opacity: '1', opacidadeCadeia: 1 })], 'claro').ok, false)
    })
  })
})

describe('G12: opacidade 1 e escala 1', () => {
  const bloco = (estilo = {}, m = { filhoDeMain: true }) => criar({ tag: 'section', texto: '', m, estilo })

  it('R2b: transform ausente ou vazio falha com o motivo; none continua valendo', () => {
    assert.equal(g12([bloco({ transform: 'none' })]).ok, true)
    for (const transform of [undefined, '', '   ']) {
      const r = g12([bloco({ transform })])
      assert.equal(r.ok, false, JSON.stringify(transform))
      assert.match(r.motivo, /transform ausente/)
    }
  })

  it('R6: a propriedade scale diferente de 1 falha (número, par, porcentagem); none e 1 valem', () => {
    for (const scale of ['none', '1', '1 1', '1 1 1', '100%']) assert.equal(g12([bloco({ scale })]).ok, true, scale)
    for (const scale of ['1.2', '1 2', '0.9 0.9', '120%']) assert.equal(g12([bloco({ scale })]).ok, false, scale)
    assert.match(g12([bloco({ scale: '1.2' })]).motivo, /escala 1\.200 × 1\.200 \(x × y, propriedade scale\)/)
  })

  it('R6: scale ausente, vazio ou ilegível falha fechado', () => {
    for (const scale of [undefined, '', 'grande', 'NaN', '1 abc', '1 1 1 1']) {
      const r = g12([bloco({ scale })])
      assert.equal(r.ok, false, String(scale))
      assert.match(r.motivo, /scale (ausente|ilegível)/)
    }
  })

  it('R6: a escala efetiva dos ancestrais (transform e scale) conta; o neutro passa', () => {
    const comAncestrais = (ancestrais) => g12([criar({ tag: 'div', texto: '', m: { blocoG12: true }, ancestrais })])
    assert.equal(comAncestrais({ opacidade: 1, escalaX: 1, escalaY: 1 }).ok, true)
    assert.equal(comAncestrais({ opacidade: 1, escalaX: 1.2, escalaY: 1.2 }).ok, false)
    assert.equal(comAncestrais({ opacidade: 1, escalaX: 1, escalaY: 0.5 }).ok, false)
    assert.equal(comAncestrais(null).ok, false)
  })

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

describe('FONTES: só Literata e Outfit', () => {
  const emFamilia = (fontFamily, extra = {}) => criar({ estilo: { fontFamily }, ...extra })

  it('passa com Literata e Outfit (nome da família variável, aspas e caixa à parte) e fallbacks genéricos', () => {
    const r = fontes([
      emFamilia('"Literata Variable", serif'),
      emFamilia('"Outfit Variable", system-ui, sans-serif'),
      emFamilia('Literata, serif'),
      emFamilia("'OUTFIT VARIABLE', sans-serif"),
      emFamilia('"Outfit Variable", ui-rounded, cursive, fantasy, emoji, math, fangsong, -apple-system, ui-sans-serif'),
    ])
    assert.equal(r.ok, true, r.motivo)
  })

  it('R4: vale toda família nomeada da pilha, não só a primeira', () => {
    for (const pilha of ['"Outfit Variable", "Zilla Slab", Georgia, sans-serif', '"Literata Variable", serif, Georgia', 'serif, "Zilla Slab"', 'sans-serif, Arial, "Outfit Variable"']) {
      const r = fontes([criar(), emFamilia(pilha)])
      assert.equal(r.ok, false, pilha)
    }
    const r = fontes([emFamilia('"Outfit Variable", "Zilla Slab", Georgia, sans-serif')])
    assert.match(r.motivo, /Zilla Slab/)
    assert.match(r.motivo, /Georgia/)
    assert.equal(r.nos_com_falha.length, 1)
    // O controle: a mesma pilha sem as famílias de fora passa.
    assert.equal(fontes([emFamilia('"Outfit Variable", system-ui, sans-serif')]).ok, true)
  })

  it('uma família genérica de texto (serif) na frente é ignorada, desde que haja uma família do site em outro nó', () => {
    // DS1:RF-07: monospace e ui-monospace na frente já não são ignoradas (ver o teste DS1-I-07 FONTES).
    assert.equal(fontes([emFamilia('"Outfit Variable", sans-serif'), emFamilia('serif')]).ok, true)
  })

  it('falha com Zilla Slab e diz o nome da família', () => {
    const r = fontes([emFamilia('"Outfit Variable", sans-serif'), emFamilia('"Zilla Slab", Georgia, serif')])
    assert.equal(r.ok, false)
    assert.match(r.motivo, /Zilla Slab/)
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('falha listando todas as famílias fora do conjunto, uma vez cada', () => {
    const r = fontes([emFamilia('Fraunces, serif'), emFamilia('Fraunces, serif'), emFamilia('"Instrument Sans", sans-serif'), emFamilia('"Outfit Variable"')])
    assert.equal(r.ok, false)
    assert.match(r.motivo, /Fraunces/)
    assert.match(r.motivo, /Instrument Sans/)
    assert.equal(r.motivo.match(/Fraunces/g).length, 1)
  })

  it('o texto de um controle também conta', () => {
    const controle = criar({ tag: 'input', texto: '', textoControle: 'Maria', estilo: { fontFamily: 'Arial' } })
    assert.equal(fontes([criar(), controle]).ok, false)
  })

  it('o que não está visível não conta', () => {
    assert.equal(fontes([criar(), emFamilia('Georgia', { visivel: false })]).ok, true)
  })

  it('falha fechado: nenhum nó com texto, font-family ausente, nó sem estilo e só famílias genéricas', () => {
    assert.equal(fontes([criar({ texto: '' })]).ok, false)
    assert.equal(fontes([]).ok, false)
    assert.match(fontes([]).motivo, /nenhum nó com texto/)
    assert.equal(fontes([criar(), emFamilia(undefined)]).ok, false)
    assert.equal(fontes([criar(), emFamilia('')]).ok, false)
    assert.equal(fontes([criar(), { tag: 'p', texto: 'Sem estilo', visivel: true }]).ok, false)
    assert.equal(fontes([emFamilia('serif'), emFamilia('system-ui, sans-serif')]).ok, false)
  })

  it('familiasDe lista todas as famílias da pilha, sem aspas', () => {
    assert.deepEqual(familiasDe('"Outfit Variable", "Zilla Slab", Georgia, sans-serif'), ['Outfit Variable', 'Zilla Slab', 'Georgia', 'sans-serif'])
    assert.deepEqual(familiasDe("'Fonte, estranha', serif"), ['Fonte, estranha', 'serif'])
    assert.deepEqual(familiasDe(undefined), [])
    assert.deepEqual(familiasDe(' , '), [])
  })

  it('primeiraFamilia tira as aspas e respeita vírgula dentro de aspas', () => {
    assert.equal(primeiraFamilia('"Literata Variable", serif'), 'Literata Variable')
    assert.equal(primeiraFamilia("'Fonte, estranha', serif"), 'Fonte, estranha')
    assert.equal(primeiraFamilia(undefined), null)
    assert.equal(primeiraFamilia('  '), null)
  })
})

describe('CAIXA: nada em caixa alta', () => {
  it('passa com frase normal, siglas da lista e palavras curtas em maiúsculas', () => {
    const r = caixa([
      criar({ texto: 'Sono do bebê' }),
      criar({ texto: 'Conforme a LGPD e a OMS' }),
      criar({ texto: 'RN, SBP e SOS' }),
      criar({ texto: 'LGPD' }),
      criar({ tag: 'input', texto: '', textoControle: 'Maria' }),
    ])
    assert.equal(r.ok, true, r.motivo)
    assert.deepEqual(SIGLAS_PERMITIDAS, ['RN', 'SBP', 'LGPD', 'OMS', 'SAMU', 'JSON'])
  })

  it('passa com a sigla JSON (exportar dados em /app/conta) e continua falhando com JSONS', () => {
    const r = caixa([criar({ texto: 'Exportar em JSON' })])
    assert.equal(r.ok, true, r.motivo)
    assert.deepEqual(palavrasEmCaixaAlta('JSON'), [])
    const falha = caixa([criar({ texto: 'JSONS e ATENÇÃO' })])
    assert.equal(falha.ok, false)
    assert.match(falha.motivo, /JSONS/)
  })

  it('passa com a sigla SAMU (telefone de emergência) e continua falhando com ATENÇÃO', () => {
    const r = caixa([criar({ texto: 'Em emergência, ligue para o SAMU 192' })])
    assert.equal(r.ok, true, r.motivo)
    assert.deepEqual(palavrasEmCaixaAlta('SAMU 192'), [])
    const falha = caixa([criar({ texto: 'SAMU 192: ATENÇÃO ao horário' })])
    assert.equal(falha.ok, false)
    assert.match(falha.motivo, /ATENÇÃO/)
  })

  it('falha com text-transform uppercase, mesmo com o texto em minúsculas', () => {
    const r = caixa([criar(), criar({ texto: 'Mamada', estilo: { textTransform: 'uppercase' } })])
    assert.equal(r.ok, false)
    assert.match(r.motivo, /uppercase/)
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('falha com uma palavra de 4 ou mais maiúsculas na grafia, com acento também', () => {
    assert.equal(caixa([criar({ texto: 'ATENÇÃO ao horário' })]).ok, false)
    assert.equal(caixa([criar({ texto: 'Seu bebê está BEM' })]).ok, true) // 3 letras
    assert.equal(caixa([criar({ texto: 'Seu bebê está BEMM' })]).ok, false)
    assert.equal(caixa([criar({ texto: 'AÇÃO' })]).ok, false)
    assert.equal(caixa([criar({ tag: 'input', texto: '', textoControle: 'DIGITE AQUI' })]).ok, false)
    const r = caixa([criar({ texto: 'LGPDS e PRÓXIMAS' })])
    assert.equal(r.ok, false)
    assert.match(r.motivo, /LGPDS/)
    assert.match(r.motivo, /PRÓXIMAS/)
  })

  it('palavrasEmCaixaAlta aceita a palavra que é exatamente uma sigla e recusa o resto', () => {
    assert.deepEqual(palavrasEmCaixaAlta('LGPD e OMS, SBP e RN'), [])
    assert.deepEqual(palavrasEmCaixaAlta('TEXTO e Texto e texto'), ['TEXTO'])
    assert.deepEqual(palavrasEmCaixaAlta(undefined), [])
  })

  it('um código de cor hexadecimal completo não é rótulo em caixa alta', () => {
    for (const texto of ['#EADDC5', '#FFFFFF', '#fff', '#2B2320', '#ABCDEF', '#ABCD', '#ABCDEF12', 'Cor #F7D684 do mel', 'Cor (#EADDC5), #FFFFFF.']) {
      const r = caixa([criar({ texto })])
      assert.equal(r.ok, true, `${texto}: ${r.motivo}`)
      assert.deepEqual(palavrasEmCaixaAlta(texto), [], texto)
    }
  })

  it('R3: um item com dígito não é isento: só passa se não tiver 4 maiúsculas seguidas', () => {
    // H1 e A11Y passam por terem no máximo 1 maiúscula seguida; CADASTRAR2 e afins reprovam.
    for (const texto of ['H1', 'A11Y', 'Seção H2 e A11Y']) assert.equal(caixa([criar({ texto })]).ok, true, texto)
    for (const texto of ['CADASTRAR2', 'ADMIN1', 'Botão CADASTRAR2', 'A11YYYY', '2FATOR', 'ABCDE12']) {
      const r = caixa([criar({ texto })])
      assert.equal(r.ok, false, texto)
      assert.match(r.motivo, /caixa alta na grafia/)
    }
    assert.deepEqual(palavrasEmCaixaAlta('CADASTRAR2'), ['CADASTRAR'])
  })

  it('R3: só o código hexadecimal completo é isento (3, 4, 6 ou 8 dígitos, com #, em qualquer caixa)', () => {
    for (const texto of ['#ABCDE', '#ABCDEFG', '#ABCDEF1', 'ABCDEF', 'EADDC5', '# ABCDEF', '#ABCDEF#ABCDEF']) {
      assert.equal(caixa([criar({ texto })]).ok, false, texto)
    }
    assert.equal(caixa([criar({ texto: '#abc' })]).ok, true)
    assert.equal(caixa([criar({ texto: '#ABC' })]).ok, true)
  })

  it('uma palavra comum em caixa alta continua reprovando, e a lista de siglas não cresce', () => {
    for (const texto of ['HTML', 'Cena de HTML pura', 'TEXTO', 'Cor #EADDC5 e TEXTO', '#EADDC5 HTML']) {
      assert.equal(caixa([criar({ texto })]).ok, false, texto)
    }
    assert.deepEqual(palavrasEmCaixaAlta('Cena de HTML pura'), ['HTML'])
    assert.deepEqual(SIGLAS_PERMITIDAS, ['RN', 'SBP', 'LGPD', 'OMS', 'SAMU', 'JSON'])
  })

  it('falha fechado: nenhum nó com texto, text-transform ausente e nó sem estilo', () => {
    assert.equal(caixa([criar({ texto: '' })]).ok, false)
    assert.equal(caixa([]).ok, false)
    assert.match(caixa([]).motivo, /nenhum nó com texto/)
    assert.equal(caixa([criar({ estilo: { textTransform: undefined } })]).ok, false)
    assert.equal(caixa([{ tag: 'p', texto: 'Sem estilo', visivel: true }]).ok, false)
  })

  it('R2c: text-transform vazio falha com o motivo; none e capitalize continuam valendo', () => {
    for (const textTransform of ['none', 'capitalize', 'lowercase']) assert.equal(caixa([criar({ estilo: { textTransform } })]).ok, true, textTransform)
    for (const textTransform of ['', '   ']) {
      const r = caixa([criar({ estilo: { textTransform } })])
      assert.equal(r.ok, false, JSON.stringify(textTransform))
      assert.match(r.motivo, /text-transform ausente/)
    }
  })
})

describe('SOMBRA: sombra, gradiente e filtro só pelos tokens', () => {
  const noCom = (estilo) => criar({ tag: 'div', texto: '', estilo })

  it('passa com none, com as duas sombras (forma do Chrome e a escrita) e com os dois gradientes', () => {
    const r = sombra(
      [
        noCom({}),
        noCom({ boxShadow: FLUTUANTE_CHROME }),
        noCom({ boxShadow: CARTAO_CHROME }),
        noCom({ boxShadow: TOKENS_DESIGN.sombraFlutuante }),
        noCom({ boxShadow: TOKENS_DESIGN.sombraCartao }),
        noCom({ backgroundImage: LUZ_CHROME }),
        noCom({ backgroundImage: BRILHO_CHROME }),
        noCom({ backgroundImage: TOKENS_DESIGN.luzEstudio }),
        noCom({ backgroundImage: `url("https://127.0.0.1/cena.avif"), ${BRILHO_CHROME}` }),
      ],
      doc1440,
    )
    assert.equal(r.ok, true, r.motivo)
  })

  it('aceita a cor antes ou depois das medidas e sem o espalhamento', () => {
    const corDepois = '0px 2px 4px 0px rgba(43, 35, 32, 0.08), 0px 18px 40px 0px rgba(43, 35, 32, 0.16)'
    assert.equal(sombra([noCom({ boxShadow: corDepois })], doc1440).ok, true)
  })

  it('aceita os tokens da página quando iguais ao DESIGN.md (em outra grafia)', () => {
    const tokens = { sombraFlutuante: FLUTUANTE_CHROME, sombraCartao: TOKENS_DESIGN.sombraCartao, luzEstudio: LUZ_CHROME, brilhoMel: TOKENS_DESIGN.brilhoMel }
    const r = sombra([noCom({})], { ...doc1440, tokens })
    assert.equal(r.ok, true, r.motivo)
    assert.match(r.motivo, /4 de 4 tokens/)
  })

  it('falha com uma sombra fora dos tokens, ou só com uma das camadas', () => {
    const r = sombra([noCom({}), noCom({ boxShadow: 'rgba(0, 0, 0, 0.3) 0px 4px 12px 0px' })], doc1440)
    assert.equal(r.ok, false)
    assert.match(r.motivo, /box-shadow fora dos tokens/)
    assert.equal(r.nos_com_falha.length, 1)
    assert.equal(sombra([noCom({ boxShadow: 'rgba(43, 35, 32, 0.08) 0px 2px 4px 0px' })], doc1440).ok, false)
    // Os valores da sombra-cartao com o alfa da sombra-flutuante também reprovam.
    assert.equal(sombra([noCom({ boxShadow: 'rgba(43, 35, 32, 0.08) 0px 1px 2px 0px, rgba(43, 35, 32, 0.06) 0px 8px 24px 0px' })], doc1440).ok, false)
  })

  it('falha com gradiente fora dos tokens (linear, ou o radial com outra cor)', () => {
    const r = sombra([noCom({ backgroundImage: 'linear-gradient(rgb(255, 255, 255), rgb(0, 0, 0))' })], doc1440)
    assert.equal(r.ok, false)
    assert.match(r.motivo, /gradiente fora dos tokens/)
    assert.equal(sombra([noCom({ backgroundImage: LUZ_CHROME.replace('60%', '70%') })], doc1440).ok, false)
    assert.equal(sombra([noCom({ backgroundImage: `${BRILHO_CHROME}, linear-gradient(red, blue)` })], doc1440).ok, false)
  })

  it('falha com filter e backdrop-filter diferentes de none', () => {
    const f = sombra([noCom({ filter: 'blur(4px)' })], doc1440)
    assert.equal(f.ok, false)
    assert.match(f.motivo, /filter blur/)
    const b = sombra([noCom({ backdropFilter: 'blur(12px)' })], doc1440)
    assert.equal(b.ok, false)
    assert.match(b.motivo, /backdrop-filter/)
  })

  it('falha quando o token da página difere do DESIGN.md', () => {
    const r = sombra([noCom({})], { ...doc1440, tokens: { sombraFlutuante: '0 4px 8px rgb(0 0 0 / .5)' } })
    assert.equal(r.ok, false)
    assert.match(r.motivo, /--sombra-flutuante/)
    assert.equal(sombra([noCom({})], { ...doc1440, tokens: { luzEstudio: 'radial-gradient(red, blue)' } }).ok, false)
  })

  it('vale para o nó oculto também', () => {
    assert.equal(sombra([noCom({}), noCom({ boxShadow: 'rgba(0, 0, 0, 0.3) 0px 4px 12px 0px' })].map((no, i) => (i === 1 ? { ...no, visivel: false } : no)), doc1440).ok, false)
  })

  it('falha fechado: nenhum nó, nó sem estilo e leituras ausentes ou ilegíveis', () => {
    assert.equal(sombra([], doc1440).ok, false)
    assert.equal(sombra(undefined, doc1440).ok, false)
    assert.equal(sombra([{ tag: 'div', visivel: true }], doc1440).ok, false)
    assert.equal(sombra([noCom({ boxShadow: undefined })], doc1440).ok, false)
    assert.equal(sombra([noCom({ boxShadow: 'isto não é sombra' })], doc1440).ok, false)
    assert.equal(sombra([noCom({ backgroundImage: undefined })], doc1440).ok, false)
    assert.equal(sombra([noCom({ filter: '' })], doc1440).ok, false)
    assert.equal(sombra([noCom({ backdropFilter: undefined })], doc1440).ok, false)
  })

  it('R2d: um background-image ilegível falha com o motivo; none, url() e os gradientes dos tokens valem', () => {
    for (const backgroundImage of ['none', 'url("https://127.0.0.1/a.avif")', LUZ_CHROME, `url("a.webp"), none, ${BRILHO_CHROME}`]) {
      assert.equal(sombra([noCom({ backgroundImage })], doc1440).ok, true, backgroundImage)
    }
    for (const backgroundImage of ['garbage', 'none garbage', 'linear-gradient(red, blue', 'url(a.png', 'foo(bar)', '()', 'none, lixo']) {
      const r = sombra([noCom({ backgroundImage })], doc1440)
      assert.equal(r.ok, false, backgroundImage)
      assert.match(r.motivo, /background-image ilegível/)
    }
  })

  it('R2d: um gradiente escondido em image-set() ou cross-fade() não passa como imagem comum', () => {
    assert.equal(sombra([noCom({ backgroundImage: `image-set(${LUZ_CHROME} 1x)` })], doc1440).ok, false)
    assert.equal(sombra([noCom({ backgroundImage: 'image-set(url(a.avif) 1x, url(b.avif) 2x)' })], doc1440).ok, true)
  })

  it('a normalização leva as formas do Chrome e as do token à mesma forma canônica', () => {
    assert.equal(sombraCanonica(FLUTUANTE_CHROME), sombraCanonica(TOKENS_DESIGN.sombraFlutuante))
    assert.equal(sombraCanonica(CARTAO_CHROME), sombraCanonica(TOKENS_DESIGN.sombraCartao))
    assert.notEqual(sombraCanonica(CARTAO_CHROME), sombraCanonica(TOKENS_DESIGN.sombraFlutuante))
    assert.equal(canonico(LUZ_CHROME), canonico(TOKENS_DESIGN.luzEstudio))
    assert.equal(canonico(BRILHO_CHROME), canonico(TOKENS_DESIGN.brilhoMel))
    assert.equal(canonico('rgb(43 35 32 / .08)'), canonico('rgba(43, 35, 32, 0.08)'))
    assert.equal(canonico('#F7D684'), canonico('rgb(247, 214, 132)'))
    assert.equal(canonico('transparent'), canonico('rgba(0, 0, 0, 0)'))
    assert.equal(sombraCanonica('none'), 'none')
    assert.equal(sombraCanonica('inset 0 0 0 1px rgb(0 0 0 / .1)'), 'inset 0 0 0 1px rgb(0 0 0 / 0.1)')
    assert.equal(sombraCanonica('sem cor 1px 2px'), null)
    assert.equal(sombraCanonica(undefined), null)
  })
})

describe('3D: sem perspective, preserve-3d nem rotação em X ou Y', () => {
  const noCom = (estilo) => criar({ tag: 'div', texto: '', estilo })

  it('passa com none/flat, com transform 2D e com a matrix3d identidade', () => {
    const r = tresD([
      noCom({}),
      noCom({ transform: 'matrix(1, 0, 0, 1, 0, 12)' }),
      noCom({ transform: 'matrix(0.9239, 0.3827, -0.3827, 0.9239, 0, 0)' }), // rotate(22.5deg)
      noCom({ transform: 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)' }),
      noCom({ transform: 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 20, 0, 1)' }), // só deslocamento
    ])
    assert.equal(r.ok, true, r.motivo)
  })

  it('falha com perspective diferente de none', () => {
    const r = tresD([noCom({}), noCom({ perspective: '800px' })])
    assert.equal(r.ok, false)
    assert.match(r.motivo, /perspective 800px/)
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('falha com transform-style preserve-3d', () => {
    const r = tresD([noCom({ transformStyle: 'preserve-3d' })])
    assert.equal(r.ok, false)
    assert.match(r.motivo, /preserve-3d/)
  })

  it('falha com rotação em X, rotação em Y e perspective() dentro do transform', () => {
    const rotacaoX = 'matrix3d(1, 0, 0, 0, 0, 0.7071, 0.7071, 0, 0, -0.7071, 0.7071, 0, 0, 0, 0, 1)'
    const rotacaoY = 'matrix3d(0.7071, 0, -0.7071, 0, 0, 1, 0, 0, 0.7071, 0, 0.7071, 0, 0, 0, 0, 1)'
    const comPerspectiva = 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -0.00125, 0, 0, 0, 1)'
    for (const transform of [rotacaoX, rotacaoY, comPerspectiva]) {
      const r = tresD([noCom({ transform })])
      assert.equal(r.ok, false, transform)
      assert.match(r.motivo, /transform 3D/)
    }
  })

  it('R6: a propriedade rotate em 2D passa (none, ângulo, eixo z); em X ou Y falha', () => {
    for (const rotate of ['none', '30deg', '0.5turn', '-1.2rad', '45grad', '0', 'z 30deg', '0 0 1 30deg', '0 0 -1 30deg']) {
      assert.equal(tresD([noCom({ rotate })]).ok, true, rotate)
    }
    for (const rotate of ['x 30deg', 'y 30deg', 'X 30deg', '1 0 0 30deg', '0 1 0 30deg', '1 1 0 30deg', '1 1 1 30deg', '0 -1 0 0.5turn']) {
      const r = tresD([noCom({ rotate })])
      assert.equal(r.ok, false, rotate)
      assert.match(r.motivo, /rotate 3D/)
    }
  })

  it('R6: rotate ausente, vazio ou ilegível falha fechado', () => {
    for (const rotate of [undefined, '', 'tombado', '30', 'x', 'w 30deg', '1 0 30deg', '1 0 0 0 30deg', 'x y 30deg', 'NaNdeg']) {
      const r = tresD([noCom({ rotate })])
      assert.equal(r.ok, false, String(rotate))
      assert.match(r.motivo, /rotate (ausente|ilegível)/)
    }
  })

  it('falha fechado: nenhum nó, nó sem estilo, leituras ausentes e transform ilegível', () => {
    assert.equal(tresD([]).ok, false)
    assert.equal(tresD(undefined).ok, false)
    assert.equal(tresD([{ tag: 'div', visivel: true }]).ok, false)
    assert.equal(tresD([noCom({ perspective: undefined })]).ok, false)
    assert.equal(tresD([noCom({ perspective: '' })]).ok, false)
    assert.equal(tresD([noCom({ transformStyle: undefined })]).ok, false)
    assert.equal(tresD([noCom({ transformStyle: 'strange' })]).ok, false)
    assert.equal(tresD([noCom({ transform: undefined })]).ok, false)
    assert.equal(tresD([noCom({ transform: 'rotateX(45deg)' })]).ok, false)
    assert.equal(tresD([noCom({ transform: 'matrix3d(1, 0, 0)' })]).ok, false)
    assert.equal(tresD([noCom({ transform: 'matrix(1, 0, NaN, 1, 0, 0)' })]).ok, false)
  })
})

describe('avaliarTudo e resumo', () => {
  const conforme = () => [
    criar({ tag: 'section', texto: '', m: { filhoDeMain: true } }),
    criar({ texto: 'Sono do bebê' }),
    criar({ tag: 'button', texto: 'Ver sessão', rect: { x: 0, y: 0, w: 120, h: 56 }, m: { interativo: true } }),
  ]

  it('devolve as sete regras na ordem, todas com bloqueia: true', () => {
    const resultados = avaliarTudo({ doc: doc1440, nos: conforme(), tema: 'claro' })
    assert.deepEqual(resultados.map((r) => r.regra), ['G1', 'G11', 'G12', 'FONTES', 'CAIXA', 'SOMBRA', '3D'])
    assert.deepEqual(medir.REGRAS_ORIGINAIS, ['G1', 'G11', 'G12', 'FONTES', 'CAIXA', 'SOMBRA', '3D'])
    for (const r of resultados) {
      assert.equal(r.ok, true, `${r.regra}: ${r.motivo}`)
      assert.equal(r.bloqueia, true)
      // O G11 é a única regra com a chave a mais (alvos_por_rotulo); as outras seguem exatas.
      const chaves = ['bloqueia', 'motivo', 'nos_com_falha', 'ok', 'regra']
      assert.deepEqual(Object.keys(r).sort(), r.regra === 'G11' ? ['alvos_por_rotulo', ...chaves] : chaves)
    }
  })

  it('todas as regras bloqueiam em todos os casos, e a falha nunca sai como "registrada"', () => {
    // DS1:RF-15: a chamada de um argumento segue valendo; os casos sem rota pública ficam com as sete originais.
    for (const caso of ['hoje', 'sessao']) assert.deepEqual(bloqueantesDoCaso(caso), medir.REGRAS_ORIGINAIS)
    // Os casos públicos e o sistema bloqueiam tudo, menos as duas regras só de registro (tabela §5.2).
    for (const caso of ['sistema', 'inicio', 'comofunciona']) {
      const bloqueantes = bloqueantesDoCaso(caso)
      for (const original of medir.REGRAS_ORIGINAIS) assert.ok(bloqueantes.includes(original), `${caso} ${original}`)
    }
    const resultados = avaliarTudo({ doc: { ...doc1440, scrollWidth: 1500 }, nos: [], tema: 'claro' })
    assert.equal(resultados.length, 7)
    assert.ok(resultados.every((r) => r.bloqueia === true))
    assert.ok(resultados.every((r) => r.ok === false)) // sem nós, falha fechado, e G1 com rolagem
  })

  it('resumo: uma linha RESUMO com ok e FALHA', () => {
    const nos = conforme()
    nos[1].estilo.fontFamily = '"Zilla Slab", serif'
    const linha = resumo('hoje_claro_1440.json', avaliarTudo({ doc: doc1440, nos, tema: 'claro' }))
    assert.equal(linha, 'RESUMO hoje_claro_1440.json G1 ok G11 ok G12 ok FONTES FALHA CAIXA ok SOMBRA ok 3D ok')
    assert.doesNotMatch(linha, /registrada/)
  })

  it('resumo: uma regra que não bloqueia sai como "registrada"', () => {
    assert.equal(resumo('a.json', [{ regra: 'G1', ok: false, bloqueia: false }, { regra: '3D', ok: false, bloqueia: true }]), 'RESUMO a.json G1 registrada 3D FALHA')
  })
})

// ---------------------------------------------------------------------------------------------
// O coletor real (o que roda no Chrome) rodando em jsdom com geometria fixa, e a regra pura sobre o
// que ele coleta. O jsdom não mede layout: todo retângulo é 100 × 20, então o que se testa é o que o
// coletor e as regras DECIDEM com a leitura, não a geometria.

const RETANGULO = { x: 0, y: 0, left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20 }
const RETANGULO_DO_ALVO = { ...RETANGULO, width: 120, height: 60, right: 120, bottom: 60 }

// O que um navegador calcula num elemento sem regra própria: fonte, cores e as propriedades das regras novas.
const BASE_JSDOM = `
  html { background-color: ${PAPEL}; }
  * { font-size: 20px; font-weight: 400; font-family: 'Outfit Variable', system-ui, sans-serif; color: ${TINTA}; background-color: ${TRANSPARENTE};
      opacity: 1; transform: none; rotate: none; scale: none; text-transform: none; box-shadow: none; background-image: none;
      perspective: none; transform-style: flat; filter: none; backdrop-filter: none; }`

/**
 * Um `preparar` que muda o que o navegador entrega: `resolver(elemento, pseudo)` devolve um mapa
 * `propriedade-em-kebab → valor` (ou nulo) que vale por cima do estilo calculado. Serve para o que o
 * jsdom não calcula (::placeholder) e para simular uma leitura ausente ('') ou ilegível.
 */
function interceptarEstilo(resolver) {
  return (documento) => {
    const janela = documento.defaultView
    const original = janela.getComputedStyle.bind(janela)
    janela.getComputedStyle = (elemento, pseudo) => {
      const cs = original(elemento) // sem o pseudo: o jsdom não o implementa
      const mapa = resolver(elemento, pseudo)
      if (!mapa) return cs
      return new Proxy(cs, {
        get(alvo, chave) {
          if (chave === 'getPropertyValue') return (nome) => (nome in mapa ? mapa[nome] : alvo.getPropertyValue(nome))
          if (typeof chave === 'string') {
            const kebab = chave.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)
            if (kebab in mapa) return mapa[kebab]
          }
          const valor = Reflect.get(alvo, chave)
          return typeof valor === 'function' ? valor.bind(alvo) : valor
        },
      })
    }
  }
}

/**
 * Faz o getComputedStyle do jsdom se comportar como o do Chrome no que o cssstyle não calcula: as
 * propriedades `rotate`, `scale` e um gradiente em `background-image`. A declaração inline do
 * elemento vale (como na cascata); sem ela, o valor calculado; sem nenhum, o padrão do navegador.
 */
function modelarNavegador(documento) {
  const janela = documento.defaultView
  const original = janela.getComputedStyle.bind(janela)
  const PADRAO = { rotate: 'none', scale: 'none', 'background-image': 'none' }
  janela.getComputedStyle = (elemento) => {
    const cs = original(elemento)
    const inline = typeof elemento.getAttribute === 'function' ? (elemento.getAttribute('style') ?? '') : ''
    const ler = (nome) => {
      const declarado = new RegExp(`(?:^|;)\\s*${nome}\\s*:\\s*([^;]+)`, 'i').exec(inline)
      if (declarado) return declarado[1].trim()
      const calculado = cs.getPropertyValue(nome)
      return calculado !== '' ? calculado : PADRAO[nome]
    }
    return new Proxy(cs, {
      get(alvo, chave) {
        if (chave === 'getPropertyValue') return (nome) => (nome in PADRAO ? ler(nome) : alvo.getPropertyValue(nome))
        if (chave === 'rotate' || chave === 'scale') return ler(chave)
        if (chave === 'backgroundImage') return ler('background-image')
        const valor = Reflect.get(alvo, chave)
        return typeof valor === 'function' ? valor.bind(alvo) : valor
      },
    })
  }
}

/** Troca a leitura de `mapa` nos elementos que casam com `seletor` (só o estilo do próprio elemento). */
const comLeitura = (seletor, mapa) => interceptarEstilo((elemento, pseudo) => (!pseudo && elemento.matches(seletor) ? mapa : null))

/** Junta vários `preparar` em um, na ordem. */
const juntar =
  (...funcoes) =>
  (documento) => {
    for (const funcao of funcoes) funcao(documento)
  }

/** Monta `html` num jsdom, roda o coletor serializado (como o CDP faz) e devolve `{ doc, nos }`. */
function coletarDe(html, preparar = () => undefined, css = '') {
  const dom = new JSDOM(`<!doctype html><html><head><style>${BASE_JSDOM}${css}</style></head><body>${html}</body></html>`, {
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole(), // sem o aviso "not implemented" do ::placeholder
  })
  const { window } = dom
  window.Element.prototype.getBoundingClientRect = () => ({ ...RETANGULO })
  window.Range.prototype.getClientRects = () => [{ ...RETANGULO }]
  window.Range.prototype.getBoundingClientRect = () => ({ ...RETANGULO })
  modelarNavegador(window.document)
  preparar(window.document)
  try {
    // Cópia por JSON, como o CDP devolve (returnByValue): sem isso os arrays são de outro realm.
    return JSON.parse(JSON.stringify(window.eval(`(${coletarNaPagina.toString()})()`)))
  } finally {
    window.close()
  }
}

/** Os alvos de toque do jsdom ficam com 120 × 60 (a geometria fixa de 20 de altura reprovaria G11). */
const alvosGrandes = (documento) => {
  const janela = documento.defaultView
  janela.Element.prototype.getBoundingClientRect = function medir() {
    return this.matches('a, button, input, select, textarea') ? { ...RETANGULO_DO_ALVO } : { ...RETANGULO }
  }
}

// As duas sombras como custom properties de :root. Os gradientes ficam de fora: o jsdom reescreve o valor
// de uma custom property sem espaços ("90%at"), o que o Chrome não faz; a leitura dos gradientes é
// testada na regra pura (doc.tokens).
const TOKENS_NO_CSS = `
  :root { --sombra-flutuante: ${TOKENS_DESIGN.sombraFlutuante}; --sombra-cartao: ${TOKENS_DESIGN.sombraCartao}; }`

const PAGINA_CONFORME = `
  <main>
    <section data-bloco>
      <h1 style="font-family: 'Literata Variable', serif; font-style: italic">Sono do bebê</h1>
      <p>Um parágrafo curto e conforme, com a LGPD e a OMS.</p>
      <figure style="box-shadow: ${TOKENS_DESIGN.sombraCartao}"></figure>
      <div data-midia style="background-image: ${TOKENS_DESIGN.luzEstudio}"></div>
    </section>
    <section><a href="#">Ver sessão</a><label>Nome <input value="Maria"></label></section>
  </main>`

const PAGINA_FORA_DO_SISTEMA = `
  <main>
    <section data-bloco>
      <h1 style="font-family: 'Zilla Slab', Georgia, serif">Sono do bebê</h1>
      <h2 style="text-transform: uppercase">Mamada</h2>
      <p style="box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3)">Um parágrafo.</p>
      <div style="perspective: 800px"><p>Dentro da perspectiva.</p></div>
    </section>
    <section><a href="#">Ver sessão</a></section>
  </main>`

describe('o coletor em jsdom: o que ele lê e o que as regras novas decidem', () => {
  it('uma página com Literata, Outfit e as sombras e gradientes dos tokens passa em todas as regras', () => {
    const lido = coletarDe(PAGINA_CONFORME, alvosGrandes, TOKENS_NO_CSS)
    assert.equal(sombraCanonica(lido.doc.tokens.sombraFlutuante), sombraCanonica(TOKENS_DESIGN.sombraFlutuante))
    assert.equal(lido.doc.tokens.brilhoMel, '')
    const resultados = avaliarTudo({ ...lido, tema: 'claro' })
    for (const r of resultados) assert.equal(r.ok, true, `${r.regra}: ${r.motivo}`)
    assert.equal(resultados.length, 7)
    assert.match(resultados.find((r) => r.regra === 'SOMBRA').motivo, /2 de 4 tokens/)
  })

  it('uma página com Zilla Slab, caixa alta, sombra fora do token e perspective reprova FONTES, CAIXA, SOMBRA e 3D', () => {
    const lido = coletarDe(PAGINA_FORA_DO_SISTEMA, alvosGrandes, TOKENS_NO_CSS)
    const porRegra = Object.fromEntries(avaliarTudo({ ...lido, tema: 'claro' }).map((r) => [r.regra, r]))
    for (const regra of ['FONTES', 'CAIXA', 'SOMBRA', '3D']) assert.equal(porRegra[regra].ok, false, `${regra}: ${porRegra[regra].motivo}`)
    assert.match(porRegra.FONTES.motivo, /Zilla Slab/)
    assert.match(porRegra.CAIXA.motivo, /uppercase/)
    assert.match(porRegra.SOMBRA.motivo, /box-shadow fora dos tokens/)
    assert.match(porRegra['3D'].motivo, /perspective 800px/)
    // O resto não depende disso e continua passando.
    for (const regra of ['G1', 'G11', 'G12']) assert.equal(porRegra[regra].ok, true, `${regra}: ${porRegra[regra].motivo}`)
  })

  it('o coletor lê os campos novos do estilo e as marcas', () => {
    const { nos } = coletarDe('<main><section><p style="perspective: 800px; transform-style: preserve-3d">Texto.</p></section></main>')
    const p = nos.find((no) => no.tag === 'p')
    assert.equal(p.estilo.perspective, '800px')
    assert.equal(p.estilo.transformStyle, 'preserve-3d')
    assert.equal(p.estilo.filter, 'none')
    assert.equal(p.estilo.backdropFilter, 'none')
    assert.equal(p.estilo.boxShadow, 'none')
    assert.match(p.estilo.fontFamily, /Outfit Variable/)
  })

  it('marca os controles da BarraRegistrar (.barra-registrar e [data-barra-registrar]) e só eles', () => {
    const html =
      '<main><section class="barra-registrar" data-barra-registrar=""><button>Sono</button></section><section><button>Fora</button></section></main>'
    const { nos } = coletarDe(html)
    const [dentro, fora] = nos.filter((no) => no.tag === 'button')
    assert.equal(dentro.m.barraRegistrar, true)
    assert.equal(dentro.m.interativo, true)
    assert.equal(fora.m.barraRegistrar, false)
    const soAtributo = coletarDe('<main><div data-barra-registrar=""><a href="#">Mais</a></div></main>').nos.find((no) => no.tag === 'a')
    assert.equal(soAtributo.m.barraRegistrar, true)
  })

  it('o texto e o valor de um controle entram na FONTES e na CAIXA', () => {
    const pagina = (controle) => `<main><section><p>Texto comum.</p>${controle}</section></main>`
    const { nos } = coletarDe(pagina('<input value="Maria" style="font-family: Georgia">'))
    assert.equal(nos.find((no) => no.tag === 'input').textoControle, 'Maria')
    assert.equal(fontes(nos).ok, false)
    assert.equal(caixa(coletarDe(pagina('<input placeholder="DIGITE AQUI">')).nos).ok, false)
    assert.equal(caixa(coletarDe(pagina('<input placeholder="Digite aqui">')).nos).ok, true)
  })

  describe('MAT-48e (coletor): tipo e rótulo do radio e do checkbox', () => {
    // O jsdom mede 100 × 20 para tudo; o alvo grande do rótulo vem de um getBoundingClientRect por elemento.
    const medidas = (documento) => {
      documento.defaultView.Element.prototype.getBoundingClientRect = function medir() {
        if (this.matches('label')) return { ...RETANGULO, x: 10, y: 20, left: 10, top: 20, width: 200, height: 48, right: 210, bottom: 68 }
        if (this.matches('input[type=radio], input[type=checkbox]')) return { ...RETANGULO, width: 13, height: 13, right: 13, bottom: 13 }
        if (this.matches('a, button, select, textarea, input')) return { ...RETANGULO_DO_ALVO }
        return { ...RETANGULO }
      }
    }
    const medidasDeRotulo = medidas
    const lerInput = (html, preparar = medidas) => coletarDe(`<main><section><p>Texto.</p>${html}</section></main>`, preparar).nos.find((no) => no.tag === 'input')

    it('radio dentro de <label>: tipo radio e rotulo.rect do rótulo', () => {
      const no = lerInput('<label class="alvo-toque"><input type="radio" name="a">Mãe</label>')
      assert.equal(no.tipo, 'radio')
      assert.deepEqual(no.rotulo, { rect: { x: 10, y: 20, w: 200, h: 48 } })
      assert.deepEqual(no.rect, { x: 0, y: 0, w: 13, h: 13 })
    })

    it('label[for] também conta, e o checkbox é marcado como checkbox', () => {
      const no = lerInput('<input type="checkbox" id="c1"><label for="c1">Aceito</label>')
      assert.equal(no.tipo, 'checkbox')
      assert.deepEqual(no.rotulo, { rect: { x: 10, y: 20, w: 200, h: 48 } })
    })

    it('sem rótulo: tipo marcado e nenhum rotulo', () => {
      const no = lerInput('<input type="radio" name="b">')
      assert.equal(no.tipo, 'radio')
      assert.equal('rotulo' in no, false)
    })

    it('o rótulo soma a rolagem como o rect do nó', () => {
      const rolar = (documento) => {
        medidas(documento)
        Object.defineProperty(documento.defaultView, 'scrollX', { value: 5, configurable: true })
        Object.defineProperty(documento.defaultView, 'scrollY', { value: 100, configurable: true })
      }
      const no = lerInput('<label><input type="radio" name="c">Mãe</label>', rolar)
      assert.deepEqual(no.rotulo, { rect: { x: 15, y: 120, w: 200, h: 48 } })
    })

    it('com mais de um rótulo vale o maior visível', () => {
      const dois = (documento) => {
        documento.defaultView.Element.prototype.getBoundingClientRect = function medir() {
          if (this.matches('label.pequeno')) return { ...RETANGULO, width: 50, height: 20 }
          if (this.matches('label.grande')) return { ...RETANGULO, width: 200, height: 48 }
          return { ...RETANGULO }
        }
      }
      const no = lerInput('<input type="radio" id="d1"><label for="d1" class="pequeno">a</label><label for="d1" class="grande">b</label>', dois)
      assert.equal(no.rotulo.rect.w, 200)
      assert.equal(no.rotulo.rect.h, 48)
    })

    it('input de texto não leva tipo nem rotulo', () => {
      const no = lerInput('<label>Nome <input type="text" value="Ana"></label>')
      assert.equal('tipo' in no, false)
      assert.equal('rotulo' in no, false)
    })

    it('ponta a ponta: o radio de 13 × 13 num rótulo de 200 × 48 passa o G11; sem rótulo, falha', () => {
      const com = coletarDe('<main><section><button>Ver sessão</button><label><input type="radio" name="e">Mãe</label></section></main>', medidasDeRotulo)
      assert.equal(g11(com.nos, 'claro').ok, true, g11(com.nos, 'claro').motivo)
      const sem = coletarDe('<main><section><button>Ver sessão</button><input type="radio" name="e"></section></main>', medidasDeRotulo)
      const r = g11(sem.nos, 'claro')
      assert.equal(r.ok, false)
      assert.match(r.motivo, /alvo de 13\.0 × 13\.0/)
    })
  })

  it('a senha não vai para a coleta em claro', () => {
    const { nos } = coletarDe('<main><section><p>Texto.</p><input type="password" value="segredo123"></section></main>')
    const senha = nos.find((no) => no.tag === 'input')
    assert.equal(senha.textoControle.includes('segredo'), false)
    assert.equal(senha.textoControle.length, 'segredo123'.length)
  })

  it('o nó ancestral com perspective é lido, e o filho com rotação 3D reprova a regra 3D', () => {
    const html = '<main><section><div style="transform: matrix3d(1, 0, 0, 0, 0, 0.7071, 0.7071, 0, 0, -0.7071, 0.7071, 0, 0, 0, 0, 1)"><p>Texto.</p></div></section></main>'
    const r = tresD(coletarDe(html).nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /transform 3D/)
  })
})

// Os seis achados da revisão, cada um pelo coletor (jsdom) e pela regra, com um controle conforme e
// um caso que falha. `comLeitura` e `interceptarEstilo` simulam o que o navegador entregaria quando
// a leitura vem ausente ('') ou ilegível, e o ::placeholder, que o jsdom não calcula.
describe('R1 (coletor): o texto dos controles entra no contraste do G11', () => {
  const pagina = (controle) => `<main><section><button>Ver sessão</button>${controle}</section></main>`
  const coletar = (controle, preparar) => coletarDe(pagina(controle), juntar(alvosGrandes, preparar ?? (() => undefined)))

  it('controle: o input com o texto em cacau sobre o papel passa', () => {
    const r = g11(coletar('<input value="Maria">').nos, 'claro')
    assert.equal(r.ok, true, r.motivo)
  })

  it('o input com a cor do texto igual à do fundo (1:1) falha, pelo coletor e pela regra', () => {
    const { nos } = coletar('<input value="Maria" style="color: rgb(248, 246, 235); background-color: rgb(248, 246, 235)">')
    const input = nos.find((no) => no.tag === 'input')
    assert.equal(input.textoControle, 'Maria')
    const r = g11(nos, 'claro')
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /input "Maria": contraste 1\.00:1/)
  })

  it('o select e o textarea com o mesmo defeito também falham', () => {
    const ruim = 'style="color: rgb(248, 246, 235); background-color: rgb(248, 246, 235)"'
    assert.equal(g11(coletar(`<select ${ruim}><option selected>Mãe</option></select>`).nos, 'claro').ok, false)
    assert.equal(g11(coletar(`<textarea ${ruim}>Recado</textarea>`).nos, 'claro').ok, false)
  })

  it('o placeholder lê o estilo do ::placeholder: com cor legível passa e com cor igual ao fundo falha', () => {
    const dica = (cor) => interceptarEstilo((elemento, pseudo) => (pseudo === '::placeholder' ? { color: cor, 'font-size': '20px', 'font-weight': '400' } : null))
    const bom = coletar('<input placeholder="Seu nome">', dica('rgb(43, 35, 32)'))
    const input = bom.nos.find((no) => no.tag === 'input')
    assert.equal(input.textoControle, 'Seu nome')
    assert.equal(input.estiloTexto.origem, 'placeholder')
    assert.equal(input.estiloTexto.color, 'rgb(43, 35, 32)')
    assert.equal(g11(bom.nos, 'claro').ok, true)
    const ruim = coletar('<input placeholder="Seu nome">', dica('rgb(248, 246, 235)'))
    const r = g11(ruim.nos, 'claro')
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /input "Seu nome": contraste 1\.00:1/)
  })

  it('com valor preenchido o estilo do ::placeholder não entra (estiloTexto ausente)', () => {
    const { nos } = coletar('<input value="Ana" placeholder="Seu nome">')
    assert.equal(nos.find((no) => no.tag === 'input').estiloTexto, undefined)
  })
})

// O ::placeholder tem estilo próprio: opacidade, família e caixa. O que se vê no campo vazio é o dele,
// e o coletor o lê por getComputedStyle(el, '::placeholder') (no jsdom, `interceptarEstilo` o simula).
const ESTILO_DA_DICA = {
  origem: 'placeholder',
  color: TINTA,
  fontSize: '20px',
  fontWeight: '400',
  fontFamily: '"Outfit Variable", system-ui, sans-serif',
  textTransform: 'none',
  opacity: '1',
  opacidadeCadeia: 1,
}
/** Um input vazio que mostra o placeholder, com o estilo do ::placeholder em `estiloTexto`. */
const campoComDica = (estiloTexto = {}, extra = {}) =>
  criar({ tag: 'input', texto: '', textoControle: 'Seu nome', rect: { x: 0, y: 0, w: 200, h: 48 }, m: { interativo: true }, estiloTexto: { ...ESTILO_DA_DICA, ...estiloTexto }, ...extra })
/** O que o navegador entregaria para `input::placeholder`: `mapa` (kebab) vale por cima; o resto vem do campo. */
const dicaCom = (mapa) => interceptarEstilo((elemento, pseudo) => (pseudo === '::placeholder' ? mapa : null))
const paginaComCampo = (campo) => `<main><section><button>Ver sessão</button><p>Texto.</p>${campo}</section></main>`
const coletarCampo = (campo, preparar) => coletarDe(paginaComCampo(campo), juntar(alvosGrandes, preparar ?? (() => undefined)))
const DICA_BOA = { color: 'rgb(43, 35, 32)', opacity: '1' }

describe('R1 (placeholder): o contraste usa a opacidade efetiva do ::placeholder', () => {
  const alvoBom = criar({ tag: 'button', rect: { x: 32, y: 0, w: 44, h: 44 }, m: { interativo: true } })

  it('regra: opacidade 1 passa; 0,1 reprova com o contraste efetivo (~1,21:1), não com o da cor (14,20:1)', () => {
    assert.equal(g11([alvoBom, campoComDica()], 'claro').ok, true)
    const r = g11([alvoBom, campoComDica({ opacity: '0.1' })], 'claro')
    assert.equal(r.ok, false)
    assert.match(r.motivo, /input "Seu nome": contraste 1\.2\d:1/)
  })

  it('regra: a opacidade compõe com o alfa da cor e com a cadeia de opacidade do controle', () => {
    // Cor com alfa 0,5 e opacidade 0,2: alfa efetivo 0,1.
    assert.equal(g11([alvoBom, campoComDica({ color: 'rgba(43, 35, 32, 0.5)', opacity: '0.2' })], 'claro').ok, false)
    assert.equal(g11([alvoBom, campoComDica({ color: 'rgba(43, 35, 32, 0.9)', opacity: '1' })], 'claro').ok, true)
    assert.equal(g11([alvoBom, campoComDica({ color: 'rgba(43, 35, 32, 0.5)', opacity: '1' })], 'claro').ok, false)
    // Opacidade do ::placeholder 1 e a do controle (com os ancestrais) 0,2: reprova; 1: passa.
    assert.equal(g11([alvoBom, campoComDica({ opacidadeCadeia: 0.2 })], 'claro').ok, false)
    assert.equal(g11([alvoBom, campoComDica({ opacidadeCadeia: 1 })], 'claro').ok, true)
    // As duas juntas: 0,5 × 0,5 = 0,25.
    assert.equal(g11([alvoBom, campoComDica({ opacity: '0.5', opacidadeCadeia: 0.5 })], 'claro').ok, false)
  })

  it('regra: opacidade ausente, vazia, ilegível ou fora de 0 a 1 reprova com o motivo', () => {
    for (const opacity of [undefined, '', '   ', 'abc', 'NaN', '1.5', '-0.2']) {
      const r = g11([alvoBom, campoComDica({ opacity })], 'claro')
      assert.equal(r.ok, false, String(opacity))
      assert.match(r.motivo, /opacity do ::placeholder ausente ou ilegível/)
    }
    for (const opacidadeCadeia of [undefined, null, Number.NaN, 'x', -1, 3]) {
      const r = g11([alvoBom, campoComDica({ opacidadeCadeia })], 'claro')
      assert.equal(r.ok, false, String(opacidadeCadeia))
      assert.match(r.motivo, /opacidade da cadeia do controle ilegível/)
    }
  })

  it('regra: o campo preenchido (sem estiloTexto) conta como antes, sem opacidade do placeholder', () => {
    const preenchido = criar({ tag: 'input', texto: '', textoControle: 'Maria', rect: { x: 0, y: 0, w: 200, h: 48 }, m: { interativo: true } })
    assert.equal(g11([alvoBom, preenchido], 'claro').ok, true)
  })

  it('coletor: placeholder com opacity 0,1 reprova; com opacity 1 passa, e o coletor entrega a opacidade', () => {
    const bom = coletarCampo('<input placeholder="Seu nome">', dicaCom(DICA_BOA))
    const campoBom = bom.nos.find((no) => no.tag === 'input')
    assert.equal(campoBom.estiloTexto.opacity, '1')
    assert.equal(campoBom.estiloTexto.opacidadeCadeia, 1)
    assert.equal(g11(bom.nos, 'claro').ok, true)

    const ruim = coletarCampo('<input placeholder="Seu nome">', dicaCom({ ...DICA_BOA, opacity: '0.1' }))
    assert.equal(ruim.nos.find((no) => no.tag === 'input').estiloTexto.opacity, '0.1')
    const r = g11(ruim.nos, 'claro')
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /input "Seu nome": contraste 1\.2\d:1/)
  })

  it('coletor: a opacidade do próprio campo e a de um ancestral entram na cadeia', () => {
    const doCampo = coletarCampo('<input placeholder="Seu nome" style="opacity: 0.2">', dicaCom(DICA_BOA))
    assert.equal(doCampo.nos.find((no) => no.tag === 'input').estiloTexto.opacidadeCadeia, 0.2)
    assert.equal(g11(doCampo.nos, 'claro').ok, false)
    const doAncestral = coletarCampo('<div style="opacity: 0.2"><input placeholder="Seu nome"></div>', dicaCom(DICA_BOA))
    assert.equal(doAncestral.nos.find((no) => no.tag === 'input').estiloTexto.opacidadeCadeia, 0.2)
    assert.equal(g11(doAncestral.nos, 'claro').ok, false)
    const dosDois = coletarCampo('<div style="opacity: 0.5"><input placeholder="Seu nome" style="opacity: 0.5"></div>', dicaCom(DICA_BOA))
    assert.equal(dosDois.nos.find((no) => no.tag === 'input').estiloTexto.opacidadeCadeia, 0.25)
    assert.equal(g11(coletarCampo('<div style="opacity: 1"><input placeholder="Seu nome"></div>', dicaCom(DICA_BOA)).nos, 'claro').ok, true)
  })

  it('coletor: opacity do ::placeholder ausente ou ilegível falha fechado', () => {
    for (const opacity of ['', 'abc']) {
      const r = g11(coletarCampo('<input placeholder="Seu nome">', dicaCom({ ...DICA_BOA, opacity })).nos, 'claro')
      assert.equal(r.ok, false, opacity)
      assert.match(r.motivo, /opacity do ::placeholder ausente ou ilegível/)
    }
  })

  it('coletor: com o campo preenchido o placeholder não é visível e a opacidade dele não conta', () => {
    const { nos } = coletarCampo('<input value="Ana" placeholder="Seu nome">', dicaCom({ ...DICA_BOA, opacity: '0.1' }))
    assert.equal(nos.find((no) => no.tag === 'input').estiloTexto, undefined)
    assert.equal(g11(nos, 'claro').ok, true)
  })
})

describe('R7 (placeholder): a família do ::placeholder também é FONTES', () => {
  it('regra: Outfit passa; Georgia, Zilla Slab depois de Outfit e Literata com fora da lista reprovam', () => {
    assert.equal(fontes([criar(), campoComDica()]).ok, true)
    assert.equal(fontes([criar(), campoComDica({ fontFamily: '"Literata Variable", serif' })]).ok, true)
    const r = fontes([criar(), campoComDica({ fontFamily: 'Georgia, serif' })])
    assert.equal(r.ok, false)
    assert.match(r.motivo, /Georgia/)
    assert.equal(r.nos_com_falha.length, 1)
    assert.equal(fontes([criar(), campoComDica({ fontFamily: '"Outfit Variable", "Zilla Slab", sans-serif' })]).ok, false)
  })

  it('regra: font-family ausente do placeholder visível falha fechado, com o motivo', () => {
    for (const fontFamily of [undefined, '', '   ', ' , ']) {
      const r = fontes([criar(), campoComDica({ fontFamily })])
      assert.equal(r.ok, false, JSON.stringify(fontFamily))
      assert.match(r.motivo, /font-family do ::placeholder ausente/)
    }
  })

  it('coletor: placeholder com Georgia reprova, com Outfit passa, sem família falha fechado', () => {
    assert.equal(fontes(coletarCampo('<input placeholder="Seu nome">', dicaCom({ 'font-family': "'Outfit Variable', system-ui, sans-serif" })).nos).ok, true)
    const georgia = coletarCampo('<input placeholder="Seu nome">', dicaCom({ 'font-family': 'Georgia, serif' }))
    assert.match(georgia.nos.find((no) => no.tag === 'input').estiloTexto.fontFamily, /Georgia/)
    const r = fontes(georgia.nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /Georgia/)
    const semFamilia = fontes(coletarCampo('<input placeholder="Seu nome">', dicaCom({ 'font-family': '' })).nos)
    assert.equal(semFamilia.ok, false, semFamilia.motivo)
    assert.match(semFamilia.motivo, /font-family do ::placeholder ausente/)
  })

  it('coletor: com o campo preenchido a família do placeholder não conta', () => {
    const { nos } = coletarCampo('<input value="Ana" placeholder="Seu nome">', dicaCom({ 'font-family': 'Georgia, serif' }))
    assert.equal(fontes(nos).ok, true)
  })
})

describe('R8 (placeholder): o text-transform do ::placeholder também é CAIXA', () => {
  it('regra: none e capitalize passam; uppercase reprova mesmo com o texto em minúsculas', () => {
    for (const textTransform of ['none', 'capitalize', 'lowercase']) assert.equal(caixa([criar(), campoComDica({ textTransform })]).ok, true, textTransform)
    const r = caixa([criar(), campoComDica({ textTransform: 'uppercase' })])
    assert.equal(r.ok, false)
    assert.match(r.motivo, /input "Seu nome": text-transform uppercase \(::placeholder\)/)
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('regra: text-transform ausente ou vazio do placeholder visível falha fechado, com o motivo', () => {
    for (const textTransform of [undefined, '', '   ']) {
      const r = caixa([criar(), campoComDica({ textTransform })])
      assert.equal(r.ok, false, JSON.stringify(textTransform))
      assert.match(r.motivo, /text-transform do ::placeholder ausente/)
    }
  })

  it('regra: a grafia em caixa alta do placeholder continua valendo (siglas da lista à parte)', () => {
    assert.equal(caixa([criar(), campoComDica({}, { textoControle: 'MARIA' })]).ok, false)
    assert.equal(caixa([criar(), campoComDica({}, { textoControle: 'Informe a LGPD' })]).ok, true)
  })

  it('coletor: placeholder com text-transform uppercase reprova (MARIA em maiúsculas), com none passa', () => {
    const bom = coletarCampo('<input placeholder="Maria">', dicaCom({ 'text-transform': 'none' }))
    assert.equal(bom.nos.find((no) => no.tag === 'input').estiloTexto.textTransform, 'none')
    assert.equal(caixa(bom.nos).ok, true)
    const ruim = coletarCampo('<input placeholder="Maria">', dicaCom({ 'text-transform': 'uppercase' }))
    const r = caixa(ruim.nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /text-transform uppercase \(::placeholder\)/)
  })

  it('coletor: text-transform vazio do placeholder falha fechado; com o campo preenchido não conta', () => {
    const vazio = caixa(coletarCampo('<input placeholder="Maria">', dicaCom({ 'text-transform': '' })).nos)
    assert.equal(vazio.ok, false, vazio.motivo)
    assert.match(vazio.motivo, /text-transform do ::placeholder ausente/)
    const preenchido = coletarCampo('<input value="Ana" placeholder="Maria">', dicaCom({ 'text-transform': 'uppercase' })).nos
    assert.equal(caixa(preenchido).ok, true)
  })
})

describe('R2 (coletor): leitura ausente ou ilegível falha, e o valor válido passa', () => {
  const PAGINA = '<main><section data-bloco><p>Texto.</p><a href="#">Ver</a></section></main>'

  it('G11: fontSize ou fontWeight ausentes no coletor falham; o controle conforme passa', () => {
    assert.equal(g11(coletarDe(PAGINA, alvosGrandes).nos, 'claro').ok, true)
    const semTamanho = g11(coletarDe(PAGINA, juntar(alvosGrandes, comLeitura('p', { 'font-size': '' }))).nos, 'claro')
    assert.equal(semTamanho.ok, false)
    assert.match(semTamanho.motivo, /font-size ausente/)
    const semPeso = g11(coletarDe(PAGINA, juntar(alvosGrandes, comLeitura('p', { 'font-weight': '' }))).nos, 'claro')
    assert.equal(semPeso.ok, false)
    assert.match(semPeso.motivo, /font-weight ausente/)
  })

  it('G12: transform ausente no coletor falha; none passa', () => {
    assert.equal(g12(coletarDe(PAGINA).nos).ok, true)
    const r = g12(coletarDe(PAGINA, comLeitura('section', { transform: '' })).nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /transform ausente/)
  })

  it('CAIXA: text-transform vazio no coletor falha; none passa', () => {
    assert.equal(caixa(coletarDe(PAGINA).nos).ok, true)
    const r = caixa(coletarDe(PAGINA, comLeitura('p', { 'text-transform': '' })).nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /text-transform ausente/)
  })

  it('SOMBRA: background-image ilegível no coletor falha; none e gradiente do token passam', () => {
    assert.equal(sombra(coletarDe(PAGINA).nos, doc1440).ok, true)
    const comToken = coletarDe(PAGINA.replace('<p>', `<p style="background-image: ${TOKENS_DESIGN.luzEstudio}">`))
    assert.match(comToken.nos.find((no) => no.tag === 'p').estilo.backgroundImage, /radial-gradient/)
    assert.equal(sombra(comToken.nos, doc1440).ok, true)
    const r = sombra(coletarDe(PAGINA, comLeitura('p', { 'background-image': 'garbage' })).nos, doc1440)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /background-image ilegível/)
  })
})

describe('R3 (coletor): caixa alta com dígito reprova; código hexadecimal e H1/A11Y passam', () => {
  const com = (texto) => coletarDe(`<main><section><p>${texto}</p></section></main>`).nos

  it('controle: #EADDC5, #2B2320, H1 e A11Y passam', () => {
    for (const texto of ['#EADDC5', '#2B2320', '#fff', 'H1', 'A11Y']) assert.equal(caixa(com(texto)).ok, true, texto)
  })

  it('CADASTRAR2 falha, também dentro de uma frase', () => {
    for (const texto of ['CADASTRAR2', 'Toque em CADASTRAR2 agora']) {
      const r = caixa(com(texto))
      assert.equal(r.ok, false, texto)
      assert.match(r.motivo, /CADASTRAR/)
    }
  })
})

describe('R4 (coletor): toda família da pilha conta', () => {
  const com = (pilha) => coletarDe(`<main><section><p>Texto.</p><p style="font-family: ${pilha}">Outro.</p></section></main>`).nos

  it('controle: Outfit com fallbacks genéricos passa', () => {
    const r = fontes(com("'Outfit Variable', system-ui, sans-serif"))
    assert.equal(r.ok, true, r.motivo)
  })

  it('Outfit seguida de Zilla Slab e Georgia falha, e o motivo cita as duas', () => {
    const nos = com("'Outfit Variable', 'Zilla Slab', Georgia, sans-serif")
    assert.deepEqual(familiasDe(nos.filter((no) => no.tag === 'p')[1].estilo.fontFamily).filter((nome) => !/Outfit/.test(nome)).slice(0, 2), ['Zilla Slab', 'Georgia'])
    const r = fontes(nos)
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /Zilla Slab/)
    assert.match(r.motivo, /Georgia/)
  })
})

describe('R5 (coletor): o html e o body entram na coleta', () => {
  const PAGINA = '<main><section data-bloco><p>Texto.</p><a href="#">Ver</a></section></main>'
  const nosDe = (preparar, css) => coletarDe(PAGINA, juntar(alvosGrandes, preparar ?? (() => undefined)), css).nos
  const noRaiz = (nos, tag) => nos.find((no) => no.tag === tag)
  const estiloEmLinha = (tag, estilo) => (documento) => {
    const el = tag === 'html' ? documento.documentElement : documento.body
    el.setAttribute('style', estilo)
  }

  it('controle: com as raízes na coleta, todas as regras continuam passando e elas não viram bloco nem alvo', () => {
    const nos = nosDe()
    assert.deepEqual(nos.slice(0, 2).map((no) => no.tag), ['html', 'body'])
    for (const tag of ['html', 'body']) {
      const raiz = noRaiz(nos, tag)
      assert.ok(raiz.estilo, tag)
      assert.equal(raiz.m.interativo || raiz.m.filhoDeMain || raiz.m.filhoDeBloco || raiz.m.blocoG12, false, tag)
      assert.equal(raiz.ancestrais, undefined, tag)
    }
    const resultados = avaliarTudo({ doc: { ...doc1440, scrollWidth: 0, clientWidth: 0 }, nos, tema: 'claro' })
    for (const r of resultados) assert.equal(r.ok, true, `${r.regra}: ${r.motivo}`)
  })

  it('body com perspective falha a regra 3D; html com perspective também', () => {
    for (const tag of ['body', 'html']) {
      const r = tresD(nosDe(undefined, `${tag} { perspective: 800px; }`))
      assert.equal(r.ok, false, `${tag}: ${r.motivo}`)
      assert.match(r.motivo, new RegExp(`^${tag}: perspective 800px`))
    }
  })

  it('sombra e gradiente fora dos tokens no html ou no body falham a SOMBRA; a sombra do token passa', () => {
    for (const tag of ['html', 'body']) {
      const sombraRuim = sombra(nosDe(estiloEmLinha(tag, 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3)')), doc1440)
      assert.equal(sombraRuim.ok, false, `${tag}: ${sombraRuim.motivo}`)
      assert.match(sombraRuim.motivo, new RegExp(`^${tag}: box-shadow fora dos tokens`))
      const gradienteRuim = sombra(nosDe(estiloEmLinha(tag, 'background-image: linear-gradient(rgb(255, 255, 255), rgb(0, 0, 0))')), doc1440)
      assert.equal(gradienteRuim.ok, false, `${tag}: ${gradienteRuim.motivo}`)
      assert.match(gradienteRuim.motivo, new RegExp(`^${tag}: gradiente fora dos tokens`))
      const doToken = sombra(nosDe(estiloEmLinha(tag, `box-shadow: ${TOKENS_DESIGN.sombraCartao}; background-image: ${TOKENS_DESIGN.luzEstudio}`)), doc1440)
      assert.equal(doToken.ok, true, `${tag}: ${doToken.motivo}`)
    }
  })

  it('texto solto no body entra na FONTES: pilha fora do conjunto falha, Outfit passa', () => {
    const solto = (estilo) =>
      coletarDe('<main><section data-bloco><p>Texto.</p></section></main>', (documento) => {
        documento.body.insertBefore(documento.createTextNode('Rodapé solto'), documento.body.firstChild)
        documento.body.setAttribute('style', estilo)
      }).nos
    const ruim = solto("font-family: 'Zilla Slab', Georgia, serif")
    assert.equal(noRaiz(ruim, 'body').texto, 'Rodapé solto')
    assert.equal(fontes(ruim).ok, false)
    assert.equal(fontes(solto("font-family: 'Outfit Variable', sans-serif")).ok, true)
  })
})

describe('R6 (coletor): as propriedades individuais rotate e scale', () => {
  const PAGINA = (estiloDoBloco = '', estiloDoEnvoltorio = '') =>
    `<main><section data-bloco><p>Texto.</p></section><section><div style="${estiloDoEnvoltorio}"><div data-midia style="${estiloDoBloco}"></div></div></section></main>`
  const nosDe = (estiloDoBloco, estiloDoEnvoltorio) => coletarDe(PAGINA(estiloDoBloco, estiloDoEnvoltorio)).nos
  const midia = (nos) => nos.find((no) => no.tag === 'div' && no.m.blocoG12 && no.rect)

  it('controle: sem rotate nem scale (none) todas as regras de transformação passam', () => {
    const nos = nosDe()
    assert.equal(midia(nos).estilo.scale, 'none')
    assert.equal(midia(nos).estilo.rotate, 'none')
    assert.equal(g12(nos).ok, true)
    assert.equal(tresD(nos).ok, true)
  })

  it('rotate em X ou Y falha a regra 3D; rotate 2D passa', () => {
    for (const rotate of ['x 30deg', 'y 45deg', '1 0 0 30deg', '0 1 0 30deg']) {
      const r = tresD(nosDe(`rotate: ${rotate}`))
      assert.equal(r.ok, false, rotate)
      assert.match(r.motivo, /rotate 3D/)
    }
    for (const rotate of ['30deg', 'z 30deg', '0 0 1 30deg']) assert.equal(tresD(nosDe(`rotate: ${rotate}`)).ok, true, rotate)
  })

  it('scale diferente de 1 no próprio bloco falha o G12; scale: 1 passa', () => {
    const r = g12(nosDe('scale: 1.2'))
    assert.equal(r.ok, false, r.motivo)
    assert.match(r.motivo, /propriedade scale/)
    assert.equal(g12(nosDe('scale: 1')).ok, true)
  })

  it('o scale de um ancestral conta como escala efetiva do bloco (e o transform dele também)', () => {
    const doAncestral = g12(nosDe('', 'scale: 0.5'))
    assert.equal(doAncestral.ok, false, doAncestral.motivo)
    assert.match(doAncestral.motivo, /ancestral com escala 0\.500 × 0\.500/)
    const doTransform = g12(nosDe('', 'transform: matrix(0.5, 0, 0, 0.5, 0, 0)'))
    assert.equal(doTransform.ok, false)
    assert.equal(g12(nosDe('', 'scale: 1')).ok, true)
  })

  it('falha fechado quando o valor não dá para ler: scale e rotate ausentes ou ilegíveis', () => {
    const ilegivel = g12(coletarDe(PAGINA(), comLeitura('[data-midia]', { scale: 'enorme' })).nos)
    assert.equal(ilegivel.ok, false, ilegivel.motivo)
    assert.match(ilegivel.motivo, /scale ilegível/)
    const doAncestral = g12(coletarDe(PAGINA(), comLeitura('div:not([data-midia])', { scale: 'enorme' })).nos)
    assert.equal(doAncestral.ok, false, doAncestral.motivo)
    assert.match(doAncestral.motivo, /ancestrais ilegível/)
    const semRotate = tresD(coletarDe(PAGINA(), comLeitura('[data-midia]', { rotate: 'tombado' })).nos)
    assert.equal(semRotate.ok, false, semRotate.motivo)
    assert.match(semRotate.motivo, /rotate ilegível/)
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

  it('o conteúdo oculto não é descartado: a mídia aninhada com visivel false reprova', () => {
    const { nos } = coletarDe(ANINHADO('opacity: 0; visibility: hidden'))
    nos.find((no) => no.m.blocoG12 && no.estilo.opacity === '0').visivel = false
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

// G12 reprova o bloco oculto. O jsdom não tem `checkVisibility`: a fixture o modela como o Chrome
// (`visibilityProperty: true`): `display: none` no nó ou em um ancestral, ou `visibility` calculada
// `hidden`/`collapse`, deixam o nó invisível.
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
    assert.equal(nos.find((no) => no.m.blocoG12 && no.tag === 'div').visivel, true)
    const r = g12(nos)
    assert.equal(r.ok, true, r.motivo)
  })

  it('visibility:hidden na mídia, com opacity 1 e transform none, reprova com o motivo de oculto', () => {
    const { nos } = coletar(PAGINA('visibility: hidden; opacity: 1; transform: none'))
    const alvo = nos.find((no) => no.m.blocoG12 && no.tag === 'div')
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

  it('um ancestral com visibility:hidden e a mídia filha herdando reprova', () => {
    const { nos } = coletar(PAGINA('', 'visibility: hidden'))
    assert.equal(nos.find((no) => no.m.blocoG12 && no.tag === 'div').visivel, false)
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

describe('rotaDoCaso e rotasDosPedidos', () => {
  const CASOS_CDP = { comofunciona: { rota: 'como-funciona' }, pagina_2: { rota: '/pagina-2' }, semrota: {} }

  it('os casos fixos têm a sua rota, com ou sem CASOS do cdp', () => {
    assert.equal(rotaDoCaso('sistema', null), 'sistema')
    assert.equal(rotaDoCaso('inicio', null), '')
    assert.equal(rotaDoCaso('hoje', CASOS_CDP), 'app/hoje')
    assert.equal(rotaDoCaso('sessao', undefined), 'app/hoje')
  })

  it('os outros casos vêm de CASOS (a barra inicial cai)', () => {
    assert.equal(rotaDoCaso('comofunciona', CASOS_CDP), 'como-funciona')
    assert.equal(rotaDoCaso('pagina_2', CASOS_CDP), 'pagina-2')
  })

  it('caso sem rota é nulo: desconhecido, sem CASOS, entrada sem rota ou nome de protótipo', () => {
    assert.equal(rotaDoCaso('desconhecido', CASOS_CDP), null)
    assert.equal(rotaDoCaso('comofunciona', null), null)
    assert.equal(rotaDoCaso('comofunciona', {}), null)
    assert.equal(rotaDoCaso('semrota', CASOS_CDP), null)
    assert.equal(rotaDoCaso('constructor', CASOS_CDP), null)
    assert.equal(rotaDoCaso('', CASOS_CDP), null)
    assert.equal(rotaDoCaso(undefined, CASOS_CDP), null)
  })

  it('rotasDosPedidos junta a rota ao pedido e lança erro (uso) para o caso sem rota', () => {
    const pedidos = [
      { caso: 'sistema', tema: 'claro', largura: 1440, altura: 900 },
      { caso: 'comofunciona', tema: 'claro', largura: 390, altura: 844 },
    ]
    assert.deepEqual(
      rotasDosPedidos(pedidos, CASOS_CDP).map((p) => p.rota),
      ['sistema', 'como-funciona'],
    )
    assert.throws(() => rotasDosPedidos([{ caso: 'nada', tema: 'claro', largura: 1, altura: 1 }], CASOS_CDP), /caso sem rota: nada/)
    assert.throws(() => rotasDosPedidos(pedidos, null), /caso sem rota: comofunciona/)
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

  it('aceita qualquer nome de caso em [a-z0-9_]+', () => {
    const { pedidos } = lerArgumentos(['p', 'comofunciona:claro:1440x900', 'pagina_2:madrugada:390x844', '2:claro:768x1024'])
    assert.deepEqual(pedidos, [
      { caso: 'comofunciona', tema: 'claro', largura: 1440, altura: 900 },
      { caso: 'pagina_2', tema: 'madrugada', largura: 390, altura: 844 },
      { caso: '2', tema: 'claro', largura: 768, altura: 1024 },
    ])
  })

  it('o Início em madrugada não é mais erro de uso: o pedido é aceito (o "não se aplica" vem depois)', () => {
    const { pedidos } = lerArgumentos(['p', 'inicio:madrugada:1440x900', 'inicio:madrugada:390x844', 'inicio:claro:390x844'])
    assert.deepEqual(pedidos, [
      { caso: 'inicio', tema: 'madrugada', largura: 1440, altura: 900 },
      { caso: 'inicio', tema: 'madrugada', largura: 390, altura: 844 },
      { caso: 'inicio', tema: 'claro', largura: 390, altura: 844 },
    ])
  })

  it('recusa tema e formato inválidos e o uso sem pedidos', () => {
    assert.throws(() => lerArgumentos(['p', 'sistema:sepia:390x844']), /tema desconhecido/)
    assert.throws(() => lerArgumentos(['p', 'sistema:claro:390']), /argumento inválido/)
    assert.throws(() => lerArgumentos(['p', 'Sistema:claro:390x844']), /argumento inválido/)
    assert.throws(() => lerArgumentos(['p', 'como-funciona:claro:390x844']), /argumento inválido/)
    assert.throws(() => lerArgumentos(['p', ':claro:390x844']), /argumento inválido/)
    assert.throws(() => lerArgumentos(['p', 'pagina_2:claro2:390x844']), /argumento inválido/)
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

describe('MAT-48e: naoSeAplicaSemAbrir (o que não precisa nem de página)', () => {
  it('inicio em madrugada: mensagem clara com o caso e a rota; o resto é nulo', () => {
    const msg = naoSeAplicaSemAbrir({ caso: 'inicio', tema: 'madrugada', rota: '' })
    assert.equal(typeof msg, 'string')
    assert.match(msg, /inicio/)
    assert.match(msg, /madrugada/)
    assert.match(msg, /sempre claro|sem o botão|não tem/)
    assert.equal(naoSeAplicaSemAbrir({ caso: 'inicio', tema: 'claro', rota: '' }), null)
    assert.equal(naoSeAplicaSemAbrir({ caso: 'sistema', tema: 'madrugada', rota: 'sistema' }), null)
    assert.equal(naoSeAplicaSemAbrir({ caso: 'hoje', tema: 'madrugada', rota: 'app/hoje' }), null)
    assert.equal(naoSeAplicaSemAbrir({ caso: 'comofunciona', tema: 'madrugada', rota: 'como-funciona' }), null)
  })
})

// A entrada real: o script como o worker o roda (processo novo, argv, stdout, stderr e código de saída).
// CDP_PORTA aponta para uma porta sem Chrome: o que não precisa de página tem de terminar sem ele.
describe('MAT-48e: o CLI de verdade (spawn)', () => {
  const SCRIPT = fileURLToPath(new URL('./medir-dom.mjs', import.meta.url))
  const temporarias = []
  const pastaTemporaria = (prefixo) => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), prefixo))
    temporarias.push(pasta)
    return pasta
  }
  after(() => {
    for (const pasta of temporarias) fs.rmSync(pasta, { recursive: true, force: true })
  })
  const rodar = (argumentos, { cwd } = {}) => {
    const env = { ...process.env, CDP_PORTA: '1' }
    delete env.BASE_URL
    return spawnSync(process.execPath, [SCRIPT, ...argumentos], { cwd: cwd ?? pastaTemporaria('medir-dom-cwd-'), env, encoding: 'utf8', timeout: 60000 })
  }
  const jsonsEm = (pasta) => fs.readdirSync(pasta).filter((nome) => nome.endsWith('.json'))

  it('inicio:madrugada:390x844 → saída 0, uma linha NAO_SE_APLICA, nenhum JSON e stderr vazio (sem Chrome)', () => {
    const saida = pastaTemporaria('medir-dom-saida-')
    const r = rodar([saida, 'inicio:madrugada:390x844'])
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`)
    const linhas = r.stdout.split(/\r?\n/).filter(Boolean)
    assert.equal(linhas.length, 1, r.stdout)
    assert.match(linhas[0], /^NAO_SE_APLICA inicio_madrugada_390: .+/)
    assert.deepEqual(jsonsEm(saida), [])
    assert.equal(r.stderr, '')
  })

  it('dois pedidos do Início em madrugada → saída 0 e uma linha por pedido', () => {
    const saida = pastaTemporaria('medir-dom-saida-')
    const r = rodar([saida, 'inicio:madrugada:390x844', 'inicio:madrugada:1440x900'])
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`)
    const linhas = r.stdout.split(/\r?\n/).filter(Boolean)
    assert.equal(linhas.length, 2, r.stdout)
    assert.match(linhas[0], /^NAO_SE_APLICA inicio_madrugada_390: /)
    assert.match(linhas[1], /^NAO_SE_APLICA inicio_madrugada_1440: /)
    assert.deepEqual(jsonsEm(saida), [])
    assert.equal(r.stderr, '')
  })

  it('o Chrome só é aberto quando um pedido precisa de página: o "não se aplica" sai antes, e a falha de conexão dá saída 2', () => {
    const saida = pastaTemporaria('medir-dom-saida-')
    const r = rodar([saida, 'inicio:madrugada:390x844', 'sistema:claro:390x844'])
    assert.equal(r.status, 2, `${r.stdout}\n${r.stderr}`)
    assert.match(r.stdout, /^NAO_SE_APLICA inicio_madrugada_390: /m)
    assert.match(r.stderr, /erro de medição/)
    assert.deepEqual(jsonsEm(saida), [])
  })

  it('o que continua erro de uso dá saída 2 e mensagem em stderr, sem NAO_SE_APLICA', () => {
    const saida = pastaTemporaria('medir-dom-saida-')
    const casos = [
      [[saida, 'sistema:sepia:390x844'], /tema desconhecido/],
      [[saida, 'sistema:claro:390'], /argumento inválido/],
      [[saida], /uso:/],
      [[saida, 'semrota:claro:390x844'], /caso sem rota: semrota/],
    ]
    for (const [argumentos, mensagem] of casos) {
      const r = rodar(argumentos) // cwd temporário, sem .oc/cdp.mjs
      assert.equal(r.status, 2, `${argumentos.join(' ')}: ${r.stdout}\n${r.stderr}`)
      assert.match(r.stderr, mensagem)
      assert.doesNotMatch(r.stdout, /NAO_SE_APLICA/)
    }
    assert.deepEqual(jsonsEm(saida), [])
  })

  it('um erro de uso no meio dos pedidos vale para todos: nada de "não se aplica" parcial', () => {
    const r = rodar([pastaTemporaria('medir-dom-saida-'), 'inicio:madrugada:390x844', 'sistema:sepia:390x844'])
    assert.equal(r.status, 2)
    assert.doesNotMatch(r.stdout, /NAO_SE_APLICA/)
  })
})

/**
 * Um cdp falso: grava cada chamada de `enviar` e responde ao Runtime.evaluate pela expressão.
 * `entra` diz se o login leva a /app/ (a leitura de location.pathname).
 * `toggle` diz o que a página tem do modo madrugada, por expressão (o que não está no mapa vale false):
 *   cabecalho  → `[data-cabecalho] button[aria-pressed]` visível (o clique acontece);
 *   menuBotao  → o botão Menu `[data-cabecalho] button[aria-controls][aria-expanded="false"]` visível;
 *   menuToggle → `[data-menu-celular] button[aria-pressed]` visível (só depois de o menu abrir);
 *   fecha      → o botão Menu aberto (`aria-expanded="true"`) que fecha o menu.
 * `tema` é o que `data-tema` mostra depois do clique.
 */
const TOGGLE_NO_CABECALHO = { cabecalho: true, menuBotao: false, menuToggle: false, fecha: true }
// MED-AUTH: `pagina` é o que a conferência do caminho e do h1 lê (a expressão com `h1_texto`), e
// `leitura` é o que o coletor devolve (a expressão com `coletarNaPagina`).
function cdpFalso({ entra = true, toggle = TOGGLE_NO_CABECALHO, tema = 'madrugada', pagina = null, leitura = null } = {}) {
  const chamadas = []
  let enviou = false
  const cdp = {
    chamadas,
    enviar: async (metodo, params = {}) => {
      chamadas.push({ metodo, params })
      if (metodo !== 'Runtime.evaluate') return {}
      const e = String(params.expression)
      if (e.includes('requestSubmit')) enviou = true
      let valor = true
      if (e.includes('h1_texto')) valor = pagina
      else if (e.includes('coletarNaPagina')) valor = leitura
      else if (e.includes('location.pathname')) valor = enviou && entra
      else if (e.includes('getAnimations')) valor = 0
      else if (e.includes("getAttribute('data-tema')")) valor = tema
      else if (e.includes('[data-menu-celular] button[aria-pressed]')) valor = Boolean(toggle.menuToggle)
      else if (e.includes('[data-cabecalho] button[aria-controls][aria-expanded="false"]')) valor = Boolean(toggle.menuBotao)
      else if (e.includes('[data-cabecalho] button[aria-controls][aria-expanded="true"]')) valor = Boolean(toggle.fecha)
      else if (e.includes('[data-cabecalho] button[aria-pressed]')) valor = Boolean(toggle.cabecalho)
      return { result: { value: valor } }
    },
  }
  return cdp
}

const avaliadas = (cdp) => cdp.chamadas.filter((c) => c.metodo === 'Runtime.evaluate').map((c) => String(c.params.expression))

describe('D3: a rota do app entra com a conta de demonstração, sem recarregar', () => {
  it('rotaExigeSessao: só o que começa com app/', () => {
    assert.equal(rotaExigeSessao('app/hoje'), true)
    assert.equal(rotaExigeSessao('app/registro/novo'), true)
    assert.equal(rotaExigeSessao(''), false)
    assert.equal(rotaExigeSessao('sistema'), false)
    assert.equal(rotaExigeSessao('entrar'), false)
    assert.equal(rotaExigeSessao('apple/app/hoje'), false)
  })

  it('(a) rota pública faz só Page.navigate para a URL da rota e nenhum login', async () => {
    const cdp = cdpFalso()
    await abrirCaso(cdp, 'http://127.0.0.1:5244/', { caso: 'sistema', tema: 'claro', rota: 'sistema' })
    const navegacoes = cdp.chamadas.filter((c) => c.metodo === 'Page.navigate')
    assert.deepEqual(navegacoes.map((c) => c.params.url), ['http://127.0.0.1:5244/sistema'])
    const expressoes = avaliadas(cdp)
    assert.ok(!expressoes.some((e) => e.includes('requestSubmit')))
    assert.ok(!expressoes.some((e) => e.includes('pushState')))
  })

  it('(b) app/hoje navega para entrar, faz o login e só então o pushState para /app/hoje', async () => {
    const cdp = cdpFalso()
    await abrirCaso(cdp, 'http://127.0.0.1:5244/', { caso: 'hoje', tema: 'claro', rota: 'app/hoje' })
    const navegacoes = cdp.chamadas.filter((c) => c.metodo === 'Page.navigate')
    assert.deepEqual(navegacoes.map((c) => c.params.url), ['http://127.0.0.1:5244/entrar'])

    const indiceDoNavigate = cdp.chamadas.findIndex((c) => c.metodo === 'Page.navigate')
    const indiceDoLogin = cdp.chamadas.findIndex((c) => c.metodo === 'Runtime.evaluate' && String(c.params.expression).includes('requestSubmit'))
    const indiceDoPush = cdp.chamadas.findIndex((c) => c.metodo === 'Runtime.evaluate' && String(c.params.expression).includes('pushState'))
    assert.ok(indiceDoNavigate >= 0 && indiceDoLogin > indiceDoNavigate && indiceDoPush > indiceDoLogin)

    const login = String(cdp.chamadas[indiceDoLogin].params.expression)
    assert.ok(login.includes('juliana@exemplo.invalid'))
    assert.ok(login.includes('senha-local-ficticia'))
    assert.ok(login.includes('input[type=password]'))
    assert.ok(login.includes("new Event('input', {bubbles:true})") || login.includes("new Event('input', { bubbles: true })"))

    const push = String(cdp.chamadas[indiceDoPush].params.expression)
    assert.ok(push.includes('/app/hoje'))
    assert.ok(push.includes('popstate'))
  })

  it('o pushState usa o caminho da base quando ela não é a raiz', async () => {
    const cdp = cdpFalso()
    await abrirCaso(cdp, 'http://127.0.0.1:5244/site/', { caso: 'hoje', tema: 'claro', rota: 'app/hoje' })
    const push = avaliadas(cdp).find((e) => e.includes('pushState'))
    assert.ok(push.includes('/site/app/hoje'))
    const navegacoes = cdp.chamadas.filter((c) => c.metodo === 'Page.navigate').map((c) => c.params.url)
    assert.deepEqual(navegacoes, ['http://127.0.0.1:5244/site/entrar'])
  })

  it('(c) login que não chega a /app/ falha com erro claro e não navega dentro da SPA', async () => {
    const cdp = cdpFalso({ entra: false })
    await assert.rejects(entrarNaDemonstracao(cdp, 'http://127.0.0.1:5244/', { voltas: 3 }), /não consegui entrar na demonstração/)
    assert.ok(!avaliadas(cdp).some((e) => e.includes('pushState')))
  })

  it('(d) app/sessao em madrugada ainda clica o botão do cabeçalho, depois da entrada', async () => {
    const cdp = cdpFalso()
    await abrirCaso(cdp, 'http://127.0.0.1:5244/', { caso: 'sessao', tema: 'madrugada', rota: 'app/sessao' })
    const expressoes = avaliadas(cdp)
    const indiceDoPush = expressoes.findIndex((e) => e.includes('pushState'))
    const indiceDoBotao = expressoes.findIndex((e) => e.includes('[data-cabecalho] button[aria-pressed]'))
    const indiceDaSessao = expressoes.findIndex((e) => e.includes('Ver sessão'))
    assert.ok(indiceDoPush >= 0)
    assert.ok(indiceDoBotao > indiceDoPush)
    assert.ok(indiceDaSessao > indiceDoBotao)
  })
})

describe('MAT-48e: o modo madrugada pelo cabeçalho, pelo menu do celular ou "não se aplica"', () => {
  const BASE = 'http://127.0.0.1:5244/'
  const BOTAO_DO_CABECALHO = '[data-cabecalho] button[aria-pressed]'
  const BOTAO_DO_MENU = '[data-cabecalho] button[aria-controls][aria-expanded="false"]'
  const FECHA_O_MENU = '[data-cabecalho] button[aria-controls][aria-expanded="true"]'
  const BOTAO_NO_MENU = '[data-menu-celular] button[aria-pressed]'
  const indiceDe = (expressoes, trecho) => expressoes.findIndex((e) => e.includes(trecho))

  it('1440: o botão visível do cabeçalho é clicado e o menu do celular nem é tocado', async () => {
    const cdp = cdpFalso()
    const r = await abrirCaso(cdp, BASE, { caso: 'sistema', tema: 'madrugada', rota: 'sistema' })
    assert.equal(r?.naoSeAplica, undefined)
    const expressoes = avaliadas(cdp)
    assert.ok(indiceDe(expressoes, BOTAO_DO_CABECALHO) >= 0)
    for (const trecho of [BOTAO_DO_MENU, BOTAO_NO_MENU, FECHA_O_MENU]) assert.equal(indiceDe(expressoes, trecho), -1, trecho)
    // O botão só vale se aparece: a expressão confere o checkVisibility e o tamanho.
    const clique = expressoes[indiceDe(expressoes, BOTAO_DO_CABECALHO)]
    assert.match(clique, /checkVisibility/)
    assert.match(clique, /getBoundingClientRect/)
  })

  it('390: sem o botão visível no cabeçalho, abre o Menu, clica o botão do menu e fecha o menu', async () => {
    const cdp = cdpFalso({ toggle: { cabecalho: false, menuBotao: true, menuToggle: true, fecha: true } })
    const r = await abrirCaso(cdp, BASE, { caso: 'sistema', tema: 'madrugada', rota: 'sistema' })
    assert.equal(r?.naoSeAplica, undefined)
    const expressoes = avaliadas(cdp)
    const iCabecalho = indiceDe(expressoes, BOTAO_DO_CABECALHO)
    const iAbre = indiceDe(expressoes, BOTAO_DO_MENU)
    const iToggle = indiceDe(expressoes, BOTAO_NO_MENU)
    const iFecha = indiceDe(expressoes, FECHA_O_MENU)
    const iTema = indiceDe(expressoes, "getAttribute('data-tema')")
    assert.ok(iCabecalho >= 0 && iAbre > iCabecalho && iToggle > iAbre && iFecha > iToggle && iTema > iFecha, JSON.stringify({ iCabecalho, iAbre, iToggle, iFecha, iTema }))
    assert.match(expressoes[iToggle], /checkVisibility/)
    assert.match(expressoes[iAbre], /checkVisibility/)
  })

  it('390: o menu que abre sem botão de tema é fechado de novo, e a rota pública fica "não se aplica"', async () => {
    const cdp = cdpFalso({ toggle: { cabecalho: false, menuBotao: true, menuToggle: false, fecha: true } })
    const r = await abrirCaso(cdp, BASE, { caso: 'comofunciona', tema: 'madrugada', rota: 'como-funciona' })
    assert.ok(typeof r?.naoSeAplica === 'string')
    const expressoes = avaliadas(cdp)
    const iAbre = indiceDe(expressoes, BOTAO_DO_MENU)
    const iToggle = indiceDe(expressoes, BOTAO_NO_MENU)
    const iFecha = indiceDe(expressoes, FECHA_O_MENU)
    assert.ok(iAbre >= 0 && iToggle > iAbre && iFecha > iToggle)
  })

  it('o menu que abre sem botão de tema numa rota logada fecha o menu e reprova', async () => {
    const cdp = cdpFalso({ toggle: { cabecalho: false, menuBotao: true, menuToggle: false, fecha: true } })
    await assert.rejects(abrirCaso(cdp, BASE, { caso: 'hoje', tema: 'madrugada', rota: 'app/hoje' }), /Modo madrugada/)
    assert.ok(indiceDe(avaliadas(cdp), FECHA_O_MENU) > indiceDe(avaliadas(cdp), BOTAO_NO_MENU))
  })

  it('rota pública sem botão em lugar nenhum: devolve { naoSeAplica } com o caso e a rota, sem lançar nem mexer no tema', async () => {
    const cdp = cdpFalso({ toggle: { cabecalho: false, menuBotao: false, menuToggle: false, fecha: false } })
    const r = await abrirCaso(cdp, BASE, { caso: 'comofunciona', tema: 'madrugada', rota: 'como-funciona' })
    assert.equal(typeof r.naoSeAplica, 'string')
    assert.match(r.naoSeAplica, /comofunciona/)
    assert.match(r.naoSeAplica, /como-funciona/)
    assert.equal(indiceDe(avaliadas(cdp), "getAttribute('data-tema')"), -1)
    assert.ok(!avaliadas(cdp).some((e) => e.includes("setAttribute('data-tema'")))
  })

  it('rota logada (app/) em que nada é achado: falha fechado com o motivo e a rota', async () => {
    const cdp = cdpFalso({ toggle: { cabecalho: false, menuBotao: false, menuToggle: false, fecha: false } })
    await assert.rejects(
      abrirCaso(cdp, BASE, { caso: 'hoje', tema: 'madrugada', rota: 'app/hoje' }),
      /não achei o botão "Modo madrugada" nem no cabeçalho nem no menu do celular numa rota logada \(app\/hoje\)/,
    )
  })

  it('depois do clique, o data-tema que não virou madrugada continua reprovando', async () => {
    const cdp = cdpFalso({ tema: 'claro' })
    await assert.rejects(abrirCaso(cdp, BASE, { caso: 'sistema', tema: 'madrugada', rota: 'sistema' }), /o tema não virou madrugada/)
  })

  it('o tema claro não procura botão nenhum', async () => {
    const cdp = cdpFalso()
    const r = await abrirCaso(cdp, BASE, { caso: 'sistema', tema: 'claro', rota: 'sistema' })
    assert.equal(r?.naoSeAplica, undefined)
    const expressoes = avaliadas(cdp)
    for (const trecho of [BOTAO_DO_CABECALHO, BOTAO_DO_MENU, BOTAO_NO_MENU]) assert.equal(indiceDe(expressoes, trecho), -1)
  })

  it('nunca emite uma expressão que põe o data-tema direto, e toda expressão é JavaScript válido', async () => {
    const cenarios = [
      { toggle: TOGGLE_NO_CABECALHO, rota: 'sistema' },
      { toggle: { cabecalho: false, menuBotao: true, menuToggle: true, fecha: true }, rota: 'sistema' },
      { toggle: { cabecalho: false, menuBotao: true, menuToggle: false, fecha: true }, rota: 'sistema' },
      { toggle: { cabecalho: false, menuBotao: false, menuToggle: false, fecha: false }, rota: 'sistema' },
      { toggle: { cabecalho: false, menuBotao: false, menuToggle: false, fecha: false }, rota: 'app/hoje' },
    ]
    for (const { toggle, rota } of cenarios) {
      const cdp = cdpFalso({ toggle })
      await abrirCaso(cdp, BASE, { caso: 'x', tema: 'madrugada', rota }).catch(() => undefined)
      for (const e of avaliadas(cdp)) {
        assert.ok(!e.includes("setAttribute('data-tema'"), e)
        assert.ok(!e.includes('setAttribute("data-tema"'), e)
        assert.doesNotThrow(() => new Function(`return ${e}`), e)
      }
    }
  })

  it('linhaNaoSeAplica: NAO_SE_APLICA <caso>_<tema>_<largura>: <mensagem>', () => {
    assert.equal(
      linhaNaoSeAplica({ caso: 'comofunciona', tema: 'madrugada', largura: 390 }, 'sem botão'),
      'NAO_SE_APLICA comofunciona_madrugada_390: sem botão',
    )
  })
})

// ---------------------------------------------------------------------------------------------
// MED-AUTH: a moderação entra com o moderador da demonstração, e todo caso confere o caminho final e
// o h1 antes de medir (falha fechado).

const BASE_MED = 'http://127.0.0.1:5244/'

/** Uma leitura mínima do coletor, para o caminho feliz do medirPedido no cdp falso. */
const leituraMinima = () => ({ doc: { ...doc1440, tokens: {} }, nos: [criar({ tag: 'h1', texto: 'Denúncias' })] })

describe('MED-AUTH:RF-01 rotaExigeSessao: app/... e moderacao[/...]', () => {
  it("app/..., moderacao e moderacao/... pedem sessão; '', sistema, entrar, apple/app/hoje, moderacaox e x/moderacao não", () => {
    for (const rota of ['app/hoje', 'app/registro/novo', 'moderacao', 'moderacao/auditoria', 'moderacao/denuncia/1']) {
      assert.equal(medir.rotaExigeSessao(rota), true, rota)
    }
    for (const rota of ['', 'sistema', 'entrar', 'apple/app/hoje', 'moderacaox', 'x/moderacao']) {
      assert.equal(medir.rotaExigeSessao(rota), false, rota)
    }
  })
})

describe('MED-AUTH:RF-03 as contas da medição vêm de conta.demonstracao.ts', () => {
  it('os e-mails e a senha das constantes são os de PESSOAS_DEMONSTRACAO e SENHA_DEMONSTRACAO', async () => {
    const fonte = await import('../src/dados/conta.demonstracao.ts')
    assert.ok(fonte.PESSOAS_DEMONSTRACAO.moderador, 'PESSOAS_DEMONSTRACAO.moderador ausente')
    assert.equal(medir.CONTAS_DE_MEDICAO?.responsavel?.email, fonte.PESSOAS_DEMONSTRACAO.responsavel.email)
    assert.equal(medir.CONTAS_DE_MEDICAO?.moderador?.email, fonte.PESSOAS_DEMONSTRACAO.moderador.email)
    assert.equal(medir.SENHA_DE_MEDICAO, fonte.SENHA_DEMONSTRACAO)
    assert.deepEqual(Object.keys(medir.CONTAS_DE_MEDICAO).sort(), ['moderador', 'responsavel'])
  })

  it('a conta padrão: moderador na moderação, responsável no app, nenhuma na rota pública', () => {
    const casos = { fila: { rota: 'moderacao' }, papeis: { rota: '/moderacao/papeis' }, comofunciona: { rota: 'como-funciona' } }
    const pedidos = ['hoje', 'fila', 'papeis', 'comofunciona', 'sistema'].map((caso) => ({ caso, tema: 'claro', largura: 390, altura: 844 }))
    assert.deepEqual(
      medir.rotasDosPedidos(pedidos, casos).map((p) => p.conta),
      ['responsavel', 'moderador', 'moderador', null, null],
    )
  })

  it("conta: 'responsavel' ou 'moderador' no caso troca a padrão; qualquer outro valor é erro de uso", () => {
    const pedido = (caso) => [{ caso, tema: 'claro', largura: 390, altura: 844 }]
    const casos = {
      comojuliana: { rota: 'moderacao', conta: 'responsavel' },
      comodiego: { rota: 'app/hoje', conta: 'moderador' },
      admin: { rota: 'moderacao', conta: 'admin' },
      vazia: { rota: 'moderacao', conta: '' },
      numero: { rota: 'app/hoje', conta: 1 },
      nula: { rota: 'app/hoje', conta: null },
    }
    assert.equal(medir.rotasDosPedidos(pedido('comojuliana'), casos)[0].conta, 'responsavel')
    assert.equal(medir.rotasDosPedidos(pedido('comodiego'), casos)[0].conta, 'moderador')
    for (const caso of ['admin', 'vazia', 'numero', 'nula']) {
      assert.throws(() => medir.rotasDosPedidos(pedido(caso), casos), /conta inválida/, caso)
    }
  })

  it('a moderação entra com o e-mail do moderador e a senha da demonstração, e só depois vai a /moderacao', async () => {
    const cdp = cdpFalso()
    await medir.abrirCaso(cdp, BASE_MED, { caso: 'fila', tema: 'claro', rota: 'moderacao', conta: 'moderador' })
    const expressoes = avaliadas(cdp)
    const login = expressoes.find((e) => e.includes('requestSubmit'))
    assert.ok(login, 'não fez o login')
    assert.ok(login.includes('diego.moderador@exemplo.invalid'))
    assert.ok(!login.includes('juliana@exemplo.invalid'))
    assert.ok(login.includes(medir.SENHA_DE_MEDICAO ?? '<sem senha>'))
    const push = expressoes.findIndex((e) => e.includes('pushState'))
    assert.ok(push > expressoes.indexOf(login))
    assert.ok(expressoes[push].includes("'/moderacao'") || expressoes[push].includes('"/moderacao"'))
  })

  it('sem conta no pedido, a rota da moderação usa o moderador e a do app a responsável', async () => {
    const fila = cdpFalso()
    await medir.abrirCaso(fila, BASE_MED, { caso: 'fila', tema: 'claro', rota: 'moderacao' })
    assert.ok(avaliadas(fila).find((e) => e.includes('requestSubmit')).includes('diego.moderador@exemplo.invalid'))
    const hoje = cdpFalso()
    await medir.abrirCaso(hoje, BASE_MED, { caso: 'hoje', tema: 'claro', rota: 'app/hoje' })
    assert.ok(avaliadas(hoje).find((e) => e.includes('requestSubmit')).includes('juliana@exemplo.invalid'))
  })

  it("conta 'responsavel' na moderação entra como Juliana (o estado SemPermissao do NEW-D)", async () => {
    const cdp = cdpFalso()
    await medir.abrirCaso(cdp, BASE_MED, { caso: 'fila', tema: 'claro', rota: 'moderacao', conta: 'responsavel' })
    const login = avaliadas(cdp).find((e) => e.includes('requestSubmit'))
    assert.ok(login.includes('juliana@exemplo.invalid'))
    assert.ok(!login.includes('diego.moderador@exemplo.invalid'))
  })

  it('entrarNaDemonstracao recusa uma conta desconhecida antes de abrir /entrar', async () => {
    const cdp = cdpFalso()
    await assert.rejects(medir.entrarNaDemonstracao(cdp, BASE_MED, { conta: 'admin' }), /conta inválida/)
    assert.equal(cdp.chamadas.length, 0)
  })
})

describe('MED-AUTH:RF-04 caminhoEsperado e verificarPagina', () => {
  it('caminhoEsperado: a rota do caso, o caminho quando o caso o define, /app/sessao para a sessão, sem busca', () => {
    assert.equal(medir.caminhoEsperado({ caso: 'hoje', rota: 'app/hoje' }, BASE_MED), '/app/hoje')
    assert.equal(medir.caminhoEsperado({ caso: 'sistema', rota: 'sistema' }, BASE_MED), '/sistema')
    assert.equal(medir.caminhoEsperado({ caso: 'inicio', rota: '' }, BASE_MED), '/')
    assert.equal(medir.caminhoEsperado({ caso: 'sessao', rota: 'app/hoje' }, BASE_MED), '/app/sessao')
    assert.equal(medir.caminhoEsperado({ caso: 'fila', rota: 'moderacao' }, BASE_MED), '/moderacao')
    assert.equal(medir.caminhoEsperado({ caso: 'x', rota: 'app/hoje', caminho: 'app/historico' }, BASE_MED), '/app/historico')
    assert.equal(medir.caminhoEsperado({ caso: 'x', rota: 'app/hoje', caminho: '/app/historico' }, BASE_MED), '/app/historico')
    assert.equal(medir.caminhoEsperado({ caso: 'x', rota: 'app/hoje?aba=2' }, BASE_MED), '/app/hoje')
    assert.equal(medir.caminhoEsperado({ caso: 'x', rota: 'moderacao' }, 'http://127.0.0.1:5244/site/'), '/site/moderacao')
  })

  it('rotasDosPedidos leva o caminho do caso, e um caminho que não é texto é erro de uso', () => {
    const casos = { hist: { rota: 'app/hoje', caminho: 'app/historico' }, ruim: { rota: 'app/hoje', caminho: 3 } }
    assert.equal(medir.rotasDosPedidos([{ caso: 'hist', tema: 'claro', largura: 1, altura: 1 }], casos)[0].caminho, 'app/historico')
    assert.throws(() => medir.rotasDosPedidos([{ caso: 'ruim', tema: 'claro', largura: 1, altura: 1 }], casos), /caminho inválido/)
  })

  it('MANCHETE_LOGIN é MANCHETES.entrar de web/src/conteudo/conta.ts', async () => {
    const { MANCHETES } = await import('../src/conteudo/conta.ts')
    assert.equal(medir.MANCHETE_LOGIN, MANCHETES.entrar)
  })

  it('verificarPagina passa com o caminho certo e um h1 que não é o do login, e devolve o que viu', async () => {
    const cdp = cdpFalso({ pagina: { caminho: '/moderacao', h1_texto: '  Denúncias \n' } })
    assert.deepEqual(await medir.verificarPagina(cdp, '/moderacao'), { caminho: '/moderacao', h1_texto: 'Denúncias' })
  })

  it('verificarPagina reprova o caminho diferente (a guarda levou a /entrar, ou a rota errada)', async () => {
    const naEntrada = cdpFalso({ pagina: { caminho: '/entrar', h1_texto: 'Denúncias' } })
    await assert.rejects(medir.verificarPagina(naEntrada, '/moderacao'), /caminho \/entrar, esperado \/moderacao/)
    const outra = cdpFalso({ pagina: { caminho: '/app/hoje', h1_texto: 'Hoje' } })
    await assert.rejects(medir.verificarPagina(outra, '/app/historico'), /caminho \/app\/hoje, esperado \/app\/historico/)
  })

  it('verificarPagina reprova a página sem h1 e o h1 do login, com ou sem espaço entre as linhas', async () => {
    await assert.rejects(medir.verificarPagina(cdpFalso({ pagina: { caminho: '/entrar', h1_texto: null } }), '/entrar'), /sem h1/)
    await assert.rejects(medir.verificarPagina(cdpFalso({ pagina: { caminho: '/entrar', h1_texto: '   ' } }), '/entrar'), /sem h1/)
    // DS1:RF-15: o h1 do login só reprova onde a rota esperada NÃO é uma página de acesso pública (controle: /app/*).
    for (const h1 of ['Pode entrar.', 'Podeentrar.', '\n Pode\n  entrar. ']) {
      const cdp = cdpFalso({ pagina: { caminho: '/app/hoje', h1_texto: h1 } })
      await assert.rejects(medir.verificarPagina(cdp, '/app/hoje'), /h1 do login/, JSON.stringify(h1))
    }
  })

  it('DS1-I-15 verificarPagina aceita o h1 do login nas quatro páginas públicas de acesso e o reprova em /app/*', async () => {
    for (const caminho of ['/entrar', '/criar-conta', '/recuperar-acesso', '/convite']) {
      const cdp = cdpFalso({ pagina: { caminho, h1_texto: 'Pode entrar.' } })
      assert.deepEqual(await medir.verificarPagina(cdp, caminho), { caminho, h1_texto: 'Pode entrar.' }, caminho)
    }
    for (const caminho of ['/app/hoje', '/app/historico', '/app/sessao']) {
      const cdp = cdpFalso({ pagina: { caminho, h1_texto: 'Pode entrar.' } })
      await assert.rejects(medir.verificarPagina(cdp, caminho), /h1 do login/, caminho)
    }
  })

  it('verificarPagina reprova a leitura ilegível (sem objeto ou sem caminho)', async () => {
    await assert.rejects(medir.verificarPagina(cdpFalso({ pagina: null }), '/moderacao'), /caminho/)
    await assert.rejects(medir.verificarPagina(cdpFalso({ pagina: { h1_texto: 'Denúncias' } }), '/moderacao'), /caminho/)
  })
})

describe('MED-AUTH:RF-05 medirPedido falha fechado e não grava JSON', () => {
  const temporarias = []
  after(() => {
    for (const pasta of temporarias) fs.rmSync(pasta, { recursive: true, force: true })
  })
  const pastaNova = () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'medir-dom-med-'))
    temporarias.push(pasta)
    return pasta
  }
  const pedidoFila = { caso: 'fila', tema: 'claro', largura: 1440, altura: 900, rota: 'moderacao', conta: 'moderador' }

  it('caminho diferente do esperado: lança com o caso e o motivo, sem coletar nem gravar', async () => {
    const pasta = pastaNova()
    const cdp = cdpFalso({ pagina: { caminho: '/app/hoje', h1_texto: 'Hoje' }, leitura: leituraMinima() })
    await assert.rejects(medir.medirPedido(cdp, BASE_MED, { ...pedidoFila, caso: 'x', rota: 'app/hoje', caminho: 'app/historico', conta: 'responsavel' }, pasta), /x: .*caminho \/app\/hoje, esperado \/app\/historico/)
    assert.deepEqual(fs.readdirSync(pasta), [])
    assert.ok(!avaliadas(cdp).some((e) => e.includes('coletarNaPagina')))
  })

  it('o h1 do login numa rota do app (DS1:RF-15, antes era a rota entrar): lança e não grava', async () => {
    const pasta = pastaNova()
    const cdp = cdpFalso({ pagina: { caminho: '/app/hoje', h1_texto: 'Pode entrar.' }, leitura: leituraMinima() })
    await assert.rejects(medir.medirPedido(cdp, BASE_MED, { caso: 'login', tema: 'claro', largura: 1440, altura: 900, rota: 'app/hoje', conta: 'responsavel' }, pasta), /login: .*h1 do login/)
    assert.deepEqual(fs.readdirSync(pasta), [])
  })

  it('o login que não sai de /entrar: lança com o caso e não grava', async () => {
    const pasta = pastaNova()
    const cdp = cdpFalso({ entra: false, pagina: { caminho: '/entrar', h1_texto: 'Pode entrar.' }, leitura: leituraMinima() })
    await assert.rejects(medir.medirPedido(cdp, BASE_MED, pedidoFila, pasta, { voltas: 3 }), /fila: .*não consegui entrar na demonstração/)
    assert.deepEqual(fs.readdirSync(pasta), [])
  })

  it('caminho e h1 certos: grava o JSON com a rota, medidas.caminho e medidas.h1_texto', async () => {
    const pasta = pastaNova()
    const cdp = cdpFalso({ pagina: { caminho: '/moderacao', h1_texto: 'Denúncias' }, leitura: leituraMinima() })
    const r = await medir.medirPedido(cdp, BASE_MED, pedidoFila, pasta)
    assert.equal(r.arquivo, 'fila_claro_1440.json')
    const json = JSON.parse(fs.readFileSync(path.join(pasta, 'fila_claro_1440.json'), 'utf8'))
    assert.equal(json.rota, 'moderacao')
    assert.equal(json.medidas.caminho, '/moderacao')
    assert.equal(json.medidas.h1_texto, 'Denúncias')
    assert.ok(Array.isArray(json.resultados) && json.resultados.length === medir.REGRAS_ORIGINAIS.length)
    // A conferência vem antes da coleta.
    const expressoes = avaliadas(cdp)
    assert.ok(expressoes.findIndex((e) => e.includes('h1_texto')) < expressoes.findIndex((e) => e.includes('coletarNaPagina')))
  })
})

// ---------------------------------------------------------------------------------------------
// DS-1a: as regras novas do medidor (FAIXA, PRODUTO, RODAPE, EXIBICAO, ITALICO, TITULO, TITULO_REGISTRO,
// SOBRETITULO, DOCK, CABECALHO, BOTAO_LARGO, CENA, CASA_LIMPA, CASA_LIMPA_REGISTRO, CASA_PRESENTE). Cada uma é
// uma função pura sobre `(nos, doc)` que devolve `{ regra, ok, motivo, nos_com_falha }` e falha fechado.
// Marcas que o coletor dá a cada nó em `no.m` (o contrato do coletor): faixa, faixaLado, produto, produtoTela,
// produtoMoldura, rodape, rodapeGrupo, rodapeTitulo, rodapeNome, link, aviso, noRodape, noCabecalho, noMain, casa,
// casaRaiz, cabecalhoPilula, noMenu, botaoLargo, botaoMel, cenaPlaca, painel, vivo, folha, antesDeTitulo,
// noProduto, titulo. Campos soltos do nó: classes[], fundoSob, tituloId, textoTodo, currentSrc, naturalWidth,
// larguraMax. Estilo lido a mais: fontStyle, position, bottom, borderRadius, paddingTop, paddingBottom,
// textShadow, visibility. Tokens lidos da raiz: doc.tokens.espacoSecao e doc.tokens.fonteExibicao.

const CACAU = TINTA
const AREIA = 'rgb(234, 221, 197)'
const CHAO_NOITE = 'rgb(110, 101, 96)'
const MEL = 'rgb(242, 193, 78)'
const MEL_CLARO = 'rgb(247, 214, 132)'
const EXIBICAO_CHROME = '"Literata Variable", serif'
const OUTFIT_CHROME = '"Outfit Variable", system-ui, sans-serif'
const CASOS_PUBLICOS_ESPERADOS = [
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
const REGRAS_ESPERADAS = [
  'G1',
  'G11',
  'G12',
  'FONTES',
  'CAIXA',
  'SOMBRA',
  '3D',
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

/** O documento de uma medição pública: sem barra de rolagem (clientWidth = largura), com os tokens da raiz. */
const docDs1 = (largura = 1440) => ({
  largura,
  altura: largura >= 1440 ? 900 : 844,
  clientWidth: largura,
  scrollWidth: largura,
  tokens: { espacoSecao: largura >= 768 ? '80px' : '48px', fonteExibicao: "'Literata Variable', serif" },
})

/** Um nó com o que as regras novas leem já no valor de uma página conforme (prumo, sem sombra, estático). */
const no = (extra = {}) =>
  com(
    criar({
      estilo: {
        fontStyle: 'normal',
        textShadow: 'none',
        visibility: 'visible',
        position: 'static',
        bottom: 'auto',
        borderRadius: '0px',
        paddingTop: '0px',
        paddingBottom: '0px',
      },
      classes: [],
    }),
    extra,
  )

/** O resultado puro tem só estas chaves (o `bloqueia` entra no `avaliarTudo`). */
const CHAVES_PURAS = ['motivo', 'nos_com_falha', 'ok', 'regra']

// ---- DS1-I-01 FAIXA ----

const faixaNo = (extra = {}) =>
  com(
    no({
      tag: 'section',
      texto: '',
      rect: { x: 0, y: 0, w: 1440, h: 480 },
      estilo: { backgroundColor: PAPEL, borderRadius: '0px', paddingTop: '80px', paddingBottom: '80px' },
      m: { faixa: true },
    }),
    extra,
  )

describe('DS1-I-01 FAIXA: toca as duas bordas, raio 0, padding de seção, só os quatro chãos', () => {
  const doc = docDs1(1440)

  it('DS1-I-01 FAIXA passa com a faixa de ponta a ponta em cada um dos quatro chãos, e o resultado tem a forma pura', () => {
    for (const chao of [PAPEL, CACAU, AREIA, CHAO_NOITE]) {
      const r = medir.faixa([faixaNo({ estilo: { backgroundColor: chao } })], doc)
      assert.equal(r.ok, true, `${chao}: ${r.motivo}`)
      assert.equal(r.regra, 'FAIXA')
      assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
    }
  })

  it('DS1-I-01 FAIXA: sem nenhuma faixa passa com o motivo "nenhum elemento"', () => {
    const r = medir.faixa([no()], doc)
    assert.equal(r.ok, true)
    assert.match(r.motivo, /nenhum elemento/)
  })

  it('DS1-I-01 FAIXA controle: uma faixa centrada de 1376 px em 1440 (não toca as duas bordas) falha', () => {
    const r = medir.faixa([faixaNo({ rect: { x: 32, y: 0, w: 1376, h: 480 } })], doc)
    assert.equal(r.ok, false)
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('DS1-I-01 FAIXA controle: cada borda sozinha — falta a esquerda ou falta a direita — falha; 1 px de folga passa', () => {
    assert.equal(medir.faixa([faixaNo({ rect: { x: 40, y: 0, w: 1400, h: 480 } })], doc).ok, false)
    assert.equal(medir.faixa([faixaNo({ rect: { x: 0, y: 0, w: 1400, h: 480 } })], doc).ok, false)
    assert.equal(medir.faixa([faixaNo({ rect: { x: 1, y: 0, w: 1439, h: 480 } })], doc).ok, true)
    assert.equal(medir.faixa([faixaNo({ rect: { x: 0, y: 0, w: 1439, h: 480 } })], doc).ok, true)
    assert.equal(medir.faixa([faixaNo({ rect: { x: 0, y: 0, w: 1438, h: 480 } })], doc).ok, false)
  })

  it('DS1-I-01 FAIXA controle: raio 24 falha', () => {
    assert.equal(medir.faixa([faixaNo({ estilo: { borderRadius: '24px' } })], doc).ok, false)
  })

  it('DS1-I-01 FAIXA controle: uma faixa de mel (ou de mel-claro) falha, o mel nunca é chão', () => {
    assert.equal(medir.faixa([faixaNo({ estilo: { backgroundColor: MEL } })], doc).ok, false)
    assert.equal(medir.faixa([faixaNo({ estilo: { backgroundColor: MEL_CLARO } })], doc).ok, false)
    assert.equal(medir.faixa([faixaNo({ estilo: { backgroundColor: 'rgb(255, 255, 255)' } })], doc).ok, false)
  })

  it('DS1-I-01 FAIXA: o padding vertical é o token de seção, com 1 px de folga (80 em 1440, 48 em 390)', () => {
    assert.equal(medir.faixa([faixaNo({ estilo: { paddingTop: '81px', paddingBottom: '79px' } })], doc).ok, true)
    assert.equal(medir.faixa([faixaNo({ estilo: { paddingTop: '82px' } })], doc).ok, false)
    assert.equal(medir.faixa([faixaNo({ estilo: { paddingBottom: '64px' } })], doc).ok, false)
    const celular = docDs1(390)
    const emCelular = (padding) =>
      faixaNo({ rect: { x: 0, y: 0, w: 390, h: 300 }, estilo: { paddingTop: padding, paddingBottom: padding } })
    assert.equal(medir.faixa([emCelular('48px')], celular).ok, true)
    assert.equal(medir.faixa([emCelular('80px')], celular).ok, false)
  })

  it('DS1-I-01 FAIXA: a faixa dividida passa com o lado em cacau e falha com o lado em mel (controle)', () => {
    const lado = (chao) => no({ tag: 'div', texto: '', rect: { x: 900, y: 0, w: 540, h: 480 }, estilo: { backgroundColor: chao }, m: { faixaLado: true } })
    const r = medir.faixa([faixaNo(), lado(CACAU)], doc)
    assert.equal(r.ok, true, r.motivo)
    const falha = medir.faixa([faixaNo(), lado(MEL)], doc)
    assert.equal(falha.ok, false)
    assert.equal(falha.nos_com_falha.length, 1)
  })

  it('DS1-I-01 FAIXA falha fechado: sem retângulo, sem padding, sem fundo legível ou sem o token de seção', () => {
    assert.equal(medir.faixa([faixaNo({ rect: undefined })], doc).ok, false)
    assert.equal(medir.faixa([faixaNo({ estilo: { paddingTop: undefined } })], doc).ok, false)
    assert.equal(medir.faixa([faixaNo({ estilo: { backgroundColor: 'cor-estranha' } })], doc).ok, false)
    assert.equal(medir.faixa([faixaNo({ estilo: { borderRadius: undefined } })], doc).ok, false)
    assert.equal(medir.faixa([faixaNo()], { ...doc, tokens: {} }).ok, false)
    assert.equal(medir.faixa([faixaNo()], { ...doc, clientWidth: undefined }).ok, false)
  })
})

// ---- DS1-I-03 PRODUTO ----

const telaNo = (extra = {}) =>
  com(
    no({ tag: 'img', texto: '', rect: { x: 100, y: 100, w: 400, h: 800 }, m: { produtoTela: true }, currentSrc: '/produto/tela-a-2x.webp' }),
    extra,
  )
const molduraNo = (extra = {}) =>
  com(no({ tag: 'img', texto: '', rect: { x: 90, y: 90, w: 420, h: 820 }, m: { produtoMoldura: true }, currentSrc: '/produto/moldura-2x.webp' }), extra)
const figuraNo = (extra = {}) =>
  com(no({ tag: 'figure', texto: '', rect: { x: 90, y: 90, w: 420, h: 820 }, m: { produto: true } }), extra)
const produtoCom = (tela, moldura = {}, figura = {}) => [figuraNo(figura), telaNo(tela), molduraNo(moldura)]

describe('DS1-I-03 PRODUTO: duas camadas, sem sombra, tela de 320/280 px, no máximo 2, telas únicas', () => {
  it('DS1-I-03 PRODUTO passa com uma moldura de tela de 400 px em 1440 e sem nenhuma moldura ("nenhum elemento")', () => {
    const r = medir.produto(produtoCom({}), docDs1(1440))
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'PRODUTO')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
    const vazio = medir.produto([no()], docDs1(1440))
    assert.equal(vazio.ok, true)
    assert.match(vazio.motivo, /nenhum elemento/)
  })

  it('DS1-I-03 PRODUTO: a tela tem 320 px em 1440 e 280 px em 390, no mínimo (300 px em 1440 falha, controle)', () => {
    const larg = (w) => ({ rect: { x: 100, y: 100, w, h: w * 2 } })
    assert.equal(medir.produto(produtoCom(larg(320)), docDs1(1440)).ok, true)
    assert.equal(medir.produto(produtoCom(larg(319)), docDs1(1440)).ok, false)
    assert.equal(medir.produto(produtoCom(larg(300)), docDs1(1440)).ok, false)
    assert.equal(medir.produto(produtoCom(larg(280)), docDs1(390)).ok, true)
    assert.equal(medir.produto(produtoCom(larg(270)), docDs1(390)).ok, false)
  })

  it('DS1-I-03 PRODUTO controle: sombra no invólucro, na moldura ou na tela falha', () => {
    const sombra = { estilo: { boxShadow: FLUTUANTE_CHROME } }
    assert.equal(medir.produto(produtoCom({}, {}, sombra), docDs1(1440)).ok, false)
    assert.equal(medir.produto(produtoCom({}, sombra), docDs1(1440)).ok, false)
    assert.equal(medir.produto(produtoCom(sombra), docDs1(1440)).ok, false)
  })

  it('DS1-I-03 PRODUTO controle: filtro ou gradiente em qualquer camada falha', () => {
    assert.equal(medir.produto(produtoCom({ estilo: { filter: 'blur(2px)' } }), docDs1(1440)).ok, false)
    assert.equal(medir.produto(produtoCom({}, { estilo: { filter: 'drop-shadow(0px 4px 8px rgb(0, 0, 0))' } }), docDs1(1440)).ok, false)
    assert.equal(medir.produto(produtoCom({}, {}, { estilo: { backgroundImage: LUZ_CHROME } }), docDs1(1440)).ok, false)
  })

  it('DS1-I-03 PRODUTO controle: três molduras na página falham, duas passam', () => {
    const outra = (i) => produtoCom({ currentSrc: `/produto/tela-${i}-2x.webp` })
    assert.equal(medir.produto([...outra(1), ...outra(2)], docDs1(1440)).ok, true)
    assert.equal(medir.produto([...outra(1), ...outra(2), ...outra(3)], docDs1(1440)).ok, false)
  })

  it('DS1-I-03 PRODUTO controle: duas telas com o mesmo currentSrc falham; duas molduras com a mesma arte passam', () => {
    const igual = [...produtoCom({ currentSrc: '/produto/mesma.webp' }), ...produtoCom({ currentSrc: '/produto/mesma.webp' })]
    const r = medir.produto(igual, docDs1(1440))
    assert.equal(r.ok, false)
    assert.match(r.motivo, /currentSrc|mesma/)
    // A moldura repete de propósito (a arte única do FREEZE §1.5): só a tela não pode se repetir.
    const diferentes = [...produtoCom({ currentSrc: '/produto/tela-a.webp' }), ...produtoCom({ currentSrc: '/produto/tela-b.webp' })]
    assert.equal(medir.produto(diferentes, docDs1(1440)).ok, true)
  })

  it('DS1-I-03 PRODUTO falha fechado: moldura sem camada de tela, sem currentSrc ou sem retângulo', () => {
    assert.equal(medir.produto([figuraNo(), molduraNo()], docDs1(1440)).ok, false)
    assert.equal(medir.produto(produtoCom({ currentSrc: '' }), docDs1(1440)).ok, false)
    assert.equal(medir.produto(produtoCom({ currentSrc: undefined }), docDs1(1440)).ok, false)
    assert.equal(medir.produto(produtoCom({ rect: undefined }), docDs1(1440)).ok, false)
    assert.equal(medir.produto(produtoCom({ estilo: { boxShadow: undefined } }), docDs1(1440)).ok, false)
  })
})

// ---- DS1-I-04 RODAPE ----

const rodapeNo = (extra = {}) =>
  com(
    no({
      tag: 'footer',
      texto: '',
      textoTodo: 'AppMaternidade Produto Conta Ajuda Legal © 2026 AppMaternidade',
      rect: { x: 0, y: 2000, w: 1440, h: 360 },
      estilo: { backgroundColor: CACAU, color: PAPEL },
      m: { rodape: true, noRodape: true },
    }),
    extra,
  )
const linksDoRodape = (n) =>
  Array.from({ length: n }, (_, i) => no({ tag: 'a', texto: `Link ${i}`, m: { link: true, noRodape: true, interativo: true } }))
const gruposDoRodape = (n) =>
  Array.from({ length: n }, (_, i) => no({ tag: 'div', texto: '', m: { rodapeGrupo: true, noRodape: true }, tituloId: `g${i}` }))
const avisoNo = (extra = {}) => com(no({ tag: 'p', texto: 'Aviso', m: { aviso: true, noRodape: true } }), extra)
const rodapeConforme = (extra = {}, links = 11, grupos = 4, avisos = [avisoNo()]) => [rodapeNo(extra), ...linksDoRodape(links), ...gruposDoRodape(grupos), ...avisos]

describe('DS1-I-04 RODAPE: cacau, largura cheia, 11 links, 4 grupos, ©, altura máxima, um aviso dentro dele', () => {
  it('DS1-I-04 RODAPE passa com o rodapé de cacau em 1440 e em 390, e o resultado tem a forma pura', () => {
    const r = medir.rodape(rodapeConforme(), docDs1(1440))
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'RODAPE')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
    const celular = rodapeConforme({ rect: { x: 0, y: 2000, w: 390, h: 480 } })
    assert.equal(medir.rodape(celular, docDs1(390)).ok, true)
  })

  it('DS1-I-04 RODAPE controle: um rodapé de papel falha', () => {
    assert.equal(medir.rodape(rodapeConforme({ estilo: { backgroundColor: PAPEL } }), docDs1(1440)).ok, false)
  })

  it('DS1-I-04 RODAPE controle: 10 links falham, 11 passam (o piso é 11)', () => {
    assert.equal(medir.rodape(rodapeConforme({}, 10), docDs1(1440)).ok, false)
    assert.equal(medir.rodape(rodapeConforme({}, 11), docDs1(1440)).ok, true)
  })

  it('DS1-I-04 RODAPE controle: 3 grupos falham', () => {
    assert.equal(medir.rodape(rodapeConforme({}, 11, 3), docDs1(1440)).ok, false)
  })

  it('DS1-I-04 RODAPE controle: sem o © no texto falha', () => {
    assert.equal(medir.rodape(rodapeConforme({ textoTodo: 'AppMaternidade Produto Conta Ajuda Legal 2026' }), docDs1(1440)).ok, false)
  })

  it('DS1-I-04 RODAPE controle: 481 px de altura em 390 falha (480 passa), 441 px em 1440 falha (440 passa)', () => {
    const celular = (h) => rodapeConforme({ rect: { x: 0, y: 2000, w: 390, h } })
    assert.equal(medir.rodape(celular(480), docDs1(390)).ok, true)
    assert.equal(medir.rodape(celular(481), docDs1(390)).ok, false)
    assert.equal(medir.rodape(rodapeConforme({ rect: { x: 0, y: 2000, w: 1440, h: 440 } }), docDs1(1440)).ok, true)
    assert.equal(medir.rodape(rodapeConforme({ rect: { x: 0, y: 2000, w: 1440, h: 441 } }), docDs1(1440)).ok, false)
  })

  it('DS1-I-04 RODAPE controle: um rodapé estreito (menos de 0,95 da janela) falha', () => {
    assert.equal(medir.rodape(rodapeConforme({ rect: { x: 32, y: 2000, w: 1376, h: 360 } }), docDs1(1440)).ok, true)
    assert.equal(medir.rodape(rodapeConforme({ rect: { x: 100, y: 2000, w: 1200, h: 360 } }), docDs1(1440)).ok, false)
  })

  it('DS1-I-04 RODAPE controle: nenhum aviso, dois avisos, ou o aviso fora do rodapé falham', () => {
    assert.equal(medir.rodape(rodapeConforme({}, 11, 4, []), docDs1(1440)).ok, false)
    assert.equal(medir.rodape(rodapeConforme({}, 11, 4, [avisoNo(), avisoNo()]), docDs1(1440)).ok, false)
    const fora = avisoNo({ m: { noRodape: false } })
    assert.equal(medir.rodape(rodapeConforme({}, 11, 4, [fora]), docDs1(1440)).ok, false)
    // Um aviso dentro e outro fora também é "mais de um" no documento.
    assert.equal(medir.rodape(rodapeConforme({}, 11, 4, [avisoNo(), fora]), docDs1(1440)).ok, false)
  })

  it('DS1-I-04 RODAPE falha fechado: sem rodapé, sem texto do rodapé, sem retângulo ou sem fundo legível', () => {
    assert.equal(medir.rodape([no(), ...linksDoRodape(11)], docDs1(1440)).ok, false)
    assert.equal(medir.rodape(rodapeConforme({ textoTodo: undefined }), docDs1(1440)).ok, false)
    assert.equal(medir.rodape(rodapeConforme({ rect: undefined }), docDs1(1440)).ok, false)
    assert.equal(medir.rodape(rodapeConforme({ estilo: { backgroundColor: 'cor-estranha' } }), docDs1(1440)).ok, false)
  })
})

// ---- DS1-I-05 EXIBICAO (a metade pura da regra) ----

describe('DS1-I-05 EXIBICAO: h1-h4 do cabeçalho e do main, e o nome do rodapé, na família de exibição', () => {
  const titulo = (tag, familia, m = { noMain: true }, extra = {}) => com(no({ tag, texto: 'Título', estilo: { fontFamily: familia }, m }), extra)

  it('DS1-I-05 EXIBICAO passa quando todo h1-h4 e o nome do rodapé computam a primeira família de --fonte-exibicao', () => {
    const nos = [
      titulo('h1', EXIBICAO_CHROME),
      titulo('h2', EXIBICAO_CHROME),
      titulo('h3', EXIBICAO_CHROME, { noCabecalho: true }),
      titulo('h4', EXIBICAO_CHROME),
      titulo('p', EXIBICAO_CHROME, { noRodape: true, rodapeNome: true }),
    ]
    const r = medir.exibicao(nos, docDs1(1440))
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'EXIBICAO')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
  })

  it('DS1-I-05 EXIBICAO controle: um h2 que computa Outfit falha', () => {
    const r = medir.exibicao([titulo('h1', EXIBICAO_CHROME), titulo('h2', OUTFIT_CHROME)], docDs1(1440))
    assert.equal(r.ok, false)
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('DS1-I-05 EXIBICAO controle: o nome do rodapé em Outfit falha', () => {
    const nome = titulo('p', OUTFIT_CHROME, { noRodape: true, rodapeNome: true })
    assert.equal(medir.exibicao([titulo('h1', EXIBICAO_CHROME), nome], docDs1(1440)).ok, false)
  })

  it('DS1-I-05 EXIBICAO: os títulos de grupo do rodapé (Outfit, sobretítulo) ficam de fora', () => {
    const grupo = titulo('h2', OUTFIT_CHROME, { noRodape: true, rodapeTitulo: true })
    assert.equal(medir.exibicao([titulo('h1', EXIBICAO_CHROME), grupo], docDs1(1440)).ok, true)
  })

  it('DS1-I-05 EXIBICAO: compara só a primeira família, sem aspas, contra a da raiz (Literata com outra reserva passa)', () => {
    const outraReserva = titulo('h1', '"Literata Variable", Georgia, serif')
    assert.equal(medir.exibicao([outraReserva], docDs1(1440)).ok, true)
    const trocada = { ...docDs1(1440), tokens: { ...docDs1(1440).tokens, fonteExibicao: "'M PLUS Rounded 1c', sans-serif" } }
    assert.equal(medir.exibicao([titulo('h1', '"M PLUS Rounded 1c", sans-serif')], trocada).ok, true)
    assert.equal(medir.exibicao([titulo('h1', EXIBICAO_CHROME)], trocada).ok, false)
  })

  it('DS1-I-05 EXIBICAO falha fechado: sem a leitura de --fonte-exibicao na raiz ou sem a família do nó', () => {
    assert.equal(medir.exibicao([titulo('h1', EXIBICAO_CHROME)], { ...docDs1(1440), tokens: {} }).ok, false)
    assert.equal(medir.exibicao([titulo('h1', EXIBICAO_CHROME)], { ...docDs1(1440), tokens: { fonteExibicao: '' } }).ok, false)
    assert.equal(medir.exibicao([titulo('h1', undefined)], docDs1(1440)).ok, false)
  })
})

// ---- DS1-I-06 ITALICO, TITULO, TITULO_REGISTRO ----

describe('DS1-I-06 ITALICO e TITULO: nada em itálico, e nenhum título com palavra de outro tom', () => {
  it('DS1-I-06 ITALICO passa com tudo em prumo no cabeçalho, no main e no rodapé', () => {
    const nos = [no({ m: { noCabecalho: true } }), no({ m: { noMain: true } }), no({ m: { noRodape: true } })]
    const r = medir.italico(nos, docDs1(1440))
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'ITALICO')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
  })

  it('DS1-I-06 ITALICO controle: um p com um em de itálico no main falha (e no cabeçalho, no rodapé e na casa)', () => {
    for (const marca of ['noMain', 'noCabecalho', 'noRodape', 'casa']) {
      const nos = [no({ tag: 'p', m: { noMain: true } }), no({ tag: 'em', texto: 'sempre', estilo: { fontStyle: 'italic' }, m: { [marca]: true } })]
      const r = medir.italico(nos, docDs1(1440))
      assert.equal(r.ok, false, marca)
      assert.equal(r.nos_com_falha.length, 1, marca)
    }
  })

  it('DS1-I-06 ITALICO controle: oblique também falha, e um nó fora do cabeçalho, do main, do rodapé e da casa não conta', () => {
    assert.equal(medir.italico([no({ estilo: { fontStyle: 'oblique' }, m: { noMain: true } })], docDs1(1440)).ok, false)
    assert.equal(medir.italico([no({ estilo: { fontStyle: 'italic' } }), no({ m: { noMain: true } })], docDs1(1440)).ok, true)
  })

  it('DS1-I-06 ITALICO falha fechado: nó do escopo sem font-style', () => {
    assert.equal(medir.italico([no({ estilo: { fontStyle: undefined }, m: { noMain: true } })], docDs1(1440)).ok, false)
    assert.equal(medir.italico([no({ estilo: { fontStyle: '' }, m: { noMain: true } })], docDs1(1440)).ok, false)
  })

  const peca = (tituloId, texto, extra = {}) => com(no({ tag: 'span', texto, tituloId, m: { titulo: true, casa: true, noMain: true } }), extra)

  it('DS1-I-06 TITULO passa quando os nós de texto de cada h1/h2 da casa dividem cor, estilo e peso', () => {
    const nos = [peca('a', 'Quanto tempo'), peca('a', 'ela mamou?'), peca('b', 'Outro título', { estilo: { color: PAPEL } })]
    const r = medir.titulo(nos, docDs1(1440))
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'TITULO')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
  })

  it('DS1-I-06 TITULO controle: um h1 com um span de outra cor falha', () => {
    const r = medir.titulo([peca('a', 'Pode entrar'), peca('a', 'agora', { estilo: { color: MEL } })], docDs1(1440))
    assert.equal(r.ok, false)
    assert.ok(r.nos_com_falha.length >= 1)
  })

  it('DS1-I-06 TITULO controle: um span de outro peso ou em itálico dentro do título falha', () => {
    assert.equal(medir.titulo([peca('a', 'Pode'), peca('a', 'entrar', { estilo: { fontWeight: '800' } })], docDs1(1440)).ok, false)
    assert.equal(medir.titulo([peca('a', 'Pode'), peca('a', 'entrar', { estilo: { fontStyle: 'italic' } })], docDs1(1440)).ok, false)
  })

  it('DS1-I-06 TITULO: um nó sem texto próprio (o h1 que só embrulha os spans) não conta como nó de texto', () => {
    const casca = peca('a', '', { tag: 'h1', estilo: { color: PAPEL } })
    assert.equal(medir.titulo([casca, peca('a', 'Pode'), peca('a', 'entrar')], docDs1(1440)).ok, true)
  })

  it('DS1-I-06 TITULO: sem escopo de casa passa com "nenhum elemento"; fora da casa a regra bloqueante não olha', () => {
    const fora = (tituloId, extra = {}) => peca(tituloId, 'texto', { m: { casa: false }, ...extra })
    const nos = [fora('a'), fora('a', { estilo: { color: MEL } })]
    const r = medir.titulo(nos, docDs1(1440))
    assert.equal(r.ok, true)
    assert.match(r.motivo, /nenhum elemento/)
  })

  it('DS1-I-06 TITULO_REGISTRO: o mesmo teste no main fora da casa, só registrado (a falha vem desta regra, não de TITULO)', () => {
    const fora = (tituloId, extra = {}) => peca(tituloId, 'texto', { m: { casa: false }, ...extra })
    const r = medir.tituloRegistro([fora('a'), fora('a', { estilo: { color: MEL } })], docDs1(1440))
    assert.equal(r.regra, 'TITULO_REGISTRO')
    assert.equal(r.ok, false)
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
    assert.equal(medir.tituloRegistro([fora('a'), fora('a')], docDs1(1440)).ok, true)
    // O título da casa não entra no registro.
    assert.equal(medir.tituloRegistro([peca('a', 'x'), peca('a', 'y', { estilo: { color: MEL } })], docDs1(1440)).ok, true)
  })

  it('DS1-I-06 TITULO falha fechado: nó de título sem a cor, sem o estilo ou sem o peso', () => {
    assert.equal(medir.titulo([peca('a', 'x'), peca('a', 'y', { estilo: { color: undefined } })], docDs1(1440)).ok, false)
    assert.equal(medir.titulo([peca('a', 'x'), peca('a', 'y', { estilo: { fontStyle: undefined } })], docDs1(1440)).ok, false)
    assert.equal(medir.titulo([peca('a', 'x'), peca('a', 'y', { estilo: { fontWeight: undefined } })], docDs1(1440)).ok, false)
  })
})

// ---- DS1-I-07 SOBRETITULO e FONTES ----

describe('DS1-I-07 SOBRETITULO: nenhum rótulo acima de título no main das páginas públicas e na casa', () => {
  const rotulo = (extra = {}) =>
    com(
      no({
        tag: 'p',
        texto: 'Como funciona',
        estilo: { fontSize: '15px', fontWeight: '600' },
        m: { noMain: true, antesDeTitulo: true },
      }),
      extra,
    )

  it('DS1-I-07 SOBRETITULO passa sem classe sobretitulo e sem rótulo colado num título', () => {
    const r = medir.sobretitulo([no({ m: { noMain: true } }), no({ tag: 'h2', m: { noMain: true } })], docDs1(1440))
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'SOBRETITULO')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
  })

  it('DS1-I-07 SOBRETITULO controle: <p class="cm-sobretitulo"> no main falha', () => {
    const r = medir.sobretitulo([no({ tag: 'p', classes: ['cm-sobretitulo'], m: { noMain: true } })], docDs1(1440))
    assert.equal(r.ok, false)
    assert.equal(r.nos_com_falha.length, 1)
    // Qualquer classe que CONTÉM "sobretitulo" conta.
    assert.equal(medir.sobretitulo([no({ classes: ['x', 'pt-sobretitulo-grande'], m: { noMain: true } })], docDs1(1440)).ok, false)
  })

  it('DS1-I-07 SOBRETITULO controle: um p de 15 px e peso 600 logo antes de um h2, sob qualquer classe, falha', () => {
    const r = medir.sobretitulo([rotulo({ classes: ['qualquer-coisa'] })], docDs1(1440))
    assert.equal(r.ok, false)
  })

  it('DS1-I-07 SOBRETITULO: o mesmo p com 17 px, peso 500, 41 caracteres ou sem ser vizinho de título passa', () => {
    assert.equal(medir.sobretitulo([rotulo({ estilo: { fontSize: '17px' } })], docDs1(1440)).ok, true)
    assert.equal(medir.sobretitulo([rotulo({ estilo: { fontWeight: '500' } })], docDs1(1440)).ok, true)
    assert.equal(medir.sobretitulo([rotulo({ texto: 'x'.repeat(41) })], docDs1(1440)).ok, true)
    assert.equal(medir.sobretitulo([rotulo({ m: { antesDeTitulo: false } })], docDs1(1440)).ok, true)
    // Os limites passam a reprovar: 16 px, peso 600 e 40 caracteres ainda são rótulo.
    assert.equal(medir.sobretitulo([rotulo({ estilo: { fontSize: '16px' } })], docDs1(1440)).ok, false)
    assert.equal(medir.sobretitulo([rotulo({ texto: 'x'.repeat(40) })], docDs1(1440)).ok, false)
    assert.equal(medir.sobretitulo([rotulo({ estilo: { fontWeight: '700' } })], docDs1(1440)).ok, false)
  })

  it('DS1-I-07 SOBRETITULO: um título que antecede outro título não é rótulo, e o rodapé fica de fora', () => {
    assert.equal(medir.sobretitulo([rotulo({ tag: 'h2' })], docDs1(1440)).ok, true)
    const noRodape = no({ tag: 'h2', classes: ['cm-sobretitulo'], m: { noRodape: true } })
    assert.equal(medir.sobretitulo([noRodape], docDs1(1440)).ok, true)
  })

  it('DS1-I-07 SOBRETITULO: dentro da casa vale mesmo fora do main; fora do main e da casa não vale', () => {
    assert.equal(medir.sobretitulo([no({ classes: ['cm-sobretitulo'], m: { casa: true } })], docDs1(1440)).ok, false)
    assert.equal(medir.sobretitulo([no({ classes: ['cm-sobretitulo'] })], docDs1(1440)).ok, true)
  })

  it('DS1-I-07 SOBRETITULO na /sistema olha só a casa: o sobretitulo da amostra de tipo (no main, fora da casa) passa', () => {
    const amostra = no({ tag: 'p', classes: ['cm-sobretitulo'], m: { noMain: true } })
    // /sistema: o mesmo nó que reprova numa página pública passa, porque está fora da casa.
    const r = medir.sobretitulo([amostra], docDs1(1440), 'sistema')
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'SOBRETITULO')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
    // Pela avaliação inteira do caso: a regra SOBRETITULO da /sistema passa com a amostra fora da casa.
    const rotulada = medir.avaliarTudo({ doc: docDs1(1440), nos: [amostra], tema: 'claro', caso: 'sistema', rota: 'sistema' })
    assert.equal(rotulada.find((x) => x.regra === 'SOBRETITULO').ok, true)
  })

  it('DS1-I-07 SOBRETITULO controle: na /sistema um sobretitulo dentro da casa falha, e numa página pública um no main falha', () => {
    const naCasa = no({ tag: 'p', classes: ['cm-sobretitulo'], m: { casa: true, noMain: true } })
    assert.equal(medir.sobretitulo([naCasa], docDs1(1440), 'sistema').ok, false)
    assert.equal(medir.sobretitulo([naCasa, no({ classes: ['cm-sobretitulo'], m: { noMain: true } })], docDs1(1440), 'sistema').nos_com_falha.length, 1)
    // Rótulo pela forma (15 px, 600, antes de título) também vale dentro da casa da /sistema, e não fora dela.
    assert.equal(medir.sobretitulo([rotulo({ m: { casa: true, noMain: true, antesDeTitulo: true } })], docDs1(1440), 'sistema').ok, false)
    assert.equal(medir.sobretitulo([rotulo()], docDs1(1440), 'sistema').ok, true)
    // Página pública (inicio e sem caso): o main inteiro conta.
    const noMain = no({ tag: 'p', classes: ['cm-sobretitulo'], m: { noMain: true } })
    assert.equal(medir.sobretitulo([noMain], docDs1(1440), 'inicio').ok, false)
    assert.equal(medir.sobretitulo([noMain], docDs1(1440)).ok, false)
    const publica = medir.avaliarTudo({ doc: docDs1(1440), nos: [noMain], tema: 'claro', caso: 'inicio', rota: '' })
    assert.equal(publica.find((x) => x.regra === 'SOBRETITULO').ok, false)
  })

  it('DS1-I-07 SOBRETITULO falha fechado: rótulo candidato sem tamanho ou sem peso legível', () => {
    assert.equal(medir.sobretitulo([rotulo({ estilo: { fontSize: undefined } })], docDs1(1440)).ok, false)
    assert.equal(medir.sobretitulo([rotulo({ estilo: { fontWeight: 'bold-ish' } })], docDs1(1440)).ok, false)
  })

  const noFam = (familia) => criar({ estilo: { fontFamily: familia } })

  it('DS1-I-07 FONTES: um elemento cuja primeira família é monospace ou ui-monospace falha (controle)', () => {
    for (const pilha of ['monospace', 'ui-monospace, monospace', 'monospace, "Outfit Variable"', 'ui-monospace, "Outfit Variable", sans-serif']) {
      const r = fontes([criar(), noFam(pilha)])
      assert.equal(r.ok, false, pilha)
      assert.equal(r.nos_com_falha.length, 1, pilha)
    }
  })

  it('DS1-I-07 FONTES: monospace como reserva depois do Outfit passa, e a pilha de sempre segue passando', () => {
    assert.equal(fontes([noFam('"Outfit Variable", monospace')]).ok, true)
    assert.equal(fontes([noFam('"Outfit Variable", ui-monospace, sans-serif')]).ok, true)
    assert.equal(fontes([noFam('"Outfit Variable", system-ui, sans-serif'), noFam('"Literata Variable", serif')]).ok, true)
  })
})

// ---- DS1-I-08 DOCK ----

describe('DS1-I-08 DOCK: nenhuma barra fixa ou grudada embaixo, depois do carregamento e sem rolagem', () => {
  const doc = docDs1(1440)
  const barra = (y, h, extra = {}) =>
    com(no({ tag: 'div', texto: '', rect: { x: 0, y, w: 1440, h }, estilo: { position: 'fixed', bottom: '0px' }, m: { noMain: true } }), extra)

  it('DS1-I-08 DOCK passa com cabeçalho fixo no alto, nós estáticos e uma barra fixa fora do fundo', () => {
    const nos = [
      no({ tag: 'header', rect: { x: 0, y: 0, w: 1440, h: 72 }, estilo: { position: 'sticky', bottom: 'auto' } }),
      no(),
      barra(100, 64, { estilo: { bottom: '736px' } }),
    ]
    const r = medir.dock(nos, doc)
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'DOCK')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
  })

  it('DS1-I-08 DOCK controle: uma barra fixa de 64 px colada no fundo (900) falha', () => {
    const r = medir.dock([barra(836, 64)], doc)
    assert.equal(r.ok, false)
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('DS1-I-08 DOCK controle: uma barra fixa de 200 px colada no fundo falha', () => {
    assert.equal(medir.dock([barra(700, 200)], doc).ok, false)
  })

  it('DS1-I-08 DOCK: 1 px do fundo ainda é colada; 2 px não é; o topo na metade de cima (painel alto) não é dock', () => {
    assert.equal(medir.dock([barra(836, 63)], doc).ok, false)
    assert.equal(medir.dock([barra(836, 62)], doc).ok, true)
    assert.equal(medir.dock([barra(0, 900)], doc).ok, true)
    assert.equal(medir.dock([barra(400, 500)], doc).ok, true)
  })

  it('DS1-I-08 DOCK: sticky com deslocamento embaixo conta, sticky sem deslocamento (bottom auto) não', () => {
    assert.equal(medir.dock([barra(836, 64, { estilo: { position: 'sticky' } })], doc).ok, false)
    assert.equal(medir.dock([barra(836, 64, { estilo: { position: 'sticky', bottom: 'auto' } })], doc).ok, true)
    assert.equal(medir.dock([barra(836, 64, { estilo: { position: 'absolute' } })], doc).ok, true)
  })

  it('DS1-I-08 DOCK: a medida é a da altura da janela do documento (844 em 390, não 900)', () => {
    const celular = docDs1(390)
    const naBase = barra(780, 64, { rect: { x: 0, y: 780, w: 390, h: 64 } })
    assert.equal(medir.dock([naBase], celular).ok, false)
    assert.equal(medir.dock([naBase], doc).ok, true)
  })

  it('DS1-I-08 DOCK falha fechado: sem posição, sem retângulo, ou sem a altura da janela', () => {
    assert.equal(medir.dock([barra(836, 64, { estilo: { position: undefined } })], doc).ok, false)
    assert.equal(medir.dock([barra(836, 64, { rect: undefined })], doc).ok, false)
    assert.equal(medir.dock([barra(836, 64)], { ...doc, altura: undefined }).ok, false)
  })
})

// ---- DS1-I-10 BOTAO_LARGO e CABECALHO ----

describe('DS1-I-10 BOTAO_LARGO: 323 a 357 px de largura em 390 e 44 px de altura', () => {
  const botao = (w, h = 52, extra = {}) =>
    com(no({ tag: 'a', texto: 'Criar conta', rect: { x: 20, y: 100, w, h }, m: { botaoLargo: true, interativo: true } }), extra)

  it('DS1-I-10 BOTAO_LARGO passa com 350 × 52 em 390, e sem botão ("nenhum elemento")', () => {
    const r = medir.botaoLargo([botao(350)], docDs1(390))
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'BOTAO_LARGO')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
    const vazio = medir.botaoLargo([no()], docDs1(390))
    assert.equal(vazio.ok, true)
    assert.match(vazio.motivo, /nenhum elemento/)
  })

  it('DS1-I-10 BOTAO_LARGO controle: 300 px de largura em 390 falha', () => {
    const r = medir.botaoLargo([botao(300)], docDs1(390))
    assert.equal(r.ok, false)
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('DS1-I-10 BOTAO_LARGO: os limites 323 e 357 passam; 322 e 358 falham; 43 px de altura falha', () => {
    for (const w of [323, 357]) assert.equal(medir.botaoLargo([botao(w)], docDs1(390)).ok, true, String(w))
    for (const w of [322, 358]) assert.equal(medir.botaoLargo([botao(w)], docDs1(390)).ok, false, String(w))
    assert.equal(medir.botaoLargo([botao(350, 44)], docDs1(390)).ok, true)
    assert.equal(medir.botaoLargo([botao(350, 43)], docDs1(390)).ok, false)
  })

  it('DS1-I-10 BOTAO_LARGO: só vale em 390 — em 1440 o botão de qualquer largura passa', () => {
    assert.equal(medir.botaoLargo([botao(600)], docDs1(1440)).ok, true)
    assert.equal(medir.botaoLargo([botao(200)], docDs1(1440)).ok, true)
  })

  it('DS1-I-10 BOTAO_LARGO falha fechado: sem retângulo, ou com largura NaN, em 390', () => {
    assert.equal(medir.botaoLargo([botao(350, 52, { rect: undefined })], docDs1(390)).ok, false)
    assert.equal(medir.botaoLargo([botao(Number.NaN)], docDs1(390)).ok, false)
  })
})

describe('DS1-I-10 CABECALHO: a pílula de "Criar conta" na linha do cabeçalho, cacau, 44 px (48 a partir de 1100)', () => {
  const pilula = (extra = {}) =>
    com(
      no({
        tag: 'a',
        texto: 'Criar conta',
        rect: { x: 200, y: 12, w: 140, h: 44 },
        estilo: { backgroundColor: CACAU, color: PAPEL },
        m: { cabecalhoPilula: true, noCabecalho: true, noMenu: false, interativo: true },
      }),
      extra,
    )
  const emLargura = (largura, h) => [pilula({ rect: { x: largura - 180, y: 12, w: 140, h } })]

  it('DS1-I-10 CABECALHO passa com a pílula cacau de 44 px em 390 e de 48 px em 1440', () => {
    const r = medir.cabecalho(emLargura(390, 44), docDs1(390))
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'CABECALHO')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
    assert.equal(medir.cabecalho(emLargura(1440, 48), docDs1(1440)).ok, true)
  })

  it('DS1-I-10 CABECALHO: a altura mínima é 44 abaixo de 1100 e 48 a partir de 1100 (1024 com 44 passa, 1100 com 44 falha)', () => {
    assert.equal(medir.cabecalho(emLargura(390, 43), docDs1(390)).ok, false)
    assert.equal(medir.cabecalho(emLargura(1024, 44), docDs1(1024)).ok, true)
    assert.equal(medir.cabecalho(emLargura(1100, 44), docDs1(1100)).ok, false)
    assert.equal(medir.cabecalho(emLargura(1100, 48), docDs1(1100)).ok, true)
    assert.equal(medir.cabecalho(emLargura(1440, 47), docDs1(1440)).ok, false)
  })

  it('DS1-I-10 CABECALHO controle: a pílula dentro do menu fechado (invisível) falha', () => {
    const noMenu = pilula({ visivel: false, m: { noMenu: true } })
    const r = medir.cabecalho([noMenu], docDs1(390))
    assert.equal(r.ok, false)
  })

  it('DS1-I-10 CABECALHO controle: sem pílula, pílula invisível ou fora do cabeçalho falham', () => {
    assert.equal(medir.cabecalho([no({ m: { noCabecalho: true } })], docDs1(390)).ok, false)
    assert.equal(medir.cabecalho([pilula({ visivel: false })], docDs1(390)).ok, false)
    assert.equal(medir.cabecalho([pilula({ m: { noCabecalho: false } })], docDs1(390)).ok, false)
  })

  it('DS1-I-10 CABECALHO controle: o fundo de dia tem de ser cacau (papel, mel e transparente falham)', () => {
    for (const fundo of [PAPEL, MEL, TRANSPARENTE]) {
      assert.equal(medir.cabecalho([pilula({ estilo: { backgroundColor: fundo } })], docDs1(390)).ok, false, fundo)
    }
  })

  it('DS1-I-10 CABECALHO falha fechado: sem retângulo ou com fundo ilegível', () => {
    assert.equal(medir.cabecalho([pilula({ rect: undefined })], docDs1(390)).ok, false)
    assert.equal(medir.cabecalho([pilula({ estilo: { backgroundColor: 'cor-estranha' } })], docDs1(390)).ok, false)
  })
})

// ---- DS1-I-11 CENA ----

describe('DS1-I-11 CENA: a chapa de 836 a 1115 px em 1440, até data-largura-max, e densidade mínima de 1,50', () => {
  const placa = (w, naturalWidth = 1672, larguraMax = 960, extra = {}) =>
    com(no({ tag: 'img', texto: '', rect: { x: 400, y: 100, w, h: w * 0.7 }, m: { cenaPlaca: true }, naturalWidth, larguraMax }), extra)

  it('DS1-I-11 CENA passa com a chapa de 900 px de uma imagem de 1672 px em 1440, e sem chapa ("nenhum elemento")', () => {
    const r = medir.cena([placa(900, 1672, 900)], docDs1(1440))
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'CENA')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
    const vazio = medir.cena([no()], docDs1(1440))
    assert.equal(vazio.ok, true)
    assert.match(vazio.motivo, /nenhum elemento/)
  })

  it('DS1-I-11 CENA controle: 800 px em 1440 falha (abaixo de 836)', () => {
    const r = medir.cena([placa(800)], docDs1(1440))
    assert.equal(r.ok, false)
    assert.equal(r.nos_com_falha.length, 1)
  })

  it('DS1-I-11 CENA controle: 980 px com data-largura-max=960 falha (acima do máximo declarado)', () => {
    assert.equal(medir.cena([placa(980, 1672, 960)], docDs1(1440)).ok, false)
    assert.equal(medir.cena([placa(960, 1672, 960)], docDs1(1440)).ok, true)
  })

  it('DS1-I-11 CENA: 1116 px falha mesmo com máximo maior; 836 passa; 835 falha', () => {
    assert.equal(medir.cena([placa(1116, 2000, 1200)], docDs1(1440)).ok, false)
    assert.equal(medir.cena([placa(836, 1672, 960)], docDs1(1440)).ok, true)
    assert.equal(medir.cena([placa(835, 1672, 960)], docDs1(1440)).ok, false)
  })

  it('DS1-I-11 CENA: 1115 px de uma chapa de 1672 passa (1672 / 1115 = 1,4996, arredonda para 1,50)', () => {
    const r = medir.cena([placa(1115, 1672, 1115)], docDs1(1440))
    assert.equal(r.ok, true, r.motivo)
  })

  it('DS1-I-11 CENA controle: a densidade de 1,2 falha em 390 (a largura da chapa lá não é medida)', () => {
    const r = medir.cena([placa(500, 600, 960)], docDs1(390))
    assert.equal(r.ok, false)
    assert.match(r.motivo, /densidade/)
    // A mesma largura (fora de 836..1115) passa em 390 com densidade boa: só a densidade vale abaixo de 1440.
    assert.equal(medir.cena([placa(500, 900, 960)], docDs1(390)).ok, true)
    assert.equal(medir.cena([placa(700, 1672, 960)], docDs1(1024)).ok, true)
    assert.equal(medir.cena([placa(700, 900, 960)], docDs1(1024)).ok, false)
  })

  it('DS1-I-11 CENA: a densidade em 1440 também vale (chapa de 900 px com imagem de 1000 px falha)', () => {
    assert.equal(medir.cena([placa(900, 1000, 960)], docDs1(1440)).ok, false)
  })

  it('DS1-I-11 CENA falha fechado: imagem sem naturalWidth (não carregou), sem retângulo ou sem data-largura-max em 1440', () => {
    assert.equal(medir.cena([placa(900, 0, 960)], docDs1(1440)).ok, false)
    // O `undefined` posicional cai no valor padrão do auxiliar `placa`: a leitura ausente entra pelo `extra`.
    assert.equal(medir.cena([placa(900, 1672, 960, { naturalWidth: undefined })], docDs1(1440)).ok, false)
    assert.equal(medir.cena([placa(900, 1672, 960, { rect: undefined })], docDs1(1440)).ok, false)
    assert.equal(medir.cena([placa(900, 1672, 960, { larguraMax: undefined })], docDs1(1440)).ok, false)
  })

  it('DS1-I-11 CENA: em DPR 2 a densidade vem da largura codificada (780 w num slot de 390), não do naturalWidth (390)', () => {
    const r = medir.cena([placa(390, 390, 960, { larguraCodificada: 780 })], docDs1(390))
    assert.equal(r.ok, true, r.motivo)
    assert.doesNotMatch(r.motivo, /densidade \d/)
  })

  it('DS1-I-11 CENA controle: imagem 1x ampliada em DPR 2 (codificada 390 num slot de 390) falha com densidade 1.00', () => {
    const r = medir.cena([placa(390, 390, 960, { larguraCodificada: 390 })], docDs1(390))
    assert.equal(r.ok, false)
    assert.match(r.motivo, /densidade 1\.00/)
    // A codificada manda mesmo que o naturalWidth seja grande.
    assert.equal(medir.cena([placa(390, 1672, 960, { larguraCodificada: 390 })], docDs1(390)).ok, false)
  })

  it('DS1-I-11 CENA falha fechado: larguraCodificada NaN (srcset sem candidato) ou 0', () => {
    const nan = medir.cena([placa(390, 780, 960, { larguraCodificada: Number.NaN })], docDs1(390))
    assert.equal(nan.ok, false)
    assert.match(nan.motivo, /larguraCodificada/)
    assert.equal(medir.cena([placa(390, 780, 960, { larguraCodificada: 0 })], docDs1(390)).ok, false)
  })
})

describe('DS1-I-11 CENA: larguraCodificadaDe (a largura codificada do recurso que o Chrome escolheu)', () => {
  const base = 'http://127.0.0.1:5254/pagina/'
  const srcset = 'img/a-780.webp 780w, img/a-1560.webp 1560w'

  it('descritor w: usa o número do candidato que casa com o currentSrc', () => {
    assert.equal(medir.larguraCodificadaDe(srcset, `${base}img/a-780.webp`, 390, base), 780)
    assert.equal(medir.larguraCodificadaDe(srcset, `${base}img/a-1560.webp`, 780, base), 1560)
  })

  it('descritor x: naturalWidth vezes o x do candidato', () => {
    assert.equal(medir.larguraCodificadaDe('a-1x.webp 1x, a-2x.webp 2x', `${base}a-2x.webp`, 390, base), 780)
    assert.equal(medir.larguraCodificadaDe('a-1x.webp, a-2x.webp 2x', `${base}a-1x.webp`, 390, base), 390)
  })

  it('sem srcset (ou currentSrc igual ao src): naturalWidth', () => {
    assert.equal(medir.larguraCodificadaDe('', `${base}a.webp`, 1672, base), 1672)
    assert.equal(medir.larguraCodificadaDe(null, `${base}a.webp`, 1672, base), 1672)
  })

  it('srcset sem candidato que case com o currentSrc: NaN (falha fechado)', () => {
    assert.ok(Number.isNaN(medir.larguraCodificadaDe(srcset, `${base}img/outra.webp`, 390, base)))
  })
})

// ---- DS1-I-13 CASA_LIMPA, CASA_LIMPA_REGISTRO, CASA_PRESENTE ----

describe('DS1-I-13 CASA_LIMPA: sem sombra, gradiente, opacidade, mel de chão, painel, peça viva nem hora solta', () => {
  const dentro = (extra = {}) => com(no({ m: { casa: true } }), extra)
  const r0 = () => medir.casaLimpa([dentro()], docDs1(1440))

  it('DS1-I-13 CASA_LIMPA passa com a casa limpa, e o resultado tem a forma pura', () => {
    const r = r0()
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'CASA_LIMPA')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
  })

  it('DS1-I-13 CASA_LIMPA controle: um .cm-flutuante na casa falha, e dentro da moldura do produto passa', () => {
    const vivo = (m = {}) => dentro({ classes: ['cm-flutuante'], m: { vivo: true, ...m } })
    assert.equal(medir.casaLimpa([vivo()], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([vivo({ noProduto: true })], docDs1(1440)).ok, true)
  })

  it('DS1-I-13 CASA_LIMPA controle: uma folha de texto 21:42 falha, fora da moldura; "3 mamadas" e a hora dentro da moldura passam', () => {
    const hora = (extra = {}) => dentro({ texto: '21:42', m: { folha: true }, ...extra })
    const r = medir.casaLimpa([hora()], docDs1(1440))
    assert.equal(r.ok, false)
    assert.equal(r.nos_com_falha.length, 1)
    assert.equal(medir.casaLimpa([dentro({ texto: '3 mamadas', m: { folha: true } })], docDs1(1440)).ok, true)
    assert.equal(medir.casaLimpa([hora({ m: { noProduto: true } })], docDs1(1440)).ok, true)
    assert.equal(medir.casaLimpa([dentro({ texto: '1:05', m: { folha: true } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([dentro({ texto: 'às 21:42 hoje', m: { folha: true } })], docDs1(1440)).ok, true)
  })

  it('DS1-I-13 CASA_LIMPA controle: um painel falha', () => {
    assert.equal(medir.casaLimpa([dentro({ m: { painel: true } })], docDs1(1440)).ok, false)
  })

  it('DS1-I-13 CASA_LIMPA controle: sombra de caixa ou de texto falha', () => {
    assert.equal(medir.casaLimpa([dentro({ estilo: { boxShadow: CARTAO_CHROME } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([dentro({ estilo: { textShadow: 'rgba(0, 0, 0, 0.3) 0px 1px 2px' } })], docDs1(1440)).ok, false)
  })

  it('DS1-I-13 CASA_LIMPA controle: um fundo em gradiente falha (qualquer *-gradient)', () => {
    assert.equal(medir.casaLimpa([dentro({ estilo: { backgroundImage: LUZ_CHROME } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([dentro({ estilo: { backgroundImage: 'linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255))' } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([dentro({ estilo: { backgroundImage: 'url("a.webp")' } })], docDs1(1440)).ok, true)
  })

  it('DS1-I-13 CASA_LIMPA controle: uma seção de mel falha (mel e mel-claro, em qualquer elemento)', () => {
    assert.equal(medir.casaLimpa([dentro({ tag: 'section', estilo: { backgroundColor: MEL } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([dentro({ tag: 'section', estilo: { backgroundColor: MEL_CLARO } })], docDs1(1440)).ok, false)
  })

  it('DS1-I-13 CASA_LIMPA controle: opacidade 0, 0,99 ou visibilidade hidden falham', () => {
    assert.equal(medir.casaLimpa([dentro({ estilo: { opacity: '0' } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([dentro({ estilo: { opacity: '0.99' } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([dentro({ estilo: { visibility: 'hidden' } })], docDs1(1440)).ok, false)
  })

  it('DS1-I-13 CASA_LIMPA: a pílula de mel passa sobre o cacau e falha sobre o papel (controle), mel sem a marca falha', () => {
    const pilula = (fundoSob, m = { botaoMel: true }) => dentro({ tag: 'a', estilo: { backgroundColor: MEL }, fundoSob, m })
    assert.equal(medir.casaLimpa([pilula(CACAU)], docDs1(1440)).ok, true)
    assert.equal(medir.casaLimpa([pilula(PAPEL)], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([pilula(AREIA)], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([pilula(CACAU, {})], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([pilula(undefined)], docDs1(1440)).ok, false)
  })

  it('DS1-I-13 CASA_LIMPA: vale também no cabeçalho e no rodapé, mas não no main fora da casa', () => {
    const sombra = { estilo: { boxShadow: CARTAO_CHROME } }
    assert.equal(medir.casaLimpa([no({ ...sombra, m: { noCabecalho: true } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([no({ ...sombra, m: { noRodape: true } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([no({ ...sombra, m: { noMain: true } })], docDs1(1440)).ok, true)
  })

  it('DS1-I-13 CASA_LIMPA_REGISTRO: o main fora da casa é medido à parte, e a casa não entra no registro', () => {
    const fora = (extra = {}) => no({ m: { noMain: true }, ...extra })
    const r = medir.casaLimpaRegistro([fora({ estilo: { boxShadow: CARTAO_CHROME } })], docDs1(1440))
    assert.equal(r.regra, 'CASA_LIMPA_REGISTRO')
    assert.equal(r.ok, false)
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
    // O `...extra` do auxiliar `fora` troca o `m` inteiro: a marca de escopo `noMain` vai junto de cada marca nova.
    assert.equal(medir.casaLimpaRegistro([fora({ m: { noMain: true, painel: true } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpaRegistro([fora({ texto: '21:42', m: { noMain: true, folha: true } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpaRegistro([fora()], docDs1(1440)).ok, true)
    assert.equal(medir.casaLimpaRegistro([dentro({ m: { painel: true } })], docDs1(1440)).ok, true)
    assert.equal(medir.casaLimpaRegistro([no({ m: { noCabecalho: true }, estilo: { boxShadow: CARTAO_CHROME } })], docDs1(1440)).ok, true)
  })

  it('DS1-I-13 CASA_LIMPA falha fechado: opacidade ilegível, fundo ilegível ou sombra ausente', () => {
    assert.equal(medir.casaLimpa([dentro({ estilo: { opacity: 'NaN' } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([dentro({ estilo: { opacity: undefined } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([dentro({ estilo: { backgroundColor: 'cor-estranha' } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([dentro({ estilo: { boxShadow: undefined } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaLimpa([dentro({ estilo: { textShadow: undefined } })], docDs1(1440)).ok, false)
  })
})

describe('DS1-I-13 CASA_PRESENTE: a rota de casa precisa de um [data-casa] no main', () => {
  const raiz = (extra = {}) => com(no({ tag: 'div', texto: '', m: { casaRaiz: true, noMain: true } }), extra)

  it('DS1-I-13 CASA_PRESENTE passa com um [data-casa] no main', () => {
    const r = medir.casaPresente([no(), raiz()], docDs1(1440))
    assert.equal(r.ok, true, r.motivo)
    assert.equal(r.regra, 'CASA_PRESENTE')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
  })

  it('DS1-I-13 CASA_PRESENTE controle: o caso sistema sem [data-casa] falha, e uma raiz fora do main não vale', () => {
    assert.equal(medir.casaPresente([no(), no({ m: { noMain: true } })], docDs1(1440)).ok, false)
    assert.equal(medir.casaPresente([], docDs1(1440)).ok, false)
    assert.equal(medir.casaPresente([raiz({ m: { noMain: false } })], docDs1(1440)).ok, false)
  })
})

// ---- DS1-I-15 a lista de regras, o escopo e o bloqueio ----

describe('DS1-I-15 a lista de regras, o escopo por caso e o bloqueio (RF-15)', () => {
  const NOVAS = ['FAIXA', 'PRODUTO', 'RODAPE', 'EXIBICAO', 'ITALICO', 'TITULO', 'TITULO_REGISTRO', 'SOBRETITULO', 'DOCK', 'CABECALHO', 'BOTAO_LARGO', 'CENA', 'CASA_LIMPA', 'CASA_LIMPA_REGISTRO', 'CASA_PRESENTE']

  it('DS1-I-15 REGRAS é a lista de 21 regras na ordem do spec, e REGRAS_ORIGINAIS são as sete primeiras', () => {
    assert.deepEqual(medir.REGRAS, REGRAS_ESPERADAS)
    assert.deepEqual(medir.REGRAS_ORIGINAIS, REGRAS_ESPERADAS.slice(0, 7))
  })

  // REP-HOME (REPH-I-18): the Início and its two display variants are casa cases too, so CASOS_CASA lists them and
  // they leave the "public page" groups below (they run the 22 rules and the 8 new ones, covered by REPH-I-18).
  const CASOS_DO_INICIO = ['inicio', 'inicio_b', 'inicio_c']
  const CASOS_CASA_ESPERADOS = ['sistema', ...CASOS_DO_INICIO, 'comofunciona', 'cuidado', 'desenvolvimento', 'naoencontrada']
  const PUBLICOS_SEM_INICIO = () => medir.CASOS_PUBLICOS.filter((caso) => !CASOS_CASA_ESPERADOS.includes(caso))

  it('DS1-I-15 CASOS_PUBLICOS são os 15 casos do §0 e CASOS_CASA é o sistema, os três do Início e as quatro páginas na casa', () => {
    assert.deepEqual(medir.CASOS_PUBLICOS, CASOS_PUBLICOS_ESPERADOS)
    assert.deepEqual(medir.CASOS_CASA, CASOS_CASA_ESPERADOS)
    assert.equal(new Set(medir.CASOS_PUBLICOS).size, 15)
  })

  it('DS1-I-15 regrasDoCaso: página pública roda 20 regras (sem CASA_PRESENTE) e o sistema, as páginas na casa e o Início rodam as 21 (o Início, mais as 8 dele)', () => {
    for (const caso of PUBLICOS_SEM_INICIO()) {
      const regras = medir.regrasDoCaso(caso, '')
      assert.deepEqual(regras, REGRAS_ESPERADAS.filter((r) => r !== 'CASA_PRESENTE'), caso)
    }
    assert.deepEqual(medir.regrasDoCaso('sistema', 'sistema'), REGRAS_ESPERADAS)
    for (const caso of ['comofunciona', 'cuidado', 'desenvolvimento', 'naoencontrada']) assert.deepEqual(medir.regrasDoCaso(caso, ''), REGRAS_ESPERADAS, caso)
    for (const caso of CASOS_DO_INICIO) assert.deepEqual(medir.regrasDoCaso(caso, ''), [...REGRAS_ESPERADAS, ...NOVAS_REGRAS], caso)
  })

  it('DS1-I-15 regrasDoCaso: nos casos da área logada vêm as sete originais, na ordem, sem as regras de página pública', () => {
    for (const [caso, rota] of [['hoje', 'app/hoje'], ['sessao', 'app/hoje'], ['fila', 'moderacao'], ['historico', 'app/historico']]) {
      const regras = medir.regrasDoCaso(caso, rota)
      assert.deepEqual(regras.slice(0, 7), medir.REGRAS_ORIGINAIS, caso)
      for (const fora of ['RODAPE', 'EXIBICAO', 'DOCK', 'CABECALHO', 'CASA_PRESENTE']) assert.ok(!regras.includes(fora), `${caso} ${fora}`)
    }
  })

  it('DS1-I-15 bloqueantesDoCaso: público e sistema bloqueiam tudo menos as duas regras só de registro', () => {
    const registro = ['TITULO_REGISTRO', 'CASA_LIMPA_REGISTRO']
    for (const caso of PUBLICOS_SEM_INICIO()) {
      const bloqueantes = medir.bloqueantesDoCaso(caso, '')
      assert.deepEqual(bloqueantes, REGRAS_ESPERADAS.filter((r) => r !== 'CASA_PRESENTE' && !registro.includes(r)), caso)
    }
    assert.deepEqual(medir.bloqueantesDoCaso('sistema', 'sistema'), REGRAS_ESPERADAS.filter((r) => !registro.includes(r)))
    for (const caso of ['comofunciona', 'cuidado', 'desenvolvimento', 'naoencontrada']) assert.deepEqual(medir.bloqueantesDoCaso(caso, ''), REGRAS_ESPERADAS.filter((r) => !registro.includes(r)), caso)
    assert.ok(medir.bloqueantesDoCaso('sistema', 'sistema').includes('CASA_PRESENTE'))
    // The Início is a casa now (REP-HOME): CASA_PRESENTE blocks there too, and so do its 8 rules.
    assert.deepEqual(medir.bloqueantesDoCaso('inicio', ''), [...REGRAS_ESPERADAS.filter((r) => !registro.includes(r)), ...NOVAS_REGRAS])
  })

  it('DS1-I-15 bloqueantesDoCaso: a área logada bloqueia as sete originais (e a chamada com um argumento segue valendo)', () => {
    for (const bloqueantes of [medir.bloqueantesDoCaso('hoje', 'app/hoje'), medir.bloqueantesDoCaso('hoje')]) {
      assert.deepEqual(bloqueantes.slice(0, 7), medir.REGRAS_ORIGINAIS)
      for (const registro of ['TITULO_REGISTRO', 'CASA_LIMPA_REGISTRO']) assert.ok(!bloqueantes.includes(registro))
    }
  })

  const pagina = () => {
    const doc = docDs1(1440)
    const nos = [
      ...rodapeConforme(),
      no({ tag: 'h1', texto: 'Pode entrar.', estilo: { fontFamily: EXIBICAO_CHROME }, m: { noMain: true, casa: true, titulo: true }, tituloId: 't' }),
      com(no({ tag: 'a', texto: 'Criar conta', rect: { x: 1260, y: 12, w: 140, h: 48 }, estilo: { backgroundColor: CACAU, color: PAPEL } }), {
        m: { cabecalhoPilula: true, noCabecalho: true, interativo: true },
      }),
      faixaNo(),
      com(no({ tag: 'div', texto: '' }), { m: { casaRaiz: true, noMain: true } }),
    ]
    return { doc, nos }
  }

  it('DS1-I-15 avaliarTudo com caso devolve um resultado por regra do caso, na ordem, e só as duas de registro não bloqueiam', () => {
    const { doc, nos } = pagina()
    const resultados = avaliarTudo({ doc, nos, tema: 'claro', caso: 'inicio', rota: '' })
    assert.deepEqual(resultados.map((r) => r.regra), medir.regrasDoCaso('inicio', ''))
    const bloqueantes = medir.bloqueantesDoCaso('inicio', '')
    for (const r of resultados) assert.equal(r.bloqueia, bloqueantes.includes(r.regra), r.regra)
    assert.equal(resultados.find((r) => r.regra === 'TITULO_REGISTRO').bloqueia, false)
    assert.equal(resultados.find((r) => r.regra === 'CASA_LIMPA_REGISTRO').bloqueia, false)
    for (const regra of NOVAS.filter((n) => n !== 'CASA_PRESENTE')) {
      const r = resultados.find((x) => x.regra === regra)
      assert.equal(r.ok, true, `${regra}: ${r.motivo}`)
    }
  })

  it('DS1-I-15 avaliarTudo no sistema inclui CASA_PRESENTE como bloqueante; sem o [data-casa] ele falha e as outras seguem', () => {
    const { doc, nos } = pagina()
    const com_casa = avaliarTudo({ doc, nos, tema: 'claro', caso: 'sistema', rota: 'sistema' })
    const presente = com_casa.find((r) => r.regra === 'CASA_PRESENTE')
    assert.equal(presente.ok, true)
    assert.equal(presente.bloqueia, true)
    const sem = avaliarTudo({ doc, nos: nos.filter((n) => !n.m.casaRaiz), tema: 'claro', caso: 'sistema', rota: 'sistema' })
    assert.equal(sem.find((r) => r.regra === 'CASA_PRESENTE').ok, false)
  })

  it('DS1-I-15 avaliarTudo: uma violação da casa reprova a regra bloqueante e deixa o registro verde, e o contrário', () => {
    const { doc, nos } = pagina()
    const comPainelNaCasa = [...nos, no({ m: { casa: true, painel: true } })]
    const dentro = avaliarTudo({ doc, nos: comPainelNaCasa, tema: 'claro', caso: 'inicio', rota: '' })
    assert.equal(dentro.find((r) => r.regra === 'CASA_LIMPA').ok, false)
    assert.equal(dentro.find((r) => r.regra === 'CASA_LIMPA_REGISTRO').ok, true)
    const comPainelFora = [...nos, no({ m: { noMain: true, painel: true } })]
    const fora = avaliarTudo({ doc, nos: comPainelFora, tema: 'claro', caso: 'inicio', rota: '' })
    assert.equal(fora.find((r) => r.regra === 'CASA_LIMPA').ok, true)
    assert.equal(fora.find((r) => r.regra === 'CASA_LIMPA_REGISTRO').ok, false)
  })

  it('DS1-I-15 avaliarTudo sem o caso devolve só as sete originais, como antes (os testes antigos seguem valendo)', () => {
    const { doc, nos } = pagina()
    assert.deepEqual(avaliarTudo({ doc, nos, tema: 'claro' }).map((r) => r.regra), medir.REGRAS_ORIGINAIS)
  })

  it('DS1-I-15 o resumo marca como "registrada" a regra de registro que falha, e como FALHA a que bloqueia', () => {
    const linha = resumo('x.json', [
      { regra: 'TITULO_REGISTRO', ok: false, bloqueia: false },
      { regra: 'CASA_LIMPA', ok: false, bloqueia: true },
      { regra: 'FAIXA', ok: true, bloqueia: true },
    ])
    assert.equal(linha, 'RESUMO x.json TITULO_REGISTRO registrada CASA_LIMPA FALHA FAIXA ok')
  })

  it('DS1-I-15 o comentário de cabeçalho do medidor nomeia as seções do DESIGN.md que ele aplica', () => {
    const texto = fs.readFileSync(fileURLToPath(new URL('./medir-dom.mjs', import.meta.url)), 'utf8').replaceAll('\r\n', '\n')
    const cabecalho = []
    for (const linha of texto.split('\n')) {
      if (!linha.startsWith('//')) break
      cabecalho.push(linha)
    }
    const comentario = cabecalho.join('\n')
    for (const secao of ['Colors', 'Typography', 'Layout', 'Elevation & Depth', 'Components', "Do's and Don'ts"]) {
      assert.ok(comentario.includes(secao), `o cabeçalho não nomeia a seção ${secao}`)
    }
  })
})

describe('MED-AUTH:RF-03/RF-05 o CLI de verdade (spawn)', () => {
  const SCRIPT = fileURLToPath(new URL('./medir-dom.mjs', import.meta.url))
  const SENHA = 'senha-local-ficticia'
  const temporarias = []
  after(() => {
    for (const pasta of temporarias) fs.rmSync(pasta, { recursive: true, force: true })
  })
  const pastaNova = (prefixo) => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), prefixo))
    temporarias.push(pasta)
    return pasta
  }
  const rodar = (argumentos, cwd) => {
    const env = { ...process.env, CDP_PORTA: '1' }
    delete env.BASE_URL
    return spawnSync(process.execPath, [SCRIPT, ...argumentos], { cwd, env, encoding: 'utf8', timeout: 60000 })
  }
  const comCdp = (casos) => {
    const cwd = pastaNova('medir-dom-med-cwd-')
    fs.mkdirSync(path.join(cwd, '.oc'))
    fs.writeFileSync(path.join(cwd, '.oc', 'cdp.mjs'), `export const CASOS = ${JSON.stringify(casos)}\n`)
    return cwd
  }

  it("conta desconhecida em CASOS: saída 2 de uso, sem Chrome, sem JSON e sem a senha na saída", () => {
    const cwd = comCdp({ fila: { rota: 'moderacao', conta: 'admin' } })
    const saida = pastaNova('medir-dom-med-saida-')
    const r = rodar([saida, 'fila:claro:1440x900'], cwd)
    assert.equal(r.status, 2, `${r.stdout}\n${r.stderr}`)
    assert.match(r.stderr, /conta inválida/)
    assert.doesNotMatch(r.stderr, /erro de medição/)
    assert.deepEqual(fs.readdirSync(saida), [])
    assert.ok(!`${r.stdout}${r.stderr}`.includes(SENHA))
  })

  it('o JSON velho do caso é apagado antes de medir: a falha deixa a pasta sem ele, e o erro diz o caso', () => {
    const cwd = comCdp({ fila: { rota: 'moderacao' } })
    const saida = pastaNova('medir-dom-med-saida-')
    fs.writeFileSync(path.join(saida, 'fila_claro_1440.json'), '{"velho":true}')
    fs.writeFileSync(path.join(saida, 'outro_claro_1440.json'), '{"de_outro_caso":true}')
    const r = rodar([saida, 'fila:claro:1440x900'], cwd)
    assert.equal(r.status, 2, `${r.stdout}\n${r.stderr}`)
    assert.match(r.stderr, /^erro de medição: fila: /m)
    assert.deepEqual(fs.readdirSync(saida), ['outro_claro_1440.json'])
    assert.ok(!`${r.stdout}${r.stderr}`.includes(SENHA))
  })
})

// =============================================================================================
// REP-HOME, round 1 (card t_7afd7849): the new meter rules for the rebuilt `/` (Inicio).
// Test-first: every test below must FAIL on an assertion at this base, never on a missing import
// (so each one reaches the code through `regra(name)`, which asserts `typeof === 'function'`).
//
// INPUT CONTRACT the implementation must collect (coletarNaPagina) and the rules read:
//   marks in `no.m` (new): h1Span1, h1Span2 (the two spans of the single h1), heroiBotao (the hero
//     mel pill), heroiLink (the hero text link), legendaHeroi, palco (the [data-troca-palco] stage),
//     colunaNoite (the cacau night column), ladoDia, ladoNoite (text on each side of the seam),
//     fechamento (the closing band's mel button), paredeNoite (a full-width cacau node that covers
//     the rows above the 390 plate), camadaNoite (the sliding night layer), luz (the [data-luz]
//     lamp), luzCapa (a rendered light cover).
//   marks reused: cenaPlaca, produto (the frame), produtoTela (the real screen image), botaoMel,
//     cabecalhoPilula, casa, legenda, faixa.
//   node fields (new): ordemDom (DOM index), tom (Legenda data-tom), currentSrc, alturaConteudo.
//   doc fields (new): cabecalhoAltura, noite = { porRolagem: [{ rolagem, total, noite, cabecalho }] },
//     animacoesCasa (running animations inside [data-casa] after load, RM render), placa390.
//   Seam = plate.x + (910 / 1672) * plate.w. NOITE share = sum(noite) / sum(total - cabecalho).
// Rules are exported as functions (nos, doc) => { regra, ok, motivo, nos_com_falha }:
//   heroi, legendaPresa, molduraDobra, noite, costura, tempo, trocaRm, capturaReal.
// Out of scope widths answer ok with the reason "largura fora do escopo".
// =============================================================================================

const NOITE_2 = 'rgb(185, 192, 159)'
const TEXTO_2 = CHAO_NOITE
const NOVAS_REGRAS = ['HEROI', 'LEGENDA_PRESA', 'MOLDURA_DOBRA', 'NOITE', 'COSTURA', 'TEMPO', 'TROCA_RM', 'CAPTURA_REAL']
const FRACAO_COSTURA = 910 / 1672
const PLACA_1440 = { x: 66.7, y: 112, w: 900, h: 507 }
const PLACA_390 = { x: -153.4, y: 364, w: 543.4, h: 305.8 }
const costuraDe = (placa) => placa.x + FRACAO_COSTURA * placa.w

/** The rule function `nome` from the meter; an AssertionError (not a TypeError) while it is missing. */
function regra(nome) {
  assert.equal(typeof medir[nome], 'function', `medir-dom.mjs must export ${nome}()`)
  return medir[nome]
}

const docRh = (largura, extra = {}) => ({
  ...docDs1(largura),
  cabecalhoAltura: largura >= 768 ? 64 : 56,
  ...extra,
})

/** A node with marks `m` and rectangle `rect`. */
const rhNo = (m, rect, extra = {}) => no({ m, rect, ...extra })

const placaNo = (rect, extra = {}) => rhNo({ cenaPlaca: true }, rect, { tag: 'img', texto: '', ordemDom: 1, ...extra })

/** Text with an ink over a ground chain. */
const tinta = (cor, chao, extra = {}) =>
  no({ texto: 'texto', estilo: { color: cor }, cadeia: [TRANSPARENTE, chao], ...extra })

const ok = (r) => assert.equal(r.ok, true, r.motivo)
const falha = (r, padrao) => {
  assert.equal(r.ok, false, `expected a failure: ${r.motivo}`)
  if (padrao) assert.match(r.motivo, padrao)
}

// ---- REPH-I-03 HEROI ----

const heroi1440 = ({ placa = PLACA_1440, botao = true, spans = true } = {}) => [
  placaNo(placa),
  ...(spans
    ? [
        rhNo({ h1Span1: true }, { x: 66.7, y: 120, w: 480.3, h: 64 }, { tag: 'span', texto: 'a', ordemDom: 2 }),
        rhNo({ h1Span2: true }, { x: 566, y: 120, w: 400, h: 64 }, { tag: 'span', texto: 'b', ordemDom: 3 }),
      ]
    : []),
  ...(botao
    ? [rhNo({ botaoMel: true, heroiBotao: true }, { x: 600, y: 300, w: 220, h: 48 }, { tag: 'a', texto: 'c', ordemDom: 4, fundoSob: CACAU })]
    : []),
]

const heroi390 = ({ placa = PLACA_390, parede = true, link = { x: 20, y: 268, w: 200, h: 44 }, botao = false } = {}) => [
  placaNo(placa),
  ...(parede ? [rhNo({ paredeNoite: true }, { x: 0, y: 144, w: 390, h: 220 }, { tag: 'div', texto: '', ordemDom: 0, estilo: { backgroundColor: CACAU } })] : []),
  rhNo({ heroiLink: true }, link, { tag: 'a', texto: 'd', ordemDom: 4 }),
  ...(botao ? [rhNo({ botaoMel: true, heroiBotao: true }, { x: 20, y: 268, w: 220, h: 48 }, { tag: 'a', texto: 'c', ordemDom: 5 })] : []),
]

describe('REPH-I-03 HEROI: 900 px plate at 1440, the M05 window at 390', () => {
  it('REPH-I-03 HEROI passes at 1440: plate 900 wide at x 66.7, its seam on the h1 seam, the hero pill present', () => {
    const r = regra('heroi')(heroi1440(), docRh(1440))
    ok(r)
    assert.equal(r.regra, 'HEROI')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
  })

  it('REPH-I-03 HEROI fails at 1440 for an 860 px plate', () => {
    falha(regra('heroi')(heroi1440({ placa: { ...PLACA_1440, w: 860 } }), docRh(1440)), /900|largura|placa/i)
  })

  it('REPH-I-03 HEROI fails at 1440 when the plate seam is 6 px off the h1 seam', () => {
    falha(regra('heroi')(heroi1440({ placa: { ...PLACA_1440, x: PLACA_1440.x + 6 } }), docRh(1440)), /costura|seam|h1/i)
  })

  it('REPH-I-03 HEROI fails at 1440 without the hero mel pill', () => {
    falha(regra('heroi')(heroi1440({ botao: false }), docRh(1440)), /bot|pílula|pilula|mel/i)
  })

  it('REPH-I-03 HEROI passes at 390: plate edge to edge at the nominal box, rows 144-364 cacau, only the text link in the fold', () => {
    ok(regra('heroi')(heroi390(), docRh(390)))
  })

  it('REPH-I-03 HEROI fails at 390 for a plate 370 wide (2 px short is not edge to edge)', () => {
    falha(regra('heroi')(heroi390({ placa: { x: -173.4, y: 364, w: 543.4, h: 305.8 } }), docRh(390)), /borda|390|direita/i)
  })

  it('REPH-I-03 HEROI fails at 390 for the 390 x 219 uncropped plate', () => {
    falha(regra('heroi')(heroi390({ placa: { x: 0, y: 364, w: 390, h: 219 } }), docRh(390)), /altura|janela|recort/i)
  })

  it('REPH-I-03 HEROI fails at 390 when rows 144-364 are not covered by a cacau full-width node', () => {
    falha(regra('heroi')(heroi390({ parede: false }), docRh(390)), /cacau|parede|144/i)
  })

  it('REPH-I-03 HEROI fails at 390 when the first action sits at y 312', () => {
    falha(regra('heroi')(heroi390({ link: { x: 20, y: 312, w: 200, h: 44 } }), docRh(390)), /300|ação|acao|link/i)
  })

  it('REPH-I-03 HEROI fails at 390 when the hero shows a mel pill (the header pill is the filled action)', () => {
    falha(regra('heroi')(heroi390({ botao: true }), docRh(390)), /mel|bot|pílula|pilula/i)
  })

  it('REPH-I-03 HEROI is out of scope at 768 and 1024', () => {
    for (const largura of [768, 1024]) {
      const r = regra('heroi')([], docRh(largura))
      ok(r)
      assert.match(r.motivo, /largura fora do escopo/)
    }
  })

  it('REPH-I-03 HEROI fails closed at 1440 and 390 without a plate', () => {
    falha(regra('heroi')([], docRh(1440)))
    falha(regra('heroi')([], docRh(390)))
  })
})

// ---- REPH-I-04 LEGENDA_PRESA ----

const legendaNo = (rect, { cor = TINTA, chao = PAPEL, tom = 'dia', ordemDom = 2 } = {}) =>
  rhNo({ legenda: true }, rect, { tag: 'p', texto: 'l', tom, ordemDom, estilo: { color: cor }, cadeia: [TRANSPARENTE, chao] })

const palcoNo = (y) => rhNo({ palco: true }, { x: 0, y, w: 1000, h: 900 }, { tag: 'div', texto: '', ordemDom: 3 })

const legenda1440 = (rect = { x: 80, y: 622, w: 400, h: 28 }, opcoes = {}) => [placaNo(PLACA_1440), legendaNo(rect, opcoes)]
const legenda390 = ({ rect = { x: 20, y: 678, w: 350, h: 28 }, palco = 722, entre = null, ...opcoes } = {}) => [
  placaNo(PLACA_390),
  ...(entre ? [entre] : []),
  legendaNo(rect, { cor: PAPEL, chao: CACAU, tom: 'noite', ordemDom: entre ? 3 : 2, ...opcoes }),
  palcoNo(palco),
]

describe('REPH-I-04 LEGENDA_PRESA: the caption is stuck to the plate', () => {
  it('REPH-I-04 LEGENDA_PRESA passes at 1440 (cacau ink, 3 px under the plate, ends left of the seam - 48)', () => {
    const r = regra('legendaPresa')(legenda1440(), docRh(1440))
    ok(r)
    assert.equal(r.regra, 'LEGENDA_PRESA')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
  })

  it('REPH-I-04 LEGENDA_PRESA passes at 390 (papel on cacau, 8 px under the plate, stage 16 px under the caption)', () => {
    ok(regra('legendaPresa')(legenda390(), docRh(390)))
  })

  it('REPH-I-04 LEGENDA_PRESA fails for a caption overlaid on the plate at both widths', () => {
    falha(regra('legendaPresa')(legenda1440({ x: 80, y: 560, w: 400, h: 28 }), docRh(1440)), /placa|0|12|dist/i)
    falha(regra('legendaPresa')(legenda390({ rect: { x: 20, y: 640, w: 350, h: 28 }, palco: 684 }), docRh(390)), /placa|0|12|dist/i)
  })

  it('REPH-I-04 LEGENDA_PRESA fails for a 20 px gap at 1440 and a 24 px gap at 390', () => {
    falha(regra('legendaPresa')(legenda1440({ x: 80, y: 639, w: 400, h: 28 }), docRh(1440)), /12|dist/i)
    falha(regra('legendaPresa')(legenda390({ rect: { x: 20, y: 694, w: 350, h: 28 }, palco: 738 }), docRh(390)), /12|dist/i)
  })

  it('REPH-I-04 LEGENDA_PRESA fails at 390 with an element between the plate and the caption', () => {
    const entre = rhNo({}, { x: 20, y: 670, w: 100, h: 4 }, { tag: 'div', texto: '', ordemDom: 2 })
    falha(regra('legendaPresa')(legenda390({ entre }), docRh(390)), /entre|between|seguinte|próximo/i)
  })

  it('REPH-I-04 LEGENDA_PRESA fails at 390 for cacau ink and at 1440 for papel ink', () => {
    falha(regra('legendaPresa')(legenda390({ cor: TINTA, chao: CACAU }), docRh(390)), /tinta|papel|cor|contraste/i)
    falha(regra('legendaPresa')(legenda1440(undefined, { cor: PAPEL }), docRh(1440)), /tinta|cacau|cor|contraste/i)
  })

  it('REPH-I-04 LEGENDA_PRESA fails at 390 when the stage does not start 16 px under the caption', () => {
    falha(regra('legendaPresa')(legenda390({ palco: 740 }), docRh(390)), /palco|16|estágio/i)
  })

  it('REPH-I-04 LEGENDA_PRESA fails at 1440 when the caption reaches past the seam - 48', () => {
    const seam = costuraDe(PLACA_1440)
    falha(regra('legendaPresa')(legenda1440({ x: 80, y: 622, w: seam - 48 - 80 + 20, h: 28 }), docRh(1440)), /costura|seam|48/i)
  })

  it('REPH-I-04 LEGENDA_PRESA is out of scope at 768 and fails closed without a caption', () => {
    const r = regra('legendaPresa')([], docRh(768))
    ok(r)
    assert.match(r.motivo, /largura fora do escopo/)
    falha(regra('legendaPresa')([placaNo(PLACA_1440)], docRh(1440)))
  })
})

// ---- REPH-I-05 MOLDURA_DOBRA ----

const moldura1440 = ({ palcoY = 795, frame = { x: 140, y: 835, w: 300, h: 640 } } = {}) => [
  rhNo({ palco: true }, { x: 0, y: palcoY, w: 1440, h: 1200 }, { tag: 'div', texto: '', ordemDom: 5 }),
  ...(frame ? [rhNo({ produto: true }, frame, { tag: 'div', texto: '', ordemDom: 6 }), rhNo({ produtoTela: true }, { ...frame, x: frame.x + 8, y: frame.y + 8, w: frame.w - 16, h: frame.h - 16 }, { tag: 'img', texto: '', ordemDom: 7 })] : []),
]

const moldura390 = ({ palcoY = 722, frame = { x: 20, y: 730, w: 296.8, h: 622.7 } } = {}) => moldura1440({ palcoY, frame })

describe('REPH-I-05 MOLDURA_DOBRA: the real frame is whole at the scrollY of p 0', () => {
  it('REPH-I-05 MOLDURA_DOBRA passes at 1440 (pin: scrollY 771, frame top at viewport 64 under the 64 px header)', () => {
    const r = regra('molduraDobra')(moldura1440(), docRh(1440))
    ok(r)
    assert.equal(r.regra, 'MOLDURA_DOBRA')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
  })

  it('REPH-I-05 MOLDURA_DOBRA passes at 390 (no pin: scrollY 674, frame whole under the 56 px header)', () => {
    ok(regra('molduraDobra')(moldura390(), docRh(390)))
  })

  it('REPH-I-05 MOLDURA_DOBRA fails at 1440 when the frame top is under the header at the p 0 scrollY', () => {
    falha(regra('molduraDobra')(moldura1440({ frame: { x: 140, y: 815, w: 300, h: 640 } }), docRh(1440)), /cabeçalho|header|topo/i)
  })

  it('REPH-I-05 MOLDURA_DOBRA fails when the p 0 scrollY is greater than innerHeight', () => {
    falha(regra('molduraDobra')(moldura1440({ palcoY: 1000, frame: { x: 140, y: 1040, w: 300, h: 640 } }), docRh(1440)), /rolagem|scroll|innerHeight|altura/i)
    falha(regra('molduraDobra')(moldura390({ palcoY: 1000, frame: { x: 20, y: 1008, w: 296.8, h: 622.7 } }), docRh(390)), /rolagem|scroll|innerHeight|altura/i)
  })

  it('REPH-I-05 MOLDURA_DOBRA fails when the frame bottom is below the viewport', () => {
    falha(regra('molduraDobra')(moldura390({ frame: { x: 20, y: 730, w: 296.8, h: 900 } }), docRh(390)), /base|bottom|dentro|inferior/i)
  })

  it('REPH-I-05 MOLDURA_DOBRA fails closed with the frame absent', () => {
    falha(regra('molduraDobra')(moldura1440({ frame: null }), docRh(1440)))
    falha(regra('molduraDobra')([], docRh(390)))
  })

  it('REPH-I-05 MOLDURA_DOBRA is out of scope at 768 and 1024', () => {
    for (const largura of [768, 1024]) {
      const r = regra('molduraDobra')([], docRh(largura))
      ok(r)
      assert.match(r.motivo, /largura fora do escopo/)
    }
  })
})

// ---- REPH-I-07 NOITE ----

const amostras = (noitePx, cabecalho = 92160, total = 1296000) => ({
  noite: { porRolagem: [{ rolagem: 0, total, noite: noitePx, cabecalho }, { rolagem: 900, total, noite: noitePx, cabecalho }] },
})
const bandaNoite = (largura, y = 1100) =>
  rhNo({ faixa: true }, { x: 0, y, w: largura, h: 600 }, { tag: 'section', texto: '', estilo: { backgroundColor: CACAU }, ordemDom: 30 })

describe('REPH-I-07 NOITE: the night share of the first two screens and a full-bleed cacau band', () => {
  for (const largura of [1440, 390]) {
    it(`REPH-I-07 NOITE passes at ${largura}: share 0.331 of the non-header area, band above 2 x innerHeight`, () => {
      const r = regra('noite')([bandaNoite(largura)], docRh(largura, amostras(400000)))
      ok(r)
      assert.equal(r.regra, 'NOITE')
      assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
    })

    it(`REPH-I-07 NOITE fails at ${largura} for a 0.29 share`, () => {
      falha(regra('noite')([bandaNoite(largura)], docRh(largura, amostras(350000))), /0[.,]29|parcela|share|noite/i)
    })

    it(`REPH-I-07 NOITE fails at ${largura} with no full-bleed cacau band above 2 x innerHeight`, () => {
      falha(regra('noite')([], docRh(largura, amostras(400000))), /faixa|banda|cacau/i)
      falha(regra('noite')([bandaNoite(largura, 3000)], docRh(largura, amostras(400000))), /faixa|banda|cacau|2/i)
    })
  }

  it('REPH-I-07 NOITE keeps the header pixels out of the denominator: 0.316 of the non-header area (0.293 of the full area) passes, and 0.224 fails', () => {
    // 380000 / (1296000 - 92160) = 0.316 passes only when the header rows are subtracted from the denominator.
    ok(regra('noite')([bandaNoite(1440)], docRh(1440, amostras(380000, 92160))))
    // The same night pixels over a larger area with no header rows (0.224) is a real miss.
    falha(regra('noite')([bandaNoite(1440)], docRh(1440, amostras(380000, 0, 1296000 + 400000))), /parcela|share|noite/i)
  })

  it('REPH-I-07 NOITE is out of scope at 768 and 1024 and fails closed without samples', () => {
    for (const largura of [768, 1024]) {
      const r = regra('noite')([], docRh(largura))
      ok(r)
      assert.match(r.motivo, /largura fora do escopo/)
    }
    falha(regra('noite')([bandaNoite(1440)], docRh(1440)))
  })
})

// ---- REPH-I-08 COSTURA ----

const costura1440 = ({ colunaX, diaDireita = 486.7, noiteEsq = 600.5, placa = PLACA_1440 } = {}) => {
  const seam = costuraDe(placa)
  return [
    placaNo(placa),
    rhNo({ colunaNoite: true }, { x: colunaX ?? seam, y: 112, w: 1440 - (colunaX ?? seam), h: 2000 }, { tag: 'div', texto: '', ordemDom: 2, estilo: { backgroundColor: CACAU } }),
    rhNo({ ladoDia: true }, { x: diaDireita - 400, y: 360, w: 400, h: 60 }, { tag: 'p', texto: 'dia', ordemDom: 3 }),
    rhNo({ ladoNoite: true }, { x: noiteEsq, y: 360, w: 400, h: 60 }, { tag: 'p', texto: 'noite', ordemDom: 4 }),
  ]
}
const PLACA_1024 = { x: 48, y: 96, w: 640, h: 360 }
const costura390 = ({ ordemDia = [5, 6], ordemNoite = [7, 8], yNoite = [600, 700] } = {}) => [
  placaNo(PLACA_390),
  rhNo({ ladoDia: true }, { x: 20, y: 420, w: 300, h: 60 }, { tag: 'p', texto: 'dia1', ordemDom: ordemDia[0] }),
  rhNo({ ladoDia: true }, { x: 20, y: 500, w: 300, h: 60 }, { tag: 'p', texto: 'dia2', ordemDom: ordemDia[1] }),
  rhNo({ ladoNoite: true }, { x: 20, y: yNoite[0], w: 300, h: 60 }, { tag: 'p', texto: 'noite1', ordemDom: ordemNoite[0] }),
  rhNo({ ladoNoite: true }, { x: 20, y: yNoite[1], w: 300, h: 60 }, { tag: 'p', texto: 'noite2', ordemDom: ordemNoite[1] }),
]

describe('REPH-I-08 COSTURA: the seam is page structure', () => {
  it('REPH-I-08 COSTURA passes at 1440 (column on the seam, day text <= seam - 48, night text >= seam + 32)', () => {
    const r = regra('costura')(costura1440(), docRh(1440))
    ok(r)
    assert.equal(r.regra, 'COSTURA')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
  })

  it('REPH-I-08 COSTURA passes at 1024 on its own plate', () => {
    const seam = costuraDe(PLACA_1024)
    ok(regra('costura')(costura1440({ placa: PLACA_1024, diaDireita: seam - 50, noiteEsq: seam + 44 }), docRh(1024)))
  })

  it('REPH-I-08 COSTURA passes at 390 with the day elements first in DOM order and above the night ones', () => {
    ok(regra('costura')(costura390(), docRh(390)))
  })

  it('REPH-I-08 COSTURA fails at 1440 when the night column is 12 px off the seam', () => {
    falha(regra('costura')(costura1440({ colunaX: costuraDe(PLACA_1440) + 12 }), docRh(1440)), /coluna|costura|seam/i)
  })

  it('REPH-I-08 COSTURA fails at 1440 when day text ends 20 px before the seam, and when night text starts 20 px after it', () => {
    const seam = costuraDe(PLACA_1440)
    falha(regra('costura')(costura1440({ diaDireita: seam - 20 }), docRh(1440)), /48|dia/i)
    falha(regra('costura')(costura1440({ noiteEsq: seam + 20 }), docRh(1440)), /32|noite/i)
  })

  it('REPH-I-08 COSTURA fails at 390 when a night element comes before a day element', () => {
    falha(regra('costura')(costura390({ ordemDia: [7, 8], ordemNoite: [5, 6] }), docRh(390)), /ordem|DOM|noite/i)
  })

  it('REPH-I-08 COSTURA fails at 390 when a night element sits above a day element', () => {
    falha(regra('costura')(costura390({ yNoite: [300, 700] }), docRh(390)), /acima|ordem|noite|abaixo/i)
  })

  it('REPH-I-08 COSTURA is out of scope at 768 and fails closed without a plate at 1440', () => {
    const r = regra('costura')([], docRh(768))
    ok(r)
    assert.match(r.motivo, /largura fora do escopo/)
    falha(regra('costura')([], docRh(1440)))
  })
})

// ---- REPH-I-09 TEMPO ----

const tempoNos = (largura, { hora2 = '17:30', botoes = null, tomLegenda2 = 'noite' } = {}) => [
  rhNo({}, { x: 20, y: 100, w: 300, h: 60 }, { tag: 'h1', texto: 'titulo', ordemDom: 1 }),
  legendaNo({ x: 20, y: 700, w: 300, h: 28 }, { tom: 'dia', ordemDom: 2 }),
  { ...legendaNo({ x: 20, y: 1500, w: 300, h: 28 }, { cor: PAPEL, chao: CACAU, tom: tomLegenda2, ordemDom: 3 }), texto: hora2 },
  tinta(PAPEL, CACAU, { ordemDom: 4 }),
  tinta(NOITE_2, CACAU, { ordemDom: 5 }),
  tinta(PAPEL, CHAO_NOITE, { ordemDom: 6 }),
  tinta(TINTA, PAPEL, { ordemDom: 7 }),
  tinta(TEXTO_2, PAPEL, { ordemDom: 8 }),
  tinta(TINTA, AREIA, { ordemDom: 9 }),
  ...(botoes ?? [
    ...(largura >= 1024 ? [rhNo({ botaoMel: true, heroiBotao: true }, { x: 600, y: 300, w: 220, h: 48 }, { tag: 'a', texto: 'c', ordemDom: 10, fundoSob: CACAU })] : []),
    rhNo({ botaoMel: true, fechamento: true }, { x: 20, y: 2400, w: 220, h: 48 }, { tag: 'a', texto: 'f', ordemDom: 11, fundoSob: CACAU }),
  ]),
]
// The legenda helper's text is overwritten per node above; the first caption carries 16:00.
const tempoComHoras = (largura, opcoes) => {
  const lista = tempoNos(largura, opcoes)
  lista[1] = { ...lista[1], texto: '16:00' }
  return lista
}

describe('REPH-I-09 TEMPO: hours never go back, ink follows the ground, one closing mel button', () => {
  for (const largura of [1440, 390]) {
    it(`REPH-I-09 TEMPO passes at ${largura} on a conforming evening`, () => {
      const r = regra('tempo')(tempoComHoras(largura), docRh(largura))
      ok(r)
      assert.equal(r.regra, 'TEMPO')
      assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
    })
  }

  it('REPH-I-09 TEMPO fails when 15:00 comes after 17:30', () => {
    falha(regra('tempo')(tempoComHoras(1440, { hora2: '15:00' }), docRh(1440)), /hora|15:00|ordem|decresc|volta/i)
  })

  it('REPH-I-09 TEMPO fails for cacau ink on a cacau ground and for texto-2 ink on areia', () => {
    const base = tempoComHoras(1440)
    falha(regra('tempo')([...base, tinta(TINTA, CACAU, { ordemDom: 40 })], docRh(1440)), /tinta|cor|cacau|chão|chao/i)
    falha(regra('tempo')([...base, tinta(TEXTO_2, AREIA, { ordemDom: 41 })], docRh(1440)), /tinta|texto-2|areia|cor/i)
  })

  it('REPH-I-09 TEMPO fails for a tom="dia" caption on a cacau ground', () => {
    falha(regra('tempo')(tempoComHoras(1440, { tomLegenda2: 'dia' }), docRh(1440)), /tom|legenda/i)
  })

  it('REPH-I-09 TEMPO fails for a second mel button outside the hero pill and the closing band', () => {
    const extra = rhNo({ botaoMel: true }, { x: 20, y: 1800, w: 220, h: 48 }, { tag: 'a', texto: 'x', ordemDom: 50, fundoSob: CACAU })
    falha(regra('tempo')([...tempoComHoras(1440), extra], docRh(1440)), /mel|bot/i)
  })

  it('REPH-I-09 TEMPO fails when a mel button is not on cacau and when the closing button is missing', () => {
    const sobrePapel = [
      ...tempoComHoras(390, { botoes: [] }),
      rhNo({ botaoMel: true, fechamento: true }, { x: 20, y: 2400, w: 220, h: 48 }, { tag: 'a', texto: 'f', ordemDom: 11, fundoSob: PAPEL }),
    ]
    falha(regra('tempo')(sobrePapel, docRh(390)), /cacau|mel|chão|chao/i)
    falha(regra('tempo')(tempoComHoras(390, { botoes: [] }), docRh(390)), /fechamento|mel|bot/i)
  })

  it('REPH-I-09 TEMPO fails at 390 when the hero pill is shown (only the closing mel button exists there)', () => {
    const lista = tempoComHoras(390, {
      botoes: [
        rhNo({ botaoMel: true, heroiBotao: true }, { x: 20, y: 268, w: 220, h: 48 }, { tag: 'a', texto: 'c', ordemDom: 10, fundoSob: CACAU }),
        rhNo({ botaoMel: true, fechamento: true }, { x: 20, y: 2400, w: 220, h: 48 }, { tag: 'a', texto: 'f', ordemDom: 11, fundoSob: CACAU }),
      ],
    })
    falha(regra('tempo')(lista, docRh(390)), /heroi|herói|390|bot|mel/i)
  })
})

// ---- REPH-I-18 the meter itself ----

describe('REPH-I-18 meter surface: cases, rules, fonts, MEDIDAS_REP_HOME, avaliarMovimento', () => {
  it('REPH-I-18 CASOS_CASA lists sistema, inicio, inicio_b, inicio_c and the four public pages in the casa', () => {
    assert.deepEqual(medir.CASOS_CASA, ['sistema', 'inicio', 'inicio_b', 'inicio_c', 'comofunciona', 'cuidado', 'desenvolvimento', 'naoencontrada'])
  })

  it('REPH-I-18 the eight new rules are exported once, in order, and REGRAS keeps its 22 names', () => {
    assert.deepEqual(medir.REGRAS_INICIO, NOVAS_REGRAS)
    assert.deepEqual(medir.REGRAS, REGRAS_ESPERADAS)
  })

  it('REPH-I-18 the inicio cases run the 22 rules and the eight new ones; sistema and the public pages do not', () => {
    for (const caso of ['inicio', 'inicio_b', 'inicio_c']) {
      const lista = medir.regrasDoCaso(caso)
      assert.deepEqual([...lista].sort(), [...REGRAS_ESPERADAS, ...NOVAS_REGRAS].sort(), caso)
      assert.deepEqual(lista.slice(-8), NOVAS_REGRAS, caso)
      for (const nome of NOVAS_REGRAS) assert.ok(medir.bloqueantesDoCaso(caso).includes(nome), `${caso} ${nome}`)
    }
    for (const caso of ['sistema', 'comofunciona', 'hoje']) {
      for (const nome of NOVAS_REGRAS) assert.ok(!medir.regrasDoCaso(caso).includes(nome), `${caso} ${nome}`)
    }
  })

  it('REPH-I-18 avaliarTudo on an inicio case answers each new rule once, blocking, failing closed on an empty page', () => {
    const r = medir.avaliarTudo({ doc: docRh(1440), nos: [], tema: 'claro', caso: 'inicio' })
    for (const nome of NOVAS_REGRAS) {
      const achados = r.filter((x) => x.regra === nome)
      assert.equal(achados.length, 1, nome)
      assert.equal(achados[0].bloqueia, true, nome)
    }
  })

  it('REPH-I-18 the FONTES allow-list accepts M PLUS Rounded 1c next to Literata and Outfit', () => {
    for (const familia of ['Literata', 'Outfit', 'M PLUS Rounded 1c']) assert.ok(medir.FAMILIAS_PERMITIDAS.includes(familia), familia)
  })

  it('REPH-I-18 MEDIDAS_REP_HOME carries the spec section 5 cells', () => {
    const m = medir.MEDIDAS_REP_HOME
    assert.equal(typeof m, 'object', 'MEDIDAS_REP_HOME must be exported')
    assert.deepEqual([m.noite?.[1440], m.noite?.[390]], [0.3, 0.3])
    // r4 (RECUT §7): the pin exists from 1024 wide only: 600 from 1280, 480 from 1024 to 1279, none (0) below.
    assert.deepEqual([m.pino?.[1440], m.pino?.[1280], m.pino?.[1024], m.pino?.[768], m.pino?.[390]], [600, 600, 480, 0, 0])
    assert.deepEqual(m.borda1440, [556.5, 470.1, 354.9, 118.3, 0])
    assert.deepEqual(m.traducao1440, [38.65, 32.65, 24.65, 8.22, 0])
    assert.deepEqual([m.luz?.cone_ms, m.luz?.poca_ms, m.luz?.atraso_ms, m.luz?.defasagem_ms], [240, 320, 300, 80])
    assert.deepEqual([m.legenda?.saida_ms, m.legenda?.entrada_ms, m.legenda?.desloc_px], [160, 220, 6])
    assert.equal(m.lcp_ms, 2500)
    assert.deepEqual([m.bytes?.dobra_kb, m.bytes?.luz_kb_max, m.bytes?.pagina_kb], [70, 12, 185])
    assert.equal(m.inp_ms, 200)
    assert.deepEqual([m.escuro_medio?.[1440], m.escuro_medio?.[390], m.creme_max?.[1440], m.creme_max?.[390]], [0.45, 0.5, 0.55, 0.5])
  })

  it('REPH-I-18 MEDIDAS_REP_HOME.placa390 holds the worker-measured window and is internally consistent', () => {
    const p = medir.MEDIDAS_REP_HOME?.placa390
    assert.equal(typeof p, 'object', 'placa390 must be exported')
    for (const chave of ['L', 's', 'w', 'h', 'x', 'y', 'seam']) assert.ok(Number.isFinite(p[chave]), chave)
    assert.ok(p.L > 440 && p.L < 500, `L ${p.L}`)
    assert.ok(Math.abs(p.s - 390 / (1672 - p.L)) < 0.001, 's = 390 / (1672 - L)')
    assert.ok(Math.abs(p.w - 1672 * p.s) < 0.5, 'w = 1672 s')
    assert.ok(Math.abs(p.x + p.L * p.s) < 0.5, 'x = -L s')
    assert.ok(Math.abs(p.seam - (910 - p.L) * p.s) < 0.5, 'seam = (910 - L) s')
    assert.equal(p.y, 364)
  })

  const NOMES_MOVIMENTO = ['LUZ', 'PALCO', 'COBERTURA', 'CONTRASTE', 'MOLDURA', 'LEGENDA', 'DURACOES', 'CLS', 'LONGTASK', 'PROPRIEDADES', 'TRANSICOES', 'LCP', 'BYTES']

  it('REPH-I-18 avaliarMovimento returns the thirteen checks in order and fails every one closed on an empty probe', () => {
    assert.equal(typeof medir.avaliarMovimento, 'function', 'avaliarMovimento must be exported')
    const r = medir.avaliarMovimento({}, medir.MEDIDAS_REP_HOME)
    assert.deepEqual(r.map((x) => x.regra), NOMES_MOVIMENTO)
    for (const x of r) {
      assert.equal(x.ok, false, `${x.regra} must fail closed`)
      assert.ok(typeof x.motivo === 'string' && x.motivo !== '', x.regra)
    }
  })

  it('REPH-I-18 avaliarMovimento tells CLS 0 from CLS 0.002', () => {
    assert.equal(typeof medir.avaliarMovimento, 'function', 'avaliarMovimento must be exported')
    const cls = (valor) => medir.avaliarMovimento({ cls: valor }, medir.MEDIDAS_REP_HOME).find((x) => x.regra === 'CLS')
    ok(cls(0))
    falha(cls(0.002))
  })

  it('REPH-I-18 TROCA_RM passes a reduced-motion page at rest and fails the three card controls', () => {
    const rm = ({ posicao = 'static', transformNoite = 'none', capa = false } = {}) => [
      rhNo({ palco: true }, { x: 0, y: 795, w: 1440, h: 1200 }, { tag: 'div', texto: '', alturaConteudo: 1200, estilo: { position: posicao } }),
      rhNo({ camadaNoite: true }, { x: 556, y: 795, w: 884, h: 1200 }, { tag: 'div', texto: '', estilo: { transform: transformNoite } }),
      rhNo({ luz: true }, { x: 0, y: 112, w: 900, h: 507 }, { tag: 'div', texto: '', estilo: { opacity: '1' } }),
      ...(capa ? [rhNo({ luzCapa: true }, { x: 0, y: 112, w: 900, h: 507 }, { tag: 'div', texto: '' })] : []),
    ]
    const doc = docRh(1440, { animacoesCasa: 0 })
    const r = regra('trocaRm')(rm(), doc)
    ok(r)
    assert.equal(r.regra, 'TROCA_RM')
    falha(regra('trocaRm')(rm({ posicao: 'sticky' }), doc), /sticky|pino|palco/i)
    falha(regra('trocaRm')(rm({ transformNoite: 'matrix(1, 0, 0, 1, 100, 0)' }), doc), /transform|noite/i)
    falha(regra('trocaRm')(rm({ capa: true }), doc), /capa|luz|cobertura/i)
  })
})

// ---- REPH-I-07 / -11 / -12 with the pinned stage (round 3, r4 numbers) ----

describe('REPH-I-07 NOITE with the pinned stage: the sheet wall is the full-bleed cacau band above 2 x innerHeight', () => {
  // With the pin the track pushes band 3 down by D (600), so the only faixa of cacau is at y 2271: the wall inside the
  // night sheet (as wide as the stage at every p, cacau) is the band the first two screens hold.
  const paredeDaFolha = (largura, estilo = { backgroundColor: CACAU }) =>
    rhNo({ paredeDaFolha: true }, { x: 0, y: 795, w: largura, h: 876 }, { tag: 'div', texto: '', estilo, ordemDom: 20 })

  it('REPH-I-07 NOITE passes at 1440 when the only faixa is below 2 x innerHeight and the sheet wall is cacau', () => {
    ok(regra('noite')([bandaNoite(1440, 2271), paredeDaFolha(1440)], docRh(1440, amostras(400000))))
  })

  it('REPH-I-07 NOITE fails at 1440 when the sheet wall is not cacau, or is narrower than the stage', () => {
    falha(regra('noite')([bandaNoite(1440, 2271), paredeDaFolha(1440, { backgroundColor: PAPEL })], docRh(1440, amostras(400000))), /faixa|banda|cacau|2/i)
    falha(regra('noite')([bandaNoite(1440, 2271), paredeDaFolha(900)], docRh(1440, amostras(400000))), /faixa|banda|cacau|2/i)
  })
})

describe('REPH-I-11 the pinned stage: edge stops, holds and the pin distance by width (RECUT §7)', () => {
  const COBERTURA = { cobertura: [0.614, 0.674, 0.754, 0.918, 1] }
  const R4 = {
    borda: [556.5, 470.1, 354.9, 118.3, 0],
    traducao_pct: [38.65, 32.65, 24.65, 8.22, 0],
    retencoes: { inicio: [556.5, 556.5], centro: [354.9, 354.9], fim: [0, 0] },
  }
  const cobertura = (extra) => medir.avaliarMovimento({ ...COBERTURA, ...extra }, medir.MEDIDAS_REP_HOME).find((x) => x.regra === 'COBERTURA')
  const palco = (largura, pino_px) => medir.avaliarMovimento({ largura, palco: { pino_px } }, medir.MEDIDAS_REP_HOME).find((x) => x.regra === 'PALCO')

  it('REPH-I-11 COBERTURA passes with the r4 edge stops, the translateX and the three holds', () => {
    ok(cobertura(R4))
  })

  it('REPH-I-11 COBERTURA fails the r2 edge stops of the seam at 1030, and the r2 translateX at p 0', () => {
    falha(cobertura({ ...R4, borda: [1030, 809, 514.5, 171.5, 0] }), /borda/)
    falha(cobertura({ ...R4, traducao_pct: [71.53, 56.18, 35.73, 11.91, 0] }), /traducao_pct/)
  })

  it('REPH-I-11 COBERTURA fails a 1440 wipe with no 0.45-0.55 hold, and one with no hold at the seam', () => {
    falha(cobertura({ ...R4, retencoes: { ...R4.retencoes, centro: [380, 330] } }), /retenção centro/)
    falha(cobertura({ ...R4, retencoes: { ...R4.retencoes, inicio: [556.5, 520] } }), /retenção inicio/)
  })

  it('REPH-I-11 COBERTURA fails closed on an unreadable hold, and still needs the coverage', () => {
    falha(cobertura({ ...R4, retencoes: { inicio: [556.5], centro: [354.9, 354.9], fim: [0, 0] } }), /retenção inicio ilegível/)
    falha(medir.avaliarMovimento({}, medir.MEDIDAS_REP_HOME).find((x) => x.regra === 'COBERTURA'))
  })

  it('REPH-I-11 PALCO: 600 from 1280, 480 from 1024 to 1279, and no pin (0) below 1024', () => {
    ok(palco(1440, 600))
    ok(palco(1280, 600))
    ok(palco(1024, 480))
    ok(palco(768, 0))
    ok(palco(390, 0))
    falha(palco(1440, 480), /600/)
    falha(palco(1024, 600), /480/)
    falha(palco(390, 360), /pino/)
  })
})

describe('REPH-I-12 caption swap: no [data-troca-legenda] below 1024', () => {
  it('REPH-I-12 LEGENDA_PRESA fails at 390 when a swap caption node exists (moment 3 is built from 1024 only)', () => {
    const troca = rhNo({ legenda: true, trocaLegenda: true }, { x: 20, y: 1900, w: 350, h: 28 }, { tag: 'p', texto: 'l', tom: 'noite', ordemDom: 9, estilo: { color: PAPEL }, cadeia: [TRANSPARENTE, CACAU] })
    falha(regra('legendaPresa')([...legenda390(), troca], docRh(390)), /legenda de troca|momento 3/i)
    ok(regra('legendaPresa')(legenda390(), docRh(390)))
  })
})

// ---- REPH-I-23 CAPTURA_REAL ----

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
function pedaco(tipo, dados) {
  const t = Buffer.from(tipo, 'latin1')
  const comprimento = Buffer.alloc(4)
  comprimento.writeUInt32BE(dados.length)
  const soma = Buffer.alloc(4)
  soma.writeUInt32BE(crc32(Buffer.concat([t, dados])))
  return Buffer.concat([comprimento, t, dados, soma])
}
/** A valid flat grey PNG: the skeleton screen the rule must refuse. */
function pngCinza(lado = 16) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(lado, 0)
  ihdr.writeUInt32BE(lado, 4)
  ihdr[8] = 8
  ihdr[9] = 0
  const linha = Buffer.concat([Buffer.from([0]), Buffer.alloc(lado, 128)])
  const cru = Buffer.concat(Array.from({ length: lado }, () => linha))
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), pedaco('IHDR', ihdr), pedaco('IDAT', zlib.deflateSync(cru)), pedaco('IEND', Buffer.alloc(0))])
}
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

describe('REPH-I-23 CAPTURA_REAL: every product screen is an ASSET-1 capture listed in the manifest', () => {
  const pastas = []
  after(() => {
    for (const p of pastas) fs.rmSync(p, { recursive: true, force: true })
  })
  /** A temporary web/public with telas/casa/MANIFESTO.json listing `listados` (arquivo -> bytes) and the files in `gravados`. */
  const publico = (listados, gravados = listados) => {
    const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'repho-capt-'))
    pastas.push(raiz)
    const pasta = path.join(raiz, 'telas', 'casa')
    fs.mkdirSync(pasta, { recursive: true })
    const capturas = Object.entries(listados).map(([arquivo, bytes]) => ({ id: arquivo, servidos: [{ arquivo: `telas/casa/${arquivo}`, sha256: sha(bytes) }] }))
    fs.writeFileSync(path.join(pasta, 'MANIFESTO.json'), JSON.stringify({ capturas }))
    for (const [arquivo, bytes] of Object.entries(gravados)) fs.writeFileSync(path.join(pasta, arquivo), bytes)
    return raiz
  }
  const quadro = (arquivo) =>
    rhNo({ produtoTela: true }, { x: 148, y: 843, w: 284, h: 624 }, { tag: 'img', texto: '', naturalWidth: 568, currentSrc: `http://127.0.0.1:5254/telas/casa/${arquivo}` })
  const REAL = Buffer.from('bytes of a real two-x capture, not a grey skeleton', 'utf8')

  it('REPH-I-23 CAPTURA_REAL passes with a manifest + file pair, and blocks', () => {
    const r = regra('capturaReal')([quadro('historico@2x.png')], docRh(1440), { publico: publico({ 'historico@2x.png': REAL }) })
    ok(r)
    assert.equal(r.regra, 'CAPTURA_REAL')
    assert.deepEqual(Object.keys(r).sort(), CHAVES_PURAS)
    const todos = medir.avaliarTudo({ doc: docRh(1440), nos: [], tema: 'claro', caso: 'inicio' })
    assert.equal(todos.find((x) => x.regra === 'CAPTURA_REAL')?.bloqueia, true)
  })

  it('REPH-I-23 CAPTURA_REAL fails for a flat grey skeleton PNG', () => {
    const cinza = pngCinza()
    const raiz = publico({ 'historico@2x.png': REAL }, { 'historico@2x.png': REAL, 'esqueleto.png': cinza })
    falha(regra('capturaReal')([quadro('esqueleto.png')], docRh(1440), { publico: raiz }), /manifest/i)
  })

  it('REPH-I-23 CAPTURA_REAL fails for an image that is not in the manifest', () => {
    const outra = Buffer.from('another image', 'utf8')
    const raiz = publico({ 'historico@2x.png': REAL }, { 'historico@2x.png': REAL, 'outra.png': outra })
    falha(regra('capturaReal')([quadro('outra.png')], docRh(1440), { publico: raiz }), /manifest/i)
  })

  it('REPH-I-23 CAPTURA_REAL fails when the file changed after hashing', () => {
    const raiz = publico({ 'historico@2x.png': REAL }, { 'historico@2x.png': Buffer.concat([REAL, Buffer.from('!')]) })
    falha(regra('capturaReal')([quadro('historico@2x.png')], docRh(1440), { publico: raiz }), /sha256|hash/i)
  })

  it('REPH-I-23 CAPTURA_REAL fails for a page with zero frames', () => {
    const raiz = publico({ 'historico@2x.png': REAL })
    falha(regra('capturaReal')([], docRh(1440), { publico: raiz }), /nenhum|zero|0 /i)
  })

  it('REPH-I-23 CAPTURA_REAL fails when the manifest is missing, and for a path that climbs out of web/public', () => {
    const vazio = fs.mkdtempSync(path.join(os.tmpdir(), 'repho-capt-'))
    pastas.push(vazio)
    falha(regra('capturaReal')([quadro('historico@2x.png')], docRh(1440), { publico: vazio }), /manifest/i)
    const raiz = publico({ 'historico@2x.png': REAL })
    const fora = rhNo({ produtoTela: true }, { x: 0, y: 0, w: 10, h: 10 }, { tag: 'img', texto: '', currentSrc: 'http://127.0.0.1:5254/telas/casa/../../../segredo.png' })
    falha(regra('capturaReal')([fora], docRh(1440), { publico: raiz }))
  })

  it('REPH-I-23 CAPTURA_REAL fails when one of two frames is not a listed capture', () => {
    const outra = Buffer.from('another image', 'utf8')
    const raiz = publico({ 'historico@2x.png': REAL }, { 'historico@2x.png': REAL, 'outra.png': outra })
    falha(regra('capturaReal')([quadro('historico@2x.png'), quadro('outra.png')], docRh(1440), { publico: raiz }))
  })
})
