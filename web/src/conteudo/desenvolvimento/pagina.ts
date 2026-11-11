// A página Desenvolvimento: título, abertura, avisos e rótulos. Os itens ficam em itens.ts.

/** O aviso de saúde: aparece perto do topo do conteúdo e de novo no fim, com este texto exato. */
export const AVISO_SAUDE =
  'Este conteúdo é informativo e não substitui orientação médica. Em caso de dúvida, fale com o pediatra.'

export const DESENVOLVIMENTO_DESTAQUE = {
  titulo: ['Cada fase,', 'no tempo do bebê.'],
  lide: 'Tummy time é o tempo que o bebê passa de bruços, acordado e com um adulto olhando. No site, ele vai ser mais um registro da rotina, ao lado de ideias para brincar em cada fase. Sem metas, sem cobrança.',
  primario: { rotulo: 'Ver ideias para cada fase', destino: '#ideias' },
  secundario: { rotulo: 'Ler sobre tummy time', destino: '#tummy-time' },
  cena: {
    base: '/cenas/publicas/desenvolvimento',
    largura: 768,
    altura: 512,
    alt: 'Dois tablets flutuando sobre um fundo de cacau com um círculo de mel, mostrando telas do site AppMaternidade.',
  },
  registro: { rotulo: 'Tummy time', valor: 'Fizemos', detalhe: 'Hoje às 10:20, registrado por Bruno' },
  tummyTitulo: ['O que as fontes dizem', 'sobre tummy time.'],
  marcosTitulo: ['Marcos,', 'sem cobrança.'],
  urgencia: {
    titulo: ['Em urgência de saúde,', 'ligue 192.'],
    texto:
      'O 192 é o serviço de atendimento móvel de urgência. A ligação é gratuita e o serviço funciona 24 horas por dia, todos os dias.',
  },
} as const

export const ROTULOS_FONTES = {
  titulo: 'Fontes',
  consultadas: 'Fontes consultadas em',
  faixa: 'Faixa de idade:',
} as const
