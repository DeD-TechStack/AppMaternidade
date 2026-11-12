import type { ErroDados, Resultado } from './comum.ts'
import type { Pagina } from './comunidade.ts'
import { criarDadosComunidadeMemoria, type EstadoComunidade } from './comunidade.memoria.ts'
import { ehUuid, type EstadoDenuncia, type EstadoModeracao, type PapelPlataforma } from './comunidade.regras.ts'
import type {
  AcaoDeAuditoria,
  AlvoDeAuditoria,
  AlvoModeravel,
  ConteudoLido,
  DadosModeracao,
  Denuncia,
  FatorNovo,
  FatorTotp,
  FiltroDaFila,
  HistoricoDoPerfil,
  ItemDoHistorico,
  LinhaDeAuditoria,
  NivelDaSessao,
  OperacaoModeracao,
  PapelDaLista,
  TipoDeConteudo,
} from './moderacao.ts'
import { classificarErroModeracao, erroDaChaveModeracao, type ChaveErroModeracao } from './moderacao.erros.ts'
import {
  LIMITE_DA_AUDITORIA_DO_HISTORICO,
  LIMITE_DO_HISTORICO,
  LIMITE_DO_MOTIVO,
  POR_PAGINA_AUDITORIA,
  POR_PAGINA_FILA,
  estadosDaFila,
  ordenarFila,
  papelVigente,
} from './moderacao.regras.ts'
import { conferirLimite } from './comunidade.regras.ts'

// A implementação em memória do painel: reproduz as regras do banco que a tela usa (a leitura de cada
// tabela pelas políticas da MAT-47, as quatro funções de ação, as travas de papel), com os mesmos códigos
// e as mesmas mensagens. Age sobre o mesmo `EstadoComunidade` da Comunidade: ocultar um conteúdo aqui muda o
// que a Comunidade mostra. Nenhuma função lança exceção.

/** O código do app autenticador que a memória aceita (só para teste e demonstração). */
export const CODIGO_DE_TESTE_MFA = '123456'

// Uma imagem de 1 por 1 pixel: a memória não desenha QR, só entrega um endereço `data:` válido.
const QR_DA_MEMORIA =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

interface ContaMfa {
  fatores: FatorTotp[]
  nivel: NivelDaSessao
}

// A verificação em duas etapas por conta, para cada estado em memória.
const mfaPorEstado = new WeakMap<EstadoComunidade, Map<string, ContaMfa>>()

function mfaDaConta(estado: EstadoComunidade, conta: string): ContaMfa {
  let porConta = mfaPorEstado.get(estado)
  if (!porConta) {
    porConta = new Map()
    mfaPorEstado.set(estado, porConta)
  }
  let mfa = porConta.get(conta)
  if (!mfa) {
    mfa = { fatores: [], nivel: 'aal1' }
    porConta.set(conta, mfa)
  }
  return mfa
}

/** Os testes deixam uma conta com fatores e nível já definidos. */
export function prepararMfa(estado: EstadoComunidade, conta: string, parcial: Partial<ContaMfa>): void {
  const mfa = mfaDaConta(estado, conta)
  if (parcial.fatores) mfa.fatores = parcial.fatores.map((f) => ({ ...f }))
  if (parcial.nivel) mfa.nivel = parcial.nivel
}

/** Os fatores que a conta tem agora (os testes conferem o que foi removido e cadastrado). */
export function fatoresDaMemoria(estado: EstadoComunidade, conta: string): FatorTotp[] {
  return mfaDaConta(estado, conta).fatores.map((f) => ({ ...f }))
}

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

const maisNovoPrimeiro = <T extends { id: string }>(lista: readonly T[], quando: (item: T) => string): T[] =>
  [...lista].sort((a, b) => emMs(quando(b)) - emMs(quando(a)) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))

const CHECK = (tabela: string, restricao: string) =>
  `new row for relation "${tabela}" violates check constraint "${restricao}"`

const TIPO_UUID = (valor: string) => `invalid input syntax for type uuid: "${valor}"`

const CHAVE_DA_ACAO: Record<EstadoModeracao, AcaoDeAuditoria> = {
  oculto: 'ocultar',
  removido: 'remover',
  visivel: 'restaurar',
}

export function criarDadosModeracaoMemoria(
  estado: EstadoComunidade,
  contaDaSessao: ContaDaSessao,
  opcoes: OpcoesMemoria = {},
): DadosModeracao {
  const relogio = opcoes.agora ?? Date.now
  const controle: Controle = { falhas: new Map(), perdidas: new Map() }
  let ultimo = 0

  /** Cada linha nova tem uma data maior que a da anterior: a ordem do banco não empata. */
  function instante(): string {
    ultimo = Math.max(relogio(), ultimo + 1)
    return new Date(ultimo).toISOString()
  }

  // A leitura de conteúdo é a da Comunidade (MAT-40:RF-01): a mesma regra de quem lê o quê.
  const comunidade = criarDadosComunidadeMemoria(estado, contaDaSessao, opcoes)

  const ok = <T>(valor: T): Resultado<T> => ({ ok: true, valor })
  const falha = <T>(erro: ErroDados): Resultado<T> => ({ ok: false, erro })
  const falhaPg = <T>(codigo: string, mensagem: string): Resultado<T> =>
    falha(classificarErroModeracao({ code: codigo, message: mensagem }))

  // ---- as funções auxiliares das políticas -------------------------------------------------------

  const perfilDe = (conta: string) => estado.perfis.find((p) => p.contaId === conta)
  const vigentes = (conta: string) =>
    estado.papeis.filter((p) => p.contaId === conta && papelVigente(p.validoAte, relogio()))
  const moderacao = (conta: string) => vigentes(conta).length > 0
  const admin = (conta: string) => vigentes(conta).some((p) => p.papel === 'admin')

  // ---- a forma que a tela vê -----------------------------------------------------------------------

  const paraDenuncia = (d: EstadoComunidade['denuncias'][number]): Denuncia => ({
    id: d.id,
    topicoId: d.topicoId,
    respostaId: d.respostaId,
    perfilId: d.perfilId,
    motivo: d.motivo,
    texto: d.texto,
    estado: d.estado,
    decididaEm: d.decididaEm,
    criadaEm: d.criadaEm,
  })

  const paraAuditoria = (a: EstadoComunidade['auditoria'][number]): LinhaDeAuditoria => ({
    id: a.id,
    atorId: a.atorId,
    acao: a.acao as AcaoDeAuditoria,
    alvoTipo: a.alvoTipo as AlvoDeAuditoria,
    alvoId: a.alvoId,
    estadoAnterior: a.estadoAnterior,
    estadoNovo: a.estadoNovo,
    motivo: a.motivo,
    denunciaId: a.denunciaId,
    conteudo: a.conteudo,
    validoAte: a.validoAte,
    criadoEm: a.criadoEm,
  })

  // ---- as operações ------------------------------------------------------------------------------

  type Corpo<A extends unknown[], T> = (conta: string, ...args: A) => Resultado<T> | Promise<Resultado<T>>

  async function contaAtual(): Promise<string | null> {
    return typeof contaDaSessao === 'function' ? await contaDaSessao() : contaDaSessao
  }

  /** A operação com a sessão conferida, a falha simulada e a resposta perdida (o envoltório). */
  function operacao<A extends unknown[], T>(nome: OperacaoModeracao, corpo: Corpo<A, T>) {
    return async (...args: A): Promise<Resultado<T>> => {
      const simulada = controle.falhas.get(nome)?.shift()
      if (simulada) return { ok: false, erro: simulada }
      const conta = await contaAtual()
      if (!conta) return falha(erroDaChaveModeracao('sessao_encerrada'))
      const resultado = await corpo(conta, ...args)
      const perdidas = controle.perdidas.get(nome) ?? 0
      if (perdidas > 0) {
        controle.perdidas.set(nome, perdidas - 1)
        // A mudança já foi aplicada; só a resposta se perdeu.
        if (resultado.ok) return falha(erroDaChaveModeracao('rede'))
      }
      return resultado
    }
  }

  function filaDeDenuncias(conta: string, filtro: FiltroDaFila, pagina: number): Resultado<Pagina<Denuncia>> {
    // A política só deixa a moderação ler: para as outras pessoas a tabela é vazia, sem erro.
    if (!moderacao(conta)) return ok({ itens: [], haMais: false })
    const estados = estadosDaFila(filtro.estados)
    const lidas = estado.denuncias
      .filter((d) => estados.includes(d.estado) && (filtro.motivo === null || d.motivo === filtro.motivo))
      .map(paraDenuncia)
    const itens = ordenarFila(lidas).slice(pagina * POR_PAGINA_FILA, (pagina + 1) * POR_PAGINA_FILA)
    return ok({ itens, haMais: itens.length === POR_PAGINA_FILA })
  }

  function lerDenuncia(conta: string, id: string): Resultado<Denuncia | null> {
    if (!moderacao(conta)) return ok(null)
    const achada = estado.denuncias.find((d) => d.id === id)
    return ok(achada ? paraDenuncia(achada) : null)
  }

  async function lerConteudo(_conta: string, tipo: TipoDeConteudo, id: string): Promise<Resultado<ConteudoLido | null>> {
    if (tipo === 'topico') {
      const lido = await comunidade.lerTopico(id)
      if (!lido.ok) return lido
      return ok(lido.valor ? { tipo: 'topico', topico: lido.valor } : null)
    }
    const lida = await comunidade.lerResposta(id)
    if (!lida.ok) return lida
    return ok(lida.valor ? { tipo: 'resposta', resposta: lida.valor.resposta, topicoTitulo: lida.valor.topicoTitulo } : null)
  }

  function historicoDoPerfil(conta: string, perfilId: string): Resultado<HistoricoDoPerfil> {
    if (!moderacao(conta)) return ok({ conteudos: [], auditoria: [] })
    const topicos: ItemDoHistorico[] = estado.topicos
      .filter((t) => t.autorId === perfilId)
      .map((t) => ({
        tipo: 'topico',
        id: t.id,
        topicoId: t.id,
        titulo: t.titulo,
        corpo: t.corpo,
        estado: t.estado,
        motivoModeracao: t.motivoModeracao,
        criadoEm: t.criadoEm,
      }))
    const respostas: ItemDoHistorico[] = estado.respostas
      .filter((r) => r.autorId === perfilId)
      .map((r) => ({
        tipo: 'resposta',
        id: r.id,
        topicoId: r.topicoId,
        titulo: null,
        corpo: r.corpo,
        estado: r.estado,
        motivoModeracao: r.motivoModeracao,
        criadoEm: r.criadoEm,
      }))
    const conteudos = maisNovoPrimeiro([...topicos, ...respostas], (item) => item.criadoEm).slice(0, LIMITE_DO_HISTORICO)
    const ids = new Set(conteudos.map((item) => item.id))
    const auditoria = maisNovoPrimeiro(
      estado.auditoria.filter((a) => ids.has(a.alvoId)),
      (a) => a.criadoEm,
    )
      .slice(0, LIMITE_DA_AUDITORIA_DO_HISTORICO)
      .map(paraAuditoria)
    return ok({ conteudos, auditoria })
  }

  /** Quem pode agir: a moderação (`tem_papel_plataforma` de moderador ou admin). */
  function conferirModeracao(conta: string): ErroDados | null {
    return moderacao(conta) ? null : classificarErroModeracao({ code: '42501', message: 'sem papel de plataforma' })
  }

  function moderarConteudo(
    conta: string,
    alvo: AlvoModeravel,
    novoEstado: EstadoModeracao,
    motivo: string,
    denunciaId: string | null,
  ): Resultado<string> {
    // O PostgREST converte os argumentos antes de a função rodar.
    for (const id of [alvo.id, denunciaId]) {
      if (id !== null && id !== undefined && id !== '' && !ehUuid(id)) return falhaPg('22P02', TIPO_UUID(id))
    }
    const semPapel = conferirModeracao(conta)
    if (semPapel) return falha(semPapel)
    if (!alvo.tipo || !alvo.id || !novoEstado) return falhaPg('P0001', 'parametro obrigatorio')
    if (!motivo || motivo.trim() === '') return falhaPg('P0001', 'motivo vazio')

    const topico = alvo.tipo === 'topico' ? estado.topicos.find((t) => t.id === alvo.id) : undefined
    const resposta = alvo.tipo === 'resposta' ? estado.respostas.find((r) => r.id === alvo.id) : undefined
    const item = topico ?? resposta
    if (!item) return falhaPg('P0002', 'alvo inexistente')

    const denuncia = denunciaId ? estado.denuncias.find((d) => d.id === denunciaId) : undefined
    if (denunciaId) {
      if (!denuncia) return falhaPg('P0002', 'denuncia inexistente')
      const mesmoAlvo = alvo.tipo === 'topico' ? denuncia.topicoId === alvo.id : denuncia.respostaId === alvo.id
      if (!mesmoAlvo) return falhaPg('P0001', 'denuncia de outro alvo')
    }

    const proprio = perfilDe(conta)?.id ?? null
    if ((item.autorId !== null && item.autorId === proprio) || (denuncia && denuncia.denuncianteId === conta)) {
      return falhaPg('P0001', 'conflito de interesse')
    }
    if (item.estado === novoEstado) return falhaPg('P0001', 'estado igual')
    // A restrição da auditoria: o motivo tem de 1 a 300 caracteres.
    if (conferirLimite(motivo, LIMITE_DO_MOTIVO) !== 'ok') {
      return falhaPg('23514', CHECK('auditoria_moderacao', 'auditoria_moderacao_motivo_tamanho'))
    }

    const anterior = item.estado
    item.estado = novoEstado
    item.motivoModeracao = novoEstado === 'visivel' ? null : motivo
    const id = novoId()
    estado.auditoria.push({
      id,
      atorId: conta,
      acao: CHAVE_DA_ACAO[novoEstado],
      alvoTipo: alvo.tipo,
      alvoId: alvo.id,
      estadoAnterior: anterior,
      estadoNovo: novoEstado,
      motivo,
      denunciaId: denunciaId ?? null,
      conteudo: topico ? `${topico.titulo}\n\n${topico.corpo}` : (resposta?.corpo ?? null),
      validoAte: null,
      criadoEm: instante(),
    })
    return ok(id)
  }

  function decidirDenuncia(conta: string, denunciaId: string, decisao: EstadoDenuncia, motivo: string): Resultado<string> {
    if (denunciaId && !ehUuid(denunciaId)) return falhaPg('22P02', TIPO_UUID(denunciaId))
    const semPapel = conferirModeracao(conta)
    if (semPapel) return falha(semPapel)
    if (!denunciaId || !decisao) return falhaPg('P0001', 'parametro obrigatorio')
    if (!motivo || motivo.trim() === '') return falhaPg('P0001', 'motivo vazio')

    const denuncia = estado.denuncias.find((d) => d.id === denunciaId)
    if (!denuncia) return falhaPg('P0002', 'denuncia inexistente')
    if (decisao === 'aberta') return falhaPg('P0001', 'decisao invalida')

    const proprio = perfilDe(conta)?.id ?? null
    const doProprio =
      proprio !== null &&
      (denuncia.perfilId === proprio ||
        estado.topicos.some((t) => t.id === denuncia.topicoId && t.autorId === proprio) ||
        estado.respostas.some((r) => r.id === denuncia.respostaId && r.autorId === proprio))
    if (denuncia.denuncianteId === conta || doProprio) return falhaPg('P0001', 'conflito de interesse')

    if (denuncia.estado === 'procedente' || denuncia.estado === 'improcedente') {
      return falhaPg('P0001', 'denuncia ja decidida')
    }
    if (denuncia.estado === decisao) return falhaPg('P0001', 'estado igual')
    if (conferirLimite(motivo, LIMITE_DO_MOTIVO) !== 'ok') {
      return falhaPg('23514', CHECK('auditoria_moderacao', 'auditoria_moderacao_motivo_tamanho'))
    }

    const final = decisao === 'procedente' || decisao === 'improcedente'
    const anterior = denuncia.estado
    denuncia.estado = decisao
    denuncia.decididaPor = final ? conta : null
    denuncia.decididaEm = final ? instante() : null
    const id = novoId()
    estado.auditoria.push({
      id,
      atorId: conta,
      acao: 'decidir_denuncia',
      alvoTipo: 'denuncia',
      alvoId: denunciaId,
      estadoAnterior: anterior,
      estadoNovo: decisao,
      motivo,
      denunciaId,
      conteudo: null,
      validoAte: null,
      criadoEm: instante(),
    })
    return ok(id)
  }

  function auditoria(conta: string, pagina: number): Resultado<Pagina<LinhaDeAuditoria>> {
    if (!moderacao(conta)) return ok({ itens: [], haMais: false })
    const itens = maisNovoPrimeiro(estado.auditoria, (a) => a.criadoEm)
      .slice(pagina * POR_PAGINA_AUDITORIA, (pagina + 1) * POR_PAGINA_AUDITORIA)
      .map(paraAuditoria)
    return ok({ itens, haMais: itens.length === POR_PAGINA_AUDITORIA })
  }

  function papeis(conta: string): Resultado<PapelDaLista[]> {
    // A política: cada conta vê os próprios papéis (vencidos também); o admin vigente vê todos.
    const visiveis = admin(conta) ? estado.papeis : estado.papeis.filter((p) => p.contaId === conta)
    const linhas = [...visiveis].sort(
      (a, b) =>
        emMs(b.concedidoEm) - emMs(a.concedidoEm) ||
        (a.contaId < b.contaId ? -1 : a.contaId > b.contaId ? 1 : a.papel < b.papel ? -1 : 1),
    )
    return ok(linhas.map((p) => ({ ...p })))
  }

  function conferirAdmin(conta: string): ErroDados | null {
    return admin(conta) ? null : classificarErroModeracao({ code: '42501', message: 'sem papel de plataforma' })
  }

  function concederPapel(
    conta: string,
    alvo: string,
    papel: PapelPlataforma,
    motivo: string,
    validoAte: string | null,
  ): Resultado<string> {
    if (alvo && !ehUuid(alvo)) return falhaPg('22P02', TIPO_UUID(alvo))
    const semPapel = conferirAdmin(conta)
    if (semPapel) return falha(semPapel)
    if (!alvo || !papel) return falhaPg('P0001', 'parametro obrigatorio')
    if (!motivo || motivo.trim() === '') return falhaPg('P0001', 'motivo vazio')
    if (validoAte !== null && !(emMs(validoAte) > relogio())) return falhaPg('P0001', 'validade no passado')
    if (!estado.contas.includes(alvo)) return falhaPg('P0002', 'conta inexistente')
    if (conferirLimite(motivo, LIMITE_DO_MOTIVO) !== 'ok') {
      return falhaPg('23514', CHECK('auditoria_moderacao', 'auditoria_moderacao_motivo_tamanho'))
    }

    const existente = estado.papeis.find((p) => p.contaId === alvo && p.papel === papel)
    const agora = instante()
    if (existente) {
      existente.validoAte = validoAte
      existente.concedidoPor = conta
      existente.concedidoEm = agora
    } else {
      estado.papeis.push({ contaId: alvo, papel, concedidoPor: conta, concedidoEm: agora, validoAte })
    }
    const id = novoId()
    estado.auditoria.push({
      id,
      atorId: conta,
      acao: 'conceder_papel',
      alvoTipo: 'papel_plataforma',
      alvoId: alvo,
      estadoAnterior: existente ? papel : null,
      estadoNovo: papel,
      motivo,
      denunciaId: null,
      conteudo: null,
      validoAte,
      criadoEm: instante(),
    })
    return ok(id)
  }

  function revogarPapel(conta: string, alvo: string, papel: PapelPlataforma, motivo: string): Resultado<string> {
    if (alvo && !ehUuid(alvo)) return falhaPg('22P02', TIPO_UUID(alvo))
    const semPapel = conferirAdmin(conta)
    if (semPapel) return falha(semPapel)
    if (!alvo || !papel) return falhaPg('P0001', 'parametro obrigatorio')
    if (!motivo || motivo.trim() === '') return falhaPg('P0001', 'motivo vazio')

    const linha = estado.papeis.find((p) => p.contaId === alvo && p.papel === papel)
    if (!linha) return falhaPg('P0002', 'papel inexistente')

    // Nunca deixa o sistema sem admin vigente.
    if (
      papel === 'admin' &&
      papelVigente(linha.validoAte, relogio()) &&
      !estado.papeis.some((p) => p.papel === 'admin' && p.contaId !== alvo && papelVigente(p.validoAte, relogio()))
    ) {
      return falhaPg('P0001', 'ultimo admin')
    }
    if (conferirLimite(motivo, LIMITE_DO_MOTIVO) !== 'ok') {
      return falhaPg('23514', CHECK('auditoria_moderacao', 'auditoria_moderacao_motivo_tamanho'))
    }

    estado.papeis = estado.papeis.filter((p) => p !== linha)
    const id = novoId()
    estado.auditoria.push({
      id,
      atorId: conta,
      acao: 'revogar_papel',
      alvoTipo: 'papel_plataforma',
      alvoId: alvo,
      estadoAnterior: papel,
      estadoNovo: null,
      motivo,
      denunciaId: null,
      conteudo: null,
      validoAte: null,
      criadoEm: instante(),
    })
    return ok(id)
  }

  // ---- a verificação em duas etapas (MAT-40:RF-20) -------------------------------------------------

  const nivelDaSessao = (conta: string): Resultado<NivelDaSessao> => ok(mfaDaConta(estado, conta).nivel)

  const fatores = (conta: string): Resultado<FatorTotp[]> => ok(mfaDaConta(estado, conta).fatores.map((f) => ({ ...f })))

  function cadastrarFator(conta: string): Resultado<FatorNovo> {
    const mfa = mfaDaConta(estado, conta)
    // Antes de cadastrar, remove cada fator TOTP que nunca foi verificado.
    mfa.fatores = mfa.fatores.filter((f) => f.verificado)
    const fator = { id: novoId(), verificado: false }
    mfa.fatores.push(fator)
    return ok({ id: fator.id, chave: 'JBSWY3DPEHPK3PXP', qr: QR_DA_MEMORIA })
  }

  function confirmarCodigo(conta: string, fatorId: string, codigo: string): Resultado<null> {
    const mfa = mfaDaConta(estado, conta)
    const fator = mfa.fatores.find((f) => f.id === fatorId)
    if (!fator) return falha(erroDaChaveModeracao('mfa_indisponivel'))
    if (codigo !== CODIGO_DE_TESTE_MFA) return falha(erroDaChaveModeracao('codigo_invalido'))
    fator.verificado = true
    mfa.nivel = 'aal2'
    return ok(null)
  }

  const dados: DadosModeracao = {
    filaDeDenuncias: operacao('filaDeDenuncias', filaDeDenuncias),
    lerDenuncia: operacao('lerDenuncia', lerDenuncia),
    lerConteudo: operacao('lerConteudo', lerConteudo),
    historicoDoPerfil: operacao('historicoDoPerfil', historicoDoPerfil),
    moderarConteudo: operacao('moderarConteudo', moderarConteudo),
    decidirDenuncia: operacao('decidirDenuncia', decidirDenuncia),
    auditoria: operacao('auditoria', auditoria),
    papeis: operacao('papeis', papeis),
    concederPapel: operacao('concederPapel', concederPapel),
    revogarPapel: operacao('revogarPapel', revogarPapel),
    nivelDaSessao: operacao('nivelDaSessao', nivelDaSessao),
    fatores: operacao('fatores', fatores),
    cadastrarFator: operacao('cadastrarFator', cadastrarFator),
    confirmarCodigo: operacao('confirmarCodigo', confirmarCodigo),
  }

  controles.set(dados, controle)
  return dados
}

function controleDe(dados: DadosModeracao): Controle {
  const controle = controles.get(dados)
  if (!controle) throw new Error('simularFalhaModeracao e simularRespostaPerdidaModeracao só valem para a memória')
  return controle
}

/** A próxima chamada da operação devolve o erro pedido, uma vez só, sem mudar nada. */
export function simularFalhaModeracao(
  dados: DadosModeracao,
  operacao: OperacaoModeracao,
  erro: ChaveErroModeracao | ErroDados,
): void {
  const controle = controleDe(dados)
  const fila = controle.falhas.get(operacao) ?? []
  fila.push(typeof erro === 'string' ? erroDaChaveModeracao(erro) : erro)
  controle.falhas.set(operacao, fila)
}

/** A próxima chamada aplica a mudança e devolve `rede`: a resposta se perdeu depois de gravar. */
export function simularRespostaPerdidaModeracao(dados: DadosModeracao, operacao: OperacaoModeracao): void {
  const controle = controleDe(dados)
  controle.perdidas.set(operacao, (controle.perdidas.get(operacao) ?? 0) + 1)
}
