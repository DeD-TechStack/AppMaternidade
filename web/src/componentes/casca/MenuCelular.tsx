import { useEffect, useRef, type RefObject } from 'react'
import { NavLink } from 'react-router'
import { Botao } from '../base/Botao.tsx'
import {
  DESTINO_CRIAR_CONTA,
  DESTINO_ENTRAR,
  ITENS_DO_CABECALHO,
  ROTULO_CRIAR_CONTA,
  ROTULO_ENTRAR,
  type Contexto,
} from './textos.ts'

const FOCAVEIS = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** O ponto de quebra do cabeçalho: de 1100 para cima valem os links de computador, e o menu não existe. */
const PONTO_DE_QUEBRA = 1100
const CONSULTA_COMPUTADOR = `(min-width: ${PONTO_DE_QUEBRA}px)`

/** A janela já passou do ponto de quebra? No jsdom (sem layout) é a largura que decide. */
const naLarguraDeComputador = () => window.innerWidth >= PONTO_DE_QUEBRA

/**
 * O elemento está realmente visível? Com `checkVisibility` (navegadores atuais) vale o que o layout
 * mostra; sem ele (jsdom), só `[hidden]` e `[inert]`, que o chamador confere à parte.
 */
function estaVisivel(elemento: Element): boolean {
  const alvo = elemento as Element & { checkVisibility?: (opcoes?: { visibilityProperty?: boolean }) => boolean }
  return typeof alvo.checkVisibility === 'function' ? alvo.checkVisibility({ visibilityProperty: true }) : true
}

/**
 * A volta do foco com o menu aberto: os focáveis visíveis do cabeçalho, na ordem do documento. Ficam de
 * fora os links de computador (`.cm-cab-links`, ocultos aqui), o que está em `[hidden]` ou `[inert]` e
 * o que o navegador não mostra. É calculada a cada Tab, porque o cabeçalho muda.
 */
function voltaDoFoco(cabecalho: Element | null): HTMLElement[] {
  if (!cabecalho) return []
  return [...cabecalho.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(
    (elemento) => elemento.closest('.cm-cab-links, .cm-pular, [hidden], [inert]') === null && estaVisivel(elemento),
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

/**
 * O menu abaixo de 1100 px: um painel de papel de altura cheia logo abaixo do cabeçalho, com os links em
 * Literata e, no site público, Entrar e "Criar conta". Prende o foco numa volta pelos focáveis visíveis
 * do cabeçalho, fecha com Esc devolvendo o foco ao botão do menu e fecha sozinho ao passar de 1100.
 */
export function MenuCelular({ id, aberto, contexto, aoFechar, botao }: Props) {
  const painel = useRef<HTMLDivElement>(null)

  // Ao abrir, o foco vai ao primeiro item.
  useEffect(() => {
    if (!aberto) return
    painel.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus()
  }, [aberto])

  // Ao passar do ponto de quebra o menu fecha (o foco não volta ao botão, que some ali).
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
    window.addEventListener('resize', aoRedimensionar)
    return () => {
      window.removeEventListener('resize', aoRedimensionar)
      if (consulta && typeof consulta.removeEventListener === 'function') consulta.removeEventListener('change', aoMudarConsulta)
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
      if (evento.key !== 'Tab' || evento.ctrlKey || evento.altKey || evento.metaKey) return
      if (naLarguraDeComputador() || !botao.current || !estaVisivel(botao.current)) return
      const volta = voltaDoFoco(botao.current?.closest('header[data-cabecalho]') ?? null)
      if (volta.length === 0) return
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

  return (
    <div id={id} ref={painel} className="cm-menu-celular" data-menu-celular="" hidden={!aberto}>
      {aberto ? (
        <div className="cm-area">
          <ul className="cm-menu-lista">
            {ITENS_DO_CABECALHO[contexto].map((item) => (
              <li key={item.para}>
                <NavLink to={item.para} end className="cm-menu-link cm-h3" onClick={aoFechar}>
                  {item.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
          {contexto === 'publico' ? (
            <div className="cm-menu-acoes">
              <Botao to={DESTINO_CRIAR_CONTA}>{ROTULO_CRIAR_CONTA}</Botao>
              <Botao variante="contorno" to={DESTINO_ENTRAR}>
                {ROTULO_ENTRAR}
              </Botao>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
