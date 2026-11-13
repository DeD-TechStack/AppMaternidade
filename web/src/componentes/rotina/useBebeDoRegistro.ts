import { useEffect } from 'react'
import type { Registro } from '../../dados/rotina.tipos.ts'
import { useRotina } from './contexto.ts'

/**
 * Abrir por link um registro de outro bebê visível troca o bebê ativo para o dele (R38-03, item 1). Devolve o
 * bebê dono do registro (ou o ativo, enquanto o registro não chegou).
 */
export function useBebeDoRegistro(registro: Registro | null) {
  const { ativo, bebes, escolherBebe } = useRotina()
  const bebeDoRegistro = registro?.bebeId ?? null
  const bebeAtivoId = ativo?.bebe.id ?? null
  useEffect(() => {
    if (bebeDoRegistro !== null && bebeDoRegistro !== bebeAtivoId && bebes.some((candidato) => candidato.bebe.id === bebeDoRegistro)) {
      escolherBebe(bebeDoRegistro)
    }
  }, [bebeDoRegistro, bebeAtivoId, bebes, escolherBebe])
  return (registro ? bebes.find((candidato) => candidato.bebe.id === registro.bebeId) : undefined) ?? ativo
}
