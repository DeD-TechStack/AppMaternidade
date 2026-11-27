import { PaginaDeLeitura } from '../../componentes/publicas-texto/PaginaDeLeitura.tsx'
import { PAGINAS_DE_TEXTO } from '../../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './useTitulo.ts'

/** /exclusao-de-conta: como pedir, o que vai ser apagado, o que pode ficar guardado e o prazo. */
export function ExclusaoDeConta() {
  useTituloDaPagina(PAGINAS_DE_TEXTO.exclusao.nome)
  return <PaginaDeLeitura pagina={PAGINAS_DE_TEXTO.exclusao} />
}
