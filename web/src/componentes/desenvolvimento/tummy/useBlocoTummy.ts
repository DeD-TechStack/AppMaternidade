import { useCallback, useEffect, useReducer, useRef, type RefObject } from 'react'
import { bebeArquivado } from '../../../conteudo/desenvolvimento/textosLogada.ts'
import { TT, encerrado, jaEncerrada } from '../../../conteudo/desenvolvimento/textosTummy.ts'
import type { Papel, Resultado } from '../../../dados/comum.ts'
import type { Bebe, FamiliaResumo, Membro } from '../../../dados/conta.ts'
import { useDadosDesenvolvimento } from '../../../dados/desenvolvimento.contexto.tsx'
import { comPrazoDeResposta, traduzirErro, type ChaveDeErro } from '../../../dados/desenvolvimento.ts'
import { lerAparelho } from '../../../dados/rotina.dia.ts'
import { podeEscrever, type ContextoRotina, type Registro } from '../../../dados/rotina.tipos.ts'
import { uuidV7 } from '../../../dados/rotina.uuid.ts'
import { usePendencia } from '../../../paginas/desenvolvimento/pendencia.tsx'
import { formatarDuracao, formatarHora } from '../../../prototipo/formatar.ts'
import { CHAVE, focarPrimeiro } from './foco.ts'
import {
  estadoInicial,
  reduzir,
  type ConfirmacaoDoBloco,
  type ContextoDoBloco,
  type ErroDoBloco,
  type Onde,
  type PainelAberto,
  type PassoEmAberto,
  type TipoDoPainel,
} from './estadoDoTummy.ts'
import { intervaloDoAgora, intervaloDoFormulario, proximoPasso, type EntradaDoPainel, type ErroDeCampo, type Passo } from './regras.ts'

// O estado do bloco de tummy time (MAT-39b): as leituras, as cinco escritas, a operação pendente, os erros do
// DES-09, as confirmações e o destino do foco. O gancho não desenha nada.

// Os tipos e as transições do estado moram em `estadoDoTummy.ts`; os tipos que as telas importam seguem exportados daqui.
export type { Onde, ErroDoBloco, PainelAberto, PassoEmAberto } from './estadoDoTummy.ts'

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
  /** A releitura do contexto mostrou que o vínculo com a família acabou: a página relê o dela (DES-09, estado 3). */
  aoPerderAcesso?: () => void
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

export function useBlocoTummy({ bebe, familia, papel, raiz, aoPerderAcesso }: Entrada): BlocoTummyEstado {
  const dados = useDadosDesenvolvimento()
  const { definirPendente } = usePendencia()

  const perderAcesso = useRef(aoPerderAcesso)
  useEffect(() => {
    perderAcesso.current = aoPerderAcesso
  }, [aoPerderAcesso])

  const vivo = useRef(false)
  const pedido = useRef(0)
  const emCurso = useRef(false)
  const idDoIniciar = useRef<string | null>(null)
  const ultimaTarefa = useRef<Tarefa | null>(null)

  const [estado, dispatch] = useReducer(reduzir, estadoInicial)
  const {
    leitura,
    lido,
    contexto,
    ondePendente,
    erro,
    confirmacao,
    salvoSemAtualizar,
    painel,
    passo,
    erroDeCampo,
    indiceDoDia,
    arquivadoPeloErro,
    pedidoDeFoco,
  } = estado

  const pedirFoco = useCallback((chaves: string[]) => dispatch({ tipo: 'pedirFoco', chaves }), [])
  const escolherDia = useCallback((indice: number) => dispatch({ tipo: 'escolherDia', indice }), [])

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
      dispatch({ tipo: 'lerComecou', numero })
      const agora = Date.now()
      const [resposta, bloco] = await Promise.all([dados.contexto(), dados.lerBloco(bebe.id, familia.fuso, agora)])
      if (!vivo.current || numero !== pedido.current) return 'descartada'
      const falhou = () => {
        dispatch({ tipo: 'lidoFalhou', numero, modo })
        return 'falha' as const
      }
      if (!resposta.ok) return falhou()
      const novo = lerContexto(resposta.valor, familia.id, bebe.id)
      if (novo.acessoPerdido) {
        dispatch({ tipo: 'lidoAcessoPerdido', numero, contexto: novo })
        // O contexto da página ainda mostra o bebê: ela o relê, e o bloco sai da tela com o estado 3.
        perderAcesso.current?.()
        return 'ok'
      }
      if (!bloco.ok) return falhou()
      dispatch({ tipo: 'lidoOk', numero, contexto: novo, lido: { bloco: bloco.valor, agora } })
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
      dispatch({ tipo: 'escritaComecou', onde: tarefa.onde })
      definirPendente(true)

      const resposta = await comPrazoDeResposta(tarefa.chamar())
      if (!vivo.current) return

      let foco: string[]
      if (resposta.ok) {
        resposta.valor.depois?.()
        dispatch({ tipo: 'escritaOk', confirmacao: resposta.valor.confirmacao })
        const releitura = await reler('depoisDeEscrita')
        if (!vivo.current) return
        if (releitura === 'falha') dispatch({ tipo: 'salvoSemAtualizar' })
        foco = resposta.valor.foco
      } else {
        const linha = traduzirErro(resposta.erro)
        dispatch({
          tipo: 'escritaFalhou',
          erro: {
            chave: linha.chave,
            texto: textoDoErro(linha.chave, bebe.nome),
            onde: tarefa.onde,
            controle: tarefa.controle,
            repetivel: linha.repetivel,
            bloqueia: linha.salvou === 'desconhecido',
          },
          arquivado: linha.chave === 'arquivado',
        })
        if (RELE_DEPOIS_DO_ERRO.has(linha.chave)) await reler('normal')
        if (!vivo.current) return
        // Erro não move o foco; se o erro tirou o controle da tela, ele vai à mensagem.
        foco = [tarefa.controle, CHAVE.alerta]
      }

      emCurso.current = false
      dispatch({ tipo: 'escritaTerminou' })
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
        dispatch({
          tipo: 'relogioAtras',
          erro: { chave: 'relogioAtras', texto: TT.relogioAtras, onde: `sessao:${sessao.id}`, controle, repetivel: false, bloqueia: false },
        })
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
      dispatch({ tipo: 'abrirPainel', painel: { tipo, id: uuidV7(), abertoEm: Date.now() } })
    },
    [painel, pedirFoco],
  )

  const fecharPainel = useCallback(() => {
    if (emCurso.current || !painel || erro?.bloqueia) return
    dispatch({ tipo: 'fecharPainel', limparErroDoPainel: erro?.onde === 'painel' })
    pedirFoco([painel.tipo === 'agora' ? CHAVE.abrirAgora : CHAVE.abrirHorario])
  }, [erro, painel, pedirFoco])

  const salvarPainel = useCallback(
    (entrada: EntradaDoPainel, confirmados: Passo[] = []) => {
      if (emCurso.current || !painel || erro?.bloqueia || !lido) return
      const agora = Date.now()
      const resultado =
        painel.tipo === 'agora' ? intervaloDoAgora(entrada.duracao, agora) : intervaloDoFormulario(entrada, lerAparelho(agora).fuso, agora)
      if (!resultado.ok) {
        dispatch({ tipo: 'passoSaiu' })
        dispatch({ tipo: 'erroDeCampo', erro: resultado.erro })
        return
      }
      dispatch({ tipo: 'erroDeCampo', erro: null })
      const { intervalo } = resultado
      const proximo = proximoPasso(intervalo, [...lido.bloco.emAndamento, ...lido.bloco.sessoes], confirmados, agora)
      if (proximo) {
        dispatch({ tipo: 'passoEmAberto', passo: { passo: proximo, confirmados, entrada } })
        pedirFoco([CHAVE.confirmar])
        return
      }
      dispatch({ tipo: 'passoSaiu' })
      const { id, tipo } = painel
      const abrir = tipo === 'agora' ? CHAVE.abrirAgora : CHAVE.abrirHorario
      void executar({
        onde: 'painel',
        controle: CHAVE.salvar,
        chamar: () =>
          seSucesso(dados.registrarDepois({ id, bebe: bebe.id, inicio: intervalo.inicio, fim: intervalo.fim }), () => ({
            confirmacao: { texto: TT.registrado, foco: [abrir, CHAVE.iniciar], desfazer: { tipo: 'excluir', id } },
            foco: [abrir, CHAVE.iniciar],
            depois: () => dispatch({ tipo: 'painelFechado' }),
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
    dispatch({ tipo: 'passoSaiu' })
    pedirFoco([CHAVE.campoDoPainel])
  }, [pedirFoco])

  const editarCampo = useCallback(() => dispatch({ tipo: 'erroDeCampo', erro: null }), [])

  const fecharConfirmacao = useCallback(() => {
    if (!confirmacao) return
    dispatch({ tipo: 'fecharConfirmacao' })
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
    dispatch({ tipo: 'fecharErro', fecharPainel: deveFechar !== null })
    if (onde === 'iniciar') idDoIniciar.current = null
    void reler('normal').then(() => {
      pedirFoco(deveFechar ? [deveFechar.tipo === 'agora' ? CHAVE.abrirAgora : CHAVE.abrirHorario, CHAVE.iniciar] : [controle, CHAVE.iniciar])
    })
  }, [erro, painel, pedirFoco, reler])

  const atualizar = useCallback(() => {
    dispatch({ tipo: 'atualizarSalvo' })
    void reler('normal')
  }, [reler])

  const tentarLeituraDeNovo = useCallback(() => {
    dispatch({ tipo: 'tentarLeitura' })
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
    // Uma leitura incompleta nunca vale como "vazio": o que falta pode ser justamente o tummy time (T-63, não T-22).
    vazio: visivel && !lido.bloco.incompleta && emAndamento.length === 0 && encerradas.length === 0,
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
      escolherDia,
    },
  }
}
