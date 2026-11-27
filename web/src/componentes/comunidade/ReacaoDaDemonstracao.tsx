import { useState } from 'react'
import { TOPICO } from '../../conteudo/comunidade.ts'
import { BOTAO_SECUNDARIO } from '../conta/Partes.tsx'
import { useReacoesDaDemonstracao } from './dados.ts'

export function ReacaoDaDemonstracao({ topicoId }: { topicoId: string }) {
  const reacoes = useReacoesDaDemonstracao()
  if (!reacoes) return null
  return (
    <BotaoDeApoio
      key={topicoId}
      apoiado={reacoes.tem(topicoId)}
      alternar={() => reacoes.alternar(topicoId)}
    />
  )
}

function BotaoDeApoio({ apoiado, alternar }: { apoiado: boolean; alternar: () => boolean }) {
  const [pressionado, setPressionado] = useState(apoiado)
  return (
    <div>
      <button
        type="button"
        data-tamanho="app"
        aria-pressed={pressionado}
        className={`${BOTAO_SECUNDARIO} max-w-full whitespace-normal wrap-anywhere aria-pressed:underline`}
        onClick={() => setPressionado(alternar())}
      >
        {TOPICO.apoiarDemonstracao}
      </button>
    </div>
  )
}
