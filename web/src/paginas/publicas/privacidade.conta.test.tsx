import { fireEvent, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

it('abre a Conta pelo link nos pedidos de acesso e exclusão, sem iniciar nenhum dos pedidos', async () => {
  renderizarRota('/privacidade#secao-seus-direitos')
  const secao = screen.getByRole('heading', { name: 'Seus direitos' }).closest('section')!
  const conta = within(secao).getByRole('link', { name: 'Conta' })
  expect(conta.getAttribute('href')).toBe('/app/conta')
  fireEvent.click(conta)
  await screen.findByRole('heading', { level: 1, name: 'Conta' })
})
