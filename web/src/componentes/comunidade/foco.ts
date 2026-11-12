import { useCallback, useEffect, useRef, useState } from 'react'

// A regra de foco da MAT-40:RF-15 (PR-38): quando o controle some depois de um diálogo, de um bloqueio
// ou de uma ação, o foco vai ao primeiro destes que existir: o botão de origem; o título do item
// afetado (`tabindex="-1"`); o item seguinte da lista; a confirmação em `role="status"`; o `h1` da
// tela. Nunca cai no `body`.

export type AlvoDeFoco = () => HTMLElement | null | undefined

/** Foca o primeiro alvo que ainda está na página; o `h1` é a última reserva. */
function focarPrimeiro(alvos: AlvoDeFoco[]): void {
  for (const alvo of [...alvos, () => document.querySelector<HTMLElement>('main h1')]) {
    const elemento = alvo()
    if (elemento?.isConnected) {
      elemento.focus()
      return
    }
  }
}

/**
 * O pedido de foco vale depois da próxima renderização, quando o DOM já tem o que as outras mudanças
 * de estado puseram (ou tiraram).
 */
export function useFocoPendente(): (alvos: AlvoDeFoco[]) => void {
  const pedido = useRef<AlvoDeFoco[] | null>(null)
  const [, renderizar] = useState(0)

  useEffect(() => {
    const alvos = pedido.current
    if (!alvos) return
    pedido.current = null
    focarPrimeiro(alvos)
  })

  return useCallback((alvos: AlvoDeFoco[]) => {
    pedido.current = alvos
    renderizar((n) => n + 1)
  }, [])
}
