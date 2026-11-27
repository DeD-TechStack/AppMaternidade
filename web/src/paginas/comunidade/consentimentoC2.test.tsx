import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ENTRAR_NA_COMUNIDADE, TX } from '../../conteudo/comunidade.ts'
import { ELENCO, criarElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { pressionar, tabular } from '../conta/tabular.ts'
import { fixtureDeContasDoElenco, renderizarComunidade } from './apoio.tsx'

async function abrirConsentimento() {
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.UTC(2026, 10, 27, 17))))
  contas.sessaoParaTeste(ELENCO.nova.email)
  const comunidade = criarDadosComunidadeMemoria(criarElenco(), ELENCO.nova.conta)
  renderizarComunidade('/app/comunidade/entrar', { contas, comunidade })
  const caixa = await screen.findByRole('checkbox', { name: TX.tx03 })
  const aceitar = screen.getByRole('button', { name: ENTRAR_NA_COMUNIDADE.aceitar })
  return { caixa, aceitar }
}

it('o envio sem a marca foca a caixa já descrita pelo erro, inclusive numa nova tentativa', async () => {
  const { caixa, aceitar } = await abrirConsentimento()
  expect(screen.queryByText(ENTRAR_NA_COMUNIDADE.marqueACaixa)).toBeNull()
  caixa.focus()

  for (const tentativa of [1, 2]) {
    expect(tabular()).toBe(aceitar)
    const errosAoFocar: (HTMLElement | null)[] = []
    caixa.addEventListener('focus', () => {
      const descricao = caixa.getAttribute('aria-describedby') ?? ''
      errosAoFocar.push(document.getElementById(descricao))
    }, { once: true })

    pressionar(aceitar, 'Enter')

    const erro = screen.getByText(ENTRAR_NA_COMUNIDADE.marqueACaixa)
    expect(document.activeElement === caixa, `foco na caixa, tentativa ${tentativa}`).toBe(true)
    expect(errosAoFocar).toEqual([erro])
    expect(caixa.getAttribute('aria-invalid')).toBe('true')
  }
})

it('após marcar e aceitar, o apelido recebe foco e seu rótulo indica que é obrigatório', async () => {
  const { caixa, aceitar } = await abrirConsentimento()
  caixa.focus()
  pressionar(caixa, ' ')
  expect(tabular()).toBe(aceitar)
  pressionar(aceitar, 'Enter')

  const apelido = await screen.findByRole('textbox', { name: /^Apelido/u }) as HTMLInputElement
  expect(document.activeElement === apelido, 'foco no apelido após o aceite').toBe(true)
  expect(apelido.labels?.[0]?.textContent?.trim()).toBe('Apelido (obrigatório)')
  expect(apelido.getAttribute('aria-required')).toBe('true')
  expect(apelido.required).toBe(false)
})
