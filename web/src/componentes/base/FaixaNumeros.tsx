import { useLayoutEffect, useRef } from 'react'

interface Item {
  /** O número, em Zilla Slab 700. */
  valor: string
  legenda: string
}

// O número nasce em 112 px e cai para 96, 72 ou 56 se não couber em uma linha (tabela 2.2).
const TAMANHOS_DO_NUMERO = [112, 96, 72, 56] as const

/** Escolhe o maior tamanho do conjunto com que o número cabe, sem quebrar, na largura do item. */
function ajustar(numero: HTMLElement) {
  for (const tamanho of TAMANHOS_DO_NUMERO) {
    numero.style.fontSize = `${tamanho}px`
    if (numero.scrollWidth <= numero.clientWidth) return
  }
}

/**
 * Faixa de números: 3 colunas iguais, um fio horizontal no topo e 2 verticais com a altura da
 * linha. Cada número cabe em uma linha: se não couber, cai para o próximo tamanho do conjunto.
 */
export function FaixaNumeros({ itens }: { itens: readonly [Item, Item, Item] }) {
  const raiz = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const no = raiz.current
    if (!no) return
    const numeros = [...no.querySelectorAll<HTMLElement>('[data-numero]')]
    const reajustar = () => {
      for (const numero of numeros) ajustar(numero)
    }
    reajustar()
    if (typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(reajustar)
    observador.observe(no)
    return () => observador.disconnect()
  }, [itens])

  return (
    <div ref={raiz} className="sb-numeros" data-bloco="">
      {itens.map((item) => (
        <div key={item.valor + item.legenda} className="sb-numeros-item">
          <p data-numero="" className="sb-numeros-valor t-numero">
            {item.valor}
          </p>
          <p className="sb-numeros-legenda t-corpo">{item.legenda}</p>
        </div>
      ))}
    </div>
  )
}
