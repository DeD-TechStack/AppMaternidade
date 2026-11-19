import { imagemPublica } from '../../componentes/campo/urlPublica.ts'
import { placa } from '../../componentes/campo/imagens.ts'
import type { Imagem } from '../../componentes/secoes/contrato.ts'
import m01Heroi from '../../assets/cenas/como-funciona/m01-heroi-1672w.webp?w=977;1672&format=avif;webp&as=picture'
import m01Heroi390 from '../../assets/cenas/como-funciona/m01-heroi-390c-780w.webp?w=390;780&format=avif;webp&as=picture'
import m04Tummy from '../../assets/cenas/como-funciona/m04-1040w.webp?w=350;520;700;1040&format=avif;webp&as=picture'
import m06Colo from '../../assets/cenas/como-funciona/m06-600w.webp?w=300;600&format=avif;webp&as=picture'

// /como-funciona na casa acesa: as 25 frases do deck COPY_como-funciona (copy/COPY_como-funciona.md, sha256 84e6bf6d…).
// `cf.aba` (o título da aba) fica em NOMES_DE_PAGINA. Cada frase numa linha, com o id do deck ao lado.
export const COMO_FUNCIONA = {
  h1: 'Deixa que eu anoto.', // cf.h1
  lede: 'Um dia da Helo, da mamada das 03:00 ao sono das 20:30, do jeito que ficou anotado no site.', // cf.lede
  cta1: 'Criar conta', // cf.cta1
  leg1: '03:00, mamada, anotada por Ícaro', // cf.leg1
  altCena1:
    'Juliana, de óculos, sentada, amamenta Heloísa à luz de uma luminária. Ícaro, acordado, está sentado no chão com o celular na mão. O berço ao lado está vazio.', // cf.alt.cena1
  h2Hist: 'Olha no histórico.', // cf.h2.hist
  pHist:
    'Cada registro vira uma linha com a hora, o tipo e o nome de quem anotou. O tummy time das 15:00 durou 8 minutos e está lá, entre o sono da tarde e a mamada das 16:00.', // cf.p.hist
  leg2: '15:00, tummy time, anotado por Ju', // cf.leg2
  altCena2:
    'Heloísa de bruços num tapete firme, de cabeça erguida, olhando para a frente. Juliana está ao lado, na altura dos olhos dela, de olho na bebê.', // cf.alt.cena2
  altTela1:
    'Tela do Histórico do site num celular. Na lista do dia, o tummy time das 15:00 e a mamada das 16:00 estão anotados por Juliana.', // cf.alt.tela1
  h2Depois: 'Anoto depois.', // cf.h2.depois
  pDepois:
    'Com ela chorando no colo, ninguém pega o celular. O registro pode ser feito mais tarde, com a hora em que a coisa aconteceu.', // cf.p.depois
  leg3: '18:00, sono, anotado por Ícaro', // cf.leg3
  altCena3:
    'Ícaro, em pé, embala Heloísa, que chora encostada no peito dele. É noite, e os dois estão dentro da luz de uma luminária de chão.', // cf.alt.cena3
  h2Nota: 'Pomada só à noite.', // cf.h2.nota
  pNota:
    'A Ju escreveu isso numa nota e deixou em destaque. A do Ícaro diz: “Fraldas P no armário de cima.” Nota é para o recado que não é registro.', // cf.p.nota
  altTela2:
    'Tela Notas do site num celular, com duas notas: “Pomada só à noite.”, de Juliana, em destaque, e “Fraldas P no armário de cima.”, de Ícaro.', // cf.alt.tela2
  h2Comecar: 'Para começar, só o navegador.', // cf.h2.comecar
  passo1: 'Crie a conta com um nome, um e-mail e uma senha. O site abre no navegador, sem instalar nada.', // cf.passo1
  passo2: 'Crie a família do bebê ou entre numa que já existe, com um convite.', // cf.passo2
  passo3: 'Cadastre o bebê. O site pede só o nome ou apelido e a data de nascimento.', // cf.passo3
  aviso: 'O AppMaternidade não faz diagnóstico e não substitui a orientação de um profissional de saúde.', // cf.aviso
  h2Fecho: 'E amanhã tem tudo de novo.', // cf.h2.fecho
  cta2: 'Criar conta', // cf.cta2
} as const

/** Os passos do `<ol>` da faixa 5, na ordem do deck. */
export const PASSOS = [COMO_FUNCIONA.passo1, COMO_FUNCIONA.passo2, COMO_FUNCIONA.passo3] as const

/** O destino das duas ações (hero e fecho). */
export const DESTINO_CRIAR_CONTA = '/criar-conta'

// As imagens (ASSET-2 serve os arquivos; `largura`/`altura` são as do maior arquivo servido de cada slot).

/** CF-S1 (1440): a placa M01 inteira, 977 e 1672 de largura. */
export const CENA_HEROI: Imagem = placa(m01Heroi, '(min-width: 1440px) 977px, 68vw', 977)

/** CF-S1 (390): o recorte das figuras, 390 e 780 de largura. */
export const CENA_HEROI_390: Imagem = placa(m01Heroi390, '100vw', 390)

/** CF-S3: a cena das 15:00 (M04, 0 30 1200 900), 350 a 1040 de largura. */
export const CENA_TUMMY: Imagem = placa(m04Tummy, '(min-width: 768px) 520px, 350px', 520)

/** CF-S4: a noite (M06 inteira), 300 e 600 de largura. */
export const CENA_COLO: Imagem = placa(m06Colo, '300px', 300)

/** CF-S2: a captura do Histórico (estado Y15), o celular principal: a camada de tela de até 330 numa coluna (a largura
 * do quadro em 390) e de até 390 (a 1:1 da captura) em duas colunas. */
export const TELA_HISTORICO: Imagem = imagemPublica({
  src: '/telas/t1i/historico-y15-320w.webp',
  srcSet: [
    '/telas/t1i/historico-y15-280w.webp 280w',
    '/telas/t1i/historico-y15-320w.webp 320w',
    '/telas/t1i/historico-y15-560w.webp 560w',
    '/telas/t1i/historico-y15-640w.webp 640w',
  ].join(', '),
  sizes: '(min-width: 1024px) 390px, (min-width: 768px) 320px, 330px',
  largura: 640,
  altura: 1385,
})

/** CF-S5: a captura das Notas, mesmos tamanhos. */
export const TELA_NOTAS: Imagem = imagemPublica({
  src: '/telas/t1i/notas-320w.webp',
  srcSet: [
    '/telas/t1i/notas-280w.webp 280w',
    '/telas/t1i/notas-320w.webp 320w',
    '/telas/t1i/notas-560w.webp 560w',
    '/telas/t1i/notas-640w.webp 640w',
  ].join(', '),
  sizes: '(min-width: 768px) 320px, 280px',
  largura: 640,
  altura: 1385,
})

/** A moldura do aparelho de dia (arte decorativa, sem texto alternativo). */
export const MOLDURA_DIA: Imagem = imagemPublica({
  src: '/molduras/moldura-dia.png',
  largura: 678,
  altura: 1423,
})
