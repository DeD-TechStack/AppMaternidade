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
      for (const cartao of container.querySelectorAll('main .cm-flutuante')) {
        expect(cartao.textContent).not.toMatch(/protótipo|dados de exemplo/i)
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

describe('Como funciona', () => {
  it('a primeira dobra tem a cena de estúdio com texto alternativo e tamanho 1×, e a última mamada num cartão de HTML', () => {
    const { container } = renderizarRota('/como-funciona')
    const cena = container.querySelector<HTMLImageElement>('main img[data-cena]')!
    expect(cena.getAttribute('alt')).toBe(COMO_FUNCIONA_DESTAQUE.cena.alt)
    expect(cena.getAttribute('src')).toBe('/cenas/publicas/como-funciona@1x.webp')
    expect(cena.getAttribute('width')).toBe('512')
    expect(cena.getAttribute('height')).toBe('768')
    const cartao = cena.closest('[data-painel]')!.querySelector('.cm-flutuante')!
    expect(cartao.textContent).toContain(COMO_FUNCIONA_DESTAQUE.ultimaMamada.hora)
    expect(cartao.textContent).toContain('Juliana')
  })

  it('os três passos vêm em ordem, numa lista ordenada, cada um com a sua tela de exemplo', () => {
    const { container } = renderizarRota('/como-funciona')
    const itens = [...container.querySelectorAll('ol[data-passos] > li')]
    expect(itens.map((li) => within(li as HTMLElement).getByRole('heading', { level: 3 }).textContent)).toEqual([
      'Na primeira semana',
      'De madrugada',
      'Na troca de turno',
    ])
    for (const li of itens) expect(li.querySelector('.cm-flutuante'), li.id).not.toBeNull()
    expect(itens[2].textContent).toContain('Bruno')
    expect(itens[2].textContent).toContain(COMO_FUNCIONA_DESTAQUE.desdeQueSaiu.andamento.rotulo)
  })

  it('o aviso honesto aparece uma vez, fora das imagens e dos cartões', () => {
    const { container } = renderizarRota('/como-funciona')
    const avisos = screen.getAllByText(COMO_FUNCIONA_DESTAQUE.aviso)
    expect(avisos).toHaveLength(1)
    expect(avisos[0].closest('.cm-flutuante, picture, [data-painel]')).toBeNull()
    expect(container.querySelectorAll('main [data-aviso]')).toHaveLength(1)
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
    expect(screen.getAllByText(CUIDADO_DESTAQUE.aviso)).toHaveLength(1)
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

  it('o aviso de saúde aparece perto do topo e de novo no fim, com o texto exato, e o 192 no fim', () => {
    const { container } = renderizarRota('/desenvolvimento')
    const avisos = screen.getAllByText(AVISO_SAUDE)
    expect(avisos).toHaveLength(2)
    const abertura = container.querySelector('main .pd-abertura')!
    expect(abertura.contains(avisos[0])).toBe(true)
    expect(avisos[1].closest('[data-painel="cacau"]')).not.toBeNull()
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

  it('o desenho do tummy time fica sobre o mel, e os links da abertura levam às seções', () => {
    const { container } = renderizarRota('/desenvolvimento')
    const desenho = container.querySelector('img[data-ilustracao="tummy-time"]')!
    expect(desenho.closest('[data-painel]')!.getAttribute('data-painel')).toBe('mel')
    expect(screen.getByRole('link', { name: DESENVOLVIMENTO_DESTAQUE.primario.rotulo }).getAttribute('href')).toBe('#ideias')
    expect(screen.getByRole('link', { name: DESENVOLVIMENTO_DESTAQUE.secundario.rotulo }).getAttribute('href')).toBe(
      '#tummy-time',
    )
    expect(document.getElementById('ideias')).not.toBeNull()
    expect(document.getElementById('tummy-time')).not.toBeNull()
  })
})
