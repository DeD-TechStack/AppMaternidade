import { useState } from 'react'
import { FORMULARIO, SESSOES } from '../../conteudo/rotina.ts'
import { ALVO_APP } from '../app/alvo.ts'
import { Botao } from '../base/Botao.tsx'
import { CampoHorario, type Horario } from './CampoHorario.tsx'
import { dividirDataEHora, juntarDataEHora } from './formatos.ts'

const TOLERANCIA_DO_FUTURO = 5 * 60_000

interface Props {
  /** O início da sessão (ms): o fim não pode ser antes dele. */
  inicio: number
  aoConfirmar: (momento: number) => void
  aoCancelar: () => void
  /** Uma escrita em curso: `Encerrar` fica com `aria-disabled="true"`. */
  ocupado?: boolean
}

/**
 * "Encerrar em outro horário" (R38-09): um campo de data e um de hora para o fim, com agora já preenchido e
 * os botões `−5 min` e `+5 min`. Fim antes do início, ou mais de 5 minutos no futuro, mostra a mensagem do
 * campo e não envia. Vale para responsável e cuidador, em qualquer sessão.
 */
export function PainelFimEmOutroHorario({ inicio, aoConfirmar, aoCancelar, ocupado = false }: Props) {
  const [horario, setHorario] = useState<Horario>(() => dividirDataEHora(Date.now()))
  const [erro, setErro] = useState<string | null>(null)

  function confirmar() {
    if (ocupado) return
    const fim = juntarDataEHora(horario.data, horario.hora)
    if (Number.isNaN(fim)) return setErro(SESSOES.fimInvalido)
    if (fim < inicio) return setErro(SESSOES.fimNoPassado)
    if (fim > Date.now() + TOLERANCIA_DO_FUTURO) return setErro(SESSOES.fimNoFuturo)
    setErro(null)
    aoConfirmar(fim)
  }

  return (
    <div
      role="group"
      aria-label={SESSOES.encerrarOutroHorario}
      data-painel-sessao="outro-horario"
      className="mt-4 rounded-campo bg-(--cor-fundo) p-4 text-(--cor-texto) lg:p-6"
    >
      <CampoHorario
        rotulo={FORMULARIO.fim}
        valor={horario}
        aoMudar={(novo) => {
          setHorario(novo)
          setErro(null)
        }}
        erro={erro}
        somenteLeitura={ocupado}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Botao tamanho="app" className={`min-w-[8.5rem] ${ALVO_APP}`} desativado={ocupado} onClick={confirmar}>
          {SESSOES.encerrar}
        </Botao>
        <Botao variante="texto" tamanho="app" className={ALVO_APP} onClick={aoCancelar}>
          {FORMULARIO.cancelar}
        </Botao>
      </div>
    </div>
  )
}
