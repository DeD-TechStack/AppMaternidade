import { describe, expect, it } from 'vitest'
import { nomeDoAutor } from '../componentes/rotina/formatos.ts'
import { PESSOAS } from '../teste/renderizarComDados.tsx'
import { ID_BEBE, ID_FAMILIA, criarMundoDeTeste } from '../teste/rotina.fixture.ts'
import { uuidV7 } from './rotina.uuid.ts'

// B06: depois de `excluirConta()` o que a pessoa escreveu perde a autoria (`criado_por` nulo), como no banco
// (`on delete set null`), e a tela mostra "pessoa removida".

async function familiaDaRotinaDe(mundo: ReturnType<typeof criarMundoDeTeste>) {
  const contexto = await mundo.rotina.contexto()
  if (!contexto.ok) throw new Error('sem contexto da rotina')
  const familia = contexto.valor.familias.find((candidata) => candidata.id === ID_FAMILIA)
  if (!familia) throw new Error('sem a família de exemplo')
  return familia
}

describe('autoria depois de excluirConta (B06)', () => {
  it('depois de excluirConta o registro da pessoa tem autor nulo', async () => {
    const mundo = criarMundoDeTeste({ semRegistros: true, sessao: 'bruno' })
    const id = uuidV7()
    const gravado = await mundo.rotina.gravarRegistro({
      id,
      bebeId: ID_BEBE,
      tipo: 'observacao',
      inicio: new Date(Date.now() - 60_000).toISOString(),
      nota: 'Acordou às 3h',
    })
    expect(gravado.ok && gravado.valor.criadoPor).toBe(PESSOAS.bruno.id)

    const excluida = await mundo.conta.excluirConta()
    expect(excluida.ok).toBe(true)

    mundo.conta.sessaoParaTeste(PESSOAS.juliana.email)
    const lido = await mundo.rotina.registro(id)
    expect(lido.ok).toBe(true)
    if (!lido.ok || lido.valor === null) throw new Error('Juliana não vê o registro')
    expect(lido.valor.criadoPor).toBeNull()
    expect(lido.valor.encerradoPor).toBeNull()
    expect(nomeDoAutor(await familiaDaRotinaDe(mundo), lido.valor.criadoPor)).toBe('pessoa removida')
  })

  it('depois de excluirConta a nota da pessoa tem autor nulo', async () => {
    const mundo = criarMundoDeTeste({ semRegistros: true, sessao: 'bruno' })
    const id = uuidV7()
    const gravada = await mundo.rotina.gravarNota({ id, familiaId: ID_FAMILIA, texto: 'Trocar a fralda antes da mamada' })
    expect(gravada.ok && gravada.valor.criadoPor).toBe(PESSOAS.bruno.id)

    const excluida = await mundo.conta.excluirConta()
    expect(excluida.ok).toBe(true)

    mundo.conta.sessaoParaTeste(PESSOAS.juliana.email)
    const lista = await mundo.rotina.notas(ID_FAMILIA, null)
    expect(lista.ok).toBe(true)
    const nota = lista.ok ? lista.valor.itens.find((item) => item.id === id) : undefined
    if (!nota) throw new Error('Juliana não vê a nota')
    expect(nota.criadoPor).toBeNull()
    expect(nomeDoAutor(await familiaDaRotinaDe(mundo), nota.criadoPor)).toBe('pessoa removida')
  })
})
