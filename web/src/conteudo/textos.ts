// Textos do Início. Já passaram pela revisão de copy: não reescrever.

export const PROMESSA = 'Quem chega no turno já sabe o que houve.'

// A linha sob o `h1` do Início: cabe em 1 linha em 1440 (SISTEMA 2.2).
export const SUBTITULO_INICIO = 'A rotina do bebê, dividida entre quem cuida.'

// O link da coluna lateral da abertura.
export const LINK_ABERTURA = 'Ver o protótipo'

export const PILARES = ['Rotina', 'Desenvolvimento', 'Cuidado compartilhado', 'Comunidade'] as const

export const TITULO_APRESENTACAO = 'Um app para cuidar junto'

export const APRESENTACAO =
  'Um app para a família registrar a rotina do bebê, dividir os cuidados e acompanhar o desenvolvimento, com uma comunidade separada da rotina privada.'

// O bloco de cartões do Início: cada cartão leva a uma tela do protótipo.
export const TELAS = {
  titulo: 'As telas do protótipo',
  cartoes: [
    {
      titulo: 'Hoje',
      linha: 'Soneca em andamento, nota de Carla e botões de registro.',
      destino: '/app/hoje',
      rotuloMidia: 'Tela Hoje do protótipo',
    },
    {
      titulo: 'Sessão',
      linha: 'Cronômetro contado desde a hora de início.',
      destino: '/app/sessao',
      rotuloMidia: 'Tela Sessão do protótipo',
    },
  ],
} as const

// Os rótulos das molduras de mídia do Início (a moldura não tem texto dentro).
export const MIDIAS_INICIO = {
  notebook: 'Notebook com a tela Hoje do protótipo',
  celulares: 'Três celulares sobre pedestais',
  galeria: {
    sessao: 'Tela Sessão com o cronômetro',
    madrugada: 'Modo madrugada, campo escuro',
    ilustracoes: ['Duas ilustrações do dia a dia, 1 de 2', 'Duas ilustrações do dia a dia, 2 de 2'],
    mosaico: 'Mosaico de fragmentos da rotina',
  },
  retrato: 'Celular em modo madrugada',
} as const

// A citação do Início: o texto é o da nota de exemplo (MINIATURAS.hoje.nota); a autoria diz que é exemplo.
export const CITACAO_AVISO = 'nota de passagem de exemplo'

// O nome da região da navegação grande do fim do Início (a região da faixa de números usa FATOS.titulo).
export const ROTULO_ATALHOS = 'Atalhos do protótipo'

export const SECAO_ESCURA = {
  titulo: 'Crie sua conta',
  texto: 'Convide quem cuida junto e comece a registrar o dia.',
  botao: 'Criar conta',
  destino: '/criar-conta',
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

// Os 3 números do Início (decisão D5): cada um é um fato do produto, em uma linha de legenda.
export const FATOS = {
  titulo: 'O que o app faz',
  itens: [
    { valor: '7', legenda: 'tipos de registro' },
    { valor: '2', legenda: 'toques para registrar' },
    { valor: '0', legenda: 'metas ou comparações' },
  ],
} as const

export const CHAMADA = {
  titulo: 'Quer ver um dia de Heloísa?',
  texto: 'Um dia de exemplo com Heloísa, 3 meses, e quem cuida dela: Juliana, Bruno e Carla.',
  link: 'Ver o protótipo',
  destino: '/app/hoje',
  entrar: 'Entrar',
  destinoEntrar: '/entrar',
} as const

export const RODAPE = 'Protótipo em construção. Nada aqui é dado real.'

// As 4 palavras grandes do fim do Início: o rótulo e a rota para onde cada uma leva.
export const NAVEGACAO = [
  { rotulo: 'Hoje', destino: '/app/hoje' },
  { rotulo: 'Sessão', destino: '/app/sessao' },
  { rotulo: 'Madrugada', destino: '/app/hoje' },
  { rotulo: 'Entrar', destino: '/entrar' },
] as const

// A atividade sugerida do Tummy time, na tela Sessão e na miniatura dela no Início.
export const ATIVIDADE_TUMMY = 'Espelho no chão'

// O que as telas em miniatura dos aparelhos do Início mostram. São dados fixos de uma família
// fictícia, os mesmos do estado inicial do protótipo; o relógio não anda.
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
    titulo: 'Tummy time de Heloísa',
    cronometro: '04:35',
    hora: '17:02',
    pessoa: 'Juliana',
    atividade: ATIVIDADE_TUMMY,
    acoes: ['Encerrar', 'Encerrar e anotar', 'Descartar'],
  },
} as const

// O aviso de toda tela quando o site não tem as variáveis do banco: nada é salvo.
export const AVISO_DEMONSTRACAO =
  'Demonstração sem banco: nada do que você registra aqui é salvo. Ao recarregar a página, tudo volta ao começo.'
