import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOGO } from './catalogo.ts'

// Os números do movimento moram em dois lugares (SPEC_MOVIMENTO 2): o catálogo (JS) e as variáveis
// `--mov-*` e `--curva-*` de web/src/styles/tokens.css (CSS). Este teste é o elo: cada variável tem de
// ter o valor do registro do catálogo, e nenhuma variável de movimento pode existir sem registro.

type Curva = (typeof CATALOGO)['M4']['curva']

const ms = (n: number) => `${n}ms`
const px = (n: number) => `${n}px`
const bezier = (c: Curva | readonly number[]) => `cubic-bezier(${(c as readonly number[]).join(', ')})`

/** O valor que cada variável CSS precisa ter, lido do catálogo. */
function esperado(): Record<string, string> {
  const { M2, M4, M8, M14, M15, M16, M17, M18, M19, M20 } = CATALOGO
  return {
    '--mov-toque': ms(M20.duracaoMs),
    '--mov-escala-toque': String(M20.escala.de),
    '--mov-feedback': ms(M15.duracaoMs),
    '--mov-pequeno': ms(M16.duracaoMs),
    '--mov-pequeno-saida': ms(M16.duracaoSaidaMs),
    '--mov-medio': ms(M17.duracaoMs),
    '--mov-rota': ms(M18.duracaoMs),
    '--mov-revela': ms(M4.duracaoMs),
    '--mov-cena': ms(M8.duracaoMs),
    '--mov-cortina': ms(M2.duracaoMs),
    '--mov-cortina-escalona': ms(M2.escalonamentoMs),
    '--mov-cortina-atraso': ms(M2.atrasoCamadaMs),
    '--mov-laco': ms(M14.duracaoMs),
    '--mov-esqueleto': ms(M19.duracaoMs),
    '--mov-dist-popover': px(M16.deslocamentoPx),
    '--mov-dist-revela': px(M4.deslocamentoPx),
    '--mov-escalona': ms(M4.escalonamentoMs),
    '--mov-escalona-max': String(M4.maxItensEscalonados),
    '--mov-opacidade-revela': String(M4.opacidadeDe),
    '--curva-padrao': bezier(M15.curva),
    '--curva-saida': bezier(M17.curva),
    '--curva-revela': bezier(M4.curva),
    '--curva-expo': bezier(M2.curva),
  }
}

/** As variáveis `--mov-*` e `--curva-*` declaradas num texto CSS (independe de CRLF ou LF). */
function declaradas(css: string): Map<string, string[]> {
  const mapa = new Map<string, string[]>()
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const [, nome, valor] of semComentarios.matchAll(/(--(?:mov|curva)-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const lista = mapa.get(nome) ?? []
    lista.push(valor.replace(/\s+/g, ' ').trim())
    mapa.set(nome, lista)
  }
  return mapa
}

/** Toda diferença entre o CSS e o catálogo; vazio quando os dois concordam. */
function divergencias(css: string): string[] {
  const achadas = declaradas(css)
  const alvo = esperado()
  const saida: string[] = []
  for (const [nome, valor] of Object.entries(alvo)) {
    const lidos = achadas.get(nome)
    if (!lidos) saida.push(`${nome}: falta no tokens.css (catálogo: ${valor})`)
    else if (lidos.length > 1) saida.push(`${nome}: declarada ${lidos.length} vezes`)
    else if (lidos[0] !== valor) saida.push(`${nome}: tokens.css ${lidos[0]}, catálogo ${valor}`)
  }
  for (const nome of achadas.keys()) {
    if (!(nome in alvo)) saida.push(`${nome}: no tokens.css sem registro no catálogo`)
  }
  return saida
}

const CSS = readFileSync(resolve(import.meta.dirname, '../styles/tokens.css'), 'utf8')

describe('tokens de movimento: tokens.css = catálogo (SPEC_MOVIMENTO 2)', () => {
  it('cada --mov-* e --curva-* do tokens.css tem o valor do catálogo, e nenhum fica sem registro', () => {
    expect(divergencias(CSS)).toEqual([])
  })

  it('o tokens.css declara as 23 variáveis da tabela, todas dentro de :root', () => {
    const raiz = /:root\s*\{([\s\S]*?)\}/.exec(CSS)?.[1] ?? ''
    expect([...declaradas(raiz).keys()].sort()).toEqual(Object.keys(esperado()).sort())
  })

  it('controle negativo: um valor trocado, uma variável a menos ou uma a mais fazem o teste falhar', () => {
    const certo = Object.entries(esperado())
      .map(([nome, valor]) => `${nome}: ${valor};`)
      .join('\r\n')
    expect(divergencias(`:root {\r\n${certo}\r\n}`)).toEqual([])
    const revela = `--mov-revela: ${ms(CATALOGO.M4.duracaoMs)};`
    expect(certo).toContain(revela)
    expect(divergencias(certo.replace(revela, `--mov-revela: ${ms(CATALOGO.M4.duracaoMs + 1)};`))).toHaveLength(1)
    expect(divergencias(certo.replace(/--mov-feedback:[^;]+;/, ''))).toHaveLength(1)
    expect(divergencias(`${certo}\n--mov-solto: 90ms;`)).toEqual(['--mov-solto: no tokens.css sem registro no catálogo'])
    expect(divergencias(`${certo}\n--mov-rota: 180ms;`)).toEqual(['--mov-rota: declarada 2 vezes'])
  })
})
