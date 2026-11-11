import { PaginaDeLeitura } from '../../componentes/publicas-texto/PaginaDeLeitura.tsx'
import { PAGINAS_DE_TEXTO } from '../../conteudo/publicas-texto.ts'

/** /termos: o que é o site, quem pode usar, conta, família, comunidade e exclusão. */
export function Termos() {
  return <PaginaDeLeitura pagina={PAGINAS_DE_TEXTO.termos} />
}
