import { Etiqueta } from '../componentes/base/Etiqueta.tsx'

// O aviso do protótipo é um item da coluna lateral da abertura (EMENDAS E2, VOLTA1 E6): sempre a
// etiqueta "Protótipo com dados de exemplo", com ou sem as variáveis do banco. O parágrafo de aviso
// (várias linhas) não aparece no `main` do Hoje nem da Sessão; o Início e a rota inexistente seguem com
// o `AvisoDemonstracao`, e a linha do rodapé da casca continua dizendo que nada ali é dado real.
// Devolve o <li> que o `Abertura` espera na lateral. O Hoje e a Sessão usam o mesmo.
export function ItemAvisoDaAbertura() {
  return (
    <li>
      <Etiqueta>Protótipo com dados de exemplo</Etiqueta>
    </li>
  )
}
