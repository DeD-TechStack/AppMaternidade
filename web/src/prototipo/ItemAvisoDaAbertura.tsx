import { AvisoDemonstracao } from '../componentes/AvisoDemonstracao.tsx'
import { Etiqueta } from '../componentes/base/Etiqueta.tsx'
import { temBanco } from './banco.ts'

// O aviso do protótipo é um item da coluna lateral da abertura (EMENDAS E2): sem as variáveis do
// banco, o aviso de demonstração (15/21, texto secundário); com elas, a etiqueta "Protótipo, dados
// fictícios". Devolve o <li> que o `Abertura` espera na lateral. O Hoje e a Sessão usam o mesmo.
export function ItemAvisoDaAbertura() {
  return <li>{temBanco() ? <Etiqueta>Protótipo, dados fictícios</Etiqueta> : <AvisoDemonstracao lateral />}</li>
}
