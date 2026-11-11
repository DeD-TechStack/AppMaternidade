// Textos do Início (MAT-49c) e os avisos comuns. A cópia é final: o Início lê tudo daqui.

// A promessa do Início: a primeira linha reta e a segunda, inteira, em itálico. O h1 lido inteiro
// (textContent) é igual a PROMESSA.
const PROMESSA_LINHAS = ['A rotina do bebê,', 'dividida com carinho.'] as const
export const PROMESSA = PROMESSA_LINHAS.join(' ')

export const INICIO = {
  heroi: {
    titulo: PROMESSA_LINHAS,
    lide: 'Registre mamada, sono e fralda em dois toques. Na troca de turno, quem chega já vê o que aconteceu.',
    primario: { rotulo: 'Começar grátis', destino: '/app/hoje' },
    secundario: { rotulo: 'Ver como funciona', destino: '/como-funciona' },
    cena: {
      base: '/cenas/inicio/heroi',
      alt: 'Três celulares sobre pedestais de oliva num fundo de mel, mostrando telas reais do AppMaternidade.',
    },
  },
  numeros: { titulo: 'Números do app' },
  selos: { titulo: 'O que o app promete' },
  turno: {
    titulo: ['Quem chega no turno', 'já sabe o que houve.'],
    texto:
      'Cada pessoa registra o que fez, com o nome. Na troca, o app mostra tudo o que aconteceu desde a última vez que você olhou.',
    cartao: {
      titulo: 'Desde que você saiu',
      itens: [
        { texto: 'Mamada, lado esquerdo', pessoa: 'Juliana', hora: '02:40' },
        { texto: 'Fralda trocada', pessoa: 'Bruno', hora: '03:10' },
        { texto: 'Soneca começou', pessoa: 'Carla', hora: '03:25' },
      ],
    },
  },
  madrugada: {
    titulo: ['De madrugada,', 'com uma mão só.'],
    lide: 'O botão de iniciar mamada fica na metade de baixo da tela, grande, em mel sobre o escuro.',
    botao: { rotulo: 'Ver o modo madrugada', destino: '/como-funciona' },
    cena: {
      base: '/cenas/inicio/faixa-cacau',
      alt: 'Dois tablets flutuando sobre o cacau, com telas reais do AppMaternidade',
    },
  },
  tabela: {
    titulo: ['O caderno ajuda.', 'O app divide.'],
    legenda: 'AppMaternidade e caderno com mensagens soltas',
    linhas: [
      { necessidade: 'Registrar uma mamada com dois toques', app: true, caderno: false },
      { necessidade: 'Ver o que a outra pessoa já registrou', app: true, caderno: false },
      { necessidade: 'Funcionar de madrugada, com uma mão', app: true, caderno: false },
      { necessidade: 'Dar acesso com prazo para a babá', app: true, caderno: false },
      { necessidade: 'Sem metas nem comparações', app: true, caderno: true },
    ],
    cena: {
      base: '/cenas/inicio/tabela',
      alt: 'Um celular sobre linho com uma tela real do AppMaternidade',
    },
  },
  citacao: {
    texto: 'Pomada só à noite, a de dia acabou. Se ela acordar, o bico está na bolsa.',
    autor: 'Carla, avó da Heloísa, na nota das 22:40',
  },
  depoimentos: {
    titulo: ['Quem cuida', 'conta como é.'],
    relatos: [
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
    ],
  },
  perguntas: {
    titulo: ['Perguntas', 'de quem chega agora.'],
    itens: [
      {
        pergunta: 'Quanto custa?',
        resposta:
          'Hoje o site é uma demonstração gratuita. O preço, se houver, ainda não foi definido, e nunca haverá anúncio feito com os dados da sua rotina.',
      },
      {
        pergunta: 'Quem vê os registros do bebê?',
        resposta: 'Só as pessoas que você convidar para a família. Nada do que é registrado aparece na comunidade.',
      },
      {
        pergunta: 'Funciona de madrugada?',
        resposta:
          'Funciona. O modo madrugada escurece a tela e deixa o botão de mamada grande, na metade de baixo, ao alcance do polegar.',
      },
      {
        pergunta: 'Posso convidar a babá?',
        resposta: 'Pode. O convite tem papel e prazo, e você revoga o acesso quando quiser.',
      },
    ],
  },
  fechamento: {
    titulo: ['Sua família inteira', 'no mesmo dia.'],
    primario: { rotulo: 'Começar grátis', destino: '/app/hoje' },
  },
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
