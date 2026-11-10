import { Botao } from '../componentes/base/Botao.tsx'

/** Uma escolha opcional que ajusta o registro já feito (a fralda: Xixi, Cocô, Ambos). */
interface Escolhas {
  /** O nome acessível do grupo de botões. */
  rotulo: string
  opcoes: readonly string[]
  /** A opção vigente, marcada com `aria-pressed`; `null` quando nenhuma foi escolhida. */
  escolhida: string | null
  aoEscolher: (opcao: string) => void
}

interface Props {
  texto: string | null
  aoDesfazer: () => void
  aoFechar: () => void
  escolhas?: Escolhas
}

// A região fica no DOM mesmo vazia, para o leitor de tela anunciar o que entrar nela. Não some
// sozinha (WCAG 2.2.1): só sai com "Fechar", "Desfazer" ou outro registro. Ela nunca recebe o
// foco: quem usa "Desfazer" ou "Fechar" (que somem junto) tem o foco levado pelo chamador a um
// controle que continua na tela. Mora no painel acima da barra Registrar; o estilo é de `ha-confirmacao`.
// As escolhas, quando há, são opcionais: o registro já foi feito e elas só ajustam o texto.
export function Confirmacao({ texto, aoDesfazer, aoFechar, escolhas }: Props) {
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
          {escolhas ? (
            <div role="group" aria-label={escolhas.rotulo} className="ha-confirmacao-escolhas">
              {escolhas.opcoes.map((opcao) => {
                const ligada = escolhas.escolhida === opcao
                return (
                  <Botao
                    key={opcao}
                    variante="moldura"
                    className="alvo-toque"
                    aria-pressed={ligada}
                    data-ligado={ligada ? '' : undefined}
                    onClick={() => escolhas.aoEscolher(opcao)}
                  >
                    {opcao}
                  </Botao>
                )
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
