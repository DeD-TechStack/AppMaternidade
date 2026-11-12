import { useMemo, type ReactNode } from 'react'
import { ProvedorDadosRotina, useDadosRotina } from '../componentes/rotina/dadosRotina.tsx'
import { criarDadosDesenvolvimento, type DadosDesenvolvimento } from './desenvolvimento.ts'
import type { DadosRotina } from './rotina.tipos.ts'

// O gancho e o provedor da área (DES-10). A `DadosRotina` é a da página: `criarDadosRotina(dadosConta)` escolhe
// Supabase ou memória e guarda a instância por conta de dados, a mesma durante a vida da página. O provedor deixa
// os testes injetarem a própria `DadosRotina` (a memória com a fixture de teste, ou uma falsa que grava as chamadas).

export function ProvedorDadosDesenvolvimento({ dados, children }: { dados: DadosRotina; children: ReactNode }) {
  return <ProvedorDadosRotina dados={dados}>{children}</ProvedorDadosRotina>
}

export function useDadosDesenvolvimento(): DadosDesenvolvimento {
  const rotina = useDadosRotina()
  return useMemo(() => criarDadosDesenvolvimento(rotina), [rotina])
}
