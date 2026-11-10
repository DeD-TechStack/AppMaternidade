import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Abertura } from '../base/Abertura.tsx'
import { Etiqueta } from '../base/Etiqueta.tsx'
import { NOME_SITE, TF } from '../../conteudo/publicas.ts'

// O nome do site quebra só entre "App" e "Maternidade" (o rodapé da casca quebra no mesmo ponto), nunca com
// hífen no meio da palavra.
const [INICIO_DO_NOME, FIM_DO_NOME] = [NOME_SITE.slice(0, 3), NOME_SITE.slice(3)]

/**
 * O título com um ponto de quebra (`<wbr>`) entre "App" e "Maternidade" onde o nome do site aparece. O
 * `<wbr>` não é caractere: o `textContent` e o nome acessível do `h1` continuam o título inteiro. O nome
 * fica num `span.vp-nome` que, de 768 para cima, é uma caixa em linha única: se cabe numa linha, vai
 * inteiro para ela (o ponto de quebra só vale quando o nome não cabe, como no celular).
 * A `Abertura` da base tipa o título como `string` mas só o põe dentro do `h1`; o elemento passa pelo tipo
 * por um `as` porque a base não pode ser editada. Título sem o nome volta como veio.
 */
function comQuebraNoNome(titulo: string): string {
  const partes = titulo.split(NOME_SITE)
  if (partes.length === 1) return titulo
  return (
    <>
      {partes.map((parte, indice) => (
        <Fragment key={indice}>
          {indice > 0 ? (
            <span className="vp-nome">
              {INICIO_DO_NOME}
              <wbr />
              {FIM_DO_NOME}
            </span>
          ) : null}
          {parte}
        </Fragment>
      ))}
    </>
  ) as unknown as string
}

/** Um aviso da coluna lateral: `ui` 15, na cor secundária. */
export function AvisoLateral({ children, aviso }: { children: ReactNode; aviso?: string }) {
  return (
    <li>
      <p className="t-ui t-secundario" data-aviso={aviso}>
        {children}
      </p>
    </li>
  )
}

/** Um link da coluna lateral, com o alvo de toque inteiro. */
export function LinkLateral({ para, children }: { para: string; children: ReactNode }) {
  return (
    <li>
      <Link className="sb-abertura-link t-corpo alvo-toque" to={para}>
        {children}
      </Link>
    </li>
  )
}

interface Props {
  titulo: string
  subtitulo: string
  /** Etiquetas da lateral (uma por item), as primeiras da coluna, com palavras da própria página. */
  etiquetas?: readonly string[]
  /** Itens da lateral antes do aviso de construção (TF-10). */
  antes?: ReactNode
  /** Itens da lateral depois do aviso de construção. */
  depois?: ReactNode
  /**
   * Leva o aviso de construção (TF-10)? Sim, em toda página que descreve função. A Página não encontrada
   * não descreve nenhuma e passa `false`.
   */
  construcao?: boolean
}

/**
 * A abertura das páginas públicas: a da base, com a lateral em c9–c10. A lateral leva as etiquetas da
 * página (quando tem), o que ela pede antes do aviso de construção (TF-10), o aviso e o que vem depois.
 * Sem nenhum desses itens não há lateral (nada de lista vazia).
 */
export function AberturaPublica({ titulo, subtitulo, etiquetas, antes, depois, construcao = true }: Props) {
  const temLateral = Boolean(etiquetas?.length) || Boolean(antes) || Boolean(depois) || construcao
  return (
    <Abertura
      titulo={comQuebraNoNome(titulo)}
      subtitulo={subtitulo}
      lateral={
        temLateral ? (
          <>
            {etiquetas?.map((etiqueta) => (
              <li key={etiqueta} className="vp-etiqueta-item">
                <Etiqueta>{etiqueta}</Etiqueta>
              </li>
            ))}
            {antes}
            {construcao ? <AvisoLateral aviso="construcao">{TF.construcao}</AvisoLateral> : null}
            {depois}
          </>
        ) : undefined
      }
    />
  )
}
