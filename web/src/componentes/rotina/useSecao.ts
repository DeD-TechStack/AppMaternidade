import { useCallback, useEffect, useRef, useState } from 'react'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import { useRotina } from './contexto.ts'

// Uma seção do Hoje ou da Sessão: a própria leitura, o próprio erro (a falha de uma não derruba as
// outras) e os dados anteriores guardados quando uma releitura falha. Cada leitura leva o bebê e um
// número de pedido: a resposta de um bebê que deixou de ser o ativo, ou de um pedido mais velho que o
// último da mesma seção, é descartada (R38-02). Relê a cada `versao` do provedor e no `recarregar`.

export interface Secao<T> {
  estado: 'carregando' | 'pronto' | 'erro'
  dados: T | null
  erro: ErroDados | null
  /** O instante (ms) da última leitura que deu certo. */
  lidoEm: number | null
  recarregar: () => void
}

interface Carga<T> {
  bebe: string | null
  dados: T | null
  erro: ErroDados | null
  lidoEm: number | null
}

const vazia = <T,>(bebe: string | null): Carga<T> => ({ bebe, dados: null, erro: null, lidoEm: null })

export function useSecao<T>(bebe: string | null, carregar: (bebe: string) => Promise<Resultado<T>>): Secao<T> {
  const { versao } = useRotina()
  const [carga, setCarga] = useState<Carga<T>>(() => vazia<T>(bebe))
  const [tentativa, setTentativa] = useState(0)
  const carregarAtual = useRef(carregar)
  const bebeAtual = useRef(bebe)
  const pedido = useRef(0)

  // Trocar de bebê recomeça a seção vazia, antes de qualquer renderização com os dados do anterior.
  if (carga.bebe !== bebe) setCarga(vazia<T>(bebe))
  const vigente = carga.bebe === bebe ? carga : vazia<T>(bebe)

  useEffect(() => {
    carregarAtual.current = carregar
    bebeAtual.current = bebe
  })

  useEffect(() => {
    if (bebe === null) return
    // A leitura começa fora do corpo do efeito: o estado só muda quando a resposta chega.
    queueMicrotask(() => {
      pedido.current += 1
      const meu = pedido.current
      void carregarAtual.current(bebe).then((resultado) => {
        if (meu !== pedido.current || bebeAtual.current !== bebe) return
        const agora = Date.now()
        setCarga((anterior) =>
          resultado.ok
            ? { bebe, dados: resultado.valor, erro: null, lidoEm: agora }
            : { bebe, dados: anterior.bebe === bebe ? anterior.dados : null, erro: resultado.erro, lidoEm: anterior.lidoEm },
        )
      })
    })
  }, [bebe, versao, tentativa])

  const recarregar = useCallback(() => setTentativa((anterior) => anterior + 1), [])

  const estado = vigente.dados !== null ? 'pronto' : vigente.erro !== null ? 'erro' : 'carregando'
  return { estado, dados: vigente.dados, erro: vigente.erro, lidoEm: vigente.lidoEm, recarregar }
}
