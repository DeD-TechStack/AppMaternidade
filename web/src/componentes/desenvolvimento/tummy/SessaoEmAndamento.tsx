import type { ReactNode } from 'react'
import { TT, encerrarDe, iniciadoAs } from '../../../conteudo/desenvolvimento/textosTummy.ts'
import type { Registro } from '../../../dados/rotina.tipos.ts'
import { formatarCronometro, formatarHora, tamanhoDoCronometro } from '../../../prototipo/formatar.ts'
import { useAgora } from '../../../prototipo/useAgora.ts'
import { ALVO_APP } from '../../app/alvo.ts'
import { recuoOptico } from '../../app/recuoOptico.ts'
import { Botao } from '../../base/Botao.tsx'
import { Ilustracao } from '../../campo/Ilustracao.tsx'
import { Cartao } from '../../base/layout/Cartao.tsx'
import { CHAVE } from './foco.ts'
import { EnvioEmCurso } from './Mensagens.tsx'
import { useDeNoite } from './useDeNoite.ts'
import type { Onde } from './useBlocoTummy.ts'

interface Props {
  sessao: Registro
  nomeDoBebe: string
  /** "por <nome>", T-31 ou T-57. */
  autor: string
  podeEncerrar: boolean
  podeDescartar: boolean
  /** Falso durante uma operação pendente, depois de T-41 e até a leitura completa: os botões ficam `aria-disabled`. */
  podeAgir: boolean
  ondePendente: Onde | null
  /** O erro desta sessão (T-41, T-44, T-68...), perto dos botões. */
  erro: ReactNode
  aoEncerrar: () => void
  aoDescartar: () => void
}

const TAMANHO_DO_TEMPO = {
  normal: 'text-[56px] lg:text-[96px]',
  longo: 'text-[48px] lg:text-[72px]',
} as const

/**
 * Uma sessão em andamento (DES-03): o campo de mel de dia e o cartão da noite na madrugada, o tempo em Literata
 * com algarismos tabulares e "Encerrar" como a única ação em destaque. O tempo é sempre agora menos o início
 * gravado, a cada segundo; nada conta em segundo plano. O desenho de traço só aparece de dia, em tela larga.
 */
export function SessaoEmAndamento({ sessao, nomeDoBebe, autor, podeEncerrar, podeDescartar, podeAgir, ondePendente, erro, aoEncerrar, aoDescartar }: Props) {
  const agora = useAgora(1000)
  const deNoite = useDeNoite()
  const inicio = Date.parse(sessao.inicio)
  // Com o relógio do aparelho antes do início gravado, o cronômetro fica em 00:00 (item 8).
  const tempo = formatarCronometro(Math.max(0, agora - inicio))

  return (
    <Cartao
      className={`${deNoite ? 'cm-painel-cacau' : 'cm-painel-mel'} relative flex flex-col gap-6 rounded-painel bg-(--cor-campo-sessao) text-(--cor-numero-sessao) [border:var(--borda-campo)] lg:flex-row lg:items-end lg:justify-between`}
      data-sessao-tummy={sessao.id}
      data-campo-cor={deNoite ? 'noite' : 'mel'}
      data-painel={deNoite ? 'cacau' : 'mel'}
    >
      <div className="relative z-10 flex min-w-0 flex-col items-start gap-4">
        <p className="cm-rotulo">{TT.emAndamento}</p>
        <p
          role="timer"
          aria-live="off"
          aria-label="Tempo de tummy time"
          className={`font-titulo m-0 leading-none font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums ${TAMANHO_DO_TEMPO[tamanhoDoCronometro(tempo)]} ${recuoOptico(tempo)}`}
        >
          {tempo}
        </p>
        <p className="cm-pequeno m-0">{iniciadoAs(formatarHora(inicio), autor)}</p>

        {podeEncerrar || podeDescartar ? (
          <div className="flex flex-wrap items-center gap-3">
            {podeEncerrar ? (
              <Botao
                tamanho="app"
                className={`min-w-[8.5rem] ${ALVO_APP}`}
                aria-label={encerrarDe(nomeDoBebe)}
                data-foco={CHAVE.encerrar(sessao.id)}
                desativado={!podeAgir}
                onClick={aoEncerrar}
              >
                {TT.encerrar}
              </Botao>
            ) : null}
            {podeDescartar ? (
              <Botao
                variante="contorno"
                tamanho="app"
                className={`${ALVO_APP} bg-(--cor-fundo) text-(--cor-texto) hover:bg-(--cor-texto) hover:text-(--cor-fundo)`}
                data-foco={CHAVE.descartar(sessao.id)}
                desativado={!podeAgir}
                onClick={aoDescartar}
              >
                {TT.descartar}
              </Botao>
            ) : null}
          </div>
        ) : null}

        <EnvioEmCurso ativo={ondePendente === `sessao:${sessao.id}`} />
        {erro}
      </div>

      <div aria-hidden="true" className="pointer-events-none hidden shrink-0 lg:block [[data-tema=madrugada]_&]:hidden">
        <Ilustracao nome="tummy-time" decorativa carregamento="eager" className="h-44 w-auto" />
      </div>
    </Cartao>
  )
}
