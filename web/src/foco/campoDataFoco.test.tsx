import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// F-03 (WCAG 2.4.7): o botão do seletor de data e hora vive no shadow DOM do navegador e o contorno dele é cortado.
// Quando o foco está nele, o campo (host) casa `:focus-within`: é o campo que desenha o anel do site.
// O jsdom não desenha o shadow DOM: a prova aqui é a regra no CSS.

const TIPOS = ['date', 'time', 'datetime-local'] as const

function lerCss(...partes: string[]): string {
  return readFileSync(join(process.cwd(), 'src', ...partes), 'utf8').replace(/\r\n/g, '\n')
}

/** Confere a regra do campo. Devolve a lista de defeitos: vazia quer dizer que a regra está certa. */
function defeitosDaRegra(css: string): string[] {
  const defeitos: string[] = []
  const regra = /([^{}]*:focus-within[^{}]*)\{([^}]*)\}/.exec(css)
  if (!regra) return ['falta a regra input[type=...]:focus-within']

  const seletor = regra[1]
  const corpo = regra[2]
  for (const tipo of TIPOS) {
    const alvo = `input[type='${tipo}']:focus-within`
    if (!seletor.includes(alvo)) defeitos.push(`o seletor não cobre ${tipo}`)
  }

  const anel = /outline:\s*([\d.]+)px\s+solid\s+var\(--cor-foco\)/.exec(corpo)
  if (!anel) defeitos.push('o outline não é "<largura>px solid var(--cor-foco)"')
  else if (!(Number(anel[1]) > 0)) defeitos.push('a largura do outline é zero')
  if (/outline:\s*(none|0)\s*(;|$)/.test(corpo)) defeitos.push('o outline está desligado')
  if (/transition/.test(corpo)) defeitos.push('a regra tem transition')
  return defeitos
}

describe('foco do botão do seletor de data e hora (A11Y-Z1, F-03)', () => {
  const indice = lerCss('index.css')
  const foco = (() => {
    try {
      return lerCss('styles', 'foco.css')
    } catch {
      return ''
    }
  })()

  it('index.css importa ./styles/foco.css depois de ./styles/campo.css', () => {
    const campo = indice.indexOf("@import './styles/campo.css';")
    const focoImport = indice.indexOf("@import './styles/foco.css';")
    expect(campo, 'falta o import de campo.css').toBeGreaterThanOrEqual(0)
    expect(focoImport, 'falta o import de foco.css').toBeGreaterThan(campo)
  })

  it('foco.css existe e tem uma única camada components', () => {
    expect(foco, 'falta web/src/styles/foco.css').not.toBe('')
    expect(foco.match(/@layer components\s*\{/g)).toHaveLength(1)
  })

  it('a regra cobre date, time e datetime-local com :focus-within e outline na cor de foco, largura maior que zero', () => {
    expect(defeitosDaRegra(foco)).toEqual([])
  })

  it('a regra não tem transition: o anel aparece na hora', () => {
    expect(foco, 'falta web/src/styles/foco.css').not.toBe('')
    expect(foco).not.toMatch(/transition/)
  })

  it('foco.css não tem cor em hexadecimal', () => {
    expect(foco, 'falta web/src/styles/foco.css').not.toBe('')
    expect(foco).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  describe('controles negativos do verificador', () => {
    const certa = `input[type='date']:focus-within,
input[type='time']:focus-within,
input[type='datetime-local']:focus-within {
  outline: 3px solid var(--cor-foco);
  outline-offset: 2px;
}`

    it('aceita a regra certa', () => {
      expect(defeitosDaRegra(certa)).toEqual([])
    })

    it('reprova a regra com outline: none', () => {
      const defeitos = defeitosDaRegra(certa.replace('outline: 3px solid var(--cor-foco);', 'outline: none;'))
      expect(defeitos.length).toBeGreaterThan(0)
    })

    it('reprova a regra que cobre só o tipo date', () => {
      const soDate = `input[type='date']:focus-within {
  outline: 3px solid var(--cor-foco);
}`
      const defeitos = defeitosDaRegra(soDate)
      expect(defeitos).toContain('o seletor não cobre time')
      expect(defeitos).toContain('o seletor não cobre datetime-local')
    })

    it('reprova a regra com largura zero e a com transition', () => {
      expect(defeitosDaRegra(certa.replace('3px solid', '0px solid')).length).toBeGreaterThan(0)
      expect(defeitosDaRegra(certa.replace('outline-offset', 'transition: outline 1s;\n  outline-offset')).length).toBeGreaterThan(0)
    })

    it('reprova a regra antiga no pseudo-elemento do botão', () => {
      const antiga = `input[type='date']::-webkit-calendar-picker-indicator:focus-visible,
input[type='time']::-webkit-calendar-picker-indicator:focus-visible,
input[type='datetime-local']::-webkit-calendar-picker-indicator:focus-visible {
  outline: 0.125rem solid var(--cor-foco);
}`
      expect(defeitosDaRegra(antiga).length).toBeGreaterThan(0)
    })
  })
})
