import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createClient } from '@supabase/supabase-js'
import { criarRotas } from '../rotas.tsx'
import { criarClienteFalso } from './renderizarComDados.tsx'
import { aguardarCarga } from './renderizarRota.tsx'

// NEW-B:RF-01. Nas páginas públicas, um aviso honesto só: o da demonstração (`[data-aviso]`). Nenhum
// parágrafo ou item de lista diz, só para dizer, que o site é protótipo, demonstração, versão de avaliação
// ou fictício. Fica de fora da conta: o próprio aviso, os textos fixos do contrato (TF) e o que é figura.

const falso = vi.hoisted(() => ({ cliente: null as unknown }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => falso.cliente) }))

/** O padrão N do cartão (sem diferenciar maiúsculas). */
const N =
  /protótipo|demonstraç|fictíci|versão de avaliação|fase de avaliação|em avaliação|em desenvolvimento|dados de exemplo|tela de exemplo|nada do que você registra|não (é|são) salv/i

/** Os dois textos fixos do contrato que entram como estão (TF.dadosFicticios e TF.regiaoDosDados). */
const PERMITIDOS = [
  'Nesta versão de avaliação, use só dados fictícios.',
  'Nesta fase de avaliação, a demonstração roda num projeto Supabase nos Estados Unidos (região us-east-1), só com dados fictícios.',
]

/** textos.ts:88, belongs to another card; remove when that card changes it. */
const FORA_DO_ESCOPO = [
  'Hoje o site é uma demonstração gratuita. O preço, se houver, ainda não foi definido, e nunca haverá anúncio feito com os dados da sua rotina.',
]

const ROTAS = [
  '/',
  '/como-funciona',
  '/cuidado-compartilhado',
  '/desenvolvimento',
  '/regras-da-comunidade',
  '/privacidade',
  '/termos',
  '/exclusao-de-conta',
  '/contato',
  '/sobre',
  '/rota-que-nao-existe',
  '/entrar',
  '/criar-conta',
  '/recuperar-acesso',
  '/redefinir-senha',
  '/convite',
  '/conta-excluida',
]

let rodada = 0

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  vi.mocked(createClient).mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function comBanco(ligado: boolean) {
  if (ligado) {
    rodada += 1
    vi.stubEnv('VITE_SUPABASE_URL', `https://aviso-${rodada}.invalid`)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', `chave-${rodada}`)
    falso.cliente = criarClienteFalso({ usuario: null }).cliente
  } else {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
  }
}

/** Os blocos de texto (`p`, `li`) que casam com N, fora de figura, do aviso e dos textos fixos. */
function avisosNoCorpo(container: HTMLElement): string[] {
  const achados: string[] = []
  for (const bloco of container.querySelectorAll('p, li')) {
    if (bloco.querySelector('p, li')) continue
    if (bloco.closest('figure') || bloco.closest('[data-aviso]') || bloco.hasAttribute('data-aviso')) continue
    const texto = (bloco.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (PERMITIDOS.includes(texto) || FORA_DO_ESCOPO.includes(texto)) continue
    if (N.test(texto)) achados.push(texto)
  }
  return achados
}

describe('um aviso só por página pública (NEW-B:RF-01)', () => {
  for (const [modo, ligado] of [
    ['sem banco', false],
    ['com banco', true],
  ] as const) {
    for (const caminho of ROTAS) {
      it(`${caminho} ${modo}: nenhum parágrafo ou item diz que é protótipo, demonstração ou avaliação`, async () => {
        comBanco(ligado)
        vi.stubGlobal('scrollTo', vi.fn())
        const roteador = createMemoryRouter(criarRotas(), { initialEntries: [caminho] })
        const { container } = render(<RouterProvider router={roteador} />)
        await aguardarCarga()
        expect(container.querySelector('main'), caminho).not.toBeNull()
        expect(avisosNoCorpo(container), caminho).toEqual([])
      })
    }
  }

  it('o filtro enxerga o que procura (controle negativo): um parágrafo de protótipo é achado, o do aviso não', () => {
    const { container } = render(
      <div>
        <p>O protótipo já mostra o nome.</p>
        <p data-aviso="demonstracao">Demonstração sem banco: nada do que você registra aqui é salvo.</p>
        <p>{PERMITIDOS[0]}</p>
        <figure>
          <p>Tela de exemplo</p>
        </figure>
      </div>,
    )
    expect(avisosNoCorpo(container)).toEqual(['O protótipo já mostra o nome.'])
  })
})
