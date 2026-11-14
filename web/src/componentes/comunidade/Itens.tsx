import type { ReactNode } from 'react'
import { COMUM_COMUNIDADE, ROTULO_FAIXA, TX } from '../../conteudo/comunidade.ts'
import { formatarDataHora } from '../../dados/comunidade.ts'
import type { EstadoModeracao, FaixaBebe } from '../../dados/comunidade.regras.ts'
import { Etiqueta } from '../base/Etiqueta.tsx'

// As peças que mostram o autor, a data e o estado de um tópico ou de uma resposta: a lista, a prévia e
// a leitura usam as mesmas.

interface MetaProps {
  /** O apelido, ou `null` quando a conta do autor foi excluída. */
  apelido: string | null
  /** Sem data (a prévia: o item ainda não existe). */
  criadoEm?: string | null
  editadoEm?: string | null
  faixa?: FaixaBebe | null
  /** O `id` do apelido: o item o usa como nome acessível. */
  idDoAutor?: string
  children?: ReactNode
}

/** Autor, faixa, data e, quando houve, "editado". O apelido é sempre texto: não há página de perfil. */
export function Meta({ apelido, criadoEm = null, editadoEm = null, faixa = null, idDoAutor, children }: MetaProps) {
  return (
    <p className="cm-pequeno flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--cor-texto-2)]">
      <span id={idDoAutor} className="wrap-anywhere font-medium text-[var(--cor-texto)]">
        {apelido ?? COMUM_COMUNIDADE.pessoaRemovida}
      </span>
      {faixa ? <Etiqueta>{ROTULO_FAIXA[faixa]}</Etiqueta> : null}
      {criadoEm ? (
        <time dateTime={criadoEm} className="tabular">
          {formatarDataHora(criadoEm)}
        </time>
      ) : null}
      {editadoEm ? <span>{COMUM_COMUNIDADE.editado}</span> : null}
      {children}
    </p>
  )
}

interface EtiquetaProps {
  estado: EstadoModeracao
  motivo: string | null
}

/** O item `oculto` ou `removido` que a pessoa lê: a etiqueta e o motivo que o banco guarda. */
export function EtiquetaDeEstado({ estado, motivo }: EtiquetaProps) {
  if (estado === 'visivel') return null
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Etiqueta>{estado === 'oculto' ? TX.tx07 : TX.tx22}</Etiqueta>
      {motivo ? <span className="cm-pequeno wrap-anywhere">{COMUM_COMUNIDADE.motivoDaModeracao(motivo)}</span> : null}
    </p>
  )
}

/** O texto como a pessoa escreveu, com as quebras de linha, sem cortar palavra comprida. */
export function Texto({ children }: { children: string }) {
  return <p className="max-w-leitura whitespace-pre-wrap text-pretty wrap-anywhere">{children}</p>
}
