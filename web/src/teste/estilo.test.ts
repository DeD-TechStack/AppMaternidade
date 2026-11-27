import { readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PALETA } from '../conteudo/sistema.ts'
import { listarFontes } from './fontes.ts'

// As portas determinísticas do DESIGN.md "Campo de mel" (.oc/contrato/DESIGN.md, seção 8), sobre o
// código-fonte do produto (sem os testes). Substitui o antigo web/src/estilo.test.ts (MAT-49a).
// Lidos do disco: no Vitest, importar CSS não devolve o texto do arquivo. O Vitest roda em web/ (e,
// no jsdom, o `import.meta.url` de um arquivo em teste/ não é uma URL file:), então a pasta vem do cwd.
const pastaWeb = process.cwd()
const pastaSrc = join(pastaWeb, 'src') + sep
const lerTexto = (relativo: string) => readFileSync(pastaSrc + relativo, 'utf8')
const tokensCss = lerTexto('styles/tokens.css')
const temaCss = lerTexto('styles/tema.css')
const indexCss = lerTexto('index.css')
const pacote = JSON.parse(readFileSync(join(pastaWeb, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>
}

const semComentariosCss = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '')
const semComentariosTs = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')

// Os arquivos marcados para apagar (MAT-49a) ficam de fora: só têm um comentário e `export {}`.
const produto = listarFontes(pastaSrc).filter((f) => !f.texto.startsWith('// APAGAR') && !f.texto.startsWith('/* APAGAR'))
const css = produto.filter((f) => f.nome.endsWith('.css')).map((f) => ({ ...f, limpo: semComentariosCss(f.texto) }))
const ts = produto.filter((f) => /\.tsx?$/.test(f.nome)).map((f) => ({ ...f, limpo: semComentariosTs(f.texto) }))
const todos = [...css, ...ts]

/** As declarações `propriedade: valor` de um CSS. */
function declaracoes(texto: string): Array<{ propriedade: string; valor: string }> {
  return [...texto.matchAll(/(?:^|[;{\s])(-{0,2}[a-z][a-z0-9-]*)\s*:\s*([^;{}]+);/g)].map(([, propriedade, valor]) => ({
    propriedade,
    valor: valor.trim(),
  }))
}

// Os 12 papéis da seção 1, com o hexadecimal do contrato.
const PAPEIS: Record<string, string> = {
  papel: '#F8F6EB',
  mel: '#F2C14E',
  'mel-claro': '#F7D684',
  oliva: '#697255',
  'oliva-tinta': '#4F5740',
  cacau: '#2B2320',
  areia: '#EADDC5',
  'texto-2': '#6E6560',
  branco: '#FFFFFF',
  noite: '#2B2320',
  'noite-cartao': '#3A302B',
  'noite-2': '#B9C09F',
}

describe('tokens (DESIGN.md 1 a 3)', () => {
  it('tokens.css declara os 12 papéis com o hexadecimal do contrato', () => {
    for (const [papel, hex] of Object.entries(PAPEIS)) {
      const valor = new RegExp(`--color-${papel}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(tokensCss)?.[1]
      expect(valor?.toUpperCase(), papel).toBe(hex)
    }
  })

  it('a paleta mostrada na /sistema é a mesma de tokens.css, papel por papel', () => {
    expect(PALETA.map((p) => p.token).sort()).toEqual(Object.keys(PAPEIS).sort())
    for (const papel of PALETA) expect(`#${papel.hex}`, papel.token).toBe(PAPEIS[papel.token])
  })

  it('as duas sombras e os dois gradientes têm os valores do contrato, letra por letra', () => {
    expect(tokensCss).toContain('--sombra-flutuante: 0 2px 4px rgb(43 35 32 / .08), 0 18px 40px rgb(43 35 32 / .16);')
    expect(tokensCss).toContain('--sombra-cartao: 0 1px 2px rgb(43 35 32 / .06), 0 8px 24px rgb(43 35 32 / .06);')
    expect(tokensCss).toContain('--luz-estudio: radial-gradient(120% 90% at 15% 10%, #F7D684 0%, #F2C14E 60%);')
    expect(tokensCss).toContain('--brilho-mel: radial-gradient(closest-side, rgb(242 193 78 / .22), transparent);')
  })

  it('os raios são os do contrato: painel 24, cartão 20, pílula 999, campo 14', () => {
    expect(tokensCss).toMatch(/--radius-painel:\s*24px/)
    expect(tokensCss).toMatch(/--radius-cartao:\s*20px/)
    expect(tokensCss).toMatch(/--radius-pilula:\s*999px/)
    expect(tokensCss).toMatch(/--radius-campo:\s*14px/)
  })

  it('a madrugada troca o fundo pela noite, os cartões pelo cartão da noite e mantém o destaque mel', () => {
    const bloco = /:root\[data-tema='madrugada'\]\s*\{([\s\S]*?)\n\}/.exec(temaCss)?.[1] ?? ''
    expect(bloco).toMatch(/--cor-fundo:\s*var\(--color-noite\)/)
    expect(bloco).toMatch(/--cor-cartao:\s*var\(--color-noite-cartao\)/)
    expect(bloco).toMatch(/--cor-texto-2:\s*var\(--color-noite-2\)/)
    expect(bloco).toMatch(/--cor-destaque:\s*var\(--color-mel\)/)
  })

  it('o fundo da página é o papel', () => {
    expect(temaCss).toMatch(/--cor-fundo:\s*var\(--color-papel\)/)
    expect(indexCss).toMatch(/body\s*\{[^}]*background-color:\s*var\(--cor-fundo\)/)
  })
})

describe('tipo: duas famílias só (DESIGN.md 2 e 8)', () => {
  const GENERICAS = new Set(['serif', 'sans-serif', 'system-ui'])

  it('toda pilha de fontes do CSS do produto é Literata, Outfit ou (só na variante B do h1) M PLUS Rounded 1c, com genéricas só de reserva', () => {
    const familias = new Set<string>()
    for (const arquivo of css) {
      for (const { propriedade, valor } of declaracoes(arquivo.limpo)) {
        if (propriedade !== 'font-family' && !/^--(font|fonte|default)-/.test(propriedade)) continue
        if (/^--font-weight|font-feature|font-variation/.test(propriedade)) continue
        for (const parte of valor.split(',').map((p) => p.trim().replace(/^['"]|['"]$/g, ''))) {
          if (parte.startsWith('var(') || parte === 'inherit' || parte === 'initial') continue
          familias.add(parte)
        }
      }
    }
    const nomeadas = [...familias].filter((f) => !GENERICAS.has(f))
    // REP-HOME (REPH-I-17): o bloco da variante B de tokens.css nomeia M PLUS Rounded 1c; FG-2b apaga o que perder.
    expect(nomeadas.sort()).toEqual(['Literata Variable', 'M PLUS Rounded 1c', 'Outfit Variable'])
  })

  it('nenhum monospace e nenhuma família fora do tema, nem no CSS nem nos componentes', () => {
    for (const arquivo of todos) expect(arquivo.limpo, arquivo.nome).not.toMatch(/monospace/)
    for (const arquivo of ts) expect(arquivo.limpo, arquivo.nome).not.toMatch(/fontFamily|font-\[|font-mono/)
  })

  it('Literata reta e itálica e Outfit vêm de @fontsource-variable Latin, com reservas locais, e as quatro antigas saíram', () => {
    for (const [folha, familia, arquivo] of [
      ['literata-latin-opsz', 'literata', 'literata-latin-opsz-normal'],
      ['literata-latin-wght-italic', 'literata', 'literata-latin-wght-italic'],
      ['outfit-latin-wght', 'outfit', 'outfit-latin-wght-normal'],
    ]) {
      const origem = `@fontsource-variable/${familia}`
      expect(semComentariosCss(indexCss)).toContain(`@import './styles/${folha}.css';`)
      expect(pacote.dependencies[origem]).toBeDefined()
      expect(declaracoes(semComentariosCss(lerTexto(`styles/${folha}.css`))).filter((d) => d.propriedade === 'src')).toEqual([
        { propriedade: 'src', valor: `url(${origem}/files/${arquivo}.woff2) format('woff2-variations')` },
      ])
    }
    expect(tokensCss).toMatch(/--fonte-exibicao:\s*'Literata Variable',\s*serif\s*;/)
    expect(tokensCss).toMatch(/--font-texto:\s*'Outfit Variable',\s*system-ui,\s*sans-serif\s*;/)
    const dependencias = Object.keys(pacote.dependencies).join(' ')
    for (const antiga of ['fraunces', 'instrument-sans', 'instrument-serif', 'zilla-slab']) {
      expect(dependencias, antiga).not.toContain(antiga)
      for (const arquivo of todos) expect(arquivo.limpo.toLowerCase(), arquivo.nome).not.toContain(antiga)
    }
  })

  it('as famílias padrão do Tailwind (sans, serif, mono) apontam para as duas do site', () => {
    expect(tokensCss).toMatch(/--font-sans:\s*var\(--font-texto\)/)
    expect(tokensCss).toMatch(/--font-serif:\s*var\(--font-titulo\)/)
    expect(tokensCss).toMatch(/--font-mono:\s*var\(--font-texto\)/)
    expect(tokensCss).toMatch(/--default-mono-font-family:\s*var\(--font-texto\)/)
  })

  it('nenhum rótulo em caixa alta', () => {
    for (const arquivo of css) expect(arquivo.limpo, arquivo.nome).not.toMatch(/text-transform:\s*uppercase/)
    for (const arquivo of ts) expect(arquivo.limpo, arquivo.nome).not.toMatch(/\buppercase\b/)
  })
})

describe('cor só dos tokens (DESIGN.md 8)', () => {
  it('nenhum hexadecimal, rgb() ou hsl() solto fora de styles/tokens.css', () => {
    const soltos: string[] = []
    for (const arquivo of todos) {
      if (arquivo.nome === 'styles/tokens.css') continue
      // Floor line A05: --co-breu is declared on .co in composicao.css, not in the shared tokens; exempt only that literal.
      const texto =
        arquivo.nome === 'componentes/inicio-composicao/composicao.css'
          ? arquivo.limpo.replace('--co-breu: #18110F;', '')
          : arquivo.limpo
      for (const [achado] of texto.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/g)) {
        soltos.push(`${arquivo.nome}: ${achado}`)
      }
    }
    expect(soltos).toEqual([])
  })
})

// A composição da Início (único arquivo com exceção): um contorno é um anel, não elevação. Deslocamento zero, desfoque
// zero, espessura em px, cor por papel (var) ou papel misturado com transparente.
const COMPOSICAO = 'componentes/inicio-composicao/composicao.css'
const ANEL = /^(inset )?0 0 0 [\d.]+px (var\(--[\w-]+\)|color-mix\(in srgb, var\(--[\w-]+\) \d+%, transparent\))$/

// A mesma composição: a parede do dia e a da noite são duas cores chapadas que se encontram na costura (parada dura,
// sem mistura): `linear-gradient(to right, X 0 var(--costura), Y var(--costura))`, com X transparente ou um papel.
const DIVISAO_NA_COSTURA =
  /^linear-gradient\(to right, (transparent|var\(--[\w-]+\)) 0 var\(--costura\), var\(--[\w-]+\) var\(--costura\)\)$/

/** Os gradientes de um CSS: as chamadas `*-gradient(...)` inteiras (com parênteses aninhados), na ordem. */
function gradientes(texto: string): string[] {
  const achados: string[] = []
  for (const m of texto.matchAll(/(?:repeating-)?(?:linear|radial|conic)-gradient\(/g)) {
    let fundo = 1
    let i = m.index + m[0].length
    while (i < texto.length && fundo > 0) {
      if (texto[i] === '(') fundo += 1
      else if (texto[i] === ')') fundo -= 1
      i += 1
    }
    achados.push(texto.slice(m.index, i))
  }
  return achados
}

describe('sombra, gradiente e filtro só pelos tokens (DESIGN.md 3 e 8)', () => {
  it('box-shadow só com var(--sombra-flutuante) ou var(--sombra-cartao)', () => {
    for (const arquivo of css) {
      for (const { propriedade, valor } of declaracoes(arquivo.limpo)) {
        if (propriedade !== 'box-shadow') continue
        if (arquivo.nome === COMPOSICAO) {
          expect(valor, arquivo.nome).toMatch(ANEL)
          continue
        }
        expect(valor, arquivo.nome).toMatch(/^(none|var\(--sombra-(flutuante|cartao)\))$/)
      }
    }
    for (const arquivo of ts) expect(arquivo.limpo, arquivo.nome).not.toMatch(/\bshadow-|boxShadow|drop-shadow/)
  })

  it('o anel de contorno da composição da Início é só anel: sem deslocamento, sem desfoque, sem elevação', () => {
    const aneis = css
      .filter((arquivo) => arquivo.nome === COMPOSICAO)
      .flatMap((arquivo) => declaracoes(arquivo.limpo).filter((d) => d.propriedade === 'box-shadow'))
    expect(aneis.length).toBeGreaterThanOrEqual(3)
    for (const { valor } of aneis) expect(valor).toMatch(ANEL)
    // Controles negativos: elevação, desfoque, deslocamento, cor solta, duas camadas.
    for (const ruim of [
      '0 2px 4px rgb(43 35 32 / .08)',
      '0 1px 0 0 var(--color-cacau)',
      '0 0 4px 1px var(--color-cacau)',
      '2px 0 0 1px var(--color-cacau)',
      '0 0 0 1px #2B2320',
      '0 0 0 1px rgb(0 0 0 / .1)',
      '0 0 0 1px var(--a), 0 8px 24px var(--b)',
      'var(--sombra-flutuante)',
    ]) {
      expect(ruim).not.toMatch(ANEL)
    }
    for (const bom of ['0 0 0 1px var(--bisel-fio)', 'inset 0 0 0 1.5px var(--color-cacau)', '0 0 0 1px color-mix(in srgb, var(--color-papel) 30%, transparent)']) {
      expect(bom).toMatch(ANEL)
    }
    // Os outros arquivos continuam sob a regra antiga: o anel não passa nela.
    expect('0 0 0 1px var(--bisel-fio)').not.toMatch(/^(none|var\(--sombra-(flutuante|cartao)\))$/)
  })

  it('gradiente só nas declarações de tokens.css; fora dele, só var(--luz-estudio) ou var(--brilho-mel)', () => {
    for (const arquivo of todos) {
      if (arquivo.nome === 'styles/tokens.css') continue
      if (arquivo.nome === COMPOSICAO) {
        expect(arquivo.limpo, arquivo.nome).not.toMatch(/bg-gradient|bg-linear|bg-radial|radial-gradient|conic-gradient|repeating-/)
        const lista = gradientes(arquivo.limpo)
        expect(lista.length, 'a composição tem as divisões das paredes').toBeGreaterThanOrEqual(1)
        for (const g of lista) expect(g, arquivo.nome).toMatch(DIVISAO_NA_COSTURA)
        continue
      }
      expect(arquivo.limpo, arquivo.nome).not.toMatch(/-gradient\(|bg-gradient|bg-linear|bg-radial/)
    }
    for (const arquivo of css) {
      for (const { propriedade, valor } of declaracoes(arquivo.limpo)) {
        if (propriedade !== 'background-image' && propriedade !== 'background') continue
        if (!/var\(--(luz|brilho)/.test(valor)) continue
        expect(valor, arquivo.nome).toMatch(/^var\(--(luz-estudio|brilho-mel)\)$/)
      }
    }
  })

  it('a divisão das paredes da composição é parada dura na --costura; mistura, outra costura e radial/cônico não passam', () => {
    const bons = [
      'linear-gradient(to right, transparent 0 var(--costura), var(--noite) var(--costura))',
      'linear-gradient(to right, var(--dia) 0 var(--costura), var(--noite) var(--costura))',
    ]
    for (const bom of bons) expect(bom).toMatch(DIVISAO_NA_COSTURA)
    const ruins = [
      'linear-gradient(to right, var(--a), var(--b))',
      'linear-gradient(to right, var(--a) 0, var(--b) 100%)',
      'linear-gradient(to right, var(--a) 0 var(--meio), var(--b) var(--meio))',
      'linear-gradient(to right, var(--a) 0 40%, var(--b) 40%)',
      'linear-gradient(to right, #F8F6EB 0 var(--costura), var(--b) var(--costura))',
      'linear-gradient(to right, var(--a) 0 var(--costura), var(--b) var(--costura), var(--c))',
      'radial-gradient(closest-side, var(--a), transparent)',
      'conic-gradient(var(--a), var(--b))',
    ]
    for (const ruim of ruins) expect(ruim).not.toMatch(DIVISAO_NA_COSTURA)
    // O leitor acha a chamada inteira, com parênteses aninhados, e nada mais.
    expect(gradientes('a { background: linear-gradient(to right, var(--a) 0 var(--costura), var(--b) var(--costura)); }')).toEqual([
      'linear-gradient(to right, var(--a) 0 var(--costura), var(--b) var(--costura))',
    ])
    expect(gradientes('.x { color: red; }')).toEqual([])
    expect(gradientes('.x { background: radial-gradient(closest-side, var(--a), transparent); }')).toHaveLength(1)
  })

  it('nenhum filtro nem desfoque', () => {
    for (const arquivo of css) {
      for (const { propriedade } of declaracoes(arquivo.limpo)) {
        expect(propriedade, arquivo.nome).not.toMatch(/^(-webkit-)?(backdrop-)?filter$/)
      }
    }
    for (const arquivo of todos) expect(arquivo.limpo, arquivo.nome).not.toMatch(/\bblur\b|backdrop-|filter:/)
  })

  it('nada de 3D: perspective, rotateX, rotateY e preserve-3d não aparecem no código do site', () => {
    for (const arquivo of todos) {
      expect(arquivo.limpo, arquivo.nome).not.toMatch(/perspective|rotateX|rotateY|rotate-x|rotate-y|preserve-3d|transform-3d/)
    }
  })

  it('nenhuma ilustração desenhada em código: nenhum <svg>, <path> ou <circle> escrito à mão', () => {
    for (const arquivo of ts) expect(arquivo.limpo, arquivo.nome).not.toMatch(/<svg|<path|<circle|<ellipse/)
  })
})

/** O corpo da primeira regra de `texto` cujo seletor é exatamente `seletor`. */
function corpoDaRegra(texto: string, seletor: string): string {
  const regra = [...texto.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) => m[1].trim() === seletor)
  return regra?.[2] ?? ''
}

describe('rodapé: marca no nível titulo-3 e alvos da casca (MAT-49e, FOOTER-1)', () => {
  const site = css.find((f) => f.nome === 'styles/site.css')!.limpo

  it('o nome do rodapé é texto comum no nível titulo-3 (tokens de tamanho e entrelinha), sem cqi, sem transform e sem fator de largura', () => {
    const corpo = corpoDaRegra(site, '.cm-rodape-nome')
    expect(corpo).not.toBe('')
    expect(/font-size:\s*([^;]+);/.exec(corpo)?.[1]).toBe('var(--texto-titulo-3-tamanho)')
    expect(/line-height:\s*([^;]+);/.exec(corpo)?.[1]).toBe('var(--texto-titulo-3-entrelinha)')
    // DS1:RF-05: a família e o peso dos títulos vêm da variável de exibição e dos tokens de peso (ambos 600 hoje).
    expect(corpo).toMatch(/font-family:\s*var\(--fonte-(titulo|exibicao)\)/)
    expect(corpo).toMatch(/font-weight:\s*(600|var\(--peso-(titulo|exibicao)\))/)
    expect(corpo).not.toMatch(/cqi|transform|scale|white-space/)
  })

  it('permite quebrar o nome do rodapé quando a palavra inteira não cabe no quadro', () => {
    const corpo = corpoDaRegra(site, '.cm-rodape-nome')
    expect(corpo).toMatch(/(?:^|;)\s*overflow-wrap:\s*anywhere\s*;/)
  })

  it('nenhuma regra do site.css usa 100cqi, container-type ou o fator da marca (a marca do rodapé não é mais fora da escala)', () => {
    expect(site).not.toMatch(/cqi|container-type|--cm-fator-marca/)
  })

  // DS1:RF-04 (antes: o rodapé não tinha fundo próprio, sob o fio suave de 1 px): o RodapeMapa é uma faixa de cacau.
  it('o rodapé do site é de cacau (fundo pelo token), sem sombra nem gradiente, e o compacto do app não herda o cacau', () => {
    const regras = [...site.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => /\.cm-rodape/.test(m[1]))
    expect(regras.length).toBeGreaterThan(0)
    const pintaCacau = regras.filter(
      ([, seletor, corpo]) =>
        /(^|[\s,])\.cm-rodape(\s*(,|$)|:not\(\.cm-rodape-compacto\))/.test(seletor.trim()) &&
        /background(-color)?:\s*var\(--(color|cor)-(cacau|noite)\)/.test(corpo),
    )
    expect(pintaCacau.length, 'regra do rodapé com fundo de cacau').toBeGreaterThan(0)
    for (const [, seletor, corpo] of regras) {
      expect(corpo, seletor.trim()).not.toMatch(/box-shadow:\s*(?!none)|gradient\(/)
    }
    // O compacto: ou a regra de cacau o exclui (:not), ou ele tem a regra própria que devolve o fundo.
    const excluiCompacto = pintaCacau.every(([, seletor]) => /:not\(\.cm-rodape-compacto\)/.test(seletor))
    const devolveFundo = regras.some(
      ([, seletor, corpo]) => /\.cm-rodape-compacto/.test(seletor) && /background(-color)?:\s*(transparent|none|var\(--cor-fundo\)|var\(--color-papel\))/.test(corpo),
    )
    expect(excluiCompacto || devolveFundo).toBe(true)
  })

  it('os tokens do painel de mel do rodapé saíram do tema, do dia e da madrugada', () => {
    expect(temaCss).not.toMatch(/--cor-painel-rodape|--cor-sobre-painel-rodape/)
    expect(site).not.toMatch(/--cor-painel-rodape|--cor-sobre-painel-rodape/)
  })

  it('.alvo-toque é só um piso de especificidade zero (:where), sem !important, para não vencer o .cm-botao de 56 px', () => {
    const index = semComentariosCss(indexCss)
    const regra = [...index.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) => /alvo-toque/.test(m[1]) && /min-height:\s*44px/.test(m[2]))
    expect(regra, 'regra do piso de 44 px').toBeDefined()
    expect(regra![1]).toMatch(/:where\(\s*\.alvo-toque\s*\)/)
    expect(regra![1]).not.toMatch(/(^|[\s,])\.alvo-toque/)
    expect(regra![2]).not.toMatch(/!important/)
  })

  // O ícone Menu do Lucide (viewBox 24, 26 px, traço 2, pontas redondas) pinta o traço 3,25 px ANTES da borda
  // direita da caixa do SVG: (24 - 21) / 24 * 26. A caixa fica 11 px para dentro do botão de 48 px (15 px no de
  // 56 px da madrugada). O recuo leva a borda do TRAÇO, e não a da caixa, à borda do conteúdo.
  const TRACO_FORA_DA_CAIXA = 3.25

  it('o recuo do botão do menu leva a borda do traço do ícone (e não a da caixa do SVG) à borda do conteúdo: -(11 + 3,25) px', () => {
    const corpo = corpoDaRegra(site, '.sb-cab-menu')
    expect(corpo).toMatch(/width:\s*48px/)
    expect(corpo).toMatch(/height:\s*48px/)
    expect(Number.parseFloat(/margin-right:\s*(-?[\d.]+)px/.exec(corpo)?.[1] ?? 'NaN')).toBeCloseTo(-(11 + TRACO_FORA_DA_CAIXA), 5)
    expect(corpo).toMatch(/margin-right:\s*-14\.25px/)
  })

  it('na madrugada (botão de 56 px) o recuo do menu é -(15 + 3,25) px, com os 56 px de alvo preservados', () => {
    const campo = css.find((f) => f.nome === 'styles/campo.css')!.limpo
    const corpo = corpoDaRegra(campo, ":root[data-tema='madrugada'] .sb-cab-menu")
    expect(corpo).toMatch(/margin-right:\s*-18\.25px/)
    expect(campo).toMatch(/:root\[data-tema='madrugada'\] \.sb-cab-menu,[^{}]*\{[^{}]*min-width:\s*56px[^{}]*min-height:\s*56px/)
  })

  it('o rodapé compacto tem regra própria', () => {
    expect(site).toMatch(/\.cm-rodape-compacto\s*\{/)
  })
})

describe('movimento reduzido (DESIGN.md 5)', () => {
  it('o CSS desliga animações e transições com prefers-reduced-motion', () => {
    expect(indexCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{\s*animation: none !important;\s*transition: none !important;/,
    )
  })

  it('a folha compartilhada desliga os pseudoelementos das View Transitions só com movimento reduzido', () => {
    expect(lerTexto('main.tsx')).toMatch(/import ['"]\.\/index\.css['"]/)
    const pseudoelementos = [
      '::view-transition',
      '::view-transition-group(*)',
      '::view-transition-image-pair(*)',
      '::view-transition-old(*)',
      '::view-transition-new(*)',
    ]
    const folha = semComentariosCss(indexCss)
    const reduzido = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)^\}/m
    const regras = reduzido.exec(folha)?.[1] ?? ''
    for (const seletor of pseudoelementos) {
      const regra = [...regras.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, seletores]) =>
        seletores.split(',').some((parte) => parte.trim() === seletor),
      )
      expect(regra?.[2] ?? '', seletor).toMatch(/animation:\s*none\s*!important;/)
    }
    expect(folha.replace(reduzido, '')).not.toMatch(/::view-transition[^{}]*\{[^{}]*animation:\s*none/)
  })

  it('o letreiro dos selos dura 60 s e, com movimento reduzido, para e esconde a cópia e o botão', () => {
    const campo = css.find((f) => f.nome === 'styles/campo.css')!.limpo
    expect(campo).toMatch(/\.cm-selos-trilho\s*\{[^}]*animation:\s*cm-letreiro 60s linear infinite/)
    const reduzido = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n {2}\}/.exec(campo)?.[1] ?? ''
    expect(reduzido).toMatch(/\.cm-selos-trilho\s*\{[^}]*animation:\s*none/)
    expect(reduzido).toMatch(/\.cm-selos-lista\[aria-hidden='true'\]/)
    expect(reduzido).toMatch(/\.cm-selos-pausa/)
  })
})
