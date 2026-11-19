import { describe, expect, it } from 'vitest'
import { criarFixtureDeTeste, PESSOAS } from '../teste/renderizarComDados.tsx'
import { criarMundoDeTeste, ID_BEBE, ID_FAMILIA, type OpcoesMundo } from '../teste/rotina.fixture.ts'
import { criarDadosAvisosMemoria } from './avisos.memoria.ts'
import type { Aviso, DadosAvisos, EstadoDosAvisos } from './avisos.ts'
import type { DadosConta } from './conta.ts'
import { criarDadosContaMemoria, simularFalha } from './conta.memoria.ts'
import { FAMILIAS_DEMONSTRACAO } from './conta.demonstracao.ts'
import { criarDadosRotinaMemoria, simularFalhaRotina } from './rotina.memoria.ts'
import type { Nota } from './rotina.tipos.ts'

// O contrato do modo memória (RF14:RF-03, RF-05, RF-10, RF-13, RF-14, RF-15, RF-16, RN-06): a memória
// compõe a conta e a rotina em memória só pelas operações públicas e usa o relógio da memória.

const SEGUNDO = 1000
const HORA = 3_600_000
const AGORA = Date.parse('2026-11-15T15:00:00.000Z')
const iso = (instante: number) => new Date(instante).toISOString()
const emJson = (instante: number) => iso(instante).replace(/\.(\d{3})Z$/, '.$1000Z')

const idDaNota = (numero: number) => `a1000000-0000-7000-8000-${String(numero).padStart(12, '0')}`

function nota(numero: number, extra: Partial<Nota> = {}): Nota {
  const criadaEm = extra.criadaEm ?? iso(AGORA - numero * SEGUNDO)
  return {
    id: idDaNota(numero),
    familiaId: ID_FAMILIA,
    bebeId: null,
    texto: `Texto da nota ${numero}`,
    destaqueAte: null,
    criadoPor: PESSOAS.icaro.id,
    criadaEm,
    versao: 1,
    atualizadoEm: criadaEm,
    excluidaEm: null,
    excluidaPor: null,
    ...extra,
  }
}

interface Cenario extends OpcoesMundo {
  notas?: Nota[]
}

function montar({ notas = [], ...opcoes }: Cenario = {}) {
  const mundo = criarMundoDeTeste({
    semRegistros: true,
    ...opcoes,
    ajustarRotina: (fixture) => ({ ...fixture, notas }),
  })
  const avisos: DadosAvisos = criarDadosAvisosMemoria(mundo.conta, mundo.rotina, { agora: () => AGORA })
  return { ...mundo, avisos }
}

async function estado(avisos: DadosAvisos): Promise<EstadoDosAvisos> {
  const lido = await avisos.lerEstado()
  if (!lido.ok) throw new Error(`leitura falhou: ${lido.erro.chave}`)
  return lido.valor
}

/** Liga os avisos e devolve os ids dos avisos, na ordem da lista. */
async function idsLigados(avisos: DadosAvisos): Promise<string[]> {
  expect((await avisos.definirLigados(true)).ok).toBe(true)
  return (await estado(avisos)).avisos.map((a: Aviso) => a.id)
}

const exportado = async (conta: Pick<DadosConta, 'exportarDados'>) => {
  const lido = await conta.exportarDados()
  if (!lido.ok) throw new Error('exportação falhou')
  return lido.valor as Record<string, unknown>
}

describe('RF14:RF-03 a preferência é da conta e vale na mesma página', () => {
  it('começa desligada, e ligar vale na leitura seguinte', async () => {
    const { avisos } = montar()
    expect(await estado(avisos)).toEqual({ ligados: false, avisos: [], maisDe50: false })
    expect(await avisos.definirLigados(true)).toEqual({ ok: true, valor: null })
    expect((await estado(avisos)).ligados).toBe(true)
    expect(await avisos.definirLigados(false)).toEqual({ ok: true, valor: null })
    expect((await estado(avisos)).ligados).toBe(false)
  })

  it('a preferência é de cada conta: ligar como Juliana não liga para Ícaro', async () => {
    const { avisos, conta } = montar()
    await avisos.definirLigados(true)
    conta.sessaoParaTeste(PESSOAS.icaro.email)
    expect((await estado(avisos)).ligados).toBe(false)
    conta.sessaoParaTeste(PESSOAS.juliana.email)
    expect((await estado(avisos)).ligados).toBe(true)
  })

  it('a demonstração: Juliana liga e vê exatamente a nota de Ícaro (RF14:RF-17)', async () => {
    const { avisos } = montar({
      notas: [
        nota(1, { texto: 'Fraldas P no armário de cima.', criadoPor: PESSOAS.icaro.id }),
        nota(2, { texto: 'Pomada só à noite.', criadoPor: PESSOAS.juliana.id }),
      ],
    })
    await avisos.definirLigados(true)
    const lido = await estado(avisos)
    expect(lido.avisos.map((a) => a.texto)).toEqual(['Fraldas P no armário de cima.'])
    expect(lido.avisos[0]).toMatchObject({ familiaNome: 'Família Exemplo', autor: { tipo: 'nome', nome: 'Ícaro' } })
  })

  // Controle negativo: o auxiliar que confere a regra lança quando o valor esperado é o contrário.
  async function conferirPreferencia(esperado: boolean) {
    const { avisos } = montar()
    await avisos.definirLigados(true)
    expect((await estado(avisos)).ligados).toBe(esperado)
  }

  it('controle negativo: esperar o valor contrário ao guardado faz a conferência falhar', async () => {
    await conferirPreferencia(true)
    await expect(conferirPreferencia(false)).rejects.toThrow()
  })
})

describe('RF14:RF-13 desligado não há aviso; desligar guarda o visto até; ligar de novo não zera nada', () => {
  it('desligado: zero avisos e a marca falsa, mesmo com notas novas', async () => {
    const { avisos } = montar({ notas: [nota(1), nota(2)] })
    expect(await estado(avisos)).toEqual({ ligados: false, avisos: [], maisDe50: false })
    await avisos.definirLigados(true)
    expect((await estado(avisos)).avisos).toHaveLength(2)
    await avisos.definirLigados(false)
    expect(await estado(avisos)).toEqual({ ligados: false, avisos: [], maisDe50: false })
  })

  it('desligar e ligar de novo mantém o visto até: só o que veio depois dele conta', async () => {
    const { avisos, conta } = montar({ notas: [nota(60), nota(30), nota(10)] })
    await avisos.definirLigados(true)
    await avisos.marcarVistos(iso(AGORA - 30 * SEGUNDO))
    await avisos.definirLigados(false)
    await avisos.definirLigados(true)
    expect((await estado(avisos)).avisos.map((a) => a.id)).toEqual([idDaNota(10)])
    expect((await exportado(conta)).avisos).toEqual({ ligados: true, vistos_ate: emJson(AGORA - 30 * SEGUNDO) })
  })

  it('controle negativo: esperar o visto até zerado depois de desligar e ligar falha', async () => {
    const { avisos, conta } = montar({ notas: [nota(60), nota(30), nota(10)] })
    await avisos.definirLigados(true)
    await avisos.marcarVistos(iso(AGORA - 30 * SEGUNDO))
    await avisos.definirLigados(false)
    await avisos.definirLigados(true)
    const guardado = ((await exportado(conta)).avisos as { vistos_ate: string | null }).vistos_ate
    expect(() => expect(guardado).toBeNull()).toThrow()
  })
})

describe('RF14:RF-05 o que é um aviso', () => {
  it('(a) nota de uma família onde a conta não tem vínculo não conta', async () => {
    const { avisos } = montar({ notas: [nota(1), nota(2, { familiaId: FAMILIAS_DEMONSTRACAO.teste })] })
    expect(await idsLigados(avisos)).toEqual([idDaNota(1)])
  })

  it('(b) a nota da própria conta não conta; a de autor apagado (nulo) conta', async () => {
    const { avisos } = montar({
      notas: [nota(1, { criadoPor: PESSOAS.juliana.id }), nota(2, { criadoPor: null }), nota(3, { criadoPor: PESSOAS.icaro.id })],
    })
    expect(await idsLigados(avisos)).toEqual([idDaNota(2), idDaNota(3)])
    const removido = (await estado(avisos)).avisos[0]
    expect(removido.autor).toEqual({ tipo: 'removido' })
  })

  it('controle negativo: esperar a própria nota entre os avisos falha', async () => {
    const { avisos } = montar({ notas: [nota(1, { criadoPor: PESSOAS.juliana.id }), nota(2)] })
    const ids = await idsLigados(avisos)
    expect(() => expect(ids).toContain(idDaNota(1))).toThrow()
  })

  it('(c) a nota na lixeira não conta, na fixture e depois de excluída pela operação pública', async () => {
    const { avisos, rotina } = montar({
      notas: [nota(1, { excluidaEm: iso(AGORA - SEGUNDO), excluidaPor: PESSOAS.juliana.id }), nota(2), nota(3)],
    })
    expect(await idsLigados(avisos)).toEqual([idDaNota(2), idDaNota(3)])
    expect((await rotina.excluirNota(idDaNota(2))).ok).toBe(true)
    expect((await estado(avisos)).avisos.map((a) => a.id)).toEqual([idDaNota(3)])
  })

  it('(c2) RF-05 restored note: a nota restaurada da lixeira volta a ser aviso', async () => {
    const { conta, rotina } = montar({ notas: [nota(1), nota(2)] })
    let naLixeira = true
    const rotinaIsolada: typeof rotina = {
      ...rotina,
      notas: async (...args: Parameters<typeof rotina.notas>) => {
        const lido = await rotina.notas(...args)
        if (!lido.ok) return lido
        return {
          ...lido,
          valor: {
            ...lido.valor,
            itens: lido.valor.itens.map((n: Nota) =>
              n.id === idDaNota(1) && naLixeira ? { ...n, excluidaEm: iso(AGORA - SEGUNDO), excluidaPor: PESSOAS.juliana.id } : n,
            ),
          },
        }
      },
    }
    const avisos: DadosAvisos = criarDadosAvisosMemoria(conta, rotinaIsolada, { agora: () => AGORA })
    expect(await idsLigados(avisos)).toEqual([idDaNota(2)])
    naLixeira = false
    expect((await estado(avisos)).avisos.map((a) => a.id)).toEqual([idDaNota(1), idDaNota(2)])
    naLixeira = true
    expect((await estado(avisos)).avisos.map((a) => a.id)).toEqual([idDaNota(2)])
  })

  it('(d) a janela de 168 h: dentro por 1 s entra, no limite exato sai, agora entra, futuro não', async () => {
    const { avisos } = montar({
      notas: [
        nota(1, { criadaEm: iso(AGORA - 168 * HORA + SEGUNDO) }),
        nota(2, { criadaEm: iso(AGORA - 168 * HORA) }),
        nota(3, { criadaEm: iso(AGORA - 168 * HORA - SEGUNDO) }),
        nota(4, { criadaEm: iso(AGORA) }),
        nota(5, { criadaEm: iso(AGORA + SEGUNDO) }),
      ],
    })
    expect(await idsLigados(avisos)).toEqual([idDaNota(4), idDaNota(1)])
  })

  it('(e) o visto até: criada no instante dele não é aviso; um segundo depois é', async () => {
    const { avisos } = montar({
      notas: [nota(30, { criadaEm: iso(AGORA - 30 * SEGUNDO) }), nota(29, { criadaEm: iso(AGORA - 29 * SEGUNDO) }), nota(31, { criadaEm: iso(AGORA - 31 * SEGUNDO) })],
    })
    await avisos.definirLigados(true)
    await avisos.marcarVistos(iso(AGORA - 30 * SEGUNDO))
    expect((await estado(avisos)).avisos.map((a) => a.id)).toEqual([idDaNota(29)])
  })

  it('o bebê não importa: nota de bebê arquivado e nota da família inteira entram', async () => {
    const { avisos } = montar({
      bebeArquivado: true,
      notas: [nota(1, { bebeId: ID_BEBE }), nota(2, { bebeId: null })],
    })
    expect(await idsLigados(avisos)).toEqual([idDaNota(1), idDaNota(2)])
  })

  it('uma nota por bebê de dois bebês: as duas são achadas, e a da família inteira vem uma vez só', async () => {
    const OUTRO = 'c2222222-2222-4222-8222-222222222222'
    const { avisos } = montar({
      bebesExtras: [{ id: OUTRO, nome: 'Teo', nascimento: '2026-09-01', estado: 'ativo' }],
      notas: [nota(1, { bebeId: ID_BEBE }), nota(2, { bebeId: OUTRO }), nota(3, { bebeId: null })],
    })
    expect(await idsLigados(avisos)).toEqual([idDaNota(1), idDaNota(2), idDaNota(3)])
  })

  it('a ordem é da mais nova para a mais velha, e no empate pelo id, do maior para o menor', async () => {
    const mesma = iso(AGORA - 5 * SEGUNDO)
    const { avisos } = montar({
      notas: [nota(1, { criadaEm: mesma }), nota(2, { criadaEm: mesma }), nota(3, { criadaEm: iso(AGORA - 9 * SEGUNDO) }), nota(4, { criadaEm: iso(AGORA - SEGUNDO) })],
    })
    expect(await idsLigados(avisos)).toEqual([idDaNota(4), idDaNota(2), idDaNota(1), idDaNota(3)])
  })

  it('o observador recebe avisos', async () => {
    const { avisos } = montar({ sessao: 'davi', papelDeDavi: 'observador', notas: [nota(1)] })
    expect(await idsLigados(avisos)).toEqual([idDaNota(1)])
  })

  it('o autor: nome só com vínculo ativo; quem saiu vira "saiu", sem nome', async () => {
    const { avisos, conta } = montar({ notas: [nota(1, { criadoPor: PESSOAS.icaro.id }), nota(2, { criadoPor: PESSOAS.carla.id })] })
    await avisos.definirLigados(true)
    const antes = (await estado(avisos)).avisos
    expect(antes.map((a) => a.autor)).toEqual([{ tipo: 'nome', nome: 'Ícaro' }, { tipo: 'nome', nome: 'Carla' }])
    const detalhe = await conta.detalheFamilia(ID_FAMILIA)
    if (!detalhe.ok) throw new Error('detalhe falhou')
    const vinculoDeIcaro = detalhe.valor.membros.find((m) => m.contaId === PESSOAS.icaro.id)!.vinculoId
    expect((await conta.revogarVinculo(vinculoDeIcaro)).ok).toBe(true)
    const depois = (await estado(avisos)).avisos
    expect(depois.map((a) => a.autor)).toEqual([{ tipo: 'saiu' }, { tipo: 'nome', nome: 'Carla' }])
    expect(JSON.stringify(depois[0])).not.toContain('Ícaro')
  })

  it('quando o vínculo do leitor acaba, as notas daquela família deixam de ser avisos', async () => {
    const { avisos, conta } = montar({ papelDeDavi: 'observador', sessao: 'davi', notas: [nota(1)] })
    expect(await idsLigados(avisos)).toEqual([idDaNota(1)])
    conta.sessaoParaTeste(PESSOAS.juliana.email)
    const detalhe = await conta.detalheFamilia(ID_FAMILIA)
    if (!detalhe.ok) throw new Error('detalhe falhou')
    const vinculoDeDavi = detalhe.valor.membros.find((m) => m.contaId === PESSOAS.davi.id)!.vinculoId
    expect((await conta.revogarVinculo(vinculoDeDavi)).ok).toBe(true)
    conta.sessaoParaTeste(PESSOAS.davi.email)
    expect(await estado(avisos)).toEqual({ ligados: true, avisos: [], maisDe50: false })
  })

  it('o leitor que sai da família pela operação pública: nenhuma nota dela é mais aviso', async () => {
    const { avisos, conta } = montar({ papelDeDavi: 'observador', sessao: 'davi', notas: [nota(1), nota(2, { familiaId: ID_FAMILIA })] })
    expect(await idsLigados(avisos)).toEqual([idDaNota(1), idDaNota(2)])
    expect((await conta.sairDaFamilia(ID_FAMILIA)).ok).toBe(true)
    expect(await estado(avisos)).toEqual({ ligados: true, avisos: [], maisDe50: false })
  })

  it('o vínculo do leitor que vence com o relógio da memória: nenhuma nota da família é mais aviso', async () => {
    let relogioDaConta = Date.now()
    const base = criarFixtureDeTeste(relogioDaConta)
    const conta = criarDadosContaMemoria(
      {
        ...base,
        vinculos: [
          ...base.vinculos,
          {
            id: 'b5555555-5555-4555-8555-555555555555',
            familiaId: ID_FAMILIA,
            contaId: PESSOAS.davi.id,
            papel: 'observador',
            estado: 'ativo',
            validoAte: iso(relogioDaConta + 2 * 24 * HORA),
            criadoEm: iso(relogioDaConta - 27 * 24 * HORA),
            concedidoPor: PESSOAS.juliana.id,
          },
        ],
      },
      { agora: () => relogioDaConta },
    )
    conta.sessaoParaTeste(PESSOAS.davi.email)
    const rotina = criarDadosRotinaMemoria(conta, { registros: [], notas: [nota(1)] }, { agora: () => relogioDaConta })
    const avisos = criarDadosAvisosMemoria(conta, rotina, { agora: () => AGORA })
    expect(await idsLigados(avisos)).toEqual([idDaNota(1)])
    relogioDaConta += 3 * 24 * HORA
    expect(await estado(avisos)).toEqual({ ligados: true, avisos: [], maisDe50: false })
  })

  it('a destaque e a família vêm como estão: destaque até, nome e fuso da família', async () => {
    const ate = iso(AGORA + 24 * HORA)
    const { avisos } = montar({ notas: [nota(1, { destaqueAte: ate })] })
    await avisos.definirLigados(true)
    expect((await estado(avisos)).avisos[0]).toMatchObject({ destaqueAte: ate, familiaNome: 'Família Exemplo', criadaEm: iso(AGORA - SEGUNDO) })
    expect(typeof (await estado(avisos)).avisos[0].familiaFuso).toBe('string')
  })

  it('51 avisos: 50 itens e a marca "mais de 50"; 50 avisos: sem a marca', async () => {
    const cinquentaEUm = Array.from({ length: 51 }, (_, i) => nota(i + 1))
    const cheio = montar({ notas: cinquentaEUm })
    await cheio.avisos.definirLigados(true)
    const lido = await estado(cheio.avisos)
    expect(lido.avisos).toHaveLength(50)
    expect(lido.maisDe50).toBe(true)
    expect(lido.avisos[0].id).toBe(idDaNota(1))
    const justo = montar({ notas: cinquentaEUm.slice(0, 50) })
    await justo.avisos.definirLigados(true)
    const exato = await estado(justo.avisos)
    expect(exato.avisos).toHaveLength(50)
    expect(exato.maisDe50).toBe(false)
  })
})

describe('RF14:RF-10 o visto até vale o maior entre o guardado e o enviado, nunca depois de agora', () => {
  const guardado = async (conta: Pick<DadosConta, 'exportarDados'>) =>
    ((await exportado(conta)).avisos as { vistos_ate: string | null }).vistos_ate

  it('o valor enviado é guardado; um valor mais velho não o faz recuar', async () => {
    const { avisos, conta } = montar()
    await avisos.marcarVistos(iso(AGORA - 60 * SEGUNDO))
    expect(await guardado(conta)).toBe(emJson(AGORA - 60 * SEGUNDO))
    await avisos.marcarVistos(iso(AGORA - 120 * SEGUNDO))
    expect(await guardado(conta)).toBe(emJson(AGORA - 60 * SEGUNDO))
    await avisos.marcarVistos(iso(AGORA - 10 * SEGUNDO))
    expect(await guardado(conta)).toBe(emJson(AGORA - 10 * SEGUNDO))
  })

  it('um valor do futuro é guardado como agora, sem erro', async () => {
    const { avisos, conta } = montar()
    expect(await avisos.marcarVistos(iso(AGORA + 5 * HORA))).toEqual({ ok: true, valor: null })
    expect(await guardado(conta)).toBe(emJson(AGORA))
  })

  it('uma nota criada depois do instante enviado continua sendo aviso', async () => {
    const { avisos } = montar({ notas: [nota(60), nota(10)] })
    await avisos.definirLigados(true)
    await avisos.marcarVistos(iso(AGORA - 30 * SEGUNDO))
    expect((await estado(avisos)).avisos.map((a) => a.id)).toEqual([idDaNota(10)])
  })

  it('marcar vale com a preferência desligada', async () => {
    const { avisos, conta } = montar()
    expect((await estado(avisos)).ligados).toBe(false)
    expect((await avisos.marcarVistos(iso(AGORA - 5 * SEGUNDO))).ok).toBe(true)
    expect(await guardado(conta)).toBe(emJson(AGORA - 5 * SEGUNDO))
  })

  it('um instante que não é data é erro, não valor guardado', async () => {
    const { avisos, conta } = montar()
    const lido = await avisos.marcarVistos('ontem')
    expect(lido.ok).toBe(false)
    expect(await guardado(conta)).toBeNull()
  })
})

describe('RF14:RF-14 só a conta que chama lê e muda os seus dados', () => {
  it('sem ninguém entrado, as três operações devolvem o erro de sessão encerrada', async () => {
    const { avisos } = montar({ sessao: null })
    for (const lido of [await avisos.lerEstado(), await avisos.definirLigados(true), await avisos.marcarVistos(iso(AGORA))]) {
      expect(lido.ok).toBe(false)
      expect(!lido.ok && lido.erro.classe).toBe('sessao_encerrada')
    }
  })

  it('a conta de outra pessoa não é alcançada: Ícaro marca o visto dele e Juliana continua sem', async () => {
    const { avisos, conta } = montar()
    conta.sessaoParaTeste(PESSOAS.icaro.email)
    await avisos.marcarVistos(iso(AGORA - SEGUNDO))
    conta.sessaoParaTeste(PESSOAS.juliana.email)
    expect(((await exportado(conta)).avisos as { vistos_ate: string | null }).vistos_ate).toBeNull()
  })

  it('uma falha da conta chega a quem chamou, sem virar zero em silêncio', async () => {
    const { avisos, conta } = montar({ notas: [nota(1)] })
    await avisos.definirLigados(true)
    simularFalha(conta, 'sessaoAtual', 'rede')
    const lido = await avisos.lerEstado()
    expect(!lido.ok && lido.erro.classe).toBe('rede')
    expect((await estado(avisos)).avisos).toHaveLength(1)
  })
})

describe('RF14:RF-15 a exportação ganha a chave avisos, nos dois modos', () => {
  const CHAVES_ANTES = ['formato', 'gerado_em', 'conta', 'vinculos', 'familias', 'registros', 'notas']

  it('uma conta que nunca mudou nada exporta desligado e sem visto até', async () => {
    const { conta } = montar()
    const dados = await exportado(conta)
    expect(Object.keys(dados)).toEqual([...CHAVES_ANTES, 'avisos'])
    expect(dados.avisos).toEqual({ ligados: false, vistos_ate: null })
    expect(dados.formato).toBe('appmaternidade-exportacao-v1')
  })

  it('depois das mudanças exporta os valores guardados, no formato de data da exportação', async () => {
    const { avisos, conta } = montar()
    await avisos.definirLigados(true)
    await avisos.marcarVistos(iso(AGORA - 3 * SEGUNDO))
    expect((await exportado(conta)).avisos).toEqual({ ligados: true, vistos_ate: emJson(AGORA - 3 * SEGUNDO) })
  })
})

describe('RF14:RF-16 excluir a conta não deixa preferência nem visto até', () => {
  it('depois da exclusão, uma conta nova com o mesmo e-mail lê desligado e sem visto até', async () => {
    const { avisos, conta } = montar({ sessao: 'icaro' })
    await avisos.definirLigados(true)
    await avisos.marcarVistos(iso(AGORA - SEGUNDO))
    expect((await conta.excluirConta()).ok).toBe(true)
    expect((await conta.criarUsuario(PESSOAS.icaro.email, 'uma-senha-forte-1', 'Ícaro', '/app/comecar')).ok).toBe(true)
    expect((await conta.criarMinhaConta('Ícaro', 'America/Sao_Paulo')).ok).toBe(true)
    expect(await estado(avisos)).toEqual({ ligados: false, avisos: [], maisDe50: false })
    expect((await exportado(conta)).avisos).toEqual({ ligados: false, vistos_ate: null })
  })
})

describe('RF14:RN-06 os erros não carregam texto de nota nem nome', () => {
  const MARCADOR = 'TEXTO-SECRETO-DA-NOTA'

  it('uma falha da rotina ou da conta chega sem o texto da nota e sem o nome do autor', async () => {
    const operacoesDaRotina = ['contexto', 'notas'] as const
    for (const operacao of operacoesDaRotina) {
      const { avisos, rotina } = montar({ notas: [nota(1, { texto: MARCADOR })] })
      await avisos.definirLigados(true)
      simularFalhaRotina(rotina, operacao, 'rede')
      const lido = await avisos.lerEstado()
      expect(lido.ok, operacao).toBe(false)
      const texto = JSON.stringify(lido)
      expect(texto).not.toContain(MARCADOR)
      expect(texto).not.toContain('Ícaro')
      expect(texto).not.toContain('Juliana')
    }
  })

  it('controle negativo: o marcador no valor lido (o caso feliz) é achado, então a conferência sabe achar', async () => {
    const { avisos } = montar({ notas: [nota(1, { texto: MARCADOR })] })
    await avisos.definirLigados(true)
    const lido = await avisos.lerEstado()
    expect(() => expect(JSON.stringify(lido)).not.toContain(MARCADOR)).toThrow()
  })
})

describe('RF14:RN-06 nenhum erro devolvido pelas operações carrega a mensagem de origem das dependências', () => {
  const MARCADOR = 'MARCADOR-NOTA-E-NOME'

  const falhaComMensagem = () => ({
    ok: false as const,
    erro: { classe: 'sem_permissao' as const, chave: 'sem_permissao', codigo: '42501', mensagemOriginal: MARCADOR },
  })

  /** O JSON de um valor, com a mensagem de um `Error` incluída (o `JSON.stringify` a esconde). */
  const serializar = (valor: unknown) =>
    JSON.stringify(valor, (_chave, item) => (item instanceof Error ? { nome: item.name, mensagem: item.message } : item))

  type Alvo = 'conta' | 'rotina'
  type Operacao = 'lerEstado' | 'definirLigados' | 'marcarVistos'

  const CAMINHOS: Array<[Alvo, string, Operacao]> = [
    ['conta', 'sessaoAtual', 'lerEstado'],
    ['conta', 'minhaConta', 'definirLigados'],
    ['conta', 'minhaConta', 'marcarVistos'],
    ['rotina', 'contexto', 'lerEstado'],
    ['rotina', 'notas', 'lerEstado'],
  ]

  for (const [alvo, dependencia, operacao] of CAMINHOS) {
    for (const modo of ['resultado com falha', 'rejeição'] as const) {
      it(`${operacao}: ${alvo}.${dependencia} com ${modo} devolve erro, sem o marcador no JSON e com a classe mantida`, async () => {
        const mundo = montar({ notas: [nota(1, { texto: 'Uma nota qualquer' })] })
        let quebrar = false
        const falhar = () => (modo === 'resultado com falha' ? Promise.resolve(falhaComMensagem()) : Promise.reject(new Error(MARCADOR)))
        const original = (mundo[alvo] as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>)[dependencia]
        const embrulhada = {
          ...mundo[alvo],
          [dependencia]: (...args: unknown[]) => (quebrar ? falhar() : original(...args)),
        }
        const avisos = criarDadosAvisosMemoria(
          (alvo === 'conta' ? embrulhada : mundo.conta) as typeof mundo.conta,
          (alvo === 'rotina' ? embrulhada : mundo.rotina) as typeof mundo.rotina,
          { agora: () => AGORA },
        )
        // Liga com tudo funcionando, e só depois quebra a dependência.
        expect((await avisos.definirLigados(true)).ok).toBe(true)
        quebrar = true

        const resultado = await (operacao === 'lerEstado'
          ? avisos.lerEstado()
          : operacao === 'definirLigados'
            ? avisos.definirLigados(false)
            : avisos.marcarVistos(iso(AGORA))
        ).then(
          (lido) => lido as { ok: boolean; erro?: { classe: string; chave: string; codigo: string } },
          (lancado: unknown) => ({ ok: true as boolean, erro: undefined, lancou: serializar(lancado) }),
        )

        // (1) um resultado com falha, nunca uma rejeição e nunca uma lista vazia de sucesso.
        expect(resultado.ok).toBe(false)
        // (2) o marcador não aparece em lugar nenhum do valor.
        expect(serializar(resultado)).not.toContain(MARCADOR)
        // (3) a classificação é mantida.
        if (modo === 'resultado com falha') {
          expect(resultado.erro).toMatchObject({ classe: 'sem_permissao', chave: 'sem_permissao', codigo: '42501' })
        } else {
          expect(typeof resultado.erro?.classe).toBe('string')
          expect(typeof resultado.erro?.chave).toBe('string')
        }
      })
    }
  }
})
