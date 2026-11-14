import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { blocoDe, corpoDe, cssDoLayout, declara, regrasDe } from './cssDoLayout.ts'
import { Secao } from './Secao.tsx'

// H3:RF-01, Secao. O jsdom não calcula o CSS do arquivo: o markup (data-h, data-h-variante) e as regras de
// layout.css são conferidos aqui, com a conta do glossário da SPEC H3 feita no teste.

describe('Secao: markup', () => {
  it('é uma <section data-h="secao"> sem variante por padrão, e passa className e as outras props', () => {
    const { container } = render(
      <Secao className="minha" id="a" aria-labelledby="t">
        <p>texto</p>
      </Secao>,
    )
    const secao = container.firstElementChild!
    expect(secao.tagName).toBe('SECTION')
    expect(secao.getAttribute('data-h')).toBe('secao')
    expect(secao.hasAttribute('data-h-variante')).toBe(false)
    expect(secao.classList.contains('minha')).toBe(true)
    expect(secao.id).toBe('a')
    expect(secao.getAttribute('aria-labelledby')).toBe('t')
    expect(secao.textContent).toBe('texto')
  })

  it.each(['section', 'div', 'footer'] as const)('aceita as="%s"', (como) => {
    const { container } = render(<Secao as={como}>x</Secao>)
    expect(container.firstElementChild!.tagName).toBe(como.toUpperCase())
  })

  it('a variante centrada vai em data-h-variante e o data-h aceita mais de um valor (dataH)', () => {
    const { container } = render(
      <Secao variante="centrada" dataH="coluna">
        x
      </Secao>,
    )
    const secao = container.firstElementChild!
    expect(secao.getAttribute('data-h-variante')).toBe('centrada')
    expect(secao.getAttribute('data-h')).toBe('coluna secao')
    expect(secao.matches("[data-h~='secao']")).toBe(true)
    expect(secao.matches("[data-h~='coluna']")).toBe(true)
  })

  it('a variante painel faz a caixa externa sem fundo e, dentro, a caixa de cor com o data-painel e o conteúdo', () => {
    const { container } = render(
      <Secao variante="painel" painel="oliva" classeCaixa="cm-rodape-painel" className="externa">
        <p>dentro</p>
      </Secao>,
    )
    const externa = container.firstElementChild!
    expect(externa.getAttribute('data-h')).toBe('secao')
    expect(externa.getAttribute('data-h-variante')).toBe('painel')
    expect(externa.classList.contains('externa')).toBe(true)
    expect(externa.hasAttribute('data-painel')).toBe(false)
    expect(externa.children).toHaveLength(1)
    const caixa = externa.firstElementChild!
    expect(caixa.getAttribute('data-h')).toBe('caixa-cor')
    expect(caixa.getAttribute('data-painel')).toBe('oliva')
    expect(caixa.classList.contains('cm-painel-oliva')).toBe(true)
    expect(caixa.classList.contains('cm-rodape-painel')).toBe(true)
    expect(caixa.classList.contains('cm-painel')).toBe(false)
    expect(caixa.textContent).toBe('dentro')
  })

  it('o painel é de mel por padrão, e a luz de estúdio só entra no mel', () => {
    const mel = render(<Secao variante="painel" luz>x</Secao>).container.querySelector("[data-h~='caixa-cor']")!
    expect(mel.getAttribute('data-painel')).toBe('mel')
    expect(mel.classList.contains('cm-painel-mel')).toBe(true)
    expect(mel.classList.contains('cm-painel-luz')).toBe(true)
    const cacau = render(
      <Secao variante="painel" painel="cacau" luz>
        x
      </Secao>,
    ).container.querySelector("[data-h~='caixa-cor']")!
    expect(cacau.classList.contains('cm-painel-luz')).toBe(false)
  })
})

describe('Secao: padding, margem e vizinhança (layout.css)', () => {
  it('a seção sem fundo tem padding de topo e de base = espaco-secao e margem 0', () => {
    const corpo = corpoDe("[data-h~='secao']")
    expect(declara(corpo, 'padding-block', 'var(--espaco-secao)')).toBe(true)
    expect(declara(corpo, 'margin', '0')).toBe(true)
  })

  it('a primeira filha do <main> sem fundo usa espaco-secao-ampla no topo, e a última, na base', () => {
    const primeira = corpoDe("main > [data-h~='secao']:first-child:not([data-h-variante='painel'])")
    expect(declara(primeira, 'padding-top', 'var(--espaco-secao-ampla)')).toBe(true)
    const ultima = corpoDe("main > [data-h~='secao']:last-child:not([data-h-variante='painel'])")
    expect(declara(ultima, 'padding-bottom', 'var(--espaco-secao-ampla)')).toBe(true)
  })

  it('o painel não entra na regra de primeira e de última: a caixa externa fica em metade de espaco-bloco', () => {
    const externa = corpoDe("[data-h~='secao'][data-h-variante='painel']")
    expect(declara(externa, 'padding-block', 'calc(var(--espaco-bloco) / 2)')).toBe(true)
    // As regras de primeira e de última filha excluem o painel pelo seletor (conferido acima), então nenhuma
    // regra mexe no padding da caixa externa do painel além da dele.
    const mexemNoPainel = regrasDe(cssDoLayout).filter(
      (r) => /first-child|last-child/.test(r.seletor) && !r.seletor.includes(":not([data-h-variante='painel'])"),
    )
    expect(mexemNoPainel).toEqual([])
  })

  it('a caixa de cor tem a largura do quadro, padding vertical espaco-secao, lateral espaco-painel e o raio do painel', () => {
    const caixa = corpoDe("[data-h~='caixa-cor']")
    expect(declara(caixa, 'width', 'min(var(--quadro-largura), 100vw - 2 * var(--quadro-calha))')).toBe(true)
    expect(declara(caixa, 'margin-inline', 'auto')).toBe(true)
    expect(declara(caixa, 'padding-block', 'var(--espaco-secao)')).toBe(true)
    expect(declara(caixa, 'padding-inline', 'var(--espaco-painel)')).toBe(true)
    expect(declara(caixa, 'border-radius', 'var(--radius-painel)')).toBe(true)
  })

  it('painel com painel: o vão entre as caixas de cor é espaco-bloco (duas metades) e nenhuma seção tem margem', () => {
    // metade de baixo de um painel + metade de cima do seguinte = espaco-bloco.
    const metade = 'calc(var(--espaco-bloco) / 2)'
    expect(declara(corpoDe("[data-h~='secao'][data-h-variante='painel']"), 'padding-block', metade)).toBe(true)
    const comMargemDeSecao = regrasDe(cssDoLayout)
      .filter((r) => r.seletor.includes("data-h~='secao'"))
      .filter((r) => /margin(?:-(?:top|bottom|block|block-start|block-end))?\s*:(?!\s*0\s*(?:;|$))/.test(r.corpo))
    expect(comMargemDeSecao).toEqual([])
  })

  it('o <main> não tem vão: layout.css nunca põe gap nem margem em main', () => {
    const regrasDoMain = regrasDe(cssDoLayout).filter((r) => /(^|,)\s*main\s*(\{|,|$)/.test(r.seletor))
    expect(regrasDoMain).toEqual([])
  })

  it('a variante centrada centra o texto da seção', () => {
    expect(declara(corpoDe("[data-h~='secao'][data-h-variante='centrada']"), 'text-align', 'center')).toBe(true)
  })

  it('layout.css não escreve cor, sombra nem valor solto de espaço fora de var(--...) e 0', () => {
    const medidas = [...cssDoLayout.matchAll(/(?:margin|padding|gap)[a-z-]*\s*:\s*([^;}]+)/g)].map((m) => m[1])
    for (const valor of medidas) expect(valor, valor).not.toMatch(/(?<![\w-])[1-9]\d*(?:\.\d+)?(?:px|rem|em)\b/)
    expect(cssDoLayout).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|box-shadow/)
  })

  it('o arquivo trata o @media apenas em Colunas (a seção não cria ponto de quebra)', () => {
    const emMedia = blocoDe(cssDoLayout, '@media') ?? ''
    expect(emMedia).not.toMatch(/data-h~='secao'/)
  })
})
