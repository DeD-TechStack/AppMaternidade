import { useRef } from 'react'

interface Props {
  texto: string | null
  aoDesfazer: () => void
  aoFechar: () => void
}

// A região fica no DOM mesmo vazia, para o leitor de tela anunciar o que entrar nela.
// Não some sozinha (WCAG 2.2.1): só sai com "Fechar", "Desfazer" ou outro registro.
// Quando o botão que recebeu o foco some, o foco vai para a própria região.
export function Confirmacao({ texto, aoDesfazer, aoFechar }: Props) {
  const regiao = useRef<HTMLDivElement>(null)

  function desfazer() {
    aoDesfazer()
    regiao.current?.focus()
  }

  function fechar() {
    aoFechar()
    regiao.current?.focus()
  }

  return (
    <div
      ref={regiao}
      role="status"
      tabIndex={-1}
      className={texto ? 'mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-b pb-3 outline-none' : 'outline-none'}
    >
      {texto ? (
        <>
          <p className="min-w-[10rem] flex-1">{texto}</p>
          <div className="flex gap-2">
            <button type="button" className="botao botao-secundario" onClick={desfazer}>
              Desfazer
            </button>
            <button type="button" className="botao botao-secundario" onClick={fechar}>
              Fechar
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
