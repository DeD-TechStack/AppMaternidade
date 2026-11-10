import type { ErroDados } from '../dados/comum.ts'

// Todos os textos de interface da área de conta (MAT-37a). Já passaram pela revisão de texto
// (`.oc/textos_MAT-37a.md`): não reescrever. Nenhum arquivo de `paginas/` declara frase em literal.

export const MARCA = 'AppMaternidade'

// O contato provisório da demonstração (decisão de Daniel, 06/11/2026): o e-mail do autor dos
// commits do repositório. É o único lugar do código em que ele aparece.
const CONTATO_PROVISORIO = 'danielmacedosilva11@gmail.com'

export const TITULOS = {
  entrar: 'Entrar',
  criarConta: 'Criar conta',
  recuperarAcesso: 'Recuperar acesso',
  redefinirSenha: 'Nova senha',
  contaExcluida: 'Conta excluída',
  comecar: 'Começar',
  conta: 'Conta',
} as const

/** O título da aba é fixo por rota: "<h1> | AppMaternidade". */
export function tituloDaAba(titulo: string): string {
  return `${titulo} | ${MARCA}`
}

export const COMUM = {
  carregando: 'Carregando…',
  tentarDeNovo: 'Tentar de novo',
  mostrarSenha: 'Mostrar senha',
  entrando: 'Entrando…',
  criandoConta: 'Criando conta…',
  enviando: 'Enviando…',
  salvando: 'Salvando…',
  excluindo: 'Excluindo…',
  saindo: 'Saindo…',
  preparandoArquivo: 'Preparando o arquivo…',
  escrevaEmail: 'Escreva o seu e-mail.',
  escrevaSenha: 'Escreva a sua senha.',
  escrevaNome: 'Escreva o seu nome.',
  repitaSenha: 'Repita a senha.',
  senhasDiferentes: 'As duas senhas precisam ser iguais.',
  ajudaSenha: 'Pelo menos 6 caracteres.',
  idCopiado: 'Id copiado.',
  copieManualmente: 'Copie manualmente.',
  rotuloEmail: 'E-mail',
  rotuloSenha: 'Senha',
  rotuloNome: 'Seu nome',
  ajudaNome: 'É o nome que a família vai ver.',
} as const

export const CABECALHO = {
  navegacao: 'Conta',
  conta: 'Conta',
  prototipo: 'Ver o protótipo do Hoje',
  sair: 'Sair',
} as const

export const ENTRAR = {
  frase: 'Use o e-mail e a senha que você cadastrou.',
  botao: 'Entrar',
  semConta: 'Ainda não tem conta?',
  criarConta: 'Criar conta',
  esqueci: 'Esqueci a senha',
} as const

export const CRIAR_CONTA = {
  frase: 'Você precisa de um nome, um e-mail e uma senha.',
  botao: 'Criar conta',
  jaTemConta: 'Já tem conta?',
  entrar: 'Entrar',
  termos: {
    antes: 'Ao criar a conta, você concorda com os ',
    termos: 'Termos de uso',
    meio: ' e a ',
    privacidade: 'Política de privacidade',
    depois: '.',
  },
  confirmacao: (email: string) => `Enviamos um link de confirmação para ${email}. Abra o link para entrar.`,
} as const

export const AVISO_BANCO_DEMONSTRACAO =
  'Este site é uma demonstração com banco de teste. Para a família e o bebê, use só nomes e datas fictícios.'

export const RECUPERAR = {
  frase: 'Escreva o e-mail da conta. Enviamos um link para você criar uma senha nova.',
  botao: 'Enviar link',
  resultado:
    'Se houver uma conta com este e-mail, enviamos um link para criar uma senha nova. Confira também a caixa de spam.',
  entrar: 'Entrar',
  criarConta: 'Criar conta',
} as const

export const REDEFINIR = {
  frase: 'Escolha a senha nova da sua conta.',
  novaSenha: 'Nova senha',
  repetirSenha: 'Repetir a senha',
  botao: 'Salvar senha',
  pedirOutroLink: 'Pedir outro link',
} as const

export const CONTA_EXCLUIDA = {
  frase: 'Sua conta foi excluída.',
  inicio: 'Início',
  criarConta: 'Criar conta',
} as const

export const COMECAR = {
  titulo: 'Seu nome',
  frase: 'Falta pouco. Diga o seu nome e o fuso em que você está.',
  fuso: 'Fuso',
  ajudaFuso: 'Os horários aparecem neste fuso.',
  botao: 'Salvar',
  /** A opção do fuso guardado que não está na lista. */
  fusoAtual: (fuso: string) => `${fuso} (atual)`,
} as const

export const CONTA = {
  indice: 'Nesta página',
  secoes: {
    perfil: 'Perfil',
    id: 'Id da conta',
    dados: 'Seus dados',
    excluir: 'Excluir conta',
    privacidade: 'Privacidade',
  },
  resumo: (nome: string, email: string) => `${nome} · ${email}`,
  perfil: {
    titulo: 'Perfil',
    nome: 'Seu nome',
    email: 'E-mail',
    fuso: 'Seu fuso',
    botao: 'Salvar',
    sucesso: 'Dados salvos.',
  },
  id: {
    titulo: 'Id da sua conta',
    botao: 'Copiar id',
    frase: 'Quem cuida da moderação pode pedir este número para dar a você um papel na equipe.',
  },
  exportar: {
    titulo: 'Seus dados',
    frase:
      'Baixe um arquivo com os seus dados, em JSON. Quem é responsável recebe a família inteira; os outros papéis recebem os próprios dados.',
    botao: 'Baixar meus dados',
    sucesso: 'Arquivo baixado.',
  },
  excluir: {
    titulo: 'Excluir conta',
    explicacao:
      'Ao excluir a conta, ela e os seus vínculos com famílias somem. Nos registros que você fez, o autor passa a aparecer como “pessoa removida”. Não dá para desfazer.',
    impedimento:
      'Você é a única pessoa responsável destas famílias. Antes de excluir a conta, torne outra pessoa responsável ou exclua a família:',
    lendo: 'Conferindo as suas famílias…',
    botao: 'Excluir minha conta',
    dialogo: {
      titulo: 'Excluir a sua conta?',
      texto: 'Para confirmar, digite a senha da conta.',
      senha: 'Senha atual',
      confirmar: 'Excluir conta',
      cancelar: 'Cancelar',
    },
  },
  privacidade: {
    titulo: 'Privacidade',
    contato: { antes: 'Dúvidas sobre seus dados: ', valor: CONTATO_PROVISORIO, depois: '.' },
    encarregado: { antes: 'Encarregado de dados: ', valor: 'Daniel Macedo', depois: '.' },
    politica: 'Política de privacidade',
  },
  sair: 'Sair',
} as const

/** O texto de cada linha do catálogo. `conta_inexistente` não tem texto: a tela nunca o mostra. */
export const TEXTOS_ERRO: Readonly<Record<string, string>> = {
  rede: 'Sem conexão com o servidor. Confira a internet e tente de novo.',
  tente_de_novo: 'Não deu certo desta vez. Tente de novo.',
  nao_encontrado: 'Não encontramos o que você pediu. Talvez tenha sido removido.',
  sem_permissao: 'Seu papel nesta família não permite fazer isso.',
  parametro_obrigatorio: 'Falta preencher um campo.',
  nome_vazio: 'Escreva um nome.',
  fuso_invalido: 'Escolha um fuso da lista.',
  nascimento_no_futuro: 'A data de nascimento não pode ser depois de hoje.',
  convite_invalido: 'Este código de convite não vale. Confira se copiou o código inteiro.',
  convite_revogado: 'Este convite foi cancelado. Peça um novo a quem convidou.',
  convite_usado: 'Este convite já foi usado. Peça um novo a quem convidou.',
  convite_vencido: 'Este convite venceu. Peça um novo a quem convidou.',
  ja_e_membro: 'Você já faz parte da família <familia_nome>.',
  convite_nao_pendente: 'Este convite não está mais pendente.',
  responsavel_sem_validade: 'Responsável não tem prazo de acesso. Tire a validade ou escolha outro papel.',
  validade_menor: 'O acesso precisa durar mais que os 7 dias do convite.',
  papel_igual: 'Essa pessoa já tem esse papel.',
  vinculo_inativo: 'Essa pessoa não está mais na família.',
  use_sair: 'Para deixar a família, use Sair da família.',
  ultimo_responsavel:
    'A família precisa de pelo menos um responsável. Antes, torne outra pessoa responsável ou exclua a família.',
  credenciais: 'E-mail ou senha não conferem.',
  email_nao_confirmado: 'Antes de entrar, confirme o e-mail pelo link que enviamos.',
  email_em_uso: 'Já existe uma conta com este e-mail.',
  senha_fraca: 'A senha precisa ter pelo menos 6 caracteres.',
  senha_igual: 'A nova senha precisa ser diferente da atual.',
  email_invalido: 'Confira o e-mail digitado.',
  muitas_tentativas: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  link_vencido: 'Este link venceu ou já foi usado. Peça outro.',
  sessao_encerrada: 'Sua sessão terminou. Entre de novo.',
  desconhecido: 'Algo deu errado. Tente de novo em instantes.',
}

/** A frase do erro, pelo catálogo; nunca o código nem a mensagem original do banco. */
export function textoDoErro(erro: ErroDados, familiaNome?: string): string {
  const texto = TEXTOS_ERRO[erro.chave] ?? TEXTOS_ERRO[erro.classe] ?? TEXTOS_ERRO.desconhecido
  return texto.replace('<familia_nome>', familiaNome ?? '')
}

/** As mensagens de passagem (lista fechada da 37a): nascem numa tela e aparecem na seguinte. */
const MENSAGENS_DE_PASSAGEM: Readonly<Record<string, string>> = {
  senha_trocada: 'Senha trocada.',
  saiu: 'Você saiu da conta.',
  sessao_encerrada: TEXTOS_ERRO.sessao_encerrada,
}

/** O texto da mensagem de passagem que veio no `state` da navegação, se for uma chave conhecida. */
export function textoDaPassagem(estado: unknown): string | null {
  const chave = (estado as { mensagem?: unknown } | null | undefined)?.mensagem
  return typeof chave === 'string' ? (MENSAGENS_DE_PASSAGEM[chave] ?? null) : null
}
