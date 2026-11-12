import { useId } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { HISTORICO } from '../../conteudo/rotina.ts'
import { ALVO_APP } from '../app/alvo.ts'
import { Botao } from '../base/Botao.tsx'
import { ehDiaDoHistorico, numeroDoDia, seteDiasAte, siglaDoDia, somarDias } from './diasDoHistorico.ts'

interface Props {
  dia: string
  hoje: string
  aoEscolher: (dia: string) => void
}

/**
 * O seletor de dia (R38-20, P4): `Dia anterior` e `Dia seguinte` (com `aria-disabled` em hoje), o campo de data
 * (máximo: hoje) e a fila dos 7 dias que terminam no dia escolhido, cada um com a sigla e o número.
 */
export function SeletorDeDia({ dia, hoje, aoEscolher }: Props) {
  const idDoCampo = useId()
  const ehHoje = dia >= hoje
  const fila = seteDiasAte(dia)
  return (
    <div className="flex flex-col gap-4" data-seletor-de-dia="">
      <div className="flex flex-wrap items-end gap-3">
        <Botao
          variante="contorno"
          tamanho="app"
          className={ALVO_APP}
          icone={<ChevronLeft />}
          onClick={() => aoEscolher(somarDias(dia, -1))}
        >
          {HISTORICO.diaAnterior}
        </Botao>
        <Botao
          variante="contorno"
          tamanho="app"
          className={ALVO_APP}
          desativado={ehHoje}
          icone={<ChevronRight />}
          onClick={() => aoEscolher(somarDias(dia, 1))}
        >
          {HISTORICO.diaSeguinte}
        </Botao>
        <div className="cm-campo max-w-none">
          <label htmlFor={idDoCampo} className="cm-campo-rotulo">
            {HISTORICO.escolherDia}
          </label>
          <div className="cm-campo-controle">
            <input
              id={idDoCampo}
              type="date"
              value={dia}
              max={hoje}
              className="cm-campo-entrada min-h-12"
              onChange={(evento) => {
                if (ehDiaDoHistorico(evento.target.value, hoje)) aoEscolher(evento.target.value)
              }}
            />
          </div>
        </div>
      </div>
      <ul aria-label={HISTORICO.seteDias} className="rotina-fila-de-dias" data-fila-de-dias="">
        {fila.map((candidato, indice) => (
          <li key={indice}>
            <button
              type="button"
              className="rotina-dia-da-fila alvo-toque"
              aria-current={candidato === dia ? 'date' : undefined}
              onClick={() => aoEscolher(candidato)}
            >
              <span className="text-[15px] leading-[22px]">{siglaDoDia(candidato)}</span>{' '}
              <span className="font-medium tabular-nums">{numeroDoDia(candidato)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
