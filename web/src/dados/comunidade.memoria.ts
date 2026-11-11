import type { ErroDados, Resultado } from './comum.ts'
import type {
  AlvoDenuncia,
  AlvosDasDenuncias,
  Bloqueio,
  DadosComunidade,
  DenunciaMinha,
  Espaco,
  OperacaoComunidade,
  Pagina,
  PerfilPublico,
  Resposta,
  RespostaComTopico,
  SituacaoConta,
  Topico,
  TopicoNaLista,
} from './comunidade.ts'
import {
  classificarErroComunidade,
  erroDaChaveComunidade,
  erroNaoEditavel,
  type ChaveErroComunidade,
} from './comunidade.erros.ts'
import {
  LIMITES,
  POR_PAGINA_RESPOSTAS,
  POR_PAGINA_TOPICOS,
  apelidoValido,
  conferirLimite,
  type EstadoDenuncia,
  type FaixaBebe,
  type MotivoDenuncia,
  type PapelPlataforma,
} from './comunidade.regras.ts'

// A implementação em memória: reproduz as regras do banco que a tela usa (a leitura de cada tabela
// pelas políticas da MAT-47, as escritas diretas, as funções de ação), com os mesmos códigos e as
// mesmas mensagens. Os dados vivem só na página aberta. Nenhuma função lança exceção.

/** O estado em memória: as tabelas da comunidade, só com as colunas que a tela usa. */
export interface EstadoComunidade {
  versoes: Array<{ versao: string; vigente: boolean; publicadaEm: string }>
  /** Os ids das contas habilitadas: quem tem linha em `contas`. */
  contas: string[]
  aceites: Array<{ contaId: string; versao: string; aceitoEm: string }>
  perfis: Array<{
    id: string
    contaId: string
    apelido: string
    bio: string | null
    faixa: FaixaBebe | null
    criadoEm: string
  }>
  espacos: Espaco[]
  topicos: Topico[]
  respostas: Resposta[]
  denuncias: Array<{
    id: string
    denuncianteId: string | null
    topicoId: string | null
    respostaId: string | null
    perfilId: string | null
    motivo: MotivoDenuncia
    texto: string | null
    estado: EstadoDenuncia
    decididaPor: string | null
    decididaEm: string | null
    criadaEm: string
  }>
  bloqueios: Array<{ bloqueadorId: string; bloqueadoId: string; criadoEm: string }>
  papeis: Array<{
    contaId: string
    papel: PapelPlataforma
    concedidoPor: string | null
    concedidoEm: string
    validoAte: string | null
  }>
  auditoria: Array<{
    id: string
    atorId: string
    acao: string
    alvoTipo: string
    alvoId: string
    estadoAnterior: string | null
    estadoNovo: string | null
    motivo: string
    denunciaId: string | null
    conteudo: string | null
    validoAte: string | null
    criadoEm: string
  }>
}

export type FixtureComunidade = EstadoComunidade

/** Uma cópia isolada da fixture: os testes e o modo demonstração não compartilham linhas. */
export function criarEstadoComunidade(fixture: FixtureComunidade): EstadoComunidade {
  return JSON.parse(JSON.stringify(fixture)) as EstadoComunidade
}

/** A conta da sessão: o id, ou uma função que o dá (a sessão muda durante a vida da página). */
type ContaDaSessao = string | null | (() => string | null | Promise<string | null>)

interface OpcoesMemoria {
  /** O relógio da memória; o padrão é `Date.now`. Os testes injetam um fixo. */
  agora?: () => number
}

interface Controle {
  falhas: Map<string, ErroDados[]>
  perdidas: Map<string, number>
}

const controles = new WeakMap<object, Controle>()

function hexadecimal(tamanho: number): string {
  return Array.from({ length: tamanho }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

const novoId = () => `${hexadecimal(8)}-${hexadecimal(4)}-4${hexadecimal(3)}-8${hexadecimal(3)}-${hexadecimal(12)}`

const emMs = (texto: string) => Date.parse(texto)

/** O mais novo primeiro: `criado_em` e depois `id`, decrescentes. */
const maisNovoPrimeiro = <T extends { id: string }>(lista: T[], quando: (item: T) => string): T[] =>
  [...lista].sort((a, b) => emMs(quando(b)) - emMs(quando(a)) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))

const maisAntigoPrimeiro = <T extends { id: string }>(lista: T[], quando: (item: T) => string): T[] =>
  [...lista].sort((a, b) => emMs(quando(a)) - emMs(quando(b)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

const RLS = (tabela: string) => `new row violates row-level security policy for table "${tabela}"`
const CHECK = (tabela: string, restricao: string) =>
  `new row for relation "${tabela}" violates check constraint "${restricao}"`
const UNICA = (restricao: string) => `duplicate key value violates unique constraint "${restricao}"`

interface DadosComunidadeMemoria extends DadosComunidade {
  /** A mesma memória, sem a camada que simula falhas (os testes de regra leem por aqui). */
  readonly estado: EstadoComunidade
}

export function criarDadosComunidadeMemoria(
  estado: EstadoComunidade,
  contaDaSessao: ContaDaSessao,
  opcoes: OpcoesMemoria = {},
): DadosComunidadeMemoria {
  const relogio = opcoes.agora ?? Date.now
  const controle: Controle = { falhas: new Map(), perdidas: new Map() }
  let ultimo = 0

  /** Cada linha nova tem uma data maior que a da anterior: a ordem do banco não empata. */
  function instante(): string {
    ultimo = Math.max(relogio(), ultimo + 1)
    return new Date(ultimo).toISOString()
  }

  const ok = <T>(valor: T): Resultado<T> => ({ ok: true, valor })
  const falha = <T>(erro: ErroDados): Resultado<T> => ({ ok: false, erro })
  const falhaPg = <T>(codigo: string, mensagem: string): Resultado<T> =>
    falha(classificarErroComunidade({ code: codigo, message: mensagem }))

  // ---- as funções auxiliares das políticas (20261105194710) ------------------------------------

  const perfilDe = (conta: string) => estado.perfis.find((p) => p.contaId === conta)
  const meuPerfilId = (conta: string) => perfilDe(conta)?.id ?? null
  const versaoVigente = () => estado.versoes.find((v) => v.vigente)
  const habilitada = (conta: string) => estado.contas.includes(conta)
  const aceiteVigente = (conta: string) => {
    const vigente = versaoVigente()
    return vigente !== undefined && estado.aceites.some((a) => a.contaId === conta && a.versao === vigente.versao)
  }
  const escritorHabilitado = (conta: string) => aceiteVigente(conta) && meuPerfilId(conta) !== null
  const papeisVigentes = (conta: string): PapelPlataforma[] =>
    [
      ...new Set(
        estado.papeis
          .filter((p) => p.contaId === conta && (p.validoAte === null || emMs(p.validoAte) > relogio()))
          .map((p) => p.papel),
      ),
    ]
  const moderacao = (conta: string) => papeisVigentes(conta).length > 0

  /** Bloqueio entre o perfil próprio e o outro, nos dois sentidos. */
  function haBloqueio(conta: string, outro: string | null): boolean {
    const meu = meuPerfilId(conta)
    if (outro === null || meu === null) return false
    return estado.bloqueios.some(
      (b) => (b.bloqueadorId === meu && b.bloqueadoId === outro) || (b.bloqueadoId === meu && b.bloqueadorId === outro),
    )
  }

  const podeLerPerfil = (conta: string, perfil: EstadoComunidade['perfis'][number]) =>
    perfil.contaId === conta || (habilitada(conta) && !haBloqueio(conta, perfil.id)) || moderacao(conta)

  function podeLerTopico(conta: string, topico: Topico): boolean {
    if (moderacao(conta)) return true
    if (topico.estado === 'visivel' && habilitada(conta) && (topico.autorId === null || !haBloqueio(conta, topico.autorId))) {
      return true
    }
    return topico.autorId !== null && topico.autorId === meuPerfilId(conta) && topico.estado !== 'removido'
  }

  function podeLerResposta(conta: string, resposta: Resposta): boolean {
    if (moderacao(conta)) return true
    const topico = estado.topicos.find((t) => t.id === resposta.topicoId)
    if (!topico || !podeLerTopico(conta, topico)) return false
    if (resposta.estado === 'visivel' && habilitada(conta) && (resposta.autorId === null || !haBloqueio(conta, resposta.autorId))) {
      return true
    }
    return resposta.autorId !== null && resposta.autorId === meuPerfilId(conta) && resposta.estado !== 'removido'
  }

  /** Sem atalho para a moderação: responder é escrever como usuária. */
  function podeResponder(conta: string, topicoId: string, respostaA: string | null): boolean {
    if (!habilitada(conta)) return false
    const topico = estado.topicos.find((t) => t.id === topicoId)
    if (!topico || topico.estado !== 'visivel' || (topico.autorId !== null && haBloqueio(conta, topico.autorId))) return false
    if (respostaA === null) return true
    const mae = estado.respostas.find((r) => r.id === respostaA)
    return !!mae && mae.estado === 'visivel' && (mae.autorId === null || !haBloqueio(conta, mae.autorId))
  }

  // ---- a forma que a tela vê ---------------------------------------------------------------------

  const paraPerfil = (p: EstadoComunidade['perfis'][number]): PerfilPublico => ({
    id: p.id,
    apelido: p.apelido,
    bio: p.bio,
    faixa: p.faixa,
    criadoEm: p.criadoEm,
  })
  const copiaTopico = (t: Topico): Topico => ({ ...t })
  const copiaResposta = (r: Resposta): Resposta => ({ ...r })

  function perfisLegiveis(conta: string, ids: Iterable<string>): PerfilPublico[] {
    const pedidos = new Set(ids)
    return estado.perfis.filter((p) => pedidos.has(p.id) && podeLerPerfil(conta, p)).map(paraPerfil)
  }

  // ---- as operações ------------------------------------------------------------------------------

  type Corpo<A extends unknown[], T> = (conta: string, ...args: A) => Resultado<T> | Promise<Resultado<T>>

  async function contaAtual(): Promise<string | null> {
    return typeof contaDaSessao === 'function' ? await contaDaSessao() : contaDaSessao
  }

  /** A operação com a sessão conferida, a falha simulada e a resposta perdida (o envoltório). */
  function operacao<A extends unknown[], T>(nome: OperacaoComunidade, corpo: Corpo<A, T>) {
    return async (...args: A): Promise<Resultado<T>> => {
      const simulada = controle.falhas.get(nome)?.shift()
      if (simulada) return { ok: false, erro: simulada }
      const conta = await contaAtual()
      if (!conta) return falha(erroDaChaveComunidade('sessao_encerrada'))
      const resultado = await corpo(conta, ...args)
      const perdidas = controle.perdidas.get(nome) ?? 0
      if (perdidas > 0) {
        controle.perdidas.set(nome, perdidas - 1)
        // A mudança já foi aplicada; só a resposta se perdeu.
        if (resultado.ok) return falha(erroDaChaveComunidade('rede'))
      }
      return resultado
    }
  }

  function situacaoDaConta(conta: string): Resultado<SituacaoConta> {
    return ok({
      perfilId: meuPerfilId(conta),
      versaoVigente: versaoVigente()?.versao ?? null,
      aceiteVigente: aceiteVigente(conta),
      papeis: papeisVigentes(conta),
    })
  }

  function aceitarTermos(conta: string, versao: string): Resultado<null> {
    if (!habilitada(conta)) return falhaPg('P0001', 'sem conta')
    if (!versao) return falhaPg('P0001', 'parametro obrigatorio')
    const vigente = versaoVigente()
    if (!vigente) return falhaPg('P0001', 'termos indisponiveis')
    if (versao !== vigente.versao) return falhaPg('P0001', 'versao nao vigente')
    if (!estado.aceites.some((a) => a.contaId === conta && a.versao === versao)) {
      estado.aceites.push({ contaId: conta, versao, aceitoEm: instante() })
    }
    return ok(null)
  }

  /** As restrições de `perfis_publicos` que valem para o insert e para o update. */
  function confereTextosDoPerfil(apelido: string, bio: string | null): ErroDados | null {
    if (!apelidoValido(apelido)) {
      return classificarErroComunidade({ code: '23514', message: CHECK('perfis_publicos', 'perfis_publicos_apelido_tamanho') })
    }
    if (bio !== null && conferirLimite(bio, LIMITES.bio) !== 'ok') {
      return classificarErroComunidade({ code: '23514', message: CHECK('perfis_publicos', 'perfis_publicos_bio_tamanho') })
    }
    return null
  }

  const apelidoEmUso = (apelido: string, exceto: string | null) =>
    estado.perfis.some((p) => p.id !== exceto && p.apelido.toLowerCase() === apelido.toLowerCase())

  function criarPerfil(conta: string, apelido: string, bio: string | null, faixa: FaixaBebe | null): Resultado<null> {
    // A política de insert: a conta é a chamadora e tem o aceite vigente.
    if (!aceiteVigente(conta)) return falhaPg('42501', RLS('perfis_publicos'))
    const recusa = confereTextosDoPerfil(apelido, bio)
    if (recusa) return falha(recusa)
    if (perfilDe(conta)) return falhaPg('23505', UNICA('perfis_publicos_conta_unica'))
    if (apelidoEmUso(apelido, null)) return falhaPg('23505', UNICA('perfis_publicos_apelido_idx'))
    estado.perfis.push({ id: novoId(), contaId: conta, apelido, bio, faixa, criadoEm: instante() })
    return ok(null)
  }

  function editarPerfil(conta: string, apelido: string, bio: string | null, faixa: FaixaBebe | null): Resultado<string> {
    const perfil = perfilDe(conta)
    if (!perfil) return falhaPg('P0001', 'sem perfil')
    // A política de update: só quem é escritor habilitado alcança a linha.
    if (!escritorHabilitado(conta)) return falha(erroNaoEditavel())
    const recusa = confereTextosDoPerfil(apelido, bio)
    if (recusa) return falha(recusa)
    if (apelidoEmUso(apelido, perfil.id)) return falhaPg('23505', UNICA('perfis_publicos_apelido_idx'))
    perfil.apelido = apelido
    perfil.bio = bio
    perfil.faixa = faixa
    return ok(perfil.id)
  }

  const lerPerfis = (conta: string, ids: string[]): Resultado<PerfilPublico[]> => ok(perfisLegiveis(conta, ids))

  const listarEspacos = (): Resultado<Espaco[]> => ok([...estado.espacos].sort((a, b) => a.ordem - b.ordem).map((e) => ({ ...e })))

  function listarTopicos(
    conta: string,
    espacoId: string,
    pagina: number,
    faixa: FaixaBebe | null,
  ): Resultado<Pagina<TopicoNaLista>> {
    const legiveis = estado.topicos.filter(
      (t) => t.espacoId === espacoId && (faixa === null || t.faixa === faixa) && podeLerTopico(conta, t),
    )
    const fatia = maisNovoPrimeiro(legiveis, (t) => t.criadoEm).slice(pagina * POR_PAGINA_TOPICOS, (pagina + 1) * POR_PAGINA_TOPICOS)
    const autores = new Map(
      perfisLegiveis(conta, fatia.flatMap((t) => (t.autorId ? [t.autorId] : []))).map((p) => [p.id, p]),
    )
    const itens = fatia.map((t) => ({
      ...copiaTopico(t),
      autor: t.autorId ? (autores.get(t.autorId) ?? null) : null,
      respostas: estado.respostas.filter((r) => r.topicoId === t.id && podeLerResposta(conta, r)).length,
    }))
    return ok({ itens, haMais: itens.length === POR_PAGINA_TOPICOS })
  }

  function lerTopico(conta: string, id: string): Resultado<Topico | null> {
    const achado = estado.topicos.find((t) => t.id === id && podeLerTopico(conta, t))
    return ok(achado ? copiaTopico(achado) : null)
  }

  function lerRespostas(conta: string, topicoId: string, pagina: number): Resultado<Pagina<Resposta>> {
    const legiveis = estado.respostas.filter((r) => r.topicoId === topicoId && podeLerResposta(conta, r))
    const itens = maisAntigoPrimeiro(legiveis, (r) => r.criadoEm)
      .slice(pagina * POR_PAGINA_RESPOSTAS, (pagina + 1) * POR_PAGINA_RESPOSTAS)
      .map(copiaResposta)
    return ok({ itens, haMais: itens.length === POR_PAGINA_RESPOSTAS })
  }

  function lerResposta(conta: string, id: string): Resultado<RespostaComTopico | null> {
    const resposta = estado.respostas.find((r) => r.id === id && podeLerResposta(conta, r))
    if (!resposta) return ok(null)
    const topico = estado.topicos.find((t) => t.id === resposta.topicoId && podeLerTopico(conta, t))
    return ok({ resposta: copiaResposta(resposta), topicoTitulo: topico?.titulo ?? null })
  }

  function conferirTopicos(
    conta: string,
    espacoId: string,
    titulo: string,
    corpo: string,
    faixa: FaixaBebe | null,
  ): Resultado<string[]> {
    const perfil = perfilDe(conta)
    if (!perfil) return falhaPg('P0001', 'sem perfil')
    const achados = estado.topicos.filter(
      (t) =>
        t.autorId === perfil.id &&
        t.espacoId === espacoId &&
        t.titulo === titulo &&
        t.corpo === corpo &&
        t.faixa === faixa &&
        podeLerTopico(conta, t),
    )
    return ok(maisNovoPrimeiro(achados, (t) => t.criadoEm).map((t) => t.id))
  }

  function conferirRespostas(conta: string, topicoId: string, respostaA: string | null, corpo: string): Resultado<string[]> {
    const perfil = perfilDe(conta)
    if (!perfil) return falhaPg('P0001', 'sem perfil')
    const achadas = estado.respostas.filter(
      (r) =>
        r.autorId === perfil.id &&
        r.topicoId === topicoId &&
        r.respostaA === respostaA &&
        r.corpo === corpo &&
        podeLerResposta(conta, r),
    )
    return ok(maisNovoPrimeiro(achadas, (r) => r.criadoEm).map((r) => r.id))
  }

  function criarTopico(conta: string, espacoId: string, titulo: string, corpo: string, faixa: FaixaBebe | null): Resultado<string> {
    const perfil = perfilDe(conta)
    if (!perfil) return falhaPg('P0001', 'sem perfil')
    if (!aceiteVigente(conta)) return falhaPg('42501', RLS('topicos'))
    if (conferirLimite(titulo, LIMITES.titulo) !== 'ok') return falhaPg('23514', CHECK('topicos', 'topicos_titulo_tamanho'))
    if (conferirLimite(corpo, LIMITES.corpoTopico) !== 'ok') return falhaPg('23514', CHECK('topicos', 'topicos_corpo_tamanho'))
    if (!estado.espacos.some((e) => e.id === espacoId)) {
      return falhaPg('23503', 'insert or update on table "topicos" violates foreign key constraint "topicos_espaco_id_fkey"')
    }
    const topico: Topico = {
      id: novoId(),
      espacoId,
      autorId: perfil.id,
      titulo,
      corpo,
      faixa,
      estado: 'visivel',
      motivoModeracao: null,
      criadoEm: instante(),
      editadoEm: null,
    }
    estado.topicos.push(topico)
    return ok(topico.id)
  }

  function editarTopico(conta: string, id: string, titulo: string, corpo: string, faixa: FaixaBebe | null): Resultado<string> {
    const topico = estado.topicos.find((t) => t.id === id)
    const perfil = perfilDe(conta)
    // A política de update: o autor, com o tópico visível e escritor habilitado; senão, zero linhas.
    const alcanca =
      !!topico &&
      !!perfil &&
      topico.autorId === perfil.id &&
      topico.estado === 'visivel' &&
      escritorHabilitado(conta) &&
      podeLerTopico(conta, topico)
    if (!alcanca) return falha(erroNaoEditavel())
    if (conferirLimite(titulo, LIMITES.titulo) !== 'ok') return falhaPg('23514', CHECK('topicos', 'topicos_titulo_tamanho'))
    if (conferirLimite(corpo, LIMITES.corpoTopico) !== 'ok') return falhaPg('23514', CHECK('topicos', 'topicos_corpo_tamanho'))
    if (topico.titulo !== titulo || topico.corpo !== corpo || topico.faixa !== faixa) topico.editadoEm = instante()
    topico.titulo = titulo
    topico.corpo = corpo
    topico.faixa = faixa
    return ok(topico.id)
  }

  function responder(conta: string, topicoId: string, respostaA: string | null, corpo: string): Resultado<string> {
    const perfil = perfilDe(conta)
    if (!perfil) return falhaPg('P0001', 'sem perfil')
    if (!aceiteVigente(conta) || !podeResponder(conta, topicoId, respostaA)) return falhaPg('42501', RLS('respostas'))
    if (conferirLimite(corpo, LIMITES.resposta) !== 'ok') return falhaPg('23514', CHECK('respostas', 'respostas_corpo_tamanho'))
    // O gatilho de depois do insert: um nível só, e a mãe é do mesmo tópico.
    if (respostaA !== null) {
      const mae = estado.respostas.find((r) => r.id === respostaA)
      if (mae && mae.topicoId !== topicoId) return falhaPg('P0001', 'resposta de outro topico')
      if (mae && mae.respostaA !== null) return falhaPg('P0001', 'so um nivel de resposta')
    }
    const resposta: Resposta = {
      id: novoId(),
      topicoId,
      autorId: perfil.id,
      respostaA,
      corpo,
      estado: 'visivel',
      motivoModeracao: null,
      criadoEm: instante(),
      editadoEm: null,
    }
    estado.respostas.push(resposta)
    return ok(resposta.id)
  }

  function editarResposta(conta: string, id: string, corpo: string): Resultado<string> {
    const resposta = estado.respostas.find((r) => r.id === id)
    const perfil = perfilDe(conta)
    const alcanca =
      !!resposta &&
      !!perfil &&
      resposta.autorId === perfil.id &&
      resposta.estado === 'visivel' &&
      podeLerResposta(conta, resposta) &&
      escritorHabilitado(conta)
    if (!alcanca) return falha(erroNaoEditavel())
    if (conferirLimite(corpo, LIMITES.resposta) !== 'ok') return falhaPg('23514', CHECK('respostas', 'respostas_corpo_tamanho'))
    if (resposta.corpo !== corpo) resposta.editadoEm = instante()
    resposta.corpo = corpo
    return ok(resposta.id)
  }

  function denunciar(conta: string, motivo: MotivoDenuncia, alvo: AlvoDenuncia, texto: string | null): Resultado<string> {
    if (!habilitada(conta)) return falhaPg('P0001', 'sem conta')
    if (!versaoVigente()) return falhaPg('P0001', 'termos indisponiveis')
    if (!aceiteVigente(conta)) return falhaPg('P0001', 'sem aceite')
    if (!perfilDe(conta)) return falhaPg('P0001', 'sem perfil')
    if (!motivo) return falhaPg('P0001', 'parametro obrigatorio')
    if (!alvo.id) return falhaPg('23514', 'alvo invalido')

    let existe = false
    if (alvo.tipo === 'topico') {
      existe = estado.topicos.some((t) => t.id === alvo.id && t.estado === 'visivel')
    } else if (alvo.tipo === 'resposta') {
      const resposta = estado.respostas.find((r) => r.id === alvo.id && r.estado === 'visivel')
      existe = !!resposta && estado.topicos.some((t) => t.id === resposta.topicoId && t.estado === 'visivel')
    } else {
      existe = estado.perfis.some((p) => p.id === alvo.id)
    }
    if (!existe) return falhaPg('P0002', 'alvo inexistente')
    if (texto !== null && conferirLimite(texto, LIMITES.textoDenuncia) !== 'ok') {
      return falhaPg('23514', CHECK('denuncias', 'denuncias_texto_tamanho'))
    }

    const id = novoId()
    estado.denuncias.push({
      id,
      denuncianteId: conta,
      topicoId: alvo.tipo === 'topico' ? alvo.id : null,
      respostaId: alvo.tipo === 'resposta' ? alvo.id : null,
      perfilId: alvo.tipo === 'perfil' ? alvo.id : null,
      motivo,
      texto,
      estado: 'aberta',
      decididaPor: null,
      decididaEm: null,
      criadaEm: instante(),
    })
    return ok(id)
  }

  function minhasDenuncias(conta: string): Resultado<DenunciaMinha[]> {
    const minhas = estado.denuncias.filter((d) => d.denuncianteId === conta)
    // `criada_em` decrescente e depois `id` crescente, como a função do banco.
    const ordenadas = [...minhas].sort((a, b) => emMs(b.criadaEm) - emMs(a.criadaEm) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    return ok(
      ordenadas.map((d) => ({
        id: d.id,
        topicoId: d.topicoId,
        respostaId: d.respostaId,
        perfilId: d.perfilId,
        motivo: d.motivo,
        texto: d.texto,
        estado: d.estado,
        criadaEm: d.criadaEm,
        decididaEm: d.decididaEm,
      })),
    )
  }

  function alvosDasDenuncias(conta: string, denuncias: DenunciaMinha[]): Resultado<AlvosDasDenuncias> {
    const topicos = new Set(denuncias.flatMap((d) => (d.topicoId ? [d.topicoId] : [])))
    const respostas = new Set(denuncias.flatMap((d) => (d.respostaId ? [d.respostaId] : [])))
    const perfis = new Set(denuncias.flatMap((d) => (d.perfilId ? [d.perfilId] : [])))
    return ok({
      topicos: Object.fromEntries(
        estado.topicos.filter((t) => topicos.has(t.id) && podeLerTopico(conta, t)).map((t) => [t.id, t.titulo]),
      ),
      respostas: Object.fromEntries(
        estado.respostas.filter((r) => respostas.has(r.id) && podeLerResposta(conta, r)).map((r) => [r.id, r.corpo]),
      ),
      perfis: Object.fromEntries(perfisLegiveis(conta, perfis).map((p) => [p.id, p.apelido])),
    })
  }

  function bloquear(conta: string, perfilId: string): Resultado<null> {
    const perfil = perfilDe(conta)
    if (!perfil) return falhaPg('P0001', 'sem perfil')
    if (perfilId === perfil.id) return falhaPg('23514', CHECK('bloqueios', 'bloqueios_nao_a_si_mesmo'))
    if (!estado.perfis.some((p) => p.id === perfilId)) {
      return falhaPg('23503', 'insert or update on table "bloqueios" violates foreign key constraint "bloqueios_bloqueado_id_fkey"')
    }
    if (estado.bloqueios.some((b) => b.bloqueadorId === perfil.id && b.bloqueadoId === perfilId)) {
      return falhaPg('23505', UNICA('bloqueios_pkey'))
    }
    estado.bloqueios.push({ bloqueadorId: perfil.id, bloqueadoId: perfilId, criadoEm: instante() })
    return ok(null)
  }

  function desbloquear(conta: string, perfilId: string): Resultado<null> {
    const perfil = perfilDe(conta)
    if (!perfil) return falhaPg('P0001', 'sem perfil')
    // Zero linhas é sucesso: já estava desbloqueado.
    estado.bloqueios = estado.bloqueios.filter((b) => !(b.bloqueadorId === perfil.id && b.bloqueadoId === perfilId))
    return ok(null)
  }

  function listarBloqueios(conta: string): Resultado<Bloqueio[]> {
    const meu = meuPerfilId(conta)
    if (meu === null) return ok([])
    const meus = estado.bloqueios.filter((b) => b.bloqueadorId === meu)
    return ok(
      [...meus]
        .sort((a, b) => emMs(b.criadoEm) - emMs(a.criadoEm))
        .map((b) => ({ perfilId: b.bloqueadoId, criadoEm: b.criadoEm })),
    )
  }

  const dados: DadosComunidadeMemoria = {
    estado,
    situacaoDaConta: operacao('situacaoDaConta', situacaoDaConta),
    aceitarTermos: operacao('aceitarTermos', aceitarTermos),
    criarPerfil: operacao('criarPerfil', criarPerfil),
    editarPerfil: operacao('editarPerfil', editarPerfil),
    lerPerfis: operacao('lerPerfis', lerPerfis),
    listarEspacos: operacao('listarEspacos', listarEspacos),
    listarTopicos: operacao('listarTopicos', listarTopicos),
    lerTopico: operacao('lerTopico', lerTopico),
    lerRespostas: operacao('lerRespostas', lerRespostas),
    lerResposta: operacao('lerResposta', lerResposta),
    conferirTopicos: operacao('conferirTopicos', conferirTopicos),
    conferirRespostas: operacao('conferirRespostas', conferirRespostas),
    criarTopico: operacao('criarTopico', criarTopico),
    editarTopico: operacao('editarTopico', editarTopico),
    responder: operacao('responder', responder),
    editarResposta: operacao('editarResposta', editarResposta),
    denunciar: operacao('denunciar', denunciar),
    minhasDenuncias: operacao('minhasDenuncias', minhasDenuncias),
    alvosDasDenuncias: operacao('alvosDasDenuncias', alvosDasDenuncias),
    bloquear: operacao('bloquear', bloquear),
    desbloquear: operacao('desbloquear', desbloquear),
    listarBloqueios: operacao('listarBloqueios', listarBloqueios),
  }

  controles.set(dados, controle)
  return dados
}

function controleDe(dados: DadosComunidade): Controle {
  const controle = controles.get(dados)
  if (!controle) throw new Error('simularFalha e simularRespostaPerdida só valem para a memória')
  return controle
}

/** A próxima chamada da operação devolve o erro pedido, uma vez só, sem mudar nada. */
export function simularFalha(dados: DadosComunidade, operacao: OperacaoComunidade, erro: ChaveErroComunidade | ErroDados): void {
  const controle = controleDe(dados)
  const fila = controle.falhas.get(operacao) ?? []
  fila.push(typeof erro === 'string' ? erroDaChaveComunidade(erro) : erro)
  controle.falhas.set(operacao, fila)
}

/** A próxima chamada aplica a mudança e devolve `rede`: a resposta se perdeu depois de gravar. */
export function simularRespostaPerdida(dados: DadosComunidade, operacao: OperacaoComunidade): void {
  const controle = controleDe(dados)
  controle.perdidas.set(operacao, (controle.perdidas.get(operacao) ?? 0) + 1)
}
