import { LOGIN_GOOGLE } from '../../conteudo/conta.ts'
import { urlPublica } from '../campo/urlPublica.ts'
import { caminhoComVolta, urlDoSite } from './destino.ts'
import { BOTAO_SECUNDARIO } from './Partes.tsx'

/**
 * O endereço de retorno do login: a própria tela de entrar, sob a base do site, com o `volta` válido.
 * Ao chegar lá com a sessão pronta (o cliente troca o código sozinho), a tela segue o destino do RF-10.
 */
export function retornoDoGoogle(volta: string | null): string {
  return urlDoSite(caminhoComVolta('entrar', volta))
}

interface Props {
  aoClicar: () => void
  /** O pedido está em andamento: o botão trava e muda o rótulo. */
  ocupado: boolean
}

/**
 * Ação secundária (contorno, largura cheia): o envio do formulário segue como a principal. O rótulo
 * quebra linha em vez de cortar (320 px, texto a 200%).
 */
export function BotaoGoogle({ aoClicar, ocupado }: Props) {
  return (
    <button
      type="button"
      className={`${BOTAO_SECUNDARIO} w-full whitespace-normal py-2`}
      onClick={aoClicar}
      disabled={ocupado}
      aria-busy={ocupado || undefined}
    >
      <img
        src={urlPublica('cenas/acesso/google-g.svg')}
        alt=""
        aria-hidden="true"
        width={20}
        height={20}
        className="shrink-0"
      />
      <span className="wrap-anywhere">{ocupado ? LOGIN_GOOGLE.abrindo : LOGIN_GOOGLE.botao}</span>
    </button>
  )
}
