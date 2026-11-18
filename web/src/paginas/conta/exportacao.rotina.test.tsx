import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PESSOAS, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// B01: o provedor REAL da rotina (sem rotina injetada) é o que a exportação da conta lê. A conta que a rotina
// recebe é a cópia que o `ProvedorDadosConta` faz; a exportação procura a fonte pela memória original.

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
})

function simularDownload() {
  const blobs: Blob[] = []
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn((arquivo: Blob) => {
      blobs.push(arquivo)
      return 'blob:arquivo-ficticio'
    }),
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  return { blobs }
}

const lerTexto = (arquivo: Blob) =>
  new Promise<string>((resolver) => {
    const leitor = new FileReader()
    leitor.onload = () => resolver(String(leitor.result))
    leitor.readAsText(arquivo)
  })

interface Exportacao {
  familias: Array<{ registros: unknown[]; notas: unknown[] }>
  registros: unknown[]
  notas: unknown[]
}

/**
 * Baixa os dados com os provedores padrão. Começando por `/app/hoje`, a rota da rotina instancia a `DadosRotina`
 * da página antes de a pessoa ir à conta; começando por `/app/conta`, a rotina nunca é visitada.
 */
async function baixar(pessoa: keyof typeof PESSOAS, inicio: '/app/hoje' | '/app/conta' = '/app/hoje'): Promise<Exportacao> {
  const download = simularDownload()
  const { roteador, unmount } = renderizarComDados(inicio, { sessao: pessoa })
  if (inicio === '/app/hoje') {
    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    await act(async () => {
      await roteador.navigate('/app/conta')
    })
  }
  await screen.findByRole('heading', { level: 1, name: 'Conta' })

  fireEvent.click(screen.getByRole('button', { name: 'Baixar meus dados' }))
  await waitFor(() => expect(download.blobs).toHaveLength(1))
  const json = JSON.parse(await lerTexto(download.blobs[0])) as Exportacao
  unmount()
  return json
}

describe('exportação pelo provedor real da rotina (B01)', () => {
  it('o arquivo exportado pelo provedor real traz os registros e as notas da rotina', async () => {
    // O cuidador recebe no topo o que ele mesmo criou; o responsável, dentro da família.
    const dele = await baixar('bruno')
    expect(dele.registros.length).toBeGreaterThan(0)

    const dela = await baixar('juliana')
    expect(dela.familias[0].registros.length).toBeGreaterThan(0)
  })

  it('o arquivo exportado sem abrir a rotina antes traz os registros e as notas da rotina', async () => {
    const dele = await baixar('bruno', '/app/conta')
    expect(dele.registros.length).toBeGreaterThan(0)

    const dela = await baixar('juliana', '/app/conta')
    expect(dela.familias[0].registros.length).toBeGreaterThan(0)
  })
})
