import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Campo, SeletorFuso } from './Campos.tsx'

// O fundo preenchido de "só leitura" é do campo de texto `readonly` (o e-mail). O `:read-only` do
// CSS casa também com todo `<select>`, então o seletor de fuso não pode levar essa marca.

const semEfeito = () => undefined

describe('a marca de só leitura nos campos', () => {
  it('o campo de texto só leitura leva o atributo readonly e a classe read-only:', () => {
    render(<Campo rotulo="E-mail" valor="a@exemplo.invalid" aoMudar={semEfeito} somenteLeitura />)

    const entrada = screen.getByLabelText('E-mail') as HTMLInputElement
    expect(entrada.readOnly).toBe(true)
    expect(entrada.className).toMatch(/(^|\s)read-only:bg-/)
  })

  it('o seletor de fuso não leva a marca de só leitura, mas leva a mesma caixa (cm-campo-entrada) do campo editável', () => {
    render(
      <>
        <Campo rotulo="Seu nome" valor="Juliana" aoMudar={semEfeito} />
        <SeletorFuso rotulo="Seu fuso" valor="America/Sao_Paulo" aoMudar={semEfeito} />
      </>,
    )

    const seletor = screen.getByLabelText('Seu fuso') as HTMLSelectElement
    const nome = screen.getByLabelText('Seu nome') as HTMLInputElement
    expect(seletor.className).not.toMatch(/read-only:/)
    expect(seletor.hasAttribute('readonly')).toBe(false)
    // A caixa vem da base do "Campo de mel" (56 px, raio 14, hover e foco): é a mesma nos dois.
    for (const classe of ['cm-campo-entrada', 'alvo-toque']) {
      expect(seletor.classList.contains(classe), classe).toBe(true)
      expect(nome.classList.contains(classe), classe).toBe(true)
    }
  })
})
