import { ChevronDown } from 'lucide-react'
import { useId, useSyncExternalStore, type MouseEvent } from 'react'
import { ROTULO_INDICE, type SecaoDeLeitura } from '../../conteudo/publicas-texto.ts'

/** Abaixo de 1100 px a página tem uma coluna só (como a grade em publicasTexto.css) e o índice se recolhe. */
const CONSULTA_COMPACTA = '(max-width: 1099.98px)'

function temMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function assinar(aviso: () => void): () => void {
  if (!temMatchMedia()) return () => {}
  const lista = window.matchMedia(CONSULTA_COMPACTA)
  if (typeof lista.addEventListener === 'function') {
    lista.addEventListener('change', aviso)
    return () => lista.removeEventListener('change', aviso)
  }
  return () => {}
}

/** Sem matchMedia (jsdom puro, renderização no servidor) vale o índice aberto, o de tela larga. */
function ler(): boolean {
  return temMatchMedia() ? window.matchMedia(CONSULTA_COMPACTA).matches : false
}

/** Leva a leitura ao título da seção e põe o foco nele (o `h2` tem `tabIndex={-1}`), sem mudar o endereço. */
function irParaSecao(evento: MouseEvent<HTMLAnchorElement>, id: string) {
  const alvo = document.getElementById(id)
  if (!alvo) return
  evento.preventDefault()
  alvo.scrollIntoView?.()
  alvo.focus({ preventScroll: true })
}

/**
 * O índice "Nesta página": um link sublinhado, de 44 px no mínimo, para cada `h2` da página, numa lista
 * vertical só, igual nas seis páginas. Em tela larga ele fica entre a abertura e a leitura, na coluna de
 * leitura; em tela estreita vira um `<details>` fechado ("Nesta página", 44 px no mínimo), para a primeira
 * tela mostrar o texto.
 */
export function IndiceDaPagina({ secoes }: { secoes: readonly SecaoDeLeitura['secao'][] }) {
  const idRotulo = useId()
  const compacto = useSyncExternalStore(assinar, ler, () => false)

  const lista = (
    <ul className="pt-indice-lista">
      {secoes.map(({ titulo, id }) => (
        <li key={id}>
          <a className="pt-indice-link alvo-toque" href={`#${id}`} onClick={(evento) => irParaSecao(evento, id)}>
            {titulo}
          </a>
        </li>
      ))}
    </ul>
  )

  if (compacto) {
    return (
      <nav className="pt-indice" aria-label={ROTULO_INDICE}>
        <details className="pt-indice-detalhes">
          <summary className="pt-indice-resumo alvo-toque">
            <span>{ROTULO_INDICE}</span>
            <ChevronDown aria-hidden="true" className="pt-indice-seta" size={20} strokeWidth={2} />
          </summary>
          {lista}
        </details>
      </nav>
    )
  }

  return (
    <nav className="pt-indice" aria-labelledby={idRotulo}>
      <p id={idRotulo} className="pt-indice-rotulo">
        {ROTULO_INDICE}
      </p>
      {lista}
    </nav>
  )
}
