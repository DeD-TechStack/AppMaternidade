import { PaginaDeLeitura } from '../../componentes/publicas-texto/PaginaDeLeitura.tsx'
import { PAGINAS_DE_TEXTO } from '../../conteudo/publicas-texto.ts'
import { useTituloDaPagina } from './useTitulo.ts'

/** /privacidade: o que o site vai guardar, para quê, por quanto tempo e quais são os direitos. */
export function Privacidade() {
  useTituloDaPagina(PAGINAS_DE_TEXTO.privacidade.nome)
  return <PaginaDeLeitura pagina={PAGINAS_DE_TEXTO.privacidade} />
}
