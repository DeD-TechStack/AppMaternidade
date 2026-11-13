import type { MouseEvent } from 'react'
import { ROTULO_PULAR } from './textos.ts'

/** O `id` que o `<main>` da página recebe, se ainda não tiver um (WCAG 2.4.1). */
const ID_DO_CONTEUDO = 'conteudo'

/**
 * O primeiro ponto do Tab de toda página (WCAG 2.4.1, nível A): um link de verdade, escondido até o foco, que
 * leva o foco ao `<main>` da tela. Cada tela monta o próprio `<main>`, então o alvo é achado na hora do
 * clique: o primeiro `main` do documento ganha `id` e `tabindex="-1"` se faltarem. O clique não navega
 * (sem `#conteudo` na URL, sem mexer na rota do roteador).
 */
export function PularParaConteudo() {
  function aoClicar(evento: MouseEvent<HTMLAnchorElement>) {
    const principal = document.querySelector<HTMLElement>('main')
    if (!principal) return
    evento.preventDefault()
    if (!principal.id) principal.id = ID_DO_CONTEUDO
    if (!principal.hasAttribute('tabindex')) principal.setAttribute('tabindex', '-1')
    principal.focus({ preventScroll: true })
    // O jsdom não implementa a rolagem; o navegador leva o `<main>` para a vista (abaixo do cabeçalho fixo).
    if (typeof principal.scrollIntoView === 'function') principal.scrollIntoView({ block: 'start' })
  }

  return (
    <a href={`#${ID_DO_CONTEUDO}`} className="cm-pular alvo-toque" onClick={aoClicar}>
      {ROTULO_PULAR}
    </a>
  )
}
