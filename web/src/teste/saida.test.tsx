import { useRef, useState } from 'react'
import { MemoryRouter } from 'react-router'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MenuCelular } from '../componentes/casca/MenuCelular.tsx'
import { Dialogo } from '../componentes/comunidade/Dialogo.tsx'
import { DialogoDeAcao } from '../componentes/conta/DialogoDeAcao.tsx'
import { DialogoExcluirConta } from '../componentes/conta/DialogoExcluirConta.tsx'

// A saída (styles/abrir-fechar.css): as caixas de diálogo só animam na entrada e fecham na hora, sem cópia nenhuma.
// O menu do celular guarda o conteúdo pela duração de fechar (--mov-fechar, 160 ms).
// Aqui o `matchMedia` responde "sem preferência de movimento reduzido": sem ele (jsdom puro) nada sai animado.
const SAIDA_MS = 160

function movimentoReduzido(reduzido: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: reduzido && consulta.includes('prefers-reduced-motion'),
    media: consulta,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  }))
}

function passarASaida() {
  act(() => {
    vi.advanceTimersByTime(SAIDA_MS)
  })
}

function Comunidade({ aberta }: { aberta: boolean }) {
  const origem = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={origem}>Abrir caixa</button>
      {aberta ? (
        <Dialogo titulo="Título" aoFechar={() => undefined} origem={origem}>
          <button type="button">Fechar caixa</button>
        </Dialogo>
      ) : null}
    </>
  )
}

function DeAcao({ aberta }: { aberta: boolean }) {
  const retorno = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={retorno}>Abrir caixa</button>
      {aberta ? (
        <DialogoDeAcao
          titulo="Remover"
          confirmar="Remover"
          rotuloEnviando="Removendo"
          cancelar="Fechar caixa"
          enviando={false}
          aoConfirmar={() => undefined}
          aoCancelar={() => undefined}
          retorno={retorno}
        />
      ) : null}
    </>
  )
}

function ExcluirConta({ aberta }: { aberta: boolean }) {
  const retorno = useRef<HTMLButtonElement>(null)
  const refSenha = useRef<HTMLInputElement>(null)
  return (
    <>
      <button ref={retorno}>Abrir caixa</button>
      {aberta ? (
        <DialogoExcluirConta
          senha="segredo"
          aoMudarSenha={() => undefined}
          erroSenha={null}
          resumo={null}
          enviando={false}
          aoConfirmar={() => undefined}
          aoCancelar={() => undefined}
          retorno={retorno}
          refSenha={refSenha}
        />
      ) : null}
    </>
  )
}

const CAIXAS = [
  { nome: 'Dialogo da comunidade', Caixa: Comunidade },
  { nome: 'DialogoDeAcao da conta', Caixa: DeAcao },
  { nome: 'DialogoExcluirConta', Caixa: ExcluirConta },
]

describe('saída das caixas de diálogo (R1-01)', () => {
  // As caixas só animam na entrada: fechar é imediato, sem cópia da caixa nem camada de popover.
  for (const { nome, Caixa } of CAIXAS) {
    for (const reduzido of [false, true]) {
      it(`${nome}${reduzido ? ' (movimento reduzido)' : ''}: ao fechar, não sobra fantasma nem cópia na camada de popover, e o foco volta ao botão no mesmo instante`, () => {
        vi.useFakeTimers()
        movimentoReduzido(reduzido)
        const { rerender } = render(<Caixa aberta />)
        expect(screen.getByRole('dialog')).toBeTruthy()

        rerender(<Caixa aberta={false} />)
        // Sem avançar nenhum relógio: a caixa já saiu.
        expect(document.querySelector('dialog')).toBeNull()
        expect(document.querySelector('dialog[data-fantasma]')).toBeNull()
        expect(document.querySelector('[data-fantasma]')).toBeNull()
        expect(document.querySelector('[popover]')).toBeNull()
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(screen.queryByRole('button', { name: 'Fechar caixa' })).toBeNull()
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Abrir caixa' }))
      })
    }
  }
})

function Menu() {
  const [aberto, setAberto] = useState(true)
  const botao = useRef<HTMLButtonElement>(null)
  return (
    <MemoryRouter>
      <button ref={botao}>Menu</button>
      <MenuCelular
        id="menu"
        aberto={aberto}
        contexto="publico"
        situacao="visitante"
        saindo={false}
        aoSair={() => undefined}
        aoFechar={() => setAberto(false)}
        botao={botao}
      />
    </MemoryRouter>
  )
}

describe('saída do menu do celular (R1-02)', () => {
  const painel = () => document.querySelector<HTMLElement>('[data-menu-celular]')!
  const itens = () => painel().querySelectorAll('a')

  it('ao fechar, os links ficam no painel (inertes) pela duração de fechar e depois somem; o foco volta ao botão', () => {
    vi.useFakeTimers()
    movimentoReduzido(false)
    render(<Menu />)
    expect(itens().length).toBeGreaterThan(0)
    expect(painel().hidden).toBe(false)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(painel().hidden).toBe(true)
    expect(itens().length).toBeGreaterThan(0)
    const area = painel().firstElementChild as HTMLElement
    expect(area.hasAttribute('inert')).toBe(true)
    expect(area.getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByRole('link')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Menu' }))

    act(() => {
      vi.advanceTimersByTime(SAIDA_MS - 1)
    })
    expect(itens().length).toBeGreaterThan(0)
    passarASaida()
    expect(painel().hidden).toBe(true)
    expect(painel().childElementCount).toBe(0)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Menu' }))
  })

  it('com movimento reduzido, o conteúdo some na hora', () => {
    vi.useFakeTimers()
    movimentoReduzido(true)
    render(<Menu />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(painel().hidden).toBe(true)
    expect(painel().childElementCount).toBe(0)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Menu' }))
  })
})
