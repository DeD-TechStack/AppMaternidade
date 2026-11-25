import { PORTA_ACESSO } from '../../conteudo/conta.ts'
import { urlPublica } from '../campo/urlPublica.ts'

// A placa da porta, quadrada (720 × 720 no arquivo de 1254): em 1024 ou mais ela ocupa a metade da janela, até
// 720 px (o `max-w-[720px]` é a largura do cartão T3, o `width` do arquivo, e o `aspect-square` guarda o quadrado).
// Abaixo de 1024 é a faixa da porta (F8-4): a mesma imagem preenche a caixa de 3,25:1 que a `DuasColunas` põe em
// volta, de ponta a ponta (`h-full w-full`, sem largura máxima), recortada com `object-cover` nas linhas 0,40 a
// 0,70 da placa (a mão, a chave e o buraco da fechadura): a placa tem a largura da caixa, e a janela mostra
// 1/3,25 = 0,308 da altura; para o topo dela cair em 0,40 (a margem que sobra é 1 − 0,308), o `object-position`
// vertical é 0,40 / (1 − 0,308) = 57,8%. O `sizes` diz a mesma largura ao navegador nos dois casos.
const CLASSE =
  'block h-full w-full object-cover object-[50%_57.8%] ' +
  'lg:aspect-square lg:h-auto lg:max-w-[720px] lg:object-fill lg:object-center'

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
