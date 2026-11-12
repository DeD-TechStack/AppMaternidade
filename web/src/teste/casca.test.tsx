import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  COLUNAS_DO_RODAPE,
  DESTINO_CRIAR_CONTA,
  DESTINO_ENTRAR,
  ITENS_DO_CABECALHO,
} from '../componentes/casca/textos.ts'
import { renderizarRota } from './renderizarRota.tsx'

// A casca do Campo de mel (MAT-49a): cabeçalho, menu de altura cheia e rodapé de mel. Substitui o
// antigo web/src/casca.test.tsx.

const ROTAS_PUBLICAS = [
  '/como-funciona',
  '/cuidado-compartilhado',
  '/desenvolvimento',
  '/regras-da-comunidade',
  '/privacidade',
  '/termos',
  '/exclusao-de-conta',
  '/contato',
  '/sobre',
]

describe('cabeçalho público', () => {
  it('tem o nome do site, os quatro links, Entrar e o primário "Criar conta"', () => {
    const { container } = renderizarRota('/como-funciona')
    const cabecalho = container.querySelector<HTMLElement>('header[data-cabecalho]')!
    expect(within(cabecalho).getByRole('link', { name: 'AppMaternidade' }).getAttribute('href')).toBe('/')
    const nav = within(cabecalho).getByRole('navigation', { name: 'Site' })
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Como funciona',
      'Cuidado compartilhado',
      'Desenvolvimento',
      'Comunidade',
    ])
    expect(within(nav).getByRole('link', { name: 'Comunidade' }).getAttribute('href')).toBe('/regras-da-comunidade')
    expect(within(cabecalho).getByRole('link', { name: 'Entrar' })).toBeTruthy()
    const criar = within(cabecalho).getByRole('link', { name: 'Criar conta' })
    expect(criar.getAttribute('data-botao')).toBe('primario')
    expect(criar.classList.contains('cm-botao-primario')).toBe(true)
  })

  it('Entrar leva a /entrar e "Criar conta" leva a /criar-conta (as telas de acesso existem)', () => {
    expect(DESTINO_ENTRAR).toBe('/entrar')
    expect(DESTINO_CRIAR_CONTA).toBe('/criar-conta')
    const { container } = renderizarRota('/como-funciona')
    const cabecalho = container.querySelector<HTMLElement>('header[data-cabecalho]')!
    expect(within(cabecalho).getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe('/entrar')
    expect(within(cabecalho).getByRole('link', { name: 'Criar conta' }).getAttribute('href')).toBe('/criar-conta')
  })

  it('todo destino do cabeçalho é uma rota que existe (nenhuma rota inventada)', () => {
    for (const item of ITENS_DO_CABECALHO.publico) expect(ROTAS_PUBLICAS).toContain(item.para)
    const { container } = renderizarRota('/')
    for (const link of container.querySelectorAll<HTMLAnchorElement>('header[data-cabecalho] a')) {
      const destino = link.getAttribute('href')!
      expect(['/', ...ROTAS_PUBLICAS, '/entrar', '/criar-conta'], destino).toContain(destino)
    }
  })

  it('não tem mais o submenu "Em breve"', () => {
    renderizarRota('/')
    expect(screen.queryByText(/Em breve/)).toBeNull()
  })

  it('o link da página atual leva aria-current', () => {
    const { container } = renderizarRota('/desenvolvimento')
    const nav = container.querySelector('header nav')!
    expect(within(nav as HTMLElement).getByRole('link', { name: 'Desenvolvimento' }).getAttribute('aria-current')).toBe('page')
  })
})

describe('menu de altura cheia', () => {
  it('abre pelo botão Menu, leva o foco ao primeiro item, fecha com Esc e devolve o foco ao botão', () => {
    const { container } = renderizarRota('/')
    const botao = screen.getByRole('button', { name: 'Menu' })
    const painel = container.querySelector<HTMLElement>('[data-menu-celular]')!
    expect(painel.hidden).toBe(true)
    expect(botao.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(botao)
    expect(painel.hidden).toBe(false)
    expect(botao.getAttribute('aria-expanded')).toBe('true')
    expect(botao.getAttribute('aria-controls')).toBe(painel.id)
    expect(document.activeElement).toBe(within(painel).getAllByRole('link')[0])
    expect(within(painel).getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Como funciona',
      'Cuidado compartilhado',
      'Desenvolvimento',
      'Comunidade',
      'Criar conta',
      'Entrar',
    ])

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(painel.hidden).toBe(true)
    expect(document.activeElement).toBe(botao)
  })

  it('prende o Tab numa volta pelos focáveis do cabeçalho', () => {
    const { container } = renderizarRota('/')
    const botao = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(botao)
    const painel = container.querySelector<HTMLElement>('[data-menu-celular]')!
    const ultimo = within(painel).getByRole('link', { name: 'Entrar' })
    ultimo.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    // Depois do último item do painel, o foco volta ao começo do cabeçalho (o nome do site).
    expect(document.activeElement).toBe(screen.getAllByRole('link', { name: 'AppMaternidade' })[0])
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(ultimo)
  })

  it('fecha sozinho ao navegar por um link dele', async () => {
    const { container, roteador } = renderizarRota('/')
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const painel = container.querySelector<HTMLElement>('[data-menu-celular]')!
    await act(async () => {
      fireEvent.click(within(painel).getByRole('link', { name: 'Desenvolvimento' }))
    })
    expect(roteador.state.location.pathname).toBe('/desenvolvimento')
    expect(container.querySelector<HTMLElement>('[data-menu-celular]')!.hidden).toBe(true)
  })
})

describe('cabeçalho da área logada', () => {
  it('tem o botão "Modo madrugada" com a lua, que liga e desliga o tema', () => {
    renderizarRota('/app/hoje')
    const botao = screen.getByRole('button', { name: 'Modo madrugada' })
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    expect(botao.querySelector('svg')).not.toBeNull()
    fireEvent.click(botao)
    expect(botao.getAttribute('aria-pressed')).toBe('true')
    expect(document.documentElement.getAttribute('data-tema')).toBe('madrugada')
    fireEvent.click(botao)
    expect(botao.getAttribute('aria-pressed')).toBe('false')
  })

  it('não mostra Entrar nem "Criar conta"', () => {
    const { container } = renderizarRota('/app/hoje')
    const cabecalho = container.querySelector<HTMLElement>('header[data-cabecalho]')!
    expect(within(cabecalho).queryByRole('link', { name: 'Criar conta' })).toBeNull()
    expect(within(cabecalho).queryByRole('link', { name: 'Entrar' })).toBeNull()
  })

  it('a navegação é Hoje, Sessão, Histórico, Desenvolvimento, Comunidade e Família, na ordem, vinda do registro das áreas, com o item Família ativo em /app/familia', () => {
    const { container } = renderizarRota('/app/hoje')
    const nav = within(container.querySelector<HTMLElement>('header[data-cabecalho]')!).getByRole('navigation', { name: 'Site' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Hoje', '/app/hoje'],
      ['Sessão', '/app/sessao'],
      ['Histórico', '/app/historico'],
      ['Desenvolvimento', '/app/desenvolvimento'],
      ['Comunidade', '/app/comunidade'],
      ['Família', '/app/familia'],
    ])
    expect(ITENS_DO_CABECALHO.logado.map((item) => item.para)).toEqual([
      '/app/hoje',
      '/app/sessao',
      '/app/historico',
      '/app/desenvolvimento',
      '/app/comunidade',
      '/app/familia',
    ])
    expect(links[0].getAttribute('aria-current')).toBe('page')
    // Nenhum item "Em breve" nem faixa lateral: só o que tem tela.
    expect(screen.queryByText(/Em breve/)).toBeNull()
  })
})

describe('alvos da casca na madrugada (DESIGN.md 8)', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles', 'campo.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const regras = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ seletor: m[1].trim(), corpo: m[2] }))
  const daMadrugada = regras.filter((r) => /:root\[data-tema='madrugada'\]/.test(r.seletor))

  const ALVOS = ['.cm-marca', '.cm-cab-link', '.cm-cab-entrar', '.sb-cab-menu', '.cm-cab-criar', '.cm-cab-madrugada', '.cm-rodape-link']

  it('cada alvo da casca tem regra só da madrugada com 56px de altura', () => {
    for (const alvo of ALVOS) {
      const regra = daMadrugada.find(
        (r) => r.seletor.split(',').some((s) => s.trim() === `:root[data-tema='madrugada'] ${alvo}`) && /min-height:\s*56px/.test(r.corpo),
      )
      expect(regra, alvo).toBeDefined()
    }
  })

  it('os botões quadrados (menu e lua) também têm 56px de largura', () => {
    for (const alvo of ['.sb-cab-menu', '.cm-cab-madrugada']) {
      const regra = daMadrugada.find(
        (r) => r.seletor.split(',').some((s) => s.trim() === `:root[data-tema='madrugada'] ${alvo}`) && /min-width:\s*56px/.test(r.corpo),
      )
      expect(regra, alvo).toBeDefined()
    }
  })

  it('nenhuma regra da madrugada muda font-size nem line-height', () => {
    expect(daMadrugada.length).toBeGreaterThan(0)
    for (const r of daMadrugada) expect(r.corpo, r.seletor).not.toMatch(/font-size|line-height/)
  })
})

describe('rodapé compacto nas rotas /app/*', () => {
  const TODOS_OS_LINKS = COLUNAS_DO_RODAPE.flatMap((c) => c.links)

  it.each(['/app/hoje', '/app/sessao'])('em %s é uma linha só de links, sem o nome grande nem o painel de mel', (caminho) => {
    const { container } = renderizarRota(caminho)
    const rodapes = container.querySelectorAll<HTMLElement>('footer[data-rodape]')
    expect(rodapes).toHaveLength(1)
    const rodape = rodapes[0]
    expect(rodape.id).toBe('rodape')
    expect(rodape.classList.contains('cm-rodape')).toBe(true)
    expect(rodape.classList.contains('cm-rodape-compacto')).toBe(true)
    expect(rodape.querySelector('[data-nome-rodape]')).toBeNull()
    expect(rodape.querySelector('[data-painel="mel"]')).toBeNull()
    expect(rodape.querySelector('.cm-rodape-frase')).toBeNull()
    expect(within(rodape).queryAllByRole('heading')).toHaveLength(0)
    const navs = within(rodape).getAllByRole('navigation')
    expect(navs).toHaveLength(1)
    expect(navs[0].getAttribute('aria-label')).toBeTruthy()
    const links = within(navs[0]).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(TODOS_OS_LINKS.map((l) => l.para))
    expect(links.map((a) => a.textContent)).toEqual(TODOS_OS_LINKS.map((l) => l.rotulo))
    for (const a of links) expect(a.classList.contains('cm-rodape-link')).toBe(true)
  })

  it('não leva o aviso de demonstração para dentro do rodapé compacto', () => {
    const { container } = renderizarRota('/app/hoje')
    expect(container.querySelector('footer[data-rodape] [data-aviso="demonstracao"]')).toBeNull()
  })

  it('em /app/hoje, sem banco, há exatamente um aviso de demonstração na página e ele não está no rodapé', () => {
    // Mesmo setup do avisoDemonstracao.test.tsx para o caso em que o aviso aparece: as duas variáveis do banco vazias.
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    try {
      const { container } = renderizarRota('/app/hoje')
      const avisos = container.querySelectorAll('[data-aviso="demonstracao"]')
      expect(avisos).toHaveLength(1)
      expect(avisos[0].closest('footer[data-rodape]')).toBeNull()
      expect(container.querySelector('footer[data-rodape]')).not.toBeNull()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('`comAviso` continua valendo: o rodapé público segue mostrando o aviso', () => {
    const { container } = renderizarRota('/sobre')
    expect(container.querySelector('footer[data-rodape] [data-aviso="demonstracao"]')).not.toBeNull()
  })
})

describe('rodapé de mel', () => {
  it('é um painel de mel com data-rodape, as colunas Produto, Ajuda e Legal e o nome em tamanho de exibição', () => {
    const { container } = renderizarRota('/sobre')
    const rodape = container.querySelector<HTMLElement>('footer[data-rodape]')!
    expect(rodape.querySelector('[data-painel="mel"]')).not.toBeNull()
    expect(within(rodape).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Produto', 'Ajuda', 'Legal'])
    expect(rodape.querySelector('[data-nome-rodape]')!.textContent).toBe('AppMaternidade')
  })

  it('cada link vai a uma das 9 rotas públicas, e as 9 aparecem', () => {
    const { container } = renderizarRota('/')
    const rodape = container.querySelector<HTMLElement>('footer[data-rodape]')!
    const destinos = [...rodape.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect([...destinos].sort()).toEqual([...ROTAS_PUBLICAS].sort())
    expect(COLUNAS_DO_RODAPE.flatMap((c) => c.links).length).toBe(9)
  })

  it('cada link do rodapé abre uma página com o próprio h1', async () => {
    for (const destino of ROTAS_PUBLICAS) {
      const { container, unmount } = renderizarRota('/')
      const link = container.querySelector<HTMLAnchorElement>(`footer a[href="${destino}"]`)!
      await act(async () => {
        fireEvent.click(link)
      })
      expect(container.querySelector('main h1'), destino).not.toBeNull()
      unmount()
    }
  })

  it('nas rotas públicas o rodapé completo não muda: painel de mel, frase, 3 colunas e o nome grande', () => {
    for (const caminho of ['/', '/sobre', '/contato']) {
      const { container, unmount } = renderizarRota(caminho)
      const rodape = container.querySelector<HTMLElement>('footer[data-rodape]')!
      expect(rodape.classList.contains('cm-rodape-compacto'), caminho).toBe(false)
      expect(rodape.querySelector('[data-painel="mel"]'), caminho).not.toBeNull()
      expect(rodape.querySelector('[data-nome-rodape]'), caminho).not.toBeNull()
      expect(rodape.querySelector('.cm-rodape-frase'), caminho).not.toBeNull()
      expect(within(rodape).getAllByRole('heading', { level: 2 }), caminho).toHaveLength(3)
      unmount()
    }
  })

  it('o aviso de demonstração aparece uma vez, numa linha do rodapé (sem as variáveis do banco)', () => {
    const { container } = renderizarRota('/sobre')
    const avisos = container.querySelectorAll('[data-aviso="demonstracao"]')
    expect(avisos).toHaveLength(1)
    expect(avisos[0].closest('footer[data-rodape]')).not.toBeNull()
  })
})
