import { PaginaDeLeitura } from '../../componentes/publicas-texto/PaginaDeLeitura.tsx'
import { PAGINAS_DE_TEXTO } from '../../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './useTitulo.ts'

/** /regras-da-comunidade: as regras que valem quando a comunidade abrir, a moderação e os canais de ajuda. */
export function RegrasDaComunidade() {
  useTituloDaPagina(PAGINAS_DE_TEXTO.regras.nome)
  return <PaginaDeLeitura pagina={PAGINAS_DE_TEXTO.regras} />
}
