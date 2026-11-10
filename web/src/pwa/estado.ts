// O estado do PWA que a faixa mostra: uma versão nova esperando, o site atualizado em outra aba e o
// evento que oferece instalar. Um repositório pequeno, lido com `useSyncExternalStore`. As
// ferramentas de captura importam este módulo no navegador: os nomes não mudam.

/** O `beforeinstallprompt` do Chrome e do Edge: o evento que abre o pedido de instalação. */
export interface EventoInstalar extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface EstadoPwa {
  /** Há um service worker novo esperando: `ativar` pede a ele que assuma. */
  versaoNova: { ativar: () => void } | null
  /** O site foi atualizado em outra aba; esta ainda roda a versão antiga. */
  outraAba: boolean
  /** O evento guardado para a oferta de instalar; sem ele (Safari), não há oferta. */
  eventoInstalar: EventoInstalar | null
}

let estado: EstadoPwa = { versaoNova: null, outraAba: false, eventoInstalar: null }
const ouvintes = new Set<() => void>()

function trocar(novo: Partial<EstadoPwa>) {
  estado = { ...estado, ...novo }
  for (const ouvinte of [...ouvintes]) ouvinte()
}

/** O estado de agora. O objeto só muda quando o estado muda. */
export function obterEstadoPwa(): EstadoPwa {
  return estado
}

/** Avisa `ouvinte` a cada mudança; devolve a função que para de avisar. */
export function assinarEstadoPwa(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

/** Com uma função, há uma versão nova esperando; com `null`, não há. */
export function definirVersaoNova(ativar: (() => void) | null) {
  trocar({ versaoNova: ativar ? { ativar } : null })
}

export function definirOutraAba(valor: boolean) {
  if (estado.outraAba !== valor) trocar({ outraAba: valor })
}

export function definirEventoInstalar(evento: EventoInstalar | null) {
  if (estado.eventoInstalar !== evento) trocar({ eventoInstalar: evento })
}
