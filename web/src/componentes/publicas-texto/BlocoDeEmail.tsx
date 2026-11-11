import { EMAIL_CONTATO } from '../../conteudo/publicas-texto.ts'
import { Botao } from '../base/Botao.tsx'

/**
 * O canal da página Contato: um cartão de papel claro no topo da leitura com o rótulo, o endereço em texto
 * simples (para copiar ou ler) e o botão que abre o programa de e-mail (`mailto:`).
 */
export function BlocoDeEmail() {
  return (
    <div className="pt-email">
      <div className="pt-email-rotulo">E-mail</div>
      <address className="pt-email-endereco">{EMAIL_CONTATO}</address>
      <Botao href={`mailto:${EMAIL_CONTATO}`}>Escrever para nós</Botao>
    </div>
  )
}
