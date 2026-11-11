// Testes da parte pura do medidor (node --test web/scripts/medir-dom.test.mjs). Para cada regra
// (G1, G11, G12, FONTES, CAIXA, SOMBRA, 3D): um caso que passa, um que falha e a falha fechada.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { JSDOM, VirtualConsole } from 'jsdom'
import {
  REGRAS,
  SIGLAS_PERMITIDAS,
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
      const dica = (estiloTexto) => controle({ textoControle: 'Seu nome', estiloTexto: { origem: 'placeholder', fontSize: '20px', fontWeight: '400', ...estiloTexto } })
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
      assert.equal(g11([alvoBom, dica({ color: TINTA, fontSize: '20px', fontWeight: '400' })], 'claro').ok, true)
      assert.equal(g11([alvoBom, dica({ color: TINTA, fontWeight: '400' })], 'claro').ok, false)
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

  it('uma família genérica na frente é ignorada, desde que haja uma família do site em outro nó', () => {
    assert.equal(fontes([emFamilia('"Outfit Variable", sans-serif'), emFamilia('monospace')]).ok, true)
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
    assert.deepEqual(SIGLAS_PERMITIDAS, ['RN', 'SBP', 'LGPD', 'OMS'])
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
    assert.deepEqual(SIGLAS_PERMITIDAS, ['RN', 'SBP', 'LGPD', 'OMS'])
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
    assert.deepEqual(REGRAS, ['G1', 'G11', 'G12', 'FONTES', 'CAIXA', 'SOMBRA', '3D'])
    for (const r of resultados) {
      assert.equal(r.ok, true, `${r.regra}: ${r.motivo}`)
      assert.equal(r.bloqueia, true)
      assert.deepEqual(Object.keys(r).sort(), ['bloqueia', 'motivo', 'nos_com_falha', 'ok', 'regra'])
    }
  })

  it('todas as regras bloqueiam em todos os casos, e a falha nunca sai como "registrada"', () => {
    for (const caso of ['sistema', 'inicio', 'hoje', 'sessao', 'comofunciona']) assert.deepEqual(bloqueantesDoCaso(caso), REGRAS)
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

  it('recusa tema e formato inválidos, e o Início em madrugada', () => {
    assert.throws(() => lerArgumentos(['p', 'sistema:sepia:390x844']), /tema desconhecido/)
    assert.throws(() => lerArgumentos(['p', 'sistema:claro:390']), /argumento inválido/)
    assert.throws(() => lerArgumentos(['p', 'Sistema:claro:390x844']), /argumento inválido/)
    assert.throws(() => lerArgumentos(['p', 'como-funciona:claro:390x844']), /argumento inválido/)
    assert.throws(() => lerArgumentos(['p', ':claro:390x844']), /argumento inválido/)
    assert.throws(() => lerArgumentos(['p', 'pagina_2:claro2:390x844']), /argumento inválido/)
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
