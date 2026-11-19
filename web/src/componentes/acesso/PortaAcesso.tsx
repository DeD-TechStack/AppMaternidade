import { PORTA_ACESSO } from '../../conteudo/conta.ts'
import { urlPublica } from '../campo/urlPublica.ts'

// A placa da porta, quadrada (720 × 720 no arquivo de 1254): em 1024 ou mais ela ocupa a metade da janela, até
// 720 px; abaixo, a largura da janela (o `sizes` diz o mesmo ao navegador). A caixa é reservada pelo `width` e
// `height`; o `max-w-[720px]` é a largura do cartão T3 (o `width` do arquivo), e o `aspect-square` guarda o
// quadrado quando a largura encolhe.
const CLASSE = 'block aspect-square h-auto w-full max-w-[720px]'

const TAMANHOS = '(min-width: 1024px) min(720px, 50vw), 100vw'

/**
 * A única imagem das telas de acesso (Entrar, Criar conta, Recuperar acesso, Começar e as telas que usam a
 * mesma moldura): a porta com a luz por baixo. Sem moldura, sombra, legenda nem degradê: é a ilustração
 * inteira, aprovada, servida em quatro larguras.
 */
export function PortaAcesso() {
  const conjunto = PORTA_ACESSO.larguras.map((largura) => `${urlPublica(`${PORTA_ACESSO.base}-${largura}w.webp`)} ${largura}w`).join(', ')
  return (
    <img
      src={urlPublica(`${PORTA_ACESSO.base}-${PORTA_ACESSO.largura}w.webp`)}
      srcSet={conjunto}
      sizes={TAMANHOS}
      width={PORTA_ACESSO.largura}
      height={PORTA_ACESSO.altura}
      alt={PORTA_ACESSO.alt}
      decoding="async"
      fetchPriority="high"
      className={CLASSE}
    />
  )
}
