import { useId } from 'react'
import { Pilha } from '../base/layout/index.ts'
import { Avatar } from './Avatar.tsx'
import type { SessaoAnterior, TipoSessao } from '../../prototipo/estado.ts'
import { formatarDuracao, formatarHora } from '../../prototipo/formatar.ts'

const TITULO: Record<TipoSessao, string> = {
  sono: 'Sonecas anteriores',
  mamada: 'Mamadas anteriores',
  tummy: 'Tummy time anteriores',
}

interface Props {
  tipo: TipoSessao
  itens: readonly SessaoAnterior[]
  className?: string
}

/** As sessões já encerradas do mesmo tipo: quando, quem, onde e quanto durou. */
export function SessoesAnteriores({ tipo, itens, className }: Props) {
  const idTitulo = useId()
  return (
    <Pilha
      as="section"
      vao="junto"
      dataH="coluna"
      aria-labelledby={idTitulo}
      data-anteriores=""
      className={`rounded-cartao border border-(--cor-fio-suave) bg-(--cor-cartao) px-5 pt-5 pb-2 [box-shadow:var(--sombra-cartao)] lg:px-7 lg:pt-7 ${className ?? ''}`}
    >
      <h2 id={idTitulo} className="cm-h4">
        {TITULO[tipo]}
      </h2>
      {itens.length === 0 ? (
        <p className="py-4 text-(--cor-texto-2)">Nenhuma ainda.</p>
      ) : (
        <ul>
          {itens.slice(0, 4).map((item) => (
            <li
              key={item.inicio}
              className="flex items-center gap-3 border-t border-(--cor-fio-suave) py-3.5 first:border-t-0 lg:gap-4"
            >
              <Avatar nome={item.pessoa} />
              <div className="min-w-0 flex-1">
                <p className="font-medium tabular-nums">{`${formatarHora(item.inicio)} às ${formatarHora(item.fim)}`}</p>
                <p className="text-pequeno text-(--cor-texto-2)">{`${item.pessoa}, ${item.detalhe}`}</p>
              </div>
              <span className="shrink-0 text-pequeno whitespace-nowrap text-(--cor-texto-2) tabular-nums">
                {formatarDuracao(item.fim - item.inicio)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Pilha>
  )
}
