import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// A estrutura das 9 páginas novas (MAT-36): seções, campos de cor, composições de aparelho,
// ilustrações, avisos, textos fixos e o índice. "Fora da composição" ignora tudo o que está dentro
// de um [data-aparelho] (vitrine inerte e escondida do leitor de tela).

const H2S: Record<string, string[]> = {
  '/como-funciona': ['Na primeira semana', 'De madrugada', 'Na troca de turno', 'Para começar', 'Veja as telas do protótipo'],
  '/cuidado-compartilhado': [
    'Cada pessoa com a própria conta',
    'Três papéis na família',
    'Quem fez cada registro',
    'Na passagem de turno',
    'Quando alguém para de cuidar',
  ],
  '/desenvolvimento': [
    'Tummy time na rotina',
    'Sem metas e sem comparação',
    'De onde vem o conteúdo',
    'Quando procurar um profissional',
  ],
  '/regras-da-comunidade': [
    'Antes de publicar',
    'As sete regras',
    'Denunciar, bloquear e silenciar',
    'Como a moderação trabalha',
    'Se você precisa de ajuda agora',
    'Contato para denúncias',
  ],
  '/privacidade': [
    'Quem responde pelos dados',
    'Que dados o site vai guardar',
    'O que fica de fora',
    'Para que os dados vão servir',
    'Quem vê os dados',
    'Os dados do bebê',
    'Onde os dados vão ficar',
    'Por quanto tempo',
    'Seus direitos',
    'Mudanças nesta política',
  ],
  '/termos': [
    'O que é o AppMaternidade',
    'Quem pode usar',
    'Sua conta',
    'Família, papéis e convites',
    'Comunidade',
    'Excluir a conta',
    'Mudanças nos termos',
    'Contato',
  ],
  '/exclusao-de-conta': ['Como pedir', 'O que vai ser apagado', 'O que pode ficar guardado', 'Prazo', 'Antes de excluir'],
  '/contato': ['Para que serve este canal', 'Em uma urgência'],
  '/sobre': ['Para quem é', 'O que ele faz', 'O que ele não faz', 'Quem faz'],
}

const NOVAS = Object.keys(H2S)
const RASCUNHOS = ['/privacidade', '/termos', '/exclusao-de-conta']
const NAO_NOVAS = ['/', '/rota-inexistente']
const ILUSTRACOES_DA_BASE = ['berco', 'colo', 'mamada', 'passeio', 'tapete']

async function abrir(caminho: string): Promise<HTMLElement> {
  const { container } = renderizarRota(caminho)
  await screen.findAllByRole('heading', { level: 1 })
  return container
}

const fora = (elemento: Element) => elemento.closest('[data-aparelho]') === null
const h2Fora = (raiz: ParentNode) => [...raiz.querySelectorAll('h2')].filter(fora)
const principal = (container: HTMLElement) => container.querySelector('main')!
const secoesDe = (container: HTMLElement) => [...principal(container).children] as HTMLElement[]
const palavras = (texto: string) => texto.split(/\s+/).filter((trecho) => /[\p{L}\p{N}]/u.test(trecho))

/** A seção cujo h2 (fora da composição) tem este texto. */
function secaoDe(container: HTMLElement, titulo: string): HTMLElement {
  const h2 = h2Fora(container).find((candidato) => candidato.textContent === titulo)
  if (!h2) throw new Error(`h2 não encontrado: ${titulo}`)
  return h2.closest('section')!
}

const textosDosParagrafos = (secao: Element) => [...secao.querySelectorAll('p')].filter(fora).map((p) => p.textContent)

describe('seções das 9 páginas novas', () => {
  it('o main só tem <section> como filhos; a primeira é a abertura e as outras têm um h2 cada, na ordem', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      const secoes = secoesDe(container)
      expect(secoes.length, caminho).toBe(H2S[caminho].length + 1)
      for (const secao of secoes) expect(secao.tagName, caminho).toBe('SECTION')

      const [abertura, ...demais] = secoes
      expect(abertura.querySelectorAll('h1'), caminho).toHaveLength(1)
      expect(h2Fora(abertura), caminho).toHaveLength(0)
      for (const secao of demais) {
        const h2 = h2Fora(secao)
        expect(h2, `${caminho}: ${secao.textContent?.slice(0, 40)}`).toHaveLength(1)
        // Nenhum título vem antes do h2 dentro da seção.
        const titulos = [...secao.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(fora)
        expect(titulos[0], caminho).toBe(h2[0])
      }
      expect(h2Fora(principal(container)).map((h2) => h2.textContent), caminho).toEqual(H2S[caminho])
    }
  })

  it('todo h2 fora da composição tem id secao-<slug> único e tabindex -1; o h1 tem tabindex -1', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      const ids = h2Fora(container).map((h2) => h2.id)
      expect(new Set(ids).size, caminho).toBe(ids.length)
      for (const h2 of h2Fora(container)) {
        expect(h2.id, `${caminho}: ${h2.textContent}`).toMatch(/^secao-[a-z0-9]+(-[a-z0-9]+)*$/)
        expect(h2.getAttribute('tabindex')).toBe('-1')
        expect(h2.className).toContain('focus:outline-none')
      }
      const titulo = container.querySelector('h1')!
      expect(titulo.getAttribute('tabindex'), caminho).toBe('-1')
      expect(titulo.className).toContain('focus:outline-none')
    }
    const regras = await abrir('/regras-da-comunidade')
    expect(secaoDe(regras, 'Se você precisa de ajuda agora').querySelector('h2')!.id).toBe('secao-ajuda-agora')
  })

  it('em Cuidado compartilhado, o h2 "Em andamento" existe só dentro do aparelho', async () => {
    const container = await abrir('/cuidado-compartilhado')

    const todos = [...container.querySelectorAll('h2')].filter((h2) => h2.textContent === 'Em andamento')
    expect(todos.length).toBeGreaterThan(0)
    for (const h2 of todos) expect(h2.closest('[data-aparelho]')).not.toBeNull()
  })

  it('as tabelas têm legenda, cabeçalhos de coluna e de linha, e as linhas pedidas', async () => {
    const cuidado = await abrir('/cuidado-compartilhado')
    const papeis = cuidado.querySelector('main table')!
    expect(papeis.querySelector('caption')!.textContent).toBe('Papéis na família')
    expect([...papeis.querySelectorAll('th[scope="col"]')].map((th) => th.textContent)).toEqual([
      'Papel',
      'Para quem é',
      'O que vai poder fazer',
    ])
    expect([...papeis.querySelectorAll('th[scope="row"]')].map((th) => th.textContent)).toEqual([
      'Responsável',
      'Cuidador',
      'Observador',
    ])

    const regras = await abrir('/regras-da-comunidade')
    const canais = regras.querySelector('main table')!
    expect(canais.querySelector('caption')!.textContent).toBe('Canais oficiais de ajuda')
    expect([...canais.querySelectorAll('th[scope="col"]')].map((th) => th.textContent)).toEqual(['Canal', 'Número', 'Quando usar'])
    expect([...canais.querySelectorAll('th[scope="row"]')].map((th) => th.textContent)).toEqual([
      'CVV',
      'SAMU',
      'Ligue 180',
      'Disque 100',
    ])
    expect([...canais.querySelectorAll('tbody tr')].map((linha) => linha.children[1].textContent)).toEqual([
      '188',
      '192',
      '180',
      '100',
    ])
  })

  it('as sete regras são uma lista ordenada de 7 itens e os motivos de denúncia são 8', async () => {
    const container = await abrir('/regras-da-comunidade')

    expect(secaoDe(container, 'As sete regras').querySelectorAll('ol > li')).toHaveLength(7)
    expect(secaoDe(container, 'Denunciar, bloquear e silenciar').querySelectorAll('ul > li')).toHaveLength(8)
  })
})

describe('os três rascunhos jurídicos', () => {
  it('o aviso de rascunho vem logo depois do h1, só com o TF-08, com contorno e sem campo de cor', async () => {
    for (const caminho of RASCUNHOS) {
      const container = await abrir(caminho)

      const aviso = container.querySelector('div[data-aviso="rascunho"]')!
      expect(aviso.textContent, caminho).toBe('Rascunho para avaliação acadêmica; não é documento jurídico final.')
      expect(aviso.hasAttribute('data-campo')).toBe(false)
      expect(aviso.closest('section')!.hasAttribute('data-campo')).toBe(false)
      expect(aviso.className).toMatch(/(^|\s)border(\s|$)/)
      expect(container.querySelector('h1')!.nextElementSibling, caminho).toBe(aviso)
      const primeiroH2 = h2Fora(container)[0]
      expect(aviso.compareDocumentPosition(primeiroH2) & Node.DOCUMENT_POSITION_FOLLOWING, caminho).not.toBe(0)
    }
  })

  it('as outras 8 páginas públicas não têm o aviso de rascunho', async () => {
    for (const caminho of [...NOVAS.filter((c) => !RASCUNHOS.includes(c)), ...NAO_NOVAS]) {
      const container = await abrir(caminho)
      expect(container.querySelectorAll('[data-aviso="rascunho"]'), caminho).toHaveLength(0)
    }
  })

  it('só papel, numa coluna de leitura de 44 rem: sem campo, aparelho nem ilustração', async () => {
    for (const caminho of RASCUNHOS) {
      const container = await abrir(caminho)

      expect(container.querySelectorAll('[data-campo], [data-aparelho], [data-ilustracao]'), caminho).toHaveLength(0)
      const principalDaPagina = principal(container)
      expect(principalDaPagina.hasAttribute('data-leitura'), caminho).toBe(true)
      expect(principalDaPagina.className).toContain('max-w-[44rem]')
    }
  })

  it('Privacidade e Termos trazem TF-10 e TF-09 depois do aviso, e o índice tem um link por h2, na ordem', async () => {
    for (const caminho of ['/privacidade', '/termos']) {
      const container = await abrir(caminho)

      const aviso = container.querySelector('div[data-aviso="rascunho"]')!
      const construcao = container.querySelector('[data-aviso="construcao"]')!
      const fictiticios = [...container.querySelectorAll('main p')].find(
        (p) => p.textContent === 'Nesta versão de avaliação, use só dados fictícios.',
      )!
      expect(aviso.compareDocumentPosition(construcao) & Node.DOCUMENT_POSITION_FOLLOWING, caminho).not.toBe(0)
      expect(construcao.compareDocumentPosition(fictiticios) & Node.DOCUMENT_POSITION_FOLLOWING, caminho).not.toBe(0)

      const indice = container.querySelector('nav[aria-label="Nesta página"]')!
      expect(fictiticios.compareDocumentPosition(indice) & Node.DOCUMENT_POSITION_FOLLOWING, caminho).not.toBe(0)
      const links = [...indice.querySelectorAll('a')]
      const titulos = h2Fora(container)
      expect(links.map((a) => a.textContent), caminho).toEqual(titulos.map((h2) => h2.textContent))
      links.forEach((a, i) => {
        expect(a.getAttribute('href'), caminho).toBe(`${caminho}#${titulos[i].id}`)
        expect(a.classList.contains('alvo-toque')).toBe(true)
      })
    }
  })

  it('a Exclusão não tem índice nem o TF-09', async () => {
    const container = await abrir('/exclusao-de-conta')

    expect(container.querySelector('nav[aria-label="Nesta página"]')).toBeNull()
    expect(container.textContent).not.toContain('use só dados fictícios')
  })
})

describe('aviso de construção', () => {
  it('as 9 páginas novas têm o TF-10, antes do primeiro h2; o Início e a 404 não', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      const avisos = container.querySelectorAll('p[data-aviso="construcao"]')
      expect(avisos, caminho).toHaveLength(1)
      expect(avisos[0].textContent).toBe('Em construção: algumas funções descritas aqui ainda não estão no ar.')
      expect(avisos[0].compareDocumentPosition(h2Fora(container)[0]) & Node.DOCUMENT_POSITION_FOLLOWING, caminho).not.toBe(0)
    }
    for (const caminho of NAO_NOVAS) {
      const container = await abrir(caminho)
      expect(container.querySelectorAll('[data-aviso="construcao"]'), caminho).toHaveLength(0)
    }
  })

  it('o aviso de demonstração da base não entra nas páginas novas', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      expect(container.querySelectorAll('[data-aviso="demonstracao"]'), caminho).toHaveLength(0)
    }
  })
})

describe('textos fixos', () => {
  const TF01 = 'Canal de contato a definir'
  const TF02 = 'Responsável pelo AppMaternidade: a definir.'

  it('TF-01 e TF-03 aparecem com o marcador, nos lugares pedidos', async () => {
    const contato = await abrir('/contato')
    const pendencia = contato.querySelectorAll('main span[data-pendencia="contato"]')
    expect(pendencia).toHaveLength(1)
    expect(pendencia[0].textContent).toBe(TF01)
    expect(contato.querySelector('h1')!.nextElementSibling).toBe(pendencia[0].parentElement)
    expect(pendencia[0].parentElement!.tagName).toBe('P')

    const lugares: Array<[string, string]> = [
      ['/regras-da-comunidade', 'Contato para denúncias'],
      ['/privacidade', 'Quem responde pelos dados'],
      ['/termos', 'Contato'],
    ]
    for (const [caminho, h2] of lugares) {
      const container = await abrir(caminho)
      const marcadas = secaoDe(container, h2).querySelectorAll('span[data-pendencia="contato"]')
      expect(marcadas, `${caminho}: ${h2}`).toHaveLength(1)
      expect(marcadas[0].textContent).toBe(TF01)
    }

    const privacidade = await abrir('/privacidade')
    const encarregado = secaoDe(privacidade, 'Quem responde pelos dados').querySelectorAll('span[data-pendencia="encarregado"]')
    expect(encarregado).toHaveLength(1)
    expect(encarregado[0].textContent).toBe('Encarregado pelo tratamento de dados: a definir')
  })

  it('TF-02, TF-04, TF-05, TF-06, TF-07, TF-11 e TF-15 estão nas seções pedidas', async () => {
    const casos: Array<[string, string, string]> = [
      ['/privacidade', 'Quem responde pelos dados', TF02],
      ['/termos', 'Contato', TF02],
      ['/exclusao-de-conta', 'Como pedir', TF02],
      ['/sobre', 'Quem faz', TF02],
      ['/termos', 'Quem pode usar', 'Idade mínima para usar o AppMaternidade: a definir.'],
      ['/exclusao-de-conta', 'Prazo', 'O prazo da exclusão ainda será definido e publicado nesta página.'],
      [
        '/exclusao-de-conta',
        'Como pedir',
        'O pedido de exclusão ainda não pode ser feito por este site. Ele vai ficar na tela Família e conta, para quem entrou na conta.',
      ],
      ['/como-funciona', 'Para começar', 'Criar conta e entrar ainda não estão disponíveis neste site.'],
      [
        '/desenvolvimento',
        'Quando procurar um profissional',
        'O AppMaternidade não faz diagnóstico e não substitui a orientação de um profissional de saúde.',
      ],
      [
        '/termos',
        'O que é o AppMaternidade',
        'O AppMaternidade não faz diagnóstico e não substitui a orientação de um profissional de saúde.',
      ],
      [
        '/sobre',
        'O que ele não faz',
        'O AppMaternidade não faz diagnóstico e não substitui a orientação de um profissional de saúde.',
      ],
      [
        '/privacidade',
        'Onde os dados vão ficar',
        'Nesta fase de avaliação, a demonstração roda num projeto Supabase nos Estados Unidos (região us-east-1), só com dados fictícios.',
      ],
    ]
    for (const [caminho, h2, texto] of casos) {
      const container = await abrir(caminho)
      expect(textosDosParagrafos(secaoDe(container, h2)), `${caminho}: ${h2}`).toContain(texto)
    }
  })

  it('TF-12 vem logo abaixo do h1 do Como funciona, e TF-09 e TF-14 estão onde se pede', async () => {
    const como = await abrir('/como-funciona')
    expect(como.querySelector('h1')!.nextElementSibling!.textContent).toBe(
      'As telas mostradas aqui são exemplos com uma família fictícia.',
    )

    const desenvolvimento = await abrir('/desenvolvimento')
    const selo = secaoDe(desenvolvimento, 'De onde vem o conteúdo').querySelector('p .etiqueta')!
    expect(selo.textContent).toBe('Rascunho em revisão — não substitui orientação profissional')
    expect(selo.closest('p')).not.toBeNull()
  })

  it('a abertura de Como funciona traz TF-12, TF-10 e a apresentação, nesta ordem', async () => {
    const container = await abrir('/como-funciona')

    const abertura = secoesDe(container)[0]
    const ordem = [...abertura.querySelectorAll('p')].map((p) => p.textContent!.slice(0, 12))
    expect(ordem).toEqual(['As telas mos', 'Em construçã', 'São três mom'])
  })

  it('os links dentro do texto têm o rótulo e o destino pedidos', async () => {
    const casos: Array<[string, string, string, string]> = [
      ['/como-funciona', 'Veja as telas do protótipo', 'Ver o protótipo do Hoje', '/app/hoje'],
      ['/privacidade', 'Seus direitos', 'Exclusão de conta', '/exclusao-de-conta'],
      ['/termos', 'Excluir a conta', 'Exclusão de conta', '/exclusao-de-conta'],
      ['/termos', 'Comunidade', 'Regras da comunidade', '/regras-da-comunidade'],
      ['/contato', 'Em uma urgência', 'Regras da comunidade', '/regras-da-comunidade#secao-ajuda-agora'],
    ]
    for (const [caminho, h2, rotulo, destino] of casos) {
      const container = await abrir(caminho)
      const link = [...secaoDe(container, h2).querySelectorAll('a')].find((a) => a.textContent === rotulo)
      expect(link, `${caminho}: ${h2}`).toBeDefined()
      expect(link!.getAttribute('href')).toBe(destino)
    }
    // O link do Como funciona fica fora de parágrafo e tem o alvo de toque.
    const como = await abrir('/como-funciona')
    const botao = [...como.querySelectorAll('main a')].find((a) => a.textContent === 'Ver o protótipo do Hoje')!
    expect(botao.closest('p')).toBeNull()
    expect(botao.classList.contains('alvo-toque')).toBe(true)
  })

  it('todo link do main fora de parágrafo tem a classe alvo-toque', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      for (const link of principal(container).querySelectorAll('a')) {
        if (!fora(link) || link.closest('p') !== null) continue
        expect(link.classList.contains('alvo-toque'), `${caminho}: ${link.outerHTML}`).toBe(true)
      }
    }
  })
})

describe('composição: campos de cor, aparelhos e ilustrações', () => {
  it('cada campo, filho do main, tem token válido; nunca mais de 2 campos seguidos (contando a abertura)', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      let seguidos = 0
      for (const secao of secoesDe(container)) {
        const campo = secao.getAttribute('data-campo')
        if (campo !== null) expect(['accent', 'field-1', 'field-2'], caminho).toContain(campo)
        seguidos = campo !== null ? seguidos + 1 : 0
        expect(seguidos, `${caminho}: campos seguidos`).toBeLessThanOrEqual(2)
      }
    }
  })

  it('em cada campo, até 60 palavras fora da composição e dos títulos, e nenhuma lista nem tabela', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      for (const campo of principal(container).querySelectorAll(':scope > section[data-campo]')) {
        const copia = campo.cloneNode(true) as HTMLElement
        for (const parte of copia.querySelectorAll('[data-aparelho], [data-ilustracao], h1, h2, h3')) parte.remove()
        expect(copia.querySelectorAll('ul, ol, table'), caminho).toHaveLength(0)
        expect(palavras(copia.textContent ?? '').length, `${caminho}: ${copia.textContent}`).toBeLessThanOrEqual(60)
      }
    }
  })

  it('aparelhos inertes e escondidos, sem navegação, sem ids e sem efeito no <html>; ilustrações decorativas', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      for (const aparelho of container.querySelectorAll('[data-aparelho]')) {
        expect(['celular', 'notebook']).toContain(aparelho.getAttribute('data-aparelho'))
        expect(aparelho.hasAttribute('inert'), caminho).toBe(true)
        expect(aparelho.getAttribute('aria-hidden'), caminho).toBe('true')
        expect(aparelho.querySelector('nav'), caminho).toBeNull()
        expect(aparelho.querySelector('[id]'), caminho).toBeNull()
        for (const controle of aparelho.querySelectorAll<HTMLElement>('a, button')) {
          expect(controle.tabIndex < 0 || (controle as HTMLButtonElement).disabled, caminho).toBe(true)
        }
      }
      for (const ilustracao of container.querySelectorAll('[data-ilustracao]')) {
        expect(ilustracao.tagName.toLowerCase()).toBe('svg')
        expect(ilustracao.getAttribute('aria-hidden'), caminho).toBe('true')
      }
      expect(container.querySelectorAll('svg:not([data-ilustracao])'), caminho).toHaveLength(0)
      expect(document.documentElement.hasAttribute('data-tema'), caminho).toBe(false)
    }
  })

  it('no máximo uma ilustração nova (troca) além das 5 da base; ao todo 6 distintas no produto', async () => {
    const nomes = new Set<string>()
    for (const caminho of ['/', '/app/hoje', '/app/sessao', ...NOVAS]) {
      const container = await abrir(caminho)
      for (const ilustracao of container.querySelectorAll('[data-ilustracao]')) nomes.add(ilustracao.getAttribute('data-ilustracao')!)
    }
    expect([...nomes].filter((nome) => !ILUSTRACOES_DA_BASE.includes(nome))).toEqual(['troca'])
    expect(nomes.size).toBeLessThanOrEqual(6)
  })

  it('cada composição tem um parágrafo visível no mesmo campo, abaixo do título', async () => {
    for (const caminho of ['/como-funciona', '/cuidado-compartilhado']) {
      const container = await abrir(caminho)

      for (const aparelho of container.querySelectorAll('[data-aparelho]')) {
        const campo = aparelho.closest('section[data-campo]')!
        expect(campo, caminho).not.toBeNull()
        const titulo = h2Fora(campo)[0]
        const paragrafo = [...campo.querySelectorAll('p')].find(fora)!
        expect(titulo.compareDocumentPosition(aparelho) & Node.DOCUMENT_POSITION_FOLLOWING, caminho).not.toBe(0)
        expect(aparelho.compareDocumentPosition(paragrafo) & Node.DOCUMENT_POSITION_FOLLOWING, caminho).not.toBe(0)
      }
    }
  })

  it('contagens mínimas por página', async () => {
    const contar = async (caminho: string) => {
      const container = await abrir(caminho)
      return {
        container,
        campos: principal(container).querySelectorAll(':scope > section[data-campo]').length,
        aparelhos: [...container.querySelectorAll('[data-aparelho]')],
        ilustracoes: container.querySelectorAll('[data-ilustracao]').length,
      }
    }

    const como = await contar('/como-funciona')
    expect(como.campos).toBeGreaterThanOrEqual(2)
    expect(como.aparelhos.length).toBeGreaterThanOrEqual(2)
    expect(como.aparelhos.some((a) => a.getAttribute('data-aparelho') === 'celular')).toBe(true)
    expect(como.ilustracoes).toBeGreaterThanOrEqual(1)
    // A madrugada usa o invólucro local e o celular da troca de turno mostra o cartão do Hoje.
    expect(secaoDe(como.container, 'De madrugada').querySelector('[data-tema-local="madrugada"] [role="timer"]')).not.toBeNull()
    expect(secaoDe(como.container, 'Na troca de turno').querySelector('[data-aparelho="celular"] .campo-andamento')).not.toBeNull()

    const cuidado = await contar('/cuidado-compartilhado')
    expect(cuidado.campos).toBeGreaterThanOrEqual(2)
    expect(cuidado.ilustracoes).toBeGreaterThanOrEqual(1)
    expect(secaoDe(cuidado.container, 'Na passagem de turno').querySelector('[data-aparelho] .campo-andamento')).not.toBeNull()
    expect(secaoDe(cuidado.container, 'Na passagem de turno').querySelector('[data-aparelho="notebook"]')).not.toBeNull()
    expect(secaoDe(cuidado.container, 'Cada pessoa com a própria conta').querySelector('[data-ilustracao="troca"]')).not.toBeNull()

    const desenvolvimento = await contar('/desenvolvimento')
    expect(desenvolvimento.campos).toBeGreaterThanOrEqual(1)
    expect(desenvolvimento.ilustracoes).toBeGreaterThanOrEqual(1)
    expect(desenvolvimento.aparelhos).toHaveLength(0)

    const sobre = await contar('/sobre')
    expect(sobre.campos).toBeGreaterThanOrEqual(1)
    expect(sobre.ilustracoes).toBeGreaterThanOrEqual(1)

    for (const caminho of ['/regras-da-comunidade', '/contato']) {
      expect((await contar(caminho)).campos, caminho).toBeGreaterThanOrEqual(1)
    }
  })

  it('o bloco de linhas do Sobre usa os quatro pilares da base como h3, na ordem', async () => {
    const container = await abrir('/sobre')

    const rotulos = [...secaoDe(container, 'O que ele faz').querySelectorAll('h3')].map((h3) => h3.textContent)
    expect(rotulos).toEqual(['Rotina', 'Desenvolvimento', 'Cuidado compartilhado', 'Comunidade'])
  })
})
