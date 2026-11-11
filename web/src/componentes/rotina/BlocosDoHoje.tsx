import { useId } from 'react'
import { HOJE } from '../../conteudo/rotina.ts'
import type { Nota, Registro } from '../../dados/rotina.tipos.ts'
import { formatarHora } from '../../prototipo/formatar.ts'
import { Avatar } from '../app/Avatar.tsx'
import { horaDaNota } from './formatos.ts'
import { ItemRegistro } from './ItemRegistro.tsx'

// A linguagem da área da lista do Hoje (a 49b v2): linhas separadas por um fio fino, sem cartão branco.
const LISTA = 'mt-3 border-y border-(--cor-fio-suave) lg:mt-4'
const VAZIO = 'mt-3 border-y border-(--cor-fio-suave) py-4 text-(--cor-texto-2) lg:mt-4'

interface NotasProps {
  /** As notas em destaque (`destaque_ate` depois de agora), da mais nova à mais antiga, até 3. */
  notas: readonly Nota[]
  autorDe: (nota: Nota) => string
  agora: number
  className?: string
}

/** "Para você saber": as notas em destaque da família, com o autor e a hora (R38-05). */
export function ParaVoceSaber({ notas, autorDe, agora, className }: NotasProps) {
  const idTitulo = useId()
  return (
    <section aria-labelledby={idTitulo} data-notas="" className={className}>
      <h2 id={idTitulo} className="cm-h4">
        {HOJE.paraVoceSaber}
      </h2>
      {notas.length === 0 ? (
        <p className={VAZIO}>{HOJE.semNotaEmDestaque}</p>
      ) : (
        <ul className={LISTA}>
          {notas.map((nota) => {
            const autor = autorDe(nota)
            return (
              <li
                key={nota.id}
                className="flex items-center gap-3 border-t border-(--cor-fio-suave) py-3.5 first:border-t-0 lg:gap-4"
              >
                <Avatar nome={autor} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium wrap-anywhere">{nota.texto}</p>
                  <p className="text-[15px] leading-[22px] text-(--cor-texto-2)">
                    {HOJE.notaDe(autor, horaDaNota(Date.parse(nota.criadaEm), agora))}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

interface DesdeProps {
  /** O `recebido_em` do marco: a hora em que a pessoa esteve aqui pela última vez. */
  marcoEm: number
  registros: readonly Registro[]
  fuso: string
  autorDe: (registro: Registro) => string
  className?: string
}

/** "Desde o seu último registro" (RF-07): o que as outras pessoas registraram depois do marco, até 5. */
export function DesdeUltimoRegistro({ marcoEm, registros, fuso, autorDe, className }: DesdeProps) {
  const idTitulo = useId()
  return (
    <section aria-labelledby={idTitulo} data-desde="" className={className}>
      <h2 id={idTitulo} className="cm-h4">
        {HOJE.desdeOUltimo(formatarHora(marcoEm))}
      </h2>
      {registros.length === 0 ? (
        <p className={VAZIO}>{HOJE.nadaNovo}</p>
      ) : (
        <ul className={LISTA}>
          {registros.map((registro) => (
            <ItemRegistro key={registro.id} registro={registro} fuso={fuso} autor={autorDe(registro)} />
          ))}
        </ul>
      )}
    </section>
  )
}
