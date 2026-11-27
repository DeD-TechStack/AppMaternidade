import { describe, expect, it } from 'vitest'
import type { ErroDados, Resultado } from './comum.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from './comunidade.elenco.ts'
import type { EstadoComunidade } from './comunidade.memoria.ts'
import type { MotivoDenuncia } from './comunidade.regras.ts'
import {
  CODIGO_DE_TESTE_MFA,
  criarDadosModeracaoMemoria,
  fatoresDaMemoria,
  prepararMfa,
  simularFalhaModeracao,
  simularRespostaPerdidaModeracao,
} from './moderacao.memoria.ts'
import { lerValidade, ordenarFila, papelVigente, prioridadeDoMotivo } from './moderacao.regras.ts'

// MAT-40, teste 1 (parte 40b) e teste 15: as regras do banco que o painel usa, reproduzidas na memória, e as
// que falham fechadas (sem papel, papel vencido, conflito de interesse, último admin).

function valor<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(`esperava sucesso: ${resultado.erro.chave} ${resultado.erro.mensagemOriginal}`)
  return resultado.valor
}

function erro<T>(resultado: Resultado<T>): ErroDados {
  if (resultado.ok) throw new Error('esperava erro')
  return resultado.erro
}

const MOMENTO = Date.parse('2026-11-10T12:00:00.000Z')
const ID_DENUNCIA = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`

let contador = 0
function novaDenuncia(estado: EstadoComunidade, extras: Partial<EstadoComunidade['denuncias'][number]> = {}) {
  contador += 1
  const linha: EstadoComunidade['denuncias'][number] = {
    id: ID_DENUNCIA(contador),
    denuncianteId: ELENCO.outro.conta,
    topicoId: CONTEUDO.topicoDoAutor,
    respostaId: null,
    perfilId: null,
    motivo: 'outro',
    texto: null,
    estado: 'aberta',
    decididaPor: null,
    decididaEm: null,
    criadaEm: new Date(MOMENTO - 1000 * (1000 - contador)).toISOString(),
    ...extras,
  }
  estado.denuncias.push(linha)
  return linha
}

function cena(pessoa: PessoaDoElenco = 'moderador') {
  const estado = criarElenco(MOMENTO)
  const dados = criarDadosModeracaoMemoria(estado, ELENCO[pessoa].conta)
  return { estado, dados }
}

describe('a fila de denúncias', () => {
  it('ordena por grupo de prioridade, depois pela data mais antiga, depois pelo id', async () => {
    const { estado, dados } = cena()
    const a = novaDenuncia(estado, { motivo: 'outro', criadaEm: '2026-11-01T10:00:00.000Z' })
    const b = novaDenuncia(estado, { motivo: 'ataque_assedio', criadaEm: '2026-11-02T10:00:00.000Z' })
    const c = novaDenuncia(estado, { motivo: 'risco_autolesao', criadaEm: '2026-11-03T10:00:00.000Z' })
    const d = novaDenuncia(estado, { motivo: 'conteudo_sexual', criadaEm: '2026-11-03T10:00:00.000Z' })
    const fila = valor(await dados.filaDeDenuncias({ estados: [], motivo: null }, 0))
    const ordem = [c, d].sort((x, y) => (x.id < y.id ? -1 : 1)).map((x) => x.id)
    expect(fila.itens.map((i) => i.id)).toEqual([...ordem, b.id, a.id])
    expect(prioridadeDoMotivo('risco_autolesao')).toBe(1)
    expect(prioridadeDoMotivo('dados_pessoais')).toBe(2)
    expect(prioridadeDoMotivo('spam_venda')).toBe(3)
  })

  it('o filtro padrão são os estados abertos; nenhum estado marcado equivale a todos; o motivo filtra', async () => {
    const { estado, dados } = cena()
    novaDenuncia(estado, { estado: 'aberta' })
    novaDenuncia(estado, { estado: 'em_analise', motivo: 'spam_venda' })
    novaDenuncia(estado, { estado: 'procedente', decididaEm: '2026-11-04T10:00:00.000Z' })
    novaDenuncia(estado, { estado: 'improcedente', decididaEm: '2026-11-04T10:00:00.000Z' })
    expect(valor(await dados.filaDeDenuncias({ estados: ['aberta', 'em_analise'], motivo: null }, 0)).itens).toHaveLength(2)
    expect(valor(await dados.filaDeDenuncias({ estados: [], motivo: null }, 0)).itens).toHaveLength(4)
    expect(valor(await dados.filaDeDenuncias({ estados: [], motivo: 'spam_venda' as MotivoDenuncia }, 0)).itens).toHaveLength(1)
  })

  it('páginas de 50: "haMais" só com a página cheia, e a lista junta não repete linha', async () => {
    const { estado, dados } = cena()
    for (let i = 0; i < 51; i += 1) novaDenuncia(estado)
    const primeira = valor(await dados.filaDeDenuncias({ estados: [], motivo: null }, 0))
    const segunda = valor(await dados.filaDeDenuncias({ estados: [], motivo: null }, 1))
    expect(primeira.itens).toHaveLength(50)
    expect(primeira.haMais).toBe(true)
    expect(segunda.itens).toHaveLength(1)
    expect(segunda.haMais).toBe(false)
    expect(new Set([...primeira.itens, ...segunda.itens].map((i) => i.id)).size).toBe(51)
  })

  it('a função pura de ordem faz o mesmo', () => {
    const lista = [
      { id: 'b', motivo: 'outro' as const, criadaEm: '2026-01-01T00:00:00.000Z' },
      { id: 'a', motivo: 'risco_autolesao' as const, criadaEm: '2026-02-01T00:00:00.000Z' },
    ]
    expect(ordenarFila(lista).map((i) => i.id)).toEqual(['a', 'b'])
  })
})

describe('quem não é da moderação lê tabelas vazias, sem erro (teste 15)', () => {
  for (const pessoa of ['outro', 'vencido', 'semPerfil'] as const) {
    it(`${pessoa}: fila, denúncia, histórico e auditoria vêm vazios`, async () => {
      const { estado, dados } = cena(pessoa)
      const linha = novaDenuncia(estado)
      expect(valor(await dados.filaDeDenuncias({ estados: [], motivo: null }, 0)).itens).toEqual([])
      expect(valor(await dados.lerDenuncia(linha.id))).toBeNull()
      expect(valor(await dados.historicoDoPerfil(ELENCO.autor.perfil!))).toEqual({ conteudos: [], auditoria: [] })
      expect(valor(await dados.auditoria(0)).itens).toEqual([])
    })
  }

  it('os papéis: cada conta vê os próprios (o vencido também), e só o admin vigente vê todos', async () => {
    const vencido = cena('vencido')
    expect(valor(await vencido.dados.papeis()).map((p) => p.contaId)).toEqual([ELENCO.vencido.conta])
    const moderador = cena('moderador')
    expect(valor(await moderador.dados.papeis()).map((p) => p.contaId)).toEqual([ELENCO.moderador.conta])
    const admin = cena('admin')
    expect(valor(await admin.dados.papeis())).toHaveLength(3)
  })

  it('as ações recusam com `sem_papel` (42501)', async () => {
    for (const pessoa of ['outro', 'vencido'] as const) {
      const { estado, dados } = cena(pessoa)
      const linha = novaDenuncia(estado)
      expect(erro(await dados.moderarConteudo({ tipo: 'topico', id: CONTEUDO.topicoDoAutor }, 'oculto', 'M', null)).chave).toBe('sem_papel')
      expect(erro(await dados.decidirDenuncia(linha.id, 'procedente', 'M')).chave).toBe('sem_papel')
      expect(erro(await dados.concederPapel(ELENCO.outro.conta, 'moderador', 'M', null)).chave).toBe('sem_papel')
      expect(erro(await dados.revogarPapel(ELENCO.moderador.conta, 'moderador', 'M')).chave).toBe('sem_papel')
    }
  })

  it('o moderador sem admin não concede nem revoga papel', async () => {
    const { dados } = cena('moderador')
    expect(erro(await dados.concederPapel(ELENCO.outro.conta, 'moderador', 'M', null)).chave).toBe('sem_papel')
    expect(erro(await dados.revogarPapel(ELENCO.vencido.conta, 'moderador', 'M')).chave).toBe('sem_papel')
  })
})

describe('moderar conteúdo', () => {
  it('oculta, remove e restaura, com a linha de auditoria (estado antes e depois, motivo, texto do momento)', async () => {
    const { estado, dados } = cena()
    const id = valor(await dados.moderarConteudo({ tipo: 'topico', id: CONTEUDO.topicoDoAutor }, 'oculto', 'Motivo um', null))
    const topico = estado.topicos.find((t) => t.id === CONTEUDO.topicoDoAutor)!
    expect(topico.estado).toBe('oculto')
    expect(topico.motivoModeracao).toBe('Motivo um')
    valor(await dados.moderarConteudo({ tipo: 'topico', id: CONTEUDO.topicoDoAutor }, 'removido', 'Motivo dois', null))
    valor(await dados.moderarConteudo({ tipo: 'topico', id: CONTEUDO.topicoDoAutor }, 'visivel', 'Motivo três', null))
    expect(topico.estado).toBe('visivel')
    expect(topico.motivoModeracao).toBeNull()

    expect(estado.auditoria.map((a) => a.acao)).toEqual(['ocultar', 'remover', 'restaurar'])
    const primeira = estado.auditoria[0]
    expect(primeira).toMatchObject({ id, atorId: ELENCO.moderador.conta, alvoTipo: 'topico', estadoAnterior: 'visivel', estadoNovo: 'oculto', motivo: 'Motivo um', denunciaId: null })
    expect(primeira.conteudo).toContain('Tópico do autor')
  })

  it('moderar uma resposta, com a denúncia ligada', async () => {
    const { estado, dados } = cena()
    const denuncia = novaDenuncia(estado, { topicoId: null, respostaId: CONTEUDO.respostaDoOutro })
    valor(await dados.moderarConteudo({ tipo: 'resposta', id: CONTEUDO.respostaDoOutro }, 'oculto', 'Motivo', denuncia.id))
    expect(estado.respostas.find((r) => r.id === CONTEUDO.respostaDoOutro)!.estado).toBe('oculto')
    expect(estado.auditoria[0].denunciaId).toBe(denuncia.id)
  })

  it('as recusas do banco, com a chave do catálogo', async () => {
    const { estado, dados } = cena()
    const alvo = { tipo: 'topico' as const, id: CONTEUDO.topicoDoAutor }
    expect(erro(await dados.moderarConteudo(alvo, 'oculto', '   ', null)).chave).toBe('motivo_vazio')
    expect(erro(await dados.moderarConteudo(alvo, 'visivel', 'M', null)).chave).toBe('estado_igual')
    expect(erro(await dados.moderarConteudo({ tipo: 'topico', id: ID_DENUNCIA(900) }, 'oculto', 'M', null)).chave).toBe('alvo_inexistente')
    expect(erro(await dados.moderarConteudo(alvo, 'oculto', 'M', ID_DENUNCIA(901))).chave).toBe('denuncia_inexistente')
    const deOutroAlvo = novaDenuncia(estado, { topicoId: CONTEUDO.topicoDoOutro })
    expect(erro(await dados.moderarConteudo(alvo, 'oculto', 'M', deOutroAlvo.id)).chave).toBe('denuncia_de_outro_alvo')
    // A tela confere 1 a 300 antes de enviar; se um motivo maior chegasse, o `check` da auditoria o recusa (23514).
    expect(erro(await dados.moderarConteudo(alvo, 'oculto', 'x'.repeat(301), null)).codigo).toBe('23514')
    expect(estado.auditoria).toEqual([])
  })

  it('um id que não é UUID falha como o PostgREST (22P02), antes de qualquer outra regra', async () => {
    const { dados } = cena('outro')
    const falha = erro(await dados.moderarConteudo({ tipo: 'topico', id: 'xyz' }, 'oculto', 'M', null))
    expect(falha.codigo).toBe('22P02')
    expect(falha.chave).toBe('desconhecido')
  })

  it('conflito de interesse: o moderador não age sobre o próprio conteúdo, nem sobre denúncia que ele abriu', async () => {
    const { estado, dados } = cena()
    expect(erro(await dados.moderarConteudo({ tipo: 'topico', id: CONTEUDO.topicoDoModerador }, 'oculto', 'M', null)).chave).toBe('conflito_de_interesse')
    const dele = novaDenuncia(estado, { denuncianteId: ELENCO.moderador.conta, topicoId: CONTEUDO.topicoDoAutor })
    expect(erro(await dados.moderarConteudo({ tipo: 'topico', id: CONTEUDO.topicoDoAutor }, 'oculto', 'M', dele.id)).chave).toBe('conflito_de_interesse')
    expect(estado.topicos.find((t) => t.id === CONTEUDO.topicoDoModerador)!.estado).toBe('visivel')
  })
})

describe('decidir denúncia', () => {
  it('em análise e depois procedente: a data da decisão só nas finais, e a auditoria de cada passo', async () => {
    const { estado, dados } = cena()
    const linha = novaDenuncia(estado)
    valor(await dados.decidirDenuncia(linha.id, 'em_analise', 'Olhando'))
    expect(linha.estado).toBe('em_analise')
    expect(linha.decididaEm).toBeNull()
    valor(await dados.decidirDenuncia(linha.id, 'procedente', 'Confirmado'))
    expect(linha.estado).toBe('procedente')
    expect(linha.decididaEm).not.toBeNull()
    expect(linha.decididaPor).toBe(ELENCO.moderador.conta)
    expect(estado.auditoria.map((a) => [a.acao, a.alvoTipo, a.estadoAnterior, a.estadoNovo])).toEqual([
      ['decidir_denuncia', 'denuncia', 'aberta', 'em_analise'],
      ['decidir_denuncia', 'denuncia', 'em_analise', 'procedente'],
    ])
  })

  it('as recusas: decidida, estado igual, decisão inválida, motivo vazio e denúncia que não existe', async () => {
    const { estado, dados } = cena()
    const decidida = novaDenuncia(estado, { estado: 'improcedente', decididaEm: '2026-11-04T10:00:00.000Z' })
    expect(erro(await dados.decidirDenuncia(decidida.id, 'procedente', 'M')).chave).toBe('denuncia_ja_decidida')
    const emAnalise = novaDenuncia(estado, { estado: 'em_analise' })
    expect(erro(await dados.decidirDenuncia(emAnalise.id, 'em_analise', 'M')).chave).toBe('estado_igual')
    const aberta = novaDenuncia(estado)
    expect(erro(await dados.decidirDenuncia(aberta.id, 'aberta', 'M')).chave).toBe('decisao_invalida')
    expect(erro(await dados.decidirDenuncia(aberta.id, 'procedente', '')).chave).toBe('motivo_vazio')
    expect(erro(await dados.decidirDenuncia(ID_DENUNCIA(902), 'procedente', 'M')).chave).toBe('denuncia_inexistente')
  })

  it('conflito de interesse: denúncia do próprio conteúdo ou que o moderador abriu', async () => {
    const { estado, dados } = cena()
    const doProprio = novaDenuncia(estado, { topicoId: CONTEUDO.topicoDoModerador })
    expect(erro(await dados.decidirDenuncia(doProprio.id, 'procedente', 'M')).chave).toBe('conflito_de_interesse')
    const dele = novaDenuncia(estado, { denuncianteId: ELENCO.moderador.conta })
    expect(erro(await dados.decidirDenuncia(dele.id, 'procedente', 'M')).chave).toBe('conflito_de_interesse')
  })

  it('"lerConteudo" lê o conteúdo em qualquer estado para a moderação, e a Comunidade vê a mudança', async () => {
    const { estado, dados } = cena()
    const removido = valor(await dados.lerConteudo('topico', CONTEUDO.topicoRemovido))
    expect(removido?.tipo === 'topico' && removido.topico.estado).toBe('removido')
    const outro = cena('outro')
    expect(valor(await outro.dados.lerConteudo('topico', CONTEUDO.topicoRemovido))).toBeNull()
    expect(estado.topicos.length).toBeGreaterThan(0)
  })
})

describe('papéis', () => {
  it('conceder, renovar (conceder de novo muda a validade) e revogar, com a auditoria', async () => {
    const { estado, dados } = cena('admin')
    const futuro = new Date(Date.now() + 86_400_000).toISOString()
    const maisLonge = new Date(Date.now() + 2 * 86_400_000).toISOString()
    valor(await dados.concederPapel(ELENCO.outro.conta, 'moderador', 'Entrou na equipe', futuro))
    expect(estado.papeis.filter((p) => p.contaId === ELENCO.outro.conta)).toHaveLength(1)
    valor(await dados.concederPapel(ELENCO.outro.conta, 'moderador', 'Renovando', maisLonge))
    const linhas = estado.papeis.filter((p) => p.contaId === ELENCO.outro.conta)
    expect(linhas).toHaveLength(1)
    expect(linhas[0].validoAte).toBe(maisLonge)
    valor(await dados.revogarPapel(ELENCO.outro.conta, 'moderador', 'Saiu'))
    expect(estado.papeis.some((p) => p.contaId === ELENCO.outro.conta)).toBe(false)
    expect(estado.auditoria.map((a) => a.acao)).toEqual(['conceder_papel', 'conceder_papel', 'revogar_papel'])
    expect(estado.auditoria[0]).toMatchObject({ alvoTipo: 'papel_plataforma', alvoId: ELENCO.outro.conta, validoAte: futuro })
  })

  it('as recusas: validade no passado, conta que não existe, papel que a conta não tem, motivo vazio, UUID inválido', async () => {
    const { dados } = cena('admin')
    const passado = new Date(Date.now() - 1000).toISOString()
    expect(erro(await dados.concederPapel(ELENCO.outro.conta, 'moderador', 'M', passado)).chave).toBe('validade_no_passado')
    expect(erro(await dados.concederPapel(ID_DENUNCIA(903), 'moderador', 'M', null)).chave).toBe('conta_inexistente')
    expect(erro(await dados.concederPapel(ELENCO.outro.conta, 'moderador', ' ', null)).chave).toBe('motivo_vazio')
    expect(erro(await dados.revogarPapel(ELENCO.outro.conta, 'admin', 'M')).chave).toBe('papel_inexistente')
    expect(erro(await dados.concederPapel('nao-e-uuid', 'moderador', 'M', null)).codigo).toBe('22P02')
  })

  it('nunca deixa o sistema sem admin vigente (teste 15), mas revoga o admin quando há outro', async () => {
    const { estado, dados } = cena('admin')
    expect(erro(await dados.revogarPapel(ELENCO.admin.conta, 'admin', 'Sair')).chave).toBe('ultimo_admin')
    valor(await dados.concederPapel(ELENCO.outro.conta, 'admin', 'Segundo admin', null))
    valor(await dados.revogarPapel(ELENCO.admin.conta, 'admin', 'Sair'))
    expect(estado.papeis.some((p) => p.contaId === ELENCO.admin.conta)).toBe(false)
  })

  it('o admin vencido não conta como "outro admin" para a trava, e perde o acesso', async () => {
    const { estado, dados } = cena('admin')
    valor(await dados.concederPapel(ELENCO.outro.conta, 'admin', 'Admin com validade', new Date(Date.now() + 3_600_000).toISOString()))
    estado.papeis.find((p) => p.contaId === ELENCO.outro.conta)!.validoAte = new Date(Date.now() - 1000).toISOString()
    expect(erro(await dados.revogarPapel(ELENCO.admin.conta, 'admin', 'Sair')).chave).toBe('ultimo_admin')

    const vencido = criarDadosModeracaoMemoria(estado, ELENCO.outro.conta)
    expect(erro(await vencido.concederPapel(ELENCO.nova.conta, 'moderador', 'M', null)).chave).toBe('sem_papel')
  })

  it('as funções puras: validade vigente e leitura do campo de data', () => {
    const agora = Date.parse('2026-11-10T12:00:00.000Z')
    expect(papelVigente(null, agora)).toBe(true)
    expect(papelVigente('2026-11-11T12:00:00.000Z', agora)).toBe(true)
    expect(papelVigente('2026-11-09T12:00:00.000Z', agora)).toBe(false)
    expect(papelVigente('ilegivel', agora)).toBe(false)
    expect(lerValidade('', agora)).toEqual({ tipo: 'vazia' })
    expect(lerValidade('2020-01-01T10:00', agora)).toEqual({ tipo: 'passada' })
    expect(lerValidade('amanhã', agora)).toEqual({ tipo: 'ilegivel' })
    expect(lerValidade('2099-01-01T10:00', agora).tipo).toBe('ok')
  })
})

describe('auditoria e histórico do perfil', () => {
  it('a auditoria vem da mais nova à mais antiga, em páginas de 50', async () => {
    const { estado, dados } = cena()
    for (let i = 0; i < 51; i += 1) {
      estado.auditoria.push({
        id: ID_DENUNCIA(2000 + i),
        atorId: ELENCO.moderador.conta,
        acao: 'ocultar',
        alvoTipo: 'topico',
        alvoId: CONTEUDO.topicoDoAutor,
        estadoAnterior: 'visivel',
        estadoNovo: 'oculto',
        motivo: `Motivo ${i}`,
        denunciaId: null,
        conteudo: null,
        validoAte: null,
        criadoEm: new Date(MOMENTO + i * 1000).toISOString(),
      })
    }
    const primeira = valor(await dados.auditoria(0))
    expect(primeira.itens).toHaveLength(50)
    expect(primeira.haMais).toBe(true)
    expect(primeira.itens[0].motivo).toBe('Motivo 50')
    const segunda = valor(await dados.auditoria(1))
    expect(segunda.itens.map((a) => a.motivo)).toEqual(['Motivo 0'])
    expect(segunda.haMais).toBe(false)
  })

  it('o histórico do perfil traz até 20 conteúdos, o mais novo primeiro, e a auditoria deles', async () => {
    const { estado, dados } = cena()
    valor(await dados.moderarConteudo({ tipo: 'topico', id: CONTEUDO.topicoOculto }, 'visivel', 'Restaurado', null))
    const historico = valor(await dados.historicoDoPerfil(ELENCO.autor.perfil!))
    const ids = historico.conteudos.map((c) => c.id)
    expect(ids).toContain(CONTEUDO.topicoDoAutor)
    expect(ids).toContain(CONTEUDO.respostaDoAutor)
    expect(historico.conteudos.length).toBeLessThanOrEqual(20)
    expect(historico.auditoria.map((a) => a.alvoId)).toEqual([CONTEUDO.topicoOculto])
    for (let i = 0; i < 25; i += 1) {
      estado.respostas.push({
        id: ID_DENUNCIA(3000 + i),
        topicoId: CONTEUDO.topicoDoAutor,
        autorId: ELENCO.autor.perfil,
        respostaA: null,
        corpo: `Mais uma ${i}`,
        estado: 'visivel',
        motivoModeracao: null,
        criadoEm: new Date(MOMENTO + i).toISOString(),
        editadoEm: null,
      })
    }
    expect(valor(await dados.historicoDoPerfil(ELENCO.autor.perfil!)).conteudos).toHaveLength(20)
  })
})

describe('a verificação em duas etapas na memória', () => {
  it('começa em aal1 e sem fator; o cadastro devolve QR (imagem, não SVG) e chave; o código de teste leva a aal2', async () => {
    const { estado, dados } = cena()
    expect(valor(await dados.nivelDaSessao())).toBe('aal1')
    expect(valor(await dados.fatores())).toEqual([])
    const novo = valor(await dados.cadastrarFator())
    expect(novo.qr.startsWith('data:image/png')).toBe(true)
    expect(novo.chave).not.toBe('')
    expect(fatoresDaMemoria(estado, ELENCO.moderador.conta)).toEqual([{ id: novo.id, verificado: false }])
    expect(erro(await dados.confirmarCodigo(novo.id, '000000')).chave).toBe('codigo_invalido')
    expect(valor(await dados.nivelDaSessao())).toBe('aal1')
    valor(await dados.confirmarCodigo(novo.id, CODIGO_DE_TESTE_MFA))
    expect(valor(await dados.nivelDaSessao())).toBe('aal2')
    expect(fatoresDaMemoria(estado, ELENCO.moderador.conta)).toEqual([{ id: novo.id, verificado: true }])
  })

  it('cadastrar de novo remove o fator que nunca foi verificado e mantém o verificado', async () => {
    const { estado, dados } = cena()
    prepararMfa(estado, ELENCO.moderador.conta, { fatores: [{ id: 'verificado', verificado: true }, { id: 'velho', verificado: false }] })
    const novo = valor(await dados.cadastrarFator())
    expect(fatoresDaMemoria(estado, ELENCO.moderador.conta).map((f) => f.id)).toEqual(['verificado', novo.id])
  })

  it('o fator desconhecido é mfa_indisponivel, e cada conta tem o seu nível', async () => {
    const { estado, dados } = cena()
    expect(erro(await dados.confirmarCodigo('nao-existe', CODIGO_DE_TESTE_MFA)).chave).toBe('mfa_indisponivel')
    prepararMfa(estado, ELENCO.admin.conta, { nivel: 'aal2' })
    const admin = criarDadosModeracaoMemoria(estado, ELENCO.admin.conta)
    expect(valor(await admin.nivelDaSessao())).toBe('aal2')
    expect(valor(await dados.nivelDaSessao())).toBe('aal1')
  })
})

describe('sessão e falhas simuladas', () => {
  it('sem sessão, toda operação devolve a sessão encerrada', async () => {
    const estado = criarElenco(MOMENTO)
    const dados = criarDadosModeracaoMemoria(estado, null)
    expect(erro(await dados.filaDeDenuncias({ estados: [], motivo: null }, 0)).classe).toBe('sessao_encerrada')
    expect(erro(await dados.nivelDaSessao()).classe).toBe('sessao_encerrada')
  })

  it('a falha simulada vale uma vez e não muda nada; a resposta perdida aplica a mudança e devolve rede', async () => {
    const { estado, dados } = cena()
    simularFalhaModeracao(dados, 'filaDeDenuncias', 'rede')
    expect(erro(await dados.filaDeDenuncias({ estados: [], motivo: null }, 0)).chave).toBe('rede')
    expect(valor(await dados.filaDeDenuncias({ estados: [], motivo: null }, 0)).itens).toEqual([])

    simularRespostaPerdidaModeracao(dados, 'moderarConteudo')
    const perdida = await dados.moderarConteudo({ tipo: 'topico', id: CONTEUDO.topicoDoAutor }, 'oculto', 'Motivo', null)
    expect(erro(perdida).chave).toBe('rede')
    expect(estado.topicos.find((t) => t.id === CONTEUDO.topicoDoAutor)!.estado).toBe('oculto')
    expect(estado.auditoria).toHaveLength(1)
  })
})
