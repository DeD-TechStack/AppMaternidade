import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import stylelint from 'stylelint'
import { describe, expect, it } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { DESCRICAO_ILUSTRACAO } from './componentes/campo/Ilustracao.tsx'
import { PROMESSA } from './conteudo/textos.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'

// O Início (MAT-49c), conferido pelo papel e pelo texto que a pessoa vê.

/** O texto que o leitor de tela lê: sem os descendentes aria-hidden, com os espaços normalizados. */
function textoLido(elemento: Element): string {
  const copia = elemento.cloneNode(true) as Element
  for (const escondido of copia.querySelectorAll('[aria-hidden="true"]')) escondido.remove()
  return (copia.textContent ?? '').replace(/\s+/g, ' ').trim()
}

type RegraCss = { seletores: string[]; midia: string | null; corpo: string }

/** As regras de um CSS sem comentários, cada uma com o @media em que está (null na base). */
function lerRegrasCss(relativo: string): RegraCss[] {
  const css = readFileSync(join(process.cwd(), 'src', relativo), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const regras: RegraCss[] = []
  const midias: string[] = []
  let inicio = 0
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      const preludio = css.slice(inicio, i).trim()
      if (preludio.startsWith('@')) {
        midias.push(preludio)
        inicio = i + 1
      } else {
        const fim = css.indexOf('}', i)
        regras.push({
          seletores: preludio.split(',').map((seletor) => seletor.trim().replace(/\s+/g, ' ')),
          midia: midias.length > 0 ? midias[midias.length - 1] : null,
          corpo: css.slice(i + 1, fim),
        })
        i = fim
        inicio = fim + 1
      }
    } else if (css[i] === '}') {
      midias.pop()
      inicio = i + 1
    }
  }
  return regras
}

function abrirInicio() {
  const resultado = renderizarRota('/')
  const main = screen.getByRole('main')
  return { ...resultado, main }
}

describe('Início: abertura', () => {
  it('tem um só h1, com as duas linhas da promessa e a segunda inteira em itálico', () => {
    const { main } = abrirInicio()
    const titulos = screen.getAllByRole('heading', { level: 1 })
    expect(titulos).toHaveLength(1)
    const h1 = titulos[0]
    expect(main.contains(h1)).toBe(true)
    expect(h1.textContent).toBe(PROMESSA)
    expect(PROMESSA).toBe('A rotina do bebê, dividida com carinho.')
    expect(h1.firstChild!.textContent).toBe('A rotina do bebê,')
    const segunda = h1.querySelector('.cm-segunda-linha')!
    expect(segunda.textContent!.trim()).toBe('dividida com carinho.')
    // O h1 não anima: nada de linhas escondidas do leitor de tela nem de texto duplicado.
    expect(h1.querySelector('[aria-hidden="true"], .sr-only')).toBeNull()
  })

  it('traz o lide, o primário "Começar grátis" para /app/hoje e o link sublinhado "Ver como funciona"', () => {
    abrirInicio()
    const h1 = screen.getByRole('heading', { level: 1 })
    const heroi = h1.closest('section')!
    expect(
      within(heroi).getByText(
        'Registre mamada, sono e fralda em dois toques. Na troca de turno, quem chega já vê o que aconteceu.',
      ),
    ).toBeTruthy()

    const primario = within(heroi).getByRole('link', { name: 'Começar grátis' })
    expect(primario.getAttribute('href')).toBe('/app/hoje')
    expect(primario.getAttribute('data-botao')).toBe('primario')

    const secundario = within(heroi).getByRole('link', { name: 'Ver como funciona' })
    expect(secundario.tagName).toBe('A')
    expect(secundario.getAttribute('href')).toBe('/como-funciona')
    expect(secundario.classList.contains('in-link-secundario')).toBe(true)
    expect(secundario.classList.contains('alvo-toque')).toBe(true)
  })

  it('mostra a cena dos três celulares, carregada na hora, ao lado do texto', () => {
    abrirInicio()
    const heroi = screen.getByRole('heading', { level: 1 }).closest('section')!
    const cena = within(heroi).getByRole('img', {
      name: 'Três celulares sobre pedestais de oliva num fundo de mel, mostrando telas reais do AppMaternidade.',
    })
    expect(cena.getAttribute('src')).toBe('/cenas/inicio/heroi@1x.webp')
    expect(cena.getAttribute('srcset')).toBe('/cenas/inicio/heroi@1x.webp 1x, /cenas/inicio/heroi@2x.webp 2x')
    expect(cena.getAttribute('width')).toBe('768')
    expect(cena.getAttribute('height')).toBe('512')
    expect(cena.getAttribute('loading')).toBe('eager')
    expect(cena.closest('[data-painel="mel"]')).not.toBeNull()
  })
})

describe('Início: números e selos', () => {
  it('os 3 números ficam numa seção com o h2 "Números do app" só para o leitor de tela', () => {
    abrirInicio()
    const secao = screen.getByRole('region', { name: 'Números do app' })
    expect(within(secao).getByRole('heading', { level: 2 }).classList.contains('sr-only')).toBe(true)
    const itens = within(secao).getAllByRole('listitem')
    expect(itens.map((item) => textoLido(item))).toEqual(['7 tipos de registro', '2 toques', '0 metas ou comparações'])
    // O número é uma peça própria (a figura de exibição), separada da legenda.
    expect(itens.map((item) => item.querySelector('.in-numeros-valor')!.textContent)).toEqual(['7', '2', '0'])
    expect(itens.map((item) => item.querySelector('.in-numeros-legenda')!.textContent)).toEqual([
      'tipos de registro',
      'toques',
      'metas ou comparações',
    ])
  })

  it('abaixo de 768 os 3 números ficam empilhados com fios horizontais; a fileira de 3 com fios verticais só de 768 em diante (DESIGN.md 4)', () => {
    const regras = lerRegrasCss('componentes/inicio/inicio.css')
    const doSeletor = (seletor: string) => regras.filter((regra) => regra.seletores.includes(seletor))
    const doTablet = (regra: RegraCss) => regra.midia !== null && /min-width:\s*768px/.test(regra.midia)
    const colunas = (regra: RegraCss) => /grid-template-columns:\s*([^;]+)/.exec(regra.corpo)?.[1].trim()

    const lista = doSeletor('.in-numeros-lista')
    const listaBase = lista.filter((regra) => regra.midia === null)
    expect(listaBase.length).toBeGreaterThan(0)
    // Na base (o celular), uma coluna só, ou nenhuma grade declarada.
    for (const regra of listaBase) {
      const valor = colunas(regra)
      if (valor !== undefined) expect(valor).toMatch(/^(minmax\(0, 1fr\)|1fr)$/)
    }
    // A grade de 3 colunas existe, e só dentro do bloco de 768 em diante.
    const comTres = lista.filter((regra) => /repeat\(3/.test(regra.corpo))
    expect(comTres.length).toBeGreaterThan(0)
    for (const regra of comTres) expect(doTablet(regra)).toBe(true)

    const vizinho = doSeletor('.in-numeros-item + .in-numeros-item')
    // O fio vertical só de 768 em diante.
    const comVertical = vizinho.filter((regra) => /border-left:\s*1px solid/.test(regra.corpo))
    expect(comVertical.length).toBeGreaterThan(0)
    for (const regra of comVertical) expect(doTablet(regra)).toBe(true)
    // Na base, o fio horizontal entre um número e o seguinte.
    const vizinhoBase = vizinho.filter((regra) => regra.midia === null)
    expect(vizinhoBase.some((regra) => /border-top:\s*1px solid var\(--cor-fio-suave\)/.test(regra.corpo))).toBe(true)
  })

  it('os selos ficam numa seção com o h2 "O que o app promete" e trazem os cinco selos uma vez para o leitor', () => {
    abrirInicio()
    const secao = screen.getByRole('region', { name: 'O que o app promete' })
    expect(within(secao).getByRole('heading', { level: 2 }).classList.contains('sr-only')).toBe(true)
    const visiveis = within(secao)
      .getAllByRole('list')
      .flatMap((lista) => within(lista).getAllByRole('listitem'))
    expect(visiveis).toHaveLength(5)
    // Uma lista só para o leitor: a cópia do letreiro fica escondida dele.
    expect(secao.querySelectorAll('.cm-selos-lista:not([aria-hidden="true"])')).toHaveLength(1)
    expect(visiveis.map((item) => item.textContent)).toEqual([
      'Sem metas',
      'Sem comparações',
      'Dados só da família',
      'Funciona de madrugada',
      'Avó, pai e babá juntos',
    ])
  })
})

describe('Início: troca de turno', () => {
  it('o painel de mel tem o título, o texto, o desenho das mãos e o cartão "Desde que você saiu" em HTML', () => {
    abrirInicio()
    const painel = screen.getByRole('region', { name: 'Quem chega no turno já sabe o que houve.' })
    // H-3b: o painel é a Secao de variante `painel`; a cor mora na caixa de cor de dentro (`data-h="caixa-cor"`).
    expect(painel.getAttribute('data-h-variante')).toBe('painel')
    expect(painel.querySelector("[data-h='caixa-cor']")!.getAttribute('data-painel')).toBe('mel')
    expect(
      within(painel).getByText(
        'Cada pessoa registra o que fez, com o nome. Na troca, o app mostra tudo o que aconteceu desde a última vez que você olhou.',
      ),
    ).toBeTruthy()
    expect(painel.querySelector('img[data-ilustracao="maos-celular"]')).not.toBeNull()

    const tituloCartao = within(painel).getByRole('heading', { level: 3, name: 'Desde que você saiu' })
    const cartao = tituloCartao.closest<HTMLElement>('.cm-flutuante')!
    expect(cartao).not.toBeNull()
    expect(cartao.getAttribute('data-giro')).toBe('2')
    expect(['baixo-direita', 'topo-direita']).toContain(cartao.getAttribute('data-posicao'))
    expect(cartao.querySelector('img')).toBeNull()
    // POL, devolução 2: o cartão é da coluna do desenho, embaixo dele (um não cobre o outro).
    const arte = painel.querySelector('.in-turno-arte')!
    expect(cartao.parentElement).toBe(arte)
    const desenho = arte.querySelector('img[data-ilustracao="maos-celular"]')!
    expect(desenho.compareDocumentPosition(cartao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const linhas = within(cartao).getAllByRole('listitem')
    expect(
      linhas.map((linha) => [
        linha.querySelector('.in-cartao-evento')!.textContent,
        linha.querySelector('.in-cartao-quem')!.textContent,
        linha.querySelector('time')!.textContent,
      ]),
    ).toEqual([
      ['Mamada, lado esquerdo', 'Juliana', '02:40'],
      ['Fralda trocada', 'Bruno', '03:10'],
      ['Soneca começou', 'Carla', '03:25'],
    ])
    expect(within(cartao).getByText('Juliana')).toBeTruthy()
    expect(within(cartao).getByText('03:25').classList.contains('in-cartao-hora')).toBe(true)
    expect(linhas.map((linha) => linha.querySelector('[aria-hidden="true"]')!.textContent)).toEqual(['J', 'B', 'C'])
    expect(linhas.map((linha) => linha.querySelector('time')!.getAttribute('datetime'))).toEqual([
      '02:40',
      '03:10',
      '03:25',
    ])
  })
})

describe('Início: faixa da madrugada', () => {
  it('é a faixa de cacau com o título, o lide, o botão de mel e os tablets, sem traço preto', () => {
    abrirInicio()
    const faixa = screen.getByRole('region', { name: 'De madrugada, com uma mão só.' })
    // H-3b: a faixa é a Secao de variante `painel`; a cor mora na caixa de cor de dentro (`data-h="caixa-cor"`).
    expect(faixa.getAttribute('data-h-variante')).toBe('painel')
    expect(faixa.querySelector("[data-h='caixa-cor']")!.getAttribute('data-painel')).toBe('cacau')
    expect(
      within(faixa).getByText('O botão de iniciar mamada fica na metade de baixo da tela, grande, em mel sobre o escuro.'),
    ).toBeTruthy()
    const botao = within(faixa).getByRole('link', { name: 'Ver o modo madrugada' })
    expect(botao.getAttribute('href')).toBe('/como-funciona')
    expect(botao.getAttribute('data-botao')).toBe('mel')

    const cena = within(faixa).getByRole('img', {
      name: 'Dois tablets flutuando sobre o cacau, com telas reais do AppMaternidade',
    })
    expect(cena.getAttribute('src')).toBe('/cenas/inicio/faixa-cacau@1x.webp')
    // Carrega na hora: a faixa nunca aparece com o painel da cena vazio.
    expect(cena.getAttribute('loading')).toBe('eager')
    expect(cena.getAttribute('width')).toBe('768')
    expect(cena.getAttribute('height')).toBe('512')
    // A cena é o painel da faixa (vai até as bordas), não uma caixa solta.
    expect(cena.closest('picture')!.classList.contains('in-faixa-foto')).toBe(true)
    expect(cena.closest('[data-painel="mel"]')).toBeNull()
    expect(faixa.querySelector('[data-ilustracao]')).toBeNull()
  })
})

describe('Início: tabela', () => {
  it('é uma tabela de verdade, com 3 cabeçalhos de coluna e 5 linhas, e o celular sobre o linho num painel de areia', () => {
    abrirInicio()
    const secao = screen.getByRole('region', { name: 'O caderno ajuda. O app divide.' })
    const tabela = within(secao).getByRole('table', { name: 'AppMaternidade e caderno com mensagens soltas' })
    expect(within(tabela).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'O que você precisa',
      'AppMaternidade',
      'Caderno e mensagens',
    ])
    const corpo = tabela.querySelector('tbody')!
    const linhas = within(corpo).getAllByRole('row')
    expect(linhas).toHaveLength(5)
    expect(
      linhas.map((linha) => [
        within(linha).getByRole('rowheader').textContent,
        ...within(linha)
          .getAllByRole('cell')
          .map((celula) => textoLido(celula)),
      ]),
    ).toEqual([
      ['Registrar uma mamada com dois toques', 'Sim', 'Não'],
      ['Ver o que a outra pessoa já registrou', 'Sim', 'Não'],
      ['Funcionar de madrugada, com uma mão', 'Sim', 'Não'],
      ['Dar acesso com prazo para a babá', 'Sim', 'Não'],
      ['Sem metas nem comparações', 'Sim', 'Sim'],
    ])

    const foto = within(secao).getByRole('img', { name: 'Um celular sobre linho com uma tela real do AppMaternidade' })
    expect(foto.getAttribute('src')).toBe('/cenas/inicio/tabela@1x.webp')
    // Carrega na hora: o painel de areia ao lado da tabela nunca fica vazio.
    expect(foto.getAttribute('loading')).toBe('eager')
    expect(foto.getAttribute('width')).toBe('768')
    expect(foto.getAttribute('height')).toBe('512')
    expect(foto.closest('[data-painel]')!.getAttribute('data-painel')).toBe('areia')
  })
})

describe('Início: mídia dos painéis (M3)', () => {
  it('o desenho do turno e a foto da tabela ficam dentro da revelação na rolagem, no próprio painel', () => {
    abrirInicio()
    const turno = screen.getByRole('region', { name: 'Quem chega no turno já sabe o que houve.' })
    const desenho = turno.querySelector('img[data-ilustracao="maos-celular"]')!
    const revelaDesenho = desenho.closest('[data-revela]')
    expect(revelaDesenho).not.toBeNull()
    expect(revelaDesenho!.closest('.in-turno-arte')).not.toBeNull()

    const tabela = screen.getByRole('region', { name: 'O caderno ajuda. O app divide.' })
    const foto = within(tabela).getByRole('img', { name: 'Um celular sobre linho com uma tela real do AppMaternidade' })
    const revelaFoto = foto.closest('[data-revela]')
    expect(revelaFoto).not.toBeNull()
    expect(revelaFoto!.closest('.in-tabela-foto')).not.toBeNull()
  })
})

describe('Início: citação e depoimentos', () => {
  it('a citação da Carla vem antes dos 3 relatos, e a linha "Relatos ilustrativos" aparece uma vez', () => {
    const { main } = abrirInicio()
    const citacao = screen.getByText('“Pomada só à noite, a de dia acabou. Se ela acordar, o bico está na bolsa.”')
    expect(screen.getByText('Carla, avó da Heloísa, na nota das 22:40')).toBeTruthy()

    const secao = screen.getByRole('region', { name: 'Quem cuida conta como é.' })
    expect(citacao.compareDocumentPosition(secao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(secao).getByRole('heading', { level: 2 }).id).toBe(secao.getAttribute('aria-labelledby'))

    const relatos = within(secao).getAllByRole('figure')
    expect(
      relatos.map((relato) => [
        relato.querySelector('blockquote')!.textContent,
        ...[...relato.querySelectorAll('figcaption > span')].map((parte) => parte.textContent),
      ]),
    ).toEqual([
      ['“Agora eu sei a hora da última mamada sem acordar ninguém para perguntar.”', 'Marina', 'Mãe de primeira viagem'],
      [
        '“Eu anoto a soneca e a mãe dela vê do trabalho. Não preciso mandar mensagem.”',
        'Seu Antônio',
        'Avô, cuida às terças',
      ],
      [
        '“Vejo só o que preciso no meu turno, e o acesso acaba quando a gente combinou.”',
        'Lúcia',
        'Babá de meio período',
      ],
    ])
    expect(within(main).getAllByText('Relatos ilustrativos')).toHaveLength(1)
  })

  it('o relato da Marina é o grande, num painel de areia; os outros dois ficam fora dele, e cada um tem o seu desenho', () => {
    abrirInicio()
    const secao = screen.getByRole('region', { name: 'Quem cuida conta como é.' })
    const [grande, ...menores] = within(secao).getAllByRole('figure')
    expect(grande.getAttribute('data-painel')).toBe('areia')
    expect(grande.querySelector('.in-relato-grande-texto')).not.toBeNull()
    for (const menor of menores) expect(menor.closest('[data-painel]')).toBeNull()

    const desenhos = [grande, ...menores].map((relato) => relato.querySelector('img[data-ilustracao]')!)
    // A babá do relato é a que brinca no tapete (POL, devolução item 6), não a figura do bebê.
    expect(desenhos.map((img) => img.getAttribute('data-ilustracao'))).toEqual(['mae-noite', 'pai-colo', 'baba-tapete'])
    // Enfeite: o nome e o papel já dizem quem fala.
    expect(desenhos.map((img) => img.getAttribute('alt'))).toEqual(['', '', ''])
    expect(
      [grande, ...menores].map((relato) => relato.querySelector('figcaption > span:last-child')!.textContent),
    ).toEqual(['Mãe de primeira viagem', 'Avô, cuida às terças', 'Babá de meio período'])
  })
})

describe('Início: perguntas', () => {
  it('as 4 perguntas abrem com um clique e mostram a resposta', () => {
    abrirInicio()
    const secao = screen.getByRole('region', { name: 'Perguntas de quem chega agora.' })
    const perguntas: Array<[string, string]> = [
      [
        'Quanto custa?',
        'Hoje o site é uma demonstração gratuita. O preço, se houver, ainda não foi definido, e nunca haverá anúncio feito com os dados da sua rotina.',
      ],
      [
        'Quem vê os registros do bebê?',
        'Só as pessoas que você convidar para a família. Nada do que é registrado aparece na comunidade.',
      ],
      [
        'Funciona de madrugada?',
        'Funciona. O modo madrugada escurece a tela e deixa o botão de mamada grande, na metade de baixo, ao alcance do polegar.',
      ],
      ['Posso convidar a babá?', 'Pode. O convite tem papel e prazo, e você revoga o acesso quando quiser.'],
    ]
    const botoes = within(secao).getAllByRole('button')
    expect(botoes.map((botao) => botao.textContent)).toEqual(perguntas.map(([pergunta]) => pergunta))

    for (const [pergunta, resposta] of perguntas) {
      const botao = within(secao).getByRole('button', { name: pergunta })
      expect(botao.getAttribute('aria-expanded')).toBe('false')
      const regiao = document.getElementById(botao.getAttribute('aria-controls')!)!
      expect(regiao.hidden).toBe(true)

      fireEvent.click(botao)

      expect(botao.getAttribute('aria-expanded')).toBe('true')
      expect(regiao.hidden).toBe(false)
      expect(within(secao).getByRole('region', { name: pergunta }).textContent).toBe(resposta)

      fireEvent.click(botao)

      expect(botao.getAttribute('aria-expanded')).toBe('false')
      expect(regiao.hidden).toBe(true)
    }
  })

  it('cada pergunta é um botão num h3, sem números (não é uma sequência), e a seção tem o desenho da avó', () => {
    abrirInicio()
    const secao = screen.getByRole('region', { name: 'Perguntas de quem chega agora.' })
    const h3s = within(secao).getAllByRole('heading', { level: 3 })
    expect(h3s).toHaveLength(4)
    for (const h3 of h3s) {
      const botao = within(h3).getByRole('button')
      expect(botao.getAttribute('type')).toBe('button')
    }
    // DESIGN.md 7: nada de marcador numerado; as perguntas não são uma sequência.
    expect(secao.querySelector('.in-faq-num')).toBeNull()
    expect(secao.textContent).not.toMatch(/\b0[1-4]\b/)
    // O desenho é da seção (em toda largura), antes da lista, e só enfeite.
    const avo = secao.querySelector('img[data-ilustracao="avo-carrinho"]')!
    expect(avo.getAttribute('alt')).toBe('')
    expect(avo.getAttribute('loading')).toBe('eager')
    const lista = secao.querySelector('[data-acordeao]')!
    expect(avo.compareDocumentPosition(lista) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // POL, devolução 4: o retrato abre a cabeça da seção, antes do título, no mesmo bloco dele.
    const titulo = within(secao).getByRole('heading', { level: 2 })
    expect(avo.parentElement).toBe(titulo.parentElement)
    expect(avo.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('Início: fechamento', () => {
  it('é um painel de cacau (não se funde com o rodapé de mel) com uma frase e um só clicável, "Começar grátis", e o bebê no tapete', () => {
    abrirInicio()
    const secao = screen.getByRole('region', { name: 'Sua família inteira no mesmo dia.' })
    // H-3b: o fechamento é a Secao de variante `painel`; a cor mora na caixa de cor de dentro (`data-h="caixa-cor"`).
    expect(secao.getAttribute('data-h-variante')).toBe('painel')
    const painel = secao.querySelector<HTMLElement>("[data-h='caixa-cor']")!
    expect(painel.getAttribute('data-painel')).toBe('cacau')
    const clicaveis = painel.querySelectorAll('a, button, input, select, textarea, [tabindex]')
    expect(clicaveis).toHaveLength(1)
    const primario = within(painel).getByRole('link', { name: 'Começar grátis' })
    expect(primario.getAttribute('href')).toBe('/app/hoje')
    expect(primario.getAttribute('data-botao')).toBe('primario')

    // A babá no tapete está nos relatos; aqui vai o desenho que sobra, para nenhum se repetir na página.
    const desenho = within(painel).getByRole('img', { name: DESCRICAO_ILUSTRACAO['tummy-time'] })
    expect(desenho.getAttribute('data-ilustracao')).toBe('tummy-time')
    // Carrega na hora: sem ele, sobraria só o disco vazio na borda do painel.
    expect(desenho.getAttribute('loading')).toBe('eager')
    // O desenho é a primeira coisa do painel, num disco de mel por cima da borda de cima, antes do
    // título: o traço preto nunca fica sobre o cacau.
    const disco = painel.firstElementChild!
    expect(disco.classList.contains('in-fechamento-disco')).toBe(true)
    expect(disco.firstElementChild).toBe(desenho)
    // Os seis desenhos da página são todos diferentes.
    const nomes = [...screen.getByRole('main').querySelectorAll('img[data-ilustracao]')].map((img) =>
      img.getAttribute('data-ilustracao'),
    )
    expect(new Set(nomes).size).toBe(nomes.length)
  })

  it('"Começar grátis" aparece duas vezes, na abertura e no fechamento, sempre para /app/hoje', () => {
    const { main } = abrirInicio()
    const links = within(main).getAllByRole('link', { name: 'Começar grátis' })
    expect(links).toHaveLength(2)
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/app/hoje', '/app/hoje'])
    expect(links[0].closest('section')!.contains(screen.getByRole('heading', { level: 1 }))).toBe(true)
    expect(links[1].closest('[data-painel="cacau"]')!.textContent).toContain('Sua família inteira')
    expect(links[1].getAttribute('data-botao')).toBe('primario')
  })
})

describe('Início: ordem e texto da página', () => {
  it('as seções vêm na ordem do contrato', () => {
    const { main } = abrirInicio()
    const titulos = within(main)
      .getAllByRole('heading', { level: 2 })
      .map((h2) => textoLido(h2))
    expect(titulos).toEqual([
      'Números do app',
      'O que o app promete',
      'Quem chega no turno já sabe o que houve.',
      'De madrugada, com uma mão só.',
      'O caderno ajuda. O app divide.',
      'Quem cuida conta como é.',
      'Perguntas de quem chega agora.',
      'Sua família inteira no mesmo dia.',
    ])
  })

  it('em todo título de duas linhas, a segunda linha inteira é um bloco itálico só dela', () => {
    const { main } = abrirInicio()
    expect(main.classList.contains('in-pagina')).toBe(true)
    const segundas: Record<string, string> = {
      'Quem chega no turno': 'já sabe o que houve.',
      'De madrugada,': 'com uma mão só.',
      'O caderno ajuda.': 'O app divide.',
      'Quem cuida': 'conta como é.',
      Perguntas: 'de quem chega agora.',
      'Sua família inteira': 'no mesmo dia.',
    }
    const titulos = within(main)
      .getAllByRole('heading', { level: 2 })
      .filter((h2) => !h2.classList.contains('sr-only'))
    expect(titulos).toHaveLength(Object.keys(segundas).length)
    for (const h2 of titulos) {
      const linhas = [...h2.querySelectorAll(':scope > [aria-hidden="true"]')]
      expect(linhas).toHaveLength(2)
      const [primeira, segunda] = linhas
      expect(primeira.classList.contains('cm-segunda-linha')).toBe(false)
      expect(segunda.classList.contains('cm-segunda-linha')).toBe(true)
      expect(segunda.textContent).toBe(segundas[primeira.textContent!])
    }
  })

  it('não mostra "Protótipo" nem "dados de exemplo" na página', () => {
    const { container, main } = abrirInicio()
    expect(main.textContent).not.toMatch(/protótipo|dados de exemplo/i)
    expect(container.textContent).not.toMatch(/Protótipo|dados de exemplo/)
    expect(screen.queryByText(/Protótipo/)).toBeNull()
  })
})

// H-3b: o espaço do Início sai das primitivas de layout e dos papéis do web/DESIGN.md (`## Layout`).
describe('Início: harmonia de espaço (H-3b)', () => {
  const VAOS = new Set(['junto', 'pilha', 'grupo', 'bloco', 'midia'])

  it('toda filha do <main> é uma Secao (as caixas se tocam, sem margem entre elas) e a área antiga não existe mais', () => {
    const { main } = abrirInicio()
    const filhas = [...main.children]
    // abertura, números e selos, turno, faixa, tabela, citação, relatos, perguntas e fechamento
    expect(filhas).toHaveLength(9)
    for (const filha of filhas) expect(filha.matches("[data-h~='secao']"), filha.outerHTML.slice(0, 80)).toBe(true)
    expect(main.querySelector('.cm-area')).toBeNull()
    // Só os três painéis levam a variante `painel`: o turno de mel, a faixa e o fechamento de cacau.
    const paineis = filhas.filter((filha) => filha.getAttribute('data-h-variante') === 'painel')
    expect(paineis.map((filha) => filha.querySelector("[data-h='caixa-cor']")!.getAttribute('data-painel'))).toEqual([
      'mel',
      'cacau',
      'cacau',
    ])
  })

  it('o conteúdo de cada seção sem fundo mora no quadro', () => {
    const { main } = abrirInicio()
    const semFundo = [...main.children].filter((filha) => filha.getAttribute('data-h-variante') !== 'painel')
    expect(semFundo).toHaveLength(6)
    for (const secao of semFundo) {
      expect(secao.querySelector(":scope > [data-h~='quadro']"), secao.className).not.toBeNull()
    }
  })

  it('a abertura é uma Colunas de texto (7fr) e cena (5fr) com vão de mídia, lado a lado a partir de 1100 (o ponto de hoje)', () => {
    const { main } = abrirInicio()
    const colunas = main.querySelector<HTMLElement>("[data-h~='secao']:first-child [data-h~='colunas']")!
    expect(colunas.getAttribute('data-h-vao')).toBe('midia')
    expect(colunas.getAttribute('data-h-quebra')).toBe('1100')
    expect(colunas.style.getPropertyValue('--h-colunas')).toBe('minmax(0, 7fr) minmax(0, 5fr)')
    const [texto, cena] = [...colunas.querySelectorAll(":scope > [data-h~='coluna']")]
    expect(within(texto as HTMLElement).getByRole('heading', { level: 1 })).toBeTruthy()
    expect(cena.querySelector('img')).not.toBeNull()
  })

  it('na abertura, título e lide ficam numa pilha `pilha` e a ação vem depois, numa pilha `grupo`', () => {
    abrirInicio()
    const h1 = screen.getByRole('heading', { level: 1 })
    const titulo = h1.closest<HTMLElement>("[data-h~='pilha']")!
    expect(titulo.getAttribute('data-h-vao')).toBe('pilha')
    const externa = titulo.parentElement!.closest<HTMLElement>("[data-h~='pilha']")!
    expect(externa.getAttribute('data-h-vao')).toBe('grupo')
    expect(externa.querySelector('.in-heroi-acoes')).not.toBeNull()
  })

  it('as perguntas são uma Colunas 7fr/5fr com vão `bloco` a partir de 1100, como os relatos', () => {
    abrirInicio()
    const secao = screen.getByRole('region', { name: 'Perguntas de quem chega agora.' })
    const colunas = secao.querySelector<HTMLElement>("[data-h~='colunas']")!
    expect(colunas.getAttribute('data-h-vao')).toBe('bloco')
    expect(colunas.getAttribute('data-h-quebra')).toBe('1100')
    expect(colunas.style.getPropertyValue('--h-colunas')).toBe('minmax(0, 7fr) minmax(0, 5fr)')
    expect(colunas.querySelectorAll(":scope > [data-h~='coluna']")).toHaveLength(2)
  })

  it('todo vão de pilha da página é de um papel do DESIGN.md, e há pilhas de `pilha`, `grupo` e `bloco`', () => {
    const { main } = abrirInicio()
    const vaos = [...main.querySelectorAll<HTMLElement>("[data-h~='pilha']")].map((pilha) => pilha.getAttribute('data-h-vao')!)
    for (const vao of vaos) expect(VAOS.has(vao), vao).toBe(true)
    for (const vao of ['pilha', 'grupo', 'bloco']) expect(vaos, vao).toContain(vao)
  })

  it('o inicio.css não tem margem entre seções nem a escala própria de antes: só papéis e as exceções fechadas', () => {
    const regras = lerRegrasCss('componentes/inicio/inicio.css')
    const seletores = regras.flatMap((regra) => regra.seletores)
    expect(seletores.some((seletor) => /\.in-secao\b/.test(seletor))).toBe(false)
    const fonte = readFileSync(join(process.cwd(), 'src', 'componentes/inicio/inicio.css'), 'utf8')
    expect(fonte).not.toMatch(/--in-respiro|--in-largura-painel|--cm-respiro-painel|--cm-recuo-painel|--cm-margem/)

    // Espaço entre blocos: nenhum px, rem ou em solto em margin, padding ou gap, fora destas três exceções (o
    // padding que deixa o recorte do desenho concêntrico ao círculo, e o do círculo de 44 px do acordeão).
    const soltos: string[] = []
    for (const regra of regras) {
      for (const declaracao of regra.corpo.split(';')) {
        const corte = declaracao.indexOf(':')
        if (corte < 0) continue
        const propriedade = declaracao.slice(0, corte).trim()
        const valor = declaracao.slice(corte + 1).trim()
        if (propriedade.startsWith('--')) continue
        if (!/^(margin|padding|gap|row-gap|column-gap)(-|$)/.test(propriedade)) continue
        if (/\d(\.\d+)?(px|rem|em)\b/.test(valor)) soltos.push(`${regra.seletores.join(', ')} { ${propriedade}: ${valor} }`)
      }
    }
    expect(soltos).toEqual([
      '.in-relato-arte.cm-ilustracao { padding: 6px }',
      '.in-perguntas-arte.cm-ilustracao { padding: 6px }',
      '.in-faq .cm-acordeao-icone { padding: 10.5px }',
    ])
  })

  it('os vãos das grades de seção são os papéis do contrato: `midia` entre texto e mídia, `bloco` entre cartões e colunas', () => {
    const regras = lerRegrasCss('componentes/inicio/inicio.css')
    const gapDe = (seletor: string) =>
      regras
        .filter((regra) => regra.seletores.includes(seletor) && regra.midia === null)
        .map((regra) => /(?:^|[\s;])gap:\s*([^;]+)/.exec(regra.corpo)?.[1].trim())
        .find((valor) => valor !== undefined)
    expect(gapDe('.in-turno-grade')).toBe('var(--espaco-midia)')
    expect(gapDe('.in-faixa-grade')).toBe('var(--espaco-midia)')
    expect(gapDe('.in-tabela-grade')).toBe('var(--espaco-bloco)')
    expect(gapDe('.in-relatos-grade')).toBe('var(--espaco-bloco)')
  })

  it('o stylelint da harmonia só acusa no inicio.css as exceções fechadas (larguras máximas, o número grande e o círculo dos desenhos)', async () => {
    const resultado = await stylelint.lint({
      files: join(process.cwd(), 'src', 'componentes/inicio/inicio.css'),
      configFile: join(process.cwd(), 'stylelint.config.mjs'),
    })
    const acusados = new Set(
      resultado.results.flatMap((arquivo) =>
        arquivo.warnings.map((aviso) => {
          const [, valor, propriedade] = /Valor solto "(.+)" em "(.+)":/.exec(aviso.text) ?? []
          return `${propriedade} ${valor}`
        }),
      ),
    )
    // Larguras máximas de texto (`max-width` sai do RF-03 final; o `none` do cartão do turno também), o número grande (`numero`, fora da escala), o
    // cabeçalho de 14 px da tabela a 390 (cabe "AppMaternidade" na coluna justa) e o padding que deixa o recorte
    // do desenho concêntrico ao círculo (6 px) ou do ícone do acordeão (10,5 px): listados para harmonia-excecoes.json.
    expect([...acusados].sort()).toEqual(
      [
        'font-size 0.875rem',
        'font-size clamp(40px, 2.286vw + 31.086px, 64px)',
        'max-width 30rem',
        'max-width 32rem',
        'max-width 34rem',
        'max-width 40rem',
        'max-width 56rem',
        'max-width 768px',
        'max-width none',
        'padding 10.5px',
        'padding 6px',
      ].sort(),
    )
  }, 60_000)

  it('os papéis usados valem os números de MEDIDAS §7 (390 e 1440) no tema gerado', () => {
    const tema = readFileSync(join(process.cwd(), 'src', 'styles/harmonia.gerado.css'), 'utf8')
    const pontas: Record<string, [number, number]> = {
      junto: [8, 12],
      pilha: [16, 16],
      grupo: [24, 32],
      bloco: [24, 48],
      midia: [32, 64],
      secao: [48, 80],
      'secao-ampla': [72, 128],
      painel: [24, 48],
    }
    for (const [papel, [em390, em1440]] of Object.entries(pontas)) {
      const linha = new RegExp(`--espaco-${papel}:\\s*([^;]+);`).exec(tema)?.[1] ?? ''
      const numeros = [...linha.matchAll(/(\d+)px/g)].map((m) => Number(m[1]))
      // `clamp(<390>, calc(<390> + ...), <1440>)`: a primeira e a última medida em px são as pontas.
      expect(numeros[0], `${papel} em 390`).toBe(em390)
      expect(numeros[numeros.length - 1], `${papel} em 1440`).toBe(em1440)
    }
  })
})
