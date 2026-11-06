import { PaginaDeLeitura } from '../../componentes/publicas/PaginaDeLeitura.tsx'
import { H1, TERMOS } from '../../conteudo/publicas.ts'

// Termos de uso: rascunho para avaliação acadêmica, só em papel, numa coluna de leitura.
export function Termos() {
  return <PaginaDeLeitura titulo={H1.termos} secoes={TERMOS} comIndice />
}
