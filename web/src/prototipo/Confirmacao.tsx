interface Props {
  texto: string | null
  aoDesfazer: () => void
  aoFechar: () => void
}

// A região fica no DOM mesmo vazia, para o leitor de tela anunciar o que entrar nela. Não some
// sozinha (WCAG 2.2.1): só sai com "Fechar", "Desfazer" ou outro registro. Ela nunca recebe o
// foco: quem usa "Desfazer" ou "Fechar" (que somem junto) tem o foco levado pelo chamador a um
// controle que continua na tela.
export function Confirmacao({ texto, aoDesfazer, aoFechar }: Props) {
  return (
    <div
      role="status"
      className={texto ? 'mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-b pb-3' : undefined}
    >
      {texto ? (
        <>
          <p className="min-w-[10rem] flex-1">{texto}</p>
          <div className="flex gap-2">
            <button type="button" className="botao botao-secundario" onClick={aoDesfazer}>
              Desfazer
            </button>
            <button type="button" className="botao botao-secundario" onClick={aoFechar}>
              Fechar
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
