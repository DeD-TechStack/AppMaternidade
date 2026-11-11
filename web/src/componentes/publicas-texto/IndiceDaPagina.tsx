import { useId, type MouseEvent } from 'react'
import { ROTULO_INDICE, type SecaoDeLeitura } from '../../conteudo/publicas-texto.ts'

/** Leva a leitura ao título da seção e põe o foco nele (o `h2` tem `tabIndex={-1}`), sem mudar o endereço. */
function irParaSecao(evento: MouseEvent<HTMLAnchorElement>, id: string) {
  const alvo = document.getElementById(id)
  if (!alvo) return
  evento.preventDefault()
  alvo.scrollIntoView?.()
  alvo.focus({ preventScroll: true })
}

/** O índice "Nesta página": um link sublinhado, de 44 px no mínimo, para cada `h2` da página. */
export function IndiceDaPagina({ secoes }: { secoes: readonly SecaoDeLeitura['secao'][] }) {
  const idRotulo = useId()
  return (
    <nav className="pt-indice" aria-labelledby={idRotulo}>
      <p id={idRotulo} className="pt-indice-rotulo">
        {ROTULO_INDICE}
      </p>
      <ul className="pt-indice-lista">
        {secoes.map(({ titulo, id }) => (
          <li key={id}>
            <a className="pt-indice-link alvo-toque" href={`#${id}`} onClick={(evento) => irParaSecao(evento, id)}>
              {titulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
