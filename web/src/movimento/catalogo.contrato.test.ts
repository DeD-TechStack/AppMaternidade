import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOGO } from './catalogo.ts'

// MOTION-1: o contrato do movimento. Nada começa escondido à espera da rolagem; sobram só a cortina (M2),
// a cena da abertura (M8) e a camada de hover (M13) no relógio.

const RAIZ = join(process.cwd(), 'src')

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho]
  })
}

/** O texto do arquivo com as quebras de linha normalizadas (CRLF e LF dão o mesmo resultado). */
const ler = (caminho: string) => readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')

const TODOS = arquivos(RAIZ)
const ehTeste = (caminho: string) => /\.test\.[cm]?[jt]sx?$/.test(caminho)
const nomeRelativo = (caminho: string) => relative(RAIZ, caminho).replace(/\\/g, '/')

describe('catálogo do movimento', () => {
  it('não tem M4, M5 nem M6', () => {
    const chaves = Object.keys(CATALOGO)
    for (const removida of ['M4', 'M5', 'M6']) expect(chaves).not.toContain(removida)
  })

  it('só M2, M8, M13, M15 e M17 correm no relógio (tipo "tempo")', () => {
    // REP-HOME (REPH-I-22): a lâmpada do Início (M15) e a troca da legenda (M17) correm no relógio; a noite (M16) é
    // presa à rolagem e fica fora.
    const noTempo = Object.entries(CATALOGO)
      .filter(([, registro]) => registro.tipo === 'tempo')
      .map(([chave]) => chave)
      .sort()
    expect(noTempo).toEqual(['M13', 'M15', 'M17', 'M2', 'M8'])
  })

  it('M16 (a noite presa à rolagem) guarda o pino como regra de altura e as faixas em ordem, sem tabela por largura', () => {
    // STAGE: D = clamp(minPx, svh x altura, maxPx); a troca da vez (3 % do pino) cai no cruzamento da legenda (M17).
    const { tipo, pino, paradas, vez, vezEmpilhada, janelaPx } = CATALOGO.M16
    expect(tipo).toBe('rolagem')
    expect(pino.minPx).toBeLessThan(pino.maxPx)
    expect(janelaPx).toBe((900 * pino.svh) / 100)
    expect(paradas.repousoAte).toBeLessThan(paradas.fimDe)
    expect(vez.de).toBeLessThan(vez.ate)
    expect((vez.de + vez.ate) / 2).toBeCloseTo(CATALOGO.M17.limiar, 6)
    expect(vezEmpilhada.de).toBeLessThan(vezEmpilhada.de + 0.1)
    expect(vezEmpilhada.de).toBeGreaterThan(0)
    expect(vezEmpilhada.ate).toBeLessThan(1)
    expect(Object.keys(CATALOGO.M16)).not.toContain('janelaPxPorLargura')
  })
})

describe('o código fora dos testes', () => {
  const codigo = TODOS.filter((c) => /\.[cm]?[jt]sx?$/.test(c) && !ehTeste(c))

  it('nenhum arquivo importa EntradaSuave, TextoAnimado, LinhasEscalonadas nem naJanela', () => {
    const importa = /^\s*(?:import|export)\b[^;]*?from\s+['"][^'"]*\/(EntradaSuave|TextoAnimado|LinhasEscalonadas|naJanela)(?:\.[a-z]+)?['"]/gm
    const achados = codigo.flatMap((c) =>
      [...ler(c).matchAll(importa)].map((m) => `${nomeRelativo(c)}: ${m[1]}`),
    )
    expect(achados).toEqual([])
  })

  it('nenhum arquivo de produção importa RevelacaoPorBaixo (primitiva estacionada)', () => {
    // O M7 está estacionado: um cartão futuro que o use deve mudar este contrato de propósito.
    const importa = /from\s+['"][^'"]*\/RevelacaoPorBaixo(?:\.[a-z]+)?['"]/
    const quem = codigo.filter((c) => importa.test(ler(c))).map(nomeRelativo)
    expect(quem).toEqual([])
  })

  it('nenhum CSS declara "transition: all" nem "transition-property: all"', () => {
    const achados = TODOS.filter((c) => c.endsWith('.css')).flatMap((c) =>
      ler(c)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .filter((linha) => /transition(?:-property)?\s*:\s*all\b/.test(linha))
        .map((linha) => `${nomeRelativo(c)}: ${linha.trim()}`),
    )
    expect(achados).toEqual([])
  })
})
