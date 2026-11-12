import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { ProvedorDadosConta } from '../../componentes/conta/sessao.tsx'
import { ProvedorDadosComunidade, type DadosComunidade } from '../../dados/comunidade.ts'
import { ProvedorDadosModeracao, type DadosModeracao } from '../../dados/moderacao.ts'
import { criarRotas } from '../../rotas.tsx'

// O apoio dos testes das telas do painel de moderação: as rotas reais num roteador em memória, dentro do
// provedor de dados de conta (a sessão da MAT-37), do provedor da Comunidade (a leitura do conteúdo) e do
// provedor da moderação, todos com a memória que o teste monta. O teste cria a memória de conta, para
// deixar a pessoa entrada.

export { fixtureDeContasDoElenco } from '../comunidade/apoio.tsx'

type DadosDeConta = NonNullable<Parameters<typeof ProvedorDadosConta>[0]['dados']>

interface Opcoes {
  contas: DadosDeConta
  comunidade: DadosComunidade
  moderacao: DadosModeracao
  /** O subcaminho do site (`/AppMaternidade`): o caminho inicial vem com ele. */
  basename?: string
  /** O tema da madrugada: a casca aplica `data-tema="madrugada"` no `<html>`. */
  madrugada?: boolean
}

export function renderizarModeracao(caminho: string, { contas, comunidade, moderacao, basename, madrugada = false }: Opcoes) {
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
        <ProvedorDadosModeracao dados={moderacao}>
          <RouterProvider router={roteador} />
        </ProvedorDadosModeracao>
      </ProvedorDadosComunidade>
    </ProvedorDadosConta>,
  )
  return { ...resultado, roteador, rolarAoTopo }
}
