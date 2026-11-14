import { Check, Undo2 } from 'lucide-react'
import { ALVO_APP } from '../componentes/app/alvo.ts'
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
// controle que continua na tela. Mora no cartão flutuante acima da barra Registrar.
// As escolhas, quando há, são opcionais: o registro já foi feito e elas só ajustam o texto.
export function Confirmacao({ texto, aoDesfazer, aoFechar, escolhas }: Props) {
  return (
    <div role="status" className={texto ? 'flex flex-wrap items-center gap-3' : undefined}>
      {texto ? (
        <>
          <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-mel text-cacau"
          >
            <Check className="size-5" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-corpo font-medium">{texto}</p>
          <div className="flex basis-full gap-2 sm:basis-auto">
            <Botao
              variante="contorno"
              tamanho="app"
              icone={<Undo2 />}
              className={`flex-1 sm:flex-none ${ALVO_APP}`}
              onClick={aoDesfazer}
            >
              <span>Desfazer</span>
            </Botao>
            <Botao variante="texto" tamanho="app" className={`flex-1 sm:flex-none ${ALVO_APP}`} onClick={aoFechar}>
              Fechar
            </Botao>
          </div>
          {escolhas ? (
            <div role="group" aria-label={escolhas.rotulo} className="grid basis-full grid-cols-3 gap-2">
              {escolhas.opcoes.map((opcao) => {
                const ligada = escolhas.escolhida === opcao
                return (
                  <Botao
                    key={opcao}
                    variante="contorno"
                    tamanho="app"
                    className={`px-3 ${ALVO_APP}`}
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
