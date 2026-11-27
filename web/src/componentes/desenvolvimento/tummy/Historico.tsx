import { useId } from 'react'
import { TT, resumoDoDia } from '../../../conteudo/desenvolvimento/textosTummy.ts'
import type { Membro } from '../../../dados/conta.ts'
import { diasDaFila } from '../../../dados/desenvolvimento.ts'
import type { Registro } from '../../../dados/rotina.tipos.ts'
import { ALVO_APP } from '../../app/alvo.ts'
import { Botao } from '../../base/Botao.tsx'
import { Ilustracao } from '../../campo/Ilustracao.tsx'
import { resumirDia, rotuloDoDia } from './regras.ts'

interface Props {
  encerradas: readonly Registro[]
  /** Qualquer das duas leituras passou do limite: sem resumo do dia, e T-63 acima da lista. */
  incompleta: boolean
  /** Leitura completa e nada lido (nem em andamento, nem na janela): T-22 no lugar da fila e da lista. */
  vazio: boolean
  /** Os dias da fila e as horas das linhas saem do fuso da família e do aparelho, como no DES-04. */
  fusoDaFamilia: string
  agoraDaLeitura: number
  membros: readonly Membro[]
  indiceDoDia: number
  aoEscolherODia: (indice: number) => void
}

/**
 * Os últimos 7 dias (DES-04): a fila de 7 botões (Hoje, Ontem e `dd/mm`), o resumo neutro do dia escolhido e a
 * lista dele. Sem meta, anel, sequência nem comparação: só o que foi registrado.
 */
export function Historico({ encerradas, incompleta, vazio, fusoDaFamilia, agoraDaLeitura, membros, indiceDoDia, aoEscolherODia }: Props) {
  const idTitulo = useId()

  if (vazio) {
    return (
      <div data-historico-vazio="" className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <p className="m-0 max-w-[65ch] font-medium">{TT.vazio}</p>
        <div aria-hidden="true" className="[[data-tema=madrugada]_&]:hidden">
          <Ilustracao nome="tummy-time" decorativa className="h-32 w-auto" />
        </div>
      </div>
    )
  }

  const dias = diasDaFila(agoraDaLeitura, fusoDaFamilia)
  const dia = dias[indiceDoDia]
  const rotulo = rotuloDoDia(indiceDoDia, dia)
  const resumo = resumirDia(dia, fusoDaFamilia, encerradas, membros)

  return (
    <section aria-labelledby={idTitulo} data-historico="" className="flex flex-col gap-4">
      <h3 id={idTitulo} className="cm-h4 text-titulo-4">
        {TT.historico}
      </h3>
      <div data-fila-de-dias="" role="group" aria-labelledby={idTitulo} className="flex flex-wrap gap-2">
        {dias.map((valor, indice) => (
          <Botao
            key={valor}
            variante="contorno"
            tamanho="app"
            className={`px-4 ${ALVO_APP}`}
            aria-pressed={indice === indiceDoDia}
            onClick={() => aoEscolherODia(indice)}
          >
            {rotuloDoDia(indice, valor)}
          </Botao>
        ))}
      </div>

      {incompleta ? (
        <p data-lista-incompleta="" className="m-0 max-w-[65ch] rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3 font-medium wrap-anywhere">
          {TT.listaIncompleta}
        </p>
      ) : (
        <p data-resumo-do-dia="" className="m-0 max-w-[65ch] font-medium tabular-nums">
          {resumoDoDia(rotulo, resumo.sessoes, resumo.totalMs)}
        </p>
      )}

      {resumo.linhas.length > 0 ? (
        <ul data-lista-do-dia="" className="m-0 flex max-w-[44rem] list-none flex-col gap-2 p-0">
          {resumo.linhas.map((linha) => (
            <li
              key={linha.id}
              className="rounded-campo border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)] px-4 py-3 tabular-nums wrap-anywhere"
            >
              {linha.texto}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
