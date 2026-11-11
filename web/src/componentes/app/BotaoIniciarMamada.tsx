import { Milk } from 'lucide-react'

interface Props {
  aoIniciar: () => void
  /** "Última mamada às 07:50, com Juliana": a linha de baixo, para quem acorda e não lembra. */
  ultima?: string
  /**
   * Com outra sessão em andamento, a sessão é o destaque: o círculo encolhe (7 rem no celular, 9 rem em
   * 1440, sempre acima dos 56 px de alvo) e a linha da última mamada vai ao lado dele.
   */
  compacto?: boolean
  className?: string
}

/**
 * O botão grande da madrugada (DESIGN.md 4, de F3): um círculo de mel com "Iniciar mamada", na metade de
 * baixo da tela do celular, logo acima da barra Registrar. Um toque começa a mamada (ou, com outra sessão
 * em andamento, abre a que existe com o aviso). No hover inverte para o papel, na hora.
 */
export function BotaoIniciarMamada({ aoIniciar, ultima, compacto = false, className }: Props) {
  const CIRCULO = compacto
    ? 'size-[7rem] gap-1 lg:size-[9rem] lg:gap-2'
    : 'size-[13rem] gap-3 lg:size-[15rem]'
  const ICONE = compacto ? 'size-7 lg:size-9' : 'size-11 lg:size-12'
  const TEXTO = compacto
    ? 'text-[17px] leading-[20px] lg:text-[21px] lg:leading-[25px]'
    : 'text-[26px] leading-[30px] lg:text-[30px] lg:leading-[34px]'

  return (
    <div
      data-iniciar-mamada=""
      data-compacto={compacto ? '' : undefined}
      className={`flex items-center ${compacto ? 'flex-row gap-5' : 'flex-col justify-center gap-4 py-2'} ${className ?? ''}`}
    >
      <button
        type="button"
        onClick={aoIniciar}
        className={`alvo-toque flex shrink-0 flex-col items-center justify-center rounded-full bg-mel text-cacau transition-[scale] duration-100 ease-out hover:bg-papel active:scale-[0.96] ${CIRCULO}`}
      >
        <Milk aria-hidden="true" className={ICONE} strokeWidth={1.75} />
        <span className={`font-titulo font-semibold ${TEXTO}`}>
          <span className="block">Iniciar</span> <span className="block">mamada</span>
        </span>
      </button>
      {ultima ? (
        <p className={`text-[15px] leading-[22px] text-(--cor-texto-2) ${compacto ? 'max-w-[16rem] text-left' : 'text-center'}`}>
          {ultima}
        </p>
      ) : null}
    </div>
  )
}
