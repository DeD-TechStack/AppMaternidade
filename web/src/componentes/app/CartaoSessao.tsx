import { useId, type Ref } from 'react'
import { Link } from 'react-router'
import { Baby, Milk, Moon } from 'lucide-react'
import { Botao } from '../base/Botao.tsx'
import { ALVO_APP } from './alvo.ts'
import { recuoOptico } from './recuoOptico.ts'
import { Ilustracao, type NomeIlustracao } from '../campo/Ilustracao.tsx'
import { ROTULO_SESSAO, type TipoSessao } from '../../prototipo/estado.ts'
import { formatarCronometro, formatarHora } from '../../prototipo/formatar.ts'

interface Props {
  sessao: { tipo: TipoSessao; inicio: number; pessoa: string } | null
  /** O instante atual (o Hoje o atualiza a cada segundo): o tempo é sempre `agora - inicio`. */
  agora: number
  aoEncerrar: () => void
  /** O Hoje guarda o cartão para levar o foco até ele depois de encerrar (tabindex="-1"). */
  ref?: Ref<HTMLElement>
  className?: string
}

const ICONE: Record<TipoSessao, typeof Moon> = { sono: Moon, mamada: Milk, tummy: Baby }

// O desenho de traço de cada tipo (só de dia: o traço preto nunca vai sobre o cartão da noite).
const DESENHO: Record<TipoSessao, NomeIlustracao> = { sono: 'pai-colo', mamada: 'mae-noite', tummy: 'tummy-time' }

/**
 * O cartão da sessão em andamento do Hoje (DESIGN.md 4, CartaoSessao): mel de dia, cartão da noite na
 * madrugada; o tempo correndo em Literata com algarismos tabulares, a pílula de cacau "Encerrar" (de mel
 * na madrugada) e o link "Ver sessão". Sem sessão, diz "Nenhuma sessão em andamento." e como começar.
 */
export function CartaoSessao({ sessao, agora, aoEncerrar, ref, className }: Props) {
  const idTitulo = useId()
  const Icone = sessao ? ICONE[sessao.tipo] : Moon

  if (!sessao) {
    return (
      <section
        ref={ref}
        aria-labelledby={idTitulo}
        tabIndex={-1}
        data-andamento=""
        className={`alvo-foco rounded-cartao border border-(--cor-fio-suave) bg-(--cor-cartao) p-6 lg:p-8 ${className ?? ''}`}
      >
        <h2 id={idTitulo} className="text-[15px] leading-[22px] font-medium text-(--cor-texto-2)">
          Em andamento
        </h2>
        <p className="mt-2 font-titulo text-[24px] leading-[30px] font-semibold">Nenhuma sessão em andamento.</p>
        <p className="mt-2 text-[15px] leading-[22px] text-(--cor-texto-2)">
          Para começar, toque em Sono ou Mamada na barra Registrar, embaixo.
        </p>
      </section>
    )
  }

  const tempo = formatarCronometro(agora - sessao.inicio)

  // De dia, em 1440, o desenho é uma coluna da altura do cartão inteiro, colada ao tempo (sem faixa morta
  // entre os dois). Na madrugada o desenho sai e o tempo e as ações dividem a largura: as ações vão para
  // a direita, alinhadas pela base do tempo.
  const NOITE_EM_LINHA =
    'lg:[[data-tema=madrugada]_&]:flex-row lg:[[data-tema=madrugada]_&]:flex-wrap lg:[[data-tema=madrugada]_&]:items-end lg:[[data-tema=madrugada]_&]:justify-between'

  return (
    <section
      ref={ref}
      aria-labelledby={idTitulo}
      tabIndex={-1}
      data-andamento=""
      data-tipo={sessao.tipo}
      className={`alvo-foco relative flex overflow-hidden rounded-cartao bg-(--cor-campo-sessao) p-6 text-(--cor-numero-sessao) [border:var(--borda-campo)] lg:items-stretch lg:gap-10 lg:p-10 ${className ?? ''}`}
    >
      <div className="relative z-10 min-w-0 flex-1 lg:flex-none lg:[[data-tema=madrugada]_&]:flex-1">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-full bg-cacau text-mel"
          >
            <Icone className="size-4" strokeWidth={2} aria-hidden="true" />
          </span>
          <h2 id={idTitulo} className="text-[15px] leading-[22px] font-medium">
            Em andamento
          </h2>
        </div>

        <div className={`mt-4 flex flex-col gap-6 lg:gap-8 ${NOITE_EM_LINHA}`}>
          <div>
            <p className="font-titulo text-[24px] leading-[30px] font-semibold">{ROTULO_SESSAO[sessao.tipo]}</p>
            <p
              role="timer"
              aria-live="off"
              aria-label={`Tempo de ${ROTULO_SESSAO[sessao.tipo].toLowerCase()}`}
              data-numero=""
              className={`mt-1 font-titulo text-[64px] leading-none font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums lg:text-[120px] ${recuoOptico(tempo)}`}
            >
              {tempo}
            </p>
            <p className="mt-3 text-[15px] leading-[22px]">
              {`Iniciado às ${formatarHora(sessao.inicio)} `}
              <span>{`por ${sessao.pessoa}`}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Botao tamanho="app" className={`min-w-[8.5rem] ${ALVO_APP}`} onClick={aoEncerrar}>
              Encerrar
            </Botao>
            <Link
              to="/app/sessao"
              state={{ foco: 'titulo' }}
              className={`cm-botao cm-botao-contorno alvo-toque ${ALVO_APP}`}
              data-botao="contorno"
              data-tamanho="app"
            >
              Ver sessão
            </Link>
          </div>
        </div>
      </div>

      {/* O traço fica mais pesado sem filtro: o desenho ocupa a altura toda do cartão (o traço cresce com
          ele) e duas cópias deslocadas em 1 px engrossam a linha. As cópias são só enfeite. */}
      <div
        aria-hidden="true"
        data-desenho=""
        className="pointer-events-none relative -mb-10 hidden min-w-[9rem] flex-1 lg:block [[data-tema=madrugada]_&]:hidden"
      >
        <span className="absolute inset-y-0 left-0 block">
          <Ilustracao nome={DESENHO[sessao.tipo]} decorativa carregamento="eager" className="h-full w-auto max-w-none" />
          <Ilustracao
            nome={DESENHO[sessao.tipo]}
            decorativa
            carregamento="eager"
            className="absolute inset-y-0 left-0 h-full w-auto max-w-none translate-x-px"
          />
          <Ilustracao
            nome={DESENHO[sessao.tipo]}
            decorativa
            carregamento="eager"
            className="absolute inset-y-0 left-0 h-full w-auto max-w-none translate-y-px"
          />
        </span>
      </div>
    </section>
  )
}
