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
  /** Só na variante do rodapé: o texto quando há banco (o rodapé o dá, `AVISO_RODAPE`). Sem ele vale o texto base. */
  textoComBanco?: string
}

// As variantes de página aparecem quando falta pelo menos uma das variáveis do banco (ver `temBanco`). A do rodapé
// (RodapeMapa, DS1:RF-14) sempre aparece, na página pública com ou sem banco: com banco é a linha da versão de
// avaliação (`textoComBanco`, que o rodapé preenche), sem banco é a frase de hoje (nada é salvo). É o único nó
// `[data-aviso]` da página. `aviso-demonstracao` é só marcador; a aparência vem das classes de cada variante.
export function AvisoDemonstracao({ comRecuo = false, lateral = false, rodape = false, textoComBanco }: Props) {
  const comBanco = temBanco()
  if (comBanco && !rodape) return null

  const classe = rodape
    ? 'aviso-demonstracao'
    : lateral
      ? 'aviso-demonstracao t-ui t-secundario'
      : `aviso-demonstracao texto-info py-1 text-pequeno font-normal${comRecuo ? ' px-4' : ''}`

  return (
    <p data-aviso="demonstracao" className={classe}>
      {rodape && comBanco && textoComBanco ? textoComBanco : AVISO_DEMONSTRACAO}
    </p>
  )
}
