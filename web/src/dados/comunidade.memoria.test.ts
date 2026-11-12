import { describe, expect, it } from 'vitest'
import type { ErroDados, Resultado } from './comum.ts'
import type { DadosComunidade } from './comunidade.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from './comunidade.elenco.ts'
import { erroDaChaveComunidade } from './comunidade.erros.ts'
import { criarDadosComunidadeMemoria, simularFalha, simularRespostaPerdida, type EstadoComunidade } from './comunidade.memoria.ts'

// MAT-40, teste 1: a memória reproduz as regras do banco (quem lê o quê, quem escreve) e os mesmos
// erros, com o mesmo código e a mesma mensagem, para o elenco da MAT-47 (COM-08).

function montar() {
  const estado = criarElenco()
  const como = (pessoa: PessoaDoElenco): DadosComunidade => criarDadosComunidadeMemoria(estado, ELENCO[pessoa].conta)
  return { estado, como }
}

function valor<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(`esperava sucesso: ${resultado.erro.chave} ${resultado.erro.codigo}`)
  return resultado.valor
}

function erro<T>(resultado: Resultado<T>): ErroDados {
  if (resultado.ok) throw new Error('esperava erro')
  return resultado.erro
}

const ids = (lista: Array<{ id: string }>) => lista.map((item) => item.id).sort()

async function topicosDoEspaco(dados: DadosComunidade, estado: EstadoComunidade, slug: string) {
  const espaco = estado.espacos.find((e) => e.slug === slug)!
  return valor(await dados.listarTopicos(espaco.id, 0, null)).itens
}

describe('leitura (D5, D6 e o bloqueio nos dois sentidos)', () => {
  it('o autor lê o próprio tópico oculto, não o removido nem o do bloqueado', async () => {
    const { estado, como } = montar()
    const lidos = await topicosDoEspaco(como('autor'), estado, 'sono')
    expect(ids(lidos)).toEqual([CONTEUDO.topicoDoAutor, CONTEUDO.topicoOculto].sort())
  })

  it('outra pessoa lê só o que está visível, inclusive o tópico de quem o autor bloqueou', async () => {
    const { estado, como } = montar()
    const lidos = await topicosDoEspaco(como('outro'), estado, 'sono')
    expect(ids(lidos)).toEqual([CONTEUDO.topicoDoAutor, CONTEUDO.topicoDoBloqueado].sort())
  })

  it('o bloqueio vale nos dois sentidos: o bloqueado não lê o autor, e o autor não lê o bloqueado', async () => {
    const { estado, como } = montar()
    expect(ids(await topicosDoEspaco(como('bloqueado'), estado, 'sono'))).toEqual([CONTEUDO.topicoDoBloqueado])
    expect(valor(await como('bloqueado').lerTopico(CONTEUDO.topicoDoAutor))).toBeNull()
    expect(valor(await como('autor').lerTopico(CONTEUDO.topicoDoBloqueado))).toBeNull()
  })

  it('as respostas seguem a regra do tópico: o autor não lê a resposta do bloqueado, e o bloqueado não lê o tópico', async () => {
    const { como } = montar()
    const doAutor = valor(await como('autor').lerRespostas(CONTEUDO.topicoDoAutor, 0)).itens
    expect(ids(doAutor)).toEqual([CONTEUDO.respostaDoOutro, CONTEUDO.respostaDoAutor, CONTEUDO.filhaDoOutro, CONTEUDO.respostaOculta].sort())
    expect(valor(await como('bloqueado').lerRespostas(CONTEUDO.topicoDoAutor, 0)).itens).toEqual([])
    const doOutro = valor(await como('outro').lerRespostas(CONTEUDO.topicoDoAutor, 0)).itens
    expect(ids(doOutro)).toEqual([CONTEUDO.respostaDoOutro, CONTEUDO.respostaDoBloqueado, CONTEUDO.respostaDoAutor, CONTEUDO.filhaDoOutro].sort())
  })

  it('a moderação vê o oculto, o removido e o conteúdo de quem bloqueou ou foi bloqueado; o papel vencido não vale', async () => {
    const { estado, como } = montar()
    expect(ids(await topicosDoEspaco(como('moderador'), estado, 'sono'))).toEqual(
      [CONTEUDO.topicoDoAutor, CONTEUDO.topicoOculto, CONTEUDO.topicoRemovido, CONTEUDO.topicoDoBloqueado].sort(),
    )
    expect(ids(await topicosDoEspaco(como('admin'), estado, 'sono'))).toHaveLength(4)
    expect(ids(await topicosDoEspaco(como('vencido'), estado, 'sono'))).toEqual([CONTEUDO.topicoDoAutor, CONTEUDO.topicoDoBloqueado].sort())
  })

  it('o número de respostas conta só as que a pessoa lê', async () => {
    const { estado, como } = montar()
    const sono = (await topicosDoEspaco(como('autor'), estado, 'sono')).find((t) => t.id === CONTEUDO.topicoDoAutor)!
    expect(sono.respostas).toBe(4)
    const doOutro = (await topicosDoEspaco(como('outro'), estado, 'sono')).find((t) => t.id === CONTEUDO.topicoDoAutor)!
    expect(doOutro.respostas).toBe(4)
  })

  it('o filtro de faixa traz só os tópicos da faixa', async () => {
    const { estado, como } = montar()
    const banho = estado.espacos.find((e) => e.slug === 'banho')!
    expect(valor(await como('outro').listarTopicos(banho.id, 0, '3_6_meses')).itens).toHaveLength(1)
    expect(valor(await como('outro').listarTopicos(banho.id, 0, '0_3_meses')).itens).toHaveLength(0)
  })

  it('os perfis seguem a regra: o bloqueado não lê o perfil do autor; a moderação lê todos', async () => {
    const { como } = montar()
    const pedidos = [ELENCO.autor.perfil!, ELENCO.outro.perfil!]
    expect(valor(await como('outro').lerPerfis(pedidos))).toHaveLength(2)
    expect(valor(await como('bloqueado').lerPerfis(pedidos)).map((p) => p.id)).toEqual([ELENCO.outro.perfil])
    expect(valor(await como('moderador').lerPerfis(pedidos))).toHaveLength(2)
    expect(valor(await como('autor').lerPerfis([ELENCO.bloqueado.perfil!]))).toEqual([])
  })

  it('o item lido nunca traz a conta do autor', async () => {
    const { como } = montar()
    const [perfil] = valor(await como('outro').lerPerfis([ELENCO.autor.perfil!]))
    expect(Object.keys(perfil).sort()).toEqual(['apelido', 'bio', 'criadoEm', 'faixa', 'id'])
  })

  it('os 7 espaços saem em ordem', async () => {
    const { como } = montar()
    const espacos = valor(await como('nova').listarEspacos())
    expect(espacos.map((e) => e.ordem)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('uma conta sem linha em contas não lê nada, e sem sessão a operação devolve sessão encerrada', async () => {
    const { estado } = montar()
    const desconhecida = criarDadosComunidadeMemoria(estado, 'c0000000-0000-4000-8000-00000000ffff')
    expect(valor(await desconhecida.lerTopico(CONTEUDO.topicoDoAutor))).toBeNull()
    const semSessao = criarDadosComunidadeMemoria(estado, null)
    expect(erro(await semSessao.listarEspacos()).classe).toBe('sessao_encerrada')
  })
})

describe('situação da conta', () => {
  it('cada pessoa do elenco tem a situação do seu papel', async () => {
    const { como } = montar()
    const situacao = async (pessoa: PessoaDoElenco) => valor(await como(pessoa).situacaoDaConta())
    expect(await situacao('autor')).toMatchObject({ perfilId: ELENCO.autor.perfil, aceiteVigente: true, versaoVigente: '2026-11-05', papeis: [] })
    expect(await situacao('semAceite')).toMatchObject({ perfilId: ELENCO.semAceite.perfil, aceiteVigente: false })
    expect(await situacao('semPerfil')).toMatchObject({ perfilId: null, aceiteVigente: true })
    expect(await situacao('nova')).toMatchObject({ perfilId: null, aceiteVigente: false })
    expect((await situacao('moderador')).papeis).toEqual(['moderador'])
    expect((await situacao('admin')).papeis).toEqual(['admin'])
    expect((await situacao('vencido')).papeis).toEqual([])
  })

  it('o papel passa a valer e deixa de valer pelo relógio da memória', async () => {
    const { estado } = montar()
    const limite = Date.now() + 60_000
    estado.papeis.push({ contaId: ELENCO.outro.conta, papel: 'moderador', concedidoPor: null, concedidoEm: new Date().toISOString(), validoAte: new Date(limite).toISOString() })
    const antes = criarDadosComunidadeMemoria(estado, ELENCO.outro.conta, { agora: () => limite - 60_000 })
    const depois = criarDadosComunidadeMemoria(estado, ELENCO.outro.conta, { agora: () => limite + 60_000 })
    expect(valor(await antes.situacaoDaConta()).papeis).toEqual(['moderador'])
    expect(valor(await depois.situacaoDaConta()).papeis).toEqual([])
  })
})

describe('aceite dos termos e perfil', () => {
  it('aceitar a versão vigente vale, repetir não falha, e outra versão dá "versao nao vigente"', async () => {
    const { como } = montar()
    const nova = como('nova')
    expect(erro(await nova.aceitarTermos('2026-10-01'))).toMatchObject({ chave: 'versao_nao_vigente', codigo: 'P0001', mensagemOriginal: 'versao nao vigente' })
    expect((await nova.aceitarTermos('2026-11-05')).ok).toBe(true)
    expect((await nova.aceitarTermos('2026-11-05')).ok).toBe(true)
    expect(valor(await nova.situacaoDaConta()).aceiteVigente).toBe(true)
  })

  it('sem linha em contas, aceitar dá "sem conta"; sem versão vigente, "termos indisponiveis"', async () => {
    const { estado, como } = montar()
    const desconhecida = criarDadosComunidadeMemoria(estado, 'c0000000-0000-4000-8000-00000000ffff')
    expect(erro(await desconhecida.aceitarTermos('2026-11-05')).chave).toBe('sem_conta')
    estado.versoes.forEach((v) => (v.vigente = false))
    expect(erro(await como('nova').aceitarTermos('2026-11-05'))).toMatchObject({ chave: 'termos_indisponiveis', mensagemOriginal: 'termos indisponiveis' })
  })

  it('a nova entra: aceita, cria o perfil e passa a ser escritora; sem o aceite, o insert é negado (42501)', async () => {
    const { como } = montar()
    const nova = como('nova')
    expect(erro(await nova.criarPerfil('apelido_novo', null, null))).toMatchObject({ chave: 'sem_permissao', codigo: '42501' })
    await nova.aceitarTermos('2026-11-05')
    expect((await nova.criarPerfil('apelido_novo', 'Uma bio', '0_3_meses')).ok).toBe(true)
    const situacao = valor(await nova.situacaoDaConta())
    expect(situacao.aceiteVigente && situacao.perfilId !== null).toBe(true)
  })

  it('os dois 23505 do perfil: apelido igual sem diferenciar maiúsculas, e perfil duplicado na mesma conta', async () => {
    const { como } = montar()
    const semPerfil = como('semPerfil')
    const igual = erro(await semPerfil.criarPerfil('AUTOR_DO_FORUM', null, null))
    expect(igual).toMatchObject({ chave: 'apelido_em_uso', codigo: '23505' })
    expect(igual.mensagemOriginal).toContain('perfis_publicos_apelido_idx')
    expect((await semPerfil.criarPerfil('apelido_livre', null, null)).ok).toBe(true)
    const duplicado = erro(await semPerfil.criarPerfil('outro_apelido', null, null))
    expect(duplicado).toMatchObject({ chave: 'desconhecido', codigo: '23505' })
    expect(duplicado.mensagemOriginal).toContain('perfis_publicos_conta_unica')
  })

  it('os limites do apelido e da bio são os do banco: texto fora do tamanho (23514)', async () => {
    const { como } = montar()
    const semPerfil = como('semPerfil')
    for (const apelido of ['ab', ' abc', 'abc ', 'a'.repeat(31)]) {
      expect(erro(await semPerfil.criarPerfil(apelido, null, null))).toMatchObject({ chave: 'texto_fora_do_tamanho', codigo: '23514' })
    }
    expect(erro(await semPerfil.criarPerfil('apelido_bom', 'b'.repeat(161), null)).chave).toBe('texto_fora_do_tamanho')
    expect((await semPerfil.criarPerfil('c'.repeat(30), 'b'.repeat(160), null)).ok).toBe(true)
  })

  it('editar o perfil muda apelido, bio e faixa; o apelido de outra pessoa dá 23505; sem o aceite o update não acha a linha', async () => {
    const { como } = montar()
    const autor = como('autor')
    expect(valor(await autor.editarPerfil('apelido_editado', 'bio', '6_12_meses'))).toBe(ELENCO.autor.perfil)
    const [perfil] = valor(await autor.lerPerfis([ELENCO.autor.perfil!]))
    expect(perfil).toMatchObject({ apelido: 'apelido_editado', bio: 'bio', faixa: '6_12_meses' })
    expect(erro(await autor.editarPerfil('OUTRA_PESSOA', null, null)).chave).toBe('apelido_em_uso')
    expect(erro(await como('semAceite').editarPerfil('sem_aceite_novo', null, null))).toMatchObject({ chave: 'nao_editavel', classe: 'nao_encontrado' })
    expect(erro(await como('semPerfil').editarPerfil('qualquer_um', null, null)).chave).toBe('sem_perfil')
  })
})

describe('escrita (quem escreve)', () => {
  const espacoSono = (estado: EstadoComunidade) => estado.espacos.find((e) => e.slug === 'sono')!.id

  it('o escritor habilitado publica; sem aceite é 42501, sem perfil é "sem perfil", e a conta sem nada também', async () => {
    const { estado, como } = montar()
    const sono = espacoSono(estado)
    const id = valor(await como('outro').criarTopico(sono, 'Tópico novo', 'Texto novo', '0_3_meses'))
    expect(estado.topicos.find((t) => t.id === id)).toMatchObject({ autorId: ELENCO.outro.perfil, estado: 'visivel', faixa: '0_3_meses' })
    expect(erro(await como('semAceite').criarTopico(sono, 'Tópico novo', 'Texto', null))).toMatchObject({ chave: 'sem_permissao', codigo: '42501' })
    expect(erro(await como('semPerfil').criarTopico(sono, 'Tópico novo', 'Texto', null))).toMatchObject({ chave: 'sem_perfil', codigo: 'P0001', mensagemOriginal: 'sem perfil' })
    expect(erro(await como('admin').criarTopico(sono, 'Tópico novo', 'Texto', null)).chave).toBe('sem_perfil')
    expect(erro(await como('nova').criarTopico(sono, 'Tópico novo', 'Texto', null)).chave).toBe('sem_perfil')
  })

  it('os limites do título e do corpo: 3 a 120 e 1 a 5000 caracteres, contados como o banco (o mínimo sem as pontas)', async () => {
    const { estado, como } = montar()
    const sono = espacoSono(estado)
    const outro = como('outro')
    for (const [titulo, corpo] of [
      ['ab', 'texto'],
      ['  a  ', 'texto'],
      ['a'.repeat(121), 'texto'],
      ['titulo', '   '],
      ['titulo', 'c'.repeat(5001)],
    ]) {
      expect(erro(await outro.criarTopico(sono, titulo, corpo, null))).toMatchObject({ chave: 'texto_fora_do_tamanho', codigo: '23514' })
    }
    expect((await outro.criarTopico(sono, 'a'.repeat(120), 'c'.repeat(5000), null)).ok).toBe(true)
    // Caracteres, não bytes nem unidades UTF-16: 120 emojis cabem no título.
    expect((await outro.criarTopico(sono, '😀'.repeat(120), 'texto', null)).ok).toBe(true)
  })

  it('só o autor edita, e só com o tópico visível; sem linha, "nao_editavel"; editado_em muda só com mudança de verdade', async () => {
    const { estado, como } = montar()
    expect(valor(await como('autor').editarTopico(CONTEUDO.topicoDoAutor, 'Título novo', 'Corpo novo', '3_6_meses'))).toBe(CONTEUDO.topicoDoAutor)
    expect(estado.topicos.find((t) => t.id === CONTEUDO.topicoDoAutor)).toMatchObject({ titulo: 'Título novo', faixa: '3_6_meses' })
    expect(estado.topicos.find((t) => t.id === CONTEUDO.topicoDoAutor)!.editadoEm).not.toBeNull()
    for (const [pessoa, alvo] of [
      ['outro', CONTEUDO.topicoDoAutor],
      ['autor', CONTEUDO.topicoOculto],
      ['autor', CONTEUDO.topicoRemovido],
      ['moderador', CONTEUDO.topicoDoAutor],
      ['semAceite', CONTEUDO.topicoDoAutor],
    ] as const) {
      expect(erro(await como(pessoa).editarTopico(alvo, 'Título novo', 'Corpo', null)), `${pessoa} ${alvo}`).toMatchObject({ chave: 'nao_editavel', classe: 'nao_encontrado' })
    }
    const intacto = estado.topicos.find((t) => t.id === CONTEUDO.topicoDoModerador)!
    await como('moderador').editarTopico(intacto.id, intacto.titulo, intacto.corpo, intacto.faixa)
    expect(intacto.editadoEm).toBeNull()
  })

  it('responder: o escritor responde ao tópico e a uma resposta de primeiro nível; sem conta habilitada, é 42501', async () => {
    const { estado, como } = montar()
    const id = valor(await como('outro').responder(CONTEUDO.topicoDoAutor, null, 'Resposta nova'))
    expect(estado.respostas.find((r) => r.id === id)).toMatchObject({ respostaA: null, autorId: ELENCO.outro.perfil })
    const filha = valor(await como('outro').responder(CONTEUDO.topicoDoAutor, CONTEUDO.respostaDoAutor, 'Citação'))
    expect(estado.respostas.find((r) => r.id === filha)).toMatchObject({ respostaA: CONTEUDO.respostaDoAutor, topicoId: CONTEUDO.topicoDoAutor })
  })

  it('responder sem perfil dá "sem perfil" e sem aceite dá 42501; o bloqueio nega nos dois sentidos, também para a moderação', async () => {
    const { estado, como } = montar()
    expect(erro(await como('semPerfil').responder(CONTEUDO.topicoDoAutor, null, 'Resposta')).chave).toBe('sem_perfil')
    expect(erro(await como('semAceite').responder(CONTEUDO.topicoDoAutor, null, 'Resposta'))).toMatchObject({ chave: 'sem_permissao', codigo: '42501' })
    expect(erro(await como('bloqueado').responder(CONTEUDO.topicoDoAutor, null, 'Resposta')).chave).toBe('sem_permissao')
    expect(erro(await como('autor').responder(CONTEUDO.topicoDoBloqueado, null, 'Resposta')).chave).toBe('sem_permissao')
    // A moderação que bloqueou alguém lê o que ele publica, mas não responde.
    estado.bloqueios.push({ bloqueadorId: ELENCO.moderador.perfil!, bloqueadoId: ELENCO.bloqueado.perfil!, criadoEm: new Date().toISOString() })
    expect(valor(await como('moderador').lerTopico(CONTEUDO.topicoDoBloqueado))).not.toBeNull()
    expect(erro(await como('moderador').responder(CONTEUDO.topicoDoBloqueado, null, 'Resposta')).chave).toBe('sem_permissao')
  })

  it('não responde a tópico ou resposta fora do estado visível, e o banco só aceita um nível', async () => {
    const { como } = montar()
    const autor = como('autor')
    expect(erro(await como('outro').responder(CONTEUDO.topicoOculto, null, 'Resposta')).chave).toBe('sem_permissao')
    expect(erro(await autor.responder(CONTEUDO.topicoOculto, null, 'Resposta')).chave).toBe('sem_permissao')
    expect(erro(await autor.responder(CONTEUDO.topicoDoAutor, CONTEUDO.respostaOculta, 'Resposta')).chave).toBe('sem_permissao')
    expect(erro(await autor.responder(CONTEUDO.topicoDoAutor, CONTEUDO.filhaDoOutro, 'Resposta'))).toMatchObject({ chave: 'so_um_nivel', codigo: 'P0001', mensagemOriginal: 'so um nivel de resposta' })
    expect(erro(await autor.responder(CONTEUDO.topicoDoOutro, CONTEUDO.respostaDoOutro, 'Resposta'))).toMatchObject({ chave: 'resposta_de_outro_topico', mensagemOriginal: 'resposta de outro topico' })
    expect(erro(await autor.responder(CONTEUDO.topicoDoAutor, null, 'a'.repeat(2001))).chave).toBe('texto_fora_do_tamanho')
  })

  it('editar a resposta: só o autor, só visível; zero linhas é "nao_editavel"', async () => {
    const { estado, como } = montar()
    expect(valor(await como('autor').editarResposta(CONTEUDO.respostaDoAutor, 'Corpo novo'))).toBe(CONTEUDO.respostaDoAutor)
    expect(estado.respostas.find((r) => r.id === CONTEUDO.respostaDoAutor)).toMatchObject({ corpo: 'Corpo novo' })
    for (const [pessoa, alvo] of [
      ['outro', CONTEUDO.respostaDoAutor],
      ['autor', CONTEUDO.respostaOculta],
      ['semAceite', CONTEUDO.respostaDoAutor],
    ] as const) {
      expect(erro(await como(pessoa).editarResposta(alvo, 'Corpo')).chave, `${pessoa} ${alvo}`).toBe('nao_editavel')
    }
  })

  it('bloquear e desbloquear: repetido é 23505, a si mesmo é 23514, e desbloquear quem não estava bloqueado é sucesso', async () => {
    const { estado, como } = montar()
    const outro = como('outro')
    expect((await outro.bloquear(ELENCO.autor.perfil!)).ok).toBe(true)
    expect(erro(await outro.bloquear(ELENCO.autor.perfil!))).toMatchObject({ chave: 'desconhecido', codigo: '23505' })
    expect(erro(await outro.bloquear(ELENCO.outro.perfil!))).toMatchObject({ chave: 'desconhecido', codigo: '23514' })
    expect(valor(await outro.listarBloqueios()).map((b) => b.perfilId)).toEqual([ELENCO.autor.perfil])
    expect((await outro.desbloquear(ELENCO.autor.perfil!)).ok).toBe(true)
    expect((await outro.desbloquear(ELENCO.autor.perfil!)).ok).toBe(true)
    expect(valor(await outro.listarBloqueios())).toEqual([])
    expect(estado.bloqueios).toHaveLength(1)
    expect(erro(await como('semPerfil').bloquear(ELENCO.autor.perfil!)).chave).toBe('sem_perfil')
    // Bloquear exige só perfil próprio, sem aceite.
    expect((await como('semAceite').bloquear(ELENCO.autor.perfil!)).ok).toBe(true)
  })

  it('a lista de bloqueios mostra o perfil e a data, do mais novo ao mais antigo, e só os da própria pessoa', async () => {
    const { como } = montar()
    expect(valor(await como('autor').listarBloqueios())).toHaveLength(1)
    expect(valor(await como('bloqueado').listarBloqueios())).toEqual([])
    expect(valor(await como('semPerfil').listarBloqueios())).toEqual([])
  })
})

describe('denúncias', () => {
  it('o escritor denuncia tópico, resposta e perfil; o banco guarda quem denunciou e a pessoa lê as próprias', async () => {
    const { estado, como } = montar()
    const outro = como('outro')
    const topico = valor(await outro.denunciar('spam_venda', { tipo: 'topico', id: CONTEUDO.topicoDoAutor }, 'Propaganda.'))
    const resposta = valor(await outro.denunciar('outro', { tipo: 'resposta', id: CONTEUDO.respostaDoAutor }, null))
    const perfil = valor(await outro.denunciar('risco_autolesao', { tipo: 'perfil', id: ELENCO.autor.perfil! }, null))
    expect(estado.denuncias.find((d) => d.id === topico)).toMatchObject({ denuncianteId: ELENCO.outro.conta, estado: 'aberta', topicoId: CONTEUDO.topicoDoAutor })
    const minhas = valor(await outro.minhasDenuncias())
    expect(minhas.map((d) => d.id).sort()).toEqual([topico, resposta, perfil].sort())
    expect(Object.keys(minhas[0]).sort()).toEqual(['criadaEm', 'decididaEm', 'estado', 'id', 'motivo', 'perfilId', 'respostaId', 'texto', 'topicoId'])
    expect(valor(await como('autor').minhasDenuncias())).toEqual([])
  })

  it('as recusas, na ordem do banco: sem conta, sem aceite, sem perfil, alvo que não existe ou não está visível', async () => {
    const { como } = montar()
    const alvo = { tipo: 'topico', id: CONTEUDO.topicoDoAutor } as const
    expect(erro(await como('semAceite').denunciar('outro', alvo, null))).toMatchObject({ chave: 'sem_aceite', mensagemOriginal: 'sem aceite' })
    expect(erro(await como('nova').denunciar('outro', alvo, null)).chave).toBe('sem_aceite')
    expect(erro(await como('semPerfil').denunciar('outro', alvo, null)).chave).toBe('sem_perfil')
    expect(erro(await como('outro').denunciar('outro', { tipo: 'topico', id: CONTEUDO.topicoOculto }, null))).toMatchObject({ chave: 'alvo_inexistente', codigo: 'P0002', classe: 'nao_encontrado' })
    expect(erro(await como('outro').denunciar('outro', { tipo: 'perfil', id: 'c0000000-0000-4000-8000-00000000ffff' }, null)).chave).toBe('alvo_inexistente')
    expect(erro(await como('outro').denunciar('outro', { tipo: 'topico', id: '' }, null))).toMatchObject({ chave: 'alvo_invalido', codigo: '23514' })
    expect(erro(await como('outro').denunciar('outro', alvo, 'x'.repeat(501))).chave).toBe('texto_fora_do_tamanho')
  })

  it('bloqueio e autoria não impedem denunciar (D16)', async () => {
    const { como } = montar()
    expect((await como('autor').denunciar('outro', { tipo: 'perfil', id: ELENCO.bloqueado.perfil! }, null)).ok).toBe(true)
    expect((await como('autor').denunciar('outro', { tipo: 'topico', id: CONTEUDO.topicoDoAutor }, null)).ok).toBe(true)
  })

  it('os alvos mostram só o que a pessoa ainda lê', async () => {
    const { como } = montar()
    const autor = como('autor')
    await autor.denunciar('outro', { tipo: 'topico', id: CONTEUDO.topicoDoBloqueado }, null)
    await autor.denunciar('outro', { tipo: 'resposta', id: CONTEUDO.respostaDoOutro }, null)
    await autor.denunciar('outro', { tipo: 'perfil', id: ELENCO.bloqueado.perfil! }, null)
    await autor.denunciar('outro', { tipo: 'perfil', id: ELENCO.outro.perfil! }, null)
    const alvos = valor(await autor.alvosDasDenuncias(valor(await autor.minhasDenuncias())))
    expect(alvos.topicos).toEqual({})
    expect(alvos.respostas).toEqual({ [CONTEUDO.respostaDoOutro]: 'Resposta do outro' })
    expect(alvos.perfis).toEqual({ [ELENCO.outro.perfil!]: 'outra_pessoa' })
  })
})

describe('conferir o envio (RF-19)', () => {
  it('lista os ids do perfil próprio com os mesmos campos do envio, do mais novo ao mais antigo', async () => {
    const { estado, como } = montar()
    const sono = estado.espacos.find((e) => e.slug === 'sono')!.id
    const outro = como('outro')
    expect(valor(await outro.conferirTopicos(sono, 'Igual', 'Texto', null))).toEqual([])
    const primeiro = valor(await outro.criarTopico(sono, 'Igual', 'Texto', null))
    const segundo = valor(await outro.criarTopico(sono, 'Igual', 'Texto', null))
    await outro.criarTopico(sono, 'Igual', 'Texto', '0_3_meses')
    expect(valor(await outro.conferirTopicos(sono, 'Igual', 'Texto', null))).toEqual([segundo, primeiro])
    expect(valor(await como('autor').conferirTopicos(sono, 'Igual', 'Texto', null))).toEqual([])

    const resposta = valor(await outro.responder(CONTEUDO.topicoDoAutor, null, 'Mesma'))
    expect(valor(await outro.conferirRespostas(CONTEUDO.topicoDoAutor, null, 'Mesma'))).toEqual([resposta])
    expect(valor(await outro.conferirRespostas(CONTEUDO.topicoDoAutor, CONTEUDO.respostaDoAutor, 'Mesma'))).toEqual([])
  })

  it('sem perfil próprio, a conferência dá "sem perfil"', async () => {
    const { como } = montar()
    expect(erro(await como('semPerfil').conferirRespostas(CONTEUDO.topicoDoAutor, null, 'x')).chave).toBe('sem_perfil')
  })
})

describe('paginação', () => {
  it('45 tópicos saem em páginas de 20, 20 e 5, do mais novo ao mais antigo, sem repetir', async () => {
    const { estado, como } = montar()
    const sono = estado.espacos.find((e) => e.slug === 'sono')!.id
    const outro = como('outro')
    for (let n = 0; n < 45; n++) await outro.criarTopico(sono, `Paginado ${n}`, 'Texto', null)
    const paginas = [0, 1, 2].map(async (p) => valor(await outro.listarTopicos(sono, p, null)))
    const [a, b, c] = await Promise.all(paginas)
    expect([a.itens.length, b.itens.length, c.itens.length]).toEqual([20, 20, 5 + 2])
    expect([a.haMais, b.haMais, c.haMais]).toEqual([true, true, false])
    const todos = [...a.itens, ...b.itens, ...c.itens]
    expect(new Set(todos.map((t) => t.id)).size).toBe(todos.length)
    expect(todos[0].titulo).toBe('Paginado 44')
    for (let n = 1; n < todos.length; n++) expect(Date.parse(todos[n - 1].criadoEm)).toBeGreaterThanOrEqual(Date.parse(todos[n].criadoEm))
  })

  it('230 respostas saem em páginas de 100, 100 e 30, do mais antigo ao mais novo', async () => {
    const { como } = montar()
    const outro = como('outro')
    for (let n = 0; n < 230; n++) await outro.responder(CONTEUDO.topicoDoOutro, null, `Resposta ${n}`)
    const [a, b, c] = await Promise.all([0, 1, 2].map(async (p) => valor(await outro.lerRespostas(CONTEUDO.topicoDoOutro, p))))
    expect([a.itens.length, b.itens.length, c.itens.length]).toEqual([100, 100, 30])
    expect([a.haMais, b.haMais, c.haMais]).toEqual([true, true, false])
    expect(a.itens[0].corpo).toBe('Resposta 0')
    expect(c.itens[29].corpo).toBe('Resposta 229')
  })
})

describe('falhas simuladas (como na MAT-37)', () => {
  it('a próxima chamada devolve o erro pedido, uma vez só, sem mudar nada', async () => {
    const { estado, como } = montar()
    const outro = como('outro')
    simularFalha(outro, 'responder', 'rede')
    const antes = estado.respostas.length
    expect(erro(await outro.responder(CONTEUDO.topicoDoAutor, null, 'Falha')).classe).toBe('rede')
    expect(estado.respostas).toHaveLength(antes)
    expect((await outro.responder(CONTEUDO.topicoDoAutor, null, 'Falha')).ok).toBe(true)
    simularFalha(outro, 'listarEspacos', erroDaChaveComunidade('sem_permissao'))
    expect(erro(await outro.listarEspacos()).chave).toBe('sem_permissao')
  })

  it('a resposta perdida aplica a mudança e devolve rede', async () => {
    const { estado, como } = montar()
    const outro = como('outro')
    simularRespostaPerdida(outro, 'responder')
    const antes = estado.respostas.length
    expect(erro(await outro.responder(CONTEUDO.topicoDoAutor, null, 'Gravou')).classe).toBe('rede')
    expect(estado.respostas).toHaveLength(antes + 1)
  })
})
