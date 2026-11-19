import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CUIDADO, IMAGENS_CUIDADO } from '../../conteudo/casa/cuidado.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// CLONE-CUIDADO: /cuidado-compartilhado nas seções da casa. O jsdom não faz layout: aqui ficam a ordem das faixas, os
// chãos, o ritmo, o texto (o deck inteiro e nada mais), as imagens (nomes e atributos) e o que a página não pode ter.
// A geometria e a dobra são do olhar nas capturas.

const ROTA = '/cuidado-compartilhado'

/** Toda frase do deck que a página guarda, em ordem (as folhas de `CUIDADO`). */
function folhas(valor: unknown): string[] {
  if (typeof valor === 'string') return [valor]
  if (Array.isArray(valor)) return valor.flatMap(folhas)
  if (valor && typeof valor === 'object') return Object.values(valor).flatMap(folhas)
  return []
}

const DECK = new Set(folhas(CUIDADO))
// Fora do conjunto "tem de aparecer": cc.aba é o título da aba (document.title) e cc.papeis.legenda é o nome da lista
// (aria-label), que a página não desenha.
const FORA_DO_TEXTO = new Set<string>([CUIDADO.aba, CUIDADO.papeis.legenda])

function nosDeTexto(raiz: Element): string[] {
  const caminhante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
  const textos: string[] = []
  for (let no = caminhante.nextNode(); no; no = caminhante.nextNode()) {
    const texto = (no.textContent ?? '').trim()
    if (texto !== '') textos.push(texto)
  }
  return textos
}

function faixas(container: HTMLElement): HTMLElement[] {
  const casa = container.querySelector('main > [data-casa]')!
  return [...casa.children] as HTMLElement[]
}

const fundoDe = (faixa: Element) => faixa.getAttribute('data-faixa-fundo')

describe('CUID-I-01 a ordem das faixas, num só PaginaCasa', () => {
  it('um <main> com um [data-casa], e as seis faixas na ordem do spec', () => {
    const { container } = renderizarRota(ROTA)
    expect(container.querySelectorAll('main')).toHaveLength(1)
    const casa = container.querySelectorAll('main > [data-casa]')
    expect(casa).toHaveLength(1)
    expect(container.querySelectorAll('[data-casa]')).toHaveLength(1)
    const bandas = faixas(container)
    expect(bandas).toHaveLength(6)
    for (const banda of bandas) expect(banda.hasAttribute('data-faixa')).toBe(true)

    // 1: a abertura, uma section da página; 2 a 5: FaixaInteira nomeadas pelo h2; 6: o fechamento.
    expect(bandas[0].tagName).toBe('SECTION')
    expect(bandas[0].getAttribute('aria-labelledby')).toBe('cc-h1')
    expect(bandas[0].querySelector('h1')!.id).toBe('cc-h1')
    expect(bandas[1].querySelector('h2')!.textContent).toBe(CUIDADO.papeis.h2)
    expect(bandas[2].querySelector('h2')!.textContent).toBe(CUIDADO.sono.h2)
    expect(bandas[3].querySelector('h2')!.textContent).toBe(CUIDADO.senha.h2)
    expect(bandas[4].querySelector('h2')!.textContent).toBe(CUIDADO.parar.h2)
    expect(bandas[5].querySelector('[data-fechamento]')).not.toBeNull()
    expect(bandas[5].querySelector('[data-fechamento] h2')!.textContent).toBe(CUIDADO.fecho.h2)
  })

  it('a abertura traz a cena, o h1, o texto, a ação, a moldura e o "três", nessa ordem', () => {
    const { container } = renderizarRota(ROTA)
    const abertura = faixas(container)[0]
    const cena = abertura.querySelector('picture img')!
    const h1 = abertura.querySelector('h1')!
    const lede = [...abertura.querySelectorAll('p')].find((p) => p.textContent === CUIDADO.lede)!
    const acao = abertura.querySelector('a[data-botao-largo]')!
    const moldura = abertura.querySelector('figure[data-produto-moldura]')!
    const tres = [...abertura.querySelectorAll('h2')].find((h) => h.textContent === CUIDADO.tres.h2)!
    const ordem = [cena, h1, lede, acao, moldura, tres]
    for (let i = 1; i < ordem.length; i += 1) {
      expect(ordem[i - 1].compareDocumentPosition(ordem[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `passo ${i}`).toBeTruthy()
    }
    expect(abertura.querySelectorAll('h1')).toHaveLength(1)
    expect(h1.textContent).toBe('A babá vê o quê?')
  })

  it('o fechamento é um Fechamento de noite com a ação para /criar-conta', () => {
    const { container } = renderizarRota(ROTA)
    const fecho = container.querySelector('[data-fechamento]')!
    expect(fecho.getAttribute('data-tom')).toBe('noite')
    const link = within(fecho as HTMLElement).getByRole('link', { name: CUIDADO.fecho.cta2 })
    expect(link.getAttribute('href')).toBe('/criar-conta')
  })

  it('há duas ações "Criar conta" no main (a da abertura, primária, e a do fim), as duas para /criar-conta', () => {
    const { container } = renderizarRota(ROTA)
    const links = [...container.querySelectorAll('main a[data-botao-largo]')]
    expect(links.map((a) => a.textContent)).toEqual([CUIDADO.cta1, CUIDADO.fecho.cta2])
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/criar-conta', '/criar-conta'])
    expect(links[0].getAttribute('data-botao')).toBe('primario')
    expect(links[1].hasAttribute('data-botao-mel')).toBe(true)
  })
})

describe('CUID-I-05 os chãos e o ritmo', () => {
  it('papel, areia, papel, cacau, papel, cacau, sem dois chãos iguais lado a lado', () => {
    const { container } = renderizarRota(ROTA)
    const chaos = faixas(container).map(fundoDe)
    expect(chaos).toEqual(['papel', 'areia', 'papel', 'cacau', 'papel', 'cacau'])
    for (let i = 1; i < chaos.length; i += 1) expect(chaos[i], `faixa ${i + 1}`).not.toBe(chaos[i - 1])
    expect(chaos).not.toContain('mel')
  })

  it('o ritmo (título, texto, imagem, legenda, nessa ordem) não aparece em três faixas seguidas', () => {
    const { container } = renderizarRota(ROTA)
    const tipos = (faixa: Element): string => {
      const achados: Array<[string, Element]> = []
      const primeiro = (tipo: string, seletor: string) => {
        const no = faixa.querySelector(seletor)
        if (no) achados.push([tipo, no])
      }
      primeiro('titulo', 'h1, h2')
      primeiro('texto', 'p:not([data-legenda])')
      primeiro('imagem', 'img:not([data-produto-moldura-arte])')
      primeiro('legenda', 'p[data-legenda]')
      achados.sort((a, b) => (a[1].compareDocumentPosition(b[1]) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      return achados.map(([tipo]) => tipo).join('>')
    }
    const padroes = faixas(container).map(tipos)
    const ritmo = 'titulo>texto>imagem>legenda'
    const casam = padroes.map((padrao) => padrao === ritmo)
    for (let i = 2; i < casam.length; i += 1) {
      expect(casam[i - 2] && casam[i - 1] && casam[i], `faixas ${i - 1} a ${i + 1}: ${padroes.join(' | ')}`).toBe(false)
    }
    // Uma faixa sem imagem nunca casa: a de "quando alguém para de cuidar" e o fechamento.
    expect(casam[4]).toBe(false)
    expect(casam[5]).toBe(false)
  })
})

describe('CUID-I-04 o texto é o deck, e só o deck', () => {
  it('todo nó de texto do main e todo alt não vazio é uma frase do deck', () => {
    const { container } = renderizarRota(ROTA)
    const principal = container.querySelector('main')!
    const textos = nosDeTexto(principal)
    const alts = [...principal.querySelectorAll('img[alt]')].map((img) => img.getAttribute('alt')!).filter((alt) => alt !== '')
    for (const texto of [...textos, ...alts]) expect(DECK.has(texto), texto).toBe(true)
  })

  it('toda frase do deck que se desenha aparece (31 frases: o título da aba e o nome da lista ficam de fora do texto)', () => {
    const { container } = renderizarRota(ROTA)
    const principal = container.querySelector('main')!
    const vistas = new Set([
      ...nosDeTexto(principal),
      ...[...principal.querySelectorAll('img[alt]')].map((img) => img.getAttribute('alt')!),
    ])
    expect(DECK.size).toBe(30) // 31 ids do deck; "Criar conta" (cc.cta1 e cc.cta2) é a mesma frase
    const faltam = [...DECK].filter((frase) => !FORA_DO_TEXTO.has(frase) && !vistas.has(frase))
    expect(faltam).toEqual([])
  })

  it('o título da aba é o do deck e o nome da lista de papéis é o aria-label', () => {
    const { container } = renderizarRota(ROTA)
    expect(document.title).toBe(CUIDADO.aba)
    expect(container.querySelector(`ul[aria-label="${CUIDADO.papeis.legenda}"]`)).not.toBeNull()
  })

  it('o h1 é "A babá vê o quê?", e é o único', () => {
    renderizarRota(ROTA)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0].textContent).toBe('A babá vê o quê?')
  })
})

describe('CUID-I-06 as imagens', () => {
  it('CC-S1 é uma imagem comum, na primeira faixa: eager, fetchpriority high, tamanho do maior arquivo', () => {
    const { container } = renderizarRota(ROTA)
    const abertura = faixas(container)[0]
    expect(container.querySelector('[data-cena-heroi]')).toBeNull()
    const cena = abertura.querySelector<HTMLImageElement>('picture img')!
    expect(cena.getAttribute('alt')).toBe(CUIDADO.alt.cena1)
    expect(cena.getAttribute('loading')).toBe('eager')
    expect(cena.getAttribute('fetchpriority')).toBe('high')
    expect(cena.getAttribute('src')).toBe('/cenas/cuidado/m12-heroi-600w.webp')
    expect(cena.getAttribute('srcset')).toContain('/cenas/cuidado/m12-heroi-981w.webp 981w')
    expect(cena.getAttribute('width')).toBe('981')
    expect(cena.getAttribute('height')).toBe('1082')
    const recorte = abertura.querySelector('picture source')!
    expect(recorte.getAttribute('srcset')).toContain('/cenas/cuidado/m12-heroi-390c-350w.webp 350w')
    expect(recorte.getAttribute('srcset')).toContain('/cenas/cuidado/m12-heroi-390c-700w.webp 700w')
  })

  it('as outras cenas são lazy com decoding async, com os arquivos e os tamanhos do spec', () => {
    const { container } = renderizarRota(ROTA)
    const bandas = faixas(container)
    const casos = [
      [bandas[2], 'm05-maos', CUIDADO.alt.cena2, '1472', '649', '390c-740w'],
      [bandas[3], 'm01-icaro', CUIDADO.alt.cena3, '1152', '665', '390c-780w'],
    ] as const
    for (const [banda, nome, alt, largura, altura, recorte] of casos) {
      const cena = banda.querySelector<HTMLImageElement>('picture img')!
      expect(cena.getAttribute('alt')).toBe(alt)
      expect(cena.getAttribute('loading')).toBe('lazy')
      expect(cena.getAttribute('decoding')).toBe('async')
      expect(cena.hasAttribute('fetchpriority')).toBe(false)
      expect(cena.getAttribute('src')).toContain(`/cenas/cuidado/${nome}-`)
      expect(cena.getAttribute('width')).toBe(largura)
      expect(cena.getAttribute('height')).toBe(altura)
      expect(banda.querySelector('picture source')!.getAttribute('srcset')).toContain(`${nome}-${recorte}`)
    }
    expect(bandas[2].querySelector('[data-legenda]')).toBeNull() // as mãos não levam legenda
  })

  it('há uma só tela de produto, a Família, na moldura do dia, em papel/areia (nunca no cacau)', () => {
    const { container } = renderizarRota(ROTA)
    const telas = container.querySelectorAll<HTMLImageElement>('[data-produto-tela]')
    expect(telas).toHaveLength(1)
    const tela = telas[0]
    expect(tela.getAttribute('alt')).toBe(CUIDADO.alt.tela1)
    expect(tela.getAttribute('src')).toBe(IMAGENS_CUIDADO.tela.src)
    expect(tela.getAttribute('srcset')).toBe(IMAGENS_CUIDADO.tela.srcSet)
    expect(tela.getAttribute('width')).toBe('640')
    expect(tela.getAttribute('height')).toBe('1385')
    expect(tela.closest('[data-faixa-fundo="cacau"]')).toBeNull()
    expect(tela.closest('[data-faixa]')).toBe(faixas(container)[0])
    expect(container.querySelectorAll('[data-produto-moldura-arte]')).toHaveLength(1)
    expect(container.querySelector('[data-produto-moldura-arte]')!.getAttribute('src')).toBe('/molduras/moldura-dia.png')
  })

  it('toda imagem do main tem largura e altura, e nenhuma é do acervo antigo', () => {
    const { container } = renderizarRota(ROTA)
    const imagens = [...container.querySelectorAll<HTMLImageElement>('main img')]
    expect(imagens).toHaveLength(5)
    for (const imagem of imagens) {
      expect(Number(imagem.getAttribute('width')), imagem.outerHTML).toBeGreaterThan(0)
      expect(Number(imagem.getAttribute('height')), imagem.outerHTML).toBeGreaterThan(0)
      const origem = `${imagem.getAttribute('src')} ${imagem.getAttribute('srcset') ?? ''}`
      expect(origem).not.toMatch(/cenas\/publicas|ilustracoes/)
    }
  })
})

describe('CUID-I-01 os papéis: uma lista de três linhas', () => {
  it('é um ul com três li, cada um com o nome em h3, para quem é e o que pode', () => {
    const { container } = renderizarRota(ROTA)
    const lista = within(container.querySelector('main') as HTMLElement).getByRole('list', { name: CUIDADO.papeis.legenda })
    expect(lista.tagName).toBe('UL')
    const itens = [...lista.children]
    expect(itens).toHaveLength(3)
    expect(itens.every((li) => li.tagName === 'LI')).toBe(true)
    CUIDADO.papeis.linhas.forEach((linha, i) => {
      expect(itens[i].querySelector('h3')!.textContent).toBe(linha.nome)
      expect([...itens[i].querySelectorAll('p')].map((p) => p.textContent)).toEqual([linha.quem, linha.pode])
    })
    // Nunca cartões: nada de data-h cartao, de [data-painel] nem de cartão flutuante.
    expect(container.querySelector('main [data-h~="cartao"], main [data-painel], main .cm-flutuante')).toBeNull()
  })
})

describe('CUID-I-02 o que a página não tem', () => {
  it('nenhum aparelho desenhado, nenhuma cena herói, nenhum cartão, nenhuma ilustração antiga', () => {
    const { container } = renderizarRota(ROTA)
    expect(container.querySelector('[data-aparelho]')).toBeNull()
    expect(container.querySelector('main [data-cena-heroi], main [data-cena], main [data-ilustracao]')).toBeNull()
    expect(container.querySelector('main [data-cartao-plano], main [data-brilho]')).toBeNull()
  })

  it('o arquivo da página e os da pasta não importam as peças antigas nem citam o acervo antigo', () => {
    const arquivos = [
      'src/paginas/publicas/CuidadoCompartilhado.tsx',
      'src/componentes/cuidado-casa/AberturaCuidado.tsx',
      'src/componentes/cuidado-casa/CenaDaPagina.tsx',
      'src/componentes/cuidado-casa/FaixaComCena.tsx',
      'src/componentes/cuidado-casa/PapeisDaFamilia.tsx',
      'src/conteudo/casa/cuidado.ts',
    ]
    const proibido =
      /CenaEstudio|CartaoFlutuante|PainelCampo|CartoesApp|Abertura\.tsx|CabecaDeSecao|Numeros|Passos|TabelaTexto|Ilustracao|campo\/Titulo|CenaCacau|CenaHeroi|data-aparelho|cenas\/publicas|ilustracoes\/|publicas-destaque|movimento\/|from 'motion|from "motion/
    for (const arquivo of arquivos) {
      const texto = readFileSync(join(process.cwd(), arquivo), 'utf8')
      expect(texto.match(proibido)?.[0], arquivo).toBeUndefined()
    }
  })

  it('o CSS da página: só espaço e cor de token, sem sombra, gradiente, filtro, itálico, caixa alta nem movimento', () => {
    const css = readFileSync(join(process.cwd(), 'src/componentes/cuidado-casa/cuidado-casa.css'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    expect(css).not.toMatch(/box-shadow|text-shadow|gradient|blur|backdrop|filter|italic|uppercase|@keyframes|animation|transition|will-change|view-transition/)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/opacity|visibility|transform/)
    // Todo vão (margin, padding, gap) é token, 0, auto, %, ou um cálculo sobre tokens.
    const vaos = css.match(/(?:^|[;{\s])(?:margin|padding|gap|column-gap|row-gap)[a-z-]*\s*:[^;}]+/g) ?? []
    for (const vao of vaos) expect(vao.replace(/var\([^)]*\)/g, ''), vao).not.toMatch(/\d+(?:\.\d+)?px/)
  })
})

describe('CUID-I-12 o gancho do cabeçalho', () => {
  it('põe data-pagina-cuidado no <html> enquanto a página está montada e tira ao sair', () => {
    const { unmount } = renderizarRota(ROTA)
    expect(document.documentElement.hasAttribute('data-pagina-cuidado')).toBe(true)
    unmount()
    expect(document.documentElement.hasAttribute('data-pagina-cuidado')).toBe(false)
  })
})
