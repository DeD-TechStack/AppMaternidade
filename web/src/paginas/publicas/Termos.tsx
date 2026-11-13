import { PaginaDeLeitura } from '../../componentes/publicas-texto/PaginaDeLeitura.tsx'
import { PAGINAS_DE_TEXTO } from '../../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './useTitulo.ts'

/** /termos: o que é o site, quem pode usar, conta, família, comunidade e exclusão. */
export function Termos() {
  useTituloDaPagina(PAGINAS_DE_TEXTO.termos.nome)
  return <PaginaDeLeitura pagina={PAGINAS_DE_TEXTO.termos} />
}
