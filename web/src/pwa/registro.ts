// O registro do service worker e o que a página faz quando um service worker novo espera ou assume
// (RF-07). O site nunca recarrega sozinho: quem pede a atualização é a pessoa, pelo botão da faixa.

import { MENSAGEM_ATIVAR } from '../../sw/mensagem.ts'
import { definirOutraAba, definirVersaoNova } from './estado.ts'
import { recarregarAba } from './recarregar.ts'

interface Opcoes {
  /** Só o build registra: o dev e o Vitest não. */
  producao: boolean
  /** O subcaminho do site (`import.meta.env.BASE_URL`), com / dos dois lados. */
  subcaminho: string
}

interface Pedido {
  /** Esta aba mandou o service worker que espera assumir. */
  ativando: boolean
  recarregou: boolean
}

function podeRegistrar(): boolean {
  return window.isSecureContext === true && 'serviceWorker' in navigator
}

function avisar(erro: unknown) {
  console.warn('AppMaternidade: o service worker não foi registrado; o site segue sem o modo offline.', erro)
}

// A mudança de controle: se esta aba pediu, ela recarrega (uma vez); senão, foi outra aba que pediu,
// e esta só avisa. A primeira instalação (sem service worker antes) também muda o controle e não
// mostra nada.
function acompanharControle(container: ServiceWorkerContainer, pedido: Pedido) {
  let controlada = container.controller !== null
  container.addEventListener('controllerchange', () => {
    if (pedido.ativando) {
      if (!pedido.recarregou) {
        pedido.recarregou = true
        recarregarAba()
      }
      return
    }
    if (!controlada) {
      controlada = true
      return
    }
    definirVersaoNova(null)
    definirOutraAba(true)
  })
}

// Um service worker novo instalado e esperando, com outro já controlando a página: oferece a versão
// nova. Sem controlador (primeira instalação), não há o que oferecer.
function acompanharEspera(container: ServiceWorkerContainer, registro: ServiceWorkerRegistration, pedido: Pedido) {
  const oferecer = (trabalhador: ServiceWorker) =>
    definirVersaoNova(() => {
      pedido.ativando = true
      trabalhador.postMessage(MENSAGEM_ATIVAR)
    })

  if (registro.waiting && container.controller) oferecer(registro.waiting)
  registro.addEventListener('updatefound', () => {
    const novo = registro.installing
    novo?.addEventListener('statechange', () => {
      if (novo.state === 'installed' && container.controller) oferecer(novo)
    })
  })
}

/**
 * Registra `<subcaminho>sw.js` com escopo `<subcaminho>`, depois do `load`, só no build e só em
 * contexto seguro. Falha no registro vai para `console.warn`. Resolve quando a tentativa termina.
 */
export function registrarServiceWorker({ producao, subcaminho }: Opcoes): Promise<void> {
  if (!producao || !podeRegistrar()) return Promise.resolve()

  const container = navigator.serviceWorker
  const pedido: Pedido = { ativando: false, recarregou: false }
  acompanharControle(container, pedido)

  return new Promise((resolver) => {
    const registrar = () => {
      let tentativa: Promise<ServiceWorkerRegistration>
      try {
        tentativa = container.register(`${subcaminho}sw.js`, { scope: subcaminho })
      } catch (erro) {
        tentativa = Promise.reject(erro)
      }
      tentativa
        .then((registro) => acompanharEspera(container, registro, pedido))
        .catch(avisar)
        .finally(resolver)
    }

    if (document.readyState === 'complete') registrar()
    else window.addEventListener('load', registrar, { once: true })
  })
}
