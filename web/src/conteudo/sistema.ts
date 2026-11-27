// O conteúdo da página /sistema. Os valores da paleta repetem os de styles/tokens.css só como texto
// (sem o "#", que a página acrescenta ao mostrar); o teste de estilo confere que os dois batem.

interface Papel {
  /** O nome do token no tema (`--color-<token>`). */
  token: string
  nome: string
  /** O valor em hexadecimal, sem o "#". */
  hex: string
  uso: string
}

export const PALETA: readonly Papel[] = [
  { token: 'papel', nome: 'Papel', hex: 'F8F6EB', uso: 'Fundo da página' },
  { token: 'mel', nome: 'Mel', hex: 'F2C14E', uso: 'Painel de campo e destaque' },
  { token: 'mel-claro', nome: 'Mel claro', hex: 'F7D684', uso: 'Só na luz de estúdio' },
  { token: 'oliva', nome: 'Oliva', hex: '697255', uso: 'Pedestal, selo e tabela' },
  { token: 'oliva-tinta', nome: 'Oliva tinta', hex: '4F5740', uso: 'Oliva como texto' },
  { token: 'cacau', nome: 'Cacau', hex: '2B2320', uso: 'Tinta, primário e faixa' },
  { token: 'areia', nome: 'Areia', hex: 'EADDC5', uso: 'Descanso entre painéis' },
  { token: 'texto-2', nome: 'Texto 2', hex: '6E6560', uso: 'Texto secundário' },
  { token: 'branco', nome: 'Branco', hex: 'FFFFFF', uso: 'Cartão do app' },
  { token: 'noite', nome: 'Noite', hex: '2B2320', uso: 'Fundo da madrugada' },
  { token: 'noite-cartao', nome: 'Noite cartão', hex: '3A302B', uso: 'Cartão da madrugada' },
  { token: 'noite-2', nome: 'Noite 2', hex: 'B9C09F', uso: 'Texto 2 da madrugada' },
]

/** Os títulos de seção da página, na ordem (o teste confere que todos aparecem). */
export const SECOES = {
  paleta: ['Doze papéis, um só destaque'],
  tipo: ['Duas famílias,', 'uma voz só.'],
  botoes: ['Um primário', 'por tela, sempre.'],
  casca: ['Cabeçalho de papel,', 'rodapé de mel.'],
  paineis: ['Quatro campos,', 'cada um com seu papel.'],
  cena: ['A nossa tela,', 'num estúdio de mel.'],
  numeros: ['Números'],
  ilustracoes: ['Gente que cuida,', 'em traço preto.'],
  citacao: ['Citação'],
  faixa: ['De madrugada,', 'com uma mão só.'],
  selos: ['O que o app', 'promete.'],
  tabela: ['O caderno ajuda.', 'O app divide.'],
  depoimentos: ['Quem cuida', 'conta como é.'],
  perguntas: ['Perguntas', 'de quem chega agora.'],
} as const

export const AMOSTRA_SISTEMA = {
  abertura: ['Campo de mel,', 'a base do site.'],
  estado: {
    cursor: 'com o cursor em cima',
    teclado: 'com foco do teclado',
  },
  niveisDeTipo: {
    rotulo: 'Níveis de tipo',
    titulo: ['Nove níveis de tipo,', 'a mesma frase.'],
  },
  espaco: {
    titulo: ['Espaço por papel,', 'medido na largura de agora.'],
    texto: 'Cada quadrado tem a largura e a altura do token. O valor ao lado é o que o navegador calcula nesta largura de janela.',
  },
  botoes: {
    rotulo: 'Botões e campos',
    convidar: 'Convidar alguém',
    amostraMel: 'Mel, sobre o cacau',
    ajudaEmail: 'O convite chega neste endereço.',
    erroNome: 'Escreva o nome ou o apelido do bebê.',
  },
  casca: {
    rotulo: 'Cabeçalho e rodapé',
    texto: 'O cabeçalho desta página é o de verdade: fica no alto ao rolar e, abaixo de 1100 px, guarda os links no menu de altura cheia. O rodapé, de mel, fecha todas as páginas.',
  },
  paineis: {
    rotulo: 'Painéis de campo',
    uso: {
      mel: 'O campo de mídia: uma cena ou uma tela de verdade por dobra.',
      oliva: 'O segundo campo: pedestal, selos e a tabela de comparação.',
      areia: 'O descanso entre painéis, para os depoimentos.',
      cacau: 'A faixa escura, com o texto de papel e o primário de mel.',
    },
  },
  cena: {
    rotulo: 'Cena de estúdio e cartão flutuante',
    texto: 'A cena é uma foto de estúdio com a captura das nossas telas; o cartão por cima é um cartão de verdade, não uma imagem.',
    alt: 'Três celulares sobre pedestais verdes, num fundo amarelo, mostrando telas do AppMaternidade: a base do sistema, a escala de títulos e o rodapé.',
  },
  ilustracoes: 'Traço preto sobre papel ou mel, nunca sobre o cacau.',
  tabela: {
    rotulo: 'Tabela de comparação',
    legenda: 'O que muda entre o AppMaternidade e o caderno com as mensagens soltas',
  },
  perguntas: 'Perguntas frequentes',
} as const

export const ILUSTRACOES_DA_AMOSTRA = [
  {
    nome: 'avo-carrinho',
    titulo: 'A avó no passeio',
    resumo: 'Ela anota a soneca nas tardes dela, sem mandar mensagem.',
    destino: '/cuidado-compartilhado',
  },
  {
    nome: 'pai-colo',
    titulo: 'O pai com o bebê no colo',
    resumo: 'Dois toques bastam, com a outra mão ocupada.',
    destino: '/como-funciona',
  },
  {
    nome: 'tummy-time',
    titulo: 'Tummy time no tapete',
    resumo: 'O tempo de bruços fica anotado, sem meta de minutos.',
    destino: '/desenvolvimento',
  },
  {
    nome: 'maos-celular',
    titulo: 'A troca de turno',
    resumo: 'Quem chega já vê o que aconteceu desde que saiu.',
    destino: '/cuidado-compartilhado',
  },
  {
    nome: 'baba-tapete',
    titulo: 'A babá no chão da sala',
    resumo: 'O acesso dela tem papel e prazo, e acaba quando vocês combinarem.',
    destino: '/cuidado-compartilhado',
  },
  {
    nome: 'mae-noite',
    titulo: 'A mãe de madrugada',
    resumo: 'A tela escurece e o botão de mamada fica ao alcance do polegar.',
    destino: '/como-funciona',
  },
] as const

export const LINHAS_DA_TABELA = [
  { necessidade: 'Registrar uma mamada com dois toques', app: true, caderno: false },
  { necessidade: 'Ver o que a outra pessoa já registrou', app: true, caderno: false },
  { necessidade: 'Funcionar de madrugada, com uma mão', app: true, caderno: false },
  { necessidade: 'Dar acesso com prazo para a babá', app: true, caderno: false },
  { necessidade: 'Sem metas nem comparações', app: true, caderno: true },
] as const

export const RELATOS = [
  {
    texto: 'Agora eu sei a hora da última mamada sem acordar ninguém para perguntar.',
    nome: 'Marina',
    papel: 'Mãe de primeira viagem',
  },
  {
    texto: 'Eu anoto a soneca e a mãe dela vê do trabalho. Não preciso mandar mensagem.',
    nome: 'Seu Antônio',
    papel: 'Avô, cuida às terças',
  },
  {
    texto: 'Vejo só o que preciso no meu turno, e o acesso acaba quando a gente combinou.',
    nome: 'Lúcia',
    papel: 'Babá de meio período',
  },
] as const

export const PERGUNTAS = [
  {
    pergunta: 'Quem vê os registros do bebê?',
    resposta: 'Só as pessoas que você convidar para a família. Nada do que é registrado aparece na comunidade.',
  },
  {
    pergunta: 'A babá pode ter acesso só por um tempo?',
    resposta: 'Pode. O convite tem papel e prazo, e você revoga o acesso quando quiser.',
  },
  {
    pergunta: 'O app cobra metas de sono ou de mamada?',
    resposta: 'Não. Ele registra e mostra o que aconteceu, sem metas, sem pontos e sem comparar bebês.',
  },
] as const
