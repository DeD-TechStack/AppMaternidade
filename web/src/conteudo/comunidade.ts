import { tituloDaAba } from './conta.ts'
import type { ErroDados } from '../dados/comum.ts'
import type { EstadoDenuncia, FaixaBebe, MotivoDenuncia } from '../dados/comunidade.regras.ts'

// Todos os textos de interface da Comunidade (MAT-40a). Nenhum `.tsx` de `paginas/comunidade` nem de
// `componentes/comunidade` escreve frase em literal. Os textos TX-nn e a tabela de frases são os do
// contrato: só mudam pelo registro no HANDOFF.

export const TITULO_DA_ABA_COMUNIDADE = tituloDaAba('Comunidade')

/** Os textos fixos do contrato (MAT-40, seção 4.11), pelo número. */
export const TX = {
  tx01: 'Comunidade · público',
  tx02: 'A comunidade é para trocar experiência. Ela não é atendimento de saúde.',
  tx03: 'Li e aceito os Termos de uso e as Regras da comunidade.',
  tx04: 'Seu apelido aparece para todas as pessoas da comunidade. Não use seu nome nem o do bebê.',
  tx05: 'É assim que o tópico vai aparecer para todas as pessoas que entraram no site. Confira antes de publicar.',
  tx05b: 'É assim que a resposta vai aparecer para todas as pessoas que entraram no site. Confira antes de publicar.',
  tx06: 'Tópico publicado.',
  tx07: 'Oculto pela moderação',
  tx08: 'Se você ou alguém corre risco agora, ligue 192 (SAMU). Para conversar com alguém, o CVV atende no 188.',
  tx09: 'Recebemos sua denúncia. A moderação vai analisar. Quem você denunciou não fica sabendo.',
  tx10: 'Vocês deixam de ver o conteúdo um do outro e não podem responder um ao outro. A pessoa não é avisada. A equipe de moderação continua vendo o que todos publicam.',
  tx10b: 'Como você faz parte da moderação, ainda vai ver o que essa pessoa publica.',
  tx11: 'Não encontramos isso. Pode ter sido removido.',
  tx16: 'Ainda não há tópicos neste espaço.',
  tx17: 'Ainda não há respostas.',
  tx18: 'Você não bloqueou ninguém.',
  tx19: 'Você não enviou denúncias.',
  tx21: 'Em resposta a uma mensagem que não está disponível.',
  tx22: 'Removido pela moderação',
  tx23: 'Não conseguimos confirmar o envio, e ele ainda não aparece. Seu texto continua aqui. Tente de novo.',
  tx24: 'Sem conexão. Antes de enviar de novo, toque em Conferir para ver se o envio já chegou.',
  tx25: 'Pronto. Agora você pode publicar na comunidade.',
  tx26: 'Alterações salvas.',
  tx27: 'Resposta publicada.',
  tx30: 'Os espaços não carregaram. Tente de novo em instantes.',
  ajuda: 'Onde pedir ajuda agora',
} as const

/** A tabela fechada de frases: chave do catálogo de erros → texto (as linhas da 40a). */
export const TEXTOS_ERRO_COMUNIDADE: Readonly<Record<string, string>> = {
  rede: 'Sem conexão com o servidor. Confira a internet e tente de novo.',
  tente_de_novo: 'O servidor estava ocupado. Tente de novo.',
  nao_encontrado: 'Não encontramos isso. Pode ter sido removido.',
  sem_permissao: 'Você não tem permissão para fazer isso.',
  nao_editavel: 'Isso não pode mais ser editado. Pode ter sido moderado ou removido.',
  parametro_obrigatorio: 'Falta preencher um campo obrigatório.',
  sem_conta: 'Sua conta ainda não está pronta. Saia e entre de novo.',
  termos_indisponiveis: 'Os termos estão em revisão. Por enquanto você pode ler, mas não publicar.',
  sem_aceite: 'Para publicar, aceite os termos e as regras da comunidade.',
  sem_perfil: 'Para publicar, crie seu perfil público.',
  versao_nao_vigente: 'Os termos mudaram. Leia a versão nova e aceite de novo.',
  alvo_invalido: 'Escolha o que você quer denunciar.',
  alvo_inexistente: 'Esse conteúdo não está mais disponível.',
  so_um_nivel: 'Só dá para responder a uma resposta direta do tópico.',
  resposta_de_outro_topico: 'Essa resposta é de outro tópico.',
  apelido_em_uso: 'Esse apelido já está em uso. Escolha outro.',
  texto_fora_do_tamanho: 'O texto está fora do tamanho permitido.',
  desconhecido: 'Algo deu errado. Tente de novo. Se continuar, avise a equipe pelo Contato.',
}

/**
 * A frase do erro pela tabela fechada; nunca a mensagem original do banco. O `desconhecido` mostra
 * também o código, entre parênteses, para quem for relatar o erro.
 */
export function textoDoErroComunidade(erro: ErroDados): string {
  const frase = TEXTOS_ERRO_COMUNIDADE[erro.chave] ?? TEXTOS_ERRO_COMUNIDADE[erro.classe] ?? TEXTOS_ERRO_COMUNIDADE.desconhecido
  const comCodigo = !(erro.chave in TEXTOS_ERRO_COMUNIDADE) || erro.chave === 'desconhecido'
  return comCodigo && erro.codigo ? `${frase} (${erro.codigo})` : frase
}

export const ROTULO_FAIXA: Readonly<Record<FaixaBebe, string>> = {
  '0_3_meses': '0 a 3 meses',
  '3_6_meses': '3 a 6 meses',
  '6_12_meses': '6 a 12 meses',
}

export const ROTULO_MOTIVO: Readonly<Record<MotivoDenuncia, string>> = {
  ataque_assedio: 'Ataque ou assédio',
  saude_perigosa: 'Informação de saúde perigosa',
  conteudo_sexual: 'Conteúdo sexual',
  exposicao_crianca: 'Exposição de criança',
  dados_pessoais: 'Dados pessoais',
  spam_venda: 'Spam ou venda',
  risco_autolesao: 'Risco de autolesão',
  outro: 'Outro',
}

export const ROTULO_ESTADO_DENUNCIA: Readonly<Record<EstadoDenuncia, string>> = {
  aberta: 'Aberta',
  em_analise: 'Em análise',
  procedente: 'Procedente',
  improcedente: 'Improcedente',
}

/** As mensagens que nascem numa tela e aparecem na seguinte, em `role="status"` (lista fechada). */
const MENSAGENS_DE_PASSAGEM: Readonly<Record<string, string>> = {
  topico_publicado: TX.tx06,
  perfil_pronto: TX.tx25,
  alteracoes_salvas: TX.tx26,
  resposta_publicada: TX.tx27,
}

/** O texto da mensagem de passagem que a navegação levou (`state.mensagemComunidade`), se for conhecida. */
export function textoDaPassagemComunidade(estado: unknown): string | null {
  const chave = (estado as { mensagemComunidade?: unknown } | null | undefined)?.mensagemComunidade
  return typeof chave === 'string' ? (MENSAGENS_DE_PASSAGEM[chave] ?? null) : null
}

export const COMUM_COMUNIDADE = {
  /** O sufixo do rótulo de um campo obrigatório (A11Y-008). */
  obrigatorio: '(obrigatório)',
  voltar: 'Voltar',
  carregando: 'Carregando…',
  enviando: 'Enviando…',
  tentarDeNovo: 'Tentar de novo',
  conferir: 'Conferir',
  cancelar: 'Cancelar',
  fechar: 'Fechar',
  editado: 'editado',
  pessoaRemovida: 'pessoa removida',
  irParaComunidade: 'Ir para a Comunidade',
  navegacaoDoTopo: 'Voltar',
  sobAutor: (apelido: string) => `por ${apelido}`,
  autorDe: 'Autor',
  semFaixa: 'Sem faixa',
  faixaDoBebe: 'Faixa do bebê',
  faixaOpcional: 'Faixa do bebê (opcional)',
  contador: (usado: number, maximo: number) => `${usado} de ${maximo}`,
  motivoDaModeracao: (motivo: string) => `Motivo: ${motivo}`,
  respostas: (n: number) => (n === 1 ? '1 resposta' : `${n} respostas`),
  linkTermos: 'Termos de uso',
  linkRegras: 'Regras da comunidade',
} as const

export const LISTA = {
  titulo: 'Comunidade',
  manchete: ['Converse com quem', 'vive a mesma fase.'],
  lide: 'Sete espaços para trocar experiência sobre o dia a dia com o bebê.',
  espacos: 'Espaços',
  meuPerfil: 'Meu perfil público',
  minhasDenuncias: 'Minhas denúncias',
  painel: 'Painel de moderação',
  paraPublicarTitulo: 'Para publicar e responder',
  paraPublicarFrase: 'Aceite os termos e crie seu perfil público. Leva um minuto.',
  entrar: 'Entrar na comunidade',
  linksDaPessoa: 'Sua área',
} as const

export const ESPACO = {
  novoTopico: 'Novo tópico',
  filtro: 'Faixa do bebê',
  todas: 'Todas as faixas',
  carregarMais: 'Carregar mais',
  topicos: 'Tópicos',
  de: (data: string) => `em ${data}`,
} as const

export const TOPICO = {
  respostas: 'Respostas',
  responder: 'Responder',
  editar: 'Editar',
  denunciar: 'Denunciar',
  denunciarPerfil: 'Denunciar perfil',
  bloquear: (apelido: string) => `Bloquear ${apelido}`,
  responderA: (apelido: string) => `Responder a ${apelido}`,
  emRespostaA: (apelido: string) => `Em resposta a ${apelido}`,
  tirarCitacao: 'Tirar citação',
  carregarMais: 'Carregar mais',
  formulario: 'Sua resposta',
  campoResposta: 'Escreva sua resposta',
  verPrevia: 'Ver prévia',
  publicarResposta: 'Publicar resposta',
  salvar: 'Salvar',
  voltarEEditar: 'Voltar e editar',
  previa: 'Prévia da resposta',
  paraEntrar: 'Entrar na comunidade para responder',
  editandoResposta: 'Editar resposta',
  citacaoDe: (trecho: string) => `“${trecho}”`,
  erroLimiteResposta: 'A resposta precisa ter de 1 a 2000 caracteres.',
  // Aparece enquanto "Ver prévia" está desabilitado, ligada ao botão por `aria-describedby`.
  dicaPrevia: 'Escreva um texto para ver a prévia.',
  acoes: 'Ações',
  oculto: 'Oculto',
} as const

export const FORMULARIO_TOPICO = {
  tituloNovo: 'Novo tópico',
  tituloEditar: 'Editar tópico',
  campoTitulo: 'Título',
  campoCorpo: 'Texto do tópico',
  verPrevia: 'Ver prévia',
  publicar: 'Publicar',
  salvar: 'Salvar',
  voltarEEditar: 'Voltar e editar',
  previa: 'Prévia',
  espaco: 'Espaço',
  erroTitulo: 'O título precisa ter de 3 a 120 caracteres.',
  erroCorpo: 'O texto precisa ter de 1 a 5000 caracteres.',
  // Aparece enquanto "Ver prévia" está desabilitado, conforme o que falta.
  dicaPrevia: {
    ambos: 'Escreva um título e um texto para ver a prévia.',
    titulo: 'Escreva um título para ver a prévia.',
    texto: 'Escreva um texto para ver a prévia.',
  },
} as const

export const ENTRAR_NA_COMUNIDADE = {
  manchete: ['Entre na conversa', 'com um apelido.'],
  termosTitulo: 'Termos e regras',
  termosFrase: 'Antes de publicar, leia os documentos e aceite.',
  aceitar: 'Aceitar e continuar',
  marqueACaixa: 'Marque a caixa para continuar.',
  perfilTitulo: 'Seu perfil público',
  apelido: 'Apelido',
  bio: 'Bio (opcional)',
  criarPerfil: 'Criar perfil',
  erroApelido: 'O apelido precisa ter de 3 a 30 caracteres, sem espaço no começo nem no fim.',
  erroBio: 'A bio precisa ter até 160 caracteres.',
} as const

export const PERFIL = {
  titulo: 'Meu perfil público',
  secao: 'Como você aparece',
  frase: 'É assim que as outras pessoas veem você.',
  salvar: 'Salvar',
  editarPerfil: 'Editar perfil',
  bloqueios: 'Perfis bloqueados',
  bloqueadoEm: (data: string) => `Perfil bloqueado em ${data}`,
  desbloquear: 'Desbloquear',
  desbloqueado: 'Perfil desbloqueado.',
  paraCriar: 'Você ainda não tem perfil público.',
  somenteLeitura: 'Para editar o perfil, aceite os termos de novo.',
  apelidoRotulo: 'Apelido',
  bioRotulo: 'Bio',
  faixaRotulo: 'Faixa do bebê',
} as const

export const DENUNCIAS = {
  titulo: 'Minhas denúncias',
  tipo: { topico: 'Tópico', resposta: 'Resposta', perfil: 'Perfil' },
  indisponivel: 'Conteúdo não disponível',
  motivo: 'Motivo',
  detalhes: 'O que você escreveu',
  estado: 'Estado',
  enviadaEm: (data: string) => `Enviada em ${data}`,
  decididaEm: (data: string) => `Decidida em ${data}`,
  trecho: (corpo: string) => (corpo.length > 80 ? `${corpo.slice(0, 80)}…` : corpo),
} as const

export const DIALOGO_DENUNCIA = {
  tituloTopico: 'Denunciar tópico',
  tituloResposta: 'Denunciar resposta',
  tituloPerfil: (apelido: string) => `Denunciar o perfil de ${apelido}`,
  motivos: 'Motivo da denúncia',
  texto: 'Quer explicar? (opcional)',
  erroTexto: 'A explicação precisa ter até 500 caracteres.',
  enviar: 'Enviar denúncia',
  bloquear: (apelido: string) => `Bloquear ${apelido}`,
} as const

export const DIALOGO_BLOQUEIO = {
  titulo: (apelido: string) => `Bloquear ${apelido}?`,
  confirmar: 'Bloquear',
  bloqueado: (apelido: string) => `Você bloqueou ${apelido}.`,
} as const
