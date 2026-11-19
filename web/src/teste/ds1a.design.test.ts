import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listarFontes } from './fontes.ts'

// DS-1a (DS1-I-02, DS1-I-05, DS1-I-06, DS1-I-21): o DESIGN.md e o CSS-fonte da base de seções.
// Lidos do disco; o Vitest roda em web/ (o `import.meta.url` de um teste em jsdom não é uma URL file:).
const pastaWeb = process.cwd()
const pastaSrc = join(pastaWeb, 'src') + sep
const lerSrc = (relativo: string) => readFileSync(pastaSrc + relativo, 'utf8')
const designMd = readFileSync(join(pastaWeb, 'DESIGN.md'), 'utf8')

const semComentariosCss = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '')
const cssDoProduto = listarFontes(pastaSrc)
  .filter((f) => f.nome.endsWith('.css'))
  .map((f) => ({ nome: f.nome, texto: f.texto, limpo: semComentariosCss(f.texto) }))

// ---------------------------------------------------------------------------------------------
// DS1-I-02: toda linha do DESIGN.md que fala de itálico é uma proibição.
// ---------------------------------------------------------------------------------------------
const PROIBICAO = /(?<![\p{L}\p{N}_])(?:não|nenhum|nenhuma|nunca|sem|zero|proibido)(?![\p{L}\p{N}_])/iu
const FALA_DE_ITALICO = /it[áa]lic/i

/** As linhas que falam de itálico e não trazem nenhuma palavra de proibição (inteira, sem caixa). */
function linhasDeItalicoSemProibicao(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .filter((linha) => FALA_DE_ITALICO.test(linha))
    .filter((linha) => !PROIBICAO.test(linha))
}

const LINHA_DA_AREA_LOGADA =
  'Itálico: nenhum nas páginas públicas, em nenhum elemento; a área logada não entra nesta regra até o DS-2.'

describe('DS1-I-02 DESIGN.md: itálico só aparece como proibição', () => {
  it('DS1-I-02 o verificador local reprova a frase "citação em itálico" (controle negativo)', () => {
    expect(linhasDeItalicoSemProibicao('Uma citação em itálico.')).toEqual(['Uma citação em itálico.'])
    expect(linhasDeItalicoSemProibicao('- Faça: citação em itálico')).toHaveLength(1)
    expect(linhasDeItalicoSemProibicao('citação em ITÁLICO')).toHaveLength(1)
    // "sem" vale como palavra inteira: "semana" não protege a linha.
    expect(linhasDeItalicoSemProibicao('semana em itálico')).toHaveLength(1)
    expect(linhasDeItalicoSemProibicao('Nenhum itálico nas páginas públicas.')).toEqual([])
    expect(linhasDeItalicoSemProibicao('Sem itálico, nunca.')).toEqual([])
    expect(linhasDeItalicoSemProibicao('Uma linha sem o assunto.')).toEqual([])
  })

  it('DS1-I-02 toda linha do DESIGN.md com "itálic" ou "italic" traz uma palavra de proibição', () => {
    expect(linhasDeItalicoSemProibicao(designMd)).toEqual([])
  })

  it('DS1-I-02 a linha da exceção da área logada está presente, igual ao texto do cartão', () => {
    expect(designMd.split(/\r?\n/)).toContain(LINHA_DA_AREA_LOGADA)
  })

  it('DS1-I-02 as seis linhas permissivas de hoje sumiram', () => {
    const permissivas = [
      'citação grande (itálica)',
      'texto de abertura e depoimento (itálico)',
      'com a segunda linha inteira em itálico',
      'Literata itálico 48/56',
      'a frase em Literata itálico',
      'no máximo uma ênfase em itálico por página',
    ]
    for (const trecho of permissivas) expect(designMd, trecho).not.toContain(trecho)
  })

  it('DS1-I-02 designmd lint sai com 0 (o @google/design.md instalado)', () => {
    const pacoteCli = join(pastaWeb, 'node_modules', '@google', 'design.md')
    expect(existsSync(join(pacoteCli, 'package.json')), '@google/design.md não está instalado').toBe(true)
    const manifesto = JSON.parse(readFileSync(join(pacoteCli, 'package.json'), 'utf8')) as {
      bin?: string | Record<string, string>
    }
    const bin = typeof manifesto.bin === 'string' ? manifesto.bin : (manifesto.bin?.designmd ?? '')
    expect(bin, 'o pacote não declara o executável designmd').not.toBe('')
    const resultado = spawnSync(process.execPath, [join(pacoteCli, bin), 'lint', join(pastaWeb, 'DESIGN.md')], {
      encoding: 'utf8',
      timeout: 60_000,
    })
    expect(resultado.status, `${resultado.stdout}\n${resultado.stderr}`).toBe(0)
  })
})

// ---------------------------------------------------------------------------------------------
// DS1-I-05: uma variável de exibição, uma só declaração de família, os dois pesos em um lugar.
// ---------------------------------------------------------------------------------------------
type Css = { nome: string; limpo: string }

/**
 * The temporary display variants of FG-2b (`html[data-exibicao="b"|"c"] { ... }`) re-declare the display tokens in
 * their own scoped blocks. They are not a second base declaration, so they are cut out of styles/tokens.css (and only
 * out of that file: a variant block anywhere else still counts) before the base declarations are counted.
 */
function semVariantesDeExibicao(f: Css): string {
  if (f.nome !== 'styles/tokens.css') return f.limpo
  return f.limpo.replace(/html\[data-exibicao=["'][a-z]+["']\]\s*\{[^{}]*\}/g, '')
}

/** Quantas declarações de `--nome:` há nos arquivos (comentários fora; os blocos de variante de exibição à parte). */
function declaracoesDeVariavel(arquivos: Css[], variavel: string): Array<{ nome: string; valor: string }> {
  const regex = new RegExp(`(?:^|[;{\\s])${variavel}\\s*:\\s*([^;}]+)`, 'g')
  return arquivos.flatMap((f) =>
    [...semVariantesDeExibicao(f).matchAll(regex)].map((m) => ({ nome: f.nome, valor: m[1].trim() })),
  )
}

/** Os arquivos (e os trechos) fora das exceções do cartão que nomeiam a Literata. */
function usosDeLiterata(arquivos: Css[]): Array<{ nome: string; trecho: string }> {
  return arquivos.flatMap((f) => {
    const linhas = f.limpo.split(/\r?\n/).filter((linha) => /Literata/i.test(linha))
    return linhas
      .filter((linha) => !(/^\s*@import\b/.test(linha) && f.nome === 'index.css'))
      .filter((linha) => !(f.nome === 'styles/tokens.css' && /--fonte-exibicao\s*:/.test(linha)))
      .map((trecho) => ({ nome: f.nome, trecho: trecho.trim() }))
  })
}

const FAMILIA_DE_EXIBICAO = /^(['"])Literata Variable\1\s*,\s*serif$/

describe('DS1-I-05 uma variável de exibição só', () => {
  it('DS1-I-05 o verificador local reprova uma segunda regra `font-family: Literata` em outro arquivo (controle)', () => {
    const base = cssDoProduto.map(({ nome, limpo }) => ({ nome, limpo }))
    const com = [...base, { nome: 'styles/intruso.css', limpo: ".x { font-family: 'Literata Variable'; }" }]
    expect(usosDeLiterata(com).some((u) => u.nome === 'styles/intruso.css')).toBe(true)
    const duas = [...base, { nome: 'styles/intruso.css', limpo: ":root { --fonte-exibicao: 'Literata Variable', serif; }" }]
    expect(declaracoesDeVariavel(duas, '--fonte-exibicao').length).toBeGreaterThan(1)
  })

  it('DS1-I-05 `--fonte-exibicao` é declarada uma única vez em src, em styles/tokens.css, com a família de hoje', () => {
    const declaracoes = declaracoesDeVariavel(cssDoProduto, '--fonte-exibicao')
    expect(declaracoes).toHaveLength(1)
    expect(declaracoes[0].nome).toBe('styles/tokens.css')
    expect(declaracoes[0].valor).toMatch(FAMILIA_DE_EXIBICAO)
  })

  it('DS1-I-05 `--font-titulo` é `var(--fonte-exibicao)` e o alias circular de tema.css sumiu', () => {
    const tokens = cssDoProduto.find((f) => f.nome === 'styles/tokens.css')!
    const titulo = declaracoesDeVariavel([tokens], '--font-titulo')
    expect(titulo).toHaveLength(1)
    expect(titulo[0].valor).toBe('var(--fonte-exibicao)')
    const tema = cssDoProduto.find((f) => f.nome === 'styles/tema.css')!
    expect(declaracoesDeVariavel([tema], '--fonte-exibicao')).toEqual([])
  })

  it('DS1-I-05 nenhuma outra declaração CSS de src nomeia a Literata (o @import do index.css e a variável ficam de fora)', () => {
    expect(usosDeLiterata(cssDoProduto)).toEqual([])
  })

  it('DS1-I-05 `--peso-exibicao` e `--peso-titulo` são declarados uma vez cada, em tokens.css, com 600', () => {
    for (const variavel of ['--peso-exibicao', '--peso-titulo']) {
      const declaracoes = declaracoesDeVariavel(cssDoProduto, variavel)
      expect(declaracoes, variavel).toHaveLength(1)
      expect(declaracoes[0].nome, variavel).toBe('styles/tokens.css')
      expect(declaracoes[0].valor, variavel).toBe('600')
    }
  })

  it('DS1-I-05 a definição dos níveis em site.css lê o peso pelos tokens, não pelo número', () => {
    const site = semComentariosCss(lerSrc('styles/site.css'))
    const regras = [...site.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, corpo]) => ({ seletor, corpo }))
    const titulos = regras.find((r) => /\.cm-h1\b/.test(r.seletor) && /\.cm-marca\b/.test(r.seletor))
    expect(titulos, 'a regra de família dos títulos (.cm-h1 … .cm-marca)').toBeDefined()
    expect(titulos!.corpo).toMatch(/font-weight:\s*var\(--peso-titulo\)/)
    expect(titulos!.corpo).not.toMatch(/font-weight:\s*600/)
    // O nível de exibição (h1 de conteúdo) lê o seu próprio peso.
    expect(site).toMatch(/font-weight:\s*var\(--peso-exibicao\)/)
  })
})

// ---------------------------------------------------------------------------------------------
// DS1-I-06 (fonte CSS): nenhuma das sete regras de itálico do §5.3 declara `font-style: italic`.
// ---------------------------------------------------------------------------------------------
/** Os corpos das regras cujo seletor nomeia `classe` (como classe inteira). */
function corposDaClasse(css: string, classe: string): string[] {
  const alvo = new RegExp(`\\.${classe}(?![\\w-])`)
  return [...semComentariosCss(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, seletor]) => alvo.test(seletor))
    .map(([, , corpo]) => corpo)
}

const FONTES_DE_ITALICO: Array<[arquivo: string, classe: string]> = [
  ['styles/site.css', 'cm-segunda-linha'],
  ['styles/campo.css', 'cm-citacao-texto'],
  ['styles/campo.css', 'cm-depoimento-texto'],
  ['index.css', 't-citacao'],
  ['componentes/inicio/inicio.css', 'in-relato-grande-texto'],
  ['componentes/inicio/inicio.css', 'in-relato-texto'],
  // `pt-segunda-linha` saiu com o modelo T2 (a frase de abertura das páginas de leitura é o `cm-lide`, em prumo).
]

describe('DS1-I-06 as fontes CSS de itálico público do §5.3', () => {
  it('DS1-I-06 o leitor de regras acha a classe e vê o itálico (controle negativo)', () => {
    const css = '.a .cm-x { font-style: italic; }\n/* .cm-y { font-style: italic } */\n.cm-y { font-style: normal; }'
    expect(corposDaClasse(css, 'cm-x').join(' ')).toMatch(/font-style:\s*italic/)
    expect(corposDaClasse(css, 'cm-y').join(' ')).not.toMatch(/italic/)
    expect(corposDaClasse(css, 'cm')).toEqual([])
  })

  it.each(FONTES_DE_ITALICO)('DS1-I-06 %s: .%s não declara `font-style: italic`', (arquivo, classe) => {
    const corpos = corposDaClasse(lerSrc(arquivo), classe)
    expect(corpos.length, `a regra .${classe} em ${arquivo}`).toBeGreaterThan(0)
    for (const corpo of corpos) expect(corpo).not.toMatch(/font-style:\s*italic/)
  })

  it('DS1-I-06 `h1 .cm-segunda-linha` fica em prumo (font-style: normal ou sem a linha)', () => {
    const corpos = corposDaClasse(lerSrc('styles/site.css'), 'cm-segunda-linha')
    for (const corpo of corpos) expect(corpo).not.toMatch(/font-style:\s*(?!normal)\S/)
  })
})

// ---------------------------------------------------------------------------------------------
// DS1-I-21: o estilo `exibicao-404` (RN-03), fora da escala.
// ---------------------------------------------------------------------------------------------
/** Resolve `clamp(min, calc(base + (100vw - 390px) * N / M), max)` em px para uma largura de viewport. */
function resolverClamp(valor: string, viewport: number): number {
  const comprimento = (n: string, unidade: string) => Number(n) * (unidade === 'rem' ? 16 : 1)
  const m = valor.match(
    /^clamp\(\s*([\d.]+)(rem|px)\s*,\s*calc\(\s*([\d.]+)(rem|px)\s*\+\s*\(100vw\s*-\s*390px\)\s*\*\s*([\d.]+)\s*\/\s*([\d.]+)\s*\)\s*,\s*([\d.]+)(rem|px)\s*\)$/,
  )
  if (!m) throw new Error(`clamp fora da forma do tema gerado: ${valor}`)
  const minimo = comprimento(m[1], m[2])
  const base = comprimento(m[3], m[4])
  const maximo = comprimento(m[7], m[8])
  const livre = base + ((viewport - 390) * Number(m[5])) / Number(m[6])
  return Math.min(Math.max(livre, minimo), maximo)
}

describe('DS1-I-21 exibicao-404 (fora da escala)', () => {
  it('DS1-I-21 o avaliador de clamp acerta os extremos do `exibicao` de hoje (controle)', () => {
    const tamanho = 'clamp(2.75rem, calc(2.75rem + (100vw - 390px) * 36 / 1050), 5rem)'
    expect(resolverClamp(tamanho, 390)).toBeCloseTo(44, 2)
    expect(resolverClamp(tamanho, 1440)).toBeCloseTo(80, 2)
    expect(() => resolverClamp('calc(1px)', 390)).toThrow()
  })

  it('DS1-I-21 o DESIGN.md lista `exibicao-404` em "Fora da escala" com 112/112, 56/58 e "T4"', () => {
    const secao = designMd.split(/^### Fora da escala/m)[1]?.split(/^#{2,3} /m)[0] ?? ''
    const entrada = secao.split(/\r?\n/).find((linha) => linha.includes('exibicao-404'))
    expect(entrada, 'a linha de exibicao-404 em "Fora da escala"').toBeDefined()
    expect(entrada).toContain('fora-da-escala: true')
    expect(entrada).toContain('112/112')
    expect(entrada).toContain('56/58')
    expect(entrada).toContain('--fonte-exibicao')
    expect(entrada).toContain('--peso-exibicao')
    expect(entrada).toMatch(/T4/)
  })

  it('DS1-I-21 o site.css define `--texto-exibicao-404-tamanho` 56→112 e `-entrelinha` 58→112, em reta', () => {
    const site = semComentariosCss(lerSrc('styles/site.css'))
    const tamanho = site.match(/--texto-exibicao-404-tamanho\s*:\s*([^;]+);/)?.[1].trim()
    const entrelinha = site.match(/--texto-exibicao-404-entrelinha\s*:\s*([^;]+);/)?.[1].trim()
    expect(tamanho, '--texto-exibicao-404-tamanho').toBeDefined()
    expect(entrelinha, '--texto-exibicao-404-entrelinha').toBeDefined()
    expect(resolverClamp(tamanho!, 390)).toBeCloseTo(56, 1)
    expect(resolverClamp(tamanho!, 1440)).toBeCloseTo(112, 1)
    expect(resolverClamp(entrelinha!, 390)).toBeCloseTo(58, 1)
    expect(resolverClamp(entrelinha!, 1440)).toBeCloseTo(112, 1)
    // Linear entre os dois: no meio do intervalo, a média.
    expect(resolverClamp(tamanho!, 915)).toBeCloseTo(84, 1)
    // Fixos fora do intervalo (o par de 390 abaixo, o de 1440 acima).
    expect(resolverClamp(tamanho!, 320)).toBeCloseTo(56, 1)
    expect(resolverClamp(tamanho!, 1920)).toBeCloseTo(112, 1)
  })

  it('DS1-I-21 a classe `.cm-exibicao-404` lê os dois tokens, a família e o peso de exibição', () => {
    const corpos = corposDaClasse(lerSrc('styles/site.css'), 'cm-exibicao-404').join('\n')
    expect(corpos).toMatch(/font-size:\s*var\(--texto-exibicao-404-tamanho\)/)
    expect(corpos).toMatch(/line-height:\s*var\(--texto-exibicao-404-entrelinha\)/)
    expect(corpos).toMatch(/font-family:\s*var\(--fonte-exibicao\)/)
    expect(corpos).toMatch(/font-weight:\s*var\(--peso-exibicao\)/)
  })

  it('DS1-I-21 só a página inexistente usa `cm-exibicao-404` (REP-T4)', () => {
    const usos = listarFontes(pastaSrc)
      .filter((f) => /\.tsx?$/.test(f.nome))
      .filter((f) => f.texto.includes('cm-exibicao-404'))
      .map((f) => f.nome)
    expect(usos).toEqual(['paginas/NaoEncontrada.tsx'])
  })
})
