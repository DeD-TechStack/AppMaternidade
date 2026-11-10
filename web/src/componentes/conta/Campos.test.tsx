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

// O CSS de abaixo de 768 ancora o erro de um jeito quando a linha tem a ajuda (o erro ocupa o lugar
// dela) e de outro quando não tem (o erro cai no vão abaixo do campo): a marca `data-ajuda` diz qual.
describe('a marca data-ajuda do campo de acesso', () => {
  it('só existe quando o campo tem ajuda, com ou sem erro, e a ajuda e o erro seguem no DOM', () => {
    const { container, rerender } = render(<CampoAcesso rotulo="Senha" valor="" aoMudar={semEfeito} />)
    expect(container.querySelector('.sb-campo')!.hasAttribute('data-ajuda')).toBe(false)

    rerender(<CampoAcesso rotulo="Senha" valor="" aoMudar={semEfeito} ajuda="Pelo menos 6 caracteres." />)
    expect(container.querySelector('.sb-campo')!.hasAttribute('data-ajuda')).toBe(true)
    expect(container.querySelector('.sb-campo')!.hasAttribute('data-erro')).toBe(false)

    rerender(<CampoAcesso rotulo="Senha" valor="" aoMudar={semEfeito} ajuda="Pelo menos 6 caracteres." erro="Use 6 ou mais caracteres." />)
    const linha = container.querySelector('.sb-campo')!
    expect(linha.hasAttribute('data-ajuda')).toBe(true)
    expect(linha.hasAttribute('data-erro')).toBe(true)
    const entrada = screen.getByLabelText('Senha')
    expect(entrada.getAttribute('aria-describedby')!.split(' ')).toHaveLength(2)
    expect(linha.querySelector('p.sb-campo-ajuda')).not.toBeNull()
    expect(linha.querySelector('p.sb-campo-erro')).not.toBeNull()

    rerender(<CampoAcesso rotulo="Senha" valor="" aoMudar={semEfeito} erro="Use 6 ou mais caracteres." />)
    expect(container.querySelector('.sb-campo')!.hasAttribute('data-ajuda')).toBe(false)
  })
})

// R-3: o Recuperar reserva, abaixo de 768, uma zona fixa de 2 linhas para a confirmação e o erro, com ou
// sem mensagem. O CSS precisa saber qual linha tem a região de status: a marca `data-status` diz.
describe('a marca data-status do campo de acesso', () => {
  it('só existe quando a tela passa o status, mesmo vazio, e a região role="status" segue no DOM', () => {
    const { container, rerender } = render(<CampoAcesso rotulo="E-mail" valor="" aoMudar={semEfeito} />)
    expect(container.querySelector('.sb-campo')!.hasAttribute('data-status')).toBe(false)
    expect(container.querySelector('[role="status"]')).toBeNull()

    rerender(<CampoAcesso rotulo="E-mail" valor="" aoMudar={semEfeito} status="" />)
    expect(container.querySelector('.sb-campo')!.hasAttribute('data-status')).toBe(true)
    expect(screen.getByRole('status').textContent).toBe('')

    rerender(<CampoAcesso rotulo="E-mail" valor="" aoMudar={semEfeito} status={null} />)
    expect(container.querySelector('.sb-campo')!.hasAttribute('data-status')).toBe(true)
    expect(screen.getByRole('status').textContent).toBe('')

    rerender(<CampoAcesso rotulo="E-mail" valor="" aoMudar={semEfeito} status="Se a conta existir, enviamos o link." />)
    const linha = container.querySelector('.sb-campo')!
    expect(linha.hasAttribute('data-status')).toBe(true)
    expect(linha.contains(screen.getByRole('status'))).toBe(true)
    expect(screen.getByRole('status').textContent).toBe('Se a conta existir, enviamos o link.')

    rerender(<CampoAcesso rotulo="E-mail" valor="" aoMudar={semEfeito} erro="Informe o e-mail." />)
    expect(container.querySelector('.sb-campo')!.hasAttribute('data-status')).toBe(false)
  })
})
