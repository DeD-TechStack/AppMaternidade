import { Milk } from 'lucide-react'

interface Props {
  aoIniciar: () => void
  /** "Última mamada às 07:50, com Juliana": a linha de baixo, para quem acorda e não lembra. */
  ultima?: string
  className?: string
}

/**
 * O botão grande da madrugada (DESIGN.md 4, de F3): um círculo de mel com "Iniciar mamada", na metade de
 * baixo da tela do celular, logo acima da barra Registrar. Um toque começa a mamada (ou, com outra sessão
 * em andamento, abre a que existe com o aviso). No hover inverte para o papel, na hora.
 */
export function BotaoIniciarMamada({ aoIniciar, ultima, className }: Props) {
  return (
    <div data-iniciar-mamada="" className={`flex flex-col items-center justify-center gap-4 py-2 ${className ?? ''}`}>
      <button
        type="button"
        onClick={aoIniciar}
        className="alvo-toque flex size-[13rem] flex-col items-center justify-center gap-3 rounded-full bg-mel text-cacau transition-[scale] duration-100 ease-out hover:bg-papel active:scale-[0.96] lg:size-[15rem]"
      >
        <Milk aria-hidden="true" className="size-11 lg:size-12" strokeWidth={1.75} />
        <span className="font-titulo text-[26px] leading-[30px] font-semibold lg:text-[30px] lg:leading-[34px]">
          <span className="block">Iniciar</span> <span className="block">mamada</span>
        </span>
      </button>
      {ultima ? <p className="text-center text-[15px] leading-[22px] text-(--cor-texto-2)">{ultima}</p> : null}
    </div>
  )
}
