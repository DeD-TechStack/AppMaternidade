import { useCallback, useEffect } from 'react'
import { useLocation } from 'react-router'
import { focoDoEstado } from '../../prototipo/foco.ts'
import { useTituloDaTela } from '../../prototipo/useTituloDaTela.ts'
import { useRotina, type AcaoDaConfirmacao } from './contexto.ts'

/**
 * O que toda tela do 38b (Histórico, detalhe, lixeira, notas) compartilha (R38-30): a ref do `<main>`, o foco no
 * `h1` quando a tela é aberta por navegação interna com `foco: 'titulo'` no `state` (pela URL, o foco não se
 * move) e `acionar`, que trata os botões da confirmação: `Desfazer`, `Fechar` e as outras ações fecham a
 * confirmação e levam o foco ao `h1`. `Tentar de novo` deixa a confirmação na tela até dar certo; o do erro de
 * um `Desfazer` (confirmação com `origem`) leva o foco ao `h1` já ao tocar, porque o botão some quando a
 * repetição dá certo e o foco não pode se perder (A11Y-004).
 */
export function useTelaDaRotina() {
  const { principal, focarTitulo } = useTituloDaTela()
  const location = useLocation()
  const { fecharConfirmacao, confirmacao } = useRotina()
  const foco = focoDoEstado(location.state)

  useEffect(() => {
    if (foco === 'titulo') focarTitulo()
  }, [foco, location.key, focarTitulo])

  const acionar = useCallback(
    (acao: AcaoDaConfirmacao) => {
      if (acao.chave !== 'tentar_de_novo') fecharConfirmacao()
      // Um link leva o foco ao `h1` da tela de destino, pelo `state` da navegação.
      if (acao.chave !== 'tentar_de_novo' && !acao.para) focarTitulo()
      if (acao.chave === 'tentar_de_novo' && confirmacao?.origem) focarTitulo()
      acao.executar()
    },
    [fecharConfirmacao, focarTitulo, confirmacao],
  )

  return { principal, focarTitulo, acionar }
}
