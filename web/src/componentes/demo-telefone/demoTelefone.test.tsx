import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rodarAxe } from '../../teste/axe.ts'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import { TelefoneDemo, type FluxoDemoTelefone } from './TelefoneDemo.tsx'

// Testes de comportamento, teclado, `inert` (incluindo recorte parcial), carga/falha, determinismo e acessibilidade.

const MATCHMEDIA_ORIGINAL = window.matchMedia
const CSS_ORIGINAL = globalThis.CSS

function montarFluxo(fluxo: FluxoDemoTelefone) {
  const roteador = createMemoryRouter(
    [{ path: '/', element: <TelefoneDemo fluxo={fluxo} /> }],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={roteador} />)
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: MATCHMEDIA_ORIGINAL })
  Object.defineProperty(globalThis, 'CSS', { configurable: true, writable: true, value: CSS_ORIGINAL })
  document.documentElement.removeAttribute('data-tema')
})

describe('fluxos interativos da demo no telefone', () => {
  it('fluxo 1 (Histórico): registra fralda pela barra rápida, aparece no topo com autor e hora, desfaz e reinicia', async () => {
    montarFluxo('historico')
    fireEvent.click(screen.getByRole('button', { name: 'Experimentar Histórico' }))
    const painel = await screen.findByRole('group', { name: 'Tela interativa do Histórico' })

    const lista = await waitFor(() => {
      const ul = painel.querySelector('[data-dt-lista-historico]')
      expect(ul).not.toBeNull()
      expect(ul!.querySelectorAll('li').length).toBe(11)
      return ul!
    })
    expect(lista.querySelector('li')!.textContent).toContain('17:30')
    expect(lista.querySelector('li')!.textContent).toContain('por Ícaro')

    fireEvent.click(within(painel).getByRole('button', { name: /Registrar fralda de Heloísa/i }))
    fireEvent.click(within(painel).getByRole('button', { name: 'Cocô' }))

    await waitFor(() => {
      const itens = painel.querySelectorAll('[data-dt-lista-historico] li')
      expect(itens).toHaveLength(12)
      expect(itens[0].textContent).toContain('17:36')
      expect(itens[0].textContent).toContain('Cocô')
      expect(itens[0].textContent).toContain('por Ícaro')
    })

    fireEvent.click(within(painel).getByRole('button', { name: /Iniciar mamada de Heloísa/i }))
    await waitFor(() => {
      const itens = painel.querySelectorAll('[data-dt-lista-historico] li')
      expect(itens).toHaveLength(13)
      expect(itens[0].textContent).toContain('17:37')
      expect(itens[0].textContent).toContain('Mamada')
      expect(itens[0].textContent).toContain('por Ícaro')
    })

    fireEvent.click(within(painel).getByRole('button', { name: 'Desfazer' }))
    await waitFor(() => {
      expect(painel.querySelectorAll('[data-dt-lista-historico] li')).toHaveLength(12)
    })

    fireEvent.click(within(painel).getByRole('button', { name: /Reiniciar/ }))
    await waitFor(() => {
      expect(painel.querySelectorAll('[data-dt-lista-historico] li')).toHaveLength(11)
    })
  })

  it('fluxo 2 (Hoje à noite): mantém madrugada local sem tocar no html, encerra sono e atualiza o total do dia, e inicia novo sono', async () => {
    montarFluxo('hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Experimentar Hoje à noite' }))
    const painel = await screen.findByRole('group', { name: 'Tela interativa de Hoje à noite' })

    expect(painel.getAttribute('data-tema-local')).toBe('madrugada')
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)

    await within(painel).findByText(/Início às 20:30/)
    const lerSonoTotal = () => {
      const resumo = painel.querySelector('[data-resumo]')!
      const itens = [...resumo.querySelectorAll('li')]
      const celulaSono = itens.find((li) => li.textContent?.includes('Sono concluído'))
      return celulaSono?.querySelector('[data-numero-do-dia]')?.textContent?.trim()
    }
    expect(lerSonoTotal()).toBe('6 h 35')

    fireEvent.click(within(painel).getByRole('button', { name: 'Encerrar' }))
    await within(painel).findByText('Nenhuma sessão em andamento.')
    await waitFor(() => expect(lerSonoTotal()).toBe('7 h 47'))

    fireEvent.click(within(painel).getByRole('button', { name: /Iniciar sono de Heloísa/i }))
    await within(painel).findByRole('button', { name: 'Encerrar' })
    fireEvent.click(within(painel).getByRole('button', { name: 'Encerrar' }))
    await waitFor(() => expect(lerSonoTotal()).toBe('8 h 02'))
    expect(painel.getAttribute('data-tema-local')).toBe('madrugada')
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)
  })

  it('fluxo 3 (Cuidado compartilhado): alterna entre Juliana e Ícaro e atualiza membros e "Desde o seu último registro"', async () => {
    montarFluxo('familia')
    fireEvent.click(screen.getByRole('button', { name: 'Experimentar Cuidado compartilhado' }))
    const painel = await screen.findByRole('group', { name: 'Tela interativa de Cuidado compartilhado' })

    await waitFor(() => expect(painel.querySelector('[data-dt-papel-ativo]')?.textContent).toMatch(/responsável/i))
    await within(painel).findByText(/Desde o seu último registro, às 16:20/i)
    expect(within(painel).getAllByText(/por Ícaro/i).length).toBeGreaterThanOrEqual(1)

    fireEvent.click(within(painel).getByRole('button', { name: 'Ícaro' }))
    await waitFor(() => expect(painel.querySelector('[data-dt-papel-ativo]')?.textContent).toMatch(/cuidador/i))
    await within(painel).findByText(/Desde o seu último registro, às 18:05/i)
    await within(painel).findByText(/Nada novo desde o seu último registro\./i)

    fireEvent.click(within(painel).getByRole('button', { name: /Anotar fralda como Ícaro/i }))
    await within(painel).findByText(/Fralda anotada por Ícaro/i)
    fireEvent.click(within(painel).getByRole('button', { name: 'Juliana' }))
    await within(painel).findByText(/Desde o seu último registro, às 16:20/i)
    expect(within(painel).getAllByText(/Fralda, Xixi/i).length).toBeGreaterThanOrEqual(2)
  })

  it('fluxo 4 (Notas): usa o relógio da demo para destaque mesmo com relógio real distante e mantém várias notas em ordem mais-nova-primeiro', async () => {
    // Simula um aparelho com relógio em 2025 (muito antes da âncora de 18/11/2026).
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2025-01-10T10:00:00Z'))

    montarFluxo('notas')
    fireEvent.click(screen.getByRole('button', { name: 'Experimentar Notas' }))
    const painel = await screen.findByRole('group', { name: 'Tela interativa de Notas' })

    await within(painel).findByText('Pomada só à noite.')
    await within(painel).findByText('Fraldas P no armário de cima.')

    // Nota 1 com destaque de 12 h: precisa continuar destacada mesmo com Date.now() em 2025.
    fireEvent.click(within(painel).getByRole('button', { name: /Nova nota/i }))
    fireEvent.change(await within(painel).findByRole('textbox'), { target: { value: 'Pediatra na sexta às 10h.' } })
    fireEvent.change(within(painel).getByRole('combobox', { name: /Destaque/i }), { target: { value: '12h' } })
    fireEvent.click(within(painel).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      const itens = painel.querySelectorAll('[data-dt-lista-notas] li')
      expect(itens).toHaveLength(3)
      expect(itens[0].textContent).toContain('Pediatra na sexta às 10h.')
      // Parágrafo em destaque recebe a classe de destaque (`bg-(--cor-papel-fundo)`).
      expect(itens[0].querySelector('p')?.className).toContain('bg-(--cor-papel-fundo)')
    })

    // Nota 2 salva logo em seguida entra estritamente acima da Nota 1 (ordem mais-nova-primeiro determinística).
    fireEvent.click(within(painel).getByRole('button', { name: /Nova nota/i }))
    fireEvent.change(await within(painel).findByRole('textbox'), { target: { value: 'Levar caderneta de vacina.' } })
    fireEvent.click(within(painel).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      const itens = painel.querySelectorAll('[data-dt-lista-notas] li')
      expect(itens).toHaveLength(4)
      expect(itens[0].textContent).toContain('Levar caderneta de vacina.')
      expect(itens[1].textContent).toContain('Pediatra na sexta às 10h.')
    })
  })
})

describe('teclado, carga/erro, inert em recorte parcial, movimento reduzido e acessibilidade', () => {
  it('Escape fecha primeiro o menu local de escolhas e sai da prévia mesmo quando há confirmação visível', async () => {
    montarFluxo('historico')
    fireEvent.click(screen.getByRole('button', { name: 'Experimentar Histórico' }))
    const painel = await screen.findByRole('group', { name: 'Tela interativa do Histórico' })

    // Abre menu local de escolhas da fralda -> 1º Escape fecha só o menu e mantém a prévia aberta.
    const botaoFralda = await within(painel).findByRole('button', { name: /Registrar fralda de Heloísa/i })
    fireEvent.click(botaoFralda)
    expect(within(painel).getByRole('button', { name: 'Cocô' })).toBeTruthy()
    fireEvent.keyDown(painel, { key: 'Escape' })
    expect(screen.getByRole('group', { name: 'Tela interativa do Histórico' })).toBeTruthy()
    await waitFor(() => expect(within(painel).queryByRole('button', { name: 'Cocô' })).toBeNull())

    // Grava fralda para deixar apenas a confirmação aberta (sem menu de escolhas) -> Escape sai e devolve o foco.
    fireEvent.click(botaoFralda)
    fireEvent.click(within(painel).getByRole('button', { name: 'Cocô' }))
    await within(painel).findByText(/Fralda registrada: Cocô/i)

    fireEvent.keyDown(painel, { key: 'Escape' })
    const gatilhoDeVolta = await screen.findByRole('button', { name: 'Experimentar Histórico' })
    expect(document.activeElement).toBe(gatilhoDeVolta)
  })

  it('preserva a captura estática e o alt durante o carregamento pendente e se recupera localmente se o import rejeitar', async () => {
    let resolver!: (mod: { default: typeof import('./DemoTelefoneMotor.tsx').default }) => void
    const promessaPendente = new Promise<{ default: typeof import('./DemoTelefoneMotor.tsx').default }>((res) => {
      resolver = res
    })

    const roteador = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <TelefoneDemo fluxo="historico" carregarMotor={() => promessaPendente}>
              <figure className="co-fone">
                <img src="/composicao/a/historico-780w.webp" alt="Captura estática do Histórico" />
              </figure>
            </TelefoneDemo>
          ),
        },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={roteador} />)

    fireEvent.click(screen.getByRole('button', { name: 'Experimentar Histórico' }))
    // Enquanto o import está pendente, a imagem original e seu alt continuam na tela.
    expect(screen.getByAltText('Captura estática do Histórico')).toBeTruthy()
    const botaoCarregando = screen.getByRole('button', { name: 'Abrindo… Histórico' })
    expect(botaoCarregando.getAttribute('aria-busy')).toBe('true')

    const moduloReal = await import('./DemoTelefoneMotor.tsx')
    await act(async () => {
      resolver(moduloReal)
      await promessaPendente
    })
    await screen.findByRole('group', { name: 'Tela interativa do Histórico' })
  })

  it('se o import do motor rejeitar, mantém a imagem original, exibe aviso calmo local e permite tentar de novo', async () => {
    let tentativas = 0
    const carregador = () => {
      tentativas += 1
      if (tentativas === 1) return Promise.reject(new Error('falha simulada'))
      return import('./DemoTelefoneMotor.tsx')
    }

    const roteador = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <TelefoneDemo fluxo="notas" carregarMotor={carregador}>
              <figure className="co-fone">
                <img src="/composicao/a/notas-780w.webp" alt="Captura estática de Notas" />
              </figure>
            </TelefoneDemo>
          ),
        },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={roteador} />)

    fireEvent.click(screen.getByRole('button', { name: 'Experimentar Notas' }))
    await screen.findByRole('status')
    expect(screen.getByText('Não foi possível abrir a prévia.')).toBeTruthy()
    expect(screen.getByAltText('Captura estática de Notas')).toBeTruthy()

    // Segunda tentativa recupera normalmente sem recarregar a página.
    fireEvent.click(screen.getByRole('button', { name: 'Experimentar Notas' }))
    await screen.findByRole('group', { name: 'Tela interativa de Notas' })
  })

  it('na faixa presa em 1440 (.co-palco > .co-fita), mantém inert enquanto o alvo está fora ou parcialmente recortado à esquerda/direita', async () => {
    Object.defineProperty(globalThis, 'CSS', {
      configurable: true,
      writable: true,
      value: { supports: () => true },
    })
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({
        matches: true,
        media: '',
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })

    let alvoEsq = 1520
    const { container } = render(
      <div className="co-palco">
        <div className="co-fita">
          <TelefoneDemo fluxo="historico" className="co-p2-fone" />
        </div>
      </div>,
    )
    const palco = container.querySelector<HTMLElement>('.co-palco')!
    const barraGatilho = container.querySelector<HTMLElement>('.dt-barra-gatilho')!
    vi.spyOn(palco, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 1440,
      top: 0,
      bottom: 812,
      width: 1440,
      height: 812,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    vi.spyOn(barraGatilho, 'getBoundingClientRect').mockImplementation(() => ({
      left: alvoEsq,
      right: alvoEsq + 140,
      top: 720,
      bottom: 764,
      width: 140,
      height: 44,
      x: alvoEsq,
      y: 720,
      toJSON: () => ({}),
    }))

    const disparar = async () => {
      await act(async () => {
        window.dispatchEvent(new Event('scroll'))
        await new Promise((r) => setTimeout(r, 30))
      })
    }

    // 1. Totalmente fora à direita -> inert = true.
    await disparar()
    expect(barraGatilho.hasAttribute('inert')).toBe(true)

    // 2. Parcialmente entrando pela direita (1380..1520 > 1440) -> inert = true!
    alvoEsq = 1380
    await disparar()
    expect(barraGatilho.hasAttribute('inert')).toBe(true)

    // 3. Inteiramente visível dentro do palco (1120..1260) -> inert = false!
    alvoEsq = 1120
    await disparar()
    expect(barraGatilho.hasAttribute('inert')).toBe(false)

    // 4. Parcialmente saindo pela esquerda (-20..120 < 0) -> inert = true!
    alvoEsq = -20
    await disparar()
    expect(barraGatilho.hasAttribute('inert')).toBe(true)
  })

  it('dentro da Início, abrir uma demo não cria segundo <main> nem segundo <h1> e passa no axe-core', async () => {
    renderizarRota('/', { sessao: null })
    await aguardarCarga()

    fireEvent.click(screen.getByRole('button', { name: 'Experimentar Histórico' }))
    const painel = await screen.findByRole('group', { name: 'Tela interativa do Histórico' })
    await waitFor(() => expect(painel.querySelectorAll('[data-dt-lista-historico] li').length).toBeGreaterThan(0))

    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    const resultados = await rodarAxe(painel)
    expect(resultados.violations).toEqual([])
  })

  it('movimento reduzido desliga transições no CSS da demo e mantém o fluxo empilhado acessível', () => {
    const css = readFileSync(join(process.cwd(), 'src', 'componentes', 'demo-telefone', 'demoTelefone.css'), 'utf8')
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
    expect(css).toMatch(/overscroll-behavior-y:\s*auto/)
  })
})
