import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resultado } from './comum.ts'
import type { Pagina } from './comunidade.ts'
import { criarDadosComunidadeSupabase } from './comunidade.supabase.ts'
import {
  ESTADOS_DENUNCIA,
  ESTADOS_MODERACAO,
  MOTIVOS,
  PAPEIS_PLATAFORMA,
} from './comunidade.regras.ts'
import type {
  AcaoDeAuditoria,
  AlvoDeAuditoria,
  ConteudoLido,
  DadosModeracao,
  Denuncia,
  FatorNovo,
  FatorTotp,
  HistoricoDoPerfil,
  ItemDoHistorico,
  LinhaDeAuditoria,
  NivelDaSessao,
  PapelDaLista,
} from './moderacao.ts'
import { classificarErroMfa, classificarErroModeracao } from './moderacao.erros.ts'
import {
  GRUPOS_DE_PRIORIDADE,
  LIMITE_DA_AUDITORIA_DO_HISTORICO,
  LIMITE_DO_HISTORICO,
  POR_PAGINA_AUDITORIA,
  POR_PAGINA_FILA,
  estadosDaFila,
} from './moderacao.regras.ts'

// A implementação do banco do painel de moderação. Cada operação chama a função ou a tabela da MAT-47 com
// a lista de colunas escrita (nunca `*` em `denuncias`: o grant é por coluna) e devolve `Resultado`.
// O que escapa passa por `classificarErroModeracao`; nada lança para a tela.

const COLUNAS_DENUNCIA = 'id, topico_id, resposta_id, perfil_id, motivo, texto, estado, decidida_em, criada_em'
const COLUNAS_AUDITORIA =
  'id, ator_id, acao, alvo_tipo, alvo_id, estado_anterior, estado_novo, motivo, denuncia_id, conteudo, valido_ate, criado_em'
const COLUNAS_PAPEL = 'conta_id, papel, concedido_por, concedido_em, valido_ate'
const COLUNAS_TOPICO_DO_HISTORICO = 'id, titulo, corpo, estado, motivo_moderacao, criado_em'
const COLUNAS_RESPOSTA_DO_HISTORICO = 'id, topico_id, corpo, estado, motivo_moderacao, criado_em'

const ACOES: readonly AcaoDeAuditoria[] = ['ocultar', 'remover', 'restaurar', 'decidir_denuncia', 'conceder_papel', 'revogar_papel']
const ALVOS: readonly AlvoDeAuditoria[] = ['topico', 'resposta', 'denuncia', 'papel_plataforma']

const SESSAO_AUSENTE = { name: 'AuthSessionMissingError', code: 'session_not_found', message: 'Auth session missing!' }

function inesperada(o: string): never {
  throw { code: 'unexpected_failure', message: `Resposta inesperada: ${o}.` }
}

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

const texto = (valor: unknown, o: string): string => (typeof valor === 'string' && valor !== '' ? valor : inesperada(o))
const textoOuNulo = (valor: unknown, o: string): string | null => (valor === null ? null : texto(valor, o))
const data = (valor: unknown, o: string): string => {
  const lido = texto(valor, o)
  return Number.isNaN(Date.parse(lido)) ? inesperada(o) : lido
}
const dataOuNula = (valor: unknown, o: string): string | null => (valor === null ? null : data(valor, o))
const doConjunto = <T extends string>(lista: readonly T[], valor: unknown, o: string): T =>
  lista.includes(valor as T) ? (valor as T) : inesperada(o)
const linhas = (bruto: unknown, o: string): Record<string, unknown>[] =>
  Array.isArray(bruto) && bruto.every(ehObjeto) ? bruto : inesperada(o)

const paraDenuncia = (linha: Record<string, unknown>): Denuncia => ({
  id: texto(linha.id, 'denuncia.id'),
  topicoId: textoOuNulo(linha.topico_id, 'denuncia.topico_id'),
  respostaId: textoOuNulo(linha.resposta_id, 'denuncia.resposta_id'),
  perfilId: textoOuNulo(linha.perfil_id, 'denuncia.perfil_id'),
  motivo: doConjunto(MOTIVOS, linha.motivo, 'denuncia.motivo'),
  texto: textoOuNulo(linha.texto, 'denuncia.texto'),
  estado: doConjunto(ESTADOS_DENUNCIA, linha.estado, 'denuncia.estado'),
  decididaEm: dataOuNula(linha.decidida_em, 'denuncia.decidida_em'),
  criadaEm: data(linha.criada_em, 'denuncia.criada_em'),
})

const paraAuditoria = (linha: Record<string, unknown>): LinhaDeAuditoria => ({
  id: texto(linha.id, 'auditoria.id'),
  atorId: texto(linha.ator_id, 'auditoria.ator_id'),
  acao: doConjunto(ACOES, linha.acao, 'auditoria.acao'),
  alvoTipo: doConjunto(ALVOS, linha.alvo_tipo, 'auditoria.alvo_tipo'),
  alvoId: texto(linha.alvo_id, 'auditoria.alvo_id'),
  estadoAnterior: textoOuNulo(linha.estado_anterior, 'auditoria.estado_anterior'),
  estadoNovo: textoOuNulo(linha.estado_novo, 'auditoria.estado_novo'),
  motivo: texto(linha.motivo, 'auditoria.motivo'),
  denunciaId: textoOuNulo(linha.denuncia_id, 'auditoria.denuncia_id'),
  conteudo: textoOuNulo(linha.conteudo, 'auditoria.conteudo'),
  validoAte: dataOuNula(linha.valido_ate, 'auditoria.valido_ate'),
  criadoEm: data(linha.criado_em, 'auditoria.criado_em'),
})

const paraPapel = (linha: Record<string, unknown>): PapelDaLista => ({
  contaId: texto(linha.conta_id, 'papel.conta_id'),
  papel: doConjunto(PAPEIS_PLATAFORMA, linha.papel, 'papel.papel'),
  concedidoPor: textoOuNulo(linha.concedido_por, 'papel.concedido_por'),
  concedidoEm: data(linha.concedido_em, 'papel.concedido_em'),
  validoAte: dataOuNula(linha.valido_ate, 'papel.valido_ate'),
})

const paraItemDeTopico = (linha: Record<string, unknown>): ItemDoHistorico => {
  const id = texto(linha.id, 'topico.id')
  return {
    tipo: 'topico',
    id,
    topicoId: id,
    titulo: texto(linha.titulo, 'topico.titulo'),
    corpo: texto(linha.corpo, 'topico.corpo'),
    estado: doConjunto(ESTADOS_MODERACAO, linha.estado, 'topico.estado'),
    motivoModeracao: textoOuNulo(linha.motivo_moderacao, 'topico.motivo_moderacao'),
    criadoEm: data(linha.criado_em, 'topico.criado_em'),
  }
}

const paraItemDeResposta = (linha: Record<string, unknown>): ItemDoHistorico => ({
  tipo: 'resposta',
  id: texto(linha.id, 'resposta.id'),
  topicoId: texto(linha.topico_id, 'resposta.topico_id'),
  titulo: null,
  corpo: texto(linha.corpo, 'resposta.corpo'),
  estado: doConjunto(ESTADOS_MODERACAO, linha.estado, 'resposta.estado'),
  motivoModeracao: textoOuNulo(linha.motivo_moderacao, 'resposta.motivo_moderacao'),
  criadoEm: data(linha.criado_em, 'resposta.criado_em'),
})

const maisNovoPrimeiro = (a: ItemDoHistorico, b: ItemDoHistorico) =>
  Date.parse(b.criadoEm) - Date.parse(a.criadoEm) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)

export function criarDadosModeracaoSupabase(cliente: SupabaseClient): DadosModeracao {
  const auth = cliente.auth
  // A leitura de conteúdo é a da Comunidade: as mesmas colunas e a mesma política.
  const comunidade = criarDadosComunidadeSupabase(cliente)

  async function executar<T>(corpo: () => Promise<T>, classificar = classificarErroModeracao): Promise<Resultado<T>> {
    try {
      return { ok: true, valor: await corpo() }
    } catch (erro) {
      return { ok: false, erro: classificar(erro) }
    }
  }

  async function idDaSessao(): Promise<string> {
    const { data: sessao, error } = await auth.getSession()
    if (error) throw error
    if (!sessao.session) throw SESSAO_AUSENTE
    return sessao.session.user.id
  }

  async function chamar(nome: string, argumentos: Record<string, unknown>): Promise<unknown> {
    const { data: bruto, error } = await cliente.rpc(nome, argumentos)
    if (error) throw error
    return bruto
  }

  /** A fila de um grupo de prioridade, da mais antiga à mais nova, com os `limite` primeiros itens. */
  async function filaDoGrupo(
    motivos: readonly string[],
    estados: readonly string[],
    limite: number,
  ): Promise<Denuncia[]> {
    if (motivos.length === 0) return []
    const consulta = cliente.from('denuncias').select(COLUNAS_DENUNCIA).in('estado', [...estados])
    const { data: bruto, error } = await (motivos.length === 1 ? consulta.eq('motivo', motivos[0]) : consulta.in('motivo', [...motivos]))
      .order('criada_em', { ascending: true })
      .order('id', { ascending: true })
      .range(0, limite - 1)
    if (error) throw error
    return linhas(bruto, 'denuncias').map(paraDenuncia)
  }

  return {
    // A ordem por grupo de prioridade não cabe numa consulta só: uma consulta por grupo, na ordem dos
    // grupos, e a página é a fatia da lista junta.
    filaDeDenuncias: (filtro, pagina) =>
      executar(async (): Promise<Pagina<Denuncia>> => {
        const estados = estadosDaFila(filtro.estados)
        const limite = POR_PAGINA_FILA * (pagina + 1)
        const grupos =
          filtro.motivo === null
            ? GRUPOS_DE_PRIORIDADE.map((grupo) => grupo.motivos)
            : GRUPOS_DE_PRIORIDADE.map((grupo) => grupo.motivos.filter((motivo) => motivo === filtro.motivo))
        const juntas: Denuncia[] = []
        for (const motivos of grupos) juntas.push(...(await filaDoGrupo(motivos, estados, limite)))
        const itens = juntas.slice(pagina * POR_PAGINA_FILA, (pagina + 1) * POR_PAGINA_FILA)
        return { itens, haMais: itens.length === POR_PAGINA_FILA }
      }),

    lerDenuncia: (id) =>
      executar(async () => {
        const { data: bruto, error } = await cliente.from('denuncias').select(COLUNAS_DENUNCIA).eq('id', id).maybeSingle()
        if (error) throw error
        if (bruto === null) return null
        return ehObjeto(bruto) ? paraDenuncia(bruto) : inesperada('denuncias')
      }),

    lerConteudo: async (tipo, id): Promise<Resultado<ConteudoLido | null>> => {
      if (tipo === 'topico') {
        const lido = await comunidade.lerTopico(id)
        if (!lido.ok) return lido
        return { ok: true, valor: lido.valor ? { tipo: 'topico', topico: lido.valor } : null }
      }
      const lida = await comunidade.lerResposta(id)
      if (!lida.ok) return lida
      return {
        ok: true,
        valor: lida.valor ? { tipo: 'resposta', resposta: lida.valor.resposta, topicoTitulo: lida.valor.topicoTitulo } : null,
      }
    },

    historicoDoPerfil: (perfilId) =>
      executar(async (): Promise<HistoricoDoPerfil> => {
        const topicos = await cliente
          .from('topicos')
          .select(COLUNAS_TOPICO_DO_HISTORICO)
          .eq('autor_id', perfilId)
          .order('criado_em', { ascending: false })
          .order('id', { ascending: false })
          .limit(LIMITE_DO_HISTORICO)
        if (topicos.error) throw topicos.error
        const respostas = await cliente
          .from('respostas')
          .select(COLUNAS_RESPOSTA_DO_HISTORICO)
          .eq('autor_id', perfilId)
          .order('criado_em', { ascending: false })
          .order('id', { ascending: false })
          .limit(LIMITE_DO_HISTORICO)
        if (respostas.error) throw respostas.error

        const conteudos = [
          ...linhas(topicos.data, 'topicos').map(paraItemDeTopico),
          ...linhas(respostas.data, 'respostas').map(paraItemDeResposta),
        ]
          .sort(maisNovoPrimeiro)
          .slice(0, LIMITE_DO_HISTORICO)
        if (conteudos.length === 0) return { conteudos, auditoria: [] }

        const { data: bruto, error } = await cliente
          .from('auditoria_moderacao')
          .select(COLUNAS_AUDITORIA)
          .in(
            'alvo_id',
            conteudos.map((item) => item.id),
          )
          .order('criado_em', { ascending: false })
          .order('id', { ascending: false })
          .limit(LIMITE_DA_AUDITORIA_DO_HISTORICO)
        if (error) throw error
        return { conteudos, auditoria: linhas(bruto, 'auditoria_moderacao').map(paraAuditoria) }
      }),

    moderarConteudo: (alvo, novoEstado, motivo, denunciaId) =>
      executar(async () =>
        texto(
          await chamar('moderar_conteudo', {
            p_alvo_tipo: alvo.tipo,
            p_alvo_id: alvo.id,
            p_novo_estado: novoEstado,
            p_motivo: motivo,
            p_denuncia_id: denunciaId,
          }),
          'moderar_conteudo',
        ),
      ),

    decidirDenuncia: (denunciaId, decisao, motivo) =>
      executar(async () =>
        texto(
          await chamar('decidir_denuncia', { p_denuncia_id: denunciaId, p_decisao: decisao, p_motivo: motivo }),
          'decidir_denuncia',
        ),
      ),

    auditoria: (pagina) =>
      executar(async (): Promise<Pagina<LinhaDeAuditoria>> => {
        const de = pagina * POR_PAGINA_AUDITORIA
        const { data: bruto, error } = await cliente
          .from('auditoria_moderacao')
          .select(COLUNAS_AUDITORIA)
          .order('criado_em', { ascending: false })
          .order('id', { ascending: false })
          .range(de, de + POR_PAGINA_AUDITORIA - 1)
        if (error) throw error
        const itens = linhas(bruto, 'auditoria_moderacao').map(paraAuditoria)
        return { itens, haMais: itens.length === POR_PAGINA_AUDITORIA }
      }),

    papeis: () =>
      executar(async () => {
        const { data: bruto, error } = await cliente
          .from('papeis_plataforma')
          .select(COLUNAS_PAPEL)
          .order('concedido_em', { ascending: false })
        if (error) throw error
        return linhas(bruto, 'papeis_plataforma').map(paraPapel)
      }),

    concederPapel: (conta, papel, motivo, validoAte) =>
      executar(async () =>
        texto(
          await chamar('conceder_papel_plataforma', { p_conta: conta, p_papel: papel, p_motivo: motivo, p_valido_ate: validoAte }),
          'conceder_papel_plataforma',
        ),
      ),

    revogarPapel: (conta, papel, motivo) =>
      executar(async () =>
        texto(
          await chamar('revogar_papel_plataforma', { p_conta: conta, p_papel: papel, p_motivo: motivo }),
          'revogar_papel_plataforma',
        ),
      ),

    // ---- a verificação em duas etapas (Auth) ---------------------------------------------------------

    nivelDaSessao: () =>
      executar(async (): Promise<NivelDaSessao> => {
        await idDaSessao()
        const { data: nivel, error } = await auth.mfa.getAuthenticatorAssuranceLevel()
        if (error) throw error
        return nivel?.currentLevel === 'aal2' ? 'aal2' : 'aal1'
      }, classificarErroMfa),

    fatores: () =>
      executar(async (): Promise<FatorTotp[]> => {
        const { data: lista, error } = await auth.mfa.listFactors()
        if (error) throw error
        const todos = Array.isArray(lista?.all) ? lista.all : inesperada('listFactors')
        return todos
          .filter((fator) => fator.factor_type === 'totp')
          .map((fator) => ({ id: texto(fator.id, 'fator.id'), verificado: fator.status === 'verified' }))
      }, classificarErroMfa),

    // Um fator TOTP que nunca foi verificado trava um novo cadastro: sai antes de cadastrar.
    cadastrarFator: () =>
      executar(async (): Promise<FatorNovo> => {
        const { data: lista, error: falhaLista } = await auth.mfa.listFactors()
        if (falhaLista) throw falhaLista
        const todos = Array.isArray(lista?.all) ? lista.all : inesperada('listFactors')
        for (const fator of todos) {
          if (fator.factor_type !== 'totp' || fator.status === 'verified') continue
          const { error } = await auth.mfa.unenroll({ factorId: fator.id })
          if (error) throw error
        }
        const { data: novo, error } = await auth.mfa.enroll({ factorType: 'totp' })
        if (error) throw error
        if (!novo || !novo.totp) return inesperada('enroll')
        return { id: texto(novo.id, 'fator.id'), chave: texto(novo.totp.secret, 'fator.secret'), qr: texto(novo.totp.qr_code, 'fator.qr_code') }
      }, classificarErroMfa),

    confirmarCodigo: (fatorId, codigo) =>
      executar(async () => {
        const { error } = await auth.mfa.challengeAndVerify({ factorId: fatorId, code: codigo })
        if (error) throw error
        return null
      }, classificarErroMfa),
  }
}
