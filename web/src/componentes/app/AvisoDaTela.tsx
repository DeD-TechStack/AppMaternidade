import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { temBanco } from '../../prototipo/banco.ts'

/**
 * O aviso honesto de demonstração das telas do app: uma linha simples depois do conteúdo, fora do <main>
 * e de qualquer cartão. O rodapé da casca só traz o aviso no site público, então este é o único da página.
 * Sem as variáveis do banco faltando, não aparece (nem a região vazia).
 */
export function AvisoDaTela() {
  if (temBanco()) return null
  return (
    <section aria-label="Aviso de demonstração" data-aviso-tela="" className="cm-area py-2">
      <AvisoDemonstracao lateral />
    </section>
  )
}
