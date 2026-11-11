import { useState, type ReactNode } from 'react'
import { Ban, Lock, Moon, Pause, Play, Scale, Users } from 'lucide-react'
import { Botao } from '../base/Botao.tsx'

interface Selo {
  texto: string
  icone: ReactNode
}

const TAMANHO = 22

/** Os selos do produto (DESIGN.md 4, de F2). */
const SELOS: readonly Selo[] = [
  { texto: 'Sem metas', icone: <Ban size={TAMANHO} aria-hidden="true" /> },
  { texto: 'Sem comparações', icone: <Scale size={TAMANHO} aria-hidden="true" /> },
  { texto: 'Dados só da família', icone: <Lock size={TAMANHO} aria-hidden="true" /> },
  { texto: 'Funciona de madrugada', icone: <Moon size={TAMANHO} aria-hidden="true" /> },
  { texto: 'Avó, pai e babá juntos', icone: <Users size={TAMANHO} aria-hidden="true" /> },
]

function Lista({ escondida = false }: { escondida?: boolean }) {
  return (
    <ul className="cm-selos-lista" aria-hidden={escondida ? 'true' : undefined}>
      {SELOS.map((selo) => (
        <li key={selo.texto}>
          <span className="cm-selo">
            {selo.icone}
            {selo.texto}
          </span>
        </li>
      ))}
    </ul>
  )
}

interface Props {
  /** O nome da região, para o leitor de tela. */
  rotulo?: string
  className?: string
}

/**
 * Letreiro de selos de oliva (DESIGN.md 4 e 5): 60 s por volta, numa animação CSS sobre a trilha
 * duplicada (a cópia fica escondida do leitor de tela). Para no hover, quando o foco entra e pelo
 * botão "Pausar selos" (alcançável pelo teclado e pelo toque). Com movimento reduzido vira uma fileira
 * parada, que quebra linha.
 */
export function FaixaSelos({ rotulo = 'O que o app promete', className }: Props) {
  const [pausado, setPausado] = useState(false)
  return (
    <section className={['cm-selos', className].filter(Boolean).join(' ')} aria-label={rotulo} data-selos="">
      <div className="cm-selos-janela">
        <div className="cm-selos-trilho" data-pausado={pausado ? '' : undefined}>
          <Lista />
          <Lista escondida />
        </div>
      </div>
      <div className="cm-selos-pausa">
        <Botao
          variante="texto"
          aria-pressed={pausado}
          icone={pausado ? <Play size={20} /> : <Pause size={20} />}
          onClick={() => setPausado((atual) => !atual)}
        >
          {pausado ? 'Continuar selos' : 'Pausar selos'}
        </Botao>
      </div>
    </section>
  )
}
