import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resultado } from './comum.ts'
import type {
  AlvosDasDenuncias,
  DadosComunidade,
  DenunciaMinha,
  Espaco,
  Pagina,
  PerfilPublico,
  Resposta,
  Topico,
  TopicoNaLista,
} from './comunidade.ts'

import { classificarErroComunidade, erroNaoEditavel } from './comunidade.erros.ts'
import {
  ESTADOS_DENUNCIA,
  ESTADOS_MODERACAO,
  FAIXAS,
  MOTIVOS,
  PAPEIS_PLATAFORMA,
  POR_PAGINA_RESPOSTAS,
  POR_PAGINA_TOPICOS,
  type FaixaBebe,
  type PapelPlataforma,
} from './comunidade.regras.ts'

// A implementação do banco. Cada operação chama o recurso da sua tabela (MAT-47) com a lista de
// colunas escrita (nunca `*` em `perfis_publicos` nem em `denuncias`) e devolve `Resultado`: o que
// escapa (erro do Auth, do Postgres, da rede, resposta fora do formato) passa por
// `classificarErroComunidade`. Nada lança para a tela.

const COLUNAS_PERFIL = 'id, apelido, bio, faixa_bebe, criado_em'
const COLUNAS_ESPACO = 'id, slug, nome, ordem'
const COLUNAS_TOPICO = 'id, espaco_id, autor_id, titulo, corpo, faixa_etaria, estado, motivo_moderacao, criado_em, editado_em'
const COLUNAS_RESPOSTA = 'id, topico_id, autor_id, resposta_a, corpo, estado, motivo_moderacao, criado_em, editado_em'

const SESSAO_AUSENTE = { name: 'AuthSessionMissingError', code: 'session_not_found', message: 'Auth session missing!' }

/** Uma resposta que não tem a forma prometida é `desconhecido`, nunca um valor `undefined` na tela. */
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
const faixaOuNula = (valor: unknown, o: string) => (valor === null ? null : doConjunto(FAIXAS, valor, o))
const numero = (valor: unknown, o: string): number => (typeof valor === 'number' && Number.isFinite(valor) ? valor : inesperada(o))
const linhas = (bruto: unknown, o: string): Record<string, unknown>[] =>
  Array.isArray(bruto) && bruto.every(ehObjeto) ? bruto : inesperada(o)

const paraPerfil = (linha: Record<string, unknown>): PerfilPublico => ({
  id: texto(linha.id, 'perfil.id'),
  apelido: texto(linha.apelido, 'perfil.apelido'),
  bio: textoOuNulo(linha.bio, 'perfil.bio'),
  faixa: faixaOuNula(linha.faixa_bebe, 'perfil.faixa_bebe'),
  criadoEm: data(linha.criado_em, 'perfil.criado_em'),
})

const paraEspaco = (linha: Record<string, unknown>): Espaco => ({
  id: texto(linha.id, 'espaco.id'),
  slug: texto(linha.slug, 'espaco.slug'),
  nome: texto(linha.nome, 'espaco.nome'),
  ordem: numero(linha.ordem, 'espaco.ordem'),
})

const paraTopico = (linha: Record<string, unknown>): Topico => ({
  id: texto(linha.id, 'topico.id'),
  espacoId: texto(linha.espaco_id, 'topico.espaco_id'),
  autorId: textoOuNulo(linha.autor_id, 'topico.autor_id'),
  titulo: texto(linha.titulo, 'topico.titulo'),
  corpo: texto(linha.corpo, 'topico.corpo'),
  faixa: faixaOuNula(linha.faixa_etaria, 'topico.faixa_etaria'),
  estado: doConjunto(ESTADOS_MODERACAO, linha.estado, 'topico.estado'),
  motivoModeracao: textoOuNulo(linha.motivo_moderacao, 'topico.motivo_moderacao'),
  criadoEm: data(linha.criado_em, 'topico.criado_em'),
  editadoEm: dataOuNula(linha.editado_em, 'topico.editado_em'),
})

const paraResposta = (linha: Record<string, unknown>): Resposta => ({
  id: texto(linha.id, 'resposta.id'),
  topicoId: texto(linha.topico_id, 'resposta.topico_id'),
  autorId: textoOuNulo(linha.autor_id, 'resposta.autor_id'),
  respostaA: textoOuNulo(linha.resposta_a, 'resposta.resposta_a'),
  corpo: texto(linha.corpo, 'resposta.corpo'),
  estado: doConjunto(ESTADOS_MODERACAO, linha.estado, 'resposta.estado'),
  motivoModeracao: textoOuNulo(linha.motivo_moderacao, 'resposta.motivo_moderacao'),
  criadoEm: data(linha.criado_em, 'resposta.criado_em'),
  editadoEm: dataOuNula(linha.editado_em, 'resposta.editado_em'),
})

const paraDenuncia = (linha: Record<string, unknown>): DenunciaMinha => ({
  id: texto(linha.id, 'denuncia.id'),
  topicoId: textoOuNulo(linha.topico_id, 'denuncia.topico_id'),
  respostaId: textoOuNulo(linha.resposta_id, 'denuncia.resposta_id'),
  perfilId: textoOuNulo(linha.perfil_id, 'denuncia.perfil_id'),
  motivo: doConjunto(MOTIVOS, linha.motivo, 'denuncia.motivo'),
  texto: textoOuNulo(linha.texto, 'denuncia.texto'),
  estado: doConjunto(ESTADOS_DENUNCIA, linha.estado, 'denuncia.estado'),
  criadaEm: data(linha.criada_em, 'denuncia.criada_em'),
  decididaEm: dataOuNula(linha.decidida_em, 'denuncia.decidida_em'),
})

export function criarDadosComunidadeSupabase(cliente: SupabaseClient): DadosComunidade {
  const auth = cliente.auth

  async function executar<T>(corpo: () => Promise<T>): Promise<Resultado<T>> {
    try {
      return { ok: true, valor: await corpo() }
    } catch (erro) {
      return { ok: false, erro: classificarErroComunidade(erro) }
    }
  }

  async function idDaSessao(): Promise<string> {
    const { data: sessao, error } = await auth.getSession()
    if (error) throw error
    if (!sessao.session) throw SESSAO_AUSENTE
    return sessao.session.user.id
  }

  async function chamar(nome: string, argumentos?: Record<string, unknown>): Promise<unknown> {
    const { data: bruto, error } = await cliente.rpc(nome, argumentos)
    if (error) throw error
    return bruto
  }

  async function meuPerfilId(): Promise<string | null> {
    const bruto = await chamar('meu_perfil_id')
    return bruto === null ? null : texto(bruto, 'meu_perfil_id')
  }

  /** O perfil próprio, que as escritas pedem. Sem ele, o mesmo erro que o banco dá ao publicar. */
  async function perfilObrigatorio(): Promise<string> {
    const id = await meuPerfilId()
    if (id === null) throw { code: 'P0001', message: 'sem perfil' }
    return id
  }

  async function perfisLegiveis(ids: string[]): Promise<PerfilPublico[]> {
    const unicos = [...new Set(ids)]
    if (unicos.length === 0) return []
    const { data: bruto, error } = await cliente.from('perfis_publicos').select(COLUNAS_PERFIL).in('id', unicos)
    if (error) throw error
    return linhas(bruto, 'perfis_publicos').map(paraPerfil)
  }

  /** Os ids dos tópicos do perfil com os mesmos campos do envio, do mais novo ao mais antigo. */
  async function idsDosTopicos(perfil: string, espacoId: string, titulo: string, corpo: string, faixa: FaixaBebe | null) {
    const base = cliente
      .from('topicos')
      .select('id')
      .eq('autor_id', perfil)
      .eq('espaco_id', espacoId)
      .eq('titulo', titulo)
      .eq('corpo', corpo)
    const { data: bruto, error } = await (faixa === null ? base.is('faixa_etaria', null) : base.eq('faixa_etaria', faixa))
      .order('criado_em', { ascending: false })
      .order('id', { ascending: false })
    if (error) throw error
    return linhas(bruto, 'topicos').map((linha) => texto(linha.id, 'topico.id'))
  }

  /** Os ids das respostas do perfil com os mesmos campos do envio, da mais nova à mais antiga. */
  async function idsDasRespostas(perfil: string, topicoId: string, respostaA: string | null, corpo: string) {
    const base = cliente.from('respostas').select('id').eq('autor_id', perfil).eq('topico_id', topicoId).eq('corpo', corpo)
    const { data: bruto, error } = await (respostaA === null ? base.is('resposta_a', null) : base.eq('resposta_a', respostaA))
      .order('criado_em', { ascending: false })
      .order('id', { ascending: false })
    if (error) throw error
    return linhas(bruto, 'respostas').map((linha) => texto(linha.id, 'resposta.id'))
  }

  /** O id de uma linha devolvida pelo banco (os updates pedem `id` de volta). */
  function idDaLinha(bruto: unknown, o: string): string {
    const linha = Array.isArray(bruto) ? bruto[0] : bruto
    if (!ehObjeto(linha)) return inesperada(o)
    return texto(linha.id, o)
  }

  /** Depois de um update: zero linhas sem erro é a política que filtrou (`nao_editavel`). */
  function idDoUpdate(bruto: unknown, o: string): string {
    if (Array.isArray(bruto) && bruto.length === 0) throw erroNaoEditavel()
    return idDaLinha(bruto, o)
  }

  return {
    situacaoDaConta: () =>
      executar(async () => {
        const conta = await idDaSessao()
        const perfilId = await meuPerfilId()
        const vigente = await cliente.from('versoes_termos').select('versao').eq('vigente', true).maybeSingle()
        if (vigente.error) throw vigente.error
        const versaoVigente = vigente.data === null ? null : ehObjeto(vigente.data) ? texto(vigente.data.versao, 'versao') : inesperada('versao')
        const aceite = await chamar('aceite_vigente')
        if (typeof aceite !== 'boolean') inesperada('aceite_vigente')
        const papeis = await cliente.from('papeis_plataforma').select('papel, valido_ate').eq('conta_id', conta)
        if (papeis.error) throw papeis.error

        // Só conta o papel sem validade ou com validade no futuro, pelo relógio do aparelho; validade
        // ilegível não conta (PR-45).
        const vigentes = new Set<PapelPlataforma>()
        for (const linha of linhas(papeis.data, 'papeis_plataforma')) {
          const papel = doConjunto(PAPEIS_PLATAFORMA, linha.papel, 'papel')
          const validoAte = linha.valido_ate
          if (validoAte === null) vigentes.add(papel)
          else if (typeof validoAte === 'string' && Date.parse(validoAte) > Date.now()) vigentes.add(papel)
        }
        return { perfilId, versaoVigente, aceiteVigente: aceite, papeis: [...vigentes] }
      }),

    aceitarTermos: (versao) =>
      executar(async () => {
        await chamar('aceitar_termos', { p_versao: versao })
        return null
      }),

    criarPerfil: (apelido, bio, faixa) =>
      executar(async () => {
        const conta = await idDaSessao()
        const { error } = await cliente.from('perfis_publicos').insert({ conta_id: conta, apelido, bio, faixa_bebe: faixa })
        if (error) throw error
        return null
      }),

    editarPerfil: (apelido, bio, faixa) =>
      executar(async () => {
        const perfil = await perfilObrigatorio()
        const { data: bruto, error } = await cliente
          .from('perfis_publicos')
          .update({ apelido, bio, faixa_bebe: faixa })
          .eq('id', perfil)
          .select('id')
        if (error) throw error
        return idDoUpdate(bruto, 'perfis_publicos.id')
      }),

    lerPerfis: (ids) => executar(() => perfisLegiveis(ids)),

    listarEspacos: () =>
      executar(async () => {
        const { data: bruto, error } = await cliente.from('espacos').select(COLUNAS_ESPACO).order('ordem')
        if (error) throw error
        return linhas(bruto, 'espacos').map(paraEspaco)
      }),

    listarTopicos: (espacoId, pagina, faixa) =>
      executar(async (): Promise<Pagina<TopicoNaLista>> => {
        const de = pagina * POR_PAGINA_TOPICOS
        let consulta = cliente.from('topicos').select(COLUNAS_TOPICO).eq('espaco_id', espacoId)
        if (faixa !== null) consulta = consulta.eq('faixa_etaria', faixa)
        const { data: bruto, error } = await consulta
          .order('criado_em', { ascending: false })
          .order('id', { ascending: false })
          .range(de, de + POR_PAGINA_TOPICOS - 1)
        if (error) throw error
        const topicos = linhas(bruto, 'topicos').map(paraTopico)

        const autores = new Map(
          (await perfisLegiveis(topicos.flatMap((t) => (t.autorId ? [t.autorId] : [])))).map((p) => [p.id, p]),
        )
        // Uma contagem por tópico (só o cabeçalho, sem linhas): nenhum limite de linhas do PostgREST
        // entra no número, e a política de leitura vale para cada contagem.
        const contagens = await Promise.all(
          topicos.map(async (t) => {
            const { count, error: falha } = await cliente
              .from('respostas')
              .select('id', { count: 'exact', head: true })
              .eq('topico_id', t.id)
            if (falha) throw falha
            return typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : inesperada('contagem de respostas')
          }),
        )
        const itens = topicos.map((t, indice) => ({
          ...t,
          autor: t.autorId ? (autores.get(t.autorId) ?? null) : null,
          respostas: contagens[indice],
        }))
        return { itens, haMais: itens.length === POR_PAGINA_TOPICOS }
      }),

    lerTopico: (id) =>
      executar(async () => {
        const { data: bruto, error } = await cliente.from('topicos').select(COLUNAS_TOPICO).eq('id', id).maybeSingle()
        if (error) throw error
        if (bruto === null) return null
        return ehObjeto(bruto) ? paraTopico(bruto) : inesperada('topicos')
      }),

    lerRespostas: (topicoId, pagina) =>
      executar(async (): Promise<Pagina<Resposta>> => {
        const de = pagina * POR_PAGINA_RESPOSTAS
        const { data: bruto, error } = await cliente
          .from('respostas')
          .select(COLUNAS_RESPOSTA)
          .eq('topico_id', topicoId)
          .order('criado_em', { ascending: true })
          .order('id', { ascending: true })
          .range(de, de + POR_PAGINA_RESPOSTAS - 1)
        if (error) throw error
        const itens = linhas(bruto, 'respostas').map(paraResposta)
        return { itens, haMais: itens.length === POR_PAGINA_RESPOSTAS }
      }),

    lerResposta: (id) =>
      executar(async () => {
        const lida = await cliente.from('respostas').select(COLUNAS_RESPOSTA).eq('id', id).maybeSingle()
        if (lida.error) throw lida.error
        if (lida.data === null) return null
        if (!ehObjeto(lida.data)) return inesperada('respostas')
        const resposta = paraResposta(lida.data)
        const topico = await cliente.from('topicos').select('id, titulo').eq('id', resposta.topicoId).maybeSingle()
        if (topico.error) throw topico.error
        const topicoTitulo =
          topico.data === null ? null : ehObjeto(topico.data) ? texto(topico.data.titulo, 'topico.titulo') : inesperada('topicos')
        return { resposta, topicoTitulo }
      }),

    conferirTopicos: (espacoId, titulo, corpo, faixa) =>
      executar(async () => idsDosTopicos(await perfilObrigatorio(), espacoId, titulo, corpo, faixa)),

    conferirRespostas: (topicoId, respostaA, corpo) =>
      executar(async () => idsDasRespostas(await perfilObrigatorio(), topicoId, respostaA, corpo)),

    // O insert não pede a linha de volta (`RETURNING`): a política de leitura (`pode_ler_topico`) lê a
    // própria tabela e não enxerga a linha que o mesmo comando está gravando (o `id` também não está
    // no grant de insert). O id vem de uma leitura depois: o que não estava lá antes do insert.
    criarTopico: (espacoId, titulo, corpo, faixa) =>
      executar(async () => {
        const autor = await perfilObrigatorio()
        const antes = await idsDosTopicos(autor, espacoId, titulo, corpo, faixa)
        const { error } = await cliente
          .from('topicos')
          .insert({ espaco_id: espacoId, autor_id: autor, titulo, corpo, faixa_etaria: faixa })
        if (error) throw error
        const novo = (await idsDosTopicos(autor, espacoId, titulo, corpo, faixa)).find((id) => !antes.includes(id))
        return novo ?? inesperada('o tópico gravado não apareceu na leitura')
      }),

    editarTopico: (id, titulo, corpo, faixa) =>
      executar(async () => {
        const { data: bruto, error } = await cliente
          .from('topicos')
          .update({ titulo, corpo, faixa_etaria: faixa })
          .eq('id', id)
          .select('id')
        if (error) throw error
        return idDoUpdate(bruto, 'topicos.id')
      }),

    responder: (topicoId, respostaA, corpo) =>
      executar(async () => {
        const autor = await perfilObrigatorio()
        const antes = await idsDasRespostas(autor, topicoId, respostaA, corpo)
        const { error } = await cliente
          .from('respostas')
          .insert({ topico_id: topicoId, autor_id: autor, resposta_a: respostaA, corpo })
        if (error) throw error
        const nova = (await idsDasRespostas(autor, topicoId, respostaA, corpo)).find((id) => !antes.includes(id))
        return nova ?? inesperada('a resposta gravada não apareceu na leitura')
      }),

    editarResposta: (id, corpo) =>
      executar(async () => {
        const { data: bruto, error } = await cliente.from('respostas').update({ corpo }).eq('id', id).select('id')
        if (error) throw error
        return idDoUpdate(bruto, 'respostas.id')
      }),

    denunciar: (motivo, alvo, textoDaDenuncia) =>
      executar(async () => {
        const id = await chamar('denunciar', {
          p_motivo: motivo,
          p_topico_id: alvo.tipo === 'topico' ? alvo.id : null,
          p_resposta_id: alvo.tipo === 'resposta' ? alvo.id : null,
          p_perfil_id: alvo.tipo === 'perfil' ? alvo.id : null,
          p_texto: textoDaDenuncia,
        })
        return texto(id, 'denunciar')
      }),

    minhasDenuncias: () =>
      executar(async () => linhas(await chamar('minhas_denuncias'), 'minhas_denuncias').map(paraDenuncia)),

    alvosDasDenuncias: (denuncias) =>
      executar(async (): Promise<AlvosDasDenuncias> => {
        const ids = (campo: 'topicoId' | 'respostaId' | 'perfilId') => [
          ...new Set(denuncias.flatMap((d) => (d[campo] ? [d[campo]] : []))),
        ] as string[]
        const alvos: AlvosDasDenuncias = { topicos: {}, respostas: {}, perfis: {} }

        const topicos = ids('topicoId')
        if (topicos.length > 0) {
          const lida = await cliente.from('topicos').select('id, titulo').in('id', topicos)
          if (lida.error) throw lida.error
          for (const linha of linhas(lida.data, 'topicos')) alvos.topicos[texto(linha.id, 'topico.id')] = texto(linha.titulo, 'topico.titulo')
        }
        const respostas = ids('respostaId')
        if (respostas.length > 0) {
          const lida = await cliente.from('respostas').select('id, corpo').in('id', respostas)
          if (lida.error) throw lida.error
          for (const linha of linhas(lida.data, 'respostas')) alvos.respostas[texto(linha.id, 'resposta.id')] = texto(linha.corpo, 'resposta.corpo')
        }
        for (const perfil of await perfisLegiveis(ids('perfilId'))) alvos.perfis[perfil.id] = perfil.apelido
        return alvos
      }),

    bloquear: (perfilId) =>
      executar(async () => {
        const meu = await perfilObrigatorio()
        const { error } = await cliente.from('bloqueios').insert({ bloqueador_id: meu, bloqueado_id: perfilId })
        if (error) throw error
        return null
      }),

    desbloquear: (perfilId) =>
      executar(async () => {
        const meu = await perfilObrigatorio()
        const { error } = await cliente.from('bloqueios').delete().eq('bloqueador_id', meu).eq('bloqueado_id', perfilId)
        if (error) throw error
        return null
      }),

    listarBloqueios: () =>
      executar(async () => {
        const { data: bruto, error } = await cliente
          .from('bloqueios')
          .select('bloqueado_id, criado_em')
          .order('criado_em', { ascending: false })
        if (error) throw error
        return linhas(bruto, 'bloqueios').map((linha) => ({
          perfilId: texto(linha.bloqueado_id, 'bloqueio.bloqueado_id'),
          criadoEm: data(linha.criado_em, 'bloqueio.criado_em'),
        }))
      }),
  }
}
