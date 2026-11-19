import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen } from '@testing-library/react'
import { rodarAxe } from './axe.ts'
import { describe, expect, it } from 'vitest'
import { CUIDADO_DESTAQUE } from '../conteudo/publicas-destaque.ts'
import { INICIO } from '../conteudo/textos.ts'
import { renderizarRota } from './renderizarRota.tsx'

// Cuidado compartilhado e Desenvolvimento no "Campo de mel": títulos, passos, avisos, fontes, cenas e links, no
// site de verdade (roteador em memória, dentro da casca). Como funciona saiu daqui: ele é a casa acesa e tem o
// seu próprio teste, paginas/publicas/comoFunciona.casa.test.tsx.

const PAGINAS = [
  ['/cuidado-compartilhado', CUIDADO_DESTAQUE.titulo],
] as const

// /cuidado-compartilhado foi refeita nas seções da casa (CLONE-CUIDADO): o h1 em duas linhas com itálico, os cartões,
// os painéis de mel e os botões `.pd-acoes` são a cara antiga e não valem para ela. O que a página nova promete está em
// `paginas/publicas/cuidado.casa.test.tsx`; aqui ela fica só nos testes que não dependem da cara (axe, avisos, brilho).
const PAGINAS_NA_CARA_ANTIGA = PAGINAS.filter(([caminho]) => caminho !== '/cuidado-compartilhado')

/** O texto do título: as duas linhas em texto comum, sem cópia só para leitor de tela. */
const nomeDoTitulo = (titulo: HTMLElement) => titulo.textContent

async function violacoes(container: HTMLElement): Promise<string[]> {
  const resultado = await rodarAxe(container, { rules: { 'color-contrast': { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`)
}

describe('as três páginas públicas em destaque', () => {
  for (const [caminho, titulo] of PAGINAS_NA_CARA_ANTIGA) {
    it(`${caminho}: um main só, com um h1 de duas linhas (a segunda em itálico), dentro da casca`, () => {
      const { container } = renderizarRota(caminho)
      const principal = container.querySelectorAll('main')
      expect(principal).toHaveLength(1)
      const h1s = screen.getAllByRole('heading', { level: 1 })
      expect(h1s).toHaveLength(1)
      expect(principal[0].contains(h1s[0])).toBe(true)
      expect(nomeDoTitulo(h1s[0])).toBe(titulo.join(' '))
      expect(h1s[0].querySelector('.cm-segunda-linha')!.textContent).toBe(titulo[1])
      expect(container.querySelector('header[data-cabecalho]')).not.toBeNull()
      expect(container.querySelector('footer[data-rodape]')).not.toBeNull()
    })
  }

  // Cuidado compartilhado (casa): um main, o h1 novo (uma linha de texto, sem itálico), a casca em volta.
  it('/cuidado-compartilhado: um main só, com o h1 "A babá vê o quê?", dentro da casca', () => {
    const { container } = renderizarRota('/cuidado-compartilhado')
    const principal = container.querySelectorAll('main')
    expect(principal).toHaveLength(1)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(principal[0].contains(h1s[0])).toBe(true)
    expect(nomeDoTitulo(h1s[0])).toBe('A babá vê o quê?')
    expect(container.querySelector('header[data-cabecalho]')).not.toBeNull()
    expect(container.querySelector('footer[data-rodape]')).not.toBeNull()
  })

  for (const [caminho] of PAGINAS) {
    it(`${caminho}: sem violações do axe`, async () => {
      const { container } = renderizarRota(caminho)
      expect(await violacoes(container)).toEqual([])
    })

    it(`${caminho}: nada de rascunho, revisor, nomes fora da família de exemplo nem "Protótipo" nos cartões`, () => {
      const { container } = renderizarRota(caminho)
      const texto = container.querySelector('main')!.textContent!
      expect(texto).not.toMatch(/rascunho|revisor|nota para|pendente|quanto mais, melhor/i)
      expect(texto).not.toMatch(/\b(Lia|Ana)\b/)
      for (const cartao of container.querySelectorAll('main .cm-flutuante, main [data-cartao-plano]')) {
        expect(cartao.textContent).not.toMatch(/protótipo|dados de exemplo/i)
      }
    })

    it(`${caminho}: no máximo dois cartões flutuantes (giro fixo do contrato), nunca sobre uma cena (aparelho e pedestal)`, () => {
      const { container } = renderizarRota(caminho)
      const flutuantes = [...container.querySelectorAll<HTMLElement>('main .cm-flutuante')]
      expect(flutuantes.length).toBeLessThanOrEqual(2)
      for (const cartao of flutuantes) expect(['-4', '-2', '2', '4']).toContain(cartao.getAttribute('data-giro'))
      for (const cena of container.querySelectorAll('main img[data-cena]')) {
        expect(cena.closest('[data-painel]')!.querySelector('.cm-flutuante')).toBeNull()
      }
    })

    // O brilho de mel (`--brilho-mel`) fazia uma mancha turva no painel escuro: nenhuma das três
    // páginas o liga mais.
    it(`${caminho}: nenhuma faixa de cacau com a mancha do brilho de mel`, () => {
      const { container } = renderizarRota(caminho)
      expect(container.querySelector('main [data-brilho]')).toBeNull()
    })

    // Na página inteira (casca incluída), um aviso de demonstração só: o do rodapé da casca. Nenhum
    // outro parágrafo repete que é demonstração, que a família é fictícia, que a conta não está no ar
    // ou que nada é salvo. O aviso médico (AvisoSaude) é outra coisa e não conta.
    it(`${caminho}: um aviso de demonstração no documento inteiro, o do rodapé`, () => {
      const { container } = renderizarRota(caminho)
      const marcados = [...container.querySelectorAll('[data-aviso]')]
      expect(marcados).toHaveLength(1)
      expect(marcados[0].getAttribute('data-aviso')).toBe('demonstracao')
      expect(marcados[0].closest('footer[data-rodape]')).not.toBeNull()
      const DEMONSTRACAO = /fictíci|demonstração|não estão disponíveis|não (é|são) salv|nada do que você registra|sem salvar/i
      const porTexto = [...container.querySelectorAll('p, li, span, small, div')].filter(
        (no) => no.children.length === 0 && DEMONSTRACAO.test(no.textContent ?? ''),
      )
      expect(porTexto).toEqual([marcados[0]])
      for (const saude of container.querySelectorAll('[data-aviso-saude]')) {
        expect(saude.hasAttribute('data-aviso')).toBe(false)
      }
    })
  }
})

// Os CTAs ampliados (fonte raiz a 200% ou zoom de 200%, viewport de 195 px) não podem perder texto:
// o `.cm-botao` da base não quebra linha (`white-space: nowrap`), então o CSS escopado destas páginas
// libera a quebra nos botões de `.pd-acoes` e `.pd-faixa`. O jsdom não faz layout: a largura real é
// conferida nas capturas; aqui fica a regra e o fato de todo botão novo morar num desses dois lugares.
// Lido do disco: no Vitest, importar CSS não devolve o texto (o cwd é web/, como em estilo.test.ts).
const cssDestaque = readFileSync(
  join(process.cwd(), 'src', 'componentes', 'publicas-destaque', 'publicas-destaque.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '')

/** As regras do CSS (as mais internas, dentro ou fora de @media): seletores e declarações. */
const regras = [...cssDestaque.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, corpo]) => ({
  seletores: seletor.split(',').map((s) => s.trim().replace(/\s+/g, ' ')),
  declaracoes: Object.fromEntries(
    corpo
      .split(';')
      .map((d) => d.split(':').map((p) => p.trim()))
      .filter(([p, v]) => p && v)
      .map(([p, ...v]) => [p, v.join(':')]),
  ),
}))

/** As regras com um seletor que começa no contexto e chega a um botão (`exato`: o `.cm-botao` puro). */
const regrasDe = (contexto: string, exato = false) =>
  regras.filter((r) =>
    r.seletores.some((s) => s.startsWith(contexto) && (exato ? /\.cm-botao(?![\w-])/ : /\.cm-botao/).test(s)),
  )

describe('os CTAs das três páginas cabem quando ampliados', () => {
  for (const contexto of ['.pd-acoes', '.pd-faixa']) {
    it(`${contexto}: o botão quebra linha e acompanha o texto, sem esconder nem encolher nada`, () => {
      const base = regrasDe(contexto, true)
      expect(base.length, contexto).toBeGreaterThan(0)
      const juntas = Object.assign({}, ...base.map((r) => r.declaracoes)) as Record<string, string>
      expect(juntas['white-space']).toBe('normal')
      expect(juntas['max-width']).toBe('100%')
      expect(juntas['height']).toBe('auto')
      expect(juntas['text-align']).toBe('center')
      expect(juntas['padding-block']).toBeDefined()
      for (const regra of regrasDe(contexto)) {
        expect(regra.declaracoes['white-space'], regra.seletores.join(', ')).not.toBe('nowrap')
        expect(regra.declaracoes, regra.seletores.join(', ')).not.toHaveProperty('overflow')
        expect(regra.declaracoes, regra.seletores.join(', ')).not.toHaveProperty('text-overflow')
        expect(regra.declaracoes, regra.seletores.join(', ')).not.toHaveProperty('font-size')
        expect(regra.declaracoes, regra.seletores.join(', ')).not.toHaveProperty('outline')
      }
    })
  }

  for (const [caminho] of PAGINAS_NA_CARA_ANTIGA) {
    it(`${caminho}: todo botão do site dentro do main mora em .pd-acoes ou .pd-faixa`, () => {
      const { container } = renderizarRota(caminho)
      for (const botao of container.querySelectorAll('main .cm-botao')) {
        expect(botao.closest('.pd-acoes, .pd-faixa'), botao.textContent!).not.toBeNull()
      }
    })
  }
})

/** As regras de um seletor exato (o último composto, sem contexto), em qualquer @media. */
const regrasDoSeletor = (alvo: RegExp) => regras.filter((r) => r.seletores.some((s) => alvo.test(s)))

/** Os blocos @container: a condição e as regras de dentro. */
const blocosContainer = [...cssDestaque.matchAll(/@container\s*([^{]*)\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)].map(
  ([, condicao, corpo]) => ({
    condicao: condicao.trim(),
    regras: [...corpo.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, decl]) => ({
      seletor: seletor.trim().replace(/\s+/g, ' '),
      decl: decl.replace(/\s+/g, ' '),
    })),
  }),
)

/** Nenhuma regra esconde, corta ou trava em uma linha o texto do alvo. */
function semCorteNemTrava(alvo: RegExp) {
  for (const regra of regrasDoSeletor(alvo)) {
    const onde = regra.seletores.join(', ')
    expect(regra.declaracoes['white-space'], onde).not.toBe('nowrap')
    expect(regra.declaracoes, onde).not.toHaveProperty('overflow')
    expect(regra.declaracoes, onde).not.toHaveProperty('text-overflow')
    expect(regra.declaracoes, onde).not.toHaveProperty('height')
  }
}

// R2/R3: a 195 px e com a fonte raiz a 200% os rótulos das abas e as linhas dos cartões não podem se
// sobrepor. O jsdom não faz layout: aqui ficam as regras (lidas do disco), e a largura real fica para
// as capturas.
describe('as abas de fase e as linhas dos cartões refluem quando falta largura', () => {
  it('as abas: grade de colunas iguais que vira uma coluna (medida em rem), rótulo que quebra linha', () => {
    const grades = regrasDoSeletor(/^\.pd-abas$/)
      .map((r) => r.declaracoes['grid-template-columns'])
      .filter(Boolean)
    expect(grades.length).toBeGreaterThan(0)
    for (const grade of grades) {
      expect(grade).toMatch(/^repeat\(auto-fit, minmax\(min\(100%, [\d.]+rem\), 1fr\)\)$/)
    }
    semCorteNemTrava(/\.pd-abas?(?![\w-])/)
    const aba = Object.assign({}, ...regrasDoSeletor(/^\.pd-aba$/).map((r) => r.declaracoes)) as Record<string, string>
    expect(aba['white-space']).toBe('normal')
    expect(aba['min-height']).toBe('44px')
    expect(aba['padding-block']).toBeDefined()
  })

  it('as linhas dos cartões: cada cartão é um contêiner e, estreito (em rem), o texto desce para uma linha inteira', () => {
    const cartao = Object.assign({}, ...regrasDoSeletor(/^\.pd-cartao$/).map((r) => r.declaracoes)) as Record<string, string>
    expect(cartao['container-type']).toBe('inline-size')
    const estreito = blocosContainer.find((b) => /max-width:\s*[\d.]+rem/.test(b.condicao))
    expect(estreito, 'um @container (max-width: …rem)').toBeDefined()
    const regra = (alvo: string) => estreito!.regras.find((r) => r.seletor === alvo)?.decl ?? ''
    expect(regra('.pd-linha')).toMatch(/flex-wrap: wrap/)
    expect(regra('.pd-linha-texto')).toMatch(/flex: 1 1 100%/)
    expect(regra('.pd-linha-texto')).toMatch(/order: 3/)
    const texto = Object.assign({}, ...regrasDoSeletor(/^\.pd-linha-texto$/).map((r) => r.declaracoes)) as Record<string, string>
    expect(texto['min-width']).toBe('0')
    expect(texto['overflow-wrap']).toBe('anywhere')
    // A hora ("14:05") é uma peça só e não quebra (nowrap, rodada POL item 7); o resto da linha nunca trava.
    semCorteNemTrava(/\.pd-linha(?!-hora)(-[\w-]+)?$/)
    const hora = Object.assign({}, ...regrasDoSeletor(/^\.pd-linha-hora$/).map((r) => r.declaracoes)) as Record<string, string>
    expect(hora['white-space']).toBe('nowrap')
  })
})

// Rodada de olhar 2: palavra partida ao meio nos cartões estreitos, painel de mel vazio e rótulo ao lado
// do valor. O jsdom não faz layout: aqui ficam as regras (lidas do disco) e o que o React entrega.
describe('cartões flutuantes e painéis: sem palavra partida, sem painel vazio, rótulo sobre o valor', () => {
  it('o cartão de app só quebra palavra como último recurso e a coluna do cabeçalho não encolhe abaixo da palavra mais longa', () => {
    const cartao = Object.assign({}, ...regrasDoSeletor(/^\.pd-cartao$/).map((r) => r.declaracoes)) as Record<string, string>
    expect(cartao['overflow-wrap']).toBe('break-word')
    const cabeca = Object.assign({}, ...regrasDoSeletor(/^\.pd-cartao-cabeca$/).map((r) => r.declaracoes)) as Record<string, string>
    expect(cabeca['flex-wrap']).toBe('wrap')
    const coluna = Object.assign({}, ...regrasDoSeletor(/^\.pd-cartao-cabeca > div$/).map((r) => r.declaracoes)) as Record<string, string>
    expect(coluna['min-width']).toBe('min-content')
  })

  it('no celular o convite da primeira semana ocupa a coluna inteira e o ícone fica em cima do texto', () => {
    const largura = regrasDoSeletor(/^\.pd-pilha > \.pd-em-fluxo\.cm-flutuante$/).map((r) => r.declaracoes.width)
    expect(largura).toContain('100%')
    const pilha = Object.assign({}, ...regrasDoSeletor(/^\.pd-pilha \.pd-cartao-cabeca$/).map((r) => r.declaracoes)) as Record<string, string>
    expect(pilha['flex-direction']).toBe('column')
  })

  it('o registro do tummy time empilha o rótulo sobre o valor em qualquer largura (sem linha única a partir de 600 px)', () => {
    for (const regra of regrasDoSeletor(/^\.pd-cartao-legenda/)) {
      expect(regra.declaracoes.display, regra.seletores.join(', ')).not.toBe('flex')
      expect(regra.declaracoes['align-items'], regra.seletores.join(', ')).not.toBe('baseline')
    }
  })
})

// Rodada de revisão 1: o painel de mel do desenho da babá ficava liso (sem `--luz-estudio`) e o fecho de
// Desenvolvimento tinha duas colunas de conteúdo muito desiguais (RF-07 b). O jsdom não faz layout:
// aqui ficam a classe que o `luz` produz e a estrutura/regras que impedem a composição lado a lado.
describe('painéis de mel com luz e blocos de fim de seção sem colunas desiguais', () => {
  for (const [caminho] of PAGINAS_NA_CARA_ANTIGA) {
    it(`${caminho}: todo painel de mel carrega a luz de estúdio (cm-painel-luz); os de areia, oliva e cacau não`, () => {
      const { container } = renderizarRota(caminho)
      const meis = [...container.querySelectorAll<HTMLElement>('main [data-painel="mel"]')]
      expect(meis.length, caminho).toBeGreaterThan(0)
      for (const painel of meis) {
        expect(painel.classList.contains('cm-painel-luz'), `${caminho}: ${painel.className}`).toBe(true)
      }
      for (const painel of container.querySelectorAll<HTMLElement>('main [data-painel]:not([data-painel="mel"])')) {
        expect(painel.classList.contains('cm-painel-luz'), `${caminho}: ${painel.className}`).toBe(false)
      }
    })
  }

  it('o fecho do tummy time (o texto e as fontes) é uma pilha: sem duas colunas de alturas desiguais (regras do CSS)', () => {
    // Nenhuma regra põe duas colunas (grade de 7fr/5fr, lado a lado) no bloco, em largura nenhuma.
    // (A lista dos nomes das fontes, dentro do cartão, pode ter duas colunas: é a lista, não o bloco.)
    const regrasDoFim = regrasDoSeletor(/^\.pd-tummy-fim( \.pd-fontes)?$/)
    expect(regrasDoFim.length).toBeGreaterThan(0)
    for (const regra of regrasDoFim) {
      const colunas = regra.declaracoes['grid-template-columns']
      if (colunas !== undefined) expect(colunas, regra.seletores.join(', ')).toBe('minmax(0, 1fr)')
      expect(regra.declaracoes, regra.seletores.join(', ')).not.toHaveProperty('border-left')
    }
    // O cartão de fontes não volta ao fio lateral da composição anterior.
    for (const regra of regrasDoSeletor(/^\.pd-tummy-fim \.pd-fontes$/)) {
      expect(regra.declaracoes, regra.seletores.join(', ')).not.toHaveProperty('border-left')
    }
  })
})

// O bloco "Cuidado compartilhado" (cartões, painéis de mel e tabela da cara antiga) saiu: a página nova é
// coberta por `paginas/publicas/cuidado.casa.test.tsx`.

// Rodada de polimento POL, volta 2 (I-POL-DES v2): uma classe de correção por teste. O jsdom não faz
// layout: aqui ficam o que o React entrega e as regras do CSS (lidas do disco); as medidas reais saem
// das capturas.
const decl = (alvo: RegExp) =>
  regrasDoSeletor(alvo).map((r) => r.declaracoes) as Array<Record<string, string>>

describe('polimento, volta 2', () => {
  it('horas e durações nunca quebram: o CSS as segura numa peça só (a página de cuidado saiu da cara antiga)', () => {
    for (const alvo of [/^\.pd-nq$/, /^\.pd-linha-hora$/]) {
      const juntas = Object.assign({}, ...decl(alvo)) as Record<string, string>
      expect(juntas['white-space'], String(alvo)).toBe('nowrap')
    }
    // H-3g r4: o parágrafo da hora do cartão é nowrap na base e só quebra no @container estreito (com a raiz a 200%
    // o título em rem passa da largura do cartão); a regra de fora do @container fica como estava.
    const base = decl(/^\.pd-cartao-hora$/).find((d) => 'white-space' in d)
    expect(base?.['white-space'], '.pd-cartao-hora (base)').toBe('nowrap')
    const estreito = blocosContainer.find((b) => /max-width:\s*[\d.]+rem/.test(b.condicao))!
    expect(estreito.regras.find((r) => r.seletor === '.pd-cartao-hora')?.decl).toMatch(/white-space: normal/)
  })

  for (const [caminho] of PAGINAS) {
    it(`${caminho}: nenhum botão diz "protótipo" (o aviso de demonstração já está na tela)`, () => {
      const { container } = renderizarRota(caminho)
      for (const botao of container.querySelectorAll('main .cm-botao')) {
        expect(botao.textContent, caminho).not.toMatch(/protótipo/i)
      }
    })
  }

  it('o primário de Cuidado compartilhado usa o rótulo que o Início já tem para a mesma ação', () => {
    expect(CUIDADO_DESTAQUE.primario.rotulo).toBe(INICIO.heroi.primario.rotulo)
  })

  it('o painel de cada cena tem a largura do arquivo em 1× (340 e 400): o 2× nunca é ampliado (RF-02 b)', () => {
    for (const [alvo, maximo] of [
      [/^\.pd-abertura \.pd-cena-retrato\.cm-painel$/, 340],
      [/^\.pd-abertura \.pd-cena-cacau\.cm-painel$/, 400],
    ] as const) {
      const larguras = decl(alvo)
        .map((d) => d.width)
        .filter(Boolean)
      expect(larguras.length, String(alvo)).toBeGreaterThan(0)
      for (const largura of larguras) {
        expect(largura, String(alvo)).toMatch(new RegExp(`^min\\(${maximo}px, 100%`))
      }
      // A imagem entra na proporção do arquivo, sem recorte.
      const sem = Object.assign({}, ...decl(/^\.pd-cena-(retrato|cacau) \.cm-cena-midia img$/)) as Record<string, string>
      expect(sem['aspect-ratio']).toBe('auto')
      expect(sem).not.toHaveProperty('object-fit')
    }
  })

  it('a faixa de oliva dos papéis tem um destaque só (os nomes): o cabeçalho é um rótulo sem faixa escura', () => {
    const cabeca = Object.assign({}, ...decl(/^\.pd-tabela thead th$/)) as Record<string, string>
    expect(cabeca).not.toHaveProperty('background-color')
    expect(cabeca['font-size']).toBe('var(--texto-pequeno-tamanho)')
    const corpo = Object.assign({}, ...decl(/^\.pd-tabela tbody td$/)) as Record<string, string>
    expect(corpo['font-size']).toBe('var(--texto-corpo-tamanho)')
    expect(corpo['line-height']).toBe('var(--texto-corpo-entrelinha)')
    // No celular o último campo de cada bloco é o item em destaque (fio de mel), só nessa tabela.
    const destaque = Object.assign({}, ...decl(/^\.pd-painel-papeis \.pd-tabela tbody tr > td:last-child$/)) as Record<string, string>
    expect(destaque['border-left']).toBe('3px solid var(--color-mel)')
  })

  it('o desenho da avó ocupa 64% da largura interna do painel no celular, sem altura máxima (sem recorte)', () => {
    const desenho = decl(/^\.pd-familia-desenho$/).map((d) => d.width)
    expect(desenho).toContain('64%')
    const img = decl(/^\.pd-familia-desenho \.cm-ilustracao$/).map((d) => d['max-height'])
    expect(img).toContain('none')
  })

  it('o registro "Fizemos" ocupa o cartão: duas colunas (valor com o rótulo em cima, e o detalhe), na largura da cena', () => {
    const cartao = Object.assign({}, ...decl(/^\.pd-cartao-legenda \.pd-cartao$/)) as Record<string, string>
    expect(cartao.display).toBe('grid')
    expect(cartao['grid-template-columns']).toBe('fit-content(55%) minmax(0, 1fr)')
    const largura = decl(/^\.pd-cartao-legenda\.pd-cartao-plano$/).map((d) => d.width)
    expect(largura).toContain('min(400px, 100%)')
  })
})
