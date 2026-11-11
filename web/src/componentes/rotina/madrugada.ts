import { useEffect, useSyncExternalStore } from 'react'
import { useMatches } from 'react-router'

// O modo madrugada (R38-04): o estado fica só na memória da página e vive nas rotas da Rotina. A rota sem
// caminho que é pai de todas as telas da área (`rotas/rotina.tsx`) leva `handle: { area: 'rotina' }`: enquanto
// a URL casa com ela, a madrugada pode ligar e o `data-tema` do `<html>` a acompanha; ao sair (Início, Conta,
// outra área), o estado e o atributo vão embora, e a próxima entrada começa limpa. O botão `Modo madrugada` mora no cabeçalho da casca, que é irmã da área e não lê o estado dela por
// contexto: ele chega ao cabeçalho por este módulo (`useLuaDaCasca`), e o `Layout.tsx` fica como o da base.

/** O valor de `handle.area` da rota pai das telas da Rotina. */
export const AREA_DA_ROTINA = 'rotina'

let ligada = false
const ouvintes = new Set<() => void>()

const avisar = () => {
  for (const ouvinte of [...ouvintes]) ouvinte()
}

const assinar = (ouvinte: () => void) => {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

const ler = () => ligada

function definir(valor: boolean) {
  if (ligada === valor) return
  ligada = valor
  avisar()
}

interface ControleDaMadrugada {
  madrugada: boolean
  definir: (valor: boolean) => void
}

/** Para as telas da Rotina: se a madrugada está ligada e como ligá-la ou desligá-la. */
export function useMadrugada(): ControleDaMadrugada {
  const madrugada = useSyncExternalStore(assinar, ler, ler)
  return { madrugada, definir }
}

/**
 * Para o cabeçalho da casca: o estado da lua e o toque que a alterna. Só vale dentro da Rotina: fora dela
 * (na Conta, por exemplo) a lua não liga nada. Sair da Rotina desliga a madrugada e tira o `data-tema`.
 */
export function useLuaDaCasca(): { madrugada: boolean; alternar: () => void } {
  const dentro = useMatches().some((rota) => (rota.handle as { area?: unknown } | undefined)?.area === AREA_DA_ROTINA)
  const ligadaAgora = useSyncExternalStore(assinar, ler, ler)
  const madrugada = ligadaAgora && dentro

  useEffect(() => {
    if (!dentro) definir(false)
  }, [dentro])

  // Fechar a página (desmontar a casca) também joga o estado fora.
  useEffect(() => () => definir(false), [])

  useEffect(() => {
    if (!madrugada) return
    const raiz = document.documentElement
    raiz.setAttribute('data-tema', 'madrugada')
    return () => raiz.removeAttribute('data-tema')
  }, [madrugada])

  return {
    madrugada,
    alternar: () => {
      if (dentro) definir(!ligada)
    },
  }
}


