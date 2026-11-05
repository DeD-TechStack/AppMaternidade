import { useId } from 'react'

interface Props {
  /** "mm:ss" ou "h:mm:ss", já formatado. */
  cronometro: string
  /** "17:02" */
  hora: string
  pessoa: string
  atividade?: string
  /** Versão do Início: o mesmo cronômetro, em tamanho menor, num campo com cantos e sem ids. */
  miniatura?: boolean
  /** Nome do token do campo (data-campo), que muda com o tema. */
  campo?: string
}

// O corpo da tela Sessão: um campo de cor compacto, de cima para baixo o rótulo, o cronômetro, a
// régua e as linhas com quem começou e a atividade. A altura do campo vem do conteúdo, com
// respiro generoso em cima e embaixo; o espaço que sobra até as ações fica em papel. Na Sessão o
// campo sangra até as bordas da tela (a margem lateral é de 1 rem); na miniatura do Início ele
// fica dentro do aparelho, com cantos. O Início usa este mesmo componente na miniatura.
export function SessaoInfo({ cronometro, hora, pessoa, atividade, miniatura = false, campo = 'accent' }: Props) {
  const idRotulo = useId()
  return (
    <div>
      <div data-campo={campo} className={miniatura ? 'campo-sessao' : 'campo-sessao -mx-4 rounded-none py-8'}>
        <p id={miniatura ? undefined : idRotulo} className="rotulo">
          Duração da sessão
        </p>
        <div
          role="timer"
          aria-live="off"
          aria-labelledby={miniatura ? undefined : idRotulo}
          className={miniatura ? 'cronometro cronometro-mini mt-2 pb-4' : 'cronometro mt-2 pb-6'}
        >
          {cronometro}
        </div>
        <div>
          <p className="tabular border-t border-current py-2.5">{`Iniciado às ${hora} por ${pessoa}`}</p>
          {atividade ? <p className="border-t border-current py-2.5">{`Atividade sugerida: ${atividade}`}</p> : null}
        </div>
      </div>
    </div>
  )
}
