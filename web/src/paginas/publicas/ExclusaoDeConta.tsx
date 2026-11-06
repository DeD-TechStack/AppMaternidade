import { PaginaDeLeitura } from '../../componentes/publicas/PaginaDeLeitura.tsx'
import { EXCLUSAO, H1 } from '../../conteudo/publicas.ts'

// Exclusão de conta: rascunho para avaliação acadêmica. Sem índice nem aviso de dados fictícios.
export function ExclusaoDeConta() {
  return <PaginaDeLeitura titulo={H1.exclusao} secoes={EXCLUSAO} />
}
