import { AVISO_DEMONSTRACAO } from '../conteudo/textos.ts'
import { temBanco } from '../prototipo/banco.ts'

interface Props {
  comRecuo?: boolean
  /**
   * Variante da coluna lateral da abertura: `ui` 15/21 em texto secundário, sem recuo nem folga
   * própria (a coluna dá o recuo). O texto e o marcador continuam sendo o mesmo <p>.
   */
  lateral?: boolean
  /** Variante do rodapé: uma linha honesta, na cor do texto do painel. */
  rodape?: boolean
}

// O aviso aparece quando falta pelo menos uma das variáveis do banco (ver `temBanco`).
// `aviso-demonstracao` é só marcador; a aparência vem das classes de cada variante.
export function AvisoDemonstracao({ comRecuo = false, lateral = false, rodape = false }: Props) {
  if (temBanco()) return null

  const classe = rodape
    ? 'aviso-demonstracao'
    : lateral
      ? 'aviso-demonstracao t-ui t-secundario'
      : `aviso-demonstracao texto-info py-1 text-sm font-normal leading-snug${comRecuo ? ' px-4' : ''}`

  return (
    <p data-aviso="demonstracao" className={classe}>
      {AVISO_DEMONSTRACAO}
    </p>
  )
}
