// Textos das seis páginas públicas de leitura: Regras da comunidade, Privacidade, Termos, Exclusão de
// conta, Contato e Sobre. Os parágrafos vêm do site anterior (MAT-36) sem mudar palavra. Os textos fixos
// (TF-xx) e os rótulos também. Única mudança: o endereço de e-mail só aparece em Contato; nas outras
// páginas, onde o texto antigo trazia o endereço, entra o link “Contato”. As páginas não declaram frase
// em literal: tiram tudo daqui. A frase de dados fictícios é um parágrafo comum da seção a que se refere.

import type { NomeIlustracao } from '../componentes/campo/Ilustracao.tsx'
import { ROTULO_CRIAR_CONTA } from '../componentes/casca/textos.ts'

/** O endereço de contato de demonstração: uma constante só, usada apenas na página Contato. */
export const EMAIL_CONTATO = 'danielmacedosilva11@gmail.com'

/** O rótulo do índice da página (a lista de âncoras para cada seção). */
export const ROTULO_INDICE = 'Nesta página'

function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Um `h2` de página: o texto e o id (`secao-<slug>`) que os links do índice usam. */
interface Secao {
  titulo: string
  id: string
}

function secao(titulo: string, id?: string): Secao {
  return { titulo, id: id ?? `secao-${slug(titulo)}` }
}

const CAMINHO_CONTA = '/app/conta'
const CAMINHO_CRIAR_CONTA = '/criar-conta'
const CAMINHO_CONTATO = '/contato'
const CAMINHO_EXCLUSAO = '/exclusao-de-conta'
const CAMINHO_REGRAS = '/regras-da-comunidade'

// ---------------------------------------------------------------------------
// Textos fixos (TF-xx do contrato, entram como estão)

const TF = {
  responsavel: 'Responsável pelo AppMaternidade: a definir.',
  encarregado: 'Encarregado pelo tratamento de dados: Daniel Macedo.',
  idadeMinima: 'Idade mínima para usar o AppMaternidade: a definir.',
  prazoExclusao: 'O prazo da exclusão ainda será definido e publicado nesta página.',
  pedidoExclusao:
    'O pedido de exclusão ainda não pode ser feito por este site. Ele vai ficar na tela Família e conta, para quem entrou na conta.',
  dadosFicticios: 'Nesta versão de avaliação, use só dados fictícios.',
  semDiagnostico:
    'O AppMaternidade não faz diagnóstico e não substitui a orientação de um profissional de saúde.',
  regiaoDosDados:
    'Nesta fase de avaliação, a demonstração roda num projeto Supabase nos Estados Unidos (região us-east-1), só com dados fictícios.',
} as const

const PILARES = ['Rotina', 'Desenvolvimento', 'Cuidado compartilhado', 'Comunidade'] as const

/** A frase de cada pilar, na ordem de PILARES. */
const FRASES_DOS_PILARES = [
  'Vai permitir registrar sono, mamadas, fraldas e os outros cuidados do dia em poucos toques.',
  'Vai trazer o tummy time, o tempo que o bebê passa de bruços, acordado e com um adulto olhando, e conteúdo sobre desenvolvimento sem metas.',
  'Vai dividir o cuidado entre os adultos da família, cada um com a própria conta e um papel.',
  'Vai abrir uma comunidade organizada por assunto, separada da rotina privada da família.',
] as const

// ---------------------------------------------------------------------------
// Blocos de leitura

/** Um trecho de parágrafo: texto ou link para outra página (ou âncora). */
type Trecho = string | { link: string; para: string }

/** Um parágrafo: um texto só ou uma sequência de trechos. */
export type Texto = string | readonly Trecho[]

/** Uma lista dentro de uma seção. */
interface Lista {
  itens: readonly string[]
  ordenada?: boolean
}

/** Itens com título (um `h3` e um parágrafo cada). */
interface Titulados {
  titulados: ReadonlyArray<{ titulo: string; texto: string }>
}

/** O que uma seção de leitura pode ter, na ordem: parágrafos, listas e itens com título. */
export type Bloco = Texto | Lista | Titulados

/** O botão de ação principal da abertura: um rótulo que já existe no site e a rota para onde ele leva. */
interface AcaoPrincipal {
  botao: string
  para: string
}

/** O botão de ação principal das páginas de texto que não são Exclusão nem Contato: "Criar conta". */
const ACAO_CRIAR_CONTA: AcaoPrincipal = { botao: ROTULO_CRIAR_CONTA, para: CAMINHO_CRIAR_CONTA }

/** Uma tabela: legenda, cabeçalhos das colunas e linhas (a primeira célula é o cabeçalho da linha). */
export interface DadosDeTabela {
  legenda: string
  colunas: readonly string[]
  linhas: ReadonlyArray<readonly string[]>
}

/** Uma seção de leitura: o `h2` (texto e id), os blocos de texto e, quando há, a tabela depois deles. */
export interface SecaoDeLeitura {
  secao: { titulo: string; id: string }
  blocos: readonly Bloco[]
  tabela?: DadosDeTabela
}

/** Uma página de leitura inteira. */
export interface PaginaDeTexto {
  /** O `h1`: o nome da página. */
  nome: string
  /** A segunda linha do título, em itálico. */
  subtitulo: string
  /** O desenho do painel de mel (a frase de apoio e o desenho): uma peça só por página. */
  ilustracao: NomeIlustracao
  /** A frase de apoio, repetida em itálico no painel de mel: uma linha curta. */
  apoio: string
  /**
   * Depois de qual seção (1 = a primeira) o painel de mel entra na leitura. Sem isto, o painel fica na abertura,
   * ao lado do título (1100 px ou mais) ou logo abaixo dele. A página de tarefa (Exclusão) o põe depois do passo a passo.
   */
  painelDepoisDe?: number
  /** O botão de ação principal, na abertura. Contato não tem: o botão dela é o do bloco de e-mail. */
  acao?: AcaoPrincipal
  /** Os primeiros itens de uma lista da página, mostrados na abertura; a lista inteira fica na sua seção. */
  itensNaAbertura?: readonly string[]
  /** A página mostra o bloco de e-mail de contato na abertura, no lugar do botão de ação. */
  blocoDeEmail?: true
  /** O parágrafo de abertura, antes das seções. */
  apresentacao?: string
  secoes: readonly SecaoDeLeitura[]
}

function ligacao(rotulo: string, para: string): Trecho {
  return { link: rotulo, para }
}

/** O link “Contato”: nas páginas que não são Contato, ele toma o lugar do endereço de e-mail. */
const LINK_CONTATO = ligacao('Contato', CAMINHO_CONTATO)

// ---------------------------------------------------------------------------
// Regras da comunidade

const REGRAS: PaginaDeTexto = {
  nome: 'Regras da comunidade',
  subtitulo: 'Para quando ela abrir.',
  ilustracao: 'maos-celular',
  apoio: 'Regras claras para quem participa.',
  acao: ACAO_CRIAR_CONTA,
  apresentacao:
    'A comunidade do AppMaternidade ainda não abriu. Esta página mostra as regras que vão valer quando ela abrir e como a moderação vai funcionar.',
  secoes: [
    {
      secao: secao('Antes de publicar'),
      blocos: [
        'Antes da primeira publicação, cada pessoa vai aceitar estas regras. A comunidade vai ser vista só por quem entrou na conta e não vai aparecer em buscadores.',
        'Nada da rotina do bebê vai para lá por conta própria. Se a pessoa quiser contar algo, ela mesma escreve, ou escolhe um resumo e vê a prévia exata antes de publicar.',
      ],
    },
    {
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
    },
    {
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
    },
    {
      secao: secao('Como a moderação trabalha'),
      blocos: [
        'A moderação vai usar ações graduais, avisar o autor de cada decisão e dar a ele o direito de contestar. Quem modera não vai ler dados de família.',
        'O horário de atendimento e o prazo de resposta ainda serão publicados.',
      ],
    },
    {
      secao: secao('Se você precisa de ajuda agora', 'secao-ajuda-agora'),
      blocos: [
        'A comunidade não é atendimento de saúde. Se você ou alguém perto de você precisa de ajuda, procure um destes canais oficiais.',
      ],
      tabela: {
        legenda: 'Canais oficiais de ajuda',
        colunas: ['Canal', 'Número', 'Quando usar'],
        linhas: [
          ['CVV', '188', 'Sofrimento emocional e pensamentos de suicídio. Atende por telefone, chat e e-mail.'],
          ['Samu', '192', 'Urgência de saúde.'],
          ['Ligue 180', '180', 'Violência contra a mulher.'],
          ['Disque 100', '100', 'Violação de direitos de crianças e adolescentes.'],
        ],
      },
    },
    {
      secao: secao('Contato para denúncias'),
      blocos: [
        'O plano é que a denúncia também possa chegar por um canal fora da comunidade.',
        ['Canal para denúncias: ', LINK_CONTATO, '.'],
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Privacidade

/** Os grupos de dados que o site vai guardar: a lista inteira fica na primeira seção; a abertura mostra os 3 primeiros. */
const DADOS_GUARDADOS = [
  'da conta do adulto: nome, e-mail e senha de acesso;',
  'da família: os papéis de cada pessoa e os convites;',
  'do bebê: o nome ou apelido e a data de nascimento;',
  'os registros de cuidado dos 7 tipos, com horários, notas e quem fez cada um;',
  'as notas de passagem de turno;',
  'da comunidade: o perfil público, os tópicos, as respostas, as denúncias e os bloqueios;',
  'os registros técnicos de acesso;',
  'a prova do consentimento: quem deu, quando e em que versão do texto;',
  'o código de notificação do aparelho, só se a pessoa ligar as notificações.',
] as const

const PRIVACIDADE: PaginaDeTexto = {
  nome: 'Privacidade',
  subtitulo: 'O que o site vai guardar.',
  ilustracao: 'mae-noite',
  apoio: 'Seus dados, explicados sem pressa.',
  acao: ACAO_CRIAR_CONTA,
  itensNaAbertura: DADOS_GUARDADOS.slice(0, 3),
  secoes: [
    {
      secao: secao('Que dados o site vai guardar'),
      blocos: ['O site vai guardar estes grupos de dados:', { itens: DADOS_GUARDADOS }],
    },
    {
      secao: secao('O que fica de fora'),
      blocos: ['A proposta é não pedir CPF, documento nem localização. Foto, sexo e peso do bebê ficam fora desta versão.'],
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
        TF.dadosFicticios,
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
      secao: secao('Quem responde pelos dados'),
      blocos: [TF.responsavel, TF.encarregado, ['Para falar sobre os seus dados: ', LINK_CONTATO, '.']],
    },
    {
      secao: secao('Seus direitos'),
      blocos: [
        'O site vai permitir pedir a confirmação de que seus dados são tratados, o acesso a eles, a correção e a eliminação, além de revogar o consentimento. Levar os dados para outro serviço ainda está em avaliação, porque depende de regulamentação.',
        [
          'Esses pedidos vão ficar na tela Família e conta, para quem entrou na conta. Para apagar a conta, veja a página ',
          ligacao('Exclusão de conta', CAMINHO_EXCLUSAO),
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
  ],
}

// ---------------------------------------------------------------------------
// Termos de uso

const TERMOS: PaginaDeTexto = {
  nome: 'Termos de uso',
  subtitulo: 'As regras de uso do site.',
  ilustracao: 'pai-colo',
  apoio: 'Combinados simples para usar o site.',
  acao: ACAO_CRIAR_CONTA,
  secoes: [
    {
      secao: secao('O que é o AppMaternidade'),
      blocos: [
        'O AppMaternidade vai ser um site para a família registrar a rotina do bebê, dividir os cuidados entre os adultos, acompanhar o desenvolvimento e conversar numa comunidade separada da rotina privada. Hoje existe o protótipo das telas Hoje e Sessão, com uma família fictícia.',
        TF.semDiagnostico,
      ],
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
          ligacao('Regras da comunidade', CAMINHO_REGRAS),
          '. A moderação vai poder ocultar ou remover o que as violar. Usar a denúncia como retaliação também viola as regras.',
        ],
      ],
    },
    {
      secao: secao('Sua conta'),
      blocos: [
        TF.dadosFicticios,
        'O plano é uma conta por pessoa, sem dividir o acesso com ninguém. O acesso vai ser por e-mail e senha.',
      ],
    },
    {
      secao: secao('Quem pode usar'),
      blocos: ['O plano é que só adultos tenham conta. Não vai haver conta de criança.', TF.idadeMinima],
    },
    {
      secao: secao('Excluir a conta'),
      blocos: [
        [
          'Como pedir a exclusão, o que vai ser apagado e em que prazo estão na página ',
          ligacao('Exclusão de conta', CAMINHO_EXCLUSAO),
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
      blocos: [TF.responsavel, ['Para falar sobre estes termos: ', LINK_CONTATO, '.']],
    },
  ],
}

// ---------------------------------------------------------------------------
// Exclusão de conta

const EXCLUSAO: PaginaDeTexto = {
  nome: 'Exclusão de conta',
  subtitulo: 'Como pedir a exclusão.',
  ilustracao: 'avo-carrinho',
  apoio: 'Você decide o que fica.',
  // Página de tarefa: o botão fica na abertura (a Conta é a rota integrada /app/conta, decisão do líder, 11/11) e o
  // painel com o desenho só vem depois de "Antes de excluir" e "Como pedir": o passo a passo vem antes do desenho.
  acao: { botao: 'Ir para a Conta', para: CAMINHO_CONTA },
  painelDepoisDe: 2,
  secoes: [
    {
      secao: secao('Antes de excluir'),
      blocos: ['O responsável vai poder exportar os dados da família antes de excluir a conta, na tela Família e conta.'],
    },
    {
      secao: secao('Como pedir'),
      blocos: [
        TF.pedidoExclusao,
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
      blocos: [TF.prazoExclusao, 'O plano é que a pessoa receba um comprovante quando a exclusão terminar.', TF.responsavel],
    },
  ],
}

// ---------------------------------------------------------------------------
// Contato

const CONTATO: PaginaDeTexto = {
  nome: 'Contato',
  subtitulo: 'Fale conosco.',
  ilustracao: 'baba-tapete',
  apoio: 'Um canal para falar com a gente.',
  // O e-mail vem num bloco próprio na abertura (cartão com o rótulo, o endereço e o botão `mailto:`).
  blocoDeEmail: true,
  secoes: [
    {
      secao: secao('Em uma urgência'),
      blocos: [
        [
          'Este canal não é atendimento de urgência. Numa urgência de saúde, ligue para o Samu, no 192. Em sofrimento emocional, o CVV atende no 188. Veja todos os canais oficiais nas ',
          ligacao('Regras da comunidade', `${CAMINHO_REGRAS}#secao-ajuda-agora`),
          '.',
        ],
      ],
    },
    {
      secao: secao('Para que serve este canal'),
      blocos: ['Este canal vai atender pedidos de suporte, dúvidas sobre privacidade e denúncias sobre a comunidade.'],
    },
  ],
}

// ---------------------------------------------------------------------------
// Sobre

const SOBRE: PaginaDeTexto = {
  nome: 'Sobre',
  subtitulo: 'Quem faz e para quem.',
  ilustracao: 'tummy-time',
  apoio: 'Feito para o dia a dia do cuidado.',
  acao: ACAO_CRIAR_CONTA,
  apresentacao:
    'O AppMaternidade quer juntar num lugar só a rotina do bebê, o desenvolvimento, o cuidado dividido entre os adultos e uma comunidade separada da rotina privada.',
  secoes: [
    {
      secao: secao('Para quem é'),
      blocos: [
        'O plano é começar no Brasil, em português, para mães, pais e outros cuidadores adultos de bebês nos primeiros meses. O público ainda está em avaliação, e a idade mínima também.',
      ],
    },
    {
      secao: secao('O que ele faz'),
      blocos: [
        { titulados: PILARES.map((titulo, indice) => ({ titulo, texto: FRASES_DOS_PILARES[indice] })) },
        'Hoje já existe o protótipo das telas Hoje e Sessão, com uma família fictícia.',
      ],
    },
    {
      secao: secao('O que ele não faz'),
      blocos: [
        TF.semDiagnostico,
        'A intenção é não ter inteligência artificial respondendo às famílias, não mostrar anúncios e não vender dados.',
      ],
    },
    {
      secao: secao('Quem faz'),
      blocos: ['O AppMaternidade é um projeto acadêmico em desenvolvimento, e esta versão serve para avaliação.', TF.responsavel],
    },
  ],
}

/** As seis páginas, pela chave que cada arquivo de página usa. */
export const PAGINAS_DE_TEXTO = {
  regras: REGRAS,
  privacidade: PRIVACIDADE,
  termos: TERMOS,
  exclusao: EXCLUSAO,
  contato: CONTATO,
  sobre: SOBRE,
} as const
