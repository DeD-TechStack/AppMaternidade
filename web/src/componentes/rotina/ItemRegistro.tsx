import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { HOJE, ROTULO_TIPO, SESSOES } from '../../conteudo/rotina.ts'
import type { Registro } from '../../dados/rotina.tipos.ts'
import { formatarHora } from '../../prototipo/formatar.ts'
import { Avatar } from '../app/Avatar.tsx'
import { resumoDoRegistro } from './formatos.ts'

interface Props {
  registro: Registro
  /** O fuso da família: o dia em que a sessão termina segue o dele. */
  fuso: string
  autor: string
  /**
   * O lugar da marca de envio (R38-13, ponto M4 da MAT-41): desenhada logo depois da hora, dentro de um
   * `span` com `data-marca-envio`. A MAT-38 nunca a passa. Sem `marca`, o `span` não existe.
   */
  marca?: ReactNode
  /** No 38b: a rota do detalhe. Com ela, o texto do item é um link que cobre a linha inteira; sem ela, é só texto. */
  para?: string
}

/**
 * O encaixe da marca de envio (R38-13, ponto M4 da MAT-41): o `span` com `data-marca-envio`, que vai logo depois
 * da hora. Sem marca (`undefined` ou `null`), o `span` não existe. Toda lista da rotina que mostra uma hora
 * (`ItemRegistro`, os Últimos do Hoje) usa este mesmo encaixe.
 */
export function MarcaDeEnvio({ marca }: { marca?: ReactNode }) {
  return marca !== undefined && marca !== null ? <span data-marca-envio="">{marca}</span> : null
}

/** Um item de registro: o avatar de quem registrou, o rótulo e o resumo, o autor e a hora do início. */
export function ItemRegistro({ registro, fuso, autor, marca, para }: Props) {
  const resumo = resumoDoRegistro(registro, fuso)
  const texto = resumo ? HOJE.rotuloEResumo(ROTULO_TIPO[registro.tipo], resumo) : ROTULO_TIPO[registro.tipo]
  return (
    <li
      data-registro={registro.id}
      className="relative flex items-center gap-3 border-t border-(--cor-fio-suave) py-3.5 first:border-t-0 lg:gap-4"
    >
      <Avatar nome={autor} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {para ? (
            <Link to={para} state={{ foco: 'titulo' }} className="rotina-link-esticado">
              {texto}
            </Link>
          ) : (
            texto
          )}
        </p>
        <p className="text-pequeno text-(--cor-texto-2)">{SESSOES.porAutor(autor)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-pequeno text-(--cor-texto-2)">
        <span className="whitespace-nowrap tabular-nums">{formatarHora(Date.parse(registro.inicio))}</span>
        <MarcaDeEnvio marca={marca} />
      </div>
    </li>
  )
}
