import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PESSOAS } from '../teste/renderizarComDados.tsx'
import { ID_BEBE, ID_FAMILIA, criarMundoDeTeste } from '../teste/rotina.fixture.ts'
import { FAMILIAS_DEMONSTRACAO } from './conta.demonstracao.ts'
import { diaDaFamilia, formatarIdade } from './rotina.dia.ts'
import { criarFixtureRotinaDemonstracao } from './rotina.demonstracao.ts'
import { ehUuidV7 } from './rotina.uuid.ts'

// R6 da revisão do 38a (R38-33): duas fixtures separadas. A de TESTE (`teste/rotina.fixture.ts`) só tem o que os
// testes da base conferem, e Juliana não tem nenhum registro; a de DEMONSTRAÇÃO (`rotina.demonstracao.ts`) é a
// rotina do seed. Uma não reutiliza a outra. O relógio é o falso, às 10:00 de 5/11/2026 (hora do aparelho).

const INSTANTE = new Date('2026-11-05T10:00:00')
const MIN = 60_000
const SP = 'America/Sao_Paulo'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

afterEach(() => {
  vi.useRealTimers()
})

// No jsdom o `URL` global é o do jsdom: o `href` (texto) vai ao `fileURLToPath` (ver `teste/fontes.ts`).
// O código sem os comentários: os comentários citam a outra fixture justamente para dizer que não a usam.
const lerFonte = (caminho: string) =>
  readFileSync(fileURLToPath(new URL(caminho, import.meta.url).href), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
const hora = (iso: string, fuso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(Date.parse(iso))

describe('R6: a fixture de teste (R38-33)', () => {
  it('R6: Juliana é a responsável da Família Exemplo e não tem nenhum registro próprio (sem marco)', async () => {
    const { fixture, conta } = criarMundoDeTeste()

    expect(fixture.registros.filter((r) => r.criadoPor === PESSOAS.juliana.id || r.encerradoPor === PESSOAS.juliana.id)).toEqual([])
    expect(fixture.notas.filter((n) => n.criadoPor === PESSOAS.juliana.id)).toEqual([])
    const detalhe = await conta.detalheFamilia(ID_FAMILIA)
    expect(detalhe.ok && detalhe.valor.membros.find((m) => m.contaId === PESSOAS.juliana.id)?.papel).toBe('responsavel')
  })

  it('R6: Bruno é cuidador e Carla é cuidadora só nesta fixture, na Família Exemplo', async () => {
    const { conta } = criarMundoDeTeste()

    const detalhe = await conta.detalheFamilia(ID_FAMILIA)
    expect(detalhe.ok).toBe(true)
    if (!detalhe.ok) return
    const papel = (id: string) => detalhe.valor.membros.find((m) => m.contaId === id)?.papel
    expect(papel(PESSOAS.bruno.id)).toBe('cuidador')
    expect(papel(PESSOAS.carla.id)).toBe('cuidador')
    expect(FAMILIAS_DEMONSTRACAO.exemplo).toBe(ID_FAMILIA)
  })

  it('R6: Heloísa nasceu 3 meses e 10 dias antes do dia do relógio ("3 meses")', async () => {
    const { conta, agora } = criarMundoDeTeste()

    const detalhe = await conta.detalheFamilia(ID_FAMILIA)
    expect(detalhe.ok).toBe(true)
    if (!detalhe.ok) return
    const heloisa = detalhe.valor.bebes.find((b) => b.id === ID_BEBE)!
    expect(heloisa.nome).toBe('Heloísa')
    expect(heloisa.nascimento).toBe('2026-07-26')
    expect(formatarIdade(heloisa.nascimento, diaDaFamilia(agora, Intl.DateTimeFormat().resolvedOptions().timeZone))).toBe('3 meses')
  })

  it('R6: a sessão de sono de Bruno em andamento começou há 72 minutos', () => {
    const { fixture, agora } = criarMundoDeTeste()

    const sono = fixture.registros.filter((r) => r.tipo === 'sono')
    expect(sono).toHaveLength(1)
    expect(sono[0].fim).toBeNull()
    expect(sono[0].criadoPor).toBe(PESSOAS.bruno.id)
    expect(agora - Date.parse(sono[0].inicio)).toBe(72 * MIN)
  })

  it('R6: a nota "Pomada só à noite." é de Carla, criada às 22:40 mais recentes e em destaque por mais 24 horas', () => {
    const { fixture, agora } = criarMundoDeTeste()

    expect(fixture.notas).toHaveLength(1)
    const [nota] = fixture.notas
    expect(nota.texto).toBe('Pomada só à noite.')
    expect(nota.criadoPor).toBe(PESSOAS.carla.id)
    const criada = new Date(nota.criadaEm)
    expect([criada.getHours(), criada.getMinutes()]).toEqual([22, 40])
    expect(Date.parse(nota.criadaEm)).toBeLessThanOrEqual(agora)
    expect(agora - Date.parse(nota.criadaEm)).toBeLessThan(24 * 60 * MIN)
    expect(Date.parse(nota.destaqueAte!) - agora).toBe(24 * 60 * MIN)
  })

  it('R6: a mamada de Bruno termina há 130 minutos, a fralda de Bruno é de há 50 e o tummy time de Carla termina às 17:30 de ontem', () => {
    const { fixture, agora } = criarMundoDeTeste()

    const de = (tipo: string) => fixture.registros.find((r) => r.tipo === tipo)!
    expect(de('mamada').criadoPor).toBe(PESSOAS.bruno.id)
    expect(agora - Date.parse(de('mamada').fim!)).toBe(130 * MIN)
    expect(de('fralda').criadoPor).toBe(PESSOAS.bruno.id)
    expect(agora - Date.parse(de('fralda').inicio)).toBe(50 * MIN)
    expect(de('tummy').criadoPor).toBe(PESSOAS.carla.id)
    const fim = new Date(de('tummy').fim!)
    const ontem = new Date(agora)
    ontem.setDate(ontem.getDate() - 1)
    expect([fim.getFullYear(), fim.getMonth(), fim.getDate(), fim.getHours(), fim.getMinutes()]).toEqual([
      ontem.getFullYear(),
      ontem.getMonth(),
      ontem.getDate(),
      17,
      30,
    ])
  })

  it('R6: só esses quatro registros e uma nota; a variação "dia completo" é à parte e os acrescenta sem mexer neles', () => {
    const estrita = criarMundoDeTeste()
    expect(estrita.fixture.registros.map((r) => r.tipo)).toEqual(['sono', 'fralda', 'mamada', 'tummy'])

    const completa = criarMundoDeTeste({ diaCompleto: true })
    expect(completa.fixture.registros.length).toBeGreaterThan(estrita.fixture.registros.length)
    expect(completa.fixture.registros.slice(0, 4)).toEqual(estrita.fixture.registros)
  })

  it('R6: a fixture de teste não reutiliza a de demonstração (nenhum import dela, nem os ids)', () => {
    const fonte = lerFonte('../teste/rotina.fixture.ts')

    expect(fonte).not.toMatch(/rotina\.demonstracao/)
    expect(fonte).not.toMatch(/criarFixtureRotinaDemonstracao/)
    const { fixture } = criarMundoDeTeste({ diaCompleto: true })
    const demonstracao = criarFixtureRotinaDemonstracao(Date.now())
    const idsDaDemonstracao = new Set([...demonstracao.registros.map((r) => r.id), ...demonstracao.notas.map((n) => n.id)])
    expect(fixture.registros.filter((r) => idsDaDemonstracao.has(r.id))).toEqual([])
  })
})

describe('R6: a fixture de demonstração (rotina do seed 46_rotina.sql)', () => {
  const agora = () => Date.now()

  it('R6: de D-7 a D-1 há 16, 16, 16, 17, 16, 16, 16 registros por dia (o excluído de D-2 não conta)', () => {
    const { registros } = criarFixtureRotinaDemonstracao(agora())

    const hoje = diaDaFamilia(agora(), SP)
    const contagem = (k: number) => {
      const dia = new Date(Date.parse(`${hoje}T12:00:00Z`) - k * 86_400_000).toISOString().slice(0, 10)
      return registros.filter((r) => r.excluidoEm === null && diaDaFamilia(Date.parse(r.inicio), SP) === dia).length
    }
    expect([7, 6, 5, 4, 3, 2, 1].map(contagem)).toEqual([16, 16, 16, 17, 16, 16, 16])
    // Fora de D-7..D-1 só há a sessão de hoje: 7 dias + observação + excluído (114 linhas) + a de hoje.
    expect(registros).toHaveLength(115)
  })

  it('R6: as 6 exceções do seed', () => {
    const { registros } = criarFixtureRotinaDemonstracao(agora())
    const hoje = diaDaFamilia(agora(), SP)
    const dia = (k: number) => new Date(Date.parse(`${hoje}T12:00:00Z`) - k * 86_400_000).toISOString().slice(0, 10)
    const doDia = (k: number) => registros.filter((r) => diaDaFamilia(Date.parse(r.inicio), SP) === dia(k))
    const mae = '11111111-1111-4111-8111-111111111111'
    const bruno = '22222222-2222-4222-8222-222222222222'

    // 1 (D-4): observação da mãe, às 14:50.
    const observacao = doDia(4).filter((r) => r.tipo === 'observacao')
    expect(observacao.map((r) => [r.nota, r.criadoPor, hora(r.inicio, SP)])).toEqual([['Arrotou pouco depois da mamada.', mae, '14:50']])
    // 2 (D-3): o sono das 20:30 termina às 00:20 de D-2.
    const sonoLongo = doDia(3).find((r) => r.tipo === 'sono' && hora(r.inicio, SP) === '20:30')!
    expect([hora(sonoLongo.fim!, SP), diaDaFamilia(Date.parse(sonoLongo.fim!), SP)]).toEqual(['00:20', dia(2)])
    // 3 (D-2): a fralda de Bruno, excluída pela mãe.
    const excluidos = registros.filter((r) => r.excluidoEm !== null)
    expect(excluidos.map((r) => [r.tipo, r.criadoPor, r.excluidoPor, diaDaFamilia(Date.parse(r.inicio), SP)])).toEqual([['fralda', bruno, mae, dia(2)]])
    // 4 (D-1): o sono das 13:00 nasce ao vivo pela mãe e Bruno o encerra às 14:40.
    const sonoDaTarde = doDia(1).find((r) => r.tipo === 'sono' && hora(r.inicio, SP) === '13:00')!
    expect([sonoDaTarde.origem, sonoDaTarde.criadoPor, sonoDaTarde.encerradoPor, hora(sonoDaTarde.fim!, SP)]).toEqual(['ao_vivo', mae, bruno, '14:40'])
    // 5 (D-1): a mamadeira das 11:00 foi corrigida de 90 para 100 ml.
    const mamadeira = doDia(1).find((r) => r.tipo === 'mamadeira' && hora(r.inicio, SP) === '11:00')!
    expect([mamadeira.detalhes.ml, mamadeira.versao]).toEqual([100, 2])
    // 6 (hoje): o sono de Bruno em andamento, ao vivo, há 72 minutos.
    const emAndamento = registros.filter((r) => r.fim === null && r.tipo === 'sono')
    expect(emAndamento).toHaveLength(1)
    expect([emAndamento[0].criadoPor, emAndamento[0].origem, agora() - Date.parse(emAndamento[0].inicio)]).toEqual([bruno, 'ao_vivo', 72 * MIN])
  })

  it('R6: tudo no bebê e na Família Exemplo da fixture de conta, com ids v7 únicos e fuso de São Paulo (-180)', () => {
    const { registros, notas } = criarFixtureRotinaDemonstracao(agora())

    expect(new Set(registros.map((r) => r.bebeId))).toEqual(new Set([ID_BEBE]))
    expect(new Set([...registros, ...notas].map((x) => x.familiaId))).toEqual(new Set([ID_FAMILIA]))
    const ids = [...registros.map((r) => r.id), ...notas.map((n) => n.id)]
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every(ehUuidV7)).toBe(true)
    expect(new Set(registros.map((r) => [r.fuso, r.deslocamentoMin].join('|')))).toEqual(new Set([`${SP}|-180`]))
  })

  it('R6: as notas: "Pomada só à noite." da mãe, em destaque por 1 dia, e "Fraldas P no armário de cima." de Bruno', () => {
    const { notas } = criarFixtureRotinaDemonstracao(agora())

    const pomada = notas.find((n) => n.texto === 'Pomada só à noite.')!
    expect(pomada.criadoPor).toBe('11111111-1111-4111-8111-111111111111')
    expect(Date.parse(pomada.destaqueAte!) - agora()).toBe(24 * 60 * MIN)
    const fraldas = notas.find((n) => n.texto === 'Fraldas P no armário de cima.')!
    expect(fraldas.criadoPor).toBe('22222222-2222-4222-8222-222222222222')
    expect(fraldas.destaqueAte).toBeNull()
    expect(notas).toHaveLength(2)
  })

  it('R6: a demonstração não é a fixture de teste: não importa nada de teste e não traz Carla como autora', () => {
    const fonte = lerFonte('./rotina.demonstracao.ts')

    expect(fonte).not.toMatch(/teste\//)
    expect(fonte).not.toMatch(/carla/i)
    expect(fonte).not.toMatch(/PESSOAS\b(?!_DEMONSTRACAO)/)
  })
})
