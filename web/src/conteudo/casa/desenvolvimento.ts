// Desenvolvimento (/desenvolvimento): as frases que o deck COPY_desenvolvimento escreveu (16), cada uma com o id do
// deck no comentário da mesma linha. Os 91 textos de saúde NÃO moram aqui: vêm, só de leitura, de
// `conteudo/desenvolvimento/*.ts`. As imagens são as três vagas fechadas do spec (cenas do ASSET-2).
import type { Imagem } from '../../componentes/secoes/contrato.ts'

export const DESENVOLVIMENTO_CASA = {
  aba: 'Desenvolvimento | AppMaternidade', // de.aba
  h1: 'Ela já devia rolar?', // de.h1
  lede: 'Cada bebê tem o seu ritmo. Aqui tem ideias para brincar em cada fase e o que as fontes dizem sobre tummy time.', // de.lede
  cta1: 'Ver ideias para cada fase', // de.cta1
  cta2: 'Ler sobre tummy time', // de.cta2
  legenda1: '15:00, tummy time, anotado por Ju', // de.leg1
  altCena1:
    'A cena é vista da altura do chão. Heloísa, acordada, de bruços num tapete firme, ergue a cabeça e olha para a frente. Juliana, de óculos, está deitada ao lado, na altura dos olhos dela, olhando para a bebê.', // de.alt.cena1
  h2Registro: 'No site, é só um registro.', // de.h2.registro
  pRegistro:
    'Tummy time entra na rotina como entra uma mamada: com a hora, a duração e o nome de quem anotou. O site não põe meta de minutos e não compara a Helo com nenhum outro bebê.', // de.p.registro
  altTela1: 'Tela do Histórico do site num celular. Na lista do dia, o tummy time das 15:00, de 8 minutos, está anotado por Juliana.', // de.alt.tela1
  h2Ideias: 'Ideias para brincar em cada fase.', // de.h2.ideias
  altCena2: 'Heloísa, acordada e sorrindo, no colo de Juliana.', // de.alt.cena2
  h2Tummy: 'Tummy time, segundo as fontes.', // de.h2.tummy
  h2Marcos: 'Marcos, sem cobrança.', // de.h2.marcos
  h2Urgencia: 'Em urgência de saúde, ligue 192.', // de.h2.urgencia
  fontesRotulo: 'Fontes', // de.fontes.rotulo
} as const

/** Os destinos dos dois links da abertura (âncoras da própria página). */
export const DESTINOS_DESENVOLVIMENTO = { ideias: '#ideias', tummy: '#tummy-time' } as const

// DE-S1: a cena M04 da abertura. 1440: a placa inteira (box 1100 × 619); abaixo de 768: o recorte 390 × 238.
export const CENA_ABERTURA: Imagem = {
  src: '/cenas/desenvolvimento/m04-heroi-1100w.webp',
  srcSet: '/cenas/desenvolvimento/m04-heroi-1100w.webp 1100w, /cenas/desenvolvimento/m04-heroi-1672w.webp 1672w',
  sizes: '(min-width: 1100px) min(1100px, 76.39vw), 100vw',
  largura: 1672,
  altura: 941,
}

export const CENA_ABERTURA_RECORTE: Imagem = {
  src: '/cenas/desenvolvimento/m04-heroi-390c-390w.webp',
  srcSet: '/cenas/desenvolvimento/m04-heroi-390c-390w.webp 390w, /cenas/desenvolvimento/m04-heroi-390c-780w.webp 780w',
  sizes: '100vw',
  largura: 780,
  altura: 476,
}

// DE-S2: a captura do Histórico (15:00, tummy time) sob a moldura do dia.
export const TELA_HISTORICO: Imagem = {
  src: '/telas/t1i/historico-y15-280w.webp',
  srcSet:
    '/telas/t1i/historico-y15-280w.webp 280w, /telas/t1i/historico-y15-320w.webp 320w, /telas/t1i/historico-y15-560w.webp 560w, /telas/t1i/historico-y15-640w.webp 640w',
  sizes: '(min-width: 1440px) 320px, 280px',
  largura: 640,
  altura: 1385,
}

export const MOLDURA_DIA: Imagem = {
  src: '/molduras/moldura-dia.png',
  largura: 721,
  altura: 1426,
}

// DE-S3: a família (M12) em pé na borda de baixo da faixa das ideias. Caixa 390 × 421 (350 × 378 em 390).
export const CENA_FAMILIA: Imagem = {
  src: '/cenas/desenvolvimento/m12-familia-390w.webp',
  srcSet: '/cenas/desenvolvimento/m12-familia-390w.webp 390w, /cenas/desenvolvimento/m12-familia-585w.webp 585w',
  sizes: '(min-width: 960px) 390px, 350px',
  largura: 585,
  altura: 632,
}
