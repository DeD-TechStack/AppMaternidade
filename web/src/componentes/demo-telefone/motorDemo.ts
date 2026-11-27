import {
  BEBE_DEMONSTRACAO,
  criarFixtureDemonstracao,
  FAMILIAS_DEMONSTRACAO,
  PESSOAS_DEMONSTRACAO,
} from '../../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria, type DadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarDadosRotinaMemoria, type FixtureRotina } from '../../dados/rotina.memoria.ts'
import type { DadosRotina, DetalhesRegistro, Nota, Registro, TipoRegistro } from '../../dados/rotina.tipos.ts'
import { criarRelogioDemo, instanteDoDiaDemo, type RelogioDemo } from './relogioDemo.ts'
import type { FluxoDemoTelefone } from './textosCasca.ts'

// Motor privado de dados da demo: cria instâncias novas e isoladas de DadosContaMemoria e
// DadosRotinaMemoria por telefone montado. Nunca importa dados/conta.ts (valores), dados/rotina.ts
// (valores), dados/cliente.ts, *.supabase.ts ou qualquer armazenamento do navegador.

export interface MotorDemo {
  conta: DadosContaMemoria
  rotina: DadosRotina
  relogio: RelogioDemo
  familiaId: string
  bebeId: string
  pessoas: {
    juliana: { id: string; email: string; nome: string }
    icaro: { id: string; email: string; nome: string }
  }
}

const HORA_MS = 60 * 60_000

const idSemente = (n: number) => `48${n.toString(16).padStart(6, '0')}-0000-7000-8000-000000000000`

interface LinhaSemente {
  hora: number
  minuto: number
  fimHora: number | null
  fimMinuto: number | null
  tipo: TipoRegistro
  detalhes?: DetalhesRegistro
  nota?: string | null
  autor: 'juliana' | 'icaro'
  origem?: 'ao_vivo' | 'retroativo'
}

const LINHAS_ATE_1730: readonly LinhaSemente[] = [
  { hora: 3, minuto: 25, fimHora: null, fimMinuto: null, tipo: 'fralda', detalhes: { conteudo: 'xixi' }, autor: 'icaro' },
  { hora: 3, minuto: 30, fimHora: 6, fimMinuto: 15, tipo: 'sono', autor: 'icaro' },
  { hora: 6, minuto: 30, fimHora: 6, fimMinuto: 50, tipo: 'mamada', detalhes: { lado: 'direito' }, autor: 'juliana' },
  { hora: 7, minuto: 0, fimHora: null, fimMinuto: null, tipo: 'fralda', detalhes: { conteudo: 'coco' }, autor: 'juliana' },
  { hora: 9, minuto: 0, fimHora: 10, fimMinuto: 30, tipo: 'sono', autor: 'juliana' },
  {
    hora: 11,
    minuto: 0,
    fimHora: null,
    fimMinuto: null,
    tipo: 'mamadeira',
    detalhes: { ml: 100, conteudo: 'leite_materno' },
    autor: 'juliana',
  },
  { hora: 11, minuto: 15, fimHora: null, fimMinuto: null, tipo: 'fralda', detalhes: { conteudo: 'ambos' }, autor: 'juliana' },
  { hora: 13, minuto: 0, fimHora: 14, fimMinuto: 40, tipo: 'sono', autor: 'juliana' },
  { hora: 15, minuto: 0, fimHora: 15, fimMinuto: 8, tipo: 'tummy', autor: 'juliana' },
  { hora: 16, minuto: 0, fimHora: 16, fimMinuto: 20, tipo: 'mamada', detalhes: { lado: 'ambos' }, autor: 'juliana' },
  { hora: 17, minuto: 30, fimHora: null, fimMinuto: null, tipo: 'fralda', detalhes: { conteudo: 'xixi' }, autor: 'icaro' },
]

const LINHAS_NOITE: readonly LinhaSemente[] = [
  ...LINHAS_ATE_1730,
  { hora: 18, minuto: 0, fimHora: 18, fimMinuto: 40, tipo: 'sono', autor: 'icaro' },
  { hora: 19, minuto: 30, fimHora: null, fimMinuto: null, tipo: 'mamadeira', detalhes: { ml: 120, conteudo: 'formula' }, autor: 'icaro' },
  // Sono em andamento desde as 20:30, por Ícaro (1:12:02 às 21:42:02).
  { hora: 20, minuto: 30, fimHora: null, fimMinuto: null, tipo: 'sono', autor: 'icaro', origem: 'ao_vivo' },
]

const LINHAS_FAMILIA: readonly LinhaSemente[] = [
  ...LINHAS_ATE_1730,
  { hora: 17, minuto: 45, fimHora: 18, fimMinuto: 5, tipo: 'sono', autor: 'icaro' },
]

function montarFixtureRotina(fluxo: FluxoDemoTelefone, relogio: RelogioDemo): FixtureRotina {
  const { responsavel: juliana, icaro } = PESSOAS_DEMONSTRACAO
  const aparelho = relogio.aparelho()
  const linhas = fluxo === 'hoje' ? LINHAS_NOITE : fluxo === 'familia' ? LINHAS_FAMILIA : LINHAS_ATE_1730
  const iso = (ms: number) => new Date(ms).toISOString()

  const registros: Registro[] = linhas.map((item, indice) => {
    const inicioMs = instanteDoDiaDemo(item.hora, item.minuto)
    const fimMs = item.fimHora !== null && item.fimMinuto !== null ? instanteDoDiaDemo(item.fimHora, item.fimMinuto) : null
    const autorId = item.autor === 'juliana' ? juliana.id : icaro.id
    const recebido = iso(fimMs ?? inicioMs)
    return {
      id: idSemente(indice + 1),
      familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
      bebeId: BEBE_DEMONSTRACAO,
      tipo: item.tipo,
      inicio: iso(inicioMs),
      fim: fimMs === null ? null : iso(fimMs),
      detalhes: item.detalhes ? { ...item.detalhes } : {},
      nota: item.nota ?? null,
      origem: item.origem ?? 'retroativo',
      fuso: aparelho.fuso,
      deslocamentoMin: aparelho.deslocamentoMin,
      criadoPor: autorId,
      encerradoPor: fimMs === null ? null : autorId,
      versao: 1,
      recebidoEm: recebido,
      atualizadoEm: recebido,
      excluidoEm: null,
      excluidoPor: null,
    }
  })

  const criadaEm = iso(instanteDoDiaDemo(16, 25))
  const criadaIcaro = iso(instanteDoDiaDemo(17, 32))
  const destaqueAte = iso(relogio.agora() + 24 * HORA_MS)

  const notas: Nota[] = [
    {
      id: idSemente(201),
      familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
      bebeId: BEBE_DEMONSTRACAO,
      texto: 'Pomada só à noite.',
      destaqueAte,
      criadoPor: juliana.id,
      criadaEm,
      versao: 1,
      atualizadoEm: criadaEm,
      excluidaEm: null,
      excluidaPor: null,
    },
    {
      id: idSemente(202),
      familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
      bebeId: null,
      texto: 'Fraldas P no armário de cima.',
      destaqueAte: null,
      criadoPor: icaro.id,
      criadaEm: criadaIcaro,
      versao: 1,
      atualizadoEm: criadaIcaro,
      excluidaEm: null,
      excluidaPor: null,
    },
  ]

  return { registros, notas }
}

function horarioAncora(fluxo: FluxoDemoTelefone): [number, number, number] {
  switch (fluxo) {
    case 'historico':
      return [17, 35, 0]
    case 'hoje':
      return [21, 42, 2]
    case 'familia':
      return [18, 10, 0]
    case 'notas':
      return [20, 26, 0]
  }
}

export function criarMotorDemo(fluxo: FluxoDemoTelefone): MotorDemo {
  const [h, m, s] = horarioAncora(fluxo)
  const relogio = criarRelogioDemo(h, m, s)
  const fixtureConta = criarFixtureDemonstracao(relogio.agora())
  // Ajusta o fuso da família de demonstração para o mesmo da âncora local, evitando divergência de dia/fuso na prévia.
  for (const familia of fixtureConta.familias) familia.fuso = relogio.fuso
  for (const contaItem of fixtureConta.contas) contaItem.fuso = relogio.fuso

  const conta = criarDadosContaMemoria(fixtureConta, { agora: relogio.agora })
  const { responsavel: juliana, icaro } = PESSOAS_DEMONSTRACAO
  // Histórico e Hoje à noite são contados na voz de Ícaro; Família e Notas começam em Juliana.
  const inicial = fluxo === 'historico' || fluxo === 'hoje' ? icaro.email : juliana.email
  conta.sessaoParaTeste(inicial)

  const fixtureRotina = montarFixtureRotina(fluxo, relogio)
  const rotinaBase = criarDadosRotinaMemoria(conta, fixtureRotina, {
    agora: relogio.agora,
    aparelho: relogio.aparelho,
  })
  // Avança 1 min determinístico ao salvar cada nova nota, preservando ordem mais-nova-primeiro sem usar relógio real.
  const rotina: DadosRotina = {
    ...rotinaBase,
    gravarNota(entrada) {
      relogio.avancarMinutos(1)
      return rotinaBase.gravarNota(entrada)
    },
  }

  return {
    conta,
    rotina,
    relogio,
    familiaId: FAMILIAS_DEMONSTRACAO.exemplo,
    bebeId: BEBE_DEMONSTRACAO,
    pessoas: {
      juliana: { id: juliana.id, email: juliana.email, nome: juliana.nome },
      icaro: { id: icaro.id, email: icaro.email, nome: icaro.nome },
    },
  }
}
