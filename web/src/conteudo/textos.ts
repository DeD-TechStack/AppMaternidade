// Textos do Início. Já passaram pela revisão de copy: não reescrever.

export const PROMESSA = 'Quem chega para o turno já sabe o que aconteceu.'

export const PILARES = ['Rotina', 'Desenvolvimento', 'Cuidado compartilhado', 'Comunidade'] as const

export const APRESENTACAO =
  'Um app para a família registrar a rotina do bebê, dividir os cuidados e acompanhar o desenvolvimento, com uma comunidade separada da rotina privada.'

export const TELAS = {
  titulo: 'Duas telas do protótipo',
  texto:
    'Na tela Hoje ficam a soneca que Bruno começou, a nota que Carla deixou às 22:40 e os botões de registro na parte de baixo, ao alcance do polegar. A tela da sessão mostra o cronômetro, contado a partir da hora de início, e quem começou.',
} as const

// Legenda do cartão das telas na faixa estreita do Início, onde só o celular do Hoje fica visível.
// TELAS continua sendo a legenda das faixas média e larga.
export const TELAS_ESTREITA = {
  titulo: 'A tela Hoje',
  texto:
    'Na tela Hoje ficam a soneca que Bruno começou, a nota que Carla deixou às 22:40 e os botões de registro na parte de baixo, ao alcance do polegar.',
} as const

export const PARA_QUE_SERVE = {
  titulo: 'Para que serve',
  linhas: [
    {
      rotulo: 'O problema',
      texto:
        'Nos primeiros meses, a rotina do bebê fica espalhada entre a memória, o papel e as mensagens. Quem assume o turno pergunta quando foi a última mamada, que horas a soneca começou e se alguém já passou a pomada.',
    },
    {
      rotulo: 'Como ajuda',
      texto:
        'Cada adulto autorizado registra sono, mamada, fralda e tummy time com um ou dois toques, e todos veem o mesmo dia, com o nome de quem registrou. As notas de passagem aparecem no alto da tela de quem chega.',
    },
    {
      rotulo: 'O que muda',
      texto:
        'Menos perguntas na troca de turno e menos coisa para guardar de cabeça. O app não cobra metas, não marca nada como atrasado e não dá pontos.',
    },
  ],
} as const

export const FATOS = {
  titulo: 'O que o app faz',
  itens: [
    {
      valor: '7',
      legenda:
        'tipos de registro: sono, amamentação, mamadeira, alimentação sólida, fralda, tummy time e observação.',
    },
    { valor: 'Autoria', legenda: 'Cada registro mostra quem fez.' },
    { valor: 'Convites', legenda: 'Cada cuidador entra por convite, com papel e prazo de validade.' },
    { valor: 'Lembretes', legenda: 'Os lembretes vêm desligados. Você liga os que quiser.' },
  ],
} as const

export const MADRUGADA = {
  titulo: 'De madrugada também',
  texto:
    'O modo madrugada escurece a tela, diminui o brilho e aumenta os botões, para registrar com uma mão e a luz apagada.',
} as const

export const CHAMADA = {
  titulo: 'Veja um dia de Heloísa',
  texto: 'Um dia de exemplo com Heloísa, 3 meses, e quem cuida dela: Juliana, Bruno e Carla.',
  link: 'Ver o protótipo do Hoje',
} as const

export const RODAPE = 'Protótipo em construção. Nada aqui é dado real.'

// Links-âncora do cabeçalho do Início: o rótulo e o id da seção para onde cada um leva.
export const NAVEGACAO = [
  { rotulo: 'As telas', alvo: 'secao-telas' },
  { rotulo: 'Para que serve', alvo: 'secao-serve' },
  { rotulo: 'Madrugada', alvo: 'secao-madrugada' },
] as const

// Parágrafo ao lado do celular da madrugada: diz o que a tela do aparelho mostra.
export const LEGENDA_MADRUGADA =
  'No celular, a mamada que Juliana começou às 03:10, vista no modo madrugada: tela escura, cronômetro grande e botões maiores.'

// Parágrafo ao lado do celular do Hoje no cartão da chamada final.
export const LEGENDA_CHAMADA =
  'No celular, o Hoje do protótipo: a soneca que Bruno começou, a nota de Carla e os últimos registros.'

// A atividade sugerida do Tummy time, na tela Sessão.
export const ATIVIDADE_TUMMY = 'Espelho no chão'

// O que as telas dos aparelhos do Início mostram. São dados fixos de uma família fictícia; os
// aparelhos mostram as telas reais com um estado montado a partir deles (ver
// componentes/vitrine/estadoFixo.ts) e um relógio parado: o Hoje e a Sessão de Sono param às 23:00
// (o Sono de Bruno começou às 21:48, e 21:48 + 1 h 12 min = 23:00, depois da nota das 22:40); a
// madrugada para às 03:24:32 (a mamada de Heloísa começou às 03:10:00).
export const MINIATURAS = {
  hoje: {
    titulo: 'Hoje',
    bebe: 'Heloísa, 3 meses',
    sessao: { rotulo: 'Sono', duracao: '1 h 12 min', pessoa: 'Bruno' },
    nota: { rotulo: 'Para você saber', texto: 'Pomada só à noite.', autor: 'Carla, 22:40' },
    ultimos: {
      rotulo: 'Últimos',
      itens: [
        { rotulo: 'Mamada', quando: 'há 2 h 10 min' },
        { rotulo: 'Fralda', quando: 'há 50 min' },
        { rotulo: 'Tummy time', quando: 'ontem 17:30' },
      ],
    },
  },
  sessao: {
    titulo: 'Sono de Heloísa',
    cronometro: '1:12:00',
    hora: '21:48',
    pessoa: 'Bruno',
    atividade: undefined,
    acoes: ['Encerrar', 'Encerrar e anotar', 'Descartar'],
  },
  madrugada: {
    titulo: 'Mamada de Heloísa',
    cronometro: '14:32',
    hora: '03:10',
    pessoa: 'Juliana',
  },
} as const

// O aviso de toda tela quando o site não tem as variáveis do banco: nada é salvo.
export const AVISO_DEMONSTRACAO =
  'Demonstração sem banco: nada do que você registra aqui é salvo. Ao recarregar a página, tudo volta ao começo.'
