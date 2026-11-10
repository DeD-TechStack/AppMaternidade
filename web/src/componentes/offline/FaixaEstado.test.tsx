import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { T01, T02, T03, T04, T05, T06 } from '../../conteudo/offline.ts'
import { definirEventoInstalar, definirOutraAba, definirVersaoNova, type EventoInstalar } from '../../pwa/estado.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'
import { FaixaEstado } from './FaixaEstado.tsx'

// A faixa de estado: só 2 linhas nesta tarefa, (1) versão nova ou outra aba e (9) instalar.

const recarregar = vi.fn()

function mostrar(caminho = '/app/hoje') {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <FaixaEstado />
    </MemoryRouter>,
  )
}

function eventoDeInstalar(): EventoInstalar {
  return Object.assign(new Event('beforeinstallprompt'), {
    prompt: vi.fn<() => Promise<void>>(async () => {}),
    userChoice: Promise.resolve({ outcome: 'dismissed' as const, platform: 'web' }),
  })
}

beforeEach(() => {
  localStorage.clear()
  definirVersaoNova(null)
  definirOutraAba(false)
  definirEventoInstalar(null)
  recarregar.mockClear()
  vi.stubGlobal('location', { reload: recarregar })
})

afterEach(() => {
  localStorage.clear()
})

describe('sem estado a mostrar', () => {
  it('não renderiza nenhum elemento', () => {
    const { container } = mostrar()
    expect(container.innerHTML).toBe('')
  })
})

describe('linha 1: versão nova (T-01 e T-02)', () => {
  it('mostra T-01 e o botão T-02, que chama a função que ativa e não recarrega sozinho', () => {
    const ativar = vi.fn()
    mostrar()
    act(() => definirVersaoNova(ativar))
    expect(screen.getByText(T01)).toBeTruthy()
    expect(screen.queryByText(T06)).toBeNull()
    expect(ativar).not.toHaveBeenCalled()
    expect(recarregar).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: T02 }))
    expect(ativar).toHaveBeenCalledTimes(1)
    expect(recarregar).not.toHaveBeenCalled() // quem recarrega é o controle que muda, não o botão
  })

  it('some quando a versão nova some', () => {
    mostrar()
    act(() => definirVersaoNova(() => {}))
    expect(screen.getByText(T01)).toBeTruthy()
    act(() => definirVersaoNova(null))
    expect(screen.queryByText(T01)).toBeNull()
  })
})

describe('linha 1: o site foi atualizado em outra aba (T-06)', () => {
  it('troca T-01 por T-06, com o botão T-02', () => {
    mostrar()
    act(() => {
      definirVersaoNova(() => {})
      definirOutraAba(true)
    })
    expect(screen.getByText(T06)).toBeTruthy()
    expect(screen.queryByText(T01)).toBeNull()
    expect(screen.getAllByRole('button', { name: T02 })).toHaveLength(1)
  })

  it('T-02 só recarrega esta aba: não manda mensagem ao service worker nem toca em armazenamento compartilhado', () => {
    const postMessage = vi.fn()
    const ativar = vi.fn()
    Object.defineProperty(navigator, 'serviceWorker', { value: { postMessage, controller: { postMessage } }, configurable: true })
    const gravar = vi.spyOn(Storage.prototype, 'setItem')
    const canal = vi.fn()
    vi.stubGlobal('BroadcastChannel', canal)

    mostrar()
    act(() => {
      definirVersaoNova(ativar)
      definirOutraAba(true)
    })
    fireEvent.click(screen.getByRole('button', { name: T02 }))

    expect(recarregar).toHaveBeenCalledTimes(1)
    expect(ativar).not.toHaveBeenCalled()
    expect(postMessage).not.toHaveBeenCalled()
    expect(gravar).not.toHaveBeenCalled()
    expect(canal).not.toHaveBeenCalled()
    Reflect.deleteProperty(navigator, 'serviceWorker')
  })
})

describe('linha 9: instalar (T-03, T-04 e T-05)', () => {
  it('mostra T-03 com os botões T-04 e T-05', () => {
    mostrar()
    act(() => definirEventoInstalar(eventoDeInstalar()))
    expect(screen.getByText(T03)).toBeTruthy()
    expect(screen.getByRole('button', { name: T04 })).toBeTruthy()
    expect(screen.getByRole('button', { name: T05 })).toBeTruthy()
  })

  it('T-05 é um botão de texto sublinhado, com alvo de 44 px no mínimo', () => {
    mostrar()
    act(() => definirEventoInstalar(eventoDeInstalar()))
    const recusar = screen.getByRole('button', { name: T05 })
    expect(recusar.className).toMatch(/\bunderline\b/)
    expect(recusar.className).toMatch(/min-h-\[var\(--alvo-toque\)\]/)
    expect(recusar.className).toMatch(/min-w-\[44px\]/)
  })
})

describe('as duas linhas', () => {
  it('na ordem: versão nova primeiro, instalar depois', () => {
    const { container } = mostrar()
    act(() => {
      definirEventoInstalar(eventoDeInstalar())
      definirVersaoNova(() => {})
    })
    const linhas = [...container.querySelectorAll('[data-faixa-linha]')].map((l) => l.getAttribute('data-faixa-linha'))
    expect(linhas).toEqual(['versao', 'instalar'])
    expect(container.querySelector('[data-faixa-linha="versao"]')!.compareDocumentPosition(container.querySelector('[data-faixa-linha="instalar"]')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('só a linha que tem estado aparece', () => {
    const { container } = mostrar()
    act(() => definirEventoInstalar(eventoDeInstalar()))
    expect(container.querySelectorAll('[data-faixa-linha]')).toHaveLength(1)
    expect(container.querySelector('[data-faixa-linha="instalar"]')).not.toBeNull()
    act(() => definirOutraAba(true))
    expect(container.querySelectorAll('[data-faixa-linha]')).toHaveLength(2)
  })

  it('não é landmark: nenhum role, nenhum elemento de região, nada de ícone', () => {
    const { container } = mostrar()
    act(() => {
      definirVersaoNova(() => {})
      definirEventoInstalar(eventoDeInstalar())
    })
    expect(container.querySelectorAll('[role]')).toHaveLength(0)
    expect(container.querySelectorAll('section, aside, nav, header, footer, main, [aria-label], [aria-labelledby]')).toHaveLength(0)
    expect(container.querySelectorAll('svg, img')).toHaveLength(0)
    expect(screen.queryAllByRole('region')).toHaveLength(0)
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(screen.queryAllByRole('status')).toHaveLength(0)
  })

  it('não rouba o foco: ao aparecer, o foco continua onde estava', () => {
    mostrar()
    const antes = document.activeElement
    act(() => {
      definirVersaoNova(() => {})
      definirEventoInstalar(eventoDeInstalar())
    })
    expect(document.activeElement).toBe(antes)
    expect(within(document.body).getByText(T01)).toBeTruthy()
  })
})

describe('só em /app e /app/*', () => {
  const comFaixa = ['/app', '/app/hoje', '/app/sessao', '/app/qualquer/coisa']
  const semFaixa = ['/', '/sistema', '/entrar', '/aplicativo', '/appx/hoje', '/outra/app/hoje']

  it.each(comFaixa)('em %s desenha a faixa', (caminho) => {
    mostrar(caminho)
    act(() => {
      definirVersaoNova(() => {})
      definirEventoInstalar(eventoDeInstalar())
    })
    expect(screen.getByText(T01)).toBeTruthy()
    expect(screen.getByText(T03)).toBeTruthy()
  })

  it.each(semFaixa)('em %s não desenha nada, nem com estado', (caminho) => {
    const { container } = mostrar(caminho)
    act(() => {
      definirVersaoNova(() => {})
      definirOutraAba(true)
      definirEventoInstalar(eventoDeInstalar())
    })
    expect(container.innerHTML).toBe('')
  })
})

// ---------------------------------------------------------------------------------------------
// Rodada de correção: o que o navegador mediu, como regra da classe. O jsdom não mede layout, então
// o que se confere aqui são as classes que dão a regra a todo parágrafo e a todo botão da faixa; a
// geometria vem do medidor do navegador (.oc/g3.mjs).

const TEMAS = ['claro', 'madrugada'] as const
const ESTADOS: Array<[string, () => void]> = [
  ['versão nova + instalar (T-01, T-03)', () => { definirVersaoNova(() => {}); definirEventoInstalar(eventoDeInstalar()) }],
  ['outra aba + instalar (T-06, T-03)', () => { definirOutraAba(true); definirEventoInstalar(eventoDeInstalar()) }],
]
const fichas = (el: Element) => el.className.split(/\s+/).filter(Boolean)

function mostrarEstado(preparar: () => void, tema: (typeof TEMAS)[number]) {
  if (tema === 'madrugada') document.documentElement.setAttribute('data-tema', 'madrugada')
  const resultado = mostrar('/app/hoje')
  act(preparar)
  return resultado
}

describe('regra: nenhuma linha de texto passa de 65 caracteres', () => {
  // O `ch` é a largura do zero: num texto proporcional cabem mais de 65 letras em 65ch. A largura máxima
  // vem em px, medida no pior caso (T-03 em 1440: cerca de 7,3 px por caractere, 59 por linha em 440 px).
  const LARGURA_MAXIMA = /^max-w-\[(\d+)px\]$/

  it.each(ESTADOS.flatMap(([nome, preparar]) => TEMAS.map((tema) => [nome, tema, preparar] as const)))(
    '%s, tema %s: todo <p> da faixa leva a mesma largura máxima, em px e de até 480',
    (_nome, tema, preparar) => {
      const { container } = mostrarEstado(preparar, tema)
      const paragrafos = [...container.querySelectorAll('[data-faixa-estado] p')]
      expect(paragrafos).toHaveLength(2)
      const larguras = paragrafos.map((p) => fichas(p).filter((f) => LARGURA_MAXIMA.test(f)))
      for (const l of larguras) expect(l).toHaveLength(1)
      expect(new Set(larguras.map((l) => l[0])).size).toBe(1)
      const px = Number(LARGURA_MAXIMA.exec(larguras[0][0])![1])
      expect(px).toBeGreaterThanOrEqual(360)
      expect(px).toBeLessThanOrEqual(480)
      for (const p of paragrafos) {
        expect(fichas(p).filter((f) => /max-w-\[\d+ch\]/.test(f))).toEqual([])
        expect(fichas(p).filter((f) => /overflow|clip|line-clamp|truncate|sr-only/.test(f))).toEqual([])
      }
    },
  )

  it('os três textos (T-01, T-03 e T-06) aparecem em parágrafos com essa classe', () => {
    for (const [, preparar] of ESTADOS) {
      const { container, unmount } = mostrarEstado(preparar, 'claro')
      expect([...container.querySelectorAll('[data-faixa-estado] p')].every((p) => fichas(p).some((f) => /^max-w-\[\d+px\]$/.test(f)))).toBe(true)
      unmount()
      definirVersaoNova(null)
      definirOutraAba(false)
      definirEventoInstalar(null)
    }
  })
})

describe('regra: todo botão da faixa quebra o rótulo e cresce em altura, sem altura fixa', () => {
  const DENTRO_DO_MIOLO = '[&_.sb-moldura-miolo]'

  it.each(ESTADOS.flatMap(([nome, preparar]) => TEMAS.map((tema) => [nome, tema, preparar] as const)))(
    '%s, tema %s: cada botão pode quebrar, não passa da faixa e só tem altura mínima',
    (_nome, tema, preparar) => {
      const { container } = mostrarEstado(preparar, tema)
      const botoes = [...container.querySelectorAll('[data-faixa-estado] button')]
      expect(botoes.map((b) => b.textContent)).toEqual([T02, T04, T05])

      for (const botao of botoes) {
        const classes = fichas(botao)
        const nome = botao.textContent
        // Nunca mais largo que a faixa.
        expect(classes, nome!).toContain('max-w-full')
        // Altura só mínima (a do alvo de toque); nenhuma classe de altura fixa ou máxima.
        expect(classes.filter((f) => /^(h|max-h)-/.test(f)), nome!).toEqual([])
        expect(classes.some((f) => f.startsWith('min-h-[')), nome!).toBe(true)
        // Sem ocultar nada: nenhuma classe de overflow, clip ou truncamento.
        expect(classes.filter((f) => /overflow|clip|line-clamp|truncate/.test(f)), nome!).toEqual([])
        // O rótulo quebra: o do botão de moldura vive no miolo (`white-space: nowrap` do sistema).
        if (botao.querySelector('.sb-moldura-miolo')) {
          expect(classes, nome!).toContain(`${DENTRO_DO_MIOLO}:whitespace-normal`)
        } else {
          expect(classes, nome!).toContain('whitespace-normal')
        }
      }
    },
  )

  it('o botão de moldura tem a mesma altura mínima do sistema (48 px, ou o alvo da madrugada)', () => {
    const { container } = mostrarEstado(ESTADOS[0][1], 'claro')
    for (const botao of container.querySelectorAll('[data-faixa-estado] .sb-moldura')) {
      expect(fichas(botao)).toContain('min-h-[max(48px,var(--alvo-toque))]')
    }
  })
})

describe('regra: a caixa do texto fica dentro do fundo do botão, com folga', () => {
  // A caixa do texto (a área de conteúdo da fonte) é mais alta que a entrelinha de 1 (`t-botao`): com a
  // fonte ampliada ela passava 1 px do topo do fundo. O miolo ganha recuo vertical mínimo, sem altura fixa.
  it.each(ESTADOS.flatMap(([nome, preparar]) => TEMAS.map((tema) => [nome, tema, preparar] as const)))(
    '%s, tema %s: todo botão de moldura da faixa tem recuo vertical no miolo',
    (_nome, tema, preparar) => {
      const { container } = mostrarEstado(preparar, tema)
      const molduras = [...container.querySelectorAll('[data-faixa-estado] .sb-moldura')]
      expect(molduras.map((b) => b.textContent)).toEqual([T02, T04])
      for (const botao of molduras) {
        const recuo = fichas(botao).filter((f) => /^\[&_\.sb-moldura-miolo\]:py-\[(\d+)px\]$/.test(f))
        expect(recuo, botao.textContent!).toHaveLength(1)
        const px = Number(/\[(\d+)px\]/.exec(recuo[0])![1])
        // Pelo menos 4 px, e até 6: com 6, o botão de 100% continua com os 48 px do sistema.
        expect(px).toBeGreaterThanOrEqual(4)
        expect(px).toBeLessThanOrEqual(6)
      }
    },
  )
})

describe('no site (Layout)', () => {
  it('a faixa fica entre o cabeçalho e a tela, e o resto do Layout continua igual', () => {
    const { container } = renderizarRota('/app/hoje')
    expect(container.querySelector('[data-faixa-estado]')).toBeNull() // sem estado, nenhum elemento

    act(() => definirVersaoNova(() => {}))
    const faixa = container.querySelector('[data-faixa-estado]')!
    expect(faixa).not.toBeNull()
    expect(faixa.previousElementSibling).toBe(container.querySelector('header'))
    expect(faixa.nextElementSibling).toBe(container.querySelector('main'))
  })

  it('no Início e em /sistema não aparece, mesmo com estado', () => {
    for (const caminho of ['/', '/sistema']) {
      const { container, unmount } = renderizarRota(caminho)
      act(() => definirVersaoNova(() => {}))
      expect(container.querySelector('[data-faixa-estado]'), caminho).toBeNull()
      unmount()
    }
  })
})
