import { EMAIL_CONTATO, TEXTO_APOIO_CONTATO } from '../../conteudo/publicas-texto.ts'
import { Botao } from '../base/Botao.tsx'

const [usuario, dominio] = EMAIL_CONTATO.split('@')
const ficticio = dominio.endsWith('.example')

export function BlocoDeEmail() {
  return (
    <div className="pt-email">
      <div className="pt-email-dados">
        <div className="pt-email-rotulo">E-mail</div>
        <address className="co-h2 pt-email-endereco">
          {usuario}
          <wbr />
          @{dominio}
        </address>
      </div>
      {ficticio ? (
        <Botao variante="mel" desativado motivo={TEXTO_APOIO_CONTATO}>Escrever para nós</Botao>
      ) : (
        <Botao variante="mel" href={`mailto:${EMAIL_CONTATO}`}>Escrever para nós</Botao>
      )}
    </div>
  )
}
