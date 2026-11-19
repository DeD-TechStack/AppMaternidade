import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CenaHeroi } from './CenaHeroi.tsx'
import { TomDaFaixa } from './FaixaInteira.tsx'
import * as secoes from './index.ts'
import { ProdutoEmMoldura } from './ProdutoEmMoldura.tsx'

// DS1:RF-12 (DS1-I-12): as nove peças compartilhadas das páginas públicas, em web/src/componentes/secoes/. Cada uma
// tem as props, a marcação e os estados do §3 da spec (e a tabela de estados do §3.12): o caminho feliz, o texto
// longo, a entrada vazia ou inválida, o foco, o movimento reduzido e a noite. Uma violação de contrato LANÇA um
// Error na renderização, em qualquer build (string obrigatória vazia depois de trim, número fora da faixa ou não
// finito, tamanho de imagem que não é inteiro positivo, `idTitulo` vazio, destino que não começa com "/"). Lista
// ou filhos vazios não são violação: a peça não renderiza nada. Nenhuma peça importa de movimento/ ou de motion, e
// nada nasce escondido no primeiro desenho: o secoes.css é lido aqui (o medidor, que força o movimento reduzido e
// espera as animações, não prova o primeiro desenho). Os textos chegam por props: o teste usa as próprias frases.

const PASTA = path.dirname(fileURLToPath(import.meta.url))

const {
  PaginaCasa,
  FaixaInteira,
  Legenda,
  FaixaProva,
  Perguntas,
  Fechamento,
  BotaoLargo,
} = secoes

beforeEach(() => {
  // Um erro lançado na renderização é registrado pelo React: o teste confere o Error, não o ruído.
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Renderiza dentro de um roteador (o BotaoLargo e o Fechamento são links internos). */
function pintar(elemento: ReactElement) {
  return render(<MemoryRouter>{elemento}</MemoryRouter>)
}

/** O mesmo, esperando o Error do contrato. */
function lanca(elemento: ReactElement) {
  expect(() => pintar(elemento)).toThrow(Error)
}

const FUNDOS = ['papel', 'cacau', 'areia', 'chao-noite'] as const

const imagem = (extra: Record<string, unknown> = {}) => ({
  src: '/cenas/teste/placa-900.webp',
  srcSet: '/cenas/teste/placa-900.webp 900w, /cenas/teste/placa-1672.webp 1672w',
  sizes: '(min-width: 1440px) 960px, 100vw',
  largura: 1672,
  altura: 1170,
  ...extra,
})

const recorte = (extra: Record<string, unknown> = {}) =>
  imagem({
    src: '/cenas/teste/recorte-390.webp',
    srcSet: '/cenas/teste/recorte-390.webp 390w, /cenas/teste/recorte-780.webp 780w',
    sizes: '100vw',
    largura: 780,
    altura: 1040,
    ...extra,
  })

// ---------------------------------------------------------------------------------------------
// As nove peças existem, e o que não é teste de secoes/ não importa de movimento nem de motion.

describe('DS1-I-12 o pacote secoes/: as nove peças, o índice e nenhuma importação de movimento', () => {
  it('DS1-I-12 o índice exporta as nove peças e o TomDaFaixa', () => {
    for (const nome of ['PaginaCasa', 'FaixaInteira', 'TomDaFaixa', 'CenaHeroi', 'ProdutoEmMoldura', 'Legenda', 'FaixaProva', 'Perguntas', 'Fechamento', 'BotaoLargo']) {
      expect(typeof (secoes as Record<string, unknown>)[nome], nome).toBe('function')
    }
  })

  const fontes = () =>
    fs
      .readdirSync(PASTA)
      .filter((arquivo) => /\.(ts|tsx)$/.test(arquivo) && !/\.test\./.test(arquivo))
      .map((arquivo) => ({ arquivo, texto: fs.readFileSync(path.join(PASTA, arquivo), 'utf8').replaceAll('\r\n', '\n') }))

  it('DS1-I-12 cada uma das nove peças tem o seu arquivo .tsx na pasta', () => {
    const arquivos = fs.readdirSync(PASTA)
    for (const nome of ['PaginaCasa', 'FaixaInteira', 'CenaHeroi', 'ProdutoEmMoldura', 'Legenda', 'FaixaProva', 'Perguntas', 'Fechamento', 'BotaoLargo']) {
      expect(arquivos, nome).toContain(`${nome}.tsx`)
    }
    expect(arquivos).toContain('index.ts')
    expect(arquivos).toContain('secoes.css')
  })

  it('DS1-I-12 nenhum arquivo do pacote importa de movimento/ nem de motion', () => {
    const lista = fontes()
    expect(lista.length).toBeGreaterThanOrEqual(10)
    for (const { arquivo, texto } of lista) {
      const importacoes = texto.split('\n').filter((linha) => /^\s*(import|export)\b.*\bfrom\b/.test(linha) || /^\s*import\s+['"]/.test(linha))
      for (const linha of importacoes) {
        expect(linha, arquivo).not.toMatch(/movimento|motion/i)
      }
    }
  })

  it('DS1-I-12 o pacote não escreve frase em português: sem letra acentuada fora de comentário (o texto chega por props)', () => {
    for (const { arquivo, texto } of fontes()) {
      const semComentario = texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '')
      expect(semComentario, arquivo).not.toMatch(/[À-ÿ]/)
    }
  })

  it('DS1-I-12 a imagem de toda peça leva largura e altura explícitas no HTML', () => {
    const { container } = pintar(
      <ProdutoEmMoldura tela={{ ...imagem({ largura: 780, altura: 1560 }), alt: 'Tela do registro' }} moldura={imagem({ largura: 840, altura: 1620 })} />,
    )
    for (const img of container.querySelectorAll('img')) {
      expect(img.getAttribute('width')).toMatch(/^\d+$/)
      expect(img.getAttribute('height')).toMatch(/^\d+$/)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// O secoes.css é lido: nada começa escondido, sem movimento, sem sombra, sem gradiente, só token de cor.

describe('DS1-I-12 secoes.css: o primeiro desenho é estático', () => {
  const css = fs
    .readFileSync(path.join(PASTA, 'secoes.css'), 'utf8')
    .replaceAll('\r\n', '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  const blocos = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ seletor: m[1].trim(), corpo: m[2] }))

  it('DS1-I-12 o arquivo tem regras (a leitura achou blocos)', () => {
    expect(blocos.length).toBeGreaterThan(10)
  })

  it('DS1-I-12 sem animation, sem @keyframes e sem animation-* em lugar nenhum', () => {
    expect(css).not.toMatch(/animation/i)
    expect(css).not.toMatch(/@keyframes/i)
  })

  it('DS1-I-12 sem opacidade abaixo de 1 e sem visibility: hidden', () => {
    expect(css).not.toMatch(/opacity\s*:\s*(0(\.\d+)?|\.\d+)\s*[;}]/i)
    expect(css).not.toMatch(/visibility\s*:\s*hidden/i)
  })

  it('DS1-I-12 transition só em :active e só em transform ou opacity; transform só em :active', () => {
    for (const { seletor, corpo } of blocos) {
      const transicoes = [...corpo.matchAll(/transition(?:-property)?\s*:\s*([^;]+)/gi)]
      for (const t of transicoes) {
        expect(seletor, `transition fora de :active em ${seletor}`).toMatch(/:active/)
        const propriedades = t[1].split(',').map((p) => p.trim().split(/\s+/)[0])
        for (const propriedade of propriedades) expect(['transform', 'opacity'], `${seletor}: ${propriedade}`).toContain(propriedade)
        expect(t[1], seletor).not.toMatch(/\ball\b/)
      }
      if (/(^|[;\s])(transform|rotate|scale|translate)\s*:/i.test(corpo)) {
        expect(seletor, `transform fora de :active em ${seletor}`).toMatch(/:active/)
      }
    }
  })

  it('DS1-I-12 sem sombra, sem gradiente e sem cor escrita à mão (só token)', () => {
    expect(css).not.toMatch(/box-shadow\s*:\s*(?!none)/i)
    expect(css).not.toMatch(/text-shadow\s*:\s*(?!none)/i)
    expect(css).not.toMatch(/gradient\(/i)
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(css).not.toMatch(/\brgba?\(/i)
    expect(css).not.toMatch(/\bhsla?\(/i)
    expect(css).not.toMatch(/oklch\(/i)
  })

  it('DS1-I-12 cada um dos quatro chãos da faixa tem regra de cor de texto e de foco', () => {
    for (const fundo of FUNDOS) {
      const regra = blocos.find((b) => b.seletor.includes('data-faixa-fundo') && b.seletor.includes(fundo))
      expect(regra, `sem regra de cor para ${fundo}`).toBeDefined()
    }
  })

  it('DS1-I-12 o FaixaProva nunca é grade de blocos iguais: sem grid com colunas repetidas nem cartão nas regras da lista', () => {
    const daLista = blocos.filter((b) => b.seletor.includes('data-prova-lista'))
    expect(daLista.length).toBeGreaterThan(0)
    for (const { seletor, corpo } of daLista) {
      expect(corpo, seletor).not.toMatch(/grid-template-columns\s*:[^;]*repeat/i)
      expect(corpo, seletor).not.toMatch(/box-shadow\s*:\s*(?!none)/i)
      expect(corpo, seletor).not.toMatch(/border-radius\s*:\s*(?!0)/i)
    }
    // As linhas têm fio de 1 px de cacau entre elas.
    expect(daLista.map((b) => b.corpo).join('\n')).toMatch(/border[a-z-]*\s*:\s*1px/i)
  })
})

// ---------------------------------------------------------------------------------------------
// PaginaCasa

describe('DS1-I-12 PaginaCasa: o marcador do escopo da casa, sem visual próprio', () => {
  it('DS1-I-12 PaginaCasa rende um div[data-casa] com os filhos dentro e nenhum estilo próprio', () => {
    const { container } = pintar(
      <PaginaCasa>
        <p>Dentro</p>
      </PaginaCasa>,
    )
    const casa = container.querySelector<HTMLElement>('[data-casa]')!
    expect(casa.tagName).toBe('DIV')
    expect(casa.getAttribute('style')).toBeNull()
    expect(within(casa).getByText('Dentro')).toBeTruthy()
    expect(container.querySelectorAll('[data-casa]')).toHaveLength(1)
  })

  it('DS1-I-12 PaginaCasa sem filhos não renderiza nada', () => {
    const { container } = pintar(<PaginaCasa>{null}</PaginaCasa>)
    expect(container.querySelector('[data-casa]')).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------
// FaixaInteira

describe('DS1-I-12 FaixaInteira: faixa de ponta a ponta em quatro chãos, dividida por uma costura', () => {
  it('DS1-I-12 FaixaInteira: cada um dos quatro chãos marca [data-faixa] e [data-faixa-fundo], num div sem idTitulo', () => {
    for (const fundo of FUNDOS) {
      const { container, unmount } = pintar(
        <FaixaInteira fundo={fundo}>
          <p>Conteúdo</p>
        </FaixaInteira>,
      )
      const faixa = container.querySelector<HTMLElement>('[data-faixa]')!
      expect(faixa.tagName, fundo).toBe('DIV')
      expect(faixa.getAttribute('data-faixa-fundo'), fundo).toBe(fundo)
      expect(faixa.hasAttribute('aria-labelledby'), fundo).toBe(false)
      expect(container.querySelector('section')).toBeNull()
      unmount()
    }
  })

  it('DS1-I-12 FaixaInteira: com idTitulo vira section nomeada por ele, e o conteúdo mora num quadro', () => {
    const { container } = pintar(
      <FaixaInteira fundo="papel" idTitulo="titulo-da-faixa">
        <h2 id="titulo-da-faixa">Um título</h2>
      </FaixaInteira>,
    )
    const faixa = container.querySelector<HTMLElement>('[data-faixa]')!
    expect(faixa.tagName).toBe('SECTION')
    expect(faixa.getAttribute('aria-labelledby')).toBe('titulo-da-faixa')
    expect(faixa.querySelector("[data-h~='quadro']")).not.toBeNull()
    expect(faixa.querySelector("[data-h~='quadro'] h2#titulo-da-faixa")).not.toBeNull()
  })

  it('DS1-I-12 FaixaInteira dividida: o lado direito é uma camada sólida [data-faixa-lado] aria-hidden, sem gradiente, na costura', () => {
    const { container } = pintar(
      <FaixaInteira fundo="papel" fundoDireita="cacau" costuraX="calc(50% + 310px)">
        <p>Conteúdo</p>
      </FaixaInteira>,
    )
    const faixa = container.querySelector<HTMLElement>('[data-faixa]')!
    const lado = faixa.querySelector<HTMLElement>('[data-faixa-lado]')!
    expect(lado).not.toBeNull()
    expect(lado.getAttribute('data-faixa-fundo')).toBe('cacau')
    expect(lado.getAttribute('aria-hidden')).toBe('true')
    expect(lado.getAttribute('style') ?? '').toContain('calc(50% + 310px)')
    expect(container.innerHTML).not.toMatch(/gradient/i)
    // O lado fica ANTES do conteúdo no documento (por baixo dele).
    const conteudo = faixa.querySelector("[data-h~='quadro']")!
    expect(lado.compareDocumentPosition(conteudo) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(faixa.querySelectorAll('[data-faixa-lado]')).toHaveLength(1)
  })

  it('DS1-I-12 FaixaInteira sem divisão não tem [data-faixa-lado]; costuraX390 é aceito', () => {
    const { container } = pintar(
      <FaixaInteira fundo="areia">
        <p>Conteúdo</p>
      </FaixaInteira>,
    )
    expect(container.querySelector('[data-faixa-lado]')).toBeNull()
    const dividida = pintar(
      <FaixaInteira fundo="papel" fundoDireita="chao-noite" costuraX="50%" costuraX390="70%">
        <p>Conteúdo</p>
      </FaixaInteira>,
    )
    expect(dividida.container.querySelector('[data-faixa-lado]')).not.toBeNull()
  })

  it('DS1-I-12 FaixaInteira lança: fundoDireita sem costuraX, idTitulo vazio ou só espaços, e o mel (que não existe como chão)', () => {
    lanca(
      <FaixaInteira fundo="papel" fundoDireita="cacau">
        <p>x</p>
      </FaixaInteira>,
    )
    lanca(
      <FaixaInteira fundo="papel" idTitulo="">
        <p>x</p>
      </FaixaInteira>,
    )
    lanca(
      <FaixaInteira fundo="papel" idTitulo="   ">
        <p>x</p>
      </FaixaInteira>,
    )
    lanca(
      // @ts-expect-error o mel não é um chão: o tipo recusa e, em qualquer build, a peça também
      <FaixaInteira fundo="mel">
        <p>x</p>
      </FaixaInteira>,
    )
    lanca(
      // @ts-expect-error o mel não é um chão do lado direito
      <FaixaInteira fundo="papel" fundoDireita="mel" costuraX="50%">
        <p>x</p>
      </FaixaInteira>,
    )
  })

  it('DS1-I-12 FaixaInteira sem filhos não renderiza nada', () => {
    expect(pintar(<FaixaInteira fundo="papel">{null}</FaixaInteira>).container.innerHTML).toBe('')
    expect(pintar(<FaixaInteira fundo="papel">{[]}</FaixaInteira>).container.innerHTML).toBe('')
  })

  it('DS1-I-12 FaixaInteira com texto longo: o texto fica no quadro, sem largura fixa em estilo inline', () => {
    const longo = 'palavra-sem-espaco-nenhum-que-nao-cabe-em-trezentos-e-cinquenta-pixels '.repeat(8)
    const { container } = pintar(
      <FaixaInteira fundo="cacau">
        <p>{longo}</p>
      </FaixaInteira>,
    )
    expect(container.querySelector('[data-faixa]')!.textContent).toContain('palavra-sem-espaco-nenhum')
    expect(container.querySelector<HTMLElement>('[data-faixa]')!.getAttribute('style')).toBeNull()
  })

  it('DS1-I-12 TomDaFaixa: embrulha o que fica sobre a parte direita com o chão dela, e o mel lança', () => {
    const { container } = pintar(
      <TomDaFaixa fundo="cacau">
        <p>Sobre o cacau</p>
      </TomDaFaixa>,
    )
    const tom = container.querySelector<HTMLElement>('[data-faixa-fundo="cacau"]')!
    expect(tom).not.toBeNull()
    expect(within(tom).getByText('Sobre o cacau')).toBeTruthy()
    expect(tom.hasAttribute('data-faixa')).toBe(false)
    lanca(
      // @ts-expect-error o mel não é um chão
      <TomDaFaixa fundo="mel">
        <p>x</p>
      </TomDaFaixa>,
    )
  })
})

// ---------------------------------------------------------------------------------------------
// CenaHeroi

describe('DS1-I-12 CenaHeroi: a placa de estúdio rente a uma borda, com paredes e chão em CSS', () => {
  const base = () => ({
    imagem: imagem(),
    recorte390: recorte(),
    alt: 'Três pessoas dividindo a rotina do bebê no mesmo celular',
    larguraMax: 960,
    parede: { esquerda: 'papel', direita: 'cacau' },
    chao: { esquerda: 'areia', direita: 'chao-noite' },
    costura: 0.5443,
    alturaChao: 0.799,
    lado: 'direita' as const,
    idTitulo: 'titulo-cena',
  })
  const cena = (extra: Record<string, unknown> = {}) => (
    // @ts-expect-error o objeto de teste é montado como Record para poder trocar uma prop por vez
    <CenaHeroi {...base()} {...extra}>
      <h1 id="titulo-cena">Pode entrar.</h1>
    </CenaHeroi>
  )

  it('DS1-I-12 CenaHeroi rende a section nomeada, data-largura-max, o h1 dentro e a imagem com width e height da maior', () => {
    const { container } = pintar(cena())
    const secao = container.querySelector<HTMLElement>('section[data-cena-heroi]')!
    expect(secao.getAttribute('data-largura-max')).toBe('960')
    expect(secao.getAttribute('aria-labelledby')).toBe('titulo-cena')
    expect(within(secao).getByRole('heading', { level: 1 }).id).toBe('titulo-cena')
    const img = secao.querySelector<HTMLImageElement>('picture img')!
    expect(img.getAttribute('alt')).toBe(base().alt)
    expect(img.getAttribute('width')).toBe('1672')
    expect(img.getAttribute('height')).toBe('1170')
    expect(img.getAttribute('srcset')).toBe(base().imagem.srcSet)
    expect(img.getAttribute('sizes')).toBe(base().imagem.sizes)
  })

  it('DS1-I-12 CenaHeroi: o recorte de 390 entra como <source media="(max-width: 767px)"> do picture, antes da imagem', () => {
    const { container } = pintar(cena())
    const picture = container.querySelector('picture')!
    const fonte = picture.querySelector<HTMLSourceElement>('source[media="(max-width: 767px)"]')!
    expect(fonte).not.toBeNull()
    expect(fonte.getAttribute('srcset')).toBe(base().recorte390.srcSet)
    expect(fonte.compareDocumentPosition(picture.querySelector('img')!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })

  it('DS1-I-12 CenaHeroi: fetchpriority="high", nunca loading="lazy", e o lado vai ao DOM', () => {
    const { container } = pintar(cena({ lado: 'esquerda' }))
    const img = container.querySelector('picture img')!
    expect(img.getAttribute('fetchpriority')).toBe('high')
    expect(img.getAttribute('loading')).not.toBe('lazy')
    expect(container.querySelector('[data-cena-heroi]')!.getAttribute('data-lado')).toBe('esquerda')
    expect(container.innerHTML).not.toMatch(/gradient/i)
  })

  it('DS1-I-12 CenaHeroi aceita as bordas de larguraMax (836 e 1115) e de costura e alturaChao (0 e 1)', () => {
    for (const larguraMax of [836, 1115]) expect(() => pintar(cena({ larguraMax }))).not.toThrow()
    for (const costura of [0, 1]) expect(() => pintar(cena({ costura }))).not.toThrow()
    for (const alturaChao of [0, 1]) expect(() => pintar(cena({ alturaChao }))).not.toThrow()
  })

  it('DS1-I-12 CenaHeroi lança: larguraMax fora de 836..1115 ou não finito', () => {
    for (const larguraMax of [835, 1116, 0, -960, Number.NaN, Number.POSITIVE_INFINITY]) lanca(cena({ larguraMax }))
  })

  it('DS1-I-12 CenaHeroi lança: costura ou alturaChao fora de 0..1 ou não finitos', () => {
    for (const costura of [-0.01, 1.01, Number.NaN]) lanca(cena({ costura }))
    for (const alturaChao of [-0.01, 1.01, Number.NaN]) lanca(cena({ alturaChao }))
  })

  it('DS1-I-12 CenaHeroi lança: src ou alt vazios, tamanho que não é inteiro positivo, idTitulo vazio', () => {
    lanca(cena({ imagem: imagem({ src: '' }) }))
    lanca(cena({ imagem: imagem({ src: '   ' }) }))
    lanca(cena({ recorte390: recorte({ src: '' }) }))
    lanca(cena({ alt: '' }))
    lanca(cena({ alt: '  ' }))
    for (const largura of [0, -1, 1.5, Number.NaN]) lanca(cena({ imagem: imagem({ largura }) }))
    for (const altura of [0, -1, 1.5, Number.NaN]) lanca(cena({ recorte390: recorte({ altura }) }))
    lanca(cena({ idTitulo: '' }))
  })

  it('DS1-I-12 CenaHeroi lança: parede que não é papel ou cacau, chão que não é areia, chao-noite ou nenhum', () => {
    lanca(cena({ parede: { esquerda: 'mel', direita: 'cacau' } }))
    lanca(cena({ parede: { esquerda: 'papel', direita: 'areia' } }))
    lanca(cena({ chao: { esquerda: 'papel', direita: 'chao-noite' } }))
    expect(() => pintar(cena({ chao: { esquerda: 'nenhum', direita: 'nenhum' } }))).not.toThrow()
  })

  it('DS1-I-12 CenaHeroi na noite (parede cacau dos dois lados) rende sem erro', () => {
    expect(() => pintar(cena({ parede: { esquerda: 'cacau', direita: 'cacau' }, chao: { esquerda: 'chao-noite', direita: 'chao-noite' } }))).not.toThrow()
  })
})

// ---------------------------------------------------------------------------------------------
// ProdutoEmMoldura

describe('DS1-I-12 ProdutoEmMoldura: a captura da tela sob a moldura, duas camadas, sem texto nem sombra', () => {
  const tela = (extra: Record<string, unknown> = {}) => ({ ...imagem({ largura: 780, altura: 1560 }), alt: 'Tela do Hoje com a última mamada', ...extra })
  const moldura = (extra: Record<string, unknown> = {}) => imagem({ src: '/produto/moldura-2x.webp', srcSet: '/produto/moldura-2x.webp 840w', largura: 840, altura: 1620, ...extra })
  const produto = (t: Record<string, unknown> = {}, m: Record<string, unknown> = {}) => (
    <ProdutoEmMoldura tela={tela(t)} moldura={moldura(m)} />
  )

  it('DS1-I-12 ProdutoEmMoldura rende figure[data-produto-moldura] com a tela e a moldura, nessa ordem', () => {
    const { container } = pintar(produto())
    const figura = container.querySelector<HTMLElement>('figure[data-produto-moldura]')!
    const t = figura.querySelector<HTMLImageElement>('img[data-produto-tela]')!
    const m = figura.querySelector<HTMLImageElement>('img[data-produto-moldura-arte]')!
    expect(t.getAttribute('alt')).toBe('Tela do Hoje com a última mamada')
    expect(m.getAttribute('alt')).toBe('')
    expect(m.getAttribute('aria-hidden')).toBe('true')
    expect(t.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(figura.querySelectorAll('img')).toHaveLength(2)
    expect(t.getAttribute('width')).toBe('780')
    expect(t.getAttribute('height')).toBe('1560')
    expect(m.getAttribute('width')).toBe('840')
    expect(m.getAttribute('height')).toBe('1620')
  })

  it('DS1-I-12 ProdutoEmMoldura não tem texto, legenda, aviso da tela, sombra, filtro, gradiente nem rotação', () => {
    const { container } = pintar(produto())
    const figura = container.querySelector('figure')!
    expect(figura.textContent).toBe('')
    expect(figura.querySelector('figcaption, [data-aviso], svg, canvas')).toBeNull()
    expect(container.innerHTML).not.toMatch(/box-shadow|filter|gradient|rotate|drop-shadow/i)
  })

  it('DS1-I-12 ProdutoEmMoldura lança: src vazio em qualquer camada, tamanho que não é inteiro positivo, alt da tela vazio', () => {
    lanca(produto({ src: '' }))
    lanca(produto({}, { src: '  ' }))
    for (const largura of [0, -2, 2.5, Number.NaN]) lanca(produto({ largura }))
    for (const altura of [0, -2, 2.5, Number.NaN]) lanca(produto({}, { altura }))
    lanca(produto({ alt: '' }))
  })

  it('DS1-I-12 ProdutoEmMoldura sem a moldura ou sem a tela lança (nenhum recurso reserva, nenhum estado vazio)', () => {
    // @ts-expect-error a moldura é obrigatória
    lanca(<ProdutoEmMoldura tela={tela()} />)
    // @ts-expect-error a tela é obrigatória
    lanca(<ProdutoEmMoldura moldura={moldura()} />)
  })
})

// ---------------------------------------------------------------------------------------------
// Legenda

describe('DS1-I-12 Legenda: uma linha de abertura, um nó de texto, prumo, sem rótulo antes', () => {
  it('DS1-I-12 Legenda rende um <p data-legenda> com exatamente um nó de texto e nenhum elemento filho', () => {
    const { container } = pintar(<Legenda texto="A mesma mamada, vista por quem chegou depois." tom="dia" />)
    const p = container.querySelector<HTMLElement>('p[data-legenda]')!
    expect(p.textContent).toBe('A mesma mamada, vista por quem chegou depois.')
    expect(p.childNodes).toHaveLength(1)
    expect(p.childNodes[0].nodeType).toBe(Node.TEXT_NODE)
    expect(p.children).toHaveLength(0)
    expect(container.querySelectorAll('[data-legenda]')).toHaveLength(1)
  })

  it('DS1-I-12 Legenda é o nível abertura, sem itálico, e não tem irmão antes (nada de rótulo)', () => {
    const { container } = pintar(<Legenda texto="Uma linha" tom="dia" />)
    const p = container.querySelector<HTMLElement>('p[data-legenda]')!
    expect(p.classList.contains('text-abertura')).toBe(true)
    expect(p.className).not.toMatch(/italic|cm-segunda-linha|sobretitulo/)
    expect(p.previousElementSibling).toBeNull()
  })

  it('DS1-I-12 Legenda: tom dia e tom noite vão para data-tom', () => {
    expect(pintar(<Legenda texto="Dia" tom="dia" />).container.querySelector('[data-legenda]')!.getAttribute('data-tom')).toBe('dia')
    expect(pintar(<Legenda texto="Noite" tom="noite" />).container.querySelector('[data-legenda]')!.getAttribute('data-tom')).toBe('noite')
  })

  it('DS1-I-12 Legenda com texto longo continua sendo um nó de texto só', () => {
    const longo = 'Uma frase que não cabe numa linha de celular e por isso quebra em várias, mas segue sendo um nó só. '.repeat(3).trim()
    const p = pintar(<Legenda texto={longo} tom="dia" />).container.querySelector<HTMLElement>('[data-legenda]')!
    expect(p.childNodes).toHaveLength(1)
  })

  it('DS1-I-12 Legenda lança: texto vazio ou só espaços, e tom que não é dia nem noite', () => {
    lanca(<Legenda texto="" tom="dia" />)
    lanca(<Legenda texto="   " tom="noite" />)
    // @ts-expect-error o tom é dia ou noite
    lanca(<Legenda texto="Uma linha" tom="madrugada" />)
  })
})

// ---------------------------------------------------------------------------------------------
// FaixaProva

describe('DS1-I-12 FaixaProva: título, texto e uma lista de fatos em linhas, nunca uma grade de blocos', () => {
  const itens = (n: number) => Array.from({ length: n }, (_, i) => `Fato número ${i + 1}`)

  it('DS1-I-12 FaixaProva rende h2, p e uma ul[data-prova-lista] com um li por item; o primeiro é abertura e os outros corpo', () => {
    const { container } = pintar(<FaixaProva titulo="O que fica registrado" texto="Cada registro leva o nome de quem o fez." itens={itens(4)} />)
    expect(container.querySelectorAll('h2')).toHaveLength(1)
    expect(container.querySelector('h2')!.textContent).toBe('O que fica registrado')
    expect(container.querySelector('p')!.textContent).toBe('Cada registro leva o nome de quem o fez.')
    const lista = container.querySelectorAll<HTMLElement>('ul[data-prova-lista]')
    expect(lista).toHaveLength(1)
    const lis = [...lista[0].querySelectorAll(':scope > li')]
    expect(lis.map((li) => li.textContent)).toEqual(itens(4))
    expect(lis[0].classList.contains('text-abertura') || lis[0].querySelector('.text-abertura') !== null).toBe(true)
    for (const li of lis.slice(1)) {
      expect(li.classList.contains('text-corpo') || li.querySelector('.text-corpo') !== null).toBe(true)
      expect(li.classList.contains('text-abertura') || li.querySelector('.text-abertura') !== null).toBe(false)
    }
  })

  it('DS1-I-12 FaixaProva não tem pessoa, avatar, citação nem cartão', () => {
    const { container } = pintar(<FaixaProva titulo="T" texto="Texto" itens={itens(3)} />)
    expect(container.querySelector('img, figure, blockquote, cite, [class*="avatar"], [class*="cartao"], [data-painel]')).toBeNull()
  })

  it('DS1-I-12 FaixaProva aceita de 2 a 6 itens e lança com 1, 7 ou nenhum', () => {
    for (const n of [2, 3, 6]) expect(() => pintar(<FaixaProva titulo="T" texto="Texto" itens={itens(n)} />), String(n)).not.toThrow()
    for (const n of [0, 1, 7]) lanca(<FaixaProva titulo="T" texto="Texto" itens={itens(n)} />)
  })

  it('DS1-I-12 FaixaProva lança: um item vazio, ou o título ou o texto vazios', () => {
    lanca(<FaixaProva titulo="T" texto="Texto" itens={['Um', '  ', 'Três']} />)
    lanca(<FaixaProva titulo="" texto="Texto" itens={itens(3)} />)
    lanca(<FaixaProva titulo="T" texto="  " itens={itens(3)} />)
  })

  it('DS1-I-12 FaixaProva com item longo: o item quebra dentro do li, sem estilo de largura fixa', () => {
    const longo = 'Um fato bem comprido que passa de uma linha no celular e continua sendo um item só da lista. '.repeat(3).trim()
    const { container } = pintar(<FaixaProva titulo="T" texto="Texto" itens={[longo, 'Curto']} />)
    expect(container.querySelectorAll('[data-prova-lista] > li')).toHaveLength(2)
    expect(container.querySelector('[data-prova-lista]')!.getAttribute('style')).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------
// Perguntas

describe('DS1-I-12 Perguntas: h2 e uma lista de h3 com a resposta sempre à vista, no máximo 8', () => {
  const itens = (n: number) => Array.from({ length: n }, (_, i) => ({ pergunta: `Pergunta ${i + 1}?`, resposta: `Resposta ${i + 1}.` }))

  it('DS1-I-12 Perguntas rende um h2, cada pergunta num h3 de titulo-4 e cada resposta num p de corpo, todas no DOM', () => {
    const { container } = pintar(<Perguntas titulo="Perguntas frequentes" itens={itens(3)} />)
    expect(container.querySelectorAll('h2')).toHaveLength(1)
    const h3 = [...container.querySelectorAll('h3')]
    expect(h3.map((h) => h.textContent)).toEqual(['Pergunta 1?', 'Pergunta 2?', 'Pergunta 3?'])
    for (const h of h3) expect(h.classList.contains('text-titulo-4')).toBe(true)
    const respostas = [...container.querySelectorAll('p')]
    expect(respostas.map((p) => p.textContent)).toEqual(['Resposta 1.', 'Resposta 2.', 'Resposta 3.'])
    for (const p of respostas) expect(p.classList.contains('text-corpo')).toBe(true)
  })

  it('DS1-I-12 Perguntas: nada de abrir e fechar — sem button, details, aria-expanded, hidden nem aria-hidden', () => {
    const { container } = pintar(<Perguntas titulo="Perguntas frequentes" itens={itens(5)} />)
    expect(container.querySelector('button, details, summary, [aria-expanded], [hidden], [aria-hidden="true"], [role="button"]')).toBeNull()
    expect(container.querySelector('ul, ol, dl')).not.toBeNull()
  })

  it('DS1-I-12 Perguntas: a ordem do documento é a das perguntas, e o h2 vem antes de todas', () => {
    const { container } = pintar(<Perguntas titulo="Perguntas frequentes" itens={itens(2)} />)
    const titulos = [...container.querySelectorAll('h2, h3')].map((h) => h.tagName)
    expect(titulos).toEqual(['H2', 'H3', 'H3'])
  })

  it('DS1-I-12 Perguntas com 0 itens não renderiza nada (nem o h2); com 8 rende; com 9 lança', () => {
    expect(pintar(<Perguntas titulo="Perguntas frequentes" itens={[]} />).container.innerHTML).toBe('')
    expect(() => pintar(<Perguntas titulo="Perguntas frequentes" itens={itens(8)} />)).not.toThrow()
    lanca(<Perguntas titulo="Perguntas frequentes" itens={itens(9)} />)
  })

  it('DS1-I-12 Perguntas lança: pergunta vazia, resposta vazia ou título vazio', () => {
    lanca(<Perguntas titulo="Perguntas frequentes" itens={[{ pergunta: '', resposta: 'R' }]} />)
    lanca(<Perguntas titulo="Perguntas frequentes" itens={[{ pergunta: 'P?', resposta: '   ' }]} />)
    lanca(<Perguntas titulo="" itens={itens(2)} />)
  })

  it('DS1-I-12 Perguntas com resposta longa: a resposta inteira está no DOM, em um parágrafo', () => {
    const longa = 'Uma resposta bem comprida que passa de várias linhas no celular. '.repeat(10).trim()
    const { container } = pintar(<Perguntas titulo="Perguntas frequentes" itens={[{ pergunta: 'P?', resposta: longa }]} />)
    expect(container.querySelector('p')!.textContent).toBe(longa)
  })
})

// ---------------------------------------------------------------------------------------------
// BotaoLargo

describe('DS1-I-12 BotaoLargo: a pílula da largura do quadro no celular, uma linha de até 28 caracteres', () => {
  it('DS1-I-12 BotaoLargo rende <a data-botao-largo class="cm-botao ..."> para o destino, com o rótulo como único texto', () => {
    const { container } = pintar(<BotaoLargo rotulo="Criar conta" para="/criar-conta" variante="primario" />)
    const a = container.querySelector<HTMLAnchorElement>('a[data-botao-largo]')!
    expect(a.getAttribute('href')).toBe('/criar-conta')
    expect(a.classList.contains('cm-botao')).toBe(true)
    expect(a.textContent).toBe('Criar conta')
    expect(a.hasAttribute('data-botao-mel')).toBe(false)
  })

  it('DS1-I-12 BotaoLargo mel: leva data-botao-mel, para a medição de mel sobre o cacau', () => {
    const { container } = pintar(<BotaoLargo rotulo="Criar conta" para="/criar-conta" variante="mel" />)
    const a = container.querySelector<HTMLElement>('a[data-botao-largo]')!
    expect(a.hasAttribute('data-botao-mel')).toBe(true)
    expect(a.classList.contains('cm-botao-mel')).toBe(true)
  })

  it('DS1-I-12 BotaoLargo: 28 caracteres passam e 29 lançam; vazio, só espaços e destino sem "/" lançam', () => {
    expect(() => pintar(<BotaoLargo rotulo={'x'.repeat(28)} para="/a" variante="primario" />)).not.toThrow()
    lanca(<BotaoLargo rotulo={'x'.repeat(29)} para="/a" variante="primario" />)
    lanca(<BotaoLargo rotulo="" para="/a" variante="primario" />)
    lanca(<BotaoLargo rotulo="   " para="/a" variante="primario" />)
    lanca(<BotaoLargo rotulo="Criar conta" para="criar-conta" variante="primario" />)
    lanca(<BotaoLargo rotulo="Criar conta" para="" variante="primario" />)
    // @ts-expect-error a variante é primario ou mel
    lanca(<BotaoLargo rotulo="Criar conta" para="/a" variante="contorno" />)
  })

  it('DS1-I-12 BotaoLargo é focável pelo teclado (um link com href) e não é um botão desativado', () => {
    const { container } = pintar(<BotaoLargo rotulo="Criar conta" para="/criar-conta" variante="primario" />)
    const a = container.querySelector<HTMLAnchorElement>('a[data-botao-largo]')!
    a.focus()
    expect(document.activeElement).toBe(a)
    expect(a.getAttribute('aria-disabled')).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------
// Fechamento

describe('DS1-I-12 Fechamento: um h2 de titulo-1 e uma pílula do tamanho do BotaoLargo, o único bloco centrado', () => {
  it('DS1-I-12 Fechamento de dia: h2, uma pílula de cacau (primario) para o destino, sem data-botao-mel', () => {
    const { container } = pintar(<Fechamento titulo="Pode entrar." acao={{ rotulo: 'Criar conta', para: '/criar-conta' }} tom="dia" />)
    const h2 = container.querySelector('h2')!
    expect(h2.textContent).toBe('Pode entrar.')
    expect(h2.classList.contains('text-titulo-1')).toBe(true)
    const links = container.querySelectorAll<HTMLAnchorElement>('a')
    expect(links).toHaveLength(1)
    expect(links[0].hasAttribute('data-botao-largo')).toBe(true)
    expect(links[0].getAttribute('href')).toBe('/criar-conta')
    expect(links[0].textContent).toBe('Criar conta')
    expect(links[0].hasAttribute('data-botao-mel')).toBe(false)
    expect(links[0].classList.contains('cm-botao-primario')).toBe(true)
  })

  it('DS1-I-12 Fechamento de noite: a pílula é de mel (data-botao-mel)', () => {
    const { container } = pintar(<Fechamento titulo="Pode entrar." acao={{ rotulo: 'Criar conta', para: '/criar-conta' }} tom="noite" />)
    const link = container.querySelector<HTMLAnchorElement>('a[data-botao-largo]')!
    expect(link.hasAttribute('data-botao-mel')).toBe(true)
    expect(link.classList.contains('cm-botao-mel')).toBe(true)
    expect(container.querySelector('[data-tom="noite"]')).not.toBeNull()
  })

  it('DS1-I-12 Fechamento lança: título vazio, rótulo vazio ou com mais de 28, destino sem "/", tom inválido', () => {
    const acao = { rotulo: 'Criar conta', para: '/criar-conta' }
    lanca(<Fechamento titulo="" acao={acao} tom="dia" />)
    lanca(<Fechamento titulo="Pode entrar." acao={{ ...acao, rotulo: '' }} tom="dia" />)
    lanca(<Fechamento titulo="Pode entrar." acao={{ ...acao, rotulo: 'x'.repeat(29) }} tom="dia" />)
    lanca(<Fechamento titulo="Pode entrar." acao={{ ...acao, para: 'criar-conta' }} tom="dia" />)
    // @ts-expect-error o tom é dia ou noite
    lanca(<Fechamento titulo="Pode entrar." acao={acao} tom="madrugada" />)
  })

  it('DS1-I-12 Fechamento com título longo: o h2 é um só e quebra dentro do bloco', () => {
    const longo = 'Um fechamento com um título bem comprido que precisa quebrar em duas ou três linhas no celular'
    const { container } = pintar(<Fechamento titulo={longo} acao={{ rotulo: 'Criar conta', para: '/criar-conta' }} tom="dia" />)
    expect(container.querySelectorAll('h2')).toHaveLength(1)
    expect(container.querySelector('h2')!.textContent).toBe(longo)
  })
})
