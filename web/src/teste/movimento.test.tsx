import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CATALOGO, fimDaCortina } from '../movimento/catalogo.ts'
import { Cortina } from '../movimento/Cortina.tsx'
import { EntradaCena } from '../movimento/EntradaCena.tsx'
import { RevelaNaRolagem } from '../movimento/RevelaNaRolagem.tsx'
import { RevelacaoPorBaixo } from '../movimento/RevelacaoPorBaixo.tsx'

// O movimento do Campo de mel (DESIGN.md 5). Substitui o antigo web/src/movimento.test.tsx (MAT-49a).

function consultas(regras: { reduzido?: boolean; largo?: boolean }) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches:
      (consulta.includes('prefers-reduced-motion') && Boolean(regras.reduzido)) ||
      (consulta.includes('min-width: 46rem') && Boolean(regras.largo)),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('catálogo (DESIGN.md 5)', () => {
  it('cortina: 6 colunas no largo e 4 no estreito, 0,5 s, curva [0.16,1,0.3,1], 90 ms entre colunas, mel 120 ms depois', () => {
    const { M2 } = CATALOGO
    expect(M2.colunas).toEqual({ largo: 6, estreito: 4 })
    expect(M2.duracaoMs).toBe(500)
    expect(M2.curva).toEqual([0.16, 1, 0.3, 1])
    expect(M2.escalonamentoMs).toBe(90)
    expect(M2.atrasoCamadaMs).toBe(120)
    expect(M2.deslocamentoPct).toBe(100)
    expect(fimDaCortina()).toBe(5 * 90 + 120 + 500)
  })

  it('painel com mídia: 0,9 → 1 nos primeiros 360 px, mola 120/30, cartão 120 ms depois', () => {
    const { M3 } = CATALOGO
    expect(M3.escala).toEqual({ de: 0.9, para: 1 })
    expect(M3.janelaPx).toBe(360)
    expect(M3.mola).toEqual({ stiffness: 120, damping: 30 })
    expect(M3.atrasoMs).toBe(120)
  })

  it('linhas: sobem 48 px em 1,25 s, curva [0.165,0.84,0.44,1], uma a cada 250 ms', () => {
    const { M4 } = CATALOGO
    expect(M4.deslocamentoPx).toBe(48)
    expect(M4.duracaoMs).toBe(1250)
    expect(M4.curva).toEqual([0.165, 0.84, 0.44, 1])
    expect(M4.escalonamentoMs).toBe(250)
  })

  it('faixa de cacau de -50 % a 0, rodapé de -30 % a 0, cena 0,94 → 1 em 0,8 s, selos 60 s, camada 100 ms', () => {
    expect(CATALOGO.M6.deslocamentoPct).toBe(50)
    expect(CATALOGO.M7.deslocamentoPct).toBe(30)
    expect(CATALOGO.M8.escala).toEqual({ de: 0.94, para: 1 })
    expect(CATALOGO.M8.duracaoMs).toBe(800)
    expect(CATALOGO.M14.duracaoMs).toBe(60000)
    expect(CATALOGO.M13.duracaoMs).toBe(100)
  })
})

describe('Cortina', () => {
  it('no largo tem 6 colunas, cada uma com a camada de cacau por cima da de mel, sem pegar clique', () => {
    window.sessionStorage.clear()
    consultas({ largo: true })
    const { container } = render(<Cortina />)
    const cortina = container.querySelector<HTMLElement>('[data-cortina]')!
    expect(cortina.getAttribute('aria-hidden')).toBe('true')
    expect(cortina.className).toMatch(/pointer-events-none/)
    expect(cortina.children).toHaveLength(6)
    const [mel, cacau] = [...cortina.children[0].children]
    expect(mel.className).toMatch(/bg-mel/)
    expect(cacau.className).toMatch(/bg-cacau/)
  })

  it('no estreito tem 4 colunas', () => {
    window.sessionStorage.clear()
    consultas({})
    const { container } = render(<Cortina />)
    expect(container.querySelector('[data-cortina]')!.children).toHaveLength(4)
  })

  it('roda uma vez por sessão, e com movimento reduzido nem aparece (e avisa que terminou)', () => {
    window.sessionStorage.clear()
    consultas({})
    const primeira = render(<Cortina />)
    expect(primeira.container.querySelector('[data-cortina]')).not.toBeNull()
    primeira.unmount()
    const aoTerminar = vi.fn()
    const segunda = render(<Cortina aoTerminar={aoTerminar} />)
    expect(segunda.container.querySelector('[data-cortina]')).toBeNull()
    expect(aoTerminar).toHaveBeenCalledTimes(1)
    segunda.unmount()

    window.sessionStorage.clear()
    consultas({ reduzido: true })
    const reduzida = vi.fn()
    const terceira = render(<Cortina aoTerminar={reduzida} />)
    expect(terceira.container.querySelector('[data-cortina]')).toBeNull()
    expect(reduzida).toHaveBeenCalledTimes(1)
  })
})

describe('peças com movimento reduzido', () => {
  it('a cena da abertura nasce no estado final', () => {
    consultas({ reduzido: true })
    const { container } = render(
      <EntradaCena pronta={false}>
        <p>cena</p>
      </EntradaCena>,
    )
    expect(container.firstElementChild!.getAttribute('data-entrada-cena')).toBe('final')
  })

  it('sem movimento reduzido, a cena espera a cortina', () => {
    consultas({})
    const { container } = render(
      <EntradaCena pronta={false}>
        <p>cena</p>
      </EntradaCena>,
    )
    expect(container.firstElementChild!.getAttribute('data-entrada-cena')).toBe('espera')
  })

  it('a mídia presa à rolagem fica em escala 1 e o conteúdo da revelação por baixo fica no lugar', () => {
    consultas({ reduzido: true })
    const { container } = render(
      <>
        <RevelaNaRolagem>
          <p>mídia</p>
        </RevelaNaRolagem>
        <RevelacaoPorBaixo variante="M7">
          <p>rodapé</p>
        </RevelacaoPorBaixo>
      </>,
    )
    const midia = container.querySelector<HTMLElement>('[data-revela]')!
    expect(['', 'none']).toContain(midia.style.transform)
    const conteudo = container.querySelector<HTMLElement>('.overflow-hidden > div')!
    expect(['', 'none']).toContain(conteudo.style.transform)
  })
})
