// Textos do Início e os avisos comuns. O Início completo é o cartão MAT-49c; aqui fica só a abertura.

// A promessa do Início (já revisada): a primeira linha reta e a segunda, inteira, em itálico.
export const PROMESSA = 'Quem chega no turno já sabe o que houve.'
const [PROMESSA_1, PROMESSA_2] = ['Quem chega no turno', 'já sabe o que houve.']

export const INICIO = {
  titulo: [PROMESSA_1, PROMESSA_2],
  lide: 'Mamadas, sonecas e fraldas em dois toques, e a rotina do bebê dividida por quem cuida.',
  primario: { rotulo: 'Ver como funciona', destino: '/como-funciona' },
  secundario: { rotulo: 'Abrir o protótipo', destino: '/app/hoje' },
} as const

// Os 3 números do produto: cada um é um fato, numa linha.
export const FATOS = [
  { valor: '7', legenda: 'tipos de registro' },
  { valor: '2', legenda: 'toques' },
  { valor: '0', legenda: 'metas ou comparações' },
] as const

// A atividade sugerida do Tummy time, na tela Sessão.
export const ATIVIDADE_TUMMY = 'Espelho no chão'

// O aviso do site quando ele não tem as variáveis do banco: nada é salvo. Fica numa linha do rodapé.
export const AVISO_DEMONSTRACAO =
  'Demonstração sem banco: nada do que você registra aqui é salvo. Ao recarregar a página, tudo volta ao começo.'
