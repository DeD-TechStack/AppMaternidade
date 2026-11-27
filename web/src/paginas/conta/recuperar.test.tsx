import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { COMUM, RECUPERAR, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { emailComFormatoValido } from '../../conteudo/email.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { comObrigatorio } from './obrigatorio.ts'

// QA-06: o formato do e-mail é conferido antes do envio, em /recuperar-acesso e em /criar-conta.

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

const campo = () => screen.getByLabelText(comObrigatorio('E-mail'), { selector: 'input' }) as HTMLInputElement
const digitar = (texto: string) => fireEvent.change(campo(), { target: { value: texto } })
const novaMemoria = () => criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))

describe('emailComFormatoValido', () => {
  it('aceita nome@dominio.ext (com espaços nas pontas) e recusa o resto', () => {
    expect(emailComFormatoValido('juliana@exemplo.invalid')).toBe(true)
    expect(emailComFormatoValido('  juliana@exemplo.invalid  ')).toBe(true)
    for (const invalido of ['', 'xis', 'sem-arroba.com', 'a@b', '@b.com', 'a@.com', 'a b@c.com', 'a@@b.com']) {
      expect(emailComFormatoValido(invalido), invalido).toBe(false)
    }
  })
})

describe('/recuperar-acesso: formato do e-mail', () => {
  async function abrir() {
    const dados = novaMemoria()
    const pedirRecuperacao = vi.spyOn(dados, 'pedirRecuperacao')
    renderizarComDados('/recuperar-acesso', { dados })
    await screen.findByRole('button', { name: 'Enviar link' })
    return pedirRecuperacao
  }

  it('formato inválido: "Confira o e-mail digitado." no campo, foco nele e nada é enviado', async () => {
    const pedirRecuperacao = await abrir()
    digitar('xis')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(screen.getByText(TEXTOS_ERRO.email_invalido)).toBeTruthy()
    expect(TEXTOS_ERRO.email_invalido).toBe('Confira o e-mail digitado.')
    expect(campo().getAttribute('aria-invalid')).toBe('true')
    await waitFor(() => expect(document.activeElement).toBe(campo()))
    expect(pedirRecuperacao).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('o erro some quando a pessoa volta a digitar', async () => {
    await abrir()
    digitar('xis')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }))
    expect(screen.getByText(TEXTOS_ERRO.email_invalido)).toBeTruthy()

    digitar('xis@')
    expect(screen.queryByText(TEXTOS_ERRO.email_invalido)).toBeNull()
  })

  it('formato válido mantém a resposta neutra de hoje', async () => {
    const pedirRecuperacao = await abrir()
    digitar('ninguem@exemplo.invalid')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(RECUPERAR.resultado))
    expect(pedirRecuperacao).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(TEXTOS_ERRO.email_invalido)).toBeNull()
  })

  it('texto vazio continua com "Escreva o seu e-mail."', async () => {
    const pedirRecuperacao = await abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(screen.getByText(COMUM.escrevaEmail)).toBeTruthy()
    expect(document.activeElement).toBe(campo())
    expect(pedirRecuperacao).not.toHaveBeenCalled()
  })
})
