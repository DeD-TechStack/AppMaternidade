import { useId, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router'

type DadosExtras = { [chave: `data-${string}`]: string | boolean | undefined }

/**
 * `primario`: pílula de cacau com texto de papel (no hover inverte na hora: papel com contorno de cacau).
 * `mel`: pílula de mel com texto de cacau, para usar sobre o cacau. `contorno`: pílula de 1,5 px.
 * `texto`: sem caixa, sublinhado no hover. `moldura`: o contorno antigo das telas do app (Hoje, Sessão),
 * mantido até o redesenho delas.
 */
export type VarianteBotao = 'primario' | 'mel' | 'contorno' | 'texto' | 'moldura'

interface Comum {
  variante?: VarianteBotao
  /** `site`: 56 px de altura. `app`: 48 px. */
  tamanho?: 'site' | 'app'
  /** Só na `moldura`: 64 px de altura, quando ela fica ao lado de um primário do app. */
  alto?: boolean
  /** Ícone (lucide) antes do texto; vai com `aria-hidden`. */
  icone?: ReactNode
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
  /** Desativado: `aria-disabled="true"` (continua focável), areia apagada e o motivo ao lado. */
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

// `alvo-toque` marca todo botão como alvo de 44 × 44 no mínimo (as telas do app conferem a marca).
const CLASSE: Record<Exclude<VarianteBotao, 'moldura'>, string> = {
  primario: 'cm-botao cm-botao-primario alvo-toque',
  mel: 'cm-botao cm-botao-mel alvo-toque',
  contorno: 'cm-botao cm-botao-contorno alvo-toque',
  texto: 'cm-botao cm-botao-texto alvo-toque',
}

/** Botão do site; vira link com `to` (rota) ou `href`. Estados: hover, foco visível e desativado. */
export function Botao(props: Props) {
  const { variante = 'primario', tamanho = 'site', alto = false, icone, className, children, to, href } = props
  const { type = 'button', onClick } = props
  const { desativado = false, motivo, ...resto } = props
  const idMotivo = useId()
  const moldura = variante === 'moldura'

  const dados: Record<string, string | boolean | undefined> = {}
  for (const [chave, valor] of Object.entries(resto)) {
    if (chave.startsWith('data-')) dados[chave] = valor as string | boolean | undefined
  }

  const base = moldura ? 'sb-moldura t-botao' : CLASSE[variante]
  const comuns = {
    className: [base, className].filter(Boolean).join(' '),
    'data-botao': variante,
    'data-tamanho': moldura ? undefined : tamanho,
    'data-moldura-dupla': moldura ? '' : undefined,
    'data-alto': moldura && alto ? '' : undefined,
    'aria-label': props['aria-label'],
    ...dados,
  }
  const comIcone = icone ? (
    <>
      <span className="cm-botao-icone" aria-hidden="true">
        {icone}
      </span>
      {children}
    </>
  ) : (
    children
  )
  const conteudo = moldura ? <span className="sb-moldura-miolo">{comIcone}</span> : comIcone

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
      <span id={idMotivo} className="cm-pequeno cm-texto-2">
        {motivo}
      </span>
    </span>
  )
}
