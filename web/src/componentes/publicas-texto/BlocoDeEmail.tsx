import { EMAIL_CONTATO } from '../../conteudo/publicas-texto.ts'
import { Botao } from '../base/Botao.tsx'

/**
 * O canal da página Contato: na abertura de cacau, no lugar do botão, o rótulo, o endereço em texto simples (para
 * copiar ou ler, em papel sobre o cacau) e o botão de mel que abre o programa de e-mail (`mailto:`), sem caixa
 * nem fundo próprios. Quando cabem, o texto e o botão ficam lado a lado; senão, um sobre o outro.
 */
export function BlocoDeEmail() {
  return (
    <div className="pt-email">
      <div className="pt-email-dados">
        <div className="pt-email-rotulo">E-mail</div>
        <address className="pt-email-endereco">{EMAIL_CONTATO}</address>
      </div>
      <Botao variante="mel" href={`mailto:${EMAIL_CONTATO}`}>
        Escrever para nós
      </Botao>
    </div>
  )
}
