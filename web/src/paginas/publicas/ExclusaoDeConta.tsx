import { PaginaDeLeitura } from '../../componentes/publicas-texto/PaginaDeLeitura.tsx'
import { PAGINAS_DE_TEXTO } from '../../conteudo/publicas-texto.ts'

/** /exclusao-de-conta: como pedir, o que vai ser apagado, o que pode ficar guardado e o prazo. */
export function ExclusaoDeConta() {
  return <PaginaDeLeitura pagina={PAGINAS_DE_TEXTO.exclusao} />
}
