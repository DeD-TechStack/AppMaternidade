import { EMAIL_CONTATO } from '../../conteudo/publicas-texto.ts'
import { Botao } from '../base/Botao.tsx'

/**
 * O canal da página Contato: um cartão enxuto na abertura, com o rótulo, o endereço em texto simples (para
 * copiar ou ler) e o botão que abre o programa de e-mail (`mailto:`), sem mais nada. Em tela larga o texto
 * e o botão ficam lado a lado; em tela estreita, um sobre o outro.
 */
export function BlocoDeEmail() {
  return (
    <div className="pt-email">
      <div className="pt-email-dados">
        <div className="pt-email-rotulo">E-mail</div>
        <address className="pt-email-endereco">{EMAIL_CONTATO}</address>
      </div>
      <Botao href={`mailto:${EMAIL_CONTATO}`}>Escrever para nós</Botao>
    </div>
  )
}
