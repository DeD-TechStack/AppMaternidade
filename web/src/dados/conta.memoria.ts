import { dataNoFuso, fusoValido, type ErroDados, type Papel, type Resultado } from './comum.ts'
import { classificarErroConta, erroDaChave, type ChaveErro } from './conta.erros.ts'
import type {
  Bebe,
  Conta,
  ConviteCriado,
  ConviteResumo,
  DadosConta,
  DetalheFamilia,
  EventoSessao,
  FamiliaResumo,
  Membro,
  OperacaoConta,
  PreviaConvite,
  Usuario,
} from './conta.ts'

// A implementação em memória: reproduz as regras do banco que a tela usa, com os mesmos códigos e
// mensagens (MAT-45: ordem de conferência, P0002 por operação, 42501, valor, convite, papéis,
// exclusão de conta). Os dados vivem só na página aberta. Nenhuma função lança exceção.

/** O estado inicial da memória: as mesmas tabelas do banco, só com as colunas que a tela usa. */
export interface FixtureConta {
  usuarios: Array<{ id: string; email: string; senha: string; nomeMetadados: string | null }>
  contas: Array<{ id: string; nome: string; fuso: string; criadaEm: string }>
  familias: Array<{ id: string; nome: string; fuso: string; criadaEm: string; criadaPor: string }>
  vinculos: Array<{
    id: string
    familiaId: string
    contaId: string
    papel: Papel
    estado: 'ativo' | 'revogado' | 'saiu'
    validoAte: string | null
    criadoEm: string
    concedidoPor: string | null
  }>
  bebes: Array<{
    id: string
    familiaId: string
    nome: string
    nascimento: string
    estado: 'ativo' | 'arquivado'
    criadoEm: string
    criadoPor: string | null
  }>
  convites: Array<{
    id: string
    familiaId: string
    papel: Papel
    validoAte: string | null
    criadoPor: string | null
    codigo: string
    expiraEm: string
    estado: 'pendente' | 'aceito' | 'revogado'
    criadoEm: string
  }>
}

interface OpcoesMemoria {
  /** O relógio da memória; o padrão é `Date.now`. Os testes injetam um fixo. */
  agora?: () => number
  /** Com "Confirm email" ligado, criar o usuário não devolve sessão. */
  confirmarEmail?: boolean
}

/** A memória, com o que só os testes precisam: abrir o link de recuperação, sair "por fora"... */
export interface DadosContaMemoria extends DadosConta {
  /** O `voltarPara` do último pedido de recuperação do e-mail (a memória não manda e-mail). */
  ultimoPedidoDeRecuperacao(email: string): string | undefined
  /** Simula abrir o link do e-mail: entra como a pessoa e emite `entrou` e `recuperacao`. */
  abrirLinkDeRecuperacao(email: string): Usuario | null
  /** Simula a sessão encerrada noutra aba: emite `saiu` sem ninguém ter pedido. */
  encerrarSessaoPorFora(): void
  /** Deixa a pessoa entrada antes de a tela montar (sem senha e sem evento). */
  sessaoParaTeste(email: string | null): void
}

interface UsuarioMem {
  id: string
  email: string
  senha: string
  nomeMetadados: string | null
}
interface ContaMem {
  id: string
  nome: string
  fuso: string
  criadaEm: string
}
interface FamiliaMem {
  id: string
  nome: string
  fuso: string
  criadaEm: string
  criadaPor: string
}
interface VinculoMem {
  id: string
  familiaId: string
  contaId: string
  papel: Papel
  estado: 'ativo' | 'revogado' | 'saiu'
  validoAte: string | null
  criadoEm: string
  concedidoPor: string | null
  epoca: number
  encerradoEm: string | null
}
interface BebeMem {
  id: string
  familiaId: string
  nome: string
  nascimento: string
  estado: 'ativo' | 'arquivado'
  criadoEm: string
  criadoPor: string | null
}
interface ConviteMem {
  id: string
  familiaId: string
  papel: Papel
  validoAte: string | null
  criadoPor: string | null
  codigo: string
  expiraEm: string
  estado: 'pendente' | 'aceito' | 'revogado'
  aceitoPor: string | null
  aceitoEm: string | null
  criadoEm: string
}

type Ouvinte = (evento: EventoSessao, usuario: Usuario | null) => void

interface Controle {
  falhas: Map<string, ErroDados[]>
  perdidas: Map<string, number>
}

const controles = new WeakMap<object, Controle>()

const SETE_DIAS = 7 * 86_400_000
const FORMATO_DO_CODIGO = /^[0-9a-f]{64}$/
const FORMATO_DO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function hexadecimal(tamanho: number): string {
  return Array.from({ length: tamanho }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

function novoId(): string {
  return `${hexadecimal(8)}-${hexadecimal(4)}-4${hexadecimal(3)}-8${hexadecimal(3)}-${hexadecimal(12)}`
}

/** O formato de data e hora do JSON do banco: UTC com microssegundos. */
function paraJson(texto: string | null): string | null {
  if (texto === null) return null
  return new Date(texto).toISOString().replace(/\.(\d{3})Z$/, '.$1000Z')
}

const ordenarPor = <T>(lista: T[], chave: (item: T) => [string, string]): T[] =>
  [...lista].sort((a, b) => {
    const [a1, a2] = chave(a)
    const [b1, b2] = chave(b)
    return a1 < b1 ? -1 : a1 > b1 ? 1 : a2 < b2 ? -1 : a2 > b2 ? 1 : 0
  })

export function criarDadosContaMemoria(fixture: FixtureConta, opcoes: OpcoesMemoria = {}): DadosContaMemoria {
  const agora = opcoes.agora ?? Date.now
  const iso = (instante: number) => new Date(instante).toISOString()
  const em = (texto: string) => Date.parse(texto)

  const usuarios: UsuarioMem[] = fixture.usuarios.map((u) => ({ ...u }))
  const contas: ContaMem[] = fixture.contas.map((c) => ({ ...c }))
  const familias: FamiliaMem[] = fixture.familias.map((f) => ({ ...f }))
  const vinculos: VinculoMem[] = fixture.vinculos.map((v) => ({ ...v, epoca: 1, encerradoEm: null }))
  const bebes: BebeMem[] = fixture.bebes.map((b) => ({ ...b }))
  const convites: ConviteMem[] = fixture.convites.map((c) => ({ ...c, aceitoPor: null, aceitoEm: null }))

  let sessao: string | null = null
  const ouvintes = new Set<Ouvinte>()
  const recuperacoes = new Map<string, string>()
  const controle: Controle = { falhas: new Map(), perdidas: new Map() }

  // ---- auxiliares ---------------------------------------------------------------------------

  const ok = <T>(valor: T): Resultado<T> => ({ ok: true, valor })
  const falha = <T>(erro: ErroDados): Resultado<T> => ({ ok: false, erro })
  const falhaPg = <T>(codigo: string, mensagem: string): Resultado<T> =>
    falha(classificarErroConta({ code: codigo, message: mensagem }))
  const falhaAuth = <T>(chave: ChaveErro): Resultado<T> => falha(erroDaChave(chave))

  const paraUsuario = (u: UsuarioMem): Usuario => ({ id: u.id, email: u.email, nomeMetadados: u.nomeMetadados })

  function emitir(evento: EventoSessao, usuario: Usuario | null) {
    queueMicrotask(() => {
      for (const ouvinte of [...ouvintes]) ouvinte(evento, usuario)
    })
  }

  const usuarioAtual = () => (sessao ? usuarios.find((u) => u.id === sessao) : undefined)
  const vale = (v: VinculoMem) => v.estado === 'ativo' && (v.validoAte === null || em(v.validoAte) > agora())
  const vinculoAtivoDe = (familiaId: string, contaId: string) =>
    vinculos.find((v) => v.familiaId === familiaId && v.contaId === contaId && vale(v))
  const responsaveisAtivos = (familiaId: string) =>
    vinculos.filter((v) => v.familiaId === familiaId && v.papel === 'responsavel' && vale(v))
  const conviteVencido = (c: ConviteMem) =>
    em(c.expiraEm) <= agora() || (c.validoAte !== null && em(c.validoAte) <= agora())

  /** A sessão, os parâmetros obrigatórios e a conta, nessa ordem (cabeçalho de `20261106097200`). */
  function preludio(...obrigatorios: unknown[]): Resultado<{ usuario: UsuarioMem; conta: ContaMem }> {
    const usuario = usuarioAtual()
    if (!usuario) return falhaAuth('sessao_encerrada')
    if (obrigatorios.some((valor) => valor === null || valor === undefined || valor === '')) {
      return falhaPg('P0001', 'parametro obrigatorio')
    }
    const conta = contas.find((c) => c.id === usuario.id)
    if (!conta) return falhaPg('P0001', 'conta inexistente')
    return ok({ usuario, conta })
  }

  /** Existência e visibilidade (P0002) e, se pedido, o papel de escrita (42501). */
  function alcance(
    familiaId: string,
    contaId: string,
    mensagemP0002: string,
    exigeResponsavel: boolean,
  ): Resultado<{ familia: FamiliaMem; meu: VinculoMem }> {
    const familia = familias.find((f) => f.id === familiaId)
    const meu = familia ? vinculoAtivoDe(familiaId, contaId) : undefined
    if (!familia || !meu) return falhaPg('P0002', mensagemP0002)
    if (exigeResponsavel && meu.papel !== 'responsavel') return falhaPg('42501', 'sem permissao')
    return ok({ familia, meu })
  }

  const paraConta = (c: ContaMem, email: string): Conta => ({
    id: c.id,
    nome: c.nome,
    fuso: c.fuso,
    email,
    criadaEm: c.criadaEm,
  })

  const resumo = (f: FamiliaMem, meu: VinculoMem): FamiliaResumo => ({
    id: f.id,
    nome: f.nome,
    fuso: f.fuso,
    criadaEm: f.criadaEm,
    meuPapel: meu.papel,
    meuVinculoId: meu.id,
    meuAcessoAte: meu.validoAte,
  })

  const paraBebe = (b: BebeMem): Bebe => ({
    id: b.id,
    familiaId: b.familiaId,
    nome: b.nome,
    nascimento: b.nascimento,
    estado: b.estado,
  })

  /** As contas que a pessoa enxerga: a própria e as que têm vínculo ativo nas famílias dela. */
  function contasVisiveis(contaId: string): Set<string> {
    const visiveis = new Set<string>([contaId])
    const minhas = vinculos.filter((v) => v.contaId === contaId && vale(v)).map((v) => v.familiaId)
    for (const v of vinculos) if (vale(v) && minhas.includes(v.familiaId)) visiveis.add(v.contaId)
    return visiveis
  }

  const nomeDaConta = (id: string | null, visiveis: Set<string>): string | null => {
    if (id === null || !visiveis.has(id)) return null
    return contas.find((c) => c.id === id)?.nome ?? null
  }

  /** Revoga os convites pendentes que uma conta criou numa família (D5). */
  function revogarConvitesDe(contaId: string, familiaId: string | null) {
    for (const c of convites) {
      if (c.criadoPor === contaId && c.estado === 'pendente' && (familiaId === null || c.familiaId === familiaId)) {
        c.estado = 'revogado'
      }
    }
  }

  function achar(codigo: string): ConviteMem | undefined {
    return convites.find((c) => c.codigo === codigo)
  }

  /** Normaliza o código (D2) e confere o convite na ordem da MAT-45. */
  function conferirConvite(codigoBruto: string): Resultado<ConviteMem> {
    const codigo = codigoBruto.trim().toLowerCase()
    if (!FORMATO_DO_CODIGO.test(codigo)) return falhaPg('P0001', 'convite invalido')
    const convite = achar(codigo)
    if (!convite) return falhaPg('P0001', 'convite invalido')
    if (convite.estado === 'revogado') return falhaPg('P0001', 'convite revogado')
    if (convite.estado === 'aceito') return falhaPg('P0001', 'convite usado')
    if (conviteVencido(convite)) return falhaPg('P0001', 'convite vencido')
    return ok(convite)
  }

  // ---- as operações (corpos síncronos) --------------------------------------------------------

  function entrar(email: string, senha: string): Resultado<Usuario> {
    const usuario = usuarios.find((u) => u.email === email.trim().toLowerCase())
    if (!usuario || usuario.senha !== senha) return falhaAuth('credenciais')
    sessao = usuario.id
    const dados = paraUsuario(usuario)
    emitir('entrou', dados)
    return ok(dados)
  }

  function criarUsuario(
    emailBruto: string,
    senha: string,
    nome: string,
  ): Resultado<{ usuario: Usuario; comSessao: boolean }> {
    const email = emailBruto.trim().toLowerCase()
    if (!FORMATO_DO_EMAIL.test(email)) return falhaAuth('email_invalido')
    if (senha.length < 6) return falhaAuth('senha_fraca')
    if (usuarios.some((u) => u.email === email)) return falhaAuth('email_em_uso')
    const usuario: UsuarioMem = { id: novoId(), email, senha, nomeMetadados: nome }
    usuarios.push(usuario)
    const dados = paraUsuario(usuario)
    if (opcoes.confirmarEmail) return ok({ usuario: dados, comSessao: false })
    sessao = usuario.id
    emitir('entrou', dados)
    return ok({ usuario: dados, comSessao: true })
  }

  function pedirRecuperacao(email: string, voltarPara: string): Resultado<null> {
    // A resposta é a mesma para e-mail existente ou não.
    recuperacoes.set(email.trim().toLowerCase(), voltarPara)
    return ok(null)
  }

  function trocarSenha(nova: string): Resultado<null> {
    const usuario = usuarioAtual()
    if (!usuario) return falhaAuth('sessao_encerrada')
    if (nova === usuario.senha) return falhaAuth('senha_igual')
    if (nova.length < 6) return falhaAuth('senha_fraca')
    usuario.senha = nova
    emitir('usuario_atualizado', paraUsuario(usuario))
    return ok(null)
  }

  function sair(): Resultado<null> {
    if (sessao) {
      sessao = null
      emitir('saiu', null)
    }
    return ok(null)
  }

  function minhaConta(): Resultado<Conta | null> {
    const usuario = usuarioAtual()
    if (!usuario) return falhaAuth('sessao_encerrada')
    const conta = contas.find((c) => c.id === usuario.id)
    return ok(conta ? paraConta(conta, usuario.email) : null)
  }

  function criarMinhaConta(nome: string, fuso: string): Resultado<Conta> {
    const usuario = usuarioAtual()
    if (!usuario) return falhaAuth('sessao_encerrada')
    if (contas.some((c) => c.id === usuario.id)) {
      return falha(classificarErroConta({ code: '23505', message: 'duplicate key value violates unique constraint "contas_pkey"' }))
    }
    if (!fusoValido(fuso)) return falhaPg('23514', 'fuso invalido')
    const conta: ContaMem = { id: usuario.id, nome, fuso, criadaEm: iso(agora()) }
    contas.push(conta)
    return ok(paraConta(conta, usuario.email))
  }

  function atualizarMinhaConta(nome: string, fuso: string): Resultado<Conta> {
    const usuario = usuarioAtual()
    if (!usuario) return falhaAuth('sessao_encerrada')
    const conta = contas.find((c) => c.id === usuario.id)
    // Zero linhas no update da própria conta: a sessão já não vale.
    if (!conta) return falhaAuth('sessao_encerrada')
    if (!fusoValido(fuso)) return falhaPg('23514', 'fuso invalido')
    conta.nome = nome
    conta.fuso = fuso
    return ok(paraConta(conta, usuario.email))
  }

  function minhasFamilias(): Resultado<FamiliaResumo[]> {
    const usuario = usuarioAtual()
    if (!usuario) return falhaAuth('sessao_encerrada')
    const minhas = vinculos.filter((v) => v.contaId === usuario.id && vale(v))
    const lista = minhas.flatMap((v) => {
      const familia = familias.find((f) => f.id === v.familiaId)
      return familia ? [resumo(familia, v)] : []
    })
    return ok(ordenarPor(lista, (f) => [f.criadaEm, f.id]))
  }

  function detalheFamilia(familiaId: string): Resultado<DetalheFamilia> {
    const usuario = usuarioAtual()
    if (!usuario) return falhaAuth('sessao_encerrada')
    const achado = alcance(familiaId, usuario.id, 'familia inexistente', false)
    if (!achado.ok) return achado
    const { familia, meu } = achado.valor
    const visiveis = contasVisiveis(usuario.id)

    const membros: Membro[] = ordenarPor(
      vinculos.filter((v) => v.familiaId === familiaId && vale(v)),
      (v) => [v.criadoEm, v.contaId],
    ).map((v) => ({
      vinculoId: v.id,
      contaId: v.contaId,
      nome: nomeDaConta(v.contaId, visiveis) ?? '',
      papel: v.papel,
      validoAte: v.validoAte,
      souEu: v.contaId === usuario.id,
    }))

    const listaDeBebes = ordenarPor(
      bebes.filter((b) => b.familiaId === familiaId),
      (b) => [b.criadoEm, b.id],
    ).map(paraBebe)

    const listaDeConvites: ConviteResumo[] | null =
      meu.papel === 'responsavel'
        ? ordenarPor(
            convites.filter((c) => c.familiaId === familiaId && c.estado === 'pendente'),
            (c) => [c.criadoEm, c.id],
          ).map((c) => ({
            id: c.id,
            papel: c.papel,
            validoAte: c.validoAte,
            expiraEm: c.expiraEm,
            criadoPorNome: nomeDaConta(c.criadoPor, visiveis),
            vencido: conviteVencido(c),
          }))
        : null

    return ok({ familia: resumo(familia, meu), bebes: listaDeBebes, membros, convites: listaDeConvites })
  }

  function criarFamilia(nome: string, fuso: string): Resultado<string> {
    const pre = preludio()
    if (!pre.ok) return pre
    if (nome === null || nome === undefined || nome.trim() === '') return falhaPg('P0001', 'nome vazio')
    if (!fusoValido(fuso)) return falhaPg('23514', 'fuso invalido')
    const familia: FamiliaMem = { id: novoId(), nome, fuso, criadaEm: iso(agora()), criadaPor: pre.valor.conta.id }
    familias.push(familia)
    vinculos.push({
      id: novoId(),
      familiaId: familia.id,
      contaId: pre.valor.conta.id,
      papel: 'responsavel',
      estado: 'ativo',
      validoAte: null,
      criadoEm: iso(agora()),
      concedidoPor: null,
      epoca: 1,
      encerradoEm: null,
    })
    return ok(familia.id)
  }

  function atualizarFamilia(familiaId: string, nome: string, fuso: string): Resultado<FamiliaResumo> {
    const pre = preludio(familiaId)
    if (!pre.ok) return pre
    const achado = alcance(familiaId, pre.valor.conta.id, 'familia inexistente', true)
    if (!achado.ok) return achado
    if (!fusoValido(fuso)) return falhaPg('23514', 'fuso invalido')
    achado.valor.familia.nome = nome
    achado.valor.familia.fuso = fuso
    return ok(resumo(achado.valor.familia, achado.valor.meu))
  }

  function cadastrarBebe(familiaId: string, nome: string, nascimento: string): Resultado<Bebe> {
    const pre = preludio(familiaId)
    if (!pre.ok) return pre
    const achado = alcance(familiaId, pre.valor.conta.id, 'familia inexistente', true)
    if (!achado.ok) return achado
    if (nascimento > dataNoFuso(agora(), achado.valor.familia.fuso)) return falhaPg('23514', 'nascimento no futuro')
    const bebe: BebeMem = {
      id: novoId(),
      familiaId,
      nome,
      nascimento,
      estado: 'ativo',
      criadoEm: iso(agora()),
      criadoPor: pre.valor.conta.id,
    }
    bebes.push(bebe)
    return ok(paraBebe(bebe))
  }

  /** O bebê, se existe numa família que a pessoa enxerga; senão P0002 `bebe inexistente`. */
  function alcanceDoBebe(bebeId: string, contaId: string): Resultado<{ bebe: BebeMem; familia: FamiliaMem }> {
    const bebe = bebes.find((b) => b.id === bebeId)
    const familia = bebe ? familias.find((f) => f.id === bebe.familiaId) : undefined
    if (!bebe || !familia) return falhaPg('P0002', 'bebe inexistente')
    const achado = alcance(familia.id, contaId, 'bebe inexistente', true)
    if (!achado.ok) return achado
    return ok({ bebe, familia })
  }

  function atualizarBebe(bebeId: string, nome: string, nascimento: string): Resultado<Bebe> {
    const pre = preludio(bebeId)
    if (!pre.ok) return pre
    const achado = alcanceDoBebe(bebeId, pre.valor.conta.id)
    if (!achado.ok) return achado
    if (nascimento > dataNoFuso(agora(), achado.valor.familia.fuso)) return falhaPg('23514', 'nascimento no futuro')
    achado.valor.bebe.nome = nome
    achado.valor.bebe.nascimento = nascimento
    return ok(paraBebe(achado.valor.bebe))
  }

  function arquivarBebe(bebeId: string, arquivado: boolean): Resultado<Bebe> {
    const pre = preludio(bebeId)
    if (!pre.ok) return pre
    const achado = alcanceDoBebe(bebeId, pre.valor.conta.id)
    if (!achado.ok) return achado
    achado.valor.bebe.estado = arquivado ? 'arquivado' : 'ativo'
    return ok(paraBebe(achado.valor.bebe))
  }

  function criarConvite(familiaId: string, papel: Papel, validoAte: string | null): Resultado<ConviteCriado> {
    const pre = preludio(familiaId, papel)
    if (!pre.ok) return pre
    const achado = alcance(familiaId, pre.valor.conta.id, 'familia inexistente', true)
    if (!achado.ok) return achado
    if (papel === 'responsavel' && validoAte !== null) return falhaPg('P0001', 'responsavel sem validade')
    if (validoAte !== null && em(validoAte) <= agora() + SETE_DIAS) {
      return falhaPg('P0001', 'validade menor que o convite')
    }
    const convite: ConviteMem = {
      id: novoId(),
      familiaId,
      papel,
      validoAte,
      criadoPor: pre.valor.conta.id,
      codigo: hexadecimal(64),
      expiraEm: iso(agora() + SETE_DIAS),
      estado: 'pendente',
      aceitoPor: null,
      aceitoEm: null,
      criadoEm: iso(agora()),
    }
    convites.push(convite)
    return ok({ id: convite.id, codigo: convite.codigo, expiraEm: convite.expiraEm })
  }

  function verConvite(codigo: string): Resultado<PreviaConvite> {
    const pre = preludio(codigo)
    if (!pre.ok) return pre
    const achado = conferirConvite(codigo)
    if (!achado.ok) return achado
    const convite = achado.valor
    const familia = familias.find((f) => f.id === convite.familiaId)
    const nomes = ordenarPor(
      bebes.filter((b) => b.familiaId === convite.familiaId && b.estado === 'ativo'),
      (b) => [b.criadoEm, b.id],
    ).map((b) => b.nome)
    return ok({
      familiaNome: familia?.nome ?? '',
      papel: convite.papel,
      validoAte: convite.validoAte,
      expiraEm: convite.expiraEm,
      bebes: nomes,
    })
  }

  function aceitarConvite(codigo: string): Resultado<string> {
    const pre = preludio(codigo)
    if (!pre.ok) return pre
    const achado = conferirConvite(codigo)
    if (!achado.ok) return achado
    const convite = achado.valor
    const contaId = pre.valor.conta.id

    if (vinculoAtivoDe(convite.familiaId, contaId)) return falhaPg('P0001', 'ja e membro')

    const existente = vinculos.find((v) => v.familiaId === convite.familiaId && v.contaId === contaId)
    if (existente) {
      // Reingresso: a mesma linha volta a valer, a época sobe e a antiguidade recomeça (D6).
      existente.estado = 'ativo'
      existente.papel = convite.papel
      existente.validoAte = convite.validoAte
      existente.concedidoPor = convite.criadoPor
      existente.encerradoEm = null
      existente.criadoEm = iso(agora())
      existente.epoca += 1
    } else {
      vinculos.push({
        id: novoId(),
        familiaId: convite.familiaId,
        contaId,
        papel: convite.papel,
        estado: 'ativo',
        validoAte: convite.validoAte,
        criadoEm: iso(agora()),
        concedidoPor: convite.criadoPor,
        epoca: 1,
        encerradoEm: null,
      })
    }
    convite.estado = 'aceito'
    convite.aceitoPor = contaId
    convite.aceitoEm = iso(agora())
    return ok(convite.familiaId)
  }

  function revogarConvite(conviteId: string): Resultado<null> {
    const pre = preludio(conviteId)
    if (!pre.ok) return pre
    const convite = convites.find((c) => c.id === conviteId)
    if (!convite) return falhaPg('P0002', 'convite inexistente')
    const achado = alcance(convite.familiaId, pre.valor.conta.id, 'convite inexistente', true)
    if (!achado.ok) return achado
    if (convite.estado !== 'pendente') return falhaPg('P0001', 'convite nao pendente')
    convite.estado = 'revogado'
    return ok(null)
  }

  /** O vínculo alvo e a família dele, com a visibilidade e o papel de responsável conferidos. */
  function alcanceDoVinculo(vinculoId: string, contaId: string): Resultado<VinculoMem> {
    const alvo = vinculos.find((v) => v.id === vinculoId)
    if (!alvo) return falhaPg('P0002', 'vinculo inexistente')
    const achado = alcance(alvo.familiaId, contaId, 'vinculo inexistente', true)
    if (!achado.ok) return achado
    return ok(alvo)
  }

  function mudarPapel(vinculoId: string, papel: Papel): Resultado<null> {
    const pre = preludio(vinculoId, papel)
    if (!pre.ok) return pre
    const achado = alcanceDoVinculo(vinculoId, pre.valor.conta.id)
    if (!achado.ok) return achado
    const alvo = achado.valor
    if (!vale(alvo)) return falhaPg('P0001', 'vinculo inativo')
    if (alvo.papel === papel) return falhaPg('P0001', 'papel igual')
    if (alvo.papel === 'responsavel' && !responsaveisAtivos(alvo.familiaId).some((v) => v.id !== alvo.id)) {
      return falhaPg('P0001', 'ultimo responsavel')
    }
    const eraResponsavel = alvo.papel === 'responsavel'
    alvo.papel = papel
    alvo.epoca += 1
    alvo.concedidoPor = pre.valor.conta.id
    if (papel === 'responsavel') alvo.validoAte = null
    // Quem deixa de ser responsável perde os convites pendentes que criou (D5).
    if (eraResponsavel) revogarConvitesDe(alvo.contaId, alvo.familiaId)
    return ok(null)
  }

  function revogarVinculo(vinculoId: string): Resultado<null> {
    const pre = preludio(vinculoId)
    if (!pre.ok) return pre
    const achado = alcanceDoVinculo(vinculoId, pre.valor.conta.id)
    if (!achado.ok) return achado
    const alvo = achado.valor
    if (alvo.contaId === pre.valor.conta.id) return falhaPg('P0001', 'use sair da familia')
    if (!vale(alvo)) return falhaPg('P0001', 'vinculo inativo')
    alvo.estado = 'revogado'
    alvo.encerradoEm = iso(agora())
    alvo.epoca += 1
    if (alvo.papel === 'responsavel') revogarConvitesDe(alvo.contaId, alvo.familiaId)
    return ok(null)
  }

  function sairDaFamilia(familiaId: string): Resultado<null> {
    const pre = preludio(familiaId)
    if (!pre.ok) return pre
    // Só exige vínculo ativo, de qualquer papel: nela só existe o P0002.
    const achado = alcance(familiaId, pre.valor.conta.id, 'familia inexistente', false)
    if (!achado.ok) return achado
    const meu = achado.valor.meu
    if (meu.papel === 'responsavel' && !responsaveisAtivos(familiaId).some((v) => v.id !== meu.id)) {
      return falhaPg('P0001', 'ultimo responsavel')
    }
    meu.estado = 'saiu'
    meu.encerradoEm = iso(agora())
    meu.epoca += 1
    revogarConvitesDe(meu.contaId, familiaId)
    return ok(null)
  }

  function removerFamilia(familiaId: string) {
    const indice = familias.findIndex((f) => f.id === familiaId)
    if (indice >= 0) familias.splice(indice, 1)
    for (const lista of [vinculos, bebes, convites] as Array<Array<{ familiaId: string }>>) {
      for (let i = lista.length - 1; i >= 0; i--) if (lista[i].familiaId === familiaId) lista.splice(i, 1)
    }
  }

  function excluirFamilia(familiaId: string): Resultado<null> {
    const pre = preludio(familiaId)
    if (!pre.ok) return pre
    const achado = alcance(familiaId, pre.valor.conta.id, 'familia inexistente', true)
    if (!achado.ok) return achado
    removerFamilia(familiaId)
    return ok(null)
  }

  function exportarDados(): Resultado<unknown> {
    const usuario = usuarioAtual()
    if (!usuario) return falhaAuth('sessao_encerrada')
    const conta = contas.find((c) => c.id === usuario.id)
    if (!conta) return falhaPg('P0001', 'conta inexistente')

    const meus = ordenarPor(
      vinculos.filter((v) => v.contaId === conta.id),
      (v) => [v.criadoEm, v.id],
    )
    const familiasDoResponsavel = ordenarPor(
      familias.filter((f) => vinculos.some((v) => v.familiaId === f.id && v.contaId === conta.id && v.papel === 'responsavel' && vale(v))),
      (f) => [f.criadaEm, f.id],
    )

    return ok({
      formato: 'appmaternidade-exportacao-v1',
      gerado_em: paraJson(iso(agora())),
      conta: {
        id: conta.id,
        email: usuario.email,
        nome_privado: conta.nome,
        fuso: conta.fuso,
        criada_em: paraJson(conta.criadaEm),
      },
      vinculos: meus.map((v) => ({
        familia_id: v.familiaId,
        papel: v.papel,
        estado: v.estado,
        valido_ate: paraJson(v.validoAte),
        epoca: v.epoca,
        criado_em: paraJson(v.criadoEm),
        encerrado_em: paraJson(v.encerradoEm),
      })),
      familias: familiasDoResponsavel.map((f) => ({
        id: f.id,
        nome: f.nome,
        fuso: f.fuso,
        criada_em: paraJson(f.criadaEm),
        membros: ordenarPor(
          vinculos.filter((v) => v.familiaId === f.id && vale(v)),
          (v) => [v.criadoEm, v.contaId],
        ).map((v) => ({
          conta_id: v.contaId,
          nome_privado: contas.find((c) => c.id === v.contaId)?.nome ?? null,
          papel: v.papel,
          valido_ate: paraJson(v.validoAte),
        })),
        bebes: ordenarPor(
          bebes.filter((b) => b.familiaId === f.id),
          (b) => [b.criadoEm, b.id],
        ).map((b) => ({
          id: b.id,
          nome: b.nome,
          nascimento: b.nascimento,
          estado: b.estado,
          criado_em: paraJson(b.criadoEm),
        })),
        convites: ordenarPor(
          convites.filter((c) => c.familiaId === f.id),
          (c) => [c.criadoEm, c.id],
        ).map((c) => ({
          id: c.id,
          papel: c.papel,
          estado: c.estado,
          vinculo_valido_ate: paraJson(c.validoAte),
          expira_em: paraJson(c.expiraEm),
          criado_em: paraJson(c.criadoEm),
          aceito_em: paraJson(c.aceitoEm),
        })),
      })),
    })
  }

  function excluirConta(): Resultado<null> {
    const usuario = usuarioAtual()
    if (!usuario) return falhaAuth('sessao_encerrada')
    const conta = contas.find((c) => c.id === usuario.id)
    if (!conta) return falhaPg('P0001', 'conta inexistente')
    const eu = conta.id

    // Caso 1 da D9, em todas as famílias antes de mudar qualquer coisa.
    const soloResponsavel = vinculos.some(
      (v) => v.contaId === eu && v.papel === 'responsavel' && vale(v) && !responsaveisAtivos(v.familiaId).some((o) => o.contaId !== eu),
    )
    if (soloResponsavel) return falhaPg('P0001', 'ultimo responsavel')

    // Casos 2 a 4: a titularidade das famílias criadas pela conta.
    for (const familia of ordenarPor(familias.filter((f) => f.criadaPor === eu), (f) => [f.id, ''])) {
      const outros = ordenarPor(
        vinculos.filter((v) => v.familiaId === familia.id && v.contaId !== eu && vale(v)),
        (v) => [v.criadoEm, v.contaId],
      )
      const novoResponsavel = outros.find((v) => v.papel === 'responsavel')
      if (novoResponsavel) {
        familia.criadaPor = novoResponsavel.contaId
      } else if (outros.length > 0) {
        familia.criadaPor = outros[0].contaId
        outros[0].papel = 'responsavel'
        outros[0].validoAte = null
        outros[0].epoca += 1
        outros[0].concedidoPor = null
      } else {
        removerFamilia(familia.id)
      }
    }

    // Caso 5: os convites pendentes da conta caem; o que ela deixou perde a autoria.
    revogarConvitesDe(eu, null)
    for (let i = vinculos.length - 1; i >= 0; i--) if (vinculos[i].contaId === eu) vinculos.splice(i, 1)
    for (const v of vinculos) if (v.concedidoPor === eu) v.concedidoPor = null
    for (const b of bebes) if (b.criadoPor === eu) b.criadoPor = null
    for (const c of convites) {
      if (c.criadoPor === eu) c.criadoPor = null
      if (c.aceitoPor === eu) c.aceitoPor = null
    }
    contas.splice(contas.indexOf(conta), 1)
    usuarios.splice(usuarios.indexOf(usuario), 1)
    sessao = null
    return ok(null)
  }

  // ---- envoltório: falhas simuladas e respostas perdidas -----------------------------------------

  function operacao<A extends unknown[], T>(nome: OperacaoConta, corpo: (...args: A) => Resultado<T>) {
    return async (...args: A): Promise<Resultado<T>> => {
      const simulada = controle.falhas.get(nome)?.shift()
      if (simulada) return { ok: false, erro: simulada }
      const resultado = corpo(...args)
      const perdidas = controle.perdidas.get(nome) ?? 0
      if (perdidas > 0) {
        controle.perdidas.set(nome, perdidas - 1)
        // A mudança já foi aplicada; só a resposta se perdeu.
        if (resultado.ok) return { ok: false, erro: erroDaChave('rede') }
      }
      return resultado
    }
  }

  const dados: DadosContaMemoria = {
    sessaoAtual: operacao('sessaoAtual', () => {
      const usuario = usuarioAtual()
      return ok(usuario ? paraUsuario(usuario) : null)
    }),
    aoMudarSessao(ouvinte) {
      ouvintes.add(ouvinte)
      return () => {
        ouvintes.delete(ouvinte)
      }
    },
    entrar: operacao('entrar', entrar),
    criarUsuario: operacao('criarUsuario', criarUsuario),
    pedirRecuperacao: operacao('pedirRecuperacao', pedirRecuperacao),
    trocarSenha: operacao('trocarSenha', trocarSenha),
    sair: operacao('sair', sair),
    minhaConta: operacao('minhaConta', minhaConta),
    criarMinhaConta: operacao('criarMinhaConta', criarMinhaConta),
    atualizarMinhaConta: operacao('atualizarMinhaConta', atualizarMinhaConta),
    minhasFamilias: operacao('minhasFamilias', minhasFamilias),
    detalheFamilia: operacao('detalheFamilia', detalheFamilia),
    criarFamilia: operacao('criarFamilia', criarFamilia),
    atualizarFamilia: operacao('atualizarFamilia', atualizarFamilia),
    cadastrarBebe: operacao('cadastrarBebe', cadastrarBebe),
    atualizarBebe: operacao('atualizarBebe', atualizarBebe),
    arquivarBebe: operacao('arquivarBebe', arquivarBebe),
    criarConvite: operacao('criarConvite', criarConvite),
    verConvite: operacao('verConvite', verConvite),
    aceitarConvite: operacao('aceitarConvite', aceitarConvite),
    revogarConvite: operacao('revogarConvite', revogarConvite),
    mudarPapel: operacao('mudarPapel', mudarPapel),
    revogarVinculo: operacao('revogarVinculo', revogarVinculo),
    sairDaFamilia: operacao('sairDaFamilia', sairDaFamilia),
    excluirFamilia: operacao('excluirFamilia', excluirFamilia),
    exportarDados: operacao('exportarDados', exportarDados),
    excluirConta: operacao('excluirConta', excluirConta),

    ultimoPedidoDeRecuperacao: (email) => recuperacoes.get(email.trim().toLowerCase()),
    abrirLinkDeRecuperacao(email) {
      const usuario = usuarios.find((u) => u.email === email.trim().toLowerCase())
      if (!usuario) return null
      sessao = usuario.id
      const publico = paraUsuario(usuario)
      emitir('entrou', publico)
      emitir('recuperacao', publico)
      return publico
    },
    encerrarSessaoPorFora() {
      if (!sessao) return
      sessao = null
      emitir('saiu', null)
    },
    sessaoParaTeste(email) {
      const usuario = email === null ? undefined : usuarios.find((u) => u.email === email)
      sessao = usuario ? usuario.id : null
    },
  }

  controles.set(dados, controle)
  return dados
}

function controleDe(dados: DadosConta): Controle {
  const controle = controles.get(dados)
  if (!controle) throw new Error('simularFalha e simularRespostaPerdida só valem para a memória')
  return controle
}

/** A próxima chamada da operação devolve o erro pedido, uma vez só, sem mudar nada. */
export function simularFalha(dados: DadosConta, operacao: OperacaoConta, erro: ChaveErro | ErroDados): void {
  const controle = controleDe(dados)
  const fila = controle.falhas.get(operacao) ?? []
  fila.push(typeof erro === 'string' ? erroDaChave(erro) : erro)
  controle.falhas.set(operacao, fila)
}

/** A próxima chamada aplica a mudança e devolve `rede`: a resposta se perdeu depois de gravar. */
export function simularRespostaPerdida(dados: DadosConta, operacao: OperacaoConta): void {
  const controle = controleDe(dados)
  controle.perdidas.set(operacao, (controle.perdidas.get(operacao) ?? 0) + 1)
}
