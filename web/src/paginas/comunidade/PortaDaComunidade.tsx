import { lazy, Suspense } from 'react'
import { Outlet } from 'react-router'
import { modoDados } from '../../dados/comum.ts'

// A porta das três telas de leitura da Comunidade (`/app/comunidade`, o espaço e o tópico). Sem as variáveis
// do banco (modo memória, a demonstração), quem não tem conta lê os tópicos de exemplo: sem guarda. Com o
// banco, vale a guarda de sempre (`/entrar?volta=...`). O modo é lido a cada render, e não na carga do módulo.
// A guarda é um pacote à parte: o modo demonstração não a baixa por esta porta.
const GuardaSessao = lazy(async () => ({ default: (await import('../../componentes/conta/guarda.tsx')).GuardaSessao }))

export function PortaDaComunidade() {
  if (modoDados() === 'memoria') return <Outlet />
  return (
    <Suspense fallback={null}>
      <GuardaSessao />
    </Suspense>
  )
}
