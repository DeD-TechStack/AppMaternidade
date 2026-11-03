import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import axe from 'axe-core'
import { renderizarRota } from './teste/renderizarRota.tsx'

describe('acessibilidade (axe-core)', () => {
  for (const caminho of ['/', '/qualquer-coisa']) {
    it(`não tem violações em ${caminho}`, async () => {
      const { container } = renderizarRota(caminho)
      await screen.findByRole('heading', { level: 1 })

      const resultado = await axe.run(container, {
        rules: {
          // O jsdom não calcula cores nem layout, então a regra de contraste do axe
          // não tem como avaliar a página. O contraste é conferido em estilo.test.ts.
          'color-contrast': { enabled: false },
        },
      })

      // `incomplete` fica de fora de propósito: só violações confirmadas reprovam.
      expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    })
  }
})
