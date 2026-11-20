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

// As três cenas saem do vite-imagetools (um mestre por vaga em src/assets/cenas/cuidado): no teste a URL é
// `/@imagetools/<hash>`, no build é um arquivo com hash em /assets. Confere-se a forma, as larguras e as fontes AVIF.
const URL_GERADA = /^\/@imagetools\/[\w-]+$/
const larguras = (srcset: string | null) =>
  (srcset ?? '').split(',').map((parte) => Number(parte.trim().split(/\s+/)[1]?.replace(/w$/, '')))

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

/** O texto de cada bloco do main (título, parágrafo, ação): as horas em <strong> ficam dentro da frase do bloco. */
function blocosDeTexto(raiz: Element): string[] {
  // `dt` e `dd` são os campos de cada papel; `[data-cc-rotulo-cab]` é o cabeçalho (aria-hidden) das colunas dos papéis.
  return [...raiz.querySelectorAll('h1, h2, h3, p, a, dt, dd, [data-cc-rotulo-cab]')]
    .map((no) => (no.textContent ?? '').trim())
    .filter((t) => t !== '')
}

/** O CSS da página, sem os comentários. */
function lerCss(): string {
  return readFileSync(join(process.cwd(), 'src/componentes/cuidado-casa/cuidado-casa.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

describe('CUID-I-04 o texto é o deck, e só o deck', () => {
  it('todo bloco de texto do main e todo alt não vazio é uma frase do deck', () => {
    const { container } = renderizarRota(ROTA)
    const principal = container.querySelector('main')!
    const textos = blocosDeTexto(principal)
    const alts = [...principal.querySelectorAll('img[alt]')].map((img) => img.getAttribute('alt')!).filter((alt) => alt !== '')
    for (const texto of [...textos, ...alts]) expect(DECK.has(texto), texto).toBe(true)
    // Nenhum nó de texto solto fora de um bloco: cada nó está dentro de um h1, h2, h3, p ou a.
    for (const texto of nosDeTexto(principal)) expect(textos.some((bloco) => bloco.includes(texto)), texto).toBe(true)
  })

  it('toda frase do deck que se desenha aparece (o título da aba e o nome da lista ficam de fora do texto)', () => {
    const { container } = renderizarRota(ROTA)
    const principal = container.querySelector('main')!
    const vistas = new Set([
      ...blocosDeTexto(principal),
      ...[...principal.querySelectorAll('img[alt]')].map((img) => img.getAttribute('alt')!),
    ])
    // 30 antes de CUIDADO-P3: o lede trocou de frase, os três `pode` saíram e entraram os três `ve`, os três `muda` e os
    // três rótulos (Quem é, O que vê, O que muda). "Criar conta" (cc.cta1 e cc.cta2) é a mesma frase.
    expect(DECK.size).toBe(36)
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
    expect(cena.getAttribute('src')).toMatch(URL_GERADA)
    expect(larguras(cena.getAttribute('srcset'))).toEqual([600, 981])
    expect(cena.getAttribute('srcset')).toContain(cena.getAttribute('src')!)
    expect(cena.getAttribute('sizes')).toBe('(min-width: 1440px) 600px, 42vw')
    expect(cena.getAttribute('width')).toBe('981')
    expect(cena.getAttribute('height')).toBe('1082')
    // O recorte de 390 (350 × 220) cortava Ícaro na borda e as pernas na base: abaixo de 1024 vale a placa
    // inteira (o teste "POLISH-CUIDADO ... placa inteira" abaixo).
    expect(abertura.querySelector('picture source')).not.toBeNull()
    // O AVIF vem antes do WebP de cada caso: o celular (com `media`) e depois o largo (sem `media`), e só então a <img>.
    const fontes = [...abertura.querySelectorAll('picture source')]
    expect(fontes.map((f) => [f.getAttribute('type'), f.getAttribute('media')])).toEqual([
      ['image/avif', '(max-width: 1023.98px)'],
      [null, '(max-width: 1023.98px)'],
      ['image/avif', null],
    ])
    expect(larguras(fontes[2].getAttribute('srcset'))).toEqual([600, 981])
    expect(fontes[2].getAttribute('sizes')).toBe('(min-width: 1440px) 600px, 42vw')
    expect(fontes[2].nextElementSibling).toBe(cena)
  })

  it('largura e altura de cada cena (largo e celular) são as de sempre, e há um AVIF de cada uma', () => {
    const esperado = {
      cena1: { largo: [981, 1082], celular: [981, 1082] },
      cena2: { largo: [1472, 649], celular: [740, 651] },
      cena3: { largo: [1152, 665], celular: [780, 664] },
    } as const
    for (const [cena, tamanhos] of Object.entries(esperado)) {
      for (const lado of ['largo', 'celular'] as const) {
        const imagem = IMAGENS_CUIDADO[cena as keyof typeof esperado][lado]
        expect([imagem.largura, imagem.altura], `${cena}.${lado}`).toEqual(tamanhos[lado])
        expect(imagem.avif, `${cena}.${lado}.avif`).toMatch(/@imagetools\//)
        expect(larguras(imagem.avif ?? null), `${cena}.${lado}`).toEqual(larguras(imagem.srcSet))
      }
    }
  })

  it('as outras cenas são lazy com decoding async, com os arquivos e os tamanhos do spec', () => {
    const { container } = renderizarRota(ROTA)
    const bandas = faixas(container)
    const casos = [
      [bandas[2], CUIDADO.alt.cena2, '1472', '649', [800, 1472], [390, 740], '(min-width: 1440px) 800px, 56vw'],
      [bandas[3], CUIDADO.alt.cena3, '1152', '665', [760, 1152], [390, 780], '(min-width: 1440px) 760px, 53vw'],
    ] as const
    for (const [banda, alt, largura, altura, largos, celulares, sizes] of casos) {
      const cena = banda.querySelector<HTMLImageElement>('picture img')!
      expect(cena.getAttribute('alt')).toBe(alt)
      expect(cena.getAttribute('loading')).toBe('lazy')
      expect(cena.getAttribute('decoding')).toBe('async')
      expect(cena.hasAttribute('fetchpriority')).toBe(false)
      expect(cena.getAttribute('src')).toMatch(URL_GERADA)
      expect(larguras(cena.getAttribute('srcset'))).toEqual(largos)
      expect(cena.getAttribute('sizes')).toBe(sizes)
      expect(cena.getAttribute('width')).toBe(largura)
      expect(cena.getAttribute('height')).toBe(altura)
      // O recorte do celular (AVIF antes do WebP, mesmo `media`), depois o AVIF largo, e só então a <img>.
      const fontes = [...banda.querySelectorAll('picture source')]
      expect(fontes.map((f) => [f.getAttribute('type'), f.getAttribute('media')])).toEqual([
        ['image/avif', '(max-width: 1023.98px)'],
        [null, '(max-width: 1023.98px)'],
        ['image/avif', null],
      ])
      expect(larguras(fontes[0].getAttribute('srcset'))).toEqual(celulares)
      expect(larguras(fontes[1].getAttribute('srcset'))).toEqual(celulares)
      expect(larguras(fontes[2].getAttribute('srcset'))).toEqual(largos)
      expect(fontes[2].nextElementSibling).toBe(cena)
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

describe('CUID-I-01 os papéis: uma lista de três linhas, os mesmos três campos em cada uma', () => {
  it('é um ul com três li, cada um com o nome em h3 e uma <dl> de quem é, o que vê e o que muda', () => {
    const { container } = renderizarRota(ROTA)
    const lista = within(container.querySelector('main') as HTMLElement).getByRole('list', { name: CUIDADO.papeis.legenda })
    expect(lista.tagName).toBe('UL')
    const itens = [...lista.children]
    expect(itens).toHaveLength(3)
    expect(itens.every((li) => li.tagName === 'LI')).toBe(true)
    CUIDADO.papeis.linhas.forEach((linha, i) => {
      expect(itens[i].querySelector('h3')!.textContent).toBe(linha.nome)
      const dl = itens[i].querySelector('dl')!
      expect(dl, `dl de ${linha.nome}`).not.toBeNull()
      // Os mesmos três campos, na mesma ordem, com o rótulo curto no <dt>.
      expect([...dl.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual([...CUIDADO.papeis.rotulos])
      expect([...dl.querySelectorAll('dd')].map((dd) => dd.textContent)).toEqual([linha.quem, linha.ve, linha.muda])
      expect(itens[i].querySelectorAll('p')).toHaveLength(0)
    })
    // Nunca cartões: nada de data-h cartao, de [data-painel] nem de cartão flutuante.
    expect(container.querySelector('main [data-h~="cartao"], main [data-painel], main .cm-flutuante')).toBeNull()
  })

  it('os rótulos são curtos: Quem é, O que vê, O que muda', () => {
    expect([...CUIDADO.papeis.rotulos]).toEqual(['Quem é', 'O que vê', 'O que muda'])
  })

  it('o cabeçalho das colunas é aria-hidden e repete os três rótulos, na ordem; os <dt> continuam no DOM', () => {
    const { container } = renderizarRota(ROTA)
    const cabecalho = container.querySelector('main [data-cc-papeis-cab]')!
    expect(cabecalho, 'o cabeçalho das colunas').not.toBeNull()
    expect(cabecalho.getAttribute('aria-hidden')).toBe('true')
    expect([...cabecalho.querySelectorAll('[data-cc-rotulo-cab]')].map((c) => c.textContent)).toEqual([...CUIDADO.papeis.rotulos])
    expect(container.querySelectorAll('main .cc-papeis dt')).toHaveLength(9)
  })

  it('o verbo que decide é <strong data-cc-verbo>, e a frase continua inteira', () => {
    const { container } = renderizarRota(ROTA)
    const itens = [...container.querySelectorAll('main ul.cc-papeis > li')]
    const verbos = itens.map((li) => [...li.querySelectorAll('strong[data-cc-verbo]')].map((s) => s.textContent))
    expect(verbos).toEqual([['Administra'], ['Registra', 'Edita e exclui'], ['Nada']])
    for (const strong of container.querySelectorAll('main strong[data-cc-verbo]')) expect(strong.closest('dd')).not.toBeNull()
  })

  it('o Cuidador é o único papel marcado (data-papel="cuidador"), para a faixa de destaque', () => {
    const { container } = renderizarRota(ROTA)
    const itens = [...container.querySelectorAll('main ul.cc-papeis > li')]
    expect(itens.map((li) => li.getAttribute('data-papel'))).toEqual(['responsavel', 'cuidador', 'observador'])
    expect(itens[1].querySelector('h3')!.textContent).toBe('Cuidador')
    // O destaque é só CSS, sobre o atributo (sem classe nem texto a mais).
    expect(lerCss()).toMatch(/\.cc-papel\[data-papel='cuidador'\]\s*\{[^}]*background-color:\s*var\(--color-[a-z-]+\)/)
  })

  it('o texto dos papéis diz o que a babá (Cuidador) faz: registra, edita e exclui só o que ela anotou', () => {
    const cuidador = CUIDADO.papeis.linhas[1]
    expect(cuidador.nome).toBe('Cuidador')
    expect(cuidador.muda).toMatch(/^Registra\. Edita e exclui só o que ele mesmo registrou/)
    expect(CUIDADO.papeis.linhas[2].muda).toMatch(/^Nada: só lê/)
    expect(CUIDADO.papeis.linhas[0].muda).toMatch(/^Administra /)
    // O campo antigo `pode` saiu.
    for (const linha of CUIDADO.papeis.linhas) expect(Object.keys(linha)).not.toContain('pode')
  })
})

describe('CUID-K2 o texto do herói diz o que a babá lê e anota', () => {
  it('o lede nomeia o histórico com o nome de quem anotou, o que a babá registra e o que ela só edita do que anotou', () => {
    expect(CUIDADO.lede).toBe(
      'A babá vê o histórico do bebê, com o nome de quem anotou cada registro. Ela anota sono, mamada e fralda, e só edita ou exclui o que ela mesma anotou.',
    )
    expect(CUIDADO.lede).toMatch(/histórico do bebê/)
    expect(CUIDADO.lede).toMatch(/nome de quem anotou/)
    expect(CUIDADO.lede).toMatch(/sono, mamada e fralda/)
    expect(CUIDADO.lede).toMatch(/só edita ou exclui o que ela mesma anotou/)
  })

  it('o lede aparece no herói, depois do h1 e antes da ação', () => {
    const { container } = renderizarRota(ROTA)
    const abertura = faixas(container)[0]
    const lede = [...abertura.querySelectorAll('p')].find((p) => p.textContent === CUIDADO.lede)!
    expect(lede).toBeDefined()
    expect(abertura.querySelector('h1')!.compareDocumentPosition(lede) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(lede.compareDocumentPosition(abertura.querySelector('a[data-botao-largo]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('CUID-K1 a faixa do celular: a tela recortada pela página, a moldura intacta', () => {
  it('a moldura fica num recorte da página (.cc-moldura > .cc-recorte), com o ProdutoEmMoldura dentro, sem mudar a ordem do DOM', () => {
    const { container } = renderizarRota(ROTA)
    const abertura = faixas(container)[0]
    const recorte = abertura.querySelector('.cc-moldura > .cc-recorte')!
    expect(recorte, '.cc-moldura > .cc-recorte').not.toBeNull()
    expect(recorte.querySelectorAll('figure[data-produto-moldura]')).toHaveLength(1)
    expect(recorte.querySelectorAll('img')).toHaveLength(2)
  })

  it('o CSS recorta o recorte com overflow: clip e altura em função da tela (--cc-tela), sem px solto', () => {
    const css = lerCss()
    const regra = css.match(/\.cc-recorte\s*\{([^}]*)\}/)
    expect(regra, '.cc-recorte').not.toBeNull()
    expect(regra![1]).toMatch(/overflow:\s*clip/)
    expect(regra![1]).toMatch(/height:\s*calc\(var\(--cc-tela\)\s*\*\s*[\d.]+\)/)
    expect(css).toMatch(/--produto-tela:\s*var\(--cc-tela\)/)
  })

  it('de 1024 em diante a composição é "cena chamada" e "moldura tres" (a do 640 a 1023), com o .cc-texto em contents', () => {
    const css = lerCss()
    const largo = css.match(/@container\s+cc-pagina\s*\(min-width:\s*1024px\)\s*\{([\s\S]*?)\n\}/)
    expect(largo, 'o bloco largo da abertura').not.toBeNull()
    const medio = css.match(/@container\s+cc-pagina\s*\(min-width:\s*640px\)\s*\{([\s\S]*?)\n\}/)
    expect(medio![1]).toMatch(/grid-template-areas:\s*'cena chamada'\s*'moldura tres'/)
    // A tela de 390 a 400 px de largura em 1440 (era 320).
    expect(largo![1]).toMatch(/--cc-tela:\s*min\(3[89]\dpx|--cc-tela:\s*min\(400px/)
    // O .cc-texto continua contents no largo: nenhuma regra largo o devolve a grid.
    expect(largo![1]).not.toMatch(/\.cc-texto\s*\{[^}]*display:\s*grid/)
  })
})

describe('CUID-K5 o fecho encosta no rodapé', () => {
  it('a página aperta o espaço entre a ação final e o rodapé só com CSS escopado em [data-pagina-cuidado]', () => {
    const css = lerCss()
    expect(css).toMatch(/\[data-pagina-cuidado\][^{]*\{[^}]*padding-bottom|\[data-pagina-cuidado\][^{]*\{[^}]*margin-bottom/)
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
      'src/componentes/cuidado-casa/HorasNoTexto.tsx',
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

describe('POLISH-CUIDADO as horas, a moldura, o herói e as colunas', () => {
  it('as horas que carregam a ideia (13:00, 14:40 e 03:00) são <strong data-cc-hora>, dentro da frase do deck', () => {
    const { container } = renderizarRota(ROTA)
    const bandas = faixas(container)
    const sono = [...bandas[2].querySelectorAll('p')].find((p) => p.textContent === CUIDADO.sono.p)!
    expect(sono, 'o parágrafo do sono').toBeDefined()
    expect([...sono.querySelectorAll('strong[data-cc-hora]')].map((s) => s.textContent)).toEqual(['13:00', '14:40'])
    const legenda = bandas[3].querySelector('p[data-legenda]')!
    expect(legenda.textContent).toBe(CUIDADO.senha.legenda)
    expect(legenda.getAttribute('data-tom')).toBe('noite')
    expect([...legenda.querySelectorAll('strong[data-cc-hora]')].map((s) => s.textContent)).toEqual(['03:00'])
    // Nenhuma outra hora marcada na página.
    expect(container.querySelectorAll('main [data-cc-hora]')).toHaveLength(3)
  })

  it('a altura da moldura é a do arquivo servido (o PNG de verdade), para a tela caber sem vão', () => {
    const png = readFileSync(join(process.cwd(), 'public', IMAGENS_CUIDADO.moldura.src))
    // IHDR: largura nos bytes 16 a 19 e altura nos bytes 20 a 23, big-endian.
    expect(IMAGENS_CUIDADO.moldura.largura).toBe(png.readUInt32BE(16))
    expect(IMAGENS_CUIDADO.moldura.altura).toBe(png.readUInt32BE(20))
  })

  it('abaixo de 1024 o herói usa a placa inteira (as figuras de corpo inteiro, nenhuma cortada na borda)', () => {
    const { container } = renderizarRota(ROTA)
    const fontes = [...faixas(container)[0].querySelectorAll('picture source[media]')]
    expect(fontes).toHaveLength(2) // AVIF e WebP, os dois com o mesmo `media`
    for (const recorte of fontes) {
      // A mesma placa do herói largo (600 e 981), não o recorte 390c (390 e 780).
      expect(larguras(recorte.getAttribute('srcset'))).toEqual([600, 981])
      expect(recorte.getAttribute('sizes')).toBe('min(90vw, 420px)')
      expect(recorte.getAttribute('width')).toBe('981')
      expect(recorte.getAttribute('height')).toBe('1082')
    }
    const largo = faixas(container)[0].querySelector('picture img')!
    expect(fontes[1].getAttribute('srcset')).toBe(largo.getAttribute('srcset'))
  })

  it('a faixa "quando alguém para de cuidar" tem duas colunas: o título numa, os dois parágrafos na outra', () => {
    const { container } = renderizarRota(ROTA)
    const parar = faixas(container)[4].querySelector('.cc-parar')!
    expect(parar, '.cc-parar').not.toBeNull()
    const colunas = [...parar.children]
    expect(colunas).toHaveLength(2)
    expect(colunas[0].querySelector('h2')!.textContent).toBe(CUIDADO.parar.h2)
    expect([...colunas[1].querySelectorAll('p')].map((p) => p.textContent)).toEqual([CUIDADO.parar.p1, CUIDADO.parar.p2])
  })

  it('o CSS da página quebra por contêiner (@container), nunca por largura de janela; a altura curta é @media (max-height)', () => {
    const css = readFileSync(join(process.cwd(), 'src/componentes/cuidado-casa/cuidado-casa.css'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    expect(css).toMatch(/container-type:\s*inline-size/)
    expect(css).toMatch(/@container\s+cc-pagina\s*\(min-width/)
    expect(css).not.toMatch(/@media[^{]*(?:min|max)-width/)
    expect(css).toMatch(/@media[^{]*max-height/)
  })

  it('no celular (contêiner < 640) a cena inteira fica ao lado do h1, para a ação e a moldura caberem na dobra de 844', () => {
    const css = readFileSync(join(process.cwd(), 'src/componentes/cuidado-casa/cuidado-casa.css'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    const celular = css.match(/@container\s+cc-pagina\s*\(width\s*<\s*640px\)\s*\{([\s\S]*?)\n\}/)
    expect(celular, 'o bloco @container cc-pagina (width < 640px)').not.toBeNull()
    expect(celular![1]).toMatch(/grid-template-areas:\s*'titulo cena'\s*'lede lede'\s*'acao acao'\s*'moldura moldura'\s*'tres tres'/)
    // K4: a cena é maior (44 % da coluna, antes 40 %) e a abertura perde o vão de cima nesta largura.
    expect(celular![1]).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) min\(44%, 12rem\)/)
    expect(celular![1]).toMatch(/\.cc-abertura\s*\{[^}]*padding-top:\s*var\(--espaco-grupo\)/)
    // A placa nunca é recortada: a caixa da cena segue a proporção do arquivo inteiro (981 × 1082).
    expect(css).toMatch(/\.cc-abertura \.cc-cena-imagem\s*\{[^}]*aspect-ratio:\s*981 \/ 1082/)
  })

  it('janela curta (max-height 520): abertura com junto no topo, h1 no nível titulo-1 e a ação antes da cena no celular', () => {
    const css = readFileSync(join(process.cwd(), 'src/componentes/cuidado-casa/cuidado-casa.css'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    const curta = css.match(/@media \(max-height: 520px\) \{([\s\S]*?)\n\}/)
    expect(curta, 'o bloco @media (max-height: 520px)').not.toBeNull()
    const bloco = curta![1]
    expect(bloco).toMatch(/\.cc-abertura\s*\{[^}]*padding-top:\s*var\(--espaco-junto\)/)
    // Só pares de token de tipo (stylelint harmonia/valores-soltos): titulo-1 nas janelas curtas.
    expect(bloco).toMatch(/font-size:\s*var\(--texto-titulo-1-tamanho\)/)
    expect(bloco).toMatch(/line-height:\s*var\(--texto-titulo-1-entrelinha\)/)
    expect(bloco).toMatch(/grid-template-areas:\s*'titulo titulo'\s*'lede lede'\s*'acao acao'\s*'cena cena'/)
    expect(bloco).toMatch(/@container cc-pagina \(640px <= width < 1024px\)/)
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
