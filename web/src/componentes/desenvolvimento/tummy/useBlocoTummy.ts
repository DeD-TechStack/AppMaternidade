import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { bebeArquivado } from '../../../conteudo/desenvolvimento/textosLogada.ts'
import { TT, encerrado, jaEncerrada } from '../../../conteudo/desenvolvimento/textosTummy.ts'
import type { Papel, Resultado } from '../../../dados/comum.ts'
import type { Bebe, FamiliaResumo, Membro } from '../../../dados/conta.ts'
import { useDadosDesenvolvimento } from '../../../dados/desenvolvimento.contexto.tsx'
import { comPrazoDeResposta, traduzirErro, type ChaveDeErro, type LeituraDoBloco } from '../../../dados/desenvolvimento.ts'
import { lerAparelho } from '../../../dados/rotina.dia.ts'
import { podeEscrever, type ContextoRotina, type Registro } from '../../../dados/rotina.tipos.ts'
import { uuidV7 } from '../../../dados/rotina.uuid.ts'
import { usePendencia } from '../../../paginas/desenvolvimento/pendencia.tsx'
import { formatarDuracao, formatarHora } from '../../../prototipo/formatar.ts'
import { CHAVE, focarPrimeiro } from './foco.ts'
import { intervaloDoAgora, intervaloDoFormulario, proximoPasso, type EntradaDoPainel, type ErroDeCampo, type Passo } from './regras.ts'

// O estado do bloco de tummy time (MAT-39b): as leituras, as cinco escritas, a operação pendente, os erros do
// DES-09, as confirmações e o destino do foco. O gancho não desenha nada.

type TipoDoPainel = 'agora' | 'horario'

/** Onde a mensagem de erro e o "Salvando…" aparecem: perto do controle que disparou. */
export type Onde = 'iniciar' | 'painel' | 'confirmacao' | `sessao:${string}`

export interface ErroDoBloco {
  chave: ChaveDeErro | 'relogioAtras'
  texto: string
  onde: Onde
  /** A chave `data-foco` do controle que falhou. */
  controle: string
  /** Mostra "Tentar de novo" (T-41 e T-42). */
  repetivel: boolean
  /** O resultado é desconhecido (T-41): os controles de escrita ficam `aria-disabled` até "Fechar". */
  bloqueia: boolean
}

interface Desfazer {
  tipo: 'restaurar' | 'excluir'
  id: string
}

interface ConfirmacaoDoBloco {
  texto: string
  /** O foco de "Fechar" e de "Desfazer": o controle da ação que gerou a confirmação, se ainda existir. */
  foco: string[]
  desfazer: Desfazer | null
}

export interface PainelAberto {
  tipo: TipoDoPainel
  /** O id do registro novo nasce com o painel e fica até o sucesso, até fechar ou até trocar o bebê. */
  id: string
  abertoEm: number
}

export interface PassoEmAberto {
  passo: Passo
  confirmados: Passo[]
  entrada: EntradaDoPainel
}

interface ContextoDoBloco {
  contaId: string
  papel: Papel
  arquivado: boolean
  membros: readonly Membro[]
  acessoPerdido: boolean
}

interface Efeito {
  confirmacao: ConfirmacaoDoBloco | null
  foco: string[]
  /** Roda junto com a confirmação (fechar o painel, soltar o id). */
  depois?: () => void
}

interface Tarefa {
  onde: Onde
  controle: string
  /** Cada tentativa chama de novo, com os mesmos argumentos (mesmo id, mesmo `momento`). */
  chamar: () => Promise<Resultado<Efeito>>
}

type Releitura = 'ok' | 'falha' | 'descartada'

const RELE_DEPOIS_DO_ERRO: ReadonlySet<ChaveDeErro> = new Set(['naoEncontrado', 'semPermissao', 'arquivado', 'descartadaPorOutra'])

function lerContexto(contexto: ContextoRotina, familiaId: string, bebeId: string): ContextoDoBloco {
  const familia = contexto.familias.find((candidata) => candidata.id === familiaId)
  const bebe = familia?.bebes.find((candidato) => candidato.id === bebeId)
  if (!familia || !bebe) return { contaId: contexto.contaId, papel: 'observador', arquivado: false, membros: [], acessoPerdido: true }
  return {
    contaId: contexto.contaId,
    papel: familia.meuPapel,
    arquivado: bebe.estado === 'arquivado',
    membros: familia.membros,
    acessoPerdido: false,
  }
}

function textoDoErro(chave: ChaveDeErro, nomeDoBebe: string): string {
  switch (chave) {
    case 'semResposta':
      return TT.semResposta
    case 'servidorOcupado':
      return TT.servidorOcupado
    case 'naoEncontrado':
      return TT.naoEncontrado
    case 'semPermissao':
      return TT.semPermissao
    case 'arquivado':
      return bebeArquivado(nomeDoBebe)
    case 'descartadaPorOutra':
      return TT.descartadaPorOutra
    case 'prazoEncerrado':
      return TT.prazoEncerrado
    case 'noFuturo':
      return TT.noFuturo
    case 'fimAntesDoInicio':
      return TT.fimAntesDoInicio
    case 'inesperado':
      return TT.inesperado
  }
}

/** Liga o sucesso de uma chamada ao que a tela faz depois; o erro passa como veio. */
async function seSucesso<V>(chamada: Promise<Resultado<V>>, efeito: (valor: V) => Efeito): Promise<Resultado<Efeito>> {
  const resposta = await chamada
  return resposta.ok ? { ok: true, valor: efeito(resposta.valor) } : resposta
}

const maisRecentePrimeiro = (a: Registro, b: Registro) => Date.parse(b.inicio) - Date.parse(a.inicio) || (a.id < b.id ? -1 : 1)

interface Entrada {
  bebe: Bebe
  familia: FamiliaResumo
  /** O papel que a página já leu; a releitura do bloco pode trocá-lo. */
  papel: Papel
  /** O elemento do bloco: o foco procura os controles dentro dele. */
  raiz: RefObject<HTMLElement | null>
}

interface BlocoTummyEstado {
  leitura: 'carregando' | 'ok' | 'falha'
  /** As sessões em andamento, a mais recente primeiro; vazio quando o acesso se perdeu. */
  emAndamento: Registro[]
  encerradas: Registro[]
  incompleta: boolean
  /** A leitura completa está na tela (e o acesso à família continua): só então valem lista, resumo e cronômetros. */
  comDados: boolean
  /** Nada foi lido (nem em andamento, nem na janela): T-22. */
  vazio: boolean
  /** O instante da leitura: os 7 dias da fila saem dele. */
  agoraDaLeitura: number
  membros: readonly Membro[]
  contaId: string
  papel: Papel
  /** Responsável ou cuidador, bebê ativo e acesso vivo: só então os controles de escrita existem. */
  escreve: boolean
  acessoPerdido: boolean
  noticia: 'observador' | 'arquivado' | null
  /** Uma operação pendente na página: tudo desabilitado e T-53 perto do controle. */
  ondePendente: Onde | null
  /** Pode agir: leitura completa, nada pendente e nenhum resultado desconhecido (T-41). */
  podeAgir: boolean
  somenteLeitura: boolean
  erro: ErroDoBloco | null
  /** Onde a mensagem se desenha: no painel, no cartão da sessão ou, sem destino, na zona geral. */
  ondeDoErro: Onde | 'geral' | null
  confirmacao: ConfirmacaoDoBloco | null
  salvoSemAtualizar: boolean
  painel: PainelAberto | null
  passo: PassoEmAberto | null
  erroDeCampo: ErroDeCampo | null
  indiceDoDia: number
  acoes: {
    iniciar: () => void
    encerrar: (sessao: Registro) => void
    descartar: (sessao: Registro) => void
    abrirPainel: (tipo: TipoDoPainel) => void
    fecharPainel: () => void
    salvarPainel: (entrada: EntradaDoPainel) => void
    confirmarPasso: () => void
    voltarDoPasso: () => void
    editarCampo: () => void
    fecharConfirmacao: () => void
    desfazer: () => void
    tentarDeNovo: () => void
    fecharErro: () => void
    atualizar: () => void
    tentarLeituraDeNovo: () => void
    escolherDia: (indice: number) => void
  }
}

export function useBlocoTummy({ bebe, familia, papel, raiz }: Entrada): BlocoTummyEstado {
  const dados = useDadosDesenvolvimento()
  const { definirPendente } = usePendencia()

  const vivo = useRef(false)
  const pedido = useRef(0)
  const emCurso = useRef(false)
  const idDoIniciar = useRef<string | null>(null)
  const ultimaTarefa = useRef<Tarefa | null>(null)

  const [leitura, setLeitura] = useState<'carregando' | 'ok' | 'falha'>('carregando')
  const [lido, setLido] = useState<{ bloco: LeituraDoBloco; agora: number } | null>(null)
  const [contexto, setContexto] = useState<ContextoDoBloco | null>(null)
  const [ondePendente, setOndePendente] = useState<Onde | null>(null)
  const [erro, setErro] = useState<ErroDoBloco | null>(null)
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoDoBloco | null>(null)
  const [salvoSemAtualizar, setSalvoSemAtualizar] = useState(false)
  const [painel, setPainel] = useState<PainelAberto | null>(null)
  const [passo, setPasso] = useState<PassoEmAberto | null>(null)
  const [erroDeCampo, setErroDeCampo] = useState<ErroDeCampo | null>(null)
  const [indiceDoDia, setIndiceDoDia] = useState(0)
  // `P0001 bebe arquivado` vale por si: os controles somem mesmo que a releitura do contexto ainda diga o contrário.
  const [arquivadoPeloErro, setArquivadoPeloErro] = useState(false)
  const [pedidoDeFoco, setPedidoDeFoco] = useState<{ n: number; chaves: string[] }>({ n: 0, chaves: [] })

  const pedirFoco = useCallback((chaves: string[]) => setPedidoDeFoco((anterior) => ({ n: anterior.n + 1, chaves })), [])

  // O bloco vive enquanto o bebê da tela for o mesmo (a página o remonta ao trocar): ao sair, a pendência da
  // página é solta, e uma resposta que chegar depois é descartada.
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
      definirPendente(false)
    }
  }, [definirPendente])

  useEffect(() => {
    if (pedidoDeFoco.n > 0) focarPrimeiro(raiz.current, pedidoDeFoco.chaves)
  }, [pedidoDeFoco, raiz])

  /**
   * As duas leituras do DES-04 e o contexto da rotina (papel, bebê arquivado, acesso e nomes dos autores). Cada
   * leitura leva um número de pedido: só a mais nova vale. Com `depoisDeEscrita`, uma falha mantém o que já
   * estava na tela (T-52); nos outros casos, vira T-59.
   */
  const reler = useCallback(
    async (modo: 'normal' | 'depoisDeEscrita'): Promise<Releitura> => {
      pedido.current += 1
      const numero = pedido.current
      const agora = Date.now()
      const [resposta, bloco] = await Promise.all([dados.contexto(), dados.lerBloco(bebe.id, familia.fuso, agora)])
      if (!vivo.current || numero !== pedido.current) return 'descartada'
      const falhou = () => {
        if (modo === 'normal') setLeitura('falha')
        return 'falha' as const
      }
      if (!resposta.ok) return falhou()
      const novo = lerContexto(resposta.valor, familia.id, bebe.id)
      if (novo.acessoPerdido) {
        setContexto(novo)
        setLido(null)
        setLeitura('ok')
        return 'ok'
      }
      if (!bloco.ok) return falhou()
      setContexto(novo)
      setLido({ bloco: bloco.valor, agora })
      setLeitura('ok')
      return 'ok'
    },
    [dados, bebe.id, familia.id, familia.fuso],
  )

  useEffect(() => {
    queueMicrotask(() => void reler('normal'))
  }, [reler])

  // Ao voltar para a aba, a lista e o resumo se atualizam sem recarregar.
  useEffect(() => {
    function aoVoltar() {
      if (document.visibilityState === 'visible') void reler('normal')
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [reler])

  /**
   * Uma escrita por vez: liga a pendência, espera a resposta (no máximo 15 s) e a releitura. Sucesso: confirmação e
   * foco. Erro: a linha do DES-09 perto do controle; só T-41 (resultado desconhecido) trava os controles.
   */
  const executar = useCallback(
    async (tarefa: Tarefa): Promise<void> => {
      if (emCurso.current || !vivo.current) return
      emCurso.current = true
      ultimaTarefa.current = tarefa
      setErro(null)
      setConfirmacao(null)
      setSalvoSemAtualizar(false)
      setOndePendente(tarefa.onde)
      definirPendente(true)

      const resposta = await comPrazoDeResposta(tarefa.chamar())
      if (!vivo.current) return

      let foco: string[]
      if (resposta.ok) {
        resposta.valor.depois?.()
        setConfirmacao(resposta.valor.confirmacao)
        const releitura = await reler('depoisDeEscrita')
        if (!vivo.current) return
        if (releitura === 'falha') setSalvoSemAtualizar(true)
        foco = resposta.valor.foco
      } else {
        const linha = traduzirErro(resposta.erro)
        setErro({
          chave: linha.chave,
          texto: textoDoErro(linha.chave, bebe.nome),
          onde: tarefa.onde,
          controle: tarefa.controle,
          repetivel: linha.repetivel,
          bloqueia: linha.salvou === 'desconhecido',
        })
        if (linha.chave === 'arquivado') setArquivadoPeloErro(true)
        if (RELE_DEPOIS_DO_ERRO.has(linha.chave)) await reler('normal')
        if (!vivo.current) return
        // Erro não move o foco; se o erro tirou o controle da tela, ele vai à mensagem.
        foco = [tarefa.controle, CHAVE.alerta]
      }

      emCurso.current = false
      setOndePendente(null)
      definirPendente(false)
      pedirFoco(foco)
    },
    [bebe.nome, definirPendente, pedirFoco, reler],
  )

  const iniciar = useCallback(() => {
    if (emCurso.current) return
    idDoIniciar.current ??= uuidV7()
    const id = idDoIniciar.current
    const inicio = Date.now()
    void executar({
      onde: 'iniciar',
      controle: CHAVE.iniciar,
      chamar: () =>
        seSucesso(dados.iniciar({ id, bebe: bebe.id, inicio }), () => ({
          confirmacao: null,
          foco: [CHAVE.encerrar(id), CHAVE.iniciar],
          depois: () => {
            idDoIniciar.current = null
          },
        })),
    })
  }, [bebe.id, dados, executar])

  const encerrar = useCallback(
    (sessao: Registro) => {
      if (emCurso.current) return
      const inicio = Date.parse(sessao.inicio)
      const momento = Date.now()
      const controle = CHAVE.encerrar(sessao.id)
      // O relógio do aparelho está antes do início gravado (item 8): não chama a rotina.
      if (momento < inicio) {
        setConfirmacao(null)
        setErro({ chave: 'relogioAtras', texto: TT.relogioAtras, onde: `sessao:${sessao.id}`, controle, repetivel: false, bloqueia: false })
        return
      }
      void executar({
        onde: `sessao:${sessao.id}`,
        controle,
        chamar: () =>
          seSucesso(dados.encerrar(sessao.id, momento), (fim) => ({
            // Quem encerra primeiro vale: um fim diferente do enviado quer dizer que outra pessoa já tinha encerrado.
            confirmacao: {
              texto: fim === momento ? encerrado(formatarDuracao(fim - inicio)) : jaEncerrada(formatarHora(fim)),
              foco: [controle, CHAVE.iniciar],
              desfazer: null,
            },
            foco: [CHAVE.qualquerEncerrar, CHAVE.iniciar],
          })),
      })
    },
    [dados, executar],
  )

  const descartar = useCallback(
    (sessao: Registro) => {
      const controle = CHAVE.descartar(sessao.id)
      void executar({
        onde: `sessao:${sessao.id}`,
        controle,
        chamar: () =>
          seSucesso(dados.descartar(sessao.id), () => ({
            confirmacao: { texto: TT.descartada, foco: [controle, CHAVE.iniciar], desfazer: { tipo: 'restaurar', id: sessao.id } },
            foco: [CHAVE.qualquerEncerrar, CHAVE.iniciar],
          })),
      })
    },
    [dados, executar],
  )

  const desfazer = useCallback(() => {
    if (!confirmacao?.desfazer) return
    const { tipo, id } = confirmacao.desfazer
    const { foco } = confirmacao
    void executar({
      onde: 'confirmacao',
      controle: CHAVE.desfazer,
      chamar: () =>
        seSucesso(tipo === 'restaurar' ? dados.restaurar(id) : dados.descartar(id), () => ({
          confirmacao: { texto: TT.desfeito, foco, desfazer: null },
          foco,
        })),
    })
  }, [confirmacao, dados, executar])

  const abrirPainel = useCallback(
    (tipo: TipoDoPainel) => {
      if (emCurso.current) return
      if (painel?.tipo === tipo) {
        pedirFoco([CHAVE.campoDoPainel])
        return
      }
      setErro(null)
      setConfirmacao(null)
      setPasso(null)
      setErroDeCampo(null)
      setPainel({ tipo, id: uuidV7(), abertoEm: Date.now() })
    },
    [painel, pedirFoco],
  )

  const fecharPainel = useCallback(() => {
    if (emCurso.current || !painel || erro?.bloqueia) return
    setPainel(null)
    setPasso(null)
    setErroDeCampo(null)
    if (erro?.onde === 'painel') setErro(null)
    pedirFoco([painel.tipo === 'agora' ? CHAVE.abrirAgora : CHAVE.abrirHorario])
  }, [erro, painel, pedirFoco])

  const salvarPainel = useCallback(
    (entrada: EntradaDoPainel, confirmados: Passo[] = []) => {
      if (emCurso.current || !painel || erro?.bloqueia || !lido) return
      const agora = Date.now()
      const resultado =
        painel.tipo === 'agora' ? intervaloDoAgora(entrada.duracao, agora) : intervaloDoFormulario(entrada, lerAparelho(agora).fuso, agora)
      if (!resultado.ok) {
        setPasso(null)
        setErroDeCampo(resultado.erro)
        return
      }
      setErroDeCampo(null)
      const { intervalo } = resultado
      const proximo = proximoPasso(intervalo, [...lido.bloco.emAndamento, ...lido.bloco.sessoes], confirmados)
      if (proximo) {
        setPasso({ passo: proximo, confirmados, entrada })
        pedirFoco([CHAVE.confirmar])
        return
      }
      setPasso(null)
      const { id, tipo } = painel
      const abrir = tipo === 'agora' ? CHAVE.abrirAgora : CHAVE.abrirHorario
      void executar({
        onde: 'painel',
        controle: CHAVE.salvar,
        chamar: () =>
          seSucesso(dados.registrarDepois({ id, bebe: bebe.id, inicio: intervalo.inicio, fim: intervalo.fim }), () => ({
            confirmacao: { texto: TT.registrado, foco: [abrir, CHAVE.iniciar], desfazer: { tipo: 'excluir', id } },
            foco: [abrir, CHAVE.iniciar],
            depois: () => setPainel(null),
          })),
      })
    },
    [bebe.id, dados, erro, executar, lido, painel, pedirFoco],
  )

  const confirmarPasso = useCallback(() => {
    if (!passo) return
    salvarPainel(passo.entrada, [...passo.confirmados, passo.passo])
  }, [passo, salvarPainel])

  const voltarDoPasso = useCallback(() => {
    setPasso(null)
    pedirFoco([CHAVE.campoDoPainel])
  }, [pedirFoco])

  const editarCampo = useCallback(() => setErroDeCampo(null), [])

  const fecharConfirmacao = useCallback(() => {
    if (!confirmacao) return
    setConfirmacao(null)
    pedirFoco(confirmacao.foco)
  }, [confirmacao, pedirFoco])

  const tentarDeNovo = useCallback(() => {
    if (ultimaTarefa.current) void executar(ultimaTarefa.current)
  }, [executar])

  // "Fechar" do T-41: tira a mensagem, fecha o painel e relê o bloco (a primeira tentativa pode ter salvo).
  const fecharErro = useCallback(() => {
    if (!erro || emCurso.current) return
    const { onde, controle } = erro
    const deveFechar = onde === 'painel' ? painel : null
    setErro(null)
    if (onde === 'iniciar') idDoIniciar.current = null
    if (deveFechar) {
      setPainel(null)
      setPasso(null)
      setErroDeCampo(null)
    }
    void reler('normal').then(() => {
      pedirFoco(deveFechar ? [deveFechar.tipo === 'agora' ? CHAVE.abrirAgora : CHAVE.abrirHorario, CHAVE.iniciar] : [controle, CHAVE.iniciar])
    })
  }, [erro, painel, pedirFoco, reler])

  const atualizar = useCallback(() => {
    setSalvoSemAtualizar(false)
    void reler('normal')
  }, [reler])

  const tentarLeituraDeNovo = useCallback(() => {
    setLeitura('carregando')
    void reler('normal')
  }, [reler])

  const papelEfetivo = contexto?.papel ?? papel
  const arquivado = arquivadoPeloErro || (contexto ? contexto.arquivado : bebe.estado === 'arquivado')
  const acessoPerdido = contexto?.acessoPerdido ?? false
  const escreve = podeEscrever(papelEfetivo) && !arquivado && !acessoPerdido

  // A página já mostra T-40 e T-23 quando o que ela leu os pede; o bloco só acrescenta o que mudou depois.
  const paginaMostraArquivado = bebe.estado === 'arquivado'
  const paginaMostraObservador = !paginaMostraArquivado && papel === 'observador'
  const noticia: BlocoTummyEstado['noticia'] = acessoPerdido
    ? null
    : arquivado
      ? paginaMostraArquivado || erro?.chave === 'arquivado'
        ? null
        : 'arquivado'
      : papelEfetivo === 'observador' && !paginaMostraObservador
        ? 'observador'
        : null

  const visivel = leitura === 'ok' && !acessoPerdido && lido !== null
  const emAndamento = visivel ? [...lido.bloco.emAndamento].sort(maisRecentePrimeiro) : []
  const encerradas = visivel ? lido.bloco.sessoes : []
  const bloqueado = erro?.bloqueia ?? false

  let ondeDoErro: BlocoTummyEstado['ondeDoErro'] = null
  if (erro) {
    if (erro.onde === 'painel' && painel) ondeDoErro = 'painel'
    else if (erro.onde.startsWith('sessao:') && emAndamento.some((sessao) => `sessao:${sessao.id}` === erro.onde)) ondeDoErro = erro.onde
    else ondeDoErro = 'geral'
  }

  return {
    leitura,
    emAndamento,
    encerradas,
    comDados: visivel,
    incompleta: visivel ? lido.bloco.incompleta : false,
    vazio: visivel && emAndamento.length === 0 && encerradas.length === 0,
    agoraDaLeitura: lido?.agora ?? 0,
    membros: contexto?.membros ?? [],
    contaId: contexto?.contaId ?? '',
    papel: papelEfetivo,
    escreve,
    acessoPerdido,
    noticia,
    ondePendente,
    podeAgir: leitura === 'ok' && ondePendente === null && !bloqueado,
    somenteLeitura: ondePendente !== null || bloqueado,
    erro,
    ondeDoErro,
    confirmacao,
    salvoSemAtualizar,
    painel,
    passo,
    erroDeCampo,
    indiceDoDia,
    acoes: {
      iniciar,
      encerrar,
      descartar,
      abrirPainel,
      fecharPainel,
      salvarPainel,
      confirmarPasso,
      voltarDoPasso,
      editarCampo,
      fecharConfirmacao,
      desfazer,
      tentarDeNovo,
      fecharErro,
      atualizar,
      tentarLeituraDeNovo,
      escolherDia: setIndiceDoDia,
    },
  }
}
