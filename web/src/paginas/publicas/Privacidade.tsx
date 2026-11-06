import { PaginaDeLeitura } from '../../componentes/publicas/PaginaDeLeitura.tsx'
import { H1, PRIVACIDADE } from '../../conteudo/publicas.ts'

// Política de privacidade: rascunho para avaliação acadêmica, só em papel, numa coluna de leitura.
export function Privacidade() {
  return <PaginaDeLeitura titulo={H1.privacidade} secoes={PRIVACIDADE} comIndice />
}
