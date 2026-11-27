import { useContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router'
import {
  ContextoDadosAvisos,
  criarDadosAvisos,
  erroSemMensagem,
  faltaRpcDeAvisos,
  resultadoSemMensagem,
  type DadosAvisos,
  type EstadoDosAvisos,
} from '../../dados/avisos.ts'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import { erroDaChave } from '../../dados/conta.erros.ts'
import { useDadosConta, useSessao } from '../conta/sessao.tsx'

// O estado compartilhado dos avisos (RF14:RF-07 e RF-18): o cabeçalho, a página de avisos e a área de conta
// leem a mesma coisa. Há uma "central" por instância de dados: ela guarda o estado mostrado, faz as leituras
// (uma por vez), as duas gravações e descarta o que ficou velho. O gancho só se inscreve nela.

/** A cadência fixa das leituras, contada do começo da sessão (RF14:RF-07, regra 1). */
const INTERVALO_DE_LEITURA_MS = 120_000

interface Foto {
  /** De quem é o estado: `null` sem sessão. */
  contaId: string | null
  /** O que a tela mostra; `null` antes da primeira leitura com sucesso da sessão. */
  mostrado: EstadoDosAvisos | null
  lendo: boolean
  /** O erro da leitura, só antes do primeiro sucesso. */
  erro: ErroDados | null
}

interface Leitura {
  geracao: number
  /** A leitura atravessou uma gravação: o resultado dela é descartado, qualquer que seja. */
  contaminada: boolean
}

const VAZIA: Foto = { contaId: null, mostrado: null, lendo: false, erro: null }

/** Toda chamada aos dados: a falha devolvida e a rejeição saem sem a mensagem de origem (RF14:RN-06). */
async function protegido<T>(corpo: () => Promise<Resultado<T>>): Promise<Resultado<T>> {
  try {
    return resultadoSemMensagem(await corpo())
  } catch (origem) {
    return { ok: false, erro: erroSemMensagem(origem) }
  }
}

const visivel = () => document.visibilityState !== 'hidden'

function criarCentral(dados: DadosAvisos) {
  let foto: Foto = VAZIA
  const ouvintes = new Set<() => void>()
  let geracao = 0
  let leitura: Leitura | null = null
  let pendente = false
  let salvando = 0
  let caminho: string | null = null
  // O tipo vem de `clearInterval`: o único `setInterval` do arquivo é a chamada que arma a cadência.
  let relogio: Parameters<typeof clearInterval>[0]
  let aoEncerrar: (() => void) | null = null

  function mudar(parte: Partial<Foto>) {
    foto = { ...foto, ...parte }
    for (const ouvinte of [...ouvintes]) ouvinte()
  }

  async function executarLeitura(): Promise<void> {
    const minha: Leitura = { geracao, contaminada: salvando > 0 }
    leitura = minha
    pendente = false
    mudar({ lendo: true, erro: faltaRpcDeAvisos(foto.erro) ? foto.erro : null })
    const lido = await protegido(() => dados.lerEstado())
    // Outra conta entrou no lugar: o resultado é de quem saiu e não vale para ninguém.
    if (minha.geracao !== geracao) return
    leitura = null
    if (!lido.ok && lido.erro.classe === 'sessao_encerrada') aoEncerrar?.()
    if (minha.contaminada) mudar({ lendo: false })
    else if (lido.ok) mudar({ lendo: false, mostrado: lido.valor, erro: null })
    else if (faltaRpcDeAvisos(lido.erro)) mudar({ lendo: false, mostrado: null, erro: lido.erro })
    else mudar({ lendo: false, erro: foto.mostrado === null ? lido.erro : null })
    if (pendente) {
      pendente = false
      if (visivel()) void executarLeitura()
    }
  }

  /** Um gatilho de leitura: com uma leitura em andamento vira uma só leitura a mais; escondida, não lê. */
  function pedir() {
    if (foto.contaId === null) return
    if (leitura) {
      pendente = true
      return
    }
    if (!visivel()) return
    void executarLeitura()
  }

  function aoFicarVisivel() {
    if (document.visibilityState === 'visible') pedir()
  }

  function pararRelogio() {
    if (relogio !== undefined) clearInterval(relogio)
    relogio = undefined
  }

  function ajustarRelogio() {
    const deve = foto.contaId !== null && ouvintes.size > 0
    if (deve && relogio === undefined) relogio = setInterval(pedir, INTERVALO_DE_LEITURA_MS)
    if (!deve) pararRelogio()
  }

  function observar(contaId: string | null, rota: string, encerrar: () => void) {
    aoEncerrar = encerrar
    if (contaId !== foto.contaId) {
      // A conta mudou: o que era da anterior some antes de a nova ser mostrada, e a cadência recomeça.
      geracao += 1
      leitura = null
      pendente = false
      salvando = 0
      caminho = rota
      pararRelogio()
      mudar({ contaId, mostrado: null, lendo: false, erro: null })
      ajustarRelogio()
      pedir()
      return
    }
    if (rota !== caminho) {
      caminho = rota
      pedir()
    }
  }

  function assinar(ouvinte: () => void) {
    ouvintes.add(ouvinte)
    document.addEventListener('visibilitychange', aoFicarVisivel)
    ajustarRelogio()
    return () => {
      ouvintes.delete(ouvinte)
      // Trocar de página desmonta e monta o gancho no mesmo instante: a cadência só para se ninguém voltou.
      queueMicrotask(() => {
        if (ouvintes.size > 0) return
        document.removeEventListener('visibilitychange', aoFicarVisivel)
        pararRelogio()
      })
    }
  }

  async function salvar(
    corpo: () => Promise<Resultado<null>>,
    confirmar: (atual: EstadoDosAvisos) => EstadoDosAvisos,
  ): Promise<Resultado<null>> {
    if (foto.contaId === null) return { ok: false, erro: erroDaChave('sessao_encerrada') }
    const minha = geracao
    salvando += 1
    if (leitura) leitura.contaminada = true
    const resultado = await protegido(corpo)
    if (minha !== geracao) return resultado
    salvando -= 1
    if (!resultado.ok) {
      if (resultado.erro.classe === 'sessao_encerrada') aoEncerrar?.()
      return resultado
    }
    if (foto.mostrado) mudar({ mostrado: confirmar(foto.mostrado) })
    pedir()
    return resultado
  }

  return {
    assinar,
    foto: () => foto,
    observar,
    ler: () => pedir(),
    definirLigados: (ligados: boolean) =>
      salvar(
        () => dados.definirLigados(ligados),
        (atual) => ({ ligados, avisos: ligados ? atual.avisos : [], maisDe50: ligados ? atual.maisDe50 : false }),
      ),
    marcarVistos: (ate: string) =>
      salvar(
        () => dados.marcarVistos(ate),
        (atual) => ({ ...atual, avisos: [], maisDe50: false }),
      ),
  }
}

type Central = ReturnType<typeof criarCentral>

const centrais = new WeakMap<DadosAvisos, Central>()

function centralDe(dados: DadosAvisos): Central {
  let central = centrais.get(dados)
  if (!central) {
    central = criarCentral(dados)
    centrais.set(dados, central)
  }
  return central
}

export interface UsoDosAvisos {
  /** `lendo` antes do primeiro sucesso da sessão (ou durante a nova tentativa), `erro` se a última leitura falhou, `pronto` depois. */
  fase: 'lendo' | 'erro' | 'pronto'
  /** O estado mostrado: `null` antes da primeira leitura com sucesso da sessão atual. */
  mostrado: EstadoDosAvisos | null
  /** Há uma leitura em andamento. */
  lendo: boolean
  /** O erro da leitura; só existe antes do primeiro sucesso. */
  erro: ErroDados | null
  definirLigados(ligados: boolean): Promise<Resultado<null>>
  /** O instante é o `criadaEm` do aviso mais novo da lista, sem mudar. */
  marcarVistos(ate: string): Promise<Resultado<null>>
  /** Lê de novo (a nova tentativa depois de um erro). */
  ler(): void
}

/**
 * O estado dos avisos da conta entrada, o mesmo em todo lugar que o usa. Troca de conta, saída da sessão
 * e leitura velha são tratadas aqui; quem chama só mostra.
 */
export function useAvisos(): UsoDosAvisos {
  const sessao = useSessao()
  const conta = useDadosConta()
  const injetados = useContext(ContextoDadosAvisos)
  const dados = useMemo(() => injetados ?? criarDadosAvisos(conta), [injetados, conta])
  const central = centralDe(dados)
  const { pathname } = useLocation()
  const contaId = sessao.estado === 'com_sessao' && sessao.usuario ? sessao.usuario.id : null
  const { recarregarConta } = sessao

  const foto = useSyncExternalStore(central.assinar, central.foto, central.foto)

  useEffect(() => {
    central.observar(contaId, pathname, () => void recarregarConta())
  }, [central, contaId, pathname, recarregarConta])

  // Antes de a central trocar de conta, o estado da anterior não vale para a atual.
  const meu = contaId !== null && foto.contaId === contaId

  return useMemo(
    () => ({
      fase: meu && foto.mostrado ? 'pronto' : meu && foto.erro ? 'erro' : 'lendo',
      mostrado: meu ? foto.mostrado : null,
      lendo: meu && foto.lendo,
      erro: meu && !foto.mostrado ? foto.erro : null,
      definirLigados: central.definirLigados,
      marcarVistos: central.marcarVistos,
      ler: central.ler,
    }),
    [central, foto, meu],
  )
}
