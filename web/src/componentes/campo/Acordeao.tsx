import { useId, useState } from 'react'
import { Plus } from 'lucide-react'

interface Item {
  pergunta: string
  resposta: string
}

interface Props {
  itens: readonly Item[]
  /** O nível dos títulos das perguntas no documento. */
  nivel?: 'h3' | 'h4'
  className?: string
}

function Linha({ item, Titulo }: { item: Item; Titulo: 'h3' | 'h4' }) {
  const [aberta, setAberta] = useState(false)
  const id = useId()
  const idResposta = `${id}-resposta`
  const idGatilho = `${id}-gatilho`
  return (
    <div className="cm-acordeao-item" data-aberta={aberta ? '' : undefined}>
      <Titulo className="cm-acordeao-titulo">
        <button
          type="button"
          id={idGatilho}
          className="cm-acordeao-gatilho"
          aria-expanded={aberta}
          aria-controls={idResposta}
          onClick={() => setAberta((atual) => !atual)}
        >
          <span>{item.pergunta}</span>
          <Plus className="cm-acordeao-icone" aria-hidden="true" strokeWidth={1.75} />
        </button>
      </Titulo>
      <div id={idResposta} role="region" aria-labelledby={idGatilho} className="cm-acordeao-resposta" hidden={!aberta}>
        <p>{item.resposta}</p>
      </div>
    </div>
  )
}

/**
 * Acordeão de perguntas (DESIGN.md 4): linhas com fio de 1 px, cada pergunta é um botão de verdade
 * (Enter e Espaço abrem e fecham) com `aria-expanded` e `aria-controls`, num título. O sinal de mais
 * vira um x ao abrir; com movimento reduzido, sem giro animado.
 */
export function Acordeao({ itens, nivel = 'h3', className }: Props) {
  return (
    <div className={['cm-acordeao', className].filter(Boolean).join(' ')} data-acordeao="">
      {itens.map((item) => (
        <Linha key={item.pergunta} item={item} Titulo={nivel} />
      ))}
    </div>
  )
}
