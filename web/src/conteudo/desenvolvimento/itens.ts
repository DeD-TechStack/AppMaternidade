// Os itens de Desenvolvimento, do conteúdo do MAT-39 (texto próprio, escrito a partir das fontes de
// saúde). Ficaram de fora as marcas de citação, as notas internas, as listas do CDC e o lema da
// Pathways sobre a quantidade de tempo.
import { CONSULTADO_EM, FONTES } from './fontes.ts'
import type { Artigo, Fase } from './tipos.ts'

// ---------------------------------------------------------------------------------------------
// Ideias para brincar nesta fase

export const IDEIAS = {
  titulo: ['Ideias para brincar', 'nesta fase.'],
  texto:
    'As fases abaixo são janelas largas e se sobrepõem. Cada bebê tem o seu ritmo. Nenhuma ideia é tarefa: escolha a que fizer sentido no dia e deixe as outras.',
  todasTitulo: 'Valem para todas as fases',
  todas: [
    'Se o bebê chorar ou se irritar, pare ou troque de brincadeira.',
    'Até 1 ano, o Guia de Atividade Física não recomenda tempo de tela.',
    'O bebê precisa de lugar seguro no chão, com um adulto por perto.',
  ],
  rotuloSeletor: 'Escolha a fase do bebê',
} as const

export const FASES: readonly Fase[] = [
  {
    id: 'desenv-ideias-0-2m',
    faixa: '0 a 2 meses',
    titulo: 'Do nascimento a uns 2 meses',
    itens: [
      'Converse com o rosto perto do dele e olhe nos olhos. Nessa idade o bebê já ouve e enxerga a uns 20 cm, mais ou menos a distância do rosto de quem amamenta.',
      'Mostre um objeto colorido a uns 30 cm dos olhos dele e mova devagar para os lados, para cima e para baixo.',
      'Cante e leia em voz alta para ele.',
      'Deixe o bebê de barriga para baixo e chame com a voz, com o nome dele ou com um brinquedo, para ele tentar levantar a cabeça. Também dá para começar com ele deitado no seu peito, se você estiver bem acordado.',
      'No colo, mude a posição de vez em quando: virado para você, de bruços, virado para a frente.',
    ],
    fontes: [FONTES.caderneta, FONTES.nhs, FONTES.spsp],
    consultadoEm: CONSULTADO_EM,
  },
  {
    id: 'desenv-ideias-2-4m',
    faixa: '2 a 4 meses',
    titulo: 'De uns 2 a 4 meses',
    itens: [
      'Coloque um brinquedo na mão dele para tocar e apertar. Nessa idade ele ainda não costuma buscar o objeto sozinho.',
      'Quando ele fizer sons, responda e imite. Ele gosta quando você faz isso.',
      'Na hora de bruços, deixe brinquedos ao alcance das mãos.',
      'Deite o bebê de costas para ele chutar e mexer as pernas à vontade.',
      'Aos poucos, mamada, banho e hora de brincar podem ganhar uma ordem parecida todo dia.',
    ],
    fontes: [FONTES.caderneta, FONTES.nhs, FONTES.spsp],
    consultadoEm: CONSULTADO_EM,
  },
  {
    id: 'desenv-ideias-4-6m',
    faixa: '4 a 6 meses',
    titulo: 'De uns 4 a 6 meses',
    itens: [
      'Ofereça brinquedos limpos e macios que ele possa pegar e levar à boca sem risco de engasgar, como chocalho e mordedor.',
      'Fale ou faça barulho de um ponto onde ele não esteja vendo você, para ele procurar de onde vem o som.',
      'Faça caretas, sorria, mande beijo e espere ele tentar imitar.',
      'Deitado de costas, ele pode brincar de pegar os próprios pés.',
      'Coloque um brinquedo um pouco ao lado, para ele virar o corpo e tentar alcançar. Por volta dos 5 meses, a Caderneta sugere incentivar o rolar numa superfície firme no chão.',
    ],
    fontes: [FONTES.caderneta, FONTES.spsp],
    consultadoEm: CONSULTADO_EM,
  },
  {
    id: 'desenv-ideias-6-8m',
    faixa: '6 a 8 meses',
    titulo: 'De uns 6 a 8 meses',
    itens: [
      'Coloque o bebê no chão, numa esteira ou num colchonete, e deixe que ele tente sentar.',
      'Evite deixá-lo muito tempo sentado se ele ainda não sai dessa posição sozinho. Ele precisa de espaço para rolar e mexer o corpo todo.',
      'Brinque de esconder: cubra o seu rosto ou um brinquedo com um pano e pergunte “cadê?”.',
      'Ofereça brinquedos com cores e texturas diferentes, fáceis de segurar, para ele passar de uma mão para a outra.',
      'Brincar de bruços e de barriga para cima continua valendo nessa fase.',
    ],
    fontes: [FONTES.caderneta, FONTES.spsp],
    consultadoEm: CONSULTADO_EM,
  },
  {
    id: 'desenv-ideias-8-10m',
    faixa: '8 a 10 meses',
    titulo: 'De uns 8 a 10 meses',
    itens: [
      'Deixe um brinquedo um pouco à frente para ele ir buscar, se arrastando ou engatinhando.',
      'Chame o bebê de longe e espere ele vir até você.',
      'Diga o nome das coisas, das pessoas e das partes do corpo dele, e deixe espaço para ele responder com sons.',
      'Bata palmas e invente situações curiosas para ele observar.',
    ],
    fontes: [FONTES.caderneta, FONTES.spsp],
    consultadoEm: CONSULTADO_EM,
  },
  {
    id: 'desenv-ideias-10-12m',
    faixa: '10 a 12 meses',
    titulo: 'De uns 10 a 12 meses',
    itens: [
      'Coloque um brinquedo em cima do sofá para ele se apoiar e ficar em pé. Confira antes se o móvel está firme.',
      'Cante músicas com gestos, palmas e tchau, e deixe que ele imite.',
      'Faça pedidos simples, como “me dá” e “vem aqui”.',
      'Para treinar a pinça com os dedos, a Caderneta sugere objetos pequenos, como bolinhas de papel ou pedaços de fruta, com um adulto olhando de perto para que ele não leve à boca, ao nariz ou ao ouvido. Não o deixe sozinho com objetos pequenos.',
      'A Caderneta não recomenda o andador, por causa do risco de acidente.',
      'Se der, deixe que ele mexa na grama ou na areia num passeio ao ar livre.',
    ],
    fontes: [FONTES.caderneta, FONTES.spsp],
    consultadoEm: CONSULTADO_EM,
  },
]

// ---------------------------------------------------------------------------------------------
// O que as fontes dizem sobre tummy time

export const TUMMY_TIME: Artigo = {
  id: 'desenv-tummy-time-fontes',
  faixa: '0 a 12 meses',
  titulo: 'O que as fontes dizem sobre tummy time',
  resumo:
    'Tummy time é o tempo que o bebê passa de bruços, acordado e com um adulto olhando. As fontes concordam na segurança e discordam na quantidade.',
  itens: [
    {
      titulo: 'O que é',
      textos: [
        'A OMS define tummy time como o tempo em que o bebê fica de bruços, acordado, com braços e pernas livres para se mexer. Ela associa esse tempo a um melhor desenvolvimento motor e a menos chance de a cabeça ficar achatada (plagiocefalia).',
      ],
    },
    {
      titulo: 'Segurança',
      textos: [
        'Só faça com o bebê acordado e alerta, e com um adulto olhando o tempo todo. Se ele pegar no sono, vire-o de barriga para cima para dormir. Para dormir, barriga para cima vale até ele completar 1 ano. Use uma superfície firme, de preferência no chão, e não o deixe sozinho em lugar alto.',
      ],
    },
    {
      titulo: 'Quando começar',
      textos: [
        'O NHS diz que dá para começar logo depois do nascimento, com o bebê deitado sobre o peito do adulto, desde que esse adulto esteja bem acordado. A Pathways fala em começar quando o bebê chega do hospital. A Caderneta da Criança sugere, nos primeiros 2 meses, deixar o bebê de barriga para baixo e chamar a atenção dele com a voz ou um brinquedo para que levante a cabeça.',
      ],
    },
    {
      titulo: 'Se o bebê reclamar',
      textos: [
        'Muitos bebês estranham a posição no começo. Se ele chorar ou se irritar, pare ou troque de brincadeira. Dá para fazer uma pausa e tentar de novo depois.',
      ],
    },
  ],
  fontes: [FONTES.oms, FONTES.guia, FONTES.nhs, FONTES.sbp, FONTES.spsp, FONTES.caderneta, FONTES.pathways],
  consultadoEm: CONSULTADO_EM,
}

/** A tabela "quanto tempo", sem a linha da AAP; o lema da Pathways virou um traço. */
export const QUANTO_TEMPO = {
  titulo: 'Quanto tempo: as fontes não concordam',
  colunas: ['Fonte', 'O que diz', 'Contexto'],
  linhas: [
    [
      'OMS, diretriz de 2019',
      'Pelo menos 30 min por dia, somados ao longo do dia, para bebês que ainda não se locomovem',
      'Recomendação forte, com evidência de qualidade muito baixa',
    ],
    [
      'Ministério da Saúde, Guia de Atividade Física (2021)',
      'Até 1 ano: pelo menos 30 min por dia, que podem ser divididos ao longo do dia',
      'Qualidade das evidências de baixa a moderada',
    ],
    [
      'NHS',
      'Pouco e várias vezes no começo, aumentando aos poucos; não dá número',
      'Página revisada em 2023, com nova revisão prevista para março de 2026',
    ],
    ['SBP', 'Não há consenso sobre o tempo nem sobre a frequência', 'Bruços só acordado e com supervisão'],
    ['Pathways.org', '15 a 30 min por dia aos 2 meses; 60 min ou mais aos 6 meses', '—'],
  ],
  semMeta:
    'O site não transforma nenhum desses números em meta. Ele registra o que vocês fizeram e não cobra nada: sem meta de minutos, estrelas, sequência de dias nem comparação com outros bebês.',
} as const

// ---------------------------------------------------------------------------------------------
// Marcos, sem cobrança

export const MARCOS: Artigo = {
  id: 'desenv-marcos-sem-cobranca',
  faixa: '0 a 12 meses',
  titulo: 'Marcos, sem cobrança',
  resumo:
    'Marco é o que a maioria das crianças já faz até certa idade. É uma referência para levar à conversa com a equipe de saúde.',
  itens: [
    {
      titulo: 'O que é um marco',
      textos: [
        'Marcos são coisas que a maioria das crianças já consegue fazer até uma certa idade, como sorrir pela primeira vez, dar tchau ou dar os primeiros passos. Cada criança chega lá no seu próprio ritmo. Uma lista de marcos não substitui a avaliação feita pelo profissional com instrumento próprio.',
      ],
    },
    {
      titulo: 'Onde ver os marcos',
      textos: [
        'A Caderneta da Criança, do Ministério da Saúde, tem as orientações por idade e as páginas de marcos que a equipe de saúde usa nas consultas.',
      ],
    },
    {
      titulo: 'Bebê prematuro',
      textos: ['A Caderneta orienta usar a idade corrigida para bebês que nasceram antes do tempo.'],
    },
    {
      titulo: 'Quando conversar com o profissional',
      textos: [
        'Converse com o pediatra ou com a equipe da UBS se o bebê deixou de fazer algo que já fazia, se ele ainda não faz o que se espera para a fase, ou quando alguma coisa preocupa você, mesmo sem saber explicar.',
        'Na maioria das vezes não é nada sério. Mesmo assim, as fontes recomendam não esperar para conversar.',
      ],
    },
  ],
  fontes: [FONTES.caderneta, FONTES.spsp, FONTES.cdc, FONTES.samu],
  consultadoEm: CONSULTADO_EM,
}
