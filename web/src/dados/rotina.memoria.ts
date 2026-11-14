import { dataNoFuso, fusoValido, type ErroDados, type Resultado } from './comum.ts'
import type { DadosConta } from './conta.ts'
import { registrarFonteDeExportacao } from './conta.memoria.ts'
import { lerAparelho, type Aparelho } from './rotina.dia.ts'
import { classificarErroRotina, erroRotinaDaChave, type ChaveErroRotina } from './rotina.erros.ts'
import { ehUuidV7 } from './rotina.uuid.ts'
import {
  LIMITES,
  lerContextoDaConta,
  podeAlterarItem,
  podeEscrever,
  type Alteracao,
  type ContextoRotina,
  type DadosRotina,
  type DesdeMeuUltimo,
  type DetalhesRegistro,
  type EdicaoRegistro,
  type FamiliaDaRotina,
  type Lista,
  type NovaNota,
  type NovoRegistro,
  type Nota,
  type OperacaoAlteracao,
  type OperacaoRotina,
  type Registro,
  type TipoRegistro,
  TIPOS_REGISTRO,
  ehTipoRegistro,
  ehTipoDeSessao,
} from './rotina.tipos.ts'

// A implementação em memória: guarda registros e notas em variáveis do JavaScript, sem rede e sem
// armazenamento do navegador. Segue as regras do banco (Anexo A: ordem de conferência por função; Anexo B:
// catálogo de erros). Papéis, vínculos, contas e estado do bebê ela NÃO guarda: lê da `DadosConta` a cada
// operação, para que conta e rotina vejam as mesmas pessoas. Nenhuma função lança exceção.

/** O estado inicial da memória: as mesmas tabelas do banco, só com as colunas que a tela usa. */
export interface FixtureRotina {
  registros: Registro[]
  notas: Nota[]
}

interface OpcoesMemoria {
  /** O relógio da memória; o padrão é `Date.now`. Os testes injetam um fixo. */
  agora?: () => number
  /** O fuso e o deslocamento do aparelho, lidos no momento de gravar ou editar. */
  aparelho?: () => Aparelho
}

interface Controle {
  falhas: Map<string, ErroDados[]>
  perdidas: Map<string, number>
}

const controles = new WeakMap<object, Controle>()

const MINUTO = 60_000
const TOLERANCIA_FUTURO = 5 * MINUTO
const PRAZO_DA_LIXEIRA = 30 * 24 * 60 * MINUTO

const CHAVES_DETALHES: Record<TipoRegistro, readonly string[]> = {
  sono: [],
  tummy: [],
  mamada: ['lado'],
  mamadeira: ['ml', 'conteudo'],
  fralda: ['conteudo'],
  solido: ['alimento'],
  observacao: [],
}

const copiarRegistro = (r: Registro): Registro => ({ ...r, detalhes: { ...r.detalhes } })
const copiarNota = (n: Nota): Nota => ({ ...n })
const ms = (texto: string) => Date.parse(texto)

const compara = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
/** `inicio, id` ascendente. */
const porInicio = (a: Registro, b: Registro) => ms(a.inicio) - ms(b.inicio) || compara(a.id, b.id)
/** O momento de um registro concluído: `fim` na sessão, `inicio` no pontual. */
const momentoDe = (r: Registro) => ms(r.fim ?? r.inicio)

function valoresDosDetalhes(tipo: TipoRegistro, detalhes: DetalhesRegistro): boolean {
  const permitidas = CHAVES_DETALHES[tipo]
  const pares = Object.entries(detalhes).filter(([, valor]) => valor !== undefined)
  if (pares.some(([chave]) => !permitidas.includes(chave))) return false
  const { lado, ml, conteudo, alimento } = detalhes
  if (lado !== undefined && !['esquerdo', 'direito', 'ambos'].includes(lado)) return false
  if (ml !== undefined && (!Number.isInteger(ml) || ml < 1 || ml > 500)) return false
  if (tipo === 'mamadeira' && conteudo !== undefined && !['leite_materno', 'formula'].includes(conteudo)) return false
  if (tipo === 'fralda' && (conteudo === undefined || !['xixi', 'coco', 'ambos'].includes(conteudo))) return false
  if (alimento !== undefined && (alimento.length < 1 || alimento.length > 100 || alimento.trim() === '')) return false
  return true
}

/**
 * O id das entidades da rotina é um UUID v7 (`registros_id_uuidv7_check` e `notas_cuidado_id_uuidv7_check`):
 * 15º caractere `7` e 20º `8`, `9`, `a` ou `b`. Fora desse formato o banco recusa com `23514`; um texto que
 * nem é UUID a memória trata do mesmo modo (`valor_invalido`).
 */
const idValido = (id: string) => ehUuidV7(id)

/** As regras de valor das constraints (`23514`). */
function valoresValidos(
  tipo: TipoRegistro,
  inicio: string,
  fim: string | null,
  detalhes: DetalhesRegistro,
  nota: string | null,
  deslocamentoMin: number,
): boolean {
  if (!ehTipoRegistro(tipo) || Number.isNaN(ms(inicio))) return false
  if (fim !== null) {
    if (!ehTipoDeSessao(tipo) || Number.isNaN(ms(fim)) || ms(fim) < ms(inicio)) return false
  }
  if (nota !== null && (nota.length < 1 || nota.length > 500)) return false
  if (tipo === 'observacao' && nota === null) return false
  if (!Number.isInteger(deslocamentoMin) || deslocamentoMin < -720 || deslocamentoMin > 840) return false
  return valoresDosDetalhes(tipo, detalhes)
}

function achaBebe(contexto: ContextoRotina, id: string) {
  for (const familia of contexto.familias) {
    const bebe = familia.bebes.find((candidato) => candidato.id === id)
    if (bebe) return { bebe, familia }
  }
  return null
}

const achaFamilia = (contexto: ContextoRotina, id: string): FamiliaDaRotina | undefined =>
  contexto.familias.find((familia) => familia.id === id)

export function criarDadosRotinaMemoria(conta: DadosConta, fixture: FixtureRotina, opcoes: OpcoesMemoria = {}): DadosRotina {
  const agora = opcoes.agora ?? Date.now
  const aparelho = opcoes.aparelho ?? (() => lerAparelho(agora()))
  const iso = (instante: number) => new Date(instante).toISOString()
  const registros: Registro[] = fixture.registros.map(copiarRegistro)
  const notas: Nota[] = fixture.notas.map(copiarNota)
  const alteracoes: Alteracao[] = []
  // A exportação da conta (RF-13) lê os registros e as notas daqui, pelo objeto da conta.
  registrarFonteDeExportacao(conta, { registros: () => registros, notas: () => notas })
  let sequencia = 0
  const controle: Controle = { falhas: new Map(), perdidas: new Map() }

  const ok = <T>(valor: T): Resultado<T> => ({ ok: true, valor })
  const falhaPg = <T>(codigo: string, mensagem: string): Resultado<T> => ({
    ok: false,
    erro: classificarErroRotina({ code: codigo, message: mensagem }),
  })
  const noFuturo = (texto: string) => ms(texto) > agora() + TOLERANCIA_FUTURO
  const obrigatorio = (...valores: unknown[]) => valores.some((valor) => valor === null || valor === undefined || valor === '')

  function registrarAlteracao(
    registro: Registro,
    operacao: OperacaoAlteracao,
    autor: string,
    antes: Record<string, unknown> | null,
    depois: Record<string, unknown> | null,
  ) {
    sequencia += 1
    alteracoes.push({
      id: `alteracao-${String(sequencia).padStart(8, '0')}`,
      registroId: registro.id,
      familiaId: registro.familiaId,
      operacao,
      autor,
      antes,
      depois,
      versao: registro.versao,
      recebidaEm: iso(agora()),
    })
  }

  const colunas = (r: Registro): Record<string, unknown> => ({
    inicio: r.inicio,
    fim: r.fim,
    detalhes: { ...r.detalhes },
    nota: r.nota,
    fuso: r.fuso,
    deslocamento_min: r.deslocamentoMin,
  })

  /** O registro, se a conta enxerga a família dele; a RLS dá zero linhas para quem não enxerga. */
  const visivel = (contexto: ContextoRotina, id: string): Registro | undefined => {
    const registro = registros.find((r) => r.id === id)
    return registro && achaFamilia(contexto, registro.familiaId) ? registro : undefined
  }

  /** Limite de lista: a operação devolve só as primeiras e marca `incompleta`. */
  function limitar<T>(itens: T[], limite: number): Lista<T> {
    return { itens: itens.slice(0, limite), incompleta: itens.length > limite }
  }

  async function comContexto<T>(corpo: (contexto: ContextoRotina) => Resultado<T> | Promise<Resultado<T>>): Promise<Resultado<T>> {
    const lido = await lerContextoDaConta(conta)
    if (!lido.ok) return lido
    return corpo(lido.valor)
  }

  // ---- leituras ---------------------------------------------------------------------------------

  const emAndamento = (bebe: string) =>
    comContexto((contexto) => {
      if (!achaBebe(contexto, bebe)) return ok<Lista<Registro>>({ itens: [], incompleta: false })
      const lista = registros
        .filter((r) => r.bebeId === bebe && ehTipoDeSessao(r.tipo) && r.fim === null && r.excluidoEm === null)
        .sort((a, b) => ms(b.inicio) - ms(a.inicio) || compara(b.id, a.id))
      return ok(limitar(lista.map(copiarRegistro), LIMITES.emAndamento))
    })

  const ultimosConcluidos = (bebe: string) =>
    comContexto((contexto) => {
      if (!achaBebe(contexto, bebe)) return ok<Registro[]>([])
      const achados: Registro[] = []
      for (const tipo of TIPOS_REGISTRO) {
        const candidatos = registros
          .filter((r) => r.bebeId === bebe && r.tipo === tipo && r.excluidoEm === null && (!ehTipoDeSessao(tipo) || r.fim !== null))
          .sort((a, b) => momentoDe(b) - momentoDe(a) || compara(b.id, a.id))
        if (candidatos[0]) achados.push(copiarRegistro(candidatos[0]))
      }
      return ok(achados.sort((a, b) => momentoDe(b) - momentoDe(a) || compara(b.id, a.id)))
    })

  const desdeMeuUltimo = (bebe: string, contaId: string) =>
    comContexto((contexto): Resultado<DesdeMeuUltimo> => {
      if (!achaBebe(contexto, bebe)) return ok({ marco: null, novos: [] })
      const maisRecente = (a: Registro, b: Registro) => ms(b.recebidoEm) - ms(a.recebidoEm) || compara(b.id, a.id)
      const marco = registros
        .filter((r) => r.bebeId === bebe && r.criadoPor === contaId && r.excluidoEm === null)
        .sort(maisRecente)[0]
      if (!marco) return ok({ marco: null, novos: [] })
      const novos = registros
        .filter((r) => r.bebeId === bebe && r.excluidoEm === null && r.criadoPor !== contaId && ms(r.recebidoEm) > ms(marco.recebidoEm))
        .sort(maisRecente)
        .slice(0, 5)
      return ok({ marco: copiarRegistro(marco), novos: novos.map(copiarRegistro) })
    })

  const doDia = (bebe: string, dia: string) =>
    comContexto((contexto) => {
      if (obrigatorio(bebe, dia)) return falhaPg<Lista<Registro>>('23502', 'parametro obrigatorio')
      const achado = achaBebe(contexto, bebe)
      if (!achado) return ok<Lista<Registro>>({ itens: [], incompleta: false })
      if (!fusoValido(achado.familia.fuso)) return falhaPg<Lista<Registro>>('22023', 'invalid time zone')
      const lista = registros
        .filter((r) => r.bebeId === bebe && r.excluidoEm === null && dataNoFuso(ms(r.inicio), achado.familia.fuso) === dia)
        .sort(porInicio)
      return ok(limitar(lista.map(copiarRegistro), LIMITES.doDia))
    })

  const sessoesDaJanela = (bebe: string, de: string, ate: string, tipos: readonly TipoRegistro[] = ['sono', 'tummy']) =>
    comContexto((contexto) => {
      if (!achaBebe(contexto, bebe)) return ok<Lista<Registro>>({ itens: [], incompleta: false })
      const lista = registros
        .filter(
          (r) =>
            r.bebeId === bebe &&
            tipos.includes(r.tipo) &&
            ehTipoDeSessao(r.tipo) &&
            r.excluidoEm === null &&
            r.fim !== null &&
            ms(r.inicio) < ms(ate) &&
            ms(r.fim) > ms(de),
        )
        .sort(porInicio)
      return ok(limitar(lista.map(copiarRegistro), LIMITES.sessoesDaJanela))
    })

  const doIntervalo = (bebe: string, de: string, ate: string) =>
    comContexto((contexto) => {
      if (!achaBebe(contexto, bebe)) return ok<Lista<Registro>>({ itens: [], incompleta: false })
      const lista = registros
        .filter((r) => r.bebeId === bebe && r.excluidoEm === null && ms(r.inicio) >= ms(de) && ms(r.inicio) < ms(ate))
        .sort(porInicio)
      return ok(limitar(lista.map(copiarRegistro), LIMITES.doIntervalo))
    })

  const registro = (id: string) =>
    comContexto((contexto) => {
      const achado = visivel(contexto, id)
      return ok(achado ? copiarRegistro(achado) : null)
    })

  const listarAlteracoes = (id: string) =>
    comContexto((contexto) => {
      const achado = visivel(contexto, id)
      const familia = achado ? achaFamilia(contexto, achado.familiaId) : undefined
      // O banco só entrega o histórico a responsável e cuidador: para o observador, zero linhas.
      if (!achado || !familia || !podeEscrever(familia.meuPapel)) return ok<Lista<Alteracao>>({ itens: [], incompleta: false })
      const lista = alteracoes
        .filter((a) => a.registroId === id)
        .sort((a, b) => ms(a.recebidaEm) - ms(b.recebidaEm) || compara(a.id, b.id))
      return ok(limitar(lista.map((a) => ({ ...a })), LIMITES.alteracoes))
    })

  const lixeira = (bebe: string) =>
    comContexto((contexto) => {
      if (obrigatorio(bebe)) return falhaPg<Lista<Registro>>('23502', 'parametro obrigatorio')
      if (!achaBebe(contexto, bebe)) return ok<Lista<Registro>>({ itens: [], incompleta: false })
      const lista = registros
        .filter((r) => r.bebeId === bebe && r.excluidoEm !== null && ms(r.excluidoEm) > agora() - PRAZO_DA_LIXEIRA)
        .sort((a, b) => ms(b.excluidoEm ?? '') - ms(a.excluidoEm ?? '') || compara(a.id, b.id))
      return ok(limitar(lista.map(copiarRegistro), LIMITES.lixeira))
    })

  const listarNotas = (familia: string, bebe: string | null) =>
    comContexto((contexto) => {
      if (!achaFamilia(contexto, familia)) return ok<Lista<Nota>>({ itens: [], incompleta: false })
      const lista = notas
        .filter((n) => n.familiaId === familia && n.excluidaEm === null && (n.bebeId === null || n.bebeId === bebe))
        .sort((a, b) => ms(b.criadaEm) - ms(a.criadaEm) || compara(b.id, a.id))
      return ok(limitar(lista.map(copiarNota), LIMITES.notas))
    })

  // ---- escritas de registro ---------------------------------------------------------------------

  const gravarRegistro = async (entrada: NovoRegistro): Promise<Resultado<Registro>> => {
    const dispositivo = aparelho()
    if (obrigatorio(entrada.id, entrada.bebeId, entrada.tipo, entrada.inicio, dispositivo.fuso, dispositivo.deslocamentoMin)) {
      return falhaPg('23502', 'parametro obrigatorio')
    }
    return comContexto((contexto) => {
      const existente = registros.find((r) => r.id === entrada.id)
      if (existente) {
        return achaFamilia(contexto, existente.familiaId) ? ok(copiarRegistro(existente)) : falhaPg('P0002', 'registro inexistente')
      }
      const achado = achaBebe(contexto, entrada.bebeId)
      if (!achado) return falhaPg('P0002', 'bebe inexistente')
      if (!podeEscrever(achado.familia.meuPapel)) return falhaPg('42501', 'sem permissao')
      if (achado.bebe.estado === 'arquivado') return falhaPg('P0001', 'bebe arquivado')
      const fim = entrada.fim ?? null
      if (noFuturo(entrada.inicio) || (fim !== null && noFuturo(fim))) return falhaPg('23514', 'horario no futuro')
      const detalhes = entrada.detalhes ?? {}
      const nota = entrada.nota ?? null
      if (!idValido(entrada.id) || !valoresValidos(entrada.tipo, entrada.inicio, fim, detalhes, nota, dispositivo.deslocamentoMin)) {
        return falhaPg('23514', 'new row violates check constraint')
      }
      const instante = iso(agora())
      const novo: Registro = {
        id: entrada.id,
        familiaId: achado.familia.id,
        bebeId: entrada.bebeId,
        tipo: entrada.tipo,
        inicio: new Date(entrada.inicio).toISOString(),
        fim: fim === null ? null : new Date(fim).toISOString(),
        detalhes: { ...detalhes },
        nota,
        origem: entrada.origem ?? 'ao_vivo',
        fuso: dispositivo.fuso,
        deslocamentoMin: dispositivo.deslocamentoMin,
        criadoPor: contexto.contaId,
        encerradoPor: fim === null ? null : contexto.contaId,
        versao: 1,
        recebidoEm: instante,
        atualizadoEm: instante,
        excluidoEm: null,
        excluidoPor: null,
      }
      registros.push(novo)
      registrarAlteracao(novo, 'criacao', contexto.contaId, null, colunas(novo))
      return ok(copiarRegistro(novo))
    })
  }

  const editarRegistro = async (id: string, edicao: EdicaoRegistro): Promise<Resultado<Registro>> => {
    if (obrigatorio(id, edicao?.inicio) || edicao?.detalhes === undefined || edicao?.detalhes === null) {
      return falhaPg('23502', 'parametro obrigatorio')
    }
    const dispositivo = aparelho()
    return comContexto((contexto) => {
      const alvo = visivel(contexto, id)
      if (!alvo) return falhaPg('P0002', 'registro inexistente')
      const familia = achaFamilia(contexto, alvo.familiaId)!
      if (!podeAlterarItem(familia.meuPapel, alvo.criadoPor, contexto.contaId)) return falhaPg('42501', 'sem permissao')
      const bebe = achaBebe(contexto, alvo.bebeId)?.bebe
      if (bebe?.estado === 'arquivado') return falhaPg('P0001', 'bebe arquivado')
      if (alvo.excluidoEm !== null) return falhaPg('P0001', 'registro excluido')
      if (noFuturo(edicao.inicio) || (edicao.fim !== null && noFuturo(edicao.fim))) return falhaPg('23514', 'horario no futuro')
      if (alvo.fim !== null && edicao.fim === null && ehTipoDeSessao(alvo.tipo)) return falhaPg('P0001', 'sessao encerrada')
      if (!valoresValidos(alvo.tipo, edicao.inicio, edicao.fim, edicao.detalhes, edicao.nota, dispositivo.deslocamentoMin)) {
        return falhaPg('23514', 'new row violates check constraint')
      }
      const antes = colunas(alvo)
      alvo.inicio = new Date(edicao.inicio).toISOString()
      alvo.fim = edicao.fim === null ? null : new Date(edicao.fim).toISOString()
      alvo.detalhes = { ...edicao.detalhes }
      alvo.nota = edicao.nota
      alvo.fuso = dispositivo.fuso
      alvo.deslocamentoMin = dispositivo.deslocamentoMin
      alvo.versao += 1
      alvo.atualizadoEm = iso(agora())
      registrarAlteracao(alvo, 'edicao', contexto.contaId, antes, colunas(alvo))
      return ok(copiarRegistro(alvo))
    })
  }

  const encerrarSessao = async (id: string, momento: string): Promise<Resultado<string>> => {
    if (obrigatorio(id, momento)) return falhaPg('23502', 'parametro obrigatorio')
    return comContexto((contexto) => {
      const alvo = visivel(contexto, id)
      if (!alvo) return falhaPg('P0002', 'registro inexistente')
      const familia = achaFamilia(contexto, alvo.familiaId)!
      if (!podeEscrever(familia.meuPapel)) return falhaPg('42501', 'sem permissao')
      if (achaBebe(contexto, alvo.bebeId)?.bebe.estado === 'arquivado') return falhaPg('P0001', 'bebe arquivado')
      if (alvo.excluidoEm !== null) return falhaPg('P0001', 'registro excluido')
      if (!ehTipoDeSessao(alvo.tipo)) return falhaPg('P0001', 'nao e sessao')
      if (alvo.fim !== null) return ok(alvo.fim)
      if (noFuturo(momento)) return falhaPg('23514', 'horario no futuro')
      if (Number.isNaN(ms(momento)) || ms(momento) < ms(alvo.inicio)) {
        return falhaPg('23514', 'new row violates check constraint "registros_fim_check"')
      }
      const antes = colunas(alvo)
      alvo.fim = new Date(momento).toISOString()
      alvo.encerradoPor = contexto.contaId
      alvo.versao += 1
      alvo.atualizadoEm = iso(agora())
      registrarAlteracao(alvo, 'edicao', contexto.contaId, antes, colunas(alvo))
      return ok(alvo.fim)
    })
  }

  const excluirRegistro = async (id: string): Promise<Resultado<null>> => {
    if (obrigatorio(id)) return falhaPg('23502', 'parametro obrigatorio')
    return comContexto((contexto) => {
      const alvo = visivel(contexto, id)
      if (!alvo) return falhaPg('P0002', 'registro inexistente')
      const familia = achaFamilia(contexto, alvo.familiaId)!
      if (!podeAlterarItem(familia.meuPapel, alvo.criadoPor, contexto.contaId)) return falhaPg('42501', 'sem permissao')
      if (achaBebe(contexto, alvo.bebeId)?.bebe.estado === 'arquivado') return falhaPg('P0001', 'bebe arquivado')
      if (alvo.excluidoEm !== null) return ok(null)
      alvo.excluidoEm = iso(agora())
      alvo.excluidoPor = contexto.contaId
      alvo.versao += 1
      alvo.atualizadoEm = alvo.excluidoEm
      registrarAlteracao(alvo, 'exclusao', contexto.contaId, null, null)
      return ok(null)
    })
  }

  const restaurarRegistro = async (id: string): Promise<Resultado<null>> => {
    if (obrigatorio(id)) return falhaPg('23502', 'parametro obrigatorio')
    return comContexto((contexto) => {
      const alvo = visivel(contexto, id)
      if (!alvo) return falhaPg('P0002', 'registro inexistente')
      const familia = achaFamilia(contexto, alvo.familiaId)!
      if (!podeAlterarItem(familia.meuPapel, alvo.criadoPor, contexto.contaId)) return falhaPg('42501', 'sem permissao')
      if (achaBebe(contexto, alvo.bebeId)?.bebe.estado === 'arquivado') return falhaPg('P0001', 'bebe arquivado')
      if (alvo.excluidoEm === null) return ok(null)
      // O banco aceita restaurar aos 30 dias exatos: só passa de 30 dias é prazo encerrado.
      if (agora() - ms(alvo.excluidoEm) > PRAZO_DA_LIXEIRA) return falhaPg('P0001', 'prazo de restauracao encerrado')
      alvo.excluidoEm = null
      alvo.excluidoPor = null
      alvo.versao += 1
      alvo.atualizadoEm = iso(agora())
      registrarAlteracao(alvo, 'restauracao', contexto.contaId, null, colunas(alvo))
      return ok(null)
    })
  }

  // ---- escritas de nota -------------------------------------------------------------------------

  const gravarNota = async (entrada: NovaNota): Promise<Resultado<Nota>> => {
    if (obrigatorio(entrada.id, entrada.familiaId, entrada.texto)) return falhaPg('23502', 'parametro obrigatorio')
    return comContexto((contexto) => {
      const existente = notas.find((n) => n.id === entrada.id)
      if (existente) {
        return achaFamilia(contexto, existente.familiaId) ? ok(copiarNota(existente)) : falhaPg('P0002', 'nota inexistente')
      }
      const familia = achaFamilia(contexto, entrada.familiaId)
      if (!familia) return falhaPg('P0002', 'familia inexistente')
      const bebeId = entrada.bebeId ?? null
      const bebe = bebeId === null ? null : familia.bebes.find((candidato) => candidato.id === bebeId)
      if (bebeId !== null && !bebe) return falhaPg('P0002', 'bebe inexistente')
      if (!podeEscrever(familia.meuPapel)) return falhaPg('42501', 'sem permissao')
      if (bebe?.estado === 'arquivado') return falhaPg('P0001', 'bebe arquivado')
      if (!idValido(entrada.id) || entrada.texto.length < 1 || entrada.texto.length > 500) {
        return falhaPg('23514', 'new row violates check constraint')
      }
      const instante = iso(agora())
      const nova: Nota = {
        id: entrada.id,
        familiaId: familia.id,
        bebeId,
        texto: entrada.texto,
        destaqueAte: entrada.destaqueAte ?? null,
        criadoPor: contexto.contaId,
        criadaEm: instante,
        versao: 1,
        atualizadoEm: instante,
        excluidaEm: null,
        excluidaPor: null,
      }
      notas.push(nova)
      return ok(copiarNota(nova))
    })
  }

  /** A nota, se a conta enxerga a família dela. */
  const notaVisivel = (contexto: ContextoRotina, id: string) => {
    const nota = notas.find((n) => n.id === id)
    return nota && achaFamilia(contexto, nota.familiaId) ? nota : undefined
  }

  const editarNota = async (id: string, texto: string, destaqueAte: string | null): Promise<Resultado<Nota>> => {
    if (obrigatorio(id, texto)) return falhaPg('23502', 'parametro obrigatorio')
    return comContexto((contexto) => {
      const alvo = notaVisivel(contexto, id)
      if (!alvo) return falhaPg('P0002', 'nota inexistente')
      const familia = achaFamilia(contexto, alvo.familiaId)!
      if (!podeAlterarItem(familia.meuPapel, alvo.criadoPor, contexto.contaId)) return falhaPg('42501', 'sem permissao')
      const bebe = alvo.bebeId === null ? undefined : familia.bebes.find((candidato) => candidato.id === alvo.bebeId)
      if (bebe?.estado === 'arquivado') return falhaPg('P0001', 'bebe arquivado')
      if (alvo.excluidaEm !== null) return falhaPg('P0001', 'nota excluida')
      if (texto.length < 1 || texto.length > 500) return falhaPg('23514', 'new row violates check constraint')
      alvo.texto = texto
      alvo.destaqueAte = destaqueAte
      alvo.versao += 1
      alvo.atualizadoEm = iso(agora())
      return ok(copiarNota(alvo))
    })
  }

  const excluirNota = async (id: string): Promise<Resultado<null>> => {
    if (obrigatorio(id)) return falhaPg('23502', 'parametro obrigatorio')
    return comContexto((contexto) => {
      const alvo = notaVisivel(contexto, id)
      if (!alvo) return falhaPg('P0002', 'nota inexistente')
      const familia = achaFamilia(contexto, alvo.familiaId)!
      if (!podeAlterarItem(familia.meuPapel, alvo.criadoPor, contexto.contaId)) return falhaPg('42501', 'sem permissao')
      const bebe = alvo.bebeId === null ? undefined : familia.bebes.find((candidato) => candidato.id === alvo.bebeId)
      if (bebe?.estado === 'arquivado') return falhaPg('P0001', 'bebe arquivado')
      if (alvo.excluidaEm !== null) return ok(null)
      alvo.excluidaEm = iso(agora())
      alvo.excluidaPor = contexto.contaId
      alvo.versao += 1
      alvo.atualizadoEm = alvo.excluidaEm
      return ok(null)
    })
  }

  // ---- envoltório: falhas simuladas e respostas perdidas ----------------------------------------

  function operacao<A extends unknown[], T>(nome: OperacaoRotina, corpo: (...args: A) => Promise<Resultado<T>>) {
    return async (...args: A): Promise<Resultado<T>> => {
      const simulada = controle.falhas.get(nome)?.shift()
      if (simulada) return { ok: false, erro: simulada }
      const resultado = await corpo(...args)
      const perdidas = controle.perdidas.get(nome) ?? 0
      if (perdidas > 0) {
        controle.perdidas.set(nome, perdidas - 1)
        // A mudança já foi aplicada; só a resposta se perdeu.
        if (resultado.ok) return { ok: false, erro: erroRotinaDaChave('rede') }
      }
      return resultado
    }
  }

  const dados: DadosRotina = {
    contexto: operacao('contexto', () => lerContextoDaConta(conta)),
    emAndamento: operacao('emAndamento', emAndamento),
    ultimosConcluidos: operacao('ultimosConcluidos', ultimosConcluidos),
    desdeMeuUltimo: operacao('desdeMeuUltimo', desdeMeuUltimo),
    doDia: operacao('doDia', doDia),
    sessoesDaJanela: operacao('sessoesDaJanela', sessoesDaJanela),
    doIntervalo: operacao('doIntervalo', doIntervalo),
    registro: operacao('registro', registro),
    alteracoes: operacao('alteracoes', listarAlteracoes),
    lixeira: operacao('lixeira', lixeira),
    notas: operacao('notas', listarNotas),
    gravarRegistro: operacao('gravarRegistro', gravarRegistro),
    editarRegistro: operacao('editarRegistro', editarRegistro),
    encerrarSessao: operacao('encerrarSessao', encerrarSessao),
    excluirRegistro: operacao('excluirRegistro', excluirRegistro),
    restaurarRegistro: operacao('restaurarRegistro', restaurarRegistro),
    gravarNota: operacao('gravarNota', gravarNota),
    editarNota: operacao('editarNota', editarNota),
    excluirNota: operacao('excluirNota', excluirNota),
  }

  controles.set(dados, controle)
  return dados
}

function controleDe(dados: DadosRotina): Controle {
  const controle = controles.get(dados)
  if (!controle) throw new Error('simularFalhaRotina e simularRespostaPerdidaRotina só valem para a memória')
  return controle
}

/** A próxima chamada da operação devolve o erro pedido, uma vez só, sem mudar nada. */
export function simularFalhaRotina(dados: DadosRotina, operacao: OperacaoRotina, erro: ChaveErroRotina | ErroDados): void {
  const controle = controleDe(dados)
  const fila = controle.falhas.get(operacao) ?? []
  fila.push(typeof erro === 'string' ? erroRotinaDaChave(erro) : erro)
  controle.falhas.set(operacao, fila)
}

/** A próxima chamada aplica a mudança e devolve `rede`: a resposta se perdeu depois de gravar. */
export function simularRespostaPerdidaRotina(dados: DadosRotina, operacao: OperacaoRotina): void {
  const controle = controleDe(dados)
  controle.perdidas.set(operacao, (controle.perdidas.get(operacao) ?? 0) + 1)
}
