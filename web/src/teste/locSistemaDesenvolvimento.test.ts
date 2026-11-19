import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// LOC-08b: textos da /sistema sem "mel" e "oliva" como nome de cor para a pessoa que lê.

const fonte = readFileSync(join(process.cwd(), 'src', 'paginas', 'Sistema.tsx'), 'utf8')

describe('Sistema.tsx, textos em português claro', () => {
  it('traz o texto alternativo da cena e o lide da faixa, exatos', () => {
    expect(fonte).toContain(
      'Três celulares sobre pedestais verdes, num fundo amarelo, mostrando telas do AppMaternidade: a base do sistema, a escala de títulos e o rodapé.',
    )
    expect(fonte).toContain('O botão de iniciar mamada fica na metade de baixo da tela, grande e amarelo sobre o fundo escuro.')
  })

  it('não traz mais os textos antigos', () => {
    expect(fonte).not.toContain('pedestais de oliva')
    expect(fonte).not.toContain('em mel sobre o escuro')
    expect(fonte).not.toContain('fundo de mel')
  })
})
