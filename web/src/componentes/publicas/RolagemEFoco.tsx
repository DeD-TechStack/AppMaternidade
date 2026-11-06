import { useEffect, useRef } from 'react'
import { useLocation, useMatches, useNavigationType } from 'react-router'
import { CAMINHOS, PAGINAS_NOVAS } from '../../conteudo/publicas.ts'

// Rolagem e foco a cada troca de rota, por uma tabela de precedência única (a primeira linha que
// casa vale). Montado uma vez na rota raiz.
//
// | 1 | entrada inicial      | âncora válida: rola até o alvo; senão nada | foco: nada
// | 2 | voltar ou avançar    | nada                                       | página da MAT-36: o h1; senão nada
// | 3 | destino é Hoje/Sessão| nada                                       | nada (o foco é o da base)
// | 4 | só a âncora muda    | âncora válida: rola até o alvo             | página da MAT-36 e âncora válida: o h2
// | 5 | navegação nova       | âncora válida: rola; senão topo            | página da MAT-36: o h2 alvo ou o h1
//
// "Páginas da MAT-36" são as 9 novas e a Página não encontrada. "Pública" é essas e o Início.

type Destino = 'inicio' | 'mat36' | 'app' | 'outro'
/** "nova" é PUSH ou REPLACE; "POP" é voltar ou avançar, depois da entrada inicial. */
type TipoDeTroca = 'inicial' | 'POP' | 'nova'

interface Troca {
  tipo: TipoDeTroca
  destino: Destino
  /**
   * A troca manteve o caminho e a busca da página anterior e só o fragmento mudou, inclusive quando o
   * novo fragmento é vazio. A mesma URL (nada mudou) não é troca só de âncora.
   */
  soAncora: boolean
  /** O #âncora da URL existe na página de destino. */
  ancoraValida: boolean
}

interface Decisao {
  rolagem: 'alvo' | 'topo' | null
  foco: 'h1' | 'alvo' | null
}

/** Que tipo de página é o destino. A Página não encontrada (rota coringa) é da MAT-36. */
export function classificarDestino(pathname: string, rotaCoringa: boolean): Destino {
  if (rotaCoringa) return 'mat36'
  const caminho = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (caminho === CAMINHOS.inicio) return 'inicio'
  if (caminho === CAMINHOS.hoje || caminho === CAMINHOS.sessao) return 'app'
  if (PAGINAS_NOVAS.includes(caminho)) return 'mat36'
  return 'outro'
}

const NADA: Decisao = { rolagem: null, foco: null }

/** A tabela de precedência. Pura: o DOM só entra em `ancoraValida`. */
export function decidir({ tipo, destino, soAncora, ancoraValida }: Troca): Decisao {
  if (tipo === 'inicial') return { rolagem: ancoraValida ? 'alvo' : null, foco: null }
  if (tipo === 'POP') return { rolagem: null, foco: destino === 'mat36' ? 'h1' : null }
  if (destino === 'app' || destino === 'outro') return NADA
  if (soAncora) {
    return { rolagem: ancoraValida ? 'alvo' : null, foco: destino === 'mat36' && ancoraValida ? 'alvo' : null }
  }
  return {
    rolagem: ancoraValida ? 'alvo' : 'topo',
    foco: destino === 'mat36' ? (ancoraValida ? 'alvo' : 'h1') : null,
  }
}

/** O elemento do #âncora, se a página de destino o tem. */
function alvoDaAncora(hash: string): HTMLElement | null {
  if (hash.length < 2) return null
  let id = hash.slice(1)
  try {
    id = decodeURIComponent(id)
  } catch {
    // Âncora com % solto: vale o texto como veio.
  }
  return document.getElementById(id)
}

/** Deixa o título pronto para o foco por código: tabindex="-1" e sem contorno extra. Não move o foco. */
function prepararParaFoco(titulo: HTMLElement | null) {
  if (!titulo) return
  if (!titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1')
  // O contorno de foco por código é o das outras páginas (utilitário já usado no h1 delas). O foco visível
  // dos controles não muda.
  titulo.classList.add('focus:outline-none')
}

/** Foco por código, sem rolar. O título que não é focável ganha tabindex="-1" antes. */
function focar(elemento: HTMLElement | null) {
  if (!elemento) return
  if (!elemento.hasAttribute('tabindex')) elemento.setAttribute('tabindex', '-1')
  elemento.focus({ preventScroll: true })
}

/** O fragmento sem o "#" solto: "#" e "" são a mesma URL. */
const fragmentoDe = (hash: string) => (hash === '#' ? '' : hash)

export function RolagemEFoco() {
  const local = useLocation()
  const tipoDeNavegacao: string = useNavigationType()
  const rotas = useMatches()
  // A última troca tratada. O efeito pode rodar duas vezes para a mesma rota (StrictMode): a chave
  // da localização impede o segundo tratamento. Sem anterior, é a entrada inicial.
  const anterior = useRef<{ chave: string; caminho: string; busca: string; hash: string } | null>(null)
  const rotaCoringa = rotas.length > 0 && rotas[rotas.length - 1].params['*'] !== undefined

  useEffect(() => {
    // O h1 das páginas da MAT-36 fica pronto para o foco por código em toda troca, inclusive na entrada
    // inicial (quando o foco não se move). A Página não encontrada não pode mudar, então é esta camada
    // que dá o tabindex ao h1 dela.
    const destino = classificarDestino(local.pathname, rotaCoringa)
    if (destino === 'mat36') prepararParaFoco(document.querySelector<HTMLElement>('main h1'))

    if (anterior.current?.chave === local.key) return
    const inicial = anterior.current === null
    const alvo = alvoDaAncora(local.hash)
    const hash = fragmentoDe(local.hash)
    // Troca só de âncora: mesmo caminho e mesma busca, e o fragmento mudou (também para vazio). A mesma
    // URL, por exemplo o link do rodapé da página em que já se está, não é troca de âncora.
    const soAncora =
      !inicial &&
      anterior.current?.caminho === local.pathname &&
      anterior.current.busca === local.search &&
      anterior.current.hash !== hash
    const decisao = decidir({
      tipo: inicial ? 'inicial' : tipoDeNavegacao === 'POP' ? 'POP' : 'nova',
      destino,
      soAncora,
      ancoraValida: alvo !== null,
    })
    anterior.current = { chave: local.key, caminho: local.pathname, busca: local.search, hash }

    if (decisao.rolagem === 'alvo' && alvo && typeof alvo.scrollIntoView === 'function') alvo.scrollIntoView()
    else if (decisao.rolagem === 'topo') window.scrollTo(0, 0)

    if (decisao.foco === 'h1') focar(document.querySelector<HTMLElement>('main h1'))
    else if (decisao.foco === 'alvo') focar(alvo)
  }, [local, tipoDeNavegacao, rotaCoringa])

  return null
}
