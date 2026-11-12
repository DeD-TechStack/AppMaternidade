import { Apple, Baby, Droplet, Droplets, Milk, Moon, NotebookPen, type LucideIcon } from 'lucide-react'
import type { TipoRegistro } from '../../dados/rotina.tipos.ts'

const ICONES: Readonly<Record<TipoRegistro, LucideIcon>> = {
  sono: Moon,
  mamada: Milk,
  tummy: Baby,
  mamadeira: Droplet,
  fralda: Droplets,
  solido: Apple,
  observacao: NotebookPen,
}

/** O ícone do tipo de registro: decorativo (`aria-hidden`), sempre ao lado do rótulo em texto. */
export function IconeDoTipo({ tipo, className = 'size-5 shrink-0' }: { tipo: TipoRegistro; className?: string }) {
  const Icone = ICONES[tipo]
  return <Icone aria-hidden="true" className={className} strokeWidth={2} />
}
