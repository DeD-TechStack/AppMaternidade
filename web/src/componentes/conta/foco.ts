import { useContext, useEffect, useRef, type ContextType } from 'react'
import { UNSAFE_DataRouterContext, useLocation, useNavigationType } from 'react-router'

type RoteadorDeDados = NonNullable<ContextType<typeof UNSAFE_DataRouterContext>>['router']

// A primeira carga da página é a única exceção ao foco no título (o foco inicial é do navegador).
// "Já navegou" é um marcador por roteador, e o roteador vive uma carga de documento: ele passa a
// valer na primeira mudança de localização que o roteador faz. Voltar ao primeiro item do
// histórico não o desfaz (a `key` dele é sempre `default`, então ela sozinha não distingue). Cada
// roteador tem o seu: nada vaza de um para outro (por exemplo, entre testes).
const jaNavegou = new WeakMap<RoteadorDeDados, { valor: boolean }>()

function marcadorDe(roteador: RoteadorDeDados) {
  let marcador = jaNavegou.get(roteador)
  if (!marcador) {
    const novo = { valor: false }
    const chaveInicial = roteador.state.location.key
    roteador.subscribe((estado) => {
      if (estado.location.key !== chaveInicial) novo.valor = true
    })
    jaNavegou.set(roteador, novo)
    marcador = novo
  }
  return marcador
}

/**
 * Em toda navegação dentro do site, inclusive Voltar e Avançar do histórico, a rolagem vai ao topo
 * e o foco vai ao `h1` da tela nova. A exceção é a primeira carga da página. O `h1` leva
 * `tabIndex={-1}` e o contorno de foco da base. Em `#exportar` a tela da Conta faz o próprio foco,
 * no título da seção.
 */
export function useFocoNoTitulo() {
  const titulo = useRef<HTMLHeadingElement>(null)
  const tipo = useNavigationType()
  const { key, hash } = useLocation()
  const roteador = useContext(UNSAFE_DataRouterContext)?.router ?? null
  // Sem roteador de dados (não é o caso do site), vale a primeira execução desta tela.
  const jaRodou = useRef(false)

  useEffect(() => {
    const marcador = roteador ? marcadorDe(roteador) : null
    const primeiraCarga = tipo === 'POP' && (marcador ? !marcador.valor : !jaRodou.current)
    jaRodou.current = true
    // Uma navegação que não é Voltar/Avançar já é uma navegação dentro do site.
    if (tipo !== 'POP' && marcador) marcador.valor = true
    if (primeiraCarga || hash === '#exportar') return
    window.scrollTo(0, 0)
    titulo.current?.focus()
  }, [roteador, tipo, key, hash])

  return titulo
}

/** Os controles que o Tab alcança dentro de uma caixa de diálogo. */
export const CONTROLES_FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * O Tab fica dentro da caixa de diálogo (A11Y-007): do último controle volta ao primeiro, e Shift+Tab do
 * primeiro vai ao último. Chame no `keydown` da caixa; só age na tecla Tab.
 */
export function prenderOTab(evento: KeyboardEvent, caixa: HTMLElement): void {
  if (evento.key !== 'Tab') return
  const dentro = [...caixa.querySelectorAll<HTMLElement>(CONTROLES_FOCAVEIS)]
  if (dentro.length === 0) return evento.preventDefault()
  const primeiro = dentro[0]
  const ultimo = dentro[dentro.length - 1]
  const ativo = document.activeElement
  if (evento.shiftKey && (ativo === primeiro || !caixa.contains(ativo))) {
    evento.preventDefault()
    ultimo.focus()
  } else if (!evento.shiftKey && (ativo === ultimo || !caixa.contains(ativo))) {
    evento.preventDefault()
    primeiro.focus()
  }
}

/** Num envio com erro que não é de campo, o foco vai ao resumo do erro no topo. */
export function useFocoNoResumo(erro: unknown) {
  const resumo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (erro) resumo.current?.focus()
  }, [erro])

  return resumo
}
