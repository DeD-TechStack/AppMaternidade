import { COMUM_COMUNIDADE, textoDoErroComunidade } from '../../conteudo/comunidade.ts'
import type { ErroDados } from '../../dados/comum.ts'
import { NaoEncontrado } from '../comunidade/Avisos.tsx'
import { ErroDeLeitura } from './ErroDeLeitura.tsx'

/**
 * O erro de uma leitura da Comunidade, na peça comum. Sessão encerrada: nada (o provedor leva à entrada). Não
 * encontrado (também o `P0002`): o bloco "não existe" (TX-11). Sem permissão: a frase, sem repetir. Rede ou outro: a
 * frase (`desconhecido`, com o código, para o que não é rede) e "Tentar de novo".
 */
export function ErroDaComunidade({ erro, aoTentarDeNovo }: { erro: ErroDados; aoTentarDeNovo: () => void }) {
  if (erro.classe === 'sessao_encerrada') return null
  if (erro.classe === 'nao_encontrado') return <NaoEncontrado />
  if (erro.classe === 'sem_permissao') return <ErroDeLeitura texto={textoDoErroComunidade(erro)} />
  const mostrado = erro.classe === 'rede' ? erro : { ...erro, chave: 'desconhecido' }
  return <ErroDeLeitura texto={textoDoErroComunidade(mostrado)} rotuloDeNovo={COMUM_COMUNIDADE.tentarDeNovo} aoTentarDeNovo={aoTentarDeNovo} />
}
