import { useId, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router'

type DadosExtras = { [chave: `data-${string}`]: string | boolean | undefined }

interface Comum {
  /** `primario`: urucum, 80 px (64 abaixo de 768). `moldura`: moldura dupla, 48 px. */
  variante?: 'primario' | 'moldura'
  /** Só na moldura dupla: 64 px de altura, quando ela fica ao lado de um primário. */
  alto?: boolean
  className?: string
  children: ReactNode
  'aria-pressed'?: boolean
  'aria-label'?: string
}

interface ComoBotao {
  to?: undefined
  href?: undefined
  type?: 'button' | 'submit'
  onClick?: (evento: MouseEvent<HTMLButtonElement>) => void
  /** Desativado: `aria-disabled="true"`, fundo sólido apagado e o motivo ao lado. */
  desativado?: boolean
  motivo?: string
}

interface ComoLinkInterno {
  to: string
  href?: undefined
  type?: undefined
  onClick?: undefined
  desativado?: undefined
  motivo?: undefined
}

interface ComoLinkExterno {
  href: string
  to?: undefined
  type?: undefined
  onClick?: undefined
  desativado?: undefined
  motivo?: undefined
}

type Props = Comum & DadosExtras & (ComoBotao | ComoLinkInterno | ComoLinkExterno)

/** Botão do sistema-base: primário ou de moldura dupla; vira link com `to` (rota) ou `href`. */
export function Botao(props: Props) {
  const { variante = 'primario', alto = false, className, children, to, href, type = 'button', onClick } = props
  const { desativado = false, motivo, ...resto } = props
  const idMotivo = useId()
  const moldura = variante === 'moldura'

  const dados: Record<string, string | boolean | undefined> = {}
  for (const [chave, valor] of Object.entries(resto)) {
    if (chave.startsWith('data-')) dados[chave] = valor as string | boolean | undefined
  }

  const classe = [moldura ? 'sb-moldura t-botao' : 'sb-botao t-botao', className].filter(Boolean).join(' ')
  const comuns = {
    className: classe,
    'data-botao': moldura ? 'moldura' : 'primario',
    'data-moldura-dupla': moldura ? '' : undefined,
    'data-alto': moldura && alto ? '' : undefined,
    'aria-label': props['aria-label'],
    ...dados,
  }
  const conteudo = moldura ? <span className="sb-moldura-miolo">{children}</span> : children

  if (to !== undefined) {
    return (
      <Link to={to} {...comuns}>
        {conteudo}
      </Link>
    )
  }
  if (href !== undefined) {
    return (
      <a href={href} {...comuns}>
        {conteudo}
      </a>
    )
  }

  function aoClicar(evento: MouseEvent<HTMLButtonElement>) {
    if (desativado) {
      evento.preventDefault()
      return
    }
    onClick?.(evento)
  }

  const botao = (
    <button
      type={type}
      onClick={aoClicar}
      aria-pressed={props['aria-pressed']}
      aria-disabled={desativado ? 'true' : undefined}
      aria-describedby={desativado && motivo ? idMotivo : undefined}
      {...comuns}
    >
      {conteudo}
    </button>
  )

  if (!desativado || !motivo) return botao
  return (
    <span className="sb-botao-grupo">
      {botao}
      <span id={idMotivo} className="t-corpo-p t-secundario">
        {motivo}
      </span>
    </span>
  )
}
