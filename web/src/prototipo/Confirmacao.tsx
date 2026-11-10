import { Botao } from '../componentes/base/Botao.tsx'

interface Props {
  texto: string | null
  aoDesfazer: () => void
  aoFechar: () => void
}

// A região fica no DOM mesmo vazia, para o leitor de tela anunciar o que entrar nela. Não some
// sozinha (WCAG 2.2.1): só sai com "Fechar", "Desfazer" ou outro registro. Ela nunca recebe o
// foco: quem usa "Desfazer" ou "Fechar" (que somem junto) tem o foco levado pelo chamador a um
// controle que continua na tela. Mora no painel acima da barra Registrar; o estilo é de `ha-confirmacao`.
export function Confirmacao({ texto, aoDesfazer, aoFechar }: Props) {
  return (
    <div role="status" className={texto ? 'ha-confirmacao' : undefined}>
      {texto ? (
        <>
          <p className="ha-confirmacao-texto t-corpo">{texto}</p>
          <div className="ha-confirmacao-acoes">
            <Botao variante="moldura" className="alvo-toque" onClick={aoDesfazer}>
              Desfazer
            </Botao>
            <Botao variante="moldura" className="alvo-toque" onClick={aoFechar}>
              Fechar
            </Botao>
          </div>
        </>
      ) : null}
    </div>
  )
}
