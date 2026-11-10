// O service worker do site. O passo de build o empacota num script só (dist/sw.js) e troca
// `__CONFIG_SW__` pela casca e pela versão daquele build. Sem notificação e sem push: só a casca.

import { ativarVersao, instalarCasca } from './ciclo.ts'
import { nomeDoCache, type ConfigSw } from './config.ts'
import { classificar, responder, type ContextoSw, type PedidoSw } from './estrategia.ts'
import { ehMensagemAtivar } from './mensagem.ts'

declare const __CONFIG_SW__: ConfigSw

const escopo = self as unknown as ServiceWorkerGlobalScope
const config = __CONFIG_SW__
const nomeAtual = nomeDoCache(config)
const contexto: ContextoSw = {
  origem: escopo.location.origin,
  subcaminho: config.subcaminho,
  casca: config.casca,
  paginaInicial: config.paginaInicial,
}

// Se qualquer arquivo falhar, a instalação falha e o service worker antigo continua. Sem
// `skipWaiting` aqui: quem manda é a página, pela mensagem.
escopo.addEventListener('install', (evento) => {
  evento.waitUntil(instalarCasca(config, (caminho) => fetch(caminho, { cache: 'reload' }), caches))
})

escopo.addEventListener('message', (evento) => {
  if (ehMensagemAtivar(evento.data)) void escopo.skipWaiting()
})

escopo.addEventListener('activate', (evento) => {
  evento.waitUntil(ativarVersao(config, caches).then(() => escopo.clients.claim()))
})

escopo.addEventListener('fetch', (evento) => {
  const pedido: PedidoSw = { url: evento.request.url, metodo: evento.request.method, modo: evento.request.mode }
  if (classificar(pedido, contexto) === 'direto') return

  evento.respondWith(
    responder(pedido, contexto, {
      buscarNaRede: () => fetch(evento.request),
      buscarNoCache: async (caminho) => (await caches.open(nomeAtual)).match(caminho),
    }).then((resposta) => resposta ?? fetch(evento.request)),
  )
})
