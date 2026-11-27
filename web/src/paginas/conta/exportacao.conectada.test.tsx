import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { criarElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaSupabase } from '../../dados/conta.supabase.ts'
import { criarClienteFalso, USUARIO_FALSO } from '../../teste/renderizarComDados.tsx'
import { renderizarComunidade } from '../comunidade/apoio.tsx'

const INDISPONIVEL = 'A exportação completa dos seus dados está indisponível no momento. Nenhum arquivo foi baixado.'
const DATA = '2026-11-06T12:00:00.000000Z'
const CONTA = {
  id: USUARIO_FALSO.id,
  email: USUARIO_FALSO.email,
  nome_privado: 'Pessoa de teste',
  fuso: 'America/Sao_Paulo',
  criada_em: DATA,
}

// A migração 20261106090600 mantém o mesmo formato, mas só entrega estas cinco chaves.
const LEGADO = {
  formato: 'appmaternidade-exportacao-v1',
  gerado_em: DATA,
  conta: CONTA,
  vinculos: [],
  familias: [],
}
const COMPLETO_VAZIO = {
  ...LEGADO,
  registros: [],
  notas: [],
  avisos: { ligados: true, vistos_ate: null },
}
const FAMILIA = {
  id: 'familia-ficticia',
  nome: 'Família de teste',
  fuso: CONTA.fuso,
  criada_em: DATA,
  membros: [],
  bebes: [],
  convites: [],
}
const COMPLETO_COM_FAMILIA = {
  ...COMPLETO_VAZIO,
  familias: [{ ...FAMILIA, registros: [], notas: [{ id: 'nota-ficticia', texto: 'Nota de teste' }] }],
}

afterEach(() => {
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
  vi.restoreAllMocks()
})

async function abrirContaConectada(resposta: () => unknown) {
  const falso = criarClienteFalso({
    tabelas: { contas: [{ data: CONTA }], vinculos: [{ data: [] }] },
    rpc: { exportar_dados: () => ({ data: resposta(), error: null }) },
  })
  const arquivos: Blob[] = []
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (arquivo: Blob) => { arquivos.push(arquivo); return 'blob:exportacao-ficticia' },
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  renderizarComunidade('/app/conta', {
    contas: criarDadosContaSupabase(falso.cliente),
    comunidade: criarDadosComunidadeMemoria(criarElenco(), CONTA.id),
  })
  await screen.findByRole('heading', { level: 1, name: 'Conta' })
  fireEvent.click(screen.getByRole('button', { name: 'Baixar meus dados' }))
  return { rpc: falso.rpc, arquivos, download }
}

function lerJson(arquivo: Blob) {
  return new Promise<unknown>((resolver, rejeitar) => {
    const leitor = new FileReader()
    leitor.onload = () => resolver(JSON.parse(String(leitor.result)))
    leitor.onerror = () => rejeitar(leitor.error)
    leitor.readAsText(arquivo)
  })
}

describe('Baixar meus dados pela Conta conectada', () => {
  it.each([
    ['a resposta da migração legada, mesmo sem famílias', LEGADO],
    ['uma família sem as listas da rotina', { ...COMPLETO_VAZIO, familias: [FAMILIA] }],
    ['uma lista nula, que não equivale a uma lista vazia', { ...COMPLETO_VAZIO, notas: null }],
    ['as preferências de avisos ausentes', { ...COMPLETO_VAZIO, avisos: undefined }],
  ])('mostra indisponível em vez de baixar %s', async (_caso, resposta) => {
    const { rpc, arquivos, download } = await abrirContaConectada(() => resposta)

    await waitFor(() => expect(screen.queryByRole('alert') ?? screen.queryByText('Arquivo baixado.')).not.toBeNull())
    expect(rpc).toHaveBeenCalledExactlyOnceWith('exportar_dados', undefined)
    expect(download).not.toHaveBeenCalled()
    expect(arquivos).toEqual([])
    expect(screen.queryByText('Arquivo baixado.')).toBeNull()
    expect(screen.getByRole('alert').textContent).toContain(INDISPONIVEL)
  })

  it.each([COMPLETO_VAZIO, COMPLETO_COM_FAMILIA])('baixa a resposta completa sem preencher ou remover dados (%#)', async (resposta) => {
    const { arquivos, download } = await abrirContaConectada(() => resposta)

    await screen.findByText('Arquivo baixado.')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(download).toHaveBeenCalledTimes(1)
    expect(arquivos).toHaveLength(1)
    expect(await lerJson(arquivos[0])).toEqual(resposta)
  })

  it('permite tentar novamente e só anuncia sucesso quando chega uma resposta completa', async () => {
    const resposta = vi.fn().mockReturnValueOnce(LEGADO).mockReturnValueOnce(COMPLETO_VAZIO)
    const { rpc, arquivos, download } = await abrirContaConectada(resposta)
    const alerta = await screen.findByRole('alert')
    await waitFor(() => expect(document.activeElement).toBe(alerta))
    expect(download).not.toHaveBeenCalled()

    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))

    await screen.findByText('Arquivo baixado.')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(download).toHaveBeenCalledTimes(1)
    expect(arquivos).toHaveLength(1)
  })
})
