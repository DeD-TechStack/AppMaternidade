import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ORDEM_DOS_PAPEIS, PAPEIS } from '../../conteudo/conta.ts'
import { EscolhaDePapel } from './EscolhaDePapel.tsx'

// Líder, H-3d: na Família os botões de opção do papel do convite têm 13 × 13 px. O alvo de toque é a linha inteira:
// cada opção é um rótulo de pelo menos 44 px de altura (min-h-11, 2,75 rem), com o botão nativo dentro e os textos
// ao lado, de modo que tocar em qualquer ponto da linha marca a opção. Sem folha de estilo no jsdom, o contrato
// de 44 px se confere pelas classes do rótulo.

describe('EscolhaDePapel: o alvo de cada opção tem 44 px de altura', () => {
  it('cada opção é um rótulo com min-h-11, alinhado ao centro, que contém o botão de opção nativo', () => {
    render(<EscolhaDePapel legenda="Papel" valor="cuidador" aoMudar={() => undefined} />)

    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios).toHaveLength(ORDEM_DOS_PAPEIS.length)
    for (const radio of radios) {
      expect(radio.type).toBe('radio')
      const rotulo = radio.closest('label')!
      expect(rotulo, 'o botão de opção está dentro de um <label>').not.toBeNull()
      expect(rotulo.classList.contains('min-h-11'), 'min-h-11 = 44 px de altura').toBe(true)
      expect(rotulo.classList.contains('items-center'), 'a linha centra o botão na altura').toBe(true)
      expect(rotulo.classList.contains('alvo-toque')).toBe(true)
      expect(rotulo.querySelectorAll('input')).toHaveLength(1)
    }
  })

  it('A11Y-003: a caixa do botão de opção tem pelo menos 24 × 24 px (size-6) e o flex não a espreme (shrink-0)', () => {
    render(<EscolhaDePapel legenda="Papel" valor="cuidador" aoMudar={() => undefined} />)

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.classList.contains('size-6'), 'size-6 = 24 × 24 px').toBe(true)
      expect(radio.classList.contains('shrink-0')).toBe(true)
    }
  })

  it('o rótulo inteiro é clicável: tocar no texto da opção marca o botão de opção', () => {
    const aoMudar = vi.fn()
    render(<EscolhaDePapel legenda="Papel" valor="cuidador" aoMudar={aoMudar} />)

    const observador = ORDEM_DOS_PAPEIS.find((papel) => papel === 'observador')!
    fireEvent.click(screen.getByText(PAPEIS[observador].permite))
    expect(aoMudar).toHaveBeenCalledWith('observador')
  })
})
