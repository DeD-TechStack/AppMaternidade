import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { podeAlterarItem, type ContextoRotina } from '../../dados/rotina.tipos.ts'
import {
  ContextoDaRotina,
  type BebeAtivo,
  type ConfirmacaoDaRotina,
  type NovaConfirmacao,
  type ValorRotina,
} from '../rotina/contexto.ts'
import { nomeDoAutor } from '../rotina/formatos.ts'
import type { MotorDemo } from './motorDemo.ts'

// Adaptador fino que fornece `ContextoDaRotina` para os componentes reais da rotina
// (FormularioNota, BarraRegistroRapido, useAcoesDaRotina, useSecao) sobre o motor privado da demo,
// sem ProvedorSessao, sem localStorage/sessionStorage, sem <main> e sem alterar document.title.

interface ExtraDemo {
  motor: MotorDemo
  pessoaAtiva: 'juliana' | 'icaro'
  trocarPessoa: (pessoa: 'juliana' | 'icaro') => void
}

const ContextoExtraDemo = createContext<ExtraDemo | null>(null)

export function useExtraDemo(): ExtraDemo {
  const valor = useContext(ContextoExtraDemo)
  if (!valor) throw new Error('useExtraDemo precisa estar dentro de ProvedorDemoRotina')
  return valor
}

interface Props {
  motor: MotorDemo
  pessoaInicial: 'juliana' | 'icaro'
  children: ReactNode
}

export function ProvedorDemoRotina({ motor, pessoaInicial, children }: Props) {
  const [contexto, setContexto] = useState<ContextoRotina | null>(null)
  const [versao, setVersao] = useState(0)
  const [pessoaAtiva, setPessoaAtiva] = useState<'juliana' | 'icaro'>(pessoaInicial)
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoDaRotina | null>(null)
  const pedido = useRef(0)

  const atualizar = useCallback(() => setVersao((anterior) => anterior + 1), [])

  const trocarPessoa = useCallback(
    (nova: 'juliana' | 'icaro') => {
      motor.conta.sessaoParaTeste(motor.pessoas[nova].email)
      setPessoaAtiva(nova)
      setConfirmacao(null)
      setVersao((anterior) => anterior + 1)
    },
    [motor],
  )

  useEffect(() => {
    pedido.current += 1
    const meu = pedido.current
    void motor.rotina.contexto().then((lido) => {
      if (meu !== pedido.current || !lido.ok) return
      setContexto(lido.valor)
    })
  }, [motor, versao])

  const mostrarConfirmacao = useCallback((nova: NovaConfirmacao) => {
    setConfirmacao((anterior) => ({ id: (anterior?.id ?? 0) + 1, ...nova }))
  }, [])
  const fecharConfirmacao = useCallback(() => setConfirmacao(null), [])

  const ativo = useMemo<BebeAtivo | null>(() => {
    if (!contexto) return null
    const familia = contexto.familias.find((f) => f.id === motor.familiaId) ?? contexto.familias[0]
    if (!familia) return null
    const bebe = familia.bebes.find((b) => b.id === motor.bebeId) ?? familia.bebes[0]
    if (!bebe) return null
    return { bebe, familia, papel: familia.meuPapel, arquivado: bebe.estado === 'arquivado' }
  }, [contexto, motor.familiaId, motor.bebeId])

  const valor = useMemo<ValorRotina | null>(() => {
    if (!contexto || !ativo) return null
    return {
      dados: motor.rotina,
      contaId: contexto.contaId,
      contexto,
      situacao: 'bebe',
      ativo,
      bebes: [ativo],
      acessoPerdido: false,
      versao,
      atualizar,
      escolherBebe: () => undefined,
      podeAlterar: ({ criadoPor, familiaId, bebeId }) => {
        const familia = contexto.familias.find((c) => c.id === familiaId)
        if (!familia) return false
        const bebe = bebeId === null ? undefined : familia.bebes.find((c) => c.id === bebeId)
        if (bebe?.estado === 'arquivado') return false
        return podeAlterarItem(familia.meuPapel, criadoPor, contexto.contaId)
      },
      nomeDoAutor: (autor, familiaId) => nomeDoAutor(contexto.familias.find((f) => f.id === familiaId), autor),
      confirmacao,
      mostrarConfirmacao,
      fecharConfirmacao,
    }
  }, [contexto, ativo, motor.rotina, versao, atualizar, confirmacao, mostrarConfirmacao, fecharConfirmacao])

  const extra = useMemo<ExtraDemo>(
    () => ({ motor, pessoaAtiva, trocarPessoa }),
    [motor, pessoaAtiva, trocarPessoa],
  )

  if (!valor) return null

  return (
    <ContextoExtraDemo value={extra}>
      <ContextoDaRotina value={valor}>{children}</ContextoDaRotina>
    </ContextoExtraDemo>
  )
}
