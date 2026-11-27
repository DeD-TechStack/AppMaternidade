import { createContext, useContext, type ReactNode } from 'react'
import { criarDadosRotina } from '../../dados/rotina.ts'
import type { DadosRotina } from '../../dados/rotina.tipos.ts'
import { useDadosConta } from '../conta/sessao.tsx'

// A instância de dados da rotina: a da página (`criarDadosRotina`, que escolhe Supabase ou memória) ou a
// que um teste injeta por cima do roteador, como o `ProvedorDadosConta` faz com a conta.

const ContextoDadosRotina = createContext<DadosRotina | null>(null)

export function ProvedorDadosRotina({ dados, children }: { dados: DadosRotina; children: ReactNode }) {
  return <ContextoDadosRotina value={dados}>{children}</ContextoDadosRotina>
}

export function useDadosRotina(): DadosRotina {
  const injetada = useContext(ContextoDadosRotina)
  const conta = useDadosConta()
  return injetada ?? criarDadosRotina(conta)
}
