import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { simularFalhaRotina } from '../../dados/rotina.memoria.ts'
import { COMUM, ESTADOS } from '../../conteudo/rotina.ts'
import { comObrigatorio } from '../conta/obrigatorio.ts'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
})

it('P01 Histórico deve estar disponível como link atual na navegação', async () => {
  await renderizarRotaPronta('/app/historico')
  const links = screen.queryAllByRole('link', { name: 'Histórico' })
  expect(links.some(a => a.getAttribute('href') === '/app/historico' && a.getAttribute('aria-current') === 'page')).toBe(true)
})

it.each(['Cancelar', 'Salvar'])('P02 Hoje → Ver notas → Nova nota → %s retorna ao Hoje', async (acao) => {
  const { roteador } = await renderizarRotaPronta('/app/hoje')
  fireEvent.click(screen.getByRole('link', { name: 'Ver notas' }))
  await aguardarCarga()
  fireEvent.click(screen.getByRole('link', { name: 'Nova nota' }))
  await aguardarCarga()
  if (acao === 'Salvar') fireEvent.change(screen.getByRole('textbox', { name: comObrigatorio('Texto da nota') }), { target: { value: 'Nota da sonda de revisão.' } })
  fireEvent.click(screen.getByRole('button', { name: acao }))
  await aguardarCarga()
  expect(roteador.state.location.pathname).toBe('/app/hoje')
})

it('P03 editar registro pela URL sem state retorna ao detalhe ao cancelar', async () => {
  const id = 'a0000000-0000-7000-8000-000000000003'
  const { roteador } = await renderizarRotaPronta(`/app/registro/${id}/editar`)
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  await aguardarCarga()
  expect(roteador.state.location.pathname).toBe(`/app/registro/${id}`)
})

it.each(['/app/historico', '/app/lixeira', '/app/registro/a0000000-0000-7000-8000-000000000003'])('P04 observador recebe texto do papel em %s', async (rota) => {
  await renderizarRotaPronta(rota, { papelDeBruno: 'observador', sessao: 'bruno' })
  expect(screen.queryAllByText(ESTADOS.observador)).toHaveLength(1)
})

it('P05 Histórico avisa quando o fuso da família difere do aparelho', async () => {
  const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Tokyo' ? 'America/Sao_Paulo' : 'Asia/Tokyo'
  await renderizarRotaPronta('/app/historico', { fusoDaFamilia: fuso })
  expect(screen.queryByText(COMUM.fusoDiferente(Intl.DateTimeFormat().resolvedOptions().timeZone, fuso))).not.toBeNull()
})

it('P06 edição da nota mantém rascunho e informa falha na releitura ao voltar à aba', async () => {
  const mundo = await renderizarRotaPronta('/app/notas')
  fireEvent.click(screen.getByRole('link', { name: /^Editar/ }))
  await aguardarCarga()
  const campo = screen.getByRole('textbox', { name: comObrigatorio('Texto da nota') }) as HTMLTextAreaElement
  fireEvent.change(campo, { target: { value: 'Rascunho preservado.' } })
  const releitura = vi.spyOn(mundo.rotina, 'notas')
  simularFalhaRotina(mundo.rotina, 'notas', 'rede')
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  fireEvent(document, new Event('visibilitychange'))
  await aguardarCarga()
  expect(releitura).toHaveBeenCalledTimes(1)
  expect(campo.value).toBe('Rascunho preservado.')
  expect(screen.queryByText('Não foi possível falar com o servidor. Verifique a conexão.')).not.toBeNull()
})

it('C01 controle: abrir notas pela URL → nova nota → cancelar volta às notas', async () => {
  const { roteador } = await renderizarRotaPronta('/app/notas')
  fireEvent.click(screen.getByRole('link', { name: 'Nova nota' }))
  await aguardarCarga()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  await aguardarCarga()
  expect(roteador.state.location.pathname).toBe('/app/notas')
  expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
})

it('C02 controle: notas do observador exibem aviso e ocultam escrita', async () => {
  await renderizarRotaPronta('/app/notas', { papelDeBruno: 'observador', sessao: 'bruno' })
  expect(screen.getByText(ESTADOS.observador)).toBeTruthy()
  expect(within(screen.getByRole('main')).queryByRole('link', { name: 'Nova nota' })).toBeNull()
})
