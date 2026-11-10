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

/** O `#id` da localização aponta para um elemento que está na tela. */
function idDoHashExiste(hash: string): boolean {
  if (hash.length < 2) return false
  let id = hash.slice(1)
  try {
    id = decodeURIComponent(id)
  } catch {
    /* o hash cru serve */
  }
  return document.getElementById(id) !== null
}

/**
 * Em toda navegação dentro do site, inclusive Voltar e Avançar do histórico, a rolagem vai ao topo
 * e o foco vai ao `h1` da tela nova. A exceção é a primeira carga da página. O `h1` leva
 * `tabIndex={-1}` e o contorno de foco da base.
 *
 * Com um `#id` que existe na tela (o índice da Conta, `/app/conta#exportar`) o hook não rola nem
 * foca: o destino é a seção, e levar a página ao topo e o foco ao `h1` desfazia a rolagem até ela.
 * Quem tem seções (a Conta) rola e foca o título da seção por conta própria. Um `#id` sem elemento
 * na tela, e toda navegação sem `#id` (outra tela, Voltar e Avançar), seguem a regra acima.
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
    if (primeiraCarga || idDoHashExiste(hash)) return
    window.scrollTo(0, 0)
    titulo.current?.focus()
  }, [roteador, tipo, key, hash])

  return titulo
}

/** Num envio com erro que não é de campo, o foco vai ao resumo do erro no topo. */
export function useFocoNoResumo(erro: unknown) {
  const resumo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (erro) resumo.current?.focus()
  }, [erro])

  return resumo
}
