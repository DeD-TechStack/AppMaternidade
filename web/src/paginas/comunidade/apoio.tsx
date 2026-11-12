import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { ProvedorDadosConta } from '../../componentes/conta/sessao.tsx'
import { ELENCO } from '../../dados/comunidade.elenco.ts'
import { ProvedorDadosComunidade, type DadosComunidade } from '../../dados/comunidade.ts'
import { criarRotas } from '../../rotas.tsx'
import type { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'

// O apoio dos testes das telas da Comunidade: as rotas reais num roteador em memória, dentro do
// provedor de dados de conta (a sessão da MAT-37) e do provedor de dados da Comunidade, os dois com a
// memória que o teste monta. O teste cria a memória de conta, para deixar a pessoa entrada.

type FixtureDeConta = ReturnType<typeof criarFixtureDeTeste>
type DadosDeConta = NonNullable<Parameters<typeof ProvedorDadosConta>[0]['dados']>

/** A fixture de conta do teste, com as nove contas do elenco (o mesmo id e um e-mail por pessoa). */
export function fixtureDeContasDoElenco(base: FixtureDeConta): FixtureDeConta {
  const pessoas = Object.values(ELENCO)
  const criadaEm = new Date(Date.now() - 86_400_000).toISOString()
  return {
    ...base,
    usuarios: [...base.usuarios, ...pessoas.map((p) => ({ id: p.conta, email: p.email, senha: 'senha-de-teste', nomeMetadados: null }))],
    contas: [...base.contas, ...pessoas.map((p) => ({ id: p.conta, nome: p.email.split('@')[0], fuso: 'America/Sao_Paulo', criadaEm }))],
  }
}

interface Opcoes {
  contas: DadosDeConta
  comunidade: DadosComunidade
  /** O subcaminho do site (`/AppMaternidade`): o caminho inicial vem com ele. */
  basename?: string
  /** O tema da madrugada: a casca aplica `data-tema="madrugada"` no `<html>`. */
  madrugada?: boolean
}

export function renderizarComunidade(caminho: string, { contas, comunidade, basename, madrugada = false }: Opcoes) {
  // O jsdom não implementa `window.scrollTo`: a rolagem ao topo vira um espião.
  const rolarAoTopo = vi.fn()
  vi.stubGlobal('scrollTo', rolarAoTopo)
  if (madrugada) document.documentElement.setAttribute('data-tema', 'madrugada')
  const roteador = createMemoryRouter(criarRotas(), {
    initialEntries: [basename ? `${basename}${caminho}` : caminho],
    basename,
  })
  const resultado = render(
    <ProvedorDadosConta dados={contas}>
      <ProvedorDadosComunidade dados={comunidade}>
        <RouterProvider router={roteador} />
      </ProvedorDadosComunidade>
    </ProvedorDadosConta>,
  )
  return { ...resultado, roteador, rolarAoTopo }
}
