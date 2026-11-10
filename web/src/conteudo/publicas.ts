// Textos das páginas públicas (MAT-36). Os parágrafos vêm do legado, sem mudar palavra, exceto as
// mudanças do contrato (PAGINAS.md, seção 4). Os textos fixos (TF-xx), os títulos e os rótulos são os
// do contrato. As páginas não declaram frase em literal: tiram tudo daqui.

import { CHAMADA, PILARES } from './textos.ts'

export const NOME_SITE = 'AppMaternidade'

/**
 * O endereço de contato: uma constante só. Por enquanto é um marcador; o endereço real entra aqui
 * depois, sem mexer em página nem em teste (os testes leem esta constante).
 */
export const EMAIL_CONTATO = 'nome.sobrenome@exemplo.invalid'

function tituloDaAba(nome: string): string {
  return `${nome} | ${NOME_SITE}`
}

function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Um `h2` de página: o texto e o id (`secao-<slug>`) que os links-âncora usam. */
export interface Secao {
  titulo: string
  id: string
}

function secao(titulo: string, id?: string): Secao {
  return { titulo, id: id ?? `secao-${slug(titulo)}` }
}

// ---------------------------------------------------------------------------
// Rotas, `h1` e título da aba (um lugar só: rotas.tsx lê TITULOS)

export const CAMINHOS = {
  inicio: '/',
  comoFunciona: '/como-funciona',
  cuidado: '/cuidado-compartilhado',
  desenvolvimento: '/desenvolvimento',
  regras: '/regras-da-comunidade',
  privacidade: '/privacidade',
  termos: '/termos',
  exclusao: '/exclusao-de-conta',
  contato: '/contato',
  sobre: '/sobre',
  hoje: '/app/hoje',
  sessao: '/app/sessao',
} as const

/** As 9 páginas novas. */
export const PAGINAS_NOVAS: readonly string[] = [
  CAMINHOS.comoFunciona,
  CAMINHOS.cuidado,
  CAMINHOS.desenvolvimento,
  CAMINHOS.regras,
  CAMINHOS.privacidade,
  CAMINHOS.termos,
  CAMINHOS.exclusao,
  CAMINHOS.contato,
  CAMINHOS.sobre,
]

export const H1 = {
  comoFunciona: 'Como funciona',
  cuidado: 'Cuidado compartilhado',
  desenvolvimento: 'Desenvolvimento e tummy time',
  regras: 'Regras da comunidade',
  privacidade: 'Política de privacidade',
  termos: 'Termos de uso',
  exclusao: 'Exclusão de conta',
  contato: 'Contato',
  sobre: 'Sobre o AppMaternidade',
} as const

/** A linha sob o `h1` de cada página: uma linha só, nos dois tamanhos. */
export const SUBTITULOS = {
  comoFunciona: 'Três momentos da rotina.',
  cuidado: 'Um bebê, vários adultos.',
  desenvolvimento: 'Sem metas, sem comparação.',
  regras: 'Para quando ela abrir.',
  privacidade: 'O que o site vai guardar.',
  termos: 'As regras de uso do site.',
  exclusao: 'Como pedir a exclusão.',
  contato: 'Fale conosco.',
  sobre: 'Quem faz e para quem.',
} as const

export const TITULOS = {
  inicio: NOME_SITE,
  comoFunciona: tituloDaAba(H1.comoFunciona),
  cuidado: tituloDaAba(H1.cuidado),
  desenvolvimento: tituloDaAba(H1.desenvolvimento),
  regras: tituloDaAba(H1.regras),
  privacidade: tituloDaAba(H1.privacidade),
  termos: tituloDaAba(H1.termos),
  exclusao: tituloDaAba(H1.exclusao),
  contato: tituloDaAba(H1.contato),
  sobre: tituloDaAba('Sobre'),
  naoEncontrada: tituloDaAba('Página não encontrada'),
  hoje: tituloDaAba('Hoje'),
  sessao: tituloDaAba('Sessão'),
} as const

// ---------------------------------------------------------------------------
// Textos fixos

export const TF = {
  responsavel: 'Responsável pelo AppMaternidade: a definir.', // TF-02
  encarregado: 'Encarregado pelo tratamento de dados: Daniel Macedo.', // TF-03
  idadeMinima: 'Idade mínima para usar o AppMaternidade: a definir.', // TF-04
  prazoExclusao: 'O prazo da exclusão ainda será definido e publicado nesta página.', // TF-05
  pedidoExclusao:
    'O pedido de exclusão ainda não pode ser feito por este site. Ele vai ficar na tela Família e conta, para quem entrou na conta.', // TF-06
  contaIndisponivel: 'Criar conta e entrar ainda não estão disponíveis neste site.', // TF-07
  dadosFicticios: 'Nesta versão de avaliação, use só dados fictícios.', // TF-09
  construcao: 'Em construção: algumas funções descritas aqui ainda não estão no ar.', // TF-10
  semDiagnostico:
    'O AppMaternidade não faz diagnóstico e não substitui a orientação de um profissional de saúde.', // TF-11
  telasFicticias: 'As telas mostradas aqui são exemplos com uma família fictícia.', // TF-12
  faleConosco: 'Fale conosco:', // TF-13
  regiaoDosDados:
    'Nesta fase de avaliação, a demonstração roda num projeto Supabase nos Estados Unidos (região us-east-1), só com dados fictícios.', // TF-15
} as const

// ---------------------------------------------------------------------------
// Um parágrafo é um texto simples ou uma lista de trechos (texto, link ou o e-mail de contato).

type Trecho = string | { link: string; para: string } | { email: true }

/** Um parágrafo: um texto só ou uma sequência de trechos. */
export type Texto = string | readonly Trecho[]

/** Uma lista dentro de uma seção. */
export interface Lista {
  itens: readonly string[]
  ordenada?: boolean
}

/** O que uma seção de leitura pode ter: parágrafos e listas, na ordem. */
export type Bloco = Texto | Lista

/** Uma tabela: legenda, cabeçalhos das colunas e linhas (a primeira célula é o cabeçalho da linha). */
export interface DadosDeTabela {
  legenda: string
  colunas: readonly string[]
  linhas: ReadonlyArray<readonly string[]>
}

const EMAIL: Trecho = { email: true }

function ligacao(rotulo: string, para: string): Trecho {
  return { link: rotulo, para }
}

/** Uma seção de leitura: o `h2` e os blocos de texto abaixo dele. */
export interface SecaoDeLeitura {
  secao: Secao
  blocos: readonly Bloco[]
}

// ---------------------------------------------------------------------------
// Rótulos e navegação entre as páginas

export const ROTULOS = {
  indice: 'Nesta página',
  paginas: 'Páginas do site',
} as const

/** Os 9 links de `PaginasDoSite`, na ordem. */
export const PAGINAS_DO_SITE: ReadonlyArray<{ rotulo: string; para: string }> = [
  { rotulo: H1.comoFunciona, para: CAMINHOS.comoFunciona },
  { rotulo: H1.cuidado, para: CAMINHOS.cuidado },
  { rotulo: H1.desenvolvimento, para: CAMINHOS.desenvolvimento },
  { rotulo: H1.regras, para: CAMINHOS.regras },
  { rotulo: H1.privacidade, para: CAMINHOS.privacidade },
  { rotulo: H1.termos, para: CAMINHOS.termos },
  { rotulo: H1.exclusao, para: CAMINHOS.exclusao },
  { rotulo: H1.contato, para: CAMINHOS.contato },
  { rotulo: 'Sobre', para: CAMINHOS.sobre },
]

// ---------------------------------------------------------------------------
// Descrição de cada mídia (o `aria-label`: não há texto dentro da moldura)

export const MIDIAS = {
  mamada: 'Ilustração: uma pessoa dá mamada ao bebê na poltrona, de madrugada, ao lado da janela.',
  berco: 'Ilustração: o bebê dorme no berço e um adulto sai do quarto pela porta aberta.',
  colo: 'Ilustração: um adulto sentado no banquinho com o bebê nos braços.',
  passeio: 'Ilustração: um adulto empurra o carrinho, com o bebê espiando sob a capota.',
  tapete: 'Ilustração: o bebê de bruços no tapete, levantando a cabeça, com um adulto ao lado.',
} as const

// ---------------------------------------------------------------------------
// Como funciona

export const COMO_FUNCIONA = {
  apresentacao:
    'São três momentos da rotina para mostrar o que o site vai fazer: a primeira semana, a madrugada e a troca de turno. As telas de exemplo são do protótipo de Hoje e Sessão, que já pode ser aberto.',
  primeiraSemana: {
    secao: secao('Na primeira semana'),
    textos: [
      'Na primeira semana, o site vai permitir criar a conta, cadastrar o bebê e convidar o outro responsável. A partir daí, os dois já vão poder fazer os primeiros registros de mamada e de fralda.',
    ],
  },
  madrugada: {
    secao: secao('De madrugada'),
    texto:
      'No celular, uma sessão em andamento nas cores da madrugada. O protótipo do Hoje já tem esse modo: tela escura, pouco brilho e botões maiores. O plano é abrir o site no escuro, ver a última mamada e iniciar ou encerrar o registro com uma mão.',
  },
  trocaDeTurno: {
    secao: secao('Na troca de turno'),
    texto:
      'No celular, o cartão do Hoje com a soneca que Bruno começou e que ainda não acabou. O plano é que quem chega para o turno veja os registros desde que saiu, a sessão em andamento e as notas em destaque, sem precisar perguntar.',
  },
  comecar: {
    secao: secao('Para começar'),
    textos: [
      'O site abre no navegador, sem instalar nada.',
      'Para a conta, o plano é este: o acesso vai ser por e-mail e senha, e depois a pessoa escolhe entre criar a família ou entrar por um convite. Do bebê, o site vai pedir só o nome ou apelido e a data de nascimento. Os termos de uso e o consentimento para os dados do bebê vão aparecer em telas separadas.',
      TF.contaIndisponivel,
    ],
  },
  telas: {
    secao: secao('Veja as telas do protótipo'),
    texto: 'O protótipo de Hoje e Sessão já pode ser aberto, com uma família fictícia e sem salvar nada.',
    link: CHAMADA.link,
    para: CAMINHOS.hoje,
  },
}

// ---------------------------------------------------------------------------
// Cuidado compartilhado

export const CUIDADO = {
  apresentacao:
    'Mães, pais, avós, babás e outros adultos autorizados vão poder cuidar do mesmo bebê pelo site. Esta página mostra como esse cuidado vai ser dividido.',
  conta: {
    secao: secao('Cada pessoa com a própria conta'),
    texto:
      'A intenção é que cada adulto entre com a própria conta, com o próprio e-mail e a própria senha. Ninguém vai precisar dividir uma senha da família.',
  },
  papeis: {
    secao: secao('Três papéis na família'),
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
    } satisfies DadosDeTabela,
  },
  registro: {
    secao: secao('Quem fez cada registro'),
    texto:
      'Cada registro vai mostrar quem o fez. Numa sessão, como uma soneca, o site vai guardar quem iniciou e quem encerrou, mesmo que sejam pessoas diferentes. O protótipo já mostra o nome de quem fez cada registro.',
  },
  passagem: {
    secao: secao('Na passagem de turno'),
    texto:
      'No notebook e no celular, o mesmo cartão do Hoje com a soneca que Bruno começou: cada adulto vai ver a mesma sessão no próprio aparelho. O plano é que quem chega encontre, numa tela só, as notas em destaque deixadas por quem estava antes e tudo o que aconteceu desde que saiu.',
  },
  parar: {
    secao: secao('Quando alguém para de cuidar'),
    textos: [
      'O responsável vai poder remover o acesso de qualquer pessoa da família. A pessoa vai perder o acesso assim que o aparelho dela se conectar à internet.',
      'O que ela já viu ou guardou no aparelho enquanto estava sem internet não vai poder ser apagado na hora. Um vínculo com validade, como o de uma babá contratada por um período, vai vencer sozinho.',
    ],
  },
}

// ---------------------------------------------------------------------------
// Desenvolvimento e tummy time

export const DESENVOLVIMENTO = {
  apresentacao:
    'Tummy time é o tempo que o bebê passa de bruços, acordado e com um adulto olhando. No site, ele vai ser mais um registro da rotina. Esta página explica como isso vai funcionar e de onde vai vir o conteúdo sobre desenvolvimento.',
  rotina: {
    secao: secao('Tummy time na rotina'),
    texto:
      'Qualquer cuidador vai poder registrar o tummy time, com o cronômetro ou só marcando “fizemos”. Uma regra já vale: tummy time só com o bebê acordado e um adulto olhando.',
  },
  semMetas: {
    secao: secao('Sem metas e sem comparação'),
    textos: [
      'O site não vai ter meta de minutos, estrelas, sequência de dias nem comparação com outros bebês, e não vai marcar nada como atraso.',
      'As fontes de saúde não concordam sobre quanto tempo de tummy time fazer por dia. Por isso o site não vai fixar um número. Quando alguma coisa ainda não acontece, “ainda não” é uma resposta neutra.',
    ],
  },
  conteudo: {
    secao: secao('De onde vem o conteúdo'),
    textos: [
      'O conteúdo educativo vai ser texto próprio, escrito em português a partir das fontes de saúde. Cada item vai mostrar quem escreveu, a versão e as fontes usadas.',
      'A intenção é não usar inteligência artificial para responder às famílias.',
    ],
  },
  profissional: {
    secao: secao('Quando procurar um profissional'),
    textos: ['Em qualquer dúvida ou preocupação com o bebê, procure o pediatra ou o serviço de saúde.', TF.semDiagnostico],
  },
}

// ---------------------------------------------------------------------------
// Regras da comunidade

export const REGRAS = {
  apresentacao:
    'A comunidade do AppMaternidade ainda não abriu. Esta página mostra as regras que vão valer quando ela abrir e como a moderação vai funcionar.',
  antes: {
    secao: secao('Antes de publicar'),
    blocos: [
      'Antes da primeira publicação, cada pessoa vai aceitar estas regras. A comunidade vai ser vista só por quem entrou na conta e não vai aparecer em buscadores.',
      'Nada da rotina do bebê vai para lá por conta própria. Se a pessoa quiser contar algo, ela mesma escreve, ou escolhe um resumo e vê a prévia exata antes de publicar.',
    ],
  } satisfies SecaoDeLeitura,
  sete: {
    secao: secao('As sete regras'),
    blocos: [
      'Estas regras vão valer quando a comunidade abrir:',
      {
        ordenada: true,
        itens: [
          'Conte a sua experiência, sem dar diagnóstico. Todo post vai começar como relato pessoal.',
          'Não indique remédio, dose ou tratamento. Na dúvida, procure um profissional de saúde.',
          'Não exponha crianças nem outras pessoas: nada de nome completo, escola, endereço ou rotina de outras famílias.',
          'Não venda, não troque e não faça propaganda, nem de remédio nem de fórmula infantil.',
          'Respeite as pessoas: sem ataque, assédio, discriminação ou pressão do tipo “você deveria”.',
          'Não tire print nem reposte o conteúdo de outra pessoa sem a permissão dela.',
          'Use a denúncia para proteger. Denúncia feita como retaliação também é violação das regras.',
        ],
      },
    ],
  } satisfies SecaoDeLeitura,
  denunciar: {
    secao: secao('Denunciar, bloquear e silenciar'),
    blocos: [
      'Qualquer pessoa vai poder denunciar um tópico, uma resposta ou um perfil, por um destes oito motivos:',
      {
        itens: [
          'ataque ou assédio',
          'informação de saúde perigosa',
          'conteúdo sexual',
          'exposição de criança',
          'dados pessoais',
          'spam ou venda',
          'risco de autolesão',
          'outro',
        ],
      },
      'O bloqueio vai valer para os dois lados: as duas pessoas vão deixar de ver o conteúdo uma da outra, e quem foi bloqueado não vai receber aviso. Também vai dar para silenciar uma pessoa ou as palavras que você prefere não ver.',
    ],
  } satisfies SecaoDeLeitura,
  moderacao: {
    secao: secao('Como a moderação trabalha'),
    blocos: [
      'A moderação vai usar ações graduais, avisar o autor de cada decisão e dar a ele o direito de contestar. Quem modera não vai ler dados de família.',
      'O horário de atendimento e o prazo de resposta ainda serão publicados.',
    ],
  } satisfies SecaoDeLeitura,
  ajuda: {
    secao: secao('Se você precisa de ajuda agora', 'secao-ajuda-agora'),
    texto:
      'A comunidade não é atendimento de saúde. Se você ou alguém perto de você precisa de ajuda, procure um destes canais oficiais.',
    tabela: {
      legenda: 'Canais oficiais de ajuda',
      colunas: ['Canal', 'Número', 'Quando usar'],
      linhas: [
        ['CVV', '188', 'Sofrimento emocional e pensamentos de suicídio. Atende por telefone, chat e e-mail.'],
        ['SAMU', '192', 'Urgência de saúde.'],
        ['Ligue 180', '180', 'Violência contra a mulher.'],
        ['Disque 100', '100', 'Violação de direitos de crianças e adolescentes.'],
      ],
    } satisfies DadosDeTabela,
  },
  denuncias: {
    secao: secao('Contato para denúncias'),
    blocos: [
      'O plano é que a denúncia também possa chegar por um canal fora da comunidade.',
      ['Canal para denúncias: ', EMAIL, '.'],
    ],
  } satisfies SecaoDeLeitura,
}

// ---------------------------------------------------------------------------
// Política de privacidade

export const PRIVACIDADE: readonly SecaoDeLeitura[] = [
  {
    secao: secao('Quem responde pelos dados'),
    blocos: [TF.responsavel, TF.encarregado, ['Para falar sobre os seus dados: ', EMAIL, '.']],
  },
  {
    secao: secao('Que dados o site vai guardar'),
    blocos: [
      'O site vai guardar estes grupos de dados:',
      {
        itens: [
          'da conta do adulto: nome, e-mail e senha de acesso;',
          'da família: os papéis de cada pessoa e os convites;',
          'do bebê: o nome ou apelido e a data de nascimento;',
          'os registros de cuidado dos 7 tipos, com horários, notas e quem fez cada um;',
          'as notas de passagem de turno;',
          'da comunidade: o perfil público, os tópicos, as respostas, as denúncias e os bloqueios;',
          'os registros técnicos de acesso;',
          'a prova do consentimento: quem deu, quando e em que versão do texto;',
          'o código de notificação do aparelho, só se a pessoa ligar as notificações.',
        ],
      },
    ],
  },
  {
    secao: secao('O que fica de fora'),
    blocos: [
      'A proposta é não pedir CPF, documento nem localização. Foto, sexo e peso do bebê ficam fora desta versão.',
    ],
  },
  {
    secao: secao('Para que os dados vão servir'),
    blocos: [
      'Os dados vão servir para o cuidado da família e a comunidade funcionarem.',
      'A intenção é não vender dados, não ter anúncios, não rastrear as pessoas entre apps e não usar inteligência artificial para responder às famílias. Se um dia o site medir o uso, a proposta é fazer isso só com o consentimento de cada pessoa.',
    ],
  },
  {
    secao: secao('Quem vê os dados'),
    blocos: [
      'Os dados de cuidado vão ser vistos só por quem tem vínculo com a família, e cada pessoa vai ver e fazer o que o papel dela permite. A comunidade não vai ter caminho para a rotina do bebê, e quem modera a comunidade não vai ler dados de família.',
    ],
  },
  {
    secao: secao('Os dados do bebê'),
    blocos: [
      'A proposta é tratar o bebê como titular dos dados dele, representado pelo responsável legal. O plano é que só o pai, a mãe ou o responsável legal cadastre o bebê e dê o consentimento para os dados dele, numa tela própria, separada dos termos de uso.',
    ],
  },
  {
    secao: secao('Onde os dados vão ficar'),
    blocos: [
      TF.regiaoDosDados,
      'O plano é que, na produção, os dados fiquem no Supabase, na região de São Paulo. Alguns serviços, como os de notificação e de e-mail, podem tratar dados fora do Brasil, e a lista desses serviços ainda será publicada.',
    ],
  },
  {
    secao: secao('Por quanto tempo'),
    blocos: [
      'A proposta é guardar os dados enquanto a família estiver ativa. Se a lei exigir guardar algum registro, ele vai ficar guardado pelo prazo legal. Os prazos ainda serão definidos e publicados.',
    ],
  },
  {
    secao: secao('Seus direitos'),
    blocos: [
      'O site vai permitir pedir a confirmação de que seus dados são tratados, o acesso a eles, a correção e a eliminação, além de revogar o consentimento. Levar os dados para outro serviço ainda está em avaliação, porque depende de regulamentação.',
      [
        'Esses pedidos vão ficar na tela Família e conta, para quem entrou na conta. Para apagar a conta, veja a página ',
        ligacao('Exclusão de conta', CAMINHOS.exclusao),
        '.',
      ],
    ],
  },
  {
    secao: secao('Mudanças nesta política'),
    blocos: [
      'Se a finalidade do uso dos dados mudar, o site vai mostrar um aviso em destaque e dar a opção de revogar o consentimento.',
    ],
  },
]

// ---------------------------------------------------------------------------
// Termos de uso

export const TERMOS: readonly SecaoDeLeitura[] = [
  {
    secao: secao('O que é o AppMaternidade'),
    blocos: [
      'O AppMaternidade vai ser um site para a família registrar a rotina do bebê, dividir os cuidados entre os adultos, acompanhar o desenvolvimento e conversar numa comunidade separada da rotina privada. Hoje existe o protótipo das telas Hoje e Sessão, com uma família fictícia.',
      TF.semDiagnostico,
    ],
  },
  {
    secao: secao('Quem pode usar'),
    blocos: ['O plano é que só adultos tenham conta. Não vai haver conta de criança.', TF.idadeMinima],
  },
  {
    secao: secao('Sua conta'),
    blocos: ['O plano é uma conta por pessoa, sem dividir o acesso com ninguém. O acesso vai ser por e-mail e senha.'],
  },
  {
    secao: secao('Família, papéis e convites'),
    blocos: [
      'O responsável vai poder convidar outras pessoas, mudar o papel delas e remover o acesso. Só o pai, a mãe ou o responsável legal vai poder cadastrar o bebê.',
    ],
  },
  {
    secao: secao('Comunidade'),
    blocos: [
      [
        'Antes da primeira publicação, cada pessoa vai aceitar as ',
        ligacao('Regras da comunidade', CAMINHOS.regras),
        '. A moderação vai poder ocultar ou remover o que as violar. Usar a denúncia como retaliação também viola as regras.',
      ],
    ],
  },
  {
    secao: secao('Excluir a conta'),
    blocos: [
      [
        'Como pedir a exclusão, o que vai ser apagado e em que prazo estão na página ',
        ligacao('Exclusão de conta', CAMINHOS.exclusao),
        '.',
      ],
    ],
  },
  {
    secao: secao('Mudanças nos termos'),
    blocos: ['As mudanças nos termos vão ser publicadas nesta página, com a data da mudança.'],
  },
  {
    secao: secao('Contato'),
    blocos: [TF.responsavel, ['Para falar sobre estes termos: ', EMAIL, '.']],
  },
]

// ---------------------------------------------------------------------------
// Exclusão de conta

export const EXCLUSAO: readonly SecaoDeLeitura[] = [
  {
    secao: secao('Como pedir'),
    blocos: [
      TF.pedidoExclusao,
      TF.responsavel,
      'Esta página abre sem login, para qualquer pessoa ler. O pedido vai exigir que a pessoa confirme que a conta é dela, e o jeito de confirmar ainda será definido.',
    ],
  },
  {
    secao: secao('O que vai ser apagado'),
    blocos: [
      'Ao excluir a conta, o site vai apagar:',
      {
        itens: [
          'a conta e os dados ligados a ela;',
          'os posts e as respostas da pessoa na comunidade; nos tópicos de outras pessoas, a resposta dela vai aparecer como “[removido]”;',
          'se ela for o último responsável da família, o espaço da família inteiro, depois de oferecer a exportação dos dados;',
          'se ela for cuidadora, os dados pessoais dela, e a autoria dos registros que fez vai virar um rótulo neutro. Esta proposta ainda está em avaliação.',
        ],
      },
    ],
  },
  {
    secao: secao('O que pode ficar guardado'),
    blocos: [
      'Se a lei exigir, alguns registros podem ficar guardados, como os registros de acesso, os relatórios de abuso e o que uma ordem judicial pedir. Eles vão ficar separados e com prazo.',
    ],
  },
  {
    secao: secao('Prazo'),
    blocos: [TF.prazoExclusao, 'O plano é que a pessoa receba um comprovante quando a exclusão terminar.'],
  },
  {
    secao: secao('Antes de excluir'),
    blocos: ['O responsável vai poder exportar os dados da família antes de excluir a conta, na tela Família e conta.'],
  },
]

// ---------------------------------------------------------------------------
// Contato

export const CONTATO_PAGINA = {
  proposito: {
    secao: secao('Para que serve este canal'),
    texto: 'Este canal vai atender pedidos de suporte, dúvidas sobre privacidade e denúncias sobre a comunidade.',
  },
  urgencia: {
    secao: secao('Em uma urgência'),
    texto: [
      'Este canal não é atendimento de urgência. Numa urgência de saúde, ligue para o SAMU, no 192. Em sofrimento emocional, o CVV atende no 188. Veja todos os canais oficiais nas ',
      ligacao('Regras da comunidade', `${CAMINHOS.regras}#${REGRAS.ajuda.secao.id}`),
      '.',
    ] satisfies Texto,
  },
}

// ---------------------------------------------------------------------------
// Sobre

/** A frase de cada pilar, na ordem de PILARES (textos.ts). */
const FRASES_DOS_PILARES = [
  'Vai permitir registrar sono, mamadas, fraldas e os outros cuidados do dia em poucos toques.',
  'Vai trazer o tummy time, o tempo que o bebê passa de bruços, acordado e com um adulto olhando, e conteúdo sobre desenvolvimento sem metas.',
  'Vai dividir o cuidado entre os adultos da família, cada um com a própria conta e um papel.',
  'Vai abrir uma comunidade organizada por assunto, separada da rotina privada da família.',
] as const

export const SOBRE = {
  apresentacao:
    'O AppMaternidade quer juntar num lugar só a rotina do bebê, o desenvolvimento, o cuidado dividido entre os adultos e uma comunidade separada da rotina privada.',
  paraQuem: {
    secao: secao('Para quem é'),
    texto:
      'O plano é começar no Brasil, em português, para mães, pais e outros cuidadores adultos de bebês nos primeiros meses. O público ainda está em avaliação, e a idade mínima também.',
  },
  oQueFaz: {
    secao: secao('O que ele faz'),
    pilares: PILARES.map((rotulo, indice) => ({ rotulo, texto: FRASES_DOS_PILARES[indice] })),
    depois: 'Hoje já existe o protótipo das telas Hoje e Sessão, com uma família fictícia.',
  },
  oQueNaoFaz: {
    secao: secao('O que ele não faz'),
    textos: [
      TF.semDiagnostico,
      'A intenção é não ter inteligência artificial respondendo às famílias, não mostrar anúncios e não vender dados.',
    ],
  },
  quemFaz: {
    secao: secao('Quem faz'),
    textos: ['O AppMaternidade é um projeto acadêmico em desenvolvimento, e esta versão serve para avaliação.', TF.responsavel],
  },
}
