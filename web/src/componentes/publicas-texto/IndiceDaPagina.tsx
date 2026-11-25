import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react'
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

/** Menos de três seções não pedem índice (Contato tem duas): a página abre direto no texto. */
const MINIMO_DE_SECOES = 3

/** A linha de âncora (`--ancora-leitura`, lida do `scroll-padding-top` do html): onde o título de uma seção para. */
function linhaDeAncora(): number {
  const valor = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)
  return Number.isFinite(valor) ? valor : 0
}

/**
 * Qual título é o da seção atual: o último que já chegou à linha de âncora (ou passou dela); antes de o primeiro chegar,
 * o primeiro. Um `IntersectionObserver` sobre os `h2`, com a raiz começando na linha de âncora (sem ouvinte de rolagem).
 * Quem aperta o link n fica com n como atual enquanto o título n estiver à vista, mesmo no fim da página, onde ele pode
 * não alcançar a linha; quando sai da tela, volta a valer o cálculo.
 */
function useSecaoAtual(ids: readonly string[]): [string, (id: string) => void] {
  const [atual, definirAtual] = useState(ids[0] ?? '')
  const forcado = useRef<string | null>(null)
  const chave = ids.join('|')

  useEffect(() => {
    const lista = chave ? chave.split('|') : []
    forcado.current = null
    if (lista.length < MINIMO_DE_SECOES || typeof IntersectionObserver === 'undefined') return undefined
    const passou = new Map<string, boolean>()
    const visivel = new Map<string, boolean>()
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          const id = entrada.target.id
          const topoDaRaiz = entrada.rootBounds?.top ?? 0
          passou.set(id, entrada.boundingClientRect.top <= topoDaRaiz + 1)
          visivel.set(id, entrada.isIntersecting)
        }
        let calculado = lista[0] ?? ''
        for (const id of lista) if (passou.get(id)) calculado = id
        if (forcado.current !== null) {
          if (calculado === forcado.current || !visivel.get(forcado.current)) forcado.current = null
          else calculado = forcado.current
        }
        definirAtual(calculado)
      },
      { rootMargin: `-${linhaDeAncora()}px 0px 0px 0px`, threshold: [0, 1] },
    )
    for (const id of lista) {
      const titulo = document.getElementById(id)
      if (titulo) observador.observe(titulo)
    }
    return () => observador.disconnect()
  }, [chave])

  return [
    atual,
    (id) => {
      forcado.current = id
      definirAtual(id)
    },
  ]
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
 * página, numa lista vertical só, igual nas seis páginas com três seções ou mais. Com lugar para ele, fica à direita
 * da coluna de leitura e acompanha a leitura (gruda na linha de âncora, em `publicasTexto.css`), com um marcador no
 * link da seção atual (`aria-current="location"`); em tela estreita vem antes do documento e vira um `<details>`
 * fechado ("Nesta página", 48 px), para a primeira tela mostrar o texto.
 */
export function IndiceDaPagina({ secoes }: { secoes: readonly SecaoDeLeitura['secao'][] }) {
  const idRotulo = useId()
  const compacto = useSyncExternalStore(assinar, ler, () => false)
  const [atual, marcar] = useSecaoAtual(secoes.map(({ id }) => id))

  if (secoes.length < MINIMO_DE_SECOES) return null

  const lista = (
    <ul className="pt-indice-lista">
      {secoes.map(({ titulo, id }) => (
        <li key={id}>
          <a
            className="pt-indice-link alvo-toque"
            href={`#${id}`}
            aria-current={id === atual ? 'location' : undefined}
            onClick={(evento) => {
              marcar(id)
              irParaSecao(evento, id)
            }}
          >
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
