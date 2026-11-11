import { BEBE_DEMONSTRACAO, FAMILIAS_DEMONSTRACAO } from '../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria, type DadosContaMemoria, type FixtureConta } from '../dados/conta.memoria.ts'
import type { Bebe } from '../dados/conta.ts'
import type { Papel } from '../dados/comum.ts'
import { diaDaFamilia } from '../dados/rotina.dia.ts'
import { criarDadosRotinaMemoria, type FixtureRotina } from '../dados/rotina.memoria.ts'
import {
  ehTipoDeSessao,
  type DadosRotina,
  type DetalhesRegistro,
  type Nota,
  type Registro,
  type TipoRegistro,
} from '../dados/rotina.tipos.ts'
import { PESSOAS, criarFixtureDeTeste } from './renderizarComDados.tsx'

// A fixture de TESTE da rotina (R38-33). Ela é só dos testes e não reutiliza a de demonstração
// (`dados/rotina.demonstracao.ts`, que segue o seed): a conta é Juliana (responsável), com Bruno (cuidador),
// Carla (cuidadora, só nesta fixture, na Família Exemplo) e a bebê Heloísa, nascida 3 meses e 10 dias antes do
// dia do relógio. Os horários nascem do relógio do teste e no fuso do aparelho. A rotina tem só o que os
// testes conferem (R38-31, item 1): a sessão de sono de Bruno há 72 minutos, a nota `Pomada só à noite.` de
// Carla às 22:40 mais recentes, uma mamada de Bruno com fim há 130 minutos, uma fralda de Bruno há 50 minutos
// e um tummy time de Carla com fim às 17:30 de ontem. Nenhum registro de Juliana: sem marco, o bloco "Desde o
// seu último registro" não aparece. Quem precisa de mais monta a variação (`comDiaCompleto`, `ajustarRotina`).
// Só dados fictícios.

export const ID_FAMILIA = FAMILIAS_DEMONSTRACAO.exemplo
export const ID_BEBE = BEBE_DEMONSTRACAO

/** O fuso do aparelho que roda os testes. */
export const FUSO_DO_APARELHO = Intl.DateTimeFormat().resolvedOptions().timeZone

const MINUTO = 60_000
const HORA = 60 * MINUTO

const idDeTeste = (numero: number) => `a0000000-0000-7000-8000-${String(numero).padStart(12, '0')}`

/** O último instante, antes de `agora`, em que o relógio do aparelho marcou `hora:minuto`. */
function ultimaVezQueMarcou(agora: number, hora: number, minuto: number): number {
  const data = new Date(agora)
  data.setHours(hora, minuto, 0, 0)
  if (data.getTime() > agora) data.setDate(data.getDate() - 1)
  return data.getTime()
}

/** `hora:minuto` de ontem, no relógio do aparelho. */
function ontemAs(agora: number, hora: number, minuto: number): number {
  const data = new Date(agora)
  data.setDate(data.getDate() - 1)
  data.setHours(hora, minuto, 0, 0)
  return data.getTime()
}

/** A data de nascimento de Heloísa: 3 meses e 10 dias antes do dia do relógio, no fuso da família. */
function nascimentoDeHeloisa(agora: number, fuso: string): string {
  const [ano, mes, dia] = diaDaFamilia(agora, fuso).split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1 - 3, dia))
  data.setUTCDate(data.getUTCDate() - 10)
  return data.toISOString().slice(0, 10)
}

interface Construtor {
  registro: (
    numero: number,
    tipo: TipoRegistro,
    autor: string,
    inicio: number,
    fim: number | null,
    resto?: { detalhes?: DetalhesRegistro; nota?: string | null },
  ) => Registro
}

function construtor(fuso: string): Construtor {
  const iso = (instante: number) => new Date(instante).toISOString()
  return {
    registro: (numero, tipo, autor, inicio, fim, resto = {}) => {
      // O servidor recebeu o registro quando a pessoa o enviou: no fim da sessão, ou no instante do pontual.
      const recebido = iso(fim ?? inicio)
      return {
        id: idDeTeste(numero),
        familiaId: ID_FAMILIA,
        bebeId: ID_BEBE,
        tipo,
        inicio: iso(inicio),
        fim: fim === null ? null : iso(fim),
        detalhes: resto.detalhes ?? {},
        nota: resto.nota ?? null,
        origem: 'ao_vivo',
        fuso,
        deslocamentoMin: 0 - new Date(inicio).getTimezoneOffset(),
        criadoPor: autor,
        encerradoPor: ehTipoDeSessao(tipo) && fim !== null ? autor : null,
        versao: 1,
        recebidoEm: recebido,
        atualizadoEm: recebido,
        excluidoEm: null,
        excluidoPor: null,
      }
    },
  }
}

/** A rotina de teste do R38-33, sem nada além do que os testes da base conferem. */
function criarRotinaDeTeste(agora: number, fuso: string): FixtureRotina {
  const { registro } = construtor(fuso)
  const { bruno, carla } = PESSOAS
  const fimDoTummy = ontemAs(agora, 17, 30)
  const criadaEm = new Date(ultimaVezQueMarcou(agora, 22, 40)).toISOString()

  const registros: Registro[] = [
    registro(1, 'sono', bruno.id, agora - 72 * MINUTO, null),
    registro(2, 'fralda', bruno.id, agora - 50 * MINUTO, null, { detalhes: { conteudo: 'xixi' } }),
    registro(3, 'mamada', bruno.id, agora - 148 * MINUTO, agora - 130 * MINUTO, { detalhes: { lado: 'esquerdo' } }),
    registro(4, 'tummy', carla.id, fimDoTummy - 10 * MINUTO, fimDoTummy),
  ]
  const notas: Nota[] = [
    {
      id: idDeTeste(900),
      familiaId: ID_FAMILIA,
      bebeId: null,
      texto: 'Pomada só à noite.',
      destaqueAte: new Date(agora + 24 * HORA).toISOString(),
      criadoPor: carla.id,
      criadaEm,
      versao: 1,
      atualizadoEm: criadaEm,
      excluidaEm: null,
      excluidaPor: null,
    },
  ]
  return { registros, notas }
}

/**
 * A variação "dia completo": a rotina de teste mais o dia de Heloísa que os testes de totais, de Desde o seu
 * último registro, de Últimos com cinco tipos e de sessões anteriores precisam. Sem Juliana não há marco; aqui
 * ela registrou uma fralda às 07:50 (130 minutos antes), o que dá o marco `recebido_em` = 07:50. Soma 3
 * mamadas (uma é mamadeira), 3 fraldas e 4 h 20 de sono; as três sonecas anteriores são de Bruno e de Juliana.
 * Os registros são só desta variação: a fixture de demonstração não entra aqui.
 */
export const comDiaCompleto = (fixture: FixtureRotina, agora: number = Date.now()): FixtureRotina => {
  const fuso = fixture.registros[0]?.fuso ?? FUSO_DO_APARELHO
  const { registro } = construtor(fuso)
  const { juliana, bruno } = PESSOAS
  const extras: Registro[] = [
    registro(11, 'fralda', juliana.id, agora - 130 * MINUTO, null, { detalhes: { conteudo: 'coco' } }),
    registro(12, 'sono', bruno.id, agora - (4 * HORA + 5 * MINUTO), agora - (3 * HORA + 20 * MINUTO), { nota: 'no carrinho' }),
    registro(13, 'mamada', juliana.id, agora - (5 * HORA + 10 * MINUTO), agora - (4 * HORA + 52 * MINUTO), { detalhes: { lado: 'direito' } }),
    registro(14, 'sono', juliana.id, agora - (6 * HORA + 30 * MINUTO), agora - (5 * HORA + 40 * MINUTO), { nota: 'no berço' }),
    registro(15, 'fralda', bruno.id, agora - 6 * HORA, null, { detalhes: { conteudo: 'ambos' } }),
    registro(16, 'mamadeira', bruno.id, agora - 8 * HORA, null, { detalhes: { ml: 90, conteudo: 'leite_materno' } }),
    registro(17, 'sono', juliana.id, agora - 11 * HORA, agora - (7 * HORA + 15 * MINUTO), { nota: 'sono da noite' }),
    registro(18, 'tummy', juliana.id, agora - (21 * HORA), agora - (20 * HORA + 52 * MINUTO)),
  ]
  return { ...fixture, registros: [...fixture.registros, ...extras] }
}

/** A rotina de teste sem a sessão de sono de Bruno em andamento. */
export const semSessaoEmAndamento = (fixture: FixtureRotina): FixtureRotina => ({
  ...fixture,
  registros: fixture.registros.filter((registro) => !(ehTipoDeSessao(registro.tipo) && registro.fim === null)),
})

/**
 * A rotina de teste com uma sessão em andamento de um tipo, começada há um tempo, no lugar da de sono de
 * Bruno (o padrão é a de sono de Bruno, há 72 minutos).
 */
export const comSessaoEmAndamento =
  (tipo: TipoRegistro, ha = 72 * 60_000, autor: string = PESSOAS.bruno.id) =>
  (fixture: FixtureRotina): FixtureRotina => {
    const base = semSessaoEmAndamento(fixture)
    const modelo = fixture.registros.find((registro) => registro.tipo === 'sono' && registro.fim === null)!
    const inicio = new Date(Date.now() - ha).toISOString()
    return { ...base, registros: [...base.registros, { ...modelo, tipo, inicio, recebidoEm: inicio, criadoPor: autor }] }
  }

export interface OpcoesMundo {
  /** A pessoa que já está entrada; `null` é ninguém. Padrão: Juliana. */
  sessao?: keyof typeof PESSOAS | null
  /** O fuso da família; padrão: o do aparelho. */
  fusoDaFamilia?: string
  /** O papel de Davi na família de exemplo (sem a opção, ele não tem vínculo). */
  papelDeDavi?: Papel
  /** O papel de Bruno; padrão: cuidador. */
  papelDeBruno?: Papel
  /** A bebê Heloísa arquivada. */
  bebeArquivado?: boolean
  /** Bebês a mais; sem `familiaId`, na família de exemplo. */
  bebesExtras?: Array<Omit<Bebe, 'familiaId'> & { familiaId?: string }>
  /** Juliana também tem vínculo na "Família Teste" (que não tem bebê), com este papel. */
  papelNaFamiliaTeste?: Papel
  /** Nenhum bebê em nenhuma família. */
  semBebes?: boolean
  /** Sem os registros da rotina de teste (a rotina começa vazia). */
  semRegistros?: boolean
  /** A variação `comDiaCompleto`: totais do dia, marco de Juliana, cinco tipos nos Últimos e sonecas anteriores. */
  diaCompleto?: boolean
  /** Troca ou acrescenta registros e notas à fixture da rotina (depois de `semRegistros` e `diaCompleto`). */
  ajustarRotina?: (fixture: FixtureRotina) => FixtureRotina
}

export interface Mundo {
  agora: number
  conta: DadosContaMemoria
  rotina: DadosRotina
  fixture: FixtureRotina
}

/** A conta em memória com a família de teste, e a rotina em memória sobre ela. */
export function criarMundoDeTeste(opcoes: OpcoesMundo = {}): Mundo {
  const agora = Date.now()
  const base: FixtureConta = criarFixtureDeTeste(agora)
  const fuso = opcoes.fusoDaFamilia ?? FUSO_DO_APARELHO
  const nascimento = nascimentoDeHeloisa(agora, fuso)
  const vinculo = (id: string, contaId: string, papel: Papel, dias: number) => ({
    id,
    familiaId: ID_FAMILIA,
    contaId,
    papel,
    estado: 'ativo' as const,
    validoAte: null,
    criadoEm: new Date(agora - dias * 86_400_000).toISOString(),
    concedidoPor: PESSOAS.juliana.id,
  })
  const conta = criarDadosContaMemoria({
    ...base,
    familias: base.familias.map((familia) => ({ ...familia, fuso })),
    vinculos: [
      ...base.vinculos.map((v) => (v.contaId === PESSOAS.bruno.id && opcoes.papelDeBruno ? { ...v, papel: opcoes.papelDeBruno } : v)),
      vinculo('b4444444-4444-4444-8444-444444444444', PESSOAS.carla.id, 'cuidador', 28),
      ...(opcoes.papelDeDavi ? [vinculo('b5555555-5555-4555-8555-555555555555', PESSOAS.davi.id, opcoes.papelDeDavi, 27)] : []),
      ...(opcoes.papelNaFamiliaTeste
        ? [{ ...vinculo('b6666666-6666-4666-8666-666666666666', PESSOAS.juliana.id, opcoes.papelNaFamiliaTeste, 15), familiaId: FAMILIAS_DEMONSTRACAO.teste }]
        : []),
    ],
    bebes: [
      ...(opcoes.semBebes ? [] : base.bebes).map((bebe) => ({
        ...bebe,
        nascimento,
        estado: opcoes.bebeArquivado ? ('arquivado' as const) : bebe.estado,
      })),
      ...(opcoes.bebesExtras ?? []).map((extra) => ({
        ...extra,
        familiaId: extra.familiaId ?? ID_FAMILIA,
        criadoEm: new Date(agora - 20 * 86_400_000).toISOString(),
        criadoPor: PESSOAS.juliana.id,
      })),
    ],
  })
  const sessao = opcoes.sessao === undefined ? 'juliana' : opcoes.sessao
  conta.sessaoParaTeste(sessao ? PESSOAS[sessao].email : null)

  const estrita = opcoes.semRegistros ? { registros: [], notas: [] } : criarRotinaDeTeste(agora, fuso)
  const inicial = opcoes.diaCompleto && !opcoes.semRegistros ? comDiaCompleto(estrita, agora) : estrita
  const fixture = opcoes.ajustarRotina ? opcoes.ajustarRotina(inicial) : inicial
  const rotina = criarDadosRotinaMemoria(conta, fixture)
  return { agora, conta, rotina, fixture }
}
