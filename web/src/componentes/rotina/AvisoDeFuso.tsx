import { COMUM } from '../../conteudo/rotina.ts'

/** O aviso de que os horários seguem o fuso do aparelho e o dia segue o fuso da família. Quem o usa decide quando mostrar. */
export function AvisoDeFuso({ aparelho, familia }: { aparelho: string; familia: string }) {
  return (
    <p className="text-[15px] leading-[22px] text-(--cor-texto-2)" data-fuso-diferente="">
      {COMUM.fusoDiferente(aparelho, familia)}
    </p>
  )
}
