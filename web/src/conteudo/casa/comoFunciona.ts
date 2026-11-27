// Approved COPY_como-funciona deck (sha256 84e6bf6d…) with COMO-P3 hero/closing copy; no other copy changes.
// `cf.aba` (o título da aba) fica em NOMES_DE_PAGINA. Cada frase numa linha, com o id do deck ao lado.
export const COMO_FUNCIONA = {
  h1: 'Deixa que eu anoto.', // cf.h1
  lede: 'A família anota mamadas, sono e fraldas num histórico só. Este é um dia da Helo, da mamada das 03:00 ao sono das 20:30.', // cf.lede
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
  fecho: 'O que foi anotado hoje fica no histórico da família, pronto para o dia seguinte.', // cf.p.fecho
  cta2: 'Criar conta', // cf.cta2
} as const

/** Os passos do `<ol>` da faixa 5, na ordem do deck. */
export const PASSOS = [COMO_FUNCIONA.passo1, COMO_FUNCIONA.passo2, COMO_FUNCIONA.passo3] as const

/** O destino das duas ações (hero e fecho). */
export const DESTINO_CRIAR_CONTA = '/criar-conta'

const RAIZ = import.meta.env.BASE_URL

/** Pasta dos recortes e capturas da composição (paleta A). */
export const ARTE_COMO = `${RAIZ}composicao/a`

/** Recorte M01 (03:00, família à luz da luminária), dimensões de `public/composicao/medidas.json`. */
export const CENA_M01 = {
  src: `${ARTE_COMO}/m01.webp`,
  largura: 1672,
  altura: 941,
} as const

/** Recorte M06 (18:00, Ícaro no colo com a luminária) e a camada de luz. */
export const CENA_M06 = {
  src: `${ARTE_COMO}/m06.webp`,
  largura: 900,
  altura: 1470,
  luz: `${RAIZ}cenas/inicio/m06-luz-792w.png`,
  luzLargura: 792,
  luzAltura: 1293,
} as const
