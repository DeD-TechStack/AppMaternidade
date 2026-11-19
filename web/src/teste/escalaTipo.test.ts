import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// TYPE-1: a escala de tipo real nas páginas de conteúdo. O h1 sobe para `exibicao` (80/84 em 1440, 44/48 em 390),
// o h2 de seção usa `titulo-1` e a ênfase em itálico é uma só por página. Este arquivo confere o contrato nos
// arquivos-fonte (DESIGN.md, tema gerado, CSS e componentes); a medida no Chrome está em escalaTipo.geometria.test.tsx.
// O Vitest roda em web/; o front matter vem do mesmo script do `npm run tema`. Todo texto lido tem o fim de linha
// normalizado (CRLF e LF dão o mesmo resultado).
const pastaWeb = process.cwd()
const lerTexto = (relativo: string) => readFileSync(join(pastaWeb, relativo), 'utf8').replaceAll('\r\n', '\n')
const gerador = (...argumentos: string[]) =>
  execFileSync(process.execPath, [join(pastaWeb, 'scripts', 'gerar-tema.mjs'), ...argumentos], { cwd: pastaWeb, encoding: 'utf8' })

interface Tipografia {
  fontSize: string
  lineHeight: string
}
const front = JSON.parse(gerador('--json')) as { typography: Record<string, Tipografia> }
const px = (valor: string) => Number.parseFloat(valor.replace('px', ''))

/** O corpo de toda regra que começa numa linha pelo seletor exato (um item no meio de uma lista com vírgula não conta). */
function corposDa(css: string, seletor: string): string[] {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regra = new RegExp(`^[ \\t]*${escapado}[ \\t]*\\{([^}]*)\\}`, 'gm')
  return [...css.matchAll(regra)].map((achado) => achado[1])
}
const umCorpo = (css: string, seletor: string): string => {
  const corpos = corposDa(css, seletor)
  expect(corpos.length, `regra "${seletor}" não encontrada`).toBeGreaterThan(0)
  return corpos.join('\n')
}

// As variáveis do tema gerado no BASE (56c2121) que NÃO mudam: tudo fora de `exibicao`.
const LINHAS_DO_BASE_SEM_EXIBICAO = [
  '--espaco-junto: clamp(8px, calc(8px + (100vw - 390px) * 4 / 1050), 12px);',
  '--espaco-pilha: 16px;',
  '--espaco-grupo: clamp(24px, calc(24px + (100vw - 390px) * 8 / 1050), 32px);',
  '--espaco-bloco: clamp(24px, calc(24px + (100vw - 390px) * 24 / 1050), 48px);',
  '--espaco-midia: clamp(32px, calc(32px + (100vw - 390px) * 32 / 1050), 64px);',
  '--espaco-secao: clamp(48px, calc(48px + (100vw - 390px) * 32 / 1050), 80px);',
  '--espaco-secao-ampla: clamp(72px, calc(72px + (100vw - 390px) * 56 / 1050), 128px);',
  '--espaco-painel: clamp(24px, calc(24px + (100vw - 390px) * 24 / 1050), 48px);',
  '--quadro-largura: 1200px;',
  '--quadro-calha: clamp(20px, calc(20px + (100vw - 390px) * 12 / 1050), 32px);',
  '--medio: 880px;',
  '--leitura: 640px;',
  '--texto-titulo-1-tamanho: clamp(2.125rem, calc(2.125rem + (100vw - 390px) * 14 / 1050), 3rem);',
  '--texto-titulo-1-entrelinha: clamp(2.5rem, calc(2.5rem + (100vw - 390px) * 14 / 1050), 3.375rem);',
  '--texto-titulo-2-tamanho: clamp(1.75rem, calc(1.75rem + (100vw - 390px) * 8 / 1050), 2.25rem);',
  '--texto-titulo-2-entrelinha: clamp(2.125rem, calc(2.125rem + (100vw - 390px) * 8 / 1050), 2.625rem);',
  '--texto-titulo-3-tamanho: clamp(1.375rem, calc(1.375rem + (100vw - 390px) * 6 / 1050), 1.75rem);',
  '--texto-titulo-3-entrelinha: clamp(1.75rem, calc(1.75rem + (100vw - 390px) * 6 / 1050), 2.125rem);',
  '--texto-titulo-4-tamanho: clamp(1.1875rem, calc(1.1875rem + (100vw - 390px) * 3 / 1050), 1.375rem);',
  '--texto-titulo-4-entrelinha: clamp(1.5625rem, calc(1.5625rem + (100vw - 390px) * 3 / 1050), 1.75rem);',
  '--texto-abertura-tamanho: clamp(1.1875rem, calc(1.1875rem + (100vw - 390px) * 3 / 1050), 1.375rem);',
  '--texto-abertura-entrelinha: clamp(1.75rem, calc(1.75rem + (100vw - 390px) * 4 / 1050), 2rem);',
  '--texto-corpo-tamanho: clamp(1.0625rem, calc(1.0625rem + (100vw - 390px) * 1 / 1050), 1.125rem);',
  '--texto-corpo-entrelinha: clamp(1.625rem, calc(1.625rem + (100vw - 390px) * 2 / 1050), 1.75rem);',
  '--texto-pequeno-tamanho: 0.9375rem;',
  '--texto-pequeno-entrelinha: 1.375rem;',
  '--texto-sobretitulo-tamanho: 0.9375rem;',
  '--texto-sobretitulo-entrelinha: 1.25rem;',
]

describe('TYPE-1: a escala de tipo (arquivos-fonte)', () => {
  it('tokens', () => {
    const t = front.typography
    expect([t['exibicao-390'].fontSize, t['exibicao-390'].lineHeight]).toEqual(['44px', '48px'])
    expect([t['exibicao-1440'].fontSize, t['exibicao-1440'].lineHeight]).toEqual(['80px', '84px'])
    expect(px(t['exibicao-1440'].fontSize) / px(t['corpo-1440'].fontSize)).toBeGreaterThanOrEqual(4.0)
    expect(px(t['exibicao-390'].fontSize) / px(t['corpo-390'].fontSize)).toBeGreaterThanOrEqual(2.4)
    expect(px(t['titulo-1-1440'].fontSize)).toBeGreaterThanOrEqual(40)

    const gerado = lerTexto('src/styles/harmonia.gerado.css')
    expect(gerado).toMatch(/--texto-exibicao-tamanho: clamp\(2\.75rem, [^;]*, 5rem\);/)
    expect(gerado).toMatch(/--texto-exibicao-entrelinha: clamp\(3rem, [^;]*, 5\.25rem\);/)
    for (const linha of LINHAS_DO_BASE_SEM_EXIBICAO) {
      expect(gerado, `a variável do BASE mudou ou sumiu: ${linha}`).toContain(`  ${linha}\n`)
    }
  })

  it('regras', () => {
    const site = lerTexto('src/styles/site.css')

    const exibicao = umCorpo(site, '.cm-h1.cm-exibicao')
    expect(exibicao).toMatch(/font-size:\s*var\(--texto-exibicao-tamanho\)/)
    expect(exibicao).toMatch(/line-height:\s*var\(--texto-exibicao-entrelinha\)/)
    expect(exibicao).not.toMatch(/\d(px|rem|em)\b/)

    const h1 = umCorpo(site, '.cm-h1')
    expect(h1).toMatch(/font-size:\s*var\(--texto-titulo-1-tamanho\)/)
    expect(h1).toMatch(/line-height:\s*var\(--texto-titulo-1-entrelinha\)/)

    const h2 = umCorpo(site, '.cm-h2')
    expect(h2).toMatch(/font-size:\s*var\(--texto-titulo-1-tamanho\)/)
    expect(h2).toMatch(/line-height:\s*var\(--texto-titulo-1-entrelinha\)/)

    expect(umCorpo(site, '.cm-segunda-linha')).not.toMatch(/font-style:\s*italic/)
    // DS1:RF-06 (§5.3): nenhum itálico público. A linha vira `font-style: normal` ou some, e a regra pode sumir junto.
    expect(corposDa(site, 'h1 .cm-segunda-linha').join('\n')).not.toMatch(/italic/)

    const inicio = lerTexto('src/componentes/inicio/inicio.css')
    expect(umCorpo(inicio, '.in-pagina .cm-segunda-linha')).not.toMatch(/italic/)

    const destaque = lerTexto('src/componentes/publicas-destaque/publicas-destaque.css')
    expect(umCorpo(destaque, '.pd-nota-texto')).not.toMatch(/italic/)
    expect(umCorpo(destaque, '.pd-destaque')).not.toMatch(/italic/)

    const h1Com = /<h1\b[^>]*className="[^"]*(?<![\w-])cm-exibicao(?![\w-])/
    for (const arquivo of [
      'src/componentes/inicio/HeroiInicio.tsx',
      'src/componentes/publicas-texto/PaginaDeLeitura.tsx',
      'src/paginas/NaoEncontrada.tsx',
    ]) {
      expect(lerTexto(arquivo), `${arquivo}: o h1 sem cm-exibicao`).toMatch(h1Com)
    }
  })
})
