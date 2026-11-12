import type { ErroDados } from '../dados/comum.ts'
import type { EstadoModeracao, PapelPlataforma } from '../dados/comunidade.regras.ts'
import type { AcaoDeAuditoria } from '../dados/moderacao.ts'
import { COMUM_COMUNIDADE, TEXTOS_ERRO_COMUNIDADE, TX as TX_COMUNIDADE, ROTULO_ESTADO_DENUNCIA } from './comunidade.ts'
import { tituloDaAba } from './conta.ts'

// Todos os textos de interface do painel de moderação (MAT-40b). Nenhum `.tsx` de `paginas/moderacao` nem de
// `componentes/moderacao` escreve frase em literal. Os textos TX-nn e a tabela de frases são os do contrato.

export const TITULO_DA_ABA_MODERACAO = tituloDaAba('Moderação')

/** Os textos fixos do contrato (MAT-40, seção 4.11) que nascem na 40b, pelo número. */
export const TX = {
  tx12: 'Esta área é só da equipe de moderação.',
  tx13: 'Nenhuma denúncia com esses filtros.',
  tx14: 'Feito. A ação ficou registrada na auditoria.',
  tx15: 'Se a última pessoa admin excluir a própria conta, ninguém mais concede papéis pelo site. A equipe técnica recupera por migração.',
  tx20: 'Nenhuma ação registrada ainda.',
  tx28: 'Perfil excluído. A denúncia ainda pode ser decidida.',
  tx29: 'Nenhum outro conteúdo deste perfil.',
  tx31: 'Nenhum papel registrado.',
  tx32: 'Já estava assim quando conferimos. Veja na auditoria quem fez a ação.',
  tx33: 'Verificação em duas etapas',
  tx34: 'Para abrir o painel, confirme com o código do seu app autenticador.',
  tx35: 'Cadastrar app autenticador',
  tx36: 'QR code para cadastrar o app autenticador',
  tx37: 'Código de 6 dígitos',
  /** O selo de uso interno do painel. */
  selo: 'Moderação · uso interno',
} as const

/** A tabela fechada de frases da 40b (as linhas novas da seção 4.6) mais as da 40a. */
export const TEXTOS_ERRO_MODERACAO: Readonly<Record<string, string>> = {
  ...TEXTOS_ERRO_COMUNIDADE,
  motivo_vazio: 'Escreva o motivo.',
  denuncia_inexistente: 'Essa denúncia não existe mais.',
  conta_inexistente: 'Não existe conta com esse id. Confira o id copiado da tela Conta.',
  papel_inexistente: 'Essa conta não tem esse papel.',
  denuncia_de_outro_alvo: 'Essa denúncia é de outro conteúdo.',
  conflito_de_interesse: 'Você não pode agir sobre conteúdo seu nem sobre denúncia que você abriu. Peça a outra pessoa da equipe.',
  estado_igual: 'Já está nesse estado.',
  decisao_invalida: 'Escolha uma decisão.',
  denuncia_ja_decidida: 'Essa denúncia já foi decidida.',
  validade_no_passado: 'A validade precisa ser uma data futura.',
  ultimo_admin: 'Não dá para tirar o último admin. Conceda o papel a outra pessoa antes.',
  sem_papel: 'Seu acesso à moderação terminou.',
  codigo_invalido: 'Código incorreto ou vencido. Confira o app autenticador e tente de novo.',
  mfa_indisponivel: 'A verificação em duas etapas não está disponível agora. Avise a equipe técnica.',
}

/** A frase do erro pela tabela fechada; nunca a mensagem original. O `desconhecido` mostra também o código. */
export function textoDoErroModeracao(erro: ErroDados): string {
  const frase = TEXTOS_ERRO_MODERACAO[erro.chave] ?? TEXTOS_ERRO_MODERACAO[erro.classe] ?? TEXTOS_ERRO_MODERACAO.desconhecido
  const comCodigo = !(erro.chave in TEXTOS_ERRO_MODERACAO) || erro.chave === 'desconhecido'
  return comCodigo && erro.codigo ? `${frase} (${erro.codigo})` : frase
}

export const COMUM_MODERACAO = {
  ...COMUM_COMUNIDADE,
  painel: 'Painel',
  fila: 'Fila',
  auditoria: 'Auditoria',
  papeis: 'Papéis',
  comunidade: 'Comunidade',
  irParaFila: 'Ir para a fila',
  irParaComunidade: 'Ir para a Comunidade',
  semTexto: 'Sem texto',
  confirmar: 'Confirmar',
  motivo: 'Motivo',
  campoMotivo: 'Motivo (de 1 a 300 caracteres)',
  erroMotivo: 'O motivo precisa ter de 1 a 300 caracteres.',
  voce: 'Você',
  equipe: (curto: string) => `Equipe · ${curto}`,
  semRegistro: 'sem registro',
  semValidade: 'sem validade',
  data: (iso: string) => iso,
  tipoDoAlvo: { topico: 'Tópico', resposta: 'Resposta', perfil: 'Perfil', excluido: 'Alvo excluído' },
  pessoaRemovida: 'pessoa removida',
} as const

export const ROTULO_ESTADO_CONTEUDO: Readonly<Record<EstadoModeracao, string>> = {
  visivel: 'Visível',
  oculto: TX_COMUNIDADE.tx07,
  removido: TX_COMUNIDADE.tx22,
}

export const ROTULO_PAPEL: Readonly<Record<PapelPlataforma, string>> = {
  moderador: 'Moderador',
  admin: 'Admin',
}

export const FILA = {
  titulo: 'Denúncias',
  prioridade: (nivel: number) => `Prioridade ${nivel}`,
  filtros: 'Filtros',
  filtroEstados: 'Estado da denúncia',
  filtroMotivo: 'Motivo',
  todosOsMotivos: 'Todos',
  carregarMais: 'Carregar mais',
  lista: 'Denúncias na fila',
  em: (data: string) => `em ${data}`,
  abrir: (motivo: string) => `Abrir a denúncia de ${motivo}`,
  estados: ROTULO_ESTADO_DENUNCIA,
} as const

export const DENUNCIA = {
  titulo: 'Denúncia',
  secaoDenuncia: 'A denúncia',
  secaoAlvo: 'O que foi denunciado',
  secaoPerfil: 'Perfil do autor',
  secaoHistorico: 'Histórico do perfil',
  secaoConteudos: 'Conteúdos do perfil',
  secaoAuditoria: 'Ações na auditoria',
  texto: 'O que a pessoa escreveu',
  semTexto: 'Sem texto',
  enviadaEm: (data: string) => `Enviada em ${data}`,
  decididaEm: (data: string) => `Decidida em ${data}`,
  estadoDoConteudo: 'Estado do conteúdo',
  verTopico: 'Ver o tópico no painel',
  verConteudo: 'Abrir o conteúdo no painel',
  bio: 'Bio',
  faixa: 'Faixa do bebê',
  perfilDesde: (data: string) => `Perfil criado em ${data}`,
  tituloTopico: 'Título',
  corpo: 'Texto',
  respostaNoTopico: (titulo: string) => `Resposta no tópico “${titulo}”`,
  respostaSemTopico: 'Resposta em um tópico que você não lê.',
  acoesDoConteudo: 'Ações sobre o conteúdo',
  acoesDaDenuncia: 'Decisão sobre a denúncia',
  conteudoNaoLido: 'O conteúdo não está disponível para leitura.',
} as const

export const CONTEUDO = {
  titulo: 'Conteúdo',
  tituloDoTopico: 'Tópico',
  tituloDaResposta: 'Resposta',
  autor: 'Autor',
  topicoDaResposta: (titulo: string) => `No tópico “${titulo}”`,
  estado: 'Estado do conteúdo',
  moderadoPor: (motivo: string) => `Motivo da moderação: ${motivo}`,
  verDenuncia: 'Ver denúncia',
} as const

/** As ações da moderação sobre um conteúdo. */
export const ACAO_NO_CONTEUDO: Readonly<
  Record<EstadoModeracao, { botao: string; titulo: string; confirmar: string }>
> = {
  oculto: { botao: 'Ocultar', titulo: 'Ocultar este conteúdo?', confirmar: 'Ocultar' },
  removido: { botao: 'Remover', titulo: 'Remover este conteúdo?', confirmar: 'Remover' },
  visivel: { botao: 'Restaurar', titulo: 'Restaurar este conteúdo?', confirmar: 'Restaurar' },
}

export const DECISAO: Readonly<Record<'em_analise' | 'procedente' | 'improcedente', { botao: string; titulo: string; confirmar: string }>> = {
  em_analise: { botao: 'Em análise', titulo: 'Marcar a denúncia como em análise?', confirmar: 'Marcar em análise' },
  procedente: { botao: 'Procedente', titulo: 'Decidir que a denúncia é procedente?', confirmar: 'Decidir procedente' },
  improcedente: { botao: 'Improcedente', titulo: 'Decidir que a denúncia é improcedente?', confirmar: 'Decidir improcedente' },
}

export const AUDITORIA = {
  titulo: 'Auditoria',
  lista: 'Ações registradas',
  carregarMais: 'Carregar mais',
  acao: {
    ocultar: 'Ocultou',
    remover: 'Removeu',
    restaurar: 'Restaurou',
    decidir_denuncia: 'Decidiu denúncia',
    conceder_papel: 'Concedeu papel',
    revogar_papel: 'Revogou papel',
  } satisfies Record<AcaoDeAuditoria, string>,
  nenhum: 'nenhum',
  mudanca: (de: string, para: string) => `De ${de} para ${para}`,
  validade: (texto: string) => `Validade: ${texto}`,
  alvoConteudo: { topico: 'Tópico', resposta: 'Resposta' },
  abrirConteudo: (tipo: string) => `${tipo} no painel`,
  verDenuncia: 'Ver denúncia',
  abrirDenuncia: 'Denúncia no painel',
  papelDaConta: (curto: string) => `Papel da conta · ${curto}`,
  textoNoMomento: 'Texto no momento da ação',
  estadoPapel: (papel: string) => papel,
  porQuem: 'Quem agiu',
} as const

export const PAPEIS = {
  titulo: 'Papéis',
  lista: 'Papéis da plataforma',
  copiarId: 'Copiar id',
  copiado: 'Id copiado.',
  copieManualmente: 'Copie manualmente.',
  concedidoPor: 'Concedido por',
  concedidoEm: 'Concedido em',
  validade: 'Validade',
  situacao: 'Situação',
  vigente: 'Vigente',
  vencido: 'Vencido',
  renovar: 'Renovar',
  revogar: 'Revogar',
  revogarTitulo: 'Revogar este papel?',
  revogarConfirmar: 'Revogar papel',
  concederTitulo: 'Conceder papel',
  campoConta: 'Id da conta',
  dicaDaConta: 'Peça à pessoa o “Id da sua conta”, que aparece na tela Conta.',
  campoPapel: 'Papel',
  campoValidade: 'Validade (opcional)',
  dicaDaValidade: 'Deixe vazio para um papel sem validade.',
  conceder: 'Conceder papel',
  erroConta: 'O id da conta precisa ser um UUID, como o que aparece na tela Conta.',
  erroValidadePassada: 'A validade precisa ser uma data futura.',
  erroValidadeIlegivel: 'Escreva a validade como data e hora.',
  erroPapel: 'Escolha o papel.',
  conta: (id: string) => id,
} as const

export const MFA = {
  titulo: TX.tx33,
  frase: TX.tx34,
  cadastrar: TX.tx35,
  altDoQr: TX.tx36,
  ouDigite: 'Ou digite esta chave no app:',
  copiarChave: 'Copiar chave',
  chaveCopiada: 'Chave copiada.',
  copieAChave: 'Copie manualmente.',
  campoCodigo: TX.tx37,
  confirmar: 'Confirmar',
  erroFormato: 'O código tem 6 dígitos.',
  verificando: 'Verificando…',
  cadastrando: 'Preparando…',
} as const

export const SEM_PERMISSAO = {
  frase: TX.tx12,
  link: 'Ir para a Comunidade',
} as const

export const NAO_ENCONTRADO = {
  frase: TX_COMUNIDADE.tx11,
  link: 'Ir para a fila',
} as const

export const NOMES_DAS_TELAS = {
  fila: 'Fila de denúncias',
  denuncia: 'Denúncia',
  conteudo: 'Conteúdo',
  auditoria: 'Auditoria',
  papeis: 'Papéis',
} as const
