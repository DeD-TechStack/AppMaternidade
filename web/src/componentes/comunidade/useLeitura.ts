import { useCallback, useEffect, useRef, useState } from 'react'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import type { Pagina } from '../../dados/comunidade.ts'

// A leitura de uma tela: carregando (com o esqueleto só depois de 300 ms), pronto ou erro. Uma leitura
// mais nova vale sobre a anterior, e a resposta de uma tela que já saiu do ar é descartada.

const ATRASO_DO_ESQUELETO = 300

/** O esqueleto só aparece se a leitura passar de 300 ms; antes disso, nada novo na tela. */
function useEsqueleto(carregando: boolean): boolean {
  const [passou, setPassou] = useState(false)
  useEffect(() => {
    if (!carregando) return
    const relogio = setTimeout(() => setPassou(true), ATRASO_DO_ESQUELETO)
    return () => {
      clearTimeout(relogio)
      setPassou(false)
    }
  }, [carregando])
  return carregando && passou
}

type EstadoDaLeitura<T> =
  | { fase: 'carregando' }
  | { fase: 'pronto'; valor: T }
  | { fase: 'erro'; erro: ErroDados }

export function useLeitura<T>(ler: () => Promise<Resultado<T>>, chave: string) {
  const [estado, setEstado] = useState<EstadoDaLeitura<T>>({ fase: 'carregando' })
  const lerAgora = useRef(ler)
  const geracao = useRef(0)
  const montada = useRef(true)

  useEffect(() => {
    lerAgora.current = ler
  })

  const executar = useCallback(async (silenciosa: boolean) => {
    geracao.current += 1
    const minha = geracao.current
    if (!silenciosa) setEstado({ fase: 'carregando' })
    const lida = await lerAgora.current()
    if (!montada.current || minha !== geracao.current) return
    setEstado(lida.ok ? { fase: 'pronto', valor: lida.valor } : { fase: 'erro', erro: lida.erro })
  }, [])

  // A leitura começa fora do corpo do efeito: o estado só muda quando a resposta chega.
  useEffect(() => {
    montada.current = true
    queueMicrotask(() => void executar(false))
    return () => {
      montada.current = false
    }
  }, [executar, chave])

  const recarregar = useCallback(() => executar(false), [executar])
  const reler = useCallback(() => executar(true), [executar])
  const esqueleto = useEsqueleto(estado.fase === 'carregando')

  /** `recarregar` é o "Tentar de novo" (volta ao carregando); `reler` não troca a tela (depois de uma escrita). */
  return { estado, esqueleto, recarregar, reler }
}

type EstadoDasPaginas<T> =
  | { fase: 'carregando' }
  | { fase: 'erro'; erro: ErroDados }
  | { fase: 'pronto'; itens: T[]; paginas: number; haMais: boolean; maisEmCurso: boolean; erroDaPagina: ErroDados | null }

/** Para quando a releitura já tem o que precisa: recebe o acumulado e quantas páginas foram lidas. */
type Parar<T> = (itens: T[], paginas: number) => boolean

/**
 * Uma lista em páginas: "Carregar mais" soma a página seguinte; `reler` refaz a lista desde a 1ª página,
 * página a página, até `parar` dizer que basta (ou acabarem as páginas).
 */
export function usePaginas<T extends { id: string }>(buscar: (pagina: number) => Promise<Resultado<Pagina<T>>>, chave: string) {
  const [estado, setEstado] = useState<EstadoDasPaginas<T>>({ fase: 'carregando' })
  const buscarAgora = useRef(buscar)
  const atual = useRef(estado)
  const geracao = useRef(0)
  const montada = useRef(true)

  useEffect(() => {
    buscarAgora.current = buscar
  })

  // O que as ações leem (`atual`) muda junto com o estado, e não só depois da renderização: um clique
  // logo em seguida já vê a lista nova.
  const definir = useCallback((proximo: EstadoDasPaginas<T>) => {
    atual.current = proximo
    setEstado(proximo)
  }, [])

  const lerDesdeOInicio = useCallback(async (parar: Parar<T>, silenciosa: boolean) => {
    geracao.current += 1
    const minha = geracao.current
    if (!silenciosa) definir({ fase: 'carregando' })
    let itens: T[] = []
    let pagina = 0
    let haMais = false
    for (;;) {
      const lida = await buscarAgora.current(pagina)
      if (!montada.current || minha !== geracao.current) return
      if (!lida.ok) return definir({ fase: 'erro', erro: lida.erro })
      itens = [...itens, ...lida.valor.itens]
      haMais = lida.valor.haMais
      pagina += 1
      if (!haMais || parar(itens, pagina)) break
    }
    definir({ fase: 'pronto', itens, paginas: pagina, haMais, maisEmCurso: false, erroDaPagina: null })
  }, [definir])

  useEffect(() => {
    montada.current = true
    queueMicrotask(() => void lerDesdeOInicio(() => true, false))
    return () => {
      montada.current = false
    }
  }, [lerDesdeOInicio, chave])

  const carregarMais = useCallback(async () => {
    const corrente = atual.current
    if (corrente.fase !== 'pronto' || corrente.maisEmCurso) return
    const minha = geracao.current
    definir({ ...corrente, maisEmCurso: true, erroDaPagina: null })
    const lida = await buscarAgora.current(corrente.paginas)
    if (!montada.current || minha !== geracao.current) return
    if (!lida.ok) return definir({ ...corrente, maisEmCurso: false, erroDaPagina: lida.erro })
    const conhecidos = new Set(corrente.itens.map((item) => item.id))
    definir({
      fase: 'pronto',
      itens: [...corrente.itens, ...lida.valor.itens.filter((item) => !conhecidos.has(item.id))],
      paginas: corrente.paginas + 1,
      haMais: lida.valor.haMais,
      maisEmCurso: false,
      erroDaPagina: null,
    })
  }, [definir])

  const recarregar = useCallback(() => lerDesdeOInicio(() => true, false), [lerDesdeOInicio])
  /** Relê, sem trocar a lista pelo carregando, até `parar` (por padrão, as páginas que já estavam lidas). */
  const reler = useCallback(
    (parar?: Parar<T>) => {
      const lidas = atual.current.fase === 'pronto' ? atual.current.paginas : 1
      return lerDesdeOInicio(parar ?? ((_, paginas) => paginas >= lidas), true)
    },
    [lerDesdeOInicio],
  )
  const esqueleto = useEsqueleto(estado.fase === 'carregando')

  return { estado, esqueleto, carregarMais, recarregar, reler }
}
