import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { HOJE, ROTULO_TIPO, SESSOES } from '../../conteudo/rotina.ts'
import type { Registro } from '../../dados/rotina.tipos.ts'
import { formatarHora } from '../../prototipo/formatar.ts'
import { MarcaDeEnvio } from './ItemRegistro.tsx'
import { IconeDoTipo } from './IconeDoTipo.tsx'
import { resumoDoRegistro } from './formatos.ts'

interface Props {
  registro: Registro
  fuso: string
  autor: string
  /** A rota do detalhe: a linha inteira é o link. */
  para: string
  /** O encaixe da marca de envio (MAT-41); a MAT-38 nunca a passa. */
  marca?: ReactNode
}

/**
 * Uma linha da linha do dia (R38-20): a hora à esquerda, o ícone do tipo, o rótulo e o resumo, `por <autor>`.
 * Usa o mesmo encaixe da marca de envio do `ItemRegistro`, logo depois da hora (R38-13).
 */
export function LinhaDoDia({ registro, fuso, autor, para, marca }: Props) {
  const resumo = resumoDoRegistro(registro, fuso)
  const texto = resumo ? HOJE.rotuloEResumo(ROTULO_TIPO[registro.tipo], resumo) : ROTULO_TIPO[registro.tipo]
  return (
    <li data-registro={registro.id} className="relative flex items-center gap-3 border-t border-(--cor-fio-suave) py-3.5 first:border-t-0 lg:gap-4">
      <div className="flex w-[4.5rem] shrink-0 items-center gap-1 text-[15px] leading-[22px] text-(--cor-texto-2)">
        <span className="whitespace-nowrap tabular-nums">{formatarHora(Date.parse(registro.inicio))}</span>
        <MarcaDeEnvio marca={marca} />
      </div>
      <IconeDoTipo tipo={registro.tipo} />
      <div className="min-w-0 flex-1">
        <p className="font-medium wrap-anywhere">
          <Link to={para} state={{ foco: 'titulo' }} className="rotina-link-esticado">
            {texto}
          </Link>
        </p>
        <p className="text-[15px] leading-[22px] text-(--cor-texto-2)">{SESSOES.porAutor(autor)}</p>
      </div>
    </li>
  )
}
