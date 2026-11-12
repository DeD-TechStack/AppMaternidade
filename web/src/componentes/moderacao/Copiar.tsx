import { useRef, useState } from 'react'
import { BOTAO_SECUNDARIO } from '../conta/Partes.tsx'

interface Props {
  /** O texto inteiro, que fica à vista e selecionável. */
  texto: string
  /** O rótulo do botão ("Copiar id", "Copiar chave"). */
  rotulo: string
  mensagemOk: string
  /** O que a tela diz quando a área de transferência falha: o texto fica selecionado. */
  mensagemFalha: string
}

/**
 * Um texto longo com o botão que o copia. Se a área de transferência falhar (ou não existir), o texto fica
 * selecionado e a tela diz para copiar à mão. A mensagem é uma região `aria-live`, e não `role="status"`:
 * a única confirmação de ação da tela é a do `Status`.
 */
export function TextoCopiavel({ texto, rotulo, mensagemOk, mensagemFalha }: Props) {
  const alvo = useRef<HTMLSpanElement>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)

  function selecionar() {
    const elemento = alvo.current
    const selecao = window.getSelection()
    if (!elemento || !selecao) return
    const faixa = document.createRange()
    faixa.selectNodeContents(elemento)
    selecao.removeAllRanges()
    selecao.addRange(faixa)
  }

  async function copiar() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('sem área de transferência')
      await navigator.clipboard.writeText(texto)
      setMensagem(mensagemOk)
    } catch {
      selecionar()
      setMensagem(mensagemFalha)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span ref={alvo} className="tabular max-w-full select-all wrap-anywhere">
        {texto}
      </span>
      <button type="button" className={BOTAO_SECUNDARIO} data-tamanho="app" onClick={() => void copiar()}>
        {rotulo}
      </button>
      <span aria-live="polite" className="cm-pequeno wrap-anywhere">
        {mensagem}
      </span>
    </div>
  )
}
