import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { rodarAxe } from '../../teste/axe.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// COMO-I-01, I-02, I-04, I-05 e I-06 (spec CLONE-COMO): /como-funciona na casa acesa. O jsdom não faz layout nem baixa
// arquivo: aqui ficam a ordem das faixas, os chãos, a cópia, os nomes dos arquivos e os atributos das imagens. As
// medidas (1440 e 390) saem das capturas.

// As placas de cena saem do vite-imagetools (um mestre por vaga em src/assets/cenas): no teste a URL é `/@imagetools/<hash>`,
// no build é um arquivo com hash em /assets. O que se confere é a forma, as larguras do srcset e as fontes AVIF.
const URL_GERADA = /^\/@imagetools\/[\w-]+$/
const larguras = (srcset: string | null) =>
  (srcset ?? '').split(',').map((parte) => Number(parte.trim().split(/\s+/)[1]?.replace(/w$/, '')))

// As 24 frases do deck COPY_como-funciona (sha256 84e6bf6d…) que a página desenha; `cf.aba` é o título da aba.
const ABA = 'Como funciona | AppMaternidade' // cf.aba
const H1 = 'Deixa que eu anoto.' // cf.h1
const TEXTOS: Record<string, string> = {
  'cf.h1': H1,
  'cf.lede': 'Um dia da Helo, da mamada das 03:00 ao sono das 20:30, do jeito que ficou anotado no site.',
  'cf.cta1': 'Criar conta',
  'cf.leg1': '03:00, mamada, anotada por Ícaro',
  'cf.h2.hist': 'Olha no histórico.',
  'cf.p.hist':
    'Cada registro vira uma linha com a hora, o tipo e o nome de quem anotou. O tummy time das 15:00 durou 8 minutos e está lá, entre o sono da tarde e a mamada das 16:00.',
  'cf.leg2': '15:00, tummy time, anotado por Ju',
  'cf.h2.depois': 'Anoto depois.',
  'cf.p.depois':
    'Com ela chorando no colo, ninguém pega o celular. O registro pode ser feito mais tarde, com a hora em que a coisa aconteceu.',
  'cf.leg3': '18:00, sono, anotado por Ícaro',
  'cf.h2.nota': 'Pomada só à noite.',
  'cf.p.nota':
    'A Ju escreveu isso numa nota e deixou em destaque. A do Ícaro diz: “Fraldas P no armário de cima.” Nota é para o recado que não é registro.',
  'cf.h2.comecar': 'Para começar, só o navegador.',
  'cf.passo1': 'Crie a conta com um nome, um e-mail e uma senha. O site abre no navegador, sem instalar nada.',
  'cf.passo2': 'Crie a família do bebê ou entre numa que já existe, com um convite.',
  'cf.passo3': 'Cadastre o bebê. O site pede só o nome ou apelido e a data de nascimento.',
  'cf.aviso': 'O AppMaternidade não faz diagnóstico e não substitui a orientação de um profissional de saúde.',
  'cf.h2.fecho': 'E amanhã tem tudo de novo.',
  'cf.cta2': 'Criar conta',
}
const ALTS: Record<string, string> = {
  'cf.alt.cena1':
    'Juliana, de óculos, sentada, amamenta Heloísa à luz de uma luminária. Ícaro, acordado, está sentado no chão com o celular na mão. O berço ao lado está vazio.',
  'cf.alt.cena2':
    'Heloísa de bruços num tapete firme, de cabeça erguida, olhando para a frente. Juliana está ao lado, na altura dos olhos dela, de olho na bebê.',
  'cf.alt.tela1':
    'Tela do Histórico do site num celular. Na lista do dia, o tummy time das 15:00 e a mamada das 16:00 estão anotados por Juliana.',
  'cf.alt.cena3':
    'Ícaro, em pé, embala Heloísa, que chora encostada no peito dele. É noite, e os dois estão dentro da luz de uma luminária de chão.',
  'cf.alt.tela2':
    'Tela Notas do site num celular, com duas notas: “Pomada só à noite.”, de Juliana, em destaque, e “Fraldas P no armário de cima.”, de Ícaro.',
}
const DECK = new Set([...Object.values(TEXTOS), ...Object.values(ALTS)])
/** Os ids que não são desenhados: `cf.aba` (a aba, conferida em document.title). */
const FORA_DO_PRINCIPAL = ['cf.aba']

const GROUNDS = ['cacau', 'papel', 'cacau', 'areia', 'papel', 'cacau']

function principal(container: HTMLElement): HTMLElement {
  return container.querySelector('main') as HTMLElement
}

function casa(container: HTMLElement): HTMLElement {
  return principal(container).querySelector(':scope > [data-casa]') as HTMLElement
}

/** Os textos do `main`, um por nó de texto, sem os brancos. */
function nosDeTexto(raiz: HTMLElement): string[] {
  const caminhante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
  const textos: string[] = []
  for (let no = caminhante.nextNode(); no; no = caminhante.nextNode()) {
    const texto = (no.textContent ?? '').trim()
    if (texto !== '') textos.push(texto)
  }
  return textos
}

/** O chão de cada faixa filha de [data-casa], na ordem: o do heroi é o da parede esquerda da placa. */
function chaos(container: HTMLElement): string[] {
  return [...casa(container).children].map((faixa) => {
    if (faixa.matches('[data-cena-heroi]')) return faixa.querySelector('[data-camada="parede-esquerda"]')!.getAttribute('data-fundo')!
    return faixa.getAttribute('data-faixa-fundo')!
  })
}

/** RF-95: a ordem do primeiro elemento de cada tipo (título, parágrafo, imagem, legenda) na ordem do DOM. */
function ritmo(faixa: Element): string {
  const tipos: Array<[string, string]> = [
    ['titulo', 'h1, h2'],
    ['paragrafo', 'p:not([data-legenda])'],
    ['imagem', 'img:not([data-produto-moldura-arte])'],
    ['legenda', 'p[data-legenda]'],
  ]
  const achados = tipos
    .map(([nome, seletor]) => ({ nome, no: faixa.querySelector(seletor) }))
    .filter((achado): achado is { nome: string; no: Element } => achado.no !== null)
  achados.sort((a, b) => (a.no.compareDocumentPosition(b.no) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
  return achados.map((achado) => achado.nome).join(' > ')
}

describe('/como-funciona: a casa acesa (COMO:RF-01, RF-02)', () => {
  it('COMO-I-01 o main tem só o PaginaCasa, com o heroi, cinco faixas e o fecho, nessa ordem', () => {
    const { container } = renderizarRota('/como-funciona')
    expect(container.querySelectorAll('main')).toHaveLength(1)
    expect(principal(container).children).toHaveLength(1)
    const filhos = [...casa(container).children]
    expect(filhos).toHaveLength(6)
    expect(filhos[0].matches('section[data-cena-heroi][data-lado="esquerda"][data-largura-max="977"]')).toBe(true)
    for (const faixa of filhos.slice(1)) expect(faixa.matches('[data-faixa]')).toBe(true)
    // O heroi: parede cacau dos dois lados, sem chão nenhum.
    const camadas = (nome: string) => filhos[0].querySelector(`[data-camada="${nome}"]`)!.getAttribute('data-fundo')
    expect([camadas('parede-esquerda'), camadas('parede-direita')]).toEqual(['cacau', 'cacau'])
    expect([camadas('chao-esquerda'), camadas('chao-direita')]).toEqual(['nenhum', 'nenhum'])
    // O fecho é o único bloco centrado, na última faixa (cacau), com a pílula de mel.
    const fecho = filhos[5].querySelector('[data-fechamento][data-tom="noite"]')!
    expect(fecho.querySelector('h2')!.textContent).toBe(TEXTOS['cf.h2.fecho'])
    expect(fecho.querySelector('a[data-botao-mel]')!.textContent).toBe(TEXTOS['cf.cta2'])
    expect(container.querySelectorAll('[data-fechamento]')).toHaveLength(1)
  })

  it('COMO-I-01 o h1 é o da placa (um só) e o título da aba é o do deck', () => {
    const { container } = renderizarRota('/como-funciona')
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0].textContent).toBe(H1)
    const heroi = casa(container).firstElementChild!
    expect(heroi.getAttribute('aria-labelledby')).toBe(h1s[0].id)
    expect(heroi.contains(h1s[0])).toBe(true)
    expect(document.title).toBe(ABA)
    expect(container.querySelector('header[data-cabecalho]')!.getAttribute('data-tom')).toBe('noite')
    expect(container.querySelector('footer[data-rodape]')).not.toBeNull()
  })

  it('COMO-I-05 os chãos vêm na ordem cacau, papel, cacau, areia, papel, cacau, sem repetir um ao lado do outro', () => {
    const { container } = renderizarRota('/como-funciona')
    const ordem = chaos(container)
    expect(ordem).toEqual(GROUNDS)
    for (let i = 1; i < ordem.length; i++) expect(ordem[i], `faixa ${i}`).not.toBe(ordem[i - 1])
  })

  it('COMO-I-05 três faixas seguidas nunca têm o ritmo título, parágrafo, imagem, legenda', () => {
    const { container } = renderizarRota('/como-funciona')
    const padroes = [...casa(container).children].map(ritmo)
    const idem = padroes.map((padrao) => padrao === 'titulo > paragrafo > imagem > legenda')
    for (let i = 0; i + 2 < idem.length; i++) expect(idem.slice(i, i + 3), padroes.join(' | ')).not.toEqual([true, true, true])
    // A faixa sem imagem nunca casa; a das 18:00 (texto, M06, legenda) é a única que casa.
    expect(padroes[4]).not.toContain('imagem')
    expect(idem.filter(Boolean)).toHaveLength(1)
  })

  it('COMO-I-01 a faixa 2 tem a legenda, o título, o texto, a cena e a legenda, e a moldura; a 3, a legenda sobre o chão de noite', () => {
    const { container } = renderizarRota('/como-funciona')
    const [, hist, depois, nota, comecar] = [...casa(container).children]
    const legendas = (faixa: Element) => [...faixa.querySelectorAll('p[data-legenda]')]
    expect(legendas(hist).map((p) => [p.textContent, p.getAttribute('data-tom')])).toEqual([
      [TEXTOS['cf.leg1'], 'dia'],
      [TEXTOS['cf.leg2'], 'dia'],
    ])
    expect(hist.querySelector('h2')!.textContent).toBe(TEXTOS['cf.h2.hist'])
    expect(hist.querySelectorAll('[data-produto-moldura]')).toHaveLength(1)
    expect(depois.querySelector('h2')!.textContent).toBe(TEXTOS['cf.h2.depois'])
    expect(legendas(depois).map((p) => [p.textContent, p.getAttribute('data-tom')])).toEqual([[TEXTOS['cf.leg3'], 'noite']])
    // O chão de noite: a faixa continua o chão da placa (aria-hidden), e a legenda mora na mesma coluna que ele.
    const chao = depois.querySelector('.cf-chao')!
    expect(chao.getAttribute('aria-hidden')).toBe('true')
    expect(chao.parentElement!.contains(depois.querySelector('p[data-legenda]'))).toBe(true)
    expect(nota.querySelector('h2')!.textContent).toBe(TEXTOS['cf.h2.nota'])
    expect(nota.querySelectorAll('[data-produto-moldura]')).toHaveLength(1)
    // A faixa 5: a lista numerada de três passos com o aviso depois dela, como parágrafo simples.
    expect(comecar.querySelector('h2')!.textContent).toBe(TEXTOS['cf.h2.comecar'])
    const lista = comecar.querySelector('ol')!
    expect([...lista.children].map((li) => li.tagName)).toEqual(['LI', 'LI', 'LI'])
    expect([...lista.children].map((li) => li.textContent)).toEqual([TEXTOS['cf.passo1'], TEXTOS['cf.passo2'], TEXTOS['cf.passo3']])
    const aviso = lista.parentElement!.querySelector(':scope > p')!
    expect(aviso.textContent).toBe(TEXTOS['cf.aviso'])
    expect(lista.compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(aviso.hasAttribute('data-aviso')).toBe(false)
    expect(comecar.querySelectorAll('ol')).toHaveLength(1)
  })

  it('COMO-I-13 cada faixa de 2 a 5 embrulha as duas colunas num conteiner .cf-banda', () => {
    const { container } = renderizarRota('/como-funciona')
    const faixas = [...casa(container).children].slice(1, 5)
    for (const faixa of faixas) {
      const bandas = faixa.querySelectorAll('.cf-banda')
      expect(bandas).toHaveLength(1)
      expect(bandas[0].querySelector(':scope > .cf-duas')).not.toBeNull()
    }
  })

  it('COMO-I-01 duas ações, as duas para /criar-conta, uma no heroi e outra no fecho', () => {
    const { container } = renderizarRota('/como-funciona')
    const links = [...principal(container).querySelectorAll('a')]
    expect(links).toHaveLength(2)
    for (const link of links) {
      expect(link.getAttribute('href')).toBe('/criar-conta')
      expect(link.textContent).toBe('Criar conta')
    }
    expect(casa(container).firstElementChild!.contains(links[0])).toBe(true)
    expect(links[0].hasAttribute('data-botao-mel')).toBe(true)
    expect(casa(container).lastElementChild!.contains(links[1])).toBe(true)
  })
})

describe('/como-funciona: a cópia é o deck (COMO:RF-07)', () => {
  it('COMO-I-04 todo nó de texto do main e todo alt não vazio é uma frase do deck', () => {
    const { container } = renderizarRota('/como-funciona')
    for (const texto of nosDeTexto(principal(container))) expect(DECK.has(texto), texto).toBe(true)
    const alts = [...principal(container).querySelectorAll('img')].map((img) => img.getAttribute('alt') ?? '').filter((a) => a !== '')
    expect(alts.length).toBeGreaterThan(0)
    for (const alt of alts) expect(DECK.has(alt), alt).toBe(true)
  })

  it('COMO-I-04 toda frase do deck (menos cf.aba) aparece: o texto no main, o alt na imagem do slot', () => {
    const { container } = renderizarRota('/como-funciona')
    const nos = nosDeTexto(principal(container))
    for (const [id, texto] of Object.entries(TEXTOS)) expect(nos, id).toContain(texto)
    const alts = new Set([...principal(container).querySelectorAll('img')].map((img) => img.getAttribute('alt')))
    for (const [id, alt] of Object.entries(ALTS)) expect(alts.has(alt), id).toBe(true)
    expect(Object.keys(TEXTOS).length + Object.keys(ALTS).length + FORA_DO_PRINCIPAL.length).toBe(25)
  })

  it('COMO-I-04 nenhum texto em prumo quebrado: sem seta, sem ponto médio, sem travessão, sem itálico no texto', () => {
    const { container } = renderizarRota('/como-funciona')
    const texto = principal(container).textContent!
    expect(texto).not.toMatch(/[→·—–]/)
    expect(principal(container).querySelector('em, i, cite, [class*="italic"], .cm-segunda-linha')).toBeNull()
  })
})

describe('/como-funciona: as imagens são os cinco slots e nada mais (COMO:RF-06, RF-90)', () => {
  it('COMO-I-06 a placa M01: eager com fetchpriority alta, o recorte de 390 como <source> e os arquivos servidos', () => {
    const { container } = renderizarRota('/como-funciona')
    const heroi = casa(container).firstElementChild!
    const img = heroi.querySelector<HTMLImageElement>('picture img')!
    expect(img.getAttribute('alt')).toBe(ALTS['cf.alt.cena1'])
    expect(img.getAttribute('src')).toMatch(URL_GERADA)
    expect(larguras(img.getAttribute('srcset'))).toEqual([977, 1672])
    expect(img.getAttribute('srcset')).toContain(img.getAttribute('src')!)
    expect(img.getAttribute('sizes')).toBe('(min-width: 1440px) 977px, 68vw')
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['1672', '915'])
    expect(img.getAttribute('fetchpriority')).toBe('high')
    expect(img.getAttribute('loading')).not.toBe('lazy')
    // O AVIF vem antes do WebP de cada caso: recorte (com `media`) e depois a placa larga (sem `media`), e só então a <img>.
    const fontes = [...heroi.querySelectorAll('picture source')]
    expect(fontes.map((f) => [f.getAttribute('type'), f.getAttribute('media')])).toEqual([
      ['image/avif', '(max-width: 767px)'],
      [null, '(max-width: 767px)'],
      ['image/avif', null],
    ])
    for (const fonte of fontes.slice(0, 2)) {
      expect(larguras(fonte.getAttribute('srcset'))).toEqual([390, 780])
      expect(fonte.getAttribute('sizes')).toBe('100vw')
      expect([fonte.getAttribute('width'), fonte.getAttribute('height')]).toEqual(['780', '458'])
    }
    expect(larguras(fontes[2].getAttribute('srcset'))).toEqual([977, 1672])
    expect(fontes[2].getAttribute('sizes')).toBe('(min-width: 1440px) 977px, 68vw')
    expect(fontes[2].nextElementSibling).toBe(img)
  })

  it('COMO-I-06 M04 e M06: preguiçosas e assíncronas, com o tamanho do maior arquivo e os nomes de ASSET-2', () => {
    const { container } = renderizarRota('/como-funciona')
    const m04 = container.querySelector<HTMLImageElement>(`img[alt="${ALTS['cf.alt.cena2']}"]`)!
    expect(larguras(m04.getAttribute('srcset'))).toEqual([350, 520, 700, 1040])
    expect(m04.getAttribute('src')).toMatch(URL_GERADA)
    expect(m04.getAttribute('sizes')).toBe('(min-width: 768px) 520px, 350px')
    expect([m04.getAttribute('width'), m04.getAttribute('height')]).toEqual(['1040', '754'])
    const m06 = container.querySelector<HTMLImageElement>(`img[alt="${ALTS['cf.alt.cena3']}"]`)!
    expect(larguras(m06.getAttribute('srcset'))).toEqual([300, 600])
    expect(m06.getAttribute('src')).toMatch(URL_GERADA)
    expect(m06.getAttribute('sizes')).toBe('300px')
    expect([m06.getAttribute('width'), m06.getAttribute('height')]).toEqual(['600', '980'])
    for (const [img, largurasAvif] of [
      [m04, [350, 520, 700, 1040]],
      [m06, [300, 600]],
    ] as const) {
      expect(img.getAttribute('loading')).toBe('lazy')
      expect(img.getAttribute('decoding')).toBe('async')
      // Uma <picture> com a fonte AVIF logo antes da <img>, com os mesmos `sizes` e as mesmas larguras.
      const fonte = img.previousElementSibling!
      expect(img.parentElement!.tagName).toBe('PICTURE')
      expect(fonte.getAttribute('type')).toBe('image/avif')
      expect(larguras(fonte.getAttribute('srcset'))).toEqual(largurasAvif)
      expect(fonte.getAttribute('sizes')).toBe(img.getAttribute('sizes'))
    }
  })

  it('COMO-I-06 exatamente duas telas emolduradas (Histórico e Notas), cada uma sob a moldura de dia decorativa', () => {
    const { container } = renderizarRota('/como-funciona')
    const telas = [...container.querySelectorAll<HTMLImageElement>('main [data-produto-tela]')]
    expect(telas).toHaveLength(2)
    expect(telas.map((t) => t.getAttribute('alt'))).toEqual([ALTS['cf.alt.tela1'], ALTS['cf.alt.tela2']])
    expect(telas[0].getAttribute('src')).toMatch(/^\/telas\/t1i\/historico-y15-\d+w\.webp$/)
    expect(telas[1].getAttribute('src')).toMatch(/^\/telas\/t1i\/notas-\d+w\.webp$/)
    for (const tela of telas) {
      expect(tela.getAttribute('srcset')).toBe(
        [280, 320, 560, 640].map((l) => `${tela.getAttribute('src')!.replace(/-\d+w\.webp$/, '')}-${l}w.webp ${l}w`).join(', '),
      )
      expect(tela.getAttribute('loading')).toBe('lazy')
      const arte = tela.parentElement!.querySelector<HTMLImageElement>('[data-produto-moldura-arte]')!
      expect(arte.getAttribute('src')).toBe('/molduras/moldura-dia.png')
      expect(arte.getAttribute('alt')).toBe('')
      expect(arte.getAttribute('aria-hidden')).toBe('true')
      // Nenhuma moldura sobre o cacau (RF-06): a faixa que a contém é de papel ou de areia.
      expect(['papel', 'areia']).toContain(tela.closest('[data-faixa]')!.getAttribute('data-faixa-fundo'))
    }
  })

  it('COMO-I-02 sem cena de estúdio: nada de [data-aparelho], [data-cena], cartão flutuante, painel de campo nem arquivo antigo', () => {
    const { container } = renderizarRota('/como-funciona')
    const main = principal(container)
    expect(main.querySelector('[data-aparelho], [data-cena], .cm-flutuante, [data-cartao-plano], [data-painel], [data-ilustracao]')).toBeNull()
    expect(main.querySelectorAll('img')).toHaveLength(7)
    for (const img of main.querySelectorAll('img')) {
      const fontes = [img.getAttribute('src'), img.getAttribute('srcset')].join(' ')
      expect(fontes).not.toMatch(/cenas\/publicas|ilustracoes/)
    }
    // Imagem a imagem: cada uma é de um dos slots (cena/ , telas/t1i/ ou a moldura).
    for (const img of main.querySelectorAll('img')) {
      expect(img.getAttribute('src')).toMatch(/^\/(@imagetools\/|telas\/t1i\/|molduras\/moldura-dia\.png$)/)
      expect(img.getAttribute('width')).toMatch(/^[1-9]\d*$/)
      expect(img.getAttribute('height')).toMatch(/^[1-9]\d*$/)
    }
  })

  it('COMO-I-02 os arquivos da página não importam peça aposentada nem citam o desenho antigo', () => {
    const arquivos = [
      'src/paginas/publicas/ComoFunciona.tsx',
      'src/conteudo/casa/comoFunciona.ts',
      'src/componentes/como-casa/TextoDoHeroi.tsx',
      'src/componentes/como-casa/BandaHistorico.tsx',
      'src/componentes/como-casa/BandaDepois.tsx',
      'src/componentes/como-casa/BandaNota.tsx',
      'src/componentes/como-casa/BandaComecar.tsx',
      'src/componentes/como-casa/como-casa.css',
    ]
    const APOSENTADAS =
      /CenaEstudio|CartaoFlutuante|PainelCampo|CartoesApp|Abertura|CabecaDeSecao|Numeros|Passos|TabelaTexto|Ilustracao|campo\/Titulo|CenaCacau|SeletorDeFase|PartesDoArtigo|FontesDoItem|AvisoSaude|publicas-destaque|data-aparelho|cenas\/publicas|ilustracoes\//
    for (const arquivo of arquivos) {
      const texto = readFileSync(join(process.cwd(), arquivo), 'utf8')
      expect(texto, arquivo).not.toMatch(APOSENTADAS)
    }
  })
})

describe('/como-funciona: o CSS da página é estático e só de token (COMO:RF-91, RF-93)', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'componentes', 'como-casa', 'como-casa.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )

  it('COMO-I-10 sem sombra, gradiente, desfoque, itálico, caixa alta, cor crua nem seta', () => {
    expect(css).not.toMatch(/box-shadow|text-shadow|gradient|blur|backdrop-filter|italic|uppercase|→/)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/)
    // Toda cor é um token.
    for (const [, valor] of css.matchAll(/(?:background-color|border-color|color)\s*:\s*([^;]+);/g)) {
      expect(valor.trim(), valor).toMatch(/^var\(--(color|cor|foco)-[\w-]+\)$|^currentcolor$/)
    }
  })

  it('COMO-I-12 sem animação, quadros-chave, transição, will-change nem view-transition; nada nasce escondido', () => {
    expect(css).not.toMatch(/animation|@keyframes|transition|will-change|view-transition-name/)
    expect(css).not.toMatch(/opacity\s*:|visibility\s*:\s*hidden|transform\s*:/)
  })

  it('COMO-I-13 as faixas 2 a 5 são conteineres: as duas colunas vêm de @container, não da largura da janela', () => {
    expect(css).toMatch(/\.cf-banda\s*\{[^}]*container:\s*cf-banda\s*\/\s*inline-size/)
    expect(css).toMatch(/@container cf-banda \(min-width: \d+px\)/)
    // Nenhuma regra de coluna (`.cf-duas`, `.cf-colo`) dentro de um @media de largura.
    for (const [, corpo] of css.matchAll(/@media[^{]*\{([\s\S]*?)\n {2}\}/g)) expect(corpo).not.toMatch(/\.cf-(duas|colo|lado)/)
  })

  it('COMO-I-13 o heroi pesa mais que as regras globais do Início: todo seletor de [data-cena-heroi] tem peso (0,4,0)', () => {
    const seletores = [...css.matchAll(/([^{}]+)\{/g)].map(([, s]) => s.trim()).filter((s) => s.includes('[data-cena-heroi]'))
    expect(seletores.length).toBeGreaterThan(0)
    for (const seletor of seletores) {
      for (const parte of seletor.split(',')) expect(parte.trim(), parte).toMatch(/^\[data-casa\] \[data-cena-heroi\]\[data-lado\]:has\(\.cf-hero-texto\)/)
    }
    // O texto e a placa voltam ao fluxo (o Início os põe em `display: contents` e `position: absolute`).
    expect(css).toMatch(/:has\(\.cf-hero-texto\) \.cm-cena-texto \{[^}]*display: block/)
    expect(css).toMatch(/:has\(\.cf-hero-texto\) \.cm-cena-placa \{[^}]*position: relative/)
  })

  // R1 (janela baixa): o jsdom não faz layout; a geometria (h1, frase e o botão inteiro na primeira tela em 844x390,
  // 667x375, 390x300 e 1440x700) sai das capturas. Aqui fica o contrato das regras.
  const consultasBaixas = [...css.matchAll(/@media([^{]*max-height:\s*(\d+)px[^{]*)\{([\s\S]*?)\n {2}\}/g)].map(
    ([, consulta, altura, corpo]) => ({ consulta, altura: Number(altura), corpo }),
  )

  it('COMO-I-14 janela baixa e estreita: o texto vem antes da placa (order) e o padding do texto aperta', () => {
    const estreita = consultasBaixas.find(({ consulta }) => /max-width:\s*639px/.test(consulta))
    expect(estreita, 'consulta de max-height abaixo de 640').toBeDefined()
    expect(estreita!.corpo).toMatch(/\.cm-cena-texto \{[^}]*order: 0;/)
    expect(estreita!.corpo).toMatch(/\.cm-cena-placa \{[^}]*order: 1;/)
    expect(estreita!.corpo).toMatch(/\.cm-cena-texto \{[^}]*padding: var\(--espaco-pilha\)/)
  })

  it('COMO-I-14 janela baixa e larga (de 640 em diante): placa e texto lado a lado, com o padding do texto em pilha', () => {
    const larga = consultasBaixas.find(({ consulta }) => /min-width:\s*640px/.test(consulta) && !/max-width/.test(consulta))
    expect(larga, 'consulta de max-height de 640 em diante').toBeDefined()
    expect(larga!.corpo).toMatch(/\.cm-cena-texto \{[^}]*padding-block: var\(--espaco-pilha\)/)
    const entre = consultasBaixas.find(({ consulta }) => /min-width:\s*640px/.test(consulta) && /max-width:\s*767px/.test(consulta))
    expect(entre, 'consulta de max-height entre 640 e 767').toBeDefined()
    expect(entre!.corpo).toMatch(/:has\(\.cf-hero-texto\) \{[^}]*display: grid;[^}]*grid-template-columns/)
    expect(entre!.corpo).toMatch(/\.cm-cena-placa \{[^}]*grid-column: 1;/)
    expect(entre!.corpo).toMatch(/\.cm-cena-texto \{[^}]*grid-column: 2;/)
    // O botão de cacau (texto no papel) não vale quando o texto está na parede de cacau: nada de cacau sobre cacau.
    expect(css).toMatch(/@media \(max-width: 639px\), \(max-width: 767px\) and \(min-height: 761px\) \{\s*\.cf-hero-texto \.cm-botao-mel/)
  })

  it('COMO-I-14 janela muito baixa (até 480): o texto aperta de novo e o h1 desce um degrau da escala', () => {
    const baixa = consultasBaixas.find(({ altura, consulta }) => altura === 480 && !/width/.test(consulta))
    expect(baixa, 'consulta de max-height: 480px em toda largura').toBeDefined()
    expect(baixa!.corpo).toMatch(/\.cm-cena-texto \{[^}]*padding-block: var\(--espaco-junto\)/)
    expect(baixa!.corpo).toMatch(/\.cf-hero-texto \{[^}]*gap: var\(--espaco-pilha\)/)
    expect(baixa!.corpo).toMatch(/--texto-exibicao-tamanho: var\(--texto-titulo-1-tamanho\)/)
  })

  it('COMO-I-14 nenhuma regra de janela baixa vale acima de 760 (390x844 e 1440x900 ficam como estão)', () => {
    expect(consultasBaixas.length).toBeGreaterThanOrEqual(4)
    for (const { altura, consulta } of consultasBaixas) expect(altura, consulta).toBeLessThanOrEqual(760)
  })

  it('COMO-I-12 a página não importa movimento/ nem motion', () => {
    for (const arquivo of ['src/paginas/publicas/ComoFunciona.tsx', 'src/componentes/como-casa/TextoDoHeroi.tsx']) {
      expect(readFileSync(join(process.cwd(), arquivo), 'utf8'), arquivo).not.toMatch(/movimento\/|from 'motion|from "motion/)
    }
  })
})

describe('/como-funciona: acessibilidade', () => {
  it('sem violações do axe (o contraste é medido nas capturas)', async () => {
    const { container } = renderizarRota('/como-funciona')
    const resultado = await rodarAxe(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`)).toEqual([])
  })

  it('a página tem o aviso de demonstração do rodapé e o aviso de saúde uma vez só, no fim da lista', () => {
    const { container } = renderizarRota('/como-funciona')
    const demonstracao = [...container.querySelectorAll('[data-aviso]')]
    expect(demonstracao).toHaveLength(1)
    expect(demonstracao[0].closest('footer[data-rodape]')).not.toBeNull()
    expect(screen.getAllByText(TEXTOS['cf.aviso'])).toHaveLength(1)
  })
})
