import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createClient } from '@supabase/supabase-js'
import { TEXTO_APOIO_CONTATO, TEXTO_QUEM_PODE_USAR, TEXTO_SEUS_DIREITOS } from '../conteudo/publicas-texto.ts'
import { criarRotasProntas } from './rotasProntas.ts'
import { criarClienteFalso } from './renderizarComDados.tsx'
import { aguardarCarga } from './renderizarRota.tsx'

// NEW-B:RF-01. Nas páginas públicas, um aviso honesto só: o da demonstração, no rodapé. Nenhum parágrafo ou item
// de lista diz, só para dizer, que o site é protótipo, demonstração, versão de avaliação ou fictício. Fica de fora
// da conta só: o aviso do rodapé (`footer[data-rodape] [data-aviso]`), os textos fixos do contrato (TF) e o que é
// figura. Nada mais é isento: um `data-aviso` no corpo conta, e o texto próprio de um `li` com filhos conta.

const falso = vi.hoisted(() => ({ cliente: null as unknown }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => falso.cliente) }))

/** O padrão N do cartão (sem diferenciar maiúsculas). */
const N =
  /protótipo|demonstraç|fictíci|versão de avaliação|fase de avaliação|em avaliação|em desenvolvimento|dados de exemplo|tela de exemplo|nada do que você registra|não (é|são) salv/i

/** Os dois textos fixos do contrato que entram como estão (TF.dadosFicticios e TF.regiaoDosDados). */
const PERMITIDOS = [
  'Nesta versão de avaliação, use só dados fictícios.',
  'Nesta fase de avaliação, a demonstração roda num projeto Supabase nos Estados Unidos (região us-east-1), só com dados fictícios.',
  // Daniel 18/11, STRINGS.md A3/A7/A8 (LEGAL-D54a)
  TEXTO_QUEM_PODE_USAR,
  TEXTO_APOIO_CONTATO,
  TEXTO_SEUS_DIREITOS,
]

/** O aviso honesto único: o da demonstração, dentro do rodapé. */
const AVISO_DO_RODAPE = 'footer[data-rodape] [data-aviso]'

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

const normalizar = (t: string | null) => (t ?? '').replace(/\s+/g, ' ').trim()

/** O texto próprio do bloco: o que sobra depois de tirar os `p` e `li` aninhados. */
function textoProprio(bloco: Element): string {
  const copia = bloco.cloneNode(true) as Element
  for (const filho of copia.querySelectorAll('p, li')) filho.remove()
  return normalizar(copia.textContent)
}

/** Os blocos de texto (`p`, `li`) que casam com N, fora de figura, do aviso do rodapé e dos textos fixos. */
function avisosNoCorpo(container: HTMLElement): string[] {
  const achados: string[] = []
  for (const bloco of container.querySelectorAll('p, li')) {
    if (bloco.closest('figure') || bloco.closest(AVISO_DO_RODAPE)) continue
    const texto = textoProprio(bloco)
    if (PERMITIDOS.includes(texto)) continue
    if (N.test(texto)) achados.push(texto)
  }
  return achados
}

/**
 * O aviso do banco de /criar-conta e /entrar vive num `span` fora de `p`/`li`: este ajudante também olha os
 * `span` com `data-aviso` fora do rodapé, para que o aviso extra não fuja da conta.
 */
function avisosExtras(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-aviso]')]
    .filter((no) => !no.closest(AVISO_DO_RODAPE) && !no.closest('figure'))
    .map((no) => normalizar(no.textContent))
    .filter((texto) => N.test(texto) && !PERMITIDOS.includes(texto))
}

function renderizar(caminho: string, ligado: boolean) {
  comBanco(ligado)
  vi.stubGlobal('scrollTo', vi.fn())
  const roteador = createMemoryRouter(criarRotasProntas(), { initialEntries: [caminho] })
  return render(<RouterProvider router={roteador} />)
}

const MODOS = [
  ['sem banco', false],
  ['com banco', true],
] as const

describe('um aviso só por página pública (NEW-B:RF-01)', () => {
  for (const [modo, ligado] of MODOS) {
    for (const caminho of ROTAS) {
      it(`${caminho} ${modo}: nenhum parágrafo ou item diz que é protótipo, demonstração ou avaliação`, async () => {
        const { container } = renderizar(caminho, ligado)
        await aguardarCarga()
        expect(container.querySelector('main'), caminho).not.toBeNull()
        expect(avisosNoCorpo(container), caminho).toEqual([])
        expect(avisosExtras(container), caminho).toEqual([])
      })
    }
  }
})

describe('o filtro enxerga o que procura (controles negativos do RF-01)', () => {
  it('um parágrafo de protótipo é achado; o aviso do rodapé, o texto fixo e a figura não', () => {
    const { container } = render(
      <div>
        <p>O protótipo já mostra o nome.</p>
        <footer data-rodape="">
          <p data-aviso="demonstracao">Demonstração sem banco: nada do que você registra aqui é salvo.</p>
        </footer>
        <p>{PERMITIDOS[0]}</p>
        <figure>
          <p>Tela de exemplo</p>
        </figure>
      </div>,
    )
    expect(avisosNoCorpo(container)).toEqual(['O protótipo já mostra o nome.'])
    expect(avisosExtras(container)).toEqual([])
  })

  it('um data-aviso fora do rodapé é achado (a isenção é só do aviso do rodapé)', () => {
    const { container } = render(
      <div>
        <p data-aviso="demonstracao">Este site é uma demonstração.</p>
        <span data-aviso="banco">Este site é uma demonstração com banco de teste.</span>
      </div>,
    )
    expect(avisosNoCorpo(container)).toEqual(['Este site é uma demonstração.'])
    expect(avisosExtras(container)).toEqual(['Este site é uma demonstração.', 'Este site é uma demonstração com banco de teste.'])
  })

  it('o texto próprio de um item de lista com filhos é achado, e o filho também', () => {
    const { container } = render(
      <ul>
        <li>
          Versão de avaliação em desenvolvimento.
          <ul>
            <li>Outro item de protótipo.</li>
          </ul>
        </li>
      </ul>,
    )
    expect(avisosNoCorpo(container)).toEqual(['Versão de avaliação em desenvolvimento.', 'Outro item de protótipo.'])
  })

  it('um item de lista com filhos limpos e texto próprio limpo não é achado', () => {
    const { container } = render(
      <ul>
        <li>
          Passos do cuidado.
          <ul>
            <li>Registrar a mamada.</li>
          </ul>
        </li>
      </ul>,
    )
    expect(avisosNoCorpo(container)).toEqual([])
  })

  it('só o texto fixo exato é permitido: o mesmo texto com um acréscimo é achado', () => {
    const { container } = render(<p>{PERMITIDOS[0]} O protótipo avisa.</p>)
    expect(avisosNoCorpo(container)).toHaveLength(1)
  })

  it('LEGA-I-13 uma quarta frase com "fictício" em /contato continua sendo achada', () => {
    const quarta = render(<p>Este endereço de e-mail é fictício e ninguém responde.</p>)
    expect(avisosNoCorpo(quarta.container)).toHaveLength(1)
    quarta.unmount()
    const a7 = render(<p>{TEXTO_APOIO_CONTATO}</p>)
    expect(avisosNoCorpo(a7.container)).toEqual([])
  })

  it('a FAQ de preço com a oração de status é achada; só com o fato, não', () => {
    const suja = render(<p>Hoje o site é uma demonstração gratuita. O preço, se houver, ainda não foi definido.</p>)
    expect(avisosNoCorpo(suja.container)).toHaveLength(1)
    suja.unmount()
    const limpa = render(<p>O preço, se houver, ainda não foi definido, e nunca haverá anúncio feito com os dados da sua rotina.</p>)
    expect(avisosNoCorpo(limpa.container)).toEqual([])
  })
})
