import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Outlet, useLocation, useMatches } from 'react-router'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import { modoDados } from '../../dados/comum.ts'
import { registrarCarregadorDaFonte, registrarOrigemDaConta, temFonteDeExportacao } from '../../dados/fontes.ts'
import { criarDadosConta, OPERACOES_CONTA, type Conta, type DadosConta, type FamiliaResumo, type Usuario } from '../../dados/conta.ts'
import { envolverOperacoes } from '../envolverOperacoes.ts'
import { apagarChave, CHAVE_FAMILIA_ATUAL, CHAVE_RECUPERACAO, gravarChave, lerChave, lerFamiliaAtual, limparFamiliaAtual } from './armazenamento.ts'

// A sessão da área de conta: o provedor de dados (a instância da página), o provedor de sessão
// (rota raiz das cinco áreas) e os ganchos que as telas e as próximas tarefas importam.

type EstadoDaSessao = 'carregando' | 'sem_sessao' | 'com_sessao' | 'erro'

/** Por que a sessão acabou: a pessoa pediu ("Sair") ou terminou sem ela pedir. */
type MotivoDaSaida = 'pedida' | 'sem_pedido' | null

interface DadosDaSessao {
  estado: EstadoDaSessao
  usuario: Usuario | null
  /** `null` com sessão é a conta incompleta: falta o passo "Seu nome". */
  conta: Conta | null
  erro: ErroDados | null
  motivoSaida: MotivoDaSaida
}

interface ValorSessao extends DadosDaSessao {
  familiaEscolhida: string | null
  escolherFamilia(pessoa: string, familia: string): void
  /** Relê a sessão e a conta, nessa ordem. */
  recarregarConta(): Promise<void>
  /** Encerra a sessão só neste navegador; devolve o resultado da saída. */
  sair(): Promise<Resultado<null>>
  /** A tela de entrada já mostrou o motivo da saída: ele não vale mais. */
  consumirMotivoSaida(): void
  /** Roda `corpo` sem que um `sessao_encerrada` dele leve a pessoa a `/entrar` (exclusão da conta). */
  suprimirEncerramento<T>(corpo: () => Promise<T>): Promise<T>
}

interface Registro {
  definir(tratar: (() => void) | null): void
  chamar(): void
  suprimir<T>(corpo: () => Promise<T>): Promise<T>
}

function criarRegistro(): Registro {
  let tratar: (() => void) | null = null
  let suprimidos = 0
  return {
    definir(novo) {
      tratar = novo
    },
    chamar() {
      if (suprimidos === 0) tratar?.()
    },
    async suprimir(corpo) {
      suprimidos += 1
      try {
        return await corpo()
      } finally {
        suprimidos -= 1
      }
    },
  }
}

interface ContextoDeDados {
  dados: DadosConta
  registro: Registro
}

const ContextoDados = createContext<ContextoDeDados | null>(null)
const ContextoSessao = createContext<ValorSessao | null>(null)

/**
 * Qualquer operação que devolva `sessao_encerrada` avisa o provedor de sessão (RF-11); a cópia leva
 * também o `aoMudarSessao`. Depois disso, a parte própria da conta: o registro das fontes.
 */
function envolverConta(dados: DadosConta, aoEncerrar: () => void): DadosConta {
  const copia = envolverOperacoes(dados, OPERACOES_CONTA, aoEncerrar, {
    aoMudarSessao: (ouvinte: Parameters<DadosConta['aoMudarSessao']>[0]) => dados.aoMudarSessao(ouvinte),
  })
  // A rotina em memória se registra na cópia; a exportação e a exclusão da conta procuram pela memória original.
  registrarOrigemDaConta(copia, dados)
  // Na memória, a rotina precisa estar ligada já aqui: quem abre a conta sem passar pela rotina também exporta os
  // registros. Só se registra quem a carrega (o motor e a fixture não vêm com a página: `import()` na hora de exportar
  // ou excluir, ou quando a rotina é usada). Uma rotina que quem chamou já registrou na conta (como a de um teste) é mantida.
  if (modoDados() === 'memoria' && !temFonteDeExportacao(dados)) {
    registrarCarregadorDaFonte(copia, async () =>
      (await import('../../dados/rotina.ts')).carregarRotinaEmMemoria(copia),
    )
  }
  return copia
}

/** O contexto de dados. Sem `dados`, vale a instância da página (`criarDadosConta()`). */
export function ProvedorDadosConta({ dados, children }: { dados?: DadosConta; children: ReactNode }) {
  const base = dados ?? criarDadosConta()
  const [registro] = useState(criarRegistro)
  const valor = useMemo(() => ({ dados: envolverConta(base, () => registro.chamar()), registro }), [base, registro])
  return <ContextoDados value={valor}>{children}</ContextoDados>
}

function useContextoDeDados(): ContextoDeDados {
  const contexto = useContext(ContextoDados)
  if (!contexto) throw new Error('Falta o ProvedorDadosConta')
  return contexto
}

export function useDadosConta(): DadosConta {
  const contexto = useContext(ContextoDados)
  return contexto ? contexto.dados : criarDadosConta()
}

const INICIAL: DadosDaSessao = { estado: 'carregando', usuario: null, conta: null, erro: null, motivoSaida: null }

function SessaoInterna() {
  const { dados, registro } = useContextoDeDados()
  const [sessao, setSessao] = useState<DadosDaSessao>(INICIAL)
  const [familiaEscolhida, setFamiliaEscolhida] = useState<string | null>(null)
  const identidade = useRef<string | null>(null)
  const estadoAtual = useRef(sessao)
  const saidaPedida = useRef(false)
  const sequencia = useRef(0)

  useEffect(() => {
    estadoAtual.current = sessao
  }, [sessao])

  const reconhecerPessoa = useCallback((pessoa: string | null) => {
    const anterior = identidade.current
    if (anterior === pessoa && pessoa !== null) return
    limparFamiliaAtual(anterior)
    identidade.current = pessoa
    const guardada = lerFamiliaAtual()
    if (guardada && guardada.pessoa !== pessoa && (pessoa !== null || anterior === null)) limparFamiliaAtual(guardada.pessoa)
    setFamiliaEscolhida(guardada?.pessoa === pessoa ? guardada.familia : null)
    const recuperacao = lerChave('sessao', CHAVE_RECUPERACAO)
    if (recuperacao !== null && recuperacao !== pessoa) apagarChave('sessao', CHAVE_RECUPERACAO)
  }, [])

  const prepararTroca = useCallback((pessoa: string) => {
    if (identidade.current !== null && identidade.current !== pessoa) {
      estadoAtual.current = INICIAL
      setSessao(INICIAL)
    }
    reconhecerPessoa(pessoa)
  }, [reconhecerPessoa])

  const escolherFamilia = useCallback((pessoa: string, familia: string) => {
    if (identidade.current !== pessoa) return
    gravarChave('local', CHAVE_FAMILIA_ATUAL, JSON.stringify({ pessoa, familia }))
    setFamiliaEscolhida(familia)
  }, [])

  const semSessao = useCallback((motivoSaida: MotivoDaSaida) => {
    sequencia.current += 1
    reconhecerPessoa(null)
    const proximo: DadosDaSessao = { estado: 'sem_sessao', usuario: null, conta: null, erro: null, motivoSaida }
    // O efeito que copia o estado para a ref só roda depois da renderização: uma resposta que chega
    // antes dele (a leitura em andamento de quem acabou de sair) já tem de ver `sem_sessao`.
    estadoAtual.current = proximo
    setSessao(proximo)
  }, [reconhecerPessoa])

  const carregar = useCallback(async () => {
    sequencia.current += 1
    const minha = sequencia.current
    const lida = await dados.sessaoAtual()
    if (minha !== sequencia.current) return
    if (!lida.ok) {
      if (lida.erro.classe === 'sessao_encerrada') return semSessao('sem_pedido')
      return setSessao({ estado: 'erro', usuario: null, conta: null, erro: lida.erro, motivoSaida: null })
    }
    const usuario = lida.valor
    if (!usuario) return semSessao(estadoAtual.current.motivoSaida)
    prepararTroca(usuario.id)

    const conta = await dados.minhaConta()
    if (minha !== sequencia.current) return
    if (!conta.ok) {
      if (conta.erro.classe === 'sessao_encerrada') return semSessao('sem_pedido')
      return setSessao({ estado: 'erro', usuario, conta: null, erro: conta.erro, motivoSaida: null })
    }
    setSessao({ estado: 'com_sessao', usuario, conta: conta.valor, erro: null, motivoSaida: null })
  }, [dados, semSessao, prepararTroca])

  // A sessão acabou sem a pessoa pedir (operação com `sessao_encerrada`, evento, aba reaberta).
  const tratarEncerrada = useCallback(() => {
    apagarChave('sessao', CHAVE_RECUPERACAO)
    const atual = estadoAtual.current
    semSessao(atual.estado === 'sem_sessao' ? atual.motivoSaida : 'sem_pedido')
  }, [semSessao])

  useEffect(() => {
    registro.definir(tratarEncerrada)
    return () => registro.definir(null)
  }, [registro, tratarEncerrada])

  // A leitura começa fora do corpo do efeito: o estado só muda quando a resposta chega.
  useEffect(() => {
    queueMicrotask(() => void carregar())
  }, [carregar])

  useEffect(
    () =>
      dados.aoMudarSessao((evento, usuario) => {
        if (evento === 'entrou') {
          const marca = lerChave('sessao', CHAVE_RECUPERACAO)
          if (marca !== null && usuario && marca !== usuario.id) apagarChave('sessao', CHAVE_RECUPERACAO)
          saidaPedida.current = false
          // Entrar de novo como a mesma pessoa (a conferência da senha) não traz nada novo.
          const atual = estadoAtual.current
          if (atual.estado === 'com_sessao' && usuario && atual.usuario?.id === usuario.id) return
          if (usuario) prepararTroca(usuario.id)
          void carregar()
        } else if (evento === 'saiu') {
          const pedida = saidaPedida.current
          saidaPedida.current = false
          apagarChave('sessao', CHAVE_RECUPERACAO)
          if (identidade.current !== null) semSessao(pedida ? 'pedida' : 'sem_pedido')
        } else if (evento === 'recuperacao') {
          // Sem armazenamento a marca não existe, e a tela de nova senha mostra o link vencido.
          if (usuario) gravarChave('sessao', CHAVE_RECUPERACAO, usuario.id)
          void carregar()
        } else if (evento === 'usuario_atualizado') {
          void carregar()
        }
      }),
    [dados, carregar, prepararTroca, semSessao],
  )

  // Voltar à aba: uma saída ou troca de identidade feita noutra aba aparece aqui.
  useEffect(() => {
    async function aoVoltar() {
      if (document.visibilityState !== 'visible' || estadoAtual.current.estado !== 'com_sessao') return
      const antes = sequencia.current
      const lida = await dados.sessaoAtual()
      if (antes !== sequencia.current || !lida.ok) return
      if (lida.valor === null) tratarEncerrada()
      else if (lida.valor.id !== identidade.current) {
        prepararTroca(lida.valor.id)
        void carregar()
      }
    }
    // O ouvinte do documento é síncrono: a leitura assíncrona roda solta, sem devolver promessa ao evento.
    const ouvinte = () => {
      void aoVoltar()
    }
    document.addEventListener('visibilitychange', ouvinte)
    return () => document.removeEventListener('visibilitychange', ouvinte)
  }, [dados, carregar, prepararTroca, tratarEncerrada])

  // O título da aba é fixo por rota (`handle: { titulo }`), só nas rotas das áreas.
  const titulo = [...useMatches()]
    .reverse()
    .map((rota) => (rota.handle as { titulo?: unknown } | undefined)?.titulo)
    .find((valor): valor is string => typeof valor === 'string')
  useEffect(() => {
    if (!titulo) return
    const anterior = document.title
    document.title = titulo
    return () => {
      document.title = anterior
    }
  }, [titulo])

  const sair = useCallback(async (): Promise<Resultado<null>> => {
    saidaPedida.current = true
    const resultado = await dados.sair()
    if (resultado.ok) {
      apagarChave('sessao', CHAVE_RECUPERACAO)
      semSessao('pedida')
    } else {
      saidaPedida.current = false
    }
    return resultado
  }, [dados, semSessao])

  const consumirMotivoSaida = useCallback(() => {
    setSessao((anterior) => (anterior.motivoSaida ? { ...anterior, motivoSaida: null } : anterior))
  }, [])

  const valor = useMemo<ValorSessao>(
    () => ({
      ...sessao,
      familiaEscolhida,
      escolherFamilia,
      recarregarConta: carregar,
      sair,
      consumirMotivoSaida,
      suprimirEncerramento: registro.suprimir,
    }),
    [sessao, familiaEscolhida, escolherFamilia, carregar, sair, consumirMotivoSaida, registro],
  )

  return (
    <ContextoSessao value={valor}>
      <Outlet />
    </ContextoSessao>
  )
}

/** A rota raiz das cinco áreas: lê a sessão, guarda o estado e aplica o título da aba. */
export function ProvedorSessao() {
  const externo = useContext(ContextoDados)
  if (externo) return <SessaoInterna />
  return (
    <ProvedorDadosConta>
      <SessaoInterna />
    </ProvedorDadosConta>
  )
}

export function useSessao(): ValorSessao {
  const valor = useContext(ContextoSessao)
  if (!valor) throw new Error('useSessao precisa estar dentro de ProvedorSessao')
  return valor
}

/**
 * A família que a tela Família mostra, em ordem: (1) a do parâmetro `?familia=` de `/app/familia`,
 * se estiver entre as famílias com vínculo ativo; (2) a guardada para esta conta; (3) a de
 * `criada_em` mais antiga. Só carrega com sessão e conta completa.
 */
export function useFamiliaAtual() {
  const dados = useDadosConta()
  const { estado: estadoDaSessao, conta, familiaEscolhida, escolherFamilia } = useSessao()
  const { pathname, search } = useLocation()
  const pessoa = estadoDaSessao === 'com_sessao' && conta ? conta.id : null
  const [carga, setCarga] = useState<CargaDeFamilias>(() => cargaVazia(pessoa))
  // A vigência da pessoa corrente: quem lê as famílias lê para ela. Trocar de pessoa, perder a
  // sessão ou desmontar a encerra, e a resposta de uma leitura de outra vigência é descartada.
  const vigenciaAtual = useRef<VigenciaDaCarga | null>(null)

  // A carga é de uma pessoa: ao mudar de pessoa (ou perder a sessão) ela recomeça vazia, antes
  // de qualquer renderização com os dados da anterior.
  if (carga.pessoa !== pessoa) setCarga(cargaVazia(pessoa))
  const vigente = carga.pessoa === pessoa ? carga : cargaVazia(pessoa)

  const carregar = useCallback(
    async (vigencia: VigenciaDaCarga) => {
      if (!vigencia.ativa) return
      vigencia.geracao += 1
      const minha = vigencia.geracao
      const lida = await dados.minhasFamilias()
      // Superada por uma leitura mais nova, de outra pessoa ou de uma tela que já saiu do ar.
      if (!vigencia.ativa || minha !== vigencia.geracao) return
      setCarga(
        lida.ok
          ? { pessoa: vigencia.pessoa, estado: 'pronto', familias: lida.valor, erro: null }
          : { pessoa: vigencia.pessoa, estado: 'erro', familias: [], erro: lida.erro },
      )
    },
    [dados],
  )

  const recarregar = useCallback(async () => {
    const vigencia = vigenciaAtual.current
    if (vigencia) await carregar(vigencia)
  }, [carregar])

  useEffect(() => {
    if (!pessoa) {
      vigenciaAtual.current = null
      return
    }
    const vigencia: VigenciaDaCarga = { pessoa, ativa: true, geracao: 0 }
    vigenciaAtual.current = vigencia
    queueMicrotask(() => void carregar(vigencia))
    return () => {
      vigencia.ativa = false
    }
  }, [pessoa, carregar])

  const escolher = useCallback((id: string) => {
    if (pessoa) escolherFamilia(pessoa, id)
  }, [pessoa, escolherFamilia])

  const parametro = pathname === '/app/familia' ? new URLSearchParams(search).get('familia') : null
  const { familias } = vigente
  // A escolha guardada só vale entre as famílias da pessoa corrente.
  const atual =
    familias.find((familia) => familia.id === parametro) ??
    familias.find((familia) => familia.id === familiaEscolhida) ??
    familias[0] ??
    null

  return { estado: vigente.estado, familias, atual, erro: vigente.erro, escolher, recarregar }
}

interface CargaDeFamilias {
  /** De quem é a carga: `null` sem sessão. */
  pessoa: string | null
  estado: 'carregando' | 'pronto' | 'erro'
  familias: FamiliaResumo[]
  erro: ErroDados | null
}

interface VigenciaDaCarga {
  pessoa: string
  ativa: boolean
  /** A leitura mais nova desta vigência: só a resposta dela vale. */
  geracao: number
}

const cargaVazia = (pessoa: string | null): CargaDeFamilias => ({ pessoa, estado: 'carregando', familias: [], erro: null })
