import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { PORTA_ACESSO } from '../../conteudo/conta.ts'
import { DuasColunas } from './DuasColunas.tsx'

// F8-4: abaixo de 1024 a porta vem primeiro, como faixa de 3,25:1 (a mesma imagem, recortada), e o formulário
// sobe: o respiro de topo cai da seção ampla para o vão de grupo. A partir de 1024 nada muda. O jsdom não calcula
// o CSS do Tailwind, então o teste lê as classes: as sem prefixo valem abaixo de 1024, as `lg:` de 1024 em diante.

function montar() {
  const { container } = render(
    <DuasColunas>
      <h1>Pode entrar.</h1>
      <input aria-label="E-mail" />
    </DuasColunas>,
  )
  const banda = container.querySelector<HTMLElement>('[data-h~="colunas"]')!
  const [formulario, placa] = Array.from(banda.children) as HTMLElement[]
  return { container, banda, formulario, placa }
}

const classes = (no: Element) => Array.from(no.classList)
/** As classes que valem abaixo de 1024: as sem variante. */
const base = (no: Element) => classes(no).filter((c) => !c.includes(':'))
/** As classes de 1024 em diante, sem o prefixo. */
const grande = (no: Element) => classes(no).filter((c) => c.startsWith('lg:')).map((c) => c.slice(3))

describe('DuasColunas: a porta primeiro abaixo de 1024 (F8-4)', () => {
  it('o DOM tem o formulário primeiro e a placa depois: a ordem visual é só do CSS, e o leitor de tela lê o formulário antes', () => {
    const { banda, formulario, placa } = montar()

    expect(banda.children).toHaveLength(2)
    expect(formulario.querySelector('h1')).not.toBeNull()
    expect(formulario.querySelector('img')).toBeNull()
    expect(placa.querySelector('img')).not.toBeNull()
    expect(placa.querySelector('h1, input')).toBeNull()
  })

  it('abaixo de 1024 a placa vai antes (order-first) e o formulário fica sem ordem; de 1024 em diante a grade a põe à esquerda', () => {
    const { formulario, placa } = montar()

    expect(base(placa)).toContain('order-first')
    expect(grande(placa)).toEqual(expect.arrayContaining(['order-none', 'col-start-1', 'row-start-1']))
    expect(classes(formulario).some((c) => /(^|:)order-/.test(c)), 'o formulário não leva ordem').toBe(false)
    expect(grande(formulario)).toEqual(expect.arrayContaining(['col-start-2', 'row-start-1']))
  })

  it('o respiro de topo do formulário abaixo de 1024 é o vão de grupo (--espaco-grupo), e a seção ampla ficou só na base', () => {
    const { formulario } = montar()

    expect(base(formulario)).toContain('pt-esp-grupo')
    expect(base(formulario)).not.toContain('pt-esp-secao-ampla')
    expect(base(formulario)).toContain('pb-esp-secao-ampla')
    expect(grande(formulario)).toEqual(expect.arrayContaining(['pt-esp-grupo', 'pb-esp-grupo']))

    // `pt-esp-grupo` é a utilidade do token `--spacing-esp-grupo`, que aponta para `--espaco-grupo`.
    const tema = readFileSync(join(process.cwd(), 'src', 'styles', 'harmonia.gerado.css'), 'utf8')
    expect(tema).toMatch(/--spacing-esp-grupo:\s*var\(--espaco-grupo\);/)
  })

  it('a imagem fica numa caixa de 3,25:1 com corte abaixo de 1024, e a caixa vira simples envoltório de 1024 em diante', () => {
    const { placa } = montar()
    const caixa = placa.querySelector('img')!.parentElement!

    expect(base(caixa)).toEqual(expect.arrayContaining(['aspect-[3.25/1]', 'overflow-hidden']))
    expect(grande(caixa)).toEqual(expect.arrayContaining(['aspect-auto', 'overflow-visible']))
  })

  it('o piso de noite não aparece abaixo de 1024 e continua em 1024 ou mais, com a mesma altura', () => {
    const { placa } = montar()
    const piso = placa.querySelector<HTMLElement>('[aria-hidden="true"]')!

    expect(base(piso)).toContain('hidden')
    expect(grande(piso)).toContain('block')
    expect(base(piso)).toEqual(expect.arrayContaining(['absolute', 'bottom-0', 'bg-noite-cartao']))
    expect(piso.className).toContain('h-[calc(min(45rem,100cqw)*0.136)]')
  })

  it('uma só imagem, com o mesmo srcset (390, 720, 780, 1254), sizes e alt, recortada nas linhas 0,40 a 0,70 abaixo de 1024', () => {
    const { container } = montar()
    const imagens = container.querySelectorAll<HTMLImageElement>('img')

    expect(imagens).toHaveLength(1)
    const porta = imagens[0]
    expect(porta.getAttribute('srcset')).toBe(
      [390, 720, 780, 1254].map((largura) => `/cenas/acesso/porta-${largura}w.webp ${largura}w`).join(', '),
    )
    expect(porta.getAttribute('sizes')).toBe('(min-width: 1024px) min(720px, 50vw), 100vw')
    expect(porta.getAttribute('alt')).toBe(PORTA_ACESSO.alt)

    // Abaixo de 1024: preenche a caixa de ponta a ponta, sem largura máxima, cortando (cover) com o topo da janela
    // em 0,40 da placa: 0,40 / (1 − 1/3,25) = 57,8%.
    expect(base(porta)).toEqual(expect.arrayContaining(['h-full', 'w-full', 'object-cover', 'object-[50%_57.8%]']))
    expect(base(porta).some((c) => c.startsWith('max-w-')), 'sem largura máxima abaixo de 1024').toBe(false)
    expect(0.4 / (1 - 1 / 3.25)).toBeCloseTo(0.578, 3)
    // De 1024 em diante: o quadrado de sempre, até 720 px.
    expect(grande(porta)).toEqual(expect.arrayContaining(['aspect-square', 'h-auto', 'max-w-[720px]']))
  })
})
