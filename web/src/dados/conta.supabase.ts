import type { SupabaseClient, User } from '@supabase/supabase-js'
import { ehRepetivel, type Papel, type Resultado } from './comum.ts'
import { classificarErroConta } from './conta.erros.ts'
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
  PreviaConvite,
  Usuario,
} from './conta.ts'

// A implementação do banco. Cada operação chama o Supabase e devolve `Resultado`: o que escapa
// (erro do Auth, do Postgres, da rede) passa por `classificarErroConta`. Nada lança para a tela.
// As colunas lidas são só as do grant de `20261105180200_rls_e_permissoes.sql`.

interface LinhaConta {
  id: string
  nome_privado: string
  fuso: string
  criada_em: string
}
interface LinhaFamilia {
  id: string
  nome: string
  fuso: string
  criada_em: string
}
interface LinhaVinculo {
  id: string
  conta_id: string
  papel: Papel
  estado: string
  valido_ate: string | null
}
interface LinhaVinculoComFamilia {
  id: string
  papel: Papel
  valido_ate: string | null
  familias: LinhaFamilia | LinhaFamilia[] | null
}
interface LinhaBebe {
  id: string
  familia_id: string
  nome: string
  nascimento: string
  estado: 'ativo' | 'arquivado'
}
interface LinhaConvite {
  id: string
  papel: Papel
  vinculo_valido_ate: string | null
  criado_por: string | null
  expira_em: string
}

const COLUNAS_CONTA = 'id, nome_privado, fuso, criada_em'
const COLUNAS_FAMILIA = 'id, nome, fuso, criada_em'
const COLUNAS_BEBE = 'id, familia_id, nome, nascimento, estado'

const SESSAO_AUSENTE = { name: 'AuthSessionMissingError', code: 'session_not_found', message: 'Auth session missing!' }

/** Uma resposta que não tem a forma prometida é `desconhecido`, nunca um valor `undefined` na tela. */
function inesperada(o: string): never {
  throw { code: 'unexpected_failure', message: `Resposta inesperada: ${o}.` }
}

const ehTexto = (valor: unknown): valor is string => typeof valor === 'string' && valor !== ''
const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

const iso = (texto: string) => new Date(texto).toISOString()
/** O `nascimento` (`AAAA-MM-DD`) tem de ser uma data que existe. */
function dataSimples(texto: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || new Date(texto).toISOString().slice(0, 10) !== texto) inesperada('nascimento')
  return texto
}
const isoOuNulo = (texto: string | null) => (texto === null ? null : iso(texto))
const vale = (validoAte: string | null) => validoAte === null || Date.parse(validoAte) > Date.now()

function paraUsuario(usuario: User): Usuario {
  const nome = usuario.user_metadata?.nome_privado
  return {
    id: usuario.id,
    email: usuario.email ?? '',
    nomeMetadados: typeof nome === 'string' ? nome : null,
  }
}

const paraConta = (linha: LinhaConta, email: string): Conta => ({
  id: linha.id,
  nome: linha.nome_privado,
  fuso: linha.fuso,
  email,
  criadaEm: iso(linha.criada_em),
})

const paraBebe = (linha: LinhaBebe): Bebe => ({
  id: linha.id,
  familiaId: linha.familia_id,
  nome: linha.nome,
  nascimento: dataSimples(linha.nascimento),
  estado: linha.estado,
})

function doEvento(evento: string): EventoSessao | null {
  switch (evento) {
    case 'SIGNED_IN':
      return 'entrou'
    case 'SIGNED_OUT':
      return 'saiu'
    case 'PASSWORD_RECOVERY':
      return 'recuperacao'
    case 'TOKEN_REFRESHED':
      return 'renovou'
    case 'USER_UPDATED':
      return 'usuario_atualizado'
    default:
      return null
  }
}

export function criarDadosContaSupabase(cliente: SupabaseClient): DadosConta {
  const auth = cliente.auth

  // O evento de recuperação sai durante a inicialização do cliente, que pode terminar antes de
  // a tela se inscrever. Esta inscrição fica ligada desde a criação e repete o evento a quem
  // chega depois, até a pessoa sair ou outra entrar.
  let ultimaRecuperacao: Usuario | null = null
  // A última troca de senha terminou com resultado incerto (a resposta pode ter se perdido depois de
  // o Auth gravar). Se a repetição responder `same_password`, a senha já é a nova: a recuperação
  // está concluída. Vale para a recuperação corrente: link novo, saída e outra pessoa a zeram.
  let trocaIncerta = false
  auth.onAuthStateChange((evento, sessao) => {
    if (evento === 'PASSWORD_RECOVERY' && sessao?.user) {
      ultimaRecuperacao = paraUsuario(sessao.user)
      trocaIncerta = false
    } else if (evento === 'SIGNED_OUT') {
      ultimaRecuperacao = null
      trocaIncerta = false
    } else if (evento === 'SIGNED_IN' && ultimaRecuperacao && sessao?.user && sessao.user.id !== ultimaRecuperacao.id) {
      ultimaRecuperacao = null
      trocaIncerta = false
    }
  })

  async function executar<T>(corpo: () => Promise<T>): Promise<Resultado<T>> {
    try {
      return { ok: true, valor: await corpo() }
    } catch (erro) {
      return { ok: false, erro: classificarErroConta(erro) }
    }
  }

  async function meuUsuario(): Promise<Usuario> {
    const { data, error } = await auth.getSession()
    if (error) throw error
    if (!data.session) throw SESSAO_AUSENTE
    return paraUsuario(data.session.user)
  }

  async function chamar(nome: string, argumentos?: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await cliente.rpc(nome, argumentos)
    if (error) throw error
    return data
  }

  /** A `rpc` que devolve só o id (`criar_familia`, `aceitar_convite`). */
  function idDaResposta(bruto: unknown): string {
    if (!ehTexto(bruto)) inesperada('id')
    return bruto
  }

  async function buscarConta(id: string, email: string): Promise<Conta | null> {
    const { data, error } = await cliente.from('contas').select(COLUNAS_CONTA).eq('id', id).maybeSingle()
    if (error) throw error
    return data ? paraConta(data as LinhaConta, email) : null
  }

  async function familiasDaPessoa(id: string): Promise<FamiliaResumo[]> {
    const { data, error } = await cliente
      .from('vinculos')
      .select(`id, papel, valido_ate, familias(${COLUNAS_FAMILIA})`)
      .eq('conta_id', id)
      .eq('estado', 'ativo')
    if (error) throw error
    const lista: FamiliaResumo[] = []
    for (const linha of (data ?? []) as unknown as LinhaVinculoComFamilia[]) {
      const familia = Array.isArray(linha.familias) ? linha.familias[0] : linha.familias
      if (!familia || !vale(linha.valido_ate)) continue
      lista.push({
        id: familia.id,
        nome: familia.nome,
        fuso: familia.fuso,
        criadaEm: iso(familia.criada_em),
        meuPapel: linha.papel,
        meuVinculoId: linha.id,
        meuAcessoAte: isoOuNulo(linha.valido_ate),
      })
    }
    return lista.sort((a, b) => (a.criadaEm < b.criadaEm ? -1 : a.criadaEm > b.criadaEm ? 1 : a.id < b.id ? -1 : 1))
  }

  async function nomesDasContas(ids: string[]): Promise<Map<string, string>> {
    const { data, error } = await cliente.from('contas').select('id, nome_privado').in('id', ids)
    if (error) throw error
    return new Map(((data ?? []) as Array<{ id: string; nome_privado: string }>).map((c) => [c.id, c.nome_privado]))
  }

  const paraMembro = (v: LinhaVinculo, nomes: Map<string, string>, pessoa: string): Membro => ({
    vinculoId: v.id,
    contaId: v.conta_id,
    nome: nomes.get(v.conta_id) ?? '',
    papel: v.papel,
    validoAte: isoOuNulo(v.valido_ate),
    souEu: v.conta_id === pessoa,
  })

  /**
   * O detalhe só com os membros (`escopo: 'membros'`): uma consulta de `vinculos` que traz, junto, a
   * família (o resumo vem do vínculo da própria pessoa), e uma de `contas` para os nomes. Não lê
   * `bebes` nem `convites`, nem relê os vínculos da pessoa.
   */
  async function detalheDosMembros(familiaId: string, pessoa: string): Promise<DetalheFamilia> {
    const { data, error } = await cliente
      .from('vinculos')
      .select(`id, conta_id, papel, estado, valido_ate, criado_em, familias(${COLUNAS_FAMILIA})`)
      .eq('familia_id', familiaId)
      .eq('estado', 'ativo')
      .order('criado_em')
      .order('conta_id')
    if (error) throw error
    const brutos = ((data ?? []) as unknown as Array<LinhaVinculo & { familias?: LinhaFamilia | LinhaFamilia[] | null }>).filter((v) =>
      vale(v.valido_ate),
    )
    const meu = brutos.find((v) => v.conta_id === pessoa)
    const embutida = meu?.familias
    const familia = Array.isArray(embutida) ? embutida[0] : embutida
    if (!meu || !familia) throw { code: 'P0002', message: 'familia inexistente' }

    const nomes = await nomesDasContas([...new Set(brutos.map((v) => v.conta_id))])
    const resumo: FamiliaResumo = {
      id: familia.id,
      nome: familia.nome,
      fuso: familia.fuso,
      criadaEm: iso(familia.criada_em),
      meuPapel: meu.papel,
      meuVinculoId: meu.id,
      meuAcessoAte: isoOuNulo(meu.valido_ate),
    }
    return { familia: resumo, bebes: [], membros: brutos.map((v) => paraMembro(v, nomes, pessoa)), convites: null }
  }

  /** Depois de uma escrita direta barrada: a família existe para a pessoa (42501) ou não (P0002)? */
  async function recusaDaFamilia(familiaId: string): Promise<never> {
    const { data, error } = await cliente.from('familias').select('id').eq('id', familiaId).maybeSingle()
    if (error) throw error
    if (!data) throw { code: 'P0002', message: 'familia inexistente' }
    throw { code: '42501', message: 'sem permissao' }
  }

  async function recusaDoBebe(bebeId: string): Promise<never> {
    const { data, error } = await cliente.from('bebes').select('id').eq('id', bebeId).maybeSingle()
    if (error) throw error
    if (!data) throw { code: 'P0002', message: 'bebe inexistente' }
    throw { code: '42501', message: 'sem permissao' }
  }

  async function resumoDaFamilia(familiaId: string, pessoa: string): Promise<FamiliaResumo> {
    const achada = (await familiasDaPessoa(pessoa)).find((f) => f.id === familiaId)
    if (!achada) throw { code: 'P0002', message: 'familia inexistente' }
    return achada
  }

  async function atualizarBebeNoBanco(bebeId: string, campos: Record<string, unknown>): Promise<Bebe> {
    const { data, error } = await cliente.from('bebes').update(campos).eq('id', bebeId).select(COLUNAS_BEBE)
    if (error) throw error
    const linhas = (data ?? []) as LinhaBebe[]
    if (linhas.length === 0) return recusaDoBebe(bebeId)

    return paraBebe(linhas[0])
  }

  return {
    sessaoAtual: () =>
      executar(async () => {
        const { data, error } = await auth.getSession()
        if (error) throw error
        return data.session ? paraUsuario(data.session.user) : null
      }),

    aoMudarSessao(ouvinte) {
      let cancelado = false
      const entregar = (evento: EventoSessao, usuario: Usuario | null) => {
        // Fora da chamada do cliente: o ouvinte pode usar o Auth sem travar.
        setTimeout(() => {
          if (!cancelado) ouvinte(evento, usuario)
        }, 0)
      }
      const { data } = auth.onAuthStateChange((evento, sessao) => {
        const traduzido = doEvento(evento)
        if (traduzido) entregar(traduzido, sessao?.user ? paraUsuario(sessao.user) : null)
      })
      if (ultimaRecuperacao) entregar('recuperacao', ultimaRecuperacao)
      return () => {
        cancelado = true
        data.subscription.unsubscribe()
      }
    },

    entrar: (email, senha) =>
      executar(async () => {
        const { data, error } = await auth.signInWithPassword({ email, password: senha })
        if (error) throw error
        if (!data?.user) inesperada('entrar sem usuário')
        return paraUsuario(data.user)
      }),

    criarUsuario: (email, senha, nome, voltarPara) =>
      executar(async () => {
        const { data, error } = await auth.signUp({
          email,
          password: senha,
          options: { data: { nome_privado: nome }, emailRedirectTo: voltarPara },
        })
        if (error) throw error
        if (!data.user) throw { code: 'unexpected_failure', message: 'O cadastro não devolveu o usuário.' }
        return { usuario: paraUsuario(data.user), comSessao: data.session !== null }
      }),

    pedirRecuperacao: (email, voltarPara) =>
      executar(async () => {
        const { error } = await auth.resetPasswordForEmail(email, { redirectTo: voltarPara })
        if (error) throw error
        return null
      }),

    trocarSenha: async (nova) => {
      const resultado = await executar(async () => {
        const { error } = await auth.updateUser({ password: nova })
        if (error) throw error
        return null
      })
      // A recuperação concluída não vale mais para quem se inscrever depois (o replay). Uma troca
      // recusada não conclui nada, e o resultado devolvido é sempre o da chamada.
      if (resultado.ok) {
        ultimaRecuperacao = null
        trocaIncerta = false
      } else if (ehRepetivel(resultado.erro.classe)) {
        trocaIncerta = true
      } else if (resultado.erro.chave === 'senha_igual' && trocaIncerta) {
        // Depois de uma resposta perdida, `same_password` prova que a troca anterior gravou.
        ultimaRecuperacao = null
        trocaIncerta = false
      }
      return resultado
    },

    sair: () =>
      executar(async () => {
        const { error } = await auth.signOut({ scope: 'local' })
        if (error) {
          // Se a sessão já não existe, a saída está feita.
          const { data } = await auth.getSession()
          if (data.session) throw error
        }
        return null
      }),

    minhaConta: () =>
      executar(async () => {
        const usuario = await meuUsuario()
        return buscarConta(usuario.id, usuario.email)
      }),

    criarMinhaConta: (nome, fuso) =>
      executar(async () => {
        const usuario = await meuUsuario()
        const { data, error } = await cliente
          .from('contas')
          .insert({ id: usuario.id, nome_privado: nome, fuso })
          .select(COLUNAS_CONTA)
          .single()
        if (error) throw error
        if (!ehObjeto(data)) inesperada('conta criada sem linha')
        return paraConta(data as unknown as LinhaConta, usuario.email)
      }),

    atualizarMinhaConta: (nome, fuso) =>
      executar(async () => {
        const usuario = await meuUsuario()
        const { data, error } = await cliente
          .from('contas')
          .update({ nome_privado: nome, fuso })
          .eq('id', usuario.id)
          .select(COLUNAS_CONTA)
        if (error) throw error
        const linhas = (data ?? []) as LinhaConta[]
        // Zero linhas no update da própria conta: a sessão já não vale.
        if (linhas.length === 0) throw SESSAO_AUSENTE
        return paraConta(linhas[0], usuario.email)
      }),

    minhasFamilias: () =>
      executar(async () => {
        const usuario = await meuUsuario()
        return familiasDaPessoa(usuario.id)
      }),

    detalheFamilia: (familiaId, escopo = 'completo') =>
      executar(async (): Promise<DetalheFamilia> => {
        const usuario = await meuUsuario()
        if (escopo === 'membros') return detalheDosMembros(familiaId, usuario.id)
        const resumo = (await familiasDaPessoa(usuario.id)).find((f) => f.id === familiaId)
        if (!resumo) throw { code: 'P0002', message: 'familia inexistente' }

        const [vinculosR, bebesR, convitesR] = await Promise.all([
          cliente
            .from('vinculos')
            .select('id, conta_id, papel, estado, valido_ate, criado_em')
            .eq('familia_id', familiaId)
            .eq('estado', 'ativo')
            .order('criado_em')
            .order('conta_id'),
          cliente
            .from('bebes')
            .select(`${COLUNAS_BEBE}, criado_em`)
            .eq('familia_id', familiaId)
            .order('criado_em')
            .order('id'),
          resumo.meuPapel === 'responsavel'
            ? cliente
                .from('convites')
                .select('id, papel, vinculo_valido_ate, criado_por, expira_em, estado, criado_em')
                .eq('familia_id', familiaId)
                .eq('estado', 'pendente')
                .order('criado_em')
                .order('id')
            : Promise.resolve({ data: null, error: null }),
        ])
        if (vinculosR.error) throw vinculosR.error
        if (bebesR.error) throw bebesR.error
        if (convitesR.error) throw convitesR.error

        const membrosBrutos = ((vinculosR.data ?? []) as LinhaVinculo[]).filter((v) => vale(v.valido_ate))
        const convitesBrutos = (convitesR.data ?? null) as LinhaConvite[] | null
        const nomes = await nomesDasContas([
          ...new Set([...membrosBrutos.map((v) => v.conta_id), ...(convitesBrutos ?? []).flatMap((c) => (c.criado_por ? [c.criado_por] : []))]),
        ])

        const membros = membrosBrutos.map((v) => paraMembro(v, nomes, usuario.id))
        const convites: ConviteResumo[] | null = convitesBrutos
          ? convitesBrutos.map((c) => ({
              id: c.id,
              papel: c.papel,
              validoAte: isoOuNulo(c.vinculo_valido_ate),
              expiraEm: iso(c.expira_em),
              criadoPorNome: c.criado_por ? (nomes.get(c.criado_por) ?? null) : null,
              vencido: Date.parse(c.expira_em) <= Date.now() || (c.vinculo_valido_ate !== null && Date.parse(c.vinculo_valido_ate) <= Date.now()),
            }))
          : null
        return { familia: resumo, bebes: ((bebesR.data ?? []) as LinhaBebe[]).map(paraBebe), membros, convites }
      }),

    criarFamilia: (nome, fuso) => executar(async () => idDaResposta(await chamar('criar_familia', { nome, fuso }))),

    atualizarFamilia: (familiaId, nome, fuso) =>
      executar(async () => {
        const usuario = await meuUsuario()
        const { data, error } = await cliente.from('familias').update({ nome, fuso }).eq('id', familiaId).select('id')
        if (error) throw error
        if ((data ?? []).length === 0) return recusaDaFamilia(familiaId)
        return resumoDaFamilia(familiaId, usuario.id)
      }),

    cadastrarBebe: (familiaId, nome, nascimento) =>
      executar(async () => {
        const usuario = await meuUsuario()
        const { data, error } = await cliente
          .from('bebes')
          .insert({ familia_id: familiaId, nome, nascimento, criado_por: usuario.id })
          .select(COLUNAS_BEBE)
          .single()
        if (error) {
          if (error.code === '42501') return recusaDaFamilia(familiaId)
          throw error
        }
        if (!ehObjeto(data)) inesperada('bebê criado sem linha')
        return paraBebe(data as unknown as LinhaBebe)
      }),

    atualizarBebe: (bebeId, nome, nascimento) =>
      executar(() => atualizarBebeNoBanco(bebeId, { nome, nascimento })),

    arquivarBebe: (bebeId, arquivado) =>
      executar(() => atualizarBebeNoBanco(bebeId, { estado: arquivado ? 'arquivado' : 'ativo' })),

    criarConvite: (familiaId, papel, validoAte) =>
      executar(async (): Promise<ConviteCriado> => {
        const bruto = await chamar('criar_convite', { familia: familiaId, papel, vinculo_valido_ate: validoAte })
        if (!ehObjeto(bruto) || !ehTexto(bruto.id) || !ehTexto(bruto.codigo) || !ehTexto(bruto.expira_em)) {
          inesperada('criar_convite')
        }

        return { id: bruto.id, codigo: bruto.codigo, expiraEm: iso(bruto.expira_em) }
      }),

    verConvite: (codigo) =>
      executar(async (): Promise<PreviaConvite> => {
        const bruto = await chamar('ver_convite', { codigo })
        if (
          !ehObjeto(bruto) ||
          typeof bruto.familia_nome !== 'string' ||
          !ehTexto(bruto.papel) ||
          !ehTexto(bruto.expira_em) ||
          !Array.isArray(bruto.bebes)
        ) {
          inesperada('ver_convite')
        }
        return {
          familiaNome: bruto.familia_nome,
          papel: bruto.papel as Papel,
          validoAte: isoOuNulo((bruto.vinculo_valido_ate as string | null | undefined) ?? null),
          expiraEm: iso(bruto.expira_em),
          bebes: bruto.bebes as string[],
        }
      }),

    aceitarConvite: (codigo) => executar(async () => idDaResposta(await chamar('aceitar_convite', { codigo }))),

    revogarConvite: (conviteId) =>
      executar(async () => {
        await chamar('revogar_convite', { convite: conviteId })
        return null
      }),

    mudarPapel: (vinculoId, papel) =>
      executar(async () => {
        await chamar('mudar_papel', { vinculo: vinculoId, novo_papel: papel })
        return null
      }),

    revogarVinculo: (vinculoId) =>
      executar(async () => {
        await chamar('revogar_vinculo', { vinculo: vinculoId })
        return null
      }),

    sairDaFamilia: (familiaId) =>
      executar(async () => {
        await chamar('sair_da_familia', { familia: familiaId })
        return null
      }),

    excluirFamilia: (familiaId) =>
      executar(async () => {
        await chamar('excluir_familia', { familia: familiaId })
        return null
      }),

    exportarDados: () =>
      executar(async () => {
        const exportacao = await chamar('exportar_dados')
        if (!ehObjeto(exportacao)) inesperada('exportar_dados')
        return exportacao
      }),

    excluirConta: () =>
      executar(async () => {
        await chamar('excluir_conta')
        return null
      }),
  }
}
