// As capturas das nossas telas (web/public/telas/), com o tamanho real de cada arquivo. Os
// aparelhos e os recortes do Início leem daqui: nenhum nome de arquivo nem número de largura e
// altura fica solto num componente.

interface Captura {
  arquivo: string
  largura: number
  altura: number
}

export const CAPTURAS = {
  'hoje-claro-1440': { arquivo: 'hoje-claro-1440.png', largura: 1440, altura: 900 },
  'hoje-claro-390': { arquivo: 'hoje-claro-390.png', largura: 390, altura: 844 },
  'hoje-madrugada-1440': { arquivo: 'hoje-madrugada-1440.png', largura: 1440, altura: 900 },
  'hoje-madrugada-390': { arquivo: 'hoje-madrugada-390.png', largura: 390, altura: 844 },
  'sessao-claro-1440': { arquivo: 'sessao-claro-1440.png', largura: 1440, altura: 900 },
  'sessao-claro-390': { arquivo: 'sessao-claro-390.png', largura: 390, altura: 844 },
  'sessao-madrugada-1440': { arquivo: 'sessao-madrugada-1440.png', largura: 1440, altura: 900 },
  'sessao-madrugada-390': { arquivo: 'sessao-madrugada-390.png', largura: 390, altura: 844 },
} as const satisfies Record<string, Captura>

export type ChaveCaptura = keyof typeof CAPTURAS

/** O endereço da captura, sob a base do Vite (o site pode estar numa subpasta). */
export function urlDaCaptura(chave: ChaveCaptura): string {
  return `${import.meta.env.BASE_URL}telas/${CAPTURAS[chave].arquivo}`
}
