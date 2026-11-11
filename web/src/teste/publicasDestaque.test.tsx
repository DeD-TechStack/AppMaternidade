import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, screen, within } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import { FASES, MARCOS, QUANTO_TEMPO, TUMMY_TIME } from '../conteudo/desenvolvimento/itens.ts'
import { CONSULTADO_EM } from '../conteudo/desenvolvimento/fontes.ts'
import { AVISO_SAUDE, DESENVOLVIMENTO_DESTAQUE } from '../conteudo/desenvolvimento/pagina.ts'
import { COMO_FUNCIONA_DESTAQUE, CUIDADO_DESTAQUE } from '../conteudo/publicas-destaque.ts'
import { renderizarRota } from './renderizarRota.tsx'

// Como funciona, Cuidado compartilhado e Desenvolvimento no "Campo de mel": títulos, passos, avisos,
// fontes, cenas e links, no site de verdade (roteador em memória, dentro da casca).

const PAGINAS = [
  ['/como-funciona', COMO_FUNCIONA_DESTAQUE.titulo],
  ['/cuidado-compartilhado', CUIDADO_DESTAQUE.titulo],
  ['/desenvolvimento', DESENVOLVIMENTO_DESTAQUE.titulo],
] as const

/** O texto que o leitor de tela lê de um título animado (o span sr-only com as duas linhas). */
const nomeDoTitulo = (titulo: HTMLElement) => titulo.querySelector('.sr-only')?.textContent ?? titulo.textContent

async function violacoes(container: HTMLElement): Promise<string[]> {
  const resultado = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`)
}

describe('as três páginas públicas em destaque', () => {
  for (const [caminho, titulo] of PAGINAS) {
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

    it(`${caminho}: no máximo um cartão flutuante, nunca sobre uma cena (aparelho e pedestal)`, () => {
      const { container } = renderizarRota(caminho)
      expect(container.querySelectorAll('main .cm-flutuante').length).toBeLessThanOrEqual(1)
      for (const cena of container.querySelectorAll('main img[data-cena]')) {
        expect(cena.closest('[data-painel]')!.querySelector('.cm-flutuante')).toBeNull()
      }
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

  for (const [caminho] of PAGINAS) {
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
    semCorteNemTrava(/\.pd-linha(-[\w-]+)?$/)
  })
})

describe('Como funciona', () => {
  it('a primeira dobra tem a cena de estúdio com texto alternativo e tamanho 1×, sem cartão por cima', () => {
    const { container } = renderizarRota('/como-funciona')
    const cena = container.querySelector<HTMLImageElement>('main img[data-cena]')!
    expect(cena.getAttribute('alt')).toBe(COMO_FUNCIONA_DESTAQUE.cena.alt)
    expect(cena.getAttribute('src')).toBe('/cenas/publicas/como-funciona@1x.webp')
    expect(cena.getAttribute('width')).toBe('512')
    expect(cena.getAttribute('height')).toBe('768')
    expect(cena.closest('[data-painel]')!.querySelector('.cm-flutuante, [data-cartao-plano]')).toBeNull()
  })

  it('os três passos vêm em ordem, numa lista ordenada, cada um com a sua tela de exemplo; só a madrugada flutua', () => {
    const { container } = renderizarRota('/como-funciona')
    const itens = [...container.querySelectorAll('ol[data-passos] > li')]
    expect(itens.map((li) => within(li as HTMLElement).getByRole('heading', { level: 3 }).textContent)).toEqual([
      'Na primeira semana',
      'De madrugada',
      'Na troca de turno',
    ])
    for (const li of itens) expect(li.querySelector('.cm-flutuante, [data-cartao-plano]'), li.id).not.toBeNull()
    expect(itens.map((li) => li.querySelector('.cm-flutuante') !== null)).toEqual([false, true, false])
    expect(itens[2].textContent).toContain('Bruno')
    expect(itens[2].textContent).toContain(COMO_FUNCIONA_DESTAQUE.desdeQueSaiu.andamento.rotulo)
  })

  it('os dois primários levam ao protótipo e o secundário leva aos três momentos', async () => {
    const { roteador } = renderizarRota('/como-funciona')
    const primarios = screen.getAllByRole('link', { name: COMO_FUNCIONA_DESTAQUE.primario.rotulo })
    expect(primarios).toHaveLength(2)
    for (const link of primarios) expect(link.getAttribute('href')).toBe('/app/hoje')
    expect(screen.getByRole('link', { name: COMO_FUNCIONA_DESTAQUE.secundario.rotulo }).getAttribute('href')).toBe(
      '#tres-momentos',
    )
    expect(document.getElementById('tres-momentos')).not.toBeNull()

    fireEvent.click(primarios[0])
    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    expect(roteador.state.location.pathname).toBe('/app/hoje')
  })
})

describe('Cuidado compartilhado', () => {
  it('o painel de mel tem a tela Família em HTML e a avó do carrinho', () => {
    renderizarRota('/cuidado-compartilhado')
    const figura = screen.getByRole('figure', { name: CUIDADO_DESTAQUE.familia.descricao })
    for (const pessoa of CUIDADO_DESTAQUE.familia.pessoas) {
      expect(figura.textContent).toContain(pessoa.nome)
      expect(figura.textContent).toContain(pessoa.papel)
    }
    expect(within(figura).getByRole('img').getAttribute('data-ilustracao')).toBe('avo-carrinho')
    expect(within(figura).getByRole('img').getAttribute('alt')).not.toBe('')
  })

  it('os três blocos curtos vêm na ordem, e a tabela dos papéis tem as três linhas', () => {
    const { container } = renderizarRota('/cuidado-compartilhado')
    const blocos = [...container.querySelectorAll('[data-blocos] h2')].map((h) => h.textContent)
    expect(blocos).toEqual(['Convite com papel', 'Acesso com prazo', 'Revogue quando quiser'])
    const tabela = screen.getByRole('table', { name: CUIDADO_DESTAQUE.papeis.tabela.legenda })
    const linhas = within(tabela).getAllByRole('rowheader').map((th) => th.textContent)
    expect(linhas).toEqual(['Responsável', 'Cuidador', 'Observador'])
  })

  it('tem as seções de registro, passagem de turno e de quando alguém para de cuidar', () => {
    renderizarRota('/cuidado-compartilhado')
    expect(screen.getByRole('heading', { level: 2, name: 'Quem fez cada registro' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Na passagem de turno' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Quando alguém para de cuidar.' })).toBeTruthy()
  })

  it('a abertura tem o primário para o protótipo, e o fim da página tem a mesma ação', () => {
    const { container } = renderizarRota('/cuidado-compartilhado')
    const abertura = container.querySelector('main .pd-abertura')!
    expect(within(abertura as HTMLElement).getByRole('link', { name: CUIDADO_DESTAQUE.primario.rotulo }).getAttribute('href')).toBe(
      COMO_FUNCIONA_DESTAQUE.fechamento.acao.destino,
    )
    const parar = screen.getByRole('region', { name: 'Quando alguém para de cuidar.' })
    expect(within(parar).getByRole('link', { name: CUIDADO_DESTAQUE.primario.rotulo }).getAttribute('href')).toBe(
      COMO_FUNCIONA_DESTAQUE.fechamento.acao.destino,
    )
  })

  it('cada bloco curto traz um exemplo com uma pessoa da família, e o texto dos papéis não repete os blocos', () => {
    const { container } = renderizarRota('/cuidado-compartilhado')
    const exemplos = [...container.querySelectorAll('[data-blocos] [data-exemplo]')].map((p) => p.textContent)
    expect(exemplos).toHaveLength(3)
    CUIDADO_DESTAQUE.blocos.forEach((bloco, i) => expect(exemplos[i]).toContain(bloco.exemplo.quem))
    for (const bloco of CUIDADO_DESTAQUE.blocos) expect(CUIDADO_DESTAQUE.papeis.texto).not.toContain(bloco.texto)
    expect(CUIDADO_DESTAQUE.papeis.texto).not.toMatch(/cuidador até domingo/)
  })

  it('o painel de areia mostra quem fez cada registro da tarde, e a que horas', () => {
    const { container } = renderizarRota('/cuidado-compartilhado')
    const cartao = container.querySelector('.pd-registro [data-cartao-plano]')!
    for (const item of CUIDADO_DESTAQUE.tarde.itens) {
      expect(cartao.textContent).toContain(item.quem)
      expect(cartao.textContent).toContain(item.hora)
    }
  })
})

describe('Desenvolvimento', () => {
  it('a cena de cacau tem texto alternativo e o tamanho 1×, num painel de cacau', () => {
    const { container } = renderizarRota('/desenvolvimento')
    const cena = container.querySelector<HTMLImageElement>('main img[data-cena]')!
    expect(cena.getAttribute('alt')).toBe(DESENVOLVIMENTO_DESTAQUE.cena.alt)
    expect(cena.getAttribute('src')).toBe('/cenas/publicas/desenvolvimento@1x.webp')
    expect(cena.getAttribute('width')).toBe('768')
    expect(cena.getAttribute('height')).toBe('512')
    expect(cena.closest('[data-painel]')!.getAttribute('data-painel')).toBe('cacau')
    // Nada de traço preto sobre o cacau.
    for (const painel of container.querySelectorAll('[data-painel="cacau"]')) {
      expect(painel.querySelector('[data-ilustracao]')).toBeNull()
    }
  })

  it('o aviso de saúde aparece uma vez, perto do topo, com o texto exato, e o 192 no fim', () => {
    const { container } = renderizarRota('/desenvolvimento')
    const avisos = screen.getAllByText(AVISO_SAUDE)
    expect(avisos).toHaveLength(1)
    expect(container.querySelectorAll('[data-aviso-saude]')).toHaveLength(1)
    const abertura = container.querySelector('main .pd-abertura')!
    expect(abertura.contains(avisos[0])).toBe(true)
    expect(avisos[0].closest('[data-painel]')).toBeNull()
    expect(container.querySelector('main [data-painel="cacau"] [data-cartao-plano], main [data-painel="cacau"] .cm-flutuante')).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Em urgência de saúde, ligue 192.' })).toBeTruthy()
    expect(screen.getByText(DESENVOLVIMENTO_DESTAQUE.urgencia.texto)).toBeTruthy()
    // Nenhuma palavra em caixa alta de 4 letras ou mais (a porta CAIXA do medidor só aceita RN, SBP, LGPD e OMS).
    const caminhante = document.createTreeWalker(container.querySelector('main')!, NodeFilter.SHOW_TEXT)
    const palavras: string[] = []
    for (let no = caminhante.nextNode(); no; no = caminhante.nextNode()) {
      palavras.push(...(no.textContent!.match(/\p{Lu}{4,}/gu) ?? []))
    }
    expect(palavras.filter((p) => !['LGPD'].includes(p))).toEqual([])
  })

  it('cada fase mostra as atividades, as fontes e a data da consulta', () => {
    const { container } = renderizarRota('/desenvolvimento')
    const fases = [...container.querySelectorAll<HTMLElement>('[data-fase]')]
    expect(fases.map((f) => f.getAttribute('data-fase'))).toEqual(FASES.map((f) => f.id))
    for (const [i, painel] of fases.entries()) {
      expect(painel.querySelectorAll('li').length, FASES[i].id).toBeGreaterThanOrEqual(FASES[i].itens.length)
      const fontes = painel.querySelector('[data-fontes]')!
      expect(fontes.querySelectorAll('a[href^="https://"]').length, FASES[i].id).toBe(FASES[i].fontes.length)
      expect(fontes.querySelector('[data-consulta]')!.textContent).toBe(`Fontes consultadas em ${CONSULTADO_EM}`)
    }
    expect(CONSULTADO_EM).toBe('05/11/2026')
  })

  it('as abas trocam a fase com o clique e com as setas, levando o foco junto', () => {
    renderizarRota('/desenvolvimento')
    const abas = screen.getAllByRole('tab')
    expect(abas.map((a) => a.textContent)).toEqual(FASES.map((f) => f.faixa))
    expect(abas[0].getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').getAttribute('data-fase')).toBe(FASES[0].id)

    fireEvent.click(abas[2])
    expect(abas[2].getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').getAttribute('data-fase')).toBe(FASES[2].id)

    fireEvent.keyDown(abas[2], { key: 'ArrowRight' })
    expect(abas[3].getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(abas[3])
    fireEvent.keyDown(abas[3], { key: 'End' })
    expect(screen.getByRole('tabpanel').getAttribute('data-fase')).toBe(FASES[5].id)
    fireEvent.keyDown(abas[5], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(abas[0])
  })

  it('o tummy time e os marcos mostram a faixa, as fontes e a data da consulta', () => {
    const { container } = renderizarRota('/desenvolvimento')
    for (const item of [TUMMY_TIME, MARCOS]) {
      const secao = container.querySelector<HTMLElement>(`[data-item="${item.id}"]`)!
      expect(secao.textContent).toContain(item.faixa)
      const fontes = secao.querySelector('[data-fontes]')!
      expect(fontes.querySelectorAll('a[href^="https://"]').length, item.id).toBe(item.fontes.length)
      expect(fontes.querySelector('[data-consulta]')!.textContent).toBe(`Fontes consultadas em ${item.consultadoEm}`)
    }
  })

  it('a tabela das fontes tem as 5 linhas, sem a AAP, e o lema da Pathways virou um traço', () => {
    renderizarRota('/desenvolvimento')
    const tabela = screen.getByRole('table', { name: QUANTO_TEMPO.titulo })
    const linhas = within(tabela).getAllByRole('rowheader').map((th) => th.textContent)
    expect(linhas).toHaveLength(5)
    expect(linhas.join(' ')).not.toMatch(/AAP/)
    const pathways = within(tabela).getByRole('rowheader', { name: 'Pathways.org' }).closest('tr')!
    expect(pathways.lastElementChild!.textContent).toBe('—')
    expect(screen.getByText(QUANTO_TEMPO.semMeta)).toBeTruthy()
  })

  it('o desenho da seção do tummy time (a babá no chão) fica sobre o mel, e os links da abertura levam às seções', () => {
    const { container } = renderizarRota('/desenvolvimento')
    const desenho = container.querySelector('#tummy-time img[data-ilustracao="baba-tapete"]')!
    expect(desenho.closest('[data-painel]')!.getAttribute('data-painel')).toBe('mel')
    expect(desenho.closest('.pd-chao')).not.toBeNull()
    expect(screen.getByRole('link', { name: DESENVOLVIMENTO_DESTAQUE.primario.rotulo }).getAttribute('href')).toBe('#ideias')
    expect(screen.getByRole('link', { name: DESENVOLVIMENTO_DESTAQUE.secundario.rotulo }).getAttribute('href')).toBe(
      '#tummy-time',
    )
    expect(document.getElementById('ideias')).not.toBeNull()
    expect(document.getElementById('tummy-time')).not.toBeNull()
  })
})
