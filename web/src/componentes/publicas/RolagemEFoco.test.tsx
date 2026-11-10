import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { renderizarRota } from '../../teste/renderizarRota.tsx'
import { classificarDestino, decidir } from './RolagemEFoco.tsx'

// A tabela de rolagem e foco, linha por linha. O jsdom não rola nada: window.scrollTo e
// Element.prototype.scrollIntoView são simulados, e o foco se confere em document.activeElement.

type Roteador = ReturnType<typeof renderizarRota>['roteador']

let alvosRolados: Element[]
let rolagemAoTopo: MockInstance<typeof window.scrollTo>
let comportamentos: unknown[]

beforeEach(() => {
  alvosRolados = []
  comportamentos = []
  rolagemAoTopo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  Element.prototype.scrollIntoView = function (this: Element, argumento?: unknown) {
    alvosRolados.push(this)
    comportamentos.push(argumento)
  }
})

afterEach(() => {
  // O jsdom não tem scrollIntoView: tira o que o teste pôs.
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
})

const aoTopo = () => rolagemAoTopo.mock.calls.filter(([x, y]) => x === 0 && y === 0)

async function ir(roteador: Roteador, para: string) {
  await act(async () => {
    await roteador.navigate(para)
  })
}

async function voltar(roteador: Roteador) {
  await act(async () => {
    await roteador.navigate(-1)
  })
}

function limparRegistros() {
  alvosRolados.length = 0
  comportamentos.length = 0
  rolagemAoTopo.mockClear()
}

/** A navegação entre as páginas (no fim de cada página): o rodapé da casca ainda não liga para elas. */
const paginasDoSite = () => screen.getByRole('navigation', { name: 'Páginas do site' })

describe('a tabela de precedência (função pura)', () => {
  const nova = { tipo: 'nova', soAncora: false, ancoraValida: false } as const

  it('1: entrada inicial rola só até uma âncora válida e nunca move o foco', () => {
    expect(decidir({ tipo: 'inicial', destino: 'mat36', soAncora: false, ancoraValida: true })).toEqual({
      rolagem: 'alvo',
      foco: null,
    })
    expect(decidir({ tipo: 'inicial', destino: 'mat36', soAncora: false, ancoraValida: false })).toEqual({
      rolagem: null,
      foco: null,
    })
  })

  it('2: voltar ou avançar não rola; o foco vai ao h1 só nas páginas da MAT-36, com ou sem âncora', () => {
    for (const ancoraValida of [true, false]) {
      expect(decidir({ tipo: 'POP', destino: 'mat36', soAncora: false, ancoraValida })).toEqual({
        rolagem: null,
        foco: 'h1',
      })
      for (const destino of ['inicio', 'app', 'outro'] as const) {
        expect(decidir({ tipo: 'POP', destino, soAncora: false, ancoraValida })).toEqual({ rolagem: null, foco: null })
      }
    }
  })

  it('3: Hoje e Sessão, de qualquer origem, não rolam nem movem o foco', () => {
    expect(decidir({ ...nova, destino: 'app', ancoraValida: true })).toEqual({ rolagem: null, foco: null })
    expect(decidir({ ...nova, destino: 'app', soAncora: true })).toEqual({ rolagem: null, foco: null })
  })

  it('4: troca só de âncora rola até uma âncora válida e foca o h2 só nas páginas da MAT-36', () => {
    expect(decidir({ tipo: 'nova', destino: 'mat36', soAncora: true, ancoraValida: true })).toEqual({
      rolagem: 'alvo',
      foco: 'alvo',
    })
    expect(decidir({ tipo: 'nova', destino: 'inicio', soAncora: true, ancoraValida: true })).toEqual({
      rolagem: 'alvo',
      foco: null,
    })
    expect(decidir({ tipo: 'nova', destino: 'mat36', soAncora: true, ancoraValida: false })).toEqual({
      rolagem: null,
      foco: null,
    })
  })

  it('5: navegação nova rola ao alvo ou ao topo; o foco vai ao h2 alvo ou ao h1, e o Início fica com o da base', () => {
    expect(decidir({ ...nova, destino: 'mat36', ancoraValida: true })).toEqual({ rolagem: 'alvo', foco: 'alvo' })
    expect(decidir({ ...nova, destino: 'mat36' })).toEqual({ rolagem: 'topo', foco: 'h1' })
    expect(decidir({ ...nova, destino: 'inicio' })).toEqual({ rolagem: 'topo', foco: null })
    expect(decidir({ ...nova, destino: 'inicio', ancoraValida: true })).toEqual({ rolagem: 'alvo', foco: null })
  })

  it('classifica o destino: Início, Hoje e Sessão, as páginas da MAT-36 e a rota coringa', () => {
    expect(classificarDestino('/', false)).toBe('inicio')
    expect(classificarDestino('/app/hoje', false)).toBe('app')
    expect(classificarDestino('/app/sessao/', false)).toBe('app')
    expect(classificarDestino('/sobre', false)).toBe('mat36')
    expect(classificarDestino('/regras-da-comunidade/', false)).toBe('mat36')
    expect(classificarDestino('/qualquer-coisa', true)).toBe('mat36')
    expect(classificarDestino('/app/outra', false)).toBe('outro')
  })
})

describe('linha 1: entrada inicial', () => {
  it('com âncora válida, rola até o alvo, sem foco e sem ir ao topo', async () => {
    renderizarRota('/regras-da-comunidade#secao-ajuda-agora')
    await screen.findByRole('heading', { level: 1 })

    expect(alvosRolados.map((alvo) => alvo.id)).toEqual(['secao-ajuda-agora'])
    expect(aoTopo()).toHaveLength(0)
    expect(document.activeElement).toBe(document.body)
  })

  it('com âncora inexistente, não rola nem move o foco', async () => {
    renderizarRota('/regras-da-comunidade#secao-que-nao-existe')
    await screen.findByRole('heading', { level: 1 })

    expect(rolagemAoTopo).not.toHaveBeenCalled()
    expect(alvosRolados).toHaveLength(0)
    expect(document.activeElement).toBe(document.body)
  })

  it('sem âncora, não rola nem move o foco', async () => {
    renderizarRota('/sobre')
    await screen.findByRole('heading', { level: 1 })

    expect(rolagemAoTopo).not.toHaveBeenCalled()
    expect(alvosRolados).toHaveLength(0)
    expect(document.activeElement).toBe(document.body)
  })
})

describe('linha 2: voltar ou avançar', () => {
  it('de uma página pública para outra, não rola e leva o foco ao h1', async () => {
    const { roteador } = renderizarRota('/como-funciona')
    await screen.findByRole('heading', { level: 1 })
    await ir(roteador, '/sobre')
    limparRegistros()

    await voltar(roteador)

    expect(rolagemAoTopo).not.toHaveBeenCalled()
    expect(alvosRolados).toHaveLength(0)
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Como funciona')
    expect(document.activeElement).toBe(titulo)
  })

  it('para uma URL com âncora (válida ou não), não rola e o foco fica no h1', async () => {
    const { roteador } = renderizarRota('/regras-da-comunidade#secao-ajuda-agora')
    await screen.findByRole('heading', { level: 1 })
    await ir(roteador, '/sobre')
    limparRegistros()

    await voltar(roteador)

    expect(rolagemAoTopo).not.toHaveBeenCalled()
    expect(alvosRolados).toHaveLength(0)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })

  it('depois de uma âncora que não existe: ir a outra página e voltar não rola nada', async () => {
    const { roteador } = renderizarRota('/como-funciona')
    await screen.findByRole('heading', { level: 1 })
    await ir(roteador, '/regras-da-comunidade#secao-que-nao-existe')
    await ir(roteador, '/sobre')
    limparRegistros()

    await voltar(roteador)

    expect(rolagemAoTopo).not.toHaveBeenCalled()
    expect(alvosRolados).toHaveLength(0)
  })

  it('voltar para o Início não move o foco', async () => {
    const { roteador } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    await ir(roteador, '/sobre')

    await voltar(roteador)

    expect(document.activeElement).toBe(document.body)
  })
})

describe('linha 3: Hoje e Sessão', () => {
  it('de Hoje para Sessão não rola', async () => {
    const { roteador } = renderizarRota('/app/hoje')
    await screen.findByRole('heading', { level: 1 })

    await ir(roteador, '/app/sessao')

    expect(rolagemAoTopo).not.toHaveBeenCalled()
    expect(alvosRolados).toHaveLength(0)
  })

  it('de uma página pública para o Hoje não rola nem move o foco', async () => {
    const { roteador } = renderizarRota('/sobre')
    await screen.findByRole('heading', { level: 1 })

    await ir(roteador, '/app/hoje')

    expect(rolagemAoTopo).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(document.body)
  })
})

describe('linha 4: troca só de âncora', () => {
  it('na Privacidade, o link do índice rola até o h2, leva o foco a ele e não vai ao topo', async () => {
    renderizarRota('/privacidade')
    await screen.findByRole('heading', { level: 1 })
    limparRegistros()

    const indice = screen.getByRole('navigation', { name: 'Nesta página' })
    fireEvent.click(within(indice).getByRole('link', { name: 'Seus direitos' }))

    const alvo = document.getElementById('secao-seus-direitos')!
    expect(alvo.tagName).toBe('H2')
    expect(alvosRolados).toEqual([alvo])
    expect(aoTopo()).toHaveLength(0)
    expect(document.activeElement).toBe(alvo)
  })

  it('a rolagem é instantânea: scrollIntoView sem `behavior: smooth`', async () => {
    renderizarRota('/termos')
    await screen.findByRole('heading', { level: 1 })
    limparRegistros()

    const indice = screen.getByRole('navigation', { name: 'Nesta página' })
    fireEvent.click(within(indice).getByRole('link', { name: 'Sua conta' }))

    expect(alvosRolados).toHaveLength(1)
    for (const argumento of comportamentos) {
      expect(JSON.stringify(argumento ?? {})).not.toContain('smooth')
    }
  })

  it('o foco por código no h2 não desenha contorno extra (focus:outline-none)', async () => {
    renderizarRota('/termos')
    await screen.findByRole('heading', { level: 1 })

    const h2 = document.querySelector('main h2')!
    expect(h2.getAttribute('tabindex')).toBe('-1')
    expect(h2.className).toContain('focus:outline-none')
  })
})

// A troca só de âncora é a navegação nova em que o caminho e a busca ficam iguais e só o fragmento
// muda, inclusive quando o novo fragmento é vazio.
describe('linha 4: retirar ou trocar só o fragmento não rola nem move o foco', () => {
  const PAGINAS: Array<[string, string]> = [
    ['/privacidade', 'secao-seus-direitos'],
    ['/regras-da-comunidade', 'secao-ajuda-agora'],
    ['/termos', 'secao-sua-conta'],
  ]
  const DESTINOS: Array<[string, string]> = [
    ['sem fragmento', ''],
    ['fragmento vazio (#)', '#'],
    ['fragmento inexistente', '#secao-que-nao-existe'],
  ]

  for (const [pagina, id] of PAGINAS) {
    for (const [nome, sufixo] of DESTINOS) {
      it(`${pagina}: de #${id} para ${nome}`, async () => {
        const { roteador } = renderizarRota(pagina)
        await screen.findByRole('heading', { level: 1 })
        await ir(roteador, `${pagina}#${id}`)
        const alvo = document.getElementById(id)!
        expect(document.activeElement).toBe(alvo)
        limparRegistros()

        await ir(roteador, `${pagina}${sufixo}`)

        expect(rolagemAoTopo).not.toHaveBeenCalled()
        expect(alvosRolados).toHaveLength(0)
        expect(document.activeElement).toBe(alvo)
      })
    }
  }

  it('o mesmo vale com REPLACE', async () => {
    const { roteador } = renderizarRota('/privacidade')
    await screen.findByRole('heading', { level: 1 })
    await ir(roteador, '/privacidade#secao-seus-direitos')
    const alvo = document.getElementById('secao-seus-direitos')!
    limparRegistros()

    await act(async () => {
      await roteador.navigate('/privacidade', { replace: true })
    })

    expect(rolagemAoTopo).not.toHaveBeenCalled()
    expect(alvosRolados).toHaveLength(0)
    expect(document.activeElement).toBe(alvo)
  })

  it('trocar o fragmento por outro válido continua rolando até o alvo e focando o h2', async () => {
    const { roteador } = renderizarRota('/privacidade')
    await screen.findByRole('heading', { level: 1 })
    await ir(roteador, '/privacidade#secao-seus-direitos')
    limparRegistros()

    await ir(roteador, '/privacidade#secao-por-quanto-tempo')

    const alvo = document.getElementById('secao-por-quanto-tempo')!
    expect(alvosRolados).toEqual([alvo])
    expect(aoTopo()).toHaveLength(0)
    expect(document.activeElement).toBe(alvo)
  })

  it('a mesma URL sem fragmento não é troca só de âncora: vai ao topo e leva o foco ao h1', async () => {
    const { roteador } = renderizarRota('/privacidade')
    await screen.findByRole('heading', { level: 1 })
    limparRegistros()

    await ir(roteador, '/privacidade')

    expect(aoTopo()).toHaveLength(1)
    expect(alvosRolados).toHaveLength(0)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })

  it('clicar no link da própria página, na navegação entre páginas, também vai ao topo e foca o h1', async () => {
    renderizarRota('/privacidade')
    await screen.findByRole('heading', { level: 1 })
    limparRegistros()

    fireEvent.click(within(paginasDoSite()).getByRole('link', { name: 'Política de privacidade' }))

    expect(aoTopo()).toHaveLength(1)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })

  it('a mesma URL com âncora válida não é troca só de âncora: rola ao alvo e foca o h2, sem ir ao topo', async () => {
    const { roteador } = renderizarRota('/privacidade')
    await screen.findByRole('heading', { level: 1 })
    await ir(roteador, '/privacidade#secao-seus-direitos')
    limparRegistros()

    await ir(roteador, '/privacidade#secao-seus-direitos')

    const alvo = document.getElementById('secao-seus-direitos')!
    expect(alvosRolados).toEqual([alvo])
    expect(aoTopo()).toHaveLength(0)
    expect(document.activeElement).toBe(alvo)
  })

  it('a mesma URL com âncora inexistente: topo e foco no h1', async () => {
    const { roteador } = renderizarRota('/privacidade')
    await screen.findByRole('heading', { level: 1 })
    await ir(roteador, '/privacidade#secao-que-nao-existe')
    limparRegistros()

    await ir(roteador, '/privacidade#secao-que-nao-existe')

    expect(aoTopo()).toHaveLength(1)
    expect(alvosRolados).toHaveLength(0)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })
})

// O h1 das 10 páginas da MAT-36 fica pronto para o foco por código desde a entrada inicial, sem
// receber o foco.
describe('h1 pronto para o foco por código', () => {
  const DEZ = [
    '/como-funciona',
    '/cuidado-compartilhado',
    '/desenvolvimento',
    '/regras-da-comunidade',
    '/privacidade',
    '/termos',
    '/exclusao-de-conta',
    '/contato',
    '/sobre',
    '/rota-inexistente',
  ]

  for (const caminho of DEZ) {
    it(`entrada inicial em ${caminho}: h1 com tabindex -1 e sem contorno extra, foco no body`, async () => {
      renderizarRota(caminho)
      const titulo = await screen.findByRole('heading', { level: 1 })

      expect(titulo.getAttribute('tabindex')).toBe('-1')
      expect(titulo.classList.contains('focus:outline-none')).toBe(true)
      // Fora da ordem do Tab e sem receber o foco.
      expect(titulo.tabIndex).toBe(-1)
      expect(document.activeElement).toBe(document.body)
    })
  }

  it('de /sobre para a Página não encontrada: o h1 recebe o foco, com tabindex -1 e sem contorno extra', async () => {
    const { roteador } = renderizarRota('/sobre')
    await screen.findByRole('heading', { level: 1 })

    await ir(roteador, '/rota-inexistente')

    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo.getAttribute('tabindex')).toBe('-1')
    expect(titulo.classList.contains('focus:outline-none')).toBe(true)
    expect(document.activeElement).toBe(titulo)
  })

  it('voltando (POP) à Página não encontrada na entrada inicial, o h1 continua pronto', async () => {
    const { roteador } = renderizarRota('/rota-inexistente')
    await screen.findByRole('heading', { level: 1 })
    await ir(roteador, '/sobre')

    await voltar(roteador)

    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(titulo)
  })

  it('o h1 do Início e o das telas logadas não são tocados', async () => {
    const inicio = renderizarRota('/')
    expect((await screen.findByRole('heading', { level: 1 })).hasAttribute('tabindex')).toBe(false)
    inicio.unmount()

    renderizarRota('/app/hoje')
    const hoje = await screen.findByRole('heading', { level: 1 })
    expect(hoje.classList.contains('focus:outline-none')).toBe(false)
  })
})

describe('linha 5: navegação nova', () => {
  it('de uma página pública para outra, vai ao topo e leva o foco ao h1', async () => {
    renderizarRota('/sobre')
    await screen.findByRole('heading', { level: 1 })
    limparRegistros()

    fireEvent.click(within(paginasDoSite()).getByRole('link', { name: 'Termos de uso' }))

    expect(aoTopo()).toHaveLength(1)
    expect(alvosRolados).toHaveLength(0)
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Termos de uso')
    expect(titulo.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(titulo)
  })

  it('cada uma das 10 páginas da MAT-36 recebe o foco no h1, com tabindex -1', async () => {
    const { roteador } = renderizarRota('/sobre')
    await screen.findByRole('heading', { level: 1 })

    for (const caminho of [
      '/como-funciona',
      '/cuidado-compartilhado',
      '/desenvolvimento',
      '/regras-da-comunidade',
      '/privacidade',
      '/termos',
      '/exclusao-de-conta',
      '/contato',
      '/sobre',
      '/rota-inexistente',
    ]) {
      await ir(roteador, '/')
      await ir(roteador, caminho)
      const titulo = screen.getByRole('heading', { level: 1 })
      expect(titulo.getAttribute('tabindex'), caminho).toBe('-1')
      expect(document.activeElement, caminho).toBe(titulo)
    }
  })

  it('com âncora válida, rola até o alvo, não vai ao topo e leva o foco ao h2', async () => {
    const { roteador } = renderizarRota('/sobre')
    await screen.findByRole('heading', { level: 1 })
    limparRegistros()

    await ir(roteador, '/regras-da-comunidade#secao-ajuda-agora')

    const alvo = document.getElementById('secao-ajuda-agora')!
    expect(alvosRolados).toEqual([alvo])
    expect(aoTopo()).toHaveLength(0)
    expect(document.activeElement).toBe(alvo)
  })

  it('o link de urgência do Contato leva ao h2 dos canais de ajuda', async () => {
    renderizarRota('/contato')
    await screen.findByRole('heading', { level: 1 })
    limparRegistros()

    fireEvent.click(document.querySelector('main a[href="/regras-da-comunidade#secao-ajuda-agora"]')!)

    const alvo = document.getElementById('secao-ajuda-agora')!
    expect(alvosRolados).toEqual([alvo])
    expect(document.activeElement).toBe(alvo)
  })

  it('com âncora que não existe, vai ao topo, não rola ao alvo e o foco fica no h1', async () => {
    const { roteador } = renderizarRota('/sobre')
    await screen.findByRole('heading', { level: 1 })
    limparRegistros()

    await ir(roteador, '/regras-da-comunidade#secao-que-nao-existe')

    expect(aoTopo()).toHaveLength(1)
    expect(alvosRolados).toHaveLength(0)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })

  it('do Hoje para uma âncora válida de uma página pública, rola ao alvo e leva o foco ao h2', async () => {
    const { roteador } = renderizarRota('/app/hoje')
    await screen.findByRole('heading', { level: 1 })
    limparRegistros()

    await ir(roteador, '/regras-da-comunidade#secao-ajuda-agora')

    const alvo = document.getElementById('secao-ajuda-agora')!
    expect(alvosRolados).toEqual([alvo])
    expect(aoTopo()).toHaveLength(0)
    expect(document.activeElement).toBe(alvo)
  })

  it('do Hoje para uma página pública, vai ao topo', async () => {
    const { roteador } = renderizarRota('/app/hoje')
    await screen.findByRole('heading', { level: 1 })
    limparRegistros()

    await ir(roteador, '/contato')

    expect(aoTopo()).toHaveLength(1)
  })

  it('para o Início, vai ao topo e deixa o foco como a base deixa', async () => {
    const { roteador } = renderizarRota('/sobre')
    await screen.findByRole('heading', { level: 1 })
    limparRegistros()

    await ir(roteador, '/')

    expect(aoTopo()).toHaveLength(1)
    expect(document.activeElement).toBe(document.body)
  })
})
