import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FaixaEstado } from '../componentes/offline/FaixaEstado.tsx'
import { T03, T04, T05 } from '../conteudo/offline.ts'
import { definirEventoInstalar, definirOutraAba, definirVersaoNova, obterEstadoPwa, type EventoInstalar } from './estado.ts'
import { iniciarInstalacao } from './instalar.ts'

// RF-08: a oferta de instalar. O evento é simulado; a recusa fica no localStorage.

const CHAVE = 'appmaternidade.instalar.recusada'

/** Um `beforeinstallprompt` como o Chrome o entrega: cancelável, com `prompt()` e `userChoice`. */
function criarEvento(): EventoInstalar & { prompt: ReturnType<typeof vi.fn<() => Promise<void>>> } {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn<() => Promise<void>>(async () => {}),
    userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
  })
}

function emitir(evento: Event) {
  act(() => {
    window.dispatchEvent(evento)
  })
}

function mostrarFaixa(caminho = '/app/hoje') {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <FaixaEstado />
    </MemoryRouter>,
  )
}

function simularMidia(standalone: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: consulta.includes('display-mode: standalone') ? standalone : false,
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

let parar: () => void

beforeEach(() => {
  localStorage.clear()
  definirVersaoNova(null)
  definirOutraAba(false)
  definirEventoInstalar(null)
  parar = iniciarInstalacao()
})

afterEach(() => {
  parar()
  localStorage.clear()
})

describe('a oferta de instalar', () => {
  it('o beforeinstallprompt tem o comportamento padrão cancelado e o evento fica guardado', () => {
    const evento = criarEvento()
    emitir(evento)
    expect(evento.defaultPrevented).toBe(true)
    expect(obterEstadoPwa().eventoInstalar).toBe(evento)
  })

  it('numa tela logada a faixa mostra T-03 com T-04 e T-05', () => {
    mostrarFaixa('/app/hoje')
    expect(screen.queryByText(T03)).toBeNull()
    emitir(criarEvento())
    expect(screen.getByText(T03)).toBeTruthy()
    expect(screen.getByRole('button', { name: T04 })).toBeTruthy()
    expect(screen.getByRole('button', { name: T05 })).toBeTruthy()
  })

  it('T-04 chama o prompt() do evento e tira a oferta (o evento só vale uma vez)', async () => {
    const evento = criarEvento()
    mostrarFaixa()
    emitir(evento)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: T04 }))
    })
    expect(evento.prompt).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(T03)).toBeNull()
    expect(localStorage.getItem(CHAVE)).toBeNull() // instalar não é recusar
  })

  it('o appinstalled limpa o evento guardado', () => {
    mostrarFaixa()
    emitir(criarEvento())
    expect(screen.getByText(T03)).toBeTruthy()
    emitir(new Event('appinstalled'))
    expect(obterEstadoPwa().eventoInstalar).toBeNull()
    expect(screen.queryByText(T03)).toBeNull()
  })

  it('sem o evento (Safari) não há oferta', () => {
    mostrarFaixa()
    expect(screen.queryByText(T03)).toBeNull()
    expect(screen.queryByRole('button', { name: T04 })).toBeNull()
  })

  it('já instalado (display-mode: standalone) a oferta não aparece, mesmo com o evento', () => {
    simularMidia(true)
    mostrarFaixa()
    emitir(criarEvento())
    expect(screen.queryByText(T03)).toBeNull()

    // E se o evento for guardado por outro caminho, a faixa também esconde.
    act(() => definirEventoInstalar(criarEvento()))
    expect(screen.queryByText(T03)).toBeNull()
  })

  it('fora do modo app (standalone falso) a oferta aparece', () => {
    simularMidia(false)
    mostrarFaixa()
    emitir(criarEvento())
    expect(screen.getByText(T03)).toBeTruthy()
  })
})

describe('a recusa (T-05)', () => {
  it('esconde a oferta e guarda "1" no localStorage', () => {
    mostrarFaixa()
    emitir(criarEvento())
    fireEvent.click(screen.getByRole('button', { name: T05 }))
    expect(screen.queryByText(T03)).toBeNull()
    expect(localStorage.getItem(CHAVE)).toBe('1')
  })

  it('sobrevive a recarregar: o evento que chega de novo não vira oferta', () => {
    mostrarFaixa()
    emitir(criarEvento())
    fireEvent.click(screen.getByRole('button', { name: T05 }))

    // "Recarregar": a página nova começa sem estado e liga as mesmas escutas.
    parar()
    definirEventoInstalar(null)
    parar = iniciarInstalacao()

    const evento = criarEvento()
    emitir(evento)
    expect(evento.defaultPrevented).toBe(true)
    expect(obterEstadoPwa().eventoInstalar).toBeNull()
    expect(screen.queryByText(T03)).toBeNull()
  })

  it.each(['0', '', 'true', 'sim', '1 ', '{"recusada":true}', '[1]', 'null'])(
    'a recusa guardada com o valor %j (diferente de "1") conta como sem recusa',
    (valor) => {
      localStorage.setItem(CHAVE, valor)
      mostrarFaixa()
      emitir(criarEvento())
      expect(screen.getByText(T03)).toBeTruthy()
    },
  )

  it('só o valor "1" recusa', () => {
    localStorage.setItem(CHAVE, '1')
    mostrarFaixa()
    emitir(criarEvento())
    expect(screen.queryByText(T03)).toBeNull()
  })
})

describe('o localStorage que lança erro', () => {
  function quebrarArmazenamento() {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cota cheia', 'QuotaExceededError')
    })
    return aviso
  }

  it('ao gravar a recusa: ela vale só na página, e o erro vai para console.warn', () => {
    const aviso = quebrarArmazenamento()
    mostrarFaixa()
    emitir(criarEvento())
    fireEvent.click(screen.getByRole('button', { name: T05 }))
    expect(screen.queryByText(T03)).toBeNull()
    expect(aviso).toHaveBeenCalled()

    // Na mesma página, um evento novo continua sem virar oferta.
    emitir(criarEvento())
    expect(screen.queryByText(T03)).toBeNull()
  })

  it('ao ler: sem erro para a pessoa, o erro vai para console.warn e a oferta aparece', () => {
    const aviso = quebrarArmazenamento()
    mostrarFaixa()
    emitir(criarEvento())
    expect(screen.getByText(T03)).toBeTruthy()
    expect(aviso).toHaveBeenCalled()
  })

  it('a recusa que só vale na página some ao recarregar', () => {
    quebrarArmazenamento()
    mostrarFaixa()
    emitir(criarEvento())
    fireEvent.click(screen.getByRole('button', { name: T05 }))
    expect(screen.queryByText(T03)).toBeNull()

    // "Recarregar": a página nova começa sem a memória da anterior, e o localStorage não guardou nada.
    parar()
    definirEventoInstalar(null)
    parar = iniciarInstalacao()
    emitir(criarEvento())
    expect(screen.getByText(T03)).toBeTruthy()
  })

  it('uma página nova, com módulos novos, também começa sem a recusa que só valia na página', async () => {
    quebrarArmazenamento()
    mostrarFaixa()
    emitir(criarEvento())
    fireEvent.click(screen.getByRole('button', { name: T05 }))
    parar()

    vi.resetModules()
    const novoEstado = await import('./estado.ts')
    const novaInstalacao = await import('./instalar.ts')
    const pararNovo = novaInstalacao.iniciarInstalacao()
    emitir(criarEvento())
    expect(novoEstado.obterEstadoPwa().eventoInstalar).not.toBeNull()
    pararNovo()
  })
})
