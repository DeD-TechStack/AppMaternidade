import { PaginaDeLeitura } from '../../componentes/publicas-texto/PaginaDeLeitura.tsx'
import { PAGINAS_DE_TEXTO } from '../../conteudo/publicas-texto.ts'

/** /sobre: para quem é, o que o site faz (os quatro pilares), o que não faz e quem faz. */
export function Sobre() {
  return <PaginaDeLeitura pagina={PAGINAS_DE_TEXTO.sobre} />
}
