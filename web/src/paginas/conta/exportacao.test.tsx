import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { uuidV7 } from '../../dados/rotina.uuid.ts'
import { PESSOAS, renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { ID_BEBE, ID_FAMILIA, criarMundoDeTeste, type Mundo } from '../../teste/rotina.fixture.ts'

// RF-13 pela tela (I-F6-1): o arquivo que "Baixar meus dados" baixa leva os registros e as notas da rotina.
// O responsável os recebe dentro da família (`familias[0]`); o cuidador, no topo, só o que ele mesmo criou.

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

interface Item {
  id: string
  criado_por: string
  nota?: string | null
  texto?: string
  excluido_em?: string | null
}

interface Exportacao {
  formato: string
  familias: Array<{ registros: Item[]; notas: Item[] }>
  registros: Item[]
  notas: Item[]
}

/** O que a pessoa da sessão cria pela rotina em memória: uma observação e uma nota. */
async function criarItens(mundo: Mundo, pessoa: keyof typeof PESSOAS, observacao: string, nota: string) {
  mundo.conta.sessaoParaTeste(PESSOAS[pessoa].email)
  const registroId = uuidV7()
  const notaId = uuidV7()
  const gravado = await mundo.rotina.gravarRegistro({
    id: registroId,
    bebeId: ID_BEBE,
    tipo: 'observacao',
    inicio: new Date(Date.now() - 60_000).toISOString(),
    nota: observacao,
  })
  const gravada = await mundo.rotina.gravarNota({ id: notaId, familiaId: ID_FAMILIA, texto: nota })
  if (!gravado.ok || !gravada.ok) throw new Error('não gravou os itens da rotina')
  return { registroId, notaId }
}

async function baixar(mundo: Mundo, pessoa: keyof typeof PESSOAS): Promise<Exportacao> {
  const download = simularDownload()
  renderizarComDados('/app/conta', { dados: mundo.conta, sessao: pessoa })
  await screen.findByRole('heading', { level: 1, name: 'Conta' })

  fireEvent.click(screen.getByRole('button', { name: 'Baixar meus dados' }))
  await waitFor(() => expect(download.blobs).toHaveLength(1))
  return JSON.parse(await lerTexto(download.blobs[0])) as Exportacao
}

describe('exportação com registros e notas (I-F6-1)', () => {
  it('o responsável baixa os registros e as notas da família, de qualquer autor, dentro de familias[0]', async () => {
    const mundo = criarMundoDeTeste({ semRegistros: true })
    const dela = await criarItens(mundo, 'juliana', 'Dormiu a noite toda', 'Pomada só à noite')
    const dele = await criarItens(mundo, 'bruno', 'Acordou às 3h', 'Trocar a fralda antes da mamada')

    const json = await baixar(mundo, 'juliana')

    expect(json.formato).toBe('appmaternidade-exportacao-v1')
    expect(json.familias).toHaveLength(1)
    const { registros, notas } = json.familias[0]
    expect(registros.map((r) => r.id).sort()).toEqual([dela.registroId, dele.registroId].sort())
    expect(registros.find((r) => r.id === dela.registroId)).toMatchObject({ nota: 'Dormiu a noite toda', criado_por: PESSOAS.juliana.id, excluido_em: null })
    expect(registros.find((r) => r.id === dele.registroId)).toMatchObject({ nota: 'Acordou às 3h', criado_por: PESSOAS.bruno.id })
    expect(notas.map((n) => n.id).sort()).toEqual([dela.notaId, dele.notaId].sort())
    expect(notas.find((n) => n.id === dela.notaId)).toMatchObject({ texto: 'Pomada só à noite', criado_por: PESSOAS.juliana.id })
    expect(notas.find((n) => n.id === dele.notaId)).toMatchObject({ texto: 'Trocar a fralda antes da mamada', criado_por: PESSOAS.bruno.id })
    // O que já está dentro de familias[] não se repete no topo.
    expect(json.registros).toEqual([])
    expect(json.notas).toEqual([])
  })

  it('o responsável baixa também o que foi para a lixeira, com excluido_em', async () => {
    const mundo = criarMundoDeTeste({ semRegistros: true })
    const dela = await criarItens(mundo, 'juliana', 'Observação apagada', 'Nota que fica')
    expect((await mundo.rotina.excluirRegistro(dela.registroId)).ok).toBe(true)

    const json = await baixar(mundo, 'juliana')

    const apagado = json.familias[0].registros.find((r) => r.id === dela.registroId)
    expect(apagado).toBeDefined()
    expect(apagado?.excluido_em).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/)
  })

  it('o cuidador baixa só os itens que ele mesmo criou, no topo, e nada da família', async () => {
    const mundo = criarMundoDeTeste({ semRegistros: true })
    const dela = await criarItens(mundo, 'juliana', 'Dormiu a noite toda', 'Pomada só à noite')
    const dele = await criarItens(mundo, 'bruno', 'Acordou às 3h', 'Trocar a fralda antes da mamada')

    const json = await baixar(mundo, 'bruno')

    expect(json.familias).toEqual([])
    expect(json.registros.map((r) => r.id)).toEqual([dele.registroId])
    expect(json.registros[0]).toMatchObject({ nota: 'Acordou às 3h', criado_por: PESSOAS.bruno.id })
    expect(json.notas.map((n) => n.id)).toEqual([dele.notaId])
    expect(json.notas[0]).toMatchObject({ texto: 'Trocar a fralda antes da mamada', criado_por: PESSOAS.bruno.id })

    const texto = JSON.stringify(json)
    for (const id of [dela.registroId, dela.notaId]) expect(texto).not.toContain(id)
    expect(texto).not.toContain('Dormiu a noite toda')
    expect(texto).not.toContain('Pomada só à noite')
  })
})
