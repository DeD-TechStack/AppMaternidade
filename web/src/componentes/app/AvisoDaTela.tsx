import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { QuadroLayout } from '../base/layout/index.ts'
import { temBanco } from '../../prototipo/banco.ts'

/**
 * O aviso honesto de demonstração das telas do app: uma linha simples depois do conteúdo, fora do <main>
 * e de qualquer cartão. O rodapé da casca só traz o aviso no site público, então este é o único da página.
 * Sem as variáveis do banco faltando, não aparece (nem a região vazia).
 */
export function AvisoDaTela() {
  if (temBanco()) return null
  return (
    <QuadroLayout as="section" aria-label="Aviso de demonstração" data-aviso-tela="" className="py-2">
      <AvisoDemonstracao lateral />
    </QuadroLayout>
  )
}
