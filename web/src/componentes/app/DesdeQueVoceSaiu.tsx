import { useId } from 'react'
import { Avatar } from './Avatar.tsx'

export interface ItemDesde {
  chave: string
  /** Quem registrou (o avatar mostra a inicial). */
  pessoa: string
  /** O que foi registrado: "Fralda, xixi". */
  texto: string
  /** A linha de baixo: "Bruno, pai". */
  detalhe: string
  /** A hora ("07:58") ou, na sessão em andamento, o tempo dela ("1 h 12 min"). */
  quando: string
  /** A sessão em andamento: o tempo vai numa pílula de mel. */
  emAndamento?: boolean
}

interface Props {
  itens: readonly ItemDesde[]
  className?: string
}

/**
 * "Desde que você saiu" (DESIGN.md 4, telas do app): o que a família registrou, do mais novo ao mais
 * antigo, cada linha com o avatar redondo de quem registrou, o registro, o autor e a hora.
 */
export function DesdeQueVoceSaiu({ itens, className }: Props) {
  const idTitulo = useId()
  return (
    <section
      aria-labelledby={idTitulo}
      data-desde=""
      className={`rounded-cartao border border-(--cor-fio-suave) bg-(--cor-cartao) px-5 pt-5 pb-2 [box-shadow:var(--sombra-cartao)] lg:px-7 lg:pt-7 ${className ?? ''}`}
    >
      <h2 id={idTitulo} className="cm-h4">
        Desde que você saiu
      </h2>
      {itens.length === 0 ? (
        <p className="py-4 text-(--cor-texto-2)">Nada novo por aqui.</p>
      ) : (
        <ul className="mt-2">
          {itens.map((item) => (
            <li
              key={item.chave}
              className="flex items-center gap-3 border-t border-(--cor-fio-suave) py-3.5 first:border-t-0 lg:gap-4"
            >
              <Avatar nome={item.pessoa} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.texto}</p>
                <p className="text-[15px] leading-[22px] text-(--cor-texto-2)">{item.detalhe}</p>
              </div>
              {item.emAndamento ? (
                <span className="shrink-0 rounded-pilula bg-mel px-3 py-1 text-[15px] leading-[22px] font-medium whitespace-nowrap text-cacau tabular-nums">
                  {item.quando}
                </span>
              ) : (
                <span className="shrink-0 text-[15px] leading-[22px] whitespace-nowrap text-(--cor-texto-2) tabular-nums">
                  {item.quando}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
