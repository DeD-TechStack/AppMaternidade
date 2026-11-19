import { useRef, useState } from 'react'
import { MemoryRouter } from 'react-router'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MenuCelular } from '../componentes/casca/MenuCelular.tsx'
import { Dialogo } from '../componentes/comunidade/Dialogo.tsx'
import { DialogoDeAcao } from '../componentes/conta/DialogoDeAcao.tsx'
import { DialogoExcluirConta } from '../componentes/conta/DialogoExcluirConta.tsx'

// A saída (styles/abrir-fechar.css): quem chama desmonta a caixa de uma vez, então ela deixa um fantasma inerte que
// faz o fade de saída (--mov-fechar, 160 ms) e some. O menu do celular guarda o conteúdo pelo mesmo tempo.
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

const fantasma = () => document.body.querySelector<HTMLElement>('dialog[data-fantasma]')

function conferirFantasma() {
  const copia = fantasma()
  expect(copia, 'o fantasma da caixa fica no DOM durante a saída').not.toBeNull()
  expect(copia!.hasAttribute('inert')).toBe(true)
  expect(copia!.getAttribute('aria-hidden')).toBe('true')
  expect(copia!.hasAttribute('data-saindo')).toBe(true)
  expect(copia!.querySelector('[id]')).toBeNull()
  // Nada dentro dele aparece para o leitor de tela nem para a busca por papel.
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Fechar caixa' })).toBeNull()
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
  for (const { nome, Caixa } of CAIXAS) {
    it(`${nome}: ao desmontar, o fantasma inerte fica pela duração de fechar, some e o foco volta ao botão`, () => {
      vi.useFakeTimers()
      movimentoReduzido(false)
      const { rerender } = render(<Caixa aberta />)
      expect(screen.getByRole('dialog')).toBeTruthy()
      expect(fantasma()).toBeNull()

      rerender(<Caixa aberta={false} />)
      conferirFantasma()
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Abrir caixa' }))

      act(() => {
        vi.advanceTimersByTime(SAIDA_MS - 1)
      })
      expect(fantasma()).not.toBeNull()
      passarASaida()
      expect(fantasma()).toBeNull()
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Abrir caixa' }))
    })

    it(`${nome}: com movimento reduzido não existe fantasma`, () => {
      vi.useFakeTimers()
      movimentoReduzido(true)
      const { rerender } = render(<Caixa aberta />)
      rerender(<Caixa aberta={false} />)
      expect(fantasma()).toBeNull()
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Abrir caixa' }))
    })
  }

  it('fechar duas vezes seguidas deixa um fantasma só', () => {
    vi.useFakeTimers()
    movimentoReduzido(false)
    const { rerender } = render(<Comunidade aberta />)
    rerender(<Comunidade aberta={false} />)
    rerender(<Comunidade aberta />)
    rerender(<Comunidade aberta={false} />)
    expect(document.body.querySelectorAll('dialog[data-fantasma]')).toHaveLength(1)
    passarASaida()
    expect(fantasma()).toBeNull()
  })
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
