import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CampoAcesso } from './CampoAcesso.tsx'
import { SeletorFusoAcesso } from './SeletorFusoAcesso.tsx'

// "Só leitura" é do campo de texto do e-mail. O seletor de fuso é editável: não leva `readonly`. Os
// dois ficam na linha de campo do sistema (a mesma classe, o mesmo fio e a mesma fonte).

const semEfeito = () => undefined

describe('a marca de só leitura nos campos', () => {
  it('o campo de texto só leitura leva o atributo readonly', () => {
    render(<CampoAcesso rotulo="E-mail" valor="a@exemplo.invalid" aoMudar={semEfeito} somenteLeitura />)

    const entrada = screen.getByLabelText('E-mail') as HTMLInputElement
    expect(entrada.readOnly).toBe(true)
  })

  it('o seletor de fuso não leva a marca de só leitura e tem a mesma linha e a mesma entrada do campo editável', () => {
    render(
      <>
        <CampoAcesso rotulo="Seu nome" valor="Juliana" aoMudar={semEfeito} />
        <SeletorFusoAcesso rotulo="Seu fuso" valor="America/Sao_Paulo" aoMudar={semEfeito} />
      </>,
    )

    const seletor = screen.getByLabelText('Seu fuso') as HTMLSelectElement
    const nome = screen.getByLabelText('Seu nome') as HTMLInputElement
    expect(seletor.hasAttribute('readonly')).toBe(false)
    expect(nome.readOnly).toBe(false)
    for (const controle of [seletor, nome]) {
      expect(controle.classList.contains('sb-campo-entrada')).toBe(true)
      expect(controle.closest('.sb-campo')).not.toBeNull()
    }
    expect(seletor.closest('.sb-campo-controle')!.hasAttribute('data-select')).toBe(true)
  })
})
