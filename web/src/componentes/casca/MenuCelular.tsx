import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { NavLink } from 'react-router'
import { Etiqueta } from '../base/Etiqueta.tsx'
import { AREAS_EM_BREVE, ETIQUETA_EM_BREVE, ITENS_DO_CABECALHO, type Contexto } from './textos.ts'

const FOCAVEIS = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** O ponto de quebra do cabeçalho: de 768 para cima valem os links de computador, e o menu não existe. */
const PONTO_DE_QUEBRA = 768
const CONSULTA_COMPUTADOR = `(min-width: ${PONTO_DE_QUEBRA}px)`

/** A janela já passou do ponto de quebra móvel? No jsdom (sem layout) é a largura que decide. */
const naLarguraDeComputador = () => window.innerWidth >= PONTO_DE_QUEBRA

/**
 * O elemento está realmente visível? Com `checkVisibility` (navegadores atuais) vale o que o layout
 * mostra: `display: none` no nó ou num ancestral, e `visibility`. Sem ele (jsdom), não há o que ler
 * além de `[hidden]` e `[inert]`, que o chamador confere à parte.
 */
function estaVisivel(elemento: Element): boolean {
  const alvo = elemento as Element & { checkVisibility?: (opcoes?: { visibilityProperty?: boolean }) => boolean }
  return typeof alvo.checkVisibility === 'function' ? alvo.checkVisibility({ visibilityProperty: true }) : true
}

/**
 * A volta do foco com o menu aberto: todos os focáveis realmente visíveis do cabeçalho, na ordem do
 * documento (que é a ordem do Tab do navegador). Fica de fora o que está em `nav.sb-cab-links` (some
 * abaixo de 768, que é onde o menu existe), o que está em `[hidden]` ou `[inert]` e o que o
 * navegador não mostra (`checkVisibility`). É calculada a cada Tab, porque o cabeçalho muda (o botão
 * da direita, o painel que acabou de abrir).
 */
function voltaDoFoco(cabecalho: Element | null): HTMLElement[] {
  if (!cabecalho) return []
  return [...cabecalho.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(
    (elemento) => elemento.closest('.sb-cab-links, [hidden], [inert]') === null && estaVisivel(elemento),
  )
}

interface Props {
  id: string
  aberto: boolean
  contexto: Contexto
  aoFechar: () => void
  /** O botão que abre o menu: o foco volta a ele ao fechar, e o cabeçalho que o contém dá a volta do foco. */
  botao: RefObject<HTMLButtonElement | null>
}

type Grupo = { tipo: 'links'; itens: Array<{ rotulo: string; para: string }> } | { tipo: 'em-breve' }

/** Parte a lista do cabeçalho em grupos: os links seguidos, e o grupo das áreas futuras. */
function agrupar(contexto: Contexto): Grupo[] {
  const grupos: Grupo[] = []
  for (const item of ITENS_DO_CABECALHO[contexto]) {
    if (item.tipo === 'em-breve') {
      grupos.push({ tipo: 'em-breve' })
      continue
    }
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.tipo === 'links') ultimo.itens.push(item)
    else grupos.push({ tipo: 'links', itens: [item] })
  }
  return grupos
}

/**
 * O menu abaixo de 768: um painel de papel logo abaixo do cabeçalho, com os itens centrados em
 * `subtitulo` e os grupos separados por fios. Prende o foco numa volta fechada por todos os
 * focáveis visíveis do cabeçalho (botão do menu, nome do site, botão de ação e itens do painel, na
 * ordem do DOM), fecha com Esc e devolve o foco ao botão do menu. Ao ampliar a janela até 768 ou mais
 * o menu fecha sozinho (sem devolver o foco: o botão está oculto) e o Tab deixa de ser conduzido.
 */
export function MenuCelular({ id, aberto, contexto, aoFechar, botao }: Props) {
  const painel = useRef<HTMLDivElement>(null)

  // Ao abrir, o foco vai ao primeiro item.
  useEffect(() => {
    if (!aberto) return
    painel.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus()
  }, [aberto])

  // O menu só existe abaixo de 768: ao passar do ponto de quebra ele fecha (e os ouvintes saem junto,
  // porque dependem de `aberto`). O foco não volta ao botão do menu, que está oculto ali. Ouve o
  // `change` do matchMedia (quando existe) e o `resize`, que no jsdom lê a `innerWidth`.
  useEffect(() => {
    if (!aberto) return
    const aoRedimensionar = () => {
      if (naLarguraDeComputador()) aoFechar()
    }
    const aoMudarConsulta = (evento: { matches: boolean }) => {
      if (evento.matches) aoFechar()
    }
    const consulta = typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA_COMPUTADOR) : null
    if (consulta && typeof consulta.addEventListener === 'function') consulta.addEventListener('change', aoMudarConsulta)
    else if (consulta && typeof consulta.addListener === 'function') consulta.addListener(aoMudarConsulta)
    window.addEventListener('resize', aoRedimensionar)
    return () => {
      window.removeEventListener('resize', aoRedimensionar)
      if (consulta && typeof consulta.removeEventListener === 'function') consulta.removeEventListener('change', aoMudarConsulta)
      else if (consulta && typeof consulta.removeListener === 'function') consulta.removeListener(aoMudarConsulta)
    }
  }, [aberto, aoFechar])

  useEffect(() => {
    if (!aberto) return
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        aoFechar()
        botao.current?.focus()
        return
      }
      // Ctrl+Tab e Alt+Tab são do navegador e do sistema, não do foco da página.
      if (evento.key !== 'Tab' || evento.ctrlKey || evento.altKey || evento.metaKey) return
      // Sem o botão do menu à vista (de 768 para cima, ou oculto) não há volta a conduzir: o Tab é do navegador.
      if (naLarguraDeComputador() || !botao.current || !estaVisivel(botao.current)) return
      const volta = voltaDoFoco(botao.current?.closest('header[data-cabecalho]') ?? null)
      if (volta.length === 0) return
      // Todo Tab é conduzido: o foco vai ao próximo (ou anterior) da volta, com volta no fim e no
      // começo. Fora da volta, Tab leva ao primeiro e Shift+Tab ao último.
      const posicao = volta.indexOf(document.activeElement as HTMLElement)
      let destino: number
      if (posicao === -1) destino = evento.shiftKey ? volta.length - 1 : 0
      else destino = (posicao + (evento.shiftKey ? -1 : 1) + volta.length) % volta.length
      evento.preventDefault()
      volta[destino].focus()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aberto, aoFechar, botao])

  let conteudo: ReactNode = null
  if (aberto) {
    conteudo = agrupar(contexto).map((grupo, indice) =>
      grupo.tipo === 'links' ? (
        <ul key={`links-${indice}`} className="sb-menu-grupo">
          {grupo.itens.map((item) => (
            <li key={item.para + item.rotulo}>
              <NavLink to={item.para} end className="sb-menu-link t-subtitulo" onClick={aoFechar}>
                {item.rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      ) : (
        <ul key="em-breve" className="sb-menu-grupo">
          {AREAS_EM_BREVE.map((area) => (
            <li key={area} className="sb-menu-item t-subtitulo">
              <span>{area}</span>
              <Etiqueta>{ETIQUETA_EM_BREVE}</Etiqueta>
            </li>
          ))}
        </ul>
      ),
    )
  }

  return (
    <div id={id} ref={painel} className="sb-menu-celular" data-menu-celular="" hidden={!aberto}>
      {conteudo}
    </div>
  )
}
