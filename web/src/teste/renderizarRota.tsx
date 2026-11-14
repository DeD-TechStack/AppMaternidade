import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ProvedorDadosConta } from '../componentes/conta/sessao.tsx'
import { ProvedorDadosRotina } from '../componentes/rotina/dadosRotina.tsx'
import { ProvedorDadosComunidade, type DadosComunidade } from '../dados/comunidade.ts'
import { criarRotas } from '../rotas.tsx'
import { criarMundoDeTeste, type Mundo, type OpcoesMundo } from './rotina.fixture.ts'

// Renderiza o site real num roteador em memória, no caminho pedido, com a conta e a rotina em memória já
// preenchidas pela fixture de teste (R38-33): a conta logada (padrão: Juliana), a madrugada ligada e o
// StrictMode são opções. Os dados vivem só no teste: nada vai para o navegador.

export interface OpcoesRota extends OpcoesMundo {
  /** Um mundo que o teste já montou (para guardar a rotina entre duas renderizações, por exemplo). */
  mundo?: Mundo
  /** Liga o modo madrugada na primeira tela. */
  madrugada?: boolean
  strict?: boolean
  /**
   * Uma Comunidade em memória que o teste montou (`criarComunidadeDeTeste`, em `teste/comunidade.fixture.ts`). Só
   * quando vem, a árvore ganha o `ProvedorDadosComunidade` entre a conta e a rotina; sem ela, a Comunidade usa a
   * instância global de demonstração, como sempre usou, e nada muda.
   */
  comunidade?: DadosComunidade
}

export function renderizarRota(caminho: string, opcoes: OpcoesRota = {}) {
  const mundo = opcoes.mundo ?? criarMundoDeTeste(opcoes)
  // O jsdom não implementa `window.scrollTo`: a rolagem ao topo vira um espião.
  vi.stubGlobal('scrollTo', vi.fn())

  const roteador = createMemoryRouter(criarRotas(), { initialEntries: [caminho] })
  // A ordem da árvore: conta → Comunidade (só se o teste deu uma) → rotina → roteador.
  const comRotina = (
    <ProvedorDadosRotina dados={mundo.rotina}>
      <RouterProvider router={roteador} />
    </ProvedorDadosRotina>
  )
  const arvore = (
    <ProvedorDadosConta dados={mundo.conta}>
      {opcoes.comunidade ? <ProvedorDadosComunidade dados={opcoes.comunidade}>{comRotina}</ProvedorDadosComunidade> : comRotina}
    </ProvedorDadosConta>
  )
  const resultado = render(opcoes.strict ? <StrictMode>{arvore}</StrictMode> : arvore)
  if (opcoes.madrugada) fireEvent.click(screen.getByRole('button', { name: 'Modo madrugada' }))
  return { ...resultado, roteador, ...mundo }
}

/**
 * Espera as leituras e escritas em curso terminarem, sem depender de temporizador (funciona com o relógio
 * falso): esvazia as microtarefas em alguns passos e continua enquanto houver `aria-busy="true"` na tela.
 */
export async function aguardarCarga(): Promise<void> {
  for (let passo = 0; passo < 200; passo++) {
    await act(async () => {
      await Promise.resolve()
    })
    if (passo >= 8 && document.querySelector('[aria-busy="true"]') === null) return
  }
  throw new Error('A tela não terminou de carregar.')
}

/** O mesmo que `renderizarRota`, depois de esperar a primeira carga. */
export async function renderizarRotaPronta(caminho: string, opcoes: OpcoesRota = {}) {
  const resultado = renderizarRota(caminho, opcoes)
  await aguardarCarga()
  return resultado
}
