import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// MAT-37b g3. O véu atrás dos diálogos tem de escurecer o fundo nos dois temas.
// `--cor-texto` é claro na Madrugada, então um véu feito com ele clareia a tela.
// O véu usa o cacau, que é escuro nos dois temas.

describe('véu atrás dos diálogos da conta', () => {
  for (const arquivo of ['DialogoDeAcao.tsx', 'DialogoExcluirConta.tsx']) {
    it(`${arquivo}: o véu não usa --cor-texto e usa --color-cacau`, () => {
      const fonte = readFileSync(resolve(import.meta.dirname, arquivo), 'utf8')
      const veus = fonte.match(/backdrop:\S+/g) ?? []
      expect(veus.length, arquivo).toBeGreaterThan(0)
      for (const veu of veus) {
        expect(veu, arquivo).not.toContain('--cor-texto')
        expect(veu, arquivo).toContain('--color-cacau')
      }
    })
  }
})
