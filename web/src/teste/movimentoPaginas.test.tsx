import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderizarRota } from './renderizarRota.tsx'

// MOTION-PAGES (.oc/CENAS.md, assinado): os seis tempos presos à rolagem das três páginas, só em CSS. O CSS de cada
// página importa o seu arquivo de movimento; tudo dele mora sob o @supports da linha do tempo e o
// prefers-reduced-motion: no-preference, para que sem suporte, ou com movimento reduzido, a página seja a base.
// O Vitest roda em web/.

const SRC = join(process.cwd(), 'src')
const semComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\r\n/g, '\n')
const ler = (caminho: string) => semComentarios(readFileSync(caminho, 'utf8'))

const SUPORTE = '@supports ((animation-timeline: view()) and (animation-range: entry))'
const SEM_REDUCAO = '@media (prefers-reduced-motion: no-preference)'

const PAGINAS = [
  { pagina: 'componentes/como-casa/como-casa.css', linhas: ['--cf-depois', '--cf-comecar'], molduras: ['.cf-colo', '.cf-colo > picture', '.cf-passos'] },
  { pagina: 'componentes/cuidado-casa/cuidado-casa.css', linhas: ['--cc-sono', '--cc-senha'], molduras: ['.cc-meio-cena'] },
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

describe('MOTION-PAGES os seis tempos de CENAS.md', () => {
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
const MOV_COMO = ler(join(SRC, 'movimento/paginas/como.css'))
const MOV_CUIDADO = ler(join(SRC, 'movimento/paginas/cuidado.css'))
const MOV_DESENVOLVIMENTO = ler(join(SRC, 'movimento/paginas/desenvolvimento.css'))

const LARGO_CC = '@container cc-pagina (min-width: 1024px)'
const D1_CENA = ".cc-meio[data-cc-cena='cena2'] .cc-meio-cena"
const D2_CENA = ".cc-meio[data-cc-cena='cena3'] .cc-meio-cena"

/** Os quatro tempos de placa: quem é a linha do tempo, quem anda, e de que borda a placa é rente em cada quebra. */
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
    tempo: 'C2',
    rota: '/como-funciona',
    movimento: MOV_COMO,
    linha: '--cf-depois',
    dono: '.cf-duas-depois > .cf-colo > picture',
    animada: '.cf-duas-depois > .cf-colo > picture > img',
    variavel: '--cf-entra',
    largo: '@container cf-banda (min-width: 700px)',
    // Pela folha assinada (CENAS.md): M06 chega pela direita nas duas quebras.
    lado: { estreito: 'direita', largo: 'direita' },
  },
  {
    tempo: 'D1',
    rota: '/cuidado-compartilhado',
    movimento: MOV_CUIDADO,
    linha: '--cc-sono',
    dono: D1_CENA,
    animada: `${D1_CENA} img`,
    variavel: '--cc-entra',
    largo: LARGO_CC,
    // No estreito a cena sangra até as duas bordas; o lado é o mesmo a que a placa se ancora no largo.
    lado: { estreito: ladoDaBase(declDe(blocos(BASE_CUIDADO, LARGO_CC), D1_CENA)), largo: ladoDaBase(declDe(blocos(BASE_CUIDADO, LARGO_CC), D1_CENA)) },
  },
  {
    tempo: 'D2',
    rota: '/cuidado-compartilhado',
    movimento: MOV_CUIDADO,
    linha: '--cc-senha',
    dono: D2_CENA,
    animada: `${D2_CENA} img`,
    variavel: '--cc-entra',
    largo: LARGO_CC,
    lado: { estreito: ladoDaBase(declDe(blocos(BASE_CUIDADO, LARGO_CC), D2_CENA)), largo: ladoDaBase(declDe(blocos(BASE_CUIDADO, LARGO_CC), D2_CENA)) },
  },
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
  it('o mapa de lados lido da página base é o esperado (D1 e E2 largo à direita; D2 e E2 estreito à esquerda)', () => {
    expect(PLACAS.map((p) => [p.tempo, p.lado.estreito, p.lado.largo])).toEqual([
      ['C2', 'direita', 'direita'],
      ['D1', 'direita', 'direita'],
      ['D2', 'esquerda', 'esquerda'],
      ['E2', 'esquerda', 'direita'],
    ])
    // A base do C2 não muda: a <picture> segue sem caixa, a coluna da placa segue sem recorte.
    expect(declDe(BASE_COMO, '.cf-colo > picture')).toMatch(/display:\s*contents;/)
    expect(declDe(BASE_COMO, '.cf-colo')).not.toMatch(/overflow/)
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

describe('C3 e E3 os fios', () => {
  it('C3: o fio é o ::after dos itens 2 e 3 (li + li), com exatamente duas regras de degrau', () => {
    const fio = seletores(MOV_COMO).filter((r) => /animation-name:\s*cf-fio;/.test(r.decl))
    expect(fio.map((r) => r.seletor)).toEqual(['.cf-passos > li + li::after'])
    const degraus = seletores(MOV_COMO).filter((r) => r.seletor.startsWith('.cf-passos') && /animation-range:/.test(r.decl))
    expect(degraus.map((r) => r.seletor)).toEqual(['.cf-passos > li:nth-child(2)::after', '.cf-passos > li:nth-child(3)::after'])
    const { container } = renderizarRota('/como-funciona')
    expect(container.querySelectorAll('.cf-passos > li')).toHaveLength(3)
    expect(container.querySelectorAll('.cf-passos > li + li')).toHaveLength(2)
  })

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
