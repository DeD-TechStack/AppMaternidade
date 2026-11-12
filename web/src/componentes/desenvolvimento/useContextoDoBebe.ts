import { useCallback, useEffect, useRef, useState } from 'react'
import { fusoValido, type Papel } from '../../dados/comum.ts'
import type { Bebe, FamiliaResumo } from '../../dados/conta.ts'
import { useDadosConta, useFamiliaAtual } from '../conta/sessao.tsx'

// O contexto da página (DES-09, estados 1 a 4 e 2b): a família atual e os bebês dela, lidos pela camada de
// conta da MAT-37 (`useFamiliaAtual` e `detalheFamilia`), o bebê da tela (glossário) e o instante de hoje,
// que só se renova a cada leitura e quando a aba volta a ficar visível (P25).

export type ContextoDoBebe =
  | { fase: 'carregando'; agora: number }
  | { fase: 'erro'; agora: number; recarregar: () => Promise<void> }
  | { fase: 'fuso_invalido'; agora: number; familia: FamiliaResumo }
  | { fase: 'sem_familia'; agora: number }
  | { fase: 'sem_bebe'; agora: number; familia: FamiliaResumo }
  | {
      fase: 'pronto'
      agora: number
      familia: FamiliaResumo
      /** Os bebês da família: os ativos primeiro, os arquivados depois, cada grupo por nome. */
      bebes: readonly Bebe[]
      bebe: Bebe
      papel: Papel
      escolher: (id: string) => void
    }

interface Leitura {
  familiaId: string
  estado: 'pronto' | 'erro'
  bebes: Bebe[]
}

const coletor = new Intl.Collator('pt-BR', { sensitivity: 'base' })
const comparar = (a: string, b: string) => coletor.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0)

/** A lista do glossário: `ativo` antes de `arquivado`, cada grupo por nome (pt-BR, sem diferença de maiúscula) e id. */
function ordenarBebes(bebes: readonly Bebe[]): Bebe[] {
  const grupo = (bebe: Bebe) => (bebe.estado === 'arquivado' ? 1 : 0)
  return [...bebes].sort((a, b) => grupo(a) - grupo(b) || comparar(a.nome, b.nome) || comparar(a.id, b.id))
}

export function useContextoDoBebe(): ContextoDoBebe {
  const dados = useDadosConta()
  const { estado: estadoDaFamilia, atual, recarregar: recarregarFamilias } = useFamiliaAtual()
  const [leitura, setLeitura] = useState<Leitura | null>(null)
  const [escolha, setEscolha] = useState<{ familiaId: string; bebeId: string } | null>(null)
  const [agora, setAgora] = useState(Date.now)
  const pedido = useRef(0)
  const familiaId = atual?.id ?? null

  // Só a resposta da leitura mais nova vale: trocar de família ou reler descarta a anterior.
  const ler = useCallback(
    async (id: string) => {
      pedido.current += 1
      const meu = pedido.current
      const lido = await dados.detalheFamilia(id)
      if (meu !== pedido.current) return
      setLeitura(lido.ok ? { familiaId: id, estado: 'pronto', bebes: lido.valor.bebes } : { familiaId: id, estado: 'erro', bebes: [] })
      setAgora(Date.now())
    },
    [dados],
  )

  // A leitura começa fora do corpo do efeito: o estado só muda quando a resposta chega.
  useEffect(() => {
    if (!familiaId) {
      pedido.current += 1
      return
    }
    queueMicrotask(() => void ler(familiaId))
  }, [familiaId, ler])

  useEffect(() => {
    function aoVoltar() {
      if (document.visibilityState === 'visible') setAgora(Date.now())
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [])

  const recarregar = useCallback(async () => {
    setAgora(Date.now())
    await recarregarFamilias()
    if (familiaId) await ler(familiaId)
  }, [recarregarFamilias, familiaId, ler])

  const escolher = useCallback(
    (id: string) => {
      if (familiaId) setEscolha({ familiaId, bebeId: id })
    },
    [familiaId],
  )

  if (estadoDaFamilia === 'carregando') return { fase: 'carregando', agora }
  if (estadoDaFamilia === 'erro') return { fase: 'erro', agora, recarregar }
  if (!atual) return { fase: 'sem_familia', agora }
  if (leitura === null || leitura.familiaId !== atual.id) return { fase: 'carregando', agora }
  if (leitura.estado === 'erro') return { fase: 'erro', agora, recarregar }
  if (!fusoValido(atual.fuso)) return { fase: 'fuso_invalido', agora, familia: atual }

  const bebes = ordenarBebes(leitura.bebes)
  if (bebes.length === 0) return { fase: 'sem_bebe', agora, familia: atual }
  const escolhido = escolha && escolha.familiaId === atual.id ? bebes.find((bebe) => bebe.id === escolha.bebeId) : undefined
  return { fase: 'pronto', agora, familia: atual, bebes, bebe: escolhido ?? bebes[0], papel: atual.meuPapel, escolher }
}
