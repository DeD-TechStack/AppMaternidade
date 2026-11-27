import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AVISOS_TEXTOS } from '../../conteudo/avisos.ts'
import { ContextoDadosAvisos } from '../../dados/avisos.ts'
import { criarDadosAvisosSupabase } from '../../dados/avisos.supabase.ts'
import { criarClienteFalso, type RespostaFalsa } from '../../teste/renderizarComDados.tsx'
import { criarRotasProntas } from '../../teste/rotasProntas.ts'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'
import { ProvedorDadosConta } from '../conta/sessao.tsx'
import { ProvedorDadosRotina } from '../rotina/dadosRotina.tsx'

const INDISPONIVEL = 'Os avisos não estão disponíveis neste ambiente.'
const PREFERENCIA_INDISPONIVEL = 'Não é possível mudar a preferência de avisos neste ambiente.'
const MARCACAO_INDISPONIVEL = 'Não é possível marcar os avisos como vistos neste ambiente.'
const ausente = { error: { code: 'PGRST202', message: 'Could not find the function in the schema cache', details: 'detalhe interno' } }
const nota = {
  id: 'nota-ficticia', texto: 'Nota fictícia.', criada_em: '2026-11-15T10:00:00.123456Z', destaque_ate: null,
  autor: 'removido', familia_nome: 'Família fictícia', familia_fuso: 'America/Sao_Paulo',
}
const estado = (avisos = [nota]) => ({ data: { ligados: true, mais_de_50: false, avisos }, error: null })
const cabecalho = () => within(document.querySelector<HTMLElement>('header[data-cabecalho]')!)

async function montar(caminho: string, rpc: Record<string, RespostaFalsa>) {
  const falso = criarClienteFalso({ rpc })
  const mundo = criarMundoDeTeste({ sessao: 'juliana' })
  const roteador = createMemoryRouter(criarRotasProntas(), { initialEntries: [caminho] })
  render(
    <ProvedorDadosConta dados={mundo.conta}>
      <ProvedorDadosRotina dados={mundo.rotina}>
        <ContextoDadosAvisos value={criarDadosAvisosSupabase(falso.cliente)}>
          <RouterProvider router={roteador} />
        </ContextoDadosAvisos>
      </ProvedorDadosRotina>
    </ProvedorDadosConta>,
  )
  await screen.findByRole('heading', { level: 1, name: caminho === '/app/avisos' ? 'Avisos' : 'Conta' })
  return { ...falso, roteador }
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  vi.stubGlobal('scrollTo', vi.fn())
  vi.stubGlobal('innerWidth', 1440)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('RPC de leitura ausente: acesso direto e Conta mostram indisponibilidade sem derrubar a sessão', async () => {
  const { rpc } = await montar('/app/avisos', { avisos_ler_estado: ausente })
  expect((await screen.findByRole('alert')).textContent).toBe(INDISPONIVEL)
  expect(screen.queryByText(AVISOS_TEXTOS.vazio)).toBeNull()
  expect(screen.queryByText(AVISOS_TEXTOS.desligado)).toBeNull()
  expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
  expect(cabecalho().queryByRole('link', { name: /^Avisos/ })).toBeNull()
  fireEvent.click(cabecalho().getByRole('link', { name: 'Conta' }))
  await screen.findByRole('heading', { level: 1, name: 'Conta' })
  const secao = within(screen.getByRole('region', { name: AVISOS_TEXTOS.secaoTitulo }))
  expect((await secao.findByRole('alert')).textContent).toBe(INDISPONIVEL)
  expect(secao.queryByRole('checkbox')).toBeNull()
  expect(secao.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
  expect(new Set(rpc.mock.calls.map(([nome]) => nome))).toEqual(new Set(['avisos_ler_estado']))
})

it.each([{ code: 'XX000', status: 500 }, { code: '42883' }, { status: 404 }, new TypeError('Failed to fetch')])(
  'falha comum (%j) continua sendo erro com nova tentativa, não ausência nem lista vazia',
  async (error) => {
    await montar('/app/avisos', { avisos_ler_estado: { error } })
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).not.toContain(INDISPONIVEL)
    expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
    expect(screen.queryByText(AVISOS_TEXTOS.vazio)).toBeNull()
  },
)

it('RPC de leitura disponível com zero itens mostra a lista vazia, não indisponibilidade', async () => {
  await montar('/app/avisos', { avisos_ler_estado: estado([]) })
  expect(await screen.findByText(AVISOS_TEXTOS.vazio)).toBeTruthy()
  expect(screen.queryByText(INDISPONIVEL)).toBeNull()
  expect(cabecalho().getByRole('link', { name: 'Avisos' })).toBeTruthy()
})

it('perda confirmada do RPC de leitura descarta o estado anterior; uma leitura bem-sucedida o restaura', async () => {
  let resposta: Exclude<RespostaFalsa, () => unknown> = estado()
  await montar('/app/avisos', { avisos_ler_estado: () => resposta })
  await screen.findByText(nota.texto)
  resposta = ausente
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  expect(await screen.findByText(INDISPONIVEL)).toBeTruthy()
  expect(screen.queryByText(nota.texto)).toBeNull()
  expect(cabecalho().queryByRole('link', { name: /^Avisos/ })).toBeNull()
  resposta = estado([])
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  expect(await screen.findByText(AVISOS_TEXTOS.vazio)).toBeTruthy()
})

it('RPC de preferência ausente desativa só a gravação e conserva a preferência lida', async () => {
  const { rpc } = await montar('/app/conta', {
    avisos_ler_estado: estado(), avisos_definir_ligados: ausente,
  })
  const secao = within(screen.getByRole('region', { name: AVISOS_TEXTOS.secaoTitulo }))
  const caixa = await secao.findByRole<HTMLInputElement>('checkbox', { name: AVISOS_TEXTOS.rotuloDaCaixa })
  fireEvent.click(caixa)
  expect(await secao.findByText(PREFERENCIA_INDISPONIVEL)).toBeTruthy()
  expect(caixa.checked).toBe(true)
  expect(caixa.disabled).toBe(true)
  expect(secao.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
  expect(cabecalho().getByRole('link', { name: 'Avisos, 1 aviso novo' })).toBeTruthy()
  expect(rpc.mock.calls.filter(([nome]) => nome === 'avisos_definir_ligados')).toEqual([['avisos_definir_ligados', { p_ligados: false }]])
})

it('RPC de vistos ausente conserva os avisos reais, sem afirmar sucesso nem oferecer a mesma escrita', async () => {
  const { rpc } = await montar('/app/avisos', {
    avisos_ler_estado: estado(), avisos_marcar_vistos: ausente,
  })
  const botao = await screen.findByRole<HTMLButtonElement>('button', { name: AVISOS_TEXTOS.botao })
  fireEvent.click(botao)
  expect(await screen.findByText(MARCACAO_INDISPONIVEL)).toBeTruthy()
  expect(screen.getByText(nota.texto)).toBeTruthy()
  expect(screen.queryByText(AVISOS_TEXTOS.statusMarcados)).toBeNull()
  expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
  expect(botao.getAttribute('aria-disabled')).toBe('true')
  fireEvent.click(botao)
  expect(rpc.mock.calls.filter(([nome]) => nome === 'avisos_marcar_vistos')).toEqual([['avisos_marcar_vistos', { p_ate: nota.criada_em }]])
})

it('RPC de vistos disponível mantém o fluxo de sucesso e envia o instante sem alterar', async () => {
  let resposta = estado()
  const { rpc } = await montar('/app/avisos', {
    avisos_ler_estado: () => resposta,
    avisos_marcar_vistos: () => { resposta = estado([]); return { data: null, error: null } },
  })
  fireEvent.click(await screen.findByRole('button', { name: AVISOS_TEXTOS.botao }))
  expect(await screen.findByText(AVISOS_TEXTOS.statusMarcados)).toBeTruthy()
  expect(await screen.findByText(AVISOS_TEXTOS.vazio)).toBeTruthy()
  await waitFor(() => expect(cabecalho().getByRole('link', { name: 'Avisos' })).toBeTruthy())
  expect(rpc.mock.calls.filter(([nome]) => nome === 'avisos_marcar_vistos')).toEqual([['avisos_marcar_vistos', { p_ate: nota.criada_em }]])
})
