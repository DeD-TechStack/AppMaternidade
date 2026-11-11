import { BEBE_DEMONSTRACAO, FAMILIAS_DEMONSTRACAO } from '../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria, type DadosContaMemoria, type FixtureConta } from '../dados/conta.memoria.ts'
import type { Bebe } from '../dados/conta.ts'
import type { Papel } from '../dados/comum.ts'
import { criarFixtureRotinaDemonstracao } from '../dados/rotina.demonstracao.ts'
import { criarDadosRotinaMemoria, type FixtureRotina } from '../dados/rotina.memoria.ts'
import { ehTipoDeSessao, type DadosRotina, type TipoRegistro } from '../dados/rotina.tipos.ts'
import { PESSOAS, criarFixtureDeTeste } from './renderizarComDados.tsx'

// A fixture de teste da rotina (R38-33): a mesma família da demonstração, com a mãe Juliana (responsável),
// o pai Bruno (cuidador), a avó Carla (cuidadora na família de exemplo) e a bebê Heloísa, e o dia fictício
// da `criarFixtureRotinaDemonstracao`. O fuso da família é o do aparelho de teste, para o dia da família
// e as horas na tela concordarem em qualquer máquina. Só dados fictícios.

export const ID_FAMILIA = FAMILIAS_DEMONSTRACAO.exemplo
export const ID_BEBE = BEBE_DEMONSTRACAO

/** O fuso do aparelho que roda os testes. */
export const FUSO_DO_APARELHO = Intl.DateTimeFormat().resolvedOptions().timeZone

/** A rotina do dia fictício sem a sessão de sono de Bruno em andamento. */
export const semSessaoEmAndamento = (fixture: FixtureRotina): FixtureRotina => ({
  ...fixture,
  registros: fixture.registros.filter((registro) => !(ehTipoDeSessao(registro.tipo) && registro.fim === null)),
})

/**
 * A rotina do dia fictício com uma sessão em andamento de um tipo, começada há um tempo, no lugar da de sono
 * de Bruno (o padrão é a de sono de Bruno, há 72 minutos).
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
  /** Sem os registros do dia fictício (a rotina começa vazia). */
  semRegistros?: boolean
  /** Troca ou acrescenta registros e notas à fixture da rotina. */
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
      ...(opcoes.semBebes ? [] : base.bebes).map((bebe) => ({ ...bebe, estado: opcoes.bebeArquivado ? ('arquivado' as const) : bebe.estado })),
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

  const demonstracao = criarFixtureRotinaDemonstracao(agora, { autorDaNota: PESSOAS.carla.id, fuso })
  const inicial = opcoes.semRegistros ? { registros: [], notas: [] } : demonstracao
  const fixture = opcoes.ajustarRotina ? opcoes.ajustarRotina(inicial) : inicial
  const rotina = criarDadosRotinaMemoria(conta, fixture)
  return { agora, conta, rotina, fixture }
}
