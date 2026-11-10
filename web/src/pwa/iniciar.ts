import { acompanharCorDaBarra } from './corDaBarra.ts'
import { iniciarInstalacao } from './instalar.ts'
import { registrarServiceWorker } from './registro.ts'

/** Liga o PWA: o registro do service worker (só no build), a oferta de instalar e a cor da barra. */
export function iniciarPwa() {
  void registrarServiceWorker({ producao: import.meta.env.PROD, subcaminho: import.meta.env.BASE_URL })
  iniciarInstalacao()
  acompanharCorDaBarra()
}
