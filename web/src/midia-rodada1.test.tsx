import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Midia } from './componentes/base/Midia.tsx'
import { CAPTURAS } from './componentes/midia/capturas.ts'
import { PROPORCOES } from './componentes/midia/proporcoes.ts'
import { pastaSrcDe } from './teste/fontes.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'

// Rodada visual 1 da mídia do Início: seis correções (R1 a R6). O jsdom não mede layout nem pinta: aqui
// ficam a árvore, os atributos e o CSS lido como texto, na classe do defeito (todas as molduras ou todas
// as variações da regra). Quem mede e olha a composição é o laço de captura (geo_midia, contorno).

const pastaSrc = pastaSrcDe(import.meta.url)
const css = readFileSync(pastaSrc + 'componentes/midia/midia.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

async function inicio() {
  const resultado = renderizarRota('/')
  await screen.findByRole('heading', { level: 1 })
  return resultado.container
}

const molduras = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('[data-midia]')]

/** O texto de dentro do primeiro `@media (max-width: 767px)` (chaves balanceadas) e o CSS sem ele. */
function separarMedia(texto: string): { dentro: string; fora: string } {
  const abertura = texto.indexOf('@media (max-width: 767px)')
  if (abertura < 0) return { dentro: '', fora: texto }
  const inicioCorpo = texto.indexOf('{', abertura)
  let nivel = 0
  let fim = inicioCorpo
  for (let i = inicioCorpo; i < texto.length; i += 1) {
    if (texto[i] === '{') nivel += 1
    if (texto[i] === '}') nivel -= 1
    if (nivel === 0) {
      fim = i
      break
    }
  }
  return { dentro: texto.slice(inicioCorpo + 1, fim), fora: texto.slice(0, abertura) + texto.slice(fim + 1) }
}

const { dentro: cssEstreito, fora: cssLargo } = separarMedia(css)

function corposDe(texto: string, seletor: string): string {
  return [...texto.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, s]) => s.trim().replace(/\s+/g, ' ') === seletor)
    .map(([, , corpo]) => corpo)
    .join(';')
}

/** O valor numérico (em cqw) de uma variável CSS declarada nos corpos da regra. */
function cqwDe(corpo: string, variavel: string): number {
  const achado = new RegExp(`${variavel}\\s*:\\s*(-?[\\d.]+)cqw`).exec(corpo)
  return achado ? Number(achado[1]) : Number.NaN
}

// ---------------------------------------------------------------------------
// R2: a proporção por instância das 5 molduras largas.

const ALVOS = {
  notebook: { l1440: 984, l390: 256 },
  celulares: { l1440: 1056, l390: 275 },
  sessao: { l1440: 893, l390: 245 },
  madrugada: { l1440: 942, l390: 239 },
  mosaico: { l1440: 893, l390: 245 },
} as const

const alturaPara = (proporcao: string, largura: number) => {
  const [n, d] = proporcao.split('/').map((parte) => Number(parte.trim()))
  return (largura * d) / n
}

describe('R2: a proporção por instância das molduras largas', () => {
  it('as 5 proporções dão as alturas pedidas, ±2 px, em 1440 (largura 1376) e em 390 (largura 358)', () => {
    expect(Object.keys(PROPORCOES).sort()).toEqual(Object.keys(ALVOS).sort())
    for (const [nome, alvo] of Object.entries(ALVOS)) {
      const proporcao = PROPORCOES[nome as keyof typeof PROPORCOES]
      expect(Math.abs(alturaPara(proporcao.larga, 1376) - alvo.l1440), `${nome} 1440`).toBeLessThanOrEqual(2)
      expect(Math.abs(alturaPara(proporcao.estreita, 358) - alvo.l390), `${nome} 390`).toBeLessThanOrEqual(2)
    }
  })

  it('as 5 alturas são todas diferentes entre si, nas duas larguras (exceto Sessão e mosaico, que pedem o mesmo valor)', () => {
    const alturas1440 = Object.values(PROPORCOES).map((p) => Math.round(alturaPara(p.larga, 1376)))
    expect(new Set(alturas1440).size).toBe(4)
    const alturas390 = Object.values(PROPORCOES).map((p) => Math.round(alturaPara(p.estreita, 358)))
    expect(new Set(alturas390).size).toBe(4)
  })

  it('sem a prop, a moldura é a de hoje: nenhum data-proporcao e nenhum estilo inline, em todos os formatos', () => {
    for (const formato of ['larga', 'par', 'retrato'] as const) {
      const { container, unmount } = render(<Midia formato={formato} fundo="barro" aria-label="x" />)
      const moldura = container.querySelector('[data-midia]')!
      expect(moldura.hasAttribute('data-proporcao'), formato).toBe(false)
      expect(moldura.hasAttribute('style'), formato).toBe(false)
      unmount()
    }
  })

  it('com a prop, escreve o atributo data-proporcao e as duas variáveis CSS (larga e estreita)', () => {
    const { container } = render(
      <Midia formato="larga" fundo="lavanda" aria-label="x" proporcao={{ larga: '1376 / 984', estreita: '358 / 256' }} />,
    )

    const moldura = container.querySelector<HTMLElement>('[data-midia]')!
    expect(moldura.hasAttribute('data-proporcao')).toBe(true)
    expect(moldura.style.getPropertyValue('--proporcao-larga')).toBe('1376 / 984')
    expect(moldura.style.getPropertyValue('--proporcao-estreita')).toBe('358 / 256')
  })

  it('o Início passa a proporção às 5 molduras largas (0, 1, 2, 3 e 6) e a nenhuma das outras 5', async () => {
    const container = await inicio()

    const lista = molduras(container)
    const esperadas: Record<number, keyof typeof PROPORCOES> = { 0: 'notebook', 1: 'celulares', 2: 'sessao', 3: 'madrugada', 6: 'mosaico' }
    lista.forEach((moldura, i) => {
      const nome = esperadas[i]
      if (!nome) {
        expect(moldura.hasAttribute('data-proporcao'), `moldura ${i}`).toBe(false)
        return
      }
      expect(moldura.getAttribute('data-formato'), `moldura ${i}`).toBe('larga')
      expect(moldura.style.getPropertyValue('--proporcao-larga'), `moldura ${i}`).toBe(PROPORCOES[nome].larga)
      expect(moldura.style.getPropertyValue('--proporcao-estreita'), `moldura ${i}`).toBe(PROPORCOES[nome].estreita)
    })
  })

  it('o CSS aplica a proporção com especificidade maior que a do index.css, e troca para a estreita só abaixo de 768', () => {
    const regra = "\\.sb-midia\\[data-formato='larga'\\]\\[data-proporcao\\]"
    expect(cssLargo).toMatch(new RegExp(`${regra}\\s*\\{[^}]*aspect-ratio:\\s*var\\(--proporcao-larga\\)`))
    expect(cssEstreito).toMatch(new RegExp(`${regra}\\s*\\{[^}]*aspect-ratio:\\s*var\\(--proporcao-estreita\\)`))
    // Fora da @media a estreita nunca é aplicada.
    expect(cssLargo).not.toMatch(/aspect-ratio:\s*var\(--proporcao-estreita\)/)
  })
})

// ---------------------------------------------------------------------------
// R3: o contorno não se perde onde a folha ou a tela encostam na borda.

/** O tamanho de 1 cqw da moldura, em px, nas duas larguras, e a folga de 16 px (1440) e 8 px (390) em cqw. */
const LARGURAS_PX: Array<[number, number]> = [
  [1376, 358], // larga
  [1376, 358],
  [1376, 358],
  [1376, 358],
  [672, 175], // par (galeria)
  [672, 175],
  [1376, 358],
  [413, 358], // retrato
  [672, 358], // cartões
  [672, 358],
]
const folgaCqw = (i: number) => Math.max(16 / (LARGURAS_PX[i][0] / 100), 8 / (LARGURAS_PX[i][1] / 100))

/** A altura da cena em cqw (largura = 100): a da proporção da moldura, ou a do formato. */
function alturaDaCena(moldura: HTMLElement): number {
  const formato = moldura.getAttribute('data-formato')
  if (formato === 'par') return 100
  if (formato === 'retrato') return (734 / 413) * 100
  const larga = moldura.style.getPropertyValue('--proporcao-larga') || '1376 / 960'
  return alturaPara(larga, 100)
}

const cqw = (valor: string) => {
  if (/^0(px)?$/.test(valor.trim())) return 0
  const achado = /^(-?[\d.]+)cqw$/.exec(valor.trim())
  return achado ? Number(achado[1]) : Number.NaN
}

describe('R3: nenhuma folha de papel nem tela clara encosta na borda da moldura', () => {
  it('toda folha de papel (.mc-laje, cor da página) filha do palco ou fica a uma folga da borda, ou tem o tom do pedestal', async () => {
    const container = await inicio()

    const lista = molduras(container)
    let folhas = 0
    lista.forEach((moldura, i) => {
      const altura = alturaDaCena(moldura)
      const folga = folgaCqw(i)
      for (const folha of moldura.querySelectorAll<HTMLElement>('.mc-palco > .mc-laje')) {
        folhas += 1
        const rotulo = `moldura ${i} ${moldura.getAttribute('aria-label')}`
        const esquerda = cqw(folha.style.left)
        const topo = cqw(folha.style.top)
        const direita = esquerda + cqw(folha.style.width)
        const base = topo + cqw(folha.style.height)
        expect(esquerda, `${rotulo} esquerda`).toBeGreaterThanOrEqual(folga)
        expect(topo, `${rotulo} topo`).toBeGreaterThanOrEqual(folga)
        expect(direita, `${rotulo} direita`).toBeLessThanOrEqual(100 - folga)
        expect(base, `${rotulo} base`).toBeLessThanOrEqual(altura - folga)
      }
    })
    expect(folhas).toBeGreaterThan(0)
  })

  it('a folha de tom de pedestal existe: frente e topo em papel-fundo (nunca na cor da página)', () => {
    const corpo = corposDe(cssLargo, '.mc-laje-papel')
    expect(corpo).toMatch(/--c-frente:\s*var\(--cor-papel-fundo\)/)
    expect(corpo).toMatch(/--c-topo:\s*var\(--cor-papel-fundo\)/)
    expect(corpo).not.toMatch(/var\(--cor-fundo\)/)
  })

  it('todo aparelho de captura clara filho do palco fica a uma folga das bordas esquerda, direita e de cima', async () => {
    const container = await inicio()

    let aparelhos = 0
    molduras(container).forEach((moldura, i) => {
      const folga = folgaCqw(i)
      for (const aparelho of moldura.querySelectorAll<HTMLElement>('.mc-palco > [data-aparelho]')) {
        if (!aparelho.querySelector('img')!.getAttribute('src')!.includes('-claro-')) continue
        aparelhos += 1
        const rotulo = `moldura ${i} ${aparelho.getAttribute('data-aparelho')}`
        const esquerda = cqw(aparelho.style.left)
        const largura = cqw(aparelho.style.getPropertyValue('--aw'))
        expect(esquerda, `${rotulo} esquerda`).toBeGreaterThanOrEqual(folga)
        expect(esquerda + largura, `${rotulo} direita`).toBeLessThanOrEqual(100 - folga)
        expect(cqw(aparelho.style.top), `${rotulo} topo`).toBeGreaterThanOrEqual(folga)
      }
    })
    expect(aparelhos).toBeGreaterThan(0)
  })

  it('um celular de captura clara cortado embaixo tem um chão (.mc-chao) na frente, para a borda de baixo não cruzar a tela', async () => {
    const container = await inicio()

    let cortados = 0
    molduras(container).forEach((moldura, i) => {
      const altura = alturaDaCena(moldura)
      const folga = folgaCqw(i)
      for (const celular of moldura.querySelectorAll<HTMLElement>('.mc-palco > [data-aparelho="celular"]')) {
        if (!celular.querySelector('img')!.getAttribute('src')!.includes('-claro-')) continue
        const base = cqw(celular.style.top) + cqw(celular.style.getPropertyValue('--aw')) * 2.071
        if (base <= altura - folga) continue
        cortados += 1
        const chao = moldura.querySelector('.mc-palco > .mc-chao')
        expect(chao, `moldura ${i}: celular cortado embaixo sem chão`).not.toBeNull()
        // O chão vem depois do celular no DOM: pinta por cima dele.
        expect(celular.compareDocumentPosition(chao!) & Node.DOCUMENT_POSITION_FOLLOWING, `moldura ${i}`).toBeTruthy()
      }
    })
    // Os dois cartões (Hoje e Sessão) continuam com o celular cortado, e agora com chão.
    expect(cortados).toBeGreaterThanOrEqual(2)
  })

  it('o chão nunca usa a cor da página: frente, topo e laterais em papel-fundo, tinta ou secundário', () => {
    for (const seletor of ['.mc-chao-papel', '.mc-chao-tinta']) {
      const corpo = corposDe(cssLargo, seletor)
      expect(corpo, seletor).toMatch(/--c-frente:/)
      expect(corpo, seletor).not.toMatch(/var\(--cor-fundo\)/)
    }
  })
})

// ---------------------------------------------------------------------------
// D-2: na Sessão o celular não cobre o conteúdo da tela do notebook.

describe('D-2: na moldura da Sessão o celular fica ao lado do notebook, sem cobrir o que a tela dele mostra', () => {
  async function aparelhos() {
    const container = await inicio()
    const moldura = molduras(container)[2]
    const filhos = [...moldura.querySelectorAll<HTMLElement>('.mc-palco > [data-aparelho]')]
    const faixa = (el: HTMLElement) => {
      const esquerda = cqw(el.style.left)
      return { esquerda, direita: esquerda + cqw(el.style.getPropertyValue('--aw')), largura: cqw(el.style.getPropertyValue('--aw')) }
    }
    const celular = faixa(filhos.find((a) => a.getAttribute('data-aparelho') === 'celular')!)
    const notebook = faixa(filhos.find((a) => a.getAttribute('data-aparelho') === 'notebook')!)
    return { celular, notebook }
  }

  it('a faixa horizontal do celular acaba pelo menos 2 cqw antes da do notebook (a margem entre o contorno e o texto)', async () => {
    const { celular, notebook } = await aparelhos()

    expect(celular.direita + 2).toBeLessThanOrEqual(notebook.esquerda)
  })

  it('os dois cabem em 0..100 cqw, com tamanho legível: celular de 20 cqw ou mais e notebook de 62 cqw ou mais', async () => {
    const { celular, notebook } = await aparelhos()

    expect(celular.esquerda).toBeGreaterThanOrEqual(0)
    expect(notebook.direita).toBeLessThanOrEqual(100)
    expect(celular.largura).toBeGreaterThanOrEqual(20)
    expect(notebook.largura).toBeGreaterThanOrEqual(62)
  })
})

// ---------------------------------------------------------------------------
// R4: os três celulares maiores em 390.

describe('R4: três celulares legíveis em 390, e a mesma geometria de antes em 1440', () => {
  it('o grupo é feito de variáveis: largura do celular 19 cqw em 1440 e 25 cqw ou mais abaixo de 768 (img central ≥ 84 px)', () => {
    const grande = corposDe(cssLargo, '.mc-trio')
    const estreito = corposDe(cssEstreito, '.mc-trio')
    expect(cqwDe(grande, '--lw')).toBe(19)
    expect(cqwDe(grande, '--pw')).toBe(24)
    expect(cqwDe(estreito, '--lw')).toBeGreaterThanOrEqual(25)
    expect(cqwDe(estreito, '--pw')).toBeGreaterThan(cqwDe(estreito, '--lw'))
  })

  it('a moldura dos 3 celulares tem 3 aparelhos, a largura vem da variável e a posição de cada um tem a versão estreita', async () => {
    const container = await inicio()

    const trio = molduras(container)[1]
    const itens = [...trio.querySelectorAll<HTMLElement>('.mc-trio-item')]
    expect(itens).toHaveLength(3)
    for (const item of itens) {
      const celular = item.querySelector<HTMLElement>('[data-aparelho="celular"]')!
      expect(celular.style.getPropertyValue('--aw')).toBe('var(--lw)')
      for (const variavel of ['--x-l', '--x-e', '--alto-l', '--alto-e', '--giro-l', '--giro-e']) {
        expect(item.style.getPropertyValue(variavel), variavel).not.toBe('')
      }
    }
    // A geometria de 1440 é a de antes.
    expect(itens.map((i) => i.style.getPropertyValue('--x-l'))).toEqual(['8cqw', '38cqw', '68cqw'])
    expect(itens.map((i) => i.style.getPropertyValue('--alto-l'))).toEqual(['9cqw', '17cqw', '3cqw'])
    expect(itens.map((i) => i.style.getPropertyValue('--giro-l'))).toEqual(['20deg', '0deg', '-20deg'])
  })

  it('o CSS escolhe a variável larga fora da @media e a estreita (-e) só dentro dela', () => {
    const fora = corposDe(cssLargo, '.mc-trio-item')
    const dentro = corposDe(cssEstreito, '.mc-trio-item')
    for (const [nome, sufixo] of [['--x', 'x'], ['--alto', 'alto'], ['--giro', 'giro']] as const) {
      expect(fora, nome).toMatch(new RegExp(`${nome}:\\s*var\\(--${sufixo}-l\\)`))
      expect(dentro, nome).toMatch(new RegExp(`${nome}:\\s*var\\(--${sufixo}-e\\)`))
    }
    expect(cssLargo).not.toMatch(/var\(--[a-z]+-e\)/)
  })
})

// ---------------------------------------------------------------------------
// R5: o topo do retrato em 390.

describe('R5: o celular do retrato sobe em 390 e continua cortado embaixo', () => {
  it('o topo do celular (--ph-top) é 48 cqw em 1440 e 22 cqw ou menos abaixo de 768', () => {
    expect(cqwDe(corposDe(cssLargo, '.mc-retrato'), '--ph-top')).toBe(48)
    expect(cqwDe(corposDe(cssEstreito, '.mc-retrato'), '--ph-top')).toBeLessThanOrEqual(22)
  })

  it('o celular estreito é largo o bastante para o corpo (2,071 vezes a largura) passar da base da cena (177,8 cqw)', () => {
    const estreito = corposDe(cssEstreito, '.mc-retrato')
    const topo = cqwDe(estreito, '--ph-top')
    const largura = cqwDe(estreito, '--ph-w')
    expect(topo + largura * 2.071).toBeGreaterThan((734 / 413) * 100)
    // E cabe na largura da cena, com folga dos dois lados.
    expect(cqwDe(estreito, '--ph-left') + largura).toBeLessThan(98)
  })

  it('o retrato lê topo, esquerda, largura e a folha de variáveis do palco (.mc-retrato)', async () => {
    const container = await inicio()

    const retrato = molduras(container)[7]
    expect(retrato.querySelector('.mc-palco.mc-retrato')).not.toBeNull()
    const celular = retrato.querySelector<HTMLElement>('[data-aparelho="celular"]')!
    expect(celular.style.top).toBe('var(--ph-top)')
    expect(celular.style.left).toBe('var(--ph-left)')
    expect(celular.style.getPropertyValue('--aw')).toBe('var(--ph-w)')
  })
})

// ---------------------------------------------------------------------------
// R6a: o mosaico cheio de fragmentos.

describe('R6a: o mosaico tem fragmento da tela em 60% ou mais dos ladrilhos, com no máximo 3 <img>', () => {
  async function mosaico() {
    const container = await inicio()
    return molduras(container)[6]
  }
  const conhecidas = new Set<string>(Object.values(CAPTURAS).map((c) => c.arquivo))
  const arquivoDe = (url: string) => url.replace(/^url\(["']?/, '').replace(/["']?\)$/, '').split('/').pop()!

  it('continuam 10 ladrilhos, no máximo 3 <img>, e pelo menos 6 ladrilhos com recorte (<img> ou imagem de fundo)', async () => {
    const quadro = await mosaico()

    const ladrilhos = [...quadro.querySelectorAll('.mc-ladrilho')]
    expect(ladrilhos).toHaveLength(10)
    expect(quadro.querySelectorAll('img').length).toBeLessThanOrEqual(3)
    const comFragmento = ladrilhos.filter((l) => l.querySelector('img, .mc-recorte-bg'))
    expect(comFragmento.length / ladrilhos.length).toBeGreaterThanOrEqual(0.6)
  })

  it('cada ladrilho de fundo guarda a captura larga (--bg-l) e a de celular (--bg-e), duas das 8 conhecidas', async () => {
    const quadro = await mosaico()

    const fundos = [...quadro.querySelectorAll<HTMLElement>('.mc-recorte-bg')]
    expect(fundos.length).toBeGreaterThanOrEqual(3)
    for (const fundo of fundos) {
      const larga = arquivoDe(fundo.style.getPropertyValue('--bg-l'))
      const estreita = arquivoDe(fundo.style.getPropertyValue('--bg-e'))
      expect(conhecidas.has(larga), larga).toBe(true)
      expect(conhecidas.has(estreita), estreita).toBe(true)
      expect(larga).toMatch(/-1440\.png$/)
      expect(estreita).toMatch(/-390\.png$/)
      // O recorte tem tamanho e deslocamento nas duas larguras.
      for (const variavel of ['--zw-l', '--ox-l', '--oy-l', '--zw-e', '--ox-e', '--oy-e']) {
        expect(fundo.style.getPropertyValue(variavel), variavel).not.toBe('')
      }
    }
  })

  it('nenhum ladrilho de fundo tem nó de texto, <img> ou <picture> (só a imagem de fundo em CSS)', async () => {
    const quadro = await mosaico()

    for (const fundo of quadro.querySelectorAll('.mc-recorte-bg')) {
      expect(fundo.childNodes).toHaveLength(0)
    }
  })

  it('o CSS usa a imagem larga fora da @media e a de celular dentro dela, em url() simples', () => {
    expect(corposDe(cssLargo, '.mc-recorte-bg')).toMatch(/background-image:\s*var\(--bg-l\)/)
    expect(corposDe(cssLargo, '.mc-recorte-bg')).toMatch(/background-repeat:\s*no-repeat/)
    expect(corposDe(cssEstreito, '.mc-recorte-bg')).toMatch(/background-image:\s*var\(--bg-e\)/)
    expect(cssLargo).not.toMatch(/var\(--bg-e\)/)
  })
})

// ---------------------------------------------------------------------------
// R6b: a tela do notebook da Sessão termina no cartão do cronômetro.

describe('R6b: o notebook da Sessão mostra só a parte de cima da captura, sem a ilustração da página', () => {
  it('o notebook da moldura da Sessão leva a classe de corte (ap3d-corte)', async () => {
    const container = await inicio()

    const notebook = molduras(container)[2].querySelector('[data-aparelho="notebook"]')!
    expect(notebook.classList.contains('ap3d-corte')).toBe(true)
  })

  it('o corte: tampa mais baixa (0,52 a 0,54 da largura) e a imagem alinhada ao topo', () => {
    // A tela tem a largura 0,976 e a captura 1440 por 900 (altura 0,61); o cartão do cronômetro acaba em 723/900
    // e a ilustração começa em 819/900. A fração visível, (tampa - 0,024) / 0,61, fica entre 0,81 e 0,87.
    const notebook = corposDe(cssLargo, '.ap3d-notebook.ap3d-corte')
    const fator = /height:\s*calc\(var\(--aw\)\s*\*\s*([\d.]+)\)/.exec(notebook)
    expect(fator, notebook).not.toBeNull()
    const visivel = (Number(fator![1]) - 0.024) / 0.61
    expect(visivel).toBeGreaterThan(723 / 900)
    expect(visivel).toBeLessThan(819 / 900)
    expect(corposDe(cssLargo, '.ap3d-corte .ap3d-img')).toMatch(/object-position:\s*top/)
  })
})

// ---------------------------------------------------------------------------
// R6c: a ilustração 2 liga a folha ao pedestal.

describe('R6c: na ilustração 2 a aresta da folha e a do pedestal são a mesma face', () => {
  it('a folha e o pedestal começam no mesmo x (a face da esquerda é um plano só)', async () => {
    const container = await inicio()

    const mamada = molduras(container)[5]
    const grupo = mamada.querySelector<HTMLElement>('.mc-palco > .mc-obj')!
    const pedestal = grupo.querySelector<HTMLElement>(':scope > .mc-pedestal')!
    const folha = grupo.querySelector<HTMLElement>(':scope > .mc-laje')!
    expect(cqw(folha.style.left) || 0).toBe(cqw(pedestal.style.left) || 0)
    // A folha desce até o topo do pedestal: base da folha = topo do pedestal.
    const baseDaFolha = cqw(folha.style.top) + cqw(folha.style.height)
    const topoDoPedestal = cqw(grupo.style.height) - cqw(pedestal.style.height)
    expect(baseDaFolha).toBe(topoDoPedestal)
  })
})
