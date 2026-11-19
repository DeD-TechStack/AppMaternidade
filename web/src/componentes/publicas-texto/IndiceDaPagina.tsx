import { ChevronDown } from 'lucide-react'
import { useId, useSyncExternalStore, type MouseEvent } from 'react'
import { ROTULO_INDICE, type SecaoDeLeitura } from '../../conteudo/publicas-texto.ts'

/**
 * O índice vai para a direita da coluna de leitura quando o quadro da página tem 66 rem (a consulta de contêiner de
 * publicasTexto.css). O quadro mede 100vw − 2 × a calha (uns 0,977 × 100vw − 31 px), então isso é uns 69,5 rem de
 * janela: abaixo disso o índice fica em fluxo, antes do documento, e se recolhe.
 */
const CONSULTA_COMPACTA = '(max-width: 69.5rem)'

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
 * O índice "Nesta página": um link de cacau, de 44 px no mínimo e sublinhado no hover e no foco, para cada `h2` da
 * página, numa lista vertical só, igual nas seis páginas. Com lugar para ele, fica à direita da coluna de leitura;
 * em tela estreita vem antes do documento e vira um `<details>` fechado ("Nesta página", 48 px), para a primeira
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
