// node --test scripts/gerar-tema.test.mjs (a partir de web/). O Vitest não roda esta pasta (vite.config.ts).
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { before, describe, it } from 'node:test'
import { compile } from 'tailwindcss'
import {
  CAMINHO_DESIGN,
  CAMINHO_SAIDA,
  NIVEIS,
  PAPEIS,
  fluido,
  gerarTema,
  lerFrontMatter,
  lerYaml,
  naReta,
  quadroFluido,
} from './gerar-tema.mjs'

/** O que o Windows entrega (CRLF) e o que o Linux entrega (LF) são o mesmo DESIGN.md: todo fixture parte do texto em LF. */
const sem = (texto) => texto.replaceAll('\r\n', '\n')
const comCrlf = (texto) => sem(texto).replaceAll('\n', '\r\n')
const designBruto = readFileSync(CAMINHO_DESIGN, 'utf8')
const design = sem(designBruto)

/** Avalia `clamp(piso, calc(base + (100vw - 390px) * d / 1050), teto)` num viewport, em px (1 rem = 16 px). */
function avaliar(css, viewport) {
  const px = (texto) => (texto.endsWith('rem') ? Number.parseFloat(texto) * 16 : Number.parseFloat(texto))
  const clamp = /^clamp\(([^,]+), calc\(([^ ]+) \+ \(100vw - 390px\) \* ([^ ]+) \/ 1050\), ([^)]+)\)$/.exec(css)
  if (!clamp) return px(css)
  const [, piso, base, delta, teto] = clamp
  return Math.min(px(teto), Math.max(px(piso), px(base) + ((viewport - 390) * Number(delta)) / 1050))
}

/** Igual a menos do arredondamento de 6 casas do gerador (em rem, × 16). */
const perto = (atual, esperado, mensagem) => assert.ok(Math.abs(atual - esperado) < 1e-4, `${mensagem ?? ''}: ${atual} ≠ ${esperado}`)

/** Avalia `clamp(piso, calc(base + (100vw - 1440px) * d / 1120), teto)` (o quadro) num viewport, em px. */
function avaliarQuadro(css, viewport) {
  const clamp = /^clamp\(([\d.]+)px, calc\(([\d.]+)px \+ \(100vw - 1440px\) \* ([\d.]+) \/ 1120\), ([\d.]+)px\)$/.exec(css)
  if (!clamp) return Number.parseFloat(css)
  const [, piso, base, delta, teto] = clamp.map(Number)
  return Math.min(teto, Math.max(piso, base + ((viewport - 1440) * delta) / 1120))
}

describe('lerYaml', () => {
  it('lê mapas aninhados, texto entre aspas, números e texto simples', () => {
    const lido = lerYaml(['a:', '  b: "#F8F6EB"', '  c: 40px', '  d: 600', '  e: texto com: dois pontos', '# comentário', '', 'f: x'].join('\n'))
    assert.deepEqual(lido, { a: { b: '#F8F6EB', c: '40px', d: 600, e: 'texto com: dois pontos' }, f: 'x' })
  })

  it('recusa tabulação, chave repetida e linha fora do subconjunto', () => {
    assert.throws(() => lerYaml('a:\n\tb: 1'), /tabulação/)
    assert.throws(() => lerYaml('a: 1\na: 2'), /repetida/)
    assert.throws(() => lerYaml('- item'), /fora do subconjunto/)
  })

  it('lê o front matter do DESIGN.md com CRLF igual ao com LF', () => {
    assert.ok(!design.includes('\r'), 'o fixture em LF não pode ter CR')
    assert.ok(comCrlf(design).includes('\r\n') && !comCrlf(design).includes('\r\r'), 'o fixture em CRLF tem só CRLF')
    assert.deepEqual(lerFrontMatter(comCrlf(design)), lerFrontMatter(design))
    assert.deepEqual(lerFrontMatter(designBruto), lerFrontMatter(design))
  })
})

describe('fluido', () => {
  it('é a reta de 390 a 1440 continuada até 320 e até 1920, e constante fora delas (px)', () => {
    const css = fluido(8, 12, 'px')
    assert.equal(css, 'clamp(7.733333px, calc(8px + (100vw - 390px) * 4 / 1050), 13.828571px)')
    perto(avaliar(css, 300), 7.733333, 'abaixo de 320 fica parado no valor de 320')
    perto(avaliar(css, 320), 8 - 4 / 15, 'em 320, a reta continuada')
    assert.equal(avaliar(css, 390), 8)
    assert.equal(avaliar(css, 915), 10)
    assert.equal(avaliar(css, 1440), 12)
    perto(avaliar(css, 1920), 12 + (4 * 480) / 1050, 'em 1920, a reta continuada')
    perto(avaliar(css, 2560), 13.828571, 'acima de 1920 fica parado no valor de 1920')
  })

  it('naReta passa pelos dois valores do DESIGN.md e dá os de 320 e 1920', () => {
    assert.equal(naReta(44, 80, 390), 44)
    assert.equal(naReta(44, 80, 1440), 80)
    perto(naReta(44, 80, 320), 41.6, '320')
    perto(naReta(44, 80, 1920), 80 + (36 * 480) / 1050, '1920')
  })

  it('em rem, com a fonte a 100%, as pontas de 390 e 1440 batem exato', () => {
    const css = fluido(17, 18, 'rem')
    assert.equal(css, 'clamp(1.058333rem, calc(1.0625rem + (100vw - 390px) * 1 / 1050), 1.153571rem)')
    assert.equal(avaliar(css, 390), 17)
    assert.equal(avaliar(css, 1440), 18)
    assert.equal(avaliar(css, 915), 17.5)
  })

  it('o mínimo sobe o piso e não mexe no teto nem na reta', () => {
    const css = fluido(17, 18, 'rem', 17)
    assert.equal(css, 'clamp(1.0625rem, calc(1.0625rem + (100vw - 390px) * 1 / 1050), 1.153571rem)')
    assert.equal(avaliar(css, 320), 17)
    assert.equal(avaliar(css, 390), 17)
    assert.equal(avaliar(css, 1440), 18)
    perto(avaliar(css, 1920), 18 + 480 / 1050, '1920')
  })

  it('valor igual nas duas pontas vira constante, sem clamp', () => {
    assert.equal(fluido(16, 16, 'px'), '16px')
    assert.equal(fluido(15, 15, 'rem'), '0.9375rem')
  })

  it('valor que diminui mantém piso e teto na ordem certa', () => {
    assert.equal(fluido(12, 8, 'px'), 'clamp(6.171429px, calc(12px + (100vw - 390px) * -4 / 1050), 12.266667px)')
  })
})

describe('quadroFluido', () => {
  const css = quadroFluido(1200, 1600)

  it('é 1200 até 1440 e uma reta até 1600 em 2560', () => {
    assert.equal(css, 'clamp(1200px, calc(1200px + (100vw - 1440px) * 400 / 1120), 1600px)')
  })

  it('não muda o quadro em 320, 390 e 1440 (o min() com a janela continua mandando abaixo dele)', () => {
    assert.equal(avaliarQuadro(css, 320), 1200)
    assert.equal(avaliarQuadro(css, 390), 1200)
    assert.equal(avaliarQuadro(css, 1440), 1200)
  })

  it('cresce acima de 1440 e para em 2560', () => {
    perto(avaliarQuadro(css, 1920), 1200 + (400 * 480) / 1120, '1920')
    assert.equal(avaliarQuadro(css, 2560), 1600)
    assert.equal(avaliarQuadro(css, 3840), 1600)
  })

  it('largura igual nas duas pontas vira constante', () => {
    assert.equal(quadroFluido(1200, 1200), '1200px')
  })
})

describe('gerarTema', () => {
  const css = gerarTema(design)

  it('é determinístico: duas gerações dão os mesmos bytes', () => {
    assert.equal(gerarTema(design), css)
    assert.equal(gerarTema(comCrlf(design)), css)
    assert.equal(gerarTema(designBruto), css, 'o arquivo do checkout (CRLF ou LF) gera os mesmos bytes')
    assert.ok(!css.includes('\r'), 'a saída é sempre LF')
  })

  it('traz uma variável por papel de espaço, por nível de tipo e as do quadro', () => {
    for (const papel of PAPEIS) assert.match(css, new RegExp(`^  --espaco-${papel}: `, 'm'), papel)
    for (const nivel of NIVEIS) {
      assert.match(css, new RegExp(`^  --texto-${nivel}-tamanho: `, 'm'), nivel)
      assert.match(css, new RegExp(`^  --texto-${nivel}-entrelinha: `, 'm'), nivel)
    }
    assert.match(css, /^ {2}--quadro-largura: clamp\(1200px, calc\(1200px \+ \(100vw - 1440px\) \* 400 \/ 1120\), 1600px\);$/m)
    assert.match(css, /^ {2}--quadro-calha: clamp\(19\.2px, calc\(20px \+ \(100vw - 390px\) \* 12 \/ 1050\), 37\.485714px\);$/m)
    assert.match(css, /^ {2}--medio: 880px;$/m)
    assert.match(css, /^ {2}--leitura: 640px;$/m)
  })

  it('cada variável vale o valor de 390 em 390 e o de 1440 em 1440, como no DESIGN.md', () => {
    const front = lerFrontMatter(design)
    const px = (v) => (String(v).endsWith('rem') ? Number.parseFloat(v) * 16 : Number.parseFloat(v))
    for (const papel of PAPEIS) {
      const valor = new RegExp(`^  --espaco-${papel}: (.+);$`, 'm').exec(css)[1]
      assert.equal(avaliar(valor, 390), px(front.spacing[`${papel}-390`]), `${papel} em 390`)
      assert.equal(avaliar(valor, 1440), px(front.spacing[`${papel}-1440`]), `${papel} em 1440`)
    }
    for (const nivel of NIVEIS) {
      for (const [variavel, campo] of [['tamanho', 'fontSize'], ['entrelinha', 'lineHeight']]) {
        const valor = new RegExp(`^  --texto-${nivel}-${variavel}: (.+);$`, 'm').exec(css)[1]
        assert.equal(avaliar(valor, 390), px(front.typography[`${nivel}-390`][campo]), `${nivel} ${variavel} em 390`)
        assert.equal(avaliar(valor, 1440), px(front.typography[`${nivel}-1440`][campo]), `${nivel} ${variavel} em 1440`)
      }
    }
  })

  it('em 320 e em 1920 cada variável vale a reta continuada; o tipo não desce abaixo do corpo de 390', () => {
    const front = lerFrontMatter(design)
    const px = (v) => (String(v).endsWith('rem') ? Number.parseFloat(v) * 16 : Number.parseFloat(v))
    const pisoDeLeitura = px(front.typography['corpo-390'].fontSize)
    for (const papel of PAPEIS) {
      const valor = new RegExp(`^  --espaco-${papel}: (.+);$`, 'm').exec(css)[1]
      const a = px(front.spacing[`${papel}-390`])
      const b = px(front.spacing[`${papel}-1440`])
      perto(avaliar(valor, 320), naReta(a, b, 320), `${papel} em 320`)
      perto(avaliar(valor, 1920), naReta(a, b, 1920), `${papel} em 1920`)
    }
    for (const nivel of NIVEIS) {
      const tamanho = new RegExp(`^  --texto-${nivel}-tamanho: (.+);$`, 'm').exec(css)[1]
      const a = px(front.typography[`${nivel}-390`].fontSize)
      const b = px(front.typography[`${nivel}-1440`].fontSize)
      const esperadoEm320 = naReta(a, b, 320) < Math.min(a, pisoDeLeitura) ? a : naReta(a, b, 320)
      perto(avaliar(tamanho, 320), esperadoEm320, `${nivel} tamanho em 320`)
      perto(avaliar(tamanho, 1920), naReta(a, b, 1920), `${nivel} tamanho em 1920`)
      assert.ok(avaliar(tamanho, 320) >= Math.min(a, pisoDeLeitura), `${nivel} em 320 abaixo do piso de leitura`)
    }
  })

  it('números das âncoras: exibição 41,6 px em 320, corpo parado em 17/26 abaixo de 390, calha 19,2 em 320', () => {
    const valor = (nome) => new RegExp(`^  --${nome}: (.+);$`, 'm').exec(css)[1]
    perto(avaliar(valor('texto-exibicao-tamanho'), 320), 41.6, 'exibição em 320')
    perto(avaliar(valor('texto-exibicao-tamanho'), 1920), 80 + (36 * 480) / 1050, 'exibição em 1920')
    assert.equal(avaliar(valor('texto-corpo-tamanho'), 320), 17)
    assert.equal(avaliar(valor('texto-corpo-entrelinha'), 320), 26)
    perto(avaliar(valor('texto-corpo-tamanho'), 1920), 18 + 480 / 1050, 'corpo em 1920')
    assert.equal(avaliar(valor('texto-pequeno-tamanho'), 320), 15)
    perto(avaliar(valor('quadro-calha'), 320), 19.2, 'calha em 320')
    perto(avaliar(valor('quadro-calha'), 1920), 32 + (12 * 480) / 1050, 'calha em 1920')
  })

  it('o quadro vale 1200 em 390 e em 1440 e cresce em 1920 (quadro-largura-2560 do DESIGN.md)', () => {
    const quadro = /^ {2}--quadro-largura: (.+);$/m.exec(css)[1]
    assert.equal(avaliarQuadro(quadro, 390), 1200)
    assert.equal(avaliarQuadro(quadro, 1440), 1200)
    perto(avaliarQuadro(quadro, 1920), 1200 + (400 * 480) / 1120, 'quadro em 1920')
    assert.equal(avaliarQuadro(quadro, 2560), 1600)
  })

  it('o arquivo gravado é o que uma geração nova produz (deriva)', () => {
    assert.equal(sem(readFileSync(CAMINHO_SAIDA, 'utf8')), css)
  })

  it('falha com a mensagem do token que falta', () => {
    assert.throws(() => gerarTema(design.replace('  pilha-390: 16px\n', '')), /falta spacing\.pilha-390/)
    assert.throws(() => gerarTema(design.replace('lineHeight: 48px', 'lineHeight: grande')), /typography\.exibicao-390\.lineHeight precisa ser uma dimensão/)
  })

  it('não toca no que já existe: nenhum nome de cor, raio, fonte, sombra ou variável de página', () => {
    for (const linha of css.split('\n').filter((l) => /^ {2}--/.test(l))) {
      assert.match(linha, /^ {2}--(espaco-|texto-|quadro-|medio:|leitura:|spacing-|text-|container-)/, linha)
    }
  })
})

describe('utilitários de espaço do Tailwind (todo papel com o mesmo prefixo `esp-`)', () => {
  /** Os nomes finais das classes, os mesmos que a seção Layout do DESIGN.md lista para o H-3. */
  const PREFIXO = 'esp'
  const SUFIXOS = [...PAPEIS, 'quadro-calha'].map((papel) => ({ papel, sufixo: `${PREFIXO}-${papel}` }))
  /** Família de utilitário → declaração que ela precisa gerar com a variável do papel. */
  const FAMILIAS = {
    p: 'padding',
    px: 'padding-inline',
    py: 'padding-block',
    pt: 'padding-top',
    pb: 'padding-bottom',
    m: 'margin',
    gap: 'gap',
  }
  const ESCAPA = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  /** A variável de espaço que o papel liga (o quadro-calha tem a dele). */
  const variavel = (papel) => (papel === 'quadro-calha' ? '--quadro-calha' : `--espaco-${papel}`)

  /** Todos os arquivos de texto de web/src com uma das extensões do site, menos o tema gerado. */
  function fontes() {
    const pasta = join(CAMINHO_DESIGN, '..', 'src')
    return readdirSync(pasta, { recursive: true, encoding: 'utf8' })
      .filter((caminho) => /\.(tsx?|css)$/.test(caminho) && !caminho.endsWith('harmonia.gerado.css'))
      .map((caminho) => ({ caminho, texto: readFileSync(join(pasta, caminho), 'utf8') }))
  }

  let compilado = ''
  before(async () => {
    // O Tailwind instalado (o mesmo do Vite), sem dependência nova: só os utilitários e o tema gerado.
    const candidatas = []
    for (const { sufixo, papel } of SUFIXOS) {
      for (const familia of [...Object.keys(FAMILIAS), 'space-x', 'space-y', 'gap-x', 'gap-y']) {
        candidatas.push(`${familia}-${sufixo}`, `${familia}-${papel}`)
      }
    }
    for (const nivel of NIVEIS) candidatas.push(`text-${nivel}`)
    candidatas.push('max-w-medio', 'max-w-leitura', 'max-w-quadro')
    const compilador = await compile(`@tailwind utilities;\n${gerarTema(design)}`)
    compilado = compilador.build(candidatas)
  })

  it('gera a classe de cada família para os 8 papéis e para a calha do quadro', () => {
    for (const { papel, sufixo } of SUFIXOS) {
      for (const [familia, propriedade] of Object.entries(FAMILIAS)) {
        const regra = new RegExp(`\\.${ESCAPA(`${familia}-${sufixo}`)}\\s*\\{[^}]*?\\b${propriedade}:\\s*var\\(${variavel(papel)}\\)`)
        assert.ok(regra.test(compilado), `faltou ${familia}-${sufixo} → ${propriedade}: var(${variavel(papel)})`)
      }
      for (const familia of ['space-x', 'space-y', 'gap-x', 'gap-y']) {
        assert.ok(new RegExp(`\\.${ESCAPA(`${familia}-${sufixo}`)}(?![\\w-])`).test(compilado), `faltou ${familia}-${sufixo}`)
      }
    }
  })

  it('nenhum nome sem prefixo é gerado: `p-secao`, `pt-junto`, `gap-painel`... ficam livres para as classes do site', () => {
    for (const { papel } of SUFIXOS) {
      for (const familia of [...Object.keys(FAMILIAS), 'space-x', 'space-y', 'gap-x', 'gap-y']) {
        assert.ok(!new RegExp(`\\.${ESCAPA(`${familia}-${papel}`)}(?![\\w-])`).test(compilado), `${familia}-${papel} não pode ser gerado`)
      }
    }
    assert.doesNotMatch(css(), /^ {2}--spacing-(?!esp-)/m, 'todo apelido de espaço leva o prefixo esp-')
  })

  it('os utilitários de tipo e de largura continuam gerados', () => {
    for (const nivel of NIVEIS) {
      assert.ok(new RegExp(`\\.text-${nivel}\\s*\\{[^}]*font-size:\\s*var\\(--texto-${nivel}-tamanho\\)`).test(compilado), `text-${nivel}`)
      assert.ok(new RegExp(`\\.text-${nivel}\\s*\\{[^}]*line-height:[^;]*var\\(--texto-${nivel}-entrelinha\\)`).test(compilado), `text-${nivel} entrelinha`)
    }
    for (const [classe, valor] of [['medio', '--medio'], ['leitura', '--leitura'], ['quadro', '--quadro-largura']]) {
      assert.ok(new RegExp(`\\.max-w-${classe}\\s*\\{[^}]*max-width:\\s*var\\(${valor}\\)`).test(compilado), `max-w-${classe}`)
    }
  })

  it('nenhuma classe escrita à mão no CSS do site tem o nome de um utilitário `<família>-esp-*`', () => {
    const familias = '(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y)'
    const colisao = new RegExp(`\\.${familias}-${PREFIXO}-`)
    for (const { caminho, texto } of fontes().filter(({ caminho }) => caminho.endsWith('.css'))) {
      assert.doesNotMatch(texto, colisao, `${caminho} define uma classe que o Tailwind também geraria`)
    }
  })

  it('as classes antigas das páginas (`pt-junto`, `pt-secao`, `pt-painel`) seguem só no CSS do site', () => {
    const css = fontes()
      .filter(({ caminho }) => caminho.endsWith('.css'))
      .map(({ texto }) => texto)
      .join('\n')
    for (const classe of ['pt-junto', 'pt-secao', 'pt-painel']) assert.match(css, new RegExp(`\\.${classe}(?![\\w-])`), classe)
  })

  function css() {
    return gerarTema(design)
  }
})
