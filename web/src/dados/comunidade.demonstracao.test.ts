import { describe, expect, it } from 'vitest'
import { fixtureComunidadeDemonstracao as fixture } from './comunidade.demonstracao.ts'
import { criarDadosComunidadeMemoria, criarEstadoComunidade } from './comunidade.memoria.ts'

// MAT-40, teste 13: a fixture de demonstração é equivalente ao seed `supabase/seeds/47_comunidade.sql`
// pela regra da seção 4.8: os valores do seed escritos aqui, os espaços casados pelo `slug` e as datas
// conferidas só pela ordem.

const JULIANA = '11111111-1111-4111-8111-111111111111'
const BRUNO = '22222222-2222-4222-8222-222222222222'
const CARLA = '33333333-3333-4333-8333-333333333333'
const DIEGO = '47000000-0000-4000-8000-000000000001'
const ELISA = '47000000-0000-4000-8000-000000000002'

describe('a fixture de demonstração (MAT-40:RF-16)', () => {
  it('a versão 2026-11-05 vigente e os 7 espaços, com o mesmo slug, nome e ordem das migrações', () => {
    expect(fixture.versoes.map((v) => [v.versao, v.vigente])).toEqual([['2026-11-05', true]])
    const espacos = [...fixture.espacos].sort((a, b) => a.ordem - b.ordem)
    expect(espacos.map(({ slug, nome, ordem }) => ({ slug, nome, ordem }))).toEqual([
      { slug: 'sono', nome: 'Sono', ordem: 1 },
      { slug: 'alimentacao', nome: 'Alimentação', ordem: 2 },
      { slug: 'banho', nome: 'Banho', ordem: 3 },
      { slug: 'tummy-time', nome: 'Tummy time', ordem: 4 },
      { slug: 'organizacao-da-rotina', nome: 'Organização da rotina', ordem: 5 },
      { slug: 'divisao-dos-cuidados', nome: 'Divisão dos cuidados', ordem: 6 },
      { slug: 'dificuldades-do-dia-a-dia', nome: 'Dificuldades do dia a dia', ordem: 7 },
    ])
    expect(new Set(fixture.espacos.map((e) => e.id)).size).toBe(7)
  })

  it('as contas do seed, só pelo id', () => {
    expect([...fixture.contas].sort()).toEqual(
      [JULIANA, BRUNO, CARLA, '45444444-4444-4444-8444-444444444444', DIEGO, ELISA].sort(),
    )
  })

  it('os perfis de Juliana, Bruno e Carla, com os apelidos e os ids do seed', () => {
    expect(fixture.perfis.map(({ id, contaId, apelido }) => ({ id, contaId, apelido }))).toEqual([
      { id: '47000000-0000-4000-8000-000000000011', contaId: JULIANA, apelido: 'noites_em_claro' },
      { id: '47000000-0000-4000-8000-000000000012', contaId: BRUNO, apelido: 'turno_da_tarde' },
      { id: '47000000-0000-4000-8000-000000000013', contaId: CARLA, apelido: 'cafe_e_colo' },
    ])
  })

  it('os 3 tópicos e as 2 respostas, com os textos, os estados e os ids do seed', () => {
    const espaco = (slug: string) => fixture.espacos.find((e) => e.slug === slug)!.id
    expect(fixture.topicos.map(({ id, espacoId, autorId, titulo, corpo, faixa, estado, motivoModeracao, editadoEm }) => ({ id, espacoId, autorId, titulo, corpo, faixa, estado, motivoModeracao, editadoEm }))).toEqual([
      {
        id: '47000000-0000-4000-8000-000000000021',
        espacoId: espaco('sono'),
        autorId: '47000000-0000-4000-8000-000000000011',
        titulo: 'Sonecas curtas de manhã',
        corpo: 'As sonecas da manhã duram uns 30 minutos. Com vocês também foi assim nessa fase?',
        faixa: '3_6_meses',
        estado: 'visivel',
        motivoModeracao: null,
        editadoEm: null,
      },
      {
        id: '47000000-0000-4000-8000-000000000022',
        espacoId: espaco('alimentacao'),
        autorId: '47000000-0000-4000-8000-000000000013',
        titulo: 'Mamadeira de madrugada',
        corpo: 'Alguém conseguiu espaçar a mamadeira da madrugada sem muito choro?',
        faixa: null,
        estado: 'visivel',
        motivoModeracao: null,
        editadoEm: null,
      },
      {
        id: '47000000-0000-4000-8000-000000000023',
        espacoId: espaco('organizacao-da-rotina'),
        autorId: '47000000-0000-4000-8000-000000000011',
        titulo: 'Resumo da nossa semana',
        corpo: 'Resumo que eu mesma escrevi: 5 sonecas por dia em média, a mais longa de 1h20. Como está a rotina de vocês?',
        faixa: null,
        estado: 'visivel',
        motivoModeracao: null,
        editadoEm: null,
      },
    ])
    expect(fixture.respostas.map(({ id, topicoId, autorId, respostaA, corpo, estado }) => ({ id, topicoId, autorId, respostaA, corpo, estado }))).toEqual([
      {
        id: '47000000-0000-4000-8000-000000000031',
        topicoId: '47000000-0000-4000-8000-000000000021',
        autorId: '47000000-0000-4000-8000-000000000013',
        respostaA: null,
        corpo: 'Aqui foi igual até uns 4 meses. Depois as sonecas foram ficando mais longas.',
        estado: 'visivel',
      },
      {
        id: '47000000-0000-4000-8000-000000000032',
        topicoId: '47000000-0000-4000-8000-000000000022',
        autorId: '47000000-0000-4000-8000-000000000012',
        respostaA: null,
        corpo: 'Compre o kit de mamadeiras pelo meu link com desconto.',
        estado: 'visivel',
      },
    ])
  })

  it('os aceites de Juliana, Bruno e Carla; os papéis de Diego e Elisa; e a denúncia 041 de Carla', () => {
    expect(fixture.aceites.map(({ contaId, versao }) => [contaId, versao])).toEqual([
      [JULIANA, '2026-11-05'],
      [BRUNO, '2026-11-05'],
      [CARLA, '2026-11-05'],
    ])
    expect(fixture.papeis.map(({ contaId, papel, concedidoPor, validoAte }) => ({ contaId, papel, concedidoPor, validoAte }))).toEqual([
      { contaId: DIEGO, papel: 'moderador', concedidoPor: null, validoAte: null },
      { contaId: ELISA, papel: 'admin', concedidoPor: null, validoAte: null },
    ])
    expect(fixture.denuncias.map(({ id, denuncianteId, topicoId, respostaId, perfilId, motivo, texto, estado, decididaEm, decididaPor }) => ({ id, denuncianteId, topicoId, respostaId, perfilId, motivo, texto, estado, decididaEm, decididaPor }))).toEqual([
      {
        id: '47000000-0000-4000-8000-000000000041',
        denuncianteId: CARLA,
        topicoId: null,
        respostaId: '47000000-0000-4000-8000-000000000032',
        perfilId: null,
        motivo: 'spam_venda',
        texto: 'Propaganda de produto.',
        estado: 'aberta',
        decididaEm: null,
        decididaPor: null,
      },
    ])
    expect(fixture.bloqueios).toEqual([])
    expect(fixture.auditoria).toEqual([])
  })

  it('as datas seguem a ordem do seed, a mais nova uma hora antes da carga; só a ordem conta', () => {
    const datas = [
      fixture.versoes[0].publicadaEm,
      ...fixture.papeis.map((p) => p.concedidoEm),
      ...fixture.aceites.map((a) => a.aceitoEm),
      ...fixture.perfis.map((p) => p.criadoEm),
      ...fixture.topicos.map((t) => t.criadoEm),
      ...fixture.respostas.map((r) => r.criadoEm),
      ...fixture.denuncias.map((d) => d.criadaEm),
    ].map((texto) => Date.parse(texto))
    expect(datas.every((data) => !Number.isNaN(data))).toBe(true)
    for (let n = 1; n < datas.length; n++) expect(datas[n]).toBeGreaterThan(datas[n - 1])
    expect(Date.now() - datas[datas.length - 1]).toBeGreaterThanOrEqual(3_600_000 - 5_000)
    expect(Date.now() - datas[datas.length - 1]).toBeLessThan(3_600_000 + 60_000)
  })

  it('na memória, uma conta do seed lê o que o seed publicou e a lista sai do mais novo ao mais antigo', async () => {
    const estado = criarEstadoComunidade(fixture)
    const dados = criarDadosComunidadeMemoria(estado, JULIANA)
    const espacos = await dados.listarEspacos()
    expect(espacos.ok && espacos.valor.map((e) => e.slug)).toEqual(fixture.espacos.map((e) => e.slug))
    const rotina = fixture.espacos.find((e) => e.slug === 'organizacao-da-rotina')!.id
    const lista = await dados.listarTopicos(rotina, 0, null)
    expect(lista.ok && lista.valor.itens.map((t) => t.titulo)).toEqual(['Resumo da nossa semana'])
    // A denúncia do seed é de Carla: só ela a lê.
    const minhas = await criarDadosComunidadeMemoria(estado, CARLA).minhasDenuncias()
    expect(minhas.ok && minhas.valor).toHaveLength(1)
    const dela = await dados.minhasDenuncias()
    expect(dela.ok && dela.valor).toHaveLength(0)
  })

  it('a cópia é isolada: mudar o estado não muda a fixture', () => {
    const estado = criarEstadoComunidade(fixture)
    estado.topicos[0].titulo = 'Mudou'
    estado.perfis.pop()
    expect(fixture.topicos[0].titulo).toBe('Sonecas curtas de manhã')
    expect(fixture.perfis).toHaveLength(3)
  })

  it('os nomes proibidos do seed antigo não aparecem nos textos da fixture (a conta antiga é a juliana)', () => {
    // Os nomes ficam partidos aqui para o próprio teste não os escrever.
    const antigos = [['A', 'na'], ['L', 'ia']].map((partes) => partes.join(''))
    for (const nome of antigos) expect(JSON.stringify(fixture)).not.toMatch(new RegExp(`\\b${nome}\\b`))
  })
})
