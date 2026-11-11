// A proporção de cada moldura larga do Início (rodada visual 1, R2). As 5 molduras largas deixam de ter
// a mesma altura: cada uma leva a sua, escrita como largura / altura em px de referência (1376 de largura
// em 1440 e 358 em 390). É proporção, não altura fixa: entre 391 e 1439 px a moldura escala com a largura.
// Os valores moram aqui; `Inicio.tsx` os passa à moldura (`<Midia proporcao>`).

interface Proporcao {
  /** Do 768 para cima: `largura / altura`, medida com 1376 de largura (1440). */
  larga: string
  /** Abaixo de 768: `largura / altura`, medida com 358 de largura (390). */
  estreita: string
}

export const PROPORCOES = {
  /** I-2, o notebook da abertura: 984 em 1440, 256 em 390. */
  notebook: { larga: '1376 / 984', estreita: '358 / 256' },
  /** I-5, os três celulares: 1056 em 1440, 275 em 390. */
  celulares: { larga: '1376 / 1056', estreita: '358 / 275' },
  /** I-7a, a Sessão (galeria): 893 em 1440, 245 em 390. */
  sessao: { larga: '1376 / 893', estreita: '358 / 245' },
  /** I-7b, a madrugada (galeria): 942 em 1440, 239 em 390. */
  madrugada: { larga: '1376 / 942', estreita: '358 / 239' },
  /** I-7e, o mosaico (galeria): 893 em 1440, 245 em 390. */
  mosaico: { larga: '1376 / 893', estreita: '358 / 245' },
} as const satisfies Record<string, Proporcao>
