// Textos de Como funciona e de Cuidado compartilhado no "Campo de mel". As frases vêm do conteúdo
// antigo das páginas públicas (MAT-36), às vezes enxutas, com o mesmo sentido e o futuro ("vai", "o
// plano é") onde a função ainda não está no ar. As páginas não declaram frase em literal: tiram daqui.

// O aviso de demonstração mora só no rodapé da casca (AVISO_DEMONSTRACAO): estas páginas não
// repetem que é demonstração, que a família é fictícia, que a conta não está no ar nem que nada é salvo.

const HOJE = '/app/hoje'

/**
 * O rótulo do primário que leva ao Hoje (o mesmo nas duas pontas da página). É o rótulo que o Início já
 * usa para essa ação (`conteudo/textos.ts`, "Começar grátis", destino `/app/hoje`): o aviso de
 * demonstração já está na tela, então o botão não repete a palavra "protótipo" (rodada POL, item 6).
 */
const ABRIR_PROTOTIPO = 'Começar grátis'

// ---------------------------------------------------------------------------------------------
// Como funciona

export const COMO_FUNCIONA_DESTAQUE = {
  titulo: ['Do primeiro dia', 'à troca de turno.'],
  lide: 'Três momentos da rotina mostram o que o site faz pela família: a primeira semana, a madrugada e a troca de turno.',
  primario: { rotulo: ABRIR_PROTOTIPO, destino: HOJE },
  secundario: { rotulo: 'Ver os três momentos', destino: '#tres-momentos' },
  cena: {
    base: '/cenas/publicas/como-funciona',
    // 1× do recorte em retrato em volta do celular (@2x: 680 × 1050).
    largura: 340,
    altura: 525,
    alt: 'Um celular sobre um pedestal verde, num fundo amarelo, com uma tela do AppMaternidade.',
  },
  momentos: {
    titulo: ['Três momentos', 'da rotina.'],
    texto: 'Cada momento vem numa tela da família de Juliana, Bruno e Carla, que cuidam da Heloísa.',
  },
  passos: [
    {
      id: 'primeira-semana',
      titulo: 'Na primeira semana',
      texto:
        'Na primeira semana, dá para criar a conta, cadastrar o bebê e convidar o outro responsável. A partir daí, os dois já fazem os primeiros registros de mamada e de fralda.',
    },
    {
      id: 'madrugada',
      titulo: 'De madrugada',
      texto:
        'O Hoje tem o modo madrugada: tela escura, pouco brilho e botões maiores. Dá para abrir o site no escuro, ver a última mamada e iniciar ou encerrar o registro com uma mão.',
    },
    {
      id: 'troca-de-turno',
      titulo: 'Na troca de turno',
      texto:
        'Quem chega para o turno vê, sem precisar perguntar, os registros desde que saiu, a sessão em andamento, como a soneca que Bruno começou e ainda não acabou, e as notas em destaque.',
    },
  ],
  convite: {
    rotulo: 'Convite enviado',
    pessoa: 'Bruno',
    papel: 'Responsável, convidado por Juliana',
  },
  primeirosRegistros: {
    titulo: 'Primeiros registros',
    itens: [
      { tipo: 'Mamada', detalhe: 'Lado direito, Juliana', hora: '07:40' },
      { tipo: 'Fralda', detalhe: 'Xixi, Bruno', hora: '08:15' },
    ],
  },
  madrugada: {
    rotulo: 'Modo madrugada',
    ultima: 'Última mamada',
    hora: '02:40',
    detalhe: 'Lado esquerdo, Juliana',
    botao: 'Iniciar mamada',
  },
  desdeQueSaiu: {
    titulo: 'Desde que você saiu',
    andamento: { rotulo: 'Soneca em andamento', tempo: '00:42', detalhe: 'Começou às 14:05, por Bruno' },
    itens: [
      { inicial: 'C', tipo: 'Fralda', detalhe: 'Cocô, Carla', hora: '13:55' },
      { inicial: 'J', tipo: 'Mamada', detalhe: 'Lado direito, Juliana', hora: '13:20' },
    ],
    nota: { rotulo: 'Nota em destaque', texto: 'O bico extra está na bolsa azul.', autor: 'Carla, às 13:58' },
  },
  comecar: {
    titulo: ['Para começar,', 'só o navegador.'],
    textos: [
      'O site abre no navegador, sem instalar nada.',
      'O acesso é por e-mail e senha, e depois a pessoa escolhe entre criar a família ou entrar por um convite. Do bebê, o site pede só o nome ou apelido e a data de nascimento. Os termos de uso e o consentimento para os dados do bebê vão aparecer em telas separadas.',
    ],
  },
  // A frase que explicava o botão ("O protótipo de Hoje e Sessão já pode ser aberto…") saiu: repetia a
  // palavra "protótipo" do botão, na mesma faixa (rodada de polimento POL, item 4).
  fechamento: {
    titulo: ['Veja as telas', 'por dentro.'],
    acao: { rotulo: ABRIR_PROTOTIPO, destino: HOJE },
  },
  numeros: [
    { valor: '7', legenda: 'tipos de registro' },
    { valor: '2', legenda: 'toques' },
    { valor: '0', legenda: 'metas ou comparações' },
  ],
} as const

// ---------------------------------------------------------------------------------------------
// Cuidado compartilhado

export const CUIDADO_DESTAQUE = {
  titulo: ['Um bebê,', 'vários adultos.'],
  lide: 'Mães, pais, avós, babás e outros adultos autorizados cuidam do mesmo bebê pelo site, cada um com a própria conta e o próprio papel.',
  /** O primário da primeira dobra e o do fim da página: o mesmo destino do fechamento de Como funciona. */
  primario: { rotulo: ABRIR_PROTOTIPO, destino: HOJE },
  familia: {
    descricao: 'Exemplo da tela Família, com a família fictícia da Heloísa',
    titulo: 'Família',
    bebe: { nome: 'Heloísa', papel: 'Bebê, 3 meses' },
    pessoas: [
      { nome: 'Juliana', papel: 'Responsável' },
      { nome: 'Bruno', papel: 'Responsável' },
      { nome: 'Carla', papel: 'Cuidador · acesso até domingo' },
    ],
    botao: 'Convidar',
  },
  convite: { titulo: 'Convite enviado para Carla', prazo: 'Acesso até domingo' },
  blocos: [
    {
      titulo: 'Convite com papel',
      texto:
        'Cada pessoa entra na família com um papel, e cada adulto com a própria conta: ninguém divide uma senha da família.',
      /** Como a tela Família vai mostrar isso, com a família de exemplo. */
      exemplo: { inicial: 'B', quem: 'Bruno', oQue: 'Entrou como responsável, convidado por Juliana' },
    },
    {
      titulo: 'Acesso com prazo',
      texto: 'Cuidadores e observadores podem ter acesso com prazo, como “cuidador até domingo”. No fim desse dia, o acesso termina.',
      exemplo: { inicial: 'C', quem: 'Carla', oQue: 'Cuidadora, com acesso até domingo' },
    },
    {
      titulo: 'Revogue quando quiser',
      texto:
        'O responsável pode remover o acesso de qualquer pessoa da família. Ela perde o acesso na hora.',
      exemplo: { inicial: 'J', quem: 'Juliana', oQue: 'Removeu o acesso de uma babá antiga' },
    },
  ],
  papeis: {
    titulo: ['Três papéis', 'na família.'],
    texto: 'Quem convida escolhe o papel, e o papel decide o que a pessoa vai poder fazer.',
    tabela: {
      legenda: 'Papéis na família',
      colunas: ['Papel', 'Para quem é', 'O que vai poder fazer'],
      linhas: [
        [
          'Responsável',
          'Mãe, pai ou outro responsável legal. Pode haver mais de um.',
          'Cuidar da família, do cadastro do bebê, dos convites e dos dados.',
        ],
        [
          'Cuidador',
          'Avó, babá ou outro adulto de confiança.',
          'Registrar e acompanhar. Editar e excluir só o que ele mesmo registrou, e encerrar qualquer sessão em andamento.',
        ],
        ['Observador', 'Quem só acompanha.', 'Ler os registros e as notas, sem escrever.'],
      ],
    },
  },
  registro: {
    titulo: 'Quem fez cada registro',
    texto:
      'Cada registro vai mostrar quem o fez. Numa sessão, como uma soneca, o site vai guardar quem iniciou e quem encerrou, mesmo que sejam pessoas diferentes.',
  },
  passagem: {
    titulo: 'Na passagem de turno',
    texto:
      'Cada adulto vê a mesma sessão no próprio celular ou notebook, como a soneca que Bruno começou. Quem chega encontra, numa tela só, as notas em destaque deixadas por quem estava antes e tudo o que aconteceu desde que saiu.',
  },
  /** A tarde da Heloísa, como a lista de registros vai mostrar: quem fez o quê, e quando. */
  tarde: {
    titulo: 'Tarde da Heloísa',
    rotulo: 'Hoje, com Bruno e Carla',
    itens: [
      { inicial: 'B', quem: 'Bruno', oQue: 'Começou a soneca', hora: '14:05' },
      { inicial: 'C', quem: 'Carla', oQue: 'Encerrou a soneca, 1 h 15 min', hora: '15:20' },
      { inicial: 'C', quem: 'Carla', oQue: 'Mamada, lado direito', hora: '15:30' },
    ],
  },
  nota: {
    rotulo: 'Nota em destaque',
    texto: 'Dormiu no carrinho e acordou com fome.',
    autor: 'Carla, para Juliana, às 15:22',
  },
  parar: {
    titulo: ['Quando alguém', 'para de cuidar.'],
    textos: [
      'Quem é responsável tira o acesso de alguém da família quando quiser, e a pessoa perde o acesso na hora.',
      'O que ela já viu não pode ser apagado. Um vínculo com prazo, como o de uma babá contratada por um período, vence sozinho.',
    ],
  },
} as const
