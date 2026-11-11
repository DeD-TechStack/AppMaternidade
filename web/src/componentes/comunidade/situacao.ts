import type { SituacaoConta } from '../../dados/comunidade.ts'
import { useDadosComunidade } from './dados.ts'
import { useLeitura } from './useLeitura.ts'

/** Escritor habilitado: aceite vigente e perfil próprio (a regra do banco; a tela só a mostra). */
export const ehEscritor = (situacao: SituacaoConta): boolean => situacao.aceiteVigente && situacao.perfilId !== null

/** Quem tem papel de plataforma vigente (moderador ou admin). */
export const ehDaModeracao = (situacao: SituacaoConta): boolean => situacao.papeis.length > 0

/** A situação da conta na Comunidade, lida na hora em que a tela abre. */
export function useSituacao() {
  const dados = useDadosComunidade()
  return useLeitura(() => dados.situacaoDaConta(), 'situacao')
}
