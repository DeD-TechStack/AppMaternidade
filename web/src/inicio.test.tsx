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
  })

  it('os selos ficam numa seção com o h2 "O que o app promete" e trazem os cinco selos uma vez para o leitor', () => {
    abrirInicio()
    const secao = screen.getByRole('region', { name: 'O que o app promete' })
    expect(within(secao).getByRole('heading', { level: 2 }).classList.contains('sr-only')).toBe(true)
    const visiveis = within(secao)
      .getAllByRole('list')
      .flatMap((lista) => within(lista).getAllByRole('listitem'))
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
    expect(painel.getAttribute('data-painel')).toBe('mel')
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
    expect(faixa.getAttribute('data-painel')).toBe('cacau')
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
    expect(secao.getAttribute('data-painel')).toBe('areia')
    expect(citacao.compareDocumentPosition(secao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

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
    }
  })
})

describe('Início: fechamento', () => {
  it('é um painel de mel com uma frase e um só clicável, "Começar grátis", e a babá no tapete', () => {
    abrirInicio()
    const painel = screen.getByRole('region', { name: 'Sua família inteira no mesmo dia.' })
    expect(painel.getAttribute('data-painel')).toBe('mel')
    const clicaveis = painel.querySelectorAll('a, button, input, select, textarea, [tabindex]')
    expect(clicaveis).toHaveLength(1)
    const primario = within(painel).getByRole('link', { name: 'Começar grátis' })
    expect(primario.getAttribute('href')).toBe('/app/hoje')
    expect(primario.getAttribute('data-botao')).toBe('primario')

    const baba = within(painel).getByRole('img', { name: DESCRICAO_ILUSTRACAO['baba-tapete'] })
    expect(baba.getAttribute('data-ilustracao')).toBe('baba-tapete')
    // Carrega na hora: sem ela, sobraria só o papel vazio acima do painel.
    expect(baba.getAttribute('loading')).toBe('eager')
    // A babá é a primeira coisa do painel: fica por cima da borda de cima, antes do título.
    expect(painel.firstElementChild).toBe(baba)
  })

  it('"Começar grátis" aparece duas vezes, na abertura e no fechamento, sempre para /app/hoje', () => {
    const { main } = abrirInicio()
    const links = within(main).getAllByRole('link', { name: 'Começar grátis' })
    expect(links).toHaveLength(2)
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/app/hoje', '/app/hoje'])
    expect(links[0].closest('section')!.contains(screen.getByRole('heading', { level: 1 }))).toBe(true)
    expect(links[1].closest('[data-painel="mel"]')!.textContent).toContain('Sua família inteira')
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
