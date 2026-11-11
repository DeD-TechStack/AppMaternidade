import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ID_BEBE, ID_FAMILIA, criarMundoDeTeste, type Mundo } from '../teste/rotina.fixture.ts'
import { PESSOAS } from '../teste/renderizarComDados.tsx'
import { simularFalhaRotina, simularRespostaPerdidaRotina } from './rotina.memoria.ts'
import { LIMITES, type DadosRotina, type NovoRegistro, type Registro } from './rotina.tipos.ts'
import { uuidV7 } from './rotina.uuid.ts'

// O contrato da implementação em memória (R38-32, item 1): a ordem de conferência do Anexo A por função,
// o catálogo do Anexo B, a idempotência pelo id, o limite das listas e as leituras sem acesso. O relógio
// é o falso do Vitest, parado às 10:00 de 5/11/2026, e a memória lê a conta e os papéis da `DadosConta`.

const MIN = 60_000
const HORA = 60 * MIN

let mundo: Mundo
let rotina: DadosRotina

const iso = (deslocamentoMs: number) => new Date(Date.now() + deslocamentoMs).toISOString()

function entrar(pessoa: keyof typeof PESSOAS | null) {
  mundo.conta.sessaoParaTeste(pessoa ? PESSOAS[pessoa].email : null)
}

const fralda = (extra: Partial<NovoRegistro> = {}): NovoRegistro => ({
  id: uuidV7(),
  bebeId: ID_BEBE,
  tipo: 'fralda',
  inicio: iso(-MIN),
  detalhes: { conteudo: 'xixi' },
  ...extra,
})

const sono = (extra: Partial<NovoRegistro> = {}): NovoRegistro => ({
  id: uuidV7(),
  bebeId: ID_BEBE,
  tipo: 'sono',
  inicio: iso(-30 * MIN),
  ...extra,
})

async function gravado(entrada: NovoRegistro): Promise<Registro> {
  const resultado = await rotina.gravarRegistro(entrada)
  if (!resultado.ok) throw new Error(`gravar falhou: ${resultado.erro.chave}`)
  return resultado.valor
}

const chaveDe = (resultado: { ok: boolean; erro?: { chave: string } }) => (resultado.ok ? 'ok' : (resultado.erro?.chave ?? ''))

function montar(opcoes: Parameters<typeof criarMundoDeTeste>[0] = {}) {
  mundo = criarMundoDeTeste(opcoes)
  rotina = mundo.rotina
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
  montar()
})

describe('contexto', () => {
  it('traz a conta atual, as famílias com o papel dela, os membros e os bebês', async () => {
    const resultado = await rotina.contexto()
    if (!resultado.ok) throw new Error('contexto falhou')
    expect(resultado.valor.contaId).toBe(PESSOAS.juliana.id)
    const [familia] = resultado.valor.familias
    expect(familia.meuPapel).toBe('responsavel')
    expect(familia.bebes.map((bebe) => bebe.nome)).toEqual(['Heloísa'])
    expect(familia.membros.map((membro) => membro.nome).sort()).toEqual(['Bruno', 'Carla', 'Juliana'])
  })

  it('sem sessão de login, devolve a classe sessao_encerrada', async () => {
    entrar(null)
    const resultado = await rotina.contexto()
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro.classe).toBe('sessao_encerrada')
  })
})

describe('gravarRegistro: a ordem de conferência', () => {
  it('grava com o id do navegador, a autoria, o fuso do aparelho e a origem padrão', async () => {
    const entrada = fralda()
    const registro = await gravado(entrada)
    expect(registro.id).toBe(entrada.id)
    expect(registro.criadoPor).toBe(PESSOAS.juliana.id)
    expect(registro.origem).toBe('ao_vivo')
    expect(registro.fuso).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(registro.versao).toBe(1)
    expect(registro.fim).toBeNull()
  })

  it('repetir o mesmo id devolve a linha já gravada, sem duplicar e sem comparar os outros dados', async () => {
    const entrada = fralda()
    const primeiro = await gravado(entrada)
    const segundo = await rotina.gravarRegistro({ ...entrada, detalhes: { conteudo: 'coco' }, inicio: iso(-5 * MIN) })
    expect(segundo.ok).toBe(true)
    if (segundo.ok) expect(segundo.valor).toEqual(primeiro)
    const dia = await rotina.doIntervalo(ID_BEBE, iso(-HORA), iso(HORA))
    if (!dia.ok) throw new Error('leitura falhou')
    expect(dia.valor.itens.filter((r) => r.id === entrada.id)).toHaveLength(1)
  })

  it('id que já existe numa família sem vínculo é nao_encontrado', async () => {
    const entrada = fralda()
    await gravado(entrada)
    entrar('davi')
    expect(chaveDe(await rotina.gravarRegistro(entrada))).toBe('nao_encontrado')
  })

  it('parâmetro obrigatório faltando é parametro_obrigatorio, antes de qualquer outra conferência', async () => {
    entrar('davi')
    expect(chaveDe(await rotina.gravarRegistro({ ...fralda(), bebeId: '' }))).toBe('parametro_obrigatorio')
  })

  it('bebê sem vínculo é nao_encontrado; observador é sem_permissao', async () => {
    entrar('davi')
    expect(chaveDe(await rotina.gravarRegistro(fralda()))).toBe('nao_encontrado')
    montar({ papelDeDavi: 'observador' })
    entrar('davi')
    expect(chaveDe(await rotina.gravarRegistro(fralda()))).toBe('sem_permissao')
  })

  it('bebê arquivado é bebe_arquivado, mas o papel vem antes: observador recebe sem_permissao', async () => {
    montar({ bebeArquivado: true, papelDeDavi: 'observador' })
    expect(chaveDe(await rotina.gravarRegistro(fralda()))).toBe('bebe_arquivado')
    entrar('davi')
    expect(chaveDe(await rotina.gravarRegistro(fralda()))).toBe('sem_permissao')
  })

  it('o horário no futuro: até 5 minutos passa, mais que isso é horario_no_futuro', async () => {
    expect(chaveDe(await rotina.gravarRegistro(fralda({ inicio: iso(5 * MIN) })))).toBe('ok')
    expect(chaveDe(await rotina.gravarRegistro(fralda({ inicio: iso(5 * MIN + 1000) })))).toBe('horario_no_futuro')
  })

  it('as regras de valor viram valor_invalido', async () => {
    const casos: NovoRegistro[] = [
      fralda({ detalhes: {} }),
      fralda({ detalhes: { conteudo: 'outro' as 'xixi' } }),
      { ...fralda(), tipo: 'mamadeira', detalhes: { ml: 501 } },
      { ...fralda(), tipo: 'mamadeira', detalhes: { ml: 0 } },
      { ...fralda(), tipo: 'mamadeira', detalhes: { ml: 90.5 } },
      { ...fralda(), tipo: 'solido', detalhes: { alimento: 'a'.repeat(101) } },
      { ...fralda(), tipo: 'observacao', detalhes: {}, nota: null },
      { ...fralda(), tipo: 'observacao', detalhes: {}, nota: 'a'.repeat(501) },
      sono({ nota: 'a'.repeat(501) }),
      sono({ fim: iso(-40 * MIN) }),
      { ...fralda(), fim: iso(-MIN) },
    ]
    for (const caso of casos) expect(chaveDe(await rotina.gravarRegistro(caso)), JSON.stringify(caso)).toBe('valor_invalido')
  })

  it('os limites passam: 500 ml, alimento de 100 caracteres e nota de 500', async () => {
    expect(chaveDe(await rotina.gravarRegistro({ ...fralda(), tipo: 'mamadeira', detalhes: { ml: 500 } }))).toBe('ok')
    expect(chaveDe(await rotina.gravarRegistro({ ...fralda(), tipo: 'solido', detalhes: { alimento: 'a'.repeat(100) } }))).toBe('ok')
    expect(chaveDe(await rotina.gravarRegistro({ ...fralda(), tipo: 'observacao', detalhes: {}, nota: 'a'.repeat(500) }))).toBe('ok')
  })
})

describe('editarRegistro', () => {
  it('manda o estado completo, sobe a versão e registra a alteração', async () => {
    const criado = await gravado(sono({ fim: iso(-10 * MIN), nota: 'antes' }))
    const editado = await rotina.editarRegistro(criado.id, { inicio: criado.inicio, fim: iso(-5 * MIN), detalhes: {}, nota: 'depois' })
    expect(editado.ok).toBe(true)
    if (editado.ok) {
      expect(editado.valor.versao).toBe(2)
      expect(editado.valor.nota).toBe('depois')
    }
    const historico = await rotina.alteracoes(criado.id)
    if (!historico.ok) throw new Error('histórico falhou')
    expect(historico.valor.itens.map((a) => a.operacao)).toEqual(['criacao', 'edicao'])
  })

  it('o cuidador edita só o que criou; o responsável edita tudo', async () => {
    const dela = await gravado(fralda())
    entrar('bruno')
    const edicao = { inicio: dela.inicio, fim: null, detalhes: { conteudo: 'coco' as const }, nota: null }
    expect(chaveDe(await rotina.editarRegistro(dela.id, edicao))).toBe('sem_permissao')
    const dele = await gravado(fralda())
    expect(chaveDe(await rotina.editarRegistro(dele.id, { ...edicao, inicio: dele.inicio }))).toBe('ok')
    entrar('juliana')
    expect(chaveDe(await rotina.editarRegistro(dele.id, { ...edicao, inicio: dele.inicio }))).toBe('ok')
  })

  it('apagar o fim de uma sessão encerrada é sessao_ja_encerrada', async () => {
    const criado = await gravado(sono({ fim: iso(-10 * MIN) }))
    expect(chaveDe(await rotina.editarRegistro(criado.id, { inicio: criado.inicio, fim: null, detalhes: {}, nota: null }))).toBe(
      'sessao_ja_encerrada',
    )
  })

  it('registro excluído é registro_excluido; registro que não existe é nao_encontrado', async () => {
    const criado = await gravado(fralda())
    await rotina.excluirRegistro(criado.id)
    const edicao = { inicio: criado.inicio, fim: null, detalhes: { conteudo: 'xixi' as const }, nota: null }
    expect(chaveDe(await rotina.editarRegistro(criado.id, edicao))).toBe('registro_excluido')
    expect(chaveDe(await rotina.editarRegistro(uuidV7(), edicao))).toBe('nao_encontrado')
  })

  it('cuidador que edita item de outra pessoa de bebê arquivado recebe sem_permissao, e não bebe_arquivado', async () => {
    montar({ bebeArquivado: true })
    // A fralda de Juliana (coco) do dia fictício.
    const alvo = mundo.fixture.registros[3]
    entrar('bruno')
    const edicao = { inicio: alvo.inicio, fim: null, detalhes: { conteudo: 'xixi' as const }, nota: null }
    expect(chaveDe(await rotina.editarRegistro(alvo.id, edicao))).toBe('sem_permissao')
    entrar('juliana')
    expect(chaveDe(await rotina.editarRegistro(alvo.id, edicao))).toBe('bebe_arquivado')
  })
})

describe('encerrarSessao', () => {
  it('grava o fim enviado e devolve o primeiro fim se já estava encerrada', async () => {
    const criado = await gravado(sono())
    const fim = iso(-5 * MIN)
    const primeiro = await rotina.encerrarSessao(criado.id, fim)
    expect(primeiro).toEqual({ ok: true, valor: fim })
    const segundo = await rotina.encerrarSessao(criado.id, iso(-1 * MIN))
    expect(segundo).toEqual({ ok: true, valor: fim })
  })

  it('o cuidador encerra a sessão de outra pessoa; o observador não', async () => {
    const criado = await gravado(sono())
    entrar('bruno')
    expect(chaveDe(await rotina.encerrarSessao(criado.id, iso(-MIN)))).toBe('ok')
    montar({ papelDeDavi: 'observador' })
    const outra = await gravado(sono())
    entrar('davi')
    expect(chaveDe(await rotina.encerrarSessao(outra.id, iso(-MIN)))).toBe('sem_permissao')
  })

  it('fim antes do início é valor_invalido; no futuro, horario_no_futuro; pontual, nao_e_sessao', async () => {
    const criado = await gravado(sono())
    expect(chaveDe(await rotina.encerrarSessao(criado.id, iso(-40 * MIN)))).toBe('valor_invalido')
    expect(chaveDe(await rotina.encerrarSessao(criado.id, iso(6 * MIN)))).toBe('horario_no_futuro')
    const pontual = await gravado(fralda())
    expect(chaveDe(await rotina.encerrarSessao(pontual.id, iso(-MIN)))).toBe('nao_e_sessao')
  })

  it('sessão excluída é registro_excluido', async () => {
    const criado = await gravado(sono())
    await rotina.excluirRegistro(criado.id)
    expect(chaveDe(await rotina.encerrarSessao(criado.id, iso(-MIN)))).toBe('registro_excluido')
  })
})

describe('excluir, restaurar e lixeira', () => {
  it('excluir é idempotente e o registro vai para a lixeira; restaurar o devolve', async () => {
    const criado = await gravado(fralda())
    expect(chaveDe(await rotina.excluirRegistro(criado.id))).toBe('ok')
    expect(chaveDe(await rotina.excluirRegistro(criado.id))).toBe('ok')
    const lixeira = await rotina.lixeira(ID_BEBE)
    if (!lixeira.ok) throw new Error('lixeira falhou')
    expect(lixeira.valor.itens.map((r) => r.id)).toEqual([criado.id])
    expect(chaveDe(await rotina.restaurarRegistro(criado.id))).toBe('ok')
    expect(chaveDe(await rotina.restaurarRegistro(criado.id))).toBe('ok')
    const depois = await rotina.lixeira(ID_BEBE)
    if (!depois.ok) throw new Error('lixeira falhou')
    expect(depois.valor.itens).toEqual([])
  })

  it('a lixeira lista só os restauráveis (menos de 30 dias), o excluído mais recente primeiro', async () => {
    const velho = await gravado(fralda())
    const novo = await gravado(fralda())
    await rotina.excluirRegistro(velho.id)
    vi.setSystemTime(Date.now() + 10 * 24 * HORA)
    await rotina.excluirRegistro(novo.id)
    vi.setSystemTime(Date.now() + 21 * 24 * HORA)
    const lixeira = await rotina.lixeira(ID_BEBE)
    if (!lixeira.ok) throw new Error('lixeira falhou')
    expect(lixeira.valor.itens.map((r) => r.id)).toEqual([novo.id])
  })

  it('aos 30 dias exatos o banco ainda restaura; depois disso é prazo_encerrado', async () => {
    const criado = await gravado(fralda())
    await rotina.excluirRegistro(criado.id)
    vi.setSystemTime(Date.now() + 30 * 24 * HORA)
    expect(chaveDe(await rotina.restaurarRegistro(criado.id))).toBe('ok')
    await rotina.excluirRegistro(criado.id)
    vi.setSystemTime(Date.now() + 30 * 24 * HORA + 1000)
    expect(chaveDe(await rotina.restaurarRegistro(criado.id))).toBe('prazo_encerrado')
  })

  it('o cuidador não exclui nem restaura o que é de outra pessoa', async () => {
    const dela = await gravado(fralda())
    entrar('bruno')
    expect(chaveDe(await rotina.excluirRegistro(dela.id))).toBe('sem_permissao')
    entrar('juliana')
    await rotina.excluirRegistro(dela.id)
    entrar('bruno')
    expect(chaveDe(await rotina.restaurarRegistro(dela.id))).toBe('sem_permissao')
  })

  it('o histórico de alterações não é entregue ao observador', async () => {
    montar({ papelDeDavi: 'observador' })
    const criado = await gravado(fralda())
    entrar('davi')
    const historico = await rotina.alteracoes(criado.id)
    expect(historico).toEqual({ ok: true, valor: { itens: [], incompleta: false } })
  })
})

describe('notas', () => {
  const nota = (extra = {}) => ({ id: uuidV7(), familiaId: ID_FAMILIA, texto: 'Pomada só à noite.', ...extra })

  it('grava, repete o id sem duplicar e lista a mais nova primeiro (do bebê ou da família toda)', async () => {
    const primeira = nota({ bebeId: ID_BEBE })
    expect(chaveDe(await rotina.gravarNota(primeira))).toBe('ok')
    expect(chaveDe(await rotina.gravarNota(primeira))).toBe('ok')
    vi.setSystemTime(Date.now() + MIN)
    const segunda = nota({ texto: 'Para a família toda' })
    await rotina.gravarNota(segunda)
    const lista = await rotina.notas(ID_FAMILIA, ID_BEBE)
    if (!lista.ok) throw new Error('notas falhou')
    expect(lista.valor.itens.map((n) => n.id)).toEqual([segunda.id, primeira.id, mundo.fixture.notas[0].id])
  })

  it('observador não grava; bebê que não é da família é nao_encontrado; bebê arquivado só aceita a família toda', async () => {
    montar({ papelDeDavi: 'observador' })
    entrar('davi')
    expect(chaveDe(await rotina.gravarNota(nota()))).toBe('sem_permissao')
    montar({ bebeArquivado: true })
    expect(chaveDe(await rotina.gravarNota(nota({ bebeId: ID_BEBE })))).toBe('bebe_arquivado')
    expect(chaveDe(await rotina.gravarNota(nota()))).toBe('ok')
    expect(chaveDe(await rotina.gravarNota(nota({ bebeId: uuidV7() })))).toBe('nao_encontrado')
  })

  it('editar e excluir: o cuidador só as suas; nota excluída não se edita; excluir de novo não muda nada', async () => {
    const dela = nota()
    await rotina.gravarNota(dela)
    entrar('bruno')
    expect(chaveDe(await rotina.editarNota(dela.id, 'Outro texto', null))).toBe('sem_permissao')
    expect(chaveDe(await rotina.excluirNota(dela.id))).toBe('sem_permissao')
    entrar('juliana')
    expect(chaveDe(await rotina.editarNota(dela.id, 'Outro texto', iso(HORA)))).toBe('ok')
    expect(chaveDe(await rotina.excluirNota(dela.id))).toBe('ok')
    expect(chaveDe(await rotina.excluirNota(dela.id))).toBe('ok')
    expect(chaveDe(await rotina.editarNota(dela.id, 'Mais um', null))).toBe('nota_excluida')
  })

  it('texto vazio ou acima de 500 é recusado', async () => {
    expect(chaveDe(await rotina.gravarNota(nota({ texto: '' })))).toBe('parametro_obrigatorio')
    expect(chaveDe(await rotina.gravarNota(nota({ texto: 'a'.repeat(501) })))).toBe('valor_invalido')
    expect(chaveDe(await rotina.gravarNota(nota({ texto: 'a'.repeat(500) })))).toBe('ok')
  })
})

describe('leituras', () => {
  it('emAndamento: as sessões do bebê, a de início mais recente primeiro', async () => {
    const maisNova = await gravado(sono({ inicio: iso(-5 * MIN) }))
    const lista = await rotina.emAndamento(ID_BEBE)
    if (!lista.ok) throw new Error('leitura falhou')
    expect(lista.valor.itens.map((r) => r.id)[0]).toBe(maisNova.id)
    expect(lista.valor.itens.every((r) => r.fim === null)).toBe(true)
    expect(lista.valor.itens).toHaveLength(2)
  })

  it('ultimosConcluidos: um por tipo, pelo momento (fim nas sessões), do mais recente ao mais antigo', async () => {
    const lista = await rotina.ultimosConcluidos(ID_BEBE)
    if (!lista.ok) throw new Error('leitura falhou')
    // Fralda há 50 min, mamada (fim) há 2 h 10, sono (fim, o em andamento não entra) há 3 h 20, mamadeira
    // há 8 h e tummy time (fim) há 16 h 30.
    expect(lista.valor.map((r) => r.tipo)).toEqual(['fralda', 'mamada', 'sono', 'mamadeira', 'tummy'])
    expect(lista.valor.every((r) => r.tipo !== 'sono' || r.fim !== null)).toBe(true)
  })

  it('desdeMeuUltimo: o marco é o registro da conta com o maior recebido_em; os novos são de outras pessoas', async () => {
    const lista = await rotina.desdeMeuUltimo(ID_BEBE, PESSOAS.juliana.id)
    if (!lista.ok) throw new Error('leitura falhou')
    expect(lista.valor.marco?.criadoPor).toBe(PESSOAS.juliana.id)
    expect(lista.valor.novos.length).toBeGreaterThan(0)
    expect(lista.valor.novos.every((r) => r.criadoPor !== PESSOAS.juliana.id)).toBe(true)
    const marco = Date.parse(lista.valor.marco!.recebidoEm)
    expect(lista.valor.novos.every((r) => Date.parse(r.recebidoEm) > marco)).toBe(true)
  })

  it('doDia segue o dia da família, e o resultado vem em ordem de início', async () => {
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).format(Date.now())
    const lista = await rotina.doDia(ID_BEBE, hoje)
    if (!lista.ok) throw new Error('leitura falhou')
    const inicios = lista.valor.itens.map((r) => Date.parse(r.inicio))
    expect(inicios).toEqual([...inicios].sort((a, b) => a - b))
    expect(lista.valor.itens.length).toBeGreaterThan(0)
  })

  it('o limite de lista: passou do limite devolve só as primeiras e marca incompleta', async () => {
    const base = mundo.fixture.registros[1]
    montar({
      ajustarRotina: (f) => ({
        ...f,
        registros: [
          ...f.registros,
          ...Array.from({ length: LIMITES.doIntervalo + 1 }, (_, i) => ({ ...base, id: uuidV7(), inicio: iso(-(i + 1) * 1000) })),
        ],
      }),
    })
    const cheia = await rotina.doIntervalo(ID_BEBE, iso(-24 * HORA), iso(HORA))
    if (!cheia.ok) throw new Error('leitura falhou')
    expect(cheia.valor.itens).toHaveLength(LIMITES.doIntervalo)
    expect(cheia.valor.incompleta).toBe(true)
    const curta = await rotina.doIntervalo(ID_BEBE, iso(-60 * 1000), iso(HORA))
    if (!curta.ok) throw new Error('leitura falhou')
    expect(curta.valor.incompleta).toBe(false)
  })

  it('leitura sem acesso dá zero linhas, sem erro; registro sem acesso é null', async () => {
    const alvo = mundo.fixture.registros[0]
    entrar('davi')
    expect(await rotina.emAndamento(ID_BEBE)).toEqual({ ok: true, valor: { itens: [], incompleta: false } })
    expect(await rotina.doIntervalo(ID_BEBE, iso(-HORA), iso(HORA))).toEqual({ ok: true, valor: { itens: [], incompleta: false } })
    expect(await rotina.registro(alvo.id)).toEqual({ ok: true, valor: null })
    expect(await rotina.notas(ID_FAMILIA, ID_BEBE)).toEqual({ ok: true, valor: { itens: [], incompleta: false } })
    expect(await rotina.lixeira(ID_BEBE)).toEqual({ ok: true, valor: { itens: [], incompleta: false } })
  })

  it('sessoesDaJanela traz as sessões concluídas que cruzam a janela, só sono e tummy por padrão', async () => {
    const lista = await rotina.sessoesDaJanela(ID_BEBE, iso(-5 * HORA), iso(0))
    if (!lista.ok) throw new Error('leitura falhou')
    expect(lista.valor.itens.every((r) => r.tipo === 'sono' || r.tipo === 'tummy')).toBe(true)
    expect(lista.valor.itens.every((r) => r.fim !== null)).toBe(true)
    expect(lista.valor.itens.length).toBeGreaterThan(0)
  })
})

describe('simulação de falhas (só nos testes)', () => {
  it('a falha programada vale uma chamada só e não muda nada', async () => {
    simularFalhaRotina(rotina, 'gravarRegistro', 'rede')
    const entrada = fralda()
    const falha = await rotina.gravarRegistro(entrada)
    expect(falha.ok).toBe(false)
    if (!falha.ok) expect(falha.erro.chave).toBe('rede')
    expect(chaveDe(await rotina.gravarRegistro(entrada))).toBe('ok')
  })

  it('a resposta perdida grava e devolve rede; repetir com o mesmo id não duplica', async () => {
    simularRespostaPerdidaRotina(rotina, 'gravarRegistro')
    const entrada = fralda()
    expect(chaveDe(await rotina.gravarRegistro(entrada))).toBe('rede')
    expect(chaveDe(await rotina.gravarRegistro(entrada))).toBe('ok')
    const lista = await rotina.doIntervalo(ID_BEBE, iso(-HORA), iso(HORA))
    if (!lista.ok) throw new Error('leitura falhou')
    expect(lista.valor.itens.filter((r) => r.id === entrada.id)).toHaveLength(1)
  })
})
