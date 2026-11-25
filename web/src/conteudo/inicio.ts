// Copy of the Início (`/`): the strings of the deck COPY_inicio.md, section 2, and nothing else.
// The page sources (paginas/Inicio.tsx and the folders inicio-casa and troca) write no pt-BR text:
// they read it from here. `ini.leg3` (15:00, tummy time) is in the deck but is not rendered on this page
// (FREEZE 13.2: the bands run in time order), so it has no constant.

export const INI = {
  h1: 'Ela mamou que horas?',
  // The h1 is one string in two spans: the first sits on the day wall, the second on the night wall.
  h1Dia: 'Ela mamou',
  h1Noite: 'que horas?',
  lede: 'Quem cuida do bebê anota o que fez. Quem chega vê a hora e o nome.',
  cta1: 'Criar conta',
  cta2: 'Ver como funciona',
  leg1: '16:00, mamada, anotada por Ju',
  altCena1:
    'Juliana, de óculos, entrega Heloísa, acordada, a Ícaro. Os dois seguram a bebê e olham para ela. Do lado de Juliana a sala ainda está clara; do lado de Ícaro já é noite, com uma luz acesa.',
  altTela1:
    'Tela do Histórico do site num celular. Na lista do dia, a mamada das 16:00 está anotada por Juliana e a fralda das 17:30, por Ícaro.',

  // The action of the Histórico frame (ProdutoEmMoldura `rolavel`): the visible label and the two state cues.
  acaoTela1: 'Explorar a tela',
  inicialTela1: 'Vista inicial',
  detalheTela1: 'Mais detalhes',

  h2Noite: 'Agora é comigo.',
  pNoite: 'A Ju anotou o dia até a mamada das 16:00. Das 17:30 em diante, quem anota é o Ícaro, e o que ela escreveu continua ali para ele ler.',
  leg2: '17:30, fralda, anotada por Ícaro',
  altCena2: 'Ícaro, em pé, embala Heloísa, que chora encostada no peito dele. É noite, e os dois estão dentro da luz de uma luminária de chão.',

  h2Tela: 'Dormiu às 20:30.',
  pTela:
    'Enquanto ela dorme, a tela de hoje mostra o sono em andamento, a hora em que começou e quem anotou. Quem é da família abre o site e vê o mesmo, sem precisar acordar ninguém.',
  altTela2: 'Tela Hoje do site num celular, no modo madrugada: sono em andamento, com início às 20:30, por Ícaro.',

  h2So: 'E quando sou só eu?',
  pSo: 'Um dia anotado por uma pessoa só é um dia inteiro. Quando chegar mais alguém para cuidar, você convida e escolhe o papel dessa pessoa: responsável, cuidador ou observador.',
  altCena3: 'Heloísa de bruços num tapete firme, de cabeça erguida, olhando para a frente. Juliana está ao lado, na altura dos olhos dela, de olho na bebê.',

  h2Prova: 'Ninguém dá nota para o seu dia.',
  pProva: 'O site guarda o que aconteceu, com a hora e o nome de quem anotou. Não põe meta e não compara o seu bebê com nenhum outro.',
  li1: 'Dá para anotar sono, mamada, mamadeira, fralda, tummy time, alimentação sólida e observação.',
  li2: 'Recado para quem chega fica em nota, como a da Ju: “Pomada só à noite.”',
  li3: 'A intenção é não vender dados, não ter anúncios, não rastrear as pessoas entre apps e não usar inteligência artificial para responder às famílias.',
  li4: 'O AppMaternidade não faz diagnóstico e não substitui a orientação de um profissional de saúde.',

  h2Perg: 'Perguntas de quem chega agora.',
  q1: 'Quanto custa?',
  r1: 'O preço, se houver, ainda não foi definido.',
  q2: 'Quem vê os registros do bebê?',
  r2: 'Só quem tem vínculo com a família, e cada pessoa vê o que o papel dela permite. A comunidade não vai ter caminho para a rotina do bebê.',
  q3: 'Funciona de madrugada?',
  r3: 'Funciona. O modo madrugada escurece a tela e deixa o botão de iniciar mamada grande, na metade de baixo.',
  q4: 'Posso convidar a babá?',
  r4: 'Pode. O convite já leva o papel, e dá para pôr uma data para o acesso terminar. Um responsável remove o acesso quando quiser.',

  h2Fecho: 'Da próxima vez, já está anotado.',
  cta3: 'Criar conta',
} as const

/** The deck's list of four facts (band 5), in order. */
export const INI_FATOS = [INI.li1, INI.li2, INI.li3, INI.li4] as const

/** The deck's four questions (band 6), in order. */
export const INI_PERGUNTAS = [
  { pergunta: INI.q1, resposta: INI.r1 },
  { pergunta: INI.q2, resposta: INI.r2 },
  { pergunta: INI.q3, resposta: INI.r3 },
  { pergunta: INI.q4, resposta: INI.r4 },
] as const

/** The two destinations of the page's actions. */
export const INI_ROTAS = { criarConta: '/criar-conta', comoFunciona: '/como-funciona' } as const
