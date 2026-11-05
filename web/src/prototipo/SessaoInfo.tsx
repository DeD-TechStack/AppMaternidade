import { useId } from 'react'

interface Props {
  /** "mm:ss" ou "h:mm:ss", já formatado. */
  cronometro: string
  /** "17:02" */
  hora: string
  pessoa: string
  atividade?: string
  /** Versão do Início: o mesmo cronômetro, em tamanho menor. */
  miniatura?: boolean
}

// O corpo da tela Sessão: cronômetro sobre o campo de cor, quem começou e a atividade.
// O Início usa este mesmo componente na miniatura.
export function SessaoInfo({ cronometro, hora, pessoa, atividade, miniatura = false }: Props) {
  const idRotulo = useId()
  return (
    <div>
      <div className="campo-sessao">
        <p id={idRotulo} className="rotulo">
          Duração da sessão
        </p>
        <div
          role="timer"
          aria-live="off"
          aria-labelledby={idRotulo}
          className={miniatura ? 'cronometro cronometro-mini mt-3' : 'cronometro mt-3'}
        >
          {cronometro}
        </div>
      </div>
      <p className="mt-4 tabular">{`Iniciado às ${hora} por ${pessoa}`}</p>
      {atividade ? <p className="mt-1">{`Atividade sugerida: ${atividade}`}</p> : null}
    </div>
  )
}
