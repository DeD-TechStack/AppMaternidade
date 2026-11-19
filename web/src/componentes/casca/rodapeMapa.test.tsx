import { render, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarRotas } from '../../rotas.tsx'
import { criarClienteFalso } from '../../teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import * as textos from './textos.ts'

// DS1:RF-04 / RF-14 / RN-02 (DS1-I-14 e DS1-I-20): o RodapeMapa. O rodapé do FOOTER-1 reassentado em cacau, com
// quatro grupos e 11 links na ordem do §3.8 da spec (Produto, Conta, Ajuda, Legal: a ordem da spec, não a do deck),
// a linha de copyright e o aviso de avaliação, sempre renderizado, com ou sem banco. Os rótulos vêm de textos.ts
// (a casca do deck COPY_casca.md): o teste confere que as constantes são as frases do deck, e que a tela as mostra.
// O rodapé compacto de /app/* não muda: 9 links (Produto, Ajuda e Legal), sem nome, sem títulos e sem aviso.

const falso = vi.hoisted(() => ({ cliente: null as unknown }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => falso.cliente) }))

/** As frases do deck COPY_casca.md §2.3, escritas por extenso: as constantes de textos.ts têm de ser iguais a elas. */
const DECK = {
  grupos: ['Produto', 'Conta', 'Ajuda', 'Legal'],
  rotulos: [
    ['Como funciona', 'Cuidado compartilhado', 'Desenvolvimento'],
    ['Recuperar acesso', 'Tenho um convite'],
    ['Regras da comunidade', 'Contato', 'Sobre'],
    ['Privacidade', 'Termos', 'Exclusão de conta'],
  ],
  destinos: [
    ['/como-funciona', '/cuidado-compartilhado', '/desenvolvimento'],
    ['/recuperar-acesso', '/convite'],
    ['/regras-da-comunidade', '/contato', '/sobre'],
    ['/privacidade', '/termos', '/exclusao-de-conta'],
  ],
  copyright: '© 2026 DeD TechStack',
  aviso: 'Nesta versão de avaliação, use só dados fictícios.',
  avisoSemBanco: 'Demonstração sem banco: nada do que você registra aqui é salvo. Ao recarregar a página, tudo volta ao começo.',
  pilula: 'Criar conta',
}

const TODOS_OS_ROTULOS = DECK.rotulos.flat()
const TODOS_OS_DESTINOS = DECK.destinos.flat()
const SELETOR_AVISO = '[data-aviso]'

/** As rotas do site público que levam o RodapeMapa: as 15 do PLANO, as duas contas de apoio e o 404. */
const ROTAS_PUBLICAS = [
  '/',
  '/como-funciona',
  '/cuidado-compartilhado',
  '/desenvolvimento',
  '/regras-da-comunidade',
  '/privacidade',
  '/termos',
  '/exclusao-de-conta',
  '/contato',
  '/sobre',
  '/entrar',
  '/criar-conta',
  '/recuperar-acesso',
  '/convite',
  '/rota-que-nao-existe',
  '/redefinir-senha',
  '/conta-excluida',
]

let rodada = 0

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  vi.mocked(createClient).mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function comBanco(ligado: boolean) {
  if (ligado) {
    rodada += 1
    vi.stubEnv('VITE_SUPABASE_URL', `https://rodape-${rodada}.invalid`)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', `chave-${rodada}`)
    falso.cliente = criarClienteFalso({ usuario: null }).cliente
  } else {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
  }
}

function renderizar(caminho: string, ligado: boolean) {
  comBanco(ligado)
  vi.stubGlobal('scrollTo', vi.fn())
  const roteador = createMemoryRouter(criarRotas(), { initialEntries: [caminho] })
  return render(<RouterProvider router={roteador} />)
}

const rodapeDe = (container: HTMLElement) => container.querySelector<HTMLElement>('footer[data-rodape]')!

/** Quantos elementos sob `raiz` têm exatamente `texto` como textContent. */
function contarLinhasCopy(raiz: ParentNode, texto: string) {
  return [...raiz.querySelectorAll('*')].filter((el) => el.textContent === texto).length
}

/** O código-fonte sem as linhas de comentário (começam por `*`, `//` ou `/*`). */
function semComentarios(fonte: string) {
  return fonte
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((linha) => !/^\s*(\*|\/\/|\/\*)/.test(linha))
    .join('\n')
}

describe('DS1-I-14 as frases de textos.ts são as do deck da casca (COPY_casca.md §2.3)', () => {
  it('DS1-I-14 COLUNAS_DO_RODAPE: quatro grupos, na ordem Produto, Conta, Ajuda, Legal, com 11 links e os rótulos do deck', () => {
    const colunas = textos.COLUNAS_DO_RODAPE
    expect(colunas.map((c) => c.titulo)).toEqual(DECK.grupos)
    expect(colunas.map((c) => c.links.map((l) => l.rotulo))).toEqual(DECK.rotulos)
    expect(colunas.map((c) => c.links.map((l) => l.para))).toEqual(DECK.destinos)
    expect(colunas.flatMap((c) => c.links)).toHaveLength(11)
  })

  it('LEGB-I-01 DS1-I-14 a linha de copyright, o aviso de avaliação e o rótulo da pílula são os do deck', () => {
    expect(textos.COPYRIGHT_RODAPE).toBe(DECK.copyright)
    expect(textos.AVISO_RODAPE).toBe(DECK.aviso)
    expect(textos.ROTULO_CRIAR_CONTA).toBe(DECK.pilula)
  })

  it('DS1-I-14 o nome do site e o nome da navegação do rodapé seguem os de sempre', () => {
    expect(textos.NOME_SITE).toBe('AppMaternidade')
    expect(textos.ROTULO_NAVEGACAO_RODAPE).toBe('Rodapé')
  })
})

describe('DS1-I-14 o RodapeMapa em toda rota pública: 11 links em 4 grupos, copyright e um aviso, com e sem banco', () => {
  for (const [modo, ligado] of [
    ['sem banco', false],
    ['com banco', true],
  ] as const) {
    for (const caminho of ROTAS_PUBLICAS) {
      it(`DS1-I-14 ${caminho} ${modo}: footer[data-rodape] com os 11 links na ordem, os 4 grupos, o © e o aviso único`, async () => {
        const { container } = renderizar(caminho, ligado)
        await aguardarCarga()
        const rodape = rodapeDe(container)
        expect(rodape, caminho).not.toBeNull()
        expect(container.querySelectorAll('footer[data-rodape]'), caminho).toHaveLength(1)

        // Os 11 links, na ordem do §3.8, com o destino de cada um.
        const links = within(rodape).getAllByRole('link')
        expect(links.map((a) => a.textContent), caminho).toEqual(TODOS_OS_ROTULOS)
        expect(links.map((a) => a.getAttribute('href')), caminho).toEqual(TODOS_OS_DESTINOS)

        // Os 4 grupos, cada um com o seu título (h2) e a sua lista.
        const grupos = [...rodape.querySelectorAll<HTMLElement>('[data-rodape-grupo]')]
        expect(grupos, caminho).toHaveLength(4)
        for (const [i, grupo] of grupos.entries()) {
          expect(grupo.querySelector('h2')!.textContent, `${caminho} grupo ${i}`).toBe(DECK.grupos[i])
          expect([...grupo.querySelectorAll('a')].map((a) => a.textContent), `${caminho} grupo ${i}`).toEqual(DECK.rotulos[i])
        }

        // O © está no rodapé, e o aviso é um só no documento inteiro, dentro do rodapé.
        expect(rodape.textContent, caminho).toContain('©')
        expect(rodape.textContent, caminho).toContain(DECK.copyright)
        // O aviso do banco de demonstração (`data-aviso="banco-de-demonstracao"`, em /criar-conta e nos formulários da
        // conta, só com banco) é o aviso próprio do formulário, fora do escopo do DS-1a: o aviso da casca é o do rodapé.
        const avisos = container.querySelectorAll(`${SELETOR_AVISO}:not([data-aviso="banco-de-demonstracao"])`)
        expect(avisos, caminho).toHaveLength(1)
        expect(rodape.contains(avisos[0]), caminho).toBe(true)
        expect(avisos[0].tagName).toBe('P')
        expect(avisos[0].textContent, caminho).toBe(ligado ? DECK.aviso : DECK.avisoSemBanco)
      })
    }
  }
})

describe('DS1-I-14 o RodapeMapa: marcação e ordem', () => {
  const montar = () => rodapeDe(renderizar('/sobre', true).container)

  it('DS1-I-14 a navegação do rodapé tem o nome "Rodapé", só ela guarda os 11 links e o aviso e o © ficam fora dela, depois', () => {
    const rodape = montar()
    const navs = within(rodape).getAllByRole('navigation')
    expect(navs).toHaveLength(1)
    expect(navs[0].getAttribute('aria-label')).toBe('Rodapé')
    expect(within(navs[0]).getAllByRole('link')).toHaveLength(11)
    const aviso = rodape.querySelector(SELETOR_AVISO)!
    expect(navs[0].contains(aviso)).toBe(false)
    expect(navs[0].compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })

  it('LEGB-I-01 DS1-I-14 depois dos grupos vêm o aviso e, depois dele, a linha do ©, cada um em um parágrafo', () => {
    const rodape = montar()
    const aviso = rodape.querySelector(SELETOR_AVISO)!
    const copia = [...rodape.querySelectorAll('p')].find((p) => p.textContent === DECK.copyright)!
    expect(copia).toBeDefined()
    expect(aviso.compareDocumentPosition(copia) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(copia.hasAttribute('data-aviso')).toBe(false)
  })

  it('LEGB-I-01 o rodapé tem exatamente um elemento com a linha do ©', () => {
    const rodape = montar()
    expect(contarLinhasCopy(rodape, DECK.copyright)).toBe(1)
  })

  it('LEGB-I-01 controle negativo: a linha antiga não conta como a nova', () => {
    const frag = document.createElement('div')
    const antiga = document.createElement('p')
    antiga.textContent = `© 2026 ${textos.NOME_SITE}`
    frag.appendChild(antiga)
    expect(contarLinhasCopy(frag, DECK.copyright)).toBe(0)
  })

  it('LEGB-I-01 controle negativo: duas linhas iguais dão 2, e a checagem de exatamente um falharia', () => {
    const frag = document.createElement('div')
    for (let i = 0; i < 2; i += 1) {
      const p = document.createElement('p')
      p.textContent = DECK.copyright
      frag.appendChild(p)
    }
    expect(contarLinhasCopy(frag, DECK.copyright)).toBe(2)
  })

  it('LEGB-I-02 Rodape.tsx has no © literal', () => {
    const fonte = readFileSync(join(process.cwd(), 'src', 'componentes', 'casca', 'Rodape.tsx'), 'utf8')
    expect(semComentarios(fonte)).not.toContain('©')
  })

  it('LEGB-I-02 controle negativo: © em código aparece, © em comentário não', () => {
    expect(semComentarios("const a = '© x'\n")).toContain('©')
    expect(semComentarios('// © x\n')).not.toContain('©')
  })

  it('DS1-I-14 a ordem de Tab é a dos grupos: Produto, Conta, Ajuda, Legal (a ordem do DOM)', () => {
    const rodape = montar()
    const focaveis = [...rodape.querySelectorAll<HTMLElement>('a[href], button, [tabindex]:not([tabindex="-1"])')]
    expect(focaveis.map((el) => el.getAttribute('href'))).toEqual(TODOS_OS_DESTINOS)
  })

  it('DS1-I-14 o nome do site fica no rodapé em texto simples (não é link nem se repete em tamanho de exibição)', () => {
    const rodape = montar()
    const nome = rodape.querySelector<HTMLElement>('[data-nome-rodape]')!
    expect(nome.textContent).toBe(textos.NOME_SITE)
    expect(nome.closest('a')).toBeNull()
    expect(nome.children).toHaveLength(0)
    expect(within(rodape).queryAllByRole('link', { name: textos.NOME_SITE })).toHaveLength(0)
  })

  it('DS1-I-14 sem redes sociais, sem ícone, sem seta e sem itálico no rodapé', () => {
    const rodape = montar()
    expect(rodape.querySelector('svg, img, i, em, cite')).toBeNull()
    expect(rodape.querySelector('.cm-segunda-linha, [class*="italic"]')).toBeNull()
    expect(rodape.textContent).not.toMatch(/→|›|»|·/)
    for (const a of rodape.querySelectorAll('a')) expect(a.getAttribute('href')).toMatch(/^\//)
  })

  it('DS1-I-14 o rodapé é estático: nenhum transform em linha, nenhum recipiente de revelação, nenhum painel de cor', () => {
    const rodape = montar()
    for (const elemento of [rodape, ...rodape.querySelectorAll<HTMLElement>('*')]) {
      expect(elemento.getAttribute('style') ?? '', elemento.outerHTML.slice(0, 80)).not.toMatch(/transform|translate|opacity/i)
    }
    expect(rodape.querySelector('.overflow-hidden, [data-painel], .cm-rodape-painel, [data-h="caixa-cor"]')).toBeNull()
  })

  it('DS1-I-14 /redefinir-senha e /conta-excluida levam o mesmo RodapeMapa de /sobre', async () => {
    const referencia = montar().innerHTML
    for (const caminho of ['/redefinir-senha', '/conta-excluida']) {
      const { container, unmount } = renderizar(caminho, true)
      await aguardarCarga()
      expect(rodapeDe(container).innerHTML, caminho).toBe(referencia)
      unmount()
    }
  })

  it('DS1-I-14 em /sistema (rota interna, fora das 15) o rodapé também é o RodapeMapa', () => {
    const rodape = rodapeDe(renderizar('/sistema', true).container)
    expect(within(rodape).getAllByRole('link')).toHaveLength(11)
    expect(rodape.querySelectorAll(SELETOR_AVISO)).toHaveLength(1)
  })
})

describe('DS1-I-20 o rodapé compacto de /app/*: igual a hoje, 9 links, sem nome, sem títulos e sem aviso', () => {
  const COMPACTOS = [...DECK.destinos[0], ...DECK.destinos[2], ...DECK.destinos[3]]

  for (const [modo, ligado] of [
    ['sem banco', false],
    ['com banco', true],
  ] as const) {
    it(`DS1-I-20 /app/hoje ${modo}: uma navegação só com os 9 links de Produto, Ajuda e Legal, na ordem, e nenhum aviso`, async () => {
      comBanco(ligado)
      const { container } = renderizarRota('/app/hoje')
      await aguardarCarga()
      const rodapes = container.querySelectorAll<HTMLElement>('footer[data-rodape]')
      expect(rodapes).toHaveLength(1)
      const rodape = rodapes[0]
      expect(rodape.className).toBe('cm-rodape cm-rodape-compacto')
      expect(rodape.querySelector('[data-nome-rodape], [data-rodape-grupo]')).toBeNull()
      expect(within(rodape).queryAllByRole('heading')).toHaveLength(0)
      expect(rodape.querySelector(SELETOR_AVISO)).toBeNull()
      expect(rodape.textContent).not.toContain('©')
      const nav = within(rodape).getByRole('navigation')
      expect(nav.className).toBe('cm-rodape-compacto-nav')
      const links = within(nav).getAllByRole('link')
      expect(links).toHaveLength(9)
      expect(links.map((a) => a.getAttribute('href'))).toEqual(COMPACTOS)
      // Nenhum link do grupo Conta (Recuperar acesso, Tenho um convite) entra no compacto.
      for (const destino of DECK.destinos[1]) expect(links.map((a) => a.getAttribute('href'))).not.toContain(destino)
    })
  }

  it('DS1-I-20 o compacto vale também em /app/sessao e /app/historico', async () => {
    for (const caminho of ['/app/sessao', '/app/historico']) {
      const { container, unmount } = renderizarRota(caminho)
      await aguardarCarga()
      const rodape = container.querySelector<HTMLElement>('footer[data-rodape]')!
      expect(rodape.className, caminho).toBe('cm-rodape cm-rodape-compacto')
      expect(within(rodape).getAllByRole('link'), caminho).toHaveLength(9)
      unmount()
    }
  })
})
