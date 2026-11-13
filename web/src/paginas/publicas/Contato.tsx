import { PaginaDeLeitura } from '../../componentes/publicas-texto/PaginaDeLeitura.tsx'
import { PAGINAS_DE_TEXTO } from '../../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './useTitulo.ts'

/** /contato: o canal (o e-mail como link `mailto:`), a urgência e para que serve o canal. */
export function Contato() {
  useTituloDaPagina(PAGINAS_DE_TEXTO.contato.nome)
  return <PaginaDeLeitura pagina={PAGINAS_DE_TEXTO.contato} />
}
