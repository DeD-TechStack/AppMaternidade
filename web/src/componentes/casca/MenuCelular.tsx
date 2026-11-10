import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { NavLink } from 'react-router'
import { Etiqueta } from '../base/Etiqueta.tsx'
import { AREAS_EM_BREVE, ETIQUETA_EM_BREVE, ITENS_DO_CABECALHO, type Contexto } from './textos.ts'

const FOCAVEIS = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

interface Props {
  id: string
  aberto: boolean
  contexto: Contexto
  aoFechar: () => void
  /** O botão que abre o menu: o foco volta a ele ao fechar, e ele entra na volta do foco. */
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
 * `subtitulo` e os grupos separados por fios. Prende o foco (Tab volta ao começo), fecha com Esc e
 * devolve o foco ao botão do menu.
 */
export function MenuCelular({ id, aberto, contexto, aoFechar, botao }: Props) {
  const painel = useRef<HTMLDivElement>(null)

  // Ao abrir, o foco vai ao primeiro item.
  useEffect(() => {
    if (!aberto) return
    painel.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus()
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        aoFechar()
        botao.current?.focus()
        return
      }
      if (evento.key !== 'Tab' || !painel.current) return
      const volta = [botao.current, ...painel.current.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(
        (elemento): elemento is HTMLElement => elemento !== null,
      )
      if (volta.length === 0) return
      const posicao = volta.indexOf(document.activeElement as HTMLElement)
      if (evento.shiftKey && posicao <= 0) {
        evento.preventDefault()
        volta[volta.length - 1].focus()
      } else if (!evento.shiftKey && (posicao === -1 || posicao === volta.length - 1)) {
        evento.preventDefault()
        volta[0].focus()
      }
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
