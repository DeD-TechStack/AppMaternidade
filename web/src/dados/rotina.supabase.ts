import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resultado } from './comum.ts'
import type { DadosConta } from './conta.ts'
import { lerAparelho, type Aparelho } from './rotina.dia.ts'
import { classificarErroRotina, formatoInesperado } from './rotina.erros.ts'
import { ehUuid } from './rotina.uuid.ts'
import {
  LIMITES,
  TIPOS_REGISTRO,
  TIPOS_SESSAO,
  ehTipoDeSessao,
  ehTipoRegistro,
  lerContextoDaConta,
  type Alteracao,
  type DadosRotina,
  type DetalhesRegistro,
  type Lista,
  type Nota,
  type OperacaoAlteracao,
  type OrigemRegistro,
  type Registro,
  type TipoRegistro,
} from './rotina.tipos.ts'

// A implementação do banco. Cada operação chama o Supabase e devolve `Resultado`: o que escapa (erro do
// Postgres, da rede, resposta fora do formato) passa por `classificarErroRotina`. Nada lança para a
// tela. Toda escrita passa pelas funções do Anexo A; as leituras rodam com a RLS de quem chama.

const COLUNAS_REGISTRO =
  'id, familia_id, bebe_id, tipo, inicio, fim, detalhes, nota, origem, fuso, deslocamento_min, criado_por, encerrado_por, versao, recebido_em, atualizado_em, excluido_em, excluido_por'
const COLUNAS_NOTA = 'id, familia_id, bebe_id, texto, destaque_ate, criado_por, criada_em, versao, atualizado_em, excluida_em, excluida_por'
const COLUNAS_ALTERACAO = 'id, registro_id, familia_id, operacao, autor, antes, depois, versao, recebida_em'

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)
const ehTexto = (valor: unknown): valor is string => typeof valor === 'string' && valor !== ''

function texto(bruto: Record<string, unknown>, chave: string): string {
  const valor = bruto[chave]
  if (!ehTexto(valor)) formatoInesperado(chave)
  return valor
}

function textoOuNulo(bruto: Record<string, unknown>, chave: string): string | null {
  const valor = bruto[chave]
  if (valor === null) return null
  if (!ehTexto(valor)) formatoInesperado(chave)
  return valor
}

function inteiro(bruto: Record<string, unknown>, chave: string): number {
  const valor = bruto[chave]
  if (typeof valor !== 'number' || !Number.isInteger(valor)) formatoInesperado(chave)
  return valor
}

/** Um instante: texto que o motor entende, sempre devolvido em ISO UTC. */
function instante(bruto: Record<string, unknown>, chave: string): string {
  const valor = texto(bruto, chave)
  const ms = Date.parse(valor)
  if (Number.isNaN(ms)) formatoInesperado(chave)
  return new Date(ms).toISOString()
}

function instanteOuNulo(bruto: Record<string, unknown>, chave: string): string | null {
  return bruto[chave] === null ? null : instante(bruto, chave)
}

function lerDetalhes(bruto: unknown): DetalhesRegistro {
  if (!ehObjeto(bruto)) formatoInesperado('detalhes')
  const detalhes: DetalhesRegistro = {}
  if (bruto.lado !== undefined) {
    if (bruto.lado !== 'esquerdo' && bruto.lado !== 'direito' && bruto.lado !== 'ambos') formatoInesperado('detalhes.lado')
    detalhes.lado = bruto.lado
  }
  if (bruto.ml !== undefined) {
    if (typeof bruto.ml !== 'number' || !Number.isInteger(bruto.ml)) formatoInesperado('detalhes.ml')
    detalhes.ml = bruto.ml
  }
  if (bruto.conteudo !== undefined) {
    if (!ehTexto(bruto.conteudo)) formatoInesperado('detalhes.conteudo')
    detalhes.conteudo = bruto.conteudo as DetalhesRegistro['conteudo']
  }
  if (bruto.alimento !== undefined) {
    if (!ehTexto(bruto.alimento)) formatoInesperado('detalhes.alimento')
    detalhes.alimento = bruto.alimento
  }
  return detalhes
}

function lerRegistro(bruto: unknown): Registro {
  if (!ehObjeto(bruto)) formatoInesperado('registro')
  const tipo = bruto.tipo
  if (!ehTipoRegistro(tipo)) formatoInesperado('tipo')
  const origem = bruto.origem
  if (origem !== 'ao_vivo' && origem !== 'retroativo') formatoInesperado('origem')
  return {
    id: texto(bruto, 'id'),
    familiaId: texto(bruto, 'familia_id'),
    bebeId: texto(bruto, 'bebe_id'),
    tipo,
    inicio: instante(bruto, 'inicio'),
    fim: instanteOuNulo(bruto, 'fim'),
    detalhes: lerDetalhes(bruto.detalhes),
    nota: textoOuNulo(bruto, 'nota'),
    origem: origem as OrigemRegistro,
    fuso: texto(bruto, 'fuso'),
    deslocamentoMin: inteiro(bruto, 'deslocamento_min'),
    criadoPor: textoOuNulo(bruto, 'criado_por'),
    encerradoPor: textoOuNulo(bruto, 'encerrado_por'),
    versao: inteiro(bruto, 'versao'),
    recebidoEm: instante(bruto, 'recebido_em'),
    atualizadoEm: instante(bruto, 'atualizado_em'),
    excluidoEm: instanteOuNulo(bruto, 'excluido_em'),
    excluidoPor: textoOuNulo(bruto, 'excluido_por'),
  }
}

function lerNota(bruto: unknown): Nota {
  if (!ehObjeto(bruto)) formatoInesperado('nota')
  return {
    id: texto(bruto, 'id'),
    familiaId: texto(bruto, 'familia_id'),
    bebeId: textoOuNulo(bruto, 'bebe_id'),
    texto: texto(bruto, 'texto'),
    destaqueAte: instanteOuNulo(bruto, 'destaque_ate'),
    criadoPor: textoOuNulo(bruto, 'criado_por'),
    criadaEm: instante(bruto, 'criada_em'),
    versao: inteiro(bruto, 'versao'),
    atualizadoEm: instante(bruto, 'atualizado_em'),
    excluidaEm: instanteOuNulo(bruto, 'excluida_em'),
    excluidaPor: textoOuNulo(bruto, 'excluida_por'),
  }
}

const OPERACOES: readonly string[] = ['criacao', 'edicao', 'exclusao', 'restauracao']

function lerAlteracao(bruto: unknown): Alteracao {
  if (!ehObjeto(bruto)) formatoInesperado('alteracao')
  const operacao = bruto.operacao
  if (typeof operacao !== 'string' || !OPERACOES.includes(operacao)) formatoInesperado('operacao')
  const objetoOuNulo = (chave: string) => {
    const valor = bruto[chave]
    if (valor === null || valor === undefined) return null
    if (!ehObjeto(valor)) formatoInesperado(chave)
    return valor
  }
  return {
    id: texto(bruto, 'id'),
    registroId: texto(bruto, 'registro_id'),
    familiaId: texto(bruto, 'familia_id'),
    operacao: operacao as OperacaoAlteracao,
    autor: textoOuNulo(bruto, 'autor'),
    antes: objetoOuNulo('antes'),
    depois: objetoOuNulo('depois'),
    versao: inteiro(bruto, 'versao'),
    recebidaEm: instante(bruto, 'recebida_em'),
  }
}

/** Uma lista de linhas: a consulta pediu o limite mais 1; se vier a linha a mais, `incompleta`. */
function lista<T>(bruto: unknown, limite: number, ler: (linha: unknown) => T): Lista<T> {
  if (!Array.isArray(bruto)) formatoInesperado('lista')
  const itens = bruto.map(ler)
  return { itens: itens.slice(0, limite), incompleta: itens.length > limite }
}

/** Só as chaves com valor: `undefined` não vai ao banco. */
function detalhesParaOBanco(detalhes: DetalhesRegistro): Record<string, unknown> {
  return Object.fromEntries(Object.entries(detalhes).filter(([, valor]) => valor !== undefined))
}

const comoIso = (valor: string | null | undefined) => (valor === null || valor === undefined ? null : valor)

interface OpcoesSupabase {
  /** O fuso e o deslocamento do aparelho, lidos no momento de gravar ou editar. */
  aparelho?: () => Aparelho
}

export function criarDadosRotinaSupabase(cliente: SupabaseClient, conta: DadosConta, opcoes: OpcoesSupabase = {}): DadosRotina {
  const aparelho = opcoes.aparelho ?? (() => lerAparelho())

  async function executar<T>(corpo: () => Promise<T>): Promise<Resultado<T>> {
    try {
      return { ok: true, valor: await corpo() }
    } catch (erro) {
      return { ok: false, erro: classificarErroRotina(erro) }
    }
  }

  async function chamar(nome: string, argumentos: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await cliente.rpc(nome, argumentos)
    if (error) throw error
    return data
  }

  /** As leituras de lista por função: o `limit` explícito vai na chamada (a função devolve `setof`). */
  async function chamarLista(nome: string, argumentos: Record<string, unknown>, limite: number): Promise<unknown> {
    const { data, error } = await cliente.rpc(nome, argumentos).limit(limite + 1)
    if (error) throw error
    return data
  }

  const registros = () => cliente.from('registros').select(COLUNAS_REGISTRO)

  async function listaDeRegistros(
    consulta: PromiseLike<{ data: unknown; error: unknown }>,
    limite: number,
  ): Promise<Lista<Registro>> {
    const { data, error } = await consulta
    if (error) throw error
    return lista(data, limite, lerRegistro)
  }

  const idDaConta = (id: string) => {
    if (!ehUuid(id)) formatoInesperado('conta')
    return id
  }

  async function maisRecenteDoTipo(bebe: string, tipo: TipoRegistro): Promise<Registro | null> {
    const sessao = ehTipoDeSessao(tipo)
    let consulta = registros().eq('bebe_id', bebe).eq('tipo', tipo).is('excluido_em', null)
    // Nas sessões só contam as concluídas, pelo `fim`; nos pontuais, pelo `inicio`.
    if (sessao) consulta = consulta.not('fim', 'is', null)
    const { data, error } = await consulta
      .order(sessao ? 'fim' : 'inicio', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
    if (error) throw error
    if (!Array.isArray(data)) formatoInesperado('lista')
    return data.length === 0 ? null : lerRegistro(data[0])
  }

  const momento = (registro: Registro) => Date.parse(registro.fim ?? registro.inicio)

  return {
    contexto: () => lerContextoDaConta(conta),

    emAndamento: (bebe) =>
      executar(() =>
        listaDeRegistros(
          registros()
            .eq('bebe_id', bebe)
            .in('tipo', [...TIPOS_SESSAO])
            .is('fim', null)
            .is('excluido_em', null)
            .order('inicio', { ascending: false })
            .order('id', { ascending: false })
            .limit(LIMITES.emAndamento + 1),
          LIMITES.emAndamento,
        ),
      ),

    ultimosConcluidos: (bebe) =>
      executar(async () => {
        const achados = await Promise.all(TIPOS_REGISTRO.map((tipo) => maisRecenteDoTipo(bebe, tipo)))
        return achados
          .filter((registro): registro is Registro => registro !== null)
          .sort((a, b) => momento(b) - momento(a) || (a.id < b.id ? 1 : -1))
      }),

    desdeMeuUltimo: (bebe, contaId) =>
      executar(async () => {
        const dono = idDaConta(contaId)
        const marcos = await listaDeRegistros(
          registros()
            .eq('bebe_id', bebe)
            .eq('criado_por', dono)
            .is('excluido_em', null)
            .order('recebido_em', { ascending: false })
            .limit(1),
          1,
        )
        const marco = marcos.itens[0] ?? null
        if (!marco) return { marco: null, novos: [] }
        const novos = await listaDeRegistros(
          registros()
            .eq('bebe_id', bebe)
            .is('excluido_em', null)
            .or(`criado_por.is.null,criado_por.neq.${dono}`)
            .gt('recebido_em', marco.recebidoEm)
            .order('recebido_em', { ascending: false })
            .limit(6),
          5,
        )
        return { marco, novos: novos.itens }
      }),

    doDia: (bebe, dia) =>
      executar(async () => lista(await chamarLista('registros_do_dia', { id_bebe: bebe, dia }, LIMITES.doDia), LIMITES.doDia, lerRegistro)),

    sessoesDaJanela: (bebe, de, ate, tipos = ['sono', 'tummy']) =>
      executar(async () => {
        const sessoes = tipos.filter(ehTipoDeSessao)
        if (sessoes.length === 0) return { itens: [], incompleta: false }
        return listaDeRegistros(
          registros()
            .eq('bebe_id', bebe)
            .in('tipo', sessoes)
            .is('excluido_em', null)
            .not('fim', 'is', null)
            .lt('inicio', ate)
            .gt('fim', de)
            .order('inicio')
            .order('id')
            .limit(LIMITES.sessoesDaJanela + 1),
          LIMITES.sessoesDaJanela,
        )
      }),

    doIntervalo: (bebe, de, ate) =>
      executar(() =>
        listaDeRegistros(
          registros()
            .eq('bebe_id', bebe)
            .is('excluido_em', null)
            .gte('inicio', de)
            .lt('inicio', ate)
            .order('inicio')
            .order('id')
            .limit(LIMITES.doIntervalo + 1),
          LIMITES.doIntervalo,
        ),
      ),

    registro: (id) =>
      executar(async () => {
        const { data, error } = await registros().eq('id', id).maybeSingle()
        if (error) throw error
        return data === null ? null : lerRegistro(data)
      }),

    alteracoes: (id) =>
      executar(async () => {
        const { data, error } = await cliente
          .from('registro_alteracoes')
          .select(COLUNAS_ALTERACAO)
          .eq('registro_id', id)
          .order('recebida_em')
          .order('id')
          .limit(LIMITES.alteracoes + 1)
        if (error) throw error
        return lista(data, LIMITES.alteracoes, lerAlteracao)
      }),

    lixeira: (bebe) =>
      executar(async () => lista(await chamarLista('registros_na_lixeira', { id_bebe: bebe }, LIMITES.lixeira), LIMITES.lixeira, lerRegistro)),

    notas: (familia, bebe) =>
      executar(async () => {
        // O id vai dentro de um filtro de texto: só entra se for UUID.
        const filtroDoBebe = bebe !== null && ehUuid(bebe) ? `bebe_id.is.null,bebe_id.eq.${bebe}` : 'bebe_id.is.null'
        const { data, error } = await cliente
          .from('notas_cuidado')
          .select(COLUNAS_NOTA)
          .eq('familia_id', familia)
          .is('excluida_em', null)
          .or(filtroDoBebe)
          .order('criada_em', { ascending: false })
          .order('id', { ascending: false })
          .limit(LIMITES.notas + 1)
        if (error) throw error
        return lista(data, LIMITES.notas, lerNota)
      }),

    gravarRegistro: (entrada) =>
      executar(async () => {
        const { fuso, deslocamentoMin } = aparelho()
        const bruto = await chamar('gravar_registro', {
          id_registro: entrada.id,
          id_bebe: entrada.bebeId,
          tipo: entrada.tipo,
          inicio: entrada.inicio,
          fuso,
          deslocamento_min: deslocamentoMin,
          fim: comoIso(entrada.fim),
          detalhes: detalhesParaOBanco(entrada.detalhes ?? {}),
          nota: entrada.nota ?? null,
          origem: entrada.origem ?? 'ao_vivo',
        })
        return lerRegistro(bruto)
      }),

    editarRegistro: (id, edicao) =>
      executar(async () => {
        const { fuso, deslocamentoMin } = aparelho()
        const bruto = await chamar('editar_registro', {
          id_registro: id,
          inicio: edicao.inicio,
          fim: edicao.fim,
          detalhes: detalhesParaOBanco(edicao.detalhes),
          nota: edicao.nota,
          fuso,
          deslocamento_min: deslocamentoMin,
        })
        return lerRegistro(bruto)
      }),

    encerrarSessao: (id, momentoDoFim) =>
      executar(async () => {
        const bruto = await chamar('encerrar_sessao', { id_registro: id, momento: momentoDoFim })
        if (!ehTexto(bruto) || Number.isNaN(Date.parse(bruto))) formatoInesperado('encerrar_sessao')
        return new Date(bruto).toISOString()
      }),

    excluirRegistro: (id) =>
      executar(async () => {
        await chamar('excluir_registro', { id_registro: id })
        return null
      }),

    restaurarRegistro: (id) =>
      executar(async () => {
        await chamar('restaurar_registro', { id_registro: id })
        return null
      }),

    gravarNota: (entrada) =>
      executar(async () =>
        lerNota(
          await chamar('gravar_nota', {
            id_nota: entrada.id,
            id_familia: entrada.familiaId,
            texto: entrada.texto,
            id_bebe: entrada.bebeId ?? null,
            destaque_ate: comoIso(entrada.destaqueAte),
          }),
        ),
      ),

    editarNota: (id, textoDaNota, destaqueAte) =>
      executar(async () => lerNota(await chamar('editar_nota', { id_nota: id, texto: textoDaNota, destaque_ate: destaqueAte }))),

    excluirNota: (id) =>
      executar(async () => {
        await chamar('excluir_nota', { id_nota: id })
        return null
      }),
  }
}
