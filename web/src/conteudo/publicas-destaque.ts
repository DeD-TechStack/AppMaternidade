// Textos de Como funciona e de Cuidado compartilhado no "Campo de mel". As frases vêm do conteúdo
// antigo das páginas públicas (MAT-36), às vezes enxutas, com o mesmo sentido e o futuro ("vai", "o
// plano é") onde a função ainda não está no ar. As páginas não declaram frase em literal: tiram daqui.

const HOJE = '/app/hoje'

const CONTA_INDISPONIVEL = 'Criar conta e entrar ainda não estão disponíveis neste site.'
const TELAS_FICTICIAS = 'As telas mostradas aqui são exemplos com uma família fictícia.'

/** O rótulo do primário que abre o protótipo (o mesmo nas duas pontas da página). */
const ABRIR_PROTOTIPO = 'Abrir o protótipo de Hoje e Sessão'

// ---------------------------------------------------------------------------------------------
// Como funciona

export const COMO_FUNCIONA_DESTAQUE = {
  titulo: ['Do primeiro dia', 'à troca de turno.'],
  lide: 'Três momentos da rotina mostram o que o site vai fazer pela família: a primeira semana, a madrugada e a troca de turno.',
  primario: { rotulo: ABRIR_PROTOTIPO, destino: HOJE },
  secundario: { rotulo: 'Ver os três momentos', destino: '#tres-momentos' },
  /** O único aviso da página, fora das imagens e dos cartões. */
  aviso: `${CONTA_INDISPONIVEL} ${TELAS_FICTICIAS}`,
  cena: {
    base: '/cenas/publicas/como-funciona',
    largura: 512,
    altura: 768,
    alt: 'Um celular sobre um pedestal de oliva, num fundo de mel, com uma tela do site AppMaternidade.',
  },
  ultimaMamada: { rotulo: 'Última mamada', hora: '03:12', detalhe: 'Lado esquerdo, registrada por Juliana' },
  momentos: {
    titulo: ['Três momentos', 'da rotina.'],
    texto: 'Cada momento vem com uma tela de exemplo, da família de Juliana, Bruno e Carla, que cuidam da Heloísa.',
  },
  passos: [
    {
      id: 'primeira-semana',
      titulo: 'Na primeira semana',
      texto:
        'Na primeira semana, o site vai permitir criar a conta, cadastrar o bebê e convidar o outro responsável. A partir daí, os dois já vão poder fazer os primeiros registros de mamada e de fralda.',
    },
    {
      id: 'madrugada',
      titulo: 'De madrugada',
      texto:
        'O protótipo do Hoje já tem o modo madrugada: tela escura, pouco brilho e botões maiores. O plano é abrir o site no escuro, ver a última mamada e iniciar ou encerrar o registro com uma mão.',
    },
    {
      id: 'troca-de-turno',
      titulo: 'Na troca de turno',
      texto:
        'O plano é que quem chega para o turno veja, sem precisar perguntar, os registros desde que saiu, a sessão em andamento, como a soneca que Bruno começou e ainda não acabou, e as notas em destaque.',
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
    andamento: { rotulo: 'Soneca em andamento', tempo: '00:42', detalhe: 'Começou às 14:05, com Bruno' },
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
      'Para a conta, o plano é este: o acesso vai ser por e-mail e senha, e depois a pessoa escolhe entre criar a família ou entrar por um convite. Do bebê, o site vai pedir só o nome ou apelido e a data de nascimento. Os termos de uso e o consentimento para os dados do bebê vão aparecer em telas separadas.',
    ],
  },
  fechamento: {
    titulo: ['Veja as telas', 'por dentro.'],
    texto: 'O protótipo de Hoje e Sessão já pode ser aberto, com uma família fictícia e sem salvar nada.',
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
  lide: 'Mães, pais, avós, babás e outros adultos autorizados vão poder cuidar do mesmo bebê pelo site, cada um com a própria conta e o próprio papel.',
  /** O único aviso da página, fora das imagens e dos cartões. */
  aviso: TELAS_FICTICIAS,
  familia: {
    descricao: 'Exemplo da tela Família, com a família fictícia da Heloísa',
    titulo: 'Família',
    bebe: { nome: 'Heloísa', papel: 'Bebê, 3 meses' },
    pessoas: [
      { nome: 'Juliana', papel: 'Responsável' },
      { nome: 'Bruno', papel: 'Cuidador' },
      { nome: 'Carla', papel: 'Cuidador até domingo' },
    ],
    botao: 'Convidar',
  },
  convite: { titulo: 'Convite enviado para Carla', prazo: 'Acesso até domingo' },
  blocos: [
    {
      titulo: 'Convite com papel',
      texto:
        'Cada pessoa vai entrar na família com um papel. E cada adulto entra com a própria conta: ninguém vai precisar dividir uma senha da família.',
    },
    {
      titulo: 'Acesso com prazo',
      texto: 'Qualquer vínculo vai poder ter validade, como “cuidador até domingo”. Vencida a data, o acesso termina.',
    },
    {
      titulo: 'Revogue quando quiser',
      texto:
        'O responsável vai poder remover o acesso de qualquer pessoa da família. Ela perde o acesso assim que o aparelho dela se conectar à internet.',
    },
  ],
  papeis: {
    titulo: ['Três papéis', 'na família.'],
    texto:
      'Cada pessoa vai entrar na família com um papel. Qualquer vínculo vai poder ter validade, como “cuidador até domingo”, e, vencida a data, o acesso termina.',
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
      'Cada registro vai mostrar quem o fez. Numa sessão, como uma soneca, o site vai guardar quem iniciou e quem encerrou, mesmo que sejam pessoas diferentes. O protótipo já mostra o nome de quem fez cada registro.',
  },
  passagem: {
    titulo: 'Na passagem de turno',
    texto:
      'Cada adulto vai ver a mesma sessão no próprio celular ou notebook, como a soneca que Bruno começou. O plano é que quem chega encontre, numa tela só, as notas em destaque deixadas por quem estava antes e tudo o que aconteceu desde que saiu.',
  },
  soneca: {
    titulo: 'Soneca da Heloísa',
    duracao: '1 h 15 min',
    inicio: { rotulo: 'Começou às 14:05', quem: 'Bruno' },
    fim: { rotulo: 'Terminou às 15:20', quem: 'Carla' },
  },
  nota: { rotulo: 'Nota em destaque', texto: 'Mamou bem do lado direito às 15:30.', autor: 'Carla, para Juliana' },
  parar: {
    titulo: ['Quando alguém', 'para de cuidar.'],
    textos: [
      'O responsável vai poder remover o acesso de qualquer pessoa da família. A pessoa vai perder o acesso assim que o aparelho dela se conectar à internet.',
      'O que ela já viu ou guardou no aparelho enquanto estava sem internet não vai poder ser apagado na hora. Um vínculo com validade, como o de uma babá contratada por um período, vai vencer sozinho.',
    ],
  },
} as const
