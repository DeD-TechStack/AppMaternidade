import type { Papel } from '../../../dados/comum.ts'
import type { Membro } from '../../../dados/conta.ts'
import type { ChaveDeErro, LeituraDoBloco } from '../../../dados/desenvolvimento.ts'
import type { EntradaDoPainel, ErroDeCampo, Passo } from './regras.ts'

// O estado do bloco de tummy time (Q-6): um reducer puro no lugar de treze estados soltos. Cada transição que o
// gancho fazia com vários setters juntos é uma ação; o que é guarda de execução (vivo, emCurso, ids) fica no gancho.

export type TipoDoPainel = 'agora' | 'horario'

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

export interface ConfirmacaoDoBloco {
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

export interface ContextoDoBloco {
  contaId: string
  papel: Papel
  arquivado: boolean
  membros: readonly Membro[]
  acessoPerdido: boolean
}

interface LidoDoBloco {
  bloco: LeituraDoBloco
  agora: number
}

export interface EstadoDoTummy {
  leitura: 'carregando' | 'ok' | 'falha'
  lido: LidoDoBloco | null
  contexto: ContextoDoBloco | null
  ondePendente: Onde | null
  erro: ErroDoBloco | null
  confirmacao: ConfirmacaoDoBloco | null
  salvoSemAtualizar: boolean
  painel: PainelAberto | null
  passo: PassoEmAberto | null
  erroDeCampo: ErroDeCampo | null
  indiceDoDia: number
  // `P0001 bebe arquivado` vale por si: os controles somem mesmo que a releitura do contexto ainda diga o contrário.
  arquivadoPeloErro: boolean
  pedidoDeFoco: { n: number; chaves: string[] }
  /** O número da leitura mais nova: o resultado de uma leitura mais velha é descartado. */
  pedido: number
}

export const estadoInicial: EstadoDoTummy = {
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
}

export type AcaoDoTummy =
  | { tipo: 'lerComecou'; numero: number }
  | { tipo: 'lidoOk'; numero: number; contexto: ContextoDoBloco; lido: LidoDoBloco }
  | { tipo: 'lidoAcessoPerdido'; numero: number; contexto: ContextoDoBloco }
  | { tipo: 'lidoFalhou'; numero: number; modo: 'normal' | 'depoisDeEscrita' }
  | { tipo: 'tentarLeitura' }
  | { tipo: 'escritaComecou'; onde: Onde }
  | { tipo: 'escritaOk'; confirmacao: ConfirmacaoDoBloco | null }
  | { tipo: 'salvoSemAtualizar' }
  | { tipo: 'escritaFalhou'; erro: ErroDoBloco; arquivado: boolean }
  | { tipo: 'escritaTerminou' }
  | { tipo: 'relogioAtras'; erro: ErroDoBloco }
  | { tipo: 'abrirPainel'; painel: PainelAberto }
  | { tipo: 'fecharPainel'; limparErroDoPainel: boolean }
  | { tipo: 'painelFechado' }
  | { tipo: 'passoEmAberto'; passo: PassoEmAberto }
  | { tipo: 'passoSaiu' }
  | { tipo: 'erroDeCampo'; erro: ErroDeCampo | null }
  | { tipo: 'fecharConfirmacao' }
  | { tipo: 'fecharErro'; fecharPainel: boolean }
  | { tipo: 'atualizarSalvo' }
  | { tipo: 'escolherDia'; indice: number }
  | { tipo: 'pedirFoco'; chaves: string[] }

export function reduzir(estado: EstadoDoTummy, acao: AcaoDoTummy): EstadoDoTummy {
  switch (acao.tipo) {
    case 'lerComecou':
      return { ...estado, pedido: acao.numero }
    case 'lidoOk':
      if (acao.numero !== estado.pedido) return estado
      return { ...estado, contexto: acao.contexto, lido: acao.lido, leitura: 'ok' }
    case 'lidoAcessoPerdido':
      if (acao.numero !== estado.pedido) return estado
      return { ...estado, contexto: acao.contexto, lido: null, leitura: 'ok' }
    case 'lidoFalhou':
      if (acao.numero !== estado.pedido) return estado
      // Depois de uma escrita, a falha mantém o que estava na tela (T-52). Leitura em falha e confirmação juntas
      // não existem: quem derruba a leitura tira a confirmação.
      return acao.modo === 'normal' ? { ...estado, leitura: 'falha', confirmacao: null } : estado
    case 'tentarLeitura':
      return { ...estado, leitura: 'carregando' }
    case 'escritaComecou':
      return { ...estado, erro: null, confirmacao: null, salvoSemAtualizar: false, ondePendente: acao.onde }
    case 'escritaOk':
      return { ...estado, confirmacao: estado.leitura === 'falha' ? null : acao.confirmacao }
    case 'salvoSemAtualizar':
      return { ...estado, salvoSemAtualizar: true }
    case 'escritaFalhou':
      return { ...estado, erro: acao.erro, arquivadoPeloErro: estado.arquivadoPeloErro || acao.arquivado }
    case 'escritaTerminou':
      return { ...estado, ondePendente: null }
    case 'relogioAtras':
      return { ...estado, confirmacao: null, erro: acao.erro }
    case 'abrirPainel':
      return { ...estado, erro: null, confirmacao: null, passo: null, erroDeCampo: null, painel: acao.painel }
    case 'fecharPainel':
      return {
        ...estado,
        painel: null,
        passo: null,
        erroDeCampo: null,
        erro: acao.limparErroDoPainel ? null : estado.erro,
      }
    case 'painelFechado':
      return { ...estado, painel: null }
    case 'passoEmAberto':
      return { ...estado, passo: acao.passo }
    case 'passoSaiu':
      return { ...estado, passo: null }
    case 'erroDeCampo':
      return { ...estado, erroDeCampo: acao.erro }
    case 'fecharConfirmacao':
      return { ...estado, confirmacao: null }
    case 'fecharErro':
      return acao.fecharPainel
        ? { ...estado, erro: null, painel: null, passo: null, erroDeCampo: null }
        : { ...estado, erro: null }
    case 'atualizarSalvo':
      return { ...estado, salvoSemAtualizar: false }
    case 'escolherDia':
      return { ...estado, indiceDoDia: acao.indice }
    case 'pedirFoco':
      return { ...estado, pedidoDeFoco: { n: estado.pedidoDeFoco.n + 1, chaves: acao.chaves } }
  }
}
