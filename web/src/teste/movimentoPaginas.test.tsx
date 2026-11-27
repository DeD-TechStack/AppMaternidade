import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderizarRota } from './renderizarRota.tsx'

// Desenvolvimento conserva os tempos de MOTION-PAGES. Como e Cuidado usam as cenas da AGY-04.
// O Vitest roda em web/.

const SRC = join(process.cwd(), 'src')
const semComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\r\n/g, '\n')
const ler = (caminho: string) => semComentarios(readFileSync(caminho, 'utf8'))

const SUPORTE = '@supports ((animation-timeline: view()) and (animation-range: entry))'
const SEM_REDUCAO = '@media (prefers-reduced-motion: no-preference)'

const PAGINAS = [
  { pagina: 'componentes/desenvolvimento-casa/desenvolvimento-casa.css', linhas: ['--dc-ideias', '--dc-fase'], molduras: ['.dc-familia', '.dc-fases'] },
]

/** O corpo entre a `{` que segue `inicio` e a `}` que a fecha, e o fim do bloco. */
function corpo(texto: string, inicio: number): { dentro: string; fim: number } {
  const abre = texto.indexOf('{', inicio)
  let fundo = 0
  for (let i = abre; i < texto.length; i += 1) {
    if (texto[i] === '{') fundo += 1
    else if (texto[i] === '}' && --fundo === 0) return { dentro: texto.slice(abre + 1, i), fim: i + 1 }
  }
  throw new Error('bloco sem fechamento')
}

/** Cada regra `seletor { declarações }` sem blocos dentro. */
const regras = (texto: string) => [...texto.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, decl]) => ({ seletor: seletor.trim(), decl }))

describe('MOTION-PAGES os tempos de Desenvolvimento de CENAS.md', () => {
  for (const { pagina, linhas, molduras } of PAGINAS) {
    const css = ler(join(SRC, pagina))
    const importado = /@import\s+'([^']+)';/.exec(css)?.[1]
    const movimento = importado ? ler(join(SRC, dirname(pagina), importado)) : ''

    describe(pagina, () => {
      it('importa o seu arquivo de movimento, e a página em si não anima nem usa linha do tempo', () => {
        expect(importado).toMatch(/^\.\.\/\.\.\/movimento\/paginas\/[a-z]+\.css$/)
        expect(css).not.toMatch(/animation|@keyframes|view-timeline|transform\s*:/)
      })

      it('cada linha do tempo assinada existe, dentro do @supports e do prefers-reduced-motion: no-preference', () => {
        const inicio = movimento.indexOf(SUPORTE)
        expect(inicio, SUPORTE).toBeGreaterThanOrEqual(0)
        // A porta é a palavra-chave `entry`: a forma numérica da faixa não aparece em lugar nenhum do arquivo.
        expect(movimento).not.toMatch(/0%\s+100%/)
        expect(SUPORTE).not.toMatch(/0%\s+100%/)
        const suporte = corpo(movimento, inicio)
        // Nada fora do @supports.
        expect((movimento.slice(0, inicio) + movimento.slice(suporte.fim)).trim()).toBe('')
        // O @supports tem um bloco só: o no-preference, e nada fora dele.
        const dentro = suporte.dentro.trim()
        expect(dentro.startsWith(SEM_REDUCAO)).toBe(true)
        expect(corpo(dentro, 0).fim).toBe(dentro.length)
        for (const linha of linhas) {
          expect(dentro, linha).toMatch(new RegExp(`view-timeline-name:\\s*${linha};`))
          expect(dentro, linha).toMatch(new RegExp(`animation-timeline:\\s*${linha};`))
        }
        // As receitas do cartão: linear, fill both, duração auto, a faixa de entrada.
        expect(dentro).toMatch(/animation-timing-function:\s*linear;/)
        expect(dentro).toMatch(/animation-fill-mode:\s*both;/)
        expect(dentro).toMatch(/animation-duration:\s*auto;/)
        expect(dentro).toMatch(/animation-range:\s*entry \d+% entry \d+%;/)
        expect(dentro).not.toMatch(/animation\s*:/)
      })

      it('só transform: nenhum quadro-chave com opacity ou clip-path, e nada disso no arquivo', () => {
        const quadros = [...movimento.matchAll(/@keyframes\s+[\w-]+/g)]
        expect(quadros.length).toBeGreaterThan(0)
        for (const quadro of quadros) {
          const { dentro } = corpo(movimento, quadro.index ?? 0)
          expect(dentro).toMatch(/transform:/)
          expect(dentro).not.toMatch(/opacity|clip-path/)
        }
        expect(movimento).not.toMatch(/opacity|clip-path|transition|will-change/)
      })

      it('nenhuma moldura nomeada tem overflow: hidden', () => {
        for (const { seletor, decl } of [...regras(css), ...regras(movimento)]) {
          if (molduras.some((m) => seletor.includes(m))) expect(decl, seletor).not.toMatch(/overflow(?:-[xy])?\s*:\s*hidden/)
        }
      })
    })
  }
})

// ---- Revisão, rodada 1 (R1, R2) e os dois fios (C3, E3) ----

/** Cada seletor de cada regra (uma lista vira várias entradas), sem o que vem antes dele (um `@import ...;`). */
const seletores = (texto: string) =>
  regras(texto).flatMap(({ seletor, decl }) =>
    (seletor.split(';').pop() ?? '')
      .split(',')
      .map((s) => ({ seletor: s.replace(/\s+/g, ' ').trim(), decl })),
  )

/** As declarações de todas as regras com exatamente este seletor. */
const declDe = (texto: string, seletor: string) =>
  seletores(texto)
    .filter((r) => r.seletor === seletor)
    .map((r) => r.decl)
    .join('\n')

/** O texto de cada bloco aberto por esta consulta (pode haver vários com a mesma). */
function blocos(texto: string, consulta: string): string {
  const achados: string[] = []
  for (let i = texto.indexOf(consulta); i >= 0; i = texto.indexOf(consulta, i + 1)) achados.push(corpo(texto, i).dentro)
  return achados.join('\n')
}

/** O texto sem nenhum bloco `@container`: o que vale na quebra estreita. */
function semConteineres(texto: string): string {
  let resto = texto
  for (let i = resto.indexOf('@container'); i >= 0; i = resto.indexOf('@container')) resto = resto.slice(0, i) + resto.slice(corpo(resto, i).fim)
  return resto
}

type Lado = 'direita' | 'esquerda'

/** O lado de que a placa é rente, lido da regra da página base: `right: 0` ou `justify-self: end` é a direita; `left: 0`,
 *  `justify-self: start` ou nenhum dos dois (o item da grade começa no início) é a esquerda. */
function ladoDaBase(decl: string): Lado {
  if (/justify-self:\s*end;|(?:^|[\s;])right:\s*0;/.test(decl)) return 'direita'
  return 'esquerda'
}

const BASE_COMO = ler(join(SRC, 'componentes/como-casa/como-casa.css'))
const BASE_CUIDADO = ler(join(SRC, 'componentes/cuidado-casa/cuidado-casa.css'))
const BASE_DESENVOLVIMENTO = ler(join(SRC, 'componentes/desenvolvimento-casa/desenvolvimento-casa.css'))
const MOV_DESENVOLVIMENTO = ler(join(SRC, 'movimento/paginas/desenvolvimento.css'))

const PLACAS: {
  tempo: string
  rota: string
  movimento: string
  linha: string
  dono: string
  animada: string
  variavel: string
  largo: string
  lado: { estreito: Lado; largo: Lado }
}[] = [
  {
    tempo: 'E2',
    rota: '/desenvolvimento',
    movimento: MOV_DESENVOLVIMENTO,
    linha: '--dc-ideias',
    dono: '.dc-familia',
    animada: '.dc-familia img',
    variavel: '--dc-entra',
    largo: '@container (min-width: 40rem)',
    lado: {
      estreito: ladoDaBase(declDe(semConteineres(BASE_DESENVOLVIMENTO), '.dc-familia')),
      largo: ladoDaBase(declDe(blocos(BASE_DESENVOLVIMENTO, '@container (min-width: 40rem)'), '.dc-familia')),
    },
  },
]

describe('R1 a linha do tempo de cada placa é uma moldura parada, recortada, só com a imagem', () => {
  it('E2: esquerda no estreito e direita no largo', () => {
    expect(PLACAS.map((p) => [p.tempo, p.lado.estreito, p.lado.largo])).toEqual([
      ['E2', 'esquerda', 'direita'],
    ])
  })

  for (const placa of PLACAS) {
    describe(placa.tempo, () => {
      const donos = seletores(placa.movimento)
        .filter((r) => new RegExp(`view-timeline-name:\\s*${placa.linha};`).test(r.decl))
        .map((r) => r.seletor)

      it('o dono da linha do tempo é o seletor da moldura, com overflow: clip, e não anda', () => {
        expect(donos).toEqual([placa.dono])
        const decl = declDe(placa.movimento, placa.dono)
        expect(decl).toMatch(/overflow:\s*clip;/)
        expect(decl).not.toMatch(/animation|transform/)
        // Uma <picture> é `display: contents` na base: sem caixa, não teria linha do tempo nem recorte.
        if (placa.dono.endsWith('picture')) expect(decl).toMatch(/display:\s*block;/)
        // Quem anda é a imagem, e só ela, presa a esta linha.
        expect(declDe(placa.movimento, placa.animada)).toMatch(new RegExp(`animation-timeline:\\s*${placa.linha};`))
      })

      it('no DOM, o dono guarda só a imagem (picture, source, img), uma <img>, e ela é a que anda', () => {
        const { container } = renderizarRota(placa.rota)
        const achados = container.querySelectorAll(donos[0] ?? placa.dono)
        expect(achados).toHaveLength(1)
        const dono = achados[0]
        for (const no of dono.querySelectorAll('*')) expect(['PICTURE', 'SOURCE', 'IMG'], no.outerHTML.slice(0, 80)).toContain(no.tagName)
        expect(['PICTURE', 'DIV']).toContain(dono.tagName)
        if (dono.tagName === 'DIV') expect([...dono.children].map((filho) => filho.tagName)).toEqual(['PICTURE'])
        expect((dono.textContent ?? '').trim()).toBe('')
        const imagens = dono.querySelectorAll('img')
        expect(imagens).toHaveLength(1)
        const animada = container.querySelectorAll(placa.animada)
        expect(animada).toHaveLength(1)
        expect(animada[0]).toBe(imagens[0])
        expect(dono.contains(animada[0]) && dono !== animada[0]).toBe(true)
      })
    })
  }
})

describe('R2 a placa entra pela borda de que é rente, em cada quebra', () => {
  for (const placa of PLACAS) {
    const valores = (texto: string) =>
      [...declDe(texto, placa.animada).matchAll(new RegExp(`${placa.variavel}:\\s*(-?\\d+)px;`, 'g'))].map((m) => Number(m[1]))

    for (const [quebra, texto, teto] of [
      ['estreito', semConteineres(placa.movimento), 24],
      ['largo', blocos(placa.movimento, placa.largo), 56],
    ] as const) {
      it(`${placa.tempo} ${quebra}: ${placa.variavel} vem da ${placa.lado[quebra]}, no máximo ${teto} px`, () => {
        const achados = valores(texto)
        expect(achados).toHaveLength(1)
        const [valor] = achados
        expect(Math.sign(valor)).toBe(placa.lado[quebra] === 'direita' ? 1 : -1)
        expect(Math.abs(valor)).toBeLessThanOrEqual(teto)
      })
    }
  }
})

describe('E3 o fio de Desenvolvimento', () => {
  it('E3: as regras ficam nos itens diretos das fases (`.dc-fases > li`), seis fases', () => {
    const fases = seletores(MOV_DESENVOLVIMENTO).filter((r) => r.seletor.includes('.dc-fases'))
    expect(fases.length).toBeGreaterThan(0)
    for (const { seletor } of fases) expect(seletor).toMatch(/^\.dc-fases > li(?::|$)/)
    expect(seletores(MOV_DESENVOLVIMENTO).filter((r) => /animation-name:\s*dc-fio;/.test(r.decl)).map((r) => r.seletor)).toEqual([
      '.dc-fases > li::before',
    ])
    const { container } = renderizarRota('/desenvolvimento')
    expect(container.querySelectorAll('.dc-fases > li')).toHaveLength(6)
  })
})

const LARGO = '@media (min-width: 69em) and (min-aspect-ratio: 1/1)'
const MOVIMENTO_LARGO = LARGO + ' and (prefers-reduced-motion: no-preference)'
const MOVIMENTO = /(?:^|[;\s])(?:animation|transition|view-timeline)(?:-[\w-]+)?\s*:/
const OCULTO = /(?:display:\s*none|visibility:\s*hidden|opacity:\s*0)\s*;/
const COMPOSICAO = ler(join(SRC, 'componentes/inicio-composicao/composicao.css'))

describe.each([
  {
    rota: '/como-funciona',
    css: BASE_COMO,
    molduras: ['.cf-faixa', '.cf-passos'],
    legado: /(?:\.cf-colo|\.cf-duas-depois|movimento\/paginas\/como\.css)/,
    tempos: [
      ['.cf-hist-fone img', 'co-rolar', 'entry 15% entry 95%'],
      ['.cf-depois-dentro', 'co-varre-noite', 'entry 0% entry 50%'],
      ['.cf-m06 .co-luz', 'co-acende', 'entry 35% cover 45%'],
      ['.cf-fecho-dia', 'co-varre-dia', 'entry 0% entry 55%'],
    ],
  },
  {
    rota: '/cuidado-compartilhado',
    css: BASE_CUIDADO,
    molduras: ['.cc-faixa', '.cc-m12', '.cc-senha-fone'],
    legado: /(?:\.cc-meio|data-cc-cena|movimento\/paginas\/cuidado\.css)/,
    tempos: [
      ['.cc-senha-dentro', 'co-varre-noite', 'entry 0% entry 50%'],
      ['.cc-porta-cunha', 'cc-porta-abre', 'entry 15% entry 80%'],
    ],
  },
])('AGY-04 $rota', ({ rota, css, molduras, legado, tempos }) => {
  const largo = css.indexOf(MOVIMENTO_LARGO + ' {')
  const comMovimento = largo < 0 ? '' : corpo(css, largo).dentro
  const suporte = comMovimento.indexOf(SUPORTE + ' {')
  const nativo = suporte < 0 ? '' : corpo(comMovimento, suporte).dentro
  const base = largo < 0 ? css : css.slice(0, largo) + css.slice(corpo(css, largo).fim)

  it.each(tempos)('%s existe no DOM e segue a faixa nativa da cena', (seletor, nome, faixa) => {
    const { container } = renderizarRota(rota)
    expect(container.querySelectorAll(seletor)).toHaveLength(1)
    const decl = declDe(nativo, seletor)
    expect(decl).toContain('animation: ' + nome + ' linear both;')
    // O shorthand deve vir primeiro para não redefinir a linha do tempo.
    expect(decl).toMatch(/animation:[^;]+;[\s\S]*animation-timeline:\s*view\(\);/)
    expect(decl).toContain('animation-range: ' + faixa + ';')
    expect(decl).not.toMatch(/animation-duration:\s*(?!auto;)\S/)
  })

  it('só os elementos previstos da cena animam, sem herdar os tempos do Início', () => {
    const animados = seletores(nativo).filter(({ decl }) => MOVIMENTO.test(decl))
    expect(animados.map(({ seletor }) => seletor)).toEqual(tempos.map(([seletor]) => seletor))
    const { container } = renderizarRota(rota)
    const movimentoDoInicio = seletores(COMPOSICAO).filter(({ decl }) => MOVIMENTO.test(decl))
    expect(movimentoDoInicio.length).toBeGreaterThan(0)
    for (const { seletor } of movimentoDoInicio) expect(container.querySelector(seletor), seletor).toBeNull()
  })

  it('com movimento reduzido ou na quebra estreita, nenhuma regra de movimento fica ativa', () => {
    expect(largo).toBeGreaterThanOrEqual(0)
    expect(base).not.toMatch(MOVIMENTO)
  })

  it('sem suporte a view() e entry, nenhuma regra de movimento fica ativa', () => {
    expect(suporte).toBeGreaterThanOrEqual(0)
    const foraDoSuporte = comMovimento.slice(0, suporte) + comMovimento.slice(corpo(comMovimento, suporte).fim)
    expect(base + foraDoSuporte).not.toMatch(MOVIMENTO)
  })

  it('mantém as faixas recortadas sem reintroduzir o layout de movimento antigo', () => {
    expect(css).not.toMatch(legado)
    expect(declDe(base, molduras[0])).toMatch(/overflow:\s*clip;/)
    for (const { seletor, decl } of seletores(css)) {
      if (molduras.some((moldura) => seletor.includes(moldura))) expect(decl, seletor).not.toMatch(/overflow(?:-[xy])?\s*:\s*hidden/)
    }
  })
})

describe('Como funciona', () => {
  it('o telefone fica no fim do Histórico e a luminária pertence ao recorte M06', () => {
    const { container } = renderizarRota('/como-funciona')
    expect(container.querySelector('.cf-hist .co-fone.cf-hist-fone > img')?.getAttribute('src')).toMatch(/\/historico-\d+w\.webp$/)
    expect(declDe(BASE_COMO, '.cf-hist-fone img')).toMatch(/object-position:\s*bottom;/)
    const placa = container.querySelector('.cf-depois-dentro .co-placa.cf-m06')
    expect([...(placa?.children ?? [])].map((img) => img.getAttribute('src'))).toEqual([
      '/composicao/a/m06.webp',
      '/cenas/inicio/m06-luz-792w.png',
    ])
    expect(placa?.querySelector('img.co-luz')?.getAttribute('alt')).toBe('')
    expect(declDe(COMPOSICAO, '.co-placa .co-luz')).not.toMatch(OCULTO)
  })

  it('as duas paredes mantêm o estado final no CSS estático', () => {
    const noite = declDe(BASE_COMO, '.cf-depois-dentro')
    expect(noite).toContain('background-color: var(--noite);')
    expect(noite).not.toMatch(OCULTO)
    expect(noite).not.toMatch(/clip-path:/)
    const dia = declDe(blocos(BASE_COMO, LARGO + ' {'), '.cf-fecho-dia')
    expect(dia).toContain('display: block;')
    expect(dia).toContain('background-color: var(--dia);')
    expect(dia).not.toMatch(/clip-path:/)
  })

  it('as três etapas ficam numeradas sem fio', () => {
    const { container } = renderizarRota('/como-funciona')
    expect(container.querySelectorAll('ol.cf-passos > li.cf-passo')).toHaveLength(3)
    expect(declDe(BASE_COMO, '.cf-passo::before')).toContain('content: counter(cf-passo);')
    expect(declDe(BASE_COMO, '.cf-passo')).toContain('counter-increment: cf-passo;')
    expect(BASE_COMO).not.toMatch(/cf-fio|\.cf-passos[^{}]*li\s*\+\s*li::after/)
  })

  it('a rota não carrega a placa M04 nem a moldura antiga', () => {
    const { container } = renderizarRota('/como-funciona')
    expect(container.querySelector('.cf-colo, .cf-duas-depois')).toBeNull()
    expect(container.querySelector('[src*="/m04"], [srcset*="/m04"], [src*="moldura-dia.png"], [srcset*="moldura-dia.png"]')).toBeNull()
  })
})

describe('Cuidado compartilhado', () => {
  it('as horas substituem a placa M05 no sono', () => {
    const { container } = renderizarRota('/cuidado-compartilhado')
    const horas = container.querySelectorAll('.cc-sono .cc-sono-horas[aria-hidden="true"] > .cc-sono-hora')
    expect([...horas].map((hora) => hora.textContent)).toEqual(['13:00', '14:40'])
    expect(container.querySelector('.cc-sono img, .cc-meio, [data-cc-cena]')).toBeNull()
  })

  it('o Histórico fica parado em 03:00 no lugar do recorte M01', () => {
    const { container } = renderizarRota('/cuidado-compartilhado')
    const historico = container.querySelector('.cc-senha-dentro .co-fone.cc-senha-fone > img')
    expect(historico?.getAttribute('src')).toMatch(/\/historico-\d+w\.webp$/)
    expect(historico?.getAttribute('alt')).toMatch(/^03:00/)
    expect(declDe(BASE_CUIDADO, '.cc-senha-fone img')).toMatch(/object-position:\s*top;/)
    const noite = declDe(BASE_CUIDADO, '.cc-senha-dentro')
    expect(noite).toContain('background-color: var(--noite);')
    expect(noite).not.toMatch(OCULTO)
    expect(noite).not.toMatch(/clip-path:/)
    expect(container.querySelector('[src*="/m01"], [srcset*="/m01"], [src*="/m05"], [srcset*="/m05"], [src*="moldura-dia.png"], [srcset*="moldura-dia.png"]')).toBeNull()
  })

  it('a fresta e a cunha têm o desenho final no CSS estático', () => {
    const { container } = renderizarRota('/cuidado-compartilhado')
    const porta = container.querySelector('.cc-fecho .cc-porta-luz[aria-hidden="true"]')
    expect([...(porta?.children ?? [])].map((lado) => lado.className)).toEqual(['cc-porta-fresta', 'cc-porta-cunha'])
    expect(container.querySelector('.cc-fecho img')).toBeNull()
    expect(declDe(BASE_CUIDADO, '.cc-porta-fresta')).toContain('background-color: var(--color-mel);')
    expect(declDe(BASE_CUIDADO, '.cc-porta-cunha')).toContain('clip-path: polygon(0 0, 1.5rem 0, 100% 100%, 0 100%);')
    const largo = declDe(blocos(BASE_CUIDADO, LARGO + ' {'), '.cc-porta-cunha')
    const final = 'clip-path: polygon(0 0, 2.25rem 0, 100% 100%, 0 100%);'
    expect(largo).toContain(final)
    const abertura = blocos(BASE_CUIDADO, '@keyframes cc-porta-abre')
    expect(declDe(abertura, 'from')).toContain('clip-path: polygon(0 0, 10% 0, 10% 100%, 0 100%);')
    expect(declDe(abertura, 'to')).toContain(final)
  })
})

it('as cenas mantêm a direção da varredura e o início da luz e do Histórico', () => {
  for (const [nome, inicio] of [
    ['co-varre-noite', 'clip-path: inset(0 0 0 100%);'],
    ['co-varre-dia', 'clip-path: inset(0 100% 0 0);'],
    ['co-acende', 'opacity: 0;'],
    ['co-rolar', 'object-position: top;'],
  ]) {
    const quadros = blocos(COMPOSICAO, '@keyframes ' + nome)
    expect(declDe(quadros, 'from'), nome).toContain(inicio)
    if (nome.startsWith('co-varre')) expect(declDe(quadros, 'to'), nome).toContain('clip-path: inset(0 0 0 0);')
  }
})
