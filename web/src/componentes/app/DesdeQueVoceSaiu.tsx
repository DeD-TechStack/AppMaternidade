import { useId, useState } from 'react'
import { Pilha } from '../base/layout/index.ts'
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

const DIREITA = 'shrink-0 text-pequeno whitespace-nowrap tabular-nums'

// O texto da linha é o controle que abre a linha inteira: botão nativo (Enter e Espaço ativam), com o
// alvo do app (44 px; 56 px na madrugada, pela --alvo-toque) e o anel de foco do sistema. Fechado, corta
// com reticências; o nome acessível é o texto inteiro, uma vez só.
const CONTROLE =
  'alvo-toque block min-h-[max(44px,var(--alvo-toque))] w-full truncate rounded-[6px] text-left leading-[max(44px,var(--alvo-toque))] font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--cor-foco)'

/**
 * Uma linha do histórico. Com `hora`, o leiaute novo: hora e tipo à esquerda e a duração (a do fim do
 * texto, ou a pílula da sessão) à direita. Sem `hora`, o contrato de antes: o texto inteiro à esquerda e o
 * `quando` à direita (a pílula de mel na sessão). Nos dois casos, tocar no texto abre, logo abaixo da
 * fileira e na mesma linguagem de fio fino, o texto inteiro e o detalhe numa linha que quebra.
 */
function LinhaDesde({ item }: { item: ItemDesde }) {
  const [aberta, setAberta] = useState(false)
  const idAberta = useId()
  const comHora = item.hora !== undefined
  // A duração só sai do texto no leiaute com hora; sem hora, o texto fica como veio.
  const { tipo, duracao } = comHora ? separarDuracao(item.texto) : { tipo: item.texto, duracao: null }

  const direita = item.emAndamento ? (
    <span className={`${DIREITA} rounded-pilula bg-mel px-2.5 py-0.5 font-medium text-cacau`}>{item.quando}</span>
  ) : !comHora ? (
    <span className={`${DIREITA} text-(--cor-texto-2)`}>{item.quando}</span>
  ) : duracao ? (
    <span aria-hidden="true" className={`${DIREITA} text-(--cor-texto-2)`}>
      {duracao}
    </span>
  ) : null

  return (
    <li data-linha-desde="" className="border-b border-(--cor-fio-suave)">
      <div data-fila="" className="flex min-h-14 items-center gap-2.5 whitespace-nowrap lg:gap-4">
        <Avatar nome={item.pessoa} />
        {comHora ? (
          <span className="w-[2.75rem] shrink-0 text-pequeno text-(--cor-texto-2) tabular-nums">{item.hora}</span>
        ) : null}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <p className="min-w-0 flex-1 lg:flex-initial" title={item.texto}>
            <button
              type="button"
              data-abrir-linha=""
              aria-expanded={aberta}
              aria-controls={aberta ? idAberta : undefined}
              className={CONTROLE}
              onClick={() => setAberta(!aberta)}
            >
              {tipo}
              {duracao ? <span className="sr-only">{`, ${duracao}`}</span> : null}
            </button>
          </p>
          <p
            className="min-w-0 shrink-[2] truncate text-pequeno text-(--cor-texto-2) max-lg:sr-only"
            title={item.detalhe}
          >
            {item.detalhe}
          </p>
        </div>
        {direita}
      </div>
      {aberta ? (
        <div
          id={idAberta}
          data-linha-aberta=""
          className="pb-3 pl-[2.625rem] text-pequeno whitespace-normal [overflow-wrap:anywhere] lg:pl-14"
        >
          <p className="font-medium text-(--cor-texto)">{item.texto}</p>
          <p className="text-(--cor-texto-2)">{item.detalhe}</p>
        </div>
      ) : null}
    </li>
  )
}

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
    <Pilha as="section" vao="pilha" aria-labelledby={idTitulo} data-desde="" className={className}>
      <h2 id={idTitulo} className="cm-h4">
        Desde que você saiu
      </h2>
      {itens.length === 0 ? (
        <p className="border-y border-(--cor-fio-suave) py-4 text-(--cor-texto-2)">Nada novo por aqui.</p>
      ) : (
        <ul className="border-t border-(--cor-fio-suave)">
          {itens.map((item) => (
            <LinhaDesde key={item.chave} item={item} />
          ))}
        </ul>
      )}
    </Pilha>
  )
}
