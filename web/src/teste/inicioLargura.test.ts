import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// HOME-WIDTH (S1 of the signed slot sheet, Início only): width drives the hero, height only caps it. The geometry is the
// browser's (`node .oc/medir-largura.mjs`); jsdom has no layout, so these tests read what the stylesheet declares. Every
// text comparison is line-ending independent (the file is read with LF) and comment independent.

const PASTA_SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSS_DA_CASA = join(PASTA_SRC, 'componentes', 'inicio-casa', 'inicio-casa.css')

/** The Início root: the one `[data-casa]` whose hero holds the h1 `.ic-titulo`. It matches none of the other five pages. */
const RAIZ = "[data-casa]:has(> [data-cena-heroi] .ic-titulo)"

interface Regra {
  /** The at-rule preludes around the rule, outermost first (`@layer components`, `@media …`, `@container …`). */
  contexto: string[]
  seletor: string
  corpo: string
}

const limpo = (texto: string) => texto.replaceAll('\r\n', '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')

/** A small CSS reader: style rules with their at-rule chain. The file has no CSS nesting, so a block is a rule or an at-rule. */
function ler(texto: string, contexto: string[] = []): Regra[] {
  const saida: Regra[] = []
  let i = 0
  while (i < texto.length) {
    const abre = texto.indexOf('{', i)
    const ponto = texto.indexOf(';', i)
    if (abre < 0) break
    if (ponto >= 0 && ponto < abre) {
      i = ponto + 1
      continue
    }
    const prelude = texto.slice(i, abre).trim()
    let fundo = 1
    let j = abre + 1
    while (j < texto.length && fundo > 0) {
      if (texto[j] === '{') fundo += 1
      else if (texto[j] === '}') fundo -= 1
      j += 1
    }
    const interior = texto.slice(abre + 1, j - 1)
    if (prelude.startsWith('@')) saida.push(...ler(interior, [...contexto, prelude]))
    else saida.push({ contexto, seletor: prelude, corpo: interior.trim() })
    i = j
  }
  return saida
}

/** `prop: value` pairs of one rule body (a value may hold `;` only inside parentheses or quotes: none here). */
function declaracoes(corpo: string): Array<{ prop: string; valor: string }> {
  return corpo
    .split(';')
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => {
      const dois = parte.indexOf(':')
      return { prop: parte.slice(0, dois).trim(), valor: parte.slice(dois + 1).trim() }
    })
}

const fonte = () => limpo(readFileSync(CSS_DA_CASA, 'utf8'))
const regras = () => ler(fonte())
const daRaiz = () => regras().filter((r) => r.seletor === RAIZ)
const todasAsDeclaracoes = () => regras().flatMap((r) => declaracoes(r.corpo).map((d) => ({ ...d, regra: r })))

describe('HOME-WIDTH S1: the page container and the width rule sit on the Início root only', () => {
  it('the container hook is on the Início root selector', () => {
    const raiz = daRaiz()
    expect(raiz.length, 'a rule for the Início root').toBeGreaterThan(0)
    expect(raiz.some((r) => /(?:^|;)\s*container-type\s*:\s*inline-size\s*(?:;|$)/.test(r.corpo))).toBe(true)
  })

  it('no declaration targets a bare [data-casa]: the stylesheet stays loaded after a navigation to the other five pages', () => {
    const nuas = regras().filter((r) => r.seletor.split(',').some((parte) => /(?:^|\s)\[data-casa\]$/.test(parte.trim())))
    expect(nuas.map((r) => r.seletor)).toEqual([])
  })

  it('display variant B re-declares its first-span ratio on the Início root, one class more than the root rule', () => {
    const b = regras().find((r) => r.seletor === `html[data-exibicao='b'] ${RAIZ}`)
    expect(b, "html[data-exibicao='b'] on the root").toBeDefined()
    expect(b!.corpo).toContain('--heroi-span1-em: 5.126;')
  })

  it('the quadro follows the container width, capped by the short-wide rule, and the width terms read the Início root only', () => {
    const corpo = daRaiz().map((r) => r.corpo).join(' ')
    expect(corpo).toContain('--quadro-largura: clamp(1200px, 83.333cqi, min(2134px, 213.33svh));')
    expect(corpo).toContain('--heroi-k-largura: tan(atan2(var(--quadro-largura), 1200px));')
  })

  it('--cabecalho-alto is defined on the root, from the shell header token (88 px from 1100 px, 72 px below)', () => {
    const corpo = daRaiz().map((r) => r.corpo).join(' ')
    expect(corpo).toMatch(/--cabecalho-alto\s*:\s*var\(--cm-cabecalho\)\s*;/)
  })

  it('--heroi-k is the smallest of the width, first-screen and seam terms, clamped to [0.9, 1.78]', () => {
    const corpo = daRaiz().map((r) => r.corpo).join(' ')
    expect(corpo).toMatch(/--heroi-k-altura\s*:\s*tan\(atan2\(calc\(100svh - var\(--cabecalho-alto\)\), 723px\)\)\s*;/)
    expect(corpo).toMatch(/--heroi-k-costura\s*:\s*tan\(atan2\(var\(--heroi-costura-x\), /)
    expect(corpo).toContain('--heroi-k: clamp(0.9, min(var(--heroi-k-largura), var(--heroi-k-altura), var(--heroi-k-costura)), 1.78);')
  })

  it('the seam is the quadro margin plus the measured first-span gap, and the plate is placed from it', () => {
    const corpo = daRaiz().map((r) => r.corpo).join(' ')
    expect(corpo).toMatch(/--heroi-vao\s*:\s*calc\(var\(--heroi-span1-em\) \* var\(--texto-exibicao-tamanho\) \+ var\(--espaco-junto\)\)\s*;/)
    expect(corpo).toMatch(/--heroi-costura-x\s*:\s*calc\(var\(--heroi-esq\) \+ var\(--heroi-vao\)\)\s*;/)
    const placa = regras().find((r) => r.seletor === '[data-casa] [data-cena-heroi][aria-labelledby=\'ic-titulo\'] .cm-cena-placa' && r.contexto.some((c) => c.startsWith('@media (min-width: 1180px)')))
    expect(placa, 'the plate rule of the room').toBeDefined()
    expect(placa!.corpo).toMatch(/left\s*:\s*calc\(\s*var\(--heroi-costura-x\) - var\(--cena-costura\)/)
  })

  it('--heroi-alto is a minimum, never a height: it feeds min-block-size (and the floors\' offset), not height, block-size or padding', () => {
    const usos = todasAsDeclaracoes().filter((d) => d.valor.includes('var(--heroi-alto)'))
    const props = usos.map((d) => d.prop)
    expect(props).toContain('min-block-size')
    expect(props.filter((p) => !['--heroi-alto', 'min-block-size', 'bottom'].includes(p))).toEqual([])
    for (const d of usos.filter((u) => u.prop === 'bottom')) expect(d.regra.seletor).toContain("[data-camada='chao-esquerda']")
    const sala = regras().find((r) => r.seletor === "[data-casa] [data-cena-heroi][aria-labelledby='ic-titulo']" && r.contexto.some((c) => c.startsWith('@media (min-width: 1180px)')))
    expect(sala!.corpo).toContain('min-block-size: var(--heroi-alto)')
    expect(sala!.corpo).not.toMatch(/padding-top/)
  })

  it('--produto-tela has no vw in any declaration: band 3 and the stage frame read the container (cqi)', () => {
    const usos = todasAsDeclaracoes().filter((d) => d.prop === '--produto-tela')
    expect(usos.length).toBeGreaterThanOrEqual(3)
    for (const d of usos) expect(d.valor, d.regra.seletor).not.toMatch(/vw/)
    expect(usos.filter((d) => /cqi/.test(d.valor)).length).toBeGreaterThanOrEqual(3)
  })

  it('cqi is consumed on descendants only: on the container itself it would resolve against its ancestor', () => {
    const naRaiz = regras().filter((r) => r.seletor === RAIZ || r.seletor === `html[data-exibicao='b'] ${RAIZ}`)
    expect(naRaiz.length, 'rules on the root').toBeGreaterThan(0)
    for (const r of naRaiz) {
      for (const d of declaracoes(r.corpo)) if (/cqi/.test(d.valor)) expect(d.prop.startsWith('--'), `${r.seletor} { ${d.prop} }`).toBe(true)
    }
  })

  it('the plate width and the seam read the container, not the window (100cqi, no 100vw)', () => {
    const placas = regras().filter((r) => r.seletor.endsWith('.cm-cena-placa') && r.contexto.some((c) => c.startsWith('@media (min-width: 1180px)')))
    expect(placas.length).toBeGreaterThan(0)
    for (const r of placas) expect(r.corpo).not.toMatch(/100vw/)
    expect(placas.map((r) => r.corpo).join(' ')).toMatch(/min\(100cqi, 1440px\)/)
  })
})

describe('HOME-WIDTH item 11: with the root text enlarged the hero stays whole (a rem container query, one system)', () => {
  const CONTAINER_TEXTO = '@container (width < 72.5rem)'
  const daFolga = () => regras().filter((r) => r.contexto.includes(CONTAINER_TEXTO) && r.contexto.some((c) => c.startsWith('@media (min-width: 1180px) and (min-aspect-ratio: 1/1)')))
  const corpoDe = (seletor: string) => daFolga().filter((r) => r.seletor.split(',').some((s) => s.trim().endsWith(seletor))).map((r) => r.corpo).join(' ')

  it('the room hands over to the stacked flow when the container is under 72.5 rem (1160 px at 16 px: 1180 less a 20 px scrollbar, the narrowest the room media gives); the query is in rem', () => {
    expect(daFolga().length).toBeGreaterThan(5)
    expect(CONTAINER_TEXTO).toMatch(/rem\)$/)
    // Strictly below 1160 px: a container of exactly 1160 px keeps the room, like the page script's media query.
    expect(CONTAINER_TEXTO).toMatch(/\(width < 72\.5rem\)/)
    expect(72.5 * 16).toBe(1180 - 20)
    // The switch is read from the Início root only.
    for (const r of daFolga()) expect(r.seletor.split(',').every((s) => s.trim().startsWith(RAIZ)), r.seletor).toBe(true)
  })

  it('the h1 wraps (normal white-space, in the flow); the lede and the actions flow under it (static, not absolute)', () => {
    expect(corpoDe('.ic-titulo')).toMatch(/position\s*:\s*static/)
    expect(corpoDe('.ic-titulo')).toMatch(/white-space\s*:\s*normal/)
    expect(corpoDe('.ic-noite-heroi')).toMatch(/position\s*:\s*static/)
    expect(corpoDe('.ic-noite-heroi')).toMatch(/grid-template-rows\s*:\s*none/)
    expect(corpoDe('.ic-leg1')).toMatch(/position\s*:\s*static/)
  })

  it('the stage band stops being a pinned composition: the track, the stage, the night column and the caption flow; the room-only layers go', () => {
    expect(corpoDe('.ic-estagio')).toMatch(/position\s*:\s*static/)
    // In the flow (relative, with its own backing layer for the full-bleed bar), never the room's absolute.
    expect(corpoDe('.ic-piso-noite')).toMatch(/position\s*:\s*relative/)
    expect(corpoDe('.ic-piso-noite')).not.toMatch(/position\s*:\s*absolute/)
    // `relative` applies the room rule's offsets, so both are reset (a stray `left` pushed the caption off the band).
    expect(corpoDe('.ic-piso-noite')).toMatch(/left\s*:\s*auto/)
    expect(corpoDe('.ic-piso-noite')).toMatch(/bottom\s*:\s*auto/)
    expect(corpoDe('.ic-noite-texto')).toMatch(/position\s*:\s*relative/)
    expect(corpoDe('.ic-m06')).toMatch(/position\s*:\s*relative/)
    expect(corpoDe('.ic-folha')).toMatch(/display\s*:\s*none/)
    expect(corpoDe('.ic-piso-dia')).toMatch(/display\s*:\s*none/)
  })

  it('no margin crosses a band edge: the hand-over frame has no block margin, the static stage carries the space as padding-block-start', () => {
    const moldura = corpoDe('.ic-estagio .cm-produto-moldura')
    expect(moldura).toMatch(/(?:^|;)\s*margin\s*:\s*0 auto\s*(?:;|$)/)
    expect(moldura).not.toMatch(/margin-(?:top|bottom|block)/)
    // The stage rule (`.ic-estagio`, also with `[data-troca-fixo]`) is the one that owns the space above the frame.
    const palco = daFolga().filter((r) => r.seletor.split(',').some((s) => s.trim().endsWith('.ic-estagio')))
    expect(palco.length).toBeGreaterThan(0)
    expect(palco.map((r) => r.corpo).join(' ')).toMatch(/padding-block-start\s*:\s*var\(--espaco-secao\)/)
  })
})

describe('HOME-WIDTH W1: the lede block hangs from the hero\'s foot in the room, on the stage column\'s line', () => {
  const SALA = '@media (min-width: 1180px) and (min-aspect-ratio: 1/1)'
  const naSala = () => regras().filter((r) => r.contexto.includes(SALA) && r.contexto.length === 2)

  it('--heroi-lede-topo is gone everywhere (declaration and use): no orphan', () => {
    expect(fonte()).not.toContain('--heroi-lede-topo')
  })

  it('--heroi-texto-fundo is defined on the Início root: 723 - 556.8 + 28 px, times k', () => {
    const corpo = daRaiz().map((r) => r.corpo).join(' ')
    expect(corpo).toMatch(/--heroi-texto-fundo\s*:\s*calc\(\(723px - 556\.8px \+ 28px\) \* var\(--heroi-k\)\)\s*;/)
  })

  it('.ic-noite-heroi is bottom-anchored in the room media (top auto, bottom the variable), left and width unchanged', () => {
    const regra = naSala().filter((r) => r.seletor === '[data-casa] .ic-noite-heroi' && /position\s*:\s*absolute/.test(r.corpo))
    expect(regra.length, 'the absolute rule of the room').toBe(1)
    const corpo = regra[0].corpo
    expect(corpo).toMatch(/(?:^|;)\s*top\s*:\s*auto\s*(?:;|$)/)
    expect(corpo).toMatch(/(?:^|;)\s*bottom\s*:\s*var\(--heroi-texto-fundo\)\s*(?:;|$)/)
    expect(corpo).toMatch(/left\s*:\s*var\(--heroi-noite-esq\)/)
    expect(corpo).toMatch(/width\s*:\s*var\(--heroi-medida\)/)
  })

  it('the block is bottom-anchored in the room media only: no other rule gives .ic-noite-heroi a bottom', () => {
    const comBottom = regras().filter((r) => r.seletor.split(',').some((s) => s.trim().endsWith('.ic-noite-heroi')) && /(?:^|;)\s*bottom\s*:/.test(r.corpo))
    expect(comBottom.length).toBe(1)
    expect(comBottom[0].contexto).toContain(SALA)
  })

  it('the hand-over for enlarged text puts the block back in the flow, so a bottom anchor never grows into the lamp', () => {
    const empilhada = regras().filter(
      (r) => r.seletor.split(',').some((s) => s.trim().endsWith('.ic-noite-heroi')) && r.contexto.some((c) => c.startsWith('@container (width < 72.5rem)')),
    )
    expect(empilhada.map((r) => r.corpo).join(' ')).toMatch(/position\s*:\s*static/)
  })
})

describe('HOME-WIDTH W2: M05 and its light layer ask for the same plate size', () => {
  const TAMANHOS = '(min-width: 1440px) min(62.5vw, 1600px), (min-width: 1180px) 62.5vw, min(100vw, 760px)'

  it('M05.sizes and LUZ_M05.sizes are equal and exactly the signed string; the phone crop keeps 100vw', async () => {
    const midia = await import('../componentes/inicio-casa/midia.ts')
    expect(midia.M05.sizes).toBe(TAMANHOS)
    expect(midia.LUZ_M05.sizes).toBe(TAMANHOS)
    expect(midia.LUZ_M05.sizes).toBe(midia.M05.sizes)
    expect(midia.M05.sizes).not.toContain('900px')
    expect(midia.M05_390.sizes).toBe('100vw')
  })
})
