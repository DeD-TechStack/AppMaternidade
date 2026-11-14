import { describe, expect, it } from 'vitest'
import type { ErroDados, Resultado } from './comum.ts'
import type { DadosConta, EventoSessao } from './conta.ts'
import {
  BEBE_DEMONSTRACAO,
  CODIGO_CONVITE_PENDENTE,
  CODIGO_CONVITE_VENCIDO,
  FAMILIAS_DEMONSTRACAO,
  SENHA_DEMONSTRACAO,
} from './conta.demonstracao.ts'
import { criarDadosContaMemoria, simularFalha, simularRespostaPerdida } from './conta.memoria.ts'
import { PESSOAS, criarFixtureDeTeste } from '../teste/renderizarComDados.tsx'
import { ID_BEBE, ID_FAMILIA, criarMundoDeTeste } from '../teste/rotina.fixture.ts'
import { criarDadosRotinaMemoria } from './rotina.memoria.ts'
import type { Nota, Registro } from './rotina.tipos.ts'

// A memória reproduz as regras do banco que a tela usa, com os mesmos códigos e mensagens
// (RF-03 e RF-04). Os casos seguem a ordem da MAT-45: parâmetro obrigatório, conta, existência e
// visibilidade (P0002), papel de escrita (42501) e, por último, as regras de valor.

const AGORA = Date.parse('2026-11-06T12:00:00.000Z')
const DIA = 86_400_000
const EXEMPLO = FAMILIAS_DEMONSTRACAO.exemplo
const TESTE = FAMILIAS_DEMONSTRACAO.teste
const VINCULO_DA_JULIANA = 'b1111111-1111-4111-8111-111111111111'
const VINCULO_DO_BRUNO = 'b2222222-2222-4222-8222-222222222222'
const CONVITE_PENDENTE = '45e11111-1111-4111-8111-111111111111'
const CONVITE_VENCIDO = '45e22222-2222-4222-8222-222222222222'
const INEXISTENTE = '99999999-9999-4999-8999-999999999999'

type Pessoa = keyof typeof PESSOAS

let relogio = AGORA

function criar(opcoes: { confirmarEmail?: boolean } = {}) {
  relogio = AGORA
  return criarDadosContaMemoria(criarFixtureDeTeste(AGORA), { agora: () => relogio, ...opcoes })
}

function como(pessoa: Pessoa, dados = criar()) {
  dados.sessaoParaTeste(PESSOAS[pessoa].email)
  return dados
}

async function valor<T>(promessa: Promise<Resultado<T>>): Promise<T> {
  const resultado = await promessa
  if (!resultado.ok) throw new Error(`erro inesperado: ${resultado.erro.chave} (${resultado.erro.codigo})`)
  return resultado.valor
}

async function erro<T>(promessa: Promise<Resultado<T>>): Promise<ErroDados> {
  const resultado = await promessa
  if (resultado.ok) throw new Error('esperava um erro, mas deu certo')
  return resultado.erro
}

const esperarEventos = () => new Promise((resolver) => setTimeout(resolver, 0))

/** Uma pessoa nova, com sessão e sem conta (a conta incompleta). */
async function pessoaNova(dados: ReturnType<typeof criar>) {
  await valor(dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'http://localhost/entrar'))
  return dados
}

describe('sessão e Auth', () => {
  it('sessaoAtual devolve ninguém ou o usuário da sessão', async () => {
    const dados = criar()
    expect(await valor(dados.sessaoAtual())).toBeNull()
    como('juliana', dados)
    expect(await valor(dados.sessaoAtual())).toEqual({
      id: PESSOAS.juliana.id,
      email: 'juliana@exemplo.invalid',
      nomeMetadados: null,
    })
  })

  it('entrar com a senha certa abre a sessão e emite "entrou"', async () => {
    const dados = criar()
    const eventos: EventoSessao[] = []
    dados.aoMudarSessao((evento) => eventos.push(evento))

    const usuario = await valor(dados.entrar(' Juliana@Exemplo.invalid ', SENHA_DEMONSTRACAO))
    expect(usuario.id).toBe(PESSOAS.juliana.id)
    expect((await valor(dados.sessaoAtual()))?.id).toBe(usuario.id)
    await esperarEventos()
    expect(eventos).toEqual(['entrou'])
  })

  it('entrar com senha errada ou e-mail desconhecido dá invalid_credentials, sem abrir sessão', async () => {
    const dados = criar()
    for (const [email, senha] of [
      ['juliana@exemplo.invalid', 'errada'],
      ['ninguem@exemplo.invalid', SENHA_DEMONSTRACAO],
    ]) {
      expect(await erro(dados.entrar(email, senha))).toMatchObject({ chave: 'credenciais', classe: 'negocio', codigo: 'invalid_credentials' })
    }
    expect(await valor(dados.sessaoAtual())).toBeNull()
  })

  it('criarUsuario cria o usuário com o nome nos metadados, abre a sessão e deixa a conta incompleta', async () => {
    const dados = criar()
    const criado = await valor(dados.criarUsuario('Nova@Exemplo.invalid', 'senha-nova', 'Nova', 'http://localhost/entrar'))

    expect(criado.comSessao).toBe(true)
    expect(criado.usuario).toMatchObject({ email: 'nova@exemplo.invalid', nomeMetadados: 'Nova' })
    expect((await valor(dados.sessaoAtual()))?.id).toBe(criado.usuario.id)
    expect(await valor(dados.minhaConta())).toBeNull()
  })

  it('criarUsuario: e-mail já usado, senha curta e e-mail inválido', async () => {
    const dados = criar()
    expect(await erro(dados.criarUsuario('juliana@exemplo.invalid', 'senha-nova', 'Outra', 'x'))).toMatchObject({
      chave: 'email_em_uso',
      codigo: 'user_already_exists',
    })
    expect(await erro(dados.criarUsuario('nova@exemplo.invalid', '12345', 'Nova', 'x'))).toMatchObject({ chave: 'senha_fraca', codigo: 'weak_password' })
    expect(await erro(dados.criarUsuario('sem-arroba', 'senha-nova', 'Nova', 'x'))).toMatchObject({ chave: 'email_invalido' })
    expect(await valor(dados.sessaoAtual())).toBeNull()
  })

  it('com "Confirm email" ligado, criarUsuario não devolve sessão; o link de confirmação depois permite entrar', async () => {
    const dados = criar({ confirmarEmail: true })
    const criado = await valor(dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'x'))
    expect(criado.comSessao).toBe(false)
    expect(await valor(dados.sessaoAtual())).toBeNull()
    expect((await valor(dados.entrar('nova@exemplo.invalid', 'senha-nova'))).nomeMetadados).toBe('Nova')
  })

  it('pedirRecuperacao guarda o último pedido por e-mail e responde igual para e-mail existente ou não', async () => {
    const dados = criar()
    expect(await valor(dados.pedirRecuperacao('Juliana@exemplo.invalid', 'http://localhost/redefinir-senha'))).toBeNull()
    expect(await valor(dados.pedirRecuperacao('ninguem@exemplo.invalid', 'http://localhost/redefinir-senha'))).toBeNull()
    expect(dados.ultimoPedidoDeRecuperacao('juliana@exemplo.invalid')).toBe('http://localhost/redefinir-senha')
    expect(dados.ultimoPedidoDeRecuperacao('ninguem@exemplo.invalid')).toBe('http://localhost/redefinir-senha')
    expect(dados.ultimoPedidoDeRecuperacao('outra@exemplo.invalid')).toBeUndefined()
  })

  it('trocarSenha: sem sessão, mesma senha, senha curta e sucesso', async () => {
    const dados = criar()
    expect(await erro(dados.trocarSenha('senha-nova'))).toMatchObject({ chave: 'sessao_encerrada', classe: 'sessao_encerrada' })

    como('juliana', dados)
    const eventos: EventoSessao[] = []
    dados.aoMudarSessao((evento) => eventos.push(evento))
    expect(await erro(dados.trocarSenha(SENHA_DEMONSTRACAO))).toMatchObject({ chave: 'senha_igual', codigo: 'same_password' })
    expect(await erro(dados.trocarSenha('12345'))).toMatchObject({ chave: 'senha_fraca' })

    expect(await valor(dados.trocarSenha('senha-nova'))).toBeNull()
    await esperarEventos()
    expect(eventos).toEqual(['usuario_atualizado'])
    await valor(dados.sair())
    expect((await erro(dados.entrar('juliana@exemplo.invalid', SENHA_DEMONSTRACAO))).chave).toBe('credenciais')
    expect((await valor(dados.entrar('juliana@exemplo.invalid', 'senha-nova'))).id).toBe(PESSOAS.juliana.id)
  })

  it('sair encerra a sessão e emite "saiu"; sem sessão, sair é um sucesso sem evento', async () => {
    const dados = como('juliana')
    const eventos: EventoSessao[] = []
    const cancelar = dados.aoMudarSessao((evento) => eventos.push(evento))

    expect(await valor(dados.sair())).toBeNull()
    expect(await valor(dados.sessaoAtual())).toBeNull()
    expect(await valor(dados.sair())).toBeNull()
    await esperarEventos()
    expect(eventos).toEqual(['saiu'])

    cancelar()
    await valor(dados.entrar('juliana@exemplo.invalid', SENHA_DEMONSTRACAO))
    await esperarEventos()
    expect(eventos).toEqual(['saiu'])
  })

  it('abrirLinkDeRecuperacao entra como a pessoa e emite "entrou" e "recuperacao", nessa ordem', async () => {
    const dados = criar()
    const eventos: Array<[EventoSessao, string | null]> = []
    dados.aoMudarSessao((evento, usuario) => eventos.push([evento, usuario?.id ?? null]))

    expect(dados.abrirLinkDeRecuperacao('ninguem@exemplo.invalid')).toBeNull()
    const usuario = dados.abrirLinkDeRecuperacao('juliana@exemplo.invalid')
    expect(usuario?.id).toBe(PESSOAS.juliana.id)
    await esperarEventos()
    expect(eventos).toEqual([
      ['entrou', PESSOAS.juliana.id],
      ['recuperacao', PESSOAS.juliana.id],
    ])
  })

  it('encerrarSessaoPorFora emite "saiu" sem ninguém ter pedido', async () => {
    const dados = como('juliana')
    const eventos: EventoSessao[] = []
    dados.aoMudarSessao((evento) => eventos.push(evento))

    dados.encerrarSessaoPorFora()
    dados.encerrarSessaoPorFora()
    await esperarEventos()
    expect(eventos).toEqual(['saiu'])
    expect(await valor(dados.sessaoAtual())).toBeNull()
  })
})

describe('conta', () => {
  it('minhaConta devolve a conta da sessão, com o e-mail dela, ou null se estiver incompleta', async () => {
    const dados = como('juliana')
    expect(await valor(dados.minhaConta())).toEqual({
      id: PESSOAS.juliana.id,
      nome: 'Juliana',
      fuso: 'America/Sao_Paulo',
      email: 'juliana@exemplo.invalid',
      criadaEm: new Date(AGORA - 30 * DIA).toISOString(),
    })
    expect(await valor((await pessoaNova(criar())).minhaConta())).toBeNull()
    expect((await erro(criar().minhaConta())).chave).toBe('sessao_encerrada')
  })

  it('criarMinhaConta cria a conta; repetir devolve 23505 (desconhecido); fuso inválido; sem sessão', async () => {
    const dados = await pessoaNova(criar())
    expect(await erro(dados.criarMinhaConta('Nova', 'Fuso/Inexistente'))).toMatchObject({ chave: 'fuso_invalido', codigo: '23514' })

    const conta = await valor(dados.criarMinhaConta('Nova', 'America/Manaus'))
    expect(conta).toMatchObject({ nome: 'Nova', fuso: 'America/Manaus', email: 'nova@exemplo.invalid' })
    expect(await valor(dados.minhaConta())).toEqual(conta)

    expect(await erro(dados.criarMinhaConta('Nova', 'America/Manaus'))).toMatchObject({ chave: 'desconhecido', codigo: '23505' })
    expect((await erro(criar().criarMinhaConta('Nova', 'America/Manaus'))).chave).toBe('sessao_encerrada')
  })

  it('atualizarMinhaConta muda o nome e o fuso; fuso inválido; conta incompleta vira sessao_encerrada', async () => {
    const dados = como('juliana')
    expect(await valor(dados.atualizarMinhaConta('Juliana Souza', 'America/Recife'))).toMatchObject({ nome: 'Juliana Souza', fuso: 'America/Recife' })
    expect(await valor(dados.minhaConta())).toMatchObject({ nome: 'Juliana Souza', fuso: 'America/Recife' })
    expect((await erro(dados.atualizarMinhaConta('Juliana', 'Fuso/Inexistente'))).chave).toBe('fuso_invalido')
    expect((await erro((await pessoaNova(criar())).atualizarMinhaConta('Nova', 'UTC'))).chave).toBe('sessao_encerrada')
  })
})

describe('famílias: leitura', () => {
  it('minhasFamilias traz só as famílias com vínculo ativo, com o papel e o vínculo da pessoa', async () => {
    expect(await valor(como('juliana').minhasFamilias())).toEqual([
      {
        id: EXEMPLO,
        nome: 'Família Exemplo',
        fuso: 'America/Sao_Paulo',
        criadaEm: new Date(AGORA - 30 * DIA).toISOString(),
        meuPapel: 'responsavel',
        meuVinculoId: VINCULO_DA_JULIANA,
        meuAcessoAte: null,
      },
    ])
    expect((await valor(como('bruno').minhasFamilias())).map((f) => [f.id, f.meuPapel])).toEqual([[EXEMPLO, 'cuidador']])
    expect(await valor(como('davi').minhasFamilias())).toEqual([])
  })

  it('minhasFamilias vem em ordem de criada_em e depois de id', async () => {
    const dados = como('juliana')
    relogio = AGORA + DIA
    const nova = await valor(dados.criarFamilia('Segunda família', 'UTC'))
    expect((await valor(dados.minhasFamilias())).map((f) => f.id)).toEqual([EXEMPLO, nova])
  })

  it('detalheFamilia do responsável: membros, bebês e convites pendentes (o vencido marcado)', async () => {
    const detalhe = await valor(como('juliana').detalheFamilia(EXEMPLO))

    expect(detalhe.familia).toMatchObject({ id: EXEMPLO, meuPapel: 'responsavel' })
    expect(detalhe.membros).toEqual([
      { vinculoId: VINCULO_DA_JULIANA, contaId: PESSOAS.juliana.id, nome: 'Juliana', papel: 'responsavel', validoAte: null, souEu: true },
      { vinculoId: VINCULO_DO_BRUNO, contaId: PESSOAS.bruno.id, nome: 'Bruno', papel: 'cuidador', validoAte: null, souEu: false },
    ])
    expect(detalhe.bebes).toEqual([{ id: BEBE_DEMONSTRACAO, familiaId: EXEMPLO, nome: 'Heloísa', nascimento: '2026-08-05', estado: 'ativo' }])
    expect(detalhe.convites).toHaveLength(2)
    const pendente = detalhe.convites!.find((c) => c.id === CONVITE_PENDENTE)!
    const vencido = detalhe.convites!.find((c) => c.id === CONVITE_VENCIDO)!
    expect(pendente).toMatchObject({ papel: 'observador', vencido: false, criadoPorNome: 'Juliana', validoAte: null })
    expect(vencido).toMatchObject({ papel: 'cuidador', vencido: true })
  })

  it('detalheFamilia de quem não é responsável vem sem a lista de convites (null)', async () => {
    const detalhe = await valor(como('bruno').detalheFamilia(EXEMPLO))
    expect(detalhe.convites).toBeNull()
    expect(detalhe.membros.find((m) => m.souEu)?.nome).toBe('Bruno')
  })

  it('detalheFamilia sem visibilidade responde como id inexistente: P0002', async () => {
    for (const [pessoa, familia] of [
      ['juliana', TESTE],
      ['davi', EXEMPLO],
      ['juliana', INEXISTENTE],
    ] as Array<[Pessoa, string]>) {
      expect(await erro(como(pessoa).detalheFamilia(familia))).toMatchObject({ chave: 'nao_encontrado', codigo: 'P0002', mensagemOriginal: 'familia inexistente' })
    }
  })

  it('o vínculo com validade vencida deixa de valer: a família some da lista e do detalhe', async () => {
    const dados = como('juliana')
    const convite = await valor(dados.criarConvite(EXEMPLO, 'observador', new Date(AGORA + 10 * DIA).toISOString()))
    como('davi', dados)
    await valor(dados.aceitarConvite(convite.codigo))
    expect((await valor(dados.minhasFamilias()))[0].meuAcessoAte).toBe(new Date(AGORA + 10 * DIA).toISOString())

    relogio = AGORA + 11 * DIA
    expect(await valor(dados.minhasFamilias())).toEqual([])
    expect((await erro(dados.detalheFamilia(EXEMPLO))).chave).toBe('nao_encontrado')
    como('juliana', dados)
    expect((await valor(dados.detalheFamilia(EXEMPLO))).membros.map((m) => m.nome)).toEqual(['Juliana', 'Bruno'])
  })
})

describe('famílias: criar e editar', () => {
  it('criarFamilia cria a família e faz da pessoa a responsável', async () => {
    const dados = como('davi')
    const id = await valor(dados.criarFamilia('Família do Davi', 'America/Recife'))
    const detalhe = await valor(dados.detalheFamilia(id))
    expect(detalhe.familia).toMatchObject({ nome: 'Família do Davi', fuso: 'America/Recife', meuPapel: 'responsavel' })
    expect(detalhe.membros).toHaveLength(1)
    expect(detalhe.bebes).toEqual([])
  })

  it('criarFamilia: nome vazio depois de tirar as pontas, fuso inválido (nessa ordem) e conta incompleta', async () => {
    const dados = como('davi')
    expect(await erro(dados.criarFamilia('   ', 'UTC'))).toMatchObject({ chave: 'nome_vazio', codigo: 'P0001', mensagemOriginal: 'nome vazio' })
    expect(await erro(dados.criarFamilia('   ', 'Fuso/Inexistente'))).toMatchObject({ chave: 'nome_vazio' })
    expect(await erro(dados.criarFamilia('Família', 'Fuso/Inexistente'))).toMatchObject({ chave: 'fuso_invalido', codigo: '23514' })
    expect(await erro((await pessoaNova(criar())).criarFamilia('Família', 'UTC'))).toMatchObject({ chave: 'conta_inexistente', codigo: 'P0001' })
  })

  it('atualizarFamilia: o responsável edita; o cuidador recebe 42501; quem não vê recebe P0002', async () => {
    const dados = como('juliana')
    const resumo = await valor(dados.atualizarFamilia(EXEMPLO, 'Família Nova', 'America/Manaus'))
    expect(resumo).toMatchObject({ id: EXEMPLO, nome: 'Família Nova', fuso: 'America/Manaus' })

    expect(await erro(como('bruno', dados).atualizarFamilia(EXEMPLO, 'X', 'UTC'))).toMatchObject({ chave: 'sem_permissao', codigo: '42501', mensagemOriginal: 'sem permissao' })
    expect(await erro(como('davi', dados).atualizarFamilia(EXEMPLO, 'X', 'UTC'))).toMatchObject({ chave: 'nao_encontrado', codigo: 'P0002', mensagemOriginal: 'familia inexistente' })
  })

  it('atualizarFamilia: o valor só é conferido depois da visibilidade e do papel', async () => {
    const dados = criar()
    expect((await erro(como('davi', dados).atualizarFamilia(EXEMPLO, 'X', 'Fuso/Inexistente'))).chave).toBe('nao_encontrado')
    expect((await erro(como('bruno', dados).atualizarFamilia(EXEMPLO, 'X', 'Fuso/Inexistente'))).chave).toBe('sem_permissao')
    expect((await erro(como('juliana', dados).atualizarFamilia(EXEMPLO, 'X', 'Fuso/Inexistente'))).chave).toBe('fuso_invalido')
  })

  it('o parâmetro obrigatório vem antes de tudo', async () => {
    const dados = como('davi')
    expect(await erro(dados.atualizarFamilia('', 'X', 'UTC'))).toMatchObject({ chave: 'parametro_obrigatorio', codigo: 'P0001' })
    expect((await erro(dados.sairDaFamilia(''))).chave).toBe('parametro_obrigatorio')
    expect((await erro(dados.criarConvite('', 'observador', null))).chave).toBe('parametro_obrigatorio')
    expect((await erro(dados.revogarConvite(''))).chave).toBe('parametro_obrigatorio')
    expect((await erro(dados.mudarPapel('', 'observador'))).chave).toBe('parametro_obrigatorio')
    expect((await erro(dados.verConvite(''))).chave).toBe('parametro_obrigatorio')
  })
})

describe('bebês', () => {
  it('cadastrarBebe cria o bebê; o nascimento depois de hoje, no fuso da família, é recusado', async () => {
    const dados = como('juliana')
    const bebe = await valor(dados.cadastrarBebe(EXEMPLO, 'Teo', '2026-11-06'))
    expect(bebe).toMatchObject({ familiaId: EXEMPLO, nome: 'Teo', nascimento: '2026-11-06', estado: 'ativo' })
    expect((await valor(dados.detalheFamilia(EXEMPLO))).bebes.map((b) => b.nome)).toEqual(['Heloísa', 'Teo'])

    expect(await erro(dados.cadastrarBebe(EXEMPLO, 'Teo', '2026-11-07'))).toMatchObject({ chave: 'nascimento_no_futuro', codigo: '23514' })
  })

  it('o "hoje" do bebê é o da família, não o do aparelho', async () => {
    const dados = como('juliana')
    // 01h30 UTC de 06/11 ainda é 05/11 em São Paulo.
    relogio = Date.parse('2026-11-06T01:30:00Z')
    expect((await erro(dados.cadastrarBebe(EXEMPLO, 'Teo', '2026-11-06'))).chave).toBe('nascimento_no_futuro')
    expect((await valor(dados.cadastrarBebe(EXEMPLO, 'Teo', '2026-11-05'))).nascimento).toBe('2026-11-05')
  })

  it('cadastrarBebe: P0002 sem visibilidade, 42501 sem ser responsável e só depois o valor', async () => {
    const dados = criar()
    expect(await erro(como('davi', dados).cadastrarBebe(EXEMPLO, 'Teo', '2030-01-01'))).toMatchObject({ chave: 'nao_encontrado', mensagemOriginal: 'familia inexistente' })
    expect(await erro(como('bruno', dados).cadastrarBebe(EXEMPLO, 'Teo', '2030-01-01'))).toMatchObject({ chave: 'sem_permissao', codigo: '42501' })
    expect((await erro(como('juliana', dados).cadastrarBebe(EXEMPLO, 'Teo', '2030-01-01'))).chave).toBe('nascimento_no_futuro')
  })

  it('atualizarBebe e arquivarBebe: sucesso, bebê inexistente (P0002) e papel (42501)', async () => {
    const dados = como('juliana')
    expect(await valor(dados.atualizarBebe(BEBE_DEMONSTRACAO, 'Heloísa Souza', '2026-08-06'))).toMatchObject({ nome: 'Heloísa Souza', nascimento: '2026-08-06' })
    expect(await valor(dados.arquivarBebe(BEBE_DEMONSTRACAO, true))).toMatchObject({ estado: 'arquivado' })
    expect(await valor(dados.arquivarBebe(BEBE_DEMONSTRACAO, false))).toMatchObject({ estado: 'ativo' })
    expect(await erro(dados.atualizarBebe(BEBE_DEMONSTRACAO, 'Heloísa', '2030-01-01'))).toMatchObject({ chave: 'nascimento_no_futuro' })

    for (const operacao of [
      (d: DadosConta) => d.atualizarBebe(INEXISTENTE, 'X', '2026-01-01'),
      (d: DadosConta) => d.arquivarBebe(INEXISTENTE, true),
    ]) {
      expect(await erro(operacao(dados))).toMatchObject({ chave: 'nao_encontrado', codigo: 'P0002', mensagemOriginal: 'bebe inexistente' })
    }
    // Sem visibilidade na família do bebê, é igual a um bebê que não existe.
    expect((await erro(como('davi', dados).arquivarBebe(BEBE_DEMONSTRACAO, true))).mensagemOriginal).toBe('bebe inexistente')
    expect(await erro(como('bruno', dados).arquivarBebe(BEBE_DEMONSTRACAO, true))).toMatchObject({ chave: 'sem_permissao', codigo: '42501' })
    expect((await erro(como('bruno', dados).atualizarBebe(BEBE_DEMONSTRACAO, 'X', '2030-01-01'))).chave).toBe('sem_permissao')
  })
})

describe('convites', () => {
  it('criarConvite devolve id, código de 64 hexadecimais e o vencimento em 7 dias; o convite entra na lista', async () => {
    const dados = como('juliana')
    const criado = await valor(dados.criarConvite(EXEMPLO, 'cuidador', null))
    expect(criado.codigo).toMatch(/^[0-9a-f]{64}$/)
    expect(criado.expiraEm).toBe(new Date(AGORA + 7 * DIA).toISOString())
    expect((await valor(dados.criarConvite(EXEMPLO, 'cuidador', null))).codigo).not.toBe(criado.codigo)

    const lista = (await valor(dados.detalheFamilia(EXEMPLO))).convites!
    expect(lista.find((c) => c.id === criado.id)).toMatchObject({ papel: 'cuidador', vencido: false, criadoPorNome: 'Juliana' })
  })

  it('criarConvite: responsável não tem validade; a validade passa dos 7 dias do convite', async () => {
    const dados = como('juliana')
    const emOitoDias = new Date(AGORA + 8 * DIA).toISOString()
    const emSeteDias = new Date(AGORA + 7 * DIA).toISOString()
    expect(await erro(dados.criarConvite(EXEMPLO, 'responsavel', emOitoDias))).toMatchObject({ chave: 'responsavel_sem_validade', codigo: 'P0001' })
    // Os dois erros juntos: sai o primeiro da ordem.
    expect((await erro(dados.criarConvite(EXEMPLO, 'responsavel', new Date(AGORA).toISOString()))).chave).toBe('responsavel_sem_validade')
    expect(await erro(dados.criarConvite(EXEMPLO, 'observador', emSeteDias))).toMatchObject({ chave: 'validade_menor', mensagemOriginal: 'validade menor que o convite' })
    expect((await valor(dados.criarConvite(EXEMPLO, 'observador', emOitoDias))).codigo).toHaveLength(64)
    expect((await valor(dados.criarConvite(EXEMPLO, 'responsavel', null))).id).toBeTruthy()
  })

  it('criarConvite: P0002 sem visibilidade e 42501 sem ser responsável', async () => {
    const dados = criar()
    expect(await erro(como('davi', dados).criarConvite(EXEMPLO, 'observador', null))).toMatchObject({ chave: 'nao_encontrado', mensagemOriginal: 'familia inexistente' })
    expect(await erro(como('bruno', dados).criarConvite(EXEMPLO, 'observador', null))).toMatchObject({ chave: 'sem_permissao', codigo: '42501' })
    expect((await erro(como('bruno', dados).criarConvite(EXEMPLO, 'responsavel', new Date(AGORA).toISOString()))).chave).toBe('sem_permissao')
  })

  it('verConvite mostra a prévia, sem conferir se a pessoa já é membro, e normaliza o código', async () => {
    const previa = await valor(como('davi').verConvite(`  ${CODIGO_CONVITE_PENDENTE.toUpperCase()}  `))
    expect(previa).toEqual({
      familiaNome: 'Família Exemplo',
      papel: 'observador',
      validoAte: null,
      expiraEm: new Date(AGORA + 7 * DIA).toISOString(),
      bebes: ['Heloísa'],
    })
    // Bruno já é membro: a prévia não confere vínculo.
    expect((await valor(como('bruno').verConvite(CODIGO_CONVITE_PENDENTE))).familiaNome).toBe('Família Exemplo')
  })

  it('a prévia só traz os bebês ativos', async () => {
    const dados = como('juliana')
    await valor(dados.arquivarBebe(BEBE_DEMONSTRACAO, true))
    expect((await valor(dados.verConvite(CODIGO_CONVITE_PENDENTE))).bebes).toEqual([])
  })

  it('erros do convite na ordem da MAT-45: formato, hash desconhecido, revogado, usado e vencido', async () => {
    const dados = como('davi')
    for (const codigo of ['curto', 'g'.repeat(64), '45a1'.repeat(15), '45a1'.repeat(17)]) {
      expect(await erro(dados.verConvite(codigo))).toMatchObject({ chave: 'convite_invalido', codigo: 'P0001' })
      expect((await erro(dados.aceitarConvite(codigo))).chave).toBe('convite_invalido')
    }
    expect((await erro(dados.verConvite('ab'.repeat(32)))).chave).toBe('convite_invalido')
    expect(await erro(dados.verConvite(CODIGO_CONVITE_VENCIDO))).toMatchObject({ chave: 'convite_vencido', mensagemOriginal: 'convite vencido' })
    expect((await erro(dados.aceitarConvite(CODIGO_CONVITE_VENCIDO))).chave).toBe('convite_vencido')

    // Revogado e vencido ao mesmo tempo: sai "revogado".
    const responsavel = como('juliana', dados)
    await valor(responsavel.revogarConvite(CONVITE_VENCIDO))
    como('davi', dados)
    expect((await erro(dados.verConvite(CODIGO_CONVITE_VENCIDO))).chave).toBe('convite_revogado')
    expect((await erro(dados.aceitarConvite(CODIGO_CONVITE_VENCIDO))).chave).toBe('convite_revogado')

    // Usado.
    await valor(dados.aceitarConvite(CODIGO_CONVITE_PENDENTE))
    expect((await erro(dados.verConvite(CODIGO_CONVITE_PENDENTE))).chave).toBe('convite_usado')
    expect((await erro(dados.aceitarConvite(CODIGO_CONVITE_PENDENTE))).chave).toBe('convite_usado')
  })

  it('convite com a validade do vínculo já passada também vence', async () => {
    const dados = como('juliana')
    const convite = await valor(dados.criarConvite(EXEMPLO, 'observador', new Date(AGORA + 8 * DIA).toISOString()))
    relogio = AGORA + 9 * DIA
    como('davi', dados)
    expect((await erro(dados.aceitarConvite(convite.codigo))).chave).toBe('convite_vencido')
  })

  it('aceitarConvite cria o vínculo com o papel e a validade do convite e devolve a família', async () => {
    const dados = como('davi')
    expect(await valor(dados.aceitarConvite(CODIGO_CONVITE_PENDENTE))).toBe(EXEMPLO)

    const detalhe = await valor(dados.detalheFamilia(EXEMPLO))
    expect(detalhe.familia.meuPapel).toBe('observador')
    expect(detalhe.convites).toBeNull()
    expect(detalhe.membros.map((m) => m.nome)).toEqual(['Juliana', 'Bruno', 'Davi'])
    // O convite aceito sai da lista de pendentes de quem o criou.
    expect((await valor(como('juliana', dados).detalheFamilia(EXEMPLO))).convites!.map((c) => c.id)).toEqual([CONVITE_VENCIDO])
  })

  it('aceitarConvite: quem já é membro recebe ja_e_membro e o convite continua pendente; vencido vem antes', async () => {
    const dados = como('bruno')
    expect(await erro(dados.aceitarConvite(CODIGO_CONVITE_PENDENTE))).toMatchObject({ chave: 'ja_e_membro', mensagemOriginal: 'ja e membro' })
    expect((await erro(dados.aceitarConvite(CODIGO_CONVITE_VENCIDO))).chave).toBe('convite_vencido')
    como('davi', dados)
    expect(await valor(dados.aceitarConvite(CODIGO_CONVITE_PENDENTE))).toBe(EXEMPLO)
  })

  it('reingresso: a mesma linha volta a valer com o papel do novo convite', async () => {
    const dados = como('bruno')
    await valor(dados.sairDaFamilia(EXEMPLO))
    expect(await valor(dados.minhasFamilias())).toEqual([])

    expect(await valor(dados.aceitarConvite(CODIGO_CONVITE_PENDENTE))).toBe(EXEMPLO)
    const [volta] = await valor(dados.minhasFamilias())
    expect(volta).toMatchObject({ id: EXEMPLO, meuPapel: 'observador', meuVinculoId: VINCULO_DO_BRUNO })
  })

  it('revogarConvite: pendente (vencido ou não) vira revogado; depois, convite_nao_pendente', async () => {
    const dados = como('juliana')
    expect(await valor(dados.revogarConvite(CONVITE_PENDENTE))).toBeNull()
    expect(await valor(dados.revogarConvite(CONVITE_VENCIDO))).toBeNull()
    expect(await erro(dados.revogarConvite(CONVITE_PENDENTE))).toMatchObject({ chave: 'convite_nao_pendente', mensagemOriginal: 'convite nao pendente' })
    expect((await valor(dados.detalheFamilia(EXEMPLO))).convites).toEqual([])
  })

  it('revogarConvite: aceito também é convite_nao_pendente; id inexistente e sem visibilidade são P0002; sem ser responsável, 42501', async () => {
    const dados = como('davi')
    await valor(dados.aceitarConvite(CODIGO_CONVITE_PENDENTE))
    expect((await erro(como('juliana', dados).revogarConvite(CONVITE_PENDENTE))).chave).toBe('convite_nao_pendente')

    expect(await erro(dados.revogarConvite(INEXISTENTE))).toMatchObject({ chave: 'nao_encontrado', mensagemOriginal: 'convite inexistente' })
    expect(await erro(como('carla', dados).revogarConvite(CONVITE_VENCIDO))).toMatchObject({ chave: 'nao_encontrado', mensagemOriginal: 'convite inexistente' })
    expect(await erro(como('bruno', dados).revogarConvite(CONVITE_VENCIDO))).toMatchObject({ chave: 'sem_permissao', codigo: '42501' })
  })
})

describe('papéis e saída', () => {
  it('mudarPapel muda o papel do vínculo; papel igual; vínculo inexistente; sem ser responsável', async () => {
    const dados = como('juliana')
    expect(await valor(dados.mudarPapel(VINCULO_DO_BRUNO, 'observador'))).toBeNull()
    expect((await valor(dados.detalheFamilia(EXEMPLO))).membros.find((m) => m.nome === 'Bruno')?.papel).toBe('observador')

    expect(await erro(dados.mudarPapel(VINCULO_DO_BRUNO, 'observador'))).toMatchObject({ chave: 'papel_igual', mensagemOriginal: 'papel igual' })
    expect(await erro(dados.mudarPapel(INEXISTENTE, 'observador'))).toMatchObject({ chave: 'nao_encontrado', mensagemOriginal: 'vinculo inexistente' })
    expect(await erro(como('carla', dados).mudarPapel(VINCULO_DO_BRUNO, 'cuidador'))).toMatchObject({ chave: 'nao_encontrado', mensagemOriginal: 'vinculo inexistente' })
    expect(await erro(como('bruno', dados).mudarPapel(VINCULO_DO_BRUNO, 'cuidador'))).toMatchObject({ chave: 'sem_permissao', codigo: '42501' })
  })

  it('o único responsável não pode se rebaixar nem ser rebaixado: ultimo_responsavel (e papel_igual vem antes)', async () => {
    const dados = como('juliana')
    expect(await erro(dados.mudarPapel(VINCULO_DA_JULIANA, 'cuidador'))).toMatchObject({ chave: 'ultimo_responsavel', mensagemOriginal: 'ultimo responsavel' })
    expect((await erro(dados.mudarPapel(VINCULO_DA_JULIANA, 'responsavel'))).chave).toBe('papel_igual')
  })

  it('com outro responsável, o autorrebaixamento vale: a pessoa perde os controles e os convites que criou', async () => {
    const dados = como('juliana')
    await valor(dados.mudarPapel(VINCULO_DO_BRUNO, 'responsavel'))
    expect(await valor(dados.mudarPapel(VINCULO_DA_JULIANA, 'cuidador'))).toBeNull()

    const rebaixada = await valor(dados.detalheFamilia(EXEMPLO))
    expect(rebaixada.familia.meuPapel).toBe('cuidador')
    expect(rebaixada.convites).toBeNull()
    // Os convites pendentes de quem deixou de ser responsável foram revogados (D5).
    expect((await valor(como('bruno', dados).detalheFamilia(EXEMPLO))).convites).toEqual([])
    // Repetir o autorrebaixamento já gravado: a pessoa já não é responsável.
    expect((await erro(como('juliana', dados).mudarPapel(VINCULO_DA_JULIANA, 'cuidador'))).chave).toBe('sem_permissao')
  })

  it('promover a responsável tira a validade do vínculo', async () => {
    const dados = como('juliana')
    const convite = await valor(dados.criarConvite(EXEMPLO, 'cuidador', new Date(AGORA + 30 * DIA).toISOString()))
    como('davi', dados)
    await valor(dados.aceitarConvite(convite.codigo))
    como('juliana', dados)
    const vinculoDoDavi = (await valor(dados.detalheFamilia(EXEMPLO))).membros.find((m) => m.nome === 'Davi')!
    expect(vinculoDoDavi.validoAte).not.toBeNull()

    await valor(dados.mudarPapel(vinculoDoDavi.vinculoId, 'responsavel'))
    expect((await valor(dados.detalheFamilia(EXEMPLO))).membros.find((m) => m.nome === 'Davi')?.validoAte).toBeNull()
  })

  it('revogarVinculo: o responsável tira o acesso de outro; revogar de novo é vinculo_inativo; o próprio é use_sair', async () => {
    const dados = como('juliana')
    expect(await valor(dados.revogarVinculo(VINCULO_DO_BRUNO))).toBeNull()
    expect((await valor(dados.detalheFamilia(EXEMPLO))).membros.map((m) => m.nome)).toEqual(['Juliana'])
    expect(await valor(como('bruno', dados).minhasFamilias())).toEqual([])

    como('juliana', dados)
    expect(await erro(dados.revogarVinculo(VINCULO_DO_BRUNO))).toMatchObject({ chave: 'vinculo_inativo', mensagemOriginal: 'vinculo inativo' })
    expect((await erro(dados.mudarPapel(VINCULO_DO_BRUNO, 'observador'))).chave).toBe('vinculo_inativo')
    expect(await erro(dados.revogarVinculo(VINCULO_DA_JULIANA))).toMatchObject({ chave: 'use_sair', mensagemOriginal: 'use sair da familia' })
  })

  it('revogarVinculo: vínculo inexistente, sem visibilidade (P0002) e sem ser responsável (42501)', async () => {
    const dados = criar()
    expect(await erro(como('juliana', dados).revogarVinculo(INEXISTENTE))).toMatchObject({ chave: 'nao_encontrado', mensagemOriginal: 'vinculo inexistente' })
    expect((await erro(como('davi', dados).revogarVinculo(VINCULO_DO_BRUNO))).chave).toBe('nao_encontrado')
    expect(await erro(como('bruno', dados).revogarVinculo(VINCULO_DA_JULIANA))).toMatchObject({ chave: 'sem_permissao', codigo: '42501' })
  })

  it('revogar outro responsável vale e revoga os convites pendentes dele', async () => {
    const dados = como('juliana')
    await valor(dados.mudarPapel(VINCULO_DO_BRUNO, 'responsavel'))
    como('bruno', dados)
    const dele = await valor(dados.criarConvite(EXEMPLO, 'observador', null))
    await valor(dados.revogarVinculo(VINCULO_DA_JULIANA))
    expect(await valor(dados.minhasFamilias())).toHaveLength(1)
    expect((await valor(dados.detalheFamilia(EXEMPLO))).convites!.map((c) => c.id)).toContain(dele.id)
    // Juliana, revogada, já não vê a família.
    expect((await erro(como('juliana', dados).detalheFamilia(EXEMPLO))).chave).toBe('nao_encontrado')
  })

  it('sairDaFamilia: qualquer papel sai; o único responsável não (ultimo_responsavel); sem vínculo é P0002', async () => {
    const dados = como('bruno')
    expect(await valor(dados.sairDaFamilia(EXEMPLO))).toBeNull()
    expect((await erro(dados.detalheFamilia(EXEMPLO))).chave).toBe('nao_encontrado')
    expect(await erro(dados.sairDaFamilia(EXEMPLO))).toMatchObject({ chave: 'nao_encontrado', mensagemOriginal: 'familia inexistente' })

    expect(await erro(como('juliana', dados).sairDaFamilia(EXEMPLO))).toMatchObject({ chave: 'ultimo_responsavel' })
    expect((await erro(como('davi', dados).sairDaFamilia(EXEMPLO))).chave).toBe('nao_encontrado')
    expect((await erro(como('davi', dados).sairDaFamilia(INEXISTENTE))).chave).toBe('nao_encontrado')
  })

  it('quem sai perde os convites pendentes que criou', async () => {
    const dados = como('juliana')
    await valor(dados.mudarPapel(VINCULO_DO_BRUNO, 'responsavel'))
    await valor(dados.sairDaFamilia(EXEMPLO))
    expect((await valor(como('bruno', dados).detalheFamilia(EXEMPLO))).convites).toEqual([])
  })

  it('excluirFamilia: o responsável apaga a família e tudo o que é dela', async () => {
    const dados = como('juliana')
    expect(await valor(dados.excluirFamilia(EXEMPLO))).toBeNull()
    expect(await valor(dados.minhasFamilias())).toEqual([])
    expect(await valor(como('bruno', dados).minhasFamilias())).toEqual([])
    expect((await erro(como('davi', dados).verConvite(CODIGO_CONVITE_PENDENTE))).chave).toBe('convite_invalido')
    expect((await erro(como('juliana', dados).arquivarBebe(BEBE_DEMONSTRACAO, true))).mensagemOriginal).toBe('bebe inexistente')
  })

  it('excluirFamilia: sem ser responsável 42501; sem visibilidade P0002', async () => {
    const dados = criar()
    expect(await erro(como('bruno', dados).excluirFamilia(EXEMPLO))).toMatchObject({ chave: 'sem_permissao', codigo: '42501' })
    expect(await erro(como('davi', dados).excluirFamilia(EXEMPLO))).toMatchObject({ chave: 'nao_encontrado', mensagemOriginal: 'familia inexistente' })
    expect((await erro(como('juliana', dados).excluirFamilia(TESTE))).chave).toBe('nao_encontrado')
  })
})

describe('exportação e exclusão da conta', () => {
  const DATA_E_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/

  it('exportarDados do responsável: a forma exata do formato v1, com listas e sem codigo_hash', async () => {
    const json = (await valor(como('juliana').exportarDados())) as Record<string, unknown>
    expect(Object.keys(json)).toEqual(['formato', 'gerado_em', 'conta', 'vinculos', 'familias', 'registros', 'notas'])
    expect(json.formato).toBe('appmaternidade-exportacao-v1')
    expect(json.gerado_em).toMatch(DATA_E_HORA)

    const conta = json.conta as Record<string, unknown>
    expect(Object.keys(conta)).toEqual(['id', 'email', 'nome_privado', 'fuso', 'criada_em'])
    expect(conta).toMatchObject({ id: PESSOAS.juliana.id, email: 'juliana@exemplo.invalid', nome_privado: 'Juliana' })

    const vinculos = json.vinculos as Array<Record<string, unknown>>
    expect(vinculos).toHaveLength(1)
    expect(Object.keys(vinculos[0])).toEqual(['familia_id', 'papel', 'estado', 'valido_ate', 'epoca', 'criado_em', 'encerrado_em'])
    expect(vinculos[0]).toMatchObject({ familia_id: EXEMPLO, papel: 'responsavel', estado: 'ativo', valido_ate: null, epoca: 1, encerrado_em: null })

    const familias = json.familias as Array<Record<string, unknown>>
    expect(familias).toHaveLength(1)
    expect(Object.keys(familias[0])).toEqual(['id', 'nome', 'fuso', 'criada_em', 'membros', 'bebes', 'convites', 'registros', 'notas'])
    // Sem a rotina ligada a esta memória, a família sai com as duas listas vazias (nunca nulas).
    expect(familias[0].registros).toEqual([])
    expect(familias[0].notas).toEqual([])
    expect(json.registros).toEqual([])
    expect(json.notas).toEqual([])
    const membros = familias[0].membros as Array<Record<string, unknown>>
    expect(membros.map((m) => m.nome_privado)).toEqual(['Juliana', 'Bruno'])
    expect(Object.keys(membros[0])).toEqual(['conta_id', 'nome_privado', 'papel', 'valido_ate'])
    const bebes = familias[0].bebes as Array<Record<string, unknown>>
    expect(Object.keys(bebes[0])).toEqual(['id', 'nome', 'nascimento', 'estado', 'criado_em'])
    expect(bebes[0].nascimento).toBe('2026-08-05')
    const convites = familias[0].convites as Array<Record<string, unknown>>
    expect(convites).toHaveLength(2)
    expect(Object.keys(convites[0])).toEqual(['id', 'papel', 'estado', 'vinculo_valido_ate', 'expira_em', 'criado_em', 'aceito_em'])
    expect(convites[0].expira_em).toMatch(DATA_E_HORA)
    expect(JSON.stringify(json)).not.toContain('codigo')
  })

  it('exportarDados de quem não é responsável traz só a conta e os próprios vínculos', async () => {
    const json = (await valor(como('bruno').exportarDados())) as { vinculos: unknown[]; familias: unknown[] }
    expect(json.vinculos).toHaveLength(1)
    expect(json.familias).toEqual([])
    const vazio = (await valor(como('davi').exportarDados())) as { vinculos: unknown[]; familias: unknown[] }
    expect(vazio).toMatchObject({ vinculos: [], familias: [] })
  })

  it('excluirConta sem família: apaga a conta, encerra a sessão e libera o e-mail', async () => {
    const dados = como('davi')
    expect(await valor(dados.excluirConta())).toBeNull()
    expect(await valor(dados.sessaoAtual())).toBeNull()
    expect((await erro(dados.entrar('davi@exemplo.invalid', SENHA_DEMONSTRACAO))).chave).toBe('credenciais')
    expect((await valor(dados.criarUsuario('davi@exemplo.invalid', 'senha-nova', 'Davi', 'x'))).comSessao).toBe(true)
  })

  it('excluirConta do único responsável é ultimo_responsavel e nada muda, em nenhuma família', async () => {
    for (const pessoa of ['juliana', 'carla'] as const) {
      const dados = como(pessoa)
      expect(await erro(dados.excluirConta())).toMatchObject({ chave: 'ultimo_responsavel', mensagemOriginal: 'ultimo responsavel' })
      expect(await valor(dados.minhaConta())).not.toBeNull()
      expect(await valor(dados.minhasFamilias())).toHaveLength(1)
    }
  })

  it('excluirConta do cuidador tira o vínculo e as famílias dele seguem', async () => {
    const dados = como('bruno')
    await valor(dados.excluirConta())
    expect((await valor(como('juliana', dados).detalheFamilia(EXEMPLO))).membros.map((m) => m.nome)).toEqual(['Juliana'])
  })

  it('excluirConta de um responsável com outro responsável: a titularidade passa e os convites dele caem', async () => {
    const dados = como('juliana')
    await valor(dados.mudarPapel(VINCULO_DO_BRUNO, 'responsavel'))
    expect(await valor(dados.excluirConta())).toBeNull()

    const bruno = await valor(como('bruno', dados).detalheFamilia(EXEMPLO))
    expect(bruno.membros.map((m) => m.nome)).toEqual(['Bruno'])
    expect(bruno.convites).toEqual([])
    expect(bruno.bebes).toHaveLength(1)
  })

  it('excluirConta: os convites que a conta criou e ninguém aceitou caem; os aceitos seguem como estão', async () => {
    const dados = como('juliana')
    await valor(dados.mudarPapel(VINCULO_DO_BRUNO, 'responsavel'))
    como('davi', dados)
    await valor(dados.aceitarConvite(CODIGO_CONVITE_PENDENTE))
    await valor(como('juliana', dados).excluirConta())

    const json = (await valor(como('bruno', dados).exportarDados())) as { familias: Array<{ convites: Array<{ estado: string }> }> }
    expect(json.familias[0].convites.map((c) => c.estado).sort()).toEqual(['aceito', 'revogado'])
  })
})

// RF-13: a exportação leva os registros e as notas da rotina. O responsável recebe os da família inteira
// (lixeira inclusive) dentro de `familias[]`; quem não é responsável recebe, no topo, só o que ele mesmo
// criou. O que o responsável criou em família onde ele não é responsável ativo também vai para o topo, e
// nunca se repete o que já está dentro de `familias[]`. Item de outra família nunca aparece.
describe('exportação com a rotina (RF-13)', () => {
  const T1 = '2026-11-05T10:00:00.000Z'
  const T2 = '2026-11-05T11:00:00.000Z'
  const T3 = '2026-11-05T12:00:00.000Z'
  const T4 = '2026-11-05T13:00:00.000Z'
  const micro = (instante: string) => instante.replace('.000Z', '.000000Z')
  const idRotina = (numero: number) => `a0000000-0000-7000-8000-${String(numero).padStart(12, '0')}`
  const BEBE_DA_TESTE = 'bebe0000-0000-4000-8000-0000000000aa'

  const CHAVES_REGISTRO = [
    'id', 'familia_id', 'bebe_id', 'tipo', 'inicio', 'fim', 'detalhes', 'nota', 'origem', 'fuso', 'deslocamento_min',
    'criado_por', 'encerrado_por', 'versao', 'recebido_em', 'atualizado_em', 'excluido_em', 'excluido_por',
  ]
  const CHAVES_NOTA = [
    'id', 'familia_id', 'bebe_id', 'texto', 'destaque_ate', 'criado_por', 'criada_em', 'versao', 'atualizado_em',
    'excluida_em', 'excluida_por',
  ]

  function registro(numero: number, autor: string, recebidoEm: string, resto: Partial<Registro> = {}): Registro {
    return {
      id: idRotina(numero),
      familiaId: ID_FAMILIA,
      bebeId: ID_BEBE,
      tipo: 'fralda',
      inicio: recebidoEm,
      fim: null,
      detalhes: { conteudo: 'xixi' },
      nota: null,
      origem: 'ao_vivo',
      fuso: 'America/Sao_Paulo',
      deslocamentoMin: -180,
      criadoPor: autor,
      encerradoPor: null,
      versao: 1,
      recebidoEm,
      atualizadoEm: recebidoEm,
      excluidoEm: null,
      excluidoPor: null,
      ...resto,
    }
  }

  function nota(numero: number, autor: string, criadaEm: string, resto: Partial<Nota> = {}): Nota {
    return {
      id: idRotina(numero),
      familiaId: ID_FAMILIA,
      bebeId: null,
      texto: `Nota ${numero}`,
      destaqueAte: null,
      criadoPor: autor,
      criadaEm,
      versao: 1,
      atualizadoEm: criadaEm,
      excluidaEm: null,
      excluidaPor: null,
      ...resto,
    }
  }

  const { juliana, bruno, carla } = PESSOAS
  const NA_TESTE = { familiaId: TESTE, bebeId: BEBE_DA_TESTE }

  // Na Família Exemplo, Juliana é responsável e Bruno e Carla são cuidadores; na Família Teste, só Carla tem
  // vínculo (responsável). Cada lista está fora de ordem, de propósito.
  function itens() {
    return {
      registros: [
        // Lixeira: do Bruno, excluído pela Juliana.
        registro(4, bruno.id, T3, { excluidoEm: T4, excluidoPor: juliana.id, versao: 2, atualizadoEm: T4 }),
        registro(3, bruno.id, T2),
        // Empata com o 1 em recebido_em: o id desempata.
        registro(2, carla.id, T1, { tipo: 'observacao', detalhes: {}, nota: 'Dormiu bem' }),
        registro(1, juliana.id, T1),
        // Outra família: o da Carla nunca aparece; o da Juliana e o do Bruno vão para o topo (autoria).
        registro(10, carla.id, T1, NA_TESTE),
        registro(11, juliana.id, T2, NA_TESTE),
        registro(12, bruno.id, T1, NA_TESTE),
      ],
      notas: [
        nota(910, carla.id, T2),
        nota(909, bruno.id, T2),
        // A mais antiga, na lixeira, e com bebê.
        nota(911, bruno.id, T1, { bebeId: ID_BEBE, excluidaEm: T4, excluidaPor: juliana.id, versao: 2, atualizadoEm: T4 }),
        nota(920, carla.id, T1, { familiaId: TESTE }),
        nota(921, juliana.id, T3, { familiaId: TESTE }),
        nota(922, bruno.id, T3, { familiaId: TESTE }),
      ],
    }
  }

  function mundo(sessao: 'juliana' | 'bruno' | 'carla') {
    return criarMundoDeTeste({
      sessao,
      semRegistros: true,
      bebesExtras: [{ id: BEBE_DA_TESTE, familiaId: TESTE, nome: 'Bebê da Teste', nascimento: '2026-08-01', estado: 'ativo' }],
      ajustarRotina: () => itens(),
    }).conta
  }

  type Exportacao = {
    familias: Array<{ registros: Array<Record<string, unknown>>; notas: Array<Record<string, unknown>> }>
    registros: Array<Record<string, unknown>>
    notas: Array<Record<string, unknown>>
  }
  const exportar = async (dados: ReturnType<typeof mundo>) => (await valor(dados.exportarDados())) as Exportacao
  const ids = (lista: Array<Record<string, unknown>>) => lista.map((item) => item.id)

  it('o responsável recebe os registros da família, lixeira inclusive, por recebido_em e depois id', async () => {
    const json = await exportar(mundo('juliana'))

    expect(json.familias).toHaveLength(1)
    const registros = json.familias[0].registros
    expect(ids(registros)).toEqual([idRotina(1), idRotina(2), idRotina(3), idRotina(4)])
    for (const item of registros) expect(Object.keys(item).sort()).toEqual([...CHAVES_REGISTRO].sort())

    expect(registros[3]).toEqual({
      id: idRotina(4),
      familia_id: ID_FAMILIA,
      bebe_id: ID_BEBE,
      tipo: 'fralda',
      inicio: micro(T3),
      fim: null,
      detalhes: { conteudo: 'xixi' },
      nota: null,
      origem: 'ao_vivo',
      fuso: 'America/Sao_Paulo',
      deslocamento_min: -180,
      criado_por: bruno.id,
      encerrado_por: null,
      versao: 2,
      recebido_em: micro(T3),
      atualizado_em: micro(T4),
      excluido_em: micro(T4),
      excluido_por: juliana.id,
    })
    // Os que não estão na lixeira levam excluido_em e excluido_por nulos, e as datas saem no formato do banco.
    expect(registros[0]).toMatchObject({ excluido_em: null, excluido_por: null, recebido_em: micro(T1) })
    expect(registros[1]).toMatchObject({ tipo: 'observacao', nota: 'Dormiu bem', detalhes: {} })
  })

  it('o responsável recebe as notas da família, lixeira inclusive, por criada_em e depois id', async () => {
    const json = await exportar(mundo('juliana'))

    const notas = json.familias[0].notas
    expect(ids(notas)).toEqual([idRotina(911), idRotina(909), idRotina(910)])
    for (const item of notas) expect(Object.keys(item).sort()).toEqual([...CHAVES_NOTA].sort())
    expect(notas[0]).toEqual({
      id: idRotina(911),
      familia_id: ID_FAMILIA,
      bebe_id: ID_BEBE,
      texto: 'Nota 911',
      destaque_ate: null,
      criado_por: bruno.id,
      criada_em: micro(T1),
      versao: 2,
      atualizado_em: micro(T4),
      excluida_em: micro(T4),
      excluida_por: juliana.id,
    })
    expect(notas[1]).toMatchObject({ bebe_id: null, excluida_em: null, excluida_por: null, criada_em: micro(T2) })
  })

  it('o responsável recebe no topo só o que criou em família onde não é responsável, sem repetir o de familias[]', async () => {
    const json = await exportar(mundo('juliana'))

    // O registro 1 e as notas dela na Família Exemplo já estão dentro de familias[]: não se repetem no topo.
    expect(ids(json.registros)).toEqual([idRotina(11)])
    expect(ids(json.notas)).toEqual([idRotina(921)])
    expect(json.registros[0]).toMatchObject({ familia_id: TESTE, bebe_id: BEBE_DA_TESTE, criado_por: juliana.id })
    expect(json.notas[0]).toMatchObject({ familia_id: TESTE, criado_por: juliana.id })
  })

  it('item de outra família nunca aparece para o responsável', async () => {
    const texto = JSON.stringify(await exportar(mundo('juliana')))
    for (const numero of [10, 12, 920, 922]) expect(texto).not.toContain(idRotina(numero))
  })

  it('o cuidador recebe no topo só os itens que criou, lixeira inclusive, e nada da família', async () => {
    const json = await exportar(mundo('bruno'))

    expect(json.familias).toEqual([])
    // recebido_em: 12 (T1, Teste), 3 (T2) e 4 (T3, lixeira).
    expect(ids(json.registros)).toEqual([idRotina(12), idRotina(3), idRotina(4)])
    for (const item of json.registros) expect(Object.keys(item).sort()).toEqual([...CHAVES_REGISTRO].sort())
    expect(json.registros.every((item) => item.criado_por === bruno.id)).toBe(true)
    expect(json.registros[2]).toMatchObject({ excluido_em: micro(T4), excluido_por: juliana.id })

    // criada_em: 911 (T1, lixeira), 909 (T2) e 922 (T3, Teste).
    expect(ids(json.notas)).toEqual([idRotina(911), idRotina(909), idRotina(922)])
    for (const item of json.notas) expect(Object.keys(item).sort()).toEqual([...CHAVES_NOTA].sort())
    expect(json.notas.every((item) => item.criado_por === bruno.id)).toBe(true)

    const texto = JSON.stringify(json)
    for (const numero of [1, 2, 10, 11, 910, 920, 921]) expect(texto).not.toContain(idRotina(numero))
    expect(texto).not.toContain('Dormiu bem')
  })

  it('quem é responsável numa família e cuidador em outra recebe a primeira em familias[] e só o que criou na segunda, no topo', async () => {
    const json = await exportar(mundo('carla'))

    // A Família Teste (Carla responsável) inteira, de todos os autores.
    expect(json.familias).toHaveLength(1)
    expect(ids(json.familias[0].registros)).toEqual([idRotina(10), idRotina(12), idRotina(11)])
    expect(ids(json.familias[0].notas)).toEqual([idRotina(920), idRotina(921), idRotina(922)])
    // Na Família Exemplo (Carla cuidadora): só o dela; o resto da família não vem.
    expect(ids(json.registros)).toEqual([idRotina(2)])
    expect(ids(json.notas)).toEqual([idRotina(910)])
    const texto = JSON.stringify(json)
    for (const numero of [1, 3, 4, 909, 911]) expect(texto).not.toContain(idRotina(numero))
  })

  it('quem não tem vínculo nem criou nada recebe as três listas vazias', async () => {
    const davi = mundo('juliana')
    davi.sessaoParaTeste(PESSOAS.davi.email)
    const vazio = await exportar(davi)
    expect(vazio).toMatchObject({ familias: [], registros: [], notas: [] })
  })

  it('o empate em recebido_em e em criada_em se resolve pelo id, qualquer que seja a ordem de entrada', async () => {
    const dados = criarMundoDeTeste({
      sessao: 'juliana',
      semRegistros: true,
      ajustarRotina: () => ({
        registros: [registro(7, juliana.id, T1), registro(5, bruno.id, T1), registro(6, carla.id, T1)],
        notas: [nota(808, juliana.id, T1), nota(806, bruno.id, T1), nota(807, carla.id, T1)],
      }),
    }).conta
    const json = await exportar(dados)
    expect(ids(json.familias[0].registros)).toEqual([idRotina(5), idRotina(6), idRotina(7)])
    expect(ids(json.familias[0].notas)).toEqual([idRotina(806), idRotina(807), idRotina(808)])
  })

  // Exclusão e exportação (R1-01 e R1-02): o banco apaga em cascata os itens da família excluída e zera a
  // autoria de quem teve a conta excluída; o fim de um vínculo não apaga nada.
  const SEM_FAMILIA_EXEMPLO = [1, 2, 3, 4, 909, 910, 911]

  it('depois de excluirFamilia, nenhum item da família aparece na exportação de ninguém', async () => {
    const dados = mundo('juliana')
    await valor(dados.excluirFamilia(ID_FAMILIA))

    const daJuliana = await exportar(dados)
    expect(daJuliana.familias).toEqual([])
    expect(ids(daJuliana.registros)).toEqual([idRotina(11)])
    expect(ids(daJuliana.notas)).toEqual([idRotina(921)])

    dados.sessaoParaTeste(bruno.email)
    const doBruno = await exportar(dados)
    expect(ids(doBruno.registros)).toEqual([idRotina(12)])
    expect(ids(doBruno.notas)).toEqual([idRotina(922)])

    dados.sessaoParaTeste(carla.email)
    const texto = JSON.stringify(await exportar(dados))
    for (const numero of SEM_FAMILIA_EXEMPLO) expect(texto).not.toContain(idRotina(numero))
  })

  it('depois do excluirConta do cuidador, o responsável recebe os itens da família com a autoria nula', async () => {
    const dados = criarMundoDeTeste({
      sessao: 'bruno',
      semRegistros: true,
      ajustarRotina: () => ({
        registros: [
          registro(21, bruno.id, T1, { encerradoPor: bruno.id }),
          registro(22, juliana.id, T2, { excluidoEm: T3, excluidoPor: bruno.id, versao: 2, atualizadoEm: T3 }),
          registro(23, bruno.id, T3),
        ],
        notas: [
          nota(931, bruno.id, T1),
          nota(932, juliana.id, T2, { excluidaEm: T3, excluidaPor: bruno.id, versao: 2, atualizadoEm: T3 }),
        ],
      }),
    }).conta
    await valor(dados.excluirConta())

    dados.sessaoParaTeste(juliana.email)
    const json = await exportar(dados)
    const [familia] = json.familias
    expect(ids(familia.registros)).toEqual([idRotina(21), idRotina(22), idRotina(23)])
    expect(familia.registros[0]).toMatchObject({ criado_por: null, encerrado_por: null })
    expect(familia.registros[1]).toMatchObject({ criado_por: juliana.id, excluido_por: null })
    expect(familia.registros[2]).toMatchObject({ criado_por: null })
    expect(ids(familia.notas)).toEqual([idRotina(931), idRotina(932)])
    expect(familia.notas[0]).toMatchObject({ criado_por: null })
    expect(familia.notas[1]).toMatchObject({ criado_por: juliana.id, excluida_por: null })
    expect(JSON.stringify(json)).not.toContain(bruno.id)
  })

  it('excluirConta do último membro remove a família e seus itens da exportação', async () => {
    const FAMILIA_DO_BRUNO = 'fa111111-1111-4111-8111-111111111111'
    const base = criarFixtureDeTeste(AGORA)
    const conta = criarDadosContaMemoria(
      {
        ...base,
        familias: [
          ...base.familias,
          { id: FAMILIA_DO_BRUNO, nome: 'Família do Bruno', fuso: 'America/Sao_Paulo', criadaEm: '2026-10-01T00:00:00.000Z', criadaPor: bruno.id },
        ],
        vinculos: [
          ...base.vinculos,
          {
            id: 'b7777777-7777-4777-8777-777777777777',
            familiaId: FAMILIA_DO_BRUNO,
            contaId: bruno.id,
            papel: 'cuidador',
            estado: 'ativo',
            validoAte: null,
            criadoEm: '2026-10-01T00:00:00.000Z',
            concedidoPor: null,
          },
        ],
      },
      { agora: () => AGORA },
    )
    criarDadosRotinaMemoria(conta, {
      registros: [
        registro(31, bruno.id, T1, { familiaId: FAMILIA_DO_BRUNO }),
        registro(32, juliana.id, T2, { familiaId: FAMILIA_DO_BRUNO }),
      ],
      notas: [nota(941, bruno.id, T1, { familiaId: FAMILIA_DO_BRUNO }), nota(942, juliana.id, T2, { familiaId: FAMILIA_DO_BRUNO })],
    })

    conta.sessaoParaTeste(bruno.email)
    await valor(conta.excluirConta())

    conta.sessaoParaTeste(juliana.email)
    const texto = JSON.stringify(await exportar(conta))
    for (const numero of [31, 32, 941, 942]) expect(texto).not.toContain(idRotina(numero))
  })

  it('quem sai da família continua recebendo no topo os itens que criou nela', async () => {
    const dados = mundo('bruno')
    await valor(dados.sairDaFamilia(ID_FAMILIA))

    const json = await exportar(dados)
    expect(json.familias).toEqual([])
    expect(ids(json.registros)).toEqual([idRotina(12), idRotina(3), idRotina(4)])
    expect(ids(json.notas)).toEqual([idRotina(911), idRotina(909), idRotina(922)])
  })

  it('o vínculo revogado não apaga nada: os itens ficam em familias[] do responsável e no topo de quem os criou', async () => {
    const dados = mundo('juliana')
    await valor(dados.revogarVinculo(VINCULO_DO_BRUNO))

    const daJuliana = await exportar(dados)
    expect(ids(daJuliana.familias[0].registros)).toEqual([idRotina(1), idRotina(2), idRotina(3), idRotina(4)])
    expect(ids(daJuliana.familias[0].notas)).toEqual([idRotina(911), idRotina(909), idRotina(910)])

    dados.sessaoParaTeste(bruno.email)
    const doBruno = await exportar(dados)
    expect(doBruno.familias).toEqual([])
    expect(ids(doBruno.registros)).toEqual([idRotina(12), idRotina(3), idRotina(4)])
    expect(ids(doBruno.notas)).toEqual([idRotina(911), idRotina(909), idRotina(922)])
  })
})

describe('sem sessão e conta incompleta', () => {
  it('toda operação que usa a conta devolve sessao_encerrada sem sessão', async () => {
    const dados = criar()
    const chamadas: Array<Promise<Resultado<unknown>>> = [
      dados.minhaConta(),
      dados.minhasFamilias(),
      dados.detalheFamilia(EXEMPLO),
      dados.criarFamilia('X', 'UTC'),
      dados.atualizarFamilia(EXEMPLO, 'X', 'UTC'),
      dados.cadastrarBebe(EXEMPLO, 'X', '2026-01-01'),
      dados.atualizarBebe(BEBE_DEMONSTRACAO, 'X', '2026-01-01'),
      dados.arquivarBebe(BEBE_DEMONSTRACAO, true),
      dados.criarConvite(EXEMPLO, 'observador', null),
      dados.verConvite(CODIGO_CONVITE_PENDENTE),
      dados.aceitarConvite(CODIGO_CONVITE_PENDENTE),
      dados.revogarConvite(CONVITE_PENDENTE),
      dados.mudarPapel(VINCULO_DO_BRUNO, 'observador'),
      dados.revogarVinculo(VINCULO_DO_BRUNO),
      dados.sairDaFamilia(EXEMPLO),
      dados.excluirFamilia(EXEMPLO),
      dados.exportarDados(),
      dados.excluirConta(),
    ]
    for (const chamada of chamadas) expect((await erro(chamada)).classe).toBe('sessao_encerrada')
  })

  it('conta incompleta chamando uma operação de família recebe P0001 conta inexistente', async () => {
    const dados = await pessoaNova(criar())
    const chamadas: Array<Promise<Resultado<unknown>>> = [
      dados.criarFamilia('X', 'UTC'),
      dados.atualizarFamilia(EXEMPLO, 'X', 'UTC'),
      dados.cadastrarBebe(EXEMPLO, 'X', '2026-01-01'),
      dados.atualizarBebe(BEBE_DEMONSTRACAO, 'X', '2026-01-01'),
      dados.arquivarBebe(BEBE_DEMONSTRACAO, true),
      dados.criarConvite(EXEMPLO, 'observador', null),
      dados.verConvite(CODIGO_CONVITE_PENDENTE),
      dados.aceitarConvite(CODIGO_CONVITE_PENDENTE),
      dados.revogarConvite(CONVITE_PENDENTE),
      dados.mudarPapel(VINCULO_DO_BRUNO, 'observador'),
      dados.revogarVinculo(VINCULO_DO_BRUNO),
      dados.sairDaFamilia(EXEMPLO),
      dados.excluirFamilia(EXEMPLO),
      dados.exportarDados(),
      dados.excluirConta(),
    ]
    for (const chamada of chamadas) {
      expect(await erro(chamada)).toMatchObject({ chave: 'conta_inexistente', codigo: 'P0001', mensagemOriginal: 'conta inexistente' })
    }
  })
})

describe('simularFalha', () => {
  it('a próxima chamada da operação devolve o erro pedido, uma vez só, sem mudar nada', async () => {
    const dados = como('juliana')
    simularFalha(dados, 'criarFamilia', 'rede')

    expect(await erro(dados.criarFamilia('Outra', 'UTC'))).toMatchObject({ chave: 'rede', classe: 'rede' })
    expect(await valor(dados.minhasFamilias())).toHaveLength(1)
    await valor(dados.criarFamilia('Outra', 'UTC'))
    expect(await valor(dados.minhasFamilias())).toHaveLength(2)
  })

  it('aceita qualquer linha do catálogo, uma classe pronta e as operações sem dados (sessaoAtual e sair)', async () => {
    const dados = como('juliana')
    simularFalha(dados, 'sessaoAtual', 'sessao_encerrada')
    simularFalha(dados, 'sair', 'tente_de_novo')
    simularFalha(dados, 'minhaConta', 'nao_encontrado')
    simularFalha(dados, 'entrar', 'credenciais')
    simularFalha(dados, 'exportarDados', { classe: 'sem_permissao', chave: 'sem_permissao', codigo: '42501', mensagemOriginal: 'sem permissao' })

    expect((await erro(dados.sessaoAtual())).classe).toBe('sessao_encerrada')
    expect((await erro(dados.sair())).classe).toBe('tente_de_novo')
    expect((await erro(dados.minhaConta())).classe).toBe('nao_encontrado')
    expect((await erro(dados.entrar('juliana@exemplo.invalid', SENHA_DEMONSTRACAO))).chave).toBe('credenciais')
    expect((await erro(dados.exportarDados())).classe).toBe('sem_permissao')
    // A sessão continua: nenhuma falha simulada mudou nada.
    expect((await valor(dados.sessaoAtual()))?.id).toBe(PESSOAS.juliana.id)
  })

  it('várias falhas na mesma operação saem na ordem pedida', async () => {
    const dados = como('juliana')
    simularFalha(dados, 'minhasFamilias', 'rede')
    simularFalha(dados, 'minhasFamilias', 'tente_de_novo')
    expect((await erro(dados.minhasFamilias())).chave).toBe('rede')
    expect((await erro(dados.minhasFamilias())).chave).toBe('tente_de_novo')
    expect(await valor(dados.minhasFamilias())).toHaveLength(1)
  })

  it('só vale para a memória', () => {
    expect(() => simularFalha({} as DadosConta, 'entrar', 'rede')).toThrow()
    expect(() => simularRespostaPerdida({} as DadosConta, 'entrar')).toThrow()
  })
})

describe('simularRespostaPerdida e a repetição (RF-17)', () => {
  it('a mudança é aplicada e a resposta volta como rede', async () => {
    const dados = como('juliana')
    simularRespostaPerdida(dados, 'criarFamilia')
    expect(await erro(dados.criarFamilia('Outra', 'UTC'))).toMatchObject({ chave: 'rede', classe: 'rede' })
    expect(await valor(dados.minhasFamilias())).toHaveLength(2)
    // Só a chamada marcada se perde.
    await valor(dados.criarFamilia('Mais uma', 'UTC'))
    expect(await valor(dados.minhasFamilias())).toHaveLength(3)
  })

  it('se a operação falha de verdade, ela devolve o próprio erro', async () => {
    const dados = como('juliana')
    simularRespostaPerdida(dados, 'criarFamilia')
    expect((await erro(dados.criarFamilia('   ', 'UTC'))).chave).toBe('nome_vazio')
  })

  it('aceitar convite e repetir: convite_usado', async () => {
    const dados = como('davi')
    simularRespostaPerdida(dados, 'aceitarConvite')
    expect((await erro(dados.aceitarConvite(CODIGO_CONVITE_PENDENTE))).chave).toBe('rede')
    expect((await erro(dados.aceitarConvite(CODIGO_CONVITE_PENDENTE))).chave).toBe('convite_usado')
    expect(await valor(dados.minhasFamilias())).toHaveLength(1)
  })

  it('autorrebaixamento já gravado: a repetição recebe 42501, porque a pessoa já não é responsável', async () => {
    const dados = como('juliana')
    await valor(dados.mudarPapel(VINCULO_DO_BRUNO, 'responsavel'))
    simularRespostaPerdida(dados, 'mudarPapel')
    expect((await erro(dados.mudarPapel(VINCULO_DA_JULIANA, 'cuidador'))).chave).toBe('rede')
    expect(await erro(dados.mudarPapel(VINCULO_DA_JULIANA, 'cuidador'))).toMatchObject({ chave: 'sem_permissao', codigo: '42501' })
  })

  it('trocar a senha e repetir: same_password', async () => {
    const dados = como('juliana')
    simularRespostaPerdida(dados, 'trocarSenha')
    expect((await erro(dados.trocarSenha('senha-nova'))).chave).toBe('rede')
    expect((await erro(dados.trocarSenha('senha-nova'))).chave).toBe('senha_igual')
  })

  it('criar a própria conta e repetir: 23505, e a conta existe', async () => {
    const dados = await pessoaNova(criar())
    simularRespostaPerdida(dados, 'criarMinhaConta')
    expect((await erro(dados.criarMinhaConta('Nova', 'UTC'))).chave).toBe('rede')
    expect(await erro(dados.criarMinhaConta('Nova', 'UTC'))).toMatchObject({ chave: 'desconhecido', codigo: '23505' })
    expect(await valor(dados.minhaConta())).toMatchObject({ nome: 'Nova' })
  })

  it('excluir a conta e repetir: sessao_encerrada, porque a conta já não existe', async () => {
    const dados = como('davi')
    simularRespostaPerdida(dados, 'excluirConta')
    expect((await erro(dados.excluirConta())).chave).toBe('rede')
    expect((await erro(dados.excluirConta())).classe).toBe('sessao_encerrada')
  })

  it('revogar o vínculo e o convite e repetir: a releitura mostra que já foi', async () => {
    const dados = como('juliana')
    simularRespostaPerdida(dados, 'revogarVinculo')
    simularRespostaPerdida(dados, 'revogarConvite')
    expect((await erro(dados.revogarVinculo(VINCULO_DO_BRUNO))).chave).toBe('rede')
    expect((await erro(dados.revogarVinculo(VINCULO_DO_BRUNO))).chave).toBe('vinculo_inativo')
    expect((await erro(dados.revogarConvite(CONVITE_PENDENTE))).chave).toBe('rede')
    expect((await erro(dados.revogarConvite(CONVITE_PENDENTE))).chave).toBe('convite_nao_pendente')
    const detalhe = await valor(dados.detalheFamilia(EXEMPLO))
    expect(detalhe.membros.map((m) => m.nome)).toEqual(['Juliana'])
    expect(detalhe.convites!.map((c) => c.id)).toEqual([CONVITE_VENCIDO])
  })
})
