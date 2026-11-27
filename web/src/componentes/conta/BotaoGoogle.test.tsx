import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LOGIN_GOOGLE } from '../../conteudo/conta.ts'
import { BotaoGoogle, retornoDoGoogle } from './BotaoGoogle.tsx'

// O botão "Entrar com Google": peso secundário, largura cheia, rótulo que quebra linha, e travado
// enquanto o pedido está em andamento. Aqui também: para onde o Google devolve a pessoa (a leitura do erro
// da volta e a limpeza do endereço estão em retornoGoogle.test.ts).

const BASE = `${window.location.origin}${import.meta.env.BASE_URL}`

describe('retornoDoGoogle', () => {
  it('sem volta, é a própria tela de entrar, sob a base do site', () => {
    expect(retornoDoGoogle(null)).toBe(`${BASE}entrar`)
  })

  it('com volta válida, leva o volta na tela de entrar (que decide o destino do RF-10)', () => {
    expect(retornoDoGoogle('/app/hoje')).toBe(`${BASE}entrar?volta=%2Fapp%2Fhoje`)
  })
})

describe('BotaoGoogle', () => {
  it('é um botão (type=button) com o rótulo "Entrar com Google" e a marca como desenho decorativo', () => {
    render(<BotaoGoogle aoClicar={() => {}} ocupado={false} />)
    const botao = screen.getByRole('button', { name: 'Entrar com Google' })
    expect(botao.getAttribute('type')).toBe('button')
    expect(LOGIN_GOOGLE.botao).toBe('Entrar com Google')
    const marca = botao.querySelector('img')!
    expect(marca.getAttribute('src')).toBe(`${import.meta.env.BASE_URL}cenas/acesso/google-g.svg`)
    expect(marca.getAttribute('alt')).toBe('')
    expect(marca.getAttribute('aria-hidden')).toBe('true')
    expect(marca.tabIndex).toBe(-1)
    expect(marca.getAttribute('width')).toBe('20')
    expect(marca.getAttribute('height')).toBe('20')
    expect(botao.querySelector('svg')).toBeNull()
  })

  it('tem peso secundário (contorno), largura cheia e deixa o rótulo quebrar linha', () => {
    render(<BotaoGoogle aoClicar={() => {}} ocupado={false} />)
    const classes = screen.getByRole('button').className
    expect(classes).toContain('cm-botao-contorno')
    expect(classes).not.toContain('cm-botao-primario')
    expect(classes).toContain('w-full')
    expect(classes).toContain('whitespace-normal')
  })

  it('o clique chama aoClicar uma vez', () => {
    const aoClicar = vi.fn()
    render(<BotaoGoogle aoClicar={aoClicar} ocupado={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Entrar com Google' }))
    expect(aoClicar).toHaveBeenCalledTimes(1)
  })

  it('ocupado: rótulo "Abrindo o Google…", desativado, aria-busy e sem clique', () => {
    const aoClicar = vi.fn()
    render(<BotaoGoogle aoClicar={aoClicar} ocupado />)
    const botao = screen.getByRole('button', { name: 'Abrindo o Google…' }) as HTMLButtonElement
    expect(LOGIN_GOOGLE.abrindo).toBe('Abrindo o Google…')
    expect(botao.disabled).toBe(true)
    expect(botao.getAttribute('aria-busy')).toBe('true')
    fireEvent.click(botao)
    expect(aoClicar).not.toHaveBeenCalled()
  })

  it('livre: sem aria-busy', () => {
    render(<BotaoGoogle aoClicar={() => {}} ocupado={false} />)
    expect(screen.getByRole('button').hasAttribute('aria-busy')).toBe(false)
  })
})
