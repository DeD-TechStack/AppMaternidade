import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from './comum.ts'
import { OPERACOES_CONTA, type DadosConta, type OperacaoConta } from './conta.ts'
import { criarDadosContaSupabase } from './conta.supabase.ts'
import { criarClienteFalso, USUARIO_FALSO, type RespostaFalsa } from '../teste/renderizarComDados.tsx'

// As bordas do adaptador do banco, com um cliente feito à mão (sem rede e sem `createClient`):
// sessão ausente ou vencida, hora, resposta com erro ou vazia, exceção do cliente. Nada lança para
// a tela: tudo volta como `Resultado`.

const AGORA = Date.parse('2026-11-06T12:00:00.000Z')
const FAMILIA = 'f1111111-1111-4111-8111-111111111111'
const BEBE = 'e1111111-1111-4111-8111-111111111111'
const ALVO = 'c1111111-1111-4111-8111-111111111111'
const FUSO = 'America/Sao_Paulo'

afterEach(() => {
  vi.useRealTimers()
})

const montar = (opcoes?: Parameters<typeof criarClienteFalso>[0]) => {
  const falso = criarClienteFalso(opcoes)
  return { ...falso, dados: criarDadosContaSupabase(falso.cliente) }
}

const resposta = (data: unknown, error: unknown = null): RespostaFalsa => ({ data, error })
const erroDoBanco = (code: string, message: string) => resposta(null, { code, message })
const falhaDeRede = (): never => {
  throw new TypeError('Failed to fetch')
}

function falha<T>(resultado: Resultado<T>) {
  if (resultado.ok) throw new Error('era para falhar')
  return resultado.erro
}
function valor<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(`era para dar certo: ${resultado.erro.chave}`)
  return resultado.valor
}

const ERRO_DE_SESSAO = (code: string) => ({ name: 'AuthApiError', code, status: 403, message: 'sessao do teste' })

/** Toda operação da interface, com argumentos válidos. O compilador confere que a tabela é completa. */
const CHAMADAS: Record<OperacaoConta, (dados: DadosConta) => Promise<Resultado<unknown>>> = {
  sessaoAtual: (d) => d.sessaoAtual(),
  entrar: (d) => d.entrar('juliana@exemplo.invalid', 'senha-longa'),
  criarUsuario: (d) => d.criarUsuario('nova@exemplo.invalid', 'senha-longa', 'Nova', 'http://localhost/entrar'),
  pedirRecuperacao: (d) => d.pedirRecuperacao('juliana@exemplo.invalid', 'http://localhost/redefinir-senha'),
  trocarSenha: (d) => d.trocarSenha('senha-nova'),
  sair: (d) => d.sair(),
  minhaConta: (d) => d.minhaConta(),
  criarMinhaConta: (d) => d.criarMinhaConta('Juliana', FUSO),
  atualizarMinhaConta: (d) => d.atualizarMinhaConta('Juliana', FUSO),
  minhasFamilias: (d) => d.minhasFamilias(),
  detalheFamilia: (d) => d.detalheFamilia(FAMILIA),
  criarFamilia: (d) => d.criarFamilia('Casa da Heloísa', FUSO),
  atualizarFamilia: (d) => d.atualizarFamilia(FAMILIA, 'Casa', FUSO),
  cadastrarBebe: (d) => d.cadastrarBebe(FAMILIA, 'Heloísa', '2026-08-05'),
  atualizarBebe: (d) => d.atualizarBebe(BEBE, 'Heloísa', '2026-08-05'),
  arquivarBebe: (d) => d.arquivarBebe(BEBE, true),
  criarConvite: (d) => d.criarConvite(FAMILIA, 'cuidador', null),
  verConvite: (d) => d.verConvite('CODIGO'),
  aceitarConvite: (d) => d.aceitarConvite('CODIGO'),
  revogarConvite: (d) => d.revogarConvite(ALVO),
  mudarPapel: (d) => d.mudarPapel(ALVO, 'cuidador'),
  revogarVinculo: (d) => d.revogarVinculo(ALVO),
  sairDaFamilia: (d) => d.sairDaFamilia(FAMILIA),
  excluirFamilia: (d) => d.excluirFamilia(FAMILIA),
  exportarDados: (d) => d.exportarDados(),
  excluirConta: (d) => d.excluirConta(),
}

const TABELAS = ['contas', 'vinculos', 'familias', 'bebes', 'convites']
// As operações que chamam uma função do banco (`rpc`) e o nome da função de cada uma.
const POR_RPC: Array<[OperacaoConta, string]> = [
  ['criarFamilia', 'criar_familia'],
  ['criarConvite', 'criar_convite'],
  ['verConvite', 'ver_convite'],
  ['aceitarConvite', 'aceitar_convite'],
  ['revogarConvite', 'revogar_convite'],
  ['mudarPapel', 'mudar_papel'],
  ['revogarVinculo', 'revogar_vinculo'],
  ['sairDaFamilia', 'sair_da_familia'],
  ['excluirFamilia', 'excluir_familia'],
  ['exportarDados', 'exportar_dados'],
  ['excluirConta', 'excluir_conta'],
]
const OPERACOES_DA_PESSOA: OperacaoConta[] = [
  'minhaConta',
  'criarMinhaConta',
  'atualizarMinhaConta',
  'minhasFamilias',
  'detalheFamilia',
  'atualizarFamilia',
  'cadastrarBebe',
]

const LINHA_FAMILIA = { id: FAMILIA, nome: 'Casa da Heloísa', fuso: FUSO, criada_em: '2026-10-01T10:00:00+00:00' }
const vinculoComFamilia = (id: string, validoAte: string | null, familia: unknown = LINHA_FAMILIA, papel = 'responsavel') => ({
  id,
  papel,
  valido_ate: validoAte,
  familias: familia,
})
const LINHA_CONTA = { id: USUARIO_FALSO.id, nome_privado: 'Juliana', fuso: FUSO, criada_em: '2026-10-01T10:00:00+00:00' }
const LINHA_BEBE = { id: BEBE, familia_id: FAMILIA, nome: 'Heloísa', nascimento: '2026-08-05', estado: 'ativo' }

describe('toda operação da interface tem um caso aqui', () => {
  it('a tabela de chamadas cobre exatamente as operações do adaptador', () => {
    expect(Object.keys(CHAMADAS).sort()).toEqual([...OPERACOES_CONTA].sort())
  })
})

describe('1. sessão ausente ou vencida', () => {
  it('sem sessão (getSession com session: null e sem erro), sessaoAtual dá ok com null', async () => {
    const { dados } = montar({ usuario: null })
    expect(valor(await dados.sessaoAtual())).toBeNull()
  })

  it('com sessão, sessaoAtual devolve a pessoa, com o nome dos metadados', async () => {
    const { dados } = montar()
    expect(valor(await dados.sessaoAtual())).toEqual({
      id: USUARIO_FALSO.id,
      email: 'juliana@exemplo.invalid',
      nomeMetadados: 'Juliana',
    })
  })

  for (const codigo of ['session_not_found', 'refresh_token_not_found', 'session_expired']) {
    it(`getSession com o erro ${codigo}: sessaoAtual e toda operação da pessoa dão sessao_encerrada, sem tocar no banco`, async () => {
      const { dados, auth, from, rpc } = montar()
      auth.getSession.mockResolvedValue({ data: { session: null }, error: ERRO_DE_SESSAO(codigo) })

      for (const nome of ['sessaoAtual', ...OPERACOES_DA_PESSOA] as OperacaoConta[]) {
        const erro = falha(await CHAMADAS[nome](dados))
        expect(erro.classe, nome).toBe('sessao_encerrada')
        expect(erro.chave, nome).toBe('sessao_encerrada')
      }
      expect(from).not.toHaveBeenCalled()
      expect(rpc).not.toHaveBeenCalled()
    })
  }

  it('sem sessão e sem erro, toda operação que precisa da pessoa dá sessao_encerrada e nada lança', async () => {
    const { dados, from } = montar({ usuario: null })

    for (const nome of OPERACOES_DA_PESSOA) {
      const erro = falha(await CHAMADAS[nome](dados))
      expect(erro.classe, nome).toBe('sessao_encerrada')
    }
    expect(from).not.toHaveBeenCalled()
  })

  it('getSession que lança (a rede caiu) dá rede, não sessao_encerrada', async () => {
    const { dados, auth } = montar()
    auth.getSession.mockRejectedValue(new TypeError('Failed to fetch'))

    expect(falha(await dados.sessaoAtual()).classe).toBe('rede')
    expect(falha(await dados.minhaConta()).classe).toBe('rede')
  })

  it('updateUser com a sessão vencida: trocarSenha dá sessao_encerrada', async () => {
    for (const erro of [ERRO_DE_SESSAO('session_expired'), { name: 'AuthSessionMissingError', message: 'Auth session missing!', status: 400 }]) {
      const { dados, auth } = montar()
      auth.updateUser.mockResolvedValue({ data: { user: null }, error: erro })
      expect(falha(await dados.trocarSenha('senha-nova')).classe).toBe('sessao_encerrada')
    }
  })

  it('signInWithPassword com a sessão vencida: entrar dá sessao_encerrada; credenciais erradas dão credenciais', async () => {
    const { dados, auth } = montar()
    auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: ERRO_DE_SESSAO('session_expired') })
    expect(falha(await dados.entrar('a@exemplo.invalid', 'senha')).classe).toBe('sessao_encerrada')

    auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' },
    })
    expect(falha(await dados.entrar('a@exemplo.invalid', 'senha')).chave).toBe('credenciais')
  })

  it('o JWT vencido numa chamada do banco (PGRST301, bad_jwt ou 401) dá sessao_encerrada', async () => {
    for (const erro of [{ code: 'PGRST301', message: 'JWT expired' }, { code: 'bad_jwt', message: 'x' }, { status: 401, message: 'Unauthorized' }]) {
      const { dados } = montar({ rpc: { excluir_conta: resposta(null, erro) }, tabelas: { contas: [resposta(null, erro)] } })
      expect(falha(await dados.excluirConta()).classe).toBe('sessao_encerrada')
      expect(falha(await dados.minhaConta()).classe).toBe('sessao_encerrada')
    }
  })

  it('o signOut com erro vale como saída feita se a sessão já não existe, e falha se ela continua', async () => {
    const { dados, auth } = montar({ usuario: null })
    auth.signOut.mockResolvedValue({ error: ERRO_DE_SESSAO('session_not_found') })
    expect(valor(await dados.sair())).toBeNull()

    const comSessao = montar()
    comSessao.auth.signOut.mockResolvedValue({ error: { name: 'AuthApiError', code: 'unexpected_failure', message: 'x' } })
    expect(falha(await comSessao.dados.sair()).classe).toBe('desconhecido')
  })

  it('criarUsuario sem o usuário na resposta é desconhecido, e comSessao diz se já há sessão', async () => {
    const semUsuario = montar()
    semUsuario.auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: null })
    expect(falha(await CHAMADAS.criarUsuario(semUsuario.dados)).classe).toBe('desconhecido')

    const { dados, auth } = montar()
    expect(valor(await dados.criarUsuario('a@exemplo.invalid', 'senha-longa', 'Nova', 'http://localhost/entrar'))).toMatchObject({ comSessao: false })
    auth.signUp.mockResolvedValue({ data: { user: USUARIO_FALSO, session: {} }, error: null })
    expect(valor(await dados.criarUsuario('a@exemplo.invalid', 'senha-longa', 'Nova', 'http://localhost/entrar'))).toMatchObject({ comSessao: true })
  })

  it('entrar sem o usuário na resposta é desconhecido, nunca uma exceção solta', async () => {
    const { dados, auth } = montar()
    auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null })
    expect(falha(await dados.entrar('a@exemplo.invalid', 'senha')).classe).toBe('desconhecido')
  })
})

describe('R1: o evento de recuperação de senha e o replay a quem se inscreve depois', () => {
  const sessaoDe = (usuario: Record<string, unknown>) => ({ user: usuario })
  const OUTRA_PESSOA = { ...USUARIO_FALSO, id: 'outra-pessoa', email: 'outra@exemplo.invalid' }
  // O adaptador entrega os eventos fora da chamada do cliente (`setTimeout(0)`).
  const tique = () => new Promise<void>((resolver) => setTimeout(resolver, 0))

  async function inscrever(dados: DadosConta) {
    const eventos: string[] = []
    const cancelar = dados.aoMudarSessao((evento) => eventos.push(evento))
    await tique()
    return { eventos, cancelar }
  }

  it('o evento que chega depois da inscrição é entregue', async () => {
    const { dados, emitirAuth } = montar()
    const { eventos } = await inscrever(dados)

    emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    await tique()

    expect(eventos).toEqual(['recuperacao'])
  })

  it('o evento que chega antes da primeira inscrição é entregue a quem se inscreve depois, a cada inscrição', async () => {
    const { dados, emitirAuth } = montar()
    emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))

    for (let vez = 0; vez < 3; vez += 1) {
      const { eventos, cancelar } = await inscrever(dados)
      expect(eventos, `inscrição ${vez + 1}`).toEqual(['recuperacao'])
      cancelar()
    }
  })

  it('depois de a troca da senha dar certo, uma nova inscrição não recebe recuperacao', async () => {
    const { dados, emitirAuth } = montar()
    emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    const primeira = await inscrever(dados)
    expect(primeira.eventos).toEqual(['recuperacao'])

    expect(valor(await dados.trocarSenha('senha-nova'))).toBeNull()
    primeira.cancelar()

    for (let vez = 0; vez < 3; vez += 1) {
      const { eventos, cancelar } = await inscrever(dados)
      expect(eventos, `inscrição ${vez + 1}`).toEqual([])
      cancelar()
    }
  })

  it('recuperação sem concluir (a aba recarregada): a nova inscrição recebe', async () => {
    const { dados, emitirAuth } = montar()
    emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    const primeira = await inscrever(dados)
    primeira.cancelar()

    expect((await inscrever(dados)).eventos).toEqual(['recuperacao'])
  })

  it('a troca recusada (senha_fraca, senha_igual, rede ou exceção) não consome o replay', async () => {
    const recusas: unknown[] = [
      { data: { user: null }, error: { name: 'AuthApiError', code: 'weak_password', status: 422, message: 'x' } },
      { data: { user: null }, error: { name: 'AuthApiError', code: 'same_password', status: 422, message: 'x' } },
      { data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0, message: 'x' } },
    ]
    for (const recusa of recusas) {
      const { dados, emitirAuth, auth } = montar()
      emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
      auth.updateUser.mockResolvedValueOnce(recusa)
      falha(await dados.trocarSenha('senha-nova'))

      expect((await inscrever(dados)).eventos).toEqual(['recuperacao'])
    }

    const { dados, emitirAuth, auth } = montar()
    emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    auth.updateUser.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(falha(await dados.trocarSenha('senha-nova')).classe).toBe('rede')
    expect((await inscrever(dados)).eventos).toEqual(['recuperacao'])
  })

  it('um novo link depois de concluir volta a valer', async () => {
    const { dados, emitirAuth } = montar()
    emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    await dados.trocarSenha('senha-nova')
    expect((await inscrever(dados)).eventos).toEqual([])

    emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    expect((await inscrever(dados)).eventos).toEqual(['recuperacao'])
  })

  it('SIGNED_OUT e outra pessoa entrando limpam o replay; a mesma pessoa entrando, não', async () => {
    const saiu = montar()
    saiu.emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    saiu.emitirAuth('SIGNED_OUT', null)
    expect((await inscrever(saiu.dados)).eventos).toEqual([])

    const outra = montar()
    outra.emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    outra.emitirAuth('SIGNED_IN', sessaoDe(OUTRA_PESSOA))
    expect((await inscrever(outra.dados)).eventos).toEqual([])

    const mesma = montar()
    mesma.emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    mesma.emitirAuth('SIGNED_IN', sessaoDe(USUARIO_FALSO))
    expect((await inscrever(mesma.dados)).eventos).toEqual(['recuperacao'])
  })

  it('sair (signOut) dá o mesmo resultado de SIGNED_OUT: o replay some', async () => {
    const { dados, emitirAuth, auth } = montar()
    emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    auth.signOut.mockImplementationOnce(async () => {
      emitirAuth('SIGNED_OUT', null)
      return { error: null }
    })
    expect(valor(await dados.sair())).toBeNull()

    expect((await inscrever(dados)).eventos).toEqual([])
  })
})

describe('R1 (repetição): recuperação concluída por senha_igual depois de uma resposta perdida', () => {
  const sessaoDe = (usuario: Record<string, unknown>) => ({ user: usuario })
  const OUTRA_PESSOA = { ...USUARIO_FALSO, id: 'outra-pessoa', email: 'outra@exemplo.invalid' }
  const tique = () => new Promise<void>((resolver) => setTimeout(resolver, 0))
  const erroDoAuth = (code: string) => ({ data: { user: null }, error: { name: 'AuthApiError', code, status: 422, message: code } })
  const MESMA_SENHA = erroDoAuth('same_password')
  const SENHA_FRACA = erroDoAuth('weak_password')
  const semRede = () => new TypeError('Failed to fetch')

  async function inscrever(dados: DadosConta) {
    const eventos: string[] = []
    const cancelar = dados.aoMudarSessao((evento) => eventos.push(evento))
    await tique()
    return { eventos, cancelar }
  }

  /** O adaptador com o link de recuperação já entregue pelo Auth. */
  function comRecuperacao() {
    const montado = montar()
    montado.emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    return montado
  }

  it('(e)(f) rede e depois same_password: conclui, consome o replay e devolve o mesmo erro de antes', async () => {
    const { dados, auth, emitirAuth } = comRecuperacao()
    auth.updateUser.mockRejectedValueOnce(semRede()).mockResolvedValueOnce(MESMA_SENHA)

    expect(falha(await dados.trocarSenha('senha-nova')).classe).toBe('rede')
    const igual = falha(await dados.trocarSenha('senha-nova'))
    expect([igual.chave, igual.codigo]).toEqual(['senha_igual', 'same_password'])

    for (let vez = 0; vez < 3; vez += 1) {
      const { eventos, cancelar } = await inscrever(dados)
      expect(eventos, `inscrição ${vez + 1}`).toEqual([])
      cancelar()
    }
    // Um novo link, depois, volta a ser entregue.
    emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    expect((await inscrever(dados)).eventos).toEqual(['recuperacao'])
  })

  it('(f) rede, outra rede e depois same_password: conclui e consome', async () => {
    const { dados, auth } = comRecuperacao()
    auth.updateUser
      .mockRejectedValueOnce(semRede())
      .mockRejectedValueOnce(semRede())
      .mockResolvedValueOnce(MESMA_SENHA)

    expect(falha(await dados.trocarSenha('senha-nova')).classe).toBe('rede')
    expect(falha(await dados.trocarSenha('senha-nova')).classe).toBe('rede')
    expect(falha(await dados.trocarSenha('senha-nova')).chave).toBe('senha_igual')

    expect((await inscrever(dados)).eventos).toEqual([])
  })

  it('(f) cada classe repetível (rede, tente_de_novo, desconhecido) deixa a troca incerta', async () => {
    const incertas: unknown[] = [
      { data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0, message: 'x' } },
      { data: { user: null }, error: { code: '40P01', message: 'deadlock detected' } },
      { data: { user: null }, error: { code: 'XX999', message: 'x' } },
    ]
    for (const incerta of incertas) {
      const { dados, auth } = comRecuperacao()
      auth.updateUser.mockResolvedValueOnce(incerta).mockResolvedValueOnce(MESMA_SENHA)

      falha(await dados.trocarSenha('senha-nova'))
      expect(falha(await dados.trocarSenha('senha-nova')).chave).toBe('senha_igual')

      expect((await inscrever(dados)).eventos, JSON.stringify(incerta)).toEqual([])
    }
  })

  it('(f) rede e depois sucesso: consome pelo caminho direto e devolve ok', async () => {
    const { dados, auth } = comRecuperacao()
    auth.updateUser.mockRejectedValueOnce(semRede())

    expect(falha(await dados.trocarSenha('senha-nova')).classe).toBe('rede')
    expect(valor(await dados.trocarSenha('senha-nova'))).toBeNull()

    expect((await inscrever(dados)).eventos).toEqual([])
  })

  it('(a) senha_igual na primeira tentativa, sem troca incerta antes, continua erro e não consome o replay', async () => {
    const { dados, auth } = comRecuperacao()
    auth.updateUser.mockResolvedValueOnce(MESMA_SENHA)

    const erro = falha(await dados.trocarSenha('senha-nova'))
    expect([erro.chave, erro.codigo]).toEqual(['senha_igual', 'same_password'])

    expect((await inscrever(dados)).eventos).toEqual(['recuperacao'])
  })

  it('(a) senha_igual duas vezes seguidas, sem rede no meio, nunca consome', async () => {
    const { dados, auth } = comRecuperacao()
    auth.updateUser.mockResolvedValueOnce(MESMA_SENHA).mockResolvedValueOnce(MESMA_SENHA)

    falha(await dados.trocarSenha('senha-nova'))
    falha(await dados.trocarSenha('senha-nova'))

    expect((await inscrever(dados)).eventos).toEqual(['recuperacao'])
  })

  it('(b) senha fraca ou rede sem conclusão não consome: a rede só marca a incerteza', async () => {
    const fraca = comRecuperacao()
    fraca.auth.updateUser.mockResolvedValueOnce(SENHA_FRACA)
    expect(falha(await fraca.dados.trocarSenha('abc')).chave).toBe('senha_fraca')
    expect((await inscrever(fraca.dados)).eventos).toEqual(['recuperacao'])

    const rede = comRecuperacao()
    rede.auth.updateUser.mockRejectedValueOnce(semRede())
    expect(falha(await rede.dados.trocarSenha('senha-nova')).classe).toBe('rede')
    expect((await inscrever(rede.dados)).eventos).toEqual(['recuperacao'])

    const redeEFraca = comRecuperacao()
    redeEFraca.auth.updateUser.mockRejectedValueOnce(semRede()).mockResolvedValueOnce(SENHA_FRACA)
    falha(await redeEFraca.dados.trocarSenha('senha-nova'))
    expect(falha(await redeEFraca.dados.trocarSenha('abc')).chave).toBe('senha_fraca')
    expect((await inscrever(redeEFraca.dados)).eventos).toEqual(['recuperacao'])
  })

  it('(c) um novo PASSWORD_RECOVERY zera a incerteza: o same_password seguinte, sem rede nova, não consome', async () => {
    const { dados, auth, emitirAuth } = comRecuperacao()
    auth.updateUser.mockRejectedValueOnce(semRede()).mockResolvedValueOnce(MESMA_SENHA)

    falha(await dados.trocarSenha('senha-nova'))
    emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    expect(falha(await dados.trocarSenha('senha-nova')).chave).toBe('senha_igual')

    expect((await inscrever(dados)).eventos).toEqual(['recuperacao'])
  })

  it('(c)(e) o novo link vale e pode concluir de novo, inclusive pelo caminho incerto', async () => {
    const { dados, auth, emitirAuth } = comRecuperacao()
    auth.updateUser.mockRejectedValueOnce(semRede()).mockResolvedValueOnce(MESMA_SENHA)
    falha(await dados.trocarSenha('senha-nova'))
    falha(await dados.trocarSenha('senha-nova'))
    expect((await inscrever(dados)).eventos).toEqual([])

    emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
    expect((await inscrever(dados)).eventos).toEqual(['recuperacao'])

    auth.updateUser.mockRejectedValueOnce(semRede()).mockResolvedValueOnce(MESMA_SENHA)
    falha(await dados.trocarSenha('outra-senha'))
    falha(await dados.trocarSenha('outra-senha'))
    expect((await inscrever(dados)).eventos).toEqual([])
  })

  it('(c) SIGNED_OUT e outra pessoa entrando zeram o replay e a incerteza; o link seguinte começa limpo', async () => {
    for (const [evento, sessao] of [
      ['SIGNED_OUT', null],
      ['SIGNED_IN', sessaoDe(OUTRA_PESSOA)],
    ] as const) {
      const { dados, auth, emitirAuth } = comRecuperacao()
      auth.updateUser.mockRejectedValueOnce(semRede())
      falha(await dados.trocarSenha('senha-nova'))

      emitirAuth(evento, sessao)
      expect((await inscrever(dados)).eventos, evento).toEqual([])

      // Um link novo vale; com a incerteza zerada, um same_password sem rede nova não o consome.
      emitirAuth('PASSWORD_RECOVERY', sessaoDe(USUARIO_FALSO))
      auth.updateUser.mockResolvedValueOnce(MESMA_SENHA)
      falha(await dados.trocarSenha('senha-nova'))
      expect((await inscrever(dados)).eventos, evento).toEqual(['recuperacao'])
    }
  })

  it('(d) o evento anterior à primeira inscrição continua entregue, mesmo com uma troca incerta no meio', async () => {
    const { dados, auth } = comRecuperacao()
    auth.updateUser.mockRejectedValueOnce(semRede())
    falha(await dados.trocarSenha('senha-nova'))

    // A aba recarregada (uma inscrição nova): o formulário continua aparecendo.
    expect((await inscrever(dados)).eventos).toEqual(['recuperacao'])
    expect((await inscrever(dados)).eventos).toEqual(['recuperacao'])
  })

  it('(g) o resultado de toda chamada de trocarSenha é o de sempre', async () => {
    const { dados, auth } = comRecuperacao()
    auth.updateUser
      .mockRejectedValueOnce(semRede())
      .mockResolvedValueOnce(MESMA_SENHA)
      .mockResolvedValueOnce(SENHA_FRACA)
      .mockResolvedValueOnce({ data: { user: USUARIO_FALSO }, error: null })

    const primeira = falha(await dados.trocarSenha('senha-nova'))
    expect([primeira.classe, primeira.chave]).toEqual(['rede', 'rede'])
    const segunda = falha(await dados.trocarSenha('senha-nova'))
    expect([segunda.classe, segunda.chave, segunda.codigo]).toEqual(['negocio', 'senha_igual', 'same_password'])
    const terceira = falha(await dados.trocarSenha('abc'))
    expect([terceira.classe, terceira.chave]).toEqual(['negocio', 'senha_fraca'])
    expect(await dados.trocarSenha('senha-nova')).toEqual({ ok: true, valor: null })
  })
})

describe('2. a hora', () => {
  const instante = (milissegundos: number) => new Date(AGORA + milissegundos).toISOString()

  function comRelogio() {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(AGORA)
  }

  it('minhasFamilias: o vínculo vencido não entra, o que vence agora não vale, o sem fim e o futuro valem', async () => {
    comRelogio()
    const { dados } = montar({
      tabelas: {
        vinculos: [
          resposta([
            vinculoComFamilia('passado', instante(-1), { ...LINHA_FAMILIA, id: 'fa', criada_em: '2026-10-01T00:00:00Z' }),
            vinculoComFamilia('agora', instante(0), { ...LINHA_FAMILIA, id: 'fb', criada_em: '2026-10-02T00:00:00Z' }),
            vinculoComFamilia('sem_fim', null, { ...LINHA_FAMILIA, id: 'fc', criada_em: '2026-10-03T00:00:00Z' }),
            vinculoComFamilia('futuro', instante(1), { ...LINHA_FAMILIA, id: 'fd', criada_em: '2026-10-04T00:00:00Z' }),
          ]),
        ],
      },
    })

    const familias = valor(await dados.minhasFamilias())
    expect(familias.map((familia) => familia.meuVinculoId)).toEqual(['sem_fim', 'futuro'])
    expect(familias.map((familia) => familia.meuAcessoAte)).toEqual([null, instante(1)])
  })

  it('detalheFamilia: os membros com vínculo vencido ou vencendo agora saem; o convite vence no instante de expira_em', async () => {
    comRelogio()
    const membro = (id: string, validoAte: string | null) => ({
      id,
      conta_id: `conta-${id}`,
      papel: 'cuidador',
      estado: 'ativo',
      valido_ate: validoAte,
    })
    const convite = (id: string, expiraEm: string, vinculoValidoAte: string | null = null) => ({
      id,
      papel: 'cuidador',
      vinculo_valido_ate: vinculoValidoAte,
      criado_por: null,
      expira_em: expiraEm,
    })
    const { dados } = montar({
      tabelas: {
        vinculos: [
          resposta([vinculoComFamilia('meu', null)]),
          resposta([membro('passado', instante(-1)), membro('agora', instante(0)), membro('sem_fim', null), membro('futuro', instante(1))]),
        ],
        bebes: [resposta([])],
        convites: [
          resposta([
            convite('expira_agora', instante(0)),
            convite('expira_depois', instante(1)),
            convite('validade_passada', instante(60_000), instante(-1)),
            convite('validade_agora', instante(60_000), instante(0)),
            convite('validade_futura', instante(60_000), instante(1)),
          ]),
        ],
        contas: [resposta([])],
      },
    })

    const detalhe = valor(await dados.detalheFamilia(FAMILIA))
    expect(detalhe.membros.map((m) => m.vinculoId)).toEqual(['sem_fim', 'futuro'])
    expect(Object.fromEntries((detalhe.convites ?? []).map((c) => [c.id, c.vencido]))).toEqual({
      expira_agora: true,
      expira_depois: false,
      validade_passada: true,
      validade_agora: true,
      validade_futura: false,
    })
  })

  it('texto que não é data em criada_em dá Resultado com erro, nunca uma exceção', async () => {
    for (const ruim of ['ontem', '', 'NaN-NaN-NaN']) {
      const conta = montar({ tabelas: { contas: [resposta({ ...LINHA_CONTA, criada_em: ruim })] } })
      expect(falha(await conta.dados.minhaConta()).classe, `conta ${ruim}`).toBe('desconhecido')

      const familias = montar({
        tabelas: { vinculos: [resposta([vinculoComFamilia('v', null, { ...LINHA_FAMILIA, criada_em: ruim })])] },
      })
      expect(falha(await familias.dados.minhasFamilias()).classe, `família ${ruim}`).toBe('desconhecido')
    }
  })

  it('texto que não é data em nascimento ou em expira_em dá Resultado com erro, nunca uma exceção', async () => {
    const tabelas = (bebe: unknown, expiraEm: string) => ({
      vinculos: [resposta([vinculoComFamilia('meu', null)]), resposta([])],
      bebes: [resposta([bebe])],
      convites: [resposta([{ id: 'c', papel: 'cuidador', vinculo_valido_ate: null, criado_por: null, expira_em: expiraEm }])],
      contas: [resposta([])],
    })

    const nascimentoRuim = montar({ tabelas: tabelas({ ...LINHA_BEBE, nascimento: 'ontem' }, instante(60_000)) })
    expect(falha(await nascimentoRuim.dados.detalheFamilia(FAMILIA)).classe).toBe('desconhecido')

    const conviteRuim = montar({ tabelas: tabelas(LINHA_BEBE, 'amanhã') })
    expect(falha(await conviteRuim.dados.detalheFamilia(FAMILIA)).classe).toBe('desconhecido')

    const bebeRuim = montar({ tabelas: { bebes: [resposta({ ...LINHA_BEBE, nascimento: '2026-13-45' })] } })
    expect(falha(await bebeRuim.dados.cadastrarBebe(FAMILIA, 'Heloísa', '2026-08-05')).classe).toBe('desconhecido')

    const bom = montar({ tabelas: tabelas(LINHA_BEBE, instante(60_000)) })
    expect(valor(await bom.dados.detalheFamilia(FAMILIA)).bebes[0].nascimento).toBe('2026-08-05')
  })
})

describe('3. resposta do Supabase com erro ou vazia', () => {
  describe('a) { data: null, error } vira ok: false com a classe certa', () => {
    it('em toda consulta e toda rpc, um erro do Postgres fora do catálogo é desconhecido, sem lançar', async () => {
      for (const nome of OPERACOES_CONTA.filter((operacao) => operacao !== 'sessaoAtual')) {
        const erro = erroDoBanco('XX999', 'segredo do banco')
        const { dados, auth } = montar({
          tabelas: Object.fromEntries(TABELAS.map((tabela) => [tabela, [erro]])),
          rpc: Object.fromEntries(POR_RPC.map(([, funcao]) => [funcao, erro])),
        })
        const comErro = { data: { user: null, session: null }, error: { name: 'AuthApiError', code: 'xx_novo', message: 'segredo do banco' } }
        for (const metodo of [auth.signInWithPassword, auth.signUp, auth.resetPasswordForEmail, auth.updateUser, auth.signOut]) {
          metodo.mockResolvedValue(comErro)
        }

        const falhou = falha(await CHAMADAS[nome](dados))
        expect(falhou.classe, nome).toBe('desconhecido')
        expect(falhou.chave, nome).toBe('desconhecido')
      }
    })

    it('cada rpc traduz P0002, 42501 e uma mensagem de negócio para a classe e a chave certas', async () => {
      const casos: Array<[string, string, string, string]> = [
        ['P0002', 'familia inexistente', 'nao_encontrado', 'nao_encontrado'],
        ['42501', 'sem permissao', 'sem_permissao', 'sem_permissao'],
        ['P0001', 'convite vencido', 'negocio', 'convite_vencido'],
        ['40P01', 'deadlock detected', 'tente_de_novo', 'tente_de_novo'],
      ]
      for (const [codigo, mensagem, classe, chave] of casos) {
        for (const [nome, funcao] of POR_RPC) {
          const { dados, rpc } = montar({ rpc: { [funcao]: erroDoBanco(codigo, mensagem) } })
          const erro = falha(await CHAMADAS[nome](dados))
          expect([erro.classe, erro.chave], `${nome} ${codigo}`).toEqual([classe, chave])
          expect(rpc.mock.calls[0][0]).toBe(funcao)
        }
      }
    })

    it('minhaConta, criarMinhaConta e atualizarMinhaConta traduzem o erro da consulta', async () => {
      const lida = montar({ tabelas: { contas: [erroDoBanco('42501', 'sem permissao')] } })
      expect(falha(await lida.dados.minhaConta()).classe).toBe('sem_permissao')

      const nova = montar({ tabelas: { contas: [erroDoBanco('23514', 'fuso invalido')] } })
      expect(falha(await nova.dados.criarMinhaConta('Juliana', 'Marte/Olympus')).chave).toBe('fuso_invalido')

      const vazia = montar({ tabelas: { contas: [erroDoBanco('P0001', 'nome vazio')] } })
      expect(falha(await vazia.dados.atualizarMinhaConta(' ', FUSO)).chave).toBe('nome_vazio')
    })

    it('cada leitura da detalheFamilia que falha derruba o resultado com o erro dela', async () => {
      const base = {
        vinculos: [resposta([vinculoComFamilia('meu', null)]), resposta([])],
        bebes: [resposta([])],
        convites: [resposta([])],
        contas: [resposta([])],
      }
      for (const tabela of ['vinculos', 'bebes', 'convites', 'contas'] as const) {
        const fila = tabela === 'vinculos' ? [base.vinculos[0], erroDoBanco('40P01', 'x')] : [erroDoBanco('40P01', 'x')]
        const { dados } = montar({ tabelas: { ...base, [tabela]: fila } })
        expect(falha(await dados.detalheFamilia(FAMILIA)).classe, tabela).toBe('tente_de_novo')
      }
      const familias = montar({ tabelas: { vinculos: [erroDoBanco('42501', 'x')] } })
      expect(falha(await familias.dados.detalheFamilia(FAMILIA)).classe).toBe('sem_permissao')
    })
  })

  describe('b) { data: null, error: null } e { data: [], error: null }', () => {
    it('minhaConta sem linha dá ok com null (a conta incompleta), com data null ou ausente', async () => {
      for (const vazio of [resposta(null), { error: null }, resposta(undefined)]) {
        const { dados } = montar({ tabelas: { contas: [vazio] } })
        expect(valor(await dados.minhaConta())).toBeNull()
      }
    })

    it('minhaConta com linha devolve a conta, com o e-mail da sessão', async () => {
      const { dados } = montar({ tabelas: { contas: [resposta(LINHA_CONTA)] } })
      expect(valor(await dados.minhaConta())).toEqual({
        id: USUARIO_FALSO.id,
        nome: 'Juliana',
        fuso: FUSO,
        email: 'juliana@exemplo.invalid',
        criadaEm: '2026-10-01T10:00:00.000Z',
      })
    })

    it('minhasFamilias vazia dá lista vazia, e a linha sem família (a RLS escondeu) é ignorada', async () => {
      for (const vazio of [resposta(null), resposta([]), { error: null }]) {
        const { dados } = montar({ tabelas: { vinculos: [vazio] } })
        expect(valor(await dados.minhasFamilias())).toEqual([])
      }
      const { dados } = montar({
        tabelas: { vinculos: [resposta([vinculoComFamilia('sem_familia', null, null), vinculoComFamilia('lista', null, [LINHA_FAMILIA])])] },
      })
      expect(valor(await dados.minhasFamilias()).map((f) => f.meuVinculoId)).toEqual(['lista'])
    })

    it('detalheFamilia de uma família que a pessoa não tem dá nao_encontrado (P0002)', async () => {
      for (const vazio of [resposta(null), resposta([])]) {
        const { dados } = montar({ tabelas: { vinculos: [vazio] } })
        const erro = falha(await dados.detalheFamilia(FAMILIA))
        expect([erro.classe, erro.codigo]).toEqual(['nao_encontrado', 'P0002'])
      }
    })

    it('detalheFamilia de quem não é responsável não lê os convites e devolve convites: null', async () => {
      const { dados, from } = montar({
        tabelas: {
          vinculos: [resposta([vinculoComFamilia('meu', null, LINHA_FAMILIA, 'cuidador')]), resposta(null)],
          bebes: [resposta(null)],
          contas: [resposta(null)],
        },
      })
      const detalhe = valor(await dados.detalheFamilia(FAMILIA))
      expect(detalhe).toMatchObject({ bebes: [], membros: [], convites: null })
      expect(from.mock.calls.map(([tabela]) => tabela)).not.toContain('convites')
    })

    it('criarMinhaConta e cadastrarBebe sem linha na resposta são desconhecido, não uma exceção solta', async () => {
      for (const vazio of [resposta(null), resposta(undefined)]) {
        const conta = montar({ tabelas: { contas: [vazio] } })
        expect(falha(await conta.dados.criarMinhaConta('Juliana', FUSO)).classe).toBe('desconhecido')

        const bebe = montar({ tabelas: { bebes: [vazio] } })
        expect(falha(await bebe.dados.cadastrarBebe(FAMILIA, 'Heloísa', '2026-08-05')).classe).toBe('desconhecido')
      }
    })

    it('atualizarMinhaConta com zero linhas dá sessao_encerrada (a conta já não é visível)', async () => {
      for (const vazio of [resposta([]), resposta(null)]) {
        const { dados } = montar({ tabelas: { contas: [vazio] } })
        expect(falha(await dados.atualizarMinhaConta('Juliana', FUSO)).classe).toBe('sessao_encerrada')
      }
    })

    it('criarFamilia e aceitarConvite com rpc null, vazia ou fora do formato são desconhecido; com o id, ok', async () => {
      for (const ruim of [null, undefined, '', {}, [], 42, true]) {
        const criar = montar({ rpc: { criar_familia: resposta(ruim) } })
        expect(falha(await criar.dados.criarFamilia('Casa', FUSO)).classe, `criarFamilia ${String(ruim)}`).toBe('desconhecido')

        const aceitar = montar({ rpc: { aceitar_convite: resposta(ruim) } })
        expect(falha(await aceitar.dados.aceitarConvite('CODIGO')).classe, `aceitarConvite ${String(ruim)}`).toBe('desconhecido')
      }
      const { dados } = montar({ rpc: { criar_familia: resposta(FAMILIA), aceitar_convite: resposta(FAMILIA) } })
      expect(valor(await dados.criarFamilia('Casa', FUSO))).toBe(FAMILIA)
      expect(valor(await dados.aceitarConvite('CODIGO'))).toBe(FAMILIA)
    })

    it('criarConvite com rpc null, vazia ou sem algum campo é desconhecido, não rede; com tudo, ok', async () => {
      for (const ruim of [null, undefined, 'texto', {}, { id: 'c', codigo: 'X' }, { id: 'c', expira_em: '2026-11-13T12:00:00Z' }, { codigo: 'X', expira_em: '2026-11-13T12:00:00Z' }]) {
        const { dados } = montar({ rpc: { criar_convite: resposta(ruim) } })
        const erro = falha(await dados.criarConvite(FAMILIA, 'cuidador', null))
        expect([erro.classe, erro.chave], JSON.stringify(ruim)).toEqual(['desconhecido', 'desconhecido'])
      }
      const { dados } = montar({ rpc: { criar_convite: resposta({ id: 'c', codigo: 'X', expira_em: '2026-11-13T12:00:00+00:00' }) } })
      expect(valor(await dados.criarConvite(FAMILIA, 'cuidador', null))).toEqual({ id: 'c', codigo: 'X', expiraEm: '2026-11-13T12:00:00.000Z' })
    })

    it('verConvite com rpc null, vazia ou sem algum campo é desconhecido; com tudo, ok', async () => {
      const completo = { familia_nome: 'Casa', papel: 'cuidador', vinculo_valido_ate: null, expira_em: '2026-11-13T12:00:00Z', bebes: ['Heloísa'] }
      for (const ruim of [null, undefined, 'texto', {}, { ...completo, bebes: null }, { ...completo, familia_nome: undefined }, { ...completo, expira_em: undefined }]) {
        const { dados } = montar({ rpc: { ver_convite: resposta(ruim) } })
        const erro = falha(await dados.verConvite('CODIGO'))
        expect([erro.classe, erro.chave], JSON.stringify(ruim)).toEqual(['desconhecido', 'desconhecido'])
      }
      const { dados } = montar({ rpc: { ver_convite: resposta(completo) } })
      expect(valor(await dados.verConvite('CODIGO'))).toEqual({
        familiaNome: 'Casa',
        papel: 'cuidador',
        validoAte: null,
        expiraEm: '2026-11-13T12:00:00.000Z',
        bebes: ['Heloísa'],
      })
    })

    it('exportarDados com rpc null é desconhecido; com o objeto, devolve-o sem mudança', async () => {
      for (const ruim of [null, undefined]) {
        const { dados } = montar({ rpc: { exportar_dados: resposta(ruim) } })
        expect(falha(await dados.exportarDados()).classe).toBe('desconhecido')
      }
      const exportacao = { formato: 'appmaternidade-exportacao-v1', conta: { id: 'x' } }
      const { dados } = montar({ rpc: { exportar_dados: resposta(exportacao) } })
      expect(valor(await dados.exportarDados())).toBe(exportacao)
    })

    it('as rpc sem retorno (revogar, mudar papel, sair, excluir) aceitam data null como sucesso', async () => {
      const { dados } = montar()
      for (const nome of ['revogarConvite', 'mudarPapel', 'revogarVinculo', 'sairDaFamilia', 'excluirFamilia', 'excluirConta'] as const) {
        expect(valor(await CHAMADAS[nome](dados)), nome).toBeNull()
      }
    })

    describe('escrita direta barrada com zero linhas: a releitura decide entre P0002 e 42501', () => {
      const barradas: Array<[string, string, (dados: DadosConta) => Promise<Resultado<unknown>>, Record<string, RespostaFalsa[]>]> = [
        ['atualizarFamilia', 'familias', (d) => d.atualizarFamilia(FAMILIA, 'Casa', FUSO), { familias: [resposta([])] }],
        ['atualizarBebe', 'bebes', (d) => d.atualizarBebe(BEBE, 'Heloísa', '2026-08-05'), { bebes: [resposta([])] }],
        ['arquivarBebe', 'bebes', (d) => d.arquivarBebe(BEBE, true), { bebes: [resposta(null)] }],
        ['cadastrarBebe', 'familias', (d) => d.cadastrarBebe(FAMILIA, 'Heloísa', '2026-08-05'), { bebes: [erroDoBanco('42501', 'sem permissao')] }],
      ]

      for (const [nome, tabelaDaReleitura, chamar, antes] of barradas) {
        it(`${nome}: a releitura sem linha dá P0002 (nao_encontrado)`, async () => {
          const { dados } = montar({ tabelas: { ...antes, [tabelaDaReleitura]: [...(antes[tabelaDaReleitura] ?? []), resposta(null)] } })
          const erro = falha(await chamar(dados))
          expect([erro.classe, erro.codigo]).toEqual(['nao_encontrado', 'P0002'])
        })

        it(`${nome}: a releitura com linha dá 42501 (sem_permissao)`, async () => {
          const { dados } = montar({
            tabelas: { ...antes, [tabelaDaReleitura]: [...(antes[tabelaDaReleitura] ?? []), resposta({ id: 'existe' })] },
          })
          const erro = falha(await chamar(dados))
          expect([erro.classe, erro.codigo]).toEqual(['sem_permissao', '42501'])
        })

        it(`${nome}: a própria releitura falhando propaga o erro dela`, async () => {
          const { dados } = montar({
            tabelas: { ...antes, [tabelaDaReleitura]: [...(antes[tabelaDaReleitura] ?? []), erroDoBanco('40P01', 'deadlock detected')] },
          })
          expect(falha(await chamar(dados)).classe).toBe('tente_de_novo')
        })
      }
    })

    it('atualizarFamilia com a escrita feita devolve o resumo; se a família some da leitura, nao_encontrado', async () => {
      const ok = montar({
        tabelas: { familias: [resposta([{ id: FAMILIA }])], vinculos: [resposta([vinculoComFamilia('meu', null)])] },
      })
      expect(valor(await ok.dados.atualizarFamilia(FAMILIA, 'Casa da Heloísa', FUSO))).toMatchObject({ id: FAMILIA, meuVinculoId: 'meu' })

      const sumiu = montar({ tabelas: { familias: [resposta([{ id: FAMILIA }])], vinculos: [resposta([])] } })
      expect(falha(await sumiu.dados.atualizarFamilia(FAMILIA, 'Casa', FUSO)).classe).toBe('nao_encontrado')
    })

    it('atualizarBebe e arquivarBebe com a escrita feita devolvem o bebê', async () => {
      const { dados } = montar({ tabelas: { bebes: [resposta([{ ...LINHA_BEBE, estado: 'arquivado' }])] } })
      expect(valor(await dados.arquivarBebe(BEBE, true))).toEqual({
        id: BEBE,
        familiaId: FAMILIA,
        nome: 'Heloísa',
        nascimento: '2026-08-05',
        estado: 'arquivado',
      })
    })

    it('cadastrarBebe com outro erro que não 42501 devolve o erro dele, sem reler', async () => {
      const { dados, from } = montar({ tabelas: { bebes: [erroDoBanco('23514', 'nascimento no futuro')] } })
      expect(falha(await dados.cadastrarBebe(FAMILIA, 'Heloísa', '2027-01-01')).chave).toBe('nascimento_no_futuro')
      expect(from.mock.calls.map(([tabela]) => tabela)).not.toContain('familias')
    })
  })

  describe('c) exceção lançada pelo cliente (a rede caiu)', () => {
    it('toda operação devolve rede, sem lançar, quando o cliente inteiro lança TypeError: Failed to fetch', async () => {
      for (const nome of OPERACOES_CONTA) {
        const { dados, auth, rpc } = montar({ tabelas: Object.fromEntries(TABELAS.map((tabela) => [tabela, [falhaDeRede]])) })
        for (const metodo of [auth.signInWithPassword, auth.signUp, auth.resetPasswordForEmail, auth.updateUser, auth.signOut]) {
          metodo.mockRejectedValue(new TypeError('Failed to fetch'))
        }
        rpc.mockRejectedValue(new TypeError('Failed to fetch'))
        if (nome === 'sessaoAtual') auth.getSession.mockRejectedValue(new TypeError('Failed to fetch'))

        const erro = falha(await CHAMADAS[nome](dados))
        expect(erro.classe, nome).toBe('rede')
        expect(erro.chave, nome).toBe('rede')
      }
    })

    it('uma resposta do Auth que o fetch derrubou (AuthRetryableFetchError) também é rede', async () => {
      const { dados, auth } = montar()
      auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { name: 'AuthRetryableFetchError', message: 'qualquer coisa', status: 0 },
      })
      expect(falha(await dados.entrar('a@exemplo.invalid', 'senha')).classe).toBe('rede')
    })

    it('uma exceção que não é de rede (um Error comum) é desconhecido', async () => {
      const { dados } = montar({ tabelas: { contas: [() => { throw new Error('quebrou por dentro') }] } })
      expect(falha(await dados.minhaConta()).classe).toBe('desconhecido')
    })
  })
})
