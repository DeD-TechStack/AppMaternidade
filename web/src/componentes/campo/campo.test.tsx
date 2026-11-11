import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { Botao } from '../base/Botao.tsx'
import { Campo } from '../base/Campo.tsx'
import { Citacao } from './Citacao.tsx'
import { DESCRICAO_ILUSTRACAO, Ilustracao } from './Ilustracao.tsx'
import { Numeros } from './Numeros.tsx'
import { PainelCampo } from './PainelCampo.tsx'

// As peças base e de campo do Campo de mel (MAT-49a), isoladas.

function comRoteador(no: ReactNode) {
  const roteador = createMemoryRouter([{ path: '*', element: no }])
  return render(<RouterProvider router={roteador} />)
}

describe('Botao', () => {
  it('as variantes têm as classes do sistema; o primário tem 56 px no site e 48 no app', () => {
    render(
      <>
        <Botao>Um</Botao>
        <Botao variante="mel">Dois</Botao>
        <Botao variante="contorno" tamanho="app">
          Três
        </Botao>
        <Botao variante="texto">Quatro</Botao>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Um' }).className).toBe('cm-botao cm-botao-primario alvo-toque')
    expect(screen.getByRole('button', { name: 'Um' }).getAttribute('data-tamanho')).toBe('site')
    expect(screen.getByRole('button', { name: 'Dois' }).className).toBe('cm-botao cm-botao-mel alvo-toque')
    expect(screen.getByRole('button', { name: 'Três' }).getAttribute('data-tamanho')).toBe('app')
    expect(screen.getByRole('button', { name: 'Quatro' }).getAttribute('data-botao')).toBe('texto')
  })

  it('desativado continua focável, marca aria-disabled e não chama o clique', () => {
    const aoClicar = vi.fn()
    render(
      <Botao desativado motivo="Disponível depois do convite." onClick={aoClicar}>
        Convidar
      </Botao>,
    )
    const botao = screen.getByRole('button', { name: 'Convidar' })
    expect(botao.getAttribute('aria-disabled')).toBe('true')
    expect(botao.hasAttribute('disabled')).toBe(false)
    expect(document.getElementById(botao.getAttribute('aria-describedby')!)!.textContent).toBe('Disponível depois do convite.')
    fireEvent.click(botao)
    expect(aoClicar).not.toHaveBeenCalled()
  })

  it('com `to` vira um link de rota, sem seta no texto', () => {
    comRoteador(<Botao to="/contato">Criar conta</Botao>)
    const link = screen.getByRole('link', { name: 'Criar conta' })
    expect(link.getAttribute('href')).toBe('/contato')
    expect(link.textContent).not.toMatch(/[→›»]/)
  })

  it('o ícone vai escondido do leitor de tela', () => {
    render(<Botao icone={<span data-icone="" />}>Pausar</Botao>)
    expect(screen.getByRole('button', { name: 'Pausar' }).querySelector('.cm-botao-icone')!.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('Campo', () => {
  it('liga o rótulo, a ajuda e o erro à caixa', () => {
    render(<Campo id="c" rotulo="E-mail" tipo="email" ajuda="Para o convite." erro="Falta o domínio." />)
    const caixa = screen.getByLabelText('E-mail')
    expect(caixa.getAttribute('type')).toBe('email')
    expect(caixa.getAttribute('aria-invalid')).toBe('true')
    expect(caixa.getAttribute('aria-describedby')).toBe('c-erro c-ajuda')
    expect(caixa.className).toBe('cm-campo-entrada')
  })

  it('a senha tem o botão de mostrar de 44 × 44, com aria-pressed', () => {
    render(<Campo id="s" rotulo="Senha" tipo="senha" />)
    const botao = screen.getByRole('button', { name: 'Mostrar senha' })
    expect(screen.getByLabelText('Senha').getAttribute('type')).toBe('password')
    fireEvent.click(botao)
    expect(botao.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByLabelText('Senha').getAttribute('type')).toBe('text')
  })
})

describe('peças de campo', () => {
  it('PainelCampo marca a variante e só põe a luz de estúdio no mel', () => {
    const { container } = render(
      <>
        <PainelCampo variante="mel" luz>
          a
        </PainelCampo>
        <PainelCampo variante="oliva" luz>
          b
        </PainelCampo>
      </>,
    )
    const [mel, oliva] = [...container.querySelectorAll('[data-painel]')]
    expect(mel.className).toContain('cm-painel-luz')
    expect(oliva.className).not.toContain('cm-painel-luz')
  })

  it('Ilustracao usa o WebP 1× e 2× e a descrição padrão; decorativa tem alt vazio', () => {
    render(
      <>
        <Ilustracao nome="pai-colo" />
        <Ilustracao nome="mae-noite" decorativa />
      </>,
    )
    const descrita = screen.getByRole('img', { name: DESCRICAO_ILUSTRACAO['pai-colo'] })
    expect(descrita.getAttribute('src')).toBe('/ilustracoes/pai-colo@1x.webp')
    expect(descrita.getAttribute('srcset')).toBe('/ilustracoes/pai-colo@1x.webp 1x, /ilustracoes/pai-colo@2x.webp 2x')
    expect(descrita.getAttribute('loading')).toBe('lazy')
    expect(document.querySelector('img[data-ilustracao="mae-noite"]')!.getAttribute('alt')).toBe('')
  })

  it('Citacao põe aspas tipográficas e o autor no figcaption', () => {
    const { container } = render(<Citacao texto="Pomada só à noite." autor="Carla" />)
    expect(container.querySelector('blockquote p')!.textContent).toBe('“Pomada só à noite.”')
    expect(container.querySelector('figcaption')!.textContent).toBe('Carla')
  })

  it('Numeros é uma lista de três itens', () => {
    const { container } = render(
      <Numeros
        itens={[
          { valor: '7', legenda: 'tipos de registro' },
          { valor: '2', legenda: 'toques' },
          { valor: '0', legenda: 'metas ou comparações' },
        ]}
      />,
    )
    expect(container.querySelectorAll('ul[data-numeros] > li')).toHaveLength(3)
  })
})
