import { ESTADOS_DO_RESUMO } from '../../conteudo/resumoRotina.ts'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import { diaDaFamilia } from '../../dados/rotina.dia.ts'
import type { DadosRotina } from '../../dados/rotina.tipos.ts'
import { decidirAcesso, type MotivoDoImpedimento, type OpcaoDeBebe } from './bebes.ts'
import { montarBloco, rotuloDoNumero, valorDoNumero } from './bloco.ts'
import { calcularResumo, janelaDaLeitura, type ChaveDoNumero, type PeriodoDoResumo, type ResumoCalculado } from './calculo.ts'

// O controlador das leituras do painel do resumo da rotina (RF12, RF-15 e RF-19). Não tem tela nem React: guarda o
// estado de dados, lê em duas etapas e diz o que a tela mostra. O painel (outro cartão) liga `situacao()` e
// `inscrever()` à interface (`useSyncExternalStore`) e chama as ações.
//
//  1. Contexto (famílias, papéis e bebês): 1 leitura a cada abertura, e de novo só no "Tentar de novo" do estado 2.
//     Com ela se decide RF-02 e RF-03; depois da abertura o painel não confere acesso de novo (RF-19 item 2).
//  2. Números: `doDia` + `sessoesDaJanela` (hoje) ou `doIntervalo` + `sessoesDaJanela` (semana), do bebê escolhido e
//     do período. Cada troca, ou "Tentar de novo" do estado 8, descarta a leitura em andamento (contador de pedido)
//     e começa outra; o dia de hoje e a janela são fixados no instante dela.
//
// O que o controlador guarda do contexto é só a escolha de bebê (id, rótulo e fuso): membros, convites e o resto do
// contexto não são mantidos. Nada é gravado no navegador e nada vai a log (RN-05).

/** Os estados do painel (RF-15), e `fechado` enquanto ele não está aberto. */
export type EstadoDoResumo =
  | 'fechado'
  | 'lendo_contexto'
  | 'falha_contexto'
  | 'impedido'
  | 'sem_bebe_escolhido'
  | 'lendo_numeros'
  | 'sem_numeros'
  | 'registros_demais'
  | 'falha_numeros'
  | 'pronto'

/** O número do estado em RF-15 (1 a 9). */
export const NUMERO_DO_ESTADO: Readonly<Record<Exclude<EstadoDoResumo, 'fechado'>, number>> = {
  lendo_contexto: 1,
  falha_contexto: 2,
  impedido: 3,
  sem_bebe_escolhido: 4,
  lendo_numeros: 5,
  sem_numeros: 6,
  registros_demais: 7,
  falha_numeros: 8,
  pronto: 9,
}

/** Uma caixa de marcar: o rótulo e o valor que vai entrar no bloco (RF-05). */
export interface CaixaDoNumero {
  chave: ChaveDoNumero
  rotulo: string
  valor: string
  marcado: boolean
}

/** O que a tela mostra. É um objeto novo a cada mudança (a mesma referência enquanto nada muda). */
export interface SituacaoDoResumo {
  estado: EstadoDoResumo
  /** A frase do estado (1, 2, 3, 4, 5, 6, 7 e 8); `null` no estado 9 e com o painel fechado. */
  texto: string | null
  /** No estado 3, qual dos 4 textos de RF-02. */
  motivo: MotivoDoImpedimento | null
  /** As opções de bebê (RF-03), na ordem do seletor da Rotina; vazio antes da leitura e no estado 3. */
  opcoes: readonly OpcaoDeBebe[]
  bebeId: string | null
  periodo: PeriodoDoResumo
  /** As caixas do estado 9: só os números de valor exibido maior que zero. */
  caixas: readonly CaixaDoNumero[]
  /** O bloco exato que "Inserir no texto" põe no corpo; vazio sem nenhum número marcado. */
  bloco: string
  /** "Inserir no texto" ativo: estado 9 e pelo menos um número marcado. */
  podeInserir: boolean
  /** N, só na semana e no estado 9. */
  diasComRegistro: number | null
}

export interface OpcoesDoControlador {
  dados: DadosRotina
  /**
   * O aviso de sessão vencida (RF-19 item 7): chamado quando qualquer leitura do painel, de contexto ou de números,
   * devolve `sessao_encerrada`. É o mesmo aviso das operações da Comunidade; com ele a pessoa vai a `/entrar`.
   */
  aoSessaoEncerrada: () => void
  /** O relógio; o padrão é `Date.now`. */
  agora?: () => number
}

export interface ControladorDoResumo {
  situacao(): SituacaoDoResumo
  /** Chama `ouvinte` a cada mudança; devolve a função que cancela. */
  inscrever(ouvinte: () => void): () => void
  /** Abre o painel: descarta tudo o que havia, volta ao período padrão e lê o contexto (estado 1). */
  abrir(): void
  /** Fecha o painel e descarta a leitura em andamento. */
  fechar(): void
  /** O "Tentar de novo" dos estados 2 (relê o contexto) e 8 (relê o mesmo bebê e período). Nos outros, nada. */
  tentarDeNovo(): void
  escolherBebe(id: string): void
  escolherPeriodo(periodo: PeriodoDoResumo): void
  /** Marca ou desmarca um número do estado 9. */
  marcar(chave: ChaveDoNumero, marcado: boolean): void
}

interface Interno {
  estado: EstadoDoResumo
  motivo: MotivoDoImpedimento | null
  opcoes: readonly OpcaoDeBebe[]
  bebeId: string | null
  periodo: PeriodoDoResumo
  resumo: ResumoCalculado | null
  marcados: readonly ChaveDoNumero[]
}

const ZERADO: Interno = { estado: 'fechado', motivo: null, opcoes: [], bebeId: null, periodo: 'hoje', resumo: null, marcados: [] }

/** Uma leitura que lançou exceção (as operações de dados não lançam): vira falha, sem levar a mensagem a lugar nenhum. */
const FALHA_INESPERADA: ErroDados = { classe: 'desconhecido', chave: 'desconhecido', codigo: '', mensagemOriginal: '' }

const TEXTO_DO_IMPEDIMENTO: Record<MotivoDoImpedimento, string> = {
  sem_familia: ESTADOS_DO_RESUMO.semFamilia,
  sem_bebe: ESTADOS_DO_RESUMO.familiaSemBebe,
  so_responsavel: ESTADOS_DO_RESUMO.soResponsavel,
  sem_bebe_ativo: ESTADOS_DO_RESUMO.semBebeAtivo,
}

function textoDoEstado(interno: Interno): string | null {
  switch (interno.estado) {
    case 'lendo_contexto':
    case 'lendo_numeros':
      return ESTADOS_DO_RESUMO.lendo
    case 'falha_contexto':
    case 'falha_numeros':
      return ESTADOS_DO_RESUMO.falhaNaLeitura
    case 'impedido':
      return interno.motivo === null ? null : TEXTO_DO_IMPEDIMENTO[interno.motivo]
    case 'sem_bebe_escolhido':
      return ESTADOS_DO_RESUMO.escolhaUmBebe
    case 'sem_numeros':
      return ESTADOS_DO_RESUMO.nenhumNumero
    case 'registros_demais':
      return ESTADOS_DO_RESUMO.registrosDemais
    default:
      return null
  }
}

function montarSituacao(interno: Interno): SituacaoDoResumo {
  const resumo = interno.estado === 'pronto' ? interno.resumo : null
  const bloco = resumo ? montarBloco(resumo, interno.marcados) : ''
  return {
    estado: interno.estado,
    texto: textoDoEstado(interno),
    motivo: interno.motivo,
    opcoes: interno.opcoes,
    bebeId: interno.bebeId,
    periodo: interno.periodo,
    caixas: resumo
      ? resumo.numeros.map((numero) => ({
          chave: numero.chave,
          rotulo: rotuloDoNumero(numero.chave),
          valor: valorDoNumero(numero, resumo.periodo),
          marcado: interno.marcados.includes(numero.chave),
        }))
      : [],
    bloco,
    podeInserir: bloco !== '',
    diasComRegistro: resumo?.diasComRegistro ?? null,
  }
}

/** Os estados em que o contexto já foi lido e a pessoa pode escolher bebê e período. */
const ESCOLHA_ABERTA: ReadonlySet<EstadoDoResumo> = new Set(['sem_bebe_escolhido', 'lendo_numeros', 'sem_numeros', 'registros_demais', 'falha_numeros', 'pronto'])

export function criarControladorDoResumo({ dados, aoSessaoEncerrada, agora = Date.now }: OpcoesDoControlador): ControladorDoResumo {
  let interno: Interno = ZERADO
  let atual = montarSituacao(interno)
  // Cada leitura nova invalida a anterior: o resultado de um pedido que já não é o último é ignorado.
  let pedidoDoContexto = 0
  let pedidoDeNumeros = 0
  const ouvintes = new Set<() => void>()

  function definir(parcial: Partial<Interno>) {
    interno = { ...interno, ...parcial }
    atual = montarSituacao(interno)
    for (const ouvinte of [...ouvintes]) ouvinte()
  }

  /** A leitura de dados com o aviso de sessão vencida, a mesma que as operações da Comunidade têm. */
  async function ler<T>(leitura: () => Promise<Resultado<T>>): Promise<Resultado<T>> {
    let resultado: Resultado<T>
    try {
      resultado = await leitura()
    } catch {
      resultado = { ok: false, erro: FALHA_INESPERADA }
    }
    if (!resultado.ok && resultado.erro.classe === 'sessao_encerrada') aoSessaoEncerrada()
    return resultado
  }

  function lerNumeros(parcial: Partial<Interno>) {
    const bebeId = parcial.bebeId ?? interno.bebeId
    const periodo = parcial.periodo ?? interno.periodo
    const opcao = interno.opcoes.find((candidata) => candidata.id === bebeId)
    if (bebeId === null || opcao === undefined) return
    pedidoDeNumeros += 1
    const meu = pedidoDeNumeros
    // Qualquer leitura começa sem número nenhum: caixas e marcas anteriores deixam de valer (RF-05, RF-19 item 4).
    definir({ ...parcial, estado: 'lendo_numeros', motivo: null, resumo: null, marcados: [] })

    // "Hoje" e a janela de 7 dias ficam fixados no instante da leitura (RF-19 item 5), no fuso da família.
    const hoje = diaDaFamilia(agora(), opcao.fuso)
    const { de, ate } = janelaDaLeitura(periodo, hoje, opcao.fuso)
    const registros = periodo === 'hoje' ? ler(() => dados.doDia(bebeId, hoje)) : ler(() => dados.doIntervalo(bebeId, de, ate))
    const sessoes = ler(() => dados.sessoesDaJanela(bebeId, de, ate))

    void Promise.all([registros, sessoes]).then(([doPeriodo, cruzadas]) => {
      if (meu !== pedidoDeNumeros) return
      if (!doPeriodo.ok || !cruzadas.ok) {
        // Sessão vencida: o aviso já foi dado e a pessoa sai da página; o painel não troca de estado.
        const vencida = (!doPeriodo.ok && doPeriodo.erro.classe === 'sessao_encerrada') || (!cruzadas.ok && cruzadas.erro.classe === 'sessao_encerrada')
        if (!vencida) definir({ estado: 'falha_numeros', resumo: null, marcados: [] })
        return
      }
      if (doPeriodo.valor.incompleta || cruzadas.valor.incompleta) {
        definir({ estado: 'registros_demais', resumo: null, marcados: [] })
        return
      }
      const resumo = calcularResumo({ periodo, hoje, fuso: opcao.fuso, registros: doPeriodo.valor.itens, sessoes: cruzadas.valor.itens })
      definir(resumo.numeros.length === 0 ? { estado: 'sem_numeros', resumo: null, marcados: [] } : { estado: 'pronto', resumo, marcados: [] })
    })
  }

  function lerContexto() {
    pedidoDoContexto += 1
    pedidoDeNumeros += 1
    const meu = pedidoDoContexto
    definir({ estado: 'lendo_contexto', motivo: null, opcoes: [], bebeId: null, resumo: null, marcados: [] })

    void ler(() => dados.contexto()).then((lido) => {
      if (meu !== pedidoDoContexto) return
      if (!lido.ok) {
        // Sessão vencida: vale RF-19 item 7 (ida a `/entrar`), e não o estado 2.
        if (lido.erro.classe !== 'sessao_encerrada') definir({ estado: 'falha_contexto' })
        return
      }
      const acesso = decidirAcesso(lido.valor, agora())
      if (acesso.tipo === 'impedido') {
        definir({ estado: 'impedido', motivo: acesso.motivo, opcoes: [] })
      } else if (acesso.opcoes.length === 1) {
        // Com 1 bebê elegível, ele já vem escolhido (RF-03) e a leitura dos números começa.
        const [unica] = acesso.opcoes
        definir({ opcoes: acesso.opcoes })
        lerNumeros({ bebeId: unica.id })
      } else {
        definir({ estado: 'sem_bebe_escolhido', opcoes: acesso.opcoes, bebeId: null })
      }
    })
  }

  return {
    situacao: () => atual,
    inscrever(ouvinte) {
      ouvintes.add(ouvinte)
      return () => {
        ouvintes.delete(ouvinte)
      }
    },
    abrir() {
      interno = { ...ZERADO }
      lerContexto()
    },
    fechar() {
      pedidoDoContexto += 1
      pedidoDeNumeros += 1
      definir({ ...ZERADO })
    },
    tentarDeNovo() {
      if (interno.estado === 'falha_contexto') lerContexto()
      else if (interno.estado === 'falha_numeros') lerNumeros({})
    },
    escolherBebe(id) {
      if (!ESCOLHA_ABERTA.has(interno.estado) || id === interno.bebeId || !interno.opcoes.some((opcao) => opcao.id === id)) return
      lerNumeros({ bebeId: id })
    },
    escolherPeriodo(periodo) {
      if (!ESCOLHA_ABERTA.has(interno.estado) || periodo === interno.periodo) return
      // Sem bebê escolhido ainda (estado 4) o período só fica definido: a leitura de números espera o bebê.
      if (interno.bebeId === null) definir({ periodo })
      else lerNumeros({ periodo })
    },
    marcar(chave, marcado) {
      if (interno.estado !== 'pronto' || !interno.resumo?.numeros.some((numero) => numero.chave === chave)) return
      const outros = interno.marcados.filter((candidata) => candidata !== chave)
      definir({ marcados: marcado ? [...outros, chave] : outros })
    },
  }
}
