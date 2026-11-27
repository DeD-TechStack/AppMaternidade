import { useEffect, useRef } from 'react'
import type { ErroDados } from '../../dados/comum.ts'
import type { Bebe, ConviteResumo, Membro } from '../../dados/conta.ts'

/** Os erros depois dos quais a tela relê a família: o que a pessoa via mudou por fora (RF-15). */
const ERROS_DE_FAMILIA_MUDADA: ReadonlySet<string> = new Set([
  'nao_encontrado',
  'sem_permissao',
  'vinculo_inativo',
  'convite_nao_pendente',
])

export const familiaMudou = (erro: ErroDados) => ERROS_DE_FAMILIA_MUDADA.has(erro.chave)

/**
 * Chama `aoFalhar` uma vez por erro de papel ou de objeto sumido. A função mais nova vale, sem
 * reabrir o efeito a cada renderização (ela costuma ser uma seta nova a cada vez).
 */
export function useAoFalharNaFamilia(erro: ErroDados | null, aoFalhar?: (erro: ErroDados) => void | Promise<void>) {
  const ultima = useRef(aoFalhar)
  useEffect(() => {
    ultima.current = aoFalhar
  })
  useEffect(() => {
    if (erro && familiaMudou(erro)) void ultima.current?.(erro)
  }, [erro])
}

// As caixas de diálogo da Família (RN-03): qual está aberta e o que a tela deixa os blocos fazer.

export type DialogoAberto =
  | { tipo: 'remover'; membro: Membro }
  | { tipo: 'papel'; membro: Membro }
  | { tipo: 'sair' }
  | { tipo: 'excluir' }
  | { tipo: 'cancelarConvite'; convite: ConviteResumo }
  | { tipo: 'arquivar'; bebe: Bebe }

/** O que cada bloco da Família pode pedir à tela. */
export interface AcoesDaFamilia {
  /** Abre uma caixa; o foco volta a `retorno` quando ela fecha. */
  abrirDialogo(dialogo: DialogoAberto, retorno: HTMLElement): void
  /** Depois de uma ação que mudou dados: a confirmação no status e a releitura (RF-15, RF-17). */
  aposAcao(mensagem: string, voluntaria?: boolean): Promise<void>
  /**
   * Depois de `sem_permissao` ou `nao_encontrado`: fecha a caixa, mostra a frase do catálogo no topo
   * e relê as famílias e a família atual (a pessoa pode ter perdido o acesso, RF-15).
   */
  aposFalha(erro: ErroDados): Promise<void>
  /** Relê só os dados da família atual (depois de um `rede` numa escrita que cria objeto novo). */
  relerDetalhe(): Promise<void>
  /** Escreve no status (copiar, por exemplo). */
  dizer(mensagem: string | null): void
}
