import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvedorDadosConta, ProvedorSessao } from '../conta/sessao.tsx'
import { ProvedorDadosRotina } from '../rotina/dadosRotina.tsx'
import { Layout, useCabecalhoNoite } from '../Layout.tsx'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'
import * as textos from './textos.ts'

// DS1:RF-09 (DS1-I-09): o CabecalhoCTA. Para o visitante, em toda largura, a linha do cabeçalho traz UMA pílula
// cheia para /criar-conta, com o rótulo do deck (uma linha, no máximo 14 caracteres), ao lado do botão do menu
// abaixo de 1100; com sessão, ou enquanto a sessão carrega, ela não existe (sem piscar). O estado de noite
// (`tom="noite"`) é ligado por uma página com `useCabecalhoNoite()`: cabeçalho de cacau, links e marca de papel, a
// pílula vira contorno (borda e texto de papel, fundo transparente), e o cabeçalho não ganha nenhum botão de mel. O estado de
// dia é o cabeçalho de papel de hoje. O tom volta ao dia quando a página sai. A geometria (44 px em 390, 48 px de
// 1100 em diante, sem rolagem horizontal) é do medidor, no Chrome (regra CABECALHO e G1); aqui vai a árvore.
//
// A marcação que este teste fixa: o <header data-cabecalho> leva `data-tom="dia"` ou `data-tom="noite"`, e a pílula é o
// <a data-cabecalho-pilula> (o gancho que o medidor lê), dentro da linha `.cm-cab-miolo` e fora do menu.

const PASTA = path.dirname(fileURLToPath(import.meta.url))
const LARGURA_ORIGINAL = window.innerWidth
const PILULA = 'a[data-cabecalho-pilula]'

function fixarLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  fixarLargura(LARGURA_ORIGINAL)
})

const cabecalho = () => document.querySelector<HTMLElement>('header[data-cabecalho]')!
const pilulas = () => [...cabecalho().querySelectorAll<HTMLAnchorElement>(PILULA)]

/** Uma página que liga a noite do cabeçalho enquanto está montada. */
function PaginaDeNoite() {
  useCabecalhoNoite()
  return <main data-pagina="noite">Noite</main>
}

function PaginaDeDia() {
  return <main data-pagina="dia">Dia</main>
}

/** A casca de verdade com duas páginas de teste: a de noite e a de dia. */
function montarCasca(caminho: string, { sessao = null, strict = false }: { sessao?: 'juliana' | null; strict?: boolean } = {}) {
  const mundo = criarMundoDeTeste({ sessao })
  vi.stubGlobal('scrollTo', vi.fn())
  const roteador = createMemoryRouter(
    [
      {
        element: <ProvedorSessao />,
        children: [
          {
            element: <Layout />,
            children: [
              { path: '/noite', element: <PaginaDeNoite /> },
              { path: '/dia', element: <PaginaDeDia /> },
            ],
          },
        ],
      },
    ],
    { initialEntries: [caminho] },
  )
  const arvore = (
    <ProvedorDadosConta dados={mundo.conta}>
      <ProvedorDadosRotina dados={mundo.rotina}>
        <RouterProvider router={roteador} />
      </ProvedorDadosRotina>
    </ProvedorDadosConta>
  )
  const resultado = render(strict ? <StrictMode>{arvore}</StrictMode> : arvore)
  return { ...resultado, roteador }
}

describe('DS1-I-09 CabecalhoCTA: o rótulo e a marcação', () => {
  it('DS1-I-09 o rótulo da pílula é o do deck, em uma linha, com no máximo 14 caracteres', () => {
    expect(textos.ROTULO_CRIAR_CONTA).toBe('Criar conta')
    expect(textos.ROTULO_CRIAR_CONTA.length).toBeLessThanOrEqual(14)
    expect(textos.ROTULO_CRIAR_CONTA).not.toMatch(/\n/)
  })

  for (const largura of [390, 768, 1024, 1100, 1440]) {
    it(`DS1-I-09 visitante em ${largura}: uma pílula cheia para /criar-conta na linha do cabeçalho, fora do menu`, async () => {
      fixarLargura(largura)
      renderizarRota('/', { sessao: null })
      await aguardarCarga()

      const achadas = pilulas()
      expect(achadas).toHaveLength(1)
      const pilula = achadas[0]
      expect(pilula.getAttribute('href')).toBe('/criar-conta')
      expect(pilula.textContent).toBe(textos.ROTULO_CRIAR_CONTA)
      expect(pilula.closest('.cm-cab-miolo')).not.toBeNull()
      expect(pilula.closest('[data-menu-celular]')).toBeNull()
      expect(pilula.classList.contains('cm-botao-primario')).toBe(true)
      expect(pilula.hasAttribute('aria-disabled')).toBe(false)
      // Nada na pílula a esconde em uma largura: nenhuma classe utilitária de "hidden".
      expect(pilula.className).not.toMatch(/(^|\s)(?:\w+:)?hidden(\s|$)/)
      expect(pilula.hasAttribute('hidden')).toBe(false)
    })
  }

  it('DS1-I-09 a pílula é a única ação cheia do cabeçalho de dia e o cabeçalho não tem botão de mel', async () => {
    renderizarRota('/sobre', { sessao: null })
    await aguardarCarga()
    expect(cabecalho().querySelectorAll('.cm-botao-primario')).toHaveLength(1)
    expect(cabecalho().querySelector('.cm-botao-mel, [data-botao-mel]')).toBeNull()
  })

  it('DS1-I-09 em toda rota pública a pílula está lá (a casca é uma só)', async () => {
    for (const caminho of ['/', '/como-funciona', '/cuidado-compartilhado', '/privacidade', '/contato', '/rota-que-nao-existe']) {
      const { unmount } = renderizarRota(caminho, { sessao: null })
      await aguardarCarga()
      expect(pilulas(), caminho).toHaveLength(1)
      unmount()
    }
  })

  it('DS1-I-09 a ordem de Tab: os links da navegação, depois Entrar, depois a pílula, depois o botão do menu', async () => {
    renderizarRota('/', { sessao: null })
    await aguardarCarga()
    const focaveis = [...cabecalho().querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter((el) => el.closest('[data-menu-celular]') === null)
    const posicao = (el: Element) => focaveis.indexOf(el as HTMLElement)
    const pilula = pilulas()[0]
    const ultimoLinkDaNavegacao = [...cabecalho().querySelectorAll('.cm-cab-links a')].at(-1)!
    const entrar = within(cabecalho()).getByRole('link', { name: textos.ROTULO_ENTRAR })
    const menu = within(cabecalho()).getByRole('button', { name: textos.ROTULO_MENU })
    expect(posicao(ultimoLinkDaNavegacao)).toBeLessThan(posicao(entrar))
    expect(posicao(entrar)).toBeLessThan(posicao(pilula))
    expect(posicao(pilula)).toBeLessThan(posicao(menu))
  })

  it('DS1-I-09 o menu de 390 guarda os seus itens: a pílula também está no menu aberto, e a da linha não some', async () => {
    fixarLargura(390)
    renderizarRota('/', { sessao: null })
    await aguardarCarga()
    fireEvent.click(screen.getByRole('button', { name: textos.ROTULO_MENU }))
    const painel = document.querySelector<HTMLElement>('[data-menu-celular]')!
    expect(painel.hidden).toBe(false)
    expect(within(painel).getByRole('link', { name: textos.ROTULO_CRIAR_CONTA }).getAttribute('href')).toBe('/criar-conta')
    expect(within(painel).getByRole('link', { name: textos.ROTULO_ENTRAR })).toBeTruthy()
    expect(pilulas()).toHaveLength(1)
  })
})

describe('DS1-I-09 CabecalhoCTA: com sessão ou carregando, a pílula não existe', () => {
  it('DS1-I-09 enquanto a sessão carrega não há pílula (nem "Entrar"): sem piscar', async () => {
    renderizarRota('/', { sessao: 'juliana' })
    expect(pilulas()).toHaveLength(0)
    expect(within(cabecalho()).queryByRole('link', { name: textos.ROTULO_ENTRAR })).toBeNull()
    await aguardarCarga()
  })

  it('DS1-I-09 com sessão, depois de carregar, não há pílula e o cabeçalho traz Conta e Sair', async () => {
    for (const largura of [390, 1440]) {
      fixarLargura(largura)
      const { unmount } = renderizarRota('/sobre', { sessao: 'juliana' })
      await aguardarCarga()
      expect(pilulas(), String(largura)).toHaveLength(0)
      expect(within(cabecalho()).getByRole('link', { name: textos.ROTULO_CONTA }).getAttribute('href')).toBe('/app/conta')
      expect(within(cabecalho()).getByRole('button', { name: textos.ROTULO_SAIR })).toBeTruthy()
      unmount()
    }
  })

  it('DS1-I-09 sem sessão, ao terminar de carregar, a pílula aparece (e antes não estava)', async () => {
    renderizarRota('/', { sessao: null })
    expect(pilulas()).toHaveLength(0)
    await aguardarCarga()
    expect(pilulas()).toHaveLength(1)
  })

  it('DS1-I-09 nas páginas do app (contexto logado) o cabeçalho não ganha a pílula', async () => {
    renderizarRota('/app/hoje')
    await aguardarCarga()
    expect(pilulas()).toHaveLength(0)
  })
})

describe('DS1-I-09 CabecalhoCTA: o estado de noite (useCabecalhoNoite) e o de dia', () => {
  it('DS1-I-09 o estado padrão é o dia: data-tom="dia", pílula cheia, nada de contorno', async () => {
    montarCasca('/dia')
    await aguardarCarga()
    expect(cabecalho().getAttribute('data-tom')).toBe('dia')
    const pilula = pilulas()[0]
    expect(pilula.classList.contains('cm-botao-primario')).toBe(true)
    expect(pilula.classList.contains('cm-botao-contorno')).toBe(false)
  })

  it('DS1-I-09 a página que chama useCabecalhoNoite() liga a noite: data-tom="noite" e a pílula vira contorno', async () => {
    montarCasca('/noite')
    await aguardarCarga()
    expect(cabecalho().getAttribute('data-tom')).toBe('noite')
    const achadas = pilulas()
    expect(achadas).toHaveLength(1)
    expect(achadas[0].classList.contains('cm-botao-contorno')).toBe(true)
    expect(achadas[0].classList.contains('cm-botao-primario')).toBe(false)
    expect(achadas[0].getAttribute('href')).toBe('/criar-conta')
    expect(achadas[0].textContent).toBe(textos.ROTULO_CRIAR_CONTA)
  })

  it('DS1-I-09 na noite o cabeçalho continua com um botão só e nenhum de mel (a página guarda o único botão de mel)', async () => {
    montarCasca('/noite')
    await aguardarCarga()
    expect(cabecalho().querySelector('.cm-botao-mel, [data-botao-mel]')).toBeNull()
    expect(cabecalho().querySelectorAll('.cm-botao')).toHaveLength(1)
  })

  it('DS1-I-09 o tom volta ao dia quando a página sai (a navegação para outra rota desliga a noite)', async () => {
    const { roteador } = montarCasca('/noite')
    await aguardarCarga()
    expect(cabecalho().getAttribute('data-tom')).toBe('noite')

    await act(async () => {
      await roteador.navigate('/dia')
    })
    await aguardarCarga()

    expect(cabecalho().getAttribute('data-tom')).toBe('dia')
    expect(pilulas()[0].classList.contains('cm-botao-primario')).toBe(true)
  })

  it('DS1-I-09 o tom também volta ao dia quando a casca desmonta e outra monta (nada vaza entre as páginas)', async () => {
    const primeira = montarCasca('/noite')
    await aguardarCarga()
    expect(cabecalho().getAttribute('data-tom')).toBe('noite')
    primeira.unmount()

    montarCasca('/dia')
    await aguardarCarga()
    expect(cabecalho().getAttribute('data-tom')).toBe('dia')
  })

  it('DS1-I-09 no StrictMode (efeito rodado duas vezes) a página de noite continua de noite e volta ao dia ao sair', async () => {
    const { roteador } = montarCasca('/noite', { strict: true })
    await aguardarCarga()
    expect(cabecalho().getAttribute('data-tom')).toBe('noite')
    await act(async () => {
      await roteador.navigate('/dia')
    })
    await aguardarCarga()
    expect(cabecalho().getAttribute('data-tom')).toBe('dia')
  })

  it('DS1-I-09 a noite não muda quem vê a pílula: com sessão ela continua ausente', async () => {
    montarCasca('/noite', { sessao: 'juliana' })
    await aguardarCarga()
    expect(cabecalho().getAttribute('data-tom')).toBe('noite')
    expect(pilulas()).toHaveLength(0)
  })

  it('DS1-I-09 a noite vale nas duas larguras: a pílula de contorno está na linha em 390 e em 1440', async () => {
    for (const largura of [390, 1440]) {
      fixarLargura(largura)
      const { unmount } = montarCasca('/noite')
      await aguardarCarga()
      const pilula = pilulas()[0]
      expect(pilula, String(largura)).toBeDefined()
      expect(pilula.closest('.cm-cab-miolo')).not.toBeNull()
      unmount()
    }
  })
})

describe('DS1-I-09 CabecalhoCTA: o CSS não esconde a pílula e define o estado de noite', () => {
  const css = fs
    .readFileSync(path.join(PASTA, '../../styles/site.css'), 'utf8')
    .replaceAll('\r\n', '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  const blocos = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ seletor: m[1].trim(), corpo: m[2] }))
  const daPilula = blocos.filter((b) => /cm-cab-criar|data-cabecalho-pilula/.test(b.seletor))

  it('DS1-I-09 nenhuma regra da pílula a esconde (display: none) em largura nenhuma', () => {
    expect(daPilula.length).toBeGreaterThan(0)
    for (const { seletor, corpo } of daPilula) {
      expect(corpo, `a pílula some em: ${seletor}`).not.toMatch(/display\s*:\s*none/i)
      expect(corpo, seletor).not.toMatch(/visibility\s*:\s*hidden/i)
    }
  })

  it('DS1-I-09 a pílula nunca fica abaixo de 44 px de altura (min-height em px menor que 44 não existe nas regras dela)', () => {
    for (const { seletor, corpo } of daPilula) {
      for (const m of corpo.matchAll(/(?<![-\w])(?:min-)?height\s*:\s*(\d+(?:\.\d+)?)px/gi)) {
        expect(Number(m[1]), seletor).toBeGreaterThanOrEqual(44)
      }
    }
  })

  // DS1:RN-02 / DS1-I-20 (DS1A-R1-01): a marca de 20 px é só do cabeçalho público; a do logado (/app/*, /moderacao*) fica
  // em 24 px. A medida em Chrome está em geometria.test.tsx; aqui vai o código-fonte.
  it("DS1-I-20 a marca de 20 px (5,3 vw) só existe sob [data-contexto='publico'], e nenhuma regra .cm-marca solta diz 5,3 vw", () => {
    const daMarca = blocos.filter((b) => /\.cm-marca\b/.test(b.seletor))
    expect(daMarca.length).toBeGreaterThan(0)
    const dos20 = daMarca.filter((b) => /5\.3vw|1\.25rem/.test(b.corpo))
    expect(dos20.length, 'a declaração de 20 px da marca pública existe').toBeGreaterThan(0)
    for (const { seletor } of dos20) {
      for (const parte of seletor.split(',').map((p) => p.trim())) {
        expect(parte, `a regra de 20 px da marca está solta: ${parte}`).toMatch(/\[data-contexto=['"]publico['"]\]/)
        expect(parte).toMatch(/\.cm-marca$/)
      }
    }
    // A regra solta (a global) é a da base: 24 px, sem 5,3 vw.
    const soltas = daMarca.filter((b) => b.seletor.split(',').some((p) => !/\[data-contexto/.test(p)))
    expect(soltas.length).toBeGreaterThan(0)
    expect(soltas.map((b) => b.corpo).join('\n')).not.toMatch(/5\.3vw/)
    expect(soltas.map((b) => b.corpo).join('\n')).toMatch(/min\(1\.5rem,\s*6\.4vw\)/)
  })

  it('DS1-I-20 de 640 em diante o cabeçalho público volta a 24 px: o seletor escopado também tem min(1.5rem, 4.4vw)', () => {
    const de640 = blocos.filter((b) => /\[data-contexto=['"]publico['"]\]\s+\.cm-marca/.test(b.seletor) && /min\(1\.5rem,\s*4\.4vw\)/.test(b.corpo))
    expect(de640.length).toBeGreaterThan(0)
  })

  it('DS1-I-09 o estado de noite tem regras: fundo de cacau no cabeçalho e a pílula de contorno com fundo transparente', () => {
    const daNoite = blocos.filter((b) => /data-tom=["']?noite/.test(b.seletor))
    expect(daNoite.length).toBeGreaterThan(0)
    const doCabecalho = daNoite.filter((b) => !/cm-cab-criar|data-cabecalho-pilula/.test(b.seletor))
    expect(doCabecalho.map((b) => b.corpo).join('\n')).toMatch(/background(?:-color)?\s*:\s*var\(--/i)
    const daNoiteNaPilula = daNoite.filter((b) => /cm-cab-criar|data-cabecalho-pilula/.test(b.seletor))
    expect(daNoiteNaPilula.map((b) => b.corpo).join('\n')).toMatch(/background(?:-color)?\s*:\s*transparent/i)
  })
})
