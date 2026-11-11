import { PaginaDeLeitura } from '../../componentes/publicas-texto/PaginaDeLeitura.tsx'
import { PAGINAS_DE_TEXTO } from '../../conteudo/publicas-texto.ts'

/** /regras-da-comunidade: as regras que valem quando a comunidade abrir, a moderação e os canais de ajuda. */
export function RegrasDaComunidade() {
  return <PaginaDeLeitura pagina={PAGINAS_DE_TEXTO.regras} />
}
