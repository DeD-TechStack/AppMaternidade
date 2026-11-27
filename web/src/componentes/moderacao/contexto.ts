import { createContext, useContext } from 'react'
import type { ErroDados, Resultado } from '../../dados/comum.ts'

/** O que o quadro do painel oferece às telas que ele guarda. */
export interface ContextoDoPainel {
  /**
   * Toda leitura do painel passa por aqui (MAT-40:RF-10, PR-34): relê a situação da conta antes de ler e, se
   * a leitura voltar vazia (`ehVazio`), relê de novo antes de a tela mostrar "vazio" ou "não encontrado".
   * Sem papel vigente (ou sem admin, na M5) o painel passa ao estado "sem permissão".
   */
  ler: <T>(corpo: () => Promise<Resultado<T>>, ehVazio?: (valor: T) => boolean) => Promise<Resultado<T>>
  /**
   * A conferência de um envio incerto (RF-19) é uma leitura como qualquer outra e passa pela mesma guarda
   * (RF-10): a situação da conta é relida antes; `ehVazio` marca o resultado em que a leitura não achou a
   * linha (conteúdo ou denúncia ausente, papel que não está na lista), e então a situação é relida de novo
   * antes de a conferência confiar nele. Sem papel, ou com `sem_permissao`, o painel passa a "sem permissão"
   * e a caixa ou o formulário fecham. Com o papel vigente, o resultado da leitura volta sem mudança.
   */
  conferir: <T>(corpo: () => Promise<Resultado<T>>, ehVazio?: (valor: T) => boolean) => Promise<Resultado<T>>
  /** Uma ação que o banco recusou com `sem papel de plataforma` leva o painel ao estado "sem permissão". */
  aoErroDeAcao: (erro: ErroDados) => void
  /** O id do perfil público próprio, como a última leitura da situação o devolveu. */
  perfilId: () => string | null
  /** O id da conta da sessão. */
  contaId: string | null
  /** A conta tem o papel admin vigente (a M5 só abre assim). */
  admin: boolean
}

export const ContextoDoPainel = createContext<ContextoDoPainel | null>(null)

export function usePainel(): ContextoDoPainel {
  const contexto = useContext(ContextoDoPainel)
  if (!contexto) throw new Error('usePainel só vale dentro do quadro do painel')
  return contexto
}
