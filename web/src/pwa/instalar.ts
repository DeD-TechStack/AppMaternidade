// RF-08: a oferta de instalar o site como app. O site guarda o `beforeinstallprompt` (sem deixar o
// navegador mostrar o convite dele) e a faixa de estado oferece a instalação numa tela logada. A recusa
// fica neste aparelho, no localStorage.

import { definirEventoInstalar, type EventoInstalar } from './estado.ts'

const CHAVE_DA_RECUSA = 'appmaternidade.instalar.recusada'

// Quando o localStorage não deixa gravar (modo privado, cota, bloqueio), a recusa vale só até
// recarregar: fica aqui, na memória da página, e a próxima inicialização a zera.
let recusadaNestaPagina = false

function avisar(descricao: string, erro: unknown) {
  console.warn(`AppMaternidade: ${descricao}`, erro)
}

function recusaGuardada(): boolean {
  if (recusadaNestaPagina) return true
  try {
    return localStorage.getItem(CHAVE_DA_RECUSA) === '1'
  } catch (erro) {
    avisar('não foi possível ler a recusa de instalar', erro)
    return false
  }
}

/** Já instalado: o site abriu como app (`display-mode: standalone`). */
export function executandoComoApp(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
}

/** T-05: esconde a oferta para sempre neste aparelho. */
export function recusarInstalacao() {
  try {
    localStorage.setItem(CHAVE_DA_RECUSA, '1')
  } catch (erro) {
    recusadaNestaPagina = true
    avisar('não foi possível guardar a recusa de instalar; ela vale só até recarregar', erro)
  }
  definirEventoInstalar(null)
}

/** T-04: abre o pedido de instalação do navegador. O evento só serve uma vez: a oferta sai de cena. */
export async function instalarNoAparelho(evento: EventoInstalar) {
  definirEventoInstalar(null)
  try {
    await evento.prompt()
  } catch (erro) {
    avisar('o pedido de instalação falhou', erro)
  }
}

/** Liga o `beforeinstallprompt` e o `appinstalled`. Devolve a função que os desliga. */
export function iniciarInstalacao(): () => void {
  recusadaNestaPagina = false
  function aoReceberOEvento(evento: Event) {
    evento.preventDefault()
    if (executandoComoApp() || recusaGuardada()) return
    definirEventoInstalar(evento as EventoInstalar)
  }
  function aoInstalar() {
    definirEventoInstalar(null)
  }

  window.addEventListener('beforeinstallprompt', aoReceberOEvento)
  window.addEventListener('appinstalled', aoInstalar)
  return () => {
    window.removeEventListener('beforeinstallprompt', aoReceberOEvento)
    window.removeEventListener('appinstalled', aoInstalar)
  }
}
