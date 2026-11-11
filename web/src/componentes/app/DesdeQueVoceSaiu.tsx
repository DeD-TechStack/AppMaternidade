import { useId } from 'react'
import { Avatar } from './Avatar.tsx'

export interface ItemDesde {
  chave: string
  /** Quem registrou (o avatar mostra a inicial). */
  pessoa: string
  /** O que foi registrado: "Fralda, xixi". */
  texto: string
  /** Quem e em que papel: "Bruno, pai". Na tela larga vem ao lado do registro; no celular, só para o leitor de tela. */
  detalhe: string
  /** A hora ("07:58") ou, na sessão em andamento, o tempo dela ("1 h 12 min"). */
  quando: string
  /** A sessão em andamento: o tempo vai numa pílula de mel. */
  emAndamento?: boolean
  /**
   * A hora do registro, à esquerda do tipo ("07:58"; na sessão em andamento, a hora em que começou).
   * Opcional: sem ela, a linha mostra `quando` à direita, como antes.
   */
  hora?: string
}

interface Props {
  itens: readonly ItemDesde[]
  className?: string
}

// "Mamada, lado esquerdo, 18 min" → o tipo à esquerda e a duração à direita. O texto inteiro continua no
// parágrafo (a duração fica lá só para o leitor de tela); a duração visível, à direita, é enfeite.
const DURACAO_NO_FIM = /^(.*), (\d+ h(?: \d+ min)?|\d+ min)$/

function separarDuracao(texto: string): { tipo: string; duracao: string | null } {
  const achado = DURACAO_NO_FIM.exec(texto)
  return achado ? { tipo: achado[1], duracao: achado[2] } : { tipo: texto, duracao: null }
}

const DIREITA = 'shrink-0 text-[15px] leading-[22px] whitespace-nowrap tabular-nums'

/**
 * "Desde que você saiu" (DESIGN.md 4, telas do app): o que a família registrou, do mais novo ao mais
 * antigo. A mesma linguagem do resto da área da lista: linhas separadas por um fio fino, sem cartão.
 * Cada linha cabe numa linha só, em qualquer largura: o avatar de quem registrou, a hora e o tipo à
 * esquerda, a duração à direita. O que não cabe termina em reticências; o texto inteiro fica no DOM (o
 * leitor de tela ouve tudo) e no `title`.
 */
export function DesdeQueVoceSaiu({ itens, className }: Props) {
  const idTitulo = useId()
  return (
    <section aria-labelledby={idTitulo} data-desde="" className={className}>
      <h2 id={idTitulo} className="cm-h4">
        Desde que você saiu
      </h2>
      {itens.length === 0 ? (
        <p className="mt-3 border-y border-(--cor-fio-suave) py-4 text-(--cor-texto-2)">Nada novo por aqui.</p>
      ) : (
        <ul className="mt-3 border-t border-(--cor-fio-suave) lg:mt-4">
          {itens.map((item) => {
            const { tipo, duracao } = separarDuracao(item.texto)
            return (
              <li
                key={item.chave}
                data-linha-desde=""
                className="flex min-h-14 items-center gap-2.5 border-b border-(--cor-fio-suave) py-2 whitespace-nowrap lg:gap-4"
              >
                <Avatar nome={item.pessoa} />
                {item.hora ? (
                  <span className="w-[2.75rem] shrink-0 text-[15px] leading-[22px] text-(--cor-texto-2) tabular-nums">
                    {item.hora}
                  </span>
                ) : null}
                <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
                  <p className="min-w-0 truncate font-medium" title={item.texto}>
                    {tipo}
                    {duracao ? <span className="sr-only">{`, ${duracao}`}</span> : null}
                  </p>
                  <p
                    className="min-w-0 shrink-[2] truncate text-[15px] leading-[22px] text-(--cor-texto-2) max-lg:sr-only"
                    title={item.detalhe}
                  >
                    {item.detalhe}
                  </p>
                </div>
                {item.emAndamento ? (
                  <span className={`${DIREITA} rounded-pilula bg-mel px-2.5 py-0.5 font-medium text-cacau`}>{item.quando}</span>
                ) : duracao ? (
                  <span aria-hidden="true" className={`${DIREITA} text-(--cor-texto-2)`}>
                    {duracao}
                  </span>
                ) : item.hora ? null : (
                  <span className={`${DIREITA} text-(--cor-texto-2)`}>{item.quando}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
