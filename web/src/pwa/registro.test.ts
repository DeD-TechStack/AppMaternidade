import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MENSAGEM_ATIVAR } from '../../sw/mensagem.ts'
import { definirEventoInstalar, definirOutraAba, definirVersaoNova, obterEstadoPwa } from './estado.ts'
import { iniciarPwa } from './iniciar.ts'
import { registrarServiceWorker } from './registro.ts'

// O registro do service worker: só no build, só em contexto seguro, depois do `load`, sem barulho
// em caso de falha. E o que a página faz quando um service worker novo espera ou assume.

type Ouvinte = () => void

class Alvo {
  private readonly ouvintes = new Map<string, Set<Ouvinte>>()
  addEventListener(tipo: string, ouvinte: Ouvinte) {
    if (!this.ouvintes.has(tipo)) this.ouvintes.set(tipo, new Set())
    this.ouvintes.get(tipo)!.add(ouvinte)
  }
  removeEventListener(tipo: string, ouvinte: Ouvinte) {
    this.ouvintes.get(tipo)?.delete(ouvinte)
  }
  emitir(tipo: string) {
    for (const ouvinte of [...(this.ouvintes.get(tipo) ?? [])]) ouvinte()
  }
}

class Trabalhador extends Alvo {
  state = 'installing'
  postMessage = vi.fn()
}

class Registro extends Alvo {
  waiting: Trabalhador | null = null
  installing: Trabalhador | null = null
}

class Container extends Alvo {
  controller: Trabalhador | null = null
  registro = new Registro()
  register = vi.fn<(url: string, opcoes: { scope: string }) => Promise<ServiceWorkerRegistration>>(
    async () => this.registro as unknown as ServiceWorkerRegistration,
  )
}

let container: Container
const recarregar = vi.fn()

function simularNavegador({ seguro = true, comServiceWorker = true } = {}) {
  container = new Container()
  if (comServiceWorker) Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true })
  Object.defineProperty(window, 'isSecureContext', { value: seguro, configurable: true })
}

function documentoCarregando(carregando: boolean) {
  Object.defineProperty(document, 'readyState', { value: carregando ? 'loading' : 'complete', configurable: true })
}

const BUILD = { producao: true, subcaminho: '/AppMaternidade/' }

beforeEach(() => {
  definirVersaoNova(null)
  definirOutraAba(false)
  definirEventoInstalar(null)
  recarregar.mockClear()
  vi.stubGlobal('location', { reload: recarregar })
  documentoCarregando(false)
  simularNavegador()
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker')
  Reflect.deleteProperty(window, 'isSecureContext')
  Reflect.deleteProperty(document, 'readyState')
})

describe('quando registra', () => {
  it('no build, em contexto seguro: registra <subcaminho>sw.js com escopo <subcaminho>', async () => {
    await registrarServiceWorker(BUILD)
    expect(container.register).toHaveBeenCalledTimes(1)
    expect(container.register).toHaveBeenCalledWith('/AppMaternidade/sw.js', { scope: '/AppMaternidade/' })
  })

  it('na raiz, registra /sw.js com escopo /', async () => {
    await registrarServiceWorker({ producao: true, subcaminho: '/' })
    expect(container.register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })

  it('só depois do evento load', async () => {
    documentoCarregando(true)
    const pronto = registrarServiceWorker(BUILD)
    expect(container.register).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('load'))
    await pronto
    expect(container.register).toHaveBeenCalledTimes(1)
  })

  it('no dev (fora do build) não registra, nem depois do load', async () => {
    documentoCarregando(true)
    const pronto = registrarServiceWorker({ producao: false, subcaminho: '/' })
    window.dispatchEvent(new Event('load'))
    await pronto
    expect(container.register).not.toHaveBeenCalled()
  })

  it('em contexto inseguro não registra', async () => {
    simularNavegador({ seguro: false })
    await registrarServiceWorker(BUILD)
    expect(container.register).not.toHaveBeenCalled()
  })

  it('sem suporte a service worker não registra e não quebra', async () => {
    Reflect.deleteProperty(navigator, 'serviceWorker')
    await expect(registrarServiceWorker(BUILD)).resolves.toBeUndefined()
  })

  it('no Vitest (iniciarPwa) o service worker não é registrado: o ambiente de teste não é o build', async () => {
    iniciarPwa()
    window.dispatchEvent(new Event('load'))
    await Promise.resolve()
    expect(container.register).not.toHaveBeenCalled()
  })
})

describe('quando o registro falha', () => {
  it('a rejeição vira console.warn, sem erro e sem estado na faixa', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    container.register.mockRejectedValueOnce(new Error('SecurityError'))
    await expect(registrarServiceWorker(BUILD)).resolves.toBeUndefined()
    expect(aviso).toHaveBeenCalledTimes(1)
    expect(obterEstadoPwa()).toMatchObject({ versaoNova: null, outraAba: false })
  })

  it('um erro lançado na hora de registrar também vira console.warn', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    container.register.mockImplementationOnce(() => {
      throw new TypeError('script inválido')
    })
    await expect(registrarServiceWorker(BUILD)).resolves.toBeUndefined()
    expect(aviso).toHaveBeenCalledTimes(1)
  })
})

describe('versão nova (RF-07)', () => {
  it('um service worker novo esperando, com outro já controlando a página, oferece a versão nova', async () => {
    container.controller = new Trabalhador()
    container.registro.waiting = new Trabalhador()
    await registrarServiceWorker(BUILD)
    expect(obterEstadoPwa().versaoNova).not.toBeNull()
  })

  it('a primeira instalação (sem service worker anterior) não mostra nada', async () => {
    container.registro.waiting = new Trabalhador()
    await registrarServiceWorker(BUILD)
    expect(obterEstadoPwa().versaoNova).toBeNull()

    const novo = new Trabalhador()
    container.registro.installing = novo
    container.registro.emitir('updatefound')
    novo.state = 'installed'
    novo.emitir('statechange')
    expect(obterEstadoPwa().versaoNova).toBeNull()

    // O service worker novo assume a página (clients.claim): ainda não há o que mostrar.
    container.controller = novo
    container.emitir('controllerchange')
    expect(obterEstadoPwa()).toMatchObject({ versaoNova: null, outraAba: false })
    expect(recarregar).not.toHaveBeenCalled()
  })

  it('uma atualização que termina de instalar depois do registro também oferece a versão nova', async () => {
    container.controller = new Trabalhador()
    await registrarServiceWorker(BUILD)
    expect(obterEstadoPwa().versaoNova).toBeNull()

    const novo = new Trabalhador()
    container.registro.installing = novo
    container.registro.emitir('updatefound')
    expect(obterEstadoPwa().versaoNova).toBeNull() // ainda instalando
    novo.state = 'installed'
    novo.emitir('statechange')
    expect(obterEstadoPwa().versaoNova).not.toBeNull()
  })

  it('ativar manda { tipo: "ativar" } ao que espera e só recarrega quando o controle muda, uma vez', async () => {
    container.controller = new Trabalhador()
    const esperando = new Trabalhador()
    container.registro.waiting = esperando
    await registrarServiceWorker(BUILD)

    obterEstadoPwa().versaoNova!.ativar()
    expect(esperando.postMessage).toHaveBeenCalledWith(MENSAGEM_ATIVAR)
    expect(recarregar).not.toHaveBeenCalled() // o site nunca recarrega sozinho

    container.emitir('controllerchange')
    container.emitir('controllerchange')
    expect(recarregar).toHaveBeenCalledTimes(1)
    expect(obterEstadoPwa().outraAba).toBe(false)
  })

  it('o controle que muda sem esta aba ter pedido é "outra aba": avisa, não recarrega, e some a versão nova', async () => {
    container.controller = new Trabalhador()
    container.registro.waiting = new Trabalhador()
    await registrarServiceWorker(BUILD)
    expect(obterEstadoPwa().versaoNova).not.toBeNull()

    container.emitir('controllerchange')
    expect(obterEstadoPwa()).toMatchObject({ outraAba: true, versaoNova: null })
    expect(recarregar).not.toHaveBeenCalled()
  })
})
