import { useId } from 'react'
import { CircleAlert } from 'lucide-react'
import { FORMULARIO } from '../../conteudo/rotina.ts'
import { ALVO_APP } from '../app/alvo.ts'
import { Botao } from '../base/Botao.tsx'
import { dividirDataEHora, juntarDataEHora, rotuloDoAjuste } from './formatos.ts'

const MINUTO = 60_000

export interface Horario {
  /** `AAAA-MM-DD`. */
  data: string
  /** `HH:MM`. */
  hora: string
}

interface Props {
  /** `Início`, `Fim` ou `Horário`: o nome do grupo e a base do nome de cada campo. */
  rotulo: string
  valor: Horario
  aoMudar: (novo: Horario) => void
  /** A mensagem ao lado do campo, ligada por `aria-describedby`; marca `aria-invalid`. */
  erro?: string | null
  /** Ajuda abaixo do campo, em texto secundário. */
  ajuda?: string
  somenteLeitura?: boolean
}

/**
 * Um horário: campo de data e campo de hora nativos, com os botões `−5 min` e `+5 min` ao lado (Fluxos 4.6).
 * O erro leva ícone e palavras, nunca só cor, e fica ligado aos dois campos.
 */
export function CampoHorario({ rotulo, valor, aoMudar, erro, ajuda, somenteLeitura = false }: Props) {
  const idData = useId()
  const idHora = useId()
  const idErro = useId()
  const idAjuda = useId()
  const ligados = [erro ? idErro : null, ajuda ? idAjuda : null].filter(Boolean).join(' ') || undefined

  function ajustar(minutos: number) {
    if (somenteLeitura) return
    const instante = juntarDataEHora(valor.data, valor.hora)
    if (Number.isNaN(instante)) return
    aoMudar(dividirDataEHora(instante + minutos * MINUTO))
  }

  return (
    <fieldset className="cm-campo max-w-none" data-horario={rotulo}>
      <legend className="cm-campo-rotulo">{rotulo}</legend>
      <div className="flex flex-wrap items-end gap-3">
        <div className="cm-campo w-auto">
          <label htmlFor={idData} className="cm-campo-rotulo">
            <span className="sr-only">{FORMULARIO.prefixoDoCampo(rotulo)}</span>
            <span className="capitalize">{FORMULARIO.data}</span>
          </label>
          <div className="cm-campo-controle">
            <input
              id={idData}
              type="date"
              value={valor.data}
              readOnly={somenteLeitura}
              aria-invalid={erro ? true : undefined}
              aria-describedby={ligados}
              className="cm-campo-entrada min-h-12"
              onChange={(evento) => aoMudar({ ...valor, data: evento.target.value })}
            />
          </div>
        </div>
        <div className="cm-campo w-auto">
          <label htmlFor={idHora} className="cm-campo-rotulo">
            <span className="sr-only">{FORMULARIO.prefixoDoCampo(rotulo)}</span>
            <span className="capitalize">{FORMULARIO.hora}</span>
          </label>
          <div className="cm-campo-controle">
            <input
              id={idHora}
              type="time"
              value={valor.hora}
              readOnly={somenteLeitura}
              aria-invalid={erro ? true : undefined}
              aria-describedby={ligados}
              className="cm-campo-entrada min-h-12"
              onChange={(evento) => aoMudar({ ...valor, hora: evento.target.value })}
            />
          </div>
        </div>
        <Botao
          variante="contorno"
          tamanho="app"
          className={ALVO_APP}
          aria-label={rotuloDoAjuste(rotulo, 'menos')}
          onClick={() => ajustar(-5)}
        >
          {FORMULARIO.menos5}
        </Botao>
        <Botao
          variante="contorno"
          tamanho="app"
          className={ALVO_APP}
          aria-label={rotuloDoAjuste(rotulo, 'mais')}
          onClick={() => ajustar(5)}
        >
          {FORMULARIO.mais5}
        </Botao>
      </div>
      {erro ? (
        <p id={idErro} className="cm-campo-mensagem cm-campo-erro cm-pequeno flex items-start gap-2">
          <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </p>
      ) : null}
      {ajuda ? (
        <p id={idAjuda} className="cm-campo-mensagem cm-pequeno text-(--cor-texto-2)">
          {ajuda}
        </p>
      ) : null}
    </fieldset>
  )
}
