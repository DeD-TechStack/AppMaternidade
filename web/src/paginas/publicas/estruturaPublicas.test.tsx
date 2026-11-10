import { describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { PILARES } from '../../conteudo/textos.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// A estrutura das 9 páginas novas (MAT-36): o main (abertura e blocos), os `h2` exatos de cada uma, as
// mídias com ilustração, a lateral da abertura, as tabelas e a ausência do que saiu da base.

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
  '/contato': ['Fale conosco', 'Em uma urgência', 'Para que serve este canal'],
  '/sobre': ['Para quem é', 'O que ele faz', 'O que ele não faz', 'Quem faz'],
}

// As etiquetas da lateral da abertura (volta visual 1): só estas 3 páginas, antes do aviso de construção.
const ETIQUETAS: Record<string, readonly string[]> = {
  '/cuidado-compartilhado': ['Responsável', 'Cuidador', 'Observador'],
  '/desenvolvimento': ['Tummy time', 'Sem metas', 'Sem comparação'],
  '/sobre': PILARES,
}

const NOVAS = Object.keys(H2S)
const G6 = ['/como-funciona', '/cuidado-compartilhado', '/desenvolvimento', '/sobre']

/** As peças de mídia esperadas em cada página: a cena (a ilustração), o fundo e o formato, na ordem. */
const MIDIAS: Record<string, Array<[string, string, string]>> = {
  '/como-funciona': [
    ['mamada', 'lavanda', 'larga'],
    ['berco', 'barro', 'par'],
    ['colo', 'lavanda', 'par'],
  ],
  '/cuidado-compartilhado': [
    ['mamada', 'lavanda', 'larga'],
    ['passeio', 'barro', 'par'],
    ['colo', 'lavanda', 'par'],
  ],
  '/desenvolvimento': [
    ['tapete', 'lavanda', 'larga'],
    ['colo', 'lavanda', 'par'],
    ['berco', 'barro', 'par'],
  ],
  '/regras-da-comunidade': [['passeio', 'barro', 'larga']],
  // Textos de papel e Contato: sem mídia nem ilustração (volta visual 1, D3 e D6).
  '/privacidade': [],
  '/termos': [],
  '/exclusao-de-conta': [],
  '/contato': [],
  '/sobre': [
    ['passeio', 'barro', 'par'],
    ['berco', 'lavanda', 'par'],
    ['tapete', 'lavanda', 'larga'],
  ],
}

/** Abre a página, depois de desmontar a anterior (o RolagemEFoco procura o primeiro `main h1` do documento). */
async function abrir(caminho: string): Promise<HTMLElement> {
  cleanup()
  const { container } = renderizarRota(caminho)
  await screen.findAllByRole('heading', { level: 1 })
  return container
}

const principal = (container: HTMLElement) => container.querySelector('main')!
const h2Fora = (raiz: ParentNode) => [...raiz.querySelectorAll('h2')].filter((h2) => h2.closest('[data-midia]') === null)
const filhosDoMain = (container: HTMLElement) => [...principal(container).children] as HTMLElement[]

describe('o main das 9 páginas novas', () => {
  it('o primeiro filho é a abertura (a única section com h1, sem h2) e os outros são blocos ou seções com um h2', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      const [abertura, ...demais] = filhosDoMain(container)
      expect(abertura.tagName, caminho).toBe('SECTION')
      expect(abertura.querySelectorAll('h1'), caminho).toHaveLength(1)
      expect(h2Fora(abertura), caminho).toHaveLength(0)
      expect(container.querySelectorAll('h1'), caminho).toHaveLength(1)

      for (const filho of demais) {
        const rotulo = `${caminho}: ${filho.tagName.toLowerCase()} ${filho.textContent?.slice(0, 30)}`
        expect(filho.querySelectorAll('h1'), rotulo).toHaveLength(0)
        if (filho.tagName === 'SECTION') {
          expect(h2Fora(filho), rotulo).toHaveLength(1)
          // Nenhum título vem antes do h2 da seção.
          const titulos = [...filho.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter((t) => t.closest('[data-midia]') === null)
          expect(titulos[0], rotulo).toBe(h2Fora(filho)[0])
        } else {
          expect(filho.tagName, rotulo).toBe('DIV')
          expect(filho.hasAttribute('data-bloco'), rotulo).toBe(true)
          expect(h2Fora(filho), rotulo).toHaveLength(0)
        }
      }
    }
  }, 30000)

  it('todo filho do main é uma área útil (começa em x da margem ou de c2, medido em G3)', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      for (const filho of filhosDoMain(container)) expect(filho.classList.contains('sb-area'), caminho).toBe(true)
    }
  }, 30000)

  it('os h2 são exatamente os do contrato, na ordem, e não há outros fora de uma mídia', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      expect(h2Fora(principal(container)).map((h2) => h2.textContent), caminho).toEqual(H2S[caminho])
      expect(container.querySelectorAll('[data-midia] h2, [data-midia] h1'), caminho).toHaveLength(0)
    }
  }, 30000)

  it('todo h2 tem id secao-<slug> único e tabindex -1; o h1 tem tabindex -1', async () => {
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
      expect(titulo.classList.contains('focus:outline-none'), caminho).toBe(true)
    }
  }, 30000)

  it('o h2 dos canais de ajuda tem o id fixo secao-ajuda-agora', async () => {
    const container = await abrir('/regras-da-comunidade')

    const h2 = document.getElementById('secao-ajuda-agora')!
    expect(h2.textContent).toBe('Se você precisa de ajuda agora')
    expect(container.querySelectorAll('#secao-ajuda-agora')).toHaveLength(1)
  })

  it('a abertura leva o subtítulo de uma linha, a lateral em c9–c10 e o fio', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      const abertura = filhosDoMain(container)[0]
      expect(abertura.querySelector('.sb-abertura-subtitulo')!.textContent!.length, caminho).toBeLessThanOrEqual(26)
      expect(abertura.querySelector('.sb-abertura-lateral.col-c9-c10'), caminho).not.toBeNull()
      expect(abertura.querySelector('.sb-abertura-base'), caminho).not.toBeNull()
    }
  }, 30000)

  it('os 9 subtítulos têm o mesmo tipo (sem desvio de tamanho) e o de Desenvolvimento é "Sem metas, sem cobrança."', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      expect(container.querySelector('.vp-subtitulo-longo'), caminho).toBeNull()
      expect(container.querySelector('main .sb-abertura-subtitulo')!.classList.contains('t-subtitulo'), caminho).toBe(true)
    }
    const container = await abrir('/desenvolvimento')
    expect(container.querySelector('.sb-abertura-subtitulo')!.textContent).toBe('Sem metas, sem cobrança.')
  }, 30000)

  it('"Páginas do site" é uma lista de 9 links pronta para 2 colunas a partir de 768, na ordem dos links', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      const lista = container.querySelector('nav[aria-label="Páginas do site"] ul.vp-links.vp-links-duplo')!
      expect(lista.querySelectorAll(':scope > li > a'), caminho).toHaveLength(9)
    }
  }, 30000)

  it('a lateral começa pelo que a página pede e leva o aviso de construção em `ui`, na cor secundária', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      const avisos = container.querySelectorAll('main p[data-aviso="construcao"]')
      expect(avisos, caminho).toHaveLength(1)
      expect(avisos[0].classList.contains('t-ui'), caminho).toBe(true)
      expect(avisos[0].classList.contains('t-secundario'), caminho).toBe(true)
      expect(avisos[0].closest('.sb-abertura-lateral'), caminho).not.toBeNull()
      // Etiquetas só nas 3 páginas que as pedem (uma por item, antes do aviso), com palavras da página.
      const etiquetas = [...container.querySelectorAll('.sb-abertura-lateral > li > .sb-etiqueta')]
      expect(etiquetas.map((e) => e.textContent), caminho).toEqual([...(ETIQUETAS[caminho] ?? [])])
      expect(container.querySelectorAll('.sb-abertura-lateral .sb-etiqueta'), caminho).toHaveLength(etiquetas.length)
      for (const etiqueta of etiquetas) {
        // Cada etiqueta vem antes do aviso (TF-10) na ordem do documento.
        expect(avisos[0].closest('li')!.compareDocumentPosition(etiqueta) & Node.DOCUMENT_POSITION_PRECEDING, caminho).toBeTruthy()
      }
    }
  }, 30000)

  it('a ordem da lateral: Como funciona (TF-12, TF-10, link), Privacidade e Termos (TF-10, TF-09), Contato (só TF-10)', async () => {
    const lateral = async (caminho: string) => {
      const container = await abrir(caminho)
      return [...container.querySelectorAll('.sb-abertura-lateral > li')].map((li) => li.textContent)
    }

    expect(await lateral('/como-funciona')).toEqual([
      'As telas mostradas aqui são exemplos com uma família fictícia.',
      'Em construção: algumas funções descritas aqui ainda não estão no ar.',
      'Ver o protótipo',
    ])
    for (const caminho of ['/privacidade', '/termos']) {
      expect(await lateral(caminho), caminho).toEqual([
        'Em construção: algumas funções descritas aqui ainda não estão no ar.',
        'Nesta versão de avaliação, use só dados fictícios.',
      ])
    }
    for (const caminho of ['/regras-da-comunidade', '/exclusao-de-conta']) {
      expect(await lateral(caminho), caminho).toEqual(['Em construção: algumas funções descritas aqui ainda não estão no ar.'])
    }
    // Cuidado, Desenvolvimento e Sobre: as etiquetas da página e, depois delas, o aviso (TF-10).
    for (const caminho of ['/cuidado-compartilhado', '/desenvolvimento', '/sobre']) {
      expect(await lateral(caminho), caminho).toEqual([
        ...ETIQUETAS[caminho],
        'Em construção: algumas funções descritas aqui ainda não estão no ar.',
      ])
    }
    // Contato: só o aviso de construção; o canal (o e-mail) saiu da lateral para a 1ª linha da página.
    expect(await lateral('/contato')).toEqual(['Em construção: algumas funções descritas aqui ainda não estão no ar.'])
  }, 30000)

  it('no Como funciona, o link da lateral e o círculo CTA levam ao protótipo (Hoje)', async () => {
    const container = await abrir('/como-funciona')

    const links = screen.getAllByRole('link', { name: 'Ver o protótipo' })
    expect(links).toHaveLength(2)
    for (const link of links) expect(link.getAttribute('href')).toBe('/app/hoje')
    const cta = container.querySelector('a[data-cta]')!
    expect(cta.classList.contains('vt-cta')).toBe(true)
    expect(cta.closest('section')!.querySelector('h2')!.textContent).toBe('Veja as telas do protótipo')
    expect(cta.closest('section')!.querySelector('h2')!.classList.contains('t-secao')).toBe(true)
    // Um círculo só: o de contorno é do Início.
    expect(container.querySelector('.vt-cta-contorno')).toBeNull()
  })
})

describe('mídia das páginas', () => {
  it('cada página tem as mídias do contrato: a ilustração, o fundo e o formato, na ordem', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      const molduras = [...container.querySelectorAll('main [data-midia]')]
      expect(
        molduras.map((m) => [m.querySelector('[data-ilustracao]')!.getAttribute('data-ilustracao'), m.getAttribute('data-fundo'), m.getAttribute('data-formato')]),
        caminho,
      ).toEqual(MIDIAS[caminho])
    }
  }, 30000)

  it('a moldura é uma imagem nomeada, sem nenhum texto, com uma ilustração decorativa sem título nem descrição', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      for (const moldura of container.querySelectorAll('main [data-midia]')) {
        expect(moldura.getAttribute('role'), caminho).toBe('img')
        expect(moldura.getAttribute('aria-label'), caminho).toBeTruthy()
        expect(moldura.textContent, caminho).toBe('')
        expect(['barro', 'lavanda']).toContain(moldura.getAttribute('data-fundo'))
        const desenhos = moldura.querySelectorAll('svg')
        expect(desenhos, caminho).toHaveLength(1)
        expect(desenhos[0].getAttribute('aria-hidden'), caminho).toBe('true')
        expect(desenhos[0].hasAttribute('data-ilustracao'), caminho).toBe(true)
        expect(desenhos[0].querySelector('title, desc'), caminho).toBeNull()
      }
    }
  }, 30000)

  it('as 4 páginas do G6 têm mídia, e nunca mais de 3 blocos de texto seguidos sem uma mídia no meio', async () => {
    for (const caminho of G6) {
      const container = await abrir(caminho)
      const [, ...blocos] = filhosDoMain(container)

      expect(container.querySelectorAll('main [data-midia]').length, caminho).toBeGreaterThanOrEqual(1)
      let seguidos = 0
      for (const bloco of blocos) {
        if (bloco.querySelector('[data-midia]')) {
          seguidos = 0
          continue
        }
        // A navegação do fim da página não conta: não é texto corrido.
        if (bloco.querySelector('nav')) continue
        seguidos += 1
        expect(seguidos, `${caminho}: ${bloco.textContent?.slice(0, 30)}`).toBeLessThanOrEqual(3)
      }
    }
  }, 30000)

  it('o Sobre abre com um par de mídias (barro e lavanda) e só depois o parágrafo de apresentação; a mídia larga vem mais abaixo', async () => {
    const container = await abrir('/sobre')
    const [, par, apresentacao] = filhosDoMain(container)

    expect(par.hasAttribute('data-bloco')).toBe(true)
    const molduras = [...par.querySelectorAll('[data-midia]')]
    expect(molduras.map((m) => m.getAttribute('data-formato'))).toEqual(['par', 'par'])
    expect(molduras.map((m) => m.getAttribute('data-fundo'))).toEqual(['barro', 'lavanda'])
    expect(par.querySelector('p')).toBeNull()
    expect(apresentacao.querySelector('p[data-apresentacao]')).not.toBeNull()
    // Nenhuma página tem retrato (c8–c10): o formato saiu das páginas públicas.
    for (const caminho of NOVAS) {
      expect((await abrir(caminho)).querySelector('main [data-formato="retrato"]'), caminho).toBeNull()
    }
  }, 30000)

  it('o colo, a mamada e o tapete só aparecem em moldura lavanda: o barro da cabeça do bebê (e da poltrona) some no fundo barro', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)
      for (const moldura of container.querySelectorAll('main [data-midia]')) {
        if (moldura.querySelector('[data-ilustracao="colo"], [data-ilustracao="mamada"], [data-ilustracao="tapete"]')) {
          expect(moldura.getAttribute('data-fundo'), caminho).toBe('lavanda')
        }
      }
    }
  }, 30000)

  it('nenhuma página tem campo de cor, aparelho, selo ou aviso de rascunho, nem cartão com borda', async () => {
    for (const caminho of NOVAS) {
      const container = await abrir(caminho)

      expect(container.querySelector('[data-campo]'), caminho).toBeNull()
      expect(container.querySelector('[data-aparelho]'), caminho).toBeNull()
      expect(container.querySelector('[data-aviso="rascunho"]'), caminho).toBeNull()
      expect(container.querySelector('.cartao'), caminho).toBeNull()
    }
  }, 30000)
})

describe('listas e tabelas', () => {
  it('as sete regras são uma lista ordenada de 7 itens; os motivos de denúncia são 8', async () => {
    const container = await abrir('/regras-da-comunidade')

    const sete = document.getElementById('secao-as-sete-regras')!.closest('section')!
    const ordenada = sete.querySelectorAll('ol > li')
    expect(ordenada).toHaveLength(7)
    const denunciar = document.getElementById('secao-denunciar-bloquear-e-silenciar')!.closest('section')!
    expect(denunciar.querySelectorAll('ul > li')).toHaveLength(8)
    expect(container.querySelectorAll('main ol')).toHaveLength(1)
  })

  it('a tabela de papéis: legenda, 3 colunas e 3 linhas, com cabeçalhos de coluna e de linha', async () => {
    await abrir('/cuidado-compartilhado')

    const tabela = screen.getByRole('table', { name: 'Papéis na família' })
    expect(tabela.querySelector('caption')!.textContent).toBe('Papéis na família')
    expect([...tabela.querySelectorAll('th[scope="col"]')].map((th) => th.textContent)).toEqual([
      'Papel',
      'Para quem é',
      'O que vai poder fazer',
    ])
    expect([...tabela.querySelectorAll('tbody th[scope="row"]')].map((th) => th.textContent)).toEqual([
      'Responsável',
      'Cuidador',
      'Observador',
    ])
    expect(tabela.querySelector('[data-destaque]')).toBeNull()
    // A tabela fica na largura de c2 a c8, abaixo da linha do h2.
    expect(tabela.closest('.col-c2-c8')).not.toBeNull()
  })

  it('a tabela de canais de ajuda: 188, 192, 180 e 100 em destaque, sem link de telefone', async () => {
    const container = await abrir('/regras-da-comunidade')

    const tabela = screen.getByRole('table', { name: 'Canais oficiais de ajuda' })
    expect([...tabela.querySelectorAll('tbody th[scope="row"]')].map((th) => th.textContent)).toEqual([
      'CVV',
      'SAMU',
      'Ligue 180',
      'Disque 100',
    ])
    const numeros = [...tabela.querySelectorAll('td[data-destaque="numero"]')]
    expect(numeros.map((td) => td.querySelector('.vp-tabela-numero')!.textContent)).toEqual(['188', '192', '180', '100'])
    for (const numero of numeros) expect(numero.querySelector('.vp-tabela-numero')!.classList.contains('t-numero')).toBe(true)
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
    // O nome da coluna repetido na célula (visível só quando empilha) não é lido duas vezes.
    for (const nome of tabela.querySelectorAll('.vp-tabela-coluna')) expect(nome.getAttribute('aria-hidden')).toBe('true')
  })

  it('o Sobre mostra os 4 pilares como h3, na ordem, cada um com uma frase', async () => {
    await abrir('/sobre')

    const secao = document.getElementById('secao-o-que-ele-faz')!.closest('section')!
    const titulos = [...secao.querySelectorAll('h3')]
    expect(titulos.map((h3) => h3.textContent)).toEqual([...PILARES])
    for (const h3 of titulos) expect(h3.nextElementSibling!.tagName).toBe('P')
    expect(h2Fora(secao)).toHaveLength(1)
  })
})
