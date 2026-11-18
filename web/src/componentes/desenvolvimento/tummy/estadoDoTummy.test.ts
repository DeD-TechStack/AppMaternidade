import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { AcaoDoTummy, ConfirmacaoDoBloco, ContextoDoBloco, ErroDoBloco, EstadoDoTummy, PainelAberto } from './estadoDoTummy.ts'

// O reducer do bloco de tummy time (Q-6): cada transição que o gancho fazia com vários setters vira uma ação.
// O módulo é carregado dentro de cada teste para que, sem ele, cada teste falhe na própria asserção.
const carregar = () => import('./estadoDoTummy.ts')

const contexto: ContextoDoBloco = { contaId: 'conta-1', papel: 'responsavel', arquivado: false, membros: [], acessoPerdido: false }
const perdido: ContextoDoBloco = { contaId: 'conta-1', papel: 'observador', arquivado: false, membros: [], acessoPerdido: true }
const lido = { bloco: { emAndamento: [], sessoes: [], incompleta: false }, agora: 1_000 }
const erro: ErroDoBloco = { chave: 'semResposta', texto: 'Sem resposta', onde: 'painel', controle: 'salvar', repetivel: true, bloqueia: false }
const confirmacao: ConfirmacaoDoBloco = { texto: 'Registrado', foco: ['abrir', 'iniciar'], desfazer: { tipo: 'excluir', id: 'id-1' } }
const painel: PainelAberto = { tipo: 'agora', id: 'id-1', abertoEm: 5 }
const entrada = { duracao: '5', dia: '', inicio: '', fim: '' }

async function aplicar(...acoes: AcaoDoTummy[]): Promise<EstadoDoTummy> {
  const { estadoInicial, reduzir } = await carregar()
  return acoes.reduce(reduzir, estadoInicial)
}

describe('estado inicial do tummy', () => {
  it('começa carregando, sem nada na tela', async () => {
    const { estadoInicial } = await carregar()
    expect(estadoInicial).toEqual({
      leitura: 'carregando',
      lido: null,
      contexto: null,
      ondePendente: null,
      erro: null,
      confirmacao: null,
      salvoSemAtualizar: false,
      painel: null,
      passo: null,
      erroDeCampo: null,
      indiceDoDia: 0,
      arquivadoPeloErro: false,
      pedidoDeFoco: { n: 0, chaves: [] },
      pedido: 0,
    })
  })
})

describe('leitura do bloco', () => {
  it('lerComecou guarda o número do pedido', async () => {
    expect((await aplicar({ tipo: 'lerComecou', numero: 3 })).pedido).toBe(3)
  })

  it('lidoOk guarda contexto e leitura e marca a leitura como ok', async () => {
    const estado = await aplicar({ tipo: 'lerComecou', numero: 1 }, { tipo: 'lidoOk', numero: 1, contexto, lido })
    expect(estado.leitura).toBe('ok')
    expect(estado.contexto).toBe(contexto)
    expect(estado.lido).toBe(lido)
  })

  it('lidoAcessoPerdido guarda o contexto, zera a leitura e marca ok', async () => {
    const estado = await aplicar(
      { tipo: 'lerComecou', numero: 1 },
      { tipo: 'lidoOk', numero: 1, contexto, lido },
      { tipo: 'lerComecou', numero: 2 },
      { tipo: 'lidoAcessoPerdido', numero: 2, contexto: perdido },
    )
    expect(estado.leitura).toBe('ok')
    expect(estado.contexto).toBe(perdido)
    expect(estado.lido).toBeNull()
  })

  it('lidoFalhou no modo normal vira falha e mantém o que já estava lido', async () => {
    const estado = await aplicar(
      { tipo: 'lerComecou', numero: 1 },
      { tipo: 'lidoOk', numero: 1, contexto, lido },
      { tipo: 'lerComecou', numero: 2 },
      { tipo: 'lidoFalhou', numero: 2, modo: 'normal' },
    )
    expect(estado.leitura).toBe('falha')
    expect(estado.lido).toBe(lido)
    expect(estado.contexto).toBe(contexto)
  })

  it('lidoFalhou depois de uma escrita não muda a leitura', async () => {
    const antes = await aplicar({ tipo: 'lerComecou', numero: 1 }, { tipo: 'lidoOk', numero: 1, contexto, lido }, { tipo: 'lerComecou', numero: 2 })
    const { reduzir } = await carregar()
    const depois = reduzir(antes, { tipo: 'lidoFalhou', numero: 2, modo: 'depoisDeEscrita' })
    expect(depois.leitura).toBe('ok')
    expect(depois).toEqual(antes)
  })

  it('tentarLeitura volta a carregando', async () => {
    const estado = await aplicar(
      { tipo: 'lerComecou', numero: 1 },
      { tipo: 'lidoFalhou', numero: 1, modo: 'normal' },
      { tipo: 'tentarLeitura' },
    )
    expect(estado.leitura).toBe('carregando')
  })
})

describe('resposta velha pelo contador', () => {
  it('um resultado com número antigo devolve o mesmo estado', async () => {
    const { reduzir } = await carregar()
    const atual = await aplicar({ tipo: 'lerComecou', numero: 1 }, { tipo: 'lerComecou', numero: 2 })
    expect(reduzir(atual, { tipo: 'lidoOk', numero: 1, contexto, lido })).toBe(atual)
    expect(reduzir(atual, { tipo: 'lidoAcessoPerdido', numero: 1, contexto: perdido })).toBe(atual)
    expect(reduzir(atual, { tipo: 'lidoFalhou', numero: 1, modo: 'normal' })).toBe(atual)
    expect(reduzir(atual, { tipo: 'lidoFalhou', numero: 1, modo: 'depoisDeEscrita' })).toBe(atual)
  })

  it('o resultado do pedido atual vale', async () => {
    const { reduzir } = await carregar()
    const atual = await aplicar({ tipo: 'lerComecou', numero: 1 }, { tipo: 'lerComecou', numero: 2 })
    expect(reduzir(atual, { tipo: 'lidoOk', numero: 2, contexto, lido })).not.toBe(atual)
  })
})

describe('escrita', () => {
  it('escritaComecou limpa erro, confirmação e aviso e marca onde está pendente', async () => {
    const estado = await aplicar(
      { tipo: 'lerComecou', numero: 1 },
      { tipo: 'lidoOk', numero: 1, contexto, lido },
      { tipo: 'escritaOk', confirmacao },
      { tipo: 'salvoSemAtualizar' },
      { tipo: 'escritaFalhou', erro, arquivado: false },
      { tipo: 'escritaComecou', onde: 'iniciar' },
    )
    expect(estado.erro).toBeNull()
    expect(estado.confirmacao).toBeNull()
    expect(estado.salvoSemAtualizar).toBe(false)
    expect(estado.ondePendente).toBe('iniciar')
  })

  it('escritaOk mostra a confirmação', async () => {
    const estado = await aplicar({ tipo: 'lerComecou', numero: 1 }, { tipo: 'lidoOk', numero: 1, contexto, lido }, { tipo: 'escritaOk', confirmacao })
    expect(estado.confirmacao).toBe(confirmacao)
  })

  it('escritaOk sem confirmação deixa a confirmação vazia', async () => {
    const estado = await aplicar({ tipo: 'escritaOk', confirmacao: null })
    expect(estado.confirmacao).toBeNull()
  })

  it('fluxo de desfazer: a confirmação com desfazer some quando a próxima escrita começa', async () => {
    const estado = await aplicar(
      { tipo: 'lerComecou', numero: 1 },
      { tipo: 'lidoOk', numero: 1, contexto, lido },
      { tipo: 'escritaOk', confirmacao },
      { tipo: 'escritaComecou', onde: 'confirmacao' },
    )
    expect(estado.confirmacao).toBeNull()
    expect(estado.ondePendente).toBe('confirmacao')
  })

  it('salvoSemAtualizar levanta o aviso e atualizarSalvo o baixa', async () => {
    const levantado = await aplicar({ tipo: 'salvoSemAtualizar' })
    expect(levantado.salvoSemAtualizar).toBe(true)
    const { reduzir } = await carregar()
    expect(reduzir(levantado, { tipo: 'atualizarSalvo' }).salvoSemAtualizar).toBe(false)
  })

  it('escritaFalhou guarda o erro sem marcar arquivado', async () => {
    const estado = await aplicar({ tipo: 'escritaFalhou', erro, arquivado: false })
    expect(estado.erro).toBe(erro)
    expect(estado.arquivadoPeloErro).toBe(false)
  })

  it('escritaFalhou por bebê arquivado marca arquivadoPeloErro', async () => {
    const estado = await aplicar({ tipo: 'escritaFalhou', erro, arquivado: true })
    expect(estado.erro).toBe(erro)
    expect(estado.arquivadoPeloErro).toBe(true)
  })

  it('um erro sem arquivado não desfaz o arquivadoPeloErro anterior', async () => {
    const estado = await aplicar({ tipo: 'escritaFalhou', erro, arquivado: true }, { tipo: 'escritaFalhou', erro, arquivado: false })
    expect(estado.arquivadoPeloErro).toBe(true)
  })

  it('escritaTerminou solta a operação pendente', async () => {
    const estado = await aplicar({ tipo: 'escritaComecou', onde: 'painel' }, { tipo: 'escritaTerminou' })
    expect(estado.ondePendente).toBeNull()
  })

  it('relogioAtras limpa a confirmação e mostra o erro', async () => {
    const estado = await aplicar(
      { tipo: 'lerComecou', numero: 1 },
      { tipo: 'lidoOk', numero: 1, contexto, lido },
      { tipo: 'escritaOk', confirmacao },
      { tipo: 'relogioAtras', erro },
    )
    expect(estado.confirmacao).toBeNull()
    expect(estado.erro).toBe(erro)
  })
})

describe('confirmação', () => {
  it('fecharConfirmacao tira a confirmação', async () => {
    const estado = await aplicar(
      { tipo: 'lerComecou', numero: 1 },
      { tipo: 'lidoOk', numero: 1, contexto, lido },
      { tipo: 'escritaOk', confirmacao },
      { tipo: 'fecharConfirmacao' },
    )
    expect(estado.confirmacao).toBeNull()
  })

  it('a confirmação não aparece enquanto a leitura está em falha', async () => {
    const estado = await aplicar({ tipo: 'lerComecou', numero: 1 }, { tipo: 'lidoFalhou', numero: 1, modo: 'normal' }, { tipo: 'escritaOk', confirmacao })
    expect(estado.leitura).toBe('falha')
    expect(estado.confirmacao).toBeNull()
  })

  it('a falha de leitura no modo normal tira a confirmação que estava na tela', async () => {
    const estado = await aplicar(
      { tipo: 'lerComecou', numero: 1 },
      { tipo: 'lidoOk', numero: 1, contexto, lido },
      { tipo: 'escritaOk', confirmacao },
      { tipo: 'lerComecou', numero: 2 },
      { tipo: 'lidoFalhou', numero: 2, modo: 'normal' },
    )
    expect(estado.leitura).toBe('falha')
    expect(estado.confirmacao).toBeNull()
  })

  it('a falha depois de uma escrita mantém a confirmação (a leitura segue ok)', async () => {
    const estado = await aplicar(
      { tipo: 'lerComecou', numero: 1 },
      { tipo: 'lidoOk', numero: 1, contexto, lido },
      { tipo: 'escritaOk', confirmacao },
      { tipo: 'lerComecou', numero: 2 },
      { tipo: 'lidoFalhou', numero: 2, modo: 'depoisDeEscrita' },
    )
    expect(estado.leitura).toBe('ok')
    expect(estado.confirmacao).toBe(confirmacao)
  })
})

describe('painel e passos', () => {
  it('abrirPainel limpa erro, confirmação, passo e erro de campo e abre o painel', async () => {
    const estado = await aplicar(
      { tipo: 'escritaOk', confirmacao },
      { tipo: 'escritaFalhou', erro, arquivado: false },
      { tipo: 'passoEmAberto', passo: { passo: 'longa', confirmados: [], entrada } },
      { tipo: 'erroDeCampo', erro: 'duracao' },
      { tipo: 'abrirPainel', painel },
    )
    expect(estado.painel).toBe(painel)
    expect(estado.erro).toBeNull()
    expect(estado.confirmacao).toBeNull()
    expect(estado.passo).toBeNull()
    expect(estado.erroDeCampo).toBeNull()
  })

  it('fecharPainel fecha o painel, o passo e o erro de campo', async () => {
    const estado = await aplicar(
      { tipo: 'abrirPainel', painel },
      { tipo: 'passoEmAberto', passo: { passo: 'sobreposicao', confirmados: ['longa'], entrada } },
      { tipo: 'erroDeCampo', erro: 'futuro' },
      { tipo: 'fecharPainel', limparErroDoPainel: false },
    )
    expect(estado.painel).toBeNull()
    expect(estado.passo).toBeNull()
    expect(estado.erroDeCampo).toBeNull()
  })

  it('fecharPainel só limpa o erro quando pedido', async () => {
    const { reduzir } = await carregar()
    const comErro = await aplicar({ tipo: 'abrirPainel', painel }, { tipo: 'escritaFalhou', erro, arquivado: false })
    expect(reduzir(comErro, { tipo: 'fecharPainel', limparErroDoPainel: false }).erro).toBe(erro)
    expect(reduzir(comErro, { tipo: 'fecharPainel', limparErroDoPainel: true }).erro).toBeNull()
  })

  it('painelFechado só fecha o painel', async () => {
    const estado = await aplicar(
      { tipo: 'abrirPainel', painel },
      { tipo: 'passoEmAberto', passo: { passo: 'longa', confirmados: [], entrada } },
      { tipo: 'painelFechado' },
    )
    expect(estado.painel).toBeNull()
    expect(estado.passo).not.toBeNull()
  })

  it('passoEmAberto e passoSaiu guardam e soltam o passo', async () => {
    const passo = { passo: 'longa' as const, confirmados: [], entrada }
    const aberto = await aplicar({ tipo: 'passoEmAberto', passo })
    expect(aberto.passo).toBe(passo)
    const { reduzir } = await carregar()
    expect(reduzir(aberto, { tipo: 'passoSaiu' }).passo).toBeNull()
  })

  it('erroDeCampo guarda o erro e aceita null', async () => {
    const com = await aplicar({ tipo: 'erroDeCampo', erro: 'preencha' })
    expect(com.erroDeCampo).toBe('preencha')
    const { reduzir } = await carregar()
    expect(reduzir(com, { tipo: 'erroDeCampo', erro: null }).erroDeCampo).toBeNull()
  })

  it('fecharErro tira o erro; com fecharPainel fecha também o painel, o passo e o erro de campo', async () => {
    const { reduzir } = await carregar()
    const base = await aplicar(
      { tipo: 'abrirPainel', painel },
      { tipo: 'escritaFalhou', erro, arquivado: false },
      { tipo: 'passoEmAberto', passo: { passo: 'longa', confirmados: [], entrada } },
      { tipo: 'erroDeCampo', erro: 'duracao' },
    )
    const sem = reduzir(base, { tipo: 'fecharErro', fecharPainel: false })
    expect(sem.erro).toBeNull()
    expect(sem.painel).toBe(painel)
    expect(sem.passo).not.toBeNull()
    expect(sem.erroDeCampo).toBe('duracao')
    const com = reduzir(base, { tipo: 'fecharErro', fecharPainel: true })
    expect(com.erro).toBeNull()
    expect(com.painel).toBeNull()
    expect(com.passo).toBeNull()
    expect(com.erroDeCampo).toBeNull()
  })
})

describe('dia e foco', () => {
  it('escolherDia guarda o índice', async () => {
    expect((await aplicar({ tipo: 'escolherDia', indice: 4 })).indiceDoDia).toBe(4)
  })

  it('pedirFoco soma um ao contador e guarda as chaves', async () => {
    const estado = await aplicar({ tipo: 'pedirFoco', chaves: ['a'] }, { tipo: 'pedirFoco', chaves: ['b', 'c'] })
    expect(estado.pedidoDeFoco).toEqual({ n: 2, chaves: ['b', 'c'] })
  })
})

describe('par impossível', () => {
  it('nenhuma sequência de até três ações deixa leitura em falha com confirmação na tela', async () => {
    const { estadoInicial, reduzir } = await carregar()
    const acoes: AcaoDoTummy[] = [
      { tipo: 'lerComecou', numero: 1 },
      { tipo: 'lerComecou', numero: 2 },
      { tipo: 'lidoOk', numero: 1, contexto, lido },
      { tipo: 'lidoOk', numero: 2, contexto, lido },
      { tipo: 'lidoAcessoPerdido', numero: 1, contexto: perdido },
      { tipo: 'lidoFalhou', numero: 1, modo: 'normal' },
      { tipo: 'lidoFalhou', numero: 2, modo: 'normal' },
      { tipo: 'lidoFalhou', numero: 1, modo: 'depoisDeEscrita' },
      { tipo: 'tentarLeitura' },
      { tipo: 'escritaComecou', onde: 'iniciar' },
      { tipo: 'escritaOk', confirmacao },
      { tipo: 'escritaOk', confirmacao: null },
      { tipo: 'salvoSemAtualizar' },
      { tipo: 'escritaFalhou', erro, arquivado: true },
      { tipo: 'escritaTerminou' },
      { tipo: 'relogioAtras', erro },
      { tipo: 'abrirPainel', painel },
      { tipo: 'fecharPainel', limparErroDoPainel: true },
      { tipo: 'painelFechado' },
      { tipo: 'passoSaiu' },
      { tipo: 'erroDeCampo', erro: null },
      { tipo: 'fecharConfirmacao' },
      { tipo: 'fecharErro', fecharPainel: true },
      { tipo: 'atualizarSalvo' },
      { tipo: 'escolherDia', indice: 2 },
      { tipo: 'pedirFoco', chaves: ['x'] },
    ]
    const invariante = (estado: EstadoDoTummy) => !(estado.leitura === 'falha' && estado.confirmacao !== null)
    let visitados = 0
    const visitar = (estado: EstadoDoTummy, profundidade: number) => {
      expect(invariante(estado)).toBe(true)
      visitados += 1
      if (profundidade === 3) return
      for (const acao of acoes) visitar(reduzir(estado, acao), profundidade + 1)
    }
    visitar(estadoInicial, 0)
    expect(visitados).toBeGreaterThan(acoes.length ** 3)
  })
})

describe('o gancho do tummy', () => {
  it('um estado so', () => {
    // No jsdom o `import.meta.url` não é um endereço `file:`: o caminho parte da raiz do pacote (`web/`), onde o vitest roda.
    const caminho = resolve(process.cwd(), 'src/componentes/desenvolvimento/tummy/useBlocoTummy.ts')
    const fonte = readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')
    expect((fonte.match(/useState\(/g) ?? []).length).toBeLessThanOrEqual(2)
  })
})
